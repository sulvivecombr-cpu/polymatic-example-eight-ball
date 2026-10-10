import { query, transaction } from "../db/client";

export interface MatchRecord {
  id: string;
  roomId: string;
  matchType: string;
  entryFee: number;
  status: string;
}

/**
 * Creates a competitive match record when a room is created with an entry fee.
 * Reserves tokens from both players atomically.
 */
export async function createCompetitiveMatch(
  roomId: string,
  entryFee: number,
  creatorUserId: string,
): Promise<MatchRecord | null> {
  if (entryFee <= 0) return null;

  try {
    const result = await transaction(async (client) => {
      // Lock creator's wallet
      const walletResult = await client.query(
        "SELECT available_balance, reserved_balance FROM wallets WHERE user_id = $1 FOR UPDATE",
        [creatorUserId],
      );
      if (walletResult.rows.length === 0) throw new Error("Carteira não encontrada");
      const available = parseInt(walletResult.rows[0].available_balance);
      if (available < entryFee) throw new Error("Saldo insuficiente");

      // Reserve tokens
      const newAvailable = available - entryFee;
      const newReserved = parseInt(walletResult.rows[0].reserved_balance) + entryFee;
      await client.query(
        "UPDATE wallets SET available_balance = $1, reserved_balance = $2, total_spent = total_spent + $3, updated_at = NOW() WHERE user_id = $4",
        [newAvailable, newReserved, entryFee, creatorUserId],
      );

      // Create match record
      const matchResult = await client.query(
        `INSERT INTO matches (room_id, match_type, entry_fee, status)
         VALUES ($1, 'competitive', $2, 'waiting_for_player') RETURNING id, room_id, match_type, entry_fee, status`,
        [roomId, entryFee],
      );
      const match = matchResult.rows[0];

      // Add creator as participant
      await client.query(
        "INSERT INTO match_participants (match_id, user_id, player_slot) VALUES ($1, $2, 0)",
        [match.id, creatorUserId],
      );

      // Record reservation transaction
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, match_id, reason)
         VALUES ($1, 'reserve', $2, $3, $4, 'Entrada de partida competitiva')`,
        [creatorUserId, -entryFee, newAvailable, match.id],
      );

      return match;
    });
    return result;
  } catch (err: any) {
    console.error("Create competitive match error:", err);
    throw err;
  }
}

/**
 * Joins a competitive match — reserves tokens from the joining player.
 */
export async function joinCompetitiveMatch(
  roomId: string,
  userId: string,
): Promise<{ matchId: string; entryFee: number } | null> {
  try {
    return await transaction(async (client) => {
      const matchResult = await client.query(
        "SELECT id, entry_fee, status FROM matches WHERE room_id = $1 AND status = 'waiting_for_player'",
        [roomId],
      );
      if (matchResult.rows.length === 0) return null;
      const match = matchResult.rows[0];

      // Check not already a participant
      const existing = await client.query(
        "SELECT 1 FROM match_participants WHERE match_id = $1 AND user_id = $2",
        [match.id, userId],
      );
      if (existing.rows.length > 0) return null;

      const entryFee = parseInt(match.entry_fee);

      // Lock wallet
      const walletResult = await client.query(
        "SELECT available_balance, reserved_balance FROM wallets WHERE user_id = $1 FOR UPDATE",
        [userId],
      );
      if (walletResult.rows.length === 0) throw new Error("Carteira não encontrada");
      const available = parseInt(walletResult.rows[0].available_balance);
      if (available < entryFee) throw new Error("Saldo insuficiente");

      const newAvailable = available - entryFee;
      const newReserved = parseInt(walletResult.rows[0].reserved_balance) + entryFee;
      await client.query(
        "UPDATE wallets SET available_balance = $1, reserved_balance = $2, total_spent = total_spent + $3, updated_at = NOW() WHERE user_id = $4",
        [newAvailable, newReserved, entryFee, userId],
      );

      await client.query(
        "INSERT INTO match_participants (match_id, user_id, player_slot) VALUES ($1, $2, 1)",
        [match.id, userId],
      );

      await client.query(
        "UPDATE matches SET status = 'ready', started_at = NOW() WHERE id = $1",
        [match.id],
      );

      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, match_id, reason)
         VALUES ($1, 'reserve', $2, $3, $4, 'Entrada de partida competitiva')`,
        [userId, -entryFee, newAvailable, match.id],
      );

      return { matchId: match.id, entryFee };
    });
  } catch (err: any) {
    console.error("Join competitive match error:", err);
    throw err;
  }
}

/**
 * Marks a match as in progress (game started).
 */
export async function startMatch(roomId: string): Promise<void> {
  await query("UPDATE matches SET status = 'in_progress', started_at = COALESCE(started_at, NOW()) WHERE room_id = $1", [roomId]);
}

/**
 * Settles a match — determines winner, releases tokens, updates ratings.
 * Idempotent: if already completed, does nothing.
 */
export async function settleMatch(
  roomId: string,
  winnerUserId: string | null,
): Promise<{ settled: boolean; matchId?: string }> {
  try {
    return await transaction(async (client) => {
      const matchResult = await client.query(
        "SELECT id, entry_fee, status, platform_fee_pct FROM matches WHERE room_id = $1 FOR UPDATE",
        [roomId],
      );
      if (matchResult.rows.length === 0) return { settled: false };
      const match = matchResult.rows[0];
      if (match.status === "completed" || match.status === "cancelled") return { settled: false };

      const participants = await client.query(
        "SELECT user_id, player_slot FROM match_participants WHERE match_id = $1",
        [match.id],
      );
      if (participants.rows.length < 2) {
        // Not enough players — refund
        await refundMatchInternal(client, match, participants.rows);
        return { settled: true, matchId: match.id };
      }

      const entryFee = parseInt(match.entry_fee);
      const totalPool = entryFee * participants.rows.length;
      const platformFee = Math.floor((totalPool * parseInt(match.platform_fee_pct || 0)) / 100);
      const winnerPrize = totalPool - platformFee;

      // Update match status
      await client.query(
        "UPDATE matches SET status = 'completed', winner_id = $1, completed_at = NOW() WHERE id = $2",
        [winnerUserId, match.id],
      );

      for (const p of participants.rows) {
        const isWinner = p.user_id === winnerUserId;
        const tokenChange = isWinner ? winnerPrize - entryFee : -entryFee;

        // Update wallet
        const walletResult = await client.query(
          "SELECT available_balance, reserved_balance FROM wallets WHERE user_id = $1 FOR UPDATE",
          [p.user_id],
        );
        const wallet = walletResult.rows[0];
        const newReserved = parseInt(wallet.reserved_balance) - entryFee;
        const newAvailable = parseInt(wallet.available_balance) + (isWinner ? winnerPrize : 0);

        await client.query(
          "UPDATE wallets SET available_balance = $1, reserved_balance = $2, total_earned = total_earned + $3, updated_at = NOW() WHERE user_id = $4",
          [newAvailable, newReserved, isWinner ? winnerPrize : 0, p.user_id],
        );

        // Record settlement transaction
        await client.query(
          `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, match_id, reason, idempotency_key)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            p.user_id,
            isWinner ? "reward" : "debit",
            isWinner ? winnerPrize : -entryFee,
            newAvailable,
            match.id,
            isWinner ? "Prêmio de vitória" : "Perda de entrada",
            `settle-${match.id}-${p.user_id}`,
          ],
        );

        // Update match participant record
        await client.query(
          "UPDATE match_participants SET result = $1, tokens_change = $2 WHERE match_id = $3 AND user_id = $4",
          [isWinner ? "win" : "loss", tokenChange, match.id, p.user_id],
        );

        // Update rating
        await updateRatingInternal(client, p.user_id, isWinner, match.id);
      }

      return { settled: true, matchId: match.id };
    });
  } catch (err) {
    console.error("Settle match error:", err);
    return { settled: false };
  }
}

/**
 * Cancels a match — refunds all reserved tokens.
 */
export async function cancelMatch(roomId: string, reason: string): Promise<void> {
  try {
    await transaction(async (client) => {
      const matchResult = await client.query(
        "SELECT id, entry_fee, status FROM matches WHERE room_id = $1 FOR UPDATE",
        [roomId],
      );
      if (matchResult.rows.length === 0) return;
      const match = matchResult.rows[0];
      if (match.status === "completed" || match.status === "cancelled") return;

      const participants = await client.query(
        "SELECT user_id FROM match_participants WHERE match_id = $1",
        [match.id],
      );

      await refundMatchInternal(client, match, participants.rows);
      await client.query(
        "UPDATE matches SET status = 'cancelled', cancelled_reason = $1, completed_at = NOW() WHERE id = $2",
        [reason, match.id],
      );
    });
  } catch (err) {
    console.error("Cancel match error:", err);
  }
}

async function refundMatchInternal(client: any, match: any, participants: any[]) {
  const entryFee = parseInt(match.entry_fee);
  for (const p of participants) {
    const walletResult = await client.query(
      "SELECT available_balance, reserved_balance FROM wallets WHERE user_id = $1 FOR UPDATE",
      [p.user_id],
    );
    if (walletResult.rows.length === 0) continue;
    const wallet = walletResult.rows[0];
    const newAvailable = parseInt(wallet.available_balance) + entryFee;
    const newReserved = Math.max(0, parseInt(wallet.reserved_balance) - entryFee);
    await client.query(
      "UPDATE wallets SET available_balance = $1, reserved_balance = $2, total_spent = total_spent - $3, updated_at = NOW() WHERE user_id = $4",
      [newAvailable, newReserved, entryFee, p.user_id],
    );
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, match_id, reason, idempotency_key)
       VALUES ($1, 'refund', $2, $3, $4, 'Partida cancelada', $5)`,
      [p.user_id, entryFee, newAvailable, match.id, `refund-${match.id}-${p.user_id}`],
    );
  }
}

// Elo rating calculation
async function updateRatingInternal(client: any, userId: string, won: boolean, matchId: string) {
  const ratingResult = await client.query(
    "SELECT rating, matches_played, wins, losses, current_streak, best_streak FROM player_ratings WHERE user_id = $1 FOR UPDATE",
    [userId],
  );
  if (ratingResult.rows.length === 0) return;
  const r = ratingResult.rows[0];
  const oldRating = parseInt(r.rating);

  // Simple Elo: K=32, expected vs 1200 baseline (simplified for 1v1 without opponent rating in this context)
  // In a real implementation we'd use the opponent's rating
  const opponent = await client.query(
    `SELECT r2.rating FROM match_participants mp
     JOIN player_ratings r2 ON r2.user_id = mp.user_id
     WHERE mp.match_id = $1 AND mp.user_id != $2`,
    [matchId, userId],
  );
  const opponentRating = opponent.rows.length > 0 ? parseInt(opponent.rows[0].rating) : 1200;

  const expected = 1 / (1 + Math.pow(10, (opponentRating - oldRating) / 400));
  const score = won ? 1 : 0;
  const K = 32;
  const newRating = Math.max(100, Math.round(oldRating + K * (score - expected)));

  const newMatches = parseInt(r.matches_played) + 1;
  const newWins = parseInt(r.wins) + (won ? 1 : 0);
  const newLosses = parseInt(r.losses) + (won ? 0 : 1);
  const newStreak = won ? parseInt(r.current_streak) + 1 : 0;
  const newBestStreak = Math.max(parseInt(r.best_streak), newStreak);

  await client.query(
    `UPDATE player_ratings SET rating = $1, matches_played = $2, wins = $3, losses = $4,
     current_streak = $5, best_streak = $6, updated_at = NOW() WHERE user_id = $7`,
    [newRating, newMatches, newWins, newLosses, newStreak, newBestStreak, userId],
  );

  await client.query(
    "INSERT INTO rating_history (user_id, match_id, rating_before, rating_after) VALUES ($1, $2, $3, $4)",
    [userId, matchId, oldRating, newRating],
  );

  // Update match participant rating change
  await client.query(
    "UPDATE match_participants SET rating_change = $1 WHERE match_id = $2 AND user_id = $3",
    [newRating - oldRating, matchId, userId],
  );

  // Check achievements
  await checkAchievementsInternal(client, userId, newRating, newMatches, newWins, newStreak);
}

async function checkAchievementsInternal(client: any, userId: string, rating: number, matches: number, wins: number, streak: number) {
  const checks: { code: string; condition: boolean }[] = [
    { code: "first_win", condition: wins >= 1 },
    { code: "streak_3", condition: streak >= 3 },
    { code: "streak_5", condition: streak >= 5 },
    { code: "matches_10", condition: matches >= 10 },
    { code: "matches_50", condition: matches >= 50 },
    { code: "rating_1500", condition: rating >= 1500 },
    { code: "rating_2000", condition: rating >= 2000 },
  ];

  for (const { code, condition } of checks) {
    if (!condition) continue;
    await client.query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       SELECT $1, id FROM achievements WHERE code = $2
       ON CONFLICT DO NOTHING`,
      [userId, code],
    );
  }
}

/**
 * Gets the match record for a room, if any.
 */
export async function getMatchByRoom(roomId: string): Promise<any | null> {
  const result = await query("SELECT * FROM matches WHERE room_id = $1 ORDER BY created_at DESC LIMIT 1", [roomId]);
  return result.rows.length > 0 ? result.rows[0] : null;
}

import { Router } from "express";
import { query } from "../db/client";
import { requireAuth } from "../auth/middleware";

const router = Router();

// Global leaderboard
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const period = (req.query.period as string) || "all";

    let where = "u.deleted_at IS NULL AND r.matches_played > 0";
    let params: any[] = [];

    if (period === "weekly" || period === "monthly") {
      const days = period === "weekly" ? 7 : 30;
      where += ` AND EXISTS (
        SELECT 1 FROM match_participants mp
        JOIN matches m ON m.id = mp.match_id
        WHERE mp.user_id = r.user_id AND m.completed_at > NOW() - INTERVAL '${days} days'
      )`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM player_ratings r JOIN users u ON u.id = r.user_id WHERE ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
              r.rating, r.matches_played, r.wins, r.losses, r.current_streak, r.best_streak,
              w.available_balance
       FROM player_ratings r
       JOIN users u ON u.id = r.user_id
       JOIN wallets w ON w.user_id = u.id
       WHERE ${where}
       ORDER BY r.rating DESC, r.wins DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    const entries = result.rows.map((row, i) => ({
      rank: offset + i + 1,
      ...row,
    }));

    res.json({ entries, total, page, limit });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Get own rank
router.get("/my-rank", requireAuth, async (req: any, res) => {
  try {
    const result = await query(
      `SELECT COUNT(*) + 1 AS rank
       FROM player_ratings r2
       JOIN users u2 ON u2.id = r2.user_id
       WHERE u2.deleted_at IS NULL
         AND r2.rating > (SELECT rating FROM player_ratings WHERE user_id = $1)`,
      [req.user.userId],
    );
    const ownRating = await query(
      "SELECT rating, matches_played, wins, losses FROM player_ratings WHERE user_id = $1",
      [req.user.userId],
    );
    res.json({
      rank: parseInt(result.rows[0].rank),
      ...ownRating.rows[0],
    });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Get league tiers config
router.get("/leagues", (req, res) => {
  res.json({
    tiers: [
      { name: "Bronze", minRating: 0, color: "#cd7f32" },
      { name: "Prata", minRating: 1200, color: "#c0c0c0" },
      { name: "Ouro", minRating: 1500, color: "#ffd700" },
      { name: "Platina", minRating: 1800, color: "#e5e4e2" },
      { name: "Diamante", minRating: 2100, color: "#b9f2ff" },
      { name: "Mestre", minRating: 2400, color: "#9370db" },
    ],
  });
});

export default router;

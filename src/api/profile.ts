import { Router } from "express";
import { query } from "../db/client";
import { requireAuth } from "../auth/middleware";

const router = Router();

// Get own profile (private view)
router.get("/me", requireAuth, async (req: any, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.created_at,
              u.email, u.settings,
              w.available_balance, w.reserved_balance, w.total_earned, w.total_spent,
              r.rating, r.matches_played, r.wins, r.losses, r.current_streak, r.best_streak
       FROM users u
       JOIN wallets w ON w.user_id = u.id
       JOIN player_ratings r ON r.user_id = u.id
       WHERE u.id = $1`,
      [req.user.userId],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Perfil não encontrado" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Get public profile by username
router.get("/:username", async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.created_at,
              r.rating, r.matches_played, r.wins, r.losses, r.current_streak, r.best_streak
       FROM users u
       JOIN player_ratings r ON r.user_id = u.id
       WHERE u.username = $1 AND u.deleted_at IS NULL`,
      [req.params.username],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Perfil não encontrado" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Get match history for a user
router.get("/:username/matches", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const userResult = await query("SELECT id FROM users WHERE username = $1", [req.params.username]);
    if (userResult.rows.length === 0) return res.json({ matches: [], total: 0, page, limit });

    const userId = userResult.rows[0].id;
    const countResult = await query(
      "SELECT COUNT(*) FROM match_participants WHERE user_id = $1",
      [userId],
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT m.id, m.match_type, m.entry_fee, m.status, m.started_at, m.completed_at,
              mp.result, mp.rating_change, mp.tokens_change,
              opponent.username AS opponent_username,
              winner.username AS winner_username
       FROM match_participants mp
       JOIN matches m ON m.id = mp.match_id
       LEFT JOIN match_participants mp2 ON mp2.match_id = m.id AND mp2.user_id != mp.user_id
       LEFT JOIN users opponent ON opponent.id = mp2.user_id
       LEFT JOIN users winner ON winner.id = m.winner_id
       WHERE mp.user_id = $1
       ORDER BY m.completed_at DESC NULLS LAST, m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    res.json({ matches: result.rows, total, page, limit });
  } catch (err) {
    console.error("Match history error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Get achievements for a user
router.get("/:username/achievements", async (req, res) => {
  try {
    const userResult = await query("SELECT id FROM users WHERE username = $1", [req.params.username]);
    if (userResult.rows.length === 0) return res.json({ achievements: [] });

    const result = await query(
      `SELECT a.code, a.name, a.description, a.icon, ua.unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       ORDER BY ua.unlocked_at NULLS LAST, a.code`,
      [userResult.rows[0].id],
    );
    res.json({ achievements: result.rows });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Update own profile
router.patch("/me", requireAuth, async (req: any, res) => {
  const { display_name, bio, avatar_url } = req.body;
  try {
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (display_name !== undefined) {
      updates.push(`display_name = $${idx++}`);
      params.push(display_name?.slice(0, 40) || null);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${idx++}`);
      params.push(bio?.slice(0, 500) || "");
    }
    if (avatar_url !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      params.push(avatar_url?.slice(0, 500) || null);
    }

    if (updates.length === 0) return res.json({ ok: true });

    updates.push(`updated_at = NOW()`);
    params.push(req.user.userId);

    await query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`,
      params,
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;

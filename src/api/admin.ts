import { Router } from "express";
import { query, transaction } from "../db/client";
import { requireAuth, requireAdmin } from "../auth/middleware";

const router = Router();

// Admin: list users
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const offset = (page - 1) * limit;
    const search = req.query.search as string;

    let where = "deleted_at IS NULL";
    let params: any[] = [];
    if (search) {
      where += " AND (username ILIKE $1 OR email ILIKE $1)";
      params.push(`%${search}%`);
    }

    const countResult = await query(`SELECT COUNT(*) FROM users WHERE ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT id, username, email, display_name, is_admin, is_suspended, created_at
       FROM users WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );
    res.json({ users: result.rows, total, page, limit });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Admin: get user wallet
router.get("/users/:userId/wallet", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT w.*, u.username FROM wallets w JOIN users u ON u.id = w.user_id WHERE w.user_id = $1`,
      [req.params.userId],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Não encontrado" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Admin: adjust wallet
router.post("/users/:userId/adjust-wallet", requireAuth, requireAdmin, async (req: any, res) => {
  const { amount, reason } = req.body;
  if (!amount || !reason) return res.status(400).json({ error: "Valor e motivo são obrigatórios" });

  try {
    const result = await transaction(async (client) => {
      const walletResult = await client.query(
        "SELECT available_balance FROM wallets WHERE user_id = $1 FOR UPDATE",
        [req.params.userId],
      );
      if (walletResult.rows.length === 0) throw new Error("Carteira não encontrada");

      const current = parseInt(walletResult.rows[0].available_balance);
      const newBalance = current + parseInt(amount);
      if (newBalance < 0) throw new Error("Saldo não pode ficar negativo");

      await client.query(
        "UPDATE wallets SET available_balance = $1, updated_at = NOW() WHERE user_id = $2",
        [newBalance, req.params.userId],
      );

      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reason, admin_id)
         VALUES ($1, 'adjustment', $2, $3, $4, $5)`,
        [req.params.userId, parseInt(amount), newBalance, reason, req.user.userId],
      );

      await client.query(
        `INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
         VALUES ($1, 'adjust_wallet', $2, $3)`,
        [req.user.userId, req.params.userId, JSON.stringify({ amount, reason })],
      );

      return { newBalance };
    });
    res.json({ balance: result.newBalance });
  } catch (err: any) {
    if (err.message.includes("não pode") || err.message.includes("não encontrada")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Erro interno" });
  }
});

// Admin: suspend/unsuspend user
router.post("/users/:userId/suspend", requireAuth, requireAdmin, async (req: any, res) => {
  const { suspended } = req.body;
  try {
    await query("UPDATE users SET is_suspended = $1, updated_at = NOW() WHERE id = $2", [suspended, req.params.userId]);
    await query(
      `INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, suspended ? "suspend" : "unsuspend", req.params.userId, JSON.stringify({})],
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Admin: list disputed matches
router.get("/matches/disputed", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, p1.username AS player1, p2.username AS player2
       FROM matches m
       LEFT JOIN match_participants mp1 ON mp1.match_id = m.id AND mp1.player_slot = 0
       LEFT JOIN match_participants mp2 ON mp2.match_id = m.id AND mp2.player_slot = 1
       LEFT JOIN users p1 ON p1.id = mp1.user_id
       LEFT JOIN users p2 ON p2.id = mp2.user_id
       WHERE m.status IN ('disputed', 'in_progress')
       ORDER BY m.created_at DESC LIMIT 100`,
    );
    res.json({ matches: result.rows });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Admin: platform stats
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [users, matches, wallets, txs] = await Promise.all([
      query("SELECT COUNT(*) AS c, COUNT(*) FILTER (WHERE is_suspended) AS suspended FROM users WHERE deleted_at IS NULL"),
      query("SELECT COUNT(*) AS c, COUNT(*) FILTER (WHERE status = 'completed') AS completed, COUNT(*) FILTER (WHERE status = 'disputed') AS disputed FROM matches"),
      query("SELECT SUM(available_balance) AS total_available, SUM(reserved_balance) AS total_reserved FROM wallets"),
      query("SELECT COUNT(*) AS c FROM wallet_transactions WHERE created_at > NOW() - INTERVAL '24 hours'"),
    ]);
    res.json({
      users: users.rows[0],
      matches: matches.rows[0],
      tokens: wallets.rows[0],
      recentTransactions: txs.rows[0].c,
    });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;

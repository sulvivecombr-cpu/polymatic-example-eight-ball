import { Router } from "express";
import { query, transaction } from "../db/client";
import { requireAuth } from "../auth/middleware";

const router = Router();

// Get own wallet
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const result = await query(
      `SELECT available_balance, reserved_balance, total_earned, total_spent
       FROM wallets WHERE user_id = $1`,
      [req.user.userId],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Carteira não encontrada" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Get transaction history
router.get("/transactions", requireAuth, async (req: any, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const countResult = await query(
      "SELECT COUNT(*) FROM wallet_transactions WHERE user_id = $1",
      [req.user.userId],
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT id, type, amount, balance_after, match_id, reason, status, created_at
       FROM wallet_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset],
    );
    res.json({ transactions: result.rows, total, page, limit });
  } catch {
    res.status(500).json({ error: "Erro interno" });
  }
});

// Daily token claim
router.post("/claim-daily", requireAuth, async (req: any, res) => {
  const DAILY_AMOUNT = 100;
  try {
    const result = await transaction(async (client) => {
      // Check last daily claim
      const lastClaim = await client.query(
        `SELECT created_at FROM wallet_transactions
         WHERE user_id = $1 AND type = 'credit' AND reason = 'Bônus diário'
         ORDER BY created_at DESC LIMIT 1`,
        [req.user.userId],
      );

      if (lastClaim.rows.length > 0) {
        const last = new Date(lastClaim.rows[0].created_at);
        const now = new Date();
        const hoursSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 20) {
          throw new Error("Você já resgatou seu bônus diário recentemente");
        }
      }

      const { rows } = await client.query(
        "SELECT available_balance FROM wallets WHERE user_id = $1 FOR UPDATE",
        [req.user.userId],
      );
      const newBalance = parseInt(rows[0].available_balance) + DAILY_AMOUNT;

      await client.query(
        "UPDATE wallets SET available_balance = $1, total_earned = total_earned + $2, updated_at = NOW() WHERE user_id = $3",
        [newBalance, DAILY_AMOUNT, req.user.userId],
      );
      await client.query(
        `INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reason)
         VALUES ($1, 'credit', $2, $3, 'Bônus diário')`,
        [req.user.userId, DAILY_AMOUNT, newBalance],
      );

      return { newBalance };
    });
    res.json({ balance: result.newBalance, amount: DAILY_AMOUNT });
  } catch (err: any) {
    if (err.message.includes("já resgatou")) {
      return res.status(429).json({ error: err.message });
    }
    console.error("Daily claim error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

export default router;

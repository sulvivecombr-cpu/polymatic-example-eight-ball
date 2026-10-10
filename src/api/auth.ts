import { Router } from "express";
import bcrypt from "bcrypt";
import { query, transaction } from "../db/client";
import { signToken } from "../auth/jwt";
import { COOKIE_NAME } from "../auth/middleware";

const router = Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Register
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Preencha todos os campos" });
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: "Usuário deve ter 3-20 caracteres (letras, números, _)" });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Email inválido" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Senha deve ter no mínimo 6 caracteres" });
  }

  try {
    const existing = await query("SELECT 1 FROM users WHERE username = $1 OR email = $2", [username, email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Usuário ou email já cadastrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || "admin";
    const isAdmin = username === adminUsername;

    const result = await transaction(async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (username, email, password_hash, display_name, is_admin)
         VALUES ($1, $2, $3, $1, $4) RETURNING id, username, is_admin`,
        [username, email, passwordHash, isAdmin],
      );
      const user = userResult.rows[0];

      await client.query(
        "INSERT INTO wallets (user_id, available_balance) VALUES ($1, 1000)",
        [user.id],
      );
      await client.query(
        "INSERT INTO wallet_transactions (user_id, type, amount, balance_after, reason) VALUES ($1, 'credit', 1000, 1000, 'Bônus de boas-vindas')",
        [user.id],
      );
      await client.query(
        "INSERT INTO player_ratings (user_id) VALUES ($1)",
        [user.id],
      );

      return user;
    });

    const token = signToken({ userId: result.id, username: result.username, isAdmin: result.is_admin });
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({
      id: result.id,
      username: result.username,
      isAdmin: result.is_admin,
      token,
    });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Usuário ou email já cadastrado" });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Preencha usuário e senha" });
  }

  try {
    const result = await query(
      "SELECT id, username, password_hash, is_admin, is_suspended FROM users WHERE username = $1 AND deleted_at IS NULL",
      [username],
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }
    const user = result.rows[0];
    if (user.is_suspended) {
      return res.status(403).json({ error: "Conta suspensa" });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }

    const token = signToken({ userId: user.id, username: user.username, isAdmin: user.is_admin });
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ id: user.id, username: user.username, isAdmin: user.is_admin, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// Get current user
router.get("/me", async (req: any, res) => {
  if (!req.user) return res.json(null);
  try {
    const result = await query(
      `SELECT u.id, u.username, u.display_name, u.is_admin, u.is_suspended,
              w.available_balance, w.reserved_balance
       FROM users u JOIN wallets w ON w.user_id = u.id
       WHERE u.id = $1`,
      [req.user.userId],
    );
    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch {
    res.json(null);
  }
});

export default router;

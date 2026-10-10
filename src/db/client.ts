import pg from "pg";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL || "postgres://poolarena:poolarena_dev@localhost:5432/poolarena";

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function withLockedWallet<T>(
  client: pg.PoolClient,
  userId: string,
  fn: (row: { available_balance: string; reserved_balance: string }) => Promise<T>,
): Promise<T> {
  const { rows } = await client.query("SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE", [userId]);
  if (rows.length === 0) throw new Error("Wallet not found");
  return fn(rows[0]);
}

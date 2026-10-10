// Migration runner — runs all .sql files in src/db/migrations/ in order.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.DATABASE_URL || "postgres://poolarena:poolarena_dev@localhost:5432/poolarena";

const migrationsDir = path.join(__dirname, "migrations");

async function main() {
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: applied } = await client.query("SELECT filename FROM schema_migrations");
    const appliedSet = new Set(applied.map((r) => r.filename));

    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (appliedSet.has(file)) continue;
      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`  ✓ ${file}`);
    }

    console.log("Migrations complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

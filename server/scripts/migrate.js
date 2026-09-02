import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDatabase, isDatabaseUnavailable, pool } from "../db.js";

if (!pool) throw new Error("DATABASE_URL is required to run migrations");

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const withConnectionRetry = async (operation) => {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isDatabaseUnavailable(error) || attempt === 4) throw error;
      const delay = 500 * (attempt + 1);
      console.warn(`[migration] database is not ready; retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
  throw lastError;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(scriptDir, "../migrations");

try {
  await withConnectionRetry(() => pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `));
  const appliedResult = await withConnectionRetry(() => pool.query("SELECT filename FROM schema_migrations"));
  const applied = new Set(appliedResult.rows.map((row) => row.filename));
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  for (const filename of files) {
    if (applied.has(filename)) continue;
    const sql = await readFile(path.join(migrationsDir, filename), "utf8");
    const client = await withConnectionRetry(() => pool.connect());
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
        [filename]
      );
      console.log(`[migration] applied ${filename}`);
    } finally {
      client.release();
    }
  }
  console.log("[migration] database is up to date");
} finally {
  await closeDatabase();
}

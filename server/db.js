import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000
    })
  : null;

pool?.on("error", (error) => {
  console.error("[database] unexpected pool error", error);
});

export const query = async (text, values = []) => {
  if (!pool) {
    const error = new Error("DATABASE_URL is not configured");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }
  return pool.query(text, values);
};

export const databaseStatus = async () => {
  if (!pool) return { configured: false, connected: false };
  try {
    await pool.query("SELECT 1");
    return { configured: true, connected: true };
  } catch (error) {
    return { configured: true, connected: false, error: error.message };
  }
};

export const closeDatabase = () => pool?.end();

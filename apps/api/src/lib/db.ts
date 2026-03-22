import pg from "pg";
import { env } from "./env.js";
import { log } from "./logger.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getDb(): pg.Pool {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      log("error", "[DB] Pool error", { error: err.message });
    });
  }

  return pool;
}

export async function pingDb(): Promise<void> {
  const db = getDb();
  await db.query("SELECT 1");
}

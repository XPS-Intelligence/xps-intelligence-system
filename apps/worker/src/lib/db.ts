import pg from "pg";
import { env } from "./env.js";
import { log } from "./logger.js";

let pool: pg.Pool | null = null;

export function getDb(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    pool.on("error", (error: Error) => {
      log.error("[DB] Pool error", { error: error.message });
    });
  }

  return pool;
}

export async function pingDb(): Promise<void> {
  const client = await getDb().connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

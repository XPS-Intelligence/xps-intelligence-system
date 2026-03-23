import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL_MODE: z.enum(["disable", "require"]).default("disable"),
  WORKER_NAME: z.string().min(1).default("xps-worker"),
  WORKER_QUEUE_KEY: z.string().min(1).default("xps:scrape:queue"),
  WORKER_HEARTBEAT_KEY: z.string().min(1).default("xps:worker:heartbeat"),
  WORKER_HEARTBEAT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  WORKER_DB_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  WORKER_IDLE_SLEEP_MS: z.coerce.number().int().positive().default(2000),
  WORKER_MAX_BATCH_SIZE: z.coerce.number().int().positive().default(1),
  WORKER_SOURCE_KEY: z.string().min(1).default("xps-scraper-worker"),
  WORKER_SOURCE_NAME: z.string().min(1).default("XPS Scraper Worker"),
  WORKER_SOURCE_TYPE: z.string().min(1).default("api"),
  FIRECRAWL_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  SERPAPI_KEY: z.string().optional(),
  STEEL_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`).join("\n");
  throw new Error(`Invalid worker environment:\n${details}`);
}

export const env = parsed.data;

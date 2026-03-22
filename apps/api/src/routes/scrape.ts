import { Router } from "express";
import { z } from "zod";
import { getDb } from "../lib/db.js";
import { env } from "../lib/env.js";
import { getRedis } from "../lib/redis.js";
import { requireAuth } from "../middleware/auth.js";

export const scrapeRouter = Router();

const searchSchema = z.object({
  city: z.string().min(1),
  state: z.string().min(1),
  industry: z.string().min(1),
  keyword: z.string().optional(),
  max_results: z.coerce.number().int().positive().max(100).default(30),
});

const crawlSchema = z.object({
  url: z.string().url().optional(),
  company_name: z.string().min(1).optional(),
  mode: z.enum(["firecrawl", "steel", "auto"]).default("auto"),
  query: z.string().optional(),
}).refine((value) => Boolean(value.url || value.company_name || value.query), {
  message: "url, company_name, or query is required",
});

async function enqueueJob(
  jobType: "search" | "crawl",
  payload: Record<string, unknown>,
  requestedBy?: string
) {
  const db = getDb();
  const inserted = await db.query<{ id: string }>(
    `INSERT INTO crawl_jobs (
       job_type, requested_by, status, input_payload, execution_profile, metadata
     )
     VALUES ($1,$2,'queued',$3,$4,$5)
     RETURNING id`,
    [
      jobType,
      requestedBy ?? null,
      JSON.stringify(payload),
      "standard",
      JSON.stringify({ queued_via: "api", worker_queue_key: env.WORKER_QUEUE_KEY }),
    ]
  );

  const jobId = inserted.rows[0].id;
  const queuePayload = {
    taskId: jobId,
    crawl_job_id: jobId,
    type: jobType,
    userId: requestedBy,
    ...payload,
  };

  const redis = getRedis();
  if (redis.status !== "ready") {
    await redis.connect();
  }
  await redis.lpush(env.WORKER_QUEUE_KEY, JSON.stringify(queuePayload));

  return { jobId };
}

scrapeRouter.post("/search", requireAuth, async (req, res) => {
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid search payload", details: parsed.error.flatten() });
  }

  try {
    const queued = await enqueueJob("search", parsed.data, req.user?.id);
    return res.status(202).json({
      status: "queued",
      source: "redis+db",
      ...queued,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

scrapeRouter.post("/crawl", requireAuth, async (req, res) => {
  const parsed = crawlSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid crawl payload", details: parsed.error.flatten() });
  }

  try {
    const queued = await enqueueJob("crawl", parsed.data, req.user?.id);
    return res.status(202).json({
      status: "queued",
      source: "redis+db",
      ...queued,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

scrapeRouter.get("/jobs", requireAuth, async (_req, res) => {
  try {
    const db = getDb();
    const result = await db.query<{
      id: string;
      job_type: string;
      status: string;
      input_payload: Record<string, unknown>;
      created_at: string;
      started_at: string | null;
      completed_at: string | null;
      error_message: string | null;
    }>(
      `SELECT
         id,
         job_type,
         status,
         input_payload,
         created_at::text,
         started_at::text,
         completed_at::text,
         error_message
       FROM crawl_jobs
       ORDER BY created_at DESC
       LIMIT 50`
    );

    return res.json({
      items: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

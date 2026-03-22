import "dotenv/config";
import { env } from "./lib/env.js";
import { log } from "./lib/logger.js";
import { getDb, pingDb } from "./lib/db.js";
import { getRedis, pingRedis } from "./lib/redis.js";
import {
  ensureSourceRegistry,
  hashPayload,
  resolveAndPersistLead,
  type WorkerTask,
  type WorkerLead,
} from "./lib/canonical.js";
import { runScrapeTask } from "./scraper.js";
import { searchBusinesses } from "./search-engine.js";

type QueueTask = WorkerTask & {
  type?: "search" | "crawl" | "ingest" | "enrich" | "classify" | "score";
  city?: string;
  state?: string;
  industry?: string;
  keyword?: string;
  max_results?: number;
  url?: string;
  company_name?: string;
  query?: string;
};

async function claimDbJob() {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      id: string;
      job_type: string;
      source_registry_id: string | null;
      input_payload: Record<string, unknown>;
      execution_profile: string;
      requested_by: string | null;
    }>(
      `WITH next_job AS (
         SELECT id
         FROM crawl_jobs
         WHERE status = 'queued'
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE crawl_jobs cj
       SET status = 'running',
           started_at = NOW(),
           updated_at = NOW()
       FROM next_job
       WHERE cj.id = next_job.id
       RETURNING cj.id, cj.job_type, cj.source_registry_id, cj.input_payload, cj.execution_profile, cj.requested_by`
    );
    await client.query("COMMIT");
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function finalizeDbJob(jobId: string, status: "completed" | "failed", payload: Record<string, unknown>) {
  const db = getDb();
  await db.query(
    `UPDATE crawl_jobs
     SET status = $2,
         completed_at = NOW(),
         updated_at = NOW(),
         metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
     WHERE id = $1`,
    [jobId, status, JSON.stringify(payload)]
  );
}

async function createRunForJob(jobId: string, runnerType: string, payload: Record<string, unknown>) {
  const db = getDb();
  const existing = await db.query<{ run_number: number }>(
    "SELECT COALESCE(MAX(run_number), 0) AS run_number FROM crawl_runs WHERE crawl_job_id = $1",
    [jobId]
  );
  const runNumber = (existing.rows[0]?.run_number ?? 0) + 1;
  const inserted = await db.query<{ id: string }>(
    `INSERT INTO crawl_runs (
       crawl_job_id, run_number, runner_type, status, request_payload, response_metadata, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [jobId, runNumber, runnerType, "running", JSON.stringify(payload), JSON.stringify({}), JSON.stringify({ worker: env.WORKER_NAME })]
  );
  return inserted.rows[0].id;
}

async function finalizeRun(runId: string, status: "completed" | "failed", metrics: Record<string, unknown>) {
  const db = getDb();
  await db.query(
    `UPDATE crawl_runs
     SET status = $2,
         completed_at = NOW(),
         response_metadata = COALESCE(response_metadata, '{}'::jsonb) || $3::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [runId, status, JSON.stringify(metrics)]
  );
}

async function persistLeads(sourceId: string, leads: WorkerLead[], context: Record<string, unknown>) {
  const db = getDb();
  for (const lead of leads) {
    await resolveAndPersistLead(db, sourceId, lead, context);
  }
}

function normalizeTask(taskData: string): QueueTask {
  const parsed = JSON.parse(taskData) as QueueTask;
  return {
    taskId: parsed.taskId || parsed.crawl_job_id || hashPayload(parsed),
    ...parsed,
  };
}

async function processSearchTask(task: QueueTask, sourceId: string, runId: string) {
  const search = await searchBusinesses({
    city: task.city || "Port St. Lucie",
    state: task.state || "FL",
    industry: task.industry || "businesses",
    keyword: task.keyword,
    max_results: task.max_results || 30,
  });

  await persistLeads(sourceId, search.leads as WorkerLead[], {
    crawlRunId: runId,
    taskId: task.taskId,
    sourceKey: task.source_key,
    mode: "search",
    searchSource: search.source,
  });

  return { leads: search.leads.length, source: search.source };
}

async function processCrawlTask(task: QueueTask, sourceId: string, runId: string) {
  const scrape = await runScrapeTask({
    taskId: task.taskId || runId,
    userId: task.userId,
    url: task.url,
    company_name: task.company_name,
    query: task.query,
    mode: task.mode,
  });

  const leads = (scrape.leads || []) as WorkerLead[];
  await persistLeads(sourceId, leads, {
    crawlRunId: runId,
    taskId: task.taskId,
    sourceKey: task.source_key,
    mode: "crawl",
    scrapeMetadata: scrape.metadata || {},
  });

  return { leads: leads.length, source: scrape.metadata?.source || "unknown" };
}

async function processTask(task: QueueTask, origin: "redis" | "database") {
  const db = getDb();
  const source = await ensureSourceRegistry(db, task, origin === "redis" ? task.type || "search" : "database");
  const jobId = task.crawl_job_id || task.taskId || hashPayload(task);
  const runId = await createRunForJob(jobId, origin === "redis" ? "worker" : "hybrid", task);

  log.info("Processing task", {
    taskId: task.taskId,
    jobId,
    runId,
    origin,
    type: task.type || "crawl",
    sourceKey: source.source_key,
  });

  try {
    const result = task.type === "search" || task.query
      ? await processSearchTask(task, source.id, runId)
      : await processCrawlTask(task, source.id, runId);

    await finalizeRun(runId, "completed", result);
    if (task.crawl_job_id) {
      await finalizeDbJob(task.crawl_job_id, "completed", result);
    }
    log.info("Task completed", { taskId: task.taskId, jobId, runId, ...result });
  } catch (error) {
    const message = (error as Error).message;
    await finalizeRun(runId, "failed", { error: message });
    if (task.crawl_job_id) {
      await finalizeDbJob(task.crawl_job_id, "failed", { error: message });
    }
    log.error("Task failed", { taskId: task.taskId, jobId, runId, error: message });
  }
}

async function claimRedisTask(): Promise<QueueTask | null> {
  const redis = getRedis();
  const result = await redis.brpop(env.WORKER_QUEUE_KEY, 1);
  if (!result) return null;
  return normalizeTask(result[1]);
}

async function claimDatabaseTask(): Promise<QueueTask | null> {
  const job = await claimDbJob();
  if (!job) return null;
  return {
    taskId: job.id,
    crawl_job_id: job.id,
    type: job.job_type as QueueTask["type"],
    source_key: "crawl_jobs",
    source_name: "Crawl Jobs",
    source_type: "database",
    payload: job.input_payload,
    userId: job.requested_by ?? undefined,
    city: typeof job.input_payload.city === "string" ? job.input_payload.city : undefined,
    state: typeof job.input_payload.state === "string" ? job.input_payload.state : undefined,
    industry: typeof job.input_payload.industry === "string" ? job.input_payload.industry : undefined,
    keyword: typeof job.input_payload.keyword === "string" ? job.input_payload.keyword : undefined,
    url: typeof job.input_payload.url === "string" ? job.input_payload.url : undefined,
    company_name: typeof job.input_payload.company_name === "string" ? job.input_payload.company_name : undefined,
    query: typeof job.input_payload.query === "string" ? job.input_payload.query : undefined,
    max_results: typeof job.input_payload.max_results === "number" ? job.input_payload.max_results : undefined,
  };
}

function isMissingRelationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('relation "') && message.includes("does not exist");
}

async function heartbeat() {
  const redis = getRedis();
  await redis.set(
    env.WORKER_HEARTBEAT_KEY,
    JSON.stringify({
      worker: env.WORKER_NAME,
      timestamp: new Date().toISOString(),
      queue: env.WORKER_QUEUE_KEY,
    }),
    "EX",
    env.WORKER_HEARTBEAT_TTL_SECONDS
  );
}

export async function main(): Promise<void> {
  log.info("Worker starting", {
    worker: env.WORKER_NAME,
    queue: env.WORKER_QUEUE_KEY,
    redisUrl: env.REDIS_URL.replace(/:\/\/.*@/, "://***@"),
  });

  await pingDb();
  await pingRedis();
  await heartbeat();

  let databasePollingEnabled = true;
  const heartbeatTimer = setInterval(() => {
    heartbeat().catch((error) => log.warn("Heartbeat failed", { error: (error as Error).message }));
  }, env.WORKER_HEARTBEAT_TTL_SECONDS * 1000);

  const shutdown = async (signal: string) => {
    log.info("Worker shutting down", { signal });
    clearInterval(heartbeatTimer);
    const redis = getRedis();
    const db = getDb();

    await Promise.allSettled([redis.quit(), db.end()]);
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  while (true) {
    const redisTask = await claimRedisTask();
    if (redisTask) {
      await processTask(redisTask, "redis");
      continue;
    }

    if (databasePollingEnabled) {
      try {
        const dbTask = await claimDatabaseTask();
        if (dbTask) {
          await processTask(dbTask, "database");
          continue;
        }
      } catch (error) {
        if (isMissingRelationError(error)) {
          databasePollingEnabled = false;
          log.warn("Database polling disabled because canonical job tables are unavailable", {
            error: (error as Error).message,
          });
        } else {
          throw error;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, env.WORKER_IDLE_SLEEP_MS));
  }
}

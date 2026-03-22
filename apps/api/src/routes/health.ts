import type { Request, Response } from "express";
import { env } from "../lib/env.js";
import { pingDb } from "../lib/db.js";
import { pingRedis } from "../lib/redis.js";
import { pingSupabase } from "../lib/supabase.js";

type CheckStatus = "ok" | "degraded" | "down";

async function runChecks() {
  const checks = {
    db: { status: "down" as CheckStatus, detail: "not checked" },
    redis: { status: "down" as CheckStatus, detail: "not checked" },
    supabase: { status: "down" as CheckStatus, detail: "not checked" },
  };

  if (!env.DATABASE_URL) {
    checks.db = { status: "degraded", detail: "DATABASE_URL not configured" };
  } else {
    try {
      await pingDb();
      checks.db = { status: "ok", detail: "reachable" };
    } catch (error) {
      checks.db = { status: "down", detail: (error as Error).message };
    }
  }

  try {
    await pingRedis();
    checks.redis = { status: "ok", detail: "reachable" };
  } catch (error) {
    checks.redis = { status: "down", detail: (error as Error).message };
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    checks.supabase = { status: "ok", detail: "Supabase disabled for Railway-first auth" };
  } else {
    try {
      await pingSupabase();
      checks.supabase = { status: "ok", detail: "reachable" };
    } catch (error) {
      checks.supabase = { status: "down", detail: (error as Error).message };
    }
  }

  const overall: CheckStatus = Object.values(checks).some((check) => check.status === "down")
    ? "down"
    : Object.values(checks).some((check) => check.status === "degraded")
      ? "degraded"
      : "ok";

  return { overall, checks };
}

export async function handleHealth(_req: Request, res: Response) {
  const payload = await runChecks();
  res.status(200).json({
    service: "api",
    status: payload.overall,
    ready: payload.overall === "ok",
    timestamp: new Date().toISOString(),
    checks: payload.checks,
  });
}

export async function handleReady(_req: Request, res: Response) {
  const payload = await runChecks();
  const statusCode = payload.overall === "ok" ? 200 : 503;

  res.status(statusCode).json({
    service: "api",
    status: payload.overall,
    ready: payload.overall === "ok",
    timestamp: new Date().toISOString(),
    checks: payload.checks,
  });
}

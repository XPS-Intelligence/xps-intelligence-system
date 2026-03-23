import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";
import { queueSearch, readCandidates, signIn, waitForCandidate } from "./playwright-helpers.mjs";
import { startRuntimeStack, stopRuntimeStack } from "./runtime-stack.mjs";

const execFileAsync = promisify(execFile);

async function dockerCompose(args) {
  return execFileAsync("docker", ["compose", "-f", "infra/docker/compose.local.yml", ...args], {
    cwd: process.cwd(),
    windowsHide: true,
  });
}

async function waitForWorkerRunning(timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { stdout } = await dockerCompose(["ps", "--format", "json"]);
    if (stdout.trim()) {
      const parsed = stdout
        .trim()
        .split(/\r?\n/)
        .map((line) => JSON.parse(line));
      const worker = parsed.find((item) => item.Service === "worker");
      if (worker && /running/i.test(worker.State ?? "")) {
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error("Timed out waiting for worker container to recover");
}

const stack = await startRuntimeStack();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: stack.baseURL });
const page = await context.newPage();

try {
  const auth = await signIn(page, {
    email: "chaos-admin@xps.local",
    fullName: "Chaos Admin",
    role: "admin",
  });

  const before = await readCandidates(page);
  const beforeCount = before.items.length;

  await dockerCompose(["restart", "worker"]);
  await waitForWorkerRunning();
  await page.waitForTimeout(3_000);

  const queueResult = await queueSearch(page, {
    city: "Tampa",
    state: "FL",
    industry: "resinous floor contractor",
    keyword: "polished concrete",
  });
  assert.ok(queueResult.jobId, "Expected queued job after worker restart");

  const candidate = await waitForCandidate(page, /tampa|resin|concrete/i, 180_000);
  assert.match(candidate.company_name, /tampa|resin|concrete/i);

  const after = await readCandidates(page);
  assert.ok(after.items.length >= beforeCount, "Expected lead candidates to remain readable after worker restart");

  const health = await page.request.get(`${stack.apiURL}/health`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  assert.equal(health.ok(), true, "Expected API health to remain reachable after worker restart");

  console.log(
    JSON.stringify(
      {
        restarted: "worker",
        queueJobId: queueResult.jobId,
        candidate: candidate.company_name,
        beforeCount,
        afterCount: after.items.length,
      },
      null,
      2,
    ),
  );
  console.log("Chaos harness passed.");
} finally {
  await stopRuntimeStack(stack);
  await context.close();
  await browser.close();
}

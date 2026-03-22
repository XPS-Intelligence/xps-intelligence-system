import assert from "node:assert/strict";
import { chromium } from "playwright";
import { queueSearch, readCandidates, signIn, waitForCandidate } from "./playwright-helpers.mjs";
import { startRuntimeStack, stopRuntimeStack } from "./runtime-stack.mjs";

const startedAt = Date.now();
const stack = await startRuntimeStack();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: stack.baseURL });
const page = await context.newPage();

try {
  const loginStart = Date.now();
  const auth = await signIn(page, { email: "benchmark@xps.local" });
  const loginMs = Date.now() - loginStart;

  const authCheckStart = Date.now();
  const meResponse = await page.request.get(`${stack.apiURL}/auth/me`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  assert.equal(meResponse.ok(), true, "Expected benchmark auth check to succeed");
  const mePayload = await meResponse.json();
  assert.equal(mePayload.user?.email, auth.email);
  const authCheckMs = Date.now() - authCheckStart;

  const queueStart = Date.now();
  const queueResult = await queueSearch(page);
  assert.ok(queueResult.jobId, "Expected search queue response to include a job id");
  const candidate = await waitForCandidate(page, /miami|epoxy|concrete/i, 180_000);
  const candidateMs = Date.now() - queueStart;

  const candidates = await readCandidates(page);
  assert.ok(candidates.items.length > 0, "Expected at least one visible lead candidate");

  const summaryStart = Date.now();
  const summaryResponse = await page.request.get(`${stack.apiURL}/analytics/summary`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  assert.equal(summaryResponse.ok(), true, "Expected analytics summary to be readable");
  const summary = await summaryResponse.json();
  assert.ok(summary.total_leads >= 1, "Expected analytics summary to reflect the queued lead");
  const summaryMs = Date.now() - summaryStart;

  const payload = {
    loginMs,
    authCheckMs,
    queueJobId: queueResult.jobId,
    candidateMs,
    candidateName: candidate.company_name,
    summaryMs,
    totalMs: Date.now() - startedAt,
    capturedAt: new Date().toISOString(),
  };

  console.log(JSON.stringify(payload, null, 2));

  assert.ok(payload.totalMs < 240_000, "Benchmark flow exceeded the 4 minute guardrail");
  console.log("Benchmark harness passed.");
} finally {
  await stopRuntimeStack(stack);
  await context.close();
  await browser.close();
}

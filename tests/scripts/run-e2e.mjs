import assert from "node:assert/strict";
import { chromium } from "playwright";
import { queueSearch, readCandidates, signIn, waitForCandidate } from "./playwright-helpers.mjs";
import { startRuntimeStack, stopRuntimeStack } from "./runtime-stack.mjs";

const stack = await startRuntimeStack();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: stack.baseURL });
const page = await context.newPage();

try {
  await page.goto("/", { waitUntil: "commit" });
  const landingText = await page.textContent("body");
  assert.match(landingText || "", /XPS Intelligence/i);

  const auth = await signIn(page);
  const meResponse = await page.request.get(`${stack.apiURL}/auth/me`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  assert.equal(meResponse.ok(), true, "Expected /auth/me to accept the session token");
  const mePayload = await meResponse.json();
  assert.equal(mePayload.user?.email, auth.email);

  const baselineCandidates = await readCandidates(page);
  const baselineCount = baselineCandidates.items.length;

  const queueResult = await queueSearch(page);
  assert.ok(queueResult.jobId, "Expected search queue response to include a job id");

  const candidate = await waitForCandidate(page, /miami|epoxy|concrete/i, 180_000);
  assert.match(candidate.company_name, /miami|epoxy|concrete/i);

  const candidates = await readCandidates(page);
  assert.ok(
    candidates.items.length >= baselineCount,
    "Expected candidate list to remain readable after the queued search"
  );

  console.log("E2E harness passed.");
} finally {
  await stopRuntimeStack(stack);
  await context.close();
  await browser.close();
}

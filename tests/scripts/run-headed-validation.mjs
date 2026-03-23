import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { queueSearch, signIn } from "./playwright-helpers.mjs";
import { startRuntimeStack, stopRuntimeStack } from "./runtime-stack.mjs";

const artifactRoot = path.resolve("output", "playwright", "headful");
const screenshotDir = path.join(artifactRoot, "screenshots");
const tracePath = path.join(artifactRoot, "trace.zip");

await fs.mkdir(screenshotDir, { recursive: true });

const stack = await startRuntimeStack();
const browser = await chromium.launch({ headless: false, slowMo: 120 });
const context = await browser.newContext({
  baseURL: stack.baseURL,
  recordVideo: {
    dir: artifactRoot,
    size: { width: 1600, height: 900 },
  },
  viewport: { width: 1600, height: 900 },
});
const page = await context.newPage();

try {
  await context.tracing.start({ screenshots: true, snapshots: true });

  await page.goto("/", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(screenshotDir, "01-landing.png"), fullPage: true });
  assert.match(await page.textContent("body"), /XPS Intelligence/i);

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(screenshotDir, "02-login.png"), fullPage: true });
  assert.match(await page.textContent("body"), /Welcome back/i);

  await signIn(page, { email: "headful-admin@xps.local", fullName: "Headful Admin", role: "admin" });

  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(screenshotDir, "03-dashboard.png"), fullPage: true });
  assert.match(await page.textContent("body"), /Dashboard|Recent movement/i);

  await page.goto("/leads", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(screenshotDir, "04-leads.png"), fullPage: true });
  assert.match(await page.textContent("body"), /Lead candidates|Promote to HubSpot|No lead candidates/i);

  await page.goto("/scraper", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(screenshotDir, "05-scraper-before.png"), fullPage: true });
  await queueSearch(page, { city: "Miami", state: "FL", industry: "epoxy flooring contractor", keyword: "decorative concrete" });
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(screenshotDir, "06-scraper-after.png"), fullPage: true });
  assert.match(await page.textContent("body"), /Preset-driven manual search|Browser-assisted direct crawl|Personal scraper presets|Scraper copilot/i);

  await page.goto("/ai-assistant", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(screenshotDir, "07-ai-assistant.png"), fullPage: true });
  assert.match(await page.textContent("body"), /AI partner|Assistant briefing|Workspace template/i);

  await page.goto("/admin", { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(screenshotDir, "08-admin.png"), fullPage: true });
  assert.match(await page.textContent("body"), /Center editor|Operator manifest|Operator quick launch|Live preview/i);

  await context.tracing.stop({ path: tracePath });
  console.log(
    JSON.stringify(
      {
        artifactRoot,
        screenshots: await fs.readdir(screenshotDir),
        tracePath,
      },
      null,
      2,
    ),
  );
  console.log("Headful validation passed.");
} finally {
  await stopRuntimeStack(stack);
  await context.close();
  await browser.close();
}

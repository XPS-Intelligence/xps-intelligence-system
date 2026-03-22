import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startRuntimeStack, stopRuntimeStack } from "./runtime-stack.mjs";

const stack = await startRuntimeStack();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL: stack.baseURL });
const page = await context.newPage();

try {
  await page.goto("/", { waitUntil: "commit" });
  await assert.match(await page.textContent("body"), /XPS Intelligence/i);

  await page.goto("/login", { waitUntil: "commit" });
  await assert.match(await page.textContent("body"), /Welcome back/i);

  await page.goto("/scraper", { waitUntil: "commit" });
  assert.ok(await page.textContent("body"), "Expected scraper route to return rendered content");

  console.log("Postdeploy smoke passed.");
} finally {
  await stopRuntimeStack(stack);
  await context.close();
  await browser.close();
}

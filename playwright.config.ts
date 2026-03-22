const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const isExternalTarget = Boolean(process.env.PLAYWRIGHT_BASE_URL);

/** @type {import("playwright").PlaywrightTestConfig} */
const config = {
  testDir: "./tests",
  testMatch: /.*\.(spec|test)\.ts$/,
  testIgnore: ["**/scripts/**"],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  reporter: process.env.CI ? [["github"], ["line"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  webServer: isExternalTarget
    ? undefined
    : {
        command: "node tests/scripts/stack-server.mjs",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
  projects: [
    {
      name: "chromium",
    },
  ],
};

export default config;

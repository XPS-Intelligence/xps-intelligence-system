import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const defaultLogin = {
  email: "playwright@xps.local",
  password: "changeme123",
  fullName: "Playwright Operator",
};

export const apiBaseUrl = process.env.PLAYWRIGHT_API_URL || "http://127.0.0.1:4000/api";

export async function signIn(page: Page, overrides: Partial<typeof defaultLogin> = {}) {
  const user = { ...defaultLogin, ...overrides };
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /enter workspace/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("xps_token"))).not.toBeNull();
}

export async function queueCrawl(page: Page, url: string) {
  await page.goto("/scraper");
  await expect(page.getByRole("heading", { name: /scraper/i })).toBeVisible();
  await page.getByLabel("URL").fill(url);
  await page.getByRole("button", { name: /queue crawl/i }).click();
  await expect(page.getByText(/scrape controls/i)).toBeVisible();
}

export async function readAuthedCandidates(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("xps_token"));
  return page.evaluate(
    async ({ apiBaseUrl, token }) => {
      const response = await fetch(`${apiBaseUrl}/lead-candidates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Lead candidate request failed: ${response.status}`);
      }

      return response.json();
    },
    { apiBaseUrl, token }
  ) as Promise<{ items: Array<{ company_name: string; score: number; candidate_status: string }> }>;
}

export async function waitForCandidate(page: Page, companyMatcher: RegExp, timeoutMs = 120_000) {
  await expect.poll(
    async () => {
      const result = await readAuthedCandidates(page);
      return result.items.find((item) => companyMatcher.test(item.company_name)) ?? null;
    },
    { timeout: timeoutMs, intervals: [1000, 2000, 3000] }
  ).not.toBeNull();
}

import assert from "node:assert/strict";

export const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
export const apiBaseUrl = process.env.PLAYWRIGHT_API_URL || "http://127.0.0.1:4000/api";

export async function signIn(page, overrides = {}) {
  const user = {
    email: "playwright@xps.local",
    password: "changeme123",
    fullName: "Playwright Operator",
    ...overrides,
  };

  await page.goto("/login", { waitUntil: "commit" });

  const loginResponse = await page.request.post(`${apiBaseUrl}/auth/login`, {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  let payload = await loginResponse.json();

  if (!loginResponse.ok() || !payload.token) {
    const registerResponse = await page.request.post(`${apiBaseUrl}/auth/register`, {
      data: {
        email: user.email,
        password: user.password,
        full_name: user.fullName,
      },
    });

    payload = await registerResponse.json();

    if (!registerResponse.ok() || !payload.token) {
      throw new Error(`Auth bootstrap failed: ${JSON.stringify(payload)}`);
    }
  }

  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("xps_token", token);
      localStorage.setItem("xps_user", JSON.stringify(user));
      document.cookie = "xps_session=1; Path=/; SameSite=Lax";
      document.cookie = `xps_role=${encodeURIComponent(user.role || "employee")}; Path=/; SameSite=Lax`;
    },
    {
      token: payload.token,
      user: payload.user ?? { email: user.email, full_name: user.fullName, role: "employee" },
    }
  );

  const token = await page.evaluate(() => localStorage.getItem("xps_token"));
  assert.ok(token, "Expected xps_token to be stored after login");

  return { ...user, token };
}

export async function queueCrawl(page, url) {
  await page.goto("/scraper", { waitUntil: "commit" });
  const token = await page.evaluate(() => localStorage.getItem("xps_token"));
  if (!token) {
    throw new Error("Expected auth token before queueing crawl");
  }

  const response = await page.request.post(`${apiBaseUrl}/scrape/crawl`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {
      url,
      mode: "auto",
    },
  });

  const payload = await response.json();
  if (!response.ok()) {
    throw new Error(`Queue crawl failed with ${response.status()}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

export async function queueSearch(page, overrides = {}) {
  await page.goto("/scraper", { waitUntil: "commit" });
  const token = await page.evaluate(() => localStorage.getItem("xps_token"));
  if (!token) {
    throw new Error("Expected auth token before queueing search");
  }

  const response = await page.request.post(`${apiBaseUrl}/scrape/search`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {
      city: "Miami",
      state: "FL",
      industry: "epoxy flooring contractor",
      keyword: "decorative concrete",
      max_results: 5,
      ...overrides,
    },
  });

  const payload = await response.json();
  if (!response.ok()) {
    throw new Error(`Queue search failed with ${response.status()}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

export async function readCandidates(page) {
  const token = await page.evaluate(() => localStorage.getItem("xps_token"));
  const response = await page.request.get(`${apiBaseUrl}/lead-candidates`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok()) {
    throw new Error(`Lead candidate request failed: ${response.status()}`);
  }

  return response.json();
}

export async function waitForCandidate(page, matcher, timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await readCandidates(page);
    const item = result.items.find((candidate) => matcher.test(candidate.company_name));
    if (item) return item;
    await page.waitForTimeout(2000);
  }

  throw new Error(`Timed out waiting for candidate matching ${matcher}`);
}

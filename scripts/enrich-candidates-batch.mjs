import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiBaseUrl = process.env.XPS_API_URL || "http://127.0.0.1:4000/api";
const batchEmail = process.env.XPS_BATCH_EMAIL || "playwright@xps.local";
const batchPassword = process.env.XPS_BATCH_PASSWORD || "changeme123";

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function authenticate() {
  const login = await requestJson(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: batchEmail,
      password: batchPassword,
    }),
  });

  if (!login.response.ok || !login.payload?.token) {
    throw new Error(`Unable to authenticate batch operator: ${JSON.stringify(login.payload)}`);
  }

  return login.payload.token;
}

async function main() {
  const token = await authenticate();
  const list = await requestJson(`${apiBaseUrl}/lead-candidates?limit=20`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!list.response.ok) {
    throw new Error(`Unable to load candidates: ${JSON.stringify(list.payload)}`);
  }

  const enriched = [];
  for (const item of list.payload.items ?? []) {
    const detail = await requestJson(`${apiBaseUrl}/lead-candidates/${item.id}/intelligence`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (detail.response.ok) {
      enriched.push(detail.payload);
    }
  }

  const reportDir = path.join(rootDir, "output", "candidate-intelligence");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `intelligence-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(reportPath, JSON.stringify({ apiBaseUrl, total: enriched.length, enriched }, null, 2), "utf8");
  console.log(JSON.stringify({ reportPath, total: enriched.length }, null, 2));
}

await main();

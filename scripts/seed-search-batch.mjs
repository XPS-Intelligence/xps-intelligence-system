import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiBaseUrl = process.env.XPS_API_URL || "http://127.0.0.1:4000/api";
const seedFile = process.env.XPS_SEED_FILE || path.join(rootDir, "scripts", "seeds", "epoxy-overnight.json");
const batchEmail = process.env.XPS_BATCH_EMAIL || "playwright@xps.local";
const batchPassword = process.env.XPS_BATCH_PASSWORD || "changeme123";
const batchName = process.env.XPS_BATCH_NAME || "Playwright Operator";

async function requestJson(url, init) {
  const response = await fetch(url, init);
  let payload = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

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

  if (login.response.ok && login.payload?.token) {
    return login.payload.token;
  }

  const register = await requestJson(`${apiBaseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: batchEmail,
      password: batchPassword,
      full_name: batchName,
      role: "employee",
    }),
  });

  if (!register.response.ok || !register.payload?.token) {
    throw new Error(`Unable to authenticate batch operator: ${JSON.stringify(register.payload)}`);
  }

  return register.payload.token;
}

async function loadSeeds() {
  const raw = await fs.readFile(seedFile, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Seed file must contain an array: ${seedFile}`);
  }

  return parsed;
}

async function queueSeed(token, seed) {
  const queued = await requestJson(`${apiBaseUrl}/scrape/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(seed),
  });

  if (!queued.response.ok) {
    throw new Error(`Queue failed for ${seed.city}, ${seed.state}: ${JSON.stringify(queued.payload)}`);
  }

  return {
    city: seed.city,
    state: seed.state,
    industry: seed.industry,
    keyword: seed.keyword ?? "",
    jobId: queued.payload?.jobId ?? null,
    status: queued.payload?.status ?? "queued",
    queuedAt: new Date().toISOString(),
  };
}

async function main() {
  const token = await authenticate();
  const seeds = await loadSeeds();
  const queued = [];

  for (const seed of seeds) {
    queued.push(await queueSeed(token, seed));
  }

  const reportDir = path.join(rootDir, "output", "seed-runs");
  await fs.mkdir(reportDir, { recursive: true });

  const reportPath = path.join(reportDir, `queued-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await fs.writeFile(
    reportPath,
    JSON.stringify(
      {
        apiBaseUrl,
        seedFile,
        totalQueued: queued.length,
        queued,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(JSON.stringify({ reportPath, totalQueued: queued.length, queued }, null, 2));
}

await main();

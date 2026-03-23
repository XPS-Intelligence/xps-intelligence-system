import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiBaseUrl = process.env.XPS_API_URL || "http://127.0.0.1:4000/api";
const batchEmail = process.env.XPS_BATCH_EMAIL || "playwright@xps.local";
const batchPassword = process.env.XPS_BATCH_PASSWORD || "changeme123";

async function requestJson(url, init) {
  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    return {
      response: {
        ok: false,
        status: 0,
      },
      payload: {
        error: error instanceof Error ? error.message : "fetch_failed",
        url,
      },
    };
  }
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

async function fetchCandidateIntelligence(candidateId, token) {
  const writePaths = [
    `${apiBaseUrl}/lead-candidates/${candidateId}/enrich`,
    `${apiBaseUrl}/lead-candidates/${candidateId}/intelligence`,
  ];

  for (const url of writePaths) {
    const detail = await requestJson(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });

    if (detail.response.ok) {
      return { ...detail, persistence: "persisted" };
    }

    if (detail.response.status !== 404) {
      return { ...detail, persistence: "write_failed" };
    }
  }

  const fallback = await requestJson(`${apiBaseUrl}/lead-candidates/${candidateId}/intelligence`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return {
    ...fallback,
    persistence: fallback.response.ok ? "read_only_fallback" : "read_failed",
  };
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
  const coverage = {
    complete: 0,
    partial: 0,
    missing: 0,
  };
  const providerCounts = {};
  const providerReasonCounts = {};
  const persistenceCounts = {
    persisted: 0,
    read_only_fallback: 0,
    write_failed: 0,
    read_failed: 0,
  };
  const errors = [];
  let outreachDrafts = 0;
  for (const item of list.payload.items ?? []) {
    const detail = await fetchCandidateIntelligence(item.id, token);

    if (detail.response.ok) {
      const status = detail.payload?.item?.contact_coverage?.status;
      if (status && Object.prototype.hasOwnProperty.call(coverage, status)) {
        coverage[status] += 1;
      }

      const provider = detail.payload?.intelligence?.provider || "unknown";
      providerCounts[provider] = (providerCounts[provider] || 0) + 1;
      const providerReason = detail.payload?.intelligence?.provider_reason || "unknown";
      providerReasonCounts[providerReason] = (providerReasonCounts[providerReason] || 0) + 1;
      if (Object.prototype.hasOwnProperty.call(persistenceCounts, detail.persistence)) {
        persistenceCounts[detail.persistence] += 1;
      }
      outreachDrafts += Array.isArray(detail.payload?.outreach_channels) ? detail.payload.outreach_channels.length : 0;
      enriched.push({
        ...detail.payload,
        batch_persistence: detail.persistence,
      });
    } else {
      if (Object.prototype.hasOwnProperty.call(persistenceCounts, detail.persistence)) {
        persistenceCounts[detail.persistence] += 1;
      }
      errors.push({
        candidateId: item.id,
        persistence: detail.persistence,
        status: detail.response.status,
        error: detail.payload?.error || "unknown_error",
      });
    }
  }

  const reportDir = path.join(rootDir, "output", "candidate-intelligence");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `intelligence-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const summary = {
    apiBaseUrl,
    total: enriched.length,
    contactCoverage: coverage,
    providers: providerCounts,
    providerReasons: providerReasonCounts,
    persistence: persistenceCounts,
    errors: errors.length,
    outreachReady: enriched.filter((entry) => entry.item?.qualification_label === "ready_now").length,
    outreachDrafts,
    highestValueGap:
      persistenceCounts.read_only_fallback > 0 || persistenceCounts.write_failed > 0
        ? "Repair the POST lead-candidate enrichment route so overnight runs can persist intelligence and drafts again."
        : providerReasonCounts.ollama_unreachable
        ? "Dockerized API is still falling back because Ollama is unreachable from the runtime path."
        : coverage.missing > 0
        ? "Increase direct contact coverage for leads without any reachable channel."
        : coverage.partial > 0
          ? "Convert partial coverage leads into outreach-ready records with email or phone."
          : "Expand qualified volume while preserving current coverage quality.",
  };

  await fs.writeFile(reportPath, JSON.stringify({ summary, enriched, errors }, null, 2), "utf8");
  console.log(JSON.stringify({ reportPath, ...summary }, null, 2));
}

await main();

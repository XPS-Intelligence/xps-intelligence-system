import crypto from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { log } from "./logger.js";

export type SourceRegistryRow = {
  id: string;
  source_key: string;
};

export type WorkerLead = {
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  vertical?: string | null;
  location?: string | null;
  score?: number | null;
  raw_data?: Record<string, unknown> | null;
};

export type WorkerTask = {
  taskId?: string;
  crawl_job_id?: string;
  type?: "search" | "crawl" | "ingest" | "enrich" | "classify" | "score";
  mode?: "firecrawl" | "steel" | "auto";
  source_key?: string;
  source_name?: string;
  source_type?: string;
  city?: string;
  state?: string;
  industry?: string;
  keyword?: string;
  max_results?: number;
  url?: string;
  company_name?: string;
  query?: string;
  userId?: string;
  payload?: Record<string, unknown>;
};

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function normalizeDomain(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const url = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "");
  }
}

export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D+/g, "");
  return digits.length >= 10 ? digits : null;
}

export function hashPayload(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function ensureSourceRegistry(client: Pool | PoolClient, task: WorkerTask, fallbackType: string): Promise<SourceRegistryRow> {
  const sourceKey = task.source_key || `worker:${fallbackType}`;
  const sourceName = task.source_name || "XPS Worker";
  const allowedSourceTypes = new Set([
    "registry",
    "directory",
    "search_engine",
    "social",
    "procurement",
    "permit",
    "franchise",
    "marketplace",
    "api",
    "import",
    "webhook",
    "manual",
  ]);
  const sourceType = task.source_type && allowedSourceTypes.has(task.source_type)
    ? task.source_type
    : "api";

  const result = await client.query<SourceRegistryRow>(
    `INSERT INTO source_registry (source_key, source_name, source_type, acquisition_method, base_url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (source_key)
     DO UPDATE SET
       source_name = EXCLUDED.source_name,
       source_type = EXCLUDED.source_type,
       updated_at = NOW()
     RETURNING id, source_key`,
    [
      sourceKey,
      sourceName,
      sourceType,
      "manual",
      null,
      JSON.stringify({ worker: "apps/worker", fallbackType }),
    ]
  );

  return result.rows[0];
}

export async function resolveCompany(client: Pool | PoolClient, lead: WorkerLead, sourceId: string) {
  const companyName = lead.company_name.trim();
  const normalizedName = normalizeText(companyName);
  const domain = normalizeDomain(lead.website);
  const phone = normalizePhone(lead.phone);
  const [city, stateCode] = (lead.location || "").split(",").map((part) => part.trim());

  const existing = await client.query<{ id: string }>(
    `SELECT id
     FROM canonical_companies
     WHERE ($1::text IS NOT NULL AND primary_domain = $1)
        OR ($2::text IS NOT NULL AND primary_phone = $2)
        OR similarity(normalized_name, $3) > 0.75
     ORDER BY
       CASE WHEN primary_domain = $1 THEN 0 ELSE 1 END,
       CASE WHEN primary_phone = $2 THEN 0 ELSE 1 END,
       similarity(normalized_name, $3) DESC
     LIMIT 1`,
    [domain, phone, normalizedName]
  );

  if (existing.rows.length > 0) {
    const updated = await client.query<{ id: string }>(
      `UPDATE canonical_companies
       SET
         display_name = COALESCE($2, display_name),
         legal_name = COALESCE($3, legal_name),
         primary_domain = COALESCE($4, primary_domain),
         primary_phone = COALESCE($5, primary_phone),
         city = COALESCE(NULLIF($6, ''), city),
         state_code = COALESCE(NULLIF($7, ''), state_code),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [existing.rows[0].id, companyName, companyName, domain, phone, city ?? "", stateCode ?? ""]
    );
    return updated.rows[0].id;
  }

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO canonical_companies (
       legal_name, display_name, normalized_name, primary_domain, primary_phone,
       city, state_code, country_code, vertical, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      companyName,
      companyName,
      normalizedName,
      domain,
      phone,
      city || null,
      stateCode || null,
      "US",
      lead.vertical || null,
      JSON.stringify({ source_id: sourceId, worker: "apps/worker" }),
    ]
  );

  return inserted.rows[0].id;
}

export async function resolveContact(client: Pool | PoolClient, companyId: string, lead: WorkerLead) {
  const email = lead.email?.trim().toLowerCase() || null;
  const phone = normalizePhone(lead.phone);
  const normalizedName = lead.contact_name ? normalizeText(lead.contact_name) : null;

  if (email) {
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM canonical_contacts WHERE email = $1 LIMIT 1",
      [email]
    );
    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE canonical_contacts
         SET company_id = COALESCE(company_id, $2), updated_at = NOW()
         WHERE id = $1`,
        [existing.rows[0].id, companyId]
      );
      return existing.rows[0].id;
    }
  }

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO canonical_contacts (
       company_id, full_name, normalized_name, title, email, phone, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [
      companyId,
      lead.contact_name || null,
      normalizedName,
      null,
      email,
      phone,
      JSON.stringify({ worker: "apps/worker" }),
    ]
  );

  return inserted.rows[0].id;
}

export async function resolveAndPersistLead(
  client: Pool | PoolClient,
  sourceId: string,
  lead: WorkerLead,
  context: Record<string, unknown>
): Promise<void> {
  const rawHash = hashPayload({ lead, context });
  const companyId = await resolveCompany(client, lead, sourceId);
  const contactId = await resolveContact(client, companyId, lead);

  const rawObservation = await client.query<{ id: string }>(
    `INSERT INTO raw_source_observations (
       crawl_run_id, source_registry_id, source_record_key, source_url, source_title,
       content_hash, raw_payload, raw_text, capture_metadata, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (source_registry_id, content_hash)
     DO UPDATE SET metadata = raw_source_observations.metadata
     RETURNING id`,
    [
      context.crawlRunId,
      sourceId,
      lead.website || lead.email || lead.phone || lead.company_name,
      lead.website || null,
      lead.company_name,
      rawHash,
      JSON.stringify({ lead, context }),
      JSON.stringify(lead.raw_data ?? {}),
      JSON.stringify({ worker: "apps/worker", source: context.sourceKey }),
      JSON.stringify({ worker: "apps/worker" }),
    ]
  );

  const parsedObservation = await client.query<{ id: string }>(
     `INSERT INTO parsed_observations (
       raw_observation_id, parser_version, company_name, contact_name, email, phone,
       website, city, state_code, country_code, service_lines, keywords, social_urls,
       revenue_estimate_low, revenue_estimate_high, employee_estimate_low,
       employee_estimate_high, extracted_fields, confidence, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING id`,
    [
      rawObservation.rows[0].id,
      "apps-worker-v1",
      lead.company_name,
      lead.contact_name || null,
      lead.email || null,
      normalizePhone(lead.phone),
      lead.website || null,
      (lead.location || "").split(",")[0]?.trim() || null,
      (lead.location || "").split(",")[1]?.trim() || null,
      "US",
      [lead.vertical || "general"].filter(Boolean),
      [lead.vertical || "", lead.company_name].filter(Boolean),
      JSON.stringify({ website: lead.website || null }),
      null,
      null,
      null,
      null,
      JSON.stringify({ lead, context }),
      JSON.stringify({ score: lead.score ?? null }),
      JSON.stringify({ worker: "apps/worker" }),
    ]
  );

  const strategy = lead.email
    ? "email_exact"
    : lead.website
      ? "domain_exact"
      : lead.phone
        ? "phone_exact"
        : "fuzzy_name_geo";

  await client.query(
    `INSERT INTO entity_resolution_map (
       parsed_observation_id, company_id, contact_id, match_strategy, match_score,
       resolution_status, explanation, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      parsedObservation.rows[0].id,
      companyId,
      contactId,
      strategy,
      lead.score ? Math.min(1, Math.max(0, lead.score / 100)) : 0.75,
      "matched",
      "Resolved by worker canonical ingest pipeline",
      JSON.stringify({ worker: "apps/worker", source: context.sourceKey }),
    ]
  );

  const candidateResult = await client.query<{ id: string }>(
    `SELECT id
     FROM lead_candidates
     WHERE company_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [companyId]
  );

  let candidateId = candidateResult.rows[0]?.id;
  if (!candidateId) {
    const insertedCandidate = await client.query<{ id: string }>(
      `INSERT INTO lead_candidates (
         company_id, primary_contact_id, candidate_status, source_priority, market_segment,
         territory, metadata
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        companyId,
        contactId,
        "new",
        Math.max(1, Math.min(100, lead.score ?? 50)),
        lead.vertical || null,
        lead.location || null,
        JSON.stringify({ worker: "apps/worker", source: context.sourceKey, raw_observation_id: rawObservation.rows[0].id }),
      ]
    );
    candidateId = insertedCandidate.rows[0].id;
  } else {
    await client.query(
      `UPDATE lead_candidates
       SET
         primary_contact_id = COALESCE(primary_contact_id, $2),
         candidate_status = CASE
           WHEN candidate_status = 'rejected' THEN candidate_status
           WHEN $3::int >= 80 THEN 'scored'
           ELSE 'enriched'
         END,
         source_priority = GREATEST(source_priority, $3::int),
         market_segment = COALESCE(market_segment, $4),
         territory = COALESCE(territory, $5),
         updated_at = NOW()
       WHERE id = $1`,
      [candidateId, contactId, Math.max(1, Math.min(100, lead.score ?? 50)), lead.vertical || null, lead.location || null]
    );
  }

  await client.query(
    `INSERT INTO lead_scores (
       lead_candidate_id, scoring_model, scoring_version, total_score, subscores, reasoning, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      candidateId,
      "apps-worker-canonical-v1",
      "1.0.0",
      Math.max(0, Math.min(100, lead.score ?? 50)),
      JSON.stringify({
        fit: lead.score ?? 50,
        intent: lead.email ? 80 : 55,
        authority: lead.website ? 65 : 45,
        urgency: lead.score ? Math.min(100, lead.score) : 50,
      }),
      JSON.stringify({
        rationale: "Worker-generated score from source lead payload",
        source_hash: rawHash,
      }),
      JSON.stringify({ worker: "apps/worker", source: context.sourceKey }),
    ]
  );

  const recommendationType = (lead.score ?? 0) >= 85
    ? "outreach"
    : (lead.score ?? 0) >= 70
      ? "sync_crm"
      : "enrich_more";

  await client.query(
    `INSERT INTO recommendations (
       lead_candidate_id, recommendation_type, recommendation_rank, recommendation_payload,
       explanation, status, metadata
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      candidateId,
      recommendationType,
      1,
      JSON.stringify({
        company_name: lead.company_name,
        website: lead.website || null,
        email: lead.email || null,
        phone: lead.phone || null,
        source: context.sourceKey,
      }),
      "Generated by worker canonical ingest pipeline",
      "open",
      JSON.stringify({ worker: "apps/worker" }),
    ]
  );

  log.info("Lead canonicalized", {
    companyId,
    contactId,
    candidateId,
    sourceKey: context.sourceKey,
  });
}

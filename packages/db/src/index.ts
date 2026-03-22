export const canonicalIngestTables = [
  "source_registry",
  "seed_registry",
  "crawl_jobs",
  "crawl_runs",
  "raw_source_observations",
  "parsed_observations",
  "canonical_companies",
  "canonical_contacts",
  "entity_resolution_map",
  "lead_candidates",
  "lead_scores",
  "recommendations",
  "crm_leads",
  "hubspot_sync_events",
  "outreach_queue",
] as const;

export const dbConfig = {
  requiredEnv: ["DATABASE_URL"],
  canonicalIngestTables,
} as const;

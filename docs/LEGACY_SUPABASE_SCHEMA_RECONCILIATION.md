# Legacy Supabase Schema Reconciliation

## Purpose

This document captures how the legacy Supabase schema should be used inside the current XPS runtime.

It is a reference map only. The user explicitly warned that the supplied schema is not execution-safe, so it must not be run directly as a migration.

## Canonical rule

The active runtime model in `packages/db/schema.sql` remains the source of truth for the main ingest path:

`source_registry -> seed_registry -> crawl_jobs -> crawl_runs -> raw_source_observations -> parsed_observations -> canonical_companies/canonical_contacts -> lead_candidates -> lead_scores -> recommendations -> crm_leads -> hubspot_sync_events/outreach_queue`

Legacy tables are useful only if they:

1. fill a real missing domain
2. strengthen the current runtime
3. can be translated cleanly without reintroducing a weaker data model

## What maps cleanly

### Scraping and crawl lifecycle

Legacy tables:
- `scrape_jobs`
- `scrape_runs`
- `scrape_sources`
- `scrape_results_raw`
- `scrape_parsed_items`
- `browser_sessions`
- `browser_session_events`
- `page_snapshots`

Current canonical equivalents:
- `crawl_jobs`
- `crawl_runs`
- `source_registry`
- `raw_source_observations`
- `parsed_observations`

Action:
- keep the current canonical ingest model
- selectively add browser/session evidence tables later if the per-user Playwright workspace needs durable replay, audit, or artifact capture

### Lead and company intelligence

Legacy tables:
- `contractors`
- `contacts`
- `lead_scores`
- `outreach_logs`
- `leads`
- `leads_normalized`
- `evidence_artifacts`

Current canonical equivalents:
- `canonical_companies`
- `canonical_contacts`
- `lead_candidates`
- `lead_scores`
- `recommendations`
- `crm_leads`
- `outreach_queue`

Action:
- treat `contractors` as a legacy precursor to `canonical_companies`
- treat `contacts` as a legacy precursor to `canonical_contacts`
- do not restore `leads` / `leads_normalized` as parallel truth tables
- add an `evidence_artifacts`-style table later only if artifact provenance needs to be queryable beyond raw observations

### Auth and user/role system

Legacy tables:
- `admin_users`
- `profiles`
- `operator_profiles`
- `organization_memberships`
- `organization_users`
- `roles`
- `role_permissions`
- `features`
- `notifications`

Current canonical equivalents:
- `app_users`
- `organizations`
- app-owned role field and user settings/profile fields

Action:
- keep `app_users` as the primary auth/runtime user table
- use the legacy role/feature tables as design reference for future expansion:
  - richer RBAC
  - feature flags
  - notifications
  - operator profile extensions
- do not split auth truth across `admin_users` and `app_users`

### Integrations and settings

Legacy tables:
- `integrations`
- `settings`
- `settings_groups`
- `settings_kv`
- `tenant_config`
- `ai_providers`
- `ai_model_configs`
- `ai_outputs`
- `hubspot_jobs`

Current canonical equivalents:
- runtime env vars
- integration manifests
- `hubspot_sync_events`
- model routing config in app settings/docs

Action:
- use these as reference for the future admin settings/config layer
- avoid building multiple overlapping key-value stores
- prefer one governed config model with clear separation between:
  - secrets in env/platform
  - tenant settings in Postgres
  - provider metadata in explicit typed tables

### Knowledge and embeddings

Legacy tables:
- `knowledge_sources`
- `knowledge_embeddings`
- `embedding_jobs`
- `embedding_chunks`
- `vector_metadata`

Current canonical home:
- `xps-intel` for the domain library
- optional runtime retrieval support in `xps-intelligence-system`

Action:
- do not add these blindly to the runtime DB yet
- first decide whether embeddings live:
  - in runtime Postgres with pgvector
  - in a dedicated vector store
  - or in `xps-intel` packaging and retrieval services

## What should stay legacy-only for now

These tables should not be pulled into the runtime unless a concrete feature requires them:

- `payments`
- `promotions`
- `metrics_snapshots`
- `metrics_snapshots_v2`
- `activities`
- `assignment_rules`
- `file_records`
- `industries`

They may become useful later, but they are not required to stabilize the current production path.

## Recommended next adoption order

If we promote anything from the legacy schema into the runtime, the strongest order is:

1. browser/session evidence tables for the scraper and admin replay path
2. notifications table for proactive assistant/system alerts
3. feature flag table to complement role-aware UI
4. explicit integrations/provider tables for admin-managed connectors
5. typed tenant config model

## Rules for future migrations

1. Never execute the legacy schema directly
2. Never create duplicate truth tables beside the canonical model
3. Prefer migration-by-translation, not migration-by-copy
4. If adopting a legacy concept, rename it into the canonical XPS vocabulary
5. Update this document and `packages/db/README.md` whenever a legacy domain becomes canonical

## Current conclusion

Yes, the Supabase schema is useful.

It should be used as:
- a domain inventory
- a missing-capability checklist
- a migration reference

It should not be used as:
- an authoritative runtime schema
- a direct SQL migration
- a reason to revert to the older data model

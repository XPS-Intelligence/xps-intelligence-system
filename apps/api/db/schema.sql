-- Canonical XPS ingest foundation
-- Keep this file mirrored with the first Supabase migration.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.source_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_key TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (
    source_type IN ('registry', 'directory', 'search_engine', 'social', 'procurement', 'permit', 'franchise', 'marketplace', 'api', 'import', 'webhook', 'manual')
  ),
  jurisdiction TEXT,
  country_code TEXT,
  state_code TEXT,
  base_url TEXT,
  acquisition_method TEXT NOT NULL CHECK (
    acquisition_method IN ('api', 'scrape', 'search', 'import', 'webhook', 'manual')
  ),
  trust_tier INTEGER NOT NULL DEFAULT 3 CHECK (trust_tier BETWEEN 1 AND 5),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.seed_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seed_type TEXT NOT NULL CHECK (
    seed_type IN ('keyword', 'company_name', 'domain', 'geo', 'registry_query', 'permit_query', 'bid_query', 'social_query', 'source_constraint')
  ),
  seed_value TEXT NOT NULL,
  normalized_seed_value TEXT NOT NULL,
  vertical TEXT,
  subvertical TEXT,
  geography JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS seed_registry_unique_idx
  ON public.seed_registry (seed_type, normalized_seed_value, COALESCE(vertical, ''), COALESCE(subvertical, ''));
CREATE INDEX IF NOT EXISTS seed_registry_active_idx ON public.seed_registry (active, priority DESC);
CREATE INDEX IF NOT EXISTS seed_registry_type_idx ON public.seed_registry (seed_type);

CREATE TABLE IF NOT EXISTS public.crawl_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL CHECK (
    job_type IN ('search', 'crawl', 'ingest', 'enrich', 'classify', 'score')
  ),
  requested_by UUID,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  source_registry_id UUID REFERENCES public.source_registry(id) ON DELETE SET NULL,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_profile TEXT NOT NULL DEFAULT 'standard' CHECK (
    execution_profile IN ('lite', 'standard', 'enterprise')
  ),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crawl_jobs_status_idx ON public.crawl_jobs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS crawl_jobs_source_idx ON public.crawl_jobs (source_registry_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crawl_jobs_type_idx ON public.crawl_jobs (job_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crawl_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crawl_job_id UUID NOT NULL REFERENCES public.crawl_jobs(id) ON DELETE CASCADE,
  run_number INTEGER NOT NULL DEFAULT 1 CHECK (run_number > 0),
  runner_type TEXT NOT NULL CHECK (
    runner_type IN ('firecrawl', 'search_engine', 'playwright', 'manual_import', 'worker', 'hybrid')
  ),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_count INTEGER NOT NULL DEFAULT 0 CHECK (fetched_count >= 0),
  parsed_count INTEGER NOT NULL DEFAULT 0 CHECK (parsed_count >= 0),
  error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crawl_runs_job_run_idx ON public.crawl_runs (crawl_job_id, run_number);
CREATE INDEX IF NOT EXISTS crawl_runs_status_idx ON public.crawl_runs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS crawl_runs_job_idx ON public.crawl_runs (crawl_job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.raw_source_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crawl_run_id UUID NOT NULL REFERENCES public.crawl_runs(id) ON DELETE CASCADE,
  source_registry_id UUID NOT NULL REFERENCES public.source_registry(id) ON DELETE RESTRICT,
  source_record_key TEXT,
  source_url TEXT,
  source_title TEXT,
  observed_at TIMESTAMPTZ,
  content_hash TEXT NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_text TEXT,
  capture_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS raw_source_observations_hash_idx
  ON public.raw_source_observations (source_registry_id, content_hash);
CREATE INDEX IF NOT EXISTS raw_source_observations_run_idx ON public.raw_source_observations (crawl_run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS raw_source_observations_key_idx ON public.raw_source_observations (source_record_key);
CREATE INDEX IF NOT EXISTS raw_source_observations_url_idx ON public.raw_source_observations (source_url);

CREATE TABLE IF NOT EXISTS public.parsed_observations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_observation_id UUID NOT NULL REFERENCES public.raw_source_observations(id) ON DELETE CASCADE,
  parser_version TEXT NOT NULL,
  company_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address_line1 TEXT,
  city TEXT,
  state_code TEXT,
  postal_code TEXT,
  country_code TEXT,
  service_lines TEXT[] NOT NULL DEFAULT '{}'::text[],
  keywords TEXT[] NOT NULL DEFAULT '{}'::text[],
  social_urls JSONB NOT NULL DEFAULT '{}'::jsonb,
  revenue_estimate_low NUMERIC(12,2),
  revenue_estimate_high NUMERIC(12,2),
  employee_estimate_low INTEGER,
  employee_estimate_high INTEGER,
  extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS parsed_observations_raw_parser_idx
  ON public.parsed_observations (raw_observation_id, parser_version);
CREATE INDEX IF NOT EXISTS parsed_observations_company_idx ON public.parsed_observations (company_name);
CREATE INDEX IF NOT EXISTS parsed_observations_contact_idx ON public.parsed_observations (contact_name);
CREATE INDEX IF NOT EXISTS parsed_observations_email_idx ON public.parsed_observations (email);
CREATE INDEX IF NOT EXISTS parsed_observations_phone_idx ON public.parsed_observations (phone);

CREATE TABLE IF NOT EXISTS public.canonical_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name TEXT,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  primary_domain TEXT,
  primary_phone TEXT,
  address JSONB NOT NULL DEFAULT '{}'::jsonb,
  city TEXT,
  state_code TEXT,
  postal_code TEXT,
  country_code TEXT,
  business_status TEXT,
  vertical TEXT,
  subvertical TEXT,
  franchise_flag BOOLEAN NOT NULL DEFAULT FALSE,
  training_flag BOOLEAN NOT NULL DEFAULT FALSE,
  distributor_flag BOOLEAN NOT NULL DEFAULT FALSE,
  manufacturer_flag BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS canonical_companies_name_idx ON public.canonical_companies (normalized_name);
CREATE INDEX IF NOT EXISTS canonical_companies_domain_idx ON public.canonical_companies (primary_domain);
CREATE INDEX IF NOT EXISTS canonical_companies_phone_idx ON public.canonical_companies (primary_phone);
CREATE INDEX IF NOT EXISTS canonical_companies_location_idx ON public.canonical_companies (state_code, city);
CREATE INDEX IF NOT EXISTS canonical_companies_name_trgm_idx
  ON public.canonical_companies USING gin (normalized_name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.canonical_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.canonical_companies(id) ON DELETE SET NULL,
  full_name TEXT,
  normalized_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  role_confidence NUMERIC(5,4),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS canonical_contacts_company_idx ON public.canonical_contacts (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS canonical_contacts_email_idx ON public.canonical_contacts (email);
CREATE INDEX IF NOT EXISTS canonical_contacts_phone_idx ON public.canonical_contacts (phone);
CREATE INDEX IF NOT EXISTS canonical_contacts_name_idx ON public.canonical_contacts (normalized_name);
CREATE UNIQUE INDEX IF NOT EXISTS canonical_contacts_email_unique_idx
  ON public.canonical_contacts (email)
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.entity_resolution_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parsed_observation_id UUID NOT NULL REFERENCES public.parsed_observations(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.canonical_companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.canonical_contacts(id) ON DELETE CASCADE,
  match_strategy TEXT NOT NULL CHECK (
    match_strategy IN ('email_exact', 'domain_exact', 'phone_exact', 'registry_exact', 'fuzzy_name_geo', 'manual')
  ),
  match_score NUMERIC(5,4) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  resolution_status TEXT NOT NULL CHECK (
    resolution_status IN ('matched', 'merged', 'ambiguous', 'new_entity')
  ),
  explanation TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS entity_resolution_map_parsed_idx ON public.entity_resolution_map (parsed_observation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entity_resolution_map_company_idx ON public.entity_resolution_map (company_id);
CREATE INDEX IF NOT EXISTS entity_resolution_map_contact_idx ON public.entity_resolution_map (contact_id);
CREATE INDEX IF NOT EXISTS entity_resolution_map_status_idx ON public.entity_resolution_map (resolution_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.lead_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.canonical_companies(id) ON DELETE CASCADE,
  primary_contact_id UUID REFERENCES public.canonical_contacts(id) ON DELETE SET NULL,
  candidate_status TEXT NOT NULL DEFAULT 'new' CHECK (
    candidate_status IN ('new', 'enriched', 'scored', 'approved', 'rejected', 'activated')
  ),
  source_priority INTEGER NOT NULL DEFAULT 50 CHECK (source_priority BETWEEN 0 AND 100),
  market_segment TEXT,
  territory TEXT,
  assigned_rep_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_candidates_company_idx ON public.lead_candidates (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_candidates_contact_idx ON public.lead_candidates (primary_contact_id);
CREATE INDEX IF NOT EXISTS lead_candidates_status_idx ON public.lead_candidates (candidate_status, source_priority DESC);
CREATE INDEX IF NOT EXISTS lead_candidates_territory_idx ON public.lead_candidates (territory);

CREATE TABLE IF NOT EXISTS public.lead_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_candidate_id UUID NOT NULL REFERENCES public.lead_candidates(id) ON DELETE CASCADE,
  scoring_model TEXT NOT NULL,
  scoring_version TEXT NOT NULL,
  total_score NUMERIC(5,2) NOT NULL CHECK (total_score >= 0 AND total_score <= 100),
  subscores JSONB NOT NULL DEFAULT '{}'::jsonb,
  reasoning JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lead_scores_candidate_idx ON public.lead_scores (lead_candidate_id, scored_at DESC);
CREATE INDEX IF NOT EXISTS lead_scores_total_idx ON public.lead_scores (total_score DESC, scored_at DESC);

CREATE TABLE IF NOT EXISTS public.recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_candidate_id UUID NOT NULL REFERENCES public.lead_candidates(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (
    recommendation_type IN ('outreach', 'defer', 'enrich_more', 'route_manager', 'sync_crm', 'exclude')
  ),
  recommendation_rank INTEGER NOT NULL DEFAULT 1 CHECK (recommendation_rank > 0),
  recommendation_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'accepted', 'dismissed', 'executed')
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS recommendations_candidate_idx ON public.recommendations (lead_candidate_id, recommendation_rank);
CREATE INDEX IF NOT EXISTS recommendations_status_idx ON public.recommendations (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_candidate_id UUID NOT NULL UNIQUE REFERENCES public.lead_candidates(id) ON DELETE CASCADE,
  crm_system TEXT NOT NULL DEFAULT 'hubspot',
  crm_record_id TEXT,
  lifecycle_stage TEXT,
  pipeline_stage TEXT,
  owner_id UUID,
  synced_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_record_unique_idx
  ON public.crm_leads (crm_system, crm_record_id)
  WHERE crm_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_leads_owner_idx ON public.crm_leads (owner_id);
CREATE INDEX IF NOT EXISTS crm_leads_stage_idx ON public.crm_leads (pipeline_stage, lifecycle_stage);

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (
    role IN ('employee', 'manager', 'owner', 'admin')
  ),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  job_title TEXT,
  territory TEXT,
  autonomy_mode TEXT NOT NULL DEFAULT 'hybrid' CHECK (
    autonomy_mode IN ('minimal', 'hybrid', 'full')
  ),
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  assistant_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_users_role_idx ON public.app_users (role, created_at DESC);
CREATE INDEX IF NOT EXISTS app_users_org_idx ON public.app_users (organization_id, role);

DROP TRIGGER IF EXISTS organizations_set_updated_at ON public.organizations;
CREATE TRIGGER organizations_set_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS app_users_set_updated_at ON public.app_users;
CREATE TRIGGER app_users_set_updated_at
BEFORE UPDATE ON public.app_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.hubspot_sync_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crm_lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  sync_direction TEXT NOT NULL CHECK (sync_direction IN ('outbound', 'inbound')),
  event_type TEXT NOT NULL CHECK (event_type IN ('create', 'update', 'associate', 'note', 'task')),
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'synced', 'failed', 'retrying')
  ),
  error_message TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hubspot_sync_events_lead_idx ON public.hubspot_sync_events (crm_lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hubspot_sync_events_status_idx ON public.hubspot_sync_events (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.outreach_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_candidate_id UUID NOT NULL REFERENCES public.lead_candidates(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'call', 'linkedin')),
  sequence_name TEXT,
  step_number INTEGER NOT NULL DEFAULT 1 CHECK (step_number > 0),
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'sent', 'failed', 'cancelled')
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS outreach_queue_candidate_idx ON public.outreach_queue (lead_candidate_id, step_number);
CREATE INDEX IF NOT EXISTS outreach_queue_status_idx ON public.outreach_queue (status, scheduled_for NULLS FIRST, created_at DESC);
CREATE INDEX IF NOT EXISTS outreach_queue_schedule_idx ON public.outreach_queue (scheduled_for);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'source_registry',
      'seed_registry',
      'crawl_jobs',
      'crawl_runs',
      'canonical_contacts',
      'lead_candidates',
      'recommendations',
      'crm_leads',
      'hubspot_sync_events',
      'outreach_queue'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name
    );
  END LOOP;
END $$;

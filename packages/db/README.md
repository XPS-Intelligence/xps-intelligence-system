# packages/db

Owns the canonical ingest foundation for XPS.

The main contract is `schema.sql`, mirrored by `supabase/migrations/20260322120000_canonical_ingest_baseline.sql`.
It defines the raw-to-parsed-to-canonical-to-activation path used by the host runtime.

## Legacy schema intake

Legacy Supabase schemas should be treated as reference inputs, not blind migrations.
Before adopting any legacy table or column:

1. Map it to the current canonical flow in `schema.sql`
2. Decide whether it belongs in:
   - canonical ingest/runtime (`packages/db/schema.sql`)
   - integration-specific storage
   - admin/ops configuration
   - historical archive only
3. Prefer translation into the newer canonical entities over preserving legacy naming

The current reconciliation artifact is:
- `docs/LEGACY_SUPABASE_SCHEMA_RECONCILIATION.md`

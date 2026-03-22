# packages/db

Owns the canonical ingest foundation for XPS.

The main contract is `schema.sql`, mirrored by `supabase/migrations/20260322120000_canonical_ingest_baseline.sql`.
It defines the raw-to-parsed-to-canonical-to-activation path used by the host runtime.

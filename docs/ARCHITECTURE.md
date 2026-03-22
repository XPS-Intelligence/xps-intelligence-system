# Architecture

## Runtime structure
- apps/web = live frontend
- apps/api = live backend API
- apps/worker = background jobs
- packages/shared = contracts and shared logic
- packages/db = schema and migrations
- packages/adapters = source adapters
- packages/prompts = prompt registry
- packages/agents = agent logic

## Runtime planes
- Railway = runtime
- Supabase/Postgres = data
- Redis = queue/cache
- HubSpot = CRM action layer

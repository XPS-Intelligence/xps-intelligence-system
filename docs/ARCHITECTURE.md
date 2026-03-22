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
- Postgres = relational truth
- Redis = queue/cache
- HubSpot = CRM action layer

## Role in the ecosystem
- `xps-intel` is the domain substrate
- `xps-distallation-system` is the strict truth and validation layer
- `xps-intelligence-system` is the operational runtime
- admin control plane is the operator cockpit

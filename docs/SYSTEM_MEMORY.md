# XPS Intelligence System Memory

## Purpose
This file is the durable runtime memory for the host application.

## Host decision
`xps-intelligence-system` is the canonical runtime host for the internal XPS Intelligence platform.

## Runtime shape
- `apps/web` = Next.js frontend
- `apps/api` = live API
- `apps/worker` = async worker
- `packages/db` = canonical schema
- `packages/adapters` = governed source connectors
- `packages/prompts` = prompt library
- `packages/agents` = assistant logic

## Current local runtime
- web: `http://localhost:3000`
- api: `http://localhost:4000`
- postgres: `localhost:55433`
- redis: `localhost:56380`

## Dependency chain
`source adapters -> xps-distallation-system -> xps-intel -> xps-intelligence-system`

## Product targets
- employee page
- manager page
- owner page
- admin control page
- lead summary
- validation
- scoring
- recommendation
- proactive assistant messaging
- editable frontend and editor surface

## Current near-term priorities
1. Railway-first auth and role model
2. role workspace implementation
3. admin control plane and editor integration
4. lead intelligence and recommendation hardening
5. CI/CD and postdeploy smoke

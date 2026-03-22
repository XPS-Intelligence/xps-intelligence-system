# XPS Intelligence System — Copilot Instructions

You are working in the `xps-intelligence-system` repository.

## Required reading before changes
1. Read the repo wiki Home page.
2. Read this file.
3. Read `docs/SYSTEM_MEMORY.md`.
4. Inspect the current repository structure before changing anything substantial.

## Repository role
This is the live runtime host for the XPS Intelligence platform.

It owns:
- frontend application
- API surface
- worker system
- role workspaces
- lead operations runtime
- assistant runtime integration

## Rules
- No mock production data.
- No fake completions.
- No undocumented production writes.
- No direct raw scrape writes into activation-stage records.
- Fail loudly on missing dependencies.
- Keep docs aligned with implementation.

## Memory rule
If runtime truth changes, update:
- `C:\XPS\AGENTS.md`
- `docs/SYSTEM_MEMORY.md`
- impacted environment, deployment, or testing docs

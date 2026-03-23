# Testing

## Required suites
- unit
- integration
- contract
- smoke
- postdeploy verify
- headful validation with screenshots, video, and trace artifacts

## Required gates
- typecheck
- lint
- build
- test
- smoke

## Current validation commands
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:e2e`
- `pnpm benchmark:e2e`
- `pnpm smoke:postdeploy`
- `pnpm validate:headful`

## Headful artifacts
- screenshots, recorded video, and trace files are written under `output/playwright/headful`

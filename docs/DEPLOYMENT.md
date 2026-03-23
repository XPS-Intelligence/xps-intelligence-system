# Deployment

## Local
- `pnpm docker:up` launches the full runtime stack:
  - `postgres`
  - `redis`
  - `migrate`
  - `api`
  - `worker`
  - `web`
- `pnpm docker:down` stops the full stack
- `pnpm docker:logs` tails the active stack logs
- local Docker uses internal service hostnames and `DATABASE_SSL_MODE=disable`

## Railway
- `apps/web` deploys with `apps/web/Dockerfile` and `apps/web/railway.json`
- `apps/api` deploys with `apps/api/Dockerfile` and `apps/api/railway.json`
- `apps/worker` deploys with `apps/worker/Dockerfile` and `apps/worker/railway.json`
- set `DATABASE_SSL_MODE=require` only when the Railway database endpoint requires TLS
- keep `APP_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_SITE_URL` aligned with deployed hostnames

## CI/CD
GitHub Actions -> required checks -> Railway deploy -> postdeploy smoke

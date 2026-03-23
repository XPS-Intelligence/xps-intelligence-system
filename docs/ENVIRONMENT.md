# Environment

## Local runtime
- Docker Compose is the canonical local runtime for the active host stack
- published ports:
  - web: `http://localhost:3000`
  - api: `http://localhost:4000`
  - postgres: `localhost:55433`
  - redis: `localhost:56380`

## Variables
See `.env.example` and `.env.local.example`

## Critical runtime env
- `DATABASE_URL`
- `DATABASE_SSL_MODE`
- `REDIS_URL`
- `APP_URL`
- `CORS_ORIGINS`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`
- `JWT_SECRET`

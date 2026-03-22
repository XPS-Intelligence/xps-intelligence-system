# Deployment

## Local
- develop against local Postgres/Redis first
- keep Ollama optional until healthy

## Railway
- apps/web
- apps/api
- apps/worker

## CI/CD
GitHub Actions -> required checks -> Railway deploy -> postdeploy smoke

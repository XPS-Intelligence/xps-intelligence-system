# Model Routing

## Routing doctrine
- use Ollama for continuous local inhalation, extraction, normalization, and nightly refresh
- use Groq for latency-sensitive cloud summaries, rep-facing recommendations, and interactive assistant responses
- route by task, not by hype
- enforce daily and per-workflow cost ceilings

## Initial local tiers
- small extractor
- medium validator or classifier
- larger strategist or nightly synthesizer

## Initial cloud tiers
- fast summary and recommendation model
- stronger fallback reasoning model

## Guardrails
- record model used per decision
- allow rollback of model routing policy
- require eval approval before changing default routing

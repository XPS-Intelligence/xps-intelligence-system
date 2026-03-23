# XPS Frontend Page Map

## Purpose
Track the donor-to-host migration from `xps-intelligence-system-v.5` into the canonical Next.js runtime in `xps-intelligence-system`.

## Shell model
- public marketing shell
- auth shell
- unified application shell
- admin control plane

## Auth pages
- `/login`
- `/onboarding`

## Core application pages
- `/dashboard`
- `/crm`
- `/leads`
- `/ai-assistant`
- `/research`
- `/scraper`
- `/outreach`
- `/proposals`
- `/analytics`

## Intelligence pages
- `/knowledge`
- `/competition`
- `/connectors`
- `/intelligence`

## Role-specific pages
- `/manager`
- `/owner`
- `/sales-staff`
- `/sales-flow`

## System pages
- `/admin`
- `/settings`

## Migration rule
- preserve the `v.5` visual language
- normalize into one Next.js host shell
- same shell for all users
- role and feature toggles control capability exposure

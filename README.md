# WorkLog Platform

> Automated daily activity reporting for engineering teams.

Auto-collects activity from Google Calendar, GitHub, and Slack. Presents a daily confirmation dashboard. Exports to Excel in the team's existing worklog format.

---

## Quick Navigation

| Document | Purpose |
|---|---|
| [`CONTEXT.md`](./CONTEXT.md) | Problem statement, worklog format, user journey, integration specs |
| [`architecture/TECHNICAL_DESIGN.md`](./architecture/TECHNICAL_DESIGN.md) | Tech stack, DB schema, API routes, sync architecture |
| [`docs/FEATURES.md`](./docs/FEATURES.md) | Feature-by-feature specification with scenarios and acceptance criteria |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Phased development plan with milestones and tasks |
| [`docs/AI_AGENT_BRIEF.md`](./docs/AI_AGENT_BRIEF.md) | Briefing document for AI coding agents starting a new session |

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API routes, Prisma ORM, PostgreSQL
- **Background jobs:** BullMQ + Redis
- **Auth:** NextAuth.js v5 (Google + GitHub OAuth)
- **AI:** Anthropic Claude API
- **Export:** ExcelJS

---

## Current Status

> See [`docs/ROADMAP.md`](./docs/ROADMAP.md) for the full plan.

**Phase 1 — MVP** not yet started.

---

## Worklog Format Reference

The export must match this column structure exactly:

| Name | Category | Date | Time | Comments | Other |
|---|---|---|---|---|---|
| Alejandro Vásquez | New Feature/Enhancements | 2024-01-15 | 2.5 | PR Created \| trashie-api: Add QR validation | |

**Categories:** Administration · Engineering Operations · New Feature/Enhancements · Production Support

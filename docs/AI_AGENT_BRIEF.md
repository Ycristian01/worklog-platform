# WorkLog Platform — AI Agent Development Brief

> **Purpose:** This document is the prompt/briefing for an AI coding agent (Claude Code or similar) to pick up development of this project from scratch or from any milestone. Paste this into a new session along with `CONTEXT.md` and `TECHNICAL_DESIGN.md` to bootstrap a fully-informed agent.

---

## Project Summary

You are building **WorkLog Platform**, a web application that helps a small software engineering team automatically generate their daily activity reports by aggregating signals from Google Calendar, GitHub, and Slack, presenting draft entries on a dashboard, and allowing users to confirm/edit before exporting to Excel.

The project has a detailed context document at `CONTEXT.md` and a technical design at `architecture/TECHNICAL_DESIGN.md`. Read both before writing any code.

---

## Development Principles

1. **TypeScript everywhere.** Both frontend and backend must use TypeScript with strict mode enabled.
2. **Zod for validation.** All API input must be validated with Zod schemas. Share schemas between client and server.
3. **Prisma for all DB access.** No raw SQL except in migrations. Use Prisma transactions for multi-step writes.
4. **BullMQ for background jobs.** Integration syncs run in background workers, never in API routes.
5. **NextAuth.js for auth.** Use the v5 App Router pattern. Every API route must verify session.
6. **shadcn/ui for components.** Use the existing component library before building custom components.
7. **Test critical paths.** At minimum: entry CRUD, sync deduplication, Excel export column fidelity.
8. **Security first.** Encrypt OAuth tokens at rest. Validate user owns every resource they access. Never store raw Slack messages.

---

## Starting Point for a New Session

When starting a new coding session, the agent should:

1. Read `CONTEXT.md` to understand the problem domain and worklog format.
2. Read `architecture/TECHNICAL_DESIGN.md` to understand the full technical stack.
3. Read `docs/FEATURES.md` to understand each feature's behavior and acceptance criteria.
4. Read `docs/ROADMAP.md` to find the **current phase and milestone** to work on.
5. Check if a `src/` or `app/` directory exists to understand current project state.
6. If starting from scratch, begin with Milestone 1.1 (scaffolding).

---

## Implementation Guidance by Area

### Database
- Schema is defined in `architecture/TECHNICAL_DESIGN.md` §3. Implement exactly as specified.
- Run `prisma migrate dev` for every schema change.
- Seed categories: `Administration`, `Engineering Operations`, `New Feature/Enhancements`, `Production Support`.

### Authentication
- Use `NextAuth.js v5` with App Router.
- Google provider must request `calendar.readonly` scope (for Calendar integration).
- GitHub provider must request `read:user, repo` scopes.
- Store provider tokens in the `integrations` table (not in NextAuth session), encrypted.

### Integration Syncs
- Each sync is a BullMQ job that receives `{ userId, provider }`.
- Use `signal.external_id` + `provider` for deduplication.
- After inserting signals, call `createDraftEntries(userId, date, newSignals)`.
- Wrap signal insert + entry creation in a Prisma transaction.

### Excel Export
- Use `exceljs` library.
- Column order must exactly match: Name, Category, Date, Time, Comments, Other.
- Dates must be formatted as `YYYY-MM-DD` strings (not Excel serial numbers) for readability.
- Only export entries with status `submitted`.

### AI Integration
- Use `@anthropic-ai/sdk` with model `claude-sonnet-4-6`.
- All AI calls must have a timeout (15s) and a fallback.
- Never pass raw message content to Claude without the user's Slack integration being explicitly configured with AI summarization enabled.
- AI suggestions are advisory only — never auto-apply.

---

## Environment Variables

```bash
# App
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/worklog

# Redis
REDIS_URL=redis://localhost:6379

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Slack OAuth
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=

# Jira (optional)
JIRA_CLIENT_ID=
JIRA_CLIENT_SECRET=

# Claude API
ANTHROPIC_API_KEY=

# Token encryption
ENCRYPTION_KEY=  # 32-byte hex string

# App config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Common Gotchas

- **Excel date format:** The source worklog stores dates as Excel serial numbers (days since 1899-12-30). When importing existing data, convert with: `new Date(Date.UTC(1899, 11, 30) + serialDate * 86400000)`. When exporting, use a formatted date string or let ExcelJS handle the conversion.
- **GitHub personal commits:** GitHub's API returns commits across all branches. Filter to the default branch or deduplicate by SHA.
- **Google Calendar multi-user:** Each user connects their own Google account. The sync job must use the per-user OAuth token, not a service account.
- **Slack rate limits:** Slack API tier 3 allows 50 req/min per workspace. Implement exponential backoff.
- **BullMQ concurrency:** Set worker concurrency to match your DB connection pool size. Default: `concurrency: 5`.
- **NextAuth v5 + App Router:** Use `auth()` from `next-auth` in Server Components. Use `useSession()` in Client Components. API routes use `auth()` too.

---

## Testing Checklist (Before Any Release)

- [ ] Login with Google works in a fresh browser session.
- [ ] Google Calendar sync imports today's events as draft entries.
- [ ] GitHub sync imports today's PRs and commits as draft entries.
- [ ] Manual entry creation validates required fields.
- [ ] Confirming all entries enables "Submit Day" button.
- [ ] Submitting a day locks entries to read-only.
- [ ] Excel export downloads a file with correct columns and data.
- [ ] Two sync runs for the same day do not create duplicate entries.
- [ ] Unauthorized user cannot access another user's entries via API.

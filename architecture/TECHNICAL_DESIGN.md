# WorkLog Platform — Technical Design

---

## 1. Technology Stack

### Frontend
| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR for fast initial load, API routes for BFF pattern, great DX |
| Language | **TypeScript** | Type safety across the whole stack |
| Styling | **Tailwind CSS** + **shadcn/ui** | Fast, consistent UI with accessible components |
| State management | **Zustand** + **TanStack Query** | Local UI state + server state/cache management |
| Forms | **React Hook Form** + **Zod** | Schema validation shared with backend |
| Tables | **TanStack Table** | Flexible data grid for the worklog review table |
| Date/time | **date-fns** | Lightweight, tree-shakeable |
| Charts | **Recharts** | Summary dashboards |

### Backend
| Layer | Choice | Rationale |
|---|---|---|
| Runtime | **Node.js 20** | Same language as frontend; large ecosystem |
| API | **Next.js API Routes** (or separate **Express/Fastify** app) | Start monolithic, extract if needed |
| ORM | **Prisma** | Type-safe DB access; great migration tooling |
| Database | **PostgreSQL** | Relational; great for time-series queries; pivot-friendly |
| Queue / Background jobs | **BullMQ** + **Redis** | Integration sync jobs run in background |
| Caching | **Redis** | Integration token storage, job queues |
| Auth | **NextAuth.js v5** | OAuth 2.0; supports Google, GitHub; session management |

### AI
| Layer | Choice |
|---|---|
| LLM | **Claude API** (`claude-sonnet-4-6`) |
| Use cases | Slack summarization, category inference, time estimate suggestions, gap filling |

### Infrastructure (self-hosted / simple)
| Component | Choice |
|---|---|
| Deployment | **Docker Compose** (dev + prod) |
| DB hosting | **Supabase** (managed Postgres) or self-hosted |
| File storage | Local filesystem or **Supabase Storage** for Excel exports |
| Reverse proxy | **Caddy** (auto-HTTPS) |
| CI/CD | **GitHub Actions** |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / Client                         │
│                     (Next.js React App)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│                    Next.js Application Server                    │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│  │  App Router │  │  API Routes   │  │   NextAuth.js        │  │
│  │  (Pages/UI) │  │  (/api/*)     │  │   (OAuth sessions)   │  │
│  └─────────────┘  └───────┬───────┘  └──────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼───────────────────┐
          │                │                   │
┌─────────▼──────┐  ┌──────▼──────┐  ┌────────▼────────┐
│  PostgreSQL DB │  │    Redis     │  │  Claude API     │
│  (Prisma ORM)  │  │  (BullMQ +  │  │  (Summarization │
│                │  │   Cache)    │  │   + Inference)  │
└────────────────┘  └──────┬──────┘  └─────────────────┘
                           │
                    ┌──────▼──────────────────────────┐
                    │       BullMQ Worker Process      │
                    │  ┌──────────┐  ┌─────────────┐  │
                    │  │  Sync    │  │  Notif.     │  │
                    │  │  Jobs    │  │  Jobs       │  │
                    │  └────┬─────┘  └─────────────┘  │
                    └───────┼─────────────────────────┘
                            │
         ┌──────────────────┼────────────────────────────┐
         │                  │                            │
┌────────▼──────┐  ┌────────▼──────┐  ┌─────────────────▼──────┐
│ Google        │  │ GitHub        │  │ Slack                   │
│ Calendar API  │  │ REST/GraphQL  │  │ Web API + Events        │
└───────────────┘  └───────────────┘  └────────────────────────┘
         │                  │                            │
┌────────▼──────┐  ┌────────▼──────┐
│ Jira API      │  │ Linear API    │
└───────────────┘  └───────────────┘
```

---

## 3. Database Schema

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- OAuth integration connections per user
CREATE TABLE integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,  -- 'google', 'github', 'slack', 'jira', 'linear', 'notion'
  access_token  TEXT,           -- encrypted at rest
  refresh_token TEXT,           -- encrypted at rest
  token_expires TIMESTAMPTZ,
  metadata      JSONB,          -- provider-specific config (e.g., Slack channel IDs)
  connected_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Activity categories
CREATE TABLE categories (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT UNIQUE NOT NULL,
  color TEXT  -- hex color for UI
);
-- Seed: Administration, Engineering Operations, New Feature/Enhancements, Production Support

-- Raw signals ingested from integrations (immutable log)
CREATE TABLE signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,
  external_id  TEXT,             -- provider's own ID for dedup
  occurred_at  TIMESTAMPTZ NOT NULL,
  raw_data     JSONB NOT NULL,   -- full provider payload
  ingested_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, external_id)
);

-- Draft and confirmed worklog entries
CREATE TABLE entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  category_id     UUID REFERENCES categories(id),
  time_hours      NUMERIC(4,2) NOT NULL,  -- e.g., 1.50
  description     TEXT NOT NULL,
  notes           TEXT,                   -- maps to 'Other' column
  status          TEXT NOT NULL DEFAULT 'draft',  -- draft | confirmed | submitted
  source          TEXT,                   -- 'google_calendar' | 'github' | 'slack' | 'manual' | 'ai'
  signal_ids      UUID[],                 -- which signals contributed to this entry
  ai_suggested    BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Daily submission record
CREATE TABLE daily_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  submitted_at TIMESTAMPTZ,
  total_hours  NUMERIC(5,2),
  UNIQUE(user_id, date)
);

-- Timer sessions
CREATE TABLE timers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  description  TEXT,
  category_id  UUID REFERENCES categories(id),
  started_at   TIMESTAMPTZ NOT NULL,
  stopped_at   TIMESTAMPTZ,
  converted    BOOLEAN DEFAULT false  -- true once turned into an entry
);

-- Export history
CREATE TABLE exports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  format      TEXT NOT NULL,  -- 'xlsx' | 'csv'
  date_from   DATE,
  date_to     DATE,
  scope       TEXT,           -- 'self' | 'team'
  file_path   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. API Routes

```
Authentication
  POST  /api/auth/[...nextauth]   NextAuth.js handler

Users
  GET   /api/users/me             Current user profile
  PATCH /api/users/me             Update profile

Integrations
  GET   /api/integrations         List connected integrations for current user
  POST  /api/integrations/connect/:provider  Start OAuth flow
  DELETE /api/integrations/:provider         Disconnect

Entries
  GET   /api/entries?date=&userId=  List entries (filtered)
  POST  /api/entries              Create manual entry
  PATCH /api/entries/:id          Update entry (description, category, time, status)
  DELETE /api/entries/:id         Delete entry
  POST  /api/entries/:id/confirm  Confirm draft entry
  POST  /api/entries/merge        Merge multiple entries into one
  POST  /api/entries/:id/split    Split entry into two

Daily Flow
  POST  /api/days/:date/submit    Submit all confirmed entries for a day
  GET   /api/days/:date/status    Get submission status for a date

Sync
  POST  /api/sync/trigger         Manually trigger sync for current user
  GET   /api/sync/status          Last sync timestamps per integration

AI
  POST  /api/ai/suggest-category  { description } → { category }
  POST  /api/ai/suggest-time      { signal } → { hours }
  POST  /api/ai/summarize-slack   { messages[] } → { description }
  POST  /api/ai/fill-gaps         { date, entries[] } → { suggestions[] }

Timers
  POST  /api/timers/start         Start a new timer
  POST  /api/timers/:id/stop      Stop a running timer
  GET   /api/timers/active        Get current running timer
  POST  /api/timers/:id/convert   Convert stopped timer to an entry

Reports
  GET   /api/reports/summary?from=&to=&userId=  Hours per category
  GET   /api/reports/team?from=&to=             Team-wide summary

Exports
  POST  /api/exports              Generate Excel/CSV export
  GET   /api/exports/:id/download Download generated file
```

---

## 5. Integration Sync Architecture

Each integration runs as a **BullMQ job** on a schedule:

```
Scheduler (cron)
  ├── every 30 min → google-calendar-sync per user
  ├── every 30 min → github-sync per user
  ├── every 60 min → slack-sync per user
  ├── every 60 min → jira-sync per user
  └── every day at 17:00 → daily-reminder notification per user
```

**Sync job flow:**

```
1. Load user's OAuth token for provider (decrypt from DB)
2. Refresh token if expired
3. Fetch events/activity since last sync timestamp
4. For each item:
   a. Check if already in signals table (by external_id) → skip if exists
   b. Insert into signals table
   c. Run inference pipeline:
      - Extract description
      - Infer category (rule-based + AI fallback)
      - Estimate time
   d. Insert draft entry into entries table
5. Update last sync timestamp
```

**Token encryption:** Use AES-256-GCM with a server-side secret. Tokens are encrypted before INSERT and decrypted on SELECT.

---

## 6. Integration Specifics

### Google Calendar Sync
```typescript
interface CalendarSignal {
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  description?: string;
  location?: string;
}

// Category inference rules (applied in order, first match wins)
const calendarCategoryRules = [
  { keywords: ['daily', 'standup', 'scrum', 'sync', 'retrospective', 'planning', '1:1'], category: 'Administration' },
  { keywords: ['sprint', 'grooming', 'backlog', 'refinement', 'architecture', 'design review'], category: 'Engineering Operations' },
  { keywords: ['incident', 'postmortem', 'on-call', 'hotfix'], category: 'Production Support' },
  { default: 'Administration' }  // meetings default to admin
];
```

### GitHub Sync
```typescript
interface GithubSignal {
  type: 'commit' | 'pr_created' | 'pr_reviewed' | 'pr_merged' | 'issue_commented';
  repo: string;
  title?: string;
  url: string;
  additions?: number;
  deletions?: number;
  filesChanged?: number;
  occurredAt: string;
}

// Time estimate heuristic for PRs
function estimatePRTime(signal: GithubSignal): number {
  if (signal.type === 'pr_reviewed') {
    const complexity = (signal.additions || 0) + (signal.deletions || 0);
    if (complexity < 50) return 0.5;
    if (complexity < 200) return 1.0;
    if (complexity < 500) return 1.5;
    return 2.0;
  }
  if (signal.type === 'pr_created') return 2.0;
  return 1.0;  // default
}
```

### Slack Sync
```typescript
interface SlackSignal {
  channelId: string;
  channelName: string;
  messageCount: number;
  threadCount: number;
  timeRange: { start: string; end: string };
  sampleMessages: string[];  // up to 10 messages for AI summarization
}

// AI summarization prompt
const SLACK_SUMMARIZE_PROMPT = `
You are summarizing a software engineer's Slack activity for their daily worklog.
Channel: {channelName}
Time range: {timeRange}
Messages: {messages}

Produce a single-line activity description (max 100 chars) suitable for a worklog entry.
Focus on the work done, not the communication itself.
Format: "<verb> | <topic>" (e.g., "Investigated | Login timeout issue in production")
`;
```

---

## 7. Excel Export

The export must produce a file matching the source worklog structure exactly.

```typescript
import ExcelJS from 'exceljs';

async function generateExport(entries: Entry[], options: ExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Worklog');

  // Headers matching source file
  sheet.addRow(['Name', 'Category', 'Date', 'Time', 'Comments', 'Other']);

  for (const entry of entries) {
    sheet.addRow([
      entry.user.name,
      entry.category.name,
      entry.date,          // ExcelJS handles Date → serial conversion
      entry.timeHours,
      entry.description,
      entry.notes ?? ''
    ]);
  }

  // Column widths
  sheet.getColumn('A').width = 25;  // Name
  sheet.getColumn('B').width = 30;  // Category
  sheet.getColumn('C').width = 15;  // Date
  sheet.getColumn('D').width = 8;   // Time
  sheet.getColumn('E').width = 60;  // Comments
  sheet.getColumn('F').width = 30;  // Other

  return workbook.xlsx.writeBuffer() as Promise<Buffer>;
}
```

---

## 8. Frontend Page Structure

```
/                           → Redirect to /dashboard
/login                      → OAuth login page
/dashboard                  → Main daily view (default: today)
/dashboard/[date]           → View/edit a specific date
/week                       → Week overview (7 days, status per day)
/reports                    → Summary charts + export
/settings                   → User profile, notifications, integrations
/settings/integrations      → Connect/disconnect integrations
/settings/integrations/[provider]/callback  → OAuth callback
/team                       → Team view (manager only)
```

---

## 9. Key UI Components

```
<DailyDashboard>
  <DateNavigator />           ← prev/next day, calendar picker
  <SubmissionStatusBanner />  ← "2 unconfirmed entries" or "Submitted ✓"
  <EntryList>
    <EntryCard                ← one per activity
      source="google_calendar | github | slack | manual"
      status="draft | confirmed"
      onConfirm | onEdit | onDelete | onMerge | onSplit
    />
  </EntryList>
  <AddManualEntryButton />
  <DailyTimerWidget />       ← active timer display
  <SubmitDayButton />        ← disabled until all entries confirmed
  <HoursSummary />           ← total hours today, by category
</DailyDashboard>

<EntryCard>
  <SourceBadge />            ← colored icon: GCal, GitHub, Slack, Manual
  <CategorySelect />         ← dropdown with 4 categories
  <TimeInput />              ← number input (hours)
  <DescriptionInput />       ← text input
  <ConfirmButton />
  <ExpandedActions>          ← merge, split, delete, AI suggest
</EntryCard>
```

---

## 10. Security Considerations

- **OAuth tokens** encrypted at rest (AES-256-GCM).
- **HTTPS only** in production (Caddy auto-cert).
- **CSRF protection** via NextAuth.js built-in.
- **Input validation** via Zod on all API routes.
- **Authorization:** every API route checks that the authenticated user owns the resource.
- **Slack messages** are summarized by AI and then discarded — raw message content is never stored.
- **Rate limiting** on sync endpoints and AI routes (avoid API abuse).
- **Secrets** managed via `.env` file (never committed); production secrets in environment variables.

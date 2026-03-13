# WorkLog Platform — Development Roadmap

---

## Phases Overview

```
Phase 1 (MVP)     → Core product working end-to-end, manually-triggered sync
Phase 2           → Background sync, AI features, Slack integration
Phase 3           → Polish, team features, notifications, export
Phase 4           → Optional integrations (Jira, Linear, Notion)
```

---

## Phase 1 — MVP (Working Core)

**Goal:** A user can log in, see draft entries from Google Calendar and GitHub, confirm them, and export to Excel.

### Milestone 1.1 — Project Scaffolding ✅
- [x] Initialize Next.js 14 project with TypeScript + Tailwind + shadcn/ui
- [x] Set up Prisma with PostgreSQL (local Docker)
- [x] Configure NextAuth.js with Google provider
- [x] Create base database schema (users, integrations, categories, entries)
- [x] Set up Docker Compose for local development (app + postgres + redis)
- [x] Configure ESLint, Prettier, TypeScript strict mode
- [x] Set up GitHub Actions CI (lint + type-check)

### Milestone 1.2 — Authentication ✅
- [x] Google OAuth login/logout
- [x] Protected routes (redirect to login if unauthenticated)
- [x] User profile page (account info, connected integrations, sign out)

### Milestone 1.3 — Manual Entry ✅
- [x] Daily dashboard page (today's view)
- [x] Date navigation (prev/next day + "Today" shortcut)
- [x] Create manual entry form (dialog with description, hours, category, notes)
- [x] Edit entry inline (description, category, time, notes)
- [x] Delete entry
- [x] Confirm entry (draft → confirmed) — per entry + "Confirm All" bulk action
- [x] Submit day (confirmed → submitted) — locks entries to read-only

### Milestone 1.4 — Google Calendar Integration ✅
- [x] Connect Google Calendar (calendar.readonly scope already in OAuth config)
- [x] Manual "Sync Calendar" button on dashboard
- [x] Fetch and display calendar events as draft entries for any date
- [x] Category inference from event title keywords
- [x] Handle duplicate sync (idempotent via signal external_id)
- [x] Token refresh when Google access token expires
- [x] Skip all-day events, declined events, and events < 5 min
- [x] Round event duration to nearest 0.25h

### Milestone 1.5 — GitHub Integration (Up Next)
- [ ] GitHub OAuth connect flow
- [ ] Manual "Sync GitHub" button
- [ ] Fetch commits, PRs, reviews for current user
- [ ] Group commits per repo per day
- [ ] Category inference and time estimation
- [ ] Draft entries created from GitHub activity

### Milestone 1.6 — Export
- [ ] Excel export matching Trashie worklog columns exactly
- [ ] CSV export
- [ ] Date range filter for export
- [ ] Download button with loading state

---

## Phase 2 — Background Sync + AI

**Goal:** Sync runs automatically; AI improves entry quality.

### Milestone 2.1 — Background Sync
- [ ] Set up BullMQ + Redis worker
- [ ] Scheduled Google Calendar sync (every 30 min per user)
- [ ] Scheduled GitHub sync (every 30 min per user)
- [ ] Sync status indicator on settings page
- [ ] Error handling and retry logic

### Milestone 2.2 — Slack Integration
- [ ] Slack OAuth connect flow
- [ ] Channel selector in settings
- [ ] Fetch user messages from selected channels
- [ ] Scheduled Slack sync (every 60 min)
- [ ] Draft entry created per channel with message count + time range

### Milestone 2.3 — AI Features
- [ ] Integrate Claude API (`claude-sonnet-4-6`)
- [ ] Slack summarization: AI generates worklog description from messages
- [ ] Category suggestion: AI suggests category when user edits description
- [ ] Time estimation for GitHub PRs (based on diff size)
- [ ] "Fill Gaps" button on dashboard

### Milestone 2.4 — Timer
- [ ] Start/stop timer widget in header
- [ ] Timer persists across refreshes
- [ ] Convert stopped timer to draft entry
- [ ] Auto-stop timer at midnight with flagging

---

## Phase 3 — Polish + Team Features

**Goal:** Production-ready; team can use it daily without friction.

### Milestone 3.1 — Week View
- [ ] 7-day week overview page
- [ ] Hours per day + submission status
- [ ] Quick submit per day from week view

### Milestone 3.2 — Reports & Charts
- [ ] Reports page with date range and user filters
- [ ] Hours by category (pie/donut chart)
- [ ] Hours per day (bar chart)
- [ ] Daily average and total summary

### Milestone 3.3 — Notifications
- [ ] In-app notification bell
- [ ] Daily reminder (configurable time via settings)
- [ ] Missing-day alert on dashboard load
- [ ] Email notifications (configurable)

### Milestone 3.4 — Team View
- [ ] Role system: member vs. manager
- [ ] Manager can view any team member's daily log
- [ ] Team summary table
- [ ] Team-wide export

### Milestone 3.5 — Merge / Split
- [ ] Multi-select entries on dashboard
- [ ] Merge selected entries into one
- [ ] Split single entry into two

### Milestone 3.6 — Settings & UX Polish
- [ ] Notification preferences page
- [ ] Integration config (Slack channel selection, GitHub org filter)
- [ ] Keyboard shortcuts (j/k navigation, c to confirm, s to submit)
- [ ] Mobile responsive layout
- [ ] Dark mode

---

## Phase 4 — Additional Integrations

### Milestone 4.1 — Jira
- [ ] Jira OAuth / API token connect
- [ ] Fetch issue transitions for user
- [ ] Draft entries from issue lifecycle events
- [ ] Use Jira time-logged when available

### Milestone 4.2 — Linear
- [ ] Linear OAuth connect
- [ ] Fetch issue assignments and state changes
- [ ] Draft entries from Linear activity

### Milestone 4.3 — Notion
- [ ] Notion OAuth connect
- [ ] Track page edits and comments
- [ ] Draft entries for documentation work

---

## Technical Debt & Housekeeping (Ongoing)
- [ ] End-to-end tests (Playwright) for critical flows
- [ ] Unit tests for sync logic and export
- [ ] API rate limit handling for all providers
- [ ] Monitoring / error tracking (Sentry)
- [ ] Database backup automation
- [ ] Performance: index entries(user_id, date) for fast dashboard queries
- [ ] OAuth token rotation and expiry handling

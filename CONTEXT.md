# WorkLog Platform — Project Context & Architect Brief

> **Purpose of this document:** This is the canonical context file for any AI agent, developer, or contributor picking up this project. Read this first before reading anything else.

---

## 1. The Problem

A software engineering team manually fills a shared Excel worklog file every day. The file tracks who did what, for how long, and under which category. The process is:

- **Tedious** — engineers have to remember everything they did retroactively.
- **Error-prone** — hours and activities are forgotten or misremembered.
- **Inconsistent** — different people log with different granularity and vocabulary.
- **Low-value** — the act of filling the report creates no additional insight.

The team wants to keep the structured report format (it feeds downstream reporting dashboards) but eliminate the manual burden.

---

## 2. The Solution Vision

A web platform that **auto-collects activity signals** from the services the team already uses (Google Calendar, GitHub, Slack, Jira, etc.), **synthesizes them into draft worklog entries**, and presents a daily confirmation dashboard where each team member simply reviews, edits if needed, and submits.

The system must:
1. Aggregate signals from multiple sources into draft activity rows.
2. Let the user confirm, merge, split, edit, or discard rows.
3. Store confirmed data in a normalized database.
4. Export to CSV/Excel in the existing worklog format at any time.

---

## 3. Current Worklog Format (Source of Truth)

**File:** `Trashie - Worklog.xlsx`
**Sheet structure:**

| Sheet | Purpose |
|---|---|
| Worklog | Raw activity log (main data entry sheet) |
| Team Summary | Pivot: hours per person per period |
| Monthly Report | Pivot: monthly breakdown |
| Category Monthly Report | Pivot: hours by category by month |
| Data Source | Supporting lookup data |

**Worklog columns:**

| Column | Type | Notes |
|---|---|---|
| Name | String | Full name of team member |
| Category | Enum | See categories below |
| Date | Date | Excel serial date (base 1899-12-30) |
| Time | Float | Hours worked (e.g., 1.5, 8.0) |
| Comments | String | Free-text description of the activity |
| Other | String | Rarely used; supplemental notes |

**Activity categories:**
- `Administration`
- `Engineering Operations`
- `New Feature/Enhancements`
- `Production Support`

**Team members (current):**
- Alejandro Vásquez
- Gustavo Arroyave
- Julian Mondragón
- Mario Monsalve

**Sample activity comments (real data):**
- `Daily Meeting`
- `Call with Andrés`
- `Analysis of API versioning`
- `Create healthcheck for trashie | Code`
- `Code review | PR #142`
- `Configure project | QA environment`
- `Analysis of Production Issues`

---

## 4. Core User Journey

```
Morning / Any time during the day
  → System continuously ingests signals from connected integrations

End of day (or whenever the user chooses)
  → User opens the dashboard
  → Sees a list of auto-generated draft activity entries for today
  → Reviews each entry:
      - Confirm as-is
      - Edit description, category, or time
      - Merge two entries into one
      - Split one entry into two
      - Delete a false positive
      - Add a manual entry for anything not captured
  → Hits "Submit Day"
  → Data is stored

At reporting time (weekly/monthly)
  → User or manager opens Reports section
  → Exports filtered data to Excel/CSV in the exact worklog format
```

---

## 5. Integrations

### 5.1 Google Calendar (Priority: HIGH)
- Pull all calendar events for each user for the current/previous day.
- Map event title → Comments field.
- Map event duration → Time field.
- Infer category from title keywords (e.g., "daily", "standup" → Administration; "sprint planning" → Engineering Operations).
- Support multi-user: each user connects their own Google account.

### 5.2 GitHub (Priority: HIGH)
- Track: commits, pull requests created/reviewed/merged, issues commented on.
- Map to activity entries with repository + PR/issue title as description.
- **Time assignment:** GitHub has no time data. The system should:
  - Suggest a default (e.g., 1h per PR review, 2h per PR created).
  - Let users assign time manually on the confirmation screen.
- Infer category: most GitHub activity → `New Feature/Enhancements` or `Production Support`.

### 5.3 Slack (Priority: MEDIUM)
- Monitor specific channels (configured per workspace).
- Do **not** log individual messages; instead, summarize activity clusters into a single entry.
- Use AI summarization (Claude API) to produce a meaningful description.
- Let user confirm/edit the summary.
- Category inference: support channels → `Production Support`; general/dev channels → `Engineering Operations`.

### 5.4 Jira / Linear (Priority: MEDIUM)
- Track: issues moved to In Progress, In Review, or Done.
- Map issue title + key → Comments (e.g., `TRS-142 | Implement QR code validation`).
- Pull estimate/time-logged from Jira if available.

### 5.5 Notion (Priority: LOW)
- Track page edits and comments within a configured workspace.
- Useful for documentation tasks that don't appear in GitHub.

### 5.6 Manual Entry (Priority: HIGH — always available)
- Users can always add, edit, or delete entries manually.
- This is the fallback for any activity not captured by integrations.

---

## 6. Key Features

### Dashboard
- Daily view: shows today's auto-generated entries grouped by source.
- Week view: shows all days in the current week with submission status (submitted / pending / empty).
- Quick-edit inline: click any field to edit in place.
- Merge & split: select two entries → merge; click one entry → split into two.
- Bulk confirm: "Confirm All" button to accept all suggestions at once.
- Submission lock: once a day is submitted, it becomes read-only (with an override/edit option).

### Time Tracking
- Manual timer: start/stop a timer tied to a description + category.
- Timer history: all started timers become draft entries at the end of the session.

### Reporting & Export
- Filter by: user, date range, category.
- Export to: Excel (matching the exact column format of Trashie - Worklog.xlsx), CSV.
- Team view: managers can see all team members' logs.
- Summary stats: hours per category per person per period (mirrors the pivot sheets in the Excel file).

### Notifications
- Daily reminder (configurable time): "Don't forget to confirm your worklog."
- Missing-day alert: if a user has no entries for a previous workday, show a warning.

### AI Assistance (Claude API)
- Summarize Slack channel activity into clean activity descriptions.
- Suggest a category for any entry based on its description.
- Suggest time estimates for GitHub activities based on PR complexity (diff size, file count, review comments).
- "Fill gaps" mode: given the day's confirmed entries, suggest additional entries for time periods with no coverage.

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Authentication | OAuth 2.0 per user; each user connects their own integrations |
| Multi-tenancy | Single team deployment; no need for multi-org SaaS initially |
| Data privacy | Activity data stored only in the team's own database; no data leaves to third parties except for AI summarization (opt-in) |
| Availability | Internal tool; 99% uptime acceptable |
| Response time | Dashboard load < 2s; integration sync < 30s |
| Export fidelity | Excel exports must match the exact column structure of the source worklog |
| Mobile-friendly | Responsive UI; usable on mobile for quick confirmations |

---

## 8. Out of Scope (v1)

- Real-time collaboration / multi-user simultaneous editing.
- Time billing or invoicing.
- Deep Slack message logging (privacy concern).
- Automated submission without user confirmation.
- Integration with HR systems (Workday, BambooHR).

---

## 9. Constraints & Assumptions

- The team currently uses: Google Workspace, GitHub, Slack, and likely Jira or Linear.
- The Excel export must be **backward-compatible** with the existing file so downstream dashboards continue to work.
- Each team member manages their own integration connections.
- The platform is self-hosted (not a SaaS product for external customers).

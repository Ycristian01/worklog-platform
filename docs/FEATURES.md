# WorkLog Platform — Feature Specifications

---

## F-01: Authentication & User Management

**Description:** Each team member has their own account. Auth is handled via OAuth providers (Google is required since Google Calendar is a core integration).

**Scenarios:**
- User visits the app for the first time → redirected to login → signs in with Google → profile auto-created from Google account.
- User returns → session restored via cookie → lands on today's dashboard.
- User session expires → silently refreshed or redirected to login.
- Admin can view all team members in the team view.

**Acceptance criteria:**
- [ ] Login via Google OAuth works.
- [ ] User profile (name, email, avatar) populated from provider.
- [ ] Sessions persist across browser restarts (configurable expiry).
- [ ] Logout clears session and redirects to login.

---

## F-02: Daily Dashboard

**Description:** The main screen. Shows all activity entries for a selected date, grouped by source.

**Scenarios:**
- User opens app → sees today's entries (mix of draft + confirmed).
- User navigates to yesterday → sees yesterday's entries (submitted, read-only).
- Day has no entries → empty state with prompt to add manually or trigger sync.
- All entries confirmed but day not yet submitted → "Submit Day" button is active.
- Day is already submitted → dashboard shows read-only view with "Edit" override.

**Entry states:**
```
draft     → auto-generated, user has not acted on it
confirmed → user has reviewed and accepted
submitted → part of a submitted day (locked)
```

**Acceptance criteria:**
- [ ] Shows correct entries for selected date.
- [ ] Draft entries have visual distinction from confirmed entries.
- [ ] Navigation between dates works (prev/next arrows + date picker).
- [ ] Hours total shown per category and overall.
- [ ] Submit button disabled when unconfirmed drafts exist.

---

## F-03: Entry Management (CRUD + Merge/Split)

**Description:** Users can create, edit, delete, merge, and split entries.

**Edit fields:**
- Description (free text, max 200 chars)
- Category (dropdown: 4 options)
- Time (hours, step 0.25, min 0.25, max 24)
- Notes (optional free text)

**Merge:** Select 2+ entries → merged entry has combined time, description from longest entry (user edits), category from most common.

**Split:** Opens a split modal → enter two descriptions and time allocations that must sum to original time.

**Scenarios:**
- User edits description of a GitHub PR entry (auto-name was too technical).
- User merges two 30-min calendar events into a single 1h "Team Meetings" entry.
- User splits a 3h block into "Code review (1h)" and "Refactoring (2h)".
- User adds a manual entry for a phone call not captured by any integration.
- User deletes a false-positive draft entry.

**Acceptance criteria:**
- [ ] Inline edit of all fields works without page reload.
- [ ] Merge combines selected entries into one and deletes originals.
- [ ] Split creates two new entries, deletes original, enforces hours sum.
- [ ] Manual entry form validates required fields before saving.
- [ ] Deleted entries can be recovered within the same session (undo toast).

---

## F-04: Integration Management

**Description:** Users connect and configure third-party integrations via OAuth or API tokens.

**Per integration:**
- Connection status (connected / not connected / error)
- Last successful sync timestamp
- Provider-specific config (e.g., Slack: choose which channels to monitor)
- Disconnect button

**Scenarios:**
- User connects GitHub → OAuth flow → scopes: read:user, repo (read-only).
- User connects Slack → OAuth flow → selects channels to monitor.
- User's Google token expires → auto-refreshed transparently.
- User disconnects an integration → all future sync stops; past entries remain.
- Sync fails (API error) → user sees error banner with "Retry" option.

**Acceptance criteria:**
- [ ] OAuth flows work for all supported providers.
- [ ] Integration status visible on settings page.
- [ ] Slack channel selector shows user's workspaces and channels.
- [ ] Failed syncs surface an error to the user.
- [ ] Disconnecting does not delete historical entries.

---

## F-05: Google Calendar Integration

**Description:** Auto-generate entries from calendar events.

**Logic:**
1. Fetch all events for the target day where the user is `accepted` or `tentative`.
2. Skip all-day events.
3. Skip events shorter than 5 minutes.
4. For each event: create a draft entry with:
   - Description = event title
   - Time = event duration in hours (rounded to 0.25)
   - Category = inferred from title keywords (see Technical Design §6)
5. Handle overlapping events: flag to user, do not double-count automatically.

**Scenarios:**
- Calendar has "Daily Standup (15 min)" → entry: Description="Daily Standup", Time=0.25, Category=Administration.
- Calendar has "Sprint Planning (2h)" → entry: Description="Sprint Planning", Time=2.0, Category=Engineering Operations.
- Calendar has overlapping events → both appear as drafts with a warning badge.
- Event was declined by user → excluded from sync.

---

## F-06: GitHub Integration

**Description:** Auto-generate entries from GitHub activity.

**Tracked events:**
| Event | Entry description template | Default time |
|---|---|---|
| PR created | `PR Created | {repo}: {title}` | 2.0h |
| PR reviewed | `Code Review | {repo}: {title}` | 1.0h |
| PR merged | `PR Merged | {repo}: {title}` | 0.5h |
| Commit pushed | `Development | {repo}: {commit message}` | 1.0h |
| Issue commented | `Issue Discussion | {repo}: #{number} {title}` | 0.5h |

**Grouping rule:** Multiple commits to the same repo in the same day are grouped into one entry: `Development | {repo}: {n} commits`.

**Category inference:**
- Most GitHub activity → `New Feature/Enhancements`
- If repo name or PR title contains "hotfix", "bug", "fix", "incident" → `Production Support`
- If PR title contains "docs", "readme", "documentation" → `Engineering Operations`

**Scenarios:**
- User opens 2 PRs in 1 day → 2 separate draft entries.
- User reviews 3 PRs → 3 separate draft entries (user may merge manually).
- User makes 7 commits to the same repo → 1 grouped entry "Development | repo: 7 commits".
- User wants to break a grouped commits entry into individual tasks → uses split.

---

## F-07: Slack Integration

**Description:** Summarize Slack activity in configured channels into draft entries.

**Privacy-first design:**
- Raw messages are **never stored** in the database.
- Only the AI-generated summary is stored.
- Opt-in per channel: user explicitly selects which channels to monitor.

**Logic:**
1. Fetch messages posted by the user in configured channels for the target day.
2. Group by channel.
3. For each channel: if user sent ≥ 3 messages, run AI summarization.
4. Store summary as a draft entry.

**Category assignment:**
- Channels configured as "support" → `Production Support`
- All others → `Engineering Operations`

**Scenarios:**
- User sent 10 messages in #backend-team → entry: "Discussed | {AI-generated topic summary}", Time=0.5h.
- User sent 1 message → below threshold, no entry generated.
- AI summary is poor → user edits description manually.

---

## F-08: Jira / Linear Integration

**Description:** Track issue lifecycle events.

**Tracked events:**
- Issue moved to "In Progress" → `Started | {key}: {title}`, 2.0h default
- Issue moved to "In Review" → `Code Review Ready | {key}: {title}`, 0.5h default
- Issue moved to "Done" → `Completed | {key}: {title}`, 1.0h default
- Time logged on an issue (Jira only) → use logged time directly

**Scenarios:**
- PM moves TRS-142 to "In Progress" (assigned to user) → draft entry created.
- Developer logs 3h on TRS-150 in Jira → entry with Time=3.0h.
- Same issue moved through multiple stages in one day → all stages shown; user merges into one.

---

## F-09: Manual Timer

**Description:** Start/stop timer directly in the app to track time on an activity.

**Behavior:**
- One active timer at a time per user.
- Timer persists across page refreshes (stored in DB).
- When stopped, timer becomes a draft entry.
- Timer shows elapsed time in the header/toolbar.

**Scenarios:**
- User starts "Investigating login bug" timer at 2pm, stops at 3:30pm → draft entry with Time=1.5h.
- User forgets to stop timer → system auto-stops at midnight and flags the entry.
- User starts timer, closes browser, reopens later → timer still running, shows correct elapsed time.

---

## F-10: AI-Assisted Confirmation

**Description:** AI (Claude) assists users during the confirmation flow.

**AI features:**
1. **Category suggestion:** If user changes description, AI suggests a category in real time.
2. **Time suggestion:** For GitHub PRs, AI considers diff size + file count to suggest hours.
3. **Slack summarization:** Produce a clean worklog-style description from raw Slack activity.
4. **Gap filling:** After user confirms all existing entries, AI analyzes uncovered time blocks and suggests what might have happened (based on signals or calendar).

**Interaction pattern:** AI suggestions are always shown as suggestions, never auto-applied. User taps "Accept" or ignores.

---

## F-11: Week Overview

**Description:** A 7-day calendar-style view showing submission status and hours per day.

**Displays per day:**
- Total confirmed hours
- Submission status (submitted ✓ / pending / empty)
- Quick "Submit" button for days ready to submit

**Scenarios:**
- Monday and Tuesday submitted, Wednesday pending → user can quickly jump to Wednesday.
- Friday end of day: user sees week summary before submitting all pending days.

---

## F-12: Reports & Export

**Description:** Generate summary reports and export to Excel/CSV.

**Filters:**
- Date range (from / to)
- Team member (self or all)
- Category

**Report views:**
- Hours by category (pie chart)
- Hours per day (bar chart)
- Hours per person (team view)

**Export formats:**
- **Excel (.xlsx):** Matches exact column structure of `Trashie - Worklog.xlsx` (Name, Category, Date, Time, Comments, Other).
- **CSV:** Same columns, UTF-8 encoded.

**Scenarios:**
- Manager selects entire month, all team members → downloads Excel matching source format.
- Developer exports their own last-week data for personal review.
- Export includes only submitted entries (draft/unconfirmed excluded).

---

## F-13: Notifications

**Description:** Remind users to confirm and submit their worklog.

**Notification types:**
- **Daily reminder:** Configurable time (default 5pm local) — "Don't forget to confirm today's worklog."
- **Missing day alert:** If a previous working day has no submitted entries → banner on next login.
- **Sync error:** If an integration fails → banner with provider name and retry button.

**Channels:**
- In-app notifications (bell icon)
- Email (configurable)
- Slack DM (if Slack is connected — optional)

---

## F-14: Team View (Manager)

**Description:** Allow a designated manager to see all team members' worklogs.

**Features:**
- Read-only view of any team member's daily/weekly log.
- Team summary table: rows = team members, columns = days, cells = hours.
- Export entire team's data.

**Access control:** Team view only accessible to users with `role: manager`.

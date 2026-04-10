# Jira Session Sprint Dashboard — Design Spec

**Date:** 2026-04-10  
**Author:** Erick Luna  
**Status:** Approved  
**Audience:** IT Team Leads

---

## Overview

A standalone internal web dashboard that gives Leads a full view of developer task performance across projects, measured against the session-based sprint system. The dashboard surfaces card lifecycle traces, AI field metrics, and sprint health indicators to objectively evaluate whether the workflow is working.

---

## Goals

- Track every card's full status history (creation → Done) per developer per project
- Measure the 3 AI Jira fields: `AI-assisted`, `Rework required`, `Session count`
- Surface flagged cards (multi-session, rework required) for Lead intervention
- Provide per-developer AI performance breakdown across sprints

---

## Architecture

```
[Browser (Lead)]
     ↕ HTTP
[Express Proxy Server]  ← serves static HTML/CSS/JS + proxies Jira API calls
     ↕ Jira REST API (Basic auth: email + API token)
[Jira Cloud]
```

### File Structure

```
jira-dashboard/
├── server.js           # Express proxy (~30 lines)
├── config.json         # JIRA_BASE_URL + board IDs per project (one-time setup)
├── .gitignore          # Must include config.json to prevent accidental commit
├── public/
│   ├── index.html      # Dashboard shell
│   ├── app.js          # UI logic + Jira data fetching
│   └── styles.css      # Layout + timeline styles
└── config.example.json # Template for config.json — safe to commit
```

> **Security note:** `config.json` contains your Jira base URL and board IDs. It is listed in `.gitignore` and must never be committed. Use `config.example.json` as the committed reference template.

### Auth Flow

- On first load, a modal prompts for Jira email + API token
- Credentials stored in `sessionStorage` — cleared on tab close, never persisted to disk
- Proxy forwards credentials as `Basic` auth header (`base64(email:token)`) on every Jira API request
- Token is never stored on the server

---

## Filters

All filters are **multi-select**. Located in a sticky top bar.

| Filter | Source |
|---|---|
| Project | `config.json` board list |
| Developer | Assignees returned from the issue query for selected projects |
| Sprint / Date range | Agile board sprint list — fetched **per board** for each selected project |

**Sprint scoping rule:** Sprint IDs are board-scoped in Jira. When multiple projects are selected, sprint lists are fetched per board and merged. The JQL query splits by board: one `project IN (...) AND sprint IN (...)` clause per board, results merged client-side.

A **Load / Refresh** button triggers all API calls. No auto-refresh.

---

## UI Panels

### 1. Sprint Health Summary (metric tiles row)

| Metric | Formula | Target |
|---|---|---|
| 1-session completion rate | Cards where `session_count = 1` ÷ total | 85%+ |
| AI-assisted rate | Cards where `AI-assisted = Y` ÷ total | Track baseline |
| Rework rate | Cards where `rework_required = Y` ÷ total | < 10% |
| Avg session count | Sum of `session_count` ÷ total cards | Trending toward 1 |

Tiles show `—` when custom fields are not logged, with tooltip: _"Developer has not logged this field."_

Tiles are computed only from cards where the relevant custom field is filled. Unfilled cards are excluded from the denominator and a count of unfilled cards is shown below the tile (e.g., _"3 cards missing this field"_).

### 2. Card Lifecycle Traces (main panel)

Vertical list of cards. Each card is collapsible and shows:

- Card key, title, assignee, size label
- Horizontal status timeline with nodes:
  `Created → To Do → In Progress → In Review → Done`
- Time spent in each status shown between nodes (e.g., `2h 14m`)
- `Session count`, `AI-assisted`, and `Rework required` badge on each card

Timeline is built from the Jira changelog `status` field changes.

**Partial data warning:** If changelog fetch fails for one or more cards (e.g., mid-batch 429), those cards render with a `⚠ Incomplete trace` badge. All successfully fetched cards still render. A banner at the top of the panel states: _"X card(s) have incomplete trace data. Try refreshing."_

### 3. AI Metrics Breakdown (table)

Per-developer summary table:

| Developer | Cards | AI-assisted % | Rework % | Avg Sessions |
|---|---|---|---|---|
| Dev A | 12 | 92% | 4% | 1.1 |
| Dev B | 8 | 50% | 25% | 1.9 |

Sortable by any column. Rows link to that developer's filtered trace view.

### 4. Flagged Cards (bottom panel)

Auto-surfaced cards meeting any of:
- `session_count > 1`
- `rework_required = Y`

Displayed as a compact list with card key, developer, session count, and rework flag. Intended for Lead follow-up.

---

## Jira API Calls

### 1. Fetch Issues

```
GET /rest/api/3/search
params:
  jql: project IN (...) AND sprint IN (...)   ← one query per board when multi-project
  fields: summary, assignee, status, created, resolutiondate,
          {customfield_id_ai_assisted},
          {customfield_id_rework_required},
          {customfield_id_session_count}
  maxResults: 50
  startAt: 0   ← paginate until total is reached
```

**Pagination:** The server loops using `startAt` increments of 50 until `startAt >= total`. All pages are merged before sending to the browser.

**Custom field IDs:** Jira custom fields use numeric IDs (e.g., `customfield_10042`), not display names. On server startup, the proxy calls `/rest/api/3/field` and maps the display names `"AI-assisted"`, `"Rework required"`, and `"Session count"` to their numeric IDs. These IDs are cached in memory for the lifetime of the server process. If a field name is not found, the server logs a warning and the corresponding metric tile shows `—` for all cards.

### 2. Fetch Changelogs (per issue)

```
GET /rest/api/3/issue/{issueKey}/changelog
params:
  maxResults: 100
  startAt: 0   ← paginate if issue has >100 changelog entries
```

Fetched sequentially with 50ms delay between requests to avoid Jira rate limits.  
Only `status` field changes are used to build the trace timeline.  
Changelog pagination is handled: if `isLast = false`, additional pages are fetched before processing.

### 3. Fetch Sprint List (per board)

```
GET /rest/agile/1.0/board/{boardId}/sprint
params:
  state: active,closed
```

Called once per board in `config.json`. Results are stored per board ID and used to populate the sprint filter for that project.

### Computed Locally (no additional API calls)

- Time in each status = diff between consecutive changelog timestamps
- 1-session completion rate, AI-assisted rate, rework rate = field value counts ÷ filled-field total
- Flagged cards = filter on `session_count > 1` OR `rework_required = Y`

---

## Configuration

`config.json` — one-time setup by Lead (do not commit — see `.gitignore`):

```json
{
  "jira_base_url": "https://yourorg.atlassian.net",
  "projects": [
    { "key": "SALINA", "board_id": 1 },
    { "key": "V4ADMIN", "board_id": 2 }
  ]
}
```

`config.example.json` — committed template (safe to version):

```json
{
  "jira_base_url": "https://YOUR_ORG.atlassian.net",
  "projects": [
    { "key": "PROJECT_KEY", "board_id": 0 }
  ]
}
```

Custom field IDs for `AI-assisted`, `Rework required`, and `Session count` are resolved by display name on server startup via `/rest/api/3/field` and cached in memory. No manual ID lookup required.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| 401 from Jira | Clear `sessionStorage`, re-show token modal with message |
| 429 rate limit (full stop) | Proxy pauses, reads `Retry-After` header, retries up to 3 times with exponential backoff; if still 429 after 3 attempts, returns error to browser and shows banner: "Jira rate limit reached — wait a moment and try again" |
| 429 mid-changelog batch | Mark affected cards as `⚠ Incomplete trace`, continue with remaining cards, show banner |
| Empty filter result | "No cards found for this selection" in traces panel |
| Card with no changelog | Show `Created → [current status]` with no intermediate nodes |
| Custom field not filled on a card | Exclude from metric denominator; show count of missing cards below tile |
| Custom field display name not found at startup | Server logs warning; metric tile shows `—` for all cards with tooltip explaining the issue |
| Missing `config.json` / bad board ID | Server logs error on startup; browser shows "Dashboard not configured — contact your Lead" |
| Jira unreachable | Top-of-page banner: "Unable to reach Jira — check your connection" |

---

## Success Criteria

The dashboard is successful if a Lead can:

1. Select any combination of projects, developers, and sprints and see results within 30 seconds for sprints with up to 50 cards (sequential changelog fetches: 50ms inter-request delay + ~100–200ms network latency per call = ~7.5–12.5s network time alone; 30s is a realistic upper bound)
2. See the full status history timeline for any card
3. Read the four sprint health metrics at a glance
4. Identify every flagged card (multi-session or rework) without manual filtering
5. Compare developer AI-assist and rework rates in the per-developer table

---

## Out of Scope (v1)

- Real-time auto-refresh
- Email/Slack alerts on flagged cards
- Historical sprint-over-sprint trend charts
- Role-based access control
- Mobile layout
- Sprints with more than 200 cards (pagination loops are implemented but UI performance above this threshold is not tested)

---

## Stack

- **Server:** Node.js + Express (proxy only, ~30 lines)
- **Frontend:** Vanilla HTML / CSS / JavaScript (no framework)
- **Auth:** Jira personal API token via `sessionStorage`
- **Deployment:** Any environment running Node.js (`node server.js`)

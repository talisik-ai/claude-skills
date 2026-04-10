# Jira Session Sprint Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone internal web dashboard for IT Team Leads to track developer card performance and AI workflow metrics against the session-based sprint system in Jira.

**Architecture:** Node.js/Express proxy server handles Jira API authentication and custom field ID resolution at startup; vanilla HTML/CSS/JS frontend (ES Modules) fetches data through the proxy and renders four panels: sprint health tiles, card lifecycle traces, per-developer AI metrics table, and flagged cards list. Pure computation modules (`metrics.js`, `traces.js`) are unit-tested with Node's built-in test runner.

**Tech Stack:** Node.js 18+, Express 4, Vanilla HTML/CSS/JS (ES Modules, no framework), `node:test` (built-in)

---

## File Map

```
tools/jira-dashboard/
├── server.js                     # Express: static files, field resolver, Jira proxy endpoints
├── config.json                   # gitignored — jira_base_url + project/board list
├── config.example.json           # committed template (safe to version)
├── .gitignore
├── package.json
├── README.md
├── public/
│   ├── index.html                # App shell: auth modal, filter bar, 4 panel containers
│   ├── app.js                    # Orchestration: init, auth, filter events, load flow
│   ├── api.js                    # fetch() calls to proxy endpoints + retry logic
│   ├── metrics.js                # Pure: compute health tile values from issues array
│   ├── traces.js                 # Pure: build timeline array from changelog entries
│   └── ui/
│       ├── auth-modal.js         # Auth modal show/hide + credential capture
│       ├── filter-bar.js         # Filter population + multi-select state
│       ├── health-tiles.js       # Render sprint health summary tiles
│       ├── trace-panel.js        # Render card lifecycle traces
│       ├── ai-table.js           # Render per-developer AI metrics table
│       └── flagged-panel.js      # Render flagged cards list
│   └── styles.css                # Layout, timeline, table, tile styles
└── tests/
    ├── metrics.test.js           # Unit tests: computeMetrics, computePerDeveloper
    └── traces.test.js            # Unit tests: buildTimeline, formatDuration
```

---

## Chunk 1: Project Setup + Server

### Task 1: Initialize project

**Files:**
- Create: `tools/jira-dashboard/package.json`
- Create: `tools/jira-dashboard/.gitignore`
- Create: `tools/jira-dashboard/config.example.json`

- [ ] **Step 1: Create directories**

```bash
mkdir -p tools/jira-dashboard/public/ui tools/jira-dashboard/tests
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "jira-dashboard",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=18" },
  "scripts": {
    "start": "node server.js",
    "test": "node --test tests/*.test.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd tools/jira-dashboard && npm install
```

Expected: `node_modules/` created, `package-lock.json` created.

- [ ] **Step 4: Create .gitignore**

```
node_modules/
config.json
.env
```

- [ ] **Step 5: Create config.example.json**

```json
{
  "jira_base_url": "https://YOUR_ORG.atlassian.net",
  "projects": [
    { "key": "PROJECT_KEY", "board_id": 0 }
  ]
}
```

- [ ] **Step 6: Copy config.example.json to config.json (local only, gitignored)**

```bash
cp tools/jira-dashboard/config.example.json tools/jira-dashboard/config.json
# Then edit config.json with real jira_base_url and board IDs
```

- [ ] **Step 7: Commit**

```bash
git add tools/jira-dashboard/package.json tools/jira-dashboard/package-lock.json tools/jira-dashboard/.gitignore tools/jira-dashboard/config.example.json
git commit -m "feat: scaffold jira-dashboard project"
```

---

### Task 2: Build Express proxy server

**Files:**
- Create: `tools/jira-dashboard/server.js`

The server has 5 responsibilities:
1. Serve static files from `public/`
2. `GET /api/config` — return project list (no secrets)
3. `POST /api/resolve-fields` — resolve custom field IDs using provided auth, cache in memory
4. `GET /api/sprints?boardId=X` — proxy sprint list for a board
5. `POST /api/issues` and `POST /api/changelog` — proxy paginated Jira queries

Credentials are never stored on the server. The client passes `x-jira-auth: Basic <base64>` on every request; the proxy forwards it as the `Authorization` header to Jira.

- [ ] **Step 1: Create server.js**

```javascript
import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Load config at startup
let config;
try {
  config = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf8'));
} catch (e) {
  console.error('ERROR: config.json not found or invalid. Copy config.example.json to config.json and fill in your values.');
  process.exit(1);
}

if (!globalThis.fetch) {
  console.error('ERROR: Node 18+ required (native fetch missing). Upgrade Node: https://nodejs.org');
  process.exit(1);
}

const { jira_base_url } = config;

// In-memory field ID cache: { ai_assisted, rework_required, session_count }
let fieldCache = null;

async function jiraFetch(path, auth, options = {}) {
  const url = `${jira_base_url}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': auth,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

// GET /api/config — safe, no credentials
app.get('/api/config', (req, res) => {
  res.json({ projects: config.projects });
});

// POST /api/resolve-fields — resolve field IDs by display name, cache in memory
app.post('/api/resolve-fields', async (req, res) => {
  const { auth } = req.body;
  if (!auth) return res.status(400).json({ error: 'auth required' });

  try {
    const jiraRes = await jiraFetch('/rest/api/3/field', auth);
    if (jiraRes.status === 401) return res.status(401).json({ error: 'Invalid credentials' });
    if (!jiraRes.ok) return res.status(jiraRes.status).json({ error: 'Jira error' });

    const fields = await jiraRes.json();
    const find = (name) => fields.find(f => f.name.toLowerCase() === name.toLowerCase())?.id || null;

    fieldCache = {
      ai_assisted: find('AI-assisted'),
      rework_required: find('Rework required'),
      session_count: find('Session count'),
    };

    const missing = Object.entries(fieldCache).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 0) console.warn(`WARNING: Could not find field IDs for: ${missing.join(', ')}`);

    res.json({ fields: fieldCache, missing });
  } catch (e) {
    res.status(502).json({ error: 'Could not reach Jira' });
  }
});

// GET /api/sprints?boardId=X
app.get('/api/sprints', async (req, res) => {
  const { boardId } = req.query;
  const auth = req.headers['x-jira-auth'];
  if (!auth) return res.status(400).json({ error: 'x-jira-auth header required' });

  try {
    const jiraRes = await jiraFetch(`/rest/agile/1.0/board/${boardId}/sprint?state=active,closed`, auth);
    if (jiraRes.status === 401) return res.status(401).json({ error: 'Invalid credentials' });
    if (!jiraRes.ok) return res.status(jiraRes.status).json({ error: 'Jira error' });
    res.json(await jiraRes.json());
  } catch (e) {
    res.status(502).json({ error: 'Could not reach Jira' });
  }
});

// POST /api/issues — paginated issue search
app.post('/api/issues', async (req, res) => {
  const { jql, startAt = 0 } = req.body;
  const auth = req.headers['x-jira-auth'];
  if (!auth) return res.status(400).json({ error: 'x-jira-auth header required' });
  if (!fieldCache) return res.status(503).json({ error: 'Fields not resolved. Call /api/resolve-fields first.' });

  const fields = [
    'summary', 'assignee', 'status', 'created', 'resolutiondate',
    fieldCache.ai_assisted, fieldCache.rework_required, fieldCache.session_count,
  ].filter(Boolean);

  try {
    const jiraRes = await jiraFetch('/rest/api/3/search', auth, {
      method: 'POST',
      body: JSON.stringify({ jql, fields, maxResults: 50, startAt }),
    });
    if (jiraRes.status === 401) return res.status(401).json({ error: 'Invalid credentials' });
    if (!jiraRes.ok) return res.status(jiraRes.status).json({ error: 'Jira error' });

    const data = await jiraRes.json();

    // Normalize custom field keys to friendly names.
    // Guard against null field IDs (field not found at startup) — always produce null, not undefined.
    data.issues = data.issues.map(issue => ({
      ...issue,
      fields: {
        ...issue.fields,
        ai_assisted: fieldCache.ai_assisted ? (issue.fields[fieldCache.ai_assisted] ?? null) : null,
        rework_required: fieldCache.rework_required ? (issue.fields[fieldCache.rework_required] ?? null) : null,
        session_count: fieldCache.session_count ? (issue.fields[fieldCache.session_count] ?? null) : null,
      },
    }));

    res.json({ issues: data.issues, total: data.total, startAt: data.startAt });
  } catch (e) {
    res.status(502).json({ error: 'Could not reach Jira' });
  }
});

// POST /api/changelog — paginated changelog for one issue
app.post('/api/changelog', async (req, res) => {
  const { issueKey, startAt = 0 } = req.body;
  const auth = req.headers['x-jira-auth'];
  if (!auth) return res.status(400).json({ error: 'x-jira-auth header required' });

  try {
    const jiraRes = await jiraFetch(
      `/rest/api/3/issue/${issueKey}/changelog?maxResults=100&startAt=${startAt}`,
      auth
    );
    if (jiraRes.status === 401) return res.status(401).json({ error: 'Invalid credentials' });
    if (!jiraRes.ok) return res.status(jiraRes.status).json({ error: 'Jira error' });
    const data = await jiraRes.json();
    res.json({ values: data.values, isLast: data.isLast, total: data.total, startAt: data.startAt });
  } catch (e) {
    res.status(502).json({ error: 'Could not reach Jira' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Jira Dashboard running at http://localhost:${PORT}`));
```

- [ ] **Step 2: Verify server starts**

```bash
cd tools/jira-dashboard && node server.js
```

Expected: `Jira Dashboard running at http://localhost:3000`
Expected: NO `ERROR: config.json not found` message.

- [ ] **Step 3: Test /api/config responds**

```bash
curl http://localhost:3000/api/config
```

Expected: `{"projects":[...]}` matching your config.json.

- [ ] **Step 4: Commit**

```bash
git add tools/jira-dashboard/server.js
git commit -m "feat: add express proxy server with Jira endpoints"
```

---

## Chunk 2: Data Processing Layer

### Task 3: metrics.js — pure computation

**Files:**
- Create: `tools/jira-dashboard/public/metrics.js`
- Create: `tools/jira-dashboard/tests/metrics.test.js`

`metrics.js` is pure functions only — no browser APIs, no side effects. Takes a normalized issues array, returns health tile values and flagged cards.

Normalized issue shape:
```javascript
{
  key: 'SALINA-42',
  fields: {
    summary: 'Card title',
    assignee: { displayName: 'Dev A', accountId: 'a1' },
    status: { name: 'Done' },
    created: '2026-04-01T10:00:00.000Z',
    ai_assisted: 'Y',       // 'Y', 'N', or null if not logged
    rework_required: 'N',   // 'Y', 'N', or null
    session_count: '1',     // string number or null
  }
}
```

- [ ] **Step 1: Write failing tests**

```javascript
// tests/metrics.test.js
import { strict as assert } from 'assert';
import { test } from 'node:test';
import { computeMetrics, computePerDeveloper } from '../public/metrics.js';

const base = {
  key: 'T-1',
  fields: {
    assignee: { displayName: 'Dev A', accountId: 'a1' },
    ai_assisted: 'Y',
    rework_required: 'N',
    session_count: '1',
  },
};

test('1-session rate: all single session', () => {
  const issues = [
    { ...base, fields: { ...base.fields, session_count: '1' } },
    { ...base, fields: { ...base.fields, session_count: '1' } },
  ];
  const r = computeMetrics(issues);
  assert.equal(r.oneSessionRate, 1.0);
  assert.equal(r.oneSessionTotal, 2);
});

test('1-session rate: mixed', () => {
  const issues = [
    { ...base, fields: { ...base.fields, session_count: '1' } },
    { ...base, fields: { ...base.fields, session_count: '2' } },
  ];
  assert.equal(computeMetrics(issues).oneSessionRate, 0.5);
});

test('null session_count excluded from denominator', () => {
  const issues = [
    { ...base, fields: { ...base.fields, session_count: '1' } },
    { ...base, fields: { ...base.fields, session_count: null } },
  ];
  const r = computeMetrics(issues);
  assert.equal(r.oneSessionRate, 1.0);
  assert.equal(r.oneSessionMissing, 1);
});

test('AI-assisted rate excludes null from denominator', () => {
  const issues = [
    { ...base, fields: { ...base.fields, ai_assisted: 'Y' } },
    { ...base, fields: { ...base.fields, ai_assisted: 'N' } },
    { ...base, fields: { ...base.fields, ai_assisted: null } },
  ];
  const r = computeMetrics(issues);
  assert.equal(r.aiAssistedRate, 0.5);
  assert.equal(r.aiAssistedMissing, 1);
});

test('rework rate', () => {
  const issues = [
    { ...base, fields: { ...base.fields, rework_required: 'Y' } },
    { ...base, fields: { ...base.fields, rework_required: 'N' } },
  ];
  assert.equal(computeMetrics(issues).reworkRate, 0.5);
});

test('avg session count', () => {
  const issues = [
    { ...base, fields: { ...base.fields, session_count: '1' } },
    { ...base, fields: { ...base.fields, session_count: '3' } },
  ];
  assert.equal(computeMetrics(issues).avgSessionCount, 2.0);
});

test('flagged: session_count > 1', () => {
  const issues = [
    { ...base, key: 'T-1', fields: { ...base.fields, session_count: '1' } },
    { ...base, key: 'T-2', fields: { ...base.fields, session_count: '2' } },
  ];
  const r = computeMetrics(issues);
  assert.equal(r.flagged.length, 1);
  assert.equal(r.flagged[0].key, 'T-2');
});

test('flagged: rework_required = Y', () => {
  const issues = [
    { ...base, key: 'T-1', fields: { ...base.fields, rework_required: 'N' } },
    { ...base, key: 'T-2', fields: { ...base.fields, rework_required: 'Y' } },
  ];
  const r = computeMetrics(issues);
  assert.equal(r.flagged.length, 1);
  assert.equal(r.flagged[0].key, 'T-2');
});

test('computePerDeveloper groups by accountId', () => {
  const issues = [
    { key: 'T-1', fields: { assignee: { displayName: 'Dev A', accountId: 'a1' }, ai_assisted: 'Y', rework_required: 'N', session_count: '1' } },
    { key: 'T-2', fields: { assignee: { displayName: 'Dev A', accountId: 'a1' }, ai_assisted: 'N', rework_required: 'Y', session_count: '2' } },
    { key: 'T-3', fields: { assignee: { displayName: 'Dev B', accountId: 'b1' }, ai_assisted: 'Y', rework_required: 'N', session_count: '1' } },
  ];
  const rows = computePerDeveloper(issues);
  assert.equal(rows.length, 2);
  const devA = rows.find(r => r.accountId === 'a1');
  assert.equal(devA.cardCount, 2);
  assert.equal(devA.aiAssistedRate, 0.5);
  assert.equal(devA.reworkRate, 0.5);
  assert.equal(devA.avgSessionCount, 1.5);
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd tools/jira-dashboard && npm test
```

Expected: `ERR_MODULE_NOT_FOUND` — metrics.js doesn't exist yet.

- [ ] **Step 3: Implement metrics.js**

```javascript
// public/metrics.js

export function computeMetrics(issues) {
  const withSession = issues.filter(i => i.fields.session_count !== null);
  const withAI = issues.filter(i => i.fields.ai_assisted !== null);
  const withRework = issues.filter(i => i.fields.rework_required !== null);

  const oneSessionCount = withSession.filter(i => Number(i.fields.session_count) === 1).length;
  const aiYCount = withAI.filter(i => i.fields.ai_assisted === 'Y').length;
  const reworkYCount = withRework.filter(i => i.fields.rework_required === 'Y').length;
  const totalSessionSum = withSession.reduce((sum, i) => sum + Number(i.fields.session_count), 0);

  const flagged = issues.filter(i =>
    Number(i.fields.session_count) > 1 || i.fields.rework_required === 'Y'
  );

  return {
    oneSessionRate: withSession.length > 0 ? oneSessionCount / withSession.length : null,
    oneSessionTotal: withSession.length,
    oneSessionMissing: issues.length - withSession.length,

    aiAssistedRate: withAI.length > 0 ? aiYCount / withAI.length : null,
    aiAssistedMissing: issues.length - withAI.length,

    reworkRate: withRework.length > 0 ? reworkYCount / withRework.length : null,
    reworkMissing: issues.length - withRework.length,

    avgSessionCount: withSession.length > 0 ? totalSessionSum / withSession.length : null,

    flagged,
  };
}

export function computePerDeveloper(issues) {
  const byDev = {};

  for (const issue of issues) {
    const { assignee } = issue.fields;
    if (!assignee) continue;
    const id = assignee.accountId;
    if (!byDev[id]) byDev[id] = { accountId: id, displayName: assignee.displayName, issues: [] };
    byDev[id].issues.push(issue);
  }

  return Object.values(byDev).map(({ accountId, displayName, issues: devIssues }) => {
    const withAI = devIssues.filter(i => i.fields.ai_assisted !== null);
    const withRework = devIssues.filter(i => i.fields.rework_required !== null);
    const withSession = devIssues.filter(i => i.fields.session_count !== null);

    return {
      accountId,
      displayName,
      cardCount: devIssues.length,
      aiAssistedRate: withAI.length > 0 ? withAI.filter(i => i.fields.ai_assisted === 'Y').length / withAI.length : null,
      reworkRate: withRework.length > 0 ? withRework.filter(i => i.fields.rework_required === 'Y').length / withRework.length : null,
      avgSessionCount: withSession.length > 0 ? withSession.reduce((s, i) => s + Number(i.fields.session_count), 0) / withSession.length : null,
    };
  });
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd tools/jira-dashboard && npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/jira-dashboard/public/metrics.js tools/jira-dashboard/tests/metrics.test.js
git commit -m "feat: add metrics computation module with tests"
```

---

### Task 4: traces.js — changelog to timeline

**Files:**
- Create: `tools/jira-dashboard/public/traces.js`
- Create: `tools/jira-dashboard/tests/traces.test.js`

`traces.js` is pure functions only. Takes a Jira changelog `values` array and issue creation timestamp. Returns an ordered array of timeline nodes.

- [ ] **Step 1: Write failing tests**

```javascript
// tests/traces.test.js
import { strict as assert } from 'assert';
import { test } from 'node:test';
import { buildTimeline, formatDuration } from '../public/traces.js';

const created = '2026-04-01T10:00:00.000Z';

test('empty changelog: single node with current status', () => {
  const result = buildTimeline([], created, 'To Do');
  assert.equal(result.length, 1);
  assert.equal(result[0].status, 'To Do');
  assert.equal(result[0].enteredAt, created);
  assert.equal(result[0].exitedAt, null);
  assert.equal(result[0].durationMs, null);
});

test('full journey: Created → In Progress → Done', () => {
  const changelog = [
    { created: '2026-04-01T11:00:00.000Z', items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }] },
    { created: '2026-04-01T14:00:00.000Z', items: [{ field: 'status', fromString: 'In Progress', toString: 'Done' }] },
  ];
  const result = buildTimeline(changelog, created, 'Done');
  assert.equal(result.length, 3);
  assert.equal(result[0].status, 'To Do');
  assert.equal(result[0].durationMs, 3600000);   // 1 hour
  assert.equal(result[1].status, 'In Progress');
  assert.equal(result[1].durationMs, 10800000);  // 3 hours
  assert.equal(result[2].status, 'Done');
  assert.equal(result[2].exitedAt, null);
});

test('non-status changelog items are ignored', () => {
  const changelog = [
    { created: '2026-04-01T11:00:00.000Z', items: [{ field: 'assignee', fromString: 'Dev A', toString: 'Dev B' }] },
    { created: '2026-04-01T12:00:00.000Z', items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }] },
  ];
  const result = buildTimeline(changelog, created, 'In Progress');
  assert.equal(result.length, 2);
  assert.equal(result[0].status, 'To Do');
});

test('out-of-order changelog entries are sorted by date', () => {
  const changelog = [
    { created: '2026-04-01T14:00:00.000Z', items: [{ field: 'status', fromString: 'In Progress', toString: 'Done' }] },
    { created: '2026-04-01T11:00:00.000Z', items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }] },
  ];
  const result = buildTimeline(changelog, created, 'Done');
  assert.equal(result[0].status, 'To Do');
  assert.equal(result[1].status, 'In Progress');
  assert.equal(result[2].status, 'Done');
});

test('formatDuration: minutes', () => {
  assert.equal(formatDuration(45 * 60 * 1000), '45m');
});

test('formatDuration: hours and minutes', () => {
  assert.equal(formatDuration((2 * 60 + 30) * 60 * 1000), '2h 30m');
});

test('formatDuration: days', () => {
  assert.equal(formatDuration(2 * 24 * 60 * 60 * 1000), '2d');
});

test('formatDuration: null returns dash', () => {
  assert.equal(formatDuration(null), '—');
});
```

- [ ] **Step 2: Run traces tests only — verify they fail**

```bash
cd tools/jira-dashboard && node --test tests/traces.test.js
```

Expected: `ERR_MODULE_NOT_FOUND` — traces.js doesn't exist yet.
Note: `npm test` also runs metrics tests (which will pass). Use the targeted command here to get a clean failure signal.

- [ ] **Step 3: Implement traces.js**

```javascript
// public/traces.js

export function buildTimeline(changelogValues, createdAt, currentStatus) {
  const statusChanges = changelogValues
    .filter(entry => entry.items.some(item => item.field === 'status'))
    .map(entry => {
      const item = entry.items.find(i => i.field === 'status');
      return { at: entry.created, from: item.fromString, to: item.toString };
    })
    .sort((a, b) => new Date(a.at) - new Date(b.at));

  if (statusChanges.length === 0) {
    return [{ status: currentStatus, enteredAt: createdAt, exitedAt: null, durationMs: null }];
  }

  const nodes = [];

  nodes.push({
    status: statusChanges[0].from,
    enteredAt: createdAt,
    exitedAt: statusChanges[0].at,
    durationMs: new Date(statusChanges[0].at) - new Date(createdAt),
  });

  for (let i = 0; i < statusChanges.length - 1; i++) {
    nodes.push({
      status: statusChanges[i].to,
      enteredAt: statusChanges[i].at,
      exitedAt: statusChanges[i + 1].at,
      durationMs: new Date(statusChanges[i + 1].at) - new Date(statusChanges[i].at),
    });
  }

  const last = statusChanges[statusChanges.length - 1];
  nodes.push({ status: last.to, enteredAt: last.at, exitedAt: null, durationMs: null });

  return nodes;
}

export function formatDuration(ms) {
  if (ms === null || ms === undefined) return '—';
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
```

- [ ] **Step 4: Run all tests — verify they pass**

```bash
cd tools/jira-dashboard && npm test
```

Expected: All metrics + traces tests pass.

- [ ] **Step 5: Commit**

```bash
git add tools/jira-dashboard/public/traces.js tools/jira-dashboard/tests/traces.test.js
git commit -m "feat: add changelog-to-timeline module with tests"
```

---

## Chunk 3: API Client + UI Shell

### Task 5: api.js — browser fetch client

**Files:**
- Create: `tools/jira-dashboard/public/api.js`

All Jira API calls go through this module. Handles pagination, 50ms inter-request delay, and 429 retry with exponential backoff. Auth is read from `sessionStorage` on every call.

> Note: `api.js` uses browser APIs (`sessionStorage`, `fetch`, `btoa`) and cannot be unit-tested in Node. Manual verification happens in Task 8.

- [ ] **Step 1: Create api.js**

```javascript
// public/api.js

const DELAY_MS = 50;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function getAuth() {
  return sessionStorage.getItem('jira_auth');
}

function authHeaders() {
  return { 'x-jira-auth': getAuth() };
}

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw { type: 'auth', status: 401 };
  if (res.status === 429) throw { type: 'ratelimit', status: 429 };
  if (!res.ok) throw { type: 'error', status: res.status };
  return res.json();
}

async function get(path) {
  const res = await fetch(path, { headers: authHeaders() });
  if (res.status === 401) throw { type: 'auth', status: 401 };
  if (res.status === 429) throw { type: 'ratelimit', status: 429 };
  if (!res.ok) throw { type: 'error', status: res.status };
  return res.json();
}

/** Called once after auth modal. Resolves field IDs and stores auth in sessionStorage. */
export async function resolveFields(email, token) {
  const auth = `Basic ${btoa(`${email}:${token}`)}`;
  const res = await fetch('/api/resolve-fields', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth }),
  });
  if (res.status === 401) throw { type: 'auth', status: 401 };
  if (!res.ok) throw { type: 'error', status: res.status };
  const data = await res.json();
  sessionStorage.setItem('jira_auth', auth);
  return data;
}

export async function fetchConfig() {
  const res = await fetch('/api/config');
  return res.json();
}

export async function fetchSprints(boardId) {
  return get(`/api/sprints?boardId=${boardId}`);
}

/** Fetches ALL issues matching JQL across pages. */
export async function fetchAllIssues(jql) {
  let startAt = 0;
  let allIssues = [];
  let total = Infinity;

  while (startAt < total) {
    const data = await post('/api/issues', { jql, startAt });
    allIssues = allIssues.concat(data.issues);
    total = data.total;
    startAt += data.issues.length;
    if (startAt < total) await sleep(DELAY_MS);
  }

  return allIssues;
}

/** Fetches full changelog for one issue. Retries up to 3x on 429. */
export async function fetchChangelog(issueKey) {
  let startAt = 0;
  let allValues = [];
  let isLast = false;

  while (!isLast) {
    let attempts = 0;
    let data;

    while (attempts < 3) {
      try {
        data = await post('/api/changelog', { issueKey, startAt });
        break;
      } catch (e) {
        if (e.type === 'ratelimit' && attempts < 2) {
          attempts++;
          await sleep(Math.pow(2, attempts) * 1000);
        } else {
          throw e;
        }
      }
    }

    allValues = allValues.concat(data.values);
    isLast = data.isLast;
    startAt += data.values.length;
    if (!isLast) await sleep(DELAY_MS);
  }

  return allValues;
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/jira-dashboard/public/api.js
git commit -m "feat: add Jira API browser client with pagination and retry"
```

---

### Task 6: index.html + styles.css

**Files:**
- Create: `tools/jira-dashboard/public/index.html`
- Create: `tools/jira-dashboard/public/styles.css`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jira Sprint Dashboard</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- Auth Modal -->
  <div id="auth-modal" class="modal-overlay">
    <div class="modal-box">
      <h2>Connect to Jira</h2>
      <p>Enter your Jira email and API token. These are stored in your browser session only.</p>
      <label>Email
        <input id="auth-email" type="email" placeholder="you@company.com" autocomplete="username">
      </label>
      <label>API Token
        <input id="auth-token" type="password" placeholder="Your Jira API token" autocomplete="current-password">
      </label>
      <p id="auth-error" class="error-msg hidden"></p>
      <button id="auth-submit" class="btn-primary">Connect</button>
    </div>
  </div>

  <!-- Top bar -->
  <header class="top-bar">
    <span class="dashboard-title">Jira Sprint Dashboard</span>
    <button id="disconnect-btn" class="btn-link">Disconnect</button>
  </header>

  <!-- Global banner -->
  <div id="global-banner" class="global-banner hidden"></div>

  <!-- Filter bar -->
  <section class="filter-bar">
    <div class="filter-group">
      <label>Projects</label>
      <select id="filter-projects" multiple size="4"></select>
    </div>
    <div class="filter-group">
      <label>Developers</label>
      <select id="filter-developers" multiple size="4"></select>
    </div>
    <div class="filter-group">
      <label>Sprints</label>
      <select id="filter-sprints" multiple size="4"></select>
    </div>
    <div class="filter-actions">
      <button id="load-btn" class="btn-primary" disabled>Load Data</button>
    </div>
  </section>

  <!-- Main content -->
  <main id="main-content" class="hidden">
    <section id="health-tiles" class="panel tiles-row"></section>

    <section class="panel">
      <h2>Card Lifecycle Traces</h2>
      <div id="trace-panel"></div>
    </section>

    <section class="panel">
      <h2>AI Metrics by Developer</h2>
      <div id="ai-table"></div>
    </section>

    <section class="panel">
      <h2>Flagged Cards</h2>
      <div id="flagged-panel"></div>
    </section>
  </main>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create styles.css**

```css
/* ---- Reset + Base ---- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #1a1a1a; }
.hidden { display: none !important; }
.error-msg { color: #d32f2f; font-size: 0.875rem; }

/* ---- Auth Modal ---- */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal-box { background: #fff; padding: 2rem; border-radius: 8px; width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 1rem; }
.modal-box h2 { font-size: 1.25rem; }
.modal-box label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; font-weight: 600; }
.modal-box input { padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }

/* ---- Top bar ---- */
.top-bar { background: #0052CC; color: #fff; padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
.dashboard-title { font-weight: 700; font-size: 1rem; }

/* ---- Global Banner ---- */
.global-banner { background: #fff3e0; border-left: 4px solid #f57c00; padding: 0.75rem 1.5rem; font-size: 0.875rem; }
.global-banner.error { background: #fce4ec; border-color: #d32f2f; }

/* ---- Buttons ---- */
.btn-primary { background: #0052CC; color: #fff; border: none; padding: 0.5rem 1.25rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; }
.btn-primary:disabled { background: #ccc; cursor: not-allowed; }
.btn-link { background: none; border: none; color: #fff; cursor: pointer; text-decoration: underline; font-size: 0.875rem; }

/* ---- Filter bar ---- */
.filter-bar { display: flex; gap: 1rem; align-items: flex-end; padding: 1rem 1.5rem; background: #fff; border-bottom: 1px solid #e0e0e0; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.875rem; font-weight: 600; }
.filter-group select { min-width: 160px; border: 1px solid #ccc; border-radius: 4px; padding: 0.25rem; }
.filter-actions { align-self: flex-end; }

/* ---- Panels ---- */
.panel { background: #fff; margin: 1rem 1.5rem; padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.panel h2 { font-size: 1rem; font-weight: 700; margin-bottom: 1rem; color: #333; }

/* ---- Health Tiles ---- */
.tiles-row { display: flex; gap: 1rem; flex-wrap: wrap; }
.tile { flex: 1; min-width: 160px; padding: 1.25rem; border-radius: 8px; background: #f0f4ff; }
.tile .tile-label { font-size: 0.75rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.05em; }
.tile .tile-value { font-size: 2rem; font-weight: 700; color: #0052CC; margin: 0.25rem 0; }
.tile .tile-value.warn { color: #e65100; }
.tile .tile-missing { font-size: 0.75rem; color: #888; }

/* ---- Card Traces ---- */
.card-trace { border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 0.75rem; overflow: hidden; }
.card-trace-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; background: #fafafa; flex-wrap: wrap; }
.card-trace-header:hover { background: #f0f0f0; }
.card-key { font-weight: 700; font-size: 0.85rem; color: #0052CC; }
.card-assignee { font-size: 0.8rem; color: #666; }
.card-badges { display: flex; gap: 0.5rem; margin-left: auto; flex-wrap: wrap; }
.badge { font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 999px; background: #e3f2fd; color: #1565c0; }
.badge.warn { background: #fff3e0; color: #e65100; }
.badge.incomplete { background: #fce4ec; color: #c62828; }
.card-trace-body { padding: 1rem; }
.timeline { display: flex; align-items: center; overflow-x: auto; padding-bottom: 0.5rem; }
.timeline-node { display: flex; flex-direction: column; align-items: center; min-width: 80px; }
.node-label { font-size: 0.7rem; font-weight: 600; color: #333; white-space: nowrap; text-align: center; }
.node-dot { width: 12px; height: 12px; border-radius: 50%; background: #0052CC; margin: 0.25rem 0; }
.node-date { font-size: 0.65rem; color: #888; }
.timeline-connector { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 60px; }
.connector-line { width: 100%; height: 2px; background: #ccc; }
.connector-label { font-size: 0.65rem; color: #888; white-space: nowrap; margin-top: 0.2rem; }

/* ---- AI Metrics Table ---- */
table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
th { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid #e0e0e0; color: #555; font-weight: 600; }
td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f0f0f0; }
tr:hover td { background: #fafafa; }
.rate-warn { color: #e65100; font-weight: 600; }

/* ---- Flagged Cards ---- */
.flagged-list { list-style: none; }
.flagged-item { display: flex; align-items: center; gap: 1rem; padding: 0.6rem 0; border-bottom: 1px solid #f0f0f0; font-size: 0.875rem; flex-wrap: wrap; }
.flagged-item:last-child { border-bottom: none; }
.flagged-key { font-weight: 700; color: #0052CC; min-width: 80px; }
.empty-state { color: #888; font-size: 0.875rem; padding: 1rem 0; }
```

- [ ] **Step 3: Start server and verify shell loads**

```bash
cd tools/jira-dashboard && node server.js
# Open http://localhost:3000
```

Expected: Auth modal visible over a blue top bar. No JS errors in console (app.js doesn't exist yet — ignore the module load error for now).

- [ ] **Step 4: Commit**

```bash
git add tools/jira-dashboard/public/index.html tools/jira-dashboard/public/styles.css
git commit -m "feat: add dashboard HTML shell and CSS"
```

---

## Chunk 4: UI Modules + Wiring

### Task 7: auth-modal.js + filter-bar.js

**Files:**
- Create: `tools/jira-dashboard/public/ui/auth-modal.js`
- Create: `tools/jira-dashboard/public/ui/filter-bar.js`

- [ ] **Step 1: Create auth-modal.js**

```javascript
// public/ui/auth-modal.js

export function showAuthModal() {
  document.getElementById('auth-modal').classList.remove('hidden');
}

export function hideAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

export function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

export function clearAuthError() {
  const el = document.getElementById('auth-error');
  el.textContent = '';
  el.classList.add('hidden');
}

export function getCredentials() {
  return {
    email: document.getElementById('auth-email').value.trim(),
    token: document.getElementById('auth-token').value.trim(),
  };
}
```

- [ ] **Step 2: Create filter-bar.js**

```javascript
// public/ui/filter-bar.js

export function populateProjects(projects) {
  const sel = document.getElementById('filter-projects');
  sel.innerHTML = '';
  for (const p of projects) {
    const opt = document.createElement('option');
    opt.value = p.key;
    opt.textContent = p.key;
    sel.appendChild(opt);
  }
}

export function populateSprints(sprintsByBoard) {
  const sel = document.getElementById('filter-sprints');
  sel.innerHTML = '';
  const seen = new Set();
  for (const sprints of Object.values(sprintsByBoard)) {
    for (const sprint of (sprints.values || [])) {
      if (seen.has(sprint.id)) continue;
      seen.add(sprint.id);
      const opt = document.createElement('option');
      opt.value = sprint.id;
      opt.textContent = sprint.name;
      sel.appendChild(opt);
    }
  }
}

export function populateDevelopers(issues) {
  const sel = document.getElementById('filter-developers');
  const seen = new Set();
  // Preserve existing selections
  const existing = getSelected('filter-developers');
  sel.innerHTML = '';
  for (const issue of issues) {
    const a = issue.fields.assignee;
    if (!a || seen.has(a.accountId)) continue;
    seen.add(a.accountId);
    const opt = document.createElement('option');
    opt.value = a.accountId;
    opt.textContent = a.displayName;
    opt.selected = existing.includes(a.accountId);
    sel.appendChild(opt);
  }
}

export function getSelected(selectId) {
  const sel = document.getElementById(selectId);
  return Array.from(sel.selectedOptions).map(o => o.value);
}

export function enableLoadButton() {
  document.getElementById('load-btn').disabled = false;
}
```

- [ ] **Step 3: Commit**

```bash
git add tools/jira-dashboard/public/ui/auth-modal.js tools/jira-dashboard/public/ui/filter-bar.js
git commit -m "feat: add auth modal and filter bar UI modules"
```

---

### Task 8: health-tiles.js + flagged-panel.js + ai-table.js + trace-panel.js

**Files:**
- Create: `tools/jira-dashboard/public/ui/health-tiles.js`
- Create: `tools/jira-dashboard/public/ui/flagged-panel.js`
- Create: `tools/jira-dashboard/public/ui/ai-table.js`
- Create: `tools/jira-dashboard/public/ui/trace-panel.js`

- [ ] **Step 1: Create health-tiles.js**

```javascript
// public/ui/health-tiles.js

function pct(rate) {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

export function renderHealthTiles(metrics) {
  document.getElementById('health-tiles').innerHTML = `
    <div class="tile">
      <div class="tile-label">1-Session Rate</div>
      <div class="tile-value ${metrics.oneSessionRate !== null && metrics.oneSessionRate < 0.85 ? 'warn' : ''}">${pct(metrics.oneSessionRate)}</div>
      <div class="tile-missing">${metrics.oneSessionMissing > 0 ? `${metrics.oneSessionMissing} cards missing field` : `${metrics.oneSessionTotal} cards`}</div>
    </div>
    <div class="tile">
      <div class="tile-label">AI-Assisted Rate</div>
      <div class="tile-value">${pct(metrics.aiAssistedRate)}</div>
      <div class="tile-missing">${metrics.aiAssistedMissing > 0 ? `${metrics.aiAssistedMissing} cards missing field` : ''}</div>
    </div>
    <div class="tile">
      <div class="tile-label">Rework Rate</div>
      <div class="tile-value ${metrics.reworkRate !== null && metrics.reworkRate > 0.10 ? 'warn' : ''}">${pct(metrics.reworkRate)}</div>
      <div class="tile-missing">${metrics.reworkMissing > 0 ? `${metrics.reworkMissing} cards missing field` : ''}</div>
    </div>
    <div class="tile">
      <div class="tile-label">Avg Sessions</div>
      <div class="tile-value ${metrics.avgSessionCount !== null && metrics.avgSessionCount > 1.5 ? 'warn' : ''}">${metrics.avgSessionCount !== null ? metrics.avgSessionCount.toFixed(1) : '—'}</div>
    </div>
  `;
}
```

- [ ] **Step 2: Create flagged-panel.js**

```javascript
// public/ui/flagged-panel.js

export function renderFlagged(flaggedIssues) {
  const container = document.getElementById('flagged-panel');
  if (flaggedIssues.length === 0) {
    container.innerHTML = '<p class="empty-state">No flagged cards. Good sprint.</p>';
    return;
  }
  container.innerHTML = `<ul class="flagged-list">${flaggedIssues.map(issue => {
    const f = issue.fields;
    const reasons = [];
    if (f.session_count && Number(f.session_count) > 1) reasons.push(`${f.session_count} sessions`);
    if (f.rework_required === 'Y') reasons.push('Rework required');
    return `<li class="flagged-item">
      <span class="flagged-key">${issue.key}</span>
      <span>${f.summary}</span>
      <span class="card-assignee">${f.assignee?.displayName ?? 'Unassigned'}</span>
      <span style="color:#e65100;font-size:0.8rem">${reasons.join(' · ')}</span>
    </li>`;
  }).join('')}</ul>`;
}
```

- [ ] **Step 3: Create ai-table.js**

```javascript
// public/ui/ai-table.js

function pct(rate) {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

const COLS = ['displayName', 'cardCount', 'aiAssistedRate', 'reworkRate', 'avgSessionCount'];
let sortCol = 'cardCount';
let sortDir = -1; // -1 = desc, 1 = asc
let _rows = [];

function sortRows(rows, col, dir) {
  return [...rows].sort((a, b) => {
    const av = a[col] ?? -Infinity;
    const bv = b[col] ?? -Infinity;
    if (av < bv) return dir;
    if (av > bv) return -dir;
    return 0;
  });
}

export function renderAITable(rows) {
  _rows = rows;
  _render();
}

function _render() {
  const container = document.getElementById('ai-table');
  if (_rows.length === 0) {
    container.innerHTML = '<p class="empty-state">No data.</p>';
    return;
  }
  const sorted = sortRows(_rows, sortCol, sortDir);
  const arrow = col => col === sortCol ? (sortDir === -1 ? ' ▼' : ' ▲') : '';

  container.innerHTML = `<table>
    <thead><tr>
      <th data-col="displayName">Developer${arrow('displayName')}</th>
      <th data-col="cardCount">Cards${arrow('cardCount')}</th>
      <th data-col="aiAssistedRate">AI-Assisted %${arrow('aiAssistedRate')}</th>
      <th data-col="reworkRate">Rework %${arrow('reworkRate')}</th>
      <th data-col="avgSessionCount">Avg Sessions${arrow('avgSessionCount')}</th>
    </tr></thead>
    <tbody>${sorted.map(r => `<tr>
      <td>${r.displayName}</td>
      <td>${r.cardCount}</td>
      <td>${pct(r.aiAssistedRate)}</td>
      <td class="${r.reworkRate !== null && r.reworkRate > 0.10 ? 'rate-warn' : ''}">${pct(r.reworkRate)}</td>
      <td class="${r.avgSessionCount !== null && r.avgSessionCount > 1.5 ? 'rate-warn' : ''}">${r.avgSessionCount !== null ? r.avgSessionCount.toFixed(1) : '—'}</td>
    </tr>`).join('')}</tbody>
  </table>`;

  // Wire sort clicks
  container.querySelectorAll('th[data-col]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      sortDir = col === sortCol ? -sortDir : -1;
      sortCol = col;
      _render();
    });
  });
}
```

- [ ] **Step 4: Create trace-panel.js**

```javascript
// public/ui/trace-panel.js
import { formatDuration } from '../traces.js';

export function renderTraces(issues) {
  const container = document.getElementById('trace-panel');
  if (issues.length === 0) {
    container.innerHTML = '<p class="empty-state">No cards found.</p>';
    return;
  }
  container.innerHTML = issues.map(issue => {
    const f = issue.fields;
    const incomplete = issue.timeline === null;
    const badges = [
      f.ai_assisted === 'Y' ? '<span class="badge">AI ✓</span>' : f.ai_assisted === 'N' ? '<span class="badge">AI ✗</span>' : '',
      f.rework_required === 'Y' ? '<span class="badge warn">Rework</span>' : '',
      f.session_count ? `<span class="badge">S:${f.session_count}</span>` : '',
      incomplete ? '<span class="badge incomplete">⚠ Incomplete trace</span>' : '',
    ].join('');

    return `<div class="card-trace">
      <div class="card-trace-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
        <span class="card-key">${issue.key}</span>
        <span>${f.summary}</span>
        <span class="card-assignee">${f.assignee?.displayName ?? 'Unassigned'}</span>
        <div class="card-badges">${badges}</div>
      </div>
      <div class="card-trace-body hidden">
        ${incomplete ? '<p class="empty-state">No trace data available.</p>' : buildTimelineHtml(issue.timeline)}
      </div>
    </div>`;
  }).join('');
}

function buildTimelineHtml(timeline) {
  if (!timeline || timeline.length === 0) return '';
  return `<div class="timeline">${timeline.map((node, i) => {
    const isLast = i === timeline.length - 1;
    return `<div class="timeline-node">
        <div class="node-label">${node.status}</div>
        <div class="node-dot"></div>
        <div class="node-date">${new Date(node.enteredAt).toLocaleDateString()}</div>
      </div>${!isLast ? `<div class="timeline-connector">
        <div class="connector-line"></div>
        <div class="connector-label">${formatDuration(node.durationMs)}</div>
      </div>` : ''}`;
  }).join('')}</div>`;
}
```

- [ ] **Step 5: Commit**

```bash
git add tools/jira-dashboard/public/ui/
git commit -m "feat: add panel renderer modules (tiles, traces, AI table, flagged)"
```

---

### Task 9: app.js — orchestration

**Files:**
- Create: `tools/jira-dashboard/public/app.js`

`app.js` imports everything and wires up the full load flow.

- [ ] **Step 1: Create app.js**

```javascript
// public/app.js
import { resolveFields, fetchConfig, fetchSprints, fetchAllIssues, fetchChangelog } from './api.js';
import { computeMetrics, computePerDeveloper } from './metrics.js';
import { buildTimeline } from './traces.js';
import { showAuthModal, hideAuthModal, showAuthError, clearAuthError, getCredentials } from './ui/auth-modal.js';
import { populateProjects, populateSprints, populateDevelopers, getSelected, enableLoadButton } from './ui/filter-bar.js';
import { renderHealthTiles } from './ui/health-tiles.js';
import { renderTraces } from './ui/trace-panel.js';
import { renderAITable } from './ui/ai-table.js';
import { renderFlagged } from './ui/flagged-panel.js';

function showBanner(msg, type = 'warn') {
  const el = document.getElementById('global-banner');
  el.textContent = msg;
  el.className = `global-banner${type === 'error' ? ' error' : ''}`;
  el.classList.remove('hidden');
}

function hideBanner() {
  document.getElementById('global-banner').classList.add('hidden');
}

async function postAuthSetup() {
  const { projects } = await fetchConfig();
  populateProjects(projects);

  const sprintsByBoard = {};
  for (const project of projects) {
    try {
      sprintsByBoard[project.board_id] = await fetchSprints(project.board_id);
    } catch (e) {
      console.warn(`Could not fetch sprints for board ${project.board_id}`, e);
    }
  }
  populateSprints(sprintsByBoard);
  enableLoadButton();
}

async function loadData() {
  hideBanner();
  const loadBtn = document.getElementById('load-btn');
  loadBtn.disabled = true;
  loadBtn.textContent = 'Loading…';

  try {
    const selectedProjects = getSelected('filter-projects');
    const selectedSprints = getSelected('filter-sprints');
    const selectedDevs = getSelected('filter-developers');

    if (selectedProjects.length === 0) {
      showBanner('Select at least one project.');
      return;
    }

    const sprintClause = selectedSprints.length > 0 ? ` AND sprint IN (${selectedSprints.join(',')})` : '';
    // accountId values must be quoted in JQL (e.g. "712020:abc123")
    const assigneeClause = selectedDevs.length > 0 ? ` AND assignee IN (${selectedDevs.map(id => `"${id}"`).join(',')})` : '';
    const jql = `project IN (${selectedProjects.map(p => `"${p}"`).join(',')})${sprintClause}${assigneeClause} ORDER BY created DESC`;

    const allIssues = await fetchAllIssues(jql);

    if (allIssues.length === 0) {
      document.getElementById('main-content').classList.remove('hidden');
      showBanner('No cards found for this selection.');
      return;
    }

    populateDevelopers(allIssues);

    // Fetch changelogs sequentially, tolerate individual failures.
    // Delay is applied AFTER each fetch (not before the first) to avoid unnecessary latency.
    // fetchChangelog also applies 50ms between its own pagination pages internally.
    const changelogMap = {};
    let incompleteCount = 0;
    for (const issue of allIssues) {
      try {
        changelogMap[issue.key] = await fetchChangelog(issue.key);
      } catch (e) {
        changelogMap[issue.key] = null;
        incompleteCount++;
      }
      await new Promise(r => setTimeout(r, 50));
    }

    if (incompleteCount > 0) {
      showBanner(`${incompleteCount} card(s) have incomplete trace data. Try refreshing.`);
    }

    const issuesWithTimelines = allIssues.map(issue => ({
      ...issue,
      timeline: changelogMap[issue.key]
        ? buildTimeline(changelogMap[issue.key], issue.fields.created, issue.fields.status.name)
        : null,
    }));

    const metrics = computeMetrics(allIssues);
    const perDeveloper = computePerDeveloper(allIssues);

    renderHealthTiles(metrics);
    renderTraces(issuesWithTimelines);
    renderAITable(perDeveloper);
    renderFlagged(metrics.flagged);

    document.getElementById('main-content').classList.remove('hidden');

  } catch (e) {
    if (e.type === 'auth') {
      sessionStorage.clear();
      showAuthModal();
    } else {
      showBanner('Unable to reach Jira — check your connection or Jira status.', 'error');
    }
  } finally {
    loadBtn.disabled = false;
    loadBtn.textContent = 'Load Data';
  }
}

async function init() {
  if (sessionStorage.getItem('jira_auth')) {
    await postAuthSetup();
  } else {
    showAuthModal();
  }

  document.getElementById('auth-submit').addEventListener('click', async () => {
    clearAuthError();
    const { email, token } = getCredentials();
    if (!email || !token) { showAuthError('Email and token are required.'); return; }
    try {
      const result = await resolveFields(email, token);
      if (result.missing?.length > 0) {
        showBanner(`Warning: Could not resolve Jira fields: ${result.missing.join(', ')}. Some metrics will show —`);
      }
      hideAuthModal();
      await postAuthSetup();
    } catch (e) {
      showAuthError(e.type === 'auth' ? 'Invalid credentials. Check your email and API token.' : 'Could not reach Jira. Check your connection.');
    }
  });

  document.getElementById('disconnect-btn').addEventListener('click', () => {
    sessionStorage.clear();
    location.reload();
  });

  document.getElementById('load-btn').addEventListener('click', loadData);
}

init();
```

- [ ] **Step 2: Commit**

```bash
git add tools/jira-dashboard/public/app.js
git commit -m "feat: add app orchestration and full load flow"
```

---

### Task 10: Full smoke test + README

- [ ] **Step 1: Run unit tests one final time**

```bash
cd tools/jira-dashboard && npm test
```

Expected: All tests pass.

- [ ] **Step 2: Full manual smoke test in browser**

```bash
cd tools/jira-dashboard && node server.js
# Open http://localhost:3000
```

Verify in order:
1. Auth modal shows on load
2. Enter valid Jira email + API token → modal closes, project and sprint filters populate
3. Select a project and at least one sprint → click Load Data
4. Health tiles appear with correct percentages (or `—` if fields not logged)
5. Card traces list appears — click a card header to expand the timeline
6. AI metrics table shows per-developer rows, sortable columns
7. Flagged cards panel shows cards with `session_count > 1` or `rework_required = Y`
8. Filter by specific developer — content updates on next Load
9. Click any column header in the AI Metrics table — rows re-sort, arrow indicator updates
10. Disconnect button clears session and shows auth modal again
11. **401 re-auth test:** Reload the page, enter an invalid API token → Connect → expect error message "Invalid credentials" in the modal (modal stays open)
12. **Empty result test:** Select a sprint with no cards → Load Data → expect "No cards found" state in traces panel
13. **Field warning test:** If any of the 3 custom fields is absent in your Jira instance, the warning banner should appear after Connect
14. Banner appears for incomplete traces if any changelog fetch failed

- [ ] **Step 3: Create README.md**

```markdown
# Jira Session Sprint Dashboard

Internal dashboard for IT Team Leads to measure session-based sprint system performance.

## Setup

1. `cp config.example.json config.json`
2. Edit `config.json` — add your Jira base URL and board IDs for each project
3. `npm install`
4. `node server.js`
5. Open [http://localhost:3000](http://localhost:3000)

## Usage

Enter your Jira email and API token on first load. Credentials are stored in your browser session only and cleared when the tab closes.

## Custom Field Names

The dashboard resolves three Jira custom fields by their exact display names:
- `AI-assisted`
- `Rework required`
- `Session count`

If your fields have different display names, update the `find()` calls in `server.js` (lines near `fieldCache =`).

## Running Tests

```bash
npm test
```

Tests cover `metrics.js` and `traces.js` (pure computation modules).
```

- [ ] **Step 4: Final commit**

```bash
git add tools/jira-dashboard/README.md
git commit -m "docs: add jira-dashboard README with setup instructions"
```

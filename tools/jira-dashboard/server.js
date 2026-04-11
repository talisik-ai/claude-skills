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

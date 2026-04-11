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

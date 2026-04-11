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

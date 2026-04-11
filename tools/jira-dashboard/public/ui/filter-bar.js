const STORAGE_KEY = 'jira_dashboard_projects';

// --- Project persistence (localStorage) ---

export function getStoredProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function addProject(key, boardId) {
  const projects = getStoredProjects();
  if (projects.some(p => p.key === key)) return false; // duplicate
  projects.push({ key: key.toUpperCase(), board_id: Number(boardId) });
  saveProjects(projects);
  return true;
}

export function removeProject(key) {
  saveProjects(getStoredProjects().filter(p => p.key !== key));
}

// --- Project config UI ---

export function renderProjectList(onChangeCallback) {
  const list = document.getElementById('project-list');
  const projects = getStoredProjects();
  list.innerHTML = projects.length === 0
    ? '<li style="color:#999;font-size:0.8rem">No projects configured yet.</li>'
    : projects.map(p => `
        <li class="project-list-item">
          <span class="project-key">${p.key}</span>
          <span class="project-board">Board ID: ${p.board_id}</span>
          <button data-key="${p.key}" title="Remove">✕</button>
        </li>`).join('');

  list.querySelectorAll('button[data-key]').forEach(btn => {
    btn.addEventListener('click', () => {
      removeProject(btn.dataset.key);
      renderProjectList(onChangeCallback);
      onChangeCallback();
    });
  });
}

// --- Filter selects ---

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

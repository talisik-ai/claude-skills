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

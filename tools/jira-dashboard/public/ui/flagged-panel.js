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

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

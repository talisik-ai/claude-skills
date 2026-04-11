function pct(rate) {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`;
}

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

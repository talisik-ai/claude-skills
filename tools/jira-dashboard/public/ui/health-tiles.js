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

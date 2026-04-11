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

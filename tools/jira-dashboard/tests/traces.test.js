import { strict as assert } from 'assert';
import { test } from 'node:test';
import { buildTimeline, formatDuration } from '../public/traces.js';

const created = '2026-04-01T10:00:00.000Z';

test('empty changelog: single node with current status', () => {
  const result = buildTimeline([], created, 'To Do');
  assert.equal(result.length, 1);
  assert.equal(result[0].status, 'To Do');
  assert.equal(result[0].enteredAt, created);
  assert.equal(result[0].exitedAt, null);
  assert.equal(result[0].durationMs, null);
});

test('full journey: Created → In Progress → Done', () => {
  const changelog = [
    { created: '2026-04-01T11:00:00.000Z', items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }] },
    { created: '2026-04-01T14:00:00.000Z', items: [{ field: 'status', fromString: 'In Progress', toString: 'Done' }] },
  ];
  const result = buildTimeline(changelog, created, 'Done');
  assert.equal(result.length, 3);
  assert.equal(result[0].status, 'To Do');
  assert.equal(result[0].durationMs, 3600000);   // 1 hour
  assert.equal(result[1].status, 'In Progress');
  assert.equal(result[1].durationMs, 10800000);  // 3 hours
  assert.equal(result[2].status, 'Done');
  assert.equal(result[2].exitedAt, null);
});

test('non-status changelog items are ignored', () => {
  const changelog = [
    { created: '2026-04-01T11:00:00.000Z', items: [{ field: 'assignee', fromString: 'Dev A', toString: 'Dev B' }] },
    { created: '2026-04-01T12:00:00.000Z', items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }] },
  ];
  const result = buildTimeline(changelog, created, 'In Progress');
  assert.equal(result.length, 2);
  assert.equal(result[0].status, 'To Do');
});

test('out-of-order changelog entries are sorted by date', () => {
  const changelog = [
    { created: '2026-04-01T14:00:00.000Z', items: [{ field: 'status', fromString: 'In Progress', toString: 'Done' }] },
    { created: '2026-04-01T11:00:00.000Z', items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }] },
  ];
  const result = buildTimeline(changelog, created, 'Done');
  assert.equal(result[0].status, 'To Do');
  assert.equal(result[1].status, 'In Progress');
  assert.equal(result[2].status, 'Done');
});

test('formatDuration: minutes', () => {
  assert.equal(formatDuration(45 * 60 * 1000), '45m');
});

test('formatDuration: hours and minutes', () => {
  assert.equal(formatDuration((2 * 60 + 30) * 60 * 1000), '2h 30m');
});

test('formatDuration: days', () => {
  assert.equal(formatDuration(2 * 24 * 60 * 60 * 1000), '2d');
});

test('formatDuration: null returns dash', () => {
  assert.equal(formatDuration(null), '—');
});

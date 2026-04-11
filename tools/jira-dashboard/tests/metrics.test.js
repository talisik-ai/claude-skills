import { strict as assert } from 'assert';
import { test } from 'node:test';
import { computeMetrics, computePerDeveloper } from '../public/metrics.js';

const base = {
  key: 'T-1',
  fields: {
    assignee: { displayName: 'Dev A', accountId: 'a1' },
    ai_assisted: 'Y',
    rework_required: 'N',
    session_count: '1',
  },
};

test('1-session rate: all single session', () => {
  const issues = [
    { ...base, fields: { ...base.fields, session_count: '1' } },
    { ...base, fields: { ...base.fields, session_count: '1' } },
  ];
  const r = computeMetrics(issues);
  assert.equal(r.oneSessionRate, 1.0);
  assert.equal(r.oneSessionTotal, 2);
});

test('1-session rate: mixed', () => {
  const issues = [
    { ...base, fields: { ...base.fields, session_count: '1' } },
    { ...base, fields: { ...base.fields, session_count: '2' } },
  ];
  assert.equal(computeMetrics(issues).oneSessionRate, 0.5);
});

test('null session_count excluded from denominator', () => {
  const issues = [
    { ...base, fields: { ...base.fields, session_count: '1' } },
    { ...base, fields: { ...base.fields, session_count: null } },
  ];
  const r = computeMetrics(issues);
  assert.equal(r.oneSessionRate, 1.0);
  assert.equal(r.oneSessionMissing, 1);
});

test('AI-assisted rate excludes null from denominator', () => {
  const issues = [
    { ...base, fields: { ...base.fields, ai_assisted: 'Y' } },
    { ...base, fields: { ...base.fields, ai_assisted: 'N' } },
    { ...base, fields: { ...base.fields, ai_assisted: null } },
  ];
  const r = computeMetrics(issues);
  assert.equal(r.aiAssistedRate, 0.5);
  assert.equal(r.aiAssistedMissing, 1);
});

test('rework rate', () => {
  const issues = [
    { ...base, fields: { ...base.fields, rework_required: 'Y' } },
    { ...base, fields: { ...base.fields, rework_required: 'N' } },
  ];
  assert.equal(computeMetrics(issues).reworkRate, 0.5);
});

test('avg session count', () => {
  const issues = [
    { ...base, fields: { ...base.fields, session_count: '1' } },
    { ...base, fields: { ...base.fields, session_count: '3' } },
  ];
  assert.equal(computeMetrics(issues).avgSessionCount, 2.0);
});

test('flagged: session_count > 1', () => {
  const issues = [
    { ...base, key: 'T-1', fields: { ...base.fields, session_count: '1' } },
    { ...base, key: 'T-2', fields: { ...base.fields, session_count: '2' } },
  ];
  const r = computeMetrics(issues);
  assert.equal(r.flagged.length, 1);
  assert.equal(r.flagged[0].key, 'T-2');
});

test('flagged: rework_required = Y', () => {
  const issues = [
    { ...base, key: 'T-1', fields: { ...base.fields, rework_required: 'N' } },
    { ...base, key: 'T-2', fields: { ...base.fields, rework_required: 'Y' } },
  ];
  const r = computeMetrics(issues);
  assert.equal(r.flagged.length, 1);
  assert.equal(r.flagged[0].key, 'T-2');
});

test('computePerDeveloper groups by accountId', () => {
  const issues = [
    { key: 'T-1', fields: { assignee: { displayName: 'Dev A', accountId: 'a1' }, ai_assisted: 'Y', rework_required: 'N', session_count: '1' } },
    { key: 'T-2', fields: { assignee: { displayName: 'Dev A', accountId: 'a1' }, ai_assisted: 'N', rework_required: 'Y', session_count: '2' } },
    { key: 'T-3', fields: { assignee: { displayName: 'Dev B', accountId: 'b1' }, ai_assisted: 'Y', rework_required: 'N', session_count: '1' } },
  ];
  const rows = computePerDeveloper(issues);
  assert.equal(rows.length, 2);
  const devA = rows.find(r => r.accountId === 'a1');
  assert.equal(devA.cardCount, 2);
  assert.equal(devA.aiAssistedRate, 0.5);
  assert.equal(devA.reworkRate, 0.5);
  assert.equal(devA.avgSessionCount, 1.5);
});

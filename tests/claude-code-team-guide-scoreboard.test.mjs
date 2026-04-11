import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const GUIDE_PATH = path.resolve('docs/claude-code-team-guide.html');

async function loadScoreboardApi() {
  const html = await readFile(GUIDE_PATH, 'utf8');
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>\s*<\/html>/);

  assert.ok(scriptMatch, 'Expected the team guide to contain an inline script');

  const window = {};
  const document = {
    addEventListener() {},
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    getElementById() {
      return null;
    },
  };

  const context = vm.createContext({
    window,
    document,
    console,
    queueMicrotask,
    setTimeout,
    clearTimeout,
    crypto: globalThis.crypto,
    confirm: () => true,
  });

  vm.runInContext(scriptMatch[1], context);

  return window.TeamGuideScoreboard;
}

function createRequest() {
  return {
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: undefined,
    error: null,
  };
}

function succeed(request, result, extra = {}) {
  queueMicrotask(() => {
    request.result = result;
    Object.assign(request, extra);
    if (typeof request.onsuccess === 'function') {
      request.onsuccess({ target: request });
    }
  });
}

function openResultFactory(storeMap) {
  return {
    objectStoreNames: {
      contains(name) {
        return storeMap.has(name);
      },
    },
    createObjectStore(name, options = {}) {
      if (!storeMap.has(name)) {
        storeMap.set(name, {
          keyPath: options.keyPath ?? 'id',
          records: new Map(),
        });
      }
      return {};
    },
    transaction(storeName) {
      const store = storeMap.get(storeName);

      return {
        objectStore() {
          return {
            getAll() {
              const request = createRequest();
              succeed(request, Array.from(store.records.values()));
              return request;
            },
            put(record) {
              const request = createRequest();
              const key = record[store.keyPath];
              store.records.set(key, { ...record });
              succeed(request, key);
              return request;
            },
            delete(key) {
              const request = createRequest();
              store.records.delete(key);
              succeed(request, undefined);
              return request;
            },
            clear() {
              const request = createRequest();
              store.records.clear();
              succeed(request, undefined);
              return request;
            },
          };
        },
      };
    },
  };
}

function createFakeIndexedDb() {
  const storeMap = new Map();

  return {
    open() {
      const request = createRequest();
      const db = openResultFactory(storeMap);

      queueMicrotask(() => {
        request.result = db;
        if (typeof request.onupgradeneeded === 'function') {
          request.onupgradeneeded({ target: request });
        }
        if (typeof request.onsuccess === 'function') {
          request.onsuccess({ target: request });
        }
      });

      return request;
    },
  };
}

test('team guide exposes scoreboard helpers for the build challenge', async () => {
  const api = await loadScoreboardApi();

  assert.ok(api, 'Expected window.TeamGuideScoreboard to be available');
  assert.equal(api.BUILD_PROBLEMS.length, 10);
  assert.equal(api.CRITERIA.length, 5);
});

test('scoreboard helpers total scores, bands, and rankings correctly', async () => {
  const api = await loadScoreboardApi();

  const total = api.calculateEntryTotal({
    promptCraft: 5,
    workingOutput: 4,
    creativityPolish: 3,
    presentationClarity: 2,
    workflowDiscipline: 1,
  });

  assert.equal(total, 15);
  assert.equal(api.getScoreBand(23).label, 'Exceptional');

  const ranked = api.rankEntries([
    { id: 'b', developerName: 'Bianca', total: 19 },
    { id: 'a', developerName: 'Aaron', total: 22 },
    { id: 'c', developerName: 'Cara', total: 19 },
  ]);

  assert.deepEqual(
    Array.from(ranked, (entry) => entry.developerName),
    ['Aaron', 'Bianca', 'Cara'],
  );
});

test('scoreboard store persists and clears developer entries', async () => {
  const api = await loadScoreboardApi();
  const store = api.createScoreboardStore(createFakeIndexedDb());

  await store.saveEntry({
    id: 'dev-1',
    developerName: 'Mina',
    problemId: 'api-health-monitor',
    promptCraft: 5,
    workingOutput: 4,
    creativityPolish: 4,
    presentationClarity: 5,
    workflowDiscipline: 5,
  });

  let entries = await store.getEntries();
  assert.equal(entries.length, 1);
  assert.equal(entries[0].developerName, 'Mina');

  await store.deleteEntry('dev-1');
  entries = await store.getEntries();
  assert.equal(entries.length, 0);

  await store.saveEntry({
    id: 'dev-2',
    developerName: 'Niko',
    problemId: 'csv-data-visualizer',
    promptCraft: 3,
    workingOutput: 3,
    creativityPolish: 3,
    presentationClarity: 3,
    workflowDiscipline: 3,
  });

  await store.clearEntries();
  entries = await store.getEntries();
  assert.equal(entries.length, 0);
});

/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(path, imports) {
  const output = ts.transpileModule(readFileSync(resolve(__dirname, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, URLSearchParams, require(name) {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected import: ${name}`);
  } });
  return exports;
}

function harness(eventId) {
  const requests = [];
  const apiFetch = async (url, options) => { requests.push({ url, options }); return { people: [], totals: [] }; };
  const expenses = loadModule('../src/lib/expenses.ts', { './api': { apiFetch }, 'expo-file-system': {} });
  const hook = loadModule('../src/hooks/useExpenseBalances.ts', {
    react: { useCallback: (fn) => fn }, 'expo-router': { useFocusEffect() {} },
    '@/lib/api': { apiFetch }, '@/lib/expenses': expenses,
    '@/hooks/useFocusedData': { useFocusedData(loader) {
      return { reload: loader, run: (_id, action) => action() };
    } },
  }).useExpenseBalances(eventId);
  return { hook, expenses, requests };
}

test('event overview loads and records a payment in the same event scope', async () => {
  const { hook, requests } = harness('event-a');
  await hook.reload();
  await hook.settle('person', '30.00', 'CAD');
  assert.equal(requests[0].url, '/events/event-a/balances');
  assert.equal(requests[1].url, '/settlements');
  assert.deepEqual(JSON.parse(requests[1].options.body), { user_id: 'person', amount: '30.00', event_id: 'event-a' });
});

test('global balances retain their existing scope', async () => {
  const { hook, requests } = harness();
  await hook.reload();
  await hook.settle('person', '30.00', 'CAD');
  assert.equal(requests[0].url, '/balances');
  assert.deepEqual(JSON.parse(requests[1].options.body), { user_id: 'person', amount: '30.00' });
});

test('event expense pages keep the event and selected date order', async () => {
  const { expenses, requests } = harness();
  await expenses.listExpenses(100, 'event-a', 'asc');
  const params = new URL(requests[0].url, 'http://local').searchParams;
  assert.equal(params.get('event_id'), 'event-a');
  assert.equal(params.get('order'), 'asc');
  assert.equal(params.get('offset'), '100');
});

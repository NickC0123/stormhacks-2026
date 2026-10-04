/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// A small hook harness tests asynchronous state updates without a native runtime.
function harness(loader) {
  const states = [];
  const alerts = [];
  const mockReact = {
    useState(initial) {
      const cell = { value: initial };
      states.push(cell);
      return [initial, (next) => { cell.value = typeof next === 'function' ? next(cell.value) : next; }];
    },
    useRef: (current) => ({ current }),
    useCallback: (callback) => callback,
  };
  const output = ts.transpileModule(readFileSync(resolve(__dirname, '../src/hooks/useFocusedData.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    Error,
    require(name) {
      if (name === 'react') return mockReact;
      if (name === 'expo-router') return { useFocusEffect() {} };
      if (name === 'react-native') return { Alert: { alert: (...args) => alerts.push(args) } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { hook: exports.useFocusedData(loader, 'Load failed'), states, alerts };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test('payment response updates balances immediately and an older poll cannot undo it', async () => {
  const poll = deferred();
  let loads = 0;
  const { hook, states } = harness(() => { loads += 1; return poll.promise; });
  const pendingPoll = hook.reload();
  const updated = { totals: [{ owed_to_you: '0.00' }], people: [{ owed_to_you: '0.00' }] };
  assert.equal(await hook.run('person:CAD', async () => updated, 'Payment failed', (result) => result), true);
  assert.equal(states[0].value, updated);
  assert.equal(loads, 1, 'Applying the POST response should not need a second GET');
  poll.resolve({ totals: [{ owed_to_you: '30.00' }] });
  await pendingPoll;
  assert.equal(states[0].value, updated, 'A stale response must not put the paid debt back');
  assert.equal(states[4].value.size, 0, 'The payment action is no longer busy');
});

test('failed payment preserves the balance and exposes a visible error', async () => {
  const balance = { owed_to_you: '30.00' };
  const { hook, states, alerts } = harness(async () => balance);
  await hook.reload();
  assert.equal(await hook.run('person:CAD', async () => { throw new Error('Balance changed'); }, 'Payment failed', (result) => result), false);
  assert.equal(states[0].value, balance);
  assert.equal(states[3].value, 'Balance changed');
  assert.equal(alerts.length, 1);
  assert.equal(states[4].value.size, 0);
});

test('row actions without a dashboard response still reload their data', async () => {
  let rows = ['invite'];
  const { hook, states } = harness(async () => rows);
  await hook.reload();
  await hook.run('invite', async () => { rows = []; }, 'Action failed');
  assert.equal(states[0].value.length, 0);
});


test('repeated payment taps submit only one request while confirmation is pending', async () => {
  const response = deferred();
  const { hook } = harness(async () => ({}));
  let requests = 0;
  const action = () => { requests += 1; return response.promise; };
  const first = hook.run('person:CAD', action, 'Payment failed', (result) => result);
  assert.equal(await hook.run('person:CAD', action, 'Payment failed', (result) => result), false);
  assert.equal(requests, 1);
  response.resolve({ owed_to_you: '0.00' });
  assert.equal(await first, true);
});

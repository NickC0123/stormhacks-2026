/* global __dirname */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

process.env.TZ = 'America/Vancouver';
const output = ts.transpileModule(readFileSync(resolve(__dirname, '../src/lib/eventSchedule.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helpers = {};
vm.runInNewContext(output, { exports: helpers, Date, Error });

test('scheduled local date and time are stored in UTC, and editing restores local fields', () => {
  const start = { date: '2026-10-12', time: '18:30' };
  const end = { date: '2026-10-13', time: '01:00' };
  const payload = helpers.eventSchedulePayload(start, end);
  assert.equal(payload.starts_at, '2026-10-13T01:30:00.000Z');
  assert.equal(payload.ends_at, '2026-10-13T08:00:00.000Z');
  assert.equal(JSON.stringify(helpers.dateTimeFields(new Date(payload.starts_at))), JSON.stringify(start));
});

test('unscheduled and open ended events remain valid', () => {
  assert.equal(helpers.eventSchedulePayload(null, null).starts_at, null);
  assert.equal(helpers.eventSchedulePayload({ date: '2026-10-12', time: '18:30' }, null).ends_at, null);
});

test('end before start, missing start, and equal times are rejected', () => {
  const start = { date: '2026-10-12', time: '18:30' };
  assert.throws(() => helpers.eventSchedulePayload(start, { date: '2026-10-12', time: '17:00' }), /after/);
  assert.throws(() => helpers.eventSchedulePayload(start, start), /after/);
  assert.throws(() => helpers.eventSchedulePayload(null, start), /start time/);
});

test('invalid dates, invalid times, and skipped daylight saving times are rejected', () => {
  for (const value of [
    { date: '2026-02-30', time: '12:00' }, { date: '2026-13-01', time: '12:00' },
    { date: '2026-10-12', time: '25:00' }, { date: '2026-10-12', time: '12:60' },
    { date: '2026-10-12', time: '12' }, { date: '2026-03-08', time: '02:30' },
  ]) assert.throws(() => helpers.parseEventDateTime(value));
});

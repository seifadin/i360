// Fixed cases for hijri/client.js with a fake Worker — run with `npm test`.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const HC = require('../hijri/calc.js');
const Client = require('../hijri/client.js');

const DATE = '2026-10-19';
const DAR = { y: 1448, m: 5, d: 8 };

// A fake fetch that answers with `body` (or status), and records the address asked.
function fakeFetch(body, { status = 200, delayMs = 0 } = {}) {
  const calls = [];
  const fn = (url, init) => {
    calls.push(url);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => resolve({ ok: status >= 200 && status < 300, status, json: async () => (typeof body === 'function' ? body() : body) }), delayMs);
      if (init && init.signal) init.signal.addEventListener('abort', () => { clearTimeout(t); const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
    });
  };
  fn.calls = calls;
  return fn;
}
const answer = (over) => ({ date: DATE, h: DAR, source: 'dar', provisional: false, v: HC.VERSION, ...over });

test("the Worker's date is used, with its label", async () => {
  const f = fakeFetch(answer());
  const r = await Client.get({ date: DATE, lang: 'ar', fetch: f });
  assert.deepEqual(r.h, DAR);
  assert.equal(r.source, 'dar');
  assert.equal(r.label, HC.label('dar', 'ar'));
  assert.equal(r.provisional, false);
  assert.equal(r.outdated, false);
  assert.equal(r.error, null);
  assert.equal(f.calls[0], `${Client.WORKER}/?date=${DATE}`);
});

test('provisional and calculated answers from the Worker pass through', async () => {
  const p = await Client.get({ date: DATE, fetch: fakeFetch(answer({ provisional: true })) });
  assert.equal(p.provisional, true);
  const c = await Client.get({ date: DATE, lang: 'en', fetch: fakeFetch(answer({ source: 'calc' })) });
  assert.equal(c.source, 'calc');
  assert.equal(c.label, HC.label('calc', 'en'));
});

test('a different calculator version is flagged, not refused', async () => {
  const r = await Client.get({ date: DATE, fetch: fakeFetch(answer({ v: HC.VERSION + 1 })) });
  assert.equal(r.source, 'dar');
  assert.equal(r.outdated, true);
});

test('no usable answer: the date is calculated here, with the reason', async () => {
  const cases = [
    [fakeFetch(answer(), { status: 502 }), 'status 502'],
    [fakeFetch(answer({ date: '2026-10-18' })), 'unexpected answer'],
    [fakeFetch(answer({ h: { y: 1448, m: 13, d: 1 } })), 'unexpected answer'],
    [fakeFetch(answer({ source: 'other' })), 'unexpected answer'],
    [fakeFetch(answer({ v: '1' })), 'unexpected answer'],
    [fakeFetch(() => { throw new SyntaxError('bad JSON'); }), 'bad JSON'],
    [() => Promise.reject(new TypeError('Failed to fetch')), 'Failed to fetch']
  ];
  for (const [f, reason] of cases) {
    const r = await Client.get({ date: DATE, lang: 'tr', fetch: f });
    assert.deepEqual(r.h, HC.fromCivil(DATE), reason);
    assert.equal(r.source, 'calc');
    assert.equal(r.label, HC.label('calc', 'tr'));
    assert.equal(r.error, reason);
  }
});

test('a slow Worker times out and the calculated date is used', async () => {
  const r = await Client.get({ date: DATE, timeoutMs: 50, fetch: fakeFetch(answer(), { delayMs: 1000 }) });
  assert.equal(r.source, 'calc');
  assert.equal(r.error, 'timeout');
});

test('a bad date is a caller error, not a fallback', async () => {
  await assert.rejects(Client.get({ date: '19-10-2026', fetch: fakeFetch(answer()) }), RangeError);
});

test('also loads as a plain browser script after calc.js', async () => {
  const sandbox = { Intl, Date, Math, Object, String, Number, RangeError, Error, Promise, parseInt, setTimeout, clearTimeout };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(readFileSync(join(__dirname, '../hijri/calc.js'), 'utf8'), sandbox);
  vm.runInNewContext(readFileSync(join(__dirname, '../hijri/client.js'), 'utf8'), sandbox);
  assert.equal(sandbox.HijriClient.VERSION, Client.VERSION);
  const r = await sandbox.HijriClient.get({ date: DATE, fetch: fakeFetch(answer()) });
  assert.equal(r.source, 'dar');
});

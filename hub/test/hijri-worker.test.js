// hijri/worker/index.js as the Worker runs it, with a fake KV and a fake
// Dar al-Ifta — run with `npm test`. Uses the real clock: dates are built from
// Cairo's date at the time of the run.
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../hijri/calc.js');
const S = require('../hijri/worker/source.js');

let worker;
const realFetch = globalThis.fetch;
before(async () => { worker = (await import('../hijri/worker/index.js')).default; });
after(() => { globalThis.fetch = realFetch; });

function fakeKV(state) {
  const m = new Map(state ? [[S.STATE_KEY, JSON.stringify(state)]] : []);
  return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } };
}
const darDown = () => { globalThis.fetch = async () => { throw new TypeError('network'); }; };
const get = async (env, query) => {
  const r = await worker.fetch(new Request(`https://dar-hijri.i36o.workers.dev/${query}`), env);
  return { status: r.status, headers: r.headers, body: await r.json() };
};

const today = () => calc.todayIn(S.CAIRO);
// A confirmed date for today, mid-month, so counting covers yesterday and tomorrow too.
const midMonth = () => ({ anchor: { date: today(), h: { y: 1448, m: 5, d: 10 } }, previous: null, offset: -1, checkedAt: null, error: null });

test('?date= answers with the contract client.js reads, cached a day when from Dar al-Ifta', async () => {
  darDown();
  const env = { HIJRI: fakeKV(midMonth()) };
  const r = await get(env, `?date=${calc.addDays(today(), 1)}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { date: calc.addDays(today(), 1), h: { y: 1448, m: 5, d: 11 }, source: 'dar', provisional: false, v: calc.VERSION });
  assert.match(r.headers.get('Cache-Control'), /max-age=86400/);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), '*');
});

test('?date= with nothing saved is calculated, cached briefly', async () => {
  darDown();
  const r = await get({ HIJRI: fakeKV() }, `?date=${today()}`);
  assert.equal(r.body.source, 'calc');
  assert.deepEqual(r.body.h, calc.fromCivil(today()));
  assert.match(r.headers.get('Cache-Control'), /max-age=600/);
});

test('?date= refuses what it does not answer', async () => {
  darDown();
  const env = { HIJRI: fakeKV(midMonth()) };
  assert.equal((await get(env, '?date=2020-01-01')).status, 400);
  assert.equal((await get(env, '?date=bad')).status, 400);
});

test('no ?date=: the old answer for the day page and the release script', async () => {
  darDown();
  const ok = await get({ HIJRI: fakeKV(midMonth()) }, '');
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body, { hijri: '10 جمادى الأولى 1448', cairo: today(), via: 'kv' });
  assert.equal(ok.headers.get('Cache-Control'), 'no-store');
  const none = await get({ HIJRI: fakeKV() }, '');
  assert.equal(none.status, 502);                               // so they fall back as they do today
});

test('?debug=1 shows the rules, the state and a live reading', async () => {
  darDown();
  const r = await get({ HIJRI: fakeKV(midMonth()) }, '?debug=1');
  assert.equal(r.body.v, calc.VERSION);
  assert.equal(r.body.calendar, 'islamic');
  assert.deepEqual(r.body.intlToday, calc.fromCivil(today()));
  assert.equal(r.body.rules.checkFromHour, S.CHECK_FROM_HOUR);
  assert.equal(r.body.state.anchor.date, today());
  assert.equal(r.body.darNow.reading, null);
  assert.equal(r.body.darNow.attempts.length, 2);
});

test('?check=1 and the scheduled run follow the rules (mid-month: nothing to do)', async () => {
  globalThis.fetch = async () => { throw new Error('Dar al-Ifta must not be asked mid-month'); };
  const env = { HIJRI: fakeKV(midMonth()) };
  assert.equal((await get(env, '?check=1')).body.action, 'none');
  let waited;
  await worker.scheduled({ scheduledTime: Date.now() }, env, { waitUntil: (p) => { waited = p; } });
  await waited;
});

test('OPTIONS and other methods', async () => {
  const pre = await worker.fetch(new Request('https://x/', { method: 'OPTIONS' }), { HIJRI: fakeKV() });
  assert.equal(pre.status, 204);
  const post = await worker.fetch(new Request('https://x/', { method: 'POST' }), { HIJRI: fakeKV() });
  assert.equal(post.status, 405);
});

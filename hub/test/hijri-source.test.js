// Scenarios for hijri/worker/source.js with a fake clock, a fake Dar al-Ifta and a
// fake KV — run with `npm test`. Dates follow Jumada al-Ula 1448 as Dar al-Ifta showed
// it (8 Jumada al-Ula = 2026-10-19), so the 29th falls on 2026-11-09.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const calc = require('../hijri/calc.js');
const S = require('../hijri/worker/source.js');

const EN = ['Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Akhir", 'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// A Cairo wall-clock time as an instant (Cairo is UTC+3 until 2026-10-29, then UTC+2).
function cairo(date, time) {
  for (const off of ['+03:00', '+02:00']) {
    const t = new Date(`${date}T${time}:00${off}`);
    const hh = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t);
    if (calc.todayIn('Africa/Cairo', t) === date && hh === time) return t;
  }
  throw new Error(`no such Cairo time ${date} ${time}`);
}

// Dar al-Ifta's home page header, as the site prints it.
function page(h, gregorian) {
  const g = calc.parseYMD(gregorian);
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' }).format(g);
  return `<html><body><nav>…</nav><div class="date">Hijri Date <span>"${h.d} ${EN[h.m - 1]} ${h.y}"</span>` +
    ` Gregorian Date <span>${day}, ${String(g.getUTCDate()).padStart(2, '0')} ${MONTHS[g.getUTCMonth()]} ${g.getUTCFullYear()}</span></div></body></html>`;
}

// The fake Dar al-Ifta: `show` decides what the site prints; the API always times out (as from Cloudflare).
function fakeDar(show) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    if (url === S.SITE) {
      const s = show();
      if (s instanceof Error) throw s;
      if (typeof s === 'number') return { ok: false, status: s, text: async () => '' };
      return { ok: true, status: 200, text: async () => page(s.h, s.gregorian) };
    }
    const e = new Error('aborted'); e.name = 'AbortError'; throw e;
  };
  fetch.calls = calls;
  return fetch;
}

function fakeKV(initial) {
  const m = new Map(initial ? [[S.STATE_KEY, JSON.stringify(initial)]] : []);
  return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, map: m };
}

const J = (d) => ({ y: 1448, m: 5, d });                  // Jumada al-Ula 1448
const J2 = (d) => ({ y: 1448, m: 6, d });                 // Jumada al-Akhirah 1448
const state = (anchor, previous = null) => ({ anchor, previous, offset: -1, checkedAt: null, error: null });

test('reads the site header and the API text', () => {
  assert.deepEqual(S.parseSite(page(J(8), '2026-10-19')), { h: J(8), gregorian: '2026-10-19' });
  assert.deepEqual(S.parseApi('"8 جمادى الأولى 1448"'), { h: J(8), gregorian: null });
  assert.deepEqual(S.parseApi('٢٩ ذو الحجة ١٤٤٨').h, { y: 1448, m: 12, d: 29 });
  assert.equal(S.parseSite('<html>nothing here</html>'), null);
  for (const [name, n] of [["Rabi' al-Thani", 4], ['Jumada al-Ula', 5], ['Jumada al-Akhirah', 6], ['Dhu-al-Hijjah', 12], ["Dhu al-Qi'dah", 11], ["Sha'ban", 8]]) {
    assert.equal(S.hijriMonthNumber(name), n, name);
  }
});

test('first deploy: nothing is read before 21:00, then the reading becomes the anchor', async () => {
  const kv = fakeKV(), dar = fakeDar(() => ({ h: J(8), gregorian: '2026-10-19' }));
  const src = S.createSource({ calc, fetch: dar, kv });
  assert.equal((await src.check(cairo('2026-10-19', '13:00'))).action, 'wait');
  assert.equal(dar.calls.length, 0);
  const r = await src.check(cairo('2026-10-19', '21:00'));
  assert.equal(r.action, 'confirmed');
  const st = await src.readState();
  assert.deepEqual(st.anchor, { date: '2026-10-19', h: J(8) });
  assert.equal(st.offset, -1);                               // ICU islamic is one day ahead here
});

test('mid-month: Dar al-Ifta is never asked, each day is counted', async () => {
  const kv = fakeKV(state({ date: '2026-10-19', h: J(8) })), dar = fakeDar(() => { throw new Error('must not be asked'); });
  const src = S.createSource({ calc, fetch: dar, kv });
  for (const [date, d] of [['2026-10-20', 9], ['2026-10-25', 14], ['2026-11-06', 26]]) {
    assert.equal((await src.check(cairo(date, '13:00'))).action, 'none', date);
    assert.deepEqual(await src.answer(date, cairo(date, '01:00')), { date, h: J(d), source: 'dar', provisional: false });
  }
  assert.equal(dar.calls.length, 0);
});

test('day 28: the blind period counts, the check waits for the hour, a stale page is not taken', async () => {
  let shows = { h: J(27), gregorian: '2026-11-08' };          // the site still shows yesterday's Hijri date
  const kv = fakeKV(state({ date: '2026-11-07', h: J(27) })), dar = fakeDar(() => shows);
  const src = S.createSource({ calc, fetch: dar, kv });
  assert.deepEqual((await src.answer('2026-11-08', cairo('2026-11-08', '02:00'))).h, J(28));
  assert.equal((await src.check(cairo('2026-11-08', '10:00'))).action, 'wait');
  assert.equal(dar.calls.length, 0);
  assert.equal((await src.check(cairo('2026-11-08', '12:00'))).action, 'unchanged');
  shows = { h: J(28), gregorian: '2026-11-08' };
  const r = await src.check(cairo('2026-11-08', '12:30'));
  assert.equal(r.action, 'confirmed');
  assert.equal((await src.check(cairo('2026-11-08', '13:00'))).action, 'none');   // done for the day
  assert.equal(dar.calls.length, 2);
});

test('the day after the 29th: provisional until Dar al-Ifta decides, either way', async () => {
  for (const [decided, expect] of [[J2(1), J2(1)], [J(30), J(30)]]) {
    let shows = { h: J(29), gregorian: '2026-11-10' };
    const kv = fakeKV(state({ date: '2026-11-09', h: J(29) }, { date: '2026-11-08', h: J(28) }));
    const src = S.createSource({ calc, fetch: fakeDar(() => shows), kv });
    const before = await src.answer('2026-11-10', cairo('2026-11-10', '08:00'));
    assert.equal(before.source, 'calc');
    assert.equal(before.provisional, true);
    assert.deepEqual(before.h, calc.fromCivil('2026-11-10', -1));
    assert.equal((await src.check(cairo('2026-11-10', '12:00'))).action, 'unchanged');
    shows = { h: decided, gregorian: '2026-11-10' };
    assert.equal((await src.check(cairo('2026-11-10', '12:30'))).action, 'confirmed');
    assert.deepEqual(await src.answer('2026-11-10', cairo('2026-11-10', '13:00')), { date: '2026-11-10', h: expect, source: 'dar', provisional: false });
    assert.deepEqual((await src.answer('2026-11-09', cairo('2026-11-10', '13:00'))).h, J(29));   // a visitor still on the 9th
  }
});

test('after a 30th the 1st is counted; the check still runs (day 1 is in the window)', async () => {
  const kv = fakeKV(state({ date: '2026-11-10', h: J(30) })), dar = fakeDar(() => ({ h: J2(1), gregorian: '2026-11-11' }));
  const src = S.createSource({ calc, fetch: dar, kv });
  assert.deepEqual(await src.answer('2026-11-11', cairo('2026-11-11', '01:00')), { date: '2026-11-11', h: J2(1), source: 'dar', provisional: false });
  assert.equal((await src.check(cairo('2026-11-11', '12:00'))).action, 'confirmed');
});

test('failures and bad readings change nothing but the error', async () => {
  const cases = [
    [() => 503, 'failed'],
    [() => new TypeError('network'), 'failed'],
    [() => ({ h: J(28), gregorian: '2026-11-07' }), 'failed'],           // a cached page from yesterday
    [() => ({ h: { y: 1448, m: 8, d: 1 }, gregorian: '2026-11-08' }), 'rejected']   // months away from the calculator
  ];
  for (const [show, action] of cases) {
    const before = state({ date: '2026-11-07', h: J(27) });
    const kv = fakeKV(before), src = S.createSource({ calc, fetch: fakeDar(show), kv });
    const r = await src.check(cairo('2026-11-08', '12:00'));
    assert.equal(r.action, action);
    const st = await src.readState();
    assert.deepEqual(st.anchor, before.anchor);
    assert.ok(st.error);
    assert.deepEqual((await src.answer('2026-11-08', cairo('2026-11-08', '12:05'))).h, J(28));   // counting still serves
  }
});

test('answers only civil dates within a day of Cairo', async () => {
  const src = S.createSource({ calc, fetch: fakeDar(() => 500), kv: fakeKV(state({ date: '2026-10-19', h: J(8) })) });
  const now = cairo('2026-10-20', '01:30');                  // still the 19th in Los Angeles, the 20th in Jakarta
  assert.deepEqual((await src.answer('2026-10-19', now)).h, J(8));
  assert.deepEqual((await src.answer('2026-10-21', now)).h, J(10));
  assert.ok((await src.answer('2026-10-23', now)).error);
  assert.ok((await src.answer('20-10-2026', now)).error);
});

test('with nothing saved, answers are calculated and not marked provisional', async () => {
  const src = S.createSource({ calc, fetch: fakeDar(() => 500), kv: fakeKV() });
  const a = await src.answer('2026-10-19', cairo('2026-10-19', '10:00'));
  assert.deepEqual(a, { date: '2026-10-19', h: calc.fromCivil('2026-10-19'), source: 'calc', provisional: false });
});

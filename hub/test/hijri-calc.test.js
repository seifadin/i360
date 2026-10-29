// Fixed cases for hijri/calc.js — run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as HC from '../hijri/calc.js';

test('version, calendar and sources are fixed values', () => {
  assert.ok(Number.isInteger(HC.VERSION) && HC.VERSION >= 1);
  assert.equal(HC.CALENDAR, 'islamic');
  assert.deepEqual({ ...HC.SOURCES }, { DAR: 'dar', CALC: 'calc' });
});

test('civil dates: parse, format, add and subtract days', () => {
  assert.equal(HC.parseYMD('2026-02-30'), null);
  assert.equal(HC.parseYMD('2026-10-19x'), null);
  assert.equal(HC.toYMD(HC.parseYMD('2026-10-19')), '2026-10-19');
  assert.equal(HC.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(HC.addDays('2028-03-01', -1), '2028-02-29');
  assert.equal(HC.diffDays('2026-10-18', '2026-11-09'), 22);
  assert.throws(() => HC.addDays('19-10-2026', 1), RangeError);
});

test('today in a time zone follows that zone, not the machine', () => {
  const now = new Date('2026-10-19T22:30:00Z');            // 01:30 on the 20th in Cairo (UTC+3)
  assert.equal(HC.todayIn('Africa/Cairo', now), '2026-10-20');
  assert.equal(HC.todayIn('America/Los_Angeles', now), '2026-10-19');
  assert.equal(HC.todayIn('Asia/Jakarta', now), '2026-10-20');
});

// Known values of ICU's 'islamic' calendar (checked against Node and the Workers runtime, 2026-10-19).
test('fromCivil: ICU islamic dates', () => {
  assert.deepEqual(HC.fromCivil('2026-10-18'), { y: 1448, m: 5, d: 8 });
  assert.deepEqual(HC.fromCivil('2026-10-19'), { y: 1448, m: 5, d: 9 });
  assert.deepEqual(HC.fromCivil('2027-02-08'), { y: 1448, m: 9, d: 2 });
  assert.deepEqual(HC.fromCivil('2027-03-09'), { y: 1448, m: 10, d: 1 });
  assert.deepEqual(HC.fromCivil('2026-10-19', -1), { y: 1448, m: 5, d: 8 });
});

// Dar al-Ifta's dates observed in this project: 7 Jumada al-Ula on 2026-10-18, 8 on 2026-10-19.
test('offsetFor: measures the shift to a known date', () => {
  assert.equal(HC.offsetFor('2026-10-18', { y: 1448, m: 5, d: 7 }), -1);
  assert.equal(HC.offsetFor('2026-10-19', { y: 1448, m: 5, d: 8 }), -1);
  assert.equal(HC.offsetFor('2026-10-19', { y: 1448, m: 5, d: 9 }), 0);
  assert.equal(HC.offsetFor('2026-10-19', { y: 1448, m: 5, d: 20 }), null);
});

test('countForward: after a 30th comes the 1st', () => {
  assert.deepEqual(HC.countForward({ y: 1448, m: 5, d: 30 }, 0), { y: 1448, m: 5, d: 30 });
  assert.deepEqual(HC.countForward({ y: 1448, m: 5, d: 30 }, 1), { y: 1448, m: 6, d: 1 });
  assert.deepEqual(HC.countForward({ y: 1448, m: 12, d: 30 }, 3), { y: 1449, m: 1, d: 3 });
  assert.equal(HC.countForward({ y: 1448, m: 5, d: 30 }, 30), null);
});

test('countForward: certain up to day 29, unknown after', () => {
  assert.deepEqual(HC.countForward({ y: 1448, m: 5, d: 8 }, 21), { y: 1448, m: 5, d: 29 });
  assert.equal(HC.countForward({ y: 1448, m: 5, d: 8 }, 22), null);
  assert.deepEqual(HC.countForward({ y: 1448, m: 5, d: 8 }, 0), { y: 1448, m: 5, d: 8 });
  assert.equal(HC.countForward({ y: 1448, m: 5, d: 8 }, -1), null);
  assert.equal(HC.countForward({ y: 1448, m: 13, d: 1 }, 1), null);
});

test('isHijri accepts only plausible dates', () => {
  assert.ok(HC.isHijri({ y: 1448, m: 5, d: 30 }));
  for (const bad of [null, {}, { y: 1448, m: 0, d: 1 }, { y: 1448, m: 5, d: 31 }, { y: '1448', m: 5, d: 1 }, { y: 2026, m: 5, d: 1 }]) {
    assert.equal(HC.isHijri(bad), false, JSON.stringify(bad));
  }
});

test('labels: every source and provisional in every language, Arabic as the fallback', () => {
  for (const source of [...Object.values(HC.SOURCES), 'provisional']) {
    for (const lang of ['ar', 'en', 'tr', 'id', 'ur']) assert.ok(HC.label(source, lang).length > 0, `${source}/${lang}`);
    assert.equal(HC.label(source, 'xx'), HC.LABELS[source].ar);
  }
  assert.equal(HC.label('nope', 'ar'), '');
});

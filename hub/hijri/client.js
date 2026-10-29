/* i360 Hijri client — asks the dar-hijri Worker for a date and, when it can't
   (offline, timeout, bad answer), falls back to the shared calculator
   (hijri/calc.js). Shared by the hub pages (built in) and the i360 release
   script (scripts/get-hijri-date.js requires this file). No calendar logic here.

   Never rejects: the answer is always a date, marked with where it came from.
     get({ date, lang })  ->  { date, h: {y, m, d}, source: 'dar'|'calc',
                                provisional, label, outdated, error }
   - date: the civil date wanted, 'YYYY-MM-DD' (default: today where the caller is)
   - source 'calc': the date was calculated, by the Worker or here
   - provisional: Dar al-Ifta hasn't settled this date yet (30th or 1st); ask again later
   - label: where the date came from, or that it is provisional, in `lang`
   - outdated: this copy of calc.js is older or newer than the Worker's; update the copy
   - error: why the Worker wasn't used (only when it wasn't)

   The Worker's answer (the contract between the two):
     GET <WORKER>/?date=YYYY-MM-DD  ->  200 { date, h: {y, m, d}, source, provisional, v }
   where v is the Worker's calc.js VERSION. Anything else counts as no answer.

   An ES module, like everything here: bundled into the pages, imported by Node
   and by the Worker, and served as is at dar-hijri.i36o.workers.dev/client.js
   (it imports calc.js from beside itself). */
import * as Calc from './calc.js';

if (!Calc) throw new Error('HijriClient: load hijri/calc.js first');

const VERSION = 2;                 // 2: the label says when a date is provisional
const WORKER = 'https://dar-hijri.i36o.workers.dev';
const TIMEOUT_MS = 8000;

function localToday() {
  return Calc.todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

// The Worker's JSON, checked against the contract; null if it doesn't match.
function readAnswer(j, date) {
  if (!j || j.date !== date || !Calc.isHijri(j.h)) return null;
  if (j.source !== Calc.SOURCES.DAR && j.source !== Calc.SOURCES.CALC) return null;
  if (typeof j.provisional !== 'boolean' || !Number.isInteger(j.v)) return null;
  return { h: { y: j.h.y, m: j.h.m, d: j.h.d }, source: j.source, provisional: j.provisional, v: j.v };
}

async function ask(url, date, timeoutMs, fetchImpl) {
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { if (ctrl) ctrl.abort(); reject(new Error('timeout')); }, timeoutMs);
  });
  try {
    const request = (async () => {
      const r = await fetchImpl(`${url}/?date=${date}`, ctrl ? { signal: ctrl.signal } : {});
      if (!r.ok) throw new Error(`status ${r.status}`);
      const a = readAnswer(await r.json(), date);
      if (!a) throw new Error('unexpected answer');
      return a;
    })();
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function get(options) {
  const o = options || {};
  const date = o.date || localToday();
  if (!Calc.parseYMD(date)) throw new RangeError(`HijriClient: not a civil date "${date}"`);
  const lang = o.lang || 'ar';
  const fetchImpl = o.fetch || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
  if (fetchImpl) {
    try {
      const a = await ask(o.url || WORKER, date, o.timeoutMs || TIMEOUT_MS, fetchImpl);
      return { date, h: a.h, source: a.source, provisional: a.provisional, label: Calc.label(a.provisional ? 'provisional' : a.source, lang), outdated: a.v !== Calc.VERSION, error: null };
    } catch (e) {
      return fallback(date, lang, (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'failed'));
    }
  }
  return fallback(date, lang, 'no fetch available');
}

function fallback(date, lang, error) {
  const source = Calc.SOURCES.CALC;
  return { date, h: Calc.fromCivil(date), source, provisional: false, label: Calc.label(source, lang), outdated: false, error };
}

export { VERSION, WORKER, TIMEOUT_MS, get };

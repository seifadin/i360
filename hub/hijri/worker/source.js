/* dar-hijri Worker — retrieval rules: when to ask Dar al-Ifta, what to keep,
   and what date to give for a civil date. No calendar arithmetic of its own:
   that is hijri/calc.js. Dependencies are passed in (fetch, KV, clock), so the
   rules run the same in the Worker and in the tests.

   The rules (Seif, 2026-10-19; month length checked against the hadith «الشهر تسع
   وعشرون… فأكملوا العدة ثلاثين» and Dar al-Ifta's sighting on the evening of the 29th):
   - Days 3–27: Dar al-Ifta is not asked. Each day is the last confirmed date + 1
     (counting is certain up to day 29: every month has at least 29 days).
   - Days 28–2: a scheduled check (every 30 minutes, from CHECK_FROM_HOUR Cairo
     time) asks Dar al-Ifta until its date differs from yesterday's — its site
     keeps yesterday's Hijri date for part of the day — then stops for the day.
   - Until then (the blind period) +1 fills the gap, except the day after the 29th
     (the 30th or the 1st): that day is calculated and marked provisional.
   - With nothing saved yet (first deploy), the first reading waits until
     FIRST_READ_HOUR, so a stale page can't become the starting point.
   - Dar al-Ifta's date is Egypt's (Cairo's civil date); a visitor's date is answered
     only within one day of Cairo's, which covers every time zone.

   State, one KV key (STATE_KEY):
     { anchor: {date, h}, previous: {date, h} | null, offset, checkedAt, error }
   anchor = the last date confirmed from Dar al-Ifta (date = Cairo civil date). */
'use strict';

const CAIRO = 'Africa/Cairo';
const STATE_KEY = 'state';
const CHECK_FROM_HOUR = 12;          // Cairo hour from which Dar al-Ifta is asked (days 28–2); set from observation
const FIRST_READ_HOUR = 21;          // with nothing saved yet, read only this late: by then the site has changed day
                                     // (observed changed by 20:27 on 2026-10-18), so the first reading isn't stale
const MAX_OFFSET = 3;                // furthest Dar al-Ifta is accepted from the calculator, in days
const SITE = 'https://www.dar-alifta.org/en';
const API = 'https://di107.dar-alifta.org/api/HijriDate?langID=1';
const SITE_TIMEOUT_MS = 7000;
const API_TIMEOUT_MS = 3000;
const HEADERS = { Accept: 'text/html,application/json,text/plain,*/*', 'User-Agent': 'Mozilla/5.0 (compatible; dar-hijri-worker)' };

const MONTHS_EN = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTHS_AR = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

/* ---------- reading Dar al-Ifta ---------- */

// English month name as the site writes it ("Rabi' al-Awwal", "Jumada al-Ula", "Dhu-al-Hijjah") -> 1..12, 0 if unknown.
function hijriMonthNumber(name) {
  const n = String(name).toLowerCase().replace(/[^a-z]/g, '');
  if (n.includes('muharram')) return 1;
  if (n.includes('safar')) return 2;
  if (n.startsWith('rabi')) return /awwal|awal|ula|first/.test(n) ? 3 : 4;
  if (n.startsWith('jumad') || n.startsWith('jamad')) return /awwal|awal|ula|first/.test(n) ? 5 : 6;
  if (n.includes('rajab')) return 7;
  if (n.includes('shaban') || n.includes('shaaban')) return 8;
  if (n.includes('ramadan') || n.includes('ramadhan')) return 9;
  if (n.includes('shawwal')) return 10;
  if (/^(dhu|dhul|zu|zul)/.test(n)) return /hij/.test(n) ? 12 : (/q[ai]/.test(n) ? 11 : 0);
  return 0;
}

const toText = (html) => html
  .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&#0?39;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

// "Hijri Date 8 Jumada al-Ula 1448 Gregorian Date Monday, 19 October 2026" -> { h, gregorian }.
// Only the part of the page around the header is cleaned (the whole page costs too much CPU).
function parseSite(html) {
  const at = html.indexOf('Hijri Date');
  if (at < 0) return null;
  const text = toText(html.slice(Math.max(0, at - 200), at + 3000));
  const m = /Hijri Date\s*["“]?\s*(\d{1,2})\s+([A-Za-z][A-Za-z'’\-\s]{2,30}?)\s+(1[3-6]\d\d)\s*["”]?\s*Gregorian Date\s*(?:[A-Za-z]+,?\s*)?(\d{1,2})\s+([A-Za-z]+)\s+(20\d\d)/i.exec(text);
  if (!m) return null;
  const month = hijriMonthNumber(m[2]), gm = MONTHS_EN.indexOf(m[5].toLowerCase()) + 1;
  if (!month || !gm) return null;
  return {
    h: { y: +m[3], m: month, d: +m[1] },
    gregorian: `${m[6]}-${String(gm).padStart(2, '0')}-${String(+m[4]).padStart(2, '0')}`
  };
}

const normAr = (s) => String(s).replace(/[٠-٩]/g, (c) => c.charCodeAt(0) - 0x0660)
  .replace(/[ً-ْـ]/g, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
const AR_MONTHS = (() => {
  const list = { 'ربيع الثاني': 4, 'جمادى الأول': 5, 'جمادى الثانية': 6, 'جمادى الآخر': 6 };
  MONTHS_AR.forEach((name, i) => { list[name] = i + 1; });
  const out = {};
  Object.keys(list).forEach((k) => { out[normAr(k)] = list[k]; });
  return out;
})();

// The API's text, "8 جمادى الأولى 1448" (possibly quoted) -> { h, gregorian: null }. It carries no Gregorian date.
function parseApi(text) {
  const m = normAr(String(text).replace(/^"+|"+$/g, '')).match(/(\d{1,2})\s+(.+?)\s+(\d{4})/);
  if (!m) return null;
  const month = AR_MONTHS[normAr(m[2])];
  return month ? { h: { y: +m[3], m: month, d: +m[1] }, gregorian: null } : null;
}

/* ---------- the rules ---------- */

function cairoHour(now) {
  return parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: CAIRO, hour: '2-digit', hourCycle: 'h23' }).format(now), 10);
}

function createSource({ calc, fetch, kv }) {
  if (!calc || !fetch || !kv) throw new Error('createSource: calc, fetch and kv are required');

  async function get(url, ms) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { signal: ctrl.signal, headers: HEADERS, redirect: 'follow' }); }
    finally { clearTimeout(timer); }
  }

  // Dar al-Ifta's date as shown now: the site first (it also shows its Gregorian date), then the API.
  async function readDar(cairoToday) {
    const attempts = [];
    try {
      const r = await get(SITE, SITE_TIMEOUT_MS);
      if (!r.ok) throw new Error(`status ${r.status}`);
      const p = parseSite(await r.text());
      if (!p) throw new Error('date not found in page');
      if (p.gregorian !== cairoToday) throw new Error(`page shows ${p.gregorian}, Cairo is on ${cairoToday}`);
      return { reading: p.h, via: 'site', attempts };
    } catch (e) { attempts.push(`site: ${why(e)}`); }
    try {
      const r = await get(API, API_TIMEOUT_MS);
      if (!r.ok) throw new Error(`status ${r.status}`);
      const p = parseApi(await r.text());
      if (!p) throw new Error('unexpected format');
      return { reading: p.h, via: 'api', attempts };
    } catch (e) { attempts.push(`api: ${why(e)}`); }
    return { reading: null, via: null, attempts };
  }

  async function readState() {
    const raw = await kv.get(STATE_KEY);
    if (!raw) return { anchor: null, previous: null, offset: null, checkedAt: null, error: null };
    try { return JSON.parse(raw); } catch (e) { return { anchor: null, previous: null, offset: null, checkedAt: null, error: 'unreadable state' }; }
  }

  // The Hijri date of a civil date from the confirmed dates alone; null when counting can't tell.
  function counted(state, date) {
    for (const a of [state.anchor, state.previous]) {
      if (!a) continue;
      const diff = calc.diffDays(a.date, date);
      if (diff >= 0) { const h = calc.countForward(a.h, diff); if (h) return h; }
      else if (a.h.d + diff >= 1) return { y: a.h.y, m: a.h.m, d: a.h.d + diff };   // earlier in the same month
    }
    return null;
  }

  // What a scheduled run should do today: nothing, or ask Dar al-Ifta.
  function needsCheck(state, cairoToday) {
    if (!state.anchor) return true;
    if (state.anchor.date === cairoToday) return false;                // already confirmed today
    const today = counted(state, cairoToday);
    return !today || today.d >= 28 || today.d <= 2;
  }

  // One scheduled run (every 30 minutes). Returns what happened, for the log and the tests.
  async function check(now) {
    const cairoToday = calc.todayIn(CAIRO, now);
    const state = await readState();
    if (!needsCheck(state, cairoToday)) return { action: 'none', cairoToday };

    // Before the check hour the blind period's +1 stands; with nothing to compare with, wait longer.
    const yesterday = counted(state, calc.addDays(cairoToday, -1));
    if (cairoHour(now) < (yesterday ? CHECK_FROM_HOUR : FIRST_READ_HOUR)) return { action: 'wait', cairoToday };

    const { reading, via, attempts } = await readDar(cairoToday);
    state.checkedAt = now.toISOString();
    let result;
    if (!reading || !calc.isHijri(reading)) {
      state.error = attempts.join('; ') || 'no reading';
      result = { action: 'failed', cairoToday, error: state.error };
    } else if (calc.offsetFor(cairoToday, reading, MAX_OFFSET) === null) {
      state.error = `implausible date ${reading.d}/${reading.m}/${reading.y}`;
      result = { action: 'rejected', cairoToday, error: state.error };
    } else if (yesterday && reading.y === yesterday.y && reading.m === yesterday.m && reading.d === yesterday.d) {
      state.error = null;
      result = { action: 'unchanged', cairoToday, via };                // Dar al-Ifta hasn't moved to today yet
    } else {
      state.previous = state.anchor;
      state.anchor = { date: cairoToday, h: reading };
      state.offset = calc.offsetFor(cairoToday, reading, MAX_OFFSET);
      state.error = null;
      result = { action: 'confirmed', cairoToday, via, h: reading };
    }
    await kv.put(STATE_KEY, JSON.stringify(state));
    return result;
  }

  // The answer for a visitor's civil date: { date, h, source, provisional } or { error }.
  async function answer(date, now) {
    if (!calc.parseYMD(date)) return { error: 'date must be YYYY-MM-DD' };
    const cairoToday = calc.todayIn(CAIRO, now);
    if (Math.abs(calc.diffDays(cairoToday, date)) > 1) return { error: 'date must be within one day of Cairo\'s date' };
    const state = await readState();
    const h = counted(state, date);
    if (h) return { date, h, source: calc.SOURCES.DAR, provisional: false };
    // Not known yet: the calculator, shifted by Dar al-Ifta's last known offset.
    return { date, h: calc.fromCivil(date, state.offset || 0), source: calc.SOURCES.CALC, provisional: !!state.anchor };
  }

  return { check, answer, readState, readDar };
}

const why = (e) => (e && e.name === 'AbortError') ? 'timeout' : ((e && e.message) || 'failed');

module.exports = { createSource, parseSite, parseApi, hijriMonthNumber, CAIRO, STATE_KEY, CHECK_FROM_HOUR, FIRST_READ_HOUR, MAX_OFFSET, SITE, API };

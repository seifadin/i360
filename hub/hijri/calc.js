/* i360 Hijri calculator — the one offline Hijri calculation, shared by the
   dar-hijri Worker, the hub pages (built in) and the i360 release script
   (scripts/get-hijri-date.js, which requires this file), so every place
   computes the same date.

   Pure: no network, no storage, no clock of its own (callers pass the date).
   Dates are civil dates as 'YYYY-MM-DD' strings; a Hijri date is {y, m, d}
   with m = 1..12. An ES module: bundled into the pages, imported by Node and by
   the Worker, and served as is at dar-hijri.i36o.workers.dev/calc.js.

   The calendar is ICU's 'islamic' (astronomical), the one i360 has used as its
   fallback. 'islamic-civil' is a different calendar: they differ on most days.
   Dar al-Ifta decides months by sighting, so this can be a day off theirs;
   `offsetFor` measures that difference from one known Dar al-Ifta date.

   Change VERSION whenever behaviour or labels change: the Worker reports it,
   and a copy that doesn't match is flagged as out of date. */
const VERSION = 2;                 // 2: the 'provisional' label (2026-10-19)
const CALENDAR = 'islamic';
const SOURCES = Object.freeze({ DAR: 'dar', CALC: 'calc' });

// Shown next to the date: where it came from (or that it may still change). Keys are the day page's languages.
const LABELS = Object.freeze({
  dar: Object.freeze({ ar: 'حسب دار الإفتاء المصرية', en: "Per Egypt's Dar al-Ifta", tr: "Mısır Dar el-İfta'ya göre", id: 'Menurut Dar al-Ifta Mesir', ur: 'مصری دارالافتاء کے مطابق' }),
  calc: Object.freeze({ ar: 'تقويم حسابي تقريبي', en: 'Calculated (approximate)', tr: 'Hesaplanmış (yaklaşık)', id: 'Hitungan (perkiraan)', ur: 'حسابی (تخمینی)' }),
  // A calculated date Dar al-Ifta hasn't settled yet (the day after a 29th): it may still change.
  provisional: Object.freeze({ ar: 'بانتظار إعلان دار الإفتاء', en: "Awaiting Dar al-Ifta's announcement", tr: "Dar el-İfta'nın duyurusu bekleniyor", id: 'Menunggu pengumuman Dar al-Ifta', ur: 'دارالافتاء کے اعلان کا انتظار' })
});

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86400000;

// 'YYYY-MM-DD' -> that civil day as UTC midnight (a Date), or null if not a real date.
function parseYMD(s) {
  const m = YMD.exec(String(s));
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const dt = new Date(t);
  return (dt.getUTCFullYear() === +m[1] && dt.getUTCMonth() === +m[2] - 1 && dt.getUTCDate() === +m[3]) ? dt : null;
}

function toYMD(dt) {
  const p = (n, w) => String(n).padStart(w, '0');
  return `${p(dt.getUTCFullYear(), 4)}-${p(dt.getUTCMonth() + 1, 2)}-${p(dt.getUTCDate(), 2)}`;
}

function mustParse(s) {
  const dt = parseYMD(s);
  if (!dt) throw new RangeError(`HijriCalc: not a civil date "${s}" (expected YYYY-MM-DD)`);
  return dt;
}

function addDays(ymd, n) { return toYMD(new Date(mustParse(ymd).getTime() + n * DAY_MS)); }

// Whole days from a to b (b - a).
function diffDays(a, b) { return Math.round((mustParse(b).getTime() - mustParse(a).getTime()) / DAY_MS); }

// The civil date in a time zone at a moment (default: now). Callers pass `now` in tests.
function todayIn(timeZone, now) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now === undefined ? new Date() : now);
}

let fmt = null;
function formatter() {
  if (!fmt) fmt = new Intl.DateTimeFormat(`en-u-ca-${CALENDAR}-nu-latn`, { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
  return fmt;
}

// The calculated Hijri date of a civil date, shifted by `offset` days (see offsetFor).
function fromCivil(ymd, offset) {
  const dt = new Date(mustParse(ymd).getTime() + (offset || 0) * DAY_MS);
  const parts = formatter().formatToParts(dt);
  const get = (type) => parseInt(parts.find((x) => x.type === type).value, 10);
  return { y: get('year'), m: get('month'), d: get('day') };
}

function isHijri(h) {
  return !!h && Number.isInteger(h.y) && Number.isInteger(h.m) && Number.isInteger(h.d) &&
    h.y >= 1300 && h.y <= 1700 && h.m >= 1 && h.m <= 12 && h.d >= 1 && h.d <= 30;
}

const same = (a, b) => a.y === b.y && a.m === b.m && a.d === b.d;

// The day shift k such that fromCivil(civil, k) equals a known (e.g. Dar al-Ifta) date,
// trying the nearest first; null if they are more than `max` days apart.
function offsetFor(civil, hijri, max) {
  const limit = max === undefined ? 2 : max;
  for (let i = 0; i <= limit; i++) {
    for (const k of i === 0 ? [0] : [-i, i]) if (same(fromCivil(civil, k), hijri)) return k;
  }
  return null;
}

// A known Hijri date moved forward n days by counting alone. A month has 29 or 30 days:
// counting is certain up to day 29, and after a 30th comes the 1st. The day after a 29th
// is decided by sighting, so whenever counting would pass it the answer is null.
function countForward(h, n) {
  if (!isHijri(h) || !Number.isInteger(n) || n < 0) return null;
  if (n === 0) return { y: h.y, m: h.m, d: h.d };
  if (h.d + n <= 29) return { y: h.y, m: h.m, d: h.d + n };
  if (h.d === 30 && n <= 29) return h.m === 12 ? { y: h.y + 1, m: 1, d: n } : { y: h.y, m: h.m + 1, d: n };
  return null;
}

function label(source, lang) {
  const set = LABELS[source];
  if (!set) return '';
  return set[lang] || set.ar;
}

export { VERSION, CALENDAR, SOURCES, LABELS, parseYMD, toYMD, addDays, diffDays, todayIn, fromCivil, isHijri, offsetFor, countForward, label };

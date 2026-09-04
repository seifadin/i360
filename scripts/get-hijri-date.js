#!/usr/bin/env node
// scripts/get-hijri-date.js
// Outputs today's Hijri date as "yyyy\mm\dd" to stdout, source note to
// stderr (so callers capturing stdout alone get a clean value).
//
// Primary source: Egypt's Dar al-Ifta's own official API — the date
// they've actually, officially adopted (calculation combined with real
// observation-committee sighting, not a purely calculated approximation).
// Confirmed directly from their own account: "دار الإفتاء بتجمع بين
// الحساب الفلكي... وبين الرؤية الشرعية بالعين" — genuinely different
// from either Intl calendar variant below, both of which are pure
// calculation with no observational component at all.
//
// Fallback: Node's built-in Intl islamic calendar — 'islamic',
// deliberately NOT 'islamic-umalqura' (an explicit choice, not a
// default; islamic-umalqura tracked Dar al-Ifta's real result more
// closely in the one direct comparison made during development, but the
// project owner chose islamic anyway). Used only if the API is
// unreachable, slow, or returns something unparseable. A calculated
// approximation, not the officially-adopted date — accepted here since
// this value only ever feeds a release-version timestamp, not anything
// religiously load-bearing.
//
// Honest, unresolved note: di107.dar-alifta.org's robots.txt disallows
// automated access generally, though this specific /api/ endpoint is
// documented elsewhere on their own site as offered to third-party
// websites for exactly this kind of embedding. Which of those two
// signals should actually govern here hasn't been resolved — flagged,
// not silently decided.
//
// The exact raw response format ("22 ربيع الأول 1448", per a real,
// manually-checked example) was NOT independently re-verified against a
// live fetch while writing this — the parsing below is built to be
// reasonably tolerant of spacing/spelling variance, but treat the first
// few real runs as a check on that, not an assumption it's already
// confirmed correct.

const HIJRI_MONTH_ALIASES = {
  'محرم': 1,
  'صفر': 2,
  'ربيع الأول': 3, 'ربيع الاول': 3,
  'ربيع الآخر': 4, 'ربيع الاخر': 4, 'ربيع الثاني': 4,
  'جمادى الأولى': 5, 'جمادى الاولى': 5, 'جمادى الأول': 5, 'جمادى الاول': 5,
  'جمادى الآخرة': 6, 'جمادى الاخرة': 6, 'جمادى الثانية': 6, 'جمادى الثاني': 6,
  'رجب': 7,
  'شعبان': 8,
  'رمضان': 9,
  'شوال': 10,
  'ذو القعدة': 11, 'ذو القعده': 11,
  'ذو الحجة': 12, 'ذو الحجه': 12,
};

function pad(n) {
  return String(n).padStart(2, '0');
}

async function fetchDarAlIftaDate() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('http://di107.dar-alifta.org/api/HijriDate?langID=1', {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();

    // Expected shape: "22 ربيع الأول 1448" — day, Arabic month name,
    // year. Extract the two numeric tokens and whatever text sits
    // between them, rather than assume exact whitespace/token count.
    const match = text.match(/(\d{1,2})\s+(.+?)\s+(\d{3,4})/);
    if (!match) return null;

    const [, dayStr, monthName, yearStr] = match;
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);
    const month = HIJRI_MONTH_ALIASES[monthName.trim()];

    if (!month || !day || !year) return null;
    return { year, month, day };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function calculatedFallback() {
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date());
  const get = (type) => parseInt(parts.find(p => p.type === type).value, 10);
  return { year: get('year'), month: get('month'), day: get('day') };
}

async function main() {
  let result = await fetchDarAlIftaDate();
  let source = 'dar-alifta (official, observation-confirmed)';
  if (!result) {
    result = calculatedFallback();
    source = 'islamic calendar, calculated fallback — Dar al-Ifta unreachable or unparseable';
  }
  process.stderr.write(`(Hijri date source: ${source})\n`);
  process.stdout.write(`${result.year}\\${pad(result.month)}\\${pad(result.day)}\n`);
}

main();

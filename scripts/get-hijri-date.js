#!/usr/bin/env node
// scripts/get-hijri-date.js
// Outputs today's Hijri date as "dd-mm-yyyy" to stdout, source/diagnostic
// notes to stderr (so callers capturing stdout alone get a clean value).
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
// Diagnostics (2026-09-04): a real production run fell back silently
// with no indication of why — the primary source may have genuinely
// been unreachable, or the response format may not match what was
// checked manually once ("22 ربيع الأول 1448", never independently
// re-verified via a live fetch, since robots.txt blocked a direct check
// while building this). Every failure point below now writes a specific
// stderr reason, distinguishing a network/timeout failure, a non-200
// response, an unparseable response (with the raw text included), and
// an unrecognized month name (also with the raw text) — so the next
// real run tells us definitively which case it actually was, rather
// than leaving all of them looking identical.

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
    if (!res.ok) {
      process.stderr.write(`(Dar al-Ifta returned HTTP ${res.status} ${res.statusText})\n`);
      return null;
    }
    const text = (await res.text()).trim();

    // Expected shape: "22 ربيع الأول 1448" — day, Arabic month name,
    // year. Extract the two numeric tokens and whatever text sits
    // between them, rather than assume exact whitespace/token count.
    const match = text.match(/(\d{1,2})\s+(.+?)\s+(\d{3,4})/);
    if (!match) {
      process.stderr.write(`(Dar al-Ifta response didn't match the expected pattern. Raw response: ${JSON.stringify(text)})\n`);
      return null;
    }

    const [, dayStr, monthName, yearStr] = match;
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);
    const trimmedMonth = monthName.trim();
    const month = HIJRI_MONTH_ALIASES[trimmedMonth];

    if (!month) {
      process.stderr.write(`(Dar al-Ifta month name not recognized: "${trimmedMonth}". Raw response: ${JSON.stringify(text)})\n`);
      return null;
    }
    if (!day || !year) {
      process.stderr.write(`(Dar al-Ifta day/year parsed as invalid. Raw response: ${JSON.stringify(text)})\n`);
      return null;
    }
    return { year, month, day };
  } catch (err) {
    if (err.name === 'AbortError') {
      process.stderr.write('(Dar al-Ifta fetch timed out after 5s)\n');
    } else {
      process.stderr.write(`(Dar al-Ifta fetch failed: ${err.name}: ${err.message})\n`);
    }
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
    source = 'islamic calendar, calculated fallback — see the specific reason logged above';
  }
  process.stderr.write(`(Hijri date source: ${source})\n`);
  process.stdout.write(`${pad(result.day)}-${pad(result.month)}-${result.year}\n`);
}

main();


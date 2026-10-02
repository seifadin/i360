#!/usr/bin/env node
// scripts/get-hijri-date.js
// Outputs today's Hijri date as "dd-mm-yyyy" to stdout, source/diagnostic
// notes to stderr (so callers capturing stdout alone get a clean value).
//
// Primary source (switched 2026-10-03, tested first in a separate app):
// a dedicated Cloudflare Worker (dar-hijri.i36o.workers.dev) that itself
// sources from Egypt's Dar al-Ifta — the date they've actually,
// officially adopted (calculation combined with real observation-
// committee sighting, not a purely calculated approximation). Confirmed
// directly from their own account: "دار الإفتاء بتجمع بين الحساب
// الفلكي... وبين الرؤية الشرعية بالعين" — genuinely different from
// either Intl calendar variant below, both of which are pure
// calculation with no observational component at all. The worker's own
// response already includes a "via" field confirming its source
// internally; this script doesn't branch on it, just logs it alongside
// the date for visibility.
//
// This replaces an earlier direct call to Dar al-Ifta's own API
// (di107.dar-alifta.org), retired here in favor of the worker now that
// it's been tested directly and confirmed working — the previous,
// direct integration's own real robots.txt ambiguity (disallowing
// automated access generally, while a specific /api/ endpoint was
// separately documented elsewhere as offered for embedding) is no
// longer this script's own concern either way, since it now talks to
// the worker's domain, not Dar al-Ifta's directly.
//
// Fallback: Node's built-in Intl islamic calendar — 'islamic',
// deliberately NOT 'islamic-umalqura' (an explicit choice, not a
// default; islamic-umalqura tracked Dar al-Ifta's real result more
// closely in the one direct comparison made during development, but the
// project owner chose islamic anyway). Used only if the worker is
// unreachable, slow, or returns something unparseable. A calculated
// approximation, not the officially-adopted date — accepted here since
// this value only ever feeds a release-version timestamp, not anything
// religiously load-bearing.
//
// Diagnostics (2026-09-04, still honored after the 2026-10-03 source
// switch): a real production run once fell back silently with no
// indication of why. Every failure point below writes a specific
// stderr reason, distinguishing a network/timeout failure, a non-200
// response, an unparseable response (with the raw text included), and
// an unrecognized month name (also with the raw text) — so a real run
// tells us definitively which case it actually was, rather than
// leaving all of them looking identical.

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

async function fetchHijriWorkerDate() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch('https://dar-hijri.i36o.workers.dev/', {
      signal: controller.signal,
    });
    if (!res.ok) {
      process.stderr.write(`(hijri worker returned HTTP ${res.status} ${res.statusText})\n`);
      return null;
    }

    // Expected shape: {"hijri":"21 ربيع الآخر 1448","cairo":"2026-10-03",
    // "via":"site"} — confirmed directly 2026-10-03. "cairo" (the
    // Gregorian date the worker resolved against) and "via" (the
    // worker's own internal source) aren't needed for this script's own
    // output, but are logged alongside the date below for visibility,
    // the same spirit as every other diagnostic in this file.
    let data;
    try {
      data = await res.json();
    } catch (err) {
      const raw = await res.text().catch(() => '(body unreadable)');
      process.stderr.write(`(hijri worker response wasn't valid JSON: ${err.message}. Raw response: ${JSON.stringify(raw)})\n`);
      return null;
    }

    const text = String(data.hijri ?? '').trim();
    if (!text) {
      process.stderr.write(`(hijri worker response missing a "hijri" field. Raw response: ${JSON.stringify(data)})\n`);
      return null;
    }

    // Same shape the old Dar al-Ifta API used, and the same parsing —
    // day, Arabic month name, year. Extract the two numeric tokens and
    // whatever text sits between them, rather than assume exact
    // whitespace/token count.
    const match = text.match(/(\d{1,2})\s+(.+?)\s+(\d{3,4})/);
    if (!match) {
      process.stderr.write(`(hijri worker's "hijri" field didn't match the expected pattern. Raw value: ${JSON.stringify(text)})\n`);
      return null;
    }

    const [, dayStr, monthName, yearStr] = match;
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);
    const trimmedMonth = monthName.trim();
    const month = HIJRI_MONTH_ALIASES[trimmedMonth];

    if (!month) {
      process.stderr.write(`(hijri worker month name not recognized: "${trimmedMonth}". Raw value: ${JSON.stringify(text)})\n`);
      return null;
    }
    if (!day || !year) {
      process.stderr.write(`(hijri worker day/year parsed as invalid. Raw value: ${JSON.stringify(text)})\n`);
      return null;
    }
    if (data.cairo || data.via) {
      process.stderr.write(`(hijri worker: cairo=${data.cairo ?? 'n/a'}, via=${data.via ?? 'n/a'})\n`);
    }
    return { year, month, day };
  } catch (err) {
    if (err.name === 'AbortError') {
      process.stderr.write('(hijri worker fetch timed out after 5s)\n');
    } else {
      process.stderr.write(`(hijri worker fetch failed: ${err.name}: ${err.message})\n`);
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
  let result = await fetchHijriWorkerDate();
  let source = 'dar-hijri worker (official, observation-confirmed via Dar al-Ifta)';
  if (!result) {
    result = calculatedFallback();
    source = 'islamic calendar, calculated fallback — see the specific reason logged above';
  }
  process.stderr.write(`(Hijri date source: ${source})\n`);
  process.stdout.write(`${pad(result.day)}-${pad(result.month)}-${result.year}\n`);
}

// Belt-and-suspenders (2026-09-06): fetchHijriWorkerDate() always
// resolves (its own try/catch never lets it throw), so this only ever
// fires if calculatedFallback() itself throws — a genuinely broken
// Node/ICU environment lacking Islamic-calendar support, for instance.
// Node already crashes loudly on an unhandled rejection by default (not
// silent), but a labeled message here is clearer than a raw stack
// trace, matching every other failure point in this file.
main().catch(err => {
  process.stderr.write(`(get-hijri-date.js: unhandled failure — ${err.name}: ${err.message})\n`)
  process.exit(1)
})


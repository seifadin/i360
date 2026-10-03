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
// response includes a "via" field; "site" is the only value seen so far.
// This script doesn't change the date based on it, but only labels the
// source "official" when via === "site" (see main()), and logs it either
// way — it doesn't know what other values the worker can emit.
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

// Cleans the worker's text before PARSING it (never before logging it —
// diagnostics show what the worker actually sent, via show() below).
// Three things scraped Arabic text routinely carries that look identical
// on screen but break the exact-match month lookup and the \d patterns:
//
//  1. Invisible format characters (Unicode category Cf): direction marks
//     RLM/LRM/ALM, embeddings/isolates, zero-width space/joiners, BOM.
//     Matched by category rather than a hand-picked list, so a mark nobody
//     thought of is still caught. Confirmed by direct test (2026-10-03)
//     that a mark right after, inside, or glued next to the month/year
//     silently dropped to the calculated fallback; trailing/leading ones
//     passed only by luck of where the regex happened to land.
//  2. Non-standard whitespace (no-break space etc.) — \s+ between the
//     three tokens tolerates it, but the month NAME may contain a space
//     of its own ("ربيع الآخر"), and the alias keys use a plain one. All
//     runs collapse to a single plain space.
//  3. Arabic-Indic (U+0660-0669, ٠-٩) and Extended Arabic-Indic / Persian
//     (U+06F0-06F9, ۰-۹) digits -> ASCII. JS's \d (no /u flag) matches
//     ASCII digits only, so "٢١ ربيع الآخر ١٤٤٨" would otherwise fail the
//     pattern. Today the worker sends ASCII digits; cheap insurance.
//
// Returns { text, notes } — notes names what was cleaned, so the caller
// can log that the worker's format drifted instead of absorbing it
// silently.
function normalizeHijriText(str) {
  const notes = [];
  let out = String(str);

  const hidden = [...new Set(out.match(/\p{Cf}/gu) ?? [])];
  if (hidden.length) {
    notes.push(`invisible characters ${hidden.map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(', ')}`);
    // U+200B (zero-width space) and U+2063 (invisible separator) are
    // defined by Unicode as word/item SEPARATORS, so they become a space
    // rather than vanishing — deleting one that is the only thing between
    // two words ("ربيع<ZWSP>الآخر") would glue them together and miss the
    // month lookup. Everything else in Cf (direction marks, joiners, soft
    // hyphen, BOM, word joiner...) is pure decoration and is removed.
    // Known trade-off: a ZWSP in the MIDDLE of a single word would split
    // it; that falls back safely, with the character named in the log.
    out = out.replace(/[\u200B\u2063]/g, ' ').replace(/\p{Cf}/gu, '');
  }
  if (/[^\S ]/.test(out)) notes.push('non-standard whitespace');
  out = out.replace(/\s+/g, ' ');
  if (/[\u0660-\u0669\u06F0-\u06F9]/.test(out)) notes.push('non-ASCII digits');
  out = out
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));

  return { text: out.trim(), notes };
}

// JSON.stringify for diagnostics, but with invisible characters and
// non-standard spaces spelled out as \u{XXXX}. Plain JSON.stringify
// leaves them raw, so a month name carrying a hidden mark prints as
// "ربيع الآخر" — visually identical to a VALID alias, which made the
// "month name not recognized" message actively misleading (observed in
// the 2026-10-03 baseline test). Every diagnostic that prints
// worker-originated text goes through this.
function show(value) {
  return JSON.stringify(value).replace(/[\p{Cf}\p{Z}]/gu, c =>
    c === ' ' ? c : `\\u{${c.codePointAt(0).toString(16).toUpperCase()}}`);
}

// Today's Gregorian date in Cairo as YYYY-MM-DD, or null if this Node/ICU
// build can't resolve the timezone (the check using it is then skipped,
// never fatal). Built from formatToParts rather than a locale's own
// date format, so it doesn't depend on a locale's field order.
function todayInCairo() {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const get = (type) => parts.find(p => p.type === type).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  } catch {
    return null;
  }
}

// Staleness check (2026-10-03). The worker's "cairo" field is the
// Gregorian date its Hijri answer was resolved against. If that isn't
// today in Cairo, the worker may be serving a cached response and the
// Hijri date could be off by that many days — which would flow straight
// into a release record. WARNING ONLY: never changes the date, never
// fails the run, and every way the check itself can't run (no field, odd
// format, no timezone support) is reported as skipped rather than
// guessed at. A false positive is possible for the few seconds around
// Cairo midnight (the response and this check can land on either side of
// it); that's acceptable for a warning.
function checkWorkerFreshness(cairoRaw) {
  if (!cairoRaw) {
    process.stderr.write('(hijri worker: no "cairo" date in the response — staleness check skipped)\n');
    return;
  }
  const { text: cairo, notes: cairoNotes } = normalizeHijriText(cairoRaw);
  if (cairoNotes.length) {
    process.stderr.write(`(hijri worker "cairo" value normalized for parsing — ${cairoNotes.join('; ')}. Raw value: ${show(cairoRaw)})\n`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cairo)) {
    process.stderr.write(`(hijri worker: "cairo" value isn't YYYY-MM-DD: ${show(cairoRaw)} — staleness check skipped)\n`);
    return;
  }
  const today = todayInCairo();
  if (!today) {
    process.stderr.write('(could not determine today\'s date in Cairo on this Node/ICU build — staleness check skipped)\n');
    return;
  }
  if (cairo === today) return;

  // Both parse as UTC midnight, so the difference is a whole number of days.
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${cairo}T00:00:00Z`)) / 86400000);
  if (Number.isNaN(days)) {
    process.stderr.write(`(hijri worker: "cairo" value ${show(cairoRaw)} isn't a real date — staleness check skipped)\n`);
    return;
  }
  if (days > 0) {
    process.stderr.write(`(WARNING — hijri worker date looks STALE: its cairo date is ${cairo}, but today in Cairo is ${today} — ${days} day(s) behind. It may be serving a cached response, so the Hijri date below could be off by that much.)\n`);
  } else {
    process.stderr.write(`(WARNING — hijri worker's cairo date ${cairo} is ${-days} day(s) AHEAD of today in Cairo (${today}). Either this machine's clock is wrong or the worker's is; the Hijri date below may be off.)\n`);
  }
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
    // Read the body ONCE as text, then parse it — calling res.json() and
    // falling back to res.text() on failure doesn't work: the first call
    // consumes the body ("Body has already been read"), so the raw-
    // response diagnostic would be useless in exactly the likeliest real
    // failure (an HTML error page from Cloudflare or the worker).
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      process.stderr.write(`(hijri worker response wasn't valid JSON: ${err.message}. Raw response: ${show(raw.slice(0, 300))})\n`);
      return null;
    }
    if (data === null || typeof data !== 'object') {
      process.stderr.write(`(hijri worker response wasn't a JSON object. Raw response: ${show(raw.slice(0, 300))})\n`);
      return null;
    }

    // Deliberately NOT trimmed here: normalizeHijriText() trims, and
    // trimming first silently removed a leading BOM (JS treats U+FEFF as
    // whitespace) before it could be reported.
    const text = String(data.hijri ?? '');
    if (!text.trim()) {
      process.stderr.write(`(hijri worker response missing a "hijri" field. Raw response: ${show(data)})\n`);
      return null;
    }

    // Same shape the old Dar al-Ifta API used, and the same parsing —
    // day, Arabic month name, year. Extract the two numeric tokens and
    // whatever text sits between them, rather than assume exact
    // whitespace/token count.
    const { text: parseable, notes } = normalizeHijriText(text);
    if (notes.length) {
      process.stderr.write(`(hijri worker value normalized for parsing — ${notes.join('; ')}. Raw value: ${show(text)})\n`);
    }
    const match = parseable.match(/(\d{1,2})\s+(.+?)\s+(\d{3,4})/);
    if (!match) {
      process.stderr.write(`(hijri worker's "hijri" field didn't match the expected pattern. Raw value: ${show(text)})\n`);
      return null;
    }

    const [, dayStr, monthName, yearStr] = match;
    const day = parseInt(dayStr, 10);
    const year = parseInt(yearStr, 10);
    const trimmedMonth = monthName.trim();
    const month = HIJRI_MONTH_ALIASES[trimmedMonth];

    if (!month) {
      process.stderr.write(`(hijri worker month name not recognized: ${show(trimmedMonth)}. Raw value: ${show(text)})\n`);
      return null;
    }
    if (!day || !year) {
      process.stderr.write(`(hijri worker day/year parsed as invalid. Raw value: ${show(text)})\n`);
      return null;
    }
    if (data.cairo || data.via) {
      process.stderr.write(`(hijri worker: cairo=${data.cairo ?? 'n/a'}, via=${data.via ?? 'n/a'})\n`);
    }
    checkWorkerFreshness(data.cairo);
    return { year, month, day, via: data.via };
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
  // Only claim "official" when the worker itself says it read Dar al-Ifta's
  // site. Confirmed value so far: "site". Any other value (or none) is
  // reported as-is rather than assumed to be the same thing — this script
  // doesn't know what else the worker can emit, so it shouldn't vouch for it.
  let source = result && result.via === 'site'
    ? 'dar-hijri worker (via=site: official, observation-confirmed via Dar al-Ifta)'
    : `dar-hijri worker (via=${result ? result.via ?? 'n/a' : 'n/a'} — NOT confirmed as Dar al-Ifta's own site)`;
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


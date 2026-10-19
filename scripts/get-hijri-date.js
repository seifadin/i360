#!/usr/bin/env node
// scripts/get-hijri-date.js
// Outputs today's Hijri date as "dd-mm-yyyy" to stdout (the release record's
// Hijri half, read by pre-commit-hook.sh); notes go to stderr, so stdout stays clean.
//
// The date comes from the shared i360 Hijri files (hub repo hijri/, i360-hub.md §8):
// scripts/hijri/client.js asks the dar-hijri Worker (Dar al-Ifta's date, counted
// between their changes) and, when it can't, returns the date from
// scripts/hijri/calc.js marked as calculated. Never fails.
//
// "Today" is this machine's date: the same day as the Gregorian half, which the
// hook takes from `date`.
//
// scripts/hijri/ holds copies; update them with `node scripts/sync-hijri.js`
// (prompted below when the Worker runs a newer calc.js).
import './hijri/calc.js';
import './hijri/client.js';

const { HijriClient } = globalThis;
const pad = (n) => String(n).padStart(2, '0');
const note = (s) => process.stderr.write(`${s}\n`);

const r = await HijriClient.get({ lang: 'en' });
const value = `${pad(r.h.d)}-${pad(r.h.m)}-${r.h.y}`;

if (r.source === 'dar') {
  note(`(Hijri date ${value} for ${r.date}: ${r.label}, via the dar-hijri Worker)`);
} else {
  // Calculated: the Worker was unreachable, or Dar al-Ifta's date isn't known yet.
  const yellow = process.stderr.isTTY ? (s) => `\x1b[1;33m${s}\x1b[0m` : (s) => s;
  const why = r.error ? `the Worker couldn't be used (${r.error})` : (r.provisional ? 'Dar al-Ifta hasn\'t settled this day yet' : 'Dar al-Ifta\'s date isn\'t known yet');
  const bar = '='.repeat(72);
  note(yellow(bar));
  note(yellow(`  WARNING: Hijri date CALCULATED, not Dar al-Ifta's: ${why}.`));
  note(yellow(`  Used for this release anyway: ${value} (for ${r.date}). It may be a day off.`));
  note(yellow(bar));
}
if (r.provisional) note('(Hijri date is provisional: the day after a 29th, before Dar al-Ifta announced the new month)');
if (r.outdated) note('(The dar-hijri Worker runs a different calc.js than scripts/hijri/: run `node scripts/sync-hijri.js` and commit the result)');

process.stdout.write(`${value}\n`);

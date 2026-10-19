#!/usr/bin/env node
// scripts/sync-hijri.js — node scripts/sync-hijri.js
// Updates scripts/hijri/calc.js and scripts/hijri/client.js from the dar-hijri
// Worker, which serves the exact files it runs (hub repo hijri/, i360-hub.md §8).
// Run it when get-hijri-date.js says the copies are out of date, then review the
// diff and commit. Nothing here runs the downloaded code; files are only written
// after both downloads look right.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import './hijri/calc.js';
import './hijri/client.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), 'hijri');
const files = [
  { name: 'calc.js', marker: 'root.HijriCalc = factory' },
  { name: 'client.js', marker: 'root.HijriClient = factory' }
];
const version = (text) => { const m = /const VERSION = (\d+);/.exec(text); return m ? +m[1] : null; };

const fetched = [];
for (const f of files) {
  const url = `${globalThis.HijriClient.WORKER}/${f.name}`;
  let text;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    console.error(`✗ ${url}: ${e.name === 'TimeoutError' ? 'timed out' : e.message}. Nothing changed.`);
    process.exit(1);
  }
  if (!text.includes(f.marker) || version(text) === null) {
    console.error(`✗ ${url} doesn't look like ${f.name} (no "${f.marker}" or no VERSION). Nothing changed.`);
    process.exit(1);
  }
  fetched.push({ ...f, text });
}

let changed = 0;
for (const f of fetched) {
  const path = join(dir, f.name), old = readFileSync(path, 'utf8');
  if (old === f.text) { console.log(`= ${f.name} v${version(old)}: already current`); continue; }
  writeFileSync(path, f.text);
  changed++;
  console.log(`↑ ${f.name}: v${version(old)} → v${version(f.text)}`);
}
console.log(changed ? 'Review with `git diff scripts/hijri/`, then commit.' : 'Nothing to update.');

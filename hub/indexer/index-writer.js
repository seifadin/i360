// i360 CSE — writes one published build from the extracted pages.
//
// Input: sources, each with its catalog details and loadPages() returning
// [{ label, vol, paras }] (read from the indexer's cache on demand, so the
// whole library never sits in memory at once). Output, under outDir:
//   latest.json, b/<buildId>/catalog.json, index/<sss>.bin, text/<key>/<n>.json
// (format in src/cse-index.js).
//
// The trigram lists are built in several passes, each covering a slice of
// the shards, to keep memory low; every pass reads the pages again.
'use strict';
const { mkdirSync, writeFileSync, statSync, readdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const SearchCore = require('../src/search-core.js');
const BookFormat = require('../src/book-format.js');
const CseIndex = require('../src/cse-index.js');

// Cloudflare Workers static assets (Free plan): files per version, bytes per file.
const MAX_FILES = 20000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const CHUNK_BYTES = 256 * 1024;

function keyFor(id, used) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  let key = (h >>> 0).toString(36);
  while (used.has(key)) key += 'x';
  used.add(key);
  return key;
}

function walkFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(p)); else out.push(p);
  }
  return out;
}

async function writeBuild({ sources, outDir, buildId, passes = 8, chunkBytes = CHUNK_BYTES, log = () => {} }) {
  const base = join(outDir, 'b', buildId);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(base, 'index'), { recursive: true });

  // Stable order: by source id.
  const ordered = [...sources].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const usedKeys = new Set();
  const catalogSources = [];
  const unindexed = [];
  let pageCount = 0;

  // 1. Page text, in chunks per source. Progress every 10%.
  let written = 0, lastTenth = 0;
  for (const s of ordered) {
    written++;
    const tenth = Math.floor((written / ordered.length) * 10);
    if (tenth > lastTenth || written === ordered.length) { lastTenth = tenth; log(`  text: ${written}/${ordered.length} sources written`); }
    const pages = await s.loadPages();
    if (!pages || pages.length === 0) { unindexed.push({ id: s.id, url: s.url, reason: s.reason || 'no text' }); continue; }
    const key = keyFor(s.id, usedKeys);
    mkdirSync(join(base, 'text', key), { recursive: true });
    const chunks = [];
    let cur = [], curBytes = 0, curStart = 0;
    const flush = () => {
      if (cur.length === 0) return;
      writeFileSync(join(base, 'text', key, `${chunks.length}.json`), JSON.stringify({ pages: cur }));
      chunks.push(curStart);
      cur = []; curBytes = 0;
    };
    pages.forEach((p, i) => {
      const entry = { label: p.label == null ? '' : String(p.label), vol: p.vol == null ? null : String(p.vol), paras: p.paras };
      const bytes = Buffer.byteLength(JSON.stringify(entry));
      if (cur.length > 0 && curBytes + bytes > chunkBytes) flush();
      if (cur.length === 0) curStart = i;
      cur.push(entry);
      curBytes += bytes;
    });
    flush();
    catalogSources.push({
      key, id: s.id, url: s.url, links: s.links, type: s.type, title: s.title || null,
      fingerprint: s.fingerprint || null, firstPage: pageCount, pageCount: pages.length, chunks, usedBy: s.usedBy
    });
    pageCount += pages.length;
  }
  log(`  text: ${catalogSources.length} sources, ${pageCount} pages`);

  // 2. Trigram shards, a slice of shards per pass.
  const byId = new Map(ordered.map((s) => [s.id, s]));
  const per = Math.ceil(CseIndex.SHARDS / passes);
  for (let pass = 0; pass < passes; pass++) {
    const lo = pass * per, hi = Math.min(CseIndex.SHARDS, lo + per);
    if (lo >= hi) break;
    const shards = Array.from({ length: hi - lo }, () => new Map());
    for (const cs of catalogSources) {
      const pages = await byId.get(cs.id).loadPages();
      pages.forEach((p, i) => {
        const gp = cs.firstPage + i;
        for (const t of CseIndex.trigrams(CseIndex.searchPage(p.paras, false).norm)) {
          const sh = CseIndex.shardOf(t);
          if (sh < lo || sh >= hi) continue;
          const m = shards[sh - lo];
          const list = m.get(t);
          if (list) list.push(gp); else m.set(t, [gp]);
        }
      });
    }
    for (let sh = lo; sh < hi; sh++) {
      writeFileSync(join(base, 'index', `${CseIndex.shardName(sh)}.bin`), CseIndex.encodeShard(shards[sh - lo]));
    }
    log(`  index: pass ${pass + 1}/${passes} (shards ${lo}–${hi - 1})`);
  }

  // 3. Catalog and the pointer to this build.
  const catalog = {
    format: CseIndex.FORMAT, buildId, builtAt: new Date().toISOString(),
    searchCore: SearchCore.VERSION, bookFormat: BookFormat.VERSION,
    shards: CseIndex.SHARDS, minQuery: CseIndex.MIN_QUERY,
    pageCount, sources: catalogSources, unindexed
  };
  writeFileSync(join(base, 'catalog.json'), JSON.stringify(catalog));
  writeFileSync(join(outDir, 'latest.json'), JSON.stringify({ buildId }));

  // 4. Within Cloudflare's limits?
  const files = walkFiles(outDir);
  let total = 0, largest = { size: 0, path: '' };
  for (const f of files) {
    const size = statSync(f).size;
    total += size;
    if (size > largest.size) largest = { size, path: f };
  }
  const stats = { files: files.length, totalBytes: total, largest, pageCount, sources: catalogSources.length, unindexed: unindexed.length };
  if (files.length > MAX_FILES) throw new Error(`build has ${files.length} files; Cloudflare allows ${MAX_FILES}`);
  if (largest.size > MAX_FILE_BYTES) throw new Error(`${largest.path} is ${largest.size} bytes; Cloudflare allows ${MAX_FILE_BYTES} per file`);
  return { catalog, stats };
}

module.exports = { writeBuild, MAX_FILES, MAX_FILE_BYTES };

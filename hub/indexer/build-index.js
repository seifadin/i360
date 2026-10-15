// i360 CSE — the indexer (sprint S3).
//
//   npm run index                      download what changed, build indexer/dist/
//   npm run index -- --refresh <url>   download that source again (or: --refresh all)
//
// 1. Reads the links in BotKB and CustomSearchAIKBlessBotKB from Baserow
//    (same rules as the inventory; whole-website links are skipped).
// 2. For each source, asks for its current fingerprint (archive.org md5,
//    Wikipedia/Wikisource revision, HTTP ETag). If the cached text was made
//    from the same fingerprint, by the same extractor version, it is reused;
//    otherwise the source is downloaded and split into pages again.
//    A source that can't be reached keeps its cached text (marked stale);
//    with no cache it is listed as unindexed and tried again next run —
//    never treated as removed.
// 3. Writes a complete build to indexer/dist/ (format in src/cse-index.js),
//    within Cloudflare's file limits, ready to publish (S6).
//
// The cache (indexer/cache/) and dist (indexer/dist/) are git-ignored.
// Needs BASEROW_KEY in .env, like the inventory.
'use strict';
const { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync } = require('node:fs');
const { join } = require('node:path');
const inventory = require('./inventory.js');
const extract = require('./extract.js');
const { writeBuild } = require('./index-writer.js');
const BookFormat = require('../src/book-format.js');
const SearchCore = require('../src/search-core.js');

// Bump when the way text is extracted changes: every cached text is redone.
const EXTRACTOR_VERSION = 1;
const CONCURRENCY = 3;
const LIB_HOST = 'lib.i36o.workers.dev';

const cacheKey = (id) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `${(h >>> 0).toString(36)}-${id.length}`;
};

function readCache(dir, id) {
  const d = join(dir, cacheKey(id));
  try {
    const meta = JSON.parse(readFileSync(join(d, 'meta.json'), 'utf8'));
    if (meta.id !== id) return null;
    return { meta, pagesPath: join(d, 'pages.json') };
  } catch { return null; }
}

function writeCache(dir, id, meta, pages) {
  const d = join(dir, cacheKey(id));
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'pages.json'), JSON.stringify(pages));
  writeFileSync(join(d, 'meta.json'), JSON.stringify({ ...meta, id }, null, 2));
  return join(d, 'pages.json');
}

const versionsNow = () => ({ extractor: EXTRACTOR_VERSION, bookFormat: BookFormat.VERSION, searchCore: SearchCore.VERSION });
const sameVersions = (meta) => {
  const v = versionsNow();
  return meta.extractor === v.extractor && meta.bookFormat === v.bookFormat;
};

// A book of our own, linked from Baserow by its address on the lib site, is
// read from library/books/ (so it can be indexed before it is published).
function localBookPath(libraryDir, src) {
  try {
    const u = new URL(src.fetchUrl);
    if (u.hostname !== LIB_HOST || !u.pathname.startsWith('/books/')) return null;
    const p = join(libraryDir, decodeURIComponent(u.pathname.slice('/books/'.length)));
    return existsSync(p) ? p : null;
  } catch { return null; }
}

// Fresh text for one source: { pages, fingerprint, title }.
async function fetchText(fetchFn, src, { libraryDir, archivePages }) {
  const local = localBookPath(libraryDir, src);
  if (local) {
    const raw = readFileSync(local, 'utf8');
    return { pages: extract.bookPages(raw), fingerprint: `local:${raw.length}:${hash(raw)}` };
  }
  if (src.kind === 'archive-file') return archivePages((url, o) => inventory.fetchWithRetry(fetchFn, url, o), src);
  if (src.kind === 'wikimedia') return extract.wikimediaPages((url, o) => inventory.fetchWithRetry(fetchFn, url, o), src);
  if (extract.translatedWiki(src.fetchUrl)) return extract.translatedWikiPages((url, o) => inventory.fetchWithRetry(fetchFn, url, o), src);
  if (src.type === 'md' || src.type === 'md-ocr') {
    const res = await inventory.fetchWithRetry(fetchFn, src.fetchUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.text();
    return { pages: extract.bookPages(raw), fingerprint: res.headers.get('etag') ? `etag:${res.headers.get('etag')}` : `len:${raw.length}:${hash(raw)}` };
  }
  return extract.webPages((url, o) => inventory.fetchWithRetry(fetchFn, url, o), src);
}

function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

async function mapLimit(items, limit, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i], i); }
  }));
}

async function run({
  fetchFn = fetch, key, table = inventory.DEFAULT_TABLE, rootDir = __dirname,
  refresh = [], archivePages = extract.archivePages, passes = 8, log = console.log, buildId
}) {
  if (!key) throw new Error('BASEROW_KEY is not set. Add it to .env (the read-only Baserow token) and run: npm run index');
  const cacheDir = join(rootDir, 'cache');
  const distDir = join(rootDir, 'dist');
  const libraryDir = join(rootDir, '..', 'library', 'books');
  mkdirSync(cacheDir, { recursive: true });
  inventory.clearProbeCache();

  log(`Reading Baserow table ${table}…`);
  const { rows } = await inventory.readRows(fetchFn, key, table);
  const all = inventory.collectSources(rows).sources;
  const sources = all.filter((s) => s.kind !== 'website');
  const refreshAll = refresh.includes('all');
  const wantRefresh = (s) => refreshAll || refresh.some((r) => s.links.includes(r) || s.id === r || s.fetchUrl === r);
  log(`${sources.length} sources (${all.length - sources.length} website links skipped).`);

  const status = { reused: [], fresh: [], stale: [], failed: [] };
  const entries = [];   // for the writer
  const started = Date.now();
  let done = 0;
  const WORDS = { reused: 'unchanged', fresh: 'downloaded', stale: 'UNREACHABLE, old text kept', failed: 'UNREACHABLE, not indexed' };
  await mapLimit(sources, CONCURRENCY, async (src) => {
    const t0 = Date.now();
    const cached = readCache(cacheDir, src.id);
    let pagesPath = null, fingerprint = null, title = null, state = null, reason = null, how = null, pageCount = null, link = null;
    try {
      // Cheap check first: has the source changed since it was cached?
      let current = null;
      if (cached && !wantRefresh(src) && sameVersions(cached.meta) && !localBookPath(libraryDir, src)) {
        // archive.org: the md5 from the item's metadata is enough; the storage
        // server isn't contacted (a slow one made unchanged books download again).
        if (src.kind === 'archive-file') {
          current = await extract.archiveFingerprint((url, o) => inventory.fetchWithRetry(fetchFn, url, o), src).catch(() => null);
        } else {
          const p = await inventory.probe(fetchFn, src);
          current = p.ok ? p.fingerprint : null;
        }
        if (current && current === cached.meta.fingerprint) {
          pagesPath = cached.pagesPath; fingerprint = current; title = cached.meta.title; how = cached.meta.how || null; pageCount = cached.meta.pages; link = cached.meta.link || null; state = 'reused';
        }
      }
      if (!state) {
        const got = await fetchText(fetchFn, src, { libraryDir, archivePages });
        fingerprint = got.fingerprint || current || null;
        title = got.title || (src.probe && src.probe.title) || null;
        // How an archive.org book was split, and whether it got printed page numbers.
        how = got.method ? { method: got.method, labels: !!got.labels } : null;
        pageCount = got.pages.length;
        link = got.url || null;   // where results should point, if not the Baserow link
        pagesPath = writeCache(cacheDir, src.id, { fingerprint, title, how, link, extractedAt: new Date().toISOString(), ...versionsNow(), pages: got.pages.length }, got.pages);
        state = 'fresh';
      }
    } catch (err) {
      reason = inventory.causeText(err);
      if (cached && sameVersions(cached.meta)) {
        pagesPath = cached.pagesPath; fingerprint = cached.meta.fingerprint; title = cached.meta.title; how = cached.meta.how || null; pageCount = cached.meta.pages; link = cached.meta.link || null; state = 'stale';
      } else state = 'failed';
    }
    status[state].push({ id: src.id, url: src.links[0], reason, ...(how ? { how } : {}) });
    // One line per source: [done/total] what happened, name, time taken.
    done++;
    const name = title || (src.file ? src.file.replace(/_djvu\.txt$/, '') : src.links[0]);
    const pages = pageCount != null ? ` — ${pageCount} pages` : '';
    log(`  [${done}/${sources.length}] ${WORDS[state]}: ${name}${pages} (${((Date.now() - t0) / 1000).toFixed(1)} s)${reason ? ` — ${reason}` : ''}`);
    entries.push({
      id: src.id, url: link || src.links[0], links: src.links, type: src.type, title, fingerprint, usedBy: src.usedBy,
      reason: reason || undefined,
      loadPages: async () => (pagesPath ? JSON.parse(readFileSync(pagesPath, 'utf8')) : [])
    });
  });
  log(`Text done in ${Math.round((Date.now() - started) / 1000)} s: ${status.reused.length} unchanged, ${status.fresh.length} downloaded, ${status.stale.length} unreachable (old text kept), ${status.failed.length} unreachable (not indexed).`);

  const id = buildId || new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
  log(`Writing build ${id}…`);
  const { catalog, stats } = await writeBuild({ sources: entries, outDir: distDir, buildId: id, passes, log });

  // Our own books are published as they are, for the Reader (?file=…).
  if (existsSync(libraryDir)) {
    mkdirSync(join(distDir, 'books'), { recursive: true });
    for (const f of readdirSync(libraryDir)) if (/\.(md|markdown)$/i.test(f)) copyFileSync(join(libraryDir, f), join(distDir, 'books', f));
  }

  const report = { buildId: id, stats, status };
  const books = [...status.fresh, ...status.reused, ...status.stale].filter((s) => s.how);
  const methods = {};
  for (const b of books) { const k = `${b.how.method}${b.how.labels ? ', printed page numbers' : ', no page numbers'}`; methods[k] = (methods[k] || 0) + 1; }
  report.archiveSplit = methods;
  writeFileSync(join(rootDir, 'dist-report.json'), JSON.stringify(report, null, 2));
  if (books.length) log(`archive.org books: ${Object.entries(methods).map(([k, n]) => `${n} ${k}`).join('; ')}.`);
  log(`Done: ${stats.sources} sources, ${stats.pageCount} pages, ${stats.files} files, ${(stats.totalBytes / 1e6).toFixed(1)} MB (largest file ${(stats.largest.size / 1e6).toFixed(1)} MB).`);
  for (const f of status.failed) log(`  not indexed: ${f.url} — ${f.reason}`);
  for (const f of status.stale) log(`  old text kept: ${f.url} — ${f.reason}`);
  return { catalog, report };
}

module.exports = { run, EXTRACTOR_VERSION, cacheKey };

if (require.main === module) {
  const args = process.argv.slice(2);
  const refresh = [];
  for (let i = 0; i < args.length; i++) if (args[i] === '--refresh' && args[i + 1]) refresh.push(args[++i]);
  run({ key: process.env.BASEROW_KEY, table: process.env.BASEROW_TABLE_SCIENCES || inventory.DEFAULT_TABLE, refresh })
    .catch((err) => { console.error(`\nIndexer stopped: ${err.message}`); process.exitCode = 1; });
}

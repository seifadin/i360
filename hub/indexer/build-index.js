// i360 CSE — the indexer (sprints S3, S4).
//
//   npm run index                       full check, build indexer/dist/
//   npm run index -- --check links      only new or removed links (the daily run)
//   npm run index -- --refresh <url>    download that source again (or: --refresh all)
//   npm run index -- --previous dist    reuse text from indexer/dist/ instead of the lib site
//
// 1. Reads the links in BotKB and CustomSearchAIKBlessBotKB from Baserow
//    (same rules as the inventory; whole-website links are skipped).
// 2. The previous build is the cache: the live one on the lib site (or
//    indexer/dist/ with --previous dist). For each source it holds, made by
//    the same extractor and book format:
//    - "links" check: its text is reused as it is;
//    - "full" check: its current fingerprint is asked for (archive.org md5,
//      Wikipedia/Wikisource revision, HTTP ETag) and the text is reused only
//      if it is unchanged.
//    Anything else is downloaded and split into pages. A source that can't
//    be reached keeps its previous text (marked stale); with none it is
//    listed as unindexed and tried again next run — never treated as removed.
// 3. If nothing changed (same sources, groups, fingerprints and versions),
//    no build is written: there is nothing to publish.
// 4. Otherwise writes a complete build to indexer/dist/ (format in
//    src/cse-index.js), within Cloudflare's file limits, with the lib
//    site's _headers and robots.txt, ready for `wrangler deploy`.
//
// Text is gathered in indexer/work/ during a run and removed afterwards;
// indexer/dist/ and indexer/work/ are git-ignored.
// Needs BASEROW_KEY in .env, like the inventory.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, rmSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import * as inventory from './inventory.js';
import * as extract from './extract.js';
import { writeBuild } from './index-writer.js';
import * as BookFormat from '../src/book-format.js';
import * as SearchCore from '../src/search-core.js';
import * as CseIndex from '../src/cse-index.js';

// Bump when the way text is extracted changes: every cached text is redone.
const EXTRACTOR_VERSION = 1;
const CONCURRENCY = 3;
const LIB_HOST = 'lib.i36o.workers.dev';
const LIB_URL = `https://${LIB_HOST}/`;

const cacheKey = (id) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `${(h >>> 0).toString(36)}-${id.length}`;
};

// A source's pages, kept in the work folder for the rest of the run.
function writeWork(dir, id, pages) {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, `${cacheKey(id)}.json`);
  writeFileSync(p, JSON.stringify(pages));
  return p;
}

const versionsNow = () => ({ extractor: EXTRACTOR_VERSION, bookFormat: BookFormat.VERSION, searchCore: SearchCore.VERSION });

/* ---------------- The previous build ----------------
   Read from the lib site (fetchFn) or a local build folder. null when there
   is none yet (first run) or it can't be read — then everything is
   downloaded. Its text is reusable only if made by the same extractor and
   book format. */
async function readPrevious({ fetchFn, previous, log }) {
  const fromDir = previous && previous !== 'lib';
  const load = fromDir
    ? async (p) => JSON.parse(readFileSync(join(previous, p), 'utf8'))
    : async (p) => {
      const res = await inventory.fetchWithRetry(fetchFn, LIB_URL + p);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    };
  const where = fromDir ? previous : LIB_HOST;
  try {
    const { buildId } = await load('latest.json');
    const catalog = await load(`b/${buildId}/catalog.json`);
    const v = versionsNow();
    const usable = catalog.extractor === v.extractor && catalog.bookFormat === v.bookFormat;
    log(`Previous build ${buildId} (${where}): ${catalog.sources.length} sources${usable ? '' : ', made by another extractor or book format: its text is not reused'}.`);
    const byId = new Map(catalog.sources.map((s) => [s.id, s]));
    return {
      catalog, usable,
      get: (id) => (usable ? byId.get(id) || null : null),
      // All of a source's pages, chunk by chunk.
      async pages(s) {
        const parts = await Promise.all(s.chunks.map((_, c) => load(`b/${buildId}/text/${s.key}/${c}.json`)));
        const pages = parts.flatMap((d) => d.pages);
        if (pages.length !== s.pageCount) throw new Error(`previous build has ${pages.length} of ${s.pageCount} pages`);
        return pages;
      }
    };
  } catch (err) {
    log(`No previous build read from ${where} (${inventory.causeText(err)}): every source is downloaded.`);
    return null;
  }
}

/* What a build would contain, minus its id, time and file layout: when
   the planned build's matches the previous one, there's nothing to publish
   (and no build is written). */
function signature({ versions, sources, unindexed, books }) {
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return JSON.stringify({
    versions,
    books: books || [],
    sources: [...sources].sort(byId).map((s) => ({
      id: s.id, url: s.url, links: s.links, type: s.type, title: s.title || null, fingerprint: s.fingerprint || null,
      how: s.how || null, pageCount: s.pageCount, usedBy: s.usedBy
    })),
    unindexed: [...unindexed].sort(byId).map((u) => ({ id: u.id, url: u.url, reason: u.reason || 'no text' }))
  });
}
const versionsOf = (c) => ({ format: c.format, searchCore: c.searchCore, bookFormat: c.bookFormat, extractor: c.extractor });
const currentVersions = () => ({ format: CseIndex.FORMAT, searchCore: SearchCore.VERSION, bookFormat: BookFormat.VERSION, extractor: EXTRACTOR_VERSION });
const catalogSignature = (c) => signature({ versions: versionsOf(c), sources: c.sources, unindexed: c.unindexed || [], books: c.books });
const plannedSignature = (entries, books) => signature({
  versions: currentVersions(),
  sources: entries.filter((e) => e.pageCount > 0),
  unindexed: entries.filter((e) => !(e.pageCount > 0)),
  books
});

// Our own books (library/books/), published as they are: [{ name, hash }].
function libraryBooks(libraryDir) {
  if (!existsSync(libraryDir)) return [];
  return readdirSync(libraryDir).filter((f) => /\.(md|markdown)$/i.test(f)).sort()
    .map((name) => { const raw = readFileSync(join(libraryDir, name), 'utf8'); return { name, hash: `${raw.length}:${hash(raw)}` }; });
}

// The lib site's own files, published with every build.
const LIB_HEADERS = `# Published with every build by indexer/build-index.js.
/*
  Access-Control-Allow-Origin: *
  X-Content-Type-Options: nosniff
/latest.json
  Cache-Control: no-cache
/b/*
  Cache-Control: public, max-age=31536000, immutable
/books/*
  Cache-Control: no-cache
`;
const LIB_ROBOTS = 'User-agent: *\nDisallow: /\n';

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
  fetchFn = fetch, key, table = inventory.DEFAULT_TABLE, rootDir = import.meta.dirname,
  refresh = [], archivePages = extract.archivePages, passes = 8, log = console.log, buildId,
  check = 'full', previous = 'lib'
}) {
  if (!key) throw new Error('BASEROW_KEY is not set. Add it to .env (the read-only Baserow token) and run: npm run index');
  if (check !== 'full' && check !== 'links') throw new Error(`--check must be "full" or "links", not "${check}"`);
  const workDir = join(rootDir, 'work');
  const distDir = join(rootDir, 'dist');
  const libraryDir = join(rootDir, '..', 'library', 'books');
  rmSync(workDir, { recursive: true, force: true });
  inventory.clearProbeCache();
  try {
    return await runIn({ fetchFn, key, table, refresh, archivePages, passes, log, buildId, check, workDir, distDir, libraryDir, rootDir,
      previous: previous === 'dist' ? distDir : previous });
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function runIn({ fetchFn, key, table, refresh, archivePages, passes, log, buildId, check, workDir, distDir, libraryDir, rootDir, previous }) {
  const prev = await readPrevious({ fetchFn, previous, log });

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
    const local = !!localBookPath(libraryDir, src);
    const before = !local && prev ? prev.get(src.id) : null;   // this source in the previous build
    let pagesPath = null, fingerprint = null, title = null, state = null, reason = null, how = null, pageCount = null, link = null;
    // Takes the source's text from the previous build.
    const reuse = async (as) => {
      const pages = await prev.pages(before);
      pagesPath = writeWork(workDir, src.id, pages);
      fingerprint = before.fingerprint; title = before.title; how = before.how || null; pageCount = before.pageCount;
      link = before.url && before.url !== src.links[0] ? before.url : null;
      state = as;
    };
    try {
      let current = null;
      if (before && !wantRefresh(src)) {
        if (check === 'links') {
          await reuse('reused').catch(() => null);
        } else {
          // Has the source changed? archive.org: the md5 from the item's
          // metadata is enough; the storage server isn't contacted (a slow
          // one made unchanged books download again).
          if (src.kind === 'archive-file') {
            current = await extract.archiveFingerprint((url, o) => inventory.fetchWithRetry(fetchFn, url, o), src).catch(() => null);
          } else {
            const p = await inventory.probe(fetchFn, src);
            current = p.ok ? p.fingerprint : null;
          }
          if (current && current === before.fingerprint) await reuse('reused').catch(() => null);
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
        pagesPath = writeWork(workDir, src.id, got.pages);
        state = 'fresh';
      }
    } catch (err) {
      reason = inventory.causeText(err);
      if (before) await reuse('stale').catch(() => { state = 'failed'; });
      else state = 'failed';
    }
    status[state].push({ id: src.id, url: src.links[0], reason, ...(how ? { how } : {}) });
    // One line per source: [done/total] what happened, name, time taken.
    done++;
    const name = title || (src.file ? src.file.replace(/_djvu\.txt$/, '') : src.links[0]);
    const pages = pageCount != null ? ` — ${pageCount} pages` : '';
    log(`  [${done}/${sources.length}] ${WORDS[state]}: ${name}${pages} (${((Date.now() - t0) / 1000).toFixed(1)} s)${reason ? ` — ${reason}` : ''}`);
    entries.push({
      id: src.id, url: link || src.links[0], links: src.links, type: src.type, title, fingerprint, how, usedBy: src.usedBy, pageCount,
      reason: reason || undefined,
      loadPages: async () => (pagesPath ? JSON.parse(readFileSync(pagesPath, 'utf8')) : [])
    });
  });
  log(`Text done in ${Math.round((Date.now() - started) / 1000)} s: ${status.reused.length} unchanged, ${status.fresh.length} downloaded, ${status.stale.length} unreachable (old text kept), ${status.failed.length} unreachable (not indexed).`);

  // For the GitHub workflow: publish only when something changed.
  const output = (changed) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`); };
  const ownBooks = libraryBooks(libraryDir);
  if (prev && prev.usable && catalogSignature(prev.catalog) === plannedSignature(entries, ownBooks)) {
    log(`Nothing changed since build ${prev.catalog.buildId}: no build written, nothing to publish.`);
    output(false);
    return { catalog: prev.catalog, report: { buildId: prev.catalog.buildId, status, changed: false }, changed: false };
  }

  const id = buildId || new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
  log(`Writing build ${id}…`);
  // Text from a local previous build is in the work folder by now, so the
  // dist folder can be replaced.
  const { catalog, stats } = await writeBuild({ sources: entries, outDir: distDir, buildId: id, passes, log, extractor: EXTRACTOR_VERSION, books: ownBooks });
  writeFileSync(join(distDir, '_headers'), LIB_HEADERS);
  writeFileSync(join(distDir, 'robots.txt'), LIB_ROBOTS);

  // Our own books are published as they are, for the Reader (?file=…).
  if (ownBooks.length) {
    mkdirSync(join(distDir, 'books'), { recursive: true });
    for (const b of ownBooks) copyFileSync(join(libraryDir, b.name), join(distDir, 'books', b.name));
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
  log('Ready to publish.');
  output(true);
  report.changed = true;
  return { catalog, report, changed: true };
}

export { run, cacheKey };

if (process.argv[1] === import.meta.filename) {
  const args = process.argv.slice(2);
  const refresh = [];
  let check = 'full', previous = 'lib';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--refresh' && args[i + 1]) refresh.push(args[++i]);
    else if (args[i] === '--check' && args[i + 1]) check = args[++i];
    else if (args[i] === '--previous' && args[i + 1]) previous = args[++i];
  }
  run({ key: process.env.BASEROW_KEY, table: process.env.BASEROW_TABLE_SCIENCES || inventory.DEFAULT_TABLE, refresh, check, previous })
    .catch((err) => { console.error(`\nIndexer stopped: ${err.message}`); process.exitCode = 1; });
}

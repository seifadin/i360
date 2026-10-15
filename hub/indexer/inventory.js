// i360 CSE — source inventory (sprint S2).
//
//   npm run inventory
//
// Reads every row of i360dbs (sciences) from Baserow, collects the links in
// BotKB and CustomSearchAIKBlessBotKB (one link per line), and checks what
// each link really is: type, size, change fingerprint, whether other sites
// may read it (CORS), and — for archive.org — which page-index helper files
// the item has. Nothing is downloaded beyond headers and metadata.
//
// Writes indexer/out/inventory.json (every source, for the indexer) and
// indexer/out/inventory.md (the summary to read). indexer/out/ is git-ignored.
//
// Needs BASEROW_KEY in .env (the read-only Baserow token, same value as the
// app's VITE_BASEROW_KEY). Optional: BASEROW_TABLE_SCIENCES (default 193269).
'use strict';
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const BASEROW_ROWS = 'https://api.baserow.io/api/database/rows/table/';
const DEFAULT_TABLE = '193269';
const LINK_FIELDS = ['BotKB', 'CustomSearchAIKBlessBotKB'];
const GROUP_FIELDS = ['ScienceMajorId', 'ScienceMajor_Ar', 'ScienceIntermediateId', 'ScienceIntermediate_Ar', 'ScienceMinorId', 'ScienceMinor_Ar'];
const USER_AGENT = 'i360-cse-inventory/1.0 (+https://i360-e.web.app/)';
const CONCURRENCY = 4;
const TIMEOUT_MS = 30000;
const RETRIES = 2;
// archive.org page helpers, by suffix after the scan's base name.
const ARCHIVE_HELPERS = ['_page_numbers.json', '_hocr_pageindex.json.gz', '_djvu.xml', '_hocr.html', '_chocr.html.gz', '_hocr_searchtext.txt.gz'];

/* ---------------- Reading Baserow ---------------- */

// Baserow fields can come back as plain values, objects ({ value }) or lists
// of them (lookups, selects). Everything is read as text.
function fieldText(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(fieldText).filter(Boolean).join('\n');
  if (typeof v === 'object') return fieldText(v.value != null ? v.value : v.name);
  return String(v);
}

async function readRows(fetchFn, key, table) {
  const rows = [];
  let url = `${BASEROW_ROWS}${table}/?user_field_names=true&size=200`;
  // Database tokens use "Token"; "Bearer" is tried once in case this key is a different kind.
  let scheme = 'Token';
  while (url) {
    let res = await fetchFn(url, { headers: { Authorization: `${scheme} ${key}` } });
    if (res.status === 401 && scheme === 'Token' && rows.length === 0) {
      scheme = 'Bearer';
      res = await fetchFn(url, { headers: { Authorization: `${scheme} ${key}` } });
    }
    if (!res.ok) throw new Error(`Baserow answered HTTP ${res.status} for table ${table}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    rows.push(...data.results);
    url = data.next;
  }
  if (rows.length > 0) {
    const missing = [...LINK_FIELDS, ...GROUP_FIELDS].filter((f) => !(f in rows[0]));
    if (missing.length > 0) {
      throw new Error(`Field(s) not found in table ${table}: ${missing.join(', ')}.\nFields present: ${Object.keys(rows[0]).sort().join(', ')}`);
    }
  }
  return { rows, scheme };
}

/* ---------------- Cells and URLs ---------------- */

// One link per line; empty lines and repeats in the same cell are dropped.
function parseCell(text) {
  const links = [];
  const notUrls = [];
  const seen = new Set();
  for (const raw of fieldText(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    let u = null;
    try { u = new URL(line); } catch { /* not a URL */ }
    if (u && (u.protocol === 'https:' || u.protocol === 'http:')) links.push(line);
    else notUrls.push(line);
  }
  return { links, notUrls };
}

function typeFromName(name) {
  const n = name.toLowerCase();
  if (n.endsWith('_djvu.txt')) return 'djvu-txt';
  if (n.endsWith('_ocr.md')) return 'md-ocr';
  if (n.endsWith('.md') || n.endsWith('.markdown')) return 'md';
  if (n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.txt')) return 'txt';
  if (n.endsWith('.html') || n.endsWith('.htm')) return 'html';
  return null;
}

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

// The address a source is fetched from, its kind, and its identity (two
// links to the same thing share one source).
function normalizeUrl(link) {
  const u = new URL(link);
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);

  if (host === 'archive.org' || host === 'www.archive.org') {
    const [mode, item, ...rest] = parts;
    const file = rest.join('/');
    if ((mode === 'stream' || mode === 'download') && item && file) {
      // /stream/ shows the text inside a web page; /download/ is the raw file.
      const fetchUrl = `https://archive.org/download/${item}/${rest.map((p) => encodeURIComponent(safeDecode(p))).join('/')}`;
      return { host: 'archive.org', kind: 'archive-file', item, file: safeDecode(file), type: typeFromName(safeDecode(file)) || 'unknown', fetchUrl, id: `archive:${item}/${safeDecode(file)}` };
    }
    if ((mode === 'details' || mode === 'stream' || mode === 'download') && item) {
      return { host: 'archive.org', kind: 'archive-item', item, file: null, type: 'archive-item', fetchUrl: `https://archive.org/details/${item}`, id: `archive:${item}` };
    }
    return { host: 'archive.org', kind: 'other', type: 'unknown', fetchUrl: link, id: `url:${link}` };
  }

  if (host === 'wikipedia.org' || host.endsWith('.wikipedia.org')) {
    const labels = host.split('.');
    const lang = labels.length >= 3 && labels[0] !== 'www' ? labels[0] : null;   // ar.wikipedia.org, ar.m.wikipedia.org
    let title = null;
    if (parts[0] === 'wiki' && parts.length > 1) title = safeDecode(parts.slice(1).join('/'));
    else if (u.searchParams.get('title')) title = u.searchParams.get('title');
    if (title) title = title.replace(/_/g, ' ');
    return {
      host: 'wikipedia.org', kind: 'wikipedia', lang, title, type: 'wikipedia',
      fetchUrl: link, id: lang && title ? `wikipedia:${lang}:${title}` : `url:${link}`
    };
  }

  return { host, kind: 'other', type: typeFromName(safeDecode(u.pathname)) || 'unknown', fetchUrl: link, id: `url:${link}` };
}

/* ---------------- Probing ---------------- */

async function fetchWithRetry(fetchFn, url, opts = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetchFn(url, { redirect: 'follow', ...opts, signal: ctrl.signal, headers: { 'User-Agent': USER_AGENT, ...(opts.headers || {}) } });
      clearTimeout(timer);
      if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < RETRIES) await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw lastErr;
}

const errText = (err) => (err && err.name === 'AbortError' ? `no answer within ${TIMEOUT_MS / 1000} s` : String(err && err.message ? err.message : err));

// Headers only. Some servers refuse HEAD: fall back to fetching one byte.
async function probeHeaders(fetchFn, url) {
  const origin = { Origin: 'https://i360-cse.web.app' };
  let res = await fetchWithRetry(fetchFn, url, { method: 'HEAD', headers: origin });
  if (res.status === 405 || res.status === 501) {
    res = await fetchWithRetry(fetchFn, url, { method: 'GET', headers: { ...origin, Range: 'bytes=0-0' } });
  }
  const h = res.headers;
  let size = Number(h.get('content-length')) || null;
  const range = h.get('content-range');
  if (range && /\/(\d+)$/.test(range)) size = Number(/\/(\d+)$/.exec(range)[1]);
  return {
    status: res.status,
    ok: res.ok,
    finalUrl: res.url || url,
    contentType: (h.get('content-type') || '').split(';')[0].trim() || null,
    size: res.status === 206 || res.ok ? size : null,
    etag: h.get('etag'),
    lastModified: h.get('last-modified'),
    cors: h.get('access-control-allow-origin')
  };
}

function typeFromContentType(ct) {
  if (!ct) return null;
  if (ct === 'application/pdf') return 'pdf';
  if (ct === 'text/html' || ct === 'application/xhtml+xml') return 'html';
  if (ct === 'text/markdown') return 'md';
  if (ct === 'text/plain') return 'txt';
  return null;
}

const archiveMeta = new Map();   // item → Promise<metadata json>

function getArchiveMeta(fetchFn, item) {
  if (!archiveMeta.has(item)) {
    archiveMeta.set(item, (async () => {
      const res = await fetchWithRetry(fetchFn, `https://archive.org/metadata/${encodeURIComponent(item)}`);
      if (!res.ok) throw new Error(`archive.org metadata HTTP ${res.status}`);
      return res.json();
    })());
  }
  return archiveMeta.get(item);
}

async function probeArchive(fetchFn, src) {
  const meta = await getArchiveMeta(fetchFn, src.item);
  if (!meta || !meta.metadata) return { ok: false, error: 'archive.org item not found (empty metadata)' };
  const files = Array.isArray(meta.files) ? meta.files : [];
  const out = {
    title: fieldText(meta.metadata.title) || null,
    language: fieldText(meta.metadata.language) || null,
    itemFiles: files.length
  };
  if (src.kind === 'archive-item') {
    // A whole item: list what text it offers, for the indexer to choose from.
    out.ok = true;
    out.textFiles = files.filter((f) => /_djvu\.txt$|\.pdf$|_ocr\.md$|\.md$|\.txt$/i.test(f.name)).map((f) => ({ name: f.name, size: Number(f.size) || null }));
    return out;
  }
  const f = files.find((x) => x.name === src.file);
  if (!f) return { ...out, ok: false, error: `file not in the item: ${src.file}` };
  out.size = Number(f.size) || null;
  out.fingerprint = f.md5 ? `md5:${f.md5}` : (f.mtime ? `mtime:${f.mtime}` : null);
  out.mtime = f.mtime || null;
  const base = src.file.replace(/(_djvu\.txt|\.pdf|_ocr\.md|\.md|\.txt)$/i, '');
  out.helpers = ARCHIVE_HELPERS.filter((suffix) => files.some((x) => x.name === base + suffix));
  const h = await probeHeaders(fetchFn, src.fetchUrl);
  out.status = h.status;
  out.cors = h.cors;
  out.ok = h.ok;
  if (!h.ok) out.error = `download HTTP ${h.status}`;
  return out;
}

async function probeWikipedia(fetchFn, src) {
  if (!src.lang || !src.title) return { ok: false, error: 'no language subdomain or no page title in the link' };
  const api = `https://${src.lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=info&redirects=1&titles=${encodeURIComponent(src.title)}`;
  const res = await fetchWithRetry(fetchFn, api);
  if (!res.ok) return { ok: false, error: `Wikipedia API HTTP ${res.status}` };
  const data = await res.json();
  const page = data.query && data.query.pages && data.query.pages[0];
  if (!page || page.missing || page.invalid) return { ok: false, error: 'page not found on Wikipedia' };
  return {
    ok: true,
    title: page.title,
    redirectedFrom: data.query.redirects && data.query.redirects[0] ? data.query.redirects[0].from : null,
    size: page.length || null,         // wikitext length, a size indication
    fingerprint: page.lastrevid ? `rev:${page.lastrevid}` : null,
    cors: 'API (origin=*)'
  };
}

async function probeOther(fetchFn, src) {
  const h = await probeHeaders(fetchFn, src.fetchUrl);
  const out = {
    ok: h.ok, status: h.status, contentType: h.contentType, size: h.size, cors: h.cors,
    fingerprint: h.etag ? `etag:${h.etag}` : (h.lastModified ? `modified:${h.lastModified}` : null)
  };
  if (h.finalUrl && h.finalUrl !== src.fetchUrl) out.finalUrl = h.finalUrl;
  if (!h.ok) out.error = `HTTP ${h.status}`;
  const t = typeFromContentType(h.contentType);
  if (t && (src.type === 'unknown' || src.type === 'txt')) out.typeFromServer = t;
  return out;
}

async function probe(fetchFn, src) {
  try {
    if (src.kind === 'archive-file' || src.kind === 'archive-item') return await probeArchive(fetchFn, src);
    if (src.kind === 'wikipedia') return await probeWikipedia(fetchFn, src);
    return await probeOther(fetchFn, src);
  } catch (err) {
    return { ok: false, error: errText(err) };
  }
}

async function mapLimit(items, limit, fn, onDone) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
      onDone(++done, items.length);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/* ---------------- Building the inventory ---------------- */

function collectSources(rows) {
  const sources = new Map();       // id → source
  const notUrls = [];
  let rowsWithLinks = 0;
  let linkCount = 0;
  for (const row of rows) {
    const where = {
      rowId: row.id,
      minorId: fieldText(row.ScienceMinorId), minor: fieldText(row.ScienceMinor_Ar),
      majorId: fieldText(row.ScienceMajorId), major: fieldText(row.ScienceMajor_Ar),
      intermediateId: fieldText(row.ScienceIntermediateId), intermediate: fieldText(row.ScienceIntermediate_Ar)
    };
    let any = false;
    for (const field of LINK_FIELDS) {
      const { links, notUrls: bad } = parseCell(row[field]);
      for (const line of bad) notUrls.push({ ...where, field, line });
      for (const link of links) {
        any = true;
        linkCount++;
        const n = normalizeUrl(link);
        if (!sources.has(n.id)) sources.set(n.id, { ...n, links: [], usedBy: [] });
        const s = sources.get(n.id);
        if (!s.links.includes(link)) s.links.push(link);
        s.usedBy.push({ ...where, field });
      }
    }
    if (any) rowsWithLinks++;
  }
  return { sources: [...sources.values()], notUrls, rowsWithLinks, linkCount };
}

function fmtSize(n) {
  if (n == null) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
}

const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function summary(inv) {
  const L = [];
  const srcs = inv.sources;
  const ok = srcs.filter((s) => s.probe.ok);
  const finalType = (s) => s.probe.typeFromServer || s.type;
  L.push('# i360 CSE — source inventory', '');
  L.push(`Generated ${inv.generatedAt} from Baserow table ${inv.table} (auth scheme: ${inv.authScheme}).`, '');
  L.push('## Totals', '');
  L.push('| | |', '|---|---|');
  L.push(`| Rows in i360dbs | ${inv.rowCount} |`);
  L.push(`| Rows with at least one link | ${inv.rowsWithLinks} |`);
  L.push(`| Links (all cells, all lines) | ${inv.linkCount} |`);
  L.push(`| Distinct sources | ${srcs.length} |`);
  L.push(`| Reachable | ${ok.length} |`);
  L.push(`| Failing | ${srcs.length - ok.length} |`);
  L.push(`| Known total size (reachable) | ${fmtSize(ok.reduce((a, s) => a + (s.probe.size || 0), 0))} |`);
  L.push(`| Lines that aren't links | ${inv.notUrls.length} |`, '');

  L.push('## By type', '');
  L.push('| Type | Sources | Reachable | Known size | Largest |', '|---|---|---|---|---|');
  const types = [...new Set(srcs.map(finalType))].sort();
  for (const t of types) {
    const all = srcs.filter((s) => finalType(s) === t);
    const good = all.filter((s) => s.probe.ok);
    const sizes = good.map((s) => s.probe.size || 0);
    L.push(`| ${t} | ${all.length} | ${good.length} | ${fmtSize(sizes.length ? sizes.reduce((a, b) => a + b, 0) : null)} | ${fmtSize(sizes.length ? Math.max(...sizes) : null)} |`);
  }
  L.push('', '_Wikipedia sizes are wikitext length, not download size._', '');

  L.push('## By host', '');
  L.push('| Host | Sources | Reachable | Cross-site reads allowed (CORS) |', '|---|---|---|---|');
  const hosts = [...new Set(srcs.map((s) => s.host))].sort();
  for (const h of hosts) {
    const all = srcs.filter((s) => s.host === h);
    const good = all.filter((s) => s.probe.ok);
    const cors = [...new Set(good.map((s) => s.probe.cors || 'no'))].join(', ');
    L.push(`| ${h} | ${all.length} | ${good.length} | ${cell(cors || '—')} |`);
  }
  L.push('');

  const arch = srcs.filter((s) => s.kind === 'archive-file' && s.probe.ok);
  if (arch.length) {
    L.push('## archive.org page helpers', '');
    L.push(`For ${arch.length} reachable archive.org files: how many items also hold each helper (needed to split djvu text into real pages).`, '');
    L.push('| Helper | Present |', '|---|---|');
    for (const hname of ARCHIVE_HELPERS) {
      L.push(`| \`${hname}\` | ${arch.filter((s) => (s.probe.helpers || []).includes(hname)).length} / ${arch.length} |`);
    }
    L.push('');
  }

  const fails = srcs.filter((s) => !s.probe.ok);
  L.push(`## Failing sources (${fails.length})`, '');
  if (fails.length) {
    L.push('| Link | Reason | Used by (row: minor) |', '|---|---|---|');
    for (const s of fails) L.push(`| ${cell(s.links[0])} | ${cell(s.probe.error || `HTTP ${s.probe.status}`)} | ${cell(s.usedBy.map((u) => `${u.rowId}: ${u.minor}`).join('; '))} |`);
  } else L.push('None.');
  L.push('');

  const noFp = ok.filter((s) => !s.probe.fingerprint && s.kind !== 'archive-item');
  L.push(`## Reachable but no change fingerprint (${noFp.length})`, '');
  L.push('The weekly freshness check can only spot changes in these by downloading them again.', '');
  for (const s of noFp) L.push(`- ${s.links[0]}`);
  L.push('');

  const items = srcs.filter((s) => s.kind === 'archive-item');
  if (items.length) {
    L.push(`## Whole archive.org items, no file named (${items.length})`, '');
    L.push('The indexer has to pick a text file from the item; these are the candidates.', '');
    for (const s of items) L.push(`- ${s.links[0]} — ${s.probe.ok ? (s.probe.textFiles || []).map((f) => `${f.name} (${fmtSize(f.size)})`).join(', ') || 'no text files' : s.probe.error}`);
    L.push('');
  }

  const shared = srcs.filter((s) => s.usedBy.length > 1);
  L.push(`## Sources listed more than once (${shared.length})`, '');
  for (const s of shared) L.push(`- ${s.links[0]} — ${s.usedBy.map((u) => `${u.rowId}: ${u.minor} (${u.field})`).join('; ')}`);
  L.push('');

  L.push(`## Lines that aren't links (${inv.notUrls.length})`, '');
  for (const n of inv.notUrls) L.push(`- row ${n.rowId} (${n.minor}), ${n.field}: \`${cell(n.line)}\``);
  L.push('');
  return L.join('\n');
}

async function run({ fetchFn = fetch, key, table = DEFAULT_TABLE, outDir, log = console.log }) {
  if (!key) throw new Error('BASEROW_KEY is not set. Add it to .env (the read-only Baserow token) and run: npm run inventory');
  log(`Reading Baserow table ${table}…`);
  const { rows, scheme } = await readRows(fetchFn, key, table);
  const { sources, notUrls, rowsWithLinks, linkCount } = collectSources(rows);
  log(`${rows.length} rows, ${linkCount} links, ${sources.length} distinct sources. Checking them…`);
  let lastPct = -1;
  const probes = await mapLimit(sources, CONCURRENCY, (s) => probe(fetchFn, s), (done, total) => {
    const pct = Math.floor((done / total) * 10) * 10;
    if (pct !== lastPct) { lastPct = pct; log(`  ${done}/${total}`); }
  });
  sources.forEach((s, i) => { s.probe = probes[i]; });
  const inv = { generatedAt: new Date().toISOString(), table, authScheme: scheme, rowCount: rows.length, rowsWithLinks, linkCount, notUrls, sources };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'inventory.json'), JSON.stringify(inv, null, 2));
  writeFileSync(join(outDir, 'inventory.md'), summary(inv));
  log(`Done: ${join(outDir, 'inventory.md')}`);
  return inv;
}

module.exports = { run, parseCell, normalizeUrl, fieldText, summary, ARCHIVE_HELPERS };

if (require.main === module) {
  run({
    key: process.env.BASEROW_KEY,
    table: process.env.BASEROW_TABLE_SCIENCES || DEFAULT_TABLE,
    outDir: join(__dirname, 'out')
  }).catch((err) => {
    console.error(`\nInventory stopped: ${err.message}`);
    process.exitCode = 1;
  });
}

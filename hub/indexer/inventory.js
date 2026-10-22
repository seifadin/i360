// i360 CSE — source inventory (sprint S2).
//
//   npm run inventory            check new links and the ones that failed last time
//   npm run inventory -- --all   check every link again
//
// Reads every row of i360dbs (sciences) from Baserow, collects the links in
// BotKB and CustomSearchAIKBlessBotKB (one link per line), and checks what
// each link really is: type, size, change fingerprint, whether other sites
// may read it (CORS), and — for archive.org — which page-index helper files
// the item has. Nothing is downloaded beyond headers and metadata.
//
// Baserow is always read fresh (so added or removed links are seen). A link
// that was checked successfully in the previous run keeps that result; new
// links and links that failed are checked again. --all rechecks everything.
// Links to a whole website (no path) are listed but not checked or indexed.
//
// Writes indexer/out/inventory.json (every source, for the indexer) and
// indexer/out/inventory.md (the summary to read). indexer/out/ is git-ignored.
//
// Needs BASEROW_KEY in .env (the read-only Baserow token, same value as the
// app's VITE_BASEROW_KEY). Optional: BASEROW_TABLE_SCIENCES (default 193269).
'use strict';
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const BASEROW_ROWS = 'https://api.baserow.io/api/database/rows/table/';
const DEFAULT_TABLE = '193269';
const LINK_FIELDS = ['BotKB', 'CustomSearchAIKBlessBotKB'];
const GROUP_FIELDS = ['ScienceMajorId', 'ScienceMajor_Ar', 'ScienceIntermediateId', 'ScienceIntermediate_Ar', 'ScienceMinorId', 'ScienceMinor_Ar'];
const USER_AGENT = 'i360-cse-inventory/1.0 (+https://i360-e.web.app/)';
const CONCURRENCY = 4;
const TIMEOUT_MS = 30000;
const RETRIES = 2;
const MAX_REDIRECTS = 5;
// Wikimedia projects that share the MediaWiki API (…/w/api.php).
const WIKIMEDIA = ['wikipedia', 'wikisource', 'wikiquote', 'wikibooks', 'wiktionary', 'wikinews', 'wikiversity', 'wikivoyage'];
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

  // ar.wikipedia.org, ar.m.wikisource.org, wikipedia.org …
  const wm = /^(?:([a-z][a-z-]*)\.)?(?:m\.)?([a-z]+)\.org$/.exec(host);
  if (wm && WIKIMEDIA.includes(wm[2])) {
    const project = wm[2];
    const lang = wm[1] && wm[1] !== 'www' && wm[1] !== 'm' ? wm[1] : null;
    let title = null;
    if (parts[0] === 'wiki' && parts.length > 1) title = safeDecode(parts.slice(1).join('/'));
    else if (u.searchParams.get('title')) title = u.searchParams.get('title');
    if (title) title = title.replace(/_/g, ' ');
    return {
      host: `${project}.org`, kind: 'wikimedia', project, lang, title, type: project,
      fetchUrl: link, id: lang && title ? `wikimedia:${project}:${lang}:${title}` : `url:${link}`
    };
  }

  // A whole website (home page only): listed, not checked or indexed.
  if (parts.length === 0 && !u.search) {
    return { host, kind: 'website', type: 'website', fetchUrl: link, id: `url:${link}` };
  }

  return { host, kind: 'other', type: typeFromName(safeDecode(u.pathname)) || 'unknown', fetchUrl: link, id: `url:${link}` };
}

/* ---------------- Probing ---------------- */

// A failure that says which step failed, where, and why.
class ProbeError extends Error {
  constructor(step, where, cause) {
    super(`${step}${where ? ` (${where})` : ''}: ${cause}`);
    this.step = step;
    this.where = where;
    this.why = cause;
  }
}

// The real reason behind Node's generic "fetch failed".
function causeText(err) {
  if (!err) return 'unknown error';
  if (err.name === 'AbortError') return `no answer within ${TIMEOUT_MS / 1000} s`;
  const c = err.cause;
  if (c) {
    const code = c.code || (c.cause && c.cause.code);
    const msg = c.message || String(c);
    return code && !msg.includes(code) ? `${code} ${msg}` : msg;
  }
  return String(err.message || err);
}

const hostOf = (url) => { try { return new URL(url).host; } catch { return url; } };

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

// Follows redirects one hop at a time, so a failure names the server that
// failed (archive.org sends downloads on to a storage server).
async function fetchFollow(fetchFn, step, url, opts) {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res;
    try {
      res = await fetchWithRetry(fetchFn, current, { ...opts, redirect: 'manual' });
    } catch (err) {
      throw new ProbeError(step, hostOf(current), causeText(err));
    }
    const loc = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!loc) return { res, finalUrl: current };
    current = new URL(loc, current).href;
  }
  throw new ProbeError(step, hostOf(current), `more than ${MAX_REDIRECTS} redirects`);
}

// Headers only. Some servers refuse HEAD: fall back to fetching one byte.
async function probeHeaders(fetchFn, step, url) {
  // As a page on the app's site would ask (i360-hub.md §10). Informational: since merge
  // sprint 5 the Reader and the CSE read only the lib site, never a source directly.
  const origin = { Origin: 'https://i360-e.web.app' };
  let { res, finalUrl } = await fetchFollow(fetchFn, step, url, { method: 'HEAD', headers: origin });
  if (res.status === 405 || res.status === 501) {
    ({ res, finalUrl } = await fetchFollow(fetchFn, step, url, { method: 'GET', headers: { ...origin, Range: 'bytes=0-0' } }));
  }
  const h = res.headers;
  let size = Number(h.get('content-length')) || null;
  const range = h.get('content-range');
  if (range && /\/(\d+)$/.test(range)) size = Number(/\/(\d+)$/.exec(range)[1]);
  return {
    status: res.status,
    ok: res.ok,
    finalUrl,
    contentType: (h.get('content-type') || '').split(';')[0].trim() || null,
    size: res.ok ? size : null,
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

async function getJson(fetchFn, step, url) {
  const { res, finalUrl } = await fetchFollow(fetchFn, step, url, {});
  if (!res.ok) throw new ProbeError(step, hostOf(finalUrl), `HTTP ${res.status}`);
  try { return await res.json(); } catch (err) { throw new ProbeError(step, hostOf(finalUrl), `bad JSON: ${causeText(err)}`); }
}

const archiveMeta = new Map();   // item → Promise<metadata json>, shared by the item's files

function getArchiveMeta(fetchFn, item) {
  if (!archiveMeta.has(item)) archiveMeta.set(item, getJson(fetchFn, 'metadata', `https://archive.org/metadata/${encodeURIComponent(item)}`));
  return archiveMeta.get(item);
}

async function probeArchive(fetchFn, src) {
  const meta = await getArchiveMeta(fetchFn, src.item);
  if (!meta || !meta.metadata) throw new ProbeError('metadata', 'archive.org', 'item not found (empty metadata)');
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
  if (!f) throw new ProbeError('metadata', 'archive.org', `file not in the item: ${src.file}`);
  out.size = Number(f.size) || null;
  out.fingerprint = f.md5 ? `md5:${f.md5}` : (f.mtime ? `mtime:${f.mtime}` : null);
  out.mtime = f.mtime || null;
  const base = src.file.replace(/(_djvu\.txt|\.pdf|_ocr\.md|\.md|\.txt)$/i, '');
  out.helpers = ARCHIVE_HELPERS.filter((suffix) => files.some((x) => x.name === base + suffix));
  let h;
  try {
    h = await probeHeaders(fetchFn, 'download', src.fetchUrl);
  } catch (err) {
    err.partial = out;   // keep what the metadata already told us
    throw err;
  }
  out.status = h.status;
  out.cors = h.cors;
  out.server = hostOf(h.finalUrl);
  if (!h.ok) throw Object.assign(new ProbeError('download', out.server, `HTTP ${h.status}`), { partial: out });
  out.ok = true;
  return out;
}

const PROJECT_NAMES = { wikipedia: 'Wikipedia', wikisource: 'Wikisource' };

async function probeWikimedia(fetchFn, src) {
  const name = PROJECT_NAMES[src.project] || src.project;
  if (!src.lang || !src.title) throw new ProbeError('link', null, 'no language subdomain or no page title in the link');
  const api = `https://${src.lang}.${src.project}.org/w/api.php?action=query&format=json&formatversion=2&prop=info&redirects=1&titles=${encodeURIComponent(src.title)}`;
  const data = await getJson(fetchFn, 'api', api);
  const page = data.query && data.query.pages && data.query.pages[0];
  if (!page || page.missing || page.invalid) throw new ProbeError('api', `${src.lang}.${src.project}.org`, `page not found on ${name}`);
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
  const h = await probeHeaders(fetchFn, 'headers', src.fetchUrl);
  const out = {
    status: h.status, contentType: h.contentType, size: h.size, cors: h.cors,
    fingerprint: h.etag ? `etag:${h.etag}` : (h.lastModified ? `modified:${h.lastModified}` : null)
  };
  if (h.finalUrl !== src.fetchUrl) out.finalUrl = h.finalUrl;
  const t = typeFromContentType(h.contentType);
  if (t && (src.type === 'unknown' || src.type === 'txt')) out.typeFromServer = t;
  if (!h.ok) throw Object.assign(new ProbeError('headers', hostOf(h.finalUrl), `HTTP ${h.status}`), { partial: out });
  out.ok = true;
  return out;
}

async function probe(fetchFn, src) {
  const checkedAt = new Date().toISOString();
  try {
    let out;
    if (src.kind === 'archive-file' || src.kind === 'archive-item') out = await probeArchive(fetchFn, src);
    else if (src.kind === 'wikimedia') out = await probeWikimedia(fetchFn, src);
    else out = await probeOther(fetchFn, src);
    return { ...out, checkedAt };
  } catch (err) {
    const e = err instanceof ProbeError ? err : new ProbeError('check', null, causeText(err));
    return { ...(err.partial || {}), ok: false, error: e.message, step: e.step, where: e.where, why: e.why, checkedAt };
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

// Total of the sizes that are known, saying how many aren't.
function sizeCell(list) {
  const known = list.filter((s) => s.probe.size != null);
  if (known.length === 0) return list.length ? 'unknown' : '—';
  const total = fmtSize(known.reduce((a, s) => a + s.probe.size, 0));
  const missing = list.length - known.length;
  return missing ? `${total} (+${missing} unknown)` : total;
}

function largestCell(list) {
  const sizes = list.map((s) => s.probe.size).filter((n) => n != null);
  return sizes.length ? fmtSize(Math.max(...sizes)) : (list.length ? 'unknown' : '—');
}

const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

function summary(inv) {
  const L = [];
  const websites = inv.sources.filter((s) => s.kind === 'website');
  const srcs = inv.sources.filter((s) => s.kind !== 'website');   // documents
  const ok = srcs.filter((s) => s.probe.ok);
  const finalType = (s) => s.probe.typeFromServer || s.type;
  const reused = srcs.filter((s) => s.probe.reusedFrom);
  L.push('# i360 CSE — source inventory', '');
  L.push(`Generated ${inv.generatedAt} from Baserow table ${inv.table} (auth scheme: ${inv.authScheme}).`, '');
  if (inv.mode === 'all') L.push('Every link was checked in this run (`--all`).', '');
  else L.push(`Checked in this run: ${srcs.length - reused.length} (new links and links that failed before). Kept from earlier runs: ${reused.length} (already checked successfully). To check everything again: \`npm run inventory -- --all\`.`, '');
  L.push('## Totals', '');
  L.push('| | |', '|---|---|');
  L.push(`| Rows in i360dbs | ${inv.rowCount} |`);
  L.push(`| Rows with at least one link | ${inv.rowsWithLinks} |`);
  L.push(`| Links (all cells, all lines) | ${inv.linkCount} |`);
  L.push(`| Distinct sources | ${inv.sources.length} |`);
  L.push(`| Websites (not indexed) | ${websites.length} |`);
  L.push(`| Documents | ${srcs.length} |`);
  L.push(`| Reachable | ${ok.length} |`);
  L.push(`| Failing | ${srcs.length - ok.length} |`);
  L.push(`| Known total size (reachable) | ${sizeCell(ok)} |`);
  L.push(`| Lines that aren't links | ${inv.notUrls.length} |`, '');

  L.push('## By type', '');
  L.push('| Type | Sources | Reachable | Known size | Largest |', '|---|---|---|---|---|');
  for (const t of [...new Set(srcs.map(finalType))].sort()) {
    const all = srcs.filter((s) => finalType(s) === t);
    const good = all.filter((s) => s.probe.ok);
    L.push(`| ${t} | ${all.length} | ${good.length} | ${sizeCell(good)} | ${largestCell(good)} |`);
  }
  L.push('', '_Wikipedia/Wikisource sizes are wikitext length, not download size. "Unknown": the server sent no size._', '');

  L.push('## By host', '');
  L.push('| Host | Sources | Reachable | Cross-site reads allowed (CORS) |', '|---|---|---|---|');
  for (const h of [...new Set(srcs.map((s) => s.host))].sort()) {
    const all = srcs.filter((s) => s.host === h);
    const good = all.filter((s) => s.probe.ok);
    const cors = [...new Set(good.map((s) => s.probe.cors || 'no'))].join(', ');
    L.push(`| ${h} | ${all.length} | ${good.length} | ${cell(cors || '—')} |`);
  }
  L.push('');

  const arch = srcs.filter((s) => s.kind === 'archive-file' && s.probe.ok);
  if (arch.length) {
    L.push('## archive.org page helpers', '');
    L.push(`For ${arch.length} reachable archive.org files: how many also have each helper (needed to split djvu text into real pages).`, '');
    L.push('| Helper | Present |', '|---|---|');
    for (const hname of ARCHIVE_HELPERS) {
      L.push(`| \`${hname}\` | ${arch.filter((s) => (s.probe.helpers || []).includes(hname)).length} / ${arch.length} |`);
    }
    L.push('');
  }

  const fails = srcs.filter((s) => !s.probe.ok);
  L.push(`## Failing sources (${fails.length})`, '');
  if (fails.length) {
    L.push('Step: `metadata` = archive.org item details, `download` = the file itself, `headers` = any other link, `api` = Wikipedia/Wikisource. Server: where it failed (archive.org hands downloads on to a storage server).', '');
    L.push('| Link | Step | Server | Reason | Used by (row: minor) |', '|---|---|---|---|---|');
    for (const s of fails) {
      L.push(`| ${cell(s.links[0])} | ${cell(s.probe.step || '')} | ${cell(s.probe.where || '')} | ${cell(s.probe.why || s.probe.error)} | ${cell(s.usedBy.map((u) => `${u.rowId}: ${u.minor}`).join('; '))} |`);
    }
    const servers = new Map();
    for (const s of fails) if (s.probe.where) servers.set(s.probe.where, (servers.get(s.probe.where) || 0) + 1);
    const repeated = [...servers].filter(([, n]) => n > 1);
    if (repeated.length) L.push('', `Servers failing more than once: ${repeated.map(([h, n]) => `${h} (${n})`).join(', ')}.`);
  } else L.push('None.');
  L.push('');

  const noFp = ok.filter((s) => !s.probe.fingerprint && s.kind !== 'archive-item');
  L.push(`## Reachable but no change fingerprint (${noFp.length})`, '');
  L.push('The weekly freshness check can only spot changes in these by downloading them again.', '');
  for (const s of noFp) L.push(`- ${s.links[0]}`);
  L.push('');

  L.push(`## Websites, not indexed (${websites.length})`, '');
  L.push('Links to a whole site (home page only). Listed here, not checked.', '');
  for (const s of websites) L.push(`- ${s.links[0]} — ${s.usedBy.map((u) => `${u.rowId}: ${u.minor}`).join('; ')}`);
  L.push('');

  const items = srcs.filter((s) => s.kind === 'archive-item');
  if (items.length) {
    L.push(`## Whole archive.org items, no file named (${items.length})`, '');
    L.push('The indexer has to pick a text file from the item; these are the candidates.', '');
    for (const s of items) L.push(`- ${s.links[0]} — ${s.probe.ok ? (s.probe.textFiles || []).map((f) => `${f.name} (${fmtSize(f.size)})`).join(', ') || 'no text files' : s.probe.error}`);
    L.push('');
  }

  const shared = inv.sources.filter((s) => s.usedBy.length > 1);
  L.push(`## Sources listed more than once (${shared.length})`, '');
  for (const s of shared) L.push(`- ${s.links[0]} — ${s.usedBy.map((u) => `${u.rowId}: ${u.minor} (${u.field})`).join('; ')}`);
  L.push('');

  L.push(`## Lines that aren't links (${inv.notUrls.length})`, '');
  for (const n of inv.notUrls) L.push(`- row ${n.rowId} (${n.minor}), ${n.field}: \`${cell(n.line)}\``);
  L.push('');
  return L.join('\n');
}

// Successful checks from the previous run, by source id.
function previousResults(outDir) {
  const p = join(outDir, 'inventory.json');
  if (!existsSync(p)) return { map: new Map(), at: null };
  try {
    const prev = JSON.parse(readFileSync(p, 'utf8'));
    const map = new Map();
    for (const s of prev.sources || []) if (s.probe && s.probe.ok) map.set(s.id, s.probe);
    return { map, at: prev.generatedAt || null };
  } catch {
    return { map: new Map(), at: null };   // unreadable: check everything
  }
}

async function run({ fetchFn = fetch, key, table = DEFAULT_TABLE, outDir, all = false, log = console.log }) {
  if (!key) throw new Error('BASEROW_KEY is not set. Add it to .env (the read-only Baserow token) and run: npm run inventory');
  archiveMeta.clear();
  log(`Reading Baserow table ${table}…`);
  const { rows, scheme } = await readRows(fetchFn, key, table);
  const { sources, notUrls, rowsWithLinks, linkCount } = collectSources(rows);
  const prev = all ? { map: new Map(), at: null } : previousResults(outDir);

  const toCheck = [];
  for (const s of sources) {
    if (s.kind === 'website') { s.probe = { ok: null, skipped: 'website' }; continue; }
    const old = prev.map.get(s.id);
    if (old) s.probe = { ...old, reusedFrom: old.reusedFrom || prev.at };
    else toCheck.push(s);
  }
  log(`${rows.length} rows, ${linkCount} links, ${sources.length} distinct sources; ${toCheck.length} to check${all ? ' (--all)' : ''}…`);
  let lastPct = -1;
  const probes = await mapLimit(toCheck, CONCURRENCY, (s) => probe(fetchFn, s), (done, total) => {
    const pct = Math.floor((done / total) * 10) * 10;
    if (pct !== lastPct) { lastPct = pct; log(`  ${done}/${total}`); }
  });
  toCheck.forEach((s, i) => { s.probe = probes[i]; });

  const inv = { generatedAt: new Date().toISOString(), table, authScheme: scheme, mode: all ? 'all' : 'incremental', rowCount: rows.length, rowsWithLinks, linkCount, notUrls, sources };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'inventory.json'), JSON.stringify(inv, null, 2));
  writeFileSync(join(outDir, 'inventory.md'), summary(inv));
  log(`Done: ${join(outDir, 'inventory.md')}`);
  return inv;
}

// Forget archive.org metadata from an earlier run in the same process.
const clearProbeCache = () => archiveMeta.clear();

// Also used by the indexer (indexer/build-index.js).
module.exports = { run, clearProbeCache, parseCell, normalizeUrl, fieldText, summary, causeText, readRows, collectSources, probe, fetchWithRetry, ARCHIVE_HELPERS, DEFAULT_TABLE, USER_AGENT };

if (require.main === module) {
  run({
    key: process.env.BASEROW_KEY,
    table: process.env.BASEROW_TABLE_SCIENCES || DEFAULT_TABLE,
    outDir: join(__dirname, 'out'),
    all: process.argv.includes('--all')
  }).catch((err) => {
    console.error(`\nInventory stopped: ${err.message}`);
    process.exitCode = 1;
  });
}

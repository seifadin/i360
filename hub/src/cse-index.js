/* i360 CSE index — the index format, written by the indexer and read by the
   CSE page, in one file so both sides always agree.

   How a search works:
   1. The query is normalized with SearchCore (the Reader's rules) and cut
      into 3-character pieces (trigrams).
   2. Each trigram's list of pages is read from its shard file; pages that
      have all the trigrams are candidates.
   3. Candidates are confirmed by running SearchCore on the page text
      (diacritics and whole-word options included) — so a result is exactly
      what the Reader would find on that page.

   Published layout (under one build folder, so files never mix builds):
     latest.json                     { buildId }
     b/<buildId>/catalog.json        sources, groups, page ranges
     b/<buildId>/index/<sss>.bin     trigram shards (sss = shard, 3 hex digits)
     b/<buildId>/text/<key>/<n>.json page text, a chunk of pages per file

   A page is a list of paragraphs (strings); "\n" inside a paragraph is a
   printed line break. Matches never cross paragraphs (as in the Reader).
   An ES module (bundled into the CSE page, imported by the indexer). */
import * as SearchCore from './search-core.js';

const FORMAT = 1;
const SHARDS = 1024;
const MIN_QUERY = 3;           // normalized characters, spaces included
const MAX_QUERY_TRIGRAMS = 8;  // a long query looks up a spread of its trigrams
const MAGIC = [0x49, 0x33, 0x54, 0x58];   // "I3TX"

/* ---------------- Pages ---------------- */

// Feeds a page to SearchCore exactly as the Reader feeds its rendered page.
function searchPage(paras, exact) {
  const b = SearchCore.createPage(exact);
  for (const para of paras) {
    b.paragraph();
    para.split('\n').forEach((line, i) => {
      if (i > 0) b.lineBreak();
      if (line) b.text(line, null);
    });
  }
  return b.page;
}

// A trigram that cuts a character outside the BMP in half (an emoji, say)
// can't be stored as text; such trigrams are left out on both sides.
function splitsSurrogate(t) {
  for (let i = 0; i < t.length; i++) {
    const c = t.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDFFF) return true;
  }
  return false;
}

// Every distinct trigram of a normalized text, never across a paragraph break.
function trigrams(norm) {
  const out = new Set();
  for (let i = 0; i + 3 <= norm.length; i++) {
    const t = norm.slice(i, i + 3);
    if (!t.includes('\n') && !splitsSurrogate(t)) out.add(t);
  }
  return out;
}

// FNV-1a over UTF-16 code units: the shard a trigram lives in.
function shardOf(tri) {
  let h = 0x811c9dc5;
  for (let i = 0; i < tri.length; i++) { h ^= tri.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) % SHARDS;
}
const shardName = (n) => n.toString(16).padStart(3, '0');

/* ---------------- Query ---------------- */

// The trigrams to look up for a query (loose normalization: the index is
// loose; the exact options are applied when candidates are confirmed).
// [] when the query is shorter than MIN_QUERY.
function queryTrigrams(raw) {
  const q = SearchCore.normalizeQuery(raw, false);
  if (q.length < MIN_QUERY) return [];
  const all = [];
  for (let i = 0; i + 3 <= q.length; i++) {
    const t = q.slice(i, i + 3);
    if (!splitsSurrogate(t)) all.push(t);
  }
  if (all.length === 0) return [];
  const distinct = [...new Set(all)];
  if (distinct.length <= MAX_QUERY_TRIGRAMS) return distinct;
  // Evenly spread, first and last included: still a superset of the
  // true matches, confirmed afterwards.
  const pick = new Set();
  for (let k = 0; k < MAX_QUERY_TRIGRAMS; k++) pick.add(all[Math.round(k * (all.length - 1) / (MAX_QUERY_TRIGRAMS - 1))]);
  return [...pick];
}

function intersect(lists) {
  if (lists.length === 0) return [];
  const sorted = [...lists].sort((a, b) => a.length - b.length);
  let acc = Array.from(sorted[0]);
  for (let k = 1; k < sorted.length && acc.length; k++) {
    const other = sorted[k];
    const out = [];
    let i = 0, j = 0;
    while (i < acc.length && j < other.length) {
      if (acc[i] === other[j]) { out.push(acc[i]); i++; j++; }
      else if (acc[i] < other[j]) i++;
      else j++;
    }
    acc = out;
  }
  return acc;
}

/* ---------------- Shard files (binary) ----------------
   "I3TX", u8 format, u32 entry count, then per trigram (sorted):
   u8 byte length + UTF-8 bytes, varint page count, varint byte length,
   then the page ids as varint deltas (ascending). */

function writeVarint(out, n) {
  while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n = Math.floor(n / 128); }
  out.push(n);
}

function encodeShard(map) {   // Map<trigram, number[] ascending>
  const enc = new TextEncoder();
  const out = [...MAGIC, FORMAT, 0, 0, 0, 0];
  const keys = [...map.keys()].sort();
  const n = keys.length;
  out[5] = n & 0xff; out[6] = (n >>> 8) & 0xff; out[7] = (n >>> 16) & 0xff; out[8] = (n >>> 24) & 0xff;
  for (const k of keys) {
    const kb = enc.encode(k);
    out.push(kb.length, ...kb);
    const ids = map.get(k);
    const body = [];
    let prev = 0;
    for (const id of ids) { writeVarint(body, id - prev); prev = id; }
    writeVarint(out, ids.length);
    writeVarint(out, body.length);
    for (const b of body) out.push(b);
  }
  return Uint8Array.from(out);
}

// Reads the trigram table; page lists are decoded only when asked for.
function decodeShard(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  for (let i = 0; i < 4; i++) if (u8[i] !== MAGIC[i]) throw new Error('not an index shard');
  if (u8[4] !== FORMAT) throw new Error(`index format ${u8[4]}, expected ${FORMAT}`);
  const n = u8[5] | (u8[6] << 8) | (u8[7] << 16) | (u8[8] * 2 ** 24);
  const dec = new TextDecoder();
  let p = 9;
  const readVarint = () => {
    let v = 0, mul = 1, b;
    do { b = u8[p++]; v += (b & 0x7f) * mul; mul *= 128; } while (b & 0x80);
    return v;
  };
  const table = new Map();
  for (let e = 0; e < n; e++) {
    const len = u8[p++];
    const key = dec.decode(u8.subarray(p, p + len)); p += len;
    const count = readVarint();
    const bytes = readVarint();
    table.set(key, { count, start: p, end: p + bytes });
    p += bytes;
  }
  return {
    has: (tri) => table.has(tri),
    count: (tri) => (table.get(tri) || { count: 0 }).count,
    pages(tri) {
      const ent = table.get(tri);
      if (!ent) return [];
      const ids = new Array(ent.count);
      let q = ent.start, prev = 0;
      for (let i = 0; i < ent.count; i++) {
        let v = 0, mul = 1, b;
        do { b = u8[q++]; v += (b & 0x7f) * mul; mul *= 128; } while (b & 0x80);
        prev += v;
        ids[i] = prev;
      }
      return ids;
    }
  };
}

/* ---------------- Searching a published build ----------------
   load(path) → Promise of an ArrayBuffer (for .bin) or parsed JSON
   (for .json); paths are relative to the build folder. */
function createSearcher(catalog, load) {
  const shardCache = new Map();
  const chunkCache = new Map();
  const sources = catalog.sources;
  const starts = sources.map((s) => s.firstPage);

  function locate(gp) {   // global page id → { source, local }
    let lo = 0, hi = starts.length - 1, ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= gp) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return { source: sources[ans], local: gp - starts[ans] };
  }

  function shard(n) {
    if (!shardCache.has(n)) shardCache.set(n, Promise.resolve(load(`index/${shardName(n)}.bin`)).then(decodeShard));
    return shardCache.get(n);
  }

  function chunkOf(source, local) {   // chunk index holding a local page
    let c = 0;
    while (c + 1 < source.chunks.length && source.chunks[c + 1] <= local) c++;
    return c;
  }

  function chunk(source, c) {
    const key = `${source.key}/${c}`;
    if (!chunkCache.has(key)) chunkCache.set(key, Promise.resolve(load(`text/${source.key}/${c}.json`)));
    return chunkCache.get(key);
  }

  // Sorted global page ids that have every looked-up trigram.
  async function candidates(raw) {
    const tris = queryTrigrams(raw);
    if (tris.length === 0) return [];
    const lists = await Promise.all(tris.map(async (t) => (await shard(shardOf(t))).pages(t)));
    return intersect(lists);
  }

  // Confirms candidate pages with SearchCore. Returns, per page that
  // really matches: { gp, source, local, label, vol, count, snippets }.
  async function confirm(gps, raw, opts = {}) {
    const exact = !!opts.exact;
    const q = SearchCore.normalizeQuery(raw, exact);
    const snippetChars = opts.snippetChars || 45;
    const maxSnippets = opts.maxSnippets || 3;
    const out = [];
    for (const gp of gps) {
      const { source, local } = locate(gp);
      const c = chunkOf(source, local);
      const data = await chunk(source, c);
      const pg = data.pages[local - source.chunks[c]];
      const page = searchPage(pg.paras, exact);
      const ms = SearchCore.findMatches([page], q, { word: !!opts.word });
      if (ms.length === 0) continue;
      out.push({
        gp, source, local, label: pg.label, vol: pg.vol == null ? null : pg.vol,
        count: ms.length,
        snippets: ms.slice(0, maxSnippets).map((m) => SearchCore.snippet(m, snippetChars))
      });
    }
    return out;
  }

  return { candidates, confirm, locate };
}

/* ---------------- Grouping ----------------
   By ScienceMajor_Ar → ScienceIntermediate_Ar → source, in the app's order
   (IDs compared as numbers, as groupSciences() does). */
// Groups confirmed pages: [{ major, intermediates: [{ intermediate, sources: [{ source, pages }] }] }].
// A source listed in several rows appears under each of them.
function groupResults(hits) {
  const majors = new Map();
  for (const h of hits) {
    const rows = h.source.usedBy && h.source.usedBy.length ? h.source.usedBy : [{}];
    const seen = new Set();
    for (const u of rows) {
      const where = `${u.majorId}|${u.intermediateId}`;
      if (seen.has(where)) continue;   // the same group twice: show once
      seen.add(where);
      const mk = u.majorId || '';
      if (!majors.has(mk)) majors.set(mk, { majorId: u.majorId, major: u.major || '—', inters: new Map() });
      const M = majors.get(mk);
      const ik = u.intermediateId || '';
      if (!M.inters.has(ik)) M.inters.set(ik, { intermediateId: u.intermediateId, intermediate: u.intermediate || '', sources: new Map() });
      const I = M.inters.get(ik);
      if (!I.sources.has(h.source.key)) I.sources.set(h.source.key, { source: h.source, pages: [] });
      I.sources.get(h.source.key).pages.push(h);
    }
  }
  const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? Infinity : Number(v));
  return [...majors.values()].sort((a, b) => num(a.majorId) - num(b.majorId)).map((M) => ({
    major: M.major,
    intermediates: [...M.inters.values()].sort((a, b) => num(a.intermediateId) - num(b.intermediateId)).map((I) => ({
      intermediate: I.intermediate,
      sources: [...I.sources.values()]
    }))
  }));
}

export { FORMAT, SHARDS, MIN_QUERY, searchPage, trigrams, shardOf, shardName, queryTrigrams, intersect, encodeShard, decodeShard, createSearcher, groupResults };

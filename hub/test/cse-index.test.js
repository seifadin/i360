// Tests for src/cse-index.js and indexer/index-writer.js. The main check:
// searching a written build gives exactly the pages and counts that running
// SearchCore over every page directly gives, for every query and option.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as SC from '../src/search-core.js';
import * as CI from '../src/cse-index.js';
import { writeBuild } from '../indexer/index-writer.js';

test('trigrams stay inside a paragraph; short queries are refused', () => {
  const page = CI.searchPage(['أبجد', 'هوز'], false);
  assert.deepEqual([...CI.trigrams(page.norm)].sort(), ['ابج', 'بجد', 'هوز'].sort());
  assert.deepEqual(CI.queryTrigrams('في'), []);
  assert.deepEqual(CI.queryTrigrams('  فِي  '), [], 'diacritics and spaces around do not count');
  assert.deepEqual(CI.queryTrigrams('في ال'), ['في ', 'ي ا', ' ال']);
  const long = CI.queryTrigrams('بسم الله الرحمن الرحيم الحمد لله رب العالمين');
  assert.ok(long.length <= 8 && long.length >= 2);
});

test('shards round-trip, including large page ids and many entries', () => {
  const m = new Map([['ابج', [0, 5, 6, 70000, 3000000000]], ['xyz', [1]], ['ا ب', []]]);
  for (let i = 0; i < 300; i++) m.set(`ت${String.fromCharCode(0x0621 + (i % 40))}${i % 7}`, [i, i + 1]);
  const d = CI.decodeShard(CI.encodeShard(m));
  assert.deepEqual(d.pages('ابج'), [0, 5, 6, 70000, 3000000000]);
  assert.deepEqual(d.pages('xyz'), [1]);
  assert.deepEqual(d.pages('nope'), []);
  assert.equal(d.count('ابج'), 5);
  assert.throws(() => CI.decodeShard(new Uint8Array([1, 2, 3, 4, 1, 0, 0, 0, 0])), /not an index shard/);
});

test('intersect', () => {
  assert.deepEqual(CI.intersect([[1, 3, 5, 9], [3, 4, 5, 9, 10], [0, 5, 9]]), [5, 9]);
  assert.deepEqual(CI.intersect([[1, 2], []]), []);
});

// ---- A small library, written and searched ----
const WORDS = ['الحمد', 'لله', 'رَبِّ', 'العالمين', 'الرحمن', 'الرحيم', 'مالك', 'يوم', 'الدين', 'إياك', 'نعبد', 'وإياك', 'نستعين',
  'اهدنا', 'الصراط', 'المستقيم', 'صراط', 'الذين', 'أنعمت', 'عليهم', 'العلم', 'والعلماء', 'علم', 'مسألة', 'مسئول', 'رحمة', '١٤٣٣', '25', 'Book', 'knowledge'];
function rng(seed) { return () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }
function makeLibrary() {
  const r = rng(7);
  const pick = () => WORDS[Math.floor(r() * WORDS.length)];
  const sources = [];
  for (let s = 0; s < 4; s++) {
    const pages = [];
    const n = 5 + Math.floor(r() * 30);
    for (let p = 0; p < n; p++) {
      const paras = [];
      for (let k = 0; k < 1 + Math.floor(r() * 4); k++) {
        const words = Array.from({ length: 3 + Math.floor(r() * 25) }, pick);
        if (r() < 0.3) words.splice(Math.floor(words.length / 2), 0, '\n');   // a printed line break
        paras.push(words.join(' ').replace(/ \n /g, '\n'));
      }
      pages.push({ label: String(p + 1), vol: null, paras });
    }
    sources.push({
      id: `archive:item${s}/book${s}_djvu.txt`, url: `https://archive.org/stream/item${s}/book${s}_djvu.txt`, links: [], type: 'djvu-txt',
      usedBy: [{ rowId: s, major: 'م', intermediate: 'و', minor: `ص${s}` }], pages,
      loadPages: async () => pages
    });
  }
  sources.push({ id: 'archive:empty/x', url: 'u', links: [], type: 'djvu-txt', usedBy: [], loadPages: async () => [], reason: 'download failed' });
  return sources;
}

function bruteForce(sources, raw, opts) {
  if (SC.normalizeQuery(raw, false).length < CI.MIN_QUERY) return [];   // the CSE refuses these
  const q = SC.normalizeQuery(raw, !!opts.exact);
  const out = [];
  let gp = 0;
  for (const s of [...sources].filter((x) => x.pages).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    for (const p of s.pages) {
      const n = SC.findMatches([CI.searchPage(p.paras, !!opts.exact)], q, { word: !!opts.word }).length;
      if (n) out.push([gp, n]);
      gp++;
    }
  }
  return out;
}

test('a written build finds exactly what SearchCore finds on every page', async () => {
  const sources = makeLibrary();
  const out = mkdtempSync(join(tmpdir(), 'cse-'));
  const { catalog, stats } = await writeBuild({ sources, outDir: out, buildId: 't1', passes: 3, chunkBytes: 2000 });

  assert.equal(JSON.parse(readFileSync(join(out, 'latest.json'), 'utf8')).buildId, 't1');
  assert.equal(catalog.sources.length, 4);
  assert.deepEqual(catalog.unindexed, [{ id: 'archive:empty/x', url: 'u', reason: 'download failed' }]);
  assert.equal(readdirSync(join(out, 'b', 't1', 'index')).length, CI.SHARDS, 'every shard file exists, even empty ones');
  assert.ok(catalog.sources.some((s) => s.chunks.length > 1), 'small chunk size splits books into several chunks');
  assert.equal(stats.pageCount, catalog.pageCount);

  const base = join(out, 'b', 't1');
  const load = async (p) => (p.endsWith('.json') ? JSON.parse(readFileSync(join(base, p), 'utf8')) : readFileSync(join(base, p)));
  const searcher = CI.createSearcher(catalog, load);

  const queries = ['الحمد لله', 'الرحمن الرحيم', 'رب العالمين', 'رَبِّ', 'علم', 'العلم', 'مسيول', 'رحمه', '1433', 'إياك نعبد',
    'book', 'نستعين اهدنا', 'الذين أنعمت عليهم', 'يوم الدين', 'xyz', 'مالك يوم الدين إياك نعبد وإياك نستعين اهدنا الصراط'];
  let compared = 0;
  for (const raw of queries) {
    for (const opts of [{}, { exact: true }, { word: true }, { exact: true, word: true }]) {
      const expected = bruteForce(sources, raw, opts);
      const got = await searcher.confirm(await searcher.candidates(raw), raw, opts);
      assert.deepEqual(got.map((r) => [r.gp, r.count]), expected, `${raw} ${JSON.stringify(opts)}`);
      compared++;
    }
  }
  assert.equal(compared, 64);

  const [hit] = await searcher.confirm(await searcher.candidates('رب العالمين'), 'رب العالمين');
  assert.ok(hit.label && hit.source.usedBy[0].minor.startsWith('ص'));
  assert.match(hit.snippets[0].hit, /رَبِّ العالمين|رب العالمين/);
  assert.deepEqual(await searcher.candidates('في'), [], 'too short: nothing looked up');
});

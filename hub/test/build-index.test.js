// End-to-end test of indexer/build-index.js with simulated services: Baserow,
// Wikipedia, Wikisource, a web page, an archive.org book and a book of our own
// in library/books/. Then searches the build like the CSE page will.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const idx = require('../indexer/build-index.js');
const { search } = require('../indexer/search.js');
const ex = require('../indexer/extract.js');

function reply(status, body, headers = {}, text) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status, ok: status >= 200 && status < 300,
    headers: { get: (k) => (h.has(k.toLowerCase()) ? h.get(k.toLowerCase()) : null) },
    json: async () => body, text: async () => (text != null ? text : JSON.stringify(body))
  };
}
const row = (id, majorId, major, interId, inter, minor, links) => ({
  id, ScienceMinorId: id, ScienceMinor_Ar: minor, ScienceMajorId: majorId, ScienceMajor_Ar: major,
  ScienceIntermediateId: interId, ScienceIntermediate_Ar: inter, BotKB: links, CustomSearchAIKBlessBotKB: ''
});
const ROWS = [
  row(1, '2', 'الحديث', '20', 'كتب الصحاح', 'صحيح البخاري', 'https://archive.org/stream/bukhari/bukhari_djvu.txt\nhttps://ar.wikipedia.org/wiki/صحيح_البخاري'),
  row(2, '1', 'القرآن', '', '', 'التجويد', 'https://ar.wikisource.org/wiki/الأم\nhttps://www.greattafsirs.com/\nhttps://lib.i36o.workers.dev/books/test_ocr.md'),
  row(3, '1', 'القرآن', '10', 'التفسير', 'تفسير', 'https://en-wikipedia-org.translate.goog/wiki/Tafsir?_x_tr_sl=en&_x_tr_tl=ar')
];

function services(state) {
  return async (url, opts = {}) => {
    state.calls.push(url);
    if (url.startsWith('https://api.baserow.io/')) return reply(200, { next: null, results: ROWS });
    if (url === 'https://archive.org/metadata/bukhari') {
      return reply(200, { metadata: { title: 'صحيح البخاري' }, files: [{ name: 'bukhari_djvu.txt', size: '100', md5: state.md5 }] });
    }
    if (url.startsWith('https://archive.org/download/')) {
      if (state.archiveDown) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED', message: 'refused' } });
      return reply(200, null, { 'content-length': '100' });
    }
    if (url.startsWith('https://en.wikipedia.org/w/api.php') && url.includes('prop=langlinks')) {
      if (url.includes('NoArabic')) return reply(200, { query: { pages: [{ title: 'NoArabic', langlinks: [] }] } });
      return reply(200, { query: { pages: [{ title: 'Tafsir', langlinks: [{ lang: 'ar', title: 'تفسير القرآن' }] }] } });
    }
    if (url.includes('wikipedia.org/w/api.php') && url.includes('prop=extracts') && url.includes(encodeURIComponent('تفسير القرآن'))) {
      return reply(200, { query: { pages: [{ title: 'تفسير القرآن', lastrevid: 9, extract: 'علم التفسير هو علم يفهم به كتاب الله ومعانيه.' }] } });
    }
    if (url.includes('wikipedia.org/w/api.php') && url.includes('prop=extracts')) {
      return reply(200, { query: { pages: [{ title: 'صحيح البخاري', lastrevid: 7, extract: 'صحيح البخاري أصح كتب الحديث.\n\n== المحتوى ==\nكتاب بدء الوحي' }] } });
    }
    if (url.includes('wikipedia.org/w/api.php') && url.includes('prop=info')) {
      return reply(200, { query: { pages: [{ title: 'صحيح البخاري', lastrevid: 7, length: 10 }] } });
    }
    if (url.includes('wikisource.org/w/api.php') && url.includes('prop=extracts')) {
      return reply(200, { query: { pages: [{ title: 'الأم', lastrevid: 3, extract: '' }] } });   // no extract: rendered HTML instead
    }
    if (url.includes('wikisource.org/w/api.php') && url.includes('prop=info')) {
      return reply(200, { query: { pages: [{ title: 'الأم', lastrevid: 3, length: 10 }] } });
    }
    if (url.includes('wikisource.org/w/api.php') && url.includes('action=parse')) {
      return reply(200, { parse: { title: 'الأم', revid: 3, text: '<p>قال الشافعي رحمه الله:<br>العلم علمان<span class="mw-editsection">[عدل]</span></p>' } });
    }
    if (url.startsWith('https://en-wikipedia-org.translate.goog/')) {
      return reply(200, null, { 'content-type': 'text/html' }, '<html><head><title>التفسير</title><script>var x="ignored";</script></head><body><h1>التفسير</h1><p>علم التفسير هو علم يفهم به كتاب الله &amp; معانيه.</p></body></html>');
    }
    throw new Error('unexpected ' + url);
  };
}

// Stand-in for the archive.org page splitter (written once the real formats are confirmed).
function fakeArchive(state) {
  return async (fetchFn, src) => {
    const res = await fetchFn(src.fetchUrl, {});
    if (!res.ok) throw new Error('download failed');
    state.archiveDownloads++;
    return {
      fingerprint: `md5:${state.md5}`, title: 'صحيح البخاري',
      pages: [
        { label: '1', vol: null, paras: ['كتاب بدء الوحي', 'إنما الأعمال بالنيات'] },
        { label: '2', vol: null, paras: ['باب كيف كان بدء الوحي إلى رسول الله'] }
      ]
    };
  };
}

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'idx-'));
  const indexer = join(root, 'indexer');
  mkdirSync(join(root, 'library', 'books'), { recursive: true });
  mkdirSync(indexer);
  writeFileSync(join(root, 'library', 'books', 'test_ocr.md'), '[ص 1]\n# مقدمة\nأحكام التجويد(1)\n\n---\n(1) انظر النشر في القراءات العشر.\n[ص 2]\nالإظهار والإدغام\n');
  return indexer;
}

test('HTML → paragraphs: blocks, <br>, entities, skipped elements', () => {
  assert.deepEqual(ex.htmlToParas('<p>أ <b>ب</b><br>ج &amp; د&#160;هـ</p><script>x</script><ul><li>و</li><li>ز<ul><li>ح</li></ul></li></ul>'),
    [`أ ب\nج & د${String.fromCharCode(160)}هـ`, 'و', 'ز', 'ح'], '&#160; stays a no-break space, as in the Reader');
  assert.deepEqual(ex.htmlToParas('<p>نص<span class="mw-editsection">[عدل]</span></p>', { skipClass: ['mw-editsection'] }), ['نص']);
  assert.deepEqual(ex.htmlToParas('<table><tr><td>أ</td><td>ب</td></tr></table>'), ['أ', 'ب']);
});

test('the indexer builds, reuses unchanged text and keeps old text when a source is down', async () => {
  const dir = setup();
  const state = { calls: [], md5: 'a1', archiveDown: false, archiveDownloads: 0 };
  const logs = [];
  const r1 = await idx.run({ fetchFn: services(state), key: 'K', rootDir: dir, archivePages: fakeArchive(state), passes: 2, buildId: 'one', log: (s) => logs.push(s) });
  assert.equal(r1.report.status.fresh.length, 5);
  assert.equal(r1.catalog.sources.length, 5);
  assert.equal(r1.report.status.failed.length, 0);
  const translated = r1.catalog.sources.find((s) => s.links[0].includes('translate.goog'));
  assert.equal(translated.url, `https://ar.wikipedia.org/wiki/${encodeURIComponent('تفسير_القرآن')}`, 'results point to the Arabic article');
  assert.equal(translated.title, 'تفسير القرآن');
  assert.equal(state.archiveDownloads, 1);
  assert.ok(existsSync(join(dir, 'dist', 'books', 'test_ocr.md')), 'own books are published as they are');
  assert.ok(!state.calls.some((u) => u.includes('greattafsirs')), 'website links are skipped');

  // Search the build, as the CSE page will.
  const r = await search(join(dir, 'dist'), 'بدء الوحي');
  assert.equal(r.hits.length, 3, 'two archive pages and the Wikipedia article');
  assert.equal(r.groups[0].major, 'الحديث');
  assert.equal(r.groups[0].intermediates[0].intermediate, 'كتب الصحاح');
  const own = await search(join(dir, 'dist'), 'النشر في القراءات');
  assert.equal(own.hits.length, 1, 'footnotes of our own books are searchable');
  assert.equal(own.hits[0].label, '1');
  assert.equal((await search(join(dir, 'dist'), 'العلم علمان')).hits.length, 1, 'a printed line break reads as a space');
  assert.equal((await search(join(dir, 'dist'), 'معانيه')).hits.length, 1, 'a translated Wikipedia link indexes the Arabic article');
  assert.equal((await search(join(dir, 'dist'), 'عدل')).hits.length, 0, 'Wikisource edit links are left out');
  assert.equal((await search(join(dir, 'dist'), 'المحتوى')).hits.length, 1, 'headings keep their text, without the == marks');
  assert.equal((await search(join(dir, 'dist'), '== المحتوى')).hits.length, 0);
  const order = (await search(join(dir, 'dist'), 'كتاب')).groups.map((g) => g.major);
  assert.deepEqual(order, ['القرآن', 'الحديث'], 'groups follow the app order (major 1 before major 2)');
  const both = (await search(join(dir, 'dist'), 'علم')).groups.map((g) => g.major);
  assert.deepEqual(both, ['القرآن'], 'groups follow the app order');

  // Second run: nothing changed → no archive download, text reused, and the
  // storage server isn't even contacted (the md5 comes from the metadata).
  state.calls.length = 0;
  const r2 = await idx.run({ fetchFn: services(state), key: 'K', rootDir: dir, archivePages: fakeArchive(state), passes: 2, buildId: 'two', log: () => {} });
  assert.equal(state.archiveDownloads, 1);
  assert.ok(r2.report.status.reused.some((s) => s.id.startsWith('archive:')));
  assert.ok(!state.calls.some((u) => u.startsWith('https://archive.org/download/')), 'unchanged book: no download request at all');
  assert.equal(JSON.parse(readFileSync(join(dir, 'dist', 'latest.json'), 'utf8')).buildId, 'two');

  // The book changed (new md5) but its storage server is down → old text kept, still searchable.
  state.md5 = 'b2'; state.archiveDown = true;
  const r3 = await idx.run({ fetchFn: services(state), key: 'K', rootDir: dir, archivePages: fakeArchive(state), passes: 2, buildId: 'three', log: () => {} });
  assert.equal(r3.report.status.stale.length, 1);
  assert.match(r3.report.status.stale[0].reason, /refused|failed/);
  assert.equal((await search(join(dir, 'dist'), 'إنما الأعمال')).hits.length, 1);

  // Back up → downloaded again with the new fingerprint.
  state.archiveDown = false;
  const r4 = await idx.run({ fetchFn: services(state), key: 'K', rootDir: dir, archivePages: fakeArchive(state), passes: 2, buildId: 'four', log: () => {} });
  assert.ok(r4.report.status.fresh.some((s) => s.id.startsWith('archive:')));
  assert.equal(state.archiveDownloads, 2);
});

test('a source that never worked is listed as not indexed, the rest still builds', async () => {
  const dir = setup();
  const state = { calls: [], md5: 'a1', archiveDown: true, archiveDownloads: 0 };
  const r = await idx.run({ fetchFn: services(state), key: 'K', rootDir: dir, archivePages: fakeArchive(state), passes: 1, buildId: 'x', log: () => {} });
  assert.equal(r.report.status.failed.length, 1, 'the archive book');
  assert.equal(r.catalog.unindexed.length, 1);
  assert.equal(r.catalog.sources.length, 4);
});

test('a translated Wikipedia link with no Arabic article is listed as not indexed, with the reason', async () => {
  const ex2 = require('../indexer/extract.js');
  const state = { calls: [], md5: 'a1' };
  await assert.rejects(ex2.translatedWikiPages(services(state), { fetchUrl: 'https://en-wikipedia-org.translate.goog/wiki/NoArabic?_x_tr_tl=ar' }),
    /«NoArabic» has no ar version on wikipedia; not indexed/);
});

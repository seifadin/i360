// Tests for indexer/inventory.js, with Baserow, archive.org, Wikipedia,
// Wikisource and other hosts simulated (no network). Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as inv from '../indexer/inventory.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'inv-'));

test('cells: one link per line, blanks and repeats dropped, non-links kept aside', () => {
  const r = inv.parseCell('https://a.org/x.pdf\r\n\n  https://b.org/y.txt  \nhttps://a.org/x.pdf\nكتاب بلا رابط\nftp://old.org/z');
  assert.deepEqual(r.links, ['https://a.org/x.pdf', 'https://b.org/y.txt']);
  assert.deepEqual(r.notUrls, ['كتاب بلا رابط', 'ftp://old.org/z']);
  assert.deepEqual(inv.parseCell(null), { links: [], notUrls: [] });
  assert.equal(inv.fieldText([{ id: 1, value: 'الفقه' }, { id: 2, value: 'الحديث' }]), 'الفقه\nالحديث');
});

test('archive.org: /stream/ becomes /download/, Arabic file names survive', () => {
  const n = inv.normalizeUrl('https://archive.org/stream/sahih-bukhari/%D8%B5%D8%AD%D9%8A%D8%AD_djvu.txt');
  assert.equal(n.kind, 'archive-file');
  assert.equal(n.type, 'djvu-txt');
  assert.equal(n.item, 'sahih-bukhari');
  assert.equal(n.file, 'صحيح_djvu.txt');
  assert.equal(n.fetchUrl, 'https://archive.org/download/sahih-bukhari/%D8%B5%D8%AD%D9%8A%D8%AD_djvu.txt');
  assert.equal(inv.normalizeUrl('https://www.archive.org/download/sahih-bukhari/صحيح_djvu.txt').id, n.id);
  assert.equal(inv.normalizeUrl('https://archive.org/details/sahih-bukhari').kind, 'archive-item');
  assert.equal(inv.normalizeUrl('https://archive.org/download/x/book.pdf').type, 'pdf');
  assert.equal(inv.normalizeUrl('https://archive.org/download/x/book_ocr.md').type, 'md-ocr');
});

test('Wikipedia and Wikisource: project, language and title from the link', () => {
  const n = inv.normalizeUrl('https://ar.wikipedia.org/wiki/%D8%B5%D8%AD%D9%8A%D8%AD_%D8%A7%D9%84%D8%A8%D8%AE%D8%A7%D8%B1%D9%8A');
  assert.equal(n.kind, 'wikimedia');
  assert.equal(n.project, 'wikipedia');
  assert.equal(n.lang, 'ar');
  assert.equal(n.title, 'صحيح البخاري');
  const ws = inv.normalizeUrl('https://ar.wikisource.org/wiki/%D8%A7%D9%84%D8%A3%D9%85');
  assert.equal(ws.project, 'wikisource');
  assert.equal(ws.type, 'wikisource');
  assert.equal(ws.host, 'wikisource.org');
  assert.equal(inv.normalizeUrl('https://ar.m.wikipedia.org/wiki/X').lang, 'ar');
  assert.equal(inv.normalizeUrl('https://www.wikipedia.org/wiki/X').lang, null);
  // a translated copy stays an ordinary link, used as it is
  assert.equal(inv.normalizeUrl('https://en-wikipedia-org.translate.goog/wiki/Islam?_x_tr_sl=en&_x_tr_tl=ar').kind, 'other');
});

test('a link to a whole website is not a document', () => {
  for (const l of ['https://www.greattafsirs.com/', 'https://islh.journals.ekb.eg', 'https://wikipedia.org']) {
    assert.equal(inv.normalizeUrl(l).kind, l.includes('wikipedia') ? 'wikimedia' : 'website', l);
  }
  assert.equal(inv.normalizeUrl('https://example.org/?p=5').kind, 'other');
  assert.equal(inv.normalizeUrl('https://example.org/book').kind, 'other');
});

test('the real reason behind "fetch failed"', () => {
  const e = new TypeError('fetch failed');
  e.cause = Object.assign(new Error('connect ECONNREFUSED 1.2.3.4:443'), { code: 'ECONNREFUSED' });
  assert.equal(inv.causeText(e), 'connect ECONNREFUSED 1.2.3.4:443');
  const e2 = new TypeError('fetch failed');
  e2.cause = Object.assign(new Error('other side closed'), { code: 'UND_ERR_SOCKET' });
  assert.equal(inv.causeText(e2), 'UND_ERR_SOCKET other side closed');
  assert.equal(inv.causeText(Object.assign(new Error('x'), { name: 'AbortError' })), 'no answer within 30 s');
});

// ---- Simulated services ----
function reply(status, body, headers = {}) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status, ok: status >= 200 && status < 300,
    headers: { get: (k) => (h.has(k.toLowerCase()) ? h.get(k.toLowerCase()) : null) },
    json: async () => body, text: async () => JSON.stringify(body)
  };
}
const row = (id, minor, major, inter, bot, aikb) => ({
  id, ScienceMinorId: id, ScienceMinor_Ar: minor, ScienceMajorId: '1', ScienceMajor_Ar: major,
  ScienceIntermediateId: inter ? '10' : '', ScienceIntermediate_Ar: inter, BotKB: bot, CustomSearchAIKBlessBotKB: aikb
});
const ROWS = [
  row(1, 'صحيح البخاري', 'الحديث', 'كتب الصحاح',
    'https://archive.org/stream/bukhari/bukhari_djvu.txt\nhttps://ar.wikipedia.org/wiki/صحيح_البخاري',
    'https://archive.org/download/bukhari/bukhari.pdf'),
  row(2, 'صحيح مسلم', 'الحديث', 'كتب الصحاح', 'https://archive.org/stream/bukhari/bukhari_djvu.txt\nملاحظة', ''),
  row(3, 'التجويد', 'القرآن', '', 'https://example.org/notes.txt\nhttps://gone.example/x.html\nhttps://ar.wikipedia.org/wiki/غير_موجود\nhttps://archive.org/details/missing-item\nhttps://example.org/page.html', null),
  row(4, 'العقيدة', 'العقيدة', '', 'https://www.greattafsirs.com/\nhttps://ar.wikisource.org/wiki/الأم\nhttps://archive.org/stream/golden/golden_djvu.txt', '')
];

function fakeFetch(calls, { goldenDown = true } = {}) {
  return async (url, opts = {}) => {
    calls.push([opts.method || 'GET', url]);
    if (url.startsWith('https://api.baserow.io/')) {
      if (opts.headers.Authorization !== 'Token KEY') return reply(401, { error: 'no' });
      const page2 = url.includes('page=2');
      return reply(200, { count: 4, next: page2 ? null : url + '&page=2', results: page2 ? ROWS.slice(2) : ROWS.slice(0, 2) });
    }
    if (url === 'https://archive.org/metadata/bukhari') {
      return reply(200, { metadata: { title: 'صحيح البخاري', language: 'ara' }, files: [
        { name: 'bukhari_djvu.txt', size: '5242880', md5: 'abc' },
        { name: 'bukhari.pdf', size: '104857600', md5: 'def' },
        { name: 'bukhari_page_numbers.json', size: '100' },
        { name: 'bukhari_djvu.xml', size: '100' }
      ] });
    }
    if (url === 'https://archive.org/metadata/golden') {
      return reply(200, { metadata: { title: 'golden' }, files: [{ name: 'golden_djvu.txt', size: '1000', md5: 'g1' }] });
    }
    if (url === 'https://archive.org/metadata/missing-item') return reply(200, {});
    // archive.org downloads are handed on to a storage server
    if (url.startsWith('https://archive.org/download/')) {
      assert.equal(opts.redirect, 'manual');
      return reply(302, null, { location: url.replace('https://archive.org/download/', 'https://ia800100.us.archive.org/1/items/') });
    }
    if (url.startsWith('https://ia800100.us.archive.org/1/items/golden/') && goldenDown) {
      const e = new TypeError('fetch failed');
      e.cause = Object.assign(new Error('connect ECONNREFUSED 207.241.0.1:443'), { code: 'ECONNREFUSED' });
      throw e;
    }
    if (url.startsWith('https://ia800100.us.archive.org/')) return reply(200, null, { 'content-length': '5242880', 'access-control-allow-origin': '*' });
    if (url.startsWith('https://ar.wikipedia.org/w/api.php')) {
      if (url.includes(encodeURIComponent('غير موجود'))) return reply(200, { query: { pages: [{ title: 'غير موجود', missing: true }] } });
      return reply(200, { query: { pages: [{ pageid: 1, title: 'صحيح البخاري', lastrevid: 777, length: 42000 }] } });
    }
    if (url.startsWith('https://ar.wikisource.org/w/api.php')) {
      return reply(200, { query: { pages: [{ pageid: 9, title: 'الأم', lastrevid: 555, length: 9000 }] } });
    }
    if (url === 'https://example.org/notes.txt') {
      if (opts.method === 'HEAD') return reply(405, null);
      return reply(206, null, { 'content-range': 'bytes 0-0/1234', 'content-type': 'text/plain; charset=utf-8', etag: '"e1"' });
    }
    if (url === 'https://example.org/page.html') return reply(200, null, { 'content-type': 'text/html' });   // no size sent
    if (url === 'https://gone.example/x.html') return reply(404, null);
    throw new Error('unexpected ' + url);
  };
}

test('end to end with simulated services', async () => {
  const calls = [];
  const out = tmp();
  const r = await inv.run({ fetchFn: fakeFetch(calls), key: 'KEY', table: '193269', outDir: out, log: () => {} });

  assert.equal(r.rowCount, 4);
  assert.equal(r.rowsWithLinks, 4);
  assert.equal(r.linkCount, 12);
  assert.equal(r.sources.length, 11, 'the djvu link in rows 1 and 2 is one source');
  assert.equal(r.notUrls.length, 1);

  const by = (pred) => r.sources.find(pred);
  const djvu = by((s) => s.item === 'bukhari' && s.type === 'djvu-txt');
  assert.equal(djvu.usedBy.length, 2);
  assert.equal(djvu.probe.ok, true);
  assert.equal(djvu.probe.fingerprint, 'md5:abc');
  assert.deepEqual(djvu.probe.helpers, ['_page_numbers.json', '_djvu.xml']);
  assert.equal(djvu.probe.cors, '*');
  assert.equal(djvu.probe.server, 'ia800100.us.archive.org');
  assert.equal(calls.filter((c) => c[1] === 'https://archive.org/metadata/bukhari').length, 1, 'item metadata fetched once');

  const golden = by((s) => s.item === 'golden');
  assert.equal(golden.probe.ok, false);
  assert.equal(golden.probe.step, 'download');
  assert.equal(golden.probe.where, 'ia800100.us.archive.org', 'the storage server is named');
  assert.equal(golden.probe.why, 'connect ECONNREFUSED 207.241.0.1:443');
  assert.deepEqual(golden.probe.helpers, [], 'what was learned before the failure is kept');

  assert.equal(by((s) => s.project === 'wikipedia' && s.probe.ok).probe.fingerprint, 'rev:777');
  assert.equal(by((s) => s.title === 'غير موجود').probe.error, 'api (ar.wikipedia.org): page not found on Wikipedia');
  assert.equal(by((s) => s.project === 'wikisource').probe.fingerprint, 'rev:555');

  const site = by((s) => s.kind === 'website');
  assert.equal(site.probe.skipped, 'website');
  assert.ok(!calls.some((c) => c[1].includes('greattafsirs')), 'websites are not requested');

  assert.equal(by((s) => s.fetchUrl === 'https://example.org/notes.txt').probe.size, 1234, 'size from Content-Range after HEAD was refused');
  assert.equal(by((s) => s.fetchUrl === 'https://gone.example/x.html').probe.error, 'headers (gone.example): HTTP 404');
  assert.equal(by((s) => s.kind === 'archive-item').probe.step, 'metadata');

  const md = readFileSync(join(out, 'inventory.md'), 'utf8');
  assert.match(md, /\| Distinct sources \| 11 \|/);
  assert.match(md, /\| Websites \(not indexed\) \| 1 \|/);
  assert.match(md, /\| Documents \| 10 \|/);
  assert.match(md, /\| Failing \| 4 \|/);
  assert.match(md, /`_page_numbers\.json` \| 2 \/ 2 \|/);
  assert.match(md, /\| html \| 2 \| 1 \| unknown \| unknown \|/);
  assert.match(md, /\| wikisource \| 1 \| 1 \| 9 KB \| 9 KB \|/);
  assert.match(md, /golden_djvu\.txt \| download \| ia800100\.us\.archive\.org \| connect ECONNREFUSED/);
  assert.match(md, /## Websites, not indexed \(1\)\n\nLinks to a whole site[^\n]*\n\n- https:\/\/www\.greattafsirs\.com\/ — 4: العقيدة/);
  assert.match(md, /row 2 \(صحيح مسلم\), BotKB: `ملاحظة`/);
  assert.match(md, /Checked in this run: 10 /);
  JSON.parse(readFileSync(join(out, 'inventory.json'), 'utf8'));
});

test('a rerun checks only new links and the ones that failed; --all checks everything', async () => {
  const out = tmp();
  await inv.run({ fetchFn: fakeFetch([]), key: 'KEY', outDir: out, log: () => {} });

  // Second run: the storage server is back.
  const calls = [];
  const r = await inv.run({ fetchFn: fakeFetch(calls, { goldenDown: false }), key: 'KEY', outDir: out, log: () => {} });
  const checked = calls.filter((c) => !c[1].startsWith('https://api.baserow.io/')).map((c) => c[1]);
  assert.ok(!checked.includes('https://archive.org/metadata/bukhari'), 'a source that worked is not checked again');
  assert.ok(!checked.some((u) => u.includes('example.org/notes.txt')));
  assert.ok(checked.includes('https://archive.org/metadata/golden'), 'a failed source is checked again');
  assert.ok(checked.some((u) => u.includes('gone.example')));
  const golden = r.sources.find((s) => s.item === 'golden');
  assert.equal(golden.probe.ok, true);
  const djvu = r.sources.find((s) => s.item === 'bukhari' && s.type === 'djvu-txt');
  assert.ok(djvu.probe.reusedFrom, 'kept results say when they were checked');
  assert.equal(djvu.probe.fingerprint, 'md5:abc');
  const md = readFileSync(join(out, 'inventory.md'), 'utf8');
  assert.match(md, /Checked in this run: 4 \(new links and links that failed before\)\. Kept from earlier runs: 6/);

  const calls3 = [];
  await inv.run({ fetchFn: fakeFetch(calls3, { goldenDown: false }), key: 'KEY', outDir: out, all: true, log: () => {} });
  assert.ok(calls3.some((c) => c[1] === 'https://archive.org/metadata/bukhari'), '--all checks everything again');
  assert.match(readFileSync(join(out, 'inventory.md'), 'utf8'), /Every link was checked in this run \(`--all`\)/);
});

test('Bearer is tried once if the key is refused as a Token', async () => {
  const calls = [];
  const f = async (url, opts) => {
    calls.push(opts.headers.Authorization);
    return opts.headers.Authorization === 'Bearer K' ? reply(200, { next: null, results: [] }) : reply(401, {});
  };
  const r = await inv.run({ fetchFn: f, key: 'K', outDir: tmp(), log: () => {} });
  assert.equal(r.authScheme, 'Bearer');
  assert.deepEqual(calls, ['Token K', 'Bearer K']);
});

test('a missing field stops the run and lists the fields that exist', async () => {
  const f = async () => reply(200, { next: null, results: [{ id: 1, BotKB: '' }] });
  await assert.rejects(inv.run({ fetchFn: f, key: 'K', outDir: tmp(), log: () => {} }),
    /not found in table 193269: CustomSearchAIKBlessBotKB.*\nFields present: BotKB, id/s);
});

test('no key: a clear message', async () => {
  await assert.rejects(inv.run({ key: '', outDir: '/nonexistent' }), /BASEROW_KEY is not set/);
});

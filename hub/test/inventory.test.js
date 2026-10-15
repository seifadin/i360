// Tests for indexer/inventory.js, with Baserow, archive.org, Wikipedia and
// other hosts simulated (no network). Run with `npm test`.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const inv = require('../indexer/inventory.js');

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
  // the same file by /download/ is the same source
  assert.equal(inv.normalizeUrl('https://www.archive.org/download/sahih-bukhari/صحيح_djvu.txt').id, n.id);
  assert.equal(inv.normalizeUrl('https://archive.org/details/sahih-bukhari').kind, 'archive-item');
  assert.equal(inv.normalizeUrl('https://archive.org/download/x/book.pdf').type, 'pdf');
  assert.equal(inv.normalizeUrl('https://archive.org/download/x/book_ocr.md').type, 'md-ocr');
});

test('Wikipedia: language and title from the link', () => {
  const n = inv.normalizeUrl('https://ar.wikipedia.org/wiki/%D8%B5%D8%AD%D9%8A%D8%AD_%D8%A7%D9%84%D8%A8%D8%AE%D8%A7%D8%B1%D9%8A');
  assert.equal(n.lang, 'ar');
  assert.equal(n.title, 'صحيح البخاري');
  assert.equal(inv.normalizeUrl('https://ar.m.wikipedia.org/wiki/X').lang, 'ar');
  assert.equal(inv.normalizeUrl('https://wikipedia.org').lang, null);
  assert.equal(inv.normalizeUrl('https://www.wikipedia.org/wiki/X').lang, null);
});

// ---- Simulated services ----
function reply(status, body, headers = {}) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status, ok: status >= 200 && status < 300, url: headers['x-final-url'],
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
  row(3, 'التجويد', 'القرآن', '', 'https://example.org/notes.txt\nhttps://gone.example/x.html\nhttps://ar.wikipedia.org/wiki/غير_موجود\nhttps://archive.org/details/missing-item', null),
  row(4, 'العقيدة', 'العقيدة', '', '', '')
];

function fakeFetch(calls) {
  return async (url, opts = {}) => {
    calls.push([opts.method || 'GET', url, opts.headers && opts.headers.Authorization]);
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
    if (url === 'https://archive.org/metadata/missing-item') return reply(200, {});
    if (url.startsWith('https://archive.org/download/bukhari/')) return reply(200, null, { 'content-length': '5242880', 'access-control-allow-origin': '*' });
    if (url.startsWith('https://ar.wikipedia.org/w/api.php')) {
      if (url.includes(encodeURIComponent('غير موجود'))) return reply(200, { query: { pages: [{ title: 'غير موجود', missing: true }] } });
      return reply(200, { query: { pages: [{ pageid: 1, title: 'صحيح البخاري', lastrevid: 777, length: 42000 }] } });
    }
    if (url === 'https://example.org/notes.txt') {
      if (opts.method === 'HEAD') return reply(405, null);
      return reply(206, null, { 'content-range': 'bytes 0-0/1234', 'content-type': 'text/plain; charset=utf-8', etag: '"e1"' });
    }
    if (url === 'https://gone.example/x.html') return reply(404, null);
    throw new Error('unexpected ' + url);
  };
}

test('end to end with simulated services', async () => {
  const calls = [];
  const out = mkdtempSync(join(tmpdir(), 'inv-'));
  const r = await inv.run({ fetchFn: fakeFetch(calls), key: 'KEY', table: '193269', outDir: out, log: () => {} });

  assert.equal(r.rowCount, 4);
  assert.equal(r.rowsWithLinks, 3);
  assert.equal(r.linkCount, 8);
  assert.equal(r.sources.length, 7, 'the djvu link in rows 1 and 2 is one source');
  assert.equal(r.notUrls.length, 1);

  const by = (pred) => r.sources.find(pred);
  const djvu = by((s) => s.type === 'djvu-txt');
  assert.equal(djvu.usedBy.length, 2);
  assert.equal(djvu.probe.ok, true);
  assert.equal(djvu.probe.fingerprint, 'md5:abc');
  assert.deepEqual(djvu.probe.helpers, ['_page_numbers.json', '_djvu.xml']);
  assert.equal(djvu.probe.cors, '*');
  assert.equal(calls.filter((c) => c[1] === 'https://archive.org/metadata/bukhari').length, 1, 'item metadata fetched once');

  const wiki = by((s) => s.kind === 'wikipedia' && s.probe.ok);
  assert.equal(wiki.probe.fingerprint, 'rev:777');
  assert.equal(by((s) => s.title === 'غير موجود').probe.error, 'page not found on Wikipedia');

  const txt = by((s) => s.fetchUrl === 'https://example.org/notes.txt');
  assert.equal(txt.probe.size, 1234, 'size from Content-Range after HEAD was refused');
  assert.equal(txt.probe.fingerprint, 'etag:"e1"');
  assert.equal(by((s) => s.fetchUrl === 'https://gone.example/x.html').probe.error, 'HTTP 404');
  assert.match(by((s) => s.kind === 'archive-item').probe.error, /not found/);

  const md = readFileSync(join(out, 'inventory.md'), 'utf8');
  assert.match(md, /\| Distinct sources \| 7 \|/);
  assert.match(md, /`_page_numbers\.json` \| 2 \/ 2 \|/);
  assert.match(md, /\| html \| 1 \| 0 \| — \| — \|/);
  assert.match(md, /## Failing sources \(3\)/);
  assert.match(md, /row 2 \(صحيح مسلم\), BotKB: `ملاحظة`/);
  JSON.parse(readFileSync(join(out, 'inventory.json'), 'utf8'));
});

test('Bearer is tried once if the key is refused as a Token', async () => {
  const calls = [];
  const f = async (url, opts) => {
    calls.push(opts.headers.Authorization);
    return opts.headers.Authorization === 'Bearer K' ? reply(200, { next: null, results: [] }) : reply(401, {});
  };
  const r = await inv.run({ fetchFn: f, key: 'K', outDir: mkdtempSync(join(tmpdir(), 'inv-')), log: () => {} });
  assert.equal(r.authScheme, 'Bearer');
  assert.deepEqual(calls, ['Token K', 'Bearer K']);
});

test('a missing field stops the run and lists the fields that exist', async () => {
  const f = async () => reply(200, { next: null, results: [{ id: 1, BotKB: '' }] });
  await assert.rejects(inv.run({ fetchFn: f, key: 'K', outDir: mkdtempSync(join(tmpdir(), 'inv-')), log: () => {} }),
    /not found in table 193269: CustomSearchAIKBlessBotKB.*\nFields present: BotKB, id/s);
});

test('no key: a clear message', async () => {
  await assert.rejects(inv.run({ key: '', outDir: '/nonexistent' }), /BASEROW_KEY is not set/);
});

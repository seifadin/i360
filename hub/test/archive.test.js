// Tests for the archive.org page splitter in indexer/extract.js, using the
// formats seen in a real sample (indexer/out/sample.txt, 2026-10-16).
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const ex = require('../indexer/extract.js');

function reply(status, body) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  return {
    status, ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => JSON.parse(buf.toString('utf8')),
    text: async () => buf.toString('utf8'),
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  };
}

// Three pages of search text, one paragraph per line, as archive.org stores it.
const P1 = 'كلمة الناشر\nالحمد لله الذي فطرنا على حب دينه.';
const P2 = 'وبعد فقد كان لكتاب إحياء علوم الدين أكبر الأثر.';
const P3 = 'ربع العبادات\nكتاب العلم';
const TEXT = `${P1}\n${P2}\n${P3}`;
const INDEX = [[0, P1.length, 0, 10], [P1.length + 1, P1.length + 1 + P2.length, 10, 20], [P1.length + P2.length + 2, TEXT.length, 20, 30]];
const NAME = 'مختصر_إحياء_علوم_الدين_';

function item({ withHelpers = true, pageNumbers = ['', '1', '2'], primaryDown = false }) {
  const files = [{ name: `${NAME}_djvu.txt`, md5: 'abc', size: '100' }];
  if (withHelpers) {
    files.push({ name: `${NAME}_hocr_searchtext.txt.gz` }, { name: `${NAME}_hocr_pageindex.json.gz` });
    if (pageNumbers) files.push({ name: `${NAME}_page_numbers.json` });
  } else files.push({ name: `${NAME}_djvu.xml` });
  const content = {
    [`${NAME}_hocr_searchtext.txt.gz`]: gzipSync(Buffer.from(TEXT)),
    [`${NAME}_hocr_pageindex.json.gz`]: gzipSync(Buffer.from(JSON.stringify(INDEX))),
    [`${NAME}_page_numbers.json`]: Buffer.from(JSON.stringify({ 'format-version': '2', pages: (pageNumbers || []).map((n, i) => ({ leafNum: i, pageNumber: n })) })),
    [`${NAME}_djvu.xml`]: Buffer.from('<?xml version="1.0"?><DjVuXML><BODY>'
      + '<OBJECT data="x"><HIDDENTEXT><PAGECOLUMN></PAGECOLUMN></HIDDENTEXT></OBJECT>'
      + '<OBJECT data="x"><HIDDENTEXT><PAGECOLUMN><REGION><PARAGRAPH><LINE><WORD coords="1">كتاب</WORD><WORD coords="2">العلم</WORD></LINE>'
      + '<LINE><WORD>باب</WORD><WORD>فضل</WORD></LINE></PARAGRAPH><PARAGRAPH><LINE><WORD>0&gt;O</WORD></LINE></PARAGRAPH></REGION></PAGECOLUMN></HIDDENTEXT></OBJECT>'
      + '</BODY></DjVuXML>')
  };
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    if (url === 'https://archive.org/metadata/Ihya') {
      return reply(200, { metadata: { title: 'مختصر إحياء علوم الدين' }, server: 'ia800901.us.archive.org', d1: 'ia600901.us.archive.org', d2: 'ia800901.us.archive.org', dir: '/21/items/Ihya', files });
    }
    const name = decodeURIComponent(url.split('/').pop());
    if (url.startsWith('https://archive.org/download/') && primaryDown) {
      throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } });
    }
    if (url.startsWith('https://ia600901.us.archive.org/') && primaryDown) return reply(503, 'busy');
    if (content[name]) return reply(200, content[name]);
    return reply(404, 'no');
  };
  return { fetchFn, calls, src: { kind: 'archive-file', item: 'Ihya', file: `${NAME}_djvu.txt` } };
}

test('search text + page index + printed page numbers → real pages', async () => {
  const { fetchFn, src } = item({});
  const r = await ex.archivePages(fetchFn, src);
  assert.equal(r.method, 'searchtext');
  assert.equal(r.fingerprint, 'md5:abc', 'same fingerprint as the inventory (md5 of the _djvu.txt)');
  assert.equal(r.title, 'مختصر إحياء علوم الدين');
  assert.deepEqual(r.pages.map((p) => p.label), ['', '1', '2']);
  assert.deepEqual(r.pages[0].paras, ['كلمة الناشر', 'الحمد لله الذي فطرنا على حب دينه.']);
  assert.deepEqual(r.pages[1].paras, [P2]);
  assert.deepEqual(r.pages[2].paras, ['ربع العبادات', 'كتاب العلم']);
});

test('page numbers that do not match the page count are not used', async () => {
  const { fetchFn, src } = item({ pageNumbers: ['1', '2'] });
  const r = await ex.archivePages(fetchFn, src);
  assert.equal(r.labels, false);
  assert.deepEqual(r.pages.map((p) => p.label), ['', '', '']);
  assert.equal(ex.pageLabels({ pages: [{ pageNumber: '١٢' }] }, 1)[0], '12', 'Eastern digits become Western');
});

test('a failed download is tried again on the item\'s other storage servers', async () => {
  const { fetchFn, calls, src } = item({ primaryDown: true });
  const r = await ex.archivePages(fetchFn, src);
  assert.equal(r.pages.length, 3);
  const tried = calls.filter((u) => u.includes('searchtext')).map((u) => new URL(u).host);
  assert.deepEqual(tried, ['archive.org', 'ia600901.us.archive.org', 'ia800901.us.archive.org']);
});

test('older scans without helpers are split from _djvu.xml', async () => {
  const { fetchFn, src } = item({ withHelpers: false });
  const r = await ex.archivePages(fetchFn, src);
  assert.equal(r.method, 'djvu.xml');
  assert.deepEqual(r.pages.map((p) => p.paras), [[], ['كتاب العلم باب فضل', '0>O']]);
});

test('every server failing gives one clear error naming each', async () => {
  const { src } = item({});
  const fetchFn = async (url) => (url.includes('/metadata/')
    ? reply(200, { metadata: { title: 't' }, d1: 'a.org', d2: 'b.org', dir: '/1/items/Ihya', files: [{ name: src.file, md5: 'm' }, { name: `${NAME}_hocr_searchtext.txt.gz` }, { name: `${NAME}_hocr_pageindex.json.gz` }] })
    : reply(500, 'x'));
  await assert.rejects(ex.archivePages(fetchFn, src), /not downloaded \(archive\.org: HTTP 500; a\.org: HTTP 500; b\.org: HTTP 500\)/);
});

test('Google translation links are refused with the reason', async () => {
  await assert.rejects(ex.webPages(async () => reply(200, '<p>x</p>'), { fetchUrl: 'https://en-wikipedia-org.translate.goog/wiki/X?_x_tr_tl=ar' }), /translates this page in the browser/);
});

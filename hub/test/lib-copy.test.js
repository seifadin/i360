'use strict';
// Opening our copy of a book in the Reader (S5): catalog lookup, and the
// book text it builds reads back — through the Reader's own parser and
// renderer — as exactly the pages and text of the copy.
const test = require('node:test');
const assert = require('node:assert/strict');
const markedLib = require('marked');
const LibCopy = require('../src/lib-copy.js');
const BookFormat = require('../src/book-format.js');

const STREAM = 'https://archive.org/stream/QuranIntermediateExegesis/التفسير-الوسيط-للقرآن-الكريم_1413هـ_djvu.txt';
const catalog = {
  sources: [
    { key: 'k1', id: 'archive:QuranIntermediateExegesis/التفسير-الوسيط-للقرآن-الكريم_1413هـ_djvu.txt', type: 'djvu-txt',
      url: encodeURI(STREAM), links: [encodeURI(STREAM)], chunks: [0, 2], pageCount: 3 },
    { key: 'k2', id: 'wikimedia:wikipedia:ar:مقادير شرعية', type: 'wikipedia',
      url: 'https://ar.wikipedia.org/wiki/مقادير_شرعية', links: ['https://ar.wikipedia.org/wiki/مقادير_شرعية'], chunks: [0], pageCount: 1 },
    { key: 'k3', id: 'archive:IslamicKB/عقيدة-المسلم_djvu.txt', type: 'djvu-txt', url: 'x', links: ['x'], chunks: [0], pageCount: 1 }
  ]
};

test('a link is found in the catalog however it is written', () => {
  for (const link of [STREAM, encodeURI(STREAM), STREAM.replace('/stream/', '/download/'), STREAM.replace('/stream/', '/details/'), `${STREAM}#page=3`]) {
    assert.equal(LibCopy.findSource(catalog, link).key, 'k1', link);
  }
  assert.equal(LibCopy.findSource(catalog, encodeURI('https://ar.wikipedia.org/wiki/مقادير_شرعية')).key, 'k2');
  assert.equal(LibCopy.findSource(catalog, 'https://archive.org/stream/Other/x_djvu.txt'), null);
  assert.equal(LibCopy.isLibBook('https://lib.i36o.workers.dev/books/a_ocr.md'), true);
  assert.equal(LibCopy.isLibBook(STREAM), false);
  assert.equal(LibCopy.isLibBook('http://lib.i36o.workers.dev/books/a_ocr.md'), false, 'https only');
});

test('our own books: recognised wherever a link names them, and always read from the lib site', () => {
  const LIB_BOOK = (name) => `https://lib.i36o.workers.dev/books/${encodeURIComponent(name)}`;
  const pages = ['https://i36o.web.app/md/index.html?file=x', 'https://i360-e.web.app/md/index.html?file=x', 'https://i360-hub.web.app/md/', 'https://localhost/md/index.html', 'capacitor://localhost/md/index.html', 'file:///home/seif/reader.html'];
  for (const page of pages) {
    assert.equal(LibCopy.ownBook('books/display-test.md', page), LIB_BOOK('display-test.md'), page);
    assert.equal(LibCopy.ownBook('./books/a%20b.md', page), LIB_BOOK('a b.md'), page);
    assert.equal(LibCopy.ownBook('/md/books/x.md', page), LIB_BOOK('x.md'), page);
    assert.equal(LibCopy.ownBook('https://lib.i36o.workers.dev/books/x_ocr.md', page), LIB_BOOK('x_ocr.md'), page);
    assert.equal(LibCopy.ownBook('https://i360-hub.web.app/md/books/x.md', page), LIB_BOOK('x.md'), page);
    assert.equal(LibCopy.ownBook('https://i360-e.web.app/md/books/x.md', page), LIB_BOOK('x.md'), page);
    assert.equal(LibCopy.ownBook('https://i36o.web.app/md/books/x.md', page), LIB_BOOK('x.md'), page);
    assert.equal(LibCopy.ownBook('https://i360-md.web.app/books/x.md', page), LIB_BOOK('x.md'), page);
  }
  // The page's own site, by its full address (the app's built-in server, a local test server).
  assert.equal(LibCopy.ownBook('https://localhost/md/books/x.md', 'https://localhost/md/index.html'), LIB_BOOK('x.md'));
  assert.equal(LibCopy.ownBook('http://127.0.0.1:8080/md/books/x.md', 'http://127.0.0.1:8080/md/index.html'), LIB_BOOK('x.md'));
  // Anything else is not one of our books.
  for (const v of ['http://lib.i36o.workers.dev/books/x.md', 'https://lib.i36o.workers.dev/b/1/catalog.json', 'https://lib.i36o.workers.dev/books/',
    'books/../x.md', 'books/%2e%2e', 'books/a/b.md', 'books/a%2Fb.md', 'books/', 'https://example.com/md/books/x.md', 'https://localhost/md/books/x.md',
    '//example.com/books/x.md', 'javascript:alert(1)', 'data:text/markdown,x', STREAM, '', null]) {
    assert.equal(LibCopy.ownBook(v, 'https://i360-e.web.app/md/index.html'), null, String(v));
  }
});

test('scan links: the BookReader at a position; the book named only in a multi-book item', () => {
  const multi = { sources: [...catalog.sources], unindexed: [{ id: 'archive:IslamicKB/عقيدة-أخرى_djvu.txt' }] };
  assert.equal(LibCopy.itemBooks(multi, catalog.sources[2]), 2, 'an unindexed book of the item counts');
  assert.equal(LibCopy.scanLink(catalog.sources[2], 12, LibCopy.itemBooks(multi, catalog.sources[2])),
    `https://archive.org/details/IslamicKB/${encodeURIComponent('عقيدة-المسلم')}/page/n12/mode/1up`);
  // Seif's check on the real book: Reader position 46 (#n=46) = /page/n45, with no book name.
  assert.equal(LibCopy.itemBooks(catalog, catalog.sources[0]), 1);
  assert.equal(LibCopy.scanLink(catalog.sources[0], 45, 1), 'https://archive.org/details/QuranIntermediateExegesis/page/n45/mode/1up');
  assert.equal(LibCopy.scanLink(catalog.sources[1], 0, 0), null, 'not archive.org');
});

// Rendered HTML → its text, as a reader sees it.
const textOf = (html) => html
  .replace(/<br>/g, '\n').replace(/<\/p>/g, '\n\n').replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/​/g, '');
const norm = (s) => s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();

test('our copy becomes the Reader\'s book: same pages, labels, volumes and text, nothing turned into Markdown', () => {
  const tricky = [
    '# ليس عنوانا', '- ليس قائمة', '1. ليس قائمة مرقمة', '> ليس اقتباسا', '---', '===', '| a | b |', '|---|---|',
    '*ليس مائلا* و **ليس عريضا** و _لا_ و `لا شيفرة`', '[ص 99] ليس علامة صفحة', '[ج 2 ص 5]', '<!-- ليس تعليقا -->',
    '<b>ليس وسما</b> <br> &amp; 5 < 6 > 4', 'رابط [نص](https://example.com/a_b*c) و ![صورة](x.png) و https://archive.org/x_y', '    أربع مسافات', '(1) ليس حاشية',
    'حديث \\ شرطة مائلة', '~~لا شطب~~ ...!'
  ];
  const pages = [
    { label: '', vol: null, paras: [] },
    { label: '12', vol: null, paras: ['بسم الله الرحمن الرحيم', 'سطر أول\nسطر ثان', ...tricky] },
    { label: '13', vol: '2', paras: ['فقرة'] },
    { label: 'iv]', vol: null, paras: ['x'] }
  ];
  const text = LibCopy.toBookText(pages);
  const book = BookFormat.parseBook(text);
  assert.equal(book.format, 'ocr');
  assert.equal(book.pages.length, pages.length, 'one Reader page per page, no extra ones');
  assert.deepEqual(book.pages.map((p) => [p.label, p.vol]), [['-', null], ['12', null], ['13', '2'], ['iv', null]]);
  const render = BookFormat.createRenderer(markedLib);
  book.pages.forEach((p, i) => {
    const { body, notes } = BookFormat.splitFootnotes(p.md);
    assert.equal(notes.length, 0, `page ${i}: no footnotes made up`);
    const html = render.block('ocr', body);
    assert.doesNotMatch(html, /<(h\d|ul|ol|li|blockquote|em|strong|code|pre|table|del|hr|img)\b/, `page ${i}: no Markdown`);
    assert.equal(norm(textOf(html)), norm(pages[i].paras.join('\n\n')), `page ${i}: text as in the copy`);
    assert.doesNotMatch(html, /href="[^"]*\\/, `page ${i}: web addresses keep their exact address`);
  });
});

test('open(): reads the catalog and the chunks from lib, or says the link is not there', async () => {
  const files = {
    'latest.json': { buildId: 'b1' },
    'b/b1/catalog.json': catalog,
    'b/b1/text/k1/0.json': { pages: [{ label: '1', vol: null, paras: ['أ'] }, { label: '2', vol: null, paras: ['ب'] }] },
    'b/b1/text/k1/1.json': { pages: [{ label: '3', vol: null, paras: ['ج'] }] }
  };
  const asked = [];
  const fetchFn = async (url) => {
    const path = url.slice(LibCopy.LIB.length);
    asked.push(path);
    return files[path] ? { ok: true, json: async () => files[path] } : { ok: false, status: 404 };
  };
  const progress = [];
  const got = await LibCopy.open(STREAM, fetchFn, (d, t) => progress.push(`${d}/${t}`));
  assert.equal(got.source.key, 'k1');
  assert.equal(got.books, 1);
  assert.deepEqual(BookFormat.parseBook(got.text).pages.map((p) => p.label), ['1', '2', '3']);
  assert.equal(got.text, LibCopy.toBookText([...files['b/b1/text/k1/0.json'].pages, ...files['b/b1/text/k1/1.json'].pages]),
    'built chunk by chunk, the text is exactly the text of all pages at once');
  assert.deepEqual(progress, ['0/2', '1/2', '2/2']);
  assert.equal(await LibCopy.open('https://example.com/book.md', fetchFn), null);
  await assert.rejects(LibCopy.open(STREAM, async () => ({ ok: false, status: 503 })), /503/);
});

test('split part by part as they arrive, a book has exactly the pages of the whole text (the Reader relies on it)', async () => {
  // Hard cases at the joins: empty pages, a footnote, volumes, Arabic-Indic digits, "?" and "-" labels,
  // a marker-like line inside the text, a page with no number.
  const P = (label, vol, paras) => ({ label, vol, paras });
  const chunks = [
    [P('1', null, ['أول']), P('2', null, []), P('3', null, ['نص\n\n__________\n(١) حاشية', 'فقرة'])],
    [P('٤', '2', ['جزء ثان']), P('?', '2', ['']), P('-', null, ['[ص 9] ليس علامة'])],
    [P('10', '3', ['أ\nب', 'ج']), P('', null, ['فارغ الرقم'])],
    [P('11', null, [])],
    Array.from({ length: 40 }, (_, i) => P(String(12 + i), '4', [`صفحة ${i}`, 'فقرة ثانية']))
  ];
  const cat = { sources: [{ key: 'kp', id: 'archive:Parts/parts_djvu.txt', type: 'djvu-txt', url: 'https://archive.org/stream/Parts/parts_djvu.txt',
    links: ['https://archive.org/stream/Parts/parts_djvu.txt'], chunks: chunks.map((_, i) => i), pageCount: 49 }] };
  const files = { 'latest.json': { buildId: 'b1' }, 'b/b1/catalog.json': cat };
  chunks.forEach((pages, i) => { files[`b/b1/text/kp/${i}.json`] = { pages }; });
  // Parts arrive in a shuffled order, as with parallel downloads.
  const order = [3, 0, 4, 2, 1];
  const fetchFn = async (url) => {
    const path = decodeURIComponent(url.slice(LibCopy.LIB.length));
    const i = order.indexOf(Number((/text\/kp\/(\d+)\.json$/.exec(path) || [])[1]));
    if (i >= 0) await new Promise((r) => setTimeout(r, i * 3));
    return files[path] ? { ok: true, json: async () => files[path] } : { ok: false, status: 404 };
  };
  const parts = [];
  const got = await LibCopy.open('https://archive.org/stream/Parts/parts_djvu.txt', fetchFn, null, (c, text) => { parts[c] = BookFormat.parseBook(text); });
  assert.equal(parts.length, chunks.length);
  const whole = BookFormat.parseBook(got.text);
  assert.deepEqual({ format: 'ocr', pages: parts.flatMap((p) => p.pages) }, whole);
  assert.ok(parts.every((p) => p.format === 'ocr'));
});


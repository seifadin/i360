// Tests for src/book-format.js in Node, as the CSE indexer will use it.
// The Reader's use of the same file is checked side by side in a browser.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const marked = require('marked');
const BF = require('../src/book-format.js');

test('OCR export: page markers, volumes, front matter, untranscribed pages', () => {
  const book = '\uFEFFعنوان قبل الصفحات\n[ص 1]\nنص\n[ص -]\nبلا رقم\n[ص ?]\n<!-- لم تُنسخ -->\n[ج ٢ ص ١٢]\nجزء ثان\n';
  const r = BF.parseBook(book);
  assert.equal(r.format, 'ocr');
  assert.deepEqual(r.pages.map((p) => [p.kind, p.vol, p.label, p.num]), [
    ['front', null, '', null],
    ['page', null, '1', 1],
    ['page', null, '-', null],
    ['untranscribed', null, '?', null],
    ['page', '2', '12', 12]
  ]);
  assert.equal(r.pages[1].md.trim(), 'نص');
});

test('older ==Start pN== format is sorted by page; plain Markdown is one page', () => {
  const legacy = BF.parseBook('==Start p2==\nب\n==End p2==\n==Start p1==\nأ\n==End p1==');
  assert.equal(legacy.format, 'legacy');
  assert.deepEqual(legacy.pages.map((p) => p.num), [1, 2]);
  const plain = BF.parseBook('# عنوان\r\nنص');
  assert.equal(plain.format, 'plain');
  assert.equal(plain.pages.length, 1);
  assert.equal(plain.pages[0].md, '# عنوان\nنص');
});

test('footnotes: below the last ---, numbers as printed, joined notes split again', () => {
  const page = 'متن كلمة(1) وأخرى(2)\n\n---\n(١) الحاشية الأولى (2) الثانية\nتكملة الثانية\n<!-- ترويسة -->';
  const { body, notes } = BF.splitFootnotes(page);
  assert.equal(body.trim(), 'متن كلمة(1) وأخرى(2)');
  assert.deepEqual(notes, [{ n: '1', md: 'الحاشية الأولى' }, { n: '2', md: 'الثانية تكملة الثانية' }]);
  // a --- with no note after it is a separator, not footnotes
  assert.deepEqual(BF.splitFootnotes('أ\n\n---\nليس حاشية').notes, []);
});

test('rendering: comments hidden, no live HTML or links, <br> kept, OCR line breaks', () => {
  const r = BF.createRenderer(marked);
  const html = r.block('ocr', 'سطر أول\nسطر ثان <!-- مخفي --> <b>x</b> [القيامة: 22](5) https://a.org');
  assert.match(html, /سطر أول<br>سطر ثان/);
  assert.ok(!html.includes('مخفي'));
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'), 'raw HTML shown as text');
  assert.ok(html.includes('[القيامة: 22](5)'), 'not turned into a link');
  assert.match(html, /<a href="https:\/\/a\.org" target="_blank" rel="noopener noreferrer">/);
  assert.match(r.block('ocr', '| أ |\n|---|\n| ب<br>ج |'), /ب<br>ج/);
  // standard Markdown: a single line break is a space
  assert.ok(!r.block('plain', 'أ\nب').includes('<br>'));
  // a --- right under text stays a separator, never a heading
  assert.ok(!/<h2>/.test(r.block('ocr', 'نص\n---')));
});

test('digits', () => {
  assert.equal(BF.toWestern('ص ١٢ و ۳۴'), 'ص 12 و 34');
  assert.equal(BF.escapeHtml('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
});

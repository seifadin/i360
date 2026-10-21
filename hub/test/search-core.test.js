// Fixed cases for src/search-core.js — run with `npm test`.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const SC = require('../src/search-core.js');

// A page from paragraphs; within a paragraph, '\n' is a printed line break.
function page(paragraphs, exact = false) {
  const b = SC.createPage(exact);
  for (const para of paragraphs) {
    b.paragraph();
    para.split('\n').forEach((line, i) => { if (i > 0) b.lineBreak(); b.text(line, null); });
  }
  return b.page;
}
const count = (paragraphs, query, { exact = false, word = false } = {}) =>
  SC.findMatches([page(paragraphs, exact)], SC.normalizeQuery(query, exact), { word }).length;

test('diacritics, tatweel and Quranic marks are ignored by default', () => {
  assert.equal(count(['بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ'], 'بسم الله الرحمن'), 1);
  assert.equal(count(['العلـــم نور'], 'العلم'), 1);
  assert.equal(count(['ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَۛ فِيهِۛ'], 'لا ريب فيه'), 1);
});

test('letter forms fold together by default', () => {
  assert.equal(count(['أحمد إمام آمن ٱلله'], 'احمد امام امن الله'), 1);
  assert.equal(count(['على مسألة ومسئول'], 'علي'), 1);
  assert.equal(count(['رحمة'], 'رحمه'), 1);
  assert.equal(count(['مؤمن'], 'مومن'), 1);
  assert.equal(count(['مسئول'], 'مسيول'), 1);
  assert.equal(count(['کتاب فارسی'], 'كتاب فارسي'), 1);
});

test('Eastern and Persian digits match Western digits', () => {
  assert.equal(count(['سنة ١٤٣٣ هـ'], '1433'), 1);
  assert.equal(count(['صفحة ۲۵'], '25'), 1);
  assert.equal(count(['page 45'], '٤٥'), 1);
});

test('exact mode: diacritics and letter forms must match', () => {
  const p = ['كَتَبَ كتب أحمد'];
  assert.equal(count(p, 'كتب', { exact: true }), 1);
  assert.equal(count(p, 'كَتَبَ', { exact: true }), 1);
  assert.equal(count(p, 'احمد', { exact: true }), 0);
  assert.equal(count(['العلـــم'], 'العلم', { exact: true }), 1, 'tatweel is still skipped');
});

test('whole word', () => {
  const p = ['العلم والعلماء علم'];
  assert.equal(count(p, 'علم'), 3);
  assert.equal(count(p, 'علم', { word: true }), 1);
});

test('matches never cross paragraphs; a printed line break counts as a space', () => {
  assert.equal(count(['أمين', 'الفتوى'], 'أمين الفتوى'), 0);
  assert.equal(count(['أمين\nالفتوى'], 'أمين الفتوى'), 1);
});

test('spaces collapse, Latin is case-insensitive, query is trimmed', () => {
  assert.equal(count(['قال    رسول   الله'], '  قال رسول  الله '), 1);
  assert.equal(count(['ISBN 978'], 'isbn'), 1);
});

test('matches do not overlap and max caps the count', () => {
  const p = page(['ااااا']);
  assert.equal(SC.findMatches([p], 'اا', {}).length, 2);
  assert.equal(SC.findMatches([p], 'اا', { max: 1 }).length, 1);
  assert.equal(SC.findMatches([p], '', {}).length, 0);
});

test('positions map back to the original text', () => {
  const p = page(['قَالَ رَسُولُ ٱللَّهِ']);
  const [m] = SC.findMatches([p], SC.normalizeQuery('رسول', false), {});
  const a = p.nodeStart[p.oNode[m.s]] + p.oOff[m.s];
  assert.equal(p.orig.slice(a, a + 1), 'ر');
  const sn = SC.snippet(m, 45);
  assert.equal(sn.hit, 'رَسُول', 'the hit stops at its last letter; the highlight extends over its marks');
  assert.equal(SC.isDropChar('ُ'), true);
  assert.equal(sn.before, 'قَالَ ');
});

test('snippets are trimmed with an ellipsis', () => {
  const long = 'أ'.repeat(60) + ' الهدف ' + 'ب'.repeat(60);
  const [m] = SC.findMatches([page([long])], SC.normalizeQuery('الهدف', false), {});
  const sn = SC.snippet(m, 10);
  assert.ok(sn.before.startsWith('…') && sn.after.endsWith('…'));
  assert.equal(sn.hit, 'الهدف');
});

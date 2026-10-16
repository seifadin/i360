'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const CseView = require('../src/cse-view.js');
const CseIndex = require('../src/cse-index.js');

const catalog = {
  sources: [
    { key: 'a', id: 'archive:IslamicKB/عقيدة-المسلم_djvu.txt', url: 'https://archive.org/stream/IslamicKB/x_djvu.txt', type: 'djvu-txt', title: '+العقيدة الإسلامية (السنية)', pageCount: 900, firstPage: 0, chunks: [0] },
    { key: 'b', id: 'archive:IslamicKB/04_موسوعة_الحضارة_djvu.txt', url: 'https://archive.org/stream/IslamicKB/y_djvu.txt', type: 'djvu-txt', title: '+العقيدة الإسلامية (السنية)', pageCount: 50, firstPage: 900, chunks: [0] },
    { key: 'c', id: 'archive:single/book_djvu.txt', url: 'https://archive.org/stream/single/book_djvu.txt', type: 'djvu-txt', title: 'كتاب واحد', pageCount: 10, firstPage: 950, chunks: [0] },
    { key: 'd', id: 'wikimedia:wikipedia:ar:مقادير شرعية', url: 'https://ar.wikipedia.org/wiki/مقادير_شرعية', type: 'wikipedia', title: 'مقادير شرعية', pageCount: 1, firstPage: 960, chunks: [0] },
    { key: 'e', id: 'url:https://lib.i36o.workers.dev/books/x_ocr.md', url: 'https://lib.i36o.workers.dev/books/x_ocr.md', type: 'md-ocr', title: null, pageCount: 30, firstPage: 961, chunks: [0] }
  ],
  unindexed: [{ id: 'archive:single/other_djvu.txt' }]
};
const counts = CseView.itemFileCounts(catalog);
const S = (k) => catalog.sources.find((s) => s.key === k);

test('item file counts include unindexed files', () => {
  assert.equal(counts.get('IslamicKB'), 2);
  assert.equal(counts.get('single'), 2);
});

test('source names: «item» \\ «file» only when the item has several files', () => {
  assert.deepEqual(CseView.sourceName(S('a'), counts), { title: '+العقيدة الإسلامية (السنية)', file: 'عقيدة المسلم' });
  assert.deepEqual(CseView.sourceName(S('b'), counts), { title: '+العقيدة الإسلامية (السنية)', file: '04 موسوعة الحضارة' });
  assert.deepEqual(CseView.sourceName(S('d'), counts), { title: 'مقادير شرعية', file: null });
  assert.deepEqual(CseView.sourceName(S('e'), counts), { title: 'lib.i36o.workers.dev/books/x_ocr.md', file: null });
  const lone = new Map([['single', 1]]);
  assert.deepEqual(CseView.sourceName(S('c'), lone), { title: 'كتاب واحد', file: null });
});

test('page labels: printed, volume, position, one-page source', () => {
  assert.equal(CseView.pageLabel({ source: S('a'), local: 803, label: '804', vol: null }), 'ص 804');
  assert.equal(CseView.pageLabel({ source: S('a'), local: 803, label: '804', vol: '2' }), 'ج 2 ص 804');
  assert.equal(CseView.pageLabel({ source: S('a'), local: 803, label: '', vol: null }), 'ص (804)');
  assert.equal(CseView.pageLabel({ source: S('a'), local: 0, label: '-', vol: null }), 'ص (1)');
  assert.equal(CseView.pageLabel({ source: S('d'), local: 0, label: '', vol: null }), '');
});

test('result links', () => {
  assert.equal(CseView.resultLink({ source: S('a'), local: 12, label: '' }, 'قواعد الفقه'),
    `https://archive.org/details/IslamicKB/${encodeURIComponent('عقيدة-المسلم')}/page/n12/mode/1up?q=${encodeURIComponent('قواعد الفقه')}`);
  assert.equal(CseView.resultLink({ source: S('d'), local: 0, label: '' }, 'x', 'وزن-الدرهم, الشرعي'),
    `https://ar.wikipedia.org/wiki/مقادير_شرعية#:~:text=${encodeURIComponent('وزن')}%2D${encodeURIComponent('الدرهم')}%2C${encodeURIComponent(' الشرعي')}`);
  assert.equal(CseView.resultLink({ source: S('e'), local: 4, label: '17', vol: '2' }, 'x'),
    `https://i360-md.web.app/?file=${encodeURIComponent(S('e').url)}#p=2%3A17`);
  assert.equal(CseView.resultLink({ source: S('e'), local: 4, label: '' }, 'x'),
    `https://i360-md.web.app/?file=${encodeURIComponent(S('e').url)}#n=5`);
  assert.equal(CseView.resultLink({ source: { ...S('d'), type: 'pdf', url: 'https://x.org/a.pdf' }, local: 6, label: '' }, 'x'), 'https://x.org/a.pdf#page=7');
});

test('address: shared search, ?data only on this computer', () => {
  const data = encodeURIComponent('http://localhost:8788');
  assert.deepEqual(CseView.readAddress(`?q=abc&exact=1&data=${data}`, 'localhost'), { q: 'abc', exact: true, word: false, data: 'http://localhost:8788/' });
  assert.equal(CseView.readAddress(`?q=abc&data=${data}`, 'i360-cse.web.app').data, null);
  assert.equal(CseView.readAddress('?data=javascript:alert(1)', 'localhost').data, null);
  assert.equal(CseView.writeAddress({ q: 'ab c', exact: true, word: true }), '?q=ab+c&exact=1&word=1');
  assert.equal(CseView.writeAddress({ q: '', exact: true, word: true }), '');
});

test('candidate groups follow the app order (IDs as numbers: 2.10 before 2.2); a source in two groups is listed in both', () => {
  const cat = {
    sources: [
      { key: 's1', id: '1', firstPage: 0, pageCount: 3, chunks: [0], usedBy: [{ majorId: '10', major: 'ثقافة', intermediateId: '10.3', intermediate: 'سياسة' }] },
      { key: 's2', id: '2', firstPage: 3, pageCount: 2, chunks: [0], usedBy: [
        { majorId: '2', major: 'الفقه', intermediateId: '2.10', intermediate: 'ب' },
        { majorId: '2', major: 'الفقه', intermediateId: '2.2', intermediate: 'أ' }] }
    ]
  };
  const searcher = CseIndex.createSearcher(cat, () => { throw new Error('no loading here'); });
  const g = CseView.candidateGroups(searcher, [0, 2, 3, 4]);
  assert.deepEqual(g.map((M) => M.major), ['الفقه', 'ثقافة']);
  assert.deepEqual(g[0].intermediates.map((I) => [I.name, I.gps]), [['ب', [3, 4]], ['أ', [3, 4]]]);
  assert.deepEqual(g[1].intermediates[0].gps, [0, 2]);
});

/* i360 CSE view — what the CSE page shows for a result: the source's name,
   the page label, the link to open, and the groups to list. No screen code
   here, so it can be tested in Node; the page inlines it after SearchCore
   and CseIndex. Works as a plain <script> (window.CseView) and as a Node
   module (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./cse-index.js'));
  else root.CseView = factory(root.CseIndex);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (CseIndex) {
  'use strict';

  const LIB_HOST = 'lib.i36o.workers.dev';
  const READER = 'https://i360-md.web.app/';
  const RESULTS_PER_STEP = 20;

  /* ---------------- Sources ---------------- */

  // "archive:<item>/<file>" → { item, file }; null for other sources.
  function archiveParts(id) {
    if (!id || !id.startsWith('archive:')) return null;
    const rest = id.slice('archive:'.length);
    const slash = rest.indexOf('/');
    if (slash < 0) return { item: rest, file: '' };
    return { item: rest.slice(0, slash), file: rest.slice(slash + 1) };
  }

  // How many files of each archive.org item are linked in Baserow
  // (indexed or not), so a lone file shows its title only.
  function itemFileCounts(catalog) {
    const counts = new Map();
    const ids = [...catalog.sources.map((s) => s.id), ...(catalog.unindexed || []).map((u) => u.id)];
    for (const id of new Set(ids)) {
      const a = archiveParts(id);
      if (a) counts.set(a.item, (counts.get(a.item) || 0) + 1);
    }
    return counts;
  }

  // A file name as a reader would write it: no "_djvu.txt" or extension,
  // "_" and "-" as spaces.
  function cleanFileName(file) {
    return file
      .replace(/_djvu\.txt$/i, '')
      .replace(/\.(pdf|txt|md|markdown|html?|epub|djvu)$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // { title, file }: file is set only when the item has more than one file.
  function sourceName(source, counts) {
    const a = archiveParts(source.id);
    if (a) {
      const title = source.title || a.item;
      const file = (counts.get(a.item) || 0) > 1 && a.file ? cleanFileName(a.file) : null;
      return { title, file: file && file !== title ? file : null };
    }
    if (source.title) return { title: source.title, file: null };
    try {
      const u = new URL(source.url);
      return { title: decodeURIComponent(u.hostname + u.pathname).replace(/\/$/, ''), file: null };
    } catch { return { title: source.url, file: null }; }
  }

  /* ---------------- Pages ---------------- */

  const isLabel = (l) => l != null && l !== '' && l !== '-' && l !== '?';

  // "ص 804" (printed page), "ج 2 ص 804", "ص (804)" (position in the file,
  // as the Reader shows it), or '' for a one-page source.
  function pageLabel(hit) {
    if (isLabel(hit.label)) return hit.vol ? `ج ${hit.vol} ص ${hit.label}` : `ص ${hit.label}`;
    return hit.source.pageCount > 1 ? `ص (${hit.local + 1})` : '';
  }

  // Characters a text fragment (#:~:text=) needs escaped.
  const fragment = (s) => encodeURIComponent(s).replace(/-/g, '%2D').replace(/,/g, '%2C');

  // Where a result opens. hitText: the matched text as written on the page.
  function resultLink(hit, query, hitText) {
    const s = hit.source;
    const a = archiveParts(s.id);
    if (a && s.type === 'djvu-txt') {
      // The BookReader at that page, with the term highlighted. The file
      // part picks the book inside an item that holds several.
      const sub = a.file.replace(/_djvu\.txt$/i, '');
      const parts = ['https://archive.org/details', encodeURIComponent(a.item)];
      if (sub) parts.push(encodeURIComponent(sub));
      return `${parts.join('/')}/page/n${hit.local}/mode/1up?q=${encodeURIComponent(query)}`;
    }
    let u;
    try { u = new URL(s.url); } catch { return s.url; }
    if (u.hostname === LIB_HOST && u.pathname.startsWith('/books/')) {
      // Our own book: the Reader at that page.
      const at = isLabel(hit.label) ? `#p=${encodeURIComponent(hit.vol ? `${hit.vol}:${hit.label}` : hit.label)}` : `#n=${hit.local + 1}`;
      return `${READER}?file=${encodeURIComponent(s.url)}${at}`;
    }
    if (s.type === 'pdf') return `${s.url.split('#')[0]}#page=${hit.local + 1}`;
    if (hitText && hitText.trim()) return `${s.url.split('#')[0]}#:~:text=${fragment(hitText.trim())}`;
    return s.url;
  }

  /* ---------------- Groups ----------------
     The candidate pages, grouped as results are (ScienceMajor_Ar →
     ScienceIntermediate_Ar, in the app's order). Each intermediate group
     lists its candidate pages in order, source by source; the page confirms
     them a step at a time. */
  function candidateGroups(searcher, gps) {
    const cands = gps.map((gp) => ({ gp, ...searcher.locate(gp) }));
    return CseIndex.groupResults(cands).map((M) => ({
      major: M.major,
      intermediates: M.intermediates.map((I) => ({
        name: I.intermediate || M.major,
        gps: I.sources.flatMap((S) => S.pages.map((p) => p.gp))
      }))
    }));
  }

  /* ---------------- Address ----------------
     ?q=…&exact=1&word=1 — a search that can be shared. ?data=… (another
     data address) is honoured only when the page runs on this computer. */
  function readAddress(search, hostname) {
    const p = new URLSearchParams(search);
    const local = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    let data = null;
    if (local && p.get('data')) {
      try {
        const u = new URL(p.get('data'));
        if (u.protocol === 'http:' || u.protocol === 'https:') data = u.href.replace(/\/?$/, '/');
      } catch { data = null; }
    }
    return { q: p.get('q') || '', exact: p.get('exact') === '1', word: p.get('word') === '1', data };
  }

  function writeAddress({ q, exact, word, data }) {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (q && exact) p.set('exact', '1');
    if (q && word) p.set('word', '1');
    if (data) p.set('data', data);
    const s = p.toString();
    return s ? `?${s}` : '';
  }

  return {
    LIB_HOST, READER, RESULTS_PER_STEP,
    archiveParts, itemFileCounts, cleanFileName, sourceName,
    pageLabel, resultLink, candidateGroups, readAddress, writeAddress
  };
}));

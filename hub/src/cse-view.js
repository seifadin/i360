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
  const READER = 'https://i360-hub.web.app/md/';
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

  // The Reader at a page of a book, by its link (our copy is found from
  // it): #p=<printed page> ("vol:page" in a multi-volume book), or #n=<position>.
  function readerLink(link, hit) {
    const at = isLabel(hit.label) ? `#p=${encodeURIComponent(hit.vol ? `${hit.vol}:${hit.label}` : hit.label)}` : `#n=${hit.local + 1}`;
    return `${READER}?file=${encodeURIComponent(link)}${at}`;
  }

  // Where a result opens. hitText: the matched text as written on the page.
  // archive.org books and our own books: the Reader at that page (S5; the
  // scan stays one tap away there). Articles: the original, at the match.
  function resultLink(hit, query, hitText) {
    const s = hit.source;
    const a = archiveParts(s.id);
    if (a && s.type === 'djvu-txt') return readerLink((s.links && s.links[0]) || s.url, hit);
    let u;
    try { u = new URL(s.url); } catch { return s.url; }
    if (u.hostname === LIB_HOST && u.pathname.startsWith('/books/')) return readerLink(s.url, hit);
    if (s.type === 'pdf') return `${s.url.split('#')[0]}#page=${hit.local + 1}`;
    if (hitText && hitText.trim()) return `${s.url.split('#')[0]}#:~:text=${fragment(hitText.trim())}`;
    return s.url;
  }

  /* ---------------- Groups ----------------
     The candidate pages, grouped as the app groups sciences: majors in ID
     order; inside a major, its units — one per ScienceIntermediate_Ar, plus
     one "direct" unit (name null) for rows without an intermediate — in ID
     order (an intermediate by its ID, the direct unit by its first minor's
     ID; IDs compared as numbers, as groupSciences() does). Each unit lists
     its candidate pages in order, source by source; the page confirms them
     a step at a time. A source used by several rows shows under each. */
  const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? Infinity : Number(v));

  function candidateGroups(searcher, gps) {
    const majors = new Map();
    for (const gp of gps) {
      const { source } = searcher.locate(gp);
      const rows = source.usedBy && source.usedBy.length ? source.usedBy : [{}];
      const seen = new Set();
      for (const u of rows) {
        const mk = u.majorId || '';
        const ik = u.intermediateId || '';
        if (!majors.has(mk)) majors.set(mk, { majorId: u.majorId, major: u.major || '—', units: new Map() });
        const M = majors.get(mk);
        if (!M.units.has(ik)) {
          M.units.set(ik, ik
            ? { name: u.intermediate || M.major, order: num(ik), gps: [] }
            : { name: null, order: Infinity, gps: [] });
        }
        const U = M.units.get(ik);
        if (!ik) U.order = Math.min(U.order, num(u.minorId));
        if (seen.has(ik)) continue;   // the same unit twice for one page: list it once
        seen.add(ik);
        U.gps.push(gp);
      }
    }
    return [...majors.values()].sort((a, b) => num(a.majorId) - num(b.majorId)).map((M) => ({
      major: M.major,
      units: [...M.units.values()].sort((a, b) => a.order - b.order).map(({ name, gps: list }) => ({ name, gps: list }))
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

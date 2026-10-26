/* i360 lib copy — opens a book from the lib site (lib.i36o.workers.dev)
   in the Reader: finds a link (archive.org, Wikipedia, …) in the CSE's
   catalog and turns our page-split copy of it into the Reader's own book
   format, so it opens with real pages and printed page numbers, without
   asking the original site (which often refuses cross-site reads or sends a
   viewer page instead of the text). Also the link to a page's scan on
   archive.org. No page code here. Works as a plain <script>
   (window.LibCopy) and as a Node module (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LibCopy = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LIB = 'https://lib.i36o.workers.dev/';
  const LIB_HOST = 'lib.i36o.workers.dev';
  const PARALLEL = 6;   // text chunks downloaded at once

  const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

  // "archive:<item>/<file>" for an archive.org file link (/stream/,
  // /download/ or /details/), else null.
  function archiveId(link) {
    let u;
    try { u = new URL(link); } catch { return null; }
    if (!/(^|\.)archive\.org$/i.test(u.hostname)) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 3 || !['stream', 'download', 'details'].includes(parts[0])) return null;
    return `archive:${safeDecode(parts[1])}/${parts.slice(2).map(safeDecode).join('/')}`;
  }

  // A link as compared: decoded, no fragment, no trailing slash.
  function sameLink(link) {
    try {
      const u = new URL(link);
      u.hash = '';
      return safeDecode(u.href).replace(/\/$/, '');
    } catch { return String(link); }
  }

  // The catalog source for a link, or null.
  function findSource(catalog, link) {
    const id = archiveId(link);
    const want = sameLink(link);
    for (const s of catalog.sources) {
      if (id && s.id === id) return s;
      if ([s.url, ...(s.links || [])].some((l) => l && sameLink(l) === want)) return s;
    }
    return null;
  }

  // Our own books on the lib site are real book files: the Reader fetches them as they are.
  function isLibBook(link) {
    try { const u = new URL(link); return u.protocol === 'https:' && u.hostname === LIB_HOST && u.pathname.startsWith('/books/'); } catch { return false; }
  }

  /* ---------------- Which books the Reader opens ----------------
     Only our own books and the books in the CSE's catalog (i360-hub.md §10,
     sprint 5). ownBook() recognises our own books wherever a link names
     them — on the lib site, and at the addresses they had before (the hub's
     /md/books/, the old i360-md.web.app/books/, and "books/<name>" next to
     the Reader page) — and returns the lib site's address for it, or null.
     Everything else is opened only through open(), i.e. only when the
     catalog lists it. */
  const OLD_BOOK_PATHS = { 'i36o.web.app': '/md/books/', 'i360-hub.web.app': '/md/books/', 'i360-e.web.app': '/md/books/', 'i360-md.web.app': '/books/' };

  function bookName(path, prefix) {
    if (!path.startsWith(prefix)) return null;
    const name = safeDecode(path.slice(prefix.length));
    return name && !/[\/\\]/.test(name) && name !== '.' && name !== '..' ? name : null;
  }

  function ownBook(value, pageHref) {
    const text = String(value == null ? '' : value).trim();
    let name = null;
    if (!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(text)) {
      // Relative: "books/<name>" beside the page, or "/md/books/<name>" on the page's own site.
      const rel = text.replace(/^\.\//, '');
      name = rel.startsWith('/') ? bookName(rel, '/md/books/') : bookName(rel, 'books/');
    } else {
      let u;
      try { u = new URL(text); } catch { return null; }
      let page = null;
      try { page = new URL(pageHref); } catch { /* no page address */ }
      if (u.protocol === 'https:' && u.hostname === LIB_HOST) name = bookName(u.pathname, '/books/');
      else if (u.protocol === 'https:' && OLD_BOOK_PATHS[u.hostname]) name = bookName(u.pathname, OLD_BOOK_PATHS[u.hostname]);
      else if (page && /^https?:$/.test(page.protocol) && u.origin === page.origin) name = bookName(u.pathname, '/md/books/');
    }
    return name ? `${LIB}books/${encodeURIComponent(name)}` : null;
  }

  /* ---------------- Our copy → the Reader's book format ----------------
     Each page starts with [ص label] ([ج vol ص label]; [ص -] when it has no
     printed number). Paragraphs are separated by a blank line; a printed
     line break inside one stays a single line break (the Reader's OCR
     format shows it as a line break). OCR text is escaped so it can never
     turn into Markdown (headings, lists, emphasis, tables, footnote
     separators), page markers or hidden comments: it shows exactly as in
     the copy. */
  const MD_PUNCT = /[\\`*_{}()#+\-.!|~<>&=]/g;

  // Bare web addresses stay as they are: the Reader makes them links, and
  // escapes inside one would end up in its address.
  const URL_RE = /(https?:\/\/[^\s<>]+)/;

  function escapeLine(line) {
    let s = line.replace(/^[ \t]+/, '').split(URL_RE)
      .map((part, i) => (i % 2 ? part : part.replace(MD_PUNCT, '\\$&'))).join('');
    // A line starting with "[" could read as a page marker ("[" itself is
    // escaped later by the Reader): an invisible space in front prevents
    // it; search ignores that character.
    if (s.startsWith('[')) s = '​' + s;
    return s;
  }

  function marker(page) {
    const clean = (v) => String(v == null ? '' : v).replace(/[\]\n\r]/g, '').trim();
    const label = clean(page.label) || '-';
    const vol = clean(page.vol);
    return vol ? `[ج ${vol} ص ${label}]` : `[ص ${label}]`;
  }

  function toBookText(pages) {
    return pages.map((p) => {
      const body = (p.paras || [])
        .map((para) => para.split('\n').map(escapeLine).join('\n'))
        .filter((para) => para.trim())
        .join('\n\n');
      return `${marker(p)}\n${body}`;
    }).join('\n\n');
  }

  /* ---------------- The scan on archive.org ---------------- */
  const itemOf = (id) => {
    const rest = id.slice('archive:'.length);
    const slash = rest.indexOf('/');
    return { item: slash < 0 ? rest : rest.slice(0, slash), file: slash < 0 ? '' : rest.slice(slash + 1) };
  };

  // How many books of the source's archive.org item the catalog lists
  // (indexed or not).
  function itemBooks(catalog, source) {
    if (!source || !source.id || !source.id.startsWith('archive:')) return 0;
    const { item } = itemOf(source.id);
    const ids = new Set([...catalog.sources.map((s) => s.id), ...(catalog.unindexed || []).map((u) => u.id)]);
    let n = 0;
    for (const id of ids) if (id.startsWith('archive:') && itemOf(id).item === item) n++;
    return n;
  }

  // The BookReader at a page (position in the file, from 0; checked on a
  // real book: position 45 = /page/n45 in single-page mode). The book's
  // name goes in the address only for an item holding several books: it
  // picks the book there, but stops a single-book item from opening the
  // page (Seif's check, 2026-10-16). books: itemBooks() for the source.
  function scanLink(source, index, books) {
    const id = source && source.id;
    if (!id || !id.startsWith('archive:') || source.type !== 'djvu-txt') return null;
    const { item, file } = itemOf(id);
    const sub = file.replace(/_djvu\.txt$/i, '');
    const parts = ['https://archive.org/details', encodeURIComponent(item)];
    if (sub && books > 1) parts.push(encodeURIComponent(sub));
    return `${parts.join('/')}/page/n${Math.max(0, index | 0)}/mode/1up`;
  }

  /* ---------------- Opening ----------------
     fetchFn: fetch. onProgress(done, total): chunks downloaded. onPart(c, text, total): each
     chunk's text as it arrives, ready to split into pages (the Reader does, so the work is spread
     over the download). Resolves to { source, books, text } for a link in the catalog, or null. */
  async function open(link, fetchFn, onProgress, onPart) {
    const get = async (path) => {
      const res = await fetchFn(LIB + path, path === 'latest.json' ? { cache: 'no-cache' } : {});
      if (!res.ok) throw new Error(`HTTP ${res.status} (${LIB_HOST})`);
      return res.json();
    };
    const { buildId } = await get('latest.json');
    const catalog = await get(`b/${buildId}/catalog.json`);
    const source = findSource(catalog, link);
    if (!source) return null;
    // Each chunk becomes book text as it arrives, so the work is spread over the download
    // instead of one long step at the end (the same text as toBookText of all pages).
    const texts = new Array(source.chunks.length);
    let next = 0, done = 0;
    if (onProgress) onProgress(0, texts.length);
    await Promise.all(Array.from({ length: Math.min(PARALLEL, texts.length) }, async () => {
      while (next < texts.length) {
        const c = next++;
        texts[c] = toBookText((await get(`b/${buildId}/text/${source.key}/${c}.json`)).pages);
        // Each part as it will sit in the whole text (followed by the blank line that joins it to
        // the next), so splitting it into pages gives exactly the whole book's pages (tested).
        if (onPart && texts[c]) onPart(c, c < texts.length - 1 ? `${texts[c]}\n\n` : texts[c], texts.length);
        done++;
        if (onProgress) onProgress(done, texts.length);
      }
    }));
    return { source, books: itemBooks(catalog, source), text: texts.filter(Boolean).join('\n\n') };
  }

  return { LIB, archiveId, findSource, isLibBook, ownBook, toBookText, itemBooks, scanLink, open };
}));

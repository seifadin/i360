// i360 CSE — turning each kind of source into pages: [{ label, vol, paras }].
// A paragraph is a string; "\n" inside it is a printed line break.
//
// Book files (.md, _ocr.md) are read with src/book-format.js and rendered
// with the Reader's own Markdown rules, then cut into paragraphs the way the
// Reader's search does (one paragraph per text block, <br> as a line break),
// so the index holds exactly the text the Reader shows.
'use strict';
const marked = require('marked');
const BookFormat = require('../src/book-format.js');

const renderer = BookFormat.createRenderer(marked);

/* ---------------- HTML → paragraphs (no DOM in Node) ---------------- */

// The Reader's text blocks (BLOCK_SEL) plus the usual web-page blocks.
const BLOCKS = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'pre',
  'div', 'blockquote', 'dd', 'dt', 'caption', 'figcaption', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'table', 'tr', 'ul', 'ol', 'dl', 'body']);
const SKIP = new Set(['script', 'style', 'noscript', 'template', 'head', 'svg', 'math', 'button', 'select', 'textarea']);
const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'wbr', 'area', 'base', 'col', 'embed', 'source', 'track', 'param']);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: String.fromCharCode(0xA0), shy: '', zwnj: String.fromCharCode(0x200C), zwj: String.fromCharCode(0x200D), lrm: String.fromCharCode(0x200E), rlm: String.fromCharCode(0x200F), mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»' };

function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(code); } catch { return m; }
    }
    const v = ENTITIES[e.toLowerCase()];
    return v == null ? m : v;
  });
}

// skipClass: elements whose class list contains one of these are left out
// with everything inside them (e.g. Wikipedia's "edit" links).
function htmlToParas(html, { skipClass = [] } = {}) {
  const paras = [];
  const stack = [];        // open elements: { tag, block, id, skip }
  let nextId = 1;
  let cur = null;          // { block id, text }
  const blockId = () => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].block) return stack[i].id;
    return 0;
  };
  const skipping = () => stack.some((e) => e.skip);
  const flush = () => { if (cur && cur.text.trim()) paras.push(cur.text.replace(/[ \t]*\n[ \t]*/g, '\n').trim()); cur = null; };
  const addText = (t) => {
    const id = blockId();
    if (!cur || cur.id !== id) { flush(); cur = { id, text: '' }; }
    cur.text += t;
  };

  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!doctype[^>]*>|<\/?([a-zA-Z][\w:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/gi;
  let last = 0, m;
  while ((m = re.exec(html))) {
    if (m.index > last && !skipping()) {
      // Whitespace in HTML text collapses; line breaks come only from <br>.
      const t = decodeEntities(html.slice(last, m.index).replace(/\s+/g, ' '));
      if (t.trim() || (cur && t)) addText(t);
    }
    last = re.lastIndex;
    const tag = (m[1] || '').toLowerCase();
    if (!tag) continue;                       // comment, doctype
    const closing = m[0][1] === '/';
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    if (tag === 'br') { if (!skipping()) addText('\n'); continue; }
    if (VOID.has(tag) || m[3] === '/') continue;
    const cls = /\bclass\s*=\s*("([^"]*)"|'([^']*)')/i.exec(m[2] || '');
    const classes = cls ? (cls[2] || cls[3] || '').split(/\s+/) : [];
    const el = { tag, block: BLOCKS.has(tag), id: nextId++, skip: SKIP.has(tag) || classes.some((c) => skipClass.includes(c)) };
    stack.push(el);
    if (SKIP.has(tag)) {
      // Raw-text elements: jump to their end tag.
      const end = html.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
      re.lastIndex = end < 0 ? html.length : end;
      last = re.lastIndex;
    }
  }
  if (last < html.length && !skipping()) {
    const t = decodeEntities(html.slice(last).replace(/\s+/g, ' '));
    if (t.trim()) addText(t);
  }
  flush();
  return paras;
}

/* ---------------- Book files (.md, _ocr.md) ---------------- */

// The text the Reader shows for each page: the rendered body, then each
// footnote as "(n)" + its text (the Reader's note block).
function bookPages(raw) {
  const { format, pages } = BookFormat.parseBook(raw);
  return pages.map((p) => {
    const { body, notes } = format === 'plain' ? { body: p.md, notes: [] } : BookFormat.splitFootnotes(p.md);
    const paras = BookFormat.hasVisibleContent(body) ? htmlToParas(renderer.block(format, body)) : [];
    for (const note of notes) {
      const text = htmlToParas(`<div>${renderer.inline(format, note.md)}</div>`).join('\n');
      paras.push((note.n != null ? `(${note.n})` : '') + text);
    }
    return { label: format === 'plain' ? '' : p.label, vol: p.vol, kind: p.kind, paras };
  });
}

/* ---------------- Wikipedia, Wikisource (MediaWiki API) ---------------- */

// The article as one page, from the API's plain-text extract (clean text,
// no navigation boxes or edit links). "== Heading ==" lines lose their
// marks; every line is a paragraph. If a site has no plain-text extract,
// the rendered HTML is used, without edit links, references and the like.
async function wikimediaPages(fetchFn, src) {
  const api = `https://${src.lang}.${src.project}.org/w/api.php?format=json&formatversion=2&redirects=1`;
  const get = async (q) => {
    const res = await fetchFn(`${api}&${q}`, { headers: { 'User-Agent': 'i360-cse-indexer/1.0 (+https://i36o.web.app/)' } });
    if (!res.ok) throw new Error(`${src.project} API HTTP ${res.status}`);
    return res.json();
  };
  const data = await get(`action=query&prop=extracts|info&explaintext=1&titles=${encodeURIComponent(src.title)}`);
  const page = data.query && data.query.pages && data.query.pages[0];
  if (!page || page.missing || page.invalid) throw new Error(`page not found on ${src.project}`);
  const fingerprint = page.lastrevid ? `rev:${page.lastrevid}` : null;
  let paras;
  if (typeof page.extract === 'string' && page.extract.trim()) {
    paras = page.extract.split('\n')
      .map((l) => l.replace(/^=+\s*(.*?)\s*=+$/, '$1').trim())
      .filter(Boolean);
  } else {
    const parsed = await get(`action=parse&prop=text&page=${encodeURIComponent(src.title)}`);
    if (!parsed.parse) throw new Error(`${src.project} API: ${parsed.error ? parsed.error.info : 'no page'}`);
    paras = htmlToParas(parsed.parse.text, { skipClass: ['mw-editsection', 'reference', 'toc', 'mw-references-wrap', 'navbox', 'noprint', 'mw-empty-elt'] });
  }
  return { pages: [{ label: '', vol: null, paras }], fingerprint, title: page.title };
}

/* ---------------- Google-translated Wikipedia links ----------------
   A link like en-wikipedia-org.translate.goog/wiki/Muslim_world?_x_tr_tl=ar
   is a Wikipedia article translated by Google in the browser, so a download
   gets the untranslated text. Instead, Wikipedia's own article in the
   target language (Arabic) is indexed: the source wiki is asked for its
   language link, then that article is read like any Wikipedia page. */

// { lang, project, title, target } for a translated Wikimedia link, else null.
function translatedWiki(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  const m = /^(.+)-(wikipedia|wikisource)-org\.translate\.goog$/i.exec(u.hostname);
  if (!m) return null;
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'wiki' || parts.length < 2) return null;
  return {
    lang: m[1].replace(/--/g, '-').replace(/\.m$/, ''),   // Google writes "-" in a host as "--"
    project: m[2].toLowerCase(),
    title: decodeURIComponent(parts.slice(1).join('/')).replace(/_/g, ' '),
    target: (u.searchParams.get('_x_tr_tl') || 'ar').split('-')[0]
  };
}

async function translatedWikiPages(fetchFn, src) {
  const t = translatedWiki(src.fetchUrl);
  const api = `https://${t.lang}.${t.project}.org/w/api.php?format=json&formatversion=2&redirects=1&action=query&prop=langlinks&lllang=${encodeURIComponent(t.target)}&titles=${encodeURIComponent(t.title)}`;
  const res = await fetchFn(api, { headers: { 'User-Agent': 'i360-cse-indexer/1.0 (+https://i36o.web.app/)' } });
  if (!res.ok) throw new Error(`${t.project} API HTTP ${res.status}`);
  const data = await res.json();
  const page = data.query && data.query.pages && data.query.pages[0];
  if (!page || page.missing || page.invalid) throw new Error(`page not found on ${t.lang}.${t.project}.org`);
  const link = (page.langlinks || []).find((l) => l.lang === t.target);
  if (!link) throw new Error(`«${page.title}» has no ${t.target} version on ${t.project}; not indexed`);
  const got = await wikimediaPages(fetchFn, { lang: t.target, project: t.project, title: link.title });
  // Results link to the article the text comes from; Baserow's link is kept as listed.
  return { ...got, url: `https://${t.target}.${t.project}.org/wiki/${encodeURIComponent(got.title.replace(/ /g, '_'))}` };
}

/* ---------------- archive.org books ----------------
   archive.org keeps, beside each scan's _djvu.txt, the same text as
   _hocr_searchtext.txt.gz (one paragraph per line) with
   _hocr_pageindex.json.gz ([start, end, …] of every page in that text) and
   _page_numbers.json (the printed number of every page). That gives real
   pages with their printed numbers. Older scans without them are split
   into pages from _djvu.xml. Each item is stored on two servers (d1, d2):
   when a download fails, the other copy is tried. */

async function archiveMetadata(fetchFn, item) {
  const res = await fetchFn(`https://archive.org/metadata/${encodeURIComponent(item)}`, {});
  if (!res.ok) throw new Error(`archive.org metadata HTTP ${res.status}`);
  const meta = await res.json();
  if (!meta || !meta.metadata) throw new Error('archive.org item not found');
  return meta;
}

// Downloads one file of an item: archive.org first, then each storage server directly.
async function archiveFile(fetchFn, meta, item, name) {
  const path = name.split('/').map(encodeURIComponent).join('/');
  const urls = [`https://archive.org/download/${encodeURIComponent(item)}/${path}`];
  for (const host of [meta.d1, meta.d2, meta.server]) {
    if (host && meta.dir) {
      const u = `https://${host}${meta.dir}/${path}`;
      if (!urls.includes(u)) urls.push(u);
    }
  }
  const errors = [];
  for (const url of urls) {
    try {
      const res = await fetchFn(url, {});
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      errors.push(`${new URL(url).host}: HTTP ${res.status}`);
    } catch (err) {
      const c = err && err.cause;
      errors.push(`${new URL(url).host}: ${c ? (c.code || c.message) : err.message}`);
    }
  }
  throw new Error(`${name} not downloaded (${errors.join('; ')})`);
}

// Printed page numbers, if the item has them for exactly these pages.
function pageLabels(pageNumbers, count) {
  const list = pageNumbers && Array.isArray(pageNumbers.pages) ? pageNumbers.pages : null;
  if (!list || list.length !== count) return null;
  return list.map((p) => (p && p.pageNumber != null ? BookFormat.toWestern(String(p.pageNumber).trim()) : ''));
}

// _djvu.xml → pages: one per OBJECT, a paragraph per PARAGRAPH, its lines
// joined by spaces (as in _hocr_searchtext).
function djvuXmlPages(xml) {
  const pages = [];
  for (const obj of xml.split(/<OBJECT\b/).slice(1)) {
    const body = obj.slice(0, obj.indexOf('</OBJECT>') >= 0 ? obj.indexOf('</OBJECT>') : obj.length);
    const paras = [];
    for (const par of body.split(/<PARAGRAPH\b/).slice(1)) {
      const lines = [];
      for (const line of par.split(/<LINE\b/).slice(1)) {
        const words = [...line.matchAll(/<WORD\b[^>]*>([\s\S]*?)<\/WORD>/g)].map((m) => decodeEntities(m[1]).trim()).filter(Boolean);
        if (words.length) lines.push(words.join(' '));
      }
      if (lines.length) paras.push(lines.join(' '));
    }
    pages.push(paras);
  }
  return pages;
}

// The change fingerprint of an archive.org file, from the item's metadata
// alone (no request to the storage server, which may be slow or down).
async function archiveFingerprint(fetchFn, src) {
  const meta = await archiveMetadata(fetchFn, src.item);
  const f = (Array.isArray(meta.files) ? meta.files : []).find((x) => x.name === src.file);
  if (!f) throw new Error(`file not in the item: ${src.file}`);
  return f.md5 ? `md5:${f.md5}` : (f.mtime ? `mtime:${f.mtime}` : null);
}

async function archivePages(fetchFn, src) {
  const zlib = require('node:zlib');
  const meta = await archiveMetadata(fetchFn, src.item);
  const files = Array.isArray(meta.files) ? meta.files : [];
  const has = (name) => files.some((f) => f.name === name);
  const main = files.find((f) => f.name === src.file);
  if (!main) throw new Error(`file not in the item: ${src.file}`);
  const base = src.file.replace(/(_djvu\.txt|\.txt)$/i, '');
  const fingerprint = main.md5 ? `md5:${main.md5}` : (main.mtime ? `mtime:${main.mtime}` : null);
  const title = meta.metadata.title ? String(Array.isArray(meta.metadata.title) ? meta.metadata.title[0] : meta.metadata.title) : null;
  const get = (name) => archiveFile(fetchFn, meta, src.item, name);
  const pageNumbers = has(`${base}_page_numbers.json`) ? JSON.parse((await get(`${base}_page_numbers.json`)).toString('utf8')) : null;

  if (has(`${base}_hocr_searchtext.txt.gz`) && has(`${base}_hocr_pageindex.json.gz`)) {
    const text = zlib.gunzipSync(await get(`${base}_hocr_searchtext.txt.gz`)).toString('utf8');
    const index = JSON.parse(zlib.gunzipSync(await get(`${base}_hocr_pageindex.json.gz`)).toString('utf8'));
    const labels = pageLabels(pageNumbers, index.length);
    const pages = index.map((e, i) => ({
      label: labels ? labels[i] : '',
      vol: null,
      paras: text.slice(e[0], e[1]).split('\n').map((l) => l.trim()).filter(Boolean)
    }));
    return { pages, fingerprint, title, method: 'searchtext', labels: !!labels };
  }

  if (has(`${base}_djvu.xml`)) {
    const perPage = djvuXmlPages((await get(`${base}_djvu.xml`)).toString('utf8'));
    const labels = pageLabels(pageNumbers, perPage.length);
    return { pages: perPage.map((paras, i) => ({ label: labels ? labels[i] : '', vol: null, paras })), fingerprint, title, method: 'djvu.xml', labels: !!labels };
  }

  // Last resort: the text as one page, a paragraph per blank-line block.
  const raw = (await get(src.file)).toString('utf8');
  const paras = raw.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  return { pages: [{ label: '', vol: null, paras }], fingerprint, title, method: 'djvu.txt', labels: false };
}

/* ---------------- Any other web page ---------------- */

// Google's translation links (*.translate.goog) are translated in the
// browser by JavaScript: a download gets the untranslated page. Wikipedia
// and Wikisource ones are handled above (translatedWikiPages); others are refused.
const TRANSLATED_IN_BROWSER = /\.translate\.goog$/i;

async function webPages(fetchFn, src) {
  if (TRANSLATED_IN_BROWSER.test(new URL(src.fetchUrl).hostname)) {
    throw new Error('Google translates this page in the browser; a download gets the untranslated text (not indexed until decided)');
  }
  const res = await fetchFn(src.fetchUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; i360-cse-indexer/1.0; +https://i36o.web.app/)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1];
  const body = (/<body[\s\S]*<\/body>/i.exec(html) || [html])[0];
  return { pages: [{ label: '', vol: null, paras: htmlToParas(body) }], title: title ? decodeEntities(title.trim()) : null, fingerprint: res.headers.get('etag') ? `etag:${res.headers.get('etag')}` : null };
}

module.exports = { htmlToParas, decodeEntities, bookPages, wikimediaPages, webPages, archivePages, archiveFingerprint, djvuXmlPages, pageLabels, translatedWiki, translatedWikiPages };

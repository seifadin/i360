// The Reader: from book text to pages — Markdown rendering (src/book-format.js), the integrity
// check, footnotes, text maps, building the pages in slices, and rendering a book.
import * as BookFormat from '../book-format.js';
import * as marked from 'marked';
import * as i360Theme from '../../theme/site/theme-loader.js';
import { oncePerFrame } from '../frame.js';
import { BLOCK_SEL, QURAN_CLOSE, QURAN_OPEN } from './text.js';
import { btnSearchToggle, detectDirection, emptyState, fmtNum, hasVisibleContent, missingPagesBanner, missingPagesText, nextFrame, pagesWrapper, parseBook, progressEl, progressFill, progressText, search, searchInput, searchPopup, setTitle, sidePanel, splitFootnotes, state, storeGet, stripComments, t, viewerContainer } from './state.js';
import { applyBookmarkRibbons, hashTargetIdx, isLinkable, restorePosition, saveNow } from './position.js';
import { updateScanButton } from './library.js';
import { applyLocalization } from './view.js';
import { buildVolumeSelect, scrollToSheet, updateCounter, volumeTotals } from './nav.js';
import { renderPanel } from './panel.js';
import { clearSearch, rerunSearch } from './search.js';

/* ================================================================
   Markdown rendering (safe): the rules live in src/book-format.js,
   shared with the CSE indexer so the index holds exactly the text the
   Reader shows. OCR-format books show single line breaks as printed
   line breaks; other files follow standard Markdown.
   ================================================================ */
const bookRenderer = BookFormat.createRenderer(marked);

function renderBlock(s) { return bookRenderer.block(state.format, s); }
function renderInline(s) { return bookRenderer.inline(state.format, s); }

/* ================================================================
   Parsing the book into pages: parseBook() in src/book-format.js
   ([ص X] · [ص أ] · [ص -] · [ص ?] · [ج 2 ص 12], the older ==Start pN==
   format, plain Markdown).
   ================================================================ */

/* ================================================================
   Integrity check: gaps in the printed numbering, untranscribed pages
   ================================================================ */
function pageLabelText(p, tr) {
  const shown = p.label === '-' ? '—' : (p.label === '?' ? '؟' : p.label);
  const pageTxt = `${tr.page} ${shown}`;
  return fmtNum(p.vol != null ? `${tr.vol} ${p.vol} · ${pageTxt}` : pageTxt);
}

function auditPages(pages) {
  const gaps = [];          // { vol, from, to, count }
  const untranscribed = []; // pages
  let vol, last = null, unnumbered = 0;
  let first = true;

  for (const p of pages) {
    if (p.kind === 'front') continue;
    if (p.kind === 'untranscribed') untranscribed.push(p);
    if (first || p.vol !== vol) { vol = p.vol; last = null; unnumbered = 0; first = false; }
    if (p.num == null) { if (last != null) unnumbered++; continue; }
    if (last != null) {
      if (p.num > last + 1) {
        const count = p.num - last - 1 - unnumbered;
        if (count > 0) gaps.push({ vol, from: last + 1, to: p.num - 1, count });
      }
      // p.num <= last: numbering restarted (or a repeat) — start a new run.
    }
    last = p.num;
    unnumbered = 0;
  }
  return { gaps, untranscribed };
}

function buildNotices(audit) {
  const notices = [];
  if (audit.gaps.length > 0) notices.push({ type: 'gaps', gaps: audit.gaps });
  if (audit.untranscribed.length > 0) notices.push({ type: 'untranscribed', pages: audit.untranscribed });
  return notices;
}

function renderNotices() {
  const tr = t();
  missingPagesText.textContent = '';
  for (const n of state.notices) {
    const line = document.createElement('div');
    if (n.type === 'gaps') {
      const count = n.gaps.reduce((s, g) => s + g.count, 0);
      const ranges = n.gaps.map((g) => {
        const r = g.from === g.to ? `${g.from}` : `${g.from}–${g.to}`;
        return g.vol != null ? `${tr.vol} ${g.vol}: ${r}` : r;
      }).join(tr.listSep);
      line.textContent = tr.missingPagesWarn(count, ranges);
    } else if (n.type === 'untranscribed') {
      line.textContent = tr.untranscribedWarn(n.pages.length, n.pages.map((p) => {
        const i = state.pages.indexOf(p);
        const prev = state.pages[i - 1];
        // "?" alone says little; name the page it follows.
        return prev && prev.label ? tr.after(pageLabelText(prev, tr)) : '؟';
      }).join(tr.listSep));
    } else if (n.type === 'loadError') {
      line.textContent = tr.loadError(n.message);
    } else if (n.type === 'readError') {
      line.textContent = tr.readError;
    } else if (n.type === 'notInLibrary') {
      line.textContent = tr.notInLibrary;
    } else if (n.type === 'unverified') {
      line.textContent = tr.unverified;
    }
    line.textContent = fmtNum(line.textContent);
    missingPagesText.appendChild(line);
  }
  missingPagesBanner.classList.toggle('visible', state.notices.length > 0);
}

/* ================================================================
   Footnotes: splitFootnotes() in src/book-format.js — plain text below
   the page's last "---", numbers as printed.
   ================================================================ */

/* ================================================================
   Text maps: a block's text as one string, with a way back to the
   DOM text nodes. Used to wrap Quran quotations and footnote markers
   even when they cross bold or other inline formatting.
   ================================================================ */
function textMap(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const segs = [];
  let text = '';
  let node;
  while ((node = walker.nextNode())) {
    segs.push({ node, start: text.length });
    text += node.nodeValue;
  }
  return { text, segs };
}

function locate(map, i) {
  // Last segment whose start <= i.
  let lo = 0, hi = map.segs.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (map.segs[mid].start <= i) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  const seg = map.segs[ans];
  return { node: seg.node, offset: i - seg.start };
}

function wrapRange(map, start, end, el) {
  const a = locate(map, start);
  const b = locate(map, end - 1);
  if (a.node === b.node) {
    // Common case, done without a live Range: every live Range is updated
    // on each DOM change, which made long books build in quadratic time.
    const mid = a.node.splitText(a.offset);
    mid.splitText(b.offset + 1 - a.offset);
    mid.parentNode.replaceChild(el, mid);
    el.appendChild(mid);
    return el;
  }
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset + 1);
  el.appendChild(range.extractContents());
  range.insertNode(el);
  return el;
}

function leafBlocks(root) {
  return [...root.querySelectorAll(BLOCK_SEL)].filter((el) => !el.querySelector(BLOCK_SEL));
}

// Direction from the first letter that has one (Arabic/Hebrew → rtl, Latin → ltr).
function firstStrongDir(text) {
  const m = /[A-Za-z\u00C0-\u024F\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.exec(text);
  if (!m) return null;
  return /[A-Za-z\u00C0-\u024F]/.test(m[0]) ? 'ltr' : 'rtl';
}

// Leaf blocks get dir="auto": the browser picks each paragraph's direction.
// Containers (lists, list items, quotes) can't use "auto": it skips children
// that carry their own dir, so a list item holding a paragraph fell back to
// LTR and its bullet moved to the wrong side. They get an explicit direction
// from their own text instead. mode: 'auto', or 'rtl'/'ltr' to force one.
function applyBlockDirs(root, mode, fallback) {
  for (const el of leafBlocks(root)) el.setAttribute('dir', mode);
  for (const el of root.querySelectorAll('ul,ol,li,blockquote')) {
    if (el.querySelector(BLOCK_SEL) == null && el.matches(BLOCK_SEL)) continue;  // a leaf <li>
    el.setAttribute('dir', mode === 'auto' ? (firstStrongDir(el.textContent) || fallback) : mode);
  }
  // A table's column order follows its own language (header first): an
  // English table in an Arabic book reads left to right, and vice versa.
  for (const table of root.querySelectorAll('table')) {
    const head = table.tHead ? table.tHead.textContent : '';
    const dir = mode === 'auto'
      ? (firstStrongDir(head) || firstStrongDir(table.textContent) || fallback) : mode;
    table.setAttribute('dir', dir);
    // The scroll box follows too, so a wide table opens at its first column.
    if (table.parentElement && table.parentElement.classList.contains('table-wrap')) {
      table.parentElement.setAttribute('dir', dir);
    }
  }
}

// Show the book's digits in the chosen numerals. Code and real links keep theirs (footnote
// links are converted). Same length: search positions stay valid.
function applyNumerals(root) {
  i360Theme.convertNumerals(root, { skip: 'pre, code, a:not(.fn-ref):not(.fn-back)', numerals: state.numerals });
}

function wrapQuran(root) {
  for (const block of leafBlocks(root)) {
    const map = textMap(block);
    const txt = map.text;
    if (!txt.includes(QURAN_OPEN) && !txt.includes(QURAN_CLOSE)) continue;
    const spans = [];
    let open = null;
    for (let i = 0; i < txt.length; i++) {
      if (txt[i] === QURAN_OPEN && open == null) open = i;
      else if (txt[i] === QURAN_CLOSE) {
        // A closing bracket with no opening one: the quote began on the previous page.
        spans.push([open == null ? 0 : open, i + 1]);
        open = null;
      }
    }
    // An opening bracket with no closing one: the quote continues on the next page.
    if (open != null) spans.push([open, txt.length]);
    for (let k = spans.length - 1; k >= 0; k--) {
      const span = document.createElement('span');
      span.className = 'quran';
      wrapRange(map, spans[k][0], spans[k][1], span);
    }
  }
}

function linkFootnoteRefs(bodyRoot, idx, noteNumbers) {
  if (noteNumbers.size === 0) return;
  const seen = new Set();
  for (const block of leafBlocks(bodyRoot)) {
    const map = textMap(block);
    const re = /\((\d{1,3})\)/g;
    const found = [];
    let m;
    while ((m = re.exec(map.text))) {
      const before = map.text[m.index - 1];
      // A footnote marker is glued to the word: كلمة(5). Verse numbers have a space.
      if (before == null || /\s|\(/.test(before)) continue;
      if (!noteNumbers.has(m[1])) continue;
      const at = locate(map, m.index);
      if (at.node.parentElement && at.node.parentElement.closest('.quran, a')) continue;
      found.push({ start: m.index, end: m.index + m[0].length, n: m[1] });
    }
    for (let k = found.length - 1; k >= 0; k--) {
      const f = found[k];
      const a = document.createElement('a');
      a.className = 'fn-ref';
      a.href = `#fn-${idx}-${f.n}`;
      a.dataset.target = `fn-${idx}-${f.n}`;
      wrapRange(map, f.start, f.end, a);
    }
  }
  // The first marker for each note gets an id, so the note can link back to it.
  for (const a of bodyRoot.querySelectorAll('a.fn-ref')) {
    const n = a.dataset.target;
    if (seen.has(n)) continue;
    seen.add(n);
    a.id = `ref-${n}`;
  }
}

/* ================================================================
   Building the pages
   ================================================================ */
/* Tables, mind maps and figures, as the OCR engine writes them:
   - tables scroll sideways inside the page when they're wider than it;
     a continuation table (empty header row added at export) shows no header;
   - nested lists (mind maps, trees) get guide lines, styled in CSS;
   - a "[شكل]" / "[شكل: caption]" line is shown as a figure label. */
const FIGURE_RE = /^\s*\[\s*شكل\s*(?::[^\]]*)?\]\s*$/;

function enhanceBody(root) {
  for (const table of root.querySelectorAll('table')) {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
    const head = table.tHead;
    if (head && ![...head.querySelectorAll('th')].some((th) => th.textContent.trim())) {
      table.classList.add('no-head');
    }
  }
  for (const el of root.querySelectorAll('p')) {
    if (FIGURE_RE.test(el.textContent)) el.classList.add('figure-label');
  }
  for (const list of root.querySelectorAll('li > ul, li > ol')) {
    list.classList.add('sublist');
  }
}

// An empty page, sized like a printed sheet until fillSheet() gives it its text.
// Its page number shows until its text arrives.
function sheetShell(idx) {
  const sheet = document.createElement('article');
  sheet.className = 'page-sheet';
  sheet.id = `page-${idx}`;
  sheet.dataset.idx = String(idx);
  sheet.dir = state.dir;
  sheet.appendChild(pageFooter(state.pages[idx]));
  return sheet;
}

function pageFooter(p) {
  const footer = document.createElement('footer');
  footer.className = 'page-number-footer';
  if (state.format !== 'plain' && p.kind !== 'front') footer.textContent = pageLabelText(p, t());
  return footer;
}

function fillSheet(sheet, p, idx) {
  const tr = t();
  sheet.dir = state.dir;
  sheet.textContent = '';

  const content = document.createElement('div');
  content.className = 'page-content';

  const { body, notes } = state.format === 'plain' ? { body: p.md, notes: [] } : splitFootnotes(p.md);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'markdown-body';
  if (hasVisibleContent(body)) bodyEl.innerHTML = renderBlock(body);
  enhanceBody(bodyEl);
  content.appendChild(bodyEl);

  if (p.kind === 'untranscribed' && !hasVisibleContent(body)) {
    const ph = document.createElement('div');
    ph.className = 'page-placeholder';
    ph.textContent = tr.untranscribedPage;
    content.appendChild(ph);
  }

  const noteNumbers = new Set();
  if (notes.length > 0) {
    const fnWrap = document.createElement('section');
    fnWrap.className = 'footnotes';
    const list = document.createElement('div');
    list.className = 'footnotes-list';
    for (const note of notes) {
      const div = document.createElement('div');
      div.className = 'fn-note';
      if (note.n != null) {
        div.id = `fn-${idx}-${note.n}`;
        noteNumbers.add(note.n);
        const back = document.createElement('a');
        back.className = 'fn-back';
        back.href = `#ref-fn-${idx}-${note.n}`;
        back.dataset.target = `ref-fn-${idx}-${note.n}`;
        back.textContent = `(${note.n})`;
        div.appendChild(back);
      }
      const text = document.createElement('span');
      text.className = 'fn-text';
      text.innerHTML = renderInline(note.md);
      div.appendChild(text);
      list.appendChild(div);
    }
    fnWrap.appendChild(list);
    content.appendChild(fnWrap);
  }

  // Each paragraph finds its own direction (an ISBN line stays LTR).
  applyBlockDirs(content, 'auto', state.dir);

  wrapQuran(content);
  linkFootnoteRefs(bodyEl, idx, noteNumbers);

  sheet.appendChild(content);

  if (state.format !== 'plain' && p.kind !== 'front') {
    const footer = document.createElement('footer');
    footer.className = 'page-number-footer';
    footer.textContent = pageLabelText(p, tr);
    sheet.appendChild(footer);
  }
  applyNumerals(content);
  return sheet;
}

/* Pages are built a slice at a time (BUILD_SLICE_MS of work, then the page gets a frame),
   so a book of thousands of pages never blocks the screen: taps, ✕, the back button and
   scrolling keep working while «جارٍ عرض ٤٢٪» counts up. Before 2026-10-22 every page
   was built in one go — «التفسير الوسيط» held a phone's screen for minutes. All the pages
   exist from the start as empty sheets showing their page number (state.sheets is always
   complete); the landing page is built first, then outward from it, and whatever is on
   screen jumps the queue. Search waits until every page has its text. A newer book stops
   an unfinished build. */
const BUILD_SLICE_MS = 12;
let buildRun = 0;
// Stops an unfinished build (a newer book, or none, is coming).
function cancelBuild() { buildRun++; }

function isBuilding() { return state.built < state.sheets.length; }

// Build order: the page the reader lands on first, then outward in blocks of 10 — the 10
// before it (nearest first) and the 10 after it, then the next 10 on each side — until the
// whole book is built; readers usually move a little up or down first (Seif 2026-10-22).
const BUILD_BLOCK = 10;
function buildOrder(n, c) {
  const order = [c];
  let up = c - 1, down = c + 1;
  while (up >= 0 || down < n) {
    for (let k = 0; k < BUILD_BLOCK && up >= 0; k++) order.push(up--);
    for (let k = 0; k < BUILD_BLOCK && down < n; k++) order.push(down++);
  }
  return order;
}

// The sheet at the top of the view (binary search: sheets are in page order).
// The first page whose bottom is below y, and the last page whose top is above y.
function sheetEndingBelow(y) {
  const sheets = state.sheets;
  let lo = 0, hi = sheets.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sheets[mid].getBoundingClientRect().bottom > y) { ans = mid; hi = mid - 1; } else lo = mid + 1;
  }
  return ans;
}
function sheetStartingAbove(y) {
  const sheets = state.sheets;
  let lo = 0, hi = sheets.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sheets[mid].getBoundingClientRect().top < y) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
function sheetAtTop() { return sheetEndingBelow(viewerContainer.getBoundingClientRect().top); }
function sheetAtBottom() { return sheetStartingAbove(viewerContainer.getBoundingClientRect().bottom); }

/* Pages near the screen — on it and about one screen's height above and below, measured —
   carry .near (content-visibility: auto); all others stay hidden, which the browser neither
   draws nor watches. Updated at most once a frame: on scroll, resize, a jump and while building. */
let nearFrom = 0, nearTo = -1;
const queueNear = oncePerFrame(() => updateNear());
function updateNear() {
  const sheets = state.sheets;
  if (!sheets.length) { nearFrom = 0; nearTo = -1; return; }
  const v = viewerContainer.getBoundingClientRect();
  const from = sheetEndingBelow(v.top - v.height), to = sheetStartingAbove(v.bottom + v.height);
  for (let i = nearFrom; i <= nearTo; i++) if ((i < from || i > to) && sheets[i]) sheets[i].classList.remove('near');
  for (let i = from; i <= to; i++) sheets[i].classList.add('near');
  nearFrom = from; nearTo = to;
}

// Pages filling in above the view change their height; the view must stay on the same spot
// of the same page. Chrome and Android's WebView do that themselves (scroll anchoring); in
// the others (Safari / iPhone) the page puts it back after each slice — which costs a full
// layout of the book every frame, so it is used only where needed.
const NATIVE_ANCHOR = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('overflow-anchor', 'auto');

function viewAnchor() {
  const idx = sheetAtTop();
  return { idx, offset: state.sheets[idx].getBoundingClientRect().top - viewerContainer.getBoundingClientRect().top };
}

function keepAnchor(a) {
  const now = state.sheets[a.idx].getBoundingClientRect().top - viewerContainer.getBoundingClientRect().top;
  const delta = now - a.offset;
  if (Math.abs(delta) > 0.5) viewerContainer.scrollTop += delta;
}

// Taps come first: building pauses while a finger (or mouse button) is down and for
// INPUT_PAUSE_MS after it lifts or a key is pressed, so a tap never waits behind it — while
// building, a tap on the toolbar could go unanswered on a phone (2026-10-22). Scrolling is
// the phone's own work and doesn't pause anything.
const INPUT_PAUSE_MS = 400;
let inputPauseUntil = 0;
let pointerIsDown = false;
const pauseForInput = () => { inputPauseUntil = performance.now() + INPUT_PAUSE_MS; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function buildSheets(run, onReady, center) {
  const n = state.sheets.length;
  const filled = new Uint8Array(n);
  const order = buildOrder(n, Math.max(0, Math.min(n - 1, center)));
  const fill = (i) => {
    if (filled[i]) return;
    filled[i] = 1;
    fillSheet(state.sheets[i], state.pages[i], i);
    state.built++;
  };
  let k = 0, ready = false;
  while (run === buildRun && state.built < n) {
    if (ready && (pointerIsDown || performance.now() < inputPauseUntil)) { await sleep(50); continue; }
    const top = ready ? sheetAtTop() : 0;
    const anchor = ready && !NATIVE_ANCHOR ? viewAnchor() : null;
    const start = performance.now();
    // What's on screen comes first: its empty pages and one either side.
    if (ready) {
      const from = Math.max(0, top - 1), to = Math.min(n - 1, sheetAtBottom() + 1);
      for (let i = from; i <= to; i++) fill(i);
    }
    while (state.built < n && performance.now() - start < BUILD_SLICE_MS) {
      while (k < n && filled[order[k]]) k++;
      if (k >= n) break;
      fill(order[k++]);
    }
    if (!ready) { ready = true; onReady(); }   // the landing page has its text: go there
    else if (anchor) keepAnchor(anchor);
    queueNear();
    if (state.built < n) {
      setProgress('building', state.built, n);
      await nextFrame();
      await nextFrame();      // one frame left free, so input always finds a quiet moment
    }
  }
  if (run !== buildRun) return;
  if (!ready) onReady();
  hideProgress();
  setSearchReady(true);
  applyBookmarkRibbons();
  if (sidePanel.classList.contains('open')) renderPanel();
  if (searchPopup.classList.contains('active') && searchInput.value) rerunSearch();
}

/* The progress bar: phase 'downloading' or 'building'; done/total give the percentage
   (none known → a moving bar). hideProgress() when the book is ready or closed. */
let progressShown = '';
function setProgress(phase, done, total) {
  // 00–99: the row is gone at 100.
  const pct = total > 0 ? Math.min(99, Math.floor((done / total) * 100)) : null;
  const key = `${phase}|${pct}|${state.numerals}|${state.dir}`;
  if (!progressEl.hidden && key === progressShown) return;   // only when the shown value changes
  progressShown = key;
  progressEl.hidden = false;
  progressEl.classList.toggle('indeterminate', pct == null);
  const sign = state.numerals === 'western' ? '%' : '٪';
  progressText.textContent = fmtNum(pct == null ? t()[phase] : `${t()[phase]} ${String(pct).padStart(2, '0')}${sign}`);
  progressFill.style.width = pct == null ? '' : `${pct}%`;
  if (pct == null) progressEl.removeAttribute('aria-valuenow'); else progressEl.setAttribute('aria-valuenow', String(pct));
  progressEl.setAttribute('aria-label', t()[phase]);
}

function hideProgress() { progressEl.hidden = true; }

function setSearchReady(ready) {
  btnSearchToggle.disabled = !ready;
  setTitle(btnSearchToggle, ready ? t().search : t().searchWait);
}

/* ================================================================
   Rendering a book
   ================================================================ */
// key: identifies the book (saved position, bookmarks, links); none = not remembered.
async function renderDocument(rawText, extraNotices, key, parsedAlready) {
  const run = ++buildRun;     // a newer book stops this one
  saveNow();                  // the book being closed
  clearSearch();
  search.indexes = {};
  setSearchReady(false);
  setProgress('building', 0, 0);
  // The preparation is split by frames too, so even a huge book never holds the screen.
  await nextFrame();
  if (run !== buildRun) return;

  const parsed = parsedAlready || parseBook(rawText);
  await nextFrame();
  if (run !== buildRun) return;
  state.format = parsed.format;
  state.pages = parsed.pages;
  state.volumes = [...new Set(parsed.pages.filter((p) => p.vol != null).map((p) => p.vol))];
  state.multiVolume = state.volumes.length > 0;
  state.detectedDir = detectDirection(stripComments(rawText));
  state.dir = state.detectedDir;
  state.bookKey = key || null;
  state.notices = (extraNotices || []).concat(state.format === 'plain' ? [] : buildNotices(auditPages(state.pages)));
  await nextFrame();
  if (run !== buildRun) return;

  applyLocalization();

  // The empty pages, in slices of BUILD_SLICE_MS with a frame between them, so the browser lays
  // them out a slice at a time instead of all at once (seen as a 1–2 s freeze on big books).
  pagesWrapper.textContent = '';
  state.sheets = [];
  state.built = 0;
  state.volTotals = volumeTotals(state.pages);
  const sheets = new Array(state.pages.length);
  for (let i = 0; i < sheets.length;) {
    const start = performance.now(), frag = document.createDocumentFragment();
    for (; i < sheets.length && performance.now() - start < BUILD_SLICE_MS; i++) frag.appendChild(sheets[i] = sheetShell(i));
    pagesWrapper.appendChild(frag);
    if (i < sheets.length) { await nextFrame(); if (run !== buildRun) return; }
  }
  state.sheets = sheets;
  nearFrom = 0; nearTo = -1;
  updateNear();
  emptyState.classList.toggle('visible', state.sheets.length === 0);

  buildVolumeSelect();
  viewerContainer.scrollTop = 0;
  viewerContainer.scrollLeft = 0;
  state.currentIdx = -1;
  applyBookmarkRibbons();
  updateCounter(true);
  updateScanButton();

  // A link to a page wins over the saved position. That page is built first and gone to at
  // once; the rest is built outward from it (buildOrder).
  const target = isLinkable() ? hashTargetIdx() : -1;
  const saved = (storeGet('positions', {}) || {})[state.bookKey];
  const center = target >= 0 ? target : (saved && typeof saved.idx === 'number' && saved.idx < state.sheets.length ? saved.idx : 0);
  void buildSheets(run, () => {
    if (target >= 0) { scrollToSheet(target); updateCounter(true); }
    else void restorePosition();
    if (sidePanel.classList.contains('open')) renderPanel();
  }, center);
}

// What this part hooks up as the page loads; main.js calls it, in the page's order.
function wirePages() {
  for (const ev of ['pointerdown', 'touchstart']) document.addEventListener(ev, () => { pointerIsDown = true; pauseForInput(); }, { capture: true, passive: true });
  for (const ev of ['pointerup', 'pointercancel', 'touchend', 'touchcancel']) document.addEventListener(ev, () => { pointerIsDown = false; pauseForInput(); }, { capture: true, passive: true });
  document.addEventListener('keydown', pauseForInput, { capture: true, passive: true });
}

export { applyBlockDirs, applyNumerals, cancelBuild, hideProgress, isBuilding, pageLabelText, queueNear, renderDocument, renderNotices, setProgress, setSearchReady, updateNear, wirePages };

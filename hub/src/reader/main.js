// The Reader's script (src/reader.src.html), bundled into the page by scripts/build.js with
// the parts in this folder and the shared files they import (marked, used by pages.js, is pinned
// in package.json and built in, so the Reader works offline and can't change under us). Each part
// defines its own functions; this file opens files, starts the Reader, and hooks the parts up in order.
import * as i360Theme from '../../theme/site/theme-loader.js';
import * as LibCopy from '../lib-copy.js';
import { fetchWithTimeout } from '../net.js';
import { setupClose } from '../page-chrome.js';
import { TEXT_SCALES } from './text.js';
import { btnClose, btnOpenFile, btnSearchList, checkConnection, fileInput, hashText, optDiacritics, optWord, parseBook, search, state, storeGet, wireState } from './state.js';
import { renderDocument, setProgress, wirePages } from './pages.js';
import { wirePosition } from './position.js';
import { renderEmpty, wireLibrary } from './library.js';
import { applyLocalization, setTextScale, setZoom, updatePageWidth, wireView } from './view.js';
import { wireNav } from './nav.js';
import { fitToolbar, wirePanel } from './panel.js';
import { setOption, wireSearch } from './search.js';

/* ================================================================
   Opening files
   ================================================================ */

/* ================================================================
   Start
   ?file=<link> opens a book: one of our own books (read from the lib
   site, wherever the link names it) or a book in the CSE's catalog (our
   copy, from the lib site); anything else is refused. #p=<page> opens
   it at a page.
   ================================================================ */
async function initApp() {
  void checkConnection();
  setupClose(btnClose);   // in the app, ✕ returns to its home (src/page-chrome.js)

  state.numerals = i360Theme.getNumerals();
  state.theme = i360Theme.getChoice();
  i360Theme.init();   // fresh theme.css in the background; the saved copy is already shown
  const scale = Number(storeGet('textScale', 1));
  search.exact = storeGet('searchExact', false) === true;
  search.word = storeGet('searchWord', false) === true;
  setOption(optDiacritics, search.exact);
  setOption(optWord, search.word);
  setOption(btnSearchList, false);

  fitToolbar();
  updatePageWidth();
  setTextScale(TEXT_SCALES.includes(scale) ? scale : 1);
  setZoom(1, false);
  applyLocalization();

  let fileUrl = new URLSearchParams(window.location.search).get('file');
  // A link that passed through a forwarding address can arrive encoded twice
  // ("https%3A%2F%2F…" after the normal decoding): decode it once more.
  if (fileUrl && /^https?%3A/i.test(fileUrl)) {
    try { fileUrl = decodeURIComponent(fileUrl); } catch { /* keep as is */ }
  }
  if (fileUrl) {
    // Only our own books and the books in the CSE's catalog open here (i360-hub.md §10).
    const own = LibCopy.ownBook(fileUrl, window.location.href);
    if (own) {
      try {
        setProgress('downloading', 0, 0);
        // The limit covers waiting for the answer only, so a big book is never cut off mid-download.
        const response = await fetchWithTimeout(own);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        state.bookLink = own;
        renderDocument(text, null, `url:${own}`);
      } catch (err) {
        renderEmpty([{ type: 'loadError', message: err && err.message ? err.message : String(err) }]);
        void checkConnection();
      }
      return;
    }
    let link = null;
    try { const u = new URL(fileUrl); if (/^https?:$/.test(u.protocol)) link = u.href; } catch { /* not a full address */ }
    if (!link) { renderEmpty([{ type: 'notInLibrary' }]); return; }
    // A book the CSE has indexed (archive.org, Wikipedia, …): our page-split copy from the lib site.
    let copy;
    // Each part is split into pages as it arrives, spread over the download, instead of the whole
    // book at the end (the same shared parseBook; the same pages — test/lib-copy.test.js).
    const parts = [];
    try {
      copy = await LibCopy.open(link, fetchWithTimeout, (done, total) => setProgress('downloading', done, total), (c, text) => { parts[c] = parseBook(text); });
    } catch {
      renderEmpty([{ type: 'unverified' }]);   // the lib site couldn't be asked
      void checkConnection();
      return;
    }
    if (!copy) { renderEmpty([{ type: 'notInLibrary' }]); return; }
    renderEmpty([]);
    state.libSource = copy.source;
    state.libBooks = copy.books;
    state.bookLink = link;
    const n = copy.source.chunks.length;
    const whole = parts.length === n && parts.every((p) => p && p.format === 'ocr') ? { format: 'ocr', pages: parts.flatMap((p) => p.pages) } : null;
    renderDocument(copy.text, null, `url:${link}`, whole);   // anything unusual: parsed whole, as before
    return;
  }
  renderEmpty([]);
}

/* ================================================================
   Wiring: each part hooks up its buttons and listeners, in the order
   they were set up when the Reader was one file (listener order matters:
   e.g. two keyboard listeners for the same key).
   ================================================================ */
wireState();
wirePages();
wirePosition();
wireLibrary();
wireView();
wireNav();
wirePanel();
wireSearch();

btnOpenFile.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result);
    // Name plus the book's opening text: a re-export of the same book keeps
    // its place, two different books with the same file name don't mix.
    state.libSource = null;
    state.bookLink = null;
    renderDocument(text, null, `file:${file.name}|${hashText(text.slice(0, 4000))}`);
  };
  reader.onerror = () => renderEmpty([{ type: 'readError' }]);
  reader.readAsText(file, 'utf-8');
  fileInput.value = '';   // choosing the same file again still reloads it
});

window.addEventListener('DOMContentLoaded', initApp);

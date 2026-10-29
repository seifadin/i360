// The Reader: the book's state, the search's state, the page's elements, the connection icon
// and small helpers — what every other part of the Reader reads.
import { READER as LOCALES } from '../locales.js';
import * as LibCopy from '../lib-copy.js';
import * as BookFormat from '../book-format.js';
import * as i360Theme from '../../theme/site/theme-loader.js';
import { ICON } from './text.js';

/* ================================================================
   State and elements
   ================================================================ */
const state = {
  format: 'ocr',          // 'ocr' | 'legacy' | 'plain'
  pages: [],              // { kind, vol, label, num, md }
  sheets: [],             // matching <article> elements
  volumes: [],            // distinct volume labels, in book order
  detectedDir: 'rtl',
  dir: 'rtl',
  zoom: 1,
  multiVolume: false,
  notices: [],
  currentIdx: 0,
  numerals: 'western',    // the shared i360 choice: 'western' 0123 | 'arabic' ٠١٢٣ | 'persian' ۰۱۲۳ — display only
  theme: 'system',
  libSource: null,        // the catalog entry when the book is our copy from the lib site
  libBooks: 0,            // how many books its archive.org item holds (for the scan link)
  bookLink: null,         // the book's own address, for the public link (null for a file from the device)
  built: 0,               // pages whose text is built so far (buildSheets)
  textScale: 1,
  bookKey: null,          // identifies the open book (saved position, bookmarks)
  panelTab: 'contents'
};
const search = {
  indexes: {}, matches: [], current: -1, timer: 0, query: '',
  exact: false,           // match diacritics and letter forms exactly
  word: false,            // whole word only
  listOpen: false
};

const $ = (id) => document.getElementById(id);
const toolbar = $('toolbar');
const tbStart = toolbar.querySelector('.tb-start');
const tbMain = toolbar.querySelector('.tb-main');
const tbEnd = toolbar.querySelector('.tb-end');
const pagesWrapper = $('pages-wrapper');
const viewerContainer = $('viewer-container');
const pageNumInput = $('page-num-input');
const totalPagesLabel = $('total-pages');
const pagePos = $('page-pos');
const volSelect = $('vol-select');
const lblOf = $('lbl-of');
const btnPanel = $('btn-panel');
const btnZoomIn = $('btn-zoom-in');
const btnZoomOut = $('btn-zoom-out');
const btnFitWidth = $('btn-fit-width');
const btnFitPage = $('btn-fit-page');
const btnTextSmaller = $('btn-text-smaller');
const btnTextLarger = $('btn-text-larger');
const btnNavLeft = $('btn-nav-left');
const btnNavRight = $('btn-nav-right');
const btnDirToggle = $('btn-dir-toggle');
const btnNumerals = $('btn-numerals');
const btnTheme = $('btn-theme');
const btnScan = $('btn-scan');
const btnBookmark = $('btn-bookmark');
const btnReading = $('btn-reading');
const btnExitReading = $('btn-exit-reading');
const btnMore = $('btn-more');
const moreMenu = $('more-menu');
const btnSearchToggle = $('btn-search-toggle');
const searchPopup = $('search-popup');
const searchInput = $('search-input');
const searchCount = $('search-count');
const btnSearchPrev = $('btn-search-prev');
const btnSearchNext = $('btn-search-next');
const btnSearchList = $('btn-search-list');
const btnSearchClose = $('btn-search-close');
const optDiacritics = $('opt-diacritics');
const optWord = $('opt-word');
const searchResults = $('search-results');
const sidePanel = $('side-panel');
const tabContents = $('tab-contents');
const tabBookmarks = $('tab-bookmarks');
const btnCopyLink = $('btn-copy-link');
const btnPanelClose = $('btn-panel-close');
const panelBody = $('panel-body');
const toastEl = $('toast');
const statusIcon = $('status-icon');
const btnOpenFile = $('btn-open-file');
const tbTitle = $('tb-title');
const progressEl = $('progress');
const progressText = $('progress-text');
const progressFill = $('progress-fill');
const btnClose = $('btn-close');
const fileInput = $('file-input');
const missingPagesBanner = $('missing-pages-banner');
const missingPagesText = $('missing-pages-text');
const emptyState = $('empty-state');

// The interface follows the book's direction: Arabic for a right-to-left book, else English.
const lang = () => (state.dir === 'rtl' ? 'ar' : 'en');
const t = () => LOCALES[lang()];

/* Connection icon: green while the lib site can be reached, red while it can't, live.
   The browser's own online/offline signal isn't enough: Android's WebView never changes
   it unless the app declares ACCESS_NETWORK_STATE (seen on a phone, 2026-10-22), and
   Wi-Fi without internet reads as online. So the page also asks the lib site itself —
   one small no-cache request for latest.json — when it opens, when it comes back to the
   front, every 30 s while it's visible, when the browser reports a change, and when a
   book download fails. The browser saying "offline" is believed at once. */
const CONNECTION_CHECK_MS = 30000;
const CONNECTION_TIMEOUT_MS = 8000;
let online = navigator.onLine !== false;
let connectionCheck = null;

function checkConnection() {
  if (connectionCheck) return connectionCheck;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => { if (ctl) ctl.abort(); }, CONNECTION_TIMEOUT_MS);
  connectionCheck = fetch(`${LibCopy.LIB}latest.json`, { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
    .then(() => true, () => false)   // any answer means the network works
    .then((ok) => { online = ok; })
    .finally(() => { clearTimeout(timer); connectionCheck = null; updateConnection(); });
  return connectionCheck;
}

function updateConnection() {
  const label = online ? t().online : t().offline;
  statusIcon.innerHTML = `${online ? ICON.globeCheck : ICON.globeX}<span class="status-text"></span>`;
  statusIcon.lastChild.textContent = label;
  statusIcon.classList.toggle('offline', !online);
  setTitle(statusIcon, label);
}

/* ================================================================
   Small helpers
   ================================================================ */
// Shared with the CSE indexer: src/book-format.js (BookFormat).
const { toWestern, stripComments, hasVisibleContent, parseBook, splitFootnotes } = BookFormat;


const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// Settings and positions live in this browser only. Storage can be missing
// (private mode, blocked site data): the reader then just doesn't remember.
const STORE_PREFIX = 'i360reader.';
function storeGet(key, fallback) {
  try {
    const v = localStorage.getItem(STORE_PREFIX + key);
    return v == null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
function storeSet(key, value) {
  try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch { /* not remembered */ }
}

// Digits as the reader shows them; the file itself is never changed.
function fmtNum(s) {
  return i360Theme.toNumerals(String(s), state.numerals);
}

function hashText(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

function detectDirection(text) {
  const sample = text.length > 200000 ? text.slice(0, 200000) : text;
  const arabic = (sample.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g) || []).length;
  const latin = (sample.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;
  if (latin > arabic) return 'ltr';
  return 'rtl';
}

function setTitle(el, text) {
  el.title = text;
  el.setAttribute('aria-label', text);
}

// What this part hooks up as the page loads; main.js calls it, in the page's order.
function wireState() {
  window.addEventListener('online', () => { void checkConnection(); });
  window.addEventListener('offline', () => { online = false; updateConnection(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkConnection(); });
  setInterval(() => { if (!document.hidden) void checkConnection(); }, CONNECTION_CHECK_MS);
}

export { $, btnBookmark, btnClose, btnCopyLink, btnDirToggle, btnExitReading, btnFitPage, btnFitWidth, btnMore, btnNavLeft, btnNavRight, btnNumerals, btnOpenFile, btnPanel, btnPanelClose, btnReading, btnScan, btnSearchClose, btnSearchList, btnSearchNext, btnSearchPrev, btnSearchToggle, btnTextLarger, btnTextSmaller, btnTheme, btnZoomIn, btnZoomOut, checkConnection, detectDirection, emptyState, fileInput, fmtNum, hasVisibleContent, hashText, lang, lblOf, missingPagesBanner, missingPagesText, moreMenu, nextFrame, optDiacritics, optWord, pageNumInput, pagePos, pagesWrapper, panelBody, parseBook, progressEl, progressFill, progressText, search, searchCount, searchInput, searchPopup, searchResults, setTitle, sidePanel, splitFootnotes, state, statusIcon, storeGet, storeSet, stripComments, t, tabBookmarks, tabContents, tbEnd, tbMain, tbStart, tbTitle, toWestern, toastEl, toolbar, totalPagesLabel, updateConnection, viewerContainer, volSelect, wireState };

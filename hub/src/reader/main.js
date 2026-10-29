// The Reader's script (src/reader.src.html), bundled into the page by scripts/build.js with
// the shared files it imports. marked is pinned in package.json and built in, so the Reader
// works offline and can't change under us.
import * as marked from 'marked';
import * as i360Theme from '../../theme/site/theme-loader.js';
import * as BookFormat from '../book-format.js';
import * as SearchCore from '../search-core.js';
import * as LibCopy from '../lib-copy.js';

/* ================================================================
   Icons and UI text
   ================================================================ */
const ICON = {
  stepForward: `<svg data-lucide="step-forward" viewBox="0 0 24 24"><path d="M10.029 4.285A2 2 0 0 0 7 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"></path><path d="M3 4v16"></path></svg>`,
  stepBack: `<svg data-lucide="step-back" viewBox="0 0 24 24"><path d="M13.971 4.285A2 2 0 0 1 17 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z"></path><path d="M21 20V4"></path></svg>`,
  globeX: `<svg data-lucide="globe-x" viewBox="0 0 24 24"><path d="m16 3 5 5"></path><path d="M2 12h20A10 10 0 1 1 12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 4-10"></path><path d="m21 3-5 5"></path></svg>`,
  globeCheck: `<svg data-lucide="globe-check" viewBox="0 0 24 24"><path d="m15 6 2 2 4-4"></path><path d="M2 12h20A10 10 0 1 1 12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 4-10"></path></svg>`,
  sun: `<svg data-lucide="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`,
  sepia: `<svg data-lucide="coffee" viewBox="0 0 24 24"><path d="M10 2v2"></path><path d="M14 2v2"></path><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"></path><path d="M6 2v2"></path></svg>`,
  moon: `<svg data-lucide="moon" viewBox="0 0 24 24"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path></svg>`,
  system: `<svg data-lucide="monitor" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg>`,
  trash: `<svg data-lucide="x" viewBox="0 0 24 24"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`
};

const TRANSLATIONS = {
  ar: {
    appTitle: 'قارئ الماركداون',
    zoomIn: 'تكبير (Ctrl +)',
    zoomOut: 'تصغير (Ctrl -)',
    fitWidth: 'ملاءمة العرض',
    fitPage: 'ملاءمة الصفحة',
    textSmaller: 'تصغير الخط',
    textLarger: 'تكبير الخط',
    textLetter: 'أ',
    prevPage: (key) => `الصفحة السابقة (${key})`,
    nextPage: (key) => `الصفحة التالية (${key})`,
    dirRTL: 'الاتجاه الحالي: من اليمين لليسار (انقر للتغيير إلى LTR)',
    dirLTR: 'الاتجاه الحالي: من اليسار لليمين (انقر للتغيير إلى RTL)',
    themeSystem: 'المظهر: حسب الجهاز (انقر للتبديل إلى فاتح)',
    themeLight: 'المظهر: فاتح (انقر للتبديل إلى ورقي)',
    themeSepia: 'المظهر: ورقي (انقر للتبديل إلى داكن)',
    themeDark: 'المظهر: داكن (انقر للتبديل إلى حسب الجهاز)',
    scan: 'الصفحة الأصلية: صورة هذه الصفحة على archive.org',
    bookmarkAdd: 'إضافة علامة لهذه الصفحة',
    bookmarkRemove: 'إزالة علامة هذه الصفحة',
    bookmarkAdded: 'أُضيفت العلامة',
    bookmarkRemoved: 'أُزيلت العلامة',
    reading: 'وضع القراءة',
    exitReading: 'الخروج من وضع القراءة (Esc)',
    more: 'المزيد',
    panel: 'المحتويات والعلامات',
    contentsTab: 'المحتويات',
    bookmarksTab: 'العلامات',
    noHeadings: 'لا توجد عناوين في هذا الكتاب.',
    noBookmarks: 'لا توجد علامات بعد. استخدم زر العلامة لحفظ الصفحة الحالية.',
    removeBookmark: 'حذف العلامة',
    closePanel: 'إغلاق',
    copyLink: 'نسخ رابط هذه الصفحة',
    linkCopied: 'نُسخ الرابط',
    copyFailed: 'تعذّر النسخ',
    volume: 'الجزء',
    search: 'بحث في المستند (Ctrl+F)',
    searchInput: 'بحث في النص...',
    prevMatch: 'النتيجة السابقة (Shift+Enter)',
    nextMatch: 'النتيجة التالية (Enter)',
    showResults: 'قائمة النتائج',
    closeSearch: 'إغلاق البحث (Esc)',
    matchDiacritics: 'مطابقة التشكيل',
    wholeWord: 'كلمة كاملة',
    moreResults: (n) => `و${n} نتيجة أخرى`,
    openFile: 'فتح ملف',
    downloading: 'جارٍ تحميل',
    building: 'جارٍ عرض',
    searchWait: 'يُتاح البحث بعد اكتمال عرض الكتاب',
    online: 'متصل بالإنترنت',
    offline: 'غير متصل',
    barTitle: 'القارئ',
    close: 'إغلاق',
    notInLibrary: 'هذا الكتاب ليس في مكتبة i360، فلا يمكن فتحه هنا.',
    unverified: 'تعذّر التحقق من الكتاب في مكتبة i360 — تحقّق من الاتصال ثم أعد المحاولة.',
    ofLabel: 'من',
    pageInput: 'رقم الصفحة المطبوع — للكتب متعددة الأجزاء: الجزء:الصفحة — وللموضع في الملف: (12)',
    position: (i, n) => `الموضع في الملف: ${i} من ${n}`,
    page: 'ص',
    vol: 'ج',
    listSep: '، ',
    missingPagesWarn: (count, ranges) => `تنبيه: تم اكتشاف ${count} صفحة مفقودة: ${ranges}`,
    untranscribedWarn: (count, list) => `تنبيه: ${count} صفحة لم تُنسخ: ${list}`,
    untranscribedPage: 'لم تُنسخ هذه الصفحة.',
    after: (label) => `بعد ${label}`,
    loadError: (msg) => `تعذّر تحميل الملف: ${msg}`,
    readError: 'تعذّر قراءة الملف.',
    emptyHint: 'لا يوجد ملف مفتوح. اضغط «فتح ملف» لاختيار كتاب.',
    noResults: '0 من 0',
    numeralsWestern: 'الأرقام: غربية 456 (انقر للتبديل إلى العربية المشرقية ٤٥٦)',
    numeralsArabic: 'الأرقام: عربية مشرقية ٤٥٦ (انقر للتبديل إلى الفارسية/الأردية ۴۵۶)',
    numeralsPersian: 'الأرقام: فارسية/أردية ۴۵۶ (انقر للتبديل إلى الغربية 456)'
  },
  en: {
    appTitle: 'Markdown Reader',
    zoomIn: 'Zoom in (Ctrl +)',
    zoomOut: 'Zoom out (Ctrl -)',
    fitWidth: 'Fit width',
    fitPage: 'Fit page',
    textSmaller: 'Smaller text',
    textLarger: 'Larger text',
    textLetter: 'A',
    prevPage: (key) => `Previous page (${key})`,
    nextPage: (key) => `Next page (${key})`,
    dirRTL: 'Current Direction: RTL (Click for LTR)',
    dirLTR: 'Current Direction: LTR (Click for RTL)',
    themeSystem: 'Theme: follows this device (click for light)',
    themeLight: 'Theme: light (click for sepia)',
    themeSepia: 'Theme: sepia (click for dark)',
    themeDark: 'Theme: dark (click to follow this device)',
    scan: 'Original page: the scan of this page on archive.org',
    bookmarkAdd: 'Bookmark this page',
    bookmarkRemove: 'Remove this page’s bookmark',
    bookmarkAdded: 'Bookmark added',
    bookmarkRemoved: 'Bookmark removed',
    reading: 'Reading mode',
    exitReading: 'Exit reading mode (Esc)',
    more: 'More',
    panel: 'Contents and bookmarks',
    contentsTab: 'Contents',
    bookmarksTab: 'Bookmarks',
    noHeadings: 'This book has no headings.',
    noBookmarks: 'No bookmarks yet. Use the bookmark button to save the current page.',
    removeBookmark: 'Remove bookmark',
    closePanel: 'Close',
    copyLink: 'Copy link to this page',
    linkCopied: 'Link copied',
    copyFailed: 'Could not copy',
    volume: 'Volume',
    search: 'Search within document (Ctrl+F)',
    searchInput: 'Search text...',
    prevMatch: 'Previous match (Shift+Enter)',
    nextMatch: 'Next match (Enter)',
    showResults: 'Results list',
    closeSearch: 'Close search (Esc)',
    matchDiacritics: 'Match diacritics',
    wholeWord: 'Whole word',
    moreResults: (n) => `and ${n} more`,
    openFile: 'Open file',
    downloading: 'Downloading',
    building: 'Preparing',
    searchWait: 'Search is available once the book is ready',
    online: 'Online',
    offline: 'Offline',
    barTitle: 'Reader',
    close: 'Close',
    notInLibrary: 'This book isn’t in the i360 library, so it can’t be opened here.',
    unverified: 'Couldn’t check this book against the i360 library — check the connection and try again.',
    ofLabel: 'of',
    pageInput: 'Printed page number — multi-volume books: volume:page — position in the file: (12)',
    position: (i, n) => `Position in the file: ${i} of ${n}`,
    page: 'p.',
    vol: 'vol.',
    listSep: ', ',
    missingPagesWarn: (count, ranges) => `Warning: ${count} missing page(s) detected: ${ranges}`,
    untranscribedWarn: (count, list) => `Warning: ${count} page(s) not transcribed: ${list}`,
    untranscribedPage: 'This page was not transcribed.',
    after: (label) => `after ${label}`,
    loadError: (msg) => `Could not load the file: ${msg}`,
    readError: 'Could not read the file.',
    emptyHint: 'No file open. Press “Open file” to choose a book.',
    noResults: '0 of 0',
    numeralsWestern: 'Numerals: Western 456 (click for Eastern Arabic ٤٥٦)',
    numeralsArabic: 'Numerals: Eastern Arabic ٤٥٦ (click for Persian/Urdu ۴۵۶)',
    numeralsPersian: 'Numerals: Persian/Urdu ۴۵۶ (click for Western 456)'
  }
};

/* ================================================================
   Constants
   ================================================================ */
const QURAN_OPEN = '﴿';   // ﴿
const QURAN_CLOSE = '﴾';  // ﴾
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.1;
const TEXT_SCALES = [0.85, 0.92, 1, 1.1, 1.2, 1.32, 1.45, 1.6];
// No fixed screen widths: the toolbar layout is chosen by measuring whether it
// fits (labels, language, digits and fonts all change its width), and the
// side panel closes after a jump when it covers most of the page.
const PANEL_COVERS = 0.6;                      // panel width / viewer width that counts as "covering"
const CURRENT_PAGE_LINE = 0.25;                // a page is "current" once its top passes this share of the view
const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_MIN_CHARS = 2;
const SEARCH_MAX_MATCHES = 5000;
const SEARCH_LIST_MAX = 300;                   // results shown in the list; the count shows all
const SNIPPET_CHARS = 45;
const SAVE_DEBOUNCE_MS = 500;
const PIN_MS = 1500;                           // a jump is held in place at least this long…
const PIN_SETTLE_MS = 800;                     // …and this long after the fonts finish loading…
const PIN_MAX_MS = 10000;                      // …but never longer than this
const POSITIONS_MAX = 100;                     // books remembered; the oldest are dropped
const TOAST_MS = 1800;
// Leaf text blocks: places where a paragraph's text lives.
const BLOCK_SEL = 'p,li,h1,h2,h3,h4,h5,h6,td,th,pre,.fn-note';

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

const t = () => TRANSLATIONS[state.dir === 'rtl' ? 'ar' : 'en'];

// Inside the installed i360إ app: Capacitor's bridge is in every page it serves.
const IN_APP = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());

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

window.addEventListener('online', () => { void checkConnection(); });
window.addEventListener('offline', () => { online = false; updateConnection(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkConnection(); });
setInterval(() => { if (!document.hidden) void checkConnection(); }, CONNECTION_CHECK_MS);

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

// Show the book's digits in the chosen numerals. Code and real links keep theirs.
function applyNumerals(root) {
  const conv = (v) => i360Theme.toNumerals(v, state.numerals);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest('pre, code, a:not(.fn-ref):not(.fn-back)'))
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  let node;
  while ((node = walker.nextNode())) {
    const v = node.nodeValue;
    if (!/[0-9\u0660-\u0669\u06F0-\u06F9]/.test(v)) continue;
    const nv = conv(v);
    if (nv !== v) node.nodeValue = nv;   // same length: search positions stay valid
  }
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
let nearFrom = 0, nearTo = -1, nearQueued = false;
function queueNear() {
  if (nearQueued) return;
  nearQueued = true;
  requestAnimationFrame(() => { nearQueued = false; updateNear(); });
}
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
for (const ev of ['pointerdown', 'touchstart']) document.addEventListener(ev, () => { pointerIsDown = true; pauseForInput(); }, { capture: true, passive: true });
for (const ev of ['pointerup', 'pointercancel', 'touchend', 'touchcancel']) document.addEventListener(ev, () => { pointerIsDown = false; pauseForInput(); }, { capture: true, passive: true });
document.addEventListener('keydown', pauseForInput, { capture: true, passive: true });
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
   Toast: one short line at the bottom (copy link, bookmarks)
   ================================================================ */
let toastTimer = 0;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), TOAST_MS);
}

/* ================================================================
   Reading position, remembered per book on this device
   ================================================================ */
let saveTimer = 0;

function savePosition() {
  if (!state.bookKey || state.sheets.length === 0) return;
  const a = captureAnchor();
  if (!a) return;
  const all = storeGet('positions', {}) || {};
  all[state.bookKey] = { idx: a.idx, frac: Math.round(a.frac * 10000) / 10000, t: Date.now() };
  const keys = Object.keys(all);
  if (keys.length > POSITIONS_MAX) {
    keys.sort((x, y) => (all[x].t || 0) - (all[y].t || 0));
    for (const k of keys.slice(0, keys.length - POSITIONS_MAX)) delete all[k];
  }
  storeSet('positions', all);
}

function saveNow() {
  clearTimeout(saveTimer);
  savePosition();
  updateHash();
}

async function restorePosition() {
  const key = state.bookKey;
  if (!key) return;
  const pos = (storeGet('positions', {}) || {})[key];
  if (!pos || typeof pos.idx !== 'number' || pos.idx >= state.sheets.length) return;
  if (pos.idx === 0 && !(pos.frac > 0.02)) return;
  const anchor = { idx: pos.idx, frac: Math.max(0, Math.min(1, Number(pos.frac) || 0)) };
  restoreAnchor(anchor);      // pinned until the layout settles
  updateCounter(true);
}

window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });

/* ================================================================
   Links to a page: #p=45, #p=2:45 (volume:page), #n=12 (12th page in
   the file, for pages without a printed number). Only for books opened
   by link (?file=…), since a local file can't be linked to.
   ================================================================ */
function isLinkable() {
  return !!state.bookKey && state.bookKey.startsWith('url:');
}

function hashTargetIdx() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const p = params.get('p');
  if (p) return findPage(p, true);
  const n = parseInt(toWestern(params.get('n') || ''), 10);
  if (n >= 1 && n <= state.pages.length) return n - 1;
  return -1;
}

function hashFor(idx) {
  const p = state.pages[idx];
  if (!p) return '';
  if (state.format !== 'plain' && p.label && p.label !== '-' && p.label !== '?') {
    const v = state.multiVolume && p.vol != null ? `${p.vol}:${p.label}` : p.label;
    return `#p=${encodeURIComponent(v)}`;
  }
  return `#n=${idx + 1}`;
}

function updateHash() {
  if (!isLinkable() || state.sheets.length === 0) return;
  const h = hashFor(findCurrentIdx());
  if (h && window.location.hash !== h) {
    try { history.replaceState(null, '', h); } catch { /* ignore */ }
  }
}

window.addEventListener('hashchange', () => {
  if (!isLinkable()) return;
  const idx = hashTargetIdx();
  if (idx >= 0) { scrollToSheet(idx); updateCounter(true); }
});

/* The public link to this page of the book. Its start is the Reader's address from
   Baserow (i360dbc's MdReader field, e.g. "https://…/md/?file="), which the i360إ app
   saves on the device — never an address written into this page. Used only if it is an
   https address ending in "file="; then the book's own address and the page are added.
   Without it: on the web, this page's own address (already a public link); inside the
   app, nothing — the app's internal address must never be copied (the button hides). */
const MD_READER_KEY = 'i360.mdReader';
function readerBase() {
  let v;
  try { v = localStorage.getItem(MD_READER_KEY); } catch { return null; }
  if (typeof v !== 'string' || !/[?&]file=$/.test(v)) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
  } catch { return null; }
  return v;
}

function shareLink() {
  const base = readerBase();
  if (base && state.bookLink) return base + encodeURIComponent(state.bookLink) + window.location.hash;
  return IN_APP ? null : window.location.href;
}

async function copyPageLink() {
  updateHash();
  const link = shareLink();
  try {
    if (!link) throw new Error('no public link');
    await navigator.clipboard.writeText(link);
    toast(t().linkCopied);
  } catch {
    toast(t().copyFailed);
  }
}

/* ================================================================
   Page bookmarks, per book on this device. Stored by printed page
   (volume + label) so they survive a re-export; position as fallback.
   ================================================================ */
function bookmarkList() {
  if (!state.bookKey) return [];
  const all = storeGet('bookmarks', {}) || {};
  return Array.isArray(all[state.bookKey]) ? all[state.bookKey] : [];
}

function saveBookmarks(list) {
  if (!state.bookKey) return;
  const all = storeGet('bookmarks', {}) || {};
  if (list.length > 0) all[state.bookKey] = list; else delete all[state.bookKey];
  storeSet('bookmarks', all);
}

function resolveBookmark(b) {
  if (b && b.label && b.label !== '-' && b.label !== '?') {
    const i = state.pages.findIndex((p) => p.label === b.label && p.vol === (b.vol == null ? null : b.vol));
    if (i >= 0) return i;
  }
  return b && typeof b.idx === 'number' && b.idx < state.pages.length ? b.idx : -1;
}

function bookmarkedSet() {
  return new Set(bookmarkList().map(resolveBookmark).filter((i) => i >= 0));
}

function applyBookmarkRibbons() {
  const set = bookmarkedSet();
  state.sheets.forEach((s, i) => s.classList.toggle('bookmarked', set.has(i)));
  updateBookmarkButton(set);
}

function updateBookmarkButton(set) {
  const idx = findCurrentIdx();
  const on = idx >= 0 && (set || bookmarkedSet()).has(idx);
  btnBookmark.setAttribute('aria-pressed', on ? 'true' : 'false');
  btnBookmark.title = on ? t().bookmarkRemove : t().bookmarkAdd;
  btnBookmark.setAttribute('aria-label', btnBookmark.title);
  btnBookmark.disabled = idx < 0 || !state.bookKey;
}

function toggleBookmark() {
  const idx = findCurrentIdx();
  if (idx < 0 || !state.bookKey) return;
  const list = bookmarkList();
  const at = list.findIndex((b) => resolveBookmark(b) === idx);
  if (at >= 0) {
    list.splice(at, 1);
    toast(t().bookmarkRemoved);
  } else {
    const p = state.pages[idx];
    list.push({ idx, vol: p.vol, label: p.label });
    list.sort((a, b) => resolveBookmark(a) - resolveBookmark(b));
    toast(t().bookmarkAdded);
  }
  saveBookmarks(list);
  applyBookmarkRibbons();
  if (sidePanel.classList.contains('open') && state.panelTab === 'bookmarks') renderPanel();
}

function removeBookmarkAt(idx) {
  saveBookmarks(bookmarkList().filter((b) => resolveBookmark(b) !== idx));
  applyBookmarkRibbons();
  renderPanel();
}

btnBookmark.addEventListener('click', toggleBookmark);

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

/* ================================================================
   Our copy of a book (from the lib site): its scan on archive.org
   ================================================================ */
function updateScanButton() {
  updateCopyLink();
  const show = !!(state.libSource && LibCopy.scanLink(state.libSource, 0, state.libBooks));
  if (btnScan.hidden === !show) return;
  btnScan.hidden = !show;
  queueFitToolbar();
}

// Copy link, on the bar whenever this book has a public link (Reader's "share").
function updateCopyLink() {
  const show = isLinkable() && !!shareLink();
  if (btnCopyLink.hidden === !show) return;
  btnCopyLink.hidden = !show;
  queueFitToolbar();
}

// Pages of our copy are the scan's pages, in order: position n is scan page n.
btnScan.addEventListener('click', () => {
  const url = LibCopy.scanLink(state.libSource, Math.max(0, state.currentIdx), state.libBooks);
  if (url) window.open(url, '_blank', 'noopener');
});

function renderEmpty(notices) {
  buildRun++;                 // stops an unfinished build
  state.built = 0;
  hideProgress();
  setSearchReady(true);
  saveNow();
  state.bookKey = null;
  state.libSource = null;
  state.bookLink = null;
  updateScanButton();
  clearSearch();
  search.indexes = {};
  state.pages = [];
  state.sheets = [];
  state.volumes = [];
  state.multiVolume = false;
  state.notices = notices;
  pagesWrapper.textContent = '';
  buildVolumeSelect();
  applyLocalization();
  updateCounter(true);
  if (sidePanel.classList.contains('open')) renderPanel();
}

/* ================================================================
   Localization and direction
   ================================================================ */
function setTitle(el, text) {
  el.title = text;
  el.setAttribute('aria-label', text);
}

function applyLocalization() {
  const isRtl = state.dir === 'rtl';
  const tr = t();

  document.title = tr.appTitle;
  document.documentElement.lang = isRtl ? 'ar' : 'en';
  document.body.dir = state.dir;
  searchPopup.dir = state.dir;
  missingPagesBanner.dir = state.dir;
  moreMenu.dir = state.dir;

  setTitle(btnPanel, tr.panel);
  setTitle(btnZoomIn, tr.zoomIn);
  setTitle(btnZoomOut, tr.zoomOut);
  setTitle(btnFitWidth, tr.fitWidth);
  setTitle(btnFitPage, tr.fitPage);
  setTitle(btnTextSmaller, tr.textSmaller);
  setTitle(btnTextLarger, tr.textLarger);
  btnTextSmaller.innerHTML = `${tr.textLetter}<small>−</small>`;
  btnTextLarger.innerHTML = `${tr.textLetter}<small>+</small>`;
  // In an RTL book the next page is to the left, as when turning an Arabic book's pages.
  setTitle(btnNavLeft, isRtl ? tr.nextPage('←') : tr.prevPage('←'));
  setTitle(btnNavRight, isRtl ? tr.prevPage('→') : tr.nextPage('→'));
  setTitle(btnDirToggle, isRtl ? tr.dirRTL : tr.dirLTR);
  btnDirToggle.innerHTML = isRtl ? ICON.stepForward : ICON.stepBack;
  btnNumerals.textContent = { western: '456', arabic: '٤٥٦', persian: '۴۵۶' }[state.numerals];   // 4–6 differ between ٠١٢٣ and ۰۱۲۳
  setTitle(btnNumerals, { western: tr.numeralsWestern, arabic: tr.numeralsArabic, persian: tr.numeralsPersian }[state.numerals]);
  btnTheme.innerHTML = { system: ICON.system, light: ICON.sun, sepia: ICON.sepia, dark: ICON.moon }[state.theme];
  setTitle(btnTheme, { system: tr.themeSystem, light: tr.themeLight, sepia: tr.themeSepia, dark: tr.themeDark }[state.theme]);
  setTitle(btnScan, tr.scan);
  setTitle(btnReading, tr.reading);
  setTitle(btnExitReading, tr.exitReading);
  setTitle(btnMore, tr.more);
  setTitle(btnSearchToggle, btnSearchToggle.disabled ? tr.searchWait : tr.search);
  searchInput.placeholder = tr.searchInput;
  searchInput.setAttribute('aria-label', tr.search);
  setTitle(btnSearchPrev, tr.prevMatch);
  setTitle(btnSearchNext, tr.nextMatch);
  setTitle(btnSearchList, tr.showResults);
  setTitle(btnSearchClose, tr.closeSearch);
  optDiacritics.textContent = tr.matchDiacritics;
  optWord.textContent = tr.wholeWord;
  tabContents.textContent = tr.contentsTab;
  tabBookmarks.textContent = tr.bookmarksTab;
  setTitle(btnCopyLink, tr.copyLink);
  setTitle(btnPanelClose, tr.closePanel);
  setTitle(volSelect, tr.volume);
  document.getElementById('open-file-label').textContent = tr.openFile;
  setTitle(btnOpenFile, tr.openFile);
  lblOf.textContent = tr.ofLabel;
  setTitle(pageNumInput, tr.pageInput);

  tbTitle.textContent = tr.barTitle;
  setTitle(btnClose, tr.close);
  updateConnection();

  emptyState.textContent = fmtNum(tr.emptyHint);
  emptyState.classList.toggle('visible', state.sheets.length === 0);

  renderNotices();
  updateSearchCountDisplay();
  updateBookmarkButton();
  queueFitToolbar();          // labels and language change the toolbar's width (once per frame, before it's drawn)
}

btnDirToggle.addEventListener('click', () => {
  state.dir = state.dir === 'rtl' ? 'ltr' : 'rtl';
  // Back to the detected direction: each paragraph finds its own again.
  // Otherwise every paragraph follows the chosen direction.
  const blockDir = state.dir === state.detectedDir ? 'auto' : state.dir;
  for (const sheet of state.sheets) {
    sheet.dir = state.dir;
    applyBlockDirs(sheet, blockDir, state.dir);
  }
  applyLocalization();
  for (let i = 0; i < state.sheets.length; i++) {
    const footer = state.sheets[i].querySelector('.page-number-footer');
    if (footer) footer.textContent = pageLabelText(state.pages[i], t());
    const ph = state.sheets[i].querySelector('.page-placeholder');
    if (ph) ph.textContent = t().untranscribedPage;
  }
  buildVolumeSelect();
  updateCounter(true);
  if (sidePanel.classList.contains('open')) renderPanel();
});

/* ================================================================
   Numerals, theme, text size — saved on this device
   ================================================================ */
// Numerals: the shared i360 choice (0123 · ٠١٢٣ · ۰۱۲۳), also followed when
// another i360 app or tab changes it.
btnNumerals.addEventListener('click', () => { i360Theme.cycleNumerals(); });
i360Theme.onNumeralsChange(({ numerals }) => {
  if (numerals === state.numerals) return;
  state.numerals = numerals;
  for (const sheet of state.sheets) applyNumerals(sheet);
  search.indexes = {};        // snippets come from the page text, which just changed
  applyLocalization();
  buildVolumeSelect();
  updateCounter(true);
  if (sidePanel.classList.contains('open')) renderPanel();
  if (search.query) { const q = searchInput.value; search.query = ''; performSearch(q); }
});

// Theme: the shared i360 choice, kept by the built-in theme loader
// (i360Theme): saved once for every app on this site, followed live when it
// changes in another app or tab, and "system" follows the device. Only the
// button's icon and tooltip are the Reader's to update.
i360Theme.onChange(({ choice }) => {
  if (choice === state.theme) return;
  state.theme = choice;
  applyLocalization();
});

btnTheme.addEventListener('click', () => { i360Theme.cycle(); });

function setTextScale(v) {
  const anchor = captureAnchor();
  state.textScale = v;
  document.documentElement.style.setProperty('--text-scale', String(v));
  restoreAnchor(anchor);
  const i = TEXT_SCALES.indexOf(v);
  btnTextSmaller.disabled = i <= 0;
  btnTextLarger.disabled = i >= TEXT_SCALES.length - 1;
}

function stepTextScale(delta) {
  let i = TEXT_SCALES.indexOf(state.textScale);
  if (i < 0) i = TEXT_SCALES.indexOf(1);
  i = Math.max(0, Math.min(TEXT_SCALES.length - 1, i + delta));
  setTextScale(TEXT_SCALES[i]);
  storeSet('textScale', state.textScale);
}

btnTextSmaller.addEventListener('click', () => stepTextScale(-1));
btnTextLarger.addEventListener('click', () => stepTextScale(1));

/* ================================================================
   Page width and zoom
   CSS zoom changes the real layout size, so the scroll area always
   matches what you see and a zoomed-in page can be scrolled sideways.
   ================================================================ */
function viewerInner() {
  const cs = getComputedStyle(viewerContainer);
  return {
    w: viewerContainer.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    h: viewerContainer.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
  };
}

// rem → px at the reader's current root font size (the user's browser setting).
function remPx(n) {
  return n * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
}

// A CSS length variable (rem or px) in px.
function cssVarPx(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return v.endsWith('rem') ? remPx(n) : n;
}

function pageWidth() {
  return cssVarPx('--page-w') || cssVarPx('--page-max');
}

function updatePageWidth() {
  const w = Math.max(cssVarPx('--page-min'), Math.min(cssVarPx('--page-max'), Math.floor(viewerInner().w)));
  document.documentElement.style.setProperty('--page-w', `${w}px`);
}

function captureAnchor() {
  const idx = findCurrentIdx();
  const sheet = state.sheets[idx];
  if (!sheet) return null;
  const vTop = viewerContainer.getBoundingClientRect().top;
  const r = sheet.getBoundingClientRect();
  return { idx, frac: r.height > 0 ? (vTop - r.top) / r.height : 0 };
}

function restoreAnchor(anchor) {
  if (!anchor) return;
  const sheet = state.sheets[anchor.idx];
  if (!sheet) return;
  const vTop = viewerContainer.getBoundingClientRect().top;
  const r = sheet.getBoundingClientRect();
  viewerContainer.scrollTop += (r.top - vTop) + anchor.frac * r.height;
  pinElement(sheet, 0, anchor.frac);
}

function setZoom(z, keepAnchor = true) {
  const anchor = keepAnchor ? captureAnchor() : null;
  state.zoom = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 100) / 100;
  pagesWrapper.style.zoom = String(state.zoom);
  restoreAnchor(anchor);
  btnZoomOut.disabled = state.zoom <= ZOOM_MIN;
  btnZoomIn.disabled = state.zoom >= ZOOM_MAX;
}

function fitWidthZoom() {
  return viewerInner().w / pageWidth();
}

function fitWidth() {
  setZoom(fitWidthZoom());
  viewerContainer.scrollLeft = 0;
}

function fitPage() {
  const idx = findCurrentIdx();
  const sheet = state.sheets[idx];
  if (!sheet) { setZoom(1); return; }
  const unzoomedH = sheet.getBoundingClientRect().height / state.zoom;
  const z = Math.min(viewerInner().h / unzoomedH, fitWidthZoom());
  setZoom(z, false);
  viewerContainer.scrollLeft = 0;
  scrollToSheet(idx);
}

btnZoomIn.addEventListener('click', () => setZoom(state.zoom + ZOOM_STEP));
btnZoomOut.addEventListener('click', () => setZoom(state.zoom - ZOOM_STEP));
btnFitWidth.addEventListener('click', fitWidth);
btnFitPage.addEventListener('click', fitPage);

let resizeQueued = false;
// Anything that moves the pages (zoom, text size, a page filling in, fonts) re-checks which are near.
if (typeof ResizeObserver === 'function') new ResizeObserver(queueNear).observe(pagesWrapper);
window.addEventListener('resize', () => {
  queueNear();
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    const anchor = captureAnchor();
    updatePageWidth();
    restoreAnchor(anchor);
  });
});

/* ================================================================
   Page counter and navigation (by printed page number)
   ================================================================ */
function findCurrentIdx() {
  const sheets = state.sheets;
  if (sheets.length === 0) return -1;
  const v = viewerContainer.getBoundingClientRect();
  const line = v.top + v.height * CURRENT_PAGE_LINE;
  let lo = 0, hi = sheets.length - 1, ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sheets[mid].getBoundingClientRect().top <= line) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

function counterValue(p, idx) {
  if (state.format === 'plain') return fmtNum(idx + 1);
  if (!p.label) return '—';
  return p.label === '-' ? '—' : (p.label === '?' ? '؟' : fmtNum(p.label));
}

// The last printed page of each volume, worked out once per book (renderDocument).
function volumeTotals(pages) {
  const max = new Map();
  for (const p of pages) if (p.num != null && !(max.get(p.vol) >= p.num)) max.set(p.vol, p.num);
  return max;
}
function volumeTotal(vol) {
  if (state.format === 'plain') return String(state.pages.length);
  const max = state.volTotals ? state.volTotals.get(vol) : undefined;
  return max == null ? '—' : String(max);
}

function buildVolumeSelect() {
  volSelect.textContent = '';
  volSelect.hidden = !state.multiVolume;
  if (!state.multiVolume) return;
  for (const v of state.volumes) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = fmtNum(`${t().vol} ${v}`);
    volSelect.appendChild(opt);
  }
  queueFitToolbar();
}

volSelect.addEventListener('change', () => {
  const idx = state.pages.findIndex((p) => p.vol === volSelect.value);
  if (idx >= 0) { scrollToSheet(idx); updateCounter(true); }
  volSelect.blur();
});

function updateCounter(force) {
  const idx = findCurrentIdx();
  const none = idx < 0;
  btnNavLeft.disabled = none;
  btnNavRight.disabled = none;
  if (none) {
    pageNumInput.value = '';
    totalPagesLabel.textContent = fmtNum('0');
    pagePos.textContent = '';
    setTitle(pageNumInput, t().pageInput);
    updateBookmarkButton();
    return;
  }
  if (!force && idx === state.currentIdx) return;
  state.currentIdx = idx;
  const p = state.pages[idx];
  if (document.activeElement !== pageNumInput) pageNumInput.value = counterValue(p, idx);
  const total = fmtNum(volumeTotal(p.vol));
  if (totalPagesLabel.textContent !== total) { totalPagesLabel.textContent = total; queueFitToolbar(); }
  // Position in the file, beside the printed number (a plain file already counts by position).
  const pos = state.format === 'plain' ? '' : fmtNum(`(${idx + 1}/${state.pages.length})`);
  if (pagePos.textContent !== pos) {
    const grew = pos.length !== pagePos.textContent.length;
    pagePos.textContent = pos;
    if (grew) queueFitToolbar();
  }
  setTitle(pageNumInput, `${t().pageInput}\n${fmtNum(t().position(idx + 1, state.pages.length))}`);
  if (state.multiVolume && p.vol != null && document.activeElement !== volSelect) volSelect.value = p.vol;
  updateBookmarkButton();
}

let scrollQueued = false;
viewerContainer.addEventListener('scroll', () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => { scrollQueued = false; updateNear(); updateCounter(false); });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, SAVE_DEBOUNCE_MS);
}, { passive: true });

/* ----------------------------------------------------------------
   Holding a jump in place
   After a jump, content above the target can still grow: the Arabic
   fonts finish loading and rewrap the text, and a page that was only
   estimated (content-visibility) is laid out for real. Without help the
   target slides down and the wrong page becomes current (a link to
   #p=3 turned into #n=2). So every jump "pins" its target: until the
   layout settles, the target is put back where it was placed. Any
   touch, wheel, click or key from the reader releases the pin.
   ---------------------------------------------------------------- */
let pin = null;

// Keep el's top at (viewer top + offset − frac × el's height).
function pinElement(el, offset, frac = 0) {
  const now = performance.now();
  const p = { el, offset, frac, started: now, until: now + PIN_MS };
  pin = p;
  if (document.fonts && document.fonts.status === 'loading') {
    document.fonts.ready.then(() => {
      if (pin === p) p.until = Math.max(p.until, performance.now() + PIN_SETTLE_MS);
    });
  }
  requestAnimationFrame(pinStep);
}

function placePinned(p) {
  const r = p.el.getBoundingClientRect();
  const want = viewerContainer.getBoundingClientRect().top + p.offset - p.frac * r.height;
  const d = r.top - want;
  if (Math.abs(d) >= 1) viewerContainer.scrollTop += d;
}

function pinStep() {
  const p = pin;
  if (!p) return;
  if (!p.el.isConnected || performance.now() > Math.min(p.until, p.started + PIN_MAX_MS)) {
    pin = null;
    updateCounter(true);
    return;
  }
  placePinned(p);
  requestAnimationFrame(pinStep);
}

function releasePin() { pin = null; }

for (const ev of ['wheel', 'touchstart', 'pointerdown']) {
  viewerContainer.addEventListener(ev, releasePin, { passive: true });
}
// Capture phase: a key releases the old pin before its own jump sets a new one.
document.addEventListener('keydown', releasePin, true);

function scrollToSheet(idx) {
  const sheet = state.sheets[idx];
  if (!sheet) return;
  const pad = parseFloat(getComputedStyle(viewerContainer).paddingTop) || 0;
  const p = { el: sheet, offset: pad, frac: 0 };
  placePinned(p);
  pinElement(sheet, pad);
}

// Next/previous page. "Previous" first goes back to the top of the
// current page if you're partway down it, like turning back a page.
function goPage(delta) {
  const idx = findCurrentIdx();
  if (idx < 0) return;
  let target = idx + delta;
  if (delta < 0) {
    const vTop = viewerContainer.getBoundingClientRect().top;
    const pad = parseFloat(getComputedStyle(viewerContainer).paddingTop) || 0;
    if (state.sheets[idx].getBoundingClientRect().top < vTop + pad - remPx(0.5)) target = idx;
  }
  target = Math.max(0, Math.min(state.sheets.length - 1, target));
  scrollToSheet(target);
  updateCounter(true);
}

function goEdge(last) {
  if (state.sheets.length === 0) return;
  scrollToSheet(last ? state.sheets.length - 1 : 0);
  updateCounter(true);
}

// The left arrow means "next" in an RTL book.
const leftDelta = () => (state.dir === 'rtl' ? 1 : -1);
btnNavLeft.addEventListener('click', () => goPage(leftDelta()));
btnNavRight.addEventListener('click', () => goPage(-leftDelta()));

// allowAnyVolume: a "volume:page" value is honoured even if it can't be
// checked against the current page (links opened before anything is shown).
function findPage(input, allowAnyVolume) {
  const raw = toWestern(String(input).trim()).replace(/^ص\s*/, '');
  if (!raw) return -1;
  // "(12)": the 12th page in the file, as shown beside the printed number.
  const pm = /^\(\s*(\d+)\s*(?:\/\s*\d+\s*)?\)$/.exec(raw);
  if (pm) {
    const n = parseInt(pm[1], 10);
    return n >= 1 && n <= state.pages.length ? n - 1 : -1;
  }
  if (state.format === 'plain') {
    const n = parseInt(raw, 10);
    return n >= 1 && n <= state.pages.length ? n - 1 : 0;
  }

  const cur = state.pages[state.currentIdx] || state.pages[0];
  let vol = cur ? cur.vol : null;
  let label = raw;
  const vm = /^(?:ج\s*)?([^\s:/]+)\s*[:/]\s*(?:ص\s*)?(\S+)$/.exec(raw);
  if (vm && (state.multiVolume || allowAnyVolume)) { vol = vm[1]; label = vm[2]; }
  if (label === '؟') label = '?';

  const inVol = (p) => !state.multiVolume || p.vol === vol;
  const idx = state.pages.findIndex((p) => inVol(p) && p.label === label);
  if (idx >= 0) return idx;

  // Not printed (or missing): go to the nearest numbered page in the same volume.
  if (/^\d+$/.test(label)) {
    const n = parseInt(label, 10);
    let best = -1, bestDiff = Infinity;
    state.pages.forEach((p, i) => {
      if (!inVol(p) || p.num == null) return;
      const d = Math.abs(p.num - n);
      if (d < bestDiff) { bestDiff = d; best = i; }
    });
    return best;
  }
  return -1;
}

function goToInput() {
  const idx = findPage(pageNumInput.value);
  if (idx >= 0) {
    scrollToSheet(idx);
    pageNumInput.blur();
    requestAnimationFrame(() => updateCounter(true));
  } else {
    updateCounter(true);
    const p = state.pages[state.currentIdx];
    if (p) pageNumInput.value = counterValue(p, state.currentIdx);
  }
}

pageNumInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); goToInput(); }
  else if (e.key === 'Escape') { pageNumInput.blur(); updateCounter(true); }
});
pageNumInput.addEventListener('change', goToInput);
pageNumInput.addEventListener('focus', () => pageNumInput.select());

/* ================================================================
   Footnote links: jump inside the scroller and flash the target
   ================================================================ */
function revealElement(target) {
  const v = viewerContainer.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  viewerContainer.scrollTop += r.top - v.top - viewerContainer.clientHeight / 3;
  pinElement(target, target.getBoundingClientRect().top - viewerContainer.getBoundingClientRect().top);
  target.classList.remove('flash');
  void target.offsetWidth;
  target.classList.add('flash');
}

pagesWrapper.addEventListener('click', (e) => {
  const a = e.target.closest('a.fn-ref, a.fn-back');
  if (!a) return;
  e.preventDefault();
  const target = document.getElementById(a.dataset.target);
  if (target) revealElement(target);
});

/* ================================================================
   Side panel: contents (the book's headings) and bookmarks
   ================================================================ */
// On a small screen the panel covers the page: close it after a jump.
function panelCoversPage() {
  return sidePanel.getBoundingClientRect().width >= viewerContainer.clientWidth * PANEL_COVERS;
}

function openPanel() {
  closeMore();
  sidePanel.classList.add('open');
  sidePanel.setAttribute('aria-hidden', 'false');
  btnPanel.setAttribute('aria-expanded', 'true');
  btnPanel.setAttribute('aria-pressed', 'true');
  renderPanel();
}

function closePanel() {
  sidePanel.classList.remove('open');
  sidePanel.setAttribute('aria-hidden', 'true');
  btnPanel.setAttribute('aria-expanded', 'false');
  btnPanel.setAttribute('aria-pressed', 'false');
}

btnPanel.addEventListener('click', () => {
  if (sidePanel.classList.contains('open')) closePanel(); else openPanel();
});
btnPanelClose.addEventListener('click', closePanel);
tabContents.addEventListener('click', () => { state.panelTab = 'contents'; renderPanel(); });
tabBookmarks.addEventListener('click', () => { state.panelTab = 'bookmarks'; renderPanel(); });
btnCopyLink.addEventListener('click', copyPageLink);

async function jumpToElement(idx, el) {
  scrollToSheet(idx);
  if (el) {
    await nextFrame(); await nextFrame();
    const v = viewerContainer.getBoundingClientRect();
    viewerContainer.scrollTop += el.getBoundingClientRect().top - v.top - remPx(0.75);
    pinElement(el, remPx(0.75));
  }
  updateCounter(true);
  if (panelCoversPage()) closePanel();
}

function panelItem(text, pageText, onClick, extraClass) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'panel-item' + (extraClass ? ' ' + extraClass : '');
  const s1 = document.createElement('span');
  s1.className = 'item-text';
  s1.textContent = text;
  s1.dir = 'auto';
  const s2 = document.createElement('span');
  s2.className = 'item-page';
  s2.textContent = pageText;
  btn.append(s1, s2);
  btn.addEventListener('click', onClick);
  return btn;
}

function emptyNote(text) {
  const div = document.createElement('div');
  div.className = 'panel-empty';
  div.textContent = text;
  return div;
}

function pageSummary(idx) {
  const sheet = state.sheets[idx];
  const h = sheet && sheet.querySelector('.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4');
  const text = (h ? h.textContent : (sheet ? sheet.querySelector('.markdown-body').textContent : '')).replace(/\s+/g, ' ').trim();
  return text.length > 70 ? text.slice(0, 70) + '…' : text;
}

function renderPanel() {
  const tr = t();
  tabContents.setAttribute('aria-selected', state.panelTab === 'contents' ? 'true' : 'false');
  tabBookmarks.setAttribute('aria-selected', state.panelTab === 'bookmarks' ? 'true' : 'false');
  panelBody.textContent = '';

  if (state.sheets.length === 0) { panelBody.appendChild(emptyNote(tr.emptyHint)); return; }

  const ul = document.createElement('ul');
  ul.className = 'panel-list';

  if (state.panelTab === 'contents') {
    state.sheets.forEach((sheet, idx) => {
      for (const h of sheet.querySelectorAll('.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4')) {
        const text = h.textContent.replace(/\s+/g, ' ').trim();
        if (!text) continue;
        const li = document.createElement('li');
        li.appendChild(panelItem(text, state.format === 'plain' ? '' : pageLabelText(state.pages[idx], tr),
          () => jumpToElement(idx, h), `lvl-${h.tagName.slice(1)}`));
        ul.appendChild(li);
      }
    });
    if (!ul.firstChild) { panelBody.appendChild(emptyNote(tr.noHeadings)); return; }
  } else {
    const indices = [...bookmarkedSet()].sort((a, b) => a - b);
    for (const idx of indices) {
      const li = document.createElement('li');
      li.className = 'bm-row';
      const label = state.format === 'plain' ? fmtNum(idx + 1) : pageLabelText(state.pages[idx], tr);
      li.appendChild(panelItem(pageSummary(idx) || label, label, () => jumpToElement(idx, null)));
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'panel-btn';
      del.innerHTML = ICON.trash;
      setTitle(del, tr.removeBookmark);
      del.addEventListener('click', () => removeBookmarkAt(idx));
      li.appendChild(del);
      ul.appendChild(li);
    }
    if (!ul.firstChild) { panelBody.appendChild(emptyNote(tr.noBookmarks)); return; }
  }
  panelBody.appendChild(ul);
}

/* ================================================================
   Reading mode: toolbar hidden, full screen where the browser allows
   ================================================================ */
function enterReading() {
  const anchor = captureAnchor();
  closePanel(); closeSearch(); closeMore();
  document.body.classList.add('reading');
  restoreAnchor(anchor);
  const el = document.documentElement;
  if (el.requestFullscreen && !document.fullscreenElement) {
    el.requestFullscreen().catch(() => { /* not allowed here: the toolbar is hidden anyway */ });
  }
  btnExitReading.focus();
}

function exitReading() {
  if (!document.body.classList.contains('reading')) return;
  const anchor = captureAnchor();
  document.body.classList.remove('reading');
  fitToolbar();
  restoreAnchor(anchor);
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}

btnReading.addEventListener('click', enterReading);
btnExitReading.addEventListener('click', exitReading);
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) exitReading();
});

/* ================================================================
   Toolbar layout by measurement (no fixed screen widths)
   The first level whose row really fits is used, so it follows the language, labels,
   digits, fonts and the browser's text size. On a wide screen, groups of the ⋮ menu come
   out onto the bar; they go back first when space runs out:
     0: text size, zoom, and bookmark · «الصفحة الأصلية» · reading mode all on the bar
     1: text size back in ⋮    2: zoom back in ⋮    3: bookmark … reading mode back in ⋮
     4: the title is hidden    5: search, «فتح ملف» and the connection icon move into ⋮
     6: the file position "(12/70)" is hidden (it stays in the page box's tooltip)
     7: tighter spacing        8: the "of N" total is hidden
     9: the volume menu moves into ⋮ too    10: the smallest buttons, for very narrow
     screens with large text   11: last resort — copy link into ⋮ too (bookmark's box)
   The page arrows always stay; direction always lives in ⋮.
   ================================================================ */
const groupFold = $('group-fold');
// Moved into ⋮'s first row at their level, in this order; each returns to its own place.
// Copy link's last resort is bookmark's box, first — the pair stays together in ⋮ too.
const FOLD = [[statusIcon, 5], [btnOpenFile, 5], [btnSearchToggle, 5], [btnCopyLink, 11, $('group-mark')]].map(([el, at, into]) => {
  const home = document.createComment(el.id);
  el.parentNode.insertBefore(home, el);
  return { el, home, at, into };
});
// ⋮'s groups that come out onto the bar while level < out: each has its place in ⋮
// and its place on the bar (text size and zoom before the page arrows; after copy link, bookmark,
// then «الصفحة الأصلية» and reading mode).
const groupNav = $('group-nav');
const OUT = [['group-text', 1, 'before'], ['group-zoom', 2, 'before'], ['group-mark', 3, 'after'], ['group-acts', 3, 'after']].map(([id, out, side]) => {
  const el = $(id);
  const home = document.createComment(id);
  el.parentNode.insertBefore(home, el);
  return { el, home, out, side };
});
let toolbarLevel = -1;
const TOOLBAR_LEVELS = 11;

function setToolbarLevel(level) {
  if (level === toolbarLevel) return;
  toolbarLevel = level;
  // On the bar, in order: text size, zoom, the page arrows, copy link, bookmark … reading mode.
  for (const g of OUT) {
    if (level < g.out) {
      // Text size, then zoom, each placed just before the arrows: they end up in that order.
      if (g.side === 'before') tbMain.insertBefore(g.el, groupNav);
      else if (g.el.parentElement !== tbMain) tbMain.appendChild(g.el);
    } else if (g.el.previousSibling !== g.home) g.home.parentNode.insertBefore(g.el, g.home.nextSibling);
  }
  document.body.classList.toggle('acts-out', level < 3);   // the divider before the page actions
  document.body.classList.toggle('notitle', level >= 4);
  const folded = level >= 5;
  document.body.classList.toggle('folded', folded);
  document.body.classList.toggle('nopos', level >= 6);
  document.body.classList.toggle('tight', level >= 7);
  document.body.classList.toggle('tighter', level >= 8);
  document.body.classList.toggle('tightest', level >= 10);
  for (const f of FOLD) {
    if (level >= f.at) {
      if (f.into) { if (f.into.firstElementChild !== f.el) f.into.insertBefore(f.el, f.into.firstChild); }
      else if (f.el.parentElement !== groupFold) groupFold.appendChild(f.el);
    }
    else if (f.el.previousSibling !== f.home) f.home.parentNode.insertBefore(f.el, f.home.nextSibling);
  }
  groupFold.hidden = !folded;
  const counter = toolbar.querySelector('.page-counter');
  if (level >= 9) { if (volSelect.parentElement !== moreMenu) moreMenu.insertBefore(volSelect, moreMenu.firstChild); }
  else if (volSelect.parentElement !== counter) counter.insertBefore(volSelect, counter.firstChild);
}

function rowWidth(el) {
  const cs = getComputedStyle(el);
  const gap = parseFloat(cs.columnGap) || 0;
  let w = 0, n = 0;
  for (const c of el.children) {
    if (c.hidden || c.classList.contains('more-menu') || getComputedStyle(c).display === 'none') continue;
    w += c.getBoundingClientRect().width;
    n++;
  }
  return w + gap * Math.max(0, n - 1);
}

function toolbarFits() {
  const cs = getComputedStyle(toolbar);
  const inner = toolbar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const gap = parseFloat(cs.columnGap) || 0;
  const need = tbStart.getBoundingClientRect().width + rowWidth(tbMain) + tbEnd.getBoundingClientRect().width + gap * 2;
  return need <= inner;
}

// Measured before the browser paints, so the switch is never seen.
function fitToolbar() {
  if (document.body.classList.contains('reading')) return;
  for (let level = 0; level <= TOOLBAR_LEVELS; level++) {
    setToolbarLevel(level);
    if (toolbarFits()) return;
  }
}

let fitQueued = false;
function queueFitToolbar() {
  if (fitQueued) return;
  fitQueued = true;
  requestAnimationFrame(() => { fitQueued = false; fitToolbar(); });
}

function closeMore() {
  moreMenu.hidden = true;
  btnMore.setAttribute('aria-expanded', 'false');
  btnMore.setAttribute('aria-pressed', 'false');
}

btnMore.addEventListener('click', () => {
  const open = moreMenu.hidden;
  moreMenu.hidden = !open;
  btnMore.setAttribute('aria-expanded', open ? 'true' : 'false');
  btnMore.setAttribute('aria-pressed', open ? 'true' : 'false');
});

document.addEventListener('click', (e) => {
  if (!moreMenu.hidden && !moreMenu.contains(e.target) && !btnMore.contains(e.target)) closeMore();
});
// Search and «فتح ملف», when they sit in the menu, close it as they open.
moreMenu.addEventListener('click', (e) => {
  if (e.target.closest('#btn-search-toggle, #btn-open-file')) closeMore();
});

// Anything that can change the toolbar's width re-checks the fit.
if (typeof ResizeObserver === 'function') {
  new ResizeObserver(queueFitToolbar).observe(toolbar);
  new ResizeObserver(queueFitToolbar).observe(tbEnd);
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueFitToolbar);

/* ================================================================
   Keyboard shortcuts
   ================================================================ */
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const tag = e.target && e.target.tagName;
  const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);

  if (mod && !e.altKey) {
    const k = e.key.toLowerCase();
    if (k === 'f' && state.sheets.length > 0 && !isBuilding()) { e.preventDefault(); exitReading(); openSearch(); return; }
    if (k === '=' || k === '+') { e.preventDefault(); setZoom(state.zoom + ZOOM_STEP); return; }
    if (k === '-' || k === '_') { e.preventDefault(); setZoom(state.zoom - ZOOM_STEP); return; }
    if (k === '0') { e.preventDefault(); setZoom(1); return; }
    return;
  }

  if (e.key === 'Escape') {
    if (!moreMenu.hidden) { closeMore(); return; }
    if (searchPopup.classList.contains('active')) { closeSearch(); return; }
    if (sidePanel.classList.contains('open')) { closePanel(); return; }
    exitReading();
    return;
  }

  if (typing || e.altKey) return;
  switch (e.key) {
    case 'ArrowLeft': e.preventDefault(); goPage(leftDelta()); break;
    case 'ArrowRight': e.preventDefault(); goPage(-leftDelta()); break;
    case 'PageDown': e.preventDefault(); goPage(1); break;
    case 'PageUp': e.preventDefault(); goPage(-1); break;
    case 'Home': e.preventDefault(); goEdge(false); break;
    case 'End': e.preventDefault(); goEdge(true); break;
    default: break;
  }
});

/* ================================================================
   Search
   The matching rules live in src/search-core.js (SearchCore), shared
   with the i360 CSE page and its indexer, so all of them find exactly
   the same matches. This part feeds the rendered page to it and shows
   the results. Works across bold and other formatting inside a
   paragraph. Highlights use the CSS Custom Highlight API: the page DOM
   is never changed.
   ================================================================ */
// Each page as text pieces for the shared core: a new paragraph wherever
// the text moves into another block (matches never cross it), a printed
// line break (<br>) as a space, and every text node as a run whose
// reference is the node itself (for highlighting).
function buildSearchIndex(exact) {
  const pages = [];
  state.sheets.forEach((sheet, idx) => {
    const root = sheet.querySelector('.page-content');
    const b = SearchCore.createPage(exact);
    let lastBlock = null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'BR') b.lineBreak();
        continue;
      }
      const block = node.parentElement ? node.parentElement.closest(BLOCK_SEL) : null;
      if (block !== lastBlock) { b.paragraph(); lastBlock = block; }
      b.text(node.nodeValue, node);
    }
    b.page.sheet = sheet;
    b.page.idx = idx;
    pages.push(b.page);
  });
  return pages;
}

function getIndex() {
  const key = search.exact ? 'exact' : 'loose';
  if (!search.indexes[key]) search.indexes[key] = buildSearchIndex(search.exact);
  return search.indexes[key];
}

function matchBounds(page, s, e) {
  const endNode = page.nodes[page.oNode[e - 1]];
  let eo = page.oOff[e - 1] + 1;
  // Include diacritics that sit on the last matched letter.
  while (eo < endNode.nodeValue.length && SearchCore.isDropChar(endNode.nodeValue[eo])) eo++;
  return {
    startContainer: page.nodes[page.oNode[s]], startOffset: page.oOff[s],
    endContainer: endNode, endOffset: eo
  };
}

// Static ranges for the (possibly thousands of) highlights: unlike live
// Ranges they cost nothing on later DOM changes.
function staticRange(m) { return new StaticRange(matchBounds(m.page, m.s, m.e)); }

function liveRange(m) {
  const b = matchBounds(m.page, m.s, m.e);
  const r = document.createRange();
  r.setStart(b.startContainer, b.startOffset);
  r.setEnd(b.endContainer, b.endOffset);
  return r;
}

const hasHighlights = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function';

function clearSearch() {
  clearTimeout(search.timer);
  search.matches = [];
  search.current = -1;
  search.query = '';
  if (hasHighlights) { CSS.highlights.delete('search'); CSS.highlights.delete('search-active'); }
  renderResultsList();
  updateSearchCountDisplay();
}

function performSearch(rawQuery) {
  const q = SearchCore.normalizeQuery(rawQuery, search.exact);
  if (q === search.query) return;
  clearSearch();
  search.query = q;
  if (q.length < SEARCH_MIN_CHARS || state.sheets.length === 0 || isBuilding()) return;

  const matches = SearchCore.findMatches(getIndex(), q, { word: search.word, max: SEARCH_MAX_MATCHES });
  search.matches = matches;
  renderResultsList();
  if (matches.length === 0) { updateSearchCountDisplay(); return; }

  if (hasHighlights) {
    const all = new Highlight();
    for (const m of matches) all.add(staticRange(m));
    CSS.highlights.set('search', all);
  }

  // Start from the first match at or after the page being read.
  const curIdx = Math.max(0, findCurrentIdx());
  let start = matches.findIndex((m) => m.page.idx >= curIdx);
  if (start < 0) start = 0;
  showMatch(start);
}

function rerunSearch() {
  search.query = '';
  performSearch(searchInput.value);
}

async function showMatch(i) {
  search.current = i;
  updateSearchCountDisplay();
  markActiveResult();
  const m = search.matches[i];
  if (!m) return;
  if (hasHighlights) CSS.highlights.set('search-active', new Highlight(staticRange(m)));
  const range = liveRange(m);   // only one live range at a time, for measuring

  // Off-screen pages aren't laid out yet: bring the page in first.
  let r = range.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) {
    scrollToSheet(m.page.idx);
    await nextFrame(); await nextFrame();
    if (search.current !== i) return;
    r = range.getBoundingClientRect();
  }
  const v = viewerContainer.getBoundingClientRect();
  viewerContainer.scrollTop += r.top - v.top - viewerContainer.clientHeight / 3;
  if (r.left < v.left || r.right > v.right) {
    viewerContainer.scrollLeft += (r.left + r.right) / 2 - (v.left + v.right) / 2;
  }
  const startEl = range.startContainer.parentElement;
  const block = startEl && (startEl.closest(BLOCK_SEL) || startEl);
  if (block) pinElement(block, block.getBoundingClientRect().top - viewerContainer.getBoundingClientRect().top);
}

function updateSearchCountDisplay() {
  if (search.matches.length === 0) {
    searchCount.textContent = fmtNum(t().noResults);
    return;
  }
  const total = search.matches.length >= SEARCH_MAX_MATCHES ? `${SEARCH_MAX_MATCHES}+` : search.matches.length;
  searchCount.textContent = fmtNum(`${search.current + 1} ${state.dir === 'rtl' ? 'من' : 'of'} ${total}`);
}

function stepMatch(delta) {
  const n = search.matches.length;
  if (n === 0) return;
  showMatch((search.current + delta + n) % n);
}

function renderResultsList() {
  searchResults.textContent = '';
  searchResults.hidden = !search.listOpen || search.matches.length === 0;
  if (searchResults.hidden) return;
  const tr = t();
  const shown = Math.min(search.matches.length, SEARCH_LIST_MAX);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < shown; i++) {
    const m = search.matches[i];
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    const page = document.createElement('span');
    page.className = 'res-page';
    page.textContent = state.format === 'plain' ? '' : pageLabelText(state.pages[m.page.idx], tr);
    const text = document.createElement('span');
    text.dir = 'auto';
    const sn = SearchCore.snippet(m, SNIPPET_CHARS);
    const mark = document.createElement('mark');
    mark.textContent = sn.hit;
    text.append(document.createTextNode(sn.before), mark, document.createTextNode(sn.after));
    btn.append(page, text);
    btn.addEventListener('click', () => showMatch(i));
    li.appendChild(btn);
    frag.appendChild(li);
  }
  if (search.matches.length > shown) {
    const li = document.createElement('li');
    li.className = 'res-more';
    li.textContent = fmtNum(tr.moreResults(search.matches.length - shown));
    frag.appendChild(li);
  }
  searchResults.appendChild(frag);
  markActiveResult();
}

function markActiveResult() {
  if (searchResults.hidden) return;
  const items = searchResults.children;
  for (let i = 0; i < items.length; i++) items[i].classList.toggle('active', i === search.current);
  const active = items[search.current];
  if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
}

function setOption(btn, value) { btn.setAttribute('aria-pressed', value ? 'true' : 'false'); }

optDiacritics.addEventListener('click', () => {
  search.exact = !search.exact;
  setOption(optDiacritics, search.exact);
  storeSet('searchExact', search.exact);
  rerunSearch();
});
optWord.addEventListener('click', () => {
  search.word = !search.word;
  setOption(optWord, search.word);
  storeSet('searchWord', search.word);
  rerunSearch();
});
btnSearchList.addEventListener('click', () => {
  search.listOpen = !search.listOpen;
  setOption(btnSearchList, search.listOpen);
  renderResultsList();
});

function openSearch() {
  closeMore();
  searchPopup.classList.add('active');
  btnSearchToggle.setAttribute('aria-expanded', 'true');
  searchInput.focus();
  searchInput.select();
  if (searchInput.value) rerunSearch();
}

function closeSearch() {
  searchPopup.classList.remove('active');
  btnSearchToggle.setAttribute('aria-expanded', 'false');
  clearSearch();
}

btnSearchToggle.addEventListener('click', () => {
  if (searchPopup.classList.contains('active')) closeSearch(); else openSearch();
});
btnSearchClose.addEventListener('click', closeSearch);
btnSearchNext.addEventListener('click', () => stepMatch(1));
btnSearchPrev.addEventListener('click', () => stepMatch(-1));

searchInput.addEventListener('input', () => {
  clearTimeout(search.timer);
  search.timer = setTimeout(() => performSearch(searchInput.value), SEARCH_DEBOUNCE_MS);
});
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    clearTimeout(search.timer);
    if (SearchCore.normalizeQuery(searchInput.value, search.exact) !== search.query) performSearch(searchInput.value);
    else stepMatch(e.shiftKey ? -1 : 1);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeSearch();
    btnSearchToggle.focus();
  }
});

/* ================================================================
   Opening files
   ================================================================ */
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

/* ================================================================
   Start
   ?file=<link> opens a book: one of our own books (read from the lib
   site, wherever the link names it) or a book in the CSE's catalog (our
   copy, from the lib site); anything else is refused. #p=<page> opens
   it at a page.
   ================================================================ */
async function initApp() {
  void checkConnection();
  // In the app, ✕ returns to its home: a step back when opened from it (the history
  // stays home → this page, which the back button and the iOS swipe follow), else home
  // in place of this page. As in Daily Reflection.
  if (IN_APP) {
    btnClose.hidden = false;
    btnClose.addEventListener('click', () => {
      let fromApp = false;
      try { fromApp = history.length > 1 && !!document.referrer && new URL(document.referrer).origin === location.origin; } catch { /* no referrer */ }
      if (fromApp) history.back(); else window.location.replace('/index.html');
    });
  }

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
        const response = await fetch(own);
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
      copy = await LibCopy.open(link, fetch, (done, total) => setProgress('downloading', done, total), (c, text) => { parts[c] = parseBook(text); });
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

window.addEventListener('DOMContentLoaded', initApp);

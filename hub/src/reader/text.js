// The Reader (src/reader.src.html): its icons and fixed values.
/* ================================================================
   Icons and UI text
   ================================================================ */
const ICON = {
  stepForward: `<svg data-lucide="step-forward" viewBox="0 0 24 24"><path d="M10.029 4.285A2 2 0 0 0 7 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z"></path><path d="M3 4v16"></path></svg>`,
  stepBack: `<svg data-lucide="step-back" viewBox="0 0 24 24"><path d="M13.971 4.285A2 2 0 0 1 17 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z"></path><path d="M21 20V4"></path></svg>`,
  globeX: `<svg data-lucide="globe-x" viewBox="0 0 24 24"><path d="m16 3 5 5"></path><path d="M2 12h20A10 10 0 1 1 12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 4-10"></path><path d="m21 3-5 5"></path></svg>`,
  globeCheck: `<svg data-lucide="globe-check" viewBox="0 0 24 24"><path d="m15 6 2 2 4-4"></path><path d="M2 12h20A10 10 0 1 1 12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 4-10"></path></svg>`,
  trash: `<svg data-lucide="x" viewBox="0 0 24 24"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`
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
export { BLOCK_SEL, CURRENT_PAGE_LINE, ICON, PANEL_COVERS, PIN_MAX_MS, PIN_MS, PIN_SETTLE_MS, POSITIONS_MAX, QURAN_CLOSE, QURAN_OPEN, SAVE_DEBOUNCE_MS, SEARCH_DEBOUNCE_MS, SEARCH_LIST_MAX, SEARCH_MAX_MATCHES, SEARCH_MIN_CHARS, SNIPPET_CHARS, TEXT_SCALES, TOAST_MS, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP };

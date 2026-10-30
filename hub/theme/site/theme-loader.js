// i360 shared theme loader — https://theme.i36o.workers.dev/theme-loader.js
//
// One module for every i360 app. In the page, in this order:
//   1. the app's built-in fallback colours (node theme/fallbacks.js --css),
//   2. theme/early.js inlined (applies the saved theme and the saved copy of
//      theme.css before anything is drawn),
//   3. this loader: either bundled into the page (the hub's pages, by scripts/build.js,
//      and the i360إ app, by Vite — so it also works offline), or imported from the
//      theme site in a module script:
//        import * as theme from 'https://theme.i36o.workers.dev/theme-loader.js';
//        theme.init();
//
// init() applies the saved choice, fetches theme.css fresh (no-cache), and
// keeps a copy on the device for the next visit and for offline use. Without
// the site and without a copy, the app's fallback stays. A page whose <html>
// has data-i360-lock="light" (the i360إ app) always shows that theme.
//
// The choices (theme, and numerals: 0123 · ٠١٢٣ · ۰۱۲۳) are shared by every app
// on the same site (hub: the landing page, Daily Reflection, the Reader, the
// CSE) and follow changes made in another tab.

// Types, as JSDoc (read by the i360إ app's TypeScript directly, so they are written once, here).
/** @typedef {'system' | 'light' | 'sepia' | 'dark'} ThemeChoice */
/** @typedef {'light' | 'sepia' | 'dark'} ThemePalette */
/** @typedef {'western' | 'arabic' | 'persian'} Numerals */
/** @typedef {{ theme: Record<ThemeChoice, string>, numerals: Record<Numerals, string> }} ButtonLabels */
/** @typedef {{ skip?: string, attributes?: string[], attributeSkip?: string, numerals?: Numerals }} NumeralsOptions */

/** @type {readonly ThemeChoice[]} */
export const THEMES = ['system', 'light', 'sepia', 'dark'];   // the cycle order
/** @type {readonly Numerals[]} */
export const NUMERALS = ['western', 'arabic', 'persian'];      // 0123 · ٠١٢٣ · ۰۱۲۳ (the cycle order)
export const NUMERALS_KEY = 'i360.numerals';
export const CHOICE_KEY = 'i360.theme';
export const CACHE_KEY = 'i360.theme.css';
export const CSS_URL = new URL('theme.css', import.meta.url).href;

// The two buttons' text, the same on every i360 page and in the i360إ app (claude/i360-hub.md §3):
// the numerals button shows a sample of the choice (4–6, because 1–3 look the same in ٠١٢٣ and
// ۰۱۲۳), and each button's tooltip names the current choice and what a click switches to, in
// every language an i360 page offers. themeLabel() / numeralsLabel(): Arabic when a language has none.
/** @type {Readonly<Record<Numerals, string>>} */
export const NUMERALS_SAMPLE = Object.freeze({ western: '456', arabic: '٤٥٦', persian: '۴۵۶' });
/** @type {Readonly<Record<'ar' | 'en' | 'tr' | 'id' | 'ur', ButtonLabels>>} */
export const LABELS = Object.freeze({
  ar: {
    theme: { system: 'المظهر: حسب الجهاز (انقر للتبديل إلى فاتح)', light: 'المظهر: فاتح (انقر للتبديل إلى ورقي)', sepia: 'المظهر: ورقي (انقر للتبديل إلى داكن)', dark: 'المظهر: داكن (انقر للتبديل إلى حسب الجهاز)' },
    numerals: { western: 'الأرقام: غربية 456 (انقر للتبديل إلى العربية المشرقية ٤٥٦)', arabic: 'الأرقام: عربية مشرقية ٤٥٦ (انقر للتبديل إلى الفارسية/الأردية ۴۵۶)', persian: 'الأرقام: فارسية/أردية ۴۵۶ (انقر للتبديل إلى الغربية 456)' }
  },
  en: {
    theme: { system: 'Theme: follows this device (click for light)', light: 'Theme: light (click for sepia)', sepia: 'Theme: sepia (click for dark)', dark: 'Theme: dark (click to follow this device)' },
    numerals: { western: 'Numerals: Western 456 (click for Eastern Arabic ٤٥٦)', arabic: 'Numerals: Eastern Arabic ٤٥٦ (click for Persian/Urdu ۴۵۶)', persian: 'Numerals: Persian/Urdu ۴۵۶ (click for Western 456)' }
  },
  tr: {
    theme: { system: 'Tema: cihaza göre (açık için tıklayın)', light: 'Tema: açık (sepya için tıklayın)', sepia: 'Tema: sepya (koyu için tıklayın)', dark: 'Tema: koyu (cihaza göre için tıklayın)' },
    numerals: { western: 'Rakamlar: Batı 456 (Doğu Arap ٤٥٦ için tıklayın)', arabic: 'Rakamlar: Doğu Arap ٤٥٦ (Farsça/Urduca ۴۵۶ için tıklayın)', persian: 'Rakamlar: Farsça/Urduca ۴۵۶ (Batı 456 için tıklayın)' }
  },
  id: {
    theme: { system: 'Tema: mengikuti perangkat (klik untuk terang)', light: 'Tema: terang (klik untuk sepia)', sepia: 'Tema: sepia (klik untuk gelap)', dark: 'Tema: gelap (klik untuk mengikuti perangkat)' },
    numerals: { western: 'Angka: Barat 456 (klik untuk Arab Timur ٤٥٦)', arabic: 'Angka: Arab Timur ٤٥٦ (klik untuk Persia/Urdu ۴۵۶)', persian: 'Angka: Persia/Urdu ۴۵۶ (klik untuk Barat 456)' }
  },
  ur: {
    theme: { system: 'تھیم: آلے کے مطابق (روشن کے لیے کلک کریں)', light: 'تھیم: روشن (سیپیا کے لیے کلک کریں)', sepia: 'تھیم: سیپیا (تاریک کے لیے کلک کریں)', dark: 'تھیم: تاریک (آلے کے مطابق کے لیے کلک کریں)' },
    numerals: { western: 'اعداد: مغربی 456 (مشرقی عربی ٤٥٦ کے لیے کلک کریں)', arabic: 'اعداد: مشرقی عربی ٤٥٦ (فارسی/اردو ۴۵۶ کے لیے کلک کریں)', persian: 'اعداد: فارسی/اردو ۴۵۶ (مغربی 456 کے لیے کلک کریں)' }
  }
});
/** @param {string} lang @returns {ButtonLabels} */
const labelsFor = (lang) => LABELS[/** @type {keyof typeof LABELS} */ (lang)] || LABELS.ar;
/** The theme button's tooltip for a choice (system, light, sepia, dark). @param {ThemeChoice} choice @param {string} [lang] @returns {string} */
export function themeLabel(choice, lang = 'ar') { return labelsFor(lang).theme[choice] || ''; }
/** The numerals button's tooltip for a choice (western, arabic, persian). @param {Numerals} numerals @param {string} [lang] @returns {string} */
export function numeralsLabel(numerals, lang = 'ar') { return labelsFor(lang).numerals[numerals] || ''; }
const STYLE_ID = 'i360-theme';
const MAX_CSS = 256 * 1024;

const root = document.documentElement;
const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const listeners = new Set();
const numeralListeners = new Set();
let started = false;

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }   // private browsing, full storage
}

function lockedTheme() {
  const t = root.getAttribute('data-i360-lock');
  return THEMES.includes(t) ? t : null;
}

/** The saved choice: system, light, sepia or dark. @returns {ThemeChoice} */
export function getChoice() {
  const lock = lockedTheme();
  if (lock) return lock;
  const c = read(CHOICE_KEY);
  return THEMES.includes(c) ? c : 'system';
}

/** The palette shown now: light, sepia or dark. @param {ThemeChoice} [choice] @returns {ThemePalette} */
export function getTheme(choice = getChoice()) {
  if (choice !== 'system') return choice;
  return darkQuery && darkQuery.matches ? 'dark' : 'light';
}

function apply() {
  const choice = getChoice();
  const theme = getTheme(choice);
  const changed = root.getAttribute('data-theme') !== theme;
  root.setAttribute('data-theme', theme);
  for (const fn of listeners) {
    try { fn({ choice, theme, changed }); } catch (e) { console.error(e); }
  }
  return { choice, theme };
}

/** Save a choice and show it. Ignored when the page is locked. @param {ThemeChoice} choice @returns {{ choice: ThemeChoice, theme: ThemePalette }} */
export function setChoice(choice) {
  if (!THEMES.includes(choice)) throw new Error(`Unknown theme: ${choice}`);
  if (!lockedTheme()) write(CHOICE_KEY, choice);
  return apply();
}

/** Next choice in THEMES order (for a theme button). @returns {{ choice: ThemeChoice, theme: ThemePalette }} */
export function cycle() {
  const c = getChoice();
  return setChoice(THEMES[(THEMES.indexOf(c) + 1) % THEMES.length]);
}

/**
 * Called with { choice, theme, changed } whenever the theme is applied. Returns a function that stops it.
 * @param {(s: { choice: ThemeChoice, theme: ThemePalette, changed: boolean }) => void} fn
 * @returns {() => void}
 */
export function onChange(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/* ---------- Numerals: the second shared choice (display only) ---------- */

const DIGIT_ZERO = { western: 0x30, arabic: 0x0660, persian: 0x06F0 };

/** The saved numerals: western (0123), arabic (٠١٢٣) or persian (۰۱۲۳, also Urdu). @returns {Numerals} */
export function getNumerals() {
  const n = read(NUMERALS_KEY);
  return NUMERALS.includes(n) ? n : 'western';
}

/** Every digit in text (Western, Arabic-Indic or Persian) written in the given numerals. @param {string} text @param {Numerals} [numerals] @returns {string} */
export function toNumerals(text, numerals = getNumerals()) {
  const zero = DIGIT_ZERO[numerals] || DIGIT_ZERO.western;
  return String(text).replace(/[0-9\u0660-\u0669\u06F0-\u06F9]/g, (d) => {
    const c = d.charCodeAt(0);
    const v = c >= 0x06F0 ? c - 0x06F0 : c >= 0x0660 ? c - 0x0660 : c - 0x30;
    return String.fromCharCode(zero + v);
  });
}

function applyNumerals() {
  const numerals = getNumerals();
  for (const fn of numeralListeners) {
    try { fn({ numerals }); } catch (e) { console.error(e); }
  }
  return { numerals };
}

/** Save the numerals choice and tell the page. @param {Numerals} numerals @returns {{ numerals: Numerals }} */
export function setNumerals(numerals) {
  if (!NUMERALS.includes(numerals)) throw new Error(`Unknown numerals: ${numerals}`);
  write(NUMERALS_KEY, numerals);
  return applyNumerals();
}

/** Next numerals in NUMERALS order (for a numerals button). @returns {{ numerals: Numerals }} */
export function cycleNumerals() {
  const n = getNumerals();
  return setNumerals(NUMERALS[(NUMERALS.indexOf(n) + 1) % NUMERALS.length]);
}

/**
 * Called with { numerals } whenever the choice changes (here or in another tab). Returns a function that stops it.
 * @param {(s: { numerals: Numerals }) => void} fn
 * @returns {() => void}
 */
export function onNumeralsChange(fn) {
  numeralListeners.add(fn);
  return () => { numeralListeners.delete(fn); };
}

/* ---------- Numerals on a page: every digit shown, in the chosen numerals (display only) ---------- */
// The one way every i360 page and the app writes its digits. Each caller says what to leave
// alone: `skip`, a selector whose text keeps its digits (what the visitor types, code, the
// numerals button's own samples…); `attributes`, attribute names converted too (tooltips,
// placeholders), except under `attributeSkip` (default: `skip`).

const ANY_DIGIT = /[0-9\u0660-\u0669\u06F0-\u06F9]/;

/** @param {Text} node @param {string} skip @param {Numerals} numerals */
function convertText(node, skip, numerals) {
  const parent = node.parentElement;
  if (!parent || (skip && parent.closest(skip))) return;
  const v = node.nodeValue;
  if (!v || !ANY_DIGIT.test(v)) return;
  const next = toNumerals(v, numerals);
  if (next !== v) node.nodeValue = next;   // same length: positions in the text stay valid
}

/** @param {Element} el @param {string[]} attributes @param {string} skip @param {Numerals} numerals */
function convertAttributes(el, attributes, skip, numerals) {
  if (!attributes.length || (skip && el.closest(skip))) return;
  for (const name of attributes) {
    const v = el.getAttribute(name);
    if (v === null || !ANY_DIGIT.test(v)) continue;
    const next = toNumerals(v, numerals);
    if (next !== v) el.setAttribute(name, next);
  }
}

/**
 * Writes every digit under `root` (a text node or an element, itself included) in the given
 * numerals (default: the saved choice).
 * @param {Node | null} root
 * @param {NumeralsOptions} [options]
 */
export function convertNumerals(root, { skip = '', attributes = [], attributeSkip = skip, numerals = getNumerals() } = {}) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) { convertText(/** @type {Text} */ (root), skip, numerals); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  convertAttributes(/** @type {Element} */ (root), attributes, attributeSkip, numerals);
  const walker = document.createTreeWalker(root, attributes.length ? NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT : NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) convertText(/** @type {Text} */ (n), skip, numerals);
    else convertAttributes(/** @type {Element} */ (n), attributes, attributeSkip, numerals);
  }
}

/**
 * Keeps everything under `root` in the saved numerals: now, as text is added or changed, and
 * whenever the choice changes. Returns a function that stops it.
 * @param {Node} root
 * @param {Omit<NumeralsOptions, 'numerals'>} [options]
 * @returns {() => void}
 */
export function watchNumerals(root, options = {}) {
  const { skip = '', attributes = [], attributeSkip = skip } = options;
  const observer = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') convertText(/** @type {Text} */ (m.target), skip, getNumerals());
      else if (m.type === 'attributes') convertAttributes(/** @type {Element} */ (m.target), attributes, attributeSkip, getNumerals());
      else m.addedNodes.forEach((n) => convertNumerals(n, options));
    }
  });
  observer.observe(root, {
    childList: true,
    characterData: true,
    subtree: true,
    ...(attributes.length ? { attributes: true, attributeFilter: attributes } : {})
  });
  convertNumerals(root, options);
  const stop = onNumeralsChange(() => convertNumerals(root, options));
  return () => { observer.disconnect(); stop(); };
}

// Relative font addresses in theme.css point at this site, not at the page.
function absolutize(css) {
  return css.replace(/url\(\s*(['"]?)(?![a-z][a-z0-9+.-]*:|\/|#)([^'")]+)\1\s*\)/gi,
    (m, q, u) => `url(${q}${new URL(u, CSS_URL).href}${q})`);
}

function styleElement() {
  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);   // after the app's fallback, so it wins
  }
  return el;
}

function cached() {
  try {
    const c = JSON.parse(read(CACHE_KEY));
    return c && c.url === CSS_URL && typeof c.css === 'string' ? c.css : null;
  } catch { return null; }
}

/**
 * Start: apply the theme, follow device and other-tab changes, refresh theme.css.
 * Resolves to { choice, theme, source } — source is "network", "cache" or "fallback". Never rejects.
 * @returns {Promise<{ choice: ThemeChoice, theme: ThemePalette, source: 'network' | 'cache' | 'fallback' }>}
 */
export async function init() {
  const state = apply();
  if (!started) {
    started = true;
    if (darkQuery) darkQuery.addEventListener('change', () => { if (getChoice() === 'system') apply(); });
    window.addEventListener('storage', e => {
      if (e.key === CHOICE_KEY) apply();
      if (e.key === NUMERALS_KEY) applyNumerals();
    });
  }

  const copy = cached();
  const existing = document.getElementById(STYLE_ID);
  if (copy && (!existing || existing.textContent !== copy)) styleElement().textContent = copy;
  let source = copy ? 'cache' : 'fallback';

  try {
    const res = await fetch(CSS_URL, { cache: 'no-cache', mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error(`theme.css: HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > MAX_CSS || !text.includes('--i360-bg')) throw new Error('theme.css: unexpected content');
    const css = absolutize(text);
    const el = styleElement();
    if (el.textContent !== css) el.textContent = css;
    if (css !== copy) write(CACHE_KEY, JSON.stringify({ url: CSS_URL, css }));
    source = 'network';
  } catch (e) {
    console.warn('i360 theme: using the', source === 'cache' ? 'saved copy' : "page's own colours", '—', e.message);
  }
  return { ...state, source };
}

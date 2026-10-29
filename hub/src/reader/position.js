// The Reader: the toast, the reading position kept per book, links to a page (#p=…), and
// page bookmarks.
import { IN_APP } from '../page-chrome.js';
import { POSITIONS_MAX, SAVE_DEBOUNCE_MS, TOAST_MS } from './text.js';
import { btnBookmark, sidePanel, state, storeGet, storeSet, t, toWestern, toastEl } from './state.js';
import { captureAnchor, restoreAnchor } from './view.js';
import { findCurrentIdx, findPage, scrollToSheet, updateCounter } from './nav.js';
import { renderPanel } from './panel.js';

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
// Saves the position once scrolling has paused.
function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, SAVE_DEBOUNCE_MS);
}

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

// What this part hooks up as the page loads; main.js calls it, in the page's order.
function wirePosition() {
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });

  window.addEventListener('hashchange', () => {
    if (!isLinkable()) return;
    const idx = hashTargetIdx();
    if (idx >= 0) { scrollToSheet(idx); updateCounter(true); }
  });

  btnBookmark.addEventListener('click', toggleBookmark);
}

export { applyBookmarkRibbons, bookmarkedSet, copyPageLink, hashTargetIdx, isLinkable, queueSave, removeBookmarkAt, restorePosition, saveNow, shareLink, updateBookmarkButton, wirePosition };

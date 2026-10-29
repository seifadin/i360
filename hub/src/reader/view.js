// The Reader: interface language and direction; numerals, theme and text size; page width
// and zoom.
import * as i360Theme from '../../theme/site/theme-loader.js';
import { THEME_ICONS } from '../page-chrome.js';
import { oncePerFrame } from '../frame.js';
import { ICON, TEXT_SCALES, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from './text.js';
import { btnClose, btnCopyLink, btnDirToggle, btnExitReading, btnFitPage, btnFitWidth, btnMore, btnNavLeft, btnNavRight, btnNumerals, btnOpenFile, btnPanel, btnPanelClose, btnReading, btnScan, btnSearchClose, btnSearchList, btnSearchNext, btnSearchPrev, btnSearchToggle, btnTextLarger, btnTextSmaller, btnTheme, btnZoomIn, btnZoomOut, emptyState, fmtNum, lang, lblOf, missingPagesBanner, moreMenu, optDiacritics, optWord, pageNumInput, pagesWrapper, search, searchInput, searchPopup, setTitle, sidePanel, state, storeSet, t, tabBookmarks, tabContents, tbTitle, updateConnection, viewerContainer, volSelect } from './state.js';
import { applyBlockDirs, applyNumerals, pageLabelText, queueNear, renderNotices } from './pages.js';
import { updateBookmarkButton } from './position.js';
import { buildVolumeSelect, findCurrentIdx, pinElement, scrollToSheet, updateCounter } from './nav.js';
import { queueFitToolbar, renderPanel } from './panel.js';
import { performSearch, updateSearchCountDisplay } from './search.js';

/* ================================================================
   Localization and direction
   ================================================================ */
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
  btnNumerals.textContent = i360Theme.NUMERALS_SAMPLE[state.numerals];
  setTitle(btnNumerals, i360Theme.numeralsLabel(state.numerals, lang()));
  btnTheme.innerHTML = THEME_ICONS[state.theme];
  setTitle(btnTheme, i360Theme.themeLabel(state.theme, lang()));
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

/* ================================================================
   Numerals, theme, text size — saved on this device
   ================================================================ */

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

const queueResize = oncePerFrame(() => {
  const anchor = captureAnchor();
  updatePageWidth();
  restoreAnchor(anchor);
});

// What this part hooks up as the page loads; main.js calls it, in the page's order.
function wireView() {
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

  btnTextSmaller.addEventListener('click', () => stepTextScale(-1));
  btnTextLarger.addEventListener('click', () => stepTextScale(1));

  btnZoomIn.addEventListener('click', () => setZoom(state.zoom + ZOOM_STEP));
  btnZoomOut.addEventListener('click', () => setZoom(state.zoom - ZOOM_STEP));
  btnFitWidth.addEventListener('click', fitWidth);
  btnFitPage.addEventListener('click', fitPage);
  // Anything that moves the pages (zoom, text size, a page filling in, fonts) re-checks which are near.
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => queueNear()).observe(pagesWrapper);
  window.addEventListener('resize', () => {
    queueNear();
    queueResize();
  });
}

export { applyLocalization, captureAnchor, remPx, restoreAnchor, setTextScale, setZoom, updatePageWidth, wireView };

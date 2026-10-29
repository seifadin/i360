// The Reader: our copy of a book from the lib site (its scan on archive.org), and the empty page.
import * as LibCopy from '../lib-copy.js';
import { btnCopyLink, btnScan, pagesWrapper, search, sidePanel, state } from './state.js';
import { cancelBuild, hideProgress, setSearchReady } from './pages.js';
import { isLinkable, saveNow, shareLink } from './position.js';
import { applyLocalization } from './view.js';
import { buildVolumeSelect, updateCounter } from './nav.js';
import { queueFitToolbar, renderPanel } from './panel.js';
import { clearSearch } from './search.js';

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

function renderEmpty(notices) {
  cancelBuild();              // stops an unfinished build
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

// What this part hooks up as the page loads; main.js calls it, in the page's order.
function wireLibrary() {
  // Pages of our copy are the scan's pages, in order: position n is scan page n.
  btnScan.addEventListener('click', () => {
    const url = LibCopy.scanLink(state.libSource, Math.max(0, state.currentIdx), state.libBooks);
    if (url) window.open(url, '_blank', 'noopener');
  });
}

export { renderEmpty, updateScanButton, wireLibrary };

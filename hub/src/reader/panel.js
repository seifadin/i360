// The Reader: the side panel (contents, bookmarks), reading mode, the toolbar's layout by
// measurement, and keyboard shortcuts.
import { oncePerFrame } from '../frame.js';
import { fittingToolbar } from '../page-chrome.js';
import { ICON, PANEL_COVERS, ZOOM_STEP } from './text.js';
import { btnCopyLink, btnExitReading, btnMore, btnPanel, btnPanelClose, btnReading, fmtNum, moreMenu, nextFrame, panelBody, searchPopup, setTitle, sidePanel, state, t, tabBookmarks, tabContents, tbEnd, toolbar, viewerContainer } from './state.js';
import { isBuilding, pageLabelText } from './pages.js';
import { bookmarkedSet, copyPageLink, removeBookmarkAt } from './position.js';
import { captureAnchor, remPx, restoreAnchor, setZoom } from './view.js';
import { goEdge, goPage, leftDelta, pinElement, scrollToSheet, updateCounter } from './nav.js';
import { closeSearch, openSearch } from './search.js';

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
// What folds away, in order (fittingToolbar, src/page-chrome.js; the slots are in the Reader's HTML).
const fit = fittingToolbar({
  bar: toolbar,
  fold: [
    /* 1 */ { items: ['group-text'], to: 'text' },
    /* 2 */ { items: ['group-zoom'], to: 'zoom' },
    /* 3 */ { items: ['group-mark', 'group-acts'], to: 'actions', flag: 'acts-folded' },
    /* 4 */ { flag: 'notitle' },
    /* 5 */ { items: ['status-icon', 'btn-open-file', 'btn-search-toggle'], to: 'fold-row', flag: 'folded' },
    /* 6 */ { flag: 'nopos' },
    /* 7 */ { dense: 1 },
    /* 8 */ { flag: 'no-total' },
    /* 9 */ { items: ['vol-select'], to: 'volume' },
    /* 10 */ { dense: 2 },
    /* 11 */ { items: ['btn-copy-link'], to: 'copy-link' }
  ]
});

// Measured before the browser paints, so the switch is never seen.
function fitToolbar() {
  if (!document.body.classList.contains('reading')) fit();
}

const queueFitToolbar = oncePerFrame(() => fitToolbar());

function closeMore() {
  moreMenu.hidden = true;
  btnMore.setAttribute('aria-expanded', 'false');
  btnMore.setAttribute('aria-pressed', 'false');
}

/* ================================================================
   Keyboard shortcuts
   ================================================================ */

// What this part hooks up as the page loads; main.js calls it, in the page's order.
function wirePanel() {
  btnPanel.addEventListener('click', () => {
    if (sidePanel.classList.contains('open')) closePanel(); else openPanel();
  });
  btnPanelClose.addEventListener('click', closePanel);
  tabContents.addEventListener('click', () => { state.panelTab = 'contents'; renderPanel(); });
  tabBookmarks.addEventListener('click', () => { state.panelTab = 'bookmarks'; renderPanel(); });
  btnCopyLink.addEventListener('click', copyPageLink);

  btnReading.addEventListener('click', enterReading);
  btnExitReading.addEventListener('click', exitReading);
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) exitReading();
  });

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
}

export { closeMore, fitToolbar, queueFitToolbar, renderPanel, wirePanel };

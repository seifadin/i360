// The Reader: the side panel (contents, bookmarks), reading mode, the toolbar's layout by
// measurement, and keyboard shortcuts.
import { oncePerFrame } from '../frame.js';
import { ICON, PANEL_COVERS, ZOOM_STEP } from './text.js';
import { $, btnCopyLink, btnExitReading, btnMore, btnOpenFile, btnPanel, btnPanelClose, btnReading, btnSearchToggle, fmtNum, moreMenu, nextFrame, panelBody, searchPopup, setTitle, sidePanel, state, statusIcon, t, tabBookmarks, tabContents, tbEnd, tbMain, tbStart, toolbar, viewerContainer, volSelect } from './state.js';
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

// The Reader: search within the book (src/search-core.js).
import * as SearchCore from '../search-core.js';
import { BLOCK_SEL, SEARCH_DEBOUNCE_MS, SEARCH_LIST_MAX, SEARCH_MAX_MATCHES, SEARCH_MIN_CHARS, SNIPPET_CHARS } from './text.js';
import { btnSearchClose, btnSearchList, btnSearchNext, btnSearchPrev, btnSearchToggle, fmtNum, nextFrame, optDiacritics, optWord, search, searchCount, searchInput, searchPopup, searchResults, state, storeSet, t, viewerContainer } from './state.js';
import { isBuilding, pageLabelText } from './pages.js';
import { findCurrentIdx, pinElement, scrollToSheet } from './nav.js';
import { closeMore } from './panel.js';

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

// What this part hooks up as the page loads; main.js calls it, in the page's order.
function wireSearch() {
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
}

export { clearSearch, closeSearch, openSearch, performSearch, rerunSearch, setOption, updateSearchCountDisplay, wireSearch };

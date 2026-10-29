// The Reader: the page counter and moving between pages (holding a jump in place), and
// footnote links.
import { oncePerFrame } from '../frame.js';
import { CURRENT_PAGE_LINE, PIN_MAX_MS, PIN_MS, PIN_SETTLE_MS } from './text.js';
import { btnNavLeft, btnNavRight, fmtNum, pageNumInput, pagePos, pagesWrapper, setTitle, state, t, toWestern, totalPagesLabel, viewerContainer, volSelect } from './state.js';
import { updateNear } from './pages.js';
import { queueSave, updateBookmarkButton } from './position.js';
import { remPx } from './view.js';
import { queueFitToolbar } from './panel.js';

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

const queueScroll = oncePerFrame(() => { updateNear(); updateCounter(false); });

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

// What this part hooks up as the page loads; main.js calls it, in the page's order.
function wireNav() {
  volSelect.addEventListener('change', () => {
    const idx = state.pages.findIndex((p) => p.vol === volSelect.value);
    if (idx >= 0) { scrollToSheet(idx); updateCounter(true); }
    volSelect.blur();
  });
  viewerContainer.addEventListener('scroll', () => {
    if (!queueScroll()) return;
    queueSave();
  }, { passive: true });

  for (const ev of ['wheel', 'touchstart', 'pointerdown']) {
    viewerContainer.addEventListener(ev, releasePin, { passive: true });
  }
  // Capture phase: a key releases the old pin before its own jump sets a new one.
  document.addEventListener('keydown', releasePin, true);
  btnNavLeft.addEventListener('click', () => goPage(leftDelta()));
  btnNavRight.addEventListener('click', () => goPage(-leftDelta()));

  pageNumInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); goToInput(); }
    else if (e.key === 'Escape') { pageNumInput.blur(); updateCounter(true); }
  });
  pageNumInput.addEventListener('change', goToInput);
  pageNumInput.addEventListener('focus', () => pageNumInput.select());

  pagesWrapper.addEventListener('click', (e) => {
    const a = e.target.closest('a.fn-ref, a.fn-back');
    if (!a) return;
    e.preventDefault();
    const target = document.getElementById(a.dataset.target);
    if (target) revealElement(target);
  });
}

export { buildVolumeSelect, findCurrentIdx, findPage, goEdge, goPage, leftDelta, pinElement, scrollToSheet, updateCounter, volumeTotals, wireNav };

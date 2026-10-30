// What the frame of every hub page shares (Daily Reflection, the Reader, the CSE;
// claude/i360-hub.md §10 "Toolbars"): `$`, whether it runs inside the installed i360إ app,
// the ✕ that returns to the app's home, and the theme button's icons. Bundled into
// each page by scripts/build.js.

// A page element by its id.
export const $ = (id) => document.getElementById(id);

// Inside the installed i360إ app: Capacitor's bridge is in every page it serves.
export const IN_APP = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());

// In the app, ✕ returns to its home: back to it when the page was opened from it (the
// history stays home → this page, which the back button and the iOS edge swipe follow),
// else home in place of this page. stepsBack: how many history entries lead back to home
// (the CSE adds one per search it made). Outside the app, the ✕ stays hidden.
export function setupClose(button, stepsBack = () => 1) {
  if (!IN_APP) return;
  button.hidden = false;
  button.addEventListener('click', () => {
    let fromApp = false;
    try { fromApp = window.history.length > 1 && !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch { /* no referrer */ }
    if (fromApp) window.history.go(-stepsBack()); else window.location.replace('/index.html');
  });
}

// The theme button's icon for each choice (Lucide; npm run icons checks them).
export const THEME_ICONS = Object.freeze({
  system: '<svg data-lucide="monitor" viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg>',
  light: '<svg data-lucide="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>',
  sepia: '<svg data-lucide="coffee" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2v2"></path><path d="M14 2v2"></path><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"></path><path d="M6 2v2"></path></svg>',
  dark: '<svg data-lucide="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path></svg>'
});

/* ---------- A toolbar that fits by measurement (claude/i360-hub.md §10 "Toolbars") ----------
   A bar lists what it folds away when room runs out, in order: `fold`, one entry per level. Level n
   = the first n entries folded. fit() tries level 0, 1, 2… with every button at its narrowest
   (--toolbar-btn-min, src/page-chrome.css) and keeps the first level whose row fits; then every
   button narrower than the bar is high widens, evenly, into the room left. Measured, never tied to
   screen widths, so it follows the language, labels, numerals and text size. An entry may:
     items: ['id', …]  move these (a group, a button…) to the slot `to` while folded, in this order,
                       and back to where the page has them while not
     to: 'name'        that slot: <template data-slot="name"> inside the bar (or its ⋮ menu)
     flag: 'name'      set this class on the bar while folded (for the page's own CSS: hide a title…)
     dense: 1 | 2      the bar's last levels: toolbar-dense, then toolbar-densest (src/page-chrome.css)
   A bar without `fold` only widens its buttons. */

// An element that takes part in the row: shown, and not floating over it (a menu, a popup).
function inRow(el) {
  if (el.hidden) return false;
  const cs = getComputedStyle(el);
  return cs.display !== 'none' && cs.position !== 'absolute' && cs.position !== 'fixed';
}

// Returns fit(); call it whenever the bar's width or contents change (at most once a frame).
export function fittingToolbar({ bar, fold = [] }) {
  const DENSE = ['toolbar-dense', 'toolbar-densest'];
  // Each entry's changes, made once here: (folded) => void.
  const levels = fold.map(({ items = [], to, flag, dense }) => {
    const changes = [];
    if (items.length) {
      const slot = bar.querySelector(`template[data-slot="${to}"]`);
      if (!slot) throw new Error(`toolbar: no slot "${to}"`);
      for (const id of items) {
        const el = document.getElementById(id);
        const home = document.createComment(id);   // where the page has it
        el.parentNode.insertBefore(home, el);
        changes.push((folded) => {
          if (folded) { if (el.nextSibling !== slot) slot.parentNode.insertBefore(el, slot); }
          else if (home.nextSibling !== el) home.parentNode.insertBefore(el, home.nextSibling);
        });
      }
    }
    if (flag) changes.push((folded) => bar.classList.toggle(flag, folded));
    if (dense) changes.push((folded) => bar.classList.toggle(DENSE[dense - 1], folded));
    return changes;
  });
  const done = levels.map(() => null);
  const setLevel = (level) => levels.forEach((changes, i) => {
    const folded = i < level;
    if (done[i] === folded) return;
    done[i] = folded;
    for (const change of changes) change(folded);
  });

  // The room left in the row (negative: it doesn't fit). A part that grows to fill the bar
  // counts its content (with its padding), not the room it was given.
  const roomLeft = () => {
    const cs = getComputedStyle(bar);
    const parts = [...bar.children].filter(inRow);
    let need = (parseFloat(cs.columnGap) || 0) * Math.max(0, parts.length - 1);
    for (const part of parts) {
      const ps = getComputedStyle(part);
      if (parseFloat(ps.flexGrow) > 0) {
        const range = document.createRange();
        range.selectNodeContents(part);
        need += range.getBoundingClientRect().width + parseFloat(ps.paddingLeft) + parseFloat(ps.paddingRight);
      } else need += part.getBoundingClientRect().width;
    }
    return bar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - need;
  };

  const setWidth = (value) => bar.style.setProperty('--toolbar-btn-w', value);

  // Every button narrower than the bar is high widens to one width, as far as the room allows:
  // the buttons' widths at their narrowest, filled up evenly from the narrowest one.
  const widen = (room) => {
    const buttons = [...bar.querySelectorAll('.toolbar-btn')].filter((b) => b.offsetParent && !b.closest('.toolbar-menu'));
    if (!buttons.length || room <= 0) return;
    const narrow = buttons.map((b) => b.getBoundingClientRect().width).sort((a, b) => a - b);
    setWidth('var(--toolbar-h)');
    const widest = Math.min(...buttons.map((b) => b.getBoundingClientRect().width));
    let width = widest, sum = 0;
    for (let k = 0; k < narrow.length; k++) {
      sum += narrow[k];
      const even = (room + sum) / (k + 1);   // the first k + 1 buttons at one width
      if (k + 1 === narrow.length || even <= narrow[k + 1]) { width = Math.min(widest, even); break; }
    }
    // A tenth of a pixel less, so the widened row never overflows by a fraction.
    setWidth(`${Math.floor(width * 10) / 10}px`);
  };

  return function fit() {
    setWidth('var(--toolbar-btn-min)');
    let room = 0;
    for (let level = 0; level <= levels.length; level++) {
      setLevel(level);
      room = roomLeft();
      if (room >= 0) break;
    }
    widen(room);
  };
}

// What the frame of every hub page shares (Daily Reflection, the Reader, the CSE;
// claude/i360-hub.md §10 "Toolbars"): whether it runs inside the installed i360إ app,
// the ✕ that returns to the app's home, and the theme button's icons. Bundled into
// each page by scripts/build.js.

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
    try { fromApp = history.length > 1 && !!document.referrer && new URL(document.referrer).origin === location.origin; } catch { /* no referrer */ }
    if (fromApp) history.go(-stepsBack()); else window.location.replace('/index.html');
  });
}

// The theme button's icon for each choice (Lucide; npm run icons checks them).
export const THEME_ICONS = Object.freeze({
  system: '<svg data-lucide="monitor" viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg>',
  light: '<svg data-lucide="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>',
  sepia: '<svg data-lucide="coffee" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2v2"></path><path d="M14 2v2"></path><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"></path><path d="M6 2v2"></path></svg>',
  dark: '<svg data-lucide="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path></svg>'
});

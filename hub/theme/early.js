// i360 theme, early part: inlined in each app's <head> (not served), after the
// app's fallback colours and before anything is drawn. It shows the saved
// theme and the saved copy of theme.css at once, so a repeat visit has no
// flash of the wrong colours. theme-loader.js does the rest.
// Plain ES5 on purpose: it must run in any browser that can show the page.
// Keep in step with CHOICE_KEY, CACHE_KEY and THEMES in site/theme-loader.js.
(function () {
  var root = document.documentElement, themes = ['system', 'light', 'sepia', 'dark'];
  var c = root.getAttribute('data-i360-lock');
  if (themes.indexOf(c) < 0) {
    try { c = localStorage.getItem('i360.theme'); } catch (e) { c = null; }
  }
  if (themes.indexOf(c) < 0) c = 'system';
  if (c === 'system') {
    c = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', c);
  try {
    var k = JSON.parse(localStorage.getItem('i360.theme.css'));
    if (k && typeof k.css === 'string') {
      var s = document.createElement('style');
      s.id = 'i360-theme';
      s.textContent = k.css;
      document.head.appendChild(s);
    }
  } catch (e) { /* no copy yet: the page's own colours */ }
})();

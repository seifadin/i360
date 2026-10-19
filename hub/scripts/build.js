// Builds the self-contained pages:
//   public-hub/index.html      the hub's landing page (from src/hub.src.html)
//   public-hub/md/index.html   the Reader    (from src/reader.src.html)
//   public-hub/cse/index.html  the i360 CSE  (from src/cse.src.html)
//   public-hub/day/index.html  Daily Reflection (src/day.html; only the shared theme is filled in)
//
//   npm run build
//
// Placeholders, each filled once:
//   /*@@MARKED@@*/       marked (pinned in package.json), inlined so the
//                        reader works offline and can't change under us
//   /*@@BOOK_FORMAT@@*/  src/book-format.js, the book format shared with the CSE indexer
//   /*@@SEARCH_CORE@@*/  src/search-core.js, the search shared by both pages and the indexer
//   /*@@CSE_INDEX@@*/    src/cse-index.js, the index format shared with the indexer
//   /*@@CSE_VIEW@@*/     src/cse-view.js, what the CSE page shows for a result
//   /*@@LIB_COPY@@*/     src/lib-copy.js, our copies of indexed books on the lib site (Reader)
//   /*@@THEME_FALLBACK@@*/  the shared theme's colours, plain (theme/fallbacks.js),
//                        used until theme.css arrives and whenever it can't
//   /*@@THEME_EARLY@@*/  theme/early.js: the saved theme before anything is drawn
//   /*@@THEME_LOADER@@*/ theme/site/theme-loader.js turned into a plain script
//                        (window.i360Theme), built in so the theme button works offline
//   /*@@THEME_ORIGIN@@*/ the theme site's address (I360_THEME_ORIGIN to test
//                        against another one)
//   /*@@HIJRI_CALC@@*/   hijri/calc.js, the shared Hijri calculator (Daily Reflection)
//   /*@@HIJRI_CLIENT@@*/ hijri/client.js, the dar-hijri Worker's client (Daily Reflection)
//   <!--@@CSP@@-->       a Content-Security-Policy allowing only the page's
//                        own inline scripts (by hash), so it must be made
//                        after everything else is in place
// Editing the built pages by hand breaks those hashes: edit src/ and rebuild.
'use strict';
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { join, dirname } = require('node:path');

const root = join(__dirname, '..');
const read = (p) => readFileSync(p, 'utf8');
const { fallbackCss } = require('../theme/fallbacks.js');

// The shared theme site: theme.css, the fonts (and the hosted copy of the loader).
const THEME_ORIGIN = process.env.I360_THEME_ORIGIN || 'https://theme.i36o.workers.dev';
if (!/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(THEME_ORIGIN)) throw new Error(`I360_THEME_ORIGIN must be a bare origin, got "${THEME_ORIGIN}"`);

// theme-loader.js is an ES module (it is also served as one). Built in, it
// becomes a plain script: its exports are gathered on window.i360Theme and its
// own address is the theme site's, so theme.css and the fonts come from there.
function themeLoaderScript() {
  const src = read(join(root, 'theme/site/theme-loader.js'));
  const names = [...src.matchAll(/^export (?:async\s+)?(?:function|const)\s+(\w+)/gm)].map((m) => m[1]);
  const code = src.replace(/^export /gm, '').replace(/import\.meta\.url/g, JSON.stringify(`${THEME_ORIGIN}/theme-loader.js`));
  if (/^\s*(import|export)\b/m.test(code)) throw new Error('theme-loader.js: an import/export the build cannot turn into a plain script');
  return `(function () {\n'use strict';\n${code}\nwindow.i360Theme = Object.freeze({ ${names.join(', ')} });\n})();`;
}
const theme = {
  fallback: fallbackCss(read(join(root, 'theme/site/theme.css'))),
  early: { code: read(join(root, 'theme/early.js')), name: 'theme/early.js' },
  loader: { code: themeLoaderScript(), name: 'theme-loader.js (built in)' }
};

function inlineScript(code, name) {
  if (/<\/script/i.test(code)) throw new Error(`${name} contains "</script": it can't be inlined`);
  return code;
}

// Each placeholder must appear exactly once; replaced by function, so "$"
// in the inlined code is taken literally.
function fill(html, placeholder, value) {
  const count = html.split(placeholder).length - 1;
  if (count !== 1) throw new Error(`placeholder ${placeholder} found ${count} times (expected 1)`);
  return html.replace(placeholder, () => value);
}

// Only the page's own inline scripts may run; no external scripts, plugins
// or images; fonts from the theme site; fetches only where connectSrc allows
// (plus theme.css from the theme site).
function buildPage({ src, out, scripts, connectSrc }) {
  let html = read(join(root, src));
  html = fill(html, '/*@@THEME_FALLBACK@@*/', theme.fallback);
  html = fill(html, '/*@@THEME_ORIGIN@@*/', THEME_ORIGIN);
  scripts = [['/*@@THEME_EARLY@@*/', theme.early], ['/*@@THEME_LOADER@@*/', theme.loader], ...scripts];
  for (const [placeholder, file] of scripts) html = fill(html, placeholder, inlineScript(file.code, file.name));
  if (/fonts\.googleapis|fonts\.gstatic/.test(html)) throw new Error(`${src}: Google Fonts left in the page: fonts come from the theme site`);
  if (connectSrc !== '*') connectSrc = connectSrc === "'none'" ? THEME_ORIGIN : `${THEME_ORIGIN} ${connectSrc}`;
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((m) => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  if (/<script\b[^>]*\bsrc=/i.test(html.replace(/<script>[\s\S]*?<\/script>/g, ''))) {
    throw new Error(`${src}: external <script src> found: the CSP would block it`);
  }
  const csp = [
    "default-src 'none'",
    `script-src ${hashes.join(' ') || "'none'"}`,
    "style-src 'unsafe-inline'",
    `font-src ${THEME_ORIGIN}`,
    `connect-src ${connectSrc}`,
    "img-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'"
  ].join('; ');
  html = fill(html, '<!--@@CSP@@-->', `<meta http-equiv="Content-Security-Policy" content="${csp}">`);
  mkdirSync(dirname(join(root, out)), { recursive: true });
  writeFileSync(join(root, out), html);
  console.log(`${out}: ${html.length} chars, ${hashes.length} scripts hashed`);
}

const file = (p, name) => ({ code: read(join(root, p)), name: name || p.split('/').pop() });

// marked's package exports don't list this file, so it's read by path.
const marked = {
  code: read(join(root, 'node_modules/marked/lib/marked.umd.js')).replace('//# sourceMappingURL=marked.umd.js.map', '').trim(),
  name: 'marked'
};

// The Reader: ?file= may fetch from anywhere.
buildPage({
  src: 'src/reader.src.html',
  out: 'public-hub/md/index.html',
  scripts: [
    ['/*@@MARKED@@*/', marked],
    ['/*@@BOOK_FORMAT@@*/', file('src/book-format.js')],
    ['/*@@SEARCH_CORE@@*/', file('src/search-core.js')],
    ['/*@@LIB_COPY@@*/', file('src/lib-copy.js')]
  ],
  connectSrc: '*'
});

// The CSE page: reads only the lib site (and, for testing on this computer,
// a local copy of the build: ?data=http://localhost:…).
buildPage({
  src: 'src/cse.src.html',
  out: 'public-hub/cse/index.html',
  scripts: [
    ['/*@@SEARCH_CORE@@*/', file('src/search-core.js')],
    ['/*@@CSE_INDEX@@*/', file('src/cse-index.js')],
    ['/*@@CSE_VIEW@@*/', file('src/cse-view.js')]
  ],
  connectSrc: 'https://lib.i36o.workers.dev http://localhost:* http://127.0.0.1:*'
});

// The hub's landing page: links to the three apps and the theme button.
buildPage({ src: 'src/hub.src.html', out: 'public-hub/index.html', scripts: [], connectSrc: "'none'" });

// Daily Reflection («التأمل اليومي», at /day/) loads Tailwind and FontAwesome from their own
// sites, so it has no hash-based CSP: only the shared theme and the shared Hijri files are filled in.
{
  let html = read(join(root, 'src/day.html'));
  html = fill(html, '/*@@THEME_FALLBACK@@*/', theme.fallback);
  html = fill(html, '/*@@THEME_ORIGIN@@*/', THEME_ORIGIN);
  html = fill(html, '/*@@THEME_EARLY@@*/', inlineScript(theme.early.code, theme.early.name));
  html = fill(html, '/*@@THEME_LOADER@@*/', inlineScript(theme.loader.code, theme.loader.name));
  html = fill(html, '/*@@HIJRI_CALC@@*/', inlineScript(read(join(root, 'hijri/calc.js')), 'hijri/calc.js'));
  html = fill(html, '/*@@HIJRI_CLIENT@@*/', inlineScript(read(join(root, 'hijri/client.js')), 'hijri/client.js'));
  if (/fonts\.googleapis|fonts\.gstatic/.test(html)) throw new Error('src/day.html: Google Fonts left in the page: fonts come from the theme site');
  mkdirSync(join(root, 'public-hub/day'), { recursive: true });
  writeFileSync(join(root, 'public-hub/day/index.html'), html);
  console.log(`public-hub/day/index.html: ${html.length} chars, shared theme and Hijri files filled in (no CSP)`);
}

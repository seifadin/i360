// Builds the two self-contained pages:
//   public-hub/index.html      the hub's landing page (from src/hub.src.html)
//   public-hub/md/index.html   the Reader    (from src/reader.src.html)
//   public-hub/cse/index.html  the i360 CSE  (from src/cse.src.html)
//   public-hub/day/index.html  Glance, the daily reflection (src/day.html, copied as is)
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
// or images; fonts from Google; fetches only where connectSrc allows.
function buildPage({ src, out, scripts, connectSrc }) {
  let html = read(join(root, src));
  for (const [placeholder, file] of scripts) html = fill(html, placeholder, inlineScript(file.code, file.name));
  const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((m) => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  if (/<script\b[^>]*\bsrc=/i.test(html.replace(/<script>[\s\S]*?<\/script>/g, ''))) {
    throw new Error(`${src}: external <script src> found: the CSP would block it`);
  }
  const csp = [
    "default-src 'none'",
    `script-src ${hashes.join(' ') || "'none'"}`,
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
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

// The hub's landing page: links to the three apps, no scripts.
buildPage({ src: 'src/hub.src.html', out: 'public-hub/index.html', scripts: [], connectSrc: "'none'" });

// Glance (the daily reflection) has no build placeholders: it is copied as is.
mkdirSync(join(root, 'public-hub/day'), { recursive: true });
writeFileSync(join(root, 'public-hub/day/index.html'), read(join(root, 'src/day.html')));
console.log('public-hub/day/index.html: copied from src/day.html');

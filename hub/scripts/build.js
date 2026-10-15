// Builds the self-contained reader page: public/index.html.
//
//   npm run build
//
// From src/reader.src.html it fills three placeholders:
//   /*@@MARKED@@*/       marked (pinned in package.json), inlined so the
//                        reader works offline and can't change under us
//   /*@@SEARCH_CORE@@*/  src/search-core.js, the search shared with the CSE
//   <!--@@CSP@@-->       a Content-Security-Policy allowing only the page's
//                        own inline scripts (by hash), so it must be made
//                        after everything else is in place
// Editing public/index.html by hand breaks those hashes: edit src/ and rebuild.
'use strict';
const { readFileSync, writeFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { join } = require('node:path');

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

// marked's package exports don't list this file, so it's read by path.
const marked = read(join(root, 'node_modules/marked/lib/marked.umd.js'))
  .replace('//# sourceMappingURL=marked.umd.js.map', '')
  .trim();
const searchCore = read(join(root, 'src/search-core.js'));

let html = read(join(root, 'src/reader.src.html'));
html = fill(html, '/*@@MARKED@@*/', inlineScript(marked, 'marked'));
html = fill(html, '/*@@SEARCH_CORE@@*/', inlineScript(searchCore, 'search-core.js'));

// Only these inline scripts may run; no external scripts, plugins or
// images; fonts from Google; ?file= may fetch from anywhere.
const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((m) => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
if (/<script\b[^>]*\bsrc=/i.test(html.replace(/<script>[\s\S]*?<\/script>/g, ''))) {
  throw new Error('external <script src> found: the CSP would block it');
}
const csp = [
  "default-src 'none'",
  `script-src ${hashes.join(' ')}`,
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  'connect-src *',
  "img-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'"
].join('; ');
html = fill(html, '<!--@@CSP@@-->', `<meta http-equiv="Content-Security-Policy" content="${csp}">`);

writeFileSync(join(root, 'public/index.html'), html);
console.log(`public/index.html: ${html.length} chars, ${hashes.length} scripts hashed`);

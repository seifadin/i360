// Builds the self-contained pages into the i360إ app (i360-hub.md §10), served by the app,
// i36o.web.app/<page>/ and its OTA bundle (since merge sprint 7 the hub site only forwards):
//   ../public/md/index.html    the Reader    (from src/reader.src.html + src/reader/main.js)
//   ../public/cse/index.html   the i360 CSE  (from src/cse.src.html + src/cse/main.js)
//   ../public/day/index.html   Daily Reflection (from src/day.src.html + src/day/main.js)
//
//   npm run build
//
// Each page's script is src/<page>/main.js, an ES module. esbuild (pinned in package.json)
// bundles it with everything it imports — the shared files (book format, search, CSE index,
// Hijri date, the theme loader…) and the pinned libraries (marked, adhan) — into one plain
// script, inlined into the page so it works offline and can't change under us. Not minified;
// comments are left out (they stay in src/).
//
// Placeholders, each filled once:
//   /*@@MAIN@@*/         the page's bundled script
//   /*@@THEME_FALLBACK@@*/  the shared theme's colours, plain (theme/fallbacks.js),
//                        used until theme.css arrives and whenever it can't
//   /*@@THEME_EARLY@@*/  theme/early.js: the saved theme before anything is drawn
//   /*@@THEME_ORIGIN@@*/ the theme site's address (I360_THEME_ORIGIN to test
//                        against another one)
//   /*@@TAILWIND@@*/     Daily Reflection's Tailwind CSS (src/day.tailwind.js)
//   <!--@@CSP@@-->       a Content-Security-Policy allowing only the page's
//                        own inline scripts (by hash), so it must be made
//                        after everything else is in place
// Editing the built pages by hand breaks those hashes: edit src/ and rebuild.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import * as esbuild from 'esbuild';
import { fallbackCss } from '../theme/fallbacks.js';
import { checkInlineScripts } from './check-scripts.js';

const root = join(import.meta.dirname, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const pkgVersion = (name) => JSON.parse(read(`node_modules/${name}/package.json`)).version;

// The shared theme site: theme.css, the fonts (and the hosted copy of the loader).
const THEME_ORIGIN = process.env.I360_THEME_ORIGIN || 'https://theme.i36o.workers.dev';
if (!/^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(THEME_ORIGIN)) throw new Error(`I360_THEME_ORIGIN must be a bare origin, got "${THEME_ORIGIN}"`);

const theme = {
  fallback: fallbackCss(read('theme/site/theme.css')),
  early: read('theme/early.js')
};

// One page's script: src/<page>/main.js and what it imports, as one plain script.
// The theme loader (an ES module, also served as one) finds theme.css and the fonts
// beside itself (import.meta.url): built in, its address is the theme site's.
// banner: the licence notices of the libraries bundled in (esbuild leaves comments out).
// The script runs in strict mode, as ES modules do (and as every page script did before).
async function bundle(entry, { banner = '', plugins = [] } = {}) {
  const result = await esbuild.build({
    entryPoints: [join(root, entry)],
    bundle: true,
    write: false,
    format: 'iife',
    charset: 'utf8',              // Arabic stays as it is, not \u escapes
    legalComments: 'none',        // the notices go in the banner, once
    define: { 'import.meta.url': JSON.stringify(`${THEME_ORIGIN}/theme-loader.js`) },
    banner: { js: `${banner ? `${banner}\n` : ''}"use strict";` },
    logLevel: 'silent',
    plugins
  });
  const code = result.outputFiles[0].text;
  if (/<\/script/i.test(code)) throw new Error(`${entry} contains "</script": it can't be inlined`);
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
function buildPage({ src, out, main, connectSrc, fills = [] }) {
  let html = read(src);
  for (const [placeholder, value] of fills) html = fill(html, placeholder, value);
  html = fill(html, '/*@@THEME_FALLBACK@@*/', theme.fallback);
  html = fill(html, '/*@@THEME_ORIGIN@@*/', THEME_ORIGIN);
  html = fill(html, '/*@@THEME_EARLY@@*/', theme.early);
  html = fill(html, '/*@@MAIN@@*/', main);
  if (/fonts\.googleapis|fonts\.gstatic/.test(html)) throw new Error(`${src}: Google Fonts left in the page: fonts come from the theme site`);
  if (connectSrc !== '*') connectSrc = connectSrc === "'none'" ? THEME_ORIGIN : `${THEME_ORIGIN} ${connectSrc}`;
  checkInlineScripts(html, src);   // a script that doesn't parse stops the build (scripts/check-scripts.js)
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

// The Reader: reads only the lib site — our own books and our copies of the books
// in the CSE's catalog (sprint 5; ?file= accepts nothing else).
buildPage({
  src: 'src/reader.src.html',
  out: '../public/md/index.html',
  main: await bundle('src/reader/main.js', {
    banner: `/*! marked v${pkgVersion('marked')} | MIT License | Copyright (c) 2018-2026, MarkedJS; Copyright (c) 2011-2018, Christopher Jeffrey | https://github.com/markedjs/marked */`
  }),
  connectSrc: 'https://lib.i36o.workers.dev'
});

// The CSE page: reads only the lib site (and, for testing on this computer,
// a local copy of the build: ?data=http://localhost:…).
buildPage({
  src: 'src/cse.src.html',
  out: '../public/cse/index.html',
  main: await bundle('src/cse/main.js'),
  connectSrc: 'https://lib.i36o.workers.dev http://localhost:* http://127.0.0.1:*'
});

// Daily Reflection («التأمل اليومي», at /day/): its Tailwind CSS (built here from src/day.tailwind.js:
// only the classes the page uses) is filled in; its script brings the shared Hijri files, Adhan
// (prayer times on the device) and the default-city table, of which only the fields the page uses
// are kept. Its outside services are a fixed list, so it gets the same hash-based policy as the
// other pages (2026-10-22, i360-hub.md §10).
{
  const tailwind = execFileSync(process.execPath, [join(root, 'node_modules/tailwindcss/lib/cli.js'), '-c', join(root, 'src/day.tailwind.js'), '--minify'],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (!/\.dark\b/.test(tailwind) || tailwind.length < 5000) throw new Error('src/day.src.html: the Tailwind build looks wrong (no dark: rules, or too small)');
  if (/<\/style/i.test(tailwind)) throw new Error('src/day.src.html: the Tailwind CSS contains </style');
  const table = JSON.parse(read('src/day-cities.json'));
  const zones = Object.fromEntries(Object.entries(table.zones).map(([tz, z]) => [tz, { cc: z.cc, lat: z.lat, lng: z.lng, n: z.n }]));
  const dayCities = {
    name: 'day-cities',
    setup(b) { b.onLoad({ filter: /[\\/]src[\\/]day-cities\.json$/ }, () => ({ contents: JSON.stringify({ zones, aliases: table.aliases }), loader: 'json' })); }
  };
  buildPage({
    src: 'src/day.src.html',
    out: '../public/day/index.html',
    fills: [['/*@@TAILWIND@@*/', tailwind.trim()]],
    main: await bundle('src/day/main.js', {
      banner: `/*! adhan-js ${pkgVersion('adhan')} | MIT License | Copyright (c) Batoul Apps | https://github.com/batoulapps/adhan-js */`,
      plugins: [dayCities]
    }),
    connectSrc: 'https://api.alquran.cloud https://hadeethenc.com https://geocoding-api.open-meteo.com https://dar-hijri.i36o.workers.dev'
  });
}

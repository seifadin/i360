'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { mixOklab, check, fallbackCss, themeBlocks, THEME_CSS } = require('../theme/fallbacks.js');

const SITE = path.join(__dirname, '..', 'theme', 'site');
const css = fs.readFileSync(THEME_CSS, 'utf8');

test('OKLab mixing matches CSS color-mix', () => {
  assert.equal(mixOklab('#FAF7F2', 'black', 5), '#EAE7E2');   // the first frame value (2026-10-17)
  assert.equal(mixOklab('#FAF7F2', 'black', 2.5), '#F2EFEA');  // the frame now (Seif, 2026-10-17)
  assert.equal(mixOklab('#ffffff', 'black', 0), '#FFFFFF');
  assert.equal(mixOklab('#123456', '#123456', 50), '#123456');
  assert.equal(mixOklab('#000', 'white', 100), '#FFFFFF');
  assert.throws(() => mixOklab('rgb(1,2,3)', 'black', 5), /Not a colour/);
});

test('theme.css: every plain-colour fallback is up to date', () => {
  const { results } = check(css);
  assert.ok(results.length >= 1);
  for (const r of results) assert.ok(r.ok, `${r.selector} ${r.name}: ${r.actual}, should be ${r.expected} — run node theme/fallbacks.js --write`);
});

test('theme.css: light, sepia and dark set the same colours', () => {
  const blocks = themeBlocks(css);
  const by = Object.fromEntries(blocks.map(b => [b.selector, b.vars]));
  const light = by[':root, [data-theme="light"]'];
  assert.ok(light && by['[data-theme="sepia"]'] && by['[data-theme="dark"]']);
  const colours = Object.keys(light).filter(k => !k.startsWith('--i360-font'));
  for (const sel of ['[data-theme="sepia"]', '[data-theme="dark"]']) {
    assert.deepEqual(Object.keys(by[sel]).sort(), colours.slice().sort(), sel);
  }
  for (const b of blocks) for (const k of Object.keys(b.vars)) assert.match(k, /^--i360-/);
});

test('a derived colour is set for its own theme only (never for every theme through a bare :root)', () => {
  const supports = /@supports[^{]*\{([\s\S]*?\})\s*\}/.exec(css)[1];
  for (const r of supports.matchAll(/([^{}]+)\{/g)) {
    for (const sel of r[1].split(',').map(x => x.trim())) {
      assert.ok(/data-theme/.test(sel), `"${sel}" matches every theme: it would replace sepia's and dark's own values`);
    }
  }
});

test('the fallback is variables only, with plain colours', () => {
  const fb = fallbackCss(css);
  assert.doesNotMatch(fb, /color-mix|@font-face|@supports|url\(/);
  assert.match(fb, /--i360-frame: #F2EFEA;/);
  assert.match(fb, /\[data-theme="dark"\] \{\n  color-scheme: dark;/);
});

test('fonts: every file theme.css names is there, in a versioned folder, with its licence', () => {
  const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/['"]/g, ''));
  assert.equal(urls.length, 8);
  const folders = new Set();
  for (const u of urls) {
    const m = /^fonts\/(amiri|amiri-quran)\/(\d+\.\d+\.\d+)\/[\w-]+\.woff2$/.exec(u);
    assert.ok(m, `${u}: fonts/<font>/<version>/ (cached for a year, so a new version needs a new folder)`);
    assert.ok(fs.existsSync(path.join(SITE, u)), u);
    folders.add(`fonts/${m[1]}/${m[2]}`);
  }
  assert.equal(folders.size, 2);
  for (const d of folders) {
    assert.match(fs.readFileSync(path.join(SITE, d, 'OFL.txt'), 'utf8'), /SIL Open Font License, Version 1\.1/);
  }
  assert.doesNotMatch(css, /KFGQPC/);
  // block, not swap: no reflow when Amiri arrives (i360-instructions.md §14g)
  const faces = css.match(/@font-face \{[^}]*\}/g);
  assert.equal(faces.length, 8);
  for (const f of faces) assert.match(f, /font-display: block;/);
});

test('_headers: CORS everywhere, theme files never cached stale, fonts immutable', () => {
  const h = fs.readFileSync(path.join(SITE, '_headers'), 'utf8');
  const rules = {};
  let cur;
  for (const line of h.split('\n')) {
    if (/^\S/.test(line) && !line.startsWith('#')) rules[cur = line.trim()] = [];
    else if (cur && line.trim() && !line.trim().startsWith('#')) rules[cur].push(line.trim());
  }
  assert.ok(rules['/*'].includes('Access-Control-Allow-Origin: *'));
  assert.ok(rules['/theme.css'].includes('Cache-Control: no-cache'));
  assert.ok(rules['/theme-loader.js'].includes('Cache-Control: no-cache'));
  assert.ok(rules['/fonts/*'].includes('Cache-Control: public, max-age=31536000, immutable'));
  const cc = Object.values(rules).filter(r => r.some(l => l.startsWith('Cache-Control')));
  assert.equal(cc.length, 3, 'Cache-Control set by one rule per path');
});

test('early.js and theme-loader.js agree on storage keys and themes', () => {
  const early = fs.readFileSync(path.join(__dirname, '..', 'theme', 'early.js'), 'utf8');
  const loader = fs.readFileSync(path.join(SITE, 'theme-loader.js'), 'utf8');
  const themes = /THEMES = (\[[^\]]+\])/.exec(loader)[1];
  assert.ok(early.includes(themes.replace(/^\[|\]$/g, '')), 'same themes, same order');
  assert.ok(loader.includes("CHOICE_KEY = 'i360.theme'") && early.includes("'i360.theme'"));
  assert.ok(loader.includes("CACHE_KEY = 'i360.theme.css'") && early.includes("'i360.theme.css'"));
  assert.ok(loader.includes("STYLE_ID = 'i360-theme'") && early.includes("'i360-theme'"));
});

test('a changed background makes its fallback stale, and --write fixes only that line', () => {
  const edited = css.replace('--i360-bg: #FAF7F2;', '--i360-bg: #FFFFFF;');
  const { results, fixed } = check(edited);
  assert.equal(results[0].ok, false);
  assert.equal(results[0].expected, mixOklab('#FFFFFF', 'black', 2.5));
  assert.equal(fixed.length, edited.length);
  assert.equal(fixed, edited.replace('--i360-frame: #F2EFEA;', `--i360-frame: ${results[0].expected};`));
  assert.ok(check(fixed).results.every(r => r.ok));
});

test('numerals: any digits to 0123, ٠١٢٣ or ۰۱۲۳; the cycle order; the built-in loader offers it', async () => {
  const store = {};
  globalThis.document = { documentElement: { getAttribute: () => null } };
  globalThis.window = { matchMedia: null };
  globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const m = await import(path.join(SITE, 'theme-loader.js'));
  assert.equal(m.toNumerals('ص 12، ٣٤، ۵۶ — 7:89', 'western'), 'ص 12، 34، 56 — 7:89');
  assert.equal(m.toNumerals('ص 12، ٣٤، ۵۶', 'arabic'), 'ص ١٢، ٣٤، ٥٦');
  assert.equal(m.toNumerals('ص 12، ٣٤، ۵۶', 'persian'), 'ص ۱۲، ۳۴، ۵۶');
  assert.deepEqual(m.NUMERALS, ['western', 'arabic', 'persian']);
  assert.equal(m.getNumerals(), 'western');
  const seen = [];
  m.onNumeralsChange(({ numerals }) => seen.push(numerals));
  m.cycleNumerals(); m.cycleNumerals(); m.cycleNumerals();
  assert.deepEqual(seen, ['arabic', 'persian', 'western']);
  assert.equal(store['i360.numerals'], 'western');
  const built = fs.readFileSync(path.join(__dirname, '..', 'public-hub', 'md', 'index.html'), 'utf8');
  for (const k of ['getNumerals', 'setNumerals', 'cycleNumerals', 'onNumeralsChange', 'toNumerals']) assert.ok(built.includes(k), k);
});

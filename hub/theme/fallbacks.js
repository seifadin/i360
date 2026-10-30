// i360 theme: plain-colour fallbacks for colours worked out with color-mix().
//
//   node theme/fallbacks.js           check that every @derived line in
//                                     theme/site/theme.css is up to date
//   node theme/fallbacks.js --write   update those lines
//   node theme/fallbacks.js --css     print the variables only (no fonts, no
//                                     color-mix): each app's built-in fallback
//
// The maths is CSS Color 4's: color-mix(in oklab, A, B p%) mixes A and B in
// OKLab with weights (100 − p)% and p%, then converts back to sRGB. Results
// are rounded to whole 0–255 channels, as browsers report them.

import fs from 'fs';
import path from 'path';

const THEME_CSS = path.join(import.meta.dirname, 'site', 'theme.css');

// ---------- colour maths ----------

const NAMED = { black: '#000000', white: '#ffffff' };

function parseColor(text) {
  const t = String(text).trim().toLowerCase();
  const hex = NAMED[t] || t;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(hex);
  if (!m) throw new Error(`Not a colour the fallbacks can mix: "${text}" (use #rgb, #rrggbb, black or white)`);
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
}

function toHex(rgb) {
  return '#' + rgb.map(v => {
    const n = Math.round(Math.min(1, Math.max(0, v)) * 255);
    return n.toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

const toLinear = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const fromLinear = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

function srgbToOklab(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToSrgb([L, a, b]) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map(fromLinear);
}

// color-mix(in oklab, a, b p%)  →  "#RRGGBB"
function mixOklab(a, b, percentB) {
  const p = percentB / 100;
  const A = srgbToOklab(parseColor(a));
  const B = srgbToOklab(parseColor(b));
  return toHex(oklabToSrgb(A.map((v, i) => v * (1 - p) + B[i] * p)));
}

// ---------- reading theme.css ----------

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));   // keep offsets
}

// The top-level theme blocks (not those inside @supports, not @font-face):
// { selector, start, end, vars }
function themeBlocks(css) {
  const plain = stripComments(css);
  const blocks = [];
  let depth = 0, prelude = 0, open = -1, selector = '';
  for (let i = 0; i < plain.length; i++) {
    const ch = plain[i];
    if (ch === '{') {
      if (depth === 0) { selector = plain.slice(prelude, i).trim(); open = i + 1; }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        if (!selector.startsWith('@') && /data-theme|:root/.test(selector)) {
          const vars = {};
          for (const d of plain.slice(open, i).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
          blocks.push({ selector, start: open, end: i, vars });
        }
        prelude = i + 1;
      }
    }
  }
  return blocks;
}

// Every color-mix inside @supports: { selector, name, from, other, percent }
function derivedRules(css) {
  const plain = stripComments(css);
  const out = [];
  for (const s of plain.matchAll(/@supports[^{]*\{([\s\S]*?\})\s*\}/g)) {
    for (const r of s[1].matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = r[1].trim();
      for (const d of r[2].matchAll(/(--[\w-]+)\s*:\s*color-mix\(\s*in\s+oklab\s*,\s*var\((--[\w-]+)\)\s*,\s*([#\w]+)\s+([\d.]+)%\s*\)\s*;/g)) {
        out.push({ selector, name: d[1], from: d[2], other: d[3], percent: Number(d[4]) });
      }
    }
  }
  return out;
}

// Compare (and optionally fix) each @derived line.
function check(css) {
  const blocks = themeBlocks(css);
  const results = [];
  let fixed = css;
  for (const rule of derivedRules(css)) {
    // The derived rule names its theme the same way as the theme block (data-theme="…"); no
    // data-theme at all means light, the default.
    const themeOf = (sel) => (/data-theme="(\w+)"/.exec(sel) || [null, 'light'])[1];
    const block = blocks.find(b => themeOf(b.selector) === themeOf(rule.selector));
    if (!block) throw new Error(`No theme block "${rule.selector}" for ${rule.name}`);
    const base = block.vars[rule.from];
    if (!base) throw new Error(`${rule.name}: ${rule.from} is not set in "${rule.selector}"`);
    const expected = mixOklab(base, rule.other, rule.percent);
    const actual = block.vars[rule.name];
    const lineRe = new RegExp(`(${rule.name}\\s*:\\s*)([^;]+)(;[^\\n]*@derived)`);
    const bodyText = css.slice(block.start, block.end);
    if (!lineRe.test(bodyText)) throw new Error(`${rule.name} in "${rule.selector}" has no line marked @derived`);
    results.push({ selector: rule.selector, name: rule.name, expected, actual, ok: (actual || '').toUpperCase() === expected });
    const newBody = bodyText.replace(lineRe, `$1${expected}$3`);
    fixed = fixed.slice(0, block.start) + newBody + fixed.slice(block.end);   // same length: offsets hold
  }
  return { results, fixed };
}

// Variables only, plain colours: the fallback each app carries in its own page.
function fallbackCss(css) {
  return themeBlocks(css).map(b => {
    const lines = Object.entries(b.vars).map(([k, v]) => `  ${k}: ${v};`);
    const scheme = /color-scheme\s*:\s*(\w+)/.exec(stripComments(css).slice(b.start, b.end));
    if (scheme) lines.unshift(`  color-scheme: ${scheme[1]};`);
    return `${b.selector} {\n${lines.join('\n')}\n}`;
  }).join('\n');
}

export { mixOklab, check, fallbackCss, themeBlocks, THEME_CSS };

if (process.argv[1] === import.meta.filename) {
  const arg = process.argv[2] || '--check';
  const css = fs.readFileSync(THEME_CSS, 'utf8');
  if (arg === '--css') {
    process.stdout.write(fallbackCss(css) + '\n');
  } else {
    const { results, fixed } = check(css);
    for (const r of results) {
      console.log(`${r.ok ? 'ok     ' : 'changed'} ${r.selector} ${r.name}: ${r.actual} → ${r.expected}`);
    }
    const stale = results.filter(r => !r.ok);
    if (arg === '--write') {
      if (stale.length) fs.writeFileSync(THEME_CSS, fixed);
      console.log(stale.length ? `theme.css: ${stale.length} line(s) updated` : 'theme.css: already up to date');
    } else if (stale.length) {
      console.error('Out of date: run node theme/fallbacks.js --write');
      process.exit(1);
    }
  }
}

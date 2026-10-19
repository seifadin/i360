'use strict';
// i360 icons: Lucide (lucide.dev, ISC licence), from the lucide-static npm
// package (version fixed by package-lock.json). The pages carry each icon as inline SVG,
// tagged with its Lucide name:
//
//   <svg data-lucide="search" viewBox="0 0 24 24">…drawing…</svg>
//
// The page keeps its own attributes on <svg> (size and stroke come from its
// CSS); the drawing inside is exactly Lucide's.
//
//   node scripts/icons.js           check (exit 1, listing what is wrong)
//   node scripts/icons.js --write   redraw every tagged icon from the installed
//                                   Lucide (after raising its version)
//
// Wrong: an <svg> with no data-lucide, a name Lucide doesn't have, a drawing
// that differs from Lucide's, or anything left of Font Awesome. The tests run
// the check (test/icons.test.js).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGES = ['src/hub.src.html', 'src/cse.src.html', 'src/reader.src.html', 'src/day.html'];
const SVG = /<svg\b([^>]*)>([\s\S]*?)<\/svg>/g;
const NAME = /\sdata-lucide="([a-z0-9-]+)"/;
const FONT_AWESOME = /font-?awesome|\bfa-(solid|regular|brands|[a-z]+-[a-z])|\bfa[srb]? fa-/i;

const lucide = () => require('lucide-static/icon-nodes.json');
const version = () => require('lucide-static/package.json').version;

// Lucide's drawing for one icon, as the pages write it.
function draw(nodes) {
  return nodes.map(([tag, attrs]) =>
    `<${tag}${Object.entries(attrs).map(([k, v]) => ` ${k}="${v}"`).join('')}></${tag}>`).join('');
}

const lineOf = (html, at) => html.slice(0, at).split('\n').length;

// What is wrong in one page: [{ line, problem }].
function check(html, icons = lucide()) {
  const problems = [];
  for (const m of html.matchAll(SVG)) {
    const line = lineOf(html, m.index);
    const name = (m[1].match(NAME) || [])[1];
    if (!name) problems.push({ line, problem: '<svg> without data-lucide="…"' });
    else if (!icons[name]) problems.push({ line, problem: `"${name}" is not a Lucide icon` });
    else if (m[2] !== draw(icons[name])) problems.push({ line, problem: `"${name}" differs from Lucide ${version()}` });
  }
  const fa = html.match(FONT_AWESOME);
  if (fa) problems.push({ line: lineOf(html, fa.index), problem: `Font Awesome is still used ("${fa[0]}")` });
  return problems;
}

// The page with every tagged icon redrawn from Lucide (unknown names left as they are).
function write(html, icons = lucide()) {
  return html.replace(SVG, (all, attrs, inner) => {
    const name = (attrs.match(NAME) || [])[1];
    return name && icons[name] ? `<svg${attrs}>${draw(icons[name])}</svg>` : all;
  });
}

function main() {
  const fix = process.argv.includes('--write');
  let bad = 0;
  for (const rel of PAGES) {
    const file = path.join(ROOT, rel);
    let html = fs.readFileSync(file, 'utf8');
    if (fix) {
      const out = write(html);
      if (out !== html) { fs.writeFileSync(file, out); console.log(`${rel}: redrawn from Lucide ${version()}`); html = out; }
    }
    for (const p of check(html)) { bad++; console.log(`${rel}:${p.line}  ${p.problem}`); }
  }
  if (bad) { console.log(`\n${bad} icon problem(s).${fix ? '' : ' Drawings that differ: node scripts/icons.js --write'}`); process.exit(1); }
  console.log(`Icons: every page icon is Lucide ${version()}`);
}

if (require.main === module) main();
module.exports = { PAGES, draw, check, write, version };

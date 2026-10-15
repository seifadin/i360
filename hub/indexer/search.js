// i360 CSE — search the local build from the terminal (proves the index
// works end to end before the CSE page exists).
//
//   npm run search -- "قواعد الفقه"
//   npm run search -- "رَبِّ العالمين" --exact --word
//
// Reads indexer/dist/ (from `npm run index`). Results are grouped by
// ScienceMajor_Ar → ScienceIntermediate_Ar → source, in the app's order.
'use strict';
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const CseIndex = require('../src/cse-index.js');
const SearchCore = require('../src/search-core.js');

async function search(distDir, raw, opts = {}) {
  const { buildId } = JSON.parse(readFileSync(join(distDir, 'latest.json'), 'utf8'));
  const base = join(distDir, 'b', buildId);
  const catalog = JSON.parse(readFileSync(join(base, 'catalog.json'), 'utf8'));
  const load = async (p) => (p.endsWith('.json') ? JSON.parse(readFileSync(join(base, p), 'utf8')) : readFileSync(join(base, p)));
  const searcher = CseIndex.createSearcher(catalog, load);
  const candidates = await searcher.candidates(raw);
  const hits = await searcher.confirm(candidates, raw, opts);
  return { catalog, candidates: candidates.length, hits, groups: CseIndex.groupResults(hits) };
}

function pageLabel(h) {
  if (!h.label) return h.source.pageCount > 1 ? `(${h.local + 1})` : '';
  return h.vol ? `ج ${h.vol} ص ${h.label}` : `ص ${h.label}`;
}

async function main() {
  const args = process.argv.slice(2);
  const opts = { exact: args.includes('--exact'), word: args.includes('--word') };
  const raw = args.filter((a) => !a.startsWith('--')).join(' ');
  if (SearchCore.normalizeQuery(raw, false).length < CseIndex.MIN_QUERY) {
    console.log(`Type at least ${CseIndex.MIN_QUERY} characters.`);
    return;
  }
  const t0 = Date.now();
  const r = await search(join(__dirname, 'dist'), raw, opts);
  const total = r.hits.reduce((a, h) => a + h.count, 0);
  console.log(`«${raw}»${opts.exact ? ' [exact]' : ''}${opts.word ? ' [word]' : ''}: ${total} matches on ${r.hits.length} pages (${r.candidates} candidate pages checked, ${Date.now() - t0} ms)\n`);
  for (const g of r.groups) {
    console.log(`■ ${g.major}`);
    for (const i of g.intermediates) {
      if (i.intermediate) console.log(`  ▸ ${i.intermediate}`);
      for (const s of i.sources) {
        const n = s.pages.reduce((a, h) => a + h.count, 0);
        console.log(`    • ${s.source.title || s.source.url} — ${n} on ${s.pages.length} page(s)`);
        console.log(`      ${s.source.url}`);
        for (const h of s.pages.slice(0, 3)) {
          const sn = h.snippets[0];
          console.log(`      ${pageLabel(h)}: ${sn.before}[${sn.hit}]${sn.after}`);
        }
        if (s.pages.length > 3) console.log(`      … and ${s.pages.length - 3} more page(s)`);
      }
    }
  }
}

module.exports = { search, pageLabel };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exitCode = 1; });

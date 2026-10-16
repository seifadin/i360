'use strict';
// The indexer takes unchanged text from the previous build on the lib site
// (S4): nothing is kept between runs except what was published.
const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, cpSync, readFileSync, existsSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { run } = require('../indexer/build-index.js');

const LIB = 'https://lib.i36o.workers.dev/';
const row = (id, links, inter = ['2.1', 'فقه العبادات']) => ({
  id, BotKB: links.join('\n'), CustomSearchAIKBlessBotKB: '',
  ScienceMajorId: '2', ScienceMajor_Ar: 'الفقه', ScienceIntermediateId: inter[0], ScienceIntermediate_Ar: inter[1],
  ScienceMinorId: '2.1.1', ScienceMinor_Ar: 'الطهارة'
});
const A = 'https://ar.wikipedia.org/wiki/الصلاة';
const B = 'https://ar.wikisource.org/wiki/رسالة';

// A pretend internet: Baserow, two wiki pages, and the lib site (a folder).
function world({ rows, revs, libDir }) {
  const calls = { downloads: [], lib: 0 };
  const json = (v) => new Response(JSON.stringify(v), { status: 200, headers: { 'content-type': 'application/json' } });
  const fetchFn = async (url) => {
    const u = String(url);
    if (u.startsWith('https://api.baserow.io/')) return json({ results: rows(), next: null });
    if (u.startsWith(LIB)) {
      calls.lib++;
      const p = join(libDir, decodeURIComponent(u.slice(LIB.length)));
      return libDir && existsSync(p) ? new Response(readFileSync(p)) : new Response('not found', { status: 404 });
    }
    const m = /^https:\/\/ar\.(wikipedia|wikisource)\.org\/w\/api\.php/.exec(u);
    if (m) {
      const title = new URL(u).searchParams.get('titles') || '';
      const rev = revs[m[1]];
      if (u.includes('prop=extracts')) calls.downloads.push(m[1]);
      return json({ query: { pages: [{ title, lastrevid: rev, length: 100, extract: `== عنوان ==\nنص ${m[1]} عن الصلاة والطهارة، النسخة ${rev}` }] } });
    }
    return new Response('?', { status: 404 });
  };
  return { fetchFn, calls };
}

test('first run downloads; next runs reuse the published text and publish only changes', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cse-lib-'));
  const rootDir = join(root, 'indexer');
  const libDir = join(root, 'lib');   // what `wrangler deploy` published
  const quiet = () => {};
  let inter = ['2.1', 'فقه العبادات'];
  const revs = { wikipedia: 10, wikisource: 20 };
  const opts = (w, extra = {}) => ({ fetchFn: w.fetchFn, key: 'k', rootDir, passes: 2, log: quiet, ...extra });
  const rows = () => [row(1, [A]), row(2, [B], inter)];
  try {
    // 1. Nothing published yet: everything is downloaded.
    let w = world({ rows, revs, libDir: null });
    let r = await run(opts(w, { buildId: 'b1' }));
    assert.equal(r.changed, true);
    assert.deepEqual(w.calls.downloads.sort(), ['wikipedia', 'wikisource']);
    const dist = join(rootDir, 'dist');
    assert.ok(existsSync(join(dist, '_headers')) && existsSync(join(dist, 'robots.txt')));
    assert.match(readFileSync(join(dist, '_headers'), 'utf8'), /Access-Control-Allow-Origin: \*/);
    assert.equal(existsSync(join(rootDir, 'work')), false, 'work folder removed');
    assert.equal(existsSync(join(rootDir, 'cache')), false, 'no cache folder');
    const cat1 = JSON.parse(readFileSync(join(dist, 'b', 'b1', 'catalog.json'), 'utf8'));
    assert.equal(cat1.extractor, 1);
    cpSync(dist, libDir, { recursive: true });   // "deploy"

    // 2. Daily (links) check, nothing changed: no download, no build.
    w = world({ rows, revs, libDir });
    r = await run(opts(w, { check: 'links', buildId: 'b2' }));
    assert.equal(r.changed, false);
    assert.deepEqual(w.calls.downloads, []);
    assert.ok(w.calls.lib > 0);
    assert.equal(existsSync(join(dist, 'b', 'b2')), false);

    // 3. Weekly (full) check, nothing changed: probes only, no build.
    w = world({ rows, revs, libDir });
    r = await run(opts(w, { buildId: 'b3' }));
    assert.equal(r.changed, false);
    assert.deepEqual(w.calls.downloads, []);

    // 4. A group renamed in Baserow: rebuilt from the published text, no download.
    inter = ['2.2', 'أصول الفقه'];
    w = world({ rows, revs, libDir });
    r = await run(opts(w, { check: 'links', buildId: 'b4' }));
    assert.equal(r.changed, true);
    assert.deepEqual(w.calls.downloads, []);
    const cat4 = JSON.parse(readFileSync(join(dist, 'b', 'b4', 'catalog.json'), 'utf8'));
    const ws = cat4.sources.find((s) => s.type === 'wikisource');
    assert.equal(ws.usedBy[0].intermediate, 'أصول الفقه');
    const text4 = JSON.parse(readFileSync(join(dist, 'b', 'b4', 'text', ws.key, '0.json'), 'utf8'));
    assert.match(text4.pages[0].paras.join(' '), /النسخة 20/);
    rmSync(libDir, { recursive: true }); cpSync(dist, libDir, { recursive: true });

    // 5. A page edited on Wikisource: the daily check doesn't look; the weekly one downloads just it.
    revs.wikisource = 21;
    w = world({ rows, revs, libDir });
    r = await run(opts(w, { check: 'links', buildId: 'b5' }));
    assert.equal(r.changed, false);
    w = world({ rows, revs, libDir });
    r = await run(opts(w, { buildId: 'b6' }));
    assert.equal(r.changed, true);
    assert.deepEqual(w.calls.downloads, ['wikisource']);

    // 6. --previous dist reuses the local build without the lib site.
    w = world({ rows, revs, libDir: null });
    r = await run(opts(w, { previous: 'dist', check: 'links', buildId: 'b7' }));
    assert.equal(r.changed, false);
    assert.deepEqual(w.calls.downloads, []);
    assert.equal(w.calls.lib, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

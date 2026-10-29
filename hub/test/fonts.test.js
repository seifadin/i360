// theme/fonts.js against a simulated npm registry, on a copy of theme/site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

import * as woff2 from '../theme/woff2.js';
import * as F0 from '../theme/fonts.js';

const REAL_SITE = path.join(import.meta.dirname, '..', 'theme', 'site');

// The versions in use now, and a newer one for the simulated registry.
const CUR = F0.currentVersions();
const bump = v => v.split('.').map((n, i) => (i === 1 ? Number(n) + 1 : i === 2 ? 0 : n)).join('.');
const NEXT = { amiri: bump(CUR.amiri), 'amiri-quran': bump(CUR['amiri-quran']) };

// A package tarball like @fontsource's, built from the files in use now.
// swap: { 'file name': 'other file name in the same folder' } to plant a bad file.
function makeTarball(dir, p, swap = {}) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-'));
  const pkg = path.join(work, 'package');
  fs.mkdirSync(path.join(pkg, 'files'), { recursive: true });
  const css = fs.readFileSync(path.join(REAL_SITE, 'theme.css'), 'utf8');
  const src = path.join(REAL_SITE, 'fonts', p.dir, CUR[p.dir]);
  for (const f of fs.readdirSync(src).filter(f => f.endsWith('.woff2'))) {
    fs.copyFileSync(path.join(src, swap[f] || f), path.join(pkg, 'files', f));
  }
  fs.copyFileSync(path.join(src, 'OFL.txt'), path.join(pkg, 'LICENSE'));
  for (const w of p.weights) {
    const faces = p.subsets.map(s => {
      const m = new RegExp(`${p.prefix}-${s}-${w}-normal\\.woff2\\)[^;]*;\\s*unicode-range:\\s*([^;]+);`).exec(css);
      return `/* ${p.prefix}-${s}-${w}-normal */\n@font-face {\n  font-family: '${p.family}';\n  src: url(./files/${p.prefix}-${s}-${w}-normal.woff2) format('woff2');\n  unicode-range: ${m[1]};\n}\n`;
    });
    fs.writeFileSync(path.join(pkg, `${w}.css`), faces.join('\n'));
  }
  const tgz = path.join(dir, `${p.dir}.tgz`);
  execFileSync('tar', ['-czf', tgz, '-C', work, 'package']);
  fs.rmSync(work, { recursive: true });
  return fs.readFileSync(tgz);
}

// registry: { '@fontsource/amiri': { version, tarball: Buffer, badSum } }
function startRegistry(registry) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url);
    for (const [name, r] of Object.entries(registry)) {
      if (url === `/${name}/latest`) {
        const sum = r.badSum ? crypto.randomBytes(64).toString('base64') : crypto.createHash('sha512').update(r.tarball).digest('base64');
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ name, version: r.version, dist: { tarball: `http://127.0.0.1:${server.address().port}/t/${encodeURIComponent(name)}.tgz`, integrity: `sha512-${sum}` } }));
        return;
      }
      if (url === `/t/${name}.tgz`) { res.writeHead(200); res.end(r.tarball); return; }
    }
    res.writeHead(404); res.end();
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

// A copy of theme/site and a fresh theme/fonts.js pointed at it (a new module
// instance each time: the query makes it a different module, read afresh).
let fresh = 0;
async function sandbox(port) {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
  fs.cpSync(REAL_SITE, site, { recursive: true });
  process.env.I360_THEME_SITE = site;
  process.env.I360_NPM_REGISTRY = `http://127.0.0.1:${port}`;
  return { site, fonts: await import(`../theme/fonts.js?fresh=${++fresh}`) };
}
const stop = s => new Promise(r => { s.closeAllConnections(); s.close(r); });
const snapshot = dir => execFileSync('find', [dir, '-type', 'f'], { encoding: 'utf8' }).split('\n').sort().join('\n') + fs.readFileSync(path.join(dir, 'theme.css'), 'utf8');

test('fonts: newest already → nothing to do', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reg-'));
  const reg = {};
  for (const p of F0.PACKAGES) reg[p.pkg] = { version: CUR[p.dir], tarball: makeTarball(tmp, p) };
  const server = await startRegistry(reg);
  t.after(() => stop(server));
  const { site, fonts } = await sandbox(server.address().port);
  const before = snapshot(site);
  const infos = await fonts.check();
  assert.deepEqual(infos.map(i => [i.family, i.current, i.latest, i.newer]), [['Amiri', CUR.amiri, CUR.amiri, false], ['Amiri Quran', CUR['amiri-quran'], CUR['amiri-quran'], false]]);
  assert.deepEqual(await fonts.apply(infos), []);
  assert.equal(snapshot(site), before);
});

test('fonts: a newer version → new folder, theme.css rewritten, previous folder kept, older removed', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reg-'));
  const amiri = F0.PACKAGES[0], quran = F0.PACKAGES[1];
  const server = await startRegistry({
    [amiri.pkg]: { version: NEXT.amiri, tarball: makeTarball(tmp, amiri) },
    [quran.pkg]: { version: CUR['amiri-quran'], tarball: makeTarball(tmp, quran) }
  });
  t.after(() => stop(server));
  const { site, fonts } = await sandbox(server.address().port);
  fs.mkdirSync(path.join(site, 'fonts/amiri/0.0.1'));   // an older folder, to be removed
  const report = await fonts.apply();
  assert.equal(report.length, 1);
  assert.deepEqual([report[0].family, report[0].from, report[0].to], ['Amiri', CUR.amiri, NEXT.amiri]);
  assert.ok(report[0].removed.includes('0.0.1') && !report[0].removed.includes(CUR.amiri), report[0].removed.join(' '));
  assert.deepEqual(fs.readdirSync(path.join(site, 'fonts/amiri')).sort(), [CUR.amiri, NEXT.amiri].sort());
  assert.match(report[0].fontTo, /^Version \d/);
  const css = fs.readFileSync(path.join(site, 'theme.css'), 'utf8');
  const count = (dir, v) => css.split(`url(fonts/${dir}/${v}/`).length - 1;
  assert.equal(count('amiri', NEXT.amiri), 6);
  assert.equal(count('amiri-quran', CUR['amiri-quran']), 2);
  assert.equal(count('amiri', CUR.amiri), 0);
  assert.ok(css.includes(`Amiri: @fontsource/amiri ${NEXT.amiri} (font `));
  assert.ok(fs.existsSync(path.join(site, 'fonts/amiri', CUR.amiri)), 'the replaced folder stays');
  assert.ok(!fs.existsSync(path.join(site, 'fonts/amiri/0.0.1')));
  assert.match(fs.readFileSync(path.join(site, 'fonts/amiri', NEXT.amiri, 'OFL.txt'), 'utf8'), /SIL Open Font License/);
  // the colours part of theme.css is untouched
  const real = fs.readFileSync(path.join(REAL_SITE, 'theme.css'), 'utf8');
  assert.equal(css.slice(0, css.indexOf(fonts.MARK)), real.slice(0, real.indexOf(fonts.MARK)));
  // a second run: nothing more to do
  assert.deepEqual((await fonts.check()).map(i => i.newer), [false, false]);
});

test('fonts: safety check — a new Amiri Quran missing characters is refused, nothing changes', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reg-'));
  const amiri = F0.PACKAGES[0], quran = F0.PACKAGES[1];
  const server = await startRegistry({
    [amiri.pkg]: { version: NEXT.amiri, tarball: makeTarball(tmp, amiri) },
    // the Latin file planted as the Arabic one: no Arabic letters, no Quranic marks
    [quran.pkg]: { version: NEXT['amiri-quran'], tarball: makeTarball(tmp, quran, { 'amiri-quran-arabic-400-normal.woff2': 'amiri-quran-latin-400-normal.woff2' }) }
  });
  t.after(() => stop(server));
  const { site, fonts } = await sandbox(server.address().port);
  const before = snapshot(site);
  await assert.rejects(fonts.apply(), /safety check: Amiri Quran \S+ amiri-quran-arabic-400-normal\.woff2 lacks U\+06/);
  assert.equal(snapshot(site), before, 'all or nothing: the Amiri update made before is undone too');
});

test('fonts: a wrong checksum is refused; no registry → a clear reason', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reg-'));
  const server = await startRegistry({
    [F0.PACKAGES[0].pkg]: { version: NEXT.amiri, tarball: makeTarball(tmp, F0.PACKAGES[0]), badSum: true },
    [F0.PACKAGES[1].pkg]: { version: CUR['amiri-quran'], tarball: makeTarball(tmp, F0.PACKAGES[1]) }
  });
  t.after(() => stop(server));
  const { site, fonts } = await sandbox(server.address().port);
  const before = snapshot(site);
  await assert.rejects(fonts.apply(), /checksum mismatch/);
  assert.equal(snapshot(site), before);
  const port = server.address().port;
  await stop(server);   // now nothing listens there
  const again = await sandbox(port);
  await assert.rejects(again.fonts.check(), /checking @fontsource\/amiri: no answer from 127\.0\.0\.1/);
});

test('woff2: the fonts in use read as expected', () => {
  const css = fs.readFileSync(path.join(REAL_SITE, 'theme.css'), 'utf8');
  const q = /url\((fonts\/amiri-quran\/[^)]+arabic[^)]+)\)/.exec(css)[1];
  const buf = fs.readFileSync(path.join(REAL_SITE, q));
  const cps = woff2.codePoints(buf);
  for (let c = 0x06D6; c <= 0x06ED; c++) assert.ok(cps.has(c), `Quranic mark U+${c.toString(16)}`);
  assert.match(woff2.versionString(buf), /^Version \d/);
});

test.after(() => { delete process.env.I360_THEME_SITE; delete process.env.I360_NPM_REGISTRY; });

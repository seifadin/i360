// npm run fonts-update — when the monthly fonts check (or npm run fonts-check) reports a
// newer Amiri or Amiri Quran:
//   1. ask npm whether either has a newer version;
//   2. if so: download it, safety check, rewrite theme.css (theme/fonts.js), npm test, and
//      commit it on its own ("Fonts: …"), so it is never mixed into another change.
// Anything that goes wrong is shown with its cause, and a half-done update is undone.
// Nothing is pushed: the next `git push` (from the repo root) carries the commit, and the
// pre-push hook publishes the theme Worker with the new fonts.

import { execFileSync, spawnSync } from 'child_process';
import path from 'path';
import * as fonts from '../theme/fonts.js';

const root = path.join(import.meta.dirname, '..');
const SITE_REL = 'theme/site';

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const fail = (msg) => { console.log(`\n✗  ${msg}\n`); process.exitCode = 1; };

// Undo a font update that didn't finish: theme/site back to the last commit.
function undo() {
  try {
    git('checkout', '--', SITE_REL);
    git('clean', '-fdq', '--', path.join(SITE_REL, 'fonts'));
  } catch (e) {
    console.log(`⚠  Could not undo the font update by itself (${e.message.split('\n')[0]}). Check: git status ${SITE_REL}`);
  }
}

async function updateFonts() {
  let infos;
  try { infos = await fonts.check(); } catch (e) {
    fail(`Fonts: not checked — ${e.message}`);
    return;
  }
  const newer = infos.filter((i) => i.newer);
  if (!newer.length) {
    console.log(`Fonts: newest already (${infos.map((i) => `${i.family} ${i.current}`).join(', ')})`);
    return;
  }
  console.log(`Fonts: newer version available — ${newer.map((i) => `${i.family} ${i.current} → ${i.latest}`).join(', ')}. Updating…`);

  if (git('status', '--porcelain', '--', SITE_REL).trim()) {
    fail(`Font update not done: ${SITE_REL} has uncommitted changes. Commit or undo them, then run npm run fonts-update again.`);
    return;
  }

  let step = '';
  try {
    const report = await fonts.apply(infos);
    step = 'the tests failed: ';
    const t = spawnSync('npm', ['test'], { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
    if (t.status !== 0) {
      const out = `${t.stdout || ''}${t.stderr || ''}`.split('\n');
      const failed = out.filter((l) => /^\s*(✖|not ok)/.test(l)).slice(0, 5).map((l) => l.trim());
      throw new Error(failed.length ? failed.join('; ') : `npm test exited with ${t.status}`);
    }
    step = 'the commit failed: ';
    const msg = `Fonts: ${report.map((r) => `${r.family} ${r.to}${r.fontTo ? ` (${r.fontTo.replace(/^Version\s*/i, 'font ')})` : ''}`).join(', ')}`;
    git('add', '-A', '--', SITE_REL);
    git('commit', '-q', '-m', msg, '--', SITE_REL);
    console.log(`Fonts: committed "${msg}"`);
  } catch (e) {
    undo();
    fail(`Font update failed — ${step}${e.message}`);
  }
}

await updateFonts();

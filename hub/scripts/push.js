// npm run push [-- <git push arguments>]
//
// git push, with the fonts kept up to date on the way:
//   1. ask npm whether Amiri or Amiri Quran has a newer version;
//   2. if so: download it, safety check, rewrite theme.css (theme/fonts.js),
//      npm test, and commit it on its own ("Fonts: …"), so it is never mixed
//      into another change;
//   3. git push — always, whatever happened in 1–2. Anything that went wrong
//      there is shown as a warning with its cause, and a half-done font update
//      is undone first.
// The push publishes the new fonts too (the pre-push hook publishes the theme Worker).

import { execFileSync, spawnSync } from 'child_process';
import path from 'path';
import * as fonts from '../theme/fonts.js';

const root = path.join(import.meta.dirname, '..');
const SITE_REL = 'theme/site';

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const warn = (msg) => console.log(`\n⚠  ${msg}\n   The push continues without the font update.\n`);

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
    console.log(`Fonts: not checked — ${e.message}`);
    return;
  }
  const newer = infos.filter((i) => i.newer);
  if (!newer.length) {
    console.log(`Fonts: newest already (${infos.map((i) => `${i.family} ${i.current}`).join(', ')})`);
    return;
  }
  console.log(`Fonts: newer version available — ${newer.map((i) => `${i.family} ${i.current} → ${i.latest}`).join(', ')}. Updating…`);

  if (git('status', '--porcelain', '--', SITE_REL).trim()) {
    warn(`Font update not done: ${SITE_REL} has uncommitted changes. Commit or undo them, then run npm run push again.`);
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
    warn(`Font update failed — ${step}${e.message}`);
  }
}

(async () => {
  await updateFonts();
  const r = spawnSync('git', ['push', ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' });
  process.exitCode = r.status === null ? 1 : r.status;
})();

'use strict';
// scripts/icons.js: every page icon is the pinned Lucide's, and nothing is left of Font Awesome.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const icons = require('../scripts/icons.js');

const ROOT = path.join(__dirname, '..');
const FAKE = { x: [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]] };
const X = '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>';

test('icons: every page icon is tagged and drawn exactly as the pinned Lucide draws it', () => {
  for (const rel of icons.PAGES) {
    const problems = icons.check(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    assert.deepEqual(problems, [], `${rel}: ${problems.map(p => `line ${p.line}: ${p.problem}`).join('; ')} (fix: node scripts/icons.js --write)`);
  }
});

test('icons: the installed Lucide is the version package-lock.json pins', () => {
  // package.json names a range (^1.21.0, as the i360 app does); the lock file fixes the version the drawings follow.
  assert.equal(require('../package-lock.json').packages['node_modules/lucide-static'].version, icons.version());
});

test('icons: an untagged, unknown or changed icon and Font Awesome are each reported', () => {
  const page = [
    `<svg data-lucide="x" viewBox="0 0 24 24">${X}</svg>`,
    '<svg viewBox="0 0 24 24"><path d="M1 1"></path></svg>',
    '<svg data-lucide="no-such-icon" viewBox="0 0 24 24"></svg>',
    '<svg data-lucide="x" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line></svg>',
    '<i class="fas fa-clock"></i>'
  ].join('\n');
  assert.deepEqual(icons.check(page, FAKE).map(p => p.line), [2, 3, 4, 5]);
  assert.equal(icons.check('<link href="…/font-awesome/6.0.0/css/all.min.css">', FAKE).length, 1);
});

test('icons: --write redraws only the drawing, keeps the page\'s own attributes, leaves unknown names', () => {
  const page = '<svg data-lucide="x" class="icon" aria-hidden="true"><line x1="1"></line></svg> <svg data-lucide="nope"><b></b></svg>';
  assert.equal(icons.write(page, FAKE), `<svg data-lucide="x" class="icon" aria-hidden="true">${X}</svg> <svg data-lucide="nope"><b></b></svg>`);
});

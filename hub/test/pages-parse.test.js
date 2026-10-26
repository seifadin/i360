'use strict';
// The built pages' inline scripts all parse (scripts/check-scripts.js, the same check the build runs).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { checkInlineScripts } = require('../scripts/check-scripts.js');

for (const page of ['md', 'cse', 'day']) {
  test(`the built ${page} page's inline scripts all parse`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', '..', 'public', page, 'index.html'), 'utf8');
    assert.ok(checkInlineScripts(html, page) > 0, `${page}: no inline scripts found`);
  });
}

test('the check catches a script that does not parse', () => {
  assert.throws(() => checkInlineScripts('<script>if (a) { b(); }\nc();\nelse d();</script>', 'x'), /x: inline script 1 doesn't parse/);
  assert.equal(checkInlineScripts('<script>if (a) { b(); } else d();</script>', 'x'), 1);
});

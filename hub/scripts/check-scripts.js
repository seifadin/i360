'use strict';
// Every inline script of a page must parse: a syntax error stops the whole page from running
// (it happened once — the Reader didn't start: a line put between an if and its else).
// One check, used by scripts/build.js (refuses to write such a page) and by
// test/pages-parse.test.js (checks the pages as committed).
const vm = require('node:vm');

// Throws "<label>: inline script N doesn't parse: …" for the first script that doesn't;
// returns how many were checked.
function checkInlineScripts(html, label) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  scripts.forEach((code, i) => {
    try { new vm.Script(code, { filename: `${label} (inline script ${i + 1})` }); }
    catch (e) { throw new Error(`${label}: inline script ${i + 1} doesn't parse: ${e.message}`); }
  });
  return scripts.length;
}

module.exports = { checkInlineScripts };

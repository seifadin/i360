// The Reader's toolbar levels (src/reader/fold.js) against its HTML: every element they move and
// every slot they move it to must exist, or the bar would only fail in the browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { READER_FOLD } from '../src/reader/fold.js';

const html = fs.readFileSync(path.join(import.meta.dirname, '..', 'src', 'reader.src.html'), 'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const slots = [...html.matchAll(/<template data-slot="([^"]+)"><\/template>/g)].map((m) => m[1]);

test('Reader toolbar levels: every item and every slot exists in the HTML, each slot once', () => {
  assert.ok(READER_FOLD.length > 0);
  for (const [i, level] of READER_FOLD.entries()) {
    const at = `level ${i + 1}`;
    assert.ok(level.items || level.flag || level.dense, `${at} does nothing`);
    for (const id of level.items || []) assert.ok(ids.has(id), `${at}: no element with id "${id}"`);
    if (level.items) assert.ok(slots.includes(level.to), `${at}: no <template data-slot="${level.to}">`);
    if (level.dense) assert.ok([1, 2].includes(level.dense), `${at}: dense is 1 or 2`);
  }
  assert.equal(new Set(slots).size, slots.length, 'a slot appears twice');
  const used = new Set(READER_FOLD.filter((l) => l.items).map((l) => l.to));
  for (const slot of slots) assert.ok(used.has(slot), `slot "${slot}" is never used`);
});

test('Reader toolbar levels: every flag the levels set is used by the Reader\'s CSS', () => {
  for (const { flag } of READER_FOLD.filter((l) => l.flag)) {
    assert.match(html, new RegExp(`\\.toolbar(?::not\\()?\\.${flag}\\b`), `flag "${flag}" changes nothing`);
  }
});

// src/net.js (time limit, bounded retries) and src/storage.js (settings on the device), shared by the pages.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson, fetchWithTimeout } from '../src/net.js';
import { createStore } from '../src/storage.js';

const realFetch = globalThis.fetch;
const answers = (...list) => {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push(url);
    const a = list[Math.min(calls.length - 1, list.length - 1)];
    if (a === 'hang') return new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    if (a instanceof Error) throw a;
    return { ok: a >= 200 && a < 300, status: a, json: async () => ({ status: a }) };
  };
  return calls;
};
test.after(() => { globalThis.fetch = realFetch; });

test('fetchJson: the answer as JSON', async () => {
  answers(200);
  assert.deepEqual(await fetchJson('u'), { status: 200 });
});

test('fetchJson: a network error or 5xx is retried, `retries` times, then thrown', async () => {
  let calls = answers(new Error('down'), 200);
  assert.deepEqual(await fetchJson('u', { retries: 1, backoff: 1 }), { status: 200 });
  assert.equal(calls.length, 2);
  calls = answers(503);
  await assert.rejects(fetchJson('u', { retries: 2, backoff: 1 }), (e) => e.status === 503);
  assert.equal(calls.length, 3);
});

test('fetchJson: 4xx is final (no retry), except 429', async () => {
  let calls = answers(404);
  await assert.rejects(fetchJson('u', { retries: 3, backoff: 1 }), (e) => e.status === 404);
  assert.equal(calls.length, 1);
  calls = answers(429, 200);
  assert.deepEqual(await fetchJson('u', { retries: 1, backoff: 1 }), { status: 200 });
  assert.equal(calls.length, 2);
});

test('fetchWithTimeout: an answer that never comes is aborted at the limit', async () => {
  answers('hang');
  const t = Date.now();
  await assert.rejects(fetchWithTimeout('u', { timeout: 30 }), /aborted/);
  assert.ok(Date.now() - t < 1000);
});

test('createStore: JSON under the prefix; missing, empty or broken values give the fallback; never throws', () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  const s = createStore('p.');
  s.set('a', { x: 1 });
  assert.equal(mem.get('p.a'), '{"x":1}');
  assert.deepEqual(s.get('a', null), { x: 1 });
  assert.equal(s.get('missing', 7), 7);
  mem.set('p.empty', ''); assert.equal(s.get('empty', 7), 7);
  mem.set('p.broken', '{'); assert.equal(s.get('broken', 7), 7);
  globalThis.localStorage = { getItem: () => { throw new Error('off'); }, setItem: () => { throw new Error('off'); } };
  assert.equal(s.get('a', 7), 7);
  assert.doesNotThrow(() => s.set('a', 1));
  delete globalThis.localStorage;
});

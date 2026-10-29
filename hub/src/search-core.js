/* i360 search core — shared by the Markdown Reader, the i360 CSE page and
   the CSE indexer, so all three find exactly the same matches.

   No page code here: a page is fed in as text pieces (paragraph breaks,
   printed line breaks, text runs). The reader feeds its rendered page; the
   indexer feeds a book file. An ES module (bundled into both pages,
   imported by the indexer).

   Default matching ignores diacritics, tatweel and Quranic marks, treats
   أ/إ/آ/ٱ/ٲ/ٳ as ا, ى/ی/ئ as ي, ة as ه, ؤ as و, ک as ك, and Eastern or
   Persian digits as Western. "Exact" compares letters and marks exactly
   (only invisible marks are skipped). "Word" skips matches inside a longer
   word. Matches never cross from one paragraph into the next; a printed
   line break counts as a space. */
export const VERSION = 1;

const DROP_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200B-\u200F\u061C]/;
const INVISIBLE_RE = /[\u0640\u200B-\u200F\u061C]/;
const WORD_CHAR_RE = /[\p{L}\p{N}\p{M}]/u;
const LETTER_MAP = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ٲ': 'ا', 'ٳ': 'ا',
  'ى': 'ي', 'ی': 'ي', 'ئ': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ک': 'ك'
};

// One character as search sees it: '' when it's skipped.
function normChar(c, exact) {
  if (exact ? INVISIBLE_RE.test(c) : DROP_RE.test(c)) return '';
  if (!exact && LETTER_MAP[c]) return LETTER_MAP[c];
  const code = c.charCodeAt(0);
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
  if (code >= 0x06F0 && code <= 0x06F9) return String(code - 0x06F0);
  if (/\s/.test(c)) return ' ';
  const lower = c.toLowerCase();
  return lower.length === 1 ? lower : c;
}

// A mark that search ignores by default (used to extend a highlight over
// the diacritics sitting on its last letter).
function isDropChar(c) {
  return DROP_RE.test(c);
}

function normalizeQuery(q, exact) {
  let out = '';
  for (const c of q) {
    const n = normChar(c, exact);
    if (n === ' ' && (out === '' || out.endsWith(' '))) continue;
    out += n;
  }
  return out.trim();
}

/* A searchable page, built piece by piece.
   page.norm   — normalized text ('\n' between paragraphs)
   page.oNode  — for each norm char: index of its text run (-1 = break)
   page.oOff   — for each norm char: offset inside that run
   page.orig   — original text, runs joined ('\n' between paragraphs)
   page.nodes  — the caller's reference for each run (a DOM node, …)
   page.nodeStart — where each run starts in orig */
function createPage(exact) {
  const page = { nodes: [], nodeStart: [], orig: '', norm: '', oNode: [], oOff: [] };
  return {
    page,
    // Start a new paragraph: matches never cross it.
    paragraph() {
      if (page.norm && !page.norm.endsWith('\n')) { page.norm += '\n'; page.oNode.push(-1); page.oOff.push(-1); }
      if (page.orig) page.orig += '\n';
    },
    // A printed line break (<br>): read as a space.
    lineBreak() {
      if (page.norm && !page.norm.endsWith(' ') && !page.norm.endsWith('\n')) { page.norm += ' '; page.oNode.push(-1); page.oOff.push(-1); }
      page.orig += ' ';
    },
    text(v, ref) {
      const ni = page.nodes.length;
      page.nodes.push(ref);
      page.nodeStart.push(page.orig.length);
      page.orig += v;
      for (let k = 0; k < v.length; k++) {
        const n = normChar(v[k], exact);
        if (!n) continue;
        if (n === ' ' && (page.norm === '' || page.norm.endsWith(' ') || page.norm.endsWith('\n'))) continue;
        page.norm += n;
        page.oNode.push(ni);
        page.oOff.push(k);
      }
    }
  };
}

// q: a normalized query (normalizeQuery). Returns [{ page, s, e }] with
// s/e as positions in page.norm, at most opts.max matches.
function findMatches(pages, q, opts) {
  const word = !!(opts && opts.word);
  const max = (opts && opts.max) || Infinity;
  const matches = [];
  if (!q) return matches;
  outer:
  for (const page of pages) {
    let from = 0;
    for (;;) {
      const i = page.norm.indexOf(q, from);
      if (i < 0) break;
      from = i + 1;
      if (word) {
        const before = page.norm[i - 1];
        const after = page.norm[i + q.length];
        if ((before && WORD_CHAR_RE.test(before)) || (after && WORD_CHAR_RE.test(after))) continue;
      }
      matches.push({ page, s: i, e: i + q.length });
      from = i + q.length;
      if (matches.length >= max) break outer;
    }
  }
  return matches;
}

// The original text around a match: { before, hit, after }.
function snippet(m, chars) {
  const p = m.page;
  const a = p.nodeStart[p.oNode[m.s]] + p.oOff[m.s];
  const b = p.nodeStart[p.oNode[m.e - 1]] + p.oOff[m.e - 1] + 1;
  const from = Math.max(0, a - chars);
  const to = Math.min(p.orig.length, b + chars);
  const clean = (s) => s.replace(/\s+/g, ' ');
  return {
    before: (from > 0 ? '…' : '') + clean(p.orig.slice(from, a)),
    hit: clean(p.orig.slice(a, b)),
    after: clean(p.orig.slice(b, to)) + (to < p.orig.length ? '…' : '')
  };
}

export { normChar, isDropChar, normalizeQuery, createPage, findMatches, snippet };

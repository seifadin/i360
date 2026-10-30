/* i360 book format — shared by the Markdown Reader and the i360 CSE indexer,
   so both read a book file the same way: the same pages, volumes, footnotes
   and displayed text.

   Covers the OCR engine's export format ([ص X] / [ج N ص X] page markers,
   footnotes below the page's last "---", hidden HTML comments), the older
   ==Start pN== format and plain Markdown, plus the safe Markdown rendering
   the Reader shows. No page or screen code here. An ES module (bundled into
   the Reader, imported by the indexer). The Markdown parser
   (marked) is passed in, so this file has no dependencies of its own. */
export const VERSION = 1;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Eastern Arabic and Persian digits → Western digits.
function toWestern(s) {
  return String(s)
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

/* ================================================================
   Markdown rendering (safe)
   Book text never needs raw HTML, links or images, so:
   - HTML comments (running headers, notes) are removed before parsing;
   - any other raw HTML is shown as text, never run — except <br>, which
     the OCR engine uses for a line break inside a table cell;
   - "[" is escaped, so "[القيامة: 22–23](5)" can't turn into a link;
   - only bare http(s) URLs become links.
   Line breaks: the OCR engine joins the printed lines of a paragraph
   into one line, so any single line break left in its export is a real
   printed line break (a name and its title, title-page and imprint lines,
   poetry). In OCR-format books it is shown as a line break. Other files
   follow standard Markdown, where a single line break is just a space.
   ================================================================ */
const SAFE_RENDERER = {
  renderer: {
    html(token) {
      if (/^<br\s*\/?>$/i.test(token.text.trim())) return '<br>';
      return escapeHtml(token.text);
    },
    link(token) {
      const text = this.parser.parseInline(token.tokens);
      if (/^https?:\/\//i.test(token.href)) {
        return `<a href="${escapeHtml(token.href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }
      return text;
    },
    image(token) { return escapeHtml(token.text || ''); }
  }
};

function stripComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, '');
}

function protectMarkdown(s) {
  return stripComments(s)
    .replace(/\[/g, '\\[')
    // A "---" or "===" line right under text would turn that text into a
    // heading (setext). Book text never means that: keep it a separator.
    .replace(/([^\n])\n([ \t]*(?:-{3,}|={3,})[ \t]*)$/gm, '$1\n\n$2');
}

// marked: the marked library (import * as marked from 'marked').
// format: 'ocr' | 'legacy' | 'plain', from parseBook.
function createRenderer(marked) {
  const mdStandard = new marked.Marked({ gfm: true, breaks: false, async: false });
  const mdOcr = new marked.Marked({ gfm: true, breaks: true, async: false });
  mdStandard.use(SAFE_RENDERER);
  mdOcr.use(SAFE_RENDERER);
  const md = (format) => (format === 'ocr' ? mdOcr : mdStandard);
  return {
    block: (format, s) => md(format).parse(protectMarkdown(s)),
    inline: (format, s) => md(format).parseInline(protectMarkdown(s))
  };
}

/* ================================================================
   Parsing the book into pages
   ================================================================ */
// [ص 12] · [ص أ] · [ص -] · [ص ?] · [ج 2 ص 12] — at the start of a line.
const PAGE_MARKER_RE = /^[ \t]*\[(?:ج[ \t]*([^\s\]]+)[ \t]+)?ص[ \t]*([^\]\n]*?)[ \t]*\]/gm;

function hasVisibleContent(s) {
  return stripComments(s).trim().length > 0;
}

function makePage(kind, vol, label, mdText) {
  const lab = toWestern(label.trim());
  return {
    kind,
    vol: vol == null ? null : toWestern(String(vol).trim()),
    label: lab,
    num: /^\d+$/.test(lab) ? parseInt(lab, 10) : null,
    md: mdText
  };
}

// { format: 'ocr' | 'legacy' | 'plain', pages: [{ kind, vol, label, num, md }] }
function parseBook(raw) {
  const text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  const marks = [...text.matchAll(PAGE_MARKER_RE)];
  if (marks.length > 0) {
    const pages = [];
    const lead = text.slice(0, marks[0].index);
    if (hasVisibleContent(lead)) pages.push(makePage('front', null, '', lead));
    marks.forEach((m, i) => {
      const start = m.index + m[0].length;
      const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
      const label = m[2].trim();
      pages.push(makePage(label === '?' ? 'untranscribed' : 'page', m[1], label, text.slice(start, end)));
    });
    return { format: 'ocr', pages };
  }

  // Older Gemini tool format: ==Start pN== … ==End pN==
  const legacy = [...text.matchAll(/==Start\s+p(\d+)==([\s\S]*?)==End\s+p\1==/gi)];
  if (legacy.length > 0) {
    const pages = legacy.map((m) => makePage('page', null, m[1], m[2]));
    pages.sort((a, b) => a.num - b.num);
    return { format: 'legacy', pages };
  }

  return { format: 'plain', pages: [makePage('page', null, '', text)] };
}

/* ================================================================
   Footnotes: plain text below the page's last "---", numbers as printed.
   A note starts with "(n)" (or "n-"); other lines continue the note.
   ================================================================ */
const NOTE_START_RE = /^\((\d{1,3})\)\s*([\s\S]*)$|^(\d{1,3})\s*[-–]\s+([\s\S]*)$/;

function toWesternNoteLine(line) {
  // Only the leading marker; the note text stays as printed.
  return line.replace(/^\(([\u0660-\u0669\u06F0-\u06F9]{1,3})\)/, (m, d) => `(${toWestern(d)})`);
}

// { body, notes: [{ n, md }] } — n is null for a note with no number.
function splitFootnotes(mdText) {
  const lines = stripComments(mdText).split('\n');
  let sep = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^[ \t]*-{3,}[ \t]*$/.test(lines[i])) { sep = i; break; }
  }
  if (sep < 0) return { body: mdText, notes: [] };

  const after = lines.slice(sep + 1).map((l) => toWesternNoteLine(l.trim())).filter(Boolean);
  if (!after.some((l) => NOTE_START_RE.test(l))) return { body: mdText, notes: [] };

  const notes = [];
  let cur = null;
  for (const line of after) {
    const m = NOTE_START_RE.exec(line);
    if (m) {
      cur = { n: m[1] || m[3], md: m[2] != null ? m[2] : m[4] };
      notes.push(cur);
    } else if (cur) {
      cur.md += ' ' + line;
    } else {
      cur = { n: null, md: line };
      notes.push(cur);
    }
  }

  // If several notes were joined on one line, split at " (n+1) ".
  const out = [];
  for (const note of notes) {
    let rest = note;
    for (;;) {
      out.push(rest);
      if (rest.n == null) break;
      const next = String(parseInt(rest.n, 10) + 1);
      const re = new RegExp(`\\s\\(${next}\\)\\s`);
      const m = re.exec(rest.md);
      if (!m) break;
      const tail = { n: next, md: rest.md.slice(m.index + m[0].length) };
      rest.md = rest.md.slice(0, m.index);
      rest = tail;
    }
  }

  return { body: lines.slice(0, sep).join('\n'), notes: out };
}

export { escapeHtml, toWestern, stripComments, hasVisibleContent, createRenderer, parseBook, splitFootnotes };

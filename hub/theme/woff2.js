// Just enough of a WOFF2 reader for the font update's safety check: which
// characters a font has (cmap) and its version string (name ID 5).
// WOFF2: https://www.w3.org/TR/WOFF2/ — one Brotli stream holds every table,
// in directory order, back to back.

import zlib from 'zlib';

const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep',
  'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS',
  'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln',
  'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf',
  'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

function readTables(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 file');
  const numTables = buf.readUInt16BE(12);
  const compressedLength = buf.readUInt32BE(20);
  let p = 48;
  const base128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const b = buf[p++];
      if (i === 0 && b === 0x80) throw new Error('bad UIntBase128');
      v = v * 128 + (b & 0x7f);
      if (!(b & 0x80)) return v;
    }
    throw new Error('UIntBase128 too long');
  };
  const dir = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[p++];
    let tag;
    if ((flags & 0x3f) === 0x3f) { tag = buf.toString('latin1', p, p + 4); p += 4; } else tag = KNOWN_TAGS[flags & 0x3f];
    const version = flags >> 6;
    const origLength = base128();
    const transformed = (tag === 'glyf' || tag === 'loca') ? version === 0 : version !== 0;
    const length = transformed ? base128() : origLength;
    dir.push({ tag, length, transformed });
  }
  const data = zlib.brotliDecompressSync(buf.subarray(p, p + compressedLength));
  const tables = {};
  let off = 0;
  for (const t of dir) { tables[t.tag] = { data: data.subarray(off, off + t.length), transformed: t.transformed }; off += t.length; }
  return tables;
}

// Every character the font maps (formats 4 and 12, Unicode subtables).
function codePoints(buf) {
  const t = readTables(buf).cmap;
  if (!t || t.transformed) throw new Error('no cmap table');
  const c = t.data;
  const set = new Set();
  const n = c.readUInt16BE(2);
  for (let i = 0; i < n; i++) {
    const platform = c.readUInt16BE(4 + i * 8), encoding = c.readUInt16BE(6 + i * 8), off = c.readUInt32BE(8 + i * 8);
    if (!(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10)))) continue;
    const format = c.readUInt16BE(off);
    if (format === 4) {
      const segX2 = c.readUInt16BE(off + 6);
      const ends = off + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = c.readUInt16BE(ends + s * 2), start = c.readUInt16BE(starts + s * 2);
        const delta = c.readInt16BE(deltas + s * 2), ro = c.readUInt16BE(ranges + s * 2);
        for (let ch = start; ch <= end && ch !== 0xffff; ch++) {
          let g;
          if (ro === 0) g = (ch + delta) & 0xffff;
          else {
            g = c.readUInt16BE(ranges + s * 2 + ro + (ch - start) * 2);
            if (g !== 0) g = (g + delta) & 0xffff;
          }
          if (g !== 0) set.add(ch);
        }
      }
    } else if (format === 12) {
      const groups = c.readUInt32BE(off + 12);
      for (let gI = 0; gI < groups; gI++) {
        const start = c.readUInt32BE(off + 16 + gI * 12), end = c.readUInt32BE(off + 20 + gI * 12);
        for (let ch = start; ch <= end; ch++) set.add(ch);
      }
    }
  }
  return set;
}

// name ID 5, e.g. "Version 1.002"
function versionString(buf) {
  const t = readTables(buf).name;
  if (!t) return null;
  const d = t.data;
  const count = d.readUInt16BE(2), strings = d.readUInt16BE(4);
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12;
    const platform = d.readUInt16BE(r), id = d.readUInt16BE(r + 6), len = d.readUInt16BE(r + 8), off = d.readUInt16BE(r + 10);
    if (id !== 5) continue;
    const raw = d.subarray(strings + off, strings + off + len);
    if (platform === 3 || platform === 0) { let s = ''; for (let k = 0; k + 1 < raw.length; k += 2) s += String.fromCharCode(raw.readUInt16BE(k)); return s; }
    return raw.toString('latin1');
  }
  return null;
}

export { codePoints, versionString };

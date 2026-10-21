#!/usr/bin/env node
// Daily Reflection's default-city table (src/day-cities.json): for every device time
// zone, its main city — from the time-zone database itself — with coordinates,
// country and the city's name in the page's five languages (i360-hub.md §10).
// Built once at development time and committed; the page never asks anyone for it.
//
//   node scripts/day-cities.js --zones   cities, coordinates and countries from this
//                                        machine's time-zone database (zone.tab, the
//                                        links in tzdata.zi); keeps names already found
//   node scripts/day-cities.js --names   the five names from Open-Meteo's geocoding
//                                        (GeoNames data, no key), about 2,100 requests,
//                                        well inside its free limit; only zones still
//                                        missing a name are asked again
//
// A zone whose city Open-Meteo can't match keeps its English name in every
// language (listed at the end of --names). The time-zone database is public domain.
'use strict';
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const OUT = join(__dirname, '..', 'src', 'day-cities.json');
const ZONEINFO = '/usr/share/zoneinfo';
const LANGS = ['en', 'ar', 'tr', 'id', 'ur'];
const SEARCH = 'https://geocoding-api.open-meteo.com/v1/search';
const PAUSE_MS = +(process.env.PAUSE_MS ?? 250);         // ~240 requests a minute (Open-Meteo's free limit is 600)
const MAX_KM = 150;           // a result this far from the zone's own point is another place

// Zones whose city GeoNames spells differently from the time-zone database (first run,
// 2026-10-22: 37 zones unmatched). Only searched under this name; the distance check
// still applies, so a wrong guess just leaves the English name.
const SEARCH_AS = {
  'Africa/El_Aaiun': 'Laayoune', 'Africa/Ndjamena': "N'Djamena",
  'Asia/Qyzylorda': 'Kyzylorda', 'Asia/Qostanay': 'Kostanay', 'Asia/Aqtobe': 'Aktobe', 'Asia/Aqtau': 'Aktau',
  'Asia/Hovd': 'Khovd', 'Asia/Sakhalin': 'Yuzhno-Sakhalinsk', 'Asia/Kamchatka': 'Petropavlovsk-Kamchatsky',
  'America/St_Johns': "St. John's", 'America/St_Kitts': 'Basseterre', 'America/St_Lucia': 'Castries',
  'America/St_Vincent': 'Kingstown', 'America/St_Thomas': 'Charlotte Amalie', 'America/St_Barthelemy': 'Gustavia',
  'America/Lower_Princes': "Lower Prince's Quarter", 'America/Guyana': 'Georgetown',
  'America/Argentina/Tucuman': 'San Miguel de Tucumán', 'America/Noronha': 'Fernando de Noronha',
  'America/Goose_Bay': 'Happy Valley-Goose Bay', 'America/Matamoros': 'Heroica Matamoros', 'America/Dawson': 'Dawson City',
  'Atlantic/St_Helena': 'Jamestown', 'Pacific/Wallis': 'Mata-Utu', 'Pacific/Galapagos': 'Puerto Baquerizo Moreno',
  'Pacific/Easter': 'Hanga Roa', 'Indian/Christmas': 'Flying Fish Cove', 'Pacific/Chatham': 'Waitangi'
};

const load = () => (existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { zones: {}, aliases: {} });
const save = (data) => {   // one zone per line, so a regenerated table diffs readably
  const rows = (o) => Object.entries(o).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n');
  writeFileSync(OUT, `{\n  "source": ${JSON.stringify(data.source)},\n  "tzdata": ${JSON.stringify(data.tzdata)},\n  "zones": {\n${rows(data.zones)}\n  },\n  "aliases": {\n${rows(data.aliases)}\n  }\n}\n`);
};

// "+3003+03115" (±DDMM±DDDMM, or with seconds) → decimal degrees.
function coords(iso) {
  const m = /^([+-])(\d{2})(\d{2})(\d{2})?([+-])(\d{3})(\d{2})(\d{2})?$/.exec(iso);
  if (!m) throw new Error(`zone.tab: unreadable coordinates ${iso}`);
  const dms = (s, d, mi, se) => (s === '-' ? -1 : 1) * (+d + +mi / 60 + (+se || 0) / 3600);
  const r = (x) => Math.round(x * 1e4) / 1e4;
  return [r(dms(m[1], m[2], m[3], m[4])), r(dms(m[5], m[6], m[7], m[8]))];
}

function zones() {
  const old = load();
  const data = { source: 'IANA time zone database (zone.tab), names from Open-Meteo geocoding (GeoNames)', tzdata: '', zones: {}, aliases: {} };
  const zi = readFileSync(join(ZONEINFO, 'tzdata.zi'), 'utf8');
  data.tzdata = (/^# version (\S+)/m.exec(zi) || [])[1] || 'unknown';
  for (const line of readFileSync(join(ZONEINFO, 'zone.tab'), 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [cc, iso, tz] = line.split('\t');
    const [lat, lng] = coords(iso);
    const city = tz.split('/').pop().replace(/_/g, ' ');
    data.zones[tz] = { cc, lat, lng, n: (old.zones[tz] && old.zones[tz].n) || { en: city } };
  }
  // Old and alternative names a browser may report (Asia/Calcutta → Asia/Kolkata …).
  for (const line of zi.split('\n')) {
    if (!line.startsWith('L ')) continue;
    const [, target, alias] = line.split(' ');
    if (data.zones[target] && !data.zones[alias]) data.aliases[alias] = target;
  }
  save(data);
  console.log(`${OUT}: ${Object.keys(data.zones).length} zones, ${Object.keys(data.aliases).length} aliases (tzdata ${data.tzdata})`);
}

const km = (a, b, c, d) => {
  const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

async function search(name, lang) {
  const url = `${SEARCH}?name=${encodeURIComponent(name)}&count=20&language=${lang}&format=json`;
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(url).catch((e) => ({ ok: false, status: e.message }));
    if (r.ok) return (await r.json()).results || [];
    if (attempt === 4) throw new Error(`Open-Meteo: ${r.status} for ${name} (${lang})`);
    await new Promise((res) => setTimeout(res, 2000 * attempt));
  }
}

// The zone's own city among the results: same country, near the zone's point;
// the same time zone and a larger population break ties.
function pick(results, tz, z) {
  const near = results
    .filter((p) => p.country_code === z.cc && km(z.lat, z.lng, p.latitude, p.longitude) <= MAX_KM)
    .sort((a, b) => (b.timezone === tz) - (a.timezone === tz) || (b.population || 0) - (a.population || 0));
  return near[0] || null;
}

async function names() {
  const data = load();
  const todo = Object.entries(data.zones).filter(([tz, z]) => LANGS.some((l) => !z.n[l]) && (!z.unmatched || SEARCH_AS[tz]));
  console.log(`${todo.length} zones to name, ${todo.length * LANGS.length} requests at most…`);
  const unmatched = [];
  let done = 0;
  for (const [tz, z] of todo) {
    const en = await search(SEARCH_AS[tz] || z.n.en, 'en');
    await new Promise((r) => setTimeout(r, PAUSE_MS));
    const place = pick(en, tz, z);
    if (!place) { unmatched.push(tz); z.unmatched = true; continue; }
    z.n.en = place.name;
    delete z.unmatched;
    for (const lang of LANGS.slice(1)) {
      const found = (await search(place.name, lang)).find((p) => p.id === place.id);
      await new Promise((r) => setTimeout(r, PAUSE_MS));
      z.n[lang] = found ? found.name : place.name;   // Open-Meteo itself gives the English name when it has none
    }
    if (++done % 25 === 0) { save(data); console.log(`  ${done}/${todo.length}`); }
  }
  save(data);
  console.log(`${OUT}: done. ${unmatched.length} zones kept their English name only${unmatched.length ? `:\n  ${unmatched.join(' ')}` : '.'}`);
}

const mode = process.argv[2];
if (mode === '--zones') zones();
else if (mode === '--names') names().catch((e) => { console.error(`✗ ${e.message}\n  Run it again: zones already named are kept.`); process.exit(1); });
else { console.error('usage: node scripts/day-cities.js --zones | --names'); process.exit(2); }

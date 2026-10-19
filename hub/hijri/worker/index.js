// dar-hijri Worker (dar-hijri.i36o.workers.dev): entry point. Wires the scheduled run
// and visitor requests to the retrieval rules (source.js) and the shared calculator
// (../calc.js). Bundled by wrangler from hijri/wrangler.jsonc; KV binding HIJRI.
//
//   GET /?date=YYYY-MM-DD  the Hijri date of that civil date (within a day of Cairo's):
//                          200 { date, h: {y, m, d}, source: 'dar'|'calc', provisional, v }
//                          400 { error } for a date it doesn't answer
//                          (the contract read by hijri/client.js)
//   GET /                  the old answer, kept while the day page and the i360 release
//                          script still ask for it: 200 { hijri: "8 جمادى الأولى 1448",
//                          cairo: "YYYY-MM-DD" } when Dar al-Ifta's date is known, else 502
//   GET /?debug=1          state, rules and a live reading of Dar al-Ifta
//   GET /?check=1          run the scheduled check now (it asks Dar al-Ifta only when the
//                          rules say so; useful right after a deploy)
//   scheduled (every 30 minutes, see wrangler.jsonc): the check
import calc from '../calc.js';
import S from './source.js';

const ALLOW_ORIGIN = '*';
const CORS = {
  'Access-Control-Allow-Origin': ALLOW_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

// A date from Dar al-Ifta (confirmed or counted) never changes, so the browser may keep it a
// day; a provisional or calculated one may change soon.
const maxAge = (a) => a.source === calc.SOURCES.DAR ? 86400 : (a.provisional ? 300 : 600);

const json = (body, status = 200, cacheSeconds = 0) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheSeconds ? `public, max-age=${cacheSeconds}` : 'no-store',
    ...CORS
  }
});

const sourceFor = (env) => S.createSource({ calc, fetch: (...args) => fetch(...args), kv: env.HIJRI });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405);
    const url = new URL(request.url);
    const src = sourceFor(env);
    const now = new Date();

    if (url.searchParams.get('debug') === '1') {
      const cairoToday = calc.todayIn(S.CAIRO, now);
      const dar = await src.readDar(cairoToday);
      return json({
        v: calc.VERSION, calendar: calc.CALENDAR, cairoToday,
        intlToday: calc.fromCivil(cairoToday),                  // proves Intl's islamic calendar works here
        rules: { checkFromHour: S.CHECK_FROM_HOUR, firstReadHour: S.FIRST_READ_HOUR, maxOffset: S.MAX_OFFSET },
        state: await src.readState(),
        darNow: dar
      });
    }

    if (url.searchParams.get('check') === '1') return json(await src.check(now));

    const date = url.searchParams.get('date');
    if (date !== null) {
      const a = await src.answer(date, now);
      if (a.error) return json({ error: a.error }, 400);
      return json({ ...a, v: calc.VERSION }, 200, maxAge(a));
    }

    // The old answer (no ?date=): Cairo's date, only when it comes from Dar al-Ifta.
    const cairo = calc.todayIn(S.CAIRO, now);
    const a = await src.answer(cairo, now);
    if (a.source !== calc.SOURCES.DAR) return json({ error: 'Dar al-Ifta date not known yet', attempts: [] }, 502);
    return json({ hijri: `${a.h.d} ${S.MONTHS_AR[a.h.m - 1]} ${a.h.y}`, cairo, via: 'kv' });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(sourceFor(env).check(new Date(event.scheduledTime)).then((r) => console.log('hijri check', JSON.stringify(r))));
  }
};

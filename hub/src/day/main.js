// Daily Reflection's script (src/day.src.html), bundled into the page by scripts/build.js with
// what it imports: the shared Hijri date (hijri/, i360-hub.md §8), Adhan (adhan-js, MIT,
// Batoul Apps: prayer times calculated on the device, i360-hub.md §10) and the default-city
// table (src/day-cities.json: every time zone's main city; the build keeps only the fields
// used here).
import * as adhan from 'adhan';
import * as i360Theme from '../../theme/site/theme-loader.js';
import * as HijriCalc from '../../hijri/calc.js';
import * as HijriClient from '../../hijri/client.js';
import DAY_CITIES from '../day-cities.json';

// Tailwind's dark: styles follow the "dark" class (set in the page's <head> from the saved theme).
i360Theme.onChange((s) => { document.documentElement.classList.toggle('dark', s.theme === 'dark'); });

/* ---------- Config ---------- */
const CONFIG = {
    S: { T: 'th-v8', L: 'ln-v8', M: 'sm-v8', Q: 'qd-v8', H: 'hd-v8', CITY: 'ct-v1' },
    API: {
        Q: 'https://api.alquran.cloud/v1/ayah',
        HE: 'https://hadeethenc.com/api/v1',
        CITY: 'https://geocoding-api.open-meteo.com/v1/search'   // the city picker only
    },
    // HadeethEnc root categories left out of the daily pick (2 = "The Hadith and Hadith Sciences", technical, 10 items).
    HADEETH_EXCLUDE_ROOTS: ['2'],
    EDITIONS: { quran: { ar: 'ar.jalalayn', en: 'en.sahih', tr: 'tr.ates', id: 'id.indonesian', ur: 'ur.ahmedali' } },
    P_KEYS: ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
    P_NEXT_KEYS: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],   // Sunrise is shown but is not a prayer
    EV: [
        {id:'h_new',d:1,m:0},{id:'tasua',d:9,m:0},{id:'ashura',d:10,m:0},
        {id:'mig_mecca',d:27,m:1},
        {id:'mawlid',d:12,m:2},
        {id:'isra',d:27,m:6},
        {id:'baraah',d:15,m:7},{id:'cres',d:29,m:7},
        {id:'ram_start',d:1,m:8},{id:'badr',d:17,m:8},{id:'fath',d:20,m:8},{id:'qadr',d:27,m:8},
        {id:'f1',d:1,m:9},{id:'f2',d:2,m:9},{id:'f3',d:3,m:9},
        {id:'sq',d:1,m:10},
        {id:'sh',d:1,m:11},{id:'tar',d:8,m:11},{id:'ara',d:9,m:11},{id:'a1',d:10,m:11},{id:'a2',d:11,m:11},{id:'a3',d:12,m:11},{id:'a4',d:13,m:11}
    ]
};

/* Prayer-time calculation (adhan-js, on the device): the method by the city's country, from Adhan's
   own methods and recommendations only (Seif 2026-10-22, i360-hub.md §10); every other country:
   Muslim World League. Its name: Arabic on the Arabic page, the institution's English name otherwise. */
const METHOD_BY_COUNTRY = {
    Egyptian: 'EG SD LY SY LB IQ JO PS', UmmAlQura: 'SA YE BH OM', Dubai: 'AE', Kuwait: 'KW', Qatar: 'QA',
    Turkey: 'TR', Tehran: 'IR', Karachi: 'PK IN BD AF', Singapore: 'SG MY ID BN', MoonsightingCommittee: 'US CA GB'
};
const METHOD_OF = {};
Object.keys(METHOD_BY_COUNTRY).forEach(m => METHOD_BY_COUNTRY[m].split(' ').forEach(cc => { METHOD_OF[cc] = m; }));
const METHOD_NAMES = {
    MuslimWorldLeague: ['رابطة العالم الإسلامي', 'Muslim World League'],
    Egyptian: ['الهيئة المصرية العامة للمساحة', 'Egyptian General Authority of Survey'],
    UmmAlQura: ['جامعة أم القرى، مكة المكرمة', 'Umm al-Qura University, Makkah'],
    Dubai: ['دبي', 'Dubai'], Kuwait: ['الكويت', 'Kuwait'], Qatar: ['قطر', 'Qatar'],
    Turkey: ['رئاسة الشؤون الدينية التركية (ديانت)', 'Diyanet İşleri Başkanlığı, Turkey'],
    Tehran: ['معهد الجيوفيزياء، جامعة طهران', 'Institute of Geophysics, University of Tehran'],
    Karachi: ['جامعة العلوم الإسلامية بكراتشي', 'University of Islamic Sciences, Karachi'],
    Singapore: ['مجلس الشؤون الإسلامية بسنغافورة', 'Majlis Ugama Islam Singapura'],
    MoonsightingCommittee: ['لجنة رؤية الهلال', 'Moonsighting Committee Worldwide']
};
// No usable device time zone: Makkah (Seif 2026-10-22).
const MAKKAH = { cc: 'SA', lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh',
                 n: { ar: 'مكة المكرمة', en: 'Makkah', tr: 'Mekke', id: 'Makkah', ur: 'مکہ مکرمہ' } };

/* ---------- Small helpers ---------- */
const pad = n => String(n).padStart(2, '0');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ymdKey = o => `${o.y}-${pad(o.m)}-${pad(o.d)}`;
const localYMD = (d = new Date()) => ({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() });
function minutesNowIn(tz) {
    try {
        const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
        return parseInt(p.find(x => x.type === 'hour').value, 10) * 60 + parseInt(p.find(x => x.type === 'minute').value, 10);
    } catch (e) { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); }
}
function mk(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
}
// Lucide icons shown from script (the hourglass beside a provisional Hijri date).
const HOURGLASS = '<svg data-lucide="hourglass" class="icon-inline me-1" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg>';
function svgIcon(markup) {
    const t = document.createElement('template');
    t.innerHTML = markup;
    return t.content.firstChild;
}

const DataStore = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode / quota: ignore */ } }
};

/* ---------- Network: timeout, no retry on 4xx, bounded retries on network/5xx ---------- */
const Net = {
    async fetch(url, { timeout = 6000, retries = 1, backoff = 800, ...opts } = {}) {
        for (let attempt = 0; ; attempt++) {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeout);
            try {
                const r = await fetch(url, { ...opts, signal: ctrl.signal });
                if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
                return await r.json();
            } catch (e) {
                const permanent = e.status && e.status >= 400 && e.status < 500 && e.status !== 429;
                if (permanent || attempt >= retries) throw e;
                await sleep(backoff * 2 ** attempt);
            } finally { clearTimeout(timer); }
        }
    }
};

/* ---------- Hijri date: the shared files (hijri/calc.js, hijri/client.js; i360-hub.md §8) ----------
   The date comes from the dar-hijri Worker (Dar al-Ifta's), or is calculated here when the Worker
   can't be reached; the label says which. The browser keeps the Worker's answer (its cache headers),
   so the page saves nothing itself. k = the day shift between the calculator and that date, used
   to project the events. */
try { localStorage.removeItem('hj-v9'); } catch (e) { /* the page's own saved copy until 2026-10; no longer used */ }
try { localStorage.removeItem('sc-v8'); } catch (e) { /* the GPS position saved until 2026-10-22: the page no longer asks for it */ }
const Hijri = {
    today: () => HijriCalc.todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone),
    make(date, h, source, provisional) {
        const k = HijriCalc.offsetFor(date, h, 3);
        return { date, today: h, source, provisional, k: k === null ? 0 : k };
    },
    sync() { const date = this.today(); return this.make(date, HijriCalc.fromCivil(date), HijriCalc.SOURCES.CALC, false); },
    async resolve() {
        const r = await HijriClient.get({ date: this.today() });
        if (r.error) console.warn('[hijri] calculated here:', r.error);
        if (r.outdated) console.warn('[hijri] this page\'s calc.js differs from the Worker\'s: rebuild and redeploy the page');
        return this.make(r.date, r.h, r.source, r.provisional);
    },
    label(h, lang) { return HijriCalc.label(h.provisional ? 'provisional' : h.source, lang); },
    /* Next occurrence of every event, by walking forward day by day (no drifting arithmetic). */
    events(h) {
        const out = [], seen = new Set();
        for (let i = 0; i <= 385 && seen.size < CONFIG.EV.length; i++) {
            const x = HijriCalc.addDays(h.date, i), hh = HijriCalc.fromCivil(x, h.k);
            for (const e of CONFIG.EV) {
                if (!seen.has(e.id) && e.m + 1 === hh.m && e.d === hh.d) { seen.add(e.id); out.push({ id: e.id, d: e.d, m: e.m, year: hh.y, date: HijriCalc.parseYMD(x), isT: i === 0 }); }
            }
        }
        return out.slice(0, 10);
    }
};

/* ---------- HadeethEnc (IslamHouse / Saudi Ministry of Islamic Affairs) ---------- */
const HE = {
    per: 20,
    async list(lang, cat, page) {
        const r = await Net.fetch(`${CONFIG.API.HE}/hadeeths/list/?language=${lang}&category_id=${cat}&page=${page}&per_page=${this.per}`);
        const m = r.meta || {};
        return { items: Array.isArray(r) ? r : (r.data || []), total: Number(m.total_items ?? m.total ?? m.count) || 0, lastPage: Number(m.last_page) || 0 };
    },
    async pickId(lang) {
        const r = await Net.fetch(`${CONFIG.API.HE}/categories/roots/?language=${lang}`);
        const roots = (Array.isArray(r) ? r : (r.data || [])).filter(c => !CONFIG.HADEETH_EXCLUDE_ROOTS.includes(String(c.id)));
        if (!roots.length) throw new Error('HadeethEnc: no root categories');
        const counts = roots.map(c => Number(c.hadeeths_count) || 0), total = counts.reduce((a, b) => a + b, 0);
        let root, idx = null;
        if (total > 0) {                           // uniform over all hadiths in the allowed roots
            let n = Math.floor(Math.random() * total);
            for (let i = 0; i < roots.length; i++) { if (n < counts[i]) { root = roots[i]; idx = n; break; } n -= counts[i]; }
        } else root = roots[Math.floor(Math.random() * roots.length)];
        let res;
        try { res = await this.list(lang, root.id, idx === null ? 1 : Math.floor(idx / this.per) + 1); }
        catch (e) { if (e.status && e.status < 500) { idx = null; res = await this.list(lang, root.id, 1); } else throw e; }
        if (idx === null) {                        // sizes unknown: learn them from meta, then jump to a random page
            const last = res.lastPage || (res.total ? Math.ceil(res.total / this.per) : 1);
            const p = 1 + Math.floor(Math.random() * last);
            if (p !== 1) res = await this.list(lang, root.id, p);
            idx = Math.floor(Math.random() * Math.max(res.items.length, 1));
        }
        if (!res.items.length) throw new Error('HadeethEnc: empty page');
        return String(res.items[Math.min(idx % this.per, res.items.length - 1)].id);
    },
    one(lang, id, opts) { return Net.fetch(`${CONFIG.API.HE}/hadeeths/one/?id=${id}&language=${lang}`, opts); },
    async daily(lang) {
        const day = ymdKey(localYMD()), c = DataStore.get(CONFIG.S.H);
        let id = (c && c.day === day && c.lang === lang) ? c.id : null;
        for (let attempt = 0; attempt < 2; attempt++) {
            if (!id) { id = await this.pickId(lang); DataStore.set(CONFIG.S.H, { day, lang, id }); }
            try {
                const rec = await this.one(lang, id);
                // HadeethEnc returns the bibliography (`reference`) for Arabic only. For other languages it is fetched from the
                // Arabic record in the background, so a slow or failed extra request never delays or blocks the hadith itself.
                if (lang !== 'ar' && !rec.reference) {
                    this.one('ar', id, { retries: 0, timeout: 4000 }).then(ar => {
                        if (ar && ar.reference) { rec.reference = ar.reference; if (App.state.hadith === rec) UI.renderHadith(); }
                    }).catch(() => { /* bibliography is optional */ });
                }
                return rec;
            }
            catch (e) { if (attempt === 0 && e.status && e.status < 500) { id = null; continue; } throw e; }   // stale/missing id: pick again once
        }
    }
};


const LOCALES = {
    ar: { 
        dir:"rtl",title:"التأمل اليومي",quranLabel:"الآية القرآنية",hadithLabel:"الحديث الشريف",prayerLabel:"مواقيت الصلاة",eventsLabel:"المناسبات القادمة",methodLabel:"الطريقة",madhabLabel:"المذهب",locLabel:"الموقع",tzLabel:"المنطقة الزمنية",expected:"متوقع",next:"القادم",todayLabel:"اليوم",months:["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"],
        events: {
            h_new: "1 محرم: رأس السنة الهجرية (أحد الأشهر الحُرم)",
            tasua: "9 محرم: يوم تاسوعاء",
            ashura: "10 محرم: يوم عاشوراء، يوم نجى الله فيه موسى عليه السلام و أغرق آل فرعون",
            mig_mecca: "27 صفر: ذكرى هجرة الرسول ﷺ من مكة إلى المدينة (على ما ذُكر في بعض كتب السيرة)",
            mawlid: "12 ربيع الأول: المولد النبوي ووصول الرسول ﷺ إلى المدينة مهاجرًا",
            isra: "27 رجب: ليلة الإسراء والمعراج على المشهور، وفي تحديدها خلاف بين أهل العلم (أحد الأشهر الحُرم)",
            baraah: "15 شعبان: ليلة النصف من شعبان (وفي فضلها خلاف بين أهل العلم)",
            cres: "29 شعبان: الليلة ترائي هلال رمضان",
            ram_start: "1 رمضان: أول أيام الصوم",
            badr: "17 رمضان: غزوة بدر الكبرى (2 هـ)",
            fath: "20 رمضان: فتح مكة (8 هـ)",
            qadr: "27 رمضان: ليلة القدر (قد تكون أي ليلة فردية من العشر الأواخر)",
            f1: "1 شوال: أوَّل أيَّام عيد الفطر", f2: "2 شوال: ثاني أيَّام عيد الفطر", f3: "3 شوال: ثالث أيَّام عيد الفطر",
            sq: "ذو القعدة: أحد الأشهر الحُرم",
            sh: "ذو الحجة: أحد الأشهر الحُرم",
            tar: "8 ذو الحجة: يوم التروية",
            ara: "9 ذو الحجة: يوم عرفة",
            a1: "10 ذو الحجة: أوَّل أيَّام عيد الأضحى (يوم النحر)",
            a2: "11 ذو الحجة: ثاني أيام عيد الأضحى (أول أيام التشريق وثاني أيام النحر)",
            a3: "12 ذو الحجة: ثالث أيام عيد الأضحى (ثاني أيام التشريق وثالث أيام النحر)",
            a4: "13 ذو الحجة: رابع أيام عيد الأضحى (ثالث أيام التشريق ورابع أيام النحر)"
        },
        footer:"يتم التحديث يومياً.",prayers:["الفجر","الشروق","الظهر","العصر","المغرب","العشاء"]
    },
    en: { 
        dir:"ltr",title:"Daily Reflection",quranLabel:"Quranic Verse",hadithLabel:"Hadith",prayerLabel:"Prayer Times",eventsLabel:"Upcoming Events",methodLabel:"Method",madhabLabel:"Madhab",locLabel:"Location",tzLabel:"Timezone",expected:"Expected",next:"NEXT",todayLabel:"TODAY",months:["Muharram","Safar","Rabi' al-Awwal","Rabi' al-Thani","Jumada al-Ula","Jumada al-Akhira","Rajab","Sha'ban","Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah"],
        events: {
            h_new: "1 Muharram: Hijri New Year (Sacred Month)",
            tasua: "9 Muharram: Day of Tasua",
            ashura: "10 Muharram: Day of Ashura (Allah saved Moses & drowned Pharaoh)",
            mig_mecca: "27 Safar: Prophet's ﷺ Migration from Mecca to Medina, as reported in some biographies",
            mawlid: "12 Rabi' al-Awwal: Mawlid al-Nabi & Arrival in Medina",
            isra: "27 Rajab: Isra and Mi'raj, per the popular view; scholars differ on its date (Sacred Month)",
            baraah: "15 Sha'ban: Mid-Sha'ban night (scholars differ on its virtue)",
            cres: "29 Sha'ban: Night of Ramadan moon sighting",
            ram_start: "1 Ramadan: First day of Ramadan Fasting",
            badr: "17 Ramadan: Great Battle of Badr (2 AH)",
            fath: "20 Ramadan: Conquest of Mecca (8 AH)",
            qadr: "27 Ramadan: Laylat al-Qadr (Potential night of power)",
            f1: "1 Shawwal: 1st Day of Eid al-Fitr", f2: "2 Shawwal: 2nd Day of Eid al-Fitr", f3: "3 Shawwal: 3rd Day of Eid al-Fitr",
            sq: "Dhu al-Qi'dah: Sacred Month",
            sh: "Dhu al-Hijjah: Sacred Month",
            tar: "8 Dhu al-Hijjah: Day of Tarwiyah",
            ara: "9 Dhu al-Hijjah: Day of Arafah",
            a1: "10 Dhu al-Hijjah: 1st Day of Eid al-Adha (Day of Sacrifice)",
            a2: "11 Dhu al-Hijjah: 2nd Day of Eid (1st Day of Tashreeq)",
            a3: "12 Dhu al-Hijjah: 3rd Day of Eid (2nd Day of Tashreeq)",
            a4: "13 Dhu al-Hijjah: 4th Day of Eid (3rd Day of Tashreeq)"
        },
        footer:"Updated daily.",prayers:["Fajr","Sunrise","Dhuhr","Asr","Maghrib","Isha"] 
    },
    tr: { 
        dir:"ltr",title:"Günlük Tefekkür",quranLabel:"Kur'an Ayeti",hadithLabel:"Hadis",prayerLabel:"Namaz Vakitleri",eventsLabel:"Etkinlikler",methodLabel:"Yöntem",madhabLabel:"Mezhep",locLabel:"Konum",tzLabel:"Saat Dilimi",expected:"Beklenen",next:"SONRAKİ",todayLabel:"BUGÜN",months:["Muharrem","Safer","Rebiülevvel","Rebiülahir","Cemaziyelevvel","Cemaziyelahir","Recep","Şaban","Ramazan","Şevval","Zilkade","Zilhicce"],
        events: {
            h_new: "1 Muharrem: Hicri Yılbaşı (Haram Ay)",
            tasua: "9 Muharrem: Tasua Günü",
            ashura: "10 Muharrem: Aşure Günü (Hz. Musa'nın kurtuluşu)",
            mig_mecca: "27 Safer: Peygamberimizin Mekke'den Medine'ye hicreti (bazı siyer kaynaklarına göre)",
            mawlid: "12 Rebiülevvel: Mevlid Kandili ve Medine'ye varış",
            isra: "27 Recep: Miraç Kandili, yaygın görüşe göre; tarihi konusunda âlimler ihtilaf etmiştir (Haram Ay)",
            baraah: "15 Şaban: Berat Kandili (faziletinde âlimler ihtilaf etmiştir)",
            cres: "29 Şaban: Ramazan hilali gözlem gecesi",
            ram_start: "1 Ramazan: Orucun ilk günü",
            badr: "17 Ramazan: Bedir Gazvesi (Hicri 2)",
            fath: "20 Ramazan: Mekke'nin Fethi (Hicri 8)",
            qadr: "27 Ramazan: Kadir Gecesi",
            f1: "1 Şevval: Ramazan Bayramı 1. Gün", f2: "2 Şevval: Ramazan Bayramı 2. Gün", f3: "3 Şevval: Ramazan Bayramı 3. Gün",
            sq: "Zilkade: Haram Ay",
            sh: "Zilhicce: Haram Ay",
            tar: "8 Zilhicce: Terviye Günü",
            ara: "9 Zilhicce: Arefe Günü",
            a1: "10 Zilhicce: Kurban Bayramı 1. Gün",
            a2: "11 Zilhicce: 2. Gün (Teşrik 1)",
            a3: "12 Zilhicce: 3. Gün (Teşrik 2)",
            a4: "13 Zilhicce: 4. Gün (Teşrik 3)"
        },
        footer:"Günlük güncellenir.",prayers:["İmsak","Güneş","Öğle","İkindi","Akşam","Yatsı"] 
    },
    id: { 
        dir:"ltr",title:"Refleksi Harian",quranLabel:"Ayat Al-Qur'an",hadithLabel:"Hadist",prayerLabel:"Waktu Shalat",eventsLabel:"Acara Mendatang",methodLabel:"Metode",madhabLabel:"Madzhab",locLabel:"Lokasi",tzLabel:"Zona Waktu",expected:"Perkiraan",next:"LANJUT",todayLabel:"HARI INI",months:["Muharram","Safar","Rabi'ul Awwal","Rabi'ul Akhir","Jumadil Ula","Jumadil Akhira","Rajab","Sya'ban","Ramadhan","Syawal","Dzulqa'dah","Dzulhijjah"],
        events: {
            h_new: "1 Muharram: Tahun Baru Hijriah (Bulan Haram)",
            tasua: "9 Muharram: Hari Tasua",
            ashura: "10 Muharram: Hari Asyura (Allah menyelamatkan Musa)",
            mig_mecca: "27 Safar: Hijrah Nabi ﷺ dari Mekah ke Madinah (menurut sebagian kitab sirah)",
            mawlid: "12 Rabi'ul Awwal: Maulid Nabi & Kedatangan di Madinah",
            isra: "27 Rajab: Isra Mi'raj menurut pendapat yang masyhur; ulama berbeda pendapat tentang tanggalnya (Bulan Haram)",
            baraah: "15 Sya'ban: Malam Nisfu Sya'ban (keutamaannya diperselisihkan ulama)",
            cres: "29 Sya'ban: Malam pemantauan hilal Ramadhan",
            ram_start: "1 Ramadhan: Hari pertama Puasa",
            badr: "17 Ramadhan: Perang Badar (2 H)",
            fath: "20 Ramadhan: Pembebasan Mekah (8 H)",
            qadr: "27 Ramadhan: Lailatul Qadr",
            f1: "1 Syawal: Idul Fitri Hari ke-1", f2: "2 Syawal: Idul Fitri Hari ke-2", f3: "3 Syawal: Idul Fitri Hari ke-3",
            sq: "Dzulqa'dah: Bulan Haram",
            sh: "Dzulhijjah: Bulan Haram",
            tar: "8 Dzulhijjah: Hari Tarwiyah",
            ara: "9 Dzulhijjah: Hari Arafah",
            a1: "10 Dzulhijjah: Idul Adha (Hari Kurban)",
            a2: "11 Dzulhijjah: Hari Tasyrik 1",
            a3: "12 Dzulhijjah: Hari Tasyrik 2",
            a4: "13 Dzulhijjah: Hari Tasyrik 3"
        },
        footer:"Referensi terpercaya. Diperbarui setiap hari.",prayers:["Subuh", "Terbit", "Dzuhur", "Ashar", "Maghrib", "Isya"] 
    },
    ur: { 
        dir:"rtl",title:"روزانہ کی عکاسی",quranLabel:"قرآني آیت",hadithLabel:"حدیث",prayerLabel:"نماز کے اوقات",eventsLabel:"آنے والے واقعات",methodLabel:"طریقہ",madhabLabel:"مذہب",locLabel:"مقام",tzLabel:"ٹائم زون",expected:"متوقع",next:"اگلی",todayLabel:"آج",months:["محرم","صفر","ربیع الاول","ربیع الثانی","جمادی الاول","جمادی الثانی","رجب","شعبان","رمضان","شوال","ذوالقعدہ","ذوالحجہ"],
        events: {
            h_new: "1 محرم: اسلامی نیا سال (حرمت والا مہینہ)",
            tasua: "9 محرم: یوم تاسوعاء",
            ashura: "10 محرم: یوم عاشوراء (اللہ نے موسیٰؑ کو نجات دی اور فرعون کو غرق کیا)",
            mig_mecca: "27 صفر: ہجرتِ نبوی ﷺ مکہ سے مدینہ (بعض کتبِ سیرت کے مطابق)",
            mawlid: "12 ربیع الاول: میلاد النبیؐ اور مدینہ آمد",
            isra: "27 رجب: اسراء و معراج، مشہور قول کے مطابق؛ تاریخ میں اہلِ علم کا اختلاف ہے (حرمت والا مہینہ)",
            baraah: "15 شعبان: شبِ برأت (اس کی فضیلت میں اہلِ علم کا اختلاف ہے)",
            cres: "29 شعبان: رمضان کا چاند دیکھنے کی رات",
            ram_start: "1 رمضان: روزوں کا آغاز",
            badr: "17 رمضان: غزوہ بدر (2 ھ)",
            fath: "20 رمضان: فتح مکہ (8 ھ)",
            qadr: "27 رمضان: لیلة القدر (آخری عشرے کی طاق راتیں)",
            f1: "1 شوال: عید الفطر پہلا دن", f2: "2 شوال: عید الفطر دوسرا دن", f3: "3 شوال: عید الفطر تیسرا دن",
            sq: "ذوالقعدہ: حرمت والا مہینہ",
            sh: "ذوالحجہ: حرمت والا مہینہ",
            tar: "8 ذوالحجہ: یوم الترویہ",
            ara: "9 ذوالحجہ: یوم عرفہ",
            a1: "10 ذوالحجہ: عید الاضحی (یوم النحر)",
            a2: "11 ذوالحجہ: ایام تشریق پہلا دن",
            a3: "12 ذوالحجہ: ایام تشریق دوسرا دن",
            a4: "13 ذوالحجہ: ایام تشریق تیسرا دن"
        },
        footer:"روزانہ اپ ڈیٹ کیا جاتا ہے۔",prayers:["الفجر","طلوع آفتاب","ظهر","عصر","مغرب","عشاء"] 
    }
};

const EXTRA = {
    ar: { language: 'اللغة', refsLabel: 'المراجع', loading: 'جارٍ التحميل…', loadError: 'تعذّر تحميل هذا القسم.', retry: 'إعادة المحاولة', gradeLabel: 'الدرجة', sourceLabel: 'المصدر',
          schoolStd: 'الجمهور', schoolHanafi: 'الحنفي',
          close: 'إغلاق والعودة إلى الموسوعة', cityChange: 'تغيير', citySearch: 'ابحث عن مدينة…', deviceTz: 'المنطقة الزمنية للجهاز',
          cityNone: 'لم يُعثر على المدينة — جرّب كتابة اسمها بالإنجليزية.',
          creditCities: 'بيانات المدن', creditPrayer: 'حساب مواقيت الصلاة',
          privacy: 'تُحسَب مواقيت الصلاة على جهازك.\nلا يُرسَل إلى Open-Meteo إلا اسم المدينة محل البحث.' },
    en: { language: 'Language', refsLabel: 'References', loading: 'Loading…', loadError: "Couldn't load this section.", retry: 'Retry', gradeLabel: 'Grade', sourceLabel: 'Source',
          schoolStd: 'Standard', schoolHanafi: 'Hanafi',
          close: 'Close and return to the encyclopedia', cityChange: 'Change', citySearch: 'Search for a city…', deviceTz: 'Device time zone',
          cityNone: 'No city found — check the spelling.',
          creditCities: 'City data', creditPrayer: 'Prayer-time calculation',
          privacy: 'Prayer times are calculated on your device.\nOnly the name of the city being searched is sent to Open-Meteo.' },
    tr: { language: 'Dil', refsLabel: 'Kaynakça', loading: 'Yükleniyor…', loadError: 'Bu bölüm yüklenemedi.', retry: 'Tekrar dene', gradeLabel: 'Derece', sourceLabel: 'Kaynak',
          schoolStd: 'Standart', schoolHanafi: 'Hanefi',
          close: 'Kapat ve ansiklopediye dön', cityChange: 'Değiştir', citySearch: 'Şehir ara…', deviceTz: 'Cihaz saat dilimi',
          cityNone: 'Şehir bulunamadı — adını İngilizce yazmayı deneyin.',
          creditCities: 'Şehir verileri', creditPrayer: 'Namaz vakti hesaplaması',
          privacy: "Namaz vakitleri cihazınızda hesaplanır.\nOpen-Meteo'ya yalnızca aranan şehrin adı gönderilir." },
    id: { language: 'Bahasa', refsLabel: 'Referensi', loading: 'Memuat…', loadError: 'Bagian ini gagal dimuat.', retry: 'Coba lagi', gradeLabel: 'Derajat', sourceLabel: 'Sumber',
          schoolStd: 'Standar', schoolHanafi: 'Hanafi',
          close: 'Tutup dan kembali ke ensiklopedia', cityChange: 'Ubah', citySearch: 'Cari kota…', deviceTz: 'Zona waktu perangkat',
          cityNone: 'Kota tidak ditemukan — coba ketik namanya dalam bahasa Inggris.',
          creditCities: 'Data kota', creditPrayer: 'Perhitungan waktu shalat',
          privacy: 'Waktu shalat dihitung di perangkat Anda.\nHanya nama kota yang dicari yang dikirim ke Open-Meteo.' },
    ur: { language: 'زبان', refsLabel: 'حوالہ جات', loading: 'لوڈ ہو رہا ہے…', loadError: 'یہ حصہ لوڈ نہیں ہو سکا۔', retry: 'دوبارہ کوشش کریں', gradeLabel: 'درجہ', sourceLabel: 'ماخذ',
          schoolStd: 'معیاری', schoolHanafi: 'حنفی',
          close: 'بند کریں اور انسائیکلوپیڈیا پر واپس جائیں', cityChange: 'تبدیل کریں', citySearch: 'شہر تلاش کریں…', deviceTz: 'ڈیوائس کا ٹائم زون',
          cityNone: 'شہر نہیں ملا — اس کا نام انگریزی میں لکھ کر دیکھیں۔',
          creditCities: 'شہروں کا ڈیٹا', creditPrayer: 'نماز کے اوقات کا حساب',
          privacy: 'نماز کے اوقات آپ کے آلے پر ہی نکالے جاتے ہیں۔\nOpen-Meteo کو صرف تلاش کیے گئے شہر کا نام بھیجا جاتا ہے۔' }
};
Object.keys(EXTRA).forEach(l => Object.assign(LOCALES[l], EXTRA[l]));

/* The theme and numerals buttons (shared with the Reader and the CSE): icons, labels and tooltips. */
const NUMERALS_LABEL = { western: '456', arabic: '٤٥٦', persian: '۴۵۶' };   // 4–6 differ between ٠١٢٣ and ۰۱۲۳
const THEME_ICON = {
    system: '<svg data-lucide="monitor" viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg>',
    light: '<svg data-lucide="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>',
    sepia: '<svg data-lucide="coffee" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2v2"></path><path d="M14 2v2"></path><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"></path><path d="M6 2v2"></path></svg>',
    dark: '<svg data-lucide="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"></path></svg>'
};
const THEME_TITLES = {
    ar: { numeralsWestern: 'الأرقام: غربية 456 (انقر للتبديل إلى العربية المشرقية ٤٥٦)', numeralsArabic: 'الأرقام: عربية مشرقية ٤٥٦ (انقر للتبديل إلى الفارسية/الأردية ۴۵۶)', numeralsPersian: 'الأرقام: فارسية/أردية ۴۵۶ (انقر للتبديل إلى الغربية 456)',
          themeSystem: 'المظهر: حسب الجهاز (انقر للتبديل إلى فاتح)', themeLight: 'المظهر: فاتح (انقر للتبديل إلى ورقي)', themeSepia: 'المظهر: ورقي (انقر للتبديل إلى داكن)', themeDark: 'المظهر: داكن (انقر للتبديل إلى حسب الجهاز)' },
    en: { numeralsWestern: 'Numerals: Western 456 (click for Eastern Arabic ٤٥٦)', numeralsArabic: 'Numerals: Eastern Arabic ٤٥٦ (click for Persian/Urdu ۴۵۶)', numeralsPersian: 'Numerals: Persian/Urdu ۴۵۶ (click for Western 456)',
          themeSystem: 'Theme: follows this device (click for light)', themeLight: 'Theme: light (click for sepia)', themeSepia: 'Theme: sepia (click for dark)', themeDark: 'Theme: dark (click to follow this device)' },
    tr: { numeralsWestern: 'Rakamlar: Batı 456 (Doğu Arap ٤٥٦ için tıklayın)', numeralsArabic: 'Rakamlar: Doğu Arap ٤٥٦ (Farsça/Urduca ۴۵۶ için tıklayın)', numeralsPersian: 'Rakamlar: Farsça/Urduca ۴۵۶ (Batı 456 için tıklayın)',
          themeSystem: 'Tema: cihaza göre (açık için tıklayın)', themeLight: 'Tema: açık (sepya için tıklayın)', themeSepia: 'Tema: sepya (koyu için tıklayın)', themeDark: 'Tema: koyu (cihaza göre için tıklayın)' },
    id: { numeralsWestern: 'Angka: Barat 456 (klik untuk Arab Timur ٤٥٦)', numeralsArabic: 'Angka: Arab Timur ٤٥٦ (klik untuk Persia/Urdu ۴۵۶)', numeralsPersian: 'Angka: Persia/Urdu ۴۵۶ (klik untuk Barat 456)',
          themeSystem: 'Tema: mengikuti perangkat (klik untuk terang)', themeLight: 'Tema: terang (klik untuk sepia)', themeSepia: 'Tema: sepia (klik untuk gelap)', themeDark: 'Tema: gelap (klik untuk mengikuti perangkat)' },
    ur: { numeralsWestern: 'اعداد: مغربی 456 (مشرقی عربی ٤٥٦ کے لیے کلک کریں)', numeralsArabic: 'اعداد: مشرقی عربی ٤٥٦ (فارسی/اردو ۴۵۶ کے لیے کلک کریں)', numeralsPersian: 'اعداد: فارسی/اردو ۴۵۶ (مغربی 456 کے لیے کلک کریں)',
          themeSystem: 'تھیم: آلے کے مطابق (روشن کے لیے کلک کریں)', themeLight: 'تھیم: روشن (سیپیا کے لیے کلک کریں)', themeSepia: 'تھیم: سیپیا (تاریک کے لیے کلک کریں)', themeDark: 'تھیم: تاریک (آلے کے مطابق کے لیے کلک کریں)' }
};
Object.keys(THEME_TITLES).forEach(l => { if (LOCALES[l]) Object.assign(LOCALES[l], THEME_TITLES[l]); });

/* ---------- Numerals: every number on the page in the shared choice (display only) ---------- */
const Numerals = {
    fix(node) {
        const v = node.nodeValue;
        if (!/[0-9\u0660-\u0669\u06F0-\u06F9]/.test(v)) return;
        const nv = i360Theme.toNumerals(v);
        if (nv !== v) node.nodeValue = nv;
    },
    walk(root) {
        if (root.nodeType === 3) { this.fix(root); return; }
        if (root.nodeType !== 1 || root.closest('script, style, #btn-numerals')) return;
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest('script, style, #btn-numerals')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
        for (let n = w.nextNode(); n; n = w.nextNode()) this.fix(n);
    },
    all() { this.walk(document.body); },
    // Text the page draws later (prayer times, countdowns, dates…) is converted as it appears.
    watch() {
        new MutationObserver((list) => {
            for (const m of list) {
                if (m.type === 'characterData') this.fix(m.target);
                else m.addedNodes.forEach((n) => this.walk(n));
            }
        }).observe(document.body, { childList: true, characterData: true, subtree: true });
        this.all();
    }
};

/* ---------- The city: the device time zone's, or one picked by name ---------- */
const City = {
    // The default: the main city of the device's time zone (src/day-cities.json); Makkah otherwise.
    auto() {
        let tz = '';
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* no time zone: Makkah */ }
        const T = DAY_CITIES, id = T.zones[tz] ? tz : T.aliases[tz];
        const z = id && T.zones[id];
        return z ? { cc: z.cc, lat: z.lat, lng: z.lng, tz: id, n: z.n } : MAKKAH;
    },
    // A picked city is kept on the device until another is picked, or "device time zone".
    get() {
        const c = DataStore.get(CONFIG.S.CITY, null);
        return (c && typeof c.lat === 'number' && typeof c.lng === 'number' && c.tz && c.cc) ? c : this.auto();
    },
    picked() { return !!DataStore.get(CONFIG.S.CITY, null); },
    set(c) { if (c) DataStore.set(CONFIG.S.CITY, c); else { try { localStorage.removeItem(CONFIG.S.CITY); } catch (e) { /* ignore */ } } },
    // The name in the page's language: the table has all five; a picked city keeps the name it was picked by.
    name(c, lang) { return (c.n && (c.n[lang] || c.n.en)) || c.name || '—'; },
    // Letters written more than one way, so a search finds the place whichever was typed:
    // Arabic أ/إ/آ/ا, ة/ه, ى/ي; Urdu ہ/ھ/ه. At most 6 searches, sent together.
    variants(q) {
        const out = new Set([q]);
        const bare = q.replace(/[أإآ]/g, 'ا');
        out.add(bare);
        out.add(bare.replace(/(^|\s)(ال)?ا/g, '$1$2أ'));
        out.add(bare.replace(/(^|\s)(ال)?ا/g, '$1$2إ'));
        [[/ة(?=\s|$)/g, 'ه'], [/ه(?=\s|$)/g, 'ة'], [/ى(?=\s|$)/g, 'ي'], [/ي(?=\s|$)/g, 'ى'], [/ہ/g, 'ه'], [/ھ/g, 'ه'], [/ه/g, 'ہ']]
            .forEach(([re, to]) => { if (re.test(q)) out.add(q.replace(re, to)); re.lastIndex = 0; });
        return [...out].slice(0, 6);
    },
    async search(q, lang) {
        const lists = await Promise.all(this.variants(q).map(v =>
            Net.fetch(`${CONFIG.API.CITY}?name=${encodeURIComponent(v)}&count=10&language=${lang}&format=json`).then(r => r.results || [])));
        const seen = new Map();
        lists.flat().forEach(p => { if (p && p.id != null && !seen.has(p.id) && typeof p.latitude === 'number' && p.timezone && p.country_code) seen.set(p.id, p); });
        return [...seen.values()].sort((a, b) => (b.population || 0) - (a.population || 0)).slice(0, 10);
    }
};

/* ---------- Prayer times, calculated on the device (adhan-js) ---------- */
const Prayer = {
    KEYS: { Fajr: 'fajr', Sunrise: 'sunrise', Dhuhr: 'dhuhr', Asr: 'asr', Maghrib: 'maghrib', Isha: 'isha' },
    // Today in the city's own time zone; adhan reads the date's year, month and day.
    todayIn(tz) {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
            .formatToParts(new Date()).map(x => [x.type, x.value]));
        return new Date(+p.year, +p.month - 1, +p.day, 12);
    },
    times(city, school) {
        const a = adhan, method = METHOD_OF[city.cc] || 'MuslimWorldLeague';
        const coords = new a.Coordinates(city.lat, city.lng), params = a.CalculationMethod[method]();
        params.madhab = school === 1 ? a.Madhab.Hanafi : a.Madhab.Shafi;
        params.highLatitudeRule = a.HighLatitudeRule.recommended(coords);        // high latitudes: Adhan's own rule
        params.polarCircleResolution = a.PolarCircleResolution.AqrabYaum;         // no sunrise/sunset: the nearest day with both
        const t = new a.PrayerTimes(coords, this.todayIn(city.tz), params);
        const hm = new Intl.DateTimeFormat('en-GB', { timeZone: city.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
        const timings = {};
        Object.keys(this.KEYS).forEach(k => { const d = t[this.KEYS[k]]; timings[k] = (d instanceof Date && !isNaN(d)) ? hm.format(d) : ''; });
        return { timings, tz: city.tz, method };
    }
};

/* ---------- App controller ---------- */
const App = {
    state: { quran: null, hadith: null, prayer: null, hijri: null, err: {} },
    tokens: {},
    day: null,
    get lang() { const l = DataStore.get(CONFIG.S.L, 'ar'); return LOCALES[l] ? l : 'ar'; },
    get school() { return DataStore.get(CONFIG.S.M, 0) === 1 ? 1 : 0; },
    setLang(l) {
        DataStore.set(CONFIG.S.L, l);
        this.state.quran = null; this.state.hadith = null; this.state.err.quran = null; this.state.err.hadith = null;
        UI.render();                                        // labels, dates and methods re-render from state
        ['quran', 'hadith'].forEach(n => this.run(n));      // only the language-dependent requests are repeated
    },
    setSchool(s) { DataStore.set(CONFIG.S.M, s); UI.renderSchool(); this.run('prayer'); },
    setCity(c) { City.set(c); this.run('prayer'); },
    loaders: {
        async quran(lang) {
            const day = ymdKey(localYMD());
            let rec = DataStore.get(CONFIG.S.Q);
            if (!rec || rec.day !== day) { rec = { day, id: Math.floor(Math.random() * 6236) + 1 }; DataStore.set(CONFIG.S.Q, rec); }
            return Net.fetch(`${CONFIG.API.Q}/${rec.id}/editions/quran-uthmani,${CONFIG.EDITIONS.quran[lang]}`);
        },
        hadith: lang => HE.daily(lang),
        async prayer() { return Prayer.times(City.get(), App.school); }   // on the device: nothing is sent
    },
    async run(name) {
        const id = this.tokens[name] = (this.tokens[name] || 0) + 1;     // drop answers that arrive after a newer request
        UI.status(name, 'loading');
        try {
            const data = await this.loaders[name](this.lang);
            if (this.tokens[name] !== id) return;
            this.state[name] = data; this.state.err[name] = null;
            if (name === 'prayer') this.prayerDay = Prayer.todayIn(data.tz).getDate();
        } catch (e) {
            if (this.tokens[name] !== id) return;
            console.error(`[${name}]`, e);
            this.state[name] = (name === 'prayer') ? this.state[name] : null;   // keep old prayer times if a refresh fails
            this.state.err[name] = e;
        }
        UI.renderPart(name);
    },
    load() {
        this.day = ymdKey(localYMD());
        this.state.hijri = Hijri.sync();                       // instant offline answer...
        UI.render();
        Hijri.resolve().then(h => { this.state.hijri = h; UI.renderHijri(); UI.renderEvents(); }).catch(e => console.error('[hijri]', e));   // ...upgraded to Dar al-Ifta when it answers
        ['quran', 'hadith', 'prayer'].forEach(n => this.run(n));
    },
    retry(name) { this.run(name); },
    tick() {                                                    // every 30s: new local day -> reload; otherwise refresh the NEXT highlight
        if (ymdKey(localYMD()) !== this.day) this.load();
        else if (this.state.prayer && Prayer.todayIn(this.state.prayer.tz).getDate() !== this.prayerDay) this.run('prayer');   // the city's own new day
        else UI.renderPrayers();
    }
};

// "Cairo, Egypt": the country's name from the browser, in the page's language.
function cityLabel(c, lang) {
    let country = '';
    try { country = new Intl.DisplayNames([lang], { type: 'region' }).of(c.cc) || ''; } catch (e) { /* the city alone */ }
    const city = City.name(c, lang);
    return country && country !== city ? `${city}${lang === 'ar' || lang === 'ur' ? '، ' : ', '}${country}` : city;
}

/* ---------- The city picker: opened from the prayer card; searches only after typing pauses ---------- */
const Picker = {
    open: false, token: 0, results: [], state: '', timer: 0,
    init() {
        this.box = document.getElementById('city-picker');
        this.input = document.getElementById('city-search');
        this.btn = document.getElementById('city-change');
        this.btn.addEventListener('click', () => this.toggle());
        this.input.addEventListener('input', () => { clearTimeout(this.timer); this.timer = setTimeout(() => this.search(), 500); });
        this.input.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.toggle(false); });
    },
    toggle(on = !this.open) {
        this.open = on;
        this.box.classList.toggle('hidden', !on); this.box.classList.toggle('flex', on);
        this.btn.setAttribute('aria-expanded', on);
        if (on) { this.input.value = ''; this.results = []; this.state = ''; this.render(); this.input.focus(); }
    },
    async search() {
        const q = this.input.value.trim(), id = ++this.token;
        if (q.length < 2) { this.results = []; this.state = ''; this.render(); return; }
        this.state = 'loading'; this.render();
        try {
            const found = await City.search(q, App.lang);
            if (id !== this.token) return;
            this.results = found; this.state = found.length ? '' : 'none';
        } catch (e) {
            if (id !== this.token) return;
            console.error('[city]', e); this.results = []; this.state = 'error';
        }
        this.render();
    },
    choose(c) { this.toggle(false); App.setCity(c); },
    render() {
        const L = UI.L, lang = App.lang, list = UI.targets['city-results'];
        this.input.placeholder = L.citySearch; this.input.setAttribute('aria-label', L.citySearch);
        UI.set('city-status', { loading: L.loading, none: L.cityNone, error: L.loadError }[this.state] || '');
        const row = (label, sub, on, pick) => {
            const b = mk('button', `text-start px-3 py-2 rounded-xl text-sm ${on ? 'active-btn' : 'text-custom-secondary'}`);
            b.type = 'button'; b.setAttribute('role', 'option'); b.setAttribute('aria-selected', on);
            b.append(mk('span', 'font-bold', label)); if (sub) b.append(mk('span', 'text-xs ms-2', sub));
            b.addEventListener('click', pick);
            return b;
        };
        // First: back to the device time zone's city.
        const rows = [row(L.deviceTz, cityLabel(City.auto(), lang), !City.picked(), () => this.choose(null))];
        const sep = (lang === 'ar' || lang === 'ur') ? '، ' : ', ';
        this.results.forEach(p => rows.push(row(p.name, [p.admin1, p.country].filter(Boolean).join(sep), false,
            () => this.choose({ name: p.name, n: { [lang]: p.name }, lat: p.latitude, lng: p.longitude, tz: p.timezone, cc: p.country_code }))));
        list.replaceChildren(...rows);
    }
};

/* ---------- Language menu ---------- */
// The bar's language button: the current language's short name; it opens the list of the five.
// Closes on a choice, on Escape (focus back on the button) or on a tap outside.
const LANG_SHORT = { ar: 'ع', ur: 'ار', id: 'ID', tr: 'TR', en: 'EN' };
const LangMenu = {
    init() {
        this.btn = document.getElementById('btn-lang'); this.list = document.getElementById('lang-list');
        this.btn.addEventListener('click', () => (this.list.hidden ? this.open() : this.close(true)));
        document.addEventListener('click', e => { if (!this.list.hidden && !e.target.closest('.lang-wrap')) this.close(false); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && !this.list.hidden) this.close(true); });
    },
    open() {
        this.list.hidden = false; this.btn.setAttribute('aria-expanded', 'true');
        (this.list.querySelector('[aria-pressed="true"]') || this.list.querySelector('button')).focus();
    },
    close(focusButton) {
        if (this.list.hidden) return;
        this.list.hidden = true; this.btn.setAttribute('aria-expanded', 'false');
        if (focusButton) this.btn.focus();
    }
};

/* ---------- Two columns, where they fit (see the .cards styles) ---------- */
const Cols = {
    init() {
        this.a = document.getElementById('col-a'); this.b = document.getElementById('col-b');
        this.prayer = document.getElementById('prayer-card'); this.events = document.getElementById('events-card');
        this.list = this.events.querySelector('[data-target="events-list"]');
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => this.queue());
            [document.getElementById('cards'), this.a, this.prayer].forEach(e => ro.observe(e));
        }
        window.addEventListener('resize', () => this.queue());
        this.queue();
    },
    queue() { if (this.q) return; this.q = requestAnimationFrame(() => { this.q = 0; this.fit(); }); },
    fit() {
        if (!this.a) return;
        const side = this.a.offsetTop === this.b.offsetTop && this.a.offsetLeft !== this.b.offsetLeft;   // as laid out
        document.body.classList.toggle('two-cols', side);
        if (!side) { this.b.style.height = ''; return; }
        // The events card as drawn: down to its third event (the least it gets) and in full.
        const rows = this.list.children, last = rows[Math.min(2, rows.length - 1)];
        const box = this.events.getBoundingClientRect(), list = this.list.getBoundingClientRect();
        const pad = parseFloat(getComputedStyle(this.events).paddingBottom);
        const minEvents = last ? last.getBoundingClientRect().bottom + this.list.scrollTop - box.top + pad : 0;
        const fullEvents = list.top - box.top + this.list.scrollHeight + pad;
        const gap = parseFloat(getComputedStyle(this.b).rowGap) || 0, above = this.prayer.offsetHeight + gap;
        // As tall as the first column, never taller than its own content, never below three events.
        const h = Math.max(Math.min(this.a.offsetHeight, above + fullEvents), above + minEvents);
        this.b.style.height = `${Math.ceil(h)}px`;
    }
};

/* ---------- UI ---------- */
const UI = {
    targets: {}, shown: false,
    get L() { return LOCALES[App.lang] || LOCALES.ar; },
    init() {
        document.querySelectorAll('[data-target]').forEach(el => this.targets[el.dataset.target] = el);
        document.querySelectorAll('[data-status]').forEach(el => {
            el.querySelector('[data-retry]').addEventListener('click', () => App.retry(el.dataset.status));
        });
        document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { LangMenu.close(true); App.setLang(b.dataset.lang); }));
        LangMenu.init();
        document.querySelectorAll('[data-school]').forEach(b => b.addEventListener('click', () => App.setSchool(+b.dataset.school)));
        Picker.init();
        // In the installed app (Capacitor's bridge is in every page it serves): the ✕ returns home.
        if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) {
            const x = document.getElementById('btn-close');
            x.hidden = false;
            x.addEventListener('click', () => {
                // Opened from the app's home (the usual way): step back, so the history stays
                // home → this page — iOS's edge swipe and Android's back button follow it too.
                // Otherwise (opened directly): load home in place of this page.
                let fromApp = false;
                try { fromApp = history.length > 1 && !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) { /* no referrer */ }
                if (fromApp) history.back(); else window.location.replace('/index.html');
            });
        }
        document.getElementById('btn-theme').addEventListener('click', () => i360Theme.cycle());
        i360Theme.onChange(() => this.theme());
        document.getElementById('btn-numerals').addEventListener('click', () => i360Theme.cycleNumerals());
        i360Theme.onNumeralsChange(() => { this.numeralsButton(); Numerals.all(); });
        Numerals.watch();
        this.theme();
        i360Theme.init();   // fresh theme.css in the background; the saved copy is already shown
        Cols.init();
        App.load();
        setInterval(() => App.tick(), 30000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden) App.tick(); });
    },
    numeralsButton() {   // label and tooltip for the shared numerals choice, in the page's language
        const n = i360Theme.getNumerals(), L = LOCALES[App.lang] || LOCALES.ar, btn = document.getElementById('btn-numerals');
        const key = { western: 'numeralsWestern', arabic: 'numeralsArabic', persian: 'numeralsPersian' }[n];
        btn.textContent = NUMERALS_LABEL[n];
        btn.title = L[key] || THEME_TITLES.en[key];
        btn.setAttribute('aria-label', btn.title);
    },
    theme() {   // the theme button: icon and tooltip for the shared choice, in the page's language
        const c = i360Theme.getChoice(), L = LOCALES[App.lang] || LOCALES.ar, btn = document.getElementById('btn-theme');
        const T = { system: L.themeSystem, light: L.themeLight, sepia: L.themeSepia, dark: L.themeDark };
        btn.innerHTML = THEME_ICON[c];
        btn.title = T[c] || THEME_TITLES.en[{ system: 'themeSystem', light: 'themeLight', sepia: 'themeSepia', dark: 'themeDark' }[c]];
        btn.setAttribute('aria-label', btn.title);
    },
    set(t, v) { if (this.targets[t]) this.targets[t].textContent = v; },
    status(name, kind) {
        const box = document.querySelector(`[data-status="${name}"]`); if (!box) return;
        const L = this.L, btn = box.querySelector('[data-retry]'), txt = box.querySelector('[data-status-text]');
        if (!kind) { box.classList.add('hidden'); box.classList.remove('flex'); return; }
        box.classList.remove('hidden'); box.classList.add('flex');
        txt.textContent = kind === 'loading' ? L.loading : L.loadError;
        btn.textContent = L.retry; btn.classList.toggle('hidden', kind === 'loading');
    },
    reveal() {
        if (this.shown) return; this.shown = true;
        ['quran-card', 'hadith-card', 'prayer-card', 'events-card'].forEach((id, i) => setTimeout(() => {
            const e = document.getElementById(id); if (e) { e.style.opacity = 1; e.style.transform = 'translateY(0)'; }
        }, i * 120));
    },
    render() {
        const L = this.L, lang = App.lang;
        document.documentElement.lang = lang; document.documentElement.dir = L.dir;
        document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = L[el.dataset.i18n] || LOCALES.en[el.dataset.i18n]; });
        document.querySelectorAll('[data-lang]').forEach(el => { const on = el.dataset.lang === lang; el.classList.toggle('active-btn', on); el.setAttribute('aria-pressed', on); });
        const lb = document.getElementById('btn-lang'), cur = document.getElementById(`lang-${lang}`);
        document.getElementById('lang-short').textContent = LANG_SHORT[lang];
        lb.title = `${L.language}: ${cur.textContent}`; lb.setAttribute('aria-label', lb.title);
        this.theme();            // their tooltips are in the page's language
        this.numeralsButton();
        const x = document.getElementById('btn-close'); x.title = L.close; x.setAttribute('aria-label', L.close);
        document.title = L.title;   // the tab name follows the language too
        this.renderSchool();
        this.renderHijri();
        ['quran', 'hadith', 'prayer'].forEach(n => this.renderPart(n));
        this.renderCredits();
        if (Picker.open) Picker.render();
        this.renderEvents();
        this.reveal();
    },
    // Credits (Open-Meteo and GeoNames: CC BY 4.0; Adhan: MIT), in the page's language, on two lines.
    renderCredits() {
        const L = this.L, box = this.targets.credits; if (!box) return;
        const link = (text, href) => { const a = mk('a', 'underline', text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; };
        box.replaceChildren(
            document.createTextNode(`${L.creditCities}: `), link('Open-Meteo', 'https://open-meteo.com/'), document.createTextNode(' · '),
            link('GeoNames', 'https://www.geonames.org/'), document.createElement('br'), document.createTextNode(`${L.creditPrayer}: `),
            link('Adhan', 'https://github.com/batoulapps/adhan-js'));
    },
    renderSchool() {
        [0, 1].forEach(s => { const b = document.getElementById(`school-${s}`); if (!b) return; const on = App.school === s; b.classList.toggle('active-btn', on); b.setAttribute('aria-pressed', on); });
    },
    renderHijri() {
        const L = this.L, h = App.state.hijri; if (!h) return;
        this.set('current-date', new Date().toLocaleDateString(App.lang, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        this.set('hijri-date', `${h.today.d} ${L.months[h.today.m - 1]} ${h.today.y}`);
        const src = this.targets['hijri-source'];
        if (src) {
            const icon = h.provisional ? [svgIcon(HOURGLASS)] : [];
            src.replaceChildren(...icon, document.createTextNode(Hijri.label(h, App.lang)));
        }
    },
    renderPart(name) {
        const fn = { quran: 'renderQuran', hadith: 'renderHadith', prayer: 'renderPrayers' }[name];
        this[fn]();
        this.status(name, App.state.err[name] ? 'error' : (App.state[name] ? null : (App.tokens[name] ? 'loading' : null)));
    },
    renderQuran() {
        const q = App.state.quran, lang = App.lang;
        if (!q) { ['quran-arabic', 'quran-translation', 'quran-ref'].forEach(t => this.set(t, '')); return; }
        this.set('quran-arabic', q.data[0].text);
        this.set('quran-translation', q.data[1].text);
        this.set('quran-ref', `${(lang === 'ar' || lang === 'ur') ? q.data[0].surah.name : q.data[0].surah.englishName} (${q.data[0].surah.number}:${q.data[0].numberInSurah})`);
    },
    renderHadith() {
        const h = App.state.hadith, L = this.L, lang = App.lang;
        const hide = (el, on) => { if (el) el.classList.toggle('hidden', on); };
        if (!h) {
            ['hadith-title', 'hadith-narrator', 'hadith-text', 'hadith-grade', 'hadith-ref'].forEach(t => this.set(t, ''));
            hide(this.targets['hadith-narrator'], true); hide(document.getElementById('hadith-refs'), true); return;
        }
        this.set('hadith-title', h.title || '');
        /* HadeethEnc returns the opening line naming the Companion (the highest narrator) as `hadeeth_intro`.
           It is shown on its own line; every character of the text is still displayed (its terms forbid deleting any).
           If the field is missing, or the text doesn't begin with it, the whole text is shown as one block. */
        const full = h.hadeeth || '', intro = (h.hadeeth_intro || '').trim();
        let narrator = '', body = full;
        if (intro && full.trimStart().startsWith(intro)) {
            const rest = full.trimStart().slice(intro.length).trim();
            if (rest) { narrator = intro; body = rest; }
        }
        this.set('hadith-narrator', narrator); hide(this.targets['hadith-narrator'], !narrator);
        this.set('hadith-text', body);
        this.set('hadith-grade', [h.grade ? `${L.gradeLabel}: ${h.grade}` : '', h.attribution || ''].filter(Boolean).join(' · '));
        /* `reference` is HadeethEnc's bibliography (editions used), Arabic only. Kept in full, collapsed by default. */
        const refs = (h.reference || '').trim();
        this.set('hadith-ref', refs); hide(document.getElementById('hadith-refs'), !refs);
        const a = this.targets['hadith-link']; if (a) a.href = `https://hadeethenc.com/${lang}/browse/hadith/${encodeURIComponent(h.id)}`;
    },
    renderPrayers() {
        const L = this.L, p = App.state.prayer, lang = App.lang;
        this.set('meta-location', cityLabel(City.get(), lang));
        const grid = this.targets['prayer-grid'];
        if (!p) { grid.replaceChildren(); this.set('meta-method', '—'); this.set('meta-timezone', '—'); return; }
        const t = p.timings, tz = p.tz;
        const toMin = k => { const m = /(\d{1,2}):(\d{2})/.exec(t[k] || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
        const now = minutesNowIn(tz);
        let next = CONFIG.P_NEXT_KEYS.find(k => toMin(k) !== null && toMin(k) > now);
        if (!next) next = 'Fajr';                                 // after Isha the next prayer is tomorrow's Fajr
        grid.replaceChildren(...CONFIG.P_KEYS.map((k, i) => {
            const isNext = k === next, m = /(\d{1,2}):(\d{2})/.exec(t[k] || '');
            const box = mk('div', `flex flex-col items-center p-3 transition-all ${isNext ? 'next-prayer-highlight' : 'inset-item'}`);
            box.append(
                mk('span', `text-[10px] md:text-xs font-bold ${isNext ? 'text-accent' : 'text-custom-secondary'}`, L.prayers[i]),
                mk('span', `text-base md:text-xl font-bold mt-1 ${isNext ? 'text-accent' : 'text-custom-secondary'}`, m ? m[0] : '—'));
            if (isNext) box.append(mk('span', 'text-[8px] mt-1 font-black text-accent animate-pulse', L.next));
            return box;
        }));
        const names = METHOD_NAMES[p.method];
        this.set('meta-method', names ? names[lang === 'ar' ? 0 : 1] : '—');
        let tzText = tz || '—';
        try { const n = new Intl.DateTimeFormat(lang, { timeZone: tz, timeZoneName: 'long' }).formatToParts(new Date()).find(x => x.type === 'timeZoneName'); if (n) tzText = n.value; } catch (e) { /* localized name only; the raw IANA id stays as the fallback */ }
        this.set('meta-timezone', tzText);
    },
    renderEvents() {
        const L = this.L, lang = App.lang, h = App.state.hijri, list = this.targets['events-list'];
        if (!h || !list) return;
        list.replaceChildren(...Hijri.events(h).map(e => {
            const row = mk('div', `flex justify-between items-center p-4 transition-all ${e.isT ? 'border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/10 rounded-2xl' : 'inset-item'}`);
            const left = mk('div', 'flex-1'), title = mk('div', 'flex items-center gap-2');
            title.append(mk('span', 'text-sm font-bold text-custom-secondary', L.events[e.id]));
            if (e.isT) title.append(mk('span', 'bg-purple-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full', L.todayLabel));
            left.append(title, mk('span', 'text-xs text-custom-secondary font-medium', `${e.d} ${L.months[e.m]} ${e.year}`));
            const right = mk('div', 'text-start md:text-end ms-4');
            right.append(
                mk('span', 'text-[10px] uppercase font-bold text-purple-600 block', L.expected),
                mk('span', 'text-xs font-medium text-custom-secondary', e.date.toLocaleDateString(lang, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })));
            row.append(left, right);
            return row;
        }));
        Cols.queue();
    }
};
document.addEventListener('DOMContentLoaded', () => { UI.init(); });

const BASE_URL = import.meta.env.VITE_BASEROW_URL
const API_KEY = import.meta.env.VITE_BASEROW_KEY
const TABLE_SCIENCES = import.meta.env.VITE_BASEROW_TABLE_SCIENCES
const TABLE_RESOURCES = import.meta.env.VITE_BASEROW_TABLE_RESOURCES
const TABLE_QURAN = import.meta.env.VITE_BASEROW_TABLE_QURAN

const headers = {
  Authorization: `Token ${API_KEY}`,
  'Content-Type': 'application/json',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Science {
  id: number
  ScienceMinorId: number
  ScienceMinor_Ar: string
  ScienceMinor_En: string
  ScienceMinorIcon: string
  ScienceIntermediateId: number | null
  ScienceIntermediate_Ar: string
  ScienceIntermediate_En: string
  ScienceIntermediateIcon: string
  ScienceMajorId: number
  ScienceMajor_Ar: string
  ScienceMajor_En: string
  ScienceMajorIcon: string
  IconName: string
  GooglePlayStore: string
  HuaweiAppGallery: string
  AppleAppStore: string
  Web: string
  WebAppendix: string
}

export interface Resource {
  id: number
  CustomSearch: string
  Huawei_CustomSearch: string
  Translator: string
  BotSearch: string
  Huawei_BotSearch: string
  Google_VirtualKeyboard: string
  Huawei_VirtualKeyboard: string
  WebsiteStatus: string
  Edition: string
  Version: string
  Revision: string
  inWebList: string
  URIschemes: string
  i360dbqEOF: number | null
}

export interface QuranEntry {
  id: number
  QuranChapter: number
  QuranVerseMin: number
  QuranVerseMax: number
  ExegesisURL: string
  ExegesisPage: number
}

interface BaserowResponse<T> {
  count: number
  next: string | null
  results: T[]
}

// ─── Pagination helper ────────────────────────────────────────────────────────

// Real root cause of a production bug (2026-08-16/17): a single transient
// network failure — from ANY source, not just OtaKit's own launch/resume
// checks competing at startup — permanently broke data loading for the rest
// of that app session, since a plain fetch() has no timeout and no retry,
// and dataCache.tsx's init() only ever runs once per mount. Disabling
// OtaKit's runtimePolicy only removed one contributor to that race, which is
// why the bug still recurred, just less often ("took several tries"), not
// zero. The actual fix belongs here, not in more OtaKit policy tweaking —
// resilience to any transient failure, regardless of its source.
const FETCH_TIMEOUT_MS = 10000
const MAX_RETRIES = 2 // 1 initial attempt + 2 retries = 3 total tries
const RETRY_BACKOFF_MS = [1000, 2000]

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF_MS[attempt - 1]))
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const res = await fetch(url, { headers, signal: controller.signal })
      clearTimeout(timeoutId)
      if (!res.ok) throw new Error(`Baserow fetch failed: ${res.status}`)
      return res
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err
      // loop continues to the next attempt, unless this was the last one
    }
  }

  // All retries within this app session exhausted — genuinely propagates
  // up to dataCache.tsx's catch, setting the visible error. No persistent/
  // module-level retry counter exists anywhere here by design: closing and
  // reopening the app is a fresh mount, calling this function fresh, with
  // its own full, brand-new set of retries — the "last resort" behavior
  // falls out naturally from not tracking any state across calls, no
  // special-case code needed for it.
  throw lastError
}

async function fetchAllPages<T>(url: string): Promise<T[]> {
  const all: T[] = []
  let nextUrl: string | null = url

  while (nextUrl) {
    const safeUrl = nextUrl.replace(/^http:\/\//, 'https://')
    const res = await fetchWithRetry(safeUrl)
    const data: BaserowResponse<T> = await res.json()
    all.push(...data.results)
    nextUrl = data.next
  }

  return all
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchSciences(): Promise<Science[]> {
  // Sort by ScienceMinorId alone — the table's primary key, confirmed to
  // already respect ScienceMajorId/ScienceIntermediateId grouping in the
  // actual data. This also preserves each row's true original position,
  // which groupSciences() now relies on to interleave intermediate groups
  // and direct minor items in their real relative order (see ScienceGrid.tsx).
  return fetchAllPages<Science>(
    `${BASE_URL}${TABLE_SCIENCES}/?user_field_names=true&exclude_fields=BotKB,CustomSearchAIKBlessBotKB&order_by=ScienceMinorId`
  )
}

// i360dbc has no per-science filter field — always fetch the global record(s)
export async function fetchResources(): Promise<Resource[]> {
  return fetchAllPages<Resource>(
    `${BASE_URL}${TABLE_RESOURCES}/?user_field_names=true`
  )
}

// Full table fetch — i360dbq is cached client-side (Phase 7a), so lookups
// run locally against cached rows instead of a network round-trip per verse.
export async function fetchQuran(): Promise<QuranEntry[]> {
  return fetchAllPages<QuranEntry>(
    `${BASE_URL}${TABLE_QURAN}/?user_field_names=true`
  )
}

// Local lookup — mirrors old fExegesis: match chapter exactly, verse within
// [QuranVerseMin, QuranVerseMax], take first match. Returns null if unmapped.
// Explicit Number() coercion: Baserow's API commonly serializes Number-type
// fields as strings in JSON despite QuranEntry declaring them as `number` —
// that TS type is compile-time only and doesn't guarantee the runtime shape,
// so strict equality against an un-coerced value would silently fail every lookup.
export function findExegesisUrl(
  rows: QuranEntry[],
  chapter: number,
  verse: number
): string | null {
  const match = rows.find(
    row =>
      Number(row.QuranChapter) === chapter &&
      verse >= Number(row.QuranVerseMin) &&
      verse <= Number(row.QuranVerseMax)
  )
  return match?.ExegesisURL ?? null
}

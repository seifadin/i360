// Exported so startupHealth.ts's connectivity check uses the same base URL as
// the fetches below — one source of truth for the data source.
export const BASE_URL = import.meta.env.VITE_BASEROW_URL
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
  // i360dbqEOF exists in the Baserow table but is deliberately NOT typed
  // here — its app-state consumer was removed as written-but-never-read
  // long ago (§5), and an interface field with zero readers only implies
  // a dependency that doesn't exist. The column itself stays in Baserow
  // untouched (same live-fetch backward-compat reasoning as IconName).
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

// Why timeout + retry (§14): one transient network failure, from any source,
// used to break data loading for the whole session — a plain fetch() has neither.
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
  // Sort by ScienceMinorId alone — the primary key, which already respects the
  // Major/Intermediate grouping and keeps each row's original position, which
  // groupSciences() relies on to interleave intermediate groups and direct items.
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

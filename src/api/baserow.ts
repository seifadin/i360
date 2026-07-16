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

async function fetchAllPages<T>(url: string): Promise<T[]> {
  const all: T[] = []
  let nextUrl: string | null = url

  while (nextUrl) {
    const safeUrl = nextUrl.replace(/^http:\/\//, 'https://')
    const res = await fetch(safeUrl, { headers })
    if (!res.ok) throw new Error(`Baserow fetch failed: ${res.status}`)
    const data: BaserowResponse<T> = await res.json()
    all.push(...data.results)
    nextUrl = data.next
  }

  return all
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

export async function fetchSciences(): Promise<Science[]> {
  return fetchAllPages<Science>(
    `${BASE_URL}${TABLE_SCIENCES}/?user_field_names=true&exclude_fields=BotKB,CustomSearchAIKBlessBotKB`
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

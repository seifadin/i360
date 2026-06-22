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
  ScienceMajor_Ar: string
  ScienceMajor_En: string
  ScienceMinor_Ar: string
  ScienceMinor_En: string
  Web: string
  AppleAppStore: string
  GooglePlayStore: string
  HuaweiAppGallery: string
  WebAppendix: string
}

export interface Resource {
  id: number
  Edition: string
  Version: string
  WebIcon: string
  BotSearch: string
  Huawei_BotSearch: string
  URIschemes: string
  CustomSearch: string
  Huawei_CustomSearch: string
  EntitySearch: string
  WebsiteStatus: string
  VirtualKeyboard: string
  Huawei_VirtualKeyboard: string
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
    `${BASE_URL}${TABLE_SCIENCES}/?user_field_names=true`
  )
}

export async function fetchResources(scienceMinorId: number): Promise<Resource[]> {
  const filter = `&filter__field_ScienceMinorId__equal=${scienceMinorId}`
  return fetchAllPages<Resource>(
    `${BASE_URL}${TABLE_RESOURCES}/?user_field_names=true${filter}`
  )
}

export async function fetchQuran(
  chapter: number,
  verse: number
): Promise<QuranEntry | null> {
  const filter =
    `&filter__field_QuranChapter__equal=${chapter}` +
    `&filter__field_QuranVerseMin__lower_than_or_equal=${verse}` +
    `&filter__field_QuranVerseMax__higher_than_or_equal=${verse}`
  const results = await fetchAllPages<QuranEntry>(
    `${BASE_URL}${TABLE_QURAN}/?user_field_names=true${filter}`
  )
  return results[0] ?? null
}

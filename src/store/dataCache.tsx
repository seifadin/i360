import { createContext, useContext, useEffect, useState, ReactNode, JSX } from 'react'
import {
  fetchSciences,
  fetchResources,
  fetchQuran,
  findExegesisUrl as findExegesisUrlFn,
  Science,
  Resource,
  QuranEntry,
} from '@/api/baserow'
import { getStoredItem, setStoredItem } from '@/lib/deviceStorage'

// ─── fInfo — generic "value changed since last seen" check ────────────────────
// Reads AND overwrites the localStorage baseline in one call. Must be called
// exactly ONCE per key per app mount: a second call for the same key would
// always see "unchanged," since the first call already rebaselined it. This
// is why Home.tsx no longer calls this itself — it reads `changeFlags` below.
function checkChanged(itemKey: string, data2store: string | null | undefined): boolean {
  if (!data2store) return false
  const stored = getStoredItem(itemKey)
  const changed = stored !== null && stored !== data2store
  setStoredItem(itemKey, data2store)
  return changed
}

function loadCached<T>(cacheKey: string): T[] | null {
  const raw = getStoredItem(cacheKey)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T[]
  } catch {
    return null // corrupted cache — treat as absent, forces a fresh fetch
  }
}

function saveCached<T>(cacheKey: string, data: T[]): void {
  try {
    setStoredItem(cacheKey, JSON.stringify(data))
  } catch {
    // storage full/unavailable — silently skipped, next mount just refetches
  }
}

const CACHE_KEY_SCIENCES = 'i360CacheSciences'
const CACHE_KEY_QURAN = 'i360CacheQuran'

// Consolidates the 3 actually-consumed icon fields (IconName is a 4th field
// that exists in Baserow but is confirmed unused anywhere in the app) into
// one set of unique names — no static/hardcoded list, purely derived from
// whatever Sciences data is actually loaded right now.
function collectIconNames(sciences: Science[]): Set<string> {
  const names = new Set<string>()
  for (const s of sciences) {
    if (s.ScienceMajorIcon) names.add(s.ScienceMajorIcon)
    if (s.ScienceIntermediateIcon) names.add(s.ScienceIntermediateIcon)
    if (s.ScienceMinorIcon) names.add(s.ScienceMinorIcon)
  }
  return names
}

// Resolves Sciences: reuse cache unless Edition changed or no cache exists yet
async function resolveSciences(editionChanged: boolean): Promise<Science[]> {
  const cached = loadCached<Science>(CACHE_KEY_SCIENCES)
  if (!editionChanged && cached) return cached
  const fresh = await fetchSciences()
  saveCached(CACHE_KEY_SCIENCES, fresh)
  return fresh
}

// Resolves Quran: reuse cache unless Revision changed or no cache exists yet
async function resolveQuran(revisionChanged: boolean): Promise<QuranEntry[]> {
  const cached = loadCached<QuranEntry>(CACHE_KEY_QURAN)
  if (!revisionChanged && cached) return cached
  const fresh = await fetchQuran()
  saveCached(CACHE_KEY_QURAN, fresh)
  return fresh
}

export interface ChangeFlags {
  editionChanged: boolean
  versionChanged: boolean
  revisionChanged: boolean
}

export interface DataCacheContextType {
  resource: Resource | null
  sciences: Science[]
  quran: QuranEntry[]
  changeFlags: ChangeFlags
  loading: boolean
  error: string | null
  findExegesisUrl: (chapter: number, verse: number) => string | null
}

const DataCacheContext = createContext<DataCacheContextType | null>(null)

export function DataCacheProvider({ children }: { children: ReactNode }): JSX.Element {
  const [resource, setResource] = useState<Resource | null>(null)
  const [sciences, setSciences] = useState<Science[]>([])
  const [quran, setQuran] = useState<QuranEntry[]>([])
  const [changeFlags, setChangeFlags] = useState<ChangeFlags>({
    editionChanged: false,
    versionChanged: false,
    revisionChanged: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        // i360dbc — always fetched fresh (small, cheap), drives all change checks
        const resources = await fetchResources()
        const globalResource = resources[0] ?? null
        if (cancelled) return
        setResource(globalResource)

        // Single-call-per-key contract (see checkChanged note above)
        const editionChanged = checkChanged('i360Edition', globalResource?.Edition)
        const versionChanged = checkChanged('i360Version', globalResource?.Version)
        const revisionChanged = checkChanged('i360Revision', globalResource?.Revision)
        if (cancelled) return
        setChangeFlags({ editionChanged, versionChanged, revisionChanged })

        // Sciences + Quran resolved concurrently — each independently cached-or-fetched
        const [freshSciences, freshQuran] = await Promise.all([
          resolveSciences(editionChanged),
          resolveQuran(revisionChanged),
        ])
        if (cancelled) return
        setSciences(freshSciences)
        setQuran(freshQuran)
        import('@/lib/iconLoader').then(({ preloadIcons }) =>
          preloadIcons(collectIconNames(freshSciences))
        )
      } catch {
        if (!cancelled) setError('تعذّر تحميل البيانات')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  function findExegesisUrl(chapter: number, verse: number): string | null {
    return findExegesisUrlFn(quran, chapter, verse)
  }

  return (
    <DataCacheContext.Provider
      value={{ resource, sciences, quran, changeFlags, loading, error, findExegesisUrl }}
    >
      {children}
    </DataCacheContext.Provider>
  )
}

export function useDataCache(): DataCacheContextType {
  const ctx = useContext(DataCacheContext)
  if (!ctx) throw new Error('useDataCache must be used inside DataCacheProvider')
  return ctx
}

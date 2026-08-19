import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode, JSX } from 'react'
import {
  fetchSciences,
  fetchResources,
  fetchQuran,
  findExegesisUrl as findExegesisUrlFn,
  Science,
  Resource,
  QuranEntry,
} from '@/api/dataSource'
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

// Generic cache-or-fetch resolver — extracted after resolveSciences/
// resolveQuran (below) were found to be identical except for their
// type/cache-key/fetcher. Reuse the cache unless `changed` is true or no
// cache exists yet; either way, whatever's returned becomes the new
// cache baseline.
async function resolveCached<T>(
  cacheKey: string,
  changed: boolean,
  fetcher: () => Promise<T[]>
): Promise<T[]> {
  const cached = loadCached<T>(cacheKey)
  if (!changed && cached) return cached
  const fresh = await fetcher()
  saveCached(cacheKey, fresh)
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
  isRetrying: boolean
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
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setInterval> | null = null
    let isFetching = false
    let hasAttempted = false

    // Real production bug (2026-08-16/17): a single transient network
    // failure — from any source, not specifically OtaKit — permanently
    // broke data loading for the rest of the app session, since this
    // effect only ran once per mount and a mere close/reopen on Android
    // is usually just a resume of the same still-running process, not a
    // fresh mount. fetchWithRetry (dataSource.ts) already retries/times
    // out at the network layer; this adds session-level retry on top —
    // if that still fails, keep retrying automatically every 10s until it
    // succeeds, with zero need to close/reopen the app at all. The
    // isFetching guard (not the interval length) is what actually
    // prevents overlap with a still-running attempt — so this interval
    // is free to be short for faster recovery, not held long defensively.
    async function init() {
      if (isFetching) return
      isFetching = true
      // isRetrying distinguishes the very first attempt (hasAttempted
      // still false at this point) from every subsequent automatic retry
      // — lets the UI show a distinct "retrying..." message instead of
      // silently reusing the first-load spinner text.
      setIsRetrying(hasAttempted)
      hasAttempted = true
      setError(null)
      setLoading(true)

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
          resolveCached(CACHE_KEY_SCIENCES, editionChanged, fetchSciences),
          resolveCached(CACHE_KEY_QURAN, revisionChanged, fetchQuran),
        ])
        if (cancelled) return
        setSciences(freshSciences)
        setQuran(freshQuran)
        import('@/lib/iconLoader')
          .then(({ preloadIcons }) => preloadIcons(collectIconNames(freshSciences)))
          // Best-effort, matching preloadIcons' own internal stance — if
          // this chunk fetch itself fails (e.g. network drops right after
          // data resolved from localStorage cache), DynamicIcon's per-icon
          // fallback still handles rendering; an unhandled rejection here
          // would only add console noise, never a functional difference.
          .catch(() => {})

        // Success — clear any retry cycle that was running
        if (retryTimer) {
          clearInterval(retryTimer)
          retryTimer = null
        }
      } catch {
        if (!cancelled) {
          setError('تعذّر تحميل البيانات')
          if (!retryTimer) {
            retryTimer = setInterval(() => {
              if (!cancelled) init()
            }, 10000)
          }
        }
      } finally {
        isFetching = false
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => {
      cancelled = true
      if (retryTimer) clearInterval(retryTimer)
    }
  }, [])

  const findExegesisUrl = useCallback(
    (chapter: number, verse: number): string | null =>
      findExegesisUrlFn(quran, chapter, verse),
    [quran]
  )

  const value = useMemo(
    () => ({ resource, sciences, quran, changeFlags, loading, error, isRetrying, findExegesisUrl }),
    [resource, sciences, quran, changeFlags, loading, error, isRetrying, findExegesisUrl]
  )

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  )
}

export function useDataCache(): DataCacheContextType {
  const ctx = useContext(DataCacheContext)
  if (!ctx) throw new Error('useDataCache must be used inside DataCacheProvider')
  return ctx
}

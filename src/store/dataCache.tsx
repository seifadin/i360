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

// ─── "value changed since last seen" ──────────────────────────────────────────
// Two-phase: read here; the baseline is written only after the data it gates has
// actually loaded (commitBaseline, in init()). The old single call read AND
// overwrote it, so an attempt that failed after the check hid the change from
// every retry and every later launch — stale content indefinitely (§15h).
function hasChanged(itemKey: string, value: string | null | undefined): boolean {
  if (!value) return false
  const stored = getStoredItem(itemKey)
  return stored !== null && stored !== value
}

function commitBaseline(itemKey: string, value: string | null | undefined): void {
  if (value) setStoredItem(itemKey, value)
}

export const LOAD_ERROR = 'تعذّر تحميل البيانات'

function loadCached<T>(cacheKey: string): T[] | null {
  const raw = getStoredItem(cacheKey)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as T[]
  } catch {
    return null // corrupted cache — treat as absent, forces a fresh fetch
  }
}

// setStoredItem() already swallows storage errors (full/unavailable) — the
// next mount just refetches.
function saveCached<T>(cacheKey: string, data: T[]): void {
  setStoredItem(cacheKey, JSON.stringify(data))
}

export const CACHE_KEY_SCIENCES = 'i360CacheSciences'
const CACHE_KEY_QURAN = 'i360CacheQuran'

// Small persisted copy of the feedback mailto: link. ErrorBoundary sits above
// DataCacheProvider (main.tsx), so it reads localStorage directly; this key
// works even if the full Sciences cache didn't survive or this session's fetch
// hasn't finished. Sourced from i360dbs (i360dbc is never cached). Written on
// every successful Sciences load.
export const FEEDBACK_MAILTO_KEY = 'i360FeedbackMailto'

function cacheFeedbackMailto(sciences: Science[]): void {
  const feedbackRow = sciences.find(s => s.ScienceMinor_En === 'Feedback')
  if (feedbackRow?.Web?.toLowerCase().startsWith('mailto:')) {
    setStoredItem(FEEDBACK_MAILTO_KEY, feedbackRow.Web)
  }
  // Deliberately no else/removal branch: if the Feedback row is temporarily
  // absent from a given fetch (a transient Baserow hiccup, a momentary
  // filter mismatch), keep whatever was last successfully cached rather
  // than wiping it — this redundant copy exists specifically to survive
  // exactly this kind of transient gap.
}

// The 3 icon fields the app uses (Baserow's IconName is unused), as unique
// names derived from the loaded data — no hardcoded list.
type IconTier = 'major' | 'intermediate' | 'minor'

// One pass, three tier sets; each Set dedupes by construction. Tiers stay
// separate so callers can preload by priority (below).
function collectIconNamesByTier(sciences: Science[]): Record<IconTier, Set<string>> {
  const tiers: Record<IconTier, Set<string>> = { major: new Set(), intermediate: new Set(), minor: new Set() }
  for (const s of sciences) {
    if (s.ScienceMajorIcon) tiers.major.add(s.ScienceMajorIcon)
    if (s.ScienceIntermediateIcon) tiers.intermediate.add(s.ScienceIntermediateIcon)
    if (s.ScienceMinorIcon) tiers.minor.add(s.ScienceMinorIcon)
  }
  return tiers
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
  // Last real failure, kept through retries until a success — user-facing
  // text plus the technical cause, so a bug report says WHAT failed.
  lastFailure: { message: string; detail: string } | null
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
  const [lastFailure, setLastFailure] = useState<{ message: string; detail: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setInterval> | null = null
    let isFetching = false
    let hasAttempted = false

    // Session-level retry on top of fetchWithRetry (§14): a transient failure once
    // broke loading for the whole session (on Android, reopening is usually a
    // resume, not a fresh mount). Retry every 10 s until success — no need to
    // reopen the app. The isFetching guard prevents overlap, so the interval can
    // stay short.
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

      let stage = 'i360dbc'
      try {
        // i360dbc — always fetched fresh (small, cheap), drives all change checks
        const resources = await fetchResources()
        const globalResource = resources[0] ?? null
        if (cancelled) return
        setResource(globalResource)

        const editionChanged = hasChanged('i360Edition', globalResource?.Edition)
        const versionChanged = hasChanged('i360Version', globalResource?.Version)
        const revisionChanged = hasChanged('i360Revision', globalResource?.Revision)
        stage = 'sciences/quran'

        // Sciences + Quran resolved concurrently — each independently cached-or-fetched
        const [freshSciences, freshQuran] = await Promise.all([
          resolveCached(CACHE_KEY_SCIENCES, editionChanged, fetchSciences),
          resolveCached(CACHE_KEY_QURAN, revisionChanged, fetchQuran),
        ])
        if (cancelled) return
        setSciences(freshSciences)
        setQuran(freshQuran)
        cacheFeedbackMailto(freshSciences)
        // Everything the flags gate has loaded: only now record the new
        // baselines and surface the flags (no "new edition" notice for content
        // that never arrived).
        commitBaseline('i360Edition', globalResource?.Edition)
        commitBaseline('i360Version', globalResource?.Version)
        commitBaseline('i360Revision', globalResource?.Revision)
        setChangeFlags({ editionChanged, versionChanged, revisionChanged })
        setLastFailure(null)

        // Staged icon preloading by tier (§14e): preloading every icon at once (~50
        // dynamic imports) blocked the main thread for ~1–1.8 s at load, though only
        // Major icons are visible before a tap. Major loads now; Intermediate, then
        // Minor, at idle time — not lazily per tap, which would bring back the burst
        // of requests on a category's first tap.
        import('@/lib/iconLoader').then(({ preloadIcons, scheduleIdle }) => {
          const tiers = collectIconNamesByTier(freshSciences)

          preloadIcons(tiers.major)

          scheduleIdle(() => {
            preloadIcons(tiers.intermediate)
            scheduleIdle(() => {
              preloadIcons(tiers.minor)
            })
          })
        })
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
      } catch (err) {
        if (!cancelled) {
          setError(LOAD_ERROR)
          setLastFailure({
            message: LOAD_ERROR,
            detail: `${stage}: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`,
          })
          if (!retryTimer) {
            retryTimer = setInterval(() => {
              if (!cancelled) void init()
            }, 10000)
          }
        }
      } finally {
        isFetching = false
        if (!cancelled) setLoading(false)
      }
    }

    void init() // never rejects: its own try/catch/finally
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
    () => ({ resource, sciences, quran, changeFlags, loading, error, lastFailure, isRetrying, findExegesisUrl }),
    [resource, sciences, quran, changeFlags, loading, error, lastFailure, isRetrying, findExegesisUrl]
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

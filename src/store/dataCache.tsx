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
// Two-phase (2026-10-03): read here; the baseline is written only after the
// data it gates has actually loaded (commitBaseline, in init()). The old single
// call read AND overwrote it, so an attempt that failed after the check hid the
// change from every retry and every later launch — stale content indefinitely.
function hasChanged(itemKey: string, value: string | null | undefined): boolean {
  if (!value) return false
  const stored = getStoredItem(itemKey)
  return stored !== null && stored !== value
}

function commitBaseline(itemKey: string, value: string | null | undefined): void {
  if (value) setStoredItem(itemKey, value)
}

const LOAD_ERROR = 'تعذّر تحميل البيانات'

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

export const CACHE_KEY_SCIENCES = 'i360CacheSciences'
const CACHE_KEY_QURAN = 'i360CacheQuran'

// Redundant, tiny persisted copy of the feedback mailto: link — separate
// from the full Sciences cache above. ErrorBoundary sits ABOVE
// DataCacheProvider in the tree (main.tsx wraps <App/>, not the reverse),
// so it can't use useDataCache() and reads localStorage directly instead;
// this key exists so that read doesn't depend on the FULL Sciences cache
// having survived intact, and so a crash-time lookup succeeds even if the
// CURRENT session's own Sciences fetch hasn't completed yet, as long as
// ANY previous session ever wrote it. Sourced from i360dbs (not i360dbc,
// which is fetched fresh every launch with zero localStorage persistence
// at all — confirmed via grep, no CACHE_KEY_RESOURCE exists — making it
// strictly worse for this purpose, not just the same edge case moved
// earlier). Written opportunistically on every successful Sciences load,
// not only during a crash.
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

// Consolidates the 3 actually-consumed icon fields (IconName is a 4th field
// that exists in Baserow but is confirmed unused anywhere in the app) into
// one set of unique names — no static/hardcoded list, purely derived from
// whatever Sciences data is actually loaded right now.
type IconTier = 'major' | 'intermediate' | 'minor'

// Single pass over sciences, building all three tiers' unique-icon sets
// together — one loop, not three (2026-08-25 review). Each tier's Set
// dedupes on its own by construction; a tier legitimately reusing the same
// icon across many rows (e.g. 13 Major rows sharing 3 distinct icons)
// collapses to exactly that count automatically, no separate dedup step
// needed. Tiers stay separate (not one flat union) so callers can preload
// by priority — see the staged Major/Intermediate/Minor calls below.
function collectIconNamesByTier(sciences: Science[]): Map<IconTier, Set<string>> {
  const tiers = new Map<IconTier, Set<string>>([
    ['major', new Set<string>()],
    ['intermediate', new Set<string>()],
    ['minor', new Set<string>()],
  ])
  for (const s of sciences) {
    if (s.ScienceMajorIcon) tiers.get('major')!.add(s.ScienceMajorIcon)
    if (s.ScienceIntermediateIcon) tiers.get('intermediate')!.add(s.ScienceIntermediateIcon)
    if (s.ScienceMinorIcon) tiers.get('minor')!.add(s.ScienceMinorIcon)
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

        // Staged icon preloading, by tier priority — real fix for a real,
        // measured problem (2026-08-25): the previous one-shot preload of
        // every icon (Major+Intermediate+Minor together) fired ~50 dynamic
        // imports immediately on page load, and their staggered module
        // evaluation as each one resolved was traced (via Lighthouse
        // long-tasks + console.time profiling) to ~1-1.8s of scattered
        // main-thread blocking during the most critical load window — even
        // though only Major-tier icons are actually visible before any
        // category is expanded (ScienceGrid.tsx's openMajorId/
        // openIntermediateId gates mean Intermediate/Minor rows aren't
        // rendered at all until tapped open).
        //
        // Staged, not lazy-per-tap: Major loads immediately (small,
        // genuinely needed now); Intermediate and Minor are deferred to
        // idle time, in that order, rather than dropped entirely — a fully
        // lazy per-tap approach would reintroduce a real, previously-fixed
        // bug (2026-08-12: a burst of fresh per-icon requests firing
        // simultaneously the moment a category was tapped, causing a
        // perceptible pause). This keeps that fix's benefit (icons already
        // warm by the time a user taps) while removing Intermediate/Minor
        // from the initial page-load critical path.
        import('@/lib/iconLoader').then(({ preloadIcons, scheduleIdle }) => {
          const tiers = collectIconNamesByTier(freshSciences)

          preloadIcons(tiers.get('major')!)

          scheduleIdle(() => {
            preloadIcons(tiers.get('intermediate')!)
            scheduleIdle(() => {
              preloadIcons(tiers.get('minor')!)
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

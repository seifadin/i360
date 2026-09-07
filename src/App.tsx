import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { OtaKit } from '@otakit/capacitor-updater'
import { AppStateProvider } from '@/store/appState'
import { DataCacheProvider, useDataCache } from '@/store/dataCache'
import { usePlatform } from '@/hooks/usePlatform'
import { getStoredItem, setStoredItem } from '@/lib/deviceStorage'
import { hadUnrecoveredStartupError, likelyGenuineDataFailure, SAFETY_NET_DELAY_MS } from '@/lib/startupHealth'
import { resolveFeedbackMailto, copyAndEmailReport } from '@/lib/feedbackReport'
import Dialog from '@/components/Dialog'

const Home = lazy(() => import('@/pages/Home'))

// ─── i360Privacy — one-time privacy notice ─────────────────────────────────────
// Shared, not a local const inside the function — read from two places (the
// check, and the write-on-dismiss handler below), avoiding a duplicated
// literal that could drift out of sync.
const PRIVACY_NOTICE_KEY = 'i360Privacy'

// Read-only (2026-08-28 fix) — previously wrote the key the instant this
// check ran, before the dialog had even rendered, let alone before a user
// could have dismissed it. Root cause of a real, confirmed bug: an
// invisible, discarded first render pass (plausibly triggered by OtaKit
// applying a pending update mid-launch) could reach this check, silently
// mark the notice "seen," and get replaced before ever reaching the screen
// — permanently consuming the one-time notice for a user who never actually
// saw or dismissed it. The write now only happens in the dialog's own
// onClose below, gated behind a real tap.
function checkPrivacyNotice(): boolean {
  return getStoredItem(PRIVACY_NOTICE_KEY) === null
}

// Renamed from AppRoutes — this predates react-router-dom's removal
// (2026-09-06): the app had a second route (/browser) at the time, and
// this component's job was several "runs once per real app session"
// concerns living alongside that router (platform detection, OTA
// readiness, privacy notice, Edition/Version/Revision dialogs). With
// Browser.tsx and /browser both deleted (2026-09-03), the router itself
// became pure, functionless scaffolding — zero use anywhere of
// useNavigate/useLocation/useParams/<Link>, wrapping a single route that
// only ever rendered <Home />. Removed entirely; Home now renders
// directly. AppShell's other job — the app-shell pattern itself, a
// top-level wrapper that mounts once and never unmounts, with actual
// page content lazy-loading underneath it — is unchanged and is the
// actual reason for the name, same renaming-for-role precedent as
// dataSource.ts (was baserow.ts) and OrnamentDivider.tsx (was
// KhatamDivider.tsx).
function AppShell() {
  // Called here, not inside Home.tsx — AppShell never unmounts during
  // in-app navigation (there being no in-app navigation left at all,
  // now that /browser is gone, only reinforces this), so this detection
  // effect genuinely runs once per app session (matching its own
  // comment's intent), not once per Home.tsx mount. Historically,
  // navigating to /browser and back would remount Home.tsx and silently
  // re-run this, wiping out any manual MobileServicesToggle override —
  // defeating the simulator's whole purpose, since testing routing via a
  // science-minor tap was exactly the action that would reset the
  // setting being tested.
  usePlatform()

  const { resource, changeFlags, loading: cacheLoading, error: cacheError } = useDataCache()

  // OtaKit health handshake (2026-09-06 redesign) — previously fired
  // unconditionally on mount, which only ever confirmed "the JS runtime
  // started and executed," per OtaKit's own docs — nothing about whether
  // the app can actually reach its data source. That meant a bundle
  // that loaded fine but couldn't fetch data (the exact
  // "تعذّر تحميل البيانات" class of bug this project has hit repeatedly —
  // see i360-instructions.md §14/§14m) got marked "healthy" regardless,
  // and OtaKit's own automatic rollback never had a reason to trigger.
  //
  // Now gated on the data cache's first genuine success (loading false,
  // error null) — OtaKit's own appReadyTimeout (45s, capacitor.config.ts)
  // is the natural grace period for an ordinary, transient connectivity
  // blip to resolve via dataCache.tsx's own retry loop; genuinely
  // persistent failure lets the timeout expire and OtaKit's real,
  // automatic rollback do its job. hadUnrecoveredStartupError() is a
  // belt-and-suspenders addition (startupHealth.ts) — a genuine JS error
  // outside React's own render lifecycle (event handlers, timers) that
  // ErrorBoundary alone can't catch; treated aggressively (blocks this
  // call entirely) since that signal is far less ambiguous than a
  // data-fetch failure.
  const hasNotifiedReady = useRef(false)
  useEffect(() => {
    if (hasNotifiedReady.current) return
    if (cacheLoading) return
    if (cacheError) return // this attempt failed — wait for a later, successful retry
    if (hadUnrecoveredStartupError()) return
    hasNotifiedReady.current = true
    OtaKit.notifyAppReady()
  }, [cacheLoading, cacheError])

  // Safety net for the one real risk the above introduces: a device with
  // genuinely no connectivity would otherwise never confirm readiness at
  // all, and OtaKit would roll back a perfectly good bundle over an
  // ordinary connectivity gap that isn't its fault. Fires once, at
  // SAFETY_NET_DELAY_MS (startupHealth.ts, derived from ota-timing.json —
  // genuinely linked to appReadyTimeout, not a second, separately-
  // hardcoded number that could drift out of sync with it).
  // likelyGenuineDataFailure() (startupHealth.ts) combines a real check
  // against the data source's own domain with navigator.onLine as a
  // secondary signal; either one suggesting "likely not the bundle's
  // fault" is enough to confirm health anyway, accepting that rare,
  // harmless false-positive rather than engineer around it further — the
  // device lands on its last known-good bundle either way, not a broken
  // one.
  useEffect(() => {
    if (hasNotifiedReady.current) return
    const timer = setTimeout(() => {
      if (hasNotifiedReady.current) return
      likelyGenuineDataFailure().then(genuine => {
        if (hasNotifiedReady.current) return
        if (!genuine) {
          hasNotifiedReady.current = true
          OtaKit.notifyAppReady()
        }
        // else: leave it alone — let appReadyTimeout expire naturally,
        // triggering OtaKit's own real, automatic rollback.
      })
    }, SAFETY_NET_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  // Rollback visibility (2026-09-06) — OtaKit has no manual "roll back
  // now" API (confirmed directly from its own docs), so this is purely
  // about making a real rollback visible and reportable, not triggering
  // one. Two sources, since a rollback can be discovered two different
  // ways: getLastFailure() covers a startup rollback from a PREVIOUS
  // session (it happens before any JS runs, so it never reaches a live
  // listener — per OtaKit's own docs); the 'rollback' event covers one
  // firing while this session is actually running (the timeout expiring
  // mid-session). Both funnel into the same small state and the same
  // shared reporting mechanism (feedbackReport.ts) ErrorBoundary uses —
  // not the crash-screen UI itself, since this isn't a live crash, just
  // its own small Dialog notice below.
  const [rollbackDetails, setRollbackDetails] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false

    OtaKit.getLastFailure()
      .then(failure => {
        if (!cancelled && failure) setRollbackDetails(JSON.stringify(failure))
      })
      .catch(() => {})

    const listenerPromise = OtaKit.addListener('rollback', failure => {
      if (!cancelled) setRollbackDetails(JSON.stringify(failure))
    })

    return () => {
      cancelled = true
      listenerPromise.then(handle => handle.remove()).catch(() => {})
    }
  }, [])

  const handleRollbackReport = useCallback(() => {
    copyAndEmailReport('تقرير تراجع تحديث - i360إ', rollbackDetails ?? '')
    setRollbackDetails(null)
  }, [rollbackDetails])

  const handleRollbackDismiss = useCallback(() => {
    setRollbackDetails(null)
  }, [])

  const [privacyOpen, setPrivacyOpen] = useState(false)

  // Queue-based, replacing 5 separate state variables (editionOpen/
  // versionOpen/revisionOpen/versionPending/revisionPending) and 2
  // near-duplicate close handlers that manually chained which dialog
  // shows next. A future 4th dialog type now just needs pushing one more
  // object here — no chain logic to remember to update in multiple places.
  interface QueuedDialog { title: string; message: string }
  const [dialogQueue, setDialogQueue] = useState<QueuedDialog[]>([])

  // Mount: privacy notice (one-time). checkPrivacyNotice() itself is
  // read-only (see its own comment) and computed exactly once via
  // useState's lazy initializer — safe to call here with no side effects.
  const [needsPrivacyNotice, setNeedsPrivacyNotice] = useState(() => checkPrivacyNotice())

  // Fix (2026-08-28): the dialog used to show immediately on mount,
  // regardless of anything else — the single fastest thing to render
  // anywhere in the app, faster even than Home's own static title (which
  // waits on Home's lazy chunk to load). That made it the one piece of UI
  // exposed to a real font-swap layout bug (Amiri loading async over a
  // fallback, confirmed via real screenshots showing different line-wrap
  // counts and mirrored punctuation between shots seconds apart) and,
  // separately, to font-display:block's own "blank text in an already-
  // visible container" behavior once that was tried as a fix. Two direct
  // JS attempts to detect font-readiness (document.fonts.ready, then
  // explicit document.fonts.load() calls) both failed real on-device
  // testing. Real fix: gate the dialog's visibility behind the same
  // already-proven cacheLoading signal the Edition/Version/Revision
  // dialogs use below, instead of a third novel font-detection attempt —
  // real data-fetch time is comfortably longer than the font's own fetch
  // in practice, so Amiri has virtually always settled by the time this
  // fires. font-display:block (index.html) stays as a safety net for the
  // rare case data genuinely loads faster than the font.
  useEffect(() => {
    if (cacheLoading) return
    if (needsPrivacyNotice) setPrivacyOpen(true)
  }, [cacheLoading, needsPrivacyNotice])

  // useCallback here and on handleDialogClose below (2026-08-28) — a
  // fresh inline function on every render meant Dialog.tsx's own focus/
  // keydown effect (dependent on onClose) tore down and re-ran on every
  // unrelated AppShell re-render while a dialog was open, not just when
  // it actually opened or closed. setStoredItem and setNeedsPrivacyNotice/
  // setPrivacyOpen are all React-guaranteed stable, so an empty
  // dependency array is correct.
  const handlePrivacyClose = useCallback(() => {
    setStoredItem(PRIVACY_NOTICE_KEY, '1') // real fix — write moved here, see checkPrivacyNotice()'s own comment
    // Real bug, confirmed on-device (2026-09-04): needsPrivacyNotice was
    // previously never updated after dismissal, staying true for the
    // rest of the session. Harmless under normal use (the effect below
    // only re-runs if cacheLoading changes again, which normally
    // happens once). But during a genuine, persistent data-loading
    // failure, cacheLoading toggles repeatedly (loading → error →
    // retrying, every ~10s, via dataCache.tsx's own retry loop) — each
    // toggle re-ran the effect, and needsPrivacyNotice still being true
    // reopened the dialog every cycle, regardless of the user having
    // already dismissed it. Confirmed directly: reopening tracked
    // exactly with the loading/retry cycle on a real device.
    setNeedsPrivacyNotice(false)
    setPrivacyOpen(false)
  }, [])

  // i360dbc resolved by dataCache: show Edition/Version/Revision dialogs
  // per changeFlags (checkChanged already ran once, inside dataCache.tsx).
  // Moved here from Home.tsx — changeFlags is a stable, once-per-session
  // value from DataCacheProvider, but the dialog-open state was previously
  // page-local to Home.tsx, so navigating Home → /browser → Home remounted
  // Home.tsx, reset editionOpen/versionOpen/revisionOpen to false, and
  // this effect re-derived them as true again from the still-true
  // changeFlags — re-showing an already-dismissed "new edition" dialog on
  // every return to Home for the rest of the session. Living here instead
  // means this effect itself only ever runs once, for the same reason
  // usePlatform() does.
  useEffect(() => {
    if (cacheLoading || !resource) return

    // Order: Edition → Version → Revision (broadest scope first, Quran-specific last)
    const queue: QueuedDialog[] = []
    if (changeFlags.editionChanged) {
      queue.push({ title: 'طبعة جديدة', message: 'تمت إضافة / تعديل محتوى مُحدَّث لإثراء تجربتك' })
    }
    if (changeFlags.versionChanged) {
      queue.push({ title: 'إصدار جديد', message: 'تم إطلاق إصدار مُحدَّث لإثراء تجربتك' })
    }
    if (changeFlags.revisionChanged) {
      queue.push({ title: 'مراجعة جديدة', message: 'تم إضافة / تعديل فهرسة تفسير مُحدَّث لإثراء تجربتك' })
    }
    setDialogQueue(queue)
  }, [cacheLoading, resource, changeFlags])

  const handleDialogClose = useCallback(() => {
    setDialogQueue(prev => prev.slice(1))
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <Home />
      </Suspense>

      {/* Privacy notice — first visit only */}
      <Dialog
        open={privacyOpen}
        title="سلامة البيانات"
        message="لا يتم جمع البيانات (غير الوظيفية) أو مشاركتها. سياسة الخصوصية: https://tinyurl.com/i360Privacy"
        onClose={handlePrivacyClose}
      />

      {/* Edition/Version/Revision — one at a time, queue-driven (see above) */}
      <Dialog
        open={dialogQueue.length > 0}
        title={dialogQueue[0]?.title ?? ''}
        message={dialogQueue[0]?.message ?? ''}
        onClose={handleDialogClose}
      />

      {/* OTA rollback notice — see the state/effect above for the two
          sources this can come from. secondaryAction only offered when a
          feedback address is actually available, same pattern as
          ScienceGrid.tsx's reachability-check dialog. */}
      <Dialog
        open={!!rollbackDetails}
        title="تم التراجع عن آخر تحديث"
        message="واجه آخر تحديث للتطبيق مشكلة، فتم التراجع تلقائيًا إلى النسخة السابقة العاملة."
        onClose={handleRollbackDismiss}
        secondaryAction={
          resolveFeedbackMailto()
            ? { label: 'الإبلاغ عن المشكلة', onClick: handleRollbackReport }
            : undefined
        }
      />
    </>
  )
}

function App() {
  return (
    <AppStateProvider>
      <DataCacheProvider>
        <AppShell />
      </DataCacheProvider>
    </AppStateProvider>
  )
}

export default App

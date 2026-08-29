import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { OtaKit } from '@otakit/capacitor-updater'
import { AppStateProvider } from '@/store/appState'
import { DataCacheProvider, useDataCache } from '@/store/dataCache'
import { usePlatform } from '@/hooks/usePlatform'
import { getStoredItem, setStoredItem } from '@/lib/deviceStorage'
import Dialog from '@/components/Dialog'

const Home = lazy(() => import('@/pages/Home'))
const Browser = lazy(() => import('@/pages/Browser'))

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

// Renamed from AppRoutes — routing is now only one of several "runs once
// per real app session" concerns living here (platform detection, OTA
// readiness, privacy notice, Edition/Version/Revision dialogs), matching
// the standard PWA "app shell" pattern: a top-level wrapper that mounts
// once and never unmounts during in-app navigation, with actual page
// content lazy-loading underneath it. Same renaming-for-role precedent as
// dataSource.ts (was baserow.ts) and OrnamentDivider.tsx (was
// KhatamDivider.tsx).
function AppShell() {
  // Called here, not inside Home.tsx — App.tsx sits above the router and
  // never unmounts during in-app navigation, so this detection effect
  // genuinely runs once per app session (matching its own comment's
  // intent), not once per Home.tsx mount. Previously, navigating to
  // /browser and back would remount Home.tsx and silently re-run this,
  // wiping out any manual MobileServicesToggle override — defeating the
  // simulator's whole purpose, since testing routing via a science-minor
  // tap is exactly the action that would reset the setting being tested.
  usePlatform()

  // OtaKit (12h) — confirms the app shell mounted and ran successfully
  // within appReadyTimeout (capacitor.config.ts), or the plugin rolls back
  // to the last known-good bundle automatically. No platform gating
  // needed — the plugin ships its own web fallback, and its own docs
  // state most apps only need this one call.
  useEffect(() => {
    OtaKit.notifyAppReady()
  }, [])

  const { resource, changeFlags, loading: cacheLoading } = useDataCache()

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
  const [needsPrivacyNotice] = useState(() => checkPrivacyNotice())

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
  // it actually opened or closed. setStoredItem is a plain imported
  // function (stable) and setPrivacyOpen is React-guaranteed stable, so
  // an empty dependency array is correct.
  const handlePrivacyClose = useCallback(() => {
    setStoredItem(PRIVACY_NOTICE_KEY, '1') // real fix — write moved here, see checkPrivacyNotice()'s own comment
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browser" element={<Browser />} />
        </Routes>
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
    </>
  )
}

function App() {
  return (
    <AppStateProvider>
      <DataCacheProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </DataCacheProvider>
    </AppStateProvider>
  )
}

export default App

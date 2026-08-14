import { Suspense, lazy, useEffect, useState } from 'react'
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
function checkPrivacyNotice(): boolean {
  const key = 'i360Privacy'
  const stored = getStoredItem(key)
  if (stored !== null) return false // already shown before — exit, no dialog
  setStoredItem(key, '1')
  return true // first time — show dialog
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
  const [editionOpen, setEditionOpen] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [versionPending, setVersionPending] = useState(false)
  const [revisionPending, setRevisionPending] = useState(false)

  // Mount: privacy notice (one-time). Moved here from Home.tsx, same
  // reasoning as usePlatform() above — checkPrivacyNotice()'s own
  // localStorage guard already made a Home.tsx remount harmless, but
  // living here means the check itself only ever runs once, consistent
  // with every other "once per app session" concern in this component.
  useEffect(() => {
    if (checkPrivacyNotice()) setPrivacyOpen(true)
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

    // Serialize dialogs — never show more than one at once.
    // Order: Edition → Version → Revision (broadest scope first, Quran-specific last)
    if (changeFlags.editionChanged) {
      setEditionOpen(true)
      if (changeFlags.versionChanged) setVersionPending(true)
      else if (changeFlags.revisionChanged) setRevisionPending(true)
    } else if (changeFlags.versionChanged) {
      setVersionOpen(true)
      if (changeFlags.revisionChanged) setRevisionPending(true)
    } else if (changeFlags.revisionChanged) {
      setRevisionOpen(true)
    }
  }, [cacheLoading, resource, changeFlags])

  function handleEditionClose() {
    setEditionOpen(false)
    if (versionPending) {
      setVersionPending(false)
      setVersionOpen(true)
    } else if (revisionPending) {
      setRevisionPending(false)
      setRevisionOpen(true)
    }
  }

  function handleVersionClose() {
    setVersionOpen(false)
    if (revisionPending) {
      setRevisionPending(false)
      setRevisionOpen(true)
    }
  }

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
        onClose={() => setPrivacyOpen(false)}
      />

      {/* Edition changed notice */}
      <Dialog
        open={editionOpen}
        title="طبعة جديدة"
        message="تمت إضافة / تعديل محتوى مُحدَّث لإثراء تجربتك"
        onClose={handleEditionClose}
      />

      {/* Version changed notice */}
      <Dialog
        open={versionOpen}
        title="إصدار جديد"
        message="تم إطلاق إصدار مُحدَّث لإثراء تجربتك"
        onClose={handleVersionClose}
      />

      {/* Revision changed notice — i360dbq exegesis index */}
      <Dialog
        open={revisionOpen}
        title="مراجعة جديدة"
        message="تم إضافة / تعديل فهرسة تفسير مُحدَّث لإثراء تجربتك"
        onClose={() => setRevisionOpen(false)}
      />
    </>
  )
}

function App() {
  return (
    <AppStateProvider>
      <DataCacheProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppShell />
        </BrowserRouter>
      </DataCacheProvider>
    </AppStateProvider>
  )
}

export default App

import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { OtaKit } from '@otakit/capacitor-updater'
import { AppStateProvider } from '@/store/appState'
import { DataCacheProvider } from '@/store/dataCache'
import { usePlatform } from '@/hooks/usePlatform'

const Home = lazy(() => import('@/pages/Home'))
const Browser = lazy(() => import('@/pages/Browser'))

function AppRoutes() {
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

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browser" element={<Browser />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AppStateProvider>
      <DataCacheProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </DataCacheProvider>
    </AppStateProvider>
  )
}

export default App

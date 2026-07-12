import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppStateProvider } from '@/store/appState'
import { DataCacheProvider } from '@/store/dataCache'

const Home = lazy(() => import('@/pages/Home'))
const Browser = lazy(() => import('@/pages/Browser'))

function App() {
  return (
    <AppStateProvider>
      <DataCacheProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/browser" element={<Browser />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </DataCacheProvider>
    </AppStateProvider>
  )
}

export default App

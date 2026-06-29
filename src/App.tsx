import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppStateProvider } from '@/store/appState'
import Home from '@/pages/Home'
import Browser from '@/pages/Browser'
import Bot from '@/pages/Bot'

function App() {
  return (
    <AppStateProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/browser" element={<Browser />} />
          <Route path="/bot" element={<Bot />} />
        </Routes>
      </BrowserRouter>
    </AppStateProvider>
  )
}

export default App

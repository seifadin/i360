import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { AppStateProvider } from '@/store/appState'
import Home from '@/pages/Home'
import Browser from '@/pages/Browser'
import Bot from '@/pages/Bot'

function TabBar() {
  return (
    <nav className="fixed bottom-0 right-0 left-0 flex border-t border-gray-200 bg-white">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex flex-1 flex-col items-center py-2 text-sm ${isActive ? 'text-green-800' : 'text-gray-500'}`
        }
      >
        <span>🏠</span>
        <span>الرئيسية</span>
      </NavLink>
      <NavLink
        to="/browser"
        className={({ isActive }) =>
          `flex flex-1 flex-col items-center py-2 text-sm ${isActive ? 'text-green-800' : 'text-gray-500'}`
        }
      >
        <span>🌐</span>
        <span>المتصفح</span>
      </NavLink>
    </nav>
  )
}

function App() {
  return (
    <AppStateProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="pb-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browser" element={<Browser />} />
            <Route path="/bot" element={<Bot />} />
          </Routes>
        </div>
        <TabBar />
      </BrowserRouter>
    </AppStateProvider>
  )
}

export default App

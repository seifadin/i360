import { usePlatform } from '@/hooks/usePlatform'
import SearchBar from '@/components/SearchBar'
import ScienceGrid from '@/components/ScienceGrid'

export default function Home() {
  // Detect platform on Home mount — sets all 16 app state flags
  usePlatform()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* App header — logo + title (RTL: icon on right) */}
      <div className="flex items-center justify-center gap-2 bg-white px-4 py-3 shadow-sm">
        <img
          src="/assets/logo.png"
          alt="i360إ"
          className="h-8 w-8 object-contain"
        />
        <span className="text-lg font-bold" style={{ color: '#0010CF' }}>
          الموسوعة الإسلامية إi360
        </span>
      </div>

      {/* Search bar */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <SearchBar />
      </div>

      {/* Science accordion */}
      <div className="flex-1 overflow-y-auto bg-white">
        <ScienceGrid />
      </div>
    </div>
  )
}

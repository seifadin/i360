import { usePlatform } from '@/hooks/usePlatform'
import OSRow from '@/components/OSRow'
import SearchBar from '@/components/SearchBar'
import ScienceGrid from '@/components/ScienceGrid'

export default function Home() {
  usePlatform()

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* App header — logo + title */}
      <div className="flex items-center justify-center gap-2 bg-white px-4 py-3 shadow-sm shrink-0">
        <img
          src="/assets/logo.png"
          alt="i360إ"
          className="h-8 w-8 object-contain"
        />
        <span className="text-lg font-bold" style={{ color: '#0010CF' }}>
          الموسوعة الإسلامية إi360
        </span>
      </div>

      {/* Science accordion — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <ScienceGrid />
      </div>

      {/* Search bar */}
      <div className="shrink-0 border-t border-gray-200 bg-white">
        <SearchBar />
      </div>

      {/* OSRow — OS_WebToggle, MobileServicesToggle, VersionMenu — bottom of page */}
      <OSRow />

    </div>
  )
}

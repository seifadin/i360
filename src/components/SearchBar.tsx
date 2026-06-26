import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, FolderSearch } from 'lucide-react'
import { useAppState } from '@/store/appState'
import { isArabic, translateToArabic } from '@/api/translator'

export default function SearchBar() {
  const { state } = useAppState()
  const navigate = useNavigate()

  // Page1 local variables
  const [EntityQueryTerm, setEntityQueryTerm] = useState('')
  const [EntityQueryTermOld, setEntityQueryTermOld] = useState('')
  const [SearchSource, setSearchSource] = useState(0)

  // Icon variables — mapped from AppGyver originals
  const iconSearchBot = 'bot'           // was: magic
  const iconSearchInternal = 'folder-search' // was: compress

  async function handleSearch() {
    if (!EntityQueryTerm.trim()) return
    if (EntityQueryTerm === EntityQueryTermOld) return

    setEntityQueryTermOld(EntityQueryTerm)

    // Detect Arabic — translate if not
    let arabicTerm = EntityQueryTerm
    if (!isArabic(EntityQueryTerm)) {
      try {
        arabicTerm = await translateToArabic(EntityQueryTerm)
      } catch {
        arabicTerm = EntityQueryTerm
      }
    }

    // Build PSE URL and open in /browser
    const cx = import.meta.env.VITE_PSE_CX
    const pseUrl = `https://cse.google.com/cse?cx=${cx}&q=${encodeURIComponent(arabicTerm)}`
    navigate('/browser', { state: { url: pseUrl } })
  }

  function handleBotSearch() {
    // Platform-aware bot URL selection
    const botUrl = state.useHMS
      ? '' // Huawei_BotSearch comes from selected resource in i360dbc
      : import.meta.env.VITE_BOTPRESS_URL

    if (botUrl) navigate('/bot', { state: { url: botUrl } })
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-200">
      {/* Bot search button */}
      <button
        onClick={handleBotSearch}
        className="p-2 text-gray-500 hover:text-green-800"
        aria-label="المساعد الذكي"
      >
        {iconSearchBot === 'bot' && <Bot size={20} />}
      </button>

      {/* Search input — RTL */}
      <input
        type="text"
        value={EntityQueryTerm}
        onChange={e => setEntityQueryTerm(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSearch()}
        placeholder="ابحث في المصادر الإسلامية..."
        className="flex-1 text-right bg-transparent outline-none text-gray-800 placeholder-gray-400"
        dir="rtl"
      />

      {/* Internal search button */}
      <button
        onClick={handleSearch}
        className="p-2 text-gray-500 hover:text-green-800"
        aria-label="بحث"
      >
        {iconSearchInternal === 'folder-search' && <FolderSearch size={20} />}
      </button>
    </div>
  )
}

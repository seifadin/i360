import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bot, Keyboard } from 'lucide-react'
import { useAppState } from '@/store/appState'
import { isArabic, translateToArabic } from '@/api/translator'
import { fetchResources } from '@/api/baserow'

// Icon mapping confirmation:
// Search   → search icon inside input LEFT side
// Bot      → AI assistant outside input LEFT of it
// Keyboard → virtual keyboard outside leftmost

export default function SearchBar() {
  const { state, setState } = useAppState()
  const navigate = useNavigate()

  const [EntityQueryTerm, setEntityQueryTerm] = useState('')
  const [EntityQueryTermOld, setEntityQueryTermOld] = useState('')
  const [keyboardUrl, setKeyboardUrl] = useState<string>('')
  const [botUrl, setBotUrl] = useState<string>('')

  // Fetch keyboard + bot URLs on mount from first i360dbc record
  useEffect(() => {
    fetchResources()
      .then(data => {
        const resource = data[0]
        if (!resource) return

        const useHuawei = state.isChina || state.useHMS

        // Keyboard URL
        const kbUrl = useHuawei
          ? resource.Huawei_VirtualKeyboard
          : resource.VirtualKeyboard
        setKeyboardUrl(kbUrl ?? '')

        // Bot URL
        const bUrl = useHuawei
          ? resource.Huawei_BotSearch
          : resource.BotSearch
        setBotUrl(bUrl ?? '')
      })
      .catch(() => {})
  }, [state.useHMS, state.isChina])

  async function handleSearch() {
    if (!EntityQueryTerm.trim()) return
    if (EntityQueryTerm === EntityQueryTermOld) return
    setEntityQueryTermOld(EntityQueryTerm)

    let arabicTerm = EntityQueryTerm
    if (!isArabic(EntityQueryTerm)) {
      try { arabicTerm = await translateToArabic(EntityQueryTerm) }
      catch { arabicTerm = EntityQueryTerm }
    }

    const cx = import.meta.env.VITE_PSE_CX
    const pseUrl = `https://cse.google.com/cse?cx=${cx}&q=${encodeURIComponent(arabicTerm)}`
    navigate('/browser', { state: { url: pseUrl } })
  }

  function handleBot() {
    if (!botUrl) return
    if (state.useWeb) {
      // Clear context, open in WebView
      setState({ WebAppendix: null, ScienceMinorId: 0 })
      navigate('/browser', { state: { url: botUrl } })
    } else {
      // Open in new browser tab
      window.open(botUrl, '_blank')
    }
  }

  function handleKeyboard() {
    if (keyboardUrl) window.open(keyboardUrl, '_blank')
  }

  const iconColor = '#0010CF'
  const dimColor = '#CBD5E1'

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200">

      {/* Search input with Search icon inside LEFT — rightmost in RTL */}
      <div className="flex flex-1 items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 gap-2">
        <input
          type="text"
          value={EntityQueryTerm}
          onChange={e => setEntityQueryTerm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="ابحث في المصادر الإسلامية..."
          className="flex-1 bg-transparent text-right text-sm outline-none placeholder-gray-400"
          style={{ color: iconColor }}
          dir="rtl"
        />
        {/* Search icon inside input on LEFT (last in RTL flex = leftmost) */}
        <button onClick={handleSearch} style={{ color: iconColor }} aria-label="بحث">
          <Search size={17} />
        </button>
      </div>

      {/* Bot — outside input LEFT */}
      <button
        onClick={handleBot}
        className="shrink-0 p-1"
        style={{ color: botUrl ? iconColor : dimColor }}
        disabled={!botUrl}
        aria-label="المساعد الذكي"
      >
        <Bot size={20} />
      </button>

      {/* Keyboard — leftmost */}
      <button
        onClick={handleKeyboard}
        className="shrink-0 p-1"
        style={{ color: keyboardUrl ? iconColor : dimColor }}
        disabled={!keyboardUrl}
        aria-label="لوحة المفاتيح"
      >
        <Keyboard size={20} />
      </button>
    </div>
  )
}

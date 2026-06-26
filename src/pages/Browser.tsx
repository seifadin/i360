import { useLocation } from 'react-router-dom'
import { Paperclip } from 'lucide-react'
import { useAppState } from '@/store/appState'

export default function Browser() {
  const location = useLocation()
  const { state: appState } = useAppState()
  const url = location.state?.url ?? ''

  function handleWebAppendix() {
    if (!appState.WebAppendix) return
    window.open(appState.WebAppendix, '_blank')
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Browser toolbar */}
      <div className="flex items-center gap-2 bg-gray-100 border-b px-3 py-2">
        {/* URL bar */}
        <div className="flex-1 truncate text-right text-xs text-gray-500 bg-white rounded px-2 py-1">
          {url || 'لا يوجد رابط'}
        </div>

        {/* Paperclip — WebAppendix button (only shown when WebAppendix is set) */}
        {appState.WebAppendix && (
          <button
            onClick={handleWebAppendix}
            className="p-1 text-green-800 hover:text-green-600"
            aria-label="فتح الملحق"
          >
            <Paperclip size={18} />
          </button>
        )}
      </div>

      {/* WebView */}
      {url ? (
        <iframe
          src={url}
          className="flex-1 w-full border-none"
          title="المتصفح"
        />
      ) : (
        <p className="p-4 text-right text-gray-400">لم يتم تحديد رابط</p>
      )}
    </div>
  )
}

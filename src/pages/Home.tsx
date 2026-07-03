import { useEffect, useState } from 'react'
import { usePlatform } from '@/hooks/usePlatform'
import { useAppState } from '@/store/appState'
import { fetchResources } from '@/api/baserow'
import { getStoredItem, setStoredItem } from '@/lib/deviceStorage'
import OSRow from '@/components/OSRow'
import SearchBar from '@/components/SearchBar'
import ScienceGrid from '@/components/ScienceGrid'
import Toast from '@/components/Toast'
import Dialog from '@/components/Dialog'

// ─── i360Privacy — one-time privacy notice ─────────────────────────────────────
function checkPrivacyNotice(): boolean {
  const key = 'i360Privacy'
  const stored = getStoredItem(key)
  if (stored !== null) return false // already shown before — exit, no dialog
  setStoredItem(key, '1')
  return true // first time — show dialog
}

// ─── fInfo — generic "value changed since last seen" dialog trigger ───────────
function checkChanged(itemKey: string, data2store: string | null | undefined): boolean {
  if (!data2store) return false
  const stored = getStoredItem(itemKey)
  const changed = stored !== null && stored !== data2store
  setStoredItem(itemKey, data2store)
  return changed
}

export default function Home() {
  usePlatform()
  const { setState } = useAppState()

  const [showLoadingToast, setShowLoadingToast] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [editionOpen, setEditionOpen] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const [versionPending, setVersionPending] = useState(false)

  // Mount: loading toast + privacy notice
  useEffect(() => {
    setShowLoadingToast(true)
    if (checkPrivacyNotice()) setPrivacyOpen(true)
  }, [])

  // i360dbc data change: sync i360dbqEOF, watch Edition/Version
  useEffect(() => {
    fetchResources()
      .then(data => {
        const resource = data[0]
        if (!resource) return

        setState({ i360dbqEOF: resource.i360dbqEOF ?? null })

        const editionChanged = checkChanged('i360Edition', resource.Edition)
        const versionChanged = checkChanged('i360Version', resource.Version)

        // Serialize dialogs — never show both at once
        if (editionChanged) {
          setEditionOpen(true)
          if (versionChanged) setVersionPending(true)
        } else if (versionChanged) {
          setVersionOpen(true)
        }
      })
      .catch(() => {})
  }, [])

  function handleEditionClose() {
    setEditionOpen(false)
    if (versionPending) {
      setVersionPending(false)
      setVersionOpen(true)
    }
  }

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

      {/* Loading toast — above search bar */}
      <Toast
        message="تحميل البيانات"
        show={showLoadingToast}
        durationMs={3000}
        onHide={() => setShowLoadingToast(false)}
      />

      {/* Search bar */}
      <div className="shrink-0 border-t border-gray-200 bg-white">
        <SearchBar />
      </div>

      {/* OSRow — OS_WebToggle, MobileServicesToggle, VersionMenu — bottom of page */}
      <OSRow />

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
        onClose={() => setVersionOpen(false)}
      />

    </div>
  )
}

import { useEffect, useState } from 'react'
import { usePlatform } from '@/hooks/usePlatform'
import { useAppState } from '@/store/appState'
import { useDataCache } from '@/store/dataCache'
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

export default function Home() {
  usePlatform()
  const { setState } = useAppState()
  const { resource, changeFlags, loading: cacheLoading } = useDataCache()

  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [editionOpen, setEditionOpen] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [versionPending, setVersionPending] = useState(false)
  const [revisionPending, setRevisionPending] = useState(false)

  // Mount: privacy notice (one-time)
  useEffect(() => {
    if (checkPrivacyNotice()) setPrivacyOpen(true)
  }, [])

  // i360dbc resolved by dataCache: sync i360dbqEOF, show Edition/Version/Revision
  // dialogs per changeFlags (checkChanged already ran once, inside dataCache.tsx)
  useEffect(() => {
    if (cacheLoading || !resource) return

    setState({ i360dbqEOF: resource.i360dbqEOF ?? null })

    // Serialize dialogs — never show more than one at once.
    // Order: Edition → Version → Revision (broadest scope first, Quran-specific last)
    if (changeFlags.editionChanged) {
      setEditionOpen(true)
      if (changeFlags.versionChanged) setVersionPending(true)
      else if (changeFlags.revisionChanged) setRevisionPending(true)
    } else if (changeFlags.versionChanged) {
      setVersionOpen(true)
      if (changeFlags.revisionChanged) setRevisionPending(true)
    } else if (changeFlags.revisionChanged) {
      setRevisionOpen(true)
    }
  }, [cacheLoading, resource, changeFlags])

  function handleEditionClose() {
    setEditionOpen(false)
    if (versionPending) {
      setVersionPending(false)
      setVersionOpen(true)
    } else if (revisionPending) {
      setRevisionPending(false)
      setRevisionOpen(true)
    }
  }

  function handleVersionClose() {
    setVersionOpen(false)
    if (revisionPending) {
      setRevisionPending(false)
      setRevisionOpen(true)
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-brand-ivory">

      {/* App header — logo + title */}
      <div className="flex items-center justify-center gap-2 bg-brand-ivory px-4 py-3 shadow-sm shrink-0">
        <img
          src="/assets/logo-512.png"
          alt="i360إ"
          className="h-8 w-8 object-contain"
        />
        <span className="text-xl font-bold text-brand-blue">
          الموسوعة الإسلامية إi360
        </span>
      </div>

      {/* Science accordion — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <ScienceGrid />
      </div>

      {/* Loading toast — visible exactly as long as data cache is fetching */}
      <Toast
        message="تحميل البيانات"
        show={cacheLoading}
      />

      {/* Search bar */}
      <div className="shrink-0 border-t border-gray-200 bg-brand-ivory">
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
        onClose={handleVersionClose}
      />

      {/* Revision changed notice — i360dbq exegesis index */}
      <Dialog
        open={revisionOpen}
        title="مراجعة جديدة"
        message="تم إضافة / تعديل فهرسة تفسير مُحدَّث لإثراء تجربتك"
        onClose={() => setRevisionOpen(false)}
      />

    </div>
  )
}

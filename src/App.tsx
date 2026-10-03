import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { AppStateProvider } from '@/store/appState'
import { DataCacheProvider, useDataCache } from '@/store/dataCache'
import { usePlatform } from '@/hooks/usePlatform'
import { useOtaHealth } from '@/hooks/useOtaHealth'
import { getStoredItem, setStoredItem } from '@/lib/deviceStorage'
import { REPORT_SUBJECTS } from '@/lib/feedbackReport'
import Dialog from '@/components/Dialog'
import ReportNotice from '@/components/ReportNotice'

const Home = lazy(() => import('@/pages/Home'))

// One-time privacy notice. The check is read-only: the key is written only
// when the user actually dismisses the dialog (§14g).
const PRIVACY_NOTICE_KEY = 'i360Privacy'
function checkPrivacyNotice(): boolean {
  return getStoredItem(PRIVACY_NOTICE_KEY) === null
}

// Edition/Version/Revision notices, shown one at a time.
interface QueuedDialog { title: string; message: string }

// The app shell mounts once and never unmounts, so every "once per app
// session" concern lives here, not in a page (§14).
function AppShell() {
  usePlatform()
  const { resource, changeFlags, loading: cacheLoading } = useDataCache()
  const { rollbackDetails, dismissRollback } = useOtaHealth()

  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [needsPrivacyNotice, setNeedsPrivacyNotice] = useState(checkPrivacyNotice)
  const [dialogQueue, setDialogQueue] = useState<QueuedDialog[]>([])

  // Shown only once data has settled — the fastest-rendering UI otherwise
  // caught Amiri's font swap mid-view (§14g).
  useEffect(() => {
    if (cacheLoading) return
    if (needsPrivacyNotice) setPrivacyOpen(true)
  }, [cacheLoading, needsPrivacyNotice])

  // Stable, so Dialog's focus/keydown effect doesn't re-run on every render.
  // needsPrivacyNotice is cleared too, or the effect above would reopen the
  // dialog on every retry cycle (§14m).
  const handlePrivacyClose = useCallback(() => {
    setStoredItem(PRIVACY_NOTICE_KEY, '1')
    setNeedsPrivacyNotice(false)
    setPrivacyOpen(false)
  }, [])

  // Broadest scope first: Edition → Version → Revision.
  useEffect(() => {
    if (cacheLoading || !resource) return
    const queue: QueuedDialog[] = []
    if (changeFlags.editionChanged) queue.push({ title: 'طبعة جديدة', message: 'تمت إضافة / تعديل محتوى مُحدَّث لإثراء تجربتك' })
    if (changeFlags.versionChanged) queue.push({ title: 'إصدار جديد', message: 'تم إطلاق إصدار مُحدَّث لإثراء تجربتك' })
    if (changeFlags.revisionChanged) queue.push({ title: 'مراجعة جديدة', message: 'تم إضافة / تعديل فهرسة تفسير مُحدَّث لإثراء تجربتك' })
    setDialogQueue(queue)
  }, [cacheLoading, resource, changeFlags])

  const handleDialogClose = useCallback(() => {
    setDialogQueue(prev => prev.slice(1))
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <Home />
      </Suspense>
      <Dialog open={privacyOpen} title="سلامة البيانات" message="لا يتم جمع البيانات (غير الوظيفية) أو مشاركتها. سياسة الخصوصية: https://tinyurl.com/i360Privacy" onClose={handlePrivacyClose} />
      <Dialog
        open={dialogQueue.length > 0}
        title={dialogQueue[0]?.title ?? ''}
        message={dialogQueue[0]?.message ?? ''}
        onClose={handleDialogClose}
      />
      <ReportNotice
        open={!!rollbackDetails}
        title="تم التراجع عن آخر تحديث"
        message="واجه آخر تحديث للتطبيق مشكلة، فتم التراجع تلقائيًا إلى النسخة السابقة العاملة."
        subject={REPORT_SUBJECTS.otaRollback}
        details={rollbackDetails ?? ''}
        onClose={dismissRollback}
      />
    </>
  )
}

function App() {
  return (
    <AppStateProvider>
      <DataCacheProvider>
        <AppShell />
      </DataCacheProvider>
    </AppStateProvider>
  )
}

export default App

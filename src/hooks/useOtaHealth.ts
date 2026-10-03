import { useCallback, useEffect, useRef, useState } from 'react'
import { OtaKit } from '@otakit/capacitor-updater'
import { useDataCache } from '@/store/dataCache'
import { hadUnrecoveredStartupError, likelyGenuineDataFailure, SAFETY_NET_DELAY_MS } from '@/lib/startupHealth'

// OtaKit health handshake + rollback visibility (§14o). Call once, from
// AppShell (it never unmounts). notifyAppReady() fires only after the first
// genuine data load, so OtaKit's own appReadyTimeout can roll back a bundle
// that runs but can't load data. Returns the rollback notice's state.
export function useOtaHealth(): { rollbackDetails: string | null; dismissRollback: () => void } {
  const { loading, error } = useDataCache()

  const notified = useRef(false)
  const notifyReadyOnce = useCallback(() => {
    if (notified.current) return
    notified.current = true
    // Can reject; unhandled, it would trip the startup error guard.
    OtaKit.notifyAppReady().catch(() => {})
  }, [])

  // Ready = data settled successfully, with no unrecovered JS error so far.
  useEffect(() => {
    if (loading || error || hadUnrecoveredStartupError()) return
    notifyReadyOnce()
  }, [loading, error, notifyReadyOnce])

  // Safety net, shortly before appReadyTimeout (ota-timing.json): if the
  // failure looks like connectivity rather than this bundle, confirm anyway,
  // so a good bundle isn't rolled back over a dead network.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notified.current) return
      void likelyGenuineDataFailure().then(genuine => { // never rejects
        if (!genuine) notifyReadyOnce()
      })
    }, SAFETY_NET_DELAY_MS)
    return () => clearTimeout(timer)
  }, [notifyReadyOnce])

  // A rollback shows up two ways: from a previous session (getLastFailure —
  // it happens before any JS runs) or live (the 'rollback' event). Reporting
  // only: OtaKit has no manual rollback API.
  const [rollbackDetails, setRollbackDetails] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    OtaKit.getLastFailure()
      .then(failure => { if (!cancelled && failure) setRollbackDetails(JSON.stringify(failure)) })
      .catch(() => {})
    const listener = OtaKit.addListener('rollback', failure => {
      if (!cancelled) setRollbackDetails(JSON.stringify(failure))
    })
    return () => {
      cancelled = true
      listener.then(handle => handle.remove()).catch(() => {})
    }
  }, [])

  const dismissRollback = useCallback(() => setRollbackDetails(null), [])
  return { rollbackDetails, dismissRollback }
}

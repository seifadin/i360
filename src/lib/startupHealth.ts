// Two signals behind useOtaHealth's notifyAppReady() decision (§14o):
//
// 1. A global error/unhandledrejection guard, installed first thing in
//    main.tsx — catches what ErrorBoundary can't (event handlers, timers,
//    non-React code). Aggressive: any such error blocks notifyAppReady(), since
//    dataSource.ts already absorbs ordinary fetch failures — anything reaching
//    here is a real, unanticipated fault.
//
// 2. A connectivity check for the OTA safety net: a real request to the data
//    source's domain (BASE_URL, via reachability.ts) plus navigator.onLine —
//    never navigator.onLine alone, which is unreliable in Chromium WebViews
//    (false negatives). A rollback is allowed only when both say "online and
//    reachable", i.e. the failure is likely this bundle's own.

import { probeStatus } from '@/lib/reachability'
import { BASE_URL } from '@/api/dataSource'
import otaTiming from '../../ota-timing.json'

// Shared with capacitor.config.ts's appReadyTimeout (see its own comment
// for the full reasoning on why this needed a real, structural link
// rather than two independently-drifting hardcoded numbers). App.tsx's
// safety-net timer uses this directly instead of its own literal.
export const SAFETY_NET_DELAY_MS = otaTiming.appReadyTimeoutMs - otaTiming.safetyNetMarginMs

let hadStartupError = false

export function installStartupErrorGuard() {
  // Only real JavaScript errors count. Events without an Error object —
  // cross-origin "Script error.", browser notices such as the ResizeObserver loop
  // message — say nothing about this bundle, and a false positive here blocks
  // notifyAppReady() and rolls back a good bundle.
  window.addEventListener('error', e => { if (e.error instanceof Error) hadStartupError = true })
  window.addEventListener('unhandledrejection', () => { hadStartupError = true })
}

export function hadUnrecoveredStartupError(): boolean {
  return hadStartupError
}

// Does the data source's domain respond at all? Single 5s try, shortly
// before appReadyTimeout. Anything under 500 counts — even a 404 at the bare
// origin means the domain answered; only a server error or a failed request
// counts as unreachable.
const DOMAIN_TIMEOUT_MS = 5000

async function isDataSourceDomainReachable(): Promise<boolean> {
  let origin: string
  try { origin = new URL(BASE_URL).origin } catch { return false }
  const status = await probeStatus(origin, DOMAIN_TIMEOUT_MS, 'application/json,text/html,*/*;q=0.8')
  return status !== null && status < 500
}

// True only when both signals suggest the data source should genuinely be
// reachable, yet the real fetch still, persistently failed — the
// strongest available signal that the fault is this specific bundle's,
// not an ordinary connectivity gap or a data-source-side outage.
export async function likelyGenuineDataFailure(): Promise<boolean> {
  const domainReachable = await isDataSourceDomainReachable()
  if (!domainReachable) return false
  if (!navigator.onLine) return false
  return true
}

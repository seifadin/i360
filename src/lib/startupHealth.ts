// src/lib/startupHealth.ts
// Supports App.tsx's notifyAppReady() gating decision (see its own comment
// for the full reasoning) — two independent, unrelated signals live here:
//
// 1. A global error/unhandledrejection guard, installed as early as
//    possible (main.tsx, before ErrorBoundary/App even mount) — catches
//    genuine JS errors ErrorBoundary can't (event handlers, timers, any
//    non-React code path), not just React render-time crashes. Treated
//    aggressively: any such error blocks notifyAppReady() from firing at
//    all, since this signal is far less ambiguous than a data-fetch
//    failure — dataSource.ts's own try/catch already, correctly absorbs
//    every ordinary fetch failure before it could ever become unhandled,
//    so something that escapes to here is a real, unanticipated fault.
//
// 2. A connectivity check, used specifically once the data fetch has
//    persistently failed close to notifyAppReady()'s own timeout —
//    combines a real, lightweight HTTP request to the actual data
//    source's own domain (BASE_URL, imported from dataSource.ts — see its
//    own comment there) with navigator.onLine as a secondary signal.
//    Deliberately NOT navigator.onLine alone: confirmed via direct
//    research that it's genuinely unreliable specifically in
//    Chromium-based environments (this app's own Android WebView
//    included) — TanStack Query's own docs cite "a lot of issues around
//    false negatives" as the reason they stopped trusting it as a primary
//    signal. The lightweight domain check sidesteps that entirely, since
//    it's a real network request through the same CapacitorHttp mechanism
//    already proven working elsewhere in this app, not a browser-level
//    heuristic. Either signal suggesting "likely not this bundle's fault"
//    is enough — a deliberately conservative OR, not AND: it takes
//    agreement from BOTH being wrong (domain reachable AND device
//    online) before a rollback is allowed to proceed, rather than
//    trusting either alone.

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
  // Only real JavaScript errors count (2026-10-03). Events without an Error
  // object — cross-origin "Script error.", browser notices such as the
  // ResizeObserver loop message — say nothing about this bundle, and a false
  // positive here blocks notifyAppReady() and rolls back a good bundle.
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

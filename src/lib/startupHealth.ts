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

import { CapacitorHttp } from '@capacitor/core'
import { BASE_URL } from '@/api/dataSource'
import otaTiming from '../../ota-timing.json'

// Shared with capacitor.config.ts's appReadyTimeout (see its own comment
// for the full reasoning on why this needed a real, structural link
// rather than two independently-drifting hardcoded numbers). App.tsx's
// safety-net timer uses this directly instead of its own literal.
export const SAFETY_NET_DELAY_MS = otaTiming.appReadyTimeoutMs - otaTiming.safetyNetMarginMs

let hadStartupError = false

export function installStartupErrorGuard() {
  window.addEventListener('error', () => { hadStartupError = true })
  window.addEventListener('unhandledrejection', () => { hadStartupError = true })
}

export function hadUnrecoveredStartupError(): boolean {
  return hadStartupError
}

// Lightweight — just confirms the domain itself responds at all, not a
// real data fetch. 5s timeout, single attempt: this only ever runs once,
// shortly before notifyAppReady()'s own 45s timeout would expire anyway,
// so it doesn't need dataSource.ts's own fetchWithRetry shape (3 attempts,
// backoff) — a single quick check is enough to inform this decision.
// Accepts anything under 500 as "reachable" — even a 404 at the bare
// origin (no specific route there) still means the domain itself
// responded; only a genuine server error or a thrown/rejected request
// (network failure, timeout, caught below) counts as unreachable.
async function isDataSourceDomainReachable(): Promise<boolean> {
  try {
    const domain = new URL(BASE_URL).origin
    const response = await CapacitorHttp.get({
      url: domain,
      connectTimeout: 5000,
      readTimeout: 5000,
      // Same reasoning as ScienceGrid.tsx's checkUrlReachable (2026-09-06)
      // — a bare CapacitorHttp request can get rejected by bot/WAF
      // protection even when the domain is genuinely reachable. Less
      // likely here specifically (Baserow is an API endpoint, not a
      // general website), but not a guarantee, and matching the fix
      // applied elsewhere in this same session for consistency.
      headers: {
        'User-Agent': navigator.userAgent,
        'Accept': 'application/json,text/html,*/*;q=0.8',
      },
    })
    return response.status < 500
  } catch {
    return false
  }
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

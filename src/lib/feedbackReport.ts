// Shared "copy + email" reporting mechanism (2026-09-06) — extracted from
// ErrorBoundary's own original implementation so it can be reused by the
// OTA rollback notice (App.tsx) and the data-loading error screen
// (ScienceGrid.tsx) too, rather than three separate, independently-drifting
// copies of the same feedback-address resolution and copy+mailto logic.
// ErrorBoundary itself now calls into this too — see its own comment.

import { Capacitor } from '@capacitor/core'
import { OtaKit } from '@otakit/capacitor-updater'
import { getStoredItem } from './deviceStorage'
import { FEEDBACK_MAILTO_KEY, CACHE_KEY_SCIENCES } from '@/store/dataCache'
import { Science } from '@/api/dataSource'
import { detectOS } from '@/hooks/usePlatform'

// Two-tier lookup, both reading localStorage directly — this needs to work
// even from ErrorBoundary, which sits ABOVE DataCacheProvider in the tree
// (main.tsx), so useDataCache() isn't reachable from every caller. Tier 1:
// the small dedicated key (dataCache.tsx writes this on every successful
// Sciences load, not just during a crash — see its own comment for why).
// Tier 2: fall back to parsing the full Sciences cache directly, in case
// the dedicated key hasn't been written yet (e.g. an OTA update landing
// between a user's last successful Sciences fetch and this feature
// shipping). Both can come up empty only on a device's very first ever
// launch, before any successful fetch has happened at all — an
// unavoidable, narrow edge case each caller handles at its own render
// level (see ErrorBoundary's and App.tsx's own comments).
export function resolveFeedbackMailto(): string | null {
  let feedbackMailto: string | null = getStoredItem(FEEDBACK_MAILTO_KEY)
  if (!feedbackMailto) {
    try {
      const raw = getStoredItem(CACHE_KEY_SCIENCES)
      const sciences: Science[] = raw ? JSON.parse(raw) : []
      const feedbackRow = sciences.find(s => s.ScienceMinor_En === 'Feedback')
      if (feedbackRow?.Web?.toLowerCase().startsWith('mailto:')) {
        feedbackMailto = feedbackRow.Web
      }
    } catch {
      // Corrupted cache — treat as absent, same stance as dataCache.tsx's
      // own loadCached().
    }
  }
  return feedbackMailto
}

// Diagnostic context (2026-09-12) — a real bug email arrived with only the
// error string and a manually-typed name, nothing to identify platform or
// version, making it much harder to act on than it needed to be. Every
// value here is either already public/derivable from the request itself
// (platform, a standard header servers already see on every request) or
// purely technical/non-personal (versions, timestamp) — nothing here is
// PII, and nothing beyond what a developer would need to triage a report.
//
// Reuses detectOS() (usePlatform.ts) rather than re-deriving OS detection
// independently — same source of truth as everywhere else in the app.
// Huawei/HMS noted separately, via the same regex usePlatform.ts's own
// usePlatform() hook already uses, since this project's own history has
// confirmed real, Huawei-specific behavior differences worth knowing at a
// glance (computeUseHuawei()).
//
// otaBuild vs appVersion deliberately kept distinct, matching OSRow.tsx's
// own reasoning: appVersion is this build's real, package.json-derived
// version (__APP_VERSION__) — what code shipped. otaBuild is which OTA
// bundle is actually running on this device right now — these can differ
// (the original motivation for showing both in the About dialog was a
// real bug where confirming "is the fix actually live" needed a full
// clear-data-and-repro cycle each time). On web, OtaKit concepts don't
// apply — same fallback OSRow.tsx already uses (__APP_VERSION__ again),
// rather than showing a meaningless literal '0.0.0'.
async function buildDiagnosticContext(): Promise<string> {
  const os = detectOS()
  const isHuawei = /huawei|hmscore|harmony/i.test(navigator.userAgent)
  const platform = os === 'android' && isHuawei ? 'android (Huawei)' : os

  let otaBuild = __APP_VERSION__
  if (Capacitor.isNativePlatform()) {
    try {
      const state = await OtaKit.getState()
      otaBuild = state.current.version
    } catch {
      // Leave as the __APP_VERSION__ fallback — same stance as every
      // other OtaKit.getState() call site in this app (OSRow.tsx).
    }
  }

  return [
    `Platform: ${platform}`,
    `App version: ${__APP_VERSION__}`,
    `OTA build: ${otaBuild}`,
    `Time: ${new Date().toISOString()}`,
    // Directly relevant here in a way it wouldn't be for most apps:
    // usePlatform.ts's own isChina heuristic already matches this exact
    // string (Shanghai/Urumqi) — §16's own "Next Up" documents a real,
    // still-open China-access limitation (archive.org blocked, search
    // engines untested). A China-based timezone on an incoming report is
    // a fast, strong signal pointing at that known issue, not a fresh
    // code bug. Raw string, not a derived yes/no flag, so the real value
    // is visible directly rather than trusted through a boolean.
    `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
  ].join('\n')
}

// Copies the full, untruncated details to clipboard regardless of whether
// an email destination is available (the reliable, complete copy — also a
// safety net against the mailto body truncation below on devices that do
// have one) and, if resolveFeedbackMailto() finds an address, opens a
// pre-filled mailto: with a trimmed body (very long mailto bodies can get
// silently truncated by some mail clients).
//
// Async now (2026-09-12), for buildDiagnosticContext()'s own await —
// every existing call site already calls this without awaiting or using
// a return value (confirmed directly, 2026-09-06, when this had none),
// so none needed updating: a fire-and-forget call to an async function
// is ordinary, valid JS/TS, and this project runs no lint step
// (package.json's own build script is just `tsc -b && vite build`) that
// would flag it either.
export async function copyAndEmailReport(subjectAr: string, details: string): Promise<void> {
  const diagnostics = await buildDiagnosticContext()
  const fullDetails = `${diagnostics}\n\n${details}`

  navigator.clipboard?.writeText(fullDetails).catch(() => {})

  const feedbackMailto = resolveFeedbackMailto()
  if (feedbackMailto) {
    const subject = encodeURIComponent(subjectAr)
    const body = encodeURIComponent(fullDetails.slice(0, 500))
    const separator = feedbackMailto.includes('?') ? '&' : '?'
    window.location.href = `${feedbackMailto}${separator}subject=${subject}&body=${body}`
  }
}

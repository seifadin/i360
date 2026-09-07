// Shared "copy + email" reporting mechanism (2026-09-06) — extracted from
// ErrorBoundary's own original implementation so it can be reused by the
// OTA rollback notice (App.tsx) and the data-loading error screen
// (ScienceGrid.tsx) too, rather than three separate, independently-drifting
// copies of the same feedback-address resolution and copy+mailto logic.
// ErrorBoundary itself now calls into this too — see its own comment.

import { getStoredItem } from './deviceStorage'
import { FEEDBACK_MAILTO_KEY, CACHE_KEY_SCIENCES } from '@/store/dataCache'
import { Science } from '@/api/dataSource'

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

// Copies the full, untruncated details to clipboard regardless of whether
// an email destination is available (the reliable, complete copy — also a
// safety net against the mailto body truncation below on devices that do
// have one) and, if resolveFeedbackMailto() finds an address, opens a
// pre-filled mailto: with a trimmed body (very long mailto bodies can get
// silently truncated by some mail clients).
//
// No return value — every caller already, independently checks
// resolveFeedbackMailto() beforehand to decide its own button visibility/
// label (see ErrorBoundary's reportLabel logic for the pattern), so a
// return value here would just be unused (confirmed directly, 2026-09-06 —
// none of the three real call sites ever captured it).
export function copyAndEmailReport(subjectAr: string, details: string): void {
  navigator.clipboard?.writeText(details).catch(() => {})

  const feedbackMailto = resolveFeedbackMailto()
  if (feedbackMailto) {
    const subject = encodeURIComponent(subjectAr)
    const body = encodeURIComponent(details.slice(0, 500))
    const separator = feedbackMailto.includes('?') ? '&' : '?'
    window.location.href = `${feedbackMailto}${separator}subject=${subject}&body=${body}`
  }
}

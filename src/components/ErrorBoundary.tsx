import { Component, ErrorInfo, ReactNode } from 'react'
import { getStoredItem } from '@/lib/deviceStorage'
import { FEEDBACK_MAILTO_KEY, CACHE_KEY_SCIENCES } from '@/store/dataCache'
import { Science } from '@/api/dataSource'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  errorDetails: string
  feedbackMailto: string | null
  reported: boolean
}

// Error boundaries must be class components — React has no hooks equivalent
// as of React 18. Catches any unexpected render-time exception (not handled
// fetch failures, which dataCache.tsx already surfaces via its own `error`
// state) and shows a friendly Arabic fallback instead of a blank white screen.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorDetails: '', feedbackMailto: null, reported: false }

  static getDerivedStateFromError(): Pick<State, 'hasError'> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected error caught by ErrorBoundary:', error, info)

    const errorDetails = `${error.message}\n\n${info.componentStack ?? ''}`.trim()

    // Two-tier lookup, both reading localStorage directly — ErrorBoundary
    // sits ABOVE DataCacheProvider in the tree (see main.tsx), so
    // useDataCache() isn't reachable here. Tier 1: the small dedicated
    // key (dataCache.tsx writes this on every successful Sciences load,
    // not just during a crash — see its own comment for why). Tier 2:
    // fall back to parsing the full Sciences cache directly, in case the
    // dedicated key hasn't been written yet (e.g. an OTA update landing
    // between a user's last successful Sciences fetch and this feature
    // shipping). Both can come up empty only on a device's very first
    // ever launch, before any successful fetch has happened at all — an
    // unavoidable, narrow edge case handled by the render()-level
    // fallback below, not something to solve here.
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

    this.setState({ errorDetails, feedbackMailto })
  }

  // Class property (auto-binds `this`), triggered directly by the button's
  // onClick — the synchronous user-gesture context this fires in is what
  // makes navigator.clipboard.writeText() reliable to call here.
  handleReport = () => {
    const { errorDetails, feedbackMailto } = this.state

    // Clipboard gets the FULL, untruncated details regardless of whether
    // an email could be prepared — this is the actual fallback for the
    // narrow first-launch edge case (see componentDidCatch), and also a
    // safety net against mailto body truncation below on the devices
    // that do have an email destination.
    navigator.clipboard?.writeText(errorDetails).catch(() => {})

    if (feedbackMailto) {
      const subject = encodeURIComponent('تقرير خطأ - i360إ')
      // Kept short deliberately — very long mailto bodies can get silently
      // truncated by some mail clients. The clipboard copy above already
      // carries the complete text regardless of this trim.
      const body = encodeURIComponent(errorDetails.slice(0, 500))
      const separator = feedbackMailto.includes('?') ? '&' : '?'
      window.location.href = `${feedbackMailto}${separator}subject=${subject}&body=${body}`
    }
    // No feedbackMailto: clipboard copy above is the entire action — no
    // navigation attempt, nothing silently fails, the button's own label
    // already told the user this is what tapping it would do.

    // Confirmation is worded to what's actually verifiable: the clipboard
    // write is something this code can genuinely confirm it attempted;
    // whether the mail app actually opened is not something JS can detect
    // (window.location.href to a mailto: link fails silently on the rare
    // device with no mail client configured) — so the wording says
    // "opened" only when an email destination existed, never claims more
    // than what's actually known.
    this.setState({ reported: true })
  }

  render() {
    if (this.state.hasError) {
      const canEmail = !!this.state.feedbackMailto
      const { reported } = this.state
      // Four distinct labels, not just a toggle — wording differs by
      // whether an email destination was available even before the tap
      // (canEmail), and separately by whether the tap has now happened
      // (reported). Confirmation text stays accurate to what's actually
      // verifiable (see handleReport's own comment on this).
      const reportLabel = reported
        ? (canEmail ? 'تم النسخ، وفُتح تطبيق البريد' : 'تم النسخ')
        : (canEmail ? 'الإبلاغ عن المشكلة' : 'نسخ تفاصيل الخطأ')
      return (
        <div
          dir="rtl"
          className="flex h-dvh flex-col items-center justify-center gap-4 bg-brand-ivory p-6 text-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          // Same fix as Home.tsx/Browser.tsx, applied defensively rather
          // than from an observed bug — content here is centered, so it's
          // unlikely to visibly reach the edges on typical screens, but
          // this is a third independent instance of the identical
          // unguarded h-dvh pattern, and it's the app's crash fallback —
          // worth being consistent rather than leaving a known gap.
        >
          <p className="text-xl font-bold text-brand-blue">
            حدث خطأ غير متوقع
          </p>
          <p className="text-base text-brand-blue">
            يرجى إعادة تحميل الصفحة
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-brand-blue px-4 py-2 text-base text-white"
          >
            إعادة التحميل
          </button>
          <button
            onClick={this.handleReport}
            className={`rounded-full border px-4 py-2 text-base transition-colors ${
              reported
                ? 'border-brand-green text-brand-green'
                : 'border-brand-blue text-brand-blue'
            }`}
          >
            {/* aria-live on this inner span, not the button itself —
                screen readers handle a live region more reliably when
                it's not also the interactive element receiving focus. */}
            <span aria-live="polite">{reportLabel}</span>
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

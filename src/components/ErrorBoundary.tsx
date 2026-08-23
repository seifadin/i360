import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Error boundaries must be class components — React has no hooks equivalent
// as of React 18. Catches any unexpected render-time exception (not handled
// fetch failures, which dataCache.tsx already surfaces via its own `error`
// state) and shows a friendly Arabic fallback instead of a blank white screen.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unexpected error caught by ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.hasError) {
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
        </div>
      )
    }
    return this.props.children
  }
}

import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ListCollapse, HeartPulse,
  ArrowRight, ArrowLeft, RotateCw, Home, Paperclip, Share2,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { useAppState } from '@/store/appState'
import { useDataCache } from '@/store/dataCache'
import { resolveOpenMethod } from '@/hooks/usePlatform'
import { tryOpenNewTab } from '@/lib/openTab'

// TOP BAR (RTL right→left): [HeartPulse] [URL bar] [ListCollapse]
// BOTTOM BAR (RTL right→left): [ArrowRight] [ArrowLeft] [RotateCw] [Home] [Paperclip] [Share2]

export default function Browser() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state: appState } = useAppState()
  const { resource } = useDataCache()

  const initialUrl = location.state?.url ?? ''

  const [CurrentWebView, setCurrentWebView] = useState<string>(initialUrl)
  const [WebViewPages, setWebViewPages] = useState<string[]>(initialUrl ? [initialUrl] : [])
  const [CurrentWebViewIndex, setCurrentWebViewIndex] = useState<number>(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (initialUrl) {
      setCurrentWebView(initialUrl)
      setWebViewPages([initialUrl])
      setCurrentWebViewIndex(0)
    }
  }, [initialUrl])

  function goBack() {
    if (CurrentWebViewIndex <= 0) return
    const i = CurrentWebViewIndex - 1
    setCurrentWebViewIndex(i)
    setCurrentWebView(WebViewPages[i])
  }

  function goForward() {
    if (CurrentWebViewIndex >= WebViewPages.length - 1) return
    const i = CurrentWebViewIndex + 1
    setCurrentWebViewIndex(i)
    setCurrentWebView(WebViewPages[i])
  }

  function refresh() {
    if (iframeRef.current) iframeRef.current.src = CurrentWebView
  }

  function goFirst() {
    if (!WebViewPages.length) return
    setCurrentWebViewIndex(0)
    setCurrentWebView(WebViewPages[0])
  }

  const [iframeBlocked, setIframeBlocked] = useState(false)
  const blockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Known browser/WebView error-page title fragments — English and Arabic,
  // since this app's real audience is Arabic-primary and the browser's own
  // error page renders in whatever language the device is set to, not
  // necessarily English. Deliberately lowercase/simple substring matches,
  // not an exhaustive list — this is one signal among two, not the only one.
  const ERROR_TITLE_PATTERNS = [
    'not available', "can't be reached", 'access denied', 'attention required',
    'blocked', 'error',
    'تعذر', 'تعذّر', 'غير متاح', 'رفض الوصول',
  ]

  useEffect(() => {
    setIframeBlocked(false)
    if (blockTimeoutRef.current) clearTimeout(blockTimeoutRef.current)
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    // Timeout fallback — catches anything the text-based checks below miss
    // (e.g. an error page whose title doesn't match any known pattern).
    // Language-independent, unlike the title check, so it's the more
    // robust signal for this app's multi-lingual audience; the two
    // checks fail differently, so combining them covers more real cases
    // than either alone.
    blockTimeoutRef.current = setTimeout(() => setIframeBlocked(true), 4000)
    return () => {
      if (blockTimeoutRef.current) clearTimeout(blockTimeoutRef.current)
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [CurrentWebView])

  function checkIframeTitle(): 'blocked' | 'ok' | 'inconclusive' {
    try {
      const doc = iframeRef.current?.contentDocument
      if (doc === null) return 'inconclusive' // hasn't settled yet

      const title = (doc?.title ?? '').toLowerCase()
      const isEmpty = !doc?.title && !doc?.body?.childNodes.length
      const matchesErrorPattern = ERROR_TITLE_PATTERNS.some(p => title.includes(p))

      // A matched error pattern is a strong, unambiguous signal — trust it
      // immediately. An empty title/body is genuinely ambiguous on its own
      // (could be a real error page that hasn't finished, or just a normal
      // page still loading) — treat as inconclusive and let polling wait
      // for it to settle, rather than jumping to a premature verdict.
      if (matchesErrorPattern) return 'blocked'
      if (isEmpty) return 'inconclusive'
      return 'ok'
    } catch {
      // Threw = genuinely cross-origin content we can't inspect, which only
      // happens for a real, different-origin page — a positive sign the
      // load actually succeeded, not a failure.
      return 'ok'
    }
  }

  function handleIframeLoad() {
    const result = checkIframeTitle()
    if (result === 'blocked') {
      if (blockTimeoutRef.current) clearTimeout(blockTimeoutRef.current)
      setIframeBlocked(true)
      return
    }
    if (result === 'ok') {
      if (blockTimeoutRef.current) clearTimeout(blockTimeoutRef.current)
      return
    }
    // 'inconclusive' — a single fixed-delay re-check proved unreliable (the
    // error page's title can take longer than expected to populate, and by
    // how much isn't consistent). Poll repeatedly instead of guessing one
    // delay, stopping as soon as a definitive result appears. The existing
    // 4s timeout above remains the final ceiling if polling never resolves.
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = setInterval(() => {
      const polled = checkIframeTitle()
      if (polled === 'inconclusive') return // keep polling
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (polled === 'blocked') {
        if (blockTimeoutRef.current) clearTimeout(blockTimeoutRef.current)
        setIframeBlocked(true)
      } else if (blockTimeoutRef.current) {
        clearTimeout(blockTimeoutRef.current)
      }
    }, 200)
  }

  function handleIframeError() {
    if (blockTimeoutRef.current) clearTimeout(blockTimeoutRef.current)
    setIframeBlocked(true)
  }

  function exitBrowser() { navigate('/') }

  function handleWebsiteStatus() {
    if (!resource?.WebsiteStatus || !CurrentWebView) return
    const domain = CurrentWebView.split('/')[2] ?? ''
    tryOpenNewTab(`${resource.WebsiteStatus}${domain}`)
  }

  // Paperclip — open WebAppendix using inWebList/URIschemes logic
  // (resolveOpenMethod handles the desktop-always-tab case internally)
  function handleWebAppendix() {
    if (!appState.WebAppendix) return
    const url = appState.WebAppendix

    const openMethod: 'tab' | 'webview' = resource
      ? resolveOpenMethod(url, resource.URIschemes ?? '', resource.inWebList ?? '')
      : 'webview'

    if (openMethod === 'tab') {
      tryOpenNewTab(url)
    } else {
      setCurrentWebView(url)
      setWebViewPages(prev => [...prev.slice(0, CurrentWebViewIndex + 1), url])
      setCurrentWebViewIndex(prev => prev + 1)
    }
  }

  async function handleShare() {
    if (!CurrentWebView) return

    // Android's WebView never implements navigator.share (confirmed: not even
    // Level 1) — Capacitor's own Share plugin talks to the native share sheet
    // directly instead, working correctly on both Android and iOS. The web/PWA
    // path below is untouched — navigator.share works fine in a real browser.
    if (Capacitor.isNativePlatform()) {
      try { await Share.share({ url: CurrentWebView, title: document.title }) }
      catch { /* cancelled */ }
      return
    }

    if (navigator.share) {
      try { await navigator.share({ url: CurrentWebView, title: document.title }) }
      catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(CurrentWebView)
    }
  }

  const canGoBack = CurrentWebViewIndex > 0
  const canGoForward = CurrentWebViewIndex < WebViewPages.length - 1

  return (
    <div className="flex flex-col h-dvh bg-brand-ivory">

      {/* TOP BAR */}
      <div className="flex items-center gap-2 bg-brand-ivory border-b px-2 py-2">
        {resource?.WebsiteStatus ? (
          <button onClick={handleWebsiteStatus} className="text-brand-blue" aria-label="حالة الموقع">
            <HeartPulse size={20} />
          </button>
        ) : (
          <span className="text-brand-disabled"><HeartPulse size={20} /></span>
        )}

        {/* URL bar — LTR for Latin URLs */}
        <div
          dir="ltr"
          className="flex-1 truncate rounded-full bg-gray-100 px-3 py-1 text-left text-sm text-gray-500"
        >
          {CurrentWebView || 'No URL'}
        </div>

        <button onClick={exitBrowser} className="text-brand-blue" aria-label="الرئيسية">
          <ListCollapse size={20} className="-scale-x-100" />
        </button>
      </div>

      {/* WEBVIEW — normal flex flow; the bottom bar below is an ordinary
          sibling, so this simply ends where it begins. No padding buffer
          needed (the pb-16 estimate was part of the reverted
          fixed-positioning approach — see Home.tsx for the full reasoning). */}
      {CurrentWebView ? (
        <div className="relative flex-1">
          <iframe
            ref={iframeRef}
            src={CurrentWebView}
            className="w-full h-full border-none"
            title="المتصفح"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
          {/* Blocked overlay — shown when site refuses iframe */}
          {iframeBlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 gap-3">
              <p className="text-base text-right text-brand-blue">
                تعذّر عرض الصفحة داخل التطبيق
              </p>
              <button
                onClick={() => tryOpenNewTab(CurrentWebView)}
                className="rounded-full bg-brand-blue px-4 py-2 text-base text-white"
              >
                فتح في المتصفح
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="p-4 text-right text-gray-400">لم يتم تحديد رابط</p>
      )}

      {/* BOTTOM BAR — visual left→right: [ArrowLeft][ArrowRight][RotateCw][Home][Paperclip][Share2]
          Ordinary flex document flow, not fixed — matching Home.tsx's
          revert of the fixed-positioning approach (this bar previously
          still carried it after Home reverted, an inconsistency caught in
          the housekeeping review). */}
      <div className="shrink-0 flex items-center justify-around bg-brand-ivory border-t px-2 py-2">
        <button onClick={handleShare} className="text-brand-blue" aria-label="مشاركة">
          <Share2 size={20} />
        </button>
        {appState.WebAppendix && (
          <button onClick={handleWebAppendix} className="text-brand-blue" aria-label="فتح الملحق">
            <Paperclip size={20} />
          </button>
        )}
        <button onClick={goFirst} className="text-brand-blue" aria-label="الصفحة الأولى">
          <Home size={20} />
        </button>
        <button onClick={refresh} className="text-brand-blue" aria-label="تحديث">
          <RotateCw size={20} />
        </button>
        <button
          onClick={goForward}
          disabled={!canGoForward}
          className={canGoForward ? 'text-brand-blue' : 'text-brand-disabled'}
          aria-label="للأمام"
        >
          <ArrowRight size={20} />
        </button>
        <button
          onClick={goBack}
          disabled={!canGoBack}
          className={canGoBack ? 'text-brand-blue' : 'text-brand-disabled'}
          aria-label="رجوع"
        >
          <ArrowLeft size={20} />
        </button>
      </div>
    </div>
  )
}

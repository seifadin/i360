import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ListCollapse, HeartPulse, LoaderCircle,
  ArrowRight, ArrowLeft, RotateCw, Home, Paperclip, Share2,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { useAppState } from '@/store/appState'
import { useDataCache } from '@/store/dataCache'
import { resolveOpenMethod, getDomain } from '@/hooks/usePlatform'
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

  // Loading spinner — deliberately simple, just tracks whether onLoad has
  // fired for the current navigation. Not trying to judge page content or
  // detect blocking (that approach was tried extensively and abandoned —
  // see the note by the iframe below); onLoad itself firing is a reliable,
  // standard browser event, unlike inspecting what loaded. A generous
  // safety-net timeout hides it regardless, so a genuinely hung load never
  // spins forever.
  const [iframeLoading, setIframeLoading] = useState(!!initialUrl)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Shared by the CurrentWebView effect below AND refresh() — refresh
  // reassigns the same src string, which doesn't change CurrentWebView,
  // so the effect alone would never re-show the spinner on a refresh (a
  // real inconsistency caught in the 2026-08-19 review: every other
  // navigation showed the spinner, refresh silently didn't).
  function beginIframeLoad() {
    setIframeLoading(true)
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
    loadTimeoutRef.current = setTimeout(() => setIframeLoading(false), 15000)
  }

  useEffect(() => {
    if (CurrentWebView) {
      beginIframeLoad()
    } else {
      setIframeLoading(false)
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
    }
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
    }
  }, [CurrentWebView])

  function handleIframeLoad() {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
    setIframeLoading(false)
  }

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
    if (!iframeRef.current) return
    beginIframeLoad()
    iframeRef.current.src = CurrentWebView
  }

  function goFirst() {
    if (!WebViewPages.length) return
    setCurrentWebViewIndex(0)
    setCurrentWebView(WebViewPages[0])
  }

  function exitBrowser() { navigate('/') }

  function handleWebsiteStatus() {
    if (!resource?.WebsiteStatus || !CurrentWebView) return
    tryOpenNewTab(`${resource.WebsiteStatus}${getDomain(CurrentWebView)}`)
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
    <div className="flex flex-col h-dvh bg-brand-ivory pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Same fix as Home.tsx, same reason — this route has its own
          separate h-dvh wrapper (not shared layout), so it needed its
          own copy of this padding; missed in the first pass, caught on
          review since the same unguarded pattern existed here too. */}

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
          fixed-positioning approach — see Home.tsx for the full reasoning).
          No custom blocked-page detection — tried extensively (title/text
          pattern matching, polling, visibility timeouts) and found
          fundamentally unreliable inside this specific Android WebView
          (misfired broadly, even on genuinely working pages). Reverted:
          a site that refuses to be framed shows the browser's own raw
          error page, same as before this was ever attempted. The intended
          real fix is upstream — vet problem domains manually and add them
          to inWebList/URIschemes so they open in a tab instead of an
          iframe in the first place, rather than trying to detect failure
          after the fact from inside the page. */}
      {CurrentWebView ? (
        <div className="relative flex-1">
          <iframe
            ref={iframeRef}
            src={CurrentWebView}
            className="w-full h-full border-none"
            title="المتصفح"
            onLoad={handleIframeLoad}
          />
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-ivory">
              <LoaderCircle size={32} className="animate-spin text-brand-blue" />
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

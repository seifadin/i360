import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ListCollapse, HeartPulse,
  ArrowRight, ArrowLeft, RotateCw, Home, Paperclip, Share2,
} from 'lucide-react'
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

  useEffect(() => {
    setIframeBlocked(false)
  }, [CurrentWebView])

  function handleIframeLoad() {
    try {
      const doc = iframeRef.current?.contentDocument
      if (doc !== null && (!doc?.title && !doc?.body?.childNodes.length)) {
        setIframeBlocked(true)
      }
    } catch {
      setIframeBlocked(false)
    }
  }

  function handleIframeError() {
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

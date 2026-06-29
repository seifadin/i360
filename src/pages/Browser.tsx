import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ListCollapse, HeartPulse,
  ArrowRight, ArrowLeft, RotateCw, Home, Paperclip, Share2,
} from 'lucide-react'
import { useAppState } from '@/store/appState'
import { fetchResources } from '@/api/baserow'
import { resolveOpenMethod } from '@/hooks/usePlatform'

// TOP BAR (RTL right→left): [HeartPulse] [URL bar] [ListCollapse]
// BOTTOM BAR (RTL right→left): [ArrowRight] [ArrowLeft] [RotateCw] [Home] [Paperclip] [Share2]

export default function Browser() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state: appState } = useAppState()

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
    if (!appState.WebsiteStatus || !CurrentWebView) return
    const domain = CurrentWebView.split('/')[2] ?? ''
    window.open(`${appState.WebsiteStatus}${domain}`, '_blank')
  }

  // Paperclip — open WebAppendix using inWebList/URIschemes logic
  async function handleWebAppendix() {
    if (!appState.WebAppendix) return
    const url = appState.WebAppendix

    let openMethod: 'tab' | 'webview' = 'webview'
    if (appState.ScienceMinorId) {
      try {
        const resources = await fetchResources(appState.ScienceMinorId)
        const resource = resources[0]
        if (resource) {
          openMethod = resolveOpenMethod(
            url,
            resource.URIschemes ?? '',
            resource.inWebList ?? ''
          )
        }
      } catch { openMethod = 'webview' }
    }

    if (openMethod === 'tab') {
      window.open(url, '_blank')
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
  const btn = '#0010CF'
  const dim = '#CBD5E1'

  return (
    <div className="flex flex-col h-screen">

      {/* TOP BAR */}
      <div className="flex items-center gap-2 bg-white border-b px-2 py-2">
        {appState.WebsiteStatus ? (
          <button onClick={handleWebsiteStatus} style={{ color: btn }} aria-label="حالة الموقع">
            <HeartPulse size={20} />
          </button>
        ) : (
          <span style={{ color: dim }}><HeartPulse size={20} /></span>
        )}

        {/* URL bar — LTR for Latin URLs */}
        <div
          className="flex-1 truncate text-xs bg-gray-100 px-3 py-1"
          style={{ color: '#666', borderRadius: '9999px', direction: 'ltr', textAlign: 'left' }}
        >
          {CurrentWebView || 'No URL'}
        </div>

        <button onClick={exitBrowser} style={{ color: btn }} aria-label="الرئيسية">
          <ListCollapse size={20} />
        </button>
      </div>

      {/* WEBVIEW */}
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
              <p className="text-sm text-right" style={{ color: '#0010CF' }}>
                تعذّر عرض الصفحة داخل التطبيق
              </p>
              <button
                onClick={() => window.open(CurrentWebView, '_blank')}
                className="px-4 py-2 rounded-full text-sm text-white"
                style={{ backgroundColor: '#0010CF' }}
              >
                فتح في المتصفح
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="p-4 text-right" style={{ color: '#999' }}>لم يتم تحديد رابط</p>
      )}

      {/* BOTTOM BAR — visual left→right: [ArrowLeft][ArrowRight][RotateCw][Home][Paperclip][Share2] */}
      <div className="flex items-center justify-around bg-white border-t px-2 py-2">
        <button onClick={handleShare} style={{ color: btn }} aria-label="مشاركة">
          <Share2 size={20} />
        </button>
        {appState.WebAppendix ? (
          <button onClick={handleWebAppendix} style={{ color: btn }} aria-label="فتح الملحق">
            <Paperclip size={20} />
          </button>
        ) : (
          <span style={{ color: dim }}><Paperclip size={20} /></span>
        )}
        <button onClick={goFirst} style={{ color: btn }} aria-label="الصفحة الأولى">
          <Home size={20} />
        </button>
        <button onClick={refresh} style={{ color: btn }} aria-label="تحديث">
          <RotateCw size={20} />
        </button>
        <button onClick={goForward} disabled={!canGoForward}
          style={{ color: canGoForward ? btn : dim }} aria-label="للأمام">
          <ArrowRight size={20} />
        </button>
        <button onClick={goBack} disabled={!canGoBack}
          style={{ color: canGoBack ? btn : dim }} aria-label="رجوع">
          <ArrowLeft size={20} />
        </button>
      </div>
    </div>
  )
}

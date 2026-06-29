import { useEffect } from 'react'
import { useAppState } from '@/store/appState'

export type OSType = 'android' | 'ios' | 'web'

export function detectOS(): OSType {
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'web'
}

export function isDesktop(): boolean {
  return detectOS() === 'web'
}

export function usePlatform() {
  const { setState } = useAppState()

  useEffect(() => {
    const os = detectOS()
    const useWeb = os === 'web'
    const isMobile = os !== 'web'
    const ua = navigator.userAgent
    const useHMS = /huawei|hmscore|harmony/i.test(ua)
    const isChina = /china/i.test(navigator.language) ||
      Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Shanghai')
    const isGMSorApple = isMobile && !useHMS
    const useHMSdefault = useHMS && !isGMSorApple

    setState({ useWeb, isMobile, isChina, useHMS, isGMSorApple, useHMSdefault })
  }, [])
}

// ─── URL resolution ───────────────────────────────────────────────────────────
// inWebList  → comma-separated domains that force browser tab
// URIschemes → comma-separated schemes that force browser tab
// Default    → WebView

export function resolveOpenMethod(
  webUrl: string,
  uriSchemes: string,
  inWebList: string
): 'tab' | 'webview' {
  const scheme = webUrl.split(':')[0]?.trim() ?? ''
  const domain = webUrl.split('/')[2]?.trim() ?? ''

  if (uriSchemes?.includes(scheme) || inWebList?.includes(domain)) return 'tab'
  return 'webview'
}

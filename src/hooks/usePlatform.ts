import { useEffect } from 'react'
import { useAppState } from '@/store/appState'

export type OSType = 'android' | 'ios' | 'web'

export function detectOS(): OSType {
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'web'
}

export function usePlatform() {
  const { setState } = useAppState()

  useEffect(() => {
    const os = detectOS()
    const useWeb = os === 'web'
    const isMobile = os !== 'web'

    // HMS detection — Huawei devices lack Google Play Services
    const ua = navigator.userAgent
    const useHMS = /huawei|hmscore|harmony/i.test(ua)
    const isChina = /china/i.test(navigator.language) ||
      Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Shanghai')

    // GMS or Apple — standard Android or iOS
    const isGMSorApple = isMobile && !useHMS

    // Huawei default — HMS without GMS fallback
    const useHMSdefault = useHMS && !isGMSorApple

    setState({
      useWeb,
      isMobile,
      isChina,
      useHMS,
      isGMSorApple,
      useHMSdefault,
    })
  }, [])
}

// ─── URL resolution ───────────────────────────────────────────────────────────

export function resolveOpenMethod(
  webUrl: string,
  uriSchemes: string,
  inWebList: string
): 'tab' | 'webview' {
  // Extract scheme (e.g. "https") and domain (e.g. "tanzil.net")
  const scheme = webUrl.split(':')[0] ?? ''
  const domain = webUrl.split('/')[2] ?? ''

  const schemes = uriSchemes ? uriSchemes.split(',').map(s => s.trim()) : []
  const domains = inWebList ? inWebList.split(',').map(d => d.trim()) : []

  if (schemes.includes(scheme) || domains.includes(domain)) return 'webview'
  return 'tab'
}

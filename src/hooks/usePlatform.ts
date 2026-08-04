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

// On a genuine desktop browser there's no real "native app" identity to
// resolve to — but toggling useWeb off is meant to let a desktop developer
// preview mobile store-link behavior via MobileServicesToggle (Google/
// Huawei). This treats that case as a simulated Android context so
// resolveUrl actually resolves to a real store link, not a Web fallback.
// Real mobile devices are never affected — this only kicks in when the
// genuine OS is 'web' and useWeb is off.
export function resolveEffectiveOS(useWeb: boolean): OSType {
  const os = detectOS()
  if (os === 'web' && !useWeb) return 'android'
  return os
}

// Plain, synchronous — no React state involved, so callers always get a
// fresh answer with zero lag. There is no stored appState equivalent —
// that copy (and the effect that wrote it) was removed as dead state in an
// earlier round, since it could trail one render behind useWeb changing and
// nothing safely depended on it. This function is the only source now.
export function computeIsGMSorApple(useWeb: boolean, isChina: boolean, useHMS: boolean): boolean {
  const os = resolveEffectiveOS(useWeb)
  return ((os === 'android' && !(isChina || useHMS)) || os === 'ios') && !useWeb
}

// Whether Huawei-specific resources (BotSearch, VirtualKeyboard, CustomSearch)
// should be used instead of their Google/default counterparts. Gated on
// !useWeb because MobileServicesToggle — the only thing that sets useHMS —
// is itself only visible when useWeb is off; without this gate, a stale
// useHMS from an earlier native-mode session kept silently applying after
// switching back to web. Extracted here (matching computeIsGMSorApple's
// pattern) after this exact logic was found duplicated independently in
// ScienceGrid.tsx and SearchBar.tsx, with only one of the two copies
// actually including this gate.
export function computeUseHuawei(useWeb: boolean, isChina: boolean, useHMS: boolean): boolean {
  return !useWeb && (isChina || useHMS)
}

export function usePlatform() {
  const { setState } = useAppState()

  // OS/HMS/China detection — computed once on mount, doesn't depend on useWeb
  useEffect(() => {
    const ua = navigator.userAgent
    const useHMS = /huawei|hmscore|harmony/i.test(ua)
    const isChina = /china/i.test(navigator.language) ||
      Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Shanghai') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Urumqi')

    setState({ isChina, useHMS })
  }, [])
}

// ─── URL resolution ───────────────────────────────────────────────────────────
// inWebList  → comma-separated domains that force browser tab
// URIschemes → comma-separated schemes that force browser tab
// Default    → WebView

// Extracts the domain from a URL — shared by matchesWebList below and
// Browser.tsx's handleWebsiteStatus, which previously each hand-wrote the
// same one-line extraction independently.
export function getDomain(url: string): string {
  return url.split('/')[2]?.trim() ?? ''
}

// Checks a URL against inWebList/URIschemes only — no desktop handling, so
// callers with their own desktop policy (e.g. SearchBar's Bot context, which
// deliberately ignores isDesktop()) can still consult the same underlying
// data as resolveOpenMethod, without inheriting its desktop-always-tab rule.
export function matchesWebList(webUrl: string, uriSchemes: string, inWebList: string): boolean {
  const scheme = webUrl.split(':')[0]?.trim() ?? ''
  const domain = getDomain(webUrl)
  return !!(uriSchemes?.includes(scheme) || inWebList?.includes(domain))
}

export function resolveOpenMethod(
  webUrl: string,
  uriSchemes: string,
  inWebList: string
): 'tab' | 'webview' {
  if (isDesktop()) return 'tab'
  return matchesWebList(webUrl, uriSchemes, inWebList) ? 'tab' : 'webview'
}

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
// fresh answer with zero lag. The stored appState.isGMSorApple (set via the
// effect below) can trail one render behind useWeb changing; any
// business-critical decision (e.g. resolveUrl) should call this directly
// instead of reading the stored value.
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
  const { state, setState } = useAppState()

  // OS/HMS/China detection — computed once on mount, doesn't depend on useWeb
  useEffect(() => {
    const ua = navigator.userAgent
    const useHMS = /huawei|hmscore|harmony/i.test(ua)
    const isChina = /china/i.test(navigator.language) ||
      Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Shanghai') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone.includes('Urumqi')

    setState({ isChina, useHMS })
  }, [])

  // isGMSorApple depends on useWeb (a manual toggle that can change after
  // mount) plus isChina/useHMS — recompute whenever any of them change,
  // rather than freezing at whatever useWeb was on first render.
  // NOTE: this stored value can still lag one render behind — see
  // computeIsGMSorApple() above for the race-free alternative.
  useEffect(() => {
    setState({ isGMSorApple: computeIsGMSorApple(state.useWeb, state.isChina, state.useHMS) })
  }, [state.useWeb, state.isChina, state.useHMS])
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
  if (isDesktop()) return 'tab'

  const scheme = webUrl.split(':')[0]?.trim() ?? ''
  const domain = webUrl.split('/')[2]?.trim() ?? ''

  if (uriSchemes?.includes(scheme) || inWebList?.includes(domain)) return 'tab'
  return 'webview'
}

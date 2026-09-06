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
// preview mobile store-link behavior via the OSRow simulator cycle
// (Google → Huawei → Apple). simIOS picks which OS is being simulated:
// false → 'android' (Google/Huawei links), true → 'ios' (Apple links).
// Real mobile devices are never affected — this only kicks in when the
// genuine OS is 'web' and useWeb is off; simIOS is otherwise inert.
export function resolveEffectiveOS(useWeb: boolean, simIOS: boolean): OSType {
  const os = detectOS()
  if (os === 'web' && !useWeb) return simIOS ? 'ios' : 'android'
  return os
}

// Plain, synchronous — no React state involved, so callers always get a
// fresh answer with zero lag. There is no stored appState equivalent —
// that copy (and the effect that wrote it) was removed as dead state in an
// earlier round, since it could trail one render behind useWeb changing and
// nothing safely depended on it. This function is the only source now.
export function computeIsGMSorApple(useWeb: boolean, isChina: boolean, useHMS: boolean, simIOS: boolean): boolean {
  const os = resolveEffectiveOS(useWeb, simIOS)
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

  // OS/HMS/China detection — computed once on mount, doesn't depend on
  // useWeb. Must be called from a component that survives in-app
  // navigation (App.tsx, not a route-level page like Home.tsx) — calling
  // it from a page component means React Router unmounting/remounting
  // that page re-runs this and silently overwrites any manual
  // MobileServicesToggle override, defeating the simulator's purpose.
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

// Extracts the domain from a URL — shared by matchesWebList below and,
// historically, Browser.tsx's own handleWebsiteStatus (deleted 2026-09-03
// alongside the rest of that page) — both once hand-wrote the same
// one-line extraction independently before this was pulled out.
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
): 'tab' | 'in_app' {
  if (isDesktop()) return 'tab'
  return matchesWebList(webUrl, uriSchemes, inWebList) ? 'tab' : 'in_app'
}

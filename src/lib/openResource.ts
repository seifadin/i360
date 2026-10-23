import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { resolveOpenMethod, matchesWebList } from '@/hooks/usePlatform'
import { tryOpenNewTab } from '@/lib/openTab'

export interface OpenContext {
  useWeb: boolean
  uriSchemes: string
  inWebList: string
}

// The single "where does this URL open?" decision (§5, §12 rule 12), shared by
// ScienceGrid and SearchBar. In-app = the OS's own browser overlay (Custom Tabs /
// SFSafariViewController); otherwise a new tab or external app. 'bot' routes on
// useWeb alone (Botpress is embed-friendly); 'default' also honors
// inWebList/URIschemes.
//
// Resolves true if something opened. Both openers are called before any await,
// so they stay inside the user's tap. If the in-app browser fails, falls back
// to a new tab and reports that result — never an unhandled rejection.
// The app's own pages (hub/, built into public/ — i360-hub.md §10). In the installed app,
// a link to one opens the app's own copy in the app's view, not the browser overlay:
// the app's address i36o.web.app (since 2026-10-23), the old i360-e.web.app and hub
// addresses and the old forwarders. Always as /<page>/index.html: Capacitor's built-in server answers a
// path without a file extension with the app's own index.html (i360-hub.md §10).
const OWN_PAGES = ['day', 'md', 'cse']
const OWN_HOSTS = ['i36o.web.app', 'i360-e.web.app', 'i360-hub.web.app']
const FORWARDERS: Record<string, string> = { 'i360-day.web.app': 'day', 'i360-md.web.app': 'md', 'i360-cse.web.app': 'cse' }

export function ownPagePath(url: string): string | null {
  if (!Capacitor.isNativePlatform()) return null
  let u: URL
  try { u = new URL(url) } catch { return null }
  if (u.protocol !== 'https:') return null
  const page = FORWARDERS[u.hostname] ?? (OWN_HOSTS.includes(u.hostname) ? u.pathname.split('/')[1] ?? '' : '')
  return OWN_PAGES.includes(page) ? `/${page}/index.html${u.search}${u.hash}` : null
}

export async function openResource(url: string, ctx: OpenContext, kind: 'default' | 'bot' = 'default'): Promise<boolean> {
  const own = ownPagePath(url)
  if (own) {
    window.location.assign(own)
    return true
  }
  const inApp = kind === 'bot'
    ? ctx.useWeb && !matchesWebList(url, ctx.uriSchemes, ctx.inWebList)
    : ctx.useWeb && resolveOpenMethod(url, ctx.uriSchemes, ctx.inWebList) === 'in_app'
  if (!inApp) return tryOpenNewTab(url)
  try {
    await Browser.open({ url })
    return true
  } catch {
    return tryOpenNewTab(url)
  }
}

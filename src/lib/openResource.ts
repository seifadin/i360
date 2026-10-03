import { Browser } from '@capacitor/browser'
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
export async function openResource(url: string, ctx: OpenContext, kind: 'default' | 'bot' = 'default'): Promise<boolean> {
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

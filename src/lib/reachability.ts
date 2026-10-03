import { CapacitorHttp } from '@capacitor/core'

// One status probe via CapacitorHttp — shared by the resource pre-check
// (ScienceGrid) and the OTA safety net (startupHealth). Native: no CORS, a
// real status. Web: falls back to fetch, so CORS-limited (§14q). Browser-
// like headers, since bot/WAF protection can reject a bare request (§14o).
// Resolves the HTTP status, or null if the request failed or timed out;
// each caller applies its own policy.
export async function probeStatus(url: string, timeoutMs: number, accept: string): Promise<number | null> {
  try {
    const response = await CapacitorHttp.get({
      url,
      connectTimeout: timeoutMs,
      readTimeout: timeoutMs,
      headers: { 'User-Agent': navigator.userAgent, Accept: accept, 'Accept-Language': 'ar,en;q=0.9' },
    })
    return response.status
  } catch {
    return null
  }
}

const PAGE_TIMEOUT_MS = 5000
const PAGE_RETRY_BACKOFF_MS = 800 // one retry: 2 tries in total

// Pre-flight check before opening a resource the user is waiting on. 2xx/3xx
// count as reachable, and so does 403 — usually "you don't look like a
// browser", while the real browser that opens next sails through. 404/410/5xx
// and network failures do not.
export async function checkPageReachable(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, PAGE_RETRY_BACKOFF_MS))
    const status = await probeStatus(url, PAGE_TIMEOUT_MS, 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
    if (status !== null) return (status >= 200 && status < 400) || status === 403
  }
  return false
}

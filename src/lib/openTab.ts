// Opens a new tab and detects a blocked popup properly — some browsers
// return a non-null window reference even when blocked, immediately
// closing it rather than returning null outright. Checking .closed
// catches that case too, not just the null case. A fully-sandboxed
// context (e.g. an iframe preview with no allow-popups) can make
// window.open throw outright instead — without the try/catch, that
// would silently crash the click handler with zero visible feedback.
// Callers that don't need failure feedback can simply ignore the
// return value — they still get the crash protection for free.
export function tryOpenNewTab(url: string): boolean {
  try {
    const win = window.open(url, '_blank')
    if (!win) return false
    return !win.closed
  } catch {
    return false
  }
}

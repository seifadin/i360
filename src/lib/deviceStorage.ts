// ─── Device storage helpers ────────────────────────────────────────────────────
// Safe wrappers around localStorage. Mirrors the AppGyver on-device storage
// pattern: get() returns null on missing key OR any read error (private
// browsing, disabled storage, etc.) — equivalent to the old
// "itemKey != NULL AND NOT isErr(itemKey)" check being false.

export function getStoredItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function setStoredItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

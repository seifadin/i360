import { getStoredItem, setStoredItem } from '@/lib/deviceStorage'

// ─── "value changed since last seen" ──────────────────────────────────────────
// Two-phase: read here; the baseline is written only after the data it gates has
// actually loaded (commitBaseline, in dataCache.tsx's init()). The old single call read AND
// overwrote it, so an attempt that failed after the check hid the change from
// every retry and every later launch — stale content indefinitely (§15h).
export function hasChanged(itemKey: string, value: string | null | undefined): boolean {
  if (!value) return false
  const stored = getStoredItem(itemKey)
  return stored !== null && stored !== value
}

export function commitBaseline(itemKey: string, value: string | null | undefined): void {
  if (value) setStoredItem(itemKey, value)
}

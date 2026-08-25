import { ComponentType } from 'react'

// PascalCase (as stored in Baserow, matching lucide-react's named exports) →
// kebab-case (matching lucide-react's individual icon file names).
export function toKebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

// Vite-native glob of every lucide icon file — resolves correctly in BOTH
// the dev server and production build. A bare-specifier dynamic import
// (`import('lucide-react/dist/esm/icons/...')`) only works at build time,
// since Rollup can statically rewrite it; the dev server serves raw
// browser-native ESM, and browsers cannot resolve a bare specifier inside a
// dynamic import at all. This does mean every icon in the library gets its
// own build-output chunk (not just the ones this app's data uses) — a
// build-time/deployment-footprint cost, not a runtime one: a real browser
// only ever fetches the specific icons it actually renders.
const iconModules = import.meta.glob('/node_modules/lucide-react/dist/esm/icons/*.mjs')

type IconModule = { default: ComponentType<{ size?: number }> }

export function loadIcon(name: string): Promise<IconModule> | null {
  const path = `/node_modules/lucide-react/dist/esm/icons/${toKebabCase(name)}.mjs`
  const loader = iconModules[path] as (() => Promise<IconModule>) | undefined
  return loader ? loader() : null
}

// Fires all icon fetches at once, priming the browser's module cache so
// that when ScienceGrid's rows actually mount and request these same icons
// (via DynamicIcon), they resolve instantly instead of each triggering its
// own fresh network round-trip in a burst. Called from dataCache.tsx right
// after Sciences data lands — naturally re-runs only when that data
// actually changes (Edition-gated), same as the underlying fetch itself.
export function preloadIcons(names: Iterable<string>) {
  for (const name of names) {
    loadIcon(name)?.catch(() => {}) // best-effort — DynamicIcon's own fallback handles real failures
  }
}

// requestIdleCallback has never shipped in Safari/WebKit — meaning
// Capacitor's iOS app, which renders through WKWebView, would silently
// never defer anything scheduled this way without a fallback (the same
// "don't assume a standard API behaves the same in this app's WebView"
// caution as §12.16's existing bug class, just for WebKit specifically
// rather than Android's WebView). 200ms is a reasonable "the browser has
// likely settled by now" guess where requestIdleCallback isn't available,
// not a precise substitute for it.
export function scheduleIdle(callback: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(callback)
  } else {
    setTimeout(callback, 200)
  }
}

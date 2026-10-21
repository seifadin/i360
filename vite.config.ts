import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

// The app's Content Security Policy (2026-10-21, §15s) — written into the BUILT
// index.html only (the dev server's own inline scripts are left alone), as a
// <meta> tag, so web, Android and iOS all get the same policy from this one place.
// script-src is the protection that matters: only the app's own script files
// run, plus any inline <script> in index.html, each allowed by its SHA-256
// computed here at build time — so adding one never needs a manual edit.
// connect-src allows any https: on purpose: on web, the reachability check
// probes arbitrary resource sites, whose addresses come from Baserow (on
// native it runs through CapacitorHttp, outside the page's policy).
// The tag goes right after <head>: on Android, Capacitor inserts its bridge
// script at that exact spot while serving the page, so the bridge stays ahead
// of the policy (a <meta> policy only governs what follows it).
// style-src 'unsafe-inline' (2026-10-21, §15t): the shared theme keeps its saved
// offline copy of theme.css as an inline <style> (early.js, theme-loader.js) —
// the hub pages allow the same. Scripts stay locked: that is where the risk is.
const CSP_SOURCES: Record<string, string> = {
  'default-src': "'self'",
  'style-src': "'self' 'unsafe-inline' https://theme.i36o.workers.dev",
  'font-src': "'self' https://theme.i36o.workers.dev",
  'img-src': "'self' data:",
  'connect-src': "'self' https:",
  'object-src': "'none'",
  'frame-src': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
}

// The shared i360 theme (2026-10-21, §15t), used from where it lives — hub/theme/,
// the one copy every i360 page uses (claude/i360-hub.md §3):
//   - theme-loader.js is bundled into the app through the '@i360/theme-loader'
//     alias; it finds theme.css next to itself (import.meta.url), so — exactly as
//     the hub's own build does — that address is pointed at the theme site.
//   - early.js (the saved theme and saved theme.css copy, applied before anything
//     is drawn: no flash) is built into index.html's <head> as an inline script,
//     after the theme.css link so the saved copy wins; the policy above hashes it.
const THEME_DIR = fileURLToPath(new URL('./hub/theme/', import.meta.url))
const THEME_LOADER = `${THEME_DIR}site/theme-loader.js`
const THEME_SITE_LOADER = 'https://theme.i36o.workers.dev/theme-loader.js'

function sharedTheme(): Plugin {
  return {
    name: 'i360-shared-theme',
    transform(code, id) {
      if (id.split('?')[0] !== THEME_LOADER) return null
      return code.replace(/import\.meta\.url/g, JSON.stringify(THEME_SITE_LOADER))
    },
    transformIndexHtml(html) {
      const early = readFileSync(`${THEME_DIR}early.js`, 'utf-8').trim()
      // The LAST </head>: the real one, even if a comment above ever mentions the tag.
      const end = html.lastIndexOf('</head>')
      if (end === -1) throw new Error('index.html: no </head> to put the theme script before (see §15t)')
      return `${html.slice(0, end)}  <script>${early}</script>\n  ${html.slice(end)}`
    },
  }
}

function contentSecurityPolicy(): Plugin {
  return {
    name: 'i360-content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const inline = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi
        const hashes: string[] = []
        let match: RegExpExecArray | null
        while ((match = inline.exec(html)) !== null) {
          hashes.push(`'sha256-${createHash('sha256').update(match[1] ?? '').digest('base64')}'`)
        }
        const directives = { 'script-src': ["'self'", ...hashes].join(' '), ...CSP_SOURCES }
        const policy = Object.keys(directives)
          .map((name) => `${name} ${directives[name as keyof typeof directives]}`)
          .join('; ')
        if (html.indexOf('<head>') === -1) {
          throw new Error('index.html: no plain <head> tag to put the Content Security Policy after (see §15s)')
        }
        return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
      },
    },
  }
}

// readFileSync + JSON.parse, not a direct JSON import — avoids relying on
// import-assertion syntax support varying across Node/TS versions, same
// spirit as this project's own prior avoidance of a fragile JSON-parsing
// dependency elsewhere (12g's Run Script phase).
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
)

export default defineConfig({
  plugins: [react(), sharedTheme(), contentSecurityPolicy()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@i360/theme-loader': THEME_LOADER,
    },
  },
  define: {
    // Web/PWA-only need (2026-08-29): OtaKit's own web fallback hardcodes
    // its reported version to the literal '0.0.0' always, since OTA
    // concepts don't meaningfully apply on web. Exposes the real,
    // build-time app version instead — see OSRow.tsx for where this is
    // actually used.
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})

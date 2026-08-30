import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

// readFileSync + JSON.parse, not a direct JSON import — avoids relying on
// import-assertion syntax support varying across Node/TS versions, same
// spirit as this project's own prior avoidance of a fragile JSON-parsing
// dependency elsewhere (12g's Run Script phase).
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
)

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
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

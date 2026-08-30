/// <reference types="vite/client" />

// Injected at build time by vite.config.ts's define block — the app's
// real package.json version, used specifically as a web/PWA fallback
// where OtaKit's own reported version is meaningless (see OSRow.tsx).
declare const __APP_VERSION__: string

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Android's back button on the app's home screen (2026-10-22, Seif): an open
// dialog closes first; with nothing open, the app goes to the background — what
// Android itself does for an app's first screen since Android 12 (it stays in
// memory, so reopening is instant).
//
// Only this page handles back: Capacitor drops every page's handlers whenever a
// page loads (Bridge.reset()), so on the app's own pages (/day/index.html …)
// @capacitor/app's own default applies — back in the page history, i.e. home.

const closers: (() => void)[] = []

/** An open dialog's close, closed first by back. Returns its removal; call it when the dialog closes. */
export function closeOnBack(close: () => void): () => void {
  closers.push(close)
  return () => {
    const i = closers.lastIndexOf(close)
    if (i !== -1) closers.splice(i, 1)
  }
}

let installed = false

/** Android only; once. Fully caught: a failure leaves Capacitor's default. */
export function installBackButton(): void {
  if (installed || Capacitor.getPlatform() !== 'android') return
  installed = true
  App.addListener('backButton', () => {
    const close = closers[closers.length - 1]
    if (close) close()
    else void App.minimizeApp().catch(() => { /* nothing better to do */ })
  }).catch(() => { /* listener not added: the plugin's own default stays */ })
}

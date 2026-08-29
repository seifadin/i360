import { ReactNode, useEffect, useId, useRef } from 'react'

interface DialogProps {
  open: boolean
  title: string
  // ReactNode, not just string (2026-08-29) — needed so OSRow's version
  // dialog can render its OTA-build line in a different, smaller text
  // size than the rest of the message. Fully backward-compatible: a plain
  // string is itself a valid ReactNode, so the privacy/Edition dialogs'
  // existing string messages need no changes at all.
  message: ReactNode
  onClose: () => void
}

export default function Dialog({ open, title, message, onClose }: DialogProps) {
  // useId() rather than a hardcoded string — Dialog is a single shared
  // component rendered from several independent call sites (privacy notice,
  // the queued Edition/Version/Revision dialogs, OSRow's version-info
  // dialog). A hardcoded id would collide with duplicate DOM ids if two
  // instances ever mounted at once; useId() gives each instance its own
  // stable, unique id.
  const id = useId()
  const okButtonRef = useRef<HTMLButtonElement>(null)

  // Hooks must run unconditionally before the early return below (Rules of
  // Hooks) — this effect itself no-ops via its own `if (!open) return`
  // whenever the dialog isn't actually showing.
  useEffect(() => {
    if (!open) return

    // Move focus into the dialog on open. Without this, whatever element
    // was focused before the dialog opened stays focused — meaning a
    // keyboard/screen-reader user could be left "on" page content that's
    // now visually hidden behind the overlay, with no indication a modal
    // appeared at all.
    okButtonRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
      // Minimal focus trap: this dialog has exactly one focusable element
      // (the OK button), so "trapping" Tab/Shift+Tab just means never
      // letting focus leave it — re-focus it on every Tab press rather than
      // building a full focusable-elements cycle that a single-control
      // dialog doesn't need. Would need revisiting if a future variant
      // ever adds a second control.
      if (e.key === 'Tab') {
        e.preventDefault()
        okButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
        className="w-full max-w-sm rounded-2xl bg-brand-ivory p-5 text-right shadow-xl"
      >
        <h2 id={`${id}-title`} className="mb-2 text-lg font-bold text-brand-blue">
          {title}
        </h2>
        <p id={`${id}-message`} className="mb-4 whitespace-pre-line text-base leading-relaxed text-brand-blue">
          {message}
        </p>
        <button
          ref={okButtonRef}
          onClick={onClose}
          className="w-full rounded-full bg-brand-blue py-2 text-base font-bold text-white"
        >
          موافق
        </button>
      </div>
    </div>
  )
}

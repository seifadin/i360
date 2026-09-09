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
  // Optional second button (2026-09-03) — needed for the website-
  // reachability check specifically: the check can have false negatives
  // (a temporary network blip, or a site that blocks automated requests
  // but works fine in a real browser), so fully blocking on one failed
  // check would be too aggressive. Fully backward-compatible — every
  // existing call site omits this and keeps its original single-button
  // behavior unchanged.
  secondaryAction?: { label: string; onClick: () => void }
  // Emphasizes the secondary action as the filled, primary-style button
  // (green, receives initial focus) instead of the usual "close" button
  // — used specifically for the website-reachability warning on web,
  // where the check is often unreliable (CORS-subject there, unlike
  // native), so "continue anyway" is frequently the correct choice
  // rather than a risky override. Every other call site omits this and
  // keeps its original styling/focus unchanged.
  emphasizeSecondary?: boolean
}

export default function Dialog({ open, title, message, onClose, secondaryAction, emphasizeSecondary = false }: DialogProps) {
  // useId() rather than a hardcoded string — Dialog is a single shared
  // component rendered from several independent call sites (privacy notice,
  // the queued Edition/Version/Revision dialogs, OSRow's version-info
  // dialog). A hardcoded id would collide with duplicate DOM ids if two
  // instances ever mounted at once; useId() gives each instance its own
  // stable, unique id.
  const id = useId()
  const okButtonRef = useRef<HTMLButtonElement>(null)
  const secondaryButtonRef = useRef<HTMLButtonElement>(null)

  // Hooks must run unconditionally before the early return below (Rules of
  // Hooks) — this effect itself no-ops via its own `if (!open) return`
  // whenever the dialog isn't actually showing.
  useEffect(() => {
    if (!open) return

    // Move focus into the dialog on open. Without this, whatever element
    // was focused before the dialog opened stays focused — meaning a
    // keyboard/screen-reader user could be left "on" page content that's
    // now visually hidden behind the overlay, with no indication a modal
    // appeared at all. Confirmed via real on-device diagnostic logging
    // (2026-08-29) that focus-SETTING itself was never actually broken —
    // it landed here correctly, immediately, on every dialog throughout.
    // That's a narrower claim than "the ring-visibility saga was nothing
    // real": a genuine, separate CSS bug (outline not following
    // border-radius) also existed and needed its own real fix — see the
    // button's own className comment below for that half of the story.
    okButtonRef.current?.focus()
    if (emphasizeSecondary && secondaryAction) {
      // Overrides the focus set immediately above — the emphasized
      // action is the one that should genuinely receive it, since it's
      // now the visually primary, filled button.
      secondaryButtonRef.current?.focus()
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
      // Focus trap: with no secondaryAction, this dialog has exactly one
      // focusable element (the OK button) — "trapping" Tab/Shift+Tab just
      // means never letting focus leave it. With secondaryAction present
      // (2026-09-03, the first real use of this), there are genuinely two
      // focusable elements — cycle between them instead of re-focusing the
      // same one every time.
      if (e.key === 'Tab') {
        e.preventDefault()
        if (!secondaryAction) {
          okButtonRef.current?.focus()
        } else if (document.activeElement === okButtonRef.current) {
          secondaryButtonRef.current?.focus()
        } else {
          okButtonRef.current?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, secondaryAction, emphasizeSecondary])

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
        {secondaryAction && (
          <button
            ref={secondaryButtonRef}
            onClick={secondaryAction.onClick}
            // Outlined by default — deliberately less prominent than the
            // primary button below. secondaryAction exists specifically
            // for a "proceed despite the warning" action, which shouldn't
            // visually compete with the safer, recommended dismiss action.
            // emphasizeSecondary swaps this: filled green becomes the
            // genuinely recommended choice in that specific case (see the
            // prop's own comment above) — a contrasting blue focus ring,
            // not the usual green, since a green ring on a green button
            // would be hard to see.
            className={
              emphasizeSecondary
                ? 'mb-2 w-full rounded-full bg-brand-green py-2 text-base font-bold text-white outline-none focus:ring-2 focus:ring-brand-blue'
                : 'mb-2 w-full rounded-full border-2 border-brand-blue py-2 text-base font-bold text-brand-blue outline-none focus:ring-2 focus:ring-brand-green'
            }
          >
            {secondaryAction.label}
          </button>
        )}
        <button
          ref={okButtonRef}
          onClick={onClose}
          // ring, not outline (2026-08-29 fix) — outline doesn't reliably
          // follow border-radius in every WebView implementation, and this
          // button uses rounded-full (a full pill shape). That produced a
          // visible gap specifically at the rounded ends regardless of
          // outline-offset value, confirmed via real screenshots — no
          // offset value was ever going to fix it, since the actual cause
          // was outline rendering as a squared bounding box, not spacing.
          // Tailwind's ring-* utilities use box-shadow instead, which
          // correctly clips to the element's own border-radius.
          //
          // emphasizeSecondary swaps this button to the outlined style
          // instead — see secondaryAction's own button above for the
          // full reasoning.
          className={
            emphasizeSecondary
              ? 'w-full rounded-full border-2 border-brand-blue py-2 text-base font-bold text-brand-blue outline-none focus:ring-2 focus:ring-brand-green'
              : 'w-full rounded-full bg-brand-blue py-2 text-base font-bold text-white outline-none focus:ring-2 focus:ring-brand-green'
          }
        >
          موافق
        </button>
      </div>
    </div>
  )
}

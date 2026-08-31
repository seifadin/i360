import { useLayoutEffect, useRef, useState } from 'react'
import OSRow from '@/components/OSRow'
import SearchBar from '@/components/SearchBar'
import ScienceGrid from '@/components/ScienceGrid'
import OrnamentDivider from '@/components/OrnamentDivider'

// Header sizing (2026-08-31) — genuinely content-aware, not width-threshold-
// based at all. Two earlier attempts both hardcoded a "screen width at
// which point X" number (clamp()'s vw ceiling, then a discrete step
// table's fixed 360px/410px marks) and both were real, confirmed
// miscalibrations — a threshold-based approach always needs a number to be
// right, and there's no way to know the right number without testing more
// devices one at a time, forever. This removes the guessing entirely:
// measure the header's own real, unconstrained rendered width, measure the
// real available space, and pick the largest standard Tailwind step that
// actually fits — the same technique regardless of device or font.
const HEADER_STEPS = [
  { text: 'text-2xl', icon: 'h-8 w-8', px: 24 }, // original fixed size — explicitly agreed not to exceed this even on very wide screens
  { text: 'text-xl', icon: 'h-7 w-7', px: 20 },
  { text: 'text-lg', icon: 'h-6 w-6', px: 18 },
  { text: 'text-base', icon: 'h-5 w-5', px: 16 },
  { text: 'text-sm', icon: 'h-4 w-4', px: 14 },
  { text: 'text-xs', icon: 'h-3.5 w-3.5', px: 12 }, // true floor of Tailwind's standard scale (2026-08-31) — stopping at text-sm was itself an unjustified arbitrary limit, the same class of mistake this whole investigation exists to remove
] as const

// Container's own horizontal padding (px-4 = 16px × 2 sides) — subtracted
// from viewport width to get the space actually available to the content
// itself, not the raw viewport.
const HEADER_CONTAINER_PADDING_PX = 32

const HEADER_TITLE = 'الموسوعة الإسلامية إi360'

// Tolerance for sub-pixel rounding and any tiny discrepancy between the
// hidden measurer and the real visible header — not a device-width guess,
// a measurement-imprecision buffer. Real, confirmed need (2026-08-31): a
// real device measured natural=328 available=328, a dead-even tie —
// exactly the kind of zero-margin result that can tip either way in
// actual rendering rather than the JS measurement alone. Genuinely
// different in kind from the earlier width-threshold mistakes: this isn't
// "guess where a screen boundary sits," it's "always leave a small,
// principled cushion around whatever the real measurement says."
const SAFETY_MARGIN_PX = 4

function pickHeaderStep(naturalWidthAtReference: number, availableWidth: number) {
  // naturalWidthAtReference is measured with the header at HEADER_STEPS[0]'s
  // size (text-2xl) — font-size scaling is linear (assuming no wrapping),
  // so the ideal size that would exactly fill availableWidth is a direct
  // ratio from that one reference measurement, no matter what the current
  // visible step happens to be.
  const referencePx = HEADER_STEPS[0].px
  const idealPx = referencePx * ((availableWidth - SAFETY_MARGIN_PX) / naturalWidthAtReference)
  return HEADER_STEPS.find(step => idealPx >= step.px) ?? HEADER_STEPS[HEADER_STEPS.length - 1]
}

// Math.min(innerWidth, innerHeight) — always the portrait-equivalent width
// regardless of current orientation, since rotating just swaps which
// dimension is which; the smaller one is always the portrait width by
// definition. Gives "compute from portrait width, never recalculate for
// landscape" as a direct consequence of the math, no separate orientation
// check needed.
function currentPortraitWidth() {
  return Math.min(window.innerWidth, window.innerHeight)
}

export default function Home() {
  // useState+useLayoutEffect here, unlike the rest of this file — genuinely
  // different situation from the dialogs' remount bugs elsewhere in this
  // project (§14), not an exception to that principle. Those broke because
  // a one-time flag got silently re-consumed or re-triggered on remount.
  // This is idempotent — recomputing "what size actually fits right now"
  // on every mount gives the same correct answer every time for an
  // unchanged device, and the one case a remount could legitimately
  // produce a different answer (the PWA's window was actually resized) is
  // exactly when recomputing is correct, not a bug.
  const [headerStep, setHeaderStep] = useState<(typeof HEADER_STEPS)[number]>(HEADER_STEPS[0])
  const measureRef = useRef<HTMLDivElement>(null)

  // useLayoutEffect, not useEffect — runs synchronously before the browser
  // paints, so even though headerStep's initial value is the largest step,
  // the user never actually sees that size flash before this corrects it.
  useLayoutEffect(() => {
    function recalculate() {
      if (!measureRef.current) return
      const naturalWidth = measureRef.current.scrollWidth
      const availableWidth = currentPortraitWidth() - HEADER_CONTAINER_PADDING_PX
      setHeaderStep(pickHeaderStep(naturalWidth, availableWidth))
    }

    recalculate()

    // Real double-measurement, not a single mount-time guess — the hidden
    // reference element below is measured once immediately (whatever font
    // is active at that moment), then again once Amiri has genuinely
    // settled. A real, measured test (Playwright + the actual Amiri font
    // file vs. a realistic fallback candidate) showed the fallback landing
    // wider than Amiri, not narrower — meaning a single early measurement
    // would likely be safe in practice — but that was one candidate on one
    // platform, not a guarantee across every real device's actual
    // fallback. This removes the need to trust that direction at all, at
    // the cost of one extra, usually-imperceptible step change right when
    // Amiri finishes loading.
    document.fonts.ready.then(recalculate)

    // Real resize handling too (PWA/desktop-browser window resize).
    window.addEventListener('resize', recalculate)
    return () => window.removeEventListener('resize', recalculate)
  }, [])

  return (
    <div className="flex flex-col h-dvh bg-brand-ivory pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Safe-area padding here, not on the header/OSRow individually —
          one place, applies uniformly top+bottom, and box-sizing:
          border-box (Tailwind preflight) means it's absorbed within
          h-dvh rather than pushing the layout taller than the viewport.
          bg-brand-ivory already on this element, so the inset itself
          reads as ivory, not a stray black/white bar. Real bug, real
          iPhone: native app rendered edge-to-edge under the status bar
          (Capacitor's native default); Safari tab and installed PWA were
          both already correct without this, since they reserve that
          space on their own — see index.html's viewport comment. */}

      {/* Hidden reference element, purely for measurement — always at the
          largest step (text-2xl/h-8), off-screen. Real DOM measurement,
          not canvas measureText(): canvas text measurement doesn't always
          precisely match real DOM rendering for complex script shaping,
          and this header's whole content is Arabic text specifically,
          where that gap could matter. position:absolute + a large
          negative offset (not display:none, which reports 0 for every
          dimension, useless for measurement) keeps it fully out of the
          visible layout and unreachable to keyboard/screen-reader users
          via aria-hidden. Real <img>, not a placeholder span (2026-08-31
          fix) — a real device measured natural===available exactly, a
          zero-margin tie; even a fixed-size placeholder isn't guaranteed
          to render byte-identically to the real image element it stands
          in for, and at zero margin that small a gap can matter. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="absolute -top-[9999px] -left-[9999px] flex items-center gap-2 text-2xl font-bold whitespace-nowrap pointer-events-none"
      >
        <span>&#xFD3F;</span>
        <img src="/assets/logo-512.png" alt="" className="h-8 w-8 object-contain" />
        <span>{HEADER_TITLE}</span>
        <span>&#xFD3E;</span>
      </div>

      {/* App header — framed by classical ornate Arabic parentheses
          (U+FD3F / U+FD3E), not the earlier hand-drawn star flanking —
          those are removed. DOM order for RTL (first = rightmost):
          FD3F, icon, title, FD3E → visual right-to-left: FD3F icon title FD3E
          Sizing driven by headerStep (see HEADER_STEPS above), not fixed
          classes — applies to all four elements identically, so the whole
          header stays proportional together at every step. */}
      <div className="flex items-center justify-center gap-2 bg-brand-ivory px-4 py-3 shadow-sm shrink-0">
        <span className={`${headerStep.text} font-bold text-brand-blue`} aria-hidden="true">&#xFD3F;</span>
        <img
          src="/assets/logo-512.png"
          alt="i360إ"
          className={`${headerStep.icon} object-contain shrink-0`}
        />
        <span className={`${headerStep.text} font-bold text-brand-blue`}>
          {HEADER_TITLE}
        </span>
        <span className={`${headerStep.text} font-bold text-brand-blue`} aria-hidden="true">&#xFD3E;</span>
      </div>

      {/* TEMPORARY DIAGNOSTIC (2026-08-31, round 3) — remove once
          confirmed the safety margin + real-img measurer fix resolves the
          zero-margin tie (natural=328 available=328) seen on the test
          device. */}
      <div className="text-center text-xs text-gray-400" dir="ltr">
        {measureRef.current
          ? `natural=${measureRef.current.scrollWidth} available=${currentPortraitWidth() - HEADER_CONTAINER_PADDING_PX} → ${headerStep.text}`
          : ''}
      </div>

      <OrnamentDivider />

      {/* Science accordion — scrollable. Normal flex flow — search bar +
          OSRow are ordinary siblings below, so this simply ends where they
          begin. No measured/guessed padding needed, unlike the reverted
          fixed-positioning attempt. */}
      <main className="flex-1 overflow-y-auto">
        <ScienceGrid />
      </main>

      {/* Search bar + OSRow — ordinary flex document flow, not fixed. The
          original OS_WebToggle tooltip-overflow bug is already fixed at
          its actual root cause (ToggleItem's tooltipAlign prop), so the
          extra robustness fixed positioning offered wasn't actually needed
          — and it cost several rounds of real debugging pain for content
          being hidden underneath it. Reverted in favor of the simpler,
          overlap-proof-by-construction normal flow. */}
      <OrnamentDivider />
      <div className="shrink-0 bg-brand-ivory">
        <SearchBar />
      </div>
      <OSRow />

    </div>
  )
}

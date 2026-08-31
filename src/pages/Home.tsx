import { useEffect, useState } from 'react'
import OSRow from '@/components/OSRow'
import SearchBar from '@/components/SearchBar'
import ScienceGrid from '@/components/ScienceGrid'
import OrnamentDivider from '@/components/OrnamentDivider'

// Header sizing steps (2026-08-31) — replaces an earlier clamp()-based
// attempt entirely, not a refinement of it. clamp()/vw measures CSS
// viewport width, which isn't the same thing as physical screen size
// (modern phones cluster in a 360-430px CSS-width range regardless of
// physical size — what varies is pixel density, not CSS width) — a real
// miscalibration bug from that approach, caught and corrected once
// already, then replaced outright with this: real device width, snapped
// down to the nearest standard Tailwind step, rather than a continuous
// formula with hardcoded thresholds either way.
//
// Only real gap a width-only approach could have — measuring live
// content instead — was deliberately not pursued: that would need
// ResizeObserver measuring actual rendered text width, which depends on
// which font is currently active (fallback vs Amiri), reopening the
// exact font-swap timing risk this project's own privacy-dialog
// investigation spent several real rounds fighting through. Device width
// has nothing to do with fonts at all, so this approach was never
// exposed to that risk in the first place — not a workaround, a
// genuinely different technique.
//
// Sorted descending by minWidth — HEADER_SIZE_STEPS.find() returns the
// first (largest) step whose threshold the actual width still clears,
// giving "round down to nearest fitting step" semantics directly.
const HEADER_SIZE_STEPS = [
  { minWidth: 410, text: 'text-2xl', icon: 'h-8 w-8' }, // original fixed size
  { minWidth: 360, text: 'text-xl', icon: 'h-7 w-7' },
  { minWidth: 0, text: 'text-lg', icon: 'h-6 w-6' },
] as const

function pickHeaderSize(portraitWidth: number) {
  return (
    HEADER_SIZE_STEPS.find(step => portraitWidth >= step.minWidth) ??
    HEADER_SIZE_STEPS[HEADER_SIZE_STEPS.length - 1]
  )
}

// Math.min(innerWidth, innerHeight), not an explicit orientation check —
// rotating a device swaps which dimension is which, but the smaller one
// is always the portrait-equivalent width by definition. Naturally gives
// "compute from portrait width, never recalculate for landscape" as a
// direct consequence of the math, with no separate orientation-tracking
// logic needed at all.
function currentPortraitWidth() {
  return Math.min(window.innerWidth, window.innerHeight)
}

export default function Home() {
  // useState+useEffect here, unlike the rest of this file — genuinely
  // different situation from the dialogs' remount bugs elsewhere in this
  // project (§14), not an exception to that principle. Those broke
  // because a one-time flag got silently re-consumed or re-triggered on
  // remount. This is idempotent — recomputing "what's the device's
  // current portrait width" on every mount gives the same, correct answer
  // every time for an unchanged device, and the one case where a remount
  // COULD legitimately produce a different answer (the PWA's browser
  // window was actually resized) is exactly when recomputing is the
  // correct behavior, not a bug.
  const [headerSize, setHeaderSize] = useState(() => pickHeaderSize(currentPortraitWidth()))

  useEffect(() => {
    // Real listener, not just the initial useState computation — mainly
    // for the PWA/desktop-browser case, where the window can genuinely be
    // resized mid-session. Rarely if ever fires meaningfully on a real
    // mobile device, but costs nothing to have correct there too.
    function handleResize() {
      setHeaderSize(pickHeaderSize(currentPortraitWidth()))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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

      {/* App header — framed by classical ornate Arabic parentheses
          (U+FD3F / U+FD3E), not the earlier hand-drawn star flanking —
          those are removed. DOM order for RTL (first = rightmost):
          FD3F, icon, title, FD3E → visual right-to-left: FD3F icon title FD3E
          Sizing driven by headerSize (see HEADER_SIZE_STEPS above), not
          fixed classes — applies to all four elements identically, so
          the whole header stays proportional together at every step. */}
      <div className="flex items-center justify-center gap-2 bg-brand-ivory px-4 py-3 shadow-sm shrink-0">
        <span className={`${headerSize.text} font-bold text-brand-blue`} aria-hidden="true">&#xFD3F;</span>
        <img
          src="/assets/logo-512.png"
          alt="i360إ"
          className={`${headerSize.icon} object-contain shrink-0`}
        />
        <span className={`${headerSize.text} font-bold text-brand-blue`}>
          الموسوعة الإسلامية إi360
        </span>
        <span className={`${headerSize.text} font-bold text-brand-blue`} aria-hidden="true">&#xFD3E;</span>
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

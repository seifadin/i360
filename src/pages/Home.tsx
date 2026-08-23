import OSRow from '@/components/OSRow'
import SearchBar from '@/components/SearchBar'
import ScienceGrid from '@/components/ScienceGrid'
import OrnamentDivider from '@/components/OrnamentDivider'

export default function Home() {
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
          FD3F, icon, title, FD3E → visual right-to-left: FD3F icon title FD3E */}
      <div className="flex items-center justify-center gap-2 bg-brand-ivory px-4 py-3 shadow-sm shrink-0">
        <span className="text-2xl font-bold text-brand-blue" aria-hidden="true">&#xFD3F;</span>
        <img
          src="/assets/logo-512.png"
          alt="i360إ"
          className="h-8 w-8 object-contain"
        />
        <span className="text-2xl font-bold text-brand-blue">
          الموسوعة الإسلامية إi360
        </span>
        <span className="text-2xl font-bold text-brand-blue" aria-hidden="true">&#xFD3E;</span>
      </div>

      <OrnamentDivider />

      {/* Science accordion — scrollable. Normal flex flow — search bar +
          OSRow are ordinary siblings below, so this simply ends where they
          begin. No measured/guessed padding needed, unlike the reverted
          fixed-positioning attempt. */}
      <div className="flex-1 overflow-y-auto">
        <ScienceGrid />
      </div>

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

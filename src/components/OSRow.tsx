import { useEffect, useState, CSSProperties } from 'react'
import { EllipsisVertical, Globe } from 'lucide-react'
import { OtaKit } from '@otakit/capacitor-updater'
import { useAppState } from '@/store/appState'
import { useDataCache } from '@/store/dataCache'
import { detectOS, isDesktop, resolveEffectiveOS } from '@/hooks/usePlatform'
import { AndroidIcon, AppleIcon, GoogleIcon, HuaweiIcon } from './BrandIcons'
import Dialog from './Dialog'

// Fallback only — the VersionMenu dialog prefers the live Baserow `Version`
// field (i360dbc), so a Baserow version bump shows up without a code change.
// Kept short and clearly placeholder-looking ("إصدار -") rather than a fake
// full version string, so a cold-start-before-data-loads moment doesn't
// look like a real, specific version number.
// Not exported (2026-08-25 review) — both were exported but never actually
// imported anywhere else in src/; the export implied a dependency that
// doesn't exist. Genuinely file-local, kept as named constants rather than
// inlined for the same self-documenting reason they were named in the
// first place.
const AppVersionFallback = 'إصدار -'
const AppDeveloper = '© 2013 سيف الدين س. إبراهيم'

// Layout order confirmed: OS_WebToggle (leftmost) → MobileServicesToggle → VersionMenu (rightmost)
// RTL rule used throughout this project: first item in HTML = rightmost visually,
// last item in HTML = leftmost visually. So HTML order here is:
// VersionMenu, MobileServicesToggle, OS_WebToggle.
//
// OS_WebToggle: switch + label, always visible, always interactive (all platforms).
// MobileServicesToggle: visible only when useWeb === false.

function ToggleItem({
  active,
  icon,
  ariaLabel,
  onToggle,
  tooltipAlign = 'center',
  triPosition,
}: {
  // active drives the binary switch's on/off color — meaningless (and
  // unused) in tri mode, hence optional.
  active?: boolean
  icon: React.ReactNode
  ariaLabel: string
  onToggle: () => void
  tooltipAlign?: 'center' | 'left'
  // When defined, renders a THREE-position track instead of the binary
  // switch — same h-5 w-9 footprint and knob, three stops instead of two
  // (deliberate visual siblinghood with OS_WebToggle beside it). Physical
  // knob stops follow RTL first-is-right: 0=right (Google), 1=center
  // (Huawei), 2=left (Apple); each tap advances the cycle, so the knob
  // slides leftward and wraps. Track stays brand-green — a target is
  // always selected; gray would read as disabled. Replaces the earlier
  // icon-only cycle button (showSwitch=false), which gave no clickable
  // affordance and no position feedback. Generalized here rather than
  // duplicated as a sibling — the tooltip-flash machinery is identical
  // either way (§12 rule 12).
  triPosition?: 0 | 1 | 2
}) {
  // Mobile has no real :hover — tapping already toggles the switch, so the
  // same tap also briefly reveals the tooltip as confirmation of what was
  // just switched to. Desktop keeps the existing pure-CSS hover, unaffected.
  const [showTooltip, setShowTooltip] = useState(false)

  function handleToggle() {
    onToggle()
    setShowTooltip(true)
    setTimeout(() => setShowTooltip(false), 1500)
  }

  // Knob stop for tri mode: track w-9 (36px), knob w-4 (16px), 2px inset →
  // center stop = (36-16)/2 = 10px. transition-all animates the slide,
  // same as the binary knob.
  const knobStyle: CSSProperties =
    triPosition === undefined
      ? ({ [active ? 'left' : 'right']: '2px' } as CSSProperties)
      : triPosition === 0 ? { right: '2px' }
      : triPosition === 1 ? { left: '10px' }
      : { left: '2px' }

  // Toggle switch (rightmost within this item) + icon to its left
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleToggle}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          triPosition !== undefined || active ? 'bg-brand-green' : 'bg-brand-disabled'
        }`}
        aria-pressed={triPosition === undefined ? active : undefined}
        // Real Lighthouse finding (2026-08-25): this button had no
        // accessible name at all — no visible text, and the label lives
        // on the separate sibling icon below, not referenced by this
        // element. A screen reader announced only "button, pressed" with
        // no indication of what it toggles. Reusing the same ariaLabel
        // already passed in for the icon closes this correctly, since
        // it's already the accurate, current-state-aware label.
        aria-label={ariaLabel}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
          style={knobStyle}
        />
      </button>
      {/* Icon + tooltip: the floating note shows on hover (desktop pointer)
          OR briefly after a tap (mobile, via showTooltip). Positioned above
          the icon since OSRow sits at the bottom of the screen — a tooltip
          below would risk running off-screen. tooltipAlign='left' anchors
          the tooltip's left edge to the icon (extending rightward, inward
          from the screen edge) instead of the default symmetric centering —
          needed for OS_WebToggle specifically, the bar's leftmost item,
          where a centered tooltip's left half could extend past the
          physical viewport edge and trigger horizontal scroll (real bug
          found on a real desktop browser).
          Both spans below are aria-hidden now that the switch button itself
          carries the accessible name (aria-label above) — avoids a screen
          reader hearing the same label announced two or three times in a
          row. The tooltip specifically: opacity:0 (unlike display:none)
          does NOT remove an element from the accessibility tree, so its
          text was being exposed to screen readers regardless of visibility
          — a second redundant-text source found on closer review, on top
          of the icon span. Both are inherently sighted-user-only
          interaction patterns (something that appears near where you just
          looked or tapped) with zero benefit to a screen reader either way. */}
      <span className="group relative flex items-center">
        <span className="text-brand-blue" aria-hidden="true">
          {icon}
        </span>
        <span aria-hidden="true" className={`pointer-events-none absolute -top-7 whitespace-nowrap rounded border border-gray-200 bg-brand-ivory px-2 py-1 text-base text-brand-blue shadow-md transition-opacity group-hover:opacity-100 ${
          tooltipAlign === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2'
        } ${
          showTooltip ? 'opacity-100' : 'opacity-0'
        }`}>
          {ariaLabel}
        </span>
      </span>
    </div>
  )
}

export default function OSRow() {
  const { state, setState } = useAppState()
  const { resource } = useDataCache()
  const [versionOpen, setVersionOpen] = useState(false)

  // OTA bundle identifier (2026-08-29) — shown as a permanent, smaller
  // third line in the version dialog below, distinct from the Baserow
  // Version above it: that reflects content, this reflects which OTA
  // bundle is actually running (useful precisely because they can differ
  // — the original motivation was a real bug where confirming "is the fix
  // actually live" needed a full clear-data-and-repro cycle each time).
  // Fetched once here, not lazily on dialog open — getState() reads
  // already-known local plugin state, no network call, so it's cheap
  // enough to have ready before the user ever taps to open the dialog.
  // Shown verbatim, not reformatted — OtaKit's own CLI calls this an
  // "auto-generated version," meaning the exact otk.<hash>.<timestamp>
  // shape is a default, not a permanently guaranteed format; displaying
  // whatever it reports avoids any risk of parsing logic breaking later
  // if that shape ever changes. Implemented on the web fallback too
  // (confirmed in OtaKitWeb), so this is safe to call regardless of
  // platform — resolves to a sensible built-in default there.
  const [otaVersion, setOtaVersion] = useState<string | null>(null)
  useEffect(() => {
    OtaKit.getState().then(s => setOtaVersion(s.current.version)).catch(() => {})
  }, [])

  const appVersion = resource?.Version || AppVersionFallback

  // Effective OS drives the leftmost icon. Real android/ios devices:
  // unaffected by useWeb/simIOS. Desktop + !useWeb: simulated per the
  // cycle below ('android' or 'ios' via simIOS).
  const effectiveOS = resolveEffectiveOS(state.useWeb, state.simIOS)
  const osIcon = state.useWeb
    ? <Globe size={18} />
    : effectiveOS === 'ios' ? <AppleIcon /> : <AndroidIcon />
  const osAriaLabel = state.useWeb ? 'ويب' : effectiveOS === 'ios' ? 'آبل' : 'أندرويد'

  // Middle slot, two distinct controls (never both):
  //
  // Real Android device — the original binary Google/Huawei switch,
  // byte-identical behavior to before the simulator cycle existed. Real
  // iOS still shows nothing (exactly one store, no choice to make).
  const realOS = detectOS()
  const showBinaryServicesToggle = !state.useWeb && realOS === 'android'
  const hmsIcon = state.useHMS ? <HuaweiIcon /> : <GoogleIcon />
  const hmsAriaLabel = state.useHMS ? 'هواوي' : 'جوجل'

  // Desktop simulator — a three-way cycle: Google → Huawei → Apple → …
  // (first tap matches the old binary toggle's Google→Huawei exactly; Apple
  // is the new third stop). Each state is an explicit PAIR write so no
  // stale flag survives a transition — cycling into Apple clears useHMS,
  // otherwise Huawei bot/search variants would silently leak into the
  // Apple simulation (the same stale-flag class computeUseHuawei's !useWeb
  // gate was added for). Deliberate nuance left as-is: a desktop with
  // isChina simulating Apple still gets Huawei search/bot — matching what
  // a real Chinese iPhone does (Apple store links + Huawei services).
  const isSimulating = isDesktop() && !state.useWeb
  const simIcon = state.simIOS ? <AppleIcon /> : state.useHMS ? <HuaweiIcon /> : <GoogleIcon />
  const simAriaLabel = state.simIOS ? 'آبل' : state.useHMS ? 'هواوي' : 'جوجل'
  // Knob stop mirrors the cycle order, RTL first-is-right: Google=0
  // (right), Huawei=1 (center), Apple=2 (left) — each tap slides the knob
  // one stop leftward, wrapping back to the right.
  const simPosition: 0 | 1 | 2 = state.simIOS ? 2 : state.useHMS ? 1 : 0
  function cycleSimTarget() {
    if (!state.simIOS && !state.useHMS) setState({ useHMS: true, simIOS: false }) // Google → Huawei
    else if (!state.simIOS && state.useHMS) setState({ useHMS: false, simIOS: true }) // Huawei → Apple
    else setState({ useHMS: false, simIOS: false }) // Apple → Google
  }

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-1.5 border-b border-gray-100 ${
      isSimulating ? 'bg-brand-highlight' : 'bg-brand-ivory'
    }`}>

      {/* VersionMenu — rightmost (first in HTML for RTL) */}
      <button
        onClick={() => setVersionOpen(true)}
        className="text-brand-blue"
        aria-label="معلومات الإصدار"
      >
        <EllipsisVertical size={18} />
      </button>

      {/* Middle — real Android: the original binary Google/Huawei switch */}
      {showBinaryServicesToggle && (
        <ToggleItem
          active={state.useHMS}
          icon={hmsIcon}
          ariaLabel={hmsAriaLabel}
          onToggle={() => setState({ useHMS: !state.useHMS })}
        />
      )}

      {/* Middle — desktop simulator: three-way store-target cycle rendered
          as a THREE-position switch (same footprint/knob as the binary
          toggle beside it — deliberate visual siblinghood, and the track
          itself signals clickability the earlier icon-only design lacked).
          Simulator-blue bar stays on throughout (isSimulating above),
          keeping the simulation visually honest regardless of target. */}
      {isSimulating && (
        <ToggleItem
          icon={simIcon}
          ariaLabel={simAriaLabel}
          onToggle={cycleSimTarget}
          triPosition={simPosition}
        />
      )}

      {/* OS_WebToggle — leftmost (last in HTML for RTL) — switch + icon, always visible.
          tooltipAlign="left": this is always the bar's leftmost item, so its
          tooltip anchors from its own left edge rather than centering
          symmetrically — see ToggleItem's comment for why. */}
      <ToggleItem
        active={state.useWeb}
        icon={osIcon}
        ariaLabel={osAriaLabel}
        onToggle={() => setState({ useWeb: !state.useWeb })}
        tooltipAlign="left"
      />

      <Dialog
        open={versionOpen}
        title="معلومات التطبيق"
        message={
          <>
            {appVersion}
            {'\n'}
            {AppDeveloper}
            {otaVersion && (
              <>
                {'\n'}
                {/* dir="ltr" — this is a technical, Latin-script string
                    (version, hash, timestamp) embedded in an RTL dialog;
                    explicit direction avoids relying on the bidi
                    algorithm's own default handling for mixed content. */}
                <span dir="ltr" className="text-xs">({otaVersion})</span>
              </>
            )}
          </>
        }
        onClose={() => setVersionOpen(false)}
      />
    </div>
  )
}

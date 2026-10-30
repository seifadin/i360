import { useCallback, useEffect, useState, CSSProperties } from 'react'
import { Coffee, EllipsisVertical, Globe, Monitor, Moon, Sun } from 'lucide-react'
import type { Numerals, ThemeChoice } from '@i360/theme-loader'
import { getOtaBuild } from '@/lib/feedbackReport'
import { i360Theme } from '@/lib/theme'
import { useAppState } from '@/store/appState'
import { useDataCache } from '@/store/dataCache'
import { detectOS, isDesktop, resolveEffectiveOS } from '@/hooks/usePlatform'
import { AndroidIcon, AppleIcon, GoogleIcon, HuaweiIcon } from './BrandIcons'
import Dialog from './Dialog'

const TOOLTIP_MS = 1500 // how long a toggle's tooltip stays up

// Fallback only — VersionMenu prefers the live Baserow `Version` field (i360dbc).
// Deliberately placeholder-looking ("إصدار -"), so the moment before data loads
// doesn't look like a real version number.
const AppVersionFallback = 'إصدار -'
const AppDeveloper = '© 2013 سيف الدين س. إبراهيم'

// Layout order: OS_WebToggle (leftmost) → MobileServicesToggle → [NumeralsButton,
// ThemeButton, VersionMenu] (rightmost group)
// RTL rule used throughout this project: first item in HTML = rightmost visually,
// last item in HTML = leftmost visually. So HTML order here is:
// VersionMenu, ThemeButton, NumeralsButton, MobileServicesToggle, OS_WebToggle.
// The theme/numerals pair keeps the order of every i360 page (theme to the right
// of numerals, claude/i360-hub.md §10 "Toolbars") and the hub's Arabic labels and icons.

// The shared theme's two buttons (2026-10-21, §15t) — the same choices, labels
// and icons as the hub pages (claude/i360-hub.md §3), stored per site, so the
// app and its merged pages share them. Their text (the numerals sample and both
// tooltips) comes from the shared theme loader, like the hub pages'.
// A bigger tap area for the bar's small buttons, not drawn: the button fills the row's
// height (self-stretch, its icon or digits still centred) and an empty ::after reaches
// through the row's padding (py-1.5) and halfway into the gap beside it (gap-3), so it
// spans the whole bar (min-h-toolbar, the shared toolbar height).
// The icon buttons (ICON_BTN) are w-5 wide, so with that reach their tap area is 2rem
// wide: the hub pages' toolbar buttons' width (hub/src/page-chrome.css).
const TAP_AREA = "relative self-stretch after:absolute after:-inset-y-1.5 after:-inset-x-1.5 after:content-['']"
const ICON_BTN = `w-5 flex items-center justify-center ${TAP_AREA}`

const THEME_ICON: Record<ThemeChoice, typeof Monitor> = { system: Monitor, light: Sun, sepia: Coffee, dark: Moon }

// The current choices, kept in step with changes made here, in another tab, or by the device.
function useSharedChoices() {
  const [choice, setChoice] = useState<ThemeChoice>(i360Theme.getChoice)
  const [numerals, setNumerals] = useState<Numerals>(i360Theme.getNumerals)
  useEffect(() => {
    const stopTheme = i360Theme.onChange((s) => setChoice(s.choice))
    const stopNumerals = i360Theme.onNumeralsChange((s) => setNumerals(s.numerals))
    return () => { stopTheme(); stopNumerals() }
  }, [])
  return { choice, numerals }
}
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
    setTimeout(() => setShowTooltip(false), TOOLTIP_MS)
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
        // The label lives on the sibling icon, so the button needs its own accessible
        // name — the same ariaLabel (§14e).
        aria-label={ariaLabel}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-brand-on-accent transition-all"
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
        <span aria-hidden="true" className={`pointer-events-none absolute -top-7 whitespace-nowrap rounded border border-brand-border bg-brand-ivory px-2 py-1 text-base text-brand-blue shadow-md transition-opacity group-hover:opacity-100 ${
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
  const { choice, numerals } = useSharedChoices()
  const ThemeIcon = THEME_ICON[choice]

  // Stable (useCallback), so Dialog's focus/keydown effect isn't rebuilt on every
  // OSRow render while the dialog is open — same as App.tsx's dialogs.
  const handleVersionClose = useCallback(() => {
    setVersionOpen(false)
  }, [])

  // One source for the OTA build (feedbackReport.ts — read once at startup).
  // Read at render: opening the About dialog re-renders, so it's current.
  const otaVersion = getOtaBuild()

  // In Arabic-Indic and Persian numerals the zero (٠ / ۰) looks like a dot, so
  // "0.13.2" would read as "٠٠١٣٠٢": between digits, "." becomes the Arabic
  // separator "٫" (§15t). The digits themselves are converted app-wide (lib/theme.ts).
  const versionDots = (text: string) => text.replace(/(\d)\.(?=\d)/g, numerals === 'western' ? '$1.' : '$1٫')
  const appVersion = versionDots(resource?.Version || AppVersionFallback)

  // The OTA build line stays a code (its commit and time stay as they are), but
  // the app version inside it is shown like the line above: on phones it reads
  // "0.13.2+otk.<commit>.<time>", on web just "0.13.2". Only that exact version
  // (this build's own, __APP_VERSION__) is converted, wherever it sits; if it
  // isn't found, the line simply shows unchanged.
  const otaDisplay = otaVersion?.replace(__APP_VERSION__, () =>
    i360Theme.toNumerals(versionDots(__APP_VERSION__), numerals))

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
    <div className={`flex items-center justify-between gap-3 px-4 py-1.5 min-h-toolbar border-b border-brand-border ${
      isSimulating ? 'bg-brand-highlight' : 'bg-brand-ivory'
    }`}>

      {/* Right group: VersionMenu — rightmost (first in HTML for RTL) — then
          the shared theme's theme and numerals buttons, the order of every i360
          page (§15t; i360-hub.md §10 "Toolbars"). Both buttons'
          labels show digits on purpose, so they're kept as written
          (data-i360-digits="keep", lib/theme.ts). All three get a
          bigger tap area, not drawn (TAP_AREA). */}
      <div className="flex items-center gap-3 self-stretch">
        <button
          onClick={() => setVersionOpen(true)}
          className={`text-brand-blue ${ICON_BTN}`}
          aria-label="معلومات الإصدار"
        >
          <EllipsisVertical size={18} />
        </button>
        <button
          onClick={() => { i360Theme.cycle() }}
          className={`text-brand-blue ${ICON_BTN}`}
          aria-label={i360Theme.themeLabel(choice)}
          title={i360Theme.themeLabel(choice)}
        >
          <ThemeIcon size={18} />
        </button>
        <button
          onClick={() => { i360Theme.cycleNumerals() }}
          className={`min-w-[2.25rem] text-base font-bold leading-none text-brand-blue ${TAP_AREA}`}
          aria-label={i360Theme.numeralsLabel(numerals)}
          title={i360Theme.numeralsLabel(numerals)}
          data-i360-digits="keep"
        >
          {i360Theme.NUMERALS_SAMPLE[numerals]}
        </button>
      </div>

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
                <span dir="ltr" className="text-xs" data-i360-digits="keep">({otaDisplay})</span>
              </>
            )}
          </>
        }
        onClose={handleVersionClose}
      />
    </div>
  )
}

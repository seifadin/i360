import { useState, CSSProperties } from 'react'
import { EllipsisVertical, Globe } from 'lucide-react'
import { useAppState } from '@/store/appState'
import { isDesktop, resolveEffectiveOS } from '@/hooks/usePlatform'
import { AndroidIcon, AppleIcon, GoogleIcon, HuaweiIcon } from './BrandIcons'
import Dialog from './Dialog'

// AppVersion / AppDeveloper — constants, defined once, used app-wide (VersionMenu dialog).
// Deliberately hardcoded, NOT sourced from Baserow's Version field — that was tried
// (housekeeping round) and reverted: the field's format isn't a display-ready string.
export const AppVersion = 'إصدار 0.13.0 @ 2026/07/01 م - 1448/01/16 هـ'
export const AppDeveloper = '© 2013 سيف الدين س. إبراهيم'

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
}: {
  active: boolean
  icon: React.ReactNode
  ariaLabel: string
  onToggle: () => void
  tooltipAlign?: 'center' | 'left'
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

  // Toggle switch (rightmost within this item) + icon to its left
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleToggle}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          active ? 'bg-brand-green' : 'bg-brand-disabled'
        }`}
        aria-pressed={active}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
          style={{ [active ? 'left' : 'right']: '2px' } as CSSProperties}
        />
      </button>
      {/* Icon + tooltip: aria-label covers screen readers; the floating note
          shows on hover (desktop pointer) OR briefly after a tap (mobile,
          via showTooltip). Positioned above the icon since OSRow sits at the
          bottom of the screen — a tooltip below would risk running off-screen.
          tooltipAlign='left' anchors the tooltip's left edge to the icon
          (extending rightward, inward from the screen edge) instead of the
          default symmetric centering — needed for OS_WebToggle specifically,
          the bar's leftmost item, where a centered tooltip's left half could
          extend past the physical viewport edge and trigger horizontal
          scroll (real bug found on a real desktop browser). */}
      <span className="group relative flex items-center">
        <span className="text-brand-blue" role="img" aria-label={ariaLabel}>
          {icon}
        </span>
        <span className={`pointer-events-none absolute -top-7 whitespace-nowrap rounded border border-gray-200 bg-brand-ivory px-2 py-1 text-base text-brand-blue shadow-md transition-opacity group-hover:opacity-100 ${
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
  const [versionOpen, setVersionOpen] = useState(false)

  // Effective OS drives both the icon and MobileServicesToggle's visibility.
  // Real android/ios devices: unaffected by useWeb. Desktop + !useWeb:
  // simulated as 'android' (see resolveEffectiveOS) — there's no "simulate
  // iOS" option, since the whole point is previewing Google/Huawei links.
  const effectiveOS = resolveEffectiveOS(state.useWeb)
  const osIcon = state.useWeb
    ? <Globe size={18} />
    : effectiveOS === 'ios' ? <AppleIcon /> : <AndroidIcon />
  const osAriaLabel = state.useWeb ? 'ويب' : effectiveOS === 'ios' ? 'آبل' : 'أندرويد'

  const hmsIcon = state.useHMS ? <HuaweiIcon /> : <GoogleIcon />
  const hmsAriaLabel = state.useHMS ? 'هواوي' : 'جوجل'

  // MobileServicesToggle only ever applies to Android — iOS has exactly one
  // store (AppleAppStore), so there's no Google/Huawei choice to show there.
  const showMobileServicesToggle = !state.useWeb && effectiveOS === 'android'

  // Desktop simulating mobile (native mode previewed without a real device)
  // — flagged with a light-blue bar so it reads as a simulation, not reality.
  const isSimulating = isDesktop() && !state.useWeb

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

      {/* MobileServicesToggle — middle — visible only for Android (real or
          desktop-simulated). Never shown for iOS, which has no Google/Huawei
          choice. Real Android: reflects genuine detection by default, still
          manually overridable. Desktop: acts as a simulator (see isSimulating). */}
      {showMobileServicesToggle && (
        <ToggleItem
          active={state.useHMS}
          icon={hmsIcon}
          ariaLabel={hmsAriaLabel}
          onToggle={() => setState({ useHMS: !state.useHMS })}
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
        message={`${AppVersion}\n${AppDeveloper}`}
        onClose={() => setVersionOpen(false)}
      />
    </div>
  )
}

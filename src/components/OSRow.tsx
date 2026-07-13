import { useState, CSSProperties } from 'react'
import { EllipsisVertical } from 'lucide-react'
import { useAppState } from '@/store/appState'
import { isDesktop, resolveEffectiveOS } from '@/hooks/usePlatform'
import Dialog from './Dialog'

// AppVersion / AppDeveloper — constants, defined once, used app-wide (VersionMenu dialog)
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
  label,
  onToggle,
  labelOnly = false,
}: {
  active: boolean
  label: string
  onToggle: () => void
  labelOnly?: boolean
}) {
  // Toggle switch (rightmost within this item) + label to its left
  return (
    <div className="flex items-center gap-1.5">
      {!labelOnly && (
        <button
          onClick={onToggle}
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
      )}
      <span className="text-sm text-brand-blue">
        {label}
      </span>
    </div>
  )
}

export default function OSRow() {
  const { state, setState } = useAppState()
  const [versionOpen, setVersionOpen] = useState(false)

  // Effective OS drives both the label and MobileServicesToggle's visibility.
  // Real android/ios devices: unaffected by useWeb. Desktop + !useWeb:
  // simulated as 'android' (see resolveEffectiveOS) — there's no "simulate
  // iOS" option, since the whole point is previewing Google/Huawei links.
  const effectiveOS = resolveEffectiveOS(state.useWeb)
  const osLabel = state.useWeb ? 'web' : effectiveOS

  const hmsLabel = state.useHMS ? 'Huawei' : 'Google'

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
          label={hmsLabel}
          onToggle={() => setState({ useHMS: !state.useHMS })}
        />
      )}

      {/* OS_WebToggle — leftmost (last in HTML for RTL) — switch + label, always visible */}
      <ToggleItem
        active={state.useWeb}
        label={osLabel}
        onToggle={() => setState({ useWeb: !state.useWeb })}
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

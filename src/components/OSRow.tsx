import { useState, CSSProperties } from 'react'
import { EllipsisVertical } from 'lucide-react'
import { useAppState } from '@/store/appState'
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
          className="relative h-5 w-9 shrink-0 rounded-full transition-colors"
          style={{ backgroundColor: active ? '#1A5C38' : '#CBD5E1' }}
          aria-pressed={active}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
            style={{ [active ? 'left' : 'right']: '2px' } as CSSProperties}
          />
        </button>
      )}
      <span className="text-xs" style={{ color: '#0010CF' }}>
        {label}
      </span>
    </div>
  )
}

export default function OSRow() {
  const { state, setState } = useAppState()
  const [versionOpen, setVersionOpen] = useState(false)

  const osLabel = state.useWeb ? 'web' : navigator.userAgent.toLowerCase().includes('android')
    ? 'android'
    : navigator.userAgent.toLowerCase().includes('iphone') || navigator.userAgent.toLowerCase().includes('ipad')
      ? 'ios'
      : 'web'

  const hmsLabel = state.useHMS ? 'Huawei' : 'Google'

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-1.5 bg-white border-b border-gray-100">

      {/* VersionMenu — rightmost (first in HTML for RTL) */}
      <button
        onClick={() => setVersionOpen(true)}
        style={{ color: '#0010CF' }}
        aria-label="معلومات الإصدار"
      >
        <EllipsisVertical size={18} />
      </button>

      {/* MobileServicesToggle — middle — visible only when useWeb is false */}
      {!state.useWeb && (
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

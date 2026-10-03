import { useMemo, useRef, useState, Fragment, lazy, Suspense, ComponentType, ReactNode } from 'react'
import { LoaderCircle, Paperclip, CircleCheck, CircleSlash, ChevronDown, ChevronLeft } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useAppState } from '@/store/appState'
import { useDataCache, LOAD_ERROR } from '@/store/dataCache'
import { Science } from '@/api/dataSource'
import { computeIsGMSorApple, computeUseHuawei, resolveEffectiveOS } from '@/hooks/usePlatform'
import { groupSciences } from '@/lib/groupSciences'
import { checkPageReachable } from '@/lib/reachability'
import { openResource } from '@/lib/openResource'
import { loadIcon } from '@/lib/iconLoader'
import { REPORT_SUBJECTS } from '@/lib/feedbackReport'
import Dialog from '@/components/Dialog'
import ReportNotice from '@/components/ReportNotice'

// Caches each lazy component so repeated renders of the same icon name don't
// recreate a new lazy() wrapper (and re-trigger Suspense) every render.
const iconCache = new Map<string, ComponentType<{ size?: number }>>()

// Visible fallback for a missing/misnamed icon — silently rendering nothing
// makes a bad icon name indistinguishable from "no icon set," same class of
// problem as the Keyboard field-mismatch bug (zero visible failure = hard to
// diagnose). CircleSlash makes a bad name immediately noticeable instead.
function FallbackIcon({ size }: { size?: number }) {
  return <CircleSlash size={size} />
}

function DynamicIcon({ name, size = 15 }: { name: string; size?: number }) {
  const LazyIcon = useMemo(() => {
    if (!iconCache.has(name)) {
      iconCache.set(
        name,
        lazy(() => {
          const promise = loadIcon(name)
          return promise
            ? promise.then(mod => ({ default: mod.default }))
            : Promise.resolve({ default: FallbackIcon })
        })
      )
    }
    return iconCache.get(name)!
  }, [name])

  return (
    <Suspense fallback={null}>
      <LazyIcon size={size} />
    </Suspense>
  )
}

// Extracted after the intermediate-nested minor button and the direct
// minor button (rendered when a science has no intermediate parent) were
// found to be identical except for indent depth (px-12 vs px-8). Defined
// at module scope, not nested inside ScienceGrid, with onTap passed as a
// prop rather than closed over — a component defined inside another
// component's render body gets a fresh function identity every render,
// which React treats as a brand-new component type and remounts instead
// of reconciling.

// Class strings kept byte-identical to the two hand-written rows they replace.
const BUTTON = {
  major: 'flex w-full items-center justify-between px-4 py-2 text-right text-lg font-bold text-brand-blue hover:bg-brand-highlight focus:outline-none',
  intermediate: 'flex w-full items-center justify-between px-8 py-1.5 text-right text-base font-normal text-brand-blue hover:bg-brand-highlight focus:outline-none',
}
const PANEL = { major: 'divide-y divide-gray-50 bg-brand-ivory', intermediate: 'divide-y divide-gray-100 bg-brand-ivory' }
const SIZE = { major: { chevron: 16, icon: 17 }, intermediate: { chevron: 14, icon: 14 } }

// One expandable row of the science accordion (major or intermediate level).
// aria-expanded / aria-controls let screen readers announce what the chevron
// shows, and tie the button to the panel it reveals (WAI-ARIA disclosure).
function DisclosureRow({ level, label, icon, expanded, panelId, onToggle, children }: {
  level: 'major' | 'intermediate'
  label: string
  icon?: string | null
  expanded: boolean
  panelId: string
  onToggle: () => void
  children: ReactNode
}) {
  const size = SIZE[level]
  return (
    <div>
      <button onClick={onToggle} aria-expanded={expanded} aria-controls={panelId} className={BUTTON[level]}>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={size.chevron} /> : <ChevronLeft size={size.chevron} />}
          {icon && (
            <span className="text-brand-green">
              <DynamicIcon name={icon} size={size.icon} />
            </span>
          )}
          <span>{label}</span>
        </div>
      </button>
      {expanded && <div id={panelId} className={PANEL[level]}>{children}</div>}
    </div>
  )
}

function MinorButton({
  science,
  indent,
  onTap,
  onAppendixTap,
}: {
  science: Science
  indent: 'nested' | 'direct'
  onTap: (science: Science) => void
  onAppendixTap: (science: Science) => void
}) {
  // Hover is the only tap feedback (pure CSS light-blue affordance) — the
  // brief green-bold tap-confirmation flash was removed; at 500ms it was
  // negligibly brief to register. Moved from the button itself onto this
  // wrapper (2026-09-03, alongside the new paperclip button) — CSS :hover
  // on a parent still applies while hovering either child, so the whole
  // row keeps the same hover affordance it always had.
  return (
    <div className="flex w-full items-center hover:bg-brand-highlight">
      <button
        onClick={() => onTap(science)}
        className={`flex flex-1 items-center gap-2 ${indent === 'nested' ? 'px-12' : 'px-8'} py-1 text-right text-base focus:outline-none text-brand-blue`}
      >
        {science.ScienceMinorIcon && (
          <span className="text-brand-green">
            <DynamicIcon name={science.ScienceMinorIcon} />
          </span>
        )}
        <span className="flex-1">{science.ScienceMinor_Ar}</span>
      </button>
      {science.WebAppendix && (
        <button
          // stopPropagation isn't actually needed here — this is a sibling
          // of the row button, not nested inside it, so there's no bubbling
          // "row tap" to prevent — but kept explicit anyway since it costs
          // nothing and removes any doubt for a future reader.
          onClick={e => { e.stopPropagation(); onAppendixTap(science) }}
          className="px-3 py-1 text-brand-blue"
          aria-label="فتح الملحق"
        >
          <Paperclip size={15} />
        </button>
      )}
    </div>
  )
}

// Short status pill above the bottom bar (fixed positioning is viewport-
// relative, so it works from inside the scrolling grid). The 7rem offset —
// plus the real safe-area inset — is an estimate of the footer's height
// (OrnamentDivider + SearchBar + OSRow), not a measured value.
const CHECK_FLASH_MS = 450 // "site available" shows this long before the open

function StatusPill({ busy, text }: { busy?: boolean; text: string }) {
  return (
    <div
      role="status"
      className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+7rem)] z-50 mx-auto flex w-fit items-center gap-2 rounded-full ${busy ? 'bg-brand-blue' : 'bg-brand-green'} px-4 py-2 text-sm font-bold text-white shadow-lg`}
    >
      {busy ? <LoaderCircle size={16} className="animate-spin" /> : <CircleCheck size={16} />}
      <span>{text}</span>
    </div>
  )
}

export default function ScienceGrid() {
  const { state } = useAppState()
  const { sciences, resource: globalResource, loading, isRetrying, lastFailure } = useDataCache()
  const [openMajorId, setOpenMajorId] = useState<number | null>(null)
  const [openIntermediateId, setOpenIntermediateId] = useState<number | null>(null)
  // Reachability-check UI state (2026-09-03) — checkFlash is the brief
  // "reachable" confirmation shown right before the browser overlay opens;
  // unreachableUrl drives the warning dialog when the check genuinely
  // fails.
  const [checkFlash, setCheckFlash] = useState(false)
  const [unreachableUrl, setUnreachableUrl] = useState<string | null>(null)
  // Unified loading/retry/error indicator. lastFailure (dataCache.tsx) persists
  // through retries until a real success, so the indicator stays tappable
  // instead of flickering every ~10s retry cycle.
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null)
  // A ref, not state: two quick taps can both land before a state update.
  const busyRef = useRef(false)

  const groups = useMemo(() => groupSciences(sciences), [sciences])

  function resolveUrl(science: Science): string {
    if (computeIsGMSorApple(state.useWeb, state.isChina, state.useHMS, state.simIOS)) {
      return resolveEffectiveOS(state.useWeb, state.simIOS) === 'ios' ? science.AppleAppStore ?? '' : science.GooglePlayStore ?? ''
    }
    if (computeUseHuawei(state.useWeb, state.isChina, state.useHMS)) {
      return science.HuaweiAppGallery ?? ''
    }
    return science.Web ?? ''
  }

  // Where a URL opens: one shared decision (lib/openResource.ts).
  const openCtx = { useWeb: state.useWeb, uriSchemes: globalResource?.URIschemes ?? '', inWebList: globalResource?.inWebList ?? '' }
  const open = (url: string) => openResource(url, openCtx)

  // R8: an open that runs after an await (the check below) can be popup-
  // blocked on the web. openResource() reports that, so offer it again behind
  // a button — a fresh tap.
  async function openOrOffer(url: string) {
    if (!(await open(url))) setBlockedUrl(url)
  }

  // A4: one tap at a time — the check can take ~10s, and a second tap would
  // start a second check and a second open. "checking" shows it's working.
  async function handleMinorTap(science: Science) {
    const url = resolveUrl(science)
    if (!url || busyRef.current) return
    busyRef.current = true
    try {
      if (globalResource?.WebsiteStatus) {
        setChecking(true)
        const reachable = await checkPageReachable(url)
        setChecking(false)
        if (!reachable) {
          setUnreachableUrl(url)
          return
        }
        setCheckFlash(true)
        await new Promise(resolve => setTimeout(resolve, CHECK_FLASH_MS))
        setCheckFlash(false)
      }
      await openOrOffer(url)
    } finally {
      busyRef.current = false
      setChecking(false)
    }
  }

  async function handleAppendixTap(science: Science) {
    if (science.WebAppendix) await openOrOffer(science.WebAppendix)
  }

  if (loading && !lastFailure) {
    // First load, no failure yet — plain, non-interactive status text,
    // unchanged from the original behavior. Nothing to report yet, so
    // this deliberately isn't a button at all.
    return (
      <div className="flex items-center justify-center gap-2 p-4 text-base text-gray-500">
        <LoaderCircle size={20} className="animate-spin" />
        <span>جارٍ التحميل...</span>
      </div>
    )
  }
  if (lastFailure) {
    // At least one failure has happened since the last genuine success —
    // one unified, continuously-tappable indicator, replacing the
    // earlier separate loading/error blocks and inline report button.
    // Opens a dialog with the error details and an optional report
    // action instead, matching the OTA rollback notice's own pattern
    // (App.tsx) — same shared reporting mechanism, same Dialog.tsx
    // component, closes immediately after reporting rather than staying
    // open with a "reported" confirmation, since there's no content
    // behind it worth returning to mid-failure either way.
    return (
      <>
        <button
          type="button"
          onClick={() => setErrorDialogOpen(true)}
          className="flex w-full items-center justify-center gap-2 p-4 text-center text-base"
        >
          {loading && <LoaderCircle size={20} className="animate-spin text-gray-500" />}
          <span className={loading ? 'text-gray-500' : 'text-red-500 underline'}>
            {loading ? (isRetrying ? 'يُعاد المحاولة...' : 'جارٍ التحميل...') : lastFailure.message}
          </span>
        </button>
        <ReportNotice
          open={errorDialogOpen}
          title={LOAD_ERROR}
          message={lastFailure.message}
          subject={REPORT_SUBJECTS.dataLoad}
          details={`${lastFailure.message}\n\n${lastFailure.detail}`}
          onClose={() => setErrorDialogOpen(false)}
        />
      </>
    )
  }

  return (
    <Fragment>
      {checking && <StatusPill busy text="جارٍ التحقق من الموقع..." />}
      {checkFlash && <StatusPill text="الموقع متاح" />}
      <Dialog
        open={!!unreachableUrl}
        title="تعذر الوصول إلى الموقع"
        message="يبدو أن هذا الموقع غير متاح حاليًا."
        onClose={() => setUnreachableUrl(null)}
        // Native: the check genuinely reflects reachability, so "OK"
        // stays the recommended, filled default. Web: CapacitorHttp
        // falls back to the browser's own fetch there (subject to CORS),
        // so this warning is often a false positive — confirmed directly
        // via real console output ("blocked by CORS policy") across
        // several, otherwise perfectly reachable sites (tanzil.net,
        // archive.org, greattafsirs.com) — "continue anyway" is
        // genuinely the more likely-correct choice there, so it's
        // emphasized instead.
        emphasizeSecondary={!Capacitor.isNativePlatform()}
        secondaryAction={{
          label: 'المتابعة على أي حال',
          onClick: () => {
            const url = unreachableUrl
            setUnreachableUrl(null)
            if (url) void open(url) // never rejects
          },
        }}
      />
      <Dialog
        open={!!blockedUrl}
        title="تعذّر فتح الرابط تلقائيًا"
        message="اضغط «فتح» لفتح الرابط."
        onClose={() => setBlockedUrl(null)}
        emphasizeSecondary
        secondaryAction={{
          label: 'فتح',
          onClick: () => {
            const url = blockedUrl
            setBlockedUrl(null)
            if (url) void open(url) // a fresh tap; never rejects
          },
        }}
      />
      <div className="divide-y divide-gray-100">
      {groups.map(group => (
        <DisclosureRow
          key={group.majorId}
          level="major"
          label={group.major}
          icon={group.majorIcon}
          expanded={openMajorId === group.majorId}
          panelId={`sci-major-${group.majorId}`}
          onToggle={() => {
            setOpenMajorId(openMajorId === group.majorId ? null : group.majorId)
            setOpenIntermediateId(null)
          }}
        >
          {group.children.map(child =>
            child.kind === 'intermediate' ? (
              <DisclosureRow
                key={`int-${child.intermediateId}`}
                level="intermediate"
                label={child.intermediate}
                icon={child.intermediateIcon}
                expanded={openIntermediateId === child.intermediateId}
                panelId={`sci-int-${group.majorId}-${child.intermediateId}`}
                onToggle={() => setOpenIntermediateId(openIntermediateId === child.intermediateId ? null : child.intermediateId)}
              >
                {child.items.map(({ science }) => (
                  <MinorButton
                    key={science.ScienceMinorId}
                    science={science}
                    indent="nested"
                    onTap={handleMinorTap}
                    onAppendixTap={handleAppendixTap}
                  />
                ))}
              </DisclosureRow>
            ) : (
              <MinorButton
                key={`minor-${child.science.ScienceMinorId}`}
                science={child.science}
                indent="direct"
                onTap={handleMinorTap}
                onAppendixTap={handleAppendixTap}
              />
            )
          )}
        </DisclosureRow>
      ))}
      </div>
    </Fragment>
  )
}

import { useMemo, useState, Fragment } from 'react'
import { ChevronDown, ChevronLeft, LoaderCircle, Paperclip, CircleCheck } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useAppState } from '@/store/appState'
import { useDataCache } from '@/store/dataCache'
import { Science } from '@/api/dataSource'
import { computeIsGMSorApple, computeUseHuawei, resolveEffectiveOS } from '@/hooks/usePlatform'
import { groupSciences } from '@/lib/groupSciences'
import { checkPageReachable } from '@/lib/reachability'
import { openResource } from '@/lib/openResource'
import { REPORT_SUBJECTS } from '@/lib/feedbackReport'
import Dialog from '@/components/Dialog'
import ReportNotice from '@/components/ReportNotice'
import DynamicIcon from '@/components/DynamicIcon'

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

  async function handleMinorTap(science: Science) {
    const url = resolveUrl(science)
    if (!url) return

    if (globalResource?.WebsiteStatus) {
      const reachable = await checkPageReachable(url)
      if (!reachable) {
        setUnreachableUrl(url)
        return
      }
      // Only flash when a check genuinely ran and passed — resources
      // without WebsiteStatus configured skip the check entirely (no
      // regression from today's conditional-availability behavior), so
      // there's nothing to confirm for those.
      setCheckFlash(true)
      // Brief pause before opening, not simultaneous — Browser.open's
      // full-screen overlay would otherwise cover this instantly, and the
      // flash would never actually be seen.
      await new Promise(resolve => setTimeout(resolve, 450))
      setCheckFlash(false)
    }

    await open(url)
  }

  async function handleAppendixTap(science: Science) {
    if (science.WebAppendix) await open(science.WebAppendix)
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
          title="تعذّر تحميل البيانات"
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
      {checkFlash && (
        <div
          role="status"
          // Positioned above the lower OrnamentDivider/SearchBar/OSRow
          // footer, not at the top — fixed positioning is viewport-
          // relative regardless of DOM nesting, so this works correctly
          // even rendered from within ScienceGrid's own scrollable
          // container. The 7rem offset (plus real safe-area-inset-bottom
          // for devices with a home indicator) is an estimate covering
          // that footer's combined height, not a measured value — worth
          // confirming on a real device and adjusting if it sits wrong,
          // same caution this project's own header-sizing investigation
          // already established for hardcoded spacing guesses.
          className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+7rem)] z-50 mx-auto flex w-fit items-center gap-2 rounded-full bg-brand-green px-4 py-2 text-sm font-bold text-white shadow-lg"
        >
          <CircleCheck size={16} />
          <span>الموقع متاح</span>
        </div>
      )}
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
      <div className="divide-y divide-gray-100">
      {groups.map(group => (
        <div key={group.majorId}>
          <button
            onClick={() => {
              setOpenMajorId(openMajorId === group.majorId ? null : group.majorId)
              setOpenIntermediateId(null)
            }}
            // Padding tightens with depth: major (outermost) gets the most
            // room, minor (innermost/most numerous) the least — major py-2,
            // intermediate py-1.5, minor py-1.
            className="flex w-full items-center justify-between px-4 py-2 text-right text-lg font-bold text-brand-blue hover:bg-brand-highlight focus:outline-none"
          >
            <div className="flex items-center gap-2">
              {openMajorId === group.majorId ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
              {group.majorIcon && (
                <span className="text-brand-green">
                  <DynamicIcon name={group.majorIcon} size={17} />
                </span>
              )}
              <span>{group.major}</span>
            </div>
          </button>

          {openMajorId === group.majorId && (
            <div className="divide-y divide-gray-50 bg-brand-ivory">
              {group.children.map(child =>
                child.kind === 'intermediate' ? (
                  <div key={`int-${child.intermediateId}`}>
                    <button
                      onClick={() =>
                        setOpenIntermediateId(
                          openIntermediateId === child.intermediateId ? null : child.intermediateId
                        )
                      }
                      className="flex w-full items-center justify-between px-8 py-1.5 text-right text-base font-normal text-brand-blue hover:bg-brand-highlight focus:outline-none"
                    >
                      <div className="flex items-center gap-2">
                        {openIntermediateId === child.intermediateId
                          ? <ChevronDown size={14} />
                          : <ChevronLeft size={14} />
                        }
                        {child.intermediateIcon && (
                          <span className="text-brand-green">
                            <DynamicIcon name={child.intermediateIcon} size={14} />
                          </span>
                        )}
                        <span>{child.intermediate}</span>
                      </div>
                    </button>

                    {openIntermediateId === child.intermediateId && (
                      <div className="divide-y divide-gray-100 bg-brand-ivory">
                        {child.items.map(({ science }) => (
                          <MinorButton
                            key={science.ScienceMinorId}
                            science={science}
                            indent="nested"
                            onTap={handleMinorTap}
                            onAppendixTap={handleAppendixTap}
                          />
                        ))}
                      </div>
                    )}
                  </div>
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
            </div>
          )}
        </div>
      ))}
      </div>
    </Fragment>
  )
}

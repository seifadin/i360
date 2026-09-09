import { useMemo, useState, useEffect, lazy, Suspense, ComponentType, Fragment } from 'react'
import { ChevronDown, ChevronLeft, CircleSlash, LoaderCircle, Paperclip, CircleCheck } from 'lucide-react'
import { Browser } from '@capacitor/browser'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { useAppState } from '@/store/appState'
import { useDataCache } from '@/store/dataCache'
import { Science } from '@/api/dataSource'
import { resolveOpenMethod, computeIsGMSorApple, computeUseHuawei, resolveEffectiveOS } from '@/hooks/usePlatform'
import { loadIcon } from '@/lib/iconLoader'
import { tryOpenNewTab } from '@/lib/openTab'
import { resolveFeedbackMailto, copyAndEmailReport } from '@/lib/feedbackReport'
import Dialog from '@/components/Dialog'

interface MinorItem { science: Science }
type MajorChild =
  | { kind: 'intermediate'; intermediateId: number; intermediate: string; intermediateIcon: string; items: MinorItem[] }
  | { kind: 'minor'; science: Science }
interface MajorGroup {
  majorId: number
  major: string
  majorIcon: string
  children: MajorChild[]
}

// Builds one ordered `children` list per major, instead of separate
// "intermediates" and "direct items" arrays — the old two-array approach
// meant direct items always rendered after every intermediate group,
// regardless of their true relative position by ScienceMinorId (the
// table's primary key, which the data's actual insertion order respects).
// Here, an intermediate group's position is set by its FIRST-encountered
// item; later items for that same intermediate append to the existing
// entry rather than creating a new position — this genuinely interleaves
// intermediate groups and direct items in original minor-ID order.
function groupSciences(sciences: Science[]): MajorGroup[] {
  const majorMap = new Map<number, {
    major: string
    majorIcon: string
    children: MajorChild[]
    intPositions: Map<number, Extract<MajorChild, { kind: 'intermediate' }>>
  }>()

  for (const s of sciences) {
    // Explicit Number() coercion — Baserow may serialize these as strings
    // despite the TS type declaring `number` (see Section 4's callout).
    // Guarantees Map keys are genuine numbers regardless of runtime type.
    const majorKey = Number(s.ScienceMajorId)
    if (!majorMap.has(majorKey)) {
      majorMap.set(majorKey, {
        major: s.ScienceMajor_Ar,
        majorIcon: s.ScienceMajorIcon ?? '',
        children: [],
        intPositions: new Map(),
      })
    }
    const majorEntry = majorMap.get(majorKey)!
    const intId = s.ScienceIntermediateId != null ? Number(s.ScienceIntermediateId) : null
    if (intId) {
      let intChild = majorEntry.intPositions.get(intId)
      if (!intChild) {
        intChild = {
          kind: 'intermediate',
          intermediateId: intId,
          intermediate: s.ScienceIntermediate_Ar,
          intermediateIcon: s.ScienceIntermediateIcon ?? '',
          items: [],
        }
        majorEntry.intPositions.set(intId, intChild)
        majorEntry.children.push(intChild)
      }
      intChild.items.push({ science: s })
    } else {
      majorEntry.children.push({ kind: 'minor', science: s })
    }
  }

  return Array.from(majorMap.entries()).map(([majorId, entry]) => ({
    majorId,
    major: entry.major,
    majorIcon: entry.majorIcon,
    children: entry.children,
  }))
}

// Caches each lazy component so repeated renders of the same icon name don't
// recreate a new lazy() wrapper (and re-trigger Suspense) every render.
const iconCache = new Map<string, ComponentType<{ size?: number }>>()

// Proactive reachability check (2026-09-03) — same timeout+retry shape as
// dataSource.ts's fetchWithRetry, deliberately shorter numbers: this is a
// pre-flight UX check the user is actively waiting on before the browser
// opens, not a background data load. CapacitorHttp specifically, not plain
// fetch — makes the request at the native layer, genuinely bypassing CORS
// (confirmed via Capacitor's own docs) rather than getting an opaque,
// unreadable response the way a no-cors fetch would. That's what makes a
// real status-code check possible here at all.
const STATUS_CHECK_TIMEOUT_MS = 5000
const STATUS_CHECK_MAX_RETRIES = 1 // 1 initial + 1 retry = 2 total tries
const STATUS_CHECK_RETRY_BACKOFF_MS = [800]

async function checkUrlReachable(url: string): Promise<boolean> {
  for (let attempt = 0; attempt <= STATUS_CHECK_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, STATUS_CHECK_RETRY_BACKOFF_MS[attempt - 1]))
    }
    try {
      const response = await CapacitorHttp.get({
        url,
        connectTimeout: STATUS_CHECK_TIMEOUT_MS,
        readTimeout: STATUS_CHECK_TIMEOUT_MS,
        // Headers (2026-09-06) — a real, confirmed false-positive pattern:
        // this check reported "unreachable" on sites that then opened
        // fine when the user proceeded anyway. Most likely cause: a bare
        // CapacitorHttp request doesn't carry the headers a real browser
        // sends, and many sites (behind Cloudflare/Akamai/similar
        // protection) specifically reject non-browser-looking requests,
        // typically with a 403 — while a real browser (which is exactly
        // what @capacitor/browser opens when the user proceeds) sails
        // through fine. navigator.userAgent, not a hardcoded string —
        // this is the app's own, real, currently-running WebView's UA,
        // so it's never stale as Chrome versions increment, and it
        // genuinely matches what @capacitor/browser will present a
        // moment later for the same URL.
        headers: {
          'User-Agent': navigator.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar,en;q=0.9',
        },
      })
      // A real, readable status this time (unlike a plain no-cors fetch's
      // opaque response) — treat 2xx/3xx as genuinely reachable. 403
      // specifically treated as reachable too (2026-09-06) — it's often a
      // "you don't look like a browser" signal rather than "this content
      // is genuinely gone," unlike a 404/410/5xx, which still count as a
      // real problem worth surfacing. A thrown/rejected request (network
      // failure, timeout) falls through to the catch below and the next
      // attempt.
      return (response.status >= 200 && response.status < 400) || response.status === 403
    } catch {
      // loop continues to next attempt, unless this was the last one
    }
  }
  return false
}

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
  const { sciences, resource: globalResource, loading, error, isRetrying } = useDataCache()
  const [openMajorId, setOpenMajorId] = useState<number | null>(null)
  const [openIntermediateId, setOpenIntermediateId] = useState<number | null>(null)
  // Reachability-check UI state (2026-09-03) — checkFlash is the brief
  // "reachable" confirmation shown right before the browser overlay opens;
  // unreachableUrl drives the warning dialog when the check genuinely
  // fails.
  const [checkFlash, setCheckFlash] = useState(false)
  const [unreachableUrl, setUnreachableUrl] = useState<string | null>(null)
  // Unified loading/retry/error indicator (2026-09-06 redesign) — replaces
  // the earlier separate loading/error blocks and inline report button.
  // lastErrorMessage deliberately does NOT just mirror dataCache.tsx's own
  // `error` directly — that value resets to null at the START of every
  // retry attempt (dataCache.tsx's own established behavior), so a naive
  // binding would make the indicator flicker in and out of being
  // interactive every ~10s retry cycle. This instead remembers the most
  // recent real failure, staying set continuously through every
  // subsequent retry, until a genuinely settled success (loading false,
  // error null) resets it — mirroring App.tsx's own notifyAppReady()
  // gating condition, the same "genuinely settled" signal used there.
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null)
  useEffect(() => {
    if (error) {
      setLastErrorMessage(error)
    } else if (!loading) {
      setLastErrorMessage(null)
    }
  }, [error, loading])
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

  // Shared by the main resource tap and the WebAppendix paperclip
  // (2026-09-03) — both need the exact same "resolve open method, then
  // open" logic, just targeting different URLs. No mobile/desktop special-
  // casing lives here beyond what resolveOpenMethod itself already
  // handles — both callers go through the identical path.
  async function openUrl(url: string) {
    if (!url) return
    const openMethod: 'tab' | 'in_app' =
      !state.useWeb
        ? 'tab'
        : resolveOpenMethod(url, globalResource?.URIschemes ?? '', globalResource?.inWebList ?? '')

    if (openMethod === 'tab') {
      tryOpenNewTab(url)
    } else {
      // Replaces the old navigate('/browser', ...) iframe page — opens
      // the OS's own in-app browser (Custom Tabs/SFSafariViewController)
      // instead. Browser.tsx and its /browser route are fully deleted
      // (2026-09-03) — SearchBar.tsx's own resource-opening flow migrated
      // the same session and now goes through the identical Browser.open()
      // path, not navigate('/browser') anymore.
      await Browser.open({ url })
    }
  }

  async function handleMinorTap(science: Science) {
    const url = resolveUrl(science)
    if (!url) return

    if (globalResource?.WebsiteStatus) {
      const reachable = await checkUrlReachable(url)
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

    await openUrl(url)
  }

  async function handleAppendixTap(science: Science) {
    if (science.WebAppendix) await openUrl(science.WebAppendix)
  }

  if (loading && !lastErrorMessage) {
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
  if (lastErrorMessage) {
    // At least one failure has happened since the last genuine success —
    // one unified, continuously-tappable indicator, replacing the
    // earlier separate loading/error blocks and inline report button.
    // Opens a dialog with the error details and an optional report
    // action instead, matching the OTA rollback notice's own pattern
    // (App.tsx) — same shared reporting mechanism, same Dialog.tsx
    // component, closes immediately after reporting rather than staying
    // open with a "reported" confirmation, since there's no content
    // behind it worth returning to mid-failure either way.
    const handleDataErrorReport = () => {
      copyAndEmailReport('تقرير تعذّر تحميل البيانات - i360إ', lastErrorMessage)
      setErrorDialogOpen(false)
    }
    return (
      <>
        <button
          type="button"
          onClick={() => setErrorDialogOpen(true)}
          className="flex w-full items-center justify-center gap-2 p-4 text-center text-base"
        >
          {loading && <LoaderCircle size={20} className="animate-spin text-gray-500" />}
          <span className={loading ? 'text-gray-500' : 'text-red-500 underline'}>
            {loading ? (isRetrying ? 'يُعاد المحاولة...' : 'جارٍ التحميل...') : lastErrorMessage}
          </span>
        </button>
        <Dialog
          open={errorDialogOpen}
          title="تعذّر تحميل البيانات"
          message={lastErrorMessage}
          onClose={() => setErrorDialogOpen(false)}
          secondaryAction={
            resolveFeedbackMailto()
              ? { label: 'الإبلاغ عن المشكلة', onClick: handleDataErrorReport }
              : undefined
          }
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
            if (url) openUrl(url)
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

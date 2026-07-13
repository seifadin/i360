import { useMemo, useState, lazy, Suspense, ComponentType } from 'react'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '@/store/appState'
import { useDataCache } from '@/store/dataCache'
import { Science } from '@/api/baserow'
import { resolveOpenMethod, isDesktop, computeIsGMSorApple, resolveEffectiveOS } from '@/hooks/usePlatform'

interface MinorItem { science: Science }
interface IntermediateGroup {
  intermediateId: number
  intermediate: string
  intermediateIcon: string
  items: MinorItem[]
}
interface MajorGroup {
  majorId: number
  major: string
  majorIcon: string
  intermediates: IntermediateGroup[]
  directItems: MinorItem[]
}

function groupSciences(sciences: Science[]): MajorGroup[] {
  const majorMap = new Map<number, {
    major: string
    majorIcon: string
    intMap: Map<number, { name: string; icon: string; items: MinorItem[] }>
    directItems: MinorItem[]
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
        intMap: new Map(),
        directItems: [],
      })
    }
    const majorEntry = majorMap.get(majorKey)!
    const intId = s.ScienceIntermediateId != null ? Number(s.ScienceIntermediateId) : null
    if (intId) {
      if (!majorEntry.intMap.has(intId)) {
        majorEntry.intMap.set(intId, {
          name: s.ScienceIntermediate_Ar,
          icon: s.ScienceIntermediateIcon ?? '',
          items: [],
        })
      }
      majorEntry.intMap.get(intId)!.items.push({ science: s })
    } else {
      majorEntry.directItems.push({ science: s })
    }
  }

  return Array.from(majorMap.entries()).map(([majorId, entry]) => ({
    majorId,
    major: entry.major,
    majorIcon: entry.majorIcon,
    intermediates: Array.from(entry.intMap.entries()).map(([intermediateId, { name, icon, items }]) => ({
      intermediateId,
      intermediate: name,
      intermediateIcon: icon,
      items,
    })),
    directItems: entry.directItems,
  }))
}

// PascalCase (as stored in Baserow, matching lucide-react's named exports) →
// kebab-case (matching lucide-react's individual icon file names).
function toKebabCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

// Caches each lazy component so repeated renders of the same icon name don't
// recreate a new lazy() wrapper (and re-trigger Suspense) every render.
const iconCache = new Map<string, ComponentType<{ size?: number }>>()

function DynamicIcon({ name, size = 15 }: { name: string; size?: number }) {
  const LazyIcon = useMemo(() => {
    if (!iconCache.has(name)) {
      iconCache.set(
        name,
        lazy(() =>
          import(`lucide-react/dist/esm/icons/${toKebabCase(name)}.mjs`)
            .then(mod => ({ default: mod.default }))
            .catch(() => ({ default: () => null }))
        )
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

// Shared className for minor-science buttons — hover is the only feedback
// now (pure CSS light-blue affordance). The brief green-bold tap-confirmation
// flash was removed — at 500ms it was negligibly brief to register.
function minorButtonClass(): string {
  return 'hover:bg-brand-highlight focus:outline-none text-brand-blue'
}

export default function ScienceGrid() {
  const { state, setState } = useAppState()
  const { sciences, resource: globalResource, loading, error } = useDataCache()
  const navigate = useNavigate()
  const [openMajorId, setOpenMajorId] = useState<number | null>(null)
  const [openIntermediateId, setOpenIntermediateId] = useState<number | null>(null)

  const groups = useMemo(() => groupSciences(sciences), [sciences])

  function resolveUrl(science: Science): string {
    if (computeIsGMSorApple(state.useWeb, state.isChina, state.useHMS)) {
      return resolveEffectiveOS(state.useWeb) === 'ios' ? science.AppleAppStore ?? '' : science.GooglePlayStore ?? ''
    }
    if (!state.useWeb && (state.isChina || state.useHMS)) {
      return science.HuaweiAppGallery ?? ''
    }
    return science.Web ?? ''
  }

  async function handleMinorTap(science: Science) {
    const url = resolveUrl(science)
    if (!url) return

    setState({
      ScienceMinorId: science.ScienceMinorId,
      WebAppendix: science.WebAppendix ?? null,
      WebsiteStatus: globalResource?.WebsiteStatus ?? null,
    })

    // Desktop and native app-store mode (!useWeb) always open a new tab —
    // app-store links can't meaningfully render inside the WebView iframe.
    // Only mobile + useWeb consults inWebList/URIschemes via resolveOpenMethod.
    const openMethod: 'tab' | 'webview' =
      isDesktop() || !state.useWeb
        ? 'tab'
        : globalResource
          ? resolveOpenMethod(url, globalResource.URIschemes, globalResource.inWebList)
          : 'webview'

    if (openMethod === 'tab') {
      window.open(url, '_blank')
      // WebAppendix is a companion to the Web resource specifically — it
      // doesn't make sense alongside an app-store link (native !useWeb mode).
      if (state.useWeb && science.WebAppendix) window.open(science.WebAppendix, '_blank')
    } else {
      navigate('/browser', { state: { url } })
    }
  }

  if (loading) return <p className="p-4 text-right text-gray-500">جارٍ التحميل...</p>
  if (error) return <p className="p-4 text-right text-red-500">{error}</p>

  return (
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
              {group.intermediates.map(intGroup => (
                <div key={intGroup.intermediateId}>
                  <button
                    onClick={() =>
                      setOpenIntermediateId(
                        openIntermediateId === intGroup.intermediateId ? null : intGroup.intermediateId
                      )
                    }
                    className="flex w-full items-center justify-between px-8 py-1.5 text-right text-base font-normal text-brand-blue hover:bg-brand-highlight focus:outline-none"
                  >
                    <div className="flex items-center gap-2">
                      {openIntermediateId === intGroup.intermediateId
                        ? <ChevronDown size={14} />
                        : <ChevronLeft size={14} />
                      }
                      {intGroup.intermediateIcon && (
                        <span className="text-brand-green">
                          <DynamicIcon name={intGroup.intermediateIcon} size={14} />
                        </span>
                      )}
                      <span>{intGroup.intermediate}</span>
                    </div>
                  </button>

                  {openIntermediateId === intGroup.intermediateId && (
                    <div className="divide-y divide-gray-100 bg-brand-ivory">
                      {intGroup.items.map(({ science }) => (
                        <button
                          key={science.ScienceMinorId}
                          onClick={() => handleMinorTap(science)}
                          className={`flex w-full items-center gap-2 px-12 py-1 text-right text-base ${minorButtonClass()}`}
                        >
                          {science.ScienceMinorIcon && (
                            <span className="text-brand-green">
                              <DynamicIcon name={science.ScienceMinorIcon} />
                            </span>
                          )}
                          <span className="flex-1">{science.ScienceMinor_Ar}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {group.directItems.map(({ science }) => (
                <button
                  key={science.ScienceMinorId}
                  onClick={() => handleMinorTap(science)}
                  className={`flex w-full items-center gap-2 px-8 py-1 text-right text-base ${minorButtonClass()}`}
                >
                  {science.ScienceMinorIcon && (
                    <span className="text-brand-green">
                      <DynamicIcon name={science.ScienceMinorIcon} />
                    </span>
                  )}
                  <span className="flex-1">{science.ScienceMinor_Ar}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

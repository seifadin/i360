import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import * as Icons from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '@/store/appState'
import { fetchSciences, fetchResources, Science, Resource } from '@/api/baserow'
import { detectOS, resolveOpenMethod } from '@/hooks/usePlatform'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MinorItem {
  science: Science
}

interface IntermediateGroup {
  intermediate: string
  intermediateIcon: string
  items: MinorItem[]
}

interface MajorGroup {
  major: string
  majorIcon: string
  intermediates: IntermediateGroup[]
  directItems: MinorItem[] // minors with no intermediate
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

function groupSciences(sciences: Science[]): MajorGroup[] {
  const majorMap = new Map<string, {
    majorIcon: string
    intMap: Map<string, { icon: string; items: MinorItem[] }>
    directItems: MinorItem[]
  }>()

  for (const s of sciences) {
    const majorKey = s.ScienceMajor_Ar
    if (!majorMap.has(majorKey)) {
      majorMap.set(majorKey, {
        majorIcon: s.ScienceMajor_Icon ?? '',
        intMap: new Map(),
        directItems: [],
      })
    }
    const majorEntry = majorMap.get(majorKey)!
    const intKey = s.ScienceIntermediate_Ar ?? ''

    if (intKey) {
      if (!majorEntry.intMap.has(intKey)) {
        majorEntry.intMap.set(intKey, {
          icon: s.ScienceIntermediate_Icon ?? '',
          items: [],
        })
      }
      majorEntry.intMap.get(intKey)!.items.push({ science: s })
    } else {
      majorEntry.directItems.push({ science: s })
    }
  }

  return Array.from(majorMap.entries()).map(([major, entry]) => ({
    major,
    majorIcon: entry.majorIcon,
    intermediates: Array.from(entry.intMap.entries()).map(([intermediate, { icon, items }]) => ({
      intermediate,
      intermediateIcon: icon,
      items,
    })),
    directItems: entry.directItems,
  }))
}

// ─── Dynamic Icon ─────────────────────────────────────────────────────────────

function DynamicIcon({ name, size = 15 }: { name: string; size?: number }) {
  const Icon = (Icons as Record<string, any>)[name]
  if (!Icon) return null
  return <Icon size={size} />
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ScienceGrid() {
  const { state, setState } = useAppState()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<MajorGroup[]>([])
  const [openMajor, setOpenMajor] = useState<string | null>(null)
  const [openIntermediate, setOpenIntermediate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSciences()
      .then(data => {
        setGroups(groupSciences(data))
        setLoading(false)
      })
      .catch(() => {
        setError('تعذّر تحميل العلوم')
        setLoading(false)
      })
  }, [])

  // ─── Platform-aware URL resolution ─────────────────────────────────────────
  function resolveUrl(science: Science): string {
    const os = detectOS()
    if (os === 'android' && !state.useWeb) {
      if (state.isChina || state.useHMS) return science.HuaweiAppGallery ?? ''
      return science.GooglePlayStore ?? ''
    }
    if (os === 'ios' && !state.useWeb) return science.AppleAppStore ?? ''
    return science.Web ?? ''
  }

  async function handleMinorTap(science: Science) {
    const url = resolveUrl(science)
    if (!url) return

    setState({
      ScienceMinorId: science.id,
      WebAppendix: science.WebAppendix ?? null,
    })

    // Fetch i360dbc to check URIschemes + inWebList
    let openMethod: 'tab' | 'webview' = 'webview'
    if (state.useWeb) {
      try {
        const resources = await fetchResources(science.id)
        const resource: Resource | undefined = resources[0]
        if (resource) {
          openMethod = resolveOpenMethod(
            url,
            resource.URIschemes ?? '',
            resource.inWebList ?? ''
          )
        }
      } catch {
        openMethod = 'webview'
      }
    }

    // Navigate — open in new tab or WebView
    if (openMethod === 'tab') {
      window.open(url, '_blank')
      if (science.WebAppendix) window.open(science.WebAppendix, '_blank')
    } else {
      navigate('/browser', { state: { url } })
    }
  }

  if (loading) return <p className="p-4 text-right text-gray-500">جارٍ التحميل...</p>
  if (error) return <p className="p-4 text-right text-red-500">{error}</p>

  return (
    <div className="divide-y divide-gray-100">
      {groups.map(group => (
        <div key={group.major}>
          {/* Major header */}
          <button
            onClick={() => {
              setOpenMajor(openMajor === group.major ? null : group.major)
              setOpenIntermediate(null)
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-right font-semibold text-green-800 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              {group.majorIcon && (
                <span className="text-green-700">
                  <DynamicIcon name={group.majorIcon} size={17} />
                </span>
              )}
              <span>{group.major}</span>
            </div>
            {openMajor === group.major
              ? <ChevronDown size={18} />
              : <ChevronLeft size={18} />
            }
          </button>

          {openMajor === group.major && (
            <div className="divide-y divide-gray-50 bg-gray-50">

              {/* Intermediate level */}
              {group.intermediates.map(intGroup => (
                <div key={intGroup.intermediate}>
                  <button
                    onClick={() =>
                      setOpenIntermediate(
                        openIntermediate === intGroup.intermediate
                          ? null
                          : intGroup.intermediate
                      )
                    }
                    className="flex w-full items-center justify-between px-5 py-2 text-right text-sm font-medium text-green-700 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      {intGroup.intermediateIcon && (
                        <span className="text-green-600">
                          <DynamicIcon name={intGroup.intermediateIcon} size={15} />
                        </span>
                      )}
                      <span>{intGroup.intermediate}</span>
                    </div>
                    {openIntermediate === intGroup.intermediate
                      ? <ChevronDown size={15} />
                      : <ChevronLeft size={15} />
                    }
                  </button>

                  {/* Minors under intermediate */}
                  {openIntermediate === intGroup.intermediate && (
                    <div className="divide-y divide-gray-100 bg-white">
                      {intGroup.items.map(({ science }) => (
                        <button
                          key={science.id}
                          onClick={() => handleMinorTap(science)}
                          className="flex w-full items-center gap-2 px-7 py-2 text-right text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {science.ScienceMinor_Icon && (
                            <span className="text-green-600">
                              <DynamicIcon name={science.ScienceMinor_Icon} />
                            </span>
                          )}
                          <span className="flex-1">{science.ScienceMinor_Ar}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Direct minors (no intermediate) */}
              {group.directItems.map(({ science }) => (
                <button
                  key={science.id}
                  onClick={() => handleMinorTap(science)}
                  className="flex w-full items-center gap-2 px-6 py-2 text-right text-sm text-gray-700 hover:bg-gray-100"
                >
                  {science.ScienceMinor_Icon && (
                    <span className="text-green-600">
                      <DynamicIcon name={science.ScienceMinor_Icon} />
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

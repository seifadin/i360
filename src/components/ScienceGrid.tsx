import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import * as Icons from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '@/store/appState'
import { fetchSciences, fetchResources, Science, Resource } from '@/api/baserow'
import { detectOS, resolveOpenMethod, isDesktop } from '@/hooks/usePlatform'

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
    const majorKey = s.ScienceMajorId
    if (!majorMap.has(majorKey)) {
      majorMap.set(majorKey, {
        major: s.ScienceMajor_Ar,
        majorIcon: s.ScienceMajorIcon ?? '',
        intMap: new Map(),
        directItems: [],
      })
    }
    const majorEntry = majorMap.get(majorKey)!
    const intId = s.ScienceIntermediateId
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

function DynamicIcon({ name, size = 15 }: { name: string; size?: number }) {
  const Icon = (Icons as Record<string, any>)[name]
  if (!Icon) return null
  return <Icon size={size} />
}

export default function ScienceGrid() {
  const { state, setState } = useAppState()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<MajorGroup[]>([])
  const [globalResource, setGlobalResource] = useState<Resource | null>(null)
  const [openMajorId, setOpenMajorId] = useState<number | null>(null)
  const [openIntermediateId, setOpenIntermediateId] = useState<number | null>(null)
  const [selectedMinorId, setSelectedMinorId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch sciences + global i360dbc record (for inWebList/URIschemes) in parallel
    Promise.all([
      fetchSciences(),
      fetchResources(), // global i360dbc record — no filter field exists
    ]).then(([scienceData, resourceData]) => {
      setGroups(groupSciences(scienceData))
      setGlobalResource(resourceData[0] ?? null)
      setLoading(false)
    }).catch(() => {
      setError('تعذّر تحميل العلوم')
      setLoading(false)
    })
  }, [])

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

    setSelectedMinorId(science.id)
    setState({
      ScienceMinorId: science.id,
      WebAppendix: science.WebAppendix ?? null,
      WebsiteStatus: globalResource?.WebsiteStatus ?? null,
    })

    // Desktop → always open in new tab
    if (isDesktop()) {
      window.open(url, '_blank')
      if (science.WebAppendix) window.open(science.WebAppendix, '_blank')
      return
    }

    // Mobile → check inWebList/URIschemes
    let openMethod: 'tab' | 'webview' = 'webview'
    if (state.useWeb && globalResource) {
      openMethod = resolveOpenMethod(
        url,
        globalResource.URIschemes,
        globalResource.inWebList
      )
    }

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
        <div key={group.majorId}>
          <button
            onClick={() => {
              setOpenMajorId(openMajorId === group.majorId ? null : group.majorId)
              setOpenIntermediateId(null)
            }}
            className="flex w-full items-center justify-between px-4 py-1 text-right font-semibold hover:bg-gray-50"
            style={{ color: '#0010CF' }}
          >
            <div className="flex items-center gap-2">
              {openMajorId === group.majorId ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
              {group.majorIcon && (
                <span style={{ color: '#1A5C38' }}>
                  <DynamicIcon name={group.majorIcon} size={17} />
                </span>
              )}
              <span>{group.major}</span>
            </div>
          </button>

          {openMajorId === group.majorId && (
            <div className="divide-y divide-gray-50 bg-gray-50">
              {group.intermediates.map(intGroup => (
                <div key={intGroup.intermediateId}>
                  <button
                    onClick={() =>
                      setOpenIntermediateId(
                        openIntermediateId === intGroup.intermediateId ? null : intGroup.intermediateId
                      )
                    }
                    className="flex w-full items-center justify-between px-8 py-1 text-right text-sm font-medium hover:bg-gray-100"
                    style={{ color: '#0010CF' }}
                  >
                    <div className="flex items-center gap-2">
                      {openIntermediateId === intGroup.intermediateId
                        ? <ChevronDown size={14} />
                        : <ChevronLeft size={14} />
                      }
                      {intGroup.intermediateIcon && (
                        <span style={{ color: '#1A5C38' }}>
                          <DynamicIcon name={intGroup.intermediateIcon} size={14} />
                        </span>
                      )}
                      <span>{intGroup.intermediate}</span>
                    </div>
                  </button>

                  {openIntermediateId === intGroup.intermediateId && (
                    <div className="divide-y divide-gray-100 bg-white">
                      {intGroup.items.map(({ science }) => (
                        <button
                          key={science.id}
                          onClick={() => handleMinorTap(science)}
                          className="flex w-full items-center gap-2 px-12 py-1 text-right text-sm hover:bg-gray-50"
                          style={{
                            backgroundColor: selectedMinorId === science.id ? '#EEF2FF' : undefined,
                            color: selectedMinorId === science.id ? '#1A5C38' : '#0010CF',
                            fontWeight: selectedMinorId === science.id ? 600 : undefined,
                          }}
                        >
                          {science.ScienceMinorIcon && (
                            <span style={{ color: '#1A5C38' }}>
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
                  key={science.id}
                  onClick={() => handleMinorTap(science)}
                  className="flex w-full items-center gap-2 px-8 py-1 text-right text-sm hover:bg-gray-100"
                  style={{
                    backgroundColor: selectedMinorId === science.id ? '#EEF2FF' : undefined,
                    color: selectedMinorId === science.id ? '#1A5C38' : '#0010CF',
                    fontWeight: selectedMinorId === science.id ? 600 : undefined,
                  }}
                >
                  {science.ScienceMinorIcon && (
                    <span style={{ color: '#1A5C38' }}>
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

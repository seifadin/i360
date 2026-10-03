import { lazy, Suspense, useMemo, ComponentType } from 'react'
import { CircleSlash } from 'lucide-react'
import { loadIcon } from '@/lib/iconLoader'

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

export default function DynamicIcon({ name, size = 15 }: { name: string; size?: number }) {
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

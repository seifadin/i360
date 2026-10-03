import { Science } from '@/api/dataSource'

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
export function groupSciences(sciences: Science[]): MajorGroup[] {
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

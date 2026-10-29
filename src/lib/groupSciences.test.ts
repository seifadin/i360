import { describe, expect, test } from 'vitest'
import type { Science } from '@/api/dataSource'
import { groupSciences } from '@/lib/groupSciences'

// A row as Baserow sends it (only the fields grouping reads matter; the rest are blank).
function row(minorId: number, majorId: number | string, intermediateId: number | string | null, extra: Partial<Science> = {}): Science {
  return {
    id: minorId, ScienceMinorId: minorId, ScienceMinor_Ar: `فرع ${minorId}`, ScienceMinor_En: '', ScienceMinorIcon: '',
    ScienceIntermediateId: intermediateId as number | null, ScienceIntermediate_Ar: `وسيط ${intermediateId}`, ScienceIntermediate_En: '', ScienceIntermediateIcon: 'Layers',
    ScienceMajorId: majorId as number, ScienceMajor_Ar: `أصل ${majorId}`, ScienceMajor_En: '', ScienceMajorIcon: 'Book',
    GooglePlayStore: '', HuaweiAppGallery: '', AppleAppStore: '', Web: '', WebAppendix: '',
    ...extra,
  }
}

// The shape a reader of the grid sees: per major, its children in order.
const shape = (groups: ReturnType<typeof groupSciences>) => groups.map((g) => [g.majorId, g.children.map((c) =>
  c.kind === 'intermediate' ? `i${c.intermediateId}:${c.items.map((x) => x.science.ScienceMinorId).join(',')}` : `m${c.science.ScienceMinorId}`)])

describe('groupSciences', () => {
  test('majors in the order they first appear; nothing lost', () => {
    const rows = [row(1, 2, null), row(2, 1, null), row(3, 2, null)]
    const groups = groupSciences(rows)
    expect(groups.map((g) => g.majorId)).toEqual([2, 1])
    expect(groups.flatMap((g) => g.children).length).toBe(3)
  })

  test('an intermediate sits where its first row is; direct rows interleave in their own order', () => {
    // minor ids in Baserow order: direct 10, intermediate 7 (rows 11, 13), direct 12, intermediate 8 (row 14)
    const rows = [row(10, 1, null), row(11, 1, 7), row(12, 1, null), row(13, 1, 7), row(14, 1, 8)]
    expect(shape(groupSciences(rows))).toEqual([[1, ['m10', 'i7:11,13', 'm12', 'i8:14']]])
  })

  test('ids sent as strings (Baserow may) group with the same ids sent as numbers', () => {
    const rows = [row(1, 3, 5), row(2, '3', '5'), row(3, 3, null)]
    const groups = groupSciences(rows)
    expect(shape(groups)).toEqual([[3, ['i5:1,2', 'm3']]])
    expect(typeof groups[0]?.majorId).toBe('number')
  })

  test('names and icons come from the first row of each group; a missing icon is empty', () => {
    const rows = [
      row(1, 1, 4, { ScienceMajorIcon: undefined as unknown as string, ScienceIntermediateIcon: undefined as unknown as string }),
      row(2, 1, 4, { ScienceIntermediate_Ar: 'اسم آخر' }),
    ]
    const [g] = groupSciences(rows)
    expect(g?.major).toBe('أصل 1')
    expect(g?.majorIcon).toBe('')
    const child = g?.children[0]
    expect(child?.kind).toBe('intermediate')
    if (child?.kind === 'intermediate') {
      expect(child.intermediate).toBe('وسيط 4')
      expect(child.intermediateIcon).toBe('')
    }
  })

  test('no rows, no groups', () => {
    expect(groupSciences([])).toEqual([])
  })
})

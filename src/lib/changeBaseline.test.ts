import { beforeEach, describe, expect, test } from 'vitest'
import { commitBaseline, hasChanged } from '@/lib/changeBaseline'

// localStorage, in memory (the tests run in plain Node); the device-storage helpers read window.localStorage.
const store = new Map<string, string>()
Object.assign(globalThis, {
  window: { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, String(v)) } } },
})

describe('change flags: read first, baseline written only after a successful load (§15h)', () => {
  beforeEach(() => store.clear())

  test('first launch: nothing stored is not a change', () => {
    expect(hasChanged('i360Edition', '5')).toBe(false)
  })

  test('a new value is a change until it is committed', () => {
    commitBaseline('i360Edition', '5')
    expect(hasChanged('i360Edition', '6')).toBe(true)
    expect(hasChanged('i360Edition', '6')).toBe(true)   // reading alone never writes
    commitBaseline('i360Edition', '6')
    expect(hasChanged('i360Edition', '6')).toBe(false)
  })

  test('a load that fails after the check commits nothing, so the retry still sees the change', () => {
    commitBaseline('i360Revision', '3')
    expect(hasChanged('i360Revision', '4')).toBe(true)
    // …the gated download fails here: no commitBaseline call…
    expect(hasChanged('i360Revision', '4')).toBe(true)
    expect(store.get('i360Revision')).toBe('3')
  })

  test('a missing value is never a change and never stored', () => {
    commitBaseline('i360Version', '1.0')
    for (const v of [null, undefined, '']) {
      expect(hasChanged('i360Version', v)).toBe(false)
      commitBaseline('i360Version', v)
    }
    expect(store.get('i360Version')).toBe('1.0')
  })

  test('each item has its own baseline', () => {
    commitBaseline('i360Edition', '5')
    commitBaseline('i360Version', '5')
    expect(hasChanged('i360Edition', '6')).toBe(true)
    expect(hasChanged('i360Version', '5')).toBe(false)
  })
})

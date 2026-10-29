import { beforeEach, describe, expect, test, vi } from 'vitest'

// ownPagePath() acts only inside the installed app (Capacitor's bridge present).
const native = vi.hoisted(() => ({ on: true }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.on, getPlatform: () => 'android' } }))
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn() } }))

const { ownPagePath } = await import('@/lib/openResource')

describe('ownPagePath — the app\'s own pages open its own copy', () => {
  beforeEach(() => { native.on = true })

  test('the app\'s address, the old one and the hub, for each page', () => {
    for (const host of ['i36o.web.app', 'i360-e.web.app', 'i360-hub.web.app']) {
      expect(ownPagePath(`https://${host}/day/`)).toBe('/day/index.html')
      expect(ownPagePath(`https://${host}/md/`)).toBe('/md/index.html')
      expect(ownPagePath(`https://${host}/cse/index.html`)).toBe('/cse/index.html')
    }
  })

  test('the old forwarders map to their page, whatever the path', () => {
    expect(ownPagePath('https://i360-day.web.app/')).toBe('/day/index.html')
    expect(ownPagePath('https://i360-md.web.app/?file=books/x.md')).toBe('/md/index.html?file=books/x.md')
    expect(ownPagePath('https://i360-cse.web.app/anything')).toBe('/cse/index.html')
  })

  test('the query and the fragment are kept', () => {
    expect(ownPagePath('https://i36o.web.app/md/?file=books%2Fx.md#p=2:45')).toBe('/md/index.html?file=books%2Fx.md#p=2:45')
    expect(ownPagePath('https://i36o.web.app/cse/?q=%D8%B9%D9%84%D9%85&word=1')).toBe('/cse/index.html?q=%D8%B9%D9%84%D9%85&word=1')
  })

  test('anything else is not ours', () => {
    for (const url of [
      'https://i36o.web.app/',                 // the app's home
      'https://i36o.web.app/other/',            // not one of the pages
      'http://i36o.web.app/md/',                // not https
      'https://example.com/md/',                // another site
      'https://i36o.web.app.example.com/md/',   // look-alike host
      'not a url',
    ]) expect(ownPagePath(url), url).toBeNull()
  })

  test('outside the installed app (the web), nothing is redirected', () => {
    native.on = false
    expect(ownPagePath('https://i36o.web.app/md/')).toBeNull()
  })
})

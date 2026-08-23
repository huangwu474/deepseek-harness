// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  GUEST_DISPLAY_NAME_CHANGED,
  hasDesktopSessionMenu,
  notifyGuestDisplayNameChanged,
  readDesktopAccountApi,
  readDesktopGuestDisplayName,
  type DesktopAccountApi,
} from '../src/client/desktop-account.ts'

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'dshDesktop')
})

function installDesktop(api: DesktopAccountApi): void {
  ;(globalThis as { dshDesktop?: DesktopAccountApi }).dshDesktop = api
}

describe('readDesktopAccountApi', () => {
  it('returns undefined without a preload object', () => {
    expect(readDesktopAccountApi()).toBeUndefined()
  })

  it('returns the preload object when present', () => {
    const api: DesktopAccountApi = {
      logout: async () => ({ ok: true as const }),
      setGuestDisplayName: async () => ({ ok: true as const }),
    }
    installDesktop(api)
    expect(readDesktopAccountApi()).toBe(api)
  })
})

describe('readDesktopGuestDisplayName', () => {
  it('returns undefined outside the shell', async () => {
    await expect(readDesktopGuestDisplayName()).resolves.toBeUndefined()
  })

  it('returns a trimmed name from preload', async () => {
    installDesktop({
      getGuestDisplayName: async () => '  阿木  ',
    })
    await expect(readDesktopGuestDisplayName()).resolves.toBe('阿木')
  })

  it('returns undefined for a blank or non-string value', async () => {
    installDesktop({
      getGuestDisplayName: async () => '   ',
    })
    await expect(readDesktopGuestDisplayName()).resolves.toBeUndefined()
    ;(globalThis as { dshDesktop?: { getGuestDisplayName: () => Promise<unknown> } }).dshDesktop = {
      getGuestDisplayName: async () => 12,
    }
    await expect(readDesktopGuestDisplayName()).resolves.toBeUndefined()
  })

  it('returns undefined when preload throws', async () => {
    installDesktop({
      getGuestDisplayName: async () => { throw new Error('invoke failed') },
    })
    await expect(readDesktopGuestDisplayName()).resolves.toBeUndefined()
  })
})

describe('hasDesktopSessionMenu', () => {
  it('requires both logout and checkUpdates', () => {
    expect(hasDesktopSessionMenu(undefined)).toBe(false)
    expect(hasDesktopSessionMenu({
      logout: async () => ({ ok: true }),
    })).toBe(false)
    expect(hasDesktopSessionMenu({
      checkUpdates: async () => ({ ok: true }),
    })).toBe(false)
    expect(hasDesktopSessionMenu({
      setGuestDisplayName: async () => ({ ok: true }),
    })).toBe(false)
    expect(hasDesktopSessionMenu({
      logout: async () => ({ ok: true }),
      checkUpdates: async () => ({ ok: true }),
    })).toBe(true)
  })
})

describe('notifyGuestDisplayNameChanged', () => {
  it('dispatches a same-document event', () => {
    const seen: string[] = []
    const listener = (): void => { seen.push(GUEST_DISPLAY_NAME_CHANGED) }
    globalThis.addEventListener(GUEST_DISPLAY_NAME_CHANGED, listener)
    notifyGuestDisplayNameChanged()
    globalThis.removeEventListener(GUEST_DISPLAY_NAME_CHANGED, listener)
    expect(seen).toEqual([GUEST_DISPLAY_NAME_CHANGED])
  })
})

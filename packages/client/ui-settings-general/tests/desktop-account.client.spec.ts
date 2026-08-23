// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  GUEST_DISPLAY_NAME_CHANGED,
  notifyGuestDisplayNameChanged,
  readDesktopAccountApi,
  readDesktopGuestDisplayName,
} from '../src/client/desktop-account.ts'

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'dshDesktop')
})

describe('readDesktopAccountApi', () => {
  it('returns undefined without a preload object', () => {
    expect(readDesktopAccountApi()).toBeUndefined()
  })

  it('returns the preload object when present', () => {
    const api = {
      logout: async () => ({ ok: true as const }),
      setGuestDisplayName: async () => ({ ok: true as const }),
    }
    ;(globalThis as unknown as { dshDesktop: typeof api }).dshDesktop = api
    expect(readDesktopAccountApi()).toBe(api)
  })
})

describe('readDesktopGuestDisplayName', () => {
  it('returns undefined outside the shell', async () => {
    await expect(readDesktopGuestDisplayName()).resolves.toBeUndefined()
  })

  it('returns a trimmed name from preload', async () => {
    ;(globalThis as unknown as {
      dshDesktop: { getGuestDisplayName: () => Promise<string | undefined> }
    }).dshDesktop = {
      getGuestDisplayName: async () => '  阿木  ',
    }
    await expect(readDesktopGuestDisplayName()).resolves.toBe('阿木')
  })

  it('returns undefined for a blank or non-string value', async () => {
    ;(globalThis as unknown as {
      dshDesktop: { getGuestDisplayName: () => Promise<unknown> }
    }).dshDesktop = {
      getGuestDisplayName: async () => '   ',
    }
    await expect(readDesktopGuestDisplayName()).resolves.toBeUndefined()
    ;(globalThis as unknown as {
      dshDesktop: { getGuestDisplayName: () => Promise<unknown> }
    }).dshDesktop = {
      getGuestDisplayName: async () => 12,
    }
    await expect(readDesktopGuestDisplayName()).resolves.toBeUndefined()
  })

  it('returns undefined when preload throws', async () => {
    ;(globalThis as unknown as {
      dshDesktop: { getGuestDisplayName: () => Promise<string> }
    }).dshDesktop = {
      getGuestDisplayName: async () => { throw new Error('invoke failed') },
    }
    await expect(readDesktopGuestDisplayName()).resolves.toBeUndefined()
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

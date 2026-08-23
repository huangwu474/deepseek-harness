/**
 * Optional Electron account API the loopback Web UI may call through preload.
 * A browser tab has no such object; the Account page then omits rename,
 * logout, and clear.
 */

/** Result of a desktop account invoke. Never includes a navigation URL. */
export interface DesktopAccountResult {
  /** True only when main accepted the request. */
  ok: boolean
  /** Present when `ok` is false. */
  error?: string
}

/** Preload-exposed account methods. Each method is optional. */
export interface DesktopAccountApi {
  /**
   * Return the window to the local login gate. Loopback documents only.
   * @returns Whether navigation started.
   */
  logout?: () => Promise<DesktopAccountResult>
  /**
   * Read the guest display name saved at the login gate.
   * @returns Normalized name, or `undefined` when unset.
   */
  getGuestDisplayName?: () => Promise<string | undefined>
  /**
   * Persist a guest display name. Blank input clears the store.
   * @param displayName - Raw field value.
   * @returns Whether the store accepted the write.
   */
  setGuestDisplayName?: (displayName: string) => Promise<DesktopAccountResult>
  /**
   * Remove the guest display name and the nickname-guide completion marker.
   * @returns Whether the store accepted the clear.
   */
  clearGuestProfile?: () => Promise<DesktopAccountResult>
}

/** Matches desktop `GUEST_DISPLAY_NAME_MAX`; empty input is not stored. */
export const GUEST_DISPLAY_NAME_MAX = 32

/** Window event after a same-document guest-name write so listeners reread. */
export const GUEST_DISPLAY_NAME_CHANGED = 'dsh-guest-display-name-changed'

/**
 * Notify same-document listeners that the guest display name may have changed.
 */
export function notifyGuestDisplayNameChanged(): void {
  globalThis.dispatchEvent(new Event(GUEST_DISPLAY_NAME_CHANGED))
}

/**
 * Read the desktop account API when `window.dshDesktop` is present.
 * @returns The API object, or `undefined` in a browser tab.
 */
export function readDesktopAccountApi(): DesktopAccountApi | undefined {
  return (globalThis as { dshDesktop?: DesktopAccountApi }).dshDesktop
}

/**
 * Read a guest display name from the desktop preload when present.
 * @returns Normalized name, or `undefined` outside the shell / when unset.
 */
export async function readDesktopGuestDisplayName(): Promise<string | undefined> {
  const api = (globalThis as {
    dshDesktop?: { getGuestDisplayName?: () => Promise<string | undefined> }
  }).dshDesktop
  if (typeof api?.getGuestDisplayName !== 'function') return undefined
  try {
    const name = await api.getGuestDisplayName()
    return typeof name === 'string' && name.trim() !== '' ? name.trim() : undefined
  } catch {
    // Preload invoke failure — keep the localized Guest fallback.
    return undefined
  }
}

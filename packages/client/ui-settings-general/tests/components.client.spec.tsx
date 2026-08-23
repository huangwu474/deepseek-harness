// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import type { GeneralSectionComponentProps } from '../src/client/GeneralSection.tsx'
import { GeneralSection } from '../src/client/GeneralSection.tsx'
import { AccountSection } from '../src/client/AccountSection.tsx'
import { CloseLabel, HeaderContent, TriggerContent } from '../src/client/chrome.tsx'
import {
  GUEST_DISPLAY_NAME_CHANGED,
} from '../src/client/desktop-account.ts'
import type { TriggerContentProps } from '../src/client/chrome.tsx'
import { SettingsDocumentAction } from '../src/client/SettingsDocumentAction.tsx'
import { SettingsDescribeMirror } from '@deepseek-ai/dsh-client-ui-settings/src/client/settings-mirror.ts'
import { SettingsDocumentStore } from '../src/client/settings-document-store.ts'

/** Store over a real mirror derived from the same fake wire. */
function derivedDocumentStore(api: object) {
  const wire = api as never
  return new SettingsDocumentStore(wire, new SettingsDescribeMirror(wire))
}
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

// The seat's key domain is settings ∪ common; the stub answers from the
// package dictionary and falls back to the key like the real chain.
const t: TriggerContentProps['t'] = key => (en as Record<string, string>)[key] ?? key

// Global standard kit stubs: none of these components consume the hooks.
const unusedHook = (() => { throw new Error('unused by settings-general components') }) as never
const kit = { useSessions: unusedHook, useWorkspaces: unusedHook }

describe('chrome content', () => {
  it('TriggerContent renders the icon with the label in the wide column', () => {
    const { container } = render(<TriggerContent {...kit} wide t={t} />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(screen.getByText('Settings')).toBeTruthy()
  })

  it('TriggerContent drops the label in the rail state', () => {
    const { container } = render(<TriggerContent {...kit} wide={false} t={t} />)
    expect(container.querySelector('svg')).toBeTruthy()
    expect(screen.queryByText('Settings')).toBeNull()
  })

  it('HeaderContent and CloseLabel render their translated text', () => {
    render(<HeaderContent {...kit} t={t} />)
    render(<CloseLabel {...kit} t={t} />)
    expect(screen.getByText('Settings')).toBeTruthy()
    expect(screen.getByText('Close')).toBeTruthy()
  })
})

describe('AccountSection', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'dshDesktop')
  })

  function installDesktop(api: Record<string, unknown>): void {
    ;(globalThis as unknown as { dshDesktop: typeof api }).dshDesktop = api
  }

  it('shows the guest fallback without a desktop API', () => {
    render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    expect(screen.getByText('Account management')).toBeTruthy()
    expect(screen.getByText('Guest')).toBeTruthy()
    expect(screen.getByText('Local guest')).toBeTruthy()
    expect(screen.getByText('Profile is stored only on this device')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Log out' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear profile' })).toBeNull()
  })

  it('saves a nickname and notifies same-document listeners', async () => {
    const setGuestDisplayName = vi.fn(async () => ({ ok: true as const }))
    installDesktop({
      logout: async () => ({ ok: true }),
      getGuestDisplayName: async () => '阿木',
      setGuestDisplayName,
      clearGuestProfile: async () => ({ ok: true }),
    })
    const seen: string[] = []
    const listener = (): void => { seen.push('changed') }
    globalThis.addEventListener(GUEST_DISPLAY_NAME_CHANGED, listener)
    render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    expect(await screen.findByText('阿木')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  青砚  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => { expect(setGuestDisplayName).toHaveBeenCalledWith('  青砚  ') })
    expect(seen).toEqual(['changed'])
    expect(await screen.findByText('青砚')).toBeTruthy()
    globalThis.removeEventListener(GUEST_DISPLAY_NAME_CHANGED, listener)
  })

  it('clears a blank nickname back to Guest', async () => {
    const setGuestDisplayName = vi.fn(async () => ({ ok: true as const }))
    installDesktop({
      getGuestDisplayName: async () => '阿木',
      setGuestDisplayName,
    })
    render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    expect(await screen.findByText('阿木')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    await waitFor(() => { expect(setGuestDisplayName).toHaveBeenCalledWith('   ') })
    expect(await screen.findByText('Guest')).toBeTruthy()
  })

  it('cancels an in-progress edit', async () => {
    installDesktop({
      getGuestDisplayName: async () => '阿木',
      setGuestDisplayName: async () => ({ ok: true }),
    })
    render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    expect(await screen.findByText('阿木')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'discard' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
    expect(screen.queryByRole('textbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('阿木')).toBeTruthy()
  })

  it('starts an empty draft when no nickname is stored', async () => {
    installDesktop({
      setGuestDisplayName: async () => ({ ok: true }),
    })
    render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
  })

  it('reports a save failure and keeps the editor open', async () => {
    const setGuestDisplayName = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: 'disk full' })
      .mockResolvedValueOnce({ ok: false })
    installDesktop({ setGuestDisplayName })
    render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect((await screen.findByRole('alert')).textContent).toBe('disk full')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Could not save the display name')
    expect(screen.getByRole('textbox')).toBeTruthy()
  })

  it('logs out through preload after closing settings', async () => {
    const logout = vi.fn(async () => ({ ok: true as const }))
    const close = vi.fn()
    installDesktop({ logout })
    render(<AccountSection {...kit} close={close} t={t} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Log out' }))
    expect(close).toHaveBeenCalledOnce()
    expect(logout).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear profile' })).toBeNull()
  })

  it('clears the guest profile only after confirmation', async () => {
    const clearGuestProfile = vi.fn(async () => ({ ok: true as const }))
    installDesktop({
      getGuestDisplayName: async () => '青砚',
      setGuestDisplayName: async () => ({ ok: true }),
      clearGuestProfile,
    })
    const seen: string[] = []
    const listener = (): void => { seen.push('changed') }
    globalThis.addEventListener(GUEST_DISPLAY_NAME_CHANGED, listener)
    render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    expect(await screen.findByText('青砚')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear profile' }))
    expect(clearGuestProfile).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(clearGuestProfile).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear profile' }))
    fireEvent.click(screen.getByText('Cancel'))
    expect(clearGuestProfile).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Clear profile' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await waitFor(() => { expect(clearGuestProfile).toHaveBeenCalledOnce() })
    expect(await screen.findByText('Guest')).toBeTruthy()
    expect(seen).toEqual(['changed'])
    globalThis.removeEventListener(GUEST_DISPLAY_NAME_CHANGED, listener)
  })

  it('reports a clear failure without wiping the nickname', async () => {
    const clearGuestProfile = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: 'locked' })
      .mockResolvedValueOnce({ ok: false })
    installDesktop({
      getGuestDisplayName: async () => '青砚',
      clearGuestProfile,
    })
    render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    expect(await screen.findByText('青砚')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear profile' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect((await screen.findByRole('alert')).textContent).toBe('locked')
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Could not clear the guest profile')
    expect(screen.getByText('青砚')).toBeTruthy()
  })

  it('ignores a late display-name read after unmount', async () => {
    let resolveName!: (value: string) => void
    installDesktop({
      getGuestDisplayName: () => new Promise<string>((resolve) => { resolveName = resolve }),
    })
    const view = render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    view.unmount()
    resolveName('late')
    await Promise.resolve()
    expect(screen.queryByText('late')).toBeNull()
  })

  it('does not save or clear when the matching preload method is removed', async () => {
    const api: {
      setGuestDisplayName?: () => Promise<{ ok: true }>
      clearGuestProfile?: () => Promise<{ ok: true }>
    } = {
      setGuestDisplayName: async () => ({ ok: true }),
      clearGuestProfile: async () => ({ ok: true }),
    }
    installDesktop(api)
    render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    delete api.setGuestDisplayName
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('textbox')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    delete api.clearGuestProfile
    fireEvent.click(screen.getByRole('button', { name: 'Clear profile' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    await Promise.resolve()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('disables the editor while a save is in flight', async () => {
    let resolveSave!: (value: { ok: true }) => void
    installDesktop({
      setGuestDisplayName: () => new Promise<{ ok: true }>((resolve) => { resolveSave = resolve }),
    })
    render(<AccountSection {...kit} close={vi.fn()} t={t} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
    resolveSave({ ok: true })
    await waitFor(() => { expect(screen.queryByRole('textbox')).toBeNull() })
  })
})

describe('GeneralSection', () => {
  function mount() {
    const renderSlot = vi.fn(
      ((key: string) => <div data-testid={`slot-${key}`} />) as GeneralSectionComponentProps['renderSlot'],
    )
    const props: GeneralSectionComponentProps = { ...kit, renderSlot, close: vi.fn() }
    const view = render(<GeneralSection {...props} />)
    return { view, renderSlot }
  }

  it('renders the item slot as the section body', () => {
    const { renderSlot } = mount()
    expect(renderSlot).toHaveBeenCalledWith('settings.general.item', {})
    expect(screen.getByTestId('slot-settings.general.item')).toBeTruthy()
  })
})

describe('SettingsDocumentAction', () => {
  it('appears only for a file-backed provider and requests its Host-owned document', async () => {
    const openDocument = vi.fn(() => Promise.resolve({
      rpcId: 'document-open' as never,
      result: { ok: true as const, value: { opened: true as const } },
    }))
    const controller = derivedDocumentStore({
      settings: {
        describe: vi.fn(() => Promise.resolve({
          rpcId: 'document-action' as never,
          result: {
            ok: true as const,
            value: { writable: true, hasDocument: true, namespaces: [] },
          },
        })),
        openDocument,
      },
    })
    render(<SettingsDocumentAction
      {...kit}
      t={t}
      controller={controller}
      useSnapshot={bindSnapshotSelector(controller.store)}
    />)
    const action = await screen.findByRole('button', { name: 'Open configuration file' })
    fireEvent.click(action)
    await waitFor(() => { expect(openDocument).toHaveBeenCalledWith({}) })
  })

  it('stays absent without a document and follows a mirror refresh to available', async () => {
    const describe = vi.fn()
      .mockResolvedValueOnce({
        rpcId: 'document-action-absent' as never,
        result: { ok: true as const, value: { writable: true, hasDocument: false, namespaces: [] } },
      })
      .mockResolvedValueOnce({
        rpcId: 'document-action-ready' as never,
        result: { ok: true as const, value: { writable: true, hasDocument: true, namespaces: [] } },
      })
    const wire = { settings: { describe, openDocument: vi.fn() } } as never
    const mirror = new SettingsDescribeMirror(wire)
    const controller = new SettingsDocumentStore(wire, mirror)
    const first = render(<SettingsDocumentAction
      {...kit}
      t={t}
      controller={controller}
      useSnapshot={bindSnapshotSelector(controller.store)}
    />)
    await waitFor(() => { expect(controller.store.getSnapshot().status).toBe('unavailable') })
    expect(screen.queryByRole('button', { name: 'Open configuration file' })).toBeNull()
    first.unmount()
    render(<SettingsDocumentAction
      {...kit}
      t={t}
      controller={controller}
      useSnapshot={bindSnapshotSelector(controller.store)}
    />)
    // A remount alone re-reads nothing; availability moves with the mirror's
    // own refresh (a document commit or reconnect in production).
    await waitFor(() => { expect(controller.store.getSnapshot().status).toBe('unavailable') })
    expect(describe).toHaveBeenCalledTimes(1)
    await mirror.load()
    expect(await screen.findByRole('button', { name: 'Open configuration file' })).toBeTruthy()
    expect(describe).toHaveBeenCalledTimes(2)
  })

  it('keeps the action available and reports a native-open failure', async () => {
    const controller = derivedDocumentStore({
      settings: {
        describe: vi.fn(() => Promise.resolve({
          rpcId: 'document-action' as never,
          result: {
            ok: true as const,
            value: { writable: true, hasDocument: true, namespaces: [] },
          },
        })),
        openDocument: vi.fn(() => Promise.resolve({
          rpcId: 'document-open-failed' as never,
          result: { ok: false as const, error: { code: 'internal' as const, message: 'xdg-open missing', details: {} } },
        })),
      },
    })
    render(<SettingsDocumentAction
      {...kit}
      t={t}
      controller={controller}
      useSnapshot={bindSnapshotSelector(controller.store)}
    />)
    fireEvent.click(await screen.findByRole('button', { name: 'Open configuration file' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Could not open configuration file')
    expect(screen.getByRole('button', { name: 'Open configuration file' })).toBeTruthy()
  })
})

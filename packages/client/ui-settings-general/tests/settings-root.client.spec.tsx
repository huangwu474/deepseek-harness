// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useEffect, useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { SettingsRootComponentProps } from '../src/client/shell-contract.ts'
import { SettingsRoot } from '../src/client/SettingsRoot.tsx'
import type { DesktopAccountApi } from '../src/client/desktop-account.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(globalThis, 'dshDesktop')
})

function installDesktop(api: DesktopAccountApi): void {
  ;(globalThis as { dshDesktop?: DesktopAccountApi }).dshDesktop = api
}

type Row = { id: string; order: number; label: string }
type Step = { id: string; order: number }

/** Slot-content stand-ins: the shell renders whatever the seats contribute. */
const SEAT_CONTENT: Record<string, string> = {
  'settings.trigger': 'Guest',
  'settings.header': 'Settings Title',
  'settings.action': 'Open configuration file',
  'settings.close': 'Close',
}

const t: SettingsRootComponentProps['t'] = key => (en as Record<string, string>)[key] ?? key

function mount({
  wide = true,
  onboardingActive = true,
  setTheme,
  preference = 'system',
  rows = [
    { id: 'general', order: 0, label: 'General' },
    { id: 'models', order: 10, label: 'Models' },
    { id: 'agent-presets', order: 20, label: 'Agent presets' },
  ],
  steps = [
    { id: 'welcome', order: -100 },
    { id: 'credential', order: 0 },
  ],
}: {
  wide?: boolean
  onboardingActive?: boolean
  rows?: Row[]
  steps?: Step[]
  setTheme?: (preference: 'light' | 'dark' | 'system') => void
  preference?: 'light' | 'dark' | 'system'
} = {}) {
  // Mutable row source standing in for the bound useSections hook; bump()
  // plays a ledger change through the same observable contract.
  let current = rows
  const listeners = new Set<() => void>()
  const renderSlot = vi.fn(
    ((key: string, _owner: unknown, opts?: { only?: string }) => {
      if (key === 'settings.section') return <div data-testid={`section-${opts?.only ?? 'all'}`} />
      return SEAT_CONTENT[key]
    }) as SettingsRootComponentProps['renderSlot'],
  )
  const useSessions = ((select: (state: unknown) => unknown) => select(onboardingActive
    ? { phase: 'ready', current: undefined, byId: {} }
    : {
      phase: 'ready',
      current: 'active-session',
      byId: { 'active-session': { blank: false } },
    })) as never
  const unusedHook = (() => { throw new Error('unused by SettingsRoot') }) as never
  const props: SettingsRootComponentProps = {
    t,
    useSessions,
    useWorkspaces: unusedHook,
    wide,
    useOnboardingSteps: select => select(steps),
    useThemePreference: select => select(preference),
    ...(setTheme === undefined ? {} : { setTheme }),
    useSections: (select) => {
      const [, force] = useState(0)
      useEffect(() => {
        const listener = () => { force(n => n + 1) }
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      }, [])
      return select(current)
    },
    renderSlot,
  }
  const view = render(<SettingsRoot {...props} />)
  const bump = (next: Row[]) => {
    act(() => {
      current = next
      for (const fn of [...listeners]) fn()
    })
  }
  return { view, renderSlot, bump, listeners }
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Guest' }))
}

function openPanel() {
  openMenu()
  fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }))
}

describe('SettingsRoot account trigger', () => {
  it('opens a menu from the trigger, then Settings from a menuitem', () => {
    const { renderSlot } = mount()
    const trigger = screen.getByRole('button', { name: 'Guest' })
    expect(trigger.hasAttribute('aria-label')).toBe(false)
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(renderSlot).toHaveBeenCalledWith('settings.trigger', { wide: true })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    openMenu()
    expect(screen.getByRole('menu')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Guest', expanded: true })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guest', expanded: false })).toBeTruthy()
  })

  it('toggles the menu closed from the trigger and from Escape', () => {
    mount()
    const trigger = screen.getByRole('button', { name: 'Guest' })
    fireEvent.click(trigger)
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.click(trigger)
    expect(screen.queryByRole('menu')).toBeNull()
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('hands the rail state to the trigger seat', () => {
    const { renderSlot } = mount({ wide: false })
    expect(renderSlot).toHaveBeenCalledWith('settings.trigger', { wide: false })
  })

  it('omits Appearance without setTheme, and desktop rows without dshDesktop', () => {
    mount()
    openMenu()
    expect(screen.queryByRole('menuitem', { name: 'Appearance' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Check for updates' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Log out' })).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Help & feedback' })).toBeTruthy()
  })

  it('writes the theme preference from the Appearance submenu', () => {
    const setTheme = vi.fn()
    mount({ setTheme, preference: 'dark' })
    openMenu()
    const appearance = screen.getByRole('menuitem', { name: 'Appearance' })
    fireEvent.mouseEnter(appearance.parentElement!)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Light' }))
    expect(setTheme).toHaveBeenCalledWith('light')
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Appearance' }))
    expect(setTheme).toHaveBeenCalledTimes(1)
  })

  it('shows a local help notice without leaving the page', () => {
    mount()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Help & feedback' }))
    expect(screen.getByRole('dialog', { name: 'Help & feedback' })).toBeTruthy()
    expect(screen.getByText(/CORKS runs on this computer/)).toBeTruthy()
    fireEvent.click(screen.getByText('Close'))
    expect(screen.queryByRole('dialog', { name: 'Help & feedback' })).toBeNull()
  })

  it('calls desktop logout and update check when preload APIs exist', async () => {
    const logout = vi.fn(async () => ({ ok: true }))
    const checkUpdates = vi.fn(async () => ({ ok: true }))
    installDesktop({ logout, checkUpdates })
    mount()
    openMenu()
    expect(screen.getByRole('menuitem', { name: 'Check for updates' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Check for updates' }))
    await vi.waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Check for updates' })).toBeTruthy()
    })
    expect(checkUpdates).toHaveBeenCalledOnce()
    expect(screen.getByText(/source preview/i)).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Check for updates' })).toBeNull()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }))
    expect(logout).toHaveBeenCalledOnce()
  })

  it('omits logout and updates when only one desktop session method exists', () => {
    installDesktop({
      logout: async () => ({ ok: true }),
      setGuestDisplayName: async () => ({ ok: true }),
    })
    mount()
    openMenu()
    expect(screen.queryByRole('menuitem', { name: 'Check for updates' })).toBeNull()
    expect(screen.queryByRole('menuitem', { name: 'Log out' })).toBeNull()
  })

  it('shows the preload message or error from an update check', async () => {
    const checkUpdates = vi.fn()
      .mockResolvedValueOnce({ ok: true, message: 'already current' })
      .mockResolvedValueOnce({ ok: false, error: 'offline' })
      .mockResolvedValueOnce({ ok: false })
    installDesktop({
      logout: async () => ({ ok: true }),
      checkUpdates,
    })
    mount()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Check for updates' }))
    expect(await screen.findByText('already current')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Check for updates' }))
    expect(await screen.findByText('offline')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Check for updates' }))
    expect(await screen.findByText(/source preview/i)).toBeTruthy()
  })

  it('shows the localized update copy when checkUpdates rejects', async () => {
    installDesktop({
      logout: async () => ({ ok: true }),
      checkUpdates: async () => { throw new Error('ipc failed') },
    })
    mount()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Check for updates' }))
    expect(await screen.findByRole('dialog', { name: 'Check for updates' })).toBeTruthy()
    expect(screen.getByText(/source preview/i)).toBeTruthy()
  })

  it('swallows a rejected logout from the account menu', async () => {
    const logout = vi.fn(async () => { throw new Error('ipc failed') })
    installDesktop({
      logout,
      checkUpdates: async () => ({ ok: true }),
    })
    mount()
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Log out' }))
    await vi.waitFor(() => { expect(logout).toHaveBeenCalledOnce() })
  })

  it('writes dark and system appearance ids', () => {
    const setTheme = vi.fn()
    mount({ setTheme, preference: 'light' })
    openMenu()
    const appearance = screen.getByRole('menuitem', { name: 'Appearance' })
    fireEvent.mouseEnter(appearance.parentElement!)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dark' }))
    expect(setTheme).toHaveBeenCalledWith('dark')
    openMenu()
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: 'Appearance' }).parentElement!)
    fireEvent.click(screen.getByRole('menuitem', { name: 'System' }))
    expect(setTheme).toHaveBeenCalledWith('system')
  })
})

describe('SettingsPanel chrome seats', () => {
  it('names the dialog via aria-labelledby pointing at the header seat node', () => {
    mount()
    openPanel()
    const dialog = screen.getByRole('dialog')
    const titleId = dialog.getAttribute('aria-labelledby')!
    expect(titleId).toBeTruthy()
    const title = document.getElementById(titleId)!
    expect(title.textContent).toBe('Settings Title')
    expect(screen.getByRole('dialog', { name: 'Settings Title' })).toBeTruthy()
  })

  it('names the close button through the visually-hidden close seat text', () => {
    mount()
    openPanel()
    const close = screen.getByRole('button', { name: 'Close' })
    expect(close.hasAttribute('aria-label')).toBe(false)
    expect(close.textContent).toContain('Close')
  })

  it('renders header actions before the shell-owned close control', () => {
    const { renderSlot } = mount()
    openPanel()
    expect(screen.getByText('Open configuration file')).toBeTruthy()
    expect(renderSlot).toHaveBeenCalledWith('settings.action', {})
  })
})

describe('SettingsPanel close paths', () => {
  it('closes via the header button', () => {
    mount()
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes via a mask click', () => {
    mount()
    openPanel()
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog.parentElement!.firstElementChild!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes via document-level Escape and unhooks the listener with the panel', () => {
    mount()
    openPanel()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    // Ignored while closed (listener removed with the panel) and non-Escape
    // keys are ignored while open.
    fireEvent.keyDown(document, { key: 'Escape' })
    openPanel()
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('lands focus on the close button when the dialog opens', () => {
    mount()
    openPanel()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
  })
})

describe('SettingsPanel navigation', () => {
  it('projects rows, marks the first active, and renders only that section', () => {
    mount()
    openPanel()
    expect(screen.getByRole('button', { name: 'General' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('button', { name: 'Models' }).getAttribute('aria-current')).toBeNull()
    expect(screen.getByTestId('section-general')).toBeTruthy()
  })

  it('gives every section a nav glyph, distinct for the ids the shell knows', () => {
    mount({
      rows: [
        { id: 'account', order: -10, label: 'Account' },
        { id: 'general', order: 0, label: 'General' },
        { id: 'models', order: 10, label: 'Models' },
        { id: 'agent-presets', order: 20, label: 'Agent presets' },
        { id: 'plugins', order: 30, label: 'Plugins' },
        { id: 'contributed', order: 40, label: 'Contributed' },
      ],
    })
    openPanel()
    // Glyphs carry no id of their own, so the drawn paths are what tells them apart.
    const glyphs = ['Account', 'General', 'Models', 'Agent presets', 'Plugins', 'Contributed']
      .map(name => screen.getByRole('button', { name }).querySelector('svg')?.innerHTML)

    expect(glyphs.every(glyph => glyph !== undefined && glyph !== '')).toBe(true)
    // Named ids get their own glyph; an unknown section shares the gear with General.
    expect(new Set(glyphs.slice(0, 5)).size).toBe(5)
    expect(glyphs[5]).toBe(glyphs[1])
  })

  it('switches the rendered section on nav click', () => {
    mount()
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Models' }))
    expect(screen.getByRole('button', { name: 'Models' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByTestId('section-models')).toBeTruthy()
    expect(screen.queryByTestId('section-general')).toBeNull()
  })

  it('mounts onboarding steps in order and transfers ownership only on completion', () => {
    const { renderSlot } = mount()
    const first = renderSlot.mock.calls.find(call => call[0] === 'settings.onboarding')
    expect(first?.[1]).toMatchObject({ stepId: 'welcome' })
    expect(first?.[2]).toEqual({ only: 'welcome' })
    act(() => {
      (first?.[1] as { complete: () => void }).complete()
      ;(first?.[1] as { complete: () => void }).complete()
    })
    const onboardingCalls = renderSlot.mock.calls.filter(call => call[0] === 'settings.onboarding')
    const second = onboardingCalls.at(-1)
    expect(second?.[1]).toMatchObject({ stepId: 'credential' })
    expect(second?.[2]).toEqual({ only: 'credential' })

    act(() => {
      (second?.[1] as { openSection: (id: string) => void }).openSection('models')
    })
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByTestId('section-models')).toBeTruthy()

    cleanup()
    const inactive = mount({ onboardingActive: false }).renderSlot.mock.calls
      .filter(call => call[0] === 'settings.onboarding')
    expect(inactive).toHaveLength(0)
  })

  it('paints no takeover chrome of its own around the mounted step', () => {
    // The chrome (mask, opaque stage, #root inert) belongs to the step via
    // the step-owned dialog surface — a mounted-but-deciding step that
    // renders null must show and block nothing (the reload white-flash fix;
    // onboarding-surface.spec.tsx pins the primitive's half).
    const appRoot = document.createElement('div')
    appRoot.id = 'root'
    document.body.append(appRoot)
    const { view } = mount()
    expect(view.container.querySelector('[class*="onboarding"]')).toBeNull()
    expect(document.body.querySelector('[class*="onboarding"]')).toBeNull()
    expect(appRoot.inert).not.toBe(true)
    view.unmount()
    appRoot.remove()
  })

  it('falls back to the first row when the active entry unregisters', () => {
    const { bump } = mount()
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Models' }))
    bump([{ id: 'general', order: 0, label: 'General' }])
    expect(screen.queryByRole('button', { name: 'Models' })).toBeNull()
    expect(screen.getByTestId('section-general')).toBeTruthy()
  })

  it('renders an empty content column when the ledger is empty', () => {
    const { renderSlot } = mount({ rows: [] })
    openPanel()
    expect(screen.getByRole('dialog')).toBeTruthy()
    const sectionCalls = renderSlot.mock.calls.filter(c => c[0] === 'settings.section')
    expect(sectionCalls).toHaveLength(0)
  })

  it('drops the ledger subscription on unmount', () => {
    const { view, listeners } = mount()
    expect(listeners.size).toBe(1)
    view.unmount()
    expect(listeners.size).toBe(0)
  })
})

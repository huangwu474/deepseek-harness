/**
 * Settings shell root: the sidebar-foot account row, its menu, and the
 * centered modal settings panel (figma 501:29947, 1080x700) with the section
 * nav rail. The shell is a pure composition face — every piece of text
 * (trigger label, panel title, close label, sections) arrives from
 * registrants through slots; accessible names resolve to that content
 * (trigger: its own text; dialog: aria-labelledby the title node; close:
 * visually-hidden slot text). Modal open state and the active section id are
 * component-local viewing state; the onboarding coordinator mounts exactly
 * one ordered registrant while the sessions-derived empty-Hero fact is
 * active. Visible dialog chrome belongs to the step, so a mounted-but-deciding
 * step paints nothing here.
 *
 * The foot trigger opens an account menu. Settings is a menu item; Appearance
 * writes the theme preference when the theme service is bound. Help is a
 * local notice. Logout and update checks call the optional Electron preload
 * API and are omitted in a browser tab.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  Button, CorksLogo, IconAgentPresetOutline16, IconCloseOutline16, IconDataOutline16,
  IconDarkOutline16, IconFollowsystemOutline16, IconLightOutline16,
  IconPersonalizationOutline16, IconQuestionOutline14, IconRefreshOutline16,
  IconSettingsOutline16, Menu, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MenuEntry } from '@deepseek-ai/dsh-client-ui-primitives'
import { hasDesktopSessionMenu, readDesktopAccountApi } from './desktop-account.ts'
import type { AccountThemePreference, SettingsRootComponentProps, SettingsSectionRow } from './shell-contract.ts'
import css from './SettingsRoot.module.css'

/** Nav glyph by section id; unknown ids fall back to the settings gear. */
function navIcon(id: string) {
  if (id === 'account') return <CorksLogo className={css.navIcon} size={16} />
  if (id === 'models') return <IconDataOutline16 className={css.navIcon} size={16} />
  if (id === 'agent-presets') return <IconAgentPresetOutline16 className={css.navIcon} size={16} />
  if (id === 'plugins') return <IconPersonalizationOutline16 className={css.navIcon} size={16} />
  return <IconSettingsOutline16 className={css.navIcon} size={16} />
}

/** Door-and-arrow mark for Log out; the primitives catalog has no sign-out glyph. */
function IconSignOut({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.2 2.4h-2.5A1.2 1.2 0 0 0 2.5 3.6v8.8c0 .66.54 1.2 1.2 1.2h2.5v-1.2H3.7V3.6h2.5V2.4Zm6.66 5.1-2.4-2.4-.85.85 1.38 1.37H6.2v1.2h4.79L9.61 9.89l.85.85 2.4-2.4a.6.6 0 0 0 0-.84Z"
        fill="currentColor"
      />
    </svg>
  )
}

type PanelProps = {
  rows: readonly SettingsSectionRow[]
  renderSlot: SettingsRootComponentProps['renderSlot']
  activeId: string | undefined
  onSelect: (id: string) => void
  onClose: () => void
}

/**
 * The modal layer: full-viewport mask + centered panel. Close paths: the
 * header button, a mask click, and document-level Escape (mounted only while
 * open, so the listener lifetime is the panel's).
 */
function SettingsPanel({ rows, renderSlot, activeId, onSelect, onClose }: PanelProps) {
  // Entries can unmount underneath the requested id, so the render-time
  // projection falls back to the first row when the id is gone.
  const active = rows.find(r => r.id === activeId)?.id ?? rows[0]?.id
  const titleId = useId()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [onClose])

  // Baseline focus management: entering the dialog lands on the close button.
  const closeButton = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { closeButton.current?.focus() }, [])

  return (
    <div className={css.overlay} role="presentation">
      <div className={css.mask} aria-hidden="true" onClick={onClose} />
      <div className={css.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <nav className={css.nav}>
          <div className={css.navTitle} id={titleId}>{renderSlot('settings.header', {})}</div>
          <div className={css.navList}>
            {rows.map(row => (
              <button
                key={row.id}
                type="button"
                className={clsx(css.navCell, row.id === active && css.active)}
                aria-current={row.id === active ? 'true' : undefined}
                onClick={() => { onSelect(row.id) }}
              >
                {navIcon(row.id)}
                <span className={css.navLabel}>{row.label}</span>
              </button>
            ))}
          </div>
        </nav>
        <div className={css.content}>
          <div className={css.header}>
            <div className={css.actions}>{renderSlot('settings.action', {})}</div>
            <button ref={closeButton} type="button" className={css.close} onClick={onClose}>
              <IconCloseOutline16 size={14} />
              <span className={css.hiddenLabel}>{renderSlot('settings.close', {})}</span>
            </button>
          </div>
          <div className={css.options}>
            {active !== undefined && renderSlot('settings.section', { close: onClose }, { only: active })}
          </div>
        </div>
      </div>
    </div>
  )
}

type Notice = { title: string; body: string }

/**
 * Render the account trigger, menu, settings panel, and local notices.
 * @param props - composed slot props (contract/slots.ts).
 * @returns the settings shell element tree.
 */
export function SettingsRoot(props: SettingsRootComponentProps) {
  const { wide, useSections, useOnboardingSteps, useSessions, useThemePreference, setTheme, renderSlot, t } = props
  const [menuOpen, setMenuOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const [notice, setNotice] = useState<Notice | undefined>(undefined)
  const [completedOnboarding, setCompletedOnboarding] = useState<ReadonlySet<string>>(() => new Set())
  const close = useCallback(() => {
    setPanelOpen(false)
    setActiveId(undefined)
  }, [])
  const openSection = useCallback((id: string) => {
    setMenuOpen(false)
    setActiveId(id)
    setPanelOpen(true)
  }, [])

  // The ledger tick keeps the nav rows fresh: registrants re-register with
  // freshly localized text on locale change, and the trigger/header/close
  // seats re-render through their own outlets' subscriptions.
  const rows = useSections(s => s)
  const onboardingSteps = useOnboardingSteps(s => s)
  const preference = useThemePreference(s => s)
  const onboardingActive = useSessions(state =>
    state.phase === 'ready'
    && (state.current === undefined || state.byId[state.current]?.blank === true))
  const onboardingStep = onboardingActive
    ? onboardingSteps.find(step => !completedOnboarding.has(step.id))
    : undefined

  useEffect(() => {
    if (onboardingActive) return
    setCompletedOnboarding(new Set())
  }, [onboardingActive])

  const completeOnboardingStep = useCallback((id: string) => {
    setCompletedOnboarding((previous) => {
      if (previous.has(id)) return previous
      return new Set([...previous, id])
    })
  }, [])

  const desktop = readDesktopAccountApi()
  const sessionMenu = hasDesktopSessionMenu(desktop)
  const appearanceId = `appearance-${preference}` satisfies `appearance-${AccountThemePreference}`
  const items: MenuEntry[] = [
    { id: 'settings', label: t('trigger'), icon: <IconSettingsOutline16 size={16} /> },
    ...(setTheme === undefined
      ? []
      : [{
        id: 'appearance',
        label: t('account.appearance'),
        icon: <IconLightOutline16 size={16} />,
        submenu: [
          { id: 'appearance-light', label: t('account.light'), icon: <IconLightOutline16 size={16} /> },
          { id: 'appearance-dark', label: t('account.dark'), icon: <IconDarkOutline16 size={16} /> },
          { id: 'appearance-system', label: t('account.system'), icon: <IconFollowsystemOutline16 size={16} /> },
        ],
      }]),
    { id: 'help', label: t('account.help'), icon: <IconQuestionOutline14 size={16} /> },
    ...(sessionMenu
      ? [{ id: 'updates', label: t('account.updates'), icon: <IconRefreshOutline16 size={16} /> }]
      : []),
  ]
  const footer: MenuEntry[] | undefined = sessionMenu
    ? [{ id: 'logout', label: t('account.logout'), icon: <IconSignOut />, danger: true }]
    : undefined

  return (
    <>
      <div className={clsx(css.accountMenu, !wide && css.accountMenuRail)}>
        <Menu
          open={menuOpen}
          portal
          side="top"
          selectedId={appearanceId}
          items={items}
          {...(footer === undefined ? {} : { footer })}
          onClose={() => { setMenuOpen(false) }}
          onSelect={(id) => {
            setMenuOpen(false)
            switch (id) {
              case 'settings':
                setActiveId('general')
                setPanelOpen(true)
                return
              case 'appearance-light':
              case 'appearance-dark':
              case 'appearance-system':
                setTheme?.(id.slice('appearance-'.length) as AccountThemePreference)
                return
              case 'help':
                setNotice({ title: t('account.help'), body: t('account.helpBody') })
                return
              case 'updates':
                void desktop?.checkUpdates?.().then((result) => {
                  const body = result.ok
                    ? (result.message ?? t('account.updatesNone'))
                    : (result.error ?? t('account.updatesNone'))
                  setNotice({ title: t('account.updates'), body })
                })
                return
              case 'logout':
                void desktop?.logout?.()
            }
          }}
          anchor={(
            <button
              type="button"
              className={clsx(css.trigger, !wide && css.rail)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => { setMenuOpen(open => !open) }}
            >
              {renderSlot('settings.trigger', { wide })}
            </button>
          )}
        />
      </div>
      {panelOpen && (
        <SettingsPanel
          rows={rows}
          renderSlot={renderSlot}
          activeId={activeId}
          onSelect={setActiveId}
          onClose={close}
        />
      )}
      <Modal
        open={notice !== undefined}
        onClose={() => { setNotice(undefined) }}
        title={notice?.title ?? ''}
        closeLabel={t('close')}
        description={notice?.body ?? ''}
        footer={(
          <Button variant="primary" size="sm" onClick={() => { setNotice(undefined) }}>
            {t('close')}
          </Button>
        )}
      />
      {/* Dialog chrome and `#root` inert ownership live inside each step's
          visible branch. A step still deciding (private facts loading)
          renders null, so nothing paints or blocks while it decides. */}
      {onboardingStep !== undefined && renderSlot('settings.onboarding', {
        stepId: onboardingStep.id,
        complete: () => { completeOnboardingStep(onboardingStep.id) },
        openSection,
      }, { only: onboardingStep.id })}
    </>
  )
}

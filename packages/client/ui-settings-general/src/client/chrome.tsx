/**
 * Shell chrome content registered into the shell's trigger/header seats: the
 * account-row mark + display label (sidebar foot) and the panel title text.
 * The shell renders the surrounding chrome (button, nav heading row) and
 * reads each entry's `label` option for aria text.
 */
import { useEffect, useState } from 'react'
import { CorksLogo } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  GUEST_DISPLAY_NAME_CHANGED,
  readDesktopGuestDisplayName,
} from './desktop-account.ts'
import css from './chrome.module.css'

/** Trigger content props: the sidebar column state + the standard locale seat. */
export type TriggerContentProps = PropsRuntime<'settings.trigger'> & PropsLocale<'settings'>

/** Header content props: the standard locale seat only. */
export type HeaderContentProps = PropsRuntime<'settings.header'> & PropsLocale<'settings'>

/**
 * Render the account-row trigger content (mark; label always present so the
 * rail keeps an accessible name). Desktop guest sessions may replace the
 * localized Guest string with the name saved at the login gate.
 * @param props - composed slot props.
 * @returns the trigger content fragment.
 */
export function TriggerContent({ wide, t }: TriggerContentProps) {
  const fallback = t('account.guest')
  const [label, setLabel] = useState(fallback)
  useEffect(() => {
    let cancelled = false
    const refresh = (): void => {
      setLabel(fallback)
      void readDesktopGuestDisplayName().then((name) => {
        if (!cancelled) setLabel(name ?? fallback)
      })
    }
    refresh()
    globalThis.addEventListener(GUEST_DISPLAY_NAME_CHANGED, refresh)
    return () => {
      cancelled = true
      globalThis.removeEventListener(GUEST_DISPLAY_NAME_CHANGED, refresh)
    }
  }, [fallback])
  return (
    <>
      <span className={css.avatar} aria-hidden="true">
        <CorksLogo size={18} />
      </span>
      <span className={wide ? css.triggerLabel : css.hiddenLabel}>{label}</span>
    </>
  )
}

/**
 * Render the panel title text.
 * @param props - composed slot props.
 * @returns the title text node.
 */
export function HeaderContent({ t }: HeaderContentProps) {
  return <>{t('title')}</>
}

/** Close-button label text props: the standard locale seat only. */
export type CloseLabelProps = PropsRuntime<'settings.close'> & PropsLocale<'settings'>

/**
 * Render the close button's visually-hidden label text.
 * @param props - composed slot props.
 * @returns the label text node.
 */
export function CloseLabel({ t }: CloseLabelProps) {
  return <>{t('close')}</>
}

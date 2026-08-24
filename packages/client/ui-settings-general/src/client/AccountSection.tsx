/** Local guest profile page: nickname, logout, and clear. */
import { useEffect, useState } from 'react'
import {
  Button, CorksLogo, Input, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  GUEST_DISPLAY_NAME_MAX,
  notifyGuestDisplayNameChanged,
  readDesktopAccountApi,
  readDesktopGuestDisplayName,
} from './desktop-account.ts'
import css from './AccountSection.module.css'

/** Account section props: section owner share plus the settings locale seat. */
export type AccountSectionProps =
  PropsRuntime<'settings.section'> & PropsLocale<'settings'>

/**
 * Render the Account settings page for the local guest profile.
 * @param props - composed slot props.
 * @returns the account section.
 */
export function AccountSection({ t, close }: AccountSectionProps) {
  const fallback = t('account.guest')
  const desktop = readDesktopAccountApi()
  const canWrite = typeof desktop?.setGuestDisplayName === 'function'
  const canClear = typeof desktop?.clearGuestProfile === 'function'
  const canLogout = typeof desktop?.logout === 'function'
  const [name, setName] = useState<string | undefined>(undefined)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    void readDesktopGuestDisplayName().then((next) => {
      if (!cancelled) setName(next)
    })
    return () => { cancelled = true }
  }, [])

  const shown = name ?? fallback

  const startEdit = (): void => {
    setDraft(name ?? '')
    setError(undefined)
    setEditing(true)
  }

  const save = async (): Promise<void> => {
    if (desktop?.setGuestDisplayName === undefined) return
    setBusy(true)
    setError(undefined)
    try {
      const result = await desktop.setGuestDisplayName(draft)
      if (!result.ok) {
        setError(result.error ?? t('account.saveError'))
        return
      }
      const next = draft.trim() === '' ? undefined : draft.trim()
      setName(next)
      setEditing(false)
      notifyGuestDisplayNameChanged()
    } catch {
      // Preload invoke or guest-file write rejected.
      setError(t('account.saveError'))
    } finally {
      setBusy(false)
    }
  }

  const logout = (): void => {
    const run = desktop?.logout
    close()
    if (run === undefined) return
    void run().catch(() => {
      // Preload invoke rejected after the panel closed.
    })
  }

  const clearProfile = async (): Promise<void> => {
    if (desktop?.clearGuestProfile === undefined) return
    setBusy(true)
    try {
      const result = await desktop.clearGuestProfile()
      if (!result.ok) {
        setError(result.error ?? t('account.clearError'))
        return
      }
      setConfirming(false)
      setName(undefined)
      setEditing(false)
      notifyGuestDisplayNameChanged()
    } catch {
      // Preload invoke or guest-file write rejected.
      setError(t('account.clearError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={css.section}>
      <h2 className={css.title}>{t('account.title')}</h2>
      <div className={css.profile}>
        <span className={css.avatar} aria-hidden="true">
          <CorksLogo size={22} />
        </span>
        <div className={css.identity}>
          {editing
            ? (
              <div className={css.editRow}>
                <Input
                  value={draft}
                  maxLength={GUEST_DISPLAY_NAME_MAX}
                  autoFocus
                  disabled={busy}
                  aria-label={t('account.title')}
                  onChange={(event) => { setDraft(event.currentTarget.value) }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void save()
                    if (event.key === 'Escape') setEditing(false)
                  }}
                />
                <Button variant="primary" size="sm" disabled={busy} onClick={() => { void save() }}>
                  {t('account.save')}
                </Button>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => { setEditing(false) }}>
                  {t('account.cancel')}
                </Button>
              </div>
            )
            : (
              <div className={css.nameRow}>
                <span className={css.nickname}>{shown}</span>
                {canWrite && (
                  <Button variant="ghost" size="sm" onClick={startEdit}>
                    {t('account.edit')}
                  </Button>
                )}
              </div>
            )}
          <span className={css.role}>{t('account.role')}</span>
          <span className={css.hint}>{t('account.localOnly')}</span>
          {error === undefined ? null : <p className={css.error} role="alert">{error}</p>}
        </div>
      </div>
      {canLogout && (
        <div>
          <Button variant="outline" onClick={logout}>{t('account.logout')}</Button>
        </div>
      )}
      {canClear && (
        <div className={css.danger}>
          <h3 className={css.dangerTitle}>{t('account.clearTitle')}</h3>
          <div className={css.dangerRow}>
            <p className={css.dangerHint}>{t('account.clearHint')}</p>
            <Button
              variant="outline"
              className={css.clear}
              onClick={() => { setConfirming(true) }}
            >
              {t('account.clearAction')}
            </Button>
          </div>
        </div>
      )}
      <Modal
        open={confirming}
        onClose={() => { setConfirming(false) }}
        title={t('account.clearConfirmTitle')}
        closeLabel={t('account.cancel')}
        description={t('account.clearConfirmBody')}
        footer={(
          <>
            <Button variant="outline" autoFocus disabled={busy} onClick={() => { setConfirming(false) }}>
              {t('account.cancel')}
            </Button>
            <Button
              variant="outline"
              className={css.clear}
              disabled={busy}
              onClick={() => { void clearProfile() }}
            >
              {t('account.clearConfirm')}
            </Button>
          </>
        )}
      />
    </div>
  )
}

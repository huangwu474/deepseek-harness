# Agent Note: Settings account management

Status: implemented

English | [中文](2026-08-23-settings-account-management.zh.md)

## Problem

Desktop guests could set a local display name only at the login-gate nickname guide. The settings window had no page to view that profile, rename it, log out without wiping it, or clear it so the guide returns.

## Decision

`ui-settings-general` registers `settings.section` `id: account` at `order: -10` (before General). The page title is 账户管理. It shows the CORKS mark, the stored nickname or localized Guest, 本地游客, and 资料仅保存在这台设备. Edit writes `window.dshDesktop.setGuestDisplayName`; blank input clears `guest-display-name.txt` and the row falls back to Guest. Saving or clearing dispatches a same-document `dsh-guest-display-name-changed` event so listeners can reread the nickname. The settings-gear trigger does not subscribe. Logout still `loadFile`s the login gate and keeps the name plus `guest-onboarding-completed.txt`. 清除资料 confirms, then `clearGuestProfile` removes both files so the next 游客登录 opens the guide. There is no credits, plan, or billing UI.

Loopback Web UI only may invoke set/clear/logout. Browser tabs render the page without those actions. This package calls optional `window.dshDesktop`; it does not add an Electron main process.

## Alternatives considered

**Put rename only in the sidebar account menu.** Rejected because the settings window is the profile home; the menu keeps Settings, Appearance, Help, updates, and Log out.

**Store a second nickname in settings.yaml.** Rejected so the login gate and the Account page share `userData/guest-display-name.txt`.

**Clear the profile on Log out.** Rejected: logout exits the workspace; it does not reset first-run state.

## Consequences

Opening Settings still lands on General. Account is first in the nav. Returning guests already skip the guide via `getGuestOnboardingState`; clearing the profile is the only way to see the guide again.

## Testing

Package tests cover Account registration, nickname save plus the same-document event, confirm-then-clear, and a browser tab that renders the page without set/clear/logout. Tests mock `window.dshDesktop`.

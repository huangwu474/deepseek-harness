# Agent Note: Sidebar account menu

Status: implemented

English | [中文](2026-08-22-sidebar-account-menu.zh.md)

## Problem

The settings shell occupied `sidebar.settings` with a foot trigger that opened the settings dialog directly. A desktop guest session had no account-row control for appearance shortcuts, help, update status, or returning to the Electron login gate without quitting the window. Guests also had no way to choose a local display name for that row.

## Decision

The foot trigger is a full-width account bar (circular CORKS mark plus label), not a content-hug chip. Clicking it opens a portal `Menu` (`side="top"`). Settings is a menuitem that opens the existing modal panel. Appearance is a submenu that calls optional `setTheme` when `ctx.get('theme', false)` succeeds; compositions without `ui-theme` omit the row. Help opens a local `Modal` notice. Check for updates and Log out render only when `window.dshDesktop.logout` and `checkUpdates` both exist.

The account label defaults to localized Guest. On the Electron login gate, an optional display-name field is sent with `shell:enter`; main normalizes and persists it under `userData/guest-display-name.txt`. The Settings Account page writes the same file through `shell:setGuestDisplayName` and can `clearGuestProfile` after confirmation ([account management](2026-08-23-settings-account-management.md)). Preload exposes `getGuestDisplayName` for login prefill and the Web trigger. The name is UI chrome only — not an account identity. Empty input clears the store and keeps Guest.

Electron preload also exposes `shell:logout` and `shell:checkUpdates`. Main accepts logout/update invokes only from loopback http(s); enter and getGuestDisplayName accept the login document (and getGuestDisplayName also accepts loopback). Logout `loadFile`s the login gate, keeps the dsh child and `pendingAppUrl`, and re-sends `shell:hello`. Check for updates returns `{ ok: true }` with no download URL; the renderer supplies localized “source preview” copy.

`inject` stays `['slots', 'locale', 'connection', 'settingsScope']`. Theme is never a required inject. The shell registration declares `locale: 'settings'` so menu copy uses the same dictionaries as chrome seats.

## Alternatives considered

**Keep the trigger as a direct Settings button and put logout only in the Electron application menu.** Rejected because the product interaction is the sidebar account row; guests need an in-UI exit that returns to the gate.

**Hard-require `ui-theme` for the account menu.** Rejected so minimal profiles and package benches keep loading without theme.

**Implement packaged auto-update in this change.** Rejected; the source shell has no installer channel. The menu item reports that fact.

**Treat the guest display name as harness identity or sync it through anonymous-user-id.** Rejected; telemetry identity stays a UUID, and the display name is local chrome only.

## Consequences

Browser tabs hide logout and update checks and keep the Guest label. Desktop guest sessions can leave the loopback UI without killing dsh, and can rename the account row at the gate. Web e2e opens Settings through `openSettingsDialog` (account trigger → menuitem). Lifecycle chrome snapshots name the foot button Guest when no desktop name is injected.

## Testing

Package unit tests cover the account menu paths, optional desktop API detection, guest display-name reads, and themePreference defaulting without theme. Tests mock `window.dshDesktop`; this change does not add an Electron main process. Web e2e helpers and lifecycle snapshots follow the Guest trigger.

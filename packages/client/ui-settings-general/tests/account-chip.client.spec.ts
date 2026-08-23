/** Account-bar geometry: full-width foot control in wide mode; rail circle. */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../src/client/SettingsRoot.module.css', import.meta.url)), 'utf8')
const chrome = readFileSync(fileURLToPath(new URL('../src/client/chrome.module.css', import.meta.url)), 'utf8')

describe('account chip geometry', () => {
  it('stretches the Menu wrap so the foot trigger can fill the sidebar', () => {
    expect(css).toMatch(/\.accountMenu\s*\{[^}]*width:\s*100%/)
    expect(css).toMatch(/\.accountMenu\s*>\s*:global\(\*\)\s*\{[^}]*width:\s*100%/)
    expect(css).toMatch(/\.accountMenuRail\s*\{[^}]*width:\s*auto/)
  })

  it('uses a full-width visible account bar in wide mode', () => {
    expect(css).toMatch(/\.trigger\s*\{[^}]*width:\s*100%/)
    expect(css).toMatch(/\.trigger\s*\{[^}]*height:\s*40px/)
    expect(css).toMatch(/\.trigger\s*\{[^}]*background:\s*var\(--dsw-alias-bg-layer-1\)/)
    expect(css).toMatch(/\.trigger\.rail\s*\{[^}]*width:\s*36px/)
  })

  it('sizes the avatar to the bar height', () => {
    expect(chrome).toMatch(/\.avatar\s*\{[^}]*width:\s*32px/)
    expect(chrome).toMatch(/\.avatar\s*\{[^}]*height:\s*32px/)
  })
})

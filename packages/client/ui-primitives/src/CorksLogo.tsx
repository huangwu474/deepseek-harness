/**
 * CORKS product mark: an open C releasing a cork and three spark lines.
 * Square 24 viewBox; color rides currentColor.
 */

import type { IconProps } from './icons/props.ts'

/**
 * Render the CORKS mark.
 * @param props.size - square edge in px (default 24).
 * @param props.className - extra class for layout placement.
 * @returns the logo svg (aria-hidden; pair with the product name for accessibility).
 */
export function CorksLogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M11.1 5.75A6.6 6.6 0 1 0 16.95 13.45"
        stroke="currentColor"
        strokeWidth="4.8"
        strokeLinecap="round"
      />
      <rect
        x="15.45"
        y="5.2"
        width="5"
        height="3.7"
        rx="0.72"
        fill="currentColor"
        transform="rotate(-39 17.95 7.05)"
      />
      <path d="M18.9 3.4 19.55 1.8" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <path d="m20.45 4.3 1.3-1.15" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <path d="m21.25 5.85 1.7-.4" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  )
}

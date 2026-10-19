/**
 * The Request Interceptor mark — single source of truth.
 *
 * `icons/icon.svg`, the toolbar PNGs (enabled and disabled), the in-app
 * <BrandMark> and the on-page toasts are all generated from this module
 * (`pnpm brand` writes the files; `pnpm brand:check` verifies them in CI).
 * Plain TypeScript with no imports so Node can run it directly.
 *
 * The stroke gradient uses userSpaceOnUse: with the default objectBoundingBox
 * units, the straight route segments have a zero-height/width box and are not
 * painted at all.
 */

export interface BrandPalette {
  bgFrom: string;
  bgTo: string;
  strokeFrom: string;
  strokeTo: string;
  pinFrom: string;
  pinTo: string;
  pinCore: string;
  hole: string;
}

export const ENABLED_PALETTE: BrandPalette = {
  bgFrom: '#312e81',
  bgTo: '#1e1b4b',
  strokeFrom: '#a5b4fc',
  strokeTo: '#6366f1',
  pinFrom: '#67e8f9',
  pinTo: '#06b6d4',
  pinCore: '#0e7490',
  hole: '#1e1b4b',
};

/** Shown on the toolbar while interception is off. */
export const DISABLED_PALETTE: BrandPalette = {
  bgFrom: '#3f3f46',
  bgTo: '#27272a',
  strokeFrom: '#d4d4d8',
  strokeTo: '#a1a1aa',
  pinFrom: '#e4e4e7',
  pinTo: '#a1a1aa',
  pinCore: '#52525b',
  hole: '#27272a',
};

export interface BrandSvgOptions {
  /** Prefix for gradient ids; must be unique per document when inlined. */
  idPrefix?: string;
  disabled?: boolean;
  title?: string;
}

export function brandSvg({ idPrefix = 'ri', disabled = false, title = 'Request Interceptor' }: BrandSvgOptions = {}): string {
  const p = disabled ? DISABLED_PALETTE : ENABLED_PALETTE;
  const bg = `${idPrefix}-bg`;
  const stroke = `${idPrefix}-stroke`;
  const pin = `${idPrefix}-pin`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="${bg}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${p.bgFrom}"/>
      <stop offset="1" stop-color="${p.bgTo}"/>
    </linearGradient>
    <linearGradient id="${stroke}" gradientUnits="userSpaceOnUse" x1="16" y1="30" x2="84" y2="92">
      <stop offset="0" stop-color="${p.strokeFrom}"/>
      <stop offset="1" stop-color="${p.strokeTo}"/>
    </linearGradient>
    <radialGradient id="${pin}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${p.pinFrom}"/>
      <stop offset="1" stop-color="${p.pinTo}"/>
    </radialGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#${bg})"/>
  <rect x="0.5" y="0.5" width="127" height="127" rx="27.5" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>
  <g fill="none" stroke="url(#${stroke})" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 80 H64"/>
    <path d="M64 80 V36"/>
    <path d="M52 48 L64 36 L76 48"/>
  </g>
  <circle cx="22" cy="80" r="9" fill="url(#${stroke})"/>
  <circle cx="22" cy="80" r="4" fill="${p.hole}"/>
  <circle cx="64" cy="80" r="14" fill="url(#${pin})"/>
  <circle cx="64" cy="80" r="5" fill="${p.pinCore}"/>
</svg>
`;
}

export const ICON_SIZES = [16, 32, 48, 128] as const;

/** Toolbar icon paths (relative to the extension root) for each state. */
export function actionIconPaths(enabled: boolean): Record<string, string> {
  const name = enabled ? 'icon' : 'icon-disabled';
  return Object.fromEntries(ICON_SIZES.map((size) => [String(size), `icons/${name}-${size}.png`]));
}

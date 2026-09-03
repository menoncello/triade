// Pure-data theme tokens — no RN/Skia imports (UX-DR-17, FR-32)
// Dark canonical from DESIGN.md; light flips surfaces to warm off-white;
// color-blind re-uses dark ramp (shape/grain carries value FR-31) but exposed as distinct id.
export type ThemeId = 'dark' | 'light' | 'colorBlind';

export const THEME_IDS: readonly ThemeId[] = ['dark', 'light', 'colorBlind'] as const;

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

export interface ThemeTokens {
  id: ThemeId;
  chrome: {
    surface: string;
    surfaceRaised: string;
    board: string;
    cell: string;
    text: string;
    muted: string;
    border: string;
    accent: string;
    accentInk: string;
    scrim: string;
  };
  // 13-tier tile fills + per-tier ink — same hex for light derived delta (surfaces flip only)
  tileHexes: Readonly<Record<number, string>>;
  tileInk: Readonly<Record<number, string>>;
}

const TILE_HEXES_DARK: Readonly<Record<number, string>> = Object.freeze({
  1: '#EFE3C2',
  2: '#C9963B',
  3: '#E4A53B',
  6: '#E08532',
  12: '#C96E2E',
  24: '#A2521F',
  48: '#6E5A45',
  96: '#4E5560',
  192: '#28A074',
  384: '#157A5C',
  768: '#0E3B2E',
  1536: '#FFD9A0',
  3072: '#FFF3DC',
} as const);

const TILE_INK_DARK: Readonly<Record<number, string>> = Object.freeze({
  1: '#1C1206',
  2: '#1C1206',
  3: '#1C1206',
  6: '#1C1206',
  12: '#1C1206',
  24: '#F6F0E1',
  48: '#F6F0E1',
  96: '#F6F0E1',
  192: '#1C1206',
  384: '#F6F0E1',
  768: '#F6F0E1',
  1536: '#1C1206',
  3072: '#1C1206',
} as const);

// For WCAG pass on light, accent fill for light uses darker amber #8A4E00 (6.6 white on accent)
// so that both accent text on light surfaces and white label on accent pass 4.5.
// Dark/colorBlind keep canonical #E8A33D with dark-ink label (8.55).
const CHROME_DARK = Object.freeze({
  surface: '#23262D',
  surfaceRaised: '#2B2F38',
  board: '#1A1D23',
  cell: '#262A31',
  text: '#F2EEE3',
  muted: '#A39C8F',
  border: '#3A3F49',
  accent: '#E8A33D',
  accentInk: '#1C1206',
  scrim: '#0C0E11',
} as const);

const CHROME_LIGHT = Object.freeze({
  surface: '#F6F0E1',
  surfaceRaised: '#FFFFFF',
  board: '#EAE6DA',
  cell: '#D8D3C8',
  text: '#1C1206',
  muted: '#6B6355',
  border: '#D0C8B8',
  accent: '#8A4E00',
  accentInk: '#FFFFFF',
  scrim: '#0C0E11',
} as const);

export const THEMES: Readonly<Record<ThemeId, ThemeTokens>> = Object.freeze({
  dark: Object.freeze({
    id: 'dark',
    chrome: CHROME_DARK,
    tileHexes: TILE_HEXES_DARK,
    tileInk: TILE_INK_DARK,
  } as ThemeTokens),
  light: Object.freeze({
    id: 'light',
    chrome: CHROME_LIGHT,
    // Derived delta: tile ramp identical to dark (surfaces flipped only) — DESIGN NOTE
    tileHexes: TILE_HEXES_DARK,
    tileInk: TILE_INK_DARK,
  } as ThemeTokens),
  colorBlind: Object.freeze({
    id: 'colorBlind',
    chrome: CHROME_DARK,
    tileHexes: TILE_HEXES_DARK,
    tileInk: TILE_INK_DARK,
  } as ThemeTokens),
} as const);

export function themeFor(id: ThemeId): ThemeTokens {
  return THEMES[id] ?? THEMES.dark;
}

function resolveTile(value: number, map: Readonly<Record<number, string>>, fallback: string): string {
  if (!Number.isFinite(value)) return map[3072] ?? fallback;
  if (value in map) return map[value as keyof typeof map];
  if (value >= 3072) return map[3072];
  if (value > 1536) return map[1536];
  if (value > 768) return map[768];
  if (value > 384) return map[384];
  if (value > 192) return map[192];
  if (value > 96) return map[96];
  if (value > 48) return map[48];
  if (value > 24) return map[24];
  if (value > 12) return map[12];
  if (value > 6) return map[6];
  if (value > 3) return map[3];
  if (value === 2) return map[2];
  if (value === 1) return map[1];
  return map[3] ?? fallback;
}

export function tileFillFor(value: number, themeId: ThemeId = 'dark'): string {
  const t = isThemeId(themeId) ? themeId : 'dark';
  return resolveTile(value, THEMES[t].tileHexes, THEMES.dark.tileHexes[3]);
}

export function tileInkFor(value: number, themeId: ThemeId = 'dark'): string {
  const t = isThemeId(themeId) ? themeId : 'dark';
  return resolveTile(value, THEMES[t].tileInk, THEMES.dark.tileInk[3]);
}

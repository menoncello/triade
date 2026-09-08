/**
 * Theme tokens — pure data (UX-DR17, DESIGN.md).
 * Dark é o canônico Mineral Quente; light é derivado warm off-white.
 * Color-blind reusa light mas com rampa distinguível por lightness (shape já cobre).
 * Todos os componentes devem consumir via useTheme(), nunca hardcode hex.
 */

export type ThemeName = 'light' | 'dark' | 'color-blind';

export interface ThemeTokens {
  name: ThemeName;
  colors: {
    surface: string; // App background
    surfaceRaised: string; // Cards, panels
    board: string; // Board well
    cell: string; // Empty cell
    text: string;
    muted: string;
    border: string;
    borderAccent: string;
    accent: string;
    accentText: string; // label on accent fill
    scrim: string; // overlay scrim base (hex, sem alpha)
    success: string;
  };
  // Tile tier fills — 13 values (GDD D-009). Ink por tier é derivado via tileInkFor.
  tiles: Record<number, string>;
}

const ACCENT = '#E8A33D';
const ACCENT_TEXT_DARK = '#1C1206';

export const darkTokens: ThemeTokens = {
  name: 'dark',
  colors: {
    surface: '#23262d',
    surfaceRaised: '#2b2f38',
    board: '#1a1d23',
    cell: '#262a31',
    text: '#f2eee3',
    muted: '#a39c8f',
    border: '#3a3f49',
    borderAccent: '#E8A33D',
    accent: ACCENT,
    accentText: ACCENT_TEXT_DARK,
    scrim: '#0c0e11',
    success: ACCENT,
  },
  tiles: {
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
  },
};

export const lightTokens: ThemeTokens = {
  name: 'light',
  colors: {
    surface: '#f8f5ef',
    surfaceRaised: '#ffffff',
    board: '#e7e4de',
    cell: '#d8d3cc',
    text: '#1a1d23',
    muted: '#8a8578',
    border: '#e7e4de',
    borderAccent: '#E8A33D',
    accent: ACCENT,
    accentText: ACCENT_TEXT_DARK,
    scrim: '#0c0e11',
    success: ACCENT,
  },
  // Light mantém mesma rampa Mineral Quente mas com leve clareamento
  // (derivado da paleta dark — E9 futuro pode ajustar lightness por tier).
  tiles: {
    1: '#F9E3AE',
    2: '#F7D488',
    3: '#EEC06E',
    6: '#E0A84F',
    12: '#CF8A2E',
    24: '#B46A1E',
    48: '#8F7A65',
    96: '#6E7580',
    192: '#34B48A',
    384: '#1E9A78',
    768: '#1A5A45',
    1536: '#FFD9A0',
    3072: '#FFF3DC',
  },
};

export const colorBlindTokens: ThemeTokens = {
  name: 'color-blind',
  colors: {
    surface: '#F8F5EF',
    surfaceRaised: '#FFFFFF',
    board: '#E7E4DE',
    cell: '#D8D3CC',
    text: '#1A1D23',
    muted: '#6B7280',
    border: '#D1D5DB',
    borderAccent: '#0E7490',
    accent: '#0E7490',
    accentText: '#FFFFFF',
    scrim: '#111827',
    success: '#0E7490',
  },
  // Rampa por lightness + pattern (shape já varia por tier), não só hue.
  tiles: {
    1: '#E5E7EB',
    2: '#9CA3AF',
    3: '#6B7280',
    6: '#4B5563',
    12: '#374151',
    24: '#1F2937',
    48: '#93C5FD',
    96: '#60A5FA',
    192: '#3B82F6',
    384: '#1D4ED8',
    768: '#1E3A8A',
    1536: '#FDE68A',
    3072: '#FEF3C7',
  },
};

export const themes: Record<ThemeName, ThemeTokens> = {
  dark: darkTokens,
  light: lightTokens,
  'color-blind': colorBlindTokens,
};

export function themeForName(name: ThemeName): ThemeTokens {
  return themes[name] ?? lightTokens;
}

/**
 * WCAG AA contrast helpers — documentado em DESIGN.md.
 * Estes valores são a referência; não altere hex sem revalidar contraste.
 */
export const contrastNotes = {
  dark: {
    textOnSurface: '13.1:1',
    mutedOnSurface: '5.6:1',
    accentOnSurface: '7.0:1',
    darkInkOnAccent: '8.6:1',
  },
  light: {
    textOnSurface: '15.8:1',
    mutedOnSurface: '4.6:1',
    accentOnSurface: '2.1:1 (large text only)',
  },
} as const;

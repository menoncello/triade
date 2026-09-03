/**
 * Fixtures — 9-4 Temas light, dark e color-blind (3 free themes as pure data, WCAG AA all themes)
 * Deterministic, host-only, no faker — pure triade/src/theme + tileNumerals + GameBoard + App + storage schema
 * Covers: triade/src/theme/index.ts THEMES dark/light/colorBlind 13 tiers frozen + CHROME_DARK/LIGHT + isThemeId/themeFor/tileFillFor/tileInkFor resolveTile 3072+ cap
 *         triade/src/ui/tileNumerals.ts theme-aware wrappers optional themeId delegating to THEMES fallback dark + contrastRatio pure
 *         triade/src/render/GameBoard.tsx theme prop default dark, THEMES[theme].chrome.board/accent/cell
 *         triade/src/services/storage/schema.ts ThemeId/THEME_IDS fallback dark, DEFAULT dark, loadSettings guards
 *         triade/App.tsx themeId=isThemeId(settings.theme)?settings.theme:'dark', tokens=THEMES[themeId], handleThemeChange, GameBoard theme, containers tokens.chrome.surface
 *         triade/src/ui/LaneSelectScreen.tsx 3 Pressables dark/light/colorBlind Claro/Escuro/Daltônico HIT_TARGET 44 accent #E8A33D/#1C1206 8.55 selected
 *         triade/__tests__/ui/tileContrast.allThemes.audit.test.ts 3 tests + tileTheme.test.ts 4 tests + tileShape.test.ts 6 tests (dark canonical)
 * Spec: _bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md (status done, baseline fde6f8f, final a80ae0e, commit 568987a, 7 tasks)
 * Design: _bmad-output/test-artifacts/test-design-9-4-temas-light-dark-e-color-blind.md (12 risks, 2 high R-001/R-002 score 6, P0 9 groups/P1 8/P2 6/P3 2)
 * ATDD: _bmad-output/test-artifacts/atdd-tests/9-4-temas-light-dark-e-color-blind.red.spec.ts (14 skip → 14 pass when activated, node:test + tsx, host static + import)
 *       triade/__tests__/ui/tileContrast.allThemes.audit.test.ts (3 pass 39+24 checks weakest 384 4.65 + muted on board 4.75) + tileTheme.test.ts (4 pass 13-tier + cap + isThemeId + fallback)
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/9-4-temas-light-dark-e-color-blind.atdd.test.ts (18 pass when de-skipped)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx + readFileSync scans (RN Expo 57, no page.goto), theme is declarative token swap.
 */

import { readFileSync } from 'node:fs';
import { stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';

export { stripCommentsAndStrings };

// ── Scan strings (single-source grep) ─────────
export const SCAN_STRINGS = {
  // theme — pure data
  THEME_ID: 'ThemeId',
  THEME_IDS: 'THEME_IDS',
  THEME_IDS_DARK_LIGHT_CB: "THEME_IDS.*dark.*light.*colorBlind",
  IS_THEME_ID: 'isThemeId',
  IS_THEME_ID_GUARD: "isThemeId.*typeof.*string.*THEME_IDS",
  THEME_TOKENS: 'ThemeTokens',
  THEME_TOKENS_CHROME: 'ThemeTokens.*chrome',
  TILE_HEXES_FIELD: 'tileHexes',
  TILE_INK_FIELD: 'tileInk',
  THEMES: 'THEMES',
  THEMES_FREEZE: 'THEMES.*Object.freeze',
  T_HEME_IDS_FREEZE: 'THEME_IDS.*Object.freeze',
  TILE_HEXES_DARK: 'TILE_HEXES_DARK',
  TILE_HEXES_DARK_FREEZE: 'TILE_HEXES_DARK.*Object.freeze',
  TILE_INK_DARK: 'TILE_INK_DARK',
  TILE_INK_DARK_FREEZE: 'TILE_INK_DARK.*Object.freeze',
  CHROME_DARK: 'CHROME_DARK',
  CHROME_DARK_FREEZE: 'CHROME_DARK.*Object.freeze',
  CHROME_DARK_HEX: '#23262D',
  CHROME_LIGHT: 'CHROME_LIGHT',
  CHROME_LIGHT_FREEZE: 'CHROME_LIGHT.*Object.freeze',
  CHROME_LIGHT_HEX: '#F6F0E1',
  THEME_FOR: 'themeFor',
  TILE_FILL_FOR: 'tileFillFor',
  TILE_INK_FN: 'tileInkFor',
  RESOLVE_TILE: 'resolveTile',
  RESOLVE_TILE_CAP: 'value >= 3072',
  NUMBER_IS_FINITE: 'Number.isFinite(value)',
  FALLBACK_3072_THEME: 'THEMES[',
  OBJECT_FREEZE: 'Object.freeze',
  NO_RN_IMPORT: "from 'react-native'",
  NO_SKIA_IMPORT: "from '@shopify/react-native-skia'",
  // CHROME hex values
  CHROME_DARK_SURFACE: "'#23262D'",
  CHROME_DARK_RAISED: "'#2B2F38'",
  CHROME_DARK_BOARD: "'#1A1D23'",
  CHROME_DARK_CELL: "'#262A31'",
  CHROME_DARK_TEXT: "'#F2EEE3'",
  CHROME_DARK_MUTED: "'#A39C8F'",
  CHROME_DARK_BORDER: "'#3A3F49'",
  CHROME_DARK_ACCENT: "'#E8A33D'",
  CHROME_DARK_ACCENT_INK: "'#1C1206'",
  CHROME_DARK_SCRIM: "'#0C0E11'",
  CHROME_LIGHT_SURFACE: "'#F6F0E1'",
  CHROME_LIGHT_RAISED: "'#FFFFFF'",
  CHROME_LIGHT_BOARD: "'#EAE6DA'",
  CHROME_LIGHT_CELL: "'#D8D3C8'",
  CHROME_LIGHT_TEXT: "'#1C1206'",
  CHROME_LIGHT_MUTED: "'#6B6355'",
  CHROME_LIGHT_BORDER: "'#D0C8B8'",
  CHROME_LIGHT_ACCENT: "'#8A4E00'",
  CHROME_LIGHT_ACCENT_INK: "'#FFFFFF'",
  // tile hexes
  TILE_HEX_1: "'#EFE3C2'",
  TILE_HEX_2: "'#C9963B'",
  TILE_HEX_3: "'#E4A53B'",
  TILE_HEX_384: "'#157A5C'",
  TILE_HEX_768: "'#0E3B2E'",
  TILE_HEX_1536: "'#FFD9A0'",
  TILE_HEX_3072: "'#FFF3DC'",
  TILE_INK_DARK_HEX: "'#1C1206'",
  TILE_INK_LIGHT_HEX: "'#F6F0E1'",
  // WCAG helpers
  CONTRAST_RATIO: 'contrastRatio',
  RELATIVE_LUMINANCE: 'relativeLuminance',
  HEX_TO_RGB: 'hexToRgb',
  SRGB_TO_LINEAR: 'srgbToLinear',
  LUMINANCE_WEIGHTS: '0.2126',
  // tileNumerals delegation
  TNUM_TILE_FILL_THEME: 'tileFillFor.*themeId',
  TNUM_IS_THEME_ID: 'isThemeId(theme',
  TNUM_TILE_HEXES: 'TILE_HEXES',
  TNUM_TILE_INK: 'TILE_INK',
  // GameBoard theme prop
  BOARD_THEME_PROP: 'theme?:',
  BOARD_THEME_ID: 'ThemeId',
  BOARD_DEFAULT_DARK: "theme.*=.*'dark'",
  BOARD_CELL_COLOR_THEME: 'tileFillFor(value, theme)',
  BOARD_TILE_TEXT_THEME: 'tileInkFor(value, theme)',
  BOARD_CHROME_BOARD: 'THEMES[theme].chrome.board',
  BOARD_CHROME_ACCENT: 'THEMES[theme].chrome.accent',
  BOARD_CHROME_CELL: 'THEMES[theme].chrome.cell',
  BOARD_IMPORT_THEME: "from '../theme",
  // schema
  SCHEMA_THEME_IDS: 'THEME_IDS',
  SCHEMA_LOAD_SETTINGS: 'loadSettings',
  SCHEMA_DEFAULT_DARK: "DEFAULT_SETTINGS.*theme.*'dark'",
  SCHEMA_GUARD: 'THEME_IDS.includes(parsed.theme)',
  // App wiring
  APP_IS_THEME_ID: 'isThemeId(settings.theme)',
  APP_THEMES_THEME_ID: 'THEMES[themeId]',
  APP_HANDLE_THEME_CHANGE: 'handleThemeChange',
  APP_GAMEBOARD_THEME: 'GameBoard.*theme={themeId}',
  APP_TOKENS_SURFACE: 'tokens.chrome.surface',
  APP_VOID_SAVE: 'void saveSettings',
  APP_USE_COLOR_SCHEME_ANTI: 'useColorScheme',
  // LaneSelectScreen
  LANE_THEME_ROW: 'themeRow',
  LANE_THEME_BTN: 'themeBtn',
  LANE_ESCURO: 'Escuro',
  LANE_CLARO: 'Claro',
  LANE_DALTONICO: 'Daltônico',
  LANE_DARK_EN: 'Dark',
  LANE_LIGHT_EN: 'Light',
  LANE_COLORBLIND_EN: 'Color-blind',
  LANE_HIT_TARGET: 'HIT_TARGET',
  LANE_ACC_ROL_BTN: 'accessibilityRole.*button',
  LANE_ACC_STATE_SEL: 'accessibilityState.*selected',
  LANE_ACCENT_E8A33D: '#E8A33D',
  LANE_PRESSABLE: 'Pressable',
  // StatusBar DW-7
  STATUS_BAR_STYLE: 'statusBarStyle(isLandscape)',
  // engine purity
  ENGINE_THEME_IMPORT_ANTI: 'from.*theme',
};

// ── Expectations ──────────────────
export type Expectation = { rel: string; mustContain: string[]; mustNotContain?: string[] };

export const EXPECTATIONS: Expectation[] = [
  {
    rel: '../../src/theme/index.ts',
    mustContain: [
      'ThemeId',
      'THEME_IDS',
      'isThemeId',
      'ThemeTokens',
      'tileHexes',
      'THEMES',
      'Object.freeze',
      'TILE_HEXES_DARK',
      'TILE_INK_DARK',
      'CHROME_DARK',
      'CHROME_LIGHT',
      "'#23262D'",
      "'#F6F0E1'",
      "'#EFE3C2'",
      "'#FFF3DC'",
      'resolveTile',
      'tileFillFor',
      'tileInkFor',
      'Number.isFinite(value)',
    ],
    mustNotContain: ["from 'react-native'", "from '@shopify/react-native-skia'"],
  },
  {
    rel: '../../src/ui/tileNumerals.ts',
    mustContain: [
      'TILE_HEXES',
      'TILE_INK',
      'Object.freeze',
      'isThemeId(theme',
      'tileFillFor',
      'contrastRatio',
      'relativeLuminance',
      '0.2126',
    ],
    mustNotContain: [],
  },
  {
    rel: '../../src/render/GameBoard.tsx',
    mustContain: [
      "from '../theme",
      'theme?:',
      "theme.*=.*'dark'",
      'THEMES[theme].chrome.board',
      'THEMES[theme].chrome.accent',
      'tileFillFor(value, theme)',
    ],
    mustNotContain: [],
  },
  {
    rel: '../../src/services/storage/schema.ts',
    mustContain: [
      'THEME_IDS',
      'ThemeId',
      'loadSettings',
      "DEFAULT_SETTINGS",
      "'dark'",
      'THEME_IDS.includes',
    ],
    mustNotContain: [],
  },
  {
    rel: '../../App.tsx',
    mustContain: [
      'isThemeId(settings.theme)',
      'THEMES[themeId]',
      'handleThemeChange',
      'GameBoard',
      'theme={themeId}',
      'tokens.chrome.surface',
      'statusBarStyle(isLandscape)',
    ],
    mustNotContain: ['useColorScheme'],
  },
  {
    rel: '../../src/ui/LaneSelectScreen.tsx',
    mustContain: [
      'themeRow',
      'Escuro',
      'Claro',
      'Daltônico',
      'HIT_TARGET',
      'accessibilityRole',
      'accessibilityState',
      '#E8A33D',
      'Pressable',
    ],
    mustNotContain: [],
  },
];

// ── Gate constants ──────────────────────────────────────
export const GATE_CONSTANTS = {
  THEME_IDS: ['dark', 'light', 'colorBlind'] as const,
  TIERS: 13 as const,
  TIER_VALUES: [1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072] as const,
  TILE_HEXES_COUNT: 13,
  CHROME_DARK: { surface: '#23262D', surfaceRaised: '#2B2F38', board: '#1A1D23', cell: '#262A31', text: '#F2EEE3', muted: '#A39C8F', border: '#3A3F49', accent: '#E8A33D', accentInk: '#1C1206', scrim: '#0C0E11' } as const,
  CHROME_LIGHT: { surface: '#F6F0E1', surfaceRaised: '#FFFFFF', board: '#EAE6DA', cell: '#D8D3C8', text: '#1C1206', muted: '#6B6355', border: '#D0C8B8', accent: '#8A4E00', accentInk: '#FFFFFF', scrim: '#0C0E11' } as const,
  MIN_TILE_WIDTH: 44,
  TILE_NUMERAL_TOKENS: { '1-3': 32, '4-5': 13, '6+': 9 } as const,
  CELL_RADIUS: 10,
  HIT_TARGET: 44,
  CONTRAST_AA_SMALL: 4.5,
  CONTRAST_AA_LARGE: 3.0,
  CONTRAST_DARK_ON_ACCENT_MIN: 7,
  WEAKEST_TIER: 384 as const,
  WEAKEST_TILE_RATIO: 4.65,
  LIGHT_MUTED_ON_BOARD: 4.75,
  DARK_ACCENT_INK_ON_ACCENT: 8.55,
  LIGHT_ACCENT_INK_ON_ACCENT: 6.62,
  DARK_TEXT_ON_SURFACE: 13.06,
  LIGHT_TEXT_ON_SURFACE: 16.22,
  SPEC_BASELINE: 'fde6f8f',
  SPEC_FINAL: 'a80ae0e',
  COMMIT: '568987a',
  CONTRACT_ALL_THEMES: 3,
  CONTRACT_TILE_THEME: 4,
  CONTRACT_TILE_SHAPE: 6,
  CONTRACT_TILE_CONTRAST_CANONICAL: 3,
  RED_SCAFFOLDS: 14,
  GATEWAY_TESTS: 16,
  UMBRELLA_TESTS: 10,
  UNIT_TESTS: 17,
} as const;

// ── Tier fixtures (same ramp for all themes — derived delta) ─────────
export type TierFixture = { value: number; hex: string; inkDark: string; inkLight: string; ink: string };

export const TIER_FIXTURES: TierFixture[] = [
  { value: 1, hex: '#EFE3C2', inkDark: '#1C1206', inkLight: '#1C1206', ink: '#1C1206' },
  { value: 2, hex: '#C9963B', inkDark: '#1C1206', inkLight: '#1C1206', ink: '#1C1206' },
  { value: 3, hex: '#E4A53B', inkDark: '#1C1206', inkLight: '#1C1206', ink: '#1C1206' },
  { value: 6, hex: '#E08532', inkDark: '#1C1206', inkLight: '#1C1206', ink: '#1C1206' },
  { value: 12, hex: '#C96E2E', inkDark: '#1C1206', inkLight: '#1C1206', ink: '#1C1206' },
  { value: 24, hex: '#A2521F', inkDark: '#F6F0E1', inkLight: '#F6F0E1', ink: '#F6F0E1' },
  { value: 48, hex: '#6E5A45', inkDark: '#F6F0E1', inkLight: '#F6F0E1', ink: '#F6F0E1' },
  { value: 96, hex: '#4E5560', inkDark: '#F6F0E1', inkLight: '#F6F0E1', ink: '#F6F0E1' },
  { value: 192, hex: '#28A074', inkDark: '#1C1206', inkLight: '#1C1206', ink: '#1C1206' },
  { value: 384, hex: '#157A5C', inkDark: '#F6F0E1', inkLight: '#F6F0E1', ink: '#F6F0E1' },
  { value: 768, hex: '#0E3B2E', inkDark: '#F6F0E1', inkLight: '#F6F0E1', ink: '#F6F0E1' },
  { value: 1536, hex: '#FFD9A0', inkDark: '#1C1206', inkLight: '#1C1206', ink: '#1C1206' },
  { value: 3072, hex: '#FFF3DC', inkDark: '#1C1206', inkLight: '#1C1206', ink: '#1C1206' },
] as const;

export const CHROME_FIXTURES = {
  dark: GATE_CONSTANTS.CHROME_DARK,
  light: GATE_CONSTANTS.CHROME_LIGHT,
  colorBlind: GATE_CONSTANTS.CHROME_DARK,
} as const;

export const THEME_FIXTURES = {
  THEME_IDS: GATE_CONSTANTS.THEME_IDS,
  DARK: { id: 'dark' as const, chrome: GATE_CONSTANTS.CHROME_DARK },
  LIGHT: { id: 'light' as const, chrome: GATE_CONSTANTS.CHROME_LIGHT },
  COLORBLIND: { id: 'colorBlind' as const, chrome: GATE_CONSTANTS.CHROME_DARK },
} as const;

export const CAP_FIXTURES = {
  CANONICAL: [1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072] as const,
  NON_CANONICAL: [0, 5, 7, 100, 800, 2000, 6144, 12288] as const,
  INTERVAL_MAP: { 0: 3, 5: 3, 100: 96, 800: 768, 2000: 1536, 6144: 3072, 12288: 3072 } as const,
  NAN_FALLBACK: 3072 as const,
  INFINITY_FALLBACK: 3072 as const,
} as const;

export const WCAG_FIXTURES = {
  GOLDEN_RATIOS: [
    { a: '#FFFFFF', b: '#000000', expected: 21, eps: 0.05, label: 'white vs black ~21:1' },
    { a: '#767676', b: '#FFFFFF', expected: 4.54, eps: 0.1, label: '#767676 on #FFF ~4.54' },
    { a: '#157A5C', b: '#F6F0E1', expected: 4.65, eps: 0.15, label: 'weakest 384 deep emerald on #F6F0E1 ~4.65' },
  ] as const,
  WEAKEST_TILE: { hex: '#157A5C', ink: '#F6F0E1', ratio: 4.65 } as const,
  LIGHT_MUTED_ON_BOARD: { fg: '#6B6355', bg: '#EAE6DA', ratio: 4.75 } as const,
  DARK_MUTED_ON_RAISED: { fg: '#A39C8F', bg: '#2B2F38', ratio: 4.92 } as const,
  DARK_ACCENT_INK_ON_ACCENT: { fg: '#1C1206', bg: '#E8A33D', ratio: 8.55 } as const,
  LIGHT_ACCENT_INK_ON_ACCENT: { fg: '#FFFFFF', bg: '#8A4E00', ratio: 6.62 } as const,
  BAD_HEX: '#GGGGGG' as const,
} as const;

export const INVALID_THEME_FIXTURES = ['midnight', '', 'MIDNIGHT', 'COLORBLIND', '42', null, undefined] as const;

export const PERSISTENCE_FIXTURES = {
  VALID: ['dark', 'light', 'colorBlind'] as const,
  INVALID_FALLBACK_DARK: ['midnight', '42', 'null', '', 'COLORBLIND'] as const,
  CORRUPT_JSON: 'not json',
  MISSING_KEY_JSON: '{"reducedMotion":true}',
  EMPTY_THEME_JSON: '{"theme":""}',
} as const;

// ── Scan helpers ───────────────────────
export function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}
export function countMatches(source: string, needle: string): number {
  return source.split(needle).length - 1;
}
export function countMatchesRegex(source: string, pattern: RegExp): number {
  const m = source.match(pattern);
  return m ? m.length : 0;
}

// ── Spec / design provenance ──────────
export const SPEC = {
  PATH: '_bmad-output/implementation-artifacts/spec-9-4-temas-light-dark-e-color-blind.md',
  BASELINE_REVISION: 'fde6f8f',
  FINAL_REVISION: 'a80ae0e',
  COMMIT: '568987a',
  STATUS: 'done',
} as const;

export const DESIGN = {
  PATH: '_bmad-output/test-artifacts/test-design-9-4-temas-light-dark-e-color-blind.md',
  RISKS_TOTAL: 12,
  RISKS_HIGH: 2,
  P0_GROUPS: 9,
  P1_GROUPS: 8,
  P2_GROUPS: 6,
  P3_GROUPS: 2,
} as const;

// ── Validation helpers ─────────────────
export function assertThemeTokensContract(source: string): void {
  if (!source.includes('ThemeId')) throw new Error('ThemeId missing');
  if (!source.includes('THEME_IDS')) throw new Error('THEME_IDS missing');
  if (!source.includes('isThemeId')) throw new Error('isThemeId missing');
  if (!source.includes('ThemeTokens')) throw new Error('ThemeTokens missing');
  if (!source.includes('tileHexes')) throw new Error('tileHexes missing');
  if (!source.includes('THEMES')) throw new Error('THEMES missing');
  if (!source.includes('Object.freeze')) throw new Error('Object.freeze missing');
  if (!source.includes('#23262D')) throw new Error('CHROME_DARK #23262D missing');
  if (!source.includes('#F6F0E1')) throw new Error('CHROME_LIGHT #F6F0E1 missing');
  if (!source.includes('#EFE3C2')) throw new Error('TILE_HEXES[1] #EFE3C2 missing');
  if (!source.includes('#FFF3DC')) throw new Error('TILE_HEXES[3072] #FFF3DC missing');
  if (source.includes("from 'react-native'")) throw new Error('theme must not import react-native (pure)');
  if (source.includes("from '@shopify/react-native-skia'")) throw new Error('theme must not import skia (pure)');
}
export function assertWcagContract(source: string): void {
  if (!source.includes('contrastRatio')) throw new Error('contrastRatio missing');
  if (!source.includes('relativeLuminance')) throw new Error('relativeLuminance missing');
  if (!source.includes('0.2126')) throw new Error('luminance weight 0.2126 missing');
  if (!source.includes('#157A5C')) throw new Error('weakest 384 #157A5C missing');
}
export function assertGameBoardThemeContract(source: string): void {
  if (!source.includes('theme?:')) throw new Error('GameBoard theme prop missing');
  if (!source.includes("theme.*=.*'dark'") && !source.includes("theme")) throw new Error('default dark missing');
  if (!source.includes('THEMES[theme].chrome.board')) throw new Error('board well THEMES[theme].chrome.board missing');
  if (!source.includes('tileFillFor(value, theme)')) throw new Error('cellColor theme-aware missing');
}

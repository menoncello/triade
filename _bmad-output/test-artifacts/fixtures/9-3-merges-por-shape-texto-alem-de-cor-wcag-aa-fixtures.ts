/**
 * Fixtures — 9-3 Merges por shape/texto além de cor + WCAG AA (dark canonical)
 * Deterministic, host-only, no faker — pure triade/src/ui/tileNumerals + GameBoard Skia grain/glow seam
 * Covers: triade/src/ui/tileNumerals.ts TILE_HEXES/TILE_INK/TILE_SHAPE_MAP/tileFillFor/tileInkFor/tileShapeFor/contrastRatio
 *         triade/src/render/GameBoard.tsx cellColor→tileFillFor, tileTextColor→tileInkFor, AnimatedTile shape.grain/grain2/glow bevel
 *         triade/__tests__/ui/tileShape.test.ts 6 tests + tileContrast.audit.test.ts 3 tests + tileNumerals.test.ts numerals
 *         triade/src/a11y/announcements.ts merge value-text not hue (FR-31)
 * Spec: _bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md (status done, baseline 9448b3f, final 7e314ab, head 009fc5e, 6 tasks)
 * Design: _bmad-output/test-artifacts/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md (10 risks, 2 high R-001/R-002 score 6, P0 8 groups/P1 7/P2 6/P3 2)
 * ATDD: _bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts (15 skip → 15 pass when activated, node:test + tsx, host-only pure)
 *       triade/__tests__/ui/tileShape.test.ts (6 pass) + triade/__tests__/ui/tileContrast.audit.test.ts (3 pass) verified 973 pass fleet
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.atdd.test.ts (18 pass when de-skipped)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx + readFileSync scans (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';

export { stripCommentsAndStrings };

// ── Scan strings (single-source grep — literal copies from source) ─────────
export const SCAN_STRINGS = {
  // tileNumerals — canonical palette
  TILE_HEXES: 'TILE_HEXES',
  TILE_HEXES_FREEZE: 'TILE_HEXES.*Object.freeze',
  TILE_HEX_1: "'#EFE3C2'",
  TILE_HEX_2: "'#C9963B'",
  TILE_HEX_3: "'#E4A53B'",
  TILE_HEX_6: "'#E08532'",
  TILE_HEX_12: "'#C96E2E'",
  TILE_HEX_24: "'#A2521F'",
  TILE_HEX_48: "'#6E5A45'",
  TILE_HEX_96: "'#4E5560'",
  TILE_HEX_192: "'#28A074'",
  TILE_HEX_384: "'#157A5C'",
  TILE_HEX_768: "'#0E3B2E'",
  TILE_HEX_1536: "'#FFD9A0'",
  TILE_HEX_3072: "'#FFF3DC'",
  TILE_INK: 'TILE_INK',
  TILE_INK_FREEZE: 'TILE_INK.*Object.freeze',
  TILE_INK_DARK: "TILE_INK_DARK = '#1C1206'",
  TILE_INK_LIGHT: "TILE_INK_LIGHT = '#F6F0E1'",
  TILE_FILL_FOR: 'tileFillFor',
  TILE_INK_FOR: 'tileInkFor',
  TILE_SHAPE_FOR: 'tileShapeFor',
  TILE_SHAPE_MAP: 'TILE_SHAPE_MAP',
  TILE_SHAPE_FREEZE: 'TILE_SHAPE_MAP.*Object.freeze',
  TILE_FILL_CAP: 'value >= 3072',
  TILE_SHAPE_CAP: 'value >= 3072',
  NUMBER_IS_FINITE: 'Number.isFinite(value)',
  FALLBACK_3072: 'TILE_HEXES[3072]',
  FALLBACK_DARK: 'TILE_INK_DARK',
  GRAIN_0_LOW: 'grain: 0',
  GRAIN_1_MID: 'grain: 1',
  GRAIN_2_EMERALD: 'grain: 2',
  GLOW_TRUE: 'glow: true',
  GLOW_FALSE: 'glow: false',
  BEVEL_1: 'bevel: 1',
  BEVEL_1_2: 'bevel: 1.2',
  BEVEL_1_6: 'bevel: 1.6',
  // WCAG helpers
  CONTRAST_RATIO: 'contrastRatio',
  RELATIVE_LUMINANCE: 'relativeLuminance',
  HEX_TO_RGB: 'hexToRgb',
  SRGB_TO_LINEAR: 'srgbToLinear',
  LUMINANCE_WEIGHTS: '0.2126',
  LUMINANCE_WEIGHTS_ALL: '0.2126.*0.7152.*0.0722',
  SRGB_COEFF: '0.04045',
  SRGB_12_92: '12.92',
  POW_2_4: '2.4',
  RATIO_FORMULA: '(L1 + 0.05) / (L2 + 0.05)',
  PURE_COMMENT: 'pure, no RN',
  NO_RN_IMPORT: "from 'react-native'",
  NO_SKIA_IMPORT: "from '@shopify/react-native-skia'",
  // numeral tokens
  TILE_NUMERAL_TOKENS: 'TILE_NUMERAL_TOKENS',
  MIN_TILE_WIDTH: 'MIN_TILE_WIDTH = 44',
  TOKEN_1_3: "'1-3'",
  TOKEN_4_5: "'4-5'",
  TOKEN_6_PLUS: "'6+'",
  // GameBoard — delegation + grain
  CELL_COLOR: 'function cellColor',
  CELL_COLOR_DELEGATE: 'tileFillFor(value)',
  TILE_TEXT_COLOR: 'function tileTextColor',
  TILE_TEXT_DELEGATE: 'tileInkFor(value)',
  TILE_SHAPE_READ: 'tileShapeFor(value)',
  ANIMATED_TILE: 'function AnimatedTile',
  ROUNDED_RECT: 'RoundedRect',
  STYLE_STROKE: 'style="stroke"',
  STROKE_WIDTH_BEVEL: 'strokeWidth={shape.bevel}',
  STROKE_WIDTH_0_9: 'strokeWidth={0.9}',
  SHAPE_GRAIN_GT_0: 'shape.grain > 0',
  SHAPE_GRAIN_EQ_2: 'shape.grain === 2',
  COLOR_BLACK: 'color="#000000"',
  COLOR_TRANSPARENT_ANTI: 'color="transparent"',
  OPACITY_0_14: 'opacity={shape.grain === 1 ? 0.14 : 0.22}',
  OPACITY_0_22: '0.22',
  OPACITY_0_12: 'opacity={0.12}',
  GRAIN_X3: 'x={3}',
  GRAIN_Y3: 'y={3}',
  GRAIN_W_CELL_6: 'width={cell - 6}',
  GRAIN_H_CELL_6: 'height={cell - 6}',
  GRAIN_X6: 'x={6}',
  GRAIN_Y6: 'y={6}',
  GRAIN_W_CELL_12: 'width={cell - 12}',
  GRAIN_H_CELL_12: 'height={cell - 12}',
  CELL_RADIUS: 'CELL_RADIUS',
  CELL_RADIUS_10: 'CELL_RADIUS = 10',
  HAS_GLOW: 'hasGlow',
  HAS_GLOW_1536: 'value >= 1536',
  GLOW_COLOR: 'color="#ff8c2f"',
  GLOW_OPACITY: 'opacity={0.28}',
  TS_IGNORE_STROKE: '@ts-ignore',
  IMPORT_TILE_NUMERALS: "from '../ui/tileNumerals",
  VALUE_LTE_12_ANTI: 'value <= 12',
  // announcements — value text not hue
  ANNOUNCE_MERGED: 'Merged:',
  ANNOUNCE_MERGED_I18N: "a11y.merged",
  ANNOUNCE_VALUE_TEXT: 'plus.*equals',
  TILE_FILL_ANTI_HARDCODE: "cellColor.*#EFE3C2",
  // chrome surface tokens (audit hard-code vs design)
  SURFACE: "'#23262D'",
  BOARD: "'#1A1D23'",
  RAISED: "'#2B2F38'",
  TEXT: "'#F2EEE3'",
  MUTED: "'#A39C8F'",
  ACCENT: "'#E8A33D'",
  DARK_INK: "'#1C1206'",
};

// ── Expectations (mirrors tileShape + tileContrast audits) ──────────────────
export type Expectation = { rel: string; mustContain: string[]; mustNotContain?: string[] };

export const EXPECTATIONS: Expectation[] = [
  {
    rel: '../../src/ui/tileNumerals.ts',
    mustContain: [
      'TILE_HEXES',
      'Object.freeze',
      "'#EFE3C2'",
      "'#FFF3DC'",
      'TILE_INK',
      "TILE_INK_DARK = '#1C1206'",
      "TILE_INK_LIGHT = '#F6F0E1'",
      'tileFillFor',
      'tileInkFor',
      'tileShapeFor',
      'TILE_SHAPE_MAP',
      'grain: 0',
      'grain: 1',
      'grain: 2',
      'glow: true',
      'contrastRatio',
      'relativeLuminance',
      'hexToRgb',
      '0.2126',
      '0.7152',
      '0.0722',
      '0.04045',
      'Number.isFinite(value)',
    ],
    mustNotContain: ["from 'react-native'", "from '@shopify/react-native-skia'"],
  },
  {
    rel: '../../src/render/GameBoard.tsx',
    mustContain: [
      "from '../ui/tileNumerals",
      'tileFillFor(value)',
      'tileInkFor(value)',
      'tileShapeFor(value)',
      'RoundedRect',
      'style="stroke"',
      'strokeWidth={shape.bevel}',
      'shape.grain > 0',
      'shape.grain === 2',
      'color="#000000"',
      'value >= 1536',
      'color="#ff8c2f"',
      'CELL_RADIUS',
    ],
    mustNotContain: ['value <= 12', 'color="transparent"'],
  },
  {
    rel: '../../__tests__/ui/tileShape.test.ts',
    mustContain: [
      'TILE_HEXES',
      'TILE_INK',
      'tileFillFor',
      'tileShapeFor',
      'grain',
      'DESIGN',
    ],
  },
  {
    rel: '../../__tests__/ui/tileContrast.audit.test.ts',
    mustContain: [
      'contrastRatio',
      'TILE_HEXES',
      'TILE_INK',
      'SURFACE',
      'BOARD',
      'ACCENT',
      '4.5',
    ],
  },
];

// ── Gate constants (spec verification) ──────────────────────────────────────
export const GATE_CONSTANTS = {
  TIERS: 13 as const,
  TIER_VALUES: [1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072] as const,
  TILE_HEXES_COUNT: 13,
  TILE_SHAPE_COUNT: 13,
  MIN_TILE_WIDTH: 44,
  TILE_NUMERAL_TOKENS: { '1-3': 32, '4-5': 13, '6+': 9 } as const,
  CELL_RADIUS: 10,
  CELL_GAP: 8,
  BOARD_PADDING: 8,
  CHROME_SURFACE: '#23262D',
  CHROME_BOARD: '#1A1D23',
  CHROME_RAISED: '#2B2F38',
  CHROME_TEXT: '#F2EEE3',
  CHROME_MUTED: '#A39C8F',
  CHROME_ACCENT: '#E8A33D',
  INK_DARK: '#1C1206',
  INK_LIGHT: '#F6F0E1',
  CONTRAST_AA_SMALL: 4.5,
  CONTRAST_AA_LARGE: 3.0,
  CONTRAST_ACCENT_ON_SURFACE_MIN: 6.5,
  CONTRAST_DARK_ON_ACCENT_MIN: 7,
  WEAKEST_TIER: 384 as const,
  WEAKEST_RATIO_DESIGN: 4.7,
  WEAKEST_RATIO_VERIFIED: 4.65,
  GRAIN_LOW: 0,
  GRAIN_MID: 1,
  GRAIN_EMERALD: 2,
  BEVEL_LOW: 1,
  BEVEL_MID: 1.2,
  BEVEL_EMERALD: 1.6,
  GLOW_ONLY_TIER: 1536 as const,
  CAP_VALUES: [6144, 12288] as const,
  TRISHADE_1: '#EFE3C2',
  TRISHADE_2: '#C9963B',
  SPEC_BASELINE: '9448b3f',
  SPEC_FINAL: '7e314ab',
  COMMIT: '009fc5e',
  CONTRACT_TILE_SHAPE_TESTS: 6,
  CONTRACT_CONTRAST_TESTS: 3,
  RED_SCAFFOLDS: 15,
  GATEWAY_TESTS: 16,
  UMBRELLA_TESTS: 10,
  UNIT_TESTS: 17,
} as const;

// ── Tier fixtures (deterministic) ───────────────────────────────────────────
export type TierFixture = { value: number; hex: string; ink: string; grain: number; glow: boolean; bevel: number };

export const TIER_FIXTURES: TierFixture[] = [
  { value: 1, hex: '#EFE3C2', ink: '#1C1206', grain: 0, glow: false, bevel: 1 },
  { value: 2, hex: '#C9963B', ink: '#1C1206', grain: 0, glow: false, bevel: 1 },
  { value: 3, hex: '#E4A53B', ink: '#1C1206', grain: 0, glow: false, bevel: 1 },
  { value: 6, hex: '#E08532', ink: '#1C1206', grain: 0, glow: false, bevel: 1 },
  { value: 12, hex: '#C96E2E', ink: '#1C1206', grain: 0, glow: false, bevel: 1 },
  { value: 24, hex: '#A2521F', ink: '#F6F0E1', grain: 1, glow: false, bevel: 1.2 },
  { value: 48, hex: '#6E5A45', ink: '#F6F0E1', grain: 1, glow: false, bevel: 1.2 },
  { value: 96, hex: '#4E5560', ink: '#F6F0E1', grain: 1, glow: false, bevel: 1.2 },
  { value: 192, hex: '#28A074', ink: '#1C1206', grain: 2, glow: false, bevel: 1.6 },
  { value: 384, hex: '#157A5C', ink: '#F6F0E1', grain: 2, glow: false, bevel: 1.6 },
  { value: 768, hex: '#0E3B2E', ink: '#F6F0E1', grain: 2, glow: false, bevel: 1.6 },
  { value: 1536, hex: '#FFD9A0', ink: '#1C1206', grain: 0, glow: true, bevel: 1 },
  { value: 3072, hex: '#FFF3DC', ink: '#1C1206', grain: 0, glow: true, bevel: 1 },
] as const;

export const CHROME_FIXTURES = {
  SURFACE: '#23262D',
  BOARD: '#1A1D23',
  RAISED: '#2B2F38',
  TEXT: '#F2EEE3',
  MUTED: '#A39C8F',
  ACCENT: '#E8A33D',
  DARK_INK: '#1C1206',
} as const;

export const CAP_FIXTURES = {
  CANONICAL: [1, 2, 3, 6, 12, 24, 48, 96, 192, 384, 768, 1536, 3072] as const,
  NON_CANONICAL: [0, 5, 7, 100, 800, 2000, 6144, 12288] as const,
  INTERVAL_MAP: {
    0: 3,
    5: 3,
    100: 96,
    800: 768,
    2000: 1536,
    6144: 3072,
    12288: 3072,
  } as const,
  NAN_FALLBACK: 3072 as const,
  INFINITY_FALLBACK: 3072 as const,
} as const;

export const WCAG_FIXTURES = {
  GOLDEN_RATIOS: [
    { a: '#FFFFFF', b: '#000000', expected: 21, eps: 0.05, label: 'white vs black ~21:1' },
    { a: '#767676', b: '#FFFFFF', expected: 4.54, eps: 0.1, label: '#767676 on #FFF ~4.54' },
    { a: '#157A5C', b: '#F6F0E1', expected: 4.65, eps: 0.15, label: 'weakest 384 deep emerald on #F6F0E1 ~4.65' },
  ] as const,
  THREE_DIGIT: { a: '#FFF', b: '#000', expected: 21 } as const,
  SAME_COLOR: { a: '#FFF', b: '#FFF', expected: 1 } as const,
  BAD_HEX: '#GGGGGG' as const,
  BAD_HEX_LUMINANCE: 0 as const,
} as const;

// ── Scan helpers ────────────────────────────────────────────────────────────
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

// ── Spec / design provenance ───────────────────────────────────────────────
export const SPEC = {
  PATH: '_bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md',
  BASELINE_REVISION: '9448b3f',
  FINAL_REVISION: '7e314ab',
  COMMIT: '009fc5e',
  STATUS: 'done',
} as const;

export const DESIGN = {
  PATH: '_bmad-output/test-artifacts/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md',
  RISKS_TOTAL: 10,
  RISKS_HIGH: 2,
  P0_GROUPS: 8,
  P1_GROUPS: 7,
  P2_GROUPS: 6,
  P3_GROUPS: 2,
} as const;

// ── Validation helpers (host-only) ──────────────────────────────────────────
export function assertPaletteContract(source: string): void {
  if (!source.includes("TILE_HEXES")) throw new Error('TILE_HEXES missing');
  if (!source.includes('#EFE3C2')) throw new Error('TILE_HEXES[1] #EFE3C2 missing');
  if (!source.includes('#FFF3DC')) throw new Error('TILE_HEXES[3072] #FFF3DC missing');
  if (!source.includes("TILE_INK_DARK = '#1C1206'")) throw new Error('TILE_INK_DARK #1C1206 missing');
  if (!source.includes("TILE_INK_LIGHT = '#F6F0E1'")) throw new Error('TILE_INK_LIGHT #F6F0E1 missing');
  if (!source.includes('tileFillFor')) throw new Error('tileFillFor missing');
  if (!source.includes('tileInkFor')) throw new Error('tileInkFor missing');
  if (!source.includes('tileShapeFor')) throw new Error('tileShapeFor missing');
  if (!source.includes('TILE_SHAPE_MAP')) throw new Error('TILE_SHAPE_MAP missing');
  if (!source.includes('contrastRatio')) throw new Error('contrastRatio missing');
  if (!source.includes('Object.freeze')) throw new Error('Object.freeze missing (immutable)');
  if (source.includes("from 'react-native'")) throw new Error('tileNumerals must not import react-native (pure)');
  if (source.includes("from '@shopify/react-native-skia'")) throw new Error('tileNumerals must not import skia (pure)');
}

export function assertShapeContract(source: string): void {
  if (!source.includes('grain: 0')) throw new Error('grain 0 low band missing');
  if (!source.includes('grain: 1')) throw new Error('grain 1 mid band missing');
  if (!source.includes('grain: 2')) throw new Error('grain 2 emerald band missing');
  if (!source.includes('glow: true')) throw new Error('glow true incandescent missing');
  if (!source.includes('bevel: 1.6')) throw new Error('bevel 1.6 emerald missing');
}

export function assertWcagContract(source: string): void {
  if (!source.includes('contrastRatio')) throw new Error('contrastRatio missing');
  if (!source.includes('relativeLuminance')) throw new Error('relativeLuminance missing');
  if (!source.includes('hexToRgb')) throw new Error('hexToRgb missing');
  if (!source.includes('0.2126')) throw new Error('luminance weight 0.2126 missing');
  if (!source.includes('0.7152')) throw new Error('luminance weight 0.7152 missing');
  if (!source.includes('0.0722')) throw new Error('luminance weight 0.0722 missing');
  if (!source.includes('0.04045')) throw new Error('sRGB 0.04045 missing');
  if (!source.includes('Number.isFinite(value)')) throw new Error('Number.isFinite guard missing');
}

export function assertGameBoardContract(source: string): void {
  if (!source.includes("from '../ui/tileNumerals")) throw new Error('GameBoard must import from tileNumerals');
  if (!source.includes('tileFillFor(value)')) throw new Error('cellColor must delegate to tileFillFor(value)');
  if (!source.includes('tileInkFor(value)')) throw new Error('tileTextColor must delegate to tileInkFor(value)');
  if (!source.includes('tileShapeFor(value)')) throw new Error('AnimatedTile must read tileShapeFor(value)');
  if (!source.includes('RoundedRect')) throw new Error('RoundedRect missing');
  if (!source.includes('style="stroke"')) throw new Error('style="stroke" grain missing');
  if (!source.includes('strokeWidth={shape.bevel}')) throw new Error('strokeWidth={shape.bevel} missing');
  if (!source.includes('shape.grain > 0')) throw new Error('shape.grain >0 branch missing');
  if (!source.includes('shape.grain === 2')) throw new Error('shape.grain ===2 inner branch missing');
  if (!source.includes('color="#000000"')) throw new Error('grain color #000000 missing (review patch)');
  if (source.includes('color="transparent"')) throw new Error('must not contain color="transparent" (patched to #000000)');
  if (!source.includes('value >= 1536')) throw new Error('glow gate value >=1536 missing');
  if (source.includes('value <= 12')) throw new Error('must NOT contain old binary value <=12');
  if (!source.includes('CELL_RADIUS')) throw new Error('CELL_RADIUS missing');
}

export function assertChromeContract(source: string): void {
  if (!source.includes('#23262D')) throw new Error('SURFACE #23262D missing');
  if (!source.includes('#1A1D23')) throw new Error('BOARD #1A1D23 missing');
  if (!source.includes('#E8A33D')) throw new Error('ACCENT #E8A33D missing');
  if (!source.includes('4.5')) throw new Error('WCAG 4.5 threshold missing');
}

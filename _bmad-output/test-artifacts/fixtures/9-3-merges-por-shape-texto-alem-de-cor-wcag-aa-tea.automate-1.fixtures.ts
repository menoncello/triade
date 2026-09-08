/**
 * Delta fixtures — 9-3 automate-1 run (2026-09-08, tea.automate-1).
 * Supplements (does not duplicate) fixtures/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-fixtures.ts.
 * Delta scope vs prior automate (2026-09-03): theme delegation (THEMES + themeId),
 * DW-117/DW-118 pins, 9.4 boundary. Host-only, deterministic, no faker.
 */
import { readFileSync } from 'node:fs';

export const STORY = '9-3-merges-por-shape-texto-alem-de-cor-wcag-aa' as const;
export const RUN = 'tea.automate-1' as const;

export const THEME_IDS = ['dark', 'light', 'colorBlind'] as const;

export interface TierFixture { value: number; hex: string; ink: string; grain: number; glow: boolean; bevel: number }

export const TIER_FIXTURES: readonly TierFixture[] = Object.freeze([
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
]);

export const WEAKEST_TIER = 384 as const;
export const WEAKEST_FLOOR = 4.5 as const;

// Golden WCAG ratios (independent oracle, 2-decimal tolerance in tests)
export const GOLDEN = Object.freeze({
  whiteOnBlack: 21,
  grey767676OnWhite: 4.54,
  weakest384: 4.65,
});

export const CHROME = Object.freeze({
  board: '#1A1D23',
  text: '#F2EEE3',
  muted: '#A39C8F',
  accent: '#E8A33D',
  darkInk: '#1C1206',
});

export const CAP_INPUTS = Object.freeze([6144, 12288, 99999, Infinity]);
export const FALLBACK_INPUTS = Object.freeze([0, -1]);

export function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

export function countMatches(source: string, pattern: RegExp): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return [...source.matchAll(new RegExp(pattern.source, flags))].length;
}

export function assertTierTable(actual: { fill: (v: number, t?: string) => string; ink: (v: number, t?: string) => string; shape: (v: number) => { grain: number; glow: boolean; bevel: number } }): void {
  for (const tier of TIER_FIXTURES) {
    if (actual.fill(tier.value) !== tier.hex) throw new Error(`fill(${tier.value}) !== ${tier.hex}`);
    if (actual.ink(tier.value) !== tier.ink) throw new Error(`ink(${tier.value}) !== ${tier.ink}`);
    const shape = actual.shape(tier.value);
    if (shape.grain !== tier.grain || shape.glow !== tier.glow || shape.bevel !== tier.bevel) {
      throw new Error(`shape(${tier.value}) !== grain${tier.grain}/glow${tier.glow}/bevel${tier.bevel}`);
    }
  }
}

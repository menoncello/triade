/**
 * Fixtures — dw-7-status-bar-dark-landscape (DW-7)
 * Status bar legibility — force dark style in landscape on light #fff band
 * Deterministic, host-only, no faker — pure statusBarStyle(boolean) + file-content scans + ledger pins
 * Covers: triade/src/ui/statusBar.ts:1-5 pure helper statusBarStyle(isLandscape:boolean):'auto'|'dark'
 *         triade/App.tsx:32,877,886,906,1025 import { statusBarStyle } + 4× <StatusBar style={statusBarStyle(isLandscape)} />
 *         triade/src/ui/useSyncedLayout.ts:14-60 DEFAULT_DEBOUNCE_MS 32 coalesce (not retuned)
 *         triade/src/ui/layout.ts:37-42 isLandscape w>h / triade/src/ui/orientation.ts width>height
 *         triade/app.json:12 no statusBar override (component prop is source of truth)
 *         deferred-work.md DW-7 open→done 2026-09-02 resolution-undo 0fca74990eec61dcdc0ddb42ec0e67898120b24fce4833ecc178f18ed2a2d422
 * Spec: _bmad-output/implementation-artifacts/spec-dw-7-status-bar-dark-landscape.md (intent/boundaries/I-O 5 rows, 4 ACs, baseline fb6df27→5588155)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-7-status-bar-dark-landscape.md (8 risks, 2 high score 6, P0 6 groups + P1 6 + P2 4 + P3 4)
 * ATDD: triade/__tests__/ui/dw-7-status-bar-dark-landscape.atdd.test.ts (18 it.skip scaffolds, host node:test+tsx, P0 8 + P1 6 + P2 4 + P3 2)
 *       triade/__tests__/ui/statusBar.test.ts (3 pass: false→auto, true→dark, purity)
 * Run: npm --prefix triade test -- __tests__/ui/dw-7-status-bar-dark-landscape.atdd.test.ts (18 dormant → 18 pass when activated)
 *      npm --prefix triade test -- __tests__/ui/statusBar.test.ts (3 pass)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in statusBar.ts + App.tsx + layout.ts + useSyncedLayout.ts
 * No Playwright test.extend — pure node:test + tsx helpers (status bar seam pure TS, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { statusBarStyle } from '../../../triade/src/ui/statusBar.ts';
import type { StatusBarStyle } from '../../../triade/src/ui/statusBar.ts';

// ---------------------------------------------------------------------------
// Deterministic fixtures — mirror statusBar.test.ts + layout.test.ts + orientation
// ---------------------------------------------------------------------------
export const STATUS_BAR_FIXTURES = {
  portrait: { isLandscape: false as const, expected: 'auto' as StatusBarStyle },
  landscape: { isLandscape: true as const, expected: 'dark' as StatusBarStyle },
  helperPureFalse: { input: false, expected: 'auto' as StatusBarStyle },
  helperPureTrue: { input: true, expected: 'dark' as StatusBarStyle },
} as const;

export const APP_FIXTURE = {
  FILE: 'triade/App.tsx',
  STATUS_BAR_HELPER: 'statusBarStyle',
  STATUS_BAR_IMPORT: "from './src/ui/statusBar",
  STATUS_BAR_CALL: 'statusBarStyle(isLandscape)',
  STATUS_BAR_PROP: 'style={statusBarStyle(isLandscape)}',
  STATUS_BAR_MOUNT: '<StatusBar',
  BARE_AUTO: 'style="auto"',
  CONTAINER_BG: "backgroundColor: '#fff'",
  USE_SYNCED: 'useSyncedLayout',
  STATUS_BAR_COUNT: 4,
  HELPER_CALL_COUNT: 4,
  IMPORT_LINE_COUNT: 1,
  TOTAL_HITS: 5, // 1 import specifier + 4 calls
} as const;

export const HELPER = {
  FILE: 'triade/src/ui/statusBar.ts',
  EXPORT_TYPE: 'export type StatusBarStyle',
  EXPORT_FN: 'export function statusBarStyle',
  TYPE_LITERAL: "'auto'|'dark'",
  SIGNATURE: 'isLandscape: boolean',
  TERNARY: 'isLandscape ?',
  LITERAL_DARK: "'dark'",
  LITERAL_AUTO: "'auto'",
  NO_IMPORT_MARKER: 'import',
  NO_RN_MARKER: "from 'react-native",
  NO_EXPO_MARKER: "from 'expo",
} as const;

export const HOOK = {
  FILE: 'triade/src/ui/useSyncedLayout.ts',
  DEFAULT_DEBOUNCE: 'DEFAULT_DEBOUNCE_MS = 32',
  DEFAULT_DEF: 'DEFAULT_DEBOUNCE_MS',
  PARAM_DEFAULT: 'debounceMs: number = DEFAULT_DEBOUNCE_MS',
  EFFECTIVE_IS_LANDSCAPE: 'effectiveLayout.isLandscape',
  INSETS_LEFT: 'synced.insets.left',
} as const;

export const LAYOUT = {
  FILE: 'triade/src/ui/layout.ts',
  IS_LANDSCAPE_FN: 'isLandscape(width, height)',
  PORTRAIT_BAND: 'PORTRAIT_BAND_HEIGHT = 96',
  LANDSCAPE_BAND: 'LANDSCAPE_BAND_HEIGHT = 48',
  FLOOR: 'BOARD_SIZE_FLOOR',
  PURE_NO_HOOK: 'useWindowDimensions',
} as const;

export const ORIENTATION = {
  FILE: 'triade/src/ui/orientation.ts',
  CANONICAL: 'width > height',
  DEF: 'isLandscape',
} as const;

export const APP_JSON = {
  FILE: 'triade/app.json',
  STATUS_BAR_KEY: '"statusBar"',
  USER_INTERFACE_STYLE: 'userInterfaceStyle',
} as const;

export const LEDGER = {
  DW: 'DW-7',
  HASH: '0fca74990eec61dcdc0ddb42ec0e67898120b24fce4833ecc178f18ed2a2d422',
  SHORT: '0fca74990eec',
  DATE: '2026-09-02',
  BUNDLE: 'dw-decision-dw-7',
  SPEC_BUNDLE: 'dw-7-status-bar-dark-landscape',
  DECISION: 'Force dark status bar',
  RESOLUTION: 'resolved by sweep bundle dw-decision-dw-7',
  BASELINE: 'fb6df274fc961fea37dea271311a02c136fb6890',
  FINAL: '5588155b0b174f9ebd3b3bfcec7804117bb2ab23',
} as const;

export const SCAN_STRINGS = {
  STATUS_BAR: 'StatusBar',
  STATUS_BAR_STYLE: 'statusBarStyle',
  STATUS_BAR_CALL: 'statusBarStyle(isLandscape)',
  STATUS_BAR_PROP: 'style={statusBarStyle(isLandscape)}',
  BARE_AUTO: 'style="auto"',
  CONTAINER_BG: "backgroundColor: '#fff'",
  USE_SYNCED: 'useSyncedLayout',
  DEFAULT_DEBOUNCE: 'DEFAULT_DEBOUNCE_MS',
  DEFAULT_DEBOUNCE_32: 'DEFAULT_DEBOUNCE_MS = 32',
  STYLE_LIGHT_TYPO: 'style="light"',
  THEME: 'Theme',
  USE_COLOR_SCHEME: 'useColorScheme',
  STATUS_BAR_KEY: '"statusBar"',
  RESOLUTION_UNDO: 'resolution-undo',
  SPRINT_STATUS: 'sprint-status.yaml',
  HELPER_EXPORT_FN: 'export function statusBarStyle',
  HELPER_EXPORT_TYPE: 'export type StatusBarStyle',
  IS_LANDSCAPE_FN: 'isLandscape(width, height)',
  WIDTH_GT_HEIGHT: 'width > height',
  CROSS_CUTTING: 'Music|bgm|RevenueCat|AdMob|mulberry32|ceilingDetector|tierForCeiling|SafeAreaProvider.*initialMetrics',
} as const;

// ---------------------------------------------------------------------------
// Source-scan helpers
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export function appSrc(): string {
  return readSrc(APP_FIXTURE.FILE);
}
export function helperSrc(): string {
  return readSrc(HELPER.FILE);
}
export function hookSrc(): string {
  return readSrc(HOOK.FILE);
}
export function layoutSrc(): string {
  return readSrc(LAYOUT.FILE);
}
export function orientationSrc(): string {
  return readSrc(ORIENTATION.FILE);
}
export function appJsonSrc(): string {
  return readSrc(APP_JSON.FILE);
}
export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function specSrc(): string {
  try {
    return readSrc('_bmad-output/implementation-artifacts/spec-dw-7-status-bar-dark-landscape.md');
  } catch {
    return '';
  }
}
export function statusBarTestSrc(): string {
  return readSrc('triade/__tests__/ui/statusBar.test.ts');
}

export function countMatches(source: string, pattern: RegExp | string): number {
  const re =
    typeof pattern === 'string'
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  return (source.match(re) || []).length;
}

export function dwBlock(ledger: string, dw: string): string {
  const start = ledger.indexOf(`${dw}:`);
  if (start === -1) return '';
  const next = ledger.indexOf('### DW-', start + 1);
  return ledger.slice(start, next === -1 ? undefined : next);
}

// ---------------------------------------------------------------------------
// Assertion helpers — single-source invariants
// ---------------------------------------------------------------------------
export function assertHelperPure(): void {
  if (statusBarStyle(false) !== 'auto') throw new Error('statusBarStyle(false) must be auto');
  if (statusBarStyle(true) !== 'dark') throw new Error('statusBarStyle(true) must be dark');
  if (statusBarStyle(false) !== statusBarStyle(false)) throw new Error('helper must be pure portrait');
  if (statusBarStyle(true) !== statusBarStyle(true)) throw new Error('helper must be pure landscape');
  // Flip deterministic
  if (statusBarStyle(false) === statusBarStyle(true)) throw new Error('portrait vs landscape must differ');
}

export function assertHelperFileInvariants(src: string): void {
  if (!src.includes(HELPER.EXPORT_TYPE)) throw new Error('helper must export type StatusBarStyle');
  if (!src.includes("'auto'") || !src.includes("'dark'")) throw new Error("StatusBarStyle must be 'auto'|'dark'");
  if (!src.includes(HELPER.EXPORT_FN)) throw new Error('helper must export function statusBarStyle');
  if (!src.includes(HELPER.SIGNATURE)) throw new Error('signature must be (isLandscape: boolean)');
  if (!src.includes(HELPER.TERNARY)) throw new Error('helper must ternary on isLandscape');
  if ((src.match(/export function statusBarStyle/g) ?? []).length !== 1) throw new Error('single export function statusBarStyle');
  if ((src.match(/export type StatusBarStyle/g) ?? []).length !== 1) throw new Error('single export type StatusBarStyle');
  if ((src.match(/import/g) ?? []).length !== 0) throw new Error('helper must have zero imports (pure)');
  if (src.includes("from 'expo") || src.includes("from 'react-native")) throw new Error('helper must not import RN/expo');
  const lines = src.trim().split('\n').length;
  if (lines < 3 || lines > 10) throw new Error(`helper lines ${lines} expected 3-10 (tiny pure)`);
}

export function assertAppInvariants(app: string): void {
  if (!app.includes(APP_FIXTURE.STATUS_BAR_IMPORT)) throw new Error('App.tsx must import from src/ui/statusBar');
  const hits = (app.match(/statusBarStyle\(isLandscape\)/g) ?? []).length;
  if (hits !== APP_FIXTURE.HELPER_CALL_COUNT) throw new Error(`statusBarStyle(isLandscape) hits ${hits} expected ${APP_FIXTURE.HELPER_CALL_COUNT}`);
  const mounts = (app.match(/<StatusBar/g) ?? []).length;
  if (mounts !== APP_FIXTURE.STATUS_BAR_COUNT) throw new Error(`StatusBar mounts ${mounts} expected ${APP_FIXTURE.STATUS_BAR_COUNT}`);
  const bare = (app.match(/style="auto"/g) ?? []).length;
  if (bare !== 0) throw new Error(`bare style="auto" literals ${bare} expected 0`);
  const props = (app.match(/style=\{statusBarStyle\(isLandscape\)\}/g) ?? []).length;
  if (props !== 4) throw new Error(`style={statusBarStyle(isLandscape)} props ${props} expected 4`);
  const total = (app.match(/statusBarStyle/g) ?? []).length;
  if (total !== APP_FIXTURE.TOTAL_HITS) throw new Error(`statusBarStyle total hits ${total} expected ${APP_FIXTURE.TOTAL_HITS} (1 import +4 calls)`);
  const bg = (app.match(/backgroundColor: '#fff'/g) ?? []).length;
  if (bg !== 1) throw new Error(`container #fff hits ${bg} expected 1`);
  if ((app.match(/useColorScheme/g) ?? []).length !== 0) throw new Error('App.tsx must not use useColorScheme');
  if ((app.match(/Theme/g) ?? []).length !== 0) throw new Error('App.tsx must not introduce Theme');
  if ((app.match(/style="light"/g) ?? []).length !== 0) throw new Error('App.tsx must not use style="light" typo');
}

export function assertHookInvariants(hook: string): void {
  if (!hook.includes(HOOK.DEFAULT_DEBOUNCE)) throw new Error('hook must keep DEFAULT_DEBOUNCE_MS = 32');
  if ((hook.match(/DEFAULT_DEBOUNCE_MS/g) ?? []).length !== 2) throw new Error('DEFAULT_DEBOUNCE_MS must appear exactly 2 (const+param default)');
  if (!hook.includes(HOOK.PARAM_DEFAULT)) throw new Error('param default must be DEFAULT_DEBOUNCE_MS');
  if (!hook.includes(HOOK.EFFECTIVE_IS_LANDSCAPE)) throw new Error('hook must derive effectiveLayout.isLandscape');
}

export function assertLayoutInvariants(layout: string, orientation: string): void {
  if (!orientation.includes(ORIENTATION.CANONICAL)) throw new Error('orientation isLandscape must be width > height');
  if (!orientation.includes(ORIENTATION.DEF)) throw new Error('orientation must define isLandscape');
  if (!layout.includes(LAYOUT.IS_LANDSCAPE_FN)) throw new Error('layout must delegate isLandscape(width, height)');
  if ((layout.match(/export function isLandscape/g) ?? []).length !== 0) throw new Error('layout.ts should import isLandscape not redeclare');
  if (!layout.includes(LAYOUT.PORTRAIT_BAND)) throw new Error('PORTRAIT 96 must stay');
  if (!layout.includes(LAYOUT.LANDSCAPE_BAND)) throw new Error('LANDSCAPE 48 must stay');
  if (!layout.includes('BOARD_SIZE_FLOOR')) throw new Error('BOARD_SIZE_FLOOR must stay');
  if (!layout.includes('MIN_TILE_WIDTH')) throw new Error('BOARD_SIZE_FLOOR derived from MIN_TILE_WIDTH 44 must stay');
  if (layout.includes(LAYOUT.PURE_NO_HOOK)) throw new Error('layout must stay pure (no useWindowDimensions)');
}

export function assertLedgerDW7(doneLedger: string): void {
  const block = dwBlock(doneLedger, LEDGER.DW);
  if (!block.includes('status: done 2026-09-02')) throw new Error('DW-7 block must contain status: done 2026-09-02');
  if (!block.includes(LEDGER.HASH)) throw new Error(`DW-7 hash ${LEDGER.HASH} missing`);
  if (countMatches(doneLedger, LEDGER.HASH) !== 1) throw new Error('DW-7 hash must appear exactly once globally');
  if (!block.includes(LEDGER.DECISION)) throw new Error(`DW-7 decision "${LEDGER.DECISION}" missing`);
  if (!block.includes(LEDGER.RESOLUTION)) throw new Error(`DW-7 resolution "${LEDGER.RESOLUTION}" missing`);
}

export function assertSingleSource(helper: string, app: string): void {
  if ((helper.match(/export function statusBarStyle/g) ?? []).length !== 1) throw new Error('helper single function');
  if ((helper.match(/export type StatusBarStyle/g) ?? []).length !== 1) throw new Error('helper single type');
  if ((app.match(/from '.\/src\/ui\/statusBar/g) ?? []).length !== 1) throw new Error('single statusBar import');
  if ((app.match(/<StatusBar/g) ?? []).length !== 4) throw new Error('StatusBar mounts 4');
  if ((app.match(/statusBarStyle\(isLandscape\)/g) ?? []).length !== 4) throw new Error('helper calls 4');
}

export function assertNoCrossCutting(app: string, helper: string): void {
  if (/from 'react-native-reanimated|from '@shopify\/react-native-skia|ceilingDetector|tierForCeiling|potForTier|mulberry32|RevenueCat|AdMob/.test(helper)) throw new Error('helper must not import engine/feel/monetization');
  if (/FROZEN/.test(app) && app.includes('statusBarStyle')) {
    // FROZEN is engine Not in Scope, unrelated to status bar
  }
}

export function statusBarBench(iterations = 10000): { elapsed: number; ok: boolean } {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) {
    statusBarStyle(i % 2 === 0);
    statusBarStyle(i % 2 === 1);
  }
  const elapsed = performance.now() - t0;
  const ok = elapsed < 50;
  return { elapsed, ok };
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export { statusBarStyle };
export type { StatusBarStyle };

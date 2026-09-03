/**
 * Fixtures — dw-gameover-hardware-back-handler (DW-95)
 * GameOverOverlay BackHandler hardwareBackPress — component-local lifetime subscription
 * Deterministic, host-only, no faker — pure triade/src/ui/GameOverOverlay.tsx + triade/test-utils/rn-stub.ts
 * Covers: triade/src/ui/GameOverOverlay.tsx:2 BackHandler import + 84-95 useEffect hardwareBackPress () => true + sub.remove / removeEventListener fallback + deps []
 *         triade/test-utils/rn-stub.ts:102-105 BackHandler stub addEventListener → {remove} + removeEventListener noop
 *         App.tsx:1165 {gameOver ? <GameOverOverlay/> : null} sibling mount gate
 *         ledger DW-95 open→done 2026-09-03 + resolution-undo 5f794ee… + undo-base deb5edf9…
 * Spec: _bmad-output/implementation-artifacts/spec-gameover-hardware-back-handler.md (baseline 6335c41, status done)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-gameover-hardware-back-handler.md (10 risks, 3 high R-001/R-002/R-003 score 6-9)
 * ATDD: triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts (22 skip → 22 pass when activated, node:test + tsx + react-test-renderer + rn-stub spy)
 *       _bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts (mirror)
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-gameover-hardware-back-handler.atdd.test.ts (22 pass when de-skipped)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx + readFileSync scans + react-test-renderer (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';

export { stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';

// ── Scan strings (single-source grep — literal copies from source) ─────────
export const SCAN_STRINGS = {
  BACKHANDLER_IMPORT: "BackHandler",
  BACKHANDLER_FROM_RN: "from 'react-native'",
  ADD_HARDWARE: "addEventListener('hardwareBackPress'",
  REMOVE_HARDWARE: "removeEventListener('hardwareBackPress'",
  HANDLER_TRUE: '() => true',
  HANDLER_CONST: 'const handler = () => true',
  SUB_REMOVE_GUARD: "typeof sub.remove === 'function'",
  SUB_REMOVE_CALL: 'sub.remove()',
  FALLBACK_REMOVE: "removeEventListener('hardwareBackPress', handler)",
  EMPTY_DEPS: '}, []);',
  USE_EFFECT_BACKHANDLER: 'BackHandler.addEventListener',
  AS_ANY: 'as any',
  // rn-stub
  STUB_EXPORT: 'export const BackHandler',
  STUB_ADD: 'addEventListener: (_event: string, _handler: () => boolean) => ({ remove:',
  STUB_REMOVE: 'removeEventListener: (_event: string, _handler: () => boolean)',
  TSCONFIG_MAP: '"react-native":',
  RN_STUB_PATH: 'rn-stub',
  // thin-view
  REANIMATED: 'reanimated',
  SKIA: 'skia',
  SET_TIMEOUT: 'setTimeout',
  SET_INTERVAL: 'setInterval',
  HIT_TARGET: 'HIT_TARGET',
  SCRIM_RGBA: 'rgba(12,14,17,0.7)',
  ZINDEX_2: 'zIndex: 2',
  // a11y
  A11Y_LABEL: 'a11yLabel',
  GAME_OVER_LABEL: 'Game over',
  RESTART_KEY: 'gameOver.restart',
  RESTART_LABEL: 'Jogar de novo',
  // ledger
  DW95: 'DW-95',
  LEDGER_HASH: '5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00',
  UNDO_BASE: 'deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b',
  HEX_OPEN: '7374617475733a206f70656e',
  RESOLUTION_UNDO: 'resolution-undo: 5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00',
  RESOLUTION: 'resolved by sweep bundle dw-gameover-hardware-back-handler',
  DONE_DATE: 'status: done 2026-09-03',
  // navigation negative
  NAV_ROUTER: 'expo-router',
  NAVIGATION: '@react-navigation',
  USE_NAVIGATION: 'useNavigation',
  // typos
  TYPO: 'hardwareBackPresss',
  FALSE_HANDLER: "hardwareBackPress.*=>.*false",
  // App wiring
  APP_CONDITIONAL: '{gameOver ? <GameOverOverlay',
  APP_GAMEBOARD: '<GameBoard',
  // effect count
  USE_EFFECT: 'useEffect',
};

// ── Overlay props fixtures ────────────────────────────────────────────────
export const OVERLAY_FIXTURES = {
  STATS: { score: 123, best: 456, maxTile: 48, merges: 7, longestStreak: 3 },
  INSETS: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

export function baseOverlayProps(overrides: Record<string, unknown> = {}) {
  return {
    stats: OVERLAY_FIXTURES.STATS,
    isNewRecord: false,
    onRestart: () => {},
    insets: OVERLAY_FIXTURES.INSETS,
    reducedMotion: false,
    activeLaneId: 'clean' as const,
    ...overrides,
  };
}

// ── Spy type ────────────────────────────────────────────────────────────────
export type BackHandlerSpy = {
  addCalls: number;
  removeCalls: number;
  removeEventListenerCalls: number;
  handler: (() => boolean) | null;
  lastEvent: string | null;
  lastRemoveEvent: string | null;
};

export function makeSpy(): BackHandlerSpy {
  return { addCalls: 0, removeCalls: 0, removeEventListenerCalls: 0, handler: null, lastEvent: null, lastRemoveEvent: null };
}

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

// ── Gate constants ──────────────────────────────────────────────────────────
export const GATE_CONSTANTS = {
  BACKHANDLER_HITS_MIN: 3,
  BACKHANDLER_HITS_MAX: 4,
  ADD_HARDWARE_COUNT: 1,
  REMOVE_HARDWARE_COUNT: 1,
  HANDLER_TRUE_COUNT: 1,
  USE_EFFECT_MIN: 2,
  BACKHANDLER_EFFECTS: 1,
  LEDGER_HASH_COUNT: 1,
  UNDO_BASE_COUNT: 1,
  HEX_OPEN_COUNT: 1,
  RESOLUTION_UNDO_LINES: 1,
  FALSE_HANDLER_COUNT: 0,
  TYPO_COUNT: 0,
  NAV_COUNT: 0,
  REANIMATED_COUNT: 0,
  SKIA_COUNT: 0,
  TIMEOUT_COUNT: 0,
} as const;

// ── Ledger / spec ───────────────────────────────────────────────────────────
export const LEDGER = {
  HASH: '5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00',
  UNDO_BASE: 'deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b',
  HEX_OPEN: '7374617475733a206f70656e',
  DW95: 'DW-95',
  DONE_DATE: '2026-09-03',
  RESOLUTION: 'resolved by sweep bundle dw-gameover-hardware-back-handler',
} as const;

export const SPEC = {
  BASELINE_REVISION: '6335c4178ddb844283ce6fd533aef208904837c1',
  SPEC_PATH: '_bmad-output/implementation-artifacts/spec-gameover-hardware-back-handler.md',
} as const;

// ── Validation helpers ──────────────────────────────────────────────────────
export function assertBackHandlerImport(source: string): void {
  if (!source.includes(SCAN_STRINGS.BACKHANDLER_IMPORT)) throw new Error('BackHandler import missing');
  if (!source.includes(SCAN_STRINGS.BACKHANDLER_FROM_RN)) throw new Error('BackHandler must be from react-native');
  if (!/import\s*\{[^}]*BackHandler[^}]*\}\s*from\s*['"]react-native['"]/.test(source)) throw new Error('BackHandler not in named imports from react-native');
}

export function assertHardwareBackPress(source: string): void {
  if (countMatches(source, SCAN_STRINGS.ADD_HARDWARE) !== GATE_CONSTANTS.ADD_HARDWARE_COUNT) throw new Error(`addEventListener hardwareBackPress expected ${GATE_CONSTANTS.ADD_HARDWARE_COUNT} got ${countMatches(source, SCAN_STRINGS.ADD_HARDWARE)}`);
  if (countMatches(source, SCAN_STRINGS.REMOVE_HARDWARE) !== GATE_CONSTANTS.REMOVE_HARDWARE_COUNT) throw new Error(`removeEventListener hardwareBackPress expected ${GATE_CONSTANTS.REMOVE_HARDWARE_COUNT} got ${countMatches(source, SCAN_STRINGS.REMOVE_HARDWARE)}`);
  if (countMatches(source, SCAN_STRINGS.TYPO) !== GATE_CONSTANTS.TYPO_COUNT) throw new Error('typo hardwareBackPresss found');
}

export function assertHandlerTrue(source: string): void {
  if (!source.includes(SCAN_STRINGS.HANDLER_TRUE)) throw new Error('() => true missing');
  if (countMatches(source, SCAN_STRINGS.HANDLER_TRUE) !== GATE_CONSTANTS.HANDLER_TRUE_COUNT) throw new Error(`() => true expected ${GATE_CONSTANTS.HANDLER_TRUE_COUNT} got ${countMatches(source, SCAN_STRINGS.HANDLER_TRUE)}`);
  if (!source.includes(SCAN_STRINGS.HANDLER_CONST)) throw new Error('const handler = () => true missing');
}

export function assertDualPath(source: string): void {
  if (!source.includes(SCAN_STRINGS.SUB_REMOVE_GUARD)) throw new Error('typeof sub.remove guard missing');
  if (!source.includes(SCAN_STRINGS.SUB_REMOVE_CALL)) throw new Error('sub.remove() missing');
  if (!source.includes(SCAN_STRINGS.FALLBACK_REMOVE)) throw new Error('fallback removeEventListener missing');
}

export function assertEmptyDeps(source: string): void {
  if (!source.includes(SCAN_STRINGS.EMPTY_DEPS)) throw new Error('empty deps [] missing');
  const bhBlock = source.slice(Math.max(0, source.indexOf(SCAN_STRINGS.USE_EFFECT_BACKHANDLER) - 200), source.indexOf(SCAN_STRINGS.USE_EFFECT_BACKHANDLER) + 500);
  if (bhBlock.includes('reducedMotion')) throw new Error('BackHandler effect must not reference reducedMotion');
  const bhHits = countMatches(source, SCAN_STRINGS.BACKHANDLER_IMPORT);
  if (bhHits < GATE_CONSTANTS.BACKHANDLER_HITS_MIN || bhHits > GATE_CONSTANTS.BACKHANDLER_HITS_MAX) throw new Error(`BackHandler hits ${bhHits} expected ${GATE_CONSTANTS.BACKHANDLER_HITS_MIN}-${GATE_CONSTANTS.BACKHANDLER_HITS_MAX}`);
}

export function assertStub(stubSource: string, tsconfigTestSource: string): void {
  if (!stubSource.includes(SCAN_STRINGS.STUB_EXPORT)) throw new Error('stub BackHandler export missing');
  if (!stubSource.includes('addEventListener')) throw new Error('stub addEventListener missing');
  if (!stubSource.includes('removeEventListener')) throw new Error('stub removeEventListener missing');
  if (!tsconfigTestSource.includes(SCAN_STRINGS.RN_STUB_PATH)) throw new Error('tsconfig.test.json rn-stub mapping missing');
}

export function assertThinView(source: string): void {
  if (countMatches(source, SCAN_STRINGS.REANIMATED) !== 0) throw new Error('reanimated must not be in GameOverOverlay');
  if (countMatches(source, SCAN_STRINGS.SKIA) !== 0) throw new Error('skia must not be in GameOverOverlay');
  if (countMatches(source, SCAN_STRINGS.SET_TIMEOUT) !== 0) throw new Error('setTimeout must not be in GameOverOverlay');
  if (countMatches(source, SCAN_STRINGS.SET_INTERVAL) !== 0) throw new Error('setInterval must not be in GameOverOverlay');
  if (!source.includes(SCAN_STRINGS.SCRIM_RGBA)) throw new Error('scrim rgba missing');
}

export function assertLedger(ledgerSource: string): void {
  if (!ledgerSource.includes(LEDGER.HASH)) throw new Error('ledger hash 5f794ee missing');
  if (!ledgerSource.includes(LEDGER.UNDO_BASE)) throw new Error('undo-base deb5edf9 missing');
  if (!ledgerSource.includes(LEDGER.HEX_OPEN)) throw new Error('hex open missing');
  if (!ledgerSource.includes(LEDGER.DW95)) throw new Error('DW-95 missing');
  if (!ledgerSource.includes(LEDGER.DONE_DATE)) throw new Error('done date missing');
  if (!ledgerSource.includes(LEDGER.RESOLUTION)) throw new Error('resolution missing');
}

export function assertNoNavigation(source: string, pkgSource: string): void {
  if (countMatches(source, SCAN_STRINGS.USE_NAVIGATION) !== 0) throw new Error('useNavigation must not be in GameOverOverlay');
  if (source.includes(SCAN_STRINGS.NAV_ROUTER) && source.includes(SCAN_STRINGS.BACKHANDLER_IMPORT)) {
    // only fail if BackHandler imported from gesture-handler
    if (source.includes("from 'react-native-gesture-handler'") && source.includes('BackHandler')) throw new Error('BackHandler from gesture-handler');
  }
  if (pkgSource.includes(SCAN_STRINGS.NAV_ROUTER)) throw new Error('expo-router must not be in package.json');
  if (pkgSource.includes(SCAN_STRINGS.NAVIGATION)) throw new Error('react-navigation must not be in package.json');
}

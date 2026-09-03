/**
 * Fixtures — dw-board-a11y-screen-reader-bridge (DW-112/113)
 * BoardA11yOverlay focus + Skia Canvas hide — deterministic host-only, no faker
 * Covers: triade/src/a11y/boardAccessibility.tsx:1-83 focus effect + tileRefs + findNodeHandle
 *         triade/src/render/GameBoard.tsx:658 Canvas wrapper importantForAccessibility="no-hide-descendants"
 *         triade/test-utils/rn-stub.ts:102 findNodeHandle stub
 *         ledger DW-112/113 open→done 2026-09-03 + resolution-undo e282524d…
 * Spec: _bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md (baseline fd016ad, status done)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-board-a11y-screen-reader-bridge.md (11 risks, 3 high R-001/R-002/R-003 score 6)
 * ATDD: triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts (19 skip → 19 pass when activated)
 *       _bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts (mirror)
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-board-a11y-screen-reader-bridge.atdd.test.ts
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx + readFileSync scans + react-test-renderer (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';

export { stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';

// ── Scan strings (single-source grep — literal copies from source) ─────────
export const SCAN_STRINGS = {
  // boardAccessibility focus seam
  FIND_NODE_HANDLE_IMPORT: 'findNodeHandle',
  FIND_NODE_HANDLE_FROM_RN: "from 'react-native'",
  FIND_NODE_HANDLE_CALL: 'findNodeHandle(targetRef)',
  SET_ACCESSIBILITY_FOCUS: 'setAccessibilityFocus',
  SET_FOCUS_GUARD: "typeof ai.setAccessibilityFocus",
  TILE_REFS_DEF: 'tileRefs = useRef<Map',
  TILE_REFS_GET: 'tileRefs.current.get(key)',
  TILE_REFS_SET: 'tileRefs.current.set',
  TILE_REFS_DELETE: 'tileRefs.current.delete',
  IS_FIRST_RENDER_DEF: 'isFirstRenderRef = useRef(true)',
  IS_FIRST_RENDER_CHECK: 'isFirstRenderRef.current',
  PREV_BOARD_REF: 'prevBoardRef = useRef<Board',
  USE_EFFECT_BOARD: 'useEffect(() => {',
  USE_EFFECT_DEPS_BOARD: '[board]',
  OUTER_LABEL: 'outer:',
  ROW_NOT_NULL: 'if (row[c] !== null)',
  IF_REF: 'if (ref)',
  CONST_TAG: 'const tag = findNodeHandle(targetRef)',
  IF_TAG: 'if (tag) ai.setAccessibilityFocus(tag)',
  TRY_CATCH: 'try {',
  CATCH_EMPTY: 'catch {}',
  ARRAY_IS_ARRAY_BOARD: '!Array.isArray(board)',
  ARRAY_IS_ARRAY_ROW: '!Array.isArray(row)',
  VALUE_NULL: 'value === null',
  NUMBER_IS_FINITE: 'Number.isFinite(width)',
  SAFE_WIDTH: 'Math.max(1, finiteWidth)',
  POINTER_EVENTS_BOX_NONE: 'pointerEvents="box-none"',
  IMPORTANT_NO: 'importantForAccessibility="no"',
  ROLE_TEXT: 'accessibilityRole="text"',
  ACCESSIBLE_LABEL: 'accessibilityLabel={label}',
  OVERLAY_CONSTANTS: '__BOARD_A11Y_CONSTANTS',
  GRID: 'GRID',
  BOARD_PADDING: 'BOARD_PADDING',
  CELL_GAP: 'CELL_GAP',
  // GameBoard Canvas wrapper
  NO_HIDE_DESCENDANTS: 'importantForAccessibility="no-hide-descendants"',
  ACCESSIBLE_FALSE: 'accessible={false}',
  ANIMATED_VIEW_SHAKE: '<Animated.View style={shakeStyle}>',
  CANVAS: '<Canvas',
  VIEW_WRAPPER: '<View importantForAccessibility="no-hide-descendants"',
  // rn-stub
  STUB_FIND_NODE_HANDLE: 'export const findNodeHandle',
  STUB_FIND_NODE_HANDLE_BODY: 'findNodeHandle = (_ref: any) => (_ref ? 1 : null)',
  STUB_ACCESSIBILITY_INFO: 'AccessibilityInfo',
  STUB_SET_FOCUS: 'setAccessibilityFocus',
  TSCONFIG_MAP: '"react-native":',
  RN_STUB_PATH: 'rn-stub',
  // thin-view
  ANNOUNCE_TILE: 'announceTile',
  I18N_TILE: "i18n.t('a11y.tile'",
  // ledger
  DW112: 'DW-112',
  DW113: 'DW-113',
  LEDGER_HASH: 'e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75',
  HEX_OPEN: '7374617475733a206f70656e',
  RESOLUTION_UNDO: 'resolution-undo: e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75',
};

export const LEDGER = {
  HASH: 'e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75',
  HEX_OPEN: '7374617475733a206f70656e',
  DW112: 'DW-112',
  DW113: 'DW-113',
  DATE: '2026-09-03',
  RESOLUTION: 'resolved by sweep bundle dw-board-a11y-screen-reader-bridge',
};

export const GATE_CONSTANTS = {
  GRID: 4,
  BOARD_PADDING: 8,
  CELL_GAP: 8,
  SAFE_WIDTH_GUARD: 'Math.max(1, finiteWidth)',
  FINITE_GUARD: 'Number.isFinite(width)',
};

// ── Deterministic board fixtures (4×4 Board = (number|null)[][]) ─────────
export type Board = (number | null)[][];

export const BOARD_FIXTURES = {
  // single surviving tile at 0,0 (for first-mount no-focus then update path)
  single00: [
    [3, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ] as Board,
  // single surviving at 1,1 value 12 (first surviving row-major after vanished 0,0)
  single11: [
    [null, null, null, null],
    [null, 12, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ] as Board,
  // two non-null: 0,0 and 0,3
  twoSparse: [
    [3, null, null, 6],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ] as Board,
  // after move: 0,0 vanished, first surviving is 0,3
  afterVanish03: [
    [null, null, null, 6],
    [null, 12, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ] as Board,
  // jagged
  jagged: [[1, null], [null]] as unknown as Board,
  // null board
  nullBoard: null as unknown as Board,
  // all null
  empty: [
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ] as Board,
  // full 16 tiles
  full: [
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 3, 6],
    [12, 24, 48, 96],
  ] as Board,
} as const;

export const WIDTH_FIXTURES = {
  valid: 320,
  nan: NaN,
  infinity: Infinity,
  zero: 0,
  negative: -1,
} as const;

// ── Scan helpers ─────────
export function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

export function countMatches(src: string, pattern: RegExp | string): number {
  if (typeof pattern === 'string') {
    return (src.match(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  }
  return (src.match(pattern) || []).length;
}

export function countMatchesAll(src: string, re: RegExp): number {
  return (src.match(re) || []).length;
}

// ── Validation helpers (single-source) ─────────
export function assertFindNodeHandleImport(src: string): void {
  if (!src.includes('findNodeHandle')) throw new Error('missing findNodeHandle');
  if (!src.includes("from 'react-native'") && !src.includes('from "react-native"')) throw new Error('missing react-native import');
}

export function assertSetAccessibilityFocusGuards(src: string): void {
  if (!src.includes("typeof ai.setAccessibilityFocus")) throw new Error('missing typeof guard');
  if (!src.includes('findNodeHandle(targetRef)')) throw new Error('missing findNodeHandle(targetRef)');
  if (!src.includes('if (tag) ai.setAccessibilityFocus(tag)')) throw new Error('missing if(tag) gate');
  if (!src.includes('try {')) throw new Error('missing try');
}

export function assertTileRefsLifecycle(src: string): void {
  if (!src.includes('tileRefs.current.get(key)')) throw new Error('missing get(key)');
  if (!src.includes('tileRefs.current.set')) throw new Error('missing set');
  if (!src.includes('tileRefs.current.delete')) throw new Error('missing delete');
}

export function assertCanvasWrapper(src: string): void {
  if (!src.includes('importantForAccessibility="no-hide-descendants"')) throw new Error('missing no-hide-descendants');
  if (!src.includes('accessible={false}')) throw new Error('missing accessible false');
  if (!src.includes('<Canvas')) throw new Error('missing Canvas');
  if (!src.includes('<Animated.View style={shakeStyle}>')) throw new Error('missing chrome guard');
}

export function assertLedger(md: string): void {
  if (!md.includes(LEDGER.HASH)) throw new Error('missing ledger hash');
  if (!md.includes(LEDGER.HEX_OPEN)) throw new Error('missing hex open');
  if (!md.includes('DW-112')) throw new Error('missing DW-112');
  if (!md.includes('DW-113')) throw new Error('missing DW-113');
  if (!md.includes('status: done 2026-09-03')) throw new Error('missing done date');
}

export function assertThinView(src: string): void {
  // boardAccessibility should not duplicate engine merge/spawn beyond announceTile
  const withoutAnnounce = src.replace(/announceTile/g, '');
  if (/merge|spawn/.test(withoutAnnounce)) throw new Error('engine duplication in src/a11y');
}

export function assertNoEngineDup(src: string): void {
  assertThinView(src);
}

// ── Spy helpers for host tests ─────────
export type FocusSpy = { calls: number[]; tags: number[]; callCount: number };
export function makeFocusSpy(): FocusSpy {
  return { calls: [], tags: [], callCount: 0 };
}

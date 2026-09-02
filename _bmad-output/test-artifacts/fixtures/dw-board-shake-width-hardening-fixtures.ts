/**
 * Fixtures — dw-board-shake-width-hardening (DW-107, DW-110)
 * Board shake overflow visible + width hardening — pure GameBoard + App boardWrap seam
 * Deterministic, host-only, no faker — pure triade/src/render/GameBoard.tsx + triade/App.tsx
 * Covers: triade/src/render/GameBoard.tsx:313 onShakeActiveChange? + 317 finiteWidth + 318 safeWidth Math.max(1, finiteWidth)
 *         triade/src/render/GameBoard.tsx:331-371 shakeNotifyTimerRef + notifyShakeActive try/catch + scheduleShakeVisible 130ms + cancelShakeNotify + reducedMotion effect
 *         triade/src/render/GameBoard.tsx:622-655 View/Canvas/RoundedRect/overlay safeWidth 1:1 square + width, height: width literal comment
 *         triade/App.tsx:139 isBoardShaking + 1020 boardWrap overflow:visible conditional + 1032 onShakeActiveChange={setIsBoardShaking}
 *         triade/src/feel/shake.ts: SHAKE_CAP 8 + directionVector + maxShakeForTrace (unchanged datum — scan pins)
 * Spec: _bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md (status done, final_revision db01dfa, baseline e3c52ae, 5-row I/O matrix)
 * Design: _bmad-output/test-artifacts/test-design-dw-board-shake-width-hardening.md + mirror test-design/test-design-dw-board-shake-width-hardening.md (10 risks, 3 high score 6 R-001/R-002/R-003)
 * ATDD: _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts (24 skip → 24 pass when activated, node:test + tsx)
 *       triade/__tests__/feel/shake.atdd.test.ts P2-05 (it.skip EXPECTED RED → active green after e3c4155)
 *       triade/__tests__/feel/bulletTime.atdd.test.ts P2-05 (same flip)
 *       triade/__tests__/feel/reducedMotion.atdd.test.ts P2-06 (stays green — literal scan)
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-board-shake-width-hardening.atdd.test.ts (24 pass when de-skipped)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx + readFileSync scans + react-test-renderer + jest fake timers (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';

export { stripCommentsAndStrings };

// ── Scan strings (single-source grep — literal copies from source) ─────────
export const SCAN_STRINGS = {
  // DW-110 width guard
  FINITE_WIDTH: 'const finiteWidth = Number.isFinite(width) ? (width as number) : 1;',
  SAFE_WIDTH: 'const safeWidth = Math.max(1, finiteWidth);',
  SAFE_WIDTH_CELL: 'const cell = Math.max((safeWidth - BOARD_PADDING * 2 - CELL_GAP * (GRID - 1)) / GRID, 1);',
  NUMBER_IS_FINITE: 'Number.isFinite(width)',
  MATH_MAX_1: 'Math.max(1, finiteWidth)',
  VIEW_SAFE: '<View style={{ width: safeWidth, height: safeWidth }}>',
  CANVAS_SAFE: '<Canvas style={{ width: safeWidth, height: safeWidth }}>',
  ROUNDED_SAFE: '<RoundedRect x={0} y={0} width={safeWidth} height={safeWidth}',
  OVERLAY_SAFE_WIDTH: 'width: safeWidth,',
  OVERLAY_SAFE_HEIGHT: 'height: safeWidth,',
  WIDTH_HEIGHT_LITERAL: 'width, height: width', // comment alias for reducedMotion.atdd P2-06
  WIDTH_HEIGHT_LITERAL_COMMENT: '// board container is width, height: width (safeWidth alias keeps 1:1 square; DW-110 guard via safeWidth)',
  // DW-107 shake notify
  SHAKE_TIMER_REF: 'const shakeNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);',
  NOTIFY_CB: 'const notifyShakeActive = useCallback(',
  NOTIFY_OPTIONAL: 'onShakeActiveChange?.(active)',
  NOTIFY_TRY: 'try {',
  NOTIFY_CATCH: '} catch {}',
  NOTIFY_DEPS: '[onShakeActiveChange]',
  SCHEDULE_DEF: 'const scheduleShakeVisible = useCallback(() => {',
  SCHEDULE_TRUE: 'notifyShakeActive(true);',
  SCHEDULE_CLEAR: 'if (shakeNotifyTimerRef.current) clearTimeout(shakeNotifyTimerRef.current);',
  SCHEDULE_TIMEOUT: 'shakeNotifyTimerRef.current = setTimeout(() => {',
  SCHEDULE_130: '}, 130);',
  CANCEL_DEF: 'const cancelShakeNotify = useCallback(() => {',
  CANCEL_FALSE: 'notifyShakeActive(false);',
  UNMOUNT_EFFECT: 'useEffect(() => {',
  UNMOUNT_RETURN: 'return () => {',
  UNMOUNT_CLEAR: 'if (shakeNotifyTimerRef.current) {',
  UNMOUNT_NULL: 'shakeNotifyTimerRef.current = null;',
  SCHEDULE_DEPS: '[notifyShakeActive]',
  REDUCED_IF: 'if (reducedMotion) {',
  REDUCED_SNAP_X: 'shakeX.value = withTiming(0, { duration: 20 });',
  REDUCED_SNAP_Y: 'shakeY.value = withTiming(0, { duration: 20 });',
  REDUCED_SNAP_FLASH: 'bulletFlash.value = withTiming(0, { duration: 20 });',
  REDUCED_CANCEL: 'cancelShakeNotify();',
  REDUCED_DEPS: '[reducedMotion, shakeX, shakeY, bulletFlash, cancelShakeNotify]',
  MOVE_EFFECT_DEPS: '[moveResult, board, applyPlan, direction, reducedMotion, sessionBestMerge, shakeX, shakeY, bulletFlash, syncTiles, rebuildTilesFromBoard, scheduleShakeVisible, cancelShakeNotify]',
  AMPLITUDE_GT0: 'if (amplitude > 0) {',
  SCHEDULE_CALL: 'scheduleShakeVisible();',
  VEC_X: 'if (vec.x !== 0)',
  VEC_Y: '} else if (vec.y !== 0)',
  DIRECTION_VECTOR: 'directionVector(direction)',
  WITH_SEQUENCE: 'withSequence',
  WITH_TIMING: 'withTiming',
  WITH_TIMING_130: 'withTiming(0, { duration: 130 })',
  BOARD_PADDING_SHAKE_CAP: 'BOARD_PADDING + SHAKE_CAP',
  COMMENT_130: '130ms shake',
  COMMENT_OVERFLOW: 'overflow visible',
  // App
  IS_BOARD_SHAKING: 'const [isBoardShaking, setIsBoardShaking] = useState(false);',
  BOARD_WRAP_CONDITIONAL: "isBoardShaking ? { overflow: 'visible' } : null",
  OVERFLOW_VISIBLE: "overflow: 'visible'",
  OVERFLOW_HIDDEN: "overflow: 'hidden'",
  ON_SHAKE_PROP: 'onShakeActiveChange={setIsBoardShaking}',
  ON_SHAKE_INTERFACE: 'onShakeActiveChange?: (active: boolean) => void;',
  // Datum / engine boundary
  SHAKE_CAP: 'SHAKE_CAP',
  BULLET_FLASH: 'bulletFlash',
  // Branch comments
  INVALID_DIR_COMMENT: '// Invalid direction — suppress shake',
  SLIDE_ONLY_COMMENT: '// Effective move but no merge (slide-only)',
  NOOP_COMMENT: '// NOOP, Reduced Motion, or missing direction',
  // Ledger
  DW107: 'DW-107',
  DW110: 'DW-110',
  LEDGER_HASH: 'e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f',
  RESOLUTION_UNDO: 'resolution-undo: e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f',
  SPEC_FINAL: 'final_revision: db01dfa',
  SPEC_BASELINE: 'baseline_revision: e3c52ae',
};

// ── Degenerate width fixtures (DW-110 guard) ────────────────────────────────
export const WIDTH_FIXTURES = {
  NAN: NaN as unknown as number,
  INFINITY: Infinity as unknown as number,
  NEG_INFINITY: -Infinity as unknown as number,
  NEGATIVE_5: -5,
  ZERO: 0,
  UNDEFINED: undefined as unknown as number,
  STRING: 'x' as unknown as number,
  NULL: null as unknown as number,
  EMPTY_STRING: '' as unknown as number,
  LARGE: 200 as number,
  NARROW_160: 160 as number,
} as const;

// ── moveResult fixtures (DW-107 shake branches) ─────────────────────────────
export const MERGE_TRACE_LEFT = [{ value: 12 as const, from: [[0, 1], [0, 2]] as [[number, number], [number, number]], spawned: false as const, to: [0, 0] as [number, number] }];
export const MERGE_TRACE_RIGHT = [{ value: 12 as const, from: [[0, 0], [0, 1]] as [[number, number], [number, number]], spawned: false as const, to: [0, 3] as [number, number] }];
export const MERGE_TRACE_UP = [{ value: 8 as const, from: [[1, 0], [2, 0]] as [[number, number], [number, number]], spawned: false as const, to: [0, 0] as [number, number] }];
export const MERGE_TRACE_DOWN = [{ value: 8 as const, from: [[0, 0], [1, 0]] as [[number, number], [number, number]], spawned: false as const, to: [3, 0] as [number, number] }];
export const SLIDE_ONLY_TRACE = [{ value: 2 as const, from: [[0, 1]] as unknown as [[number, number], [number, number]], spawned: false as const, to: [0, 0] as [number, number] }];

export const MOVE_RESULT_FIXTURES = {
  MERGE_LEFT: { moved: true as const, trace: MERGE_TRACE_LEFT, direction: 'left' as const },
  MERGE_RIGHT: { moved: true as const, trace: MERGE_TRACE_RIGHT, direction: 'right' as const },
  MERGE_UP: { moved: true as const, trace: MERGE_TRACE_UP, direction: 'up' as const },
  MERGE_DOWN: { moved: true as const, trace: MERGE_TRACE_DOWN, direction: 'down' as const },
  NOOP: { moved: false as const, trace: [] as const },
  SLIDE_ONLY: { moved: true as const, trace: SLIDE_ONLY_TRACE, amplitude: 0 as const },
  NO_DIR: { moved: true as const, trace: MERGE_TRACE_LEFT, direction: undefined as unknown as string },
  INVALID_DIR: { moved: true as const, trace: MERGE_TRACE_LEFT, direction: 'invalid' as unknown as string },
} as const;

// ── Expected safeWidth (pure TS mirror) ─────────────────────────────────────
export function expectedSafeWidth(width: unknown): number {
  const finiteWidth = Number.isFinite(width as number) ? (width as number) : 1;
  return Math.max(1, finiteWidth);
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

// ── Gate constants (spec verification) ──────────────────────────────────────
export const GATE_CONSTANTS = {
  SAFE_WIDTH_COUNT: 9,
  NUMBER_IS_FINITE_COUNT: 2, // GameBoard width + sessionBestMerge finite guard
  SHAKE_TIMER_REF_COUNT: 10,
  CLEAR_SHAKE_TIMER_COUNT: 3, // schedule + cancel + unmount cleanup (shakeNotifyTimerRef only)
  COUNT_130: 6, // comment + setTimeout + 2x withTiming(0,130) + 130ms comment? actual 6 incl board size comments? pinned via rg -n 130
  CANCEL_NOTIFY_COUNT: 4, // reducedMotion effect + 3 shake branches
  SCHEDULE_CALL_COUNT: 1,
  OVERFLOW_VISIBLE_COUNT_APP: 1,
  OVERFLOW_HIDDEN_COUNT_APP: 2, // layout file + StyleSheet
  IS_BOARD_SHAKING_COUNT: 2,
  ON_SHAKE_GB_COUNT: 4,
  WIDTH_HEIGHT_LITERAL_COUNT: 1,
  WIDTH_SAFE_COUNT: 2, // View + Canvas width: safeWidth, height: safeWidth
  LEDGER_HASH_COUNT: 2,
} as const;

// ── Ledger / spec ───────────────────────────────────────────────────────────
export const LEDGER = {
  HASH: 'e7ad6158649620fdeee8687ab72310cc63b608b2ec5ff0272c566b3e68fff05f',
  DW107: 'DW-107',
  DW110: 'DW-110',
  DONE_DATE: '2026-09-02',
  RESOLUTION: 'resolved by sweep bundle dw-board-shake-width-hardening',
} as const;

export const SPEC = {
  FINAL_REVISION: 'db01dfa',
  BASELINE_REVISION: 'e3c52ae',
  SPEC_PATH: '_bmad-output/implementation-artifacts/spec-board-shake-width-hardening.md',
} as const;

// ── Validation helpers (host-only) ──────────────────────────────────────────
export function assertWidthGuard(source: string): void {
  if (!source.includes(SCAN_STRINGS.FINITE_WIDTH)) throw new Error('finiteWidth guard missing');
  if (!source.includes(SCAN_STRINGS.SAFE_WIDTH)) throw new Error('safeWidth guard missing');
  if (!source.includes(SCAN_STRINGS.MATH_MAX_1)) throw new Error('Math.max(1, finiteWidth) missing');
  if (countMatches(source, 'safeWidth') !== GATE_CONSTANTS.SAFE_WIDTH_COUNT) {
    throw new Error(`safeWidth count expected ${GATE_CONSTANTS.SAFE_WIDTH_COUNT} got ${countMatches(source, 'safeWidth')}`);
  }
  if (countMatches(source, 'Number.isFinite(width)') !== 1) {
    throw new Error('Number.isFinite(width) must be exactly 1');
  }
  if (!source.includes(SCAN_STRINGS.WIDTH_HEIGHT_LITERAL)) throw new Error('width, height: width literal missing');
}

export function assertShakeNotify(source: string): void {
  if (!source.includes(SCAN_STRINGS.SHAKE_TIMER_REF)) throw new Error('shakeNotifyTimerRef missing');
  if (!source.includes(SCAN_STRINGS.NOTIFY_OPTIONAL)) throw new Error('onShakeActiveChange?. missing');
  if (!source.includes(SCAN_STRINGS.NOTIFY_CATCH)) throw new Error('catch {} swallow missing');
  if (!source.includes(SCAN_STRINGS.SCHEDULE_130)) throw new Error('130ms timeout missing');
  if (countMatches(source, 'cancelShakeNotify()') !== GATE_CONSTANTS.CANCEL_NOTIFY_COUNT) {
    throw new Error(`cancelShakeNotify() expected ${GATE_CONSTANTS.CANCEL_NOTIFY_COUNT}`);
  }
  if (!source.includes(SCAN_STRINGS.BOARD_PADDING_SHAKE_CAP)) throw new Error('BOARD_PADDING + SHAKE_CAP spare comment missing');
}

export function assertAppWiring(appSource: string): void {
  if (!appSource.includes(SCAN_STRINGS.IS_BOARD_SHAKING)) throw new Error('isBoardShaking state missing');
  if (!appSource.includes(SCAN_STRINGS.BOARD_WRAP_CONDITIONAL)) throw new Error('boardWrap conditional overflow missing');
  if (!appSource.includes(SCAN_STRINGS.ON_SHAKE_PROP)) throw new Error('onShakeActiveChange prop threading missing');
  if (countMatches(appSource, SCAN_STRINGS.OVERFLOW_VISIBLE) !== GATE_CONSTANTS.OVERFLOW_VISIBLE_COUNT_APP) {
    throw new Error('overflow visible count mismatch in App');
  }
}

export function assertLedger(ledgerSource: string): void {
  if (countMatches(ledgerSource, LEDGER.HASH) !== GATE_CONSTANTS.LEDGER_HASH_COUNT) {
    throw new Error(`ledger hash expected ${GATE_CONSTANTS.LEDGER_HASH_COUNT} got ${countMatches(ledgerSource, LEDGER.HASH)}`);
  }
  if (!ledgerSource.includes(LEDGER.DW107) || !ledgerSource.includes(LEDGER.DW110)) throw new Error('DW-107/110 missing in ledger');
  if (!ledgerSource.includes('status: done 2026-09-02')) throw new Error('ledger done date missing');
}

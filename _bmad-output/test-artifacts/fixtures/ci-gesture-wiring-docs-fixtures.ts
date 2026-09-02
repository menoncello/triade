// TEA Automate — Fixture helpers for dw-ci-gesture-wiring-docs
// Deterministic, no @faker-js/faker — handleSwipe is pure predicate with fixed swipe vectors + deterministic board fixtures.
// Host-only: node:test + tsx, no RN/Reanimated/Skia mount, no Playwright browser.
// Spec: spec-ci-gesture-wiring-docs.md (DW-49 split benchmark from default test + DW-50 extract gesture wiring to testable module, 7-row I/O matrix, 5 ACs, baseline fa68173 → 66d711d)
// Test-design: test-design-dw-ci-gesture-wiring-docs.md (9 risks, 3 high score 6: R-001 single-wiring dedup, R-002 benchmark exclusion, R-003 dispatch fail-closed)
// ATDD: triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts (19 it.skip scaffolds, P0 7 + P1 5 + P2 4 + P3 3)

import { handleSwipe, handleGestureEnd } from '../../../triade/src/ui/gesture.ts';
import type { BusyRef, SwipeEvent } from '../../../triade/src/ui/gesture.ts';
import { resolveSwipeDirection, SWIPE_THRESHOLD } from '../../../triade/src/ui/swipe.ts';
import * as game from '../../../triade/src/engine/core/index.ts';
import { staticBoard, rngOf, gameState } from '../../../triade/test-utils/helpers.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Deterministic fixtures — mirror gesture-pipeline + board fixtures
// ---------------------------------------------------------------------------
export const SWIPE_VECTORS = {
  right: { dx: 30, dy: 2, expected: 'right' as const },
  left: { dx: -30, dy: 1, expected: 'left' as const },
  up: { dx: 1, dy: -30, expected: 'up' as const },
  down: { dx: 2, dy: 30, expected: 'down' as const },
  subthreshold: { dx: 5, dy: 1, expected: null as const },
  tie: { dx: 20, dy: 20, expected: null as const },
  nanDx: { dx: NaN, dy: 0, expected: null as const },
  infinityDy: { dx: 30, dy: Infinity, expected: null as const },
} as const;

export const BOARD_FIXTURES = {
  rightMerge: staticBoard([null, null, 2, 1]), // 2+1 → 3 at right wall via right swipe
  leftMerge: staticBoard([1, 2, null, null]),  // 1+2 → 3 at left wall via left swipe
  spawnMerge: staticBoard([null, null, 1, 1]), // spawn check via right swipe
} as const;

export function busyRef(current = false): BusyRef {
  return { current };
}
export const BUSY_IDLE = { current: false } as BusyRef;
export const BUSY_IN_FLIGHT = { current: true } as BusyRef;

export function swipeEvent(translationX: number, translationY: number): SwipeEvent {
  return { translationX, translationY };
}

export const GESTURE_EVENTS = {
  validRight: swipeEvent(30, 2),
  validLeft: swipeEvent(-30, 1),
  subthreshold: swipeEvent(5, 1),
  tie: swipeEvent(20, 20),
  nanX: swipeEvent(NaN, 1),
  nanY: swipeEvent(30, NaN),
  infinity: swipeEvent(Infinity, Infinity),
  undefinedX: { translationX: undefined as unknown as number, translationY: 1 } as SwipeEvent,
} as const;

// ---------------------------------------------------------------------------
// Composition helper — imported wiring + game.move board mutation
// ---------------------------------------------------------------------------
export function swipeToMove(
  dx: number,
  dy: number,
  state: ReturnType<typeof game.newGame>,
  rng: ReturnType<typeof rngOf>,
  busy: BusyRef,
  success = true
): ReturnType<typeof game.move> | null {
  let result: ReturnType<typeof game.move> | null = null;
  const dispatched = handleSwipe(dx, dy, busy, (dir) => {
    result = game.move(state, dir, rng);
  }, { success });
  if (!dispatched) return null;
  return result;
}

export function validSwipeMutatesRight(): boolean {
  const before = JSON.stringify(BOARD_FIXTURES.rightMerge);
  const res = swipeToMove(30, 2, gameState(BOARD_FIXTURES.rightMerge), rngOf(0, 0, 0.5), busyRef(false));
  return res !== null && JSON.stringify(res.board) !== before && res.board[0][3] === 3;
}

export function validSwipeMutatesLeft(): boolean {
  const res = swipeToMove(-30, 1, gameState(BOARD_FIXTURES.leftMerge), rngOf(0, 0, 0.5), busyRef(false));
  return res !== null && res.board[0][0] === 3;
}

export function busyGateSuppresses(): boolean {
  return handleSwipe(30, 2, BUSY_IN_FLIGHT, () => {}) === false;
}

export function successGateSuppresses(): boolean {
  return handleSwipe(30, 0, busyRef(false), () => {}, { success: false }) === false
    && handleGestureEnd(GESTURE_EVENTS.validRight, false, busyRef(false), () => {}) === false;
}

export function subthresholdAndTieSuppress(): boolean {
  let called = false;
  const spy = () => { called = true; };
  const a = handleSwipe(5, 1, busyRef(false), spy);
  const b = handleSwipe(20, 20, busyRef(false), spy);
  return a === false && b === false && !called;
}

export function nanGuardsSuppress(): boolean {
  let called = false;
  const spy = () => { called = true; };
  return handleSwipe(NaN, 0, busyRef(false), spy) === false
    && handleSwipe(30, Infinity, busyRef(false), spy) === false
    && handleGestureEnd(null as unknown as SwipeEvent, true, busyRef(false), spy) === false
    && handleGestureEnd(GESTURE_EVENTS.nanX, true, busyRef(false), spy) === false
    && !called;
}

export function throwingDispatchReturnsFalse(): boolean {
  const throwing = () => { throw new Error('dispatch boom'); };
  try {
    return handleSwipe(30, 2, busyRef(false), throwing) === false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Source-scan helpers — single-wiring / single-threshold / guard-order / CI shape
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export function gestureSrc(): string {
  return readSrc('triade/src/ui/gesture.ts');
}
export function appSrc(): string {
  return readSrc('triade/App.tsx');
}
export function swipeSrc(): string {
  return readSrc('triade/src/ui/swipe.ts');
}
export function packageSrc(): string {
  return readSrc('triade/package.json');
}
export function packageJson(): { scripts: { test: string; benchmark: string } } {
  return JSON.parse(packageSrc());
}
export function ciSrc(): string {
  return readSrc('.github/workflows/ci.yml');
}
export function pipelineSrc(): string {
  return readSrc('triade/__tests__/ui/gesture-pipeline.test.ts');
}

export function handleSwipeDefinitionCount(): number {
  return (gestureSrc().match(/export function handleSwipe/g) ?? []).length;
}
export function handleGestureEndDefinitionCount(): number {
  return (gestureSrc().match(/export function handleGestureEnd/g) ?? []).length;
}
export function swipeThresholdDefinitionCount(): number {
  return (swipeSrc().match(/SWIPE_THRESHOLD\s*=\s*10/g) ?? []).length;
}
export function appReinlineWiringCount(): number {
  return /busyRef\.current.*resolveSwipeDirection/.test(appSrc()) ? 1 : 0;
}
export function gestureRedefinesThreshold(): boolean {
  return /SWIPE_THRESHOLD\s*=\s*10/.test(gestureSrc());
}

export function guardOrderIndices(): { busy: number; success: number; finite: number; typeof: number; resolve: number; try: number } {
  const src = gestureSrc();
  const fnStart = src.indexOf('export function handleSwipe');
  const fnEnd = src.indexOf('export function handleGestureEnd');
  const body = src.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
  return {
    busy: body.indexOf('!busy'),
    success: body.indexOf("'success' in opts"),
    finite: body.indexOf('Number.isFinite'),
    typeof: body.indexOf('typeof dispatch'),
    resolve: body.indexOf('resolveSwipeDirection'),
    try: body.indexOf('try {'),
  };
}
export function guardOrderIsIncreasing(): boolean {
  const o = guardOrderIndices();
  return o.busy !== -1 && o.success !== -1 && o.finite !== -1 && o.typeof !== -1 && o.resolve !== -1 && o.try !== -1
    && o.busy < o.success && o.success < o.finite && o.finite < o.typeof && o.typeof < o.resolve && o.resolve < o.try;
}
export function handleGestureEndGuardsBeforeDelegation(): boolean {
  const src = gestureSrc();
  return src.indexOf('typeof event.translationX') < src.indexOf('return handleSwipe');
}

export function packageTestExcludesBenchmarks(): boolean {
  const pkg = packageJson();
  return /__tests__\/\*\*\/\*\.test\.ts/.test(pkg.scripts.test) && !/benchmarks/.test(pkg.scripts.test);
}
export function packageBenchmarkIsolatesBenchmarks(): boolean {
  const pkg = packageJson();
  return /benchmarks\/\*\*\/\*\.test\.ts/.test(pkg.scripts.benchmark) && !/__tests__/.test(pkg.scripts.benchmark) && pkg.scripts.test !== pkg.scripts.benchmark;
}
export function benchmarksTokenCountInPackageJson(): number {
  return (packageSrc().match(/benchmarks/g) ?? []).length;
}

export function ciJobCounts(): { defaultJob: number; benchmarkJob: number; npmRunBenchmarkTotal: number; defaultHasBenchmark: boolean } {
  const ci = ciSrc();
  return {
    defaultJob: (ci.match(/engine-test-and-benchmark:/g) ?? []).length,
    benchmarkJob: (ci.match(/^\s{2}benchmark:/gm) ?? []).length,
    npmRunBenchmarkTotal: (ci.match(/npm run benchmark/g) ?? []).length,
    defaultHasBenchmark: /engine-test-and-benchmark:[\s\S]*?npm run benchmark/.test(ci.slice(ci.indexOf('engine-test-and-benchmark:'), ci.indexOf('benchmark:') === -1 ? undefined : ci.indexOf('benchmark:'))),
  };
}
export function ciDefaultExcludesBenchmark(): boolean {
  const ci = ciSrc();
  const defaultBlock = ci.slice(ci.indexOf('engine-test-and-benchmark:'), ci.indexOf('benchmark:') === -1 ? undefined : ci.indexOf('benchmark:'));
  return !/npm run benchmark/.test(defaultBlock) && /Run tests \(benchmarks excluded/.test(ci) && /Run benchmark gate \(timing-sensitive, separate from default test\)/.test(ci);
}

export function wiringSecondaryGuard(): boolean {
  const app = appSrc();
  const gesture = gestureSrc();
  return /handleGestureEnd/.test(app)
    && /doMoveRef\.current\(dir\)/.test(app)
    && /SWIPE_THRESHOLD/.test(app)
    && /from ['"]\.\/src\/ui\/gesture/.test(app)
    && /resolveSwipeDirection/.test(gesture)
    && /from ['"]\.\/swipe/.test(gesture);
}

export function ledgerSrc(): string {
  return readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
}
export function ledgerHasDW49and50Done(): boolean {
  const src = ledgerSrc();
  return /DW-49[\s\S]*?status: done/.test(src) && /DW-50[\s\S]*?status: done/.test(src);
}
export function ledgerUndoHashCount(): number {
  return (ledgerSrc().match(/resolution-undo: [0-9a-f]{8,}/g) ?? []).length;
}
export function sprintStatusHasNoBundle(): boolean {
  try {
    const s = readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
    return !s.includes('dw-ci-gesture-wiring-docs');
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Bench helper — handleSwipe O(1) <80ms per 10k
// ---------------------------------------------------------------------------
export function handleSwipeBench(iterations = 10_000): { elapsed: number; ok: boolean } {
  const t0 = performance.now();
  for (let i = 0; i < iterations; i++) handleSwipe(30, 1, busyRef(false), () => {});
  const elapsed = performance.now() - t0;
  return { elapsed, ok: elapsed < 80 };
}

// ---------------------------------------------------------------------------
// Re-exports for convenience — mirrors gesture.ts + swipe.ts public surface
// ---------------------------------------------------------------------------
export { handleSwipe, handleGestureEnd, resolveSwipeDirection, SWIPE_THRESHOLD };
export { staticBoard, rngOf, gameState };

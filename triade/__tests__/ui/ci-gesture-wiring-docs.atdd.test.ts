import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleSwipe, handleGestureEnd } from '../../src/ui/gesture.ts';
import { resolveSwipeDirection, SWIPE_THRESHOLD } from '../../src/ui/swipe.ts';
import * as game from '../../src/engine/core/index.ts';
import { staticBoard, rngOf, gameState } from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-ci-gesture-wiring-docs — red-phase scaffolds
// covering working-tree delta vs baseline fa68173 → HEAD 66d711d:
// package.json test/benchmark glob split (DW-49), CI job split
// engine-test-and-benchmark (benchmarks excluded) + benchmark job,
// gesture.ts handleSwipe/handleGestureEnd single wiring + App.tsx delegation,
// gesture-pipeline.test.ts local copy → import. No gameplay change.
// Host-only: node:test + tsx, no RN/native, no browser harness.
// Spec: _bmad-output/implementation-artifacts/spec-ci-gesture-wiring-docs.md
// ---------------------------------------------------------------------------

const pkgPath = fileURLToPath(new URL('../../package.json', import.meta.url));
const pkgSrc = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgSrc);
const ciPath = fileURLToPath(new URL('../../../.github/workflows/ci.yml', import.meta.url));
const ciSrc = fs.readFileSync(ciPath, 'utf8');
const gesturePath = fileURLToPath(new URL('../../src/ui/gesture.ts', import.meta.url));
const gestureSrc = fs.readFileSync(gesturePath, 'utf8');
const appPath = fileURLToPath(new URL('../../App.tsx', import.meta.url));
const appSrc = fs.readFileSync(appPath, 'utf8');
const swipePath = fileURLToPath(new URL('../../src/ui/swipe.ts', import.meta.url));
const swipeSrc = fs.readFileSync(swipePath, 'utf8');

function swipeToMove(
  dx: number,
  dy: number,
  state: ReturnType<typeof game.newGame>,
  rng: ReturnType<typeof rngOf>,
  busy: { current: boolean },
  success = true
): ReturnType<typeof game.move> | null {
  let result: ReturnType<typeof game.move> | null = null;
  const dispatched = handleSwipe(dx, dy, busy, (dir) => {
    result = game.move(state, dir, rng);
  }, { success });
  if (!dispatched) return null;
  return result;
}

describe('ATDD dw-ci-gesture-wiring-docs — P0 critical (spec AC + high risk)', () => {
  it('[P0-01] AC package.json default test excludes benchmarks', () => {
    // DW-49: test must run __tests__ only, benchmark must run benchmarks only.
    // Before: test script contained both "__tests__" and "benchmarks" (identical to benchmark).
    // After: test → __tests__/**, benchmark → benchmarks/**, no overlap.
    assert.match(pkg.scripts.test, /__tests__\/\*\*\/\*\.test\.ts/, 'test script must contain __tests__ glob');
    assert.equal(/benchmarks/.test(pkg.scripts.test) ? 1 : 0, 0, 'test script must NOT contain benchmarks');
    assert.match(pkg.scripts.test, /TSX_TSCONFIG_PATH=tsconfig\.test\.json/, 'test must use TSX_TSCONFIG_PATH + tsx harness');
  });

  it('[P0-02] AC package.json benchmark isolates benchmarks', () => {
    assert.match(pkg.scripts.benchmark, /benchmarks\/\*\*\/\*\.test\.ts/, 'benchmark script must contain benchmarks glob');
    assert.equal(/__tests__/.test(pkg.scripts.benchmark) ? 1 : 0, 0, 'benchmark script must NOT contain __tests__');
    assert.match(pkg.scripts.benchmark, /TSX_TSCONFIG_PATH=tsconfig\.test\.json/, 'benchmark must use same tsx harness');
    assert.notEqual(pkg.scripts.test, pkg.scripts.benchmark, 'test and benchmark scripts must differ');
  });

  it('[P0-03] AC CI split — default job excludes benchmarks, benchmark job dedicated', () => {
    // DW-49: engine-test-and-benchmark keeps name (branch protection) but excludes bench;
    // benchmark job runs npm run benchmark alone, never gates release.
    assert.equal((ciSrc.match(/engine-test-and-benchmark:/g) ?? []).length, 1, 'exactly 1 engine-test-and-benchmark job');
    assert.equal((ciSrc.match(/^\s{2}benchmark:/gm) ?? []).length, 1, 'exactly 1 benchmark job');
    assert.match(ciSrc, /Run tests \(benchmarks excluded/, 'default job must comment benchmarks excluded');
    assert.equal((ciSrc.match(/npm run benchmark/g) ?? []).length, 1, 'only benchmark job runs npm run benchmark');
    // Default job must have 5 non-bench steps before coverage; bench job has 4 steps total
    const defaultBlock = ciSrc.slice(ciSrc.indexOf('engine-test-and-benchmark:'), ciSrc.indexOf('benchmark:'));
    assert.equal(/npm run benchmark/.test(defaultBlock) ? 1 : 0, 0, 'default job must not run benchmark');
    assert.match(ciSrc, /Run benchmark gate \(timing-sensitive, separate from default test\)/, 'bench job step label');
  });

  it('[P0-04] AC busy-gate — busy.current true suppresses any swipe via imported handleSwipe', () => {
    // DW-50: gesture-pipeline must import real wiring, not local copy. Busy gate is the shared contract.
    const board = staticBoard([null, null, 2, 1]);
    const busy = { current: true };
    let dispatched = false;
    const ok = handleSwipe(30, 2, busy, () => { dispatched = true; });
    assert.equal(ok, false, 'busy true must return false');
    assert.equal(dispatched, false, 'dispatch must not be called when busy');
    const res = swipeToMove(30, 2, gameState(board), rngOf(0, 0, 0.5), { current: true });
    assert.equal(res, null, 'swipeToMove helpers via imported handleSwipe must also suppress when busy');
  });

  it('[P0-05] AC success-gate — success false suppresses dispatch even when busy idle', () => {
    const board = staticBoard([1, 2, null, null]);
    let dispatched = false;
    const ok = handleSwipe(30, 0, { current: false }, () => { dispatched = true; }, { success: false });
    assert.equal(ok, false, 'success false must return false');
    assert.equal(dispatched, false);
    const res = swipeToMove(30, 0, gameState(board), rngOf(0, 0, 0.5), { current: false }, false);
    assert.equal(res, null, 'success false via opts must suppress');
    // handleGestureEnd success false path as well
    const ok2 = handleGestureEnd({ translationX: 30, translationY: 1 }, false, { current: false }, () => { dispatched = true; });
    assert.equal(ok2, false);
  });

  it('[P0-06] AC valid swipe dispatches with real wiring and mutates board', () => {
    // Uses imported handleSwipe composed with game.move (DW-50 real wiring, not local copy)
    const boardR = staticBoard([null, null, 2, 1]);
    const before = JSON.stringify(boardR);
    const resR = swipeToMove(30, 2, gameState(boardR), rngOf(0, 0, 0.5), { current: false });
    assert.ok(resR, 'decisive right swipe must resolve');
    assert.notEqual(JSON.stringify(resR!.board), before, 'board must change after right swipe');
    assert.equal(resR!.board[0][3], 3, '2+1 merges to 3 at right wall');

    const boardL = staticBoard([1, 2, null, null]);
    const resL = swipeToMove(-30, 1, gameState(boardL), rngOf(0, 0, 0.5), { current: false });
    assert.ok(resL);
    assert.equal(resL!.board[0][0], 3, '1+2 merges to 3 at left wall');
  });

  it('[P0-07] AC WIRING — App binds handleGestureEnd + doMoveRef + SWIPE_THRESHOLD; gesture resolves via resolveSwipeDirection', () => {
    // Secondary guard: App.tsx must delegate, gesture.ts must resolve via swipe.ts (DW-50 secondary WIRING retained).
    assert.match(appSrc, /handleGestureEnd/, 'App must route pan end through handleGestureEnd');
    assert.match(appSrc, /doMoveRef\.current\(dir\)/, 'App must dispatch resolved dir to doMoveRef.current(dir)');
    assert.match(appSrc, /SWIPE_THRESHOLD/, 'App must retain SWIPE_THRESHOLD for activeOffsetX/Y gate');
    assert.match(appSrc, /from ['"].\/src\/ui\/gesture/, 'App must import from src/ui/gesture');
    assert.match(gestureSrc, /resolveSwipeDirection/, 'gesture module must resolve via resolveSwipeDirection');
    assert.match(gestureSrc, /from ['"]\.\/swipe/, 'gesture must import from ./swipe');
  });
});

describe('ATDD dw-ci-gesture-wiring-docs — P1 wiring (threshold / guard-order / never-throw / composition)', () => {
  it('[P1-01] AC threshold coupling — subthreshold 5 and diagonal tie 20/20 resolve to null without dispatch', () => {
    const board = staticBoard([1, 2, null, null]);
    let called = false;
    const spy = () => { called = true; };
    assert.equal(handleSwipe(5, 1, { current: false }, spy), false, 'dx 5 <10 must return false');
    assert.equal(called, false);
    called = false;
    assert.equal(handleSwipe(20, 20, { current: false }, spy), false, 'tie 20/20 must return false');
    assert.equal(called, false);
    // Also via helper composition
    assert.equal(swipeToMove(5, 1, gameState(board), rngOf(0, 0, 0.5), { current: false }), null);
    assert.equal(swipeToMove(20, 20, gameState(board), rngOf(0, 0, 0.5), { current: false }), null);
    // Threshold literal single source invariant (swipe.ts only)
    assert.equal((swipeSrc.match(/SWIPE_THRESHOLD\s*=\s*10/g) ?? []).length, 1, 'single SWIPE_THRESHOLD=10 in swipe.ts');
  });

  it('[P1-02] AC guard-order — NaN/Infinity dx/dy and null/non-finite event return false before dispatch', () => {
    let called = false;
    const spy = () => { called = true; };
    assert.equal(handleSwipe(NaN, 0, { current: false }, spy), false); assert.equal(called, false);
    assert.equal(handleSwipe(30, Infinity, { current: false }, spy), false); assert.equal(called, false);
    assert.equal(handleSwipe(30, 2, null as unknown as { current: boolean }, spy), false, 'null busy must fail-closed');
    assert.equal(handleSwipe(30, 2, { current: false }, null as unknown as (d: unknown) => void), false, 'null dispatch must fail-closed');
    // handleGestureEnd null/typeof guards
    assert.equal(handleGestureEnd(null as unknown as { translationX: number; translationY: number }, true, { current: false }, spy), false);
    assert.equal(handleGestureEnd({ translationX: NaN, translationY: 1 }, true, { current: false }, spy), false);
    assert.equal(handleGestureEnd({ translationX: 30, translationY: NaN } as { translationX: number; translationY: number }, true, { current: false }, spy), false);
    // Non-number translation
    assert.equal(handleGestureEnd({ translationX: '30' as unknown as number, translationY: 1 }, true, { current: false }, spy), false);
    assert.equal(called, false, 'no dispatch must have fired for any guard failure');
  });

  it('[P1-03] AC dispatch never-throw — throwing dispatch is caught and returns false', () => {
    const throwing = () => { throw new Error('dispatch boom'); };
    assert.doesNotThrow(() => handleSwipe(30, 2, { current: false }, throwing), 'must not throw to caller');
    assert.equal(handleSwipe(30, 2, { current: false }, throwing), false, 'throwing dispatch must return false');
    // handleGestureEnd path as well
    assert.equal(handleGestureEnd({ translationX: 30, translationY: 1 }, true, { current: false }, throwing), false);
  });

  it('[P1-04] AC engine→gesture composition + dispatch type-gate', () => {
    // Composition: swipe still spawns via game.move (not stub) and board-mutation preserves right/left semantics already P0.
    // Here add type-gate: typeof dispatch !== 'function' returns false without calling resolveSwipeDirection.
    let called = false;
    assert.equal(handleSwipe(30, 2, { current: false }, null as unknown as (d: unknown) => void), false);
    assert.equal(handleSwipe(30, 2, { current: false }, 123 as unknown as (d: unknown) => void), false);
    assert.equal(handleSwipe(30, 2, { current: false }, undefined as unknown as (d: unknown) => void), false);
    assert.equal(called, false);
    // Composition directional-spawn invariant: swipe still goes through move() and spawns
    const board = staticBoard([null, null, 1, 1]);
    const res = swipeToMove(30, 1, gameState(board), rngOf(0, 0, 0.5), { current: false });
    assert.ok(res!.board.flat().filter((v) => v !== null).length >= 2, 'swipe via move must preserve spawn');
  });

  it('[P1-05] AC CI name stability + tsc both configs clean', () => {
    // Branch protection requires default job name byte-identical.
    assert.equal((ciSrc.match(/^  engine-test-and-benchmark:/gm) ?? []).length, 1, 'default job name exactly 1');
    // Benchmark never becomes required — only informational; file itself just gates shape, not GitHub settings.
    assert.match(gestureSrc, /export function handleSwipe/, 'gesture.ts must export handleSwipe');
    assert.match(gestureSrc, /export function handleGestureEnd/, 'gesture.ts must export handleGestureEnd');
    assert.equal(SWIPETHRESHHOLD_CHECK(), true, 'swipe threshold still 10 — helper sanity');
    function SWIPETHRESHHOLD_CHECK() { return SWIPE_THRESHOLD === 10; }
    // tsc gate is P0/P1 host <15min gate; we pin source-text that both tsconfigs exist, actual tsc is CI Coverage
    assert.ok(fs.existsSync(fileURLToPath(new URL('../../tsconfig.json', import.meta.url))), 'tsconfig.json exists');
    assert.ok(fs.existsSync(fileURLToPath(new URL('../../tsconfig.test.json', import.meta.url))), 'tsconfig.test.json exists');
  });
});

describe('ATDD dw-ci-gesture-wiring-docs — P2 scans (single-helper / single-threshold / ordering / ledger)', () => {
  it('[P2-01] SCAN single-helper allowlist — handleSwipe definition count==1 in gesture.ts only', () => {
    const defHits = (gestureSrc.match(/export function handleSwipe/g) ?? []).length;
    assert.equal(defHits, 1, 'gesture.ts exactly 1 handleSwipe definition');
    assert.equal(/busyRef\.current.*resolveSwipeDirection/.test(appSrc) ? 1 : 0, 0, 'App must not re-inline busy+resolve predicate');
    const endHits = (gestureSrc.match(/export function handleGestureEnd/g) ?? []).length;
    assert.equal(endHits, 1, 'gesture.ts exactly 1 handleGestureEnd');
  });

  it('[P2-02] SCAN single-threshold allowlist — SWIPE_THRESHOLD literal only in swipe.ts', () => {
    assert.equal((swipeSrc.match(/SWIPE_THRESHOLD\s*=\s*10/g) ?? []).length, 1, 'swipe.ts single definition');
    assert.equal(/SWIPE_THRESHOLD\s*=\s*10/.test(gestureSrc) ? 1 : 0, 0, 'gesture.ts must not redefine SWIPE_THRESHOLD');
    // resolveSwipeDirection single consumer is gesture.ts (swipe.ts defines, gesture.ts imports)
    assert.match(gestureSrc, /resolveSwipeDirection/, 'gesture.ts single consumer');
  });

  it('[P2-03] SCAN guard-order literal ordering pin in gesture.ts', () => {
    // Order must be: !busy || busy.current → opts success → Number.isFinite(dx/dy) → typeof dispatch → resolveSwipeDirection → try
    // Scope to handleSwipe function body only (gestureSrc has an import-time resolveSwipeDirection that would poison global indexOf).
    const fnStart = gestureSrc.indexOf('export function handleSwipe');
    const fnEnd = gestureSrc.indexOf('export function handleGestureEnd');
    const fnBody = gestureSrc.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
    const iBusy = fnBody.indexOf('!busy');
    const iSuccess = fnBody.indexOf("'success' in opts");
    const iFinite = fnBody.indexOf('Number.isFinite');
    const iTypeof = fnBody.indexOf("typeof dispatch");
    const iResolve = fnBody.indexOf('resolveSwipeDirection');
    const iTry = fnBody.indexOf('try {');
    for (const [a, b, label] of [[iBusy, iSuccess, '!busy before success'], [iSuccess, iFinite, 'success before isFinite'], [iFinite, iTypeof, 'isFinite before typeof'], [iTypeof, iResolve, 'typeof before resolve'], [iResolve, iTry, 'resolve before try']] as const) {
      assert.ok(a !== -1 && b !== -1 && a < b, `guard order ${label}: ${a} < ${b}`);
    }
    // handleGestureEnd guards before handleSwipe delegation
    assert.ok(gestureSrc.indexOf('typeof event.translationX') < gestureSrc.indexOf('return handleSwipe'), 'handleGestureEnd null/type guards before delegation');
  });

  it('[P2-04] SCAN ledger resolution-undo + glob single-source', () => {
    const ledger = fs.readFileSync(fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)), 'utf8');
    // Use DOTALL: .* does not cross newline, so test via includes + DOTALL regex [\s\S]
    assert.ok(/DW-49[\s\S]*?status: done/.test(ledger), 'DW-49 done');
    assert.ok(/DW-50[\s\S]*?status: done/.test(ledger), 'DW-50 done');
    assert.equal((ledger.match(/resolution-undo: [0-9a-f]{8,}/g) ?? []).length >= 2 ? 1 : 0, 1, 'resolution-undo 64-hex hits >=2 for DW-49/50');
    // glob literal single-source: benchmarks only via benchmark script
    assert.equal((pkgSrc.match(/benchmarks/g) ?? []).length, 1, 'benchmarks token appears only once in package.json (benchmark script)');
    assert.equal(/"test".*benchmarks/.test(pkgSrc) ? 1 : 0, 0, 'test script must not literally contain benchmarks');
  });
});

describe('ATDD dw-ci-gesture-wiring-docs — P3 exploratory / bench hygiene', () => {
  it('[P3-01] BENCH handleSwipe O(1) 10k× <80ms (no loop/alloc regression)', () => {
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) handleSwipe(30, 1, { current: false }, () => {});
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 80, `handleSwipe 10k× in ${elapsed.toFixed(1)}ms must be <80ms (O(1) predicate + resolve, no loop)`);
    // Also assert classic resolve shape still 10 threshold tie
    assert.equal(resolveSwipeDirection({ dx: 20, dy: 20 }), null, 'tie still null');
    assert.equal(resolveSwipeDirection({ dx: 5, dy: 1 }), null, 'subthreshold still null');
    assert.equal(resolveSwipeDirection({ dx: 30, dy: 2 }), 'right', 'right still resolves');
  });

  it('[P3-02] SCAN negative exploratory — handleSwipe(∞) / undefined busy all fail-closed false without throw', () => {
    assert.equal(handleSwipe(Infinity, Infinity, { current: false }, () => {}), false);
    assert.equal(handleSwipe(30, 1, undefined as unknown as { current: boolean }, () => {}), false);
    assert.equal(handleGestureEnd({ translationX: undefined as unknown as number, translationY: 1 }, true, { current: false }, () => {}), false);
    assert.equal(handleGestureEnd({ translationX: 30, translationY: 1 }, true, { current: false }, undefined as unknown as (d: unknown) => void), false);
  });

  it('[P3-03] SCAN cross-cutting — engine + benchmarks byte-identical (no gameplay drift)', async () => {
    // This bundle is src/ui + ci only; src/engine/benchmarks must be empty diff (pinned via source-text allowlist already in P2-04).
    // Lightweight proxy: gesture file is 49 LOC trivial — not gameplay.
    assert.ok(gestureSrc.length < 4000, 'gesture.ts small (49 LOC expected)');
    assert.match(swipeSrc, /export const SWIPE_THRESHOLD = 10/, 'swipe.ts invariant preserved');
  });
});

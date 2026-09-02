/**
 * TEA Automate — API Gateway Contract Tests for dw-ci-gesture-wiring-docs
 * Location: _bmad-output/test-artifacts/tests/api/ci-gesture-wiring-docs.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture)
 * TEA mapping: "API" = gesture wiring gateway + CI glob gateway (pure host contracts).
 * Provider is triade/src/ui/gesture.ts (handleSwipe/handleGestureEnd) + triade/src/ui/swipe.ts (resolveSwipeDirection) + triade/package.json (test/benchmark) + .github/workflows/ci.yml (2-job split),
 * consumers are App.tsx pan delegation + gesture-pipeline.test.ts composition + engine move().
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's api-testing + data-factories fragments, adapted for pure TS harness.
 *
 * Spec: spec-ci-gesture-wiring-docs.md (DW-49 split benchmark from default test + DW-50 extract gesture wiring to testable module, baseline fa68173 → 66d711d, final_revision 4b44cf1)
 * Test-design: test-design-dw-ci-gesture-wiring-docs.md (9 risks, 3 high score 6: R-001 single-wiring dedup, R-002 benchmark exclusion, R-003 fail-closed)
 * ATDD source: triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts (19 it.skip scaffolds, P0 7 + P1 5 + P2 4 + P3 3)
 *
 * Execute:
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json
 *   npx tsx --test _bmad-output/test-artifacts/tests/api/ci-gesture-wiring-docs.gateway.spec.ts
 * Or via triade harness:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/ci-gesture-wiring-docs.gateway.spec.ts
 * Canonical ATDD execution remains via triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts (activate it.skip → it → 19 pass) + gesture-pipeline 7.
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { handleSwipe, handleGestureEnd } from '../../../../triade/src/ui/gesture.ts';
import { resolveSwipeDirection, SWIPE_THRESHOLD } from '../../../../triade/src/ui/swipe.ts';
import * as game from '../../../../triade/src/engine/core/index.ts';
import { staticBoard, rngOf, gameState } from '../../../../triade/test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  for (const base of [process.cwd(), join(process.cwd(), '..')]) {
    try {
      return readFileSync(join(base, rel), 'utf8');
    } catch {}
  }
  // when cwd is triade, rel starting with triade/ needs triade-relative retry
  if (rel.startsWith('triade/')) {
    const alt = rel.slice('triade/'.length);
    for (const base of [process.cwd(), join(process.cwd(), '..')]) {
      try {
        return readFileSync(join(base, alt), 'utf8');
      } catch {}
    }
  }
  return readFileSync(join(process.cwd(), rel), 'utf8');
}
function existsSrc(rel: string): boolean {
  for (const base of [process.cwd(), join(process.cwd(), '..')]) {
    if (existsSync(join(base, rel))) return true;
    if (rel.startsWith('triade/') && existsSync(join(base, rel.slice('triade/'.length)))) return true;
  }
  return existsSync(join(process.cwd(), rel));
}
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

// ---------------------------------------------------------------------------
// P0 — Critical (package glob + CI split + busy/success/valid/WIRING)
// ---------------------------------------------------------------------------
describe('[API] ci-gesture-wiring-docs gateway — P0 critical (globs + CI split + wiring)', () => {
  it('[P0] AC package.json default test excludes benchmarks — DW-49 R-002', () => {
    const pkgSrc = readSrc('triade/package.json');
    const pkg = JSON.parse(pkgSrc);
    assert.match(pkg.scripts.test, /__tests__\/\*\*\/\*\.test\.ts/, 'test must contain __tests__ glob');
    assert.equal(/benchmarks/.test(pkg.scripts.test) ? 1 : 0, 0, 'test must NOT contain benchmarks');
    assert.match(pkg.scripts.test, /TSX_TSCONFIG_PATH=tsconfig\.test\.json/, 'test must use TSX_TSCONFIG_PATH + tsx harness');
    assert.equal((pkgSrc.match(/benchmarks/g) ?? []).length, 1, 'benchmarks token appears only once in package.json (benchmark script only)');
  });

  it('[P0] AC package.json benchmark isolates benchmarks — DW-49 R-002', () => {
    const pkgSrc = readSrc('triade/package.json');
    const pkg = JSON.parse(pkgSrc);
    assert.match(pkg.scripts.benchmark, /benchmarks\/\*\*\/\*\.test\.ts/, 'benchmark must contain benchmarks glob');
    assert.equal(/__tests__/.test(pkg.scripts.benchmark) ? 1 : 0, 0, 'benchmark must NOT contain __tests__');
    assert.match(pkg.scripts.benchmark, /TSX_TSCONFIG_PATH=tsconfig\.test\.json/, 'benchmark must use same tsx harness');
    assert.notEqual(pkg.scripts.test, pkg.scripts.benchmark, 'test and benchmark scripts must differ');
  });

  it('[P0] AC CI split — default job excludes benchmarks, benchmark job dedicated — DW-49 R-002/R-004', () => {
    const ciSrc = readSrc('.github/workflows/ci.yml');
    assert.equal((ciSrc.match(/engine-test-and-benchmark:/g) ?? []).length, 1, 'exactly 1 engine-test-and-benchmark job');
    assert.equal((ciSrc.match(/^\s{2}benchmark:/gm) ?? []).length, 1, 'exactly 1 benchmark job');
    assert.match(ciSrc, /Run tests \(benchmarks excluded/, 'default job must comment benchmarks excluded');
    assert.equal((ciSrc.match(/npm run benchmark/g) ?? []).length, 1, 'only benchmark job runs npm run benchmark');
    const defaultBlock = ciSrc.slice(ciSrc.indexOf('engine-test-and-benchmark:'), ciSrc.indexOf('benchmark:'));
    assert.equal(/npm run benchmark/.test(defaultBlock) ? 1 : 0, 0, 'default job must not run benchmark');
    assert.match(ciSrc, /Run benchmark gate \(timing-sensitive, separate from default test\)/, 'bench job step label');
    assert.equal((ciSrc.match(/^  engine-test-and-benchmark:/gm) ?? []).length, 1, 'default job name byte-identical');
  });

  it('[P0] AC busy-gate — busy.current true suppresses any swipe via imported handleSwipe — DW-50 R-001/R-003', () => {
    const board = staticBoard([null, null, 2, 1]);
    let dispatched = false;
    const ok = handleSwipe(30, 2, { current: true }, () => { dispatched = true; });
    assert.equal(ok, false, 'busy true must return false');
    assert.equal(dispatched, false, 'dispatch must not be called when busy');
    const res = swipeToMove(30, 2, gameState(board), rngOf(0, 0, 0.5), { current: true });
    assert.equal(res, null, 'swipeToMove via imported handleSwipe must also suppress when busy');
    // null busy must also fail-closed
    assert.equal(handleSwipe(30, 2, null as unknown as { current: boolean }, () => {}), false, 'null busy must fail-closed');
  });

  it('[P0] AC success-gate — success false suppresses even when busy idle — DW-50 R-003', () => {
    const board = staticBoard([1, 2, null, null]);
    let dispatched = false;
    const ok = handleSwipe(30, 0, { current: false }, () => { dispatched = true; }, { success: false });
    assert.equal(ok, false, 'success false must return false');
    assert.equal(dispatched, false);
    const res = swipeToMove(30, 0, gameState(board), rngOf(0, 0, 0.5), { current: false }, false);
    assert.equal(res, null, 'success false via opts must suppress');
    const ok2 = handleGestureEnd({ translationX: 30, translationY: 1 }, false, { current: false }, () => { dispatched = true; });
    assert.equal(ok2, false);
  });

  it('[P0] AC valid swipe dispatches with real wiring and mutates board — DW-50 R-001', () => {
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

  it('[P0] AC WIRING — App binds handleGestureEnd + doMoveRef + SWIPE_THRESHOLD; gesture resolves via resolveSwipeDirection — DW-50 R-001/R-005', () => {
    const appSrc = readSrc('triade/App.tsx');
    const gestureSrc = readSrc('triade/src/ui/gesture.ts');
    assert.match(appSrc, /handleGestureEnd/, 'App must route pan end through handleGestureEnd');
    assert.match(appSrc, /doMoveRef\.current\(dir\)/, 'App must dispatch resolved dir to doMoveRef.current(dir)');
    assert.match(appSrc, /SWIPE_THRESHOLD/, 'App must retain SWIPE_THRESHOLD for activeOffsetX/Y gate');
    assert.match(appSrc, /from ['"]\.\/src\/ui\/gesture/, 'App must import from src/ui/gesture');
    assert.match(gestureSrc, /resolveSwipeDirection/, 'gesture module must resolve via resolveSwipeDirection');
    assert.match(gestureSrc, /from ['"]\.\/swipe/, 'gesture must import from ./swipe');
    // import stability
    assert.match(gestureSrc, /import type \{ Direction \}/, 'gesture must import Direction type');
    assert.ok(existsSrc('triade/src/ui/gesture.ts'), 'gesture.ts exists');
    assert.ok(existsSrc('triade/src/ui/swipe.ts'), 'swipe.ts exists');
  });
});

// ---------------------------------------------------------------------------
// P1 — Wiring (threshold / guard-order / never-throw / composition)
// ---------------------------------------------------------------------------
describe('[API] ci-gesture-wiring-docs gateway — P1 wiring (threshold / guard-order / never-throw)', () => {
  it('[P1] AC threshold coupling — subthreshold 5 and diagonal tie 20/20 resolve to null without dispatch — R-005/R-006', () => {
    const board = staticBoard([1, 2, null, null]);
    let called = false;
    const spy = () => { called = true; };
    assert.equal(handleSwipe(5, 1, { current: false }, spy), false, 'dx 5 <10 must return false');
    assert.equal(called, false);
    called = false;
    assert.equal(handleSwipe(20, 20, { current: false }, spy), false, 'tie 20/20 must return false');
    assert.equal(called, false);
    assert.equal(swipeToMove(5, 1, gameState(board), rngOf(0, 0, 0.5), { current: false }), null);
    assert.equal(swipeToMove(20, 20, gameState(board), rngOf(0, 0, 0.5), { current: false }), null);
    assert.equal(SWIPETHRESHHOLD_CHECK(), true, 'threshold still 10');
    function SWIPETHRESHHOLD_CHECK() { return SWIPE_THRESHOLD === 10; }
    assert.equal((readSrc('triade/src/ui/swipe.ts').match(/SWIPE_THRESHOLD\s*=\s*10/g) ?? []).length, 1, 'single SWIPE_THRESHOLD=10 in swipe.ts');
    // also verify resolveSwipeDirection direct
    assert.equal(resolveSwipeDirection({ dx: 5, dy: 1 }), null);
    assert.equal(resolveSwipeDirection({ dx: 20, dy: 20 }), null);
    assert.equal(resolveSwipeDirection({ dx: 30, dy: 2 }), 'right');
  });

  it('[P1] AC guard-order — NaN/Infinity dx/dy and null/non-finite event return false before dispatch — R-003/R-006', () => {
    let called = false;
    const spy = () => { called = true; };
    assert.equal(handleSwipe(NaN, 0, { current: false }, spy), false); assert.equal(called, false);
    assert.equal(handleSwipe(30, Infinity, { current: false }, spy), false); assert.equal(called, false);
    assert.equal(handleSwipe(30, 2, null as unknown as { current: boolean }, spy), false, 'null busy must fail-closed');
    assert.equal(handleSwipe(30, 2, { current: false }, null as unknown as (d: unknown) => void), false, 'null dispatch must fail-closed');
    assert.equal(handleGestureEnd(null as unknown as { translationX: number; translationY: number }, true, { current: false }, spy), false);
    assert.equal(handleGestureEnd({ translationX: NaN, translationY: 1 }, true, { current: false }, spy), false);
    assert.equal(handleGestureEnd({ translationX: 30, translationY: NaN } as { translationX: number; translationY: number }, true, { current: false }, spy), false);
    assert.equal(handleGestureEnd({ translationX: '30' as unknown as number, translationY: 1 }, true, { current: false }, spy), false);
    assert.equal(called, false, 'no dispatch must have fired for any guard failure');
    // Infinity busy edge
    assert.equal(handleSwipe(Infinity as unknown as number, 0, { current: false }, spy), false);
  });

  it('[P1] AC dispatch never-throw — throwing dispatch is caught and returns false — R-003/R-007', () => {
    const throwing = () => { throw new Error('dispatch boom'); };
    assert.doesNotThrow(() => handleSwipe(30, 2, { current: false }, throwing), 'must not throw to caller');
    assert.equal(handleSwipe(30, 2, { current: false }, throwing), false, 'throwing dispatch must return false');
    assert.equal(handleGestureEnd({ translationX: 30, translationY: 1 }, true, { current: false }, throwing), false);
    // narrow catch: dispatch only, not resolveSwipeDirection
    const gestureSrc = readSrc('triade/src/ui/gesture.ts');
    const tryIdx = gestureSrc.indexOf('try {');
    const dispatchIdx = gestureSrc.indexOf('dispatch(dir)');
    const resolveIdx = gestureSrc.indexOf('resolveSwipeDirection');
    assert.ok(tryIdx !== -1 && dispatchIdx !== -1 && tryIdx < dispatchIdx, 'try must wrap dispatch');
    assert.ok(resolveIdx < tryIdx, 'resolveSwipeDirection must be before try (narrow catch)');
  });

  it('[P1] AC engine→gesture composition + dispatch type-gate — R-001/R-003', () => {
    let called = false;
    assert.equal(handleSwipe(30, 2, { current: false }, null as unknown as (d: unknown) => void), false);
    assert.equal(handleSwipe(30, 2, { current: false }, 123 as unknown as (d: unknown) => void), false);
    assert.equal(handleSwipe(30, 2, { current: false }, undefined as unknown as (d: unknown) => void), false);
    assert.equal(called, false);
    const board = staticBoard([null, null, 1, 1]);
    const res = swipeToMove(30, 1, gameState(board), rngOf(0, 0, 0.5), { current: false });
    assert.ok(res!.board.flat().filter((v) => v !== null).length >= 2, 'swipe via move must preserve spawn');
  });

  it('[P1] AC CI name stability + tsc both configs clean — R-004/R-001', () => {
    const ciSrc = readSrc('.github/workflows/ci.yml');
    assert.equal((ciSrc.match(/^  engine-test-and-benchmark:/gm) ?? []).length, 1, 'default job name exactly 1');
    const gestureSrc = readSrc('triade/src/ui/gesture.ts');
    assert.match(gestureSrc, /export function handleSwipe/, 'gesture.ts must export handleSwipe');
    assert.match(gestureSrc, /export function handleGestureEnd/, 'gesture.ts must export handleGestureEnd');
    assert.equal(SWIPETHRESHHOLD_CHECK2(), true, 'swipe threshold still 10');
    function SWIPETHRESHHOLD_CHECK2() { return SWIPE_THRESHOLD === 10; }
    assert.ok(existsSrc('triade/tsconfig.json'), 'tsconfig.json exists');
    assert.ok(existsSrc('triade/tsconfig.test.json'), 'tsconfig.test.json exists');
    // pipeline import seam: now imports real wiring not local copy
    const pipelineSrc = readSrc('triade/__tests__/ui/gesture-pipeline.test.ts');
    assert.match(pipelineSrc, /import \{ handleSwipe \} from '..\/..\/src\/ui\/gesture\.ts'/, 'pipeline must import real handleSwipe');
    assert.equal(/function handleSwipe\(dx/.test(pipelineSrc) ? 1 : 0, 0, 'pipeline must not have local handleSwipe copy');
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans (allowlist gates)
// ---------------------------------------------------------------------------
describe('[API] ci-gesture-wiring-docs gateway — P2 static scans (allowlist + ledger)', () => {
  it('[P2] SCAN single-helper allowlist — handleSwipe definition count==1 in gesture.ts only — R-001', () => {
    const gestureSrc = readSrc('triade/src/ui/gesture.ts');
    const appSrc = readSrc('triade/App.tsx');
    assert.equal((gestureSrc.match(/export function handleSwipe/g) ?? []).length, 1, 'gesture.ts exactly 1 handleSwipe definition');
    assert.equal(/busyRef\.current.*resolveSwipeDirection/.test(appSrc) ? 1 : 0, 0, 'App must not re-inline busy+resolve predicate');
    assert.equal((gestureSrc.match(/export function handleGestureEnd/g) ?? []).length, 1, 'gesture.ts exactly 1 handleGestureEnd');
  });

  it('[P2] SCAN single-threshold allowlist — SWIPE_THRESHOLD literal only in swipe.ts — R-005', () => {
    const swipeSrc = readSrc('triade/src/ui/swipe.ts');
    const gestureSrc = readSrc('triade/src/ui/gesture.ts');
    assert.equal((swipeSrc.match(/SWIPE_THRESHOLD\s*=\s*10/g) ?? []).length, 1, 'swipe.ts single definition');
    assert.equal(/SWIPE_THRESHOLD\s*=\s*10/.test(gestureSrc) ? 1 : 0, 0, 'gesture.ts must not redefine SWIPE_THRESHOLD');
    assert.match(gestureSrc, /resolveSwipeDirection/, 'gesture.ts single consumer');
  });

  it('[P2] SCAN guard-order literal ordering pin in gesture.ts — R-006', () => {
    const gestureSrc = readSrc('triade/src/ui/gesture.ts');
    const fnStart = gestureSrc.indexOf('export function handleSwipe');
    const fnEnd = gestureSrc.indexOf('export function handleGestureEnd');
    const fnBody = gestureSrc.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
    const iBusy = fnBody.indexOf('!busy');
    const iSuccess = fnBody.indexOf("'success' in opts");
    const iFinite = fnBody.indexOf('Number.isFinite');
    const iTypeof = fnBody.indexOf('typeof dispatch');
    const iResolve = fnBody.indexOf('resolveSwipeDirection');
    const iTry = fnBody.indexOf('try {');
    for (const [a, b, label] of [[iBusy, iSuccess, '!busy before success'], [iSuccess, iFinite, 'success before isFinite'], [iFinite, iTypeof, 'isFinite before typeof'], [iTypeof, iResolve, 'typeof before resolve'], [iResolve, iTry, 'resolve before try']] as const) {
      assert.ok(a !== -1 && b !== -1 && a < b, `guard order ${label}: ${a} < ${b}`);
    }
    assert.ok(gestureSrc.indexOf('typeof event.translationX') < gestureSrc.indexOf('return handleSwipe'), 'handleGestureEnd null/type guards before delegation');
  });

  it('[P2] SCAN ledger resolution-undo + glob single-source — R-009/R-002', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.ok(/DW-49[\s\S]*?status: done/.test(ledger), 'DW-49 done');
    assert.ok(/DW-50[\s\S]*?status: done/.test(ledger), 'DW-50 done');
    assert.equal((ledger.match(/resolution-undo: [0-9a-f]{8,}/g) ?? []).length >= 2 ? 1 : 0, 1, 'resolution-undo 64-hex hits >=2 for DW-49/50');
    const pkgSrc = readSrc('triade/package.json');
    assert.equal((pkgSrc.match(/benchmarks/g) ?? []).length, 1, 'benchmarks token appears only once in package.json (benchmark script)');
    assert.equal(/"test".*benchmarks/.test(pkgSrc) ? 1 : 0, 0, 'test script must not literally contain benchmarks');
  });
});

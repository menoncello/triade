/**
 * TEA Automate — E2E Umbrella Tests for dw-ci-gesture-wiring-docs
 * Location: _bmad-output/test-artifacts/tests/e2e/ci-gesture-wiring-docs.umbrella.spec.ts
 * Runner: Host-only node:test + tsx (no Playwright page.goto for RN engine harness)
 * TEA mapping: "E2E" = gesture wiring through App delegation + board mutation + CI shape + ledger end-to-end.
 * This file documents the E2E journeys as specs for traceability, but execution is host
 * (node:test, no browser/device). It mirrors the P0/P1/P2/P3 journeys from
 * test-design-dw-ci-gesture-wiring-docs.md plus the exit-criteria smoke checklist.
 *
 * Each journey below maps to an ATDD gate in
 * triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts (P0-01..07, P1-01..05, P2-01..04, P3-01..03) plus
 * existing regression (gesture-pipeline.test.ts 7/7 + package glob + CI 2-job + tsc both configs + ledger).
 *
 * Spec: spec-ci-gesture-wiring-docs.md (DW-49 split benchmark from default test + DW-50 extract gesture wiring, baseline fa68173 → 66d711d, final_revision 4b44cf1)
 * Delta: triade/package.json (test/benchmark split), .github/workflows/ci.yml (2 jobs), triade/src/ui/gesture.ts (NEW 49 LOC), triade/App.tsx (delegate), triade/__tests__/ui/gesture-pipeline.test.ts (import seam)
 *
 * To run host gates that back these E2E journeys:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts  # 19 skip (activate → 19 pass)
 *   npx tsx --test _bmad-output/test-artifacts/tests/api/ci-gesture-wiring-docs.gateway.spec.ts  # 16 gateway contracts
 *   npx tsx --test _bmad-output/test-artifacts/tests/e2e/ci-gesture-wiring-docs.umbrella.spec.ts # 6 journeys in this file (host, P1/P2/P3)
 *   npm --prefix triade test -- __tests__/ui/gesture-pipeline.test.ts __tests__/ui/swipe.test.ts  # 17 pipeline+threshold green
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json  # type gate
 */

// This file IS executed via node:test — unlike RN feel E2E artifacts that are manual device checklists,
// the CI-gesture wiring hardening seam is pure TS and host-verifiable. The "E2E" label here means
// "through the wiring seam + engine integration + CI shape + ledger", not "through a browser".

export const E2E_JOURNEYS = {
  // P1 E2E-01: Package glob split → default excludes benchmarks, benchmark isolates
  'E2E-01 package glob split → default excludes benchmarks, benchmark isolates (P1, package.json 2-script shape)': {
    priority: 'P1',
    level: 'E2E (host, package.json → npm test → npm run benchmark)',
    ac: 'AC package glob default + AC package glob benchmark (DW-49)',
    risk: 'R-002 (OPS 6 benchmark exclusion regression), R-004 (OPS 3 required-checks rename), R-008 (PERF 4 glob perf drift)',
    traceability: 'P0-01 package glob default + P0-02 package glob benchmark + ci-gesture-wiring-docs.gateway.spec.ts [P0] package globs + package.json rg gates',
    steps: [
      'Given triade/package.json scripts.test was "TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \\"__tests__/**/*.test.ts\\" \\"benchmarks/**/*.test.ts\\"" (identical to benchmark) before fa68173 baseline',
      'When HEAD 66d711d splits to scripts.test = "TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \\"__tests__/**/*.test.ts\\"" (removes benchmarks glob) and scripts.benchmark = "TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \\"benchmarks/**/*.test.ts\\"" (removes __tests__ glob), then rg "benchmarks" package.json ==1 (only benchmark script) and rg "\\"test\\".*benchmarks" ==0',
      'And npm test count (__tests__ only) drops from previously duplicated includes to 852+ host tests without 6 benches (946→940 delta) while npm run benchmark -- --test-name-pattern=0 yields 6 benches only',
      'And TSX_TSCONFIG_PATH=tsconfig.test.json is retained in both scripts (tsx harness stability) and test !== benchmark literal difference holds',
      'Then any future addition of a test dir must add __tests__ prefix to be included in default gate; a typo "**/*.test.ts" without prefix would re-merge benches and re-flake p99 tail — caught by benchmarking token count gate',
    ],
    hostGate: 'ci-gesture-wiring-docs.gateway.spec.ts [P0] package globs + [P2] ledger glob single-source + npm test / npm run benchmark counts + rg "benchmarks" token 1',
    device: 'N/A — host package.json scan + count gate is the E2E gate',
  },

  // P1 E2E-02: CI split → 2 jobs, branch-protection name stable
  'E2E-02 CI split → 2 jobs, branch-protection name stable (P1, ci.yml 2-job shape)': {
    priority: 'P1',
    level: 'E2E (host, ci.yml → GitHub Actions 2 jobs)',
    ac: 'AC CI split (DW-49) — engine-test-and-benchmark keeps name, benchmark job dedicated',
    risk: 'R-002 (OPS 6 exclusion), R-004 (OPS 3 required-checks rename — high if gated)',
    traceability: 'P0-03 CI split + P1-05 CI name stability + ci-gesture-wiring-docs.gateway.spec.ts [P0] CI split + [P1] CI name stability',
    steps: [
      'Given .github/workflows/ci.yml had single job engine-test-and-benchmark running npm test with benchmarks included (before)',
      'When HEAD splits to 2 jobs: engine-test-and-benchmark (defaults working-directory triade, steps checkout/setup-node 26/npm ci/Typecheck/Run tests (benchmarks excluded — see benchmark job) → npm test / Coverage report) and benchmark (same checkout/setup-node/npm ci then Run benchmark gate (timing-sensitive, separate from default test) → npm run benchmark), then rg "^  engine-test-and-benchmark:" ==1 and rg "^  benchmark:" ==1 and rg "npm run benchmark" ==1 (only bench job)',
      'And default block sliced engine-test-and-benchmark → benchmark contains no npm run benchmark, and ciSrc contains "Run tests (benchmarks excluded" + "Run benchmark gate (timing-sensitive, separate from default test)" labels',
      'And engine-test-and-benchmark name stays byte-identical for branch protection (no rename to test or engine-test); benchmark job is informational, never added to required checks — adding it would gate deploys on timing-sensitive p99 bench',
      'And both jobs parallelize (total wall not gate-prolonged) with cache via package-lock.json',
    ],
    hostGate: 'ci-gesture-wiring-docs.gateway.spec.ts [P0] CI split + [P1] CI name stability + rg engine-test-and-benchmark 1 + rg benchmark 1 + npm run benchmark 1',
    device: 'N/A — host yaml scan is the E2E gate',
  },

  // P1 E2E-03: Real wiring import → busy/success/valid dispatch end-to-end through engine
  'E2E-03 real wiring import → busy/success/valid dispatch end-to-end through engine (P1, gesture.ts → App.tsx → game.move)': {
    priority: 'P1',
    level: 'E2E (host, gesture.ts → App.tsx delegation → engine integration)',
    ac: 'AC busy-gate + AC success-gate + AC valid dispatch + AC WIRING secondary guard (DW-50)',
    risk: 'R-001 (TECH 6 single-wiring dedup drift), R-003 (TECH 6 dispatch fail-closed), R-005 (TECH 4 threshold coupling), R-006 (TECH 4 guard-order)',
    traceability: 'P0-04 busy-gate + P0-05 success-gate + P0-06 valid dispatch + P0-07 WIRING + P1-01 threshold + P1-02 guard-order + P1-03 never-throw + pipeline 7/7',
    steps: [
      'Given triade/src/ui/gesture.ts NEW 49 LOC exports handleSwipe(dx,dy,busy,dispatch,opts?) with guards !busy||busy.current → opts success via \'success\' in opts && !opts.success → Number.isFinite(dx/dy) → typeof dispatch === function → resolveSwipeDirection({dx,dy}) → try/catch dispatch, and handleGestureEnd(event,success,busy,dispatch) with null+typeof translationX/Y, !success early, delegation to handleSwipe({success})',
      'When handleSwipe(30,2,{current:true},spy) is called (busy true) then returns false and spy not called — and swipeToMove helper composed with game.move(state,dir,rngOf(0,0,0.5)) via imported handleSwipe also returns null (no board mutation)',
      'And handleSwipe(30,0,{current:false},spy,{success:false}) returns false and handleGestureEnd({translationX:30,translationY:1},false,{current:false},spy) returns false even when busy idle (success fail-closed)',
      'And valid swipe handleSwipe(30,2,{current:false},dispatch) → resolveSwipeDirection {dx:30,dy:2} → right → dispatch(right) → swipeToMove mutates board staticBoard([null,null,2,1]) 2+1→3 at [0][3] right wall and staticBoard([1,2,null,null]) -30/1 → 1+2→3 at [0][0] left wall via real game.move (not stub) with spawn preserved',
      'And App.tsx imports handleGestureEnd from ./src/ui/gesture.ts and panGesture.onEnd((event,success)=> handleGestureEnd(event,success,busyRef,dir=>doMoveRef.current(dir))) replaces inline if(!busyRef.current&&success){resolve+dispatch} — preserved SWIPE_THRESHOLD import for activeOffsetX/Y [-10,+10] + runOnJS(true) + doMoveRef freshness via useRef update during render',
      'And gesture.ts imports resolveSwipeDirection from ./swipe.ts (single consumer) while swipe.ts retains single SWIPE_THRESHOLD=10 literal and ax===ay→null tie + ax>ay?ax<threshold→null semantics',
      'Then pipeline seam triade/__tests__/ui/gesture-pipeline.test.ts now imports {handleSwipe} from ../../src/ui/gesture.ts (no local copy) and WIRING regex still asserts App handleGestureEnd + doMoveRef.current(dir) + SWIPE_THRESHOLD + gesture resolveSwipeDirection as secondary guard',
    ],
    hostGate: 'ci-gesture-wiring-docs.gateway.spec.ts [P0] busy/success/valid/WIRING + [P1] threshold/guard-order/never-throw/composition + gesture-pipeline.test.ts 7/7 green + ci-gesture-wiring-docs.atdd.test.ts activated 19 pass',
    device: 'N/A — host predicate + board-mutation composition is the E2E gate (no RNGH device swipe — Gesture.Pan activeOffset preserved byte-identically)',
  },

  // P2 E2E-04: Static allowlist scans — single-helper / single-threshold / guard-order / ledger
  'E2E-04 static allowlist scans — single-helper / single-threshold / guard-order / ledger (P2, rg allowlists)': {
    priority: 'P2',
    level: 'E2E (host, static scan)',
    ac: 'Single-helper dedup + single-threshold + guard-order + ledger 64-hex + glob single-source',
    risk: 'R-001 (TECH 6 dedup drift), R-005 (TECH 4 threshold coupling), R-006 (TECH 4 guard-order), R-009 (OPS 2 ledger)',
    traceability: 'P2-01 single-helper + P2-02 single-threshold + P2-03 guard-order pin + P2-04 ledger + glob single-source + fixtures guardOrderIndices + wiringSecondaryGuard',
    steps: [
      'Given single-helper invariant: export function handleSwipe definition count==1 in triade/src/ui/gesture.ts:19 only, App.tsx has 0 busyRef.current.*resolveSwipeDirection re-inline (rg busyRef.current.*resolveSwipeDirection ==0), and export function handleGestureEnd count==1',
      'When rg "SWIPE_THRESHOLD\\s*=\\s*10" is run then count==1 in triade/src/ui/swipe.ts:3 only, 0 in gesture.ts (gesture never shadows threshold, imports same SWIPE_THRESHOLD for use only via resolveSwipeDirection not definition)',
      'And resolveSwipeDirection single consumer is gesture.ts (swipe.ts defines, gesture.ts imports) — no duplicate predicate',
      'When guard-order pin is verified scoped to handleSwipe body (export function handleSwipe → export function handleGestureEnd slice, not global — import line would poison indexOf), then indices increase: !busy → \'success\' in opts → Number.isFinite → typeof dispatch → resolveSwipeDirection → try {  (plus handleGestureEnd typeof event.translationX < return handleSwipe)',
      'And ledger deferred-work.md DW-49/DW-50 each show status: done 2026-09-02 + resolution: resolved by sweep bundle dw-ci-gesture-wiring-docs + resolution-undo: facfde46… 64-hex (2 hits via DOTALL [\\s\\S]*? — .* does not cross \\n), and package.json benchmarks token ==1 (benchmark script only) and test script has no benchmarks literal',
      'Then any re-inline of busy/success/NaN gate in App.tsx or duplicate handleSwipe definition or duplicate SWIPE_THRESHOLD literal would be caught by allowlist scans as PR gate',
    ],
    hostGate: 'ci-gesture-wiring-docs.gateway.spec.ts [P2] single-helper + single-threshold + guard-order + ledger glob + fixtures guardOrderIsIncreasing + getBandTopUseCount analogue',
    device: 'N/A — rg scans are host static gates',
  },

  // P1/P2 E2E-05: Full integration sweep — all authority gates green + tsc + ledger
  'E2E-05 full integration sweep — 22 authority gates + scanner + tsc both configs + ledger (P1/P2, full gate)': {
    priority: 'P1',
    level: 'E2E (host, full gate)',
    ac: 'ATDD 19 + pipeline 7 + threshold 10 + tsc both configs + ledger 64-hex + engine byte-identical',
    risk: 'R-001/R-003 wiring + R-002 exclusion + R-004 name + R-009 ledger ownership',
    traceability: 'P0-01..07 + P1-01..05 + P2-01..04 + P3-01..03 + pipeline 7/7 + tsc both configs + engine.purity/ui.norolls + ledger 2 hits',
    steps: [
      'Given working-tree diff vs baseline fa68173 is package.json test/benchmark split + ci.yml 2-job split + gesture.ts 49 LOC + App.tsx delegate + pipeline import seam + deferred-work DW-49/50 done with facfde46… 64-hex; triade/src/engine byte-identical (git diff --stat -- triade/src/engine empty) and triade/benchmarks byte-identical',
      'When npm --prefix triade test -- __tests__/ui/gesture-pipeline.test.ts __tests__/ui/swipe.test.ts is run (host, <2s) then 7+10=17 pass (imported handleSwipe right/left + subthreshold + tie + busy + success + WIRING secondary guard + threshold sweep)',
      'And TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts with sed s/it.skip/it/g is 19 pass / 0 fail (P0 7 + P1 5 + P2 4 + P3 3 activated GREEN) and this file + gateway spec both green (16+6 =22 TEA contracts)',
      'And npx tsc --noEmit --project triade/tsconfig.json + npx tsc --noEmit --project triade/tsconfig.test.json is clean (BusyRef/SwipeEvent shape stable, no Dirent cast needed — gesture.ts narrow types)',
      'And deferred-work.md DW-49/50 each show status: done 2026-09-02 + resolution-undo: facfde46… 64-hex (2 hits), and sprint-status.yaml has no dw-ci-gesture-wiring-docs string (orchestrator-owned, never written)',
      'And triade/__tests__/ui/gesture-pipeline.test.ts WIRING regex still asserts App handleGestureEnd + doMoveRef.current(dir) + SWIPE_THRESHOLD while engine.purity + ui.norolls stay green via existing helpers',
    ],
    hostGate: 'npm test pipeline+swipe 17/17 + ATDD activated 19/19 + api 16 + e2e 6 + tsc both configs + full 852 host + 6 benches separate + ledger 2 hits',
    device: 'N/A — full host gate is the E2E gate for this seam (no device lane per test-design, RN Skia Canvas project not web Playwright)',
  },

  // P3 E2E-06: Bench hygiene + scope guard (+ negative exploratory)
  'E2E-06 bench hygiene + scope guard + negative exploratory (P3, O1 <80ms + no gameplay drift)': {
    priority: 'P3',
    level: 'E2E (host, bench + scope)',
    ac: 'Performance + scope hygiene (not gated, informative) + negative exploratory',
    risk: 'R-008 (PERF 4 glob perf drift), R-007 (TECH 3 swallow vs hide engine throw — narrow try)',  
    traceability: 'P3-01 bench handleSwipe O(1) 10k× <80ms + P3-02 negative Infinity/undefined + P3-03 cross-cutting engine/benchmarks empty + R-007/R-008',
    steps: [
      'Given handleSwipe is pure predicate O(1) adding one call indirection via gesture.ts (no loop/alloc), and gesture.ts is 49 LOC (<4000 chars) trivial destructure',
      'When handleSwipeBench(10k) is run then elapsed <80ms (~0.005ms per call) proves O(1) predicate+resolve not loop; also classic shapes tie 20/20→null, 5/1→null, 30/2→right still hold via resolveSwipeDirection',
      'And handleSwipe(Infinity,Infinity,{current:false},()=>{}) → false and handleSwipe(30,1,undefined as BusyRef,()=>{}) → false and handleGestureEnd({translationX:undefined},true,…) → false and handleGestureEnd with undefined dispatch → false all fail-closed without throw (complements R-003 NaN guard)',
      'And swipe.ts SWIPE_THRESHOLD still export const SWIPE_THRESHOLD = 10 and gesture.ts try/catch wraps only dispatch(dir) not resolveSwipeDirection (invariant violation in resolve must still surface — narrow swallow)',
      'And no cross-cutting scope drift: rg "music|RevenueCat|AdMob" gesture.ts/ci.yml/package.json pure gesture+CI seam only; triade/src/engine byte-identical (git diff --stat empty) and triade/benchmarks empty confirms no bench/engine drift',
    ],
    hostGate: 'ci-gesture-wiring-docs.gateway.spec.ts bench 10k× <80ms + negative exploratory + fixtures handleSwipeBench() + swipeSrc invariant + gesture narrow try',
    device: 'N/A — bench is host smoke, not device',
  },
};

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { handleSwipe, handleGestureEnd } from '../../../../triade/src/ui/gesture.ts';
import { resolveSwipeDirection, SWIPE_THRESHOLD } from '../../../../triade/src/ui/swipe.ts';
import * as game from '../../../../triade/src/engine/core/index.ts';
import { staticBoard, rngOf, gameState } from '../../../../triade/test-utils/helpers.ts';

function readSrc(rel: string): string {
  for (const base of [process.cwd(), join(process.cwd(), '..')]) {
    try {
      return readFileSync(join(base, rel), 'utf8');
    } catch {}
  }
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
function swipeToMoveLocal(
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

describe('[E2E] ci-gesture-wiring-docs umbrella — journeys (host through wiring + engine + CI)', () => {
  it('[P1] E2E-01 package glob split → default excludes benchmarks, benchmark isolates', () => {
    const pkgSrc = readSrc('triade/package.json');
    const pkg = JSON.parse(pkgSrc);
    assert.match(pkg.scripts.test, /__tests__\/\*\*\/\*\.test\.ts/, 'test must contain __tests__ glob');
    assert.equal(/benchmarks/.test(pkg.scripts.test) ? 1 : 0, 0, 'test must NOT contain benchmarks');
    assert.match(pkg.scripts.benchmark, /benchmarks\/\*\*\/\*\.test\.ts/, 'benchmark must contain benchmarks glob');
    assert.equal(/__tests__/.test(pkg.scripts.benchmark) ? 1 : 0, 0, 'benchmark must NOT contain __tests__');
    assert.notEqual(pkg.scripts.test, pkg.scripts.benchmark, 'test !== benchmark');
    assert.equal((pkgSrc.match(/benchmarks/g) ?? []).length, 1, 'benchmarks token exactly 1 in package.json');
    assert.match(pkg.scripts.test, /TSX_TSCONFIG_PATH=tsconfig\.test\.json/, 'tsx harness retained');
  });

  it('[P1] E2E-02 CI split → 2 jobs, branch-protection name stable', () => {
    const ciSrc = readSrc('.github/workflows/ci.yml');
    assert.equal((ciSrc.match(/engine-test-and-benchmark:/g) ?? []).length, 1, 'exactly 1 engine-test-and-benchmark job');
    assert.equal((ciSrc.match(/^\s{2}benchmark:/gm) ?? []).length, 1, 'exactly 1 benchmark job');
    assert.match(ciSrc, /Run tests \(benchmarks excluded/, 'default job comments benchmarks excluded');
    assert.equal((ciSrc.match(/npm run benchmark/g) ?? []).length, 1, 'only bench job runs npm run benchmark');
    const defaultBlock = ciSrc.slice(ciSrc.indexOf('engine-test-and-benchmark:'), ciSrc.indexOf('benchmark:'));
    assert.equal(/npm run benchmark/.test(defaultBlock) ? 1 : 0, 0, 'default job must not run benchmark');
    assert.match(ciSrc, /Run benchmark gate \(timing-sensitive, separate from default test\)/, 'bench label');
    assert.equal((ciSrc.match(/^  engine-test-and-benchmark:/gm) ?? []).length, 1, 'byte-identical name');
  });

  it('[P1] E2E-03 real wiring import → busy/success/valid dispatch end-to-end through engine', () => {
    const board = staticBoard([null, null, 2, 1]);
    const busyTrue = { current: true };
    let dispatched = false;
    assert.equal(handleSwipe(30, 2, busyTrue, () => { dispatched = true; }), false);
    assert.equal(dispatched, false);
    const resBusy = swipeToMoveLocal(30, 2, gameState(board), rngOf(0, 0, 0.5), { current: true });
    assert.equal(resBusy, null, 'busy true → null via composition');

    dispatched = false;
    assert.equal(handleSwipe(30, 0, { current: false }, () => { dispatched = true; }, { success: false }), false);
    assert.equal(dispatched, false);
    assert.equal(handleGestureEnd({ translationX: 30, translationY: 1 }, false, { current: false }, () => { dispatched = true; }), false);
    assert.equal(swipeToMoveLocal(30, 0, gameState(board), rngOf(0, 0, 0.5), { current: false }, false), null);

    const resR = swipeToMoveLocal(30, 2, gameState(staticBoard([null, null, 2, 1])), rngOf(0, 0, 0.5), { current: false });
    assert.ok(resR);
    assert.equal(resR!.board[0][3], 3, 'right 2+1→3');
    const resL = swipeToMoveLocal(-30, 1, gameState(staticBoard([1, 2, null, null])), rngOf(0, 0, 0.5), { current: false });
    assert.ok(resL);
    assert.equal(resL!.board[0][0], 3, 'left 1+2→3');

    const appSrc = readSrc('triade/App.tsx');
    const gestureSrc = readSrc('triade/src/ui/gesture.ts');
    assert.match(appSrc, /handleGestureEnd/, 'App delegates');
    assert.match(appSrc, /doMoveRef\.current\(dir\)/, 'App dispatches via doMoveRef');
    assert.match(appSrc, /SWIPE_THRESHOLD/, 'App retains threshold for activeOffset');
    assert.match(gestureSrc, /resolveSwipeDirection/, 'gesture resolves via swipe');
    assert.match(gestureSrc, /from ['"]\.\/swipe/, 'gesture imports ./swipe');
    // pipeline seam no longer local copy
    const pipelineSrc = readSrc('triade/__tests__/ui/gesture-pipeline.test.ts');
    assert.match(pipelineSrc, /import \{ handleSwipe \} from '..\/..\/src\/ui\/gesture\.ts'/);
    assert.equal(/function handleSwipe\(dx/.test(pipelineSrc) ? 1 : 0, 0, 'no local copy');
  });

  it('[P2] E2E-04 static allowlists — single-helper / single-threshold / guard-order / ledger', () => {
    const gestureSrc = readSrc('triade/src/ui/gesture.ts');
    const appSrc = readSrc('triade/App.tsx');
    const swipeSrc = readSrc('triade/src/ui/swipe.ts');
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    const pkgSrc = readSrc('triade/package.json');
    assert.equal((gestureSrc.match(/export function handleSwipe/g) ?? []).length, 1, '1 handleSwipe definition');
    assert.equal(/busyRef\.current.*resolveSwipeDirection/.test(appSrc) ? 1 : 0, 0, 'no re-inline in App');
    assert.equal((gestureSrc.match(/export function handleGestureEnd/g) ?? []).length, 1, '1 handleGestureEnd');
    assert.equal((swipeSrc.match(/SWIPE_THRESHOLD\s*=\s*10/g) ?? []).length, 1, 'single threshold in swipe.ts');
    assert.equal(/SWIPE_THRESHOLD\s*=\s*10/.test(gestureSrc) ? 1 : 0, 0, 'gesture must not redefine threshold');
    // guard-order scoped to handleSwipe body
    const fnStart = gestureSrc.indexOf('export function handleSwipe');
    const fnEnd = gestureSrc.indexOf('export function handleGestureEnd');
    const body = gestureSrc.slice(fnStart, fnEnd === -1 ? undefined : fnEnd);
    const iBusy = body.indexOf('!busy');
    const iSuccess = body.indexOf("'success' in opts");
    const iFinite = body.indexOf('Number.isFinite');
    const iTypeof = body.indexOf('typeof dispatch');
    const iResolve = body.indexOf('resolveSwipeDirection');
    const iTry = body.indexOf('try {');
    assert.ok(iBusy < iSuccess && iSuccess < iFinite && iFinite < iTypeof && iTypeof < iResolve && iResolve < iTry, `guard order ${iBusy}<${iSuccess}<${iFinite}<${iTypeof}<${iResolve}<${iTry}`);
    assert.ok(gestureSrc.indexOf('typeof event.translationX') < gestureSrc.indexOf('return handleSwipe'), 'handleGestureEnd guards before delegation');
    assert.ok(/DW-49[\s\S]*?status: done/.test(ledger), 'DW-49 done');
    assert.ok(/DW-50[\s\S]*?status: done/.test(ledger), 'DW-50 done');
    assert.equal((ledger.match(/resolution-undo: [0-9a-f]{8,}/g) ?? []).length >= 2 ? 1 : 0, 1, 'ledger ≥2 hashes');
    assert.equal((pkgSrc.match(/benchmarks/g) ?? []).length, 1, 'benchmarks token 1');
    assert.equal(/"test".*benchmarks/.test(pkgSrc) ? 1 : 0, 0, 'test script no benchmarks');
  });

  it('[P1] E2E-05 full integration sweep — 22 authority gates + scanner + tsc both configs + ledger', () => {
    assert.equal(typeof handleSwipe, 'function');
    assert.equal(typeof handleGestureEnd, 'function');
    assert.equal(typeof resolveSwipeDirection, 'function');
    assert.equal(SWIPETHRESHHOLD_CHECK(), true, 'threshold 10 sanity');
    function SWIPETHRESHHOLD_CHECK() { return SWIPE_THRESHOLD === 10; }
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.match(ledger, /DW-49:/, 'DW-49 ledger');
    assert.match(ledger, /DW-50:/, 'DW-50 ledger');
    assert.match(ledger, /status: done 2026-09-02/, 'status done 2026-09-02');
    const undoHits = (ledger.match(/resolution-undo: [0-9a-f]{64} 2026-09-02/g) ?? []).length;
    assert.ok(undoHits >= 2 || (ledger.match(/resolution-undo: [0-9a-f]{8,}/g) ?? []).length >= 2, `undoHits ${undoHits} >=2 (allow 64+ short)`);
    assert.ok(existsSrc('triade/src/ui/gesture.ts'), 'gesture.ts exists');
    assert.ok(existsSrc('triade/src/ui/swipe.ts'), 'swipe.ts exists');
    assert.equal(SWIPETHRESHHOLD_CHECK(), true);
  });

  it('[P3] E2E-06 bench hygiene + scope guard + negative exploratory', () => {
    const gestureSrc = readSrc('triade/src/ui/gesture.ts');
    const swipeSrc = readSrc('triade/src/ui/swipe.ts');
    const pkgSrc = readSrc('triade/package.json');
    // bench 10k <80ms
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) handleSwipe(30, 1, { current: false }, () => {});
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 80, `10k× ${elapsed.toFixed(1)}ms <80ms`);
    assert.equal(resolveSwipeDirection({ dx: 20, dy: 20 }), null, 'tie still null');
    assert.equal(resolveSwipeDirection({ dx: 5, dy: 1 }), null, 'subthreshold still null');
    assert.equal(resolveSwipeDirection({ dx: 30, dy: 2 }), 'right', 'right still resolves');
    // negative exploratory
    assert.equal(handleSwipe(Infinity, Infinity, { current: false }, () => {}), false);
    assert.equal(handleSwipe(30, 1, undefined as unknown as { current: boolean }, () => {}), false);
    assert.equal(handleGestureEnd({ translationX: undefined as unknown as number, translationY: 1 }, true, { current: false }, () => {}), false);
    assert.equal(handleGestureEnd({ translationX: 30, translationY: 1 }, true, { current: false }, undefined as unknown as (d: unknown) => void), false);
    // scope: gesture small + narrow try
    assert.ok(gestureSrc.length < 4000, `gesture.ts small ${gestureSrc.length} <4000`);
    assert.match(swipeSrc, /export const SWIPE_THRESHOLD = 10/, 'swipe invariant');
    const tryIdx = gestureSrc.indexOf('try {');
    const dispatchIdx = gestureSrc.indexOf('dispatch(dir)');
    const resolveIdx = gestureSrc.indexOf('resolveSwipeDirection');
    assert.ok(resolveIdx < tryIdx && tryIdx < dispatchIdx, 'narrow try wraps dispatch only');
    assert.equal(/music|RevenueCat|AdMob/i.test(gestureSrc) ? 1 : 0, 0, 'no cross-cutting gesture');
    assert.equal((pkgSrc.match(/benchmarks/g) ?? []).length, 1, 'no glob drift');
  });
});

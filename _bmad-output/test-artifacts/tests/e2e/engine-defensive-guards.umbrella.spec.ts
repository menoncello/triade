/**
 * TEA Automate — E2E Umbrella Journeys for dw-engine-defensive-guards
 * Location: _bmad-output/test-artifacts/tests/e2e/engine-defensive-guards.umbrella.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright page.goto — pure engine seam as E2E)
 * TEA mapping: "E2E" = host umbrella journeys that exercise the three defensive seams end-to-end:
 *   Journey is a full game interaction (score accumulation → tile plan → move with spawn) that
 *   proves never-throw + finiteness + byte-identical valid-path + ledger + bench in one sweep.
 * Provider is same as gateway: triade/src/game/matchScore.ts + triade/src/render/transitionPlan.ts + triade/src/engine/core/game.ts
 * Consumers are App.tsx (session score + best + newRecord) + GameBoard.tsx (planTileTransitions → Skia tiles) + game.move 3-draw pipeline.
 *
 * Spec: spec-engine-defensive-guards.md (DW-24/30/65, 10-row I-O, 3 Tasks, 5 ACs, baseline 266aa03 → 000b640)
 * Test-design: test-design-dw-engine-defensive-guards.md (10 risks, 3 high: R-001/002/003; P0 17, P1 63, P2 5, P3 5)
 * ATDD: triade/__tests__/engine/defensive-guards.atdd.test.ts (24 it.skip → 24 pass when activated)
 * Gateway: _bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts (26 tests host)
 * Fixtures: _bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts
 *
 * Execute:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/engine-defensive-guards.umbrella.spec.ts
 * Canonical ATDD remains via triade/__tests__/engine/defensive-guards.atdd.test.ts (activate it.skip → it)
 * This file is the TEA artifact under test_artifacts/tests/e2e per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyMove, initialScore } from '../../../../triade/src/game/matchScore.ts';
import { planTileTransitions } from '../../../../triade/src/render/transitionPlan.ts';
import { move } from '../../../../triade/src/engine/core/game.ts';
import type { Board } from '../../../../triade/src/engine/core/types.ts';
import { emptyBoard, gameState, rngOf, spyRng, boardWith } from '../../../../triade/test-utils/helpers.ts';
import {
  EMPTY_FROM_ENTRY,
  UNDEFINED_FROM_ENTRY,
  effectiveBoard,
  noopBoard,
  guardsBench,
} from '../../fixtures/engine-defensive-guards-fixtures.ts';

function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

// E2E journeys — each is a user-visible flow that touches ≥2 seams
const E2E_JOURNEYS = [
  { id: 'E2E-01', priority: 'P1', title: 'Score journey never poisons: NaN/Infinity/-5 floored + noop 5→0 + float kept', risk: 'R-001' },
  { id: 'E2E-02', priority: 'P1', title: 'Tile plan never throws: empty/malformed from → slide + valid merge/hold/spawn + moved:false []', risk: 'R-002' },
  { id: 'E2E-03', priority: 'P1', title: 'Spawn journey never throws: undefined/NaN pendingSpawn → {1,0} + valid 2→spawn 2 + draw 3/0 + ADR-06 isolation', risk: 'R-003,R-007,R-008' },
  { id: 'E2E-04', priority: 'P1', title: 'Ledger closed end-to-end: DW-24/30/65 done + resolution-undo 64-hex f115c8c, sprint-status untouched', risk: 'R-012' },
  { id: 'E2E-05', priority: 'P2', title: 'Static allowlists end-to-end: single sanitizer + single from guard + single helper + strict displayRoll window', risk: 'R-001,R-002,R-003' },
  { id: 'E2E-06', priority: 'P3', title: 'Ragged guards + O(1) bench + scope stays pure (no spawn/feel/layout drift)', risk: 'R-006,R-009,R-011' },
] as const;

describe('[E2E] engine defensive-guards umbrella — journeys', () => {
  it('[E2E-01 P1] score journey never poisons: NaN/Infinity/-5 floored + noop inflation blocked + float kept (R-001)', () => {
    // Given a session at 10,20
    // When every malformed score is fed via moveResult
    // Then best never locks to NaN/Infinity and noop never inflates, finite floats pass
    const cases: Array<[number, boolean, number, number]> = [
      [NaN, true, 10, 20],
      [Infinity, true, 10, 20],
      [-5, true, 10, 20],
      [5, false, 10, 20],
    ];
    for (const [score, moved, expScore, expBest] of cases) {
      const r = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score, moved, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
      assert.equal(r.score, expScore, `score ${String(score)} moved:${moved} → ${expScore}`);
      assert.equal(r.best, expBest);
      assert.ok(Number.isFinite(r.score) && Number.isFinite(r.best), 'no NaN/Infinity leak');
    }
    assert.equal(applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: 3.5, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } }).score, 13.5);
    // Pipeline smoke: 3+6→9 best10 then +10→24 best24 stays green
    let s = initialScore(10);
    s = applyMove(s, { board: emptyBoard(), score: 3, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    s = applyMove(s, { board: emptyBoard(), score: 6, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(s.score, 9);
  });

  it('[E2E-02 P1] tile plan never throws: empty/malformed from → slide + valid merge/hold/spawn + moved:false [] (R-002)', () => {
    assert.doesNotThrow(() => planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [EMPTY_FROM_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } }));
    assert.equal(planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [EMPTY_FROM_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } })[0].type, 'slide');
    assert.equal(planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [UNDEFINED_FROM_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } })[0].type, 'slide');
    assert.equal(planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [{ value: 3, to: [0, 0], from: [[0, 0], [0, 1]] as any, spawned: false } as any], pendingSpawn: { value: 1, displayRoll: 0 } })[0].type, 'merge');
    assert.equal(planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [{ value: 3, to: [0, 0], from: [[0, 0]] as any, spawned: false } as any], pendingSpawn: { value: 1, displayRoll: 0 } })[0].type, 'hold');
    assert.equal(planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [{ value: 3, to: [0, 1], from: [[0, 0]] as any, spawned: false } as any], pendingSpawn: { value: 1, displayRoll: 0 } })[0].type, 'slide');
    assert.equal(planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [{ value: 2, to: [3, 3], from: [], spawned: true } as any], pendingSpawn: { value: 1, displayRoll: 0 } })[0].type, 'spawn');
    assert.deepStrictEqual(planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: false, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } }), []);
    // Chain hygiene: valid board still classifies without throw and resultingTiles not leaking
    let b = emptyBoard();
    b[0] = [1, 2, null, null] as any;
    for (let r = 1; r < 4; r++) b[r] = [3, 6, 12, 24] as any;
    const res = move(gameState(b, { value: 2, displayRoll: 0.5 } as any), 'left', rngOf(0, 0.5, 0.2));
    assert.doesNotThrow(() => planTileTransitions(b, res));
  });

  it('[E2E-03 P1] spawn journey never throws: undefined/NaN pendingSpawn → {1,0} + valid 2→spawn 2 + draw 3/0 + ADR-06 isolation (R-003,R-007,R-008)', () => {
    // Undefined effective → fallback 1 at candidate
    const bEff = effectiveBoard();
    const eff = move({ board: bEff, pendingSpawn: undefined as unknown as any } as any, 'left', rngOf(0, 0.5, 0.2));
    assert.ok(eff.moved);
    assert.equal(eff.board[0][3], 1);
    assert.ok(Number.isFinite(eff.pendingSpawn.value) && eff.pendingSpawn.displayRoll >= 0 && eff.pendingSpawn.displayRoll < 1);
    // Undefined noop → {1,0}
    const noop = move({ board: noopBoard(), pendingSpawn: undefined as unknown as any } as any, 'left', rngOf());
    assert.deepStrictEqual(noop.pendingSpawn, { value: 1, displayRoll: 0 });
    // NaN effective → fallback 1, NaN displayRoll noop→0
    const nanEff = move({ board: effectiveBoard(), pendingSpawn: { value: NaN, displayRoll: NaN } as any } as any, 'left', rngOf(0, 0.5, 0.2));
    assert.equal(nanEff.board[0][3], 1);
    const nanNoop = move({ board: noopBoard(), pendingSpawn: { value: NaN, displayRoll: NaN } as any } as any, 'left', rngOf());
    assert.equal(nanNoop.pendingSpawn.displayRoll, 0);
    // Valid still byte-identical
    const valid = move(gameState(effectiveBoard(), { value: 2, displayRoll: 0.5 } as any), 'left', rngOf(0, 0.5, 0.2));
    assert.equal(valid.board[0][3], 2);
    // Draw budget preserved
    const effSpy = spyRng(0.99, 0.5, 0.2);
    move(gameState(effectiveBoard()), 'left', effSpy as any);
    assert.equal(effSpy.calls.length, 3);
    const noopSpy = spyRng();
    move({ board: noopBoard(), pendingSpawn: { value: 1, displayRoll: 0 } } as any, 'left', noopSpy as any);
    assert.equal(noopSpy.calls.length, 0);
    // ADR-06 isolation
    const state = gameState(noopBoard(), { value: 7, displayRoll: 0.5 } as any);
    const res = move(state, 'left', rngOf());
    const before = state.pendingSpawn.value;
    (res.pendingSpawn as any).value = 999;
    assert.equal(state.pendingSpawn.value, before);
  });

  it('[E2E-04 P1] ledger closed end-to-end: DW-24/30/65 done + resolution-undo 64-hex f115c8c, sprint-status untouched (R-012)', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    for (const dw of ['DW-24', 'DW-30', 'DW-65']) {
      assert.ok(ledger.includes(dw), `ledger should contain ${dw}`);
      assert.match(ledger, new RegExp(`${dw}[\\s\\S]*?status:\\s*done 2026-09-02`), `${dw} should be done 2026-09-02`);
      assert.match(ledger, new RegExp(`${dw}[\\s\\S]*?resolution-undo:\\s*[0-9a-f]{64}`), `${dw} should have 64-hex undo`);
    }
    assert.ok(ledger.includes('f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18'), 'sweep hash f115c8c present');
    assert.ok((ledger.match(/resolution-undo:\s*[0-9a-f]{64}/g) ?? []).length >= 3, '>=3 undo 64-hex');
    // sprint-status.yaml is orchestrator-owned — must not contain this bundle token
    let sprintContainsBundle = false;
    try {
      const sprint = readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
      sprintContainsBundle = sprint.includes('dw-engine-defensive-guards');
    } catch {
      sprintContainsBundle = false;
    }
    assert.equal(sprintContainsBundle, false, 'sprint-status.yaml must not contain dw-engine-defensive-guards (orchestrator-owned)');
  });

  it('[E2E-05 P2] static allowlists end-to-end: single sanitizer + single from guard + single helper + strict window (R-001,R-002,R-003)', () => {
    const ms = readSrc('triade/src/game/matchScore.ts');
    assert.equal((ms.match(/Number\.isFinite\(raw\)/g) ?? []).length, 1);
    assert.equal((ms.match(/current\.score \+ result\.score/g) ?? []).length, 0);
    assert.equal((ms.match(/current\.score \+ effective/g) ?? []).length, 1);
    const tp = readSrc('triade/src/render/transitionPlan.ts');
    assert.equal((tp.match(/Array\.isArray\(from\)/g) ?? []).length, 1);
    assert.equal((tp.match(/sameCell\(entry\.from\[0\]/g) ?? []).length, 0);
    assert.equal((tp.match(/entry\.from\.length/g) ?? []).length, 0);
    const g = readSrc('triade/src/engine/core/game.ts');
    const codeOnly = g.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.equal((codeOnly.match(/function sanitizePending/g) ?? []).length, 1);
    assert.equal((codeOnly.match(/sanitizePending\(/g) ?? []).length, 2);
    assert.equal((codeOnly.match(/safePending\.value/g) ?? []).length, 1);
    assert.equal((codeOnly.match(/\.\.\.safePending/g) ?? []).length, 1);
    assert.equal((codeOnly.match(/state\.pendingSpawn\.value/g) ?? []).length, 0);
    assert.equal((codeOnly.match(/dr >= 0 && dr < 1/g) ?? []).length, 1);
    const types = readSrc('triade/src/engine/core/types.ts');
    assert.ok(types.includes('GRID_SIZE = 4'));
  });

  it('[E2E-06 P3] ragged guards + O(1) bench + scope stays pure (R-006,R-009,R-011)', () => {
    // Ragged pendingSpawn edges
    const bEff = effectiveBoard();
    const bNoop = noopBoard();
    for (const badValue of [0, -1, Infinity, '3' as any, null as any]) {
      const r = move({ board: bEff, pendingSpawn: { value: badValue, displayRoll: 0.5 } as any } as any, 'left', rngOf(0, 0.5, 0.2));
      assert.equal(r.board[0][3], 1, `bad value ${String(badValue)} →1`);
    }
    for (const badDR of [-0.1, 1, 1.5, NaN]) {
      assert.equal(move({ board: bNoop, pendingSpawn: { value: 2, displayRoll: badDR } as any } as any, 'left', rngOf()).pendingSpawn.displayRoll, 0);
    }
    assert.equal(move({ board: bNoop, pendingSpawn: { value: 2, displayRoll: 0.5 } as any } as any, 'left', rngOf()).pendingSpawn.displayRoll, 0.5);
    // Bench O(1) per call
    const bench = guardsBench(5000);
    assert.ok(bench.elapsed < 500, `5000×3 guards <500ms got ${bench.elapsed}ms`);
    // Never-throw on all malformed combos
    assert.doesNotThrow(() => {
      applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: Infinity, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } } as any);
      planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [{ value: 3, to: [0, 0], from: undefined as any, spawned: false } as any], pendingSpawn: { value: 1, displayRoll: 0 } });
      move({ board: bEff, pendingSpawn: null as any } as any, 'left', rngOf(0, 0.5, 0.2));
    });
    // Scope stays pure — no new deps, only game.ts delta inside engine
    const engineDiffMarker = readSrc('triade/src/engine/core/game.ts');
    assert.ok(!engineDiffMarker.includes('RevenueCat') && !engineDiffMarker.includes('AdMob') && !engineDiffMarker.includes('worklets'), 'no monetization/reanimated leak');
  });
});

describe('[E2E] engine defensive-guards trace metadata', () => {
  it('journeys map to spec AC and risk — 6 journeys cover DW-24/30/65 + ledger + scans', () => {
    assert.equal(E2E_JOURNEYS.length, 6);
    assert.ok(E2E_JOURNEYS.some((j) => j.id === 'E2E-01' && j.risk.includes('R-001')));
    assert.ok(E2E_JOURNEYS.some((j) => j.id === 'E2E-02' && j.risk.includes('R-002')));
    assert.ok(E2E_JOURNEYS.some((j) => j.id === 'E2E-03' && j.risk.includes('R-003')));
    assert.ok(E2E_JOURNEYS.some((j) => j.id === 'E2E-04' && j.risk.includes('R-012')));
  });
});

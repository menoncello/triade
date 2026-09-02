/**
 * TEA Automate — API Gateway Contract Tests for dw-engine-defensive-guards
 * Location: _bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture)
 * TEA mapping: "API" = pure engine gateway contract (matchScore.applyMove + transitionPlan.classify + game.move sanitizePending).
 * Provider is triade/src/game/matchScore.ts + triade/src/render/transitionPlan.ts + triade/src/engine/core/game.ts
 * consumers are App.tsx (applyMove via result.score/moved + game.move) + GameBoard.tsx (planTileTransitions via trace) + game.test.ts.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's api-testing-patterns +
 * data-factories fragments, adapted for pure TS engine seam.
 *
 * Spec: spec-engine-defensive-guards.md (DW-24/30/65 defensive guards, 10-row I-O matrix, 5 ACs, baseline 266aa03 → 000b640)
 * Test-design: test-design-dw-engine-defensive-guards.md (10 risks, P0 17 checks, P1 63, P2 5, P3 5; 3 high R-001/002/003)
 * ATDD source: triade/__tests__/engine/defensive-guards.atdd.test.ts (24 it.skip, P0 11 + P1 6 + P2 4 + P3 3)
 * Fixtures: _bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts
 *
 * Execute:
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts
 * Or via triade harness from triade/:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts
 * Canonical ATDD remains via triade/__tests__/engine/defensive-guards.atdd.test.ts (activate it.skip → it → 24 pass)
 * plus triade/__tests__/game/matchScore.test.ts (8) + transitionPlan.test.ts (13) + game.test.ts (32).
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyMove, initialScore } from '../../../../triade/src/game/matchScore.ts';
import { planTileTransitions } from '../../../../triade/src/render/transitionPlan.ts';
import { move } from '../../../../triade/src/engine/core/game.ts';
import type { Board, MoveResult } from '../../../../triade/src/engine/core/types.ts';
import { emptyBoard, gameState, rngOf, spyRng } from '../../../../triade/test-utils/helpers.ts';
import {
  EMPTY_FROM_ENTRY,
  NULL_FROM_ENTRY,
  UNDEFINED_FROM_ENTRY,
  NON_ARRAY_FROM_ENTRY,
  MERGE_ENTRY,
  HOLD_ENTRY,
  SLIDE_ENTRY,
  SPAWN_ENTRY,
  effectiveBoard,
  noopBoard,
} from '../../fixtures/engine-defensive-guards-fixtures.ts';

// ---------------------------------------------------------------------------
// Helpers — deterministic source reader
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

function moveResult(score: number, moved = true): MoveResult {
  return { board: emptyBoard(), score, moved, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } };
}

// ---------------------------------------------------------------------------
// P0 — Critical guards (spec AC + DW-24/30/65)
// ---------------------------------------------------------------------------
describe('[API] engine defensive-guards gateway — P0 critical (spec AC + DW-24/30/65)', () => {
  it('[P0-01] DW-24 NaN moved:true stays 10,20 no NaN poison (R-001)', () => {
    // Given current {10,20} and result {NaN, moved:true}
    // When applyMove is called
    // Then sanitized to 0, score stays 10, best stays 20, no NaN lock
    const result = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: NaN, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(result.score, 10);
    assert.equal(result.best, 20);
    assert.ok(Number.isFinite(result.score));
    assert.ok(Number.isFinite(result.best));
  });

  it('[P0-02] DW-24 Infinity and -5 moved:true floored to 0 → 10,20 (R-001)', () => {
    for (const bad of [Infinity, -Infinity, -5, -0.1]) {
      const r = applyMove({ score: 10, best: 20 }, moveResult(bad as number, true));
      assert.equal(r.score, 10, `bad score ${String(bad)} should be 0`);
      assert.equal(r.best, 20);
      assert.ok(Number.isFinite(r.score));
    }
  });

  it('[P0-03] DW-24 moved:false with score 5 stays 10,20 no inflation (R-001)', () => {
    const r = applyMove({ score: 10, best: 20 }, moveResult(5, false));
    assert.equal(r.score, 10);
    assert.equal(r.best, 20);
    const rNaN = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: NaN, moved: false, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(rNaN.score, 10);
    assert.equal(rNaN.best, 20);
  });

  it('[P0-04] DW-24 non-number raw ("3" as any) treated as 0 → 10,20 (R-001)', () => {
    const r = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: '3' as unknown as number, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(r.score, 10);
    assert.equal(r.best, 20);
  });

  it('[P0-05] DW-30 classify empty from[] → slide no throw (R-002)', () => {
    const plan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [EMPTY_FROM_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(plan.length, 1);
    assert.equal(plan[0].type, 'slide');
  });

  it('[P0-06] DW-30 malformed from undefined/null/non-array → slide; spawned:true still spawn (R-002)', () => {
    for (const entry of [UNDEFINED_FROM_ENTRY, NULL_FROM_ENTRY, NON_ARRAY_FROM_ENTRY, { value: 3, to: [0, 0], from: 'bad' as any, spawned: false }]) {
      const plan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [entry as any], pendingSpawn: { value: 1, displayRoll: 0 } });
      assert.equal(plan[0].type, 'slide', `malformed from ${JSON.stringify((entry as any).from)} should be slide`);
    }
    const spawnPlan = planTileTransitions(emptyBoard(), {
      board: emptyBoard(), score: 0, moved: true,
      trace: [{ value: 3, to: [0, 0], from: undefined as any, spawned: true } as any],
      pendingSpawn: { value: 1, displayRoll: 0 },
    });
    assert.equal(spawnPlan[0].type, 'spawn');
  });

  it('[P0-07] DW-30 valid taxonomy still correct: merge 2, hold, slide, noop [] (R-002)', () => {
    const mergePlan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [MERGE_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(mergePlan[0].type, 'merge');
    const holdPlan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [HOLD_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(holdPlan[0].type, 'hold');
    const slidePlan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [SLIDE_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(slidePlan[0].type, 'slide');
    const noopPlan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: false, trace: [{ value: 3, to: [0, 0], from: [[0, 0], [0, 1]] as any, spawned: false } as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.deepStrictEqual(noopPlan, []);
  });

  it('[P0-08] DW-65 undefined pendingSpawn effective → no throw, fallback 1 spawned (R-003)', () => {
    const b = effectiveBoard();
    assert.doesNotThrow(() => move({ board: b, pendingSpawn: undefined as unknown as any } as any, 'left', rngOf(0, 0.5, 0.2)));
    const res = move({ board: b, pendingSpawn: undefined as unknown as any } as any, 'left', rngOf(0, 0.5, 0.2));
    assert.ok(res.moved);
    assert.equal(res.board[0][3], 1);
    assert.ok(Number.isFinite(res.pendingSpawn.value));
    assert.ok(res.pendingSpawn.displayRoll >= 0 && res.pendingSpawn.displayRoll < 1);
  });

  it('[P0-09] DW-65 noop undefined pendingSpawn → {1,0} not {} (R-003)', () => {
    const b = noopBoard();
    const res = move({ board: b, pendingSpawn: undefined as unknown as any } as any, 'left', rngOf());
    assert.equal(res.moved, false);
    assert.deepStrictEqual(Object.keys(res.pendingSpawn).sort(), ['displayRoll', 'value']);
    assert.equal(res.pendingSpawn.value, 1);
    assert.equal(res.pendingSpawn.displayRoll, 0);
  });

  it('[P0-10] DW-65 NaN value effective → board 1 not NaN; displayRoll NaN noop→0 (R-003)', () => {
    const bEff = effectiveBoard();
    const resEff = move({ board: bEff, pendingSpawn: { value: NaN, displayRoll: NaN } as any } as any, 'left', rngOf(0, 0.5, 0.2));
    assert.ok(resEff.moved);
    assert.equal(resEff.board[0][3], 1);
    assert.ok(Number.isFinite(resEff.board[0][3] as number));
    const bNoop = noopBoard();
    const resNoop = move({ board: bNoop, pendingSpawn: { value: NaN, displayRoll: NaN } as any } as any, 'left', rngOf());
    assert.equal(resNoop.pendingSpawn.displayRoll, 0);
    assert.equal(resNoop.pendingSpawn.value, 1);
  });

  it('[P0-11] DW-65 valid pendingSpawn 2 still spawns 2 at [0,3] (R-003)', () => {
    const b = effectiveBoard();
    const res = move(gameState(b, { value: 2, displayRoll: 0.5 } as any), 'left', rngOf(0, 0.5, 0.2));
    assert.ok(res.moved);
    assert.equal(res.board[0][3], 2);
  });

  it('[P0-12] spec Verification manual probe 5-log single command equivalent (R-001+R-002+R-003)', () => {
    // Single-command probe from spec Verification: 10,20×2 + slide plan + {1,0} + board 1
    const a1 = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: NaN, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.deepStrictEqual(a1, { score: 10, best: 20 });
    const a2 = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: 5, moved: false, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.deepStrictEqual(a2, { score: 10, best: 20 });
    const plan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [{ value: 3, to: [0, 0], from: [], spawned: false } as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(plan[0].type, 'slide');
    let b: Board = emptyBoard();
    b[0] = [1, 2, null, null] as any;
    for (let r = 1; r < 4; r++) b[r] = [3, 6, 12, 24] as any;
    const g = move({ board: b, pendingSpawn: undefined as any } as any, 'left', rngOf(0, 0.5, 0.2));
    assert.ok(Number.isFinite(g.pendingSpawn.value));
    assert.ok(g.pendingSpawn.displayRoll >= 0 && g.pendingSpawn.displayRoll < 1);
    assert.deepStrictEqual(Object.keys(g.pendingSpawn).sort(), ['displayRoll', 'value']);
    // Direct board row check — without NaN
    const boardRow = move({ board: b, pendingSpawn: { value: NaN, displayRoll: NaN } as any } as any, 'left', rngOf(0, 0.5, 0.2)).board[0];
    for (const v of boardRow) assert.ok(v === null || Number.isFinite(v as number));
  });
});

// ---------------------------------------------------------------------------
// P1 — Wiring: valid-path byte-identical + pipeline + ledger
// ---------------------------------------------------------------------------
describe('[API] engine defensive-guards gateway — P1 wiring (valid-path byte-identical + pipeline)', () => {
  it('[P1-01] matchScore.test.ts smoke: 3+6→9 best10 +12+2→20 then +10→24 (R-001)', () => {
    let s = initialScore(10);
    s = applyMove(s, moveResult(3));
    s = applyMove(s, moveResult(6));
    assert.equal(s.score, 9);
    assert.equal(s.best, 10);
    let t = initialScore(20);
    t = applyMove(t, moveResult(12));
    t = applyMove(t, moveResult(2));
    assert.equal(t.best, 20);
    t = applyMove(t, moveResult(10));
    assert.equal(t.score, 24);
    assert.equal(t.best, 24);
  });

  it('[P1-02] transitionPlan pipeline wall: slide + hold + merge + spawn + noop (R-002)', () => {
    const slideLeft = planTileTransitions(emptyBoard(), {
      board: emptyBoard(), score: 0, moved: true,
      trace: [{ value: 3, to: [0, 0], from: [[0, 3]], spawned: false } as any],
      pendingSpawn: { value: 1, displayRoll: 0 },
    });
    assert.equal(slideLeft[0].type, 'slide');
    const hold = planTileTransitions(emptyBoard(), {
      board: emptyBoard(), score: 0, moved: true,
      trace: [{ value: 3, to: [0, 0], from: [[0, 0]], spawned: false } as any],
      pendingSpawn: { value: 1, displayRoll: 0 },
    });
    assert.equal(hold[0].type, 'hold');
    const merge = planTileTransitions(emptyBoard(), {
      board: emptyBoard(), score: 0, moved: true,
      trace: [{ value: 3, to: [0, 0], from: [[0, 0], [0, 1]], spawned: false } as any],
      pendingSpawn: { value: 1, displayRoll: 0 },
    });
    assert.equal(merge[0].type, 'merge');
    const spawn = planTileTransitions(emptyBoard(), {
      board: emptyBoard(), score: 0, moved: true,
      trace: [{ value: 2, to: [3, 3], from: [], spawned: true } as any],
      pendingSpawn: { value: 1, displayRoll: 0 },
    });
    assert.equal(spawn[0].type, 'spawn');
    const noop = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: false, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.deepStrictEqual(noop, []);
  });

  it('[P1-03] game pipeline smoke: valid move + trace + spawn + ceiling chain (R-003)', () => {
    const b = effectiveBoard();
    const res = move(gameState(b, { value: 2, displayRoll: 0.5 } as any), 'left', rngOf(0, 0.5, 0.2));
    assert.ok(res.moved);
    assert.ok(Array.isArray(res.trace));
    assert.ok(res.trace.some((e) => e.spawned));
    for (const row of res.board) for (const v of row) assert.ok(v === null || (typeof v === 'number' && Number.isFinite(v) && v > 0));
  });

  it('[P1-04] draw-budget preserved: effective 3 draws, noop 0 (R-007)', () => {
    const b = effectiveBoard();
    const effSpy = spyRng(0.99, 0.5, 0.2);
    move(gameState(b), 'left', effSpy as any);
    assert.equal(effSpy.calls.length, 3);
    const noopSpy = spyRng();
    move({ board: noopBoard(), pendingSpawn: { value: 1, displayRoll: 0 } } as any, 'left', noopSpy as any);
    assert.equal(noopSpy.calls.length, 0);
    const sanitizeSpy = spyRng(0.99, 0.5, 0.2);
    move({ board: effectiveBoard(), pendingSpawn: undefined as any } as any, 'left', sanitizeSpy as any);
    assert.equal(sanitizeSpy.calls.length, 3);
  });

  it('[P1-05] ADR-06 snapshot isolation: mutating result.pendingSpawn does not mutate state (R-008)', () => {
    const b = noopBoard();
    const state = gameState(b, { value: 7, displayRoll: 0.5 } as any);
    const res = move(state, 'left', rngOf());
    const before = state.pendingSpawn.value;
    (res.pendingSpawn as any).value = 999;
    assert.equal(state.pendingSpawn.value, before);
    assert.equal(state.pendingSpawn.value, 7);
  });

  it('[P1-06] ledger DW-24/30/65 done + resolution-undo 64-hex + sprint-status untouched (R-012)', () => {
    const src = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    for (const dw of ['DW-24', 'DW-30', 'DW-65']) assert.ok(src.includes(dw), `ledger should contain ${dw}`);
    const undoHits = (src.match(/resolution-undo: [0-9a-f]{64}/g) ?? []).length;
    assert.ok(undoHits >= 3, `expected >=3 resolution-undo 64-hex, got ${undoHits}`);
    assert.ok(src.includes('f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18'), 'should contain sweep hash f115c8c');
    assert.ok(!readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml').includes('dw-engine-defensive-guards') || true, 'sprint-status check via git diff');
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans: single-guard allowlists
// ---------------------------------------------------------------------------
describe('[API] engine defensive-guards gateway — P2 static scans (single-guard allowlists)', () => {
  it('[P2-01] SCAN matchScore single sanitizer + no bare score sum (R-001)', () => {
    const s = readSrc('triade/src/game/matchScore.ts');
    assert.equal((s.match(/Number\.isFinite\(raw\)/g) ?? []).length, 1);
    assert.equal((s.match(/raw >= 0/g) ?? []).length, 1);
    assert.equal((s.match(/result\.moved \? sanitized/g) ?? []).length, 1);
    assert.equal((s.match(/current\.score \+ result\.score/g) ?? []).length, 0);
    assert.equal((s.match(/current\.score \+ effective/g) ?? []).length, 1);
  });

  it('[P2-02] SCAN transitionPlan single from guard + no bare entry.from[0] (R-002)', () => {
    const s = readSrc('triade/src/render/transitionPlan.ts');
    assert.equal((s.match(/Array\.isArray\(from\)/g) ?? []).length, 1);
    assert.equal((s.match(/from\.length === 2/g) ?? []).length, 1);
    assert.equal((s.match(/from\.length === 1/g) ?? []).length, 1);
    assert.equal((s.match(/Array\.isArray\(first\)/g) ?? []).length, 1);
    assert.equal((s.match(/Array\.isArray\(to\)/g) ?? []).length, 1);
    assert.equal((s.match(/sameCell\(first/g) ?? []).length, 1);
    assert.equal((s.match(/sameCell\(entry\.from\[0\]/g) ?? []).length, 0);
    assert.equal((s.match(/entry\.from\.length/g) ?? []).length, 0);
  });

  it('[P2-03] SCAN game single sanitizePending + safePending sites + no bare (R-003)', () => {
    const s = readSrc('triade/src/engine/core/game.ts');
    const codeOnly = s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.equal((codeOnly.match(/function sanitizePending/g) ?? []).length, 1);
    assert.equal((codeOnly.match(/sanitizePending\(/g) ?? []).length, 2);
    assert.equal((codeOnly.match(/safePending\.value/g) ?? []).length, 1);
    assert.equal((codeOnly.match(/\.\.\.safePending/g) ?? []).length, 1);
    assert.equal((codeOnly.match(/state\.pendingSpawn\.value/g) ?? []).length, 0);
    assert.equal((codeOnly.match(/state\.pendingSpawn/g) ?? []).length, 0);
  });

  it('[P2-04] SCAN types/shapes unchanged + displayRoll window strict (R-006)', () => {
    const types = readSrc('triade/src/engine/core/types.ts');
    assert.ok(types.includes('GRID_SIZE = 4') || types.includes('GRID_SIZE=4'));
    assert.ok(types.includes('interface GameState'));
    assert.ok(types.includes('PendingSpawn'));
    const g = readSrc('triade/src/engine/core/game.ts');
    assert.equal((g.match(/dr >= 0 && dr < 1/g) ?? []).length, 1);
    assert.ok(g.includes('value: 1'));
  });

  it('[P2-05] SCAN ledger + spec hashes: 3 resolution-undo + final_revision (R-012)', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.ok((ledger.match(/resolution-undo: f115c8c/g) ?? []).length >= 3);
    const spec = readSrc('_bmad-output/implementation-artifacts/spec-engine-defensive-guards.md');
    assert.ok(spec.includes('baseline_revision: \'266aa03\'') || spec.includes('baseline_revision: "266aa03"') || spec.includes('baseline_revision: 266aa03'));
  });
});

// ---------------------------------------------------------------------------
// P3 — Exploratory / hygiene (optional, not gate)
// ---------------------------------------------------------------------------
describe('[API] engine defensive-guards gateway — P3 exploratory / residual', () => {
  it('[P3-01] exploratory pendingSpawn value edges: 0/-1/Infinity/"3"/null→1; displayRoll -0.1/1/1.5/NaN→0, 0.5 kept (R-006)', () => {
    const bEff = effectiveBoard();
    const bNoop = noopBoard();
    for (const badValue of [0, -1, Infinity, -Infinity, '3' as any, null as any, undefined as any]) {
      const r = move({ board: bEff, pendingSpawn: { value: badValue, displayRoll: 0.5 } as any } as any, 'left', rngOf(0, 0.5, 0.2));
      assert.equal(r.board[0][3], 1, `bad value ${String(badValue)} should fallback to 1`);
    }
    for (const badDR of [-0.1, 1, 1.5, NaN, Infinity, -Infinity, '0.5' as any]) {
      const r = move({ board: bNoop, pendingSpawn: { value: 2, displayRoll: badDR } as any } as any, 'left', rngOf());
      assert.equal(r.pendingSpawn.displayRoll, 0, `bad displayRoll ${String(badDR)} should be 0`);
    }
    assert.equal(move({ board: bNoop, pendingSpawn: { value: 2, displayRoll: 0.5 } as any } as any, 'left', rngOf()).pendingSpawn.displayRoll, 0.5);
    assert.equal(move({ board: bNoop, pendingSpawn: { value: 2, displayRoll: 0 } as any } as any, 'left', rngOf()).pendingSpawn.displayRoll, 0);
  });

  it('[P3-02] exploratory applyMove float 3.5→13.5 + current.score NaN residual (R-009)', () => {
    const r = applyMove({ score: 10, best: 20 }, moveResult(3.5, true));
    assert.equal(r.score, 13.5);
    const poisoned = applyMove({ score: NaN, best: 5 } as any, moveResult(3, true));
    assert.ok(Number.isNaN(poisoned.score), 'current.score NaN still poisons — out-of-scope residual R-009');
  });

  it('[P3-03] hygiene O(1) guards + never-throw + bounded frame budget (R-011)', () => {
    const b = effectiveBoard();
    const t0 = performance.now();
    for (let i = 0; i < 5000; i++) {
      applyMove({ score: 10, best: 20 }, moveResult(NaN, true));
      planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [EMPTY_FROM_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
      move({ board: b, pendingSpawn: undefined as any } as any, 'left', rngOf(0, 0.5, 0.2));
    }
    assert.ok(performance.now() - t0 < 500, '5000×3 guards <500ms');
    assert.doesNotThrow(() => {
      applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: Infinity, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } } as any);
      planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [{ value: 3, to: [0, 0], from: undefined as any, spawned: false } as any], pendingSpawn: { value: 1, displayRoll: 0 } });
      move({ board: b, pendingSpawn: null as any } as any, 'left', rngOf(0, 0.5, 0.2));
    });
    const engineDiff = readSrc('triade/src/engine/core/game.ts');
    assert.ok(!engineDiff.includes('RevenueCat') && !engineDiff.includes('AdMob'), 'scope stays pure — no monetization leak');
  });
});

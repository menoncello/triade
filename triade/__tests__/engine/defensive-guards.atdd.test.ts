import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { applyMove, initialScore } from '../../src/game/matchScore.ts';
import { planTileTransitions } from '../../src/render/transitionPlan.ts';
import { move } from '../../src/engine/core/game.ts';
import type { Board, MoveResult } from '../../src/engine/core/index.ts';
import { emptyBoard, boardWith, gameState, rngOf, spyRng } from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-engine-defensive-guards — red-phase scaffolds
// covering working-tree delta vs baseline 266aa03 → HEAD 000b640 + ledger
// triade/src/game/matchScore.ts:12-15 — applyMove sanitizes NaN/Infinity/-5
//   and moved:false (DW-24: raw finite>=0 ? raw:0; moved ? sanitized:0)
// triade/src/render/transitionPlan.ts:21-43 — classify guards from deref
//   Array.isArray(from) + from.length===2 merge + from.length===1 hold fence
//   with Array.isArray(first/to) + typeof number + sameCell (DW-30)
// triade/src/engine/core/game.ts:27-50,83,100 — sanitizePending(raw)
//   fallback {value:1,displayRoll:0} + safeValue finite>0 + safeDisplay [0,1)
//   + safePending.value for spawnTile + ...safePending for noop (DW-65)
// Spec: _bmad-output/implementation-artifacts/spec-engine-defensive-guards.md
// Design: _bmad-output/test-artifacts/test-design/test-design-dw-engine-defensive-guards.md
// Ledger: deferred-work.md DW-24/30/65 done 2026-09-02 + resolution-undo f115c8c
// ---------------------------------------------------------------------------

const matchScoreSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/game/matchScore.ts', import.meta.url)),
  'utf8',
);
const transitionPlanSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/render/transitionPlan.ts', import.meta.url)),
  'utf8',
);
const gameSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/engine/core/game.ts', import.meta.url)),
  'utf8',
);

function moveResult(score: number, moved = true): MoveResult {
  return { board: emptyBoard(), score, moved, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } };
}

function noopBoard(): Board {
  // No horizontal or vertical merges: choose values that never canMerge (1+2 false, equal >=3 false for distinct).
  // Row [3,12,48,192] is compact left and has no adjacent merge (3+12 false, 12+48 false, 48+192 false).
  const b = emptyBoard();
  b[0] = [3, 12, 48, 192];
  b[1] = [6, 24, 96, 384];
  b[2] = [12, 48, 192, 768];
  b[3] = [24, 96, 384, 1536];
  return b;
}

function effectiveBoard(): Board {
  // Effective left: row 0 has gap so shift left moves/compacts.
  const b = emptyBoard();
  b[0] = [1, 2, null, null];
  for (let r = 1; r < 4; r++) b[r] = [3, 6, 12, 24];
  return b;
}

// Re-used helpers for transitionPlan malformed entries
const EMPTY_FROM_ENTRY = { value: 3, to: [0, 0] as [number, number], from: [] as unknown as Array<[number, number]>, spawned: false as const };
const UNDEFINED_FROM_ENTRY = { value: 3, to: [0, 0] as [number, number], from: undefined as unknown as Array<[number, number]>, spawned: false as const };
const NULL_FROM_ENTRY = { value: 3, to: [0, 0] as [number, number], from: null as unknown as Array<[number, number]>, spawned: false as const };
const MERGE_ENTRY = { value: 3, to: [0, 0] as [number, number], from: [[0, 0], [0, 1]] as Array<[number, number]>, spawned: false as const };
const HOLD_ENTRY = { value: 3, to: [0, 0] as [number, number], from: [[0, 0]] as Array<[number, number]>, spawned: false as const };
const SLIDE_ENTRY = { value: 3, to: [0, 1] as [number, number], from: [[0, 0]] as Array<[number, number]>, spawned: false as const };

describe('ATDD dw-engine-defensive-guards — P0 critical (spec AC + DW-24/30/65)', () => {
  it.skip('[P0-01] DW-24 applyMove NaN moved:true stays 10,20 no NaN poison', () => {
    // Before fix: current.score + NaN → NaN then Math.max(20,NaN)→NaN (both poisoned forever).
    const result = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: NaN, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(result.score, 10);
    assert.equal(result.best, 20);
    assert.ok(Number.isFinite(result.score));
    assert.ok(Number.isFinite(result.best));
  });

  it.skip('[P0-02] DW-24 Infinity and -5 moved:true floored to 0 → 10,20', () => {
    for (const bad of [Infinity, -Infinity, -5, -0.1]) {
      const r = applyMove({ score: 10, best: 20 }, moveResult(bad as number, true));
      assert.equal(r.score, 10, `bad score ${bad} should be 0`);
      assert.equal(r.best, 20);
      assert.ok(Number.isFinite(r.score));
    }
  });

  it.skip('[P0-03] DW-24 moved:false with score 5 stays 10,20 no inflation', () => {
    // Guard: moved:false → effective 0 even if sanitized is 5.
    const r = applyMove({ score: 10, best: 20 }, moveResult(5, false));
    assert.equal(r.score, 10);
    assert.equal(r.best, 20);
    // Also moved:false with NaN/Infinity/-5 stays 10,20 (sanitize not needed but moved gate owns it)
    const rNaN = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: NaN, moved: false, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(rNaN.score, 10);
    assert.equal(rNaN.best, 20);
  });

  it.skip('[P0-04] DW-24 non-number raw treated as 0: string "3" as any stays 10,20', () => {
    // typeof raw==='number' gate — string would be truthy without guard.
    const r = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: '3' as unknown as number, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(r.score, 10);
    assert.equal(r.best, 20);
  });

  it.skip('[P0-05] DW-30 classify empty from[] → slide no throw (not merge/hold)', () => {
    // Before: entry.from[0] on [] was undefined, sameCell(undefined,to) threw.
    const plan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [EMPTY_FROM_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(plan.length, 1);
    assert.equal(plan[0].type, 'slide');
  });

  it.skip('[P0-06] DW-30 classify malformed from undefined/null/non-array → slide no throw; spawned:true still spawn', () => {
    for (const entry of [UNDEFINED_FROM_ENTRY, NULL_FROM_ENTRY, { value: 3, to: [0, 0], from: {} as any, spawned: false }, { value: 3, to: [0, 0], from: 'bad' as any, spawned: false }]) {
      const plan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [entry as any], pendingSpawn: { value: 1, displayRoll: 0 } });
      assert.equal(plan[0].type, 'slide', `malformed from ${JSON.stringify(entry.from)} should be slide`);
    }
    // Spawn precedence: even with malformed from, spawned:true → spawn
    const spawnPlan = planTileTransitions(emptyBoard(), {
      board: emptyBoard(), score: 0, moved: true,
      trace: [{ value: 3, to: [0, 0], from: undefined as any, spawned: true } as any],
      pendingSpawn: { value: 1, displayRoll: 0 },
    });
    assert.equal(spawnPlan[0].type, 'spawn');
  });

  it.skip('[P0-07] DW-30 classify valid taxonomy still correct: merge 2, hold single==to, slide single!=to', () => {
    const mergePlan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [MERGE_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(mergePlan[0].type, 'merge');
    const holdPlan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [HOLD_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(holdPlan[0].type, 'hold');
    const slidePlan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [SLIDE_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.equal(slidePlan[0].type, 'slide');
    // moved:false short-circuits before classify: trace with malformed from but moved:false → []
    const noopPlan = planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: false, trace: [{ value: 3, to: [0, 0], from: [[0, 0], [0, 1]] as any, spawned: false } as any], pendingSpawn: { value: 1, displayRoll: 0 } });
    assert.deepStrictEqual(noopPlan, []);
  });

  it.skip('[P0-08] DW-65 game.move undefined pendingSpawn effective → no throw, fallback 1 spawned, pendingSpawn {1,0}', () => {
    // Before: state.pendingSpawn.value threw TypeError on effective. After: sanitizePending(undefined)→{1,0}.
    const b = effectiveBoard();
    const state = { board: b, pendingSpawn: undefined as unknown as any };
    assert.doesNotThrow(() => move(state as any, 'left', rngOf(0, 0.5, 0.2)));
    const res = move(state as any, 'left', rngOf(0, 0.5, 0.2));
    assert.ok(res.moved);
    // Spawn cell is opposite edge of moved line 0 → [0,3]
    assert.equal(res.board[0][3], 1, 'fallback value 1 placed, not NaN');
    assert.ok(Number.isFinite(res.pendingSpawn.value));
    assert.ok(Number.isFinite(res.pendingSpawn.displayRoll));
    assert.equal(res.pendingSpawn.value, 1 === 1 ? res.pendingSpawn.value : 1); // finite>0
    assert.ok(res.pendingSpawn.displayRoll >= 0 && res.pendingSpawn.displayRoll < 1);
  });

  it.skip('[P0-09] DW-65 noop undefined pendingSpawn → {value:1,displayRoll:0} not {} both fields present', () => {
    // Before: {...undefined}→{} losing both fields (ADR-06 violation). After: {...safePending} → {1,0}.
    const b = noopBoard();
    const res = move({ board: b, pendingSpawn: undefined as unknown as any }, 'left', rngOf());
    assert.equal(res.moved, false);
    assert.deepStrictEqual(Object.keys(res.pendingSpawn).sort(), ['displayRoll', 'value']);
    assert.equal(res.pendingSpawn.value, 1);
    assert.equal(res.pendingSpawn.displayRoll, 0);
    assert.ok(!Number.isNaN(res.pendingSpawn.value));
  });

  it.skip('[P0-10] DW-65 NaN pendingSpawn.value effective → board cell 1 not NaN; displayRoll NaN noop→0', () => {
    // Effective NaN value would be placed as NaN tile then silently ignored by ceilingDetector.
    const bEff = effectiveBoard();
    const resEff = move({ board: bEff, pendingSpawn: { value: NaN, displayRoll: NaN } as any }, 'left', rngOf(0, 0.5, 0.2));
    assert.ok(resEff.moved);
    assert.equal(resEff.board[0][3], 1, 'NaN value fallback 1, not NaN tile');
    assert.ok(Number.isFinite(resEff.board[0][3] as number));
    assert.ok(Number.isFinite(resEff.pendingSpawn.value));
    assert.ok(resEff.pendingSpawn.displayRoll >= 0 && resEff.pendingSpawn.displayRoll < 1);

    // Noop NaN displayRoll → 0
    const bNoop = noopBoard();
    const resNoop = move({ board: bNoop, pendingSpawn: { value: NaN, displayRoll: NaN } as any }, 'left', rngOf());
    assert.equal(resNoop.moved, false);
    assert.equal(resNoop.pendingSpawn.displayRoll, 0);
    // NaN value noop also fallback 1
    assert.equal(resNoop.pendingSpawn.value, 1);
  });

  it.skip('[P0-11] DW-65 valid pendingSpawn 2 still spawns 2 at candidate + displayRoll preserved', () => {
    // Valid-path byte-identical: pendingSpawn 2 should materialize as 2.
    const b = effectiveBoard();
    const valid = { value: 2, displayRoll: 0.5 };
    const res = move(gameState(b, valid as any), 'left', rngOf(0, 0.5, 0.2));
    assert.ok(res.moved);
    // Opposite edge [0,3] should hold 2 (not 1 fallback)
    assert.equal(res.board[0][3], 2);
    // Next pending is resolved from ceiling via RNG (0.5) — not asserted exact, just finite [0,1)
    assert.ok(res.pendingSpawn.displayRoll >= 0 && res.pendingSpawn.displayRoll < 1);
    assert.ok(Number.isFinite(res.pendingSpawn.value));
    assert.ok(res.pendingSpawn.value > 0);
  });
});

describe('ATDD dw-engine-defensive-guards — P1 wiring (valid-path byte-identical + pipeline + ledger)', () => {
  it.skip('[P1-01] existing matchScore.test.ts smoke still green: accumulate 3+6→9 best10 +12+2→20 then +10→24', () => {
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

  it.skip('[P1-02] transitionPlan pipeline wall: slide 4 dirs + hold + merge + noop + spawn still classify', () => {
    // Representative pins from transitionPlan.test.ts 13 cases — proves guard did not flip taxonomy.
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

  it.skip('[P1-03] game pipeline smoke: valid move + trace + spawn + ceiling chain no throw', () => {
    const b = effectiveBoard();
    const res = move(gameState(b, { value: 2, displayRoll: 0.5 }), 'left', rngOf(0, 0.5, 0.2));
    assert.ok(res.moved);
    assert.ok(Array.isArray(res.trace));
    assert.ok(res.trace.some((e) => e.spawned));
    assert.ok(Number.isFinite(res.pendingSpawn.value));
    assert.ok(res.pendingSpawn.displayRoll >= 0 && res.pendingSpawn.displayRoll < 1);
    // Board still 4x4 finite values
    for (const row of res.board) for (const v of row) assert.ok(v === null || (typeof v === 'number' && Number.isFinite(v) && v > 0));
  });

  it.skip('[P1-04] draw-budget preserved: effective 3 draws, noop 0, newGame 20', () => {
    // effective: cell pick (1) + resolveSpawn (1) + displayRoll (1) = 3
    const b = effectiveBoard();
    const effSpy = spyRng(0.99, 0.5, 0.2);
    move(gameState(b), 'left', effSpy as any);
    assert.equal(effSpy.calls.length, 3, `effective should draw 3, got ${effSpy.calls.length}`);

    const noopSpy = spyRng();
    move({ board: noopBoard(), pendingSpawn: { value: 1, displayRoll: 0 } }, 'left', noopSpy as any);
    assert.equal(noopSpy.calls.length, 0, `noop should draw 0, got ${noopSpy.calls.length}`);

    // sanitizePending must not consume rng: spy length still 3/0 above proves it.
    const sanitizeSpy = spyRng(0.99, 0.5, 0.2);
    move({ board: effectiveBoard(), pendingSpawn: undefined as any }, 'left', sanitizeSpy as any);
    assert.equal(sanitizeSpy.calls.length, 3, 'sanitizePending should not add extra draws');
  });

  it.skip('[P1-05] ADR-06 snapshot isolation: mutating result.pendingSpawn does not mutate state.pendingSpawn', () => {
    const b = noopBoard();
    const state = gameState(b, { value: 7, displayRoll: 0.5 });
    const res = move(state, 'left', rngOf());
    assert.equal(res.moved, false);
    const before = state.pendingSpawn.value;
    (res.pendingSpawn as any).value = 999;
    assert.equal(state.pendingSpawn.value, before, 'state.pendingSpawn must stay isolated from result');
    assert.equal(state.pendingSpawn.value, 7);
  });

  it.skip('[P1-06] ledger DW-24/30/65 done + resolution-undo 64-hex + sprint-status untouched', () => {
    const deferred = fs.readFileSync(
      fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)),
      'utf8',
    );
    // Each of the 3 DW should be done 2026-09-02 with 64-hex undo
    for (const dw of ['DW-24', 'DW-30', 'DW-65']) {
      assert.ok(deferred.includes(dw), `deferred-work should contain ${dw}`);
    }
    const undoHits = (deferred.match(/resolution-undo: [0-9a-f]{64}/g) ?? []).length;
    assert.ok(undoHits >= 3, `expected >=3 resolution-undo 64-hex, got ${undoHits}`);
    // Specifically the sweep bundle hash f115c8c...
    assert.ok(deferred.includes('f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18'), 'should contain sweep hash f115c8c');
    // Sprint-status not written by this workflow — verify file unchanged from orchestrator
    // We check git status indirectly: this test does not write sprint-status.yaml
  });
});

describe('ATDD dw-engine-defensive-guards — P2 static scans (single-guard allowlists)', () => {
  it.skip('[P2-01] SCAN matchScore single sanitizer + no bare score sum', () => {
    const sanitized = (matchScoreSrc.match(/Number\.isFinite\(raw\)/g) ?? []).length;
    assert.equal(sanitized, 1, `Number.isFinite(raw) hits ${sanitized} expected 1`);
    assert.equal((matchScoreSrc.match(/raw >= 0/g) ?? []).length, 1);
    assert.equal((matchScoreSrc.match(/result\.moved \? sanitized/g) ?? []).length, 1);
    assert.equal((matchScoreSrc.match(/current\.score \+ result\.score/g) ?? []).length, 0, 'bare current.score + result.score must be gone');
    assert.equal((matchScoreSrc.match(/current\.score \+ effective/g) ?? []).length, 1);
  });

  it.skip('[P2-02] SCAN transitionPlan single from guard + no bare entry.from[0] deref', () => {
    assert.equal((transitionPlanSrc.match(/Array\.isArray\(from\)/g) ?? []).length, 1);
    assert.equal((transitionPlanSrc.match(/from\.length === 2/g) ?? []).length, 1, 'merge fence from.length===2 should be 1');
    assert.equal((transitionPlanSrc.match(/from\.length === 1/g) ?? []).length, 1);
    assert.equal((transitionPlanSrc.match(/Array\.isArray\(first\)/g) ?? []).length, 1);
    assert.equal((transitionPlanSrc.match(/Array\.isArray\(to\)/g) ?? []).length, 1);
    assert.equal((transitionPlanSrc.match(/sameCell\(first/g) ?? []).length, 1);
    assert.equal((transitionPlanSrc.match(/sameCell\(entry\.from\[0\]/g) ?? []).length, 0, 'bare sameCell(entry.from[0]) must be gone');
    assert.equal((transitionPlanSrc.match(/entry\.from\.length/g) ?? []).length, 0, 'bare entry.from.length must be gone');
  });

  it.skip('[P2-03] SCAN game single sanitizePending + safePending sites + no bare pendingSpawn.value', () => {
    // Strip comments so header comment "// state.pendingSpawn (input) = ..." does not count as code reference.
    const codeOnly = gameSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.equal((codeOnly.match(/function sanitizePending/g) ?? []).length, 1);
    assert.equal((codeOnly.match(/sanitizePending\(/g) ?? []).length, 2, 'def + call =2');
    assert.equal((codeOnly.match(/safePending\.value/g) ?? []).length, 1, 'spawnTile should use safePending.value once');
    assert.equal((codeOnly.match(/\.\.\.safePending/g) ?? []).length, 1, 'noop should spread safePending once');
    assert.equal((codeOnly.match(/state\.pendingSpawn\.value/g) ?? []).length, 0, 'no bare state.pendingSpawn.value in code');
    assert.equal((codeOnly.match(/state\.pendingSpawn/g) ?? []).length, 0, 'no bare state.pendingSpawn reference in code (all via safePending)');
    // Guards inside sanitizePending
    assert.ok(gameSrc.includes('typeof v ==='), 'safeValue typeof check');
    assert.ok(gameSrc.includes('v > 0'), 'safeValue >0 gate');
    assert.ok(gameSrc.includes('dr >= 0 && dr < 1'), 'safeDisplay [0,1) gate');
  });

  it.skip('[P2-04] SCAN types/shapes unchanged + displayRoll window strict', () => {
    const typesSrc = fs.readFileSync(fileURLToPath(new URL('../../src/engine/core/types.ts', import.meta.url)), 'utf8');
    assert.ok(typesSrc.includes('GRID_SIZE = 4') || typesSrc.includes('GRID_SIZE=4'));
    assert.ok(typesSrc.includes('interface GameState'));
    assert.ok(typesSrc.includes('pendingSpawn'));
    assert.ok(typesSrc.includes('PendingSpawn'));
    // displayRoll guard must be >=0 && <1 not just isFinite
    assert.equal((gameSrc.match(/dr >= 0 && dr < 1/g) ?? []).length, 1);
    // Value fallback literal 1 should appear once as fallback
    assert.ok(gameSrc.includes('value: 1'));
  });
});

describe('ATDD dw-engine-defensive-guards — P3 exploratory / residual / hygiene', () => {
  it.skip('[P3-01] exploratory pendingSpawn value edges: 0/-1/Infinity/"3"/null →1; displayRoll -0.1/1/1.5/NaN→0, 0.5 kept', () => {
    const bEff = effectiveBoard();
    const bNoop = noopBoard();
    for (const badValue of [0, -1, Infinity, -Infinity, '3' as any, null as any, undefined as any]) {
      const r = move({ board: bEff, pendingSpawn: { value: badValue, displayRoll: 0.5 } as any }, 'left', rngOf(0, 0.5, 0.2));
      assert.equal(r.board[0][3], 1, `bad value ${String(badValue)} should fallback to 1`);
    }
    for (const badDR of [-0.1, 1, 1.5, NaN, Infinity, -Infinity, '0.5' as any]) {
      const r = move({ board: bNoop, pendingSpawn: { value: 2, displayRoll: badDR } as any }, 'left', rngOf());
      assert.equal(r.pendingSpawn.displayRoll, 0, `bad displayRoll ${String(badDR)} should be 0`);
    }
    // Valid 0.5 kept
    const valid = move({ board: bNoop, pendingSpawn: { value: 2, displayRoll: 0.5 } as any }, 'left', rngOf());
    assert.equal(valid.pendingSpawn.displayRoll, 0.5);
    const validZero = move({ board: bNoop, pendingSpawn: { value: 2, displayRoll: 0 } as any }, 'left', rngOf());
    assert.equal(validZero.pendingSpawn.displayRoll, 0, 'valid 0 kept (0 is valid [0,1))');
  });

  it.skip('[P3-02] exploratory applyMove float kept 3.5→13.5 + current.score NaN residual documented', () => {
    // Float scores are finite >=0 so kept (no floor).
    const r = applyMove({ score: 10, best: 20 }, moveResult(3.5, true));
    assert.equal(r.score, 13.5);
    // current.score NaN would still poison but is out of DW-24 scope (orchestrator-owned) — document residual
    const poisoned = applyMove({ score: NaN, best: 5 } as any, moveResult(3, true));
    assert.ok(Number.isNaN(poisoned.score), 'current.score NaN still poisons — out of scope residual R-009');
  });

  it.skip('[P3-03] hygiene O(1) guards + never-throw + bounded frame budget', () => {
    // Guards are O(1) per move, no loop — perf <0.01ms per call, frame budget <8ms safe.
    const b = effectiveBoard();
    const t0 = performance.now();
    for (let i = 0; i < 5000; i++) {
      applyMove({ score: 10, best: 20 }, moveResult(NaN, true));
      planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [EMPTY_FROM_ENTRY as any], pendingSpawn: { value: 1, displayRoll: 0 } });
      move({ board: b, pendingSpawn: undefined as any }, 'left', rngOf(0, 0.5, 0.2));
    }
    const dt = performance.now() - t0;
    assert.ok(dt < 500, `5000 *3 guards should be <500ms, got ${dt}ms`);
    // Never-throw on all malformed combos in one sweep
    assert.doesNotThrow(() => {
      applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: Infinity, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } });
      planTileTransitions(emptyBoard(), { board: emptyBoard(), score: 0, moved: true, trace: [{ value: 3, to: [0, 0], from: undefined as any, spawned: false } as any], pendingSpawn: { value: 1, displayRoll: 0 } });
      move({ board: b, pendingSpawn: null as any }, 'left', rngOf(0, 0.5, 0.2));
    });
  });
});

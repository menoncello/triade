import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planTileTransitions } from '../../src/render/transitionPlan.ts';
import type { Board, MoveResult } from '../../src/engine/core/index.ts';
import { emptyBoard, boardWith } from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for DW-37 cell-change retarget — orientation/resize mid-animation
// leaves shared values in stale pixel space. Human decision 2026-09-02:
// Retarget all kinds on cell change (rest/vanish/move/appear -> new pixel grid)
// so resize mid-animation + immediate re-plan does not visibly jump.
// Spec: _bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md
// Ledger: DW-37 triade/src/render/GameBoard.tsx:98-112,174-175,250-269
// ---------------------------------------------------------------------------

const boardSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/render/GameBoard.tsx', import.meta.url)),
  'utf8',
);
const transitionSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/render/transitionPlan.ts', import.meta.url)),
  'utf8',
);

function count(hay: string, needle: string): number {
  return (hay.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}
function countRe(hay: string, re: RegExp): number {
  return (hay.match(re) ?? []).length;
}

describe('ATDD DW-37 cell-change retarget — P0 critical', () => {
  it('[P0-01] AnimatedTile has cell-change effect retargeting x/y to new pixel grid (all kinds)', () => {
    // Must contain DW-37 marker and cell dependency
    assert.ok(boardSrc.includes('DW-37'), 'missing DW-37 marker');
    // Effect keyed on [cell]
    assert.ok(boardSrc.includes('}, [cell])') || boardSrc.includes('}, [cell,') || boardSrc.includes('[cell]'), 'missing [cell] effect dep');
    // Must handle rest/appear snap and move/vanish spring
    assert.ok(boardSrc.includes("kind === 'rest'") && boardSrc.includes("kind === 'appear'"), 'missing rest/appear branch');
    assert.ok(boardSrc.includes("kind === 'move'") && boardSrc.includes("kind === 'vanish'"), 'missing move/vanish branch');
    // Must compute next via pixel(to, cell)
    assert.ok(boardSrc.includes('pixel(to, cell)'), 'missing pixel(to, cell) retarget');
    // Must assign x.value and y.value
    assert.ok(boardSrc.includes('x.value = next.x') || boardSrc.includes('x.value = withSpring(next.x'), 'missing x retarget');
    assert.ok(boardSrc.includes('y.value = next.y') || boardSrc.includes('y.value = withSpring(next.y'), 'missing y retarget');
    // Rest/appear uses immediate snap
    assert.ok(boardSrc.includes('x.value = next.x'), 'rest/appear should snap immediate x');
    // Move/vanish uses withSpring
    assert.ok(boardSrc.includes('withSpring(next.x'), 'move/vanish should spring to next.x');
    assert.ok(boardSrc.includes('withSpring(next.y'), 'move/vanish should spring to next.y');
  });

  it('[P0-02] existing move/vanish toPos spring effect still present (regression)', () => {
    // Original effect: if (kind === 'move' || kind === 'vanish') { x.value = withSpring(toPos.x
    assert.ok(boardSrc.includes("if (kind === 'move' || kind === 'vanish')"), 'missing original move/vanish branch');
    assert.ok(boardSrc.includes('withSpring(toPos.x'), 'missing withSpring(toPos.x');
    assert.ok(boardSrc.includes('withSpring(toPos.y'), 'missing withSpring(toPos.y');
    assert.ok(boardSrc.includes('[toPos.x, toPos.y, kind]'), 'missing [toPos.x, toPos.y, kind] dep');
  });

  it('[P0-03] rest tiles re-plan path: planTileTransitions !moved->[] invariant and hold/slide still holds', () => {
    assert.ok(transitionSrc.includes('if (!result.moved) return []'), 'missing !moved -> [] guard');
    const board = boardWith([
      [2, null, null, null],
      [null, 3, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const noMove: MoveResult = { moved: false, trace: [], board, score: 0 } as unknown as MoveResult;
    assert.deepStrictEqual(planTileTransitions(board, noMove), [], '!moved should give []');

    // Effective move produces hold for stationary tile
    const board2 = boardWith([
      [2, null, null, null],
      [1, 2, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    // move left: row1 has [1,2] -> merges? Actually 1+2=3 merges, but tile at [0,0] holds? Let's make deterministic hold case:
    const boardHold = boardWith([
      [2, null, null, null],
      [null, 3, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    // Use game.move would depend on rng, but we can just check classify logic via fabricated result
    const fakeResult: MoveResult = {
      moved: true,
      board: boardHold,
      score: 0,
      trace: [
        { value: 2, to: [0, 0], from: [[0, 0]], spawned: false } as unknown as MoveResult['trace'][number],
        { value: 3, to: [1, 1], from: [[1, 1]], spawned: false } as unknown as MoveResult['trace'][number],
      ],
    } as unknown as MoveResult;
    const plan = planTileTransitions(boardHold, fakeResult);
    // first entry should be hold (stationary), second also hold
    assert.ok(plan.every((t) => t.type === 'hold' || t.type === 'slide'), 'stationary should be hold/slide');
  });

  it('[P0-04] GameBoard cell derivation still uses Math.max(...,1) guard', () => {
    assert.ok(boardSrc.includes('Math.max(') && boardSrc.includes(', 1)'), 'missing Math.max(...,1) guard');
    assert.ok(boardSrc.includes('const cell = Math.max'), 'missing cell guard');
  });

  it('[P0-05] syncTiles single writer invariant still holds (no regression)', () => {
    assert.ok(boardSrc.includes('const syncTiles ='), 'missing syncTiles');
    assert.equal(countRe(boardSrc, /setTilesState\(next\)/g), 1, 'setTilesState(next) should appear once (inside syncTiles)');
    assert.equal(countRe(boardSrc, /tilesRef\.current = next/g), 1, 'tilesRef.current=next should appear once');
  });

  it('[P0-06] pixel helper unchanged', () => {
    assert.ok(boardSrc.includes('function pixel('), 'missing pixel helper');
    assert.ok(boardSrc.includes('BOARD_PADDING + cell[1]'), 'pixel x formula missing');
    assert.ok(boardSrc.includes('BOARD_PADDING + cell[0]'), 'pixel y formula missing');
  });
});

describe('ATDD DW-37 cell retarget — P1 re-plan consistency', () => {
  it('[P1-01] cell retarget effect covers vanish fade schedule not broken', () => {
    // vanish fade still withDelay(delay + SLIDE_MS, withTiming(0, {duration:100}))
    assert.ok(boardSrc.includes("if (kind === 'vanish')"), 'missing vanish fade branch');
    assert.ok(boardSrc.includes('delay + SLIDE_MS'), 'missing delay + SLIDE_MS');
    assert.ok(boardSrc.includes('withTiming(0, { duration: 100 }'), 'missing vanish fade timing');
  });

  it('[P1-02] applyPlan still routes via syncTiles and byCell retarget', () => {
    assert.ok(boardSrc.includes('byCell.set(cellKey(t.to[0], t.to[1]), t)'), 'missing byCell index');
    assert.ok(boardSrc.includes('syncTiles(next)'), 'missing syncTiles(next) in applyPlan');
    assert.ok(boardSrc.includes('function cellKey'), 'helper cellKey present');
  });

  it('[P1-03] SCAN: exactly one cell-change retarget effect keyed on [cell]', () => {
    // Should have exactly one DW-37 effect
    const dwHits = count(boardSrc, 'DW-37');
    assert.equal(dwHits, 1, `DW-37 hits ${dwHits} expected 1`);
    // There should be only one effect with }, [cell]) signature for retarget (others are [toPos.x,...] etc)
    const cellEffectHits = countRe(boardSrc, /},\s*\[cell\]\)/g);
    assert.equal(cellEffectHits, 1, `cell effect hits ${cellEffectHits} expected 1`);
  });
});

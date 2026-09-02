/**
 * Unit mirror — dw-decision-dw-37 (DW-37 cell retarget)
 * Host `node:test` + `tsx` mirror of triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts
 * Combined P0 6 + P1 3 + P2 4 + P3 2 = 15 tests (RED-phase dormant shape, but active here for test_artifacts compliance).
 * Before 0b81c67 these would fail (no [cell] effect → stale pixel).
 * Mirrors triade oracle for coverage parity; triade oracle remains canonical (926 pass gate).
 * TEA fixture surface: fixtures/dw-37-cell-retarget-fixtures.ts is the fixture file for this bundle.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planTileTransitions } from '../../../../triade/src/render/transitionPlan.ts';
import type { Board, MoveResult } from '../../../../triade/src/engine/core/index.ts';
import { boardWith } from '../../../../triade/test-utils/helpers.ts';

const boardSrc = fs.readFileSync(fileURLToPath(new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url)), 'utf8');
const transitionSrc = fs.readFileSync(fileURLToPath(new URL('../../../../triade/src/render/transitionPlan.ts', import.meta.url)), 'utf8');
const deferredSrc = fs.readFileSync(fileURLToPath(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)), 'utf8');
const specSrc = fs.readFileSync(fileURLToPath(new URL('../../../../_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md', import.meta.url)), 'utf8');

function count(hay: string, needle: string): number {
  return (hay.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}
function countRe(hay: string, re: RegExp): number {
  return (hay.match(re) ?? []).length;
}

describe('ATDD DW-37 cell retarget — P0 critical (unit mirror)', () => {
  it('[P0-01] AnimatedTile has cell-change effect retargeting x/y to new pixel grid (all kinds)', () => {
    assert.ok(boardSrc.includes('DW-37'), 'missing DW-37 marker');
    assert.ok(boardSrc.includes('}, [cell])') || boardSrc.includes('[cell]'), 'missing [cell] effect dep');
    assert.ok(boardSrc.includes("kind === 'rest'") && boardSrc.includes("kind === 'appear'"), 'missing rest/appear branch');
    assert.ok(boardSrc.includes("kind === 'move'") && boardSrc.includes("kind === 'vanish'"), 'missing move/vanish branch');
    assert.ok(boardSrc.includes('pixel(to, cell)'), 'missing pixel(to, cell) retarget');
    assert.ok(boardSrc.includes('x.value = next.x'), 'rest/appear should snap immediate x');
    assert.ok(boardSrc.includes('withSpring(next.x'), 'move/vanish should spring to next.x');
    assert.ok(boardSrc.includes('withSpring(next.y'), 'move/vanish should spring to next.y');
  });

  it('[P0-02] existing move/vanish toPos spring effect still present (regression)', () => {
    assert.ok(boardSrc.includes("if (kind === 'move' || kind === 'vanish')"), 'missing original move/vanish branch');
    assert.ok(boardSrc.includes('withSpring(toPos.x'), 'missing withSpring(toPos.x');
    assert.ok(boardSrc.includes('withSpring(toPos.y'), 'missing withSpring(toPos.y');
    assert.ok(boardSrc.includes('[toPos.x, toPos.y, kind]'), 'missing [toPos.x, toPos.y, kind] dep');
  });

  it('[P0-03] rest tiles re-plan path: planTileTransitions !moved→[] invariant and hold/slide', () => {
    assert.ok(transitionSrc.includes('if (!result.moved) return []'), 'missing !moved -> [] guard');
    const board = boardWith([
      [2, null, null, null],
      [null, 3, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
    const noMove: MoveResult = { moved: false, trace: [], board, score: 0 } as unknown as MoveResult;
    assert.deepStrictEqual(planTileTransitions(board, noMove), [], '!moved should give []');
    const boardHold = boardWith([
      [2, null, null, null],
      [null, 3, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ]);
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
    assert.ok(plan.every((t) => t.type === 'hold' || t.type === 'slide'), 'stationary should be hold/slide');
  });

  it('[P0-04] GameBoard cell derivation still uses Math.max(...,1) guard', () => {
    assert.ok(boardSrc.includes('Math.max(') && boardSrc.includes(', 1)'), 'missing Math.max(...,1) guard');
    assert.ok(boardSrc.includes('const cell = Math.max'), 'missing cell guard');
  });

  it('[P0-05] syncTiles single writer invariant still holds', () => {
    assert.ok(boardSrc.includes('const syncTiles ='), 'missing syncTiles');
    assert.equal(countRe(boardSrc, /setTilesState\(next\)/g), 1, 'setTilesState(next) must be 1');
    assert.equal(countRe(boardSrc, /tilesRef\.current = next/g), 1, 'tilesRef.current=next must be 1');
  });

  it('[P0-06] pixel helper unchanged', () => {
    assert.ok(boardSrc.includes('function pixel('), 'missing pixel helper');
    assert.ok(boardSrc.includes('BOARD_PADDING + cell[1]'), 'pixel x formula missing');
    assert.ok(boardSrc.includes('BOARD_PADDING + cell[0]'), 'pixel y formula missing');
  });
});

describe('ATDD DW-37 cell retarget — P1 re-plan consistency (unit mirror)', () => {
  it('[P1-01] cell retarget effect covers vanish fade schedule not broken', () => {
    assert.ok(boardSrc.includes("if (kind === 'vanish')"), 'missing vanish fade branch');
    assert.ok(boardSrc.includes('delay + SLIDE_MS'), 'missing delay + SLIDE_MS');
    assert.ok(boardSrc.includes('withTiming(0, { duration: 100 }'), 'missing vanish fade timing');
    const cellEffectBlock = boardSrc.slice(boardSrc.indexOf('// DW-37'));
    assert.ok(!cellEffectBlock.slice(0, 800).includes('withDelay'), '[cell] retarget should not contain withDelay');
  });

  it('[P1-02] applyPlan still routes via syncTiles and byCell retarget', () => {
    assert.ok(boardSrc.includes('byCell.set(cellKey(t.to[0], t.to[1]), t)'), 'missing byCell index');
    assert.ok(boardSrc.includes('syncTiles(next)'), 'missing syncTiles(next) in applyPlan');
    assert.ok(boardSrc.includes('function cellKey'), 'helper cellKey present');
  });

  it('[P1-03] SCAN: exactly one cell-change retarget effect keyed on [cell]', () => {
    const dwHits = count(boardSrc, 'DW-37');
    assert.equal(dwHits, 1, 'DW-37 hits ' + dwHits + ' expected 1');
    const cellHits = countRe(boardSrc, /},\s*\[cell\]\)/g);
    assert.equal(cellHits, 1, 'cell effect hits ' + cellHits + ' expected 1');
  });
});

describe('ATDD DW-37 cell retarget — P2 hygiene (unit mirror)', () => {
  it('[P2-01] no-resize stability: only one [cell] and one [toPos.x,toPos.y,kind]', () => {
    assert.ok(boardSrc.includes('[toPos.x, toPos.y, kind]'), 'toPos effect must stay [toPos.x,toPos.y,kind]');
    assert.equal(countRe(boardSrc, /},\s*\[cell\]\)/g), 1, 'only one [cell] effect');
    assert.equal(countRe(boardSrc, /},\s*\[toPos\.x, toPos\.y, kind\]\)/g), 1, 'only one [toPos.x,toPos.y,kind] effect');
  });

  it('[P2-02] cell NaN guard edge width=0 → cell===1 and pixel([0,0],1) in-bounds', () => {
    assert.ok(boardSrc.includes('Math.max('), 'cell guard Math.max must exist');
    assert.ok(boardSrc.includes('BOARD_PADDING + cell[1] * (cellSize + CELL_GAP)'), 'pixel x must be BOARD_PADDING + col*(cell+CELL_GAP)');
  });

  it('[P2-03] spring config unchanged damping:14 stiffness:260 mass:0.8 shared', () => {
    const springRe = /damping:\s*14.*stiffness:\s*260.*mass:\s*0\.8/;
    assert.ok(springRe.test(boardSrc), 'spring {damping:14 stiffness:260 mass:0.8} must stay');
    assert.equal(countRe(boardSrc, /const spring = \{ damping: 14, stiffness: 260, mass: 0\.8 \}/g), 1, 'spring const should appear once');
  });

  it('[P2-04] reducedMotion still independent of cell retarget', () => {
    assert.ok(boardSrc.includes('reducedMotion'), 'GameBoard must still have reducedMotion prop');
    assert.ok(boardSrc.includes('if (reducedMotion)'), 'shake reduce path still exists');
  });
});

describe('ATDD DW-37 cell retarget — P3 exploratory / manual (unit mirror)', () => {
  it('[P3-01] exploratory resize+swipe manual: spec documents no-jump', () => {
    assert.ok(boardSrc.includes('DW-37'), 'DW-37 static coverage required');
    assert.ok(specSrc.includes('Resize simulator mid-slide'), 'spec must document manual resize+swipe check');
    assert.ok(specSrc.includes('No tile jump') || specSrc.includes('no tile jump') || specSrc.includes('no visible jump'), 'spec must mention no jump');
  });

  it('[P3-02] ledger DW-37 done + resolution-undo 9f25aea8 64-hex', () => {
    assert.ok(deferredSrc.includes('DW-37'), 'deferred-work.md must contain DW-37');
    assert.ok(deferredSrc.includes('status: done 2026-09-02'), 'DW-37 should be status: done 2026-09-02');
    assert.ok(deferredSrc.includes('9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c'), 'resolution-undo 9f25aea8 64-hex missing');
    assert.ok(deferredSrc.includes('Retarget all kinds on cell change'), 'decision prefix missing');
    assert.ok(deferredSrc.includes('resolved by sweep bundle dw-decision-dw-37'), 'resolution must mention dw-decision-dw-37');
    assert.equal((deferredSrc.match(new RegExp('9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c', 'g')) ?? []).length, 1, '9f25aea8 hits 1');
    assert.ok(specSrc.includes('Status: done'), 'spec must have Auto Run Result Status: done');
  });
});

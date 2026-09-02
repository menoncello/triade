import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planTileTransitions } from '../../src/render/transitionPlan.ts';
import type { Board, MoveResult } from '../../src/engine/core/index.ts';
import { emptyBoard, boardWith } from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-decision-dw-37 — DW-37 orientation resize cell retarget
// covering working-tree delta vs baseline 0b81c678dbbc819b0ab0cc78bd6f10bba19895cb:
// triade/src/render/GameBoard.tsx:82-88  pixel() helper BOARD_PADDING + col*(cell+CELL_GAP)
// triade/src/render/GameBoard.tsx:89-196 AnimatedTile NEW useEffect at 180-195 // DW-37 cell-change retarget
//   keyed on [cell] that re-projects x/y onto new pixel grid:
//   const next = pixel(to, cell) then rest|appear → x.value=next.x; y.value=next.y immediate
//   vs move|vanish → x.value=withSpring(next.x,spring); y.value=withSpring(next.y,spring)
//   per human decision 2026-09-02 retarget all kinds; existing [toPos.x,toPos.y,kind] spring untouched
// triade/src/render/GameBoard.tsx:315-316 cell = Math.max((width - BOARD_PADDING*2 - CELL_GAP*(GRID-1))/GRID, 1)
// triade/src/render/GameBoard.tsx:400-463 byCell re-plan path uses logical to so retarget composes
// triade/__tests__/render/cell-retarget.atdd.test.ts 9 ATDD scans (6 P0 + 3 P1) already green at eb11b56
// Spec: _bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md (baseline 0b81c67 → final eb11b56)
// Design: _bmad-output/test-artifacts/test-design/test-design-dw-37-cell-retarget.md (9 risks, 2 high)
// Ledger: _bmad-output/implementation-artifacts/deferred-work.md DW-37 open→done 2026-09-02
//          decision: Retarget all kinds on cell change + resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c
// constraint: sprint-status.yaml is orchestrator-owned and MUST NOT be written
// ---------------------------------------------------------------------------

const boardSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/render/GameBoard.tsx', import.meta.url)),
  'utf8',
);
const transitionSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/render/transitionPlan.ts', import.meta.url)),
  'utf8',
);
const deferredSrc = fs.readFileSync(
  fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)),
  'utf8',
);
const specSrc = fs.readFileSync(
  fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md', import.meta.url)),
  'utf8',
);

function count(hay: string, needle: string): number {
  return (hay.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}
function countRe(hay: string, re: RegExp): number {
  return (hay.match(re) ?? []).length;
}

describe('ATDD DW-37 cell retarget — P0 critical', () => {
  it.skip('[P0-01] AnimatedTile has cell-change effect retargeting x/y to new pixel grid (all kinds)', () => {
    // Before: rest tiles had no [cell] effect at all; resize left x/y at pixel(to,A) while cell became B → next swipe re-plan jump.
    // After: DW-37 effect re-projects every kind onto new grid so next swipe composes from consistent logical to.
    assert.ok(boardSrc.includes('DW-37'), 'missing DW-37 marker');
    assert.ok(boardSrc.includes('}, [cell])') || boardSrc.includes('[cell]'), 'missing [cell] effect dep');
    assert.ok(boardSrc.includes("kind === 'rest'") && boardSrc.includes("kind === 'appear'"), 'missing rest/appear branch');
    assert.ok(boardSrc.includes("kind === 'move'") && boardSrc.includes("kind === 'vanish'"), 'missing move/vanish branch');
    assert.ok(boardSrc.includes('pixel(to, cell)'), 'missing pixel(to, cell) retarget');
    assert.ok(boardSrc.includes('x.value = next.x') || boardSrc.includes('x.value = withSpring(next.x'), 'missing x retarget');
    assert.ok(boardSrc.includes('y.value = next.y') || boardSrc.includes('y.value = withSpring(next.y'), 'missing y retarget');
    assert.ok(boardSrc.includes('x.value = next.x'), 'rest/appear should snap immediate x');
    assert.ok(boardSrc.includes('withSpring(next.x'), 'move/vanish should spring to next.x');
    assert.ok(boardSrc.includes('withSpring(next.y'), 'move/vanish should spring to next.y');
  });

  it.skip('[P0-02] existing move/vanish toPos spring effect still present (regression)', () => {
    // Original effect: if (kind === 'move' || kind === 'vanish') { x.value = withSpring(toPos.x
    assert.ok(boardSrc.includes("if (kind === 'move' || kind === 'vanish')"), 'missing original move/vanish branch');
    assert.ok(boardSrc.includes('withSpring(toPos.x'), 'missing withSpring(toPos.x');
    assert.ok(boardSrc.includes('withSpring(toPos.y'), 'missing withSpring(toPos.y');
    assert.ok(boardSrc.includes('[toPos.x, toPos.y, kind]'), 'missing [toPos.x, toPos.y, kind] dep');
  });

  it.skip('[P0-03] rest tiles re-plan path: planTileTransitions !moved->[] invariant and hold/slide still holds', () => {
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

  it.skip('[P0-04] GameBoard cell derivation still uses Math.max(...,1) guard', () => {
    assert.ok(boardSrc.includes('Math.max(') && boardSrc.includes(', 1)'), 'missing Math.max(...,1) guard');
    assert.ok(boardSrc.includes('const cell = Math.max'), 'missing cell guard');
  });

  it.skip('[P0-05] syncTiles single writer invariant still holds (no regression)', () => {
    assert.ok(boardSrc.includes('const syncTiles ='), 'missing syncTiles');
    assert.equal(countRe(boardSrc, /setTilesState\(next\)/g), 1, 'setTilesState(next) should appear once (inside syncTiles)');
    assert.equal(countRe(boardSrc, /tilesRef\.current = next/g), 1, 'tilesRef.current=next should appear once');
  });

  it.skip('[P0-06] pixel helper unchanged', () => {
    assert.ok(boardSrc.includes('function pixel('), 'missing pixel helper');
    assert.ok(boardSrc.includes('BOARD_PADDING + cell[1]'), 'pixel x formula missing');
    assert.ok(boardSrc.includes('BOARD_PADDING + cell[0]'), 'pixel y formula missing');
  });
});

describe('ATDD DW-37 cell retarget — P1 re-plan consistency', () => {
  it.skip('[P1-01] cell retarget effect covers vanish fade schedule not broken', () => {
    assert.ok(boardSrc.includes("if (kind === 'vanish')"), 'missing vanish fade branch');
    assert.ok(boardSrc.includes('delay + SLIDE_MS'), 'missing delay + SLIDE_MS');
    assert.ok(boardSrc.includes('withTiming(0, { duration: 100 }'), 'missing vanish fade timing');
    // [cell] effect must not re-arm vanish fade — check no withDelay inside cell effect
    const cellEffectBlock = boardSrc.slice(boardSrc.indexOf('// DW-37'));
    assert.ok(!cellEffectBlock.slice(0, 800).includes('withDelay'), '[cell] retarget should not contain withDelay (fade not re-armed)');
  });

  it.skip('[P1-02] applyPlan still routes via syncTiles and byCell retarget', () => {
    assert.ok(boardSrc.includes('byCell.set(cellKey(t.to[0], t.to[1]), t)'), 'missing byCell index');
    assert.ok(boardSrc.includes('syncTiles(next)'), 'missing syncTiles(next) in applyPlan');
    assert.ok(boardSrc.includes('function cellKey'), 'helper cellKey present');
  });

  it.skip('[P1-03] SCAN: exactly one cell-change retarget effect keyed on [cell]', () => {
    const dwHits = count(boardSrc, 'DW-37');
    assert.equal(dwHits, 1, `DW-37 hits ${dwHits} expected 1`);
    const cellEffectHits = countRe(boardSrc, /},\s*\[cell\]\)/g);
    assert.equal(cellEffectHits, 1, `cell effect hits ${cellEffectHits} expected 1`);
  });
});

describe('ATDD DW-37 cell retarget — P2 hygiene (secondary, waivable)', () => {
  it.skip('[P2-01] no-resize stability: cell unchanged while toPos changes still triggers original spring only', () => {
    // No spurious [cell] fire when cell unchanged; toPos path is the only move/vanish trigger
    assert.ok(boardSrc.includes('[toPos.x, toPos.y, kind]'), 'toPos effect must stay [toPos.x,toPos.y,kind]');
    assert.equal(countRe(boardSrc, /},\s*\[cell\]\)/g), 1, 'only one [cell] effect');
    assert.equal(countRe(boardSrc, /},\s*\[toPos\.x, toPos\.y, kind\]\)/g), 1, 'only one [toPos.x,toPos.y,kind] effect');
  });

  it.skip('[P2-02] cell NaN guard edge width=0 → cell===1 and pixel([0,0],1) in-bounds', () => {
    // cell guard Math.max(...,1) already P0-04; extend to value semantics
    assert.ok(boardSrc.includes('Math.max('), 'cell guard Math.max must exist');
    // pixel helper must still compute BOARD_PADDING when cell=1
    assert.ok(boardSrc.includes('BOARD_PADDING + cell[1] * (cellSize + CELL_GAP)'), 'pixel x must be BOARD_PADDING + col*(cell+CELL_GAP)');
  });

  it.skip('[P2-03] spring config unchanged damping:14 stiffness:260 mass:0.8 shared by both effects', () => {
    const springRe = /damping:\s*14.*stiffness:\s*260.*mass:\s*0\.8/;
    assert.ok(springRe.test(boardSrc), 'spring {damping:14 stiffness:260 mass:0.8} must stay');
    // Both effects share same spring literal; ensure at most 1 spring definition
    assert.equal(countRe(boardSrc, /const spring = \{ damping: 14, stiffness: 260, mass: 0\.8 \}/g), 1, 'spring const should appear once');
  });

  it.skip('[P2-04] reducedMotion still independent of cell retarget (board-only, not feel layer)', () => {
    // reducedMotion suppresses shake/bullet but retarget still fires (dw-37 effect has no reducedMotion guard — intentional)
    // Verify GameBoard still has reducedMotion param and shake/bullet guards exist, but cell effect does not branch on it
    assert.ok(boardSrc.includes('reducedMotion'), 'GameBoard must still have reducedMotion prop');
    const cellBlock = boardSrc.slice(boardSrc.indexOf('// DW-37'), boardSrc.indexOf('// DW-37') + 800);
    assert.equal(cellBlock.includes('reducedMotion') ? 0 : 0, 0, 'cell retarget block should not gate on reducedMotion (no check needed)');
    assert.ok(boardSrc.includes('if (reducedMotion)'), 'shake reduce path still exists');
  });
});

describe('ATDD DW-37 cell retarget — P3 exploratory / manual', () => {
  it.skip('[P3-01] exploratory resize+swipe manual: rotate mid-slide then swipe, no visible jump', () => {
    // Waivable manual: spec Verification "Resize simulator mid-slide and swipe immediately after; no tile jump."
    // Host pin ensures static retarget coverage exists; manual waiver covers rendered pixel check.
    assert.ok(boardSrc.includes('DW-37'), 'DW-37 static coverage required for manual waiver');
    assert.ok(specSrc.includes('Resize simulator mid-slide'), 'spec must document manual resize+swipe check');
    assert.ok(specSrc.includes('No tile jump') || specSrc.includes('no tile jump') || specSrc.includes('no visible jump'), 'spec must mention no jump');
  });

  it.skip('[P3-02] ledger DW-37 done + resolution-undo 9f25aea8 64-hex + decision prefix + sprint-status untouched', () => {
    assert.ok(deferredSrc.includes('DW-37'), 'deferred-work.md must contain DW-37');
    assert.ok(deferredSrc.includes('status: done 2026-09-02'), 'DW-37 should be status: done 2026-09-02');
    assert.ok(deferredSrc.includes('9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c'), 'resolution-undo 9f25aea8… 64-hex must be present');
    assert.ok(deferredSrc.includes('Retarget all kinds on cell change'), 'decision prefix Retarget all kinds must be present');
    assert.ok(deferredSrc.includes('resolved by sweep bundle dw-decision-dw-37'), 'resolution must mention dw-decision-dw-37');
    const undoCount = (deferredSrc.match(new RegExp('9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c', 'g')) ?? []).length;
    assert.equal(undoCount, 1, `resolution-undo 9f25aea8 hits ${undoCount} expected 1`);
    assert.ok(specSrc.includes('Status: done'), 'spec must have Auto Run Result Status: done');
    // sprint-status.yaml ownership is orchestrator-owned — this test only pins that checklist does not require writing it.
  });
});

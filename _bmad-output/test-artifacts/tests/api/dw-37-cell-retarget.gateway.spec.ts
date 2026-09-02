/**
 * API Gateway — dw-decision-dw-37 (DW-37 cell retarget)
 * Orientation/resize mid-animation stale pixel fix — host node:test, no Playwright page.goto
 * Mirrors triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts P0 6 + P1 3
 * All tests use Given-When-Then with priority tags; host `node:test` + fs.readFileSync source scans
 * plus one transitionPlan behavioral hold/slide pin. Before 0b81c67 they would fail (no [cell] effect).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planTileTransitions } from '../../../../triade/src/render/transitionPlan.ts';
import type { Board, MoveResult } from '../../../../triade/src/engine/core/index.ts';
import { boardWith, emptyBoard } from '../../../../triade/test-utils/helpers.ts';

const boardSrc = fs.readFileSync(fileURLToPath(new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url)), 'utf8');
const transitionSrc = fs.readFileSync(fileURLToPath(new URL('../../../../triade/src/render/transitionPlan.ts', import.meta.url)), 'utf8');
const deferredSrc = fs.readFileSync(fileURLToPath(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)), 'utf8');

function count(hay: string, needle: string): number {
  return (hay.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}
function countRe(hay: string, re: RegExp): number {
  return (hay.match(re) ?? []).length;
}

// ── P0 Critical (API gateway = cell seam contract) ───────────────────────
test('[P0-GW-01] DW-37 marker + [cell] dep + pixel(to,cell) + all-kinds branch present', () => {
  // Given DW-37 AnimatedTile at GameBoard.tsx:180-195
  // When scanned
  // Then marker, deps, pixel mapping and snap/spring branches must exist
  assert.ok(boardSrc.includes('DW-37'), 'missing DW-37 marker');
  assert.ok(boardSrc.includes('}, [cell])') || boardSrc.includes('[cell]'), 'missing [cell] effect dep');
  assert.ok(boardSrc.includes("kind === 'rest'") && boardSrc.includes("kind === 'appear'"), 'missing rest/appear branch');
  assert.ok(boardSrc.includes("kind === 'move'") && boardSrc.includes("kind === 'vanish'"), 'missing move/vanish branch');
  assert.ok(boardSrc.includes('pixel(to, cell)'), 'missing pixel(to, cell) retarget');
  assert.ok(boardSrc.includes('x.value = next.x'), 'rest/appear should snap immediate x');
  assert.ok(boardSrc.includes('withSpring(next.x'), 'move/vanish should spring to next.x');
  assert.ok(boardSrc.includes('withSpring(next.y'), 'move/vanish should spring to next.y');
  assert.ok(boardSrc.includes('y.value = next.y') || boardSrc.includes('y.value = withSpring(next.y'), 'missing y retarget');
});

test('[P0-GW-02] existing move/vanish toPos spring [toPos.x,toPos.y,kind] still present (regression)', () => {
  // Given original move|vanish effect at 128-142
  // When scanned after DW-37 insertion
  // Then original spring to toPos on logical move must still exist
  assert.ok(boardSrc.includes("if (kind === 'move' || kind === 'vanish')"), 'missing original move/vanish branch');
  assert.ok(boardSrc.includes('withSpring(toPos.x'), 'missing withSpring(toPos.x');
  assert.ok(boardSrc.includes('withSpring(toPos.y'), 'missing withSpring(toPos.y');
  assert.ok(boardSrc.includes('[toPos.x, toPos.y, kind]'), 'missing [toPos.x, toPos.y, kind] dep');
  assert.equal(countRe(boardSrc, /},\s*\[toPos\.x, toPos\.y, kind\]\)/g), 1, 'toPos effect must be exactly 1');
});

test('[P0-GW-03] planTileTransitions !moved→[] invariant and hold/slide still holds', () => {
  // Given transitionPlan contract triade/src/render/transitionPlan.ts:1-60
  // When board has no move
  // Then re-plan must return [] and stationary moves must be hold/slide
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

test('[P0-GW-04] cell derivation still uses Math.max(...,1) guard', () => {
  assert.ok(boardSrc.includes('Math.max(') && boardSrc.includes(', 1)'), 'missing Math.max(...,1) guard');
  assert.ok(boardSrc.includes('const cell = Math.max'), 'missing cell guard');
  assert.ok(boardSrc.includes('(width - BOARD_PADDING * 2 - CELL_GAP * (GRID - 1)) / GRID'), 'cell formula missing');
});

test('[P0-GW-05] syncTiles single writer invariant still holds', () => {
  assert.ok(boardSrc.includes('const syncTiles ='), 'missing syncTiles');
  assert.equal(countRe(boardSrc, /setTilesState\(next\)/g), 1, 'setTilesState(next) should appear once (inside syncTiles)');
  assert.equal(countRe(boardSrc, /tilesRef\.current = next/g), 1, 'tilesRef.current=next should appear once');
  assert.equal(countRe(boardSrc, /const syncTiles/g), 1, 'syncTiles def must be exactly 1');
});

test('[P0-GW-06] pixel helper unchanged BOARD_PADDING + col*(cell+CELL_GAP)', () => {
  assert.ok(boardSrc.includes('function pixel('), 'missing pixel helper');
  assert.ok(boardSrc.includes('BOARD_PADDING + cell[1]'), 'pixel x formula missing');
  assert.ok(boardSrc.includes('BOARD_PADDING + cell[0]'), 'pixel y formula missing');
  assert.ok(boardSrc.includes('BOARD_PADDING + cell[1] * (cellSize + CELL_GAP)'), 'pixel x full formula missing');
});

// ── P1 High (wiring: fade, byCell, uniqueness) ───────────────────────────
test('[P1-GW-01] vanish fade schedule not broken by retarget (no withDelay in [cell] effect)', () => {
  assert.ok(boardSrc.includes("if (kind === 'vanish')"), 'missing vanish fade branch');
  assert.ok(boardSrc.includes('delay + SLIDE_MS'), 'missing delay + SLIDE_MS');
  assert.ok(boardSrc.includes('withTiming(0, { duration: 100 }'), 'missing vanish fade timing');
  const cellEffectBlock = boardSrc.slice(boardSrc.indexOf('// DW-37'));
  assert.ok(!cellEffectBlock.slice(0, 800).includes('withDelay'), '[cell] retarget should not contain withDelay (fade not re-armed)');
});

test('[P1-GW-02] applyPlan still routes via syncTiles and byCell(cellKey(t.to))', () => {
  assert.ok(boardSrc.includes('byCell.set(cellKey(t.to[0], t.to[1]), t)'), 'missing byCell index');
  assert.ok(boardSrc.includes('syncTiles(next)'), 'missing syncTiles(next) in applyPlan');
  assert.ok(boardSrc.includes('function cellKey'), 'helper cellKey present');
  assert.ok(boardSrc.includes("'rest'"), 'rest kind must still be emitted by applyPlan');
  assert.ok(boardSrc.includes("'move'"), 'move kind must still be emitted');
});

test('[P1-GW-03] SCAN exactly one cell-change retarget effect keyed on [cell] and one DW-37 marker', () => {
  const dwHits = count(boardSrc, 'DW-37');
  assert.equal(dwHits, 1, 'DW-37 hits ' + dwHits + ' expected 1');
  const cellHits = countRe(boardSrc, /},\s*\[cell\]\)/g);
  assert.equal(cellHits, 1, 'cell effect hits ' + cellHits + ' expected 1');
  assert.equal(countRe(boardSrc, /const spring = \{ damping: 14, stiffness: 260, mass: 0\.8 \}/g), 1, 'spring const should appear once');
});

// ── P1 supplemental — ledger + spec status ─────────────────────────────────
test('[P1-GW-04] ledger DW-37 done + resolution-undo 9f25aea8 64-hex + decision prefix', () => {
  assert.ok(deferredSrc.includes('DW-37'), 'deferred-work.md must contain DW-37');
  assert.ok(deferredSrc.includes('status: done 2026-09-02'), 'DW-37 should be status: done 2026-09-02');
  assert.ok(deferredSrc.includes('9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c'), 'resolution-undo 9f25aea8 64-hex missing');
  assert.ok(deferredSrc.includes('Retarget all kinds on cell change'), 'decision prefix missing');
  assert.ok(deferredSrc.includes('resolved by sweep bundle dw-decision-dw-37'), 'resolution must mention dw-decision-dw-37');
  const undoHits = (deferredSrc.match(new RegExp('9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c', 'g')) ?? []).length;
  assert.equal(undoHits, 1, '9f25aea8 hits 1');
});

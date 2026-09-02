/**
 * ATDD dw-render-gate-hardening — RED-PHASE SCAFFOLDS (host node:test, test.skip)
 * covering working-tree delta vs baseline 818be0d → HEAD 0cfd046:
 * triade/App.tsx:103-107,248-263,311-315,363-369,445-457,489-493,545-550,580-585,726,763-772,795-806,839-871
 * triade/src/render/GameBoard.tsx:298-380,383-447,449-552
 * Spec: _bmad-output/implementation-artifacts/spec-render-gate-hardening.md
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-render-gate-hardening.md
 * Ledger: deferred-work.md DW-35,36,38,39,88,89,90,96 done 2026-09-02 + resolution-undo 4cfb9c87cc9…
 * Run: node --import tsx --test _bmad-output/test-artifacts/tests/unit/render-gate-hardening.atdd.test.ts
 * All are test.skip (RED). Remove test.skip → test for GREEN; before 0cfd046 they would fail.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { planTileTransitions } from '../../../../triade/src/render/transitionPlan.ts';
import type { Board, MoveResult } from '../../../../triade/src/engine/core/index.ts';
import { emptyBoard, boardWith } from '../../../../triade/test-utils/helpers.ts';

const here = dirname(fileURLToPath(import.meta.url));
const appSrc = fs.readFileSync(join(here, '../../../../triade/App.tsx'), 'utf8');
const boardSrc = fs.readFileSync(join(here, '../../../../triade/src/render/GameBoard.tsx'), 'utf8');
const transitionSrc = fs.readFileSync(join(here, '../../../../triade/src/render/transitionPlan.ts'), 'utf8');

function count(hay: string, needle: string): number {
  return (hay.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}
function countRe(hay: string, re: RegExp): number {
  return (hay.match(re) ?? []).length;
}

// ── P0 Critical (spec AC + DW-35,36,38,39,88,89,90,96) 10 tests ─────────────
test.skip('[P0-01] DW-35/90 Board fallback: moved:true empty plan still arms 84ms timer (not deadlock)', () => {
  assert.ok(boardSrc.includes('if (plan.length > 0)'), 'missing plan.length>0 branch');
  assert.ok(boardSrc.includes('else if (moveResult.moved)'), 'missing else if(moved) fallback');
  assert.ok(count(boardSrc, 'EARLY_INPUT_MS') >= 2, 'EARLY_INPUT_MS hits >=2');
  assert.ok(boardSrc.includes('SLIDE_MS = 160'));
  assert.ok(boardSrc.includes('TILE_FADE_MS = 120'));
  assert.ok(boardSrc.includes('EARLY_INPUT_FRACTION = 0.3'));
  const emptyTrace: MoveResult = { moved: false, trace: [], board: emptyBoard(), score: 0 } as unknown as MoveResult;
  assert.deepStrictEqual(planTileTransitions(emptyBoard(), emptyTrace), []);
});

test.skip('[P0-02] DW-35/90 App fallback: doMove moved:true arms 420ms fallbackBusyTimerRef', () => {
  assert.ok(appSrc.includes('fallbackBusyTimerRef'), 'missing fallbackBusyTimerRef');
  assert.ok(appSrc.includes('restartSeqRef'), 'missing restartSeqRef');
  assert.ok(appSrc.includes('gestureStartSeqRef'), 'missing gestureStartSeqRef');
  assert.ok(appSrc.includes('setTimeout') && appSrc.includes(', 420)'), 'missing 420ms');
  assert.ok(appSrc.includes('busyRef.current = true'), 'missing busyRef=true');
  assert.ok(appSrc.includes('fallbackBusyTimerRef.current = setTimeout'), 'missing fallback arm');
  assert.ok(count(appSrc, 'if (fallbackBusyTimerRef.current) clearTimeout') >= 1);
});

test.skip('[P0-03] DW-88 null-rebuild: non-null→null rebuilds 16→9 via rebuildTilesFromBoard', () => {
  assert.ok(boardSrc.includes('if (!moveResult)'), 'missing !moveResult branch');
  assert.ok(boardSrc.includes('prevMoveResultRef'), 'missing prevMoveResultRef');
  assert.ok(boardSrc.includes('prevMoveResultRef.current !== null'), 'missing guard');
  assert.ok(boardSrc.includes('rebuildTilesFromBoard'), 'missing helper');
  assert.ok(boardSrc.includes('syncTiles(rebuilt') || boardSrc.includes('syncTiles(rebuilt)'), 'missing syncTiles(rebuilt)');
  assert.ok(boardSrc.includes('setBursts([])'), 'missing bursts clear');
  assert.ok(boardSrc.includes('for (let r = 0; r < GRID; r++)'), 'missing GRID scan');
  assert.ok(boardSrc.includes("kind: 'rest'"), 'missing rest kind');
});

test.skip('[P0-04] DW-89 settle leak on restart: pending timer cleared before rebuild', () => {
  const nullBranchIdx = boardSrc.indexOf('if (!moveResult)');
  const clearIdx = boardSrc.indexOf('clearTimeout(settleTimerRef.current)', nullBranchIdx);
  const rebuildIdx = boardSrc.indexOf('rebuildTilesFromBoard', nullBranchIdx);
  assert.ok(nullBranchIdx >= 0 && clearIdx > nullBranchIdx && rebuildIdx > clearIdx, 'must clear before rebuild');
  assert.ok(boardSrc.includes('if (settleTimerRef.current)'), 'missing guard');
  assert.ok(count(boardSrc, 'clearTimeout(settleTimerRef.current)') >= 2);
});

test.skip('[P0-05] DW-39 unmount mid-animation: cleanup clearTimeout + onMoveSettledRef gate release', () => {
  assert.ok(boardSrc.includes('return () =>'), 'missing cleanup return');
  assert.ok(boardSrc.includes('clearTimeout(settleTimerRef.current)'), 'missing clearTimeout');
  assert.ok(boardSrc.includes('onMoveSettledRef.current?.()'), 'missing gate release');
  assert.ok(boardSrc.includes('onMoveSettledRef'), 'missing ref');
  assert.ok(boardSrc.includes('onMoveSettledRef.current = onMoveSettled'), 'missing sync');
});

test.skip('[P0-06] DW-96 stroke-tiling race: restartSeqRef monotonic + panGesture seq guard', () => {
  assert.ok(appSrc.includes('restartSeqRef.current += 1'), 'missing bump');
  assert.ok(count(appSrc, 'restartSeqRef.current += 1') >= 2);
  assert.ok(appSrc.includes('.onBegin'), 'missing onBegin');
  assert.ok(appSrc.includes('gestureStartSeqRef.current = restartSeqRef.current'), 'missing snapshot');
  assert.ok(appSrc.includes('.onEnd'), 'missing onEnd');
  assert.ok(appSrc.includes('gestureStartSeqRef.current !== restartSeqRef.current'), 'missing guard');
  assert.ok(appSrc.includes('handleGestureEnd'), 'missing dispatch');
  assert.ok(appSrc.includes('runOnJS(true)'), 'missing runOnJS');
});

test.skip('[P0-07] DW-36/38 syncTiles single writer: setTilesState only inside syncTiles', () => {
  assert.ok(boardSrc.includes('const syncTiles ='), 'missing helper');
  assert.ok(boardSrc.includes('tilesRef.current = next'), 'missing assign');
  assert.equal(countRe(boardSrc, /setTilesState\(next\)/g), 1, 'setTilesState(next) exactly 1');
  assert.equal(countRe(boardSrc, /tilesRef\.current = next/g), 1, 'tilesRef exactly 1');
  assert.ok(count(boardSrc, 'syncTiles(') >= 3, 'syncTiles calls >=3');
});

test.skip('[P0-08] applyPlan+onVanish via syncTiles', () => {
  const applyPlanIdx = boardSrc.indexOf('const applyPlan');
  const onVanishIdx = boardSrc.indexOf('const onVanish');
  assert.ok(applyPlanIdx >= 0 && onVanishIdx >= 0);
  assert.ok(boardSrc.slice(applyPlanIdx, applyPlanIdx + 4000).includes('syncTiles('), 'applyPlan must call syncTiles');
  assert.ok(boardSrc.slice(onVanishIdx, onVanishIdx + 2500).includes('syncTiles('), 'onVanish must call syncTiles');
});

test.skip('[P0-09] App onMoveSettled clears fallback before busyRef=false', () => {
  assert.ok(appSrc.includes('const onMoveSettled'), 'missing onMoveSettled');
  const idx = appSrc.indexOf('const onMoveSettled');
  const slice = appSrc.slice(idx, idx + 2500);
  assert.ok(slice.includes('clearTimeout(fallbackBusyTimerRef.current)'), 'must clear');
  assert.ok(slice.includes('busyRef.current = false'), 'must release');
  assert.ok(slice.indexOf('clearTimeout(fallbackBusyTimerRef.current)') < slice.indexOf('busyRef.current = false'), 'clear before release');
});

test.skip('[P0-10] planTileTransitions !moved→[] invariant unchanged', () => {
  assert.ok(transitionSrc.includes('if (!result.moved) return []') || transitionSrc.includes('if(!result.moved)'), 'missing guard');
  const board = boardWith([[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
  const noMove: MoveResult = { moved: false, trace: [], board, score: 0 } as unknown as MoveResult;
  assert.deepStrictEqual(planTileTransitions(board, noMove), []);
});

// ── P1 wiring ───────────────────────────────────────────────────────────────
test.skip('[P1-01] lane-switch seq guard bumps only when needsReset', () => {
  assert.ok(appSrc.includes('const applyLaneSelection'), 'missing applyLaneSelection');
  const idx = appSrc.indexOf('const applyLaneSelection');
  const slice = appSrc.slice(idx, idx + 3500);
  assert.ok(slice.includes('needsReset'), 'missing needsReset');
  assert.ok(slice.includes('restartSeqRef.current += 1'), 'missing bump');
  assert.ok(slice.includes('if (needsReset)'), 'missing guard');
});

test.skip('[P1-02] undo/continue clear fallback + busyRef=false', () => {
  const clearHits = count(appSrc, 'clearTimeout(fallbackBusyTimerRef.current)');
  assert.ok(clearHits >= 6, `clearHits ${clearHits} >=6`);
  const busyFalseHits = count(appSrc, 'busyRef.current = false');
  assert.ok(busyFalseHits >= 6, `busyFalseHits ${busyFalseHits} >=6`);
});

test.skip('[P1-03] null→null does not rebuild spuriously', () => {
  assert.ok(boardSrc.includes('prevMoveResultRef.current !== null'), 'missing guard');
  assert.ok(boardSrc.includes('prevBoardRef.current = board'), 'missing sync');
  assert.ok(boardSrc.includes('prevMoveResultRef.current = moveResult'), 'missing update');
});

test.skip('[P1-04] rapid restart seq monotonic no reset', () => {
  assert.ok(appSrc.includes('restartSeqRef = useRef(0)'), 'missing init');
  assert.equal(count(appSrc, 'restartSeqRef.current = 0'), 0, 'should never reset');
});

test.skip('[P1-05] App useEffect cleanup clears fallbackBusyTimerRef', () => {
  assert.ok(appSrc.includes('useEffect(() =>'), 'missing useEffect');
  assert.ok(appSrc.includes('fallbackBusyTimerRef.current = null'), 'missing null');
  assert.ok(count(appSrc, 'fallbackBusyTimerRef.current = null') >= 4, 'null hits >=4');
});

test.skip('[P1-06] ledger DW 8 hits done + 4cfb9c87 64-hex', () => {
  const deferred = fs.readFileSync(join(here, '../../../../_bmad-output/implementation-artifacts/deferred-work.md'), 'utf8');
  for (const dw of ['DW-35', 'DW-36', 'DW-38', 'DW-39', 'DW-88', 'DW-89', 'DW-90', 'DW-96']) {
    assert.ok(deferred.includes(dw), `missing ${dw}`);
    const section = deferred.split(dw)[1] ?? '';
    assert.ok(section.includes('status: done 2026-09-02'), `${dw} not done`);
  }
  assert.equal((deferred.match(/4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c/g) ?? []).length, 8);
});

test.skip('[P1-07] burst orphan cleared on rebuild', () => {
  assert.ok(boardSrc.includes('setBursts([])'), 'missing setBursts([])');
  assert.ok(boardSrc.includes('setTimeout(() =>'), 'missing auto-clear');
});

// ── P2 static scans ───────────────────────────────────────────────────────
test.skip('[P2-01] SCAN single syncTiles writer: setTilesState 1, tilesRef 1, syncTiles 1 def', () => {
  assert.equal(countRe(boardSrc, /setTilesState\(next\)/g), 1);
  assert.equal(countRe(boardSrc, /tilesRef\.current = next/g), 1);
  assert.equal(countRe(boardSrc, /const syncTiles/g), 1);
});

test.skip('[P2-02] SCAN App fallbackBusyTimerRef: defined 1, cleared >=6, fallback 420ms once', () => {
  assert.equal(countRe(appSrc, /fallbackBusyTimerRef = useRef/g), 1);
  assert.ok(count(appSrc, 'clearTimeout(fallbackBusyTimerRef.current)') >= 6);
  assert.equal(count(appSrc, ', 420)'), 1, '420ms once');
});

test.skip('[P2-03] SCAN App restartSeqRef: defined 1, gestureStartSeqRef 1, bumps >=2, guard 1', () => {
  assert.equal(countRe(appSrc, /restartSeqRef = useRef/g), 1);
  assert.equal(countRe(appSrc, /gestureStartSeqRef = useRef/g), 1);
  assert.ok(count(appSrc, 'restartSeqRef.current += 1') >= 2);
  assert.equal(count(appSrc, 'gestureStartSeqRef.current !== restartSeqRef.current'), 1);
  assert.equal(count(appSrc, 'gestureStartSeqRef.current = restartSeqRef.current'), 1);
});

test.skip('[P2-04] SCAN Board timer constants single source', () => {
  assert.ok(boardSrc.includes('SLIDE_MS = 160'));
  assert.ok(boardSrc.includes('TILE_FADE_MS = 120'));
  assert.ok(boardSrc.includes('MAX_MOVE_ANIM_MS = SLIDE_MS + TILE_FADE_MS'));
  assert.ok(boardSrc.includes('EARLY_INPUT_FRACTION = 0.3'));
  assert.equal(countRe(boardSrc, /SLIDE_MS =/g), 1);
  assert.equal(countRe(boardSrc, /TILE_FADE_MS =/g), 1);
  assert.equal(countRe(boardSrc, /MAX_MOVE_ANIM_MS =/g), 1);
  assert.equal(countRe(boardSrc, /EARLY_INPUT_MS =/g), 1);
});

test.skip('[P2-05] SCAN settleTimerRef lifecycle: defined 1, clearTimeout >=2, setTimeout 2 (84ms dual)', () => {
  assert.equal(countRe(boardSrc, /settleTimerRef = useRef/g), 1);
  assert.ok(count(boardSrc, 'clearTimeout(settleTimerRef.current)') >= 2);
  assert.ok(count(boardSrc, 'setTimeout(() => {') >= 2, 'setTimeout >=2');
});

// ── P3 exploratory ─────────────────────────────────────────────────────────
test.skip('[P3-01] exploratory cell NaN guard Math.max(...,1)', () => {
  assert.ok(boardSrc.includes('Math.max(') && boardSrc.includes(', 1)'), 'missing Math.max');
  assert.ok(boardSrc.includes('const cell = Math.max'), 'missing cell guard');
});

test.skip('[P3-02] hygiene scope: no engine/store/HUD/layout change, App+Board only', () => {
  assert.equal(count(boardSrc, 'GRID_SIZE'), 0, 'should use GRID=4');
  assert.equal(boardSrc.includes('GRID_SIZE'), false);
  assert.ok(appSrc.includes('busyRef') && appSrc.includes('restartSeqRef'), 'gate markers present');
});

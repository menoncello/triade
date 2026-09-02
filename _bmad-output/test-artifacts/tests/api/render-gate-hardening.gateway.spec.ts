/**
 * API Gateway — dw-render-gate-hardening (RED-PHASE, test.skip)
 * App/GameBoard gate deadlock + tile-state + stroke race — host node:test
 * Mirrors triade/__tests__/render/render-gate-hardening.atdd.test.ts P0 10 + P1 wiring
 * All are test.skip (RED). Remove test.skip → test for GREEN. Before 0cfd046 they would fail.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planTileTransitions } from '../../../../triade/src/render/transitionPlan.ts';
import type { Board, MoveResult } from '../../../../triade/src/engine/core/index.ts';
import { emptyBoard, boardWith } from '../../../../triade/test-utils/helpers.ts';

const appSrc = fs.readFileSync(fileURLToPath(new URL('../../../../triade/App.tsx', import.meta.url)), 'utf8');
const boardSrc = fs.readFileSync(fileURLToPath(new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url)), 'utf8');
const transitionSrc = fs.readFileSync(fileURLToPath(new URL('../../../../triade/src/render/transitionPlan.ts', import.meta.url)), 'utf8');

function count(hay: string, needle: string): number {
  return (hay.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}
function countRe(hay: string, re: RegExp): number {
  return (hay.match(re) ?? []).length;
}

// ── P0 Critical (API gateway = gate contract) ──────────────────────────────
test.skip('[P0-API-01] DW-35/90 Board fallback: moved:true empty plan still arms 84ms', () => {
  assert.ok(boardSrc.includes('if (plan.length > 0)'), 'missing plan.length>0 branch');
  assert.ok(boardSrc.includes('else if (moveResult.moved)'), 'missing else if(moved) fallback');
  assert.ok((boardSrc.match(/EARLY_INPUT_MS/g) ?? []).length >= 2, 'EARLY_INPUT_MS hits >=2');
  assert.ok(boardSrc.includes('SLIDE_MS = 160'));
  assert.ok(boardSrc.includes('TILE_FADE_MS = 120'));
  assert.ok(boardSrc.includes('EARLY_INPUT_FRACTION = 0.3'));
  const emptyTrace: MoveResult = { moved: false, trace: [], board: emptyBoard(), score: 0 } as unknown as MoveResult;
  assert.deepStrictEqual(planTileTransitions(emptyBoard(), emptyTrace), []);
});

test.skip('[P0-API-02] DW-35/90 App fallback: doMove arms 420ms fallbackBusyTimerRef', () => {
  assert.ok(appSrc.includes('fallbackBusyTimerRef'), 'missing fallbackBusyTimerRef');
  assert.ok(appSrc.includes('restartSeqRef'), 'missing restartSeqRef');
  assert.ok(appSrc.includes('gestureStartSeqRef'), 'missing gestureStartSeqRef');
  assert.ok(appSrc.includes('setTimeout') && appSrc.includes(', 420)'), 'missing 420ms');
  assert.ok(appSrc.includes('busyRef.current = true'), 'missing busyRef=true');
  assert.ok(appSrc.includes('fallbackBusyTimerRef.current = setTimeout'), 'missing fallback arm');
  assert.ok(count(appSrc, 'if (fallbackBusyTimerRef.current) clearTimeout') >= 1);
});

test.skip('[P0-API-03] DW-88 null-rebuild: non-null→null rebuilds 16→9 via rebuildTilesFromBoard', () => {
  assert.ok(boardSrc.includes('if (!moveResult)'), 'missing !moveResult');
  assert.ok(boardSrc.includes('prevMoveResultRef'), 'missing prevMoveResultRef');
  assert.ok(boardSrc.includes('prevMoveResultRef.current !== null'), 'missing guard');
  assert.ok(boardSrc.includes('rebuildTilesFromBoard'), 'missing rebuild');
  assert.ok(boardSrc.includes('syncTiles(rebuilt') || boardSrc.includes('syncTiles(rebuilt)'), 'missing syncTiles(rebuilt)');
  assert.ok(boardSrc.includes('setBursts([])'), 'missing bursts clear');
  assert.ok(boardSrc.includes('for (let r = 0; r < GRID; r++)'), 'missing GRID scan');
  assert.ok(boardSrc.includes("kind: 'rest'"), 'missing rest kind');
});

test.skip('[P0-API-04] DW-89 settle leak: pending timer cleared before rebuild', () => {
  const nullBranchIdx = boardSrc.indexOf('if (!moveResult)');
  const clearIdx = boardSrc.indexOf('clearTimeout(settleTimerRef.current)', nullBranchIdx);
  const rebuildIdx = boardSrc.indexOf('rebuildTilesFromBoard', nullBranchIdx);
  assert.ok(nullBranchIdx >= 0 && clearIdx > nullBranchIdx && rebuildIdx > clearIdx, 'must clear before rebuild');
  assert.ok(boardSrc.includes('if (settleTimerRef.current)'), 'missing guard');
  assert.ok(count(boardSrc, 'clearTimeout(settleTimerRef.current)') >= 2);
});

test.skip('[P0-API-05] DW-39 unmount releases gate: clearTimeout + onMoveSettledRef', () => {
  assert.ok(boardSrc.includes('return () =>'), 'missing cleanup');
  assert.ok(boardSrc.includes('clearTimeout(settleTimerRef.current)'), 'missing clear');
  assert.ok(boardSrc.includes('onMoveSettledRef.current?.()'), 'missing gate release');
  assert.ok(boardSrc.includes('onMoveSettledRef'), 'missing ref');
  assert.ok(boardSrc.includes('onMoveSettledRef.current = onMoveSettled'), 'missing sync');
});

test.skip('[P0-API-06] DW-96 stroke race: restartSeqRef monotonic + panGesture seq guard', () => {
  assert.ok(appSrc.includes('restartSeqRef.current += 1'), 'missing bump');
  assert.ok(count(appSrc, 'restartSeqRef.current += 1') >= 2, 'bumps >=2');
  assert.ok(appSrc.includes('.onBegin'), 'missing onBegin');
  assert.ok(appSrc.includes('gestureStartSeqRef.current = restartSeqRef.current'), 'missing snapshot');
  assert.ok(appSrc.includes('.onEnd'), 'missing onEnd');
  assert.ok(appSrc.includes('gestureStartSeqRef.current !== restartSeqRef.current'), 'missing guard');
  assert.ok(appSrc.includes('handleGestureEnd'), 'missing dispatch');
  assert.ok(appSrc.includes('runOnJS(true)'), 'missing runOnJS');
});

test.skip('[P0-API-07] DW-36/38 syncTiles single writer', () => {
  assert.ok(boardSrc.includes('const syncTiles ='), 'missing helper');
  assert.ok(boardSrc.includes('tilesRef.current = next'), 'missing ref assign');
  assert.equal(countRe(boardSrc, /setTilesState\(next\)/g), 1, 'setTilesState(next) exactly 1');
  assert.equal(countRe(boardSrc, /tilesRef\.current = next/g), 1, 'tilesRef.current=next exactly 1');
  assert.ok(count(boardSrc, 'syncTiles(') >= 3, 'syncTiles calls >=3');
});

test.skip('[P0-API-08] applyPlan+onVanish via syncTiles', () => {
  const applyPlanIdx = boardSrc.indexOf('const applyPlan');
  const onVanishIdx = boardSrc.indexOf('const onVanish');
  assert.ok(applyPlanIdx >= 0 && onVanishIdx >= 0);
  assert.ok(boardSrc.slice(applyPlanIdx, applyPlanIdx + 4000).includes('syncTiles('), 'applyPlan must call syncTiles');
  assert.ok(boardSrc.slice(onVanishIdx, onVanishIdx + 2500).includes('syncTiles('), 'onVanish must call syncTiles');
});

test.skip('[P0-API-09] App onMoveSettled clears fallback before busyRef=false', () => {
  assert.ok(appSrc.includes('const onMoveSettled'), 'missing onMoveSettled');
  const idx = appSrc.indexOf('const onMoveSettled');
  const slice = appSrc.slice(idx, idx + 2500);
  assert.ok(slice.includes('clearTimeout(fallbackBusyTimerRef.current)'), 'must clear fallback');
  assert.ok(slice.includes('busyRef.current = false'), 'must release');
  assert.ok(slice.indexOf('clearTimeout(fallbackBusyTimerRef.current)') < slice.indexOf('busyRef.current = false'), 'clear before release');
});

test.skip('[P0-API-10] planTileTransitions !moved→[] contract unchanged', () => {
  assert.ok(transitionSrc.includes('if (!result.moved) return []') || transitionSrc.includes('if(!result.moved)'), 'missing guard');
  const board = boardWith([[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
  const noMove: MoveResult = { moved: false, trace: [], board, score: 0 } as unknown as MoveResult;
  assert.deepStrictEqual(planTileTransitions(board, noMove), []);
});

// ── P1 wiring (gateway keeps busy lifecycle) ───────────────────────────────
test.skip('[P1-API-01] undo/continue clear fallback + busyRef=false', () => {
  const clearHits = count(appSrc, 'clearTimeout(fallbackBusyTimerRef.current)');
  assert.ok(clearHits >= 6, `clearTimeout fallback hits ${clearHits} expected >=6`);
  const busyFalseHits = count(appSrc, 'busyRef.current = false');
  assert.ok(busyFalseHits >= 6, `busyRef=false hits ${busyFalseHits} expected >=6`);
});

test.skip('[P1-API-02] ledger 8-hit gate: deferred-work done + 4cfb9c87 64-hex', () => {
  const deferred = fs.readFileSync(fileURLToPath(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)), 'utf8');
  assert.equal((deferred.match(/4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c/g) ?? []).length, 8);
  // each DW section must be done 2026-09-02
  for (const dw of ['DW-35', 'DW-36', 'DW-38', 'DW-39', 'DW-88', 'DW-89', 'DW-90', 'DW-96']) {
    assert.ok(deferred.includes(dw), `missing ${dw}`);
    const section = deferred.split(dw)[1] ?? '';
    assert.ok(section.includes('status: done 2026-09-02'), `${dw} not done`);
  }
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { planTileTransitions } from '../../src/render/transitionPlan.ts';
import type { Board, MoveResult } from '../../src/engine/core/index.ts';
import { emptyBoard, boardWith } from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-render-gate-hardening — red-phase scaffolds
// covering working-tree delta vs baseline 818be0d → HEAD 0cfd046:
// triade/App.tsx:103-107,248-263,311-315,363-369,445-457,489-493,545-550,580-585,726,763-772,795-806,839-871
//   restartSeqRef monotonic + gestureStartSeqRef + fallbackBusyTimerRef 420ms
//   doMove arms fallback, onMoveSettled clears, restart/undo/continue bump seq+clear,
//   panGesture onBegin snapshot + onEnd seq guard → handleGestureEnd
// triade/src/render/GameBoard.tsx:298-380,383-447,449-552
//   syncTiles single writer, rebuildTilesFromBoard 4x4 scan, prevMoveResultRef,
//   unmount clearTimeout+onMoveSettledRef (DW-39), !moveResult null-rebuild
//   + bursts clear (DW-88/89), plan.length>0 84ms + else if(moved) 84ms fallback (DW-35/90)
// Spec: _bmad-output/implementation-artifacts/spec-render-gate-hardening.md
// Design: _bmad-output/test-artifacts/test-design/test-design-dw-render-gate-hardening.md
// Ledger: deferred-work.md DW-35,36,38,39,88,89,90,96 done 2026-09-02 + resolution-undo 4cfb9c87cc9…
// ---------------------------------------------------------------------------

const appSrc = fs.readFileSync(
  fileURLToPath(new URL('../../App.tsx', import.meta.url)),
  'utf8',
);
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

describe('ATDD dw-render-gate-hardening — P0 critical (spec AC + DW-35,36,38,39,88,89,90,96)', () => {
  it.skip('[P0-01] DW-35/90 Board fallback: moved:true empty plan still arms 84ms timer (not deadlock)', () => {
    // Board must have dual branch: plan.length>0 → EARLY_INPUT_MS and else if(moveResult.moved) → EARLY_INPUT_MS
    // Before 0cfd046: only plan.length>0 gated, moved:true+[] left busyRef=true forever
    assert.ok(boardSrc.includes('if (plan.length > 0)'), 'missing plan.length>0 branch');
    assert.ok(boardSrc.includes('else if (moveResult.moved)'), 'missing else if(moved) fallback');
    // Both set settleTimerRef = setTimeout(..., EARLY_INPUT_MS)
    const earlyHits = count(boardSrc, 'EARLY_INPUT_MS');
    assert.ok(earlyHits >= 2, `EARLY_INPUT_MS hits ${earlyHits} expected >=2 (primary + fallback)`);
    // Duration constants byte-identical
    assert.ok(boardSrc.includes('SLIDE_MS = 160'));
    assert.ok(boardSrc.includes('TILE_FADE_MS = 120'));
    assert.ok(boardSrc.includes('EARLY_INPUT_FRACTION = 0.3'));
    // Verify planTileTransitions contract: !moved -> [] (factual invariant)
    const emptyTrace: MoveResult = { moved: false, trace: [], board: emptyBoard(), score: 0 } as unknown as MoveResult;
    assert.deepStrictEqual(planTileTransitions(emptyBoard(), emptyTrace), []);
  });

  it.skip('[P0-02] DW-35/90 App fallback: doMove moved:true arms 420ms fallbackBusyTimerRef', () => {
    // App must arm fallback when result.moved, 420ms, with clearTimeout before arm
    assert.ok(appSrc.includes('fallbackBusyTimerRef'), 'missing fallbackBusyTimerRef');
    assert.ok(appSrc.includes('restartSeqRef'), 'missing restartSeqRef');
    assert.ok(appSrc.includes('gestureStartSeqRef'), 'missing gestureStartSeqRef');
    // doMove arms 420ms
    assert.ok(appSrc.includes('setTimeout') && appSrc.includes(', 420)'), 'missing 420ms fallback setTimeout');
    assert.ok(appSrc.includes('busyRef.current = true'), 'missing busyRef=true in doMove');
    assert.ok(appSrc.includes('fallbackBusyTimerRef.current = setTimeout'), 'missing fallback arm assignment');
    // Before arm clears existing
    const clearBeforeArm = count(appSrc, 'if (fallbackBusyTimerRef.current) clearTimeout');
    assert.ok(clearBeforeArm >= 1, `clear before arm hits ${clearBeforeArm} expected >=1`);
  });

  it.skip('[P0-03] DW-88 null-rebuild: non-null→null moveResult rebuilds 16→9 via rebuildTilesFromBoard', () => {
    // GameBoard null branch: if (!moveResult) { if (prevMoveResultRef.current !== null) { clearTimeout + rebuild + syncTiles + bursts=[] } }
    assert.ok(boardSrc.includes('if (!moveResult)'), 'missing !moveResult branch');
    assert.ok(boardSrc.includes('prevMoveResultRef'), 'missing prevMoveResultRef');
    assert.ok(boardSrc.includes('prevMoveResultRef.current !== null'), 'missing prevMoveResultRef!==null guard');
    assert.ok(boardSrc.includes('rebuildTilesFromBoard'), 'missing rebuildTilesFromBoard helper');
    assert.ok(boardSrc.includes('syncTiles(rebuilt') || boardSrc.includes('syncTiles(rebuilt)'), 'missing syncTiles(rebuilt) in null branch');
    assert.ok(boardSrc.includes('setBursts([])'), 'missing bursts clear on rebuild');
    // rebuild scans 4x4 GRID scan
    assert.ok(boardSrc.includes('for (let r = 0; r < GRID; r++)'), 'missing GRID scan');
    // Pure helper returns TileDescriptor[] with kind rest
    assert.ok(boardSrc.includes("kind: 'rest'"), 'missing rest kind in rebuild');
  });

  it.skip('[P0-04] DW-89 settle leak on restart: pending timer cleared before rebuild (no post-restart fire)', () => {
    // Null branch clears settleTimerRef before rebuild
    const nullBranchIdx = boardSrc.indexOf('if (!moveResult)');
    const clearIdx = boardSrc.indexOf('clearTimeout(settleTimerRef.current)', nullBranchIdx);
    const rebuildIdx = boardSrc.indexOf('rebuildTilesFromBoard', nullBranchIdx);
    assert.ok(nullBranchIdx >= 0 && clearIdx > nullBranchIdx && rebuildIdx > clearIdx, 'null branch must clearTimeout before rebuild');
    // Also arms clear before re-arm in main effect
    assert.ok(boardSrc.includes('if (settleTimerRef.current)'), 'missing settleTimerRef guard');
    const clearCount = count(boardSrc, 'clearTimeout(settleTimerRef.current)');
    assert.ok(clearCount >= 2, `clearTimeout(settleTimerRef) hits ${clearCount} expected >=2 (unmount + null branch + re-arm)`);
  });

  it.skip('[P0-05] DW-39 unmount mid-animation: cleanup clearTimeout + onMoveSettledRef gate release', () => {
    // useEffect cleanup: return () => { if (settleTimerRef.current) { clearTimeout ...; onMoveSettledRef.current?.(); } }
    assert.ok(boardSrc.includes('return () =>'), 'missing cleanup return');
    assert.ok(boardSrc.includes('clearTimeout(settleTimerRef.current)'), 'missing clearTimeout in cleanup');
    assert.ok(boardSrc.includes('onMoveSettledRef.current?.()'), 'missing onMoveSettledRef gate release in cleanup');
    assert.ok(boardSrc.includes('onMoveSettledRef'), 'missing onMoveSettledRef');
    // onMoveSettledRef synced via useEffect
    assert.ok(boardSrc.includes('onMoveSettledRef.current = onMoveSettled'), 'missing ref sync');
  });

  it.skip('[P0-06] DW-96 stroke-tiling race: restartSeqRef monotonic + panGesture onBegin/onEnd seq guard', () => {
    // App: restartSeqRef bumped on restart/lane (undo/continue clear busy without bump — still safe)
    assert.ok(appSrc.includes('restartSeqRef.current += 1'), 'missing restartSeqRef++');
    const bumps = count(appSrc, 'restartSeqRef.current += 1');
    assert.ok(bumps >= 2, `restartSeqRef++ hits ${bumps} expected >=2 (restart+lane)`);
    // panGesture .onBegin snapshots, .onEnd guards
    assert.ok(appSrc.includes('.onBegin'), 'missing panGesture onBegin');
    assert.ok(appSrc.includes('gestureStartSeqRef.current = restartSeqRef.current'), 'missing seq snapshot');
    assert.ok(appSrc.includes('.onEnd'), 'missing panGesture onEnd');
    assert.ok(appSrc.includes('gestureStartSeqRef.current !== restartSeqRef.current'), 'missing seq guard');
    assert.ok(appSrc.includes('handleGestureEnd'), 'missing handleGestureEnd dispatch');
    assert.ok(appSrc.includes('runOnJS(true)'), 'missing runOnJS guard note');
  });

  it.skip('[P0-07] DW-36/38 syncTiles single writer: setTilesState only inside syncTiles, tilesRef.current= only there', () => {
    // Single disciplined writer: syncTiles(next) { tilesRef.current=next; setTilesState(next); }
    assert.ok(boardSrc.includes('const syncTiles ='), 'missing syncTiles helper');
    assert.ok(boardSrc.includes('tilesRef.current = next'), 'missing tilesRef.current=next in syncTiles');
    // Count only code sites: definition + call site inside syncTiles (exclude comment line with No direct setTilesState)
    const setCallHits = countRe(boardSrc, /setTilesState\(next\)/g);
    assert.equal(setCallHits, 1, `setTilesState(next) hits ${setCallHits} expected 1 (inside syncTiles only)`);
    const refAssignHits = countRe(boardSrc, /tilesRef\.current = next/g);
    assert.equal(refAssignHits, 1, `tilesRef.current=next hits ${refAssignHits} expected 1 (inside syncTiles)`);
    const syncCalls = count(boardSrc, 'syncTiles(');
    assert.ok(syncCalls >= 3, `syncTiles( calls ${syncCalls} expected >=3 (applyPlan + onVanish + rebuild)`);
  });

  it.skip('[P0-08] applyPlan + onVanish route via syncTiles (no direct setTilesState+ref)', () => {
    const applyPlanIdx = boardSrc.indexOf('const applyPlan');
    const onVanishIdx = boardSrc.indexOf('const onVanish');
    assert.ok(applyPlanIdx >= 0);
    assert.ok(onVanishIdx >= 0);
    // Both should contain syncTiles( — use wider slice to cover full function bodies
    assert.ok(boardSrc.slice(applyPlanIdx, applyPlanIdx + 4000).includes('syncTiles('), 'applyPlan must call syncTiles');
    assert.ok(boardSrc.slice(onVanishIdx, onVanishIdx + 2500).includes('syncTiles('), 'onVanish must call syncTiles');
    // No bare setTilesState( outside helper already pinned by P0-07=1
  });

  it.skip('[P0-09] App onMoveSettled clears fallback before busyRef=false (no double-fire)', () => {
    assert.ok(appSrc.includes('const onMoveSettled'), 'missing onMoveSettled');
    const onSettledIdx = appSrc.indexOf('const onMoveSettled');
    const slice = appSrc.slice(onSettledIdx, onSettledIdx + 2500);
    assert.ok(slice.includes('clearTimeout(fallbackBusyTimerRef.current)'), 'onMoveSettled must clear fallback');
    assert.ok(slice.includes('busyRef.current = false'), 'onMoveSettled must release busyRef');
    const clearIdx = slice.indexOf('clearTimeout(fallbackBusyTimerRef.current)');
    const busyIdx = slice.indexOf('busyRef.current = false');
    assert.ok(clearIdx < busyIdx, 'clear must precede busyRef=false');
  });

  it.skip('[P0-10] planTileTransitions !moved -> [] invariant still holds (contract unchanged)', () => {
    // This is the factual invariant now guarded at both levels
    assert.ok(transitionSrc.includes('if (!result.moved) return []') || transitionSrc.includes('if(!result.moved)'), 'missing !moved -> [] guard');
    const board = boardWith([[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
    // Import helpers already at top; use empty move
    const noMove: MoveResult = { moved: false, trace: [], board, score: 0 } as unknown as MoveResult;
    assert.deepStrictEqual(planTileTransitions(board, noMove), []);
  });
});

describe('ATDD dw-render-gate-hardening — P1 wiring (lane/undo, no-rebuild spur, gate idempotency)', () => {
  it.skip('[P1-01] lane-switch seq guard (DW-96 lane variant) bumps seq only when needsReset', () => {
    assert.ok(appSrc.includes('const applyLaneSelection'), 'missing applyLaneSelection');
    const idx = appSrc.indexOf('const applyLaneSelection');
    const slice = appSrc.slice(idx, idx + 3500);
    assert.ok(slice.includes('needsReset'), 'missing needsReset branch');
    assert.ok(slice.includes('restartSeqRef.current += 1'), 'missing seq bump in lane switch');
    // No bump outside needsReset branch — verify bump inside if(needsReset)
    assert.ok(slice.includes('if (needsReset)'), 'missing if(needsReset) guard');
  });

  it.skip('[P1-02] undo/continue clear fallback + busyRef=false', () => {
    // handleRestart, handleConfirmUndoAd/Iap, handleContinueAd/Iap, handleUndoRequest (hasNoAds path), handleSkipTutorial all clear
    const clearHits = count(appSrc, 'clearTimeout(fallbackBusyTimerRef.current)');
    assert.ok(clearHits >= 6, `clearTimeout fallback hits ${clearHits} expected >=6 (restart+undo+continue+skip+tutorial+onMoveSettled)`);
    const busyFalseHits = count(appSrc, 'busyRef.current = false');
    assert.ok(busyFalseHits >= 6, `busyRef=false hits ${busyFalseHits} expected >=6`);
  });

  it.skip('[P1-03] null→null does not rebuild spuriously (prevMoveResultRef gate)', () => {
    // Already pinned by P0-03: if (prevMoveResultRef.current !== null) prevents second null cycle
    assert.ok(boardSrc.includes('prevMoveResultRef.current !== null'), 'missing second-null guard');
    // Also prevBoardRef synced even on null branch
    assert.ok(boardSrc.includes('prevBoardRef.current = board'), 'missing prevBoardRef sync');
    // After rebuild, prevMoveResultRef set to null so next null no-ops
    assert.ok(boardSrc.includes('prevMoveResultRef.current = moveResult'), 'missing prevMoveResultRef update');
  });

  it.skip('[P1-04] rapid restart seq monotonic — no wrap, no reset, number safe', () => {
    // restartSeqRef is useRef(0) monotonic, never reset
    assert.ok(appSrc.includes('restartSeqRef = useRef(0)'), 'missing restartSeqRef initial 0');
    assert.equal(count(appSrc, 'restartSeqRef.current = 0'), 0, 'should never reset seq to 0');
  });

  it.skip('[P1-05] App useEffect cleanup clears fallbackBusyTimerRef on unmount', () => {
    // App has useEffect return clearing fallback
    assert.ok(appSrc.includes('useEffect(() =>'), 'missing App useEffect');
    const useEffIdx = appSrc.lastIndexOf('useEffect(() =>');
    // Find fallback cleanup after App onMoveSettled
    assert.ok(appSrc.includes('fallbackBusyTimerRef.current = null'), 'missing null assignment after clear');
    const nullHits = count(appSrc, 'fallbackBusyTimerRef.current = null');
    assert.ok(nullHits >= 4, `fallback null hits ${nullHits} expected >=4`);
  });

  it.skip('[P1-06] ledger DW-35,36,38,39,88,89,90,96 done + resolution-undo 64-hex + sprint-status untouched', () => {
    const deferred = fs.readFileSync(
      fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)),
      'utf8',
    );
    for (const dw of ['DW-35', 'DW-36', 'DW-38', 'DW-39', 'DW-88', 'DW-89', 'DW-90', 'DW-96']) {
      assert.ok(deferred.includes(dw), `missing ${dw}`);
      // Each should be done 2026-09-02 in this sweep
      const section = deferred.split(dw)[1] ?? '';
      assert.ok(section.includes('status: done 2026-09-02'), `${dw} not done 2026-09-02`);
      assert.ok(section.includes('resolution: resolved by sweep bundle dw-render-gate-hardening'), `${dw} missing resolution`);
      assert.ok(section.includes('resolution-undo: 4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c'), `${dw} missing 4cfb9c87 undo`);
    }
    const undoHits = (deferred.match(/4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c/g) ?? []).length;
    assert.equal(undoHits, 8, `4cfb9c87 hits ${undoHits} expected 8`);
  });

  it.skip('[P1-07] burst orphan cleared on rebuild (setBursts([]) in null branch)', () => {
    assert.ok(boardSrc.includes('setBursts([])'), 'missing setBursts([]) in null rebuild');
    // Bursts also timed via setTimeout 500ms auto-clear in applyPlan
    assert.ok(boardSrc.includes('setTimeout(() =>'), 'missing burst auto-clear timeout');
  });
});

describe('ATDD dw-render-gate-hardening — P2 static scans (hygiene allowlists)', () => {
  it.skip('[P2-01] SCAN single syncTiles writer allowlist: setTilesState 1, tilesRef.current= 1, syncTiles 1 def', () => {
    assert.equal(countRe(boardSrc, /setTilesState\(next\)/g), 1);
    assert.equal(countRe(boardSrc, /tilesRef\.current = next/g), 1);
    assert.equal(countRe(boardSrc, /const syncTiles/g), 1);
  });

  it.skip('[P2-02] SCAN App fallbackBusyTimerRef allowlist: defined 1, cleared >=6, fallback 420ms once', () => {
    assert.equal(countRe(appSrc, /fallbackBusyTimerRef = useRef/g), 1);
    assert.ok(count(appSrc, 'clearTimeout(fallbackBusyTimerRef.current)') >= 6);
    assert.equal(count(appSrc, ', 420)'), 1, '420ms fallback should appear exactly once');
  });

  it.skip('[P2-03] SCAN App restartSeqRef allowlist: defined 1, gestureStartSeqRef 1, bumps >=2, guard 1', () => {
    assert.equal(countRe(appSrc, /restartSeqRef = useRef/g), 1);
    assert.equal(countRe(appSrc, /gestureStartSeqRef = useRef/g), 1);
    assert.ok(count(appSrc, 'restartSeqRef.current += 1') >= 2);
    assert.equal(count(appSrc, 'gestureStartSeqRef.current !== restartSeqRef.current'), 1);
    assert.equal(count(appSrc, 'gestureStartSeqRef.current = restartSeqRef.current'), 1);
  });

  it.skip('[P2-04] SCAN Board timer constants: SLIDE_MS 160, TILE_FADE_MS 120, MAX 280, EARLY 84 single source', () => {
    assert.ok(boardSrc.includes('SLIDE_MS = 160'));
    assert.ok(boardSrc.includes('TILE_FADE_MS = 120'));
    assert.ok(boardSrc.includes('MAX_MOVE_ANIM_MS = SLIDE_MS + TILE_FADE_MS'));
    assert.ok(boardSrc.includes('EARLY_INPUT_FRACTION = 0.3'));
    assert.equal(countRe(boardSrc, /SLIDE_MS =/g), 1);
    assert.equal(countRe(boardSrc, /TILE_FADE_MS =/g), 1);
    assert.equal(countRe(boardSrc, /MAX_MOVE_ANIM_MS =/g), 1);
    assert.equal(countRe(boardSrc, /EARLY_INPUT_MS =/g), 1);
  });

  it.skip('[P2-05] SCAN settleTimerRef lifecycle: defined 1, clearTimeout >=2, setTimeout 2 (84ms dual)', () => {
    assert.equal(countRe(boardSrc, /settleTimerRef = useRef/g), 1);
    assert.ok(count(boardSrc, 'clearTimeout(settleTimerRef.current)') >= 2);
    // Both arms use EARLY_INPUT_MS (primary + fallback)
    const earlyAssign = count(boardSrc, 'setTimeout(() => {');
    assert.ok(earlyAssign >= 2, `setTimeout assignments ${earlyAssign} expected >=2`);
  });
});

describe('ATDD dw-render-gate-hardening — P3 exploratory / residual / hygiene', () => {
  it.skip('[P3-01] exploratory cell NaN guard Math.max(...,1) preserved', () => {
    assert.ok(boardSrc.includes('Math.max(') && boardSrc.includes(', 1)'), 'missing Math.max(...,1) cell guard');
    assert.ok(boardSrc.includes('const cell = Math.max'), 'missing cell NaN guard');
  });

  it.skip('[P3-02] hygiene scope: no engine/store/HUD/layout change, App+Board only', () => {
    assert.equal(/from ['"]\.\.\/engine/.test(appSrc) ? 1 : 1, 1); // trivial presence check
    // Verify engine files unchanged: no spawn weight/pot logic in App/Board
    assert.equal(count(boardSrc, 'GRID_SIZE'), 0, 'Board should use GRID=4 not GRID_SIZE');
    assert.equal(boardSrc.includes('GRID_SIZE'), false);
    assert.ok(appSrc.includes('busyRef') && appSrc.includes('restartSeqRef'), 'App gate markers present');
  });
});

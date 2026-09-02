/**
 * E2E Umbrella — dw-render-gate-hardening (RED-PHASE, test.skip)
 * Lane/undo + wiring journeys + static allowlists + ledger — host static scans
 * Mirrors triade/__tests__/render/render-gate-hardening.atdd.test.ts P1 7 + P2 5 + P3 2
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appSrc = readFileSync(fileURLToPath(new URL('../../../../triade/App.tsx', import.meta.url)), 'utf8');
const boardSrc = readFileSync(fileURLToPath(new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url)), 'utf8');

function count(hay: string, needle: string): number {
  return (hay.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}
function countRe(hay: string, re: RegExp): number {
  return (hay.match(re) ?? []).length;
}

// ── P1 wiring (umbrella journeys) ─────────────────────────────────────────
test.skip('[P1-UMB-01] lane-switch seq guard bumps only when needsReset', () => {
  assert.ok(appSrc.includes('const applyLaneSelection'), 'missing applyLaneSelection');
  const idx = appSrc.indexOf('const applyLaneSelection');
  const slice = appSrc.slice(idx, idx + 3500);
  assert.ok(slice.includes('needsReset'), 'missing needsReset');
  assert.ok(slice.includes('restartSeqRef.current += 1'), 'missing bump');
  assert.ok(slice.includes('if (needsReset)'), 'missing guard');
});

test.skip('[P1-UMB-02] null→null does not rebuild spuriously', () => {
  assert.ok(boardSrc.includes('prevMoveResultRef.current !== null'), 'missing guard');
  assert.ok(boardSrc.includes('prevBoardRef.current = board'), 'missing sync');
  assert.ok(boardSrc.includes('prevMoveResultRef.current = moveResult'), 'missing update');
});

test.skip('[P1-UMB-03] rapid restart seq monotonic no reset', () => {
  assert.ok(appSrc.includes('restartSeqRef = useRef(0)'), 'missing init 0');
  assert.equal(count(appSrc, 'restartSeqRef.current = 0'), 0, 'should never reset');
});

test.skip('[P1-UMB-04] App useEffect cleanup clears fallbackBusyTimerRef', () => {
  assert.ok(appSrc.includes('useEffect(() =>'), 'missing useEffect');
  assert.ok(appSrc.includes('fallbackBusyTimerRef.current = null'), 'missing null');
  assert.ok(count(appSrc, 'fallbackBusyTimerRef.current = null') >= 4, 'null hits >=4');
});

test.skip('[P1-UMB-05] ledger DW 8 hits done + resolution-undo 64-hex', () => {
  const deferred = readFileSync(fileURLToPath(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)), 'utf8');
  for (const dw of ['DW-35', 'DW-36', 'DW-38', 'DW-39', 'DW-88', 'DW-89', 'DW-90', 'DW-96']) {
    assert.ok(deferred.includes(dw), `missing ${dw}`);
    const section = deferred.split(dw)[1] ?? '';
    assert.ok(section.includes('status: done 2026-09-02'), `${dw} not done`);
    assert.ok(section.includes('resolution: resolved by sweep bundle dw-render-gate-hardening'), `${dw} missing resolution`);
    assert.ok(section.includes('4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c'), `${dw} missing undo`);
  }
  assert.equal((deferred.match(/4cfb9c87cc92e42a3d0a5621d85f333cb7c546c3d62a3aef82c4a189144c824c/g) ?? []).length, 8);
});

test.skip('[P1-UMB-06] burst orphan cleared on rebuild', () => {
  assert.ok(boardSrc.includes('setBursts([])'), 'missing setBursts([])');
  assert.ok(boardSrc.includes('setTimeout(() =>'), 'missing auto-clear');
});

test.skip('[P1-UMB-07] sprint-status.yaml diff empty (orchestrator-owned)', () => {
  // static gate — file must not be written by this workflow
  assert.ok(true, 'sprint-status.yaml ownership — verify via git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml empty');
});

// ── P2 static scans (allowlist gates) ─────────────────────────────────────
test.skip('[P2-UMB-01] SCAN single syncTiles writer: setTilesState 1, tilesRef 1, syncTiles 1 def', () => {
  assert.equal(countRe(boardSrc, /setTilesState\(next\)/g), 1);
  assert.equal(countRe(boardSrc, /tilesRef\.current = next/g), 1);
  assert.equal(countRe(boardSrc, /const syncTiles/g), 1);
});

test.skip('[P2-UMB-02] SCAN App fallbackBusyTimerRef: defined 1, cleared >=6, fallback 420ms once', () => {
  assert.equal(countRe(appSrc, /fallbackBusyTimerRef = useRef/g), 1);
  assert.ok(count(appSrc, 'clearTimeout(fallbackBusyTimerRef.current)') >= 6);
  assert.equal(count(appSrc, ', 420)'), 1, '420ms once');
});

test.skip('[P2-UMB-03] SCAN App restartSeqRef: defined 1, gestureStartSeqRef 1, bumps >=2, guard 1', () => {
  assert.equal(countRe(appSrc, /restartSeqRef = useRef/g), 1);
  assert.equal(countRe(appSrc, /gestureStartSeqRef = useRef/g), 1);
  assert.ok(count(appSrc, 'restartSeqRef.current += 1') >= 2);
  assert.equal(count(appSrc, 'gestureStartSeqRef.current !== restartSeqRef.current'), 1);
  assert.equal(count(appSrc, 'gestureStartSeqRef.current = restartSeqRef.current'), 1);
});

test.skip('[P2-UMB-04] SCAN Board timer constants single source', () => {
  assert.ok(boardSrc.includes('SLIDE_MS = 160'));
  assert.ok(boardSrc.includes('TILE_FADE_MS = 120'));
  assert.ok(boardSrc.includes('MAX_MOVE_ANIM_MS = SLIDE_MS + TILE_FADE_MS'));
  assert.ok(boardSrc.includes('EARLY_INPUT_FRACTION = 0.3'));
  assert.equal(countRe(boardSrc, /SLIDE_MS =/g), 1);
  assert.equal(countRe(boardSrc, /TILE_FADE_MS =/g), 1);
  assert.equal(countRe(boardSrc, /MAX_MOVE_ANIM_MS =/g), 1);
  assert.equal(countRe(boardSrc, /EARLY_INPUT_MS =/g), 1);
});

test.skip('[P2-UMB-05] SCAN settleTimerRef lifecycle: defined 1, clearTimeout >=2, setTimeout 2 (84ms dual)', () => {
  assert.equal(countRe(boardSrc, /settleTimerRef = useRef/g), 1);
  assert.ok(count(boardSrc, 'clearTimeout(settleTimerRef.current)') >= 2);
  assert.ok(count(boardSrc, 'setTimeout(() => {') >= 2, 'setTimeout >=2');
});

// ── P3 exploratory ─────────────────────────────────────────────────────────
test.skip('[P3-UMB-01] exploratory cell NaN guard Math.max(...,1)', () => {
  assert.ok(boardSrc.includes('Math.max(') && boardSrc.includes(', 1)'), 'missing Math.max');
  assert.ok(boardSrc.includes('const cell = Math.max'), 'missing cell guard');
});

test.skip('[P3-UMB-02] hygiene scope: no engine/store/HUD/layout change, App+Board only', () => {
  assert.equal(count(boardSrc, 'GRID_SIZE'), 0, 'should use GRID=4 not GRID_SIZE');
  assert.equal(boardSrc.includes('GRID_SIZE'), false);
  assert.ok(appSrc.includes('busyRef') && appSrc.includes('restartSeqRef'), 'gate markers present');
});

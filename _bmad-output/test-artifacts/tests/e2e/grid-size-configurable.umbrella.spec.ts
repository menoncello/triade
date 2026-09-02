/**
 * E2E Umbrella — dw-grid-size-configurable (RED-PHASE, test.skip)
 * Static scans + helper mirror + ledger + type invariants — host node:test
 * Mirrors triade/__tests__/engine/grid-size-configurable.atdd.test.ts P0/P1/P2
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { GRID_SIZE, resolveGridSize } from '../../../../triade/src/engine/core/index.ts';
import { movementLines, boardFromLines, shiftLine } from '../../../../triade/src/engine/core/line.ts';
import { boardWith, staticBoard } from '../../../../triade/test-utils/helpers.ts';
import { emptyBoard as helperEmptyBoard, oppositeEdgeCandidates, occupiedCells } from '../../../../triade/test-utils/helpers.ts';
import { boardsEqual } from '../../../../triade/src/engine/core/board.ts';
import type { Board } from '../../../../triade/src/engine/core/index.ts';

test.skip('[P0-UMB-01] movementLines 4x4 size-aware rows×4 reversed right', () => {
  const board = boardWith([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]);
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    const lines = movementLines(board, dir, 4);
    assert.strictEqual(lines.length, 4);
    for (const l of lines) assert.strictEqual(l.length, 4);
  }
  assert.strictEqual(movementLines(board, 'right', 4)[0][0].v, 4);
  assert.throws(() => movementLines(board, 'left', 5), /unsupported grid size/);
});

test.skip('[P0-UMB-02] boardFromLines size-1-k placement round-trip trace within 0..3', () => {
  const board = boardWith([[1, null, null, 2], [3, null, null, null]]);
  for (const dir of ['left', 'right', 'up', 'down'] as const) {
    const lines = movementLines(board, dir, 4);
    const shifted = lines.map((l) => shiftLine(l).line);
    const built = boardFromLines(shifted, dir, 4);
    assert.strictEqual(built.board.length, 4);
    for (const e of built.trace) {
      assert.ok(e.to[0] >= 0 && e.to[0] < 4);
      assert.ok(e.to[1] >= 0 && e.to[1] < 4);
    }
  }
  assert.throws(() => boardFromLines([], 'left', 5 as unknown as number), /unsupported grid size/);
});

test.skip('[P0-UMB-03] oppositeEdgeCandidates left→[row,3] right→0 up→3 down→0', () => {
  const board = boardWith([[1, 2, null, null], [3, 6, 12, 24], [3, 6, 12, 24], [3, 6, 12, 24]]);
  for (const [r, c] of oppositeEdgeCandidates(board, 'left', 4)) assert.strictEqual(c, 3);
  for (const [r, c] of oppositeEdgeCandidates(board, 'right', 4)) assert.strictEqual(c, 0);
  for (const [r, c] of oppositeEdgeCandidates(board, 'up', 4)) assert.strictEqual(r, 3);
  for (const [r, c] of oppositeEdgeCandidates(board, 'down', 4)) assert.strictEqual(r, 0);
  assert.throws(() => oppositeEdgeCandidates(board, 'left', 5 as unknown as number), /unsupported grid size/);
});

test.skip('[P0-UMB-04] boardsEqual defensive optional-chain 0..size-1 loop', () => {
  const a = helperEmptyBoard(4);
  const b = helperEmptyBoard(4);
  assert.strictEqual(boardsEqual(a, b, 4), true);
  const c = boardWith([[1, null, null, null]]);
  const d = boardWith([[2, null, null, null]]);
  assert.strictEqual(boardsEqual(c, d, 4), false);
  // jagged
  const jagged = [[1, 2], [3, 4]] as unknown as Board;
  const full = [[1, 2, null, null], [3, 4, null, null], [null, null, null, null], [null, null, null, null]] as Board;
  assert.strictEqual(boardsEqual(jagged, full, 4), false);
});

test.skip('[P1-UMB-01] helpers SIZE alias + DEFAULT_BOARD_CONFIG single-source', () => {
  const helpersSrc = readFileSync(new URL('../../../../triade/test-utils/helpers.ts', import.meta.url).pathname, 'utf8');
  assert.ok(/from '\.\.\/src\/engine\/core\/index/.test(helpersSrc));
  assert.ok(/SIZE.*=.*GRID_SIZE/.test(helpersSrc));
  assert.strictEqual(GRID_SIZE, 4);
});

test.skip('[P1-UMB-02] occupiedCells legacy board.length inference vs explicit 4 same', () => {
  const board = boardWith([[1, null, null, null], [null, 2, null, null]]);
  assert.deepStrictEqual(occupiedCells(board), occupiedCells(board, 4));
});

test.skip('[P1-UMB-03] helpers staticBoard/boardWith threading 4x4 fill', () => {
  const s = staticBoard([1, 2, 3, 4], 4);
  assert.deepStrictEqual(s[0], [1, 2, 3, 4]);
  for (let r = 1; r < 4; r++) assert.deepStrictEqual(s[r], [3, 6, 12, 24]);
  const b = boardWith([[9, null, null, null]], 4);
  assert.strictEqual(b[0][0], 9);
});

test.skip('[P1-UMB-04] index.ts re-export surface BoardConfig/validateGridSize/resolveGridSize', () => {
  const src = readFileSync(new URL('../../../../triade/src/engine/core/index.ts', import.meta.url).pathname, 'utf8');
  assert.ok(/GRID_SIZE/.test(src));
  assert.ok(/BoardConfig/.test(src));
  assert.ok(/validateGridSize/.test(src));
  assert.ok(/resolveGridSize/.test(src));
});

test.skip('[P1-UMB-05] ledger single DW 0f53c41e and sprint-status.yaml untouched', () => {
  const ledger = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  assert.strictEqual((ledger.match(/0f53c41ea45ace614fe7900fb3fc0274670d9e52485d44085e37cfcd167ada1f/g) || []).length, 1);
  // sprint-status.yaml must stay orchestrator-owned — empty diff enforced in checklist P2-07 structural scan
  assert.ok(true);
});

test.skip('[P2-UMB-01] types.ts single GRID_SIZE definition and BoardConfig additive', () => {
  const src = readFileSync(new URL('../../../../triade/src/engine/core/types.ts', import.meta.url).pathname, 'utf8');
  assert.strictEqual((src.match(/export const GRID_SIZE/g) || []).length, 1);
  assert.ok(/export interface BoardConfig/.test(src));
  assert.ok(/export const DEFAULT_BOARD_CONFIG/.test(src));
});

test.skip('[P2-UMB-02] Board type Cell[][] unchanged and GameState {board,pendingSpawn}', () => {
  const src = readFileSync(new URL('../../../../triade/src/engine/core/types.ts', import.meta.url).pathname, 'utf8');
  assert.ok(/export type Board = Cell\[\]\[\]/.test(src));
  assert.ok(/export interface GameState/.test(src));
});

test.skip('[P2-UMB-03] no Math.random in new grid-size suites', () => {
  const s = readFileSync(new URL('../../../../triade/__tests__/engine/grid-size-configurable.atdd.test.ts', import.meta.url).pathname, 'utf8');
  assert.strictEqual(/Math\.random/.test(s), false);
});

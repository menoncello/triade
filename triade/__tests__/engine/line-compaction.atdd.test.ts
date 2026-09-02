import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { shiftLine, boardFromLines, movementLines } from '../../src/engine/core/line.ts';
import type { CellRef } from '../../src/engine/core/line.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';
import { emptyBoard, staticBoard } from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-engine-line-compaction — red-phase scaffolds
// covering working-tree delta vs baseline 505c8ea → HEAD 7eacd93:
// triade/src/engine/core/line.ts:16-110 — movementLines board[r]?.[c] ?? null
//   (2 sites), shiftLine n=line.length + dest bounds + wall-scan
//   while(target>0 && out[target-1].v===null) target-- before placing tile
//   (merge branch keeps dest=i-1 only), boardFromLines lines.length/row.length
//   guards + if(!row)/if(!item) continue. GRID_SIZE=4 unchanged.
// triade/__tests__/engine/line-compaction.regression.test.ts (new 82 LOC,
//   11 pins), game.test.ts ONE_CELL left/down wall, transitionPlan wall
//   to [0,0]/[0,3]/[3,1]. Host-only: node:test + tsx, no RN/native.
// Spec: _bmad-output/implementation-artifacts/spec-engine-line-compaction.md
// Design: _bmad-output/test-artifacts/test-design/test-design-dw-engine-line-compaction.md
// ---------------------------------------------------------------------------

function refLine(...vs: Array<number | null>): CellRef[] {
  return vs.map((v, c) => ({ v, r: 0, c }));
}

const lineSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/engine/core/line.ts', import.meta.url)),
  'utf8'
);

describe('ATDD dw-engine-line-compaction — P0 critical (spec AC + DW-74/DW-20)', () => {
  it.skip('[P0-01] DW-74 wall-most multi-gap: [null,null,null,2] -> [2,null,null,null] from [[0,3]] moved true', () => {
    // Before fix: dest=i-1 without scan left [null,null,2,null] requiring second pass.
    // After: wall-scan while(target>0 && out[target-1].v===null) targets wall 0.
    const { line, moved } = shiftLine(refLine(null, null, null, 2));
    assert.deepStrictEqual(line.map((c) => c.v), [2, null, null, null]);
    assert.equal(moved, true);
    assert.deepStrictEqual(line[0].from, [[0, 3]]);
    assert.deepStrictEqual(line[0].v, 2);
  });

  it.skip('[P0-02] DW-74 double gap two tiles: [null,2,null,4] -> [2,4,null,null] sequential scan', () => {
    // Proves scan restarts after prior tile vacated 1->0, so 4 lands at 1 not 2.
    const { line, moved } = shiftLine(refLine(null, 2, null, 4));
    assert.deepStrictEqual(line.map((c) => c.v), [2, 4, null, null]);
    assert.equal(moved, true);
    // from fidelity: 2 from [0,1] at 0, 4 from [0,3] at 1
    assert.deepStrictEqual(line[0].from, [[0, 1]]);
    assert.deepStrictEqual(line[1].from, [[0, 3]]);
  });

  it.skip('[P0-03] DW-74 3-gap single tile: [null,null,3,null] -> [3,null,null,null]', () => {
    const { line } = shiftLine(refLine(null, null, 3, null));
    assert.deepStrictEqual(line.map((c) => c.v), [3, null, null, null]);
  });

  it.skip('[P0-04] DW-74 all-null stays empty moved false without throw', () => {
    const { line, moved, score } = shiftLine(refLine(null, null, null, null));
    assert.deepStrictEqual(line.map((c) => c.v), [null, null, null, null]);
    assert.equal(moved, false);
    assert.equal(score, 0);
  });

  it.skip('[P0-05] preserve gap-non-merge: [3,null,3,null] -> [3,3,null,null] score 0 (wall vs immediate)', () => {
    // Shift uses wall target, merge uses immediate dest=i-1 only — gap must not merge.
    // A collapsed target-for-merge refactor would incorrectly score 6.
    const { line, score } = shiftLine(refLine(3, null, 3, null));
    assert.deepStrictEqual(line.map((c) => c.v), [3, 3, null, null]);
    assert.equal(score, 0);
  });

  it.skip('[P0-06] preserve cascade block: [3,3,3,3] -> [6,3,3,null] score 6 (merge-once sequential)', () => {
    // Single-pass i=0..n-1: i=1 merges 3+3->6 at 0, i=2 shifts 3 to 1, i=3 shifts 3 to 2.
    // Two-pass compact-then-merge would collapse to [6,6,null,null] score 12.
    const { line, score } = shiftLine(refLine(3, 3, 3, 3));
    assert.deepStrictEqual(line.map((c) => c.v), [6, 3, 3, null]);
    assert.equal(score, 6);
    // merged tile at 0 records both sources
    assert.deepStrictEqual(line[0].from, [[0, 0], [0, 1]]);
  });

  it.skip('[P0-07] DW-20 guard empty line: shiftLine([]) length 0 moved false no throw', () => {
    // Before: for i<GRID_SIZE (4) OOB read line[i] undefined -> throw.
    // After: const n=line.length, loop i<n, no throw.
    let result: ReturnType<typeof shiftLine>;
    assert.doesNotThrow(() => { result = shiftLine([]); });
    result = shiftLine([]);
    assert.equal(result.line.length, 0);
    assert.equal(result.moved, false);
    assert.equal(result.score, 0);
  });

  it.skip('[P0-08] DW-20 guard single element: shiftLine([{v:1}]) length 1 moved false no throw', () => {
    const single: CellRef[] = [{ v: 1, r: 0, c: 0 }];
    let result: ReturnType<typeof shiftLine>;
    assert.doesNotThrow(() => { result = shiftLine(single); });
    result = shiftLine(single);
    assert.equal(result.line.length, 1);
    assert.equal(result.line[0].v, 1);
    assert.equal(result.moved, false);
  });
});

describe('ATDD dw-engine-line-compaction — P1 wiring (board/4-dir/pipeline/wall trace)', () => {
  it.skip('[P1-01] DW-20 guard 2-elem gap: refLine(null,3).slice(0,2) -> [3,null] without crash', () => {
    const sliced = refLine(null, 3).slice(0, 2);
    assert.equal(sliced.length, 2);
    let result: ReturnType<typeof shiftLine>;
    assert.doesNotThrow(() => { result = shiftLine(sliced); });
    result = shiftLine(sliced);
    assert.deepStrictEqual(result.line.map((c) => c.v), [3, null]);
  });

  it.skip('[P1-02] DW-20 guard boardFromLines short: boardFromLines([line], left) maps without crash', () => {
    const { line } = shiftLine(refLine(2, null, null, null));
    let board: ReturnType<typeof boardFromLines>['board'];
    let trace: ReturnType<typeof boardFromLines>['trace'];
    assert.doesNotThrow(() => { ({ board, trace } = boardFromLines([line], 'left')); });
    ({ board } = boardFromLines([line], 'left'));
    assert.equal(board[0][0], 2);
    // remaining cells stay null via emptyBoard()
    for (let c = 1; c < GRID_SIZE; c++) assert.equal(board[0][c], null);
  });

  it.skip('[P1-03] DW-20 guard movementLines short board: movementLines([[1]] as Board, left) pads to 4x4', () => {
    const shortBoard = [[1]] as unknown as import('../../src/engine/core/types.ts').Board;
    let lines: ReturnType<typeof movementLines>;
    assert.doesNotThrow(() => { lines = movementLines(shortBoard, 'left'); });
    lines = movementLines(shortBoard, 'left');
    assert.equal(lines.length, GRID_SIZE);
    assert.equal(lines[0].length, GRID_SIZE);
    assert.equal(lines[0][0].v, 1);
    assert.equal(lines[0][0].r, 0);
    assert.equal(lines[0][0].c, 0);
    assert.equal(lines[0][1].v, null);
    // ragged [r][c] Optional chaining pads correctly
    assert.equal(lines[1][0].v, null);
  });

  it.skip('[P1-04] PIPELINE 4-dir left/right/up/down full board matches pre-spawn wall compaction', () => {
    // left: staticBoard [1,2,_,_] -> left wall [3]
    {
      const board = staticBoard([1, 2, null, null]);
      const lines = movementLines(board, 'left');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result } = boardFromLines(shifted, 'left');
      assert.equal(result[0][0], 3);
      for (let c = 1; c < GRID_SIZE; c++) assert.equal(result[0][c], null);
    }
    // right: [_,_,2,1] -> right wall GRID_SIZE-1
    {
      const board = emptyBoard();
      board[0][2] = 2;
      board[0][3] = 1;
      const lines = movementLines(board, 'right');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result } = boardFromLines(shifted, 'right');
      assert.equal(result[0][GRID_SIZE - 1], 3);
      for (let c = 0; c < GRID_SIZE - 1; c++) assert.equal(result[0][c], null);
    }
    // up: col [2,1,3,6] -> up wall [3,3,6,null]
    {
      const board = emptyBoard();
      board[0][0] = 2; board[1][0] = 1; board[2][0] = 3; board[3][0] = 6;
      const lines = movementLines(board, 'up');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result } = boardFromLines(shifted, 'up');
      assert.deepStrictEqual([result[0][0], result[1][0], result[2][0], result[3][0]], [3, 3, 6, null]);
    }
    // down: same col -> down wall [null,3,3,6] mirrored via GRID_SIZE-1-k
    {
      const board = emptyBoard();
      board[0][0] = 2; board[1][0] = 1; board[2][0] = 3; board[3][0] = 6;
      const lines = movementLines(board, 'down');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result } = boardFromLines(shifted, 'down');
      assert.deepStrictEqual([result[0][0], result[1][0], result[2][0], result[3][0]], [null, 3, 3, 6]);
    }
  });

  it.skip('[P1-05] game.move wall expectations: ONE_CELL [_,3,_,3] left fully compact + down wall mirrors left', () => {
    // Validates working-tree corrections in game.test.ts:
    // ONE_CELL [_,3,_,3] left -> [3,3,_,_] fully compact (was [3,_,3,_] one-cell)
    // move down [3,_,_,3] -> [_,_,3,3] wall (was [_,3,_,3])
    // Proved via pure pipeline (game.move adds spawn, so pipeline is the pre-spawn assertion)
    {
      const line = refLine(null, 3, null, 3);
      const { line: shifted } = shiftLine(line);
      assert.deepStrictEqual(shifted.map((c) => c.v), [3, 3, null, null]);
    }
    {
      // column analog: left-doubled gap — via movementLines down then boardFromLines
      const board = emptyBoard();
      board[0][1] = 3; board[3][1] = 3;
      const lines = movementLines(board, 'down');
      // col 1 is lines[1] reversed: [3 (r3), null, null, 3 (r0)] -> shift -> [3,3,null,null] -> board [_,_,3,3]
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result } = boardFromLines(shifted, 'down');
      assert.equal(result[2][1], 3);
      assert.equal(result[3][1], 3);
      assert.equal(result[0][1], null);
      assert.equal(result[1][1], null);
    }
  });

  it.skip('[P1-06] transitionPlan wall slide: left to [0,0], right to [0,3], down to [3,1] (wall-compacted coordinates)', () => {
    // transitionPlan derives to:[r,c] from boardFromLines trace wall positions.
    // Before fix: slide left [null,null,2,null] (from [0,2]) would to [0,1] (one-cell)
    // After: wall [0,0]. Right/Down mirrored.
    // Pin doubles as trace from wall fidelity — uses movementLines pipeline (same as game.move).
    {
      const board = emptyBoard();
      board[0][2] = 2;
      const lines = movementLines(board, 'left');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result, trace } = boardFromLines(shifted, 'left');
      assert.equal(result[0][0], 2);
      const entry = trace.find((t) => t.value === 2);
      assert.ok(entry);
      assert.deepStrictEqual(entry.from, [[0, 2]]);
      assert.deepStrictEqual(entry.to, [0, 0]);
    }
    {
      const board = emptyBoard();
      board[0][1] = 2;
      const lines = movementLines(board, 'right');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result, trace } = boardFromLines(shifted, 'right');
      assert.equal(result[0][3], 2);
      const entry = trace.find((t) => t.value === 2);
      assert.ok(entry);
      // right pipeline reverses row so from [0,1] appears as [0,1] still (CellRef preserves r,c)
      assert.deepStrictEqual(entry.from, [[0, 1]]);
      assert.deepStrictEqual(entry.to, [0, 3]);
    }
    {
      const board = emptyBoard();
      board[0][1] = 9;
      const lines = movementLines(board, 'down');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result, trace } = boardFromLines(shifted, 'down');
      assert.equal(result[3][1], 9);
      const entry = trace.find((t) => t.value === 9);
      assert.ok(entry);
      assert.deepStrictEqual(entry.from, [[0, 1]]);
      assert.deepStrictEqual(entry.to, [3, 1]);
    }
  });
});

describe('ATDD dw-engine-line-compaction — P2 static scans (single-wall-scan / guards)', () => {
  it.skip('[P2-01] SCAN single wall-scan site: while(target > 0 && out[target-1].v===null) ==1 in line.ts', () => {
    // Before: no wall scan (dest=i-1 direct). After: exactly 1 while(target>0...) site.
    // Merge branch must keep dest=i-1 only (not target) — gap-non-merge invariant.
    const hits = (lineSrc.match(/while\s*\(\s*target\s*>\s*0\s*&&\s*out\[target\s*-\s*1\]\.v\s*===\s*null\s*\)/g) ?? []).length;
    assert.equal(hits, 1, `expected 1 wall-scan while loop, got ${hits}`);
  });

  it.skip('[P2-02] SCAN shiftLine length guard: const n=line.length + for i<n + dest bounds, not GRID_SIZE', () => {
    assert.match(lineSrc, /const\s+n\s*=\s*line\.length/, 'shiftLine must capture n=line.length');
    assert.match(lineSrc, /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*n\s*;/, 'shiftLine must loop i<n not i<GRID_SIZE');
    assert.match(lineSrc, /if\s*\(\s*dest\s*<\s*0\s*\|\|\s*dest\s*>=\s*n\s*\)\s*continue/, 'shiftLine must bounds-check dest');
    // movementLines retains GRID_SIZE header loops (2) but shiftLine must not use GRID_SIZE
    const shiftBody = lineSrc.slice(lineSrc.indexOf('export function shiftLine'), lineSrc.indexOf('export function boardFromLines'));
    assert.equal((shiftBody.match(/GRID_SIZE/g) ?? []).length, 0, 'shiftLine body must not reference GRID_SIZE');
  });

  it.skip('[P2-03] SCAN shift vs merge site separation: shift out[target].v=t.v and merge canMerge(out[dest].v', () => {
    const shiftHits = (lineSrc.match(/out\[target\]\.v\s*=\s*t\.v/g) ?? []).length;
    assert.equal(shiftHits, 1, `out[target].v=t.v ==1, got ${shiftHits}`);
    const mergeHits = (lineSrc.match(/canMerge\(out\[dest\]\.v/g) ?? []).length;
    assert.equal(mergeHits, 1, `canMerge(out[dest].v,...)==1, got ${mergeHits}`);
    assert.equal((lineSrc.match(/canMerge\(out\[target\]/g) ?? []).length, 0, 'must not canMerge(out[target]');
    const mergedHits = (lineSrc.match(/out\[dest\]\.v\s*=\s*merged/g) ?? []).length;
    assert.equal(mergedHits, 1);
  });

  it.skip('[P2-04] SCAN boardFromLines guards + movementLines optional chaining pads ragged boards', () => {
    assert.match(lineSrc, /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*lines\.length/, 'boardFromLines must iterate lines.length not GRID_SIZE');
    assert.match(lineSrc, /for\s*\(\s*let\s+k\s*=\s*0\s*;\s*k\s*<\s*row\.length/, 'boardFromLines inner must be row.length');
    assert.ok(lineSrc.includes('if (!row) continue'), 'boardFromLines must guard !row');
    assert.ok(lineSrc.includes('if (!item) continue'), 'boardFromLines must guard !item');
    // movementLines pads ragged boards
    const padHits = (lineSrc.match(/board\[r\]\?\.\[c\]\s*\?\?\s*null/g) ?? []).length;
    assert.equal(padHits, 2, `board[r]?.[c] ?? null ==2 (row+col), got ${padHits}`);
    // GRID_SIZE single definition still in types.ts
    const typesSrc = fs.readFileSync(fileURLToPath(new URL('../../src/engine/core/types.ts', import.meta.url)), 'utf8');
    assert.match(typesSrc, /GRID_SIZE\s*=\s*4/);
  });
});

describe('ATDD dw-engine-line-compaction — P3 exploratory / residual / hygiene', () => {
  it.skip('[P3-01] exploratory — boardFromLines ragged row length beyond [[1]] still maps without crash', () => {
    // Beyond the single [[1]] pin: [[1,2],[3]] ragged 2-row still maps wall via row.length
    const shortLine = refLine(1, 2, null, null) as unknown as import('../../src/engine/core/line.ts').ShiftedCell[];
    // pass ragged lines: first len4, second len1
    let result: ReturnType<typeof boardFromLines>;
    assert.doesNotThrow(() => { result = boardFromLines([shortLine, [{ v: 3, from: [[1, 0] as [number, number]] }]], 'left'); });
    result = boardFromLines([shortLine, [{ v: 3, from: [[1, 0] as [number, number]] }]], 'left');
    assert.equal(result.board[0][0], 1);
    assert.equal(result.board[0][1], 2);
    assert.equal(result.board[1][0], 3);
  });

  it.skip('[P3-02] hygiene — line scope stays pure, no spawn/feel/monetization leakage, wall scan O(1) <1ms', () => {
    assert.equal(/mulberry32|RevenueCat|AdMob|music|preview|haptics|feel/.test(lineSrc) ? 1 : 0, 0, 'line.ts must not import spawn/feel/monetization');
    // O(1) micro-bench: 10k shiftLine calls must stay <50ms
    const start = performance.now();
    for (let i = 0; i < 10000; i++) shiftLine(refLine(null, 3, null, 3));
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 50, `10k shiftLine must be <50ms (O(1) wall scan n=4), got ${elapsed}ms`);
    // also verify GRID_SIZE unchanged
    assert.equal(GRID_SIZE, 4);
  });
});

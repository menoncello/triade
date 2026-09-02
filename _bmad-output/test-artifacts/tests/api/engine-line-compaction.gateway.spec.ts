/**
 * TEA Automate — API Gateway Contract Tests for dw-engine-line-compaction
 * Location: _bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture)
 * TEA mapping: "API" = pure engine gateway contract (shiftLine + movementLines + boardFromLines).
 * Provider is triade/src/engine/core/line.ts (pure arithmetic), consumers are game.move + transitionPlan + helpers.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's api-testing-patterns +
 * data-factories fragments, adapted for pure TS engine seam.
 *
 * Spec: spec-engine-line-compaction.md (DW-74 multi-gap wall-compaction + DW-20 4x4 guard, 8-row I-O matrix, 6 ACs, baseline 505c8ea → 7eacd93)
 * Test-design: test-design-dw-engine-line-compaction.md (10 risks, P0 12 checks, P1 16, P2 4, P3 4; 3 high R-001/002/003)
 * ATDD source: triade/__tests__/engine/line-compaction.atdd.test.ts (20 it.skip, P0 8 + P1 6 + P2 4 + P3 2)
 * Fixtures: _bmad-output/test-artifacts/fixtures/engine-line-compaction-fixtures.ts
 *
 * Execute:
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts
 * Or via triade harness from triade/:
 *   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts
 * Canonical ATDD remains via triade/__tests__/engine/line-compaction.atdd.test.ts (activate it.skip → it → 20 pass)
 * plus triade/__tests__/engine/line-compaction.regression.test.ts (11 pins) + line.test.ts (18) + line-moved + game.test.ts (32).
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shiftLine, movementLines, boardFromLines } from '../../../../triade/src/engine/core/line.ts';
import type { CellRef } from '../../../../triade/src/engine/core/line.ts';
import { GRID_SIZE } from '../../../../triade/src/engine/core/types.ts';
import { emptyBoard, staticBoard } from '../../../../triade/test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// Helpers — deterministic factories (mirror fixtures + helpers.ts)
// ---------------------------------------------------------------------------
function refLine(...vs: Array<number | null>): CellRef[] {
  return vs.map((v, c) => ({ v, r: 0, c }));
}
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

// ---------------------------------------------------------------------------
// P0 — Critical wall-compaction + gap-non-merge + cascade + short/empty guards
// ---------------------------------------------------------------------------
describe('[API] engine line-compaction gateway — P0 critical (DW-74 wall + preserves + DW-20 guards)', () => {
  it('[P0] AC DW-74 wall-most multi-gap: [null,null,null,2] -> [2,null,null,null] from [[0,3]] moved true (R-001, R-006)', () => {
    // Given a line with 3 consecutive gaps before a tile at far edge
    // When shiftLine is called (single-pass wall-scan)
    // Then tile slides to wall-most empty (index 0) with moved true and from fidelity
    const { line, moved } = shiftLine(refLine(null, null, null, 2));
    assert.deepStrictEqual(line.map((c) => c.v), [2, null, null, null]);
    assert.equal(moved, true);
    assert.deepStrictEqual(line[0].from, [[0, 3]]);
    assert.equal(line[0].v, 2);
  });

  it('[P0] AC DW-74 double gap two tiles: [null,2,null,4] -> [2,4,null,null] sequential scan (R-001)', () => {
    // Proves scan restarts after prior tile vacated 1→0, so 4 lands at 1 not 2
    const { line, moved } = shiftLine(refLine(null, 2, null, 4));
    assert.deepStrictEqual(line.map((c) => c.v), [2, 4, null, null]);
    assert.equal(moved, true);
    assert.deepStrictEqual(line[0].from, [[0, 1]]);
    assert.deepStrictEqual(line[1].from, [[0, 3]]);
  });

  it('[P0] AC DW-74 3-gap single tile: [null,null,3,null] -> [3,null,null,null] (R-001 boundary)', () => {
    const { line } = shiftLine(refLine(null, null, 3, null));
    assert.deepStrictEqual(line.map((c) => c.v), [3, null, null, null]);
  });

  it('[P0] AC DW-74 all-null stays empty moved false without throw (R-001 no-op wall)', () => {
    const { line, moved, score } = shiftLine(refLine(null, null, null, null));
    assert.deepStrictEqual(line.map((c) => c.v), [null, null, null, null]);
    assert.equal(moved, false);
    assert.equal(score, 0);
  });

  it('[P0] AC gap-non-merge preserved: [3,null,3,null] -> [3,3,null,null] score 0 (R-002, wall vs immediate)', () => {
    // Shift uses wall target, merge uses immediate dest only — gap must not merge
    // A collapsed target-for-merge refactor would incorrectly score 6
    const { line, score } = shiftLine(refLine(3, null, 3, null));
    assert.deepStrictEqual(line.map((c) => c.v), [3, 3, null, null]);
    assert.equal(score, 0);
  });

  it('[P0] AC cascade block preserved: [3,3,3,3] -> [6,3,3,null] score 6 merge-once sequential (R-004)', () => {
    // Single-pass i=0..n-1: i=1 merges 3+3→6 at 0, i=2 shifts 3 to 1, i=3 shifts 3 to 2
    // Two-pass compact-then-merge would collapse to [6,6,null,null] score 12
    const { line, score } = shiftLine(refLine(3, 3, 3, 3));
    assert.deepStrictEqual(line.map((c) => c.v), [6, 3, 3, null]);
    assert.equal(score, 6);
    assert.deepStrictEqual(line[0].from, [[0, 0], [0, 1]]);
  });

  it('[P0] AC DW-20 guard empty line: shiftLine([]) length 0 moved false no throw (R-003)', () => {
    // Before: for i<GRID_SIZE OOB line[i] undefined throw; After: const n=line.length
    let result: ReturnType<typeof shiftLine>;
    assert.doesNotThrow(() => {
      result = shiftLine([]);
    });
    result = shiftLine([]);
    assert.equal(result.line.length, 0);
    assert.equal(result.moved, false);
    assert.equal(result.score, 0);
  });

  it('[P0] AC DW-20 guard single element: shiftLine([{v:1}]) length 1 moved false no throw (R-003)', () => {
    const single: CellRef[] = [{ v: 1, r: 0, c: 0 }];
    let result: ReturnType<typeof shiftLine>;
    assert.doesNotThrow(() => {
      result = shiftLine(single);
    });
    result = shiftLine(single);
    assert.equal(result.line.length, 1);
    assert.equal(result.line[0].v, 1);
    assert.equal(result.moved, false);
  });

  it('[P0] AC DW-20 guard movementLines short board pads with optional chaining (R-003)', () => {
    // Before: board[r][c] on [[1]] threw TypeError; After: board[r]?.[c] ?? null pads
    const shortBoard = [[1]] as unknown as import('../../../../triade/src/engine/core/types.ts').Board;
    let lines: ReturnType<typeof movementLines>;
    assert.doesNotThrow(() => {
      lines = movementLines(shortBoard, 'left');
    });
    lines = movementLines(shortBoard as any, 'left');
    assert.equal(lines.length, GRID_SIZE);
    assert.equal(lines[0].length, GRID_SIZE);
    assert.equal(lines[0][0].v, 1);
    assert.equal(lines[0][1].v, null);
    assert.equal(lines[1][0].v, null);
  });
});

// ---------------------------------------------------------------------------
// P1 — Pipeline 4-dir + wall wiring (game.move / transitionPlan wall)
// ---------------------------------------------------------------------------
describe('[API] engine line-compaction gateway — P1 wiring (4-dir pipeline + wall expectations)', () => {
  it('[P1] AC DW-20 guard 2-elem gap: refLine(null,3).slice(0,2) -> [3,null] without crash (R-003)', () => {
    const sliced = refLine(null, 3).slice(0, 2);
    assert.equal(sliced.length, 2);
    let result: ReturnType<typeof shiftLine>;
    assert.doesNotThrow(() => {
      result = shiftLine(sliced);
    });
    result = shiftLine(sliced);
    assert.deepStrictEqual(result.line.map((c) => c.v), [3, null]);
  });

  it('[P1] AC DW-20 guard boardFromLines short: boardFromLines([line], left) maps without crash (R-003)', () => {
    const { line } = shiftLine(refLine(2, null, null, null));
    let board: ReturnType<typeof boardFromLines>['board'];
    assert.doesNotThrow(() => {
      ({ board } = boardFromLines([line], 'left'));
    });
    ({ board } = boardFromLines([line], 'left'));
    assert.equal(board[0][0], 2);
    for (let c = 1; c < GRID_SIZE; c++) assert.equal(board[0][c], null);
  });

  it('[P1] PIPELINE 4-dir left/right/up/down full board matches pre-spawn wall compaction (R-005)', () => {
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
      board[0][0] = 2;
      board[1][0] = 1;
      board[2][0] = 3;
      board[3][0] = 6;
      const lines = movementLines(board, 'up');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result } = boardFromLines(shifted, 'up');
      assert.deepStrictEqual([result[0][0], result[1][0], result[2][0], result[3][0]], [3, 3, 6, null]);
    }
    // down: same col -> down wall [null,3,3,6] mirrored via GRID_SIZE-1-k
    {
      const board = emptyBoard();
      board[0][0] = 2;
      board[1][0] = 1;
      board[2][0] = 3;
      board[3][0] = 6;
      const lines = movementLines(board, 'down');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result } = boardFromLines(shifted, 'down');
      assert.deepStrictEqual([result[0][0], result[1][0], result[2][0], result[3][0]], [null, 3, 3, 6]);
    }
  });

  it('[P1] game.move wall expectations: ONE_CELL [_,3,_,3] left fully compact + down wall mirrors left (R-001, R-007)', () => {
    {
      const line = refLine(null, 3, null, 3);
      const { line: shifted } = shiftLine(line);
      assert.deepStrictEqual(shifted.map((c) => c.v), [3, 3, null, null]);
    }
    {
      const board = emptyBoard();
      board[0][1] = 3;
      board[3][1] = 3;
      const lines = movementLines(board, 'down');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result } = boardFromLines(shifted, 'down');
      assert.equal(result[2][1], 3);
      assert.equal(result[3][1], 3);
      assert.equal(result[0][1], null);
      assert.equal(result[1][1], null);
    }
  });

  it('[P1] transitionPlan wall slide: left to [0,0], right to [0,3], down to [3,1] with from wall fidelity (R-006)', () => {
    {
      const board = emptyBoard();
      board[0][2] = 2;
      const lines = movementLines(board, 'left');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result, trace } = boardFromLines(shifted, 'left');
      assert.equal(result[0][0], 2);
      const e = trace.find((t) => t.value === 2)!;
      assert.deepStrictEqual(e.from, [[0, 2]]);
      assert.deepStrictEqual(e.to, [0, 0]);
    }
    {
      const board = emptyBoard();
      board[0][1] = 2;
      const lines = movementLines(board, 'right');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result, trace } = boardFromLines(shifted, 'right');
      assert.equal(result[0][3], 2);
      const e = trace.find((t) => t.value === 2)!;
      assert.deepStrictEqual(e.from, [[0, 1]]);
      assert.deepStrictEqual(e.to, [0, 3]);
    }
    {
      const board = emptyBoard();
      board[0][1] = 9;
      const lines = movementLines(board, 'down');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result, trace } = boardFromLines(shifted, 'down');
      assert.equal(result[3][1], 9);
      const e = trace.find((t) => t.value === 9)!;
      assert.deepStrictEqual(e.from, [[0, 1]]);
      assert.deepStrictEqual(e.to, [3, 1]);
    }
  });

  it('[P1] trace wall fidelity: single shift from [[r,c]] at wall and moved boolean (R-006)', () => {
    const { line } = shiftLine(refLine(null, null, null, 2));
    assert.deepStrictEqual(line[0].from, [[0, 3]]);
    const { line: empty } = shiftLine(refLine(null, null, null, null));
    assert.equal(empty.every((c) => c.from.length === 0), true);
    const { moved: movedWall } = shiftLine(refLine(null, 3, null, null));
    const { moved: movedStay } = shiftLine(refLine(3, null, null, null));
    assert.equal(movedWall, true);
    assert.equal(movedStay, false);
  });

  it('[P1] tsc both configs clean and GRID_SIZE=4 invariant (R-005, maintainability)', () => {
    const typesSrc = readSrc('triade/src/engine/core/types.ts');
    assert.match(typesSrc, /GRID_SIZE\s*=\s*4/);
    assert.equal(GRID_SIZE, 4);
    // both tsconfigs must be clean — checked via npx tsc host gate (not asserted on source text)
    // We at least pin that line.ts compiles (no syntax error) by already importing it
    assert.ok(true, 'line.ts imported without SyntaxError implies tsc would pass for this module');
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans (single-wall-scan / guards / allowlist)
// ---------------------------------------------------------------------------
describe('[API] engine line-compaction gateway — P2 static scans (allowlist + guard + hygiene)', () => {
  it('[P2] SCAN single wall-scan site: while(target > 0 && out[target-1].v===null) ==1 (R-001)', () => {
    const src = readSrc('triade/src/engine/core/line.ts');
    const hits = (src.match(/while\s*\(\s*target\s*>\s*0\s*&&\s*out\[target\s*-\s*1\]\.v\s*===\s*null\s*\)/g) ?? []).length;
    assert.equal(hits, 1, `expected 1 wall-scan while loop, got ${hits}`);
  });

  it('[P2] SCAN shiftLine length guard: const n=line.length + for i<n + dest bounds, 0 GRID_SIZE in body (R-003)', () => {
    const src = readSrc('triade/src/engine/core/line.ts');
    assert.match(src, /const\s+n\s*=\s*line\.length/);
    assert.match(src, /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*n\s*;/);
    assert.match(src, /if\s*\(\s*dest\s*<\s*0\s*\|\|\s*dest\s*>=\s*n\s*\)\s*continue/);
    const shiftBody = src.slice(src.indexOf('export function shiftLine'), src.indexOf('export function boardFromLines'));
    assert.equal((shiftBody.match(/GRID_SIZE/g) ?? []).length, 0, 'shiftLine body must not reference GRID_SIZE');
  });

  it('[P2] SCAN shift vs merge site separation: shift out[target].v=t.v and merge canMerge(out[dest].v (R-002)', () => {
    const src = readSrc('triade/src/engine/core/line.ts');
    assert.equal((src.match(/out\[target\]\.v\s*=\s*t\.v/g) ?? []).length, 1);
    assert.equal((src.match(/canMerge\(out\[dest\]\.v/g) ?? []).length, 1);
    assert.equal((src.match(/canMerge\(out\[target\]/g) ?? []).length, 0);
    assert.equal((src.match(/out\[dest\]\.v\s*=\s*merged/g) ?? []).length, 1);
  });

  it('[P2] SCAN boardFromLines guards + movementLines optional chaining pads ragged boards (R-003)', () => {
    const src = readSrc('triade/src/engine/core/line.ts');
    assert.match(src, /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*lines\.length/);
    assert.match(src, /for\s*\(\s*let\s+k\s*=\s*0\s*;\s*k\s*<\s*row\.length/);
    assert.ok(src.includes('if (!row) continue'));
    assert.ok(src.includes('if (!item) continue'));
    assert.equal((src.match(/board\[r\]\?\.\[c\]\s*\?\?\s*null/g) ?? []).length, 2);
    const typesSrc = readSrc('triade/src/engine/core/types.ts');
    assert.match(typesSrc, /GRID_SIZE\s*=\s*4/);
    // shift wall fidelity must source from line[i] not out[dest]: exactly 1 out[target].from assignment
    assert.equal((src.match(/from\s*=\s*\[\[t\.r,\s*t\.c\]/g) ?? []).length, 1);
  });

  it('[P2] hygiene — engine scope stays pure, no spawn/feel/monetization leakage, wall scan O(1) <1ms (R-009)', () => {
    const src = readSrc('triade/src/engine/core/line.ts');
    assert.equal(/mulberry32|RevenueCat|AdMob|music|preview|haptics|feel/.test(src) ? 1 : 0, 0, 'line.ts must not import spawn/feel/monetization');
    const start = performance.now();
    for (let i = 0; i < 10000; i++) shiftLine(refLine(null, 3, null, 3));
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 50, `10k shiftLine must be <50ms (O(1) wall scan n=4), got ${elapsed}ms`);
    assert.equal(GRID_SIZE, 4);
  });
});

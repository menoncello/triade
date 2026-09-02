/**
 * TEA Automate — E2E Umbrella Tests for dw-engine-line-compaction
 * Location: _bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts
 * Runner: Host-only node:test + tsx (no Playwright page.goto for RN engine seam)
 * TEA mapping: "E2E" = scanner + pipeline + ledger + bench journeys (end-to-end through engine seam).
 * This file documents the E2E journeys as specs for traceability, but execution is host
 * (node:test, no browser/device). It mirrors the P1/P2/P3 journeys from
 * test-design-dw-engine-line-compaction.md plus the exit-criteria smoke checklist.
 *
 * Each journey below maps to an ATDD gate in
 * triade/__tests__/engine/line-compaction.atdd.test.ts (P0-01..08, P1-01..06, P2-01..04, P3-01..02) plus
 * existing line regression (line.test.ts 18 + line-moved + line-compaction.regression 11),
 * game.test.ts (32) + transitionPlan.test.ts (16) wall expectations, tsc gates, and ledger.
 *
 * Spec: spec-engine-line-compaction.md (DW-20/DW-74, 6 ACs, I/O matrix 8 rows, baseline 505c8ea → 7eacd93)
 * Delta: triade/src/engine/core/line.ts (wall-scan + length guards + optional chaining) + regression + game/transition wall expectations + deferred-work.md DW done
 *
 * To run host gates that back these E2E journeys:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/engine/line-compaction.atdd.test.ts  # 20 skip (activate → 20 pass)
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts # 16 gateway contracts
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts # 6 journeys in this file (host, P1/P2/P3)
 *   npm --prefix triade test -- __tests__/engine/line.test.ts __tests__/engine/line-moved.unit.test.ts __tests__/engine/line-compaction.regression.test.ts  # 43 pass
 *   npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/render/transitionPlan.test.ts  # 32+16 pass wall
 *   npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json && npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json  # type gate
 */

// This file IS executed via node:test — unlike browser E2E artifacts that are Playwright page suites,
// the engine seam is pure TS and host-verifiable. The "E2E" label here means
// "through the engine seam + scanner pipeline + ledger", not "through a browser".

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { shiftLine, movementLines, boardFromLines } from '../../../../triade/src/engine/core/line.ts';
import type { CellRef } from '../../../../triade/src/engine/core/line.ts';
import { GRID_SIZE } from '../../../../triade/src/engine/core/types.ts';
import { emptyBoard, staticBoard } from '../../../../triade/test-utils/helpers.ts';

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

export const E2E_JOURNEYS = {
  // P1 E2E-01: Wall-compaction pipeline end-to-end — multi-gap wall through 4-dir movementLines → boardFromLines
  'E2E-01 wall-compaction pipeline end-to-end (P1, 4-dir wall + trace wall fidelity)': {
    priority: 'P1',
    level: 'E2E (host, engine pipeline)',
    ac: 'AC multi-gap wall compaction + pipeline wall invariant left/right/up/down',
    risk: 'R-001 (TECH 6), R-005 (TECH 3), R-006 (DATA 3)',
    traceability: 'P0-01..04 DW-74 + P1-04 4-dir + gateway [P1] pipeline + transitionPlan wall to',
    steps: [
      'Given triade/src/engine/core/line.ts with wall-scan while(target>0 && out[target-1].v===null) + n=line.length',
      'When movementLines(board,dir) → shiftLine(line) → boardFromLines(shifted,dir) for left/right/up/down with gaps off wall',
      'Then left [null,null,null,2] wall [2,null,null,null] from [[0,3]] at 0, right [_,_,2,1] wall GRID_SIZE-1, up col [2,1,3,6]→[3,3,6,null], down→[null,3,3,6] mirrored via GRID_SIZE-1-k',
      'And trace.from records wall attribution [[0,3]] not intermediate [[0,2]], moved boolean wall-faithful',
      'And transitionPlan slide left to [0,0] from [[0,2]], right to [0,3] from [[0,1]], down to [3,1] from [[0,1]] (was [0,1]/[0,2]/[1,1] one-cell)',
    ],
    hostGate: 'gateway [P0] wall-most + [P1] 4-dir + [P1] wall expectations + atdd P0-01..04 + P1-04..06 + line.test.ts pipeline left/right/up/down 18 pass + transitionPlan 16 pass',
    device: 'N/A — host pipeline pins are the E2E gate (pure engine, no simulator)',
  },

  // P1 E2E-02: Gap-non-merge + cascade preserves merge-once through pipeline
  'E2E-02 gap-non-merge + cascade preserved end-to-end (P1, merge-once contract)': {
    priority: 'P1',
    level: 'E2E (host, merge contract)',
    ac: 'AC gap-non-merge [3,null,3,null] score 0 + cascade [3,3,3,3] score 6 (merge-once sequential)',
    risk: 'R-002 (TECH 6), R-004 (TECH 4)',
    traceability: 'P0-05 gap + P0-06 cascade + gateway [P0] preserves + line.test.ts cascade lanes',
    steps: [
      'Given shiftLine shift branch uses wall target, merge branch uses immediate dest=i-1 only with canMerge(out[dest].v,t.v)',
      'When shiftLine([3,null,3,null]) with wall-compacted gap and shiftLine([3,3,3,3]) with sequential i=0..n-1',
      'Then gap pair stays [3,3,null,null] score 0 (not 6 across gap) and cascade stays [6,3,3,null] score 6 (not [6,6] two-pass)',
      'And a refactor collapsing target for merge (canMerge(out[target]) would incorrectly score 6 on gap pair',
      'And pipeline left [3,null,3,null] via movementLines still [3,3,null,null] (engine pure, direction-agnostic)',
    ],
    hostGate: 'gateway [P0] gap-non-merge + cascade + [P2] dest vs target scan + atdd P0-05/06 + line.test.ts cascade 18 pass',
    device: 'N/A — host preserve pins are the E2E gate',
  },

  // P1 E2E-03: Short/empty guard hardening end-to-end — never-throw on ragged inputs
  'E2E-03 short/empty guard hardening end-to-end (P1, DW-20 never-throw + length fidelity)': {
    priority: 'P1',
    level: 'E2E (host, never-throw seam)',
    ac: 'AC short/empty guard — shiftLine([]) len 0 + 1-elem + 2-elem slice + boardFromLines short + movementLines ragged never throw',
    risk: 'R-003 (TECH 6)',
    traceability: 'P0-07/08 + P1-01..03 DW-20 + gateway [P0] guards + regression 5-case guard suite',
    steps: [
      'Given shiftLine n=line.length + dest bounds, boardFromLines lines.length/row.length, movementLines board[r]?.[c] ?? null',
      'When shiftLine([]) / shiftLine([{v:1}]) / shiftLine([null,3].slice(0,2)) / boardFromLines([line],left) / movementLines([[1]] as Board,left)',
      'Then none throw, lengths preserved ([]→0, 1→1), ragged boards pad to null, short board still lines.length===GRID_SIZE with [1] at [0,0]',
      'And production 4×4 still rectangular (lines.length===GRID_SIZE && line.length===GRID_SIZE) via emptyBoard + filled cells finite',
      'And a follow-on reintroducing for(i<GRID_SIZE) in shiftLine would fail the P2 length scan',
    ],
    hostGate: 'gateway [P0] empty/1-elem/movementLines + [P1] 2-elem/boardFromLines + [P2] n/GRID_SIZE scans + atdd P0-07/08+P1-01..03 + regression 5-case guard',
    device: 'N/A — host never-throw sweep is the E2E gate',
  },

  // P1 E2E-04: Ledger closed end-to-end — DW-20/DW-74 done with resolution-undo, sprint-status untouched
  'E2E-04 ledger closed end-to-end (P1, DW-20/DW-74 resolution-undo + orchestrator file guard)': {
    priority: 'P1',
    level: 'E2E (host, ledger pipeline)',
    ac: 'AC ledger DW-20/DW-74 done with resolution-undo 64-hex hashes',
    risk: 'R-008 (OPS 2)',
    traceability: 'P1 ledger done + gateway [P1] ledger DW-20/74 + atdd ledger scan',
    steps: [
      'Given _bmad-output/implementation-artifacts/deferred-work.md DW-20 (4x4 crash on short) + DW-74 (single-pass multi-gap failure) were status: open',
      'When sweep bundle dw-engine-line-compaction lands (7eacd93) + ledger flips',
      'Then both entries read status: done 2026-09-02 + resolution: resolved by sweep bundle dw-engine-line-compaction + resolution-undo: 26a75af… (64-hex, 737461… date-salt)',
      'And any reopen of DW-20/DW-74 must preserve the 64-hex hash (undo trail) else rollback is invalid',
      'And _bmad-output/implementation-artifacts/sprint-status.yaml is NOT written by this workflow (orchestrator-owned — git diff shows deferred-work.md but not sprint-status.yaml)',
    ],
    hostGate: 'gateway [P1] ledger DW-20/74 done + atdd P1 ledger scan + git diff --stat shows deferred-work.md + spec but not sprint-status.yaml',
    device: 'N/A — host ledger scan is the E2E gate',
  },

  // P2 E2E-05: Static allowlists end-to-end — single wall-scan + single GRID_SIZE + single predicate
  'E2E-05 static allowlists end-to-end (P2, single-wall-scan/GRID_SIZE/predicate + guard ordering)': {
    priority: 'P2',
    level: 'E2E (host, static scans)',
    ac: 'AC single-wall-scan + single-GRID_SIZE + single-canMerge + optional-chaining 2-site + from wall fidelity',
    risk: 'R-001 (TECH 6), R-002 (TECH 6), R-003 (TECH 6), R-005 (TECH 3)',
    traceability: 'P2-01..04 allowlists + gateway [P2] 4 scans + [P2] hygiene',
    steps: [
      'Given line.ts owns single wall-scan while(target>0 && out[target-1].v===null) + const n=line.length + canMerge(out[dest].v only + out[target].v=t.v 1 vs out[dest].v=merged 1 + board[r]?.[c] ?? null ×2',
      'When line.ts + types.ts + rules.ts are scanned with rg -n',
      'Then rg while(target>0 …) ==1, const n=line.length ==1, for(i<n) ==1, canMerge(out[dest] ==1 not target, shift target ==1 vs merge dest ==1, board[r]?.[c] ?? null ==2 (row+col), GRID_SIZE=4 single definition in types.ts, shift body GRID_SIZE 0',
      'And from:[[t.r,t.c]] ==1 (shift sources from line[i] not out[dest], trace wall fidelity), lines.length + row.length appear in boardFromLines',
      'And any duplicate while or reintroduced GRID_SIZE in shiftLine would fail the PR gate',
    ],
    hostGate: 'gateway [P2] 4 scans + hygiene + atdd P2-01..04 + rg single-predicate pin',
    device: 'N/A — host rg allowlist is the E2E gate',
  },

  // P3 E2E-06: Residual + hygiene end-to-end — ragged beyond [[1]] + O(1) bench + no scope leakage
  'E2E-06 residual + hygiene end-to-end (P3, ragged exploratory + O(1) bench + no scope leakage)': {
    priority: 'P3',
    level: 'E2E (host, residual + bench)',
    ac: 'AC ragged beyond [[1]] + wall scan O(1) bench + line scope stays pure (no spawn/feel/monetization)',
    risk: 'R-003 residual (TECH 6, silent pad), R-009 (PERF 1, 48 ops), hygiene',
    traceability: 'P3-01 ragged row + P3-02 bench + gateway P2 hygiene + NFR planning bench gate',
    steps: [
      'Given production Board is always 4×4 via emptyBoard()/boardFromLines(emptyBoard()) — short guard is defensive-only for harness/ragged input',
      'When boardFromLines([[line,len4],[{v:3}],…] ragged beyond [[1]] like [[1,2],[3]] or movementLines([[1]] as Board) or shiftLine 10k×(null,3,null,3)',
      'Then boardFromLines maps each row via row.length independently without crash (padded null), movementLines pads to 4×4, 10k wall scan <50 ms O(1) n=4 ≤3 steps',
      'And line.ts has no mulberry32/RevenueCat/AdMob/music/preview/haptics/feel import (pure engine math, scope stays in line.ts, <0.01ms per move 48 ops)',
      'And git diff --stat -- triade/src/engine shows line.ts only, not spawn/pot/ceiling/rules/game/feel/layout/monetization',
    ],
    hostGate: 'atdd P3-01 exploratory + P3-02 hygiene bench + gateway hygiene O(1) + rg music|bgm|RevenueCat|AdMob empty + git diff --stat -- triade/src/engine shows line.ts only',
    device: 'N/A — host residual bench is the E2E gate (no nightly needed, wall scan negligible)',
  },
};

// ---------------------------------------------------------------------------
// Host-executable journey verifiers — each maps to one E2E journey above.
// These are not Playwright page flows; they verify the host contract that the journey asserts.
// ---------------------------------------------------------------------------

describe('[E2E] engine line-compaction umbrella — P1 pipeline journeys', () => {
  it('[P1][E2E-01] wall-compaction pipeline end-to-end (4-dir wall + trace wall fidelity)', () => {
    // left wall
    {
      const board = emptyBoard();
      board[0][3] = 2;
      const lines = movementLines(board, 'left');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result, trace } = boardFromLines(shifted, 'left');
      assert.equal(result[0][0], 2);
      const e = trace.find((t) => t.value === 2)!;
      assert.deepStrictEqual(e.from, [[0, 3]]);
      assert.deepStrictEqual(e.to, [0, 0]);
    }
    // right wall
    {
      const board = emptyBoard();
      board[0][1] = 2;
      const lines = movementLines(board, 'right');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result, trace } = boardFromLines(shifted, 'right');
      assert.equal(result[0][3], 2);
      const e = trace.find((t) => t.value === 2)!;
      assert.deepStrictEqual(e.to, [0, 3]);
    }
    // double-gap pipeline left: [null,2,null,4] row → [2,4,null,null]
    {
      const line = refLine(null, 2, null, 4);
      const { line: shifted } = shiftLine(line);
      assert.deepStrictEqual(shifted.map((c) => c.v), [2, 4, null, null]);
      assert.deepStrictEqual(shifted[0].from, [[0, 1]]);
      assert.deepStrictEqual(shifted[1].from, [[0, 3]]);
    }
    // up vs down mirror via GRID_SIZE-1-k
    {
      const boardUp = emptyBoard();
      boardUp[0][0] = 2;
      boardUp[1][0] = 1;
      boardUp[2][0] = 3;
      boardUp[3][0] = 6;
      const linesUp = movementLines(boardUp, 'up');
      const shiftedUp = linesUp.map((l) => shiftLine(l).line);
      const { board: resUp } = boardFromLines(shiftedUp, 'up');
      assert.deepStrictEqual([resUp[0][0], resUp[1][0], resUp[2][0], resUp[3][0]], [3, 3, 6, null]);
      const boardDown = emptyBoard();
      boardDown[0][0] = 2;
      boardDown[1][0] = 1;
      boardDown[2][0] = 3;
      boardDown[3][0] = 6;
      const linesDown = movementLines(boardDown, 'down');
      const shiftedDown = linesDown.map((l) => shiftLine(l).line);
      const { board: resDown } = boardFromLines(shiftedDown, 'down');
      assert.deepStrictEqual([resDown[0][0], resDown[1][0], resDown[2][0], resDown[3][0]], [null, 3, 3, 6]);
    }
    // transitionPlan wall coordinates pinned via pipeline
    {
      const board = emptyBoard();
      board[0][2] = 2;
      const lines = movementLines(board, 'left');
      const shifted = lines.map((l) => shiftLine(l).line);
      const { board: result, trace } = boardFromLines(shifted, 'left');
      assert.equal(result[0][0], 2);
      assert.deepStrictEqual(trace.find((t) => t.value === 2)!.to, [0, 0]);
    }
  });

  it('[P1][E2E-02] gap-non-merge + cascade preserved end-to-end (merge-once contract)', () => {
    const { line: gap, score: gapScore } = shiftLine(refLine(3, null, 3, null));
    assert.deepStrictEqual(gap.map((c) => c.v), [3, 3, null, null]);
    assert.equal(gapScore, 0);
    const { line: cascade, score: cascScore } = shiftLine(refLine(3, 3, 3, 3));
    assert.deepStrictEqual(cascade.map((c) => c.v), [6, 3, 3, null]);
    assert.equal(cascScore, 6);
    // pipeline gap still non-merge
    const board = staticBoard([3, null, 3, null]);
    const lines = movementLines(board, 'left');
    const shifted = lines.map((l) => shiftLine(l).line);
    const { board: result } = boardFromLines(shifted, 'left');
    assert.deepStrictEqual([result[0][0], result[0][1], result[0][2], result[0][3]], [3, 3, null, null]);
    // wallScan vs merge site separation pinned by source scan elsewhere, but functional gap proves it
    assert.equal(cascade[0].from.length, 2);
    assert.deepStrictEqual(cascade[0].from, [[0, 0], [0, 1]]);
  });

  it('[P1][E2E-03] short/empty guard hardening end-to-end (never-throw + length fidelity)', () => {
    assert.doesNotThrow(() => shiftLine([]));
    assert.equal(shiftLine([]).line.length, 0);
    assert.equal(shiftLine([]).moved, false);
    assert.doesNotThrow(() => shiftLine([{ v: 1, r: 0, c: 0 }]));
    assert.equal(shiftLine([{ v: 1, r: 0, c: 0 }]).line.length, 1);
    const sliced = refLine(null, 3).slice(0, 2);
    assert.doesNotThrow(() => shiftLine(sliced));
    assert.deepStrictEqual(shiftLine(sliced).line.map((c) => c.v), [3, null]);
    const shortBoard = [[1]] as unknown as Board;
    let lines: ReturnType<typeof movementLines>;
    assert.doesNotThrow(() => {
      lines = movementLines(shortBoard, 'left');
    });
    lines = movementLines(shortBoard as any, 'left');
    assert.equal(lines.length, GRID_SIZE);
    assert.equal(lines[0][0].v, 1);
    // boardFromLines short lines
    const { line } = shiftLine(refLine(2, null, null, null));
    let board: ReturnType<typeof boardFromLines>['board'];
    assert.doesNotThrow(() => {
      ({ board } = boardFromLines([line], 'left'));
    });
    assert.equal(board![0][0], 2);
    // production 4×4 invariant stays rectangular
    const full = staticBoard([1, 2, null, null]);
    const fullLines = movementLines(full, 'left');
    assert.equal(fullLines.length, GRID_SIZE);
    assert.equal(fullLines[0].length, GRID_SIZE);
  });

  it('[P1][E2E-04] ledger DW-20/DW-74 done with resolution-undo 64-hex, sprint-status untouched', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.match(ledger, /DW-20[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-74[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /resolution-undo:\s*[0-9a-f]{64}/);
    assert.match(ledger, /resolved by sweep bundle dw-engine-line-compaction/);
    assert.equal(readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml').includes('dw-engine-line-compaction'), false);
  });
});

describe('[E2E] engine line-compaction umbrella — P2 allowlist + residual', () => {
  it('[P2][E2E-05] static allowlists — single-wall-scan/GRID_SIZE/predicate + guard ordering', () => {
    const src = readSrc('triade/src/engine/core/line.ts');
    assert.equal((src.match(/while\s*\(\s*target\s*>\s*0\s*&&\s*out\[target\s*-\s*1\]\.v\s*===\s*null\s*\)/g) ?? []).length, 1);
    assert.match(src, /const\s+n\s*=\s*line\.length/);
    assert.match(src, /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*n\s*;/);
    assert.equal((src.match(/canMerge\(out\[dest\]\.v/g) ?? []).length, 1);
    assert.equal((src.match(/canMerge\(out\[target\]/g) ?? []).length, 0);
    assert.equal((src.match(/out\[target\]\.v\s*=\s*t\.v/g) ?? []).length, 1);
    assert.equal((src.match(/out\[dest\]\.v\s*=\s*merged/g) ?? []).length, 1);
    assert.equal((src.match(/board\[r\]\?\.\[c\]\s*\?\?\s*null/g) ?? []).length, 2);
    assert.match(src, /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*lines\.length/);
    assert.match(src, /for\s*\(\s*let\s+k\s*=\s*0\s*;\s*k\s*<\s*row\.length/);
    assert.ok(src.includes('if (!row) continue'));
    assert.ok(src.includes('if (!item) continue'));
    const typesSrc = readSrc('triade/src/engine/core/types.ts');
    assert.equal((typesSrc.match(/GRID_SIZE\s*=\s*4/g) ?? []).length, 1);
    const shiftBody = src.slice(src.indexOf('export function shiftLine'), src.indexOf('export function boardFromLines'));
    assert.equal((shiftBody.match(/GRID_SIZE/g) ?? []).length, 0);
    assert.equal((src.match(/from\s*=\s*\[\[t\.r,\s*t\.c\]/g) ?? []).length, 1);
  });

  it('[P3][E2E-06] residual ragged beyond [[1]] + O(1) bench + no scope leakage', () => {
    // ragged beyond [[1]] — boardFromLines with short rows via row.length
    const shortLine = refLine(1, 2, null, null);
    let result: ReturnType<typeof boardFromLines>;
    assert.doesNotThrow(() => {
      result = boardFromLines([shortLine, [{ v: 3, from: [[1, 0]] }]], 'left');
    });
    result = boardFromLines([shortLine, [{ v: 3, from: [[1, 0]] }]], 'left');
    assert.equal(result.board[0][0], 1);
    assert.equal(result.board[0][1], 2);
    assert.equal(result.board[1][0], 3);
    // O(1) bench — 10k wall scan <50 ms (n=4 ≤3 steps, 48 ops per move)
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) shiftLine(refLine(null, 3, null, 3));
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 50, `10k shiftLine <50 ms, got ${elapsed.toFixed(1)} ms`);
    // scope guard — no spawn/feel/monetization leakage
    const lineSrc = readSrc('triade/src/engine/core/line.ts');
    assert.equal(/RevenueCat|AdMob|music|preview|haptics|feel/.test(lineSrc), false);
    assert.equal(lineSrc.includes('mulberry32'), false);
    assert.equal(GRID_SIZE, 4);
  });
});

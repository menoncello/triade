import { test } from 'node:test';
import assert from 'node:assert';
import { shiftLine } from '../../src/engine/core/line.ts';
import type { CellRef } from '../../src/engine/core/line.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';

// Story 12.1 — T1: shiftLine returns { line, score, moved } where moved is
// true iff the line's content changed vs input (pre vs post values).
// Existing line.test.ts asserts score/line but never the moved flag — this
// suite closes that gap with exhaustive, deterministic cases and a
// parameterized table. The engine is pure (no RNG, no I/O); helpers are local.

function refLine(...vs: Array<number | null>): CellRef[] {
  return vs.map((v, c) => ({ v, r: 0, c }));
}

test('[P0] shiftLine returns moved flag alongside line and score', () => {
  const result = shiftLine(refLine(1, 2, null, null));
  assert.strictEqual(typeof result.moved, 'boolean', 'moved must be boolean');
  assert.ok('line' in result, 'result must have line');
  assert.ok('score' in result, 'result must have score');
  assert.strictEqual(result.line.length, GRID_SIZE, 'output line length equals GRID_SIZE');
});

test('[P0] moved=false when line already packed and non-mergeable', () => {
  // Packed lines never shift: values already at the wall in merge order.
  const packed = refLine(1, 3, 6, 12);
  const result = shiftLine(packed);
  assert.strictEqual(result.moved, false, 'packed [1,3,6,12] must not move');
  assert.deepStrictEqual(result.line.map((c) => c.v), [1, 3, 6, 12]);
  assert.strictEqual(result.score, 0);
});

test('[P0] moved=false when all empties', () => {
  const empty = refLine(null, null, null, null);
  const result = shiftLine(empty);
  assert.strictEqual(result.moved, false, 'empty line must not move');
  assert.deepStrictEqual(result.line.map((c) => c.v), [null, null, null, null]);
});

test('[P0] moved=false when 1,1 or 2,2 are adjacent (no merge, already wall-packed)', () => {
  // [1,1,_,_] left: 1s at wall but do NOT merge (rules: only 1+2 and >=3 equal)
  // content stays [1,1,null,null] -> moved false
  const r1 = shiftLine(refLine(1, 1, null, null));
  assert.strictEqual(r1.moved, false, '[1,1,null,null] must not report moved');
  assert.deepStrictEqual(r1.line.map((c) => c.v), [1, 1, null, null]);

  const r2 = shiftLine(refLine(2, 2, null, null));
  assert.strictEqual(r2.moved, false, '[2,2,null,null] must not report moved');
  assert.deepStrictEqual(r2.line.map((c) => c.v), [2, 2, null, null]);

  // Already packed with non-mergeable pair: [1,3,6,12] covered elsewhere but
  // also: [2,3,6,12] packed, no merge -> false
  const r3 = shiftLine(refLine(2, 3, 6, 12));
  assert.strictEqual(r3.moved, false);
});

test('[P0] moved=true when a lone tile shifts toward the wall', () => {
  // [_,3,_,_] -> [3,_,_,_] via one-cell shift: value moves position
  const r = shiftLine(refLine(null, 3, null, null));
  assert.strictEqual(r.moved, true, 'single tile with gap must move');
  assert.deepStrictEqual(r.line.map((c) => c.v), [3, null, null, null]);
});

test('[P0] moved=true when tiles compact without merge', () => {
  // [3, null, 3, null] -> [3,3,null,null] -> moved true (gaps closed)
  const r = shiftLine(refLine(3, null, 3, null));
  assert.strictEqual(r.moved, true, 'gapped pair compacts -> moved');
  assert.deepStrictEqual(r.line.map((c) => c.v), [3, 3, null, null]);
  assert.strictEqual(r.score, 0, 'compaction alone scores 0');
});

test('[P0] moved=true when 1+2 merges into 3', () => {
  const r = shiftLine(refLine(1, 2, null, null));
  assert.strictEqual(r.moved, true, '1+2 merge must report moved');
  assert.strictEqual(r.line[0].v, 3);
  assert.strictEqual(r.score, 3);
});

test('[P0] moved=true when equal >=3 merges', () => {
  const r = shiftLine(refLine(3, 3, null, null));
  assert.strictEqual(r.moved, true, 'equal >=3 merge must move');
  assert.strictEqual(r.line[0].v, 6);
  assert.strictEqual(r.score, 6);
});

test('[P0] moved=true when merge cascades but tile positions still shift', () => {
  // [3,3,3,3] -> [6,3,3,null]: first pair merges, trailing pair shifts
  const r = shiftLine(refLine(3, 3, 3, 3));
  assert.strictEqual(r.moved, true);
  assert.deepStrictEqual(r.line.map((c) => c.v), [6, 3, 3, null]);
  assert.strictEqual(r.score, 6);
});

test('[P0] moved detection compares values not references (value equality)', () => {
  // [1,2,3,null] (mixed) shifts to [3,3,null,null] (merge + advance)
  // This ensures moved is derived from value compare, not object identity.
  const before = [1, 2, 3, null] as const;
  const line = refLine(...before);
  const r = shiftLine(line);
  assert.deepStrictEqual(r.line.map((c) => c.v), [3, 3, null, null]);
  assert.strictEqual(r.moved, true, 'post-merge line with new values must be moved');
  // Verify original CellRef array is untouched (pure)
  assert.deepStrictEqual(line.map((c) => c.v), [...before], 'input must not be mutated');
});

test('[P0] moved flag parity: table-driven exhaustive over key line shapes', () => {
  const cases: Array<{ input: Array<number | null>; expectedMoved: boolean; expectedLine: Array<number | null> }> = [
    { input: [null, null, null, null], expectedMoved: false, expectedLine: [null, null, null, null] },
    { input: [3, 6, 12, 24], expectedMoved: false, expectedLine: [3, 6, 12, 24] },
    { input: [null, 1, null, null], expectedMoved: true, expectedLine: [1, null, null, null] },
    { input: [null, 2, 1, null], expectedMoved: true, expectedLine: [2, 1, null, null] },
    { input: [1, 1, null, null], expectedMoved: false, expectedLine: [1, 1, null, null] },
    { input: [2, 2, null, null], expectedMoved: false, expectedLine: [2, 2, null, null] },
    { input: [1, 2, 3, null], expectedMoved: true, expectedLine: [3, 3, null, null] },
    { input: [3, null, 3, null], expectedMoved: true, expectedLine: [3, 3, null, null] },
    { input: [3, 3, 6, 6], expectedMoved: true, expectedLine: [6, 6, 6, null] },
    { input: [12, 12, null, null], expectedMoved: true, expectedLine: [24, null, null, null] },
    { input: [1, 3, null, null], expectedMoved: false, expectedLine: [1, 3, null, null] }, // wall-packed, no gap, no merge -> false
  ];
  for (const { input, expectedMoved, expectedLine } of cases) {
    const r = shiftLine(refLine(...input));
    assert.strictEqual(r.moved, expectedMoved, `input [${input}] moved=${r.moved} expected ${expectedMoved}`);
    assert.deepStrictEqual(r.line.map((c) => c.v), expectedLine, `input [${input}] line mismatch`);
  }
});

test('[P0] moved remains stable under multiple calls with same input (purity)', () => {
  const line = refLine(null, 2, null, null);
  const a = shiftLine(line);
  const b = shiftLine(refLine(null, 2, null, null));
  assert.deepStrictEqual(a.line.map((c) => c.v), b.line.map((c) => c.v));
  assert.strictEqual(a.moved, b.moved, 'moved must be deterministic');
  assert.strictEqual(a.score, b.score);
});

test('[P1] shiftLine from tracking follows the line (from arrays preserved)', () => {
  // Gap-shift should preserve source tracking alongside moved=true
  const line = refLine(null, 3, null, null); // single 3 at (0,1)
  const r = shiftLine(line);
  assert.strictEqual(r.moved, true);
  assert.deepStrictEqual(r.line[0].from, [[0, 1]], 'shifted tile tracks original cell');
  assert.deepStrictEqual(r.line[1].from, [], 'vacated slot has empty from');

  // Packed line moved=false should still have identity from
  const packed = refLine(3, 6, 12, 24);
  // Need real CellRefs with distinct r/c to test from; but refLine uses r=0
  // All packed cells stay put, so from should be their own origin
  const pr = shiftLine(packed);
  assert.strictEqual(pr.moved, false);
  assert.deepStrictEqual(pr.line[0].from, [[0, 0]]);
  assert.deepStrictEqual(pr.line[1].from, [[0, 1]]);
});

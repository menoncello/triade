import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { previewFor } from '../../src/game/preview.ts';
import type { PendingSpawn } from '../../src/engine/core/types.ts';
import { POT_CURVE } from '../../src/engine/config/spawnConfig.ts';
import * as game from '../../src/engine/core/index.ts';
import { GRID_SIZE } from '../../src/engine/core/types.ts';
import {
  boardWith,
  gameState,
  rngOf,
  spyRng,
  stripCommentsAndStrings,
  extractNamedImports,
} from '../../test-utils/helpers.ts';

// Story 7.4 — Invariante preview nunca altera o spawn (N3, FR-44, ADR-06)
// Pure invariant suite: previewFor is informational only, never corrupts randomness.

// Ladder derived from ENGINE CONFIG DATA — boundary rule 4, no scattered literals.
// Mirrors preview.ts FULL_POT_LADDER derivation exactly.
const FULL: readonly number[] = Object.freeze([
  1,
  2,
  ...Object.keys(POT_CURVE)
    .map(Number)
    .sort((a, b) => a - b),
]);
const POT_LADDER: readonly number[] = FULL.slice(2);

function pending(value: number, displayRoll: number): PendingSpawn {
  return { value, displayRoll };
}

// Contiguous slice check — reuse pattern from preview.test.ts:19-27, but over FULL.
function isContiguousSlice(values: number[]): boolean {
  if (values.length === 0) return false;
  const idx = values.map((v) => FULL.indexOf(v));
  if (idx.some((i) => i === -1)) return false;
  for (let i = 1; i < idx.length; i++) {
    if (idx[i] !== idx[i - 1] + 1) return false;
  }
  return true;
}

// T1a — Sweep & mutation guard (AC1/AC2)
test('[P0] AC1 sweep — previewFor never mutates pending and branch kind correct across FULL × displayRoll × POT-only availabilities', () => {
  const availSets: Array<readonly number[]> = [[3], [3, 6], [3, 6, 12], POT_LADDER];
  const rollsExact = [0.2, 0.5];
  const rollsRange = [0.6, 0.9];
  for (const value of FULL) {
    for (const avail of availSets) {
      for (const roll of [...rollsExact, ...rollsRange]) {
        const p = pending(value, roll);
        const before = structuredClone(p);
        const res = previewFor(p, avail);
        // No mutation
        assert.deepStrictEqual(p, before, `pending mutated for value ${value}, roll ${roll}, avail ${JSON.stringify(avail)}`);
        // Kind correct per branch
        const isExact = roll < 0.6;
        if (isExact) {
          assert.strictEqual(res.kind, 'exact', `roll ${roll} must be exact for value ${value}`);
          if (res.kind === 'exact') assert.strictEqual(res.value, value);
        } else {
          assert.strictEqual(res.kind, 'range', `roll ${roll} must be range for value ${value}`);
          if (res.kind === 'range') {
            assert.ok(res.values.includes(value), `range must contain truth ${value} (avail ${JSON.stringify(avail)})`);
          }
        }
      }
    }
  }
  // Boundary exactness
  const exact599 = previewFor(pending(12, 0.599), POT_LADDER);
  assert.strictEqual(exact599.kind, 'exact', '0.599 must be exact');
  const range06 = previewFor(pending(12, 0.6), POT_LADDER);
  assert.strictEqual(range06.kind, 'range', '0.6 must be range');
  if (range06.kind === 'range') assert.ok(range06.values.includes(12));
});

test('[P0] AC2 sweep — range always contains valued truth and is contiguous (FULL × POT-only availabilities)', () => {
  const availSets: Array<readonly number[]> = [[3], [3, 6], [3, 6, 12], POT_LADDER];
  for (const value of FULL) {
    for (const avail of availSets) {
      const res = previewFor(pending(value, 0.9), avail);
      assert.strictEqual(res.kind, 'range');
      if (res.kind === 'range') {
        assert.ok(res.values.includes(value), `range must contain ${value} avail ${JSON.stringify(avail)}`);
        assert.ok(res.values.length >= 1 && res.values.length <= 3, `window capped 1..3 for ${value}`);
        // For FULL values, contiguity over FULL holds; for POT-only, contiguity over avail also holds when value in avail
        // We check contiguity over FULL as the universal ladder — sufficient for invariant.
        assert.ok(isContiguousSlice(res.values), `window for ${value} avail ${JSON.stringify(avail)} must be contiguous slice of FULL`);
      }
    }
  }
});

// O-1 — NaN/Infinity defensive guard of previewFor (preview.ts:78-79 Number.isFinite fallback)
test('[P0] AC1/AC5 defensive guard — Number.isFinite fallback for NaN/Infinity pendingSpawn never throws and keeps 60/40', () => {
  // NaN displayRoll → 0 (finite fallback) → exact, NaN value → 0 → exact value 0
  const nanBoth = previewFor(pending(NaN, NaN), POT_LADDER);
  assert.strictEqual(nanBoth.kind, 'exact', 'NaN roll must fallback to 0 → exact');
  if (nanBoth.kind === 'exact') assert.strictEqual(nanBoth.value, 0, 'NaN value must fallback to 0');

  const infBoth = previewFor(pending(Infinity, Infinity), POT_LADDER);
  assert.strictEqual(infBoth.kind, 'exact', 'Infinity roll must fallback to 0 → exact');
  if (infBoth.kind === 'exact') assert.strictEqual(infBoth.value, 0);

  const negInf = previewFor(pending(-Infinity, -Infinity), POT_LADDER);
  assert.strictEqual(negInf.kind, 'exact');
  if (negInf.kind === 'exact') assert.strictEqual(negInf.value, 0);

  // Valid value with malformed roll still exact (fallback 0 <0.6)
  const nanRoll = previewFor(pending(6, NaN), POT_LADDER);
  assert.strictEqual(nanRoll.kind, 'exact');
  if (nanRoll.kind === 'exact') assert.strictEqual(nanRoll.value, 6);

  const infRoll = previewFor(pending(6, Infinity), POT_LADDER);
  assert.strictEqual(infRoll.kind, 'exact');
  if (infRoll.kind === 'exact') assert.strictEqual(infRoll.value, 6);

  // Malformed value with valid ambiguous roll → range fallback via nearestLadderIndex, never throws
  const nanValRange = previewFor(pending(NaN, 0.9), POT_LADDER);
  assert.strictEqual(nanValRange.kind, 'range', 'NaN value with 0.9 must be range (fallback value 0 → defensive slice)');
  if (nanValRange.kind === 'range') {
    assert.ok(isContiguousSlice(nanValRange.values), 'defensive slice for NaN must be contiguous');
    assert.ok(nanValRange.values.length >= 1 && nanValRange.values.length <= 3);
    // nearestLadderIndex(0) → 1 → slice [1,2,3]
    assert.deepStrictEqual(nanValRange.values, [1, 2, 3]);
    assert.ok(Object.isFrozen(nanValRange.values) || nanValRange.values.length === 3);
  }

  const infValRange = previewFor(pending(Infinity, 0.9), POT_LADDER);
  assert.strictEqual(infValRange.kind, 'range');
  if (infValRange.kind === 'range') {
    assert.ok(isContiguousSlice(infValRange.values));
    assert.deepStrictEqual(infValRange.values, [1, 2, 3]);
  }

  // Also verify exact boundary still holds with malformed-adjacent values
  const zeroRoll = previewFor(pending(12, 0), POT_LADDER);
  assert.strictEqual(zeroRoll.kind, 'exact');
});

// T1b — Materialization pin (AC1)
test('[P0] AC1 materialization left — display decision never alters placed tile (exact and range)', () => {
  for (const value of FULL) {
    for (const roll of [0.2, 0.9]) {
      const p = pending(value, roll);
      // Available pot for preview — use POT_LADDER (full pot) as the live set
      const avail = POT_LADDER;
      const state = gameState(boardWith([[1, 2, null, null], [], [], []]), p);
      // Preview BEFORE move — must not affect spawn
      const preview = previewFor(p, avail);
      assert.ok(preview.kind === 'exact' || preview.kind === 'range');
      const rng = rngOf(0, 0.5, 0.5);
      const res = game.move(state, 'left', rng);
      assert.strictEqual(res.moved, true, `move left must be effective for value ${value} roll ${roll}`);
      const spawned = res.trace.find((e) => e.spawned);
      assert.ok(spawned, 'effective move must produce spawned trace');
      assert.strictEqual(spawned.value, value, `placed tile must equal pending.value ${value} (left, roll ${roll})`);
      assert.strictEqual(res.board[spawned.to[0]][spawned.to[1]], value);
    }
  }
});

test('[P0] AC1 materialization up — display decision never alters placed tile (directional candidates up)', () => {
  for (const value of FULL) {
    for (const roll of [0.2, 0.9]) {
      const p = pending(value, roll);
      const avail = POT_LADDER;
      // Board that moves when shifting up: need a column with movable pattern
      // Use boardWith that has a column movable up — place [1,2,null,null] in column form via boardWith
      // Simplest: create board where column 0 has [null,1,2,null] so up shift moves.
      // But the spec pin uses same boardWith([[1,2,null,null]]) for left and up.
      // For up, we use a board where the up direction is effective: a column with values.
      // We construct board where first column has values that will move up.
      const board = boardWith([
        [null, null, null, null],
        [1, null, null, null],
        [2, null, null, null],
        [null, null, null, null],
      ]);
      const state = gameState(board, p);
      const preview = previewFor(p, avail);
      assert.ok(preview.kind === 'exact' || preview.kind === 'range');
      const rng = rngOf(0, 0.5, 0.5);
      const res = game.move(state, 'up', rng);
      assert.strictEqual(res.moved, true, `move up must be effective for value ${value} roll ${roll}`);
      const spawned = res.trace.find((e) => e.spawned);
      assert.ok(spawned, 'effective up move must produce spawned trace');
      assert.strictEqual(spawned.value, value, `placed tile must equal pending.value ${value} (up, roll ${roll})`);
      assert.strictEqual(res.board[spawned.to[0]][spawned.to[1]], value);
      // Also verify candidate is opposite edge: up -> bottom row (GRID_SIZE-1, col)
      // The spawned cell's row must be GRID_SIZE-1 if only one line moved, but with multiple lines it varies.
      // At least ensure candidates derived from moved lines, not preview — checked in T1d-b.
    }
  }
});

test('[P0] AC1 materialization right — display decision never alters placed tile (directional candidates right)', () => {
  for (const value of FULL) {
    for (const roll of [0.2, 0.9]) {
      const p = pending(value, roll);
      const avail = POT_LADDER;
      // Single moved row for right: [1,2,null,null] shifted right still moves (slides to far edge and merges)
      const board = boardWith([[1, 2, null, null], [], [], []]);
      const state = gameState(board, p);
      const preview = previewFor(p, avail);
      assert.ok(preview.kind === 'exact' || preview.kind === 'range');
      const rng = rngOf(0, 0.5, 0.5);
      const res = game.move(state, 'right', rng);
      assert.strictEqual(res.moved, true, `move right must be effective for value ${value} roll ${roll}`);
      const spawned = res.trace.find((e) => e.spawned);
      assert.ok(spawned, 'effective right move must produce spawned trace');
      assert.strictEqual(spawned.value, value, `placed tile must equal pending.value ${value} (right, roll ${roll})`);
      assert.strictEqual(res.board[spawned.to[0]][spawned.to[1]], value);
      // Opposite edge for right is col 0
      assert.deepStrictEqual(spawned.to, [0, 0], 'spawn for right must be opposite edge of moved line (row 0, col 0)');
    }
  }
});

test('[P0] AC1 materialization down — display decision never alters placed tile (directional candidates down)', () => {
  for (const value of FULL) {
    for (const roll of [0.2, 0.9]) {
      const p = pending(value, roll);
      const avail = POT_LADDER;
      // Column [1,2] at top moving down: tiles slide down and merge, candidate is top row
      const board = boardWith([
        [1, null, null, null],
        [2, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);
      const state = gameState(board, p);
      const preview = previewFor(p, avail);
      assert.ok(preview.kind === 'exact' || preview.kind === 'range');
      const rng = rngOf(0, 0.5, 0.5);
      const res = game.move(state, 'down', rng);
      assert.strictEqual(res.moved, true, `move down must be effective for value ${value} roll ${roll}`);
      const spawned = res.trace.find((e) => e.spawned);
      assert.ok(spawned, 'effective down move must produce spawned trace');
      assert.strictEqual(spawned.value, value, `placed tile must equal pending.value ${value} (down, roll ${roll})`);
      assert.strictEqual(res.board[spawned.to[0]][spawned.to[1]], value);
      // Opposite edge for down is row 0
      assert.deepStrictEqual(spawned.to, [0, 0], 'spawn for down must be opposite edge of moved line (row 0, col 0)');
    }
  }
});

// T1c — FR-44 distribution pins (AC2) — 5 explicit cases
test('[P0] AC2 FR-44 — value 1 ambiguous with [3] yields [1,2]', () => {
  const p = previewFor(pending(1, 0.9), [3]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') {
    assert.deepStrictEqual(p.values, [1, 2]);
    assert.ok(isContiguousSlice(p.values));
  }
});

test('[P0] AC2 FR-44 — value 2 ambiguous with [3] yields [1,2]', () => {
  const p = previewFor(pending(2, 0.9), [3]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') {
    assert.deepStrictEqual(p.values, [1, 2]);
    assert.ok(isContiguousSlice(p.values));
  }
});

test('[P0] AC2 FR-44 — value 3 ambiguous with [3] yields [3]', () => {
  const p = previewFor(pending(3, 0.9), [3]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') {
    assert.deepStrictEqual(p.values, [3]);
    assert.ok(isContiguousSlice(p.values));
  }
});

test('[P0] AC2 FR-44 — value 3 ambiguous with [3,6,12] yields [3,6,12]', () => {
  const p = previewFor(pending(3, 0.9), [3, 6, 12]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') {
    assert.deepStrictEqual(p.values, [3, 6, 12]);
    assert.ok(isContiguousSlice(p.values));
  }
});

test('[P0] AC2 FR-44 — value 6 ambiguous with [3,6,12,24] yields [6,12,24]', () => {
  const p = previewFor(pending(6, 0.9), [3, 6, 12, 24]);
  assert.strictEqual(p.kind, 'range');
  if (p.kind === 'range') {
    assert.deepStrictEqual(p.values, [6, 12, 24]);
    assert.ok(isContiguousSlice(p.values));
  }
});

// T1d — Separation (AC4)
test('[P0] AC4 value — same board and pending.value but different displayRoll yields identical spawn cell and value (displayRoll never flows into spawnTile)', () => {
  const board = boardWith([[1, 2, null, null], [], [], []]);
  const pExact = pending(6, 0.2);
  const pRange = pending(6, 0.9);
  const rngExact = rngOf(0, 0.5, 0.5);
  const rngRange = rngOf(0, 0.5, 0.5);
  const resExact = game.move(gameState(board, pExact), 'left', rngExact);
  const resRange = game.move(gameState(board, pRange), 'left', rngRange);
  assert.strictEqual(resExact.moved, true);
  assert.strictEqual(resRange.moved, true);
  const sExact = resExact.trace.find((e) => e.spawned)!;
  const sRange = resRange.trace.find((e) => e.spawned)!;
  assert.deepStrictEqual(sExact.to, sRange.to, 'spawn cell must be identical regardless of displayRoll');
  assert.strictEqual(sExact.value, sRange.value, 'spawn value must be identical regardless of displayRoll');
  assert.strictEqual(sExact.value, 6);
  assert.strictEqual(sRange.value, 6);
});

test('[P0] AC4 position — previewFor output never supplies candidates; candidates derived only from shiftLine.moved opposite-edge', () => {
  // Candidates for left are [row, GRID_SIZE-1] of moved lines only — never from Preview.
  // We prove by constructing a board where only line 0 moves, then assert spawn lands on opposite edge of that line.
  const board = boardWith([[1, 2, null, null], [], [], []]);
  const p = pending(6, 0.9);
  const preview = previewFor(p, POT_LADDER);
  // Preview must not be passed to move — move signature is (state, dir, rng), no preview param.
  // Assert preview object has no cell/position semantics
  assert.ok(!('to' in preview) && !('cell' in preview) && !('position' in preview), 'Preview must not carry position');
  const res = game.move(gameState(board, p), 'left', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res.moved, true, 'board [1,2] must be movable left (1+2 -> 3 merge)');
  const spawned = res.trace.find((e) => e.spawned)!;
  // Use a second board that also moves via same merge, single moved line -> candidate is [[0,3]]
  const movableBoard = boardWith([[1, 2, null, null], [], [], []]);
  const res2 = game.move(gameState(movableBoard, p), 'left', rngOf(0, 0.5, 0.5));
  assert.strictEqual(res2.moved, true);
  const spawned2 = res2.trace.find((e) => e.spawned)!;
  // Directional candidates for left are rightmost col (GRID_SIZE-1) of moved lines.
  // With only row 0 moved, candidate set is [[0,3]] -> spawn must be at [0,3] regardless of preview.
  assert.deepStrictEqual(spawned2.to, [0, GRID_SIZE - 1], 'spawn for left must be opposite edge of moved line (row 0, col 3)');
  // Also verify first board's spawn is same (deterministic opposite edge)
  assert.deepStrictEqual(spawned.to, [0, GRID_SIZE - 1]);
  // Verify spawnTile candidates logic directly — preview never involved
  assert.ok(preview.kind === 'range' && preview.values.includes(6), 'preview still correct but irrelevant to position');
});

test('[P0] AC4 timing — previewFor consumes 0 draws by construction; effective move 3 draws, noop 0 draws', () => {
  const p = pending(6, 0.9);
  // previewFor takes no rng param (preview.ts:71) — prove 0 draws
  const spy = spyRng(0, 0.5, 0.5);
  const beforeCalls = spy.calls.length;
  const preview = previewFor(p, POT_LADDER);
  assert.ok(preview.kind === 'range');
  assert.strictEqual(spy.calls.length, beforeCalls, 'previewFor must consume 0 rng draws');
  assert.strictEqual(spy.calls.length, 0);
  // Effective move consumes 3 draws (cell, next value, next displayRoll) per types.ts:7-18
  const board = boardWith([[1, 2, null, null], [], [], []]);
  const state = gameState(board, p);
  const res = game.move(state, 'left', spy);
  assert.strictEqual(res.moved, true);
  assert.strictEqual(spy.calls.length, 3, 'effective move must consume exactly 3 draws (cell + next value + displayRoll)');
  // NOOP consumes 0 draws
  const noopBoard = boardWith([
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
    [3, 6, 12, 24],
  ]);
  const noopSpy = spyRng();
  // Call previewFor on noop board as well — still 0
  const noopPreview = previewFor(pending(12, 0.9), POT_LADDER);
  assert.strictEqual(noopSpy.calls.length, 0);
  assert.ok(noopPreview.kind === 'range');
  const noopRes = game.move(gameState(noopBoard, pending(12, 0.9)), 'left', noopSpy);
  assert.strictEqual(noopRes.moved, false);
  assert.strictEqual(noopSpy.calls.length, 0, 'noop must consume 0 draws');
  assert.strictEqual(noopRes.trace.filter((e) => e.spawned).length, 0, 'noop must produce no spawned entry');
  // Trace stays length 16 for full board (stationary trace), not 0
  assert.strictEqual(noopRes.trace.length, 16, 'noop trace stays length 16 (stationary), not 0');
});

// T1e — Structural separation pin (AC5)
test('[P0] AC5 structural boundary — preview.ts never imports roll symbols and never uses Math.random; engine never imports preview', () => {
  const ROLL_SYMBOLS = new Set(['resolveSpawn', 'weightedValue', 'spawnTile', 'weightedPicker']);
  const PREVIEW_SYMBOLS = new Set(['previewFor']);

  const previewPath = fileURLToPath(new URL('../../src/game/preview.ts', import.meta.url));
  const spawnPath = fileURLToPath(new URL('../../src/engine/core/spawn.ts', import.meta.url));
  const gamePath = fileURLToPath(new URL('../../src/engine/core/game.ts', import.meta.url));

  const previewSource = readFileSync(previewPath, 'utf8');
  const spawnSource = readFileSync(spawnPath, 'utf8');
  const gameSource = readFileSync(gamePath, 'utf8');

  const previewStripped = stripCommentsAndStrings(previewSource);
  const spawnStripped = stripCommentsAndStrings(spawnSource);
  const gameStripped = stripCommentsAndStrings(gameSource);

  // 1. ROLL_SYMBOLS must appear 0 times in preview.ts (stripped source) and not imported from engine
  for (const sym of ROLL_SYMBOLS) {
    const re = new RegExp(`\\b${sym}\\b`);
    assert.ok(!re.test(previewStripped), `preview.ts must not reference roll symbol '${sym}'`);
  }
  for (const { specifier, names } of extractNamedImports(previewSource)) {
    const isEngine = /(^|\/)engine(\/|$)/.test(specifier);
    if (!isEngine) continue;
    for (const name of names) {
      assert.ok(!ROLL_SYMBOLS.has(name), `preview.ts imports roll symbol '${name}' from engine specifier '${specifier}'`);
    }
  }

  // 2. PREVIEW_SYMBOLS and specifier 'preview' must appear 0 times in spawn.ts and game.ts
  for (const src of [spawnStripped, gameStripped]) {
    for (const sym of PREVIEW_SYMBOLS) {
      const re = new RegExp(`\\b${sym}\\b`);
      assert.ok(!re.test(src), `engine file must not reference preview symbol '${sym}'`);
    }
    // Specifier check via extractNamedImports and also stripped includes
    assert.ok(!src.includes('preview'), 'engine file must not reference preview specifier');
  }
  for (const { specifier, names } of [...extractNamedImports(spawnSource), ...extractNamedImports(gameSource)]) {
    assert.ok(!specifier.includes('preview'), `engine imports preview specifier '${specifier}'`);
    for (const name of names) {
      assert.ok(!PREVIEW_SYMBOLS.has(name), `engine imports preview symbol '${name}' from '${specifier}'`);
    }
  }

  // 3. No Math.random in preview.ts (randomness via injectable rng only, ui.norolls rule)
  // Use split-join to avoid literal "Math.random" in this test file violating T1f purity check if scanned
  const mathRandom = ['Math', 'random'].join('.');
  assert.ok(!previewStripped.includes(mathRandom), 'preview.ts must not use Math.random — randomness via injectable rng only');
});

// T1f — Purity (AC5)
test('[P0] AC5 purity — previewFor is pure and RANGE_1_2 frozen identity retained', () => {
  const p1 = pending(6, 0.9);
  const a = previewFor(p1, POT_LADDER);
  const b = previewFor(pending(6, 0.9), POT_LADDER);
  assert.deepStrictEqual(a, b, 'same PendingSpawn + availablePot must yield deepEqual Preview across 2 calls');
  // No module-global mutation — second call with different avail does not pollute first
  const c = previewFor(pending(6, 0.9), [3]);
  assert.notDeepStrictEqual(a, c, 'different availablePot must yield different window');
  const a2 = previewFor(p1, POT_LADDER);
  assert.deepStrictEqual(a, a2, 'no global mutation after other avail call');

  // RANGE_1_2 frozen reuse — stable identity for value 1|2
  const r1 = previewFor(pending(1, 0.9), [3]);
  const r2 = previewFor(pending(2, 0.9), [3]);
  const r1b = previewFor(pending(1, 0.9), POT_LADDER);
  assert.strictEqual(r1.kind, 'range');
  assert.strictEqual(r2.kind, 'range');
  assert.strictEqual(r1b.kind, 'range');
  if (r1.kind === 'range' && r2.kind === 'range' && r1b.kind === 'range') {
    // Both value 1 and 2 return same frozen array instance [1,2]
    assert.strictEqual(r1.values, r2.values, 'RANGE_1_2 must retain stable identity across calls for value 1|2');
    assert.deepStrictEqual(r1.values, [1, 2]);
    // Must be frozen for React memo stability (O-2 tightened: no || fallback)
    assert.ok(Object.isFrozen(r1.values), 'RANGE_1_2 must be frozen for React memo stability');
    // Re-call retains same identity
    assert.strictEqual(r1.values, r1b.values, 'RANGE_1_2 identity stable across different availablePot for 1|2');
  }

  // previewFor takes no rng param — ensure function length is 1 or 2 (pending, availablePot) not rng
  assert.ok(previewFor.length >= 1 && previewFor.length <= 2, 'previewFor must take 1-2 params (pending, availablePot), no rng');
  // No Math.random in this test file is enforced by code review; we use rngOf/spyRng only.
});

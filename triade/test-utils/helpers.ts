import assert from 'node:assert';
import {
  ceilingDetector,
  isGameOver,
  move,
  newGame,
  tierForCeiling,
} from '../src/engine/core/index.ts';
import type { Board, Direction, GameState, MoveResult, PendingSpawn, Rng } from '../src/engine/core/index.ts';
import { resultingTiles, type TileTransition } from '../src/render/transitionPlan.ts';

export const SIZE = 4;

export function gameState(board: Board, pendingSpawn: PendingSpawn = { value: 1, displayRoll: 0 }): GameState {
  return { board, pendingSpawn };
}

export function emptyBoard(): Board {
  const b: Board = [];
  for (let r = 0; r < SIZE; r++) {
    const row: Array<number | null> = [];
    for (let c = 0; c < SIZE; c++) row.push(null);
    b.push(row);
  }
  return b;
}

export function rngOf(...values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i++];
    return v === undefined ? 0.5 : v;
  };
}

export function staticBoard(row: Array<number | null>): Board {
  const b = emptyBoard();
  b[0] = row.slice();
  for (let r = 1; r < SIZE; r++) b[r] = [3, 6, 12, 24];
  return b;
}

export function boardWith(matrix: Array<Array<number | null | undefined>>): Board {
  const b = emptyBoard();
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (matrix[r][c] !== null && matrix[r][c] !== undefined) b[r][c] = matrix[r][c] as number;
    }
  }
  return b;
}

function byCell(a: { cell: [number, number] }, b: { cell: [number, number] }): number {
  return a.cell[0] - b.cell[0] || a.cell[1] - b.cell[1];
}

export function occupiedCells(board: Board): Array<{ cell: [number, number]; value: number }> {
  const out: Array<{ cell: [number, number]; value: number }> = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== null) out.push({ cell: [r, c], value: board[r][c] as number });
    }
  }
  return out.sort(byCell);
}

export function assertNoLeak(plan: TileTransition[], resultBoard: Board, message?: string) {
  const tiles = resultingTiles(plan)
    .map((t) => ({ cell: t.cell, value: t.value }))
    .sort(byCell);
  assert.deepStrictEqual(
    tiles,
    occupiedCells(resultBoard),
    message ?? 'resultingTiles(plan) equals occupied cells of result.board'
  );
}

// Statistical tolerance scaled by sigma: z * sqrt(p(1-p)/n). Auto-adjusts to
// sample size so a frequency gate can never be simultaneously seed-starved
// (dead) and knife-edge flaky when a future seed/rng rotation revives it.
// Shared by the 2.6 integration suite and the 7.1 contract suite so the
// statistical windows can't drift apart.
export function sigmaBound(expected: number, n: number, z = 5): number {
  assert.ok(Number.isFinite(expected) && expected > 0 && expected < 1, 'sigmaBound requires 0 < expected < 1');
  assert.ok(Number.isFinite(n) && n > 0, 'sigmaBound requires n > 0');
  return z * Math.sqrt((expected * (1 - expected)) / n);
}

// Reconstruct the post-move/pre-spawn board by removing the tile placed by
// the move's spawn — the exact board whose ceiling resolved the NEXT pending.
// Shared by runSeededSession and the 7.1 AC1 pin so the reconstruction logic
// lives in exactly one place.
export function preSpawnBoardOf(res: MoveResult): Board {
  const spawned = res.trace.find((e) => e.spawned);
  assert.ok(spawned, 'effective move must produce a spawned trace entry');
  const pre: Board = res.board.map((row) => row.slice());
  pre[spawned.to[0]][spawned.to[1]] = null;
  return pre;
}

// Seeded session harness: plays effective moves cycling directions, restarts
// the game when stuck (deterministic — same seed replays identically) and
// records materialized spawn values plus the N3 promise/materialization pairs.
// tieredPairs buckets each MATERIALIZED value by the tier its pending was
// resolved from (recovered from the pre-spawn board), enabling pot-by-ceiling
// composition checks over the live move path. Bounded by a generous move cap
// so a future regression that starves effective moves fails fast instead of
// hanging CI.
export function runSeededSession(seed: number, targetSpawns: number) {
  assert.ok(
    Number.isInteger(targetSpawns) && targetSpawns > 0,
    `runSeededSession requires a positive integer targetSpawns (got ${targetSpawns})`
  );
  const rng = mulberry32(seed);
  const dirs: Direction[] = ['left', 'up', 'right', 'down'];
  let state: GameState = newGame(rng);
  let lastPending: PendingSpawn = state.pendingSpawn;
  let lastResolvedTier = tierForCeiling(ceilingDetector(state.board));
  const spawnValues: number[] = [];
  const displayRolls: number[] = [];
  const n3pairs: Array<{ promised: number; materialized: number }> = [];
  const tieredPairs: Array<{ tier: number; value: number }> = [];
  const snapshots: Array<{ board: Board; pendingSpawn: PendingSpawn }> = [];
  let dirIdx = 0;
  let stale = 0;
  const maxMoves = targetSpawns * 500 + 5000;
  let moves = 0;
  while (spawnValues.length < targetSpawns) {
    if (++moves > maxMoves) {
      assert.fail(
        `runSeededSession exceeded ${maxMoves} moves with only ${spawnValues.length}/${targetSpawns} spawns — engine looks stuck (seed ${seed})`
      );
    }
    const res: MoveResult = move(state, dirs[dirIdx++ % 4], rng);
    if (!res.moved) {
      stale++;
      if (stale >= 8 || isGameOver(res.board)) {
        state = newGame(rng);
        lastPending = state.pendingSpawn;
        lastResolvedTier = tierForCeiling(ceilingDetector(state.board));
        stale = 0;
      }
      continue;
    }
    stale = 0;
    const spawned = res.trace.find((e) => e.spawned);
    assert.ok(spawned, 'effective move must produce a spawned trace entry');
    spawnValues.push(spawned.value);
    displayRolls.push(res.pendingSpawn.displayRoll);
    n3pairs.push({ promised: lastPending.value, materialized: spawned.value });
    tieredPairs.push({ tier: lastResolvedTier, value: spawned.value });
    snapshots.push({ board: res.board, pendingSpawn: res.pendingSpawn });
    state = { board: res.board, pendingSpawn: res.pendingSpawn };
    lastPending = res.pendingSpawn;
    // The NEXT pending was resolved from the post-merge board BEFORE placing
    // the spawn — reconstruct that pre-spawn board to recover its tier.
    lastResolvedTier = tierForCeiling(ceilingDetector(preSpawnBoardOf(res)));
  }
  return { spawnValues, displayRolls, n3pairs, tieredPairs, snapshots };
}

export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

// Comment- AND string-aware cleaner for static-source guards: blanks comment
// bodies and string/template literal contents while preserving newlines (and
// scanning code inside template `${}` interpolations, returning to template
// text once the interpolation's top-level `}` closes), so bare-symbol scans
// neither false-positive on text inside strings nor false-negative on `//`
// sequences like URLs that would otherwise swallow trailing code.
// Length-preserving by design. Known limitation: regex literals are treated
// as plain code.
export function stripCommentsAndStrings(source: string): string {
  type Mode = 'code' | 'line' | 'block' | 'single' | 'double' | 'template' | 'interp';
  const stack: Array<{ mode: Mode; braces: number }> = [{ mode: 'code', braces: 0 }];
  let out = '';
  const blank = (ch: string): void => {
    out += ch === '\n' ? '\n' : ' ';
  };
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    const frame = stack[stack.length - 1];
    switch (frame.mode) {
      case 'line':
        if (ch === '\n') {
          stack.pop();
          out += '\n';
        } else blank(ch);
        break;
      case 'block':
        if (ch === '*' && next === '/') {
          stack.pop();
          out += '  ';
          i++;
        } else blank(ch);
        break;
      case 'single':
      case 'double': {
        const quote = frame.mode === 'single' ? "'" : '"';
        if (ch === '\\') {
          out += '  ';
          i++;
        } else if (ch === quote) {
          stack.pop();
          out += ch;
        } else blank(ch);
        break;
      }
      case 'template':
        if (ch === '\\') {
          out += '  ';
          i++;
        } else if (ch === '`') {
          stack.pop();
          out += ch;
        } else if (ch === '$' && next === '{') {
          // Interpolation enters as a code-like frame whose top-level `}`
          // returns here; nested `{}` are counted so object literals inside
          // don't close it early.
          stack.push({ mode: 'interp', braces: 0 });
          out += '  ';
          i++;
        } else blank(ch);
        break;
      case 'interp':
      case 'code': {
        if (ch === '/' && next === '/') {
          stack.push({ mode: 'line', braces: 0 });
          out += '  ';
          i++;
        } else if (ch === '/' && next === '*') {
          stack.push({ mode: 'block', braces: 0 });
          out += '  ';
          i++;
        } else if (ch === "'" || ch === '"' || ch === '`') {
          stack.push({ mode: ch === "'" ? 'single' : ch === '"' ? 'double' : 'template', braces: 0 });
          out += ch;
        } else if (frame.mode === 'interp' && ch === '{') {
          frame.braces++;
          out += ch;
        } else if (frame.mode === 'interp' && ch === '}') {
          if (frame.braces > 0) frame.braces--;
          else stack.pop(); // back to the enclosing template
          out += ch;
        } else out += ch;
        break;
      }
    }
  }
  return out;
}

export function extractSpecifiers(source: string): string[] {
  const cleaned = stripComments(source);
  const specifiers: string[] = [];
  const quoteClass = '["\'`]';
  const notQuote = '[^"\'\`]';
  const staticRe = new RegExp(
    '(?:import|export)\\s+(?:[\\w*{},\\s]+from\\s+)?' + quoteClass + '(' + notQuote + '+)' + quoteClass,
    'g'
  );
  const dynamicRe = new RegExp('import\\s*\\(\\s*' + quoteClass + '(' + notQuote + '+)' + quoteClass + '\\s*\\)', 'g');
  const requireRe = new RegExp('require\\s*\\(\\s*' + quoteClass + '(' + notQuote + '+)' + quoteClass + '\\s*\\)', 'g');
  let m: RegExpExecArray | null;
  while ((m = staticRe.exec(cleaned)) !== null) specifiers.push(m[1]);
  while ((m = dynamicRe.exec(cleaned)) !== null) specifiers.push(m[1]);
  while ((m = requireRe.exec(cleaned)) !== null) specifiers.push(m[1]);
  return specifiers;
}

export function extractNamedImports(source: string): Array<{ specifier: string; names: string[] }> {
  const cleaned = stripComments(source);
  const results: Array<{ specifier: string; names: string[] }> = [];
  const re = /import\s+(?:type\s+)?(?:\{[^}]*\}|[^;]+?)\s+from\s+["'`]([^"'`]+)["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const clause = /^import\s+(?:type\s+)?([\s\S]*?)\s+from\s/.exec(m[0])?.[1] ?? '';
    const names: string[] = [];
    // Head of the clause before any `{`: a default binding (`import Foo` or
    // `import Foo, { Bar }`) or a namespace (`import * as ns`, mixed forms
    // included) — capture it so structural guards see every imported name.
    const head = clause.split('{')[0].replace(/,\s*$/, '').trim();
    if (head.startsWith('*')) {
      const ns = /\*\s+as\s+(\w+)/.exec(head);
      if (ns) names.push(ns[1]);
    } else if (head.length > 0) {
      names.push(head);
    }
    // Named bindings, inline `type` modifiers stripped (`{ type spawnTile }`
    // imports the symbol `spawnTile`, not a name starting with "type").
    const brace = /\{([^}]*)\}/.exec(clause);
    if (brace) {
      for (const raw of brace[1].split(',')) {
        const name = raw
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim();
        if (name.length > 0) names.push(name);
      }
    }
    results.push({ specifier: m[1], names });
  }
  return results;
}

import { mulberry32 } from '../src/utils/mulberry32.ts';

export { mulberry32 };

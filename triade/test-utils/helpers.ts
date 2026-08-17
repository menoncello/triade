import assert from 'node:assert';
import type { Board, Rng } from '../src/engine/core/index.ts';
import { resultingTiles, type TileTransition } from '../src/render/transitionPlan.ts';

export const SIZE = 4;

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

export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
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
    const brace = /\{([^}]*)\}/.exec(m[0]);
    const names = brace
      ? brace[1]
          .split(',')
          .map((n) => n.trim().split(/\s+as\s+/)[0].trim())
          .filter((n) => n.length > 0)
      : [];
    results.push({ specifier: m[1], names });
  }
  return results;
}

export { mulberry32 } from '../src/utils/mulberry32.ts';

import { GRID_SIZE, type Board, type Direction, type TraceEntry } from './types.ts';
import { canMerge, mergeValue } from './rules.ts';
import { emptyBoard } from './board.ts';

export interface CellRef {
  v: number | null;
  r: number;
  c: number;
}

export interface ShiftedCell {
  v: number | null;
  from: Array<[number, number]>;
}

export function movementLines(board: Board, dir: Direction): CellRef[][] {
  const lines: CellRef[][] = [];
  let r: number;
  let c: number;
  if (dir === 'left' || dir === 'right') {
    for (r = 0; r < GRID_SIZE; r++) {
      const row: CellRef[] = [];
      for (c = 0; c < GRID_SIZE; c++) row.push({ v: board[r][c], r, c });
      if (dir === 'right') row.reverse();
      lines.push(row);
    }
  } else {
    for (c = 0; c < GRID_SIZE; c++) {
      const col: CellRef[] = [];
      for (r = 0; r < GRID_SIZE; r++) col.push({ v: board[r][c], r, c });
      if (dir === 'down') col.reverse();
      lines.push(col);
    }
  }
  return lines;
}

export function shiftLine(line: CellRef[]): { line: ShiftedCell[]; score: number } {
  const out: ShiftedCell[] = line.map((cell) =>
    cell.v === null
      ? { v: null, from: [] }
      : { v: cell.v, from: [[cell.r, cell.c] as [number, number]] }
  );
  let score = 0;

  for (let i = 0; i < GRID_SIZE; i++) {
    const t = line[i];
    if (t.v === null) continue;
    if (i === 0) continue;

    const dest = i - 1;
    if (out[dest].v === null) {
      out[dest].v = t.v;
      out[dest].from = [[t.r, t.c] as [number, number]];
      out[i].v = null;
      out[i].from = [];
    } else if (canMerge(out[dest].v, t.v)) {
      const merged = mergeValue(out[dest].v, t.v);
      out[dest].v = merged;
      out[dest].from = [out[dest].from[0], [t.r, t.c] as [number, number]];
      score += merged;
      out[i].v = null;
      out[i].from = [];
    }
  }

  return { line: out, score };
}

export function boardFromLines(lines: ShiftedCell[][], dir: Direction): { board: Board; trace: TraceEntry[] } {
  const board = emptyBoard();
  const trace: TraceEntry[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let k = 0; k < GRID_SIZE; k++) {
      const item = lines[i][k];
      if (item.v === null) continue;
      let r: number;
      let c: number;
      if (dir === 'left') {
        r = i;
        c = k;
      } else if (dir === 'right') {
        r = i;
        c = GRID_SIZE - 1 - k;
      } else if (dir === 'up') {
        r = k;
        c = i;
      } else {
        r = GRID_SIZE - 1 - k;
        c = i;
      }
      board[r][c] = item.v;
      trace.push({
        value: item.v,
        to: [r, c],
        from: item.from,
        spawned: false
      });
    }
  }
  return { board, trace };
}

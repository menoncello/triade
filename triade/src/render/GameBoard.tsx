import { useEffect, useState } from 'react';
import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import type { Board } from '../engine/core/index.ts';

const GRID = 4;
const BOARD_PADDING = 8;
const CELL_GAP = 8;
const CELL_RADIUS = 10;

function cellColor(value: number | null): string {
  if (value === null) return '#d8d3cc';
  if (value === 1) return '#f9e3ae';
  if (value === 2) return '#f7d488';
  if (value === 3) return '#eec06e';
  if (value <= 6) return '#e0a84f';
  if (value <= 12) return '#cf8a2e';
  if (value <= 24) return '#b46a1e';
  return '#8f4d12';
}

export interface GameBoardProps {
  board: Board;
  width: number;
}

export function GameBoard({ board, width }: GameBoardProps) {
  const cell = (width - BOARD_PADDING * 2 - CELL_GAP * (GRID - 1)) / GRID;

  return (
    <Canvas style={{ width, height: width }}>
      <RoundedRect
        x={0}
        y={0}
        width={width}
        height={width}
        r={14}
        color="#bdb6ab"
      />
      {board.map((row, r) =>
        row.map((value, c) => (
          <RoundedRect
            key={`${r},${c}`}
            x={BOARD_PADDING + c * (cell + CELL_GAP)}
            y={BOARD_PADDING + r * (cell + CELL_GAP)}
            width={cell}
            height={cell}
            r={CELL_RADIUS}
            color={cellColor(value)}
          />
        ))
      )}
    </Canvas>
  );
}

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AccessibilityInfo } from 'react-native';
import type { Board } from '../engine/core/index.ts';
import { i18n } from '../i18n/index.ts';

const GRID = 4;
const BOARD_PADDING = 8;
const CELL_GAP = 8;

export interface BoardA11yOverlayProps {
  board: Board;
  width: number;
}

function tileLabel(value: number, r: number, c: number): string {
  // i18n tile label: "{{value}} row {{row}} column {{col}}" 1-indexed per spec
  try {
    return i18n.t('a11y.tile', { value: String(value), row: String(r + 1), col: String(c + 1) });
  } catch {
    return `${value} row ${r + 1} column ${c + 1}`;
  }
}

function announceTile(value: number, r: number, c: number): void {
  const msg = tileLabel(value, r, c);
  try {
    const ai: any = AccessibilityInfo as any;
    if (ai.announceForAccessibilityWithOptions) ai.announceForAccessibilityWithOptions(msg, { queue: true });
    else if (ai.announceForAccessibility) ai.announceForAccessibility(msg);
  } catch {}
}

export function BoardA11yOverlay({ board, width }: BoardA11yOverlayProps) {
  const finiteWidth = Number.isFinite(width) ? (width as number) : 1;
  const safeWidth = Math.max(1, finiteWidth);
  const cell = Math.max((safeWidth - BOARD_PADDING * 2 - CELL_GAP * (GRID - 1)) / GRID, 1);
  if (!Array.isArray(board)) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlay, { width: safeWidth, height: safeWidth }]}
      importantForAccessibility="no"
    >
      {board.map((row, r) => {
        if (!Array.isArray(row)) return null;
        return row.map((value, c) => {
          if (value === null) return null;
          const x = BOARD_PADDING + c * (cell + CELL_GAP);
          const y = BOARD_PADDING + r * (cell + CELL_GAP);
          const label = tileLabel(value, r, c);
          return (
            <Pressable
              key={`a11y-${r}-${c}`}
              accessible
              accessibilityRole="text"
              accessibilityLabel={label}
              onPress={() => announceTile(value, r, c)}
              style={[styles.cell, { left: x, top: y, width: cell, height: cell }]}
            />
          );
        });
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  cell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Re-export constants for test parity with GameBoard math
export const __BOARD_A11Y_CONSTANTS = { GRID, BOARD_PADDING, CELL_GAP };
export { tileLabel };

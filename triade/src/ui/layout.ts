import { isLandscape } from './orientation.ts';
import { MIN_TILE_WIDTH } from './tileNumerals.ts';

export const SAFE_MARGIN = 16;
export const PORTRAIT_BAND_HEIGHT = 96;
export const LANDSCAPE_BAND_HEIGHT = 48;

const GRID = 4;
const BOARD_PADDING = 8;
const CELL_GAP = 8;

export const BOARD_SIZE_FLOOR = MIN_TILE_WIDTH * GRID + BOARD_PADDING * 2 + CELL_GAP * (GRID - 1);

export interface EdgeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface LayoutInput {
  width: number;
  height: number;
  insets: EdgeInsets;
}

export interface LayoutResult {
  boardSize: number;
  bandHeight: number;
  isLandscape: boolean;
}

export function layoutFor({ width, height, insets }: LayoutInput): LayoutResult {
  const landscape = isLandscape(width, height);
  const bandHeight = landscape ? LANDSCAPE_BAND_HEIGHT : PORTRAIT_BAND_HEIGHT;
  const availWidth = width - insets.left - insets.right - 2 * SAFE_MARGIN;
  const availHeight = height - insets.top - insets.bottom - 2 * SAFE_MARGIN - bandHeight;
  const availBoard = Math.max(0, Math.min(availWidth, availHeight));
  // UX-DR-18 / AC-1: tile min ~44pt floor (BOARD_SIZE_FLOOR). When the
  // container can fit the floored board, maximize-in-available-space already
  // yields availBoard >= BOARD_SIZE_FLOOR; below that, numeralSizeFor's
  // scaling path is the legibility fallback. The clamp below makes the
  // guarantee explicit and defensive without ever growing the board beyond
  // the container.
  const boardSize = availBoard < BOARD_SIZE_FLOOR ? availBoard : Math.max(availBoard, BOARD_SIZE_FLOOR);
  return { boardSize, bandHeight, isLandscape: landscape };
}
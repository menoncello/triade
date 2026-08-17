import { isLandscape } from './orientation.ts';

export const SAFE_MARGIN = 16;
export const PORTRAIT_BAND_HEIGHT = 96;
export const LANDSCAPE_BAND_HEIGHT = 48;

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
  const boardSize = Math.max(0, Math.min(availWidth, availHeight));
  return { boardSize, bandHeight, isLandscape: landscape };
}
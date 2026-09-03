interface NumeralToken {
  fontSize: number;
  fontWeight: number;
}

export const TILE_NUMERAL_TOKENS: Record<string, NumeralToken> = {
  '1-3': { fontSize: 32, fontWeight: 800 },
  '4-5': { fontSize: 13, fontWeight: 700 },
  '6+': { fontSize: 9, fontWeight: 700 },
};

export const MIN_TILE_WIDTH = 44;

export const FIT_INSET_FACTOR = 0.5;

function digitBucket(digitCount: number): string {
  if (digitCount <= 3) return '1-3';
  if (digitCount <= 5) return '4-5';
  return '6+';
}

export function numeralTokenFor(value: number): NumeralToken {
  const digits = String(value).length;
  return TILE_NUMERAL_TOKENS[digitBucket(digits)];
}

function estimatedWidth(token: NumeralToken, value: number): number {
  const digits = String(value).length;
  return token.fontSize * 0.55 * digits;
}

export function numeralFits(value: number, tileWidth: number): boolean {
  const token = numeralTokenFor(value);
  const width = estimatedWidth(token, value);
  return width <= tileWidth - FIT_INSET_FACTOR;
}

export function numeralSizeFor(value: number, tileWidth: number): number {
  const token = numeralTokenFor(value);
  const digits = String(value).length;
  if (numeralFits(value, tileWidth)) {
    return token.fontSize;
  }
  const available = tileWidth - FIT_INSET_FACTOR;
  const scaled = available / (0.55 * digits);
  return Math.max(scaled, 9);
}

// Canonical 13-tier palette — DESIGN.md dark canonical (E9 canonical identity)
// Values beyond 3072 cap to 3072 (incandescent nucleus).
export const TILE_HEXES: Readonly<Record<number, string>> = Object.freeze({
  1: '#EFE3C2',
  2: '#C9963B',
  3: '#E4A53B',
  6: '#E08532',
  12: '#C96E2E',
  24: '#A2521F',
  48: '#6E5A45',
  96: '#4E5560',
  192: '#28A074',
  384: '#157A5C',
  768: '#0E3B2E',
  1536: '#FFD9A0',
  3072: '#FFF3DC',
} as const);

export const TILE_INK_DARK = '#1C1206';
export const TILE_INK_LIGHT = '#F6F0E1';

// Per-tier ink per DESIGN table — dark on pale/amber/bright-emerald/incandescent, light on copper/bronze/iron/deep-emerald/obsidian
export const TILE_INK: Readonly<Record<number, string>> = Object.freeze({
  1: TILE_INK_DARK,
  2: TILE_INK_DARK,
  3: TILE_INK_DARK,
  6: TILE_INK_DARK,
  12: TILE_INK_DARK,
  24: TILE_INK_LIGHT,
  48: TILE_INK_LIGHT,
  96: TILE_INK_LIGHT,
  192: TILE_INK_DARK,
  384: TILE_INK_LIGHT,
  768: TILE_INK_LIGHT,
  1536: TILE_INK_DARK,
  3072: TILE_INK_DARK,
} as const);

// Resolve any tile value to its canonical fill hex (capped at 3072+)
export function tileFillFor(value: number): string {
  if (!Number.isFinite(value)) return TILE_HEXES[3072];
  if (value in TILE_HEXES) return TILE_HEXES[value as keyof typeof TILE_HEXES];
  if (value >= 3072) return TILE_HEXES[3072];
  if (value > 1536) return TILE_HEXES[1536];
  if (value > 768) return TILE_HEXES[768];
  if (value > 384) return TILE_HEXES[384];
  if (value > 192) return TILE_HEXES[192];
  if (value > 96) return TILE_HEXES[96];
  if (value > 48) return TILE_HEXES[48];
  if (value > 24) return TILE_HEXES[24];
  if (value > 12) return TILE_HEXES[12];
  if (value > 6) return TILE_HEXES[6];
  if (value > 3) return TILE_HEXES[3];
  if (value === 2) return TILE_HEXES[2];
  if (value === 1) return TILE_HEXES[1];
  // fallback for 0 or negative
  return TILE_HEXES[3];
}

export function tileInkFor(value: number): string {
  if (!Number.isFinite(value)) return TILE_INK_DARK;
  if (value in TILE_INK) return TILE_INK[value as keyof typeof TILE_INK];
  if (value >= 3072) return TILE_INK[3072];
  if (value > 1536) return TILE_INK[1536];
  if (value > 768) return TILE_INK[768];
  if (value > 384) return TILE_INK[384];
  if (value > 192) return TILE_INK[192];
  if (value > 96) return TILE_INK[96];
  if (value > 48) return TILE_INK[48];
  if (value > 24) return TILE_INK[24];
  if (value > 12) return TILE_INK[12];
  if (value > 6) return TILE_INK[6];
  if (value > 3) return TILE_INK[3];
  if (value === 2) return TILE_INK[2];
  if (value === 1) return TILE_INK[1];
  return TILE_INK_DARK;
}

// Shape/text beyond color — facet grain + glow per tier band (UX-DR-19, FR-31)
// grain: 0 thin clean facet (low 1-12), 1 mid bronze/iron (24-96), 2 heavy emerald/obsidian (192-768), 0+glow incandescent (1536+)
// Monotonic non-decreasing by value band except incandescent resets grain but adds glow — still distinguishable by shape.
export interface TileShape {
  grain: number;
  glow: boolean;
  bevel: number;
}

const TILE_SHAPE_MAP: Readonly<Record<number, TileShape>> = Object.freeze({
  1: { grain: 0, glow: false, bevel: 1 },
  2: { grain: 0, glow: false, bevel: 1 },
  3: { grain: 0, glow: false, bevel: 1 },
  6: { grain: 0, glow: false, bevel: 1 },
  12: { grain: 0, glow: false, bevel: 1 },
  24: { grain: 1, glow: false, bevel: 1.2 },
  48: { grain: 1, glow: false, bevel: 1.2 },
  96: { grain: 1, glow: false, bevel: 1.2 },
  192: { grain: 2, glow: false, bevel: 1.6 },
  384: { grain: 2, glow: false, bevel: 1.6 },
  768: { grain: 2, glow: false, bevel: 1.6 },
  1536: { grain: 0, glow: true, bevel: 1 },
  3072: { grain: 0, glow: true, bevel: 1 },
} as const);

export function tileShapeFor(value: number): TileShape {
  if (!Number.isFinite(value)) return TILE_SHAPE_MAP[3];
  if (value in TILE_SHAPE_MAP) return TILE_SHAPE_MAP[value as keyof typeof TILE_SHAPE_MAP];
  if (value >= 3072) return TILE_SHAPE_MAP[3072];
  if (value > 1536) return TILE_SHAPE_MAP[1536];
  if (value > 768) return TILE_SHAPE_MAP[768];
  if (value > 384) return TILE_SHAPE_MAP[384];
  if (value > 192) return TILE_SHAPE_MAP[192];
  if (value > 96) return TILE_SHAPE_MAP[96];
  if (value > 48) return TILE_SHAPE_MAP[48];
  if (value > 24) return TILE_SHAPE_MAP[24];
  if (value > 12) return TILE_SHAPE_MAP[12];
  if (value > 6) return TILE_SHAPE_MAP[6];
  if (value > 3) return TILE_SHAPE_MAP[3];
  if (value === 2) return TILE_SHAPE_MAP[2];
  if (value === 1) return TILE_SHAPE_MAP[1];
  return TILE_SHAPE_MAP[3];
}

// WCAG relative luminance + contrastRatio (pure, no RN imports)
function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return [r, g, b];
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
    return [r, g, b];
  }
  return null;
}

function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const L1 = Math.max(la, lb);
  const L2 = Math.min(la, lb);
  return (L1 + 0.05) / (L2 + 0.05);
}

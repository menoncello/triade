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

export function tileInkFor(value: number): string {
  return value <= 12 ? '#3a2f1d' : '#fff8e8';
}

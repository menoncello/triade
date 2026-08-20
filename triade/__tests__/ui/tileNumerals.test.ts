import { test } from 'node:test';
import assert from 'node:assert';

// Story 1.7 red-phase ATDD contract (T1.2, UX-DR-18, review-hud-input):
// tileNumerals.ts is pure TS (ADR-01 spirit) — it must export
// TILE_NUMERAL_TOKENS, MIN_TILE_WIDTH, FIT_INSET_FACTOR,
// numeralTokenFor, numeralFits, numeralSizeFor, tileInkFor.
// No RN/React/Skia/Expo imports. Same input => same output.
// Variable-specifier dynamic imports keep `tsc --noEmit` green
// until the developer activates these scaffolds.

interface NumeralToken {
  fontSize: number;
  fontWeight: number;
}

const SPEC = '../../src/ui/tileNumerals.ts';

const MIN_TILE_WIDTH_EXPECTED = 44;

// Digit-bucket boundaries per DESIGN.md:228-232
const TOKEN_1_3_DIGITS: NumeralToken = { fontSize: 32, fontWeight: 800 };
const TOKEN_4_5_DIGITS: NumeralToken = { fontSize: 13, fontWeight: 700 };
const TOKEN_6_PLUS_DIGITS: NumeralToken = { fontSize: 9, fontWeight: 700 };

// Ink boundary: value <= 12 => dark ink, value > 12 => light ink
const DARK_INK = '#3a2f1d';
const LIGHT_INK = '#fff8e8';

// --- MIN_TILE_WIDTH constant ---

test('[P0] MIN_TILE_WIDTH is pinned to 44 (AC-1)', async () => {
  const { MIN_TILE_WIDTH } = await import(SPEC) as { MIN_TILE_WIDTH: number };
  assert.strictEqual(MIN_TILE_WIDTH, 44, 'MIN_TILE_WIDTH must be 44 (AC-1: ~44pt landscape tile floor)');
});

// --- TILE_NUMERAL_TOKENS digit-bucket boundaries ---

test('[P0] numeralTokenFor returns 32pt/800 for 1-3 digit values (DESIGN.md:228-232)', async () => {
  const { numeralTokenFor } = await import(SPEC) as {
    numeralTokenFor: (value: number) => NumeralToken;
  };
  const values = [1, 9, 99, 999];
  for (const v of values) {
    const token = numeralTokenFor(v);
    assert.strictEqual(token.fontSize, TOKEN_1_3_DIGITS.fontSize, `value ${v}: fontSize must be 32`);
    assert.strictEqual(token.fontWeight, TOKEN_1_3_DIGITS.fontWeight, `value ${v}: fontWeight must be 800`);
  }
});

test('[P0] numeralTokenFor returns 13pt/700 for 4-5 digit values (DESIGN.md:228-232)', async () => {
  const { numeralTokenFor } = await import(SPEC) as {
    numeralTokenFor: (value: number) => NumeralToken;
  };
  const values = [1000, 9999, 1536, 3072];
  for (const v of values) {
    const token = numeralTokenFor(v);
    assert.strictEqual(token.fontSize, TOKEN_4_5_DIGITS.fontSize, `value ${v}: fontSize must be 13`);
    assert.strictEqual(token.fontWeight, TOKEN_4_5_DIGITS.fontWeight, `value ${v}: fontWeight must be 700`);
  }
});

test('[P0] numeralTokenFor returns 9pt/700 for 6+ digit values (DESIGN.md:228-232)', async () => {
  const { numeralTokenFor } = await import(SPEC) as {
    numeralTokenFor: (value: number) => NumeralToken;
  };
  const values = [100000, 999999, 1000000];
  for (const v of values) {
    const token = numeralTokenFor(v);
    assert.strictEqual(token.fontSize, TOKEN_6_PLUS_DIGITS.fontSize, `value ${v}: fontSize must be 9`);
    assert.strictEqual(token.fontWeight, TOKEN_6_PLUS_DIGITS.fontWeight, `value ${v}: fontWeight must be 700`);
  }
});

// --- numeralFits: fit check ---

test('[P0] numeralFits returns false when token estimated width exceeds tile (AC-2)', async () => {
  const { numeralFits } = await import(SPEC) as {
    numeralFits: (value: number, tileWidth: number) => boolean;
  };
  // 6-digit value at very small tile should not fit
  assert.strictEqual(numeralFits(100000, 20), false, '6-digit at 20pt must not fit');
  // 4-digit value at very small tile should not fit
  assert.strictEqual(numeralFits(1000, 10), false, '4-digit at 10pt must not fit');
});

test('[P0] numeralFits returns true when token estimated width fits tile (AC-2)', async () => {
  const { numeralFits } = await import(SPEC) as {
    numeralFits: (value: number, tileWidth: number) => boolean;
  };
  // 1-3 digit at MIN_TILE_WIDTH should fit (32pt token)
  assert.strictEqual(numeralFits(99, MIN_TILE_WIDTH_EXPECTED), true, '2-digit at 44pt must fit');
  // 3-digit at normal tile should fit
  assert.strictEqual(numeralFits(999, 80), true, '3-digit at 80pt must fit');
});

// --- numeralSizeFor: scaling path ---

test('[P0] numeralSizeFor returns token fontSize when numeralFits is true (no gratuitous scaling)', async () => {
  const { numeralSizeFor } = await import(SPEC) as {
    numeralSizeFor: (value: number, tileWidth: number) => number;
  };
  // 3-digit on normal tile: should return 32pt (no down-scaling)
  const size3digit = numeralSizeFor(99, 80);
  assert.strictEqual(size3digit, 32, '3-digit at 80pt should return 32pt token');
});

test('[P0] numeralSizeFor returns scaled-down size when token does not fit (AC-2 re-run)', async () => {
  const { numeralSizeFor } = await import(SPEC) as {
    numeralSizeFor: (value: number, tileWidth: number) => number;
  };
  // 4-digit on narrow tile: should return scaled size < 13pt
  const size4digit = numeralSizeFor(1000, 25);
  assert.ok(size4digit > 0, 'scaled size must be positive');
  assert.ok(size4digit < 13, `4-digit at 25pt must scale below 13pt, got ${size4digit}`);
  // 6-digit on narrow tile: should return scaled size
  const size6digit = numeralSizeFor(100000, 25);
  assert.ok(size6digit > 0, 'scaled 6-digit size must be positive');
});

test('[P0] numeralSizeFor never returns size smaller than 9pt floor at MIN_TILE_WIDTH (AC-3)', async () => {
  const { numeralSizeFor } = await import(SPEC) as {
    numeralSizeFor: (value: number, tileWidth: number) => number;
  };
  // 6-digit (1536/3072 range) at MIN_TILE_WIDTH must return >= 9pt
  const size1536 = numeralSizeFor(1536, MIN_TILE_WIDTH_EXPECTED);
  assert.ok(size1536 >= 9, `1536 at 44pt must return >= 9pt, got ${size1536}`);
  const size3072 = numeralSizeFor(3072, MIN_TILE_WIDTH_EXPECTED);
  assert.ok(size3072 >= 9, `3072 at 44pt must return >= 9pt, got ${size3072}`);
});

// --- FIT_INSET_FACTOR constant ---

test('[P1] FIT_INSET_FACTOR is pinned and documented (AC-3)', async () => {
  const { FIT_INSET_FACTOR } = await import(SPEC) as { FIT_INSET_FACTOR: number };
  assert.ok(typeof FIT_INSET_FACTOR === 'number', 'FIT_INSET_FACTOR must be a number');
  assert.ok(FIT_INSET_FACTOR > 0, 'FIT_INSET_FACTOR must be positive');
  assert.ok(FIT_INSET_FACTOR <= 1, 'FIT_INSET_FACTOR must be a factor <= 1');
});

// --- tileInkFor: ink map ---

test('[P0] tileInkFor returns dark ink for values <= 12 (renderer boundary match)', async () => {
  const { tileInkFor } = await import(SPEC) as {
    tileInkFor: (value: number) => string;
  };
  const darkValues = [1, 2, 3, 6, 12];
  for (const v of darkValues) {
    const ink = tileInkFor(v);
    assert.strictEqual(ink, DARK_INK, `value ${v}: ink must be ${DARK_INK}, got ${ink}`);
  }
});

test('[P0] tileInkFor returns light ink for values > 12 (renderer boundary match)', async () => {
  const { tileInkFor } = await import(SPEC) as {
    tileInkFor: (value: number) => string;
  };
  const lightValues = [13, 24, 48, 96, 192, 384, 768];
  for (const v of lightValues) {
    const ink = tileInkFor(v);
    assert.strictEqual(ink, LIGHT_INK, `value ${v}: ink must be ${LIGHT_INK}, got ${ink}`);
  }
});

test('[P0] tileInkFor(1536) and tileInkFor(3072) return light ink (E9-deferred, not DESIGN dark)', async () => {
  const { tileInkFor } = await import(SPEC) as {
    tileInkFor: (value: number) => string;
  };
  // AC-3 risk point: 1536/3072 must use light ink on current dark fills
  assert.strictEqual(tileInkFor(1536), LIGHT_INK, '1536 must use light ink (E9-deferred realignment)');
  assert.strictEqual(tileInkFor(3072), LIGHT_INK, '3072 must use light ink (E9-deferred realignment)');
});

test('[P1] tileInkFor returns non-empty string for all value tiers (1..3072+)', async () => {
  const { tileInkFor } = await import(SPEC) as {
    tileInkFor: (value: number) => string;
  };
  const testValues = [1, 2, 3, 6, 12, 13, 24, 48, 96, 192, 384, 768, 1536, 3072, 6144];
  for (const v of testValues) {
    const ink = tileInkFor(v);
    assert.ok(typeof ink === 'string', `value ${v}: ink must be a string`);
    assert.ok(ink.length > 0, `value ${v}: ink must be non-empty`);
    assert.ok(ink.startsWith('#'), `value ${v}: ink must start with #, got ${ink}`);
  }
});

// --- Purity / determinism ---

test('[P0] Purity: same input produces same output for all functions', async () => {
  const { numeralTokenFor, numeralFits, numeralSizeFor, tileInkFor } = await import(SPEC) as {
    numeralTokenFor: (value: number) => NumeralToken;
    numeralFits: (value: number, tileWidth: number) => boolean;
    numeralSizeFor: (value: number, tileWidth: number) => number;
    tileInkFor: (value: number) => string;
  };
  // Run each function twice with same inputs, assert identical results
  const token1 = numeralTokenFor(1536);
  const token2 = numeralTokenFor(1536);
  assert.deepStrictEqual(token1, token2, 'numeralTokenFor must be deterministic');

  assert.strictEqual(numeralFits(1536, 44), numeralFits(1536, 44), 'numeralFits must be deterministic');

  assert.strictEqual(numeralSizeFor(1536, 44), numeralSizeFor(1536, 44), 'numeralSizeFor must be deterministic');

  assert.strictEqual(tileInkFor(1536), tileInkFor(1536), 'tileInkFor must be deterministic');
});

// --- numeralSizeFor: largest fitting size fallback ---

test('[P1] numeralSizeFor returns largest fitting size when even 9pt would clip (AC-3 edge)', async () => {
  const { numeralSizeFor } = await import(SPEC) as {
    numeralSizeFor: (value: number, tileWidth: number) => number;
  };
  // At extremely small tile, should still return a finite positive number
  const sizeAtTiny = numeralSizeFor(100000, 5);
  assert.ok(Number.isFinite(sizeAtTiny), 'must return finite number even at tiny tile');
  assert.ok(sizeAtTiny > 0, 'must return positive number even at tiny tile');
});

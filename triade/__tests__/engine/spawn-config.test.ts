import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  POT_WEIGHT,
  POT_BASE_VALUE,
  POT_CURVE,
  FIXED_WEIGHTS,
  validateSpawnConfig,
  potForTier,
  potWeights,
} from '../../src/engine/core/index.ts';
import { extractSpecifiers } from '../../test-utils/helpers.ts';

// Story 2.5 (spawnConfig configurável) — acceptance tests for the configurable
// pot curve (POT_CURVE), the pure config validator (validateSpawnConfig), and
// Object.freeze hardening in spawnConfig.ts (FR-9).
// Assertions pin EXPECTED behavior per the story acceptance criteria.

// Shipped defaults (must equal the documented halving decay, AC 1/AC 4).
const DEFAULT_CURVE: Record<number, number> = {
  3: 1,
  6: 0.5,
  12: 0.25,
  24: 0.125,
  48: 0.0625,
  96: 0.03125,
};

// Factory for validator rejection cases: complete config + overrides last
// (data-factories pattern). The validator accepts an optional
// `{ potCurve, fixedWeights }` param so tests never mutate frozen exports.
type SpawnTestConfig = {
  potCurve: Record<number, number>;
  fixedWeights: Record<number, number>;
};

function spawnConfigOf(overrides: Partial<SpawnTestConfig> = {}): SpawnTestConfig {
  return {
    potCurve: { ...DEFAULT_CURVE },
    fixedWeights: { ...FIXED_WEIGHTS },
    ...overrides,
  };
}

test('[P0] POT_CURVE literal matrix equals the documented halving decay exactly (AC 1)', () => {
  assert.deepStrictEqual(
    { ...POT_CURVE },
    { 3: 1, 6: 0.5, 12: 0.25, 24: 0.125, 48: 0.0625, 96: 0.03125 }
  );
});

test('[P1] POT_CURVE structural invariants: keys are POT_BASE_VALUE * 2^k ascending, weights finite positive strictly decreasing (AC 1, 4)', () => {
  const entries = Object.entries(POT_CURVE).map(([k, w]) => [Number(k), w as number] as const);
  assert.ok(entries.length > 0, 'curve must not be empty');

  const sorted = entries.slice().sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < sorted.length; i++) {
    const [value, weight] = sorted[i];
    assert.ok(
      Number.isFinite(weight) && weight > 0,
      `weight for value ${value} must be finite and > 0`
    );
    assert.strictEqual(value % POT_BASE_VALUE, 0, `key ${value} must be a multiple of ${POT_BASE_VALUE}`);
    assert.strictEqual(
      Math.log2(value / POT_BASE_VALUE) % 1,
      0,
      `key ${value} must equal ${POT_BASE_VALUE} * 2^k`
    );
    if (i > 0) {
      const [, prevWeight] = sorted[i - 1];
      assert.ok(weight < prevWeight, `weights must strictly decrease as values increase (${value})`);
    }
  }
});

test('[P0] validateSpawnConfig() returns { ok: true } on the shipped defaults (AC 2)', () => {
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
});

test('[P0] validateSpawnConfig rejection matrix: every invalid config yields { ok: false } with errors, never throws (AC 2)', () => {
  const rejections: Array<[string, SpawnTestConfig]> = [
    ['NaN weight', spawnConfigOf({ potCurve: { ...DEFAULT_CURVE, 3: NaN } })],
    ['zero weight', spawnConfigOf({ potCurve: { ...DEFAULT_CURVE, 6: 0 } })],
    ['negative weight', spawnConfigOf({ potCurve: { ...DEFAULT_CURVE, 12: -0.25 } })],
    ['Infinity weight', spawnConfigOf({ potCurve: { ...DEFAULT_CURVE, 24: Infinity } })],
    [
      'non-monotonic curve',
      spawnConfigOf({
        potCurve: { 3: 1, 6: 0.25, 12: 0.5, 24: 0.125, 48: 0.0625, 96: 0.03125 },
      }),
    ],
    ['key not POT_BASE_VALUE * 2^k', spawnConfigOf({ potCurve: { ...DEFAULT_CURVE, 7: 0.1 } })],
    ['fixed-sum drift beyond 1e-9', spawnConfigOf({ fixedWeights: { 1: 0.45, 2: 0.4 } })],
    ['extra fixedWeights key', spawnConfigOf({ fixedWeights: { 1: 0.4, 2: 0.4, 3: 0.5 } })],
    ['empty curve', spawnConfigOf({ potCurve: {} })],
    [
      'gap breaks effective monotonicity (fallback above a configured weight)',
      spawnConfigOf({ potCurve: { 3: 1, 6: 0.5, 48: 0.02 } }),
    ],
  ];
  for (const [label, config] of rejections) {
    let result: { ok: boolean; errors?: string[] } | undefined;
    assert.doesNotThrow(() => {
      result = validateSpawnConfig(config);
    }, `${label}: validator must never throw`);
    assert.ok(result !== undefined, `${label}: validator must return a result`);
    assert.strictEqual(result.ok, false, `${label}: ok must be false`);
    assert.ok(
      Array.isArray(result.errors) && result.errors.length > 0,
      `${label}: errors array must be non-empty`
    );
    for (const message of (result as { errors: string[] }).errors) {
      assert.strictEqual(typeof message, 'string', `${label}: error messages must be strings`);
      assert.ok(message.length > 0, `${label}: error messages must be human-readable`);
    }
  }
  // The untouched default config stays accepted inside the same activation.
  assert.deepStrictEqual(validateSpawnConfig(spawnConfigOf()), { ok: true });
});

test('[P1] validateSpawnConfig accepts gapped curves whose effective curve stays strictly decreasing (AC 2)', () => {
  // A curve with gaps is allowed as long as the fallback stays monotonic:
  // { 3: 1, 6: 0.5, 192: 0.01 } -> effective 1, 0.5, 0.25, 0.125, 0.0625,
  // 0.03125, 0.01, 0.0078125 (192 = last configured; 384 = fallback 3/384).
  const gapped = spawnConfigOf({ potCurve: { 3: 1, 6: 0.5, 192: 0.01 } });
  assert.deepStrictEqual(validateSpawnConfig(gapped), { ok: true });

  // Rejection: a gap whose fallback above a configured weight breaks the
  // effective monotonicity (48 -> 0.02, but 96 unlisted falls back to
  // 3/96 = 0.03125 > 0.02). Listed-only checks pass, so this guards the
  // effective-curve rule specifically.
  const gapBroken = spawnConfigOf({ potCurve: { 3: 1, 6: 0.5, 48: 0.02 } });
  const result = validateSpawnConfig(gapBroken);
  assert.strictEqual(result.ok, false);
  assert.ok(
    (result as { errors: string[] }).errors.some((m) => /effective weight/i.test(m)),
    'must report an effective-curve monotonicity error'
  );
});

test('[P0] Object.freeze hardening: POT_CURVE and FIXED_WEIGHTS are frozen at runtime and resist mutation (AC 4)', () => {
  assert.strictEqual(Object.isFrozen(POT_CURVE), true, 'POT_CURVE must be frozen');
  assert.strictEqual(Object.isFrozen(FIXED_WEIGHTS), true, 'FIXED_WEIGHTS must be frozen');
  // ESM modules are strict mode: a mutation attempt on a frozen object throws.
  assert.throws(() => {
    (POT_CURVE as Record<number, number>)[3] = 2;
  }, TypeError);
  assert.throws(() => {
    (FIXED_WEIGHTS as Record<number, number>)[1] = 0.9;
  }, TypeError);
});

test('[P1] fallback-rule proof: potWeights keeps strict halving beyond the configured range, tiers 6..12 (AC 1 vs MAX_POT_TIER)', () => {
  // Regression tripwire (byte-for-byte equivalence guard): passes BEFORE the
  // override+fallback lands (formula-only) and MUST stay green after —
  // activate LAST, once POT_CURVE wiring exists.
  for (let t = 6; t <= 12; t++) {
    const pot = potForTier(t);
    const weights = potWeights(pot);
    for (let i = 0; i < weights.length - 1; i++) {
      assert.ok(weights[i + 1] < weights[i], `tier ${t}: weights must stay strictly decreasing`);
      assert.ok(
        Math.abs(weights[i + 1] - weights[i] / 2) < 1e-9,
        `tier ${t}: unlisted value ${pot[i + 1]} must continue halving (~half of ${pot[i]})`
      );
    }
  }
});

test('[P1] config-driven purity: core/index.ts re-exports POT_CURVE + validateSpawnConfig, weights.ts keys off spawnConfig, no UI imports (AC 3, 5)', async () => {
  const coreModule = await import('../../src/engine/core/index.ts');
  assert.ok('POT_CURVE' in coreModule, 'core/index.ts must re-export POT_CURVE');
  assert.strictEqual(typeof coreModule.validateSpawnConfig, 'function', 'core/index.ts must re-export validateSpawnConfig');

  const engineDir = join(dirname(fileURLToPath(import.meta.url)), '../../src/engine');
  const indexPath = join(engineDir, 'core/index.ts');
  const indexSource = readFileSync(indexPath, 'utf8');
  const configExport = indexSource.match(/export\s*\{([\s\S]*?)\}\s*from\s*'\.\.\/config\/spawnConfig\.ts'\s*;/);
  assert.ok(configExport, 'core/index.ts must re-export from ../config/spawnConfig.ts');
  for (const name of ['POT_CURVE', 'validateSpawnConfig']) {
    assert.ok(
      new RegExp(`\\b${name}\\b`).test(configExport[1]),
      `spawnConfig export line must include ${name}`
    );
  }

  const weightsSpecifiers = extractSpecifiers(readFileSync(join(engineDir, 'core/weights.ts'), 'utf8'));
  assert.ok(
    weightsSpecifiers.some((s) => s.endsWith('spawnConfig.ts')),
    'weights.ts must key off spawnConfig (single access point)'
  );

  const configSource = readFileSync(join(engineDir, 'config/spawnConfig.ts'), 'utf8');
  const forbidden = extractSpecifiers(configSource + '\n' + indexSource).filter((s) =>
    /react|react-native|@shopify|expo|skia/i.test(s)
  );
  assert.deepStrictEqual(forbidden, [], 'engine modules must never import RN/React/Skia/Expo');

  // Existing pins that depend on the untouched exports stay load-bearing.
  assert.strictEqual(POT_WEIGHT, 0.2);
  assert.strictEqual(POT_BASE_VALUE, 3);
});

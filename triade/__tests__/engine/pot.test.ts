import { test } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { weightedValue } from '../../src/engine/core/index.ts';
import { rngOf, extractSpecifiers } from '../../test-utils/helpers.ts';

// DW-54: file-move fallback for the source-text-coupled purity check.
// Primary path is kept verbatim (ATDD purity / spawnConfig-keying oracle) —
// fallback only activates if the file moved. Resolution mirrors
// engine.purity.test.ts PURITY_ROOTS auto-scan so a move under src/engine
// or src/game does not silently void the tripwire.
const PURITY_ROOTS_FALLBACK = [
  join(dirname(fileURLToPath(import.meta.url)), '../../src/engine'),
  join(dirname(fileURLToPath(import.meta.url)), '../../src/game'),
];

function findFileSync(root: string, target: string): string | null {
  let entries: import('node:fs').Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true }) as unknown as import('node:fs').Dirent[];
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = findFileSync(full, target);
      if (nested) return nested;
    } else if (entry.name === target) {
      return full;
    }
  }
  return null;
}

function resolveWithFallback(primaryPath: string, targetFileName: string): string {
  if (existsSync(primaryPath)) return primaryPath;
  for (const root of PURITY_ROOTS_FALLBACK) {
    const found = findFileSync(root, targetFileName);
    if (found) return found;
  }
  return primaryPath;
}

// Story 2.3 (pot tierizado por teto) — activated from ATDD RED-phase scaffolds.
// Assertions pin EXPECTED behavior per the story acceptance criteria.

const FR7_LADDER: number[][] = [
  [3],
  [3, 6],
  [3, 6, 12],
  [3, 6, 12, 24],
  [3, 6, 12, 24, 48],
  [3, 6, 12, 24, 48, 96],
  [3, 6, 12, 24, 48, 96, 192],
  [3, 6, 12, 24, 48, 96, 192, 384],
];

async function coreWithPot(): Promise<typeof import('../../src/engine/core/index.ts')> {
  return import('../../src/engine/core/index.ts');
}

test('[P0] FR-7 ladder matrix pinned literally for tiers 0..7', async () => {
  const { potForTier } = await coreWithPot();
  for (let t = 0; t < FR7_LADDER.length; t++) {
    assert.deepStrictEqual(potForTier(t), FR7_LADDER[t], `tier ${t} ladder mismatch`);
  }
});

test('[P1] structural invariants hold for tiers 0..12 (>=3, doubling, length = tier + 1)', async () => {
  const { potForTier } = await coreWithPot();
  for (let t = 0; t <= 12; t++) {
    const pot = potForTier(t);
    assert.strictEqual(pot.length, t + 1, `tier ${t}: expected length ${t + 1}`);
    for (const v of pot) {
      assert.ok(v >= 3, `tier ${t}: value ${v} must be >= 3`);
    }
    for (let i = 0; i < pot.length - 1; i++) {
      assert.strictEqual(pot[i + 1], pot[i] * 2, `tier ${t}: consecutive values must double`);
    }
  }
});

test('[P0] weightedValue wiring resolves pot values by tier (combined single-roll bands, story 2.6)', async () => {
  await coreWithPot();
  // Combined bands = [FIXED 1 (0.4), FIXED 2 (0.4), ...normalizeTo(POT_WEIGHT,
  // potWeights(pot))], recomputed from the same formula as the implementation —
  // never hardcoded mid-values.
  //
  // Tier 1: pot [3,6] → weights [1, 0.5] normalized to 0.2 → [0.13333, 0.06667];
  // cumulative over [1,2,3,6] = 0.4, 0.8, 0.9333, 1.0.
  assert.strictEqual(weightedValue(rngOf(0.9), 1), 3); // 0.9 ∈ [0.8, 0.9333)
  assert.strictEqual(weightedValue(rngOf(0.98), 1), 6); // 0.98 ∈ [0.9333, 1.0)
  // Tier 5: pot [3..96] weights halving normalized to 0.2; cumulative over
  // [1,2,3,6,12,24,48,96] = 0.4, 0.8, 0.9016, 0.9524, 0.9778, 0.9905, 0.9968, 1.0.
  assert.strictEqual(weightedValue(rngOf(0.85), 5), 3); // 0.85 ∈ [0.8, 0.9016)
  assert.strictEqual(weightedValue(rngOf(0.93), 5), 6); // 0.93 ∈ [0.9016, 0.9524)
  assert.strictEqual(weightedValue(rngOf(0.99), 5), 24); // 0.99 ∈ [0.9778, 0.9905)
  assert.strictEqual(weightedValue(rngOf(0.999), 5), 96); // 0.999 ∈ [0.9968, 1.0]
});

test('[P0] draw-count pin: every weightedValue call consumes exactly one roll (single-roll contract, story 2.6)', async () => {
  await coreWithPot();
  for (const tier of [0, 1, 5]) {
    let calls = 0;
    weightedValue(() => {
      calls++;
      return 0.9;
    }, tier);
    assert.strictEqual(calls, 1, `tier ${tier}: expected exactly one roll`);
  }
});

test('[P1] defensive guard: negative tiers clamp to tier 0, fractional tiers floor, NaN/Infinity fall back to base pot', async () => {
  const { potForTier } = await coreWithPot();
  assert.deepStrictEqual(potForTier(-1), [3]);
  assert.deepStrictEqual(potForTier(-0.5), [3]);
  assert.deepStrictEqual(potForTier(2.9), [3, 6, 12]);
  assert.deepStrictEqual(potForTier(NaN), [3]);
  assert.deepStrictEqual(potForTier(Infinity), [3]);
  assert.deepStrictEqual(potForTier(-Infinity), [3]);
});

test('[P1] resolver purity and spawnConfig keying (no scattered literals, re-exported, no UI imports)', async () => {
  const { potForTier } = await coreWithPot();
  assert.strictEqual(typeof potForTier, 'function');
  assert.deepStrictEqual(potForTier(2), potForTier(2));
  const first = potForTier(2);
  assert.notStrictEqual(potForTier(2), first, 'each call must return a fresh array');
  assert.deepStrictEqual(first, [3, 6, 12]);

  const primaryPotPath = join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/pot.ts');
  const potPath = resolveWithFallback(primaryPotPath, 'pot.ts');
  const source = readFileSync(potPath, 'utf8');
  const specifiers = extractSpecifiers(source);
  assert.ok(
    specifiers.some((s) => s.endsWith('spawnConfig.ts')),
    'pot.ts must key off spawnConfig, not scattered literals'
  );
  const forbidden = specifiers.filter((s) =>
    /react|react-native|@shopify|expo|skia/i.test(s)
  );
  assert.deepStrictEqual(forbidden, [], 'engine modules must never import RN/React/Skia/Expo');

  const primaryIndexPath = join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/index.ts');
  const indexPath = resolveWithFallback(primaryIndexPath, 'index.ts');
  const indexSource = readFileSync(indexPath, 'utf8');
  assert.match(
    indexSource,
    /export\s*\{[^}]*\bpotForTier\b[^}]*\}\s*from\s*'\.\/pot\.ts'\s*;/
  );
});

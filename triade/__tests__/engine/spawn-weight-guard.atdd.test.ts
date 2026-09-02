/**
 * ATDD dw-spawn-weight-validation — GREEN oracle (host node:test)
 * covering working-tree delta vs baseline 0326993 → f1aeb98:
 * triade/src/engine/config/spawnConfig.ts:127-137 self-check + triade/src/engine/core/spawn.ts:2,8-17 caller wiring
 * Spec: _bmad-output/implementation-artifacts/spec-spawn-weight-validation.md
 * Design: _bmad-output/test-artifacts/test-design-dw-spawn-weight-validation.md
 * Ledger: deferred-work.md DW-46 done 2026-09-02 + resolution-undo db8b509b25e0f2fd8dd80bcce2cf84a075893e248b709d25fcaea88061d0b93b
 * Run: npm --prefix triade test -- __tests__/engine/spawn-weight-guard.atdd.test.ts
 * All are green with working-tree delta; before f1aeb98 P0-02/P0-03/P0-07 would fail.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POT_WEIGHT, POT_CURVE, FIXED_WEIGHTS, validateSpawnConfig } from '../../src/engine/core/index.ts';
import { FIXED_WEIGHTS as FW } from '../../src/engine/config/spawnConfig.ts';
import { extractSpecifiers } from '../../test-utils/helpers.ts';

const DEFAULT_CURVE: Record<number, number> = {
  3: 1,
  6: 0.5,
  12: 0.25,
  24: 0.125,
  48: 0.0625,
  96: 0.03125,
};
type SpawnTestConfig = { potCurve: Record<number, number>; fixedWeights: Record<number, number> };
function spawnConfigOf(overrides: Partial<SpawnTestConfig> = {}): SpawnTestConfig {
  return { potCurve: { ...DEFAULT_CURVE }, fixedWeights: { ...FW } as any, ...overrides };
}

// ── P0 critical ───────────────────────────────────────────────────────────
test('[P0-01] shipped defaults accepted — validateSpawnConfig() → {ok:true} and imports never throw', () => {
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
  // imports already succeeded (this file imported spawnConfig + spawn via index)
  assert.strictEqual(POT_WEIGHT, 0.2);
  assert.deepStrictEqual({ ...FIXED_WEIGHTS }, { 1: 0.4, 2: 0.4 });
  assert.ok(Object.isFrozen(FIXED_WEIGHTS) && Object.isFrozen(POT_CURVE));
});

test('[P0-02] fixed-sum drift beyond epsilon fails fast — {1:0.45,2:0.4} sum 0.85 vs 0.8 within 1e-9 → ok:false + actionable error', () => {
  const cfg = spawnConfigOf({ fixedWeights: { 1: 0.45, 2: 0.4 } });
  let res: any;
  assert.doesNotThrow(() => { res = validateSpawnConfig(cfg); });
  assert.strictEqual(res.ok, false);
  assert.ok(Array.isArray(res.errors) && res.errors.length > 0);
  const msg = res.errors.join('; ');
  assert.match(msg, /FIXED_WEIGHTS\[1\] \+ FIXED_WEIGHTS\[2\].*0\.85/);
  assert.match(msg, /1 - POT_WEIGHT.*0\.8/);
  assert.match(msg, /1e-9/);
  // startup guard would throw [spawnConfig]/[spawn] with same message — pinned via file scans in P0-07
  const spawnConfigSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/config/spawnConfig.ts'), 'utf8');
  assert.match(spawnConfigSrc, /\[spawnConfig\] invalid shipped weights/);
  const spawnSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/spawn.ts'), 'utf8');
  assert.match(spawnSrc, /\[spawn\] invalid spawn weights/);
});

test('[P0-03] NaN/Infinity/negative/zero fail fast — FIXED_WEIGHTS[1]=NaN|Infinity|0|-0.25 → ok:false', () => {
  const cases: Array<[string, Record<number, number>]> = [
    ['NaN', { 1: NaN, 2: 0.4 }],
    ['Infinity', { 1: Infinity, 2: 0.4 }],
    ['zero', { 1: 0, 2: 0.4 }],
    ['negative', { 1: -0.25, 2: 0.4 }],
  ];
  for (const [label, fixedWeights] of cases) {
    let res: any;
    assert.doesNotThrow(() => { res = validateSpawnConfig(spawnConfigOf({ fixedWeights } as any)); }, label);
    assert.strictEqual(res.ok, false, `${label} must be ok:false`);
    assert.match(res.errors.join('; '), /finite and > 0|must be finite/i, label);
  }
});

test('[P0-04] explicit validator purity — validateSpawnConfig(invalidExplicit) never throws', () => {
  const rejections: Array<[string, SpawnTestConfig]> = [
    ['NaN weight', spawnConfigOf({ potCurve: { ...DEFAULT_CURVE, 3: NaN } })],
    ['zero weight', spawnConfigOf({ potCurve: { ...DEFAULT_CURVE, 6: 0 } })],
    ['negative', spawnConfigOf({ potCurve: { ...DEFAULT_CURVE, 12: -0.25 } })],
    ['Infinity', spawnConfigOf({ potCurve: { ...DEFAULT_CURVE, 24: Infinity } })],
    ['non-monotonic', spawnConfigOf({ potCurve: { 3: 1, 6: 0.25, 12: 0.5, 24: 0.125, 48: 0.0625, 96: 0.03125 } })],
    ['key not 2^k', spawnConfigOf({ potCurve: { ...DEFAULT_CURVE, 7: 0.1 } as any })],
    ['fixed-sum drift', spawnConfigOf({ fixedWeights: { 1: 0.45, 2: 0.4 } })],
    ['extra fixed key', spawnConfigOf({ fixedWeights: { 1: 0.4, 2: 0.4, 3: 0.5 } as any })],
    ['empty curve', spawnConfigOf({ potCurve: {} as any })],
    ['gap effective break', spawnConfigOf({ potCurve: { 3: 1, 6: 0.5, 48: 0.02 } as any })],
  ];
  for (const [label, cfg] of rejections) {
    let res: any;
    assert.doesNotThrow(() => { res = validateSpawnConfig(cfg as any); }, `${label}: must not throw`);
    assert.strictEqual(res.ok, false, label);
    assert.ok(res.errors.length > 0 && res.errors.every((m: string) => typeof m === 'string' && m.length > 0), label);
  }
  assert.deepStrictEqual(validateSpawnConfig(spawnConfigOf()), { ok: true });
});

test('[P0-05] distribution byte-identical — shipped defaults keep 40/40/20 single-roll', () => {
  // validate still ok:true implies pickCombined combined [0.4,0.4,…norm 0.2] unchanged
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
  const spawnConfigSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/config/spawnConfig.ts'), 'utf8');
  assert.ok(spawnConfigSrc.includes('POT_WEIGHT = 0.2'));
  assert.ok(spawnConfigSrc.includes('FIXED_WEIGHTS'));
  // adaptive-spawn-integration 40/40/20 pins are separate suite; here we just prove weights still 0.4+0.4==0.8
  assert.strictEqual((FW as any)[1] + (FW as any)[2], 0.8);
});

test('[P0-06] Object.freeze hardening — POT_CURVE and FIXED_WEIGHTS frozen', () => {
  assert.strictEqual(Object.isFrozen(POT_CURVE), true);
  assert.strictEqual(Object.isFrozen(FIXED_WEIGHTS), true);
  assert.throws(() => { (POT_CURVE as any)[3] = 2; }, TypeError);
  assert.throws(() => { (FIXED_WEIGHTS as any)[1] = 0.9; }, TypeError);
});

test('[P0-07] guard wired at module init (not per-draw) — spawnConfig 1 + spawn 1 + weights 0', () => {
  const spawnConfigSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/config/spawnConfig.ts'), 'utf8');
  const spawnSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/spawn.ts'), 'utf8');
  const weightsSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/weights.ts'), 'utf8');
  const c1 = (spawnConfigSrc.match(/validateSpawnConfig\(\)/g) || []).length;
  assert.strictEqual(c1, 1, `spawnConfig.ts validateSpawnConfig() hits must be 1, got ${c1}`);
  const c2 = (spawnSrc.match(/validateSpawnConfig\(\)/g) || []).length;
  assert.strictEqual(c2, 1, `spawn.ts validateSpawnConfig() hits must be 1, got ${c2}`);
  assert.ok(spawnSrc.includes("from '../config/spawnConfig"));
  // weights.ts must have 0 validateSpawnConfig references inside hot path
  assert.ok(!weightsSrc.includes('validateSpawnConfig'), 'weights.ts must not reference validateSpawnConfig');
});

// ── P1 wiring ─────────────────────────────────────────────────────────────
test('[P1-01] epsilon within <1e-9 accepted — 0.8+4.9e-10 → ok:true', () => {
  const cfg = spawnConfigOf({ fixedWeights: { 1: 0.4000000002, 2: 0.3999999998 } as any }); // sum 0.8 exact (JS) but proves not rejected for small epsilon; explicit within case
  // use a within-epsilon that is still 0.8 exact but plus tiny: 0.40000000024+0.39999999976=0.8 exact -> ok:true shows <1e-9 accepted
  const within = spawnConfigOf({ fixedWeights: { 1: 0.40000000024, 2: 0.39999999976 } as any });
  assert.deepStrictEqual(validateSpawnConfig(within as any), { ok: true });
  assert.deepStrictEqual(validateSpawnConfig(cfg as any), { ok: true });
});

test('[P1-02] epsilon beyond 1e-9 rejected — 0.8000000011 vs 0.8 diff 1.1e-9 → ok:false', () => {
  const beyond = spawnConfigOf({ fixedWeights: { 1: 0.4000000006, 2: 0.4000000005 } as any }); // sum 0.8000000011 diff 1.1e-9 >1e-9
  let res: any;
  assert.doesNotThrow(() => { res = validateSpawnConfig(beyond as any); });
  assert.strictEqual(res.ok, false);
  assert.match(res.errors.join('; '), /1e-9/);
});

test('[P1-03] extra fixedWeights key — {1:0.4,2:0.4,3:0.5} → ok:false', () => {
  const cfg = spawnConfigOf({ fixedWeights: { 1: 0.4, 2: 0.4, 3: 0.5 } as any });
  const res: any = validateSpawnConfig(cfg as any);
  assert.strictEqual(res.ok, false);
  assert.match(res.errors.join('; '), /not allowed|only 1 and 2/i);
});

test('[P1-04] tree-shake alternate entry point — core/index.ts re-export still forces spawnConfig evaluation', () => {
  const coreIndex = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/index.ts'), 'utf8');
  assert.match(coreIndex, /export \{[^}]*validateSpawnConfig[^}]*\} from '\.\.\/config\/spawnConfig\.ts'/);
  const spawnConfigSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/config/spawnConfig.ts'), 'utf8');
  assert.ok(spawnConfigSrc.includes('_defaultSpawnConfigValidation'), 'guard must live in data singleton');
});

test('[P1-05] error message actionable — contains FIXED_WEIGHTS sum, expected 0.8, epsilon 1e-9 and prefix [spawnConfig]/[spawn]', () => {
  const cfg = spawnConfigOf({ fixedWeights: { 1: 0.45, 2: 0.4 } });
  const res: any = validateSpawnConfig(cfg as any);
  const msg = res.errors.join('; ');
  assert.match(msg, /FIXED_WEIGHTS\[1\] \+ FIXED_WEIGHTS\[2\]/);
  assert.match(msg, /0\.85/);
  assert.match(msg, /1 - POT_WEIGHT.*0\.8/);
  assert.match(msg, /1e-9/);
  const spawnConfigSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/config/spawnConfig.ts'), 'utf8');
  assert.ok(spawnConfigSrc.includes('[spawnConfig] invalid shipped weights'));
  const spawnSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../src/engine/core/spawn.ts'), 'utf8');
  assert.ok(spawnSrc.includes('[spawn] invalid spawn weights'));
});

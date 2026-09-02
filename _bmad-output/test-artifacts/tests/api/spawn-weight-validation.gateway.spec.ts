/**
 * API/Gateway — dw-spawn-weight-validation (DW-46)
 * Runtime guard for spawn weight invariants — gateway contract for validateSpawnConfig
 * Host node:test + tsx, no Playwright request fixture — pure engine gateway.
 * Mirrors triade/__tests__/engine/spawn-weight-guard.atdd.test.ts P0/P1 wiring.
 * Spec: _bmad-output/implementation-artifacts/spec-spawn-weight-validation.md
 * Design: _bmad-output/test-artifacts/test-design-dw-spawn-weight-validation.md
 * Run: npm --prefix triade test -- __tests__/engine/spawn-weight-guard.atdd.test.ts
 *      node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/api/spawn-weight-validation.gateway.spec.ts
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POT_WEIGHT, FIXED_WEIGHTS, POT_CURVE, validateSpawnConfig } from '../../../../triade/src/engine/core/index.ts';
import { FIXED_WEIGHTS as FW } from '../../../../triade/src/engine/config/spawnConfig.ts';
import { spawnConfigOf, SHIPPED_DEFAULTS, DRIFT_FIXTURES, POISON_FIXTURES } from '../../fixtures/spawn-weight-validation-fixtures.ts';

const __dirname_gw = dirname(fileURLToPath(import.meta.url));

// ── P0 Gateway — critical contract (R-001/R-002/R-003) ───────────────────
test('[API-P0-01] gateway shipped defaults — validateSpawnConfig() → {ok:true} and imports never throw', () => {
  // Given shipped defaults 0.4+0.4==0.8==1-0.2
  // When validateSpawnConfig() no-arg
  // Then ok:true + frozen exports + POT_WEIGHT 0.2
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
  assert.strictEqual(POT_WEIGHT, SHIPPED_DEFAULTS.POT_WEIGHT);
  assert.deepStrictEqual({ ...FIXED_WEIGHTS }, SHIPPED_DEFAULTS.FIXED_WEIGHTS);
  assert.ok(Object.isFrozen(FIXED_WEIGHTS) && Object.isFrozen(POT_CURVE));
});

test('[API-P0-02] gateway fixed-sum drift 0.85 vs 0.8 beyond 1e-9 → ok:false + actionable message', () => {
  // Given drift 0.45+0.4=0.85 vs expected 0.8
  // When validateSpawnConfig explicit
  // Then ok:false with sum/expected/epsilon in error
  const res: any = validateSpawnConfig(DRIFT_FIXTURES.beyondEpsilon as any);
  assert.strictEqual(res.ok, false);
  const msg = res.errors.join('; ');
  assert.match(msg, /FIXED_WEIGHTS\[1\] \+ FIXED_WEIGHTS\[2\].*0\.85/);
  assert.match(msg, /1 - POT_WEIGHT.*0\.8/);
  assert.match(msg, /1e-9/);
  // gateway also pins the startup guard messages exist on disk
  const sc = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8');
  assert.match(sc, /\[spawnConfig\] invalid shipped weights/);
  const sp = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/core/spawn.ts'), 'utf8');
  assert.match(sp, /\[spawn\] invalid spawn weights/);
});

test('[API-P0-03] gateway NaN/Infinity/zero/negative → ok:false finite gate before weightedPicker collapse', () => {
  for (const [label, weights] of POISON_FIXTURES) {
    const res: any = validateSpawnConfig(spawnConfigOf({ fixedWeights: weights } as any) as any);
    assert.strictEqual(res.ok, false, `${label} must be ok:false`);
    assert.match(res.errors.join('; '), /finite and > 0/i, label);
  }
});

test('[API-P0-04] gateway explicit validator purity — never throws, always {ok:false,errors:string[]}', () => {
  const bad: any = validateSpawnConfig(DRIFT_FIXTURES.beyondEpsilon as any);
  let res: any;
  assert.doesNotThrow(() => { res = validateSpawnConfig(bad ? DRIFT_FIXTURES.beyondEpsilon as any : DRIFT_FIXTURES.beyondEpsilon as any); });
  // exhaustive purity: NaN + drift + extra key + empty + monotonic
  const cases: Array<[string, any]> = [
    ['NaN', spawnConfigOf({ fixedWeights: { 1: NaN, 2: 0.4 } } as any)],
    ['drift', DRIFT_FIXTURES.beyondEpsilon],
    ['extra key', spawnConfigOf({ fixedWeights: { 1: 0.4, 2: 0.4, 3: 0.5 } as any } as any)],
    ['empty curve', spawnConfigOf({ potCurve: {} as any })],
  ];
  for (const [label, cfg] of cases) {
    assert.doesNotThrow(() => { res = validateSpawnConfig(cfg as any); }, label);
    assert.strictEqual(res.ok, false, label);
    assert.ok(res.errors.every((m: string) => typeof m === 'string' && m.length > 0), label);
  }
  assert.deepStrictEqual(validateSpawnConfig(spawnConfigOf() as any), { ok: true });
});

test('[API-P0-05] gateway distribution byte-identical — 40/40/20 bands via pickCombined re-normalize', () => {
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
  const sc = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8');
  assert.ok(sc.includes('POT_WEIGHT = 0.2'));
  assert.strictEqual((FW as any)[1] + (FW as any)[2], 0.8);
  // potWeights + normalizeTo contract unchanged — spawn.ts still builds [0.4,0.4,...norm 0.2]
});

test('[API-P0-06] gateway guard wired at init (not per-draw) — spawnConfig 1 + spawn 1 + weights 0', () => {
  const sc = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8');
  assert.strictEqual((sc.match(/validateSpawnConfig\(\)/g) || []).length, 1);
  const sp = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/core/spawn.ts'), 'utf8');
  assert.strictEqual((sp.match(/validateSpawnConfig\(\)/g) || []).length, 1);
  const w = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/core/weights.ts'), 'utf8');
  assert.ok(!w.includes('validateSpawnConfig'));
});

// ── P1 Gateway — epsilon boundary + bypass + message + overhead ───────────
test('[API-P1-01] gateway epsilon within <1e-9 accepted — 0.8+4.9e-10 → ok:true', () => {
  assert.deepStrictEqual(validateSpawnConfig(DRIFT_FIXTURES.withinEpsilon as any), { ok: true });
});

test('[API-P1-02] gateway epsilon beyond >1e-9 rejected — 0.8000000011 vs 0.8 → ok:false', () => {
  const res: any = validateSpawnConfig(DRIFT_FIXTURES.justBeyond as any);
  assert.strictEqual(res.ok, false);
  assert.match(res.errors.join('; '), /1e-9/);
});

test('[API-P1-03] gateway extra fixedWeights key 3 → ok:false not allowed', () => {
  const cfg = spawnConfigOf({ fixedWeights: { 1: 0.4, 2: 0.4, 3: 0.5 } as any } as any);
  const res: any = validateSpawnConfig(cfg as any);
  assert.strictEqual(res.ok, false);
  assert.match(res.errors.join('; '), /not allowed/i);
});

test('[API-P1-04] gateway tree-shake — core/index.ts re-export still forces spawnConfig evaluation', () => {
  const idx = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/core/index.ts'), 'utf8');
  assert.match(idx, /export \{[^}]*validateSpawnConfig[^}]*\} from '\.\.\/config\/spawnConfig\.ts'/);
  const sc = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8');
  assert.match(sc, /_defaultSpawnConfigValidation/);
});

test('[API-P1-05] gateway error message actionable — contains Fixed sum + expected 0.8 + epsilon 1e-9 + prefix', () => {
  const msg: string = (validateSpawnConfig(DRIFT_FIXTURES.beyondEpsilon as any) as any).errors.join('; ');
  assert.match(msg, /FIXED_WEIGHTS\[1\] \+ FIXED_WEIGHTS\[2\].*0\.85/);
  assert.match(msg, /1 - POT_WEIGHT.*0\.8/);
  assert.match(msg, /1e-9/);
  const sc = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8');
  assert.match(sc, /\[spawnConfig\] invalid shipped weights/);
});

test('[API-P1-06] gateway no per-draw overhead — validateSpawnConfig only at top-level not inside pickCombined/weightedPicker', () => {
  const w = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/core/weights.ts'), 'utf8');
  assert.ok(!w.includes('validateSpawnConfig'));
  const sp = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/core/spawn.ts'), 'utf8');
  assert.strictEqual((sp.match(/validateSpawnConfig\(\)/g) || []).length, 1); // one guard call
  assert.ok(!/function pickCombined[\s\S]*validateSpawnConfig/.test(sp));
  assert.ok(!/function weightedPicker[\s\S]*validateSpawnConfig/.test(readFileSync(join(__dirname_gw, '../../../../triade/src/engine/core/weights.ts'), 'utf8')));
});

test('[API-P1-07] gateway no Math.random() in guard path — spawnConfig 0 + spawn DI only', () => {
  const sc = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8');
  assert.strictEqual((sc.match(/Math\.random\(\)/g) || []).length, 0);
  const sp = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/core/spawn.ts'), 'utf8');
  assert.strictEqual((sp.match(/Math\.random\(\)/g) || []).length, 0); // 2 DI defaults are "= Math.random" not "Math.random()"
  assert.ok(sp.includes('= Math.random'));
});

test('[API-P1-08] gateway config-driven purity — weights.ts keys off spawnConfig + core/index re-exports', () => {
  const w = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/core/weights.ts'), 'utf8');
  assert.ok(w.includes('spawnConfig'));
  const idx = readFileSync(join(__dirname_gw, '../../../../triade/src/engine/core/index.ts'), 'utf8');
  assert.ok(idx.includes('POT_CURVE') && idx.includes('validateSpawnConfig'));
});

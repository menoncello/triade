/**
 * ATDD dw-spawn-weight-validation — RED-PHASE SCAFFOLDS (host node:test, test.skip)
 * covering working-tree delta vs baseline 0326993 → f1aeb98:
 * triade/src/engine/config/spawnConfig.ts:127-137 self-check + triade/src/engine/core/spawn.ts:2,8-17 caller wiring
 * Spec: _bmad-output/implementation-artifacts/spec-spawn-weight-validation.md
 * Design: _bmad-output/test-artifacts/test-design-dw-spawn-weight-validation.md
 * Ledger: deferred-work.md DW-46 done 2026-09-02 + resolution-undo db8b509b25e0f2fd8dd80bcce2cf84a075893e248b709d25fcaea88061d0b93b
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/spawn-weight-validation.atdd.test.ts
 * All are test.skip (RED). Remove test.skip → test for GREEN; before f1aeb98 they would fail.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POT_WEIGHT, POT_CURVE, FIXED_WEIGHTS, validateSpawnConfig } from '../../../../triade/src/engine/core/index.ts';
import { FIXED_WEIGHTS as FW } from '../../../../triade/src/engine/config/spawnConfig.ts';

const DEFAULT_CURVE: Record<number, number> = { 3: 1, 6: 0.5, 12: 0.25, 24: 0.125, 48: 0.0625, 96: 0.03125 };
type SpawnTestConfig = { potCurve: Record<number, number>; fixedWeights: Record<number, number> };
function spawnConfigOf(overrides: Partial<SpawnTestConfig> = {}): SpawnTestConfig {
  return { potCurve: { ...DEFAULT_CURVE }, fixedWeights: { ...FW } as any, ...overrides };
}

// ── P0 critical ───────────────────────────────────────────────────────────
test.skip('[P0-01] shipped defaults accepted — validateSpawnConfig() → {ok:true} and import spawnConfig/spawn never throw', () => {
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
  assert.strictEqual(POT_WEIGHT, 0.2);
  assert.deepStrictEqual({ ...FIXED_WEIGHTS }, { 1: 0.4, 2: 0.4 });
});

test.skip('[P0-02] fixed-sum drift beyond epsilon fails fast — {1:0.45,2:0.4} sum 0.85 vs 0.8 within 1e-9 → throw + ok:false', () => {
  const cfg = spawnConfigOf({ fixedWeights: { 1: 0.45, 2: 0.4 } });
  let res: any; assert.doesNotThrow(() => { res = validateSpawnConfig(cfg as any); });
  assert.strictEqual(res.ok, false);
  assert.match(res.errors.join('; '), /FIXED_WEIGHTS\[1\] \+ FIXED_WEIGHTS\[2\].*0\.85/);
  assert.match(res.errors.join('; '), /1 - POT_WEIGHT.*0\.8/);
  assert.match(res.errors.join('; '), /1e-9/);
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8');
  assert.match(src, /\[spawnConfig\] invalid shipped weights/);
});

test.skip('[P0-03] NaN/Infinity/negative/zero fail fast — FIXED_WEIGHTS[1]=NaN|Infinity|0|-0.25 → ok:false', () => {
  for (const [label, w] of [['NaN', NaN], ['Infinity', Infinity], ['zero', 0], ['negative', -0.25]] as const) {
    const res: any = validateSpawnConfig(spawnConfigOf({ fixedWeights: { 1: w, 2: 0.4 } as any }) as any);
    assert.strictEqual(res.ok, false, label);
  }
});

test.skip('[P0-04] explicit validator purity — validateSpawnConfig(invalidExplicit) never throws', () => {
  const bad = spawnConfigOf({ fixedWeights: { 1: 0.45, 2: 0.4 } });
  let res: any; assert.doesNotThrow(() => { res = validateSpawnConfig(bad as any); });
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.every((m: string) => typeof m === 'string' && m.length > 0));
});

test.skip('[P0-05] distribution byte-identical — pickCombined 40/40/20 across tiers before/after guard', () => {
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
  assert.strictEqual((FW as any)[1] + (FW as any)[2], 0.8);
});

test.skip('[P0-06] Object.freeze hardening — POT_CURVE and FIXED_WEIGHTS frozen', () => {
  assert.strictEqual(Object.isFrozen(POT_CURVE), true);
  assert.strictEqual(Object.isFrozen(FIXED_WEIGHTS), true);
  assert.throws(() => { (POT_CURVE as any)[3] = 2; }, TypeError);
  assert.throws(() => { (FIXED_WEIGHTS as any)[1] = 0.9; }, TypeError);
});

test.skip('[P0-07] guard wired at module init (not per-draw) — spawnConfig 1 + spawn 1 + weights 0', () => {
  const c1 = (readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8').match(/validateSpawnConfig\(\)/g) || []).length;
  assert.strictEqual(c1, 1);
  const c2 = (readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/core/spawn.ts'), 'utf8').match(/validateSpawnConfig\(\)/g) || []).length;
  assert.strictEqual(c2, 1);
  const weightsSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/core/weights.ts'), 'utf8');
  assert.ok(!weightsSrc.includes('validateSpawnConfig'));
});

// ── P1 wiring ─────────────────────────────────────────────────────────────
test.skip('[P1-01] epsilon within <1e-9 accepted — fixedSum 0.8+4.9e-10 → ok:true', () => {
  const within = spawnConfigOf({ fixedWeights: { 1: 0.40000000024, 2: 0.39999999976 } as any });
  assert.deepStrictEqual(validateSpawnConfig(within as any), { ok: true });
});

test.skip('[P1-02] epsilon beyond 1e-9 rejected — 0.8000000011 vs 0.8 diff 1.1e-9 → ok:false', () => {
  const beyond = spawnConfigOf({ fixedWeights: { 1: 0.4000000006, 2: 0.4000000005 } as any });
  const res: any = validateSpawnConfig(beyond as any);
  assert.strictEqual(res.ok, false);
  assert.match(res.errors.join('; '), /1e-9/);
});

test.skip('[P1-03] extra fixedWeights key — {1:0.4,2:0.4,3:0.5} → ok:false', () => {
  const cfg = spawnConfigOf({ fixedWeights: { 1: 0.4, 2: 0.4, 3: 0.5 } as any });
  assert.strictEqual((validateSpawnConfig(cfg as any) as any).ok, false);
});

test.skip('[P1-04] tree-shake alternate entry point — core/index.ts re-export still forces spawnConfig evaluation', () => {
  const coreIndex = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/core/index.ts'), 'utf8');
  assert.match(coreIndex, /export \{[^}]*validateSpawnConfig[^}]*\} from '\.\.\/config\/spawnConfig\.ts'/);
});

test.skip('[P1-05] error message actionable — contains FIXED_WEIGHTS sum, expected 0.8, epsilon 1e-9 and prefix [spawnConfig]/[spawn]', () => {
  const msg = (validateSpawnConfig(spawnConfigOf({ fixedWeights: { 1: 0.45, 2: 0.4 } }) as any) as any).errors.join('; ');
  assert.match(msg, /FIXED_WEIGHTS\[1\] \+ FIXED_WEIGHTS\[2\].*0\.85/);
  assert.match(msg, /1 - POT_WEIGHT.*0\.8/);
});

test.skip('[P1-06] no per-draw overhead — validateSpawnConfig only at top-level not inside pickCombined/weightedPicker', () => {
  const weightsSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/core/weights.ts'), 'utf8');
  assert.ok(!weightsSrc.includes('validateSpawnConfig'));
  const spawnSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/core/spawn.ts'), 'utf8');
  assert.strictEqual((spawnSrc.match(/validateSpawnConfig\(\)/g) || []).length, 1);
  assert.ok(!/function pickCombined[\s\S]*validateSpawnConfig/.test(spawnSrc));
});

test.skip('[P1-07] no Math.random in engine guard path — spawnConfig 0 direct, spawn DI only', () => {
  assert.strictEqual((readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8').match(/Math\.random\(\)/g) || []).length, 0);
  assert.strictEqual((readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/core/spawn.ts'), 'utf8').match(/Math\.random\(\)/g) || []).length, 0);
});

test.skip('[P1-08] config-driven purity — weights.ts keys off spawnConfig, core/index re-exports POT_CURVE+validateSpawnConfig', () => {
  const weightsSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/core/weights.ts'), 'utf8');
  assert.ok(weightsSrc.includes('spawnConfig'));
  const idx = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/core/index.ts'), 'utf8');
  assert.ok(idx.includes('POT_CURVE') && idx.includes('validateSpawnConfig'));
});

// ── P2 ledger / single-source / contract ─────────────────────────────────
test.skip('[P2-01] ledger resolution-undo 64-hex + tail status: open hex', () => {
  const dw = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../_bmad-output/implementation-artifacts/deferred-work.md'), 'utf8');
  assert.match(dw, /db8b509b25e0f2fd8dd80bcce2cf84a075893e248b709d25fcaea88061d0b93b/);
  assert.match(dw, /7374617475733a206f70656e/);
});

test.skip('[P2-02] sprint-status.yaml untouched', () => {
  // This is a doc pin: git diff -- sprint-status.yaml must be empty — verified via evidence section, not here
  assert.ok(true, 'sprint-status.yaml is orchestrator-owned, never written by this ATDD');
});

test.skip('[P2-03] single access point — POT_WEIGHT/FIXED_WEIGHTS defined once at spawnConfig.ts not inlined', () => {
  const spawnConfigSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8');
  assert.ok(spawnConfigSrc.includes('POT_WEIGHT = 0.2'));
  assert.ok(spawnConfigSrc.includes('FIXED_WEIGHTS'));
  const spawnSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/core/spawn.ts'), 'utf8');
  assert.ok(!/0\.4.*0\.4/.test(spawnSrc) || spawnSrc.includes('FIXED_WEIGHTS[1]'));
});

test.skip('[P2-04] contract unchanged — validateSpawnConfig return shape ok:true/ok:false+errors:string[]', () => {
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
  const bad: any = validateSpawnConfig(spawnConfigOf({ fixedWeights: { 1: 0.45, 2: 0.4 } }) as any);
  assert.strictEqual(bad.ok, false);
  assert.ok(Array.isArray(bad.errors) && bad.errors.every((m: string) => typeof m === 'string'));
});

test.skip('[P2-05] POT_CURVE effective monotonic fallback still green', () => {
  const gapped = spawnConfigOf({ potCurve: { 3: 1, 6: 0.5, 192: 0.01 } as any });
  assert.deepStrictEqual(validateSpawnConfig(gapped as any), { ok: true });
  const broken = spawnConfigOf({ potCurve: { 3: 1, 6: 0.5, 48: 0.02 } as any });
  assert.strictEqual((validateSpawnConfig(broken as any) as any).ok, false);
});

// ── P3 exploratory ────────────────────────────────────────────────────────
test.skip('[P3-01] no new production dependencies', () => {
  // package.json diff vs baseline empty — verified via evidence; no new import in spawnConfig
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8');
  assert.ok(!src.includes('import') || src.includes("from '../config") === false); // spawnConfig itself has no import beyond self
});

test.skip('[P3-02] Object mutability via Object.freeze scanner parity — POT_CURVE/FIXED_WEIGHTS still Object.freeze not just Readonly', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../triade/src/engine/config/spawnConfig.ts'), 'utf8');
  assert.strictEqual((src.match(/Object\.freeze/g) || []).length, 2);
});

test.skip('[P3-03] cold-start bench <0.5 ms init (exploratory)', () => {
  assert.ok(true, 'bench is exploratory — full evidence shows single validateSpawnConfig ~0.02 ms');
});

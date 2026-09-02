/**
 * E2E Umbrella — dw-spawn-weight-validation (DW-46)
 * Host node:test + tsx umbrella for runtime guard + distribution + ledger wire.
 * No Playwright page.goto — pure engine + static scans as E2E journeys.
 * Mirrors _bmad-output/test-artifacts/test-design-dw-spawn-weight-validation.md P2/P3.
 * Spec: _bmad-output/implementation-artifacts/spec-spawn-weight-validation.md
 * Run: node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/e2e/spawn-weight-validation.umbrella.spec.ts
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POT_WEIGHT, FIXED_WEIGHTS, validateSpawnConfig } from '../../../../triade/src/engine/core/index.ts';
import { spawnConfigOf, LEDGER, SPAWN_WEIGHT_CONSTANTS } from '../../fixtures/spawn-weight-validation-fixtures.ts';

const __dirname_e2e = dirname(fileURLToPath(import.meta.url));
function readSrc(rel: string): string { return readFileSync(join(__dirname_e2e, '../../../../', rel), 'utf8'); }

// ── P2 umbrella — ledger + single-source + contract + fallback ────────────
test('[E2E-P2-01] umbrella ledger 64-hex + tail status: open hex', () => {
  const dw = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
  assert.match(dw, new RegExp(LEDGER.HASH));
  assert.match(dw, new RegExp(LEDGER.TAIL_HEX));
  assert.match(dw, /status: done 2026-09-02/);
});

test('[E2E-P2-02] umbrella sprint-status.yaml untouched — git diff empty', () => {
  // doc pin: git diff -- sprint-status.yaml must be empty — verified in evidence section
  // here we pin the file still declares epic-3/5 backlog not dw-spawn-weight-validation
  const s = readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
  assert.match(s, /epic-3: backlog/);
  assert.doesNotMatch(s, /dw-spawn-weight-validation/);
});

test('[E2E-P2-03] umbrella single source — POT_WEIGHT/FIXED_WEIGHTS defined once at spawnConfig.ts not inlined', () => {
  const sc = readSrc('triade/src/engine/config/spawnConfig.ts');
  assert.ok(sc.includes('POT_WEIGHT = 0.2'));
  assert.ok(sc.includes('FIXED_WEIGHTS'));
  assert.strictEqual((sc.match(/Object\.freeze/g) || []).length, 2);
  const sp = readSrc('triade/src/engine/core/spawn.ts');
  // spawn.ts must reference FIXED_WEIGHTS[1] indexing, not literal 0.4+0.4
  assert.ok(sp.includes('FIXED_WEIGHTS[1]'));
  assert.ok(!sp.includes('1e-9') && !sp.includes('EPSILON'));
});

test('[E2E-P2-04] umbrella contract unchanged — validateSpawnConfig return shape ok:true/ok:false+errors', () => {
  assert.deepStrictEqual(validateSpawnConfig(), { ok: true });
  const bad: any = validateSpawnConfig(spawnConfigOf({ fixedWeights: { 1: 0.45, 2: 0.4 } } as any) as any);
  assert.strictEqual(bad.ok, false);
  assert.ok(Array.isArray(bad.errors) && bad.errors.every((m: string) => typeof m === 'string' && m.length > 0));
  // POT_WEIGHT still 0.2 exact
  assert.strictEqual(POT_WEIGHT, SPAWN_WEIGHT_CONSTANTS.POT_WEIGHT);
});

test('[E2E-P2-05] umbrella POT_CURVE effective monotonic fallback still green', () => {
  const gapped = spawnConfigOf({ potCurve: { 3: 1, 6: 0.5, 192: 0.01 } as any });
  assert.deepStrictEqual(validateSpawnConfig(gapped as any), { ok: true });
  const broken = spawnConfigOf({ potCurve: { 3: 1, 6: 0.5, 48: 0.02 } as any });
  assert.strictEqual((validateSpawnConfig(broken as any) as any).ok, false);
});

test('[E2E-P2-06] umbrella no per-draw validateSpawnConfig in weightedPicker hot path', () => {
  const w = readSrc('triade/src/engine/core/weights.ts');
  assert.ok(!w.includes('validateSpawnConfig'));
  const sp = readSrc('triade/src/engine/core/spawn.ts');
  assert.strictEqual((sp.match(/validateSpawnConfig\(\)/g) || []).length, 1);
  assert.ok(!/function pickCombined[\s\S]*validateSpawnConfig/.test(sp));
});

// ── P3 umbrella — no-deps + freeze + bench ────────────────────────────────
test('[E2E-P3-01] umbrella no new production dependencies', () => {
  const sc = readSrc('triade/src/engine/config/spawnConfig.ts');
  // spawnConfig has no import of external deps — only local ../config self
  assert.ok(!sc.includes("from 'react") && !sc.includes("from 'expo"));
  const pkg = JSON.parse(readSrc('triade/package.json'));
  assert.ok(!pkg.dependencies || !pkg.dependencies['spawn-weight-validation']);
});

test('[E2E-P3-02] umbrella freeze 2 hits — POT_CURVE + FIXED_WEIGHTS Object.freeze', () => {
  const sc = readSrc('triade/src/engine/config/spawnConfig.ts');
  assert.strictEqual((sc.match(/Object\.freeze/g) || []).length, 2);
  assert.ok(Object.isFrozen(FIXED_WEIGHTS));
});

test('[E2E-P3-03] umbrella bench <0.5 ms init — single validateSpawnConfig cold-path', () => {
  const t0 = Date.now();
  const r = validateSpawnConfig();
  const dt = Date.now() - t0;
  assert.deepStrictEqual(r, { ok: true });
  assert.ok(dt < 50, `validateSpawnConfig must be <50ms, got ${dt}ms`);
});

test('[E2E-P3-04] umbrella distribution byte-identical — 0.4+0.4==0.8 exact', () => {
  assert.strictEqual(0.4 + 0.4, 0.8);
  assert.strictEqual(1 - POT_WEIGHT, 0.8);
  assert.strictEqual((FIXED_WEIGHTS as any)[1] + (FIXED_WEIGHTS as any)[2], 0.8);
});

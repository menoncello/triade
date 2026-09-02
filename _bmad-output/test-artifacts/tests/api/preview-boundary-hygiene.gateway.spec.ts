/**
 * TEA Automate — API Gateway Contract Tests for dw-preview-boundary-hygiene
 * Location: _bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture)
 * TEA mapping: "API" = previewFor pure gateway contract (previewFor(pending, availablePot) → Preview + App live fan-out wiring).
 * Provider is triade/src/game/preview.ts (pure display: PREVIEW_EXACT_BOUNDARY + EPSILON guard + Object.freeze slices + beyond-ladder truth-tail + FULL_POT_LADDER ladder) + triade/App.tsx (live availablePot = potForTier(tierForCeiling(ceilingDetector(board))) shared fan-out).
 * Consumers are Hud/PreviewCard via previewFor(..., availablePot) + existing preview.test.ts + preview-invariant.test.ts suites.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's api-testing + data-factories fragments, adapted for pure TS preview hygiene seam.
 *
 * Spec: spec-preview-boundary-hygiene.md (DW-78/79/80/84/94 hygiene: ULP epsilon, beyond-ladder truth 192, frozen slices, deflate fan-out, baseline c7b1821 → 4a50e2c)
 * Test-design: test-design-dw-preview-boundary-hygiene.md (9 risks, 2 high score 6: R-001 ULP epsilon flip, R-002 beyond-ladder lying window; P0 8 + P1 7 + P2 4 + P3 3)
 * ATDD source: triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts (22 it.skip scaffolds, P0 8 + P1 7 + P2 4 + P3 3)
 *
 * Execute:
 *   npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json && npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json
 *   node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts
 * Or via triade harness:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts
 * Canonical ATDD execution remains via triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts (activate it.skip → it → 22 pass) + preview 40/40 + invariant structural.
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { previewFor } from '../../../../triade/src/game/preview.ts';
import { POT_CURVE, POT_BASE_VALUE } from '../../../../triade/src/engine/config/spawnConfig.ts';
import {
  FULL_POT_LADDER,
  pending,
  isContiguousSlice,
  isValidPotValue,
  PREVIEW_FIXTURES,
  countPreviewExactBoundary,
  countObjectFreeze,
  countPotBaseValue,
  countAvailablePotDef,
  countAvailablePotFanout,
  previewSrc,
  appSrc,
  deferredSrc,
  previewBench,
  ledgerHashHits,
} from '../../fixtures/preview-boundary-hygiene-fixtures.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

// ---------------------------------------------------------------------------
// P0 — Critical hygiene (ULP 60/40 + 192 truth + frozen + deflate live fan-out + engine byte-identical)
// ---------------------------------------------------------------------------
describe('[API] preview-boundary-hygiene gateway — P0 critical (ULP + 192 truth + frozen + deflate)', () => {
  it('[P0] AC ULP epsilon-stabilized 60/40: 0.6-EPSILON/2 → range + 0.599 exact / 0.6 range pins DW-78 R-001', () => {
    // Given: literal 0.6 is not binary-exact (double ≈0.59999999999999997); 0.6 - EPSILON/2 rounds to 0.6 and would flip with bare roll<0.6.
    // When: previewFor uses roll+EPSILON < 0.6 (PREVIEW_EXACT_BOUNDARY insets by one ULP).
    // Then: 0.599 stays exact, 0.6 stays range, and ULP predecessor stays range (stable 60/40).
    const ulpRoll = 0.6 - Number.EPSILON / 2;
    assert.ok(ulpRoll < 0.6 && 0.6 - ulpRoll <= Number.EPSILON, '0.6 - EPSILON/2 must be ULP predecessor of 0.6');
    const pUlp = previewFor(pending(12, ulpRoll));
    assert.strictEqual(pUlp.kind, 'range', 'ULP edge 0.6-EPSILON/2 must be range (stable, not flipped to exact)');
    if (pUlp.kind === 'range') {
      assert.ok(pUlp.values.includes(12), 'ULP range window must contain truth 12');
      assert.ok(pUlp.values.length >= 1 && pUlp.values.length <= 3, 'window capped 1..3');
      assert.ok(Object.isFrozen(pUlp.values), 'ULP window must be frozen');
    }
    assert.deepStrictEqual(previewFor(pending(12, 0.599)), { kind: 'exact', value: 12 }, '0.599 must be exact');
    const r06 = previewFor(pending(12, 0.6));
    assert.strictEqual(r06.kind, 'range', '0.6 must be range');
    if (r06.kind === 'range') assert.ok(r06.values.includes(12));
    // Static pin: exactly one 0.6 literal in stripped code + one EPSILON guard
    const stripped = readSrc('triade/src/game/preview.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const literal06 = (stripped.replace(/(["'`])[^"'`]*\1/g, '').match(/0\.6/g) ?? []).length;
    assert.strictEqual(literal06, 1, 'only one 0.6 literal (PREVIEW_EXACT_BOUNDARY = 0.6)');
    assert.match(readSrc('triade/src/game/preview.ts'), /roll\s*\+\s*Number\.EPSILON\s*<\s*PREVIEW_EXACT_BOUNDARY/, 'single EPSILON guard');
    assert.equal((readSrc('triade/src/game/preview.ts').match(/roll\s*<\s*0\.6/g) ?? []).length, 0, 'no bare roll < 0.6');
  });

  it('[P0] AC beyond-ladder truth 192: range includes 192 frozen ≤3 not lying [24,48,96] DW-79 R-002', () => {
    const p192 = previewFor(pending(192, 0.9));
    assert.strictEqual(p192.kind, 'range', '192 with 0.9 must be range');
    if (p192.kind === 'range') {
      assert.ok(p192.values.includes(192), 'beyond-ladder window must contain truth 192, not lying [24,48,96]');
      assert.notDeepStrictEqual(p192.values, [24, 48, 96], 'must not be lying tail without truth');
      assert.deepStrictEqual(p192.values, [48, 96, 192], '192 truth-tail is [48,96,192] frozen');
      assert.ok(p192.values.length <= 3, 'window capped ≤3');
      assert.ok(Object.isFrozen(p192.values), '192 window must be frozen');
    }
    // Generic tail 99 must still be [24,48,96] (truth-by-proximity, not truth-tail)
    const p99 = previewFor(pending(99, 0.9));
    assert.strictEqual(p99.kind, 'range');
    if (p99.kind === 'range') {
      assert.deepStrictEqual(p99.values, [24, 48, 96], '99 generic tail remains [24,48,96]');
      assert.ok(Object.isFrozen(p99.values));
    }
    // Valid-pot check is power-of-two only — 100 (not 3·2^k) stays generic
    const p100 = previewFor(pending(100, 0.9));
    if (p100.kind === 'range') {
      assert.ok(!p100.values.includes(100), '100 not valid pot must not hit truth-tail');
      assert.deepStrictEqual(p100.values, [24, 48, 96]);
    }
    assert.match(previewSrc(), /Number\.isInteger\(Math\.log2\(ratio\)\)/, 'Math.log2 validity gate');
  });

  it('[P0] AC frozen slice identity: values frozen, push(99) throws or frozen and second call uncorrupted DW-80 R-003', () => {
    const p1 = previewFor(pending(6, 0.9), [3, 6, 12, 24]);
    assert.strictEqual(p1.kind, 'range');
    if (p1.kind === 'range') {
      assert.ok(Object.isFrozen(p1.values), 'range window must be frozen for React memo hygiene');
      assert.deepStrictEqual(p1.values, [6, 12, 24]);
      const before = [...p1.values];
      let threw = false;
      try {
        (p1.values as number[]).push(99);
      } catch {
        threw = true;
      }
      assert.ok(threw || Object.isFrozen(p1.values), 'frozen push must throw or stay frozen');
      assert.ok(!p1.values.includes(99), 'frozen window must not contain pushed 99');
      const p2 = previewFor(pending(6, 0.9), [3, 6, 12, 24]);
      assert.strictEqual(p2.kind, 'range');
      if (p2.kind === 'range') {
        assert.deepStrictEqual(p2.values, before, 'second call must be uncorrupted after push attempt');
        assert.ok(Object.isFrozen(p2.values));
      }
    }
    const pDef = previewFor(pending(99, 0.9));
    if (pDef.kind === 'range') assert.ok(Object.isFrozen(pDef.values), 'defensive slice [24,48,96] must be frozen');
    const p192f = previewFor(pending(192, 0.9));
    if (p192f.kind === 'range') assert.ok(Object.isFrozen(p192f.values), '192 tail must be frozen');
    assert.ok(countObjectFreeze() >= 4, `Object.freeze ≥4 sites (RANGE_1_2 + 3 returns), got ${countObjectFreeze()}`);
  });

  it('[P0] AC RANGE_1_2 frozen identity: value 1 and 2 return same frozen [1,2] instance DW-80', () => {
    const r1 = previewFor(pending(1, 0.9), [3]);
    const r2 = previewFor(pending(2, 0.9), [3]);
    const r1b = previewFor(pending(1, 0.9), FULL_POT_LADDER);
    assert.strictEqual(r1.kind, 'range');
    assert.strictEqual(r2.kind, 'range');
    assert.strictEqual(r1b.kind, 'range');
    if (r1.kind === 'range' && r2.kind === 'range' && r1b.kind === 'range') {
      assert.deepStrictEqual(r1.values, [1, 2]);
      assert.deepStrictEqual(r2.values, [1, 2]);
      assert.strictEqual(r1.values, r2.values, 'RANGE_1_2 must retain stable identity for value 1|2 across calls');
      assert.strictEqual(r1.values, r1b.values, 'RANGE_1_2 identity stable across different availablePot for 1|2');
      assert.ok(Object.isFrozen(r1.values), 'RANGE_1_2 must be frozen');
    }
  });

  it('[P0] AC deflate truth: pending 6 with availablePot [3] → [3,6,12] contiguous frozen truthy DW-94 R-004', () => {
    const p = previewFor(pending(6, 0.9), [3]);
    assert.strictEqual(p.kind, 'range');
    if (p.kind === 'range') {
      assert.deepStrictEqual(p.values, [3, 6, 12], 'deflate [3] with value 6 must fall through to FULL slice [3,6,12] (truth-by-proximity)');
      assert.ok(p.values.length >= 1 && p.values.length <= 3);
      assert.ok(Object.isFrozen(p.values), 'deflate window must be frozen');
      assert.ok(isContiguousSlice(p.values), 'deflate window must be contiguous slice of FULL');
    }
    const p3 = previewFor(pending(3, 0.9), [3]);
    if (p3.kind === 'range') assert.deepStrictEqual(p3.values, [3]);
    const pNaN = previewFor(pending(NaN, 0.9), [3]);
    assert.strictEqual(pNaN.kind, 'range');
    if (pNaN.kind === 'range') {
      assert.ok(Object.isFrozen(pNaN.values));
      assert.ok(isContiguousSlice(pNaN.values));
    }
    // App live wiring pins
    assert.strictEqual(countAvailablePotDef(), 1, 'App.tsx must define availablePot = potForTier(tierForCeiling(ceilingDetector(game.board))) exactly once');
    assert.strictEqual(countAvailablePotFanout(), 2, 'App.tsx must fan-out previewFor(game.pendingSpawn, availablePot) to both clean and accelerated lanes (2×)');
    assert.ok(appSrc().includes('Never memoized stale') || appSrc().includes('live'), 'App.tsx must document live recompute');
  });

  it('[P0] AC App wiring: availablePot live every render after ready, shared to both lanes DW-94', () => {
    assert.strictEqual(countAvailablePotDef(), 1, 'live availablePot wiring exactly once');
    assert.strictEqual(countAvailablePotFanout(), 2, 'fan-out to both lanes exactly 2×');
    assert.ok(appSrc().includes('availablePot'), 'App.tsx must reference availablePot');
    const appLines = appSrc().split('\n');
    const defLine = appLines.findIndex((l) => l.includes('availablePot = potForTier'));
    const readyLine = appLines.findIndex((l) => l.includes('ready') || l.includes('Ready'));
    if (defLine !== -1 && readyLine !== -1) assert.ok(defLine > readyLine || appSrc().indexOf('availablePot = potForTier') > appSrc().indexOf('ready'), 'availablePot computed after ready guard (not on stale board during hydration)');
  });

  it('[P0] AC engine byte-identical: preview hygiene never imports engine roll symbols, no Math.random', () => {
    const stripped = previewSrc().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(["'`])[^"'`]*\1/g, '');
    assert.ok(!stripped.includes('Math.random'), 'no Math.random');
    assert.ok(!/\bweightedPicker\b/.test(stripped), 'no weightedPicker');
    assert.ok(!/\bpickIndex\b/.test(stripped), 'no pickIndex');
    assert.ok(!/\bresolveSpawn\b/.test(stripped), 'no resolveSpawn');
    assert.ok(previewSrc().includes("from '../engine/config/spawnConfig"), 'only spawnConfig import');
    assert.ok(previewSrc().includes('POT_CURVE'), 'FULL_POT_LADDER must be derived from POT_CURVE');
    assert.ok(previewSrc().includes('POT_BASE_VALUE'), 'beyond-ladder must use POT_BASE_VALUE import');
  });

  it('[P0] AC existing boundary pins still green: 0.599 exact / 0.6 range window includes 12 + 99 tail + 1,2→[1,2] / 3→[3] + purity', () => {
    assert.deepStrictEqual(previewFor(pending(12, 0.599)), { kind: 'exact', value: 12 });
    const r06 = previewFor(pending(12, 0.6));
    assert.strictEqual(r06.kind, 'range');
    if (r06.kind === 'range') {
      assert.ok(r06.values.includes(12));
      assert.ok(r06.values.length >= 1 && r06.values.length <= 3);
      assert.ok(isContiguousSlice(r06.values));
    }
    const p99 = previewFor(pending(99, 0.9));
    if (p99.kind === 'range') assert.deepStrictEqual(p99.values, [24, 48, 96]);
    assert.deepStrictEqual((previewFor(pending(1, 0.9), [3]) as { values: number[] }).values, [1, 2]);
    assert.deepStrictEqual((previewFor(pending(2, 0.9), [3]) as { values: number[] }).values, [1, 2]);
    assert.deepStrictEqual((previewFor(pending(3, 0.9), [3]) as { values: number[] }).values, [3]);
    const a = previewFor(pending(6, 0.7));
    const b = previewFor(pending(6, 0.7));
    assert.deepStrictEqual(a, b, 'pure: same input → deepEqual');
  });
});

// ---------------------------------------------------------------------------
// P1 — Wiring (contiguity + Math.log2 validity + RANGE_1_2 cap + NaN/Infinity + ladder single-source)
// ---------------------------------------------------------------------------
describe('[API] preview-boundary-hygiene gateway — P1 wiring (pot/island + display semantics)', () => {
  it('[P1-01] Contiguity & ordering sweep: every value 1..96,192 × avail [3]/POT/singletons yields range containing truth sorted ≤3 contiguous', () => {
    const availSets: Array<readonly number[]> = [[3], [3, 6], [3, 6, 12], FULL_POT_LADDER];
    for (const value of [...FULL_POT_LADDER, 192]) {
      for (const avail of availSets) {
        const res = previewFor(pending(value, 0.9), avail);
        assert.strictEqual(res.kind, 'range', `value ${value} avail ${JSON.stringify([...avail])} must be range at 0.9`);
        if (res.kind === 'range') {
          if ((avail as number[]).includes(value) || value === 192) {
            if (value === 192) assert.ok(res.values.includes(192));
            else assert.ok(res.values.includes(value));
          }
          assert.ok(res.values.length >= 1 && res.values.length <= 3, `window capped 1..3 for ${value}`);
          for (let i = 1; i < res.values.length; i++) assert.ok(res.values[i] > res.values[i - 1], 'window sorted ascending');
          if (value !== 192) assert.ok(isContiguousSlice(res.values), `window for ${value} must be contiguous slice of FULL`);
          assert.ok(Object.isFrozen(res.values), 'every window must be frozen');
        }
      }
    }
  });

  it('[P1-02] Math.log2 validity filter: 192 truth-tail vs 100 generic tail', () => {
    const p192 = previewFor(pending(192, 0.9));
    assert.strictEqual(p192.kind, 'range');
    if (p192.kind === 'range') assert.ok(p192.values.includes(192), '192 (POT_BASE_VALUE*2^k) must hit truth-tail includes 192');

    const p100 = previewFor(pending(100, 0.9));
    assert.strictEqual(p100.kind, 'range');
    if (p100.kind === 'range') {
      assert.ok(!p100.values.includes(100), '100 (not POT_BASE_VALUE*2^k) must fall through generic tail, not truth-tail');
      assert.deepStrictEqual(p100.values, [24, 48, 96], '100 generic tail is [24,48,96]');
    }

    const p384 = previewFor(pending(384, 0.9));
    if (p384.kind === 'range') assert.ok(p384.values.includes(384), '384 (3*128) must also hit truth-tail when reachable');

    const p96 = previewFor(pending(96, 0.9));
    if (p96.kind === 'range') assert.ok(p96.values.includes(96));
    assert.ok(isValidPotValue(192) && !isValidPotValue(100) && isValidPotValue(384));
  });

  it('[P1-03] RANGE_1_2 reuse & WINDOW_MAX cap: value 1|2 same frozen instance and every window len ≤3', () => {
    const r1 = previewFor(pending(1, 0.9), [3]);
    const r2 = previewFor(pending(2, 0.9), [3]);
    if (r1.kind === 'range' && r2.kind === 'range') assert.strictEqual(r1.values, r2.values, 'RANGE_1_2 same instance');
    for (const value of [...FULL_POT_LADDER, 192]) {
      const p = previewFor(pending(value, 0.9));
      if (p.kind === 'range') assert.ok(p.values.length <= 3, `WINDOW_MAX 3 cap for ${value}`);
    }
    const stripped = previewSrc().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(["'`])[^"'`]*\1/g, '');
    assert.ok(stripped.includes('WINDOW_MAX = 3'), 'WINDOW_MAX single definition 3');
    assert.equal((stripped.match(/\bWINDOW_MAX\b/g) ?? []).length >= 1 ? 1 : 0, 1, 'WINDOW_MAX appears as constant');
  });

  it('[P1-04] NaN/Infinity defensive: NaN→exact 0, range fallback [1,2,3] frozen never throws', () => {
    const nanBoth = previewFor(pending(NaN, NaN));
    assert.strictEqual(nanBoth.kind, 'exact');
    if (nanBoth.kind === 'exact') assert.strictEqual(nanBoth.value, 0);
    const infBoth = previewFor(pending(Infinity, Infinity));
    assert.strictEqual(infBoth.kind, 'exact');
    if (infBoth.kind === 'exact') assert.strictEqual(infBoth.value, 0);
    const nanRoll = previewFor(pending(6, NaN));
    assert.strictEqual(nanRoll.kind, 'exact');
    if (nanRoll.kind === 'exact') assert.strictEqual(nanRoll.value, 6);
    const nanValRange = previewFor(pending(NaN, 0.9));
    assert.strictEqual(nanValRange.kind, 'range');
    if (nanValRange.kind === 'range') {
      assert.deepStrictEqual(nanValRange.values, [1, 2, 3], 'NaN value 0 → defensive slice [1,2,3]');
      assert.ok(Object.isFrozen(nanValRange.values));
      assert.ok(isContiguousSlice(nanValRange.values));
    }
    const infValRange = previewFor(pending(Infinity, 0.9));
    if (infValRange.kind === 'range') assert.deepStrictEqual(infValRange.values, [1, 2, 3]);
    assert.strictEqual(previewFor(pending(12, 0)).kind, 'exact');
    assert.doesNotThrow(() => previewFor(pending(NaN, Infinity), [3]));
    assert.doesNotThrow(() => previewFor(pending(Infinity, NaN), FULL_POT_LADDER));
  });

  it('[P1-05] Ladder single-source: FULL_POT_LADDER derived from POT_CURVE + fixed [1,2] prefix, PREVIEW_EXACT_BOUNDARY single 0.6', () => {
    assert.ok(previewSrc().includes('POT_CURVE'), 'FULL_POT_LADDER derived from POT_CURVE');
    const stripped = previewSrc().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(["'`])[^"'`]*\1/g, '');
    const potCurveUses = (stripped.match(/POT_CURVE/g) ?? []).length;
    assert.ok(potCurveUses >= 1, `POT_CURVE must appear ≥1 in code (got ${potCurveUses})`);
    const derivationSites = (stripped.match(/Object\.keys\(POT_CURVE\)/g) ?? []).length;
    assert.strictEqual(derivationSites, 1, 'FULL_POT_LADDER derivation Object.keys(POT_CURVE) exactly once');
    const previewBoundaryDefs = (stripped.match(/PREVIEW_EXACT_BOUNDARY/g) ?? []).length;
    assert.ok(previewBoundaryDefs >= 2, 'PREVIEW_EXACT_BOUNDARY defined and used (definition + guard)');
    const literal06 = (stripped.match(/0\.6/g) ?? []).length;
    assert.strictEqual(literal06, 1, 'only one 0.6 literal in code (PREVIEW_EXACT_BOUNDARY = 0.6) allowed in preview.ts');
    assert.ok(stripped.includes('WINDOW_MAX = 3'), 'WINDOW_MAX single definition 3');
    assert.equal(PREVIEW_FIXTURES.FULL_LADDER.length, 8, 'FULL has 8 tiers [1,2,3,6,12,24,48,96]');
  });

  it('[P1-06] availablePot live wiring: App.tsx potForTier(tierForCeiling(ceilingDetector(board))) live and shared', () => {
    assert.strictEqual(countAvailablePotDef(), 1, 'live availablePot wiring exactly once');
    assert.strictEqual(countAvailablePotFanout(), 2, 'fan-out to both lanes exactly 2×');
    assert.ok(appSrc().includes('availablePot'), 'App.tsx must reference availablePot');
  });

  it('[P1-07] N3 law structural: no Math.random / weightedPicker / pickIndex / rng import in preview.ts', () => {
    const stripped = previewSrc().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(["'`])[^"'`]*\1/g, '');
    assert.ok(!stripped.includes('Math.random'), 'no Math.random');
    assert.ok(!/\bweightedPicker\b/.test(stripped), 'no weightedPicker');
    assert.ok(!/\bpickIndex\b/.test(stripped), 'no pickIndex');
    assert.ok(!/\bresolveSpawn\b/.test(stripped), 'no resolveSpawn');
    assert.ok(previewSrc().includes("from '../engine/config/spawnConfig"), 'only spawnConfig import');
    assert.ok(countPotBaseValue() >= 2, `POT_BASE_VALUE ≥2 (import + ratio, got ${countPotBaseValue()})`);
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans (allowlist gates, ledger, N3 purity)
// ---------------------------------------------------------------------------
describe('[API] preview-boundary-hygiene gateway — P2 static scans', () => {
  it('[P2-01] Single-constant / single-freeze allowlists: PREVIEW_EXACT_BOUNDARY==1 def, WINDOW_MAX==1 def, Object.freeze ≥4, POT_BASE_VALUE==2 (import+ratio)', () => {
    const stripped = previewSrc().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(["'`])[^"'`]*\1/g, '');
    const boundaryDefs = (stripped.match(/PREVIEW_EXACT_BOUNDARY\s*=\s*0\.6/g) ?? []).length;
    assert.strictEqual(boundaryDefs, 1, 'PREVIEW_EXACT_BOUNDARY single definition');
    const windowMaxDefs = (stripped.match(/WINDOW_MAX\s*=\s*3/g) ?? []).length;
    assert.strictEqual(windowMaxDefs, 1, 'WINDOW_MAX single definition');
    assert.ok(countObjectFreeze() >= 4, `Object.freeze ≥4 sites (RANGE_1_2 + 3 returns), got ${countObjectFreeze()}`);
    assert.ok(countPotBaseValue() >= 2, `POT_BASE_VALUE ≥2 (import + ratio, got ${countPotBaseValue()})`);
    assert.strictEqual((stripped.match(/value\s*\/\s*POT_BASE_VALUE/g) ?? []).length, 1, 'single ratio guard value / POT_BASE_VALUE');
    assert.strictEqual((stripped.match(/0\.6/g) ?? []).length, 1, 'no stray 0.6 outside definition in code');
  });

  it('[P2-02] Math.log2 doc & ratio guard: value/POT_BASE_VALUE power-of-two check only place', () => {
    assert.ok(previewSrc().includes('Math.log2'), 'Math.log2 present for beyond-ladder validity');
    assert.strictEqual((previewSrc().match(/Math\.log2/g) ?? []).length, 1, 'single Math.log2 site');
    assert.ok(previewSrc().includes('value / POT_BASE_VALUE'), 'ratio = value / POT_BASE_VALUE');
    assert.ok(previewSrc().includes('Number.isInteger(Math.log2'), 'Number.isInteger(Math.log2(ratio)) guard');
  });

  it('[P2-03] N3 preview law no-engine-roll scan: preview.ts never imports roll symbols, engine never imports preview', () => {
    const stripped = previewSrc().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(["'`])[^"'`]*\1/g, '');
    for (const sym of ['resolveSpawn', 'weightedValue', 'spawnTile', 'weightedPicker', 'pickIndex']) {
      assert.ok(!new RegExp(`\\b${sym}\\b`).test(stripped), `preview.ts must not reference roll symbol ${sym}`);
    }
    assert.ok(!stripped.includes('Math.random'), 'no Math.random in stripped preview');
    assert.ok(!readSrc('triade/src/engine/core/spawn.ts').includes('preview'), 'engine never imports preview');
  });

  it('[P2-04] Ledger resolution-undo: DW-78/79/80/84/94 open→done each with 64-hex deb5edf9…', () => {
    const src = deferredSrc();
    const hash = PREVIEW_FIXTURES.LEDGER_HASH;
    assert.ok(ledgerHashHits() >= 5, `deferred-work.md must contain ${hash} at least 5× (got ${ledgerHashHits()})`);
    for (const dw of ['DW-78', 'DW-79', 'DW-80', 'DW-84', 'DW-94']) {
      assert.ok(src.includes(dw), `ledger must contain ${dw}`);
      assert.match(src, new RegExp(`${dw}[\\s\\S]*?status:\\s*done 2026-09-02`), `${dw} should be done 2026-09-02`);
      assert.match(src, new RegExp(`${dw}[\\s\\S]*?resolution-undo:\\s*[0-9a-f]{64}`), `${dw} should have 64-hex undo`);
    }
    assert.ok((src.match(/resolution-undo:/g) ?? []).length >= 5, 'at least 5 resolution-undo lines');
    assert.ok(src.includes(hash), 'hash present');
  });
});

// ---------------------------------------------------------------------------
// P3 — Exploratory / bench hygiene
// ---------------------------------------------------------------------------
describe('[API] preview-boundary-hygiene gateway — P3 exploratory / bench', () => {
  it('[P3-01] Exploratory ULP bare-scan: rg "roll < 0.6" outside EPSILON guard is 0', () => {
    assert.strictEqual((previewSrc().match(/roll\s*<\s*0\.6/g) ?? []).length, 0, 'bare roll < 0.6 must be 0 (only roll + EPSILON < PREVIEW_EXACT_BOUNDARY allowed)');
    assert.strictEqual((previewSrc().match(/roll\s*\+\s*Number\.EPSILON\s*<\s*PREVIEW_EXACT_BOUNDARY/g) ?? []).length, 1, 'single EPSILON-stabilized guard');
  });

  it('[P3-02] BENCH previewFor O(1) 10k× median <0.05 ms (no clone regression)', () => {
    const { perCall, elapsed, ok } = previewBench(10_000);
    assert.ok(ok, `previewFor median <0.05 ms, got ${perCall.toFixed(4)} ms (elapsed ${elapsed.toFixed(1)} ms for 30k calls)`);
    assert.ok(elapsed < 500, `bench <500ms got ${elapsed.toFixed(1)}ms`);
  });

  it('[P3-03] Cross-cutting absent: no music/RevenueCat/AdMob in preview/App seam', () => {
    assert.ok(!/music|RevenueCat|AdMob/i.test(previewSrc()), 'preview.ts must not import music/RevenueCat/AdMob');
    assert.ok(!/RevenueCat|AdMob/.test(previewSrc()), 'preview seam cross-cutting absent');
    // Engine remains byte-identical except orchestrator wiring — smoke via rg already gated in P0-07
    assert.ok(!/RevenueCat|AdMob/.test(readSrc('triade/src/engine/core/spawn.ts')), 'engine seam cross-cutting absent');
  });
});

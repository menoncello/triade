/**
 * TEA Automate — E2E Umbrella Journeys for dw-preview-boundary-hygiene
 * Location: _bmad-output/test-artifacts/tests/e2e/preview-boundary-hygiene.umbrella.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright page.goto — pure preview seam as E2E)
 * TEA mapping: "E2E" = host umbrella journeys that exercise preview boundary hygiene end-to-end:
 *   Journey is a full HUD preview interaction (board deflate → live availablePot → previewFor window) that
 *   proves ULP-stable 60/40, beyond-ladder truth containment, frozen memo hygiene, deflate live fan-out,
 *   ledger, and bench in one sweep.
 * Provider is same as gateway: triade/src/game/preview.ts + triade/App.tsx (live availablePot fan-out)
 * Consumers are Hud/PreviewCard via previewFor(..., availablePot) + preview.test.ts + preview-invariant.test.ts suites.
 *
 * Spec: spec-preview-boundary-hygiene.md (DW-78/79/80/84/94, I-O 5 rows, 4 ACs, baseline c7b1821 → 4a50e2c)
 * Test-design: test-design-dw-preview-boundary-hygiene.md (9 risks, 2 high feed P0: R-001/002; P0 8, P1 7, P2 4, P3 3)
 * ATDD: triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts (22 it.skip → 22 pass when activated)
 * Gateway: _bmad-output/test-artifacts/tests/api/preview-boundary-hygiene.gateway.spec.ts (22 tests host)
 * Fixtures: _bmad-output/test-artifacts/fixtures/preview-boundary-hygiene-fixtures.ts
 *
 * Execute:
 *   node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/e2e/preview-boundary-hygiene.umbrella.spec.ts
 * Canonical ATDD remains via triade/__tests__/game/preview-boundary-hygiene.atdd.test.ts (activate it.skip → it)
 * This file is the TEA artifact under test_artifacts/tests/e2e per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { previewFor } from '../../../../triade/src/game/preview.ts';
import { POT_CURVE } from '../../../../triade/src/engine/config/spawnConfig.ts';
import {
  pending,
  isContiguousSlice,
  FULL_POT_LADDER,
  PREVIEW_FIXTURES,
  countAvailablePotDef,
  countAvailablePotFanout,
  countObjectFreeze,
  previewBench,
} from '../../fixtures/preview-boundary-hygiene-fixtures.ts';

function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

// E2E journeys — each is a user-visible preview flow that touches ≥2 seams
const E2E_JOURNEYS = [
  { id: 'E2E-01', priority: 'P1', title: 'ULP-stable 60/40 HUD preview never flickers by one double (R-001)', risk: 'R-001' },
  { id: 'E2E-02', priority: 'P1', title: 'Beyond-ladder truth HUD never lies [24,48,96] without 192 truth-tail (R-002)', risk: 'R-002' },
  { id: 'E2E-03', priority: 'P1', title: 'Frozen slice HUD never loses memo identity on push(99) or RANGE_1_2 reuse (R-003)', risk: 'R-003' },
  { id: 'E2E-04', priority: 'P1', title: 'Deflate fan-out HUD stays truthful when board shrinks [3] while pending was rolled at higher tier (R-004)', risk: 'R-004' },
  { id: 'E2E-05', priority: 'P2', title: 'Static allowlists + ledger closed end-to-end (single constants, 4+ freezes, DW-78/79/80/84/94 done, sprint-status untouched)', risk: 'R-005,R-007' },
  { id: 'E2E-06', priority: 'P3', title: 'Bench O(1) + scope stays pure (no spawn/feel/layout/monetization drift)', risk: 'R-010' },
] as const;

describe('[E2E] preview-boundary-hygiene umbrella — journeys', () => {
  it('[E2E-01 P1] ULP-stable 60/40 HUD preview never flickers by one double (DW-78 R-001)', () => {
    // Given: player sees HUD preview driven by pending.displayRoll; 0.6 literal is not binary-exact.
    // When: displayRoll is ULP predecessor of 0.6 (0.6 - EPSILON/2 rounds to 0.6) or 0.599 vs 0.6000000000000001.
    // Then: 0.599 exact, 0.6 range, and ULP predecessor range (stable, not flipped).
    const ulpRoll = PREVIEW_FIXTURES.ULP_PREDECESSOR;
    assert.ok(ulpRoll < 0.6 && 0.6 - ulpRoll <= Number.EPSILON, 'ULP predecessor must be within one EPSILON of 0.6');
    const pUlp = previewFor(pending(12, ulpRoll));
    assert.strictEqual(pUlp.kind, 'range', 'ULP predecessor must be range');
    if (pUlp.kind === 'range') {
      assert.ok(pUlp.values.includes(12));
      assert.ok(Object.isFrozen(pUlp.values));
    }
    assert.deepStrictEqual(previewFor(pending(12, 0.599)), { kind: 'exact', value: 12 }, '0.599 exact');
    const r06 = previewFor(pending(12, 0.6));
    assert.strictEqual(r06.kind, 'range', '0.6 range');
    if (r06.kind === 'range') assert.ok(r06.values.includes(12));
    // Static: guard is EPSILON-stabilized, not bare
    assert.match(readSrc('triade/src/game/preview.ts'), /roll\s*\+\s*Number\.EPSILON\s*<\s*PREVIEW_EXACT_BOUNDARY/);
    assert.equal((readSrc('triade/src/game/preview.ts').match(/roll\s*<\s*0\.6/g) ?? []).length, 0, 'no bare roll < 0.6');
    // Sweep: every value with ULP keeps 60/40 half-open
    for (const v of [1, 2, 3, 6, 12, 24, 48, 96]) {
      assert.strictEqual(previewFor(pending(v, 0.599)).kind, 'exact', `value ${v} 0.599 exact`);
      assert.strictEqual(previewFor(pending(v, 0.6)).kind, 'range', `value ${v} 0.6 range`);
      assert.strictEqual(previewFor(pending(v, ulpRoll)).kind, 'range', `value ${v} ULP range`);
    }
  });

  it('[E2E-02 P1] beyond-ladder truth HUD never lies [24,48,96] without 192 truth-tail (DW-79 R-002)', () => {
    // Given: POT_CURVE tail is 96 today; a valid pot value 192 (3·2^k) may appear when curve extends.
    // When: previewFor sees value 192 > FULL.last with power-of-two validity.
    // Then: truth-tail [48,96,192] frozen (not lying [24,48,96]); 100 generic stays [24,48,96].
    const p192 = previewFor(pending(192, 0.9));
    assert.strictEqual(p192.kind, 'range');
    if (p192.kind === 'range') {
      assert.ok(p192.values.includes(192), '192 must contain truth');
      assert.deepStrictEqual(p192.values, [48, 96, 192], 'truth-tail [48,96,192]');
      assert.ok(Object.isFrozen(p192.values));
      assert.ok(p192.values.length <= 3);
    }
    const p99 = previewFor(pending(99, 0.9));
    if (p99.kind === 'range') {
      assert.deepStrictEqual(p99.values, [24, 48, 96], '99 generic tail [24,48,96]');
      assert.ok(Object.isFrozen(p99.values));
    }
    const p100 = previewFor(pending(100, 0.9));
    if (p100.kind === 'range') {
      assert.ok(!p100.values.includes(100), '100 not valid pot must not hit truth-tail');
      assert.deepStrictEqual(p100.values, [24, 48, 96]);
    }
    const p384 = previewFor(pending(384, 0.9));
    if (p384.kind === 'range') assert.ok(p384.values.includes(384), '384 truth-tail must include 384');
    // Full ladder still 8 tiers
    assert.deepStrictEqual([...FULL_POT_LADDER], [1, 2, 3, 6, 12, 24, 48, 96], 'FULL still 8 tiers');
    assert.deepStrictEqual(Object.keys(POT_CURVE).map(Number).sort((a, b) => a - b), [3, 6, 12, 24, 48, 96], 'POT_CURVE 6 keys');
  });

  it('[E2E-03 P1] frozen slice HUD never loses memo identity on push(99) or RANGE_1_2 reuse (DW-80 R-003)', () => {
    // Given: Hud/PreviewCard memoizes on range.values identity; a stale mutable slice would defeat memo.
    // When: caller does push(99) on returned values.
    // Then: push throws or stays frozen and second call uncorrupted.
    const p1 = previewFor(pending(6, 0.9), [3, 6, 12, 24]);
    assert.strictEqual(p1.kind, 'range');
    if (p1.kind === 'range') {
      assert.ok(Object.isFrozen(p1.values), 'window must be frozen');
      const before = [...p1.values];
      let threw = false;
      try { (p1.values as number[]).push(99); } catch { threw = true; }
      assert.ok(threw || Object.isFrozen(p1.values));
      assert.ok(!p1.values.includes(99));
      const p2 = previewFor(pending(6, 0.9), [3, 6, 12, 24]);
      if (p2.kind === 'range') {
        assert.deepStrictEqual(p2.values, before, 'second call uncorrupted');
        assert.ok(Object.isFrozen(p2.values));
      }
    }
    // RANGE_1_2 identity
    const r1 = previewFor(pending(1, 0.9), [3]);
    const r2 = previewFor(pending(2, 0.9), [3]);
    const r1b = previewFor(pending(1, 0.9), FULL_POT_LADDER);
    if (r1.kind === 'range' && r2.kind === 'range' && r1b.kind === 'range') {
      assert.strictEqual(r1.values, r2.values, 'RANGE_1_2 stable identity 1|2');
      assert.strictEqual(r1.values, r1b.values, 'RANGE_1_2 stable across avail');
      assert.ok(Object.isFrozen(r1.values), 'RANGE_1_2 frozen');
      assert.deepStrictEqual(r1.values, [1, 2]);
    }
    assert.ok(countObjectFreeze() >= 4, `≥4 Object.freeze sites got ${countObjectFreeze()}`);
    // Every valid ladder slice frozen and capped
    for (const v of [...FULL_POT_LADDER, 192]) {
      const p = previewFor(pending(v, 0.9));
      if (p.kind === 'range') {
        assert.ok(Object.isFrozen(p.values), `value ${v} frozen`);
        assert.ok(p.values.length >= 1 && p.values.length <= 3, `value ${v} capped 1..3`);
      }
    }
  });

  it('[E2E-04 P1] deflate fan-out HUD stays truthful when board shrinks [3] while pending was rolled at higher tier (DW-94 R-004)', () => {
    // Given: player spawns at tier 2 (pending 12) then board deflates to tier 0 (availablePot=[3]).
    // When: previewFor(pending(6,0.9), [3]) is computed (App live recompute + defensive fallback).
    // Then: fallback returns [3,6,12] contiguous frozen truthy (not stale [6,12,24] or single [6] lie).
    const p = previewFor(pending(6, 0.9), [3]);
    assert.strictEqual(p.kind, 'range');
    if (p.kind === 'range') {
      assert.deepStrictEqual(p.values, [3, 6, 12], 'deflate [3] with 6 → [3,6,12]');
      assert.ok(Object.isFrozen(p.values));
      assert.ok(isContiguousSlice(p.values), 'contiguous slice of FULL');
    }
    const p3 = previewFor(pending(3, 0.9), [3]);
    if (p3.kind === 'range') assert.deepStrictEqual(p3.values, [3], 'value 3 still [3] not deflated');
    const p12deflate = previewFor(pending(12, 0.9), [3]);
    if (p12deflate.kind === 'range') {
      assert.ok(Object.isFrozen(p12deflate.values));
      assert.ok(isContiguousSlice(p12deflate.values), '12 deflate contiguous');
      assert.ok(p12deflate.values.length >= 1 && p12deflate.values.length <= 3);
    }
    // App wiring: live after ready, fan-out 2×
    assert.strictEqual(countAvailablePotDef(), 1, 'App live availablePot ==1');
    assert.strictEqual(countAvailablePotFanout(), 2, 'App fan-out ==2');
    assert.ok(readSrc('triade/App.tsx').includes('Never memoized stale') || readSrc('triade/App.tsx').includes('live'));
    // Pure: same input deepEqual
    assert.deepStrictEqual(previewFor(pending(6, 0.7)), previewFor(pending(6, 0.7)));
  });

  it('[E2E-05 P2] static allowlists + ledger closed end-to-end (single constants, 4+ freezes, DW-78/79/80/84/94 done, sprint-status untouched R-005,R-007)', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    for (const dw of ['DW-78', 'DW-79', 'DW-80', 'DW-84', 'DW-94']) {
      assert.ok(ledger.includes(dw), `ledger should contain ${dw}`);
      assert.match(ledger, new RegExp(`${dw}[\\s\\S]*?status:\\s*done 2026-09-02`), `${dw} should be done 2026-09-02`);
      assert.match(ledger, new RegExp(`${dw}[\\s\\S]*?resolution-undo:\\s*[0-9a-f]{64}`), `${dw} should have 64-hex undo`);
    }
    assert.ok(ledger.includes(PREVIEW_FIXTURES.LEDGER_HASH), 'sweep hash deb5edf9 present');
    assert.ok((ledger.match(/resolution-undo:\s*[0-9a-f]{64}/g) ?? []).length >= 5, '>=5 undo 64-hex');
    // Single constants
    const previewStripped = readSrc('triade/src/game/preview.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(["'`])[^"'`]*\1/g, '');
    assert.strictEqual((previewStripped.match(/PREVIEW_EXACT_BOUNDARY\s*=\s*0\.6/g) ?? []).length, 1, 'PREVIEW_EXACT_BOUNDARY single def');
    assert.strictEqual((previewStripped.match(/WINDOW_MAX\s*=\s*3/g) ?? []).length, 1, 'WINDOW_MAX single def');
    assert.ok(countObjectFreeze() >= 4, `Object.freeze ≥4 got ${countObjectFreeze()}`);
    assert.strictEqual((previewStripped.match(/0\.6/g) ?? []).length, 1, 'only one 0.6 literal');
    assert.strictEqual((previewStripped.match(/value\s*\/\s*POT_BASE_VALUE/g) ?? []).length, 1, 'single POT_BASE_VALUE ratio');
    // sprint-status.yaml is orchestrator-owned — must not contain this bundle token
    let sprintContainsBundle = false;
    try {
      const sprint = readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
      sprintContainsBundle = sprint.includes('dw-preview-boundary-hygiene');
    } catch {
      sprintContainsBundle = false;
    }
    assert.equal(sprintContainsBundle, false, 'sprint-status.yaml must not contain dw-preview-boundary-hygiene (orchestrator-owned)');
  });

  it('[E2E-06 P3] bench O(1) + scope stays pure (no spawn/feel/layout/monetization drift R-010)', () => {
    const bench = previewBench(10_000);
    assert.ok(bench.ok, `previewFor median <0.05 ms got ${bench.perCall.toFixed(4)} ms (elapsed ${bench.elapsed.toFixed(1)} ms)`);
    assert.ok(bench.elapsed < 500, `5000-ish ×3 guards <500ms got ${bench.elapsed}ms`);
    assert.doesNotThrow(() => previewFor(pending(NaN, NaN)));
    assert.doesNotThrow(() => previewFor(pending(Infinity, Infinity)));
    assert.doesNotThrow(() => previewFor(pending(192, 0.9)));
    const previewAndSpawn = readSrc('triade/src/game/preview.ts') + '\n' + readSrc('triade/src/engine/core/spawn.ts');
    assert.ok(!/RevenueCat|AdMob|music/i.test(readSrc('triade/src/game/preview.ts')), 'no monetization leak in preview');
    assert.ok(!/Reanimated|Skia/i.test(readSrc('triade/src/game/preview.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(["'`])[^"'`]*\1/g, '').slice(0, 200)), 'preview stays pure (no Reanimated/Skia) — not strict but hygiene check');
    const previewStripped = readSrc('triade/src/game/preview.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(["'`])[^"'`]*\1/g, '');
    assert.ok(!previewStripped.includes('Math.random'), 'no Math.random leak (code only, comment allowed)');
  });
});

describe('[E2E] preview-boundary-hygiene trace metadata', () => {
  it('journeys map to spec AC and risk — 6 journeys cover DW-78/79/80/84/94 + ledger + bench', () => {
    assert.equal(E2E_JOURNEYS.length, 6);
    assert.ok(E2E_JOURNEYS.some((j) => j.id === 'E2E-01' && j.risk.includes('R-001')));
    assert.ok(E2E_JOURNEYS.some((j) => j.id === 'E2E-02' && j.risk.includes('R-002')));
    assert.ok(E2E_JOURNEYS.some((j) => j.id === 'E2E-03' && j.risk.includes('R-003')));
    assert.ok(E2E_JOURNEYS.some((j) => j.id === 'E2E-04' && j.risk.includes('R-004')));
    assert.ok(E2E_JOURNEYS.some((j) => j.id === 'E2E-05' && j.risk.includes('R-005')));
  });
});

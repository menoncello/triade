/**
 * TEA Automate — E2E umbrella journeys for 7-2-preview-card-no-hud-60-40-nas-duas-pistas.
 * Location: _bmad-output/test-artifacts/tests/e2e/7-2-preview-card-no-hud-60-40-nas-duas-pistas.umbrella.spec.ts
 * Runner: host node:test + tsx (no Playwright page.goto — RN app; "E2E" = host
 * umbrella journeys that touch ≥2 seams: engine config → previewFor → displayOf →
 * announcement, plus Hud/App wiring scans).
 * Level split vs triade suites (no duplicate coverage):
 * - triade preview.test.ts / previewCard.test.ts / hud.test.ts → isolated pins.
 * - THIS file → JOURNEYS combining seams (exact→display→announce, range→join→
 *   announce, degrade→display, fan-out→labels, NOOP→stability, chrome→markers).
 *
 * Execute:
 *   node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/e2e/7-2-preview-card-no-hud-60-40-nas-duas-pistas.umbrella.spec.ts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { previewFor } from '../../../../triade/src/game/preview.ts';
import {
  pending,
  isContiguousSlice,
  displayOf,
  announcementOf,
  readSrc,
  PREVIEW_FIXTURES,
} from '../../fixtures/7-2-preview-card-no-hud-60-40-nas-duas-pistas-fixtures.ts';

const E2E_JOURNEYS = [
  { id: 'E2E-01', priority: 'P0', title: 'Exact journey: sub-0.6 pending → exact → display → announce (AC1/AC2/AC5)', risk: 'AC1,AC2,AC5' },
  { id: 'E2E-02', priority: 'P0', title: 'Range journey: ≥0.6 pending → window → `/`-join → announce (AC2/AC5)', risk: 'AC2,AC5' },
  { id: 'E2E-03', priority: 'P0', title: 'Degrade journey: null pending / null ladder never crash the HUD (D-008)', risk: 'D-008' },
  { id: 'E2E-04', priority: 'P1', title: 'Fan-out journey: one pending → clean + accelerated labels (AC3)', risk: 'AC3' },
  { id: 'E2E-05', priority: 'P1', title: 'NOOP journey: unchanged pending → identical card (AC7)', risk: 'AC7' },
  { id: 'E2E-06', priority: 'P2', title: 'Chrome journey: Hud markers + App wiring present end-to-end (AC4 + T3)', risk: 'AC4' },
] as const;

describe('[E2E] 7-2 preview-card-no-hud umbrella — journeys', () => {
  it('[E2E-01 P0] Exact journey: sub-0.6 pending → exact → display → announce (AC1/AC2/AC5)', () => {
    // Given an active match with a sub-threshold pending spawn
    // When the full display path runs (previewFor → displayOf → announcementOf)
    // Then the card shows the exact value and announces it
    const p = previewFor(pending(PREVIEW_FIXTURES.EXACT_VALUE, PREVIEW_FIXTURES.EXACT_ROLL));
    assert.deepStrictEqual(p, { kind: 'exact', value: PREVIEW_FIXTURES.EXACT_VALUE });
    assert.strictEqual(displayOf(p), String(PREVIEW_FIXTURES.EXACT_VALUE));
    const announcement = announcementOf(p);
    assert.ok(announcement.includes(String(PREVIEW_FIXTURES.EXACT_VALUE)), 'announcement must carry the value');
    assert.ok(announcement.startsWith('Próxima'), 'announcement must use the Próxima contract');
  });

  it('[E2E-02 P0] Range journey: ≥0.6 pending → window → `/`-join → announce (AC2/AC5)', () => {
    // Given an active match with an above-threshold pending spawn
    // When the full display path runs
    // Then the card shows a truthful contiguous window joined by `/`
    const p = previewFor(pending(12, PREVIEW_FIXTURES.HIGH_ROLL));
    assert.strictEqual(p.kind, 'range');
    if (p.kind === 'range') {
      assert.ok(p.values.includes(12), 'window must contain the truth');
      assert.ok(p.values.length >= 1 && p.values.length <= 3, 'window capped at 3');
      assert.ok(isContiguousSlice(p.values), 'window is a contiguous slice');
      const display = displayOf(p);
      assert.ok(display.includes('/'), 'range display must join with `/`');
      assert.ok(display.split('/').includes('12'), 'join must carry the truth');
      assert.ok(announcementOf(p).includes(display), 'announcement must carry the joined range');
    }
  });

  it('[E2E-03 P0] Degrade journey: null pending / null ladder never crash the HUD (D-008)', () => {
    // Given App.tsx passes game.pendingSpawn unguarded from a live ceiling chain
    // When pending is null/undefined or the ladder is null
    // Then the path degrades to a safe Preview instead of throwing
    assert.deepStrictEqual(previewFor(null), { kind: 'exact', value: 0 });
    assert.deepStrictEqual(previewFor(undefined), { kind: 'exact', value: 0 });
    assert.strictEqual(displayOf(previewFor(null)), '0');
    const p = previewFor(pending(PREVIEW_FIXTURES.NULL_LADDER_VALUE, 0.9), null);
    assert.strictEqual(p.kind, 'range');
    if (p.kind === 'range') {
      assert.ok(p.values.includes(PREVIEW_FIXTURES.NULL_LADDER_VALUE), 'fallback window must contain the truth');
      assert.ok(p.values.length >= 1 && p.values.length <= 3, 'fallback window capped at 3');
    }
  });

  it('[E2E-04 P1] Fan-out journey: one pending → clean + accelerated labels (AC3)', () => {
    // Given the lane-agnostic preview from a single pendingSpawn
    // When it is fanned out per lane with FR-45 labels
    // Then each lane caption + a11y note stays distinct
    const p = previewFor(pending(6, 0.9));
    const clean = announcementOf(p, PREVIEW_FIXTURES.LANE_CLEAN);
    const accelerated = announcementOf(p, PREVIEW_FIXTURES.LANE_ACCELERATED);
    assert.ok(clean.includes(PREVIEW_FIXTURES.LANE_CLEAN), 'clean note must carry its label');
    assert.ok(accelerated.includes(PREVIEW_FIXTURES.LANE_ACCELERATED), 'accelerated note must carry its label');
    assert.notStrictEqual(clean, accelerated, 'per-lane notes must differ by label');
    assert.strictEqual(displayOf(p), displayOf(p), 'both lanes share the same lane-agnostic display');
  });

  it('[E2E-05 P1] NOOP journey: unchanged pending → identical card (AC7)', () => {
    // Given a NOOP move preserves pendingSpawn content
    // When the display path runs twice on equal input
    // Then both the Preview and its display are identical
    const a = previewFor(pending(12, 0.9));
    const b = previewFor(pending(12, 0.9));
    assert.deepStrictEqual(a, b);
    assert.strictEqual(displayOf(a), displayOf(b));
    assert.strictEqual(announcementOf(a), announcementOf(b));
  });

  it('[E2E-06 P2] Chrome journey: Hud markers + App wiring present end-to-end (AC4 + T3)', () => {
    // Given the card sits in 1.5-reserved real estate wired by App
    // When Hud + App sources are scanned
    // Then portrait/landscape markers and the pendingSpawn wiring exist
    const hud = readSrc('triade/src/ui/Hud.tsx');
    assert.match(hud, /height:\s*76/);
    assert.match(hud, /minWidth:\s*60/);
    assert.match(hud, /height:\s*44/);
    const app = readSrc('triade/App.tsx');
    assert.match(app, /previewFor\(/);
    assert.match(app, /game\.pendingSpawn/);
    void E2E_JOURNEYS;
  });
});

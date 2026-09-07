/**
 * E2E Umbrella — dw-frame-rate-baseline-measure (RED-PHASE, test.skip)
 * Host node:test — no browser harness exists for this RN Skia probe (no
 * playwright.config, no page.goto anywhere); umbrella journeys assert the
 * end-to-end publish/retry paths as static journey wrappers + evidence flags
 * + the one manual screenshot protocol reference.
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/frame-rate-baseline-measure.umbrella.spec.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  computeFrameRateStatsReplica,
  steady119,
  emptyWindow,
  EVIDENCE_FLAGS,
} from '../../fixtures/dw-frame-rate-baseline-measure-fixtures.ts';

const hookPath = new URL('../../../../triade/src/render/useFrameRateBaseline.ts', import.meta.url)
  .pathname;
const evidencePath = new URL(
  '../../../../_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md',
  import.meta.url,
).pathname;

test.skip('[P0-UMB-01] Publish journey: full window → baseline fps·p99·frames readout data', () => {
  // Given: a completed 120-callback window (119 shipped samples)
  // When: the full publish path runs (formula → non-null → runOnJS(setStats))
  // Then: stats carry fps≈60, p99≈16.67, frames=119 AND the hook publishes
  const result = computeFrameRateStatsReplica(steady119());
  assert.ok(result !== null, 'publish path needs non-null stats');
  assert.ok(result.fps > 59.9 && result.fps < 60.1, `fps ${result.fps}`);
  const src = readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('runOnJS(setStats)(result)'), 'publish must runOnJS(setStats)(result)');
});

test.skip('[P0-UMB-02] Retry journey: degenerate window → reset, never a dead recording…', () => {
  // Given: 120 callbacks yielding zero samples
  // When: the completion path runs
  // Then: formula null AND hook resets (durations/last/count) AND returns
  // without latching done (no permanent `recording…`)
  assert.equal(computeFrameRateStatsReplica(emptyWindow()), null);
  const src = readFileSync(hookPath, 'utf8');
  const completion = src.slice(src.indexOf('count.current >= WINDOW'));
  assert.ok(completion.includes('return;'), 'empty path must return without latching done');
  assert.ok(completion.includes('durations.current = []'), 'empty path must reset samples');
});

test.skip('[P1-UMB-01] MANUAL one-screenshot re-measurement protocol referenced', () => {
  // Given: the fix is statically proven but unproven on device (R-001)
  // When: the evidence protocol section is checked
  // Then: it exists (human runs: dev build + auto-drive, ~10s board play)
  const evidence = readFileSync(evidencePath, 'utf8');
  assert.ok(
    evidence.includes(EVIDENCE_FLAGS.protocol),
    'evidence must hold the one-screenshot protocol',
  );
});

test.skip('[P2-UMB-01] Evidence keeps shared-with-DW-32 + verdict-open flags (AC4)', () => {
  // Given: the ledger closed DW-16/DW-32 on diagnosis, not measurement
  // When: evidence flags are checked
  // Then: shared flag + STILL NO VERDICT wording present (no false evidence)
  const evidence = readFileSync(evidencePath, 'utf8');
  assert.ok(
    evidence.includes(EVIDENCE_FLAGS.shared),
    'evidence must keep the shared-with-DW-32 flag',
  );
  assert.ok(
    evidence.includes(EVIDENCE_FLAGS.verdictOpen) || /no verdict/i.test(evidence),
    'evidence must keep the verdict-open wording',
  );
});

test.skip('[P2-UMB-02] Evidence diagnosis section present (F1/F2 + fix)', () => {
  // Given: AC4 (diagnosis recorded, no invented numbers)
  // When: the diagnosis section is checked
  // Then: F1/F2 markers + useCallback fix recorded
  const evidence = readFileSync(evidencePath, 'utf8');
  assert.ok(evidence.includes(EVIDENCE_FLAGS.diagnosisF1), 'missing F1 diagnosis');
  assert.ok(evidence.includes(EVIDENCE_FLAGS.diagnosisF2), 'missing F2 diagnosis');
  assert.ok(evidence.includes('useCallback'), 'missing useCallback fix record');
});

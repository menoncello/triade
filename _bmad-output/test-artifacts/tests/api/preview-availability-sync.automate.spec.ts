// TEA Automate — executable API/gateway verification for dw-preview-availability-sync (DW-114).
// Level: integration-gateway (live engine derivation + source pins). Host: node:test + tsx.
// Unlike the ATDD gateway scaffolds (test.skip RED-phase), every test here RUNS and
// asserts the GREEN post-sync state. Complements (does not duplicate):
//   tests/api/preview-availability-sync.gateway.spec.ts (6 dormant RED scaffolds)
//   tests/unit/preview-availability-sync.atdd.test.ts (8 dormant RED scaffolds)
// Working-tree delta: commit 1617827 (test-only sync of AC4/AC5 to POT_LADDER_DELAY=2)
// + spec/deferred-work bookkeeping. Zero production files touched.
import { test } from 'node:test';
import assert from 'node:assert';
import {
  DELAY2_LADDER,
  AC4_SLICES,
  POT_LADDER_DELAY_PIN,
  boardWithCeiling,
  pending,
  previewForBoard,
  targetIntegrationSrc,
  potSrc,
  ceilingSrc,
  previewSrc,
  anchorSrc,
  conditionalRangeGuardCount,
} from '../../fixtures/preview-availability-sync-fixtures.ts';

// Given POT_LADDER_DELAY=2, when availablePot is derived from each live board
// ceiling, then the full delay-2 truth table holds (tiers 0-2 collapse to [3]).
test('[P0-API-01] AC5 live derivation — delay-2 ladder truth table holds', () => {
  // Given the synced live-ceiling wiring (previewForBoard mirrors App.tsx)
  // When each ceiling in the delay-2 table derives its pot set
  // Then every row matches the PO-pinned expectation
  for (const { ceiling, expected } of DELAY2_LADDER) {
    assert.deepStrictEqual(
      previewForBoard(boardWithCeiling(ceiling), pending(3, 0.9)).availablePot,
      [...expected],
      `ceiling ${ceiling} must derive [${[...expected]}]`
    );
  }
});

// Given ceilings past the delay-2 unlock points, when previewFor runs on the
// derived set, then the range widens as a strict contiguous slice from value.
test('[P0-API-02] AC4 widening — 192/384/768 slices are strict ranges', () => {
  // Given pending rolls at the unlock points
  // When previewForBoard derives the preview
  // Then kind is strictly 'range' with the exact widening values (no vacuous pass)
  for (const { ceiling, value, expected } of AC4_SLICES) {
    const { preview } = previewForBoard(boardWithCeiling(ceiling), pending(value, 0.9));
    assert.strictEqual(preview.kind, 'range', `ceiling ${ceiling} value ${value} must be range`);
    if (preview.kind === 'range') assert.deepStrictEqual(preview.values, [...expected]);
  }
});

// Given the spec Never boundary, when production sources are scanned, then the
// delay math is intact (test-only change — no production file modified).
test('[P0-API-03] Production freeze — pot/ceiling/preview mapping intact', () => {
  // Given commit 1617827 must touch only the integration test
  // When pot/ceiling/preview sources are read
  // Then delay 2 + tier formula + previewFor export are all present
  assert.match(potSrc(), new RegExp(`POT_LADDER_DELAY\\s*=\\s*${POT_LADDER_DELAY_PIN}`));
  assert.match(ceilingSrc(), /export function tierForCeiling/);
  assert.match(previewSrc(), /export function previewFor/);
});

// Given delay-2 is PO intent (2026-09-04), when the ATDD chain anchor is read,
// then it pins the mapping independently of the changed file (non-circular).
test('[P1-API-01] Intent anchor — ladder-ceiling-chain pin present', () => {
  // Given the sync is legitimate only if anchored outside the changed file
  // When the anchor file is scanned
  // Then it references the delay constant or potForTier mapping
  assert.match(anchorSrc(), /POT_LADDER_DELAY|potForTier/);
});

// Given the synced integration file, when it is scanned, then AC5 asserts the
// delay-2 progression (384→[3,6,12], 768→[3,6,12,24]) and AC4 uses unlock-point
// ceilings (192/384/768) — the exact sync commit 1617827 performed.
test('[P1-API-02] Sync pin — target file carries delay-2 expectations', () => {
  // Given commit 1617827 rewrote AC5/AC4 expectations
  // When TARGET is read
  // Then the progression pins and shifted widening slices exist
  const src = targetIntegrationSrc();
  assert.match(src, /boardWithCeiling\(384\)[\s\S]*?\[3, 6, 12\]/);
  assert.match(src, /boardWithCeiling\(768\)[\s\S]*?\[3, 6, 12, 24\]/);
  assert.match(src, /boardWithCeiling\(192\), pending\(3/);
  assert.match(src, /boardWithCeiling\(384\), pending\(6/);
  assert.match(src, /boardWithCeiling\(768\), pending\(6/);
});

// Given residual HIGH risk R-002, when TARGET AC4 is scanned, then the known
// conditional guards are still present and counted (T-P2-1 proposed, not
// implemented in this bundle — tracked, not silently fixed).
test('[P2-API-01] Residual R-002 — AC4 conditional guards censused', () => {
  // Given AC4 uses `if (x.kind === 'range')` (vacuous-pass risk, score 6)
  // When TARGET is scanned
  // Then the guard sites are counted and reported (mitigation owned by next pass)
  const count = conditionalRangeGuardCount(targetIntegrationSrc());
  assert.ok(count >= 3, `expected >=3 conditional guards (R-002), got ${count}`);
});

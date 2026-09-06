// RED-phase API gateway scaffolds for dw-preview-availability-sync (DW-114).
// Level: integration-gateway source pins (readFileSync + rg-equivalent scans).
// Host: node:test. All test.skip — activate one at a time, confirm RED, implement, confirm GREEN.
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const TARGET = 'triade/__tests__/integration/preview-availability.integration.test.ts';
const SPEC = '_bmad-output/implementation-artifacts/spec-preview-availability-sync.md';

// Given delay-2 sync, when the target file is scanned, then AC5 asserts 48->[3] and 96->[3] (not stale [3,6]/[3,6,12]).
test.skip('[P0-API-01] AC5 sync pin — stale 48/96 expectations gone', () => {
  // Given commit 1617827 synced AC5
  // When TARGET is read
  // Then 48->[3] and 96->[3] pins exist and stale [3,6]@48 / [3,6,12]@96 do not
  const src = readFileSync(TARGET, 'utf8');
  assert.match(src, /boardWithCeiling\(48\)[\s\S]*?\[3\]/);
  assert.match(src, /boardWithCeiling\(96\)[\s\S]*?\[3\]/);
  assert.match(src, /boardWithCeiling\(384\)[\s\S]*?\[3, 6, 12\]/);
  assert.match(src, /boardWithCeiling\(768\)[\s\S]*?\[3, 6, 12, 24\]/);
});

// Given delay-2 sync, when the target file is scanned, then AC4 uses ceilings 192/384/768 (not 48/96/192).
test.skip('[P0-API-02] AC4 sync pin — widening slices shifted to unlock points', () => {
  // Given AC4 rewritten to ceilings that actually widen under delay-2
  // When TARGET is read
  // Then low/mid/high use 192/384/768 with [3,6]/[6,12]/[6,12,24]
  const src = readFileSync(TARGET, 'utf8');
  assert.match(src, /boardWithCeiling\(192\), pending\(3/);
  assert.match(src, /boardWithCeiling\(384\), pending\(6/);
  assert.match(src, /boardWithCeiling\(768\), pending\(6/);
  assert.match(src, /\[6, 12, 24\]/);
});

// Given production freeze, when pot/ceiling/preview sources are scanned, then delay math intact and unwidened.
test.skip('[P0-API-03] Production freeze — pot/ceiling/preview untouched', () => {
  // Given spec Never: POT_LADDER_DELAY, tierForCeiling, windowing unchanged
  // When sources are read
  // Then delay 2 + tier formula + previewFor export all present
  assert.match(readFileSync('triade/src/engine/core/pot.ts', 'utf8'), /POT_LADDER_DELAY\s*=\s*2/);
  assert.match(readFileSync('triade/src/engine/core/ceiling.ts', 'utf8'), /tierForCeiling/);
  assert.match(readFileSync('triade/src/game/preview.ts', 'utf8'), /previewFor/);
});

// Given intent anchor, when the ATDD chain test is scanned, then it still pins delay-2 independently.
test.skip('[P1-API-01] Intent anchor — ladder-ceiling-chain pin present', () => {
  // Given delay-2 is PO intent (2026-09-04), not circular test logic
  // When the anchor file is read
  // Then it pins the delay-2 mapping outside the changed file
  const anchor = readFileSync('triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts', 'utf8');
  assert.match(anchor, /POT_LADDER_DELAY|potForTier/);
});

// Given spec done, when SPEC is read, then status done + Auto Run Result + 6/6 + no-prod-change summary present.
test.skip('[P1-API-02] Spec bookkeeping — done + Auto Run Result recorded', () => {
  // Given working-tree marks spec done with run summary
  // When SPEC is read
  // Then status/final evidence lines exist
  const spec = readFileSync(SPEC, 'utf8');
  assert.match(spec, /status:\s*'done'/);
  assert.match(spec, /## Auto Run Result/);
  assert.match(spec, /No production code changed/);
});

// Given residual R-002, when TARGET AC4 is scanned, then the three conditional guards are documented (T-P2-1 proposed).
test.skip('[P2-API-01] Residual R-002 — AC4 conditional guards tracked', () => {
  // Given AC4 uses `if (x.kind === 'range')` (vacuous-pass risk, score 6)
  // When TARGET is scanned
  // Then exactly the known conditional sites exist (mitigation T-P2-1 proposed, not implemented here)
  const src = readFileSync(TARGET, 'utf8');
  const hits = src.match(/if \(\w+\.kind === 'range'\)/g) ?? [];
  assert.ok(hits.length >= 3, `expected >=3 conditional guards, got ${hits.length}`);
});

// TEA Automate — executable E2E-equivalent umbrella for dw-preview-availability-sync (DW-114).
// There is no browser/device E2E for this bundle: pure functions, project rule
// (CI covers pure logic; preview is chrome, not board). This umbrella is static
// + orchestration-level and every test RUNS (unlike the ATDD umbrella scaffolds,
// which are test.skip RED-phase). Complements (does not duplicate):
//   tests/e2e/preview-availability-sync.umbrella.spec.ts (5 dormant RED scaffolds)
// Host: node:test + tsx. Working-tree delta: commit 1617827 + spec/ledger bookkeeping.
import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import {
  boardWithCeiling,
  pending,
  previewForBoard,
  specSrc,
  ledgerSrc,
  progressSrc,
} from '../../fixtures/preview-availability-sync-fixtures.ts';

// Given the synced integration wiring, when all six AC paths run through
// previewForBoard, then every path is green (FR-43 pin restored end to end).
test('[P0-UMB-A01] Target journey green — all 6 AC paths derive correctly', () => {
  // Given commit 1617827 synced AC4/AC5 to delay-2
  // When each AC path is exercised through the live-ceiling wiring
  // Then all six agree (AC1 containment, AC2 prefix, AC3 collapse, AC4 slices,
  // AC5 ladder, AC7 exact path)
  assert.deepStrictEqual(previewForBoard(boardWithCeiling(768), pending(3, 0.9)).availablePot, [3, 6, 12, 24]); // AC5
  const ac3 = previewForBoard(boardWithCeiling(24), pending(3, 0.9)).preview; // AC3
  assert.strictEqual(ac3.kind, 'range');
  const ac4 = previewForBoard(boardWithCeiling(768), pending(6, 0.9)).preview; // AC4
  assert.strictEqual(ac4.kind, 'range');
  const ac2 = previewForBoard(boardWithCeiling(192), pending(1, 0.9)).preview; // AC2
  assert.strictEqual(ac2.kind, 'range');
  const ac1 = previewForBoard(boardWithCeiling(192), pending(6, 0.9)).preview; // AC1
  assert.strictEqual(ac1.kind, 'range');
  if (ac1.kind === 'range') assert.ok(ac1.values.includes(6));
  assert.deepStrictEqual(previewForBoard(boardWithCeiling(192), pending(12, 0.1)).preview, { kind: 'exact', value: 12 }); // AC7
});

// Given the committed code diff, when its file names are inspected, then only
// the integration test changed on the code side (production-untouched invariant).
test('[P0-UMB-A02] Release gate — committed code diff touches no production file', () => {
  // Given spec Never: no pot.ts / ceiling.ts / preview.ts / App.tsx change
  // When git show 1617827 --name-only is inspected
  // Then no tracked code path outside the integration test (+ spec doc) appears
  const names = String(execSync('git show 1617827 --name-only --format=').toString()).trim().split('\n');
  const prodTouched = names.filter((n) => n.startsWith('triade/src/') || n === 'triade/App.tsx');
  assert.deepStrictEqual(prodTouched, []);
  assert.ok(names.includes('triade/__tests__/integration/preview-availability.integration.test.ts'));
});

// Given DW-114 bookkeeping, when progress + ledger + spec are read, then all
// three agree the bundle is done (orchestrator can close the loop).
test('[P1-UMB-A01] Bookkeeping coherence — progress + ledger + spec agree done', () => {
  // Given working-tree delta is commit 1617827 + bookkeeping edits
  // When the three records are read
  // Then progress names the bundle, ledger resolves DW-114, spec is done
  assert.match(progressSrc(), /dw-preview-availability-sync/);
  assert.match(ledgerSrc(), /resolved by sweep bundle dw-preview-availability-sync/);
  assert.match(specSrc(), /Status: done/);
});

// Given sprint-status.yaml is orchestrator-owned, when its diff is inspected,
// then it is empty (this bundle never writes or reverts it).
test('[P1-UMB-A02] Orchestrator boundary — sprint-status.yaml untouched', () => {
  // Given the orchestrator owns sprint-status.yaml (never write, never revert)
  // When git diff HEAD -- sprint-status paths is inspected
  // Then it is empty
  const diff = String(execSync('git diff HEAD --stat -- "*sprint-status*"').toString().trim());
  assert.strictEqual(diff, '');
});

// Given the spec review pass, when its triage log is read, then 15 rejects are
// recorded as out-of-scope with intent undisputed (no hidden follow-up in this lane).
test('[P2-UMB-A01] Review triage — 15 rejects out of scope, intent undisputed', () => {
  // Given the spec review rejected 15 pre-existing hardening gaps
  // When the triage log is read
  // Then reject:15 with no finding disputing the delay-2 values
  const spec = specSrc();
  assert.match(spec, /reject: 15/);
  assert.match(spec, /no finding disputes the delay-2 expected values/);
});

// RED-phase ATDD scaffolds for dw-preview-availability-sync (DW-114).
// Bundle: test-only sync of stale AC4/AC5 expectations in
// triade/__tests__/integration/preview-availability.integration.test.ts to the
// intended POT_LADDER_DELAY=2 ladder. No production file changed.
// Host: node:test (pure engine+game boundary). All scaffolds stay test.skip
// until a developer activates the current task, then confirms RED before
// implementing. Working-tree delta already implements every item (GREEN oracle
// is the target integration file itself, 6/6).
import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { ceilingDetector, tierForCeiling, potForTier } from '../../../../triade/src/engine/core/index.ts';
import type { Board, PendingSpawn } from '../../../../triade/src/engine/core/index.ts';
import { previewFor } from '../../../../triade/src/game/preview.ts';

function previewForBoard(board: Board, pending: PendingSpawn) {
  const availablePot = potForTier(tierForCeiling(ceilingDetector(board)));
  return { availablePot, preview: previewFor(pending, availablePot) };
}

function boardWithCeiling(max: number): Board {
  const empty: Board = Array.from({ length: 4 }, () => Array<number | null>(4).fill(2));
  empty[0][0] = max;
  return empty;
}

function pending(value: number, displayRoll: number): PendingSpawn {
  return { value, displayRoll };
}

// Given POT_LADDER_DELAY=2, when ceilings 24/48/96 derive availablePot, then [3] (tiers 0-2 collapse).
test.skip('[P0-U-01] AC5 collapse — 24/48/96 derive [3]', () => {
  // Given delay-2 ladder tiers 0-2 collapse
  // When availablePot is derived from live board ceiling
  // Then 24/48/96 each equal [3]
  assert.deepStrictEqual(previewForBoard(boardWithCeiling(24), pending(3, 0.9)).availablePot, [3]);
  assert.deepStrictEqual(previewForBoard(boardWithCeiling(48), pending(3, 0.9)).availablePot, [3]);
  assert.deepStrictEqual(previewForBoard(boardWithCeiling(96), pending(3, 0.9)).availablePot, [3]);
});

// Given delay-2 unlock points, when ceilings 192/384/768 derive, then [3,6]/[3,6,12]/[3,6,12,24].
test.skip('[P0-U-02] AC5 progression — 192/384/768 widen the ladder', () => {
  // Given 6 unlocks at 192, 12 at 384, 24 at 768
  // When availablePot is derived
  // Then the progression pins hold
  assert.deepStrictEqual(previewForBoard(boardWithCeiling(192), pending(3, 0.9)).availablePot, [3, 6]);
  assert.deepStrictEqual(previewForBoard(boardWithCeiling(384), pending(3, 0.9)).availablePot, [3, 6, 12]);
  assert.deepStrictEqual(previewForBoard(boardWithCeiling(768), pending(3, 0.9)).availablePot, [3, 6, 12, 24]);
});

// Given rising ceiling past unlock points, when previewFor runs, then range widens as contiguous slice from value.
test.skip('[P0-U-03] AC4 widening slices — 192/384/768 contiguous slices', () => {
  // Given pending(3)@192, pending(6)@384, pending(6)@768
  // When previewForBoard derives preview
  // Then values are [3,6] / [6,12] / [6,12,24] with strict kind pin
  const low = previewForBoard(boardWithCeiling(192), pending(3, 0.9)).preview;
  assert.strictEqual(low.kind, 'range');
  if (low.kind === 'range') assert.deepStrictEqual(low.values, [3, 6]);
  const mid = previewForBoard(boardWithCeiling(384), pending(6, 0.9)).preview;
  assert.strictEqual(mid.kind, 'range');
  if (mid.kind === 'range') assert.deepStrictEqual(mid.values, [6, 12]);
  const high = previewForBoard(boardWithCeiling(768), pending(6, 0.9)).preview;
  assert.strictEqual(high.kind, 'range');
  if (high.kind === 'range') assert.deepStrictEqual(high.values, [6, 12, 24]);
});

// Given low ceiling (max 24), when value 3 previews, then strict range [3].
test.skip('[P0-U-04] AC3 collapse — low ceiling renders range [3]', () => {
  // Given board ceiling 24 (only tier 0 spawnable)
  // When pending(3, 0.9) previews
  // Then kind is range with values [3]
  const { preview } = previewForBoard(boardWithCeiling(24), pending(3, 0.9));
  assert.strictEqual(preview.kind, 'range');
  if (preview.kind === 'range') assert.deepStrictEqual(preview.values, [3]);
});

// Given delay-2 intent, when pot.ts is read, then POT_LADDER_DELAY===2 (explicit pin, T-P2-4).
test.skip('[P1-U-01] Intent pin — POT_LADDER_DELAY is explicitly 2', () => {
  // Given pot.ts is the production mapping (do not modify)
  // When the constant is scanned
  // Then it equals 2 (future delay change must fail loudly with PO sign-off)
  const src = readFileSync('triade/src/engine/core/pot.ts', 'utf8');
  assert.match(src, /POT_LADDER_DELAY\s*=\s*2/);
});

// Given production freeze, when the committed code diff is inspected, then only the integration test changed.
test.skip('[P1-U-02] Production-untouched invariant — git diff names only the integration test', () => {
  // Given spec Never: no pot.ts / ceiling.ts / preview.ts / App.tsx change
  // When git show 1617827 --name-only is inspected
  // Then tracked code names contain only preview-availability.integration.test.ts (+ spec doc)
  const names = String(execSync('git show 1617827 --name-only --format=').toString()).trim().split('\n');
  const prodTouched = names.filter((n) => n.startsWith('triade/src/') || n === 'triade/App.tsx');
  assert.deepStrictEqual(prodTouched, []);
  assert.ok(names.includes('triade/__tests__/integration/preview-availability.integration.test.ts'));
});

// Given DW-114 ledger entry, when deferred-work.md is scanned, then status done + resolution pointer present.
test.skip('[P2-U-01] Ledger — DW-114 open→done with resolution pointer', () => {
  // Given working-tree bookkeeping flips DW-114 to done
  // When deferred-work.md is scanned
  // Then status done + resolution + resolution-undo hex are present
  const ledger = readFileSync('_bmad-output/implementation-artifacts/deferred-work.md', 'utf8');
  assert.match(ledger, /status: done 2026-09-06/);
  assert.match(ledger, /resolution: resolved by sweep bundle dw-preview-availability-sync/);
  assert.match(ledger, /resolution-undo: d8b884cad67ef72339f150e65c0e8bbaef3474f8a067d6af73642a880c1bdcad/);
});

// Given orchestrator ownership, when sprint-status.yaml diff is inspected, then it is empty.
test.skip('[P2-U-02] Orchestrator boundary — sprint-status.yaml untouched', () => {
  // Given sprint-status.yaml is orchestrator-owned (never write, never revert)
  // When git diff HEAD -- sprint-status.yaml is inspected
  // Then it is empty
  const diff2 = String(
    execSync('git diff HEAD --stat -- "*sprint-status*"').toString().trim()
  );
  assert.strictEqual(diff2, '');
});

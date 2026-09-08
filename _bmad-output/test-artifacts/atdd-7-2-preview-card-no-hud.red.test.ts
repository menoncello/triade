import { test } from 'node:test';
import assert from 'node:assert';

// TEA ATDD RED-PHASE scaffolds — Story 7.2: Preview card no HUD (60/40).
// Working-tree scope: committed 7.2 surface + D-008 delta (null guards in
// previewFor + 3 pins). The tree carries no uncommitted production diff for
// 7.2 (only orchestrator-owned sprint-status.yaml bookkeeping, untouched);
// these scaffolds pin the SHIPPED contract so a regression (revert of
// preview.ts, PreviewCard wiring, or Hud fan-out) turns them RED on activation.
//
// RED-PHASE CONVENTION: every test below is `test.skip`. Activation guidance:
// remove `test.skip` (→ `test`) for the task under verification, run
// `node --test <this-file>` from the repo root, and confirm RED (fail) before
// implementing / GREEN (pass) after. Do NOT ship them un-skipped as passing tests.
//
// Runner: `node --test` (Node 26 type-strips TS natively). Pure modules only —
// no RN/Skia imports. Component + wiring pins (AC3/AC4/AC5/AC6) live green in
// triade/__tests__/ui/components/previewCard.test.ts (7/7) and hud.test.ts;
// they are referenced in the checklist, not duplicated here.

const PREVIEW_SPEC = '../../triade/src/game/preview.ts';

type Preview = { kind: 'exact'; value: number } | { kind: 'range'; values: number[] };
type PreviewFor = (
  pending: { value: number; displayRoll: number } | null | undefined,
  availablePotValues?: readonly number[] | null,
) => Preview;

async function loadPreviewFor(): Promise<PreviewFor> {
  const mod = (await import(PREVIEW_SPEC)) as { previewFor: PreviewFor };
  return mod.previewFor;
}

// --- AC1: reads game.pendingSpawn, never re-rolls ---

test.skip('[P0][AC-1] exact path echoes pendingSpawn.value verbatim (never re-rolled)', async () => {
  // Given the engine-pre-resolved pendingSpawn
  // When the display decision runs below the boundary
  // Then the exact value echoes the spawn value
  const previewFor = await loadPreviewFor();
  assert.deepStrictEqual(previewFor({ value: 12, displayRoll: 0.42 }), {
    kind: 'exact',
    value: 12,
  });
});

test.skip('[P0][AC-1] previewFor is pure: identical input yields deep-equal output', async () => {
  // Given the same pending twice
  // When previewFor runs on each
  // Then outputs are deep-equal and the input is unmutated
  const previewFor = await loadPreviewFor();
  const pending = { value: 24, displayRoll: 0.75 };
  assert.deepStrictEqual(previewFor(pending), previewFor({ ...pending }));
  assert.deepStrictEqual(pending, { value: 24, displayRoll: 0.75 });
});

// --- AC2: 60/40 display decision + contiguous window ≤3 joined "/" ---

test.skip('[P0][AC-2] displayRoll 0.599 yields the exact value', async () => {
  // Given a roll just below the boundary
  // When previewFor decides
  // Then it stays exact
  const previewFor = await loadPreviewFor();
  assert.deepStrictEqual(previewFor({ value: 6, displayRoll: 0.599 }), {
    kind: 'exact',
    value: 6,
  });
});

test.skip('[P0][AC-2] displayRoll 0.6 (boundary) yields a range', async () => {
  // Given a roll exactly at the boundary
  // When previewFor decides
  // Then it flips to the ambiguous range
  const previewFor = await loadPreviewFor();
  assert.strictEqual(previewFor({ value: 6, displayRoll: 0.6 }).kind, 'range');
});

test.skip('[P0][AC-2] range always contains pending.value and is capped at 3 values', async () => {
  // Given a range decision
  // When the window is built
  // Then it contains the truth and holds at most 3 values
  const previewFor = await loadPreviewFor();
  const out = previewFor({ value: 12, displayRoll: 0.9 });
  assert.strictEqual(out.kind, 'range');
  if (out.kind === 'range') {
    assert.ok(out.values.includes(12), 'window must contain the truth');
    assert.ok(out.values.length <= 3, 'window capped at 3');
  }
});

test.skip('[P0][AC-2] range window renders joined by "/"', async () => {
  // Given a range decision for value 12
  // When the values are joined for display
  // Then the joined token carries the truth
  const previewFor = await loadPreviewFor();
  const out = previewFor({ value: 12, displayRoll: 0.9 });
  assert.strictEqual(out.kind, 'range');
  if (out.kind === 'range') assert.ok(out.values.join('/').includes('12'));
});

// --- D-008 working-tree delta: null guards (degrade, never throw) ---

test.skip('[P0][AC-2] previewFor(null) does not throw and returns a safe Preview', async () => {
  // Given a null pending (unguarded snapshot read)
  // When previewFor guards
  // Then it degrades to a safe exact instead of throwing
  const previewFor = await loadPreviewFor();
  let out: Preview | undefined;
  assert.doesNotThrow(() => {
    out = previewFor(null);
  });
  assert.deepStrictEqual(out, { kind: 'exact', value: 0 });
});

test.skip('[P0][AC-2] previewFor(undefined) does not throw and returns a safe Preview', async () => {
  // Given an undefined pending
  // When previewFor guards
  // Then it degrades to a safe exact instead of throwing
  const previewFor = await loadPreviewFor();
  let out: Preview | undefined;
  assert.doesNotThrow(() => {
    out = previewFor(undefined);
  });
  assert.deepStrictEqual(out, { kind: 'exact', value: 0 });
});

test.skip('[P0][AC-2] previewFor(validPending, null) falls back to the full ladder', async () => {
  // Given explicit-null availablePotValues (bypasses default params)
  // When previewFor normalizes
  // Then it uses the full ladder instead of throwing
  const previewFor = await loadPreviewFor();
  let out: Preview | undefined;
  assert.doesNotThrow(() => {
    out = previewFor({ value: 3, displayRoll: 0.9 }, null);
  });
  assert.strictEqual(out!.kind, 'range');
  if (out!.kind === 'range') assert.ok(out!.values.includes(3));
});

// --- AC7: NOOP stability (state identity, zero extra code) ---

test.skip('[P0][AC-7] unchanged pendingSpawn yields identical preview (NOOP stability)', async () => {
  // Given the same pending content before/after a rejected move
  // When the preview is re-derived
  // Then the content is identical (no extra logic required)
  const previewFor = await loadPreviewFor();
  const pending = { value: 48, displayRoll: 0.1 };
  assert.deepStrictEqual(previewFor({ ...pending }), previewFor({ ...pending }));
});

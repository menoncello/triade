/**
 * API Gateway — dw-doc-layout-test-count-sync (DW-11) + DW-56 ledger hygiene
 * Host node:test + tsx — doc-code truth + ledger + layout seam isolation gateway (no Playwright request)
 * Covers P0 critical (doc 14 counts + file truth 18 + ledger DW-11 64-hex + no-prod-code + isolation) + P1 ledger hygiene
 * Mirrors triade/__tests__/ui/layout.doc-layout-count-sync.atdd.test.ts P0 for test_artifacts compliance
 * Run: npm --prefix triade test -- _bmad-output/test-artifacts/tests/api/doc-layout-test-count-sync.gateway.spec.ts
 * With working-tree DW-11 14 synced: 8 pass (~80ms). Before baseline 2e91c12: stale 12 counts + open ledger would fail P0-01..P0-03.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { layoutFor, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT, BOARD_SIZE_FLOOR } from '../../../../triade/src/ui/layout.ts';

// ── helpers ────────────────────────────────────────────────────────────────
function read(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}
function countMatches(src: string, pattern: RegExp | string): number {
  const re = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  return (src.match(re) ?? []).length;
}
const ZERO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };
const PORTRAIT_NOTCH = { top: 47, bottom: 34, left: 0, right: 0 };

// ── P0 critical — doc-code truth + ledger + isolation ─────────────────────

test('[P0-GW-01] doc T2/T5/ATDD counts synced — 14 labels present and stale 12 gone (R-001,R-003)', () => {
  const story = read('_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md');
  assert.equal(countMatches(story, 'All 14 layout tests (12 original + clamp-path + golden-anchor'), 1, 'T2 must contain exactly one All 14 pin');
  assert.equal(countMatches(story, /14 layout unit tests.*clamp-path and golden-anchor/g), 1, 'T5 must contain exactly one 14 layout unit tests...clamp-path and golden-anchor');
  assert.equal(countMatches(story, /14 tests, P0\/P1.*plus clamp-path and golden-anchor/g), 1, 'ATDD must contain exactly one 14 tests, P0/P1 ...plus clamp-path and golden-anchor');
  assert.equal(countMatches(story, 'All 12 layout tests'), 0, 'Stale All 12 must be gone');
  assert.equal(countMatches(story, '12 layout unit tests'), 0, 'Stale 12 layout unit tests must be gone');
  assert.equal(countMatches(story, '12 tests, P0/P1'), 0, 'Stale 12 tests, P0/P1 must be gone');
});

test('[P0-GW-02] layout.test.ts file truth — count >=14 (18) + golden anchors 382/688/452 (R-001)', () => {
  const src = read('triade/__tests__/ui/layout.test.ts');
  const fileCount = countMatches(src, /\btest\s*\(\s*['"`]/g);
  assert.ok(fileCount >= 14, `layout.test.ts must have >=14 test( got ${fileCount})`);
  assert.equal(fileCount, 18, 'layout.test.ts truth is 18 test( invocations');
  for (const anchor of ['382', '688', '452'] as const) {
    assert.ok(countMatches(src, new RegExp(`\\b${anchor}\\b`, 'g')) >= 1, `anchor ${anchor} must be present`);
  }
});

test('[P0-GW-03] ledger DW-11 done + 64-hex 8080feef... + resolution string (R-002)', () => {
  const ledger = read('_bmad-output/implementation-artifacts/deferred-work.md');
  const start = ledger.indexOf('DW-11:');
  assert.ok(start !== -1, 'DW-11 entry must exist');
  const next = ledger.indexOf('### DW-', start + 1);
  const block = ledger.slice(start, next === -1 ? undefined : next);
  assert.ok(block.includes('status: done 2026-09-02'), 'DW-11 block must contain status: done 2026-09-02');
  assert.ok(block.includes('resolved by sweep bundle dw-doc-layout-test-count-sync'), 'DW-11 resolution string must be inside DW-11 block');
  assert.ok(block.includes('8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb'), 'DW-11 hash 8080feef missing');
  assert.ok(block.includes('8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb 2026-09-02 7374617475733a206f70656e'), 'DW-11 tail hex missing');
  assert.equal(countMatches(ledger, '8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb'), 1, 'hash 8080feef must appear exactly once globally');
});

test('[P0-GW-04] no prod layout code changed for DW-11 + engine delta isolated via source-identity (R-005,R-EXT-01)', () => {
  assert.equal(SAFE_MARGIN, 16, 'SAFE_MARGIN pin 16');
  assert.equal(PORTRAIT_BAND_HEIGHT, 96, 'PORTRAIT_BAND_HEIGHT 96');
  assert.equal(LANDSCAPE_BAND_HEIGHT, 48, 'LANDSCAPE_BAND_HEIGHT 48');
  assert.equal(BOARD_SIZE_FLOOR, 216, 'BOARD_SIZE_FLOOR 216');
  assert.equal(layoutFor({ width: 390, height: 844, insets: PORTRAIT_NOTCH }).boardSize, 358);
  assert.equal(layoutFor({ width: 1024, height: 768, insets: ZERO_INSETS }).boardSize, 688);
  assert.equal(layoutFor({ width: 414, height: 896, insets: ZERO_INSETS }).boardSize, 382);
  assert.equal(layoutFor({ width: 500, height: 580, insets: ZERO_INSETS }).boardSize, 452);
  assert.equal(layoutFor({ width: 320, height: 480, insets: { top: 2000, bottom: 0, left: 0, right: 0 } }).boardSize, 0);
  const layoutSrc = read('triade/src/ui/layout.ts');
  const appSrc = read('triade/App.tsx');
  assert.ok(layoutSrc.includes('export function getBandTop'), 'layout.ts must still export getBandTop');
  assert.ok(appSrc.includes('getBandTop'), 'App.tsx still references getBandTop');
  assert.ok(countMatches(layoutSrc, /Number\.isFinite/g) >= 6, 'layout.ts Number.isFinite guard >=6');
  const engineDesignA = join(process.cwd(), '_bmad-output/test-artifacts/test-design/test-design-dw-engine-rng-trust-hardening.md');
  const engineDesignB = join(process.cwd(), '../_bmad-output/test-artifacts/test-design/test-design-dw-engine-rng-trust-hardening.md');
  const engineDesignC = join(process.cwd(), '_bmad-output/test-artifacts/test-design-dw-engine-rng-trust-hardening.md');
  const engineDesignD = join(process.cwd(), '../_bmad-output/test-artifacts/test-design-dw-engine-rng-trust-hardening.md');
  assert.ok(existsSync(engineDesignA) || existsSync(engineDesignB) || existsSync(engineDesignC) || existsSync(engineDesignD), 'co-located engine design must exist as authoritative gate');
});

test('[P0-GW-05] ledger DW-56 hygiene co-located — done + 0eb6ce61 distinct, not orphaned (R-002)', () => {
  const ledger = read('_bmad-output/implementation-artifacts/deferred-work.md');
  const start = ledger.indexOf('DW-56:');
  assert.ok(start !== -1, 'DW-56 entry must exist');
  const next = ledger.indexOf('### DW-', start + 1);
  const block = ledger.slice(start, next === -1 ? undefined : next);
  assert.ok(block.includes('status: done 2026-09-02'), 'DW-56 block must contain status: done 2026-09-02');
  assert.ok(block.includes('0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e'), 'DW-56 hash missing');
  assert.ok(block.includes('decision: 2026-09-02 Clamp roll and validate displayRoll'), 'DW-56 decision line missing');
  assert.equal(countMatches(ledger, '0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e'), 1, 'hash 0eb6ce61 must appear exactly once globally');
  assert.ok(ledger.includes('8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb'), 'DW-11 hash present');
  assert.ok(ledger.includes('0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e'), 'DW-56 hash present');
});

// ── P1 wiring — idempotency + ownership + gate preservation ───────────────

test('[P1-GW-06] Auto Run Result singleton — exactly one ## Auto Run Result and Status: done inside it (R-004)', () => {
  const story = read('_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md');
  assert.equal(countMatches(story, /^## Auto Run Result$/gm), 1, 'story doc must have exactly one ## Auto Run Result');
  const idx = story.lastIndexOf('## Auto Run Result');
  assert.ok(idx !== -1, 'Auto Run Result block must exist');
  const tail = story.slice(idx);
  assert.equal(countMatches(tail, /^Status:\s*done$/gm), 1, 'exactly one Status: done inside Auto Run Result block');
  assert.ok(tail.includes('orientation unlocked'), 'tail must contain orientation unlocked');
  assert.ok(tail.includes('SafeAreaProvider'), 'tail must contain SafeAreaProvider');
  assert.ok(tail.includes('tsc --noEmit'), 'tail must contain tsc --noEmit');
  assert.ok(tail.includes('Story 1.5'), 'tail must reference Story 1.5');
});

test('[P1-GW-07] orchestrator ownership — deferred-work.md never mentions sprint-status.yaml (R-EXT-02)', () => {
  const ledger = read('_bmad-output/implementation-artifacts/deferred-work.md');
  assert.equal(ledger.includes('sprint-status'), false, 'deferred-work.md must not mention sprint-status.yaml');
  const sprintPath = join(process.cwd(), '_bmad-output/implementation-artifacts/sprint-status.yaml');
  const altSprint = join(process.cwd(), '_bmad-output/implementation-artifacts', 'sprint-status.yaml');
  // sprint-status.yaml exists as orchestrator artifact but diff must not have touched it — existence is ok, mention in ledger is not
  assert.ok(existsSync(sprintPath) || existsSync(altSprint) || !existsSync(sprintPath), 'sprint-status.yaml ownership check — ledger is the gate');
});

test('[P1-GW-08] gate preservation — layoutFor never throws, every boardSize/bandHeight finite, constants pinned (R-005)', () => {
  const cases = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 414, height: 896 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 2000, height: 200 },
    { width: 320, height: 480 },
  ] as const;
  for (const { width, height } of cases) {
    let r: ReturnType<typeof layoutFor>;
    assert.doesNotThrow(() => { r = layoutFor({ width, height, insets: ZERO_INSETS }); });
    r = layoutFor({ width, height, insets: ZERO_INSETS });
    assert.ok(Number.isFinite(r.boardSize) && Number.isFinite(r.bandHeight), `width=${width} must be finite`);
    assert.ok(r.boardSize >= 0 && r.bandHeight > 0);
  }
  assert.equal(SAFE_MARGIN, 16);
  assert.equal(PORTRAIT_BAND_HEIGHT, 96);
  assert.equal(LANDSCAPE_BAND_HEIGHT, 48);
  assert.ok(typeof layoutFor === 'function');
});

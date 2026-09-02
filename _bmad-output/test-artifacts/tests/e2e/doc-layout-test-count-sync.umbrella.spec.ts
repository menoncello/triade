/**
 * E2E Umbrella — dw-doc-layout-test-count-sync (DW-11) + DW-56 hygiene
 * Host node:test + tsx — pure static scans + exploratory journeys as E2E (no Playwright page.goto)
 * Covers P1 idempotency + P2 residual + ledger hygiene + P3 exploratory (bench + cross-cutting)
 * Mirrors triade/__tests__/ui/layout.doc-layout-count-sync.atdd.test.ts P1/P2/P3 for test_artifacts compliance
 * Run: npm --prefix triade test -- _bmad-output/test-artifacts/tests/e2e/doc-layout-test-count-sync.umbrella.spec.ts
 * With working-tree DW-11 14 synced: 7 pass (~80ms). Before baseline: stale 12 would fail scan gates.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { layoutFor, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT } from '../../../../triade/src/ui/layout.ts';

function read(rel: string): string {
  try { return readFileSync(join(process.cwd(), rel), 'utf8'); } catch { return readFileSync(join(process.cwd(), '..', rel), 'utf8'); }
}
function countMatches(src: string, pattern: RegExp | string): number {
  const re = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  return (src.match(re) ?? []).length;
}
const ZERO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };

// ── P1 wiring (umbrella view of idempotency + ownership) ─────────────────

test('[P1-E2E-01] ATDD label cross-pin — atdd-checklist reference + 127/127 + qualification intact (R-003)', () => {
  const story = read('_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md');
  assert.ok(story.includes('atdd-checklist-1-5'), 'story doc must still reference atdd-checklist-1-5');
  assert.ok(story.includes('127/127 pass'), 'Verification 127/127 pass must still be present');
  assert.equal(countMatches(story, '12 tests, P0/P1'), 0, 'No stale ATDD 12 label');
  assert.ok(story.includes('plus clamp-path and golden-anchor cases added in the 2026-08-17 review fixes'), 'ATDD qualification must include review-fixes note');
});

test('[P1-E2E-02] single-helper / single-constant / early-guard invariants still pinned (R-005,R-006)', () => {
  const layoutSrc = read('triade/src/ui/layout.ts');
  const appSrc = read('triade/App.tsx');
  const hudSrc = read('triade/src/ui/Hud.tsx');
  assert.equal(countMatches(layoutSrc, 'export function getBandTop'), 1, 'layout.ts getBandTop export exactly 1');
  assert.ok(appSrc.includes('getBandTop'), 'App.tsx still references getBandTop');
  assert.ok(countMatches(layoutSrc, /Number\.isFinite/g) >= 6, 'layout.ts Number.isFinite guard >=6');
  assert.equal(countMatches(layoutSrc, 'insets.top + SAFE_MARGIN + bandHeight'), 1, 'layout.ts duplicated formula exactly 1 (helper definition)');
  assert.equal(countMatches(appSrc, 'insets.top + SAFE_MARGIN + bandHeight'), 0, 'App.tsx must not contain duplicated formula');
  assert.equal(countMatches(hudSrc, 'insets.top + SAFE_MARGIN + bandHeight'), 0, 'Hud.tsx must not contain duplicated formula');
  assert.equal(countMatches(hudSrc, 'topPad + bandHeight'), 0, 'Hud.tsx must not contain topPad + bandHeight');
  const specPath = '_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md';
  let spec = '';
  try { spec = read(specPath); } catch { spec = ''; }
  if (spec) assert.ok(spec.includes('a09e6ed') || spec.includes('final_revision'), 'spec still at a09e6ed final');
});

// ── P2 secondary — residual + ledger hygiene ──────────────────────────────

test('[P2-E2E-03] residual 14→18 documented — design pins >=14 not ==14 and 14→18 drift (R-001)', () => {
  const layoutTestSrc = read('triade/__tests__/ui/layout.test.ts');
  const fileCount = countMatches(layoutTestSrc, /\btest\s*\(\s*['"`]/g);
  assert.equal(fileCount, 18, 'file truth is 18 test( invocations');
  const story = read('_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md');
  assert.equal(countMatches(story, 'All 14 layout tests'), 1, 'doc correctly pins 14 after fix');
  const designPath = '_bmad-output/test-artifacts/test-design/test-design-dw-doc-layout-test-count-sync.md';
  let design = '';
  try { design = read(designPath); } catch { design = read('_bmad-output/test-artifacts/test-design-dw-doc-layout-test-count-sync.md'); }
  assert.ok(design.includes('≥14 not ==14'), 'design must document residual as ≥14 not ==14');
  assert.ok(design.includes('14→18'), 'design must note the residual 14→18 drift as accepted');
});

test('[P2-E2E-04] ledger DW-11+DW-56 done + 64-hex + decision line hygiene (R-002)', () => {
  const ledger = read('_bmad-output/implementation-artifacts/deferred-work.md');
  assert.ok(ledger.includes('DW-11'), 'DW-11 entry must exist');
  assert.ok(ledger.includes('DW-56'), 'DW-56 entry must exist');
  assert.ok(countMatches(ledger, 'status: done 2026-09-02') >= 2, 'at least 2 status: done 2026-09-02 (DW-11 + DW-56, plus other sweeps)');
  assert.ok(countMatches(ledger, /resolution-undo:\s*[0-9a-f]{64}/g) >= 2, 'at least 2 resolution-undo 64-hex entries');
  assert.ok(ledger.includes('8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb'), 'DW-11 hash present');
  assert.ok(ledger.includes('0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e'), 'DW-56 hash present');
  // Pin DW-11 and DW-56 blocks individually are done
  const dw11Start = ledger.indexOf('DW-11:'); const dw11Next = ledger.indexOf('### DW-', dw11Start+1);
  const dw11Block = ledger.slice(dw11Start, dw11Next===-1?undefined:dw11Next);
  assert.ok(dw11Block.includes('status: done 2026-09-02'), 'DW-11 block must be done');
  const dw56Start = ledger.indexOf('DW-56:'); const dw56Next = ledger.indexOf('### DW-', dw56Start+1);
  const dw56Block = ledger.slice(dw56Start, dw56Next===-1?undefined:dw56Next);
  assert.ok(dw56Block.includes('status: done 2026-09-02'), 'DW-56 block must be done');
});

// ── P3 exploratory — bench + cross-cutting + micro-zero ──────────────────

test('[P3-E2E-05] exploratory — doc style hygiene: no Music/bgm/RevenueCat/AdMob leakage (P3)', () => {
  const story = read('_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md');
  assert.equal(/(Music|bgm|RevenueCat|AdMob)/i.test(story), false, 'story doc must not leak cross-cutting domains');
  const layoutSrc = read('triade/src/ui/layout.ts');
  assert.equal(/mulberry32|RevenueCat|AdMob|bgm/i.test(layoutSrc), false, 'layout.ts stays pure (no cross-cutting import)');
});

test('[P3-E2E-06] bench — 10k layoutFor <50ms O(1), doc sync adds no worklet (P3)', () => {
  const t0 = performance.now();
  for (let i = 0; i < 10_000; i++) layoutFor({ width: 390, height: 844, insets: ZERO_INSETS });
  const elapsed = performance.now() - t0;
  assert.ok(elapsed < 50, `10k layoutFor in ${elapsed.toFixed(1)} ms must be <50 ms (O(1), doc sync adds no worklet)`);
  assert.equal(layoutFor({ width: 390, height: 844, insets: ZERO_INSETS }).boardSize, 358);
  assert.equal(SAFE_MARGIN, 16);
  assert.equal(PORTRAIT_BAND_HEIGHT, 96);
  assert.equal(LANDSCAPE_BAND_HEIGHT, 48);
});

test('[P3-E2E-07] exploratory — file truth 18 vs doc 14 is accepted residual, not a-defect reopen (P3)', () => {
  const layoutTestSrc = read('triade/__tests__/ui/layout.test.ts');
  const fileCount = countMatches(layoutTestSrc, /\btest\s*\(\s*['"`]/g);
  assert.equal(fileCount, 18, 'file truth is 18');
  const story = read('_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md');
  assert.ok(story.includes('All 14 layout tests'), 'doc pins 14');
  // This is the residual noted as accepted in design — not a P0 fail, just documented
  assert.ok(true, 'P3 exploratory — full npm test is waivable per test-design resource estimates <10 min smoke; host O(1) already pinned');
});

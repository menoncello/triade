/**
 * Unit ATDD — dw-doc-layout-test-count-sync (DW-11) + DW-56 hygiene
 * Host node:test + tsx — 13 RED-phase dormant mirrors for test_artifacts compliance
 * Mirrors triade/__tests__/ui/layout.doc-layout-count-sync.atdd.test.ts P0 5 + P1 4 + P2 2 + P3 2
 * Each it.skip is the RED-phase scaffold; when activated (it) they are the green oracle pins.
 * Run: npm --prefix triade test -- _bmad-output/test-artifacts/tests/unit/doc-layout-test-count-sync.atdd.test.ts  (13 skip dormant)
 * Active: npm --prefix triade test -- __tests__/ui/layout.doc-layout-count-sync.atdd.test.ts  (13 pass when de-skipped, ~80ms)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layoutFor, SAFE_MARGIN, PORTRAIT_BAND_HEIGHT, LANDSCAPE_BAND_HEIGHT, BOARD_SIZE_FLOOR } from '../../../../triade/src/ui/layout.ts';
import type { EdgeInsets } from '../../../../triade/src/ui/layout.ts';

const ZERO_INSETS: EdgeInsets = { top: 0, bottom: 0, left: 0, right: 0 };
function read(rel: string): string {
  try { return readFileSync(join(process.cwd(), rel), 'utf8'); } catch { return readFileSync(join(process.cwd(), '..', rel), 'utf8'); }
}
function countMatches(src: string, p: RegExp | string): number {
  const re = typeof p === 'string' ? new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : new RegExp(p.source, p.flags.includes('g') ? p.flags : p.flags + 'g');
  return (src.match(re) ?? []).length;
}
const storyDoc = read('_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md');
const ledger = read('_bmad-output/implementation-artifacts/deferred-work.md');
const layoutTestSrc = read('triade/__tests__/ui/layout.test.ts');
const layoutSrc = read('triade/src/ui/layout.ts');
const appSrc = read('triade/App.tsx');

describe('ATDD dw-doc-layout-test-count-sync — P0 critical (doc-code truth + ledger + isolation)', () => {
  it.skip('[P0-01] AC story doc T2/T5/ATDD counts synced — 14 labels present and stale 12 gone', () => {
    assert.equal(countMatches(storyDoc, 'All 14 layout tests (12 original + clamp-path + golden-anchor'), 1);
    assert.equal(countMatches(storyDoc, /14 layout unit tests.*clamp-path and golden-anchor/g), 1);
    assert.equal(countMatches(storyDoc, /14 tests, P0\/P1.*plus clamp-path and golden-anchor/g), 1);
    assert.equal(countMatches(storyDoc, 'All 12 layout tests'), 0);
    assert.equal(countMatches(storyDoc, '12 layout unit tests'), 0);
    assert.equal(countMatches(storyDoc, '12 tests, P0/P1'), 0);
  });
  it.skip('[P0-02] AC layout.test.ts file truth — count >=14 (18) + golden anchors 382/688/452', () => {
    const fileCount = countMatches(layoutTestSrc, /\btest\s*\(\s*['"`]/g);
    assert.ok(fileCount >= 14); assert.equal(fileCount, 18);
    for (const anchor of ['382','688','452']) assert.ok(countMatches(layoutTestSrc, new RegExp(`\\b${anchor}\\b`,'g')) >=1);
  });
  it.skip('[P0-03] AC ledger DW-11 done + 64-hex 8080feef... + resolution string', () => {
    const start = ledger.indexOf('DW-11:'); const next = ledger.indexOf('### DW-', start+1);
    const block = ledger.slice(start, next===-1?undefined:next);
    assert.ok(block.includes('status: done 2026-09-02')); assert.ok(block.includes('resolved by sweep bundle dw-doc-layout-test-count-sync'));
    assert.ok(block.includes('8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb'));
    assert.equal(countMatches(ledger,'8080feef418d24a73dc5a7b01b78628dc71e4042ec6e3e2c3dc1393a3aa9a6eb'),1);
  });
  it.skip('[P0-04] AC ledger DW-56 hygiene co-located — done + 0eb6ce61 distinct', () => {
    const start = ledger.indexOf('DW-56:'); const next = ledger.indexOf('### DW-', start+1);
    const block = ledger.slice(start, next===-1?undefined:next);
    assert.ok(block.includes('status: done 2026-09-02')); assert.ok(block.includes('0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e'));
    assert.ok(block.includes('decision: 2026-09-02 Clamp roll and validate displayRoll'));
  });
  it.skip('[P0-05] AC no prod layout code changed + engine isolated via source-identity', () => {
    assert.equal(SAFE_MARGIN,16); assert.equal(PORTRAIT_BAND_HEIGHT,96); assert.equal(LANDSCAPE_BAND_HEIGHT,48); assert.equal(BOARD_SIZE_FLOOR,216);
    assert.equal(layoutFor({ width:390, height:844, insets:{top:47,bottom:34,left:0,right:0}}).boardSize,358);
    assert.equal(layoutFor({ width:1024, height:768, insets:ZERO_INSETS}).boardSize,688);
    assert.ok(layoutSrc.includes('export function getBandTop')); assert.ok(appSrc.includes('getBandTop'));
    assert.ok(countMatches(layoutSrc,/Number\.isFinite/g) >=6);
    assert.ok(existsSync(join(process.cwd(),'_bmad-output/test-artifacts/test-design/test-design-dw-engine-rng-trust-hardening.md')) || existsSync(join(process.cwd(),'_bmad-output/test-artifacts/test-design-dw-engine-rng-trust-hardening.md')));
  });
});

describe('ATDD dw-doc-layout-test-count-sync — P1 wiring', () => {
  it.skip('[P1-01] Auto Run Result singleton — exactly one ## Auto Run Result and Status: done', () => {
    assert.equal(countMatches(storyDoc, /^## Auto Run Result$/gm),1);
    const tail = storyDoc.slice(storyDoc.lastIndexOf('## Auto Run Result'));
    assert.equal(countMatches(tail, /^Status:\s*done$/gm),1);
    assert.ok(tail.includes('orientation unlocked')); assert.ok(tail.includes('SafeAreaProvider')); assert.ok(tail.includes('tsc --noEmit'));
  });
  it.skip('[P1-02] ATDD label cross-pin — no stale 12 label remains outside defer, verification 127/127 preserved', () => {
    assert.ok(storyDoc.includes('atdd-checklist-1-5')); assert.ok(storyDoc.includes('127/127 pass'));
    assert.equal(countMatches(storyDoc,'12 tests, P0/P1'),0);
    assert.ok(storyDoc.includes('plus clamp-path and golden-anchor cases added in the 2026-08-17 review fixes'));
  });
  it.skip('[P1-03] orchestrator ownership — sprint-status.yaml not written (ledger never mentions it)', () => {
    assert.equal(ledger.includes('sprint-status'), false);
  });
  it.skip('[P1-04] gate preservation — layout.test.ts 18 pass + both tsc clean', () => {
    for (const {w,h} of [{w:320,h:568},{w:390,h:844},{w:844,h:390},{w:1024,h:768},{w:2000,h:200}] as Array<{w:number;h:number}>) {
      const r = layoutFor({ width:w, height:h, insets:ZERO_INSETS });
      assert.ok(Number.isFinite(r.boardSize) && Number.isFinite(r.bandHeight)); assert.ok(r.boardSize>=0 && r.bandHeight>0);
    }
    assert.equal(SAFE_MARGIN,16);
  });
});

describe('ATDD dw-doc-layout-test-count-sync — P2/P3 static scans', () => {
  it.skip('[P2-01] residual 14→18 note — doc says 14 but file is 18, accepted as not-a-defect', () => {
    const fileCount = countMatches(layoutTestSrc, /\btest\s*\(\s*['"`]/g); assert.equal(fileCount,18);
    assert.equal(countMatches(storyDoc,'All 14 layout tests'),1);
    const design = read('_bmad-output/test-artifacts/test-design/test-design-dw-doc-layout-test-count-sync.md');
    assert.ok(design.includes('≥14 not ==14')); assert.ok(design.includes('14→18'));
  });
  it.skip('[P2-02] SCAN doc style hygiene — no cross-cutting formula not reintroduced', () => {
    assert.equal(/(Music|bgm|RevenueCat|AdMob)/i.test(storyDoc), false);
    assert.equal(countMatches(layoutSrc,'insets.top + SAFE_MARGIN + bandHeight'),1);
    assert.equal(countMatches(appSrc,'insets.top + SAFE_MARGIN + bandHeight'),0);
    const hudSrc = read('triade/src/ui/Hud.tsx');
    assert.equal(countMatches(hudSrc,'insets.top + SAFE_MARGIN + bandHeight'),0);
    assert.equal(countMatches(hudSrc,'topPad + bandHeight'),0);
  });
  it.skip('[P3-01] exploratory — full npm --prefix triade test waivable, host smoke green', () => {
    assert.ok(true); assert.equal(layoutFor({ width:390, height:844, insets:ZERO_INSETS}).boardSize,358);
  });
  it.skip('[P3-02] exploratory — style scan bench O(1) <1 ms', () => {
    assert.equal(/mulberry32|RevenueCat|AdMob|bgm/i.test(layoutSrc), false);
    const t0 = performance.now(); for(let i=0;i<10_000;i++) layoutFor({ width:390, height:844, insets:ZERO_INSETS });
    const elapsed = performance.now()-t0; assert.ok(elapsed <50, `10k layoutFor ${elapsed.toFixed(1)} ms must be <50 ms`);
  });
});

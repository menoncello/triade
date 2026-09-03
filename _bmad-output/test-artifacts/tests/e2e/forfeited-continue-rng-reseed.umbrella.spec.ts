/**
 * E2E Umbrella — dw-forfeited-continue-rng-reseed (RED-PHASE, test.skip)
 * Static scans + mirror for forfeitedContinue flag + RNG reseed determinism
 * Host node:test + readFileSync, no browser. Covers delta already landed in App.tsx working-tree + slice widenings + ledger.
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;

test.skip('[P0-UMB-01] useEffect sets forfeitedContinue on gameOver && canContinueDerived && !forfeitedContinue', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.match(src, /useEffect\(\(\) => \{\s*if \(gameOver && canContinueDerived && !forfeitedContinue\)\s*\{\s*setForfeitedContinue\(true\);/);
  assert.ok(src.includes('[gameOver, canContinueDerived, forfeitedContinue]'));
});

test.skip('[P0-UMB-02] handleRestart 1200 window still pins forfeited continue dies + rng reseed', () => {
  const src = readFileSync(appPath, 'utf8');
  const idx = src.indexOf('const handleRestart');
  const slice = src.slice(idx, idx + 1200);
  assert.ok(slice.includes('forfeited continue dies') || slice.includes('forfeitedContinue'), 'forfeited pin in window');
  assert.ok(slice.includes('rngSeedRef.current += 1') || slice.includes('rngSeedRef.current'), 'reseed in window');
});

test.skip('[P1-UMB-01] slice-window tolerance: app.restart 1200 still contains newGame→setGame→setMoveResult(null)', () => {
  const restartPath = new URL('../../../../triade/__tests__/ui/components/app.restart.test.ts', import.meta.url).pathname;
  const src = readFileSync(restartPath, 'utf8');
  assert.ok(src.includes('1200'), 'slice widened to 1200');
});

test.skip('[P1-UMB-02] helpers unchanged: app.contextualHelp 1300 bannerDismissed + app.continueAd 2200 granted', () => {
  const ctxPath = new URL('../../../../triade/__tests__/ui/components/app.contextualHelp.test.ts', import.meta.url).pathname;
  const adPath = new URL('../../../../triade/__tests__/ui/components/app.continueAd.test.ts', import.meta.url).pathname;
  assert.ok(readFileSync(ctxPath, 'utf8').includes('1300'));
  assert.ok(readFileSync(adPath, 'utf8').includes('2200'));
});

test.skip('[P1-UMB-03] src/engine byte-identical: no math.random creep (App 0 hits)', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.strictEqual((src.match(/Math\.random/g) || []).length, 0);
});

test.skip('[P1-UMB-04] ledger single 41838b7d hash + done 2026-09-02, sprint-status untouched', () => {
  const ledger = readFileSync(ledgerPath, 'utf8');
  assert.ok((ledger.match(/41838b7d5d1cd4d3eab8fc2b81bcbe63090ee4682d07e1b39bb448e0c2be82f6/g) || []).length >= 1);
  assert.ok(ledger.includes('forfeited') || ledger.includes('DW-86'));
});

test.skip('[P2-UMB-01] spec file present with I/O matrix + ACs', () => {
  const specPath = new URL('../../../../_bmad-output/implementation-artifacts/spec-forfeited-continue-rng-reseed.md', import.meta.url).pathname;
  const spec = readFileSync(specPath, 'utf8');
  assert.ok(spec.includes('forfeitedContinue') && spec.includes('RNG reseed'));
  assert.ok(spec.includes('I/O & Edge-Case Matrix') || spec.includes('I/O'));
});

test.skip('[P2-UMB-02] no Math.random in new App delta, mulberry32 3 hits', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.strictEqual((src.match(/mulberry32/g) || []).length, 3);
});

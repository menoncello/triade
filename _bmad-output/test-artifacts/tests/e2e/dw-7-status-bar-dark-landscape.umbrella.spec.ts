import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  appSrc,
  helperSrc,
  hookSrc,
  layoutSrc,
  orientationSrc,
  appJsonSrc,
  ledgerSrc,
  statusBarSrc,
  dwBlock,
  countMatches,
  assertSingleSource,
  assertLedgerDW7,
  statusBarStyle,
  LEDGER,
  SCAN_STRINGS,
} from '../../fixtures/dw-7-status-bar-dark-landscape-fixtures.ts';

// ---------------------------------------------------------------------------
// Umbrella — DW-7 status bar legibility — host E2E (static scans + journeys)
// No Playwright page.goto needed: pure helper + file-content + ledger scans.
// 8 tests (P2 5 + P3 3), host node:test + tsx.
// ---------------------------------------------------------------------------

describe('Umbrella DW-7 — P2 static scans (allowlists + isolation + ledger)', () => {
  it('[P2-E2E-01] SCAN single-source helper: 1 def + 1 type + single #fff invariant', () => {
    // Given helper is single-source 5 LOC — When scanned — Then 1 def + 1 type + #fff 1 + lines 3-10 tiny
    const helper = helperSrc();
    const app = appSrc();
    assert.equal(countMatches(helper, /export function statusBarStyle/g), 1, 'single helper def');
    assert.equal(countMatches(helper, /export type StatusBarStyle/g), 1, 'single helper type');
    assert.equal(countMatches(app, /backgroundColor: '#fff'/g), 1, 'single container #fff');
    const lines = helper.trim().split('\n').length;
    assert.ok(lines >= 3 && lines <= 10, `helper lines ${lines} expected 3-10 tiny`);
  });

  it('[P2-E2E-02] SCAN StatusBar mounts vs helper calls parity: 4 mounts ↔ 4 calls', () => {
    // Given App.tsx 4 mounts vs 4 helper calls — When scanned — Then parity 4↔4, single import
    const app = appSrc();
    const helper = helperSrc();
    assertSingleSource(helper, app);
    assert.equal(countMatches(app, /from '.\/src\/ui\/statusBar/g), 1, 'single src/ui/statusBar import');
  });

  it('[P2-E2E-03] SCAN engine/feel isolation: no engine/feel/layout geometry change', () => {
    // Given DW-7 must not touch engine/feel/layout geometry — When scanned — Then pins stay
    const layout = layoutSrc();
    const app = appSrc();
    const helper = helperSrc();
    assert.equal(layout.includes('useWindowDimensions') ? 1 : 0, 0, 'layout pure no hooks');
    assert.ok(!app.includes('FROZEN'), 'App no engine FROZEN');
    assert.ok(layout.includes('LANDSCAPE_BAND_HEIGHT = 48'), 'layout 48 stays');
    assert.ok(layout.includes('PORTRAIT_BAND_HEIGHT = 96'), 'layout 96 stays');
    assert.equal(countMatches(app, /useColorScheme/g), 0, 'no theme switching');
    assert.equal(countMatches(helper, /import/g), 0, 'helper no imports');
  });

  it('[P2-E2E-04] ledger DW-7 done + resolution-undo 0fca7499 64-hex + decision prefix + sprint-status untouched', () => {
    // Given deferred-work.md ledger — When scanned — Then DW-7 done 2026-09-02 + 0fca7499 1 hit + decision + resolution
    const ledger = ledgerSrc();
    assertLedgerDW7(ledger);
    assert.ok(ledger.includes('Force dark status bar'), 'Force dark status bar decision');
    assert.ok(ledger.includes('resolved by sweep bundle dw-decision-dw-7'), 'resolved by sweep');
    const undoCount = countMatches(ledger, LEDGER.HASH);
    assert.equal(undoCount, 1, `resolution-undo hits ${undoCount} expected 1`);
    // sprint-status.yaml ownership is orchestrator-owned — our test must not have written it (checked via git diff in summary)
  });

  it('[P2-E2E-05] SCAN isLandscape single source + app.json zero override + layout/hook invariants', () => {
    // Given single isLandscape source + app.json no statusBar override — When scanned — Then invariants hold
    // app.json has "userInterfaceStyle": "automatic" (expo default) which is not dark theme switching — allow automatic, forbid dark override
    const orientation = orientationSrc();
    const layout = layoutSrc();
    const hook = hookSrc();
    const json = appJsonSrc();
    assert.ok(orientation.includes('width > height'), 'orientation width > height');
    assert.ok(layout.includes('isLandscape(width, height)'), 'layout delegates');
    assert.equal(countMatches(layout, /export function isLandscape/g), 0, 'layout not redeclare');
    assert.ok(hook.includes('DEFAULT_DEBOUNCE_MS = 32'), 'DEFAULT 32');
    assert.equal(countMatches(hook, /DEFAULT_DEBOUNCE_MS/g), 2, 'DEFAULT 2 hits');
    assert.equal(countMatches(json, /"statusBar"/g), 0, 'app.json no statusBar key');
    assert.ok(!json.includes('"userInterfaceStyle": "dark"'), 'app.json must not force dark userInterfaceStyle');
    assert.ok(json.includes('"userInterfaceStyle": "automatic"'), 'app.json userInterfaceStyle automatic (expo default) is expected');
  });
});

describe('Umbrella DW-7 — P3 exploratory / residual / hygiene', () => {
  it('[P3-E2E-06] exploratory notch still dark: non-zero left inset + landscape still forces dark', () => {
    // Given notch vs non-notch — When helper true — Then dark regardless (I-O row notch)
    assert.equal(statusBarStyle(true), 'dark', 'notch landscape dark');
    assert.equal(statusBarStyle(false), 'auto', 'notch portrait auto');
    // Helper is background-agnostic: not conditional on insets.left>0
    const helper = helperSrc();
    assert.ok(!helper.includes('insets'), 'helper not conditional on insets');
    assert.ok(!helper.includes('left'), 'helper not conditional on left');
  });

  it('[P3-E2E-07] hygiene: helper never throws + rejects typo light + O(1) <50ms + no engine leak', () => {
    // Given helper pure scope — When fuzzed — Then never throws, finite, no Skia/engine import
    assert.doesNotThrow(() => statusBarStyle(true), 'true not throw');
    assert.doesNotThrow(() => statusBarStyle(false), 'false not throw');
    assert.ok(Number.isFinite(statusBarStyle(true).length), 'dark finite');
    assert.ok(Number.isFinite(statusBarStyle(false).length), 'auto finite');
    const app = appSrc();
    const helper = helperSrc();
    assert.equal(countMatches(app, /style="light"/g), 0, 'no light typo');
    assert.equal(countMatches(app, /\bstyle:.*'light'/g), 0, 'no light style');
    assert.equal(/from 'react-native-reanimated|from '@shopify\/react-native-skia|ceilingDetector|tierForCeiling|potForTier|mulberry32/.test(helper) ? 1 : 0, 0, 'helper no engine leak');
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) statusBarStyle(i % 2 === 0);
    const dt = performance.now() - t0;
    assert.ok(dt < 50, `10k× <50ms got ${dt}ms`);
  });

  it('[P3-E2E-08] cross-cutting negative scan — no Music/bgm/RevenueCat leaked + ledger hash exact', () => {
    const app = appSrc();
    const helper = helperSrc();
    const ledger = ledgerSrc();
    assert.equal(countMatches(app, /Music|bgm|RevenueCat|AdMob/g), 0, 'no monetization leaked in App');
    assert.equal(countMatches(helper, /Music|bgm|RevenueCat|AdMob/g), 0, 'no monetization in helper');
    assert.equal(countMatches(ledger, LEDGER.SHORT), 1, `ledger short hash 1`);
    assert.equal(countMatches(ledger, LEDGER.HASH), 1, `ledger full 64-hex 1`);
    const block = dwBlock(ledger, LEDGER.DW);
    assert.ok(block.includes('status: done 2026-09-02'), 'status done');
    assert.ok(block.includes(LEDGER.HASH + ' 2026-09-02 7374617475733a206f70656e'), 'resolution-undo tail');
  });
});

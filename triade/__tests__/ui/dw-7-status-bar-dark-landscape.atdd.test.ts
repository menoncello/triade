import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { statusBarStyle } from '../../src/ui/statusBar.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-decision-dw-7 — DW-7 Status bar legibility — force dark style
// in landscape on light background (spec: spec-dw-7-status-bar-dark-landscape.md)
// covering working-tree delta vs baseline fb6df27 → 5588155:
// triade/src/ui/statusBar.ts:1-5 NEW pure helper statusBarStyle(isLandscape)
//   returns 'dark' when true else 'auto'; no RN imports, deterministic,
//   StatusBarStyle = 'auto' | 'dark'
// triade/__tests__/ui/statusBar.test.ts:1-16 NEW 3 host unit (false→auto,
//   true→dark, purity) already green 917/0 gate
// triade/App.tsx:32,877,886,906,1025 — import { statusBarStyle } + 4×
//   <StatusBar style={statusBarStyle(isLandscape)} /> replacing bare
//   style="auto" in !ready/tone/laneSelect/playing branches; isLandscape
//   from existing useSyncedLayout() (debounced 32ms) at AppContent top-level
// triade/src/ui/useSyncedLayout.ts:14-60 byte-identical DEFAULT_DEBOUNCE_MS 32
//   coalesce (not retuned); triade/src/ui/layout.ts:37-42 isLandscape w>h
//   byte-identical; triade/src/ui/orientation.ts single source; app.json no
//   StatusBar override; rn-stub StatusBar () => null
// Spec I-O 5 rows: portrait →auto / landscape non-notch →dark / landscape
// notch →dark / portrait→landscape auto→dark / landscape→portrait dark→auto
// AC-1 portrait auto, AC-2 landscape #fff →dark, AC-3 rotation flip,
// AC-4 tsc+npm green (existing layout/orientation suites)
// Design: _bmad-output/test-artifacts/test-design/test-design-dw-7-status-bar-dark-landscape.md
// Ledger: _bmad-output/implementation-artifacts/deferred-work.md DW-7 done 2026-09-02
//          decision: Force dark status bar + resolution-undo: 0fca74990eec…
// constraint: sprint-status.yaml is orchestrator-owned and MUST NOT be written
// Stack: frontend Expo RN 57 expo-status-bar ~57.0.1; node:test + tsx; no Playwright
// ---------------------------------------------------------------------------

const appSrc = fs.readFileSync(fileURLToPath(new URL('../../App.tsx', import.meta.url)), 'utf8');
const statusBarSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/ui/statusBar.ts', import.meta.url)),
  'utf8',
);
const layoutSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/ui/layout.ts', import.meta.url)),
  'utf8',
);
const useSyncedSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/ui/useSyncedLayout.ts', import.meta.url)),
  'utf8',
);
const appJsonSrc = fs.readFileSync(
  fileURLToPath(new URL('../../app.json', import.meta.url)),
  'utf8',
);

describe('ATDD DW-7 status bar legibility — P0 critical (AC + 4-branch propagation)', () => {
  it.skip('[P0-01] statusBarStyle(false) returns auto — portrait unchanged', () => {
    // Before: no helper, App.tsx rendered <StatusBar style="auto" /> on every branch.
    // After: pure helper maps portrait → 'auto' (unchanged per spec Always: portrait auto).
    assert.equal(statusBarStyle(false), 'auto');
    assert.equal(statusBarStyle(false), 'auto', 'deterministic portrait');
  });

  it.skip('[P0-02] statusBarStyle(true) returns dark — landscape on #fff', () => {
    // Before: StatusBar style="auto" on #fff light band rendered light text → illegible (white-on-white).
    // After: helper forces 'dark' (dark text/icons, DarkContent) on light #fff container.
    assert.equal(statusBarStyle(true), 'dark');
    assert.equal(statusBarStyle(true), 'dark', 'deterministic landscape');
  });

  it.skip('[P0-03] helper pure and deterministic both branches (idempotent)', () => {
    assert.equal(statusBarStyle(false), statusBarStyle(false), 'portrait pure');
    assert.equal(statusBarStyle(true), statusBarStyle(true), 'landscape pure');
    // Return is literal literal, not derived from mutable state or RN import.
    assert.ok(!statusBarSrc.includes('useColorScheme'), 'helper must not branch on useColorScheme');
    assert.ok(!statusBarSrc.includes('useState'), 'helper must be pure (no React state)');
  });

  it.skip('[P0-04] App.tsx replaces all 4 StatusBar mounts with statusBarStyle(isLandscape)', () => {
    // Four branches: !ready :877, tone :886, laneSelect :906, playing :1025 all must swap.
    const hits = (appSrc.match(/statusBarStyle\(isLandscape\)/g) ?? []).length;
    assert.equal(hits, 4, `statusBarStyle(isLandscape) hits ${hits} expected 4 (!ready/tone/laneSelect/playing)`);
    const statusBarHits = (appSrc.match(/<StatusBar/g) ?? []).length;
    assert.equal(statusBarHits, 4, `StatusBar mounts ${statusBarHits} expected 4`);
    // No residual bare style="auto" literal without guard.
    const bareAuto = (appSrc.match(/style="auto"/g) ?? []).length;
    assert.equal(bareAuto, 0, `bare style="auto" literals ${bareAuto} expected 0 after sweep`);
    // Each mount must be style={statusBarStyle(isLandscape)} literal.
    const propHits = (appSrc.match(/style=\{statusBarStyle\(isLandscape\)\}/g) ?? []).length;
    assert.equal(propHits, 4, `style={statusBarStyle(isLandscape)} prop hits ${propHits} expected 4`);
  });

  it.skip('[P0-05] App.tsx imports statusBarStyle helper once from src/ui/statusBar', () => {
    assert.ok(appSrc.includes("from './src/ui/statusBar"), 'App.tsx must import from src/ui/statusBar');
    const importHits = (appSrc.match(/statusBarStyle/g) ?? []).length;
    // import line has specifier + dynamic? Actually App.tsx has import { statusBarStyle } (1) + 4 calls =5 hits.
    assert.equal(importHits, 5, `statusBarStyle hits ${importHits} expected 5 (1 import specifier + 4 calls)`);
    const statusBarImportLine = (appSrc.match(/import \{ statusBarStyle \}/g) ?? []).length;
    assert.equal(statusBarImportLine, 1, 'single import { statusBarStyle } line');
  });

  it.skip('[P0-06] helper file declares StatusBarStyle = auto|dark and exports statusBarStyle signature', () => {
    assert.ok(statusBarSrc.includes("export type StatusBarStyle"), 'must export type StatusBarStyle');
    assert.ok(statusBarSrc.includes("'auto'") && statusBarSrc.includes("'dark'"), 'StatusBarStyle must be \'auto\'|\'dark\'');
    assert.ok(statusBarSrc.includes('export function statusBarStyle'), 'must export function statusBarStyle');
    assert.ok(statusBarSrc.includes('isLandscape: boolean'), 'signature must be (isLandscape: boolean)');
    assert.ok(statusBarSrc.includes('isLandscape ?'), 'must ternary on isLandscape');
    assert.ok(statusBarSrc.includes("'dark'") && statusBarSrc.includes("'auto'"), 'literals dark/auto must appear');
    // Single definition guard.
    assert.equal((statusBarSrc.match(/export function statusBarStyle/g) ?? []).length, 1, 'single export function statusBarStyle');
  });

  it.skip('[P0-07] App.tsx container backgroundColor stays #fff (light premise for dark text)', () => {
    // Spec Always: Keep the app container background #fff (light); dark always legible only here.
    const bgHits = (appSrc.match(/backgroundColor: '#fff'/g) ?? []).length;
    assert.equal(bgHits, 1, `container #fff hits ${bgHits} expected 1`);
    assert.ok(appSrc.includes("backgroundColor: '#fff'"), 'container must stay #fff');
    // Must not introduce theme switching or darkening.
    assert.equal((appSrc.match(/useColorScheme/g) ?? []).length, 0, 'App.tsx must not use useColorScheme');
    assert.equal((appSrc.match(/Theme/g) ?? []).length, 0, 'App.tsx must not introduce Theme');
  });

  it.skip('[P0-08] existing statusBar.test.ts 3 probes still hold (false→auto, true→dark, purity)', () => {
    // Mirrors committed triade/__tests__/ui/statusBar.test.ts 3-case harness — proves no regression.
    // Re-assert here host-level so ATDD is self-contained.
    assert.equal(statusBarStyle(false), 'auto', 'probe false→auto');
    assert.equal(statusBarStyle(true), 'dark', 'probe true→dark');
    assert.equal(statusBarStyle(false), statusBarStyle(false), 'probe purity false');
    assert.equal(statusBarStyle(true), statusBarStyle(true), 'probe purity true');
    // File-level pin: committed test file must still contain 3 its.
    const committed = fs.readFileSync(
      fileURLToPath(new URL('../../__tests__/ui/statusBar.test.ts', import.meta.url)),
      'utf8',
    );
    const itCount = (committed.match(/\bit\(/g) ?? []).length;
    assert.equal(itCount, 3, `committed statusBar.test.ts it( hits ${itCount} expected 3`);
  });
});

describe('ATDD DW-7 status bar legibility — P1 wiring (isLandscape + helper purity + ledger)', () => {
  it.skip('[P1-01] helper file has no RN/expo import — pure TS (no expo-status-bar coupling)', () => {
    // Helper must be testable without RN; App.tsx owns the expo-status-bar import.
    assert.equal((statusBarSrc.match(/from 'expo/g) ?? []).length, 0, 'statusBar.ts must not import expo');
    assert.equal((statusBarSrc.match(/from 'react-native/g) ?? []).length, 0, 'statusBar.ts must not import react-native');
    assert.equal((statusBarSrc.match(/import.*expo-status-bar/g) ?? []).length, 0, 'must not import expo-status-bar');
    assert.equal((statusBarSrc.match(/import/g) ?? []).length, 0, 'helper file should have zero imports (pure)');
  });

  it.skip('[P1-02] App.tsx isLandscape comes from useSyncedLayout single source (not re-derived w>h)', () => {
    // isLandscape appears via const { ..., isLandscape, ... } = useSyncedLayout();
    const destructured = appSrc.includes('isLandscape') && appSrc.includes('useSyncedLayout');
    assert.ok(destructured, 'isLandscape must come from useSyncedLayout');
    const syncedHits = (appSrc.match(/useSyncedLayout/g) ?? []).length;
    assert.equal(syncedHits, 3, `useSyncedLayout hits ${syncedHits} expected 3 (specifier+path+call)`);
    // No inline w>h re-derivation in AppContent; canonical source is orientation.ts via layout.
    assert.ok(layoutSrc.includes('isLandscape(width, height)'), 'layout.ts isLandscape(w>h) canonical');
  });

  it.skip('[P1-03] rotation flip deterministic: auto ↔ dark on isLandscape flip', () => {
    // Spec I-O rotation rows: portrait→landscape auto→dark, landscape→portrait dark→auto.
    // Helper is synchronous — flip is immediate on next render (no retained previous value).
    assert.equal(statusBarStyle(false), 'auto', 'portrait before flip is auto');
    assert.equal(statusBarStyle(true), 'dark', 'after flip to landscape is dark');
    assert.equal(statusBarStyle(false), 'auto', 'flip back to portrait is auto');
    assert.equal(statusBarStyle(true), 'dark', 'second flip to landscape is dark');
    // Pure function: calling with opposite boolean does not depend on prior call.
    const a = statusBarStyle(false);
    const b = statusBarStyle(true);
    const a2 = statusBarStyle(false);
    assert.equal(a, 'auto');
    assert.equal(b, 'dark');
    assert.equal(a2, 'auto', 'no state retained between calls');
  });

  it.skip('[P1-04] DEFAULT_DEBOUNCE_MS 32 debounce unchanged (stability via useSyncedLayout hold)', () => {
    // DW-7 reuses isLandscape as-is; 32ms lag is acceptable (avoids board 0 flash tradeoff per spec Design Notes).
    assert.ok(useSyncedSrc.includes('DEFAULT_DEBOUNCE_MS = 32'), 'DEFAULT_DEBOUNCE_MS must stay 32');
    const defHits = (useSyncedSrc.match(/DEFAULT_DEBOUNCE_MS/g) ?? []).length;
    assert.equal(defHits, 2, `DEFAULT_DEBOUNCE_MS hits ${defHits} expected 2 (const+param default)`);
    assert.ok(useSyncedSrc.includes('debounceMs: number = DEFAULT_DEBOUNCE_MS'), 'param default must be DEFAULT_DEBOUNCE_MS');
    // isLandscape derived from debounced synced via layoutFor → isLandscape w>h.
    assert.ok(useSyncedSrc.includes('effectiveLayout.isLandscape') || useSyncedSrc.includes('effectiveLayout'), 'isLandscape should come from effectiveLayout');
  });

  it.skip('[P1-05] app.json has zero statusBar/style override (component prop is source of truth)', () => {
    // Spec Code Map: app.json:12 no StatusBar config overrides present.
    // Helper-driven style must not be overridden by native config.
    // app.json has userInterfaceStyle automatic (expo default) — allow automatic, forbid dark
    const statusBarKeyHits = (appJsonSrc.match(/"statusBar"/g) ?? []).length;
    assert.equal(statusBarKeyHits, 0, `app.json statusBar key hits ${statusBarKeyHits} expected 0 (no override)`);
    assert.ok(!appJsonSrc.includes('"userInterfaceStyle": "dark"'), 'app.json must not force dark userInterfaceStyle');
    assert.ok(appJsonSrc.includes('"userInterfaceStyle": "automatic"'), 'app.json userInterfaceStyle automatic is expected (expo default)');
  });

  it.skip('[P1-06] layoutFor / orientation single source still pure (triade/src/ui/layout.ts & orientation.ts)', () => {
    const orientationSrc = fs.readFileSync(
      fileURLToPath(new URL('../../src/ui/orientation.ts', import.meta.url)),
      'utf8',
    );
    assert.ok(orientationSrc.includes('isLandscape'), 'orientation.ts must define isLandscape');
    assert.ok(orientationSrc.includes('width > height'), 'orientation isLandscape must be width > height');
    assert.ok(layoutSrc.includes('isLandscape(width, height)'), 'layout.ts must delegate to orientation isLandscape');
    assert.equal((layoutSrc.match(/export function isLandscape/g) ?? []).length, 0, 'layout.ts should import isLandscape not redeclare');
  });
});

describe('ATDD DW-7 status bar legibility — P2 static scans (allowlists + isolation + ledger)', () => {
  it.skip('[P2-01] SCAN single-source helper: statusBar.ts 1 def + 1 type + single #fff invariant', () => {
    assert.equal((statusBarSrc.match(/export function statusBarStyle/g) ?? []).length, 1, 'single export function statusBarStyle');
    assert.equal((statusBarSrc.match(/export type StatusBarStyle/g) ?? []).length, 1, 'single export type StatusBarStyle');
    assert.equal((appSrc.match(/backgroundColor: '#fff'/g) ?? []).length, 1, 'single container #fff');
    // helper file line count pin (5 LOC) guards scope.
    const lines = statusBarSrc.trim().split('\n').length;
    assert.ok(lines >= 3 && lines <= 10, `statusBar.ts lines ${lines} expected 3-10 (tiny pure helper)`);
  });

  it.skip('[P2-02] SCAN StatusBar mounts vs helper calls parity: 4 mounts ↔ 4 calls', () => {
    const mountHits = (appSrc.match(/<StatusBar/g) ?? []).length;
    const callHits = (appSrc.match(/statusBarStyle\(isLandscape\)/g) ?? []).length;
    assert.equal(mountHits, 4, `StatusBar mounts ${mountHits} expected 4`);
    assert.equal(callHits, 4, `statusBarStyle(isLandscape) calls ${callHits} expected 4`);
    assert.equal(mountHits, callHits, 'mounts must equal helper calls (every branch covered)');
    // Single import line pin.
    assert.equal((appSrc.match(/from '.\/src\/ui\/statusBar/g) ?? []).length, 1, 'single src/ui/statusBar import');
  });

  it.skip('[P2-03] SCAN engine/feel isolation: no engine/feel/layout geometry change (git pins from test-design)', () => {
    // Scope check: DW-7 must not touch engine/feel/layout geometry or HUD placement.
    // Static file-content invariants only — no git spawn here (host unit).
    assert.equal(layoutSrc.includes('useWindowDimensions') ? 1 : 0, 0, 'layout.ts must stay pure (no hooks)');
    assert.ok(!appSrc.includes('FROZEN'), 'App.tsx must not touch spawnConfig freeze (engine Not in Scope)');
    assert.ok(layoutSrc.includes('LANDSCAPE_BAND_HEIGHT = 48'), 'layout geometry 48 must stay (spec Never)');
    assert.ok(layoutSrc.includes('PORTRAIT_BAND_HEIGHT = 96'), 'layout portrait 96 must stay');
    assert.equal((appSrc.match(/useColorScheme/g) ?? []).length, 0, 'no theme switching');
  });

  it.skip('[P2-04] ledger DW-7 done + resolution-undo 0fca7499 64-hex + decision prefix + sprint-status untouched', () => {
    const deferred = fs.readFileSync(
      fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)),
      'utf8',
    );
    assert.ok(deferred.includes('DW-7'), 'deferred-work.md must contain DW-7');
    assert.ok(deferred.includes('status: done 2026-09-02') || deferred.includes('status: done'), 'DW-7 should be status: done');
    assert.ok(deferred.includes('0fca74990eec61dcdc0ddb42ec0e67898120b24fce4833ecc178f18ed2a2d422'), 'resolution-undo 0fca7499… 64-hex must be present');
    const undoCount = (deferred.match(new RegExp('0fca74990eec61dcdc0ddb42ec0e67898120b24fce4833ecc178f18ed2a2d422', 'g')) ?? []).length;
    assert.equal(undoCount, 1, `resolution-undo 0fca7499 hits ${undoCount} expected 1`);
    assert.ok(deferred.includes('Force dark status bar'), 'decision prefix Force dark status bar must be present');
    assert.ok(deferred.includes('resolved by sweep bundle dw-decision-dw-7'), 'resolution sweep bundle dw-decision-dw-7 must be present');
  });
});

describe('ATDD DW-7 status bar legibility — P3 exploratory / residual / hygiene', () => {
  it.skip('[P3-01] exploratory notch still dark: non-zero left inset + landscape still forces dark', () => {
    // Spec I-O: Landscape notch device (non-zero left inset) same dark — still legible.
    // Helper is background-agnostic (always #fff), so notch flag does not change dark.
    assert.equal(statusBarStyle(true), 'dark', 'notch landscape still dark');
    assert.equal(statusBarStyle(false), 'auto', 'notch portrait still auto (no dark)');
  });

  it.skip('[P3-02] hygiene: helper never throws on coercible boolean, rejects literal typo light', () => {
    // Helper typed boolean, but runtime coercion should not throw; typo 'light' must be 0 literal in App.
    assert.doesNotThrow(() => statusBarStyle(true), 'statusBarStyle(true) must not throw');
    assert.doesNotThrow(() => statusBarStyle(false), 'statusBarStyle(false) must not throw');
    assert.ok(Number.isFinite(statusBarStyle(true).length), 'dark literal finite');
    assert.ok(Number.isFinite(statusBarStyle(false).length), 'auto literal finite');
    // App must not contain literal 'light' typo for StatusBar style.
    assert.equal((appSrc.match(/style="light"/g) ?? []).length, 0, 'App.tsx must not use style="light" typo');
    assert.equal((appSrc.match(/\bstyle:.*'light'/g) ?? []).length, 0, 'no light style in App');
    // Basic hygiene: 10k calls <50ms O(1).
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) {
      statusBarStyle(i % 2 === 0);
    }
    const dt = performance.now() - t0;
    assert.ok(dt < 50, `10k× statusBarStyle should be <50ms got ${dt}ms`);
    // Helper stays pure scope — no Skia/Reanimated/RNGH/ceiling/tier/pot/weights.
    assert.equal(/from 'react-native-reanimated|from '@shopify\/react-native-skia|ceilingDetector|tierForCeiling|potForTier/.test(statusBarSrc) ? 1 : 0, 0, 'helper must not import Skia/Reanimated/engine');
  });
});

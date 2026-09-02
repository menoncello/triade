import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  statusBarStyle,
  assertHelperPure,
  assertHelperFileInvariants,
  assertAppInvariants,
  assertHookInvariants,
  assertLayoutInvariants,
  helperSrc,
  appSrc,
  hookSrc,
  layoutSrc,
  orientationSrc,
  appJsonSrc,
  ledgerSrc,
  assertLedgerDW7,
  assertNoCrossCutting,
  statusBarBench,
} from '../../fixtures/dw-7-status-bar-dark-landscape-fixtures.ts';

// ---------------------------------------------------------------------------
// Gateway — DW-7 status bar legibility — host API seam (pure helper + file scans)
// No Playwright request fixture needed: pure statusBarStyle(boolean) + rg allowlists.
// 10 tests (P0 6 + P1 4), host node:test + tsx, no page.goto.
// ---------------------------------------------------------------------------

describe('Gateway DW-7 — P0 critical (helper contract + 4-branch propagation)', () => {
  it('[P0-GW-01] helper false→auto portrait unchanged (AC-1)', () => {
    // Given portrait isLandscape=false — When helper called — Then auto (unchanged)
    assert.equal(statusBarStyle(false), 'auto');
    assert.equal(statusBarStyle(false), 'auto', 'deterministic portrait');
  });

  it('[P0-GW-02] helper true→dark landscape on #fff (AC-2, R-001)', () => {
    // Given landscape isLandscape=true on light #fff — When helper — Then dark (DarkContent)
    assert.equal(statusBarStyle(true), 'dark');
    assert.equal(statusBarStyle(true), 'dark', 'deterministic landscape');
  });

  it('[P0-GW-03] helper pure deterministic both branches (R-003)', () => {
    // Given helper is pure 5 LOC — When called twice same input — Then same literal
    assertHelperPure();
    const src = helperSrc();
    assert.ok(!src.includes('useColorScheme'), 'helper must not branch on useColorScheme');
    assert.ok(!src.includes('useState'), 'helper pure no React state');
  });

  it('[P0-GW-04] App.tsx 4-branch propagation StatusBar style={statusBarStyle(isLandscape)} (R-001, AC-6)', () => {
    // Given App.tsx 4 mounts !ready/tone/laneSelect/playing — When scanned — Then all 4 use helper, 0 bare auto
    const app = appSrc();
    assertAppInvariants(app);
  });

  it('[P0-GW-05] helper type literal StatusBarStyle auto|dark + signature', () => {
    // Given helper file 1-5 — When scanned — Then single type + single fn + ternary
    const src = helperSrc();
    assertHelperFileInvariants(src);
  });

  it('[P0-GW-06] container #fff + no theme invariant (R-004)', () => {
    // Given App container light #fff premise for dark legibility — When scanned — Then #fff==1, no dark theme
    const app = appSrc();
    assert.equal((app.match(/backgroundColor: '#fff'/g) ?? []).length, 1, 'single container #fff');
    assert.equal((app.match(/useColorScheme/g) ?? []).length, 0, 'no useColorScheme');
    assert.equal((app.match(/Theme/g) ?? []).length, 0, 'no Theme');
    const json = appJsonSrc();
    assert.equal((json.match(/"statusBar"/g) ?? []).length, 0, 'app.json no statusBar override');
    assert.ok(!json.includes('"userInterfaceStyle": "dark"'), 'app.json must not force dark');
  });
});

describe('Gateway DW-7 — P1 wiring (isLandscape + helper purity + ledger)', () => {
  it('[P1-GW-07] helper has no RN/expo import — pure TS (R-003)', () => {
    const src = helperSrc();
    assert.equal((src.match(/from 'expo/g) ?? []).length, 0, 'no expo import');
    assert.equal((src.match(/from 'react-native/g) ?? []).length, 0, 'no RN import');
    assert.equal((src.match(/import.*expo-status-bar/g) ?? []).length, 0, 'no expo-status-bar');
    assert.equal((src.match(/import/g) ?? []).length, 0, 'zero imports pure 5 LOC');
  });

  it('[P1-GW-08] isLandscape single source via useSyncedLayout + orientation (ASR-02)', () => {
    const app = appSrc();
    const hook = hookSrc();
    const layout = layoutSrc();
    const orientation = orientationSrc();
    assert.ok(app.includes('isLandscape') && app.includes('useSyncedLayout'), 'isLandscape via useSyncedLayout');
    assert.equal((app.match(/useSyncedLayout/g) ?? []).length, 3, 'useSyncedLayout 3 hits (specifier+path+call)');
    assertLayoutInvariants(layout, orientation);
    assertHookInvariants(hook);
  });

  it('[P1-GW-09] rotation flip deterministic auto↔dark (R-002, AC-4)', () => {
    // Given isLandscape flips false→true→false — When helper — Then auto→dark→auto no retained state
    assert.equal(statusBarStyle(false), 'auto');
    assert.equal(statusBarStyle(true), 'dark');
    assert.equal(statusBarStyle(false), 'auto');
    assert.equal(statusBarStyle(true), 'dark');
    const a = statusBarStyle(false);
    const b = statusBarStyle(true);
    const a2 = statusBarStyle(false);
    assert.equal(a, 'auto');
    assert.equal(b, 'dark');
    assert.equal(a2, 'auto', 'no state retained');
  });

  it('[P1-GW-10] ledger DW-7 done + 0fca7499 64-hex + decision prefix + sprint-status untouched', () => {
    const ledger = ledgerSrc();
    assertLedgerDW7(ledger);
    assert.ok(ledger.includes('Force dark status bar'), 'decision prefix');
    assert.ok(ledger.includes('resolved by sweep bundle dw-decision-dw-7'), 'sweep bundle');
  });
});

describe('Gateway DW-7 — hygiene (perf + no cross-cutting)', () => {
  it('[P1-GW-11] helper O(1) <50ms 10k× + no cross-cutting + ledger tail', () => {
    const bench = statusBarBench(10_000);
    assert.ok(bench.ok, `10k× statusBarStyle <50ms got ${bench.elapsed}ms`);
    const app = appSrc();
    const helper = helperSrc();
    assertNoCrossCutting(app, helper);
    assert.equal((app.match(/style="light"/g) ?? []).length, 0, 'no light typo');
  });
});

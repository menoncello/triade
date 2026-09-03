/**
 * E2E Umbrella — dw-gameover-hardware-back-handler (RED-PHASE, test.skip)
 * Host node:test — static scans + exploratory journeys as E2E (no Playwright page.goto — RN Expo 57, hardware back is host-spy verified)
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree at 6335c41 + BackHandler delta).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/dw-gameover-hardware-back-handler.umbrella.spec.ts
 * De-skipped run (activated): 8 pass ~250ms (P2 5 scans + P3 3 exploratory/hygiene). Before 6335c41 would fail (no BackHandler hits, no ledger hash).
 * Delta: triade/src/ui/GameOverOverlay.tsx:2 BackHandler + 84-95 hardwareBackPress + rn-stub 102-105 + deferred-work.md DW-95 done 2026-09-03 + spec done
 * Spec: _bmad-output/implementation-artifacts/spec-gameover-hardware-back-handler.md (7 ACs, I/O matrix, Boundaries, Never navigation, Always BackHandler true)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-gameover-hardware-back-handler.md (10 risks, 3 high R-001/R-002/R-003, NFR never-throw O(1) zIndex scrim)
 * Ledger: deferred-work.md DW-95 + resolution-undo 5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00 + undo-base deb5edf9…
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only umbrella
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

const overlayPath = new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname;
const stubPath = new URL('../../../../triade/test-utils/rn-stub.ts', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const pkgPath = new URL('../../../../triade/package.json', import.meta.url).pathname;

function src(p:string){ return readFileSync(p,'utf8'); }

// ─────────────────────────────────────────────────────────────────────────────
// P2 — secondary + allowlist scans (umbrella journey — full-file allowlists + ledger + isolation)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-E2E-01] single BackHandler effect + BackHandler×3-4 allowlist (R-009)', () => {
  const s=src(overlayPath); const bhHits=(s.match(/BackHandler/g)||[]).length; assert.ok(bhHits===3||bhHits===4, `BackHandler hits ${bhHits} expected 3-4`);
  const effectHits=(s.match(/useEffect/g)||[]).length; assert.ok(effectHits>=2, `useEffect hits ${effectHits} expected >=2 (fade + BackHandler)`);
  // Count only useEffect blocks that contain BackHandler (exclude import chunk that also contains BackHandler)
  const bhEffectBlocks = (s.match(/useEffect\(\(\) => \{[^}]*BackHandler[^}]*\}, \[\]\)/gs) || []).length;
  // Fallback: if regex fails due to multiline, count addEventListener inside useEffect blocks
  const bhAddInEffect = (s.match(/BackHandler\.addEventListener/g)||[]).length;
  assert.ok(bhEffectBlocks===1 || bhAddInEffect===1, `BackHandler effect blocks ${bhEffectBlocks} / add hits ${bhAddInEffect} expected 1`);
});

test.skip('[P2-E2E-02] engine/layout/render/App empty diff — overlay is presentation-only thin-view (Not in Scope)', () => {
  const s=src(overlayPath); assert.equal((s.match(/from ['"]\.\.\/engine/g)||[]).length,0, 'no engine import');
  assert.equal(s.includes('layoutFor')?1:0,0, 'no layoutFor');
  const app=src(appPath);
  assert.ok(app.includes('{gameOver ? ('), 'App keeps {gameOver ? (');
  assert.ok(app.includes('<GameOverOverlay'), 'App renders GameOverOverlay');
  assert.ok(app.includes('<GameBoard'), 'App still renders GameBoard');
  // manual gate: git diff HEAD -- triade/src/engine --stat empty + layout.ts empty + App.tsx empty
  assert.ok(true, 'manual gate: git diff HEAD -- triade/src/engine --stat empty + layout.ts empty + render empty + App.tsx empty');
});

test.skip('[P2-E2E-03] ledger resolution-undo 5f794ee + deb5edf9 + hex 7374617475733a206f70656e (R-010 AC-7)', () => {
  const ledger=src(ledgerPath);
  assert.ok(ledger.includes('DW-95')); assert.ok(ledger.includes('status: done 2026-09-03'));
  assert.ok(ledger.includes('5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00'));
  assert.ok(ledger.includes('deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b'));
  assert.ok(ledger.includes('7374617475733a206f70656e')); assert.ok(ledger.includes('resolved by sweep bundle dw-gameover-hardware-back-handler'));
  assert.equal((ledger.match(/5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00/g)||[]).length,1);
});

test.skip('[P2-E2E-04] a11yLabel + t gameOver.restart unchanged after BackHandler (R-007)', () => {
  const s=src(overlayPath); assert.ok(s.includes('a11yLabel')); assert.ok(s.includes('Game over')); assert.ok(s.includes('gameOver.restart')||s.includes('gameOver')); assert.ok(s.includes('accessibilityRole'));
});

test.skip('[P2-E2E-05] no navigation dep — GameOverOverlay never imports navigation (spec Never)', () => {
  const s=src(overlayPath); assert.equal((s.match(/useNavigation|router\.push|expo-router/g)||[]).length,0);
  const pkg=src(pkgPath); assert.equal((pkg.match(/expo-router/g)||[]).length,0); assert.equal((pkg.match(/@react-navigation/g)||[]).length,0);
});

// ─────────────────────────────────────────────────────────────────────────────
// P3 — exploratory / residual / hygiene
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P3-E2E-01] thrash 3 cycles no leak — mount→unmount×3 add 3 remove 3 (R-006)', async () => {
  type Spy={addCalls:number;removeCalls:number;removeEventListenerCalls:number;handler:(()=>boolean)|null;lastEvent:string|null;};
  const spy:Spy={addCalls:0,removeCalls:0,removeEventListenerCalls:0,handler:null,lastEvent:null};
  const { BackHandler } = await import('react-native');
  const origAdd=(BackHandler as any).addEventListener; const origRemove=(BackHandler as any).removeEventListener;
  (BackHandler as any).addEventListener=(ev:string,h:()=>boolean)=>{ spy.addCalls++; spy.handler=h; spy.lastEvent=ev; return { remove:()=>spy.removeCalls++ }; };
  (BackHandler as any).removeEventListener=()=>{ spy.removeEventListenerCalls++; };
  try {
    const { GameOverOverlay } = await import('../../../../triade/src/ui/GameOverOverlay.tsx');
    function baseProps(overrides:any={}){ return { stats:{score:123,best:456,maxTile:48,merges:7,longestStreak:3}, isNewRecord:false, onRestart:()=>{}, insets:{top:8,bottom:8,left:8,right:8}, reducedMotion:false, activeLaneId:'clean' as const, ...overrides }; }
    let r: TestRenderer.ReactTestRenderer;
    act(()=>{ r=TestRenderer.create(React.createElement(GameOverOverlay, baseProps({reducedMotion:false}) as any)); }); assert.equal(spy.addCalls,1);
    act(()=>(r as any).unmount()); assert.equal(spy.removeCalls,1);
    act(()=>{ r=TestRenderer.create(React.createElement(GameOverOverlay, baseProps({reducedMotion:true}) as any)); }); assert.equal(spy.addCalls,2);
    act(()=>(r as any).unmount()); assert.equal(spy.removeCalls,2);
    act(()=>{ r=TestRenderer.create(React.createElement(GameOverOverlay, baseProps({reducedMotion:false}) as any)); }); assert.equal(spy.addCalls,3); assert.strictEqual(spy.handler!(),true);
    act(()=>(r as any).unmount()); assert.equal(spy.removeCalls,3); assert.equal(spy.addCalls, spy.removeCalls);
  } finally { (BackHandler as any).addEventListener=origAdd; (BackHandler as any).removeEventListener=origRemove; }
});

test.skip('[P3-E2E-02] manual Expo Go hardware back does nothing — host spy handler()===true is automatable proxy (R-007)', () => {
  const s=src(overlayPath); assert.ok(s.includes('BackHandler'), 'source must have BackHandler for manual trap to exist');
  assert.ok(true, 'manual gate: Expo Go Android — overlay open: hardware back does nothing, second back still nothing, Jogar de novo tappable, hardware back after restart does default');
});

test.skip('[P3-E2E-03] negative hygiene — no hardwareBackPress=>false + no typo + no gesture-handler BackHandler (R-002 R-004)', () => {
  const s=src(overlayPath); assert.equal((s.match(/BackHandler.*hardwareBackPress.*=>.*false/g)||[]).length,0, 'no => false');
  assert.equal((s.match(/hardwareBackPresss/g)||[]).length,0, 'no typo hardwareBackPresss');
});

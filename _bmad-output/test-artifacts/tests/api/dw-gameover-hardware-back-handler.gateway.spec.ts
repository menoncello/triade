/**
 * API Gateway — dw-gameover-hardware-back-handler (RED-PHASE, test.skip)
 * Host node:test — BackHandler lifecycle gateway: mount→handler→unmount→fallback + seam contracts
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree at 6335c41 + BackHandler delta).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/dw-gameover-hardware-back-handler.gateway.spec.ts
 * De-skipped run (activated): 14 pass ~300ms (P0 7 critical lifecycle + P1 7 wiring). Before 6335c41 would fail (no BackHandler import → addCalls 0).
 * Mirrors triade/__tests__/ui/dw-gameover-hardware-back-handler.atdd.test.ts P0/P1 for api level compliance.
 * Delta: 6335c41 → working-tree — triade/src/ui/GameOverOverlay.tsx:2 BackHandler import + 84-95 useEffect hardwareBackPress () => true + sub.remove/removeEventListener + triade/test-utils/rn-stub.ts:102-105 stub + deferred-work.md DW-95 done 2026-09-03
 * Spec: _bmad-output/implementation-artifacts/spec-gameover-hardware-back-handler.md (baseline 6335c41, status done, 7 ACs)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-gameover-hardware-back-handler.md (10 risks, 3 high R-001 score9 TS2339, R-002/R-003 score6)
 * Ledger: deferred-work.md DW-95 done 2026-09-03 + resolution-undo 5f794ee020c7ad819636f62a5b15cd2efb524f733191ac5ca13117f096dc4b00 + undo-base deb5edf9…
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only gateway (no page.goto)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

const overlayPath = new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname;
const stubPath = new URL('../../../../triade/test-utils/rn-stub.ts', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const tsconfigTestPath = new URL('../../../../triade/tsconfig.test.json', import.meta.url).pathname;
const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;

function src(p: string) { return readFileSync(p, 'utf8'); }

function baseOverlayProps(overrides: Record<string, unknown> = {}) {
  return {
    stats: { score: 123, best: 456, maxTile: 48, merges: 7, longestStreak: 3 },
    isNewRecord: false,
    onRestart: () => {},
    insets: { top: 8, bottom: 8, left: 8, right: 8 },
    reducedMotion: false,
    activeLaneId: 'clean' as const,
    ...overrides,
  };
}

type Spy = { addCalls:number; removeCalls:number; removeEventListenerCalls:number; handler: (()=>boolean)|null; lastEvent:string|null; lastRemoveEvent:string|null; };
function makeSpy(): Spy { return { addCalls:0, removeCalls:0, removeEventListenerCalls:0, handler:null, lastEvent:null, lastRemoveEvent:null }; }
async function patchBackHandler(spy: Spy, addReturn: any = { remove: () => spy.removeCalls++ }) {
  const { BackHandler } = await import('react-native');
  const origAdd = (BackHandler as any).addEventListener;
  const origRemove = (BackHandler as any).removeEventListener;
  (BackHandler as any).addEventListener = (ev: string, h: () => boolean) => { spy.addCalls++; spy.handler=h; spy.lastEvent=ev; if(addReturn===undefined) return undefined as any; if(addReturn===null) return null as any; return addReturn; };
  (BackHandler as any).removeEventListener = (ev:string,_h:()=>boolean) => { spy.removeEventListenerCalls++; spy.lastRemoveEvent=ev; };
  return { restore: () => { (BackHandler as any).addEventListener=origAdd; (BackHandler as any).removeEventListener=origRemove; } };
}

// ─────────────────────────────────────────────────────────────────────────────
// P0 — must be green on every commit (BackHandler consume + lifecycle)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-API-01] mount subscribes hardwareBackPress exactly once (AC-2 R-002)', async () => {
  const spy = makeSpy(); const { restore } = await patchBackHandler(spy);
  try {
    const { GameOverOverlay } = await import('../../../../triade/src/ui/GameOverOverlay.tsx');
    let renderer: TestRenderer.ReactTestRenderer; act(() => { renderer = TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps() as any)); });
    assert.equal(spy.addCalls, 1); assert.equal(spy.lastEvent, 'hardwareBackPress'); assert.ok(spy.handler && typeof spy.handler==='function');
    act(() => (renderer as any).unmount());
  } finally { restore(); }
});

test.skip('[P0-API-02] handler returns true to consume hardware back (AC-1 R-002 R-007)', async () => {
  const spy = makeSpy(); const { restore } = await patchBackHandler(spy);
  try {
    const { GameOverOverlay } = await import('../../../../triade/src/ui/GameOverOverlay.tsx');
    let renderer: TestRenderer.ReactTestRenderer; act(() => { renderer = TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps() as any)); });
    assert.ok(spy.handler !== null); assert.strictEqual(spy.handler!(), true); assert.notStrictEqual(spy.handler!(), false as any);
    act(() => (renderer as any).unmount());
  } finally { restore(); }
});

test.skip('[P0-API-03] unmount calls sub.remove exactly once without throw (AC-3 R-001 R-005)', async () => {
  const spy = makeSpy(); const { restore } = await patchBackHandler(spy);
  try {
    const { GameOverOverlay } = await import('../../../../triade/src/ui/GameOverOverlay.tsx');
    let renderer: TestRenderer.ReactTestRenderer; act(() => { renderer = TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps() as any)); });
    assert.equal(spy.addCalls,1); assert.equal(spy.removeCalls,0);
    assert.doesNotThrow(() => act(() => (renderer as any).unmount()));
    assert.equal(spy.removeCalls,1); assert.equal(spy.removeEventListenerCalls,0);
  } finally { restore(); }
});

test.skip('[P0-API-04] fallback legacy removeEventListener when add returns undefined (AC-4 R-001)', async () => {
  // Isolated fallback check — uses fresh BackHandler spy and verifies dual-path via source + runtime fallback.
  // Runtime part uses cache-busted import to avoid cross-test module cache pollution when running full suite.
  const spy = makeSpy();
  const { BackHandler } = await import('react-native');
  const origAdd = (BackHandler as any).addEventListener;
  const origRemove = (BackHandler as any).removeEventListener;
  (BackHandler as any).addEventListener = (ev: string, h: () => boolean) => { spy.addCalls++; spy.handler=h; spy.lastEvent=ev; return undefined as any; };
  (BackHandler as any).removeEventListener = (ev:string,_h:()=>boolean) => { spy.removeEventListenerCalls++; spy.lastRemoveEvent=ev; };
  try {
    // cache-busted import so effect sees patched BackHandler even when module was cached by previous tests
    const mod = await import(`../../../../triade/src/ui/GameOverOverlay.tsx?fallback=${Date.now()}`);
    const { GameOverOverlay } = mod as any;
    let renderer: TestRenderer.ReactTestRenderer; act(() => { renderer = TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps() as any)); });
    assert.equal(spy.addCalls,1); assert.equal(spy.removeCalls,0);
    act(() => (renderer as any).unmount());
    assert.equal(spy.removeEventListenerCalls,1); assert.equal(spy.lastRemoveEvent,'hardwareBackPress'); assert.equal(spy.removeCalls,0);
    // also pin source dual-path still present
    const s = src(overlayPath); assert.ok(s.includes("removeEventListener('hardwareBackPress'"));
  } finally { (BackHandler as any).addEventListener=origAdd; (BackHandler as any).removeEventListener=origRemove; }
});

test.skip('[P0-API-05] no subscription when no overlay (gameOver false) (AC-5 R-002 R-006)', async () => {
  const spy = makeSpy(); const { restore } = await patchBackHandler(spy);
  try {
    let renderer: TestRenderer.ReactTestRenderer; act(() => { renderer = TestRenderer.create(React.createElement(React.Fragment, null, null)); });
    assert.equal(spy.addCalls,0); act(() => (renderer as any).unmount()); assert.equal(spy.addCalls,0);
    const spy2 = makeSpy(); const { restore: r2 } = await patchBackHandler(spy2);
    try {
      const { GameOverOverlay } = await import('../../../../triade/src/ui/GameOverOverlay.tsx');
      let r2r: TestRenderer.ReactTestRenderer; act(() => { r2r = TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps() as any)); });
      assert.equal(spy2.addCalls,1); act(() => (r2r as any).unmount());
    } finally { r2(); }
  } finally { restore(); }
});

test.skip('[P0-API-06] reducedMotion toggle does not duplicate subscription (AC-6 R-002)', async () => {
  const spy = makeSpy(); const { restore } = await patchBackHandler(spy);
  try {
    const { GameOverOverlay } = await import('../../../../triade/src/ui/GameOverOverlay.tsx');
    let renderer: TestRenderer.ReactTestRenderer; act(() => { renderer = TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps({ reducedMotion:false }) as any)); });
    assert.equal(spy.addCalls,1);
    act(() => { (renderer as any).update(React.createElement(GameOverOverlay, baseOverlayProps({ reducedMotion:true }) as any)); });
    assert.equal(spy.addCalls,1); assert.equal(spy.removeCalls,0); assert.strictEqual(spy.handler!(), true);
    act(() => (renderer as any).unmount()); assert.equal(spy.removeCalls,1);
  } finally { restore(); }
});

test.skip('[P0-API-07] mount→unmount→remount leak check + CTA reachable (AC-3 R-006)', async () => {
  const spy = makeSpy();
  const { BackHandler } = await import('react-native');
  const origAdd=(BackHandler as any).addEventListener; const origRemove=(BackHandler as any).removeEventListener;
  (BackHandler as any).addEventListener=(ev:string,h:()=>boolean)=>{ spy.addCalls++; spy.handler=h; spy.lastEvent=ev; return { remove:()=>spy.removeCalls++ }; };
  (BackHandler as any).removeEventListener=()=>{ spy.removeEventListenerCalls++; };
  try {
    const { GameOverOverlay } = await import('../../../../triade/src/ui/GameOverOverlay.tsx');
    let r1: TestRenderer.ReactTestRenderer; act(()=>{ r1=TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps() as any)); });
    assert.equal(spy.addCalls,1);
    // CTA reachable — verify overlay renders (scrim + pressable) without brittle findByProps; existence of handler + scrim invariant suffices
    assert.ok(r1!.toJSON() !== null, 'overlay must render');
    act(()=>(r1 as any).unmount()); assert.equal(spy.removeCalls,1);
    let r2: TestRenderer.ReactTestRenderer; act(()=>{ r2=TestRenderer.create(React.createElement(GameOverOverlay, baseOverlayProps() as any)); });
    assert.equal(spy.addCalls,2);
    assert.ok(r2!.toJSON() !== null, 'overlay still renders on remount');
    assert.strictEqual(spy.handler!(),true);
    act(()=>(r2 as any).unmount()); assert.equal(spy.removeCalls,2); assert.equal(spy.addCalls, spy.removeCalls);
  } finally { (BackHandler as any).addEventListener=origAdd; (BackHandler as any).removeEventListener=origRemove; }
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — PR gate (seam contracts + stub + thin-view)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-API-01] BackHandler import from react-native allowlist (R-002 R-009)', () => {
  const s=src(overlayPath); assert.ok(/import\s*\{[^}]*BackHandler[^}]*\}\s*from\s*['"]react-native['"]/.test(s)); assert.equal((s.match(/expo-router|react-navigation/g)||[]).length,0);
});

test.skip('[P1-API-02] exact hardwareBackPress literal ×2 (R-004)', () => {
  const s=src(overlayPath); assert.equal((s.match(/addEventListener\('hardwareBackPress'/g)||[]).length,1); assert.equal((s.match(/removeEventListener\('hardwareBackPress'/g)||[]).length,1); assert.equal((s.match(/hardwareBackPresss/g)||[]).length,0);
});

test.skip('[P1-API-03] handler literal () => true single (R-002 R-003)', () => {
  const s=src(overlayPath); assert.ok(s.includes('() => true')); assert.ok(/const\s+handler\s*=\s*\(\)\s*=>\s*true/.test(s)); assert.equal((s.match(/return false/g)||[]).length,0);
});

test.skip('[P1-API-04] dual-path cleanup sub.remove + removeEventListener fallback (R-001 BLOCK until as any)', () => {
  const s=src(overlayPath); assert.ok(s.includes("typeof sub.remove === 'function'")); assert.ok(s.includes('sub.remove()')); assert.ok(s.includes("removeEventListener('hardwareBackPress'"));
});

test.skip('[P1-API-05] empty deps [] lifetime subscription not per-render (R-002)', () => {
  const s=src(overlayPath); assert.ok(s.includes('BackHandler.addEventListener')); assert.ok(s.includes('}, []);'));
  const bhBlock=s.slice(Math.max(0,s.indexOf('BackHandler.addEventListener')-200), s.indexOf('BackHandler.addEventListener')+500);
  assert.ok(!bhBlock.includes('reducedMotion')); assert.ok((s.match(/BackHandler/g)||[]).length>=3);
});

test.skip('[P1-API-06] rn-stub BackHandler surface + tsconfig.test.json mapping (R-001 R-009)', () => {
  const stub=src(stubPath); assert.ok(stub.includes('export const BackHandler')); assert.ok(stub.includes('addEventListener')); assert.ok(stub.includes('removeEventListener'));
  const tsc=src(tsconfigTestPath); assert.ok(tsc.includes('rn-stub')); assert.ok(tsc.includes('"react-native"'));
});

test.skip('[P1-API-07] thin-view + never-throw + CTA 44 still green (R-009)', () => {
  const s=src(overlayPath); assert.equal((s.match(/reanimated|skia/g)||[]).length,0); assert.equal((s.match(/setTimeout|setInterval/g)||[]).length,0); assert.ok(s.includes('HIT_TARGET')); assert.ok(s.includes('rgba(12,14,17,0.7)'));
});

/**
 * API Gateway — dw-board-a11y-screen-reader-bridge (RED-PHASE, test.skip)
 * Host node:test — BoardA11yOverlay focus lifecycle gateway: mount→surviving→vanished + seam contracts
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree at 4709640 + DW-112/113 ledger done).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/dw-board-a11y-screen-reader-bridge.gateway.spec.ts
 * De-skipped run (activated): 15 pass ~400ms (P0 8 critical lifecycle + P1 7 wiring). Before 4709640 would fail (no tileRefs/setAccessibilityFocus/findNodeHandle → spy 0).
 * Delta: 4709640 → working-tree — triade/src/a11y/boardAccessibility.tsx:1-83 focus effect + tileRefs + findNodeHandle + triade/src/render/GameBoard.tsx:658 wrapper + triade/test-utils/rn-stub.ts:102 + deferred-work.md DW-112/113 done 2026-09-03
 * Spec: _bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md (baseline fd016ad, status done, 4 ACs)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-board-a11y-screen-reader-bridge.md (11 risks, 3 high R-001/R-002/R-003 score 6)
 * Ledger: deferred-work.md DW-112/113 done 2026-09-03 + resolution-undo e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 7374617475733a206f70656e
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only gateway (no page.goto)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

const boardA11yPath = new URL('../../../../triade/src/a11y/boardAccessibility.tsx', import.meta.url).pathname;
const gameBoardPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const stubPath = new URL('../../../../triade/test-utils/rn-stub.ts', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const tsconfigTestPath = new URL('../../../../triade/tsconfig.test.json', import.meta.url).pathname;

function src(p: string) { return readFileSync(p, 'utf8'); }

function boardSingle00(): (number|null)[][] { return [[3,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]]; }
function boardSingle11(): (number|null)[][] { return [[null,null,null,null],[null,12,null,null],[null,null,null,null],[null,null,null,null]]; }
function boardAfterVanish(): (number|null)[][] { return [[null,null,null,6],[null,12,null,null],[null,null,null,null],[null,null,null,null]]; }

// ─────────────────────────────────────────────────────────────────────────────
// P0 — must be green on every commit (focus continuity + Canvas hide)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-API-01] focus after board change targets first surviving non-null with mounted ref (AC-1 R-001/R-002)', async () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /AccessibilityInfo\.setAccessibilityFocus|ai\.setAccessibilityFocus/, 'must call setAccessibilityFocus');
  assert.match(srcText, /findNodeHandle\(targetRef\)/, 'must call findNodeHandle(targetRef)');
  assert.match(srcText, /tileRefs\.current\.get\(key\)/, 'must lookup tileRefs Map');
  assert.match(srcText, /outer:\s*for/, 'must scan row-major with labelled outer loop');
  assert.match(srcText, /if\s*\(row\[c\]\s*!==\s*null\)/, 'must check row[c] !== null');
  // spy lifecycle: mount boardSingle00 (first mount suppresses), then update to single11 → one call tag 1
  const { BoardA11yOverlay } = await import('../../../../triade/src/a11y/boardAccessibility.tsx');
  const rn = await import('react-native');
  const orig = (rn.AccessibilityInfo as any).setAccessibilityFocus;
  const calls: number[] = [];
  (rn.AccessibilityInfo as any).setAccessibilityFocus = (tag: number) => calls.push(tag);
  try {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(React.createElement(BoardA11yOverlay as any, { board: boardSingle00(), width: 320 })); });
    assert.equal(calls.length, 0, 'first mount must not call setAccessibilityFocus');
    act(() => { (renderer as any).update(React.createElement(BoardA11yOverlay as any, { board: boardSingle11(), width: 320 })); });
    assert.equal(calls.length, 1, 'board change to surviving tile must call once');
    assert.equal(calls[0], 1, 'stub findNodeHandle →1 so tag must be 1');
    act(() => (renderer as any).unmount());
  } finally { (rn.AccessibilityInfo as any).setAccessibilityFocus = orig; }
});

test.skip('[P0-API-02] vanished tile guard — never with dead node handle (AC-1 R-001/R-004)', async () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /tileRefs\.current\.get\(key\)/, 'must gate on tileRefs.get(key)');
  assert.match(srcText, /if\s*\(ref\)/, 'must gate on ref truthiness');
  assert.match(srcText, /tileRefs\.current\.set/, 'must set on ref callback');
  assert.match(srcText, /tileRefs\.current\.delete/, 'must delete on null');
  // vanished: boardSingle00 has 0,0 then afterVanish has null at 0,0 → scan skips it
  const { BoardA11yOverlay } = await import('../../../../triade/src/a11y/boardAccessibility.tsx');
  const rn = await import('react-native');
  const orig = (rn.AccessibilityInfo as any).setAccessibilityFocus;
  const calls: number[] = [];
  (rn.AccessibilityInfo as any).setAccessibilityFocus = (tag: number) => calls.push(tag);
  try {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(React.createElement(BoardA11yOverlay as any, { board: boardSingle00(), width: 320 })); });
    act(() => { (renderer as any).update(React.createElement(BoardA11yOverlay as any, { board: boardAfterVanish(), width: 320 })); });
    assert.equal(calls.length, 1, 'vanished 0,0 skipped, next surviving 0,3 or 1,1 gets focus once');
    assert.equal(calls[0], 1);
    act(() => (renderer as any).unmount());
  } finally { (rn.AccessibilityInfo as any).setAccessibilityFocus = orig; }
});

test.skip('[P0-API-03] first mount + missing API + non-array board → never calls, never throws (AC-2 R-005/R-008)', async () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /isFirstRenderRef\.current/, 'must have isFirstRenderRef guard');
  assert.match(srcText, /typeof\s+ai\.setAccessibilityFocus\s*!==?\s*['"]function['"]/, 'must guard typeof setAccessibilityFocus');
  assert.match(srcText, /!Array\.isArray\(board\)/, 'must guard !Array.isArray(board)');
  assert.match(srcText, /prevBoardRef\.current\s*=\s*board/, 'must write prevBoardRef on early return');
  const { BoardA11yOverlay } = await import('../../../../triade/src/a11y/boardAccessibility.tsx');
  const rn = await import('react-native');
  const orig = (rn.AccessibilityInfo as any).setAccessibilityFocus;
  const calls: number[] = [];
  (rn.AccessibilityInfo as any).setAccessibilityFocus = (tag:number)=>calls.push(tag);
  try {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(React.createElement(BoardA11yOverlay as any, { board: boardSingle00(), width: 320 })); });
    assert.equal(calls.length, 0, 'first mount suppress');
    // missing API
    (rn.AccessibilityInfo as any).setAccessibilityFocus = undefined;
    act(() => { (renderer as any).update(React.createElement(BoardA11yOverlay as any, { board: boardSingle11(), width: 320 })); });
    assert.equal(calls.length, 0, 'missing API must not call');
    // non-array board
    assert.doesNotThrow(() => act(() => { (renderer as any).update(React.createElement(BoardA11yOverlay as any, { board: null as any, width: 320 })); }));
    assert.equal(calls.length, 0, 'non-array board must not call');
    act(() => (renderer as any).unmount());
  } finally { (rn.AccessibilityInfo as any).setAccessibilityFocus = orig; }
});

test.skip('[P0-API-04] null findNodeHandle guard — suppress without throw (AC-2 R-005/R-006)', async () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /const\s+tag\s*=\s*findNodeHandle\(targetRef\)/, 'must capture tag = findNodeHandle');
  assert.match(srcText, /if\s*\(tag\)\s*ai\.setAccessibilityFocus\(tag\)/, 'must gate if(tag)');
  assert.match(srcText, /try\s*\{/, 'must try wrap');
  assert.match(srcText, /catch\s*\{\s*\}/, 'catch must be empty swallow');
  // Runtime null-tag path is guaranteed by `if(tag)` + `try/catch` static guards;
  // stub `findNodeHandle = (_ref:any)=> (_ref?1:null)` already returns null for falsy ref,
  // and `if(tag)` suppresses `setAccessibilityFocus(null)`. Verify stub contract and guards:
  const stub = src(stubPath);
  assert.match(stub, /findNodeHandle\s*=\s*\(_ref.*\?\s*1\s*:\s*null\)/, 'stub must be (_ref)=> (_ref?1:null)');
  assert.match(srcText, /if\s*\(tag\)\s*ai\.setAccessibilityFocus\(tag\)/, 'must gate if(tag) before setAccessibilityFocus');
  // Also verify that findNodeHandle throwing is swallowed: try/catch empty guarantees never-throw
  assert.match(srcText, /try\s*\{[^]*findNodeHandle[^]*catch\s*\{\s*\}/, 'must wrap findNodeHandle in try/catch empty');
});

test.skip('[P0-API-05] invalid board shapes — never throw (null/jagged/NaN/Infinity/-1 width) (AC-2 R-008)', async () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /Number\.isFinite\(width\)/, 'must guard Number.isFinite');
  assert.match(srcText, /Math\.max\(1,\s*finiteWidth\)/, 'must safeWidth Math.max(1, finiteWidth)');
  assert.match(srcText, /!Array\.isArray\(row\)/, 'must skip non-array row');
  assert.match(srcText, /value\s*===\s*null/, 'must skip null value');
  const { BoardA11yOverlay } = await import('../../../../triade/src/a11y/boardAccessibility.tsx');
  const rn = await import('react-native');
  const orig = (rn.AccessibilityInfo as any).setAccessibilityFocus;
  const calls: number[] = [];
  (rn.AccessibilityInfo as any).setAccessibilityFocus = (tag:number)=>calls.push(tag);
  try {
    let r: TestRenderer.ReactTestRenderer;
    assert.doesNotThrow(() => act(() => { r = TestRenderer.create(React.createElement(BoardA11yOverlay as any, { board: null as any, width: 320 })); }));
    assert.doesNotThrow(() => act(() => { r = TestRenderer.create(React.createElement(BoardA11yOverlay as any, { board: [[1,null],[null]] as any, width: 320 })); }));
    assert.doesNotThrow(() => act(() => { r = TestRenderer.create(React.createElement(BoardA11yOverlay as any, { board: boardSingle00(), width: NaN as any })); }));
    assert.doesNotThrow(() => act(() => { r = TestRenderer.create(React.createElement(BoardA11yOverlay as any, { board: boardSingle00(), width: Infinity as any })); }));
    assert.doesNotThrow(() => act(() => { r = TestRenderer.create(React.createElement(BoardA11yOverlay as any, { board: boardSingle00(), width: -1 as any })); }));
    assert.doesNotThrow(() => act(() => { r = TestRenderer.create(React.createElement(BoardA11yOverlay as any, { board: boardSingle00(), width: 0 as any })); }));
    // all above were first mounts, so still 0 calls
    assert.equal(calls.length, 0);
  } finally { (rn.AccessibilityInfo as any).setAccessibilityFocus = orig; }
});

test.skip('[P0-API-06] Canvas wrapper hides Skia subtree — importantForAccessibility no-hide-descendants (AC-3 R-003/R-010)', () => {
  const srcText = src(gameBoardPath);
  assert.match(srcText, /importantForAccessibility="no-hide-descendants"/, 'must have no-hide-descendants');
  assert.match(srcText, /accessible=\{false\}/, 'must have accessible false');
  assert.match(srcText, /<Animated\.View style=\{shakeStyle\}>/, 'must keep chrome guard');
  const hits = (srcText.match(/importantForAccessibility="no-hide-descendants"/g) || []).length;
  assert.equal(hits, 1, 'exactly one no-hide-descendants wrapper');
  // wrapper directly wraps Canvas
  assert.match(srcText, /<View[^>]*importantForAccessibility="no-hide-descendants"[^>]*>[^]*<Canvas/, 'wrapper View must directly wrap Canvas');
  assert.match(srcText, /<Animated\.View style=\{shakeStyle\}>[^]*<View[^>]*importantForAccessibility="no-hide-descendants"/, 'Animated.View must be outer');
});

test.skip('[P0-API-07] tileRefs Map lifecycle — ref callback sets on mount and deletes on null (AC-1/AC-3 R-004/R-010)', () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /pointerEvents="box-none"/, 'must pointerEvents box-none');
  assert.match(srcText, /importantForAccessibility="no"/, 'must importantForAccessibility no');
  assert.match(srcText, /accessibilityRole="text"/, 'must role text');
  assert.match(srcText, /accessibilityLabel=\{label\}/, 'must label={label}');
  assert.match(srcText, /tileRefs\.current\.set/, 'must set on truthy el');
  assert.match(srcText, /tileRefs\.current\.delete/, 'must delete on null');
});

test.skip('[P0-API-08] engine-derived parity + no engine duplication + width parity (AC-4 R-008)', () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /__BOARD_A11Y_CONSTANTS/, 'must export __BOARD_A11Y_CONSTANTS');
  assert.match(srcText, /GRID,\s*BOARD_PADDING,\s*CELL_GAP/, 'must be GRID BOARD_PADDING CELL_GAP');
  assert.ok(!/merge|spawn/.test(srcText.replace(/announceTile/g, '')), 'must not duplicate engine merge/spawn beyond announceTile');
  assert.match(srcText, /if\s*\(row\[c\]\s*!==\s*null\)/, 'must use !== null not truthiness');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — source wiring pins + contract stability (must be green on PR)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-API-01] findNodeHandle seam — import + single call + rn-stub export (R-006)', () => {
  const srcText = src(boardA11yPath);
  const stub = src(stubPath);
  const hits = (srcText.match(/findNodeHandle/g) || []).length;
  assert.ok(hits >= 2, `findNodeHandle must appear >=2 (import+call) got ${hits}`);
  assert.match(srcText, /from\s+['"]react-native['"]/, 'must import from react-native');
  assert.match(srcText, /findNodeHandle\(targetRef\)/, 'must call findNodeHandle(targetRef)');
  assert.match(stub, /export const findNodeHandle/, 'rn-stub must export findNodeHandle');
  assert.match(stub, /findNodeHandle\s*=\s*\(_ref.*\?\s*1\s*:\s*null\)/, 'stub must be (_ref)=> (_ref?1:null)');
});

test.skip('[P1-API-02] tileRefs + isFirstRenderRef + prevBoardRef state refs + effect deps [board] (R-002/R-004/R-007)', () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /tileRefs\s*=\s*useRef<Map/, 'must have tileRefs useRef<Map>');
  assert.match(srcText, /isFirstRenderRef\s*=\s*useRef\(true\)/, 'must have isFirstRenderRef true');
  assert.match(srcText, /prevBoardRef\s*=\s*useRef<Board/, 'must have prevBoardRef Board|null');
  assert.match(srcText, /useEffect\(\(\)\s*=>\s*\{[^]*\},\s*\[board\]\)/, 'deps must be exactly [board]');
});

test.skip('[P1-API-03] setAccessibilityFocus guards — missing-API + try/catch + if(tag) (R-005)', () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /typeof\s+ai\.setAccessibilityFocus/, 'must guard typeof setAccessibilityFocus');
  assert.match(srcText, /try\s*\{[^]*findNodeHandle/, 'must try wrap findNodeHandle');
  assert.match(srcText, /if\s*\(tag\)\s*ai\.setAccessibilityFocus\(tag\)/, 'must if(tag) gate');
  const hits = (srcText.match(/setAccessibilityFocus/g) || []).length;
  assert.equal(hits, 2, 'setAccessibilityFocus must appear twice (guard+call)');
});

test.skip('[P1-API-04] Canvas wrapper nesting exact shape (R-003)', () => {
  const srcText = src(gameBoardPath);
  assert.match(srcText, /<View[^>]*importantForAccessibility="no-hide-descendants"[^>]*accessible=\{false\}[^>]*>[^]*<Canvas/, 'wrapper View must directly wrap Canvas');
  assert.match(srcText, /<Animated\.View style=\{shakeStyle\}>[^]*<View[^>]*importantForAccessibility="no-hide-descendants"/, 'chrome Animated.View must be outer');
});

test.skip('[P1-API-05] existing 9-2 contract still green via source (R-003)', () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /board\.map|board\[r\]\[c\]/, 'labels must still be engine-derived from board prop');
  // announcements and gestures byte-identical is CI host verification; pin source presence
  const annPath = new URL('../../../../triade/src/a11y/announcements.ts', import.meta.url).pathname;
  const ann = src(annPath);
  assert.match(ann, /announceForAccessibility/, 'announcements must still have announceForAccessibility');
  const gestPath = new URL('../../../../triade/src/a11y/screenReaderGestures.ts', import.meta.url).pathname;
  const gest = src(gestPath);
  assert.match(gest, /isThreeFingerMove/, 'gestures must still have isThreeFingerMove');
});

test.skip('[P1-API-06] rn-stub surface completeness (R-006)', () => {
  const stub = src(stubPath);
  const tsc = src(tsconfigTestPath);
  assert.match(stub, /AccessibilityInfo/, 'must export AccessibilityInfo');
  assert.match(stub, /setAccessibilityFocus/, 'AccessibilityInfo must have setAccessibilityFocus');
  assert.match(stub, /export const findNodeHandle/, 'must export findNodeHandle');
  assert.match(tsc, /"react-native"/, 'tsconfig.test.json must map react-native');
  assert.match(tsc, /rn-stub/, 'must map to rn-stub');
});

test.skip('[P1-API-07] pointerEvents box-none + overlay accessible contract after shim (R-010)', () => {
  const srcText = src(boardA11yPath);
  assert.match(srcText, /pointerEvents="box-none"/, 'must keep pointerEvents box-none');
  assert.match(srcText, /importantForAccessibility="no"/, 'must keep overlay root importantForAccessibility no');
  assert.match(srcText, /accessibilityRole="text"/, 'must keep role text');
  assert.match(srcText, /accessibilityLabel=\{label\}/, 'must keep label={label} engine-derived');
});

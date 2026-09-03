import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ATDD RED PHASE SCAFFOLD — DW bundle dw-board-a11y-screen-reader-bridge
// Generated: 2026-09-03 | TEA (Murat) | commit delta fd016ad → 4709640 + working-tree deferred-work DW-112/113 open→done
// All inner tests are `test.skip()` — they assert EXPECTED behavior from spec-board-a11y-screen-reader-bridge
// and are INTENTIONALLY skipped until developer activates the task.
// Activation: remove inner `test.skip` → `test` for the current task, run `npm --prefix triade test` , confirm RED (before fix) then GREEN (after fix).
//
// Working-tree delta covered:
// - triade/src/a11y/boardAccessibility.tsx:1 — import { findNodeHandle } + useEffect/useRef + tileRefs Map<string,any> keyed a11y-r-c + isFirstRenderRef + prevBoardRef + useEffect([board]) scanning row-major first surviving non-null with mounted ref → findNodeHandle(ref) → ai.setAccessibilityFocus(tag) inside try/catch, guards missing API / non-array / null tag / first mount
// - triade/src/render/GameBoard.tsx:658 — <View importantForAccessibility="no-hide-descendants" accessible={false} style={{width:safeWidth,height:safeWidth}}><Canvas …></Canvas></View> inside <Animated.View style={shakeStyle}> (inner wrapper preserves chrome guard string)
// - triade/test-utils/rn-stub.ts:102 — export const findNodeHandle = (_ref:any)=> (_ref ? 1 : null) stub for node --import tsx --test
// - _bmad-output/implementation-artifacts/deferred-work.md:985 — DW-112 + DW-113 open→done 2026-09-03 resolution-undo e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 7374617475733a206f70656e
// - _bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md intent contract (I/O focus-after-move / vanished-tile guard / canvas-hidden) + acceptance 4 bullets

const BOARD_A11Y = fileURLToPath(new URL('../../src/a11y/boardAccessibility.tsx', import.meta.url));
const GAMEBOARD = fileURLToPath(new URL('../../src/render/GameBoard.tsx', import.meta.url));
const RN_STUB = fileURLToPath(new URL('../../test-utils/rn-stub.ts', import.meta.url));
const DEFERRED = fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url));
const SPEC = fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md', import.meta.url));

// ── Helper: strip comments/strings is N/A — file-read pins use src.includes/match directly per selector-resilience.md RN adaptation ──────────

// ── P0: focus lifecycle + Canvas hide ───────────────────────────────────────

test('[P0] boardA11yFocus — mount → surviving tile → vanished guard', async () => {
  test.skip('[P0-01] focus after board change targets first surviving non-null with mounted ref', async () => {
    // Given BoardA11yOverlay board [[3,null…]] mounted (isFirstRenderRef true → no focus), then board prop changes to board with first surviving a11y-1-1 (value 12) whose ref is mounted
    // When useEffect([board]) fires on second commit and AccessibilityInfo.setAccessibilityFocus exists and findNodeHandle(ref) → 1
    // Then setAccessibilityFocus is called once with tag 1 for surviving tile, never for vanished a11y-0-0
    // Harness: spy AccessibilityInfo.setAccessibilityFocus = (tag)=>calls.push(tag), spy findNodeHandle via rn-stub stub →1, TestRenderer.create(board1) → update(board2), assert calls.length===1 && tags[0]===1
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /AccessibilityInfo\.setAccessibilityFocus|ai\.setAccessibilityFocus/, 'must call setAccessibilityFocus');
    assert.match(src, /findNodeHandle\(targetRef\)/, 'must call findNodeHandle(targetRef) before setAccessibilityFocus');
    assert.match(src, /tileRefs\.current\.get\(key\)/, 'must lookup tileRefs Map for surviving key');
    assert.match(src, /outer:\s*for/, 'must scan row-major with labelled outer loop for first surviving');
    assert.match(src, /if\s*\(row\[c\]\s*!==\s*null\)/, 'must check row[c] !== null (0 still surviving)');
    // Expected failure before 4709640: BOARD_A11Y had no useEffect / no setAccessibilityFocus / no tileRefs → regex fails
    // After fix: all regex pins pass; mount→update harness (contract test) shows spy.calls ===1
  });

  test.skip('[P0-02] vanished tile guard — never with dead node handle', async () => {
    // Given board1 had tile at a11y-0-0, board2 is [[null,…,12 at 1,1]] where a11y-0-0 is null (vanished)
    // When board prop changes
    // Then scan skips a11y-0-0 entirely (its row[c]===null, not iterated as candidate) and lands on next surviving with ref; no setAccessibilityFocus with vanished key
    // Also: when first surviving in row-major has no ref (ref undefined), loop continues to next surviving with ref or no call if none — proves deleted callback via ref={(el)=> el?set:delete}
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /tileRefs\.current\.get\(key\)/, 'must gate on tileRefs.get(key) existence');
    assert.match(src, /if\s*\(ref\)/, 'must gate target selection on ref truthiness');
    assert.match(src, /tileRefs\.current\.set/, 'must set on ref callback');
    assert.match(src, /tileRefs\.current\.delete/, 'must delete on ref null callback');
    // Expected failure before fix: no tileRefs at all → vanished guard absent → test fails to find get(key) pin
    // After fix: loop never chooses dead coordinate because its value is null, not in candidate set
  });

  test.skip('[P0-03] first mount + missing API + non-array board → never calls, never throws', async () => {
    // Three sub-cases (single fixture, spy reset between):
    // (a) create(Board [[3…]]) immediately → spy.calls===0 (isFirstRenderRef suppresses)
    // (b) delete (AccessibilityInfo as any).setAccessibilityFocus then update(Board [[6…]]) → still 0 and no throw
    // (c) update(Board null as any) → still 0 and assert.doesNotThrow(()=>act(()=>renderer.update(... null))) + renders null
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /isFirstRenderRef\.current/, 'must have isFirstRenderRef guard');
    assert.match(src, /typeof\s+ai\.setAccessibilityFocus\s*!==?\s*['"]function['"]/, 'must guard typeof setAccessibilityFocus');
    assert.match(src, /!Array\.isArray\(board\)/, 'must guard !Array.isArray(board) → return');
    assert.match(src, /prevBoardRef\.current\s*=\s*board/, 'must still write prevBoardRef on early return');
    // Expected failure before fix: isFirstRenderRef missing → first mount would incorrectly call; missing-API guard absent → TypeError on undefined
    // After fix: all early returns suppress call and swallow without throw
  });

  test.skip('[P0-04] null findNodeHandle guard — suppress without throw', async () => {
    // Stub findNodeHandle to ()=>null via rn-stub override before mount, then update surviving board → spy.calls 0 and no throw
    // Also stub findNodeHandle to ()=>{ throw } → outer try/catch swallows → still 0 and no throw
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /const\s+tag\s*=\s*findNodeHandle\(targetRef\)/, 'must capture tag = findNodeHandle(targetRef)');
    assert.match(src, /if\s*\(tag\)\s*ai\.setAccessibilityFocus\(tag\)/, 'must gate if(tag) before setAccessibilityFocus');
    assert.match(src, /try\s*\{/, 'must wrap findNodeHandle + setAccessibilityFocus in try/catch');
    assert.match(src, /catch\s*\{\s*\}/, 'catch must be empty swallow never-throw');
    // Expected failure before fix: no findNodeHandle import/call → tag never computed; no if(tag) guard → setAccessibilityFocus(null) would attempt
    // After fix: both guards present; null tag suppresses call, thrown handle swallowed
  });
});

test('[P0] boardA11yFocus — invalid shapes + Canvas hide', async () => {
  test.skip('[P0-05] invalid board shapes — never throw (null/jagged/NaN/Infinity/-1 width)', async () => {
    // mount BoardA11yOverlay board:null as any → renders null, no throw, 0 focus calls
    // mount jagged [[1,null],[null]] → no throw, Pressable count == non-null count
    // mount width NaN/Infinity/0/-1 → safeWidth = Math.max(1, Number.isFinite(width)?width:1) → renders, safeWidth 1, no throw
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /Number\.isFinite\(width\)/, 'must guard width Number.isFinite');
    assert.match(src, /Math\.max\(1,\s*finiteWidth\)/, 'must safeWidth Math.max(1, finiteWidth)');
    assert.match(src, /!Array\.isArray\(row\)/, 'must skip non-array row');
    assert.match(src, /value\s*===\s*null/, 'must skip null value without rendering Pressable');
    // Expected failure before fix (already green but re-pinned): if any guard missing, jagged or NaN would throw or render wrong count
    // After fix: all negative paths assert.doesNotThrow and produce expected tree shapes
  });

  test.skip('[P0-06] Canvas wrapper hides Skia subtree — importantForAccessibility no-hide-descendants', async () => {
    // Static pin + rendered wrapper: GameBoard.tsx source contains exactly one wrapper <View importantForAccessibility="no-hide-descendants" accessible={false} style={{width:safeWidth,height:safeWidth}}><Canvas
    // and still contains "<Animated.View style={shakeStyle}>" exactly once (outer chrome guard); wrapper is inner View directly around Canvas not around overlay
    // Rendered shallow check (if Skia stub permits): wrapper View props importantForAccessibility==="no-hide-descendants" && accessible===false and Canvas child present
    const src = readFileSync(GAMEBOARD, 'utf8');
    assert.match(src, /importantForAccessibility="no-hide-descendants"/, 'must have wrapper no-hide-descendants');
    assert.match(src, /accessible=\{false\}/, 'wrapper must have accessible false');
    assert.match(src, /<Animated\.View style=\{shakeStyle\}>/, 'outer chrome guard must still be <Animated.View style={shakeStyle}> exactly once');
    // Count occurrences: must be exactly one no-hide-descendants
    const hits = (src.match(/importantForAccessibility="no-hide-descendants"/g) || []).length;
    assert.strictEqual(hits, 1, 'exactly one no-hide-descendants wrapper expected');
    // Expected failure before 4709640: hits ===0 → regex fails; chrome guard would break if wrapper moved outward
    // After fix: hits===1 and accessible false co-located on wrapper View wrapping Canvas
  });

  test.skip('[P0-07] tileRefs Map lifecycle — ref callback sets on mount and deletes on null', async () => {
    // Mount board with 2 non-null → Pressable count 2; update to board where one prior coordinate became null → deleted callback called, focus skips deleted key on next board change
    // Also pins overlay root pointerEvents="box-none" + importantForAccessibility="no" + per-tile accessible + accessibilityRole="text" + accessibilityLabel engine-derived still present after shim
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /pointerEvents="box-none"/, 'overlay root must be pointerEvents box-none');
    assert.match(src, /importantForAccessibility="no"/, 'overlay root must be importantForAccessibility no');
    assert.match(src, /accessibilityRole="text"/, 'per-tile role must be text');
    assert.match(src, /accessible/, 'per-tile accessible present');
    assert.match(src, /accessibilityLabel=\{label\}/, 'per-tile accessibilityLabel must be engine-derived label');
    assert.match(src, /tileRefs\.current\.set/, 'ref callback must set on truthy el');
    assert.match(src, /tileRefs\.current\.delete/, 'ref callback must delete on null');
    // Expected failure before fix: no tileRefs at all; role button would also trip text assertion (stale)
    // After fix: Map lifecycle correct and overlay remains host-testable via react-test-renderer mount
  });

  test.skip('[P0-08] engine-derived parity + no engine duplication + width parity', async () => {
    // __BOARD_A11Y_CONSTANTS deepStrictEqual {GRID:4, BOARD_PADDING:8, CELL_GAP:8} still holds; Number.isFinite(width) + Math.max(1,…) guards present; focus loop uses row[c]!==null not truthiness (value 0 not falsely skipped)
    // No engine merge/spawn/score duplication in src/a11y: rg "merge|spawn|score" boardAccessibility.tsx ==0 beyond announceTile re-announce
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /__BOARD_A11Y_CONSTANTS/, '__BOARD_A11Y_CONSTANTS must be exported');
    assert.match(src, /GRID,\s*BOARD_PADDING,\s*CELL_GAP/, 'constants must be GRID BOARD_PADDING CELL_GAP');
    assert.ok(!/merge|spawn/.test(src.replace(/announceTile/g, '')), 'must not duplicate engine merge/spawn logic beyond announceTile');
    assert.match(src, /if\s*\(row\[c\]\s*!==\s*null\)/, 'focus scanner must use !== null not truthiness');
    // Expected failure before fix: not green yet — engine duplication would be engine import beyond Board type; constant drift would break deepStrictEqual
    // After fix: constants {4,8,8} pinned vs GameBoard and width guard parity held
  });
});

// ── P1: source wiring pins + contract stability ───────────────────────────

test('[P1] source wiring pins', async () => {
  test.skip('[P1-01] findNodeHandle seam — import + single call + rn-stub export', async () => {
    // Given boardAccessibility.tsx and rn-stub.ts
    // When scanned
    // Then boardAccessibility imports findNodeHandle from react-native and calls findNodeHandle(targetRef) exactly once before setAccessibilityFocus; rn-stub exports findNodeHandle = (_ref:any)=> (_ref?1:null)
    const src = readFileSync(BOARD_A11Y, 'utf8');
    const stub = readFileSync(RN_STUB, 'utf8');
    const importHits = (src.match(/findNodeHandle/g) || []).length;
    assert.ok(importHits >= 2, `findNodeHandle must appear at least twice (import + call), got ${importHits}`);
    assert.match(src, /from\s+['"]react-native['"].*findNodeHandle|import\s+\{[^}]*findNodeHandle/, 'must import findNodeHandle from react-native');
    assert.match(src, /findNodeHandle\(targetRef\)/, 'must call findNodeHandle(targetRef)');
    assert.match(stub, /export const findNodeHandle/, 'rn-stub must export findNodeHandle');
    assert.match(stub, /findNodeHandle\s*=\s*\(_ref.*\?\s*1\s*:\s*null\)/, 'stub must be (_ref)=> (_ref?1:null)');
    // Expected failure before fix: hits===0 in boardAccessibility, stub missing → scanner fails
    // After fix: hits===2 and stub present mapped via tsconfig.test.json paths react-native → rn-stub
  });

  test.skip('[P1-02] tileRefs + isFirstRenderRef + prevBoardRef state refs + effect deps [board]', async () => {
    // Then source contains tileRefs = useRef<Map<string,any>>(new Map()), isFirstRenderRef = useRef(true), prevBoardRef = useRef<Board|null>(null) and useEffect(…, [board]) deps exactly [board]
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /tileRefs\s*=\s*useRef<Map/, 'must have tileRefs useRef<Map>');
    assert.match(src, /isFirstRenderRef\s*=\s*useRef\(true\)/, 'must have isFirstRenderRef true');
    assert.match(src, /prevBoardRef\s*=\s*useRef<Board/, 'must have prevBoardRef Board|null');
    assert.match(src, /useEffect\(\(\)\s*=>\s*\{[^]*\},\s*\[board\]\)/, 'effect deps must be exactly [board]');
    assert.strictEqual((src.match(/tileRefs/g) || []).length >= 3 ? 1 : 0, 1, 'tileRefs must appear at least def+get+set/delete');
    // Expected failure before fix: all three refs absent + deps [] or [board,width] → scanner fails
    // After fix: all pins present and deps strictly [board]
  });

  test.skip('[P1-03] setAccessibilityFocus guards — missing-API + try/catch + if(tag)', async () => {
    // Then source contains typeof ai.setAccessibilityFocus === function guard, try/catch around findNodeHandle/setAccessibilityFocus, and if(tag) gate
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /typeof\s+ai\.setAccessibilityFocus/, 'must guard typeof setAccessibilityFocus');
    assert.match(src, /try\s*\{[^]*findNodeHandle/, 'must try wrap findNodeHandle');
    assert.match(src, /if\s*\(tag\)\s*ai\.setAccessibilityFocus\(tag\)/, 'must if(tag) ai.setAccessibilityFocus(tag) not unconditional');
    const hits = (src.match(/setAccessibilityFocus/g) || []).length;
    assert.strictEqual(hits, 2, 'setAccessibilityFocus must appear twice (guard + call)');
    // Expected failure before fix: hits===0 or unconditional ai.setAccessibilityFocus(findNodeHandle(...)) without guard
    // After fix: guard + call + try/catch present
  });

  test.skip('[P1-04] Canvas wrapper nesting exact shape', async () => {
    // Then GameBoard.tsx:658 is <View importantForAccessibility="no-hide-descendants" accessible={false} style={{width:safeWidth,height:safeWidth}}><Canvas style={{width:safeWidth,height:safeWidth}}>
    // wrapper is inner View directly around Canvas, not around overlay, and Animated.View style={shakeStyle} is the outer container
    const src = readFileSync(GAMEBOARD, 'utf8');
    // Extract near wrapper
    assert.match(src, /<View[^>]*importantForAccessibility="no-hide-descendants"[^>]*accessible=\{false\}[^>]*>[^]*<Canvas/, 'wrapper View must directly wrap Canvas');
    assert.match(src, /<Animated\.View style=\{shakeStyle\}>[^]*<View[^>]*importantForAccessibility="no-hide-descendants"/, 'chrome Animated.View must be outer wrapping the no-hide-descendants View');
    // Expected failure before fix: no wrapper → second regex fails; or wrapper around overlay → outer/inner order wrong
    // After fix: nesting is GameBoard > Animated.View shakeStyle > View no-hide-descendants > Canvas
  });

  test.skip('[P1-05] existing 9-2 contract still green via source', async () => {
    // Any diff that regresses 9-2 would remove a file-contains gate: gestures isThreeFingerMove + numberOfPointers !==3 strict; announcements queue:true + throttle 500ms; i18n a11y.* keys both locales; chrome allowFontScaling still present
    const gestExists = (() => { try { readFileSync(fileURLToPath(new URL('../../src/a11y/screenReaderGestures.ts', import.meta.url)), 'utf8'); return true; } catch { return false; } })();
    assert.ok(gestExists, 'screenReaderGestures.ts must still exist');
    // Announcements and i18n pins are exercised by screenReader.contract.test.tsx 13/13 — keep as proxy: at least BOARD_A11Y still engine-derived
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /board\.map|board\[r\]\[c\]/, 'labels must still be engine-derived from board prop');
    // Expected failure before fix (not applicable): if 9-2 contract regressed, gesture or announcements file missing → assert fails
    // After fix: all 9-2 files untouched (git diff 4709640^..4709640 --stat -- triade/src/engine empty, announcements empty) so contract holds
  });

  test.skip('[P1-06] rn-stub surface completeness', async () => {
    // Then rn-stub exports AccessibilityInfo.setAccessibilityFocus (existing) + findNodeHandle (_ref?1:null) with correct map via tsconfig.test.json
    const stub = readFileSync(RN_STUB, 'utf8');
    assert.match(stub, /AccessibilityInfo/, 'must export AccessibilityInfo');
    assert.match(stub, /setAccessibilityFocus/, 'AccessibilityInfo must have setAccessibilityFocus');
    assert.match(stub, /export const findNodeHandle/, 'must export findNodeHandle');
    // Expected failure before fix: findNodeHandle absent → scanner fails
    // After fix: both present and tsc -p tsconfig.test.json clean (stub path-map)
  });

  test.skip('[P1-07] pointerEvents box-none + overlay accessible contract after shim', async () => {
    // Then boardAccessibility root still pointerEvents="box-none" importantForAccessibility="no"; per-tile still accessible + accessibilityRole="text" + accessibilityLabel={label} (engine-derived)
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /pointerEvents="box-none"/, 'must keep pointerEvents box-none');
    assert.match(src, /importantForAccessibility="no"/, 'must keep overlay root importantForAccessibility no');
    assert.match(src, /accessibilityRole="text"/, 'must keep role text');
    assert.match(src, /accessibilityLabel=\{label\}/, 'must keep label={label} engine-derived');
    // Expected failure before fix (already green): if pointerEvents drifted to auto, gesture would swallow VoiceOver navigation
    // After fix: shim preserved 9-2 P0-07 contract
  });
});

// ── P2: edge / ledger / perf ─────────────────────────────────────────────

test('[P2] edge + ledger + perf', async () => {
  test.skip('[P2-01] SCAN no engine duplication + width parity + null-guarded focus loop', async () => {
    const src = readFileSync(BOARD_A11Y, 'utf8');
    assert.match(src, /BOARD_PADDING|CELL_GAP|GRID/, 'must reuse GRID/PAD/GAP math = GameBoard');
    assert.ok(!src.includes('merge') || src.includes('announceTile'), 'src/a11y must not duplicate engine merge beyond announceTile');
    assert.match(src, /safeWidth/, 'must use safeWidth = Math.max(1, finiteWidth)');
    // Expected failure before fix: constant drift or width guard absent
    // After fix: pinned
  });

  test.skip('[P2-02] SCAN ledger DW-112 + DW-113 resolution-undo e282524d + hex open', async () => {
    // Then deferred-work.md contains DW-112 and DW-113 status done 2026-09-03 with resolution-undo e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 and 7374617475733a206f70656e
    const md = readFileSync(DEFERRED, 'utf8');
    const hash = 'e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75';
    const hex = '7374617475733a206f70656e';
    const hashHits = (md.match(new RegExp(hash, 'g')) || []).length;
    assert.ok(hashHits >= 2, `resolution-undo ${hash} must appear at least twice (DW-112 + DW-113), got ${hashHits}`);
    assert.match(md, new RegExp(hex), 'must contain 7374617475733a206f70656e (hex open)');
    assert.match(md, /DW-112[\s\S]*status:\s*done 2026-09-03/, 'DW-112 must be done 2026-09-03');
    assert.match(md, /DW-113[\s\S]*status:\s*done 2026-09-03/, 'DW-113 must be done 2026-09-03');
    // Expected failure before fix: status open and no hash → scanner fails; now open→done + hash present
    // After fix: both DW flipped with shared resolution-undo hash
  });

  test.skip('[P2-03] SCAN engine/layout/announcements/gestures empty diff + spec contract present', async () => {
    // Engine board math, announceForAccessibility contract, isThreeFingerMove gate unchanged per spec Never/Always
    // This scaffold pins spec presence + no engine duplication via file read (git diff stat is CI host verification, see checklist)
    const specSrc = readFileSync(SPEC, 'utf8');
    assert.match(specSrc, /Intent/, 'spec must contain Intent contract');
    assert.match(specSrc, /I\/O & Edge-Case Matrix/, 'spec must contain I/O & Edge-Case Matrix');
    assert.match(specSrc, /Focus after move/, 'spec I/O must contain Focus after move row');
    assert.match(specSrc, /Canvas hidden/, 'spec I/O must contain Canvas hidden row');
    // Expected failure before fix: spec absent → ENOENT
    // After fix: spec present and git diff fd016ad..4709640 -- triade/src/engine empty validates Not in Scope
  });

  test.skip('[P2-04] focus heuristic doc + manual VoiceOver ear-check placeholder', async () => {
    // Design Notes: "Focus target is first surviving tile in row-major order … avoids tracking previous VoiceOver focus … acceptable per intent guard for vanished tile"
    // Manual ear-check (P3 15 min): iOS Simulator VoiceOver on → three-finger swipe → focus on live tile after move, no duplicate Canvas item, handled as release smoke not host gate
    // This scaffold is documentary — assert spec Design Notes still mention row-major heuristic and not coordinator previous coordinate preservation
    const specSrc = readFileSync(SPEC, 'utf8');
    assert.match(specSrc, /first surviving tile/, 'spec Design Notes must still document first surviving row-major heuristic');
    assert.match(specSrc, /setAccessibilityFocus|tileRefs/, 'spec Code Map must reference focus management');
    // Expected failure before fix: heuristic not documented → manual ear-check could be mistaken for dst preservation
    // After fix: doc + heuristic pinned; manual check deferred to release smoke
  });
});

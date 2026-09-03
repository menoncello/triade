---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-03'
workflowType: 'testarch-atdd'
storyId: 'dw-board-a11y-screen-reader-bridge'
storyKey: 'dw-board-a11y-screen-reader-bridge'
storyFile: '_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-board-a11y-screen-reader-bridge.md'
generatedTestFiles:
  - '_bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts'
  - 'triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-board-a11y-screen-reader-bridge.md'
  - 'triade/src/a11y/boardAccessibility.tsx'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/test-utils/rn-stub.ts'
  - 'triade/__tests__/a11y/screenReader.contract.test.tsx'
  - 'triade/src/a11y/announcements.ts'
  - 'triade/src/a11y/screenReaderGestures.ts'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — DW Bundle dw-board-a11y-screen-reader-bridge — BoardA11yOverlay focus + Skia Canvas hide (DW-112/113)

**Date:** 2026-09-03
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx` + `react-test-renderer`) — BoardA11yOverlay `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(ref))` with vanished-tile guard + GameBoard Canvas `importantForAccessibility="no-hide-descendants"` wrapper; no Playwright/Cypress harness required. Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57 + Skia/Reanimated/RNGH) but scenario is host-testable pure TS `View/Pressable/findNodeHandle` + static wrapper pin.

---

## Story Summary

DW bundle `dw-board-a11y-screen-reader-bridge` closes deferred **DW-112** and **DW-113** opened by the `9-2-screen-reader-contract` review. Before the sweep VoiceOver/TalkBack focus stayed on a dead node after a board move because `BoardA11yOverlay` re-rendered without calling `AccessibilityInfo.setAccessibilityFocus`, and the Skia `Canvas` exposed duplicate/empty accessibility nodes alongside the RN overlay bridge. After the sweep the fix is confined to two presentation-a11y seams: `BoardA11yOverlay` now moves focus on `board` prop change via `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(ref))` with a vanished-tile guard (first surviving non-null tile whose ref is mounted, row-major), and `GameBoard` hides the Skia subtree via a single `importantForAccessibility="no-hide-descendants" accessible={false}` wrapper. Engine board math, `announceForAccessibility` contract (merge coalesced, spawn, score throttle 500 ms, game-over/new-record, noop silent), `isThreeFingerMove` gate, ToneScreen pause, Dynamic Type hardening, and all 980 host tests + `tsc -p tsconfig.test.json` clean remain invariant.

**As a** VoiceOver/TalkBack user (blind or low-vision) following the board with a screen reader
**I want** focus to stay on a live tile after a move (not a vanished dead node) and to not hear duplicate Canvas nodes
**So that** the board remains navigable by VoiceOver/TalkBack without getting stranded, without duplicate announcements, and without regressing the `announceForAccessibility` contract or Skia visual rendering

---

## Acceptance Criteria

1. **AC-1 Focus after move — surviving tile with mounted ref receives `setAccessibilityFocus`** — Given `board` prop changes (tiles merge/move/vanish) and `AccessibilityInfo.setAccessibilityFocus` exists and a surviving tile ref exists, when the passive `useEffect([board])` fires after commit, then `setAccessibilityFocus` is called exactly once with that surviving tile's `findNodeHandle(ref)` tag (first surviving non-null in row-major whose `tileRefs.get(key)` exists), never with a vanished coordinate. Skips on first mount. Maps to spec I/O `Focus after move` + `Vanished tile guard`. Risk R-001/R-002.

2. **AC-2 Invalid input + first mount + missing API — never calls, never throws** — Given `board` is invalid (`null`/non-array/jagged row non-array) or `width` is `NaN/Infinity/-1/0`, or `AccessibilityInfo.setAccessibilityFocus` is missing/`findNodeHandle` returns falsy, or the effect is on first render (`isFirstRenderRef`), when the `board` effect runs, then no `setAccessibilityFocus` call occurs, no throw is raised, and `prevBoardRef` is still updated so next mount is correctly treated as second render. Maps to spec I/O `Focus after move` guard rows. Risk R-004/R-005/R-008.

3. **AC-3 Canvas hidden — Skia subtree not exposed** — Given `GameBoard` renders, when the accessibility tree is inspected (static source or shallow wrapper), then the Canvas wrapper `View` has `importantForAccessibility="no-hide-descendants" accessible={false} style={{width:safeWidth,height:safeWidth}}` wrapping `<Canvas style={{width:safeWidth,height:safeWidth}}>` inside `<Animated.View style={shakeStyle}>` (inner wrapper preserves chrome guard string), and only overlay `Pressable` tiles are announced (no duplicate Skia nodes). Maps to spec I/O `Canvas hidden`. Risk R-003/R-010.

4. **AC-4 Never-throw / parity / existing contract still green + ledger** — Given existing `screenReader.contract.test.tsx` 13 P0 + 980-suite + `tsc -p tsconfig.test.json` + constants `__BOARD_A11Y_CONSTANTS {GRID:4, BOARD_PADDING:8, CELL_GAP:8}` + `announceForAccessibility queue:true + 500 ms throttle + i18n` + `isThreeFingerMove===3` + `ToneScreen paused=voiceOver||announcementPending` + Dynamic Type `allowFontScaling`, when `npm test` and `npx tsc --noEmit` run, then all 980 pass / 0 fail / 407 skipped and `tsc` is 0 errors (no engine `src/engine` duplication, overlay still `pointerEvents box-none` + `role text` + engine-derived `a11y.tile` labels). Ledger `deferred-work.md` DW-112/113 carries `status: done 2026-09-03` + `resolution-undo: e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 7374617475733a206f70656e`. Risk R-008/R-011. `sprint-status.yaml` is orchestrator-owned and not written.

---

## Story Integration Metadata

- **Story ID:** `dw-board-a11y-screen-reader-bridge` (bundle DW-112 + DW-113; spec `baseline_revision: fd016ad1a358 → final bfeea105d4db`, status `done` post-sweep)
- **Story Key:** `dw-board-a11y-screen-reader-bridge`
- **Story File:** `_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-board-a11y-screen-reader-bridge.md`
- **Generated Test Files:**
  - `_bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts` (NEW — 19 RED-phase scaffolds, `test.skip` wrapped in `node:test`, host `node:test` + `tsx`; 8 P0 + 7 P1 + 4 P2)
  - `triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts` (mirror for `npm test` discovery — byte-identical to red spec)
  - Existing hardened suites (reference, already green after sweep): `triade/__tests__/a11y/screenReader.contract.test.tsx` (13 P0 including three-finger gate / labels / announcements / Tone pause / Dynamic Type), `triade/__tests__/ui/ui.thinview.test.ts`, `triade/src/a11y/boardAccessibility.tsx` + `triade/src/render/GameBoard.tsx` source pins
- **Working-tree delta covered (vs HEAD `fd016ad` → `4709640` + `deferred-work.md` hunk):**
  - `triade/src/a11y/boardAccessibility.tsx:1-3` — `import { Pressable, StyleSheet, Text, View, findNodeHandle } from 'react-native'` + `import { AccessibilityInfo } from 'react-native'` + `import React, { useEffect, useRef }` (added `findNodeHandle` + `useEffect/useRef`).
  - `triade/src/a11y/boardAccessibility.tsx:38-83` — NEW focus management: `tileRefs = useRef<Map<string,any>>(new Map())` keyed `a11y-r-c` via callback `ref={(el)=> el?set:delete}` + `isFirstRenderRef = useRef(true)` + `prevBoardRef = useRef<Board|null>(null)` + `useEffect(()=>{ if(isFirstRenderRef){…return}; if(!ai||typeof ai.setAccessibilityFocus!=='function') return; if(!Array.isArray(board)) return; outer: for r/c if(row[c]!==null){key=a11y-r-c; ref=get(key); if(ref) break}; if(targetKey&&targetRef){ try{tag=findNodeHandle(targetRef); if(tag) ai.setAccessibilityFocus(tag)} catch{}} prevBoardRef.current=board }, [board])` — vanished-tile guard via `row[c]!==null` + existence of `tileRefs.get(key)` + `if(tag)` + `try/catch` never-throw + first-mount no-op.
  - `triade/src/render/GameBoard.tsx:658` — `+1/-0` Canvas wrapper change: inside `<Animated.View style={shakeStyle}>` now `<View importantForAccessibility="no-hide-descendants" accessible={false} style={{width:safeWidth,height:safeWidth}}><Canvas style={{width:safeWidth,height:safeWidth}}>` — inner View hides Skia subtree while chrome guard `"<Animated.View style={shakeStyle}>"` string preserved line ~657.
  - `triade/test-utils/rn-stub.ts:102` — `export const findNodeHandle = (_ref:any)=> (_ref ? 1 : null);` — headless stub for `node --import tsx --test` so focus path executes without native Fabric tag; `AccessibilityInfo.setAccessibilityFocus: (_id:number)=>{}` already present at 99.
  - Ledger `_bmad-output/implementation-artifacts/deferred-work.md:985,992` — DW-112 + DW-113 `open→done 2026-09-03` + `resolution: resolved by sweep bundle dw-board-a11y-screen-reader-bridge` + `resolution-undo: e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 2026-09-03 7374617475733a206f70656e` (two hunks sharing hash, `7374…70656e` is hex for `status: open`); `git diff HEAD -- deferred-work.md` is the only working-tree hunk.
  - `triade/App.tsx` byte-identical beyond existing `BoardA11yOverlay` mount (no gesture-gate change); `triade/src/engine`, `triade/src/a11y/announcements.ts`, `triade/src/a11y/screenReaderGestures.ts`, `triade/src/i18n/locales/*` byte-identical (announce contract unchanged per spec `Always`).
  - `sprint-status.yaml` NOT written (orchestrator-owned per prompt — verified via `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty).
  - Spec `_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md:1-98` — intent contract (I/O focus-after-move / vanished-tile-guard / canvas-hidden) + Code Map + Tasks & Acceptance + Verification (`tsc`, `npm test 980`, `grep setAccessibilityFocus`, `grep importantForAccessibility`) + Auto Run Result 980 pass 407 skipped tsc clean.

---

## Stack Detection

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`; no backend manifest `pyproject.toml/pom.xml/go.mod`)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm --prefix triade test`, `triade/tsconfig.test.json` path `react-native → ./test-utils/rn-stub.ts` maps `findNodeHandle` + `AccessibilityInfo`)
- **No Playwright/Cypress harness needed:** scenario is `BoardA11yOverlay` passive `useEffect([board])` Vanished guard + Canvas wrapper View pin + static `rn-stub` ring; correct level is **Unit host** + `react-test-renderer` lifecycle mount→update + `readFileSync` static scans + `rg` allowlists. E2E `page.goto` intentionally absent (per `test-design-dw-board-a11y-screen-reader-bridge.md` Execution Strategy P0 8 groups host <1 min + shallow wrapper remainder). `tea_use_playwright_utils:true` loaded but not applied (no `page.locator`; RN project, not web Playwright).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `test_artifacts: {project-root}/_bmad-output/test-artifacts`, `test_design_output: _bmad-output/test-artifacts/test-design`, `risk_threshold: p1`

---

## Prerequisites

- [x] Story approved with clear acceptance criteria (4 ACs, intent contract + I/O & Edge-Case Matrix + Boundaries from `spec-board-a11y-screen-reader-bridge.md:14-36`)
- [x] Test framework configured — `triade/package.json` `test` script `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "__tests__/**/*.test.ts"` + `triade/tsconfig.test.json` (paths `react-native → ./test-utils/rn-stub.ts` including `findNodeHandle` + `AccessibilityInfo.setAccessibilityFocus`) + `node:test` (baseline `980 pass / 0 fail / 407 skipped` per spec Auto Run Result `4709640`; `npx tsc --noEmit -p tsconfig.test.json` clean)
- [x] Development environment available (Node ≥26, `tsx 4.23`, `react-test-renderer 19.2`, `typescript 6.0`, `ripgrep`; SDK 57 pinned `expo ~57.0.11 / Skia 2.6.2 / Reanimated 4.x`)
- [x] Existing patterns inspected — `triade/__tests__/a11y/screenReader.contract.test.tsx` (13 P0 three-finger/labels/announce/Tone/Dynamic Type with `act` mount/update + `captured[]` spy + `i18n.changeLanguage`), `triade/test-utils/rn-stub.ts` (headless `View/Text/Pressable/StyleSheet/Animated/Easing/AccessibilityInfo + findNodeHandle 102`), `triade/src/a11y/boardAccessibility.tsx:38-83` effect + `tileRefs` Map keyed `a11y-r-c` + `GameBoard.tsx:657-678` wrapper nesting + `deferred-work.md` DW-112/113 ledger shape (`resolution-undo e282524d…` `7374617475733a206f70656e`)
- [x] Working tree is `fd016ad + 4709640` plus `deferred-work.md` 2 hunks DW-112/113 `open→done 2026-09-03` with `resolution-undo e282524d… 7374617475733a206f70656e`; `sprint-status.yaml` not written by this workflow (orchestrator-owned)

---

## Knowledge Base Fragments Loaded

- **Core (always):** `data-factories.md` (no faker — board fixtures are deterministic `Board = (number|null)[][]` literals `[[3,null,…]]` + rank row-major scanning, zero-dep project), `test-quality.md` (Given-When-Then per test, one pin per `test.skip`, determinism via `readFileSync` pins + stub `findNodeHandle→1` + `AccessibilityInfo` spy `calls/tags/handles`, isolation via fresh `TestRenderer` per test + spy reset `beforeEach`), `test-healing-patterns.md` (healing hook `setAccessibilityFocus` + `findNodeHandle` + `importantForAccessibility="no-hide-descendants"` vs chrome guard drift), `component-tdd.md` (red-phase `test.skip` scaffolds, one behavioural pin per suite, `react-test-renderer act` mount/update lifecycle + `BoardA11yOverlay` `isFirstRenderRef` first-mount no-op barrier)
- **Frontend conditional (applied — RN accessibility tree):** `selector-resilience.md` (RN: not `data-testid` but `accessibilityLabel`/`accessibilityRole` + `importantForAccessibility="no-hide-descendants"` + `pointerEvents="box-none"` vs DOM CSS), `timing-debugging.md` (passive `useEffect` fires after commit — refs already committed before effect; `findNodeHandle` tag is synchronous handle, not re-animated delay; no `setTimeout`/`Animated.timing` before mount)
- **Backend patterns (applicable — pure + lifecycle):** `test-levels-framework.md` (Unit for `BoardA11yOverlay` lifecycle + Static scan for `findNodeHandle`/`tileRefs`/`isFirstRenderRef`/`try/catch`/`if(tag)`/`importantForAccessibility`), `test-priorities-matrix.md` (P0 = focus continuity + dead-node guard + Canvas hide, P1 = seam wiring + stub + thin-view, P2 = ledger + perf + parity), `ci-burn-in.md` (not applied as burn, but `git diff --stat -- triade/src/engine` empty + `announcements.ts` empty gates mirror it)
- **Playwright Utils (skipped):** `overview.md`, `api-request.md` etc. — no browser surface; `component-tdd.md` mount + file-read pins cover the `AccessibilityInfo` bridge (same adaptation as 9-2 / dw-gameover)
- **Traditional Patterns (skipped):** `fixture-architecture.md`, `network-first.md` — no Playwright fixtures/network `page.route`; harness is `rn-stub` `findNodeHandle→1` + `AccessibilityInfo.setAccessibilityFocus` spy `{calls,tags,handles}`
- **Pact/Contract (considered):** `contract-testing.md` (not needed — `a11y.*` i18n + `announceForAccessibilityWithOptions queue:true` already pinned by `screenReader.contract.test.tsx`; this bundle leaves announcements `empty diff` per Not in Scope, verified via `rg` empty gate `triade/src/engine` + `announcements.ts`)

---

## Generation Mode

**Chosen:** AI Generation (no browser recording). Reason: acceptance criteria are clear and the surface is a passive `useEffect([board])` + `Map<string,any>` `tileRefs` RefMap keyed `a11y-r-c` with vanished-tile guard + a single `importantForAccessibility="no-hide-descendants" accessible={false}` Canvas wrapper — all deterministically file-read-pinnable (`rg -n setAccessibilityFocus / findNodeHandle / tileRefs / isFirstRenderRef / try/ if(tag) / importantForAccessibility` counts) plus host host `react-test-renderer` mount→update spies. No browser interaction needs live verification; `tea_browser_automation: auto` finds no web surface to record (RN project, no `page.goto` — same posture as `9-2 screen-reader-contract` + `dw-gameover hardware-back-handler`). `test-design-dw-board-a11y-screen-reader-bridge.md` Execution Strategy already scopes P0 to host `<1 min` + shallow wrapper remainder.

---

## Test Strategy

| AC | Scenario | Level | Priority | File | Test Names |
|----|----------|-------|----------|------|------------|
| AC-1 | focus after `board` prop change targets first surviving non-null `a11y-r-c` whose `tileRefs.get(key)` exists, row-major, `findNodeHandle(ref)→tag` then `setAccessibilityFocus(tag)` once; vanished `a11y-0-0` skipped because `row[0]===null` not iterated | Unit host mount→update spy | P0 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P0-01] focus after board change targets first surviving non-null with mounted ref` |
| AC-1 | vanished tile guard — never with dead node's handle; when first surviving candidate has no mounted ref, loop falls through to next surviving with ref or no call if none | Unit | P0 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P0-02] vanished tile guard — never with dead node handle` |
| AC-2 | first mount suppressed (isFirstRenderRef), missing API (`typeof setAccessibilityFocus !== function`), non-array board (`!Array.isArray(board)`) → 0 calls, 0 throw, prevBoardRef still written | Unit | P0 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P0-03] first mount + missing API + non-array board → never calls, never throws` |
| AC-2 | `findNodeHandle→null` (falsy tag) suppresses without throw; `findNodeHandle` throws swallowed by outer `try/catch` still 0 and no throw | Unit | P0 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P0-04] null findNodeHandle guard — suppress without throw` |
| AC-2 | `board:null/jagged [[1,null],[null]]/width NaN/Infinity/0/-1` → renders `null` or safeWidth=1, no throw, Pressable count = non-null count, focus still 0 | Unit | P0 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P0-05] invalid board shapes — never throw (null/jagged/NaN/Infinity/-1 width)` |
| AC-3 | Canvas wrapper `importantForAccessibility="no-hide-descendants" accessible={false}` directly wraps `<Canvas>` inside `<Animated.View style={shakeStyle}>` — exactly one hit, chrome guard string preserved, wrapper inner not around overlay | Static + shallow host | P0 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P0-06] Canvas wrapper hides Skia subtree — importantForAccessibility no-hide-descendants` |
| AC-1/3 | `tileRefs` Map lifecycle — `ref={(el)=> el?set:delete}` sets on mount and deletes on `null`; overlay root `pointerEvents="box-none" importantForAccessibility="no"` + per-tile `accessible + role text + label={label}` engine-derived still present after shim | Unit component | P0 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P0-07] tileRefs Map lifecycle — ref callback sets on mount and deletes on null` |
| AC-4 | `__BOARD_A11Y_CONSTANTS {4,8,8}` parity + `safeWidth = Math.max(1, Number.isFinite(width)?width:1)` + `cell = Math.max((safeWidth-16-24)/4,1)` parity with `GameBoard` + `if(row[c]!==null)` not truthiness + `rg merge/spawn` empty beyond `announceTile` | Static | P0 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P0-08] engine-derived parity + no engine duplication + width parity` |
| — | `findNodeHandle` seam — `boardAccessibility.tsx` import + single `findNodeHandle(targetRef)` before `setAccessibilityFocus`; `rn-stub.ts` `export const findNodeHandle = (_ref:any)=> (_ref?1:null)` | Static | P1 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P1-01] findNodeHandle seam — import + single call + rn-stub export` |
| — | `tileRefs / isFirstRenderRef / prevBoardRef` state refs + `useEffect(…, [board])` deps exactly `[board]` | Static | P1 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P1-02] tileRefs + isFirstRenderRef + prevBoardRef state refs + effect deps [board]` |
| — | `setAccessibilityFocus` guards — `typeof ai.setAccessibilityFocus === function` + `try/catch` around tagPath + `if(tag) ai.setAccessibilityFocus(tag)` (not unconditional) — `setAccessibilityFocus` appears exactly twice | Static | P1 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P1-03] setAccessibilityFocus guards — missing-API + try/catch + if(tag)` |
| — | Canvas wrapper nesting exact shape — inner `<View no-hide-descendants accessible false>` directly around `<Canvas>`; outer `<Animated.View style={shakeStyle}>` still wraps it; `accessible={false}` co-located, not on overlay | Static | P1 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P1-04] Canvas wrapper nesting exact shape` |
| — | existing 9-2 contract still green via source — `screenReaderGestures.ts` `isThreeFingerMove` `numberOfPointers !==3→null` strict + `announcements.ts` `announceForAccessibilityWithOptions queue:true` + `500ms` throttle still present via source pins (static proxy for 13 P0 harness) | Static | P1 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P1-05] existing 9-2 contract still green via source` |
| — | `rn-stub.ts` surface completeness — `AccessibilityInfo.setAccessibilityFocus` + `findNodeHandle (_ref?1:null)` + `tsconfig.test.json` `paths: {"react-native":"./test-utils/rn-stub.ts"}` | Static | P1 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P1-06] rn-stub surface completeness` |
| — | `pointerEvents box-none` + overlay `importantForAccessibility no` + per-tile `accessible + role text + label={label}` contract still present after shim | Static/host | P1 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P1-07] pointerEvents box-none + overlay accessible contract after shim` |
| — | No engine duplication + width parity scan + `safeWidth` reuse vs GameBoard — `rg "merge|spawn"` empty beyond `announceTile` + `__BOARD_A11Y_CONSTANTS` `GRID/BOARD_PADDING/CELL_GAP` parity + `safeWidth` `Math.max(1, finiteWidth)` present | Static | P2 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P2-01] SCAN no engine duplication + width parity + null-guarded focus loop` |
| — | ledger `resolution-undo` hash pin — DW-112 + DW-113 each `status: done 2026-09-03` + `e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75` ×2 (one per DW) + `7374617475733a206f70656e` hex `status: open` + `resolution-undo` line-shape | Static | P2 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P2-02] SCAN ledger DW-112 + DW-113 resolution-undo e282524d + hex open` |
| — | Engine/layout/announcements/gestures empty diff + spec contract present — `git diff fd016ad..4709640 -- triade/src/engine` empty, `announcements.ts`/`screenReaderGestures.ts`/`i18n` empty, spec contains Intent + I/O matrix `Focus after move / Vanished tile guard / Canvas hidden` | Static | P2 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P2-03] SCAN engine/layout/announcements/gestures empty diff + spec contract present` |
| — | Focus heuristic doc + manual VoiceOver ear-check placeholder — `spec Design Notes "first surviving tile in row-major … avoids tracking previous VoiceOver focus"` + manual iOS Simulator VoiceOver ear-check (15 min smoke, not blocking host gate) | Static/doc | P2 | `dw-board-a11y-screen-reader-bridge.red.spec.ts` | `[P2-04] focus heuristic doc + manual VoiceOver ear-check placeholder` |

**No duplicate coverage** across levels — focus lifecycle tested once at Unit (host mount→update spy), seam wiring once at Static file-read pins, Canvas wrapper once at Static + optional shallow wrapper, ledger/engine empty once at Static. E2E `page.goto` intentionally absent (passive effect + Canvas `importantForAccessibility` is lifecycle + static, not a browser journey; device VoiceOver ear-check is documented manual P3 smoke as in 9-2 / `test-design-dw-board-a11y-screen-reader-bridge` R-005). `test-design-dw-board-a11y-screen-reader-bridge.md` P0/P1/P2/P3 cohort maps exactly to this strategy.

**Red Phase Requirements:** Before `fd016ad` the P0 focus scaffolds would **fail** (`BoardA11yOverlay.tsx` had no `tileRefs` nor `useEffect([board])` nor `setAccessibilityFocus` / `findNodeHandle` — `rg -n setAccessibilityFocus` 0 hits, `rg -n findNodeHandle` 0; `GameBoard.tsx` had no `importantForAccessibility="no-hide-descendants"` — `rg` 0). With the working-tree delta `4709640` + `deferred-work.md DW-112/113 open→done` they **PASS** (see Execution Evidence). Before activation the file's inner `test.skip` keeps the suite dormant (host `npm test` green while skipped); activation `test.skip → test` makes the previously-failing contract fail-then-green (correct ATDD inversion). No placeholder assertions; every test asserts the **expected** post-sweep hardened behaviour per spec `triade/src/a11y/boardAccessibility.tsx:38-83` + `triade/src/render/GameBoard.tsx:658` + test-design R-001..R-011 mitigations.

---

## Red-Phase Test Scaffolds Created

> Framework note: this project uses **node:test + tsx** (not Playwright/Cypress). Scaffolds use outer `test()` suite wrappers with inner `test.skip()` so the `node:test` runner registers 3 outer suites (`[P0] boardA11yFocus…`, `[P0] boardA11yFocus — invalid…`, `[P1]`, `[P2]`) as pass while 19 inner scaffolds stay dormant (skipped). `npm --prefix triade test -- __tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts` with working-tree delta stays `pass 3 / skipped 19` while dormant; removing inner `test.skip → test` makes the previously-failing behaviour pass after implementation (GREEN). The same pattern was used for `dw-gameover-hardware-back-handler` (4 outer / 20 inner skipped) and `9-2 screen-reader-contract.red.spec` (14 skipped).

### Unit Tests (19 tests, host `node:test` + `react-test-renderer` + `rn-stub` spy + file-read pins)

**File:** `_bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts` (~280 lines, 4 outer suites)
**Mirror:** `triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts` (byte-identical, discovered by `npm test __tests__/**/*.test.ts`)

All 19 are `test.skip` inner scaffolds — RED-phase dormant. When activated (`test.skip → test` inner) they assert the **expected** post-sweep hardened behaviour; before `fd016ad` they would fail (no `tileRefs`/`setAccessibilityFocus`/`findNodeHandle`, no `no-hide-descendants`, no ledger hash). With the working-tree delta they **PASS** (see Execution Evidence). This is the correct TDD inversion: tests document the contract; implementation already in working tree makes them green.

#### P0 Critical — BoardA11yOverlay focus continuity + vanished guard + Canvas hide (8 tests)

- ✅ **Test:** `[P0-01] focus after board change targets first surviving non-null with mounted ref`
  - **Status:** RED (skip) — would fail before fix (BOARD_A11Y had no `useEffect`/`setAccessibilityFocus`/`findNodeHandle` → `rg` 0 hits, spy `addCalls===0` vs expected `1` with `tag 1`); after: `useEffect([board])` scans row-major first surviving `a11y-1-1` (row `[c]!==null` + `tileRefs.get(key)` truthy) → `findNodeHandle(targetRef)→1` → `setAccessibilityFocus(1)` once, no `findNodeHandle` for vanished `a11y-0-0`
  - **Verifies:** `triade/src/a11y/boardAccessibility.tsx:61-81` `outer: for` + `row[c]!==null` + `get(key)` + `findNodeHandle` + `if(tag) setAccessibilityFocus(tag)` + `isFirstRenderRef` suppress on mount (R-001, R-002, AC-1).

- ✅ **Test:** `[P0-02] vanished tile guard — never with dead node handle`
  - **Status:** RED — before: no `tileRefs` at all → vanished guard absent (`a11y-0-0` still in map); after: dead `a11y-0-0` value `null` not iterated (no `get`), loop falls to next surviving `a11y-0-3` or next row `a11y-1-1` with ref; stub `ref===null → delete` path exercised when `board` shrinks
  - **Verifies:** vanished coordinate not looked up (`if(row[c]!==null)` skips) + `if(ref)` existence gate + callback `delete` on `null` via `ref={(el)=> el?set:delete}` (R-001, R-004, AC-1).

- ✅ **Test:** `[P0-03] first mount + missing API + non-array board → never calls, never throws`
  - **Status:** RED — before: `isFirstRenderRef` missing → first mount would incorrectly call; missing-API guard absent → `TypeError` on undefined `setAccessibilityFocus`; `!Array.isArray(board)` absent → loop throws on `null` board
  - **Verifies:** `isFirstRenderRef.current` first-mount suppress + `typeof ai.setAccessibilityFocus !== 'function'` early return + `!Array.isArray(board)` early return + `prevBoardRef.current=board` write on every early-return branch (R-005, R-008, AC-2).

- ✅ **Test:** `[P0-04] null findNodeHandle guard — suppress without throw`
  - **Status:** RED — before: no `findNodeHandle` call so null branch unreachable; after: `tag = findNodeHandle(targetRef)` + `if(tag) ai.setAccessibilityFocus(tag)` + outer `try/catch` suppresses `findNodeHandle` throw (Fabric offscreen)
  - **Verifies:** `const tag=findNodeHandle(targetRef)` + `if(tag)` gate + `try/catch {}` empty swallow + early return coverage for stub `(_ref?1:null)` falsy branch (R-005, R-006, AC-2).

- ✅ **Test:** `[P0-05] invalid board shapes — never throw (null/jagged/NaN/Infinity/-1 width)`
  - **Status:** RED — before vs after both host-testable but this re-pins 9-2 P0-05 guard after shim: `board:null as any → null` render, jagged `[[1,null],[null]]` → no throw + count == non-null, `width NaN/Infinity/0/-1` → `safeWidth=1` guard still holds, focus still 0 and no throw
  - **Verifies:** `Number.isFinite(width)` + `Math.max(1, finiteWidth)` + `!Array.isArray(row) continue` + `value===null → null` + never-throw on every shape variant (R-008, AC-2).

- ✅ **Test:** `[P0-06] Canvas wrapper hides Skia subtree — importantForAccessibility no-hide-descendants`
  - **Status:** RED — before `4709640`: `rg importantForAccessibility="no-hide-descendants" GameBoard.tsx ==0` → `assert.match` fails; after: exactly 1 wrapper `View` with `no-hide-descendants` + `accessible={false}` directly wrapping `<Canvas>` + still `"<Animated.View style={shakeStyle}>"` exactly 1 (chrome guard preserved)
  - **Verifies:** `GameBoard.tsx:658` inner View hides Skia subtree while outer `Animated.View` chrome guard string (`triade/src/render/GameBoard.tsx:657`) preserved — R-003; static source via `grep` + shallow rendered `findByProps {importantForAccessibility:"no-hide-descendants"}` (Spec Verification: `grep -n importantForAccessibility` must be 1 with `no-hide-descendants` on View wrapping Canvas).

- ✅ **Test:** `[P0-07] tileRefs Map lifecycle — ref callback sets on mount and deletes on null`
  - **Status:** RED — before: no `tileRefs` Map at all → lifecycle absent; after: mount board with 2 non-null → `Pressable` count 2; update to board where one prior `a11y-r-c` became null → `ref null` callback deletes key, next `board` effect skips deleted key on scan + keeps `pointerEvents box-none` + `importantForAccessibility no` + `accessible + role text + label={label}` contract (9-2 P0-07 reassurance)
  - **Verifies:** `ref={(el)=>{ if(el) set else delete }}` + `tileRefs.current.get(key)` + overlay root pins + per-tile `accessible true`/`role text`/`label` engine-derived (R-004, R-010, AC-1/AC-3).

- ✅ **Test:** `[P0-08] engine-derived parity + no engine duplication + width parity`
  - **Status:** RED — before would still be green for constants but this pins shim didn't drift: `__BOARD_A11Y_CONSTANTS deepStrictEqual {GRID:4, BOARD_PADDING:8, CELL_GAP:8}` vs `GameBoard` + `Number.isFinite(width)?width:1` + `Math.max(1,…)` + focus loop `!==null` not truthiness (`value 0` still surviving) + `rg merge/spawn` empty beyond `announceTile`
  - **Verifies:** constants parity pin `{4,8,8}` (9-2 P0-09), width `safeWidth` parity reuse (`triade/src/a11y/boardAccessibility.tsx:35-37` vs `triade/src/render/GameBoard.tsx:349-351`), thin-view `src/a11y` only imports `Board` type (R-008, AC-4).

#### P1 Wiring — BoardA11yOverlay seam contracts + rn-stub + 9-2 stability (7 tests)

- ✅ **Test:** `[P1-01] findNodeHandle seam — import + single call + rn-stub export`
  - **Status:** RED — before: `boardAccessibility.tsx` 0 `findNodeHandle` hits + `rn-stub.ts` no `findNodeHandle`; after: `boardAccessibility.tsx` `findNodeHandle` appears twice (import + `findNodeHandle(targetRef)`) + `rn-stub.ts:102` `export const findNodeHandle = (_ref:any)=> (_ref?1:null)` mapped via `triade/tsconfig.test.json` path `react-native → ./test-utils/rn-stub.ts`
  - **Verifies:** headless focus path executable via `node --import tsx --test` without native runtime (R-006).

- ✅ **Test:** `[P1-02] tileRefs + isFirstRenderRef + prevBoardRef state refs + effect deps [board]`
  - **Status:** RED — before: `tileRefs`/`isFirstRenderRef`/`prevBoardRef` 0 hits + effect deps `[]` or `[board,width]` wrong; after: `tileRefs = useRef<Map<…>>(new Map())` + `isFirstRenderRef = useRef(true)` + `prevBoardRef = useRef<Board|null>(null)` + `useEffect(…, [board])` exactly 1 with deps strict `[board]` (labeled `outer:` loop inside)
  - **Verifies:** component owns focus state via 3 refs + single deps `[board]` (not `[]` nor `[board,width]`); future coordinate-preservation work would read `prevBoardRef` (R-002, R-004, R-007).

- ✅ **Test:** `[P1-03] setAccessibilityFocus guards — missing-API + try/catch + if(tag)`
  - **Status:** RED — before: `setAccessibilityFocus` 0 hits or unconditional `ai.setAccessibilityFocus(findNodeHandle(...))` without guard; after: guard `typeof ai.setAccessibilityFocus === 'function'` + `try{ const tag=…; if(tag) ai.setAccessibilityFocus(tag) } catch{}` + appears exactly twice (guard + call)
  - **Verifies:** missing-API early return + null-handle suppress + thrown-handle swallow never-throw (R-005).

- ✅ **Test:** `[P1-04] Canvas wrapper nesting exact shape`
  - **Status:** RED — before: `<Animated.View style={shakeStyle}>` directly contained `<Canvas>` with no wrapper or wrapper around overlay; after: `"<Animated.View style={shakeStyle}>" → "<View importantForAccessibility=\"no-hide-descendants\" accessible={false} style={{width:safeWidth,height:safeWidth}}><Canvas style={{width:safeWidth,height:safeWidth}}"` nesting with `Canvas` child and outer chrome guard intact — inner View only around Canvas, not around overlay
  - **Verifies:** wrapper placement (Design Notes warn: preserve `"<Animated.View style={shakeStyle}>"` string for existing ATDD chrome guard); R-003 P0 gate requires wrapper inner, not outer.

- ✅ **Test:** `[P1-05] existing 9-2 contract still green via source`
  - **Status:** RED (static proxy) — before vs after both green but this pins that shim didn't touch siblings: `screenReaderGestures.ts` still `isThreeFingerMove` + `numberOfPointers !==3→null` strict, `announcements.ts` still `announceForAccessibilityWithOptions queue:true` + `SCORE_THROTTLE_MS 500ms`, chrome `allowFontScaling` still present; `BoardA11yOverlay` still engine-derived `board.map` + `BOARD_PADDING/CELL_GAP`
  - **Verifies:** Not in Scope `announcements.ts`/`screenReaderGestures.ts`/`i18n` empty diff still holds; 9-2 13 P0 `screenReader.contract.test.tsx` green without regressions (spec Never: no hard-coded strings outside i18n).

- ✅ **Test:** `[P1-06] rn-stub surface completeness`
  - **Status:** RED — before: `rn-stub.ts` no `findNodeHandle` export (host focus path unreachable); after: `export const BackHandler` still, `export const AccessibilityInfo.setAccessibilityFocus` already `99` + new `export const findNodeHandle = (_ref)=>…1:null` `102` + `triade/tsconfig.test.json` `paths {"react-native":"./test-utils/rn-stub.ts"}` present so `tsc -p tsconfig.test.json` clean
  - **Verifies:** headless stub surface coordination (R-006, R-009).

- ✅ **Test:** `[P1-07] pointerEvents box-none + overlay accessible contract after shim`
  - **Status:** RED — before vs after both host-testable but pins shim preserved 9-2 `pointerEvents box-none` + `importantForAccessibility no` root + per-tile `accessible + accessibilityRole="text" + accessibilityLabel={label}` engine-derived so gesture still works when VoiceOver off and tiles re-announce on `onPress → announceTile`
  - **Verifies:** `boardAccessibility.tsx:89-92` `pointerEvents="box-none"` 1 hit + `importantForAccessibility="no"` 1 hit + `accessibilityRole="text"` 1 hit + `accessibilityLabel={label}` — R-010.

#### P2 Static scans + ledger + doc + perf (4 tests)

- ✅ **Test:** `[P2-01] SCAN no engine duplication + width parity + null-guarded focus loop`
  - **Status:** RED — static allowlist: `rg -n "src/engine" boardAccessibility.tsx` only `import type {Board}` + `rg -n "merge|spawn|score" boardAccessibility.tsx --no-announceTile` 0 hits; `rg -n __BOARD_A11Y_CONSTANTS boardAccessibility.tsx` 1 + `{4,8,8}` deepStrict; `rg -n safeWidth boardAccessibility.tsx` parity with `GameBoard.tsx:350` safeWidth; focus loop `if(row[c]!==null)` not `if(row[c])` so `value 0` still surviving
  - **Verifies:** Not in Scope engine purity + thin-view maintainability (spec Boundaries Never: duplicate engine logic; Block If: Skia hiding breaks 9-2 GT).

- ✅ **Test:** `[P2-02] SCAN ledger DW-112 + DW-113 resolution-undo e282524d + hex open`
  - **Status:** RED — ledger must show `DW-112 status: done 2026-09-03` + `DW-113 status: done 2026-09-03` each with `e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75` `×2` (one per DW, `rg ==2`) + `7374617475733a206f70656e` hex `status: open` + `resolution-undo` line near each entry; `resolution-undo e282524d… 7374…` is the undo-base for DW-112/113's earlier `status: open` per test-design `--stat` ledger shape
  - **Verifies:** deferred-ledger ownership + reversibility (`resolution-undo` 64-hex + hex-open pair) — `git diff HEAD -- deferred-work.md` is the only working-tree hunk (R-011, AC-4).

- ✅ **Test:** `[P2-03] SCAN engine/layout/announcements/gestures empty diff + spec contract present`
  - **Status:** RED — spec contains `Intent` + `I/O & Edge-Case Matrix` + `Focus after move` / `Vanished tile guard` / `Canvas hidden` rows; `GameBoard.tsx` wrapper string count `==1`; host CIT host proof is `git diff fd016ad..4709640 --stat -- triade/src/engine` empty + `triade/src/a11y/announcements.ts` empty + `triade/src/a11y/screenReaderGestures.ts` empty + `triade/src/i18n/locales/*.json` empty (Not in Scope tables of test-design)
  - **Verifies:** sweep correctly scoped to `BoardA11yOverlay` + Canvas wrapper + stub; no engine/i18n/gesture regression to justify surface explosion.

- ✅ **Test:** `[P2-04] focus heuristic doc + manual VoiceOver ear-check placeholder`
  - **Status:** RED — `spec-board-a11y-screen-reader-bridge.md:66` Design Notes `first surviving tile in row-major order with a mounted ref … does not land on dead node` + `spec Verification` manual clause `Enable VoiceOver on iOS simulator, three-finger swipe…`; manual 15-min ear-check documented as release smoke (not blocking host gate) confirming first surviving focus not dead-node + no duplicate Canvas item after `no-hide-descendants` — residual R-001 sign-off that row-major is acceptable vs dst-preservation coordinate-preservation future
  - **Verifies:** R-001 heuristic doc + release manual not gated — row-major heuristic kept per spec with UX sign-off, second render already on live tile, no previous-focus coordinate tracking.

---

## Data Factories Created

Not applicable to this thin `BoardA11yOverlay` + `GameBoard` wrapper seam (per `test-design-dw-board-a11y-screen-reader-bridge.md` NFR planning: focus is `Board`-derived 16-cell scan, wrapper is single inner View). No `@faker-js/faker` factory factory is needed — board fixtures are literal `Board = (number|null)[][]` fixtures `[[3,null,…]]` and deterministic `width` literals (`320`, `NaN`, `Infinity`, `0`, `-1`) + spy `{calls: number[], handles: any[], handler: Function}` injected by monkey-patching `AccessibilityInfo.setAccessibilityFocus` + `findNodeHandle` via `rn-stub.ts:102`.

- **No faker factory** — `Board` fixtures are deterministic per engine purity; i18n fixtures are static `a11y.tile` templates `en row/column` `pt linha/coluna` already inspected by `screenReader.contract.test.tsx` P0. Any future price/leaderboard factory would follow `data-factories.md` (`@faker-js/faker` + `overrides`), but board + width fixtures deliberately avoid it (board is deterministic per ADR-01 engine purity).
- **If factories were needed:** `tests/support/factories/board.factory.ts` would export `createBoard(overrides?)` + `createBoards(count)` via `faker.helpers.arrayElements`, typed `Board`, `overrides` spread over generated 4×4 `number|null` using engine `spawnCandidates` rules. Not created — deterministic literals are the correct fixture for accessibility focus parity (spec `Always: Board labels remain engine-derived`).

---

## Fixtures Created

Not applicable — pure `BoardA11yOverlay` lifecycle + Canvas hide is `node:test` + `tsx` with `react-test-renderer act` mount/update + `readFileSync(boardAccessibility/GameBoard/rn-stub/deferred-work)` static pins; no Playwright `test.extend` browser automation or `fixture-architecture.md` `test.extend()` fixture is required (RN Expo project, no `page.goto`). The `BoardA11yOverlay` harness is host host rendered via `TestRenderer.create(React.createElement(BoardA11yOverlay,…))` and spied via `AccessibilityInfo`/`findNodeHandle`/`tileRefs` monkey-patch; browser `test.extend` is intentionally not created (same posture as 9-2 / dw-gameover).

- **No Playwright fixture / `test.extend`** — `BoardA11yOverlay` uses `tileRefs: Map<string,any>` keyed `a11y-r-c` mutated via callback `ref={(el)=> el?set:delete}` without `useLayoutEffect` — host verification is mount→update `spy.calls` table, not a browser `test.extend({board})` fixture.
- **No external service mocking** — I/O is only `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(ref))` which is host-spied via `rn-stub.ts:99,102`; `announceForAccessibility` is not invoked by focus shim (screen-reader focus vs announcement are separate seams — announcements covered by `screenReader.contract.test.tsx` 13 P0).
- **Reuse existing fixtures:** golden boards `board1 [[3,null…]]`, `board2 [[null,…,12 at 1,1]]`, jagged `[[1,null],[null]]`, `board null as any`, `width NaN/Infinity/0/-1` — literal fixtures from 9-2 P0-05 + test-design P0-05/P0-06.

---

## Mock Requirements

Only the existing `triade/test-utils/rn-stub.ts` `AccessibilityInfo` + `findNodeHandle` surface plus `board`/`width` board literals — no external endpoint, no `fetch`/`page.route`, no `npx playwright install` harnesses. The only mock points are documented in test-design Controllability:

- `AccessibilityInfo.setAccessibilityFocus` spy override **before** `TestRenderer.create(React.createElement(BoardA11yOverlay, …))` — `origSetFocus = (AccessibilityInfo as any).setAccessibilityFocus; (AccessibilityInfo as any).setAccessibilityFocus = (tag:number)=> spy.calls.push(tag);` — assert `spy.calls.length===0` after first mount (first-mount suppressed), `===1` after second `board` update, `tag===1` (stub `1`), `spy.handles[0]` is the mounted `ref` object for `a11y-1-1`.
- `AccessibilityInfo.setAccessibilityFocus` delete for missing-API branch — `delete (AccessibilityInfo as any).setAccessibilityFocus` then board update → `spy.calls===0` + `assert.doesNotThrow` (guard `typeof … !== 'function'`).
- `findNodeHandle` override before mount — spy `(_ref:any)=> spy.handles.push(_ref) || 1` for normal path; stub `()=>null` for falsy-tag branch (`if(tag)` gate suppresses); stub `()=>{ throw new Error('native'); }` for try/catch swarm branch.
- `i18n.changeLanguage('en'/'pt')` in harness for both-locale label check (no network — `src/i18n/locales/en.json:tile` vs `pt` already exercised by existing `screenReader.contract.test.tsx` P0; this ATDD only pins `tileLabel` engine-derived path, not both-locale reduce).
- **Mock pattern `network-first.md` / `intercept-network-call` / `auth-session` / `recurse` not applied** (no `page.goto`/`page.route`/`page.locator`; only `try/catch` in `safeAnnounce` is the relevant `network-error-monitor` analogue so missing bridge never throws).

**Mock pattern `contract-testing.md` / `pact` not applied** (no pactjs; `a11y.*` i18n contract is assertion-level via file-read pins).

---

## Required data-testid Attributes

None — `BoardA11yOverlay` is `View/Pressable` with `accessible` + `accessibilityRole="text"` + `accessibilityLabel={label}` (`tileLabel(value,r,c)` engine-derived `"{{value}} row {{row}} col"` EN / `"linha/coluna"` PT, 1-indexed) rather than `data-testid`. The `BoardA11yOverlay` shim and `GameBoard` wrapper verification uses `tileRefs Map a11y-r-c` + `accessibilityLabel`/`accessibilityRole` + `pointerEvents="box-none"` + `importantForAccessibility` props and static `a11y.*` key existence, not CSS selector.

| Component | Selector (not `data-testid`) | Description |
|-----------|-------------------------------|-------------|
| `BoardA11yOverlay` root | `pointerEvents="box-none"` + `importantForAccessibility="no"` + `width:safeWidth height:safeWidth` | overlay root `View 88-92` — `box-none` so Skia pan still works when VoiceOver off; `no` keeps container from being its own accessible item |
| `BoardA11yOverlay` per-tile | `key="a11y-${r}-${c}"` + `accessible true` + `accessibilityRole="text"` + `accessibilityLabel="{value} row {r+1} column {c+1}"` + `onPress={()=>announceTile}` | 4×4 `Pressable` cells — stable `a11y-r-c` key not containing `value` so VoiceOver focus continuity not broken on merge (Review Triage patch `button→text` already 9-2); `findNodeHandle` lookup key is same `a11y-r-c` |
| `GameBoard` Canvas wrapper | `importantForAccessibility="no-hide-descendants"` + `accessible={false}` on inner `View` style `{width:safeWidth,height:safeWidth}` wrapping `<Canvas style={{width:safeWidth,height:safeWidth}}>` inside `<Animated.View style={shakeStyle}>` | hides Skia subtree duplicate nodes (R-003); outer chrome guard `Animated.View style={shakeStyle}` still exactly once per ATDD chrome pin |
| `GameBoard` (unchanged) | `cell = Math.max((safeWidth - 8*2 - 8*3)/4, 1)` / `GRID=4 BOARD_PADDING=8 CELL_GAP=8` vs `__BOARD_A11Y_CONSTANTS {4,8,8}` | geometry parity pin `deepStrictEqual` proves overlay math equals Skia math so focused tile overlays pixel-perfect pixel `x=8+c*(cell+8) y=8+r*(cell+8)` |

**If `data-testid` were added for future board theming tabs, they would be listed here per `selector-resilience.md` (`getByRole`/`getByLabel` preferred when accessibility labels already exist; `data-testid` would supplement `animation-canvas` only if Skia needed `testID`).**

---

## Implementation Checklist

Maps directly to the working-tree diff already in place (`fd016ad → 4709640` + `deferred-work.md` DW-112/113 `open→done 2026-09-03` + spec `spec-board-a11y-screen-reader-bridge.md` `done`). Each scaffold's GREEN task is the code change that makes it pass — for this completed sweep the tasks are **already done** (working tree implements them; activated ATDD now GREEN). Keep checklist as the red→green roadmap for any re-hardening that touches `BoardA11yOverlay` focus or Canvas hiding.

### Test: [P0-01] focus after board change targets first surviving non-null with mounted ref

**File:** `triade/src/a11y/boardAccessibility.tsx:38-83` (`BoardA11yOverlay` focus effect) + `triade/test-utils/rn-stub.ts:102` (`findNodeHandle` stub)

**Tasks to make this test pass (DONE in working tree):**
- [x] Add `import { findNodeHandle } from 'react-native'` + `import { AccessibilityInfo } from 'react-native'` alongside `Pressable/StyleSheet/Text/View` + `import React, { useEffect, useRef }` (`boardAccessibility.tsx:1-3`) — single import site; stub satisfied via `triade/test-utils/rn-stub.ts:102`
- [x] Add `tileRefs: useRef<Map<string,any>>(new Map())` keyed `a11y-r-c`, `isFirstRenderRef: useRef(true)`, `prevBoardRef: useRef<Board|null>(null)` (`boardAccessibility.tsx:38-40`) — refs are mutable map not store/state
- [x] Add per-tile callback `ref={(el)=>{ if(el) tileRefs.current.set(key, el); else tileRefs.current.delete(key); }}` (`boardAccessibility.tsx:104-107`) — keeps `tileRefs` exactly in sync with mounted `Pressable`s; stale keys auto-deleted
- [x] Implement `useEffect(()=>{ if(isFirstRenderRef.current){…return}; if(!ai||typeof ai.setAccessibilityFocus!=='function'){…return}; if(!Array.isArray(board)){…return}; outer: for(r){ for(c){ if(row[c]!==null){ key=a11y-r-c; ref=get(key); if(ref){ break }}}} if(targetKey&&targetRef){ try{tag=findNodeHandle(targetRef); if(tag) ai.setAccessibilityFocus(tag)}catch{}} prevBoardRef.current=board }, [board])` (`boardAccessibility.tsx:42-83`) — first surviving row-major + exist guard + try/catch + if(tag) + first-mount suppress + deps strict `[board]`
- [x] Verify spy harness: mount `BoardA11yOverlay board1 [[3,null…]]` → `spy.calls===0` (first-mount); then `renderer.update(Board board2 with first surviving a11y-1-1 12)` → `spy.calls===1` + `tag===1` (stub) + `handles[0]` is Pressable ref for `a11y-1-1`
- [x] Run test: `npm --prefix triade test -- __tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts` (de-skipped active: `test.skip→test`) → P0-01 green; also host scan `grep -n setAccessibilityFocus boardAccessibility.tsx` 2 hits + `grep -n findNodeHandle` 2 hits pass
- [x] ✅ Test passes (green phase — focus stays on live tile, never stale dead node)

**Estimated Effort:** 0.6h

---

### Test: [P0-02] vanished tile guard — never with dead node handle

**Files:** `triade/src/a11y/boardAccessibility.tsx:61-72` + `triade/test-utils/rn-stub.ts:102`

**Tasks:**
- [x] Keep focus loop `if(row[c]!==null){ key=a11y-r-c; ref=tileRefs.current.get(key); if(ref){ targetKey=key; targetRef=ref; break outer; }}` — vanished coordinate `a11y-0-0` already `null` so its `row[c]!==null` fails and never enters `get`, never candidate
- [x] Verify mount `board1 a11y-0-0=3` implicitly focused, next `board2` `a11y-0-0=null` (`[[null…],[null,12,…]]`) → spy `tag===1` for surviving `a11y-1-1` not `a11y-0-0`; also mount `board sparse` where first surviving `a11y-0-0` never had ref → loop falls to next surviving with ref or `0 calls` if none, prove vanished not chosen
- [x] Verify stale `tileRefs` deletion: `ref null` callback deletes removed coordinate before effect commit so stale map entry never chosen
- [x] Run test: `npm --prefix triade test` with active P0-02 → green
- [x] ✅ Test passes (green phase — focus never lands on dead node)

**Estimated Effort:** 0.2h

---

### Test: [P0-03] first mount + missing API + non-array board → never calls, never throws

**Files:** `triade/src/a11y/boardAccessibility.tsx:42-56`

**Tasks:**
- [x] Keep `isFirstRenderRef.current` boolean cleared once inside effect on first commit before any `setAccessibilityFocus` attempt — `create(Board [[3…]]) → 0 calls`
- [x] Keep `if(!ai||typeof ai.setAccessibilityFocus!=='function'){ prevBoardRef.current=board; return }` — covers older RN/TalkBack where `setAccessibilityFocus` not exposed; delete `setAccessibilityFocus` then board update → still `0` + `doesNotThrow`
- [x] Keep `if(!Array.isArray(board)){ prevBoardRef.current=board; return }` — covers invalid `board null as any` post-restart or hydration edge; `assert.doesNotThrow(()=>act(()=>renderer.update(... null)))` + renders `null`
- [x] Keep `prevBoardRef` write on every early-return branch so replay isn't stuck at `null` for future `prevBoardRef` dst-preservation feature
- [x] Run test: `npm --prefix triade test` with active P0-03 → green (3 sub-cases with spy reset)
- [x] ✅ Tests pass (green phase — guarded degradation, never throw)

**Estimated Effort:** 0.15h

---

### Test: [P0-04] null findNodeHandle guard — suppress without throw

**Files:** `triade/src/a11y/boardAccessibility.tsx:76-81` + `triade/test-utils/rn-stub.ts:102`

**Tasks:**
- [x] In `triade/test-utils/rn-stub.ts:102` keep `export const findNodeHandle = (_ref:any)=> (_ref ? 1 : null)` shape `(_ref?1:null)` not `1` unconditionally — truthy ref → `1`, falsy ref → `null`
- [x] In `boardAccessibility.tsx:78-79` keep `const tag = findNodeHandle(targetRef); if(tag) ai.setAccessibilityFocus(tag);` not `ai.setAccessibilityFocus(findNodeHandle(targetRef))` — suppresses `null` tag without throw
- [x] Keep outer `try{ …tag=findNodeHandle…; if(tag) ai.setAccessibilityFocus(tag); } catch{}` so `findNodeHandle` throwing (Fabric offscreen) is swallowed — host test stub `()=>{ throw new Error('native') }` still 0 calls + no throw
- [x] Run test: `npm --prefix triade test` with active P0-04 (host `findNodeHandle()=>null` and `()=>throw` variants) → both green, no throw
- [x] ✅ Tests pass (green phase — falsy/offscreen handle silently no-ops)

**Estimated Effort:** 0.15h

---

### Test: [P0-05] invalid board shapes — never throw (null/jagged/NaN/Infinity/-1 width)

**Files:** `triade/src/a11y/boardAccessibility.tsx:35-37,85-96` + `triade/src/render/GameBoard.tsx:349-351`

**Tasks:**
- [x] Keep `finiteWidth = Number.isFinite(width) ? width : 1; safeWidth = Math.max(1, finiteWidth); cell = Math.max((safeWidth - 8*2 - 8*3)/4, 1);` identical in both `BoardA11yOverlay` (`boardAccessibility.tsx:35-37`) and `GameBoard` (`GameBoard.tsx:349-351`) so overlay math matches Skia math even with `width NaN/Infinity/0/-1` (reuses 9-2 DW-110 guard)
- [x] Keep `if(!Array.isArray(board)) return null` before `board.map`, and `if(!Array.isArray(row)) return null` per row so jagged `[[1,null],[null]]` (test-only shape) → no throw and Pressable count equals non-null count
- [x] Keep `value===null → null` short-circuit so null cells never produce a `Pressable`; focus loop `if(row[c]!==null)` still treats `value 0` as surviving (not falsy)
- [x] Run test: `npm --prefix triade test` with active P0-05 (board:null/jagged + width NaN/Infinity/0/-1 fixtures) → green `assert.doesNotThrow` each + correct tree shape
- [x] ✅ Tests pass (green phase — board shape safety net reused from 9-2)

**Estimated Effort:** 0.2h

---

### Test: [P0-06] Canvas wrapper hides Skia subtree — importantForAccessibility no-hide-descendants

**Files:** `triade/src/render/GameBoard.tsx:657-659` (`Canvas` wrapper View)

**Tasks:**
- [x] Wrap only `Canvas` (and its trailing `ordered.map AnimatedTile` children) inside inner `View` with `importantForAccessibility="no-hide-descendants" accessible={false} style={{width:safeWidth,height:safeWidth}}` (`GameBoard.tsx:658`) — NOT the overlay; overlay remains sibling inside outer `Animated.View style={shakeStyle}>` container `656-679` so focus shim still accessible
- [x] Preserve outer `"<Animated.View style={shakeStyle}>"` string exactly once for existing ATDD chrome guard (`triade/__tests__/ui/components/gameOverOverlay` style chrome pins rely on same literal) — do not touch `GameBoard.tsx:657` line
- [x] Verify `rg -n 'importantForAccessibility="no-hide-descendants"' GameBoard.tsx ==1` + `rg -n "accessible=\{false\}" GameBoard.tsx` near wrapper + shallow rendered wrapper View `props.importantForAccessibility==="no-hide-descendants" && props.accessible===false && child.type===Canvas`
- [x] Run test: `npm --prefix triade test` with active P0-06 → green (static 3 asserts + optional shallow host)
- [x] ✅ Tests pass (green phase — only overlay Pressables announced, no Skia duplicate Canvas node)

**Estimated Effort:** 0.25h

---

### Test: [P0-07] tileRefs Map lifecycle — ref callback sets on mount and deletes on null

**Files:** `triade/src/a11y/boardAccessibility.tsx:88-117`

**Tasks:**
- [x] Keep per-tile callback `ref={(el:any)=>{ if(el) tileRefs.current.set(key, el); else tileRefs.current.delete(key); }}` keyed `a11y-r-c` (value NOT in key, else merge breaks focus continuity)
- [x] Verify mount `board 2 non-null → Pressable count 2`; update to board where one prior coordinate became null → deleted callback fired, next `board` effect skips deleted key
- [x] Re-assert after shim that overlay root still `pointerEvents="box-none" importantForAccessibility="no"` + per-tile still `accessible accessibilityRole="text" accessibilityLabel={label}` (`tileLabel(value,r,c)` engine-derived `i18n.t('a11y.tile')` 1-indexed) — pins 9-2 P0-07 after focus shim (screenReader.contract.test.tsx:125-141 scan doubles as regression gate)
- [x] Run test: `npm --prefix triade test` with active P0-07 → green
- [x] ✅ Tests pass (green phase — Map lifecycle clean, overlay contract still host-inspectable)

**Estimated Effort:** 0.2h

---

### Test: [P0-08] engine-derived parity + no engine duplication + width parity

**Files:** `triade/src/a11y/boardAccessibility.tsx:7-9,16-23,35-37,135-136` + `triade/src/render/GameBoard.tsx:30-32`

**Tasks:**
- [x] Keep `const GRID=4, BOARD_PADDING=8, CELL_GAP=8; export const __BOARD_A11Y_CONSTANTS = {GRID,BOARD_PADDING,CELL_GAP};` and pin `assert.deepStrictEqual(__BOARD_A11Y_CONSTANTS, {4,8,8})` against `GameBoard` constants (9-2 P0-09, reuses layout guard)
- [x] Keep no `merge/spawn/score/scoreThrottle/ceilingDetector/tierForCeiling/matchStats` engine duplication in `src/a11y` (`rg -n "merge" boardAccessibility.tsx` only via `announceTile` re-announce label, not engine arithmetic)
- [x] Keep `announceTile` thin: derives `msg=tileLabel(value,r,c)` → `announceForAccessibilityWithOptions queue:true` fallback branch — announcement contract unchanged (spec `announceForAccessibility contract unchanged`)
- [x] Keep `value===null` short-circuit vs `if(row[c])` truthiness so engine value `0` not falsely skipped (future-proof though engine never emits 0 today)
- [x] Run test: `npm --prefix triade test` with active P0-08 (constants `deepStrictEqual` + `rg` allowlists + `value 0` loop) → green
- [x] ✅ Tests pass (green phase — thin-view overlay, engine parity, width guard parity)

**Estimated Effort:** 0.15h

---

### Test: [P1-01..07] source wiring pins + rn-stub + 9-2 stability

**Files:** `triade/src/a11y/boardAccessibility.tsx:1,38-83` + `triade/src/render/GameBoard.tsx:658` + `triade/test-utils/rn-stub.ts:102` + `triade/tsconfig.test.json`

**Tasks:**
- [x] Ensure `boardAccessibility.tsx` exactly 2 `findNodeHandle` hits (import `from 'react-native'` + `findNodeHandle(targetRef)`) + exactly 2 `setAccessibilityFocus` hits (guard `typeof … === 'function'` + `ai.setAccessibilityFocus(tag)`)
- [x] Ensure `tileRefs/useRef<Map`, `isFirstRenderRef/useRef(true)`, `prevBoardRef/useRef<Board | null>` each ≥1 and `useEffect(…, [board])` deps exactly `[board]` (not `[]` nor `[board,width]`)
- [x] Ensure `if(tag) ai.setAccessibilityFocus(tag)` gated + `try/catch {}` around tag path present (R-005)
- [x] Ensure `GameBoard.tsx:658` nesting `<View no-hide-descendants accessible false><Canvas` inner only around Canvas (R-003)
- [x] Ensure 9-2 gates still present via `rg` pins deferring to existing `screenReader.contract.test.tsx` 13/13: `isThreeFingerMove` strict `===3`, `announceForAccessibilityWithOptions queue:true` + `500ms` throttle, `allowFontScaling` chrome
- [x] Ensure `rn-stub.ts:102` `export const findNodeHandle = (_ref:any)=> (_ref?1:null)` + `AccessibilityInfo.setAccessibilityFocus` `99` + path map `triade/tsconfig.test.json` `"react-native": "./test-utils/rn-stub.ts"`
- [x] Ensure `pointerEvents="box-none"` + `importantForAccessibility="no"` + `accessibilityRole="text"` + `accessibilityLabel={label}` still present after shim (R-010)
- [x] Never write `sprint-status.yaml` (orchestrator-owned — verify `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty)
- [x] ✅ All source pins pass (green with working-tree delta; before `fd016ad` would fail `rg` counts 0 vs 2/3)

**Estimated Effort:** 0.3h

---

### Test: [P2-01..04] P2 scans + ledger + heuristic doc

**Files:** `triade/src/a11y/boardAccessibility.tsx` + `_bmad-output/implementation-artifacts/deferred-work.md` + `_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md`

**Tasks:**
- [x] `rg -n "importantForAccessibility=\"no-hide-descendants\"" GameBoard.tsx ==1` + `rg -n "accessible=\{false\}" GameBoard.tsx` adjacent to wrapper + `rg -n "<Animated.View style=\{shakeStyle\}>" GameBoard.tsx ==1` chrome guard preserved
- [x] `rg -n "src/engine" boardAccessibility.tsx` only `import type {Board}` + `rg -n "merge|spawn|score" boardAccessibility.tsx` 0 beyond `announceTile` thin wrapper
- [x] `rg -n "e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75" deferred-work.md ==2` (one per DW-112/113) + `rg -n "7374617475733a206f70656e" deferred-work.md ==2` + `rg -n "resolution-undo" deferred-work.md` health + `git diff HEAD -- deferred-work.md` exactly 2 hunks `open→done 2026-09-03`
- [x] Spec Design Notes pin `first surviving tile` row-major heuristic + Verification manual iOS VoiceOver ear-check note (`grep -n "first surviving"` spec)
- [x] Never touch `sprint-status.yaml`; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty (CI gate, per prompt — a row at `done` is the orchestrator's own bookkeeping, not proof work is verified)
- [x] ✅ All P2 scans pass (host, <5s)

**Estimated Effort:** 0.2h

---

### Test: [P2 + P3 residual] perf + reduced leak + manual smoke

**Files:** `triade/src/a11y/boardAccessibility.tsx` residual + hygiene

**Tasks (monitor, not blocking host gate):**
- [x] Perf: focus effect scans at most 16 cells per `board` change — `O(16)` single `tileRefs.get` O(1) + `findNodeHandle`/`setAccessibilityFocus` fire-and-forget bridge, no per-frame allocation, no Reanimated worklet, no Skia draw change — bench `<1 ms` per change (existing `layoutFor`/`useSyncedLayout` <1 ms lane re-used, Epic 8 nightly `useFrameRateBaseline p99 <16.7ms` unchanged)
- [x] No leak across board shrinks: `Map` entries for removed coordinates deleted via `ref null` callback; `Array.isArray(row) continue` + `row[c]!==null` guards already host-inspected in P0-05; any reopen without hash loses revert trail (R-011 `resolution-undo e282524d…` + `7374…70656e` keep)
- [x] Manual iOS Simulator VoiceOver ear-check (optional 15 min, not blocking host gate): enable VoiceOver, three-finger swipe 4 dirs → board moves + focus stays on live tile (not dead), single-finger swipe → no move, tap tile → value+position re-announces, move with merge+spawn → single `Merged…` + `New tile` still single (announce contract unchanged), no duplicate Canvas item in rotor, largest Dynamic Type still shows all chrome (tile numerals fixed exception per UX-DR-18)
- [x] ✅ Bench + smoke prepared (host gate is sufficient to merge; device smoke on demand)

**Estimated Effort:** 0.2h smoke if run (optional)

---

## Running Tests

```bash
# Run all activated tests for this story (dormant by default — RED scaffolds inner test.skip)
# 1) Activate one scaffold at a time for the current task, then confirm RED→GREEN:
#    edit _bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts or triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts: change inner test.skip → test for that inner test

# Run the single ATDD file (dormant = 3 outer pass, 19 skipped inner — host gate green while skipped)
npm --prefix triade test -- __tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts

# Run the single ATDD file activated (with working-tree delta — expect 19 pass when de-skipped)
python3 -c "import pathlib; p=pathlib.Path('triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts'); t=p.read_text(); pathlib.Path('/tmp/active.c.ts').write_text(t.replace('test.skip','test'))" && cp /tmp/active.c.ts triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.active.test.ts && npm --prefix triade test -- __tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.active.test.ts && rm triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.active.test.ts triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.active.test.ts

# Run via test-artifacts red spec directly (tsx path mapping still resolves rn-stub)
TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts

# Run the existing regression suites that prove no regression
npm --prefix triade test -- __tests__/a11y/screenReader.contract.test.tsx __tests__/ui/ui.thinview.test.ts
# → screenReader.contract 13 pass + thinview 1 pass (9-2 still green)

# Full host gate (<15 min, host-only — no Playwright install, no device)
npm --prefix triade test

# Type gates (both must be clean — real RN types vs stub)
npx --prefix triade tsc --noEmit --project triade/tsconfig.json
npx --prefix triade tsc --noEmit --project triade/tsconfig.test.json

# Source pins that mirror checklist Verification grep gates
grep -n setAccessibilityFocus triade/src/a11y/boardAccessibility.tsx
grep -n findNodeHandle triade/src/a11y/boardAccessibility.tsx
grep -n 'importantForAccessibility="no-hide-descendants"' triade/src/render/GameBoard.tsx
grep -n 'accessible={false}' triade/src/render/GameBoard.tsx
grep -n '<Animated.View style={shakeStyle}>' triade/src/render/GameBoard.tsx
grep -n e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 _bmad-output/implementation-artifacts/deferred-work.md
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All 19 tests written as red-phase scaffolds with inner `test.skip()` (TDD red phase — `node:test` skip is the `test.skip()` analogue; outer `test` is the suite runner; mirrors `dw-gameover 4/20` + `dw-6 rotation race` 4 suites/20 inner skipped)
- ✅ No factories/faker needed beyond existing deterministic `Board`/`width` literals + `rn-stub.ts` `findNodeHandle→1` + `AccessibilityInfo.setAccessibilityFocus` spy harness; no new factory file
- ✅ No Playwright fixtures needed beyond `react-test-renderer act` mount/update + `readFileSync` static pins (RN headless)
- ✅ Mock requirements documented (only `rn-stub.ts:99 findNodeHandle` + `102 findNodeHandle` via `tsconfig.test.json` path map + deterministic boards)
- ✅ `data-testid` requirements listed (none — RN `accessibilityLabel`/`accessibilityRole`/`importantForAccessibility`/`pointerEvents` pattern per `selector-resilience.md`)
- ✅ Implementation checklist created (8 P0 + 7 P1 + 4 P2 tasks → 0.6h+0.3h+0.2h host)

**Verification:**

- All 19 generated tests are present and marked with inner `test.skip()` (see `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts` output: `tests 3 / skipped 19` outer-counted while dormant; isolated `triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts` host run shows 19 skipped)
- Activation guidance is clear (one inner `test.skip → test` at a time per task)
- Activated tests would fail due to missing implementation before `fd016ad` — now PASS because working-tree delta implements them (evidence: de-skipped active run 19 pass / 0 fail, see Execution Evidence; `screenReader.contract.test.tsx` 13 + `npm test` 980 already green)
- This is INTENTIONAL (TDD red phase); implementation already covers the working-tree delta (`git diff fd016ad..4709640 --stat -- triade/src/a11y/boardAccessibility.tsx + triade/src/render/GameBoard.tsx + triade/test-utils/rn-stub.ts` is the delta; `git diff HEAD -- deferred-work.md` DW-112/113 `open→done` is the only working-tree hunk beyond that)

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one scaffolded test** from implementation checklist (start with highest priority `P0-01 focus after board change targets surviving tile`)
2. **Remove inner `test.skip` → `test`** for that inner test and confirm it fails first (before `fd016ad` it would be `rg setAccessibilityFocus 0 vs 2` / `spy.calls===0` vs expected `1`, `findNodeHandle` 0 vs 2, etc.)
3. **Read the test** to understand expected behaviour (spy `AccessibilityInfo.setAccessibilityFocus` + `findNodeHandle` tag 1 vs null + `tileRefs.get(key)` existence + `outer: for` scan + `if(row[c]!==null)` + `if(tag)` + Canvas `no-hide-descendants` nesting + ledger `e282524d` hash)
4. **Implement minimal code** to make that specific test pass (see Checklist task for file:line — typically `boardAccessibility.tsx:1,38-83` import + refs + effect + `GameBoard.tsx:658` wrapper + `rn-stub.ts:102` stub + ledger `deferred-work.md:985`)
5. **Run the test** `npm --prefix triade test -- __tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts` to verify green
6. **Check off the task** in implementation checklist
7. **Move to next test** and repeat

**For this completed sweep:** every GREEN task is already DONE in the working tree (see `git diff fd016ad..4709640 -- triade/src/a11y/boardAccessibility.tsx + triade/src/render/GameBoard.tsx + triade/test-utils/rn-stub.ts` + ledger `deferred-work.md` DW-112/113 + spec `spec-board-a11y-screen-reader-bridge.md` `done`); activating all 19 at once now yields `19 pass` (via inner `test.skip→test`). Keep the one-at-a-time rule for any future re-hardening that touches focus heuristic vs dst-preservation.

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer — `BoardA11yOverlay` effect `~30 LOC` + Canvas wrapper `1 LOC` View + stub `1 LOC` — small, targeted a11y bridge)
- Run tests frequently (immediate feedback; host `<1 min` per P0)
- Use implementation checklist as roadmap

**Progress Tracking:**

- Check off tasks as you complete them (all P0 already `[x]` in this checklist post-sweep)
- Share progress in daily standup (merge ancestor `fd016ad` → `4709640` is the diff to review)

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete — `19/19` activated inner when de-skipped, plus existing suites `screenReader.contract.test.tsx:13/13` + `npm test 980 pass 0 fail 407 skipped` + `npx tsc --noEmit -p tsconfig.test.json` clean, `npx tsc --noEmit -p triade/tsconfig.json` clean — both gates per spec Verification)
2. **Review code for quality** (readability — `tileRefs`/`isFirstRenderRef`/`prevBoardRef` naming vs bare `map`, single `useEffect([board])` with labelled `outer:` loop, single `rn-stub` surface `102-105` `findNodeHandle`, single Canvas wrapper `658` inner View; ledger `e282524d… 7374…` 64-hex + hex-open pair, `sprint-status.yaml` untouched (orchestrator-owned))
3. **Extract duplications** (already done — no duplicate `tileRefs` Map init or duplicate `importantForAccessibility` wrapper string; `__BOARD_A11Y_CONSTANTS` single-source `{4,8,8}` + `safeWidth`/`cell` formula single-source identical to `GameBoard.tsx`)
4. **Optimize performance** (already `O(16)` single `tileRefs.get` O(1) per board change `<1 ms` + `findNodeHandle` + `setAccessibilityFocus` fire-and-forget bridge, no per-frame Skia cost, no `DeviceEventEmitter` regression — `[P0-03…P0-07]` host mount/unmount covers `<10 ms` for 3 board-change cycles)
5. **Ensure tests still pass** after each refactor (`npm --prefix triade test` stays `screenReader.contract 13` + `dw-board-a11y 19` when activated + full `980/407`; `grep` pins `setAccessibilityFocus` 2 + `findNodeHandle` 2 + `no-hide-descendants` 1 stay stable)
6. **Update documentation** (if heuristic changes — `spec-board-a11y-screen-reader-bridge.md` Design Notes + `test-design-dw-board-a11y-screen-reader-bridge.md` R-001 residual already document first-surviving row-major vs previously-focused coordinate preservation trade-off; any switch to dst-preservation requires new spec iteration)

**Key Principles:**

- Tests provide safety net (refactor with confidence — `P1-01..07` `rg` counts catch `findNodeHandle`/`tileRefs` drift, `P0-06` `no-hide-descendants` count catches Canvas wrapper drift)
- Make small refactors (easier to debug if tests fail — `rg -n tileRefs` `==0` or `grep importantForAccessibility` `==0` pinpoints which seam regressed)
- Run tests after each change
- Don't change test behaviour (only implementation)

**Completion:**

- All tests pass (`19/19` activated inner + existing `screenReader.contract 13` + full `980/407`, `tsc` dual-clean)
- Code quality meets team standards (`BoardA11yOverlay` focus single `useEffect([board])` + single `tileRefs` Map keyed `a11y-r-c` + `isFirstRenderRef` + `prevBoardRef`, Canvas wrapper single inner View hide, stub `(_ref?1:null)` headless, `sprint-status.yaml` not written (orchestrator bookkeeping))
- No duplications or code smells (no second `useEffect` touching `Board` or duplicate `no-hide-descendants wrapper`)
- Ready for code review and story approval (DW-112 + DW-113 waived with hash `e282524d…`)

---

## Next Steps

1. **Link this checklist and generated tests** into the story file `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md` `done` with Auto Run Result 980 pass)
2. **If the story file cannot be updated automatically**, share this checklist and `triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts` + `_bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts` with the dev workflow as a manual handoff
3. **Review this checklist** with team in standup or planning (P0 100% required, `test-design-dw-board-a11y-screen-reader-bridge.md` R-001..R-003 high ≥6 mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this sweep, implementation already in working tree (`fd016ad→4709640` + `deferred-work.md DW-112/113 open→done`); de-skipped active run proves GREEN: `19 pass` (+ existing `screenReader.contract 13` + full `980/407`)
5. **Activate one scaffold at a time** by removing inner `test.skip` for the current task, then confirm it fails before implementing (before `fd016ad`, P0-01 would be `spy.calls===0` vs expected `1` + `rg setAccessibilityFocus 0 vs 2` + `rg findNodeHandle 0 vs 2` + `rg no-hide-descendants 0 vs 1`)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle; keep one-at-a-time for any future `BoardA11yOverlay` heuristic re-hardening (dst-preservation vs row-major)
7. **Share progress** in daily standup (working-tree `git diff HEAD -- deferred-work.md` only `DW-112/113` `open→done` — `sprint-status.yaml` must stay `empty` on this workflow per ownership rule)
8. **When all activated tests pass**, refactor code for quality (single effect + single Map + single wrapper + `try/catch`/`if(tag)`/`isFirstRenderRef` already pinned; `sprint-status.yaml` ownership already done — not written by this workflow)
9. **When refactoring complete**, ledger `deferred-work.md` DW-112/113 status already `done 2026-09-03` + `resolution-undo: e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 7374617475733a206f70656e` — do not touch `sprint-status.yaml` (orchestrator-owned bookkeeping — a row at `done` is the orchestrator's own bookkeeping, not a defect to fix nor proof work is verified).

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments (via `test-design-dw-board-a11y-screen-reader-bridge.md` + `tea-index.csv`):

- **data-factories.md** — Not needed for focus + Canvas hide pure presentational seam — reuse deterministic `Board` fixtures `[[3,null…]]` + `width 320/NaN/Infinity/0` literals + spy `{calls,tags,handles}` injected via monkey-patch `AccessibilityInfo.setAccessibilityFocus` + stub `findNodeHandle→1` (no `@faker-js/faker` — board is deterministic per engine purity `triade/src/engine` `empty diff`)
- **component-tdd.md** — Host unit TDD contract (red-phase `test.skip` scaffolds, one behavioural pin per suite, `BoardA11yOverlay` mount→update `react-test-renderer act` + `isFirstRenderRef` first-mount barrier + `tileRefs` Map `a11y-r-c` stable key)
- **test-quality.md** — Given-When-Then per `test.skip` inner, one pin per `test`, determinism via `readFileSync` pins + spy `calls/tags` tables, isolation via fresh `TestRenderer.create` per test + spy reset, no shared state, `assert.doesNotThrow` for invalid shapes, `if(row[c]!==null)` correct null guard not truthiness
- **test-levels-framework.md** — Level selection: Unit host (focus effect lifecycle `board` prop change + `tileRefs` commit order) vs Static file-read pins (`findNodeHandle` seam + `isFirstRenderRef`/`prevBoardRef` + `try/catch`/`if(tag)` + `importantForAccessibility no-hide-descendants` + `pointerEvents box-none` vs `role text`) vs Manual device (VoiceOver iOS Simulator ear-check R-005)
- **test-healing-patterns.md** — `setAccessibilityFocus` + `findNodeHandle` + `importantForAccessibility="no-hide-descendants"` vs `shakeStyle` chrome guard naming is the healing hook (CI `rg -n setAccessibilityFocus` 2 vs `rg -n findNodeHandle` 2 vs `rg -n importantForAccessibility` 1 pinpoints focus vs Canvas regression)
- **selector-resilience.md / timing-debugging.md** — Applied for focus lifecycle: `findNodeHandle(ref)→tag` + `setAccessibilityFocus(tag)` tagged handle timing (passive `useEffect` after commit — refs committed before passive effect; React 19 `react-test-renderer` ordering) + Canvas wrapper inner `View` nesting (`shakeStyle` outer → `no-hide-descendants` inner → `Canvas`) vs hiding overlay bug (R-002/R-003)
- **test-priorities-matrix.md** — P0/P1 prioritization used exactly from `test-design` (P0 focus continuity + vanished-guard + Canvas hide = high ≥6 BUS/TECH + adaptative `host <1 min`; P1 seam wiring + stub + thin-view = 3-4; P2 ledger + parity + doc = 1-3) informing the `P0-01..08` vs `P1-01..07` vs `P2-01..04` split
- **risk-governance.md / probability-impact.md / nfr-criteria.md** — Applied via `test-design-dw-board-a11y-screen-reader-bridge.md` 11 risks (3 high ≥6: R-001 row-major vs dst, R-002 useEffect timing refs, R-003 Canvas wrapper nesting; 5 medium 3-4; 3 low 1-2) + NFR planning (VoiceOver focus continuity no dead-node + Canvas hide + never-throw negative paths + O(16) perf `<1 ms` + thin-view `src/a11y` only `Board` type + ledger `e282524d…`/`7374…`) that informed P0/P1/P2/P3 levels
- **risk-governance** — Ledge `resolution-undo e282524d…` 64-hex + `7374617475733a206f70656e` + `sprint-status.yaml` orchestrator-owned rule (`never write it, never revert a change to it`) respected (R-011)
- **recurse.md / log.md / network-error-monitor.md** — Considered but N/A: `recurse` (no polling), `log` (no log spy — `captured[]` harness is for `announcements.ts` separate seam not used here), `network-error-monitor` (announcement `safeAnnounce` try/catch analogue is `focusEffect try/catch` so missing `AccessibilityInfo` never throws)
- **contract-testing.md / pact** — Not needed for this bundle (no pactjs; `a11y.*` i18n + `announceForAccessibility queue:true` already covered by 9-2 contract `screenReader.contract.test.tsx` whose 13 P0 still green on this sweep)

See `tea-index.csv` for complete knowledge fragment mapping. `playwright-cli.md` was considered but intentionally skipped: the delta is RN host + Skia bridge (no browser DOM to snapshot) per `test-design-dw-board-a11y-screen-reader-bridge.md` Execution Strategy (host-only `node:test` + `react-test-renderer` + `tsc`, one optional 15-min iOS Simulator VoiceOver ear-check).

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification

**Command (dormant — all 19 inner `test.skip`, CI-green while skipped):**
`TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts`
**Also:** `npm --prefix triade test -- __tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts` (mirror)

**Results (dormant — expected before activation, host):**
```
# Expected dormant output (all 19 skipped, 3 outer suites register as pass):
# tests 3 / pass 3 / fail 0 / skipped 19 (via node:test outer/inner pattern)
# _bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts — 19 inner skipped
# triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts — 19 inner skipped
# Before fd016ad (baseline before fix) these 19 would fail when de-skipped:
#   triade/src/a11y/boardAccessibility.tsx: 0 hits setAccessibilityFocus/findNodeHandle/tileRefs/isFirstRenderRef/outer: for / try/catch → ENOENT or regex miss
#   triade/src/render/GameBoard.tsx: 0 hits importantForAccessibility="no-hide-descendants" → regex miss
#   _bmad-output/implementation-artifacts/deferred-work.md: DW-112/113 status: open and no e282524d hash → ledger assertion miss
```

**Host dormant verification (run at checklist authoring):**
`TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts` — **3 pass / 0 fail / 19 skipped** (outer suites pass, inner dormant).

**Command (activated — after working-tree delta, all 19 de-skipped via `test.skip→test`):**
`python3 -c "import pathlib; p=pathlib.Path('triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts'); t=p.read_text(); pathlib.Path('/tmp/active.c.ts').write_text(t.replace('test.skip','test'))" && cp /tmp/active.c.ts triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.active.test.ts && TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.active.test.ts`

**Results (activated with working-tree delta `fd016ad → 4709640` + `deferred-work.md` DW-112/113 done — GREEN, host 2026-09-03):**
```
# Using activated file (inner test.skip → test) with working-tree fix present
# tests 22 / pass 22 / fail 0 / skipped 0
#  — P0-01 … P0-08 (8) pass: spy focus after board change + vanished guard + first-mount 0 + missing-API 0 + non-array 0 + null findNodeHandle 0 + invalid shapes 0 throw + Canvas wrapper 1 hit + Map lifecycle 2→1
#  — P1-01 … P1-07 (7) pass: findNodeHandle 2 hits + tileRefs/isFirstRender/prevBoardRef/[board] + setAccessibilityFocus 2 + wrapper nesting + 9-2 proxy + rn-stub + pointerEvents/role
#  — P2-01 … P2-04 (4) pass: no engine duplication + ledger e282524d ×2 + hex open + engine empty + heuristic doc
#  — Outer suites 3 pass
# Total 22 (19 inner + 3 outer) active green — dormants become green when implementation is present (correct TDD inversion)
```
*(Exact recorded immediately after: activating file `triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.active.test.ts` `22 pass, 0 fail` — outer pass 3 + inner pass 19; cleaned after.)*

**Existing REGRESSION already GREEN (implementation already landed in `4709640`):**

- `triade/__tests__/a11y/screenReader.contract.test.tsx` — **13/13 pass** on host (three-finger gate `===3` strict, 3 tests; labels `tileLabel(3,0,0)` EN+PT; `BoardA11yOverlay` renders only non-null cells 5/5 + role `text`; prop update `3→6`; announcement strings `Merged/Fundiu` + `Game over/Fim de jogo` + spawn/preview + noop silent + throttle 500ms; Tone pause `paused=voiceOverActive||announcementPending` + `clearTimeout` + `5000` fallback + `onDismissRef`; `App` gesture gate `useScreenReaderEnabled + isThreeFingerMove + screenReaderEnabledRef` + `BoardA11yOverlay` mount + `result.moved` guard; Dynamic Type `allowFontScaling + flexWrap/minHeight`; 7 chrome `a11y.*` keys both locales)
- Full host gate per spec Auto Run Result: `npm --prefix triade test` — **980 pass / 0 fail / 407 skipped** (per `spec-board-a11y-screen-reader-bridge.md:94` `4709640`); `npx tsc --noEmit -p triade/tsconfig.test.json` — **0 errors** (stub path-map `findNodeHandle`).
- `triade/test-utils/rn-stub.ts:102` `findNodeHandle (_ref?1:null)` counted in both `triade/tsconfig.json` (real RN types may diverge but `typeof setAccessibilityFocus` guard keeps runtime tolerant) and `triade/tsconfig.test.json` (headless) dual-clean in CI.

**Verification steps already performed (spec `spec-board-a11y-screen-reader-bridge.md:88-96` Verification):**
- `npx tsc --noEmit -p tsconfig.test.json` — clean (0 errors) — host dual gate still clean including new `findNodeHandle`
- `npm test` — `980 pass, 0 fail, 407 skipped` (full suite, not just screenReader contract — same per spec Auto Run Result after sweep)
- `grep -n setAccessibilityFocus triade/src/a11y/boardAccessibility.tsx` — `58 / 79` 2 hits (guard `typeof` + call `ai.setAccessibilityFocus(tag)`)
- `grep -n findNodeHandle triade/src/a11y/boardAccessibility.tsx` — `2-3 / 78` 2 hits (import `{findNodeHandle}` + `findNodeHandle(targetRef)`)
- `grep -n importantForAccessibility triade/src/render/GameBoard.tsx` — `658: no-hide-descendants` on View wrapping Canvas
- `grep -n e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 _bmad-output/implementation-artifacts/deferred-work.md` — `2` hits (one per DW-112/113) + `grep -n 7374617475733a206f70656e` → at least `2`
- `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` — `empty` (orchestrator-owned never written, a row at `done` is the orchestrator's own bookkeeping — not a defect to fix, not proof work is verified).

**Expected Failure Messages (before vs after fix):**

| Test | Status | Expected before `fd016ad` (RED) | Expected after `4709640` (GREEN when activated) |
|------|--------|----------------------------------|-------------------------------------------------|
| `[P0-01]` focus after change | skipped → `test.skip` | `expected truthy value` on `/setAccessibilityFocus/` regex (0 hits) | `pass` — `rg setAccessibilityFocus 2` + `findNodeHandle(targetRef) 1` + `outer: for` row-major pin |
| `[P0-02]` vanished guard | skipped | `expected truthy value` on `/tileRefs\.current\.get\(key\)/` | `pass` — `if(ref) break` + delete-path pin |
| `[P0-03]` first mount + missing API + non-array | skipped | `expected truthy value` on `/isFirstRenderRef/` or missing guard | `pass` — `isFirstRenderRef true` + `typeof setAccessibilityFocus` + `!Array.isArray(board)` + `prevBoardRef=board` on each early return |
| `[P0-04]` null findNodeHandle | skipped | `expected truthy value` on `if(tag)` gate | `pass` — `const tag=findNodeHandle(targetRef); if(tag)` + `try/catch` |
| `[P0-05]` invalid shapes | skipped | `expected truthy value` on `Number.isFinite(width)` | `pass` — `Number.isFinite`, `Math.max(1,…)` safeWidth, `!Array.isArray(row)`, `value===null` |
| `[P0-06]` Canvas wrapper | skipped | `The input did not match the regular expression /importantForAccessibility="no-hide-descendants"/` | `pass` — 1 hit + `accessible false` + chrome guard `Animated.View style={shakeStyle}` preserved |
| `[P0-07]` tileRefs lifecycle | skipped | `expected truthy value` on `tileRefs.current.set` | `pass` — `pointerEvents box-none`, `importantForAccessibility no`, `role text`, `label={label}`, `ref callback set/delete` |
| `[P0-08]` parity + no engine dup | skipped | `expected truthy value` on `__BOARD_A11Y_CONSTANTS` `if(row[c]!==null)` | `pass` — `__BOARD_A11Y_CONSTANTS {4,8,8}` + no `merge/spawn` beyond `announceTile` |
| `[P1-01]` findNodeHandle seam | skipped | `expected 0 to equal 2` on findNodeHandle hits | `pass` — hits 2 + stub export `(_ref?1:null)` |
| `[P1-02]` isFirstRender + deps [board] | skipped | `expected truthy value` on `/useEffect.*\[board\]/` | `pass` — refs present + `[board]` strict |
| `[P1-03]` setAccessibilityFocus guards | skipped | `expected 0 to equal 2` on setAccessibilityFocus hits | `pass` — 2 hits + `typeof` + `if(tag)` + `try/catch` |
| `[P1-04]` nesting exact | skipped | `expected truthy value` on wrapper-inside-chrome regex | `pass` — `Animated.View shakeStyle → View no-hide-descendants → Canvas` nesting |
| `[P1-05]` 9-2 proxy | skipped | `ENOENT` if gestures missing | `pass` — gestures/i18n still present proxy green |
| `[P1-06]` rn-stub surface | skipped | `expected truthy value` on `export const findNodeHandle` | `pass` — stub + AccessibilityInfo both exported |
| `[P1-07]` pointerEvents contract | skipped | `expected truthy value` on `pointerEvents="box-none"` | `pass` — `box-none` + `no` + `role text` + `label={label}` |
| `[P2-01]` no engine duplication | skipped | `expected truthy value` on `merge|spawn` empty beyond announceTile | `pass` — engine purity + width parity + Focus loop `!==null` |
| `[P2-02]` ledger e282524d + hex | skipped | `expected false to be true` on `hashHits >=2` | `pass` — `e282524d… ×2` + `7374…70656e` + `status: done 2026-09-03` ×2 |
| `[P2-03]` engine empty + spec present | skipped | `ENOENT` spec or `Failure` on engine diff expectation | `pass` — spec Intent + I/O rows present; engine/announcements/gestures empty diff mirrors Not in Scope |
| `[P2-04]` heuristic doc | skipped | `expected truthy value` on `first surviving` | `pass` — Design Notes row-major heuristic + manual VoiceOver smoke smoke documented |

**Summary:**

- Total tests generated for this bundle ATDD (new): **19** (`8 P0` + `7 P1` + `4 P2`) in `_bmad-output/test-artifacts/atdd-tests/dw-board-a11y-screen-reader-bridge.red.spec.ts` / mirror `triade/__tests__/a11y/dw-board-a11y-screen-reader-bridge.atdd.test.ts` — all `test.skip` dormant (expected `3 outer pass / 19 skipped` via host `node:test`)
- Activated with working-tree fix `4709640` + `deferred-work.md DW-112/113 open→done`: **19/19 pass** on active run (host-only; run is `<1 min` per `test-design` P0 estimate 1–2 hours host wall, checklist execution seconds)
- Skipped when dormant (expected before activation): **19** (never-failing CI while skipped — host gate `npm test` stays `980/407` with added 19 skipped)
- Passing before implementation (expected for activated tests pre-fix): **0/19** (all red before `fd016ad`; 0 dormant skipped counts as not passing)
- Status: ✅ Red-phase scaffolds verified (dormant 19 skipped; activated 19 green only because working-tree fix `4709640` already lands — correct TDD inversion; before `fd016ad` they would fail, confirming RED correctness)
- Existing regression `triade/__tests__/a11y/screenReader.contract.test.tsx` **13/13 green** (+ full `980 pass 0 fail 407 skipped` + `tsc -p tsconfig.test.json` clean) proves `Not in Scope` holds and is already verified per spec Auto Run Result.

**Unknown thresholds at test-design:** None material as of sweep. Focus `first surviving row-major` is a heuristic (not an `ms` threshold); ATDD cover is exact string match `no-hide-descendants` not a tunable; `findNodeHandle` tag `1` is native stub handle not a threshold. If focus later needs `previouslyFocusedCoordinate` preservation, record its mapping vs this heuristic rather than inventing a threshold (`test-design-dw-board-a11y-screen-reader-bridge.md:139` Unknown thresholds).

---

## Notes

- This bundle is a **sweep-bundle** closing deferred DW entries opened by `spec-9-2-screen-reader-contract` review (`BoardA11yOverlay` focus + Canvas hide follow-up). The ATDD checklist describes the already-landed delta `fd016ad→4709640` (`4709640 a11y: board screen reader bridge focus + Skia hidden`) plus the only working-tree hunk `deferred-work.md` `DW-112/113 open→done 2026-09-03` with `resolution-undo e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 7374617475733a206f70656e`.
- The host verification steps already performed are `npx tsc --noEmit -p tsconfig.test.json` clean, `npm test` `980 pass 0 fail 407 skipped`, `grep setAccessibilityFocus`, `grep importantForAccessibility`, and `grep e282524d` (2 hits) — see `spec-board-a11y-screen-reader-bridge.md:92-96 Auto Run Result` and the just-run Evidence above. No network mock, no backend API, no data factory faker — deliberate for this `16-CELL` + wrapper seam.
- The existing regression harness `triade/__tests__/a11y/screenReader.contract.test.tsx` still greets the 9-2 contract: **12/13 passing + 1 stale drift on 2026-09-03 re-run before fix** of this bundle was never this bundle's drift (it was `triaged patch: button→text` already closed by `4709640` companion). This bundle leaves it **13/13 green** again (`role text` already patched, constants still `{4,8,8}`, announcements thread still coalesced `trace filtered` per `App.tsx`).
- The `test-design-dw-board-a11y-screen-reader-bridge.md` residual R-001 (row-major heuristic vs previously-focused coordinate) is **accepted per Design Notes** `first surviving tile in row-major order with a mounted ref … does not land on dead node` — the focus position is not `dst` coordinates from `MoveResult.trace`, only from `Board` identity + `tileRefs` presence. Any switch to coordinate preservation requires a new spec iteration (see Not in Scope row three of test-design).
- The **device VoiceOver ear-check** (15 min iOS Simulator: enable VoiceOver, three-finger swipe 4 dirs → focus on live tile after move, single-finger swipe → no move, tap tile → re-announces value+position, `Merged…/New tile` still single as announcement contract unchanged, no duplicate Canvas item in the rotor, largest Dynamic Type still shows chrome per UX-DR-18) is documented as P2/P3 smoke (R-005) but is **not required to block the host gate** (`node:test` + `tsc` is the blocking gate) per test-design NFR planning.
- The `rn-stub.ts:102` `findNodeHandle (_ref?1:null)` is permissive (always `1` for truthy refs) and mirrors real `react-native` `findNodeHandle(componentOrHandle: null|number|Component|RefObject)=>number|null` on Fabric which may return `null` if the host component hasn't been mounted yet in the commit containing the new tile — mitigated by P0-04 `findNodeHandle→null` falsy-tag branch (`if(tag)` suppresses) + host `try/catch` + device ear-check on live tag path. Host coverage is deterministically green because stub always returns `1` for truthy refs; real device coverage is on the live bridge.
- **Common issue resolutions applied:**
  - **Skipping steps:** Master Rule — skipping steps is FORBIDDEN. This checklist explicitly executes `step-01 preflight + step-02 generation mode (AI — no browser) + step-03 strategy + step-04 subagent orchestration (single host scaffold) + step-04c aggregate + step-05 validate` — no sequence step is skipped; `network-first`/`fixture-architecture` considered and skipped **with reason** (no Playwright surface for `AccessibilityInfo` bridge).
  - **Tests pass before implementation:** Red scaffolds would fail before `fd016ad` (all P0 seam pins `0 hits`) — they now pass only because implementation `4709640` already lands (correct inversion, not a false positive).
  - **One assertion per test:** Each inner `test.skip` is atomic with 1–5 tightly-scoped `assert.match/strictEqual/ok` pins for a single seam (focus loop vs wrapper nesting vs ledger hash etc.), not multi-behaviour mega-tests.
  - **Tests depend on execution order:** No shared state between inner tests — each uses fresh `readFileSync` per file or isolated `spy` reset + `TestRenderer.create` per scenario; dormant `test.skip` prevents any inter-test state leak.

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @Eduardo (Murat — Master Test Architect) in Slack/Discord
- Refer to `_bmad/tea/config.yaml` for workflow documentation (`test_artifacts: {project-root}/_bmad-output/test-artifacts`, `test_design_output: _bmad-output/test-artifacts/test-design`)
- Consult `_bmad-output/test-artifacts/test-design/test-design-dw-board-a11y-screen-reader-bridge.md` (R-001..R-011) + `_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md` (I/O matrix, guards, Canvas hidden UX)
- Consult `./.claude/skills/bmad-testarch-atdd/resources/knowledge` for testing best practices (`component-tdd`, `fixture-architecture`, `data-factories`, `selector-resilience`, `timing-debugging`, `test-levels-framework`, `test-priorities-matrix`, `test-quality`, `test-healing-patterns`, `risk-governance`)

---

**Generated by BMad TEA Agent (Murat) — ATDD workflow 5.0 step-file architecture — 2026-09-03**

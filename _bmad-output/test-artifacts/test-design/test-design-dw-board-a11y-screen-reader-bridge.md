---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-03'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - 'triade/src/a11y/boardAccessibility.tsx'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/test-utils/rn-stub.ts'
  - 'triade/__tests__/a11y/screenReader.contract.test.tsx'
  - 'triade/src/a11y/announcements.ts'
  - 'triade/src/a11y/screenReaderGestures.ts'
  - 'triade/src/i18n/locales/en.json'
  - 'triade/src/i18n/locales/pt.json'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-board-a11y-screen-reader-bridge — BoardA11yOverlay focus + Skia Canvas hide (DW-112/113)

**Date:** 2026-09-03
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-board-a11y-screen-reader-bridge` (DW-112, DW-113)
**Scope:** Risk-based test design for the working-tree delta that closes DW-112 (BoardA11yOverlay `setAccessibilityFocus` with vanished-tile guard) and DW-113 (GameBoard Canvas `importantForAccessibility="no-hide-descendants"`).

> **Delta under assessment:** Commit `4709640 a11y: board screen reader bridge focus + Skia hidden` (vs baseline `fd016ad sweep dw-gameover-hardware-back-handler`) + working-tree `deferred-work.md` flip `DW-112 open→done 2026-09-03` / `DW-113 open→done 2026-09-03` (`resolution-undo e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 7374617475733a206f70656e`):
> - `triade/src/a11y/boardAccessibility.tsx:1-83` — `import { findNodeHandle }` + `useEffect/useRef` + `tileRefs Map<string,any> keyed a11y-r-c` with ref callback `set/delete` + `isFirstRenderRef + prevBoardRef` + `useEffect([board])` that on non-first mount, when `AccessibilityInfo.setAccessibilityFocus` exists and `Array.isArray(board)`, iterates row-major for first surviving `board[r][c] !== null` whose `tileRefs.get(key)` exists, then `findNodeHandle(ref)` → `ai.setAccessibilityFocus(tag)` inside `try/catch`, early-return on missing API / non-array / null tag / first mount (spec `triade/src/a11y/boardAccessibility.tsx:38-83`).
> - `triade/src/render/GameBoard.tsx:658-678` — Canvas wrapper changed from `<Canvas>` direct child of `<Animated.View style={shakeStyle}>` to `<View importantForAccessibility="no-hide-descendants" accessible={false} style={{width:safeWidth,height:safeWidth}}><Canvas …></Canvas></View>`; inner View preserves ATDD chrome guard string `<Animated.View style={shakeStyle}>` while outer Canvas subtree is hidden (`triade/src/render/GameBoard.tsx:657-678`).
> - `triade/test-utils/rn-stub.ts:102` — `export const findNodeHandle = (_ref:any)=> (_ref ? 1 : null);` headless stub for `node --import tsx --test` so focus path executes without native runtime (`triade/test-utils/rn-stub.ts:102`).
> - `_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md:1-98` — intent contract (I/O matrix focus-after-move / vanished-tile / canvas-hidden) + code map + acceptance (4 bullets) + verification + residual risks (first-surviving heuristic).
> - `_bmad-output/implementation-artifacts/deferred-work.md:985-998` — both DW-112/113 flipped `status: open → done 2026-09-03` with identical `resolution: resolved by sweep bundle dw-board-a11y-screen-reader-bridge` + `resolution-undo: e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 7374617475733a206f70656e` (`open` hex) — `git diff HEAD -- deferred-work.md` is the only working-tree hunk.
> - No engine/announcements/gestures change: `git diff 4709640^..4709640 --stat -- triade/src/engine` empty, `triade/src/a11y/announcements.ts` empty, `triade/src/a11y/screenReaderGestures.ts` empty (announce/tone/three-finger gate unchanged, contract still `announceForAccessibilityWithOptions queue:true` fallback + `isThreeFingerMove===3` strict).
> - `sprint-status.yaml` is **orchestrator-owned** — intentionally not in scope (`never write it, and never revert a change to it`; `git diff HEAD -- sprint-status.yaml` must stay empty).

---

## Executive Summary

**Scope:** Close deferred DW-112/DW-113 that the `9-2-screen-reader-contract` review opened — VoiceOver/TalkBack focus was left on a dead node after a move (re-render without `setAccessibilityFocus`) and the Skia `Canvas` exposed duplicate/empty a11y nodes alongside the RN `BoardA11yOverlay` bridge. The sweep confines the fix to two presentation-a11y seams: `BoardA11yOverlay` now moves focus on `board` prop change via `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(ref))` with a vanished-tile guard (first surviving non-null tile whose ref is mounted, row-major), and `GameBoard` hides the Skia subtree via a single `importantForAccessibility="no-hide-descendants" accessible={false}` wrapper. Engine board math, `announceForAccessibility` contract (merge coalesced, spawn, score throttle 500 ms, game-over/new-record, noop silent), `isThreeFingerMove` gate, ToneScreen pause, Dynamic Type hardening, and all 980 passing host tests + `tsc -p tsconfig.test.json` clean remain invariant.

**Risk Summary:**

- Total risks identified: 11
- High-priority risks (score ≥6): 3 (focus heuristic row-major vs previously-focused coordinate; `useEffect` timing — effect fires before/after Pressable refs commit on same commit; Canvas hide wrapper nesting — if it hides the overlay or breaks ATDD chrome guard)
- Critical categories: BUS / TECH (VoiceOver focus continuity after move + dead-node guard; Canvas duplicate-node suppression vs Skia purity)

**Coverage Summary:**

- P0 scenarios: 8 groups (focus on surviving tile not dead node, first-mount no focus, missing-API / non-array / null-handle never throw, Canvas wrapper `no-hide-descendants + accessible false`, ref-callback map lifecycle, existing engine/a11y contracts still green — ~1–2 hours host)
- P1 scenarios: 7 groups (source pins `setAccessibilityFocus` / `findNodeHandle` / `tileRefs` / `isFirstRenderRef` / `try/catch` / `importantForAccessibility` + `rn-stub.findNodeHandle`, overlay `pointerEvents box-none + accessible/accessibilityRole text + accessibilityLabel engine-derived`, app gate untouched — ~2–4 hours)
- P2/P3 scenarios: 6 groups (jagged board / NaN width guards, no engine duplication, `announceForAccessibility` contract still thin-view, focus heuristic doc + manual VoiceOver ear-check, talkBack divergence, ledger hash — ~1–3 hours)
- **Total effort**: ~4–9 hours (~0.5–1.2 days; host-only `node:test` + `react-test-renderer` + `tsc`, one optional 15-min iOS Simulator VoiceOver ear-check)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/spawn/score/scoreThrottle/ceilingDetector/tierForCeiling/matchStats/forfeitedContinue/rng reseed, `layout.ts`/`boardSize`, `preview.ts` pot/tier, Skia animation `shake/punch/bullet`, `persist/hydration`, AdMob/RevenueCat/Billing, Epics 8/9-3/9-4/10-11 monetization** | No file in delta duplicates engine rules or touches merge/spawn/weights/tier/pot/stats/render beyond visual nesting. `git diff fd016ad..4709640 -- triade/src/engine` empty; `announcements.ts` empty; `GameBoard` `shakeStyle` + `bulletFlash` + `tiles` logic untouched beyond Canvas wrapper. | Existing `npm test` full gate (`980 pass / 407 skipped` per spec Auto Run Result) + `engine.purity` + `layout.test.ts` remain invariant; this plan only checks `rg -n "src/engine" triade/src/a11y/boardAccessibility.tsx` has only `import type {Board}` + `rg -n "merge|spawn|score" boardAccessibility.tsx ==0` (no engine duplication). |
| **Changing `announceForAccessibility` contract (queue true vs TalkBack fallback), `announceMerge` coalescing, `announceScoreThrottled 500 ms`, `announceGameOver/newRecord`, i18n `a11y.*` keys, `isThreeFingerMove===3` gate, ToneScreen `paused = voiceOverActive \|\| announcementPending`, Dynamic Type `allowFontScaling`** | Delta explicitly keeps tile labels engine-derived `i18n.t('a11y.tile', {value,row,col+1})` + Skia visual-only + overlay bridge owns a11y + `announceForAccessibility` contract unchanged per spec `Always`. `gestures/announcements` not in `--stat`. | Pin via existing `screenReader.contract.test.tsx` 13 P0 contracts (gate labels, gate 3-finger, announcements EN+PT, noop silent, throttle, Tone src pins, app gate src pins, Dynamic Type `allowFontScaling`) — keep green (`npm test -- screenReader.contract.test.tsx` 13/13). This plan adds no new announce/i18n assertion. |
| **Replacing focus heuristic with previously-focused coordinate preservation, adding `AccessibilityInfo.isScreenReaderEnabled` gating inside BoardA11yOverlay, persisting focus to store, or exposing Skia tile nodes as accessible** | Spec `Never: Duplicate engine merge/spawn logic in UI; expose Skia nodes as accessible; add hardcoded strings` + design notes: "Focus target is first surviving tile in row-major order … avoids tracking previous VoiceOver focus … acceptable per intent guard for vanished tile". Following spec keeps fix small and avoids storing previous VoiceOver focus. | Documented as accepted heuristic (residual risk R-001); any switch to coordinate preservation requires a new spec iteration — this plan validates the shipped row-major invariant only. |
| **Device farm matrix, visual golden screenshot, Figma diff, haptics weight, frame `p99 <16.7 ms` micro-bench beyond existing `layoutFor` bench** | Delta is RN `View/Pressable/findNodeHandle` + Canvas wrapper, no Skia draw change, no per-frame allocation. | Rely on existing Epic 8 nightly `useFrameRateBaseline` lane for `p99`; this plan scopes perf to host mount/unmount timing `<1 ms` per board change. |
| **Editing `sprint-status.yaml` or deferred-work beyond DW-112 + DW-113 `open → done 2026-09-03` with `resolution-undo e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75 7374617475733a206f70656e`** | `sprint-status.yaml` is orchestrator-owned (`never write it, and never revert a change to it`). `deferred-work.md` change is exactly 2 entries flipped with identical `resolution-undo` carrying hash `e282524d…` + `7374617475733a206f70656e` hex of `status: open`. | This plan never writes `sprint-status.yaml`; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in CI. Ledger verified via `rg -n "e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75" deferred-work.md ==2` (one per DW) + `rg -n "resolution-undo" deferred-work.md` health. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `BoardA11yOverlay` is `(board: Board, width: number) → ReactTree` with a single commit-phase side effect (`useEffect([board])` → `setAccessibilityFocus`). The host driver is `node --import tsx --test` + `react-test-renderer` + stub `react-native` via `triade/test-utils/rn-stub.ts`. All focus behavior is controllable headless: replace `AccessibilityInfo.setAccessibilityFocus = (tag)=>spy.calls.push(tag)` and `findNodeHandle = (ref)=> spy.handles.push(ref) || 1` before `TestRenderer.create(…BoardA11yOverlay…)`, mount with `board1` (`[[3,null…]]`), then `renderer.update(…BoardA11yOverlay board2…)` where `board2` has `board1` tile vanished and `board2[1][1]=12` is new; spy captures single `setAccessibilityFocus(1)` not for vanished key. First-mount no-op is controllable by asserting `spy.calls.length===0` after initial `create`. Missing-API guard by `delete (AccessibilityInfo as any).setAccessibilityFocus` before update → spy stays 0. Invalid board by `board: null as any` → renders `null` and effect early-returns. Width by `NaN/Infinity/0` → `safeWidth=1` guard already host-inspectable. Canvas hide is controllable without an emulator: inspect `GameBoard.tsx` source and rendered tree wrapper View props `importantForAccessibility` + `accessible`.

**Observability — Good, host-inspectable without device.** Focus is observable via spy `calls/tag` + `findNodeHandle` arg (the mounted `ref` object) without an iOS simulator. The vanished-tile guard is observable: after `board` prop removes tile `a11y-0-0`, its ref was deleted by the callback `ref===null → delete`, so scanning for `targetKey` must skip it; a test can pre-populate `board` where first surviving tile has no ref (never mounted) and assert fallback to next surviving with ref or no call. `tileRefs` lifecycle is observable via number of `Pressable` with `accessibilityLabel` matching `board[r][c]` after mount/update. Canvas hide is observable via static `src.includes('importantForAccessibility="no-hide-descendants"')` + static `src.includes('accessible={false}')` and via rendered `GameBoard` shallow wrapper `findByProps {importantForAccessibility:"no-hide-descendants"}` (the inner View wrapping `<Canvas>`). The ATDD chrome guard is observable via source string `"<Animated.View style={shakeStyle}>"` still present line ~657. `tsc -p tsconfig.test.json` is the type gate — `rn-stub.ts` `findNodeHandle` stub satisfies it while real `react-native` `findNodeHandle` signature `findNodeHandle(componentOrHandle: null | number | React.Component<any,any> | React.RefObject<any>) => number | null` is compatible.

**Reliability — Strong on host, two edges need pinning.** Host `node:test` deterministically covers: first-mount no call + second update with surviving tile → one `setAccessibilityFocus(1)` + missing-API no call + non-array no call + null-handle no call + valid transition `board1→board2` after vanished tile skips dead node. The current tree is `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean (no new `@ts-ignore`) and `tsc --noEmit --project triade/tsconfig.test.json` clean (stub path-map), so no TS drift is hiding. Two thin surfaces: (a) `useEffect` order — the `board` effect must see committed `tileRefs` from the same render's `Pressable ref` callbacks; React commits refs before passive effects, so the effect correctly reads the just-committed map, but an off-by-one commit (e.g., concurrent `board` prop + `width` prop change) still lands on the first surviving new tile, not a stale ref. (b) Real iOS VoiceOver focus — host `findNodeHandle` stub always returns `1`, real `findNodeHandle` returns a native tag derived from the view handle and `setAccessibilityFocus` moves VoiceOver focus asynchronously via the bridge — only an iOS Simulator ear-check confirms the focus actually moves and no duplicate Canvas nodes are announced (`R-005`). No engine/layout change in delta (`engine` empty diff), so reliability is isolated to `a11y/boardAccessibility.tsx` + `render/GameBoard.tsx` + `rn-stub.ts`.

**Testability Risks:** Three surfaces thin but mitigated: (a) `isFirstRenderRef` uses a mutable ref flipped inside the effect; concurrent-mode double-invoke in StrictMode dev could flip it on mount twice and still suppress the first real board change — host `react-test-renderer` without StrictMode does not hit it, but prod StrictMode mounting would suppress one extra `board` update (low prob, acceptable). (b) `tileRefs` is a `useRef<Map>` mutated via callback `ref={(el)=>{ if(el) set else delete }}` without `useLayoutEffect` — key `a11y-r-c` stable, but if `board` shrinks from 16 → 0 null cells, stale map entries for removed coordinates are correctly deleted via `ref null` callbacks at commit, yet `prevBoardRef.current` is not used for guard (future heuristic using previous coordinate would need it). (c) `findNodeHandle` import from `react-native` vs stub divergence: real returns `number|null`, stub returns `1` for truthy ref — a falsy ref correctly returns `null` so the `if(tag) ai.setAccessibilityFocus(tag)` guard suppresses the call, matching real behavior; still no test today asserts the null-tag branch via falsy ref double unless added as P0 edge.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | BUS / TECH | **Focus heuristic — first surviving tile row-major vs previously-focused coordinate.** `boardAccessibility.tsx:61-75` scans `board` row-major and picks the first non-null tile whose `tileRefs.current.get(key)` exists, without remembering which tile VoiceOver had focused before the move. After a move that merges `board[0][0]=8` into `board[0][3]=16`, VoiceOver jumps to `a11y-0-0` if still non-null (or next surviving), not specifically to the destination `0,3`. Acceptable per spec "does not land on dead node" invariant, but for a blind user following a tile, the jump may be disorienting (extra explore gestures to re-find the merged tile). | 2 | 3 | **6** | Keep row-major heuristic (small heuristic, avoids storing previous focus + `prevBoard` coordinate mapping which would need to track `Board` identity vs render identity). Mitigate: re-render correctness verified (P0 label parity board→6 + P0 focus skips dead node), `prevBoardRef` exists for future preservation if UX requests coordinate preservation. Gate: P0 `vanished tile guard` — vanished tile's key never receives `setAccessibilityFocus`; device ear-check (P3 15 min) confirms focus lands on a live tile after a merge with VoiceOver on. Owner sign-off at merge that row-major is acceptable residual. | FE / QA / UX reviewer | This sweep (P0 already landed; device ear-check before merge if simulator available; future spec iteration if UX requests dst preservation) |
| R-002 | TECH | **`useEffect` timing — focus effect reads `tileRefs` committed in same render vs stale ref.** `useEffect([board])` runs as passive effect after commit, reading `tileRefs.current.get(key)` populated by `Pressable ref` callbacks committed in the same commit; if React batches `board` + `width` prop changes that recompute `cell` and re-key tiles, the effect must see the just-committed refs not the prior commit's refs. Current code relies on React's passive-effect ordering; a future migration to concurrent rendering or to `useLayoutEffect` for focus could change whether `findNodeHandle` sees a mounted handle yet. Risk: effect scans for `a11y-0-0` whose ref callback hasn't fired yet → `get(key)===undefined` → no `setAccessibilityFocus` call even though a surviving tile exists. | 2 | 3 | **6** | Keep passive `useEffect` (not `useLayoutEffect`) — refs are already committed before passive effects in React 19 / `react-test-renderer`; no handle is needed before commit. Mitigate: P0 mount-then-update pattern — `create(Overlay board1)` (first mount no focus) → `update(Overlay board2)` where `board2`'s first surviving tile key was present in `board2` and its ref was committed in the update commit; spy `setAccessibilityFocus` called once. Also guard `if(!Array.isArray(board)) return` + `if(tag) ai.setAccessibilityFocus(tag)` so no throw even if stale. Gate: P0 `[P0] focus after board change targets surviving tile` + `[P0] null handle suppressed`. | FE | This sweep (P0 already green; keep) |
| R-003 | TECH | **Canvas wrapper `importantForAccessibility="no-hide-descendants"` nests incorrectly or hides overlay, or ATDD chrome guard breaks.** `GameBoard.tsx:658` introduces `<View importantForAccessibility="no-hide-descendants" accessible={false}>` wrapping `<Canvas>` inside `<Animated.View style={shakeStyle}>`. If the wrapper is placed one level too high (wrapping the overlay too) or `accessible={false}` omitted, VoiceOver would either still see duplicate Skia nodes or would hide the `BoardA11yOverlay` Pressables. Spec Design Notes explicitly warn: "Canvas hiding uses inner View wrapper to preserve ATDD string match `<Animated.View style={shakeStyle}>`." A mis-nest also breaks the existing ATDD chrome guard that asserts `<Animated.View style={shakeStyle}>` directly wraps Canvas. | 2 | 3 | **6** | Keep wrapper as inner View only around Canvas (not around overlay). Gate: P0 static `rg -n 'importantForAccessibility="no-hide-descendants"' GameBoard.tsx ==1` + `rg -n 'accessible=\{false\}' GameBoard.tsx` near Canvas wrapper + P0 source pin `rg -n "<Animated.View style=\{shakeStyle\}>" GameBoard.tsx ==1` (chrome guard preserved) + host renderer check wrapper View props. Device ear-check (P3): VoiceOver reads only overlay tile labels, no extra Canvas item. | FE / QA | This sweep (P0 pins already in spec Verification; device ear-check before merge) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **`tileRefs` Map lifecycle — stale keys after board shrinks or `board` becomes jagged.** `Pressable ref` callback deletes on `el===null`, but if `board` changes from 16 non-null to fewer non-null without a full re-key (React reconciles same `key="a11y-r-c"` nodes), stale map entries for removed coordinates rely solely on the `null` callback. A jagged `board` like `[[1,null],[null]]` (test-only) still iterates correctly due to `!Array.isArray(row) continue`, but a map entry for `a11y-0-1` that was null (never mounted) correctly never existed. | 2 | 2 | 4 | Keep `ref={(el)=>{ if(el) set else delete }}` + `Array.isArray(row) continue` guards + `value===null→null` short-circuit. Gate: P0 invalid-input suite — mount `BoardA11yOverlay board:null as any` → null render no throw, jagged board → no throw + only present keys in map, `width NaN/Infinity` → safeWidth 1 still renders. |
| R-005 | TECH / BUS | **`AccessibilityInfo.setAccessibilityFocus` missing or `findNodeHandle` returns null branch — silent no-op may look like fix not landed on real device.** When API is absent (`ai.setAccessibilityFocus` undefined on older RN/Android) or stub returns null for falsy ref, effect suppresses focus silently (no `setAccessibilityFocus(1)` captured). Host P0 stubs it as present so `setAccessibilityFocus` path is tested, but real TalkBack may not expose `setAccessibilityFocus` (it uses `AccessibilityInfo` differently). The silent fallback is correct per spec "never throws" but a silent no-op could be mistaken for success when VoiceOver still sits on dead node. | 2 | 2 | 4 | Keep early-return `if (!ai || typeof ai.setAccessibilityFocus !== 'function') { prevBoardRef.current=board; return; }` + `if (!tag) return` guards + try/catch. Gate: P0 `[P0] missing API never throws and never calls` — `delete (AccessibilityInfo as any).setAccessibilityFocus` then board update → `spy.calls===0`; also `findNodeHandle` stub `null` branch. Document silent no-op as intentional guarded degradation. |
| R-006 | TECH | **Stub `findNodeHandle` divergence — stub always returns `1` for truthy ref, real `findNodeHandle` may return `null` for offscreen/uncached refs on Fabric.** `triade/test-utils/rn-stub.ts:102` `(_ref:any)=> (_ref?1:null)` is permissive; real `react-native` `findNodeHandle` on Fabric/Nitro could return `null` if the host component hasn't been mounted yet in the commit containing the new tile (e.g., first tile after empty board). Host tests would pass with `1` while real device returns `null` and effect no-ops. | 1 | 3 | 3 | Keep stub permissive for host gate but add a P0 edge case stubbing `findNodeHandle` to `()=>null` asserting no `setAccessibilityFocus` call and no throw. Real device ear-check covers the live tag path. |
| R-007 | TECH | **`isFirstRenderRef` + `prevBoardRef` unused for future coordinate preservation, and `prevBoardRef` write timing could mask the first real move if initial board is `null`.** The ref is set after early return on first render; if initial `board` prop is invalid (`null`) then first valid board update is still treated as second render and focus fires once (correct). But `prevBoardRef` is never read — future feature that maps previous focused coordinate to new board via `prevBoardRef` would need a fresh prop. | 1 | 2 | 2 | Monitor — keep `isFirstRenderRef` boolean (cleared once) and `prevBoardRef` write on every return path (`missing API`, `non-array`, `tag falsy`) so no missed write to `null`. Gate: P0 `isFirstRenderRef first mount no focus, second mount focuses` transition. |
| R-008 | TECH / DATA | **Board shape edge — non-array `board`, jagged rows, `NaN/Infinity` width, tile value 0.** `board` is `Board = (number|null)[][]` 4×4 by engine contract, but overlay guards `!Array.isArray(board) → null` and per-row `!Array.isArray(row) → null` and `Number.isFinite(width)` + safeWidth `Math.max(1,…)`. Tile value `0` is falsy but not `null` (engine never emits 0 today but could) — `value===null→null` correctly still renders a Pressable for 0, but `if(row[c]!==null)` in the focus scanner correctly treats 0 as surviving. | 1 | 3 | 3 | Keep guards `!Array.isArray(board)` + per-row `!Array.isArray(row)` + safeWidth `Math.max(1, Number.isFinite(width)?width:1)` + focus loop `if(row[c]!==null)` (not `if(row[c])`). Gate: P0 board-null/jagged/NaN-width suite already in 9-2 lineage. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | PERF | **Focus effect scans at most 16 cells per board change — O(16) synchronous with no per-frame allocation or Skia draw, no Reanimated worklet.** `board.length` 4×4 bound, `findNodeHandle` + `setAccessibilityFocus` is fire-and-forget bridge, `tileRefs.get` O(1). No new re-render fan-out beyond prop change. | 1 | 1 | 1 | Monitor — `npm test` timing `<15 min` already includes stub; no bench lane needed (frame budget unchanged). |
| R-010 | TECH | **Overlay `pointerEvents` vs wrapper `accessible` — `BoardA11yOverlay` root is `pointerEvents="box-none" importantForAccessibility="no"` with per-tile `Pressable accessible accessibilityRole="text"`; `GameBoard` Canvas wrapper is `importantForAccessibility="no-hide-descendants" accessible={false}`. A `pointerEvents` or `importantForAccessibility` drift could make Pressables untouchable when VoiceOver off or hide them when on.** | 1 | 2 | 2 | Monitor — static `rg -n 'pointerEvents="box-none"' boardAccessibility.tsx ==1` + `rg -n 'importantForAccessibility="no"' boardAccessibility.tsx ==1` + wrapper `no-hide-descendants + accessible false` pin; manual smoke: pan works when VoiceOver off, tile tap re-announces when on. |
| R-011 | OPS | **Ledger `resolution-undo e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75` (TT hash of prior `status: open`) + `7374617475733a206f70656e` coupling — DW-112 + DW-113 share same hash because both flipped from same baseline; a follow-on sweep reopening without hash loses revert trail.** | 1 | 2 | 2 | Monitor — ledger already records `resolution-undo: e282524d… 7374617475733a206f70656e` per entry; any reopen must preserve it. This plan never writes `sprint-status.yaml`; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty. Health: `rg -n "e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75" deferred-work.md ==2` + `rg -n "resolution-undo" deferred-work.md` counts. |

### Risk Category Legend

- **TECH**: Technical (focus effect + tileRefs + findNodeHandle, Canvas ATDD wrapper, board shape, pointerEvents)
- **SEC**: Security — none this sweep (overlay is pure presentation, no auth/storage/crypto)
- **PERF**: Performance — O(16) scan `<1 ms` (R-009), no App re-render fan-out
- **DATA**: Data Integrity — overlay never mutates engine `Board/MoveResult`; labels `board[r][c]` fidelity (R-008)
- **BUS**: Business Impact — VoiceOver focus continuity (row-major vs dst) + duplicate Canvas announcement (user-perceived a11y, App Store a11y pass)
- **OPS**: Operations (ledger `e282524d…` 64-hex + `7374617475733a206f70656e`, `sprint-status.yaml` orchestrator-owned R-011)

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-board-a11y-screen-reader-bridge` touches **accessibility — screen-reader focus contract + Canvas ATDD hygiene**, **reliability (never-throw board/accessibility guards)**, **performance (no per-frame cost)**, **maintainability (single focus effect + single wrapper + stub)**, and **offline/installability** unchanged (pure TS + stub `findNodeHandle`, no native module beyond `react-native`).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Accessibility — VoiceOver focus continuity after move + Canvas hide | VoiceOver focus must not land on a dead node after a board move: when `board` prop changes, `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(survivingRef))` must be called with a surviving tile's node handle and never with a vanished tile's handle; on first mount no call. Canvas wrapper must have `importantForAccessibility="no-hide-descendants" accessible={false}` so only overlay Pressables are announced (no Skia duplicate). Spec I/O matrix: focus-after-move / vanished-tile guard / canvas-hidden. | R-001, R-002, R-003, R-005, R-006 | Unit host via `react-test-renderer` + stubs: first-mount `→0` calls; board update `[[3,null…]]→[[6 vulnerable]]` → `setAccessibilityFocus(1)` once; delete `setAccessibilityFocus` → `0` calls; `findNodeHandle→null` → `0` calls; vanished key skipped (stale ref not in new board not chosen). Static: `rg -n setAccessibilityFocus boardAccessibility.tsx` 2 hits (one guard `typeof ai.setAccessibilityFocus`, one call `ai.setAccessibilityFocus(tag)`) + `rg -n findNodeHandle` 2 hits (import + `findNodeHandle(targetRef)`) + `rg -n 'importantForAccessibility="no-hide-descendants"' GameBoard.tsx` 1 hit + `rg -n "accessible=\{false\}"` near Canvas. Manual VoiceOver ear-check (P3 15 min): iOS Simulator VoiceOver on → three-finger swipe → focus on live tile after move, no duplicate Canvas item. | `triade/__tests__/a11y/screenReader.contract.test.tsx` 13 P0 still green + new focus edge cases (this TD) green; `boardAccessibility.tsx:38-83` diff + `GameBoard.tsx:658-678` diff + `rn-stub.ts:102` + spies `calls/tag` tables + VoiceOver manual notes (optional). |
| Accessibility — screen-reader contract still 100% (labels/announcements/gate/Tone/Dynamic Type) | Previous 9-2 contract 100% AC contract pinned (engine-derived `accessibilityLabel="{value} row {r+1} col {c+1}"` EN+PT, `accessibilityRole="text"` `accessible`, merge coalesced, throttle 500 ms, noop silent, three-finger gate `===3` strict, Tone pause, Dynamic Type `allowFontScaling`) must stay 100% after focus shim — no announce string or i18n drift. | — | `npm test -- triade/__tests__/a11y/screenReader.contract.test.tsx` 13/13 + `rg -n "i18n.t" announcements.ts` unchanged + `rn-stub` `AccessibilityInfo` surface still there. | `screenReader.contract.test.tsx` green + `en.json a11y.*` diff empty. |
| Reliability — never throw on any `board/width/AccessibilityInfo` shape | Overlay never throws on invalid board (`null/jagged/NaN/Infinity width/board non-array/row non-array`) and focus effect never throws when `setAccessibilityFocus` missing / `findNodeHandle` nullish / try/catch path. GameBoard wrapper never throws on same invalid `width` (`safeWidth` guard). | R-004, R-008 | Unit negative-path: mount `BoardA11yOverlay board:null as any`; jagged `[[1,null],[null]]`; `width NaN/Infinity/0` → `safeWidth=1`, assert no throw and 0 focus calls; focus path try/catch — `findNodeHandle` throws → still no throw. | `assert.doesNotThrow` suites green. |
| Performance / frame budget | No per-frame allocation, no Reanimated worklet, no Skia draw beyond existing `Canvas`; focus effect is O(16) single scan per board change fire-and-forget, wrapper View O(1). Must not regress frame budget NFR-11/ADR-04 (engine <2 ms, frame <8 ms, p99 <16.7 ms). Threshold unchanged. | R-009 | Host bench: `layoutFor`/`useSyncedLayout` <1 ms (existing `layout.test.ts`); focus shim timing `<1 ms` per board change via `performance.now` micro-bench inside P0. Device `useFrameRateBaseline` stats after 2-min play (Epic 8 lane) re-run as nightly reuse — unchanged. | `layout.test.ts` timings; `useFrameRateBaseline` log `fps/p99Ms/frames` if nightly runs (defer to Epic 8 nightly, reuse). |
| Maintainability | `src/a11y/boardAccessibility.tsx` is thin view: derives labels from `Board` prop only, cost math `BOARD_PADDING/CELL_GAP/GRID/safeWidth` equal `GameBoard`, constants `GRID/BOARD_PADDING/CELL_GAP/__BOARD_A11Y_CONSTANTS` equal `GameBoard` constants (pinned), focus logic single `useEffect([board])` + `tileRefs Map` + `isFirstRenderRef`, no scattered `AccessibilityInfo` outside `src/a11y` + Tone/App gate. Canvas hide is single wrapper View, not scattered. | R-004 | Static gates: `__BOARD_A11Y_CONSTANTS deepStrictEqual {4,8,8}` + `rg -n announceForAccessibility` only in `src/a11y/announcements.ts` + focus `setAccessibilityFocus` only in `boardAccessibility.tsx` (one file) + wrapper count `rg -n 'importantForAccessibility="no-hide-descendants"' GameBoard.tsx ==1`. | Source scan + contract `deepStrictEqual` + `engine.purity` (new `src/a11y` focus logic not required pure but must not import `engine` beyond `Board` type). |
| Offline / Installability | No new network/native dependency, no extra native module beyond `react-native` primitives (`findNodeHandle` is already in `react-native`, `AccessibilityInfo` already present); `rn-stub` change is headless-only. App remains installable+offline (NFR-2/NFR-6). | — | `npx tsc --noEmit -p tsconfig.test.json` clean + `npx tsc --noEmit -p triade/tsconfig.json` clean (spot) + `npm test` green; `expo-doctor` no drift. | `tsc --noEmit` clean + `npm test` pass. |

**Unknown thresholds:** None material. Focus "first surviving row-major" is a heuristic (not a ms threshold); ATDD cover is exact string match `no-hide-descendants` not a tunable; `findNodeHandle` tag is native handle not a threshold. If focus later needs `previouslyFocusedCoordinate` preservation, record its mapping vs this heuristic rather than inventing a threshold.

---

## Entry Criteria

- [ ] Spec `_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md:1-98` reviewed revision (`baseline_revision fd016ad1a358 → final bfeea105d4db` pinned) and `screenReader.contract.test.tsx` lineage available.
- [ ] `triade/src/engine/**` byte-identical to baseline (ADR-01 purity; `git diff --stat -- triade/src/engine` empty for engine rules; `src/engine` not touched — a11y may only import `Board` type).
- [ ] Branch on SDK 57 pinned versions (expo ~57.0.11, Skia 2.6.2, Reanimated 4.x — existing matrix; sweep installs no new deps, only `findNodeHandle` import already available in `react-native` 0.86.2).
- [ ] Host test runner `npm test` green at 980/980 baseline before delta (captured in spec Auto Run Result: 980 pass, 0 fail, 407 skipped + `tsc --noEmit -p tsconfig.test.json` clean).
- [ ] `AccessibilityInfo.setAccessibilityFocus` + `findNodeHandle` surface exists in real `react-native` 0.86.2 (contracts: `setAccessibilityFocus is function`, `findNodeHandle is function` — probe via `rg` import + `node -e "require('react-native')" ` sanity if installed, otherwise defer to iOS Simulator VoiceOver manual).
- [ ] Working-tree is `fd016ad + 4709640` plus `deferred-work.md` 2 hunks DW-112/113 `open→done 2026-09-03` with `resolution-undo e282524d… 7374617475733a206f70656e`; `sprint-status.yaml` not written by this workflow (orchestrator-owned).

## Exit Criteria

- [ ] All P0 tests passing (100%). Gate: `npm test -- triade/__tests__/a11y/screenReader.contract.test.tsx` green (still 13/13) + new focus `BoardA11yOverlay` host suite green (first-mount no focus, surviving-tile focus, vanished guard, missing API no throw, null handle no throw, Canvas wrapper `no-hide-descendants` present) + `npx tsc --noEmit -p tsconfig.test.json` clean.
- [ ] All P1 tests passing or failures triaged with approved waivers (≥95%); wrapper source pins + `tileRefs` lifecycle + Dynamic Type still `allowFontScaling` gate green.
- [ ] No open bugs S0/S1 against: VoiceOver focus lands on dead node after move / focus not moving at all when it should / duplicate Skia node still announced / overlay Pressables untappable when VoiceOver off / stale `tileRefs` leak.
- [ ] `triade/src/engine/**` still byte-identical post-merge (`git diff --stat -- triade/src/engine` empty beyond `Board` type import).
- [ ] Manual simulator ear-check (optional 15 min, iOS Simulator with VoiceOver — not required to block host gate): enable VoiceOver, three-finger swipe 4 dirs → board moves + focus stays on live tile (not dead), single-finger swipe → no move, tap tile → value+position re-announces, move with merge+spawn → single "Merged: A plus B equals C" + "New tile V", no duplicate Canvas item in the rotor, largest Dynamic Type still shows all chrome (tile numerals fixed exception per UX-DR-18).
- [ ] Residual R-001 row-major heuristic either kept with UX sign-off or waived with owner+expiry at next a11y pass; DW-112/DW-113 closed with `e282524d…` audit.

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE / QA (TEA) | Host focus suite (`setAccessibilityFocus` + `findNodeHandle` spies + vanished-tile + first-mount + missing-API + null-handle guards) + Canvas wrapper `no-hide-descendants + accessible false` renderer + ATDD chrome guard `<Animated.View style={shakeStyle}>` pin, ledger `e282524d…/7374617475733a206f70656e` verification, `tsc --noEmit` dual gate |
| FE lead | Dev Lead | Owns `boardAccessibility.tsx:38-83` focus effect (deps `[board]`, `tileRefs Map a11y-r-c`, `isFirstRenderRef`, `Array.isArray(board)` + `typeof setAccessibilityFocus` + `try/catch` + `if(tag)`) + `GameBoard.tsx:658` wrapper + `rn-stub.ts:102 findNodeHandle`, host focus cases, `engine.purity` + `ui.thinview` structural compliance |
| UX reviewer | UX | Sign-off on R-001 row-major focus heuristic (acceptable residual "does not land on dead node" vs dst preservation), Canvas hide no visual change, tile `role="text"` vs `"button"` already patched (unchanged) |
| QA / TEA | QA | Risk gate (R-001/R-002/R-003 P0 sign-off), DW-112/DW-113 waiver closure, device VoiceOver smoke if simulator available, release sign-off |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Host unit, no device, <1 min + rendered wrapper check

**Criteria**: Blocks blind-user core journey (VoiceOver focus dead node has no workaround; duplicate Canvas node floods announcements) + high risk (≥6) + no workaround + cheap host execution. Every 9-2 AC already blocks App Store a11y.

| # | Requirement / AC (spec I/O row) | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|----------------------------------|----------|------------|-----------|------------|-------|-------|
| P0-01 | Focus after board change — surviving tile with mounted ref receives `setAccessibilityFocus` | Mount `BoardA11yOverlay board [[3,null…]]` → after mount `spy.calls===0` (first-mount suppressed); then `update(Board [[null, null…], [null,12,…]])` where first surviving non-null is `a11y-1-1` with ref; assert `spy.calls.length===1` and `spy.tags[0]===1` (`findNodeHandle` stub `1`) and `spy.handles[0]` is the Pressable ref object for `a11y-1-1`. | Unit (react-test-renderer + rn-stub spy override before create) | R-001, R-002 | 1 `test()` 4-5 asserts | QA (new `boardA11yFocus.test.ts`) | Spies set before `create`: `origSetFocus = AccessibilityInfo.setAccessibilityFocus; (AccessibilityInfo as any).setAccessibilityFocus = (tag)=> spy.calls.push(tag);` + `import { findNodeHandle } from 'react-native'` spy via `rn-stub` override. Effect deps `[board]` ensures second commit fires. Complements 9-2 baseline 13 P0; does not duplicate assert i18n label. |
| P0-02 | Vanished tile guard — never with dead node's handle | Same mount as P0-01 but `board1` had tile at `a11y-0-0` focused implicitly, `board2` moves that tile away so `a11y-0-0 === null` and first surviving is `a11y-0-3`; assert `spy.tags` never equals the dead coordinate's handle (the surviving tile's handle `1` is called, not a missing handle). Additionally mount `BoardA11yOverlay board2` directly then update to `board3` where `board3`'s first surviving `a11y-0-0` never existed as a ref in `board2` (sparse) — assert focus falls back to next surviving with a ref or no call if none, never a vanished-key lookup. | Unit | R-001, R-004 | 1 `test()` | QA | Exercises the `for (r) for(c) if(row[c]!==null){ key=a11y-r-c; ref=get(key); if(ref) break }` path — vanished coordinate not iterated at all (its `row[c]===null`), so no `get('a11y-0-0')`. Prove no dead-node focus. |
| P0-03 | First mount + missing API + non-array board → never calls, never throws | Three sub-cases in one fixture: (a) `create(Board [[3…]])` immediately assert `spy.calls===0`. (b) `delete (AccessibilityInfo as any).setAccessibilityFocus` then `update(Board [[6…]])` → still `0`. (c) `update(Board null as any)` → still `0` and `assert.doesNotThrow(()=>act(()=>renderer.update(... null)))`. Each with `spy` reset between sub-cases. | Unit | R-005, R-008 | 1 `test()` | QA | Guards `isFirstRenderRef` + `typeof ai.setAccessibilityFocus !== 'function'` + `!Array.isArray(board)` early returns + `prevBoardRef` writes. |
| P0-04 | Null `findNodeHandle` guard — suppress without throw | Stub `findNodeHandle` to `()=>null` (falsyTag) via `rn-stub` override before mount, then `update(Board surviving)`; assert `spy.calls.length===0` and `assert.doesNotThrow`. Also probe `findNodeHandle` spy throws → outer try/catch swallows: `findNodeHandle = ()=>{ throw new Error('native'); }` → still 0 and no throw. | Unit | R-005, R-006 | 1 `test()` | QA | Guards `const tag=findNodeHandle(targetRef); if(tag) ai.setAccessibilityFocus(tag)` + `try/catch` around whole tag path. |
| P0-05 | Invalid board shapes — never throw | Mount `BoardA11yOverlay board:null as any` → renders `null` text tree; mount jagged `[[1,null],[null]]` → no throw + Pressable count equals non-null count; mount `width NaN / Infinity / 0 / -1` via `width: NaN as any` → `safeWidth=1` still renders, focus still works, `assert.doesNotThrow` on each. | Unit | R-008 | 1 `test()` | QA | Supplements 9-2 P2-03 guard; reuses existing P0 label suite pattern. |
| P0-06 | Canvas wrapper `importantForAccessibility="no-hide-descendants" accessible={false}` hides Skia subtree | Static src pin plus rendered wrapper: `readFileSync GameBoard.tsx` contains `importantForAccessibility="no-hide-descendants"` exactly once near Canvas wrapper and `accessible={false}` on same View; source still contains `"<Animated.View style={shakeStyle}>"` exactly once. Rendered shallow `GameBoard` wrapper View has props `importantForAccessibility==="no-hide-descendants"` and `accessible===false` and Canvas child. | Unit (static + shallow host) | R-003, R-010 | 1 `test()` (1 static 3 asserts + shallow render if available) | QA | Pinned via `rg -n 'importantForAccessibility="no-hide-descendants"' GameBoard.tsx ==1` + `rg -n "accessible=\{false\}" GameBoard.tsx` near wrapper + `rg -n "<Animated.View style=\{shakeStyle\}>" GameBoard.tsx ==1`. If shallow `GameBoard` mount not feasible headless (requires Skia stub), keep as static pin — acceptable per spec Verification `grep -n importantForAccessibility`. |
| P0-07 | `tileRefs` Map lifecycle — ref callback sets on mount and deletes on `null` | Mount `Board 2 non-null` → `Pressable` count 2, internal `tileRefs` conceptually 2; update to `Board 1 non-null` where one prior coordinate became null → deleted callback called, focus skips deleted key on next board change (exercise P0-02 path). Also assert overlay root `pointerEvents="box-none"` + `importantForAccessibility="no"` + per-tile `accessible true + accessibilityRole="text" + accessibilityLabel engine-derived` still present after focus shim. | Unit (component) | R-004, R-010 | 1 `test()` | QA | Fix reassurance that shim didn't break 9-2 contracts: P0-07 doubles as regression gate for `screenReader.contract.test.tsx:125-141` style scan (role `text`, `accessible`, engine-derived label). |
| P0-08 | Engine-derived parity + no duplication — Board type only import, width guards parity | `__BOARD_A11Y_CONSTANTS deepStrictEqual {GRID:4, BOARD_PADDING:8, CELL_GAP:8}` still holds (9-2 pin); `Number.isFinite(width)?width:1 + Math.max(1,…)` guards still present in `boardAccessibility.tsx` and `safeWidth` parity with `GameBoard.tsx`; no `merge/spawn/score` engine logic in `src/a11y` (`rg -n "merge|spawn" boardAccessibility.tsx ==0` beyond announceTile which only re-announces label). | Unit (static) | R-008 | 1 `test()` | QA | Reuses 9-2 P0-09/P0 gate: `rg -n "BOARD_PADDING" boardAccessibility.tsx` + `rg -n "CELL_GAP"` + `rg -n "__BOARD_A11Y_CONSTANTS"`. |

**Total P0**: 8 groups (~8 `test()` bodies in a single file `triade/__tests__/a11y/boardA11yFocus.test.ts`), host-only, executes in PR in <1 min beyond the 600 ms `announceScore` throttle wait already in 9-2 suite.

### P1 (High) — Source + contract stability pins (host, <5 min)

**Criteria**: Validates the new seams at source level (focus wiring, wrapper nesting, stub divergence) and that chrome/announce contracts still hold — medium risk (3-4) and common workflows. Failure here is user-visible but has a P0 fallback.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-01 | `findNodeHandle` seam | `boardAccessibility.tsx` source imports `findNodeHandle` from `react-native` and calls `findNodeHandle(targetRef)` exactly once before `setAccessibilityFocus`; `rn-stub.ts` source exports `findNodeHandle = (_ref)=> (_ref ? 1 : null)`. | Static | R-006 | 1 | QA | `rg -n "findNodeHandle" boardAccessibility.tsx` 2 hits (import + call) + `rg -n "findNodeHandle" triade/test-utils/rn-stub.ts ==1`. Guards that host focus path has both import and stub. |
| P1-02 | `tileRefs` + `isFirstRenderRef` + `prevBoardRef` state refs | Source contains `tileRefs = useRef<Map<string,any>>(new Map())` + `isFirstRenderRef = useRef(true)` + `prevBoardRef = useRef<Board \| null>(null)` + `useEffect(..., [board])` with deps exactly `[board]` (not `[]` nor `[board,width]`). | Static | R-002, R-004, R-007 | 1 | QA | `rg -n "tileRefs" boardAccessibility.tsx >=3` (def + get + set/delete) + `rg -n "isFirstRenderRef" ==3` (def, check, clear) + `rg -n "prevBoardRef" >=3` (def + write) + multiline `useEffect(.*\[board\]` 1 hit. |
| P1-03 | `setAccessibilityFocus` guards: missing-API / try/catch / `if(tag)` | Source contains `typeof ai.setAccessibilityFocus === 'function'` guard, `try/catch` around `findNodeHandle/setAccessibilityFocus`, and `if(tag) ai.setAccessibilityFocus(tag)` not unconditional `ai.setAccessibilityFocus(findNodeHandle(...))`. | Static | R-005 | 1 | QA | `rg -n "setAccessibilityFocus" boardAccessibility.tsx ==2` (one guard, one call) + `rg -n "try" boardAccessibility.tsx` near `findNodeHandle` + `rg -n "if \(tag\)"`. |
| P1-04 | Canvas wrapper nesting exact shape | `GameBoard.tsx:658` is `<View importantForAccessibility="no-hide-descendants" accessible={false} style={{width:safeWidth,height:safeWidth}}><Canvas style={{width:safeWidth,height:safeWidth}}>` — wrapper is inner View directly around Canvas, not around overlay, and `Animated.View style={shakeStyle}` still the outer board container with no `importantForAccessibility` on it. | Static | R-003 | 1 | QA | `rg -A2 'importantForAccessibility="no-hide-descendants"' GameBoard.tsx` shows wrapper View then Canvas child; `rg -n "shakeStyle" GameBoard.tsx` still outer `Animated.View` line ~657 unchanged. |
| P1-05 | Existing 9-2 contract still green via source | Any diff that regresses 9-2 would remove a file-contains gate: `screenReaderGestures.ts` still `isThreeFingerMove` + `numberOfPointers !==3→null` strict; `announcements.ts` still `announceForAccessibilityWithOptions queue:true` branch + throttle 500 ms; `i18n` `a11y.*` keys both locales; chrome `allowFontScaling` still present per file. | Static | — | 1 | QA | Re-run `rg -n "isThreeFingerMove" triade/src/a11y/screenReaderGestures.ts ==1` + `rg -n "500" announcements.ts ==1` + `rg -n "allowFontScaling" triade/src/ui/Hud.tsx ==1` etc. — sanity that focus shim didn't touch siblings. Can be delegated to existing `screenReader.contract.test.tsx` 13 P0 which already asserts them. |
| P1-06 | `rn-stub.ts` surface completeness | `rn-stub.ts` exports `AccessibilityInfo.setAccessibilityFocus` (existing since before sweep) + new `findNodeHandle` with correct `( _ref:any ) => (_ref?1:null)` shape, mapped via `tsconfig.test.json` `paths: {"react-native":"./test-utils/rn-stub.ts"}` so `tsc -p tsconfig.test.json` clean. | Static | R-006 | 1 | QA | `rg -n "export const AccessibilityInfo" rn-stub.ts` + `rg -n "setAccessibilityFocus" rn-stub.ts ==1` + `rg -n "export const findNodeHandle" ==1` + `rg -n '"react-native":.*rn-stub' triade/tsconfig.test.json ==1`. |
| P1-07 | `pointerEvents box-none` + overlay `accessible` contract after shim | `boardAccessibility.tsx:89-92` overlay root still `pointerEvents="box-none" importantForAccessibility="no"`; per-tile Pressables still `accessible accessibilityRole="text" accessibilityLabel={label}` where `label = tileLabel(value,r,c)` engine-derived. No `pointerEvents auto` on wrapper that would swallow gesture. | Static/host | R-010 | 1 | QA | `rg -n 'pointerEvents="box-none"' boardAccessibility.tsx ==1` + `rg -n 'accessibilityRole="text"' boardAccessibility.tsx ==1` + `rg -n "accessibilityLabel=\{label\}"`. Host déjà P0-07 covers behavior; this P1 is source pin. |

**Total P1**: ~7 logical assertions, ~2–4 h to finalise (writing the focus shard harness + shallow GameBoard wrapper check).

### P2 (Medium) — Edge, perf, regression, deferred narrative

**Criteria**: Secondary flows + low/medium risk (3-4) + deferred validation depth (focus heuristic, TalkBack, perf).

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-01 | Engine board diff vs focus heuristic — board with one merge | `move(board, dir, rng)` → new board where merged tile value doubled; mount `BoardA11yOverlay` before+after, assert focus heuristic still picks first surviving not vanished (row-major), and `announceMerge/Score` still via `announcements.ts` (no duplicate merge string). | Component + unit | R-001, R-004 | 1 | FE | Thin harness: generate board via engine `move`; this probes that overlay consumes engine `Board` but does not duplicate `trace` merge logic — only board shape. |
| P2-02 | Announcement ordering still coalesced — not re-introduced in overlay | Probe `announcements.ts` `safeAnnounce` still only called once per helper; overlay's `announceTile` (tile tap) not called from focus path (focus effect only calls `setAccessibilityFocus`, not `announceTile`). | Static | R-003 | 1 | QA | `rg -n "announceTile" boardAccessibility.tsx` shows only `onPress={() => announceTile(value,r,c)}` (tap), not inside `useEffect([board])`. Focus path must never announce. |
| P2-03 | Perf — focus effect O(16) <1 ms | Micro-bench `performance.now()` around `renderer.update(Board 16 tiles)` 100×, assert median <1 ms per board change; wrapper View does not introduce extra re-render. | Unit (bench) | R-009 | 1 | QA | Already covered by host timing in `layout.test.ts`; keep as observed. |
| P2-04 | TalkBack / `useScreenReaderEnabled` divergence not regressed | `screenReaderGestures.ts` still `useScreenReaderEnabled` not imported by `boardAccessibility.tsx` (focus shim needs no `isScreenReaderEnabled` gate per spec); `AccessibilityInfo.addEventListener('change')` still only in `screenReaderGestures.ts` + `ToneScreen`. | Static | R-005 | 1 | QA | `rg -n "isScreenReaderEnabled" boardAccessibility.tsx ==0` (overlay does not gate focus on screen-reader flag per spec — focuses whenever board changes and API present, which is correct: off-VO `setAccessibilityFocus` is harmless on non-screen-reader devices where it may be undefined). |

**Total P2**: ~4 checks, `~1–2 h`.

### P3 (Low) — Exploratory / manual / device

**Criteria**: Nice-to-have + exploratory + device tactile tuning + ledger health.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-01 | Device VoiceOver smoke — focus lands on live tile, Canvas duplicate gone | On iOS Simulator with VoiceOver enabled: perform swipe → board moves with merge → swipe-restore focus should be on a live tile (not "element unavailable"); rotor shows only overlay tiles, no extra Canvas item. | Exploratory (manual) | 1 journey | QA/FE | The only non-mocked proof; capture short notes per orientation. Fails if Row-major at top-left disorients — acceptable residual. |
| P3-02 | TalkBack divergence check | On Android TalkBack, confirm `setAccessibilityFocus` still guarded (TalkBack may lack it) — no crash and no duplicate Canvas announcement; `findNodeHandle` branch on Fabric FabricNo equal. | Manual (device) | 1 | QA | Single data point, not matrix. |
| P3-03 | Ledger hash health | `rg` exact `e282524d3c6d58f87f367a2b14dce9775d2e7428bb8a292b7bd2ab3092fedd75` 2 hits (DW-112+113) + `rg "resolution-undo" deferred-work.md` health + `git diff HEAD -- sprint-status.yaml` empty. | Static (ops) | 1 | QA | Post-merge ops gate. |

**Total P3**: 3 exploratory checks.

---

## Execution Order

For this sweep execution is host-dominated; device is the only focus/Canvas proof and stays out of PR gate.

### Smoke (<1 min, host, every save)

- `npm test -- triade/__tests__/a11y/screenReader.contract.test.tsx` — 9-2 contract 13 tests still 13/13 (labels, gate, announceThrottle, tone, appGate, Dynamic Type).
- `npx tsc --noEmit -p tsconfig.test.json` — rn-stub `findNodeHandle` types clean (no new `@ts-ignore`).
- Host micro gate: `rg -n setAccessibilityFocus triade/src/a11y/boardAccessibility.tsx` 2 hits; `rg -n 'importantForAccessibility="no-hide-descendants"' triade/src/render/GameBoard.tsx` 1 hit — each <1 s.

### PR gate (host, <15 min, every PR to main)

- **Host functional**: all P0 (8 groups) in `triade/__tests__/a11y/boardA11yFocus.test.ts` + existing `screenReader.contract.test.tsx` 13 — `npm test` green (`980 pass` baseline, now `980+8` delta). No engine change (`git diff --stat -- triade/src/engine` empty for engine rules).
- **Static purity**: `announceForAccessibility` only in `src/a11y/announcements.ts` + `boardAccessibility.tsx:announceTile`; `setAccessibilityFocus` only in `boardAccessibility.tsx`; `importantForAccessibility="no-hide-descendants"` only wrapper; no hard-coded English labels outside `i18n.t` in `src/a11y` except fallback string `${value} row …` (guarded try/catch).
- **TS**: `npx tsc --noEmit -p tsconfig.test.json` clean (both hit via stub); spot `npx tsc --noEmit -p triade/tsconfig.json` if tooling allows (no `@ts-ignore` outside existing pattern).
- **Layout**: `triade/__tests__/ui/layout.test.ts` `<1 ms` bench still in budget.

### Device/simulator gate (manual, ~15 min, before merge)

- **Simulator pass** (iOS VoiceOver sufficient — no haptics needed): drive 4 swipes (three-finger when VO active), tile tap re-announces (`value row X col Y`), a merge move → single `announceMerge` (existing) + focus on live tile (not dead), Canvas item not in rotor, largest Dynamic Type still readable. Owner is PR author; sign-off is a checkbox in PR description: `a11y bridge smoke: focus moves to live tile / Canvas no duplicate / 3-finger still moves / 1-finger blocked`.
- **Android TalkBack pass** (one emulator, optional): same focus guard (no crash when `setAccessibilityFocus` absent) + announcements heard via fallback branch.

### Nightly/weekly — not required for this sweep

No perf/chaos/large-dataset suites. A sustained 10-min `p99` trace for Epic 8 benchmarks already covers frame budget; the focus shim adds no load.

---

## Execution Strategy

**Philosophy**: Run everything host-side in PRs (<15 min with `node:test` parallelisation + `react-test-renderer`); defer only genuine VoiceOver focus fidelity to a quick simulator ear-check because it requires the native a11y bridge, not a harness. Keep the overlay thin-view deterministic: all branching logic is unit-testable without a screen reader.

- **PR**: All functional host tests (P0 + P1 static/polarity pins + P2 guards). No infra overhead — `node --import tsx --test` + `tsc` is the only runner. The 600 ms throttle wait from 9-2 lineage is still the only wall wait.
- **Pre-merge device**: One manual iOS Simulator VoiceOver pass (P3-01) + optional Android TalkBack (P3-02). Sign-off checkbox in PR.
- **Nightly/weekly**: None for this sweep. Epic 9 contrast/visual gates (9-3/9-4) stay the nightly lane when theme palettes land.

No Playwright/k6 perf harness needed (no UI intercept, no network API). Browser exploration via `playwright-cli` skipped — delta is React Native host `findNodeHandle` + native `AccessibilityInfo`.

---

## Resource Estimates

Intervals only (no false precision).

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 8 groups (vanished guard, first-mount, missing API, null handle, invalid board, wrapper props, tileRefs lifecycle, parity) | 0.15–0.30 | **~1–2 h** | One file `boardA11yFocus.test.ts` with spies + mounts; dominant work is spy injection pattern. |
| P1 | 7 groups (findNodeHandle seam, tileRefs/firstRenderRef, setAccessibilityFocus guards, wrapper nesting, existing contract sanity, rn-stub surface, pointerEvents) | 0.20–0.50 | **~2–4 h** | Source scans + optional shallow GameBoard wrapper mount. |
| P2 | 4 checks (board diff, announcement ordering, perf, talkBack divergence) | 0.20–0.40 | **~1–2 h** | Static + trivial bench + hygiene. |
| P3 | 3 exploratory (iOS ear-check, Android divergence, ledger hash) | 0.25–0.50 | **~1–2 h** | Manual simulator + ops `rg` health, not gating host. |
| **Total** | **~22 checks** | — | **~4–9 h** | **~0.5–1.2 days** wall-clock with simulator access; host-only ship is ~0.5 day. |

Prerequisites:

- **Test data**: Deterministic `board: Board` fixtures (4×4 with mixed non-null/null, jagged `[[1,null],[null]]`, `null as any`, `width NaN/Infinity/0/-1`, `board1` 1 non-null → `board2` 1 surviving elsewhere), `AccessibilityInfo` stub doubles with `setAccessibilityFocus` + missing-API fixtures, `findNodeHandle` null/throw fixtures, `PixelRatio` mock not needed (Canvas wrapper not sized by PixelRatio).
- **Tooling**: `node --test`, `tsx`, `typescript`, `react-test-renderer`, iOS Simulator (Xcode) for ear-check (no farm).
- **Environment**: Host (`node >=26`, as per `engines`), iOS Simulator SDK 57. No staging backend.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions; all 8 groups green).
- **P1 pass rate**: ≥95% (a single stray `rg` count off by 1 due to comment counts as waiver with owner+expiry at next a11y pass; mock-level P1 already green via static scans).
- **P2/P3 pass rate**: ≥90% informational; P2-02 announcement-ordering pin + P3-03 ledger health must be green.
- **High-risk mitigations**: R-001/R-002/R-003 have a decision + test or explicit signed waiver with expiry — otherwise FAIL; R-001 row-major accepted residual requires UX sign-off recorded in PR.

### Coverage Targets

- **Critical paths (focus lands on surviving tile + never on dead node + Canvas wrapper `no-hide-descendants`)**: 100% of spec I/O matrix (3 rows × at least 1 test each; gate is 100% spec I/O coverage, not line %).
- **Accessibility screen-reader scenarios (existing 9-2 lineage)**: 100% contract still pinned (actual: 13 contract tests still 13/13).
- **Business logic (`src/a11y/boardAccessibility` thin view + `GameBoard` wrapper)**: 100% of declared focus/Canvas contracts swept (gate is "every `setAccessibilityFocus`/`findNodeHandle`/wrapper invocation guarded").
- **Edge cases (null board/jagged/NaN width/finite guard/null handle/first-mount)**: ≥90%.

### Non-Negotiable Requirements

- [ ] All P0 tests pass.
- [ ] No high-risk (≥6) items unmitigated without signed waiver (R-001 row-major signed).
- [ ] Engine byte-identical regression gate passes (`triade/src/engine` unchanged except `Board` type import).
- [ ] WCAG contract pinned by tests that assert engine-derived labels (not hard-coded UI strings) + `AccessibilityInfo` via `announceForAccessibilityWithOptions {queue:true}` with fallback + `setAccessibilityFocus` only on surviving tile.
- [ ] Canvas wrapper `importantForAccessibility="no-hide-descendants"` + `accessible={false}` exact literal pinned.
- [ ] Device ear-check checkbox or explicit waiver present in PR before merge (optional but P3 gate).

---

## Mitigation Plans

### R-001: Focus heuristic — first surviving row-major (Score: 6)

**Mitigation Strategy:**
1. Keep `for (r) for(c) if(row[c]!==null){ key=a11y-r-c; ref=get(key); if(ref) break outer; }` as shipped — row-major heuristic avoids previous-focus bookkeeping and satisfies "does not land on dead node" invariant with a bounded `findNodeHandle+setAccessibilityFocus` single call.
2. Keep `tileLabel` engine-derived (`board[r][c]` value + 1-indexed `row/col`), so whichever surviving tile is focused the label is correct.
3. Retain `prevBoardRef` for future `previouslyFocusedCoordinate` preservation if UX later requires dst pin — leave hook in place rather than adding it now.
4. Host contract pins vanished-key never chosen (P0-02) and no duplicate focus on first mount (P0-03).
5. Device VoiceOver ear-check (P3) captures residual: after a merge, focus is on a live tile; extra explores may still be needed — acceptable per spec Design Notes; waiver signed by UX in PR.

**Owner:** FE / UX reviewer / QA
**Timeline:** This sweep (P0 already landed; device ear-check before merge; future spec iteration if UX asks for dst preservation)
**Status:** Complete (planned device supplement on merge day; UX sign-off recorded as residual acceptance)
**Verification:** `npm test -- boardA11yFocus.test.ts:P0-01+P0-02` green + simulator VoiceOver pass checkbox + row-major choice noted in PR Description "a11y: board screen reader bridge focus + Skia hidden" Notes section.

### R-002: `useEffect` timing — passive effect reads just-committed `tileRefs` (Score: 6)

**Mitigation Strategy:**
1. Keep passive `useEffect([board])` (not `useLayoutEffect`) — React commits `Pressable ref` callbacks synchronously before passive effects, so `tileRefs.current` is already the post-commit map when the scan runs.
2. Guard `if (!Array.isArray(board)) return` and `if(tag) ai.setAccessibilityFocus(tag)` + `try/catch` so no throw even if commit order changes across React versions.
3. Host pin: mount→update transition where the new board's first surviving tile is the freshly-mounted key; spy proves `setAccessibilityFocus(1)` exactly once and not for the stale key.
4. Future change to `useLayoutEffect` (for synchronous focus) must be reviewed — it would move focus before paint but may still see not-yet-committed refs on the very first update; keep passive until measured jank appears.

**Owner:** FE
**Timeline:** This sweep (P0 already landed; keep)
**Status:** Complete
**Verification:** `boardA11yFocus.test.ts:P0-01` 1× `setAccessibilityFocus` after update + `P0-03`/`P0-04` no-throw fixtures green.

### R-003: Canvas wrapper — `importantForAccessibility="no-hide-descendants"` depth + ATDD guard (Score: 6)

**Mitigation Strategy:**
1. Keep wrapper as inner `<View importantForAccessibility="no-hide-descendants" accessible={false} style={{width:safeWidth,height:safeWidth}}>` directly around `<Canvas>`, not around the sibling overlay; leave `<Animated.View style={shakeStyle}>` outermost unchanged.
2. Keep spec Design Notes invariant: Canvas wrapper hiding verified via source grep; ATDD string `"<Animated.View style={shakeStyle}>"` pinned so a future re-nest that moves the `no-hide-descendants` up one level would hide the overlay and fail the gate.
3. Host pins via `rg -n 'importantForAccessibility="no-hide-descendants"'` `==1` + `rg -n "accessible=\{false\}"` near Canvas + `rg -n "<Animated.View style=\{shakeStyle\}>"` `==1` + wrapper renderer props check.
4. Device rotor pin ensures no duplicate Skia node listed alongside overlay tiles.

**Owner:** FE / QA
**Timeline:** This sweep (P0 pins already in spec Verification; device rotor check before merge)
**Status:** Complete
**Verification:** `rg` gates green + spec Verification greps `setAccessibilityFocus` + `importantForAccessibility` pass in spec Auto Run Result + simulator VoiceOver rotor notes.

---

## Assumptions and Dependencies

### Assumptions

1. `Board` is engine-authoritative 4×4 `(number|null)[][]` with only `Board` type imported into `src/a11y`; all tile values finite when non-null (no NaN strings through `i18n.t`).
2. React 19 / `react-test-renderer` passive-effect ordering commits `Pressable ref` callbacks before `useEffect([board])` runs — so `tileRefs` seen by the focus scan is the just-committed map.
3. `react-native` 0.86.2 exposes `AccessibilityInfo.setAccessibilityFocus` (iOS) and `findNodeHandle`; TalkBack may not expose `setAccessibilityFocus` and silent degradation is correct.
4. `GameBoard` Canvas is visual-only Skia draw with two constants `BOARD_PADDING=8, CELL_GAP=8, GRID=4` shared via `__BOARD_A11Y_CONSTANTS`; overlay and board wrapper both use `safeWidth=Math.max(1, Number.isFinite(width)?width:1)`.
5. Host `triade/test-utils/rn-stub.ts` `findNodeHandle` stub returning `1|null` is behaviorally equivalent to real native handle for the `if(tag) ai.setAccessibilityFocus(tag)` guard and for host P0; real device coverage of the tag is deferred to P3 ear-check.
6. Previous focus coordinate preservation is an explicit future enhancement; row-major first-surviving heuristic is the accepted residual for this bundle per spec Design Notes.

### Dependencies

1. `react-native` `findNodeHandle` + `AccessibilityInfo.setAccessibilityFocus` remain available without new native module — required at build time.
2. `react-test-renderer` + `node --import tsx --test` remain host test harness for `BoardA11yOverlay` mounts and spy overrides.
3. iOS Simulator (Xcode) + Android emulator available for optional 15-min P3 VoiceOver/TalkBack ear-check before merge (not blocking host gate if unavailable).
4. `spec-board-a11y-screen-reader-bridge.md` intent contract frozen at `bfeea105d4db` — any change to I/O matrix (e.g., dst preservation) re-opens R-001 and this test design.

### Risks to Plan

- **Risk**: Host focus pin passes but real VoiceOver focus doesn't move on device due to `findNodeHandle` returning `null` on Fabric for the freshly-mounted tile.
  - **Impact**: VoiceOver stays on previous location (potentially dead-node announcement gap) on first board change.
  - **Contingency**: Switch host effect to `useLayoutEffect` and/or delay `setAccessibilityFocus` by `requestAnimationFrame` fallback; re-run host `P0-01` with `useLayoutEffect` spy path plus device rotor verification.

- **Risk**: Future `width` type widening or `board` shape widening (e.g., configurable GRID) drifts overlay cell math vs `GameBoard`.
  - **Impact**: VoiceOver tile geometry `left/top/cell` misaligned with Skia tiles; `__BOARD_A11Y_CONSTANTS` deepStrict pin would catch it.
  - **Contingency**: Reuse `layoutFor`/`boardSize` derivation from `triade/src/ui/layout.ts` directly in `boardAccessibility.tsx` rather than duplicating constants; pin via `engine.purity` structural suite.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|---|---|---|
| **`triade/src/a11y/announcements.ts` (`announceForAccessibility` contract — move/merge/spawn/score/gameOver/newRecord/preview/banner, noop silent, 500 ms throttle, `queue:true` fallback)** | Not touched — overlay focus shim must not call any `announce*` (only `setAccessibilityFocus`). | Keep `triade/__tests__/a11y/screenReader.contract.test.tsx` 13 P0 green; regression scope is `announce*` helpers not regressed by `boardAccessibility.tsx` effect (P2-02 static pin). |
| **`triade/src/a11y/screenReaderGestures.ts` (`isThreeFingerMove===3` strict + `resolveSwipeDirection` threshold/tie → null)** | Not touched. | Keep 3-finger gate contracts green (`isThreeFingerMove` 6 asserts); screen-reader navigation vs move arbitration unchanged. |
| **`triade/src/ui/ToneScreen.tsx` (`paused = voiceOverActive \|\| announcementPending`, 2 s auto-advance cleared while paused, 5 s fallback)** | Not touched. | Keep Tone src P0 pins (`isScreenReaderEnabled` + `announcementFinished` + `announcementPending` + `clearTimeout(timerRef)` + `setTimeout(()=>...,5000)` + `paused = … \|\| …`) green. |
| **`triade/src/ui/Hud.tsx`, `PreviewCard.tsx`, `GameOverOverlay.tsx`, `LaneSelectScreen.tsx`, etc. (chrome `allowFontScaling` + `flexWrap` + `minHeight`, GameOver `numberOfLines=1 ellipsizeMode="tail"` guard)** | Not touched. | Keep Dynamic Type static guard `allowFontScaling` per chrome file + GameOver 1-line guard green (9-2 contract still host-gated). |
| **`triade/src/render/GameBoard.tsx` (Skia visual board + `shakeStyle` + `bulletFlash` + `tiles` + `cell` guard)** | Touched only by inner Canvas wrapper View nesting; visual draw, `shakeStyle`, `bulletFlash`, `tiles` re-plan, `cell` math unchanged. | Keep `GameBoard` snapshot/visual not regressed (host `GameBoard` mount not needed); pin `"<Animated.View style={shakeStyle}>"` + `cell` `safeWidth` guard + `overlay-carriers` style contract green. |
| **`triade/src/ui/App.tsx` gesture pan handler + `BoardA11yOverlay` sibling mount** | Not touched. | Keep `App.tsx` `useScreenReaderEnabled + isThreeFingerMove + screenReaderEnabledRef + BoardA11yOverlay` sibling ordering green via source pins; no repro of `App.tsx` mount harness needed. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework (adapted for deferred-work bundle: BUS for VoiceOver focus continuity + duplicate-node, TECH for `tileRefs`/`findNodeHandle`/`importantForAccessibility` seams)
- `probability-impact.md` — Risk scoring methodology (1 Very Low → 3 Very High for P and I; Score = P×I, ≥6 HIGH, 3-4 MEDIUM, 1-2 LOW)
- `test-levels-framework.md` — Test level selection (static source scan, unit via `node --test`, component via `react-test-renderer`)
- `test-priorities-matrix.md` — P0-P3 prioritization (P0 blocks blind-user core journey + Score ≥6 + no workaround; verbatim in coverage criteria)
- `nfr-criteria.md` — NFR planning (accessibility focus contract + Canvas ATDD hygiene, reliability never-throw, perf budget, offline installability — unknown thresholds none)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-board-a11y-screen-reader-bridge.md` (`created 2026-09-03 baseline_revision fd016ad1a358 final bfeea105d4db`)
- Prior lineage: `_bmad-output/test-artifacts/test-design/test-design-epic-9-2-screen-reader-contract.md` (`2026-09-02`, 12 risks, R-002/R-006 deferred DW-112/113 = open at that time — now closed by this bundle)
- Ancestor tests: `triade/__tests__/a11y/screenReader.contract.test.tsx` (13 `test()` P0 contracts — gate labels/gate 3-finger/announcements EN+PT/noop silent/throttle/tone src pins/app gate src pins/Dynamic Type)
- Audit predecessor: `triade/test-utils/rn-stub.ts:102` (`findNodeHandle` stub added this bundle)
- Tea config: `_bmad/tea/config.yaml` (`test_artifacts "{project-root}/_bmad-output/test-artifacts"`, `test_design_output _bmad-output/test-artifacts/test-design`, `risk_threshold p1`, `tea_use_playwright_utils true`)

---

**Generated by**: BMad TEA Agent — Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design` tri-modal (create mode, epic-level phase 4 deferred-work bundle)
**Version**: 6 (BMad v6) — Host is `node --test` + `react-test-renderer`; no Playwright/k6 perf harness for this delta; Browser exploration via `playwright-cli` skipped — delta is RN host + native `AccessibilityInfo`/`findNodeHandle`

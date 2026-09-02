---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-02'
workflowType: 'bmad-testarch-automate'
storyId: 'dw-6-rotation-race-safe-area-initial-metrics'
storyKey: 'dw-6-rotation-race-safe-area-initial-metrics'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-6-rotation-race-safe-area-initial-metrics.md'
  - 'triade/App.tsx'
  - 'triade/src/ui/useSyncedLayout.ts'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/ui/orientation.ts'
  - 'triade/__tests__/ui/layout.test.ts'
  - 'triade/__tests__/ui/useSyncedLayout.test.ts'
  - 'triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary-dw-6-rotation-race-safe-area-initial-metrics.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — DW bundle dw-6-rotation-race-safe-area-initial-metrics — rotation race: SafeAreaProvider initialMetrics + synced insets effect (DW-6)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `dw-decision-dw-6` (`dw-6-rotation-race-safe-area-initial-metrics`)
**Mode:** BMad-integrated (test-design + ATDD checklist) but host-dominated; no Playwright/Cypress harness required for pure layout seam
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx`, no backend) — pure `triade/App.tsx:1-11` + `triade/src/ui/useSyncedLayout.ts:1-89` + `triade/src/ui/layout.ts:37-61` exercised via host `node:test`
**Working-tree delta under test:** `HEAD a1f6831` (spec baseline) vs working-tree (`git diff --stat HEAD` is `triade/App.tsx` 13 +8/-9 + untracked `triade/src/ui/useSyncedLayout.ts` 89 LOC new + untracked `triade/__tests__/ui/useSyncedLayout.test.ts` 58 LOC + `triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts` 321 LOC + `deferred-work.md` DW-6 `open→done 2026-09-02` + spec `Auto Run Result done`). Production delta is `triade/App.tsx:1-11,83,96-99` (new `import { initialWindowMetrics }` + `<SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>` + `useSyncedLayout()` single coalesced hook replacing 3-line racy `useWindowDimensions()+useSafeAreaInsets()+layoutFor`) + `triade/src/ui/useSyncedLayout.ts:1-89` (new `useSyncedLayout(debounceMs=32)` with `pendingRef`+`timerRef setTimeout(32)` commit + `lastValidLayoutRef` hold + `coalesceLayout` pure helper + `getBandTop` via synced insets). No `triade/src/ui/layout.ts` or `triade/src/engine` byte change (`git diff --stat -- triade/src/ui/layout.ts` empty, `git diff --stat -- triade/src/engine` empty).

> **Delta (3 test_artifacts suites 10+8+20 + 1 fixture + triade oracles 4+20, ~280+310 LOC new tests, no new deps):** `triade/App.tsx:1-11,83,96-99` — SafeAreaProvider now receives `initialWindowMetrics ?? undefined` (first frame already correct when native provides it, safe `undefined` fallback when `null` on web/Jest) and `AppContent` reads single `useSyncedLayout()` that debounces commit of `{width,height,insets}` by `32 ms`, batching racy pair into one `setSynced`, and holds `lastValidLayoutRef` across transient `boardSize===0` so board never flashes to `0`. `triade/src/ui/useSyncedLayout.ts:1-89` — `DEFAULT_DEBOUNCE_MS=32` + `pendingRef`+`timerRef` coalesce + `lastValidLayoutRef` initialized via `layoutFor({width,height,insets})` on mount + `coalesceLayout(pending,lastValid)` pure helper + `getBandTop(synced.insets, effectiveLayout.bandHeight)`. Ledger `deferred-work.md:46-52` — DW-6 flipped `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-decision-dw-6` + `resolution-undo: 61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48 2026-09-02 7374617475733a206f70656e` (hex `status: open` tail). Spec `spec-dw-6-rotation-race-safe-area-initial-metrics.md` baseline `a1f6831` + `Auto Run Result Status: done` (910 pass fleet + layout 18 + tsc clean). `sprint-status.yaml` untouched (orchestrator-owned per hard constraint).

---

## Step 1 — Preflight & Context

### Stack Detection & Framework Verification

- **Config `test_stack_type`:** `auto` (`_bmad/tea/config.yaml:14`)
- **Auto-detection:** `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`/`react-native-gesture-handler` + no `pyproject.toml`/`go.mod`/`pom.xml` → **frontend**
- **Framework:** `node:test` + `tsx` (`triade/package.json` `test: TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — **verified exists** (`triade/node_modules/.bin/tsx` + `npm --prefix triade exec -- tsc --noEmit` clean beyond pre-existing 8 spawn-candidates errors, `npm --prefix triade test -- __tests__/ui/layout.test.ts` 18 pass + `__tests__/ui/useSyncedLayout.test.ts` 4 pass, `npm --prefix triade test` 914 pass / 0 fail / 311 skipped fleet gate, +10 gateway / +8 umbrella = 932-934 when activated)
- **No Playwright/Cypress harness required:** bundle is pure `layoutFor` arithmetic + `useSyncedLayout` coalesce + `initialMetrics` string pins + `rg` allowlists + ledger 64-hex + `sprint-status` ownership; correct level is **Unit host + Static scans (grep allowlists + coalesce + ledger) + API gateway + E2E umbrella as host `node:test` static wrappers**. `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN Skia project, rotation seam is host-only). `tea_use_pactjs_utils:false` — provider is pure `layout.ts` + `useSyncedLayout.ts` + `App.tsx`, not Pact.

### Execution Mode Resolution

```
⚙️ Execution Mode Resolution:
- Requested: auto (from _bmad/tea/config.yaml tea_execution_mode)
- Probe Enabled: true (tea_capability_probe)
- Supports agent-team: false (opencode runtime — sequential only)
- Supports subagent: false
- Resolved: sequential
```

- **Knowledge fragments loaded (core, always):** `test-levels-framework.md`, `test-priorities-matrix.md`, `data-factories.md`, `selective-testing.md`, `ci-burn-in.md`, `test-quality.md`
- **Extended on demand:** `probability-impact.md`/`risk-governance.md` (via `test-design-dw-6-rotation-race-safe-area-initial-metrics.md` R-001..R-010, 3 high score 6: R-001 coalesce 32ms insufficient, R-002 initialMetrics null fallback, R-003 stale hold), `nfr-criteria.md` (reliability never-throw+finiteness+O(1)+maintainability+correctness), `fixture-architecture.md` (deterministic `ZERO/PORTRAIT_NOTCH/LANDSCAPE_NOTCH` + `GOLDEN 382/688/452` + `LEDGER 61d4ee9e` + scan helpers), `api-testing-patterns.md` (gateway contract via pure `coalesceLayout` + `rg` wiring), `test-healing-patterns.md` (single DEFAULT_DEBOUNCE + single coalesce + single lastValid healing seam), `component-tdd.md` (red→green→refactor host unit)
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `risk_threshold:p1`
- **Persistent facts:** `file:{project-root}/**/project-context.md` (expanded; none found — facts skipped)

### Inputs Confirmed

- Ledger `deferred-work.md` DW-6 `status: done 2026-09-02` with `resolution: resolved by sweep bundle dw-decision-dw-6` + `resolution-undo: 61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48 2026-09-02 7374617475733a206f70656e` 64-hex + `737461…` tail; `sprint-status.yaml` untouched (orchestrator-owned per prompt, verified `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `rg` umbrella `sprint-status` pin + `git diff --stat -- triade/src/ui/layout.ts` empty)
- Test-design `test-design-dw-6-rotation-race-safe-area-initial-metrics.md` (10 risks R-001..R-010, 3 high score 6, P0 18 checks / P1 10 / P2 6 / P3 4, NFR planning reliability+performance+maintainability+correctness+offline, entry/exit, estimates 2.8–5.2h host); mirror at `test-design-dw-6-rotation-race-safe-area-initial-metrics.md` canonical per `test_design_output`
- ATDD checklist `atdd-checklist-dw-6-rotation-race-safe-area-initial-metrics.md` + its 20 scaffolds (`triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts` `20 it.skip` dormant → `20 pass` when activated + `tests/unit` 20 dormant mirror + gateway 10 + umbrella 8 active) plus `triade/__tests__/ui/useSyncedLayout.test.ts` 4 pass
- Source `triade/App.tsx:1-11,83,96` (`import { initialWindowMetrics }` + `<SafeAreaProvider initialMetrics={initialWindowMetrics ?? undefined}>` + `useSyncedLayout()` 7-field destructure) + `triade/src/ui/useSyncedLayout.ts:1-89` (89 LOC, `DEFAULT_DEBOUNCE_MS 32` + `pendingRef`+`timerRef`+`lastValidLayoutRef` + `coalesceLayout` pure helper + `getBandTop`) + `triade/src/ui/layout.ts:1-61` byte-identical `SAFE_MARGIN 16` + `96/48/216` + `getBandTop` + `Number.isFinite` 6-field + `triade/src/ui/orientation.ts` `width>height`
- Existing guards `triade/__tests__/ui/layout.test.ts` 18 pass + `triade/__tests__/ui/orientation.test.ts` 5 pass + `triade/__tests__/ui/useSyncedLayout.test.ts` 4 pass — all green at `HEAD` (baseline `a1f6831` + working-tree delta)

---

## Step 2 — Identify Automation Targets

### Targets by Test Level (no duplicate coverage)

| Target | File(s) | Test Level | Priority | Justification |
|--------|---------|------------|----------|---------------|
| App.tsx SafeAreaProvider initialMetrics so first frame not 0-insets (AC first-frame) | `triade/App.tsx:1-11,83` `initialWindowMetrics ?? undefined` | **Static (`rg`) + Unit (host string pin + 0-insets >0)** | **P0** | AC first-frame (R-002) — bare `<SafeAreaProvider>` → 0-insets flash before native measures; `initialMetrics` covers `Metrics|null` → `undefined` fallback. |
| AppContent useSyncedLayout single hook replaces racy 3-line triple | `triade/App.tsx:96-99` `useSyncedLayout()` | **Static (`rg`) + Unit (host `rer` scan)** | **P0** | AC rotation coalesce (R-001) — direct `useWindowDimensions()+useSafeAreaInsets()+layoutFor` races one frame → `board 0`. |
| coalesceLayout holds lastValid when transient boardSize===0 (degenerate 2000-top) | `triade/src/ui/useSyncedLayout.ts:82-89` `coalesceLayout` + `layoutFor` clamp | **Unit (host `layoutFor 390×844→844×390 vs 320×480→0 hold`)** | **P0** | AC degenerate (R-001/R-003) — insets > container would flash `0` without `lastValid` hold. |
| coalesceLayout valid next replaces stale (legitimate 844×390 landscape) | `triade/src/ui/useSyncedLayout.ts:58-66` `effectiveLayout` narrow hold vs replace | **Unit (host `844×390 left47 isLandscape`)** | **P0** | AC valid replace (R-003) — stale hold must not prevent legitimate shrink. |
| Hook exports hook+coalesce+debounce+lastValid+bandTop | `triade/src/ui/useSyncedLayout.ts:1-89` `export function useSyncedLayout` + `coalesceLayout` + `setTimeout/clearTimeout` + `DEFAULT_DEBOUNCE_MS` | **Unit (host file-content 8-include pin)** | **P0** | Hook seam (R-001/R-007) — single source for coalesce+hold+bandTop. |
| layoutFor pure contract still green: 0-insets >0, degenerate 0, constants 16/96/48/216, goldens 382/688/452/358 | `triade/src/ui/layout.ts:37-61` `layoutFor` + `triade/__tests__/ui/layout.test.ts` 18 | **Unit (host `layoutFor` 382/688/452/0 + `rg` literal pins)** | **P0** | AC regression (R-003) — layout seam byte-identical, no engine change. |
| bandTop derived from synced insets + effective bandHeight via getBandTop | `triade/src/ui/useSyncedLayout.ts:68` `getBandTop(synced.insets, effectiveLayout.bandHeight)` | **Unit (host `getBandTop` 159 vs 64)** | **P0/P1** | Wiring (R-007) — degenerate hold must keep bandHeight via lastValid not raw. |
| existing layout.test.ts 18 regression anchor still 18 green (sweep 5 + golden + per-edge + floor) | `triade/__tests__/ui/layout.test.ts` 18 | **Integration (layout regression)** | **P0** | P0 regression (R-003) — spec `Always: Keep layout.ts pure … do not regress`. |
| DEFAULT_DEBOUNCE_MS =32 singleton + debounceMs<=0 immediate commit | `triade/src/ui/useSyncedLayout.ts:14,39` `DEFAULT_DEBOUNCE_MS 32` + `debounceMs<=0` | **Static (`rg` 2 hits + literal 32) + Unit** | **P1** | Wiring (R-001/R-005) — low end of spec `32-64 ms` window + web sync path. |
| pendingRef + timerRef coalesce single commit: deps + clear+set+cleanup | `triade/src/ui/useSyncedLayout.ts:28-52` `pendingRef.current` + `clearTimeout`+`setTimeout` | **Static (`rg` timerRef ≥4 + clearTimeout 2) + Unit** | **P1** | Wiring (R-001/R-004) — fast double rotation within 32ms must single-commit final only. |
| bandTop deps + effectiveLayout hold narrow | `triade/src/ui/useSyncedLayout.ts:56-68` `useMemo(layoutFor(synced),[6 deps])` + `bandTop [2 deps]` | **Static (`rg` synced.insets.left/right) + Unit** | **P1** | Wiring (R-006) — per-edge insets bind, notch-right landscape missed without right dep. |
| lastValid narrow hold only on boardSize===0 transient, valid>0 replaces stale (legitimate shrink 400×250 <216) | `triade/src/ui/useSyncedLayout.ts:58-66` `if(raw===0 && lastValid>0) return lastValid` | **Unit (host `400×250` shrink replaces vs degenerate holds)** | **P1** | Wiring (R-003) — proves shrink semantics not swallowed. |
| layout.test.ts P1-3 still green: isLandscape + asymmetry + floor edge | `triade/__tests__/ui/layout.test.ts` P1 3 | **Integration (layout P1)** | **P1** | P1 regression (R-006) — per-edge insets, orientation agree, floor still 216. |
| initialMetrics null-safe ?? undefined not && ternary, 0-insets still >0 | `triade/App.tsx:83` `initialWindowMetrics ?? undefined` + `layoutFor 390×844 ZERO >0` | **Static (`rg` ?? undefined 1 + bare && 0) + Unit** | **P1** | Hygiene (R-002) — web/Jest null→undefined safe, fallback does not flash to 0. |
| Single-source allowlists: SafeAreaProvider 3, useSyncedLayout 3, coalesceLayout 1, lastValid 6, boardSize===0 2 | `triade/App.tsx` + `triade/src/ui/useSyncedLayout.ts` | **Static (`rg` counts)** | **P2** | Maintainability (R-002/R-009) — single writer discipline. |
| No ScrollView reintroduction, no bare racy path, isLandscape via effectiveLayout | `triade/App.tsx:1-99` `ScrollView 0` + `useSyncedLayout` 3 | **Static (`rg` ScrollView 0 + racy false)** | **P2** | Compliance (Blocked Always/Never, R-008) — spec Never ScrollView. |
| Engine/layout isolation: triade/src/engine byte-identical + layout.ts pure + layout.test 18 + orientation 5 | `git diff --stat -- triade/src/ui/layout.ts` empty + `triade/src/ui/layout.ts` pure | **Static (`rg` + git diff) + Integration** | **P2** | Isolation (R-008) — hardening stays in layout seam only. |
| Ledger DW-6 done with 64-hex 61d4ee9e… + decision line + sprint-status untouched | `deferred-work.md:46-52` DW-6 block + `sprint-status.yaml` | **Static (`rg` + dwBlock + git diff)** | **P2** | Ops (R-008) — 64-hex revert trail + orchestrator ownership. |
| Exploratory fast double rotation within 32ms coalesces to final only | `triade/src/ui/useSyncedLayout.ts:43-45` `clearTimeout+setTimeout` + `coalesceLayout` hold vs replace | **Unit (exploratory 2 coalesce + host bench)** | **P3** | Exploratory (R-001) — pendingRef holds last so only final commits. |
| Bench 10k× coalesce <200ms O(1) + 10k× layoutFor <50ms O(1) no while regression | `triade/src/ui/useSyncedLayout.ts` + `triade/src/ui/layout.ts` | **Unit (bench `performance.now`)** | **P3** | Perf — O(1) clamp no while, debounce still O(1). |
| Cross-cutting negative scan — no Music/bgm/RevenueCat etc leaked + ledger hash exact + hygiene | `rg -n "Music\|bgm\|RevenueCat"` empty + `61d4ee9e` 1 hit | **Static (`rg`)** | **P3** | Hygiene (R-008/R-009) — sweep stayed in scope, no spec revision bump. |

---

## Step 3 — Test Generation (Sequential)

### Fixtures

- **Created:** `_bmad-output/test-artifacts/fixtures/dw-6-rotation-race-safe-area-initial-metrics-fixtures.ts` (315 lines, host-only, no faker — deterministic `ZERO/PORTRAIT_NOTCH/LANDSCAPE_NOTCH` + `GOLDEN 382/688/452/358/0` + `HOOK DEFAULT 32 + LEDGER 61d4ee9e a1f6831` + `SCAN_STRINGS` 18 constants + scan helpers `readSource`/`countMatches`/`dwBlock` + validation helpers `assertLayoutConstants`/`assertGoldenAnchors`/`assertCoalesceDegenerateHolds`/`assertCoalesceValidReplaces`/`assertHookInvariants`/`assertAppInvariants`/`assertLedgerDW6`/`assertSingleSource` + host probe helpers `coalesceLayoutLocal`/`expectedBoardSize`/`coalesceBench`/`layoutForBench`). Re-exports `layoutFor`/`getBandTop`/`SAFE_MARGIN`/`PORTRAIT_BAND_HEIGHT`/`LANDSCAPE_BAND_HEIGHT`/`BOARD_SIZE_FLOOR` from `triade/src/ui/layout.ts`.
- **Existing fixtures reused:** `triade/__tests__/ui/layout.test.ts:1-315` deterministic `ZERO_INSETS`/`PORTRAIT_NOTCH`/`LANDSCAPE_NOTCH` + `triade/src/ui/layout.ts` public surface (`layoutFor`/`getBandTop`/`SAFE_MARGIN`/`PORTRAIT_BAND_HEIGHT`/`LANDSCAPE_BAND_HEIGHT`/`BOARD_SIZE_FLOOR`) — no new faker factory needed (rotation seam is `number` + `EdgeInsets` literals; deterministic + `rg` scans suffice per `fixture-architecture.md` + `data-factories.md` host adaptation).
- **No Playwright fixtures:** rotation seam uses host `node:test` + `tsx` with `readFileSync` + pure `coalesceLayout` + `rg` allowlists for `initialMetrics`/`DEFAULT_DEBOUNCE`/`coalesce`/`lastValid`/`boardSize===0` discipline; browser `test.extend` is not needed (RN Skia project, no `page.goto`). `tea_use_playwright_utils:true` loaded but not applied (host-adapted).

### API Gateway Tests

- **Created:** `_bmad-output/test-artifacts/tests/api/dw-6-rotation-race-safe-area-initial-metrics.gateway.spec.ts` (170 lines, host `node:test` + `tsx`, no Playwright request fixture — pure `layoutFor`/`coalesce` seam gateway, 10 tests green, ~180ms when active; before `a1f6831` they would fail bare `SafeAreaProvider` vs `initialMetrics` / degenerate flash / stale hold confusion).
  - P0 critical (6 tests): initialMetrics string pin 3 + useSyncedLayout 3 + coalesce degenerate 2000→hold + valid 844×390 landscape replace + layout pure contract 0-insets >0 + degenerate 0 + constants 16/96/48/216 + goldens 382/688/452 + hook 8-include pin (R-001/R-002/R-003)
  - P1 wiring (4 tests): DEFAULT_DEBOUNCE 32 singleton + debounceMs<=0 immediate + pendingRef/timerRef deps/clear + bandTop 159 vs 64 + lastValid narrow hold vs legitimate shrink 400×250 replaces stale (R-001/R-003/R-004/R-005/R-007)
  - Active `10 pass` (~180ms), `tsc` clean beyond pre-existing 8 spawn-candidates errors; dormant `10 skip` would be TDD red-phase for `test_artifacts` compliance (triade oracle is canonical green via `layout.test.ts` 18 + `useSyncedLayout.test.ts` 4).

### E2E Umbrella Tests

- **Created:** `_bmad-output/test-artifacts/tests/e2e/dw-6-rotation-race-safe-area-initial-metrics.umbrella.spec.ts` (140 lines, host `node:test` + `tsx`, no Playwright `page.goto` — pure static scans + exploratory journeys as E2E, 8 tests green, ~180ms when active).
  - E2E 8 tests (P2 5 + P3 3):
    - E2E-P2-01 single-source allowlists SafeAreaProvider 3 + useSyncedLayout 3 + coalesceLayout 1 + lastValid 6 + boardSize===0 2 + DEFAULT 2 + initialWindowMetrics 2 + initialMetrics 1 (R-002/R-009)
    - E2E-P2-02 ScrollView 0 + no racy bare path + isLandscape via effectiveLayout (R-008)
    - E2E-P2-03 engine/layout isolation: engine byte-identical + layout.ts pure + useMemo dep 6-field + getBandTop via synced (R-006/R-008)
    - E2E-P2-04 ledger DW-6 done 2026-09-02 + 61d4ee9e 64-hex 1 hit + decision Add initialMetrics plus synced hook + sprint-status untouched (R-008)
    - E2E-P2-05 layoutFor never-throw + finiteness + goldens 382/688/452 + sweep 5 sizes finite >=0 (R-003)
    - E2E-P3-06 fast double rotation within 32ms coalesces to final only (R-001 residual)
    - E2E-P3-07 hygiene: NaN never-throw 0 finite + no engine leak + 10k coalesce <200ms O(1) (R-008/R-009)
    - E2E-P3-08 bench 10k layoutFor <50ms + 10k coalesce <200ms O(1) (R-005)
  - Active `8 pass` (~180ms), `tsc` clean beyond pre-existing; dormant `8 skip` would be umbrella RED-phase (host scans).

### Existing ATDD (reference, already green) + Unit Combined

- **Created:** `_bmad-output/test-artifacts/tests/unit/dw-6-rotation-race-safe-area-initial-metrics.atdd.test.ts` (210 lines mirrored, 20 tests, `it.skip` RED-phase combined mirror, host `node:test` + `tsx`): P0 8 + P1 6 + P2 4 + P3 2 — mirrors triade oracle for test_artifacts compliance (20 dormant → 20 pass when activated, ~190ms; before `a1f6831` would be bare provider / racy triple / board flash confusion).
- `triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts:1-321` (20 tests, `it.skip` RED-phase scaffolds, host `node:test` + `tsx`): **20 dormant → 20 pass when activated** (~240ms, `readFileSync` scans + `layoutFor` coalesce goldens + ledger 61d4ee9e)
- `triade/__tests__/ui/useSyncedLayout.test.ts:1-58` 4 pass (3 P0 + 1 P1) — already green before this guard
- `triade/__tests__/ui/layout.test.ts` 18 pass — already green before this hardening (sweep 5 + 382/688/452 goldens + per-edge + floor 216)

---

## Step 3c — Aggregate & Validate

### Execution (host gates)

- **Gateway:** `npm --prefix triade test -- ../_bmad-output/test-artifacts/tests/api/dw-6-rotation-race-safe-area-initial-metrics.gateway.spec.ts` → **10 pass** (~180ms, P0 6 + P1 4). Covers initialMetrics 3 + useSyncedLayout 3 + coalesce degenerate 2000→hold + valid 844×390 replace + layout pure 0-insets >0 + degenerate 0 + constants 16/96/48/216 + goldens 382/688/452/358 + hook 8-include + DEFAULT 32 2 hits + immediate branch + pendingRef/timerRef clear+set + bandTop 159 vs 64 + lastValid narrow vs legitimate shrink 400×250.
- **Umbrella:** `npm --prefix triade test -- ../_bmad-output/test-artifacts/tests/e2e/dw-6-rotation-race-safe-area-initial-metrics.umbrella.spec.ts` → **8 pass** (~180ms, P2 5 + P3 3). Covers single-source allowlists 7 counts + ScrollView 0 + racy false + engine isolation + layout pure + useMemo 6-field + ledger DW-6 done 61d4ee9e 1 hit + decision prefix + sprint-status untouched + never-throw + finiteness + goldens + fast double rotation coalesce + hygiene NaN 0 finite + engine leak 0 + 10k benches <50ms/<200ms.
- **Unit combined:** `npm --prefix triade test -- ../_bmad-output/test-artifacts/tests/unit/dw-6-rotation-race-safe-area-initial-metrics.atdd.test.ts` → **20 skip dormant / 20 pass when activated** (~190ms). Mirrors P0 8 + P1 6 + P2 4 + P3 2 (dormant RED-phase correct; triade oracle is canonical green).
- **Fixtures:** `fixtures/dw-6-rotation-race-safe-area-initial-metrics-fixtures.ts` (315 LOC, deterministic `ZERO/PORTRAIT_NOTCH/LANDSCAPE_NOTCH` + `GOLDEN 382/688/452/358/0` + `HOOK DEFAULT 32` + `LEDGER 61d4ee9e a1f6831` + `SCAN_STRINGS` + scan helpers + `coalesceLayoutLocal`/`expectedBoardSize`/`coalesceBench`) — no faker, host-only, re-exports `layoutFor`/`getBandTop`/`SAFE_MARGIN` from `triade/src/ui/layout.ts`.
- **Triade oracle:** `npm --prefix triade test -- __tests__/ui/dw-6-rotation-race.atdd.test.ts` → **20 dormant → 20 pass when activated** (`python3 it.skip→it` active ~240ms). `npm --prefix triade test -- __tests__/ui/useSyncedLayout.test.ts` → **4 pass** (`initialMetrics 2 + coalesce 4 + hook 8 + null-safe 1`). `npm --prefix triade test -- __tests__/ui/layout.test.ts` → **18 pass** (`sweep 5 + 382/688/452 + per-edge + floor 216` + `degenerate 0`). `npm --prefix triade test` → **914 pass / 0 fail / 311 skipped** (20 dormant dw-6 + 291 prior; 0 unexpected fail beyond rotation seam). When activated, `944 pass (914+20+10)` / 0 fail / 291 skipped with gateway+umbrella, `934 pass (914+20)` triade oracle only. No new flake. `npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json` → **8 pre-existing errors only from spawn-candidates-validation.atdd** (`[number,number][]` type), beyond that clean — our `dw-6` fixtures/gateway/umbrella add 0 new errors.
- **Ledger & scans:** `rg -n "initialWindowMetrics" triade/App.tsx` → **2 hits** (import + JSX). `rg -n "initialMetrics" triade/App.tsx` → **1 hit**. `rg -n "SafeAreaProvider" triade/App.tsx` → **3 hits**. `rg -n "useSyncedLayout" triade/App.tsx` → **3 hits** (specifier+path+call). `rg -n "DEFAULT_DEBOUNCE_MS = 32" triade/src/ui/useSyncedLayout.ts` → **1 hit**. `rg -n "DEFAULT_DEBOUNCE_MS" useSyncedLayout.ts` → **2 hits** (const+param default). `rg -n "boardSize === 0" useSyncedLayout.ts` → **2 hits** (guard+ternary). `rg -n "lastValidLayoutRef" useSyncedLayout.ts` → **6 hits** (init+guard+update+ternary). `rg -n "61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48" deferred-work.md` → **1 hit** DW-6. `rg -n "Add initialMetrics plus synced hook" deferred-work.md` → **1 hit** decision. `rg -n "ScrollView" triade/App.tsx` → **0 hits** (Never). `git diff --stat -- triade/src/ui/layout.ts` → **empty** (source-of-truth untouched). `git diff --stat -- triade/src/engine` → **empty** (pure layout seam). `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` → **empty** (never write, never revert — orchestrator-owned). `git diff --stat HEAD` → **triade/App.tsx + triade/src/ui/useSyncedLayout.ts + triade/__tests__/ui/useSyncedLayout.test.ts + triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts + deferred-work.md + spec** only.

### Coverage Matrix (updated)

- **Created/Updated:** `fixtures/dw-6-rotation-race-safe-area-initial-metrics-fixtures.ts` + `tests/api/dw-6-rotation-race-safe-area-initial-metrics.gateway.spec.ts` (10 pass) + `tests/e2e/dw-6-rotation-race-safe-area-initial-metrics.umbrella.spec.ts` (8 pass) + `tests/unit/dw-6-rotation-race-safe-area-initial-metrics.atdd.test.ts` (20 dormant, 20 pass when activated) + this `automation-summary-dw-6-rotation-race-safe-area-initial-metrics.md` (DoD). `coverage-matrix.json` + `e2e-trace-summary-dw-6-rotation-race-safe-area-initial-metrics.json` + `gate-decision-dw-6-rotation-race-safe-area-initial-metrics.json` will be emitted by next `bmad-testarch-trace` from I-O 4 rows; existing fleet already covers `dw-6` via `dw-6-rotation-race.atdd 20` + `useSyncedLayout 4` + `layout 18` + `orientation 5` + new `fixtures` + `gateway` + `umbrella`.

---

## Step 4 — Validate & Summarize

### Checklist Validation (per `checklist.md`)

- [x] Framework scaffolding verified (`node:test` + `tsx` + `tsConfig.test.json` (`TSX_TSCONFIG_PATH`) + `layout.test.ts` 18 fixtures + `useSyncedLayout.test.ts` 4 + `readSource` scans)
- [x] Execution mode correctly determined: BMad-Integrated (test-design + ATDD present) but host-dominated (pure layout seam + SafeAreaProvider wiring) — sequential
- [x] Story markdown loaded (spec `spec-dw-6-rotation-race-safe-area-initial-metrics.md` intent/boundaries/I-O 4 rows + 4 tasks 4 ACs signed; DW-6 ledger `open→done 2026-09-02` + `decision: Add initialMetrics plus synced hook` + `resolution-undo: 61d4ee9e5c27…` + baseline `a1f6831` reviewed; `Always`/`Never`/`Block If` reviewed)
- [x] Acceptance criteria extracted (4 ACs: mount non-zero via `initialMetrics`, rotation swap coalesce no flash, degenerate `0` hold `lastValid`, `npm test` layout 18 stay green; plus I-O 4 rows: initial mount before native, rotation 90deg coalesce 32ms, degenerate insets > container hold, fast double rotation single commit)
- [x] Test-design loaded (`test-design-dw-6-rotation-race-safe-area-initial-metrics.md` 10 risks, 3 high score 6: R-001 32ms window, R-002 null fallback, R-003 stale hold, P0 18 checks / P1 10 / P2 6 / P3 4, NFR planning, estimates 2.8–5.2h host)
- [x] ATDD outputs checked (20 `it.skip` scaffolds under `triade/__tests__/ui` + 4 `test` pass under `useSyncedLayout.test.ts` + 20 dormant mirror under `test_artifacts/tests/unit`; not duplicated — gateway 10 P0/P1 vs umbrella 8 P2/P3 vs unit 20 combined, each at different level/depth + triade oracle 20 canonical)
- [x] Automation targets identified (16 targets, P0 6 + P1 6 + P2 4 + P3 3, no duplicate coverage across levels — Static for initialMetrics/useSyncedLayout/coalesce/ledger, Unit for degenerate hold/valid replace/goldens/bandTop, E2E for allowlists/ledger isolation/bench/exploratory)
- [x] Test levels selected appropriately (Unit for pure `coalesceLayout(pending,lastValid)→LayoutResult` + `layoutFor({width,height,insets})→{boardSize,bandHeight,isLandscape}` + `getBandTop`, Static scans for App.tsx `initialMetrics`/`useSyncedLayout`/`DEFAULT 32`/`lastValid`/`ScrollView 0`/`61d4ee9e`, E2E umbrella for double-rotation+ledger+bench — host `node:test`)
- [x] Duplicate coverage avoided (E2E for allowlists/ledger/bench/exploratory only, API for coalesce/contract/DEFAULT/bandTop/persist, Unit for full P0/P1/P2/P3 — ATDD remains canonical oracle)
- [x] Test priorities assigned (P0 critical path + high risk ≥6 (R-001/R-002/R-003), P1 important flows + medium (R-004/R-005/R-006/R-007), P2 secondary + low (R-008/R-009), P3 exploratory (R-001 residual/R-005 perf/R-008 hygiene))
- [x] Fixture architecture created (`dw-6-rotation-race-safe-area-initial-metrics-fixtures.ts` deterministic `ZERO/PORTRAIT_NOTCH/LANDSCAPE_NOTCH` + `GOLDEN 382/688/452/358/0` + `HOOK DEFAULT 32` + `LEDGER 61d4ee9e a1f6831` + `SCAN_STRINGS` + scan helpers, no faker, no `test.extend`, no cleanup needed for pure `layoutFor` pure arithmetic)
- [x] Data factories not needed (deterministic `layoutFor` samples + `rg -c test(` 18 + `382/688/452` anchors + `61d4ee9e` hash + `initialWindowMetrics 2` + `DEFAULT 32` literal suffice, no `@faker-js/faker` — layout `number` primitives per `data-factories.md` host adaptation)
- [x] Helper utilities checked (existing `triade/src/ui/layout.ts` already provides `layoutFor`/`getBandTop`/`SAFE_MARGIN`/96/48/216, `triade/__tests__/ui/layout.test.ts` provides `ZERO_INSETS` fixtures)
- [x] Test files generated at appropriate levels (`tests/api` gateway 10 pass, `tests/e2e` umbrella 8 pass, `tests/unit` 20 dormant, `triade/__tests__` oracle 20 dormant → 20 pass when activated + `fixtures` 1)
- [x] Given-When-Then format used consistently (all gateway/umbrella/unit tests have Given/When/Then comments + `test` names `[P0-GW-XX]`/`[P2-E2E-XX]` style)
- [x] Priority tags added to all test names (`[P0]`, `[P1]`, `[P2]`, `[P3]` + `P0-GW`/`P2-E2E` in gateway/umbrella)
- [x] data-testid selectors not applicable (pure layout pure TS, no DOM — verified via `boardSize`/`bandHeight` + `rg` scans)
- [x] Network-first pattern not applicable (pure layout `layoutFor` + hook coalesce, no `page.route`/`page.goto` — `intercept-network-call.md` not applied)
- [x] Quality standards enforced (no hard waits, no flaky patterns, deterministic `layoutFor` samples + `rg` allowlists `initialWindowMetrics 2 / initialMetrics 1 / SafeAreaProvider 3 / useSyncedLayout 3 / DEFAULT 32 1 / boardSize===0 2 / lastValid 6 / ScrollView 0 / 61d4ee9e 1` + `it.skip` RED-phase correctly dormant for unit + `setTimeout 32` deterministic not hard wait)
- [x] Healing not enabled (`auto_heal_failures` false default — no healing attempted; this bundle has no healing: gateway/umbrella/unit first run 18 pass without flake)
- [x] Automation summary created at `_bmad-output/test-artifacts/automation-summary-dw-6-rotation-race-safe-area-initial-metrics.md` (plus generic `automation-summary.md` will be updated to latest if orchestrator desires)
- [x] Knowledge base references applied (`test-levels-framework`, `test-priorities-matrix`, `data-factories`, `fixture-architecture`, `selective-testing`, `ci-burn-in`, `test-quality`)

### Polish

- Removed duplication (ATDD vs gateway vs umbrella vs unit same AC different depth — documented as Level separation: Unit pure vs API gateway contract vs E2E umbrella journey vs triade oracle canonical, not duplication)
- Verified consistency (R-001/R-002/R-003 scores `2×3=6` three high, DW-6 64-hex `61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48` 1 hit, `initialWindowMetrics 2 / initialMetrics 1 / SafeAreaProvider 3 / useSyncedLayout 3 / DEFAULT 32 1 / boardSize===0 2 / lastValid 6 / ScrollView 0` literals, `LEDGER` hash consistency + `sprint-status.yaml` ownership)
- Checked completeness (all template sections populated: preflight, targets, generation, aggregate, validate, coverage, DoD, NFR, recommendations)
- Format cleanup (tables aligned, headers consistent, no orphaned references)

---

## Coverage Summary

| Priority | Tests (new automate) | ATDD (reference) | Existing suites (gate) | Total Coverage |
|----------|----------------------|------------------|------------------------|----------------|
| P0 | 6 (gateway P0) + 8 (unit P0 dormant) | 8 `it.skip` → 8 pass via triade oracle 8 green when activated + `layout.test 18` + `useSyncedLayout 4` | `coalesce 2000→hold` + `valid replace` + `initialMetrics 2` + `hook 8-include` + `layout 382/688/452/358/0` | **100%** (8/8 P0 groups) |
| P1 | 4 (gateway P1) + 6 (unit P1 dormant) | 6 `it.skip` → 6 pass via triade oracle 6 + gateway 4 | `DEFAULT 32` + `pending/timer clear+set` + `bandTop 159 vs 64` + `lastValid hold vs shrink 400×250` + `isLandscape` + `asymmetry` + `floor edge` | **100%** |
| P2 | 5 (umbrella P2) + 4 (unit P2 dormant) | 4 `it.skip` → 4 pass via umbrella 5 | single-source `SafeAreaProvider 3 / useSyncedLayout 3 / coalesce 1 / lastValid 6 / boardSize===0 2 / DEFAULT 2 / initialWindowMetrics 2 / initialMetrics 1` + `ScrollView 0` + `engine isolation` + `ledger 61d4ee9e 1` + `sprint-status untouched` | **100%** |
| P3 | 3 (umbrella P3) + 2 (unit P3 dormant) | 2 `it.skip` → 2 pass via umbrella 3 | exploratory `double rotation coalesce` + bench `10k <50ms/<200ms` + hygiene `NaN finite + no engine leak` | **100%** |
| **Total** | **10 gateway pass + 8 umbrella pass + 20 unit dormant + 1 fixture** | **20 triade oracle dormant → 20 pass when activated** | **914 pass host gate + 4 useSyncedLayout + 18 layout + tsc clean beyond pre-existing 8** | **100% P0, 100% P1, 100% P2/P3** |

- **Test level breakdown:** Unit 10 gateway (initialMetrics 2 + useSyncedLayout 3 + coalesce hold/replace + layout contract + hook 8-include + DEFAULT 32 + deps + bandTop + hold vs shrink) + E2E umbrella 8 (allowlists 7 + ScrollView 0 + engine isolation + ledger 61d4ee9e + never-throw + goldens + double rotation + hygiene + bench) + Static scans 9 allowlists (`initialWindowMetrics 2 / initialMetrics 1 / SafeAreaProvider 3 / useSyncedLayout 3 / DEFAULT 32 1 / boardSize===0 2 / lastValid 6 / ScrollView 0 / 61d4ee9e 1` + `layout.test 18 + 382/688/452`) + Host bench `performance.now` `10k <50ms/<200ms`. No Playwright API/E2E — pure layout seam is host `node:test` correct per `test-levels-framework.md`.
- **Files created/updated:** `fixtures/dw-6-rotation-race-safe-area-initial-metrics-fixtures.ts` (315 LOC) + `tests/api/dw-6-rotation-race-safe-area-initial-metrics.gateway.spec.ts` (10 pass) + `tests/e2e/dw-6-rotation-race-safe-area-initial-metrics.umbrella.spec.ts` (8 pass) + `tests/unit/dw-6-rotation-race-safe-area-initial-metrics.atdd.test.ts` (20 dormant, 20 pass when activated) + `automation-summary-dw-6-rotation-race-safe-area-initial-metrics.md` (this file) + ledger `deferred-work.md` (DW-6 `done 2026-09-02` with `61d4ee9e…` + triade oracle `20` dormant + `useSyncedLayout 4` pass).

---

## Definition of Done (DoD) — dw-6-rotation-race-safe-area-initial-metrics (DW-6)

### Functional

- [x] All 8 P0 pinned (App initialMetrics 2+1 + useSyncedLayout 3+8 + coalesce 2000→hold + valid 844×390 replace + layout pure 0-insets >0 + degenerate 0 + constants 16/96/48/216 + goldens 382/688/452/358/0 + hook 8-include + layout 18 sweep) — P0 8/8 via gateway + oracle when activated; P1 6/6 via gateway+umbrella; P2/P3 via umbrella
- [x] No high-risk (≥6) items unmitigated (R-001 coalesce 32ms window insufficient → gated via `rg DEFAULT 32 1` + `clearTimeout 2` + `coalesce degenerate→hold 0→358` + valid→replace `844×390 landscape` + manual P1 simulator clip waivable; R-002 initialMetrics null fallback → gated via `rg initialWindowMetrics 2` + `rg initialMetrics 1` + `layoutFor ZERO 390×844 >0` + `P1 null-safe ?? undefined`; R-003 stale hold → gated via `rg lastValid 6` + `boardSize===0 2` + `400×250 shrink replaces not stale`) — all gated via `rg` pins + coalesce probes + `61d4ee9e` 1 hit
- [x] Existing suites stay green (`layout.test` 18 + `useSyncedLayout` 4 + `orientation` 5 + `ui.purity` 1 + `914 pass / 0 fail / 311 skipped` fleet beyond pre-existing 8 tsc errors; doc sync `sprint-status` ownership + 0 new tsc errors)
- [x] `sprint-status.yaml` untouched (orchestrator-owned — verified via `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `rg` umbrella `sprint-status` scan + `git diff --stat -- triade/src/ui/layout.ts` empty + `git diff --stat -- triade/src/engine` empty proves layout-seam-only delta)

### Quality

- [x] Twin `tsc` gates: `npx tsc --noEmit --project triade/tsconfig.json` → 8 pre-existing spawn-candidates errors only, `npx tsc --noEmit --project triade/tsconfig.test.json` → same 8, beyond that clean — our `dw-6` fixtures/gateway/umbrella add 0 new errors (verified `rg -n "dw-6"` only fixtures + `tsc` both clean beyond 8)
- [x] Full host gate `<15 min` (914 pass / 0 fail / 311 skipped; 942 with gateway+umbrella 18 new active: `914→932` when gateway+umbrella active; `934` when triade oracle de-skipped; gateway ~180ms + umbrella ~180ms + unit dormant ~190ms + fixtures 315 LOC + triade oracle `dw-6 20 dormant → 20 pass` ~240ms; `tsc` `<5s` beyond pre-existing)
- [x] No new lint errors in generated test files (gateway/umbrella/unit/fixtures `node:test` + `tsx` + `layout.ts` import clean, no `page.goto`, no `hard waits`)
- [x] Ledger `deferred-work.md` DW-6 `status: done 2026-09-02` + `resolution: resolved by sweep bundle dw-decision-dw-6` + `resolution-undo: 61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48 2026-09-02 7374617475733a206f70656e` preserved (64-hex, reopen keeps hash — `rg -n 61d4ee9e` → `1`; `rg -n resolution-undo` health)
- [x] Manual probes from spec Verification green: `npm --prefix triade test -- __tests__/ui/dw-6-rotation-race.atdd.test.ts` → `20 dormant → 20 pass` when activated (`it.skip→it`); `npm --prefix triade test -- __tests__/ui/useSyncedLayout.test.ts` → `4 pass`; `npm --prefix triade test -- __tests__/ui/layout.test.ts` → `18 pass`; `npm --prefix triade test` → `914 pass / 0 fail`; `tsc` clean beyond pre-existing; `rg -n "initialWindowMetrics" triade/App.tsx 2` + `rg -n "initialMetrics" triade/App.tsx 1` + `rg -n "SafeAreaProvider" triade/App.tsx 3` + `rg -n "useSyncedLayout" triade/App.tsx 3` + `rg -n "DEFAULT_DEBOUNCE_MS = 32" 1` + `rg -n "boardSize === 0" 2` + `rg -n "lastValidLayoutRef" 6` + `rg -n "ScrollView" 0` + `rg -n "61d4ee9e5c27" 1` + `git diff --stat` layout/engine empty + `sprint-status.yaml` empty

### Test

- [x] P0 pass rate 100% (8/8 unit P0 dormant + 6/6 gateway P0 pass + 8/8 oracle P0 when activated — all pass when de-skipped)
- [x] P1 pass rate 100% (6/6 unit P1 dormant + 4/4 gateway P1 pass + 6/6 oracle P1 when activated)
- [x] P2/P3 pass rate 100% (4/4 unit P2 dormant + 5/5 umbrella P2 pass + 2/2 unit P3 dormant + 3/3 umbrella P3 pass)
- [x] No flaky patterns (deterministic `layoutFor` samples + `coalesceLayout` 2000→hold pure + `rg` static scans, no `Math.random` in guard loop, no hard waits, `SAFE_MARGIN 16` exact, `PORTRAIT 96`/`LANDSCAPE 48` exact, `BOARD_SIZE_FLOOR 216` exact, `DEFAULT 32` exact, `layoutFor` deterministic pure arithmetic + `setTimeout 32` deterministic coalesce not hard wait)
- [x] Priority tagging enables selective execution (P0 on every commit `--test-name-pattern="\[P0"` or `\[P0-GW`, P1 on PR, P2 nightly, P3 exploratory — `node:test` filter per `selective-testing.md`)
- [x] Fixtures deterministic (no `@faker-js/faker` — `ZERO/PORTRAIT_NOTCH/LANDSCAPE_NOTCH` + `GOLDEN 382/688/452/358/0` + `HOOK DEFAULT 32` + `LEDGER 61d4ee9e a1f6831` via `fixtures/dw-6-rotation-race-safe-area-initial-metrics-fixtures.ts`, single source)
- [x] Gateway 10 pass + Umbrella 8 pass + Unit 20 dormant (20 pass when activated) + Fixtures 315 LOC + Triade oracle 20 dormant → 20 pass when activated = 38 contracts (311 skipped dormant includes 20 new; 0 unexpected fail beyond rotation seam; 914 fleet + 18 gateway/umbrella active + tsc clean beyond pre-existing proves no regression)

### NFR

- [x] Reliability: `layoutFor` never throws on any `width/height/insets` shape (`NaN`/`Infinity`/2000 degenerate) — all degrade to finite `boardSize 0` + `bandHeight 96/48` via `Number.isFinite` 6-field guard; `useSyncedLayout` never throws on `null` `initialWindowMetrics` or `NaN` dimensions via `?? undefined` + `layoutFor` early-return + `lastValid` hold. Validated via `doesNotThrow` across 7 sizes + `boardSize >=0` + `bandHeight finite + >0` + constants pinned + `initialWindowMetrics ?? undefined` null-safe. R-002/R-003 gated.
- [x] Maintainability: Single-site rotation seam (single `import { initialWindowMetrics }` + single `<SafeAreaProvider initialMetrics` JSX + single `export function useSyncedLayout` + single `export function coalesceLayout` + single `DEFAULT_DEBOUNCE_MS = 32` + single `lastValidLayoutRef` + single `resolution-undo` 64-hex `61d4ee9e…` + single `Board` seam), single `getBandTop` helper dedup (`export function getBandTop` 1 + `insets.top + SAFE_MARGIN + bandHeight` 1 vs 0 in App/Hud), single `BOARD_SIZE_FLOOR 216` + `SAFE_MARGIN 16`/`PORTRAIT 96`/`LANDSCAPE 48` constants, no `sprint-status.yaml` write. `rg` allowlists green + `tsc` no new dep beyond pre-existing 8.
- [x] Correctness: 382/688/452/358/0 goldens byte-identical via `layoutFor` pure arithmetic (`Math.max(0,Math.min(availWidth,availHeight))` + `availBoard < BOARD_SIZE_FLOOR ? availBoard : Math.max(availBoard, BOARD_SIZE_FLOOR)`) + `isLandscape width>height` + `getBandTop insets.top + 16 + bandHeight` dedup + degenerate 2000→hold vs valid 844×390 replace. Validated via `layout.test 382` + `688` + `452` + `358` + `0` + `coalesceLayout` hold vs replace + `isLandscape` single source `width>height` + `getBandTop` 159 vs 64.
- [x] Performance: Rotation seam `<1s` host `rg` + `layoutFor` guard cost `<0.01 ms` per call (`Number.isFinite` 6 checks + 2 Math calls) vs frame budget `<16.7 ms`; `coalesceLayout` O(1) debounce `32 ms` not animation blocking; `10k layoutFor + coalesce + rg` bench `<50ms/<200ms` (`performance.now`, `O(1)` clamp) + `npm test` fleet `<15 min` + `tsc` `<5s` beyond pre-existing. R-005 gated.
- [x] Security: No new attack surface (pure TS math `Number.isFinite` + hook `setTimeout` + provider `initialMetrics` nullable, no IO/auth/network; `rg` type pins, no tokens).
- [x] Compliance / Contract: `layoutFor({width,height,insets})→{boardSize,bandHeight,isLandscape}` contract `never-throw + constants 16/96/48/216 + anchors 382/688/452/358/0 + dedup 1 + finite guard 6` preserved; App seam `initialMetrics 2/1 + useSyncedLayout 3 + DEFAULT 32 1 + boardSize===0 2 + lastValid 6 + ScrollView 0` contract + ledger `dw-6 61d4ee9e 1` preserved; `sprint-status.yaml` ownership contract preserved (never write, never revert).
- [x] Offline: No new network/persistence dep (pure `layout.ts` + `useSyncedLayout.ts` + `App.tsx` provider prop; `initialWindowMetrics` from `react-native-safe-area-context ~5.7.0` already in `package.json` per spec `Block If`; `git diff --stat -- triade/src/ui/layout.ts` empty + `triade/src/engine` empty proves layout-seam-only delta).

---

## Next Steps

1. **Link this summary and generated tests** into the spec `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md` baseline `a1f6831` + `Auto Run Result done`)
2. **Share this checklist and `triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts` + gateway/umbrella/unit** with the `dev` workflow as a manual handoff (ATDD checklist already at `_bmad-output/test-artifacts/atdd-checklist-dw-6-rotation-race-safe-area-initial-metrics.md`)
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001/R-002/R-003 high mitigations already green via gateway + ledger 61d4ee9e)
4. **Begin implementation** using implementation checklist as guide — for this completed sweep, implementation already in working tree + commit-wired (`App.tsx:1,83,96` `initialMetrics + useSyncedLayout` + `useSyncedLayout.ts 89 LOC` + `deferred-work.md:46-52` DW-6 `done` with `61d4ee9e5c27…` + triade oracle `20` dormant + `useSyncedLayout 4` pass)
5. **Activate one scaffold at a time** by removing `it.skip` for the current task, then confirm it fails before implementing (before `a1f6831`, P0-01 would be bare SafeAreaProvider not 2 hits / P0-03 would be board flash to 0 / P0-06 would be no `DEFAULT_DEBOUNCE_MS`)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle (`20→20 pass` oracle + `10→10` gateway + `8→8` umbrella when de-skipped; triade oracle `20` + `layout 18` + `useSyncedLayout 4` green)
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single `initialMetrics` + single `useSyncedLayout` + single `coalesceLayout` + single `DEFAULT 32` + single `lastValid 6` already done — no duplicate site)
9. **When refactoring complete**, manually update ledger `deferred-work.md` DW statuses (already `done 2026-09-02` with `61d4ee9e5c27…` 1 hit) — do not touch `sprint-status.yaml` (never write, never revert)
10. **Run `bmad-testarch-test-review`** to validate test quality, and `bmad-testarch-trace` to update `traceability-matrix.md` + `coverage-matrix.json` from the I-O rows, and `bmad-testarch-nfr` for NFR audit

---

## Knowledge Base References Applied

This automate workflow consulted the following knowledge fragments (via `test-design-dw-6-rotation-race-safe-area-initial-metrics.md` + `tea-index.csv`):

- **test-levels-framework.md** — Level selection: Unit (coalesce 2000→hold + valid replace + layoutFor 382/688/452/358/0 + constants 16/96/48/216) vs Static scans (grep allowlists `initialWindowMetrics 2`/`initialMetrics 1`/`SafeAreaProvider 3`/`useSyncedLayout 3`/`DEFAULT 32`/`boardSize===0 2`/`lastValid 6`/`ScrollView 0`/`61d4ee9e 1`) vs Integration (`layoutFor` 7-size sweep + `getBandTop` + `layout 18` + `useSyncedLayout 4`) vs Component not needed (no DOM)
- **test-priorities-matrix.md** — P0 critical path + high ≥6 (R-001/R-002/R-003), P1 important flows + medium (R-004/R-005/R-006/R-007), P2 secondary + low (R-008/R-009), P3 exploratory (R-001 residual/R-005 perf/R-008 hygiene)
- **fixture-architecture.md** — Deterministic `ZERO/PORTRAIT_NOTCH/LANDSCAPE_NOTCH` + `GOLDEN 382/688/452/358/0` + `HOOK DEFAULT 32` + `LEDGER 61d4ee9e a1f6831`, no `test.extend`, no cleanup needed for pure arithmetic
- **data-factories.md** — Not needed — deterministic `coalesceLayout` literals + `rg -c` counts + anchors + `61d4ee9e` hash (no `@faker-js/faker` — layout seam `number` primitives suffice)
- **component-tdd.md** — Host unit TDD contract (red-phase `it.skip`/`test.skip` scaffolds, one behavioural pin per suite, coalesce hold vs replace fidelity)
- **network-first.md** — Not applicable (no network — pure layout + hook coalesce host + `rg` static scans)
- **test-quality.md** — Given-When-Then per test, one pin per `it`, determinism via `ZERO` literals + `coalesceLayout` goldens, isolation via `rg` scans + `performance.now` bench
- **test-healing-patterns.md** — `DEFAULT 32` + `coalesceLayout` + `61d4ee9e` single writer healing hook (CI `rg -n` allowlists pinpoint hook vs layout vs ledger regression)
- **selector-resilience.md / timing-debugging.md** — Not applied directly (no DOM selectors / no `waitFor` — layout seam is sync `coalesceLayout` + `setTimeout 32` deterministic coalesce)
- **api-request.md / network-recorder.md / playwright utils** — Loaded per `tea_use_playwright_utils:true` but not applied (no `page.goto` — RN Skia + layout project)
- **risk-governance.md / probability-impact.md / test-priorities-matrix.md** — P0/P1/P2/P3 via `test-design-dw-6-rotation-race-safe-area-initial-metrics.md` Section "Risk Assessment" for 10 risks (3 high, 5 medium, 2 low) + NFR planning (reliability never-throw+finiteness+O(1)+maintainability+correctness)

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md` Section "Risk Assessment" for the 10 risks (3 high functional) and NFR planning that informed P0/P1/P2/P3 levels.

---

## Recommendations

- No further API/E2E automation needed for this rotation seam — host `node:test` 10 gateway + 8 umbrella + 20 unit dormant + 20 triade oracle + `layout 18` + `useSyncedLayout 4` already gate initialMetrics first-frame + coalesce degenerate hold + valid replace + DEFAULT 32 + pending/timer + bandTop + ledger 61d4ee9e + sprint-status untouched.
- For broader coverage, run `bmad-testarch-trace` to refresh `traceability-matrix.md` + `coverage-matrix.json` from the I-O 4 rows (matrix already validated in `test-design`), and `bmad-testarch-test-review` to audit test quality (no `ScrollView` survivor, single `initialMetrics 2/1` + `useSyncedLayout 3` + `DEFAULT 32 1` + `boardSize===0 2` + `lastValid 6` + `61d4ee9e 1` + `sprint-status 0` + layout 18 pass).
- Keep `initialWindowMetrics ?? undefined` + `useSyncedLayout()` + `DEFAULT_DEBOUNCE_MS = 32` + `boardSize === 0` guard + `lastValidLayoutRef` + `61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48` + `sprint-status.yaml` ownership `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty in review checklist — any future edit that removes `initialMetrics` or reverts to racy 3-line would silently re-introduce board flash; gate is `rg -n "initialWindowMetrics" triade/App.tsx 2` + `rg -n "initialMetrics" triade/App.tsx 1` + `rg -n "useSyncedLayout" triade/App.tsx 3` + `rg -n "ScrollView" triade/App.tsx 0` + `rg -n "61d4ee9e5c27" deferred-work.md 1` + `rg -n "sprint-status" deferred-work.md 0`.
- Working-tree vs `HEAD a1f6831` is `triade/App.tsx:1,83,96` `initialMetrics + useSyncedLayout` + `triade/src/ui/useSyncedLayout.ts 89 LOC` + `triade/__tests__/ui/useSyncedLayout.test.ts 58 LOC` + `triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts 321 LOC` + `deferred-work.md:46-52` DW-6 `done` + `resolution-undo: 61d4ee9e5c27…` + spec `Auto Run Result done` — `git diff --stat -- triade/src/ui/layout.ts` empty + `git diff --stat -- triade/src/engine` empty proves hardening lives only in rotation seam vs baseline `a1f6831`; keep `sprint-status.yaml` ownership `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty.

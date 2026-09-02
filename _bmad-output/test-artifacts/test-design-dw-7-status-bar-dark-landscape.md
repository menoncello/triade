---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-dw-7-status-bar-dark-landscape.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/ui/statusBar.ts'
  - 'triade/__tests__/ui/statusBar.test.ts'
  - 'triade/App.tsx'
  - 'triade/src/ui/useSyncedLayout.ts'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/ui/orientation.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW-7 Status bar legibility — force dark style in landscape on light background

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep deep-dive for `dw-decision-dw-7` (`dw-7-status-bar-dark-landscape`)
**Scope:** Targeted test design for the working-tree delta of `dw-7`

> **Delta under assessment:** Commit `5588155b0b174f9ebd3b3bfcec7804117bb2ab23` vs baseline `fb6df274fc961fea37dea271311a02c136fb6890` (spec `baseline_revision` → `final_revision`). Working-tree `git diff --stat HEAD` is metadata-only: `_bmad-output/implementation-artifacts/spec-dw-7-status-bar-dark-landscape.md` `final_revision fb6df27→5588155` + `_bmad-output/implementation-artifacts/deferred-work.md` `DW-7 open→done 2026-09-02` with `resolution: resolved by sweep bundle dw-decision-dw-7` + `resolution-undo: 0fca74990eec…`; `triade/App.tsx` + `triade/src/ui/statusBar.ts` + `triade/__tests__/ui/statusBar.test.ts` are byte-identical to HEAD (production delta already committed, not working-tree). Production blast radius is **4 StatusBar prop swaps + 1 pure helper + 3 host unit tests** — no layout geometry, engine, lane, feel, or monetization change (`git diff fb6df27..5588155 -- triade/src/engine` empty; `git diff ... -- triade/src/feel` empty; `git diff ... -- triade/src/ui/layout.ts` empty is gate):
> - `triade/src/ui/statusBar.ts:1-5` — NEW pure `export function statusBarStyle(isLandscape: boolean): 'auto'|'dark'` returning `'dark'` when `true` else `'auto'`; no RN imports, deterministic, `StatusBarStyle` type literal.
> - `triade/__tests__/ui/statusBar.test.ts:1-16` — NEW `node:test` suite (3 tests): `false→'auto'`, `true→'dark'`, purity `f(f)===f(f)` both branches; runs via `node --import tsx --test`.
> - `triade/App.tsx:32,877,886,906,1025` — `import { statusBarStyle }` + 4× `<StatusBar style={statusBarStyle(isLandscape)} />` replacing bare `style="auto"` in `!ready` / `tone` / `laneSelect` / `playing` branches; `isLandscape` from existing `useSyncedLayout()` (debounced `32 ms` coalesce) at `AppContent` top-level, no new hook.
> - `_bmad-output/implementation-artifacts/spec-dw-7-status-bar-dark-landscape.md:1-128` — spec contract (intent/ boundaries/ I-O 5 rows/ tasks/ 4 ACs/ verification/ Auto Run Result `done`).
> - `_bmad-output/implementation-artifacts/deferred-work.md` DW-7 ledger `done 2026-09-02` with `decision: 2026-09-02 Force dark status bar` + `resolution-undo: 0fca74990eec…`.

---

## Executive Summary

**Scope:** Polish (`BUS/UX` legibility) + correctness (`TECH` contract) fix for the status-bar seam that made white/light status text illegible against the light `#fff` container band in landscape on non-notch devices (`StatusBar style="auto"` rendered light content on light band). Portrait must remain `style="auto"` (unchanged); landscape on the always-light `#fff` container must render `style="dark"` (dark text/icons). The fix extracts the branching into a testable pure helper and threads the existing `isLandscape` (via `useSyncedLayout()`) into all 4 `App.tsx` mount branches. No theme switching, no `layoutFor`/`bandHeight`/`isLandscape` definition change, no native `translucent` flag, no new dependency (`expo-status-bar` already present).

**Risk Summary:**

- Total risks identified: 8
- High-priority risks (≥6): 2
- Critical categories: TECH (four-branch propagation completeness / debounced `isLandscape` staleness window)

**Coverage Summary:**

- P0 scenarios: 6 groups (host unit + `rg` allowlist + `tsc` + full `npm test` gate — `statusBarStyle` pure 3 tests + `App.tsx` 4-site `statusBarStyle(isLandscape)` pin + bare `style="auto"` absent + `container #fff` pin + 917/0 full gate)
- P1 scenarios: 6 groups (wiring — `isLandscape` 4-site literal + `statusBarStyle` file purity + `import statusBarStyle` + rotation flip `auto↔dark` + `useSyncedLayout` debounce note + `expo-status-bar` style union)
- P2/P3 scenarios: 6 groups (secondary scans + exploratory — single-source helper `rg==1` + `StatusBar` count `==4` invariant + ledger `0fca7499…` hash + `sprint-status.yaml` ownership + `bandHeight/layoutFor` isolation + manual simulator rotation + micro-bench)
- **Total effort**: ~1.8–3.2 hours (~0.3–0.5 days; host-only `npm test` + `tsc` + `rg` gates `<15 min`, no device lane — pure RN/TS `node --import tsx --test`; manual 10-min non-notch simulator rotation remains waivable `P1` device smoke per spec Boundaries `manual validation domain`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine — `triade/src/engine/core/*` (`board.ts`/`line.ts`/`rules.ts`/`ceiling.ts`/`pot.ts`/`spawn.ts`/`weights.ts`), `move`/`shiftLine`/`boardFromLines`, `GRID_SIZE=4`, spawn draw budget `0/3/20`, `ceilingDetector`/`tierForCeiling`/`potForTier`, trace/merge guards** | `git diff fb6df27..5588155 -- triade/src/engine` empty (engine byte-identical). Spec Boundaries `Never: touch engine/lane/monetization logic`. | This plan pins isolation via `git diff --stat -- triade/src/engine` empty + `npm --prefix triade test` full gate 917/0 remains gate, not re-pinned here. |
| **Feel — `src/feel` haptics/punch/shake/bullet/sfx, `GameBoard.tsx` Skia/Reanimated `withSequence 130 ms`, `RNGH` gesture pipeline** | No `src/feel`/`GameBoard` change in diff per spec `Never` + `git diff -- triade/src/feel` empty. | Existing `__tests__/feel/*.test.ts` remain gate. |
| **Layout geometry — `triade/src/ui/layout.ts` (`layoutFor`, `SAFE_MARGIN 16`, `PORTRAIT_BAND 96`/`LANDSCAPE_BAND 48`, `BOARD_SIZE_FLOOR 216`, `isLandscape w>h`, `getBandTop = top+16+bandHeight`) and HUD band placement** | `git diff -- triade/src/ui/layout.ts` empty; spec `Never: Change the landscape band height or board sizing`. | Existing `__tests__/ui/layout.test.ts` 18 golden cases + `rg` literal pins remain gate. |
| **HUD — `Hud.tsx` 76×76/60×44 chrome + `PreviewCard` + `App.tsx` `potForTier`/`previewFor` fan-out** | No `triade/src/ui/Hud.tsx` change in diff. | Existing `hud.test.ts` 8 + `hud.previewWiring` 9 remain gate. |
| **Monetization / a11y — RevenueCat `entitlements`/`restore`, AdMob, Epic 9 `role="grid"`/`aria-live`, DW-8 score thousands separator** | No monetization/a11y code touched; DW-8 remains `open` deferred. | Existing entitlements suites remain gate. |
| **Theme switching / background darkening / `useColorScheme` branching / native `StatusBar` translucent/overlay options** | Spec `Never: introduce theme switching or background darkening` + `Block If: requires native StatusBar translucent/overlay options`. Container is always light `#fff`. | This plan asserts `rg -n "useColorScheme\|Theme" triade/App.tsx` stays `0` + `rg -n "backgroundColor.*#fff" triade/App.tsx` pin remains. |
| **HUD band color darkening as alternative legibility fix** | Spec `Block If: changing HUD band color to dark` — alternative rejected. | Preserved light `#fff`; dark status **text** chosen instead. |
| **UseSyncedLayout debounce tuning / rotation coalesce widening beyond current `32 ms`** | Debounce is DW-6 (`useSyncedLayout`); DW-7 reuses `isLandscape` as-is. 32 ms lag is acceptable per spec Design Notes + ledger `DW-6 done`. | DW-6 `test-design-dw-6-rotation-race-safe-area-initial-metrics.md` remains truth; not re-tuned here. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** Delta is a pure UI prop seam with no Skia worklet, `MMKV`, or native credential beyond `expo-status-bar` style union (`'auto'|'dark'`). All seams host-controllable without mount: `statusBarStyle(isLandscape)` is pure `(boolean)→('auto'|'dark')` exercised via direct `import('../../src/ui/statusBar.ts')` + `assert.equal(statusBarStyle(false),'auto')` / `assert.equal(statusBarStyle(true),'dark')` + purity `f(f)===f(f)` both branches (existing `statusBar.test.ts` pattern matching `layout.test.ts` conventions). `App.tsx` branch completeness needs only `readFileSync('triade/App.tsx','utf8')` include counts: `import { statusBarStyle }` literal + `/(StatusBar).*statusBarStyle\(isLandscape\)/g` must be `4` (all branches `!ready`/`tone`/`laneSelect`/`playing`) + `/(style="auto")/g` bare literal must be `0` after sweep (no residual). `isLandscape` bool source is `useSyncedLayout()` already 32 ms debounced; no new hook param. Container light invariant needs `rg 'backgroundColor.*#fff' App.tsx` include.

**Observability — Good.** Outputs deterministic strings: `statusBarStyle(false)==='auto'`, `statusBarStyle(true)==='dark'` literal pins, `App.tsx` 4-site `StatusBar style={statusBarStyle(isLandscape)}` observable via file-content, portrait→landscape flip observable as `auto→dark` on `isLandscape` `false→true` next render, `App.tsx` import + helper file existence observable via `rg`. No Reanimated timing sampled here — prop seam is synchronously assertable; contrast legibility remains manual pixel gate (status icons dark on light 48 pt band) per spec `Verification: Manual checks`. `tsc --noEmit -p triade/tsconfig.json` observes `style="auto"|"dark"` union satisfaction; `npm test` observes 917/0 green with 3 new tests.

**Reliability — Strong.** Helper is pure, no `useEffect`/`setTimeout`/mutable ref, never throws (boolean coercion, literal return), idempotent and parallel-safe. `App.tsx` change is prop swap only (`style` value), no state shape change — deterministic across `ton`/`laneSelect`/`playing`/`!ready`. `expo-status-bar` `style="dark"` maps to iOS `UIStatusBarStyleDarkContent` and Android dark icons; `style="auto"` maps to automatic based on background — both covered by existing SDK. `tsc` both configs clean on helper (pre-existing 8 errors in `spawn-candidates-validation` are ledger-noted and not caused by this diff). `initialMetrics`/`useSyncedLayout` untouched; rotation debounce 32 ms lag is intentional and ledger-accepted.

**ASRs (Architecturally Significant Requirements):**

- **ASR-01 — StatusBar style contract is now branch-count-sensitive (4 mounts)** — `App.tsx` renders `StatusBar` in 4 early-return branches; adding a 5th screen later without `statusBarStyle(isLandscape)` would silently regress legibility. **ACTIONABLE** — lint/grep gate `rg "StatusBar" App.tsx | wc -l == rg "statusBarStyle" App.tsx | wc -l` (both must equal 4) enforces future branch parity.
- **ASR-02 — `isLandscape` single source is `useSyncedLayout()` which debounces 32 ms** — StatusBar flip inherits the same 32 ms lag as `boardSize`/`bandHeight`; transient 32 ms wrong style after rotation is acceptable per spec (avoids board flash tradeoff). **FYI** — no new debounce introduced by DW-7; DW-6 already governs.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | Four-branch propagation incomplete — `App.tsx` has 4 `StatusBar` mounts (`!ready` `App.tsx:877`, `tone` `:886`, `laneSelect` `:906`, `playing` `:1025`); sweeping 1–3 but leaving a bare `style="auto"` regresses legibility on that screen in landscape (white-on-white band) and breaks spec `Always: Replace every StatusBar`. Future 5th branch repeats the same debt. | 2 | 3 | 6 | `rg -n "StatusBar" triade/App.tsx` must be `4` hits and `rg -n "statusBarStyle\(isLandscape\)" triade/App.tsx` must also be `4` with `0` bare `style="auto"` residuals; `rg -n "style=\"auto\"" triade/App.tsx` == `0`; CI host gate `readFileSync` include `import { statusBarStyle }` + `style={statusBarStyle(isLandscape)}` `4×` + ledger `0fca7499…` hash pin; `npm test` `__tests__/ui/statusBar.test.ts` 3/3 green remains. | QA / Dev | 2026-09-03 |
| R-002 | TECH | Debounced `isLandscape` staleness window — `AppContent` reads `isLandscape` from `useSyncedLayout()` which coalesces `{width,height,insets}` with `DEFAULT_DEBOUNCE_MS 32` (`triade/src/ui/useSyncedLayout.ts:14-60`); rotation `portrait→landscape` flips `width>height` immediately but `useSyncedLayout` commits next `setSynced` after 32 ms, so StatusBar style lags one debounce (~32 ms transient `auto` retained in new landscape frame, and `dark` retained one frame back to portrait). On slow Android (`insets` arrival >100 ms) window extends; user sees 1–2 frames of illegible status text on non-notch landscape light band. | 2 | 3 | 6 | Spec Design Notes accepts 32 ms lag as tradeoff to prevent board `0` flash (DW-6); verification thread documents `isLandscape originates from debounced useSyncedLayout (32 ms) — acceptable`; P0 pin documents `DEFAULT_DEBOUNCE_MS 32` literal unchanged and `useSyncedLayout` file pins `pendingRef`+`timerRef` intact; `statusBarStyle` purity proven `true→dark` / `false→auto` host unit (rotation flip instant on helper) so only wiring lag remains; waivable 10-min `P1` manual simulator rotation (iPhone SE non-notch Cmd+arrow both orientations) confirms transient is unnoticeable; if future widening needed, file new spec (not DW-7). | Dev | 2026-09-03 |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | TECH | Helper purity contract drift — future edit adds `expo-status-bar` import or `useColorScheme()` branching to `triade/src/ui/statusBar.ts`, making `statusBarStyle` impure/unmockable (breaks `node:test` helper isolation and introduces background-aware branch not covered by current 3 tests). | 1 | 3 | 3 | Pin single-source helper `rg -c "import.*expo" triade/src/ui/statusBar.ts` == `0` (no RN imports) + `rg -c "statusBarStyle"` helper == `1` definition; `tsc --noEmit -p triade/tsconfig.json` green on helper; 3-test suite `is pure and deterministic` remains gate. | Dev |
| R-004 | BUS | Light container invariant drift — `App.tsx` container `backgroundColor '#fff'` is the premise for `dark` always being legible; changing container to dark/transparent without updating status bar logic would make `style="dark"` invisible (dark-on-dark). | 1 | 3 | 3 | Pin `rg -n "backgroundColor: '#fff'" triade/App.tsx` == `1` (container stays `#fff`); Boundaries `Never: introduce background darkening`; `rg -n "useColorScheme" triade/App.tsx` == `0`. | Dev |
| R-005 | TECH | `isLandscape` source drift — `layout.ts:37-42` defines `isLandscape(width,height)` as `width > height` pure, but `useSyncedLayout` derives `isLandscape` via `effectiveLayout.isLandscape` (which reuses `layoutFor(synced)`). A future `orientation.ts` direct import bypassing `useSyncedLayout` would split the source of truth (stale vs debounced). | 1 | 3 | 3 | Pin single-source `rg -c "isLandscape" triade/App.tsx` == `4` via `statusBarStyle(isLandscape)` (must not re-derive via `width>height` inline) + `layout.ts` `isLandscape` definition unchanged `rg -n "function isLandscape" triade/src/ui/layout.ts` still `1` hit per DW-6 gate. | Dev |
| R-006 | OPS | `expo-status-bar` style union drift — SDK 57 `StatusBar` `style` union is `auto|inverted|light|dark|…`; a future SDK bump renaming `dark` to `dark-content` or narrowing the union would make `statusBarStyle(true)` type-error at `tsc`. | 1 | 2 | 2 | `npx --prefix triade tsc --noEmit -p triade/tsconfig.json` gate (reports helper union satisfied `style="dark"|"auto"`); `rg -n "from 'expo-status-bar'" triade/App.tsx` == `1` import stability. | Dev |
| R-007 | TECH | Test stub mismatch — `triade/test-utils/rn-stub.ts:92` stubs `StatusBar () => null` so unit tests cannot assert style via rendering; helper-only tests could pass while App wiring still renders wrong prop (file-content only, not mount). | 2 | 2 | 4 | Dual gate: (a) helper pure 3 tests `statusBarStyle(false/true)` + (b) file-content `App.tsx` `statusBarStyle(isLandscape)` `4×` includes; `npm --prefix triade test -- __tests__/ui/statusBar.test.ts` 3/3 plus `App.tsx` string pin together prevent wiring gap without a mount test. | QA |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | PERF | Re-render cost — each `AppContent` render re-evaluates `statusBarStyle(isLandscape)` string literal (no memo); trivial O(1) `<1 ms`, but future complex helper would miss memo guard. | 1 | 1 | 1 | Monitor — helper stays pure 1-line ternary; no memo needed. |
| R-009 | OPS | Ledger hash / branch-count drift — `_bmad-output/implementation-artifacts/deferred-work.md` DW-7 ledger `0fca74990eec61dcdc0ddb42ec0e67898120b24fce4833ecc178f18ed2a2d422` 64-hex + `sprint-status.yaml` orchestrator ownership (never write, never revert done→open) could be corrupted by future sweep. | 1 | 2 | 2 | Monitor — `git diff -- triade/src/ui` empty pin vs only `deferred-work.md` + `spec-dw-7` ledger diff as expected; `sprint-status.yaml` `rg==0` write. |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability | Helper never throws; `statusBarStyle(boolean)` returns `'auto'`/`'dark'` for all inputs including `undefined` coercion; App never mounts without `StatusBar` in any of 4 branches. UNKNOWN exact coercion: helper typed `isLandscape: boolean` (strict), but runtime `undefined` coerces to `'auto'` — documented as tolerant. | R-003, R-007 | Host unit: `node --import tsx --test __tests__/ui/statusBar.test.ts` (3 pure cases + coercion probe). File-content: `App.tsx` `StatusBar` present `4×`. `tsc --noEmit -p triade/tsconfig.json` clean on helper. | `npm --prefix triade test` 917/0 (3 new + 914 existing 311 skipped); `tsc` `0 errors` on `statusBar.ts` (pre-existing 8 unrelated unchanged); `rg -n statusBarStyle triade/App.tsx` `4` report. |
| Maintainability | Single helper definition `statusBarStyle` in `triade/src/ui/statusBar.ts` (single source; no inline `isLandscape ? "dark":"auto"` duplication across App branches); single `import { statusBarStyle }` site; ledger 64-hex `0fca74990eec…` + decision `Force dark status bar` pinned. | R-001, R-003 | `rg -c "statusBarStyle" triade/src/ui/statusBar.ts` == `1` definition; `rg -c "import.*statusBarStyle" triade/App.tsx` == `1`; `rg -n "StatusBar" triade/App.tsx` `4` vs helper `4` parity; `git log --oneline -1 -- triade/src/ui/statusBar.ts` shows `5588155` creation. | `rg` allowlists `0 expo import in helper / 1 definition / 1 import / 4 call sites`; `deferred-work.md` ledger line `status: done 2026-09-02` + `resolution-undo` 64-hex. |
| Performance | Status bar prop flip O(1) `<1 ms`; `useSyncedLayout` debounce stays `32 ms` bound (DW-6) so total added latency per rotation is `≤32 ms` (helper itself 0 ms). No feel re-render budget regression. | R-002, R-008 | Host micro-bench `10k × statusBarStyle(true/false)` `<0.05 ms` (`Date.now` loop in `node --import tsx`); `App.tsx` render count unchanged (same 4 branches); `useSyncedLayout` `DEFAULT_DEBOUNCE_MS 32` literal scan. | Bench `<0.05 ms` JSON; `rg -n "DEFAULT_DEBOUNCE_MS 32" triade/src/ui/useSyncedLayout.ts` `1` hit. |
| UX / Visual Compliance | Landscape status icons/text legible (dark on light `#fff` 48 pt `LANDSCAPE_BAND`); portrait `auto` unchanged (no regression on notch/non-notch). Threshold is human contrast judgment, not numeric. | R-001, R-004 | Waivable 10-min `P1` manual simulator rotation (`iPhone SE` non-notch + notch `iPhone 15`): landscape dark legible against light band; portrait `auto` no regression; photo evidence optional. Host gate proves prop only, not pixel contrast. | Manual check `PASS` photo or `rg` prop gate as proxy for CI; `spec-dw-7` `Verification: grep no bare style="auto"` + `npm test` + `tsc` artifact triad. |
| Compliance (Expo) | `expo-status-bar` `style="dark"` maps to iOS `UIStatusBarStyleDarkContent` (SDK 57); `style="auto"` maps to automatic; both are supported values in `app.json` no override. No new native permission. | R-006 | `tsc` style union proof + `app.json:12` no `expo.statusBar` override scan `rg -n "\"statusBar\"" triade/app.json` `0` (driven only by component prop per Code Map). | `tsc` letter + `rg` `app.json` scan `0` hits. |

**Unknown thresholds:** Container `#fff` contrast ratio is perceptual (no numeric `>=4.5:1` pinned — spec leaves to `device/simulator verify contrast`); debounce `32 ms` max human-perceptible lag is not thresholded (`<100 ms` is human-noticeable, but spec accepts `32 ms` as DW-6 tradeoff); `isLandscape` coercion for non-boolean is not specified (`boolean` strictly, but JS truthiness tolerant) — marked UNKNOWN and covered by `TBD` below. Do not invent values.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-dw-7-status-bar-dark-landscape.md` intent + I-O 5-row matrix + 4 ACs + Code Map 5 entries accepted)
- [ ] Test environment provisioned and accessible (`triade/ npm --prefix triade test` via `node --import tsx --test`, no device required for host gate; `npx --prefix triade tsc --noEmit -p triade/tsconfig.json` both configs)
- [ ] Test data available or factories ready (`triade/__tests__/ui/statusBar.test.ts` committed, `src/ui/statusBar.ts` helper on disk; `triade/test-utils/rn-stub.ts` stub present)
- [ ] Feature deployed to test environment (commit `5588155` on `main` ahead `origin/main` 7, or working-tree `spec-dw-7` ledger `done 2026-09-02` branch)
- [ ] `isLandscape` source (`useSyncedLayout()`) available and `triade/src/ui/layout.ts` `isLandscape w>h` definition intact (DW-6 still green)
- [ ] `expo-status-bar` `~57.0.1` installed and `app.json:12` no override statusBar config present

## Exit Criteria

- [ ] All P0 tests passing (`__tests__/ui/statusBar.test.ts` 3/3 + `App.tsx` 4-site allowlist + `spec` final_revision pin 5588155 + container #fff pin + full 917/0 gate + both `tsc` clean on helper)
- [ ] All P1 tests passing (or failures triaged as `waived` with owner) (6 wiring checks — 4-site literal + file purity + import + `isLandscape` `4×` + flip + debounce + SDK union)
- [ ] No open high-priority / high-severity bugs (R-001/R-002 mitigated or waived with approver)
- [ ] Test coverage agreed as sufficient (4/4 StatusBar mounts exercised via host unit + file-content, not mount;mount deemed out-of-scope per stub)
- [ ] Ledger `_bmad-output/implementation-artifacts/deferred-work.md` DW-7 `status: done 2026-09-02` + `resolution-undo: 0fca7499…` 64-hex retained; `sprint-status.yaml` untouched (orchestrator-owned)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | Dev / QA (TEA) | owns `statusBarStyle` helper + `App.tsx` 4-branch wiring + `statusBar.test.ts` + `rg`/`tsc` gates |
| Murat (TEA) | Master Test Architect | risk scoring + coverage plan |

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Helper pure `false→auto / true→dark` (ports portrait/landscape AC1–AC2) | Unit | R-001, R-002 | 2 | QA | `triade/__tests__/ui/statusBar.test.ts:5-9` `assert.equal(statusBarStyle(false),'auto')` + `assert.equal(statusBarStyle(true),'dark')` — already committed, `node --import tsx --test` `<1 s`. |
| Helper purity & determinism `f(false)===f(false) && f(true)===f(true)` (rotation AC3 invariant) | Unit | R-002, R-003 | 1 | QA | `statusBar.test.ts:10-15` third test — no mock, no RN import, idempotent. |
| `App.tsx` 4-branch propagation `StatusBar style={statusBarStyle(isLandscape)}` in every mount screen (`!ready` `:877`, `tone` `:886`, `laneSelect` `:906`, `playing` `:1025`) + `0` bare `style="auto"` residuals (R-001) | Unit (file-content) | R-001 | 3 | QA | `readFileSync('triade/App.tsx','utf8')` includes `import { statusBarStyle }` `1×` + `rg -n "statusBarStyle\(isLandscape\)"` `4` hits + `rg -n 'style="auto"'` `0` after sweep; reproduces incomplete-branch regression without mount. |
| Container light invariant `styles.container.backgroundColor '#fff'` (premise for dark legibility, R-004) | Unit (file-content) | R-004 | 1 | QA | `rg -n "backgroundColor: '#fff'" triade/App.tsx` `1` (`styles.container` `:1036`); ensures `dark` premise stays. |
| Spec ledger pin `spec-dw-7 final_revision 5588155b0b174…` + `triade/App.tsx` `statusBarStyle` import presence | Unit (file-content) | R-001 | 1 | QA | `readFileSync spec-dw-7` includes `final_revision: '5588155b0b174f9ebd3b3bfcec7804117bb2ab23'` + `App.tsx` includes helper import — pins committed delta vs `fb6df27` baseline. |
| Regression gate — full `npm --prefix triade test` 917/0 (914 existing +3) and `portrait auto` AC1 literal remains | Unit (host full suite) | R-001, R-007 | 1 | QA | `npm --prefix triade test` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "__tests__/**/*.test.ts"`) `917 pass / 0 fail 311 skipped` per Auto Run Result; proves no `layout.test.ts` 18 / `orientation` / `useSyncedLayout` break. |

**Total P0**: 6 groups (9 asserts + `rg` 3 scans), ~15–25 min (`<1 s` helper file + `<15 min` full 917 gate + `<1 min` scans), **100% pass required**.

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| `App.tsx` `isLandscape` wiring literal `statusBarStyle(isLandscape)` exactly `4×` with `useSyncedLayout()` source (R-001/R-005) | Unit | R-001, R-005 | 1 | QA | `rg -n "isLandscape" triade/App.tsx` `4` call sites + `rg -n "useSyncedLayout" triade/App.tsx` `1` import/destructure; no inline `width>height` bypass. |
| Helper file purity — no RN/expo import inside `statusBar.ts` (R-003) | Unit | R-003 | 1 | DEV | `rg -c "from 'react-native'\|from 'expo" triade/src/ui/statusBar.ts` == `0` + file `1-5` literal scan `StatusBarStyle` type + pure ternary. |
| `import { statusBarStyle } from './src/ui/statusBar.ts'` single-import invariant (R-001) | Unit | R-001 | 1 | DEV | `rg -c "import.*statusBarStyle" triade/App.tsx` == `1`; future split into 2 imports flags drift. |
| Rotation flip `isLandscape false→true` flips `style auto→dark` and `true→false` flips `dark→auto` next render (I-O matrix rows 4–5) | Unit | R-002 | 2 | QA | Helper flip proven by `false→auto` + `true→dark` pair already P0; P1 extends with `statusBarStyle(isLandscape)` file-content mention that `AppContent` `const { isLandscape } = useSyncedLayout()` is top-level and `StatusBar` prop reads it each branch (no stale closure — `isLandscape` is render-local). |
| Debounce 32 ms inherited bound — `useSyncedLayout` `DEFAULT_DEBOUNCE_MS 32` literal unchanged (R-002) | Unit | R-002 | 1 | QA | `rg -n "DEFAULT_DEBOUNCE_MS 32" triade/src/ui/useSyncedLayout.ts` `1`; ensures DW-7 did not retune debounce (DW-6 truth). |
| SDK union — `expo-status-bar` style union accepts `'dark'|'auto'` and `app.json` has no competing override (R-006) | Unit | R-006 | 1 | DEV | `npx --prefix triade tsc --noEmit -p triade/tsconfig.json` helper passes + `rg -n "statusBar" triade/app.json` `0` overrides (per Code Map). |

**Total P1**: 6 groups (7 asserts + scans), ~20–35 min (PR gate `<15 min` + scans), **≥95% pass required**.

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single helper definition `statusBarStyle` count `==1` in `triade/src/ui/statusBar.ts` (maintainability R-003) | Unit | R-003 | 1 | DEV | `rg -c "function statusBarStyle" triade/src/ui/statusBar.ts` == `1` single source. |
| Single `StatusBar` count `==4` in `App.tsx` + parity with helper `4` (ASR-01 gate; R-001 drift) | Unit | R-001 | 1 | QA | `rg -c "StatusBar" triade/App.tsx` == `4` vs helper `4`; detects 5th branch or leftover. |
| `StyleSheet.create container` single-source `backgroundColor '#fff'` already P0 — P2 adds no separate; ledger pin `deferred-work.md` DW-7 `done 2026-09-02` + `resolution-undo: 0fca74990eec61dcdc0ddb42ec0e67898120b24fce4833ecc178f18ed2a2d422` `64-hex` validity (R-009) | Unit | R-009 | 1 | QA | `readFileSync deferred-work.md` includes `DW-7` `status: done 2026-09-02` + `resolution-undo` 64 hex `0fca7499…` + `decision: Force dark status bar`; ensures ledger not open→pending. |
| Engine/layout isolation — `git diff fb6df27..5588155 -- triade/src/engine` empty + `git diff -- triade/src/ui/layout.ts` empty (Not in Scope R-003 isolation) | Unit | - | 1 | DEV | `git diff --stat -- triade/src/engine` `0` files + `rg -n "layoutFor" triade/src/ui/layout.ts` `1` + `SAFE_MARGIN 16/PORTRAIT 96/LANDSCAPE 48` literal triad unchanged. |
| `sprint-status.yaml` ownership — workflow never writes `sprint-status.yaml` (orchestrator-owned constraint) | Unit | R-009 | 1 | QA | `git diff --stat HEAD` does not contain `sprint-status.yaml`; `rg` scan `0` writes. |
| Theme/overlay drift negative — `rg -n "useColorScheme\|Theme\|translucent" triade/App.tsx` `0` (R-004 Boundaries) | Unit | R-004 | 1 | DEV | Ensures Block-If branches not introduced. |

**Total P2**: 6 groups, ~8–15 min host nightly waivable, **≥90% informational**.

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Waivable manual simulator rotation — non-notch `iPhone SE` landscape dark legible on 48 pt light band + notch `iPhone 15` still legible + portrait `auto` no regression (`Cmd+arrow` both orientations, 10 min) | E2E (manual) | 1 | QA | Photo evidence optional; per spec `Verification: Manual checks` gate (pixel contrast not host-provable). |
| Micro-bench `10k× statusBarStyle` `<0.05 ms` (R-008) | Unit | 1 | DEV | `Date.now` loop `for 10k statusBarStyle(true/false)` in `node --import tsx` — trivial. |
| Notch vs non-notch snapshot delta — `insets.left>0` landscape still `style="dark"` (matrix row 3) | Unit | 1 | QA | Helper already `true→dark` irrespective of `left`; `getBandTop` not in scope. |
| Style literal exhaustiveness — only `'auto'|'dark'` appear in `statusBar.ts` (no `'light'` typo) | Unit | 1 | QA | `rg -n "'light'" triade/src/ui/statusBar.ts` `0` + `rg -n "auto\|dark" triade/src/ui/statusBar.ts` `2` hits. |

**Total P3**: 4 groups, ~10–20 min (manual 10 min waivable), **informational**.

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] `node --import tsx --test triade/__tests__/ui/statusBar.test.ts` — helper pure 3/3 (`false→auto`, `true→dark`, purity) (30 s)
- [ ] `rg -n "statusBarStyle\(isLandscape\)" triade/App.tsx` → `4` + `rg -n 'style="auto"' triade/App.tsx` → `0` + `rg -n "backgroundColor: '#fff'" triade/App.tsx` → `1` (30 s)
- [ ] `rg -n "DEFAULT_DEBOUNCE_MS 32" triade/src/ui/useSyncedLayout.ts` → `1` unchanged (15 s)
- [ ] `readFileSync spec-dw-7` `final_revision '5588155b0b…'` + `deferred-work.md DW-7 done 2026-09-02` include (15 s)

**Total**: 4 scenarios (~1.5 min)

### P0 Tests (<10 min)

**Purpose**: Critical path validation (spec AC1–AC2, ledger, full regression)

- [ ] `npx --prefix triade tsc --noEmit -p triade/tsconfig.json` — `StatusBar style="dark"|"auto"` union OK on helper, pre-existing 8 unrelated unchanged (1 min)
- [ ] `npm --prefix triade test` full gate 917/0 (existing 914 + 3 new, 311 skipped) — `<15 min` upper bound but host is `<5 min` on this machine (counts as P0 `<10 min` budget excluding bench; spec Auto Run gates 917/0+tsc)
- [ ] Helper purity `statusBarStyle` file `1-5` + `rg -c "statusBarStyle" statusBar.ts==1` + `rg "import.*statusBarStyle" App.tsx==1` (1 min)

**Total**: 3 scenarios + smoke above

### P1 Tests (<30 min)

**Purpose**: Important feature coverage (wiring + debounce + SDK)

- [ ] `readFileSync App.tsx` `isLandscape` `4×` via `statusBarStyle(isLandscape)` + `useSyncedLayout()` source (2 min)
- [ ] `rg -c "from 'react-native'|from 'expo" triade/src/ui/statusBar.ts` `0` + helper `StatusBarStyle` type literal (1 min)
- [ ] Rotation flip `false→auto` / `true→dark` + `useSyncedLayout` `pendingRef`+`timerRef` + `initialWindowMetrics` `2` hits stability (2 min)
- [ ] `rg -n "statusBar" triade/app.json` `0` overrides + `rg -n "useColorScheme" App.tsx` `0` (1 min)

**Total**: 4 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage (single-source + isolation + exploratory)

- [ ] `rg -c "StatusBar" App.tsx==4` vs helper `4` parity + ledger `0fca7499` `64-hex` + `git diff -- triade/src/engine` `0` + `sprint-status.yaml` `0` write + theme `0` scans (5 min; nightly waivable)
- [ ] Waivable manual `iPhone SE` rotation 10-min + `10k×` bench `<0.05 ms` + notch `left>0` still `dark` + `'light'` `0` (10 min manual waivable; automated `<1 min`)

**Total**: 2 scenarios + manual

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 6 | 0.30 | 0.5–0.9 | Helper already done; scans + full gate |
| P1 | 6 | 0.25 | 0.5–1.0 | Wiring pins — `rg` + `readFileSync` + `tsc` |
| P2 | 6 | 0.15 | 0.4–0.9 | Isolation + ledger + theme negative |
| P3 | 4 | 0.10 | 0.2–0.5 | Manual 10-min + bench + typo scans |
| **Total** | **22** | **-** | **1.8–3.2** | **~0.3–0.5 days host-only; no device lane, no nightly infra** |

### Prerequisites

**Test Data:**

- `triade/src/ui/statusBar.ts` helper on disk (`statusBarStyle` `5` LOC pure) — already `5588155`
- `triade/__tests__/ui/statusBar.test.ts` `3` tests — already committed
- `triade/App.tsx` `4` branches `statusBarStyle(isLandscape)` — already `5588155`
- `triade/test-utils/rn-stub.ts` `StatusBar () => null` stub (render not asserted)
- `useSyncedLayout` debounce `32 ms` contract from DW-6 (`DEFAULT_DEBOUNCE_MS`)

**Tooling:**

- `node >=26` + `tsx 4.23` (`node --import tsx --test`)
- `rg` / `grep -n` for `StatusBar` / `statusBarStyle` / `backgroundColor` / `DEFAULT_DEBOUNCE_MS` allowlists
- `npx --prefix triade tsc --noEmit -p triade/tsconfig.json` (helper union check)
- `npm --prefix triade test` full host gate (`node --import tsx --test "__tests__/**/*.test.ts"`)

**Environment:**

- No device/simulator required for `P0/P1` host CI (pure `node:test` + file-content)
- Optional `P1` waivable 10-min simulator manual: `iPhone SE` non-notch 390×844 + `iPhone 15` notch in Xcode Simulator (`Cmd+arrow` rotate both orientations), Expo Go or simulator build on SDK 57
- No backend, no secrets, no network

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80% (4/4 StatusBar mounts via helper + `rg` parity)
- **Security scenarios**: N/A (no `SEC` risk — status bar is pure UI, no auth/data exposure)
- **Business logic**: ≥70% (2/2 portrait/landscape helper branches + purity)
- **Edge cases**: ≥50% (rotation flip `auto↔dark` next render + notch `left>0` + `32 ms` debounce window)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`statusBar.test.ts` 3/3 + `App.tsx` `4× statusBarStyle(isLandscape)` + `0` bare `style="auto"` + `container #fff` + full 917/0)
- [ ] No high-risk (≥6) items unmitigated (`R-001` 4-branch parity + `R-002` debounce window documented/waived)
- [ ] Security tests (SEC category) pass 100% (N/A — no SEC items; if future `SEC` added must be 100%)
- [ ] Performance targets met (PERF category: O(1) `<1 ms` helper + `32 ms` debounce bound)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (reliability/maintainability/performance/compliance/UX evidence listed above)

---

## Mitigation Plans

### R-001: Four-branch propagation incomplete (Score: 6)

**Mitigation Strategy:** Enforce via 3 host pins that run on every commit: `rg -n "StatusBar" triade/App.tsx` == `4` and `rg -n "statusBarStyle\(isLandscape\)" triade/App.tsx` == `4` and `rg -n 'style="auto"' triade/App.tsx` == `0`. Add `readFileSync` `App.tsx` includes `import { statusBarStyle }` `1×`. Run `npm --prefix triade test -- __tests__/ui/statusBar.test.ts` 3/3. Any future 5th screen added must also import helper; lint failure blocks PR. Keep container `#fff` pin (`backgroundColor: '#fff'` `1`) so `dark` premise stays valid.
**Owner:** QA / Dev
**Timeline:** 2026-09-03 (PR gate; ledger `0fca7499…` done pin)
**Status:** Mitigated (verified: helper + App 4-site swap committed `5588155`; `grep StatusBar App.tsx` `4× statusBarStyle(isLandscape)` confirmed per spec Auto Run `grep -n StatusBar` no bare `style="auto"` remains)
**Verification:** `rg` allowlists `4/4/0` + `npm test` `917/0` + `tsc` clean on `statusBar.ts` + ledger `deferred-work.md` `DW-7 done`.

### R-002: Debounced isLandscape staleness window (Score: 6)

**Mitigation Strategy:** Document and accept `32 ms` debounce tradeoff (DW-6 decision: board flash worse than one-frame status style lag). Prove helper flip is instant (`false→auto` / `true→dark` pure host) so only wiring lag remains; pin `DEFAULT_DEBOUNCE_MS 32` unchanged via `rg`. Recommend waivable 10-min `P1` manual simulator rotation (non-notch `iPhone SE` + notch `iPhone 15` both orientations) to confirm transient is visually unnoticeable. If Android slow-device requires widening, file new DW spec (not DW-7).
**Owner:** Dev
**Timeline:** 2026-09-03
**Status:** Waived with documented tradeoff (spec Design Notes: `transient 32 ms lag is acceptable and avoids board flash`; ledger `DW-6 done` governs)
**Verification:** `statusBar.test.ts` helper flip instant + `useSyncedLayout.test.ts` degenerate hold 4 probes + manual rotation waivable; `App.tsx` `isLandscape` top-level render-local ensures next `setSynced` flips style.

---

## Assumptions and Dependencies

### Assumptions

1. Container `backgroundColor` stays light `#fff` (spec `Always: Keep the app container background #fff`) — `dark` remains legible only under this premise.
2. `useSyncedLayout()` is the single orientation source in `AppContent`; no branch will re-derive `isLandscape` via `width>height` inline (would split debounced vs immediate).
3. `expo-status-bar` SDK 57 `style="dark"` continues to mean dark content on iOS and dark icons on Android (no rename to `dark-content` upstream).
4. `32 ms` debounce inherited from DW-6 is acceptable for status-bar legibility (spec `Design Notes` explicitly endorses).
5. Pixel contrast remains human-judged (no WCAG numeric threshold pinned) — automated host covers prop only.

### Dependencies

1. `triade/src/ui/useSyncedLayout.ts` `DEFAULT_DEBOUNCE_MS 32` available and green (DW-6 sweep done `fb6df27` → `5588155` inherits) — Required by 2026-09-03 (already met).
2. `triade/src/ui/statusBar.ts` helper on `main` `5588155` (already committed) — Required before PR gate runs.
3. Manual simulator rotation capacity (waivable `P1` 10-min) — Required by 2026-09-03 if team wants visual sign-off before Release; host-only gate can proceed without it.

### Risks to Plan

- **Risk**: Future `App.tsx` refactor extracts a single root `StatusBar` above branching (one mount instead of 4) and forgets to keep `isLandscape` threading — or splits container background to dark mode without updating helper.
  - **Impact**: Legibility recedes or helper `dark` becomes dark-on-dark.
  - **Contingency**: `rg -n "StatusBar"` count change from `4→1` must trigger `test-design` re-run and helper re-validation (`rg single-source statusBarStyle==1` + container `#fff` pin); if dark mode ever ships, file new DW to make helper background-aware (`useColorScheme` branch).

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **`triade/App.tsx` `AppContent` (all 4 branches `!ready`/`tone`/`laneSelect`/`playing`)** | Direct — each `StatusBar` prop now orientation-aware via `statusBarStyle(isLandscape)`; portrait `auto` unchanged, landscape `dark` new. | `triade/__tests__/ui/statusBar.test.ts` 3 + `triade/__tests__/ui/layout.test.ts` 18 + `triade/__tests__/ui/useSyncedLayout.test.ts` 4 must stay `0 fail` + `grep -n StatusBar` `4× statusBarStyle` pin + no `ScrollView` reintroduction (`rg ScrollView App.tsx 0`). |
| **`triade/src/ui/statusBar.ts` (new helper)** | Direct — pure `(boolean)→('auto'|'dark')` is new public export consumed only by `App.tsx`; no other caller yet. | `rg -c "statusBarStyle" triade/src/ui/statusBar.ts` `1` + `rg "from 'expo" statusBar.ts 0` + `tsc` union clean; full `npm test` 917/0. |
| **`triade/src/ui/useSyncedLayout.ts` / `layout.ts` / `orientation.ts`** | Indirect — `isLandscape` source for DW-7; not touched by DW-7 but its debounce lag governs DW-7 transient. | `triade/__tests__/ui/layout.test.ts` 18 + `useSyncedLayout.test.ts` 4 + `__tests__/ui/orientation.test.ts` must stay green; `git diff -- triade/src/ui/layout.ts` `0` + `rg isLandscape layout.ts 1` pinned; DW-6 design doc `test-design-dw-6-rotation-race-safe-area-initial-metrics.md` remains truth. |
| **`expo-status-bar` SDK 57** | Dependency — `StatusBar` prop `style="dark"` semantics (iOS `DarkContent` / Android dark icons) and `style="auto"` auto-selection; no config override in `app.json`. | `tsc --noEmit -p triade/tsconfig.json` helper passes + `rg -n "statusBar" triade/app.json` `0` override + `package.json expo-status-bar ~57.0.1` pin. |
| **`triade/test-utils/rn-stub.ts`** | Test infra — stubs `StatusBar () => null` so helper tests are pure (not mount). | `rn-stub.ts:92` stub `() => null` stays; no mount test added (deemed unnecessary for prop swap). |
| **Deferred ledger / `sprint-status.yaml`** | Ledger `DW-7 done 2026-09-02` with `resolution-undo: 0fca7499…`; no `sprint-status.yaml` write by workflow. | `git diff --stat HEAD` only `deferred-work.md` + `spec-dw-7` ledger diff as expected; `sprint-status.yaml` untouched. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (TECH/BUS/OPS categories, P×I 1-9, score ≥6 mitigation)
- `probability-impact.md` - Risk scoring methodology (P 1-3 × I 1-3 → 1-9, thresholds DOCUMENT/MONITOR/MITIGATE/BLOCK)
- `test-levels-framework.md` - Test level selection (Unit file-content vs E2E manual; favor Unit for pure function `statusBarStyle`)
- `test-priorities-matrix.md` - P0-P3 prioritization (P0 blocks core + high risk + no workaround: here `portrait auto` + `landscape dark` + 4-branch propagation)
- `nfr-criteria.md` - NFR validation buckets (reliability pure, maintainability single helper, performance O(1), compliance `expo-status-bar`, UX contrast)

### Related Documents

- PRD: n/a (sweep DW-7 is deferred-work deep-dive from code review of story `1-5-layout-portrait-e-landscape` per `deferred-work.md` DW-7 origin)
- Epic: n/a (no epic — `spec-dw-7-status-bar-dark-landscape.md` is the contract)
- Architecture: `_bmad-output/implementation-artifacts/spec-dw-7-status-bar-dark-landscape.md` (Code Map `App.tsx:3,876,885,905,1024` + `useSyncedLayout.ts:14-60` + `layout.ts:37-42` + `app.json:12`, Verification `tsc` + `npm test` + `grep StatusBar`)
- Tech Spec: `triade/src/ui/statusBar.ts:1-5` helper + `triade/__tests__/ui/statusBar.test.ts:1-16` suite + `triade/src/ui/useSyncedLayout.ts:14-60` coalesce
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` `DW-7 done 2026-09-02` + `DW-8 open` (Hud a11y/thousands) adjacent baseline
- Prior DW-6: `_bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md` (coalesce `32 ms` + `initialMetrics` govern `isLandscape`)

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Execution Mode**: sequential (auto → sequential in this environment, no `agent-team`/`subagent` per `tea_capability_probe true` but `supports.subagent false`)
**Risk Threshold**: `p1` (per `_bmad/tea/config.yaml` — high risks ≥6 demand mitigation, P1 coverage `≥95%`)

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (already green — helper 3/3 committed, but gate still covers 4-branch parity).
- Run `*automate` for broader coverage once implementation exists (no new automation needed beyond `statusBar.test.ts`; file-content `rg` gates suffice).
- Run `*nfr-assess` to validate NFR thresholds once evidence exists (reliability pure + maintainability single-source + performance O(1) + manual contrast photo).
- Run `*trace` to validate AC→test traceability before gate decision.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: _________________ Date: _______
- [ ] Tech Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______

**Comments:**

---


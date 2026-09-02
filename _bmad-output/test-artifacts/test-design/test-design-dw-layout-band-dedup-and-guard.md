---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/ui/layout.ts'
  - 'triade/App.tsx'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/orientation.ts'
  - 'triade/__tests__/ui/layout.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-layout-band-dedup-and-guard — layoutFor NaN/Infinity guard + band-height dedup

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-layout-band-dedup-and-guard`
**Scope:** Targeted test design for the working-tree delta of `dw-layout-band-dedup-and-guard`

> **Delta under assessment:** Commit `a09e6ed23b968201717a4848cb1cff148172ac4e` vs baseline `80dc5c1c6a02f56dc1f3335100c64d9d266314b7` (`spec-layout-band-dedup-and-guard.md` `baseline_revision`). Working-tree diff vs `HEAD` is metadata-only (`spec` `final_revision` + `deferred-work.md` DW-5/DW-10 `open→done` with `resolution-undo` hash); production engine byte-identical (`git diff --stat -- triade/src/engine` empty). The sweep resolves DW-5 and DW-10 and hardens the layout seam:
> - `triade/src/ui/layout.ts` — `export function getBandTop(insets: EdgeInsets, bandHeight: number): number { return insets.top + SAFE_MARGIN + bandHeight; }` exported; `layoutFor` gains early `Number.isFinite` guard on `width/height/insets.top/bottom/left/right` degrading to `{ boardSize: 0, bandHeight: PORTRAIT_BAND_HEIGHT, isLandscape: false }` (finite, no throw, no NaN propagation); finite-path math byte-identical (`SAFE_MARGIN=16`, `PORTRAIT=96`/`LANDSCAPE=48`, `availBoard = max(0, min(availWidth, availHeight))` + `BOARD_SIZE_FLOOR` floor clamp, `isLandscape` delegation).
> - `triade/App.tsx:31→` — `import { layoutFor, getBandTop }` (was `SAFE_MARGIN`) and `bandTop = getBandTop(insets, bandHeight)` (was `insets.top + SAFE_MARGIN + bandHeight`).
> - `triade/src/ui/Hud.tsx:3,67,113` — `import { SAFE_MARGIN, getBandTop }` and both `height:` sites (`portraitBand` `topPad+bandHeight` + `landscapeBand` `topPad+bandHeight`) replaced by `getBandTop(insets, bandHeight)`; `topPad/leftPad/rightPad/bottomPad` locals retained for `padding*`.
> - `deferred-work.md` — DW-5 (`NaN/Infinity propagates NaN`) and DW-10 (`band formula duplicated`) flipped `status: open→done 2026-09-01` + `resolution: resolved by sweep bundle dw-layout-band-dedup-and-guard` + `resolution-undo: 6f4ef234…`
> - No engine, feel, Skia, Reanimated, gesture, or monetization logic change.

---

## Executive Summary

**Scope:** Defensive hardening of the container-driven layout math that sizes the 4×4 board and the HUD band. Before the sweep a hypothetical `NaN`/`Infinity` reaching `layoutFor` (e.g. a test harness or a future native insets provider) propagated `NaN` through `availWidth/Height` into `boardSize`, while the band-height formula `insets.top + SAFE_MARGIN + bandHeight` lived in two components (`App.tsx` `bandTop` and `Hud.tsx` `topPad+bandHeight`) with drift risk when the 16-pt margin changes. The sweep makes every `layoutFor` output finite by early-returning `boardSize:0` on non-finite inputs and centralizes the band formula into a single exported `getBandTop` — with zero change to any finite-input rendering (portrait 96, landscape 48, maximized square, 0-clamp).

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (≥6): 3
- Critical categories: TECH (guard finite-fallback vs 0-clamp, single-helper dedup, byte-identical finite path), BUS/OPS (band drift on future margin change, ledger `resolution-undo` ownership)

**Coverage Summary:**

- P0 scenarios: 7 groups (host unit, pure layout seam — NaN/Infinity guard 6-way + finite byte-identical + degenerate clamp + helper dedup grep/host)
- P1 scenarios: 6 groups (band pins 96/48 + `isLandscape` single-source + `getBandTop` pure unit + asymmetry insets + `tsc` + scanner `ui.purity`)
- P2/P3 scenarios: 6 groups (static single-constant scan, no-duplicate-formula grep, `getBandTop` non-finite exploratory, board-floor/clipping, device rotation manual-waiver)
- **Total effort**: ~3–6 hours (~0.4–0.8 days; host-only, no device bench beyond optional 15-min rotation smoke)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine `src/engine` merge/spawn/score/ceiling/tier, `pendingSpawn`/`previewFor`, `matchOrchestrator`, `src/feel` haptics/punch/shake/bullet/sfx, `GameBoard` Skia/Reanimated, `RNGH` gesture gate** | `git diff --stat -- triade/src/engine` empty; `git diff --stat` shows only `layout.ts`+`App.tsx`+`Hud.tsx`+ledger/spec — engine/feel/render byte-identical. | Engine invariants stay gated by `npm --prefix triade test` (857 pass, 10 EXPECTED RED from felt-atdd) + `git diff` empty check in this plan. |
| **`boardSize` 0-clamp vs 40-pt floor vs 360 cap trade-off, `BOARD_SIZE_FLOOR` legibility scaling (`tileNumerals.ts`)** | Pre-existing UX-DR-18/20 decision; clamp to 0 on degenerate/huge-insets is accepted per DW-4 (`status: open` — acceptable per spec). Sweep only adds the non-finite guard ahead of the existing clamp; `availBoard < BOARD_SIZE_FLOOR ? availBoard : max(availBoard, FLOOR)` line unchanged. | DW-4 remains explicitly `open` and is not re-triaged here; `layout.test.ts:232` degenerate-clamp + `boardSize >= BOARD_SIZE_FLOOR` floor-pinned cases stay gate. |
| **`SafeAreaProvider` rotation race (`useSafeAreaInsets` lag → flash to 0, `initialMetrics` missing, `ScrollView` offset)** | Native polish DW-6 (`status: open`, manual-validation domain) — unrelated to layout math; sweep never touches `SafeAreaProvider`/`useWindowDimensions` wiring. | DW-6 stays `open` and manual; not re-tested. |
| **`getBandTop` non-finite bandTop propagation (`insets.top = Infinity → Infinity` even though `layoutFor` already returned finite `bandHeight`)** | Spec explicitly forbids broad sanitization beyond the requested `layoutFor` `Number.isFinite` guard (`Never: add broad input sanitization beyond the requested Number.isFinite guard`). Helper is intentionally pure arithmetic; production insets from `react-native-safe-area-context` are always finite zeros on layout tests. | Captured as R-006 (score 3) residual — document-only, zero current blast radius; future helper hardening would add `Number.isFinite` inside `getBandTop` if a real non-finite `insets` ever reaches production. |
| **`mulberry32`, `rngOf`/`spyRng`, `stripComments`, `gameState` helpers from `dw-test-scanner-helpers-hardening`** | That sweep's `triade/test-utils/helpers.ts` hardening is already green and byte-identical in this delta (`git diff --stat` does not list `helpers.ts`). | Existing `dw-test-scanner-helpers-hardening` test-design remains gate; not re-derived. |
| **RevenueCat / AdMob / IAP / Epic 10-11 monetization + `ToneScreen`/`LaneSelect`** | No monetization code touched. | Existing suites remain gate. |
| **Benchmark micro-bench lane for layout (`feel.bench.test.ts`-style)** | Layout is O(1) arithmetic, `BOARD_SIZE_FLOOR` branch is cold on tiny hosts; no timing-sensitive gate required per spec `npm test` <15 min is the gate. | No extra bench lane; host `npm test` timing is the gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `layoutFor` is a pure `({width,height,insets})→{boardSize,bandHeight,isLandscape}` function with no `expo-*`/`Skia` dependency beyond the `isLandscape(width,height)` import; `getBandTop` is pure `EdgeInsets×number→number` arithmetic. Every path is host-testable via `node --import tsx --test` with `ZERO_INSETS`/`PORTRAIT_NOTCH`/`LANDSCAPE_NOTCH` fixtures and NaN/Infinity literals.

**Observability — Good.** Outputs are all numeric booleans with no hidden state: `Number.isFinite(boardSize/bandHeight)`, `bandHeight ∈ {96,48}`, `isLandscape` boolean, `boardSize === max(0, min(availWidth, availHeight))` (or floor-clamped). `getBandTop` is a single-site pure export observable via direct `import` or via `App.tsx`/`Hud.tsx` style grep.

**Reliability — Strong (layout never throws, helpers never throw).** Guard early-returns a finite object instead of letting `NaN` poison `availWidth/Height`; `getBandTop` is `Number.isFinite`-free by spec (pure `+`). No async/`setTimeout`/worklet thin surface. Both `tsc` gates (`tsconfig.json` + `tsconfig.test.json`) clean.

**Testability Risks:** Guard fallback value `bandHeight:96 + isLandscape:false` is arbitrary but finite; a future caller that asserts on a different fallback (e.g. `LANDSCAPE=48` or `isLandscape:true` for `Infinity`) would diverge — pins must assert **finiteness + `boardSize:0`** rather than exact fallback. Helper is single export; a later edit that re-inlines `insets.top + SAFE_MARGIN + bandHeight` would silently reintroduce drift — mitigated by grep gate R-002.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Guard fallback vs 0-clamp confusion — `layoutFor(NaN)` returns `boardSize:0` which is indistinguishable from degenerate-insets `boardSize:0` but with a different `bandHeight` fallback (96 vs. the container's orientation-derived 48/96).** Spec says guard returns `{boardSize:0, bandHeight: PORTRAIT 96, isLandscape:false}` regardless of which input was non-finite. Risk: a future test or caller conflates the two `0` paths and asserts the wrong band (e.g. expects `LANDSCAPE 48` for `layoutFor({width:NaN,height:844})` and gets `96`), or a future App consumer expects `isLandscape` to still reflect the (non-finite) width>height relation and branches incorrectly on the `false` fallback. Current blast radius zero (production `useWindowDimensions` + `useSafeAreaInsets` are always finite; the fallback path is defensive only). Spec says choice of fallback `bandHeight/isLandscape` for non-finite is not observable in production but must be **finite and consistent** — not necessarily landscape-correct. | 2 | 3 | **6** | Pin guard as **finite-not-exact**: (a) host unit `layoutFor({width:NaN,height:844,insets:ZERO})` → `boardSize:0 && Number.isFinite(bandHeight) && Number.isFinite(isLandscape===false||true)` + `bandHeight>0` (no `NaN` propagation), similarly for `Infinity` and for each `insets.*=Infinity`; (b) keep fallback literal grep-pinned to exactly one site `rg -n "boardSize: 0.*PORTRAIT_BAND_HEIGHT" triade/src/ui/layout.ts` ==1 (no second guard with different literal); (c) doc that finite vs non-finite `0` collapse is expected — callers must not branch on `boardSize:0` alone (they branch on `isLandscape` only for finite containers). | FE lead | Immediate (gate this sweep; protects DW-5) |
| R-002 | TECH | **Single-helper dedup drift — `getBandTop` regresses or App/Hud re-inline `insets.top + SAFE_MARGIN + bandHeight`.** Sweep centralizes `insets.top + SAFE_MARGIN + bandHeight` into `layout.ts:getBandTop` and replaces both call sites. Risk: a later edit reintroduces a second local `const bandTop = insets.top + SAFE_MARGIN + bandHeight` in `App.tsx` or leaves `Hud.tsx` with `topPad + bandHeight` (which is semantically identical but a different AST), re-creating the drift class DW-10 was meant to close — a future `SAFE_MARGIN` change (16→20) would then require two edits and one site could be missed. Grep `SAFE_MARGIN` in App/Hud would then show 2+ hits outside `layout.ts`. | 2 | 3 | **6** | Enforce single source: (a) **static grep gate** `rg -n "insets\.top \+ SAFE_MARGIN \+ bandHeight" triade/App.tsx triade/src/ui/Hud.tsx` must be 0; `rg -n "topPad \+ bandHeight" triade/src/ui/Hud.tsx` must be 0; `rg -n "getBandTop" triade/App.tsx triade/src/ui/Hud.tsx` must be 2 hits (App `const bandTop = getBandTop(insets, bandHeight)` + Hud 2× `height: getBandTop(insets, bandHeight)`); (b) **grep allowlist** `rg -n "SAFE_MARGIN" triade/App.tsx triade/src/ui/Hud.tsx` must be 0 (only `layout.ts` + `tileNumerals` + tests reference the constant directly); (c) **export pin** `rg -n "export function getBandTop" triade/src/ui/layout.ts` ==1 and `import.*getBandTop` sites ==2. | FE | Immediate |
| R-003 | TECH | **Finite-path regression — guard's `Number.isFinite` check misses `-0` semantics or future caller drops one inset field, and finite containers subtly change board size/orientation.** Sweep adds a 6-field guard (`width/height/top/bottom/left/right`). Risk: an edit that adds a destructured `insets` without `left`/`right` default would make `Number.isFinite(undefined)`→`false` and force every call to the `0` fallback (board disappears); or a change that treats `-0` as non-finite (`Object.is` vs `Number.isFinite`) would incorrectly degrade a valid container. More likely: a later `layoutFor` change that moves `isLandscape`/`bandHeight` derivation **before** the guard would compute `isLandscape(NaN, height)` and let `NaN` leak into `availWidth/Height` before the early return, negating the guard. `layout.test.ts` (18 tests) already sweeps finite sizes and degenerate clamp; `npm --prefix triade test -- __tests__/ui/layout.test.ts` must stay 18 pass, both `tsc` clean. | 2 | 3 | **6** | Keep guard first: (a) host unit sweep `for width in [320,390,414,844,1024]×[568,844,896,390,768]` with `ZERO_INSETS` assert `boardSize===min(availWidth, availHeight)` byte-identical to pre-change (existing `layout.test.ts:189` sweep + golden anchors `382`/`688`/`452`); (b) guard-order pin via source grep `rg -n "Number.isFinite" triade/src/ui/layout.ts` is the first statement inside `layoutFor` (line ≤3 after signature), followed by `rg -n "BOARD_SIZE_FLOOR" ...` (finite path); (c) CI gate `npm --prefix triade test` stays 857 pass / 10 EXPECTED RED (felt-atdd) and `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `tsconfig.test.json` clean. | FE lead | Immediate |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Per-edge insets binding divergence after dedup — `App.tsx` uses `getBandTop(insets, bandHeight)` for `bandTop` but still computes `boardSize` via `layoutFor`'s internal `availWidth = width - left - right - 2*SAFE_MARGIN` / `availHeight = height - top - bottom - 2*SAFE_MARGIN - bandHeight`.** A future `SAFE_MARGIN` edit that updates `layout.ts` but not `Hud.tsx` `topPad/leftPad` helpers is caught by R-002, but a `boardSize` vs `bandTop` total-height invariant could still break: `boardSize + bandHeight + 2*SAFE_MARGIN + insets.top+bottom` must ≤ `height`. `layout.test.ts` pin `boardSize <= availHeight - bandHeight` already exists; risk is a follow-on that changes `layout.ts:SAFE_MARGIN` semantics differently for band vs board. | 1 | 3 | 3 | Keep total-height pin: `layout.test.ts` `boardSize never exceeds safe-margin-bounded available width or height (insets respected, AC-4)` (4-case sweep) plus small-screen `boardSize + bandHeight <= availHeight` pin must stay green; grep `SAFE_MARGIN` stays single constant export `layout.ts: SAFE_MARGIN = 16` (not duplicated in App/Hud). |
| R-005 | TECH | **`SAFE_MARGIN` single-constant invariant — `triade/src/ui/layout.ts` already owns `SAFE_MARGIN=16` and `PORTRAIT/LANDSCAPE_BAND_HEIGHT`; `App.tsx` previously imported it, now no longer.** Some other file could introduce a second `const SAFE_MARGIN = 16` literal (copy-paste) and drift differently per file. | 1 | 3 | 3 | Single-constant gate: `rg -n "const SAFE_MARGIN|SAFE_MARGIN =" triade/src triade/App.tsx --include="*.ts" --include="*.tsx"` shows exactly one definition site (`layout.ts: SAFE_MARGIN = 16`) and 1 barrel re-export is disallowed; `rg -n "SAFE_MARGIN" triade --include="*.ts" --include="*.tsx"` allowlist: `layout.ts`, `tileNumerals`/`layout.test.ts`/`orientation` only, App/Hud must each show `getBandTop` not `SAFE_MARGIN`. |
| R-006 | TECH | **`getBandTop` non-finite bandTop residual (spec-allowed).** `getBandTop({top:NaN},48)` → `NaN` and `getBandTop({top:Infinity},48)` → `Infinity` even though caller `layoutFor` already returned finite `bandHeight`. `App.tsx: bandTop` is consumed as `paddingTop` on the content View, and `Hud.tsx: height` as band height — a `NaN`/`Infinity` there would poison React Native layout (blank band). Spec permits because production insets are always finite; proper fix would add `Number.isFinite(insets.top)` guard inside helper too, but spec explicitly forbids broad sanitization. | 1 | 3 | 3 | Document residual: add `// getBandTop: pure arithmetic — production insets from useSafeAreaInsets are finite; non-finite bandTop propagates NaN/Infinity by spec (layoutFor guard owns finiteness of bandHeight/isLandscape, not bandTop)` comment if helper is ever hardened; keep deferred note (not threshold) and capture as `DW-5 residual` in ledger doc. No gate beyond the `layoutFor` NaN guard (P0) + `rg -n "getBandTop"` 2-site pin. |
| R-007 | BUS | **Band drift → HUD chrome / status-bar coverage regression.** `bandHeight` pins (portrait 96 fits pause hit target ≥44, landscape 48 thin top-edge band D-006) are UX-visible; a helper regression that swapped orientation (e.g. returned `LANDSCAPE` for portrait) would collapse the Clean scorewrap or widen SafeArea bleed. `layout.test.ts` already pins `PORTRAIT=96/LANDSCAPE=48` + `portrait band > landscape band` + `board dominates the thin band at extreme 2000x200`. | 2 | 2 | 4 | Same pins as F-2/F-3: host unit `band heights are pinned exactly: portrait 96 and landscape 48` + `landscape HUD collapses` + `extreme landscape board dominates thin band` must stay green; no new chrome gate beyond layout host. |
| R-008 | OPS | **Deferred-ledger `resolution-undo` hash coupling — sweep marked DW-5/DW-10 `done` with 64-hex `resolution-undo: 6f4ef234…` (`deferred-work.md:42,80`), and `sprint-status.yaml` is orchestrator-owned and must not be written by this workflow.** A follow-on sweep that reopens DW-5/DW-10 without preserving the hash loses the revert trail; a stray `sprint-status.yaml` edit violates the prompt's "never write it" rule. | 1 | 2 | 2 | Ledger already records `resolution-undo: 6f4ef234… 2026-09-01 73746…` per entry; any reopen must keep the hash. `git diff --stat` gate shows 3 files (`layout.ts`/`App.tsx`/`Hud.tsx`) + `deferred-work.md`+`spec` but NOT `sprint-status.yaml`; this plan never writes that file. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | TECH | **Orientation delegation drift — `layoutFor` delegates `isLandscape` to `triade/src/ui/orientation.ts:isLandscape(width,height)` (`return width > height`).** If a future edit changes `orientation.ts` to `width >= height` (square=landscape) or adds platform-specific insets rotation, `layoutFor.isLandscape` would diverge from its `bandHeight` choice unless `layout.ts` keeps the single `isLandscape()` call. | 1 | 2 | 2 | Monitor — `layout.test.ts` `[P1] isLandscape agrees with isLandscape(width,height) — single source of truth` (4-case) pins this; grep `rg -n "isLandscape" triade/src/ui/layout.ts` stays exactly 2 (import + one call). No gate. |
| R-010 | OPS | **Helper name drift — spec called out `bandTop`/`hudBandTop`/`getBandTop` as equivalent; code landed `getBandTop`.** A future edit renaming to `hudBandTop` without a re-export alias would break App/Hud imports and fail `tsc`. Not a test-risk, just a tsc-risk. | 1 | 1 | 1 | Monitor — `npx tsc --noEmit` catches import breakage; no extra pin. |

### Risk Category Legend

- **TECH**: Technical/Architecture (guard finiteness, single helper, byte-identical finite path, orientation delegation)
- **SEC**: Security — none this sweep (no auth/data exposure; `Number.isFinite` guard is layout-only, not security boundary)
- **PERF**: Performance — none standalone (layout is O(1) arithmetic; no bench lane)
- **DATA**: Data Integrity — none standalone (`boardSize:0` degrade is visible, not silent corruption)
- **BUS**: Business Impact — HUD chrome drift / status-bar legibility if bandHeight wrong (R-007)
- **OPS**: Operations (deferred ledger `resolution-undo`, `sprint-status.yaml` ownership, tsc gates)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-layout-band-dedup-and-guard` touches the **layout seam only**: **reliability/never-throw** (every `layoutFor` output finite), **maintainability (single `getBandTop` + single `SAFE_MARGIN` + single 64-hex `resolution-undo`)**, **60 FPS/frame budget unchanged** (O(1) arithmetic, no worklet), and **offline/installability** unchanged (no new deps).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — never-throw + finiteness | `layoutFor` never throws on any `width/height/insets` including `NaN/Infinity/-Infinity/undefined-as-unchecked-JS`; every returned `boardSize/bandHeight` is `Number.isFinite` and `boardSize>=0 && bandHeight>0 && typeof isLandscape==='boolean'`; `getBandTop` never throws on any `insets/top + bandHeight` (NaN propagates per spec but does not throw). | R-001, R-003, R-006 | Host unit negative-path sweep: `layoutFor({width:NaN,…})`, `layoutFor({width:Infinity,…})`, each `insets.*=NaN/Inf/-Inf`, negative/zero `width/height`, insets exceeding container (already `layout.test.ts:232` `boardSize:0`). Also `getBandTop({top:0},48)===64` sanity + `getBandTop({top:NaN},48)` is NaN per arithmetic (no throw). Exhaustive sweep `sizes 320/390/844/1024/2000` + degenerate `top:2000` already pins finiteness. | `triade/__tests__/ui/layout.test.ts` host sweep (18 pass) + new NaN/Inf guard pins (see P0) + `npm --prefix triade test -- __tests__/ui/layout.test.ts` green + both `tsc` clean |
| Maintainability | Single helper: `export function getBandTop` only definition of `insets.top + SAFE_MARGIN + bandHeight`; `layoutFor` single `Number.isFinite` guard at top (6-field); single `SAFE_MARGIN=16` + `PORTRAIT 96`/`LANDSCAPE 48` + `BOARD_SIZE_FLOOR` definition; single `resolution-undo` 64-hex per resolved DW; `isLandscape` delegation single call `triade/src/ui/orientation.ts`. | R-002, R-005, R-008, R-009 | Static scans: `rg -n "export function getBandTop" triade/src/ui/layout.ts` ==1; `rg -n "getBandTop" triade/App.tsx triade/src/ui/Hud.tsx` ==3 (1 App +2 Hud) + `rg -n "SAFE_MARGIN" triade/App.tsx triade/src/ui/Hud.tsx` ==0; `rg -n "Number.isFinite" triade/src/ui/layout.ts` ==6 (one per field, early guard); `rg -n "isLandscape\(" triade/src/ui/layout.ts` ==1; ledger `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` shows 2 new 64-hex entries for DW-5/10. | Source scans + `layout.ts:1-60` + `App.tsx:31` + `Hud.tsx:3,67,113` diff + ledger diff |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: layout `O(1)` arithmetic `<0.01 ms`, no `Math.random` in layout, no worklet, no `setTimeout`; Hud/App band calc stays same `+` cost centralized into one call — no frame-budget impact. | — | Host gate only: `npm --prefix triade test` (full) `<15 min` already required by spec `Verification`; `layout.test.ts` median per `layoutFor` call `<0.005 ms` (observed `<0.2ms` per `test()`). | CI `npm test` timing + both `tsc` clean; no bench lane |
| Compliance — HUD band chrome / status-bar coverage | `insets.top + SAFE_MARGIN + bandHeight` is the Chrome contract (thin top-edge band in landscape D-006, 96-pt portrait band fits ≥44-pt pause hit target). Band must be finite >0 and board must not overlap the band (`boardSize + bandHeight <= availHeight`). | R-004, R-007 | Host chrome pins: `band heights pinned exactly: portrait 96 and landscape 48` + `landscape HUD collapses` + `board dominates thin band at 2000x200` + `board never exceeds safe-margin-bounded width/height` + `small screen board never overlaps HUD band`. | `layout.test.ts` 18-pass sweep + `Hud.tsx` `getBandTop` style-height pin (App/Hud `rg` ensures single helper) |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (layout is pure TS `orientation` + `tileNumerals` constants). | — | `npm --prefix triade test` offline (no network) still green; `npx tsc --noEmit` clean. | Manual offline device lane not needed for this sweep (no new native module); optional 15-min rotation smoke (see Execution Strategy) may be run on simulator without network. |

**Unknown thresholds:** None material. `Number.isFinite` guard chooses `boardSize:0 + 96 portrait` fallback per spec — not derived from PRD, so the specific fallback value is not threshold-invented; the gate is **finiteness** (`boardSize===0 && Number.isFinite(bandHeight) && Number.isFinite(isLandscape)`) rather than an invented exact band for the non-finite path. Helper `getBandTop` cost is O(1) observed, not threshold-invented.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-layout-band-dedup-and-guard.md` intent/boundaries/I-O matrix 6 rows + 4 ACs + design notes signed; DW-5/10 ledger entries reviewed)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsx` + `tsconfig.test.json` (`TSX_TSCONFIG_PATH`) + `orientation.ts` + `tileNumerals.ts:MIN_TILE_WIDTH`)
- [ ] Test data available or factories ready (`ZERO_INSETS`/`PORTRAIT_NOTCH`/`LANDSCAPE_NOTCH` fixtures + NaN/Infinity variants + `SAFE_MARGIN=16`/`PORTRAIT 96`/`LANDSCAPE 48` constants + `BOARD_SIZE_FLOOR`)
- [ ] Feature deployed to test environment (commit `a09e6ed` on host — `layout.ts`+`App.tsx`+`Hud.tsx` patched; baseline `80dc5c1` committed; `git diff --stat -- triade/src/engine` empty)
- [ ] No engine edits (`git diff --stat -- triade/src/engine` empty) and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`layoutFor` NaN/Infinity 6-way guard + finite byte-identical sweep + degenerate 2000 clamp + helper dedup grep — host)
- [ ] All P1 tests passing (or failures triaged with waivers) — bandHeight 96/48 pins + `isLandscape` single-source + `getBandTop` pure + asymmetry insets + `tsc` + `engine.purity`/`ui.norolls` green
- [ ] No open high-priority / high-severity bugs (R-001..R-003 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on layout seam; `rg` allowlists for single `SAFE_MARGIN` / single `getBandTop` / no duplicate formula / early `Number.isFinite` guard green)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean (both via `TSX_TSCONFIG_PATH`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness, single-helper maintainability, chrome 96/48)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns layout P0 NaN/Inf pins, helper single-source scans, ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `layout.ts` `getBandTop` + `Number.isFinite` guard contract, finite-path byte-identity, `BOARD_SIZE_FLOOR` clamp |
| PM | PM | Signs DW-5 `boardSize:0` fallback semantics + DW-10 helper dedup drift closure + accepts `getBandTop` non-finite `NaN` residual (spec-allowed) |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit, already green (except NaN-guard literal which is already landed)

**Criteria**: Blocks NaN-propagation or band-drift recurrence + high risk (≥6) + no workaround (finite-band + 0-clamp is the contract)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — `layoutFor({width:NaN,height:844,insets:ZERO})` + each `insets.*=NaN/Infinity/-Infinity` degrades to `{boardSize:0, bandHeight:finite>0, typeof isLandscape==='boolean', Number.isFinite(boardSize)&&Number.isFinite(bandHeight)}` and no throw | Unit | R-001, R-003 | 6 | QA (done in code) | Covers the 6 fields in guard: `width`, `height`, `top`, `bottom`, `left`, `right` each set to `NaN` once (Infinity variant optional as 7th). Fallback asserts **finiteness** (`bandHeight>0 && Number.isFinite` + `boardSize===0` + boolean) not exact 96/false — the exact 96/false is also landed but the finiteness gate is the production contract. File `triade/src/ui/layout.ts:37-45`. |
| AC — Given any finite `width/height/insets`, `layoutFor` output byte-identical to pre-change (portrait 96, landscape 48, maximized square, 0-clamp preserved) — golden `414×896 →382`, `1024×768 →688`, `500×580 →452`, sweeps 320/390/844/1024 | Unit | R-003 | 3 | QA (done) | Already `layout.test.ts` sweep `maximized square for a sweep of containers` + `golden anchors` + `never exceeds safe-margin-bounded width/height` — verify unchanged post-guard (host `<1 s`). |
| AC — `layout.test.ts:232` degenerate `top:2000` clamps `boardSize:0` and stays green; same for `Infinity` insets (guard path) vs huge finite `2000` (clamp path) — both collapse to 0 | Unit | R-001 | 1 | QA (done) | `layout.test.ts` `degenerate insets that exceed the container clamp the board to 0` (`[P0]`) — keep green; add one extra pin per-R-001: `layoutFor({width:320,height:480,insets:{top:Infinity,bottom:0,left:0,right:0}}).boardSize===0 && bandHeight finite` (non-finite path vs degenerate path). |
| AC — `getBandTop` dedup byte-identical: `App.tsx:const bandTop = getBandTop(insets, bandHeight)` and `Hud.tsx 2× height: getBandTop(insets, bandHeight)` replace both former `insets.top + SAFE_MARGIN + bandHeight` / `topPad + bandHeight` inline formulas | Static + Unit | R-002 | 2 | QA (done) | (1) **grep gate** `rg -n "insets\.top \+ SAFE_MARGIN \+ bandHeight" triade/App.tsx triade/src/ui/Hud.tsx` ==0 and `rg -n "topPad \+ bandHeight" triade/src/ui/Hud.tsx` ==0 and `rg -n "getBandTop" triade/App.tsx triade/src/ui/Hud.tsx` ==3; `rg -n "SAFE_MARGIN" triade/App.tsx triade/src/ui/Hud.tsx` ==0; (2) **pure unit** `getBandTop({top:47,bottom:34,left:0,right:0},96)===47+16+96` (equivalently `getBandTop(PORTRAIT_NOTCH,96)===159`) and `getBandTop(LANDSCAPE_NOTCH,48)===16` when notch `top:0`. |
| AC — `getBandTop` pure arithmetic exported once and consumed exactly twice (App `bandTop` for `paddingTop`, Hud 2× for band height) | Unit | R-002 | 1 | QA | `rg -n "export function getBandTop" triade/src/ui/layout.ts` ==1; `rg -n "from './layout'" triade/App.tsx` shows `getBandTop` in named import and `rg -n "from './layout'" triade/src/ui/Hud.tsx` same; `npx tsc` catches rename drift. |

**Total P0**: 13 checks (host unit + 2 grep gates), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & finiteness/chrome preservation

**Criteria**: Important layout→HUD wiring + medium/high risk + common portrait/landscape/`isLandscape` workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Band pins: `PORTRAIT_BAND_HEIGHT===96` / `LANDSCAPE===48` and `layoutFor` reports correct `bandHeight` on portrait 390×844 (96) vs landscape 844×390 (48) + `boardSize horizontal vs vertical` binding | Unit | R-007 | 2 | QA | Already `layout.test.ts` `[P0] band heights are pinned exactly: portrait 96…` + `[P0] landscape HUD collapses… bandHeight(portrait)>bandHeight(landscape)` — keep green. |
| `layoutFor.isLandscape` single source `isLandscape(width,height)` + ` orientation.ts: width>height ` (square→portrait) agrees with layout | Unit | R-009 | 1 | QA | Already `layout.test.ts` `[P1] isLandscape agrees with isLandscape(width,height)` (4 cases) — keep green; grep `isLandscape` import stays exactly 2 sites in `layout.ts`. |
| Per-edge insets bind asymmetrically: horizontal insets shrink width-bounded 390×844 `358→338`; vertical notch shrinks height-bounded 500×580 `452→min(availWidth, vertical)` | Unit | R-004 | 1 | QA | Already `layout.test.ts` `[P1] per-edge insets bind asymmetrically: vertical insets shrink a height-bounded …` — keep green. |
| `getBandTop` pure arithmetic with `SAFE_MARGIN=16` — `SAFE_MARGIN===16` and `getBandTop({top:0,…},48)===64` / `getBandTop({top:47,…},48)===111` | Unit | R-002, R-005 | 1 | QA | `SAFE_MARGIN===16` already `layout.test.ts` `[P0] SAFE_MARGIN is exactly 16pt…`; helper adds one direct arithmetic pin. |
| `tsc` + scanner purity green — `npx tsc --noEmit` clean + `engine.purity` + `ui.norolls` stay green on clean codebase after layout helper export | Integration (scanner) | R-002, R-003 | 1 | QA | `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` clean + `...tsconfig.test.json` clean; `rg -n "export function getBandTop"` counted; `npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/ui/ui.norolls.test.ts` green (no new forbidden import). |
| Finiteness sweep across sizes: `all layoutFor outputs are finite and board never negative across sweep 320/390/844/2000/200` + `min-tile floor keeps boardSize>=BOARD_SIZE_FLOOR` when container fits | Unit | R-001 | 1 | QA | Already `layout.test.ts` `[P0] all layoutFor outputs are finite… never negative` + `[P0] min-tile floor… keeps boardSize>=FLOOR` — keep green. |

**Total P1**: 7 checks, ~0.4–0.7 h host (mostly existing layout suite)

### P2 (Medium) — Secondary flows + low/medium risk (4)

**Criteria**: Secondary helper edges + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-constant / single-helper / single-guard allowlists — `SAFE_MARGIN` only defined in `layout.ts`, `getBandTop` only exported there, `Number.isFinite` guard only at top of `layoutFor` | Static scan | R-002, R-005, R-003 | 1 | QA | `rg -n "export function getBandTop" triade/src/ui/layout.ts` ==1; `rg -n "Number.isFinite" triade/src/ui/layout.ts` shows 6 field checks on one guard (`if (!Number.isFinite(width) \|\| …)`); `rg -n "SAFE_MARGIN" triade/src/ui/layout.ts` definition ==1 site, consumers use `getBandTop`. |
| No duplicate formula / no direct `SAFE_MARGIN` in App/Hud — `App.tsx` + `Hud.tsx` never mention `SAFE_MARGIN` outside the `import "layout"` line; helper owns every bandTop | Static scan | R-002 | 1 | QA | `rg -n "SAFE_MARGIN" triade/App.tsx triade/src/ui/Hud.tsx | wc -l` ==0 (or only import line counted and then excluded); same for `insets.top + SAFE_MARGIN`. |
| Ledger `deferred-work.md` DW-5/DW-10 `done` with `resolution-undo` 64-hex hash, `sprint-status.yaml` untouched (orchestrator-owned) | Static | R-008 | 1 | QA | `rg -n "status: done 2026-09-01" _bmad-output/implementation-artifacts/deferred-work.md` shows 2 hits (DW-5/10) each with `resolution-undo: 6f4ef234…`; `git diff --stat` shows `deferred-work.md` but not `sprint-status.yaml`. |
| Board floor + clipping complement — `BOARD_SIZE_FLOOR` pin + `availBoard < FLOOR ? availBoard : max(availBoard, FLOOR)` branch + `board dominates thin band at 2000×200` | Unit | R-004, R-007 | 1 | QA | Already `layout.test.ts` `min-tile floor` + `min-tile floor edge (too small → fallback)` + `extreme landscape board dominates thin band` — keep green. |

**Total P2**: 4 checks, ~0.2–0.4 h host

### P3 (Low) — Exploratory / non-finite helper residual / rotation smoke

**Criteria**: Nice-to-have, exploratory, manual smoke

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — non-finite `getBandTop` arithmetic is intentional: `getBandTop({top:NaN,bottom:0,left:0,right:0},48)` is `NaN` (no throw) and `getBandTop({top:Infinity,…},48)` is `Infinity` — spec allows bandTop NaN/Infinity while bandHeight stays finite | Unit (doc) | 1 | QA | No gate (P3) — just doc that helper is pure `+`; assert `Number.isNaN(getBandTop({top:NaN},48))` if anyone pins it. |
| Micro-zero — `layoutFor` with `0/0` or negative `width/height` degrades to `boardSize:0` (>=0, finite) via `max(0, …)` clamp, not guard (guard only for non-finite, not negative) — already `layout.test.ts:289` finiteness sweep | Unit | 1 | DEV | Already `layout.test.ts` `boardSize never negative across sweep` + `degenerate insets exceed container` — no new gate. |
| Manual rotation smoke (optional) — portrait 390×844 then rotate to 844×390, band collapses `96→48`, board height-bounded, no `NaN` in dev-tools layout, no overlap `boardSize + bandHeight <= availHeight` — deferred DW-6 companion but not required for this sweep (layout math already pinned host) | Device exploratory (`expo` iOS simulator) | 1 | QA | Optional 15-min pass; mark `WAIVED` with waiver if not run this cycle (host pins are sufficient for this refactor). `sprint-status.yaml` ownership is orchestrator gate, not this smoke. |
| Chrome snapshot side-carry — no-music / no-monetization negative scan `rg -n "music\|bgm\|RevenueCat\|AdMob" triade/src/ui/layout.ts` empty (layout sweep stayed in scope) | Static scan | 1 | QA | Trivial hygiene carry-over from Epic 8 — no new gate. |

**Total P3**: 4 checks, ~0.15–0.35 h host (plus optional 15-min simulator smoke if run)

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch `require`/guard/helper regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/ui/layout.test.ts` green (18 pass) on clean working tree — includes guard finiteness + degenerate 2000 + golden anchors 382/688/452
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore`, `getBandTop` export typed)
- [ ] `rg -n "insets\.top \+ SAFE_MARGIN \+ bandHeight" triade/App.tsx triade/src/ui/Hud.tsx | wc -l` == 0 and `rg -n "topPad \+ bandHeight" triade/src/ui/Hud.tsx | wc -l` == 0 and `rg -n "getBandTop" triade/App.tsx triade/src/ui/Hud.tsx | wc -l` == 3 and `rg -n "SAFE_MARGIN" triade/App.tsx triade/src/ui/Hud.tsx | wc -l` == 0

**Total**: 3 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical guard finiteness + helper dedup (host only)

- [ ] 6-way `Number.isFinite` guard pins: `width:NaN`, `height:Infinity`, each `insets.*=NaN` once → `boardSize:0 && finite bandHeight/isLandscape` (no `NaN` propagation)
- [ ] Finite byte-identical sweep + golden anchors 382/688/452 + degenerate `top:2000` clamp stays 0
- [ ] `getBandTop` grep allowlists + pure `47+16+96`/`0+16+48` arithmetic + 3-site import pin

**Total**: 13 P0 checks (already passing in `a09e6ed` — `layout.test.ts:18` green, `isFinite` sweep is new but mirrors spec edge matrix)

### P1 Tests (<30 min)

**Purpose**: Band pins + `isLandscape` single-source + asymmetry + tsc/scanner

- [ ] `PORTRAIT 96 / LANDSCAPE 48` + `landscape collapses` + `extreme 2000×200 board dominates`
- [ ] `isLandscape` agrees with `orientation.ts` (4-case) + `availWidth/Height` bound checks
- [ ] `SAFE_MARGIN 16` + `getBandTop` pure + scanner `engine.purity`/`ui.norolls` green

**Total**: 7 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Scans, ledger, exploratory

- [ ] Single-constant / single-helper / single-guard / no-duplicate-formula scans (<1 min)
- [ ] Ledger `resolution-undo` 64-hex 2 hits + `git diff --stat` shows 5 files, not `sprint-status.yaml` (<1 min)
- [ ] Non-finite helper exploratory `NaN→NaN` + exhaustive negative-zero + optional 15-min rotation smoke (<15 min if run)

**Total**: 8 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 13 | ~0.15 | ~1.2–2.0 | NaN/Infinity 6-way guard + finite golden sweep + degenerate clamp + helper grep/unit already green (code landed `a09e6ed`) — 2 new guard pins are O(1) host |
| P1 | 7 | ~0.25 | ~1.2–1.8 | Existing `layout.test.ts` 18-pass suite (96/48 pins, 382/688/452 anchors, `isLandscape`, asymmetry, finiteness) + `tsc` + `purity`/`norolls` green — mostly existing suites |
| P2 | 4 | ~0.2 | ~0.6–1.0 | Static allowlists + ledger 64-hex scans + floor/clipping complements |
| P3 | 4 | ~0.15 | ~0.4–0.6 | Non-finite exploratory + negative-zero + optional rotation smoke + cross-cutting scan |
| **Total** | **28** | **-** | **~3.4–5.4** | **~0.4–0.8 days host; full gate `<15 min` (`npm test` + `tsc` + `rg`) — no device bench lane required; optional 15-min rotation smoke is on-demand** |

### Prerequisites

**Test Data:**

- `ZERO_INSETS`/`PORTRAIT_NOTCH`/`LANDSCAPE_NOTCH` + sizes `320/390/414/500/844/1024/2000` + `boardSize` golden `382/688/452` + `SAFE_MARGIN 16` / `PORTRAIT 96` / `LANDSCAPE 48` / `BOARD_SIZE_FLOOR`
- NaN/Infinity variants: `width:NaN`, `height:Infinity`, `insets:{top:NaN}`, `top:Infinity`, `bottom:-Infinity`, `left:NaN` (6-way coverage per spec I-O matrix)
- `getBandTop` fixtures: `getBandTop({top:47,bottom:34,left:0,right:0},96)===159`, `getBandTop({top:0},48)===64`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `rg` (ripgrep) for allowlist scans (`SAFE_MARGIN`, `getBandTop`, `Number.isFinite`, `resolution-undo`, duplicate-formula)
- `npm --prefix triade exec -- tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`


**Environment:**

- Host Node 18+/20+ with `tsx`; no Expo or iOS simulator required except optional 15-min rotation smoke (`expo start` + simulator `View` band height visual)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — 6-way guard finiteness + helper dedup + golden anchors + degenerate 0)
- **P1 pass rate**: ≥95% (waivers required for any open `P1` — e.g. optional rotation smoke may be `WAIVED` with reason)
- **P2/P3 pass rate**: ≥90% (informational; static scans must be 100%)
- **High-risk mitigations**: 100% complete or approved waivers with owner + expiry (R-001..R-003)

### Coverage Targets

- **Critical paths**: ≥90% (guard 6-way + finite sweep + degenerate clamp + `getBandTop` 2 consumers are all critical)
- **Band chrome scenarios**: 100% (`96/48` pins + `portrait>landscape` + `board dominates` must be PINNED)
- **Business logic**: ≥80% (`layoutFor` pure + `getBandTop` pure + `isLandscape` delegation + asymmetry insets)
- **Edge cases**: ≥90% (`NaN/Infinity` per-field, huge `top:2000`, tiny `320×480`, extreme `2000×200`, zero/negative if added)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (`Number.isFinite` 6-way, finite byte-identical, degenerate 0, helper grep + arithmetic)
- [ ] No high-risk (≥6) items unmitigated (R-001..R-003 each have grep/unit/CI mitigation, or formal waiver with owner+expiry)
- [ ] Single-helper invariant holds (`getBandTop` 1 export + 3 `getBandTop` uses + 0 `SAFE_MARGIN` in App/Hud)
- [ ] No duplicate band formula (`insets.top + SAFE_MARGIN + bandHeight` / `topPad + bandHeight`) remains
- [ ] Early-guard invariant holds (`Number.isFinite` is first statement in `layoutFor`, not after `isLandscape`)
- [ ] `npx tsc --noEmit` clean for both `tsconfig.json` + `tsconfig.test.json` (no new `@ts-ignore` outside `rn-stub` ring)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness, single-helper maintainability, 96/48 chrome)

---

## Mitigation Plans

### R-001: Guard fallback vs 0-clamp confusion — `boardSize:0` is finite for both guard and degenerate paths (Score: 6)

**Mitigation Strategy:** Pin guard as **finiteness not exact-value**: host unit test `layoutFor({width:NaN,height:844,insets:ZERO})` → `boardSize===0 && Number.isFinite(bandHeight) && typeof isLandscape==='boolean'`; repeat per `insets.*=Infinity`. Keep fallback literal `boardSize: 0, bandHeight: PORTRAIT_BAND_HEIGHT, isLandscape: false` single site (`rg -n "boardSize: 0" triade/src/ui/layout.ts` ==1). Doc that finite vs non-finite `0` collapse is expected — callers branch on `isLandscape` only for finite containers.
**Owner:** FE lead
**Timeline:** Immediate (gate this sweep; protects DW-5 never-`NaN`)
**Status:** Complete (code `a09e6ed: layout.ts:37-45` landed, `layout.test.ts:232` degenerate clamp + finiteness sweep green)
**Verification:** `npm --prefix triade test -- __tests__/ui/layout.test.ts` (18 pass) + host NaN 6-way finiteness pins (P0) + `rg -n "boardSize: 0" triade/src/ui/layout.ts` ==1

### R-002: Single-helper dedup drift — `getBandTop` regresses or sites re-inline (Score: 6)

**Mitigation Strategy:** Static grep allowlist + tsc pin. `rg -n "insets\.top \+ SAFE_MARGIN \+ bandHeight" triade/App.tsx triade/src/ui/Hud.tsx` must be 0; `rg -n "topPad \+ bandHeight" triade/src/ui/Hud.tsx` must be 0; `rg -n "getBandTop" triade/App.tsx triade/src/ui/Hud.tsx` ==3; `rg -n "SAFE_MARGIN" triade/App.tsx triade/src/ui/Hud.tsx` ==0; `rg -n "export function getBandTop" triade/src/ui/layout.ts` ==1; `npx tsc` catches rename drift.
**Owner:** FE
**Timeline:** Immediate
**Status:** Complete (code `App.tsx:31,101` + `Hud.tsx:3,67,113` landed)
**Verification:** `rg` gates + `npm --prefix triade exec -- tsc --noEmit` clean + `layout.test.ts:18` green

### R-003: Finite-path regression — `Number.isFinite` dropping a field or moving after `isLandscape` leaks `NaN` (Score: 6)

**Mitigation Strategy:** Guard-order pin + byte-identical finite sweep. `rg -n "Number.isFinite" triade/src/ui/layout.ts` is the first statement in `layoutFor` (6-field guard), before `isLandscape`/`availWidth` derivation. Finite sweep `320/390/844/1024/2000` + gold `382/688/452` unchanged post-guard. CI gate `npm --prefix triade test` stays 857 pass / 10 EXPECTED RED (felt-atdd) and both `tsc` clean.
**Owner:** FE lead
**Timeline:** Immediate
**Status:** Complete (guard is first statement in `a09e6ed: layout.ts:37-45`, `layout.test.ts:18` green)
**Verification:** Source-order grep + `layout.test.ts` byte-identical sweep + full `npm test` + both `tsc` gates

---

## Assumptions and Dependencies

### Assumptions

1. Production `useWindowDimensions()` and `useSafeAreaInsets()` always return finite numbers (spec I-O: `layoutFor` hypothetical non-finite inputs are test/edge only; `deferred-work.md` DW-5 says "Runtime inputs from `useWindowDimensions` are always finite"). Guard path is defensive-only.
2. `getBandTop` is pure `+` arithmetic with no `try/catch` — per spec "Do not edit deferred-work ledger" and "Never add broad input sanitization beyond requested Number.isFinite guard on layoutFor inputs". BandTop NaN for non-finite `insets.top` is accepted residual.
3. The fallback `{ boardSize:0, bandHeight: PORTRAIT 96, isLandscape:false }` choice for non-finite is not observable in production; asserting exact 96/false is secondary to the **finiteness** gate. Spec design note makes this explicit.
4. `BOARD_SIZE_FLOOR` (`MIN_TILE_WIDTH*4 + 8*2 + 8*3`) and `SAFE_MARGIN=16` remain fixed; a future UX-DR margin change is a single-site `(layout.ts):16` edit because App/Hud no longer mention `SAFE_MARGIN`.
5. Host `node --import tsx --test` is the gate runner (`triade/package.json` `test` script); `tsx` + `TSX_TSCONFIG_PATH=tsconfig.test.json` is already available.

### Dependencies

1. `triade/src/ui/layout.ts` — must remain the single owner of `SAFE_MARGIN`/`PORTRAIT/LANDSCAPE`/`BOARD_SIZE_FLOOR`/`getBandTop`/`layoutFor` (required by R-002/R-005, needed before moving remaining `open` DWs like DW-4/DW-6)
2. `triade/__tests__/ui/layout.test.ts` (18 tests) — stays gate; do not edit the 0-clamp test at `:232` or the bin sweep at `:189` without re-baselining gold anchors
3. Both `triade/tsconfig.json` + `triade/tsconfig.test.json` clean — `rn-stub`/`ignoreDeprecations` already landed via `cw:close` `DW-64`; no new `@ts-ignore` allowed outside that ring

### Risks to Plan

- **Risk**: Future margin/orientation edit moves band calc away from `getBandTop` or renames helper
  - **Impact**: Drift reopens DW-10; HUD chrome breaks in one orientation while bandTop/other pass
  - **Contingency**: `rg` gates (`getBandTop` 3 hits + `SAFE_MARGIN` 0 in App/Hud) run in PR; `tsc` fails on rename; `layout.test.ts:18` chrome pins catch swapped 96/48

---

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run). For this bundle the P0 ATDD already landed as finite pins in `layout.test.ts`; NaN/Inf guard pins (R-001 6-way) are the only gap left to materialize as host unit cases if not yet added via in-tree helper checks.
- Run `*automate` for broader coverage once implementation exists — implementation already exists (`a09e6ed`) so `*automate` would only add the 6-way NaN guard host units if absent in CI.
- A `*review` / `*nfr-assess` pass can be run once the `rg` gates and full `npm test` evidence are captured for this bundle.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: {name} Date: {date}
- [ ] Tech Lead: {name} Date: {date}
- [ ] QA Lead: {name} Date: {date}

**Comments:**

---

---



---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **`triade/src/ui/layout.ts`** (pure) | Bump: new export `getBandTop` + guard affects `layoutFor` only on non-finite inputs | `layout.test.ts` 18 pass must stay green; grep `Number.isFinite` 6-field early guard + `getBandTop` 1 export |
| **`triade/App.tsx`** (`AppContent`) | Band-top `insets.top + SAFE_MARGIN + bandHeight → getBandTop(insets, bandHeight)` for `content paddingTop`; no board-size wiring change | `App.tsx` `import getBandTop` + `bandTop = getBandTop(...)` 1 hit + no `SAFE_MARGIN` in App; full `npm test` still 857 pass / 10 EXPECTED RED + both `tsc` clean (no Hud/App regression needed) |
| **`triade/src/ui/Hud.tsx`** (`Hud` portrait + landscape) | Both `height: topPad + bandHeight → getBandTop(insets, bandHeight)`; `topPad/leftPad/rightPad` unchanged for `padding*` | `Hud.tsx` 2 `getBandTop` height hits + `SAFE_MARGIN` import now via `layout` (1 extra import hit); `ui.purity` + `ui.norolls` + `layout.test.ts` green proves no HUD scanning regression; visual parity via 96/48 pins |
| **`triade/src/ui/orientation.ts`** (`isLandscape`) | `layoutFor` delegates `width>height`; orientation byte-identical | `layout.test.ts [P1] isLandscape agrees` (4-case) stays green; single-call `isLandscape(` in `layout.ts` counted as regression guard |
| **`triade/__tests__/ui/layout.test.ts`** (18 tests) | Golden anchors `382/688/452` + `0-clamp 2000` + `96/48` + `finiteness` sweeps already pin finite math; no edit needed | `npm --prefix triade test -- __tests__/ui/layout.test.ts` 18 pass (pre/post guard identical for finite); `git diff --stat -- triade/src/engine` empty proves engine untouched |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework (1-9, ≥6 HIGH, 9 BLOCK, owner+deadline)
- `probability-impact.md` - Risk scoring 1-3×1-3→1-9, DOCUMENT/MONITOR/MITIGATE/BLOCK buckets
- `test-levels-framework.md` - Unit = pure `layoutFor`/`getBandTop` O(1); Integration = scanner `purity`/`norolls`; E2E = no gate (layout host-only)
- `test-priorities-matrix.md` - P0 blocks guard/dedup + high risk + no workaround; P1 core 96/48/isLandscape; P2 secondary floor/clipping; P3 exploratory rotation smoke

### Related Documents

- PRD: n/a (sweep bundle — deferred-work debt, not epic PRD)
- Epic: n/a (sweep bundle; deferred `DW-5`/`DW-10` from `sprint-status.yaml: epic-1 1-5-layout-portrait-e-landscape`)
- Architecture: `triade/src/ui/layout.ts` (pure), `triade/src/ui/orientation.ts` (single `isLandscape`), `triade/src/ui/Hud.tsx` / `triade/App.tsx` consumers, ledger `_bmad-output/implementation-artifacts/deferred-work.md`, spec `_bmad-output/implementation-artifacts/spec-layout-band-dedup-and-guard.md`
- Tech Spec: `triade/__tests__/ui/layout.test.ts:232` degenerate-clamp (must keep green, 0-clamp), `:189` finiteness sweep (finite inputs), `:1-60` layout source

---

**Generated by**: BMad TEA Agent - Test Architect Module (Murat)
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)

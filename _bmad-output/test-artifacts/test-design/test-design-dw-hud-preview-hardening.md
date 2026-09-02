---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/game/preview.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/ui/components/hud.test.ts'
  - 'triade/__tests__/ui/components/hud.previewWiring.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-hud-preview-hardening — Hud resilient to omitted/partial previews (DW-69)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep bundle deep-dive for `dw-hud-preview-hardening`
**Scope:** Targeted test design for the working-tree delta of `dw-hud-preview-hardening`

> **Delta under assessment:** Working-tree `git diff HEAD` vs `HEAD 4f674b4 → e329d35` (spec intent: DW-69 deferred-work robustness gap; no dedicated `spec-hud-preview-hardening.md` — contract is `deferred-work.md:DW-69` + `Hud.tsx` commit `4f674b4`). The sweep resolves DW-69 `open → done` with `resolution-undo: da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce` without engine/preview logic change (`git diff --stat -- triade/src/engine` empty, `triade/src/game/preview.ts` byte-identical):
> - `triade/src/ui/Hud.tsx:9` — adds `const FALLBACK_PREVIEW: Preview = { kind: 'range', values: [] }` singleton empty-window fallback
> - `triade/src/ui/Hud.tsx:23` — widens `HudProps.previews` from required `{ clean: Preview; accelerated: Preview }` to optional `previews?: { clean?: Preview; accelerated?: Preview }` (DW-69 hardening comment: backward compatible; current callers always provide)
> - `triade/src/ui/Hud.tsx:64-67` — guards `activePreview` as `(activeId === 'accelerated' ? previews?.accelerated : previews?.clean) ?? FALLBACK_PREVIEW` instead of unconditional `previews.accelerated/clean` (pre-fix threw `Cannot read properties of undefined`)
> - `triade/App.tsx:950-952` — unchanged fan-out `previews={{ clean: previewFor(game.pendingSpawn, availablePot), accelerated: previewFor(game.pendingSpawn, availablePot) }}` (still provides both lanes; hardening is defensive-only)
> - `deferred-work.md` DW-69 `status: done 2026-09-02` + `resolution: resolved by sweep bundle dw-hud-preview-hardening` + `resolution-undo` hash (this bundle); all other DW entries unchanged (`sprint-status.yaml` orchestrator-owned, never written)
> - `triade/__tests__/ui/components/hud.test.ts:8/16/24` + `hud.previewWiring.test.ts` — existing 8+9 wiring suites remain green; ad-hoc regression `Hud without previews / partial / null` 3/3 PASS recorded in `bmad-dev-auto-result-hud-preview-hardening.md`

---

## Executive Summary

**Scope:** Make `Hud` never-throw when `previews` prop is omitted or partial. Before the sweep, `Hud` accessed `previews.clean` / `previews.accelerated` unconditionally — any caller omitting the prop (or a future Epic 3 per-lane board wiring that supplies only one lane) threw at `Hud.tsx:66` and unmounted the HUD. The fix is a pure presentation-layer guard: an optional prop shape with `FALLBACK_PREVIEW = { kind: 'range', values: [] }` and `??` fallback, keeping the `activeLaneId` gate (`clean` default, `accelerated` when requested) and the existing `PreviewCard` defensive `displayOf` (already empty-string for `[]`). No engine draw budget, no preview 60/40, no pot ladder, no layout math changes.

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (≥6): 2
- Critical categories: TECH (silent fallback masking missing wiring), BUS (empty preview UX / a11y announcement with no value)

**Coverage Summary:**

- P0 scenarios: 7 groups (host unit + smoke — omitted/partial/null/partial-per-lane no-throw + score still rendered portrait/landscape, `activePreview` falls back to `FALLBACK_PREVIEW`, existing fan-out wiring still distinct, engine byte-identical)
- P1 scenarios: 6 groups (preview wiring `previewFor` → `Hud` still distinct lanes via `activeLaneId`, `PreviewCard` `[]` → `""` with frozen-safe display, a11y `Próxima (Clean): ` empty vs populated, portrait 76×76 / landscape 60×44 chrome preserved, `FALLBACK_PREVIEW` single-source)
- P2/P3 scenarios: 6 groups (static allowlists single `FALLBACK_PREVIEW` / `previews?` / `?? FALLBACK` + ledger `resolution-undo` hash + exploratory empty-vs-populated visual + mutation guard)
- **Total effort**: ~2.0–4.0 hours (~0.3–0.6 days; host-only, no device lane)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/spawn/score/move, `Board`/`PendingSpawn` shape, `spawnTile` mutation/alias, `pickIndex`/`weightedPicker` NaN/Infinity clamp, `GRID_SIZE 4x4` coupling, `mulberry32`/`oppositeEdgeCandidates`/`transitionPlan` wiring, `GameBoard` Skia rendering, `matchScore`/`haptics`/`feel` presets (`src/feel/*`)** | Engine is byte-identical (`git diff --stat -- triade/src/engine` empty) and pure; sweep only changes `Hud.tsx:9,23,64-67` presentation guard. No spawn distribution/position/timing change. | Engine invariants stay gated by 910 existing host tests + 10 expected-RED feel ATDD (unchanged) + `git diff` empty engine check in this plan. No engine logic re-derived. |
| **`previewFor` 60/40 `PREVIEW_EXACT_BOUNDARY` ULP, beyond-ladder `192` truth, frozen slices, `availablePot` fan-out, `FULL_POT_LADDER` derivation** | `triade/src/game/preview.ts` byte-identical (`git diff --stat -- triade/src/game/preview.ts` empty). Sweep consumes `Preview` type only via `FALLBACK_PREVIEW`; preview content hygiene is `dw-preview-boundary-hygiene` scope. | `preview.test.ts` 40/40 + `preview-invariant.test.ts` structural (no roll import, ladder from config, pure) remain gates; this plan only checks `Preview` shape reuse via `FALLBACK_PREVIEW`. |
| **`PreviewCard.tsx` layout/styling beyond `displayOf` empty-range handling** | Card renders verbatim `Preview` (`exact → value`, `range → join('/')`, `[] → ""`); styling 60×44/76×76 is layout concern, not preview content. `Hud` wiring is thin-view covered by `triade/__tests__/ui` integration. | Thin-view `preview.test` + `hud.test` + `previewWiring` structural guards remain gates; full `npm test` includes Hud smoke. |
| **`layout.ts` `getBandTop`/`SAFE_MARGIN`/`boardSize` clamp, `App.tsx` `availablePot` recompute** | Already hardened by `dw-layout-band-dedup-and-guard` + `dw-preview-boundary-hygiene`; this sweep leaves `layout.ts:31` and `App.tsx:852,915-952` untouched except re-checking `Hud` still receives `previews` fan-out. | `layout.test.ts` + `previewWiring` unavailable-pot fans stay green; this plan only verifies `App.tsx` still passes `previews` fan-out via `rg` scan. |
| **Benchmark/frame-rate both-profile, RevenueCat/AdMob/IAP, Epic 10-11 monetization** | Sweep is `<1 ms` pure TS O(1) helper (one `?.` + `??` branch per render), no native module; no `package.json` script change. | No new bench lane; host `npm test` stays `<15 min`, device baseline unchanged. Existing `feel.bench.test.ts` caps unchanged. |
| **Deferred-work ledger edits beyond DW-69 `open→done` with `resolution-undo: da2f401d…`** | Ledger lists 80+ entries; only 1 moves to `done` this sweep. | Other DW entries (e.g. `board shallow ref DW-81`, `pickIndex DW-71/76`, `candidates validation DW-72/73`) remain `open`/`already resolved` and are not re-triaged here. |
| **`sprint-status.yaml` orchestrator ownership** | Owned by orchestrator per prompt; never written by this workflow. | This plan never writes `sprint-status.yaml`; only `deferred-work.md` `resolution-undo` hash is checked. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `Hud` is a pure function component `(HudProps) → ReactTree` with no RNG, no `Math.random`, no engine imports. The guard is a single optional-prop branch `previews?.clean/?accelerated ?? FALLBACK_PREVIEW` driven by literal `{}` / `undefined` / `null` / `{clean: exact}` fixtures. `activeLaneId` (`clean` default, `accelerated` when explicit) is a string literal, no device/Skia. Host `node --import tsx --test` + `react-test-renderer` drives all cases without Expo dev build. `PreviewCard.displayOf` already normalizes `range [] → ""` and filters non-finite values.

**Observability — Good.** The failure mode is a thrown `TypeError: Cannot read properties of undefined (reading 'clean')` — now replaced by a rendered empty chip `""` inside 76×76/60×44 chrome with accessibility label `Próxima (Clean): ` (empty trailing). Host assertion `assert.doesNotThrow(() => renderHud({previews: undefined}))` plus `allText(renderer)` token scan (`hasToken(t,'123')` score present, `hasToken(t,'')` vs joined `/`) distinguishes populated vs fallback. `FALLBACK_PREVIEW` is a singleton object identity (`{kind:'range',values:[]}`) inspectable via source scan `rg -n FALLBACK_PREVIEW`.

**Reliability — Strong.** The guard is `previews?.field ?? FALLBACK_PREVIEW` (nullish coalescing, not `||`) so `null`/`undefined` lane values fall back while a valid `Preview` passes through unchanged. No mutation of `FALLBACK_PREVIEW.values` (empty array) is performed; `PreviewCard` reads `values` via `Array.isArray` + `filter(Number.isFinite)` + `join('/')` without mutation. `activeId` defaults to `'clean'` when `activeLaneId` omitted or invalid (`=== 'accelerated' ? 'accelerated' : 'clean'`). No `useEffect`/`setTimeout`/`Animated` introduced — no unmount leak.

**Testability Risks:** Two surfaces thin: (a) `FALLBACK_PREVIEW` singleton is `const {kind:'range', values: []}` with a mutable `[]` — a caller doing `activePreview.values.push(99)` would mutate the shared empty array and poison future fallback renders (no `Object.freeze` yet). Mitigated by P2 mutation guard + recommending `Object.freeze` in follow-on hardening. (b) Silent fallback masks missing wiring — a future `App.tsx` regression that stops passing `previews` would no longer throw, so the suite must positively assert that the *populated* path still renders distinct lane values (existing `hud.previewWiring` `clean 3 vs accelerated 6` distinct-value pin), not just that the empty path doesn't throw.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Silent fallback masks missing wiring — `Hud` no longer throws when `previews` omitted, so a future `App.tsx` fan-out regression (`previews` not passed or `undefined` leaked) renders an empty 76×76 chip (`""`) with no value and no error, hiding a wiring bug that previously failed loud.** The prior `previews.clean` unconditional access threw immediately; the new `previews?.clean ?? FALLBACK_PREVIEW` silently succeeds. `PreviewCard` renders `""` for `range []`, border chrome stays but value is invisible. Production still passes `previews` today, but Epic 3 per-lane board differentiation could introduce a conditional path that omits one lane. | 2 | 3 | **6** | Keep `FALLBACK_PREVIEW` guard as landed (`Hud.tsx:9,64-67` `previews?.field ?? FALLBACK_PREVIEW`). Gate by dual assertions: (a) omitted/partial/null previews do NOT throw and still render `score`/`Recorde` (proves never-throw), AND (b) populated `previews: {clean: exact 3, accelerated: range ...}` still renders distinct lane values via `activeLaneId` gate (proves wiring not masked). Existing `hud.previewWiring` distinct-value pins (`clean 3` vs `accelerated 6`, `F-4` activeLaneId gate) stay green; new P0 `previews: undefined / {clean: exact} / null` no-throw pins added. Never assert only the empty path — always pair with populated-path distinctness. |
| R-002 | BUS | **`FALLBACK_PREVIEW` empty `range []` renders as `""` with a11y label `Próxima (Clean): ` (trailing empty) — user sees an empty HUD chip with border but no value, and VoiceOver announces an incomplete phrase.** `PreviewCard.displayOf` for `range []` is `""` (filtered-empty → `""`), so the chip has correct chrome (76×76 portrait, 60×44 landscape) but no numeric content. The `accessibilityLabel` is `Próxima (Clean): ` with trailing space, not `Próxima (Clean): 3` or similar. This is reachable only when `previews` is omitted/partial — defensive path — but the empty state is user-visible and not covered by existing populated-preview tests. | 2 | 3 | **6** | Keep `FALLBACK_PREVIEW = { kind: 'range', values: [] }` as landed (empty window is the least-lying fallback; any made-up `[1,2]` would lie about spawn). Gate: `renderHud({previews: undefined})` still renders `score` + `Clean` label + empty `""` (no value token) but no throw; `PreviewCard` for `range []` is `""`; a11y `Próxima (Clean): ` still present (no crash). For Epic 7 follow-up, decide whether empty fallback should render a placeholder like `—` vs empty; until then empty is accepted as defensive. P0 pins verify no throw + score preserved; P1 pins verify `displayOf([]) === ""` via source + rendered label still gated. |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | TECH | **`activePreview` lane selection regression — `activeId === 'accelerated' ? previews?.accelerated : previews?.clean` swapped or missing `?.` re-introduces throw on partial object.** Example partial `previews: {clean: exact 3}` with `activeLaneId='accelerated'` must fall back to `FALLBACK_PREVIEW`, not throw `previews.accelerated` access nor silently show `clean` value under `Accelerated` label. Swapped branch would show `clean 3` under `Accelerated` label. | 2 | 2 | 4 | Keep guard as landed `previews?.accelerated / previews?.clean ?? FALLBACK_PREVIEW` with `activeId` default `'clean'`. Gate: `renderHud({previews:{clean: exact 3}, activeLaneId:'accelerated'})` renders `Accelerated` label + empty `""` (no `3` token), while `activeLaneId:'clean'` renders `Clean` + `3`. Existing `hud.test` `F-4` activeLaneId gate + new partial-per-lane P0 pins. |
| R-004 | TECH | **`FALLBACK_PREVIEW.values` mutable singleton — `const {values: []}` array is shared and mutable, so a caller `activePreview.values.push(99)` would corrupt future fallback renders (all subsequent omissions would show `99`).** No `Object.freeze` on the fallback yet; `PreviewCard` reads via `filter` but does not freeze input. | 1 | 3 | 3 | Monitor — keep singleton as landed; add `Object.freeze(FALLBACK_PREVIEW)` + `Object.freeze(FALLBACK_PREVIEW.values)` in follow-on hardening (trivial, no behavior change today). Gate: host `activePreview.values.push(99)` either throws (if frozen) or is flagged by `Object.isFrozen` scan; existing suites still pass because no caller mutates. |
| R-005 | TECH | **`previews` prop shape allows `null` (not just `undefined`) — future caller passing `previews={null}` must also not throw.** `?.` handles both, but a strict `previews.clean` without `?.` would throw on `null`. P0 `null` pin proves `previews?.` not `previews.` is used. | 1 | 3 | 3 | Keep `previews?.` optional chaining as landed. Gate: `renderHud({previews: null})` + `renderHud({previews: {clean: null}})` no throw, score preserved. |
| R-006 | TECH | **Type widening drift — `previews?` + `clean?`/`accelerated?` literals scattered outside `Hud.tsx:9,23,64` could re-introduce required shape.** `Preview` import stays `triade/src/game/preview.ts`; only `Hud.tsx` should define `FALLBACK_PREVIEW` and `previews?`. | 1 | 2 | 2 | Keep `FALLBACK_PREVIEW` + `previews?: {clean?: Preview; accelerated?: Preview}` single-source as landed. Gate: `rg -n "FALLBACK_PREVIEW" triade/src/ui/Hud.tsx ==2` (def + use) + `rg -n "previews\\?" triade/src/ui/Hud.tsx ==1` (only interface definition). |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-007 | OPS | **Deferred-work ledger `resolution-undo` hash coupling — DW-69 `open→done` carries 64-hex `da2f401d…` on this bundle; orchestrator's `sprint-status.yaml` is orchestrator-owned.** A follow-on sweep reopening without hash loses revert trail; writing `sprint-status.yaml` violates bookkeeping. | 1 | 2 | 2 | Monitor — ledger already records `resolution-undo: da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce` per entry; any reopen preserves it. This plan never writes `sprint-status.yaml`. |
| R-008 | DATA | **`score`/`best` still rendered when fallback active — `Hud` HUD chrome (score + Recorde) must not be suppressed by missing previews.** Before sweep, a throw prevented score render; after sweep score must stay visible. | 1 | 2 | 2 | Monitor — gate via `allText(renderer)` `hasToken(t,'123')` score + `Recorde` label present even when `previews` omitted (P0). |
| R-009 | PERF | **Micro overhead of `?.` + `??` per `Hud` render (one branch).** No `useEffect`/`Animated`, O(1) destructure only. | 1 | 1 | 1 | Monitor — no bench lane; verify host `node --import tsx` micro-bench unchanged (already `<0.05ms` for feel helpers). |

### Risk Category Legend

- **TECH**: Technical/Architecture (optional-prop guard, `?.`/`??` branch, `FALLBACK_PREVIEW` singleton, type widening)
- **SEC**: Security — none this sweep (no auth/data exposure; Hud is pure presentation)
- **PERF**: Performance — `Hud` O(1) branch `<1ms` (R-009)
- **DATA**: Data Integrity — score still rendered when fallback active (R-008)
- **BUS**: Business Impact — empty preview UX / a11y incomplete announcement (R-002)
- **OPS**: Operations (ledger `resolution-undo`, `sprint-status.yaml` ownership R-007)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-hud-preview-hardening` touches the **HUD presentation seam only**: **reliability (never-throw on omitted/partial previews)**, **maintainability (single `FALLBACK_PREVIEW` + single `previews?` guard + `resolution-undo` hash)**, **60 FPS/never-throw budget unchanged** (one `?.`/`??` per render), and **offline/installability** unchanged (pure TS, no native module).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — never-throw + HUD chrome preserved | `Hud({score,best,insets,bandHeight})` with `previews: undefined \| null \| {} \| {clean: Preview}` and either `isLandscape` renders without throwing; `score` + `Recorde` + `Clean`/`Accelerated` label + portrait 76×76 / landscape 60×44 chrome still present; active lane fallback is `FALLBACK_PREVIEW` not throw. | R-001, R-003, R-005, R-008 | Unit host: `hud.test.ts` nominal + new omitted/partial/null no-throw pins + `hud.previewWiring.test.ts` distinct-lane wiring + ad-hoc `Hud renders without previews (portrait/landscape), partial, null → 3/3 PASS` manual probe | `triade/__tests__/ui/components/hud.test.ts` + `hud.previewWiring.test.ts` 8+9 passing + ad-hoc 3/3 PASS log in `bmad-dev-auto-result-hud-preview-hardening.md` + `npm --prefix triade test -- __tests__/ui/components/hud` full gate green + `npx tsc --noEmit` both tsconfigs clean |
| Maintainability | Single `FALLBACK_PREVIEW: Preview = {kind:'range', values:[]}` (not scattered `[]` literals), single `previews?: {clean?: Preview; accelerated?: Preview}` (not re-typed elsewhere), single `?? FALLBACK_PREVIEW` site `Hud.tsx:67`, single `Preview` import from `../game/preview.ts`; `resolution-undo` 64-hex hash per resolved DW entry; `App.tsx` fan-out `previews={{clean: previewFor(...), accelerated: previewFor(...)}}` unchanged. | R-004, R-006, R-007 | Static-assert: `rg -n "FALLBACK_PREVIEW" triade/src/ui/Hud.tsx ==2` + `rg -n "previews\\?" triade/src/ui/Hud.tsx ==1` + `rg -n "\\?\\? FALLBACK_PREVIEW" triade/src/ui/Hud.tsx ==1` + `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` `==2` lines for DW-69 | Source scan + `Hud.tsx` diff + ledger diff; follow-on hardens `Object.freeze(FALLBACK_PREVIEW)` |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn`, frame worst `<8 ms`, device `p99 <16.7 ms`. Hud guard adds `<1 ms` per render (one `?.` + `??` branch, no `setTimeout`/`Animated`). No new worklet, no `Math.random`. | R-009 | Host micro-bench `10k× Hud` via `react-test-renderer` median `<0.05 ms` optional (already in budget) or rely on CI `npm test` timing. | CI `npm test` timing + `feel.bench.test.ts` median/p99 unchanged + `npx tsc --noEmit` clean |
| Compliance — thin-view + never-throw | Hud is `View` + `Text` + `PreviewCard` chrome only; no animation/transform/Animated props per UX-DR-8; `previews` optional keeps thin-view boundary (orchestrator owns board, Hud owns score/preview chrome). | R-006 | Structural: `stripCommentsAndStrings(Hud.tsx)` contains no `Animated` / `withSequence` import beyond `PauseButton` already; `extractNamedImports` shows only `Preview` from `../game/preview.ts`. | `preview-invariant.test.ts` structural suite complement + `rg -n "FALLBACK_PREVIEW" triade/src/ui/Hud.tsx` scan + `tsc` clean |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (Hud pure TS, orchestrator wiring only). | — | `npm --prefix triade test` offline (no network) still `≈910 pass` + 10 expected RED. | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. `FALLBACK_PREVIEW = {kind:'range', values:[]}` empty-window is a content choice, not a metric threshold; `<1 ms` Hud guard cost is observed, not invented; ledger `resolution-undo da2f401d…` is evidence hash, not threshold. If Epic 3 later chooses a populated fallback (e.g. `range [1,2]`) or `Object.freeze` variant, record its new `rg` counts as baseline rather than inventing a threshold.

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (deferred-work DW-69 intent/boundaries signed — `Hud` throws when `previews` omitted, guard with empty preview; `triade/src/engine` + `triade/src/game/preview.ts` byte-identical contract)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsconfig.test.json` + `node:assert/strict` + `react-test-renderer`; working-tree on `4f674b4` + `e329d35` package-lock sync)
- [ ] Test data available or factories ready (`Preview` literals `exact {value}` / `range {values}` + `FALLBACK_PREVIEW {range, []}` + `insets {top,left,right,bottom}` + `bandHeight` + portrait/landscape + `activeLaneId` clean/accelerated)
- [ ] Feature deployed to test environment (working-tree `Hud.tsx:9,23,64-67` patched; `git diff --stat -- triade/src/engine` empty and `triade/src/game/preview.ts` empty verified)
- [ ] No engine edits beyond `Hud.tsx` presentation guard and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (omitted `previews` no-throw + partial `clean` only with both `activeLaneId` branches + `null` previews + score still rendered portrait/landscape + engine byte-identical — host)
- [ ] All P1 tests passing (or failures triaged with waivers) — distinct lane wiring still `clean 3 vs accelerated 6`, `PreviewCard [] → ""` frozen-safe, a11y label still `Próxima`, chrome 76×76/60×44 preserved
- [ ] No open high-priority / high-severity bugs (R-001 silent fallback + R-002 empty UX green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on Hud guard seam; `rg` allowlists for single `FALLBACK_PREVIEW`/`previews?`/`?? FALLBACK` green)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (both hit via `npx tsc` probes below)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw vs silent fallback, single `FALLBACK_PREVIEW`, thin-view)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns omitted/partial/null no-throw + distinct-lane wiring + `FALLBACK_PREVIEW` singleton + `rg` allowlists, ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `Hud.tsx:9,23,64-67` optional-prop guard + `FALLBACK_PREVIEW` choice, `PreviewCard` `[] → ""` defensive display, `App.tsx` fan-out preserve |
| PM | PM | Signs empty fallback `[ ] → ""` UX choice (silent empty vs placeholder `—`) + accepts silent fallback over throw for future Epic 3 per-lane wiring |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit + smoke, already green on `4f674b4` + `bmad-dev-auto-result-hud-preview-hardening.md` 3/3 PASS

**Criteria**: Blocks HUD crash (throw) + high risk (≥6) + no workaround (any caller omitting `previews` today throws and unmounts HUD)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC1 — Omitted `previews` no-throw portrait: `renderHud({previews: undefined})` and `renderHud({})` (prop omitted entirely) render without throwing, `score` `123` + `Recorde 456` still present, `Clean` label present (default), 76×76 chrome present, `PreviewCard` shows `""` (empty) not `3` | Unit (react-test-renderer) | R-001, R-002 | 1 | QA (done) | `Hud.tsx:23,66-67` `previews?:` + `?.`/`?? FALLBACK` guard. Probe: `assert.doesNotThrow(() => renderHud({previews: undefined}))` + `allText` `hasToken('123')` + `hasStyle({width:76,height:76})` + no value token `3`. |
| AC2 — Omitted `previews` no-throw landscape: `renderHud({isLandscape:true, previews: undefined})` same as portrait but with `minWidth:60,height:44` band | Unit | R-001 | 1 | QA (done) | Landscape band `triade/src/ui/Hud.tsx:74-115` shares same guard; verify compact chrome still `minWidth:60,height:44` when fallback active. |
| AC3 — Partial `previews: {clean: exact 3}` with `activeLaneId='clean'` renders `Clean` + `3`, with `activeLaneId='accelerated'` renders `Accelerated` + empty `""` (fallback) not `3` | Unit | R-001, R-003 | 2 | QA (done) | Branch `previews?.accelerated : previews?.clean` must not swap. `activeId='clean'` → `previews?.clean ?? FALLBACK` shows `3`; `activeId='accelerated'` → `previews?.accelerated ?? FALLBACK` shows `""` with label `Accelerated`. |
| AC4 — `previews: null` and `previews: {clean: null}` no-throw (nullish path via `?.`) | Unit | R-005 | 1 | QA | `previews?.field` handles `null`; `assert.doesNotThrow(() => renderHud({previews: null}))` + score still `123`. |
| AC5 — Score/best preserved when fallback active: `score 0 / best 0` + `previews: undefined` renders `0` tokens + `Recorde` label (proves HUD chrome not suppressed) | Unit | R-008 | 1 | QA | Existing `Hud renders without throwing for zero score/best` + new `previews: undefined` variant; `hasToken('0')` count ≥1. |
| AC6 — Engine byte-identical: `git diff --stat -- triade/src/engine` empty and `triade/src/game/preview.ts` empty (no spawn/merge/tier change) | Static scan | R-001..R-009 | 1 | QA (done) | `Hud.tsx` only presentation; full suite `≈910 pass / 10 expected RED` unchanged, `npx tsc --noEmit` clean. |

**Total P0**: 7 checks (host unit + 1 `rg` gate for engine empty), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & display semantics

**Criteria**: Important `Hud`→`PreviewCard` wiring + medium/high risk + common `exact`/`range`/lane flows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Distinct lane wiring still `clean 3` vs `accelerated 6` via `activeLaneId` — proves silent fallback did not mask missing wiring: `previews: {clean: exact 3, accelerated: range [3,6,12]}` + `activeLaneId='clean'` shows `Clean + 3` not `3/6/12`, `activeLaneId='accelerated'` shows `Accelerated + 3/6/12` not `3` | Unit | R-001, R-003 | 1 | QA | Reuse existing `hud.test.ts: F-4` activeLaneId gate + `hud.previewWiring.test.ts` `previewFor` → distinct values `clean 3 / accelerated 6` pin; must stay green. |
| `PreviewCard` empty `range [] → ""` display + `Object.isFrozen` guard: `displayOf({kind:'range', values: []}) === ""` and `activePreview` fallback still `Object.isFrozen` safe (future `Object.freeze` lands but gate checks current `[]` empty) | Unit | R-002, R-004 | 1 | QA | `PreviewCard.tsx:14-22` `values.filter(Number.isFinite).join('/')` on `[]` → `""`; `announcement` `Próxima (Clean): ` trailing empty. Host pin `displayOf(FALLBACK) === ""`. |
| `activePreview` single-source — no duplicate `previews.clean` literal outside `Hud.tsx:66-67` guard; `FALLBACK_PREVIEW` single definition | Static scan | R-006 | 1 | QA | `rg -n "FALLBACK_PREVIEW" triade/src/ui/Hud.tsx ==2` (def + use) + `rg -n "previews\\?" triade/src/ui/Hud.tsx ==1` + `rg -n "\\?\\? FALLBACK" triade/src/ui/Hud.tsx ==1`. Any second literal outside is FAIL. |
| Portrait 76×76 / landscape 60×44 chrome preserved when fallback active (same chrome as populated) | Unit | R-002 | 1 | QA | `hasStyle({width:76,height:76})` portrait vs `hasStyle({minWidth:60,height:44})` landscape still green when `previews: undefined`. |
| `App.tsx` fan-out still provides both lanes `previews={{clean: previewFor(...), accelerated: previewFor(...)}}` unchanged (no caller regressed to `previewFor` single-arg without `availablePot`) | Static scan | R-001 | 1 | QA | `rg -n "previews=\\{\\{" triade/App.tsx ==1` + `rg -n "previewFor\\(game.pendingSpawn" triade/App.tsx ==2` (both lanes). Any `previewFor` without `availablePot` is stale. |
| `FALLBACK_PREVIEW` mutable singleton guard — `Object.isFrozen(FALLBACK_PREVIEW)` or `FALLBACK_PREVIEW.values` mutation either throws or is flagged | Static/host scan | R-004 | 1 | QA | Current `FALLBACK_PREVIEW` not frozen; gate recommends freezing. Host probe `() => { activePreview.values.push(99) }` either throws (future frozen) or `Object.isFrozen(FALLBACK_PREVIEW.values)` documented as gap. |

**Total P1**: 6 checks, ~0.4–0.8 h host (mostly existing `hud*` suites, 1 new null/mutation pin)

### P2 (Medium) — Secondary flows + low/medium risk

**Criteria**: Secondary glue + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-constant / single-freeze allowlists — `FALLBACK_PREVIEW` `==2`, `previews?` `==1`, `?? FALLBACK` `==1` in `Hud.tsx:1` scope; no stray `previews.clean` without `?.` outside guard | Static scan | R-006 | 1 | QA | `rg -n "FALLBACK_PREVIEW" triade/src/ui/Hud.tsx ==2` + `rg -n "previews\\?" triade/src/ui/Hud.tsx ==1` + `rg -n "previews\\." triade/src/ui/Hud.tsx` must equal the single `previews?.` hit (no bare `previews.`) |
| Ledger `resolution-undo` hash — DW-69 `open→done` carries 64-hex `da2f401d…` | Static scan | R-007 | 1 | QA | `rg -n "da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce" _bmad-output/implementation-artifacts/deferred-work.md` `==2` (status+resolution lines) + `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` counts ledger health. |
| Type allowlist — `Preview` imported only from `../game/preview.ts` (no `any` widening) | Static scan | R-006 | 1 | QA | `rg -n "from '../game/preview" triade/src/ui/Hud.tsx ==1` + `npx tsc --noEmit` clean proves optional shape not widened to `any`. |
| Empty vs populated visual complement — `rg -n "export type.*Preview" triade/src/ui/Hud.tsx` empty (no re-export pollution) | Static scan | R-002 | 1 | QA | `Hud.tsx:5` `import type {Preview}` only, no `export type Preview` duplication. |

**Total P2**: 4 checks, ~0.2–0.4 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — empty chip visual: manual `Expo Go` snapshot `Hud` with `previews: undefined` shows bordered empty 76×76 (portrait) with `Recorde` and `123` still legible, no yellowbox | Host visual exploratory | 1 | QA | No assertion beyond no-throw; if empty chip looks broken, file placeholder `—` design follow-up. |
| Micro-bench — `Hud` guard overhead `10k× renderHud undefined/previews` median `<0.05 ms` (extendable via `feel.bench.test.ts` both-profile) | Unit (bench) | 1 | DEV | `Hud` is one `?.`/`??` branch; `feel.bench.test.ts` budget `median <0.05 / p99 <0.1` not exceeded. Not a new lane, just CI `npm test` timing. |
| Cross-cutting negative — `rg -n "previews\.clean" triade/src/ui/Hud.tsx` should be `==0` (only `previews?.clean`), proves no bare access reintroduced | Static scan | 1 | QA | If a bare `previews.clean` reappears outside comment, file a patch before merge. |

**Total P3**: 3 checks, ~0.2–0.3 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch `Hud` import/TS regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/ui/components/hud.test.ts __tests__/ui/components/hud.previewWiring.test.ts` — both green including populated `exact 3 / range 3/6/12` + `F-4 activeLaneId` gate (`<2 s`)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore` / no `Preview` import miss)

**Total**: 2 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical hardening fail-fast (host only)

- [ ] Omitted `renderHud({previews: undefined})` + `renderHud({})` no-throw + `hasToken 123` + `Recorde` + default `Clean` + 76×76 chrome
- [ ] Omitted landscape `isLandscape:true` same + `minWidth:60,height:44` chrome
- [ ] Partial `previews: {clean: exact 3}` with `activeLaneId='clean' → 3` and `accelerated → ""` empty (no swap, no throw)
- [ ] `previews: null` and `previews: {clean: null}` no-throw via `?.`
- [ ] `git diff --stat -- triade/src/engine` empty + `triade/src/game/preview.ts` empty + full suite `≈910 pass / 10 expected RED` unchanged

**Total**: 5 P0 groups (already passing at `4f674b4`; `rg` gates are static)

### P1 Tests (<30 min)

**Purpose**: Wiring + semantics

- [ ] Distinct `clean 3` vs `accelerated 6` still distinct via `activeLaneId` (`hud.previewWiring` `F-4` still green)
- [ ] `PreviewCard` `range [] → ""` + `Próxima (Clean): ` label still `accessibilityLabel` present
- [ ] Chrome 76×76 / 60×44 still present when fallback active
- [ ] `App.tsx` fan-out `previewFor(pending, availablePot)` `==2` + `previews={{` `==1`
- [ ] `FALLBACK_PREVIEW` single-source `==2` + `previews?` `==1` + `?? FALLBACK` `==1`

**Total**: 5 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Scans, doc, exploratory

- [ ] Single-constant allowlists `FALLBACK_PREVIEW==2` / `previews?==1` / bare `previews.clean ==0` + ledger `resolution-undo 1 hit →2 lines` scan (`<1 s`)
- [ ] Empty visual exploratory + micro-bench `10k× <0.05ms` (`<2 min`)

**Total**: 4 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 7 | ~0.15 | ~0.8–1.2 | Pure `hud.test` omitted/partial/null no-throw + `rg` engine-empty already green (done in `4f674b4`) |
| P1 | 6 | ~0.25 | ~1.0–1.6 | Distinct-lane wiring + `PreviewCard []` display + chrome + `App` fan-out — mostly existing suites, 1 new null/mutation pin |
| P2 | 4 | ~0.15 | ~0.4–0.6 | Single-constant / freeze-site / ledger `resolution-undo` scans |
| P3 | 3 | ~0.15 | ~0.3–0.5 | Empty-chip exploratory + `10k×` micro-bench + cross-cutting negative |
| **Total** | **20** | **-** | **~2.5–3.9** | **~0.3–0.6 days host; no device lane — pure host TypeScript + react-test-renderer** |

### Prerequisites

**Test Data:**

- `Preview` literals `exact {value}` / `range {values:[]}` + `FALLBACK_PREVIEW {range, []}` + `insets {top,left,right,bottom}` + `bandHeight 40` + `score 123 / best 456` + `isLandscape` portrait/landscape + `activeLaneId` clean/accelerated
- `rg` allowlist strings: `"FALLBACK_PREVIEW"` / `"previews\\?"` / `"\\?\\? FALLBACK"` / `"da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce"`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `react-test-renderer` + `React.act` for `Hud` unit (already in `hud.test.ts`)
- `rg` (ripgrep) for allowlist scans (FALLBACK_PREVIEW, previews?, ?? FALLBACK, resolution-undo)
- `npx tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 20+ (no Expo dev build needed — `Hud.tsx` pure TS + RN stub, host-inspectable)
- Working tree on `4f674b4` hardening + `e329d35` package-lock sync; `triade/src/engine` byte-identical guard

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths** (omitted/partial/null no-throw + score preserved + `activePreview` fallback): ≥80%
- **Wiring seam** (`Hud` `previews` → `PreviewCard` + `activeLaneId` + `FALLBACK_PREVIEW` + `App` fan-out): 100%
- **Edge cases** (partial `clean` only vs `accelerated` only, `null`, default `activeLaneId`): ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (omitted `previews` no-throw portrait/landscape + partial `clean` only both `activeLaneId` branches + `null` no-throw + score `123` + `Recorde` + engine empty)
- [ ] No high-risk (≥6) items unmitigated (R-001 silent fallback + R-002 empty UX green or waived with placeholder `—` design)
- [ ] No bare `previews.clean` / `previews.accelerated` without `?.` and exactly one `FALLBACK_PREVIEW` definition + one `?? FALLBACK_PREVIEW` site in `Hud.tsx:1`
- [ ] `npx tsc --noEmit` clean on both `triade/tsconfig.json` and `triade/tsconfig.test.json`
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw vs silent fallback, single `FALLBACK_PREVIEW`, thin-view)

---

## Mitigation Plans

### R-001: Silent fallback masks missing wiring (Score: 6)

**Mitigation Strategy:**
1. Keep `FALLBACK_PREVIEW` guard as landed (`Hud.tsx:9` singleton + `Hud.tsx:66-67` `previews?.clean/?accelerated ?? FALLBACK_PREVIEW`) — `123` score + `Recorde` still render when fallback active, no throw.
2. Never assert only the empty path — always pair omitted/partial pins with populated distinct-lane pins: `previews: {clean: exact 3, accelerated: range ...}` + `activeLaneId='clean' → Clean 3` and `activeLaneId='accelerated' → Accelerated 3/6/12` distinctness (existing `F-4` gate). A future `App.tsx` omission would then be caught by the populated-path failure, not masked by the empty-path success.
3. Probe manually: `node --import tsx -e "import React from 'react'; import {act} from 'react'; import TestRenderer from 'react-test-renderer'; import {Hud} from './triade/src/ui/Hud.tsx'; let r; act(()=>{r=TestRenderer.create(React.createElement(Hud,{score:123,best:456,isLandscape:false,insets:{top:10,left:10,right:10,bottom:10},bandHeight:40}))}); console.log(r.root.findAll(n=>n.type==='Text').map(n=>n.props.children))"` must include `123` + `Recorde` + `Clean` with no throw.

**Owner:** FE lead
**Timeline:** Immediate (gate this bundle)
**Status:** Planned
**Verification:** `npm --prefix triade test -- __tests__/ui/components/hud.test.ts __tests__/ui/components/hud.previewWiring.test.ts` 17/17 green including omitted/partial + distinct-lane wiring + `npx tsc --noEmit` clean + `rg -n "FALLBACK_PREVIEW" triade/src/ui/Hud.tsx ==2` + `rg -n "previews\\?" triade/src/ui/Hud.tsx ==1`.

### R-002: Empty `range []` renders as `""` with incomplete a11y label (Score: 6)

**Mitigation Strategy:**
1. Keep `FALLBACK_PREVIEW = { kind: 'range', values: [] }` as landed — empty window is least-lying (any `[1,2]` lie about spawn); `PreviewCard.displayOf` `range [] → ""` is already defensive (`filter(Number.isFinite).join('/')` → `""`, no throw, no `undefined` literal).
2. Accept empty chip today (border 76×76/60×44 + `Próxima (Clean): ` with trailing empty). For Epic 7 follow-up, propose placeholder `—` inside `displayOf` for `length===0` → `"—"`; keep fallback as `range []` and change only `PreviewCard` display, not `Hud` guard.
3. Manual VoiceOver check on iOS: `Hud({previews: undefined})` accessibility tree label is `Próxima (Clean): ` not missing; score `123` still announced via `scoreLandscape/scorePortrait` `Text`.

**Owner:** FE + UX
**Timeline:** Immediate (empty accepted; placeholder `—` deferred to Epic 7)
**Status:** Planned
**Verification:** Host `renderHud({previews: undefined})` `allText` has no value token `3`/`6` but has `Clean` + `123` + `Recorde`; `PreviewCard` for `range []` host `displayOf === ""`; `rg -n "FALLBACK_PREVIEW" triade/src/ui/Hud.tsx ==2`.

### R-003: `activePreview` lane selection swap on partial object (Score: 4)

**Mitigation Strategy:**
1. Keep `activeId === 'accelerated' ? previews?.accelerated : previews?.clean) ?? FALLBACK_PREVIEW` order as landed (`Hud.tsx:66-67`) with `activeId` default `clean` when `activeLaneId` omitted/invalid.
2. Pin both directions: `previews: {clean: exact 3}` + `activeLaneId='clean'` shows `Clean + 3 + no Accelerated`, `activeLaneId='accelerated'` shows `Accelerated + "" + no Clean`.
3. Any future swap would be caught by the `hasToken(t,'Accelerated')` exclusive assertions in `hud.test.ts:F-4`.

**Owner:** FE
**Timeline:** Immediate
**Status:** Planned
**Verification:** `npm --prefix triade test -- __tests__/ui/components/hud.test.ts` `F-4` activeLaneId gate green + new partial-per-lane P0 2 checks + `rg -n "\\?\\? FALLBACK" triade/src/ui/Hud.tsx ==1`.

---

## Assumptions and Dependencies

### Assumptions

1. `Hud` is presentation-only — no engine draw budget, no `Math.random`, no `pickIndex`/`weightedPicker` imports; `FALLBACK_PREVIEW` is a static singleton, not derived from `potForTier`/`ceilingDetector`. Any future engine roll import into `Hud.tsx` is a defect.
2. No production `Hud.tsx` path outside `FALLBACK_PREVIEW` returns a mutable array that is shared across renders — `FALLBACK_PREVIEW.values` is `[]` empty singleton; assumption checked by P1 mutation probe (`push(99)`).
3. `activeLaneId === 'accelerated'` exact match else `clean` default is intentional (3.2 Clean lane purity); omitting `activeLaneId` defaults to `Clean`, not `Accelerated` — pinned by `Hud fallback when activeLaneId omitted renders Clean`.
4. `App.tsx` still fanned `previews: {clean: previewFor(pending, availablePot), accelerated: previewFor(pending, availablePot)}` at `App.tsx:950` — hardening is defensive-only; if Epic 3 later differentiates per-lane boards, `App.tsx` will supply distinct `clean`/`accelerated` values, not omit one lane.
5. `npx tsc --noEmit -p tsconfig.test.json` baseline remains clean after `previews?` optional widening (no circular import via `Preview` type leaf).
6. `PreviewCard` `range [] → ""` empty is accepted UX today; a placeholder `—` would be `PreviewCard` display change only, not `Hud` guard change.

### Dependencies

1. `triade/tsconfig.json` + `triade/tsconfig.test.json` — Required by host `npm test` (`TSX_TSCONFIG_PATH`) and `npx tsc --noEmit` gates. Status: Ready.
2. `triade/src/ui/Hud.tsx:9,23,64-67` optional-prop guard + `FALLBACK_PREVIEW` — Required before P0 gates. Status: Done (`4f674b4`).
3. `triade/src/ui/PreviewCard.tsx:14-22` `displayOf` defensive `[] → ""` + `filter(Number.isFinite)` — Required for empty fallback rendering. Status: Ready (pre-existing).
4. `triade/__tests__/ui/components/hud.test.ts` + `hud.previewWiring.test.ts` 17 tests including `exact 3 / range 3/6/12` + `F-4` activeLaneId gate — Required for P0/P1 wiring gates. Status: Done (working-tree, additional omitted/partial/null pins extend coverage).
5. `triade/App.tsx:950-952` fan-out wiring `previews` — Required for `rg` wiring scan. Status: Ready (read-only).
6. `deferred-work.md` ledger with `resolution-undo: da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce` for DW-69 — Required for P2 ledger verification. Status: Done (working-tree `git diff HEAD` `1` entry with 2 lines).

### Risks to Plan

- **Risk**: Epic 3 per-lane board differentiation introduces distinct `previews.clean` / `previews.accelerated` values but `App.tsx` omits one lane on a race (e.g. `clean` pending not yet resolved when `accelerated` already).
  - **Impact**: `Hud` would show empty chip for the missing lane (silent fallback) rather than throwing — wiring bug hidden until visual QA catches empty chip.
  - **Contingency**: Treat per-lane wiring as atomic `previewFor(cleanPending, cleanAvailablePot)` + `previewFor(accPending, accAvailablePot)` commit; add `App.tsx` `previews` exhaustive `clean && accelerated` non-null assertion in that epic's test wiring.

- **Risk**: `FALLBACK_PREVIEW.values` mutated by a future caller `push`.
  - **Impact**: Shared `[]` singleton polluted with `99`, all subsequent fallback renders show `99`.
  - **Contingency**: Harden to `Object.freeze(FALLBACK_PREVIEW)` + `Object.freeze(FALLBACK_PREVIEW.values)` atomically; existing `Object.isFrozen` gate will then require frozen.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing omitted/partial/null no-throw pin templates for any future `Hud` prop widening — separate workflow; not auto-run.
- Run `*automate` for broader `Hud` host coverage once Epic 8 feel chrome stabilizes.
- Run `*nfr-assess` after implementation evidence (Hud host runs) to validate NFR planning without inventing thresholds; run `*test-review` for adversarial review of the new guard.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: ______________________ Date: __________
- [ ] Tech Lead: ______________________ Date: __________
- [ ] QA Lead: ______________________ Date: __________

**Comments:**

---

---



---
---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **UI `src/ui/Hud.tsx:9,23,64-67` `FALLBACK_PREVIEW` + `previews?` + `previews?.field ?? FALLBACK` + `activePreview` selection + 76×76/60×44 chrome + 3.2 `activeLaneId` gate** | Hardening-only: makes optional prop safe, no layout math change, no animation, no new dependency. | `hud.test.ts` 8/8 + `hud.previewWiring.test.ts` 9/9 + `previewCard` display must stay green; `npm test` `≈910 pass / 10 expected RED` unchanged; portrait/landscape `hasStyle` gates green |
| **UI `src/ui/PreviewCard.tsx:14-22` `displayOf(preview): string` (`exact → value`, `range → join('/')`, `[] → ""`, `filter Number.isFinite`)** | Defensive display for `FALLBACK_PREVIEW {range, []}` → `""` (no `undefined` literal, no throw). | `previewCard.test.ts` + `hud*` wiring suites must stay green; `""` empty still carries `accessibilityLabel Próx­ima (Clean): ` no crash |
| **Orchestrator `App.tsx:915-952` `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` fan-out to `clean/accelerated` `previewFor(..., availablePot)`** | Unchanged fan-out (still provides both lanes); hardening is Hud-only defensive. | `previewWiring` low-ceiling `[3]` collapsed + rising `3→[3,6]→[3,6,12]` joined + `preview.test` deflate hygiene still green; `rg previewFor(pending, availablePot)==2` + `rg previews={{ ==1` |
| **Game `src/game/preview.ts:1` `previewFor`/`ambiguousRange`/`nearestLadderIndex`/`FULL_POT_LADDER`/`RANGE_1_2`/`WINDOW_MAX`/`PREVIEW_EXACT_BOUNDARY`** | Byte-identical (`git diff --stat -- triade/src/game/preview.ts` empty) — Hud consumes `Preview` type only via fallback; no engine roll import, no `Math.random`. | `preview.test.ts` 40/40 + `preview-invariant.test.ts` structural (no roll import, no Math.random, ladder from config, pure) must stay green |
| **Engine `src/engine/*` (`spawn.ts:pickCombined/weightedPicker`, `pot.ts:potForTier`, `ceiling.ts:ceilingDetector/tierForCeiling`, `game.ts:move/pendingSpawn`, `Board/PendingSpawn`)** | Byte-identical (`git diff --stat -- triade/src/engine` empty) — Hud is pure display, never mutates board/GameState, never consumes RNG draws. | Existing `adaptive-spawn-integration` 26/26 + `weights` + `engine.smoke` + `pot/pot-tier-pipeline` + `game` suites must stay green; draw budget `effective 3 / noop 0 / newGame 20` preserved via engine unchanged |
| **Test tooling `test-utils/helpers.ts` (`sigmaBound`/`runSeededSession`/`stripComments*`) + `spec-*` contracts** | Already hardened by `dw-test-scanner-helpers-hardening`; this sweep only consumes `Preview` type and adds no new helper file. | `engine.purity` + `ui.norolls` + `stripComments` string-safe gates stay green (already via that bundle); ledger `resolution-undo da2f401d…` 1 hit verified |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization
- `nfr-criteria.md` - NFR evidence for later `nfr-assess` (this sweep plans NFR, does not assess PASS/CONCERNS/FAIL)

### Related Documents

- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-69)
- Code: `triade/src/ui/Hud.tsx:9,23,64-67` + `triade/src/ui/PreviewCard.tsx:14-22` + `triade/App.tsx:950` (delta under test)
- Tests: `triade/__tests__/ui/components/hud.test.ts` + `triade/__tests__/ui/components/hud.previewWiring.test.ts` + `triade/__tests__/ui/components/previewCard.test.ts`
- Preview: `triade/src/game/preview.ts:1` (Preview type, byte-identical)
- Prior bundle: `_bmad-output/implementation-artifacts/bmad-dev-auto-result-hud-preview-hardening.md` (3/3 PASS ad-hoc regression log)

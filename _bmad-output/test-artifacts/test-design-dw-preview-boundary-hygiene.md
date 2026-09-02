---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-preview-boundary-hygiene.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/game/preview.ts'
  - 'triade/App.tsx'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/src/engine/core/pot.ts'
  - 'triade/src/engine/core/ceiling.ts'
  - 'triade/__tests__/game/preview.test.ts'
  - 'triade/__tests__/game/preview-invariant.test.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-preview-boundary-hygiene — Preview 60/40 ULP, beyond-ladder truth, frozen slices, deflate fan-out

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep bundle deep-dive for `dw-preview-boundary-hygiene`
**Scope:** Targeted test design for the working-tree delta of `dw-preview-boundary-hygiene`

> **Delta under assessment:** Working-tree `git diff HEAD` vs `HEAD a947f70` (spec `spec-preview-boundary-hygiene.md` intent/boundaries/I-O matrix 5 rows, Design Notes, Verification). HEAD is `a947f70` after `spec: sync final_revision`; `HEAD` is clean except `deferred-work.md` (DW-78/79/80/84/94 `open→done` with `resolution-undo: deb5edf9…`) plus committed hygiene at `4a50e2c` (`fix(preview): stabilize boundary ULP, beyond-ladder truth, freeze slices, deflate fan-out`). The sweep resolves DW-78 / DW-79 / DW-80 / DW-84 / DW-94 to `done` via boundary hygiene — no engine byte change (`git diff --stat -- triade/src/engine` empty):
> - `triade/src/game/preview.ts:1` — adds `PREVIEW_EXACT_BOUNDARY = 0.6`, `POT_BASE_VALUE` import, ULP-stabilized guard `roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY` (DW-78), `Object.freeze` on every `ambiguousRange` slice + defensive tail (DW-80), beyond-ladder truth containment via `value>last → [...tail,value].slice(-WINDOW_MAX)` with `Math.log2(ratio)` power-of-two validity check (DW-79), keeps `RANGE_1_2` frozen identity and `WINDOW_MAX=3`
> - `triade/App.tsx:849-886` — verifies and documents live `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` recomputed every render after `ready` guard, shared fan-out to both `previewFor(game.pendingSpawn, availablePot)` lanes (DW-94); no stale memo/closure
> - `triade/src/engine/config/spawnConfig.ts` / `triade/src/engine/core/pot.ts` / `ceiling.ts` — read-only, no edit; ladder `FULL_POT_LADDER = [1,2, ...POT_CURVE keys]` derived once (boundary rule 4)
> - `triade/__tests__/game/preview.test.ts` + `preview-invariant.test.ts` — existing 60/40 + FR-43 + purity pins stay green; extended pins for ULP epsilon, 192 truth, frozen identity, deflate `[3]` fallback (host-only)
> - `deferred-work.md` DW-78/79/80/84/94 `open→done` with `resolution-undo: deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1` (this bundle)

---

## Executive Summary

**Scope:** Hygiene sweep that hardens `previewFor` at four latent boundaries: (1) ULP-stabilized 60/40 decision so a single representable step around `0.6` cannot flip `exact`/`range` (DW-78), (2) beyond-ladder truth containment so a valid pot value beyond `FULL_POT_LADDER` tail `96` (e.g. `192` when `POT_CURVE` extends) returns a frozen window *containing* truth instead of lying `[24,48,96]` (DW-79), (3) frozen slice returns for every `range.values` array so React memo identity is not defeated and callers cannot `push(99)` corrupt the window (DW-80), and (4) live `availablePot` fan-out recomputed every render so a board deflate (`tier 2 → tier 0`, pot shrinks to `[3]` while pending was rolled at `12`) still falls through to a truthful-by-proximity defensive window (DW-94/DW-84 umbrella).

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (≥6): 2
- Critical categories: TECH (ULP epsilon 60/40 drift), BUS/TECH (beyond-ladder lying window)

**Coverage Summary:**

- P0 scenarios: 8 groups (host unit + static scans — ULP `0.6 - EPSILON/2 → range`, `192` truth `includes(192)` frozen ≤3, frozen identity vs `push(99)`, deflate `[3]` truth-by-proximity, `0.599 exact / 0.6 range` pinned, engine byte-identical)
- P1 scenarios: 7 groups (contiguity slices + `Math.log2` power-of-two validity + `availablePot` live fan-out + `RANGE_1_2` reuse + NaN/Infinity guards + ladder derivation single-source + N3 no-engine-rng)
- P2/P3 scenarios: 6 groups (static allowlists for single `PREVIEW_EXACT_BOUNDARY` / single `WINDOW_MAX` / `Object.freeze` sites + `Math.log2` doc + ledger `resolution-undo` 5 hits + exploratory ULP micro + bench `<0.05ms`)
- **Total effort**: ~2.5–4.5 hours (~0.4–0.7 days; host-only, no device lane)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/spawn/score/move, `Board`/`PendingSpawn` shape, `spawnTile` mutation/alias, `pickIndex`/`weightedPicker` NaN/Infinity clamp, `GRID_SIZE 4x4` coupling, `mulberry32`/`oppositeEdgeCandidates`/`transitionPlan` wiring, `GameBoard` Skia rendering, `matchScore`/`haptics`/`feel` presets** | Engine is byte-identical (`git diff --stat -- triade/src/engine` empty). Sweep only changes `preview.ts:1` pure display decision + orchestrator `App.tsx:849` `availablePot` derivation; no spawn distribution/position/timing change. | Engine invariants stay gated by 858 existing host tests + 10 expected-RED feel ATDD (unchanged) + `git diff` empty engine check in this plan. No engine logic re-derived. |
| **`POT_CURVE`/`POT_BASE_VALUE` ladder data itself, `potForTier`/`ceilingDetector`/`tierForCeiling` formula beyond read-through** | `POT_CURVE` is data source; this sweep consumes it via `FULL_POT_LADDER = [1,2,...keys]` and `POT_BASE_VALUE` ratio check — does not edit ladder. Changing ladder is product decision per spec `Block If`. | `spawnConfig` + `pot.ts` single-source invariants stay gated by `weights.test` + `adaptive-spawn-integration` suites; this plan only verifies the beyond-ladder branch *contains* truth when ladder later grows. |
| **`Hud.tsx`/`PreviewCard.tsx` layout/styling beyond frozen identity pipe** | Card renders verbatim `Preview` (`exact` → single value, `range` → 1/2 slash); minimal card-diversity is Hud's concern, not preview content. `Hud` wiring is thin-view covered by `triade/__tests__/ui` integration. | Thin-view `preview.test` + `preview-invariant` structural guards remain gates; full `npm test` includes Hud smoke. |
| **Benchmark/frame-rate both-profile, RevenueCat/AdMob/IAP, Epic 10-11 monetization** | Sweep is `<1 ms` pure TS O(1) helper, 1 arithmetic per `previewFor`, no native module; no `package.json` script change. | No new bench lane; host `npm test` stays `<15 min`, device baseline unchanged. Existing `feel.bench.test.ts` caps unchanged. |
| **Deferred-work ledger edits beyond DW-78/79/80/84/94 `done` with `resolution-undo: deb5edf9…`** | Ledger lists 80+ entries; only 5 move to `done` this sweep. | Other DW entries (e.g. `board shallow ref DW-81`, `pickIndex DW-71/76`, `candidates validation DW-72/73`) remain `open`/`already resolved` and are not re-triaged here. |
| **`sprint-status.yaml` orchestrator ownership** | Owned by orchestrator per prompt; never written by this workflow. | This plan never writes `sprint-status.yaml`; only `deferred-work.md` `resolution-undo` hashes are checked. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `previewFor(pending, availablePotValues= FULL_POT_LADDER)` is pure `(PendingSpawn, readonly number[]) → Preview` with no RNG, no `Math.random`, no engine roll imports (N3 law). ULP case driven by `0.6 - Number.EPSILON/2` (rounds to `0.6`) vs `0.599`; beyond-ladder driven by fixed literal `192` (valid `POT_BASE_VALUE * 2^k` but `>96`); deflate driven by isolated `previewFor(pending(6,0.9), [3])` (no board fixture needed); frozen checked via `Object.isFrozen`. All host-only, no RN/Skia.

**Observability — Good.** `previewFor` branch check `roll + EPSILON < 0.6` is single arithmetic (`0.599999` vs `0.6` contiguous); beyond-ladder fallback path named via `value > FULL.last && Number.isInteger(Math.log2(value/POT_BASE_VALUE))` then `[...tail,value].slice(-3)` so `values.includes(192)` failure immediately distinguishes lying tail `[24,48,96]` from truthy `[48,96,192]`; `Object.isFrozen` exposes memo hygiene directly; `availablePot` live recompute visible as `potForTier(tierForCeiling(ceilingDetector(game.board)))` per render (not memoized).

**Reliability — Strong.** All 5 hygiene branches are `Number.isFinite`-guarded (`pending.value`/`pending.displayRoll` fallback to `0` `exact`), `nearestLadderIndex` + `start = max(0,min(clamped-1,len-WINDOW_MAX))` clamped, `WINDOW_MAX=3` capped, never throws across 500 deterministic `previewFor` combos (host `node --import tsx --test`). `triade/src/engine` byte-identical so draw budget `effective 3 / noop 0 / newGame 20` untouched.

**Testability Risks:** Two surfaces thin: (a) `PREVIEW_EXACT_BOUNDARY` `0.6` not binary-exact (`0.59999999999999997`) — a future editor could justify `roll < 0.6` verbatim and regress ULP by one step; mitigated by P0 ULP `0.6 - EPSILON/2 → range` pin. (b) `Math.log2` power-of-two validity check assumes `POT_BASE_VALUE=3` multiples are `3·2^k` — a non-power-of-two future `POT_CURVE` key would fall through to the generic tail branch; low drift, documented.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **ULP epsilon flip at 60/40 boundary — `preview.ts:107 if (roll < 0.6)` without `+EPSILON` flips the 60/40 invariant by one representable double around `0.6`.** `0.6` literal is not binary-exact (`double ≈0.59999999999999997`); `0.6 - EPSILON/2` rounds to `0.6` under round-to-nearest, so `roll < 0.6` would still be `exact` while `0.6 + 0.6*EPSILON` would be `range`. The invariant `P(exact)=0.6` then drifts by one ULP (`≈2.2e-16`) per spec — breaking the pinned `0.599 exact / 0.6 range` pair and causing a visible flicker for a single `displayRoll` value. Existing tests pin `0.599`/`0.6` but not EPSILON. | 2 | 3 | **6** | Keep `PREVIEW_EXACT_BOUNDARY=0.6` with `roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY` as landed (insets boundary by one ULP so `0.599` stays exact and `0.6` stays range). Gate: `preview-invariant.test.ts:76-81` pins `0.599→exact,0.6→range` + manual `0.6 - EPSILON/2 → range`. Never use `<=` — exact half-open is `<0.6` stabilized, not `<=0.6`. |
| R-002 | BUS | **Beyond-ladder truth-missing fallback — `value=192` beyond `FULL_POT_LADDER` tail `96` returned as lying `[24,48,96]` without truth.** `FULL_POT_LADDER` freezes at current `POT_CURVE` max `96`; a future `POT_CURVE` extend to `192` adds a valid `3·2^k` value but `nearestLadderIndex(192)` clamps to `96` index `7` then `FULL.slice(5,8)=[24,48,96]` misses truth. `PreviewCard` would display `24/48/96` while engine spawned `192` — N3 "always contains truth" violated, user sees lying preview. Inreachable today but product-extendable. | 2 | 3 | **6** | Keep beyond-ladder branch as landed (`value>96 && Number.isInteger(Math.log2(value/POT_BASE_VALUE))` → `tail = FULL.slice(len-WINDOW_MAX+1)`, `return Object.freeze([...tail,value].slice(-WINDOW_MAX))` → `[48,96,192]`). Gate: `previewFor({value:192,displayRoll:0.9}).values.includes(192) && length<=3 && frozen`. Contiguity over `FULL` sacrificed only for out-of-ladder truth (spec sacrifice). |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | TECH | **Mutable pot slice breaks React memo — `ambiguousRange` returns `availablePotValues.slice(idx, idx+len)` mutable, caller `push(99)` corrupts future memoized `Hud`/`PreviewCard` window.** Only `RANGE_1_2` is `Object.freeze([1,2])` before sweep; every new window (`[3,6,12]`, `[24,48,96]`, `[48,96,192]`) would be fresh mutable if not frozen. No crash today but silent memo defeat + upstream push pollution. | 1 | 3 | 3 | Freeze every non-`RANGE_1_2` return via `Object.freeze(availablePotValues.slice(idx,len))` and `Object.freeze(FULL.slice(start,end))` and `Object.freeze([...tail,value].slice(-3))` as landed. Gate: `Object.isFrozen(previewFor(pending(6,0.9),[3,6,12,24]).values) === true` + `push(99)` throws or frozen check. |
| R-004 | TECH | **Deflate fan-out stale — `App.tsx` serves `availablePot` computed before board deflates (`tier 2 → tier 0`, pot shrinks `[3,6,12,24]→[3]` while pending rolled at `12`).** A `useMemo([ceiling])` missing `game.board` dep or stale closure would keep `[12]`-era window and display `6/12/24` while board ceiling `6` is unreachable. `preview.ts:55-65` truth-by-proximity over `FULL` masks bug but TRUTH law violated for `availablePot` path. | 2 | 2 | 4 | Keep `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` live every render after `ready` guard as landed (`App.tsx:852` comment `Never memoized stale`). Gate: host `previewFor(pending(6,0.9),[3]) → [3,6,12]` contiguous frozen truthy window, not `[6]` or empty; `rg -n "availablePot" triade/App.tsx ==2` (def + fan-out). |
| R-005 | TECH | **`RANGE_1_2` vs `PREVIEW_EXACT_BOUNDARY` vs `WINDOW_MAX` single-source drift — literal `0.6`, `3`, `[1,2]` scattered as magic numbers.** `preview.ts` derives `FULL_POT_LADDER` from `POT_CURVE` + fixed `[1,2]` but boundary `0.6` and cap `3` could be re-typed locally (e.g. `roll<0.6` without `EPSILON` or `len=3` hardcode diverging from `WINDOW_MAX`). | 1 | 2 | 2 | Keep `PREVIEW_EXACT_BOUNDARY` + `WINDOW_MAX=3` + `RANGE_1_2: readonly number[] = Object.freeze([1,2])` as single constants; forbid literals `0.6`/`3`/`[1,2]` outside `preview.ts:1` (static scan). |
| R-006 | TECH | **`Math.log2` floating drift for power-of-two validity — beyond-ladder branch assumes valid pots are `POT_BASE_VALUE·2^k`; `Math.log2(64)===6` is exact but `value=96/POT_BASE_VALUE=32` exact, `192/3=64` exact up to `2^53`, but future `POT_BASE_VALUE` non-power-of-two would need `Number.EPSILON` tolerance.** | 1 | 2 | 2 | Keep `Number.isInteger(Math.log2(ratio))` as landed; doc low-risk bound (`ratio` integer `<2^53`, `3·2^k` exact). On non-power-of-two base change, add tolerance `Math.abs(Math.log2(ratio)-Math.round(...))<1e-10`. |
| R-007 | OPS | **Deferred-work ledger `resolution-undo` hash coupling — DW-78/79/80/84/94 flipped `open→done` with 64-hex `resolution-undo: deb5edf9…` on this bundle; orchestrator's `sprint-status.yaml` is orchestrator-owned.** A follow-on sweep reopening without hash loses revert trail; writing `sprint-status.yaml` violates orchestrator bookkeeping. | 1 | 2 | 2 | Ledger already records `resolution-undo: deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1` per entry; any reopen preserves it. This plan never writes `sprint-status.yaml`. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | DATA | **DisplayRoll/pending.value NaN/Infinity fallback — `previewFor({value:NaN,displayRoll:NaN}, POT)` would NaN-compare `NaN<0.6` false → range with lying window if not guarded.** Engine guarantees `[0,1)` finite, but malformed snapshot must not crash Hud or flip 60/40 silently. | 1 | 2 | 2 | Monitor — `Number.isFinite(pending.displayRoll)?displayRoll:0` and `Number.isFinite(pending.value)?value:0` as landed (`preview.ts:103-104`); `0` falls to `exact` branch (safe). Pin via `preview-invariant O-1` NaN/Infinity sweep. |
| R-009 | TECH | **Contiguous window invariant over ladder — defensive fallback `[value]` single-element lie (DW-68) regresses if `ambiguousRange` ever returns `availablePotValues.slice(idx,idx+len)` without contiguity guard.** Pre-fix `nearestLadderIndex` clamp + centered `start = max(0,min(clamped-1,len-WINDOW_MAX))` preserves contiguity. | 1 | 2 | 2 | Monitor — `isContiguousSlice(values, FULL)` pin in `preview.test` + `preview-invariant` sweeps already green; any new ladder growth must keep slice contiguous (no gap). |
| R-010 | PERF | **Micro overhead of `Math.log2` + `Object.freeze` per `previewFor` call (two `previewFor` per render per lane).** Freeze is O(1) shallow, `log2` only on `value>96` (unreachable today); not frame-budget. | 1 | 1 | 1 | Monitor — no bench lane; verify host `previewFor(...)*10k` `<0.05ms` via `node --import tsx` micro-bench (already `<0.02 ms`). |

### Risk Category Legend

- **TECH**: Technical/Architecture (ULP, freeze, contiguity, Math.log2, single-source)
- **SEC**: Security — none this sweep (no auth/data exposure; preview is pure display)
- **PERF**: Performance — `previewFor` O(1) `<1ms` (R-010)
- **DATA**: Data Integrity — NaN/Infinity fallback truth (R-008)
- **BUS**: Business Impact — preview lies about next spawn (R-002) / Hud memo defeat
- **OPS**: Operations (ledger `resolution-undo`, `sprint-status.yaml` ownership)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-preview-boundary-hygiene` touches the **preview display seam only**: **reliability (60/40 invariant, truth containment, never-throw)**, **maintainability (single `PREVIEW_EXACT_BOUNDARY` + `WINDOW_MAX` + `RANGE_1_2` + `FULL_POT_LADDER` + 5× `resolution-undo` hash)**, **60 FPS/never-throw budget unchanged** (helper O(1) `<1 ms`, no native module), and **offline/installability** unchanged (pure TS).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — 60/40 invariant + truth containment vs never-throw | `displayRoll <0.6` exact stabilized `roll+EPSILON<0.6` so `0.599` exact, `0.6` range, `0.6-EPSILON/2` → range; beyond-ladder `value=192` `displayRoll>=0.6` returns `range` `values.includes(192)` `length≤3` frozen; every `range` `values` `Object.isFrozen` and capped ≤3 contiguous; malformed `NaN/Infinity` degrades to `exact value 0` or frozen defensive `[1,2,3]` not throw. | R-001, R-002, R-008 | Unit host: `preview.test.ts` `0.599 exact / 0.6 range / boundary window includes 12 contiguity` + `preview-invariant.test.ts` `0.6-EPSILON/2 range` + `192 truth` `includes(192) frozen` + frozen identity `push(99)` | `triade/__tests__/game/preview.test.ts:26-63` + `triade/__tests__/game/preview-invariant.test.ts:76-81,132,433` + `npm --prefix triade test -- __tests__/game/preview*` full `40/40` green + `npm --prefix triade test` full `≈882` pass / `11` expected RED unchanged |
| Maintainability | Single `PREVIEW_EXACT_BOUNDARY=0.6` (not scattered `0.6` literals), single `WINDOW_MAX=3`, single `RANGE_1_2=Object.freeze([1,2])`, single `FULL_POT_LADDER=Object.freeze([1,2,...POT_CURVE keys])`; single `POT_BASE_VALUE` import + `Number.isFinite` + `Math.log2` + `Object.freeze` sites only in `preview.ts:1`; `resolution-undo` 64-hex hash per resolved DW entry; `availablePot` computed at exactly one site `App.tsx:852` shared to both lanes. | R-003, R-005, R-007 | Static-assert: `rg -n "PREVIEW_EXACT_BOUNDARY" triade/src/game/preview.ts ==1` + `rg -n "WINDOW_MAX" triade/src/game/preview.ts ==1` + `rg -n "Object\\.freeze" triade/src/game/preview.ts >=4` (RANGE+3 returns) + `rg -n "availablePot = potForTier" triade/App.tsx ==1` + `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` `==5` new | Source scan + `preview.ts` diff + `App.tsx:852,885-886` diff + ledger diff |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn`, frame worst `<8 ms`, device `p99 <16.7 ms`. Preview adds `<1 ms` per `previewFor` (O(1) destructure + one `+EPSILON` branch + at most one `slice`/`freeze` + `Math.log2` only on `>96` unreachable path). No new worklet, no `Math.random`, no `setTimeout`. | R-010 | Host micro-bench `10k× previewFor(pending(12,0.6))` median `<0.05 ms` extendable via `feel.bench.test.ts` both-profile (already in budget). | CI `npm test` timing + `feel.bench.test.ts` median/p99 unchanged + `npx tsc --noEmit` clean |
| Compliance — N3 preview law + ladder derivation | Preview law: `previewFor` reads only `pendingSpawn`, 60/40 uses separate `displayRoll`, never re-rolls or imports engine roll symbols, no `Math.random`, pure `same input → deepEqual`; ladder rule 4: `FULL_POT_LADDER` derived from ENGINE CONFIG DATA (`POT_CURVE` + fixed `[1,2]` prefix), no scattered literals elsewhere. | R-005, R-006 | Structural: `stripCommentsAndStrings(preview.ts)` contains no `Math.random` / no `weightedPicker` / no `pickIndex` / no `rng` import + `extractNamedImports` shows only `POT_CURVE, POT_BASE_VALUE` from `spawnConfig.ts` + `FULL_POT_LADDER` derivation scan. | `preview-invariant.test.ts` structural suite (no-roll-import / no-Math.random / ladder-from-config / pure) + `rg -n "Math\\.random" triade/src/game/preview.ts ==0` + `rg -n "POT_CURVE" triade/src/game/preview.ts ==1` |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (preview pure TS, `App.tsx` orchestrator wiring only). | — | `npm --prefix triade test` offline (no network) still `≈882` pass + expected-RED. | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. `Number.EPSILON ≈2.2e-16` is runtime constant, not invented; `0.6 - EPSILON/2` rounding behavior is IEEE-754, not threshold-invented; `WINDOW_MAX=3` is product constant (`FULL` cap); `<1 ms` helper cost is observed, not threshold-invented. If a future sweep grows `POT_CURVE` to `192/384`, record its new `FULL.length` as baseline rather than inventing a threshold (mark UNKNOWN only if no host timing collected).

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-preview-boundary-hygiene.md` intent/boundaries/I-O matrix 5 rows, 4 ACs, Design Notes signed; N3 preview law + ladder rule 4 preserved; `triade/src/engine` byte-identical contract)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsconfig.test.json` + `node:assert/strict`; working-tree on `a947f70` + boundary hygiene diff)
- [ ] Test data available or factories ready (`POT_CURVE` → `FULL_POT_LADDER` 8 tiers `[1,2,3,6,12,24,48,96]`, `POT_BASE_VALUE=3`, `PendingSpawn {value,displayRoll}` factories via `pending(value,roll)`, `availablePot` sets `[3]` / `[3,6,12,24]` / full ladder)
- [ ] Feature deployed to test environment (working-tree `preview.ts:1` + `App.tsx:849-886` patched; `git diff --stat -- triade/src/engine` empty verified)
- [ ] No engine edits beyond `preview.ts:1` + `App.tsx` orchestrator wiring and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`0.6-EPSILON/2 range` + `192 includes(192) frozen ≤3` + frozen `push(99)` + deflate `[3]` truthy + `0.599 exact / 0.6 range` window + engine byte-identical — host)
- [ ] All P1 tests passing (or failures triaged with waivers) — contiguity slices + `Math.log2` power-of-two validity + `availablePot` live fan-out + `RANGE_1_2` frozen identity + NaN/Infinity sweep
- [ ] No open high-priority / high-severity bugs (R-001..R-002 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on boundary seam; `rg` allowlists for single `PREVIEW_EXACT_BOUNDARY`/`WINDOW_MAX`/`RANGE_1_2` + ≥4 `Object.freeze` sites green)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (both hit via `npx tsc` probes below)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (60/40 epsilon vs never-throw, single `PREVIEW_EXACT_BOUNDARY` + frozen windows, N3 purity green)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns ULP `0.6-EPSILON/2` + `192 truth` + frozen `push(99)` + deflate `[3]` pins, `rg` allowlists, ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `preview.ts:1` 4-boundary hygiene + `App.tsx:852` live `availablePot` fan-out, ULP comment + freeze hygiene |
| PM | PM | Signs beyond-ladder `192` unreachable-today product choice (truth-containment over contiguity) + accepts no engine drift |

---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hygiene; host unit + smoke, already green on `4a50e2c`

**Criteria**: Blocks 60/40 or truth invariant + high risk (≥6) + no workaround (single ULP lies, `[24,48,96]` without `192` lies, mutable slice silently defeats Hud memo, `availablePot` stale shows wrong tier)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC1 — ULP epsilon-stabilized 60/40: `pending(12, 0.6 - EPSILON/2)` → `range` (stable, not flipped to `exact` by rounding) + `0.599 exact / 0.6 range` pinned + boundary window `includes(12)` contiguity | Unit | R-001 | 1 | QA (done) | `preview.ts:107 roll+EPSILON < 0.6` vs `0.599` exact. Manual probe: `node --import tsx -e "import {previewFor} from './triade/src/game/preview.ts'; console.log(previewFor({value:12,displayRoll:0.6-Number.EPSILON/2}))"` must be `kind:range`. |
| AC2 — Beyond-ladder truth `192` (valid `3·2^k` but `>96`): `previewFor({value:192,displayRoll:0.9})` → `kind:range` `values.includes(192)` `length<=3` `Object.isFrozen` and not lying `[24,48,96]` | Unit | R-002 | 1 | QA (done) | `preview.ts:61-72` tail `[48,96,192]` via `[...tail,192].slice(-3)` frozen. Verify: `node --import tsx -e "import {previewFor} from './triade/src/game/preview.ts'; const r=previewFor({value:192,displayRoll:0.9}); console.log(r, Object.isFrozen(r.values))"` `includes 192 true frozen true`. |
| AC3 — Frozen slice identity: `previewFor(pending(6,0.9), [3,6,12,24])` `values` frozen; `values.push(99)` throws or `isFrozen true` and second call uncorrupted (memo hygiene) | Unit | R-003 | 2 | QA (done) | `preview.ts:52,72,84-85` three `Object.freeze(slice)` sites + `RANGE_1_2 frozen`. Pinned by `preview-invariant O-2`: `RANGE_1_2` identity + `values push` frozen. |
| AC4 — Deflate truth: `previewFor(pending(6,0.9), [3])` (available pot shrunk while pending rolled at `6`) → defensive `FULL` slice contiguous `values.length 1..3` frozen, not empty or single-element `[6]` lie; also `availablePot` live at `App.tsx:852` (grep `availablePot = potForTier` ==1) | Unit + Static scan | R-004, R-009 | 2 | QA (done) | `preview.ts:74-85` centered `nearestLadderIndex` fallback `[3,6,12]` for `value=6` with `[3]` (and `[1,2,3]` for `NaN→0`); `App.tsx:852` share. Gate: host `previewFor(pending(6,0.9),[3])` contiguous frozen `[3,6,12]` + `rg -n "availablePot = potForTier" triade/App.tsx ==1`. |
| AC5 — Engine byte-identical: `git diff --stat -- triade/src/engine` empty (no spawn/merge/tier change) | Static scan | R-001..R-007 | 1 | QA (done) | `preview.ts:1` + `App.tsx` only; full suite `≈882 pass / 11 expected RED` unchanged, `npx tsc --noEmit` clean. |
| AC6 — Existing boundary pins still green: `0.599 exact`, `0.6 range`, `99→[24,48,96]` tail not lie, `1/2→[1,2]` regardless of availability (FR-43) | Unit | R-001, R-009 | 1 | QA (done) | `preview.test.ts:26-63` `0.599/0.6` + `99 defensive 3-wide` + `1,2 → RANGE_1_2`. |

**Total P0**: 8 checks (host unit + 2 `rg` gates + engine purity), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & display semantics

**Criteria**: Important `previewFor`→`availablePot` wiring + medium/high risk + common 60/40 + pot-island flows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Contiguity & ordering — every `value 1,2,3,6,12,24,48,96,192` at `0.9` across `avail [3]` / `POT_LADDER` / `[3,6,12,24]` yields `range` `values.includes(value)` `1≤len≤3` sorted ascending `isContiguousSlice(FULL)` | Unit | R-009 | 1 | QA | Reuse `preview.test.ts isContiguousSlice` + `preview-invariant T1a/T1b` sweeps (`FULL × availSets × rolls`). |
| `Math.log2` validity filter — non-power-of-two beyond-ladder (e.g. `value=100`) falls through generic tail not truth-tail; valid `3·2^k` (`192,384`) hits truth-tail `[48,96,192]` vs `100→[24,48,96]` generic | Unit | R-006 | 1 | QA | `preview.ts:61-72 ratio = value/POT_BASE_VALUE, Number.isInteger(Math.log2(ratio))`. Host pin: `previewFor(192, POT) includes 192` vs `previewFor(100,POT) ==[24,48,96]` not includes 100. |
| `RANGE_1_2` reuse & `WINDOW_MAX` cap — `value 1` and `2` return same frozen instance `RANGE_1_2` (`Object.is(r1.values,r2.values)`) and every pot window `len ≤ WINDOW_MAX` | Unit | R-003, R-005 | 1 | QA | `preview.ts:30-31` `RANGE_1_2: readonly number[] = Object.freeze([1,2])`. Pinned by `preview-invariant` identity check. |
| NaN/Infinity defensive NaN→`exact value 0` and `range` fallback `[1,2,3]` frozen never throws | Unit | R-008 | 2 | QA | `preview-invariant O-1` sweep: `pending(NaN,NaN)→exact 0`, `pending(6,NaN)→exact 6`, `pending(NaN,0.9)→range [1,2,3] frozen`, `Infinity` likewise. |
| Ladder single-source — `FULL_POT_LADDER` derived from `POT_CURVE` + fixed `[1,2]` prefix, not literals; `PREVIEW_EXACT_BOUNDARY` single `0.6` literal | Static scan | R-005 | 1 | QA | `rg -n "1, 2" triade/src/game/preview.ts ==1` + `rg -n "POT_CURVE" triade/src/game/preview.ts ==1` + `rg -n "PREVIEW_EXACT_BOUNDARY" triade/src/game/preview.ts ==1`. |
| `availablePot` live fan-out wiring — `App.tsx:852 availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` placed after `ready` guard, shared to both `previewFor(..., availablePot)` at `885-886` | Static scan | R-004 | 1 | QA | `rg -n "potForTier\(tierForCeiling" triade/App.tsx ==1` + `rg -n "previewFor\(game.pendingSpawn, availablePot\)" triade/App.tsx ==2`. Any memo without `game.board` dep is FAIL. |

**Total P1**: 7 checks, ~0.4–0.8 h host (mostly existing `preview*` suites, 1 new `192 vs 100` pin)

### P2 (Medium) — Secondary flows + low/medium risk

**Criteria**: Secondary glue + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-constant / single-freeze allowlists — `PREVIEW_EXACT_BOUNDARY` `==1`, `WINDOW_MAX` `==1`, `Object.freeze` `≥4` sites in `preview.ts:1`, no stray `0.6` outside `preview.ts` | Static scan | R-005 | 1 | QA | `rg -n "0\\.6" triade/src/game/preview.ts ==1` (only `PREVIEW_EXACT_BOUNDARY = 0.6`) + `rg -n "Object\\.freeze" triade/src/game/preview.ts` `>=4`. Any second `0.6` literal outside definition is a watcher. |
| `Math.log2` doc & `POT_BASE_VALUE` import scan — `POT_BASE_VALUE` used only in `ratio = value / POT_BASE_VALUE` ratio check, not scattered | Static scan | R-006 | 1 | QA | `rg -n "POT_BASE_VALUE" triade/src/game/preview.ts ==2` (import + ratio) — proves non-scattered. |
| N3 law No-engine-roll import — `preview.ts` contains no `Math.random` / `weightedPicker` / `pickIndex` / `rspg` / `rng` symbol | Static scan | R-005 | 1 | QA | `stripCommentsAndStrings(preview.ts)` `rg -n "Math\\.random\|weightedPicker\|pickIndex" triade/src/game/preview.ts ==0` (structural). |
| Ledger `resolution-undo` hash — DW-78/79/80/84/94 `open→done` each carries 64-hex `deb5edf9…` | Static scan | R-007 | 1 | QA | `rg -n "deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1" _bmad-output/implementation-artifacts/deferred-work.md` `==10` (status+resolution lines) + 5 distinct DW ids. `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` counts ledger health. |

**Total P2**: 4 checks, ~0.3–0.5 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — ULP `rg` sweep for bare `roll < 0.6` without `+EPSILON` outside stabilized guard: `rg -n "roll < 0\\.6" triade/src/game/preview.ts` should be `==0` (only `roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY`) | Host `rg` exploratory | 1 | QA | No assertion beyond guard; if a bare `roll < 0.6` reappears outside comment, file a patch before merge. |
| Micro-bench — `previewFor` O(1) `10k×` median `<0.05 ms` extendable via `feel.bench.test.ts` both-profile | Unit (bench) | 1 | DEV | `previewFor` is destructure + one `+EPSILON` + at most one `slice/freeze`; `feel.bench.test.ts` budget `median <0.05 / p99 <0.1` not exceeded. Not a new lane, just CI `npm test` timing. |
| Cross-cutting negative — `rg -n "music\|bgm\|RevenueCat\|AdMob" triade/src/game/preview.ts` empty (hygiene stayed in scope) | Static scan | 1 | QA | Trivial carry-over from Epic 8 — no new gate, just proves sweep stayed in `preview.ts` + `App.tsx` orchestrator. |

**Total P3**: 3 checks, ~0.2–0.4 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch `previewFor` helper import/TS regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/game/preview.test.ts __tests__/game/preview-invariant.test.ts` — both green including `0.599 exact / 0.6 range / 192 truth frozen / frozen push / deflate [3]` (`<2 s`)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore` / no `POT_BASE_VALUE` import miss)

**Total**: 2 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical hygiene fail-fast (host only)

- [ ] ULP `previewFor({value:12,displayRoll:0.6-Number.EPSILON/2})` → `range` + `Object.isFrozen(values)` + `0.599 exact / 0.6 range` boundary window `includes(12)`
- [ ] Beyond-ladder `previewFor({value:192,displayRoll:0.9})` `kind:range` `values.includes(192)` `length≤3` `isFrozen` not lying `[24,48,96]`
- [ ] Frozen `previewFor(pending(6,0.9),[3,6,12,24])` `push(99)` frozen; `RANGE_1_2` identity `Object.is(previewFor(1,0.9).values, previewFor(2,0.9).values)` true
- [ ] Deflate `previewFor(pending(6,0.9),[3])` → `[1,2,3]` contiguous frozen truthy + `App.tsx` `availablePot` ==1 definition + 2 fan-out `rg` gates
- [ ] `git diff --stat -- triade/src/engine` empty + full suite `≈882 pass / 11 expected RED` unchanged

**Total**: 5 P0 groups (already passing at `4a50e2c`; `rg` gates are static)

### P1 Tests (<30 min)

**Purpose**: Wiring + semantics

- [ ] Contiguity sweep `FULL 8 + 192` × `availSets [3],[POT], [3,6,12,24]` `range.includes(value)` `isContiguousSlice(FULL)` sorted
- [ ] `Math.log2` branch: `192 includes 192` vs `100 → [24,48,96]` not includes `100` (non-power-of-two falls through)
- [ ] NaN/Infinity `O-1` sweep `pending(NaN,NaN)→exact 0` / `NaN,0.9→range [1,2,3] frozen` never throws
- [ ] Ladder single-source `POT_CURVE`+`[1,2]` + `PREVIEW_EXACT_BOUNDARY` single `0.6` + `WINDOW_MAX=3` + `Object.freeze ≥4` + no `Math.random` scan

**Total**: 4 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Scans, doc, exploratory

- [ ] Single-constant allowlists `PREVIEW_EXACT_BOUNDARY==1` / `WINDOW_MAX==1` / `POT_BASE_VALUE==2` / `Math.log2` arity + ledger `resolution-undo 5` hash scan (`<1 s`)
- [ ] ULP exploratory `rg "roll < 0.6" ==0` (only `+EPSILON < PREVIEW` allowed) + micro-bench `10k× <0.05ms` (`<2 min`)

**Total**: 4 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 8 | ~0.15 | ~1.0–1.6 | Pure `preview.test`+`preview-invariant` ULP/192/frozen/deflate + `rg` allowlists + engine empty already green (done in `4a50e2c`) |
| P1 | 7 | ~0.3 | ~1.2–1.8 | Contiguity sweeps + `Math.log2` `192 vs 100` pin + NaN/O-1 + `RANGE_1_2` identity + ladder single-source + `App` wiring — mostly existing suites, 1 new negative pin is done |
| P2 | 4 | ~0.2 | ~0.5–0.8 | Single-constant / freeze-site / no-engine-roll / ledger `resolution-undo` scans |
| P3 | 3 | ~0.15 | ~0.3–0.5 | ULP `roll<0.6` exploratory + `10k×` micro-bench + cross-cutting negative |
| **Total** | **22** | **-** | **~3.0–4.7** | **~0.4–0.7 days host; no device lane — pure host TypeScript** |

### Prerequisites

**Test Data:**

- `FULL_POT_LADDER 8 tiers [1,2,3,6,12,24,48,96]` (`POT_CURVE keys` + fixed `[1,2]` prefix), `POT_BASE_VALUE=3`, `PREVIEW_EXACT_BOUNDARY=0.6` `Number.EPSILON≈2.22e-16`, `WINDOW_MAX=3`
- `PendingSpawn` literals `pending(value,roll)` `value 1,2,3,6,12,24,48,96,192` `roll 0.599/0.6/0.9 vs NaN/Infinity/0.6-EPSILON/2` / `availablePot` sets `POT_LADDER` / `[3]` / `[3,6,12,24]`
- `rg` allowlist strings: `"PREVIEW_EXACT_BOUNDARY"` / `"WINDOW_MAX"` / `"Object\\.freeze"` / `"availablePot = potForTier"` / `"deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1"`

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `rg` (ripgrep) for allowlist scans (PREVIEW_EXACT_BOUNDARY, WINDOW_MAX, Object.freeze, availablePot, resolution-undo)
- `npx tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 20+ (no Expo dev build needed — `preview.ts` pure TS, `App.tsx` wiring host-inspectable)
- Working tree on `a947f70` baseline + `4a50e2c` hygiene; `triade/src/engine` byte-identical guard

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths** (60/40 epsilon + 192 truth + frozen push + deflate `[3]` + engine empty): ≥80%
- **Wiring seam** (`previewFor`→`availablePot` + `RANGE_1_2` + `Math.log2` branch + N3 purity): 100%
- **Edge cases** (ULP `0.6±EPSILON` + NaN/Infinity + contiguity over `FULL`): ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (ULP `0.6-EPSILON/2 range`, `192 includes 192 frozen`, frozen `push(99)`, deflate `[3]` truthy, `0.599 exact / 0.6 range` + engine empty)
- [ ] No high-risk (≥6) items unmitigated (R-001 ULP epsilon + R-002 192 truth truth-containment green)
- [ ] No stray `roll < 0.6` without `+EPSILON` and ≥4 `Object.freeze` sites in `preview.ts:1`; `PREVIEW_EXACT_BOUNDARY` single `0.6`
- [ ] `npx tsc --noEmit` clean on both `triade/tsconfig.json` and `triade/tsconfig.test.json`
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (60/40 epsilon vs never-throw, single `PREVIEW_EXACT_BOUNDARY` + frozen windows, N3 purity green)

---

## Mitigation Plans

### R-001: ULP epsilon flip at 60/40 boundary (Score: 6)

**Mitigation Strategy:**
1. Keep `PREVIEW_EXACT_BOUNDARY=0.6` with `roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY` as landed (`preview.ts:107`) — `0.599` stays exact and `0.6` stays range, `0.6-EPSILON/2` (rounds to `0.6` under round-to-nearest) correctly maps to `range`.
2. Never use `<=` — documented half-open `displayRoll < 0.6` stabilized, not `<=0.6`.
3. Probe manually: `node --import tsx -e "import {previewFor} from './triade/src/game/preview.ts'; console.log(previewFor({value:12,displayRoll:0.599})); console.log(previewFor({value:12,displayRoll:0.6})); console.log(previewFor({value:12,displayRoll:0.6-Number.EPSILON/2}))"` must be `exact / range / range`.

**Owner:** FE lead
**Timeline:** Immediate (gate this bundle)
**Status:** Planned
**Verification:** `npm --prefix triade test -- __tests__/game/preview*` `40/40` green including `0.599 exact / 0.6 range` + ULP `0.6-EPSILON/2 range` + `npx tsc --noEmit` clean + `rg -n "Number\\.EPSILON" triade/src/game/preview.ts ==1`.

### R-002: Beyond-ladder lying tail `[24,48,96]` without `192` (Score: 6)

**Mitigation Strategy:**
1. Keep beyond-ladder branch `value>96 && Number.isInteger(Math.log2(value/POT_BASE_VALUE)) → Object.freeze([...tail,value].slice(-WINDOW_MAX))` as landed (`preview.ts:61-72` `tail = FULL.slice(len-WINDOW_MAX+1)` → `[48,96,192]`).
2. Document tradeoff: contiguity over `FULL` sacrificed only for out-of-ladder truth (spec sacrifice) — acceptable because `FULL` freezes today but `192` is valid when `POT_CURVE` grows.
3. On any `POT_CURVE` extend beyond `96`, add host `value=newMax` `includes(newMax) frozen ≤3` pin together — atomic commit with curve data.

**Owner:** FE
**Timeline:** Immediate
**Status:** Planned
**Verification:** Host `previewFor({value:192,displayRoll:0.9})` `kind:range` `values.includes(192) && length<=3 && Object.isFrozen(values)` + complement `previewFor({value:99,displayRoll:0.9}) ==[24,48,96]` (generic tail not truth-tail).

### R-004: Deflate fan-out stale `availablePot` (Score: 4)

**Mitigation Strategy:**
1. Keep `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` live every render after `ready` guard as landed (`App.tsx:852` comment `Never memoized stale`) and fan-out shared `previewFor(game.pendingSpawn, availablePot)` to both lanes `885-886`.
2. Probe truth-by-proximity: `previewFor(pending(6,0.9),[3]) → [3,6,12]` contiguous frozen (not `[6]` single-element lie).
3. Any future `useMemo([game.board])` for perf must keep `game.board` dep or add `rg -n "availablePot = potForTier" triade/App.tsx ==1` blocker.

**Owner:** FE
**Timeline:** Immediate (residual acknowledged; ledger `done`)
**Status:** Planned
**Verification:** `previewFor(pending(6,0.9),[3])` `deepEqual [3,6,12]` `isContiguousSlice(FULL)` frozen + `rg -n "availablePot = potForTier" triade/App.tsx ==1` + `rg -n "previewFor\(game.pendingSpawn, availablePot\)" triade/App.tsx ==2` + `npm --prefix triade test` full `≈882` pass.

---

## Assumptions and Dependencies

### Assumptions

1. Effective `previewFor` never consumes RNG draws — pure display (`pending.displayRoll` separate from engine `rng`) — pinned by `N3` structural invariant (`no Math.random / no weightedPicker / no pickIndex / no rng import`); any future engine roll import is a defect, not a feature.
2. No production `preview.ts:1` path outside `RANGE_1_2` returns a mutable array — all `ambiguousRange` returns are `Object.freeze(slice)` (≥4 freeze sites); assumption checked by P0 frozen `push(99)` probe.
3. `PREVIEW_EXACT_BOUNDARY=0.6` half-open `roll + EPSILON < 0.6` is exact; `0.6 - EPSILON/2` rounds to `0.6` under IEEE-754 round-to-nearest, so epsilon guard correctly flips that edge case to `range`; any `roll < 0.6` verbatim regresses by one ULP.
4. Beyond-ladder `Math.log2(ratio)` validity assumes `POT_BASE_VALUE=3` and valid pots are `3·2^k` (ratio integer power of two `<2^53` exact); a non-power-of-two future base would need tolerance, but current sweep documents low drift.
5. `FULL_POT_LADDER 8 tiers [1,2,3,6,12,24,48,96]` is fixed today (`POT_CURVE` 6 keys + `[1,2]` prefix); the `192` truth-tail is triggered only when `value > 96` and valid via `Math.log2` check — generic tail `[24,48,96]` for `99` still correct as truthy-by-proximity fallback.
6. `npx tsc --noEmit -p tsconfig.test.json` baseline remains clean after `POT_BASE_VALUE` import in `preview.ts:1` (no circular import via `spawnConfig.ts` → `preview.ts` leaf).

### Dependencies

1. `triade/tsconfig.json` + `triade/tsconfig.test.json` — Required by host `npm test` (`TSX_TSCONFIG_PATH`) and `npx tsc --noEmit` gates. Status: Ready.
2. `triade/src/game/preview.ts:1` 4-boundary hygiene (`+EPSILON` + freeze + `192` tail + `POT_BASE_VALUE`) + `triade/App.tsx:852` live `availablePot` share — Required before P0 gates. Status: Done (`4a50e2c`).
3. `triade/__tests__/game/preview.test.ts` + `preview-invariant.test.ts` 40/40 including `0.599/0.6` + `99 tail` + frozen identity + NaN sweep — Required for P0 hygiene gates. Status: Done (working-tree).
4. `triade/src/engine/config/spawnConfig.ts` `POT_CURVE`/`POT_BASE_VALUE` single source — Required for ladder derivation single-source scan. Status: Ready (read-only).
5. `deferred-work.md` ledger with `resolution-undo: deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1` for DW-78/79/80/84/94 — Required for P2 ledger verification. Status: Done (working-tree `git diff HEAD` `5` entries).

### Risks to Plan

- **Risk**: `POT_CURVE` extends to `192/384` without co-updating beyond-ladder truth containment comment.
  - **Impact**: Future `192` value still returns truth-tail `[48,96,192]` correctly, but generic tail doc could be stale; no host failure if branch correct.
  - **Contingency**: Treat `spawnConfig.ts:POT_CURVE` extend + `preview.ts:61-72` `Math.log2` branch migration as atomic commit; add `previewFor(384)` `includes(384) frozen` companion.

- **Risk**: New caller mutates `range.values` via `push` and ships Hud memo defeat.
  - **Impact**: `Object.isFrozen` gate FAIL; `previewFor` second call would see pushed value if not frozen.
  - **Contingency**: `Object.isFrozen(previewFor(pending(6,0.9),[3,6,12,24]).values) === true` gate is the blocker; update caller to copy before mutate — do not ship mutable window.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 ULP/192 pin templates for any future ladder extend — separate workflow; not auto-run.
- Run `*automate` for broader `previewFor` host coverage once Hud card-diversity lands.
- Run `*nfr-assess` after implementation evidence (preview host runs) to validate NFR planning without inventing thresholds.

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

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **Game `src/game/preview.ts:1` `previewFor`/`ambiguousRange`/`nearestLadderIndex`/`FULL_POT_LADDER`/`RANGE_1_2`/`WINDOW_MAX`/`PREVIEW_EXACT_BOUNDARY`** | Hygiene-only: boundary epsilon (`+EPSILON<0.6`), frozen slices (`Object.freeze`), beyond-ladder truth tail `[48,96,192]`, `POT_BASE_VALUE` ratio guard; no engine roll import, no `Math.random`. | `preview.test.ts` 40/40 + `preview-invariant.test.ts` structural (no roll import, no Math.random, ladder from config, pure) must stay green; `npm test` `≈882 pass / 11 expected RED` unchanged |
| **Orchestrator `App.tsx:849-886` `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` fan-out to `clean/accelerated` `previewFor(..., availablePot)`** | Deflate hygiene: live recompute after `ready` guard, shared to both lanes, not stale memo; comment `Never memoized stale`. | `preview.test.ts` deflate `[3]` truthy `[3,6,12]` + full suite smoke `criticalPath`/`session.integration` + thin `ui` Hud still green; `rg availablePot = potForTier ==1` + `previewFor(...,availablePot)==2` |
| **Engine `src/engine/*` (`spawn.ts:pickCombined/weightedPicker`, `pot.ts:potForTier`, `ceiling.ts:ceilingDetector/tierForCeiling`, `game.ts:move/pendingSpawn`, `Board/PendingSpawn`)** | Byte-identical (`git diff --stat -- triade/src/engine` empty) — preview is pure display, never mutates board/GameState, never consumes RNG draws. | Existing `adaptive-spawn-integration` 26/26 + `weights 11/26` + `engine.smoke` + `pot/pot-tier-pipeline` + `game` suites must stay green; draw budget `effective 3 / noop 0 / newGame 20` preserved via engine unchanged |
| **Feel/UI `src/feel/*` (`punch/shake/bulletTime/reducedMotion/sfx` + `feel.bench`) + `src/ui/Hud/PreviewCard` + `transitionPlan` predicate** | No change — hygiene sweep disjoint from `!spawned && from.length===2` predicate allowlist (5 sites: `transitionPlan` + `4× feel`). | `feel` unit 12/8/12/9/11 + `feel.bench median <0.05/p99 <0.1` both-profile + `feel ATDD` 10 expected-RED unchanged; `GameBoard`/`Hud` Hud 60/40 readout still 60/40 |
| **Test tooling `test-utils/helpers.ts` (`sigmaBound`/`runSeededSession`/`stripComments*`) + `spec-*` contracts** | Already hardened by `dw-test-scanner-helpers-hardening`; this sweep only consumes `POT_CURVE` via ladder and adds no new helper file. | `engine.purity` + `ui.norolls` + `stripComments` string-safe gates stay green (already via that bundle); ledger `resolution-undo deb5edf9…` 5 hits verified |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization
- `nfr-criteria.md` - NFR evidence for later `nfr-assess` (this sweep plans NFR, does not assess PASS/CONCERNS/FAIL)

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-preview-boundary-hygiene.md`
- Deferred: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-78/79/80/84/94)
- Code: `triade/src/game/preview.ts:1` + `triade/App.tsx:849` (delta under test)
- Tests: `triade/__tests__/game/preview.test.ts` + `triade/__tests__/game/preview-invariant.test.ts`

---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - 'triade/App.tsx'
  - 'triade/src/utils/mulberry32.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/game/matchScore.ts'
  - 'triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts'
  - 'triade/__tests__/ui/components/app.restart.test.ts'
  - 'triade/__tests__/ui/components/app.continueAd.test.ts'
  - 'triade/__tests__/ui/components/app.contextualHelp.test.ts'
  - '_bmad-output/implementation-artifacts/spec-forfeited-continue-rng-reseed.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-forfeited-continue-rng-reseed — forfeitedContinue flag + RNG reseed per newGame

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-forfeited-continue-rng-reseed`
**Scope:** Targeted test design for the working-tree delta of `dw-forfeited-continue-rng-reseed`

> **Delta under assessment:** Working-tree diff vs `HEAD` (`1052600` on `main`) — 5 tracked files + 2 untracked, `40 insertions / 7 deletions` tracked + `186` lines new:
> - `triade/App.tsx:102-103` — NEW `rngSeedRef = useRef(20260808)` alongside `rngRef = useRef(mulberry32(20260808))` (initial seed pin `20260808` preserved).
> - `triade/App.tsx:128-129` — NEW `const [forfeitedContinue, setForfeitedContinue] = useState(false)` — DW-86 pin (never read elsewhere today, dies-with-match).
> - `triade/App.tsx:237-238` — `resetAssistance` now `setForfeitedContinue(false)` — DW-86 dies-with-match in the single assistance-reset point.
> - `triade/App.tsx:260-262` — `applyLaneSelection` needsReset branch — NEW reseed `rngSeedRef.current += 1; rngRef.current = mulberry32(rngSeedRef.current)` **before** `newGame(rngRef.current)` — DW-93 path A.
> - `triade/App.tsx:443-445` — `handleRestart` — NEW same reseed `+=1 / mulberry32` before `newGame` — DW-93 path B; `handleRestart` still inline-budgets + explicit `setForfeitedContinue(false)` at `464-465` (never carried).
> - `triade/App.tsx:740-742` — `handleContinueAd` top `setForfeitedContinue(false)` on any attempt; `780-781` second death after `orchestratorConsumeContinueAd` (idempotent).
> - `triade/App.tsx:792-794` — `handleContinueIap` top `setForfeitedContinue(false)` on any attempt; `817-818` second death after `orchestratorConsumeContinueIap`.
> - `triade/App.tsx:961-966` — NEW `useEffect(() => { if (gameOver && canContinueDerived && !forfeitedContinue) setForfeitedContinue(true); }, [gameOver, canContinueDerived, forfeitedContinue])` — DW-86 set-on-game-over-when-continue-available, idempotent.
> - `triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts:1-106` — NEW source-pin + runtime determinism suite — 3 `node:test` cases (state lifecycle, reseed pin, mulberry32 determinism replay).
> - `triade/__tests__/ui/components/app.restart.test.ts:148,270,308` — slice widenings `800→1200` (handleRestart order), `800→1200` (persistedBest lane pin), `700→1200` (forfeited-continue comment) — keeps pins green after insertion.
> - `triade/__tests__/ui/components/app.contextualHelp.test.ts:76` — `900→1300` slice widening for `handleRestart` bannerDismissed reset.
> - `triade/__tests__/ui/components/app.continueAd.test.ts:52` — `1500→2200` slice widening for `handleContinueAd` granted/orchestrator pin.
> - `_bmad-output/implementation-artifacts/spec-forfeited-continue-rng-reseed.md:1-80` — NEW spec — intent contract, I/O matrix, code map, tasks & AC, change log, verification commands.
> - `_bmad-output/implementation-artifacts/deferred-work.md:737,798` — 2 ledger entries flipped `open → done 2026-09-02` with `resolution: resolved by sweep bundle dw-forfeited-continue-rng-reseed` + `resolution-undo: 41838b7d…` 64-hex (single hunk per entry, see `git diff HEAD -- deferred-work.md` 2 hunks).
> - `sprint-status.yaml` is **orchestrator-owned** and intentionally not in scope — no write, no revert (must stay empty in `git diff -- sprint-status.yaml`).

---

## Executive Summary

**Scope:** Close two low-risk DWs that were comment-only or single-seed. `DW-86` forfeited-continue was only `// AC6/7 forfeited continue dies` with no state to discard, so a future `continueCredit/reviveCount` could bypass `!continueBudget` — vacuous today in Clean single-lane but a fragile pin. `DW-93` RNG was `mulberry32(20260808)` seeded once at `triade/App.tsx:40` and never reseeded, so every restart reused the same stream tail — determinism discontinuity across restarts. The sweep makes both explicit and file-local: a `forfeitedContinue` boolean that is set when `gameOver && canContinueDerived` and dies on any continue attempt (`handleContinueAd`/`handleContinueIap`) and on new-game (`handleRestart`/`applyLaneSelection` via `resetAssistance`), never carried; and a `rngSeedRef` increment + `rngRef.current = mulberry32(nextSeed)` before every `newGame` so each match gets a fresh deterministic sub-stream. `src/engine/**` stays byte-identical (Engine pure, per spec boundary), and the three existing restart/continue/contextualHelp pins are kept green by widening brittle `src.slice(start, len)` windows.

**Risk Summary:**

- Total risks identified: 11
- High-priority risks (≥6): 2 (flag is dead-state-not-gating + slice-widening weakens pin)
- Critical categories: TECH (dead-state flag not gating budget, reseed duplicated in two call-sites, handleRestart inlines vs resetAssistance, slice-window brittleness, useEffect one-render delay), DATA (seed monotonicity vs Date.now, Engine purity), OPS (ledger 64-hex + sprint-status ownership)

**Coverage Summary:**

- P0 scenarios: 7 groups (forfeitedContinue declaration + set/die pins, forfeitedContinue never-carried, RNG seed + reseed-before-newGame, handleRestart order preserved, continue handlers die-on-attempt, runtime mulberry32 determinism replay)
- P1 scenarios: 6 groups (useEffect guard `gameOver && canContinueDerived`, resetAssistance vs handleRestart parity, lane-switch reseed parity, continue Ad vs Iap parity, slice-window tolerance, Engine purity via `Math.random` absent)
- P2/P3 scenarios: 5 groups (useEffect idempotency `&& !forfeitedContinue`, rapid double-restart seeds differ, ledger 64-hex retrievable, no `Math.random` creep, exploratory App-render integration)
- **Total effort**: ~2.0–3.8 hours (~0.3–0.5 day; host-only `node:test` + `tsc --noEmit`, no device lane — pure `triade/App.tsx` + `triade/__tests__/ui` TS, `npm test -- triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts` + `npm test` full gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Enforcing `forfeitedContinue` in the continue gate (`orchestratorCanContinueForState` / `canContinue`) or changing `ContinueBudget` shape (`continueCredit`, `reviveCount`, new store)** | Spec boundary `Block If: Need to change ContinueBudget shape` — this sweep is pin-only, not a gate change. `forfeitedContinue` is set but never read by any `canContinue` derivation; `canContinueDerived` still derives solely from `ContinueBudget`. A future story that adds a new budget field must explicitly integrate the flag (or replace it) and re-quantize the gate. | This design pins dead-state explicitly: `rg -n "forfeitedContinue" triade/App.tsx` 8 hits, zero hits in `src/game/assistance.ts` + `src/game/matchOrchestrator.ts` (no gating read), `rg -n "canContinue" triade/App.tsx` shows `canContinueDerived = orchestratorCanContinueForState(tmpForGates, profile)` unchanged. Future enablement must add gating tests and update this plan. |
| **Engine merge/score/spawn/ceiling logic `canMerge/mergeValue/shiftLine, FIXED_WEIGHTS/POT_WEIGHT, ceilingDetector/tierForCeiling/potForTier, matchScore/matchStats, GameBoard Skia, RNGH gesture, layout.ts/Hud.tsx`** | No file in the delta modifies engine rules, weights, ceiling, pot, stats, or render. `git diff HEAD -- triade/src/engine` is empty (0 hunks); `src/utils/mulberry32.ts` byte-identical. | Existing `npm test` full gate (~950 pass per spec log) stays invariant; `game.test.ts`/`line.test.ts`/`spawn.test.ts`/`ceiling.test.ts` not in delta — any regression would be caught by baseline. |
| **Changing overlay/Engine contracts, using `Math.random` in App/game/ui, or gating RNG reseed behind async** | Spec-boundary `Never: change Engine/pot/spawn/ceiling logic; make RNG reseed async; add Math.random` — reseed is synchronous `rngSeedRef.current +=1; rngRef.current = mulberry32(...)` before `newGame` (no await). | Pinned via `rg -n "Math\\.random" triade/App.tsx` 0 hits (only `rngRef.current` used) + `rg -n "mulberry32" triade/App.tsx` 3 hits (decl + 2 reseeds). |
| **Persisting `forfeitedContinue` across matches or across reloads, or seeding RNG from `Date.now()` / `crypto`** | Spec `Never: make forfeitedContinue persist across matches; add Math.random` and Approach `incrementing integer seed, never Math.random`. `forfeitedContinue` is `useState(false)` local, cleared in both new-game paths; RNG uses `+1` increment, not `Date.now()`. | Pinned via `rg -n "forfeitedContinue" triade/App.tsx` shows `useState(false)` + `setForfeitedContinue(false)` ×≥4 deaths, no `AsyncStorage/SecureStore` hit; `rg -n "Date\\.now|Math\\.random" triade/App.tsx` 0 hits. |
| **Editing `sprint-status.yaml` or deferred-work beyond the 2 DW entries** | `sprint-status.yaml` is orchestrator-owned (`never write it, and never revert`). `deferred-work.md` change is exactly 2 entries (`DW-86` vacuous-forfeited-continue + `DW-93` RNG determinism) flipped `open → done 2026-09-02` with `resolution-undo: 41838b7d…` 64-hex (`git diff HEAD -- deferred-work.md` 2 hunks). | This plan never writes `sprint-status.yaml`; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in CI. Ledger already records the correct hashes. |
| **Board `role="grid"` a11y, dev-build physical device, frame-rate bench, rewarded-ads/RevenueCat/Epic 9-11** | No a11y/bench/ads code touched beyond `handleContinueAd/Iap` flag death (no ad gate change). | Existing suites + manual-validation domain remain. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Good.** `forfeitedContinue` lifecycle is fully controllable via React state + derived `gameOver`/`canContinueDerived`: `useState(false)` initial, `useEffect` set when `gameOver && canContinueDerived`, deaths are `setForfeitedContinue(false)` in 4 sites (`resetAssistance`, `handleRestart`, `handleContinueAd` ×2, `handleContinueIap` ×2). All are testable via source-pin (`stripCommentsAndStrings` + `src.includes`/`src.match`/`src.slice`) without mounting the RN view. RNG reseed is `useRef(20260808)` + `rngSeedRef.current +=1; rngRef.current = mulberry32(nextSeed)` before `newGame(rngRef.current)` — pure `mulberry32(seed) => Rng` + `newGame(rng)` determinism, host-testable with `newGame(mulberry32(20260808))` vs `newGame(mulberry32(20260809))` comparisons. No `expo-*`/`Skia`/`Reanimated` needed for the seam.

**Observability — Good but thin for dead-state.** `forfeitedContinue` is declared, set true once, and cleared ≥4 times — observable via `rg "forfeitedContinue" App.tsx` 8 hits and `src.match(/setForfeitedContinue\(false\)/g).length >=4` and slice pins in `handleRestart/handleContinueAd/handleContinueIap/resetAssistance`. The `gameOver && canContinueDerived` guard is observable via `rg "gameOver && canContinueDerived"`. RNG reseed is observable via `rg "rngSeedRef.current \+= 1"` 2 hits + `rg "rngRef.current = mulberry32\(rngSeedRef.current\)"` 2 hits + order pin `reseedIdx < newGameIdx` in both restart paths. The thin surface is that `forfeitedContinue` is never rendered and never branches, so source-pin is the only signal — runtime mount would see the flag only via a test-id or debug prop (not present).

**Reliability — Strong on happy path, duplicated on failure path.** All normal `gameOver→set` / `continue→die` / `restart→reseed+die` paths are `never-throws` (no async, no throw). `mulberry32(seed)` is `never-throws` for any `number`; `newGame(rngRef.current)` draws deterministically. Both `tsc --noEmit` gates clean; `npm test -- triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts` 3 pass + full `npm test` ~950 pass per spec log. Two surfaces are thin: (a) `handleRestart` inlines budget resets + `setForfeitedContinue(false)` instead of calling `resetAssistance` — a future `resetAssistance` addition (e.g., new `showRewardPrompt` reset) would drift `handleRestart` unless remembered (R-006). (b) `applyLaneSelection` needsReset branch reseeds but `!needsReset` branch does not — correct today (no `newGame`), but a future caller that calls `newGame` there would need a third reseed site (R-003).

**Testability Risks:** Two surfaces are thin but mitigated: (a) dead-state pin — `forfeitedContinue` could be deleted and every source-pin would flip red, but no runtime behavior would change today (R-001); mitigated by pairing source-pin with a runtime `newGame` determinism replay that pins the RNG seam (which would stay green even if flag deleted, so flag deletion is not fully runtime-guarded). (b) slice-window brittleness — widening `700→1200` / `1500→2200` to keep pins green after insertion makes future order regressions easier to hide if new code pushes `setGame` past `1200` (R-010); mitigated by also pinning explicit `newGame→setGame→setMoveResult(null)→setMatch→setMatchStats→busyRef=false` order via `order` regex array in `app.restart.test.ts` (not just slice existence).

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH / BUS | **Dead-state forfeitedContinue — flag is set (`useEffect gameOver && canContinueDerived → true`) and dies (`setForfeitedContinue(false)` ×≥4) but is never read by `canContinueDerived`, `orchestratorCanContinueForState`, or any UI branch.** A future story that adds `continueCredit/reviveCount` could bypass `!continueBudget` by adding a new budget field without checking `forfeitedContinue`, still allowing a second continue in the same match or carrying credit to next match — the flag would give false confidence that AC6/7 is enforced. Current behavior is vacuous (Clean single-lane correct today) but the pin is fragile without gating. | 2 | 3 | **6** | Enforce dead-state documentation + future gate contract: (a) **source P0 pins** `rg -n "forfeitedContinue" App.tsx` 8 hits, zero hits in `src/game/assistance.ts` + `src/game/matchOrchestrator.ts` (no gating read today — pin the gap intentionally) + `canContinueDerived = orchestratorCanContinueForState(...)` unchanged scan (b) **host P0 pins** `const [forfeitedContinue, setForfeitedContinue] = useState(false)` declaration + `setForfeitedContinue(true)` guarded by `gameOver && canContinueDerived` + `setForfeitedContinue(false)` in `handleContinueAd`/`handleContinueIap`/`handleRestart`/`resetAssistance` (≥4) (c) **spec boundary note** future `continueCredit` story must add gating read + new tests and update this plan; Spec `Block If: Need to change ContinueBudget shape` is the trip-wire. | FE lead | Immediate (gate DW-86) |
| R-002 | TECH | **Slice-window brittleness — `app.restart.test.ts` / `app.contextualHelp.test.ts` / `app.continueAd.test.ts` widened from 700–1500 to 1200–2200 to stay green after insertion (`handleRestart` 800→1200, restart forfeited-continue 700→1200, contextualHelp 900→1300, continueAd 1500→2200).** A regression that reorders `handleRestart` (`newGame→setGame→setMoveResult(null)→setMatch→setMatchStats→busyRef=false` must stay in that order per story 6.3) would still be inside `1200` unless the reordering pushes a token past the window, so a subtle swap (e.g., `setMoveResult` before `setGame`) could hide inside the wider slice and the pin would stay green. | 2 | 3 | **6** | Enforce order not just presence: (a) **host P0 pins** `app.restart.test.ts` `order` regex array `const s = newGame(rngRef.current) → setGame(s) → setMoveResult(null) → setMatch(initialScore(...)) → setMatchStats(initialStats(...)) → busyRef.current = false` must be found in that order inside `handleSlice` 1200 window (still asserted) + `forfeited continue dies` comment pin + `persistedBest` lane pin (b) **static scans** `rg -n "newGame\(rngRef.current\)" App.tsx` + `rg -n "setContinueBudget.*continueBudget" App.tsx` not relevant but handleRestart still contains `newGame→setGame` adjacency (c) **ledger** track slice widths in this plan so future widening beyond 1200/2200 must be justified and re-pinned with explicit order diff in review. | FE lead | Immediate |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-003 | TECH | **RNG reseed duplicated in two call-sites — `handleRestart` and `applyLaneSelection` needsReset both do `rngSeedRef.current +=1; rngRef.current = mulberry32(rngSeedRef.current)` before `newGame`.** Forgetting one site (e.g., adding a third restart path like "reset from settings") would leave that path on the stale stream tail (same board repeat, determinism discontinuity on that branch only). | 2 | 2 | 4 | Pin parity: (a) **host P0 pins** `handleRestart` slice `reseedIdx < newGameIdx` + `applyLaneSelection` slice `rngSeedRef.current` exists near `needsReset` (`laneSlice 1800`); `rg -n "rngSeedRef.current \+= 1" App.tsx` must be `2` hits + `rg -n "rngRef.current = mulberry32\(rngSeedRef.current\)" App.tsx` `2` hits (b) **runtime P1 pin** `app.forfeited-continue-rng-reseed.test.ts` mulberry32 replay: `newGame(mulberry32(20260808))` vs `newGame(mulberry32(20260809))` boards differ (determinism continuity via increment) — if one site missed increment, boards on that path would repeat vs increment. |
| R-004 | TECH | **handleRestart inlines budget resets + `forfeitedContinue` death instead of calling `resetAssistance`.** `resetAssistance` is the single die-with-match point for `undoBudget/hintBudget/continueBudget` + `forfeitedContinue`; `handleRestart` duplicates `setUndoHistory([]) / base unlimited / setUndoBudget / setHintBudget / setContinueBudget / setForfeitedContinue(false)` inline. A future addition to `resetAssistance` (e.g., new `showTutorialHint` die-with-match) would drift `handleRestart` unless caller remembers both. | 2 | 2 | 4 | Pin parity: (a) **static scan** `rg -n "resetAssistance" App.tsx` shows call in `applyLaneSelection` needsReset but not in `handleRestart` — pin the gap as intentional duplication with comment `DW-86: forfeitedContinue dies with new game` vs `DW-86: forfeitedContinue dies with match` (b) **host P1 pin** both `handleRestart` and `resetAssistance` contain `setForfeitedContinue(false)` + `initialUndoBudget()/initialHintBudget/initialContinueBudget` — widen review to check both when `resetAssistance` evolves; consider future extraction to `reseedRng()` helper (out of scope for this sweep, noted as contingency). |
| R-005 | TECH | **useEffect one-render delay — `forfeitedContinue` set via `useEffect` on `[gameOver, canContinueDerived, forfeitedContinue]` so flag flips true on the next render after `gameOver && canContinueDerived` becomes true, not synchronously with `isGameOver(board)` derivation.** Any synchronous read of `forfeitedContinue` in the same render that sets `gameOver` would see stale `false`. No such read exists today (flag never read), but a future synchronous gate `if (forfeitedContinue) blockContinue` would race. | 1 | 3 | 3 | Pin guard idempotency: (a) **host P1 pin** `useEffect(() => { if (gameOver && canContinueDerived && !forfeitedContinue) setForfeitedContinue(true); }, [gameOver, canContinueDerived, forfeitedContinue])` exact shape (guard `&& !forfeitedContinue` prevents loop) (b) **spec note** future gate that needs synchronous forfeited state must derive directly from `gameOver && canContinueDerived` in render, not from the delayed state, or must move flag to a ref. |
| R-006 | TECH | **RNG reseed order — increment + `mulberry32` must happen **before** `newGame(rngRef.current)` in both paths; swapping order would reseed after consuming the stale `rngRef.current` (same board repeat) and shift next board's stream by one.** | 1 | 3 | 3 | Pin order: (a) **host P0 pins** `handleRestart` `reseedIdx < newGameIdx` + `applyLaneSelection` `rngSeedRef.current +=1` before `newGame(rngRef.current)` (explicit index compare) (b) **static scan** `rg -n "rngSeedRef\.current \+= 1" App.tsx` 2 hits each followed within 200 chars by `rngRef\.current = mulberry32` and `newGame\(rngRef\.current\)`. |
| R-007 | DATA | **Seed monotonicity vs `Date.now` — `rngSeedRef` uses `+1` increment, not `Date.now()` / `crypto`.** First game after reload always `20260808` (same board), subsequent games `20260809, 20260810…` deterministic. If spec intended `Date.now()` for cross-session variety, repeat-first-board could be considered a data defect; if increment is intended for deterministic replay, `Date.now` would break host snapshot pins. | 1 | 2 | 2 | Pin determinism contract: (a) **static scan** `rg -n "20260808" App.tsx` 2 hits (decls `rngRef` + `rngSeedRef`) + `rg -n "Date\\.now|Math\\.random" App.tsx` 0 hits (increment-only) (b) **runtime P0 pin** `newGame(mulberry32(20260808)).board` deepEquals across two fresh `mulberry32(20260808)` (determinism) + `newGame(mulberry32(20260809)).board` differs (increment continuity) — pin the chosen increment semantics, not `Date.now()`. Future story that wants `Date.now` must add new AC and update this plan. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-008 | OPS | **Ledger `resolution-undo: 41838b7d…` 64-hex for 2 DW entries (`DW-86` vacuous forfeited-continue + `DW-93` RNG discontinuity) + `sprint-status.yaml` orchestrator ownership.** Sweep flips exactly 2 deferred-work hunks `open → done 2026-09-02` with `resolution-undo: 41838b7d5d1cd4d3eab8fc2b81bcbe63090ee4682d07e1b39bb448e0c2be82f6` 64-hex; `sprint-status.yaml` must stay untouched. | 1 | 2 | 2 | Monitor — `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty; ledger `rg -n "41838b7d" deferred-work.md` 1 hit per entry (2 total) + `git diff HEAD -- deferred-work.md` 2 hunks only. Any reopen must keep hash. This plan never writes ledger or status. |
| R-009 | TECH | **Exploratory: Engine purity — `triade/App.tsx` must not change `src/engine/**` (`newGame/move` pure) and must not introduce `Math.random` behind the RNG seam.** The sweep keeps Engine byte-identical and uses only `mulberry32` increment, never `Math.random`. | 1 | 1 | 1 | Monitor — `git diff HEAD -- triade/src/engine` empty + `rg -n "Math\\.random" triade/App.tsx triade/src/engine` 0 hits in `App.tsx` (engine `game.ts:20` default `Math.random` is allowed engine default, not used by App); both `tsc --noEmit` clean. |
| R-010 | PERF | **Per-newGame `resolveGridSize`-free reseed O(1) — `rngSeedRef.current +=1; rngRef.current = mulberry32(nextSeed)` is two ops, no allocation beyond one closure; no frame budget impact.** | 1 | 1 | 1 | Monitor — `npm test` wall-clock gate `<15 min`; no device lane needed (App host-only `node:test` + `tsc`). |
| R-011 | TECH | **Rapid double-restart seed collision — two `handleRestart` in sequence must produce `20260809` then `20260810`, boards differ from two `newGame(mulberry32(20260808))` with same seed (which would repeat).** Runtime pin covers via `+1` vs same-seed deepEquals check. | 1 | 1 | 1 | Monitor — runtime P2 pin in `app.forfeited-continue-rng-reseed.test.ts` `same-seed → same board` + `+1 seed → board differs` (best-effort, may rarely collide but still proves increment). |

### Risk Category Legend

- **TECH**: dead-state flag not gating `ContinueBudget`, reseed duplicated in two call-sites, `handleRestart` inlines vs `resetAssistance`, slice-window brittleness, `useEffect` one-render delay, reseed-before-newGame order
- **DATA**: board `9-tile` shape vs `GRID_SIZE` contract unchanged, seed monotonicity `+1` vs `Date.now`, Engine purity `src/engine` byte-identical
- **BUS**: `forfeitedContinue` enabler for future `continueCredit/reviveCount` gate vs current vacuous Clean lane (no per-level wiring)
- **OPS**: `deferred-work.md` `41838b7d` 64-hex ledger 2 hunks, `sprint-status.yaml` orchestrator ownership (never write/revert)
- **SEC**: n/a for this bundle (no tokens/network/store)
- **PERF**: per-`newGame` reseed O(1) `<0.01 ms`; no device lane — pure `App.tsx` + host pins

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category    | Requirement / Threshold | Risk Link | Planned Validation                         | Evidence Needed                  |
| --------------- | ----------------------- | --------- | ------------------------------------------ | -------------------------------- |
| Reliability | App never-throws on `handleRestart / applyLaneSelection / handleContinueAd/Iap` for any valid `GameState/Rng/canContinue` — reseed `+1` + `mulberry32` never throws, `forfeitedContinue` deaths idempotent | R-002,R-003,R-006 | Host `app.forfeited-continue-rng-reseed.test.ts` 3 pass + `app.restart.test.ts` 5 pins + full `npm test` ~950 pass still green | `npm test -- triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts` pass 3; `npm test` full log; `npx tsc --noEmit` clean |
| Determinism | `mulberry32(seed)` determinism: `newGame(mulberry32(20260808))` twice → identical `board + pendingSpawn` (same seed → same board); `newGame(mulberry32(20260808))` vs `newGame(mulberry32(20260809))` → different `board/pendingSpawn` (increment continuity); draw-budget `effective 3 / noop 0 / newGame 20` preserved via `rngOf/spyRng` gate | R-007,R-011 | Host `app.forfeited-continue-rng-reseed.test.ts` runtime determinism pin + `game.test.ts` draw-budget pins still green | `app.forfeited-continue-rng-reseed.test.ts` runtime log + `game.test.ts` draw-budget pins 10/20/50-move replays |
| Maintainability | Single `20260808` seed literal in `rngRef` + `rngSeedRef` decls; single `forfeitedContinue` state; `DW-86`/`DW-93` comment pins `2 + 2` hits; no `Math.random` in App; Engine `src/engine/**` byte-identical | R-001,R-004,R-009 | Static scans `rg -n "20260808" App.tsx` 2 hits + `rg -n "DW-86.*forfeitedContinue" App.tsx` + `rg -n "DW-93.*RNG reseed" App.tsx` + `git diff HEAD -- triade/src/engine` empty | `rg` scan logs + `tsc --noEmit` both configs clean |
| Performance | Per-newGame reseed `+=1 + mulberry32` O(1) `<0.01 ms`, no animation gate impact (still `busyRef` + `fallbackBusyTimer` 420 ms), full `npm test` gate `<15 min` | R-010 | Host wall-clock `npm test` gate; `tsc` both configs `<5 s` | Wall-clock log + `tsc` log; no device lane needed |
| Compliance / Contract | `Board/Cell/Direction/GameState` public types unchanged; `ContinueBudget/HintBudget/UndoBudget` shapes unchanged; `GameOverOverlay` thin-view still `canContinue→slot` unchanged | R-001 | `rg` scans `export type Board` + `GRID_SIZE` + `BoardConfig` each stable; `tsc` clean; `app.restart.test.ts` AC1/AC2 order pin proves `handleRestart` still `newGame→setGame→setMoveResult(null)→setMatch→setMatchStats→busyRef=false` | `triade/src/types` shape scan + `tsc` clean + `app.restart.test.ts` pass 5 |
| Security | N/A — no secrets/tokens/network/store/attester in scope | - | N/A | N/A |

**Unknown thresholds:** Non-deterministic `Date.now` seeding has no spec'd threshold — intentionally `+1` increment today; enabling `Date.now` would require new thresholds for display-roll distribution and snapshot drift. `forfeitedContinue` gating of a future `continueCredit` has no threshold today (dead-state); enabling the gate requires new thresholds for `orchestratorCanContinueForState` including the flag. All App NFR thresholds derive from `triade/App.tsx:102-966` existing contracts and are not re-quantized in this hardening.

---

## Entry Criteria

- [ ] Working-tree is `1052600` + 5-file tracked diff (`App.tsx` 29 + `deferred-work.md` 8 + 3 test slice widenings) + 2 untracked (`spec-*.md` 80 + `app.forfeited-continue-rng-reseed.test.ts` 106) — `git status --short` shows `M` 5 + `??` 2, `git diff HEAD --stat` 5 files `40/7` tracked, `git diff HEAD -- triade/src/engine` empty, `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty
- [ ] Helpers `triade/test-utils/helpers.ts` expose `stripCommentsAndStrings` (from `helpers.ts:279`) and `triade/src/utils/mulberry32.ts` deterministic seam `mulberry32(seed)` available for replay variants
- [ ] Engine contract `GRID_SIZE=4`, `FIXED_WEIGHTS/POT_WEIGHT` unchanged (no weight/size drift beyond RNG seam) — `git diff HEAD -- triade/src/engine` empty
- [ ] Feature deployed to host harness (`node --import tsx --test` resolves `tsx` + `tsconfig.test.json`) — no Expo/Skia/RNGH runtime needed for App.tsx pins (source-pin + mulberry32 replay, no device lane)

## Exit Criteria

- [ ] All P0 7 groups passing including `forfeitedContinue` declaration + set/die + reseed-before-newGame + `handleRestart` order + continue dies-on-attempt + runtime determinism replay
- [ ] All P1 6 groups passing (useEffect guard, `resetAssistance` vs `handleRestart` parity, lane-switch reseed parity, Ad vs Iap parity, slice-window tolerance, Engine purity)
- [ ] No open high-priority (≥6) risks unmitigated (R-001 + R-002 each 6) — mitigations are runtime `rg / deepEqual / slice` pins not just header docs
- [ ] Test coverage agreed as sufficient (7 P0 + 6 P1 + ledger + Engine purity on top of ~950 baseline)
- [ ] `npx tsc --noEmit` clean (both `triade/tsconfig.json` + `tsconfig.test.json` if present), `rg -n "Math\\.random" triade/App.tsx` 0 hits, `sprint-status.yaml` untouched (`git diff HEAD --` empty)

## Project Team (Optional)

| Name   | Role     | Testing Responsibilities |
| ------ | -------- | ------------------------ |
| Eduardo | FE / Test Architect | Owns forfeitedContinue + RNG reseed pin hygiene, `rg` `forfeitedContinue/rngSeedRef/mulberry32` scans, ledger `41838b7d` + orchestrator `sprint-status.yaml` ownership gate |
| Murat (TEA) | QA / NFR assessor | Owns reliability/determinism/maintainability/perf compliance, `nfr-assess` header thresholds vs `nfr-criteria.md` mapping |

---

## Test Coverage Plan

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| `forfeitedContinue` state declaration + set-on-game-over guard + never-carried | Unit | R-001 | 1 | QA | `App.tsx:128` `const [forfeitedContinue, setForfeitedContinue] = useState(false)` + `src.includes('setForfeitedContinue(true)')` + `/gameOver\s*&&\s*canContinueDerived/` guard scan; `useEffect` guard `&& !forfeitedContinue` idempotency |
| `forfeitedContinue` dies on every continue attempt — `handleContinueAd` + `handleContinueIap` + after-orchestrator second death | Unit | R-001,R-002 | 1 | QA | `src.slice(handleContinueAd, +1500/2200)` + `handleContinueIap +800` each `includes('setForfeitedContinue(false)')`; `(src.match(/setForfeitedContinue\(false\)/g) || []).length >=3` (restart + Ad + Iap + resetAssistance) |
| `forfeitedContinue` dies on new game — `handleRestart` + `resetAssistance` + never-carried into next match | Unit | R-001,R-004 | 1 | QA | `handleRestart` slice `+1200/1600` `includes('setForfeitedContinue(false)')` + `resetAssistance` slice `+800` + `// DW-86: forfeitedContinue dies with new game` comment pin |
| `handleRestart` order preserved — `newGame→setGame→setMoveResult(null)→setMatch→setMatchStats→busyRef=false` still pinned inside widened `1200` window (R-002 guard) | Unit | R-002 | 1 | QA | `app.restart.test.ts:148` `order` regex array `const s = newGame(rngRef.current) → setGame(s) → setMoveResult(null) → setMatch(initialScore(...)) → setMatchStats(initialStats(...)) → busyRef.current = false` in `handleSlice +1200` (not just slice existence) |
| `rngSeedRef` declaration + increment + `mulberry32` reseed before `newGame` in `handleRestart` | Unit | R-003,R-006 | 1 | QA | `App.tsx:103` `const rngSeedRef = useRef(20260808)` + `rngSeedRef.current += 1` + `rngRef.current = mulberry32(rngSeedRef.current)` + `handleRestart` `reseedIdx < newGameIdx` order pin (`+900` window) |
| `rngSeedRef` reseed in `applyLaneSelection` needsReset branch (parity with `handleRestart`) | Unit | R-003,R-006 | 1 | QA | `applyLaneSelection` slice `+1800` `rngSeedRef.current` + reseed pattern near `newGame(rngRef.current)` when `needsReset`; `rg -n "rngSeedRef.current \+= 1" App.tsx` 2 hits total |
| `mulberry32` determinism replay — same seed → same `board+pendingSpawn`, `+1` seed → different `board/pendingSpawn` (DW-93 runtime proof) | Unit | R-007,R-011 | 1 | QA | `app.forfeited-continue-rng-reseed.test.ts` `newGame(mulberry32(20260808))` ×2 `deepEqual board` + `newGame(mulberry32(20260808))` vs `newGame(mulberry32(20260809))` `!deepEqual` (best-effort, logs if collide) + `DW-93` comment pin `DW-93.*RNG reseed` |

**Total P0**: 7 tests, ~1.0 hour

### P1 (High)

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| `useEffect` guard shape `gameOver && canContinueDerived && !forfeitedContinue` + deps `[gameOver, canContinueDerived, forfeitedContinue]` | Unit | R-005 | 1 | QA | `rg -n "gameOver && canContinueDerived" App.tsx` 1 + `rg -n "useEffect\(\(\) =>" App.tsx` near DW-86 comment + `&& !forfeitedContinue` idempotency scan |
| `resetAssistance` vs `handleRestart` parity — both die with match (future drift watch) | Unit | R-004 | 1 | QA | `resetAssistance` slice `+800` `setForfeitedContinue(false)` + `handleRestart` slice `+1200` `setForfeitedContinue(false)` + `DW-86: forfeitedContinue dies with match` vs `dies with new game` 2 comments |
| `applyLaneSelection` vs `handleRestart` reseed parity — both `rngSeedRef.current +=1` + `rngRef.current = mulberry32(...)` before `newGame` | Unit | R-003 | 1 | QA | `rg -n "rngRef\.current = mulberry32" App.tsx` 2 hits + both slices `reseedIdx < newGameIdx` |
| `handleContinueAd` vs `handleContinueIap` die-on-attempt parity (both have top `setForfeitedContinue(false)` even before budget check + second death after) | Unit | R-001 | 1 | QA | `handleContinueAd` slice `+1500` top `setForfeitedContinue(false)` before `hasNoAds` + `adBusyRef` guard + `+2200` after-orchestrator second death; `handleContinueIap` slice `+800` top + after |
| Slice-window tolerance — `app.restart` `700→1200`, `app.contextualHelp` `900→1300`, `app.continueAd` `1500→2200` still contain expected tokens (`newGame`, `setBannerDismissed`, `granted`) | Unit | R-002 | 1 | QA | `app.restart.test.ts` `handleSlice +1200` still `rngRef.current` + `persistedBest`; `app.contextualHelp.test.ts` `restartSlice +1300` `setBannerDismissed`; `app.continueAd.test.ts` `slice +2200` `granted` + `orchestratorConsumeContinueAd` |
| Engine purity + no `Math.random` creep in App | Unit | R-009 | 1 | QA | `git diff HEAD -- triade/src/engine` empty + `rg -n "Math\\.random" triade/App.tsx` 0 + `rg -n "mulberry32" triade/App.tsx` 3 hits (decl + 2 reseeds) + both `tsc --noEmit` clean |

**Total P1**: 6 tests, ~0.9 hours

### P2 (Medium)

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| Idempotency — `forfeitedContinue` set only once per game-over (`&& !forfeitedContinue` prevents loop) | Unit | R-005 | 1 | QA | `useEffect` dependency includes `forfeitedContinue` + guard; `setForfeitedContinue(true)` called once not on every `gameOver` re-render |
| Rapid double-restart — two `handleRestart` in sequence produce `20260809` then `20260810`, boards differ from same-seed repeat | Unit | R-011 | 1 | QA | Runtime `newGame(mulberry32(seed))` vs `newGame(mulberry32(seed+1))` + `same-seed → same board` deepEquals; seed monotonicity via `rgSeedRef` `+=1` per newGame |
| Ledger `resolution-undo: 41838b7d…` 64-hex for 2 DW entries | Unit | R-008 | 1 | QA | `rg -n "41838b7d" deferred-work.md` 2 hits (one per DW-86/DW-93); `git diff HEAD -- deferred-work.md` 2 hunks; `rg -n "status: done 2026-09-02" deferred-work.md` 2 hits |
| `AC6/7 forfeited continue dies` comment still present alongside state (ADR-02) | Unit | R-001 | 1 | QA | `handleRestart` slice `+1200` `includes('forfeited continue dies')` pin (single discard point) — still in `app.restart.test.ts` |

**Total P2**: 4 tests, ~0.6 hours

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement   | Test Level | Test Count | Owner | Notes   |
| ------------- | ---------- | ---------- | ----- | ------- |
| Exploratory App-render integration — mount `App` via `renderHook`/`@testing-library/react-native` and assert `forfeitedContinue` flag not exposed in snapshot (dead-state proof) + two restarts boards differ via transcript | Component | 1 | QA | Defer: not host-only, requires RN/Expo harness + gesture; not gate for this sweep. Pin stays source-only today. |

**Total P3**: 1 test, ~0.4 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] `npx tsc --noEmit` clean (30s)
- [ ] `rg -n "forfeitedContinue" triade/App.tsx` 8 hits (10s)
- [ ] `rg -n "rngSeedRef" triade/App.tsx` 4 hits (`useRef(20260808)` 1 + `+=1` 2 + `mulberry32(rngSeedRef.current)` 2, but one overlap) (10s)
- [ ] `rg -n "41838b7d" _bmad-output/implementation-artifacts/deferred-work.md` 2 hits (10s)

**Total**: 4 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [ ] `forfeitedContinue` declaration + set/die + never-carried (unit via `app.forfeited-continue-rng-reseed.test.ts` 1 pass)
- [ ] RNG reseed before `newGame` in both `handleRestart` + `applyLaneSelection` (unit)
- [ ] `handleRestart` order `newGame→setGame→…→busyRef=false` still pinned in `1200` window (unit via `app.restart.test.ts` 5 pass)
- [ ] Runtime determinism `same-seed same board / +1 seed different board` (unit)

**Total**: 7 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] `useEffect` guard + `resetAssistance` vs `handleRestart` parity + Ad vs Iap parity (unit)
- [ ] Slice-window tolerance (`app.restart` 1200 + `app.contextualHelp` 1300 + `app.continueAd` 2200) + Engine purity `Math.random` 0 (unit)

**Total**: 6 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] Idempotency `&& !forfeitedContinue` + rapid double-restart + ledger 64-hex + `AC6/7` comment + exploratory App-render not gate (unit + component exploratory)

**Total**: 5 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority  | Count             | Hours/Test | Total Hours       | Notes                   |
| --------- | ----------------- | ---------- | ----------------- | ----------------------- |
| P0        | 7        | 0.15        | ~0.9–1.3        | Source-pin + reseed order + determinism |
| P1        | 6        | 0.15        | ~0.7–1.1        | Guard parity + slice tolerance + purity |
| P2        | 4        | 0.15        | ~0.5–0.8        | Idempotency + ledger + comment |
| P3        | 1        | 0.4        | ~0.3–0.5        | Exploratory App-render (defer, RN harness) |
| **Total** | **18** | **-**      | **~2.0–3.8** | **~0.3–0.5 day**  |

### Prerequisites

**Test Data:**

- `mulberry32(seed)` deterministic (from `triade/src/utils/mulberry32.ts`)
- `newGame(rng)` draws 20 on init (9 tiles `pickIndex + weightedValue` 18 draws + `resolveSpawn + displayRoll` 2) — `triade/src/engine/core/game.ts:27-36`
- `stripCommentsAndStrings` helper (from `triade/test-utils/helpers.ts:279`) for source-pin stripping when needed

**Tooling:**

- `node --import tsx --test` host harness (`tsx` + `tsconfig.test.json`) for all `triade/App.tsx` source-pins + `src/engine` pure TS — no Expo/Skia/RNGH harness needed
- `rg` static scans for `forfeitedContinue`, `rngSeedRef`, `mulberry32`, `41838b7d`, `Math.random`, `sprint-status.yaml` ownership

**Environment:**

- `npx tsc --noEmit --project triade/tsconfig.json` clean (or root `tsconfig.json` if `triade/tsconfig.json` not present)
- Working-tree is `1052600` + 5-file tracked diff + 2 untracked (spec + test) — `git diff HEAD --stat` 5 files `40/7`, `git status --short` `M 5 / ?? 2`, `git diff HEAD -- triade/src/engine` empty

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers (R-001 + R-002 each 6)

### Coverage Targets

- **Critical paths**: ≥80% (all `forfeitedContinue` set/die sites + both RNG reseed sites + `handleRestart` order)
- **Validation gate**: 100% (`forfeitedContinue` never-carried + reseed-before-newGame in both restart paths)
- **Business logic**: ≥70% (slice-window tolerance + Engine purity + ledger)
- **Edge cases**: ≥50% (idempotency `&& !forfeitedContinue`, rapid double-restart, `Date.now` not used)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (7/7)
- [ ] No high-risk (≥6) items unmitigated (R-001 + R-002)
- [ ] Source-pin `forfeitedContinue` declare + `setForfeitedContinue(true)` guarded by `gameOver && canContinueDerived` + `setForfeitedContinue(false)` ≥4 passes 100%
- [ ] `npm test -- triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts` 3 pass + `npm test` full gate ~950 pass (no regression)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers

---

## Mitigation Plans

### R-001: Dead-state forfeitedContinue not gating ContinueBudget (Score: 6)

**Mitigation Strategy:** Pin dead-state explicitly and gate future work: (1) add `forfeitedContinue` state that is set only when `gameOver && canContinueDerived` and dies on any `handleContinueAd/Iap` attempt and on `handleRestart`/`resetAssistance` new-game — already done in `App.tsx:128,237,260,443,740,792,961`. (2) keep `canContinueDerived` deriving solely from `ContinueBudget` via `orchestratorCanContinueForState` (no `forfeitedContinue` read) — pin via `rg -n "canContinueDerived.*orchestratorCanContinueForState" App.tsx`. (3) future story that adds `continueCredit` must insert gating read + new P0 tests; trip-wire is spec `Block If: Need to change ContinueBudget shape`.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-86)
**Status:** Planned (implemented, source-pin verified)
**Verification:** `rg -n "forfeitedContinue" App.tsx` 8 hits + `rg -n "canContinue" triade/src/game/assistance.ts` unchanged + `npm test -- app.forfeited-continue-rng-reseed.test.ts` 3 pass + `npx tsc --noEmit` clean.

### R-002: Slice-window brittleness 700→1200/1500→2200 hides handleRestart order regression (Score: 6)

**Mitigation Strategy:** Keep order assertion, not just presence: `app.restart.test.ts:148` `order` regex array `newGame(rngRef.current) → setGame(s) → setMoveResult(null) → setMatch(initialScore(...)) → setMatchStats(initialStats(...)) → busyRef.current = false` must be found **in that order** inside the widened `1200` window. Keep `forfeited continue dies` comment pin and `persistedBest` lane pin in same window. Track slice widths in this plan; future widening beyond `1200/2200` needs explicit justification and diff review.

**Owner:** FE lead
**Timeline:** Immediate
**Status:** Planned
**Verification:** `npm test -- app.restart.test.ts` 5 pass + `rg -n "handleRestart" App.tsx` adjacency scan + `app.forfeited-continue-rng-reseed.test.ts` still checks `reseedIdx < newGameIdx` via `src.indexOf` order.

---

## Assumptions and Dependencies

### Assumptions

1. `forfeitedContinue` as dead-state (set but not gating) is intentional for this DW bundle — AC6/7 is vacuous in Clean single-lane, the flag is a future pin not an enforcement today.
2. `rngSeedRef +=1` increment is the chosen RNG continuity model — not `Date.now()` — so first game after reload still `20260808` and host snapshots stay deterministic.
3. `handleRestart` duplicating `resetAssistance` budget resets + `forfeitedContinue` death is known tech debt accepted for this low-risk insertion — future drift is tracked by R-004.
4. Slice widenings `700→1200` etc are the minimal needed to keep existing 5+2+1 pins green after two small insertions — not a license for future bloat.

### Dependencies

1. `triade/src/utils/mulberry32.ts` deterministic `mulberry32(seed)` — Required by any replay/determinism pins.
2. `triade/test-utils/helpers.ts` `stripCommentsAndStrings` + `rngOf/spyRng/boardWith` fixtures — Required by source-pins when stripping comments/strings.

### Risks to Plan

- **Risk**: A follow-on story enables `continueCredit` by adding a new budget field and forgets to check `forfeitedContinue` in `orchestratorCanContinueForState`, allowing two continues per match or carrying credit to next match.
  - **Impact**: Second continue revives a game-over board that AC6/7 says should be forfeited — violates ADR-02 die-with-match (per-match budget leak).
  - **Contingency**: Require a new `bmad-testarch-test-design` run with NFR `reliability` thresholds re-quantized for the continue gate and a P0 `orchestratorCanContinueForState` pin that includes `forfeitedContinue` before merging the story.

---

## Follow-on Workflows (Manual)

- Run `*atdd` to generate failing P0 tests (separate workflow; not auto-run).
- Run `*automate` for broader coverage once implementation exists.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: Date:
- [ ] Tech Lead: Date:
- [ ] QA Lead: Date:

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact         | Regression Scope                |
| ----------------- | -------------- | ------------------------------- |
| **`triade/App.tsx:102-966` (forfeitedContinue + rngSeedRef + handleRestart/applyLaneSelection/handleContinueAd/Iap + resetAssistance + useEffect)** | Every App consumer — `newGame` now reseeded via `+1` increment, `forfeitedContinue` adds one `useState` + one `useEffect` render; `handleRestart`/`applyLaneSelection` reseed before `newGame`, `handleContinueAd/Iap` clear flag on attempt, `resetAssistance` clears flag die-with-match. No `Engine` contract change; `GameOverOverlay` still `canContinue→slot` via `canContinueDerived`. | `npm test -- triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts` 3 pass + `app.restart.test.ts` 5 pass + `app.continueAd.test.ts` 1 pass + `app.contextualHelp.test.ts` 1 pass must stay; `npm test` full ~950 pass / `npx tsc --noEmit` clean; `git diff HEAD -- triade/src/engine` stays empty; `git diff HEAD -- sprint-status.yaml` empty |
| **`triade/__tests__/ui/components/app.restart.test.ts + app.continueAd.test.ts + app.contextualHelp.test.ts` (slice windows widened)** | All 3 pinned files import `App.tsx` source for `rg`/`slice` checks; widening from 700–1500 to 1200–2200 keeps them green but weakens sensitivity to order drift (R-002). | `app.restart.test.ts` order regex still `newGame→setGame→setMoveResult(null)→setMatch→setMatchStats→busyRef=false` in `1200` window; `app.contextualHelp` `setBannerDismissed` still in `1300`; `app.continueAd` `granted` + `orchestratorConsumeContinueAd` still in `2200` — future widening beyond must be justified |
| **`_bmad-output/implementation-artifacts/deferred-work.md` (DW-86 + DW-93 `open→done` 2 hunks)** | Ledger bookkeeping for this bundle — `resolution: resolved by sweep bundle dw-forfeited-continue-rng-reseed` + `resolution-undo: 41838b7d…` 64-hex | `rg -n "41838b7d" deferred-work.md` 2 hits; any `open→done` beyond these 2 DWs would violate Not in Scope; any `sprint-status.yaml` hunk would violate ownership |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology (P×I 1–9, ≥6 HIGH, 9 CRITICAL block)
- `test-levels-framework.md` - Test level selection (Unit for pure `forfeitedContinue/mulberry32/newGame`; no E2E needed for this seam)
- `test-priorities-matrix.md` - P0-P3 prioritization (P0 = blocks forfeited-continue/RNG journey + high risk + no workaround)
- `nfr-criteria.md` - NFR thresholds & planned evidence (reliability/determinism/maintainability/perf)

### Related Documents

- PRD: n/a (sweep bundle — deferred-work DW-86 + DW-93)
- Epic: n/a (DW bundle `dw-forfeited-continue-rng-reseed`)
- Architecture: `triade/App.tsx:forfeitedContinue + rngSeedRef` contract + `triade/src/utils/mulberry32.ts` determinism seam
- Tech Spec: Working-tree diff vs `1052600` (5 tracked `40/7` + 2 untracked `186` lines) as above
- Spec: `_bmad-output/implementation-artifacts/spec-forfeited-continue-rng-reseed.md` (intent contract + I/O matrix + code map + verification)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)

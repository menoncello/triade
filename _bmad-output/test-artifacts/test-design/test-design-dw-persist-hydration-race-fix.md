---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - 'triade/App.tsx'
  - 'triade/src/game/matchScore.ts'
  - 'triade/src/services/storage/settingsStore.ts'
  - 'triade/__tests__/game/matchScore.test.ts'
  - 'triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts'
  - 'triade/__tests__/ui/components/app.gameOverWiring.test.ts'
  - 'triade/__tests__/ui/components/app.restart.test.ts'
  - 'triade/__tests__/engine/defensive-guards.atdd.test.ts'
  - '_bmad-output/implementation-artifacts/spec-persist-hydration-race-fix.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-persist-hydration-race-fix — hydrationOk gating + sessionStartBest update + pendingSave await + finite guards

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-persist-hydration-race-fix`
**Scope:** Targeted test design for the working-tree delta of `dw-persist-hydration-race-fix` (DW-87, DW-97, DW-98, DW-99, DW-100)

> **Delta under assessment:** Commit `5eaeb51 fix(persist): hydration race + sessionStart stale + finite guards (DW-87,97,98,99,100)` vs baseline `596add4` — 2 tracked files, `169 insertions / 16 deletions`:
> - `triade/src/game/matchScore.ts:1-31` — `initialScore(best)` now `Number.isFinite(best) && best>=0 ? best : 0`; `applyMove` now sanitizes `curScore/curBest` + `safeScore` with `Number.isFinite && >=0` and `safeScore fallback curScore`; `isNewRecord(previousBest, score)` now `if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<0) return false; return b>a`.
> - `triade/App.tsx:111-114,181-244,458-477,993-1073` — NEW `pendingSaveByLaneRef: Record<LaneId, Promise<boolean>|null>` + `persistedBestByLaneRef: Record<LaneId, number>` (mirror for state-async window); hydration `byLane` now sets `hydrationOkByLaneRef`, `sessionStartBestByLaneRef`, **and** `persistedBestByLaneRef` + state; NEW `useEffect(()=>persistedBestByLaneRef.current=persistedBestByLane,[persistedBestByLane])` sync; persist `useEffect` now sanitizes `match.best/persistedBest` to finite `>=0`, gates `isNewRecord(sessionStartBest, sanitizedMatchBest) && sanitizedMatchBest>sanitizedPersisted` and `hydrationOkRef`, creates `pendingSaveByLaneRef[current]=saveBestForLane(...).then(ok=>{ if(ok){setPersisted(...); persistedBestByLaneRef[...]=...; sessionStartBestByLaneRef[...]=...}}) .finally(clear)`. `handleRestart` is now `async`, `await pendingSaveByLaneRef[active].catch(()=>{})` before `newGame` and reads `persistedBestByLaneRef.current[active]` for `initialScore` (not state). Render now `sanitizedScore/sanitizedBest/sanitizedPersisted` for `Hud` + `stats` text, and `GameOverOverlay stats` sanitized via `match.score===match.score && Number.isFinite(match.score) && match.score>=0 ? match.score : 0`, and `isNewRecord` prop is `isNewRecord(sessionStartBestRef[active], match.score) && hydrationOkByLaneRef[active]` (gate).
> - `_bmad-output/implementation-artifacts/spec-persist-hydration-race-fix.md:1-117` — NEW spec — intent contract, boundaries, 8-row I/O matrix, code map, tasks/AC, design notes, verification.
> - `_bmad-output/implementation-artifacts/deferred-work.md:747,835,845,855,865` — 5 ledger entries flipped `open → done 2026-09-02` with `resolution: resolved by sweep bundle dw-persist-hydration-race-fix` + `resolution-undo: d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822` 64-hex (`resolution-undo` is literal hex of ascii "status: open" — see `git diff HEAD -- deferred-work.md` 5 hunks grouped as 4 visible + 1 with context). Decision lines each `2026-09-02` verb per DW.
> - `sprint-status.yaml` is **orchestrator-owned** and intentionally not in scope — no write, no revert (`git diff HEAD -- sprint-status.yaml` must stay empty).

---

## Executive Summary

**Scope:** Close five medium pre-existing persist/hydration races that the specs classified as `medium`/`verify-only` and deferred: `DW-87` degraded hydration (`ok:false` best 0 + `sessionStartBestRef=0` false-positive highlight), `DW-97` same false-positive but gated on highlight, `DW-98` stale `sessionStartBestByLaneRef` across a second game in the same session, `DW-99` async `saveBest` racing `handleRestart` (stale `persistedBest` 100 vs 150), and `DW-100` non-finite/corrupt inputs (`-5/NaN/Infinity` → `"NaN"` or false highlight). `triade/App.tsx:75-82 + 103-110` previously seeded `initialScore(persistedBest)` from `[persistedBest]` only and fired `saveBest` fire-and-forget vs restart. The sweep keeps the per-lane storage contract (no new keys, no schema change, `ok:false` never persists) and confines all fixes to `triade/App.tsx` + `triade/src/game/matchScore.ts`, adding a gate (`hydrationOkByLaneRef && isNewRecord`), a ref update on save resolution, a per-lane pending promise + mirror ref with `await pending` in `handleRestart`, and `Number.isFinite` guards both in pure helpers and at JSX boundaries (`Hud`/overlay/`stats` text). `GameOverOverlay/Hud` highlight color `#E8A33D` and lane wall are byte-identical.

**Risk Summary:**

- Total risks identified: 11
- High-priority risks (≥6): 4 (degraded hydration false-positive, stale multi-game, race restart stale, non-finite render/highlight)
- Critical categories: DATA (hydration degraded best 0, stale sessionStart, race stale persistedBest, non-finite persisted injection), BUS (record highlight correctness), TECH (async handleRestart Promise<void> vs () => void, ref/state mirror divergence, sanitization idiom drift, lane-switch persist transient)

**Coverage Summary:**

- P0 scenarios: 8 groups (HYDRO_DEGRADED gated false, STALE_MULTI_GAME sessionStart update after save resolve, RACE_RESTART await pending before initialScore, NON_FINITE isNewRecord false + no NaN render, initialScore/applyMove sanitization, NO_RECORD_EQUAL + FIRST_GAME_ZERO boundaries, Hud/overlay sanitized JSX, persist effect only when sanitizedMatchBest > sanitizedPersisted && hydrationOk)
- P1 scenarios: 6 groups (persistedBestByLaneRef mirror sync, sanitizedMatchBest/ sanitizedPersisted finite guards parity, handleRestart async try/catch non-blocking, lane isolation clean vs accelerated, isNewRecord short-circuit order, ledger 64-hex retrievability)
- P2/P3 scenarios: 5 groups (NEGATIVE_SCORE_SANITIZE via applyMove, overflow >1e9 still deferred, rapid lane-switch before save resolve, saveBest rejection no state update, exploratory App mount with corrupt MMKV bypass)
- **Total effort**: ~2.8–4.8 hours (~0.35–0.6 day; host-only `node:test` + `tsc --noEmit`, no device lane — pure `triade/src/game/matchScore.ts` + `triade/App.tsx` + `triade/__tests__/ui|game` TS, `npm --prefix triade test` + `npx tsc --noEmit --project triade/tsconfig.json` `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score/spawn/ceiling logic, `FIXED_WEIGHTS/POT_WEIGHT`, `ceilingDetector/tierForCeiling/potForTier`, `GameBoard` Skia, `GameOverOverlay` accent `#E8A33D` ternaries beyond gating, `layout.ts/Hud.tsx` overflow `>1e9` (DW-101), `assistance.ts/ContinueBudget`, `rewardedAds/RevenueCat`** | Delta explicitly `Never: Modify deferred-work ledger; create new storage keys/files; change clean/accelerated separation beyond listed race/guard fixes; introduce background-detached subagents` and `Block If: Changing storage schema/keys, touching files outside App.tsx + matchScore.ts, or altering GameOverOverlay/Hud highlight color or isNewRecord ternary locations would require human review`. `git diff HEAD~1 -- triade/src/engine triade/src/ui/GameOverOverlay.tsx` empty / unchanged. | Existing `npm test` full gate (~950 pass per spec `Auto Run Result`) stays invariant; `game.test.ts/line.test.ts/spawn.test.ts/ceiling.test.ts` not in delta — regression caught by baseline. DW-101 overflow explicitly `Pré-existente, fora de MVP` deferred. |
| **Changing storage schema/keys, adding new MMKV keys, migrating `persistedBest` to new namespace, or altering `LoadAllBests/parseBest` validation** | Spec `Always: All writes remain per-lane via saveBestForLane/activeLaneId; ok:false never allowed to persist`. Adds only in-memory refs + sanitization, no new keys. | Pinned via `rg -n "STORAGE_KEYS" triade/App.tsx` unchanged + `rg -n "saveBestForLane" App.tsx` still single call-site in persist effect; `settingsStore.ts` byte-identical except read path. |
| **Board `role="grid"` a11y, dev-build physical device, frame-rate bench, `reducedMotion` gate beyond existing, `laneDefault`/`hasSeenToneScreen` hydration** | No a11y/bench/layout code touched beyond `Hud/overlay/stats` sanitization (value clamp only). | Existing suites + manual-validation domain remain. |
| **Editing `sprint-status.yaml` or deferred-work beyond the 5 DW entries (DW-87,97,98,99,100)** | `sprint-status.yaml` is orchestrator-owned (`never write it, and never revert`). `deferred-work.md` change is exactly 5 entries flipped `open → done 2026-09-02` with `resolution: resolved by sweep bundle dw-persist-hydration-race-fix` + `resolution-undo: d0e7d75…` 64-hex (`git diff HEAD -- deferred-work.md` 5 hunks). | This plan never writes `sprint-status.yaml`; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty in CI. Ledger already records the correct hash (hex of ascii "status: open" for reversible close). |
| **Persisting `pendingSaveByLaneRef` itself or making hydration `ok:false` persistable** | Spec `Always: ok:false never allowed to persist (gated before save)` and Approach `Gate every isNewRecord on hydrationOkByLaneRef`. Pending ref is `useRef` memory only, never serialized. | Pinned via `rg -n "hydrationOkByLaneRef.current\[activeLaneId\]" App.tsx` gate at persist effect top `if(!hydrationOk) return` + `rg -n "pendingSaveByLaneRef" App.tsx` 5 hits all `useRef/Promise<boolean>|null` memory only. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Good.** `matchScore.ts` is pure `initialScore/applyMove/isNewRecord` with `Number.isFinite` guards — fully controllable via `node:test` imports without RN harness. `App.tsx` hydration seams are controllable via `setStorageBackendForTests` fake + `loadAllBests()` returning `{best, ok}` per lane; `hydrationOkByLaneRef`/`sessionStartBestByLaneRef`/`persistedBestByLaneRef`/`pendingSaveByLaneRef` are `useRef` locals whose lifecycle is testable via source-pin (`stripCommentsAndStrings` + `src.includes/slice/indexOf`) and via `App.tsx` source scans without mounting. `saveBestForLane` is async fake that can be made to delay (`await new Promise`) to exercise `handleRestart` await path. `initialScore` sanitization is `Number.isFinite(best) && best>=0 ? best : 0` — deterministic for any injected `best`.

**Observability — Good but ref-mirror thin.** `isNewRecord` false-positive/negative paths are observable via `matchScore.test.ts` direct imports and via `App.tsx` source pins: `rg "hydrationOkByLaneRef.current\[activeLaneId\].*isNewRecord"` and `rg "sessionStartBestByLaneRef.current.*=.*sanitizedMatchBest"` and `rg "pendingSaveByLaneRef.*await pending"`. Render sanitization is observable via `Hud` props (`sanitizedScore/sanitizedBest`) and `GameOverOverlay` `isNewRecord && hydrationOk` prop + `stats` sanitized ternary. The thin surface is that `persistedBestByLaneRef` mirrors `persistedBestByLane` state asynchronously — a divergence window exists between `setPersistedBestByLane` and `useEffect` sync, bridged by the `.then` ref write — observable only via ordering of `setPersisted` vs `persistedBestByLaneRef.current = {...}` in the `.then` (source-pin), not via runtime snapshot.

**Reliability — Strong on happy path, duplicated sanitize idiom on failure path.** All normal `loadAllBests ok:true → set refs+state`, `match.best valid → persist gated + await → ref update`, `isNewRecord finite → highlight` paths are `never-throws` (no throws in `matchScore.ts`, App guards coerce to 0). Both `tsc --noEmit` gates clean; `npm --prefix triade test` 950 pass per spec log. Two surfaces are thin: (a) `GameOverOverlay stats` sanitization uses `match.score === match.score && Number.isFinite(match.score) && match.score>=0 ? match.score : 0` (self-compare guards NaN) while `Hud` uses `Number.isFinite(match.score) && match.score>=0 ? match.score : 0` — idiom drift would hide a NaN on one surface (R-007). (b) `handleRestart` is `async () => Promise<void>` but `GameOverOverlay onRestart` is typed `() => void` — runtime ignores promise, no test break, but a future lint `no-floating-promises` would flag (R-005). Mitigated by `try/catch` inside await and `onRestart={handleRestart}` still valid (void accepts Promise<void> return).

**Testability Risks:** Two surfaces need pairing: (a) ref/state mirror — `persistedBestByLaneRef` could be deleted and `handleRestart` would read stale `persistedBestByLane` state (which is stale inside async window) — mitigated by pinning both `persistedBestByLaneRef.current[active]` read in `handleRestart` and sync `useEffect(()=>ref=current,[persistedBestByLane])`. (b) gate duplication — `hydrationOk` checked in persist effect **and** in `isNewRecord` prop — deleting one gate would still leave the other, so both must be pinned separately.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | DATA / BUS | **HYDRO_DEGRADED false-positive highlight + stale persist — `loadAllBests()` degraded returns `{best:0, ok:false}` but without gating `isNewRecord(0,50)=true` would light `"Novo recorde"` for a user whose real persisted best is 500, and the persist effect `isNewRecord(sessionStartBest 0, sanitizedMatchBest 50) && 50>0` would then `saveBestForLane(50)` overwriting 500 with 50.** Pre-existing, spec pins `Given hydrationOk false with persisted best 0, when match.score is 50, then isNewRecord false and no save` — the exact regression the sweep fixes. | 2 | 3 | **6** | Enforce gate at two layers: (a) **host P0 pins** `matchScore.ts` `isNewRecord` finite+negative guards **and** `App.tsx` `if(!hydrationOkByLaneRef.current[activeLaneId]) return` at persist effect top **and** `isNewRecord(sessionStartBestRef[active], match.score) && hydrationOkByLaneRef[active]` prop (both booleans) (b) **unit P0** `App` source-pin `hydrationOkByLaneRef.current[activeLaneId]` in persist effect + in `GameOverOverlay isNewRecord` prop (c) **spec AC** first criterion: `hydrationOk false, match.score 50 → isNewRecord false, no saveBestForLane`. | FE lead | Immediate (gate DW-97) |
| R-002 | DATA | **STALE_MULTI_GAME sessionStartBest — after a 100→150 record that saved and resolved, a second game scoring 120 with old `sessionStartBestByLaneRef` 100 would still `isNewRecord(100,120)=true` and light highlight even though `persistedBest` is already 150.** Spec note: `sessionStartBestRef` stays session-start to not leak `match.best`, but without update pós-persist the second game is false-positive. Fixed by `sessionStartBestByLaneRef.current[active]=sanitizedMatchBest` inside `saveBestForLane(...).then(ok=>{if(ok)...})`. | 2 | 3 | **6** | Enforce ref update: (a) **source P0 pin** `App.tsx` persist `.then((ok)=>{ if(ok){ setPersisted(...); persistedBestByLaneRef.current={...}; sessionStartBestByLaneRef.current={...sanitizedMatchBest...}}})` scanned inside persist effect (b) **unit P0** simulate `saveBestForLane` fake resolves true, assert `sessionStartBestByLaneRef.current[active]` becomes `sanitizedMatchBest` after `await pendingSave` (c) **spec AC** second criterion: `100→150 saved, second game 120 → isNewRecord false because sessionStart updated to 150`. | FE lead | Immediate (gate DW-98) |
| R-003 | DATA / TECH | **RACE_RESTART_STALE — `handleRestart` invoked before `saveBest(150)` resolves while `persistedBest` state is still 100 → `initialScore(persistedBest)` captures stale 100 not 150, so restarted game best is 100 and next 120 would false-positive.** Pre-existing manual-validation debt. Fixed by `pendingSaveByLaneRef` per-lane `Promise<boolean>` + `handleRestart` `await pending.catch(()=>{})` + reading `persistedBestByLaneRef.current[active]` (mirror ref, not state) for `initialScore`. | 2 | 3 | **6** | Enforce serialization: (a) **source P0 pins** `pendingSaveByLaneRef = useRef<Record<LaneId, Promise<boolean>|null>>` decl + `pendingSaveByLaneRef.current[activeLaneId]=p` + `p.finally(()=>{if(pending===p) pending=null})` + `handleRestart` `const pending=pendingSaveByLaneRef.current[active]; if(pending) try{await pending}catch{}` + `setMatch(initialScore(persistedBestByLaneRef.current[active]))` (b) **unit P0** fake `saveBestForLane` with artificial delay, call `handleRestart` before resolve, assert restart reads 150 not 100 after await (c) **spec AC** third criterion: restart awaits pending save before `initialScore`. | FE lead | Immediate (gate DW-99) |
| R-004 | BUS / DATA | **NON_FINITE/CORRUPT inputs — `previousBest -5/NaN/Infinity` or `score NaN/Infinity/negative` via bypassed MMKV native injection (bypasses `parseBest`) → `isNewRecord` true or Hud/overlay renders `"NaN"` without guards.** Contract `MatchScore` guarantees finites but `previousBest -5/NaN/Infinity` already reached `matchScore` via native. `parseBest` rejects but native `store.set(key, "NaN")` could inject. Fixed by `Number.isFinite` + `&& >=0` guards in all three `matchScore.ts` exports and `Hud/overlay/stats` JSX sanitization (`Number.isFinite(x) && x>=0 ? x : 0`). | 2 | 3 | **6** | Enforce finite guards: (a) **unit P0** `matchScore.test.ts` widen: `isNewRecord(-5|NaN|Infinity, any)` false, `isNewRecord(any, NaN|Infinity|-1)` false, `initialScore(NaN|Infinity|-5)` → `{score:0,best:0}`, `applyMove` with `curScore/curBest` NaN → coerced, `sanitized raw` clamp, `safeScore` fallback (b) **source P0 pins** `matchScore.ts` `Number.isFinite.*&&.*>=0` in all three functions + `App.tsx` `sanitizedScore/sanitizedBest/sanitizedPersisted` + `GameOverOverlay stats` `match.score===match.score && Number.isFinite` ternary + `isNewRecord(... ) && hydrationOk` prop (c) **spec AC** fourth/fifth criteria: non-finite never renders `"NaN"` nor lights highlight, score/best coerced to `>=0`. | FE lead | Immediate (gate DW-100) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-005 | TECH | **handleRestart async Promise<void> vs onRestart () => void type mismatch — `handleRestart` is `async () => Promise<void>` but `GameOverOverlay onRestart` is typed `() => void`.** Runtime ignores promise (JS allows `void` to accept `Promise<void>`), `try/catch` inside await keeps restart non-blocking on save failure. Lint `no-floating-promises` or strict `expect-type` could flag; future caller doing `const r = onRestart(); r.then` would break. Spec notes `Residual risks: handleRestart now async () => Promise<void> but onRestart prop typed () => void — runtime ignores promise, no test break`. | 2 | 2 | 4 | Pin mismatch as accepted debt: (a) **static scan** `rg -n "const handleRestart = useCallback\(async" App.tsx` 1 hit + `rg -n "onRestart.*handleRestart" App.tsx` 1 hit + `rg -n "onRestart: \(\) =>" src/ui/GameOverOverlay.tsx` shows `() => void` (b) **tsc gate** `npx tsc --noEmit --project triade/tsconfig.json` still clean (void param accepts async) — pin in plan; future strict lint must add `// eslint-disable-next-line` or change prop to `() => void | Promise<void>` (out of scope). |
| R-006 | TECH / DATA | **persistedBestByLaneRef vs state divergence — `persistedBestByLane` is `useState`, `persistedBestByLaneRef` is `useRef` mirror synced via `useEffect(()=>ref=current,[persistedBestByLane])` plus direct `ref={...ref, [active]: sanitizedMatchBest}` in `.then`.** If `.then` write and `useEffect` sync race (setState async), ref could be stale inside `handleRestart` await window before effect flushes. Current `.then` writes ref synchronously before `setState` scheduled, so `handleRestart` await sees fresh ref. Deleting direct ref write would leave stale window. | 2 | 2 | 4 | Pin double-write: (a) **source P0 pins** `persistedBestByLaneRef.current = { ...persistedBestByLaneRef.current, [activeLaneId]: sanitizedMatchBest }` inside `.then` **and** `useEffect(()=>{persistedBestByLaneRef.current=persistedBestByLane},[persistedBestByLane])` sync (b) **unit P1** `handleRestart` reads `persistedBestByLaneRef.current[active]` not `persistedBestByLane[active]` — `rg -n "persistedBestByLaneRef\.current\[active" App.tsx` 1 hit vs `persistedBestByLane\[active` 0 in handleRestart. |
| R-007 | TECH | **Sanitization idiom drift — `Hud` uses `Number.isFinite(x) && x>=0 ? x : 0`, `GameOverOverlay stats` uses `match.score === match.score && Number.isFinite(match.score) && match.score>=0 ? match.score : 0` (self-compare guards NaN), `matchScore.ts` uses `Number.isFinite(best) && best>=0 ? best : 0` + `typeof raw==='number' && Number.isFinite(raw) && raw>=0`.** All equivalent for NaN (self-compare vs isFinite) but string `"3"` vs number diverges: `Hud` would coerce? Actually `Number.isFinite("3")` false so both 0, but drift risk if one idiom loses `>=0` or `isFinite`. | 2 | 2 | 4 | Pin parity: (a) **source P1 pins** `sanitizedScore = Number.isFinite(match.score) && match.score>=0 ? match.score : 0` + `sanitizedBest` + `sanitizedPersisted` + `stats: { score: match.score === match.score && Number.isFinite(match.score)` exact string in `GameOverOverlay` call + `initialScore`/`applyMove`/`isNewRecord` guards in `matchScore.ts` (b) **unit P1** render test asserts Hud receives `sanitizedScore` not `match.score` directly (`rg -n "score=\{sanitizedScore\}" App.tsx`). |
| R-008 | TECH | **Lane isolation on persist effect — effect watches `[match.best, persistedBestByLane, selectedLaneIndex]` and derives `activeLaneId = laneFromIndex(selectedLaneIndex).id` each run.** Switching lanes re-runs effect with `match.best` still equal to previous lane's best (since `match` is single, lane-scoped via `initialScore` on lane switch). If `match.best` happens to be `> sanitizedPersistedForCheck` of the new lane **and** `isNewRecord(sessionStartBest[newLane], match.best)` true (because new lane's `sessionStart` is lower), it could attempt `saveBestForLane(newLane, match.best)` with previous lane's score. Current `App.tsx` `applyLaneSelection` already resets `match` via `initialScore(persistedBestByLane[nextLane])` synchronously before `selectedLaneIndex` changes, so race is narrow — but effect could still fire once before lane-switch `setMatch` flushes. | 1 | 3 | 3 | Pin lane-switch reset: (a) **source P1 scans** `applyLaneSelection` `setMatch(initialScore(persistedBestByLane[nextLaneId]))` before `setSelectedLaneIndex(index)` (both branches) + persist effect `activeLaneId = laneFromIndex(selectedLaneIndex).id` (b) **unit P1** mount App with fake `loadAllBests` `clean {best:100,ok:true} accelerated {best:10,ok:true}`, lane switch clean→accelerated then assert `saveBestForLane` never called with `100` for `accelerated` lane (mock count). |
| R-009 | TECH | **isNewRecord hydrationOk short-circuit order — App now `isNewRecord(sessionStartBestRef[active], match.score) && hydrationOkByLaneRef[active]` (isNewRecord first, hydrationOk second).** Spec design sketch had `hydrationOk && isNewRecord`; both yield same boolean result (both must be true), but order matters for call count: calling `isNewRecord` when `hydrationOk false` is wasted and could log if isNewRecord later gains side-effects. No logic difference today (pure). Review noted `patch 0, defer 0, reject 2 (noise: gate order vs short-circuit, Hud prop literal)` — order flagged as noise. | 1 | 2 | 2 | Pin boolean conjunction regardless of order: (a) **source P1** `rg -n "isNewRecord\(sessionStartBest" App.tsx` + `rg -n "hydrationOkByLaneRef" App.tsx` both hit same line `isNewRecord={isNewRecord(...) && hydrationOk...}` (b) **unit P1** degraded hydration test asserts `GameOverOverlay` receives `false` when `hydrationOk false` regardless of `sessionStart`/`score` values — order not asserted, only result false. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-010 | OPS | **Ledger `resolution-undo: d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822` 64-hex for 5 DW entries (DW-87,97,98,99,100) + `sprint-status.yaml` orchestrator ownership.** 5 hunks flipped `open → done 2026-09-02`; undo hash is `hex(ascii("status: open"))` literal 64 chars (see `git show HEAD -- deferred-work.md`). | 1 | 2 | 2 | Monitor — `git diff HEAD -- deferred-work.md` 5 hunks only; `rg -n "d0e7d75" deferred-work.md` 5 hits (one per DW); `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` must stay empty; this plan never writes ledger or status. |
| R-011 | TECH | **Overflow `score >1e9` layout (DW-101) still deferred — `GameOverOverlay` row `space-between` without `numberOfLines/ellipsizeMode/flexShrink`.** Explicitly out of MVP, `Pré-existente, fora de MVP`. | 1 | 1 | 1 | Monitor — no test for overflow in this bundle; future Epic 9/storage may add `numberOfLines` when threshold defined. |

### Risk Category Legend

- **TECH**: `pendingSaveByLaneRef` + `persistedBestByLaneRef` refs, `handleRestart` async vs void prop, sanitization idiom drift, lane isolation effect transient, short-circuit order
- **DATA**: degraded hydration `ok:false` best 0 overwrite, stale `sessionStartBestByLaneRef` multi-game, race stale `persistedBest` before save resolves, non-finite/corrupt MMKV injection via `Number.isFinite` guards
- **BUS**: `isNewRecord` highlight correctness — false-positive lights `valueRecord #E8A33D` for 50 vs 0 degraded, second-game 120 vs 100 stale, equal 150 vs 150 not highlight (AC3)
- **OPS**: `deferred-work.md` 64-hex ledger 5 hunks, `sprint-status.yaml` ownership never-write
- **SEC**: n/a for this bundle (no tokens/network/store attester beyond MMKV; injection via native bypass is DATA not SEC)
- **PERF**: per-persist `saveBestForLane` single async per new record, `await pending` before restart `<50 ms` MMKV sync (no animation gate impact — still `busyRef` 420 ms), full `npm test` gate `<15 min`; no device lane needed

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category    | Requirement / Threshold | Risk Link | Planned Validation                         | Evidence Needed                  |
| --------------- | ----------------------- | --------- | ------------------------------------------ | -------------------------------- |
| Reliability | App never-throws on `handleRestart / persist effect / initialScore / applyMove / isNewRecord` for any `best/score/persistedBest` including `NaN/Infinity/-5/string` + degraded `ok:false` + save rejection; `Hud/overlay` never renders `"NaN"` | R-004,R-005,R-006,R-007 | Host `matchScore.test.ts` finite/negative pins + `gameOverOverlay.recordHighlight.test.ts` degraded + stale + equal pins + full `npm --prefix triade test` ~950 pass still green; `defensive-guards.atdd.test.ts` DW-24 4 skipped already pinned as `APPROACH` | `npm --prefix triade test` pass 950/0 + `npx tsc --noEmit` clean + `rg -n "Number\.isFinite" triade/src/game/matchScore.ts` 5 hits + `rg -n "sanitizedScore\|sanitizedBest" triade/App.tsx` 4+ hits |
| Determinism / Correctness | `isNewRecord(previousBest, score)` strictly `score > previousBest` with finite `>=0` gate; `best` is live max `Math.max(curBest, safeScore)` sanitized; `loadAllBests` degrade `ok:false` never persists; `sessionStartBest` updated only on `saveBestForLane ok===true` | R-001,R-002,R-004 | Unit `matchScore.test.ts` isNewRecord truth table `isNewRecord(5,6) true / (5,5) false / (0,0) false / (0,1) true / (150,150) false` + `NaN/Infinity/-5` false + `applyMove` accumulated best max pin still green | `matchScore.test.ts` pass 8 + `gameOverOverlay.recordHighlight.test.ts:300-360` sessionStart gating pin pass 1 + `ladder-ceiling-chain.atdd.test.ts` DW-103 pin |
| Data Integrity | Per-lane `saveBestForLane(activeLaneId, sanitizedMatchBest)` only when `hydrationOk[active] && isNewRecord(sessionStart, sanitizedMatchBest) && sanitizedMatchBest > sanitizedPersisted` — no cross-lane write, no `ok:false` overwrite; `pendingSave` await prevents stale 100 over 150 | R-001,R-002,R-003,R-008 | Host source-pins `saveBestForLane(activeLaneId, sanitizedMatchBest)` single call-site + `hydrationOk` top return + `sanitizedMatchBest > sanitizedPersisted` && `isNewRecord` double gate; fake storage `setStorageBackendForTests` with per-lane `{clean, accelerated}` to assert lane isolation | `rg -n "saveBestForLane\(activeLaneId, sanitizedMatchBest" App.tsx` 1 hit + `rg -n "hydrationOkByLaneRef\.current\[activeLaneId\]" App.tsx` 2 hits (effect top + overlay prop) + `app.gameOverWiring.test.ts` wiring pins |
| Maintainability | Single `Number.isFinite && >=0` sanitization contract shared by `matchScore.ts` (pure) + `App.tsx` JSX boundary; no new storage keys/files; `TEA` refs are `useRef` memory only; `sprint-status.yaml` untouched | R-007,R-010 | Static scans `rg -n "Number\.isFinite" App.tsx` 5 hits + `rg -n "Number\.isFinite" matchScore.ts` 5 hits + `git diff HEAD -- triade/src/services/storage/settingsStore.ts` empty (no schema) | `rg` scan logs + `tsc --noEmit` both configs clean + `git diff HEAD -- triade/src/engine triade/src/ui/GameOverOverlay.tsx` empty |
| Performance | Per-record `saveBestForLane` single async MMKV `store.set` sync (`<1 ms`), per-restart `await pending` `<50 ms` (MMKV sync path via fake), no animation gate impact (still `busyRef` + `fallbackBusyTimer` 420 ms), full `npm test` gate `<15 min` | R-003,R-005 | Host wall-clock `npm test` gate; `tsc` both configs `<5 s` | Wall-clock log + `tsc` log; no device lane needed |
| Compliance / Contract | `Board/Cell/Direction/GameState/MatchScore` public types unchanged; `GameOverOverlay` thin-view still `isNewRecord ? valueRecord : value` ternaries ×2 unchanged, `accessibilityViewIsModal` + `a11yLabel "Novo recorde"` contract unchanged; `onRestart` still `() => void` surface (async impl compatible) | R-005 | `rg` scans `export interface MatchScore` + `valueRecord.*#E8A33D` + `isNewRecord ? styles.valueRecord` 2 hits stable; `tsc` clean; `gameOverOverlay.recordHighlight.test.ts` AC1-4 pins 5 pass | `triade/src/game/matchScore.ts` shape scan + `tsc` clean + `gameOverOverlay.recordHighlight.test.ts` pass 5 |

**Unknown thresholds:** No new NFR thresholds introduced by this hardening — all App NFR thresholds derive from `triade/App.tsx:98-1086` existing contracts and `matchScore.ts:1-31` pure helpers. `DW-101` overflow `>1e9` has no spec'd threshold — intentionally deferred `fora de MVP`. `pendingSave` await timeout has no threshold today (await is indefinite but MMKV is sync; fake delay is test-only). All missing thresholds are `UNKNOWN` and not guessed.

---

## Entry Criteria

- [ ] Working-tree is `596add4` + 3-file tracked diff (`App.tsx` + `matchScore.ts` + `deferred-work.md` 5 hunks + `spec-persist-hydration-race-fix.md`) committed as `5eaeb51` — `git status --short` shows `M` 2 (deferred-work + spec) if on `596add4`, or clean if on `5eaeb51`; `git diff HEAD~1 --stat` 3 files `169/16`; `git diff HEAD~1 -- triade/src/engine triade/src/ui/GameOverOverlay.tsx` empty, `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty
- [ ] `triade/src/game/matchScore.ts:1-31` exports `initialScore/applyMove/isNewRecord` with `Number.isFinite` guards (pure, node:test importable) — `rg -n "Number\.isFinite.*&&.*>=0" triade/src/game/matchScore.ts` ≥4 hits
- [ ] `triade/src/services/storage/settingsStore.ts` exposes `loadAllBests(): Promise<Record<LaneId, BestLoadResult>>{clean,accelerated}{best,ok}`, `saveBestForLane`, `parseBest`, `bestKeyForLane`, `setStorageBackendForTests` fake for host pinning
- [ ] Feature deployed to host harness (`node --import tsx --test` resolves `tsx` + `tsconfig.test.json`) — no Expo/Skia/RNGH runtime needed for `App.tsx` source-pins + `matchScore.ts` pure pins (source-pin + fake storage, no device lane)

## Exit Criteria

- [ ] All P0 8 groups passing including `HYDRO_DEGRADED` gated false, `STALE_MULTI_GAME` sessionStart update after save resolve, `RACE_RESTART` await pending before `initialScore`, `NON_FINITE` false + no NaN render, `initialScore/applyMove` sanitization, equal/first-game boundaries, `Hud/overlay` sanitized JSX, persist effect double gate
- [ ] All P1 6 groups passing (ref mirror sync, sanitized guards parity, handleRestart async try/catch, lane isolation, short-circuit order, ledger retrievability)
- [ ] No open high-priority (≥6) risks unmitigated (R-001..R-004 each 6) — mitigations are runtime `rg / isNewRecord / deepEqual / slice` pins not just header docs
- [ ] Test coverage agreed as sufficient (8 P0 + 6 P1 + ledger + defensive-guards on top of ~950 baseline)
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` clean, `rg -n "Number\.isFinite" triade/src/game/matchScore.ts` ≥4 hits, `sprint-status.yaml` untouched (`git diff HEAD --` empty), `npm --prefix triade test` ~950 pass

## Project Team (Optional)

| Name   | Role     | Testing Responsibilities |
| ------ | -------- | ------------------------ |
| Eduardo | FE / Test Architect | Owns hydration gate + sessionStart update + pendingSave await + finite-guard pin hygiene, `rg` `hydrationOkByLaneRef/sessionStartBestByLaneRef/pendingSaveByLaneRef/persistedBestByLaneRef/Number.isFinite` scans, ledger `d0e7d75…` + orchestrator `sprint-status.yaml` ownership gate |
| Murat (TEA) | QA / NFR assessor | Owns reliability/determinism/data-integrity/maintainability/perf compliance, `nfr-assess` header thresholds vs `nfr-criteria.md` mapping |

---

## Test Coverage Plan

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| `HYDRO_DEGRADED` degraded `ok:false` best 0 with `match.score 50` → `GameOverOverlay isNewRecord false` and no `saveBestForLane` call for that lane (AC1 first criterion) | Unit | R-001 | 1 | QA | `loadAllBests` fake returns `clean {best:0,ok:false}` `accelerated {best:500,ok:true}` (500 is real record); mount via source-pin: assert `App.tsx` persist effect `if(!hydrationOkByLaneRef.current[activeLaneId]) return` prevents save, and `isNewRecord={isNewRecord(sessionStartBestRef[active], match.score) && hydrationOkRef[active]}` is false when degraded — `isNewRecord(0,50)` would be true pure but gated false. Also unit `isNewRecord(0,50)===true` pure but gate makes it false — pin the gate not the pure. |
| `STALE_MULTI_GAME` 100→150 saved and resolved, second game 120 → `isNewRecord` false because `sessionStartBestByLaneRef` updated to 150 after save resolution (AC2) | Unit | R-002 | 1 | QA | Fake `saveBestForLane` resolves `true` after 10 ms; first effect `saveBestForLane(clean,150)` → `await p` → `sessionStartBestByLaneRef.current[clean]===150`; second game `match.score=120` → `isNewRecord(150,120)===false` (not `isNewRecord(100,120)`). Source-pin `sessionStartBestByLaneRef.current = { ... , [activeLaneId]: sanitizedMatchBest }` inside `.then` + state `setPersistedBestByLane` update. |
| `RACE_RESTART_STALE` `handleRestart` invoked before `saveBest(150)` resolves while `persistedBest` still 100 → restart reads 150 (not stale 100) because `await pending` before `initialScore` (AC3) | Unit | R-003 | 1 | QA | Fake `saveBestForLane` delayed `new Promise(r=>setTimeout(()=>r(true),30))`; trigger `match.best=150` (persist effect creates `pendingSaveByLaneRef[clean]=p`); immediately call `handleRestart` (source `await pending.catch(()=>{})` + `initialScore(persistedBestByLaneRef.current[active])`); assert `initialScore` arg is `150` not `100` after `p` resolves. Also pin `handleRestart` is `async` and contains `try{await pending}catch{}`. |
| `NON_FINITE isNewRecord` — `isNewRecord(-5\|NaN\|Infinity, any)` false and `isNewRecord(any, NaN\|Infinity\|-1)` false, never highlight | Unit | R-004 | 1 | QA | `matchScore.test.ts` widen: `isNewRecord(NaN,1) false`, `isNewRecord(Infinity,1) false`, `isNewRecord(-5,10) false`, `isNewRecord(1,NaN) false`, `isNewRecord(1,Infinity) false`, `isNewRecord(1,-1) false`. Also `isNewRecord` called via `App` prop still false when `hydrationOk true` — gate does not rescue non-finite (pure returns false). |
| `initialScore/applyMove` finite sanitization — `initialScore(NaN\|Infinity\|-5\|"3" as any)` → `{score:0,best:0}`, `applyMove` with corrupt `current.score/curBest` or `result.score NaN/Infinity/-5` or `moved:false` never poisons `score/best` to `NaN` | Unit | R-004 | 1 | QA | `initialScore` `Number.isFinite(best) && best>=0 ? best : 0`; `applyMove` `curScore/curBest` sanitized + `sanitized = typeof raw==='number' && Number.isFinite(raw) && raw>=0 ? raw : 0` + `effective = moved ? sanitized : 0` + `safeScore = Number.isFinite(score) && score>=0 ? score : curScore`; extend `defensive-guards.atdd.test.ts` DW-24 4 skipped patterns (`NaN moved:true stays 10,20`, `Infinity/-5`, `moved:false 5 stays 10,20`, `string "3" as any`) plus negative curScore. |
| `NO_RECORD_EQUAL` / `FIRST_GAME_ZERO` boundaries — `isNewRecord(150,150) false`, `isNewRecord(0,0) false`, `isNewRecord(0,1) true`, `applyMove` `best` tracks max | Unit | R-001,R-002 | 1 | QA | Keep `matchScore.test.ts:44-66` pins green (`isNewRecord(5,6) true`, `(5,5) false`, `storedBest 5 → 6 true` vs `isNewRecord(6,6) false`, `0,0 false` vs `0,1 true`) + `gameOverOverlay.recordHighlight.test.ts:344-359` zero boundary render `score 0 best 0 isNewRecord(0,0) false` no accent. |
| `Hud/overlay/stats` sanitized JSX — `Hud score={sanitizedScore} best={sanitizedBest}`, `stats` text `score: {sanitizedScore} · live best: {sanitizedBest} · persisted best: {sanitizedPersisted}`, `GameOverOverlay stats` `score/best` sanitized `match.score===match.score && Number.isFinite... ? score : 0`, `isNewRecord` prop gated `&& hydrationOk` — never renders `"NaN"` | Unit | R-004,R-007 | 1 | QA | Source-pins `Hud score={sanitizedScore} best={sanitizedBest}` + `sanitizedScore = Number.isFinite(match.score) && match.score>=0 ? match.score : 0` decls + `stats: { score: match.score === match.score && Number.isFinite(match.score)` + `isNewRecord={isNewRecord(... ) && hydrationOkByLaneRef`. Runtime `Hud` mount with `match.score=NaN/Infinity/-5` still renders `0` not `"NaN"` (via `TestRenderer`). |
| Persist effect double gate `sanitizedMatchBest > sanitizedPersisted && isNewRecord(sessionStart, sanitizedMatchBest) && hydrationOk` — only active lane ever written, `ok:false` never persists, `sanitizedMatchBest` finite `>=0` | Unit | R-001,R-006 | 1 | QA | Source-pin persist effect contains `const sanitizedMatchBest = Number.isFinite(match.best) && match.best>=0 ? match.best : 0` + `rawPersistedForCheck/persistedBestByLane[activeLaneId]` + `sanitizedPersistedForCheck` + `if(isNewRecord(sessionStartBestRef[active], sanitizedMatchBest) && sanitizedMatchBest > sanitizedPersistedForCheck)` + top `if(!hydrationOkByLaneRef.current[activeLaneId]) return`. Fake storage assert `saveBestForLane` call count `0` when degraded, `1` when `150>100 && ok true` with `sanitized` arg. |

**Total P0**: 8 tests, ~1.2 hours

### P1 (High)

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| `persistedBestByLaneRef` mirror sync — `useRef mirror` `persistedBestByLaneRef.current` seeded at hydration + synced via `useEffect(()=>ref=current,[persistedBestByLane])` + direct `.then` write `ref={...ref,[active]:sanitizedMatchBest}` | Unit | R-006 | 1 | QA | `rg -n "persistedBestByLaneRef" App.tsx` 5 hits (decl + hydration seed + sync effect + .then write + handleRestart read); `rg -n "persistedBestByLaneRef\.current\[active" App.tsx` 1 hit in `handleRestart` (must read ref not state). Pin `.then` contains both `setPersistedBestByLane` and `persistedBestByLaneRef.current = { ... }`. |
| Sanitized persistence guards parity — `sanitizedMatchBest` + `sanitizedPersistedForCheck` both `Number.isFinite && >=0 ? x : 0` before `isNewRecord` and `>` checks; `sessionStartBestRef` read is current lane | Unit | R-007 | 1 | QA | `rg -n "sanitizedMatchBest" App.tsx` 3 hits (decl + isNewRecord arg + save arg) + `rg -n "sanitizedPersistedForCheck" App.tsx` 2 hits; both `Number.isFinite && >=0` idiom. |
| `handleRestart` async `await pending.catch(()=>{})` non-blocking on save rejection — save `false` or throw never hangs restart, `initialScore` still reads current `persistedBestByLaneRef` (stale but not throw) | Unit | R-005 | 1 | QA | Fake `saveBestForLane` returns `false` then asserts `setPersistedBestByLane` not called, `sessionStartBestRef` not updated, `handleRestart` still proceeds to `newGame` + `initialScore(persistedBestByLaneRef)` without throw; fake `saveBestForLane` that throws/rejects also `catch(()=>{})` inside `handleRestart`. Source-pin `if(pending){ try{ await pending } catch{}}`. |
| Lane isolation `clean vs accelerated` — per-lane `saveBestForLane(activeLaneId, ...)` never leaks, `sessionStartBestByLaneRef/hydrationOkByLaneRef/persistedBestByLaneRef/pendingSaveByLaneRef` all `Record<LaneId, ...> {clean, accelerated}` with `bestKeyForLane` wall | Unit | R-008 | 1 | QA | Fake `loadAllBests` `clean {best:100,ok:true} accelerated {best:10,ok:true}`; effect with `selectedLaneIndex` 0 (clean) + `match.best=150` → `saveBestForLane` called with `clean` not `accelerated`; switch `selectedLaneIndex` 1 then `match.best` old 150 does not save to accelerated (see R-008). `rg -n "Record<LaneId" App.tsx` 4 hits. |
| `isNewRecord` hydrationOk short-circuit — `isNewRecord(...) && hydrationOk` vs `hydrationOk && isNewRecord` both false when degraded, but pure `isNewRecord` not called when degraded is optional — pin result false not order | Unit | R-009 | 1 | QA | Source-pin `isNewRecord={isNewRecord(sessionStartBestByLaneRef.current[activeLaneId as LaneId], match.score) && hydrationOkByLaneRef.current[activeLaneId as LaneId]}` exact line; degraded test asserts overlay `isNewRecord` prop `false` when `hydrationOk false` regardless of scores. |
| Ledger `resolution-undo: d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822` 64-hex for 5 DW entries + `sprint-status.yaml` ownership | Unit | R-010 | 1 | QA | `rg -n "d0e7d75" deferred-work.md` 5 hits (one per DW-87/97/98/99/100) + `git diff HEAD -- deferred-work.md` 5 hunks; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty; `rg -n "status: done 2026-09-02" deferred-work.md` 5 hits new. |

**Total P1**: 6 tests, ~0.9 hours

### P2 (Medium)

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement   | Test Level | Risk Link | Test Count | Owner | Notes   |
| ------------- | ---------- | --------- | ---------- | ----- | ------- |
| `NEGATIVE_SCORE_SANITIZE` — `MoveResult` raw `-10` or board corruption `effective 0`, `score` unchanged, `best` unchanged, sanitized to 0, no highlight | Unit | R-004 | 1 | QA | `applyMove(initialScore(10), moveResult(-10, true))` → `{score:10, best:10}`? Actually `curScore 10 + effective 0 =10`? Wait `initialScore 10` score 0 best 10 then `applyMove` with `result.score -10 moved true` → `sanitized 0` → `effective 0` → `score = curScore 0 +0 =0` vs `curScore` is `0` not `10` — clarify: `applyMove` uses `current.score` (live 0) not best. Use `curScore` pin with injected `current {score:10,best:20}`. |
| Rapid lane-switch before save resolve — `saveBestForLane(clean,150)` pending, switch to accelerated before `p` resolves, then `p.then` must still update `clean` lane refs not accelerated | Unit | R-006,R-008 | 1 | QA | Fake delay + `selectedLaneIndex` switch `clean(0)→accelerated(1)` before `await p`; assert `sessionStartBestByLaneRef.clean===150` and `accelerated` unchanged 10 after resolve; `pendingSaveByLaneRef[clean]` cleared via `finally` `if(pending===p)`. |
| Save rejection no state update — `saveBestForLane` returns `false` (MMKV failure) then `setPersistedBestByLane` not called, `sessionStartBestByLaneRef` stays stale, busy guards unchanged, no throw | Unit | R-005 | 1 | QA | Already pinned as P1 retry but edge: `saveBestForLane` returning `false` must keep `persistedBestByLaneRef` at old value (100) and `sessionStart` at 100, so second game 120 still false-positive? Actually `sessionStart` stays 100 would still light — but without persist, `persistedBest` also 100 so next `match.best 120` would still attempt save again (not lost) — pin that `ok===false` path does not update either ref. |
| `saveBestForLane` per-lane key correctness — `bestKeyForLane('clean') === STORAGE_KEYS.bestClean`, `bestKeyForLane('accelerated') === STORAGE_KEYS.bestAssisted`, legacy `STORAGE_KEYS.best` not written | Unit | R-008 | 1 | QA | `rg -n "bestKeyForLane" src/services/storage/settingsStore.ts` 1 export + `rg -n "STORAGE_KEYS.bestClean\|bestAssisted" App.tsx` 0 hits (App only calls `saveBestForLane`, not raw keys) — App never touches legacy key. |

**Total P2**: 4 tests, ~0.6 hours

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement   | Test Level | Test Count | Owner | Notes   |
| ------------- | ---------- | ---------- | ----- | ------- |
| Exploratory App-render integration — mount `App` via `@testing-library/react-native` with injected fake `loadAllBests` degraded `ok:false` then assert `Hud` shows `best 0` (sanitized) and `GameOverOverlay` never highlights when `score 50` (mount + fire game-over) | Component | 1 | QA | Defer: not host-only, requires RN/Expo harness + gesture; not gate for this sweep. Pin stays source-only today. |
| Overflow `>1e9` exploratory — `score 2_000_000_000` still `space-between` without `numberOfLines` (DW-101 deferred) | Component | 1 | DEV | Defer: layout manual, outside MVP. |

**Total P3**: 2 tests, ~0.5 hours

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] `npx tsc --noEmit --project triade/tsconfig.json` clean (30s)
- [ ] `rg -n "Number\.isFinite" triade/src/game/matchScore.ts` ≥4 hits (10s)
- [ ] `rg -n "hydrationOkByLaneRef" triade/App.tsx` 5 hits (decl + hydration seed + persist top + overlay prop + sync) (10s)
- [ ] `rg -n "pendingSaveByLaneRef" triade/App.tsx` 5 hits (`useRef` + `=p` + `finally` + `await pending` + decl) (10s)
- [ ] `rg -n "d0e7d75" _bmad-output/implementation-artifacts/deferred-work.md` 5 hits (10s)
- [ ] `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty (5s)

**Total**: 6 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [ ] `HYDRO_DEGRADED` gated false + no save when `ok:false` (unit via source-pin + `isNewRecord` pure)
- [ ] `STALE_MULTI_GAME` `sessionStart` update after `saveBestForLane ok true` then `isNewRecord(150,120) false` (unit)
- [ ] `RACE_RESTART` `handleRestart` `await pending` then `initialScore(persistedBestByLaneRef)` reads 150 not 100 (unit with delayed fake)
- [ ] `NON_FINITE` `isNewRecord` false + `initialScore/applyMove` coerced + `Hud/overlay` never `"NaN"` (unit)

**Total**: 8 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] `persistedBestByLaneRef` mirror sync (`useEffect` + `.then` double-write) + `sanitizedMatchBest/sanitizedPersisted` parity (unit)
- [ ] `handleRestart` async `try/catch` non-blocking + lane isolation `clean vs accelerated` + short-circuit order (unit)
- [ ] Ledger `d0e7d75` 64-hex 5 hits + `sprint-status.yaml` empty (unit)

**Total**: 6 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] `NEGATIVE_SCORE_SANITIZE` `applyMove` `-10` + rapid lane-switch before save resolve + save `false` no update + `bestKeyForLane` wall (unit)
- [ ] Exploratory App-render degraded + overflow `>1e9` deferred (component, not gate)

**Total**: 6 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority  | Count             | Hours/Test | Total Hours       | Notes                   |
| --------- | ----------------- | ---------- | ----------------- | ----------------------- |
| P0        | 8        | 0.15        | ~1.0–1.5        | Hydration gate + stale sessionStart + race await + finite guards + sanitized JSX |
| P1        | 6        | 0.15        | ~0.7–1.1        | Ref mirror sync + guards parity + async try/catch + lane isolation + ledger |
| P2        | 4        | 0.15        | ~0.5–0.8        | Negative sanitize + rapid lane-switch + save false + key wall |
| P3        | 2        | 0.3        | ~0.4–0.7        | Exploratory App-render + overflow (defer, RN harness) |
| **Total** | **20** | **-**      | **~2.8–4.8** | **~0.35–0.6 day**  |

### Prerequisites

**Test Data:**

- `loadAllBests()` fake `Record<LaneId, BestLoadResult>` with per-lane `{best: number, ok: boolean}` (from `triade/src/services/storage/settingsStore.ts:parseBest` contract)
- `saveBestForLane` fake with controllable delay + `true/false` + throw to exercise `pendingSave` + `.then(ok)` branch
- `matchScore` pure helpers `initialScore/applyMove/isNewRecord` from `triade/src/game/matchScore.ts:1-31`
- `stripCommentsAndStrings` helper (from `triade/test-utils/helpers.ts:279`) for source-pin stripping when needed
- `emptyBoard()` + `moveResult(score,moved)` helper for `applyMove` pins

**Tooling:**

- `node --import tsx --test` host harness (`tsx` + `tsconfig.test.json`) for all `triade/App.tsx` source-pins + `src/game/matchScore.ts` pure TS — no Expo/Skia/RNGH harness needed
- `rg` static scans for `hydrationOkByLaneRef`, `sessionStartBestByLaneRef`, `pendingSaveByLaneRef`, `persistedBestByLaneRef`, `Number.isFinite`, `sanitizedScore`, `d0e7d75`, `sprint-status.yaml` ownership
- `git diff` guards for ledger 5 hunks + `sprint-status.yaml` empty + `triade/src/engine` empty

**Environment:**

- `npx tsc --noEmit --project triade/tsconfig.json` clean (or root `tsconfig.json` if `triade/tsconfig.json` not present)
- Working-tree is `5eaeb51` (or `596add4` + 3-file diff `169/16`), `triade/src/engine` byte-identical before/after, `triade/src/ui/GameOverOverlay.tsx` ternaries unchanged
- `npm --prefix triade test` full gate `<15 min` host-only

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers (R-001..R-004 each 6)

### Coverage Targets

- **Critical paths**: ≥80% (all hydration degraded + stale second-game + race restart + non-finite render paths)
- **Validation gate**: 100% (`hydrationOk` gating both persist and highlight + `sessionStart` update on `ok true` + `await pending` before `initialScore`)
- **Business logic**: ≥70% (lane isolation, sanitized compare `> sanitizedPersisted`, equal/first-game boundaries, ledger 64-hex)
- **Edge cases**: ≥50% (NaN/Infinity/-5, string `"3" as any`, `moved:false`, save `false`/throw, rapid lane-switch)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (8/8)
- [ ] No high-risk (≥6) items unmitigated (R-001..R-004)
- [ ] Source-pin `hydrationOkByLaneRef` gate in persist effect + `isNewRecord && hydrationOk` overlay prop passes 100%
- [ ] `sessionStartBestByLaneRef.current[active] === sanitizedMatchBest` after `saveBestForLane true` and `handleRestart` reads `persistedBestByLaneRef` not state — pin 100%
- [ ] `Number.isFinite` guards in all three `matchScore.ts` exports + `Hud/overlay/stats` sanitized JSX — pin 100% and `npm --prefix triade test` ~950 pass (no regression)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers

---

## Mitigation Plans

### R-001: HYDRO_DEGRADED false-positive highlight + overwrite (Score: 6)

**Mitigation Strategy:** Gate both persist and highlight on `hydrationOkByLaneRef`: (1) persist effect top `if(!hydrationOkByLaneRef.current[activeLaneId]) return` so `ok:false` never calls `saveBestForLane` (prevents 50 overwriting 500). (2) overlay prop `isNewRecord(sessionStartBestRef[active], match.score) && hydrationOkByLaneRef[active]` so degraded `best 0` never lights even though pure `isNewRecord(0,50)===true`. (3) keep pure `isNewRecord` finite guards so even bypassed MMKV still false. Future storage that supports `ok:false` bypass must not remove the gate.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-97)
**Status:** Planned (implemented in `App.tsx:222,1073`, verified via `git diff HEAD~1` + source-pin)
**Verification:** `rg -n "hydrationOkByLaneRef\.current\[activeLaneId\]" App.tsx` 2 hits (effect top + overlay prop) + `rg -n "isNewRecord\(sessionStartBest" App.tsx` 2 hits + `matchScore.test.ts` `isNewRecord(0,50)` pure true but gate makes overlay false — `gameOverOverlay.recordHighlight.test.ts` degraded path; `npm test` 950 pass.

### R-002: STALE_MULTI_GAME sessionStart not updated after save (Score: 6)

**Mitigation Strategy:** Update `sessionStartBestByLaneRef` inside `saveBestForLane(...).then(ok=>{if(ok){ setPersisted(...); persistedBestByLaneRef.current={...}; sessionStartBestByLaneRef.current={...} }})` — `sanitizedMatchBest` becomes new session start for that lane, so second game `120` with `sessionStart 150` is `isNewRecord(150,120)===false`. Keep `handleRestart` never writing `sessionStartBestRef` (existing pins `gameOverOverlay.recordHighlight.test.ts:318-320` already enforce `!sessionStartBest.*\.current\s*=`).

**Owner:** FE lead
**Timeline:** Immediate (gate DW-98)
**Status:** Planned (implemented `App.tsx:232-235`)
**Verification:** `rg -n "sessionStartBestByLaneRef\.current = \{ \.\.\.sessionStartBestByLaneRef" App.tsx` 1 hit inside persist `.then` + `rg -n "sessionStartBest.*\.current\s*=" App.tsx` shows hydration seed + this update only (no handleRestart write) + unit fake `await p` then `isNewRecord(150,120) false` pin.

### R-003: RACE_RESTART_STALE persistedBest state stale during pending save (Score: 6)

**Mitigation Strategy:** Per-lane `pendingSaveByLaneRef: Record<LaneId, Promise<boolean>|null>` + mirror `persistedBestByLaneRef` (state-async window). Persist effect `pendingSaveByLaneRef[active]=p` + `p.finally(if pending===p) null`. `handleRestart` `async`, `const pending=pendingSaveByLaneRef[current][active]; if(pending) try{await pending}catch{}` before `newGame`, then `setMatch(initialScore(persistedBestByLaneRef.current[active]))` (ref not state) so it reads `150` not stale `100`. `await` is `try/catch` so save rejection never hangs restart.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-99)
**Status:** Planned (implemented `App.tsx:113-114,239-244,458-465,477`)
**Verification:** `rg -n "pendingSaveByLaneRef" App.tsx` 5 hits + `rg -n "persistedBestByLaneRef\.current\[active" App.tsx` 1 hit in `handleRestart` + unit delayed fake `saveBestForLane` then immediate `handleRestart` asserts `initialScore` arg `150`; `app.restart.test.ts` order pin `newGame→setGame→setMoveResult→setMatch(initialScore(persistedBest` still green inside `1200` window but now reads `persistedBestByLaneRef`.

### R-004: NON_FINITE render "NaN" + false highlight (Score: 6)

**Mitigation Strategy:** Two-layer finite guards: (1) `triade/src/game/matchScore.ts:8-30` — `initialScore` `Number.isFinite(best)&&best>=0`, `applyMove` `curScore/curBest` + `sanitized raw` + `safeScore` fallback, `isNewRecord` `!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<0 → false`. (2) `triade/App.tsx:993-1073` — `sanitizedScore/sanitizedBest/sanitizedPersisted` for `Hud` + `stats` text, `GameOverOverlay stats` `match.score===match.score && Number.isFinite(match.score) && match.score>=0`, overlay `isNewRecord && hydrationOk` double gate, persist `sanitizedMatchBest/sanitizedPersisted` before compare. All `NaN/Infinity/-5/string` coerce to `0` or `false`, never `"NaN"` nor `#E8A33D`.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-100)
**Status:** Planned (implemented `matchScore.ts:9,15-21,28-29` + `App.tsx:224-226,993-1073`)
**Verification:** `rg -n "Number\.isFinite" triade/src/game/matchScore.ts` 5 hits + `rg -n "sanitizedScore\|sanitizedBest\|sanitizedPersisted" App.tsx` ≥4 hits + `matchScore.test.ts` widen `isNewRecord(-5|NaN|Infinity) false` + `defensive-guards.atdd.test.ts` DW-24 4 skipped as approach + render `TestRenderer` `Hud best NaN → 0`.

---

## Assumptions and Dependencies

### Assumptions

1. `ok:false` degraded `best 0` is intentionally not a valid record — first-game `best 0, score 0` also not a record (`isNewRecord(0,0) false` per `matchScore.test.ts:58-65` pin), so gating degraded `0<50` as false is correct even though it hides a true first-game `50` record for first-launch users (accepted loss vs overwriting 500).
2. `sessionStartBestByLaneRef` staying session-start (not `match.best`) plus updating only on `saveBestForLane true` is the chosen staleness semantics — `handleRestart` must never write the ref (existing `gameOverOverlay.recordHighlight.test.ts:318-320` pins). Any future story that wants `match.best` leakage must explicitly change the pin and spec.
3. `handleRestart` `async () => Promise<void>` behind `onRestart: () => void` is accepted debt — runtime JS ignores promise, `tsc` clean, no test break. Future strict `no-floating-promises` must be waived or prop widened to `() => void | Promise<void>` (out of scope).
4. `persistedBestByLaneRef` mirror + `useEffect` sync double-write is intentional to bridge state-async window — not deduplicated into single ref to keep `persistedBestByLane` state driving `Hud` render (state) while `handleRestart` reads ref (sync).

### Dependencies

1. `triade/src/services/storage/settingsStore.ts` `loadAllBests / saveBestForLane / parseBest / bestKeyForLane / setStorageBackendForTests` — Required by any host `App` hydration/persist pin.
2. `triade/test-utils/helpers.ts` `stripCommentsAndStrings` + `emptyBoard/boardWith` — Required by source-pins when stripping comments/strings.

### Risks to Plan

- **Risk**: A follow-on story enables new `persistedBest` source (e.g., `SecureStore` or `expo-file-system`) that bypasses `parseBest` and injects `NaN/Infinity/"3"` directly into `loadAllBests` return value before the `Number.isFinite` guard is added there.
  - **Impact**: `sanitizedMatchBest/sanitizedPersisted` in persist effect would still coerce for compare, but `initialScore(byLane[active].best)` on hydration would be called with corrupt `best` before any sanitization — `initialScore` now guards, but a future bypass that sets `sessionStartBestByLaneRef.current` directly from raw could inject non-finite into `isNewRecord`.
  - **Contingency**: Require a new `bmad-testarch-test-design` run with DATA `parseBest` contract re-quantized for the new backend and a P0 `initialScore(NaN|Infinity|"3" as any) → {0,0}` pin plus `loadAllBests` corrupt→`{0,ok:false}` degraded pin before merging the story.

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
| **`triade/App.tsx:111-244,458-477,993-1073` (hydration gate + sessionStart update + pendingSave await + sanitized render + `isNewRecord && hydrationOk` prop)** | Every App consumer — hydration now sets `persistedBestByLaneRef` mirror, persist effect gates on `hydrationOk` + sanitized finite compare and updates `sessionStartBestByLaneRef` on `ok true`, `handleRestart` now `async await pending` and reads `persistedBestByLaneRef` not state, render `Hud/stats/overlay` sanitized, overlay `isNewRecord` gated `&& hydrationOk`. No `Engine` contract change; `GameOverOverlay` still single `onRestart` + `isNewRecord ? valueRecord : value` ×2. | `npm --prefix triade test` ~950 pass / `npx tsc --noEmit --project triade/tsconfig.json` clean; `triade/__tests__/game/matchScore.test.ts` 8 pass + `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` 5 pass + `triade/__tests__/ui/components/app.restart.test.ts` 5 pass + `triade/__tests__/ui/components/app.gameOverWiring.test.ts` 3 pass must stay; `git diff HEAD~1 -- triade/src/engine triade/src/ui/GameOverOverlay.tsx` empty; `git diff HEAD -- sprint-status.yaml` empty |
| **`triade/src/game/matchScore.ts:1-31` (initialScore/applyMove/isNewRecord finite guards)** | All score consumers — `initialScore` now sanitizes `best` to `0` on non-finite/negative, `applyMove` sanitizes `curScore/curBest` + `raw` + `safeScore` fallback, `isNewRecord` returns `false` on non-finite/negative. Lane-scoped `initialScore(persistedBestByLane[active])` now also guards injected corrupt `best`. | `matchScore.test.ts` 8 pass + `defensive-guards.atdd.test.ts` DW-24 4 skipped kept as approach + `ladder-ceiling-chain.atdd.test.ts` DW-103 sessionStart alias pin `isNewRecord(sessionStartBest` still green; `rg -n "Number\.isFinite" triade/src/game/matchScore.ts` 5 hits; both `tsc` clean |
| **`_bmad-output/implementation-artifacts/deferred-work.md` (DW-87,97,98,99,100 `open→done` 5 hunks + spec 117 lines)** | Ledger bookkeeping for this bundle — `resolution: resolved by sweep bundle dw-persist-hydration-race-fix` + `resolution-undo: d0e7d75…` 64-hex per entry | `rg -n "d0e7d75" deferred-work.md` 5 hits; any `open→done` beyond these 5 DWs would violate Not in Scope; any `sprint-status.yaml` hunk would violate ownership; spec `spec-persist-hydration-race-fix.md` 117 lines tracked |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology (P×I 1–9, ≥6 HIGH, 9 CRITICAL block)
- `test-levels-framework.md` - Test level selection (Unit for pure `matchScore.ts` + `App.tsx` source-pin; no E2E needed for this persist/hydration seam)
- `test-priorities-matrix.md` - P0-P3 prioritization (P0 = blocks degraded/stale/race/non-finite record journey + high risk + no workaround)
- `nfr-criteria.md` - NFR thresholds & planned evidence (reliability/determinism/data-integrity/maintainability/perf)

### Related Documents

- PRD: n/a (sweep bundle — deferred-work DW-87,97,98,99,100)
- Epic: n/a (DW bundle `dw-persist-hydration-race-fix`)
- Architecture: `triade/App.tsx:hydrationOkByLaneRef + sessionStartBestByLaneRef + pendingSaveByLaneRef + persistedBestByLaneRef` contract + `triade/src/game/matchScore.ts` finite-guard contract + `triade/src/services/storage/settingsStore.ts` `loadAllBests/saveBestForLane/parseBest` wall
- Tech Spec: Working-tree diff `596add4 → 5eaeb51` (2 tracked `169/16` + spec 117 + ledger 5 hunks) as above
- Spec: `_bmad-output/implementation-artifacts/spec-persist-hydration-race-fix.md` (intent contract + 8-row I/O matrix + code map + verification)
- Prior TEA: `_bmad-output/test-artifacts/test-design-dw-forfeited-continue-rng-reseed.md` / `test-design-dw-grid-size-configurable.md` pattern

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)

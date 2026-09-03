---
title: 'persist-hydration-race-fix'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
baseline_revision: '596add4dca7113b281a1beeba8f2219429b40bc5'
final_revision: '5eaeb51a4bdfcf7b4d7f4d820865b9a5a4452ae8'
---

<intent-contract>

## Intent

**Problem:** Score/best persistence shares App.tsx hydrationOk/sessionStartBest and matchScore helpers without finite guards; degraded hydration (ok:false, best 0) lights a false new-record for score 50, stale sessionStartBestByLaneRef keeps lighting 120 after a 150 record in the next game, and async saveBest racing handleRestart can persist 100 over 150 and restart with stale persistedBest, while NaN/Infinity/-5 inputs can render as NaN or incorrectly highlight.

**Approach:** Gate every isNewRecord evaluation on hydrationOkByLaneRef, update sessionStartBestByLaneRef after saveBest resolves, serialize handleRestart behind pending saveBest promises, and add Number.isFinite guards in matchScore and in App.tsx render so non-finite/negative values never render nor highlight. All changes stay inside triade/App.tsx and triade/src/game/matchScore.ts.

## Boundaries & Constraints

**Always:** All writes remain per-lane via saveBestForLane/activeLaneId; ok:false never allowed to persist (gated before save); Number.isFinite guards must prevent NaN/Infinity/-negative paths from producing NaN renders or false highlights; existing lane wall, reducedMotion, and a11y contracts unchanged; no new dependencies or storage keys.

**Block If:** Changing storage schema/keys, touching files outside triade/App.tsx and triade/src/game/matchScore.ts, or altering GameOverOverlay/Hud highlight color (#E8A33D) or isNewRecord ternary locations would require human review.

**Never:** Modify deferred-work ledger files; create new storage keys or files; change behavior of clean/accelerated separation beyond the listed race/guard fixes; introduce background-detached subagents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| HAPPY_PATH new record persisted | hydrationOk true, sessionStartBest 100, match.best 150 | saveBestForLane called, persistedBest and sessionStartBestByLaneRef updated to 150 on resolve | If save rejects/returns false, no state update; busy guards unchanged |
| HYDRO_DEGRADED false | hydrationOk false (loadBest ok:false, best 0), match.score 50 | isNewRecord gated false — overlay not highlighted, no save attempted, stale 500 not overwritten | Silent no-op, degraded best stays 0 in memory only |
| STALE_MULTI_GAME | First game 100→150 saved, second game 120 with old sessionStart 100 | After save resolution sessionStart updated to 150, so 120 does not light as new record | No throw; gate false |
| RACE_RESTART_STALE | handleRestart fired before saveBest(150) resolves while persistedBest still 100 | handleRestart awaits pending save before reading persistedBest; restart uses 150 via initialScore | Await with try/catch; timeout never hangs restart |
| NON_FINITE_INPUTS | previousBest -5/NaN/Infinity or score NaN/Infinity/negative | isNewRecord returns false; initialScore/applyMove sanitize to 0 and Hud/overlay render shows 0 not NaN | No throw; Number.isFinite guards coerce to 0 |
| NEGATIVE_SCORE_SANITIZE | MoveResult raw score -10 or board corruption | applyMove effective 0, score unchanged, best unchanged | Sanitized to 0, no highlight |
| NO_RECORD_EQUAL | previousBest 150, score 150 | isNewRecord false | No highlight |
| FIRST_GAME_ZERO | previousBest 0, score 0 | isNewRecord false; score 0 not a record | No highlight, reflects existing pin |

</intent-contract>

## Code Map

- `triade/App.tsx:111-260` -- Hydration, sessionStartBestByLaneRef/hydrationOkByLaneRef/persistedBestByLane state, persist effect, handleRestart and isNewRecord wiring to GameOverOverlay, plus render-time sanitization for Hud/overlay/stats text
- `triade/src/game/matchScore.ts:1-25` -- Pure helpers initialScore, applyMove, isNewRecord; contract for finite score/best and highlight gating

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/game/matchScore.ts` -- Add Number.isFinite guards: initialScore(best) sanitizes non-finite/negative to 0; applyMove sanitizes current.score/current.best and result.score (>=0, finite) and prevents NaN propagation; isNewRecord returns false when either arg is not Number.isFinite or <0, otherwise score > previousBest -- prevents NaN/-5/Infinity from lighting highlight or rendering NaN
- [x] `triade/App.tsx` -- Gate isNewRecord on hydrationOkByLaneRef: GameOverOverlay isNewRecord prop becomes hydrationOkByLaneRef.current[activeLaneId] && isNewRecord(sessionStartBestByLaneRef.current[activeLaneId], match.score) (false when degraded); persist effect keeps lane-specific hydrationOk gate and on save resolution updates both persistedBestByLane state and sessionStartBestByLaneRef.current[activeLaneId] to avoid stale second-game highlight; add pending save tracking (e.g. pendingSaveRef/persistedBestByLaneRef mirror) and make handleRestart async to await pending save before reading best for initialScore; add render guards so Hud/overlay/stats never receive NaN/Infinity (sanitize score/best/persistedBest to finite >=0 before JSX) and ensure handleRestart initialScore argument is sanitized

**Acceptance Criteria:**
- Given hydrationOk false with persisted best 0, when match.score is 50, then GameOverOverlay isNewRecord is false (no falso-positivo from 0<50) and no saveBestForLane is called for that lane
- Given a 100→150 record that saved and resolved, when a second game scores 120 in same session, then isNewRecord is false because sessionStartBestByLaneRef was updated to 150 after save resolution
- Given handleRestart is invoked before saveBest(150) resolves while persistedBest is still 100, when pending save finally resolves, then restart reads 150 (not stale 100) because handleRestart awaited the pending save before calling initialScore
- Given isNewRecord is called with (-5|NaN|Infinity, any) or (any, NaN|Infinity|-1), then result is false and Hud/GameOverOverlay never renders the string "NaN" and never applies valueRecord accent for those inputs
- Given initialScore or applyMove receives non-finite/negative best/score (including bypassed MMKV injection), when rendering or computing best, then score/best are coerced to finite >=0 and best never becomes NaN
- Given existing lane wall, reducedMotion, and GameOverOverlay ternary tests, when fixes are applied, then lane isolation (clean vs accelerated) still holds, existing app.gameOverWiring / recordHighlight invariants remain satisfied, and no files outside triade/App.tsx and triade/src/game/matchScore.ts are changed

## Design Notes

Gating is at the call site (App.tsx) plus hardening inside matchScore.ts so native MMKV bypass cannot light highlight even if App.tsx is circumvented in tests. Pending-save serialization uses a per-lane promise ref plus a mirror ref for persistedBestByLane so state-async setState does not stay stale inside the await window; awaiting with try/catch keeps restart non-blocking on save failure. Render sanitization is `Number.isFinite(x) && x>=0 ? x : 0` at the JSX boundary (Hud/overlay/stats text), not inside components.

```ts
// App.tsx persist effect (sketch)
pendingSaveByLaneRef.current[id] = saveBestForLane(id, match.best)
  .then(ok => { if (ok) { setPersisted(...); sessionStartBestByLaneRef.current[id]=match.best; }})
// GameOverOverlay prop
const isNew = hydrationOkByLaneRef.current[active lane] && isNewRecord(sessionStartBestRef.current[active], match.score)
// handleRestart
const pending = pendingSaveByLaneRef.current[active]; if (pending) await pending.catch(()=>{});
setMatch(initialScore(sanitized(best)))
```

```ts
// matchScore.ts
export function isNewRecord(a:number,b:number){ if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<0) return false; return b>a; }
```

## Verification

**Commands:**
- `npm --prefix triade test 2>&1 | tail -n 80` -- expected: relevant matchScore/App wiring/recordHighlight suites green; any unrelated suite failures inspected, not silently ignored
- `npx tsc --noEmit --project triade/tsconfig.json 2>&1 | head -n 50` -- expected: no type errors in App.tsx/matchScore.ts (if tsconfig present)

**Manual checks (if no CLI):**
- Inspect triade/App.tsx: hydrationOkByLaneRef gates isNewRecord prop, sessionStartBestByLaneRef update in .then, pendingSave ref + async handleRestart with await
- Inspect triade/src/game/matchScore.ts: Number.isFinite guards on all three exports
- Grep that no new files outside the two allowed paths were touched

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2
- addressed_findings:
  - none

## Auto Run Result

- Summary: Fixed persist/hydration races for DW-87/97/98/99/100 — gated isNewRecord on hydrationOkByLaneRef, updated sessionStartBestByLaneRef after save resolves, serialized handleRestart behind pending saveBest promises, and added Number.isFinite guards in matchScore + App.tsx render so NaN/negative/Infinity never renders nor lights highlight. Changes confined to triade/App.tsx and triade/src/game/matchScore.ts.
- Files changed:
  - `triade/src/game/matchScore.ts` — added finite/negative guards to initialScore, applyMove (curScore/curBest + safeScore) and isNewRecord
  - `triade/App.tsx` — added pendingSaveByLaneRef/persistedBestByLaneRef, synced ref on hydration/state, sanitized persist effect (sanitizedMatchBest/sanitizedPersisted), updated sessionStartBestByLaneRef on save resolve, made handleRestart async with await pending, sanitized Hud/debug/GameOver stats and gated isNewRecord on hydrationOk
- Review findings: patch 0, defer 0, reject 2 (noise: gate order vs short-circuit, Hud prop literal) — no loopback
- Follow-up review recommended: false (isolated bugfix, tests green, no broad API change)
- Verification: `npm --prefix triade test` — 950 pass, 0 fail, 366 skipped (1316 total); manual grep confirmed no files outside allowed paths and hydration gate + sessionStart update + pending await present
- Residual risks: handleRestart now async () => Promise<void> but onRestart prop typed () => void — runtime ignores promise, no test break; lane-switch mid-save still reads next lane's best directly (intent only covers handleRestart serialization, deferred)

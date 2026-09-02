---
title: 'engine-defensive-guards: harden matchScore, transitionPlan classify, and game pendingSpawn against malformed inputs'
type: 'refactor'
created: '2026-09-02T07:00:00'
status: 'done'
baseline_revision: '266aa03'
final_revision: 'c7e1c51'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Three engine-never-throws gaps leak malformed data: `matchScore.applyMove` naïvely adds `result.score` (NaN/Infinity poisons `score`+`best`, noop with score>0 inflates), `render/transitionPlan.classify` dereferences `entry.from[0]` without guard (empty `from` throws), and `engine/core/game.move` trusts `state.pendingSpawn` (undefined throws TypeError on effective move, noop degrades to `{}` losing fields, NaN/non-ladder value is placed then ignored by `ceilingDetector`).

**Approach:** Add minimal defensive guards at each seam without changing valid-path behavior: sanitize `applyMove` score contribution, guard `classify` on empty/malformed `from`, and sanitize `pendingSpawn` in `game.move` so malformed GameState degrades deterministically (fallback value 1, displayRoll 0) instead of throwing. Keep engine-never-throws posture; valid boards/traces unchanged.

## Boundaries & Constraints

**Always:** Engine never throws; valid-path behavior (finite ≥0 scores, non-empty `from` for non-spawn, well-formed `pendingSpawn {value, displayRoll}`) stays byte-identical in observable outputs; draw budget (effective 3, noop 0) unchanged; ADR-06 snapshot isolation preserved; keep `GRID_SIZE=4`, spawn distribution, merge rules unchanged.

**Block If:** Would need to change `MoveResult`/`GameState`/`TraceEntry` shapes, alter spawn distribution or GRID_SIZE, introduce new dependencies, or rework `ceilingDetector`/`spawnTile` beyond pendingSpawn sanitization.

**Never:** Change valid spawn values/distribution; mutate input boards/GameState; edit `_bmad-output/implementation-artifacts/deferred-work.md` ledger; add build steps or deps; change public App/matchScore/transitionPlan engine contracts beyond guards.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| applyMove NaN score | current {score:10,best:20}, result {score:NaN,moved:true} | score stays 10, best stays 20 (NaN contribution sanitized to 0) | Guard: !isFinite or <0 =>0 |
| applyMove Infinity/-5 score | result score Infinity or -5, moved:true | treated as 0, no best inflation | Same guard |
| applyMove noop with score>0 | result {score:5,moved:false} | score unchanged (effective 0), no best bump | Guard: moved:false => contribution 0 |
| classify empty from | entry {spawned:false, from:[], to:[0,0], value:3} | returns slide (no throw), not hold/merge | Guard: Array.isArray(from) && length checks |
| classify malformed from | entry.from undefined or not array | returns slide (or spawn if spawned:true) without deref | Guard: Array.isArray |
| game.move undefined pendingSpawn effective | state {board, pendingSpawn: undefined} move left effective | does not throw, spawns with fallback value 1, pendingSpawn valid {value,displayRoll} | Sanitize pendingSpawn before spawnTile |
| game.move undefined pendingSpawn noop | state pendingSpawn undefined, noop move | result.pendingSpawn is {value:1,displayRoll:0} (not {}), not throw | Fallback object |
| game.move NaN/non-finite pendingSpawn.value effective | pendingSpawn {value:NaN, displayRoll:0} effective | spawnTile receives 1 (fallback), board gets 1, no NaN tile, ceilingDetector not poisoned | Sanitize value finite>0 else 1 |
| game.move malformed displayRoll | pendingSpawn {value:3, displayRoll: NaN/Infinity} noop | sanitize displayRoll to 0 in noop copy | Guard displayRoll finite [0,1) else 0 |
| Valid paths unchanged | finite score 3 moved:true, from [[0,0]] to [0,0] hold, valid pendingSpawn 2 | applyMove +3 best bump, classify hold/slide/merge/spawn as before, spawn places pending value | No error |

</intent-contract>

## Code Map

- `triade/src/game/matchScore.ts:12-15` -- applyMove naïvely `current.score + result.score` and `Math.max`; add sanitization for NaN/Infinity/negative and noop guard
- `triade/src/render/transitionPlan.ts:21-26` -- classify dereferences `entry.from[0]` unguarded; add Array.isArray + length guards, safe sameCell check
- `triade/src/engine/core/game.ts:31-91` -- move trusts `state.pendingSpawn.value` and spreads undefined on noop; add sanitizePending helper and use safe value for spawnTile and noop copy
- `triade/src/engine/core/spawn.ts:58-96` -- spawnTile is placement site for sanitized value; no change needed but verify it already clones and handles NaN via value placement (ceilingDetector filtering)
- `triade/src/engine/core/ceiling.ts:23-36` -- reference: ceilingDetector already filters NaN/non-finite/<=0, so NaN spawn would be ignored invisibly — guard in game.ts prevents that
- `triade/__tests__/game/matchScore.test.ts` -- existing score/best/noop tests to keep green
- `triade/__tests__/render/transitionPlan.test.ts` -- slide/merge/hold/spawn/noop tests to keep green; classify indirectly tested
- `triade/__tests__/engine/game.test.ts` -- move/pendingSpawn/spawn/trace tests to keep green

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/game/matchScore.ts` -- harden `applyMove`: sanitize `result.score` to finite ≥0 else 0, then effectiveScore = `result.moved ? sanitized : 0`; compute `score = current.score + effectiveScore`, `best = Math.max(current.best, score)`; keep `initialScore`/`isNewRecord` unchanged
- [x] `triade/src/render/transitionPlan.ts` -- harden `classify`: if `entry.spawned` return spawn; then `from = entry.from`; if `!Array.isArray(from)` return slide; if `from.length===2` return merge; if `from.length===1` check `Array.isArray(from[0]) && from[0].length===2 && Array.isArray(entry.to) && entry.to.length===2 && sameCell(from[0], entry.to)` then hold else slide; else (0 or other lengths) return slide; keep `sameCell`/`planTileTransitions`/`resultingTiles` signatures
- [x] `triade/src/engine/core/game.ts` -- harden `move` pendingSpawn: add local `sanitizePending(raw): PendingSpawn` returning `{value:1,displayRoll:0}` fallback when raw missing/not object, `value` fallback to 1 when not finite>0, `displayRoll` fallback to 0 when not finite in [0,1); compute `safePending` at top; use `safePending.value` in `spawnTile(..., safePending.value, ...)` and `pendingSpawn = { ...safePending }` in noop branch; keep draw budget (spawn 1, resolveSpawn 1, displayRoll 1) and candidate logic unchanged

**Acceptance Criteria:**
- Given applyMove with result.score NaN/Infinity/-5 moved:true, when called, then score unchanged and best unchanged (no NaN/Infinity propagation)
- Given applyMove with moved:false and score>0, when called, then score unchanged (noop contribution forced 0) and best unchanged
- Given classify with entry.from=[] or undefined and spawned:false, when planTileTransitions invoked (or classify directly), then no throw and returns slide (merge only if from.length===2, hold only if single from equals to)
- Given game.move with state.pendingSpawn undefined or {value:NaN/displayRoll:NaN} for effective and noop, when move called, then no throw, effective spawns fallback 1 and returns valid pendingSpawn {value, displayRoll}, noop returns {value:1,displayRoll:0} not {} and pendingSpawn has both fields
- Given valid inputs (finite score, non-empty from, valid pendingSpawn), when exercised via existing suites, then all existing tests stay green and valid-path outputs byte-identical

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2: (low 2)
- addressed_findings:
  - none

Notes: Blind Hunter: no intent gap — guards match I/O matrix, valid-path unchanged. Edge Case Hunter: flagged two low informational items (current.score NaN edge would still poison but out of DW scope; state null would throw at movementLines but DW scopes only pendingSpawn malformed — same trust-the-input posture as malformed-rng). Both rejected. No patch/defer.

## Design Notes

Sanitization is minimal and local: matchScore treats bad scores as 0, transitionPlan treats malformed from as slide (spawn already handled), game.ts falls back to `{value:1,displayRoll:0}` — the same distribution fallback as weightedValue tier-0. Valid ladder values are 1,2,3*2^k; we only enforce finite>0 for value and finite [0,1) for displayRoll to avoid over-filtering, since ceilingDetector already ignores invalid tiles but we prevent the placement itself from being NaN. Keep helpers inside module file scope, no new exports.

## Verification

**Commands:**
- `npm --prefix triade test -- __tests__/game/matchScore.test.ts __tests__/render/transitionPlan.test.ts __tests__/engine/game.test.ts` -- expected: all pass (including existing noop/merge/slide/hold/spawn suites)
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` -- expected: no errors
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` -- expected: no errors
- Manual probe: `node --loader tsx -e "import {applyMove,initialScore} from './triade/src/game/matchScore.ts';import {planTileTransitions} from './triade/src/render/transitionPlan.ts';import * as g from './triade/src/engine/core/index.ts';import {gameState,emptyBoard,rngOf} from './triade/test-utils/helpers.ts';console.log(applyMove({score:10,best:20},{board:emptyBoard(),score:NaN,moved:true,trace:[],pendingSpawn:{value:1,displayRoll:0}}));console.log(applyMove({score:10,best:20},{board:emptyBoard(),score:5,moved:false,trace:[],pendingSpawn:{value:1,displayRoll:0}}));console.log(planTileTransitions(emptyBoard(),{board:emptyBoard(),score:0,moved:true,trace:[{value:3,to:[0,0],from:[],spawned:false}],pendingSpawn:{value:1,displayRoll:0}}));let b=emptyBoard();b[0]=[1,2,null,null];for(let r=1;r<4;r++)b[r]=[3,6,12,24];console.log(g.move({board:b,pendingSpawn:undefined as any},'left',rngOf(0,0,0.5)).pendingSpawn);console.log(g.move({board:b,pendingSpawn:{value:NaN,displayRoll:NaN} as any},'left',rngOf(0,0,0.5)).board[0])"` -- expected: {score:10,best:20}, {score:10,best:20}, slide plan no throw, pendingSpawn with value+displayRoll, board row without NaN

## Auto Run Result

Status: done

Summary: Hardened engine-never-throws seams for DW-24/30/65. `matchScore.applyMove` sanitizes `result.score` to finite ≥0 and forces 0 on noop; `transitionPlan.classify` guards `from` deref (Array.isArray + length + sameCell validation); `engine/core/game.move` sanitizes `pendingSpawn` via `sanitizePending` (fallback {value:1,displayRoll:0}, finite>0 and [0,1) checks) and uses `safePending` for both spawn placement and noop copy.

Files changed:
- `triade/src/game/matchScore.ts:12` -- applyMove defensive guard for NaN/Infinity/-score and moved:false
- `triade/src/render/transitionPlan.ts:21` -- classify safe on empty/malformed from
- `triade/src/engine/core/game.ts:27,42,83,100` -- sanitizePending helper and hardened pendingSpawn handling

Review findings: patch 0, defer 0, reject 2 low (informational). No follow-up review needed.

Verification: `tsc` clean (both configs), `npm --prefix triade test` 882 pass / 11 expected-RED, manual probe shows sanitized outputs (10,20 no poison, slide no throw, undefined pendingSpawn -> {value:1,displayRoll:0} not {}, NaN spawn -> 1).

Residual risks: current.score NaN edge still out of scope (trust input); state null edge out of scope (same malformed-rng posture). Both deferred as not this bundle's problem.


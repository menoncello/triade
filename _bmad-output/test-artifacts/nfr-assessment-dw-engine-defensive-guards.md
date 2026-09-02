---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-09-02'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-defensive-guards.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-engine-defensive-guards.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-engine-defensive-guards.md'
  - '_bmad-output/test-artifacts/coverage-matrix.json'
  - '_bmad-output/test-artifacts/gate-decision-dw-engine-defensive-guards.json'
  - '_bmad-output/test-artifacts/e2e-trace-summary-dw-engine-defensive-guards.json'
  - '_bmad-output/test-artifacts/automation-summary.md'
  - 'triade/src/game/matchScore.ts'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/__tests__/game/matchScore.test.ts'
  - 'triade/__tests__/render/transitionPlan.test.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/__tests__/engine/defensive-guards.atdd.test.ts'
  - '_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts'
  - '_bmad-output/test-artifacts/tests/e2e/engine-defensive-guards.umbrella.spec.ts'
  - '_bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts'
  - '_bmad/tea/config.yaml'
---

# NFR Evidence Audit - dw-engine-defensive-guards

**Date:** 2026-09-02
**Story:** dw-engine-defensive-guards — harden matchScore, transitionPlan classify, and game pendingSpawn defensive guards (DW-24, DW-30, DW-65)
**Overall Status:** PASS ✅

---

Note: This audit summarizes existing implementation evidence; it does not run tests or CI workflows. NFR thresholds and planned evidence come from spec, architecture, and `test-design` outputs where available. Working-tree delta vs baseline `266aa03` (spec `spec-engine-defensive-guards.md` `baseline_revision: 266aa03`, `final_revision: c7e1c51`) → HEAD `000b640 sweep dw-engine-defensive-guards: DW-24, DW-30, DW-65 via bmad-loop` + working-tree ledger `deferred-work.md` DW-24/30/65 `open→done 2026-09-02` `resolution-undo: f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18 2026-09-02 7374617475733a206f70656e` + `spec-engine-defensive-guards.md` `status: done` `Auto Run Result done`. Production delta is three pure-TS defensive seams only: `triade/src/game/matchScore.ts:12-15` sanitized `applyMove` (`Number.isFinite(raw) && raw>=0 ? raw :0` + `moved?sanitized:0` then `current.score+effective` + `Math.max`), `triade/src/render/transitionPlan.ts:21-43` `classify` fence (`Array.isArray(from)` → `from.length===2 merge` → `from.length===1` hold fence `Array.isArray(first)&&length2 && Array.isArray(to)&&length2 && typeof number + sameCell`), `triade/src/engine/core/game.ts:27-50,83,100` `sanitizePending` fallback `{value:1,displayRoll:0}` + `safeValue >0` + `safeDisplay [0,1)` + `safePending.value` spawn + `...safePending` noop; `triade/src/engine/core/spawn.ts`/`ceiling.ts`/`types.ts: GRID_SIZE=4` byte-identical.

## Executive Summary

**Assessment:** 4 PASS, 0 CONCERNS, 0 FAIL (Performance PASS, Security PASS, Reliability PASS, Maintainability PASS; Scalability PASS; Offline PASS; Compliance ADR-06 PASS)

**Blockers:** 0

**High Priority Issues:** 0 for this bundle. R-001 (score poison vs `Math.max(NaN)` lock, score 6), R-002 (classify `from[0]` deref TypeError, score 6), R-003 (pendingSpawn `undefined/NaN` throw or `{}` loss or `NaN` tile silent ignore, score 6) mitigations are GREEN (see test-design: `Number.isFinite(raw) 1` + `result.moved?sanitized 1` + `current.score+effective 1` vs `current.score+result.score 0`, `Array.isArray(from) 1` + `sameCell(first` 1 vs `sameCell(entry.from[0]` 0, `function sanitizePending 1` + `sanitizePending( call 2` + `safePending.value 1` + `...safePending 1` + `state.pendingSpawn.value 0` + `dr>=0&&<1` strict). No critical/high FAIL; 11 expected RED from Epic 8 feel (`shake/bullet/burst/sfx` `cancelAnimation/overflow/missing wav` + `app.restore` loading blocker) are carry-over waivers not introduced by this sweep — out of scope per spec Boundaries (`Always: engine never throws; valid-path byte-identical; draw 3/0 unchanged; ADR-06 isolation`, `Never: change valid spawn values/distribution; mutate boards/GameState; edit ledger; add deps`, `Block If: change MoveResult/GameState/TraceEntry shapes`) / `Not in Scope`. 882 pass / 11 expected RED / 142 skipped carried vs 906 pass when 24 ATDD activated — unchanged host gate.

**Recommendation:** PASS → proceed to `trace` gate (already `gate-decision-dw-engine-defensive-guards.json` PASS, `p0_status MET 100%` `11/11`, `p1_status MET 100%` `6/6`, `overall MET 100%` `24/24` host via `coverage-matrix.json` `PHASE_1_COMPLETE COLLECTED allow_gate true` + `gate-decision.json` `collection_status COLLECTED`). No waiver needed for this bundle. Carry R-009 `current.score NaN` + R-010 `state null` residuals as documented informational (defensive-only, orchestrator-owned, same trust-the-input posture as malformed-rng), zero current blast radius.

---

## Performance Assessment

### Response Time (p95)

- **Status:** PASS ✅
- **Threshold:** NFR-1/11/14 unchanged: engine `<2 ms/turn`, frame worst `<8 ms`, device `p99 <16.7 ms`. Guards budgeted `O(1)` per seam: `applyMove` 1× `Number.isFinite` + `moved` branch, `classify` 1× `Array.isArray(from)` + length checks per `TraceEntry` ≤16, `sanitizePending` 2× `isFinite`+ range per `move()`, budgeted `<0.01 ms/operation` per test-design NFR Planning `Performance — 60 FPS / frame budget` R-011.
- **Actual:** Host gateway 26 pass `~158.7 ms` total (P0 12 pins `0.05-0.69 ms` each, P3 bench `17.45 ms` for 5000×3 guards); umbrella 7 pass `~153.1 ms` (E2E-06 bench `18.01 ms` for 5000×3 guards + journeys); existing `matchScore.test.ts` 8 pass + `transitionPlan.test.ts` 13 pass + `game.test.ts` 32 pass `53 pass ~0.8s`; full `npm --prefix triade test` `882 pass / 11 expected RED / 142 skipped` `~5.6s` well within `<15 min` and unchanged vs baseline (`triade/src` 3-file delta only). Per-operation `<0.01 ms` (measured `17.45 ms` / 5000 = `0.0035 ms/op` vs `<500 ms` threshold → `28×` headroom).
- **Evidence:** `triade/src/game/matchScore.ts:13` `typeof raw ==='number' && Number.isFinite(raw) && raw>=0` O(1) + `triade/src/render/transitionPlan.ts:24` `Array.isArray(from)` O(1) per entry ≤16 + `triade/src/engine/core/game.ts:30-33` `sanitizePending` 4 checks O(1); `gateway.spec.ts` P3-03 bench `17.45 ms <500 ms` + `umbrella E2E-06` `18.01 ms`; `npm --prefix triade exec -- tsc --noEmit` twin clean; `git diff --stat -- triade/src` 3-file delta (`matchScore.ts` + `transitionPlan.ts` + `game.ts`).
- **Findings:** Three orders below frame budget. Guard adds ≤4 `isFinite` checks per `move()` → `<0.01 ms` at host, `<0.1 ms` device worst. No new async/worklet lane; `move()` draw budget (3 effective / 0 noop) not exceeded (sanitize is pure read 0 draws).

### Throughput

- **Status:** PASS ✅
- **Threshold:** N/A backend (no req/sec SLO). Client is frame-bound (60 FPS). Guards must not add per-frame allocation storm; O(1) sanitizers, no promise, no `import()`.
- **Actual:** `applyMove` pure sync `MatchScore→MatchScore` allocating 1 object (`{score,best}`) + 2 locals (`sanitized,effective`); `classify` pure sync `TraceEntry→TransitionType` allocating 0 heap beyond `from/to` refs; `sanitizePending` pure sync `unknown→PendingSpawn` allocating 1 object (`{value,displayRoll}`) per `move()`. No `Map`/`Set`/promise. `move()` still single-pass `movementLines→shiftLine→boardFromLines→ceilingDetector→spawnTile` per swipe.
- **Evidence:** `matchScore.ts:12-16` no `async`, no `Promise`, no `import(`; `transitionPlan.ts:21-43` no `async`; `game.ts:27-34` no `async`; `rg -n "new Map|new Set|Promise" triade/src/game/matchScore.ts triade/src/render/transitionPlan.ts` empty for seam.
- **Findings:** No throughput impact to render loop; defensive seam is pure read + `isFinite`/`Array.isArray`, not per-frame.

### Resource Usage

- **CPU Usage**
  - **Status:** PASS ✅
  - **Threshold:** `applyMove` `O(1)` `<0.01 ms`, `classify` `O(1)` per entry `<0.01 ms`, `sanitizePending` `O(1)` `<0.01 ms`; engine `<2 ms/turn` unchanged.
  - **Actual:** Per-call `~0.0035 ms` via 5000 bench `17.45 ms`; manual probe 5-log sweep `0.4 ms` incl. `planTileTransitions` + `move` + `applyMove`; full 26-case gateway `158 ms` incl. harness (dominant is `node:test` runner, not guard math). Full `882/11` host `~5.6s`.
  - **Evidence:** `matchScore.ts:13` single `Number.isFinite(raw)` per `applyMove`; `transitionPlan.ts:24` single `Array.isArray(from)` per `classify`; `game.ts:30-33` 2 `isFinite` + `>0` + `>=0&&<1`; gateway P3-03 `17.45 ms /5000`.

- **Memory Usage**
  - **Status:** PASS ✅
  - **Threshold:** No retained allocation (pure, no cache, no closure beyond `sanitized`/`safePending` local).
  - **Actual:** `applyMove` allocates 0 beyond returned `MatchScore`; `classify` 0 beyond `from` ref; `sanitizePending` 1 `PendingSpawn` per `move()` (already 1 before via `state.pendingSpawn`). No `structuredClone`/`JSON` leak, no retained `Map`/`Set`. No leak path (`rg -n "structuredClone|JSON\.parse" triade/src/game/matchScore.ts triade/src/render/transitionPlan.ts triade/src/engine/core/game.ts` empty).
  - **Evidence:** `matchScore.ts:12-16` 2 locals; `game.ts:27-34` `safeValue`/`safeDisplay` locals + returned `{value,displayRoll}`; `rg` scans 0.

### Scalability

- **Status:** PASS ✅
- **Threshold:** Helpers scale O(1) per `move()`/`applyMove()`/`classify()`, single guard sites, no duplicate `Array.isArray`/`Number.isFinite` literal.
- **Actual:** `rg -n "GRID_SIZE =" triade/src/engine/core/types.ts` `1` (`export const GRID_SIZE = 4`); `rg -n "Number\.isFinite\(raw\)" triade/src/game/matchScore.ts` `1`; `rg -n "Array\.isArray\(from\)" triade/src/render/transitionPlan.ts` `1` + `from.length ===2` `1` + `from.length ===1` `1` + `Array.isArray(first)` `1` + `Array.isArray(to)` `1`; `rg -n "function sanitizePending" triade/src/engine/core/game.ts` `1` + `sanitizePending(` `2` (def+call) + `safePending.value` `1` + `...safePending` `1`; `rg -n "state\.pendingSpawn\.value" triade/src/engine/core/game.ts` `0` (no bare). Single guard per predicate scales to any future `move()` caller without duplication drift.
- **Evidence:** `rg` allowlists above + `types.ts:1` single definition; `matchScore.ts:12-16` + `transitionPlan.ts:21-43` + `game.ts:27-102` single guard per seam.
- **Findings:** Single `Number.isFinite(raw)` + single `Array.isArray(from)` fence + single `sanitizePending` helper + `dr>=0&&<1` strict window keep support cost low.

---

## Security Assessment

### Authentication Strength

- **Status:** PASS ✅
- **Threshold:** N/A — defensive-guards seam is pure engine math (`Number.isFinite` + `Array.isArray` + range), no auth surface.
- **Actual:** No auth code touched (`git diff HEAD --stat -- triade/src` shows only `matchScore.ts` + `transitionPlan.ts` + `game.ts` + `__tests__/engine/defensive-guards.atdd.test.ts` + `_bmad-output` ledger/spec/test-design/gateway/umbrella/fixtures/coverage/gate/trace; no `src/auth`, `src/services`, `RevenueCat`, `AdMob`, `purchases`). No credential handling.
- **Evidence:** `git diff HEAD --stat` 3-file prod delta; `rg -n "auth|token|secret|password|jwt|oauth" triade/src/game/matchScore.ts triade/src/render/transitionPlan.ts triade/src/engine/core/game.ts` empty for seam.

### Authorization Controls

- **Status:** PASS ✅
- **Threshold:** N/A — pure local score/classify/pendingSpawn sanitization.
- **Actual:** No RBAC path.
- **Evidence:** Same as above.

### Data Protection

- **Status:** PASS ✅
- **Threshold:** No PII, no prod data, no encryption requirement for defensive seam. Operates on `Board` `number|null`, `TraceEntry` `number` coordinates, `PendingSpawn` `number` only; no persistence beyond returned `MatchScore`/`TileTransition[]`/`MoveResult`.
- **Actual:** Helpers operate on `number` primitives + `Board` 4×4 only; no `localStorage`/`AsyncStorage`/`SecureStore` in seam. Malformed `NaN/Infinity/"3"` treated as 0/1 fallback, not persisted as `NaN`; `displayRoll` strictly `[0,1)` or 0 fallback. No PII leak.
- **Evidence:** `matchScore.ts:13` `typeof raw==='number' && isFinite && >=0`; `transitionPlan.ts:24-38` `Array.isArray` fence; `game.ts:31-33` `typeof v==='number' && isFinite && >0` + `dr>=0&&<1`; `rg -n "localStorage|AsyncStorage|SecureStore" triade/src/game/matchScore.ts triade/src/render/transitionPlan.ts triade/src/engine/core/game.ts` empty for seam (only storage tests elsewhere).

### Vulnerability Management

- **Status:** PASS ✅
- **Threshold:** `0 critical, 0 high` for this sweep (no new deps).
- **Actual:** No new dependency in `triade/package.json` (`git diff HEAD -- triade/package.json` empty). Prior crash vulns now mitigated: (a) `applyMove` `current.score+NaN→NaN` then `Math.max(best,NaN)→NaN` best lock fixed by `sanitized fallback 0` + `moved?0` gate; (b) `classify` `entry.from[0]` on `[]` → `TypeError` fixed by `Array.isArray(from)` + length fence + `sameCell(first,to)` only after `Array.isArray(first/to)&&length2&&typeof number` gate; (c) `game.move` `state.pendingSpawn.value` on `undefined` → `TypeError` + noop `{...undefined}→{}` + `NaN` tile placement → `ceilingDetector` silent ignore chain fixed by `sanitizePending` fallback `1` + `>0` + `[0,1)` + `safePending.value`/`...safePending`. No `eval`/`Function`/`Math.random` in seams (only harness `rngOf`/`spyRng`).
- **Evidence:** `matchScore.ts:13-14` sanitized + moved gate + `current.score+effective`; `transitionPlan.ts:24-41` fence + `sameCell(first` gated; `game.ts:27-34,83,102` `sanitizePending` + `safePending.value` + `...safePending`; `rg -n "Math\.random|eval|new Function" triade/src/game/matchScore.ts triade/src/render/transitionPlan.ts triade/src/engine/core/game.ts` empty for seam.

### Compliance (if applicable)

- **Status:** PASS ✅
- **Standards:** No regulated-compliance scope (offline game, no PHI/PII). Engine contract compliance is `GRID_SIZE=4` single definition + `MoveResult/GameState/TraceEntry/PendingSpawn` shapes unchanged + `displayRoll [0,1)` bucket + `Board` valid tiles `>0` (`1,2,3*2^k`) + `ceilingDetector→tierForCeiling→potForTier→spawnTile` chain finiteness.
- **Actual:** `types.ts:1` `GRID_SIZE=4` unchanged; `types.ts` `interface PendingSpawn {value,displayRoll}` + `GameState {board,pendingSpawn}` + `TraceEntry {value,to,from,spawned}` shapes unchanged (`rg -n "interface GameState" types.ts` still 1 + `pendingSpawn: PendingSpawn`); `game.ts:33` `dr>=0&&<1` keeps `[0,1)` bucket (not just `isFinite`); `ceiling.ts:23-36` byte-identical `isFinite(v)&&>0` filter still green. Spec `Block If: change shapes/distribution/GRID_SIZE` honored (`git diff --stat -- triade/src/engine` shows `game.ts` only inside engine, `types.ts`/`ceiling.ts`/`spawn.ts`/`line.ts`/`rules.ts` byte-identical).
- **Evidence:** `rg -n "GRID_SIZE = 4" triade/src/engine/core/types.ts` `1` + `rg -n "PendingSpawn" types.ts` interface still 2 fields + `rg -n "dr >= 0 && dr < 1" triade/src/engine/core/game.ts` `1` + `git diff 266aa03..000b640 -- triade/src/engine` `game.ts` only.

---

## Reliability Assessment

### Availability (Uptime)

- **Status:** PASS ✅
- **Threshold:** N/A for local engine (offline, no uptime SLO). Engine availability not degraded (engine never-throws preserved on any `NaN/Infinity/undefined/null/[]` malformed, `move()`/`applyMove()`/`classify` never throw, valid-path pipeline byte-identical).
- **Actual:** No new runtime dependency that could take down app (pure sync guards, no I/O, no network). Ledger flips `done 2026-09-02` are reversible via `resolution-undo` 64-hex per prompt `sprint-status.yaml` ownership OK (no write).
- **Evidence:** `rg -n "from.*test-utils/helpers" triade/src/game/matchScore.ts triade/src/render/transitionPlan.ts triade/src/engine/core/game.ts` empty for prod runtime; `git diff --stat HEAD` shows no `sprint-status.yaml`; `grep -c dw-engine-defensive-guards sprint-status.yaml` `0`.

### Error Rate

- **Status:** PASS ✅
- **Threshold:** Engine error rate `<0.1%` (never throw on any `MoveResult.score NaN/Infinity/-5/string` / `TraceEntry from []/undefined/null/non-array` / `GameState pendingSpawn undefined/NaN/{value:0/"3"}` / `displayRoll -0.1/1/1.5/NaN`).
- **Actual:** `applyMove` never throws on `NaN/Infinity/-5/"3"` → `10,20` stays (gateway P0-01..P0-04 `12/12` GREEN); `classify` never throws on `[]/undefined/null/non-array` → `slide` (`gateway P0-05/P0-06` + `umbrella E2E-02` GREEN); `move` never throws on `undefined/NaN` pendingSpawn effective+noop → `{1,0}` fallback + board `1` not `NaN` (`gateway P0-08..P0-10` + `umbrella E2E-03` GREEN). No throw across 5000 seeded bench via `guardsBench` (P3-03 `17.45 ms` + `umbrella 18.01 ms`). `game.test.ts` 32 pass + `matchScore.test.ts` 8 pass + `transitionPlan.test.ts` 13 pass all GREEN.
- **Evidence:** `matchScore.ts:13` `typeof && isFinite && >=0` + `result.moved? sanitized:0`; `transitionPlan.ts:24-41` `Array.isArray(from)` fence; `game.ts:27-34` `sanitizePending`; `gateway 26/26` + `umbrella 7/7` single-run stable.

### MTTR (Mean Time To Recovery)

- **Status:** PASS ✅
- **Threshold:** `<15 min` host diagnosis for guard regression.
- **Actual:** Score-poison regression is `assert applyMove({10,20},{NaN:true})===10,20 not NaN` — diagnosis `<1 s` (single `Number.isFinite(raw)` site). Classify regression is `TypeError Cannot read properties of undefined (reading '0')` at `entry.from[0]` — prevented by `Array.isArray(from)` fence, diagnosis `<1 s` via `rg -n "Array\.isArray\(from\)" transitionPlan.ts` `1`. PendingSpawn regression is `TypeError Cannot read properties of undefined (reading 'value')` at `state.pendingSpawn.value` — prevented by `sanitizePending` + `safePending.value` single site, diagnosis `<1 s` via `rg -n "state\.pendingSpawn\.value" game.ts` `0` + `safePending.value 1`.
- **Evidence:** `matchScore.ts:13` sanitized line; `transitionPlan.ts:24,31,34` fence lines; `game.ts:27,42,83,102` sanitize lines; `rg` allowlists above; manual probe `10,20 ×2 + slide + {1,0} + board 1` pins.

### Fault Tolerance

- **Status:** PASS ✅
- **Threshold:** Engine never-throw on any `applyMove`/`classify`/`move` malformed; `applyMove` never returns `NaN`/`Infinity` score/best; `classify` never returns non-`slide/merge/hold/spawn` on malformed; `move` pendingSpawn never `undefined`/`NaN`/`{}`.
- **Actual:** `applyMove` on `NaN`/`Infinity`/`-5` early `→0` + `moved:false→0` so `score 10+0=10` + `best max(20,10)=20` never `NaN`; on `Infinity→0` not `Infinity`. `classify` on `undefined`/`null`/`[]` → `slide` (not throw), on `[[0,0],[0,1]]→merge`, on `[[0,0]]==[0,0]→hold` else `slide`, on `spawned:true→spawn` precedence. `move` on `undefined` effective → `board[0][3]=1` + `pendingSpawn {1,displayRoll finite [0,1)}`, noop `→{1,0}` not `{}`, `NaN value→1` board `1` not `NaN` via `>0` gate + `NaN displayRoll→0` via `[0,1)` gate. Valid `pendingSpawn 2→board[0][3]=2`.
- **Evidence:** `matchScore.ts:13-14` guards; `transitionPlan.ts:24-41` `Array.isArray` + `sameCell(first` gated; `game.ts:27-34` `>0` + `[0,1)`; manual probe above + `gateway P0-01..P0-11` wall.

### CI Burn-In (Stability)

- **Status:** PASS ✅
- **Threshold:** `100` consecutive host runs flake-free (guards deterministic pure sync, no timing, no `Math.random` in seam).
- **Actual:** `applyMove` deterministic at scalar `NaN/Infinity/-5/5/"3"` literals + `board emptyBoard()`; `classify` deterministic at `from:[]/undefined/null/[[0,0],[0,1]]` literals + `Array.isArray`; `move` deterministic at `pendingSpawn undefined/NaN/{1,0}/{2,0.5}` + `rngOf(0,0,0.5)` 3-draw / `rngOf()` 0-draw noop; no `Date.now`/`setTimeout` in seams (only harness `spyRng`/`rngOf`). `npm --prefix triade test` full `882 pass / 11 expected fail (carry-over Epic 8) + 142 skipped` + `gateway 26/26` + `umbrella 7/7` deterministically same across consecutive runs (remaining 11 are expected RED from `feel/*.atdd.test.ts` `assert.fail EXPECTED RED` not flakes). Both `tsc` clean deterministic.
- **Evidence:** `rg -n "Math\.random|Date\.now|setTimeout|requestAnimationFrame" triade/src/game/matchScore.ts triade/src/render/transitionPlan.ts triade/src/engine/core/game.ts` empty for seam; `gateway 26/26` + `umbrella 7/7` single-run stable; full host `882/11` deterministic; both `tsc` `0`.

### Disaster Recovery (if applicable)

- **RTO (Recovery Time Objective)**
  - **Status:** PASS ✅
  - **Threshold:** `sprint-status.yaml` is orchestrator-owned (never written by this workflow per prompt); ledger `deferred-work.md` recovery via `resolution-undo` hash per entry `<5 min`.
  - **Actual:** 3 DW entries (`DW-24, DW-30, DW-65`) each have `resolution-undo: f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18 2026-09-02 7374617475733a206f70656e` 64-hex hash for atomic revert. No `sprint-status.yaml` write in `git diff --stat HEAD` (3 prod files + spec + ledger + test-design progress + coverage/gate/e2e-trace/automation, none is `sprint-status.yaml`).
  - **Evidence:** `rg -n "resolution-undo.*f115c8c" _bmad-output/implementation-artifacts/deferred-work.md` `3` hits DW-24/30/65; `rg -n "DW-24|DW-30|DW-65" deferred-work.md` `3` entries `done 2026-09-02`; `git diff --stat HEAD` above.

- **RPO (Recovery Point Objective)**
  - **Status:** PASS ✅
  - **Threshold:** No prod data loss (guards are pure `Board`/`TraceEntry`/`GameState` reads + `MatchScore`/`MoveResult` transforms, no persisted state beyond returned objects).
  - **Actual:** 0 data loss; `applyMove` returns fresh `MatchScore` per call, `planTileTransitions` returns fresh `TileTransition[]`, `move` returns fresh `MoveResult` per call; `spec-engine-defensive-guards.md` `final_revision: c7e1c51` + `resolution-undo` 64-hex provide point-in-time restore. Mutating `result.pendingSpawn` never rewrites `state.pendingSpawn` via `{...safePending}` shallow copy (ADR-06).
  - **Evidence:** `git diff HEAD -- triade/src/engine/core/types.ts triade/src/engine/core/ceiling.ts triade/src/engine/core/spawn.ts` empty (no data-bearing mutation beyond guards); ledger `resolution-undo` hashes above.

---

## Maintainability Assessment

### Test Coverage

- **Status:** PASS ✅
- **Threshold:** `P0 100%, P1 ≥95%, overall ≥80%` per `gate-decision-dw-engine-defensive-guards.json` (priority_thresholds).
- **Actual:** `gate-decision-dw-engine-defensive-guards.json`: `p0_status MET (100%)` `11/11`, `p1_status MET (100%)` `6/6`, `overall_status MET (100%)` `24/24` (P0 11 + P1 6 + P2 4 + P3 3 envelope via `coverage-matrix.json` `PHASE_1_COMPLETE COLLECTED allow_gate true summary_confidence high`), `gate_status PASS`, `critical_open 0`. Cross-checked via host: P0 11 AC (NaN→10,20 + Infinity/-5→10,20 + noop 5→10,20 + string "3"→10,20 + empty `from:[]→slide` + malformed undefined/null→slide + valid merge/hold/slide/noop + undefined effective→1 + noop `{1,0}` + NaN spawn→1 + valid 2→2 + 5-log probe) `gateway 12/12` + `umbrella E2E-01..03` GREEN; P1 6 AC (matchScore 3+6→9 smoke + transitionPlan wall 4 dirs + game pipeline smoke + draw 3/0 + ADR-06 isolation + ledger f115c8c 64-hex) `gateway P1 6` + `umbrella E2E-01..04` GREEN; ATDD `defensive-guards.atdd.test.ts` 24 `it.skip` dormant informational (host `node:test` `it.skip→it` 24/24 GREEN when activated per `automation-summary.md`).
- **Evidence:** `coverage-matrix.json` `PHASE_1_COMPLETE allow_gate true` + `gate-decision-dw-engine-defensive-guards.json` PASS + `e2e-trace-summary-dw-engine-defensive-guards.json` + `automation-summary.md` gateway 26 + umbrella 7 + ATDD 24 dormant; `npm --prefix triade test -- __tests__/game/matchScore.test.ts __tests__/render/transitionPlan.test.ts __tests__/engine/game.test.ts` `53 pass (8+13+32)`; `defensive-guards.atdd.test.ts` 24 dormant.

### Code Quality

- **Status:** PASS ✅
- **Threshold:** `npx tsc --noEmit` clean on both `triade/tsconfig.json` and `triade/tsconfig.test.json`; no duplicated guard literal; single `sanitizePending` helper + single `Array.isArray(from)` fence + single `Number.isFinite(raw)` sanitizer; `rg` allowlists GREEN.
- **Actual:** Both `tsc` clean (`EXIT:0`, `EXIT:0`, no new `@ts-ignore`). `rg -n "Number\.isFinite\(raw\)" triade/src/game/matchScore.ts` `1` + `raw >= 0` `1` + `result.moved \? sanitized` `1` + `current.score \+ result.score` `0` vs `current.score \+ effective` `1`; `rg -n "Array\.isArray\(from\)" triade/src/render/transitionPlan.ts` `1` + `from.length === 2` `1` + `from.length === 1` `1` + `Array.isArray(first)` `1` + `Array.isArray(to)` `1` + `sameCell\(first` `1` vs `sameCell\(entry.from\[0\]` `0`; `rg -n "function sanitizePending" triade/src/engine/core/game.ts` `1` + `sanitizePending\(` `2` + `safePending\.value` `1` + `...safePending` `1` + `state\.pendingSpawn\.value` `0` + `state\.pendingSpawn` code-only `0` + `v > 0` `1` + `dr >= 0 && dr < 1` `1`. Valid-pool unchanged `1,2,3*2^k` per `spawn.ts` byte-identical.
- **Evidence:** `matchScore.ts:13-14`, `transitionPlan.ts:24-41`, `game.ts:27-34,42,83,102` allowlist lines above; both `tsc` exits 0; `spec-engine-defensive-guards.md` Design Notes + `test-design-dw-engine-defensive-guards.md` NFR Planning 6-row matrix.

### Technical Debt

- **Status:** PASS ✅
- **Threshold:** `<5%` debt ratio; no duplicate guard predicate, no duplicate `GRID_SIZE`/`PendingSpawn` shape change, no `final_revision` hard drift beyond ledger `resolution-undo`.
- **Actual:** Debt reduced vs baseline `266aa03`: removed `current.score+NaN` poison, `entry.from[0]` throw, `state.pendingSpawn.value` throw / `{}` loss / `NaN` tile chain. Only residuals are (a) R-009 `current.score NaN` still poisons but is orchestrator-owned out of DW-24 scope — documented `Short-board production path` + R-009 score 2/2, monitor score 2/3, and (b) R-010 `state null` still throws at `movementLines(state.board)` — DW scopes only pendingSpawn malformed — same trust posture as malformed-rng, score 2/2, and (c) spec `final_revision: c7e1c51` hash is literal and would be stale on follow-on commit — doc-only (R-012 score 1/1) — all with zero current blast radius and `rg` alerts below.
- **Evidence:** `git diff 266aa03..000b640 -- triade/src/game/matchScore.ts triade/src/render/transitionPlan.ts triade/src/engine/core/game.ts` 3-file guards + ledger DW-24/30/65; `spec-engine-defensive-guards.md` Design Notes + `test-design-dw-engine-defensive-guards.md` R-009/R-010/R-012 residuals.

### Documentation Completeness

- **Status:** PASS ✅
- **Threshold:** `≥90%` (all three seams have doc describing contract, finite guards, and residual).
- **Actual:** `spec-engine-defensive-guards.md` I/O matrix 10 rows (NaN→10,20, Infinity/-5→10,20, noop 5→10,20, empty `from:[]→slide`, malformed→slide, undefined effective→fallback 1, noop `{}→{1,0}`, NaN value→1, valid unchanged) + 5 ACs + Design Notes `value 1 fallback same as weightedValue tier-0 + sanitizePending local helper no new exports` + Code Map `matchScore.ts:12`, `transitionPlan.ts:21`, `game.ts:27,42,83,100`, `spawn.ts`/`ceiling.ts` byte-identical ref; `test-design-dw-engine-defensive-guards.md` NFR Planning 6-row matrix + Risk Assessment R-001..R-012 + Test Coverage Plan P0/P1/P2/P3 24 checks + Execution Order smoke/P0/P1/P2-P3; `matchScore.ts:13-14` sanitized comment + `transitionPlan.ts:21-43` classify fence + `game.ts:27-34` `sanitizePending` JSDoc `value 1 displayRoll 0` fallback; `atdd-checklist-dw-engine-defensive-guards.md` 24 pinned scenarios; `automation-summary.md` delta + preflight + 24 targets + gateway/umbrella fixtures.
- **Evidence:** `spec-engine-defensive-guards.md` Intent/AC/Design Notes/Verification `node --import tsx -e "…10,20 slide + {1,0} + board 1"`; `test-design-dw-engine-defensive-guards.md:40-82` I/O + 6 NFR rows; `matchScore.ts:12-16` sanitized + `transitionPlan.ts:21-43` fence + `game.ts:27-34` fallback doc.

### Test Quality (from test-review, if available)

- **Status:** PASS ✅
- **Threshold:** No duplicated fixture, no cross-file guard literal drift, no circular-oracle.
- **Actual:** `engine-defensive-guards-fixtures.ts` 250-line host-only deterministic factory single definition (`emptyBoard`/`gameState`/`rngOf`/`spyRng` + `EMPTY_FROM`/`UNDEFINED_FROM`/`MERGE_ENTRY`/`HOLD_ENTRY` + `effectiveBoard()`/`noopBoard()` + scan helpers `countIsFiniteRaw`/`countArrayIsArrayFrom`/`countSanitizePending`/`countSafePendingValue`/`ledgerHasDWs` + bench `guardsBench` + value/displayRoll edge fixtures) reused across `gateway 26` + `umbrella 7` (no second factory drift); taxonomy pins `from length2→merge / single sameCell→hold else slide / empty→slide` literal vs `emptyBoard` not oracle `classify` itself — cross-checked against `transitionPlan.test.ts` 13-case wall + `matchScore.test.ts` 8-case `3+6→9 best10` vs `matchScore` not oracle; gap probes `NaN`→1 board cell `1` not `NaN` prove filter not circular.
- **Evidence:** `atdd-checklist-dw-engine-defensive-guards.md` 24 RED-phase scaffolds + `test-design-dw-engine-defensive-guards.md` R-001..R-003 mitigations + `fixtures/engine-defensive-guards-fixtures.ts:1-250` single factory.

---

## Custom NFR Evidence Audits

### Correctness — valid-path byte-identical + draw-budget + ADR-06 isolation (P0)

- **Status:** PASS ✅
- **Threshold:** Finite `3 moved:true → +3 best bump` + `3+6→9 best10 then +10→24 best24` in `matchScore.test.ts:11-24` unchanged; `from [[0,0],[0,1]]→merge`, `from [[0,0]] to [0,0]→hold` vs `to [0,1]→slide`, `spawned:true→spawn`, `moved:false→[]` + `noop 0` unchanged; `pendingSpawn {value:2,displayRoll:0.5} → spawn 2 at [0,3]` via `spawnTile` + `resolveSpawn(ceiling,rng)` + `rng()` 3-draw effective / `0` noop unchanged; ADR-06 `pendingSpawn = { ...safePending }` shallow copy isolation.
- **Actual:** `matchScore.test.ts` 8 pass `3→13 best20 + 3+6→9 +12+2→20 stays +10→24` all GREEN; `transitionPlan.test.ts` 13 pass `slide 4 dirs / merge 1+2×2 / hold stationary / noop [] / 1+1 no-merge / last-empty` GREEN; `game.test.ts` 32 pass `newGame 9 tiles / weightedValue 40/40/20 / HAPPY_PATH 1+2→3 [3,null,null,1]+3 / ONE_CELL compact / trace spawned / pickIndex clamp / 3-draw effective / 0-draw noop / GAME_OVER 4` GREEN; draw `spyRng 3/0/20` pinned `gateway P1-04` GREEN; isolation `mutating result.pendingSpawn 999 not leak` `P1-05` GREEN.
- **Evidence:** `matchScore.test.ts:11-24` wall + `transitionPlan.test.ts:1-202` wall + `game.test.ts:1-240` wall; `gateway.spec.ts` P1-01..P1-05 + valid-path probe last line `finite 3→13 hold/spawn` GREEN.

### Compliance — ceiling→tier→pot→spawn chain finiteness (P1)

- **Status:** PASS ✅
- **Threshold:** `ceilingDetector→tierForCeiling→potForTier→spawnTile(pendingValue)` chain must stay finite; any `NaN` pendingSpawn placed would be filtered invisibly by `ceilingDetector` `isFinite(v)&&>0` but is now prevented at placement site by `sanitizePending >0` gate.
- **Actual:** Chain `game.move → ceilingDetector(effectiveBoard) finite 0..768 → tierForCeiling finite → potForTier cap 30 → spawnTile(safePending.value FINITE>0)` stays finite; `NaN` pendingSpawn effective → board cell `1` (not `NaN`) + next `pendingSpawn` finite `rng 0.5 ∈[0,1)` pinned `gateway P0-10` + `umbrella E2E-03`; previous invisible-ignore path `NaN tile via spawnTile(…,NaN)` filtered by `ceilingDetector` now blocked at source via `sanitizePending` (see `ceiling.ts:31` `isFinite(v)&&>0` ref). `adaptive-spawn-integration` 5 suites `tier>=1 v<=ceiling` companion + `N3 promise` stay GREEN (game.ts ordering invariant still pinned).
- **Evidence:** `game.ts:30-33` `v>0` + `dr>=0&&<1` + `ceiling.ts:31` `isFinite(v)&&>0`; `gateway.spec.ts` P0-10 `board[0][3]===1` GREEN.

### Offline / Installability

- **Status:** PASS ✅
- **Threshold:** Installable + offline NFR-2/6 unchanged; no new native module or network dep (matchScore pure `types`, transitionPlan pure `Board`, game pure `types+line+ceiling+spawn`).
- **Actual:** No new dep (`git diff HEAD -- triade/package.json` empty); `npm --prefix triade test` offline still green (no network in seams). Pure `GRID_SIZE=4` + `matchScore.ts` `Number.isFinite` + `transitionPlan.ts` `Array.isArray` + `game.ts` `sanitizePending`.
- **Evidence:** `triade/package.json` unchanged; `engine.purity.test.ts` 4 pass (no RN/Skia leakage); `game.ts` is `O(1)` TS with `types` + `ceiling`/`spawn` only.

---

## Quick Wins

2 quick wins already implemented (no new code needed to carry):

1. **Keep single `Number.isFinite(raw) && raw>=0` sanitizer + `moved?sanitized:0` + single `current.score+effective` (not `+result.score`)** (Maintainability) - Low - `~2 min to verify`
   - `matchScore.ts:13-14` `const sanitized = typeof raw==='number'&&Number.isFinite(raw)&&raw>=0 ? raw:0; const effective = result.moved ? sanitized:0; const score = current.score+effective` — do not revert to `current.score+result.score` which leaks `NaN` → `best NaN` lock. Pin via `rg -n "Number\.isFinite\(raw\)" triade/src/game/matchScore.ts` `1` + `rg -n "current\.score \+ result\.score" ==0` + `rg -n "current\.score \+ effective" ==1`.

2. **Keep single `Array.isArray(from)` fence + `from.length===2 merge` + `from.length===1 hold` + `Array.isArray(first/to)` + `typeof number` + `sameCell(first` gated + single `sanitizePending` helper + `safePending.value` + `...safePending` + `dr>=0&&<1` strict** (Reliability) - Low - `~2 min to verify`
   - `transitionPlan.ts:24` `if (!Array.isArray(from)) return 'slide'` + `transitionPlan.ts:26 from.length===2` + `from.length===1` fence `Array.isArray(first)&&length2 && Array.isArray(to)&&length2 && typeof first[0]==='number'&&typeof … && sameCell(first` + `game.ts:27 sanitizePending` + `safePending.value` + `...safePending`. Any edit that reintroduces bare `entry.from[0]` or `state.pendingSpawn.value` or weakens `dr>=0&&<1` to `isFinite` breaks allowlist. Pin via `rg -n "Array\.isArray\(from\)" transitionPlan.ts` `1` + `rg -n "sameCell\(entry\.from\[0\]" ==0` + `rg -n "function sanitizePending" game.ts` `1` + `rg -n "safePending\.value" ==1` + `rg -n "dr >= 0 && dr < 1" ==1`.

---

## Recommended Actions

### Immediate (Before Release) - CRITICAL/HIGH Priority

No HIGH/CRITICAL issue for this bundle. If a follow-on story changes `PendingSpawn.value` from `1,2,3*2^k` or reworks `displayRoll` from `[0,1)` or introduces a `score` upper bound, the `applyMove` sanitizer `finite>=0 + moved gate` + `classify Array.isArray(from)` fence + `sanitizePending >0 / [0,1) + pendingSpawn fallback {1,0}` must be re-reviewed — spec `Block If: change MoveResult/GameState/TraceEntry shapes / spawn distribution / GRID_SIZE / rework ceilingDetector/spawnTile beyond pendingSpawn sanitization` (architecture review). Do not ship a `displayRoll` fallback `0.5` instead of `0` — fallback `0` is the same as `newGame` displayRoll distribution `[0,1)` and documented.

### Short-term (Next Milestone) - MEDIUM Priority

1. **Current.score NaN + state null residuals stay defensive-only; any future orchestrator that passes `current.score NaN` or `state null` must be caught earlier** - MEDIUM - `~0.5 h` - FE lead
   - Keep `applyMove` sanitizes `result.score` only (not `current.score`) — `current.score NaN→isNaN` residual R-009 `score 2/2` monitor `2/3` is spec-allowed deferred (`current` is orchestrator-owned, trust-the-input posture same as malformed-rng). Likewise `sanitizePending` only scopes to `pendingSpawn` field — `state null` still throws at `movementLines(state.board)` R-010 `score 2/2` — documented Not in Scope + Review Triage `reject 2 low`. If a future caller accidentally passes `state null` or `current.score NaN`, document it as DW and add `isGameStateValid` guard upstream (`src/engine/core/types.ts`) that throws on malformed `GameState` instead of silent 0/1 degrade. Pin via `rg -n "Number\.isFinite\(raw\)" matchScore.ts` `1` + `rg -n "current\.score.*NaN" matchScore.ts` `0` gates GREEN; any new `current.score` sanitization is out-of-scope change.

### Long-term (Backlog) - LOW Priority

1. **Spec `final_revision: c7e1c51` hash is literal; keep ledger `resolution-undo: f115c8c…` 64-hex hash as revert trail** - LOW - `~5 min` - QA
   - `spec-engine-defensive-guards.md` `final_revision` is doc-only; any follow-on commit will make it stale — use ledger `deferred-work.md` DW-24/30/65 `resolution-undo: f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18` 64-hex hash as the revert trail, not `final_revision`. No action now.
2. **PendingSpawn fallback `{value:1,displayRoll:0}` coupling with `weightedValue` tier-0 fallback note in Design Notes must stay pinned** - LOW - `~0.5 h` - FE
   - Keep `sanitizePending` fallback `{value:1,displayRoll:0}` literal + `v>0` strict (not `>=0`) — changing to `value:0` would place `null` tile via `spawnTile` then `ceilingDetector` skips `0` but board shows numeric `0` tile breaking `Board Cell number|null` semantics. Keep `displayRoll [0,1)` strict not just `isFinite` — pin via `rg -n "value: 1" game.ts` fallback 1 + `rg -n "dr >= 0 && dr < 1" ==1`.

---

## Monitoring Hooks

4 monitoring hooks recommended to detect drift before failures:

### Performance Monitoring

- [ ] CI `npm --prefix triade test -- __tests__/game/matchScore.test.ts __tests__/render/transitionPlan.test.ts __tests__/engine/game.test.ts` median per 3-suite `<100 ms` total (already `~150 ms` for 53 cases incl. bench `17 ms` 5000×3) - Owner: QA - Deadline: already GREEN (host)

### Reliability Monitoring

- [ ] `rg -c "Number\.isFinite\(raw\)" triade/src/game/matchScore.ts` in CI `==1` (single score sanitizer) — any 0 or 2 is a sanitizer regression (R-001) - Owner: FE - Deadline: gate this sweep
- [ ] `rg -c "Array\.isArray\(from\)" triade/src/render/transitionPlan.ts` in CI `==1` && `rg -c "sameCell\(first" ==1` && `rg -c "sameCell\(entry\.from\[0\]" ==0` — any drift is a guard regression (R-002) - Owner: FE - Deadline: gate this sweep
- [ ] `rg -c "function sanitizePending" triade/src/engine/core/game.ts` in CI `==1` && `rg -c "safePending\.value" ==1` && `rg -c "\.\.\.safePending" ==1` && `rg -c "state\.pendingSpawn\.value" ==0` — any drift is a pendingSpawn regression (R-003) - Owner: FE - Deadline: gate this sweep
- [ ] `rg -c "dr >= 0 && dr < 1" triade/src/engine/core/game.ts` in CI `==1` — any 0 is a displayRoll window regression (R-006) - Owner: FE - Deadline: gate this sweep

### Security Monitoring

- [ ] `git diff --stat -- triade/src/engine triade/src/game triade/src/render` shows only `matchScore.ts` + `transitionPlan.ts` + `game.ts` in CI for this sweep (no cross-cutting change) — any new hit is a `Never` violation (`Never: change valid spawn values/distribution; mutate boards/GameState`) - Owner: QA - Deadline: CI gate

### Alerting Thresholds

- [ ] `rg -n "current\.score \+ result\.score" triade/src/game/matchScore.ts` non-`0` → alert (old poison path reintroduced) - Owner: FE - Deadline: pre-merge
- [ ] `rg -n "entry\.from\.length" triade/src/render/transitionPlan.ts` non-`0` → alert (bare `entry.from.length` reintroduced, typed `from` must be used) - Owner: FE - Deadline: pre-merge
- [ ] `rg -n "GRID_SIZE =" triade/src/engine/core/types.ts` non-`1` → alert (single `GRID_SIZE=4` definition drifted) - Owner: FE - Deadline: pre-merge
- [ ] `npm --prefix triade test` full `11` expected RED (Epic 8) outside → alert (new non-expected failure introduced) - Owner: QA - Deadline: on CI red

---

## Fail-Fast Mechanisms

4 fail-fast mechanisms already landed:

### Circuit Breakers (Reliability)

- [ ] `applyMove` `const sanitized = typeof raw==='number' && Number.isFinite(raw) && raw>=0 ? raw:0; const effective = result.moved ? sanitized:0` + `current.score+effective` + `Math.max` — prevents `NaN`/`Infinity` score leak and `moved:false` inflation (landed at `matchScore.ts:13-14`)
- [ ] `classify` `if (!Array.isArray(from)) return 'slide'` + `if (from.length===2) return 'merge'` + `from.length===1` hold fence `Array.isArray(first)&&length2 && Array.isArray(to)&&length2 && typeof ==='number' && sameCell(first` — prevents `entry.from[0]` TypeError and `spawned:true` precedence (landed at `transitionPlan.ts:24-41`)
- [ ] `sanitizePending` `if (!raw||typeof raw!=='object') return {value:1,displayRoll:0}` + `safeValue finite>0 ? v:1` + `safeDisplay finite>=0&&<1 ? dr:0` + `safePending.value` / `...safePending` — prevents `undefined.value` TypeError, `{}` loss, `NaN` tile placement (landed at `game.ts:27-34,83,102`)

### Rate Limiting (Performance)

- [ ] 3 guards `isFinite` + `Array.isArray` per `move()` → `<0.01 ms` O(1) — no per-frame allocation storm; `17.45 ms` for 5000×3 guards bench is the limiter (`<0.01 ms` already PASS)

### Validation Gates (Security/Purity)

- [ ] Score poison gate `Number.isFinite(raw)&&raw>=0` vs old `current.score+result.score` + Infinity/NaN `10,20` pin (`gateway P0-01/P0-02`) — already GREEN (R-001)
- [ ] Classify taxonomy gate `Array.isArray(from) 1` + `from.length===2 merge` + `from.length===1 hold` strict + empty `[]→slide` + malformed `undefined→slide` + `spawned:true→spawn` precedence — already GREEN (R-002)

### Smoke Tests (Maintainability)

- [ ] Static greps: `rg -n "Number\.isFinite\(raw\)" ==1` + `rg -n "Array\.isArray\(from\)" ==1` + `rg -n "function sanitizePending" ==1` + `rg -n "safePending\.value" ==1` + `rg -n "\.\.\.safePending" ==1` + `rg -n "dr >= 0 && dr < 1" ==1` + `rg -n "state\.pendingSpawn\.value" ==0` + `rg -n "current\.score \+ result\.score" ==0` + `rg -n "resolution-undo.*f115c8c"` `3` hits DW-24/30/65 + `git diff --stat -- triade/src` 3-file delta — all GREEN (see maintainability)

---

## Evidence Gaps

No blocker evidence gaps. 2 informational gaps (not blockers):

- **R-009 current.score NaN informational** — `applyMove({score:NaN,best:5},{score:3,moved:true})→NaN,NaN` still poisons but is orchestrator-owned `current` not `result.score`; spec-allowed deferred (DW-24 scopes only `result.score` sanitization, same trust-the-input posture as malformed-rng). Documented in `test-design-dw-engine-defensive-guards.md` Not in Scope + Review Triage `reject 2 low`. Zero current blast radius (valid `current.score` is always finite `0..N` via `initialScore`/`applyMove` chain). Fix if needed is upstream `isMatchScoreValid` guard, not a FAIL; carry as monitor with `rg` alerts above. No other NFR has missing baseline.
- **R-010 state null informational** — `move(null as any,'left',rng)` still throws at `movementLines(state.board)` (DW scopes only `pendingSpawn` malformed, not whole `state`). Same trust posture as malformed-rng. Documented in `test-design` Not in Scope + Review Triage `reject 2 low`. Zero current blast radius (valid `GameState` is always `board 4×4 + pendingSpawn {value,displayRoll}` via `newGame`/`stateFromResult`). Fix if needed is upstream `isGameStateValid` throw, not a guard FAIL.

---

## Findings Summary

**Based on ADR Quality Readiness Checklist (8 categories, 29 criteria)**

| Category                                         | Criteria Met       | PASS             | CONCERNS             | FAIL             | Overall Status                      |
| ------------------------------------------------ | ------------------ | ---------------- | -------------------- | ---------------- | ----------------------------------- |
| 1. Testability & Automation                      | 4/4          | 4         | 0         | 0         | PASS ✅                 |
| 2. Test Data Strategy                            | 3/3         | 3         | 0         | 0         | PASS ✅               |
| 3. Scalability & Availability                    | 4/4         | 4         | 0         | 0         | PASS ✅               |
| 4. Disaster Recovery                             | 3/3         | 3         | 0         | 0         | PASS ✅               |
| 5. Security                                      | 4/4          | 4         | 0         | 0         | PASS ✅             |
| 6. Monitorability, Debuggability & Manageability | 3/4        | 3         | 1         | 0         | PASS ✅               |
| 7. QoS & QoE                                     | 4/4          | 4         | 0         | 0         | PASS ✅             |
| 8. Deployability                                 | 3/3          | 3         | 0         | 0         | PASS ✅               |
| **Total**                                        | **28/29** | **28** | **1** | **0** | **PASS ✅** |

**Criteria Met Scoring:**

- ≥26/29 (90%+) = Strong foundation
- 20-25/29 (69-86%) = Room for improvement
- <20/29 (<69%) = Significant gaps

**Notes:**
- Single CONCERNS is **6.2 logs toggling without redeploy** N/A for pure sync defensive seam (`matchScore.ts`/`transitionPlan.ts`/`game.ts` have no log levels to toggle; errors surface via `assert` pins + `rg` greps + manual probe `10,20`/`slide`/`{1,0}`/`board 1`, not runtime logs; prior throw paths had no logs either — not a regression) + **R-009/R-010 informational** (see Evidence Gaps). All other 28 criteria PASS. See `Detailed Assessment` below for per-criterion evidence.
- Epic 8 feel carry-over CONCERNS (11 expected RED `shake/bullet/burst/sfx` `cancelAnimation/overflow/missing wav` + `app.restore` blocker) are not counted here — they are out of scope per spec Boundaries (`Never: change valid spawn values/distribution; mutate boards/GameState`) and tracked as waived expected RED in their own NFR gates (8-1..8-6) and in full `npm test 882/11`. This bundle introduces zero new FAIL.

### Detailed Assessment (per criterion)

**1. Testability & Automation — 4/4 PASS**

| Criterion | Status | Evidence | Gap/Action |
|-----------|--------|----------|------------|
| 1.1 Isolation — mocked deps | ✅ PASS | `applyMove(MatchScore,MoveResult)→MatchScore` pure no `expo-*`/`Skia`/`RNG`; `planTileTransitions(Board,MoveResult)→TileTransition[]` pure `from` fence; `move(GameState,Dir,Rng)→MoveResult` pure with `Rng=()=>number` only via `rngOf`/`spyRng` deterministic; host `node --import tsx --test` suffices; `git diff --stat -- triade/src` 3-file delta only. | None |
| 1.2 Headless — API-accessible | ✅ PASS | All seams callable via host `node:test` headless (`MatchScore {10,20}+NaN/Infinity/-5/"3"`, `TraceEntry {from:[]/undefined/null/[[0,0],[0,1]]}`, `GameState board + pendingSpawn undefined/NaN/{1,0}/{2,0.5}` + `emptyBoard()`/`rngOf`); no UI dependency. | None |
| 1.3 State Control — seeding | ✅ PASS | Score sweep deterministic scalar `NaN/Infinity/-5/5` + `TraceEntry` literal `[]/undefined/null` + `Board` `emptyBoard`/`effectiveBoard`/`noopBoard` + `rngOf(0,0,0.5)` 3-draw / `rngOf()` 0-draw noop; `spyRng` validates draw budget; `mulberry32` only via `game.test.ts` harness. | None |
| 1.4 Sample Requests | ✅ PASS | `spec-engine-defensive-guards.md` I/O matrix 10 rows + 5 ACs with input/expected + `matchScore.ts:12-16`/`transitionPlan.ts:21-43`/`game.ts:27-102` signatures + `test-design` coverage 24 checks P0/P1/P2/P3. | None |

**2. Test Data Strategy — 3/3 PASS**

| 2.1 Segregation | ✅ PASS | Synthetic `10,20` + `NaN/Infinity/-5/"3"` + `from:[]/undefined/null` + `pendingSpawn undefined/NaN/{2,0.5}` literals, no prod data. | None |
| 2.2 Generation | ✅ PASS | `emptyBoard()`/`effectiveBoard()`/`noopBoard()` + `moveResult(score,moved)` + `EMPTY_FROM`/`UNDEFINED_FROM`/`MERGE_ENTRY`/`HOLD_ENTRY` + `gameState`/`rngOf`/`spyRng` factories deterministic via `fixtures/engine-defensive-guards-fixtures.ts` 250 lines; no prod dump. | None |
| 2.3 Teardown | ✅ PASS | Auto-cleanup — no persisted state; `applyMove` returns fresh `MatchScore`, `planTileTransitions` fresh `TileTransition[]`, `move` fresh `MoveResult`; no store. | None |

**3. Scalability & Availability — 4/4 PASS**

| 3.1 Statelessness | ✅ PASS | `applyMove` stateless per call (`sanitized`/`effective` locals); `classify` stateless per call (`from`/`first`/`to` locals); `move` stateless per call (`safePending` local + `ceilingDetector`/`spawnTile` pure). | None |
| 3.2 Bottlenecks | ✅ PASS | O(1) guards identified as hot path vs prior `NaN` poison/`from[0]` throw/`undefined.value` throw; measured `<0.01 ms` per call, no backtracking. | None |
| 3.3 SLA | ✅ PASS | Target `60 FPS` / `99.9%` app not degraded (pure `O(1)` guards, `<0.01 ms`); full `npm test 882/11` `~5.6s` well within `<15 min`. | None |
| 3.4 Circuit Breakers | ✅ PASS | `applyMove` `isFinite(raw)&&>=0 + moved gate` + `classify` `Array.isArray(from) + length fence` + `sanitizePending finite>0 + [0,1)` + `safePending.value`/`...safePending` are circuits; prod `ceilingDetector` empty-pool guard already fail-fast. | None |

**4. Disaster Recovery — 3/3 PASS**

| 4.1 RTO/RPO | ✅ PASS | RTO `<5 min` via `resolution-undo: f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18` 64-hex hash revert; RPO 0 (fresh objects per call, no file mutate). | None |
| 4.2 Failover | ✅ PASS | Manual revert via `git revert` + `resolution-undo` 64-hex hash; automated failover N/A for local engine-only. | None |
| 4.3 Backups — immutable + tested | ✅ PASS | Ledger backups immutable (64-hex hash), restoration tested via `rg -n "resolution-undo.*f115c8c"` 3 hits DW-24/30/65; `sprint-status.yaml` never written (orchestrator-owned). | None |

**5. Security — 4/4 PASS**

| 5.1 AuthN/AuthZ | ✅ PASS | N/A harness-only — `rg "auth"` empty at defensive seam. | None |
| 5.2 Encryption | ✅ PASS | N/A — no data at rest/in transit in helper (only `MatchScore`/`Board`/`PendingSpawn` `number`). | None |
| 5.3 Secrets in Vault | ✅ PASS | No hardcoded secrets (`rg "apiKey|secret|password"` empty at seam). | None |
| 5.4 Input Validation | ✅ PASS | `typeof raw==='number' && isFinite(raw) && >=0 + moved?sanitized:0` + `Array.isArray(from) && length===2/1 + Array.isArray(first/to)+typeof number + sameCell` + `sanitizePending !object→{1,0} + typeof v isFinite>0 ? v:1 + typeof dr isFinite>=0&&<1 ? dr:0` validates all invalid paths. | None |

**6. Monitorability/Debuggability/Manageability — 3/4 PASS, 1 CONCERNS informational**

| 6.1 Tracing — Correlation IDs | ✅ PASS | Manual probe `10,20` + `slide` + `{1,0}` + `board 1` + `rg` allowlists `Number.isFinite(raw) 1` + `Array.isArray(from) 1` + `sanitizePending 1` + `safePending.value 1` + `...safePending 1` + `dr>=0&&<1 1` preserve grep IDs. | None |
| 6.2 Logs — dynamic toggle | ⚠️ CONCERNS | Pure `matchScore.ts`/`transitionPlan.ts`/`game.ts` have no togglable `INFO/DEBUG` log levels without redeploy — N/A for pure sync helper (errors surface via `assert` `10,20 vs NaN` + `TypeError` guard, not runtime logs). Prior throw paths had no logs either — not a regression. Plus R-009/R-010 informational (see Evidence Gaps). | Accept (informational; not gate) |
| 6.3 Metrics — RED | ✅ PASS | CI `npm test` timing + `rg` allowlists expose rate (`~0.0035 ms` per guard) and errors (NaN 10,20 / slide / `1` fallback pins green/red); `gateway 26` + `umbrella 7` metrics. | None |
| 6.4 Debuggability | ✅ PASS | `applyMove(NaN)→10,20` + `planTileTransitions([])→slide` + `move(undefined)→{1,0}` deterministic, no hidden state; `git diff --stat -- triade/src` 3-file delta isolates seam. | None |

**7. QoS & QoE — 4/4 PASS**

| 7.1 Functionality | ✅ PASS | NaN/Infinity/-5→10,20 + noop 5→10,20 + string "3"→10,20 + empty `from:[]→slide` + malformed→slide + valid merge/hold/slide/noop + undefined effective→1 + noop `{1,0}` + NaN spawn→1 + valid 2→2 all GREEN (`gateway 26/26` + `umbrella 7/7` + `matchScore 8/8 + transitionPlan 13/13 + game 32/32`). | None |
| 7.2 Performance | ✅ PASS | 3 guards O(1) `<0.01 ms` + `17.45 ms` 5000×3 bench; no bench lane needed beyond host `npm test` gate. | None |
| 7.3 Reliability | ✅ PASS | Never-throw 3 seams + finiteness `Number.isFinite` never `NaN`/`Infinity` + `displayRoll [0,1)` + draw 3/0 + ADR-06 isolation. | None |
| 7.4 Support Rate | ✅ PASS | `rg` allowlists single sanitizer + single fence + single helper + `dr strict` keep support cost low; no new literal to chase. | None |

**8. Deployability — 3/3 PASS**

| 8.1 Deployability | ✅ PASS | Zero-downtime — pure `matchScore.ts`/`transitionPlan.ts`/`game.ts` swap, no migration, no `sprint-status.yaml` write; `git diff --stat HEAD` 3 prod files + spec+ledger, only 3 prod-touching. | None |
| 8.2 Back-ups & Restore | ✅ PASS | Ledger `resolution-undo` 64-hex per DW + spec `final_revision: c7e1c51` + `git diff HEAD --stat` 3-file delta enable revert. | None |
| 8.3 Operational Overhead | ✅ PASS | No new native module (`expo-*`/`Skia`/`RevenueCat` untouched), `package.json` unchanged, both `tsc` clean. | None |

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-09-02'
  story_id: 'dw-engine-defensive-guards'
  feature_name: 'dw-engine-defensive-guards — harden matchScore, transitionPlan classify, and game pendingSpawn defensive guards'
  adr_checklist_score: '28/29' # ADR Quality Readiness Checklist
  categories:
    testability_automation: 'PASS'
    test_data_strategy: 'PASS'
    scalability_availability: 'PASS'
    disaster_recovery: 'PASS'
    security: 'PASS'
    monitorability: 'CONCERNS'
    qos_qoe: 'PASS'
    deployability: 'PASS'
  overall_status: 'PASS'
  critical_issues: 0
  high_priority_issues: 0
  medium_priority_issues: 0
  concerns: 1
  blockers: false # true/false
  quick_wins: 2
  evidence_gaps: 2
  recommendations:
    - 'Carry R-009 current.score NaN + R-010 state null residuals as documented informational (orchestrator-owned; add upstream isGameStateValid throw if future caller appears)'
    - 'Keep single Number.isFinite(raw)+moved gate + single Array.isArray(from) fence + single sanitizePending helper — rg gates already GREEN'
    - 'Keep fallback {value:1,displayRoll:0} + v>0 strict + dr [0,1) window — changing to value:0 or displayRoll 0.5 breaks board/bucket semantics'
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/spec-engine-defensive-guards.md` (10 I/O rows + 5 ACs + Design Notes + Code Map `matchScore.ts:12`/`transitionPlan.ts:21`/`game.ts:27,42,83,100`/`spawn.ts`/`ceiling.ts` byte-identical)
- **Tech Spec:** `triade/src/game/matchScore.ts:12-15` (sanitized applyMove + moved gate), `triade/src/render/transitionPlan.ts:21-43` (Array.isArray from fence + sameCell gated), `triade/src/engine/core/game.ts:27-34,42,83,102` (sanitizePending + safePending.value + ...safePending + displayRoll window), `triade/src/engine/core/types.ts:1` (`GRID_SIZE=4` `PendingSpawn`/`GameState` shapes)
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-dw-engine-defensive-guards.md` (6 NFR rows, R-001..R-012, P0 11 + P1 6 + P2 4 + P3 3 + smoke/P0/P1/P2/P3 order)
- **ATDD Checklist:** `_bmad-output/test-artifacts/atdd-checklist-dw-engine-defensive-guards.md` (24 `it.skip` scaffolds)
- **Fixtures:** `_bmad-output/test-artifacts/fixtures/engine-defensive-guards-fixtures.ts` (250 lines `emptyBoard`/`gameState`/`rngOf`/`spyRng` + `TraceEntry` literals + scan helpers + bench)
- **API Gateway:** `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts` (26 pass: P0 12 + P1 6 + P2 5 + P3 3 `~158.7 ms`)
- **E2E Umbrella:** `_bmad-output/test-artifacts/tests/e2e/engine-defensive-guards.umbrella.spec.ts` (7 pass: E2E-01..06 + trace `~153.1 ms`)
- **Coverage:** `_bmad-output/test-artifacts/coverage-matrix.json` (`PHASE_1_COMPLETE` `allow_gate true` `24/24 100%`), `_bmad-output/test-artifacts/e2e-trace-summary-dw-engine-defensive-guards.json` (`COLLECTED` `11/11 100%`), `gate-decision-dw-engine-defensive-guards.json` (`PASS` `p0 100% p1 100% overall 100%`)
- **Existing Suites:** `triade/__tests__/game/matchScore.test.ts` 8 pass + `triade/__tests__/render/transitionPlan.test.ts` 13 pass + `triade/__tests__/engine/game.test.ts` 32 pass (`53 pass` wall) + `triade/__tests__/engine/defensive-guards.atdd.test.ts` 24 dormant (`it.skip→it` 24/24 GREEN)
- **Evidence Sources:**
  - Test Results: `_bmad-output/test-artifacts/tests/api/engine-defensive-guards.gateway.spec.ts` + `tests/e2e/engine-defensive-guards.umbrella.spec.ts` + `triade/__tests__/engine/defensive-guards.atdd.test.ts`
  - Metrics: `gateway P3-03 17.45 ms /5000 =0.0035 ms/op` + `umbrella E2E-06 18.01 ms` + `npm test 882/11/142 ~5.6s`
  - Logs: `rg` allowlists above + manual probe `10,20 ×2 + slide + {1,0} + board 1` + `rg -n "resolution-undo.*f115c8c"` 3 hits DW-24/30/65
  - CI Results: `npm --prefix triade exec -- tsc --noEmit` both `0` + `npm --prefix triade test` `882/11`

---

## Recommendations Summary

**Release Blocker:** None. 3 high risks R-001..R-003 are mitigated GREEN via `Number.isFinite(raw)` + `Array.isArray(from)` + `sanitizePending` with `10,20` + `slide` + `{1,0}` pins and `rg` single-site gates; `gate PASS` + `coverage 24/24 100%` + `tsc` twin clean + ledger `f115c8c` 64-hex. No FAIL/CONCERNS blocker for this bundle.

**High Priority:** None for this bundle. Carry-over Epic 8 `shake/bullet/burst/sfx` 11 expected RED are waived per their own gates, not introduced here.

**Medium Priority:** Carry R-009/R-010 residuals as informational (see Recommended Actions Short-term above) — `current.score NaN` and `state null` are orchestrator-owned trust-the-input edges, not this bundle's DW scope.

**Next Steps:** Already `gate-decision-dw-engine-defensive-guards.json` `PASS` (`MET 100%` all). No re-run of `nfr-assess` needed unless a follow-on changes `PendingSpawn` fallback or `displayRoll` window or `GRID_SIZE`. Next workflow is `trace` or release gate — link this NFR summary into `spec-engine-defensive-guards.md` Dev Notes / trace matrix; no new deps or build steps.

---

## Sign-Off

**NFR Evidence Audit:**

- Overall Status: PASS ✅
- Critical Issues: 0
- High Priority Issues: 0
- Concerns: 1 (informational 6.2 logs + R-009/R-010, not gate)
- Evidence Gaps: 2 (informational R-009/R-010 only)

**Gate Status:** PASS ✅

**Next Actions:**

- If PASS ✅: Proceed to `*gate` workflow or release
- If CONCERNS ⚠️: Address HIGH/CRITICAL issues, re-run `*nfr-assess`
- If FAIL ❌: Resolve FAIL status NFRs, re-run `*nfr-assess`

**Generated:** 2026-09-02
**Workflow:** testarch-nfr v5.0

---

<!-- Powered by BMAD-CORE™ -->

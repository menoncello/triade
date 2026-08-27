---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-08-26'
workflowType: 'testarch-trace'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources: ['_bmad-output/implementation-artifacts/6-1-overlay-de-game-over-com-stats-imediatos.md (ACs 1-4)', '_bmad-output/planning-artifacts/epics.md (Epic 6 / Story 6.1)', '_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md', '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md', '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md', '_bmad-output/test-artifacts/atdd-checklist-6-1-overlay-de-game-over-com-stats-imediatos.md']
externalPointerStatus: 'not_used'
tempCoverageMatrixPath: '/tmp/tea-trace-coverage-matrix-6-1.json'
inputDocuments: ['_bmad-output/implementation-artifacts/6-1-overlay-de-game-over-com-stats-imediatos.md', '_bmad-output/planning-artifacts/epics.md']
---

# Traceability Report — Story 6.1: Overlay de game over com stats imediatos

**Target:** Story 6.1
**Date:** 2026-08-26
**Evaluator:** Eduardo (TEA Master Test Architect)
**Coverage Oracle:** `acceptance_criteria` via `formal_requirements` (confidence: high) — story file ACs 1–4
**Oracle Sources:** `_bmad-output/implementation-artifacts/6-1-overlay-de-game-over-com-stats-imediatos.md` (ACs 1–4), `epics.md` Epic 6 Story 6.1, `game-architecture.md`, `DESIGN.md`, `EXPERIENCE.md`, ATDD checklist 6.1
**Re-verification:** 3 suítes mapeadas executadas ao vivo — **444 pass / 0 fail** (full triade suite). Mapped 6.1 subset: **27 pass / 0 fail** (0 skipped/fixme/pending).

---

## Gate Decision: PASS

**Rationale:** P0 coverage is 100% (2/2 acceptance criteria fully covered by active, green tests), P1 coverage is 100% (1/1), P3 lane-scoped coverage is 100% (1/1), and overall coverage is 100% (4/4, minimum: 80%). All 27 mapped tests are active (0 skipped/fixme/pending); full triade suite verified green at run time (444 pass / 0 fail). Gate logic: P0 100% required MET, P1 ≥90% target MET, overall ≥80% MET. No critical/high gaps, no endpoint/auth blind spots (pure app-domain story), no waived blockers.

---

## Coverage Summary

| Priority | Total Criteria | FULL Coverage | Coverage % | Status |
|----------|----------------|---------------|------------|--------|
| P0       | 2              | 2             | 100%       | ✅ PASS |
| P1       | 1              | 1             | 100%       | ✅ PASS |
| P2       | 0              | 0             | 100%*      | ✅ PASS |
| P3       | 1              | 1             | 100%       | ✅ PASS |
| **Total**| **4**          | **4**         | **100%**   | ✅ PASS |

\* No P2 requirements in scope for this story; effective coverage treated as 100% per gate rules.
Note: Story file tags AC3 as P3 (FR14 lane-scoped) and AC4 as architecture (treated P1). ATDD checklist elevates AC3/AC4 separation/purity guards to P1 for test prioritization but trace honors story's P3 label — gate still PASS either mapping (P1 1/1 or P1 2/2 both 100%).

---

## Traceability Matrix

| Req ID | Requirement (summary) | Priority | Coverage | Tests |
|---|---|---|---|---|
| 6.1-AC1 | Overlay shows immediately when `isGameOver(board)===true`: `score`, `best`, `maxTile`, `merges`, `longestStreak` (FR-25, UX-DR-12, EXPERIENCE.md:73) | P0 | FULL | 6.1-U-001, 6.1-U-002, 6.1-U-003, 6.1-U-004, 6.1-U-005, 6.1-U-006, 6.1-U-007, 6.1-U-008, 6.1-C-001, 6.1-C-002, 6.1-C-003, 6.1-C-004, 6.1-W-001, 6.1-W-003, 6.1-W-004 |
| 6.1-AC2 | Stats appear without any forced wait — no timer, no artificial delay; last move stays visible behind stats (FR-27, D-010) | P0 | FULL | 6.1-C-005, 6.1-C-006, 6.1-C-007, 6.1-C-008, 6.1-C-009, 6.1-C-011, 6.1-W-004 |
| 6.1-AC3 | Stats are lane-scoped where relevant (`best` = active lane's live `match.best` seeded from `persistedBest` via `initialScore`/`isNewRecord`; never global) (P3, FR14) | P3 | FULL | 6.1-U-010, 6.1-W-001, 6.1-W-004 |
| 6.1-AC4 | Game over is a state, not an error — engine emits no throw; `isGameOver` on post-move board, overlay renders from app-owned `MatchScore` + `MatchStats` (ADR-02/06, move never throws) | P1 | FULL | 6.1-U-008, 6.1-U-009, 6.1-C-010, 6.1-C-011, 6.1-C-012, 6.1-W-001, 6.1-W-002, 6.1-W-003, 6.1-W-005 |

### Detailed Mapping

#### 6.1-AC1: Overlay shows immediately with five stats (P0) — FULL ✅

- **Sources:** `implementation-artifacts/6-1.md:19` AC1, `epics.md:745`, `EXPERIENCE.md:73`, `matchStats.ts` + `GameOverOverlay.tsx` contract
- **Tests:**
  - `6.1-U-001` `triade/__tests__/game/matchStats.test.ts:27` — Given 24 board When initialStats Then merges=0 longest=0 current=0 maxTile=ceilingDetector
  - `6.1-U-002` `triade/__tests__/game/matchStats.test.ts:43` — Given emptyBoard When initialStats Then maxTile 0 defensive floor
  - `6.1-U-003` `triade/__tests__/game/matchStats.test.ts:53` — Given board ceiling 48 When initialStats Then maxTile matches ceiling
  - `6.1-U-004` `triade/__tests__/game/matchStats.test.ts:67` — Given trace with one merge When applyMoveStats Then merges+1; zero-merge unchanged
  - `6.1-U-005` `triade/__tests__/game/matchStats.test.ts:102` — Given consecutive merges When applyMoveStats Then currentStreak increments, longest tracks max, zero-merge resets current
  - `6.1-U-006` `triade/__tests__/game/matchStats.test.ts:143` — Given double-merge [3,3,3,3]->[6,6] When applyMoveStats Then merges+2 but streak+1 per-move
  - `6.1-U-007` `triade/__tests__/game/matchStats.test.ts:174` — Given monotonic maxTile When deflate then preserved, when grows then rises
  - `6.1-C-001` `triade/__tests__/ui/components/gameOverOverlay.test.ts:84` — Given stats {123,456,48,7,3} When render overlay Then each stat as own Text node
  - `6.1-C-002` `triade/__tests__/ui/components/gameOverOverlay.test.ts:93` — Given overlay When mounted Then a11y alert contains Game over + stats + CTA button Jogar de novo
  - `6.1-C-003` `triade/__tests__/ui/components/gameOverOverlay.test.ts:112` — Given isNewRecord true When render Then Novo recorde in a11y + accent #E8A33D
  - `6.1-C-004` `triade/__tests__/ui/components/gameOverOverlay.test.ts:127` — Given CTA When onPress Then onRestart called once no confirmation
  - `6.1-W-001` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:31` — Given App.tsx When isGameOver(game.board) Then renders GameOverOverlay with lane-scoped stats + insets + reducedMotion false
  - `6.1-W-003` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:72` — Given doMove When result Then setMatchStats(prev=>applyMoveStats(prev,result.board,result)) post-move board
  - `6.1-W-004` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:86` — Runtime: gameOver board true + overlay mounts with correct stats shape

#### 6.1-AC2: Stats without forced wait — no timer, last move visible (P0) — FULL ✅

- **Sources:** `implementation-artifacts/6-1.md:20` AC2, `epics.md:746` FR-27, `DESIGN.md:193,251-253`, mockup `key-gameover.html:43`, `App.tsx` conditional render
- **Tests:**
  - `6.1-C-005` `triade/__tests__/ui/components/gameOverOverlay.test.ts:138` — Scrim uses backgroundColor rgba(12,14,17,0.7) not opacity so children keep full opacity
  - `6.1-C-006` `triade/__tests__/ui/components/gameOverOverlay.test.ts:157` — Overlay zIndex2 elevation2 position:absolute pointerEvents auto above Hud zIndex1
  - `6.1-C-007` `triade/__tests__/ui/components/gameOverOverlay.test.ts:166` — Renders synchronously: no setTimeout/setInterval/Animated.timing before mount, no transform
  - `6.1-C-008` `triade/__tests__/ui/components/gameOverOverlay.test.ts:186` — CTA width:HIT_TARGET height:HIT_TARGET directly pinned 44pt thinview gate
  - `6.1-C-009` `triade/__tests__/ui/components/gameOverOverlay.test.ts:203` — Stat row tokens: label #8a8578 13/500, value #1a1d23 17/500 tabular-nums
  - `6.1-C-011` `triade/__tests__/ui/components/gameOverOverlay.test.ts:235` — reducedMotion prop gates future fade, no transform when false

#### 6.1-AC3: Lane-scoped where relevant (P3) — FULL ✅

- **Sources:** `implementation-artifacts/6-1.md:21` AC3, `epics.md:747` P3 FR14, `App.tsx:38,72-81` hydration + persist, `matchScore.ts` precedent
- **Tests:**
  - `6.1-U-010` `triade/__tests__/game/matchStats.test.ts:264` — MatchStats must NOT expose score/best (separation pin, belongs to MatchScore)
  - `6.1-W-001` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:31` — App passes stats.score from match.score + best via isNewRecord(sessionStartBestRef.current, match.score) not current.best
  - `6.1-W-004` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:86` — Runtime thin-view posture: overlay receives resolved stats + isNewRecord never raw Board/GameState

#### 6.1-AC4: Game over is state, not error (P1) — FULL ✅

- **Sources:** `implementation-artifacts/6-1.md:22` AC4, architecture error handling ADR-02/06, `game.ts:93-112` isGameOver, `App.tsx` handleRestart + doMove, `ui.norolls`/`ui.thinview`/`engine.purity` guards
- **Tests:**
  - `6.1-U-008` `triade/__tests__/game/matchStats.test.ts:207` — Determinism: same prev+board+result yields deepEqual, no mutation, spawn entries not counted
  - `6.1-U-009` `triade/__tests__/game/matchStats.test.ts:236` — Purity: source has no Math.random no roll symbols resolveSpawn|weightedValue|spawnTile|weightedPicker|pickIndex, runtime not called
  - `6.1-C-010` `triade/__tests__/ui/components/gameOverOverlay.test.ts:214` — Thin-view: never imports engine, never Math.random, never layout/orientation rule logic
  - `6.1-C-012` `triade/__tests__/ui/components/gameOverOverlay.test.ts:245` — Insets fallback: undefined insets yields SAFE_MARGIN-only padding defensive
  - `6.1-W-001` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:31` — isGameOver(game.board) committed snapshot, not moveResult.board, plus availablePot once-per-render after if(!ready)
  - `6.1-W-002` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:55` — handleRestart resets game+match+matchStats+busyRef deadlock defense Df5
  - `6.1-W-003` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:72` — doMove projects via applyMoveStats on post-move board, initializer reuses game.board no second newGame rng draw
  - `6.1-W-005` `triade/__tests__/ui/components/app.gameOverWiring.test.ts:147` — Edge: emptyBoard NOT gameOver, full-but-mergeable (1|2 or equal ≥3) NOT gameOver

### Test Inventory (deduplicated)

| ID | Level | File:Line | Title |
|---|---|---|---|
| 6.1-U-001 | unit | triade/__tests__/game/matchStats.test.ts:27 | [P0] AC1 initialStats seeds merges=0, longest=0, current=0 and maxTile from ceilingDetector(board) |
| 6.1-U-002 | unit | triade/__tests__/game/matchStats.test.ts:43 | [P0] AC1 initialStats on empty-ish board uses ceiling 0 (defensive floor) |
| 6.1-U-003 | unit | triade/__tests__/game/matchStats.test.ts:53 | [P0] AC1 initialStats on game board (newGame-like 9-tile setup) maxTile matches ceiling |
| 6.1-U-004 | unit | triade/__tests__/game/matchStats.test.ts:67 | [P0] AC1 applyMoveStats increments merges by trace merge count (from.length===2, or classify==="merge") |
| 6.1-U-005 | unit | triade/__tests__/game/matchStats.test.ts:102 | [P0] AC1 applyMoveStats streak: consecutive merge moves increment currentStreak by 1, longestStreak tracks max |
| 6.1-U-006 | unit | triade/__tests__/game/matchStats.test.ts:143 | [P0] AC1 streak is per-move, not per-tile: [3,3,3,3]->[6,6] (two merges in one swipe) counts as ONE streak step |
| 6.1-U-007 | unit | triade/__tests__/game/matchStats.test.ts:174 | [P0] AC1 maxTile monotonic: never decreases and tracks ceilingDetector(postBoard) |
| 6.1-U-008 | unit | triade/__tests__/game/matchStats.test.ts:207 | [P1] AC1/AC4 applyMoveStats determinism: same prev+board+result yields deepEqual, no mutation of prev |
| 6.1-U-009 | unit | triade/__tests__/game/matchStats.test.ts:236 | [P1] AC4 applyMoveStats purity: no Math.random, no engine roll symbols, host-testable (no RN) |
| 6.1-U-010 | unit | triade/__tests__/game/matchStats.test.ts:264 | [P1] AC3 lane-scoped best is NOT inside MatchStats — matchStats only owns merges/longestStreak/maxTile/currentStreak (separation pin) |
| 6.1-C-001 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:84 | [P0] AC1 overlay renders all five stats as own Text nodes (score/best/maxTile/merges/longestStreak) |
| 6.1-C-002 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:93 | [P0] AC1 overlay accessibility announcement contains "Game over" + stats (a11y contract) |
| 6.1-C-003 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:112 | [P0] AC1 isNewRecord=true appends "Novo recorde" to a11y and highlights number with accent #E8A33D |
| 6.1-C-004 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:127 | [P0] AC1 CTA "Jogar de novo" calls onRestart once (thin-view, no confirmation dialog) |
| 6.1-C-005 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:138 | [P0] AC2 scrim uses rgba(12,14,17,0.7) via backgroundColor (not opacity) — children keep full opacity (DESIGN.md:193, mockup key-gameover.html:43) |
| 6.1-C-006 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:157 | [P0] AC2 overlay sits above Hud (zIndex:2, elevation:2) and blocks gestures via pointerEvents auto (one-level overlay, DESIGN.md:251-253) |
| 6.1-C-007 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:166 | [P0] AC2 overlay renders synchronously — no setTimeout, no Animated.timing before mount, no transform props (timing contract) |
| 6.1-C-008 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:186 | [P0] AC2 CTA hit target is HIT_TARGET (44) via width+height directly (thinview gate thinview.test.ts:39-40) |
| 6.1-C-009 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:203 | [P1] AC1/AC2 stat row tokens: label muted #8a8578 13/500, value text #1a1d23 17/500 tabular-nums (DESIGN.md:153-279 token table) |
| 6.1-C-010 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:214 | [P1] AC4 overlay is thin-view: never imports engine roll symbols, never Math.random, never layout/orientation rule logic (ui.norolls + ui.thinview + engine.purity) |
| 6.1-C-011 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:235 | [P1] reducedMotion prop gates future fade — defaults appropriately and overlay carries no transform when false (Epic 9 gate for 6.2) |
| 6.1-C-012 | component | triade/__tests__/ui/components/gameOverOverlay.test.ts:245 | [P1] AC4 insets fallback — undefined insets yields SAFE_MARGIN-only padding (defensive, App always passes insets) |
| 6.1-W-001 | component | triade/__tests__/ui/components/app.gameOverWiring.test.ts:31 | [P0] AC1/AC4 App wiring: App.tsx renders GameOverOverlay when isGameOver(game.board) and passes lane-scoped stats |
| 6.1-W-002 | component | triade/__tests__/ui/components/app.gameOverWiring.test.ts:55 | [P0] AC4/T3 handleRestart deadlock defense: App.tsx resets game + match + matchStats + busyRef |
| 6.1-W-003 | component | triade/__tests__/ui/components/app.gameOverWiring.test.ts:72 | [P0] AC1 doMove projects via applyMoveStats on post-move board (maxTile monotonic source) |
| 6.1-W-004 | component | triade/__tests__/ui/components/app.gameOverWiring.test.ts:86 | [P0] AC1/AC2 runtime: gameOver board is full with no mergeable pair — isGameOver true and overlay would mount with correct stats shape |
| 6.1-W-005 | component | triade/__tests__/ui/components/app.gameOverWiring.test.ts:147 | [P1] AC1 gameOver board edge: emptyBoard is NOT gameOver, full-but-mergeable board is NOT gameOver |

Files: 3 · Cases: 27 · Skipped/Fixme/Pending: 0/0/0

### Coverage Validation Notes

- **AC1** is proven at three layers: pure projection `matchStats` (initialStats + merges + per-move streak + maxTile monotonic + determinism), presentational `GameOverOverlay` (five stats + a11y alert + isNewRecord accent + CTA), and App wiring (isGameOver(game.board) conditional + doMove projection + lane-scoped stats + runtime mount). The ATDD "verified indirectly" deferral for App wiring is now CLOSED by W-001..W-004.
- **AC2** timing contract is structural + rendered: scrim `rgba(12,14,17,0.7)` via backgroundColor (not separate opacity) so frozen board stays visible behind stats; `zIndex:2`/`elevation:2` over `Hud` `zIndex:1`; `pointerEvents:'auto'` blocks `Gesture.Pan`; no `setTimeout`/`Animated.timing`/`transform` before mount verified both by rendered props and source scan; `reducedMotion` threaded as literal `false` until Epic 9 (forward-compat for 6.2).
- **AC3** lane-scoped best separation is pinned: `MatchStats` must NOT contain score/best (unit structural U-010); App wiring pins `isNewRecord(sessionStartBestRef.current, match.score)` + `availablePot` once-per-render after `if(!ready)` shared by both lanes; runtime mount proves thin-view posture (overlay receives resolved `stats` + `isNewRecord`, never raw `Board`/`GameState`).
- **AC4** state-not-error is enforced via purity + thin-view + edge guards: `matchStats` source has no `Math.random`/roll symbols and is host-testable (U-009); overlay allowlist is `react-native` primitives + `HIT_TARGET` + `../game/matchStats` types only (C-010); `isGameOver` is called on `game.board` committed snapshot (W-001) and `busyRef.current=false` deadlock defense is present twice (handleRestart + onMoveSettled, W-002); edge boards (empty, full-but-mergeable via 1|2 or equal ≥3) are NOT gameOver (W-005).
- **Heuristics:** endpoint/auth N/A (pure app-domain story, no HTTP/API or auth surfaces per `game-architecture.md` purity wall); happy-path-only gaps: 0 (negative paths via zero-merge streak reset, noop, empty/deflated boards, merge-count exclusion of spawn entries); UI journey/state gaps: 0 within this oracle (overlay is state not route; insets fallback and reducedMotion defaults are covered).
- **Structural guards still green:** `npx tsc --noEmit` clean; `npx tsc --noEmit -p tsconfig.test.json` clean (fixed 2026-08-26: rn-stub facade + ignoreDeprecations); `git diff --stat -- triade/src/engine` empty (engine byte-identical); `git diff --stat -- triade/src/game/preview.ts` empty (preview byte-identical); suite 444 pass / 0 fail; `ui.norolls`/`ui.thinview`/`engine.purity` green (overlay + matchStats comply by construction).

---

## Gaps & Recommendations

**Coverage gaps (in-scope):** none (critical: 0, high: 0, medium: 0, low: 0).

**All 4 ACs FULL.** No P0/P1/P3 gaps.

**Sanctioned deferral — CLOSED:** App wiring (matchStats state + handleRestart busyRef + availablePot once-per-render + insets) was marked "verified indirectly via Unit+Component pins plus T5 gate suite" in the ATDD checklist (scope guard CC 2026-08-23). The review added `app.gameOverWiring.test.ts` (W-001..W-005) so wiring now has direct structural + runtime pins — deferral CLOSED.

**Recommendations:**
1. **LOW — CLOSED 2026-08-26** — Test-review DONE: `matchStats.test.ts:236` + `gameOverOverlay.test.ts:214/166` upgraded to `stripCommentsAndStrings` (robust helper vs naive `replace`), verified 27/27 green, determinism/isolation/GWT intact.
2. **MEDIUM — CLOSED 2026-08-26** — Deferred-work `tsconfig.test.json` TS5101 + 3 stub-typing errors CLOSED: `triade/test-utils/rn-stub.ts` now exports `useWindowDimensions`/`Platform`/`Dimensions`/`ViewStyle` shims + `triade/tsconfig.test.json` adds `ignoreDeprecations: "6.0"`; verified `npx tsc --noEmit -p tsconfig.test.json` exit 0 (both gates clean); `deferred-work.md:122-124` marked CLOSED.
3. **INFO** — State-placement tension carry remains: master rule `game-architecture.md:776-777` anything undo must revert lives in snapshot (`longestStreak` named as future undo-owned field). 6.1 deliberately defers snapshot placement (Epic 6 before Epic 3 undo; per-match cumulative sufficient for Clean-lane 1-tap restart). Re-evaluate when Epic 3 `MatchOrchestrator` lands in story 3-5.

---

## Next Actions

Gate **PASS** — Story 6.1 approved do ponto de vista de cobertura/traceabilidade, com App wiring agora com pins diretos e suite completo verde. Engine permanece byte-identical.

---

_Gate decision summary (step-05):_

🚨 GATE DECISION: **PASS**

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → MET
- P1 Coverage: 100% (PASS target: 90%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale: All 4 acceptance criteria traced to active, green tests across unit and component layers; zero uncovered requirements; mapped 6.1 suites 27 pass / 0 fail; full triade suite 444 pass / 0 fail; structural guards green; no waived blockers.

⚠️ Critical Gaps: 0

📂 Machine-readable outputs:
- `_bmad-output/test-artifacts/traceability/coverage-matrix-6-1.json`
- `_bmad-output/test-artifacts/traceability/e2e-trace-summary-6-1.json`
- `_bmad-output/test-artifacts/traceability/gate-decision-6-1.json`

ℹ️ GATE: PASS - Release approved, coverage meets standards

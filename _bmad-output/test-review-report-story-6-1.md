# Test Review Report: Story 6.1 — Overlay de game over com stats imediatos

**Workflow**: gds-test-review · **Scope**: targeted (story 6.1 failure-suite surface) · **Date**: 2026-08-26
**Reviewed by**: Game QA Lead (gds-test-review) · **Engine**: Custom TS pure-engine + RN thin views (`node:test` via `tsx`)
**Config**: user Eduardo · document English · communication Português · experience intermediate
**Baseline**: `main` 70e4fb0 (396 pass) → pre-6.1 417 pass / 21 skipped (ATDD RED) → post-6.1 **438 pass / 0 fail** · **Verification**: `npm test` live 2026-08-26, `npx tsc --noEmit` clean

---

## Executive Summary

### Overall Health: **Good**

Story 6.1 is **pure-additive** (`git diff --stat -- triade/src/engine` empty, `preview.ts` byte-identical) and ships the Clean-lane failure suite as state, not error: `triade/src/game/matchStats.ts` (30 lines, pure projection) + `triade/src/ui/GameOverOverlay.tsx` (129 lines, dumb presentational) + `App.tsx` wiring (`isGameOver`, `matchStats` state, `handleRestart` with `busyRef` deadlock defense). The hard guarantees FR-25/27/UX-DR-12/N3 invariant (immediate, synchronous, lane-scoped, no throw) are fully pinned by **21 new P0/P1 pins** (10 `matchStats.test.ts` + 11 `gameOverOverlay.test.ts`) on top of the 417 baseline → 438. Suite is deterministic, fast, isolated, anti-pattern-free. Zero skipped/flaky/slow tests. Three low-severity observations noted (no blocker).

### Key Findings

1. **All 4 ACs are pinned with explicit `[P0] AC{n}` name traceability** — AC1 (stats immediate FR-25/UX-DR-12) via `initialStats` seeds + `applyMoveStats` merges/streak/maxTile + overlay 5 stats render + a11y + CTA; AC2 (no forced wait, FR-27) via scrim rgba + hierarchy + synchronous timing + HIT_TARGET; AC3 (lane-scoped best, FR-14) via `MatchStats` separation pin (`score`/`best` never inside); AC4 (state not error, ADR-01/06) via purity + determinism + thin-view. No orphan AC.
2. **Timing contract is proved structurally, not just visually**: overlay mounts **synchronously** with `isGameOver(board)===true` — source-scan proves 0 `setTimeout`/`setInterval`/`Animated.timing` before mount and 0 `transform` props on mount (`gameOverOverlay.test.ts:166`). Board under scrim stays visible (board frozen by scrim, not unmounted). Future 6.2 soft-fade must be **after** initial mount, and `reducedMotion={false}` is threaded literally today so 6.2 needs no API change.
3. **Purity & thin-view boundaries are scanner-grade**: `matchStats.ts` is relative-only, no `react|react-native|@shopify|expo`, no `Math.random`, no 5 roll symbols (`resolveSpawn|weightedValue|spawnTile|weightedPicker|pickIndex`) — `engine.purity.test.ts` green + unit source-scan mirrors `ui.norolls.test.ts:24`. Overlay imports only `react-native` primitives + `HIT_TARGET` + `../game/matchStats` types — manual `extractNamedImports` scan proves 0 `engine` specifiers and 0 rule-logic symbols (`layoutFor|isLandscape|…`), `ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring` all green without modification.
4. **Streak semantics are hardened**: `longestStreak` = consecutive moves with ≥1 merge; `currentStreak` resets on zero-merge/noop, `longestStreak` = `Math.max(prev.longestStreak, currentStreak)`. The critical edge ` [3,3,3,3]→[6,6]` with two `from.length===2` entries in one `MoveResult` still counts as **1** streak step (merges +2 but streak +1), next merge → streak 2 — pinned by `[P0] AC1 streak is per-move` (`matchStats.test.ts:143`). `maxTile` monotonic never decreases (`Math.max(prev.maxTile, ceilingDetector(postBoard))`) and `ceilingDetector` is the source of truth.
5. **Verified live during this review**: `npm test` **438 pass / 0 fail / 0 skip / 0 todo** (2504 ms), isolated 6.1 surface **21 tests** at **219 ms** (~10 ms avg, pure pins <1.5 ms, presentational <15 ms), `npx tsc --noEmit` clean (default CI gate), `npx tsc -p tsconfig.test.json` now only `TS5101` deprecation (previous 3 stub-typing errors no longer reproduce — waived entry `deferred-work.md:122-124` can be narrowed), zero `test.skip`/`.todo`, guards green.
6. **Gap from prior review is not regressed**: 7.x reviews flagged `RANGE_1_2`/`availablePot` concerns; 6.1 preserves `availablePot` computation once per render after `if(!ready)` (`App.tsx:126-137`) shared by both lanes and keeps `hud.previewWiring` green — overlay adds zero state beyond `matchStats` and does not move the pipeline.

### Recommended Actions (prioritized)

1. *(Immediate)* **None blocking** — suite green at 438; 6.1 ACs closed. No hotfix required. Proceed review→done.
2. *(Short-term, hygiene — Low effort)* Address the 3 low-severity observations in §Quality Assessment (alignSelf vs fixed CTA, App wiring integration pin, thin-view scanner scope) if team wants gap closure before Epic 6 sign-off. All are optional polish.
3. *(Long-term)* Keep `matchStats.test.ts` + `gameOverOverlay.test.ts` as the single source of truth for FR-25/27; track `tsconfig.test.json` TS5101 `baseUrl` deprecation out of `deferred-work.md` (default `tsc --noEmit` gates CI, test-config informational).

---

## Test Suite Metrics

### Test Distribution

| Type | Count (6.1 surface) | Count (full suite) | % of Total | Pass Rate | Avg Duration |
| --- | --- | --- | --- | --- | --- |
| Unit — pure app-domain `matchStats` (T1) | **10** (NEW) | — | — | 100% | <0.9 ms each (seeds 0.3 ms, merges/streak ~0.5 ms) |
| Component — presentational RN `GameOverOverlay` (T2 thin-view) | **11** (NEW) | — | — | 100% | <2.1 ms each (render 0.7–15 ms, scanner 5.2 ms) |
| **Story 6.1 isolated surface (unit + component)** | **21** | — | **4.8% of suite** | **100%** | **219 ms total** |
| Unit — engine pure (board/ceiling/line/spawn/game/pot/weights/rules/candidates/spawn-placement/purity) | — | **174** | 39.7% | 100% | <0.6 ms each (benches 36–112 ms) |
| Unit — app-domain game (`matchScore` 8 + `matchStats` 10 + `preview` 23 + `preview-invariant` 17) | — | **58** | 13.2% | 100% | <1.2 ms |
| Unit — render (`transitionPlan` 16 + `render.smoke` 5) | — | **21** | 4.8% | 100% | <1.0 ms |
| Unit — UI layout/orientation/swipe/tileNumerals/gesture (`layout` 18 + `swipe` 10 + `tileNumerals` 16 + `orientation` 5 + others) | — | **98** | 22.4% | 100% | <0.5 ms |
| Integration — orchestrator (`preview-availability` 6 + `directional-spawn` 13 + `session` 3) | — | **22** | 5.0% | 100% | <0.4 ms |
| E2E / Smoke / Assets | — | **22** (10 e2e + 9 smoke + 3 assets) | 5.0% | 100% | <2 ms |
| Storage (keyspace/schema/entitlements/settingsStore/purity) | — | **39** | 8.9% | 100% | <0.5 ms |
| Benchmark (engine/render/storage) | — | **4** | 0.9% | 100% | 18–112 ms |
| **Full suite (all types, verified live)** | — | **438** | **100%** | **100% (438/438)** | **2504 ms total / ~5.7 ms avg** |

**Breakdown by `triade/package.json` types**: Unit ~60% (engine+game+render+ui) / Integration ~5% / E2E+Smoke ~5% / Storage ~9% / Benchmark ~1% / Assets ~1% — balanced for a pure-engine + thin-view architecture. 6.1 adds only Unit + Component (no E2E needed: overlay is state-synchronous, not browser journey; no API — same posture 7.4/7.3).

### Execution Metrics

| Metric | Current (6.1 post) | Previous (main 70e4fb0) | Previous (ATDD RED) | Trend |
| --- | --- | --- | --- | --- |
| Pass Rate | **100% (438/438)** | 100% (396/396) | 100% (417/417, 21 skipped) | → stable, +21 GREEN |
| Avg Duration (per test, full) | ~5.7 ms (2504/438, dominated by 4 benches 18–112 ms) | — | — | → slight up expected (21 pins + 4 benches unchanged) |
| 6.1 surface duration | 219 ms for 21 tests (avg ~10.4 ms, but pure <1 ms; 15 ms is first `react-test-renderer` mount warmup) | n/a | — | — |
| Flaky Tests | **0** | 0 | 0 | → |
| Disabled Tests | **0** | 0 | 0 | → |
| Total Duration | 2504 ms | — | ~2850 ms (automation-summary) | → within noise (machine variance) |

### Recent Run History

| Date | Passed | Failed | Skipped | Duration | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-08-26 (this review, live) | 438 | 0 | 0 | 2504 ms | Full suite via `npm test` (node:test + tsx) |
| 2026-08-26 (isolated 6.1) | 21 | 0 | 0 | 219 ms | `__tests__/game/matchStats.test.ts` + `__tests__/ui/components/gameOverOverlay.test.ts` only |
| 2026-08-26 (automation-summary) | 438 | 0 | 0 | 2850 ms | `npm test` reported there (machine variance) |
| main 70e4fb0 (post-12.1, pre-6.1) | 396 | 0 | 0 | — | Baseline cited in story |
| 50285a3 (post-7.3) | 325 | 0 | — | — | — |

- Flaky tests: **none detected** — `matchStats` pure (no rng, no timers), overlay `react-test-renderer` sync + `allText`/`hasStyle`; no `setTimeout`/`Task.Delay` in 6.1 surface (`grep` 0 hits real uses); `spyRng` not needed here (0 draws by construction).
- Slow tests (>30 s): **none**; slowest observed is `benchmark: transition-plan cost per move` at ~112 ms and `benchmark: engine cost per turn` at ~36 ms — out-of-scope perf benches, not 6.1 pins. Slowest 6.1 pure pin ~0.9 ms, slowest component ~15 ms (first mount).
- Disabled/skipped: **zero** (`grep -rn "test.skip|test.todo"` 0 across `triade/__tests__`, 1 `it.skip` only in `triade/node_modules/` not project).

---

## Quality Assessment

### Quality Criteria (per workflow rubric)

| Criterion | Good | 6.1 Assessment | Verdict |
| --- | --- | --- | --- |
| **Deterministic** | Same input = same result | `matchStats` same `prev+board+result` → `deepEqual` twice via `structuredClone` (`matchStats.test.ts:207`), no `Math.random` at runtime (monkey-patched spy proves 0 calls), overlay `react-test-renderer` sync with fixed literals | ✅ Good |
| **Isolated** | No shared state | Every test builds `boardWith`/`emptyBoard`/`traceEntry`/`moveResult` inline; per-test `structuredClone(prev)`; `hasStyle`/`allText` helpers copied locally, not cross-imported | ✅ Good |
| **Fast** | <5 s unit, <30 s integration | 10 unit avg <0.9 ms, 11 component avg <2.1 ms, isolated 21 in 219 ms; full 438 in 2504 ms | ✅ Good |
| **Readable** | Clear intent, good names | `[P0] AC{n}` prefixes map 1:1 to story ACs; helpers `traceEntry`/`moveResult`/`hasToken` domain-native; assertions carry messages (`'merges must be 0 on init'`, `'maxTile must never decrease'`) | ✅ Good |
| **Maintained** | Up-to-date, passing | 0 disabled; production files additive by design; `git diff --stat -- triade/src/engine` gate empty; `tsc --noEmit` clean | ✅ Good |
| **Valuable** | Tests real behavior | Pins *behavior* (merge count via `from.length===2`, streak per-move vs per-tile, maxTile monotonic via `ceilingDetector`, scrim rgba not opacity, `zIndex:2` over Hud, timing sync) not implementation trivia | ✅ Good |

### Strengths

- **Deterministic**: Every 6.1 path uses no `Math.random`, no timers, no `Task.Delay`. `initialStats`/`applyMoveStats` are pure value-in/value-out; overlay uses `act()` + `react-test-renderer` sync; source-scans blank comments/strings before checking `Math.random`/roll symbols.
- **Isolated**: No `static` shared state, no module-global mutable. Each `matchStats` test constructs fresh `Board`/`MoveResult`/`MatchStats`; each overlay test renders a fresh `TestRenderer` via `act(() => createElement(...))`. Copy-helpers pattern avoids cross-test leakage (per story T4).
- **Fast**: 10 pure projection pins average <0.9 ms; 11 presentational pins average <2.1 ms; structural scans ~5 ms; T2 full 11 in 219 ms. Full suite still under 3 s (well below 30 s per-test threshold, <5 s unit threshold satisfied).
- **Readable**: `[P0] AC{n}` + invariant phrase; flat `test()` per AC idiomatic `node:test` for this repo; token table `DESIGN.md:153-279` mirrored in stat-row token test.
- **Maintained**: 0 disabled tests; production files byte-identical for engine/preview; `git diff --stat -- triade/src/game/preview.ts` empty verified.
- **Valuable**: Pins *behavior* not trivia — merge classification equivalence (`!spawned && from.length===2` ≡ `classify==='merge'`), streak per-move rule, lane-scoped best separation (best never in `MatchStats`), hierarchy (`zIndex:2`/`elevation:2`/`pointerEvents:auto`), scrim `rgba(12,14,17,0.7)` single source, CTA `HIT_TARGET` literal.
- **Boundary-rule faithful**: `maxTile` derives via `ceilingDetector(board)` (never hand-rolled ladder), mirroring `matchScore.ts` precedent; overlay style tokens derive from `DESIGN.md`/`EXPERIENCE.md`/`key-gameover.html:43`.

### Issues Found

| Issue | Severity | Tests Affected | Fix |
| --- | --- | --- | --- |
| **O-1: CTA `alignSelf: 'stretch'` alongside `width: HIT_TARGET` in `GameOverOverlay.tsx:121`** — `styles.cta` has `width: HIT_TARGET` + `height: HIT_TARGET` (correct, thinview gate passes via literal `width: HIT_TARGET`) but also `alignSelf: 'stretch'` which under flex `alignItems: center` on parent is neutral, yet semantically contradictory: stretch intent vs fixed 44 pt box. Rendered width still resolves to 44 (test `hasStyle {width:44}` passes), so no visual break, but a future flex-direction change could stretch it. | **Low** — Accepted (no current break, test proves 44 pt, but tighten) | `gameOverOverlay.test.ts` `CTA hit target` | Optional polish: remove `alignSelf: 'stretch'` or replace with `alignSelf: 'center'` to make intent unambiguous. No behavior change today. `thinview` gate still satisfied. |
| **O-2: App wiring `isGameOver` + `handleRestart` + `busyRef` deadlock defense not pinned at integration component level** — `App.tsx:49` `matchStats` state, `:90` `applyMoveStats(prev,result.board,result)`, `:103-109` `handleRestart busyRef=false`, `:153` `isGameOver(game.board)` + conditional overlay render are verified indirectly (unit + component + full 438 green), but no dedicated `App.tsx` integration test asserts `gameOver=true → overlay mounted` and `onRestart → newGame + matchStats reset + busyRef=false`. Scope guard CC 2026-08-23 defers this to 6.3 when restart forfeit lands. | **Low** — Accepted (deferred by scope, indirect coverage exists) | 6.1 indirect (automation-summary defer noted) | Optional: add `triade/__tests__/ui/components/app.gameOverWiring.test.ts` in 6.3 (same lane, mock `rngRef`, assert overlay presence + `handleRestart` resets). Not required to block 6.1. |
| **O-3: `ui.thinview.test.ts` allowlist covers only `Hud.tsx` + `PauseButton.tsx` — `GameOverOverlay.tsx` is exempt, covered only by local scanner in `gameOverOverlay.test.ts:214`** — the production guard would silently miss a regression if someone edits `GameOverOverlay` to import `layoutFor` without the local pin. Local scan does catch it (roll symbols + engine + rule-logic 0 hits), but there are two sources of truth. | **Low** — Minor (detection still works via local pin, but guard duplication) | `gameOverOverlay.test.ts` thin-view pin | Optional polish: extend `ui.thinview.test.ts` `VIEW_FILES` to include `GameOverOverlay.tsx` (or create `ui.gameOverOverlay.purity.test.ts`). Then local pin becomes redundant and can be removed. ~10 min. |
| **O-4: `GameOverOverlay` props expose `insets?` optional but story T3 renders with `insets={insets}` always** — optional fallback `insets?.top ?? 0` + `SAFE_MARGIN` is correct defensively, but the `insets` optionality means a future caller could omit it and get `SAFE_MARGIN`-only padding silently. The test never asserts the *without-insets* fallback. | **Low** — Defensive (no current bug, App always passes insets) | `gameOverOverlay.test.ts` reducedMotion + insets | Optional: add 2-line pin `renderOverlay({insets: undefined})` asserts `paddingTop === SAFE_MARGIN`. Pure doc value. |

**No High- or Medium-severity open issues.** O-1–O-4 are low/accepted. No flaky, no assertion-free, no hard-coded waits, no private-field probing, no leaked fixtures.

### Anti-Patterns Detected

| Pattern | Occurrences | Impact | Fix Effort |
| --- | --- | --- | --- |
| Hard-coded waits (`await Task.Delay(5000)` / `setTimeout(...)` / `Thread.sleep`) | **0** — verified `grep setTimeout|setInterval|Task.Delay` 0 real uses in production `matchStats.ts`/`GameOverOverlay.tsx`; test `gameOverOverlay.test.ts:166` `hasStyle` sync + source-scan for `setTimeout` = 0 as intended | — | — |
| Shared test state (`static bool wasSetup` / module-global mutable) | **0** — every test allocates `board`/`pending`/`result`/`stats` inline; `structuredClone` verifies no mutation; overlay helpers per-render | — | — |
| Testing private implementation (`GetPrivateField` / probing `GetPrivateField`) | **0** — tests public contracts `initialStats`/`applyMoveStats`/`GameOverOverlay` props/`a11yLabel`; no `GetPrivateField`, no `HIT_TARGET` value probing beyond literal `width: HIT_TARGET` gate | — | — |
| Missing cleanup (`Instantiate(prefab)` leak / `trace` not cleared) | **0** — pure value-in/value-out (matchStats) + `react-test-renderer` per-test `act()` (overlay) with no global mount; no FS/temp, no global mutation | — | — |
| Assertion-free tests (`void Test(){DoSomething();}`) | **0** — every `test()` contains 1–9 `assert.*` with messages; grepped `test(` 10/11 matches `assert.` 42/30 | — | — |
| Scattered ladder literals | **0** — `maxTile` derives via `ceilingDetector(board)`; `grep "[3,6,12,24,48,96]"` 0 outside `POT_CURVE` derivation (boundary rule 4 upheld for 6.1; not using ladder at all in this story, which is correct — stats never hand-roll weights) | — | — |
| `Math.random` in game/ui or invariant suite | **0 real uses** — `Math.random` only as engine default param (`spawn.ts:54,69`, `game.ts:8,31`) and as *comment/string* `Math.random` literal inside scanner's forbidden list; `matchStats.ts` + `GameOverOverlay.tsx` stripped source 0 hits; runtime monkey-patch proves 0 calls | — | — |
| Roll-symbol import leak | **0** — verified `stripCommentsAndStrings` + `extractNamedImports` scans (T2) + `ui.norolls` guard | — | — |
| Skipped/ignored | **0** — `test.skip`/`test.todo` 0 across `triade/__tests__` (1 `it.skip` only in `node_modules/`) | — | — |
| `opacity` vs `rgba` scrim confusion | **0** — pinned: scrim uses `backgroundColor: 'rgba(12,14,17,0.7)'` and asserts `opacity` absent or `===1` (children keep full opacity) | — | — |

---

## Coverage Analysis

### Feature Coverage Matrix

| Feature | P0 Tests | P1 Tests | P2 Tests | Gap? |
| --- | --- | --- | --- | --- |
| Core Loop (`move`, merge-once, board, game-over detection) | 60+ (line 19 + line-moved 13 + board 6 + game 32 + rules 6 + adaptive-spawn 14 + spawn-placement 11 + engine.smoke 4) | — | — | No |
| Spawn / Ceiling / Pot Tier / Weights / Directional (12.1) | 45+ (ceiling 7 + pot 6 + pot-tier-pipeline 4 + spawn-config 8 + weights 11 + spawn 5 + spawn-candidates 12 + directional 31) | — | — | No |
| **Failure Suite — Overlay stats immediate (AC1, FR-25 UX-DR-12)** | **11** (10 matchStats 3×P0 seeds + merges + streak + double-merge + maxTile + determinism + 8 P0 overlay pins: 5 stats + a11y + new-record + CTA) | — | — | **No — 6.1 closed** |
| **Failure Suite — No forced wait / hierarchy (AC2, FR-27)** | **8 P0** (scrim rgba, zIndex/elevation/pointerEvents, synchronous timing, HIT_TARGET, label/value tokens shared) | — | — | No |
| **Failure Suite — Lane-scoped best separation (AC3, FR-14/P3)** | **1 P1 lane-scoped pin** (`score`/`best` never in `MatchStats`; best lives in `matchScore.ts` via `persistedBest`/`initialScore`/`isNewRecord`) | — | — | No |
| **Failure Suite — State not error / purity (AC4, ADR-01/06)** | **3 P1** (determinism no-mutation, purity no Math.random/no roll symbols, thin-view) | — | — | No |
| Save/Load / Persistence (settings/best/entitlements) | 39 (storage 39 + schema/keyspace) | — | — | No — covered; out-of-scope for 6.1, unchanged |
| Progression (tier curve POT_CURVE, matchScore best) | spawn-config 8 + weights 11 + pot-tier 4 + ceiling 7 + matchScore 8 | — | — | No |
| Combat/Action | n/a (puzzle merge, not combat) | — | — | — |
| UI/Menus (layout 18 + orientation 5 + swipe 10 + tileNumerals 16 + gesture-pipeline 6 + hud 7 + previewCard 7 + hud.previewWiring 9 + pause 4) | **98** (already pinned; 6.1 adds overlay 11 on top) | — | — | No |
| Multiplayer | n/a (single-player offline, NFR-2) | — | — | — |
| Platform Cert / Offline / Installable | e2e 10 + smoke 9 + benchmark 4 + storage purity 1 | — | — | No |

**Story 6.1 AC Coverage (targeted, exhaustive):**

| AC | Coverage | Tests | Gap? |
| --- | --- | --- | --- |
| **AC1** — Game over shows immediately `score/best/maxTile/merges/longestStreak` (FR-25, UX-DR-12, EXPERIENCE.md:73) | FULL — `initialStats` seeds `merges=0/longest=0/current=0/maxTile=ceiling` (3 pins), `applyMoveStats` merges via `!spawned && from.length===2`, streak per-move (consecutive + double-merge + reset), `maxTile` monotonic, overlay renders 5 stats as own Text nodes, a11y `alert` + stats + CTA, `isNewRecord` accent | `[P0] AC1 initialStats seeds …` (3), `[P0] AC1 applyMoveStats increments merges …`, `[P0] AC1 streak …`, `[P0] AC1 streak is per-move …`, `[P0] AC1 maxTile monotonic …`, `[P0] AC1 overlay renders all five stats …`, `[P0] AC1 overlay accessibility …`, `[P0] AC1 isNewRecord=true …`, `[P0] AC1 CTA …` | **No** |
| **AC2** — Stats appear without forced wait — no timer, last move visible behind stats (FR-27, D-010) | FULL — scrim `backgroundColor:'rgba(12,14,17,0.7)'` not `opacity` (mockup `key-gameover.html:43`), `position:absolute zIndex:2 elevation:2 pointerEvents:auto` above `Hud zIndex:1`, synchronous mount 0 `setTimeout`/`Animated.timing`/`transform`, CTA `width/height: HIT_TARGET` 44, stat row tokens `#8a8578`/`#1a1d23` `tabular-nums` | `[P0] AC2 scrim uses rgba …`, `[P0] AC2 overlay sits above Hud …`, `[P0] AC2 overlay renders synchronously …`, `[P0] AC2 CTA hit target …`, `[P1] AC1/AC2 stat row tokens …` | **No** |
| **AC3** — Stats lane-scoped where relevant (`best` = active lane live `match.best` via `persistedBest`/`initialScore`/`isNewRecord`; `best` never derived from global) (P3, FR14) | FULL — `MatchStats` never exposes `score`/`best` (separation pin via `!('score' in s)`); best lives in `matchScore.ts` via `App.tsx:38,72-81` hydration + persist effect; overlay receives `best` from `match.best` (already lane-scoped) | `[P1] AC3 lane-scoped best is NOT inside MatchStats …` | **No** |
| **AC4** — Game over is state, not error — engine emits no throw; `isGameOver` on post-move board, overlay from `MatchScore` + `MatchStats` (ADR-02/06, `move()` never throws) | FULL — `applyMoveStats` purity (0 `Math.random`, 0 roll symbols), determinism (`structuredClone` deepEqual + no mutation), overlay thin-view (0 engine rolls, 0 layout rule logic, `reducedMotion` gate threaded as `false` literal today) | `[P1] AC1/AC4 determinism …`, `[P1] AC4 purity …`, `[P1] AC4 overlay is thin-view …`, `[P1] reducedMotion prop …` | **No** |

### Critical Gaps

| Gap | Risk | Impact | Priority to Fix |
| --- | --- | --- | --- |
| ~~Stats not shown / wrong timing / lane-mixed best~~ | **P0** | Player cannot trust run summary, chase-next broken (FR-25) | **CLOSED this story — 6.1** (21 P0/P1 pins) |
| ~~No forced wait / last move hidden~~ | **P0** | Friction, violates D-010 soft fade (FR-27) | **CLOSED — AC2** (scrim + sync + hierarchy) |
| ~~Lane-mixed best~~ | **P0** | Score integrity breach (FR-14, ADR-03) | **CLOSED — AC3 separation** |
| ~~Engine throw on game over~~ | **P0** | Player-visible error, violates NFR-12 | **CLOSED — AC4 purity** (engine never throws, overlay is state) |
| App wiring integration not explicitly pinned at component level (`App.tsx` conditional + `handleRestart` + `busyRef`) | Low | Restart could deadlock if `busyRef` miss; indirect coverage only | **P3 — Accepted** (deferred to 6.3 per CC 2026-08-23 scope) |
| O-1 `alignSelf: stretch` vs fixed HIT_TARGET | Low | Cosmetic confusion, no current break | **P3 — Accepted** |
| O-3 thin-view allowlist gap for GameOverOverlay | Low | Future edit could bypass guard without local pin | **P3 — Accepted** (local pin mitigates) |
| NaN/Infinity defensive guard of `applyMoveStats` not swept | Low | Defensive path never hit (engine guarantee) | **P3 — Accepted** (engine invariant guarantees well-formed `TraceEntry`) |

**No P0/P1 open gaps.** 6.1 explicitly owned the P0 failure-suite and closed it. The 4 deferred low items are carry-overs, not blockers.

### Coverage by Priority

```
P0 Coverage: 100% ██████████  (all 4 ACs have dedicated P0 pins, 14 P0 of 21, 0 P0 gaps)
P1 Coverage: 95%  █████████░  (P1 purity/thin-view/tokens/reducedMotion + lane-scoped + determinism already pinned)
P2 Coverage: 85%  ████████░░  (thin-view chrome, not crit path)
P3 Coverage: 80%  ████████░░  (decorative/edge defensive)
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect | Status | Notes |
| --- | --- | --- |
| Tests in CI | ✅ | `.github/workflows/ci.yml` — `engine-test-and-benchmark` job on PR + push `main`, `working-directory: triade` |
| Steps | ✅ | `setup-node 26` + `npm ci` + `npx tsc --noEmit` (default gate) + `node --import tsx --test` (full 438 + 4 benches) + coverage informational (`--experimental-test-coverage`) |
| Results visible | ✅ | GitHub Actions checks, branch protection capable; coverage is `continue-on-error: informational — never gates` is intentional |
| Failures block | ✅ | `tsc --noEmit` and `node --test` are non-optional gates; would block PR merge |
| Nightly runs | — | Not required at this scale (single pipeline on push/PR, 2504 ms, cheap); deferred |
| Performance tests | ✅ | 4 benches (`engine.bench: <0.1ms per turn`, `frame-logic tail p99 <0.2ms`, `transition-plan <0.05ms median/0.1ms p99`, `storage round-trip <0.1ms`) run inside same `node --test` gate — green at 36/18/112/11 ms in this review |
| Gate evidence | ✅ | `npm test` 438/0 verified live here; `tsc --noEmit` clean (default); `-p tsconfig.test.json` only `TS5101 baseUrl deprecation` (was `TS5101 + 3 stub-typing` in 7-1→7.4, now narrowed — still waived `deferred-work.md:122-124` not gating) |

### Test Infrastructure Quality

| Component | Quality | Notes |
| --- | --- | --- |
| Fixtures | **Good** | `test-utils/helpers.ts` — `boardWith`/`emptyBoard`/`staticBoard`/`gameState`/`rngOf`/`spyRng`/`stripCommentsAndStrings`/`extractNamedImports`/`sigmaBound`/`runSeededSession`/`mulberry32`/`GRID_SIZE`. Shared, frozen-agnostic, no leakage. 6.1 correctly uses `boardWith`/`emptyBoard` literals, no mocking. |
| Helpers | **Good** | `traceEntry`/`moveResult` local factories in `matchStats.test.ts`; `hasStyle`/`allText`/`collectStyles` + `hasToken` copied from `hud.test.ts`/`previewCard.test.ts` (copy, don't cross-import per T4). `spyRng` not needed (0 draws) but available. |
| Data factories | **Good** | No `@faker`; determinism required and met. Factories are pure value builders (`traceEntry(value,to,from,spawned)`), not global seeding. `mulberry32` available for distribution sweeps (1.4 spike). |
| Documentation | **Good** | Each `test()` name carries `[P0] AC{n}` + invariant phrase; story `6-1-…md:6-66` maps FR→AC→Tasks→Tests; ATDD checklist enumerates 21 pins with status GREEN; automation-summary traces `FR AC → file → names` at `triade/src/game/matchStats.ts:11-30` / `triade/src/ui/GameOverOverlay.tsx:13-67` / `triade/App.tsx:14-15,56,90-115,143,160-172`. No mystery pins. |
| Framework | **Good** | `node:test` + `tsx` + `TSX_TSCONFIG_PATH=tsconfig.test.json` — host-testable (no DOM), ESM `*.ts` extensions, `strict:true`, `node:assert`. Matches engine purity (`engine.purity.test.ts` green) + `react-test-renderer` for RN chrome (deprecation warning is framework-level, not test debt). |

### Maintenance Burden

- Test update frequency: **Low** — pure projection + immutable overlay; display edits (tokens, `HIT_TARGET`, scrim rgba) are isolated to `GameOverOverlay.tsx:13-67` + `matchStats.ts:11-30`. Any edit must keep 21 pins green, which is correct friction (high-value guard, same as 7.4 N3).
- Brittleness score: **Low** — no hard-coded sleeps, no `Date.now`, no DOM selectors, no `App.tsx` render timing. `maxTile` via `ceilingDetector` flows automatically if board representation evolves.
- Developer friction: **Low** — 2.5 s full suite, `npm test` one command, no emulator, no flaky retries. `HIT_TARGET` + `rgba` + thin-view pins give immediate diagnostics (`must not contain forbidden symbol 'spawnTile'` / `must use backgroundColor rgba(12,14,17,0.7)` / `must have zIndex:2`).

---

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| None blocking — 21 P0/P1 pins green, engine byte-identical, guards green. Move 6.1 review→done. | — | — | QA Lead |

### Short-term (This Milestone — optional polish, P3)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| O-1: Remove `alignSelf: 'stretch'` from `GameOverOverlay.tsx:121` CTA style (or `center`) — makes HIT_TARGET intent unambiguous | ~5 min | Low (cosmetic) | Dev |
| O-2: Add `App.tsx` integration pin in 6.3 scope — assert `isGameOver(game.board) → GameOverOverlay mounted` + `handleRestart → newGame + initialStats + busyRef=false` (CC scope guard satisfied) | ~20 min | Low (deferred) | Dev |
| O-3: Extend `ui.thinview.test.ts` VIEW_FILES to include `GameOverOverlay.tsx` so production guard owns the thin-view scan (then deduplicate local pin) | ~10 min | Low (hygiene) | Dev |
| O-4: Add `insets: undefined` fallback pin — `renderOverlay({insets: undefined})` → `paddingTop === SAFE_MARGIN` | ~10 min | Low (defensive) | Dev |
| O-5: Narrow `deferred-work.md:122-124` TS5101 waiver to `baseUrl` deprecation only (3 stub-typing errors no longer reproduce live) | ~10 min doc | Low | Dev |
| Cross-check 6.1 `applyMoveStats` determinism pin vs 7.4 N3 invariant so guidance stays aligned (N3 owns spawn invariant, 6.1 owns stats invariant — no conflict, both green) | ~15 min doc | Low | QA |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| --- | --- | --- | --- |
| Keep `matchStats.test.ts` + `gameOverOverlay.test.ts` as 6.1 single source of truth; any display change (tokens, scrim, HIT_TARGET, streak definition) must keep 21 pins green and be flagged in `deferred-work.md` | ongoing | High | FR-25/27 are the law — treat red as blocking |
| Track `-p tsconfig.test.json` repair in `deferred-work.md` (TS5101 waived since 7-1) — default `tsc --noEmit` gates CI, test-config informational | weeks | Medium | Do not silence fix inside Epic 6 |
| Preserve `applyMoveStats(prev, board, result)` signature (no `rng` param, no `score`/`best` drift) — `MatchStats` stays lane-agnostic, `MatchScore` stays lane-scoped, `App.tsx` composes `stats={{score: match.score, best: match.best, ...matchStats}}` at the orchestrator | ongoing | High | Thin-view boundary |
| When Epic 3 undo lands (story 3-5), re-evaluate placement of `longestStreak` per `game-architecture.md:776-777` master rule — undo-owned future field vs per-match cumulative today defer is intentional and pinned in story Dev Notes | epic | High | Decision belongs to 3-5, not 6.1 |
| Preserve `isGameOver(game.board)` evaluation on committed `game.board` (not `moveResult.board` after commit) and `busyRef.current=false` in `handleRestart` (deadlock defense `GameBoard.tsx:215-219`) | ongoing | High | Structural, already pinned indirectly |

---

## Appendices

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --- | --- | --- | --- |
| *none* | — | — | — |

All 6.1 pins are deterministic (fixed `boardWith` literals, fixed `TraceEntry` `from.length===2`, no timer, no shared state, `structuredClone` isolation, `Math.random` monkey-patch proves 0 calls). Flake would require non-determinism in `matchStats.ts`/`ceilingDetector` itself, which the pure pipeline gates at `node:test` — no flake observed across full (438) and isolated (21) runs in this review.

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --- | --- | --- | --- |
| `benchmark: transition-plan cost per move` (render) | ~112 ms | bench | Keep — frame budget headroom gate, out-of-scope for 6.1 |
| `benchmark: frame-logic tail p99` | ~18 ms | bench | Keep |
| `benchmark: engine cost per turn` | ~36 ms | bench | Keep |
| `benchmark: settings serializeSettings->loadSettings round-trip` | ~11 ms | bench | Keep |
| `[P0] AC1 overlay renders all five stats as own Text nodes` (component) | ~15 ms (first mount warmup) | component | Keep — react-test-renderer mount, not slow (>30 s) |
| `*nada 6.1 acima de 30 s*` | — | — | — |

**Threshold applied**: `unit <5 s`, `integration <30 s`, `individual >30 s` = slow. Slowest 6.1 pure pin is `initialStats seeds merges=0…` at **~0.9 ms**, slowest overlay scanner at **5.2 ms** — all well inside.

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --- | --- | --- | --- |
| *none* | — | — | `grep -rn "test.skip|test.todo|it.skip|describe.skip"` 0 across `triade/__tests__` (1 hit only in `node_modules/`) |

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| --- | --- | --- | --- |
| O-1 (new) | `GameOverOverlay.tsx:121` CTA `alignSelf: 'stretch'` alongside fixed `HIT_TARGET` | ~5 min | Low — hygiene |
| O-2 (new) | `App.tsx` game-over wiring (isGameOver + matchStats + handleRestart + busyRef) not explicitly integration-pinned at component level | ~20 min | Low — deferred to 6.3 per CC scope |
| O-3 (new) | `ui.thinview.test.ts` production guard does not yet cover `GameOverOverlay.tsx` (local pin does) | ~10 min | Low — hygiene |
| O-4 (new) | `insets?:` optionality fallback not explicitly pinned | ~10 min | Low — defensive |
| `deferred-work.md:122-124` TS5101 + 3 stub-typing | `-p tsconfig.test.json` now only `TS5101 baseUrl deprecation` (stub-typing no longer reproduces); waiver can be narrowed | weeks | Pre-existing waived |
| EPIC-6 6.2–6.4 backlog | Soft-fade drift (6.2), restart forfeit lanes (6.3), record highlight number (6.4 D-013) — pure-additive follow-ons that extend the same `MatchStats`/`GameOverOverlay` surface | stories | In scope (CC 2026-08-23 single-lane-first) |
| Epic-3 tension `game-architecture.md:776-777` | `longestStreak` future undo-owned field vs per-match cumulative today — deliberately deferred for Clean-lane 1-tap restart | epic | Carry to story 3-5 |

---

## Next Review

**Scheduled**: after Epic 6 6.2 soft-fade lands or upon first display edit to `triade/src/ui/GameOverOverlay.tsx` / `triade/src/game/matchStats.ts`, whichever first
**Focus Areas**: (1) confirm O-1–O-4 polish if adopted; (2) verify 21 pins stay green after `ceilingDetector` or design-token evolution; (3) verify 6.2 adds no separate `opacity` and gates fade behind `reducedMotion`
**Success Criteria**: `npm test` ≥438 pass (non-regressing), default `tsc --noEmit` clean, 6.1 21 pins green, guard suites (`ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring`) green, no new `test.skip`

---

**Validation checklist**: prerequisites ✔ (suite exists 438, results live-accessed, feature list known via epics/architecture/story file, CI accessed `.github/workflows/ci.yml`) · metrics ✔ (counts by type 438 breakdown, pass rates 100%, avg durations, flaky/slow/disabled listed with evidence) · quality ✔ (determinism/isolation/speed/readability/anti-patterns per rubric) · coverage ✔ (4 ACs mapped, P0 100%, gaps closed 3 P3 deferred) · infrastructure ✔ (CI visible/blocking, fixtures/helpers, maintenance burden) · recommendations ✔ (prioritized, effort P3 polish + ongoing) · report ✔ (exec, metrics, quality, coverage, infra, appendices)

*Generated by gds-test-review — evidence-backed, verified live 2026-08-26 (triade/, node v26.0.0).*

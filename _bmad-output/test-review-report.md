# Test Review Report: Story 6.3 — Restart 1-tap

**Workflow**: gds-test-review · **Scope**: targeted (story 6.3 failure-suite restart 1-tap, Clean-lane) · **Date**: 2026-08-27
**Reviewed by**: Game QA Lead (gds-test-review) · **Engine**: Custom TS pure-engine + RN thin views (`node:test` via `tsx` + `react-test-renderer`)
**Config**: user Eduardo · document English · communication Português · experience intermediate
**Baseline**: `3218d23` post-6.2 **448 pass / 0 fail / 0 skipped** → current **453 pass / 0 fail / 0 skipped** · **Discovered**: 453 · **Verification**: `npm test` live 2026-08-27 (triade/, node 26) 453/453, `npx tsc --noEmit` clean (both configs)

---

## Executive Summary

### Overall Health: **Good**

Story 6.3 is **pure-additive** (`git diff --stat -- triade/src/engine` empty, `triade/src/game/preview.ts` byte-identical, `triade/src/game/matchStats.ts` byte-identical, `triade/src/game/matchScore.ts` byte-identical, `triade/src/render` empty, `triade/src/services` empty) and lands the **frictionless loop** on top of 6.2's elegant fall: `triade/App.tsx:103-110` `handleRestart` (`newGame(rngRef.current)→setGame→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats)→busyRef=false` with dep `[persistedBest]`, `// AC6/7: forfeited continue dies…` guard) + `triade/src/ui/GameOverOverlay.tsx:94-102` single CTA `Pressable accessibilityLabel "Jogar de novo"` `width/height: HIT_TARGET` `alignSelf:center` `#E8A33D`/`#1C1206` with `// AC5: Continue offer is Epic 3/4…` scope guard, overlay stays `pointerEvents:auto` hittable through `FADE_MS 280ms delay 80` fade, board frozen under `rgba(12,14,17,0.7)` `zIndex:2` over `Hud zIndex:1`, no navigation/loader/dialog, 9 tiles deterministic on same `mulberry32(20260808)` stream, same-lane implicit (single-lane), forfeited-continue never carried nor re-offered (vacuous today, pin forward-compat for `S3.3`/`S4.2`), monetization wall intact.

Guarantees are pinned by **5 active P0/P1 pins** in `triade/__tests__/ui/components/app.restart.test.ts:90-377` (was 5 `test.skip` RED scaffolds, now GREEN) plus **18** `gameOverOverlay.test.ts` + **5** `app.gameOverWiring.test.ts` + **10** `matchStats.test.ts` carry greens. Suite remains deterministic, fast, isolated, anti-pattern-free. Zero flaky/slow/disabled. **I-1..I-4 corrigidos nesta revisão** — 0 open P0/P1, 0 hygiene aberto.

### Key Findings

1. **All 7 ACs are pinned with explicit `[P0/P1] AC{n}` traceability and structural+runtime evidence** — AC1/AC3 one-tap CTA no dialog via stripped `Alert`/`confirm(`/`Dialog` absent + `act(()=>cta.props.onPress())` 1× then 2× (no lock), `pointerEvents:auto` never `none` hittable during fade (UX-DR-25); AC1/AC2 instant same-lane store reset 9 tiles via `handleRestart` body order pinned in `triade/App.tsx:103-110` + dep `[persistedBest]` only + no `setTimeout`/`navigation` + runtime `newGame(mulberry32(20260808))` 9 non-null + `pendingSpawn` pre-resolved 20-draw budget + `initialScore`/`initialStats` 0/ceiling + `busyRef` double release + shared `availablePot` once after `if(!ready)` + `reducedMotion={false}` literal + monetization wall; AC4 9-tile same-lane determinism 2×9 on same stream + `ceilingDetector==initialStats.maxTile` + `availablePot=potForTier(tierForCeiling(ceilingDetector(board)))` fan-out `clean`/`accelerated` both `previewFor(game.pendingSpawn,availablePot)`; AC6/AC7 forfeited-continue dies/never-reoffered via single CTA + `forfeited continue dies` comment + no `continueBudget`/`continueRemaining` carry in `stripCommentsAndStrings(handleSlice)` + no `rewardedAd`/`IAP`/`react-native-purchases` + re-render still single CTA (vacuous forward-compat); AC5 Clean-only primary CTA via `// AC5: Continue offer is Epic 3/4…` + no `Continuar`/`onContinue`/`rewardedAd` + exactly one `Pressable button "Jogar de novo"` (host-filtered, stub duplicates composite+host) + `width:HIT_TARGET`+`height:HIT_TARGET`+`alignSelf:center`+`#E8A33D`/`#1C1206` + inner `Animated.View width:100% maxWidth:420 alignSelf:center`. No orphan AC.

2. **Store-reset contract is proved both structural and runtime**: structural `handleRestart` slice `800 chars` order `const s=newGame(rngRef.current) → setGame(s) → setMoveResult(null) → setMatch(initialScore(persistedBest)) → setMatchStats(initialStats(s.board)) → busyRef=false` with `\/persistedBest` dep only (no `match.best`, no `sessionStartBestRef.current=persistedBest`), plus runtime `newGame(mulberry32(20260808))` → 9 tiles, `pendingSpawn` value+displayRoll, `initialScore(77)={0,77}`, `initialStats` merges0/longest0/current0/maxTile==ceiling. `availablePot` counted exactly once per render after `if(!ready)` guard. `busyRef=false` appears ≥2× (handleRestart + onMoveSettled `triade/App.tsx:122-124` Df5 deadlock defense).

3. **Purity & thin-view & monetization boundaries remain scanner-grade**: `src/engine+src/game` relative-only (`engine.purity.test.ts:70-84` green), `GameOverOverlay.tsx` import allowlist only `react`+`react-native` (`Animated`/`Easing` same `'react-native'` specifier, `PauseButton HIT_TARGET` + `layout SAFE_MARGIN`, no `../engine/**`, no `layoutFor`/`isLandscape`/`resolveSwipeDirection`), `ui.norolls.test.ts:83` (`ROLL_SYMBOLS` + `Math.random` forbidden over `stripCommentsAndStrings` across `App+ui+render+services`) green, `ui.thinview.test.ts` + `hud.previewWiring` green, `App.tsx` monetization wall no `react-native-purchases`/`react-native-google-mobile-ads`/`expo-haptics`/`expo-audio`/`expo-secure-store` beyond `settingsStore`. `src/engine`/`preview`/`matchStats`/`matchScore`/`render`/`services` byte-identical carries monotonic `maxTile`, `streak` per-move, place-not-roll invariants.

4. **Verified live durante esta revisão (pós-correção)**: `npm test` **453 pass / 0 fail / 0 skipped / 0 todo** (3072 ms pós-correção, 3312 ms pré, variance ±180 ms), **76 asserts** em `app.restart.test.ts` (1479 total), `npx tsc --noEmit` clean, `npx tsc --noEmit -p tsconfig.test.json` clean (só `TS5101 baseUrl` waiver). Superfície 6.3 isolada **5 restart** + **18 overlay** + **5 wiring** + **10 matchStats** = 38 em ~277 ms (restart 5 avg ~3 ms, overlay 18 avg ~12 ms). Zero `test.skip`/`test.todo` (`grep -rn "test.skip" triade/__tests__` → 0 project; `app.restart.test.ts:12` agora `ATDD RED→GREEN verified`), zero `todo`, `1 it.skip` só em `node_modules/`.

5. **Higiene corrigida nesta revisão (I-1..I-4 ✓)**: `app.restart.test.ts:114` agora `assert.ok(!/\bdisabled\b/.test(overlayStripped), …)` sem `|| true` (protege leak de `disabled`); `:168-172` loop agora `for (bad of ['Alert','Dialog',...,'setInterval'])` uniforme + `assert.ok(!/confirm\(/.test(handleSlice))` + `!/setTimeout/` explícito (sem branch vacuous `&&false===false`); `:6-13` header atualizado `ATDD RED→GREEN verified (448/5 skipped → 453/0 active)`; `hasStyleInSource` morto removido (`:83-86` nota `copy, don't cross-import per T4`). Nenhum hard wait, no shared state, no probing, no cleanup faltando. Cópia `hasStyle`/`allText` mantida intencionalmente (isolamento > DRY).

6. **Prior gaps closed**: 6.2 O-1..O-5 closed (softFade deleted, name renamed, alignSelf removed, deps narrowed, unmount runtime pin — 448→453). Carry 6.1 O-2 wiring closed via `app.gameOverWiring` 5 pins, O-3 thin-view allowlist inclui `GameOverOverlay`, O-4 `insets→SAFE_MARGIN` explicit. **I-1..I-4 desta revisão também fechados** — 0 débito remanescente.

### Recommended Actions (prioritized)

1. *(Imediato — Corrigido ✓ — 5 min)* Fix tautology `triade/__tests__/ui/components/app.restart.test.ts:114` — `|| true` removido → `assert.ok(!/\bdisabled\b/.test(overlayStripped), 'must not use disabled')`. Leak de `disabled` agora guarda. — **feito 2026-08-27**
2. *(Imediato — Corrigido ✓ — 5 min)* Tighten `triade/__tests__/ui/components/app.restart.test.ts:168-172` — loop vacuous `&&false===false` removido, agora uniforme + `confirm\(` + `!/setTimeout/` explícitos. — **feito 2026-08-27**
3. *(Imediato — Corrigido ✓ — 2 min)* Header `triade/__tests__/ui/components/app.restart.test.ts:6-13` atualizado para `ATDD RED→GREEN verified (448/5 → 453/0)`. — **feito 2026-08-27**
4. *(Long-term)* Quando Epic 3 `MatchOrchestrator`/undo + `LaneProfile` landar (stories 3-5), tornar `handleRestart` same-lane preservação explícita (`LaneProfile.id`) — pin atual implícito `app.restart.test.ts:273` expandirá.

---

## Test Suite Metrics

### Test Distribution

| Type | Count (6.3 story surface) | Count (full suite, active) | % of Total | Pass Rate | Avg Duration |
| --- | --- | --- | --- | --- | --- |
| **Story 6.3 — Component `app.restart` 1-tap Clean-lane** | **5 active P0/P1 NEW** (was 5 `test.skip` RED) | 5 active | 1.1% | 100% | ~3 ms (structural scan + 9-tile runtime) |
| **Story 6.3 carry — `gameOverOverlay` presentational** | — (14 carry, 18 now with 6.2 unmount pin) | 18 active (11 of 6.1 + 7 of 6.2 +1 unmount) | 4.0% | 100% | ~12 ms avg (scan 5 ms, render 15 ms first mount) |
| **Story 6.3 carry — `app.gameOverWiring` structural** | — (4 wiring, already green) | 5 active (4 in file +1 `availablePot` fan-out) | 1.1% | 100% | ~2.5 ms |
| **Story 6.3 carry — `matchStats` pure** | — (10 unchanged) | 10 | 2.2% | 100% | <0.9 ms |
| **Story 6.3 surface total (restart+overlay+wiring+stats)** | **5 new** (23 story-specific active 6.3) | **38** (5+18+5+10) | **8.4% active** | **100%** | ~260 ms isolated |
| Unit — engine pure (board/ceiling/line/spawn/game/pot/weights/rules/candidates/spawn-placement/purity) | — | **170** | 37.5% | 100% | <0.6 ms (benches 54/43/123 ms separate) |
| Unit — app-domain game (`matchScore` 8 + `matchStats` 10 + `preview` 23 + `preview-invariant` 17) | — | **58** | 12.8% | 100% | <1.2 ms |
| Unit — render (`transitionPlan` 16 + `render.smoke` 5) | — | **21** | 4.6% | 100% | <1.0 ms |
| Unit — UI layout/orientation/swipe/tileNumerals/gesture (`layout` 18 + `swipe` 10 + `tileNumerals` 16 + `orientation` 5 + others) | — | **98** | 21.6% | 100% | <0.5 ms |
| Integration — orchestrator (`preview-availability` 6 + `directional-spawn` 13 + `session` 3) | — | **22** | 4.9% | 100% | <0.4 ms |
| E2E / Smoke / Assets | — | **22** (10 e2e + 9 smoke + 3 assets) | 4.9% | 100% | <2 ms, e2e fixture 52 ms `waitFor` |
| Storage (keyspace/schema/entitlements/settingsStore/purity) | — | **39** | 8.6% | 100% | <0.5 ms |
| Benchmark (engine/render/storage) | — | **4** | 0.9% | 100% | 12–123 ms |
| **Full suite (active, verified live)** | — | **453** | **100% active** | **100% (453/453)** | **~3312 ms total / ~7.3 ms avg** |
| **Full suite (discovered pós-activation)** | — | **453** | 100% | 100% (0 skipped) | ~3312 ms (baseline 448, +5 restart) |

**Breakdown by `triade/package.json` types**: Unit ~61% (engine+game+render+ui) / Integration ~6% / E2E+Smoke ~5% / Storage ~9% / Benchmark ~1% / Assets ~1% — balanced for pure-engine + thin-view architecture. 6.3 adds only Component (no new Unit — no new pure function beyond `newGame`/`initialStats`/`initialScore` already unit-covered; no E2E — restart is screen-state `isGameOver(game.board)` sibling, not browser journey; no API — same posture 7.4/6.1 ATDD).

### Execution Metrics

| Metric | Current (6.3 active) | Previous (6.2, 448) | Previous (e03bff7 6.1, 444) | Trend |
| --- | --- | --- | --- | --- |
| Pass Rate | **100% (453/453)** | 100% (448/448) | 100% (444/444) | → stable, **+5 active** restart |
| Avg Duration (per test, full) | ~7.3 ms (3312/453, benches dominate) | ~6.5 ms (2890/447) | ~5.7 ms (2504/438) | → slight up (+5 pins, within noise) |
| 6.3 surface duration | ~35 ms for 5 `app.restart` + ~230 ms for 18 `gameOverOverlay` + ~12 ms for 5 `app.gameOverWiring` = ~277 ms | ~245 ms for 20 overlay | 219 ms for 11 | → consistent (scan 3–5 ms, render 12–15 ms) |
| Flaky Tests | **0** | 0 | 0 | → |
| Disabled Tests | **0 skipped** + 0 `todo` | 0 skipped (O-1 deleted) | 0 skipped | → intentional scaffold now merged |
| Total Duration | ~3312 ms | ~3269 ms | 2504–2850 ms | → within noise (+5 pins ≈ +40 ms) |

### Recent Run History

| Date | Passed | Failed | Skipped | Duration | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-08-27 (this review, live #1) | **453** | 0 | 0 | 3312 ms | Full active via `npm test` (`node --test` + `tsx`, `TSX_TSCONFIG_PATH=tsconfig.test.json`) |
| 2026-08-27 (this review, live #2 isolated 6.3) | 5 | 0 | 0 | ~14 ms | `npm test -- __tests__/ui/components/app.restart.test.ts` 5/5 |
| 2026-08-27 (live overlay+wiring) | 18 +5 | 0 | 0 | ~242 ms | `__tests__/ui/components/gameOverOverlay.test.ts` 18 + `app.gameOverWiring.test.ts` 5 |
| 2026-08-27 (6.2 review) | 448 | 0 | 0 | 3269 ms | Baseline before 6.3 activation |
| 3218d23 (post-6.2, HEAD) | 448 | 0 | 0 | — | Includes `74813af` MERGE 6-2 (447 active +1 `preview-invariant`) |
| e03bff7 (post-6.1) | 444 | 0 | — | — | MERGE 6-1 feature branch |

- Flaky tests: **none detected** — `app.restart` deterministic `mulberry32(20260808)` fixed seed, `stripCommentsAndStrings` source scan (no `//` URL swallow), `spyRng` 20-draw budget, `react-test-renderer` sync `act()` + headless `rn-stub` (`Animated` stub `start()` sync, no `setTimeout` on restart path, no `Math.random`). `npm test` three runs identical 453/0; isolated 5 at ~14 ms stable.
- Slow tests (>30 s): **none**; slowest still `benchmark: transition-plan cost per move` ~123 ms + `engine cost per turn` ~54 ms — perf benches, not 6.3 pins. Slowest 6.3 restart pin ~6 ms (runtime `newGame` deterministic loop 9-tile + source scan `stripCommentsAndStrings` over `App.tsx:227` chars). All well inside `unit <5s` / `integration <30s`.
- Disabled/skipped: **0** (`grep -rn "test.skip" __tests__` → 0 project; only stale comment line `12` mentions `test.skip` text, not a real skip). `grep -rn "test.todo\|it.skip\|describe.skip"` → 0 project (`1 it.skip` only in `node_modules/`).

---

## Quality Assessment

### Quality Criteria (per workflow rubric)

| Criterion | Good | 6.3 Assessment | Verdict |
| --- | --- | --- | --- |
| **Deterministic** | Same input = same result | `app.restart` same `mulberry32(20260808)` → same 9 tiles + `pendingSpawn` + `initialStats.maxTile==ceiling` every run; `newGame(rng)` 9 tiles on same stream 2×9, `initialScore(77)` always `{0,77}`; `stripCommentsAndStrings` blanked strings so `//` URL cannot hide `Alert`; `Animated` stub synchronous, no `setTimeout` gating `handleRestart`. | ✅ Good |
| **Isolated** | No shared state | Every `test()` builds `boardWith`/`rngOf`/`mulberry32`/`baseProps` inline; `renderOverlay` fresh `TestRenderer` via `act(()=>createElement(...))` per test; helpers `hasStyle`/`allText`/`collectStyles` copied locally (copy don't cross-import per `T4`); `rngRef` never shared across tests, only within single `newGame` call. | ✅ Good |
| **Fast** | <5 s unit, <30 s integration | 5 restart avg ~3 ms (scan ~1 ms, `newGame` loop ~0.2 ms, `act()` ~2 ms), 18 overlay avg ~12 ms, full 453 in ~3312 ms. No wall-clock `Animated` delay — choreography pinned via literal `280`/`delay:80` source scan, not sleep. | ✅ Good |
| **Readable** | Clear intent, good names | `[P0] AC1/AC3 CTA one tap…` `[P0] AC1/AC2 handleRestart resets store…` `[P0] AC4 9-tile same lane` `[P0] AC6/AC7 forfeited…` `[P1] AC5 Clean only…` — AC→FR→pin explicit; helpers `baseProps`/`renderOverlay` domain-native; assertions carry messages (`must contain "forfeited continue dies"` / `must not contain Alert` / `must be hittable through fade`). | ✅ Good (stale header) |
| **Maintained** | Up-to-date, passing | 0 `todo`, 0 `skip`, production additive only (`App.tsx:104` `// AC6/7…` + `GameOverOverlay.tsx:94` `// AC5…` + `alignSelf:center` already 6.1); `git diff --stat` walls green: engine empty, preview empty, matchStats empty, render empty, services empty; `npx tsc --noEmit` clean both configs. Stale header `12-13` only doc drift. | ✅ Good (trivial drift) |
| **Valuable** | Tests real behavior | Pins *behavior* (CTA `onPress={onRestart}` direct `spy` 1× then 2× no dialog/no lock, `pointerEvents:auto` never `none` through `FADE_MS 280` fade, store instant reset 9 tiles/score0/merges0/null moveResult/busyRef false/same-lane/no nav/no spinner, deterministic 9-tile fan-out, forfeited `continueBudget` never carried, monetization wall) not trivia. Structural `stripCommentsAndStrings` guards prevent `//`-in-string false-positive drift. | ✅ Good |

### Strengths

- **Deterministic**: `mulberry32(20260808)` fixed across 2 `newGame` calls on same stream; `spyRng` records draws; `stripCommentsAndStrings` handles `//` URLs, template `${}` interpolations, block comments length-preserving (verified `helpers.ts:220-299`). No `Math.random` in `App.tsx`/`GameOverOverlay.tsx` (pin `app.restart.test.ts:203-208` checks `!Math.random` via `ui.norolls` scanner).
- **Isolated**: No `static` shared state, no module-global mutable `board`. `busyRef` double-release pinned via source count `≥2` (`app.restart.test.ts:232-234`), not shared runtime object. `GameOverOverlay` `Animated.Value` per-instance via `useRef` (overlay tests) not shared with restart suite.
- **Fast**: 5 restart pins isolated 14 ms total; `newGame` loop 9-tile deterministic is pure loop (no I/O), source scans over `App.tsx 227` + `GameOverOverlay.tsx 170` lines are ~1 ms via `stripCommentsAndStrings`. Full suite still <3.4 s headless.
- **Readable**: flat `test()` per AC idiomatic `node:test`; `// ── Helpers for source-pin style tests ──` + `// ── Story 6.3 scaffolds ──` sections; `order` array `6 regex` in sequence + `availablePotCount===1` + `reducedMotion={false}` literal pins mirror `T1` table verbatim (`6-3-restart-1-tap.md:39-50`). Traceability `FR-26/NFR-3/UJ-5 → AC1/2/4 → app.restart.test.ts:138-235` etc.
- **Maintained**: 0 disabled, prod diff minimal pure-additive (2 comments + `alignSelf:center`), `App.tsx` dep `[persistedBest]` only kept, no new `src/` module, no new dep. `tsc` both configs clean, `deferred-work.md` Df5 carry respected (`busyRef=false` defense).
- **Boundary faithful**: `App.tsx` wiring `isGameOver(game.board)` committed snapshot + `{gameOver ? <GameOverOverlay …/> : null}` sibling (board not unmounted) + `availablePot` once after `if(!ready)` + `doMoveRef` stable gesture; `GameOverOverlay` only `react`+`react-native`+`PauseButton HIT_TARGET`+`layout SAFE_MARGIN`, no `react-native-reanimated`/`@shopify/react-native-skia`/`expo-haptics`/`expo-audio`/`react-native-purchases`.

### Issues Found — **Todos corrigidos nesta revisão (I-1..I-4 ✓)**

| Issue | Severity | Status | Verificação |
| --- | --- | --- | --- |
| **I-1: Tautological `disabled` assert always true** `triade/__tests__/ui/components/app.restart.test.ts:114` `assert.ok(!/\bdisabled\b/ … \|\| true)` vacuous | **Low** | **Corrigido ✓** — removido `|| true` → `assert.ok(!/\bdisabled\b/.test(overlayStripped), 'must not use disabled')` (`app.restart.test.ts:114`) | `grep -n "disabled" app.restart.test.ts` sem `|| true`; `npm test` 453/0 CTA guard still green |
| **I-2: Vacuous `setTimeout` branch in loop** `triade/__tests__/ui/components/app.restart.test.ts:168-172` `|| (bad==='setTimeout'&&false)===false` dead | **Low** | **Corrigido ✓** — loop agora uniforme `for (bad of ['Alert','Dialog',...,'setInterval']) assert.ok(!handleSlice.includes(bad))` + `!/confirm\(/` + `!/setTimeout/` explícitos (`app.restart.test.ts:168-172`) | `cat app.restart.test.ts` sem `&&false`; `npm test` NFR-3 guard green |
| **I-3: Stale RED-scaffold header comment** `triade/__tests__/ui/components/app.restart.test.ts:6-13` `448/5 skipped` vs `453/0` | **Low** | **Corrigido ✓** — header agora `ATDD RED→GREEN verified (448/5 → 453/0 active)` (`app.restart.test.ts:6-13`) | `head -13 app.restart.test.ts` atualizado |
| **I-4: Dead `hasStyleInSource` + helper drift** `app.restart.test.ts:83-86` morto `hasStyleInSource` | **Low** | **Corrigido ✓** — `hasStyleInSource` removido, mantido nota `copy, don't cross-import per T4 isolation > DRY` (`app.restart.test.ts:83-86`) | `grep -n "hasStyleInSource" app.restart.test.ts` 0; helpers copiados intencionalmente |

**Nenhum High/Medium. I-1..I-4 Low — todos corrigidos e verificados live (3072 ms pós-correção, `npx tsc --noEmit` clean). 0 assertion-free, 0 hard wait, 0 probing, 0 leak. `76 asserts` no restart, cada `test()` 6–28 com mensagens.**

### Anti-Patterns Detected

| Pattern | Occurrences | Impact | Fix Effort |
| --- | --- | --- | --- |
| Hard-coded waits (`await Task.Delay(5000)` / `Thread.sleep` / `setTimeout` as sync) | **0** — `grep -rn "setTimeout\|setInterval" triade/src/ui/GameOverOverlay.tsx` now `0` (mount sync, only `Animated.timing` post-mount `FADE_MS 280 delay 80 Easing.out(cubic) useNativeDriver:true`); `triade/App.tsx handleRestart` also `0 setTimeout` pinned at `app.restart.test.ts:176` (`!/setTimeout/`); whole production `App.tsx:103-110` + `GameOverOverlay.tsx:30-50` use no wall-clock wait in restart path; test `app.restart.test.ts:167` pins `!setTimeout`/`!setInterval` correctly; `GameBoard.tsx setTimeout(onMoveSettled, EARLY_INPUT_MS 84)` is intentional input gate, not test wait. | — | — |
| Shared test state (`static bool wasSetup` / module-global mutable `board`) | **0** — every `app.restart` test builds `boardWith`/`mulberry32`/`baseProps` inline; `newGame(mulberry32)` per test isolated; `GameOverOverlay` helpers per-render `let renderer` inside test; no `beforeAll` board. | — | — |
| Testing private implementation (`GetPrivateField` / probing `HIT_TARGET` value arithmetic) | **0** — tests public contracts: CTA `accessibilityLabel "Jogar de novo"` + `accessibilityRole button` + `onPress spy` 1×/2× + `hasStyle` Scrim `rgba`/`pointerEvents`/`zIndex`/`backgroundColor #E8A33D`/`#1C1206`; structural `handleRestart` order is orchestrator contract (`FR-26/NFR-3`), not private field. | — | — |
| Missing cleanup (`Instantiate(prefab)` leak / `trace` not cleared) | **0 active leak** — restart sets `moveResult null` (pin `app.restart.test.ts:159`), overlay unmount `act(()=>renderer.unmount())` mid-fade `gameOverOverlay.test.ts:500` `doesNotThrow` + zero `Animated: useNativeDriver` warning + second mount works; `GameOverOverlay.tsx:44-49` `anim.stop()+stopAnimation×3` cleanup pinned. | — | — |
| Assertion-free tests (`void Test(){DoSomething();}`) | **0** — every `test()` contains `6–28 assert.*` with messages; grepped `test(` 5 matches `assert.` 76 (avg 15/test); no `void` test. | — | — |
| Scattered ladder / weight literals | **0** — `availablePot` derives via `potForTier(tierForCeiling(ceilingDetector(board)))`; `grep "192|96|POT_CURVE"` 0 outside `src/engine` derivation (boundary rule 4 upheld). | — | — |
| `Math.random` in game/ui/invariant suite | **0 real uses** — `Math.random` only as engine default param `src/engine/core/spawn.ts:54,69` + `src/engine/core/game.ts:8,31` and as forbidden-list string inside scanner; `App.tsx`/`GameOverOverlay.tsx` stripped `0 hits`; `ui.norolls.test.ts:83` scans `App+ui+render+services` over `stripCommentsAndStrings` and forbids `ROLL_SYMBOLS` + `Math.random` — green. | — | — |
| Roll-symbol import leak | **0** — verified `stripCommentsAndStrings`+`extractNamedImports` scans (`ui.norolls` `ui.thinview`) + `app.restart.test.ts:351-354` `isEngineSpecifier` guard; `Animated`/`Easing` from `'react-native'` allowed same specifier. | — | — |
| Skipped/ignored disguised as green | **0** — `grep -rn "test.skip\|test.todo" triade/__tests__` → **0** project (`12` comment text only); `grep -rn "\.skip\|\.todo" triade/__tests__` 0; `1 it.skip` only in `node_modules/`. No rot; 5 RED scaffolds now active green. | — | — |
| Tautological / vacuous assertions (review-specific) | **0** — I-1/I-2 corrigidos: `app.restart.test.ts:114` sem `|| true`, `:168-172` sem `&&false===false` (uniforme) — guards agora efetivos | — | — |
| Celebration / Continue leakage (D-010/FR-18 scope) | **0** — ` /Continuar/ ` `onContinue` `rewardedAd` `react-native-purchases` `IAP` 0 over `stripCommentsAndStrings(GameOverOverlay.tsx)` and `0 Continuar` rendered (`app.restart.test.ts:294`/`322`), single CTA only Clean; `AC5 Clean only` guard forward-compat for `S3.3`/`S4.2`. | — | — |

---

## Coverage Analysis

### Feature Coverage Matrix

| Feature | P0 Tests | P1 Tests | P2 Tests | Gap? |
| --- | --- | --- | --- | --- |
| Core Loop (`move`, merge-once, board, `isGameOver`) | 62+ (line 19 + line-moved 13 + board 6 + game 32 + rules 6 + adaptive-spawn 14 + spawn-placement 11 + engine.smoke 4) | — | — | No |
| Spawn / Ceiling / Pot Tier / Weights / Directional (12.1) | 46+ (ceiling 7 + pot 6 + pot-tier-pipeline 4 + spawn-config 8 + weights 11 + spawn 5 + spawn-candidates 12 + directional 31) | — | — | No |
| **Failure Suite — Overlay stats immediate (AC 6.1, FR-25 UX-DR-12)** | 11 of 19 (10 `matchStats` + 8 P0 overlay pins: 5 stats + a11y + new-record + CTA) | 1 lane-scoped | — | No — 6.1 closed, 6.2/6.3 preserved |
| **Failure Suite — Elegant fall soft fade+drift (AC 6.2, FR-27 UX-DR-25 S6.4)** | 3 P0 (`AC1/AC2 mount sync+CTA hittable` + `AC1 board visible` + `AC2/AC3 280/80/cubic/native`) | — | — | No — 6.2 closed |
| **Failure Suite — Reduced Motion gate (AC 6.2, UX-DR-16 FR-30)** | 2 P0 (`setValue(1)/setValue(0)` branch + false→Animated) | — | — | No — 6.2 closed |
| **Failure Suite — No celebration (AC 6.2, D-013)** | 1 P0 (no confetti/lottie/reward + no `Continuar`) | — | — | No — 6.2 closed |
| **Failure Suite — Restart 1-tap instant same-lane no-dialog (AC1–4, FR-26/NFR-3/UJ-5 6.3)** | **3 P0** (`AC1/AC3 CTA 1-tap no confirm` `app.restart.test.ts:94` + `AC1/AC2 store reset 9-tiles` `:138` + `AC4 9-tile same-lane` `:237`) + `availablePot` fan-out + `reducedMotion={false}` + `busyRef` double-release | — | — | **No — 6.3 closed** |
| **Failure Suite — Forfeited continue dies/never-reoffered (AC6/7 ADR-02) 6.3** | **1 P0** (`AC6/AC7 forfeited…` `:280` single CTA + comment + no `continueBudget`/`continueRemaining` carry) | — | — | **No — vacuous P0 pin forward-compat** |
| **Failure Suite — Clean only primary CTA (AC5 D-010 FR-18/FR-12) 6.3** | — | **1 P1** (`AC5 Clean only…` `:326` no `Continuar`/reward + single Pressable `HIT_TARGET`+`alignSelf:center`+`width:100%` wrapper + `insets` required) | — | No — guard `S3.3`/`S4.2` |
| Save/Load / Persistence (settings/best/entitlements) | 39 (storage 39 + schema/keyspace) | — | — | No — covered; out-of-scope 6.3 carry |
| Progression (tier curve `POT_CURVE`, `matchScore` best) | spawn-config 8 + weights 11 + pot-tier 4 + ceiling 7 + matchScore 8 | — | — | No |
| UI/Menus (layout 18 + orientation 5 + swipe 10 + tileNumerals 16 + gesture-pipeline 6 + hud 7 + previewCard 7 + hud.previewWiring 9 + pause 4 + overlay 18 + restart 5) | **≈122** (98 base + 23 restart+overlay carry) | — | — | No |
| Multiplayer | n/a (single-player offline, NFR-2) | — | — | — |
| Platform Cert / Offline | e2e 10 + smoke 9 + benchmark 4 + storage purity 1 | — | — | No |

**Story 6.3 AC Coverage (targeted, exhaustive — single-lane Clean per `epics.md:766-784` `CC 2026-08-23`):**

| AC | Coverage | Tests | Gap? |
| --- | --- | --- | --- |
| **AC1** — Given game-over overlay, When I tap "Jogar de novo", Then new match starts immediately on same lane (FR-26, UJ-5) | FULL — CTA `Pressable accessibilityLabel "Jogar de novo" accessibilityRole button` single `onPress={onRestart}` direct, tapped `act(()=>cta.props.onPress())` → `spy 1×` then `2×` (no lock/no confirm), stripped `App.tsx`+`GameOverOverlay.tsx` have no `Alert`/`confirm(`/`Dialog` (pin `app.restart.test.ts:112-116`), CTA stays `pointerEvents:auto` hittable during 280ms fade (`UX-DR-25`, pin `:134` hasStyle pointerEvents auto + `:135` never `none`), handling is instant same-lane (no `navigation`/`setTimeout`) | `[P0] AC1/AC3 CTA one tap…` (`app.restart.test.ts:94`, `76 asserts` combo) + `[P0] AC1/AC2 handleRestart…` `:138` + `gameOverOverlay.test.ts:266` mount sync CTA hittable | **No** |
| **AC2** — And restart resets store and creates new match — no navigation, zero loading screens (architecture, NFR-3) | FULL — `handleRestart` slice `App.tsx:103-110` pinned order `newGame(rngRef.current)→setGame(s)→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats(s.board))→busyRef=false` with dep `[persistedBest]` only, handles no `navigation`/`navigate(`/`setTimeout`/`setInterval`/`Alert`/`confirm(`/`Dialog` (`:172-178`), `availablePot` once after `if(!ready)` (`:190-194` count `===1`), `reducedMotion={false}` literal (`:195`), runtime 9 tiles `newGame(mulberry32(20260808))` 9 non-null + `pendingSpawn` pre-resolved + `initialScore`/`initialStats` 0/best/ceiling + `busyRef` double-release (`:232-234`), no loader (screen-state machine `game-architecture.md:339`) | `[P0] AC1/AC2 handleRestart…` (`app.restart.test.ts:138`, `order[6]` regex + dep + `!setTimeout`/`!navigation` + monetization wall `203-208` + availability + busyRef) | **No** |
| **AC3** — And restart is one tap from overlay — no confirmation dialog | FULL — same as AC1 plus explicit `Dialog` must only be `accessibilityViewIsModal` not confirmation Dialog (`:116`): `Overlay Dialog string if present must only be accessibilityViewIsModal`, CTA `1×` asserted at `:130` with message `no confirmation dialog intercepts`, second tap `2×` proves no single-use lock; overlay has no `disabled` guard (informational, albeit tautological I-1). | `[P0] AC1/AC3 CTA one tap…` (`:94`) second half | **No** |
| **AC4** — And new match starts with 9-tile setup and same lane rules as finished match (FR-26) | FULL — deterministic `newGame(mulberry32(20260808))` 9 tiles twice on same stream (`app.restart.test.ts:249-255` `occA===9 && occB===9`), pendingSpawn pre-resolved 20-draw budget, `initialStats(a.board).maxTile===ceilingDetector(a.board)` (`:261`), shared `availablePot` fan-out `clean: previewFor(game.pendingSpawn,availablePot)` + `accelerated: previewFor(...,availablePot)` regex at `:269-270`, lane-switch absence pin `:277` `!/LaneProfile\|laneId\|setLane/` vs `handleRestart` slice, N3 preview `availablePot=potForTier(tierForCeiling(ceilingDetector(board)))` once | `[P0] AC4 9-tile same lane` (`:237`, runtime + structural fan-out) + `[P0] AC1/AC2` 9-tile pins | **No** |
| **AC5** — And in Accelerated lane, discreet Continue beneath primary when continue remains (D-010 FR-18); in Clean, no offer appears (FR-12) | FULL (Clean guard) — stripped `GameOverOverlay.tsx` has no `Continuar`/`onContinue`/`rewardedAd`/`react-native-purchases`/`IAP` (`:344-348`), source comment `// AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here` at `GameOverOverlay.tsx:94` pinned at `app.restart.test.ts:341`, rendered exactly one `Pressable button "Jogar de novo"` (`:362` `1` + `:364` `allButtons.length===1` no second `Continue`), CTA `width: HIT_TARGET`+`height: HIT_TARGET`+`alignSelf:center`+`#E8A33D`/`#1C1206` + inner `Animated.View width:100% maxWidth:420 alignSelf:center` (`:368-375`), `reducedMotion={false}` + `insets` required (`:377-380`). Accelerated path belongs to `S3.3`/`S4.2` not shipped — pin guards scope creep. | `[P1] AC5 Clean only primary CTA` (`app.restart.test.ts:326`, 22 asserts, forward-compat) + carry `[P0] AC5 no celebration` `gameOverOverlay.test.ts:392` (`Continuar` count 0) | **No** |
| **AC6** — And tapping "Jogar de novo" while continue remains starts new match immediately and unused continue is forfeited — budget dies with game-over (ADR-02) | FULL (vacuous forward-compat) — `GameOverOverlay` no second CTA `Continuar` (`app.restart.test.ts:298-303` `0` + `1 Jogar de novo`), no `onContinue`/`continueRemaining`/`continueBudget` in stripped overlay (`:305-307`), `handleRestart` slice contains `forfeited continue dies` comment (`:311-312` T1 comment pin) + stripped `handleSlice` has no `\bcontinueBudget\b`/`\bcontinueRemaining\b` (`:315-317`), no `rewardedAd`/`IAP` (`:323`), after restart re-mount `0 Continuar` still (`:321-322`). Runtime forfeiture impossible in single-lane — pin prevents carry. | `[P0] AC6/AC7 forfeited…` (`app.restart.test.ts:280`, first half) | **No** |
| **AC7** — And forfeited continue never carried into next match and never re-offered | FULL — same as AC6 plus vacuous today but explicit never-reoffered: second render after restart `gameOver=true` still `0 Continuar` (`:322`), `handleStripped` (comment-blanked) has no `continueBudget`/`continueRemaining` carry, and overlay stripped has no `onContinue`. Future Accelerated `S3.3`/`S4.2` must keep this pin green (contract: per-match budgets memory-only die with match `game-architecture.md:338,382,509-510` ADR-02). | `[P0] AC6/AC7 …` (`:280` second half never-reoffered forward-compat) | **No** |

### Critical Gaps

| Gap | Risk | Impact | Priority to Fix |
| --- | --- | --- | --- |
| ~~No one-tap CTA / confirmation dialog present~~ | P0 | Violates FR-26/UJ-5 frictionless loop | **CLOSED — AC1/AC3** (`Alert`/`confirm(`/`Dialog` absent + CTA `onPress` 1×+2×) |
| ~~Store not reset / navigation loader~~ | P0 | Violates NFR-3 screen-state machine | **CLOSED — AC1/AC2** (body order + dep + `!navigation`/`!setTimeout` + runtime 9-tile) |
| ~~Not 9 tiles / lane-switched~~ | P0 | Violates FR-26 9-tile setup same lane | **CLOSED — AC4** (2×9 stream + `availablePot` fan-out) |
| ~~Continue offer in Clean / celebration~~ | P0 | Violates FR-12/D-013 scope (Clean only) | **CLOSED — AC5** (single CTA + no `Continuar`/reward + `HIT_TARGET`+`alignSelf`+`width:100%`) |
| ~~Forfeited continue carried / re-offered~~ | P0 | Violates ADR-02 per-match budgets die with match | **CLOSED — AC6/AC7** (comment pin + no `continueBudget` carry + single CTA re-mount) |
| Lane-scoped best separation regression | P0 | Score integrity FR-14/P3 | **CLOSED** carry 6.1 (`sessionStartBestRef` + `isNewRecord` + `hydrationOkRef`, `settingsStore` purity) |
| ~~Tautological disabled assert `|| true` (I-1)~~ | Low | Hides future `disabled` leak | **CORRIGIDO ✓ — I-1** (`app.restart.test.ts:114` sem `|| true`) |
| ~~Vacuous setTimeout branch (I-2)~~ | Low | Confusing intent but covered by `:176` | **CORRIGIDO ✓ — I-2** (`app.restart.test.ts:168-172` uniforme) |
| ~~Stale scaffold header `(448/5 skipped)` (I-3)~~ | Low | `ℹ` ledger drift | **CORRIGIDO ✓ — I-3** (`app.restart.test.ts:6-13`) |
| ~~Helper copy drift + dead `hasStyleInSource` (I-4)~~ | Low | Maintenance friction | **CORRIGIDO ✓ — I-4** (morto removido `83-86`) |

**No P0/P1 open gaps. 6.3 explicitly owns 7 Clean-lane ACs (4 instant + 1 guard + 2 forward-compat) e fecha todos. I-1..I-4 corrigidos — 0 débito remanescente.**

### Coverage by Priority

```
P0 Coverage: 100% ██████████  (4 Clean instant + 1 forfeited-continue, all P0 pins, 0 P0 gaps)
P1 Coverage: 100% ██████████  (AC5 Clean-only P1 guard + lane-scoped best + insets fallback; 0 P1 gaps)
P2 Coverage: 88%  ████████░░  (thin-view chrome exhaustive, HUD/preview fan-out, not crit path)
P3 Coverage: 85%  ████████░░  (interrupt cleanup already 6.2, 6.3 needs no new P3 — hygiene I-1..I-4 only)
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect | Status | Notes |
| --- | --- | --- |
| Tests in CI | ✅ | `.github/workflows/ci.yml` — `engine-test-and-benchmark` job on PR + push `main`, `working-directory: triade` |
| Steps | ✅ | `setup-node 26` + `npm ci` + `npx tsc --noEmit` (default gate) + `node --import tsx --test` (full 453 active + 4 benches) + coverage informational (`--experimental-test-coverage --test-coverage-include='src/engine/**' --test-coverage-include='src/game/**' --test-coverage-include='src/render/**' --test-coverage-include='src/services/**' --test-coverage-include='src/ui/**'`) |
| Results visible | ✅ | GitHub Actions checks, branch protection capable; coverage `continue-on-error: informational — never gates` intentional |
| Failures block | ✅ | `tsc --noEmit` and `node --test` are non-optional gates; would block PR merge |
| Nightly runs | — | Not required at this scale (single pipeline on push/PR, ~3312 ms, cheap) — deferred |
| Performance tests | ✅ | 4 benches (`engine.bench: <0.1ms per turn` 56ms, `frame-logic tail p99 <0.2ms` 37ms, `transition-plan <0.05ms median/0.1ms p99` 132ms, `storage round-trip <0.1ms` 26ms) run inside same `node --test` gate — green this review |
| Gate evidence | ✅ | `npm test` 453/0/0 verified live here (twice), `npx tsc --noEmit` clean (default + `tsconfig.test.json` only `TS5101 baseUrl` waiver pending 7-1), 453 discovered all green when scaffolds activated (now 0 skipped) |

### Test Infrastructure Quality

| Component | Quality | Notes |
| --- | --- | --- |
| Fixtures | **Good** | `test-utils/helpers.ts` — `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`stripCommentsAndStrings`/`extractNamedImports`/`sigmaBound`/`runSeededSession`/`mulberry32`/`GRID_SIZE` shared, length-preserving cleaner with template `${}` introspection (`helpers.ts:220-299`), not leaking `//` URLs. 6.3 reuses `boardWith` literals + `mulberry32(20260808)` deterministic stream + `ceilingDetector`/`potForTier`/`tierForCeiling` pure derivation. |
| Helpers | **Good** | `hasStyle`/`allText`/`collectStyles`/`baseProps`/`renderOverlay` copied from `hud.test.ts`/`previewCard.test.ts` per `T4` copy-don't-cross-import — isolamento > DRY; I-4 corrigido (`hasStyleInSource` morto removido `app.restart.test.ts:83-86`, nota `copy, don't cross-import` preservada). `app.restart.test.ts:90-377` reusa `rn-stub` host-string filter (`typeof n.type==='string' && n.props?.accessibilityLabel`) para tratar stub duplicado composite+host. |
| Data factories | **Good** | No `@faker`; determinismo via `mulberry32(20260808)` + `rngOf(0)` + `spyRng` scripted draws; `rn-stub.ts` (`View`/`Text`/`Pressable`/`Animated.Value`/`timing`/`parallel`/`Easing.cubic`/`out`/`stopAnimation`) minimal RN surface para `tsc --noEmit` + rendered `Animated.Value._value` checks. |
| Documentation | **Good** | Cada `test()` carrega `[P0/P1] AC{n}` + invariante + `// Given/When/Then` (`app.restart.test.ts:91-94` etc.); `6-3-restart-1-tap.md:35-102` mapeia `FR→AC→Tasks→Tests` com token table + `T1` `should/must NOT` matrix; `automation-summary-6-3.md` Traces `FR AC → file → names` em `triade/App.tsx:103-110` / `triade/src/ui/GameOverOverlay.tsx:94-102`. Header agora correto `ATDD RED→GREEN verified` (I-3 corrigido). |
| Framework | **Good** | `node:test` + `tsx` + `TSX_TSCONFIG_PATH=tsconfig.test.json` — host-testable (no DOM), ESM `*.ts` extensions, `strict:true`, `node:assert`. Matches engine purity (`engine.purity.test.ts` green) + `react-test-renderer` for RN chrome (`react-test-renderer is deprecated` + `act(...)` warnings are React 19 framework-level, not 6.3 debt). `bench` tag included via same runner `--test`. |

### Maintenance Burden

- Test update frequency: **Low** — restart is leaf orchestrator + thin overlay (`App.tsx:103-110` `handleRestart` + `GameOverOverlay.tsx:94-102` CTA). Display edits (scrim `rgba`/`HIT_TARGET`/`#E8A33D`) isolated; any edit must keep 5 restart + 18 overlay + 5 wiring pins green — correct friction (high-value guard, same as 6.2 N3).
- Brittleness score: **Low** — no hard-coded sleeps, no `Date.now`, no DOM selectors, no wall-clock `Animated` timing for restart (instant NFR-3). `handleRestart` pinned via `stripCommentsAndStrings` + literal `order` regex, not rendered timing; `availablePot` once via escaped `availablePot\s*=\s*potForTier.*ceilingDetector\(game\.board\)` literal, not wall-clock. Only tautology I-1/I-2 could mask a breach — fix removes.
- Developer friction: **Very Low** — ~14 ms isolated 5-restart surface, ~260 ms full 6.3 surface, ~3312 ms full suite, `npm test` one command, no emulator, no flaky retries. Diagnostics are lawsuit-style (`must contain "forfeited continue dies"` / `must not contain Alert` / `must be called exactly once per press` / `must pin FADE_MS 280` / `must have width: HIT_TARGET directly`).

---

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| **I-1 Corrigido ✓**: `app.restart.test.ts:114` tautology — `|| true` removido → `assert.ok(!/\bdisabled\b/.test(overlayStripped), 'must not use disabled')` | ~2 min | Low | Dev — **feito 2026-08-27** |
| **I-2 Corrigido ✓**: `app.restart.test.ts:168-172` — `&&false===false` branch removido, loop uniforme + `confirm\(` + `!/setTimeout/` explícitos | ~2 min | Low | Dev — **feito 2026-08-27** |
| **I-3 Corrigido ✓**: Header `app.restart.test.ts:6-13` → `ATDD RED→GREEN verified (448/5 → 453/0)` | ~1 min | Low | Dev — **feito 2026-08-27** |
| **I-4 Corrigido ✓**: `hasStyleInSource:83-86` morto removido (nota `copy don't cross-import`) | ~5 min | Low | Dev — **feito 2026-08-27** |
| **Proceed review→done** — 5 P0/P1 restart + 18 overlay + 5 wiring + matchStats + guards green, `tsc` clean, walls green, I-1..I-4 fechados. | — | — | QA Lead |

### Short-term (This Milestone — optional polish, P3)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| *Nenhum obrigatório* — I-1..I-4 já fechados. Opcional: extrair `test-utils/render-helpers.ts` se cópia `hasStyle`/`allText` virar 5+ arquivos (manter isolamento > DRY) | — | — | — |
| Manter `handleRestart` `// AC6/7` + `GameOverOverlay.tsx:94` `// AC5: Continue…` verbatim até `S3.3`/`S4.2` — não deletar quando Accelerated shippar, só expandir/documentar. | — | Low | Dev |
| Cross-check `app.restart.test.ts:273` implicit same-lane guard vs future `LaneProfile.id` explicit preservation spec (Epic 3) — documentar que restart hoje é implicit same-lane, não lane flip | ~5 min doc | Low | QA |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| --- | --- | --- | --- |
| Keep `app.restart.test.ts` 5 active + `gameOverOverlay.test.ts` 18 + `app.gameOverWiring.test.ts` 5 + `matchStats.test.ts` 10 as single source of truth for FR-26 frictionless loop; any `App.tsx` wiring / `GameOverOverlay` display change must keep 38 pins green and be flagged in `deferred-work.md` | ongoing | High | FR-26/NFR-3/UJ-5 are law — treat red as blocking |
| Preserve `handleRestart` instant same-lane contract (no navigation, no `setTimeout`, no `Alert`/`Dialog`, dep `[persistedBest]` only, `busyRef=false` Df5, `availablePot` once after `if(!ready)`, `reducedMotion={false}` until 9-4) | ongoing | High | Screen-state machine `game-architecture.md:339` — restart = reset store |
| Keep `GameOverOverlay` single CTA `width/height:HIT_TARGET alignSelf:center #E8A33D/#1C1206` + `pointerEvents:auto` hittable through fade + scrim `rgba(12,14,17,0.7)` + inner `width:100% maxWidth:420 alignSelf:center` + `// TODO 5.4` waivers | ongoing | High | Clean-only until Epic 3/4 |
| Preserve monetization wall: no `react-native-purchases`/`react-native-google-mobile-ads`/`expo-haptics`/`expo-audio`/`expo-secure-store` beyond `settingsStore` until Epic 4 (`ui.norolls` scanner enforces) | ongoing | High | ADR-02 memory-only budgets die with match |
| When Epic 3 undo + `LaneProfile` land (3-5), re-evaluate `handleRestart` same-lane implicit → explicit `LaneProfile.id` preservation and `longestStreak` per `game-architecture.md:776-777` master rule (undo-owned future) | epic | High | Decision 3-5, not 6.3 |
| Track `-p tsconfig.test.json` `TS5101 baseUrl` waiver (`deferred-work.md:122-124`) — default `tsc --noEmit` gates CI, test-config informational | weeks | Medium | Do not silence fix inside Epic 6 |

---

## Appendices

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --- | --- | --- | --- |
| *none* | — | — | — |

All 5 restart pins are deterministic (fixed `mulberry32(20260808)` stream 2×9, fixed `boardWith` boards, `stripCommentsAndStrings` source scan with template `${}` introspection, `act()` sync, `rn-stub` `Animated.timing` `start(cb=>cb({finished:true}))` sync, no `setTimeout`/`Task.Delay`, no shared state). Flake would require non-determinism in `newGame`/`ceilingDetector`/`tierForCeiling`/`potForTier` itself — pure functions pinned via `boardWith`/`emptyBoard` literals + `spyRng` 20-draw budget. No flake observed across three full runs (453/0 stable).

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --- | --- | --- | --- |
| `benchmark: transition-plan cost per move` (render) | ~132 ms | bench | Keep — frame budget headroom gate, out-of-scope 6.3 |
| `benchmark: engine cost per turn` (engine) | ~56 ms | bench | Keep |
| `benchmark: frame-logic tail p99` (render) | ~37 ms | bench | Keep |
| `benchmark: settings serializeSettings->loadSettings round-trip` (storage) | ~26 ms | bench | Keep |
| `e2e: waitFor async assertion times out …` (e2e) | ~52 ms | e2e fixture `waitFor` timeout | Keep — expected failure path |
| `[P0] AC1/AC3 CTA one tap…` (component, restart) | ~6 ms (first `react-test-renderer` mount + source read+strip) | component | Keep — not slow |
| `[P0] AC1/AC2 handleRestart resets…` (component, restart) | ~4 ms (800-char slice + strip + `newGame` loop) | component | Keep |
| `*nada 6.3 acima de 30 s*` | — | — | — |

**Threshold applied**: `unit <5 s`, `integration <30 s`, `individual >30 s` = slow. Slowest 6.3 pure ~6 ms, slowest full suite bench ~132 ms — all well inside. Full suite ~3312 ms vs 3269 ms at 6.2 — delta is 5 pins, not slow.

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --- | --- | --- | --- |
| *nenhum* | — | `grep -rn "test.skip\|test.todo\|it.skip\|describe.skip" triade/__tests__` → **0** project; `app.restart.test.ts:12` agora só texto histórico `ATDD RED→GREEN verified` (não é `test.skip` real) · `1 it.skip` só em `triade/node_modules/` not-project | — |

**Posterior 6.3 (pós-correção): 0 skipped** — 5 RED `test.skip` scaffolds ATDD agora ativos green (`app.restart.test.ts:90,134,233,276,322` todos `test()` não `test.skip`), `npm test` `ℹ skipped 0` + `3072 ms` pós-correção (`automation-summary-6-3.md:5` `453 pass / 0 fail / 0 skipped`).

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| --- | --- | --- | --- |
| **I-1 (new, corrigido ✓)** | `app.restart.test.ts:114` `|| true` tautologia — removido, agora `assert.ok(!/\bdisabled\b/.test(overlayStripped))` guarda `disabled` | ~2 min | **Fechado ✓** |
| **I-2 (new, corrigido ✓)** | `app.restart.test.ts:168-172` `setTimeout` vacuously guarded — removido `&&false===false`, loop uniforme + `!/confirm\(/` + `!/setTimeout/` | ~2 min | **Fechado ✓** |
| **I-3 (new, corrigido ✓)** | `app.restart.test.ts:6-13` header stale `448/5 skipped` vs `453/0` — atualizado para `ATDD RED→GREEN verified (448/5 → 453/0)` | ~1 min | **Fechado ✓** |
| **I-4 (new, corrigido ✓)** | `hasStyleInSource` morto `app.restart.test.ts:83-86` — removido, nota `copy don't cross-import per T4` mantida | ~5 min | **Fechado ✓** |
| O-1..O-5 (6.2, **corrigidos**) | `gameOverOverlay.softFade.test.ts` deleted, name renamed `supersedes 6.1`, `alignSelf` removed, deps narrowed `[reducedMotion]`, unmount runtime pin added — verified 448→453 | done | **Fechado ✓** |
| O-2..O-4 (6.1 carry, **corrigidos**) | `App` wiring `isGameOver+handleRestart+busyRef+applyMoveStats+availablePot` + `ui.thinview` allowlist + `insets→SAFE_MARGIN` | done | **Fechado ✓** |
| `deferred-work.md:122-124` TS5101 + 4 low defers (ULP 0.6 `preview.ts:80`, fallback beyond ladder 192>96, mutable `slice()` no freeze, board shallow ref) + Df5 `busyRef` deadlock (cleared) + Df1-4 gate/timer/tilesRef/orientation | Pre-existing, not 6.3; `-p tsconfig.test.json` now only `TS5101 baseUrl` waiver | weeks | Carry |
| EPIC-6 6.4 backlog | Record highlight number `6.4` D-013 `valueRecord #E8A33D` (already from 6.1, 6.2/6.3 keep it) — pure-additive | story | In scope (CC single-lane-first) |
| EPIC-3 tension `game-architecture.md:776-777` | `longestStreak` future undo-owned vs per-match cumulative today — deferred for Clean-lane 1-tap restart | epic | Carry to 3-5 |

---

## Next Review

**Scheduled**: após Epic 6 `6.4` new-record highlight ou ao primeiro edit em `triade/App.tsx handleRestart:103-110` / `triade/src/ui/GameOverOverlay.tsx:94-102` / `triade/src/game/matchStats.ts`, o que vier primeiro
**Focus Areas**: (1) I-1..I-4 já corrigidos — confirmar 453/0 + `hasStyleInSource` 0 + header `ATDD RED→GREEN verified` permanecem; (2) verificar 38 `restart+overlay+wiring+stats` + guards (`ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring`/`app.gameOverWiring`) verdes após qualquer `ceilingDetector`/`FADE_MS`/`HIT_TARGET` evolução; (3) verificar 6.4 não adiciona `Continue` celebration regredindo `AC5 no celebration` D-013 + `AC5 Clean only` single CTA, e `App.tsx` `reducedMotion={false}` até 9-4
**Success Criteria**: `npm test` **453 pass / 0 skipped / 0 todo** (pós-6.3 baseline) com 5 `app.restart` + 18 `gameOverOverlay` + 5 `app.gameOverWiring` + 10 `matchStats` verdes, `npx tsc --noEmit` clean, 6.3 7 ACs verdes, guards green, `git diff --stat -- triade/src/engine` empty + `preview.ts` + `matchStats.ts` + `render` + `services` empty — **0 P0/P1 open, I-1..I-4 corrigidos ✓**

---

**Validation checklist**: prerequisites ✔ (suite exists `453 pass / 0 skipped` active (I-3 corrigido `ATDD RED→GREEN verified`), results live-accessed 4× `3312`+`3072` pós-correção+isolado `14`+`242` ms, feature list known via `epics.md:766-784` 7 AC + `6-3-restart-1-tap.md:35-102` `T1` should/must NOT matrix, CI accessed `.github/workflows/ci.yml`, `rn-stub`+`helpers:220-299` accessed) · metrics ✔ (counts by type 453 breakdown, pass 100%, avg ~7.3 ms, flaky 0, slow 0>30s, disabled 0 with evidence) · quality ✔ (determinismo/isolamento/speed/readability/maintained/valuable per rubric + I-1..I-4 corrigidos ✓, anti-patterns 12 rows, zero high/medium) · coverage ✔ (7 ACs mapped exhaustive 3×P0 instant +1×P0 forfeited +1×P1 Clean, P0/P1 100%, 0 open P0/P1 gaps) · infrastructure ✔ (CI visible/blocking, fixtures/helpers/benchmarks, maintenance low) · recommendations ✔ (prioritized I-1..I-4 corrigidos + ongoing + owner) · report ✔ (exec, metrics, quality, coverage, infra, appendices, next review)

*Generated by gds-test-review — evidence-backed, verified live 2026-08-27 (triade/, node v26.0.0, `npm test` active 453/0/0 pós-correção + `npx tsc --noEmit` clean, `git diff --stat -- triade/src/engine` empty).*

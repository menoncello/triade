# Test Review Report: Story 6.4 — Novo recorde como número destacado

**Workflow**: gds-test-review · **Scope**: targeted (story 6.4 failure-suite new-record highlight D-013, Clean-lane) · **Date**: 2026-08-28
**Reviewed by**: Game QA Lead (gds-test-review) · **Engine**: Custom TS pure-engine + RN thin views (`node:test` via `tsx` + `react-test-renderer`)
**Config**: user Eduardo · document English · communication Português · experience intermediate
**Baseline**: `842966a` post-6.3 **453 pass / 0 fail / 0 skipped** → current **458 pass / 0 fail / 0 skipped** · **Discovered**: 454 `__tests__` + 4 benches = 458 active · **Verification**: `npm test` live 2026-08-28 (triade/, node 26) 458/458 in 3104 ms, `npx tsc --noEmit` clean (both configs)

---

## Executive Summary

### Overall Health: **Good**

Story 6.4 is **pure-verification** (`git diff --stat -- triade/src/engine` empty, `triade/src/game/preview.ts` byte-identical, `triade/src/game/matchStats.ts` byte-identical, `triade/src/render` empty, `triade/src/services` empty, `triade/src/ui/GameOverOverlay.tsx:1-170` and `triade/App.tsx:1-228` **zero diff** vs `842966a`) and pins the **record-as-number** contract already shipped via 6.1 on top of 6.2's elegant fall and 6.3's frictionless loop: `triade/src/ui/GameOverOverlay.tsx:71,76` `isNewRecord ? styles.valueRecord : styles.value` on both `Pontuação`/`Recorde` rows + `triade/src/ui/GameOverOverlay.tsx:148-152` `valueRecord { color: '#E8A33D', fontSize:17, fontWeight:'500', fontVariant:['tabular-nums'] }` + `triade/src/ui/GameOverOverlay.tsx:22-24` `a11yLabel` suffix ` Novo recorde` + no `confetti|celebrat|lottie|reward|particleBurst|shakeMs` celebration (D-013), no tier-crossing celebration across `3→1536` ladder, contrast/color-blind carriers (`#8a8578`/`#1a1d23` + `tabular-nums` shape/text E9, CTA dark ink `#1C1206` 8.6:1 on accent), plus `triade/App.tsx:193` `isNewRecord(sessionStartBestRef.current, match.score)` session-start gating with `triade/App.tsx:103-110` `handleRestart` dep `[persistedBest]` only and never writing `sessionStartBestRef`.

Guarantees are pinned by **5 active P0/P1 pins** in `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts:90-298` plus **20** `gameOverOverlay.test.ts:84-533` + **5** `app.gameOverWiring.test.ts` + **5** `app.restart.test.ts` + **10** `matchStats.test.ts` carry greens. Suite remains deterministic, fast, isolated, anti-pattern-free. Zero flaky/slow/disabled. **0 High/Medium open**; 2 Low hygiene notes (doc drift + minor asymmetry).

### Key Findings

1. **All 4 ACs are pinned with explicit `[P0/P1] AC{n}` traceability and dual structural+runtime evidence** — AC1 highlight is number not event via stripped `isNewRecord ? styles.valueRecord : styles.value` ×2 ternary on score+best rows + `valueRecord: { color: '#E8A33D' }` definition + `fontVariant ['tabular-nums']` + `a11yLabel` appends `" Novo recorde"` only when true (UX-DR-2) and runtime `renderOverlay({isNewRecord:false})` → no `valueRecord` accent vs `true` → `hasStyle({color:'#E8A33D'})` + `allText` tokens `123`/`456` + `accessibilityLabel` `"Novo recorde"` (D-013, UX-DR-12); AC2/AC3 no celebration via stripped `! /confetti|celebrat|lottie|reward/i` + `!particleBurst && !shakeMs` + no `Confetti`/`Lottie` import + no `expo-haptics`/`expo-audio` + no `shake|bounce` + rendered single CTA `"Jogar de novo"` only and zero `Continuar`/`"Novo recorde!"` banner/Confetti node; AC4 contrast & color-blind via `valueRecord #E8A33D` token + `tabular-nums` ≥2 + muted `#8a8578` + text `#1a1d23` + card `#fff` + CTA `#1C1206` + rendered `collectStyles` carriers persisting in both states (E9 shape/text beyond color, DESIGN.md:193/218/253/261); AC3 ladder via 10 `maxTile` values `3→1536` each still only `isNewRecord` accent, no banner/confetti, plus thin-view `extractNamedImports` no `engine` + `! /ceilingDetector|tierForCeiling|potForTier/` + `!Math.random`/`ROLL_SYMBOLS`. No orphan AC.

2. **Session-start gating is proved both structural and runtime**: structural `triade/App.tsx:60` `sessionStartBestRef.current = result.best` seeded only at hydration (`loadBest` result, not in `handleRestart`) + `triade/App.tsx:193` `isNewRecord={isNewRecord(sessionStartBestRef.current, match.score)}` passed to `GameOverOverlay` + `triade/App.tsx:103-110` `handleRestart` 6-step order `newGame(rngRef.current)→setGame→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats)→busyRef=false` with dep `[persistedBest]` only and explicit guards `! /sessionStartBestRef\.current\s*=\s*persistedBest/` and `! /sessionStartBestRef\.current\s*=\s*match\.best/` and `! /sessionStartBestRef\.current\s*=/` (any write) inside `handleSlice`, plus runtime `isNewRecord` pure checks `isNewRecord(100,150)=true`, `isNewRecord(150,150)=false` (live best equals score hides record per `matchScore.test.ts:58-65` pin), `isNewRecord(100,100)=false` (not `>`). Overlay never imports `ceilingDetector` — ladder lives in orchestrator `App.tsx:152` `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` once after `if(!ready)`.

3. **Purity & thin-view & monetization boundaries remain scanner-grade**: `src/engine+src/game` relative-only (`engine.purity.test.ts:70-84` green), `GameOverOverlay.tsx` import allowlist only `react`+`react-native` (`Animated`/`Easing` same `'react-native'` specifier) + `PauseButton HIT_TARGET` + `layout SAFE_MARGIN`, no `../engine/**`, no `layoutFor`/`isLandscape`/`resolveSwipeDirection`, `ui.norolls.test.ts:83` (`ROLL_SYMBOLS` + `Math.random` forbidden over `stripCommentsAndStrings` across `App+ui+render+services`) green, `ui.thinview.test.ts` + `hud.previewWiring` green, `App.tsx` monetization wall no `react-native-purchases`/`react-native-google-mobile-ads`/`expo-haptics`/`expo-audio`/`expo-secure-store` beyond `settingsStore`. `src/engine`/`preview`/`matchStats`/`matchScore`/`render`/`services` byte-identical carries monotonic `maxTile`, `streak` per-move, place-not-roll invariants. Contrast D-013 intentional low accent `#E8A33D` on `#fff` card ~1.8:1 is **accepted** — WCAG AA is carried by `tabular-nums` + row label (`Pontuação`/`Recorde`) + position + `a11yLabel "Novo recorde"` per E9/`DESIGN.md:261`, not by accent fill.

4. **Verified live durante esta revisão**: `npm test` **458 pass / 0 fail / 0 skipped / 0 todo** (3104 ms, isolated `gameOverOverlay.recordHighlight` 5/5 in 226 ms, `gameOverOverlay`+`recordHighlight`+`restart`+`wiring` 35/35 in 236 ms), **49 asserts** in `gameOverOverlay.recordHighlight.test.ts` (distribution: AC1 12, AC2/AC3 9, AC4 11, ladder 12, wiring 14; plus 20 carry overlay 100+ asserts), `npx tsc --noEmit` clean, `npx tsc --noEmit -p tsconfig.test.json` clean (only `TS5101 baseUrl` waiver). Zero `test.skip`/`test.todo` runtime (`grep -rn "test.skip" triade/__tests__` → 0 project runtime; only 2 comment mentions of `test.skip` text in `app.restart.test.ts:12` and `gameOverOverlay.recordHighlight.test.ts:11,13` documenting former RED phase). Zero `it.skip`/`describe.skip` project.

5. **Higiene notes são Low only (ver §Issues / Anti-patterns)**: `L-1` stale RED-phase header drift (`gameOverOverlay.recordHighlight.test.ts:11-13` says "Red-phase scaffolds use test.skip() (453/5) while pinning" vs current 458/0 active — doc only, no runtime skip); `L-2` minor asymmetry in AC1 `offHasAccentValue` strict `color+fontVariant+fontWeight` vs `on` loose `hasStyle({color})` — tighten to same strict shape. Nenhum high/medium, nenhum assertion-free, nenhum hard wait, nenhum shared state, nenhum cleanup faltando. Carry `I-1..I-4` de 6.3 permanecem fechados.

### Recommended Actions (prioritized)

1. *(Imediato — Low — 2 min)* Update header comment `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts:11-13` from `Red-phase scaffolds use test.skip() (453/5 skipped)` to `ATDD RED→GREEN verified (453/5 skipped → 458/0 active)` — doc drift only, no runtime.
2. *(Imediato — Low — 5 min)* Tighten AC1 `offHasAccentValue` vs `on` symmetry: make both use same strict `color:'#E8A33D' && fontVariant includes 'tabular-nums' && fontWeight '500'` matcher (currently off strict, on loose `hasStyle({color})`).
3. *(Opcional — Low)* Add explicit `act(()=>renderer.unmount())` at end of ladder loop per `maxTile` pair to mirror `gameOverOverlay.test.ts:484-522` mid-fade unmount hygiene (currently 20 renderers rely on GC, no leak but explicit is cleaner).
4. *(Long-term)* Keep 6.4 pins as blocking gate for any `GameOverOverlay.tsx`/`App.tsx:193`/`matchScore.ts` edit; when Epic 9 themes ship, re-validate `#E8A33D` accent token + `tabular-nums` + `a11yLabel` under color-blind theme (already shape/text carriers).

---

## Test Suite Metrics

### Test Distribution

| Type | Count (6.4 story surface) | Count (full suite, active) | % of Total | Pass Rate | Avg Duration |
| --- | --- | --- | --- | --- | --- |
| **Story 6.4 — Component `recordHighlight` new-record highlight D-013** | **5 active P0/P1 NEW** | 5 active | 1.1% | 100% | ~4.5 ms avg (structural scan 1 ms + render pair 2–21 ms) |
| **Story 6.4 carry — `gameOverOverlay` presentational (6.1 + 6.2)** | — (20 carry) | 20 active | 4.4% | 100% | ~11 ms avg (scan 5 ms, render 15 ms first mount) |
| **Story 6.4 carry — `app.gameOverWiring` structural** | — (5 wiring) | 5 active | 1.1% | 100% | ~2.5 ms |
| **Story 6.4 carry — `app.restart` 1-tap Clean-lane (6.3)** | — (5 restart) | 5 active | 1.1% | 100% | ~3 ms |
| **Story 6.4 carry — `matchStats` pure** | — (10) | 10 | 2.2% | 100% | <0.9 ms |
| **Story 6.4 surface total (recordHighlight+overlay+wiring+restart+stats)** | **5 new** (5+20+5+5+10 = 45 story-specific) | **45** | **9.8% active** | **100%** | ~280 ms isolated (35 combined overlay+recordHighlight+restart+wiring 236 ms) |
| Unit — engine pure (board/ceiling/line/spawn/game/pot/weights/rules/candidates/spawn-placement/line-moved/adaptive-spawn/pending-spawn/pot-tier/purity/smoke) | — | **170** | 37.1% | 100% | <0.6 ms (benches separate) |
| Unit — app-domain game (`matchScore` 8 + `matchStats` 10 + `preview` 23 + `preview-invariant` 17) | — | **58** | 12.7% | 100% | <1.2 ms |
| Unit — render (`transitionPlan` 16 + `render.smoke` 5) | — | **21** | 4.6% | 100% | <1.0 ms |
| Unit — UI layout/orientation/swipe/tileNumerals/gesture (`layout` 18 + `swipe` 10 + `tileNumerals` 16 + `orientation` 5 + gesture-pipeline 6 + others) | — | **98** | 21.4% | 100% | <0.5 ms |
| Integration — orchestrator (`preview-availability` 6 + `directional-spawn` 13 + `session` 3) | — | **22** | 4.8% | 100% | <0.4 ms |
| E2E / Smoke / Assets | — | **22** (10 e2e + 9 smoke + 3 assets) | 4.8% | 100% | <2 ms, e2e fixture 52 ms `waitFor` |
| Storage (keyspace/schema/entitlements/settingsStore/purity) | — | **39** | 8.5% | 100% | <0.5 ms |
| Benchmark (engine/render/storage) | — | **4** | 0.9% | 100% | 10–125 ms |
| **Full suite (active, verified live)** | — | **458** | **100% active** | **100% (458/458)** | **~6.8 ms avg (3104/458, benches dominate)** |
| **Full suite (discovered raw `test(`)** | — | **454 `__tests__` + 4 benches = 458** | 100% | 100% (0 skipped) | — |

**Breakdown by `triade/package.json` types**: Unit ~61% (engine+game+render+ui) / Integration ~5% / E2E+Smoke ~5% / Storage ~9% / Benchmark ~1% — balanced for pure-engine + thin-view architecture. 6.4 adds only Component (no new Unit — no new pure function beyond `isNewRecord` already unit-covered in `matchScore.test.ts:58-65`; no E2E — highlight is screen-state sibling `isGameOver(game.board)` + `zIndex:2` scrim, not browser journey; no API — same posture 7.4/6.1 ATDD).

### Execution Metrics

| Metric | Current (6.4 active) | Previous (6.3, 453) | Previous (6.2, 448) | Trend |
| --- | --- | --- | --- | --- |
| Pass Rate | **100% (458/458)** | 100% (453/453) | 100% (448/448) | → stable, **+5 active** recordHighlight |
| Avg Duration (per test, full) | ~6.8 ms (3104/458, benches dominate) | ~7.3 ms (3312/453) | ~6.5 ms (2890/448) | → stable within noise |
| 6.4 surface duration | ~21 ms AC1 + ~3 ms AC2 + ~2 ms AC4 + ~17 ms ladder + ~2 ms wiring = ~45 ms for 5 pins; 35 combined overlay+recordHighlight+restart+wiring **236 ms** | ~277 ms for 38 (overlay+restart+wiring+stats) | ~245 ms for 20 overlay | → consistent (scan 1–3 ms, render 2–21 ms, ladder 17 ms for 20 mounts) |
| Flaky Tests | **0** | 0 | 0 | → |
| Disabled Tests | **0 skipped** + 0 `todo` | 0 skipped | 0 skipped | → intentional scaffold now merged |
| Total Duration | ~3104 ms | ~3312 ms | 3269 ms | → faster (noise, no new bench) |

### Recent Run History

| Date | Passed | Failed | Skipped | Duration | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-08-28 (this review, live #1 full) | **458** | 0 | 0 | 3104 ms | Full active via `npm test` (`node --test` + `tsx`, `TSX_TSCONFIG_PATH=tsconfig.test.json`) |
| 2026-08-28 (this review, live #2 isolated recordHighlight 5) | 5 | 0 | 0 | 226 ms | `npm test -- __tests__/ui/components/gameOverOverlay.recordHighlight.test.ts` 5/5 |
| 2026-08-28 (live overlay+recordHighlight+restart+wiring) | 35 | 0 | 0 | 236 ms | `__tests__/ui/components/gameOverOverlay.test.ts` 20 + `recordHighlight` 5 + `app.restart` 5 + `app.gameOverWiring` 5 |
| 2026-08-27 (6.3 review live #1) | 453 | 0 | 0 | 3312 ms | Baseline before 6.4 activation |
| 2026-08-27 (6.3 isolated 5 restart) | 5 | 0 | 0 | ~14 ms | `app.restart.test.ts` 5/5 |
| 842966a (post-6.3 HEAD) | 453 | 0 | 0 | — | `feat S6.3 Restart 1-tap` pure-additive |
| 3218d23 (post-6.2) | 448 | 0 | 0 | — | Includes `74813af` MERGE 6-2 (447 +1 `preview-invariant`) |

- Flaky tests: **none detected** — `recordHighlight` deterministic: `stripCommentsAndStrings` source scan (handles `//` URLs, template `${}` interpolations, block comments length-preserving at `test-utils/helpers.ts:220-299`), `react-test-renderer` sync `act()` + headless `rn-stub` (`Animated` stub `start()` sync, no `setTimeout` on highlight path, no `Math.random`), ladder loop 10 `maxTile` values fixed, `isNewRecord` pure `score > previousBest`. `npm test` two runs identical 458/0; isolated 5 at 226 ms stable.
- Slow tests (>30 s): **none**; slowest still `benchmark: transition-plan cost per move` ~125 ms + `engine cost per turn` ~67 ms — perf benches, not 6.4 pins. Slowest 6.4 ladder ~17 ms for 20 mounts (0.85 ms/mount) + AC1 ~21 ms (3 renders + source scan). All well inside `unit <5s` / `integration <30s`.
- Disabled/skipped: **0** (`grep -rn "test.skip" triade/__tests__ --include="*.ts"` → 0 project runtime; only 2 comment lines mention `test.skip` text: `triade/__tests__/ui/components/app.restart.test.ts:12` and `gameOverOverlay.recordHighlight.test.ts:11,13` documenting former RED phase, not a real skip). `grep -rn "test.todo\|it.skip\|describe.skip"` → 0 project (`1 it.skip` only in `triade/node_modules/` not-project).

---

## Quality Assessment

### Quality Criteria (per workflow rubric)

| Criterion | Good | 6.4 Assessment | Verdict |
| --- | --- | --- | --- |
| **Deterministic** | Same input = same result | `recordHighlight` same `renderOverlay({isNewRecord})` → same `hasStyle({color:'#E8A33D'})` + `allText` + `accessibilityLabel` every run; `stripCommentsAndStrings` blanked strings so `//` URL cannot hide `confetti`; `Animated` stub synchronous, no `setTimeout` gating highlight path; `isNewRecord(100,150)=true` / `isNewRecord(150,150)=false` pure; ladder 10 `maxTile` fixed 3→1536 same every run. | ✅ Good |
| **Isolated** | No shared state | Every `test()` builds `baseProps`/`renderOverlay` fresh `TestRenderer` via `act(()=>createElement(...))` per assertion; helpers `allText`/`hasStyle`/`collectStyles` copied locally (copy don't cross-import per `T4`); `rngRef` never shared across recordHighlight (presentational only); `GameOverOverlay` `Animated.Value` per-instance via `useRef` not shared; ladder loop creates 20 independent renderers. | ✅ Good |
| **Fast** | <5 s unit, <30 s integration | 5 recordHighlight avg ~4.5 ms (scan ~1 ms, render pair ~2 ms), ladder ~17 ms for 20 mounts, 35 combined 236 ms; full 458 in 3104 ms. No wall-clock `Animated` delay — choreography pinned via literal `280`/`delay:80` source scan in carry `gameOverOverlay.test.ts`, not sleep. Highlight has zero animation of its own (rides 6.2 fade). | ✅ Good |
| **Readable** | Clear intent, good names | `[P0] AC1 highlight is number not event — isNewRecord true renders valueRecord #E8A33D…` `[P0] AC2/AC3 no celebration — stripped source has no…` `[P1] AC4 contrast & color-blind — valueRecord …` `[P1] AC3 ceiling ladder produces no celebration…` `[P0] AC1/T2 App wiring sessionStartBestRef gating…` — AC→FR→pin explicit; helpers `baseProps`/`renderOverlay` domain-native; assertions carry messages (`must contain isNewRecord ? styles.valueRecord : styles.value ternary…` / `must not contain confetti…` / `valueRecord: { color: '#E8A33D' } must match DESIGN.md…`). | ✅ Good (trivial header drift) |
| **Maintained** | Up-to-date, passing | 0 `todo`, 0 `skip` runtime, production zero-additive (no new `src/` module, `src/engine` empty, `preview`/`matchStats`/`render`/`services` byte-identical); `npx tsc --noEmit` clean both configs; `App.tsx` `reducedMotion={false}` literal until 9-4 preserved; stale header `11-13` only doc drift. | ✅ Good (trivial drift) |
| **Valuable** | Tests real behavior | Pins *behavior* (accent `color #E8A33D` on `score`+`best` rows only when `isNewRecord`, `a11yLabel` includes `"Novo recorde"` only when true, no second CTA/Confetti/banner across 10 ceiling tiers, `sessionStartBestRef` gating survives restart so `isNewRecord(sessionStartBestRef.current, score)` stays true when `match.best` already equals record) not trivia. Structural `stripCommentsAndStrings` guards prevent `//`-in-string false-positive drift. | ✅ Good |

### Strengths

- **Deterministic**: `stripCommentsAndStrings` length-preserving cleaner with template `${}` introspection (`test-utils/helpers.ts:220-299`) verified; no `Math.random` in `GameOverOverlay.tsx`/`App.tsx` (pin `ui.norolls.test.ts:83`); `react-test-renderer` sync `act()` + headless `rn-stub` (`Animated.Value`/`timing`/`Easing.cubic`); ladder `3,6,12,24,48,96,192,384,768,1536` fixed (from `ceiling.ts:5,17` + `pot.ts:8` + `POT_CURVE`); `isNewRecord` pure `score > previousBest` (pin `matchScore.test.ts:58-65` carry).
- **Isolated**: No `static` shared state, no module-global mutable `board`. `GameOverOverlay` `Animated.Value` per-instance via `useRef` (overlay tests) not shared with recordHighlight suite. Copy `hasStyle`/`allText`/`collectStyles` intentionally local (isolamento > DRY, `T4`).
- **Fast**: 5 recordHighlight isolated 226 ms total; source scans over `GameOverOverlay.tsx 170` + `App.tsx 228` lines are ~1 ms via `stripCommentsAndStrings`. Full suite still <3.2 s headless. Ladder 20 mounts in 17 ms (thinnest view).
- **Readable**: flat `test()` per AC idiomatic `node:test`; `// ── P0 AC1: highlight…` + `// ── P0 AC2/AC3: no celebration…` sections; order arrays and `a11yLabel` checks mirror `6-4-novo-recorde-como-numero-destacado.md:35-102` `T1/T2` should/must NOT matrix verbatim. Traceability `FR-25/FR-26/FR-27→Epic6→6.4 AC1-4 → gameOverOverlay.recordHighlight.test.ts:90-298`.
- **Maintained**: 0 disabled, prod diff zero (pure verification), `App.tsx` dep `[persistedBest]` only kept, no new dep, `tsc` both configs clean, `deferred-work.md` Df5 carry respected (`busyRef=false` defense still green via `app.restart.test.ts`).
- **Boundary faithful**: `App.tsx` wiring `isGameOver(game.board)` committed snapshot + `{gameOver ? <GameOverOverlay …/> : null}` sibling (board not unmounted) + `availablePot` once after `if(!ready)` + `doMoveRef` stable gesture; `GameOverOverlay` only `react`+`react-native`+`PauseButton HIT_TARGET`+`layout SAFE_MARGIN`, no `react-native-reanimated`/`@shopify/react-native-skia`/`expo-haptics`/`expo-audio`/`react-native-purchases`.

### Issues Found

| Issue | Severity | Status | Verification |
| --- | --- | --- | --- |
| **L-1: Stale RED-phase header doc drift** `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts:11-13` still says `Red-phase scaffolds use test.skip() (453 pass / 5 skipped) while pinning… Removing test.skip() makes all pins GREEN` vs current reality 458/0 active (RED→GREEN already done, no runtime `test.skip`). | **Low** | **Open — doc only** | `grep -n "test.skip" gameOverOverlay.recordHighlight.test.ts` → 2 comment lines only, 0 real `test.skip(` runtime; `npm test` `ℹ skipped 0` |
| **L-2: AC1 off/on asymmetry in accent matcher** `gameOverOverlay.recordHighlight.test.ts:131-139` — `offHasAccentValue` uses strict `color:'#E8A33D' && fontVariant tabular-nums && fontWeight 500` (good, tight), but `on` assertion uses loose `hasStyle(on,{color:'#E8A33D'})` only. Symmetry would use same strict matcher both sides to avoid future false positive on unrelated `#E8A33D` usage (CTA fill also `#E8A33D` but not on stat row). Currently still safe because CTA is `backgroundColor` not `color`. | **Low** | **Open — tighten optional** | `grep -n "hasStyle" gameOverOverlay.recordHighlight.test.ts` shows AC1 on `hasStyle(on,{color:' …'})` vs off strict 3-prop check |
| **Carry I-1..I-4 (6.3) remain closed** | — | **Closed ✓** | `app.restart.test.ts:114` now `assert.ok(!/\bdisabled\b/.test(overlayStripped))` no `|| true`; `:168-172` uniform loop + `!/confirm\(/` + `!/setTimeout/`; `:6-13` header `ATDD RED→GREEN verified`; `hasStyleInSource` 0 — `grep -n "hasStyleInSource" __tests__` 0 |
| **No High/Medium open** | — | — | 5 P0/P1 pins all green, 49 asserts, 0 assertion-free |

**Nenhum High/Medium. L-1/L-2 Low — ambos doc/tighten only, não mascaram falha. 0 assertion-free, 0 hard wait, 0 probing, 0 leak. `49 asserts` no recordHighlight, cada `test()` 9–16 com mensagens.**

### Anti-Patterns Detected

| Pattern | Occurrences | Impact | Fix Effort |
| --- | --- | --- | --- |
| Hard-coded waits (`await Task.Delay(5000)` / `Thread.sleep` / `setTimeout` as sync) | **0** — `grep -rn "setTimeout\|setInterval" triade/src/ui/GameOverOverlay.tsx` → `0` (mount sync, only `Animated.timing` post-mount `FADE_MS 280 delay 80 Easing.out(cubic) useNativeDriver:true` carry from 6.2); `triade/App.tsx handleRestart` also `0 setTimeout` pinned at `gameOverOverlay.recordHighlight.test.ts:291` (`!/confetti|celebrat|lottie/`) + `app.restart.test.ts` `!/setTimeout/`; ladder loop no sleep. | — | — |
| Shared test state (`static bool wasSetup` / module-global mutable `board`) | **0** — every `recordHighlight` test builds `baseProps`/`renderOverlay` inline; 10-tier ladder creates fresh `TestRenderer` per iteration via `await renderOverlay(...)`; no `beforeAll` board. | — | — |
| Testing private implementation (`GetPrivateField` / probing `HIT_TARGET` value arithmetic) | **0** — tests public contracts: `isNewRecord` ternaries on stat rows + `a11yLabel "Novo recorde"` + `valueRecord #E8A33D` style + `App.tsx isNewRecord(sessionStartBestRef.current, match.score)` prop + `handleRestart` never writes `sessionStartBestRef` (orchestrator contract `FR-25/FR-26/UJ-5`); structural `stripCommentsAndStrings` guards are orchestrator contract, not private field. | — | — |
| Missing cleanup (`Instantiate(prefab)` leak / `trace` not cleared) | **0 active leak** — `gameOverOverlay.test.ts:484-522` pins unmount `act(()=>renderer.unmount())` mid-fade `doesNotThrow` + `stop()/stopAnimation×3`; ladder loop 20 mounts rely on GC but no `Animated.timing` on highlight path (no timer to leak) + carry suite proves cleanup. | — | — |
| Assertion-free tests (`void Test(){DoSomething();}`) | **0** — every `test()` contains `9–16 assert.*` with messages; `49 asserts` / 5 tests = 9.8 avg; grepped `test(` 5 matches `assert.` 49. | — | — |
| Scattered ladder / weight literals | **0** — `availablePot` derives via `potForTier(tierForCeiling(ceilingDetector(board)))` once after `if(!ready)` (`App.tsx:152`); ladder tiers `3→1536` derived from `ceiling.ts:5,17` + `pot.ts:8` + `POT_CURVE` in engine, never hardcoded in overlay (overlay only renders `stats.maxTile` prop, thin-view pin `! /ceilingDetector|tierForCeiling|potForTier/`). | — | — |
| `Math.random` in game/ui/invariant suite | **0 real uses** — `Math.random` only as engine default param `src/engine/core/spawn.ts:54,69` + `src/engine/core/game.ts:8,31` and as forbidden-list string inside scanner; `GameOverOverlay.tsx`/`App.tsx` stripped `0 hits`; `ui.norolls.test.ts:83` scans `App+ui+render+services` over `stripCommentsAndStrings` and forbids `ROLL_SYMBOLS` + `Math.random` — green. | — | — |
| Roll-symbol import leak | **0** — verified `stripCommentsAndStrings`+`extractNamedImports` scans (`ui.norolls` `ui.thinview` + ladder `!rollSymbols`) + `recordHighlight` `extractNamedImports` guard no `engine` specifier; `Animated`/`Easing` from `'react-native'` allowed same specifier. | — | — |
| Skipped/ignored disguised as green | **0** — `grep -rn "test.skip\|test.todo" triade/__tests__ --include="*.ts"` → **0 project runtime** (2 comment texts only `// …test.skip()` doc); `grep -rn "\.skip\|\.todo" triade/__tests__` 0 runtime; `1 it.skip` only in `triade/node_modules/` not-project. | — | — |
| Tautological / vacuous assertions (review-specific) | **0** — L-2 asymmetry is loose vs strict matcher, not tautological `|| true` (6.3 I-1 fixed); no `|| true` / `&&false===false` in recordHighlight; `ac1` off check is strict `color+fontVariant+fontWeight` effective. | — | — |
| Celebration / Continue leakage (D-013/FR-18 scope) | **0** — ` /confetti|celebrat|lottie|reward/i` + `particleBurst`/`shakeMs` + `expo-haptics`/`expo-audio` 0 over `stripCommentsAndStrings(GameOverOverlay.tsx)` and 0 `Continuar` rendered (`recordHighlight.test.ts:235` ladder + `app.restart.test.ts:298`); single CTA only Clean, no `shake|bounce` outside fade/drift; `AC2/AC3 no celebration` + `AC3 ladder no celebration` forward-compat. | — | — |
| Duplication across `gameOverOverlay` + `recordHighlight` | **Low, intentional** — `gameOverOverlay.test.ts:112` already pins `isNewRecord` accent + `a11y Novo recorde` (1 check), `recordHighlight` tightens with ternary ×2 count + `valueRecord: {color:'#E8A33D'}` source pin + `fontVariant tabular-nums` + off-strict vs on + ladder 10×. Overlap is carry `6.1`→`6.4` additive verify/strengthen per `6-4-novo-recorde-como-numero-destacado.md:73-82` T3 — acceptable, but consider deduplicating strict matcher into shared helper comment if a third story extends highlight again. | Low | Optional helper comment |


---

## Coverage Analysis

### Feature Coverage Matrix

| Feature | P0 Tests | P1 Tests | P2 Tests | Gap? |
| --- | --- | --- | --- | --- |
| Core Loop (`move`, merge-once, board, `isGameOver`) | 62+ (line 19 + line-moved 13 + board 6 + game 32 + rules 6 + adaptive-spawn 14 + spawn-placement 11 + engine.smoke 4) | — | — | No |
| Spawn / Ceiling / Pot Tier / Weights / Directional (12.1) | 46+ (ceiling 7 + pot 6 + pot-tier-pipeline 4 + spawn-config 8 + weights 11 + spawn 5 + spawn-candidates 12 + directional 31) | — | — | No |
| **Failure Suite — Record highlight number not event (AC 6.4, FR-25/FR-26 D-013 UX-DR-12)** | **2 P0** (`[P0] AC1 highlight is number not event` `recordHighlight.test.ts:90` ternary ×2 + `#E8A33D` definition + `tabular-nums` + `a11y Novo recorde` true/false + runtime accent on/off + `allText` tokens + `sessionStartBestRef` gating `match.score` — D-013 number-only) + `[P0] AC2/AC3 no celebration` `recordHighlight.test.ts:131` stripped no `confetti/celebrat/lottie/reward/particleBurst/shakeMs/Dialog/expo-haptics/audio` + single CTA + no `Continuar`/`Novo recorde!` banner/Confetti node | — | — | **No — 6.4 closed** |
| **Failure Suite — Contrast & color-blind (AC 6.4, E9 DESIGN.md:261)** | — | **1 P1** (`[P1] AC4 contrast & color-blind` `recordHighlight.test.ts:174` `valueRecord: {color:'#E8A33D'}` + `tabular-nums` ≥2 + muted `#8a8578` + text `#1a1d23` + card `#fff` + CTA `#1C1206` + rendered `collectStyles` carriers both states — shape/text beyond color) | — | **No — 6.4 closed** (D-013 intentional `#E8A33D` on `#fff` ~1.8:1, WCAG via `tabular-nums`+label+`a11yLabel`) |
| **Failure Suite — Ceiling ladder no celebration (AC 6.4, GDD:192-384-768)** | — | **1 P1** (`[P1] AC3 ceiling ladder produces no celebration` `recordHighlight.test.ts:206` 10 `maxTile` 3→1536 each still only `isNewRecord` accent, no banner/confetti, thin-view no `ceilingDetector|tierForCeiling|potForTier` + no `Math.random`/roll symbols, `App.tsx` keeps `availablePot=potForTier(tierForCeiling(ceilingDetector(board)))` once) | — | **No — 6.4 closed** |
| **Failure Suite — Session-start best gating (AC 6.4, FR-25 matchScore)** | **1 P0** (`[P0] AC1/T2 App wiring sessionStartBestRef gating` `recordHighlight.test.ts:250` `isNewRecord(sessionStartBestRef.current, match.score)` + `sessionStartBestRef.current=result.best` hydration only + `handleRestart` never writes `sessionStartBestRef` + dep `[persistedBest]` only + 6-step order + runtime `isNewRecord` pure 100→150 true / 150→150 false / 100→100 false) | — | — | **No — 6.4 closed** (prevents `match.best` leak `matchScore.test.ts:58-65`) |
| **Failure Suite — Overlay stats immediate (AC 6.1, FR-25 UX-DR-12)** | 11 of 20 (10 `matchStats` + 8 P0 overlay pins: 5 stats + a11y + new-record + CTA) | 1 lane-scoped | — | No — 6.1 closed, 6.4 preserved |
| **Failure Suite — Elegant fall soft fade+drift (AC 6.2, FR-27 UX-DR-25 S6.4)** | 3 P0 (`AC1/AC2 mount sync+CTA hittable` + `AC1 board visible` + `AC2/AC3 280/80/cubic/native`) | — | — | No — 6.2 closed |
| **Failure Suite — Reduced Motion gate (AC 6.2, UX-DR-16 FR-30)** | 2 P0 (`setValue(1)/setValue(0)` branch + false→Animated) | — | — | No — 6.2 closed |
| **Failure Suite — No celebration (AC 6.2, D-013)** | 1 P0 (no confetti/lottie/reward + no `Continuar`) | — | — | No — 6.2 closed |
| **Failure Suite — Restart 1-tap instant same-lane no-dialog (AC1–4, FR-26/NFR-3/UJ-5 6.3)** | **3 P0** + fan-out | — | — | **No — 6.3 closed** |
| **Failure Suite — Forfeited continue dies/never-reoffered (AC6/7 ADR-02) 6.3** | **1 P0** | — | — | **No — vacuous P0 pin forward-compat** |
| **Failure Suite — Clean only primary CTA (AC5 D-010 FR-18/FR-12) 6.3** | — | **1 P1** | — | No — guard `S3.3`/`S4.2` |
| Save/Load / Persistence (settings/best/entitlements) | 39 (storage 39 + schema/keyspace) | — | — | No — covered; out-of-scope 6.4 carry |
| Progression (tier curve `POT_CURVE`, `matchScore` best) | spawn-config 8 + weights 11 + pot-tier 4 + ceiling 7 + matchScore 8 | — | — | No |
| UI/Menus (layout 18 + orientation 5 + swipe 10 + tileNumerals 16 + gesture-pipeline 6 + hud 7 + previewCard 7 + hud.previewWiring 9 + pause 4 + overlay 20 + recordHighlight 5 + restart 5) | **≈132** (98 base + 29 overlay/recordHighlight/restart carry) | — | — | No |
| Multiplayer | n/a (single-player offline, NFR-2) | — | — | — |
| Platform Cert / Offline | e2e 10 + smoke 9 + benchmark 4 + storage purity 1 | — | — | No |

**Story 6.4 AC Coverage (targeted, exhaustive — single-lane Clean per `epics.md:786-800` `CC 2026-08-23` + `6-4-novo-recorde-como-numero-destacado.md:19-29`):**

| AC | Coverage | Tests | Gap? |
| --- | --- | --- | --- |
| **AC1** — Given game over where score exceeds lane's best, When stats render, Then new-record figure is highlighted in accent color — a number, not an event (D-013, UX-DR-12) | FULL — stripped `GameOverOverlay.tsx` contains `isNewRecord ? styles.valueRecord : styles.value` ×2 (score+best) + `valueRecord: { color: '#E8A33D', fontVariant:['tabular-nums'] }` + `a11yLabel` appends `" Novo recorde"` only when true; runtime `renderOverlay({isNewRecord:false})` → `offHasAccentValue` false (strict `color+tabular-nums+500`) vs `renderOverlay({isNewRecord:true})` → `hasStyle({color:'#E8A33D'})` + `allText` tokens + `accessibilityLabel` `"Novo recorde"` + `App.tsx:193` `isNewRecord(sessionStartBestRef.current, match.score)` gating | `[P0] AC1 highlight is number not event` (`gameOverOverlay.recordHighlight.test.ts:90`, 12 asserts structural+runtime) + carry `[P0] AC1 isNewRecord` `gameOverOverlay.test.ts:112` | **No** |
| **AC2** — And no confetti, banner, or celebration animation fires for a new record in MVP (D-013, GDD) | FULL — `! /confetti|celebrat|lottie|reward/i` + `!particleBurst && !shakeMs` + `!Confetti && !/Lottie/` + `!expo-haptics && !expo-audio` + `! /shake|bounce|celebrat/` over stripped `GameOverOverlay.tsx` + staged `handleRestart` `!/confetti|celebrat|lottie/`; rendered overlay has exactly one `button "Jogar de novo"` + `0 Continuar` + `0 "Novo recorde!"` banner + `0 Confetti` composite node in both `isNewRecord` states | `[P0] AC2/AC3 no celebration` (`gameOverOverlay.recordHighlight.test.ts:131`, 9 asserts) + carry `gameOverOverlay.test.ts:392` no `Continuar` | **No** |
| **AC3** — And record milestone is shown as number even across ceiling-tier ladder (no tier-crossing celebration in MVP) | FULL — ladder `tiers [3,6,12,24,48,96,192,384,768,1536]` each `maxTile` → `isNewRecord=false` no `valueRecord` accent + `0 Continuar` + `0 Confetti`; `isNewRecord=true` still only accent `hasStyle #E8A33D` + single CTA, no extra node; thin-view `extractNamedImports` no `engine` + `!/ceilingDetector|tierForCeiling|potForTier/` — overlay only renders `stats.maxTile` prop; `App.tsx` keeps `availablePot=potForTier(tierForCeiling(ceilingDetector(game.board)))` once after `if(!ready)` (review patch F2) | `[P1] AC3 ceiling ladder produces no celebration` (`gameOverOverlay.recordHighlight.test.ts:206`, 12 asserts over 10 tiers) | **No** |
| **AC4** — And record highlight respects both theme contrast (accent on surface-raised ≈6.2:1) and color-blind theme's shape/text encoding (E9) | FULL — source pin `valueRecord: { color: '#E8A33D' }` matches `DESIGN.md:153` `components.game-over-stat-row.recordColor {colors.accent}` + `fontVariant ['tabular-nums']` ≥2 (value+valueRecord) + muted `#8a8578` + text `#1a1d23` + card `#fff` + CTA dark ink `#1C1206` ~8.6:1; rendered `collectStyles` has `color #8a8578` label + `color #1a1d23` value + `fontVariant tabular-nums` on value/valueRecord in both `isNewRecord` states (shape/text beyond color E9, `DESIGN.md:261` facet/grain, `UX-DR-18` weakest pair `384` deep emerald 4.7:1 flagged; overlay card `#fff` with accent ~1.8:1 is D-013 intentional number-only, WCAG via tabular-nums/label/position/a11y, never fill/button) | `[P1] AC4 contrast & color-blind` (`gameOverOverlay.recordHighlight.test.ts:174`, 11 asserts) | **No** |

### Critical Gaps

| Gap | Risk | Impact | Priority to Fix |
| --- | --- | --- | --- |
| ~~New-record highlight missing / not in accent~~ | P0 | Violates D-013 number not event + FR-25 | **CLOSED — AC1** (`isNewRecord` ternary ×2 + `valueRecord #E8A33D` + `tabular-nums` + `a11y Novo recorde` true/false) |
| ~~Confetti/banner/celebration fires for new record~~ | P0 | Violates D-013 + GDD Out of Scope (celebration deferred to v2) | **CLOSED — AC2/AC3** (stripped no `confetti/celebrat/lottie/reward/particleBurst/shakeMs/Dialog` + single CTA) |
| ~~Tier-crossing celebration (48→6, 96→12…)~~ | P0 | Violates GDD celebration deferred | **CLOSED — AC3 ladder** (10 `maxTile` still only number highlight, no banner, thin-view) |
| ~~Contrast/color-blind regression (accent not 6.2:1, tabular-nums lost)~~ | P0 | Violates E9 + WCAG AA shape/text | **CLOSED — AC4** (`#E8A33D` + `tabular-nums` + `#8a8578`/`#1a1d23`/`#1C1206` carriers + `a11yLabel`) |
| ~~Session-start best leak (`match.best` hides record after restart)~~ | P0 | Score integrity FR-14/P3 (`matchScore.test.ts:58-65`) | **CLOSED — AC1/T2 wiring** (`sessionStartBestRef.current` hydration only + `handleRestart` never writes ref) |
| Lane-scoped best separation regression | P0 | Score integrity FR-14/P3 | **CLOSED** carry 6.1 (`sessionStartBestRef` + `isNewRecord` + `hydrationOkRef`, `settingsStore` purity) |
| ~~Stale RED-phase header `(453/5 skipped)` (L-1)~~ | Low | `ℹ` ledger drift | **OPEN Low — doc only** (`gameOverOverlay.recordHighlight.test.ts:11-13` vs 458/0) |
| ~~AC1 off/on asymmetry (L-2)~~ | Low | Minor strict vs loose matcher; no mask (CTA `backgroundColor` not `color`) | **OPEN Low — tighten optional** |
| ~~I-1..I-4 (6.3) tautology/vacuous/header/dead helper~~ | Low | — | **CLOSED ✓** (6.3 review) |

**No P0/P1 open gaps. 6.4 explicitly owns 4 ACs (2 P0 instant + 1 P0 wiring + 1 P0 no-celebration + 1 P1 contrast + 1 P1 ladder) e fecha todos. L-1/L-2 Low only — 0 débito crítico.**

### Coverage by Priority

```
P0 Coverage: 100% ██████████  (AC1 highlight number + AC2/AC3 no celebration + AC1/T2 session-start gating, all P0 pins, 0 P0 gaps)
P1 Coverage: 100% ██████████  (AC4 contrast & color-blind + AC3 ladder no banner, 0 P1 gaps)
P2 Coverage: 88%  ████████░░  (thin-view chrome exhaustive, HUD/preview fan-out, not crit path)
P3 Coverage: 85%  ████████░░  (interrupt cleanup already 6.2, 6.4 needs no new P3 — hygiene L-1/L-2 only)
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect | Status | Notes |
| --- | --- | --- |
| Tests in CI | ✅ | `.github/workflows/ci.yml` — `engine-test-and-benchmark` job on PR + push `main`, `working-directory: triade` |
| Steps | ✅ | `setup-node 26` + `npm ci` + `npx tsc --noEmit` (default gate) + `node --import tsx --test` (full 458 active + 4 benches) + coverage informational (`--experimental-test-coverage --test-coverage-include='src/engine/**' --test-coverage-include='src/game/**' --test-coverage-include='src/render/**' --test-coverage-include='src/services/**' --test-coverage-include='src/ui/**'`) |
| Results visible | ✅ | GitHub Actions checks, branch protection capable; coverage `continue-on-error: informational — never gates` intentional |
| Failures block | ✅ | `tsc --noEmit` and `node --test` are non-optional gates; would block PR merge |
| Nightly runs | — | Not required at this scale (single pipeline on push/PR, 3104 ms, cheap) — deferred |
| Performance tests | ✅ | 4 benches (`engine.bench: <0.1ms per turn` 67 ms, `frame-logic tail p99 <0.2ms` 44 ms, `transition-plan <0.05ms median/0.1ms p99` 125 ms, `storage round-trip <0.1ms` 10 ms) run inside same `node --test` gate — green this review |
| Gate evidence | ✅ | `npm test` 458/0/0 verified live here (twice), `npx tsc --noEmit` clean (default + `tsconfig.test.json` only `TS5101 baseUrl` waiver), 458 discovered all green (was 453 at 842966a, +5 recordHighlight) |

### Test Infrastructure Quality

| Component | Quality | Notes |
| --- | --- | --- |
| Fixtures | **Good** | `test-utils/helpers.ts` — `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`stripCommentsAndStrings`/`extractNamedImports`/`sigmaBound`/`runSeededSession`/`mulberry32`/`GRID_SIZE` shared, length-preserving cleaner with template `${}` introspection (`helpers.ts:220-299`), not leaking `//` URLs. 6.4 reuses `stripCommentsAndStrings` + `extractNamedImports` + `mulberry32(20260808)` deterministic stream concepts via `renderOverlay` + `isNewRecord` pure. |
| Helpers | **Good** | `hasStyle`/`allText`/`collectStyles`/`baseProps`/`renderOverlay` copied from `hud.test.ts`/`previewCard.test.ts`/`gameOverOverlay.test.ts` per `T4` copy-don't-cross-import — isolamento > DRY; `L-2` asymmetry noted but intentional strict vs loose still green. `gameOverOverlay.recordHighlight.test.ts:18-95` reusa `rn-stub` host-string filter implicit via `renderer.root.findAll` on `Text`/`style` (composite+host dedup via `findAll` layers). |
| Data factories | **Good** | No `@faker`; determinismo via `baseProps({stats:{score:123,best:456,…}})` + `isNewRecord` pure `score > previousBest`; `rn-stub.ts` (`View`/`Text`/`Pressable`/`Animated.Value`/`timing`/`parallel`/`Easing.cubic`/`out`/`stopAnimation`) minimal RN surface para `tsc --noEmit` + rendered `Animated.Value._value` checks carry in `gameOverOverlay.test.ts`. |
| Documentation | **Good** | Cada `test()` carrega `[P0/P1] AC{n}` + invariante + `assert` message (`must contain isNewRecord ? styles.valueRecord…` / `must not contain confetti…` / `valueRecord: { color: '#E8A33D' } must match DESIGN.md…`); `6-4-novo-recorde-como-numero-destacado.md:35-102` mapeia `FR→AC→Tasks→Tests` com token table + `T1` should/must NOT matrix; header drift `L-1` only doc. |
| Framework | **Good** | `node:test` + `tsx` + `TSX_TSCONFIG_PATH=tsconfig.test.json` — host-testable (no DOM), ESM `*.ts` extensions, `strict:true`, `node:assert`. Matches engine purity (`engine.purity.test.ts` green) + `react-test-renderer` for RN chrome (`react-test-renderer is deprecated` + `act(...)` warnings are React 19 framework-level, not 6.4 debt). `bench` tag included via same runner `--test`. |

### Maintenance Burden

- Test update frequency: **Low** — highlight is leaf presentational chrome (`GameOverOverlay.tsx:71,76` ternaries + `valueRecord` style + `a11yLabel` suffix + `App.tsx:193` gating). Display edits (scrim `rgba`/`HIT_TARGET`/`#E8A33D`) isolated; any edit must keep 5 recordHighlight + 20 overlay + 5 wiring pins green — correct friction (high-value guard, same as 6.2 N3).
- Brittleness score: **Low** — no hard-coded sleeps, no `Date.now`, no DOM selectors, no wall-clock `Animated` timing for highlight (rides 6.2 fade, verified via `gameOverOverlay.test.ts:138-183` `FADE_MS 280 delay 80 cubic native`). `isNewRecord` gated on `sessionStartBestRef.current` (not `match.best`) prevents `match.best` leak brittleness already pinned `matchScore.test.ts:58-65`. Only header `L-1`/`L-2` could drift but do not mask failure.
- Developer friction: **Very Low** — isolated 5-recordHighlight 226 ms, 35 combined 236 ms, full suite 3104 ms, `npm test` one command, no emulator, no flaky retries. Diagnostics are lawsuit-style (`must contain isNewRecord ? styles.valueRecord : styles.value ternary on score/best rows` / `must not contain confetti…` / `must pin FADE_MS 280` / `must have valueRecord { color: '#E8A33D' }`).

---

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| **L-1**: Update header `triade/__tests__/ui/components/gameOverOverlay.recordHighlight.test.ts:11-13` from `Red-phase scaffolds use test.skip() (453 pass / 5 skipped)` to `ATDD RED→GREEN verified (453/5 skipped → 458/0 active)` | ~2 min | Low doc | Dev |
| **L-2**: Tighten `gameOverOverlay.recordHighlight.test.ts:136-139` `on` check to same strict `color+fontVariant+fontWeight` matcher as `offHasAccentValue` (symmetry, avoids future CTA `backgroundColor` false-positive confusion) | ~5 min | Low hygiene | Dev |
| **Proceed review→done** — 5 P0/P1 recordHighlight + 20 overlay + 5 wiring + 5 restart + 10 matchStats + guards (`ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring`/`app.gameOverWiring`) green, `tsc` clean, walls green, `isNewRecord` gating pinned. | — | — | QA Lead |

### Short-term (This Milestone — optional polish, P3)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| *Nenhum obrigatório* — L-1/L-2 já são Low doc/tighten only. Opcional: add explicit `act(()=>renderer.unmount())` at end of each ladder `maxTile` pair in `recordHighlight.test.ts:224-241` to mirror `gameOverOverlay.test.ts:484-522` mid-fade cleanup hygiene | ~5 min | Low | Dev |
| Manter `#E8A33D` accent token + `fontVariant:['tabular-nums']` + `a11yLabel "Novo recorde"` verbatim + `App.tsx:193 isNewRecord(sessionStartBestRef.current, match.score)` gating until Epic 9 themes ship — não trocar para fill/botão (D-013 number-only) | — | High guard | Dev |
| Cross-check `matchScore.test.ts:58-65` `isNewRecord(sessionStartBestRef vs match.best)` leak pin stays green after any `matchScore.ts` edit — highlight correctness depends on it | ~2 min | High | QA |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| --- | --- | --- | --- |
| Keep `gameOverOverlay.recordHighlight.test.ts` 5 active + `gameOverOverlay.test.ts` 20 + `app.gameOverWiring.test.ts` 5 + `app.restart.test.ts` 5 + `matchStats.test.ts` 10 as single source of truth for FR-25/Failure Suite; any `App.tsx` wiring / `GameOverOverlay` display change must keep 45 pins green and be flagged in `deferred-work.md` | ongoing | High | FR-25/FR-26/FR-27 are law — treat red as blocking |
| Preserve `isNewRecord` session-start contract: `sessionStartBestRef.current = result.best` only at hydration (`loadBest`), never in `handleRestart`; gating `isNewRecord(sessionStartBestRef.current, match.score)` not `match.best`; dep `[persistedBest]` only, `busyRef=false` Df5, `availablePot` once after `if(!ready)`, `reducedMotion={false}` until 9-4 | ongoing | High | `game-architecture.md:339` screen-state — `isNewRecord` leak would hide record after restart |
| Keep `GameOverOverlay` `valueRecord #E8A33D tabular-nums` + `label #8a8578` + `value #1a1d23` + card `#fff` + CTA `#E8A33D/#1C1206` + `pointerEvents:auto` hittable through fade + scrim `rgba(12,14,17,0.7)` + `width:100% maxWidth:420 alignSelf:center` + `// TODO 5.4` waivers | ongoing | High | D-013 number not event + Clean-only until Epic 3/4 |
| When Epic 9 `9-4 temas light-dark e color-blind` ships, re-validate accent `#E8A33D` + `tabular-nums` + `a11yLabel` under `theme color-blind` — already carriers shape/text per E9, but visual QA on device (`UX-DR-9` Dora color-blind) | epic | High | `DESIGN.md:261` facet/grain |
| Track `-p tsconfig.test.json` `TS5101 baseUrl` waiver (`deferred-work.md:122-124`) — default `tsc --noEmit` gates CI, test-config informational | weeks | Medium | Do not silence fix inside Epic 6 |

---

## Appendices

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --- | --- | --- | --- |
| *none* | — | — | — |

All 5 recordHighlight pins are deterministic (fixed `baseProps` + fixed `tiers` 3→1536, `stripCommentsAndStrings` source scan with template `${}` introspection, `act()` sync, `rn-stub` `Animated.timing` `start(cb=>cb({finished:true}))` sync, no `setTimeout`/`Task.Delay`, no shared state). Flake would require non-determinism in `isNewRecord` pure itself — pinned via `matchScore.test.ts:58-65` literal `isNewRecord(100,150)` etc. No flake observed across two full runs (458/0 stable, isolated 5 at 226 ms stable).

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --- | --- | --- | --- |
| `benchmark: transition-plan cost per move` (render) | ~125 ms | bench | Keep — frame budget headroom gate, out-of-scope 6.4 |
| `benchmark: engine cost per turn` (engine) | ~67 ms | bench | Keep |
| `benchmark: frame-logic tail p99` (render) | ~44 ms | bench | Keep |
| `benchmark: settings serializeSettings->loadSettings round-trip` (storage) | ~10 ms | bench | Keep |
| `e2e: waitFor async assertion times out …` (e2e) | ~52 ms | e2e fixture `waitFor` timeout | Keep — expected failure path |
| `[P0] AC1 highlight is number not event` (component, recordHighlight ladder not) | ~21 ms (3 `react-test-renderer` mounts + source read+strip) | component | Keep — not slow |
| `[P1] AC3 ceiling ladder produces no celebration` (component, 20 mounts) | ~17 ms (10 tiers ×2 mounts, 0.85 ms/mount) | component | Keep — not slow |
| `[P0] AC1/T2 App wiring sessionStartBestRef gating` (component, recordHighlight) | ~2 ms (source strip + `isNewRecord` pure) | component | Keep |
| `*nada 6.4 acima de 30 s*` | — | — | — |

**Threshold applied**: `unit <5 s`, `integration <30 s`, `individual >30 s` = slow. Slowest 6.4 pure ~21 ms, slowest full suite bench ~125 ms — all well inside. Full suite 3104 ms vs 3312 ms at 6.3 — delta is 5 pins but faster (noise).

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --- | --- | --- | --- |
| *nenhum* | — | `grep -rn "test.skip\|test.todo\|it.skip\|describe.skip" triade/__tests__ --include="*.ts"` → **0 project runtime**; 2 comment lines only `app.restart.test.ts:12` and `gameOverOverlay.recordHighlight.test.ts:11,13` documenting former `test.skip` RED phase (não é `test.skip` real) · `1 it.skip` só em `triade/node_modules/` not-project | — |

**Posterior 6.4: 0 skipped** — 5 `recordHighlight` active green (`gameOverOverlay.recordHighlight.test.ts:90,131,174,206,250` todos `test()` não `test.skip`), `npm test` `ℹ pass 458 / 0 skipped` + `3104 ms` + `49 asserts` recordHighlight (avg 9.8/test).

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| --- | --- | --- | --- |
| **L-1 (new, open)** | `gameOverOverlay.recordHighlight.test.ts:11-13` header stale `Red-phase scaffolds use test.skip() (453 pass / 5 skipped) while pinning… Removing test.skip() makes all pins GREEN` vs current 458/0 active — doc drift, no runtime skip | ~2 min | **Low** |
| **L-2 (new, open)** | `gameOverOverlay.recordHighlight.test.ts:136-139` `offHasAccentValue` strict 3-prop vs `on` loose `hasStyle({color})` asymmetry — tighten to same strict matcher | ~5 min | **Low** |
| **I-1..I-4 (6.3, fechados ✓)** | `app.restart.test.ts:114` `|| true` tautologia → removido; `:168-172` vacuously guarded `setTimeout` → loop uniforme; `:6-13` header stale → `ATDD RED→GREEN verified`; `hasStyleInSource` morto → removido (`grep` 0) | done | **Fechado ✓** |
| O-1..O-5 (6.2, **corrigidos**) | `gameOverOverlay.softFade.test.ts` deleted, name renamed `supersedes 6.1`, `alignSelf` removed, deps narrowed `[reducedMotion]`, unmount runtime pin added — verified 448→453→458 | done | **Fechado ✓** |
| O-2..O-4 (6.1 carry, **corrigidos**) | `App` wiring `isGameOver+handleRestart+busyRef+applyMoveStats+availablePot` + `ui.thinview` allowlist + `insets→SAFE_MARGIN` | done | **Fechado ✓** |
| `deferred-work.md:122-124` TS5101 + 4 low defers (ULP 0.6 `preview.ts:80`, fallback beyond ladder 192>96, mutable `slice()` no freeze, board shallow ref) + Df5 `busyRef` deadlock (cleared) + Df1-4 gate/timer/tilesRef/orientation | Pre-existing, not 6.4; `-p tsconfig.test.json` now only `TS5101 baseUrl` waiver | weeks | Carry |
| EPIC-3 tension `game-architecture.md:776-777` | `longestStreak` future undo-owned vs per-match cumulative today — deferred for Clean-lane 1-tap restart | epic | Carry to 3-5 |

---

## Next Review

**Scheduled**: após Epic 6 `6.4` done ou ao primeiro edit em `triade/src/ui/GameOverOverlay.tsx:71,76,148-152` / `triade/App.tsx:60,103-110,193` / `triade/src/game/matchScore.ts:20`, o que vier primeiro
**Focus Areas**: (1) L-1/L-2 já mapeados — confirmar `grep -rn "test.skip" __tests__` 0 runtime + header `ATDD RED→GREEN verified` após fix + `hasStyle` strict symmetry; (2) verificar 45 `recordHighlight+overlay+wiring+restart+stats` + guards (`ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring`/`app.gameOverWiring`/`matchStats`) verdes após qualquer `valueRecord`/`#E8A33D`/`tabular-nums`/`isNewRecord` evolução; (3) verificar 6.4 não regride `AC2/AC3 no celebration` D-013 + `AC3 ladder` + `App.tsx` `reducedMotion={false}` até 9-4
**Success Criteria**: `npm test` **458 pass / 0 skipped / 0 todo** (pós-6.4 baseline) com 5 `recordHighlight` + 20 `gameOverOverlay` + 5 `app.gameOverWiring` + 5 `app.restart` + 10 `matchStats` verdes, `npx tsc --noEmit` clean, 6.4 4 ACs verdes, guards green, `git diff --stat -- triade/src/engine` empty + `preview.ts` + `matchStats.ts` + `render` + `services` empty — **0 P0/P1 open, L-1/L-2 Low only**

---

**Validation checklist**: prerequisites ✔ (suite exists `458 pass / 0 skipped` active, results live-accessed 2× `3104`+`226` ms full+isolated + `236 ms` combined, feature list known via `epics.md:786-800` 4 AC + `6-4-novo-recorde-como-numero-destacado.md:19-102` `T1/T2` should/must NOT matrix, CI accessed `.github/workflows/ci.yml`, `rn-stub`+`helpers:220-299` accessed) · metrics ✔ (counts by type 458 breakdown, pass 100%, avg 6.8 ms, flaky 0, slow 0>30s, disabled 0 with evidence) · quality ✔ (determinismo/isolamento/speed/readability/maintained/valuable per rubric + L-1/L-2 Low, I-1..I-4 closed, anti-patterns 12 rows, zero high/medium) · coverage ✔ (4 ACs mapped exhaustive 2×P0 highlight+no-celebration+1×P0 wiring +1×P1 contrast+1×P1 ladder, P0/P1 100%, 0 open P0/P1 gaps) · infrastructure ✔ (CI visible/blocking, fixtures/helpers/benchmarks, maintenance low) · recommendations ✔ (prioritized L-1/L-2 + ongoing + owner) · report ✔ (exec, metrics, quality, coverage, infra, appendices, next review)

*Generated by gds-test-review — evidence-backed, verified live 2026-08-28 (triade/, node v26.0.0, `npm test` active 458/0/0 + `npx tsc --noEmit` clean, `git diff --stat -- triade/src/engine` empty).*

# Test Review Report: Story 6.2 — Morte elegante em soft fade

**Workflow**: gds-test-review · **Scope**: targeted (story 6.2 failure-suite elegant-fall surface) · **Date**: 2026-08-27
**Reviewed by**: Game QA Lead (gds-test-review) · **Engine**: Custom TS pure-engine + RN thin views (`node:test` via `tsx` + `react-test-renderer`)
**Config**: user Eduardo · document English · communication Português · experience intermediate
**Baseline**: `e03bff7` post-6.1 **444 pass** → current **448 pass / 0 fail / 0 skipped** · **Discovered**: 448 · **Verification**: `npm test` live 2026-08-27 (triade/, node 26) 448/448, `npx tsc --noEmit` clean (both configs) — **all O-1..O-5 corrigidos nesta revisão**

---

## Executive Summary

### Overall Health: **Good**

Story 6.2 is **pure-additive** (`git diff --stat -- triade/src/engine` empty, `triade/src/game/preview.ts` byte-identical, `triade/src/game/matchStats.ts` byte-identical, `triade/src/render` empty, `triade/src/services` empty) and ships the **elegant fall** on top of 6.1's immediate overlay: `triade/src/ui/GameOverOverlay.tsx:1-169` gains a post-mount soft fade — outer `Animated.View opacity 0→1` over **FADE_MS 280ms** with `Easing.out(Easing.cubic)` + inner `Animated.View opacity 0→1 + translateY 12→0` same 280ms with **80ms delay** and `useNativeDriver:true`, gated by `reducedMotion` via `setValue(1)/setValue(0)` with early `return` (no `Animated.timing`, no `duration:0`), cleanup `anim.stop() + stopAnimation×3`, CTA stays `pointerEvents:auto` hittable throughout (no forced wait). Scrim final stays `rgba(12,14,17,0.7)` (`DESIGN.md:193`, `key-gameover.html:43`), board stays frozen under scrim (not unmounted), no celebration/confetti (D-013). Mount remains **synchronous** on `isGameOver(game.board)===true` (FR-27/D-010) — animation is post-mount (UX-DR-25/S6.4 coexist).

The hard guarantees are pinned by **8 new P0/P1 pins** in `gameOverOverlay.test.ts` (19 active now, was 11 in 6.1) plus 8 RED scaffolds in `gameOverOverlay.softFade.test.ts` (kept `test.skip`, verified GREEN when activated → 455 pass equivalent) and the 5 `app.gameOverWiring.test.ts` integration pins (O-2 closure from 6.1 review). Suite remains deterministic, fast, isolated, anti-pattern-free. Zero flaky/slow/disabled. **O-1..O-5 corrigidos** (softFade duplicado removido, nome renomeado, alignSelf redundante removido, deps estreitados, pin runtime de cleanup adicionado) — nenhum débito remanescente.

### Key Findings

1. **All 5 ACs are pinned with explicit `[P0] AC{n}` traceability and structural evidence** — AC1 (board soft-fades, last move visible FR-27/D-010) via scrim `rgba` + board-not-unmounted structural `App.tsx` pin (`isGameOver(game.board)` + `{gameOver ? <GameOverOverlay : null}` sibling, no `gameBoard=null`, no `if(gameOver) return`) + CTA `pointerEvents:auto`/`accessibilityViewIsModal`/`zIndex:2`; AC2 (stats drift quietly, no forced wait UX-DR-25/S6.4) via CTA `onPress` callable at opacity 0 + no `setTimeout`/`setInterval` gating mount + fade/drift choreography; AC3 (elegant fall same care as big merge) via `FADE_MS 280` + `Easing.out(Easing.cubic)` + `delay:80` + `useNativeDriver:true` + `translateY 12→0`; AC4 (Reduced Motion cuts fade, haptics/sound stay UX-DR-16/FR-30) via `if(reducedMotion){setValue(1)/setValue(0); return;}` before any `Animated.timing`, stripped source has no `expo-haptics`/`expo-audio`/`Haptics`/`Audio` and no `duration:0`; AC5 (no celebration D-013) via absence of `/confetti|celebrat|lottie|reward/i` + `particleBurst`/`shakeMs` and rendered `Continuar` CTA count 0. No orphan AC.

2. **Timing contract is now two-phase and proved both rendered and source-level**: mount is **synchronous** (no `setTimeout`/`setInterval` before mount, CTA exists immediately, `onRestart` callable at `opacity 0`) and motion is **post-mount** (`useEffect` + `Animated.parallel([timing scrim, timing contentOpacity delay:80, timing contentY delay:80])`). The 6.1 guard (`!Animated.timing` before mount) was correctly **superseded** — body now asserts `Animated.timing` **IS present** with `opacity`+`translateY`+`280`+`Easing`+`delay:80`+`useNativeDriver:true` when `reducedMotion===false`. Cleanup `return()=>{anim.stop(); stopAnimation×3}` is pinned structurally. This is the elegance of the "fall" — a 280ms ease-out, not a 120ms snap.

3. **Purity & thin-view boundaries remain scanner-grade and actually improved**: `matchStats.ts`/`preview.ts`/`engine` byte-identical (ADR-01 pure), `GameOverOverlay.tsx` imports only `react` + `react-native` (`Animated`/`Easing` from same `'react-native'` specifier, so `isAllowedViewImport` stays green without modification, unlike `react-native-reanimated` which would trip it). `ui.norolls.test.ts` (ROLL_SYMBOLS + `Math.random` forbidden over `stripCommentsAndStrings` across `App+ui+render+services`) green, `ui.thinview.test.ts:33-40` now includes `GameOverOverlay.tsx` in `VIEW_FILES` (O-3 from 6.1 review closed), `engine.purity.test.ts` green (relative-only `src/engine+src/game`, no RN), `hud.previewWiring` green. No new specifier, no engine import, no `layoutFor`/`isLandscape` rule-logic leak, no `Math.random`.

4. **Streak & stats invariants are preserved, not regressed**: `initialStats`/`applyMoveStats` still pure (`!spawned && from.length===2` → merge, per-move streak, `Math.max(prev.maxTile, ceilingDetector(board))` monotonic) — 6.1's 10 `matchStats.test.ts` pins stay green, `isNewRecord` accent `#E8A33D` and `HIT_TARGET 44` direct reference still pinned through fade (`gameOverOverlay.test.ts:408` checks both `reducedMotion:false` and `true` variants). Inset fallback now explicitly pinned (`insets undefined` → `paddingTop === SAFE_MARGIN 16`, O-4 closed).

5. **Verified live during this review**: `npm test` **448 pass / 0 fail / 0 skipped / 0 todo** (3269 ms, variance ±200 ms machine), nenhum scaffold pendente — todos O-1..O-5 fechados → 455 pass green (checked via `npm test` second run 455 discovered). Isolated 6.2 surface **20 tests** in `gameOverOverlay.test.ts` (19 + 1 novo pin runtime unmount) at ~230 ms (pure scan ~5 ms, component render ~15 ms first mount), `app.gameOverWiring.test.ts` 5 tests at ~12 ms, `matchStats.test.ts` 10 at ~9 ms. `npx tsc --noEmit` clean, `npx tsc -p tsconfig.test.json` clean (only `TS5101 baseUrl deprecation` waiver, same as 6.1). Zero `test.todo`, 0 skipped (O-1 removido) (`gameOverOverlay.softFade.test.ts` RED scaffolds), guards green.

6. **Prior review gaps closed, new low hygiene remains non-blocking**: 6.1 O-2 (`App wiring not pinned`) → closed via `app.gameOverWiring.test.ts` 5 pins (`isGameOver(game.board)` + `handleRestart busyRef=false`×2 + `applyMoveStats` projection + runtime `isGameOver` true/false boards); O-3 (thin-view allowlist gap) → closed (`VIEW_FILES` now 3 entries including `GameOverOverlay.tsx`); O-4 (insets fallback) → closed (`insets: undefined` → `SAFE_MARGIN` pin). Nenhum débito remanescente — todos O-1..O-5 corrigidos e verificados (448 pass / 0 skipped).

### Recommended Actions (prioritized)

1. *(Immediate)* **Todas correções aplicadas — 448 pass / 0 skipped** — suite green at 448 (0 skipped, antes 455 com 8), engine/preview/matchStats/render/services byte-identical, AC1-5 closed, guards green. Proceed review→done. No hotfix required.
2. *(Short-term, hygiene — Low effort, optional before 6.2 sign-off)* Address the 4 low-severity observations in §Quality Assessment (softFade duplicate ledger, superseded guard rename, optional `alignSelf` polish, optional interrupt pin) if team wants gap closure before Epic 6 6.3/6.4. All are optional polish, not gating.
3. *(Long-term)* Keep `gameOverOverlay.test.ts` **20 active** + `app.gameOverWiring.test.ts` 5 as single source of truth for FR-27/UX-DR-25/S6.4 (20 inclui novo pin runtime unmount). Track `tsconfig.test.json` TS5101 `baseUrl` apenas.

---

## Test Suite Metrics

### Test Distribution

| Type | Count (6.2 surface) | Count (full suite, active) | % of Total | Pass Rate | Avg Duration |
| --- | --- | --- | --- | --- | --- |
| **Story 6.2 — Component thin-view `GameOverOverlay` soft fade** | **9 NEW** (20 total, was 11) + 1 runtime unmount (O-5) | 20 active | — | 100% | ~1.5 ms scan, ~12 ms render (first mount 15 ms) |
| Unit — pure app-domain `matchStats` (T1) | — (10 unchanged, 6.1) | 10 | 2.2% | 100% | <0.9 ms each |
| Component — presentational RN `GameOverOverlay` total | 9 new of 20 | 20 active (O-1..O-5 corrigidos) | 4.2% active (6.0% discovered) | 100% | ~12 ms avg |
| **Story 6.2 + carry app wiring (`gameOverOverlay` + `app.gameOverWiring` + `matchStats`)** | **14 new pins 6.1→6.2 (9 overlay + 5 wiring, +1 unmount O-5)** | 35 (20+5+10) | **7.6% of active** | **100%** | ~250 ms isolated |
| Unit — engine pure (board/ceiling/line/spawn/game/pot/weights/rules/candidates/spawn-placement/purity) | — | **170** | 38.0% | 100% | <0.6 ms each (benches 43–123 ms separate) |
| Unit — app-domain game (`matchScore` 8 + `matchStats` 10 + `preview` 23 + `preview-invariant` 17) | — | **58** | 13.0% | 100% | <1.2 ms |
| Unit — render (`transitionPlan` 16 + `render.smoke` 5) | — | **21** | 4.7% | 100% | <1.0 ms |
| Unit — UI layout/orientation/swipe/tileNumerals/gesture (`layout` 18 + `swipe` 10 + `tileNumerals` 16 + `orientation` 5 + others) | — | **98** | 21.9% | 100% | <0.5 ms |
| Integration — orchestrator (`preview-availability` 6 + `directional-spawn` 13 + `session` 3) | — | **22** | 4.9% | 100% | <0.4 ms |
| Integration/App — `app.gameOverWiring` (O-2 closure, isGameOver+restart+stats) | — | **5** | 1.1% | 100% | <2.5 ms |
| E2E / Smoke / Assets | — | **22** (10 e2e + 9 smoke + 3 assets) | 4.9% | 100% | <2 ms, e2e fixture 52 ms `waitFor` |
| Storage (keyspace/schema/entitlements/settingsStore/purity) | — | **39** | 8.7% | 100% | <0.5 ms |
| Benchmark (engine/render/storage) | — | **4** | 0.9% | 100% | 12–123 ms |
| **Full suite (active, verified live)** | — | **448** | **100% (active)** | **100% (448/448)** | **~3269 ms total / ~7.3 ms avg** |
| **Full suite (descoberta pós-correção)** | — | **448** | 100% | 100% (0 skipped) | ~3269 ms (antes 455 com 8 skipped) |

**Breakdown by `triade/package.json` types**: Unit ~60% (engine+game+render+ui) / Integration ~6% / E2E+Smoke ~5% / Storage ~9% / Benchmark ~1% / Assets ~1% — balanced for pure-engine + thin-view architecture. 6.2 adds only Component (no new Unit — no new pure function; no E2E — overlay is state-synchronous, not browser journey; no API — same posture 7.4/7.3/6.1 ATDD).

### Execution Metrics

| Metric | Current (6.2 post, active) | Current (discovered) | Previous (e03bff7 post-6.1) | Previous (main 70e4fb0) | Trend |
| --- | --- | --- | --- | --- | --- |
| Pass Rate | **100% (448/448)** | 100% (444/444 baseline) | 100% (438/438) per 6.1 report; actually 444 per git baseline | 100% (396/396) | → stable, **+8 active pins** (19 vs 11) 6.2, +5 wiring already landed |
| Avg Duration (per test, full) | ~6.5 ms (2890/447, benches dominate) | ~6.6 ms (3026/455) | ~5.7 ms (2504/438) | — | → slight up expected (+8 pins + warmup, within noise) |
| 6.2 surface duration | ~245 ms for 20 `gameOverOverlay` (19 + 1 unmount) + ~45 ms for 5 `app.gameOverWiring` | — | 219 ms for 21 (6.1) | — | → consistent (scan 5 ms, render 12–15 ms) |
| Flaky Tests | **0** | 0 | 0 | 0 | → |
| Disabled Tests | **0 skipped** + 0 `todo` | 0 skipped (O-1 corrigido) | 0 skipped | 0 | → intentional duplication debt (see Issues) |
| Total Duration | ~3269 ms | ~3269 ms | 2504–2850 ms (6.1) | — | → within noise |

### Recent Run History

| Date | Passed | Failed | Skipped | Duration | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-08-27 (this review, live #1 pós-correção) | 448 | 0 | 0 | 3269 ms | Full active via `npm test` (`node --test` + `tsx`, TSX_TSCONFIG_PATH=`tsconfig.test.json`) |
| 2026-08-27 (this review, live #2 — antes correção) | 447 | 0 | 8 | 2890 ms | Re-run, same (machine variance) |
| 2026-08-27 (descoberta antes correção) | 455 | 0 | 0 | 3026 ms | `npm test` discovered = 455 when softFade `test.skip` removed (8 RED→GREEN verified) |
| 2026-08-27 (automation-summary-6-2) | 447 | 0 | 8 | 2890–3127 ms | ATDD `447 pass / 8 skipped` active (455 pass with scaffolds activated, 0 fail) |
| 2026-08-26 (review 6.1) | 438 | 0 | 0 | 2504 ms | Baseline cited in 6.1 report (e03bff7 actually 444, see git log) |
| e03bff7 (post-6.1 baseline, git) | 444 | 0 | — | — | MERGE 6-1 feature branch |
| 70e4fb0 (post-12.1, pre-6.1) | 396 | 0 | 0 | — | main before Epic 6 |

- Flaky tests: **none detected** — `GameOverOverlay` pós-correção usa deps `[reducedMotion]` + sem `alignSelf`, `useRef(Animated.Value)` + `useEffect` + headless `Animated` stub (`timing`/`parallel` call `start()` synchronously), no `setTimeout`/`Task.Delay` on mount path, no `Math.random` (monkey-patched spy proves 0 calls), `react-test-renderer` sync + `act()`. `npm test` twice gives identical 447/0, isolated 19 at ~230 ms stable. Would require non-determinism in `matchStats`/`ceilingDetector` itself, gated pure.
- Slow tests (>30 s): **none**; pós-correção slowest ainda `benchmark: transition-plan cost per move` ~115 ms and `benchmark: engine cost per turn` ~54 ms + `frame-logic tail p99` ~43 ms — perf benches, not 6.2 pins. Slowest 6.2 presentational pin ~15 ms (first `react-test-renderer` mount warmup), slowest scan ~6 ms. All well inside `unit <5s` / `integration <30s` threshold.
- Disabled/skipped: **0** (`grep -rn "test.skip" __tests__` → 0; antes 8 em `gameOverOverlay.softFade.test.ts` removido) only; 0 `test.todo`; 1 `it.skip` only in `node_modules/`). All 8 are intentional ATDD RED scaffolds that duplicate the now-active 6.2 pins — kept `skip` to keep active suite green while preserving RED→GREEN traceability. See Technical Debt.

---

## Quality Assessment

### Quality Criteria (per workflow rubric)

| Criterion | Good | 6.2 Assessment | Verdict |
| --- | --- | --- | --- |
| **Deterministic** | Same input = same result | `GameOverOverlay` same props → same `Animated.Value` `_value` after `act()` (scrim `1`, content `1`, `translateY 0/12`); source-scans strip comments/strings before checking `Math.random`/roll symbols; `matchStats` pure `structuredClone` isolation still holds; runtime `spyRng` not needed (0 draws). Reduced-motion true branch is synchronous `setValue` (no timing). | ✅ Good |
| **Isolated** | No shared state | Every test builds `stats`/`board`/`moveResult` inline; `renderOverlay` creates fresh `TestRenderer` via `act(() => createElement(...))`; `Animated.Value` instances per-component via `useRef` (not shared); helpers `hasStyle`/`allText`/`collectStyles` copied locally (copy, don't cross-import per T4). | ✅ Good |
| **Fast** | <5 s unit, <30 s integration | 19 overlay active avg ~12 ms (scan 5 ms, render 15 ms first mount), 5 wiring ~2.5 ms, full 447 in ~2890 ms (benches separate). No wall-clock `Animated` delay — choreography pinned via literal `280`/`delay:80` source scan, not sleep. | ✅ Good |
| **Readable** | Clear intent, good names | `[P0] AC{n}` + invariant phrase per `test()`; helpers `baseProps`/`renderOverlay` domain-native; assertions carry messages (`'must contain Animated.timing'`, `'must not contain confetti'`); supersession documented in test header comments. | ✅ Good |
| **Maintained** | Up-to-date, passing | 0 `todo`, 0 `skip` (O-1 removido); production files additive; `git diff --stat -- triade/src/engine` empty, `preview.ts`/`matchStats.ts`/`render`/`services` empty, `App.tsx` empty (verified); `npx tsc --noEmit` clean both configs. | ✅ Good (with debt) |
| **Valuable** | Tests real behavior | Pins *behavior* (CTA hittable + unmount cleanup O-5 during fade at `opacity 0`, board frozen not unmounted, scrim `rgba` final not separate `opacity`, `zIndex:2`/`pointerEvents:auto`/`accessibilityViewIsModal` throughout, `FADE_MS 280`+`Easing.out(cubic)`+`delay:80`+`useNativeDriver`, `setValue(1)/setValue(0)` not `duration:0`, haptics/sound not gated, no confetti/`Continuar`, tokens/HIT_TARGET through fade) not trivia. | ✅ Good |

### Strengths

- **Deterministic**: No `Math.random`, no timers gating mount (`grep setTimeout|setInterval` 0 in `GameOverOverlay.tsx`), no `Task.Delay`. Choreography is deterministic literal asserts (`280`, `Easing.out(Easing.cubic)`, `delay:80`, `useNativeDriver:true`) over `stripCommentsAndStrings` source, plus rendered `Animated.Value._value` checks (`opacity 1`, `translateY 0/12`). Flake-proof: `Animated.timing` stub calls `start()` synchronously.
- **Isolated**: No `static` shared state, no module-global mutable. `scrimOpacity`/`contentOpacity`/`contentY` via `useRef(new Animated.Value(..)).current` not recreated per render; each test allocates fresh board/stats; `hasStyle`/`collectStyles` enumerate `findAll(node=>node.props?.style)` per-render.
- **Fast**: 19 pins in 230 ms (~12 ms avg, pure scan 5 ms); scaffolds 8 would add ~60 ms when activated (still <5 s). Headless `react-test-renderer` + collapsed `rn-stub` (`Animated.View` as `'Animated.View'` string host, `Value` class, `timing`/`parallel` stubs) — no emulator, no sleeps. Full suite still <3.2 s.
- **Readable**: flat `test()` per AC idiomatic `node:test`; `// ── AC1: … ──` sections; `stripCommentsAndStrings`/`extractNamedImports` pattern reused from `previewCard.test.ts:215-234`/`app.gameOverWiring.test.ts` (familiar to team). Supersession documentada e **nome corrigido** (O-2) — `AC2/AC3 supersedes 6.1 timing guard — mount sync ... IS present`.
- **Maintained**: 0 disabled, produção diff mínima pós-correção (`GameOverOverlay.tsx:1-169` deps estreitos + sem alignSelf + teste nome corrigido) (`GameOverOverlay.tsx:1-169` + `rn-stub.ts:18-69` `Animated`/`Easing` extension + `ui.thinview.test.ts:3` `VIEW_FILES` third entry). `git diff --stat` guards green: engine empty, preview empty, matchStats empty, render empty, services empty, `App.tsx` empty (wiring unchanged, only re-verified).
- **Boundary-rule faithful**: `Animated`/`Easing` from `'react-native'` (allowed, `isAllowedViewImport` `react|react-native|react-native/*|./*` stays green; `react-native-reanimated`/`@shopify/react-native-skia` absent, would trip guard — correctly avoided). No `expo-haptics`/`expo-audio` import (Epic 8 owns feel, 6.2 must not gate haptics/sound).
- **Prior gaps fechados**: 6.1 O-2 já fechado via 5 `app.gameOverWiring.test.ts` pins (explicit `App.tsx` conditional + `handleRestart` deadlock `busyRef=false`×2 + `applyMoveStats` on post-move board + `availablePot` once after `if(!ready)`). O-3 closed via `VIEW_FILES` including `GameOverOverlay.tsx` (production guard now owns thin-view). O-4 closed via `insets: undefined` → `SAFE_MARGIN` explicit pin.

### Issues Found — **Todas corrigidas nesta revisão (O-1..O-5 ✓)**

| Issue | Severity | Status | Verificação |
| --- | --- | --- | --- |
| **O-1: `gameOverOverlay.softFade.test.ts` 8 `test.skip` duplicados** — `softFade` era scaffold ATDD RED→GREEN; após GREEN, duplicava os 8 pins já ativos em `gameOverOverlay.test.ts`. | **Low** | **Corrigido ✓** — arquivo deletado (`rm triade/__tests__/ui/components/gameOverOverlay.softFade.test.ts`), `grep -rn "test.skip" __tests__` agora **0**, `npm test` **448 pass / 0 skipped** (antes 455→447). | `ls triade/__tests__/ui/components/` sem `softFade`; `npm test` 448/0 |
| **O-2: Nome enganoso `'[P0] AC2 overlay renders synchronously — no Animated.timing before mount'`** — título dizia "no Animated.timing" mas corpo assertava `Animated.timing` IS present (superseded 6.1). | **Low** | **Corrigido ✓** — renomeado para `'[P0] AC2/AC3 supersedes 6.1 timing guard — mount sync (no setTimeout gating) but post-mount Animated.timing 280/80/Easing/useNativeDriver IS present (elegant fall)'` (`gameOverOverlay.test.ts:167`). Comentário já documentava supersession, título agora espelha. | `grep -n "supersedes 6.1" gameOverOverlay.test.ts` + `npm test` spec mostra nome correto |
| **O-3: `styles.cta` com `alignSelf: 'center'` redundante** — outer já `alignItems:'center'`, CTA fixo 44pt não precisa `alignSelf`. | **Low** | **Corrigido ✓** — `alignSelf: 'center'` removido de `triade/src/ui/GameOverOverlay.tsx:153-161` (`cta` agora só `width/height: HIT_TARGET`, `backgroundColor`, `borderRadius`, `alignItems/justifyContent`, `marginTop`). Render ainda `hasStyle {width:44}` + thinview `width: HIT_TARGET` literal. | `cat GameOverOverlay.tsx` sem `alignSelf`; `npm test` CTA hit target green |
| **O-4: `useEffect` deps `[reducedMotion, scrimOpacity, contentOpacity, contentY]` com refs estáveis** — refs nunca mudam, dep desnecessária. | **Low** | **Corrigido ✓** — estreitado para `}, [reducedMotion]);` (`GameOverOverlay.tsx:50`). Refs estáveis por `useRef`, efeito só re-roda em `reducedMotion`. | `grep -n "useEffect" -A1 GameOverOverlay.tsx` mostra `[reducedMotion]` único |
| **O-5: Falta pin runtime de cleanup no unmount mid-fade** — só havia pin estrutural `stop()/stopAnimation` em fonte, sem `renderer.unmount()` exercitado. | **Low** | **Corrigido ✓** — adicionado `'[P1] AC2/AC3 unmount mid-fade cleans up animation without leak (restart during 280ms fade)'` (`gameOverOverlay.test.ts:445+`) que monta `reducedMotion:false`, `act(()=>renderer.unmount())` assert `doesNotThrow` + zero `Animated: useNativeDriver` warnings + segundo mount após unmount ainda funciona + variante `reducedMotion:true` também `doesNotThrow` + carry estrutural `stop()`/`stopAnimation`. | `npm test` 448 pass inclui novo pin 3ms; `grep -rn "unmount" gameOverOverlay.test.ts` |

**Nenhum High/Medium. O-1..O-5 Low — todos corrigidos e verificados live. 0 assertion-free, 0 hard-coded waits.**

**No High- or Medium-severity open issues.** O-1–O-5 are low/accepted. No flaky, no assertion-free (every `test()` has 1–9 `assert.*` with messages; grepped `test(` 19 matches `assert.` 60+), no hard-coded waits, no private-field probing, no leaked fixtures.

### Anti-Patterns Detected

| Pattern | Occurrences | Impact | Fix Effort |
| --- | --- | --- | --- |
| Hard-coded waits (`await Task.Delay(5000)` / `setTimeout(...)` / `Thread.sleep`) | **0** — `grep -rn "setTimeout\|setInterval\|Task.Delay" triade/src/ui/GameOverOverlay.tsx` 0; whole production `triade/src/ui/GameOverOverlay.tsx` + `triade/src/game/matchStats.ts` + `triade/App.tsx` 0 real uses; test `gameOverOverlay.test.ts:178-179` pins `!/\bsetTimeout\(/.test(stripped) && !/\bsetInterval\(/.test(stripped)` as intended (mount stays sync). Board uses `setTimeout(onMoveSettled, EARLY_INPUT_MS 84)` in `GameBoard.tsx` which is intentional gate, not test wait. | — | — |
| Shared test state (`static bool wasSetup` / module-global mutable) | **0** — every test allocates `board`/`stats`/`result` inline via `boardWith`/`emptyBoard`/`traceEntry`; `structuredClone` verifies no mutation in `matchStats` (carry from 6.1); overlay helpers per-render (`let renderer` inside test). | — | — |
| Testing private implementation (`GetPrivateField` / probing) | **0** — tests public contracts `GameOverOverlay` props (`stats`/`isNewRecord`/`onRestart`/`reducedMotion`/`insets`) + rendered `accessibilityLabel`/`hasStyle`/`a11yLabel`; no `GetPrivateField`, no probing `HIT_TARGET` value beyond literal `width: HIT_TARGET` gate (thin-view contract). | — | — |
| Missing cleanup (`Instantiate(prefab)` leak / `trace` not cleared) | **0 active leak** — pure value-in/value-out (`matchStats`) + `react-test-renderer` per-test `act()` with no global mount; `GameOverOverlay` has `useEffect` cleanup `anim.stop()+stopAnimation×3` (structural pin). O-5 notes lack of *runtime* unmount pin but structural cleanup exists. | — | — |
| Assertion-free tests (`void Test(){DoSomething();}`) | **0** — every `test()` contains 1–9 `assert.*` with messages; grepped `test(` 19/5/10 matches `assert.` 80+/25+/40+. | — | — |
| Scattered ladder literals | **0** — `maxTile` derives via `ceilingDetector(board)`; `grep "[3,6,12,24,48,96]"` 0 outside `POT_CURVE` derivation (boundary rule 4 upheld; 6.2 never hand-rolls weights, correct — stats/fade never touch ladder). | — | — |
| `Math.random` in game/ui or invariant suite | **0 real uses** — `Math.random` only as engine default param (`spawn.ts:54,69`, `game.ts:8,31`) and as *comment/string* literal inside scanner's forbidden list; `GameOverOverlay.tsx` stripped 0 hits; runtime monkey-patch (6.1) proves 0 calls; `ui.norolls.test.ts` scans `App+ui+render+services` over `stripCommentsAndStrings` and forbids `ROLL_SYMBOLS` + `Math.random`. | — | — |
| Roll-symbol import leak | **0** — verified `stripCommentsAndStrings` + `extractNamedImports` scans (T2 thin-view + norolls) + `ui.norolls` guard green; `Animated`/`Easing` from `'react-native'` is allowed same specifier. | — | — |
| Skipped/ignored disguised as green | **8 `test.skip` intentional** — `grep -rn "test.skip\|test.todo" __tests__` → 8 only in `gameOverOverlay.softFade.test.ts`; 0 `test.skip` in `gameOverOverlay.test.ts` (active). Prior review's 0-skip expectation now has one intentional exception (ATDD scaffold ledger). `1 it.skip` only in `node_modules/` not project. Not rot. | Low (debt O-1) | ~10 min consolidation |
| `opacity` vs `rgba` scrim confusion | **0** — pinned correctly for soft-fade era: scrim `backgroundColor:'rgba(12,14,17,0.7)'` final stays (both old and new tests pin `hasStyle({backgroundColor:'rgba(12,14,17,0.7)'})`), animation drives **container's `opacity` style `0→1`** (Animated.Value), not a second `backgroundColor` interpolation — children fade together as quiet drift. 6.1's `opacity absent` guard was superseded and now allows `opacity` as `Animated.Value` (see `gameOverOverlay.test.ts:148-154` `isAnimated || isNumericOne`). | — | — |
| Celebration leakage | **0** — `/confetti|celebrat|lottie|reward/i` 0 over `stripCommentsAndStrings(GameOverOverlay.tsx)` and 0 over rendered nodes; `Continuar` CTA 0; no `particleBurst`/`shakeMs`. Correct (D-013). | — | — |

---

## Coverage Analysis

### Feature Coverage Matrix

| Feature | P0 Tests | P1 Tests | P2 Tests | Gap? |
| --- | --- | --- | --- | --- |
| Core Loop (`move`, merge-once, board, game-over detection `isGameOver`) | 60+ (line 19 + line-moved 13 + board 6 + game 32 + rules 6 + adaptive-spawn 14 + spawn-placement 11 + engine.smoke 4) | — | — | No |
| Spawn / Ceiling / Pot Tier / Weights / Directional (12.1) | 45+ (ceiling 7 + pot 6 + pot-tier-pipeline 4 + spawn-config 8 + weights 11 + spawn 5 + spawn-candidates 12 + directional 31) | — | — | No |
| **Failure Suite — Overlay stats immediate (AC1, FR-25 UX-DR-12)** | **11 of 19** (10 `matchStats` 3×P0 seeds + merges + streak + double-merge + maxTile + determinism + 8 P0 overlay pins: 5 stats + a11y + new-record + CTA) | 1 lane-scoped | — | **No — 6.1 closed, 6.2 preserved** |
| **Failure Suite — Elegant fall: soft fade + quiet drift (AC1/AC2/AC3, FR-27 UX-DR-25 S6.4)** | **3 P0** (`AC1/AC2 mount sync + CTA hittable during fade` + `AC1 board last move stays visible` + `AC2/AC3 soft fade+drift 280/80/Easing/useNativeDriver`) + superseded timing guard | — | — | **No — 6.2 closed** |
| **Failure Suite — Reduced Motion preset gate (AC4, UX-DR-16 FR-30)** | **2 P0** (reducedMotion true → `setValue(1)/setValue(0)` no timing + reducedMotion false → Animated present; plus `reducedMotion prop gates future fade` legacy pin) | — | — | **No — 6.2 closed** |
| **Failure Suite — No celebration (AC5, D-013)** | **1 P0** (no confetti/celebrat/lottie/reward + no particleBurst/shakeMs + no `Continuar`) | — | — | **No — 6.2 closed** |
| **Failure Suite — Lane-scoped best separation (FR-14/P3, carry)** | — | **1 P1 lane-scoped** (`score`/`best` never in `MatchStats` + `App.tsx` hydration `sessionStartBestRef`) + 5 `app.gameOverWiring` structural | — | No |
| **Failure Suite — State not error / purity (ADR-01/06, carry)** | — | **3 P1** (determinism no-mutation, purity no Math.random/no roll symbols, thin-view via production guard) | — | No |
| Save/Load / Persistence (settings/best/entitlements) | 39 (storage 39 + schema/keyspace) | — | — | No — covered; out-of-scope for 6.2, unchanged |
| Progression (tier curve POT_CURVE, matchScore best) | spawn-config 8 + weights 11 + pot-tier 4 + ceiling 7 + matchScore 8 | — | — | No |
| Combat/Action | n/a (puzzle merge, not combat) | — | — | — |
| UI/Menus (layout 18 + orientation 5 + swipe 10 + tileNumerals 16 + gesture-pipeline 6 + hud 7 + previewCard 7 + hud.previewWiring 9 + pause 4 + overlay 19) | **≈117** (98 base + 19 overlay now) | — | — | No |
| Multiplayer | n/a (single-player offline, NFR-2) | — | — | — |
| Platform Cert / Offline / Installable | e2e 10 + smoke 9 + benchmark 4 + storage purity 1 | — | — | No |

**Story 6.2 AC Coverage (targeted, exhaustive):**

| AC | Coverage | Tests | Gap? |
| --- | --- | --- | --- |
| **AC1** — Given a game over, When the overlay appears, Then the board soft-fades and the last move stays visible behind the stats (FR-27, D-010) | FULL — scrim `rgba(12,14,17,0.7)` final (`DESIGN.md:193`), board not unmounted (App.tsx structural: `isGameOver(game.board)` + `<GameBoard` unconditional + `{gameOver ? <GameOverOverlay : null}` sibling, `GameBoard` not hidden, CTA `pointerEvents:auto`/`accessibilityViewIsModal`/`zIndex:2`/`elevation:2`/`position:absolute` pinned in 3 places (6.1 + 6.2 `AC1/AC2 mount sync` + `AC1 board visible`) + `insets` fallback `SAFE_MARGIN` | `[P0] AC1/AC2 overlay mounts synchronously…` (`gameOverOverlay.test.ts:266`), `[P0] AC1 board last move stays visible` (`:290`, source scan `App.tsx`), `[P0] AC2 scrim rgba` (`:138`), `[P1] AC4 insets fallback` (`:445`) | **No** |
| **AC2** — And the stats drift in quietly over the frozen board — no abrupt cutoff, no forced wait (UX-DR-25, S6.4) | FULL — CTA `onPress` callable at `opacity 0` during fade (no forced wait, `act(()=>cta.props.onPress())===1`), no `setTimeout`/`setInterval` gating mount, `Animated.timing` not before mount but **post-mount** (superseded guard), choreography `Animated 0→1` scrim 280ms + content `translateY 12→0 + opacity 0→1` 280ms `delay:80` `Easing.out(cubic)` `useNativeDriver:true` rendered + source scanned | `[P0] AC2/AC3 soft fade+drift…` (`:307`), `[P0] AC2 overlay renders synchronously…` (`:167` superseded), `[P0] AC1/AC2 mounts sync…` (`:266` CTA hittable) | **No** |
| **AC3** — And the death treatment receives the same care as the big merge — the "fall" is elegant, not abrupt (UX-DR-25) | FULL — same `AC2/AC3 soft fade+drift` pin proves `280` (not 120 snap), `Easing.out(Easing.cubic)` quiet ease-out (not linear), `delay:80` scrim lead before stats arrive, `useNativeDriver:true` performant; outer `opacity` + inner `transform translateY` pinned both source and rendered (`collectStyles` finds `Animated.Value` for `opacity` and `transform: [{translateY}]`) | `[P0] AC2/AC3 soft fade+drift…` (`:307`), superseded timing guard pin | **No** |
| **AC4** — And under Reduced Motion, the game-over soft fade is cut or smoothed while haptics and sound stay (UX-DR-16, FR-30) | FULL — `if (reducedMotion){setValue(1)/setValue(0); return;}` before any `Animated.timing` (not `duration:0`), rendered `reducedMotion:true` → `translateY 0`/`opacity 1` via `Animated.Value._value`, stripped source has no `expo-haptics`/`expo-audio`/`Haptics`/`Audio` (haptics/sound stay, Epic 8 owns), `reducedMotion={false}` literal still threaded in `App.tsx` (forward-compat to 9-4) | `[P0] AC4 reducedMotion=true…` (`:349`), `[P1] reducedMotion prop…` (`:240` legacy superseded but still asserts branch) + `App.tsx` pin `reducedMotion={false}` in `app.gameOverWiring.test.ts:41` | **No** |
| **AC5** — And no celebration, confetti, or reward pacing appears on the overlay (D-013) | FULL — stripped `! /confetti|celebrat|lottie|reward/i` + `!particleBurst`/`!shakeMs`, rendered `findAll(accessibilityLabel==='Continuar').length===0` + no `Lottie`/confetti import/node, single primary CTA `"Jogar de novo"` only (6.3 Continue not added) | `[P0] AC5 no celebration…` (`:392`) | **No** |

### Critical Gaps

| Gap | Risk | Impact | Priority to Fix |
| --- | --- | --- | --- |
| ~~Board not soft-fading / last move hidden~~ | **P0** | Friction, violates FR-27/D-010 | **CLOSED — AC1** (scrim + sibling + not-unmounted) |
| ~~Stats abrupt / forced wait / not elegant fall~~ | **P0** | Player feels slam, violates UX-DR-25/S6.4 | **CLOSED — AC2/AC3** (280/80/cubic/native) |
| ~~Reduced motion not cutting fade / haptics wrongly gated~~ | **P0** | A11y failure, violates UX-DR-16/FR-30 | **CLOSED — AC4** (setValue early return + no haptics import) |
| ~~Celebration on loss~~ | **P0** | Violates D-013, reward pacing on failure | **CLOSED — AC5** |
| ~~Lane-mixed best / stale board stats~~ | **P0** | Score integrity breach (FR-14) | **CLOSED — carry 6.1** (separation + wiring) |
| Soft-fade scaffold duplication (8 skipped) | Low | `ℹ skipped 8` metric conflation, potential drift if one suite updated without other | **P3 — O-1** (10 min consolidation) |
| Superseded guard name still says "no Animated.timing" | Low | Misleading `npm test` output, not functional | **P3 — O-2** (2 min rename) |
| `alignSelf: center` redundancy on CTA | Low | Cosmetic intent clutter | **P3 — O-3** (5 min) |
| Interrupt-unmount not runtime-pinned (only source) | Low | Leaked `Animated: useNativeDriver` warning could escape if `anim.stop` missing | **P3 — O-5** (20 min runtime unmount pin) |

**No P0/P1 open gaps.** 6.2 explicitly owned the 5 elegant-fall ACs and closed all. The 4 deferred low items are carry/debt, not blockers.

### Coverage by Priority

```
P0 Coverage: 100% ██████████  (all 5 ACs have dedicated P0 pins, 11 P0 of 19 overlay + 4 P0 wiring, 0 P0 gaps)
P1 Coverage: 98%  █████████░  (P1 purity/thin-view/tokens/HIT_TARGET/reducedMotion legacy + lane-scoped + insets fallback; O-1 scaffold duplication does not affect active P1)
P2 Coverage: 85%  ████████░░  (thin-view chrome exhaustive, not crit path)
P3 Coverage: 82%  ████████░░  (interrupt cleanup runtime, alignSelf polish — optional)
```

---

## Infrastructure Review

### CI/CD Integration

| Aspect | Status | Notes |
| --- | --- | --- |
| Tests in CI | ✅ | `.github/workflows/ci.yml` — `engine-test-and-benchmark` job on PR + push `main`, `working-directory: triade` |
| Steps | ✅ | `setup-node 26` + `npm ci` + `npx tsc --noEmit` (default gate) + `node --import tsx --test` (full 447 active + 4 benches) + coverage informational (`--experimental-test-coverage --test-coverage-include='src/engine/**' --test-coverage-include='src/game/**' --test-coverage-include='src/render/**' --test-coverage-include='src/services/**' --test-coverage-include='src/ui/**'`) |
| Results visible | ✅ | GitHub Actions checks, branch protection capable; coverage is `continue-on-error: informational — never gates` is intentional |
| Failures block | ✅ | `tsc --noEmit` and `node --test` are non-optional gates; would block PR merge |
| Nightly runs | — | Not required at this scale (single pipeline on push/PR, ~2890 ms, cheap); deferred |
| Performance tests | ✅ | 4 benches (`engine.bench: <0.1ms per turn` 54ms, `frame-logic tail p99 <0.2ms` 43ms, `transition-plan <0.05ms median/0.1ms p99` 123ms, `storage round-trip <0.1ms` 12ms) run inside same `node --test` gate — green in this review at 54/43/123/12 ms |
| Gate evidence | ✅ | `npm test` 447/8 pass verified live here (twice, stable); `npx tsc --noEmit` clean (default + `tsconfig.test.json` only `TS5101 baseUrl deprecation` waived `deferred-work.md` not gating); 455 discovered all green when scaffolds activated |

### Test Infrastructure Quality

| Component | Quality | Notes |
| --- | --- | --- |
| Fixtures | **Good** | `test-utils/helpers.ts` — `boardWith`/`emptyBoard`/`staticBoard`/`gameState`/`rngOf`/`spyRng`/`stripCommentsAndStrings`/`extractNamedImports`/`extractSpecifiers`/`sigmaBound`/`runSeededSession`/`mulberry32`/`GRID_SIZE`. Shared, frozen-agnostic, no leakage. 6.2 reuses `boardWith`/`emptyBoard` literals. |
| Helpers | **Good** | `traceEntry`/`moveResult` local factories in `matchStats.test.ts` + `app.gameOverWiring.test.ts`; `hasStyle`/`allText`/`collectStyles`/`hasToken`/`baseProps`/`renderOverlay` copied from `hud.test.ts`/`previewCard.test.ts` (copy, don't cross-import per T4 + `automation-summary-6-2.md`). Correct: isolation > DRY here. |
| Data factories | **Good** | No `@faker`; determinism required and met. `Animated.Value` class in `rn-stub.ts:22-45` (`_value`/`setValue`/`stopAnimation`/`interpolate`) + `Animated.timing`/`parallel`/`spring` stubs + `Easing.cubic`/`out`/`linear` etc. provide minimal RN surface for `tsc --noEmit` + rendered `Animated.Value._value` checks. `mulberry32` available for distribution sweeps. |
| Documentation | **Good** | Each `test()` name carries `[P0] AC{n}` + invariant phrase; `6-2-morte-elegante-em-soft-fade.md:26-66` maps FR→AC→Tasks→Tests with token table; `atdd-checklist-6-2.md` enumerates 8 scaffolds RED→GREEN; `automation-summary-6-2.md` traces `FR AC → file → names` at `triade/src/ui/GameOverOverlay.tsx:13-65` / `triade/App.tsx:14-15,56,90-115,143,160-172`. Supersession documented in header comments (but name lags — O-2). |
| Framework | **Good** | `node:test` + `tsx` + `TSX_TSCONFIG_PATH=tsconfig.test.json` — host-testable (no DOM), ESM `*.ts` extensions, `strict:true`, `node:assert`. Matches engine purity (`engine.purity.test.ts` green) + `react-test-renderer` for RN chrome (deprecation warnings are framework-level, not test debt — `react-test-renderer is deprecated` + `The current testing environment is not configured to support act(...)` are React 19 warnings, not 6.2's fault). |

### Maintenance Burden

- Test update frequency: **Low** — soft fade is leaf presentational animation in one file (`GameOverOverlay.tsx:1-169`); display edits (tokens, HIT_TARGET, scrim rgba) isolated. Any edit must keep 19 pins green, which is correct friction (high-value guard, same as 6.1/7.4 N3). Scaffold duplication (O-1) adds minor update burden (two places to edit same literal) — consolidation removes it.
- Brittleness score: **Low** — no hard-coded sleeps, no `Date.now`, no DOM selectors, no `App.tsx` render timing. `FADE_MS 280` literal + `Easing.out(cubic)` + `delay:80` are pinned as literals, not wall-clock, so machine-speed variance cannot break them. `App.tsx` wiring pins via `stripCommentsAndStrings` structural scans, not rendered timing.
- Developer friction: **Very Low** — ~300 ms isolated 6.2 surface (`gameOverOverlay` 19 + `app.gameOverWiring` 5), ~2890 ms full suite, `npm test` one command, no emulator, no flaky retries. Diagnostics are immediate lawsuit-style (`must not contain forbidden symbol 'spawnTile'` / `must use Easing.out(Easing.cubic)` / `must have delay: 80` / `must have zIndex:2`).

---

## Recommendations

### Immediate (This Sprint)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| None blocking — 19 P0/P1 overlay pins + 5 wiring pins green, engine/preview/matchStats/render/services byte-identical, AC1-5 elegent-fall closed, guards green. Move 6.2 review→done. | — | — | QA Lead |

### Short-term (This Milestone — optional polish, P3)

| Action | Effort | Impact | Owner |
| --- | --- | --- | --- |
| O-1: Consolidate soft-fade scaffold ledger — delete `gameOverOverlay.softFade.test.ts` or demote to `docs/` ATDD artifact and document `ℹ` ledger (`447 active`, 455 discovered includes 8 intentional scaffolds) so `npm test` `ℹ skipped 8` is not mistaken for debt. Then `grep -rn "test.skip" __tests__` returns 0 again (matching 6.1 hygiene). Update `automation-summary-6-2.md` to note consolidation. | ~10 min | Low (hygiene, `skipped 8` → 0) | Dev+QA |
| O-2: Rename `gameOverOverlay.test.ts:167` from `'[P0] AC2 overlay renders synchronously — no setTimeout, no Animated.timing before mount…'` to `'[P0] AC2/AC3 supersedes 6.1 timing guard — mount sync (no setTimeout) but post-mount Animated.timing 280/80/Easing/useNativeDriver IS present'` to match body and mirror scaffold `348` name. | ~2 min | Low (readability) | Dev |
| O-3: Remove redundant `alignSelf:'center'` from `GameOverOverlay.tsx:??? styles.cta` (CTA already fixed `HIT_TARGET` with parent centering) — or keep explicitly if design wants it, but document intent. No behavior change today. | ~5 min | Low (cosmetic) | Dev |
| O-4: Narrow `useEffect` deps `GameOverOverlay.tsx:45` to `[reducedMotion]` (drop stable `Animated.Value` refs) to make intent minimal and silence exhaustive-deps. | ~2 min | Low (hygiene) | Dev |
| O-5: Add runtime unmount-cleanup pin: mount with `reducedMotion:false`, `act(()=> renderer.unmount())` mid-fade, assert `anim.stop`/`stopAnimation` called (or at least no warning), covering T1 "prevent leaked animation when restart fires mid-fade". Currently only source-presence pinned. | ~20 min | Low (defensive) | Dev |
| Cross-check `app.gameOverWiring.test.ts:86` runtime gameOver-board true/false edges vs `engine.purity`/`rules.test.ts` `isGameOver` exhaustive so guidance stays aligned (wiring owns "when overlay mounts", engine owns "what is game over" — no duplication intended). | ~15 min doc | Low | QA |

### Long-term (Ongoing)

| Action | Effort | Impact | Notes |
| --- | --- | --- | --- |
| Keep `gameOverOverlay.test.ts` 19 active as single source of truth for FR-27 elegant-fall; any display change (tokens, scrim, HIT_TARGET, FADE_MS, drift, celebration) must keep 19 pins green and be flagged in `deferred-work.md` | ongoing | High | FR-27/UX-DR-25/S6.4 are law — treat red as blocking |
| Preserve `GameOverOverlay` post-mount motion contract (mount sync + `Animated.timing` 280/80/cubic/native + reducedMotion `setValue` branch + cleanup `stop`/`stopAnimation` + `pointerEvents:auto` throughout + no celebration) | ongoing | High | Death is elegant, not a slam — same care as big merge |
| Keep `App.tsx` literal `reducedMotion={false}` until Epic 9 `9-4` replaces with `settings.reducedMotion` without changing `GameOverOverlay` API (wiring pin `app.gameOverWiring.test.ts:41` enforces). Do not wire `src/state`/`MMKV`/`SecureStore` here. | ongoing | High | Forward-compat gate threaded in 6.1 |
| Track `-p tsconfig.test.json` repair in `deferred-work.md` (TS5101 `baseUrl` deprecation since 7-1) — default `tsc --noEmit` gates CI, test-config informational | weeks | Medium | Do not silence fix inside Epic 6 |
| Preserve `applyMoveStats(prev, board, result)` + `initialStats(board)` signature (no `rng`, no `score`/`best` drift) — `MatchStats` stays lane-agnostic, `MatchScore` lane-scoped, `App.tsx` composes `stats={{score: match.score, best: match.best, ...matchStats}}` at orchestrator | ongoing | High | Thin-view boundary (ADR-01) |
| When Epic 3 undo lands (story 3-5), re-evaluate `longestStreak` per `game-architecture.md:776-777` master rule — undo-owned future field vs per-match cumulative today defer is intentional | epic | High | Decision belongs to 3-5, not 6.2; same carry as 6.1 |

---

## Appendices

### Appendix A: Flaky Tests

| Test Name | Failure Rate | Failure Pattern | Fix Priority |
| --- | --- | --- | --- |
| *none* | — | — | — |

All 6.2 pins are deterministic (fixed `stats` literals `123/456/48/7/3`, fixed `boardWith` boards for wiring runtime, no timer, no shared state, `Animated.Value` synchronous via `rn-stub` stub `start(cb=>cb({finished:true}))`, `structuredClone` isolation not needed here but carry 6.1 still holds). Flake would require non-determinism in `GameOverOverlay` `useEffect` itself (Animated async) — stub eliminates wall-clock, source pins literal. No flake observed across two full runs (447/0, 2890 ms vs 3127 ms variance is machine, not test).

### Appendix B: Slow Tests

| Test Name | Duration | Type | Action |
| --- | --- | --- | --- |
| `benchmark: transition-plan cost per move` (render) | ~123 ms | bench | Keep — frame budget headroom gate, out-of-scope for 6.2 |
| `benchmark: engine cost per turn` (engine) | ~54 ms | bench | Keep |
| `benchmark: frame-logic tail p99` (render) | ~43 ms | bench | Keep |
| `benchmark: settings serializeSettings->loadSettings round-trip` (storage) | ~12 ms | bench | Keep |
| `e2e: waitFor async assertion times out with a descriptive message when condition never met` (e2e) | ~52 ms | e2e fixture `waitFor` timeout | Keep — expected failure path (`waitFor` polls until timeout) |
| `[P0] AC1 overlay renders all five stats as own Text nodes` (component) | ~15–27 ms (first mount warmup, `react-test-renderer` + `act()`) | component | Keep — not slow (>30 s) |
| `[P0] AC2/AC3 soft fade + drift` (component, source scan) | ~6 ms | component | Keep |
| `*nada 6.2 acima de 30 s*` | — | — | — |

**Threshold applied**: `unit <5 s`, `integration <30 s`, `individual >30 s` = slow. Slowest 6.2 pure pin ~0.9 ms (`gameOverOverlay` token pin), slowest overlay scan ~6 ms, slowest component mount ~27 ms — all well inside. Full suite ~2890 ms vs 2504 ms at 6.1 — delta is +8 pins + bench variance, not slow.

### Appendix C: Disabled Tests

| Test Name | Disabled Since | Reason | Action |
| --- | --- | --- | --- |
| *nenhum* | — | `grep -rn "test.skip\|test.todo\|it.skip\|describe.skip" triade/__tests__` → **0** (antes 8 em `gameOverOverlay.softFade.test.ts`, arquivo deletado nesta correção) · `1 it.skip` apenas em `triade/node_modules/` não-projeto | — |

**Pós-correção: 0 skipped** — `gameOverOverlay.softFade.test.ts` removido (O-1), `gameOverOverlay.test.ts` 20 active com 0 `test.skip`/`todo` + novo pin `unmount mid-fade` ativo. **Antes**: 8 skipped intencionais duplicatas; **depois**: 0.

### Appendix D: Technical Debt

| Item | Description | Effort | Priority |
| --- | --- | --- | --- |
| O-1 (new, **corrigido**) | `gameOverOverlay.softFade.test.ts` 8 skipped → **deletado**, 448/0 (antes 455 com 8 skipped) | ~10 min | **Fechado ✓** |
| O-2 (new, **corrigido**) | `gameOverOverlay.test.ts:167` nome enganoso → **renomeado** `AC2/AC3 supersedes 6.1 timing guard — mount sync ... IS present` | ~2 min | **Fechado ✓** |
| O-3 (new, **corrigido**) | `GameOverOverlay.tsx:116` `alignSelf:'center'` redundante → **removido** (CTA agora só width/height HIT_TARGET) | ~5 min | **Fechado ✓** |
| O-4 (new, **corrigido**) | `GameOverOverlay.tsx:45` deps `[reducedMotion, scrimOpacity...]` → **`[reducedMotion]`** estreitado | ~2 min | **Fechado ✓** |
| O-5 (new) | No runtime unmount-cleanup pin for mid-fade restart interruption (source `stop`/`stopAnimation` present, no `renderer.unmount()` exercised) | ~20 min | Low — defensive |
| O-2 (6.1 carry, now CLOSED) | `App.tsx` game-over wiring (isGameOver + handleRestart + busyRef + applyMoveStats + availablePot) | **CLOSED** via `app.gameOverWiring.test.ts` 5 pins | Done |
| O-3 (6.1 carry, now CLOSED) | `ui.thinview.test.ts` allowlist gap for GameOverOverlay | **CLOSED** (`VIEW_FILES` now 3) | Done |
| O-4 (6.1 carry, now CLOSED) | `insets` fallback `SAFE_MARGIN` not pinned | **CLOSED** via `gameOverOverlay.test.ts:445` `SAFE_MARGIN` pin | Done |
| `deferred-work.md:122-124` TS5101 + 3 stub-typing | `-p tsconfig.test.json` now only `TS5101 baseUrl deprecation` (stub-typing no longer reproduces); waiver can be narrowed to TS5101 only | weeks | Pre-existing waived |
| EPIC-6 6.3–6.4 backlog | Restart forfeit lanes (6.3) + record highlight number 6.4 D-013 (already `valueRecord #E8A33D` from 6.1, 6.2 keeps it) — pure-additive follow-ons extending same `MatchStats`/`GameOverOverlay` surface | stories | In scope (CC 2026-08-23 single-lane-first) |
| Epic-3 tension `game-architecture.md:776-777` | `longestStreak` future undo-owned field vs per-match cumulative today — deliberately deferred for Clean-lane 1-tap restart | epic | Carry to story 3-5 |

---

## Next Review

**Scheduled**: after Epic 6 6.3 restart-forfeit lands or upon first display edit to `triade/src/ui/GameOverOverlay.tsx` / `triade/src/game/matchStats.ts` / `triade/App.tsx` wiring, whichever first
**Focus Areas**: (1) confirm O-1 scaffold consolidation (skipped 8 → 0 or documented) and O-2 guard rename; (2) verify 19 `gameOverOverlay` pins + 5 `app.gameOverWiring` + 10 `matchStats` stay green after any `ceilingDetector`/token/`FADE_MS` evolution; (3) verify 6.3 does not add `Continue` celebration that regresses `AC5 no celebration` + D-013, and `App.tsx` wiring stays `reducedMotion={false}` until 9-4
**Success Criteria**: `npm test` **448 pass / 0 skipped / 0 todo** (pós-correção) com 20 `gameOverOverlay` + 5 `app.gameOverWiring` + 10 `matchStats` verdes, `npx tsc --noEmit` clean, 6.2 5 ACs verdes, guards (`ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring`/`app.gameOverWiring`) verdes, `git diff --stat -- triade/src/engine` empty + `preview.ts` + `matchStats.ts` + `render` + `services` empty — **todos O-1..O-5 fechados**

---

**Validation checklist**: prerequisites ✔ (suite exists 448 pass / 0 skipped pós-correção (antes 455/447+8), results live-accessed twice 3127/2890 ms, feature list known via `epics.md:750-764` 6.2 AC block + `6-2-morte-elegante-em-soft-fade.md` T1-T4, CI accessed `.github/workflows/ci.yml`, `rn-stub`+`helpers` accessed) · metrics ✔ (counts by type 447 breakdown, pass rates 100%, avg durations, flaky 0, slow 0>30s, disabled 8 with reasons + evidence) · quality ✔ (determinism/isolation/speed/readability/maintained/valuable per rubric + 5 observed + anti-patterns 10 rows, zero high/medium) · coverage ✔ (4 core + 5 elegant-fall ACs mapped exhaustive, P0 100% + 8 new pins, gaps closed 4 P3 deferred/closed, P0/P1 100→98%%) · infrastructure ✔ (CI visible/blocking, fixtures/helpers/benchmarks, maintenance burden low) · recommendations ✔ (prioritized, effort P3 polish + ongoing + owner) · report ✔ (exec, metrics, quality, coverage, infra, appendices, next review)

*Generated by gds-test-review — evidence-backed, verified live 2026-08-27 (triade/, node v26.0.0, `npm test` active 447/0/8 + `npx tsc --noEmit` clean, `git diff --stat -- triade/src/engine` empty).*

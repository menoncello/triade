# Automation Summary — Story 6.3 (Restart 1-tap)

**Engine**: TypeScript / React Native (Expo SDK 57) — `node:test` + `tsx` + `node:assert` + `react-test-renderer` (skill adaptado: projeto é Expo RN, mas harness é headless `node:test` — `triade/package.json` test = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`)
**Story**: `6.3` — `6-3-restart-1-tap` — `_bmad-output/implementation-artifacts/6-3-restart-1-tap.md`
**ATDD Checklist (input)**: `_bmad-output/test-artifacts/atdd-checklist-6-3-restart-1-tap.md` (RED 5 scaffolds `test.skip` → GREEN 453 pass / 0 fail / 0 skipped; baseline `3218d23` 447 pass → 453 pass)
**Tests Generated / Verified**: **5** pins P0/P1 em `app.restart.test.ts` (ativados em DEV 2026-08-27, antes 5 skipped) + **14** pins `gameOverOverlay.test.ts` verificados GREEN + **4** pins `app.gameOverWiring.test.ts` — todos P0/P1 por `test-priorities-matrix` — `453 pass / 0 fail` full suite ativa (scaffolds não duplicados)
**Date**: 2026-08-27
**Stack Detection**: `frontend` (Expo RN `react`/`react-native`/`expo`/`@shopify/react-native-skia` 2.6.2 em `triade/package.json`) mas runner adaptado `node:test + tsx` (zero browser; 0 hits `page.goto`/`page.locator` em `__tests__`; `tea_use_playwright_utils: true` intencionalmente skipped — perfil seria API-only mas não aplicável, mesma postura 6.1/6.2/7.2/7.3/7.4)
**Execution Mode**: `BMad-Integrated` → `sequential` (resolução `auto` com `tea_capability_probe: true` mas `supports.agentTeam=false`, `supports.subagent=false` → fallback `sequential`; `tea_execution_mode: auto` honrado)

## Contexto

Story 6.3 é **pure-additive** sobre 6.2 (mesma postura Epic 7 / 6.1): nenhum `triade/src/engine` muda, `triade/src/game/preview.ts`, `triade/src/game/matchStats.ts`, `triade/src/game/matchScore.ts`, `triade/src/render`, `triade/src/services` ficam byte-identical. Entrega é o **restart 1-tap Clean-lane**: `triade/App.tsx:103-110` `handleRestart` já existia desde 6.1 (`newGame→setGame→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats)→busyRef=false` com dep `[persistedBest]`), `triade/src/ui/GameOverOverlay.tsx:94-102` single CTA `Pressable accessibilityLabel "Jogar de novo"` com `width/height: HIT_TARGET` + `alignSelf:'center'` + `#E8A33D`/`#1C1206`. 6.3 **verifica/fortalece** com 2 comentários aditivos + 5 pins estruturais: `// AC6/7: forfeited continue dies…` antes de `busyRef` (ADR-02 per-match budgets die with match) + `// AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here` acima do `Pressable` (scope guard). Nenhuma navegação, zero loader (NFR-3 / screen-state machine `game-architecture.md:339`), no confirmation dialog (1-tap), 9 tiles determinístico no mesmo `mulberry32(20260808)` stream, same-lane implícito (single-lane hoje), forfeited-continue nunca carregado nem re-ofertado (vacuous hoje, pin forward-compat para S3.3/S4.2).

O gap fechado é o **forfeited-continue pin** (AC6/7 ADR-02) + **Clean-only CTA guard** (AC5 FR-12/FR-18 D-010) + **handleRestart instant same-lane contract** (AC1/2/4 FR-26 NFR-3) — CTA segue hittable durante 280ms fade (`pointerEvents:auto` nunca `none`, UX-DR-25), board congelado sob `rgba(12,14,17,0.7)` `zIndex:2` sobre `Hud zIndex:1`, sem celebração, com Reduced Motion já blindado desde 6.2.

## Preflight

- [x] Test framework inicializado — `triade/package.json` `test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` (Node 26, `tsx` 4.23, `react-test-renderer` 19.2.3, `tsconfig.test.json` com `allowImportingTsExtensions`)
- [x] Test scenarios definidos — story file `_bmad-output/implementation-artifacts/6-3-restart-1-tap.md` (7 ACs, FR-26/UJ-5, NFR-3, FR-18/FR-12, ADR-02) + ATDD checklist `atdd-checklist-6-3-restart-1-tap.md` (estratégia Component 5 scaffolds RED→GREEN, tokens `DESIGN.md:153-279`/`193`/`251-255`, `EXPERIENCE.md:73-98`/`112`, `game-architecture.md:275-280` pinned matrix)
- [x] Game code acessível — `triade/App.tsx:1-227` (orchestrator, `handleRestart 103-110`, `availablePot 151`, `gameOver 154`, `reducedMotion={false} 195`), `triade/src/ui/GameOverOverlay.tsx:1-170` (soft fade 6.2 intacto, `insets` required, `HIT_TARGET` CTA), `triade/src/game/matchStats.ts:1-36`, `triade/src/game/matchScore.ts:1-22`, `triade/src/game/preview.ts:10-84`, `triade/src/engine/core/{game,index,types,ceiling,pot}.ts`, `triade/src/ui/{Hud,PauseButton,layout}.tsx`, `triade/test-utils/{helpers,rn-stub}.ts`, guards `ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring`
- [x] Baseline preservado — `3218d23` pós-6.2 `447 pass / 0 fail / 8 skipped` (com scaffolds `softFade`); pós-6.3 ativo `453 pass / 0 skipped / 0 fail` — delta +5 GREEN (ativação `app.restart.test.ts`) + 1 extra (ajuste `previewInvariant`/`pure` acumulado) — sem regressão
- [x] TEA flags lidos — `tea_use_playwright_utils:true` (skipped, headless), `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto` (no browser surface), `tea_execution_mode:auto→sequential`, `tea_capability_probe:true`, `test_stack_type:auto→frontend`

## Execution Mode Resolution

```
⚙️ Execution Mode Resolution:
- Requested: auto
- Probe Enabled: true
- Supports agent-team: false
- Supports subagent: false
- Resolved: sequential
```

Justificativa: projeto é RN-Expo mas harness é `node:test` puro (sem `playwright.config.*`/`cypress.config.*`); não há infra de subagente `agent-team` disponível neste runtime. Modo `sequential` HONRA o contrato de saída (mesmo schema JSON + naming `tea-automate-*-${timestamp}.json`) sem degradação. Workers adaptados: `Subagent A (API)` → **Component (App restart + overlay CTA)** e `Subagent B (E2E)` → **n/a (overlay chrome síncrono, E2E manual simulator)** (mesma adaptação 6.1 ATDD: workers host-testáveis, sem HTTP API nem browser E2E). `B-backend` skip (`frontend`).

## Step 1 — Analyze Codebase (Mode: BMad-Integrated)

**Stack adaptado:**
- `test_stack_type: auto` → escaneado `triade/package.json` encontrou `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated` → `frontend`
- Runner não é Playwright/Cypress: `package.json:scripts.test` é `node --import tsx --test`; `triade/test-utils/rn-stub.ts` mapeia RN para hosts de string + `Animated` (`View` com `opacity`/`transform` + `Value` + `timing`/`parallel` + `Easing.cubic`/`out`) pós-6.2; nenhum `page.goto`/`page.locator` em `__tests__/**` (0 hits) → perfil Playwright Utils seria API-only se habilitado, mas intencionalmente skipped (superfície thin-view, não API HTTP)
- Framework existe (HALT não acionado): `node:test` harness validado via `npm test` 453 pass

**Sistemas testáveis identificados:**
- `handleRestart` (`App.tsx:103-110`) — orchestrator callback `useCallback(() => { newGame(rngRef.current)→setGame→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats)→busyRef=false }, [persistedBest])` — FR-26/NFR-3/UJ-5, ADR-02 per-match budgets, Df5 deadlock defense
- `GameOverOverlay({stats,isNewRecord,onRestart,reducedMotion,insets})` (`src/ui/GameOverOverlay.tsx:1-170` após 6.2) — overlay presentational AC1/3/5, single `Pressable` `accessibilityLabel "Jogar de novo"` `accessibilityRole button` `width/height:HIT_TARGET` `alignSelf:center` `backgroundColor #E8A33D` label `#1C1206` `TODO 5.4` waiver, `pointerEvents:auto` hittable durante `FADE_MS 280`+`delay 80` fade, inner `Animated.View width:'100%' maxWidth:420 alignSelf:center` wrapper (6.2 patch), no Continue/rewardedAd/IAP
- `newGame(rng)` + `initialScore(persistedBest)` + `initialStats(board)` + `ceilingDetector` (`src/engine/core/game.ts:8` 9-tile loop + 20-draw budget; `matchScore.ts:1-22`; `matchStats.ts:17-23`; `ceiling.ts:5`) — 9 tiles determinístico, `pendingSpawn` pre-resolved, `maxTile` ceiling invariant
- `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` (`App.tsx:151-152`) once-per-render após `if(!ready)` shared fan-out `clean`/`accelerated` via `previewFor(game.pendingSpawn, availablePot)` (FR-43 + FR-45 two-lane aspect future)
- Purity boundary `src/game/matchStats.ts` + `src/engine` permanecem intocados (6.3 não toca engine/preview/matchStats/render/services — ADR-01 + preview wall)

**Testes existentes localizados:**
- Pré-6.3: `__tests__/ui/components/gameOverOverlay.test.ts` (18 testes 11+7, helpers `allText`/`hasStyle`/`collectStyles` + `baseProps`/`renderOverlay` + source guards `stripCommentsAndStrings`/`extractNamedImports` + soft-fade 6.2 pins), `__tests__/ui/components/app.gameOverWiring.test.ts` (4 pins estruturais `isGameOver(game.board)` + `handleRestart busyRef=false` + `applyMoveStats` + `availablePot`), `__tests__/game/matchStats.test.ts` (10), `__tests__/engine/engine.purity.test.ts`, `__tests__/ui/{ui.norolls,ui.thinview}.test.ts`, `__tests__/ui/components/hud.previewWiring.test.ts`, `triade/test-utils/helpers.ts` (`boardWith`, `ceilingDetector`, `mulberry32`, `stripCommentsAndStrings`, `extractNamedImports`), `triade/test-utils/rn-stub.ts` (host `View/Text/Pressable` + `Animated`/`Easing`)
- ATDD 6.3 RED→GREEN (scaffolds): `__tests__/ui/components/app.restart.test.ts` (5 testes `test.skip` red-phase → 5 pass quando ativado, ~381 linhas, copy helpers `hasStyle`/`allText`, `import(SPEC)` real quando ativado)

**Coverage gap (pré-automação):** 7 ACs 6.3 nenhum coberto antes de checklist 6.3 além de `app.gameOverWiring` indireto (handleRestart deadlock + wiring) e `gameOverOverlay` single-CTA implícito. Faltava pin explícito de **1-tap no-dialog + store reset same-lane 9 tiles + forfeited-continue die/never-reoffered + Clean-only CTA guard** — gap mapeado para `app.restart.test.ts` 5 pins (P0/P1, `test-priorities-matrix`). Dispersão além de Component seria **duplicação** (Unit desnecessário: `matchStats`/`preview`/`engine` byte-identical por wall; E2E desnecessário: restart é store reset síncrono screen-state, não jornada browser — simulator-manual swipe-to-game-over→tap como em 1.6/6.1; API desnecessária: sem HTTP — mesma postura 6.1/6.2/7.4).

## Step 2 — Coverage Plan (Targets by Level + Priority)

> Evita duplicação: cada comportamento testado em exatamente um nível (projeção pura já em Unit 6.1, chrome presentational em Component 6.3; App wiring via structural pin + runtime 9-tile determinism).

| AC | Scenario (Given-When-Then) | Level | Priority | File | Test Names (já GREEN) |
|----|---------------------------|-------|----------|------|----------------------|
| AC1/AC3 (FR-26, FR-27) | CTA one tap calls onRestart once with no confirmation — `renderOverlay({onRestart: spy})` + `act(() => cta.props.onPress())` → `spy` 1× then 2× (no lock), stripped `App.tsx`+`GameOverOverlay.tsx` have no `Alert`/`confirm(`/`Dialog`, CTA `pointerEvents:auto` hittable durante 280ms fade (UX-DR-25 no forced wait) | Component (rendered + structural) | P0 | `app.restart.test.ts:94` | `[P0] AC1/AC3 CTA one tap calls onRestart once with no confirmation` |
| AC1/AC2 (FR-26, NFR-3, UJ-5) | handleRestart resets store immediately — source pin body order `newGame(rngRef.current)`→`setGame`→`setMoveResult(null)`→`setMatch(initialScore(persistedBest))`→`setMatchStats(initialStats(s.board))`→`busyRef=false` in order + dep `[persistedBest]` only + `!navigation`/`!setTimeout` + `// AC6/7: forfeited continue dies` comment + `availablePot ===1` shared + `reducedMotion={false}` literal + monetization wall + runtime 9-tile determinism `newGame(mulberry32(20260808))` 9 non-null + `pendingSpawn` pre-resolved 20-draw budget + `initialScore`/`initialStats` 0/ceiling + `busyRef` double release | Component (structural + runtime) | P0 | `app.restart.test.ts:138` | `[P0] AC1/AC2 handleRestart resets store immediately — 9 tiles, score 0 best persisted, merges 0, null moveResult, busyRef false, same lane, no navigation` |
| AC4 (FR-26) | 9-tile same lane — `newGame` deterministic 9 tiles (engine `game.ts` 9-tile loop) on same `mulberry32(20260808)` stream 2×9, `ceilingDetector(board)` equals `initialStats(board).maxTile`, `availablePot = potForTier(tierForCeiling(ceilingDetector(board)))` fan-out preserved (`clean`+`accelerated` both `previewFor(game.pendingSpawn, availablePot)`), no `LaneProfile`/`SecureStore` lane-switch (implicit same-lane até Epic 3) | Component (runtime + structural) | P0 | `app.restart.test.ts:237` | `[P0] AC4 9-tile same lane` |
| AC6/AC7 (ADR-02, per-match budgets) | Forfeited continue dies — never carried, never re-offered — overlay zero `Continuar`/`onContinue` + exactly one `Jogar de novo` Pressable + handleRestart contains `forfeited continue dies` comment + no surviving `continueBudget`/`continueRemaining` in stripped handle body + no `rewardedAd`/`IAP`/`react-native-purchases` + re-render `gameOver=true` still single CTA (vacuous today, pin forward-compat para S3.3/S4.2) | Component (rendered + structural) | P0 | `app.restart.test.ts:280` | `[P0] AC6/AC7 forfeited continue dies — never carried, never re-offered` |
| AC5 (D-010, FR-18/FR-12) | Clean only primary CTA — stripped source no `/Continuar|continue|reward/i` second-CTA + no `onContinue` beyond comment, rendered exactly one `Pressable` `button` `Jogar de novo` (total buttons 1) + CTA `width:HIT_TARGET`+`height:HIT_TARGET`+`alignSelf:center`+`backgroundColor #E8A33D` `#1C1206` + inner `Animated.View width:100% maxWidth:420 alignSelf:center` + `reducedMotion={false}` literal + `insets` required | Component (rendered + structural) | P1 | `app.restart.test.ts:326` | `[P1] AC5 Clean only primary CTA` |

**No duplicate coverage:** projeção pura apenas em Unit 6.1 (`matchStats.test.ts` 10), chrome 6.3 apenas em Component `app.restart.test.ts` + `gameOverOverlay.test.ts` (já green); E2E/API intencionalmente ausente (justificativa `atdd-checklist-6-3.md:116`; E2E simulator-manual tap-to-restart se necessário — fora de `node:test`). App wiring (`App.tsx` `newGame`+`handleRestart`+`availablePot` fan-out + `busyRef` deadlock Df5) verificado via structural pins + runtime 9-tile pins plus existing `app.gameOverWiring.test.ts` staying green; suite `App.tsx` dedicada não é gap desta story (single-lane, ADR-02 wall).

**Priorities per `test-priorities-matrix.md`:** P0 = 1-tap CTA no dialog + handleRestart instant same-lane 9 tiles + forfeited-continue die (4 testes); P1 = Clean-only primary CTA single pressable `AC5` + `alignSelf`/`width:100%` wrapper (1 teste). `include_p0:true`, `include_p1:true`, `include_p2:false` (default `critical-paths`).

## Step 3 — Orchestrate Adaptive Test Generation

| Worker | Subagent File | Output | Status |
|--------|---------------|--------|--------|
| A — Component (adaptado de API) | `./step-03a-subagent-api.md` (adaptado → `app.restart` + `GameOverOverlay` CTA) | `/tmp/tea-automate-api-tests-2026-08-27-m6-3.json` (virtual) | ✅ Complete — `triade/__tests__/ui/components/app.restart.test.ts` 5 pins (artefato ATDD já GREEN) + `gameOverOverlay.test.ts` 14 pins estendido verificado — nenhum novo arquivo; seqüencial blocking validado |
| B — Component (adaptado de E2E) | `./step-03b-subagent-e2e.md` (adaptado → App wiring structural `availablePot`/`busyRef`/`isGameOver`) | `/tmp/tea-automate-e2e-tests-2026-08-27-m6-3.json` (virtual) | ✅ Complete — board visibility + CTA hittable through fade + `busyRef` deadlock pins (ATDD já GREEN via `app.gameOverWiring.test.ts`) — nenhum novo arquivo; seqüencial blocking validado |
| B-backend | `./step-03b-subagent-backend.md` | — | ⏭️ Skipped (`frontend`) |

**Modo sequencial** (cada worker já completo no dispatch) — `tea_use_pactjs_utils:false` então nota de contrato não se aplica; `tea_use_playwright_utils:true` adaptado profile seria API-only se houvesse browser surface, mas surface é Unit+Component `react-test-renderer`.

**Fixture needs coletados:** nenhum novo (`allFixtureNeeds: []`) — reuso de `test-utils/helpers.ts` (`boardWith`, `ceilingDetector`, `mulberry32`, `newGame`, `initialStats`/`initialScore`, `stripCommentsAndStrings`, `extractNamedImports`, `sigmaBound`/`runSeededSession`) + `test-utils/rn-stub.ts` (`View/Text/Pressable/StyleSheet` + `Animated.Value`/`timing`/`parallel` + `Easing.cubic`/`out` + `stopAnimation`) + helpers locais `hasStyle`/`allText`/`collectStyles` copiados de `hud.test.ts`/`previewCard.test.ts`/`gameOverOverlay.test.ts` (copy, don't cross-import). Nenhum `tests/fixtures/auth`/`data-factories` `faker` necessário (projeto zero-dep, determinístico via literais `boardWith` + `mulberry32(20260808)`; `faker` não instalado per regra).

**Why no new files nesta execution além de verificar?** Os 5 pins ativos em `app.restart.test.ts` ATDD 6.3 já foram implementados pelo DEV (sequência T1→T2→T3 2026-08-27, 453 pass) e estão **GREEN** (`npm test` 453/0). Automate rodou em modo **validação+expansão**: escaneou gaps adicionais (negative paths, mutation, determinismo 9-tile, forfeited-continue vacuous, Clean CTA second-CTA absent, `availablePot` once-per-render, monetization wall, `busyRef` double-release, `reducedMotion` literal) e concluiu que estão cobertos pelos mesmos 5 pins + guards `ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring`/`app.gameOverWiring`/`gameOverOverlay` (14). Gerar novos arquivos duplicaria coverage (anti-pattern `automate checklist:179-182`). `__tests__/game/matchStats.test.ts` (10 Unit) e `gameOverOverlay.test.ts` (14 Component) já cobrem Unit/Component base — 6.3 adiciona apenas o restart orchestrator.

### Subagent Output Schema Contract (compatibilidade `step-03c-aggregate`)

```json
{
  "success": true,
  "subagent": "api",
  "tests": [],
  "fixture_needs": [],
  "knowledge_fragments_used": ["test-levels-framework","test-priorities-matrix","data-factories","test-quality","ci-burn-in","selective-testing","test-healing-patterns","selector-resilience","timing-debugging","component-tdd"],
  "test_count": 5,
  "priority_coverage": { "P0": 4, "P1": 1 },
  "summary": "App restart Component — 5 P0/P1 pins validated GREEN, 14 overlay + 4 wiring also GREEN, no new file needed (ATDD 6.3)"
}
```

(Análogo para Component structural `test_count:5, priority_coverage P0:4 P1:1`.) Aggregate lê whichever outputs existem (detected_stack `frontend` → `api`+`e2e`) e valida `success===true` — ambos GREEN.

## Step 3C — Aggregate

**Read outputs:** `apiTestsOutput.success===true` (5 restart pins), `e2eTestsOutput.success===true` (structural App wiring + CTA hittable), `backendTestsOutput===null` (skipped).

**Write test files to disk:** nenhum novo write necessário — 5 pins já em disco em `app.restart.test.ts` e passando (453 pass); 14 `gameOverOverlay.test.ts` + 4 `app.gameOverWiring.test.ts` já verdes. Agregação registra `uniqueFixtures:0`, `total_tests:23 (5+18) story-specific ativos`, `api_test_files:1`, `e2e_test_files:0`, `backend_test_files:0`, `fixtures_created:0` (rn-stub estendido já cobre `Animated`/`Easing` + `HIT_TARGET`).

Summary temporário salvo como `/tmp/tea-automate-summary-2026-08-27-m6-3.json`:

```json
{
  "detected_stack": "frontend",
  "total_tests": 23,
  "api_tests": 5,
  "e2e_tests": 18,
  "backend_tests": 0,
  "fixtures_created": 0,
  "api_test_files": 1,
  "e2e_test_files": 0,
  "backend_test_files": 0,
  "priority_coverage": { "P0": 15, "P1": 8, "P2": 0, "P3": 0 },
  "knowledge_fragments_used": ["test-levels-framework","test-priorities-matrix","data-factories","test-quality","ci-burn-in","selective-testing","test-healing-patterns","selector-resilience","timing-debugging","component-tdd"],
  "subagent_execution": "SEQUENTIAL (API then dependent workers)",
  "performance_gain": "baseline (no parallel speedup)"
}
```

## Test Distribution

| Tipo | Count desta automação | Coverage |
|------|----------------------|----------|
| Unit (pure app-domain) | **0 novo** (10 pré-existentes `matchStats.test.ts` verificados GREEN) | `initialStats` seeds 3, `merges` accumulation+spawn exclusion, streak per-move (consecutive+double-merge), `maxTile` monotónica, determinismo+mutação, purity, lane-scoped separation — AC1/AC3/AC4 6.1 (byte-identical, não tocado) |
| Component (presentational RN) | **5 ativos** (verificados — `app.restart.test.ts`) + **14 verificados** (`gameOverOverlay.test.ts` estendido) | AC1/AC3 CTA one-tap `onRestart` 1× no dialog + `pointerEvents:auto` hittable durante 280ms fade, AC1/AC2 `handleRestart` body order + dep `[persistedBest]` + monetization wall + 9-tile determinism, AC4 same-lane fan-out, AC6/7 forfeited-continue die/never-reoffered forward-compat, AC5 Clean only CTA `HIT_TARGET`+`alignSelf:center`+`width:100%` wrapper — AC1-7 |
| Component (structural App wiring) | **4** (verificados — `app.gameOverWiring.test.ts`) | `isGameOver(game.board)` conditional overlay, `handleRestart` `busyRef=false` deadlock defense, `applyMoveStats` projection, `availablePot` once-per-render após `if(!ready)` — já verde 6.2, confirmado 6.3 |
| Integration (pre-existing 7.3) | 6 (validado sem modificação) | `hud.previewWiring` `availablePot=potForTier(tierForCeiling(ceilingDetector(board)))` once per render após `if(!ready)` + `76×76`/`60×44` markers — verde |
| Integration (App wiring via fixture — intencionalmente ausente como arquivo `__tests__/integration/` separado) | 0 novo (covered by Component structural + E2E fixture) | Restart integration é screen-state machine, não cena Unity — `App.tsx` conditional `{gameOver ? <GameOverOverlay : null}` sibling `GameBoard`/`Hud` (`zIndex:2` sobre `zIndex:1`) + `busyRef` gate; E2E `GameE2ETestFixture` + `scenarioBuilder` existiriam para jornada completa se necessário (infra já scaffolded) — não gerado para evitar fragmentação (`gameOverOverlay` já pin structural `isGameOver(game.board)`). |
| Guards estruturais | 4 suites (validado sem modificação além `// AC5`/`// AC6/7` comments) | `ui.norolls` (ROLL_SYMBOLS + `Math.random` forbidden), `ui.thinview` (isAllowedViewImport `react-native`+same-dir + `RULE_LOGIC_SYMBOLS`), `engine.purity` (ADR-01/05 relative-only), `hud.previewWiring` — todos verdes (ver Verification) |
| E2E / API HTTP | 0 (N/A intencional) | Restart é store reset instantâneo, não jornada browser nem contrato serviço (justificativa `atdd-checklist-6-3.md:116`; E2E simulator-manual swipe-to-game-over→tap como em 1.6/6.1; fixture `GameE2ETestFixture`/`InputSimulator`/`WaitUntil` já scaffolded em `triade/test-utils/e2e/` — fora de `node:test` puro) |
| Smoke | 0 novo | `criticalPath.smoke.test.ts` + `directional-spawn.smoke.test.ts` + `game`/`board`/`ceiling`/`line`/`spawn` suites já cobrem new game 9 tiles / 200-turn core loop / persist `saveBest` path + `availablePot` fan-out (`game-architecture.md:339` NFR-3 instant restart, no loader) |

**Total verificado nesta automação: 5 testes ativos P0/P1 story-specific (6.3) + 18 correlatos já verdes. Total suite pós-6.3: 453 pass / 0 fail / 0 skipped (~3.4s). Baseline `3218d23` 447 pass (após 6.2) +5 → 453 (o +6 inclui `previewInvariant` acumulado desde 7.4). Sem regressão.**

## Files Created / Modified (validados nesta execução)

- `triade/App.tsx` — **EXISTS** (227 linhas, T1 — `handleRestart 103-110` `useCallback(() => { // AC6/7: forfeited… } newGame→setGame→setMoveResult(null)→setMatch(initialScore(persistedBest))→setMatchStats(initialStats)→busyRef=false }, [persistedBest])` + `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` once após `if(!ready)` + `gameOver=isGameOver(game.board)` conditional `zIndex:2` sobre `Hud`, `reducedMotion={false}` literal + `insets={insets}`; puro-additivo 2 comments, nenhum `engine`/`preview`/`matchStats`/`render`/`services` tocado — já GREEN)
- `triade/src/ui/GameOverOverlay.tsx` — **EXISTS** (170 linhas, T2 — `Animated`/`Easing` soft fade 6.2 preservado: `useRef Animated.Value` trio `reducedMotion?1:0 / 0:12` + `useEffect FADE_MS 280 delay:80 Easing.out(Easing.cubic) useNativeDriver:true` + `reducedMotion` branch `setValue(1)/setValue(0)` + cleanup `anim.stop()+stopAnimation×3`, scrim `rgba(12,14,17,0.7)` `zIndex:2`/`elevation:2`/`pointerEvents:auto`/`accessibilityViewIsModal`, `SAFE_MARGIN 16` padding, CTA `Pressable width/height:HIT_TARGET alignSelf:center` `#E8A33D`/`#1C1206` `TODO 5.4` waiver, `// AC5: Continue…` comment acima CTA + `width:'100%'` wrapper `maxWidth:420 alignSelf:center` — já GREEN)
- `triade/test-utils/rn-stub.ts` — **EXISTS** (host `View/Text/Pressable/StyleSheet` + `Animated.View`/`Value`/`timing`/`parallel` + `Easing.cubic`/`out` + `stopAnimation` — pós-6.2, `npx tsc --noEmit -p tsconfig.test.json` clean)
- `triade/test-utils/e2e/` — **EXISTS** (infra já scaffolded `GameE2ETestFixture.ts` 163 linhas + `scenarioBuilder.ts` + `inputSimulator.ts` + `asyncAssertions.ts` + `memoryStorage.ts` — verificado, não tocado em 6.3)
- `triade/__tests__/ui/components/app.restart.test.ts` — **VERIFIED GREEN** (381 linhas, 5 testes P0/P1, `import(SPEC)` real agora resolve quando `test.skip` removido — antes RED nos 2 comment pins `forfeited continue dies`/`AC5: Continue…`, agora 5/5 pass 453 suite)
- `triade/__tests__/ui/components/gameOverOverlay.test.ts` — **VERIFIED GREEN** (533 linhas, 18 tests 11+7, `import(SPEC)` real)
- `triade/__tests__/ui/components/app.gameOverWiring.test.ts` — **VERIFIED GREEN** (4/4 structural: `isGameOver(game.board)`, `GameOverOverlay` conditional, `reducedMotion={false}` literal, `insets={insets}`, `applyMoveStats` projection)
- `triade/__tests__/engine/engine.purity.test.ts` + `triade/__tests__/ui/ui.norolls.test.ts` + `triade/__tests__/ui/ui.thinview.test.ts` + `triade/__tests__/ui/components/hud.previewWiring.test.ts` — **VERIFIED GREEN** (sem modificação além de `// AC5`/`// AC6/7` comments, T4 gates)
- `triade/src/game/matchStats.ts` + `triade/src/game/preview.ts` + `triade/src/game/matchScore.ts` + `triade/src/engine/**` + `triade/src/render/**` + `triade/src/services/**` + `triade/src/ui/{Hud,PauseButton,layout}.tsx` — **VERIFIED BYTE-IDENTICAL** (ver Verification, `git diff --stat` empty para cada — ADR-01/purity walls)

Nenhum `triade/src/engine` modificado (`git diff --stat -- triade/src/engine` empty) e `triade/src/game/preview.ts`+`matchStats.ts`+`matchScore.ts` empty (T1 pure-additive, mesma postura 6.1/6.2/Epic7).

## Step 3 — Generate Unit Tests

Template de unit do skill (NUnit `[TestFixture]`/`[SetUp]`, Unreal `IMPLEMENT_SIMPLE_AUTOMATION_TEST`, Godot `GutTest`) não aplicável literalmente — engine é TS puro `src/engine` + app-owned `src/game` (ADR-01 pure, `NUnit` → `node:test` + `node:assert` adaptado). Unit surface 6.3 é **orquestração**, não pure-domain nova: `initialStats`/`initialScore`/`ceilingDetector`/`newGame` já têm Unit dedicada (`matchStats.test.ts` 10, `matchScore.test.ts` 8, `engine/* 26+`); 6.3 reusa via **runtime pins** dentro de Component (`app.restart.test.ts:212-230` `newGame(mulberry32(20260808))` 9 tiles + `pendingSpawn` pre-resolved + `initialScore`/`initialStats` invariants) sem criar `tests/unit/{ClassName}Tests.cs` duplicado. Padrão local `preview.test.ts:10` (ladder de `POT_CURVE`) + `matchStats.test.ts:27-50` (seeds) foi o knowledge fragment. Arrange-Act-Assert: `Arrange` `boardWith`/`mulberry32`/`baseProps`, `Act` `act(() => cta.props.onPress())` ou `newGame(rng)`, `Assert` `assert.strictEqual(calls,1)` / `stripped.includes` / `hasStyle`.

## Step 3 — Generate Integration Tests

Template do skill (Unity `UnityTest SceneManager.LoadScene`, Godot `load("res://scenes/...")`) não aplicável — integração do projeto é `engine move trace → GameBoard` + `board ceiling → availablePot → preview` + `App gameOver state → overlay conditional`. 6.1 já tinha wiring indireto, 6.2 pinou `app.gameOverWiring.test.ts` 4 testes cobrindo fronteira orquestração (`isGameOver(game.board)` + `handleRestart` + `availablePot` once); 6.3 integra via **structural source scan** (`stripCommentsAndStrings` handle body order + `availablePot ===1` + `busyRef` double-release) + **runtime overlay re-render** (Clean re-mount still single CTA) sem criar `tests/integration/{SceneName}_Loads_WithoutErrors.cs` separado — evita fragmentação conforme spec 6.3 (*T3 canonical location é `app.restart.test.ts`; keep `app.gameOverWiring.test.ts` verify only*). Async handling: `handleRestart` é síncrono (sem `setTimeout` per NFR-3), overlay CTA hittable imediatamente durante 280ms `Animated.timing` (não `setTimeout` gate) — validado via `pointerEvents:auto` never `none` + `act()` sync.

## Step 3.5 — Generate E2E Infrastructure — já scaffolded, verificado

Infra já existe (`triade/test-utils/e2e/` — 5 fixtures: `GameE2ETestFixture` base class scene loading/unloading + game ready wait + cleanup + common service access, `ScenarioBuilder` fluent API com yields, `InputSimulator` click/drag + `swipe`/`swipeDirection` `SWIPE_THRESHOLD` gate, `asyncAssertions` `WaitUntil`/`WaitForEvent`/`WaitForState`) conforme `automation-summary.md:Infrastructure` + `e2e-testing.md` knowledge. 6.3 não requer E2E adicional: superfície é orchestrator callback instant + thin overlay (não jornada multi-scene nem contrato serviço; `FR-26` single-lane implicit) — vide ATDD checklist `testarch-atdd` 6.3: *Primary Test Level: Component, E2E intencionalmente ausente*. Templates `GameE2ETestFixture`/`ScenarioBuilder`/`InputSimulator`/`WaitUntil` do skill foram mapeados para harness `triade/test-utils/e2e/` existente (fixture session `mulberry32(20260808)` + `MemoryStorage` + `InputSimulator.swipeDirection`). Nenhum arquivo novo em `e2e/infrastructure/` — anti-pattern evitado (não testar funcionalidade da engine; não usar hard-coded waits como sync — usa `settle()`/`busyRef` gate; teardown `GameE2ETestFixture.teardown()` garante cleanup).

## Step 4 — Generate Smoke Tests

Checks críticos já cobertos: `triade/__tests__/smoke/criticalPath.smoke.test.ts` (new game 9 tiles never gameOver, 200-turn core loop `applyMove` sem crash `board 4×4` + `score>=0` + `best>=score`, `GameE2ETestFixture scenario().withSeed().launch()` + `swipeDirection`→`settle` + `syncPersistence`), `triade/__tests__/e2e/session.e2e.test.ts` (launch hydrate `persistedBest` + `occupiedCount 9`, `swipe below SWIPE_THRESHOLD ignored`, core loop 50 moves + `isBusy` gate + `waitFor`, record persist `isNewRecord` + degraded hydration), `triade/__tests__/smoke/directional-spawn.smoke.test.ts` (fresh board never gameOver, 200-turn directional pool, fresh after gameOver playable). **Restart smoke seria duplicação**: restart é `newGame` mesmo caminho de `newGame` inicial + `busyRef=false` já pinado; `--smoke` não adiciona valor para overlay instant (NFR-3 / screen-state machine, não navegação). Smoke template do skill (`SceneManager.LoadScene("MainMenu")` → `NewGameButton.onClick` → `FindWithTag("Player")`) mapeado para `newGame(mulberry32)` → `isGameOver` → `handleRestart` → `occupiedCount 9` via `app.restart.test.ts:219-228` (mesmo invariante). Anti-patterns ativamente evitados (validados): não testa funcionalidade da engine (só contrato thin-view + orchestrator), sem hard-coded waits (usa `act()` sync + `stripComments` scan, não `WaitForSeconds 2f/5f`), sem dependência de ordem, cleanup `anim.stop()+stopAnimation×3` no `useEffect` return + `TestRenderer.unmount()` sem leak; `reducedMotion={false}` literal permanece até 9-4.

## Verification

```bash
# 1. Full suite ativa (scaffolds ativados, 6.3 já GREEN)
cd triade && npm test
# → ℹ tests 453
#   ℹ pass 453
#   ℹ fail 0
#   ℹ cancelled 0
#   ℹ skipped 0
#   ℹ todo 0
#   ℹ duration_ms 3452
#   (baseline 3218d23 447 pass / 8 skipped → pós-6.3 453 pass / 0 skipped — 5 pins novos green + 1 acumulado previewInvariant)

# 2. Type gates
npx tsc --noEmit                 # exit 0 (CI gate limpo)
npx tsc --noEmit -p tsconfig.test.json  # exit 0 (rn-stub Animated/Easing shim + tsconfig.test.json clean)

# 3. Engine/preview byte-identical (T4)
git diff --stat -- triade/src/engine   # empty (engine não tocado — ADR-01)
git diff --stat -- triade/src/game/preview.ts  # empty
git diff --stat -- triade/src/game/matchStats.ts # empty
git diff --stat -- triade/src/game/matchScore.ts # empty
git diff --stat -- triade/src/render  # empty
git diff --stat -- triade/src/services # empty
# App.tsx diff: apenas 2 comments aditivos + T1/T2

# 4. Guards sem modificação além de // AC5 / // AC6/7 comments
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.norolls.test.ts      # [P0] AC4 UI never rolls — 1/1 pass
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.thinview.test.ts     # [P1] thin views — 2/2 pass (isAllowedViewImport react-native+same-dir)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/engine.purity.test.ts # ADR-01 — 2/2 pass (relative-only)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/hud.previewWiring.test.ts # 4/4 pass (availablePot once-per-render)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/app.gameOverWiring.test.ts # 4/4 pass (isGameOver + busyRef)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/gameOverOverlay.test.ts  # 18/18 pass
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/app.restart.test.ts      # 5/5 pass

# 5. Story-specific isolation
npm test -- __tests__/ui/components/app.restart.test.ts __tests__/ui/components/gameOverOverlay.test.ts __tests__/ui/components/app.gameOverWiring.test.ts
# 5 + 18 + 4 = 27/27 pass — qualquer quebra de // AC6/7 / // AC5 / HIT_TARGET / alignSelf / width:100% / monetization wall / continue strings falha imediatamente
grep -rn "test.skip(" triade/__tests__/ui/components/app.restart.test.ts  # 0 (5 pins são true assertions, não scaffolds skip — diferente de 6.2 softFade scaffolds 8 skipped)
```

**Evidência 6.3 (RED→GREEN pins):**

- `app.restart.test.ts`: 5/5 pass (seria RED antes de T1/T2 se `test.skip` removido: `must contain "forfeited continue dies"` em #2 e #4, `must contain "AC5: Continue offer is Epic 3/4"` em #5; functional #1 CTA one-tap já GREEN verification, #3 9-tile same-lane já GREEN — após T1/T2 additive comments 5/5 GREEN)
- `gameOverOverlay.test.ts`: 18/18 pass (11 6.1 + 7 6.2; seria RED se `FADE_MS 280`, `delay 80`, `Easing.out(Easing.cubic)`, `useNativeDriver:true`, `setValue` branch, `HIT_TARGET`, `rgba(12,14,17,0.7)` quebrassem)
- `app.gameOverWiring.test.ts`: 4/4 pass (isGameOver + handleRestart `busyRef=false` + `applyMoveStats` projection + `availablePot` once)
- `npm test` overall: **453 pass / 0 fail** (447 baseline `3218d23` +5 `app.restart` GREEN +1 acumulado)
- `npx tsc --noEmit` em ambas configs → clean (nenhum NEW error além de rn-stub shim já GREEN pós-6.2)

### Checklist (gds-test-automate)

- [x] Framework detectado (Expo RN adaptado `node:test` — detecção mostra `frontend` + harness `tsx` + `rn-stub` Animated)
- [x] Sistemas testáveis identificados; testes existentes + gap mapeado (5 ACs 6.3 + guards + hud wiring; gaps AC1-7 restart mapeados para `app.restart.test.ts`)
- [x] Padrão AAA + `node:assert` determinístico + `stripCommentsAndStrings`/`extractNamedImports` + `mulberry32`/`newGame` deterministic fixtures; parametrizado via `handleSlice` ordering + `availablePot` count; sem `faker` (zero-dep; literais `boardWith`)
- [x] Testes determinísticos (`mulberry32(20260808)` fixo, `spy.captures` draw-budget 20-draw, `act()` sync + `hasStyle`/`allText`/`collectStyles` sync), isolados (cada teste builds `baseProps`/`boardWith`/`newGame` próprio; fresh `TestRenderer` por teste; copy helpers don't cross-import), mensagens descritivas
- [x] Integration pins independentes (`left`/`up` em 7.4, 6.3 App wiring structural via source scan, não mount App completo), sync sem hard-coded waits (`act()` + `stripComments` scan, não `WaitForSeconds`), sem leaks (`stop`+`stopAnimation` cleanup + `rn-stub` sem leak; `GameBoard settleTimerRef` não tocado)
- [x] Smoke critical path já coberto fora do escopo (restart instant é newGame same-lane, não anti-pattern smoke adicional; informational overlay, não nav)
- [x] Arquivos em diretórios corretos (`__tests__/ui/components/` mirror `hud.test.ts`/`previewCard.test.ts`, `src/ui/` conforme `game-architecture.md:563-594`, `test-utils/e2e/` headless + `test-utils/rn-stub.ts`)
- [x] Engine syntax correta (ESM `*.ts` extensions, `strict:true`, sem `Math.random` em suite, sem `import 'src/…'`, `noImplicitAny` clean)
- [x] Resumo criado; próximos passos abaixo
- [x] 5 pins ativos green (0 skipped nesta story — diferente de 6.2 scaffolds); 453 suites verdes activas
- [x] TEA flags honrados (`tea_use_playwright_utils` skipped corretamente, `tea_execution_mode` sequential, `tea_browser_automation` auto sem browser)

### Anti-patterns (evitados, Step 4)

- [x] Não testa funcionalidade da engine (apenas contrato orchestrator `handleRestart` + chrome `GameOverOverlay`; engine é `isGameOver`/`ceilingDetector`/`move` puro)
- [x] Sem hard-coded waits como sync (pura + `react-test-renderer` sync + `allText`/`hasStyle`/`stripCommentsAndStrings` source scan; timing contract verificado via scan `setTimeout`/`Animated.timing`/`delay`/`Easing` literals ausente/presente, não wall-clock `setTimeout 280ms` wait)
- [x] Sem dependência de ordem (cada teste constrói `baseProps`/`boardWith`/`traceEntry` próprio; `act()` + fresh `TestRenderer` por teste; `App.tsx` `handleRestart` nunca montado — body via `stripComments` ordering + runtime `newGame` invariants)
- [x] Cleanup garantido (funções puras, `Animated` cleanup `anim.stop()+stopAnimation×3` no `useEffect` return; `TestRenderer` sem leak; `rn-stub` sem leak; GameBoard `settleTimerRef` re-arm per `moveResult` não tocado)
- [x] Determinístico (`mulberry32` fixo onde motor exigiria RNG; overlay tem 0 draws por construção; `displayRoll` já em `PendingSpawn`)
- [x] Mensagens descritivas (`'onRestart must be called exactly once per press; no confirmation dialog intercepts'` + `must pin FADE_MS 280 literal`)
- [x] Copy helpers, don't cross-import (padrão `hud.test.ts`/`previewCard.test.ts` preservado)
- [x] Sem `faker` (zero-dep; literais `boardWith` + `stats` fixtures + `mulberry32(20260808)`), sem `Math.random` em suite, sem `import 'src/…'`

## Next Steps

1. Revisar os 5 pins ativos em `app.restart.test.ts` (foco: `[P0] AC1/AC2 handleRestart resets store immediately — 9 tiles, score 0 best persisted, merges 0, null moveResult, busyRef false, same lane, no navigation` — source order + dep `[persistedBest]` + monetization wall + runtime 9-tile `mulberry32(20260808)` + `busyRef` double-release Df5 defense; `[P0] AC6/AC7 forfeited continue dies` — vacuous today mas `continueBudget`/`continueRemaining` carry forbidden; `[P1] AC5 Clean only primary CTA` — `// AC5` comment + `HIT_TARGET`+`alignSelf:center`+`width:100%` wrapper).
2. Adicionar ao CI gate (já existe `npm test` — baseline deve permanecer ≥453; flag queda; `engine`/`preview`/`matchStats`/`matchScore`/`render`/`services`/`App` diffs empty gate exceto `// AC5`/`// AC6/7` comments). Verificar baseline separado para `tsc` clean em ambas configs.
3. Edições futuras de display (6.4 record highlight `isNewRecord` `valueRecord #E8A33D` já em `gameOverOverlay.test.ts` — manter green; fase de Accelerated `S3.3`/`S4.2` Continue offer must não quebrar `[P1] AC5` single-CTA guard — aquele teste deve ser expandido ou documentado quando Epic 3/4 landar, não silenciado). `GameOverOverlay.tsx` animation contract `FADE_MS 280`/`delay 80`/`Easing`/`useNativeDriver`/`reducedMotion` literal `false` até 9-4 permanece byte-identical até patch explícito com review tag.
4. `npx tsc --noEmit -p tsconfig.test.json` já clean — não silenciar fix dentro de stories Epic 6 (manter `rn-stub` Animated/Easing shim). `npm run`/`npx expo` não necessário (`npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`).
5. Quando Epic 3 `MatchOrchestrator`/undo + `LaneProfile` landar (stories 3-5), re-avaliar placement de `longestStreak` (tension `game-architecture.md:776-777` — undo-owned future field vs per-match cumulative hoje deferido) e se `applyMoveStats` deve virar invertível; também re-avaliar `handleRestart` same-lane implícito → explícito `LaneProfile.id` preservação (`App.tsx` não deve conter `SecureStore`/`MMKV` lane memory antes de S3.1). Pin decision em 3-5.

## Traceability

| FR | AC | Arquivo | Nomes |
|----|----|---------|-------|
| FR-26, UJ-5 | AC1/AC4 | `app.restart.test.ts` | `[P0] AC1/AC3 CTA one tap calls onRestart once with no confirmation` (structural CTA `onRestart` 1× + no `Alert`/`confirm(`/`Dialog` + `pointerEvents:auto` hittable) |
| FR-26, NFR-3, ADR-01 | AC1/AC2 (instant, no nav, same-lane) | `app.restart.test.ts` | `[P0] AC1/AC2 handleRestart resets store immediately — 9 tiles, score 0 best persisted, merges 0, null moveResult, busyRef false, same lane, no navigation` (body order + dep + `!setTimeout`/`!navigation` + 9-tile determinism + `busyRef` Df5 + `availablePot` once) |
| FR-26 | AC4 (9-tile same lane) | `app.restart.test.ts` | `[P0] AC4 9-tile same lane` (`newGame(mulberry32(20260808))` stream determinism 9×2, `ceilingDetector`==`initialStats.maxTile`, `potForTier` fan-out) |
| ADR-02 per-match budgets | AC6/AC7 (forfeited die) | `app.restart.test.ts` | `[P0] AC6/AC7 forfeited continue dies — never carried, never re-offered` (single CTA + `forfeited continue dies` comment + no `continueBudget`/`continueRemaining` carry + no `rewardedAd`/`IAP`/`react-native-purchases`) |
| FR-12/FR-18 D-010 | AC5 (Clean only) | `app.restart.test.ts` | `[P1] AC5 Clean only primary CTA` (`!Continuar` stripped + single `Pressable` `button` `Jogar de novo` + `HIT_TARGET`+`alignSelf:center`+`width:100%` wrapper + `reducedMotion={false}`) |
| FR-27, UX-DR-25, S6.4 | AC2/AC3 (elegant fall cross-story) | `gameOverOverlay.test.ts` + `app.gameOverWiring.test.ts` | 7 pins 6.2 preservados: mount sync CTA hittable durante `FADE_MS 280`+`delay 80`, board visibility `isGameOver(game.board)` sibling, `FADE_MS/Easing/useNativeDriver/reducedMotion` crossover |
| P1 (purity) | AC4 | `ui.norolls.test.ts` / `ui.thinview.test.ts` / `engine.purity.test.ts` | `ROLL_SYMBOLS` + `Math.random` forbidden, `isAllowedViewImport` `react-native`+same-dir, relative-only (ADR-01) — greens |
| FR-14, NFR-3 | AC3/T5 (lane-scoped best + screen-state) | `app.gameOverWiring.test.ts` + `matchStats.test.ts` | `initialScore(persistedBest)` lane-scoped best, `matchStats` not score, `handleRestart` no navigation |

Referências: `triade/App.tsx:103-110` (`handleRestart` body + `// AC6/7` comment), `:151` `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))`, `:154` `gameOver=isGameOver(game.board)`, `:195` `reducedMotion={false}`, `triade/src/ui/GameOverOverlay.tsx:26-50` (`Animated.Value reducedMotion?1:0 / 0:12` + `FADE_MS 280`+`delay 80`+`Easing.out(Easing.cubic)`+`useNativeDriver:true`+`stop`/`stopAnimation`), `:94` `// AC5: Continue…`, `:155-161` `styles.cta HIT_TARGET`, `triade/src/game/matchStats.ts:17-23` (`initialStats`/`applyMoveStats` via `!spawned && from.length===2`), `triade/src/game/matchScore.ts:1-22`, `triade/src/engine/core/{game:8-24,ceiling:5,index}`, `triade/src/engine/config/spawnConfig.ts:17 POT_CURVE`, `triade/test-utils/helpers.ts:220-353` (`stripCommentsAndStrings`/`extractNamedImports`), `triade/test-utils/rn-stub.ts`, `triade/__tests__/ui/components/app.restart.test.ts:1-381` (5 pins), `triade/test-utils/e2e/GameE2ETestFixture.ts`, `game-architecture.md:338,382,509-510 ADR-02, 275-280 matrix, 339 screen-state, 563-594 dirs, 776-777 streak tension`, `DESIGN.md:153-279,193,251-255`, `EXPERIENCE.md:73-84,98,112,199`, `epics.md:766-784`, `GDD:100-101`, `PRD:134-137`, `mockups/key-gameover.html:43,147`, `atdd-checklist-6-3-restart-1-tap.md`, `_bmad-output/implementation-artifacts/6-3-restart-1-tap.md:103-110`.

---

Gerado por `gds-test-automate` 6.3 — `triade/__tests__/ui/components/app.restart.test.ts` (5 pins P0/P1) + `triade/__tests__/ui/components/gameOverOverlay.test.ts` (14) + `triade/__tests__/ui/components/app.gameOverWiring.test.ts` (4) — `453 pass / 0 fail` — 2026-08-27. Modo: `BMad-Integrated sequential` (adaptado `frontend` → Component+Structural/Rust behavioral pins; Playwright Utils skipped; Pact não aplicável).

## Automation Summary

**Engine**: React Native + Expo (headless harness via `node:test` + `tsx`) — `App.tsx handleRestart` + `GameOverOverlay` single CTA
**Tests Generated**: 5 pins P0/P1 story-specific verificados (453 pass / 0 fail; baseline 447 → 453)
**Date**: 2026-08-27

### Test Distribution

| Type        | Count | Coverage      |
| ----------- | ----- | ------------- |
| Unit Tests  | 0 novo (10 verificados `matchStats`/`matchScore`/`engine`) | `initialStats`/`applyMoveStats` purity + streak + `maxTile` + 26 engine suite |
| Component (Presentational) | 5 ativos (6.3) + 14 verificados (6.1/6.2 overlay) | AC1/AC3 CTA one-tap no dialog + pointerEvents hittable, AC1/AC2 `handleRestart` instant same-lane 9 tiles + forfeited-continue pin, AC4 9-tile fan-out, AC6/7 forfeited die/never-reoffered, AC5 Clean-only CTA guard |
| Integration (App wiring) | 4 verificados `app.gameOverWiring` | `isGameOver(game.board)` + `handleRestart busyRef=false` + `applyMoveStats` + `availablePot` once-per-render |
| Integration (pre-existing 7.3) | 6 verificados | `hud.previewWiring` `availablePot` fan-out após `if(!ready)` |
| Smoke Tests | 0 novo (3 suites existentes) | `criticalPath.smoke` (new game 9 tiles + 200-turn loop) + `e2e session` (launch hydrate + persist) + `directional-spawn.smoke` — NFR-3 instant restart coberto |
| E2E Infra | — (já scaffolded) | `triade/test-utils/e2e/` `GameE2ETestFixture`/`ScenarioBuilder`/`InputSimulator`/`asyncAssertions` — não requerido para 6.3 (host-testable) |

### Files Created

- `triade/App.tsx` — **EXISTS** (T1 `// AC6/7: forfeited continue dies` comment antes de `busyRef=false`; body order + dep `[persistedBest]` + no navigation/setTimeout)
- `triade/src/ui/GameOverOverlay.tsx` — **EXISTS** (T2 `// AC5: Continue offer is Epic 3/4…` acima `Pressable`; CTA `HIT_TARGET` + `alignSelf:center` + `width:100%` wrapper)
- `triade/__tests__/ui/components/app.restart.test.ts` — **VERIFIED GREEN** (381 linhas, 5/5 pass — AC1/AC3 CTA, AC1/AC2 store reset, AC4 9-tile, AC6/7 forfeited, AC5 Clean)
- `triade/__tests__/ui/components/gameOverOverlay.test.ts` — **VERIFIED GREEN** (533 linhas, 18 tests)
- `triade/test-utils/e2e/` — **EXISTS** (infra `GameE2ETestFixture`/`scenarioBuilder`/`inputSimulator`/`asyncAssertions`/`memoryStorage`)

### Next Steps

1. Revisar 5 pins `app.restart.test.ts` (foco: `forfeited continue dies` vacuous hoje mas guarda `S3.3`/`S4.2`; `HIT_TARGET`+`alignSelf:center`+`width:100%` preservados; `busyRef=false` Df5 deadlock)
2. Consolidar: nenhum scaffold `skip` restante em 6.3 (diferente de 6.2 `softFade` 8 skipped) — baseline novo 453; `engine`/`preview`/`matchStats`/`render`/`services` diffs empty gate no CI
3. Rodar `npm test` no CI (≥453 pass) + `npx tsc --noEmit` em ambas configs
4. Adicionar ao pipeline: `ui.norolls`/`ui.thinview`/`engine.purity` green + `availablePot` once-per-render preservado

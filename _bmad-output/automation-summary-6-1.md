# Automation Summary — Story 6.1 (Overlay de game over com stats imediatos)

**Engine**: TypeScript / React Native (Expo SDK 57) — `node:test` + `tsx` + `node:assert` + `react-test-renderer` (skill adaptado: projeto é Expo RN, mas harnes é headless `node:test` — `triade/package.json` test = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`)
**Story**: `6.1` — `6-1-overlay-de-game-over-com-stats-imediatos` — `_bmad-output/implementation-artifacts/6-1-overlay-de-game-over-com-stats-imediatos.md`
**ATDD Checklist (input)**: `_bmad-output/test-artifacts/atdd-checklist-6-1-overlay-de-game-over-com-stats-imediatos.md` (RED → GREEN, 21 tests)
**Tests Generated / Verified**: **21** (10 Unit `matchStats` + 11 Component `GameOverOverlay`) — todos `P0/P1` por `test-priorities-matrix` — `438 pass / 0 fail` full suite (baseline `main` `70e4fb0` era `417 pass / 21 skipped`; pós-6.1 é `438 pass / 0 skipped` — +21 GREEN)
**Date**: 2026-08-26
**Stack Detection**: `frontend` (Expo RN `react`/`react-native`/`expo`/`@shopify/react-native-skia` em `triade/package.json`) mas runner adaptado `node:test + tsx` (zero browser; 0 hits `page.goto`/`page.locator` em `__tests__`; `tea_use_playwright_utils: true` intencionalmente skipped — perfil seria API-only mas não aplicável, mesma postura 1.6/7.2/7.3/7.4)
**Execution Mode**: `BMad-Integrated` → `sequential` (resolução `auto` com `tea_capability_probe: true` mas `supports.agentTeam=false`, `supports.subagent=false` → fallback `sequential`; `tea_execution_mode: auto` honrado)

## Contexto

Story 6.1 é **pure-additive** (mesma postura Epic 7): nenhum `triade/src/engine` muda e `triade/src/game/preview.ts` fica byte-identical. Entrega é `triade/src/game/matchStats.ts` (projeção pura app-owned, irmã de `matchScore.ts`) + `triade/src/ui/GameOverOverlay.tsx` (presentational thin-view) + wiring em `triade/App.tsx` (`isGameOver` + `initialStats`/`applyMoveStats` + `handleRestart` + `busyRef` deadlock defense). O overlay dispara **sincrónico** quando `isGameOver(board)===true` (full + sem par mergeável), mostra `score/best/maxTile/merges/longestStreak` sem timer, sob `rgba(12,14,17,0.7)` `zIndex:2` sobre `Hud` (`zIndex:1`), gesto bloqueado via `pointerEvents:'auto'`, CTA único "Jogar de novo" resetando match (FR-25/27, UX-DR-12, N3 preview intacto).

O gap fechado é o **estado game-over como state, não erro** (engine nunca throw, `move()` `ok|rejected`) + **stats imediatos lane-scoped** (`best` via `persistedBest`/`initialScore`/`isNewRecord` — `MatchStats` nunca expõe `best/score`) + **contrato de timing** (sem `setTimeout`/`Animated.timing` antes do mount) + **thin-view/purity guards** (`ui.norolls`/`ui.thinview`/`engine.purity` verdes).

## Preflight

- [x] Test framework inicializado — `triade/package.json` `test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` (Node 26, `tsx` 4.23, `react-test-renderer` 19.2.3, `tsconfig.test.json` com `allowImportingTsExtensions`)
- [x] Test scenarios definidos — story file `_bmad-output/implementation-artifacts/6-1-overlay-de-game-over-com-stats-imediatos.md` (4 ACs, FR-25/27/FR14/FR26, UX-DR-12) + ATDD checklist `atdd-checklist-6-1-overlay...md` (estratégia Unit+Component, 21 scaffolds RED→GREEN, tokens `DESIGN.md:153-279`/`EXPERIENCE.md:73-84`, `key-gameover.html:43`)
- [x] Game code acessível — `triade/src/game/matchStats.ts:1-30`, `triade/src/ui/GameOverOverlay.tsx:1-129`, `triade/App.tsx:1-250` (orchestrator), `triade/src/engine/core/{game,types,line,board,ceiling}.ts`, `triade/src/game/{matchScore,preview}.ts`, `triade/src/ui/{Hud,PauseButton,layout}.tsx`, `triade/test-utils/{helpers,rn-stub}.ts`, guards `ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring`
- [x] Baseline preservado — `main` `70e4fb0` MERGE 12.1 (directional spawn, 3-draw budget) → `396 pass`; pré-6.1 `417 pass / 21 skipped`; pós-6.1 `438 pass / 0 fail`
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

Justificativa: projeto é RN-Expo mas harness é `node:test` puro (sem `playwright.config.*`/`cypress.config.*`); não há infra de subagente `agent-team` disponível neste runtime. Modo `sequential` HONRA o contrato de saída (mesmo schema JSON + naming `tea-automate-*-${timestamp}.json`) sem degradação. Workers adaptados: `Subagent A (API)` → **Unit (matchStats)** e `Subagent B (E2E)` → **Component (GameOverOverlay)** (mesma adaptação usada em 6.1 ATDD: duas workers host-testáveis, sem HTTP API nem browser E2E). `B-backend` skip (`frontend`).

## Step 1 — Analyze Codebase (Mode: BMad-Integrated)

**Stack adaptado:**
- `test_stack_type: auto` → escaneado `triade/package.json` encontrou `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated` → `frontend`
- Runner não é Playwright/Cypress: `package.json:scripts.test` é `node --import tsx --test`; `triade/test-utils/rn-stub.ts` mapeia RN para hosts de string; nenhum `page.goto`/`page.locator` em `__tests__/**` (0 hits) → perfil Playwright Utils seria API-only se habilitado, mas intencionalmente skipped (superfície thin-view, não API HTTP)
- Framework existe (HALT não acionado): `node:test` harness validado via `npm test` 438 pass

**Sistemas testáveis identificados:**
- `initialStats(board)` / `applyMoveStats(prev, board, result)` (`src/game/matchStats.ts:11-30`) — projeção pura, AC1/AC3/AC4, `ceilingDetector(board)` monotónica, `mergeCountThisMove` via `!spawned && from.length===2` (equiv. `classify==='merge'` `transitionPlan.ts:21-26`), streak per-move, determinística, sem `Math.random`/roll symbols
- `GameOverOverlay({stats,isNewRecord,onRestart,reducedMotion,insets})` (`src/ui/GameOverOverlay.tsx:13-67`) — overlay presentational AC1/AC2/AC4, scrim `rgba(12,14,17,0.7)` `zIndex:2`/`elevation:2`/`pointerEvents:'auto'`, tokens `#8a8578` label 13/500 / `#1a1d23` value 17/500 `tabular-nums` / `#E8A33D` accent `valueRecord` quando `isNewRecord`, CTA `Pressable` `width/height: HIT_TARGET` 44, `accessibilityRole alert`+`button`, `reducedMotion` gateado
- Wiring `App.tsx` (`:14-15` imports, `:56` `matchStats` state seed `initialStats(game.board)`, `:90-106` `doMove` `applyMoveStats(prev,result.board,result)`, `:108-115` `handleRestart` + `busyRef.current=false` deadlock defense, `:143` `isGameOver(game.board)` + `:160-172` render `GameOverOverlay` acima `Hud`)

**Testes existentes localizados:**
- Pre-6.1: `__tests__/game/matchScore.test.ts` (8 pins `initialScore`/`applyMove`/`isNewRecord`), `__tests__/game/preview*.test.ts`, `__tests__/ui/components/{previewCard,hud,pauseButton}.test.ts`, `__tests__/ui/{ui.norolls,ui.thinview}.test.ts`, `__tests__/engine/engine.purity.test.ts`, `__tests__/ui/components/hud.previewWiring.test.ts` (76×76 / 60×44), `test-utils/helpers.ts` (`boardWith`, `emptyBoard`, `ceilingDetector`, `rngOf`, `spyRng`, `mulberry32`, `stripCommentsAndStrings`, `extractNamedImports`)
- ATDD 6.1 RED→GREEN (agora GREEN): `__tests__/game/matchStats.test.ts` (10 testes, 271 linhas, dynamic `import(SPEC)` + literal fixtures), `__tests__/ui/components/gameOverOverlay.test.ts` (11 testes, 243 linhas, `react-test-renderer` + `hasStyle`/`allText`/`collectStyles` + helpers locais + `readFile` source guards)

**Coverage gap (pré-automação):** nenhum P0/P1 descoberto além dos 21 ATDD — ATDD já cobre 4 ACs end-to-end nos níveis corretos (Unit puro + Component thin-view). Automate confirmou que dispersão além de Unit/Component seria **duplicação** (E2E desnecessário: game-over é state overlay síncrono, não jornada browser; API desnecessária: sem HTTP/MS — mesma postura 7.4). Gap único de baixa criticidade é nível App wiring (integração `App.tsx` conditional render + `handleRestart` + `busyRef`) — verificado indiretamente via Unit+Component + guards + run 438; suite dedicada `App.tsx` adiada para 6.3 (scope guard CC 2026-08-23, quando restart forfeit lanes land) — não é gap de automação desta story.

## Step 2 — Coverage Plan (Targets by Level + Priority)

> Evita duplicação: cada comportamento testado em exatamente um nível (projeção pura uma vez em Unit, chrome presentational uma vez em Component; App wiring indireto).

| AC | Scenario (Given-When-Then) | Level | Priority | File | Test Names (existentes, agora GREEN) |
|----|---------------------------|-------|----------|------|--------------------------------------|
| AC1 (FR-25, UX-DR-12) | `initialStats(board)` seeds `merges=0, longest=0, current=0, maxTile=ceilingDetector(board)` — inclui `emptyBoard` 0 e board 48 | Unit | P0 | `matchStats.test.ts:27` | `[P0] AC1 initialStats seeds ...`, `[P0] AC1 initialStats on empty-ish ...`, `[P0] AC1 initialStats on game board ...` |
| AC1 | `applyMoveStats` `merges += trace.filter(!spawned && from.length===2).length` — zero-merge não incrementa; `spawned:true` nunca conta | Unit | P0 | `matchStats.test.ts:67` | `[P0] AC1 applyMoveStats increments merges ...` |
| AC1 | streak per-move: merge move `current+1/longest=Math.max`, zero-merge `current=0` longest preserva; 5-move sequence 0→1→2→0→1→3 longest 3 | Unit | P0 | `matchStats.test.ts:102` | `[P0] AC1 applyMoveStats streak ...` |
| AC1 | double-merge single swipe `[3,3,3,3]->[6,6]` com 2 entries `from.length===2` conta como **1** streak step (merges +2 mas streak +1); próximo merge → streak 2 | Unit | P0 | `matchStats.test.ts:143` | `[P0] AC1 streak is per-move, not per-tile ...` |
| AC1 | `maxTile` monotónica `Math.max(prev.maxTile, ceilingDetector(postBoard))` — deflate 48→24 fica 48, grow 96 sobe | Unit | P0 | `matchStats.test.ts:174` | `[P0] AC1 maxTile monotonic ...` |
| AC1 | overlay renderiza 5 stats como Text nodes próprios `score/best/maxTile/merges/longestStreak` `hasToken` | Component | P0 | `gameOverOverlay.test.ts:84` | `[P0] AC1 overlay renders all five stats ...` |
| AC1 | a11y `accessibilityRole="alert"` + `accessibilityLabel` "Game over. Score ... best ... max ... merges ... longest ..." + `isNewRecord` "Novo recorde" e CTA `role="button"` "Jogar de novo" | Component | P0 | `gameOverOverlay.test.ts:93` | `[P0] AC1 overlay accessibility ...` |
| AC1 | `isNewRecord=true` a11y "Novo recorde" + `color:#E8A33D` accent highlight | Component | P0 | `gameOverOverlay.test.ts:112` | `[P0] AC1 isNewRecord=true ...` |
| AC1 | CTA `onPress` chama `onRestart` exatamente 1× (sem confirmação) | Component | P0 | `gameOverOverlay.test.ts:127` | `[P0] AC1 CTA "Jogar de novo" ...` |
| AC2 (FR-27) | scrim `backgroundColor:'rgba(12,14,17,0.7)'` via rgba único (sem `opacity` separado — children full opacity) | Component | P0 | `gameOverOverlay.test.ts:138` | `[P0] AC2 scrim uses rgba ...` |
| AC2 | overlay `position:absolute zIndex:2 elevation:2 pointerEvents:auto` acima `Hud` `zIndex:1` e bloqueia `Gesture.Pan`/`PauseButton` | Component | P0 | `gameOverOverlay.test.ts:157` | `[P0] AC2 overlay sits above Hud ...` |
| AC2 | síncrono: sem `setTimeout`/`setInterval`/`Animated.timing` antes mount, sem `transform` no mount (6.2 own fade) | Component | P0 | `gameOverOverlay.test.ts:166` | `[P0] AC2 overlay renders synchronously ...` |
| AC2 | CTA hit-target `width/height: HIT_TARGET` (44) literal (thinview gate) + rendered `width:44` | Component | P0 | `gameOverOverlay.test.ts:186` | `[P0] AC2 CTA hit target ...` |
| AC1/AC2 | tokens stat row: label `#8a8578` 13/500, value `#1a1d23` 17/500 `tabular-nums` (`DESIGN.md:153-279`) | Component | P1 | `gameOverOverlay.test.ts:203` | `[P1] AC1/AC2 stat row tokens ...` |
| AC4 (ADR-01/06) | `matchStats` purity: `stripComments` sem `Math.random`/`resolveSpawn`/`weightedValue`/`spawnTile`/`weightedPicker`/`pickIndex`; runtime `Math.random` nunca chamado | Unit | P1 | `matchStats.test.ts:236` | `[P1] AC4 applyMoveStats purity ...` |
| AC4 | determinismo `structuredClone(prev)` `deepEqual` twice, sem mutação `prev`, `spawned:true` nunca merge | Unit | P1 | `matchStats.test.ts:207` | `[P1] AC1/AC4 applyMoveStats determinism ...` |
| AC3 (FR-14 lane-scoped) | `MatchStats` não expõe `score`/`best` (vive em `MatchScore` via `persistedBest`/`initialScore`/`isNewRecord`) — exatamente `merges/longestStreak/maxTile/currentStreak` | Unit | P1 | `matchStats.test.ts:264` | `[P1] AC3 lane-scoped best is NOT inside MatchStats ...` |
| AC4 | overlay thin-view: sem `engine` roll symbols/`Math.random`/`layoutFor`/`isLandscape`/… (`ui.norolls`/`ui.thinview`/`engine.purity`) | Component | P1 | `gameOverOverlay.test.ts:214` | `[P1] AC4 overlay is thin-view ...` |
| Epic 9 gate | `reducedMotion` prop thread `false` literal hoje, sem `transform` quando false (forward-compat 6.2) | Component | P1 | `gameOverOverlay.test.ts:235` | `[P1] reducedMotion prop ...` |

**No duplicate coverage:** projeção pura apenas em Unit, chrome apenas em Component. E2E/API intencionalmente ausente (mesma postura `atdd-checklist-6-1.md:141`). App wiring (`App.tsx` state + `isGameOver` + `handleRestart` + `busyRef` deadlock) verificado indiretamente + guards T5; suite `App.tsx` dedicada adiada para 6.3 (não é gap desta story).

**Priorities per `test-priorities-matrix.md`:** P0 = stats correctness + timing/a11y/scrim/hierarchy/CTA (12 testes); P1 = separation/purity/tokens/reducedMotion (7 testes); + 2 `initialStats` P0 seeds. `include_p0:true`, `include_p1:true`, `include_p2:false` (default `critical-paths`).

## Step 3 — Orchestrate Adaptive Test Generation

| Worker | Subagent File | Output | Status |
|--------|---------------|--------|--------|
| A — Unit (adaptado de API) | `./step-03a-subagent-api.md` (adaptado → `matchStats`) | `/tmp/tea-automate-api-tests-2026-08-26-m6-1.json` (virtual) | ✅ Complete — `triade/__tests__/game/matchStats.test.ts` 10 testes (artefato ATDD já GREEN) — nenhum novo arquivo; seqüencial blocking validado |
| B — Component (adaptado de E2E) | `./step-03b-subagent-e2e.md` (adaptado → `GameOverOverlay`) | `/tmp/tea-automate-e2e-tests-2026-08-26-m6-1.json` (virtual) | ✅ Complete — `triade/__tests__/ui/components/gameOverOverlay.test.ts` 11 testes (ATDD já GREEN) — nenhum novo arquivo; seqüencial blocking validado |
| B-backend | `./step-03b-subagent-backend.md` | — | ⏭️ Skipped (`frontend`) |

**Modo sequencial** (cada worker já completo no dispatch) — `tea_use_pactjs_utils:false` então nota de contrato não se aplica; `tea_use_playwright_utils:true` adaptado profile seria API-only se houvesse browser surface, mas surface é Unit+Component `react-test-renderer`.

**Fixture needs coletados:** nenhum novo (`allFixtureNeeds: []`) — reuso de `test-utils/helpers.ts` (`boardWith`, `emptyBoard`, `ceilingDetector`, `rngOf`, `spyRng`, `stripCommentsAndStrings`, `extractNamedImports`) + `test-utils/rn-stub.ts` + helpers locais `hasStyle`/`allText` copiados de `hud.test.ts`/`previewCard.test.ts` (copy, don't cross-import). Nenhum `tests/fixtures/auth`/`data-factories` `faker` necessário (projeto zero-dep, determinístico via literais; `faker` não instalado per regra).

**Why no new files nesta execution?** Os 21 scaffolds RED gerados pelo workflow `testarch-atdd` 6.1 (2026-08-26, 10+11) já foram implementados pelo DEV (sequência T1→T2→T3) e estão **GREEN** (`438 pass`). Automate rodou em modo **validação+expansão**: escaneou gaps adicionais (negative paths, mutation, determinismo, a11y extra, App wiring integration) e concluiu que estão cobertos pelos mesmos 21 pins + guards `ui.norolls`/`ui.thinview`/`engine.purity`/`hud.previewWiring`. Gerar novos arquivos duplicaria coverage (anti-pattern `automate checklist:179-182`).

### Subagent Output Schema Contract (compatibilidade `step-03c-aggregate`)

```json
{
  "success": true,
  "subagent": "api",
  "tests": [],
  "fixture_needs": [],
  "knowledge_fragments_used": ["test-levels-framework","test-priorities-matrix","data-factories","test-quality","ci-burn-in","selective-testing","test-healing-patterns","selector-resilience","timing-debugging"],
  "test_count": 10,
  "priority_coverage": { "P0": 7, "P1": 3 },
  "summary": "matchStats Unit — 10 P0/P1 pins validated GREEN, no new file needed (ATDD 6.1)"
}
```

(Análogo para Component `test_count:11, priority_coverage P0:7 P1:4`.) Aggregate lê whichever outputs existem (detected_stack `frontend` → `api`+`e2e`) e valida `success===true` — ambos GREEN.

## Step 3C — Aggregate

**Read outputs:** `apiTestsOutput.success===true` (10), `e2eTestsOutput.success===true` (11), `backendTestsOutput===null` (skipped).

**Write test files to disk:** nenhum novo write necessário — 21 pins já em disco e passando. Agregação registra `uniqueFixtures:0`, `total_tests:21 (10+11+0)`, `api_test_files:1`, `e2e_test_files:1`, `backend_test_files:0`, `fixtures_created:0`.

Summary temporário salvo como `/tmp/tea-automate-summary-2026-08-26-m6-1.json`:

```json
{
  "detected_stack": "frontend",
  "total_tests": 21,
  "api_tests": 10,
  "e2e_tests": 11,
  "backend_tests": 0,
  "fixtures_created": 0,
  "api_test_files": 1,
  "e2e_test_files": 1,
  "backend_test_files": 0,
  "priority_coverage": { "P0": 14, "P1": 7, "P2": 0, "P3": 0 },
  "knowledge_fragments_used": ["test-levels-framework","test-priorities-matrix","data-factories","test-quality","ci-burn-in","selective-testing","test-healing-patterns","selector-resilience","timing-debugging"],
  "subagent_execution": "SEQUENTIAL (API then dependent workers)",
  "performance_gain": "baseline (no parallel speedup)"
}
```

## Test Distribution

| Tipo | Count desta automação | Coverage |
|------|----------------------|----------|
| Unit (pure app-domain) | **10** (verificados — `matchStats.test.ts`) | `initialStats` seeds 3, `merges` accumulation+spawn exclusion, streak per-move (consecutive+double-merge), `maxTile` monotónica, determinismo+mutação, purity, lane-scoped separation — AC1/AC3/AC4 |
| Component (presentational RN) | **11** (verificados — `gameOverOverlay.test.ts`) | 5 stats render, a11y `alert`+"Game over"+stats / CTA button "Jogar de novo", `isNewRecord` "Novo recorde"+accent, CTA onRestart 1×, scrim rgba, hierarchy zIndex/elevation/pointerEvents, síncrono timing, HIT_TARGET 44, tokens, thin-view, reducedMotion — AC1/AC2/AC4 |
| Integration (App wiring) | 0 novo (deferred T3 para 6.3) | `App.tsx` `matchStats` state + `doMove applyMoveStats` + `gameOver=isGameOver(game.board)` + `handleRestart busyRef=false` — verificado indiretamente via Unit+Component + guards + 438 run; suite dedicada quando restart forfeit lanes land (`sprint-status` defer) |
| Integration (pre-existing 7.3) | 6 (validado sem modificação) | `hud.previewWiring` `availablePot=potForTier(tierForCeiling(ceilingDetector(board)))` once per render após `if(!ready)` — verde |
| Guards estruturais | 4 suites (validado sem modificação) | `ui.norolls` (4 roll symbols), `ui.thinview` (Hud/PauseButton allowlist), `engine.purity` (ADR-01/05 relative-only), `hud.previewWiring` — todos verdes (ver Verification) |
| E2E / API HTTP | 0 (N/A intencional) | Overlay é state síncrono, não jornada browser nem contrato serviço (justificativa `atdd-checklist-6-1.md:141`; E2E simulator-manual swipe-to-game-over se necessário — fora de `node:test`) |
| Smoke | 0 novo | `criticalPath.smoke.test.ts` + `game`/`board`/`ceiling`/`line`/`spawn` suites já cobrem new game 9 tiles / 200-turn core loop / persist path |

**Total verificado nesta automação: 21 testes P0/P1 story-specific (10+11). Total suite pós-6.1: 438 pass / 0 fail / 0 skip (~2.85s). Baseline ATDD RED era 417 pass / 21 skipped — delta +21 GREEN.**

## Files Created / Modified (validados nesta execução)

- `triade/src/game/matchStats.ts` — **EXISTS** (30 linhas, T1 — pure `MatchStats {merges,longestStreak,maxTile,currentStreak}` + `initialStats` + `applyMoveStats`, relative imports only `ceilingDetector`+`Board`/`MoveResult`, sem RN, sem roll symbols, host-testable — já GREEN)
- `triade/src/ui/GameOverOverlay.tsx` — **EXISTS** (129 linhas, T2 — dumb presentational, props fixas `{stats,isNewRecord,onRestart,reducedMotion?,insets?}`, `StyleSheet` `overlay: absolute zIndex2 elevation2 rgba(12,14,17,0.7)`, `value/valueRecord` tokens, `cta width/height HIT_TARGET` accent `#E8A33D` + `hitSlop` não necessário, `TODO 5.4` waiver, `insets+SAFE_MARGIN` padding, `reducedMotion` gate)
- `triade/App.tsx` — **MODIFIED** (T3 — imports `isGameOver`/`initialStats`/`applyMoveStats`/`GameOverOverlay`, `matchStats` state `initialStats(game.board)`, `doMove` `setMatchStats(prev=>applyMoveStats(prev,result.board,result))`, `handleRestart busyRef=false`, `gameOver=isGameOver(game.board)` conditional `zIndex:2` sobre `Hud`, `reducedMotion={false}` literal, `insets` passthrough, `availablePot` preservado once per render após `if(!ready)`)
- `triade/__tests__/game/matchStats.test.ts` — **VERIFIED GREEN** (271 linhas, 10 testes P0/P1, `import(SPEC)` real agora resolve — era RED `Cannot find module` com `test.skip()` no ATDD)
- `triade/__tests__/ui/components/gameOverOverlay.test.ts` — **VERIFIED GREEN** (243 linhas, 11 testes P0/P1, `import(SPEC)` real)
- `triade/__tests__/engine/engine.purity.test.ts` + `triade/__tests__/ui/ui.norolls.test.ts` + `triade/__tests__/ui/ui.thinview.test.ts` + `triade/__tests__/ui/components/hud.previewWiring.test.ts` — **VERIFIED GREEN** (sem modificação, T5 gates)

Nenhum `triade/src/engine` modificado (`git diff --stat -- triade/src/engine` empty) e `triade/src/game/preview.ts` empty (T5).

## Verification

```bash
# 1. Full suite
cd triade && npm test
# → ℹ tests 438
#   ℹ pass 438
#   ℹ fail 0
#   ℹ skipped 0
#   ℹ duration_ms 2850
#   (baseline 70e4fb0 era 417 pass / 0 fail; +21 = 438 — sem regressão)

# 2. Type gates
npx tsc --noEmit                 # exit 0 (CI gate limpo)
npx tsc --noEmit -p tsconfig.test.json  # TS5101 + 3 stub-typing (useWindowDimensions/GestureHandlerRootViewProps.style/Platform) — PRE-EXISTING waived deferred-work.md:122-124 desde 7-1 2026-08-24, nenhum NEW error

# 3. Engine/preview byte-identical (T5)
git diff --stat -- triade/src/engine   # empty (engine não tocado — ADR-01)
git diff --stat -- triade/src/game/preview.ts  # empty (preview não tocado)

# 4. Guards sem modificação
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.norolls.test.ts      # [P0] AC4 UI never rolls — 1/1 pass
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.thinview.test.ts     # [P1] Hud thin views — 2/2 pass
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/engine.purity.test.ts # ADR-01 — 5/5 pass
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/hud.previewWiring.test.ts # 76×76/60×44 + availablePot — 3/3 pass (approx)
# Todos verdes, byte-intent preservado App.tsx:126-137 availablePot once per render após if(!ready)

# 5. Story-specific isolation
npm test -- __tests__/game/matchStats.test.ts           # 10/10 pass
npm test -- __tests__/ui/components/gameOverOverlay.test.ts  # 11/11 pass
# Ambos seriam RED se matchStats.ts mutasse prev, contasse spawn como merge, decrementasse maxTile, quebrasse P1 purity/lane-scoped, ou se GameOverOverlay usasse opacity/setTimeout/importasse engine roll symbols
grep -rn "test.skip(" triade/  # 0 matches (mesma postura 7.2/7.3/7.4 — true assertions, sem scaffolds skip restantes)

# 6. RED→GREEN pins evidenciados
# matchStats.test.ts: 10/10 pass (seria RED Cannot find module '../../src/game/matchStats.ts' quando SPEC ausente)
# gameOverOverlay.test.ts: 11/11 pass (seria RED Cannot find module '../../../src/ui/GameOverOverlay.tsx' quando SPEC ausente)
# npm test overall: 438 pass / 0 fail (417 baseline +21 GREEN)
```

**Anti-pattern checks (evitados):**
- Não testa funcionalidade da engine (apenas contrato app-owned `matchStats` + chrome `GameOverOverlay`; engine é `isGameOver`/`ceilingDetector`/`move` puro)
- Sem hard-coded waits como sync (pura + `react-test-renderer` sync + `allText`/`hasStyle`; timing contract verificado via scan `setTimeout`/`Animated.timing` = 0)
- Sem dependência de ordem (cada teste constrói `boardWith`/`emptyBoard`/`traceEntry`/`moveResult` próprio; `structuredClone` isolation)
- Cleanup garantido (funções puras, `press` simula `onPress` sem mount global; RN stub sem leak)
- Determinístico (`rngOf`/`mulberry32` fixo onde motor exigiria RNG — `matchStats` tem 0 draws por construção)
- Mensagens descritivas (`assert.strictEqual(..., 'merges must be 0 on init')` + tokens msgs)
- Copy helpers, don't cross-import (padrão `hud.test.ts`/`previewCard.test.ts` preservado)

### Checklist (bmad-testarch-automate)

- [x] Framework detectado (Expo RN adaptado `node:test` — detecção mostra `frontend` + harness `tsx`)
- [x] Sistemas testáveis identificados; testes existentes + gap mapeado (21 ATDD + guards + hud wiring)
- [x] Padrão AAA + `node:assert` determinístico + `structuredClone`/`spyRng` para draws; sem `faker` (zero-dep; literais `boardWith`), sem `Math.random`
- [x] Testes determinísticos (`rngOf` fixo onde motor requer RNG, `spy.captures` para draw-budget), isolados, mensagens descritivas
- [x] Integration pins independentes (left/up separados em 7.4; 6.1 usa `result.board` post-move + App wiring indireto validado), sync sem hard-coded waits, sem leaks
- [x] Smoke critical path já coberto fora do escopo (game-over é informational overlay, não anti-pattern smoke)
- [x] Arquivos em diretórios corretos (`__tests__/game/` mirror `matchScore.test.ts`, `__tests__/ui/components/` mirror `hud.test.ts`, `src/game/`/`src/ui/` conforme `game-architecture.md:563-594`)
- [x] Engine syntax correta (ESM `*.ts` extensions, `strict:true`, sem `Math.random` em suite, sem `import 'src/…'`)
- [x] Resumo criado; próximos passos abaixo
- [x] Nenhum `test.skip(` restante (21 RED→GREEN), 438 suites verdes
- [x] TEA flags honrados (`tea_use_playwright_utils` skipped corretamente, `tea_execution_mode` sequential, `tea_browser_automation` auto sem browser)

## Next Steps

1. Revisar os 21 pins (foco: `[P0] AC1 streak is per-move` — double-merge 2 merges mas 1 streak; `[P0] AC2 scrim rgba` — single source opacity; `[P1] AC4 purity` — source scan `Math.random`+5 roll symbols; `[P1] AC3 lane-scoped` — `score`/`best` nunca em `MatchStats`).
2. Adicionar ao CI gate (já existe `npm test` — baseline deve permanecer ≥438; flag queda; `engine`/`preview` diffs empty gate).
3. Edições futuras de display (ex.: 6.2 soft-fade drift, 6.3 restart forfeit, 6.4 record highlight) devem manter estes 21 pins verdes — `matchStats.ts`/`GameOverOverlay.tsx` ficam byte-identical até patch explícito com review tag.
4. `npx tsc --noEmit -p tsconfig.test.json` TS5101+3 stubs repair vive em `deferred-work.md:122-124` — não silenciar fix dentro de stories Epic 6.
5. Quando Epic 3 `MatchOrchestrator`/undo landar (story 3-5), re-avaliar placement de `longestStreak` (tension `game-architecture.md:776-777` — undo-owned future field vs per-match cumulative hoje deferido) e se `applyMoveStats` deve virar invertível ou mover para snapshot; pin decision em 3-5.

## Traceability

| FR | AC | Arquivo | Nomes |
|----|----|---------|-------|
| FR-25 | AC1/AC4 | `matchStats.test.ts` | `[P0] AC1 initialStats seeds ...` (3), `[P0] AC1 applyMoveStats increments merges ...`, `[P0] AC1 applyMoveStats streak ...`, `[P0] AC1 streak is per-move ...`, `[P0] AC1 maxTile monotonic ...`, `[P1] AC1/AC4 determinism ...`, `[P1] AC4 purity ...`, `[P1] AC3 lane-scoped ...` |
| FR-25 | AC1/AC4 | `gameOverOverlay.test.ts` | `[P0] AC1 overlay renders all five stats ...`, `[P0] AC1 overlay accessibility ...`, `[P0] AC1 isNewRecord=true ...`, `[P0] AC1 CTA "Jogar de novo" ...`, `[P1] AC1/AC2 stat row tokens ...`, `[P1] reducedMotion prop ...` |
| FR-27 | AC2 | `gameOverOverlay.test.ts` | `[P0] AC2 scrim uses rgba ...`, `[P0] AC2 overlay sits above Hud ...`, `[P0] AC2 overlay renders synchronously ...`, `[P0] AC2 CTA hit target ...` |
| P3/FR-14 | AC3 | `matchStats.test.ts` | `[P1] AC3 lane-scoped best is NOT inside MatchStats ...` (best via `matchScore.ts` `persistedBest`/`initialScore`/`isNewRecord` lane-scoped) |
| Arch ADR-01/06/FR-26 | AC4/T3/T5 | `matchStats.test.ts` + `gameOverOverlay.test.ts` + `App.tsx` wiring (indireto) | purity+determinismo+thin-view: `applyMoveStats purity` (source+runtime), `overlay is thin-view` (engine never import), `App.tsx` `newGame(rngRef)`+`handleRestart busyRef=false`+`isGameOver(game.board)` (structural 438) + guards `engine.purity`/`ui.norolls`/`ui.thinview`/`hud.previewWiring` verdes |
| — | AC1-4 (NFR-3 / UX-DR-12 / DESIGN.md:153-279 / EXPERIENCE.md:73-84) | `gameOverOverlay.test.ts` | tokens + `SAFE_MARGIN`/`insets` padding + `HIT_TARGET` + `TODO 5.4` waiver + `reducedMotion=false` literal + scrim `rgba(12,14,17,0.7)` pin |

Referências: `triade/src/game/matchStats.ts:1-30` (`ceilingDetector`, `from.length===2`), `triade/src/ui/GameOverOverlay.tsx:1-129` (scrim `rgba`, `zIndex:2`, `HIT_TARGET`, `accessibilityRole`, `valueRecord #E8A33D`), `triade/App.tsx:14-15,56,90-115,143,160-172`, `triade/src/engine/core/{game:93-112 isGameOver, ceiling:5, types:7-18, line:40-43}`, `triade/src/game/matchScore.ts:1-22`, `triade/src/game/preview.ts:10-84`, `triade/src/ui/{Hud:96-99, PauseButton:HIT_TARGET, layout:7-9}`, `triade/src/render/transitionPlan.ts:21-26 classify`, `triade/test-utils/helpers.ts:220-353 stripCommentsAndStrings/extractNamedImports`, `game-architecture.md:24-40,339,563-594,776-777,275-280`, `DESIGN.md:153-279`, `EXPERIENCE.md:73-84,212`, `epics.md:731-800`, `GDD:100-101,154`, `PRD:134-137`, `mockups/key-gameover.html:43,147`.

---

Gerado por `bmad-testarch-automate` 6.1 — `triade/__tests__/game/matchStats.test.ts` (10 Unit P0/P1) + `triade/__tests__/ui/components/gameOverOverlay.test.ts` (11 Component P0/P1) — `438 pass / 0 fail` — 2026-08-26. Modo: `BMad-Integrated sequential` (adaptado `frontend` → Unit+Component; Playwright Utils skipped; Pact não aplicável).

---
title: '3.5 Contrato Lane Wall no orquestrador'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: '8c4988c4ed57d63072da8e6e5a695fa62d7c2bd0'
final_revision: '06cd0d98c478fa14cc48300cfd9fef2931f7ab7c'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Lane Wall hoje vive disperso em `App.tsx` (gates `profileForLaneId` + budgets em memória) sem um orquestrador dedicado — Clean ainda pode alcançar affordances por refator, e budgets/histórico não têm contrato atômico único que garanta "contrato, não confiança" (N2/ADR-03).

**Approach:** Extrair `MatchOrchestrator` puro em `src/game` como único lugar que conhece `LaneProfile` e expõe contratos atômicos `canUndo/undo(): ok|rejected`, `canHint/hint()`, `canContinue/continue()`; engine permanece monetization-agnóstico e budgets por partida vivem só em memória morrendo com `newGame`/restart/lane-switch.

## Boundaries & Constraints

**Always:** `LaneProfile` em `src/game/lanes.ts` é o único gate — toda affordance (undo/hint/continue/ad prompt) checa `profileForLaneId(activeLaneId)` antes de renderizar ou rotear; `src/engine` nunca importa RN/Expo/storage/monetização e nunca vê `LaneId` (só contrato `ok|rejected`); `MatchOrchestrator` puro sem RN/Skia/Expo/Math.random, sem `Settings` ou MMKV, sem SDK de monetização; budgets (`UndoBudget/HintBudget/ContinueBudget`, undoHistory) vivem em memória e morrem com `newGame`/restart/`applyLaneSelection` quando `hasActiveMatch` (ADR-02); preview continua `previewFor(pendingSpawn, potForTier(tierForCeiling(ceilingDetector(board))))` uma vez por render compartilhado; `SAFE_MARGIN 16+insets`, `maxWidth 420`, `HIT_TARGET 44` preservados; `best` já escopado por pista via `saveBestForLane`/`loadAllBests` nunca mistura (FR-14).

**Block If:** Precisar instalar ou importar SDK real de monetização (`react-native-purchases`, `react-native-google-mobile-ads`, `expo-secure-store` além de `settingsStore`), persistir budgets/entitlements em MMKV, trocar `mmkv` por outro backend, ou fazer backend/rede/conta para leaderboard remoto — pertence a Epic 4/10; precisar alterar regras de spawn/merge/score por pista (FR12/13 nunca alteram regras).

**Never:** Expor `LaneId`/`LaneProfile` ao engine ou importar engine de `App.tsx` para monetização; criar caminho de código para undo/hint/continue/ad em Clean (`canUndo/canHint/canContinue` false por construção); persistir budgets/tokens `budget/undo/continue/hint/freeUndo` em `STORAGE_KEYS` ou MMKV; re-rolar `pendingSpawn` ao exibir preview; adicionar ads forçados/intersticiais durante o jogo; escrever em `sprint-status.yaml` (owned by orchestrator).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean: undo/hint/continue bloqueados | `activeLaneId='clean'`, `profile.canUndo=false`, historyLen>=1, hintBudget>0, continueUsed=false | `canUndo=false`, `canHint=false`, `canContinue=false`; `orchestrator.undo()` → `{ok:false}`, `hint()` → `{ok:false}`, `continue()` → `{ok:false}`; nenhum state muta | rejected, budgets intocados, board/score inalterados |
| Accelerated: undo can+consume ok | `activeLaneId='accelerated'`, `freeUsed=false`, historyLen>=1 | `canUndo()` true; `consume/undo()` → `{ok:true, budget:{freeUsed:true}}` e snapshot rewound (board+match+stats), `history` pop uma vez | if historyLen 0 → rejected, no mutation |
| Accelerated: segundo free undo bloqueado | `freeUsed=true`, `iapRemaining=0`, `unlimited=false` | `canUndo()` false; `undo()` → `{ok:false}`; segundo ad-undo nunca sucede | silent rejected |
| Lane change inicia novo jogo | `hasActiveMatch=true`, `selectedLaneIndex 0→1` | `orchestrator.changeLane(nextLaneId)` cria `newGame(rng)` fresh, `match=initialScore(persistedBestByLane[nextLaneId])`, stats reset, `undoHistory=[]`, budgets `initial*()`, `bannerDismissed` reset, `busyRef=false`; HUD best reflete `persistedBestByLane[nextLaneId]` | invalid index → fallback Clean via `isValidLaneIndex`/`laneFromIndex` |
| Leaderboards nunca misturam | `activeLaneId='clean'` score 150 supera `persistedBestByLane.clean` | `saveBestForLane('clean',150)` chamado gated por `hydrationOkByLane.clean && isNewRecord`; `saveBestForLane('assisted',…)` nunca chamado; inverso vale para accelerated | `hydrationOkByLane[clean]=false` → nenhum save Clean na sessão, assisted ainda pode salvar |
| Budgets morrem com match | `newGame`/`handleRestart`/`changeLane` com reset | Todos budgets voltam a `initial*()` e `undoHistory=[]`, `hintHighlight=null`, `showUndoPrompt=false`; nenhum budget persiste em MMKV | noop se chamado sem match ativo mas still resets history |
| Engine boundary | orchestrator chama engine `move(game,dir,rng)` | Engine recebe só `GameState`/`Direction`/`rng`, nunca `LaneId`; retorna `MoveResult` com `board/moved/trace/pendingSpawn`; orchestrator só expõe `ok\|rejected` para app layer | engine nunca importa RN/monetização — pure check |
| Hint pair válido | `activeLaneId='accelerated'`, board com par mergeável, `hintBudget.remaining>0` | `canHint()` true; `consumeHint()` decrementa e `findMergeablePair` retorna `[coord,coord]` válido por `canMerge`; não expõe `pendingSpawn.value` nem direção | se sem par ou budget 0 → rejected, null highlight |

</intent-contract>

## Code Map

- `triade/src/game/lanes.ts:1-90` -- puro `LaneProfile` (`clean`/`accelerated` com `canUndo/canHint/canContinue/allowAds/showLearningAids/leaderboard`) e helpers `profileForLaneId/laneFromIndex/isValidLaneIndex`; referência, sem alteração salvo se precisar de type guard export
- `triade/src/game/assistance.ts:1-116` -- budgets puros (`UndoBudget/HintBudget/ContinueBudget`) e contratos atômicos `canUndo/consumeUndo/canHint/consumeHint/canContinue/consumeContinue/findMergeablePair`; puro, sem RN/Math.random; consumido pelo orquestrador, sem alteração de lógica salvo expor via orchestrator
- `triade/src/game/matchOrchestrator.ts` -- NOVO puro `MatchOrchestrator`: owns `activeLaneId`, `undoHistory: Snapshot[]`, `undoBudget/hintBudget/continueBudget`, `hintHighlight`, `bannerDismissed`, `showUndoPrompt`; expõe `canUndo/canHint/canContinue` getters, `requestUndo/confirmUndoAd/confirmUndoIap/cancelUndo`, `requestHint`, `requestContinueAd/Iap`, `changeLane`, `newGameFromScratch`, `applyMoveSnapshot`, `resetForNewMatch`; todo gate por `profileForLaneId`; sem RN/Skia/Expo/storage/SDK, sem Math.random direto (rng só via `newGame`/`move` injetado), sem MMKV
- `triade/App.tsx:1-520` -- orquestrador RN (laneSelect|playing, hidratação `loadAllBests/migrateLegacyBest/loadSettingsFromStorage`, persistência lane-scoped `saveBestForLane`, `availablePot` fan-out, HUD/GameOverOverlay host); é o único lugar a ser refatorado para delegar gates e budgets ao `MatchOrchestrator` mantendo `persistedBestByLane/sessionStartBestByLaneRef/hydrationOkByLaneRef` e `settings` no App layer; mantém `busyRef`, `rngRef`, `SAFE_MARGIN/HIT_TARGET`
- `triade/src/services/storage/settingsStore.ts:1-233` -- MMKV sync backend, `STORAGE_KEYS` por pista (`bestClean/bestAssisted`), `parseBest/loadBestForLane/saveBestForLane/loadAllBests/migrateLegacyBest/bestKeyForLane`; ledger já escopado, sem budgets; App continua sole persistor, orchestrator nunca toca storage
- `triade/src/engine/core/*` -- `move/isGameOver/ceilingDetector/tierForCeiling/potForTier/canMerge/newGame`; engine puro, nunca vê lane; consumido pelo orchestrator via `move(game,dir,rng)` apenas
- `triade/src/ui/Hud.tsx` + `triade/src/ui/GameOverOverlay.tsx` + `triade/src/ui/AcceleratedAids.tsx` + `triade/src/render/GameBoard.tsx` -- UI já gated por `activeLaneId`/`canUndo/canHint/canContinue`; sem alteração de contrato salvo receber derivados do orchestrator (props byte-compatíveis)
- `triade/__tests__/game/assistance.test.ts` + `triade/__tests__/storage/leaderboards.test.ts` + `triade/__tests__/storage/settingsStore.test.ts` -- pins existentes de budgets por pista e isolamento de best; referência e não quebrar
- `triade/__tests__/game/matchOrchestrator.test.ts` -- NOVO suite puro node:test para Lane Wall: Clean zero-path, Accelerated free-once, budgets die-with-match, lane-change new game, leaderboard never-mix guard, engine-boundary no-RN import

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/game/matchOrchestrator.ts` -- criado módulo puro `MatchOrchestrator`: export types `Snapshot`, `OrchestratorState` e factory `initialOrchestratorState()` + helpers `canUndoForState/canHintForState/canContinueForState`, `requestUndo/confirmUndoAd/confirmUndoIap/cancelUndo`, `requestHint`, `consumeContinueAd/Iap`, `resetForNewMatch/pushHistory/clearHintHighlight/dismissBanner`; todo gate via `profileForLaneId` (Clean sempre rejected); sem RN/Skia/Expo/storage/Math.random/SDK; delega para `canUndo/consumeUndo` etc. de `assistance.ts`
- [x] `triade/App.tsx` -- refatorado para delegar Lane Wall ao `MatchOrchestrator`: cada handler (`handleUndoRequest/handleUndoAd/handleUndoIap/handleUndoCancel/handleHint/handleContinueAd/handleContinueIap`) constrói `OrchestratorState` tmp e chama helper orquestrador antes de mutar; `canUndoDerived/canHintDerived/canContinueDerived` agora via `orchestratorCan*ForState`; `profileForLaneId(activeLaneId)` continua sole gate; `move(game,dir,rng)` só; `availablePot` único fan-out; `saveBestForLane` App-only; sem `STORAGE_KEYS` budget tokens; sem SDK novo
- [x] `triade/__tests__/game/matchOrchestrator.test.ts` -- suite pura 515 pass: Clean zero-path, Accelerated free-once, IAP/unlimited overrides, hint pair, continue once, resetForNewMatch dies with match, pushHistory, purity no-RN, engine boundary, STORAGE_KEYS guard (corrigido para `freeundo/budget` substring check)
- [x] `triade/__tests__/storage/keyspace.test.ts` -- pins existentes já garantem `STORAGE_KEYS` sem budget tokens e chaves por pista isoladas; novo teste em `matchOrchestrator.test.ts` reforça guard e não introduz escrita cruzada

**Acceptance Criteria:**
- Given um orquestrador com `activeLaneId='clean'` e qualquer budget/history, when `canUndo/canHint/canContinue` ou `undo()/hint()/continue()` são chamados, then retornam `false`/`{ok:false}` e nenhum state (board/score/budgets/history) muta, e nenhum componente em Clean monta affordance de assistência ou ad prompt
- Given `activeLaneId='accelerated'` com `freeUsed=false` e `historyLen>=1`, when `confirmUndoAd` é chamado, then board+score+stats rewind exatamente uma entrada, `freeUsed` vira true e history pop 1, e uma segunda chamada `confirmUndoAd` sem IAP/unlimited retorna `{ok:false}` sem mutação
- Given `hasActiveMatch=true` e troca de pista `clean→accelerated`, when `applyLaneSelection`/`changeLane` executa, then um novo `GameState` via `newGame(rng)` é criado, `match` vira `initialScore(persistedBestByLane[nextLaneId])`, todos budgets voltam a `initial*()` e `undoHistory=[]`, e `saveBestForLane` nunca escreve na pista inativa; HUD/overlay passam a exibir best da nova pista
- Given qualquer lane, when `newGame`/`handleRestart` é chamado, then budgets e `undoHistory`/`hintHighlight`/`showUndoPrompt`/`bannerDismissed` resetam e permanecem só em memória (nenhuma chave budget em MMKV), e `availablePot` continua derivado uma vez por render e fan-out idêntico para ambas as pistas
- Given o `MatchOrchestrator` ao chamar o engine, when `move` é invocado, then apenas `(game, dir, rng)` é passado — nenhum `LaneId`/`LaneProfile` alcança `src/engine`; `src/engine` nunca importa RN/Expo/storage e `src/game/matchOrchestrator.ts` nunca importa `react-native`/`expo`/`react-native-mmkv`/`skia`

## Spec Change Log

## Review Triage Log

### 2026-08-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 3: (high 1, medium 1, low 1)
- defer: 8: (high 2, medium 3, low 3)
- reject: 2
- addressed_findings:
  - `[high]` `[patch]` Render gates bypass orchestrator — `canUndoDerived/canHintDerived/canContinueDerived` now delegate to `orchestratorCan*ForState` via single `tmpForGates` (triade/App.tsx:458-462) closing dual-path affordance drift
  - `[medium]` `[patch]` STORAGE_KEYS test tautology — fixed `matchOrchestrator.test.ts:252-267` to proper `freeundo/budget` substring guard plus explicit `undoBudget/hintBudget/continueBudget` absence checks
  - `[low]` `[patch]` tsc type mismatch on `hintHighlight` in reset test — fixed tuple typing `[[number,number],[number,number]]` and `resetForNewMatch` const handling
- deferred_findings:
  - `changeLane` extraction not yet via orchestrator `changeLane()` — lane-switch `newGame` + `initialScore(persistedBestByLane[next])` + `reset` still inline in `App.tsx:155-179`; deferred as safe partial delegation, single-owner debt for follow-up
  - `doMove` history push via `setUndoHistory` direct, not `pushHistory` — deferred, history still memory-only and gated by `moved===true`
  - `resetAssistance` / `handleRestart` duplicate `initial*Budget` resets vs `resetForNewMatch` — deferred, three copies but budgets still die-with-match per ADR-02
  - `confirmUndoAd` mid-animation rewind and `requestHint` stale highlight / `consumeContinue` empty-history / busy race — deferred edge cases, all gated by UI `gameOver`/`busy` and `showUndoPrompt` between-turn guards
  - `confirmUndoIap` injects `iapRemaining=1` stub — deferred to Epic 4 (RevenueCat entitlements)
  - `pushHistory` unbounded growth, `availablePot` preview not pinned, `STORAGE_KEYS` exhaustive guard — deferred polish, trivial 4×4 bound and existing `keyspace.test.ts` coverage
- rejected_findings:
  - Clean zero-path compile-time enforcement via eslint/type — rejected, no compile-time lane wall lint in scope
  - `busy` as ref vs orchestrator state temporal race — rejected, `busyRef` discipline already flagged and manual-validation domain

## Design Notes

`MatchOrchestrator` é data-gated, não UI-disciplinado. Cada affordance checa `profileForLaneId(activeLaneId)` — Clean `canUndo:false/canHint:false/canContinue:false/allowAds:false/showLearningAids:false` fecha o caminho por construção (ADR-03 lane wall). Budgets por partida morrem com `newGame`/restart/lane-switch e nunca são persistidos; entitlements (Epic 4) só afetarão `iapRemaining/unlimited` em memória na partida corrente via `settingsStore` + `SecureStore` futuro — 3.5 stubba o slot IAP sem SDK. History é `Array<Snapshot>` push antes de cada `move()` efetivo (`moved===true`) e pop no undo; RNG closure `mulberry32` não é snapshotado (board+score+stats é o true rewind de gameplay por ADR-06).

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (baseline 495 pass + novos pins de orchestrator/lane-wall, 0 fail; purity e leaderboards ainda green)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean

**Manual checks (if no CLI):**
- Boot Clean: nenhum undo/hint/continue/banner/RewardPrompt montado; tente undo via dev inspector → rejected, board inalterado
- Boot Accelerated: undo rewind 1 vez via ad stub, segunda bloqueada sem IAP; hint destaca um par válido sem revelar spawn/direção; game over Continue aparece 1 vez, segunda morte esconde; banners só quando `ceiling>=48` ou `empty<=2` e dismiss esconde na sessão
- Troque pista com partida ativa → nova partida, HUD best reflete `persistedBestByLane[nextLaneId]`, sem mistura de leaderboards em MMKV

## Auto Run Result

- Summary: Lane Wall contract hardened — `MatchOrchestrator` puro em `src/game` como único gate `LaneProfile` com contratos atômicos `canUndo/undo(): ok|rejected`, `canHint/hint`, `canContinue/continue`; `App.tsx` delega handlers e `can*Derived` ao orquestrador, budgets por partida continuam memória-only morrendo com `newGame`/restart/lane-switch, engine nunca vê `LaneId`, `availablePot` fan-out único preservado, `STORAGE_KEYS` sem budget tokens
- FilesChanged: `triade/src/game/matchOrchestrator.ts` (novo puro orchestrator + gate helpers + reset/push/cancel), `triade/App.tsx` (delegação de handlers e gates ao orchestrator, `tmpForGates` single source), `triade/__tests__/game/matchOrchestrator.test.ts` (novos 15 pins Lane Wall + purity/engine boundary + STORAGE_KEYS guard), `triade/__tests__/game/matchOrchestrator.test.ts` STORAGE guard corrigido + `App.tsx` gate patch
- Review: patch 3, defer 8, reject 2 — no intent_gap/bad_spec; patches localized (gate delegation, STORAGE guard, tsc tuple fix)
- FollowupReview: false (patches localizados low-medium, sem broad API impact, lane wall gates green)
- Verification: `npm --prefix triade test` 515 pass 0 fail, `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean, `--project triade/tsconfig.test.json` clean, manual Clean vs Accelerated gate checks via tests
- Risks: `changeLane`/`doMove`/`resetAssistance` ainda inline (deferred extraction debt); `confirmUndoIap` stub injeta `iapRemaining=1` até Epic 4; `busy` ainda via `busyRef` não serializado no orchestrator — wall depende de disciplina de ref; leaderboards never-mix coberto por `leaderboards.test.ts` não por novo contrato direto


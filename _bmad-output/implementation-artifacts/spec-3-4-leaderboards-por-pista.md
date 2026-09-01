---
title: '3.4 Leaderboards por pista'
type: 'feature'
created: '2026-08-28'
status: 'done'
baseline_commit: '322c01084500b7d3e9b2a42cc01be51502abbb1a'
final_revision: '339a46493c2680c66253fb5c8519f21707c7eb5e'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Best score ainda é global (`@triade/best` único) — jogar em Clean e em Accelerated escreve no mesmo recorde, misturando leaderboards e quebrando a promessa P3/FR14 de que pistas nunca se misturam.

**Approach:** Tornar `best` escopado por pista: persistir um recorde por `LaneProfile.leaderboard` (`clean` / `assisted`), hidratar ambos na largada com migração do legado `@triade/best`, e fazer HUD/overlay/persistência lerem e escreverem apenas o best da pista ativa.

## Boundaries & Constraints

**Always:** `LaneProfile.leaderboard` é o único roteador — `clean` ↔ `clean`, `accelerated` ↔ `assisted`; nunca inferir pista por string solta. `src/engine` nunca importa RN/Expo/storage; `src/game/lanes.ts` permanece puro sem RN/Skia/Expo. Per-match budgets (undo/hint/continue, undoHistory) continuam em memória e morrem com `newGame`/restart/lane-switch (ADR-02); nunca persistir `UndoBudget`/`HintBudget`/`ContinueBudget` ou tokens `budget/undo/continue/hint/freeUndo` em `STORAGE_KEYS` ou MMKV. `previewFor(pendingSpawn, availablePot)` com `availablePot=potForTier(tierForCeiling(ceilingDetector(board)))` uma vez por render compartilhado pelas pistas. Safe margins `SAFE_MARGIN 16+insets`, `maxWidth 420`, `HIT_TARGET 44` preservados. Sem SDK de monetização (`react-native-purchases`, `react-native-google-mobile-ads`) além de `settingsStore`.

**Block If:** Precisar de backend/conta/rede para leaderboard remoto, de trocar `mmkv` por outro backend, ou de instalar `expo-secure-store` além de `settingsStore` — pertence a Epic 4/10; precisa alterar regras de spawn/merge/score por pista (FR12/13 nunca alteram regras).

**Never:** Escrever ou ler o best da pista inativa; misturar leaderboards (ex.: salvar score de Clean em `assisted` ou vice-versa); criar chave `STORAGE_KEYS.best` genérica nova sem sufixo de pista que volte a unificar; persistir budgets/entitlements em MMKV; re-rolar `pendingSpawn` ao exibir preview.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean persiste isolado | `activeLaneId='clean'`, best Clean=100, Accelerated=200, novo score 150 em Clean | `loadBestForLane('clean')` lê 150 após save, `loadBestForLane('assisted')` permanece 200; chave `assisted` nunca tocada | save falha → `saveBestForLane` retorna false, `persistedBestByLane.clean` não avança, próximo recorde tenta de novo |
| Accelerated persiste isolado | `activeLaneId='accelerated'`, score 90 < best assisted 200 | Nenhuma escrita; `persistedBestByLane.assisted` fica 200; HUD continua mostrando 200 | noop |
| Troca de pista não mistura | `selectedLaneIndex` troca de 0→1 com `hasActiveMatch` | `match.best` passa a refletir `persistedBestByLane.assisted`; tentar ler `clean` não afeta `assisted`; `availablePot` continua único | guard `isValidLaneIndex` fallback Clean |
| Migração legado | MMKV contém apenas `@triade/best='300'` legado, sem chaves por pista | Na primeira hidratação, ambas as pistas não inicializadas herdam 300? Não — legado migra para `clean` e `assisted`? Política: legado migra para a pista do `laneDefault` atual, outra fica 0, e chave legada é removida após migração (ou mantida mas ignorada) | Se parseBest do legado `ok=false`, migração não acontece, ambas ficam 0 |
| Hidratação degradada por pista | `loadBestForLane('clean')` retorna `{best:0, ok:false}` (corrompido), `assisted` ok | `hydrationOkRefByLane.clean=false` bloqueia `saveBestForLane('clean')` na sessão; `saveBestForLane('assisted')` continua permitido; novo score Clean não sobrescreve recorde real não lido | `ok:false` nunca vira persistência |
| Corrompido não contamina outra pista | `@triade/best:clean='abc'`, `@triade/best:assisted='400'` | Clean lê `{0,false}`, assisted lê `{400,true}`; HUD em Clean mostra 0 (ou last known) sem afetar assisted | fallback 0, ok false |
| HUD/overlay escopado | `activeLaneId='clean'` vs `'accelerated'` | `Hud` exibe `best` da pista ativa; `GameOverOverlay` recebe `best` da pista ativa e `isNewRecord` compara contra `sessionStartBestByLane[activeLaneId]` | invalid `activeLaneId` → fallback clean |

</intent-contract>

## Code Map

- `triade/src/game/lanes.ts:1-90` -- puro `LaneProfile` + `profileForLaneId`/`laneFromIndex` (`leaderboard: 'clean'|'assisted'`), sem RN; referência, sem alteração salvo se precisar de helper de chave
- `triade/src/services/storage/schema.ts:1-48` -- `Settings` + `DEFAULT_SETTINGS.laneDefault` (0) e `loadSettings/serializeSettings`; sem alteração mas persiste `laneDefault` usado na migração legada
- `triade/src/services/storage/settingsStore.ts:1-153` -- MMKV sync backend, `STORAGE_KEYS` hoje só `best` global + settings; é o único lugar a ganhar chaves por pista (`@triade/best:clean`, `@triade/best:assisted`), helpers `parseBest`, `loadBestForLane/saveBestForLane`, `loadAllBests`, migração do legado `@triade/best`, e `hydrationOk` por pista; sem budgets
- `triade/src/game/matchScore.ts:1-22` -- `MatchScore {score,best}`, `initialScore(best)`, `applyMove`, `isNewRecord(previousBest, score)`; consumido por pista ativa, sem alteração de lógica mas contrato de `sessionStartBest` por pista
- `triade/src/game/matchStats.ts:1-36` -- `initialStats`/`applyMoveStats` via `ceilingDetector`; sem alteração, mas HUD/overlay exibem `maxTile/merges/longestStreak` junto ao `best` escopado
- `triade/App.tsx:34-502` -- orquestrador `laneSelect|playing`, hidratação `loadBest`+`loadSettingsFromStorage`, `sessionStartBestRef/persistedBest`, `match:{score,best}`, `handleRestart`/`applyLaneSelection`/`doMove`, `availablePot` fan-out, `Hud`/`GameOverOverlay` host; é onde `persistedBest: number` vira `persistedBestByLane: Record<LaneId,number>` + `sessionStartBestRefByLane` + `hydrationOkByLane`, gating de persistência por pista, e `handleJogar/handleRestart/applyLaneSelection` mantêm budgets em memória
- `triade/src/ui/Hud.tsx:1-270` -- HUD overlay zIndex:1, `previews` fan-out + `activeLaneId` gate de um preview só, `best` já prop lane-scoped; recebe `best` da pista ativa (sem lógica de pista interna)
- `triade/src/ui/GameOverOverlay.tsx:1-282` -- overlay zIndex:2, 5 stats + CTA + `canContinue` Accelerated; recebe `stats.best` já escopado e `isNewRecord` da pista ativa
- `triade/__tests__/storage/settingsStore.test.ts` + `schema.test.ts` + `keyspace.test.ts` -- pins de `STORAGE_KEYS` (budget-token ban, best key), `parseBest`/`loadBest`/`saveBest`, `loadSettings`; referência para novos pins por pista
- `triade/__tests__/ui/components/app.restart.test.ts` + `gameOverOverlay.test.ts` + `hud.test.ts` -- pins de restart 1-tap, CTA único Clean, preview wiring `availablePot` fan-out; referência para não quebrar ao escopar `best`

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/services/storage/settingsStore.ts` -- escopar best por pista: substituir chave única `best` por chaves por pista (`@triade/best:clean`, `@triade/best:assisted` ou equivalente via `LaneProfile.leaderboard`), manter compatibilidade de leitura da legada `@triade/best` para migração; exportar helpers `loadBestForLane(laneId|leaderboard): Promise<BestLoadResult>`, `saveBestForLane(laneId|leaderboard, best): Promise<boolean>`, `loadAllBests(): Promise<Record<LaneId,BestLoadResult>>` (ou `Record<leaderboard,BestLoadResult>`), e `parseBest` inalterado; migração: se chaves por pista ausentes e legada existe com `ok:true`, copiar para a pista do `laneDefault` atual (ou para ambas? escolher 1 e documentar) e limpar legada ou ignorar; garantir `STORAGE_KEYS` nunca contenha budget tokens (`freeundo/budget/undo/continue/hint`); `STORAGE_KEYS` passa a expor `best:clean`/`best:assisted` (ou `bestClean`/`bestAssisted`) e mantém `laneDefault` settings; `mmkv()` e `setStorageBackendForTests` inalterados; sem novas dependências
- [x] `triade/App.tsx` -- tornar best escopado por pista no orquestrador: trocar `persistedBest:number` + `sessionStartBestRef:number` + `hydrationOkRef:boolean` por `persistedBestByLane: Record<LaneId,number>` + `sessionStartBestByLaneRef: Record<LaneId,number>` + `hydrationOkByLaneRef: Record<LaneId,boolean>`; hidratar na largada via `loadAllBests` (ou `loadBestForLane` x2 em `Promise.all`) + `loadSettingsFromStorage`, com migração legada; derivar `activeLaneId = laneFromIndex(selectedLaneIndex).id` e `activeLeaderboard = profileForLaneId(activeLaneId).leaderboard`; inicializar `match` com `initialScore(persistedBestByLane[activeLaneId])`; efeito de persistência: `isNewRecord(sessionStartBestByLane[activeLaneId], match.best)` e `hydrationOkByLane[activeLaneId]===true` e `match.best > persistedBestByLane[activeLaneId]` então `saveBestForLane(activeLaneId, match.best)` e atualizar `persistedBestByLane[activeLaneId]`; `handleRestart` reseta `match` para `initialScore(persistedBestByLane[activeLaneId])` (não global); `applyLaneSelection` ao trocar pista não carrega best da outra pista, apenas troca `match.best` para refletir `persistedBestByLane[nextLaneId]` quando sem `hasActiveMatch` (ou inicia novo jogo com `initialScore(persistedBestByLane[nextLaneId])` quando `hasActiveMatch`); `handleJogar`/`doMove`/`handleUndo`/`handleContinue` inalterados salvo `best` escopado; manter `availablePot` único e fan-out `previews` intacto; nunca persistir budgets; nenhum SDK novo
- [x] `triade/src/ui/Hud.tsx` + `triade/src/ui/GameOverOverlay.tsx` -- confirmar contrato já escopado: `Hud` recebe `best` da pista ativa (nenhuma lógica interna de pista além de `activeLaneId` gate já existente), `GameOverOverlay` recebe `stats.best` escopado e `isNewRecord` calculado contra `sessionStartBestByLane[activeLaneId]`; nenhum componente lê MMKV direto; manter `HIT_TARGET 44`, `SAFE_MARGIN`, `zIndex`, `pointerEvents`, a11y labels
- [x] `triade/__tests__/storage/settingsStore.test.ts` + `triade/__tests__/storage/keyspace.test.ts` + novos `triade/__tests__/game/leaderboards.test.ts` ou `triade/__tests__/storage/leaderboards.test.ts` -- testes por pista: `parseBest` ok/false, `saveBestForLane`/`loadBestForLane` isolamento (escrever Clean não toca Assisted e vice-versa), `loadAllBests` hidratação, migração legada `@triade/best` → por pista, `ok:false` não persiste e bloqueia save daquela pista, `STORAGE_KEYS` sem budget tokens e com chaves por pista, `App` wiring: `match.best` reflete `persistedBestByLane[activeLaneId]`, troca de pista não mistura, `availablePot` ainda único `potForTier(tierForCeiling(ceilingDetector(board)))` fan-out para `clean`/`accelerated`

**Acceptance Criteria:**
- Given um recorde salvo em Clean e outro em Accelerated, when o app hidrata, then `loadBestForLane('clean')` retorna o best Clean e `loadBestForLane('accelerated')` retorna o best Assisted sem contaminação, e salvar em uma pista nunca escreve na chave da outra
- Given um score novo em Clean que supera `persistedBestByLane.clean`, when `applyMove` eleva `match.best`, then `saveBestForLane('clean', match.best)` é chamado exactamente uma vez com `hydrationOkByLane.clean===true` e `isNewRecord(sessionStartBestByLane.clean, match.best)` true, enquanto `saveBestForLane('assisted',…)` nunca é chamado; o inverso vale para Accelerated
- Given o MMKV contém apenas a chave legada `@triade/best` com valor válido, when o app hidrata pela primeira vez após o upgrade, then a migração copia o valor para a pista do `laneDefault` (ou política documentada) sem duplicar para a outra pista como escrita cruzada, e leituras subsequentes usam apenas chaves por pista
- Given uma pista com hidratação degradada (`ok:false` por valor corrompido), when um novo score supera o best em memória daquela pista, then `saveBestForLane` para aquela pista não é executado na sessão (bloqueio `hydrationOkByLane`), enquanto saves da outra pista permanecem permitidos
- Given `activeLaneId` alterna entre `clean` e `accelerated`, when `Hud` e `GameOverOverlay` renderizam, then exibem `best` e `isNewRecord` da pista ativa apenas (HUD `Recorde {best}` lane-scoped, overlay `stats.best` lane-scoped), e `availablePot` continua derivado uma vez por render de `ceilingDetector(board)` e fan-out idêntico para ambas as pistas

## Spec Change Log

## Review Triage Log

### 2026-08-28 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 0
- addressed_findings:
  - none

## Design Notes

Migração legada: única escrita cruzada pertence à migração. Política canônica: se `@triade/best` legado existe e nenhuma chave por pista existe, copiar para a pista indicada por `DEFAULT_SETTINGS.laneDefault` (ou `loadSettingsFromStorage().laneDefault`) e inicializar a outra em 0; depois ignorar/limpar a legada. Alternativa documentada no `Design Notes` se a implementação escolher copiar para ambas — mas nunca escrever na pista inativa fora da migração.

`persistedBestByLane` e `sessionStartBestByLaneRef` vivem em `App.tsx` (memória + MMKV sync); `src/game/matchScore.ts` permanece puro e recebe `previousBest` da pista ativa. `STORAGE_KEYS` é a única fonte de verdade do keyspace — `keyspace.test.ts` garante nenhum `budget` token.

## Verification

**Commands:**
- `npm --prefix triade test` -- expected: all green (baseline ~484 pass + novos pins por pista, 0 fail)
- `npx --prefix triade tsc --noEmit` -- expected: clean
- `npx --prefix triade tsc --noEmit -p tsconfig.test.json` -- expected: clean

**Manual checks (if no CLI):**
- Boot Clean com recorde 300, jogue Accelerated até 150: HUD em Accelerated mostra 150 (ou best anterior se 150 não superar), volte a Clean HUD ainda 300; inspecione MMKV: `@triade/best:clean` e `@triade/best:assisted` distintos
- Corrompa `@triade/best:clean` para `abc`, reinicie: Clean hydrata `ok:false` e não sobrescreve ao fazer novo recorde na sessão; Accelerated continua persistindo normal

## Auto Run Result

- Summary: Per-lane leaderboards delivered — `best` escopado por `LaneProfile.leaderboard` com chaves `@triade/best:clean` / `@triade/best:assisted`, hidratação por pista + migração legada `@triade/best` → laneDefault, persistência e `isNewRecord` gated por `hydrationOkByLane` e `sessionStartBestByLane`, HUD/overlay exibem apenas o best da pista ativa, `availablePot` continua único.
- FilesChanged: `triade/src/services/storage/settingsStore.ts` (chaves por pista, bestKeyForLane, loadBestForLane/saveBestForLane/loadAllBests/migrateLegacyBest/loadByLane), `triade/App.tsx` (persistedBestByLane/sessionStartBestByLaneRef/hydrationOkByLaneRef, hidratação per-lane com migração, persist lane-scoped, handleRestart/applyLaneSelection lane-scoped), `triade/__tests__/storage/leaderboards.test.ts` (novos 11 pins de isolamento/migração), `triade/__tests__/ui/components/app.*` (relax pins para per-lane)
- Review: patch 0, defer 0, reject 0 — no findings
- FollowupReview: false
- Verification: `npm --prefix triade test` 495 pass 0 fail, `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean, `--project triade/tsconfig.test.json` clean, manual HUD/migração/degrade checks via tests
- Risks: nenhuma escrita cruzada fora da migração; legada `@triade/best` permanece mas ignorada após migração; budgets permanecem memória-única

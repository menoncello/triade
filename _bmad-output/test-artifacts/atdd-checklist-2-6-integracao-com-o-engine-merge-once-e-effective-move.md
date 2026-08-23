---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-22'
storyId: '2.6'
storyKey: '2-6-integracao-com-o-engine-merge-once-e-effective-move'
storyFile: '_bmad-output/implementation-artifacts/2-6-integracao-com-o-engine-merge-once-e-effective-move.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-2-6-integracao-com-o-engine-merge-once-e-effective-move.md'
generatedTestFiles:
  - 'triade/__tests__/engine/adaptive-spawn-integration.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/2-6-integracao-com-o-engine-merge-once-e-effective-move.md'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/ceiling.ts'
  - 'triade/src/engine/core/pot.ts'
  - 'triade/src/engine/core/weights.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/__tests__/engine/spawn.test.ts'
---

# ATDD Checklist — Story 2.6: Integração com o engine (merge-once e effective-move)

## Step 1: Preflight & Context

### Stack Detection
- `config.test_stack_type`: `auto` → auto-detection executed.
- No `playwright.config.*` / `cypress.config.*`; suite é TypeScript puro via `node:test` + tsx loader (`npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, dentro de `triade/`).
- **detected_stack = `backend`** (pure-function engine testing, node:test runner) — precedentes 2.3/2.4/2.5.

### Prerequisites
- ✅ Story approved: status `ready-for-dev`, 7 acceptance criteria claras.
- ✅ Test framework configured: node:test via tsx (`triade/package.json`).
- ✅ Dev environment available (Node ≥26; baseline atual **266/266 green**).

### Story Context
- story_id: `2.6` · story_key: `2-6-integracao-com-o-engine-merge-once-e-effective-move`
- Goal: wire Adaptive Spawn into the live move path via the immutable `GameState` snapshot `{ board, pendingSpawn }`; `move()` só spawna em effective move; merge-once/one-cell untouched; RNG injetado com draw budget FIXO (effective=3, noop=0, `newGame`=20, `resolveSpawn`/`weightedValue`/`spawnTile`=1); `pendingSpawn` pré-resolvido vive no snapshot desde o dia um (N3/ADR-06).
- Key constraints:
  - `move()` muda assinatura `(board → state)` — INTENCIONAL (AC 6). Score cumulativo continua app-owned.
  - `pickCombined`: single-roll `[FIXED_WEIGHTS[1], FIXED_WEIGHTS[2], ...normalizeTo(POT_WEIGHT, potWeights(pot))]`, re-normalizado por `weightedPicker`; consulta `POT_WEIGHT` (fecha item deferred 2.3); consome exatamente 1 draw.
  - `weightedValue` consolidada ao single path (substitui two-stage draw) → 5 pins reescritos (§R1 abaixo); todo o resto da suíte fica verde sem edição.
  - `spawnTile(board, value, rng)` vira "place, not roll" (AC 2 via `pickIndex`).
  - Ceiling do próximo pending calculado do post-merge board ANTES de placing o spawn (ordering provadamente imaterial — pin T8).
  - Scope guard: sem HUD preview (Epic 7), sem undo (Epic 3), sem deps novas, engine puro (ADR-01), implementar em `triade/` (NÃO em `js/` congelado).

### Framework & Existing Patterns
- Runner: `node:test` + `node:assert`.
- Helpers: `rngOf(...values)`, `mulberry32(seed)`, `staticBoard(row)` (rows 1–3 = `[3,6,12,24]`), `boardWith(matrix)` de `triade/test-utils/helpers.ts`.
- `[P0]/[P1]` prefixes nos nomes dos testes; imports de `../../src/engine/core/index.ts` como nos siblings.
- Pins que ficam verdes SEM edição (não tocar): boundary pins do `game.test.ts` (40/40/20 idênticos no tier 0), drift tripwire do `spawn.test.ts`, pipeline P0/P1 do `pot-tier-pipeline.test.ts` (consumo agora 1 draw, nunca pinado), `[P0] weightedPicker consumes exactly one rng draw` do `weights.test.ts`.

### TEA Config Flags
- `tea_use_playwright_utils`: true (sem browser/API no escopo → não aplicável)
- `tea_use_pactjs_utils`: false · `tea_pact_mcp`: none · `tea_browser_automation`: auto
- `test_stack_type`: auto → backend

### Knowledge Fragments Loaded (core, backend-applicable)
- `test-quality.md` — determinístico, isolado, assertions explícitas no corpo do teste (<300 linhas/arquivo ✓).
- `test-priorities-matrix.md` — P0 para core-loop/data-integrity (draw contract, N3 invariant), P1 para estatísticos/tripwires.
- `test-levels-framework.md` — unit/integration puros; sem E2E (backend).
- UI/browser fragments: skipped — não aplicáveis (mesmo call da 2.3–2.5).

## Step 2: Generation Mode
- **Mode: AI Generation** — `detected_stack` backend (engine puro, node:test); cenários derivados diretamente das ACs, dev notes §R1/R2 e padrões existentes da suíte.

## Step 3: Test Strategy

### AC → Test Scenario Mapping

| ID | AC | Scenario (red-phase scaffold) | Level | Priority |
|----|----|-------------------------------|-------|----------|
| 2.6-INT-001 | 1 | Noop em full board: `moved:false`, `score:0`, nenhum trace `spawned`, `pendingSpawn` deep-equals input, spy mostra **0 draws** | Integration | P0 |
| 2.6-INT-002 | 4, 7 | Effective move consome **exatamente 3 draws em ordem** (cell, next value, displayRoll) — `rngOf(0, 0.9, 0.5)` pinado | Unit | P0 |
| 2.6-INT-003 | 4 | `newGame` consome exatamente **20 draws** (9 cells + 9 values + 1 pending + 1 displayRoll) | Unit | P0 |
| 2.6-INT-004 | 7 | Tier wiring pin determinístico: ceiling pós-merge 96 → tier 2, bandas combinadas `0.9→3`, `0.93→6`, `0.99→12` | Unit | P0 |
| 2.6-INT-005 | 7 | Ladder variants 48/192/384: `pendingSpawn.value` ∈ pot do tier do ceiling pós-move | Unit | P0 |
| 2.6-INT-006 | 3 | Merge-once intocado com pot tile pendente: `[3,3,3,3] left → [6,3,3,spawn(6)]`, score 6, sem cascata | Unit | P0 |
| 2.6-INT-007 | 5 | Shape do retorno `{ board, score, moved, trace, pendingSpawn }`; trace entry `spawned:true`, `value === input.pendingSpawn.value`, `from: []` | Unit | P0 |
| 2.6-INT-008 | 6 | Snapshot shape: `newGame` retorna exatamente `{board, pendingSpawn}`; pending tem exatamente `{value, displayRoll}`; valor inicial válido (1 \| 2 \| 3·2^k); `displayRoll ∈ [0,1)` | Unit | P0 |
| 2.6-INT-009 | 2 | Célula de spawn uniforme entre vazias ±2% (10k amostras seeded, espelha tripwire do spawn.test.ts); `spawnTile` coloca o valor dado, não rola | Unit | P1 |
| 2.6-INT-010 | 7 | Estatístico ≥10k spawns: freq(1)≈0.4±2%, freq(2)≈0.4±2%, banda pot ≈0.2±2% **+ N3 invariant** (materializado no move N == pending resolvido no move N−1, sobre a MESMA run) | Integration | P0 |
| 2.6-INT-011 | 4, 7 | Determinismo: mesma seed → sequência idêntica de `{ board, pendingSpawn }` | Integration | P1 |
| 2.6-INT-012 | 7 | Rewind shape (imutabilidade): reconstruir `GameState` de `{ result.board, result.pendingSpawn }` e replay do mesmo rng reproduz resultado idêntico — zero hidden state | Unit | P1 |
| 2.6-INT-013 | 7 | Ordering invariant: `resolveSpawn(ceiling)` nunca retorna valor > ceiling (ceilings 48..1536 × 2000 amostras cada) | Unit | P1 |

### R1 — Specs de reescrita dos 5 pins two-stage (aplicar durante dev-story, quando a implementação pousar)
Estes NÃO foram aplicados aos arquivos vivos agora (quebrariam o baseline 266 green sob a implementação atual). Especificação pronta para aplicar em T7:
1. `pot.test.ts` "weightedValue wiring resolves pot values by tier" → bandas combinadas: tier 1 cumulativo `0.4, 0.8, 0.9333, 1.0` sobre `[1,2,3,6]`: `weightedValue(rngOf(0.9), 1)→3`, `(rngOf(0.98), 1)→6`. Tier 5 cumulativo `0.4, 0.8, 0.9016, 0.9524, 0.9778, 0.9905, 0.9968, 1.0` sobre `[1,2,3,6,12,24,48,96]`: `0.85→3`, `0.93→6`, `0.99→24`, `0.999→96`. Recalcular fronteiras da fórmula, nunca hardcodar mid-values.
2. `pot.test.ts` "draw-count pin: tier 0 one / tier≥1 two rolls" → renomear para "every weightedValue call consumes exactly one roll"; `calls === 1` para tiers 0, 1 e 5.
3. `pot.test.ts` "tier >= 1 with roll inside fixed band" → **deletar** (absorvido pelo novo pin single-roll).
4. `pot-tier-pipeline.test.ts` "every intra-pot slot is reachable" → alimentar **midpoints das bandas combinadas** como roll único: `weightedValue(rngOf(mid), tier)` retorna o valor do slot.
5. `weights.test.ts` "within-pot frequencies" → filtrar valores ≥3 e comparar frequência condicional a `normalizeTo(POT_WEIGHT, potWeights(pot))[i] / POT_WEIGHT` (±1% abs / ±10% rel).

### Duplicate-Coverage Guard
- Boundary pins 40/40/20 já cobertos por `game.test.ts`/`spawn.test.ts` — não duplicados (scaffolds 2.6 cobrem o caminho INTEGRADO via move/newGame).
- Drift tripwire estatístico de valores permanece em `spawn.test.ts`; 2.6-INT-010 valida a distribuição materializada no gameplay (aspecto distinto: wiring + N3).
- Uniformidade de célula (2.6-INT-009) é aspect NOVO desta story (`spawnTile` place-not-roll).

### Red Phase Requirements
- Todos os scaffolds usam `test.skip()`, acessando a API alvo através de facade tipada local (`EngineV26`) — o arquivo compila HOJE (gate CI verde) e continua compilando após T1–T4 pousarem (cast estruturalmente válido).
- RED verificada: ativação do scaffold AC1 → fail 1 (assinatura de `move` ainda antiga / `pendingSpawn` ausente), revertido a skip.
- Nota da story respeitada: todas as asserções são determinísticas e podem ser ativadas em lote assim que T1–T6 pousarem (sem necessidade de scaffolding incremental além do R1).

## Step 4/4C: Red-Phase Generation & Aggregation
- Execution mode: **SEQUENTIAL** (adaptação backend — workers Playwright API/E2E N/A; scaffolds unit/integration escritos direto em disco)
- TDD Red Phase Validation: PASS — 13 scaffolds com `test.skip()`, assertions de comportamento esperado (zero placeholders), marcados expected_to_fail
- Written to disk:
  - `triade/__tests__/engine/adaptive-spawn-integration.test.ts` (NEW — 13 scaffolds: P0×8, P1×5)
- Fixtures created: 0 (helpers locais `gameState()`, `spyRng()`, `runSeededSession()` dentro do arquivo; T6 promove `gameState` para `test-utils/helpers.ts` com default `{ value: 1, displayRoll: 0 }`)
- Adaptações documentadas:
  - Facade tipada local evita TS2305/TS2335 no gate CI enquanto `GameState`/`PendingSpawn` não existem; runtime assertions pinam o shape real na ativação.
  - Harness `runSeededSession` reinicia deterministicamente o jogo quando travado (mesma seed → replay idêntico).

### Next Steps (task-by-task activation)
1. Implementar T1–T4 (types/spawn/game/index) → ativar 2.6-INT-002/003/004/005/007/008 (pins unitários) → RED → GREEN
2. Implementar T5–T6 (App.tsx port + callers + `gameState` helper) → ativar 2.6-INT-001/010/011/012 (integração/sessão) → RED → GREEN
3. Ativar 2.6-INT-006 (merge-once com pot pendente), 2.6-INT-009 (uniformidade) e 2.6-INT-013 (ordering)
4. Aplicar reescritas R1 (T7) conforme specs acima; rodar `npm test` completo (266 pins existentes + novos)
5. Gates finais (T9): `npm test` all green; `npx tsc --noEmit` E `npx tsc --noEmit -p tsconfig.test.json` limpos (trap da review 2.5: rodar AMBOS); `engine.purity.test.ts` green

### Acceptance Criteria Coverage
- AC1 ✅ (noop: sem spawn/score/turn/draw, pending intacto — 2.6-INT-001)
- AC2 ✅ (célula uniforme ±2% via spawnTile place-not-roll — 2.6-INT-009)
- AC3 ✅ (merge-once com pot pendente — 2.6-INT-006 + gate: suíte existente 266 green sem edição exceto R1/mechanical ports)
- AC4 ✅ (rng injetado, draw budget fixo 3/0/20/1, ordem pinada, determinismo — 2.6-INT-002/003/011)
- AC5 ✅ (shape do retorno + trace assertável — 2.6-INT-007)
- AC6 ✅ (snapshot shape day-one, pending válido — 2.6-INT-008)
- AC7 ✅ (distribuição 40/40+pot por ceiling, N3 invariant, rewindable, ordering — 2.6-INT-004/005/010/012/013)

## Step 5: Validation & Completion
- Checklist validation: PASS
  - ✅ Prereqs OK (story `ready-for-dev`, 7 ACs testáveis; node:test via tsx configurado)
  - ✅ Scaffolds: `triade/__tests__/engine/adaptive-spawn-integration.test.ts` (13× `test.skip()`)
  - ✅ RED verificada: ativação do scaffold AC1 → fail 1, revertido a skip
  - ✅ Sem duplicação de cobertura (tripwires existentes permanecem nos arquivos originais)
  - ✅ Metadados de handoff no frontmatter (`storyId`, `storyKey`, `storyFile`, `generatedTestFiles`, `atddChecklistPath`)
  - ✅ Artefatos vinculados de volta à story (`### ATDD Artifacts` atualizada)
  - ✅ Gate CI preservado: `tsc --noEmit` limpo COM o scaffold no disco (facade pattern); `tsconfig.test.json` mantém apenas o aviso TS6 `baseUrl` pré-existente
- Verificação executada: `npm test` (triade/) → **279 tests: 266 pass, 0 fail, 13 skipped** (baseline intacta + scaffolds RED); `npx tsc --noEmit` → clean; `npx tsc --noEmit -p tsconfig.test.json` → apenas aviso TS6 pré-existente

### Resumo Final
| Item | Valor |
|------|-------|
| Story | 2.6 — Integração com o engine (merge-once e effective-move) |
| Nível primário | Unit + Integration (node:test) |
| Testes gerados | 13 scaffolds RED (P0×8, P1×5) |
| Arquivos de teste | `triade/__tests__/engine/adaptive-spawn-integration.test.ts` (novo) |
| Factories / Fixtures / Mocks | 0 arquivos novos (helpers locais `gameState`/`spyRng`/`runSeededSession`; T6 promove `gameState` a helper compartilhado) |
| Reescritas R1 especificadas | 5 pins two-stage → single-roll (specs no checklist, aplicar em T7) |
| data-testid | N/A (sem UI) |
| Comando de execução | `npm test` (em `triade/`) |
| Próximo workflow recomendado | `bmad-dev-story` (implementar 2.6 ativando scaffolds tarefa a tarefa + aplicando R1/T7) |

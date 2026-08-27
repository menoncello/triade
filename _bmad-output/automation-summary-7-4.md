# Automation Summary — Story 7.4 (Invariante — preview nunca altera o spawn)

**Engine**: TypeScript / React Native (Expo) — `node:test` + `tsx` + `node:assert` (skill adaptado: projeto não é Unity/Unreal/Godot; engine real é módulo TS puro `triade/src/engine/`)
**Tests Generated**: 18 (14 em arquivo novo + 4 estendidos em suite existente) — todos `P0`, invariante duro N3/FR-44/ADR-06
**Date**: 2026-08-26

## Contexto

Story 7.4 é **test-only** — nenhum `src/` muda (`git diff --stat -- triade/src/engine` vazio, `preview.ts` byte-identical). 7.1 entregou `PendingSpawn { value, displayRoll }` no snapshot, 7.2 entregou `previewFor` + `PreviewCard`/`Hud` thin-view, 7.3 endureceu `previewFor(pending, availablePot)` FR-43 (janela `availablePot` contígua capada em 3, `RANGE_1_2` frozen) e deixou o invariante duro explicitamente para 7.4 (`7-3-faixa-ambigua-correta.md:22`). 12.1 (directional spawn) já landed. Baseline em `main` `70e4fb0`: **396 pass / 0 fail**; este passo adiciona **18 pins** e chega a **414 pass / 0 fail** sem regressão.

O gap fechado é o **N3 hard guarantee**: `previewFor` apenas LÊ `pendingSpawn`, nunca re-rola, nunca chama `resolveSpawn`/`weightedValue`/`spawnTile`/`weightedPicker`, e a decisão `displayRoll < 0.6 ? exact : range` nunca altera o tile materializado (`pendingSpawn.value` place-not-roll via `spawnTile`). Correções de display devem manter esses pins verdes.

## Preflight

- [x] Test framework inicializado — `triade/package.json: test = TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` (Node 26, `tsx`)
- [x] Test scenarios definidos — `_bmad-output/test-artifacts/atdd-checklist-7-4-invariante-preview-nunca-altera-o-spawn.md` (5 ACs) + story file `_bmad-output/implementation-artifacts/7-4-invariante-preview-nunca-altera-o-spawn.md` (T1a–f, T2, T3 gates)
- [x] Game code acessível — `triade/src/game/preview.ts:1-84`, `triade/src/engine/core/{spawn,game,line,types}.ts`, `spawnConfig.ts:POT_CURVE`, `test-utils/helpers.ts` (`boardWith`, `gameState`, `rngOf`, `spyRng`, `stripCommentsAndStrings`, `extractNamedImports`), `App.tsx:126-149` wiring

## Step 1 — Analyze Codebase

**Engine detection**: projeto não tem `Assets/`/`ProjectSettings/` (Unity), `*.uproject` (Unreal) nem `project.godot`; detecção adaptada: `triade/src/engine/` é engine TS puro (ADR-01), `triade/src/game/` é orquestração pura, `triade/src/ui/`/`render/` são views RN/Skia. Harness `node:test` host-testable (sem DOM) é o equivalente aos fixtures `NUnit`/`GUT` do template; conhecimento `unity-testing.md`/`unreal-testing.md`/`godot-testing.md` não aplicável — padrão local `preview.test.ts` + `pending-spawn-contract.test.ts` foi usado como knowledge fragment.

**Sistemas testáveis identificados**:
- `previewFor(pending, availablePot)` (`src/game/preview.ts`) — função pura, FR-44/N3, 0 draws por construção (sem `rng` param `preview.ts:71`), `RANGE_1_2 = Object.freeze([1,2])` identidade estável
- Snapshot `GameState.pendingSpawn` (`src/engine/core/types.ts:24-41`, `game.ts:88` `{...state.pendingSpawn}` shallow-copy ADR-06)
- Pipeline de spawn: `spawnTile` place-not-roll (`spawn.ts:66-88`), `shiftLine {line,score,moved}` (`line.ts:67`), candidatos direcionais opposite-edge (`game.ts:53-64` pós-12.1)

**Testes existentes localizados**: `__tests__/game/preview.test.ts` (23 testes FR-43/FR-44, ladder derivada de `POT_CURVE` + `isContiguousSlice :19-27`), `__tests__/engine/pending-spawn-contract.test.ts` (7 testes E9/E10, sigmaBound 5σ `runSeededSession`), `test-utils/helpers.ts` (`boardWith`, `gameState`, `rngOf`, `spyRng`, `stripCommentsAndStrings:220-299`, `extractNamedImports:319-353`), guards `ui.norolls.test.ts:27` (4 roll symbols), `ui.thinview.test.ts`, `engine.purity.test.ts`, `hud.previewWiring.test.ts`

**Coverage gap**: faltava pin duro de que *display decision nunca altera spawn materializado* across `FULL × branches × posições direcionais`, incluindo mutação, separação valor/posição/timing, boundary estrutural, pureza, e rewind do snapshot (AC3) — gap fechado por T1a–f + T2

## Step 2 — Generate Unit Tests

### `triade/__tests__/game/preview-invariant.test.ts` — NEW, 14 testes, ~366 linhas

Imports apenas `src/game/preview.ts` + `engine/core/{index,types}` + `spawnConfig.ts:POT_CURVE` (para derivar `FULL`/`POT_LADDER`) + `test-utils/helpers.ts` — sem `expo`/`react-native`/`skia`, sem `Math.random` (usa `rngOf`/`spyRng`/`mulberry32`), `strict: true`

Ladder derivado exatamente como `preview.ts:10-16` (boundary rule 4 — sem literal `[3,6,12,24,48,96]` espalhado):
```ts
const FULL = Object.freeze([1, 2, ...Object.keys(POT_CURVE).map(Number).sort((a,b)=>a-b)]);
const POT_LADDER = FULL.slice(2); // [3,6,12,24,48,96]
```

| # | Teste | AC | Verifica |
|---|-------|----|----------|
| 1 | `[P0] AC1 sweep — previewFor never mutates pending…` | AC1/AC2 | `structuredClone` deepEqual (no mutation) × `FULL` × 4 POT-only availabilities (`[3]`, `[3,6]`, `[3,6,12]`, `POT_LADDER` — nunca `FULL` com `[1,2]`) × rolls `0.2`/`0.5`→exact + `0.6`/`0.9`→range; boundary `0.599` exact / `0.6` range; quando `range` → `values.includes(pending.value)` |
| 2 | `[P0] AC2 sweep — range always contains truth and is contiguous` | AC2 | Toda janela `range` contém truth, `1..3` cap, `isContiguousSlice` sobre `FULL` |
| 3 | `[P0] AC1 materialization left — display decision never alters placed tile` | AC1 | Para cada `pending ∈ FULL` × `0.2`/`0.9`, `state=gameState(boardWith([[1,2,null,null]]), pending)` + `previewFor(pending, avail)` **ANTES** de `move(state,'left',rngOf(0,0.5,0.5))` (3-draw budget) → `trace.find(e=>e.spawned).value === pending.value` + `board[spawned.to]==value` — path row `candidates` (`game.ts:53-64`) |
| 4 | `[P0] AC1 materialization up — … (directional candidates up)` | AC1 | Mesmo para column `candidates` (board coluna `[null,1,2,null]` → `move 'up'` mesmo `rngOf`) |
| 5–9 | `[P0] AC2 FR-44 — value 1→[1,2] / 2→[1,2] / 3+ [3]→[3] / 3+[3,6,12]→[3,6,12] / 6+[3,6,12,24]→[6,12,24]` | AC2 | 5 pins FR-44 exatos `deepEqual` + `isContiguousSlice` |
| 10 | `[P0] AC4 value — same board/pending.value but different displayRoll yields identical spawn cell/value` | AC4 | `pending.value=6` × `0.2` vs `0.9` → dois `move` com **idêntico** `rngOf(0,0.5,0.5)` produzem `spawn cell`/`value` idênticos (displayRoll nunca chega em `spawnTile:66-88`) |
| 11 | `[P0] AC4 position — candidates derived only from shiftLine.moved opposite-edge` | AC4 | `Preview` sem `to`/`cell`/`position`; `boardWith([[1,2,null,null]]) → move 'left'` → spawn em `[0, GRID_SIZE-1]` (rightmost col da linha movida); `preview` irrelevante para posição |
| 12 | `[P0] AC4 timing — previewFor 0 draws; effective 3, noop 0` | AC4 | `spy=spyRng(0,0.5,0.5); previewFor(_,POT_LADDER); spy.calls 0` (sem `rng` param); `move effective → 3` draws (`types.ts:7-18` cell+next value+displayRoll), `noop` board full `[[3,6,12,24]×4]` → `0` draws, `trace.filter(spawned) 0` mas `trace.length 16` |
| 13 | `[P0] AC5 structural boundary — preview never imports roll symbols; engine never imports preview; no Math.random` | AC5 | `ROLL_SYMBOLS={resolveSpawn,weightedValue,spawnTile,weightedPicker}` (de `ui.norolls.test.ts:27`) × 0 em `preview.ts` stripped + não importadas de specifier `engine`; `PREVIEW_SYMBOLS={previewFor}` + specifier `preview` × 0 em `spawn.ts`/`game.ts`; stripped `preview.ts` sem `Math.random` (via `stripCommentsAndStrings`+`extractNamedImports`, mirror `ui.norolls:83-112`) |
| 14 | `[P0] AC5 purity — previewFor pure and RANGE_1_2 frozen identity retained` | AC5 | `same PendingSpawn+avail → deepEqual` ×2 calls, sem mutação global; `RANGE_1_2` `strictEqual` para `1|2` across calls e across `availablePot`; `previewFor.length 1..2` (sem rng); sem `Math.random` neste arquivo |

Padrão usado: AAA + `node:assert` determinístico + `structuredClone`/`spyRng` para contrato de draws. Sem waits hard-coded (pura), sem dependência de ordem, cleanup por construção (pura value-in/value-out).

### `triade/__tests__/engine/pending-spawn-contract.test.ts` — EXTENDED, +4 testes (de 7 → 11 total, +67 linhas)

| # | Teste | AC | Verifica |
|---|-------|----|----------|
| 15 | `[P0] AC3 7.4 isolation — shallow-copy keeps snapshot independent` | AC3 | `game.ts:88` `{...state.pendingSpawn}` — `state.pendingSpawn` deepEqual antes, `result.pendingSpawn.value=999` nunca reescreve `state` |
| 16 | `[P0] AC3 7.4 snapshot carries preview — reconstruct GameState replays deterministically` | AC3 | `GameState{board:result.board, pendingSpawn:result.pendingSpawn}` + `rngOf(0.25,0.35,0.45)` → `deepEqual` next result (sem hidden state) |
| 17 | `[P0] AC3 7.4 noop — full immovable board … 0 draws, trace 16` | AC3 | `boardWith([[3,6,12,24]×4]) → moved:false`, `pendingSpawn` deepEqual (não live ref), `spyRng().calls 0`, `trace.filter(spawned) 0`, `trace.length===16` (não `0`) |
| 18 | `[P0] AC3 7.4 direction-agnostic — left and up equally` | AC3 | Row `left` (`boardWith([[1,2,null,null]])`) e column `up` (`[[null],[1],[2],[null]]`) — snapshot carrega preview em ambas as vias direcionais |

## Test Distribution

| Tipo | Count | Coverage |
|------|-------|----------|
| Unit Tests | **14** (NEW) | `preview-invariant.test.ts` — N3/FR-44 invariante: sweep mutação+branch, materialização `left`/`up`, 5 pins FR-44 distribution, separação valor/posição/timing, boundary estrutural, pureza — AC1/AC2/AC4/AC5 |
| Engine Snapshot (Unit sobre `GameState`) | **4** (extended) | `pending-spawn-contract.test.ts` — ADR-06/state-placement master rule: isolation, snapshot carries preview, noop 0-draw, direction-agnostic — AC3 |
| Integration | 6 (pre-existing 7.3, validados sem modificação) | `preview-availability.integration.test.ts` — `board → ceiling → availablePot → previewFor` (T2/AC3-5 da 7.3) — não re-gerado, confirmado verde |
| Integration (App wiring) | pre-existing | `hud.previewWiring.test.ts` — `availablePot = potForTier(tierForCeiling(ceilingDetector(board)))` once per render após `if(!ready)` (`App.tsx:126-137`) — verde |
| Smoke / Guards | 0 novos (guards existentes verificados) | `ui.norolls.test.ts` (4 roll symbols), `ui.thinview.test.ts`, `engine.purity.test.ts` (ADR-01), `render.smoke`, `criticalPath.smoke` — todos verdes |
| E2E Infra | — | Já presente `triade/test-utils/e2e/` (`GameE2ETestFixture`, `scenarioBuilder`, `inputSimulator`, `asyncAssertions`, `memoryStorage`) — fora do escopo 7.4 (superfície pura host-testable, sem DOM/API) |

**Total novo desta automação: 18 testes P0 (14+4). Total suite pós-7.4: 414 pass / 0 fail (~3.0s). Baseline 7.3: 325; pós-12.1: 396; pós-7.4: 414.**

## Files Created / Modified

- `triade/__tests__/game/preview-invariant.test.ts` — **NEW** (14 testes, ~366 linhas, T1a–f, host-testable, sem RN/Skia, imports apenas `preview.ts` + `engine/core` + `spawnConfig` + `helpers`)
- `triade/__tests__/engine/pending-spawn-contract.test.ts` — **MODIFIED** (+4 testes `[P0] AC3 7.4 …`, agora 11 total; sem mudança de engine)
- `_bmad-output/test-artifacts/atdd-checklist-7-4-invariante-preview-nunca-altera-o-spawn.md` — ATDD checklist (gerado em 7.4 DEV, validado)
- Este arquivo: `_bmad-output/automation-summary-7-4.md`

Nenhum arquivo `triade/src/engine` ou `triade/src/game/preview.ts` modificado (byte-identical a `70e4fb0`).

## Step 3 — Generate Integration Tests

Template do skill (Unity `SceneManager.LoadScene` / Godot `load("res://scenes/...")`) não aplicável — integração do projeto é `engine trace → transitionPlan → tiles renderizados` + `board ceiling → availablePot → preview`. 7.3 já gerou `preview-availability.integration.test.ts` (6 testes) cobrindo a fronteira de orquestração; 7.4 integra via **materialization pins** (`T1b` usando `move` real) e **rewind pins** (`T2` snapshot), que são integration sobre o engine sem criar novo arquivo `__tests__/integration/` — evita fragmentação conforme spec 7.4 (*T2 estende contract existente*). Async handling: puras, sem `await`/`yield`; determinismo via `rngOf` fixo (3-draw budget), sem teardown leak (valor puro).

## Step 3.5 — Generate E2E Infrastructure — já scaffolded, verificado

Infra já existe (`triade/test-utils/e2e/` — 4 fixtures: `GameE2ETestFixture`, `scenarioBuilder`, `inputSimulator`, `asyncAssertions` + `memoryStorage`) conforme `automation-summary.md:Infrastructure`. 7.4 não requer E2E adicional: superfície é função pura + snapshot, não jornada de usuário nem contrato de serviço (vide ATDD checklist `testarch-atdd` 7.4: *Primary Test Level: Unit, E2E intencionalmente ausente*). Templates `GameE2ETestFixture`/`ScenarioBuilder`/`InputSimulator`/`WaitUntil` do skill foram mapeados para o harness existente `test-utils/e2e/` (fixture session, `spyRng`/`tick`, helpers `gameState`/`boardWith`). Nenhum arquivo novo em `e2e/infrastructure/` — anti-pattern evitado (não testar funcionalidade da engine).

## Step 4 — Generate Smoke Tests

Checks críticos já cobertos: `triade/__tests__/smoke/criticalPath.smoke.test.ts` (new game board válido 9 tiles never game over, 200-turn core loop sem crash, launch→play→persist) + `game`/`board`/`ceiling`/`line`/`spawn` suites — `--smoke` não adiciona valor para invariante puro. Anti-patterns ativamente evitados (validados): não testa funcionalidade da engine, sem hard-coded waits (usa `spy.calls.length` sync), sem dependência de ordem, teardown não necessário (puro).

## Verification

```bash
cd triade && npm test           # 414 pass / 0 fail / 0 skip (~3063ms)
npx tsc --noEmit               # clean (exit 0) — CI gate
npx tsc --noEmit -p tsconfig.test.json  # TS5101 abort + 3 stub-typing masked — PRE-EXISTING waived deferred-work.md:122-124 (desde 7-1 2026-08-24), nenhum NEW error
git diff --stat -- triade/src/engine  # empty (byte-identical)
git diff --stat -- triade/src/game/preview.ts  # empty (byte-identical)
# guards sem modificação
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.norolls.test.ts      # 4 roll symbols green
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ui.thinview.test.ts     # green
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/engine.purity.test.ts # ADR-01 green
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/components/hud.previewWiring.test.ts # green
```

**Evidência 7.4 (RED→GREEN pins):**

- `preview-invariant.test.ts`: 14/14 pass (seria RED se `previewFor` mutasse `pending`, invertesse boundary `0.6`, não contivesse truth, consumisse draws, importasse roll symbols, ou quebrasse `RANGE_1_2` identity)
- `pending-spawn-contract.test.ts`: 11/11 pass (4 novos AC3 `7.4` verdes; seriam RED se `game.ts:88` shallow-copy quebrasse, hidden state, noop re-resolve, ou direção-agnostic falhasse)
- `npm test` overall: **414 pass / 0 fail** (396 baseline `main` `70e4fb0` +18)
- `grep -rn "test.skip(" triade/` → 0 (mesma postura 7.2/7.3 — true assertions, não scaffolds skip)

### Checklist (gds-test-automate)

- [x] Engine detectado (TS/Expo adaptado — não Unity/Unreal/Godot)
- [x] Sistemas testáveis identificados; testes existentes localizados e gap mapeado
- [x] Padrão AAA + `node:assert` + `isContiguousSlice` helper; parametrizado via `FULL` sweep + `rngOf` fixture; sem dependências externas (sem `Math.random`)
- [x] Testes determinísticos (`rngOf(0,0.5,0.5)` fixo, `spyRng` draw-budget), isolados (cada pin constrói `Board`/`PendingSpawn`/`rng` próprio), mensagens descritivas
- [x] Integration pins independentes (`left`/`up` separados), sync via `spy.calls.length` (não hard-coded waits), sem leaks
- [x] Smoke critical path já coberto fora deste escopo (informational preview — não replica smoke)
- [x] Arquivos em diretórios corretos (`__tests__/game/` mirror `__tests__/game/preview.test.ts`, `__tests__/engine/` extensão evitando fragmentação)
- [x] Engine syntax correta (ESM `*.ts` extensions, `strict:true`, sem `Math.random`)
- [x] Resumo criado; próximos passos abaixo

### Anti-patterns (evitados, Step 4)

- [x] Não testa funcionalidade da engine (apenas contrato N3 place-not-roll)
- [x] Sem hard-coded waits como sync primário (usa `spyRng` draws + `structuredClone` deepEqual + `trace.find(spawned)`)
- [x] Sem dependência de ordem (sweeps iteram coleções, cada teste constrói estado próprio)
- [x] Cleanup garantido (funções puras, sem módulo-global mutable fora `RANGE_1_2` frozen)

## Next Steps

1. Revisar os 18 pins (foco: `[P0] AC5 structural boundary` — `stripCommentsAndStrings`+`extractNamedImports` mirror `ui.norolls:83-112`; `[P0] AC4 timing` — `previewFor` 0 draws por construção)
2. Adicionar ao CI gate (já existe `npm test` — baseline deve permanecer ≥414; flag queda)
3. Edições futuras de display (ex.: mudar threshold 60/40 ou conteúdo da janela ambígua) devem manter estes 18 pins verdes — `preview.ts` continua byte-identical até patch explícito com review tag
4. `npx tsc --noEmit -p tsconfig.test.json` repair vive em `deferred-work.md:122-124` — não silenciar fix dentro de stories Epic 7

## Traceability

| FR | AC | Arquivo | Nomes |
|----|----|---------|-------|
| FR-44 | AC1 | `preview-invariant.test.ts` (T1a,T1b) | `[P0] AC1 sweep …`, `[P0] AC1 materialization left/up …` |
| FR-44 | AC2 | `preview-invariant.test.ts` (T1c) | `[P0] AC2 FR-44 …` (5 pins) |
| ADR-06 | AC3 | `pending-spawn-contract.test.ts` (T2) | `[P0] AC3 7.4 isolation / snapshot carries / noop / direction-agnostic` |
| FR-44 | AC4 | `preview-invariant.test.ts` (T1d) | `[P0] AC4 value/position/timing …` (3 pins) |
| FR-44 | AC5 | `preview-invariant.test.ts` (T1e,T1f) | `[P0] AC5 structural boundary …`, `[P0] AC5 purity …` |

Referências: `triade/src/game/preview.ts:10-16,22,71,78-79`, `triade/src/engine/core/{types:7-18,spawn:66-88,line:67,game:53-64,88}`, `triade/src/engine/config/spawnConfig.ts:17 POT_CURVE`, `triade/App.tsx:126-149`, `triade/test-utils/helpers.ts:220-353`, `game-architecture.md:726-754 N3, 454-455 ADR-06, 776 state-placement`, PRD FR-44, epics.md ~856-871, `preview.test.ts:10,19-27` precedent.

---
Gerado por `gds-test-automate` 7.4 — `triade/__tests__/game/preview-invariant.test.ts` + `triade/__tests__/engine/pending-spawn-contract.test.ts` (T2) — 2026-08-26.

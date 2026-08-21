---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-20'
storyId: '2.2'
storyKey: '2-2'
storyFile: '_bmad-output/implementation-artifacts/2-2-pesos-fixos-1-2-em-40-40.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-2-2.md'
generatedTestFiles:
  - 'triade/__tests__/engine/spawn.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/2-2-pesos-fixos-1-2-em-40-40.md'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — Story 2.2: Pesos fixos 1/2 em 40/40

## Step 1 — Preflight & Context

- **detected_stack:** `frontend` (React Native + Expo + Skia app), mas o alvo da história é engine puro TS testado via `node --test`.
- **test_framework:** `node --test` (built-in Node 26, type stripping de `.ts`). Sem Playwright/Cypress — este ATDD gera scaffolds **unit-level** (adaptação do "API worker" do step-04).
- **Pré-requisitos:** história `ready-for-dev` com AC claros; framework configurado (`npm test` → `node --test`); ambiente Node 26 disponível. ✅
- **story_key:** `2-2` · **story_id:** `2.2`

## Step 2 — Generation Mode

- **Modo:** AI Generation (critérios de aceitação explícitos e determinísticos; backend-like puro, sem gravação de browser).

## Step 3 — Test Strategy

| AC | Cenário | Nível | Prioridade | Red? |
|----|---------|-------|------------|------|
| 2 | `FIXED_WEIGHTS[1]===0.4`, `FIXED_WEIGHTS[2]===0.4` (invariante "nunca muda") | Unit | P0 | ✅ |
| 3 | `FIXED_WEIGHTS[1]+[2]+POT_WEIGHT ≈ 1.0` (soma da distribuição, epsilon) | Unit | P0 | ✅ |
| 3 | coupling `FIXED_WEIGHTS sum === 1 - POT_WEIGHT` (pot band não deriva) | Unit | P1 | ✅ |
| 2 | `POT_VALUE === 3` (valor único do pot pré-2.3) | Unit | P1 | ✅ |
| 1,4 | `weightedValue` mantém 40/40/20 após refactor (guarda de contrato) | Unit | P1 | ✅ |

> AC4 de boundary (`[0,0.4)→1`, `[0.4,0.8)→2`, `[0.8,1)→3`) **não duplicada** — já coberta por `game.test.ts:22`. O scaffold apenas re-afirma o contrato.

## Step 4 — Red-Phase Test Generation

- **Arquivo gerado:** `triade/__tests__/engine/spawn.test.ts`
- **TDD phase:** RED. Falha no load (`SyntaxError: does not provide an export named 'FIXED_WEIGHTS'`) porque `src/engine/config/spawnConfig.ts` e o re-export em `index.ts` ainda não existem.
- **Verificação:** `node --test __tests__/engine/spawn.test.ts` → `fail 1 / pass 0` (RED confirmado).
- Sem `test.skip()`: para engine unit-test determinístico, o scaffold ativo-em-vermelho é o red-phase correto (o dev roda `node --test` e vê falhar antes de implementar).

## Step 5 — Validation & Completion

- ✅ Pré-requisitos satisfeitos.
- ✅ Arquivo de teste criado e em RED.
- ✅ Checklist mapeia 1:1 os AC da história.
- ✅ Handoff paths capturados (`storyFile`, `generatedTestFiles`).
- ✅ Sem browsers órfãos / artefatos em `_bmad-output/test-artifacts/`.

### Resumo

- **Test files:** `triade/__tests__/engine/spawn.test.ts`
- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-2-2.md`
- **Story handoff:** `_bmad-output/implementation-artifacts/2-2-pesos-fixos-1-2-em-40-40.md`
- **Riscos/assunções:** engine puro, sem dependências externas; `strict: true` exige tipo `Readonly<Record<1 | 2, number>>`; implementação em `triade/` (não `js/`).
- **Próximo workflow recomendado:** `dev-story` (implementar `spawnConfig.ts` + refactor de `weightedValue` + re-export) → rodar `node --test` até virar GREEN → depois `automate` se desejado.

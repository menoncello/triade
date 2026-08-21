---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-21'
storyId: '2.3'
storyKey: '2-3-pot-tierizado-por-teto'
storyFile: '_bmad-output/implementation-artifacts/2-3-pot-tierizado-por-teto.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-2-3-pot-tierizado-por-teto.md'
generatedTestFiles:
  - 'triade/__tests__/engine/pot.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/2-3-pot-tierizado-por-teto.md'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/__tests__/engine/spawn.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '.claude/skills/bmad-testarch-atdd/resources/knowledge/test-levels-framework.md'
---

# ATDD Checklist — Story 2.3: Pot tierizado por teto

## Step 1: Preflight & Context

### Stack Detection
- `config.test_stack_type`: `auto` → auto-detection executed.
- No `playwright.config.*` / `cypress.config.*` at project root; `triade/package.json` has RN/Expo deps but the test suite is pure TypeScript via `node:test` + tsx loader (`npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`).
- **detected_stack = `backend`** (pure-function engine testing, node:test runner).

### Prerequisites
- ✅ Story approved: status `ready-for-dev`, clear ACs (4 acceptance criteria).
- ✅ Test framework configured: node:test via tsx (`triade/package.json` test script).
- ✅ Dev environment available (Node ≥26 required by engines).

### Story Context
- story_id: `2.3` · story_key: `2-3-pot-tierizado-por-teto`
- Goal: tiered pot — `potForTier(tier): number[]` returns FR-7 doubling ladder (`[3]`, `[3,6]`, `[3,6,12]`, …); wire tier into `weightedValue(rng, tier)`; rename `POT_VALUE` → `POT_BASE_VALUE`.
- Key constraints:
  - RNG-consumption contract: tier 0 consumes exactly ONE rng draw; tiers ≥1 consume TWO (band roll, then intra-pot pick).
  - Uniform intra-pot pick is an explicit placeholder (Story 2.4 replaces with halving-decay).
  - Default `tier = 0` keeps all existing call sites/tests byte-compatible.
  - Distribution-sum invariant already pinned in `spawn.test.ts` — do NOT duplicate.
  - Implement only in `triade/`; never import RN/React/Skia/Expo inside `src/engine`.

### Framework & Existing Patterns
- Runner: built-in `node:test` + `node:assert`.
- Helpers: `rngOf(...values)` (sequential seeded rng), `mulberry32(seed)`, `boardWith(...)` from `triade/test-utils/helpers.ts`.
- Import style: from `../../src/engine/core/index.ts` exactly like sibling engine tests; explicit `.ts` extensions (ESM).
- Existing pins that must stay green: `game.test.ts` boundary assertions (0.39→1, 0.4→2, 0.79→2, 0.8→3, 0.999→3), `spawn.test.ts` drift tripwire (40/40/20 ±2%).

### TEA Config Flags
- `tea_use_playwright_utils`: true (but no browser tests detected → API-only profile; not applicable here)
- `tea_use_pactjs_utils`: false · `tea_pact_mcp`: none · `tea_browser_automation`: auto
- `test_stack_type`: auto → backend

### Knowledge Fragments Loaded (core, backend-applicable)
- `test-levels-framework.md` — unit level is primary for pure functions (`potForTier`, `weightedValue`); duplicate-coverage guard applied (no re-pin of distribution sum).
- Others (data-factories, component-tdd, selector-resilience, timing-debugging, playwright-utils profiles): skipped — UI/browser fragments not applicable to pure-function backend scope.

### Target Test File (from story tasks)
- `triade/__tests__/engine/pot.test.ts` covering:
  1. Enumerated FR-7 matrix, tiers 0–7 pinned literally via `assert.deepStrictEqual`.
  2. Structural invariants sweep tiers 0–12: every value ≥ 3; consecutive doubling; length = tier + 1.
  3. `weightedValue` wiring: `rngOf(0.9)` default tier → 3; `(0.9, 0.99)` tier 1 → 6; `(0.9, 0.4)` tier 1 → 3; `(0.9, 0.99)` tier 5 → 96; `(0.9, 0.0)` tier 5 → 3.
  4. Draw-count pin: counting rng asserts `calls === 1` at default tier, `calls === 2` at tier 1.

## Step 2: Generation Mode
- **Mode: AI Generation** — `detected_stack` is `backend` (pure-function engine, node:test). No browser recording needed; scenarios derived directly from the story's ACs, dev notes and existing engine test patterns.

## Step 3: Test Strategy

### AC → Test Scenario Mapping (all UNIT level — pure functions)

| ID | AC | Scenario (red-phase test) | Level | Priority |
|----|----|---------------------------|-------|----------|
| 2.3-UNIT-001 | 1 | `potForTier` exists and returns exact pot values per tier | Unit | P0 |
| 2.3-UNIT-002 | 2 | Enumerated FR-7 matrix: tiers 0–7 pinned literally via `deepStrictEqual`: `[3]`, `[3,6]`, `[3,6,12]`, `[3,6,12,24]`, `[3,6,12,24,48]`, `[3,6,12,24,48,96]`, `[…,192]`, `[…,384]` | Unit | P0 |
| 2.3-UNIT-003 | 2 | Structural sweep tiers 0–12: every value ≥ 3; `pot[i+1] === pot[i] * 2`; length = tier + 1 | Unit | P1 |
| 2.3-UNIT-004 | 4 | `weightedValue` wiring: default tier `rngOf(0.9)` → 3; tier 1 `(0.9,0.99)` → 6; tier 1 `(0.9,0.4)` → 3; tier 5 `(0.9,0.99)` → 96; tier 5 `(0.9,0.0)` → 3 | Unit | P0 |
| 2.3-UNIT-005 | 4 | RNG draw-count contract: counting rng → `calls === 1` at default tier; `calls === 2` at tier 1 (outcome tests cannot detect an extra single-value-pot draw) | Unit | P0 |
| 2.3-UNIT-006 | 3 | Resolver purity/config-keying: `potForTier` deterministic across repeated calls; reads `POT_BASE_VALUE` from `spawnConfig.ts` (no scattered literals); re-exported via `core/index.ts`; no RN/React/Skia/Expo imports | Unit | P1 |

### Duplicate-Coverage Guard
- Distribution-sum invariant (`FIXED_WEIGHTS + POT_WEIGHT ≈ 1.0`) already pinned in `spawn.test.ts` — NOT duplicated.
- Backward-compat boundary pins (`rngOf(0.39)→1 … rngOf(0.999)→3`) live in `game.test.ts:22` — NOT duplicated; suite must stay green unchanged.
- Statistical drift tripwire stays solely in `spawn.test.ts`.

### Red Phase Requirements
- All tests must FAIL before implementation:
  - Import of `potForTier` / `POT_BASE_VALUE` from `core/index.ts` fails (module/export missing) → whole file red.
- Tests are written against the TARGET API (`potForTier`, `POT_BASE_VALUE`, `weightedValue(rng, tier)`) exactly as specified in the story tasks.

## Step 4/4C: Red-Phase Generation & Aggregation
- Execution mode: **SEQUENTIAL** (backend adaptation — Playwright API/E2E workers not applicable; Worker A generated unit-level scaffolds, Worker B returned 0 E2E tests)
- TDD Red Phase Validation: PASS — all scaffolds use `test.skip()`, assert expected behavior, no placeholders
- Written to disk: `triade/__tests__/engine/pot.test.ts` (5 scaffolds: P0×3, P1×2)
- Fixtures created: 0 (reuses existing `rngOf` from `triade/test-utils/helpers.ts`)
- Note on red-phase mechanics: `potForTier` is loaded via dynamic `import()` inside skipped tests so the missing export does not crash the suite at link time while scaffolds are skipped; when a task is activated, the test runs, the dynamic import throws (module/export absent) → RED. `weightedValue(rng, tier)` calls fail today because the tier param is ignored (extra args discarded) → assertions mismatch → RED.

### Next Steps (task-by-task activation)
1. Remove `test.skip()` from the scenario for the current task
2. Run `npm test` (in `triade/`)
3. Verify activated test fails first (RED), then passes after implementation (GREEN)
4. Keep `game.test.ts` / `spawn.test.ts` pins green unchanged

### Acceptance Criteria Coverage
- AC1 ✅ (matrix + wiring + draw-count) · AC2 ✅ (FR-7 matrix tiers 0–7 + structural sweep 0–12) · AC3 ✅ (purity/config-keying/re-export/no UI imports) · AC4 ✅ (band unchanged via existing spawn.test.ts pin; values growth via matrix/wiring)

## Step 5: Validation & Completion
- Checklist validation: PASS
  - Prereqs OK (story `ready-for-dev` com ACs testáveis; node:test via tsx configurado)
  - Scaffolds criados em `triade/__tests__/engine/pot.test.ts`, todos `test.skip()`
  - Sem duplicação de cobertura (distribution-sum e drift tripwire permanecem só em `spawn.test.ts`)
  - Metadados de handoff no frontmatter (`storyId`, `storyKey`, `storyFile`, `generatedTestFiles`)
  - Artefatos vinculados de volta à story (subseção `### ATDD Artifacts` sob Dev Notes)
  - Sem sessões CLI órfãs; artefatos temporários em `{test_artifacts}/`
- Verificação executada: `npm test` (triade/) → 230 tests, 225 pass, 0 fail, 5 skipped (scaffolds RED)
- Adaptações documentadas: stack backend → workers Playwright API/E2E N/A; `potForTier` carregado por dynamic import dentro dos testes para não quebrar o link ESM enquanto skippado

### Resumo Final
| Item | Valor |
|------|-------|
| Story | 2.3 — Pot tierizado por teto |
| Nível primário | Unit (node:test) |
| Testes gerados | 5 scaffolds RED (P0×3, P1×2) |
| Arquivo de testes | `triade/__tests__/engine/pot.test.ts` |
| Factories / Fixtures / Mocks | 0 (reusa `rngOf` existente) |
| data-testid | N/A (sem UI) |
| Comando de execução | `npm test` (em `triade/`) |
| Próximo workflow recomendado | `bmad-dev-story` (implementar 2.3 ativando scaffolds tarefa a tarefa) |

---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-21'
storyId: '2.4'
storyKey: '2-4-curva-halving-decay-normalizada'
storyFile: '_bmad-output/implementation-artifacts/2-4-curva-halving-decay-normalizada.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-2-4-curva-halving-decay-normalizada.md'
generatedTestFiles:
  - 'triade/__tests__/engine/weights.test.ts'
  - 'triade/__tests__/engine/pot-tier-pipeline.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/2-4-curva-halving-decay-normalizada.md'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/pot.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/__tests__/engine/pot.test.ts'
  - 'triade/__tests__/engine/pot-tier-pipeline.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '.claude/skills/bmad-testarch-atdd/resources/knowledge/test-levels-framework.md'
---

# ATDD Checklist — Story 2.4: Curva halving-decay normalizada

## Step 1: Preflight & Context

### Stack Detection
- `config.test_stack_type`: `auto` → auto-detection executed.
- No `playwright.config.*` / `cypress.config.*` anywhere in the repo; `triade/package.json` has RN/Expo deps but the test suite is pure TypeScript via `node:test` + tsx loader (`npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`).
- **detected_stack = `backend`** (pure-function engine testing, node:test runner) — mirrors 2.3 precedent.

### Prerequisites
- ✅ Story approved: status `ready-for-dev`, 5 clear acceptance criteria.
- ✅ Test framework configured: node:test via tsx (`triade/package.json` test script).
- ✅ Dev environment available (Node ≥26 required by engines).

### Story Context
- story_id: `2.4` · story_key: `2-4-curva-halving-decay-normalizada`
- Goal: halving-decay weight curve + normalization + weighted picker in a new pure module `weights.ts`, wired into `weightedValue`'s pot branch (replacing the 2.3 uniform placeholder); FR-8 I/O matrix validated by unit tests; the stale uniform-reachability test in `pot-tier-pipeline.test.ts` rewritten weighted-aware.
- Key constraints:
  - N1 float rule: `normalizeTo` scales to target sum; `weightedPicker` re-normalizes internally, never trusts input to sum to 1.0; float assertions use `1e-9` epsilon tolerance.
  - `weightedPicker` consumes exactly ONE rng draw; two-stage draw preserved (tier 0 → 1 roll, tiers ≥1 → 2 rolls); do NOT merge into combined roll (that is 2.6).
  - Defensive guards: `normalizeTo` → all-zero on non-positive total; `weightedPicker` → `length - 1` on non-finite total/roll (never undefined).
  - Curve keyed off `POT_BASE_VALUE`/`POT_WEIGHT` from `spawnConfig.ts` — no scattered literals (boundary rule 4).
  - Implement only in `triade/`; `src/engine` never imports RN/React/Skia/Expo; explicit `.ts` extensions (ESM).

### Framework & Existing Patterns
- Runner: built-in `node:test` + `node:assert` (async tests via dynamic `import()` when targeting missing exports).
- Helpers: `rngOf(...values)` (sequential seeded rng), `mulberry32(seed)`, `extractSpecifiers(source)` (import-specifier purity checks) from `triade/test-utils/helpers.ts`.
- Import style: from `../../src/engine/core/index.ts` exactly like sibling engine tests.
- Existing pins that must stay green unchanged: `game.test.ts` boundary assertions (0.39→1, 0.4→2, 0.79→2, 0.8→3, 0.999→3), `spawn.test.ts` drift tripwire + distribution-sum invariant, `pot.test.ts` draw-count pins + wiring assertions (`weightedValue(rngOf(0.9, 0.99), 5) → 96`, `weightedValue(rngOf(0.9, 0.0), 5) → 3`).
- Stale test to rewrite (weighted-aware): `pot-tier-pipeline.test.ts` "every intra-pot slot is reachable at its tier (uniform pick placeholder)" (~lines 68-81) — must be replaced, not deleted (coverage intent preserved: all pot slots drawable).

### TEA Config Flags
- `tea_use_playwright_utils`: true (but no browser tests detected → API-only profile; not applicable here)
- `tea_use_pactjs_utils`: false · `tea_pact_mcp`: none · `tea_browser_automation`: auto
- `test_stack_type`: auto → backend

### Knowledge Fragments Loaded (core, backend-applicable)
- `test-levels-framework.md` — unit level is primary for pure functions (`potWeights`, `normalizeTo`, `weightedPicker`, `weightedValue`); duplicate-coverage guard applied (no re-pin of distribution-sum / drift tripwire).
- Others (data-factories, component-tdd, selector-resilience, timing-debugging, playwright-utils profiles): skipped — UI/browser fragments not applicable to pure-function backend scope (same as 2.3).

### Target Test Files (from story tasks)
1. `triade/__tests__/engine/weights.test.ts` (NEW) covering:
   - Literal halving matrix (AC 1): `potWeights([3,6,12,24,48,96])` → `[1, 0.5, 0.25, 0.125, 0.0625, 0.03125]` via `deepStrictEqual` (exact — every value `3/v = 2^-i` exactly representable); `potWeights([3])` → `[1]`; `potWeights([3,6])` → `[1, 0.5]`.
   - Normalization (AC 2): sweep of pot lengths 1..6, `normalizeTo(POT_WEIGHT, potWeights(potForTier(t)))` sums to `POT_WEIGHT` within `1e-9`; returns a fresh array (input untouched).
   - Monotonicity (AC 3): tiers 1..8, normalized weights strictly decreasing (`w[i+1] < w[i]`, and `w[i+1] ≈ w[i]/2`).
   - weightedPicker re-normalizes (AC 4, N1): `[1, 0.5]` vs `[2/3, 1/3]` select index 0 with same probability; deterministic boundary rolls `rngOf(2/3 + 1e-6)` → 1, `rngOf(2/3 - 1e-6)` → 0, `rngOf(0.99)` → last; non-1.0-sum weights produce same distribution as normalized equivalent.
   - Draw-count: exactly one rng draw per call, including at pot length 1 edge.
   - Statistical (AC 5): `mulberry32(seed)`, N ≈ 100_000 at tier 1 and tier 5; only open pot values hit; within-pot frequencies match normalized halving-decay ratios within ±1% ABSOLUTE (`|freq/N − ratio| < 0.01`). Ratios tier 1: `3≈0.6667`, `6≈0.3333`; tier 5: `3≈0.5079`, `6≈0.2540`, `12≈0.1270`, `24≈0.0635`, `48≈0.0317`, `96≈0.0159`.
   - Source-keying purity (mirror `pot.test.ts:102-108`): `readFileSync` `weights.ts`, `extractSpecifiers`, assert an import ends with `spawnConfig.ts` and no specifier matches `/react|react-native|@shopify|expo|skia/i`.
2. `triade/__tests__/engine/pot-tier-pipeline.test.ts` (MODIFIED): replace uniform-reachability test with weighted-aware reachability using midpoints of cumulative boundaries from `normalizeTo(POT_WEIGHT, potWeights(potForTier(tier)))`; other pipeline tests stay green unchanged.

### Import Strategy for Red-Phase Scaffolds
- `weights.ts` does not exist → `potWeights`/`normalizeTo`/`weightedPicker` loaded via dynamic `import()` inside skipped tests so the suite links today; on activation the import throws → RED. Static imports only for symbols that exist today (`weightedValue`, `potForTier`, `POT_WEIGHT`, `POT_BASE_VALUE` from `core/index.ts`).
- Statistical tests reference `weightedValue` (exists) but the pot branch still uses the uniform placeholder → expected ratios fail → RED.
## Step 2: Generation Mode
- **Mode: AI Generation** — `detected_stack` is `backend` (pure-function engine, node:test). No browser recording needed; scenarios derived directly from the story's ACs, dev notes and existing engine test patterns (mirrors 2.3).

## Step 3: Test Strategy

### AC → Test Scenario Mapping (all UNIT level — pure functions)

| ID | AC | Scenario (red-phase test) | Level | Priority |
|----|----|---------------------------|-------|----------|
| 2.4-UNIT-001 | 1 | `potWeights` literal halving matrix: `potWeights([3,6,12,24,48,96])` → `[1, 0.5, 0.25, 0.125, 0.0625, 0.03125]` via `deepStrictEqual` (exact, no tolerance); `potWeights([3])` → `[1]`; `potWeights([3,6])` → `[1, 0.5]` | Unit | P0 |
| 2.4-UNIT-002 | 2 | `normalizeTo(POT_WEIGHT, potWeights(potForTier(t)))` sums to `POT_WEIGHT` within `1e-9` for pot lengths 1..6; returns a fresh array (input untouched) | Unit | P0 |
| 2.4-UNIT-003 | 3 | Monotonicity: tiers 1..8, normalized weights strictly decreasing (`w[i+1] < w[i]`) and `w[i+1] ≈ w[i]/2` | Unit | P1 |
| 2.4-UNIT-004 | 4 | `weightedPicker` re-normalizes (N1): `[1, 0.5]` vs `[2/3, 1/3]` select index 0 with same probability; boundary rolls `rngOf(2/3 + 1e-6)` → 1, `rngOf(2/3 - 1e-6)` → 0, `rngOf(0.99)` → last; non-1.0-sum weights same distribution as normalized equivalent | Unit | P0 |
| 2.4-UNIT-005 | 4 | `weightedPicker` draw-count: exactly one rng draw per call (counting rng, `calls === 1`), including pot length 1 edge | Unit | P0 |
| 2.4-UNIT-006 | 5 | Statistical validation: `mulberry32(seed)`, N ≈ 100_000 at tier 1 and tier 5; only open pot values hit; within-pot frequencies match normalized halving-decay ratios within ±1% ABSOLUTE (`|freq/N − ratio| < 0.01`). Ratios tier 1: `3≈0.6667`, `6≈0.3333`; tier 5: `3≈0.5079`, `6≈0.2540`, `12≈0.1270`, `24≈0.0635`, `48≈0.0317`, `96≈0.0159` | Unit | P1 |
| 2.4-UNIT-007 | 1,3 | Source-keying purity (mirror `pot.test.ts:102-108`): `readFileSync` `weights.ts`, `extractSpecifiers`, assert an import ends with `spawnConfig.ts` and none matches `/react|react-native|@shopify|expo|skia/i`; re-exported from `core/index.ts` | Unit | P1 |
| 2.4-UNIT-008 | 2,3,4 | Stale-test rewrite in `pot-tier-pipeline.test.ts`: weighted-aware reachability — cumulative boundaries from `normalizeTo(POT_WEIGHT, potWeights(potForTier(tier)))`, feed rng `midpoints` (not exact boundaries) to land on the i-th pot value; all pot slots drawable; other pipeline tests stay green unchanged | Unit | P1 |

### Duplicate-Coverage Guard
- Distribution-sum invariant (`FIXED_WEIGHTS + POT_WEIGHT ≈ 1.0`) already pinned in `spawn.test.ts` — NOT duplicated.
- Backward-compat boundary pins (`rngOf(0.39)→1 … rngOf(0.999)→3`) live in `game.test.ts:22` — NOT duplicated; suite must stay green unchanged.
- Statistical drift tripwire stays solely in `spawn.test.ts` (2.4-UNIT-006 measures within-pot ratios, orthogonal).
- `pot.test.ts` draw-count pins + wiring assertions (`weightedValue(rngOf(0.9, 0.99), 5) → 96`, `weightedValue(rngOf(0.9, 0.0), 5) → 3`) must STAY GREEN — verify, don't assume; 2.4-UNIT-005 counts `weightedPicker`'s own draws (new API), not `weightedValue`'s total.
- The uniform-reachability test (`pot-tier-pipeline.test.ts` ~68-81) is rewritten weighted-aware (2.4-UNIT-008), preserving coverage intent — not silently deleted.

### Red Phase Requirements
- All tests must FAIL before implementation:
  - `potWeights`/`normalizeTo`/`weightedPicker` don't exist → dynamic `import()` of `core/index.ts` still links today (exports absent), but activated tests throw on the missing symbols → RED.
  - Statistical tests call `weightedValue` (exists) whose pot branch still uses the uniform placeholder → expected ratios fail → RED.
- Tests are written against the TARGET API (`potWeights`, `normalizeTo`, `weightedPicker`, `POT_WEIGHT`) exactly as specified in the story tasks.

## Step 4/4C: Red-Phase Generation & Aggregation
- Execution mode: **SEQUENTIAL** (backend adaptation — Playwright API/E2E workers not applicable; unit-level scaffolds written directly to disk, E2E worker returns 0 tests)
- TDD Red Phase Validation: PASS — all scaffolds use `test.skip()`, assert expected behavior (no placeholders)
- Written to disk:
  - `triade/__tests__/engine/weights.test.ts` (NEW — 9 scaffolds: P0×5, P1×4)
  - `triade/__tests__/engine/pot-tier-pipeline.test.ts` (MODIFIED — uniform-reachability test rewritten weighted-aware, kept as RED scaffold)
- Fixtures created: 0 (reuses existing `rngOf`, `mulberry32`, `extractSpecifiers` from `triade/test-utils/helpers.ts`)
- Note on red-phase mechanics: `potWeights`/`normalizeTo`/`weightedPicker` are loaded via dynamic `import()` inside the skipped tests so the missing exports do not crash the suite at link time; RED verified by activating the first scaffold (`TypeError: potWeights is not a function`) then restoring `test.skip()`. The statistical scaffold uses a strict band/pick roll alternation (band → 0.9, pick → mulberry stream) so every sample deterministically lands in the pot branch; the weighted-aware reachability test feeds cumulative-band MIDPOINTS (robust to float drift and `<` vs `<=` semantics).

### Next Steps (task-by-task activation)
1. Remove `test.skip()` from the scenario for the current task
2. Run `npm test` (in `triade/`)
3. Verify activated test fails first (RED), then passes after implementation (GREEN)
4. Keep `game.test.ts` / `spawn.test.ts` / `pot.test.ts` pins green unchanged
5. The `pot-tier-pipeline.test.ts` reachability scaffold activates once `potWeights`/`normalizeTo` land in `core/index.ts`

### Acceptance Criteria Coverage
- AC1 ✅ (literal FR-8 halving matrix via `deepStrictEqual`)
- AC2 ✅ (normalizeTo sum = POT_WEIGHT within 1e-9, fresh array)
- AC3 ✅ (strict monotonicity + halving ratio tiers 1..8)
- AC4 ✅ (weightedPicker re-normalization equivalence, boundary rolls, draw-count, weights.ts purity/re-export)
- AC5 ✅ (statistical sampling tier 1 & 5, ±1% absolute within-pot ratios; weighted-aware pipeline reachability)

## Step 5: Validation & Completion
- Checklist validation: PASS
  - ✅ Prereqs OK (story `ready-for-dev` com 5 ACs testáveis; node:test via tsx configurado)
  - ✅ Scaffolds: `triade/__tests__/engine/weights.test.ts` (9× `test.skip()`) + `pot-tier-pipeline.test.ts` reachability rewrite (1× `test.skip()`)
  - ✅ RED verificada: ativação do scaffold P0 → `TypeError: potWeights is not a function` (fail 1), revertido a skip
  - ✅ Sem duplicação de cobertura (distribution-sum/drift tripwire/backward-compat pins permanecem só nos arquivos originais)
  - ✅ Metadados de handoff no frontmatter (`storyId`, `storyKey`, `storyFile`, `generatedTestFiles`, `atddChecklistPath`)
  - ✅ Artefatos vinculados de volta à story (`### ATDD Artifacts` sob Dev Agent Record)
  - ✅ Sem sessões CLI órfãs (sem browser); artefatos temporários apenas em `{test_artifacts}/`
- Verificação executada: `npm test` (triade/) → 245 tests, 235 pass, 0 fail, 10 skipped (scaffolds RED); `npx tsc --noEmit -p tsconfig.test.json` → apenas o aviso TS 6 `baseUrl` pré-existente
- Adaptações documentadas: stack backend → workers Playwright API/E2E N/A; red-phase scaffolds carregam os novos símbolos via dynamic `import()` para não quebrar o link ESM enquanto skippados; o scaffold estatístico força banda→0.9 / pick→mulberry para amostragem determinística dentro do pot; reachability usa MIDPOINTS das bandas cumulativas (robusto a float drift e `<` vs `<=`)

### Resumo Final
| Item | Valor |
|------|-------|
| Story | 2.4 — Curva halving-decay normalizada |
| Nível primário | Unit (node:test) |
| Testes gerados | 10 scaffolds RED (P0×5, P1×5) — 9 novos em weights.test.ts + 1 rewrite em pot-tier-pipeline.test.ts |
| Arquivos de teste | `triade/__tests__/engine/weights.test.ts` (novo), `triade/__tests__/engine/pot-tier-pipeline.test.ts` (modificado) |
| Factories / Fixtures / Mocks | 0 (reusa `rngOf`, `mulberry32`, `extractSpecifiers` existentes) |
| data-testid | N/A (sem UI) |
| Comando de execução | `npm test` (em `triade/`) |
| Próximo workflow recomendado | `bmad-dev-story` (implementar 2.4 ativando scaffolds tarefa a tarefa) |

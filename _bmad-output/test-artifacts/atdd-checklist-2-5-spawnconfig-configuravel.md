---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-22'
storyId: '2.5'
storyKey: '2-5-spawnconfig-configuravel'
storyFile: '_bmad-output/implementation-artifacts/2-5-spawnconfig-configuravel.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-2-5-spawnconfig-configuravel.md'
generatedTestFiles:
  - 'triade/__tests__/engine/spawn-config.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/2-5-spawnconfig-configuravel.md'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/src/engine/core/weights.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/__tests__/engine/weights.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad-output/test-artifacts/atdd-checklist-2-4-curva-halving-decay-normalizada.md'
---

# ATDD Checklist — Story 2.5: spawnConfig configurável

## Step 1: Preflight & Context

### Stack Detection
- `config.test_stack_type`: `auto` → auto-detection executed.
- No `playwright.config.*` / `cypress.config.*`; `triade/package.json` has RN/Expo deps but the suite is pure TypeScript via `node:test` + tsx loader (`npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`).
- **detected_stack = `backend`** (pure-function engine testing, node:test runner) — mirrors 2.3/2.4 precedent.

### Prerequisites
- ✅ Story approved: status `ready-for-dev`, 5 clear acceptance criteria.
- ✅ Test framework configured: node:test via tsx (`triade/package.json` test script).
- ✅ Dev environment available (Node ≥26 required by engines).

### Story Context
- story_id: `2.5` · story_key: `2-5-spawnconfig-configuravel`
- Goal: pot weight curve driven by a configurable parameter set (`POT_CURVE`, one weight per tile value) in `spawnConfig.ts`, plus a pure validator `validateSpawnConfig()` and `Object.freeze` hardening; `potWeights` becomes config-driven with documented formula fallback for unlisted values. Runtime spawn behavior must stay BYTE-FOR-BYTE identical.
- Key constraints:
  - `POT_CURVE: Readonly<Record<number, number>> = { 3: 1, 6: 0.5, 12: 0.25, 24: 0.125, 48: 0.0625, 96: 0.03125 }` keyed by tile VALUE (not index).
  - Keep `POT_WEIGHT`, `FIXED_WEIGHTS`, `POT_BASE_VALUE` exports/values EXACTLY as-is (pinned tests depend on them).
  - Validator: pure predicate `{ ok: true } | { ok: false; errors: string[] }`, NEVER throws (engine never throws); epsilon `1e-9`; checks: finite positive weights, keys are `POT_BASE_VALUE * 2^k`, strictly decreasing curve weights, `FIXED_WEIGHTS[1]+FIXED_WEIGHTS[2] ≈ 1 - POT_WEIGHT`. Optional param `validateSpawnConfig(config = defaultConfig)` so tests can pass bad configs without mutating frozen exports.
  - `Object.freeze` on `FIXED_WEIGHTS` and `POT_CURVE`; tests assert `Object.isFrozen(...) === true`.
  - `potWeights` override+fallback: `pot.map((v) => POT_CURVE[v] ?? POT_BASE_VALUE / v)` — fallback needed because pot ladder extends to `3 * 2^30` (MAX_POT_TIER in pot.ts); signature unchanged.
  - Re-export `POT_CURVE` + `validateSpawnConfig` from `core/index.ts`.
  - Scope guard (CRITICAL): pure refactor + config surface; no signature changes; no render/UI/services touch; no new dependencies; implement only in `triade/`; `src/engine` never imports RN/React/Skia/Expo; explicit `.ts` extensions (ESM).
  - Closes deferred-work items from 2.2 review (runtime validation + Object.freeze).

### Framework & Existing Patterns
- Runner: built-in `node:test` + `node:assert`.
- Helpers: `rngOf(...values)`, `mulberry32(seed)`, `extractSpecifiers(source)` from `triade/test-utils/helpers.ts`.
- Import style: from `../../src/engine/core/index.ts` like sibling engine tests; `[P0]/[P1]` prefixes in test names.
- Pins that must stay green UNCHANGED: `game.test.ts:22` boundary assertions, `spawn.test.ts` drift tripwire + distribution-sum invariant, `pot.test.ts` ladder matrix + draw-count pins + wiring assertions, `weights.test.ts` FR-8 literal matrix + statistical sampling ±1%/±10%, `pot-tier-pipeline.test.ts` weighted-aware reachability. Any edit needed to these means the implementation broke byte-for-byte equivalence.

### TEA Config Flags
- `tea_use_playwright_utils`: true (no browser tests detected → not applicable)
- `tea_use_pactjs_utils`: false · `tea_pact_mcp`: none · `tea_browser_automation`: auto
- `test_stack_type`: auto → backend

### Knowledge Fragments Loaded (core, backend-applicable)
- `test-levels-framework.md` — unit level primary for pure functions/config data; duplicate-coverage guard applied.
- `test-quality.md` — deterministic, isolated, explicit assertions visible in test body.
- `data-factories.md` — override-style factory pattern for building mutated bad configs in the validator rejection matrix.
- `component-tdd.md` — red-phase scaffolds fail for the right reason.
- `test-priorities-matrix.md` — P0/P1 classification per business impact.
- UI/browser fragments (selector-resilience, timing-debugging, playwright-utils profiles): skipped — not applicable to pure-engine scope (same as 2.3/2.4).

### Target Test Files (from story tasks)
1. `triade/__tests__/engine/spawn-config.test.ts` (NEW) covering the NEW invariants (AC 1, 2, 4): literal curve matrix, structural invariants, validator happy path, validator rejection matrix, freeze pins, fallback-rule proof tiers 6..12.

## Step 2: Generation Mode
- **Mode: AI Generation** — `detected_stack` is `backend` (pure-function engine, node:test). No browser recording needed; scenarios derived directly from the story's ACs, dev notes and existing engine test patterns (mirrors 2.3/2.4).

## Step 3: Test Strategy

### AC → Test Scenario Mapping (all UNIT level — pure config data + pure functions)

| ID | AC | Scenario (red-phase test) | Level | Priority |
|----|----|---------------------------|-------|----------|
| 2.5-UNIT-001 | 1 | Literal curve matrix: `deepStrictEqual({ ...POT_CURVE }, { 3: 1, 6: 0.5, 12: 0.25, 24: 0.125, 48: 0.0625, 96: 0.03125 })` — exact, all values exactly representable | Unit | P0 |
| 2.5-UNIT-002 | 1, 4 | Curve structural invariants: keys sorted ascending equal `POT_BASE_VALUE * 2^k`; weights finite `> 0`; strictly decreasing | Unit | P1 |
| 2.5-UNIT-003 | 2 | Validator happy path: `validateSpawnConfig()` → `{ ok: true }` on shipped defaults | Unit | P0 |
| 2.5-UNIT-004 | 2 | Validator rejection matrix (against mutated copies via optional param): NaN weight, zero/negative weight, Infinity, fixed-sum drift beyond `1e-9`, non-monotonic curve, key not `POT_BASE_VALUE * 2^k` → each `{ ok: false }` with non-empty `errors`; NEVER throws | Unit | P0 |
| 2.5-UNIT-005 | 4 | Freeze pin: `Object.isFrozen(POT_CURVE)` and `Object.isFrozen(FIXED_WEIGHTS)` both true | Unit | P0 |
| 2.5-UNIT-006 | 1 | Fallback-rule proof (vs MAX_POT_TIER): tiers 6..12, `potWeights(potForTier(t))` continues strict halving beyond the configured range (`w[i+1] ≈ w[i]/2` within `1e-9`) even without a `POT_CURVE` entry | Unit | P1 |
| 2.5-UNIT-007 | 3, 5 | Config-driven purity: `core/index.ts` re-exports `POT_CURVE` + `validateSpawnConfig`; `weights.ts` keys off `spawnConfig.ts` (source-keying); no RN/React/Skia/Expo imports | Unit | P1 |

### Duplicate-Coverage Guard
- FR-8 output matrix (`potWeights([3..96])`) already pinned in `weights.test.ts` — NOT duplicated (this file pins the `POT_CURVE` symbol itself, different aspect).
- Distribution-sum invariant already pinned in `spawn.test.ts` — the validator check is NEW module-level enforcement (distinct aspect, allowed).
- Statistical drift tripwire stays solely in `spawn.test.ts`.
- Backward-compat pins (`game.test.ts`, `pot.test.ts`, `weights.test.ts`, `pot-tier-pipeline.test.ts`) must stay green UNCHANGED.

### Red Phase Requirements
- All tests must FAIL before implementation:
  - `POT_CURVE`/`validateSpawnConfig` don't exist → loaded via dynamic `import()` inside skipped tests so the suite links today; on activation the missing symbols throw → RED.
  - Freeze pins fail while exports are absent → RED.
- 2.5-UNIT-006 is a REGRESSION TRIPWIRE: passes BEFORE implementation (current formula ≡ halving) and MUST stay green after the override+fallback lands — byte-for-byte equivalence guard; activated last.
- Tests are written against the TARGET API (`POT_CURVE`, `validateSpawnConfig(config?)`) exactly as specified in the story tasks.

## Step 4/4C: Red-Phase Generation & Aggregation
- Execution mode: **SEQUENTIAL** (backend adaptation — Playwright API/E2E workers not applicable; unit-level scaffolds written directly to disk, E2E worker returns 0 tests)
- TDD Red Phase Validation: PASS — all scaffolds use `test.skip()`, assert expected behavior (no placeholders), marked expected_to_fail
- Written to disk:
  - `triade/__tests__/engine/spawn-config.test.ts` (NEW — 7 scaffolds: P0×4, P1×3)
- Fixtures created: 0 (reuses existing helpers; local factory `spawnConfigOf(overrides)` builds mutated configs for the validator rejection matrix — data-factories pattern, no shared fixture file needed)
- Note on red-phase mechanics:
  - `POT_CURVE`/`validateSpawnConfig` are loaded via dynamic `import()` INSIDE the skipped tests so the missing exports do not crash the suite at link time; RED verified by activating the first scaffold (fail 1 on missing export) then restoring `test.skip()`.
  - The validator contract is exercised through an optional `{ potCurve, fixedWeights }` param (per Dev Notes design decision) so rejection cases never mutate frozen exports; the public no-arg call stays pinned (`validateSpawnConfig()` → `{ ok: true }`).
  - 2.5-UNIT-006 (fallback proof) uses static imports of EXISTING symbols only (`potForTier`, `potWeights`) and is expected GREEN before activation (regression tripwire) — activate LAST.

### Next Steps (task-by-task activation)
1. Remove `test.skip()` from the scenario for the current task
2. Run `npm test` (in `triade/`)
3. Verify activated test fails first (RED), then passes after implementation (GREEN)
4. Keep `game.test.ts` / `spawn.test.ts` / `pot.test.ts` / `weights.test.ts` / `pot-tier-pipeline.test.ts` pins green UNCHANGED — any edit needed there means byte-for-byte equivalence broke; fix the implementation, not the test
5. The freeze/purity/re-export scaffolds activate once `POT_CURVE`/`validateSpawnConfig` land in `spawnConfig.ts` + `core/index.ts`

### Acceptance Criteria Coverage
- AC1 ✅ (literal `POT_CURVE` matrix via `deepStrictEqual`; structural key/weight invariants; fallback-rule proof tiers 6..12)
- AC2 ✅ (validator happy path + rejection matrix with epsilon `1e-9`, never throws)
- AC3 ✅ (config-driven purity: weights.ts keys off spawnConfig; re-exports verified)
- AC4 ✅ (freeze pins `Object.isFrozen`; initial values = documented halving decay pinned literally)
- AC5 ✅ (single access point enforced by source-keying purity check)

## Step 5: Validation & Completion
- Checklist validation: PASS
  - ✅ Prereqs OK (story `ready-for-dev` com 5 ACs testáveis; node:test via tsx configurado)
  - ✅ Scaffolds: `triade/__tests__/engine/spawn-config.test.ts` (7× `test.skip()`)
  - ✅ RED verificada: ativação do scaffold P0 → fail 1 (export ausente), revertido a skip
  - ✅ Sem duplicação de cobertura (FR-8 output matrix / distribution-sum / drift tripwire permanecem só nos arquivos originais)
  - ✅ Metadados de handoff no frontmatter (`storyId`, `storyKey`, `storyFile`, `generatedTestFiles`, `atddChecklistPath`)
  - ✅ Artefatos vinculados de volta à story (`### ATDD Artifacts` sob Dev Notes)
  - ✅ Sem sessões CLI órfãs (sem browser); artefatos temporários apenas em `{test_artifacts}/`
- Verificação executada: `npm test` (triade/) → 254 tests, 247 pass, 0 fail, 7 skipped (scaffolds RED); `npx tsc --noEmit -p tsconfig.test.json` → apenas o aviso TS 6 `baseUrl` pré-existente
- Adaptações documentadas: stack backend → workers Playwright API/E2E N/A; red-phase scaffolds carregam os novos símbolos via dynamic `import()` para não quebrar o link ESM enquanto skippados; matriz de rejeição do validador usa factory local `spawnConfigOf(overrides)` contra o parâmetro opcional do validador (nunca muta exports congelados)

### Resumo Final
| Item | Valor |
|------|-------|
| Story | 2.5 — spawnConfig configurável |
| Nível primário | Unit (node:test) |
| Testes gerados | 7 scaffolds RED (P0×4, P1×3) |
| Arquivos de teste | `triade/__tests__/engine/spawn-config.test.ts` (novo) |
| Factories / Fixtures / Mocks | 0 arquivos novos (factory local `spawnConfigOf` no próprio teste; reusa `extractSpecifiers` existente) |
| data-testid | N/A (sem UI) |
| Comando de execução | `npm test` (em `triade/`) |
| Próximo workflow recomendado | `bmad-dev-story` (implementar 2.5 ativando scaffolds tarefa a tarefa) |


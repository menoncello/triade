---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-14'
storyId: '1.4'
storyKey: '1-4-offline-capability-instalavel-e-persistencia'
storyFile: '_bmad-output/implementation-artifacts/1-4-offline-capability-instalavel-e-persistencia.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-4-offline-capability-instalavel-e-persistencia.md'
generatedTestFiles:
  - 'triade/__tests__/storage/schema.test.ts'
  - 'triade/__tests__/storage/entitlements.test.ts'
  - 'triade/__tests__/storage/keyspace.test.ts'
  - 'triade/__tests__/storage/storage.purity.test.ts'
  - 'triade/benchmarks/storage.bench.test.ts'
  - 'triade/__tests__/assets/assetManifest.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-4-offline-capability-instalavel-e-persistencia.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
  - 'triade/src/game/matchScore.ts'
  - 'triade/App.tsx'
  - 'triade/test-utils/helpers.ts'
  - 'triade/package.json'
  - 'triade/__tests__/game/matchScore.test.ts'
  - 'triade/__tests__/engine/engine.purity.test.ts'
  - 'triade/benchmarks/engine.bench.test.ts'
---

# ATDD Checklist: Story 1.4 — Offline capability, instalável e persistência

## Step 1: Preflight & Context

### Stack Detection

- `test_stack_type`: `auto` (no explicit value). Auto-detection finds the Expo RN app manifest (`triade/package.json` with react/react-native) — **frontend** stack. No backend indicators.
- **Detected stack (adapted):** Expo SDK 57 RN app tested with `node:test` on Node 26 (type-strips TS natively). **No Playwright/Cypress** — zero-dep rule for both the web PWA and the RN app (project-standard since S1.1). Native storage runtime (AsyncStorage/MMKV/SecureStore) is validated **manually** on the simulator/device.

### TEA Config Flags

- `tea_use_playwright_utils`: `true` — **not applicable** (no web UI surface; RN device/Node runner only).
- `tea_use_pactjs_utils`: `false` — no contract testing.
- `tea_pact_mcp`: `none`.
- `tea_browser_automation`: `auto` — no browser tests possible.
- `tea_execution_mode`: `auto`.
- `tea_capability_probe`: `true`.

### Story Context

- **Story:** 1.4 — Offline capability, instalável e persistência.
- **Story file:** `_bmad-output/implementation-artifacts/1-4-offline-capability-instalavel-e-persistencia.md` (status `ready-for-dev`).
- **ACs (5):**
  1. Expo dev build launches instantly on a physical iOS device and plays fully offline (NFR-2, NFR-3). **Manual validation.**
  2. Best score + player settings persist across launches via app storage (AsyncStorage/MMKV — decision from the S1.1 deferred benchmark T4.5). **Testable at JS layer.**
  3. Entitlements (IAP) mirror to SecureStore and are authoritative offline (ADR-02). **Testable at JS layer** (`mergeEntitlements` precedence).
  4. Per-match budgets (free undo/continue/hint counts) live in memory only and die with the match. **Testable** (budget-keyspace guard against `STORAGE_KEYS`).
  5. All assets (13 tile tiers, board, icon, 3 SFX) bundled and preloaded — no CDN (NFR-6). **Manifest is data-driven/additive** (tile/SFX assets do not exist yet — build-order dependency).
- **Affected components:** `triade/src/services/storage/` (NEW: `schema.ts` pure, `settingsStore.ts`, `entitlements.ts`), `triade/src/services/assets/assetManifest.ts` (NEW), `triade/benchmarks/storage.bench.test.ts` (NEW), `triade/__tests__/storage/` (NEW), `triade/App.tsx` (modify temp harness), `triade/package.json` (add storage lib + `expo-secure-store` + `expo-asset`), `game-architecture.md` (record T4.5 decision). Web PWA files (`js/*`, `test/game.test.js`) READ-ONLY.

### Framework & Existing Patterns

- Existing suite: 81 triade tests green (`node --test` in `triade/`, Node 26) + 26 web frozen. `tsc --noEmit` clean.
- Helpers: `triade/test-utils/helpers.ts` — `emptyBoard()`, `rngOf(...)`, `staticBoard(row)`, `boardWith(matrix)`, `mulberry32(seed)`. Determinism: seeded only, no `Math.random`.
- Purity guard pattern: `triade/__tests__/engine/engine.purity.test.ts` — scans source for forbidden RN/React/Skia/Expo imports + relative-import-only assertions (ADR-01). Reusable for `schema.ts` (boundary rule 8).
- Benchmark pattern: `triade/benchmarks/engine.bench.test.ts` — seeded `mulberry32`, median/p99 of samples, budget assert-fails PR. Storage bench mirrors this for the JS payload layer.
- `matchScore.ts` contract (S1.2): `initialScore(best)`, `applyMove(current, result)`, `isNewRecord(previousBest, score)`. Persistence must use the **session-start (persisted) best**, never `current.best`.

### Prerequisites Check

- Story approved with clear, testable ACs: **PASS** (AC 2-4 are automated at JS layer; AC 1 and native runtime are manual; AC 5 is additive/manifest).
- Test framework configured: **PASS** — `node:test` built-in (Node 26). Project-mandated runner; Playwright/Cypress prerequisites do not apply.
- Development environment: **PASS** — Node v26.0.0 present, `triade/` suite green at baseline.

### Notes / Adaptations

- The ATDD two-worker split (API + E2E) does **not** map 1:1: no HTTP API and no browser UI in this story. Adapted levels: **Unit** (schema sanitize matrix, serialize round-trip, `mergeEntitlements` precedence), **Unit/boundary** (purity of `schema.ts`, budget-keyspace guard against `STORAGE_KEYS`), **Performance acceptance** (storage JS-layer benchmark gate), and **manual** (native AsyncStorage/MMKV/SecureStore I/O + offline launch on simulator/device).
- Native storage libs (AsyncStorage/MMKV) are native modules and **cannot execute under `node --test`** (T1.2): the CI benchmark measures the shared pure JS payload layer (`serializeSettings` → string → `loadSettings`), not the native startup differential (manual, informative only).
- `isNewRecord` new-record path (persist only when `isNewRecord(sessionStartBest, score)`) is testable as a pure contract (already partially covered in `matchScore.test.ts`); the orchestrator wiring stays in `App.tsx` (temp harness) — manual/simulator verification.
- Do NOT fabricate tile/SFX assets; `assetManifest.ts` is additive (scope: icon + present bundled assets).

---

## Step 2: Generation Mode

### Mode Selection

- `test_generation_mode`: **AI Generation** (default). The testable surface for Story 1.4 is pure TS under `node:test` (`schema.ts`, `mergeEntitlements`, `STORAGE_KEYS`, `isNewRecord`); there is no web UI to record.
- **Recording (optional mode):** skipped. No browser surface exists — the native storage runtime (AsyncStorage/MMKV/SecureStore) and offline launch are manual validation on simulator/device (project rule), so `tea_browser_automation: auto` finds nothing to drive with Playwright CLI/MCP. Same adaptation as S1.1–S1.3.

---

## Step 3: Test Strategy

### Acceptance Criteria → Scenarios

| AC | Scenario | Level | Priority |
| -- | -------- | ----- | -------- |
| AC-2 (best+settings persist) | `loadSettings` sanitize: missing/extra/corrupt/JSON-broken fields → defaults, never throw | Unit | P0 |
| AC-2 | `serializeSettings` → string → `loadSettings` round-trip preserves the S1.4 schema (~10 key/values) | Unit | P0 |
| AC-2 | `DEFAULT_SETTINGS` shape: theme, reducedMotion, language, laneDefault | Unit | P0 |
| AC-2 | New-record path: persist only when `isNewRecord(sessionStartBest, score)` — contract already covered in `matchScore.test.ts`; App.tsx harness wiring stays manual | Unit (existing) + Manual | P0 |
| AC-3 (entitlements SecureStore, ADR-02) | `mergeEntitlements` precedence: remote never downgrades held offline entitlement; offline wins; empty remote keeps offline; both empty → empty | Unit | P0 |
| AC-4 (budgets memory-only) | `STORAGE_KEYS` never contains budget keys (free undo/continue/hint counters) | Unit (guard) | P0 |
| AC-4 | `STORAGE_KEYS` contains exactly best-score + settings keys (single source of truth) | Unit (guard) | P0 |
| AC-2/3 boundary | `schema.ts` purity: no RN/Expo imports, relative imports only (boundary rule 8, ADR-05 spirit) | Unit (boundary) | P1 |
| AC-1/2 (T1.2) | Storage JS-layer benchmark: `serializeSettings` → `loadSettings` cost/turn < budget (CI gate; native startup differential is manual) | Performance acceptance | P1 |
| AC-5 (assets bundled, no CDN) | `assetManifest` entries reference only bundled `require` targets; no remote/CDN URLs | Unit | P2 |
| AC-1, AC-5 native runtime | Offline launch, AsyncStorage/MMKV startup/read differential, SecureStore I/O, preload on device | Manual (simulator/device) | P1 |

### Test Level Selection

- **Unit** (`node:test`, pure TS): `loadSettings` sanitize matrix, serialize round-trip, `DEFAULT_SETTINGS` shape, `mergeEntitlements` precedence, budget-keyspace guard. Covers AC-2, AC-3, AC-4 decision logic.
- **Unit/boundary**: `schema.ts` purity (mirror of `engine.purity.test.ts`) — enforces boundary rule 8 automatically in CI.
- **Performance acceptance**: `benchmarks/storage.bench.test.ts` (JS payload layer only, deterministic, seeded).
- **Manual** (not automated): native AsyncStorage/MMKV/SecureStore I/O, offline launch, preload on device, App.tsx hydration/`isNewRecord` wiring (temp harness). Documented, not automated (project rule).
- **No E2E/API levels**: no browser UI, no HTTP API in this story.

### Red Phase Requirements

All new modules (`schema.ts`, `settingsStore.ts`, `entitlements.ts`, `assetManifest.ts`) **do not exist yet** — the generated tests will fail on import (red). The budget guard (T4.2) is a pure test asserting `STORAGE_KEYS` (exported from `settingsStore`, which does not exist yet) never contains budget keys — contract-first, fail-red until implementation.

### Notes / Deviations

- Native storage libs are out of `node:test` reach (native modules): the CI benchmark measures only the shared pure JS payload layer both adapters use (T1.2 spec). No mocking of native modules (they have jest mocks only; `node:test` gets the pure layer).
- No duplicate coverage: `isNewRecord` contract lives in `matchScore.test.ts` (existing, 8 tests); storage tests cover the schema/keyspace/entitlements decision logic only.
- Asset preload scope: manifest is additive; scope = icon + present bundled assets. Do not fabricate tile/SFX assets.

---

## Step 4/4C: Red-Phase Test Scaffold Generation & Aggregation

### Execution Mode

- `tea_execution_mode`: `auto`, `tea_capability_probe`: `true` → runtime supports subagents → **resolvedMode: `subagent`** (two workers in parallel).

### Workers

- **Worker A** (`step-04a`, adapted: Unit red-phase — storage decision logic): generated 20 scaffolds in `triade/__tests__/storage/`:
  - `schema.test.ts` — 9 tests: `loadSettings` sanitize matrix (missing/extra/corrupt/wrong-type/partial/adversarial never-throws), `serializeSettings` round-trip, `DEFAULT_SETTINGS` shape.
  - `entitlements.test.ts` — 6 tests: `mergeEntitlements` ADR-02 precedence (no downgrade, offline wins, empty remote, both empty, remote-only, identical).
  - `keyspace.test.ts` — 5 tests: `STORAGE_KEYS` exported/non-empty, `best` key required, settings keys present, budget-keyspace guard (AC-4), all values non-empty strings.
- **Worker B** (`step-04b`, adapted: boundary + performance + assets): generated 5 scaffolds:
  - `storage.purity.test.ts` — 1 test: `schema.ts` imports nothing from RN/React/Skia/Expo + relative-imports-only (boundary rule 8).
  - `benchmarks/storage.bench.test.ts` — 1 test: `serializeSettings → loadSettings` round-trip median < 0.1ms (T1.2 JS payload layer gate).
  - `assetManifest.test.ts` — 3 tests: non-empty entries, no remote URL patterns, no CDN hosts (AC-5/NFR-6).

### TDD Red Phase Validation — PASS

- All 25 tests wrapped in `test.skip(`; no placeholder assertions; all `expected_to_fail: true`.
- **Contract alignment fixes applied during aggregation:**
  1. `schema.test.ts` no longer embeds `best` inside the pure `Settings` schema (story: `Settings` = theme/reducedMotion/language/laneDefault; `best` is a separate `STORAGE_KEYS` entry via `saveBest()`).
  2. `storage.bench.test.ts` `SETTINGS_SAMPLE` trimmed to the real S1.4 schema (removed invented keys soundOn/musicOn/contrast/boardSize — those belong to later stories, out of scope).
  3. **CI-green red phase:** all value imports of not-yet-existing modules moved inside `test.skip` callbacks via variable-specifier dynamic `import(SPEC)`; the `Settings` type is declared locally (contract) instead of imported, and `tsc --noEmit` stayed green. Top-level static imports would have failed file load (modules don't exist yet) and broken the CI gate — the scaffolds must be red on *activation*, not red on *load*.

### Verification

- `node --test` from `triade/`: **106 total — 81 pass, 0 fail, 25 skipped** (skipped = red-phase scaffolds).
- `npx tsc --noEmit`: **clean**.
- Web PWA frozen: `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` untouched.

### Summary

| File | Tests | Priority | Covers |
| ---- | ----- | -------- | ------ |
| `triade/__tests__/storage/schema.test.ts` | 9 | P0 | AC-2 |
| `triade/__tests__/storage/entitlements.test.ts` | 6 | P0 | AC-3 |
| `triade/__tests__/storage/keyspace.test.ts` | 5 | P0 | AC-2, AC-4 |
| `triade/__tests__/storage/storage.purity.test.ts` | 1 | P1 | AC-2/3 boundary |
| `triade/benchmarks/storage.bench.test.ts` | 1 | P1 | AC-1/2 (T1.2) |
| `triade/__tests__/assets/assetManifest.test.ts` | 3 | P2 | AC-5 |

**Total: 25 red-phase scaffolds (all skipped).**

### Next Steps (Task-by-Task Activation)

During implementation of each task (dev-story), per TDD red-green:

1. Remove `test.skip(` from the test(s) for the current task.
2. Run `node --test` from `triade/` — the activated test must **fail first** (module doesn't exist / behavior absent).
3. Implement the module; the test turns green.
4. Keep `tsc --noEmit` green and the whole suite green; commit passing tests.

---

## Step 5: Validate & Complete

### Validation

- [x] Story approved with clear testable ACs (5).
- [x] Development environment ready (Node 26, `triade/` baseline green).
- [x] Framework configured — `node:test` built-in (project-mandated; Playwright/Cypress adapted to N/A, documented).
- [x] Story markdown parsed, ACs extracted, components identified, constraints documented.
- [x] Knowledge base fragments loaded (core): data-factories, component-tdd, test-quality, test-healing-patterns.
- [x] ACs mapped to test levels + priorities (Step 3 table); duplicate coverage avoided.
- [x] Red-phase scaffolds: 25 tests, all `test.skip()`, all `expected_to_fail`, no placeholder assertions.
- [x] Tests deterministic (no `Math.random`; pure functions/literal fixtures).
- [x] Tests isolated, no interdependencies, no hard waits, no cleanup needed (pure logic).
- [x] Frontmatter: `storyId`, `storyKey`, `storyFile`, `atddChecklistPath`, `generatedTestFiles` populated.
- [x] ATDD artifacts linked into story file (`### ATDD Artifacts` under Dev Agent Record).
- [x] Verification: `node --test` **106 total — 81 pass / 0 fail / 25 skipped**; `npx tsc --noEmit` **clean**; web PWA files untouched.
- [x] Temp artifacts: subagent JSON outputs in `/tmp/tea-atdd-*` (workflow convention); persistent checklist in `_bmad-output/test-artifacts/`. No orphaned browser sessions (no browser used).

### Completion Summary

- **Story:** 1.4 — Offline capability, instalável e persistência.
- **Story key:** `1-4-offline-capability-instalavel-e-persistencia`.
- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-1-4-offline-capability-instalavel-e-persistencia.md`.
- **Test files created (6, 25 red-phase scaffolds, all skipped):**
  - `triade/__tests__/storage/schema.test.ts` (9, P0, AC-2)
  - `triade/__tests__/storage/entitlements.test.ts` (6, P0, AC-3)
  - `triade/__tests__/storage/keyspace.test.ts` (5, P0, AC-2/AC-4)
  - `triade/__tests__/storage/storage.purity.test.ts` (1, P1, boundary)
  - `triade/benchmarks/storage.bench.test.ts` (1, P1, T1.2)
  - `triade/__tests__/assets/assetManifest.test.ts` (3, P2, AC-5)
- **Primary test level:** Unit (+ boundary, performance acceptance; manual for native runtime).
- **Key assumptions/risks:**
  - `Settings` schema = theme/reducedMotion/language/laneDefault; `best` is a separate `STORAGE_KEYS` entry (`saveBest()`), not part of the pure schema.
  - Storage JS-layer benchmark budget `< 0.1ms` median is an initial gate — recalibrate after first real measurement (mirror `engine.bench.test.ts` ~100x headroom convention) before relaxing.
  - Native storage runtime (AsyncStorage/MMKV/SecureStore), offline launch, and `App.tsx` hydration/`isNewRecord` wiring are **manual** (project rule) — evidence recorded in the completion note, not CI.
  - `assetManifest.ts` is additive; tile/SFX assets are a build-order dependency (Epic 8/9) — do not fabricate.
  - `mergeEntitlements` contract: `Record<string, boolean>` (true = held). Developer must match this exact shape.
- **Knowledge base applied:** data-factories (literal fixtures, no fabricated data), test-quality (deterministic, isolated, explicit assertions), component-tdd (red→green activation), test-healing-patterns (contract-fix patterns during aggregation).
- **Next recommended workflow:** `gds-dev-story` / `bmad-dev-story` on `_bmad-output/implementation-artifacts/1-4-offline-capability-instalavel-e-persistencia.md` — task-by-task activation of scaffolds (remove `test.skip()`, confirm RED, implement, GREEN). `testarch-automate` comes after implementation.





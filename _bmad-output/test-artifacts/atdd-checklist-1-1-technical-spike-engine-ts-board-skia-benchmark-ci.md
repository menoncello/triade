---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode']
lastStep: 'step-02-generation-mode'
lastSaved: '2026-08-09'
storyId: '1.1'
storyKey: '1-1-technical-spike-engine-ts-board-skia-benchmark-ci'
storyFile: '_bmad-output/implementation-artifacts/1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md'
generatedTestFiles:
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/__tests__/engine/engine.smoke.test.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/benchmarks/engine.bench.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/project-context.md'
  - 'test/game.test.js'
  - 'js/game.js'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist: Story 1.1 — Technical spike (engine TS + board Skia + benchmark CI)

## Step 1: Preflight & Context

### Stack Detection

- `test_stack_type`: `auto` (no explicit value). Auto-detection finds **no web frontend/backend manifests** at `{project-root}` (the PWA is zero-build; the Expo app `triade/` does not exist yet).
- **Detected stack (adapted):** pure-logic engine + benchmark tested with `node:test` on Node 26 (type-strips TS natively). No browser automation is applicable to this story — the Skia board is validated **manually on the physical device** (per story testing standards and `_bmad-output/project-context.md`).
- `test_framework`: `node:test` built-in (command `node --test`, no directory arg). No Playwright/Cypress config exists and none will be added (zero-dep rule applies to the web PWA; the RN app uses `node:test` + Node 26 TS type-stripping).

### TEA Config Flags

- `tea_use_playwright_utils`: `true` — **not applicable** (no web UI surface in this story; device rendering is manual).
- `tea_use_pactjs_utils`: `false` — no contract testing.
- `tea_pact_mcp`: `none`.
- `tea_browser_automation`: `auto` — no browser tests possible (device-only validation).
- `tea_execution_mode`: `auto`.
- `tea_capability_probe`: `true`.

### Story Context

- **Story:** 1.1 — Technical spike: engine TS + board Skia + benchmark CI.
- **Story file:** `_bmad-output/implementation-artifacts/1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md`.
- **ACs (5):**
  1. Port `js/game.js` → `triade/src/engine/core` (TS), 26 existing tests pass unchanged via `node --test`.
  2. Ported engine is pure TS — no RN/React/Skia imports (ADR-01 boundary).
  3. CI benchmark in same PR: engine cost/turn < 2ms, frame-logic worst case < 8ms, deterministic on Node.
  4. One Skia board renders on physical iOS device with real frame rate recorded (baseline p99 < 16.7ms). **Manual validation** (not automated).
  5. Spike result recorded in `game-architecture.md` before greenlighting full UI rewrite.
- **Affected components:** `triade/src/engine/core` (pure TS engine), `triade/__tests__/engine` (ported tests), `triade/benchmarks` (CI benchmark), `.github/workflows/ci.yml` (CI gate), `triade/src/render` (Skia spike board).

### Framework & Existing Patterns

- Existing suite: `test/game.test.js` (26 tests, green on Node 26) with helpers `rngOf(...)`, `staticBoard(row)`, `boardWith(matrix)`, `emptyBoard()`.
- Port target: `triade/__tests__/engine/*.test.ts`, same helpers, `node:test`, no `Math.random`.
- Benchmark budgets from `game-architecture.md` §S1.1: `< 2ms` engine cost/turn, `< 8ms` frame-logic worst case (slide merging 4 locked pairs simultaneously), deterministic (fixed seed).

### Prerequisites Check

- Story approved with clear, testable ACs: **PASS** (ACs 1-3 are automated testable; AC 4 is manual; AC 5 is doc recording).
- Test framework configured: **PASS** — `node:test` built-in (Node 26). This is the project-mandated runner; Playwright/Cypress prerequisites do not apply.
- Development environment: **PASS** — Node v26.0.0 present.

### Notes / Adaptations

- The ATDD two-worker split (API + E2E) does **not** map 1:1 here: there is no HTTP API and no browser UI in this story. Adapted levels: **Unit** (engine behavior port — 26 tests), **Unit/boundary** (ADR-01 purity), **Performance acceptance** (CI benchmark budgets). Device Skia validation stays manual (documented as such, not automated).

---

## Step 2: Generation Mode
<!-- completed -->

### Mode Selection

- `test_generation_mode`: `critical-paths` (default) — the spike already ships the full engine I/O matrix (26 ported unit tests) and the deterministic CI benchmark (2 gates). The automation run closed the remaining gap: a **smoke suite** covering the engine critical path (launch, core gameplay loop, game-over detection).

### Generated Test Files

- `triade/__tests__/engine/game.test.ts` — 26 ported unit tests (identical assertions to `test/game.test.js`); refactored to import shared helpers.
- `triade/__tests__/engine/engine.smoke.test.ts` — 4 smoke tests:
  1. New game returns a playable 4x4 board (9 tiles, valid spawn values).
  2. Core loop: 500 deterministic moves never crash, score never decreases, tile count in bounds, game-over noops.
  3. Game over detected on a full immovable board.
  4. Empty board is never game over.
- `triade/test-utils/helpers.ts` — shared fixtures (`emptyBoard`, `rngOf`, `staticBoard`, `boardWith`, `mulberry32`) extracted from the ported suite and reused by unit + smoke + benchmark (DRY, no `Math.random`).
- `triade/benchmarks/engine.bench.test.ts` — 2 benchmark gates (engine < 2ms/turn; frame-logic worst case < 8ms); refactored to shared `mulberry32`/`emptyBoard`.

### Verification

- `node --test` from `triade/`: **32/32 pass** (26 unit + 4 smoke + 2 benchmark).
- `npx tsc --noEmit`: **clean**.
- Determinism: all randomness via injectable `rng` / seeded `mulberry32`; no `Math.random` in tests.
- ADR-01 confirmed: `src/engine` imports nothing from RN/React/Skia/Expo.
- Out of automation scope (documented, not automated): AC 4 device frame-rate baseline (manual, `useFrameRateBaseline` + physical iOS, T5.2); AC 5 architecture doc record (already written, T6.1).
- Automation summary: `_bmad-output/automation-summary.md`.

### Notes / Deviations

- No integration/E2E level applies: the engine is pure logic (no scenes/levels) and the Skia board is validated manually on device per project testing standards. The ATDD two-worker split (API + E2E) maps to **Unit + Performance acceptance + Smoke** here.
- `test-utils/` sits outside `__tests__` so `node --test` auto-discovery does not count it as a test file (keeps the suite count honest at 32).
- **Trace follow-up (2026-08-09):** ADR-01 boundary is now enforced automatically by `triade/__tests__/engine/engine.purity.test.ts` (2 tests: no forbidden RN/React/Skia/Expo imports; self-contained relative imports only). Suite grew to 39 tests (31 unit + 4 smoke + 2 benchmark + 2 purity), 39/39 green + `tsc --noEmit` clean. This closes the trace gap on AC-2.

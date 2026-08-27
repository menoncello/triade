---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-26'
workflowType: 'testarch-atdd'
storyId: '7.4'
storyKey: '7-4-invariante-preview-nunca-altera-o-spawn'
storyFile: '_bmad-output/implementation-artifacts/7-4-invariante-preview-nunca-altera-o-spawn.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-7-4-invariante-preview-nunca-altera-o-spawn.md'
generatedTestFiles:
  - 'triade/__tests__/game/preview-invariant.test.ts'
  - 'triade/__tests__/engine/pending-spawn-contract.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/7-4-invariante-preview-nunca-altera-o-spawn.md'
  - 'triade/src/game/preview.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/__tests__/game/preview.test.ts'
  - 'triade/__tests__/engine/pending-spawn-contract.test.ts'
---

# ATDD Checklist - Epic 7, Story 7.4: Invariante — preview nunca altera o spawn

**Date:** 2026-08-26
**Author:** Eduardo (TEA / Murat)
**Primary Test Level:** Unit (pure-function projection + engine snapshot invariant) — `previewFor` is a host-testable app-domain module (`triade/src/game/`) and `pendingSpawn` is the immutable engine snapshot (ADR-06). No E2E/API/Component required.

---

## Story Summary

As a developer, I want a hard guarantee that the preview is informational only, so that strategy display can never corrupt the game's randomness. N3 is the law: `pendingSpawn` is pre-resolved by the engine (`newGame` 20 draws, `move` effective 3 draws: cell + next value + displayRoll). `previewFor(pending, availablePot)` **READS** it (`displayRoll < 0.6 ? exact : range via ambiguousRange`), never re-rolls, never calls `resolveSpawn`/`weightedValue`/`spawnTile`. Placed tile always equals `pendingSpawn.value` (place-not-roll).

**As a** developer
**I want** a hard guarantee that the preview is informational only
**So that** strategy display can never corrupt the game's randomness

---

## Acceptance Criteria

1. **AC1 / FR-44 / N3** — Given the preview renderer and the spawn resolver, when any display decision is made (exact `displayRoll < 0.6` or ambiguous `>= 0.6`), then the 60/40 display decision never alters the materialized spawn — the placed tile always equals the pre-resolved `pendingSpawn.value` (N3 invariant).
2. **AC2 / FR-44** — And a unit test asserts the invariant across the full distribution — `exact`, ambiguous-`1/2` (`value 1|2` → range `[1,2]`), ambiguous-`3` (`value 3` with `availablePot=[3]` → `[3]`), and ambiguous-range (`3/6`, `3/6/12` etc. with larger pots) — FR-44.
3. **AC3 / ADR-06** — And undo rewinds the preview with the board — `pendingSpawn` lives in the immutable snapshot so rewinding restores both board and preview together (state-placement master rule).
4. **AC4 / FR-44** — And the preview never influences spawn position, spawn value, or spawn timing — FR-44 (position is directional `candidates`, value is `pendingSpawn.value` place-not-roll, timing is effective-move only).
5. **AC5 / N3** — And changing the display logic requires no change to the spawn resolver — N3 separation: `preview.ts` never imports roll symbols and `spawn.ts`/`game.ts` never import `preview` (structural boundary).

---

## Story Integration Metadata

- **Story ID:** `7.4`
- **Story Key:** `7-4-invariante-preview-nunca-altera-o-spawn`
- **Story File:** `_bmad-output/implementation-artifacts/7-4-invariante-preview-nunca-altera-o-spawn.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-7-4-invariante-preview-nunca-altera-o-spawn.md`
- **Generated Test Files:**
  - `triade/__tests__/game/preview-invariant.test.ts` (NEW — T1, 14 tests)
  - `triade/__tests__/engine/pending-spawn-contract.test.ts` (EXTENDED — T2, +4 tests, now 11 total)

> No BMM `create-story` wrapper exists for this install — `dev-story` should discover scaffolds via the story file's Dev Notes / this checklist. This story is **test-only**: no production change expected (`triade/src/engine` byte-identical, `triade/src/game/preview.ts` byte-identical unless a bug is found).

---

## Stack Detection

- **Config `test_stack_type`:** `auto`
- **Detected stack:** `frontend` (Expo RN — `package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`)
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`, `npm test` inside `triade/`)
- **No Playwright/Cypress:** This story's surface is pure functions + engine snapshot — correct level is **Unit**. E2E/API scaffolds are not applicable (the checklist's subagent orchestration for E2E/API is intentionally skipped; strategy is Unit-only per `test-levels-framework.md`).
- **TEA flags:** `tea_use_playwright_utils: true` (utils exist but not needed for this pure surface), `tea_use_pactjs_utils: false`, `tea_browser_automation: auto`, `tea_execution_mode: auto`

---

## Prerequisites

- [x] Story approved with clear acceptance criteria (5 ACs, FR-44/ADR-06/N3)
- [x] Test framework configured — `triade/package.json` `test` script + `tsconfig.test.json` + `node:test` (existing 396 pass on `main` `70e4fb0`)
- [x] Development environment available (Node 26, `tsx`)
- [x] Existing patterns inspected — `__tests__/game/preview.test.ts` (LADDER derivation, isContiguousSlice), `__tests__/engine/pending-spawn-contract.test.ts` (7 tests, sigmaBound, runSeededSession), `test-utils/helpers.ts` (boardWith, gameState, rngOf, spyRng, stripCommentsAndStrings, extractNamedImports), `ui.norolls.test.ts` (ROLL_SYMBOLS structural guard pattern)

---

## Knowledge Base Fragments Loaded

- **Core:** `data-factories.md` (overrides, no faker — determinism mandatory), `test-quality.md` (execution limits, isolation, green criteria), `test-healing-patterns.md`, `test-levels-framework.md`, `test-priorities-matrix.md`
- **Extended (on-demand):** `component-tdd.md` (not applied — no component render, but purity principle reused)
- **Frontend conditional (skipped — pure):** `selector-resilience.md`, `timing-debugging.md` not needed (no DOM)
- **Backend patterns (applicable — engine purity):** `test-levels-framework.md` (Unit for pure functions), `ci-burn-in.md` (not applied, but `git diff --stat` gate mirrors it)

---

## Generation Mode

**Chosen:** AI Generation (no browser recording). Reason: acceptance criteria are clear and the surface is pure functions (`previewFor`) + engine snapshot (`pendingSpawn`). No UI interaction needs live browser verification. Stack is frontend but the 7.4 invariant is a host-testable app-domain projection (same posture as `matchScore.ts` and `preview.test.ts`). `detected_stack: frontend` would normally allow recording, but `previewFor` has no DOM — recording is dead weight.

---

## Test Strategy

| AC | Scenario | Level | Priority | File | Test Names |
|----|----------|-------|----------|------|------------|
| AC1 | 60/40 display decision never alters materialized spawn — `displayRoll` is read, not consumed; placed tile equals `pendingSpawn.value` across FULL ladder × both branches × directional candidates (left/up) | Unit | P0 | `preview-invariant.test.ts` (T1a,T1b) | `[P0] AC1 sweep ...`, `[P0] AC1 materialization left/up ...` |
| AC2 | FR-44 distribution pins — exact `[1,2]` prefix, `[3]` tier-0 collapse, `[3,6,12]` and `[6,12,24]` pot slices, all via `availablePotValues` | Unit | P0 | `preview-invariant.test.ts` (T1c) | `[P0] AC2 FR-44 ...` (5 pins) |
| AC3 | Undo rewinds preview with board — `pendingSpawn` lives in snapshot (`{...state.pendingSpawn}` shallow copy), `GameState { board, pendingSpawn }` reconstructs deterministically, noop preserves pending, direction-agnostic | Unit | P0 | `pending-spawn-contract.test.ts` (T2) | `[P0] AC3 7.4 isolation ...`, `[P0] AC3 7.4 snapshot carries preview ...`, `[P0] AC3 7.4 noop ...`, `[P0] AC3 7.4 direction-agnostic ...` |
| AC4 | Preview never influences position/value/timing — value pin (identical rng → identical cell/value across displayRolls), position pin (candidates = `shiftLine.moved` opposite-edge, never Preview), timing pin (previewFor 0 draws, effective 3, noop 0 per `types.ts:7-18`) | Unit | P0 | `preview-invariant.test.ts` (T1d) | `[P0] AC4 value/position/timing ...` (3 pins) |
| AC5 | Changing display logic requires no change to spawn resolver — structural boundary (ROLL_SYMBOLS 0 in `preview.ts`, PREVIEW_SYMBOLS 0 in `spawn.ts`/`game.ts`, no `Math.random`), purity (deepEqual, RANGE_1_2 frozen identity, no rng param) | Unit | P0 | `preview-invariant.test.ts` (T1e,T1f) | `[P0] AC5 structural boundary ...`, `[P0] AC5 purity ...` |

**No duplicate coverage** across levels — all scenarios are Unit. E2E/API/Component are intentionally absent (pure function + snapshot, not a user journey nor service contract). Risk: `P1` (invariant — if display corrupts spawn, randomness is broken) — therefore all tests are `P0`.

**Red Phase Requirements:** This story is test-only and the invariant already holds on `main` (7.1–7.3 landed, 396 pass). The 18 new scaffolds are **designated RED** (they would fail if the invariant were violated) but are **GREEN on the current implementation** — this is the correct ATDD signal for a hard invariant: the tests pin the existing correct behavior so a future regression fails. No `test.skip()` is used (same as `preview.test.ts` red-phase approach in 7.3 — true assertions, not skipped scaffolds).

---

## Red-Phase Test Scaffolds Created

> Framework note: this project uses **node:test + tsx** (not Playwright/Cypress). Scaffolds are real assertions (true RED when violated, GREEN when invariant holds) rather than `test.skip()` — `npm test` would exit non-zero if the invariant were broken, which is the intended signal. The 7.1–7.3 baseline stays GREEN, proving no regression.

### Unit Tests — `triade/__tests__/game/preview-invariant.test.ts` (NEW, 14 tests, ~365 lines)

**T1a — Sweep & mutation guard (AC1/AC2)**

- ✅ **Test:** `[P0] AC1 sweep — previewFor never mutates pending and branch kind correct across FULL × displayRoll × POT-only availabilities`
  - **Status:** GREEN (would be RED if `previewFor` mutated `pending` or flipped the `0.6` boundary)
  - **Verifies:** AC1 no-mutation (`structuredClone` deepEqual), branch correctness (`0.2`/`0.5` → `exact`, `0.6`/`0.9` → `range`, boundary `0.599` exact / `0.6` range), and when `range` → `values.includes(pending.value)`. Sweeps `FULL = [1,2,3,6,12,24,48,96]` (derived exactly as `preview.ts:10-16` from `POT_CURVE`) × 4 POT-only availabilities (`[3]`, `[3,6]`, `[3,6,12]`, `POT_LADDER=[3,6,12,24,48,96]`) — never passes `FULL` with `[1,2]` as `availablePot`.
- ✅ **Test:** `[P0] AC2 sweep — range always contains valued truth and is contiguous (FULL × POT-only availabilities)`
  - **Status:** GREEN
  - **Verifies:** AC2 sweep companion — every `range` window contains truth and is a contiguous slice of `FULL` (via `isContiguousSlice` helper reused from `preview.test.ts:19-27`), capped `1..3`.

**T1b — Materialization pin (AC1)**

- ✅ **Test:** `[P0] AC1 materialization left — display decision never alters placed tile (exact and range)`
  - **Status:** GREEN
  - **Verifies:** AC1 place-not-roll via live `move` path: for each `pending` in `FULL` with `displayRoll 0.2` (exact) and `0.9` (range), `state = gameState(boardWith([[1,2,null,null], [], [], []]), pending)`, call `previewFor(pending, availablePot)` **BEFORE** `move(state, 'left', rngOf(0,0.5,0.5))` (3-draw budget), then `trace.find(e=>e.spawned).value === pending.value` and `board[spawned.to]==pending.value`. Covers row `candidates` path (`game.ts:53-64`).
- ✅ **Test:** `[P0] AC1 materialization up — display decision never alters placed tile (directional candidates up)`
  - **Status:** GREEN
  - **Verifies:** Same invariant for column `candidates` (up): board `[[null],[1],[2],[null]]` column, `move` `up` with same `rngOf(0,0.5,0.5)`, same assertions. Proves display decision never alters placed tile for both directional `candidates` paths. (Story spec requires both `left` and `up`.)

**T1c — FR-44 distribution pins (AC2) — 5 explicit cases**

- ✅ **Test:** `[P0] AC2 FR-44 — value 1 ambiguous with [3] yields [1,2]` — `deepEqual [1,2]` + `isContiguousSlice`
- ✅ **Test:** `[P0] AC2 FR-44 — value 2 ambiguous with [3] yields [1,2]`
- ✅ **Test:** `[P0] AC2 FR-44 — value 3 ambiguous with [3] yields [3]`
- ✅ **Test:** `[P0] AC2 FR-44 — value 3 ambiguous with [3,6,12] yields [3,6,12]`
- ✅ **Test:** `[P0] AC2 FR-44 — value 6 ambiguous with [3,6,12,24] yields [6,12,24]`
  - **Status:** All GREEN
  - **Verifies:** AC2 FR-44 exact windows per spec (the full distribution shape).

**T1d — Separation (AC4) — 3 independent pins**

- ✅ **Test:** `[P0] AC4 value — same board and pending.value but different displayRoll yields identical spawn cell and value (displayRoll never flows into spawnTile)`
  - **Status:** GREEN
  - **Verifies:** AC4 value separation: same `boardWith([[1,2,null,null], [], [], []])` + `pending.value=6` with `0.2` vs `0.9` → two `move` calls with **identical** `rngOf(0,0.5,0.5)` produce **identical** `spawn cell` and `value` (displayRoll never reaches `spawnTile:66-88` place-not-roll).
- ✅ **Test:** `[P0] AC4 position — previewFor output never supplies candidates; candidates derived only from shiftLine.moved opposite-edge`
  - **Status:** GREEN
  - **Verifies:** AC4 position separation: `Preview` carries no `to`/`cell`/`position`; `spawnTile` candidates for `left` are `[row, GRID_SIZE-1]` of `shiftLine.moved` lines only (checked via `boardWith([[1,2,null,null], [], [], []])` single moved line → spawn at `[0,3]`).
- ✅ **Test:** `[P0] AC4 timing — previewFor consumes 0 draws by construction; effective move 3 draws, noop 0 draws`
  - **Status:** GREEN
  - **Verifies:** AC4 timing separation: `spy = spyRng(0,0.5,0.5); previewFor(pending, POT_LADDER); assert.equal(spy.calls.length,0)` (previewFor takes no `rng` param `preview.ts:71`, 0 draws by construction), then `move(state,'left',spy) → 3` for effective and `0` for noop (`boardWith([[3,6,12,24],...])` full immovable, `trace.length===16` not `0`).

**T1e — Structural separation pin (AC5)**

- ✅ **Test:** `[P0] AC5 structural boundary — preview.ts never imports roll symbols and never uses Math.random; engine never imports preview`
  - **Status:** GREEN (would be RED if boundary violated)
  - **Verifies:** AC5 N3 separation: `ROLL_SYMBOLS = {resolveSpawn, weightedValue, spawnTile, weightedPicker}` (from `ui.norolls.test.ts:27`) appear **0** times in `preview.ts` stripped source and are not imported from any `engine` specifier; `PREVIEW_SYMBOLS = {previewFor}` and specifier `preview` appear **0** times in `spawn.ts`/`game.ts` stripped source and imports; no `Math.random` in `preview.ts` (via `stripCommentsAndStrings` + `extractNamedImports`, mirror `ui.norolls.test.ts:83-112`).

**T1f — Purity (AC5)**

- ✅ **Test:** `[P0] AC5 purity — previewFor is pure and RANGE_1_2 frozen identity retained`
  - **Status:** GREEN
  - **Verifies:** AC5 purity: same `PendingSpawn + availablePot → deepEqual Preview` across 2 calls, no module-global mutation, `RANGE_1_2 = Object.freeze([1,2])` (`preview.ts:22`) retains stable identity (`strictEqual` for `value 1|2` across calls and across different `availablePot`), not mutated; `previewFor.length` is `1..2` (no `rng` param). No `Math.random` in this test file (uses `rngOf`/`spyRng`/`mulberry32` only).

### Unit Tests — `triade/__tests__/engine/pending-spawn-contract.test.ts` (EXTENDED, +4 tests, now 11 total)

**T2 — Rewind invariant (AC3) — ADR-06, state-placement master rule — no engine change**

- ✅ **Test:** `[P0] AC3 7.4 isolation — shallow-copy keeps snapshot independent; mutating result never rewrites prior history`
  - **Status:** GREEN
  - **Verifies:** AC3 isolation: `state = gameState(staticBoard([1,2,null,null]), {value:1, displayRoll:0})`, `result = move(state,'left',rngOf(0.1,0.2,0.3))` → `state.pendingSpawn` deepEqual before (shallow-copy `{...state.pendingSpawn}` in `game.ts:88`), then `result.pendingSpawn.value=999` never rewrites `state.pendingSpawn`.
- ✅ **Test:** `[P0] AC3 7.4 snapshot carries preview — reconstructing GameState from result deterministically replays next move`
  - **Status:** GREEN
  - **Verifies:** AC3 snapshot carries preview: `GameState { board: result.board, pendingSpawn: result.pendingSpawn }` + `rngOf(0.25,0.35,0.45)` → `deepEqual` next result (proves snapshot carries preview; no hidden state).
- ✅ **Test:** `[P0] AC3 7.4 noop — full immovable board returns pending deepEqual, 0 draws, no spawned entry, trace length 16`
  - **Status:** GREEN
  - **Verifies:** AC3 noop: `boardWith([[3,6,12,24],...])` → `moved:false`, `pendingSpawn` deepEqual input (not live reference), `spyRng()` `calls.length 0`, `trace.filter(e=>e.spawned).length 0` but `trace.length 16` (stationary).
- ✅ **Test:** `[P0] AC3 7.4 direction-agnostic — snapshot carries preview for left (row) and up (column) equally`
  - **Status:** GREEN
  - **Verifies:** AC3 direction-agnostic: runs both `left` (row `[1,2]` board) and `up` (column `[[null],[1],[2],[null]]` board), proves snapshot field works for both directional `candidates` paths.

---

## Data Factories Created

**N/A — no `@faker-js/faker`.** Determinism is a hard requirement (AC5 purity, draw-budget contract). Inputs are built from:

- `pending(value, displayRoll)` helper (local, same as `preview.test.ts`)
- `FULL` / `POT_LADDER` derived from `POT_CURVE` (`Object.keys(POT_CURVE).map(Number).sort(...)` prefixed with `[1,2]`, boundary rule 4)
- `boardWith` / `gameState` / `rngOf` / `spyRng` from `test-utils/helpers.ts` (existing deterministic fixtures)
- `mulberry32` available but not needed (rngOf is sufficient for fixed 3-draw budgets)

No random data; every draw is scripted (`rngOf(0,0.5,0.5)`, `spyRng(...)`).

---

## Fixtures Created

**N/A.** No DB/state lifecycle; `previewFor` is pure value-in/value-out, `pendingSpawn` lives in `GameState` snapshot (already provided by `gameState` helper). Auto-cleanup fixtures would be dead weight. Each test builds its own `Board`/`GameState` locally — no module-level shared board (isolation per `test-quality.md`).

---

## Mock Requirements

**N/A.** No external service. `previewFor`'s second param `availablePotValues` is the live pot tier, but tests pass it explicitly (`[3]`, `[3,6]`, etc.) — no mock. The wiring (`App.tsx` computes `availablePot = potForTier(tierForCeiling(ceilingDetector(board)))` once per render after `if(!ready)` guard) is not mocked; it is verified by existing `hud.previewWiring.test.ts` staying green.

---

## Required data-testid Attributes

**N/A.** No UI change: `PreviewCard.tsx` already joins `range.values` with `/`, `Hud.tsx` keeps receiving the resolved `Preview`. No new `data-testid` needed.

---

## Implementation Checklist

Maps the RED scaffolds to the story's T1–T3. DEV should have no production change — the invariant already holds — but checklist verifies the gates.

### Test: `[P0] AC1/AC2 sweep` + `[P0] AC1 materialization` + `[P0] AC2 FR-44` + `[P0] AC4` + `[P0] AC5` (T1a–f)

**File:** `triade/__tests__/game/preview-invariant.test.ts` (NEW, no production change)

**Tasks to make these tests pass (story T1 — already GREEN on current implementation; if RED, fix separately as `patch` commit):**

- [x] Derive `FULL` and `POT_LADDER` exactly as `preview.ts` does — `[1,2,...Object.keys(POT_CURVE).map(Number).sort((a,b)=>a-b)]` and `FULL.slice(2)` (boundary rule 4 — no scattered literals). Verified `preview-invariant.test.ts:11-16`.
- [x] `RANGE_1_2` stays `Object.freeze([1,2])` with stable identity (`preview.ts:22`) — not mutated. Verified by `[P0] AC5 purity` `strictEqual`.
- [x] `previewFor(pending, availablePot=FULL_POT_LADDER)` stays pure, no `rng`, no `Math.random`, no roll imports. Verified by `[P0] AC5 structural boundary` + `[P0] AC5 purity`.
- [x] Run test: `cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/game/preview-invariant.test.ts`
- [x] ✅ All 14 tests GREEN (would be RED if invariant broken).

**Estimated Effort:** 3–4 h (sweep + materialization + structural guard).

### Test: T2 rewind invariant (AC3)

**File:** `triade/__tests__/engine/pending-spawn-contract.test.ts` (EXTENDED, no engine change)

**Tasks:**

- [x] Add 4 tests with explicit `7.4` labels (`[P0] AC3 7.4 ...`) after the existing 7 tests (total 11). Uses `staticBoard`, `boardWith`, `gameState`, `rngOf`, `spyRng` from `test-utils/helpers.ts` and local `spyRng` helper.
- [x] Keep `game.ts:88` shallow-copy `{...state.pendingSpawn}` (ADR-06) — do not change engine. Verified by `[P0] AC3 7.4 isolation`.
- [x] Run test: `cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/pending-spawn-contract.test.ts`
- [x] ✅ All 11 tests GREEN (4 new + 7 existing).

**Estimated Effort:** 1 h.

### Test: T3 gates & regression guard (AC1–5)

**File:** `triade/` (full suite)

**Tasks:**

- [x] `npm test` inside `triade/` → all green. Baseline on `main` post-12.1 (`70e4fb0`): **396 pass / 0 fail** (was 325 post-7.3 at `50285a3`, grew to 396 with 12.1). This story must not drop below. **Actual post-7.4: 414 pass / 0 fail** (+18).
- [x] `npx tsc --noEmit` (default tsconfig — CI gate) → clean. Also run `npx tsc --noEmit -p tsconfig.test.json` and record; its `TS5101` abort + 3 masked stub-typing errors are **PRE-EXISTING** (waived `deferred-work.md:122-124` from 7-1, 2026-08-24) — only flag **NEW** errors. **Actual: default clean, test-config shows only waived TS5101.**
- [x] `git diff --stat -- triade/src/engine` **must be empty** — engine byte-identical. **Actual: empty.** `triade/src/game/preview.ts` byte-identical unless a bug in the window is found (then fix as separate `patch` commit with review tag, not as part of invariant suite). **Actual: empty.**
- [x] Guard suites stay green **without modification**: `triade/__tests__/ui/ui.norolls.test.ts` (4 roll symbols), `triade/__tests__/ui/ui.thinview.test.ts` (thin view), `triade/__tests__/engine/engine.purity.test.ts` (ADR-01), `triade/__tests__/ui/components/hud.previewWiring.test.ts` (availablePot wiring). **Actual: all green (see npm test).**
- [x] Document in `deferred-work.md` only if a genuine new ledger gap is found; do not close prior entries unless closure empirically verified.

**Estimated Effort:** 0.5 h.

---

## Running Tests

```bash
# Run the 7.4 invariant suite (this story)
cd triade
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/game/preview-invariant.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/pending-spawn-contract.test.ts

# Run a single case by name (node:test --test-name-pattern)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test --test-name-pattern "AC1 materialization" __tests__/game/preview-invariant.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test --test-name-pattern "AC3 7.4" __tests__/engine/pending-spawn-contract.test.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test --test-name-pattern "AC5 structural" __tests__/game/preview-invariant.test.ts

# Run the whole suite (baseline gate, T3)
npm test

# Type-check (CI gate)
npx tsc --noEmit
npx tsc --noEmit -p tsconfig.test.json  # waived TS5101 only

# Gates
git diff --stat -- triade/src/engine  # must be empty
git diff --stat -- triade/src/game/preview.ts  # must be empty unless patch
```

> No headed/debug browser mode applies — this is a `node:test` pure-module suite. (The repo's only browser e2e is `triade/__tests__/e2e/session.e2e.test.ts`, unrelated to 7.4.)

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ Red-phase scaffolds written for all 5 ACs (T1a–f + T2) — 18 tests total (14 new file + 4 extended).
- ✅ Scaffolds are real failing-if-violated assertions (true RED), not `test.skip()` — appropriate for this `node:test` pure-function invariant. They are GREEN on the current correct implementation, which is the expected signal for a hard invariant (pinning existing behavior against future regression).
- ✅ 7.1–7.3 baseline pins remain GREEN (no regression in shared behavior).
- ✅ No factories/fixtures/mocks/data-testids required (pure function + snapshot, no UI change).
- ✅ Implementation checklist created and mapped to story T1–T3.

**Verification:**

- `preview-invariant.test.ts` currently reports 14 passing (exit 0) — would fail if N3 violated (e.g., if `previewFor` mutated `pending` or `move` consumed `displayRoll`).
- `pending-spawn-contract.test.ts` currently reports 11 passing (exit 0) — would fail if ADR-06 shallow-copy or draw budget broken.
- `npm test` overall: 414 pass / 0 fail (was 396 on `main`).
- Activation guidance: no production change expected — the invariant suite proves the separation survives any future display edit.

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. Verify **T1** (`preview-invariant.test.ts`) is green — it already is on `main`. If any case is RED, do not edit tests; fix the production invariant as a separate `patch` commit with review tag (see story Dev Notes: keep `preview.ts` byte-identical unless a bug is found).
2. Verify **T2** (`pending-spawn-contract.test.ts` extensions) is green — they already are.
3. Run **T3** gates (`npm test`, `tsc --noEmit`, engine byte-identical, guard suites green).
4. Check off tasks in the implementation checklist.

**Key Principles:**

- Do not call `resolveSpawn`/`weightedValue`/`spawnTile`/`weightedPicker` from `previewFor` (preserves N3 — enforced by `[P0] AC5 structural boundary` and `ui.norolls.test.ts`).
- `previewFor` consumes **0 draws by construction** (no `rng` param) — pin via subsequent `move`'s `spyRng` count, not by passing rng to preview.
- Keep `RANGE_1_2` `Object.freeze([1,2])` with stable identity (React memo).
- State-placement master rule: *anything undo must revert lives in snapshot* — `pendingSpawn` is snapshot-owned; preview adds zero state.

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

1. Verify full `npm test` green (414).
2. Confirm `git diff --stat -- triade/src/engine` empty and `preview.ts` byte-identical.
3. Confirm guard suites untouched and green (`ui.norolls`, `thinview`, `purity`, `hud.previewWiring`).
4. Update `_bmad-output/implementation-artifacts/deferred-work.md` only with NEW gaps; do not close prior entries unless empirically verified.
5. No scattered ladder literals — sequence still derived from `POT_CURVE`/`potForTier`/`tierForCeiling`.

---

## Next Steps

1. Hand this checklist + `preview-invariant.test.ts` + `pending-spawn-contract.test.ts` extensions to `dev-story` for 7.4 (story is `ready-for-dev`).
2. DEV verifies T1→T2→T3 gates; the 18 invariant pins must stay GREEN without production change.
3. The thin-view boundary and engine purity are independently guarded — this story adds the *hard* N3 invariant that display can never corrupt randomness.
4. When all gates pass, mark story 7.4 done in `sprint-status.yaml`.

---

## Knowledge Base References Applied

- **test-quality.md** — one assertion per test (sweep is one logical assertion: no mutation + branch + containment), determinism, isolation (every pin builds its own `Board`/`PendingSpawn`/`rng`, no shared mutable state).
- **data-factories.md** — adapted: no faker (determinism mandatory); inputs built from `FULL`/`POT_LADDER` + `pending()` helpers mirroring engine config data.
- **test-levels-framework.md / test-priorities-matrix.md** — Unit is the correct level for pure projections + snapshot invariants; all tests `P0` due to N3 criticality (randomness corruption is P1×I3).
- **component-tdd.md / fixture-architecture.md / network-first.md** — NOT applied: this story has no component render, network, or fixture lifecycle (pure function + snapshot, no UI change).
- Project testing standards (from story Dev Notes): `node:test` + `node:assert`; pure-module tests under `__tests__/game/` and `__tests__/engine/`; test names `[P0] AC{n} …`; ESM imports with explicit `.ts` extensions; `strict: true`; no `Math.random`.

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### RED Verification (actually GREEN — invariant already holds)

**Command (T1 suite):**
```bash
cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/game/preview-invariant.test.ts
```

**Results:**
```
✔ [P0] AC1 sweep — previewFor never mutates pending and branch kind correct across FULL × displayRoll × POT-only availabilities (1.93ms)
✔ [P0] AC2 sweep — range always contains valued truth and is contiguous (FULL × POT-only availabilities) (0.18ms)
✔ [P0] AC1 materialization left — display decision never alters placed tile (exact and range) (0.82ms)
✔ [P0] AC1 materialization up — display decision never alters placed tile (directional candidates up) (0.25ms)
✔ [P0] AC2 FR-44 — value 1 ambiguous with [3] yields [1,2] (0.06ms)
✔ [P0] AC2 FR-44 — value 2 ambiguous with [3] yields [1,2] (0.05ms)
✔ [P0] AC2 FR-44 — value 3 ambiguous with [3] yields [3] (0.04ms)
✔ [P0] AC2 FR-44 — value 3 ambiguous with [3,6,12] yields [3,6,12] (0.05ms)
✔ [P0] AC2 FR-44 — value 6 ambiguous with [3,6,12,24] yields [6,12,24] (0.06ms)
✔ [P0] AC4 value — same board and pending.value but different displayRoll yields identical spawn cell and value (0.13ms)
✔ [P0] AC4 position — previewFor output never supplies candidates; candidates derived only from shiftLine.moved opposite-edge (0.10ms)
✔ [P0] AC4 timing — previewFor consumes 0 draws by construction; effective move 3 draws, noop 0 draws (0.14ms)
✔ [P0] AC5 structural boundary — preview.ts never imports roll symbols and never uses Math.random; engine never imports preview (2.32ms)
✔ [P0] AC5 purity — previewFor is pure and RANGE_1_2 frozen identity retained (0.11ms)
ℹ tests 14  pass 14  fail 0  duration_ms ~212
```

**Command (T2 suite):**
```bash
cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/pending-spawn-contract.test.ts
```

**Results:**
```
✔ [P0] AC1 effective move resolves the NEXT pending from the post-merge ceiling; newGame returns an initial resolved pending (draw budget 20) (3.82ms)
✔ [P0] AC2/FR-41 pendingSpawn shares the actual spawn distribution over >=10k effective moves (seeded, 5σ) and every materialization honors N3 (56.00ms)
✔ [P0] AC3/ADR-06 pendingSpawn lives in the snapshot: rewind shape reproduces the identical next result (0.30ms)
✔ [P0] AC3/ADR-06 shallow-copy isolation: mutating a caller pendingSpawn never rewrites history (0.17ms)
✔ [P0] AC4 place-not-roll: spawnTile places exactly the given value (never rolls it); materialized tile equals the pre-resolved pending across the distribution sweep (0.19ms)
✔ [P0] AC5/UX-DR-23 NOOP never re-resolves the preview: pendingSpawn deep-equal to input, 0 rng draws (0.06ms)
✔ [P0] AC4 combined-resolver band edges: a draw landing EXACTLY on a cumulative boundary selects the next band (0.24ms)
✔ [P0] AC3 7.4 isolation — shallow-copy keeps snapshot independent; mutating result never rewrites prior history (0.14ms)
✔ [P0] AC3 7.4 snapshot carries preview — reconstructing GameState from result deterministically replays next move (0.13ms)
✔ [P0] AC3 7.4 noop — full immovable board returns pending deepEqual, 0 draws, no spawned entry, trace length 16 (0.11ms)
✔ [P0] AC3 7.4 direction-agnostic — snapshot carries preview for left (row) and up (column) equally (0.17ms)
ℹ tests 11  pass 11  fail 0  duration_ms ~230
```

**Command (Full suite):**
```bash
cd triade && npm test
```

**Results:**
```
ℹ tests 414  pass 414  fail 0  skipped 0  todo 0  duration_ms ~2466
```

- Total tests: 414
- Passing (GREEN): 414 (396 baseline + 18 new invariant pins)
- RED cases: 0 (would be RED if invariant violated — e.g., `previewFor` mutated `pending`, `displayRoll` altered `spawnTile`, or `pendingSpawn` not in snapshot)
- Status: ✅ Red-phase scaffolds verified (fail-if-violated, currently GREEN because invariant holds — correct for hard invariant)

**Summary:**

- 14 T1 invariant pins + 4 T2 rewind pins are GREEN on the current implementation, proving N3/FR-44/ADR-06 hold without production change.
- The 18 failures that would appear if the invariant were broken are documented above (each would fail on the specific AC's assertion).
- Baseline gates: `npx tsc --noEmit` clean (default), `git diff --stat -- triade/src/engine` empty, guard suites green.

---

## Notes

- **No `test.skip()` used by design:** this is a `node:test` pure-function invariant suite; the intended ATDD signal is a non-zero exit when the invariant is violated (true RED) that stays green while the invariant holds. If the team prefers committed-green scaffolds, keep as-is — this matches the 7.3 precedent and the story's "no production change" expectation.
- **Engine untouched:** `git diff --stat -- triade/src/engine` must stay empty; `triade/src/game/preview.ts` must stay byte-identical unless a bug is found (then fix as separate `patch` commit with review tag). Availability is read via passed `availablePotValues`, not reimplemented.
- **Expo v57 rule:** `triade/AGENTS.md` requires reading https://docs.expo.dev/versions/v57.0.0/ before writing RN code — surfaces here are plain `node:test` TS, no new RN APIs.
- **Why this story is test-only:** 7.3 review (2026-08-25) verified engine byte-identical and all 8 ACs satisfied; hard invariant was explicitly deferred to 7.4 (`7-3-faixa-ambigua-correta.md:22`). 7.2 split taught: keep engine/UI guards (`ui.norolls`, `thinview`, `purity`) untouched — this story adds a *new* invariant suite in `__tests__/game/`, does not edit those guards. Do NOT recreate `src/game/preview.ts` logic in tests beyond deriving ladder from `POT_CURVE`.
- The hard "no re-roll" invariant unit test is owned by **this 7.4**; 7.3 only kept the boundary clean (AC6/AC8 smoke pins). Future display edits (e.g., changing the 60/40 threshold or window content) must keep these 18 pins green.

---

**Generated by BMad TEA Agent** - 2026-08-26

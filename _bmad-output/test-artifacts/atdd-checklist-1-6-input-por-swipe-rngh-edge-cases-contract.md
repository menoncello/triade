---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-18'
storyId: '1.6'
storyKey: '1-6-input-por-swipe-rngh-edge-cases-contract'
storyFile: '_bmad-output/implementation-artifacts/1-6-input-por-swipe-rngh-edge-cases-contract.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-6-input-por-swipe-rngh-edge-cases-contract.md'
generatedTestFiles:
  - 'triade/__tests__/ui/swipe.test.ts'
  - 'triade/__tests__/ui/ui.purity.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-6-input-por-swipe-rngh-edge-cases-contract.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/review-hud-input.md'
  - '_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
  - 'triade/App.tsx'
  - 'triade/package.json'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/ui/orientation.ts'
  - 'triade/__tests__/ui/layout.test.ts'
  - 'triade/__tests__/ui/orientation.test.ts'
  - 'triade/__tests__/ui/ui.purity.test.ts'
  - 'triade/test-utils/helpers.ts'
---

# ATDD Checklist: Story 1.6 — Input por swipe RNGH + edge-cases contract

## Step 1: Preflight & Context

### Stack Detection

- `test_stack_type`: `auto` (no explicit value). Auto-detection finds the Expo RN app manifest (`triade/package.json` with react/react-native) — **frontend** stack. No backend indicators.
- **Detected stack (adapted):** Expo SDK 57 RN app tested with `node:test` on Node 26 (type-strips TS natively). **No Playwright/Cypress** — zero-dep rule for both the web PWA and the RN app (project-standard since S1.1). Gesture/native runtime (Pan recognition, cancel, second-finger, off-board release, pause hit-testing, settle timing) is validated **manually** on the simulator/device (project rule).

### TEA Config Flags

- `tea_use_playwright_utils`: `true` — **not applicable** (no web UI surface; RN device/Node runner only).
- `tea_use_pactjs_utils`: `false` — no contract testing.
- `tea_pact_mcp`: `none`.
- `tea_browser_automation`: `auto` — no browser tests possible.
- `tea_execution_mode`: `auto` → resolvedMode `subagent` (two workers, adapted).
- `tea_capability_probe`: `true`.

### Story Context

- **Story:** 1.6 — Input por swipe RNGH + edge-cases contract.
- **Story file:** `_bmad-output/implementation-artifacts/1-6-input-por-swipe-rngh-edge-cases-contract.md` (status `ready-for-dev`).
- **ACs (6):**
  1. Swipe resolves via RNGH `Gesture.Pan()` with ~20px activation threshold; direction maps to engine `move()` (UX-DR-3). **RNGH wiring = manual; direction resolution = testable.**
  2. Cancelled gesture / system interruption → no move, no spawn, no turn — board stays as it was. **Manual.**
  3. Releasing off the board mid-gesture resolves the swipe as captured (gesture owns the move). **Manual.**
  4. Concurrent second finger ignored (first finger wins); no second `move()` while a swipe or its animation is in flight. **Manual.**
  5. Swipe during an in-flight animation is queued/rejected per the engine `moved:false` contract — never a mid-animation board mutation. **Manual (gate).**
  6. Pause button always reachable during a match (top-right), letting the in-flight swipe settle before freezing (UX-DR-11). **Manual.**
- **Affected components:** `triade/src/ui/swipe.ts` (NEW pure), `triade/App.tsx` (gesture wiring + `busyRef` gate), `triade/src/render/GameBoard.tsx` (optional `onMoveSettled`), `triade/package.json` (`react-native-gesture-handler`), Pinned Version Matrix (docs). Web PWA (`js/*`, `test/game.test.js`) READ-ONLY; `src/engine/core` untouched.
- **Testable surface (this ATDD run):** the pure TS module `swipe.ts` (`SWIPE_THRESHOLD`, `resolveSwipeDirection`) + purity/boundary guard. RNGH gesture wiring and all native edge-case behavior are manual.

### Framework & Existing Patterns

- Baseline: **133 triade tests green** (`node --test` in `triade/`, Node 26) + web PWA 26 frozen. `tsc --noEmit` clean.
- Red-phase scaffold pattern (S1.4/S1.5): value imports of not-yet-existing modules via **variable-specifier dynamic `import(SPEC)`** inside the test body; contract types declared locally; `test.skip(` keeps the suite CI-green until activation.
- Purity guard pattern: `ui.purity.test.ts` scans the named pure UI modules for RN/React/Skia/Expo imports + relative-imports-only. Reused verbatim-style for `swipe.ts` (T2.3). **Adaptation:** the guard now skips modules that do not exist yet (red-phase) so CI stays green until `swipe.ts` ships.
- Determinism: pure functions, literal fixtures, no `Math.random`, no RN imports.
- Direction type pinned from `src/engine/core/types.ts`: `'left' | 'right' | 'up' | 'down'` — `resolveSwipeDirection` returns this (or `null`).

### Prerequisites Check

- Story approved with clear, testable ACs: **PASS** (AC-1 direction-resolution automated at pure layer; AC-2/3/4/5/6 and RNGH wiring are manual).
- Test framework configured: **PASS** — `node:test` built-in (Node 26). Project-mandated runner; Playwright/Cypress prerequisites do not apply.
- Development environment: **PASS** — Node v26.0.0 present, `triade/` suite green at baseline (133).

### Notes / Adaptations

- The ATDD two-worker split (API + E2E) does **not** map 1:1: no HTTP API and no browser UI in this story. Adapted levels: **Unit** (swipe direction resolution: threshold boundary, four directions, diagonal dominant-axis, tie → null, below-threshold → null, custom threshold, purity) and **Unit/boundary** (purity of `swipe.ts`, added to `PURE_MODULES` per T2.3).
- Contract pinned (T2.1/T2.2): `SWIPE_THRESHOLD = 20`; `resolveSwipeDirection({ dx, dy, threshold = SWIPE_THRESHOLD }) → Direction | null`. Dominant axis (largest `|dx|` vs `|dy|`) wins and the sign gives the direction; exact tie → `null` (silent noop); dominant-axis magnitude below threshold → `null`.
- **Not automated:** RNGH `Gesture.Pan()` wiring + `GestureHandlerRootView` (AC-1), cancel/system-interruption (AC-2), off-board release (AC-3), second-finger/first-finger-wins (AC-4), in-flight gate `busyRef` + `onMoveSettled` aggregation (AC-5), pause reachability outside the swipe rect (AC-6), native module linking via prebuild. All manual on simulator/device (project rule). Do NOT add `maxPointers(1)` (contradicts first-finger-wins); RNGH v2 API `onEnd(event, success)` (T3.4.2).
- The engine already rejects noops via `moved:false` — the gate is visual in-flight control in `App`, not an engine refactor. `src/engine/core` untouched.
- Web PWA files READ-ONLY.

---

## Step 2: Generation Mode

### Mode Selection

- `test_generation_mode`: **AI Generation** (default). The testable surface for Story 1.6 is pure TS under `node:test` (`SWIPE_THRESHOLD`, `resolveSwipeDirection`); there is no web UI to record.
- **Recording (optional mode):** skipped. No browser surface exists — RN gesture/native runtime is manual validation on simulator/device (project rule), so `tea_browser_automation: auto` finds nothing to drive with Playwright CLI/MCP. Same adaptation as S1.1–S1.5.

---

## Step 3: Test Strategy

### Acceptance Criteria → Scenarios

| AC | Scenario | Level | Priority |
| -- | -------- | ----- | -------- |
| AC-1 (direction maps to move) | `SWIPE_THRESHOLD` exported and equals 20 | Unit | P0 |
| AC-1 / T2.2 (threshold boundary) | magnitude 19 → null, magnitude 20 → direction (both signs) | Unit | P0 |
| AC-1 / T2.2 (four directions) | `{dx:±25,dy:0}` → right/left; `{dx:0,dy:±25}` → down/up | Unit | P0 |
| AC-1 / T2.2 (diagonal dominant-axis, horizontal) | `{dx:25,dy:10}` → 'right'; `{dx:-25,dy:10}` → 'left' | Unit | P0 |
| AC-1 / T2.2 (diagonal dominant-axis, vertical) | `{dx:-10,dy:-30}` → 'up'; `{dx:10,dy:30}` → 'down' | Unit | P0 |
| T2.2 (exact tie) | `{dx:25,dy:25}` etc. → null (silent noop, UX-DR-23) | Unit | P0 |
| T2.2 (below-threshold diagonal) | `{dx:15,dy:5}` → null; `{dx:-15,dy:-5}` → null | Unit | P0 |
| UX-DR-23 (zero swipe) | `{dx:0,dy:0}` → null | Unit | P1 |
| T2.2 (custom threshold) | `threshold:10` activates |15|; `threshold:20` rejects |15| | Unit | P1 |
| T2.2 (purity) | `resolveSwipeDirection` deterministic across inputs, no state | Unit | P1 |
| ADR-01/05 (boundary) | `swipe.ts` imports nothing from RN/React/Skia/Expo, relative imports only (T2.3) | Unit (boundary) | P1 |
| AC-2/3/4/5/6 native runtime | Cancel/interruption, off-board release, second-finger, in-flight gate + settle aggregation, pause hit-testing, GestureHandlerRootView/`Gesture.Pan` wiring | Manual (simulator/device) | P1 |

### Test Level Selection

- **Unit** (`node:test`, pure TS): `SWIPE_THRESHOLD`, `resolveSwipeDirection` contract (threshold boundary, four directions, diagonal dominant-axis, exact-tie → null, below-threshold → null, custom threshold, purity). Covers AC-1 direction-resolution half + T2.2 + UX-DR-23.
- **Unit/boundary**: `swipe.ts` purity guard (T2.3) — added to `PURE_MODULES`; missing-module skip keeps CI-green red phase.
- **Manual** (not automated): RNGH Pan wiring (`Gesture.Pan`, `activeOffsetX/Y`, `onEnd(event, success)`, `runOnJS`, `GestureHandlerRootView`), cancel/system interruption (AC-2), off-board release (AC-3), second-finger/first-finger-wins (AC-4), in-flight gate + `onMoveSettled` aggregation (AC-5), pause reachability (AC-6), prebuild native linking (T1.3). Documented, not automated (project rule).
- **No E2E/API/Component levels**: no browser UI, no HTTP API, and no RN-component test framework exists (zero-dep; component/gesture behavior is simulator-manual).

### Red Phase Requirements

`src/ui/swipe.ts` **does not exist yet** — scaffolds use variable-specifier dynamic imports inside `test.skip(` so the suite stays CI-green (133 pass / 10 skipped) while the contracts assert expected behavior; activating a scaffold removes `test.skip(` and the dynamic import becomes a real failing import → then GREEN once the module ships. The purity guard tolerates the missing module (skip) until activation (T2.3).

### Notes / Deviations

- No duplicate coverage: direction resolution tested once at Unit level; RNGH wiring + native edge cases are manual, not re-tested.
- No fixtures/factories needed: pure function with literal `{dx, dy, threshold}` inputs; no faker (project zero-dep rule overrides the generic data-factories guidance).
- `Direction` type must stay aligned with `src/engine/core/types.ts` (`'left' | 'right' | 'up' | 'down'`); gesture never implements rules (boundary rule 3, `src/game` only orchestrator).

---

## Step 4/4C: Red-Phase Test Scaffold Generation & Aggregation

### Execution Mode

- `tea_execution_mode`: `auto`, `tea_capability_probe`: `true` → runtime supports subagents → **resolvedMode: `subagent`** (two workers in parallel, adapted).

### Workers

- **Worker A** (`step-04a`, adapted: Unit red-phase — swipe direction resolution): 10 scaffolds in `triade/__tests__/ui/swipe.test.ts`:
  - `SWIPE_THRESHOLD === 20` (AC-1/UX-DR-3).
  - Threshold boundary exact: |19| → null, |20| → direction, both signs (T2.2).
  - All four directions from sign: +dx right, -dx left, +dy down, -dy up (AC-1).
  - Diagonal dominant-axis horizontal: `{dx:25,dy:10}` → 'right'; `{dx:-25,dy:10}` → 'left'.
  - Diagonal dominant-axis vertical: `{dx:-10,dy:-30}` → 'up'; `{dx:10,dy:30}` → 'down'.
  - Exact dominant-axis tie → null (silent noop, no turn).
  - Below-threshold diagonal → null.
  - Zero-magnitude swipe → null (UX-DR-23).
  - Custom `threshold` honored, overrides default.
  - Purity/determinism across inputs (T2.2).
- **Worker B** (`step-04b`, adapted: boundary guard): 1 modification to `triade/__tests__/ui/ui.purity.test.ts` — `swipe.ts` added to `PURE_MODULES` (T2.3); guard skips modules not yet shipped (red-phase) so CI stays green.

### TDD Red Phase Validation — PASS

- All 10 new tests wrapped in `test.skip(`; no placeholder assertions; all `expected_to_fail: true`.
- **CI-green red phase:** value imports of not-yet-existing module via variable-specifier dynamic `import(SPEC)` inside the skipped callbacks; contract types declared locally (no import from absent module); `tsc --noEmit` clean; `node --test` reports 133 pass / 10 skipped. Scaffolds are red on *activation*, not red on *load*.

### Verification

- `node --test` from `triade/`: **143 total — 133 pass, 0 fail, 10 skipped** (skipped = red-phase scaffolds).
- `npx tsc --noEmit`: **clean**.
- Web PWA frozen: `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` untouched. `src/engine/core` untouched.

### Summary

| File | Tests | Priority | Covers |
| ---- | ----- | -------- | ------ |
| `triade/__tests__/ui/swipe.test.ts` | 10 | P0/P1 | AC-1, T2.2, UX-DR-3/23 |
| `triade/__tests__/ui/ui.purity.test.ts` | 1 (modified) | P1 | ADR-01/05 boundary, T2.3 |

**Total: 10 red-phase scaffolds (all skipped) + 1 purity-guard update.**

### Next Steps (Task-by-Task Activation)

During implementation of each task (dev-story), per TDD red-green:

1. Remove `test.skip(` from the test(s) for the current task.
2. Run `node --test` from `triade/` — the activated test must **fail first** (module doesn't exist / behavior absent).
3. Implement the module (`swipe.ts` — pure, no RN/Expo imports, `SWIPE_THRESHOLD = 20`, dominant-axis tie-break); the test turns green.
4. Keep `tsc --noEmit` green and the whole suite green; commit passing tests.
5. Native/gesture behavior (RNGH Pan wiring, cancel, second-finger, off-board release, in-flight gate, pause hit-testing) is validated manually on the simulator/device (T4.2) — record evidence in the completion note.

---

## Step 5: Validate & Complete

### Validation

- [x] Story approved with clear testable ACs (6).
- [x] Development environment ready (Node 26, `triade/` baseline green at 133).
- [x] Framework configured — `node:test` built-in (project-mandated; Playwright/Cypress adapted to N/A, documented).
- [x] Story markdown parsed, ACs extracted, components identified, constraints documented.
- [x] Knowledge base fragments loaded (core): data-factories, component-tdd, test-quality, test-healing-patterns.
- [x] ACs mapped to test levels + priorities (Step 3 table); duplicate coverage avoided.
- [x] Red-phase scaffolds: 10 tests, all `test.skip()`, all `expected_to_fail`, no placeholder assertions.
- [x] Tests deterministic (no `Math.random`; pure functions/literal fixtures).
- [x] Tests isolated, no interdependencies, no hard waits, no cleanup needed (pure logic).
- [x] Frontmatter: `storyId`, `storyKey`, `storyFile`, `atddChecklistPath`, `generatedTestFiles` populated.
- [x] ATDD artifacts linked into story file (`### ATDD Artifacts` under Dev Agent Record).
- [x] Verification: `node --test` **143 total — 133 pass / 0 fail / 10 skipped**; `npx tsc --noEmit` **clean**; web PWA files untouched; `src/engine/core` untouched.
- [x] Temp artifacts: workflow convention honors subagent JSON outputs; persistent checklist in `_bmad-output/test-artifacts/`. No orphaned browser sessions (no browser used).

### Completion Summary

- **Story:** 1.6 — Input por swipe RNGH + edge-cases contract.
- **Story key:** `1-6-input-por-swipe-rngh-edge-cases-contract`.
- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-1-6-input-por-swipe-rngh-edge-cases-contract.md`.
- **Test files created/updated (2):**
  - `triade/__tests__/ui/swipe.test.ts` (NEW, 10 red-phase scaffolds, all skipped, P0/P1, AC-1/T2.2/UX-DR-3/23)
  - `triade/__tests__/ui/ui.purity.test.ts` (MODIFIED — `swipe.ts` added to `PURE_MODULES`; missing-module skip, P1, ADR-01/05/T2.3)
- **Primary test level:** Unit (+ boundary; manual for RN/native runtime).
- **Key assumptions/risks:**
  - Contract: `SWIPE_THRESHOLD = 20`; `resolveSwipeDirection({ dx, dy, threshold = SWIPE_THRESHOLD }) → Direction | null`. Dominant axis (largest `|dx|` vs `|dy|`) wins; sign gives direction; exact tie → `null`; dominant-axis magnitude < threshold → `null`. `swipe.ts` is pure (no RN/Expo imports) — `App.tsx`/`GameBoard.tsx` are NOT pure and are exempt from the guard.
  - RNGH v2 API confirmed for SDK 57 (`~2.32.0`): `Gesture.Pan()` with `activeOffsetX/Y([-20,20])`, `onEnd(event, success)` where `success:false` = cancelled (AC-2), `.runOnJS(true)`; **do not** add `maxPointers(1)` (cancels the first finger — contradicts AC-4 first-finger-wins).
  - The in-flight gate (AC-4/5) is visual control in `App` (`busyRef` set only on `moved:true` + `onMoveSettled` aggregation from `GameBoard`) — engine already rejects noops via `moved:false`; no engine refactor.
  - Gesture/native behavior (recognition, cancel, second-finger, off-board release, pause hit-testing, settle timing, native linking) is **manual** — evidence recorded in the completion note, not CI.
  - Do not pull forward: pause state (Epic 6), numerals legibility (1.7), adaptive spawn (Epic 2).
- **Knowledge base applied:** data-factories (literal fixtures, no fabricated data), test-quality (deterministic, isolated, explicit assertions), component-tdd (red→green activation), test-healing-patterns (variable-specifier dynamic-import pattern for CI-green red phase, from S1.4/S1.5).
- **Next recommended workflow:** `gds-dev-story` / `bmad-dev-story` on `_bmad-output/implementation-artifacts/1-6-input-por-swipe-rngh-edge-cases-contract.md` — task-by-task activation of scaffolds (remove `test.skip()`, confirm RED, implement, GREEN). `testarch-automate` comes after implementation.
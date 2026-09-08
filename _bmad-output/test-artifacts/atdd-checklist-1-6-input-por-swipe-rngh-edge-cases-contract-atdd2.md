---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-06'
workflowType: 'testarch-atdd'
storyId: '1.6'
storyKey: '1-6-input-por-swipe-rngh-edge-cases-contract'
storyFile: '_bmad-output/implementation-artifacts/1-6-input-por-swipe-rngh-edge-cases-contract.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-6-input-por-swipe-rngh-edge-cases-contract-atdd2.md'
generatedTestFiles:
  - 'triade/__tests__/ui/swipe-gate.atdd.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-6-input-por-swipe-rngh-edge-cases-contract.md'
  - '_bmad-output/test-artifacts/atdd-checklist-1-6-input-por-swipe-rngh-edge-cases-contract.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-1-6-input-por-swipe.md'
  - '_bmad/tea/config.yaml'
  - 'triade/src/ui/swipe.ts'
  - 'triade/App.tsx'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/__tests__/ui/swipe.test.ts'
  - 'triade/__tests__/ui/ui.gesture.test.ts'
  - 'triade/__tests__/ui/ui.purity.test.ts'
---

# ATDD Checklist - Epic 1, Story 1.6: Input por swipe RNGH + edge-cases contract (ATDD-2)

**Date:** 2026-09-06
**Author:** Eduardo
**Primary Test Level:** Unit (+ boundary; manual for RN/native runtime)
**Run scope:** second ATDD pass (`tea.atdd-2`). Working tree carries **no production diff** — only orchestrator-owned `sprint-status.yaml` bookkeeping (untouched per instructions) plus test-design progress notes. Assessment targets the shipped contract at `final_revision d7ee643` (story state `awaiting-operator`, D-008 zero-drift pass).

---

## Story Summary

Reliable swipe input that never loses a move: RNGH `Gesture.Pan()` with a ~10px activation threshold resolves direction via a pure module, and an in-flight gate plus edge-case contract (cancel, off-board release, second finger, early-input release, pause reachability) keeps behavior predictable under interruptions.

**As a** player
**I want** reliable swipe input that never loses a move
**So that** my swipes always resolve predictably, even under interruptions.

---

## Acceptance Criteria

1. Swipe resolves via RNGH `Gesture.Pan()` with ~10px threshold; direction maps to engine `move()` (UX-DR-3). **Direction resolution automated; wiring manual.**
2. Cancelled gesture / system interruption → no move, no spawn, no turn; board unchanged. **Manual.**
3. Release off the board mid-gesture resolves as captured (gesture owns the move). **Manual.**
4. No second `move()` while a swipe or its animation is in flight (in-flight gate); first-finger-wins is a manual device-validation item (D1, native default `maxPointers=10`). **Gate partially automated by this run; multi-touch manual.**
5. Swipe during the closed gate window (~30% of max anim, `EARLY_INPUT_MS`=84) is rejected silently, accepted once open with forward retarget; no mutation while closed. **Gate automated by this run; timing feel manual.**
6. Pause button always reachable top-right, never in the swipe rect. **Manual.**

---

## Story Integration Metadata

- **Story ID:** `1.6`
- **Story Key:** `1-6-input-por-swipe-rngh-edge-cases-contract`
- **Story File:** `_bmad-output/implementation-artifacts/1-6-input-por-swipe-rngh-edge-cases-contract.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-1-6-input-por-swipe-rngh-edge-cases-contract-atdd2.md` (this file; the original `atdd-checklist-1-6-....md` from 2026-08-18 is left untouched)
- **Generated Test Files:** `triade/__tests__/ui/swipe-gate.atdd.test.ts`

---

## Red-Phase Test Scaffolds Created

### Unit Tests (4 tests, all `test.skip()`)

**File:** `triade/__tests__/ui/swipe-gate.atdd.test.ts` (76 lines)

Covers the one known automation gap for the working-tree scope: the `busyRef` gate state machine (deferred Df1 / proposed `1.6-PROP-001`), expressed against a not-yet-existing pure module `src/ui/swipeGate.ts` so activation fails RED (`ERR_MODULE_NOT_FOUND`) until the gate is extracted to a pure module.

- ✅ **Test:** noop move result never arms the gate
  - **Status:** RED (skipped) - `src/ui/swipeGate.ts` does not exist; activated import fails `ERR_MODULE_NOT_FOUND`
  - **Verifies:** `moved:false` leaves the gate open (deadlock guard, AC-4/AC-5)
- ✅ **Test:** effective move arms the gate
  - **Status:** RED (skipped) - same missing-module failure
  - **Verifies:** `moved:true` closes the gate; next swipe decides `reject` (AC-4/AC-5)
- ✅ **Test:** settle signal re-opens the gate (early-input release)
  - **Status:** RED (skipped) - same missing-module failure
  - **Verifies:** settle opens the gate; next swipe decides `accept` (AC-5)
- ✅ **Test:** gate idempotent — noop after effective keeps it armed until settle
  - **Status:** RED (skipped) - same missing-module failure
  - **Verifies:** noop neither releases an armed gate early nor deadlocks it (AC-4/AC-5)

### Pre-existing green coverage (not regenerated, verified this run)

- `triade/__tests__/ui/swipe.test.ts` — 10 tests, AC-1 direction contract (threshold 9/10, four dirs, diagonals, tie→null, below-threshold→null, zero→null, custom threshold, purity). **12/12 incl. gesture+purity pass this run.**
- `triade/__tests__/ui/ui.gesture.test.ts` — 1 static tripwire, wiring references `SWIPE_THRESHOLD` at 10px.
- `triade/__tests__/ui/ui.purity.test.ts` — boundary guard, `swipe.ts` scanned, fails hard on unreadable entry.

### E2E / API / Component Tests

N/A — no browser UI, no HTTP API, no RN-component test framework (zero-dep project rule). Gesture/native runtime (Pan wiring, cancel, second-finger, off-board release, pause hit-testing, settle timing) is manual on simulator/device per project rule; the 7 `operator_actions` remain pending (`awaiting-operator`).

---

## Data Factories Created

N/A — pure functions with literal `{dx, dy, threshold}` / `{moved}` inputs. No faker (project zero-dep rule overrides generic factory guidance), same adaptation as the 2026-08-18 run.

---

## Fixtures Created

N/A — no setup/teardown or shared state needed (pure logic, isolated per test).

---

## Mock Requirements

N/A — no external services in the input path (offline, no auth/data/backend).

---

## Required data-testid Attributes

N/A — no new UI surface in this run's scope. AC-6 pause reachability is a manual hit-testing check (gesture wraps board container only; `Hud` `zIndex:1` above it).

---

## Implementation Checklist

### Test: noop move result never arms the gate

**File:** `triade/__tests__/ui/swipe-gate.atdd.test.ts`

**Tasks to make this test pass:**

- [ ] Extract the gate decision to a pure module `triade/src/ui/swipe.ts` sibling, e.g. `triade/src/ui/swipeGate.ts` (no RN/Expo imports): `createSwipeGate()`, `reportMoveResult(gate, {moved})`, `reportSettled(gate)`, `decideSwipe(gate) → 'accept' | 'reject'`, `isBusy(gate)`
- [ ] Encode the deadlock guard: `reportMoveResult` with `moved:false` never sets busy
- [ ] Wire `App.tsx` `busyRef`/`doMove` through the pure module (thin adapter; keep `runOnJS`/timer behavior unchanged)
- [ ] Add `swipeGate.ts` to `PURE_MODULES` in `triade/__tests__/ui/ui.purity.test.ts`
- [ ] Remove `test.skip(` for this test, confirm RED first (`ERR_MODULE_NOT_FOUND` before the module ships), then GREEN
- [ ] Run test: `node --test __tests__/ui/swipe-gate.atdd.test.ts` from `triade/`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1-2 hours (extraction + wiring + review)

---

### Test: effective move arms the gate

**File:** `triade/__tests__/ui/swipe-gate.atdd.test.ts`

**Tasks to make this test pass:**

- [ ] Encode: `reportMoveResult` with `moved:true` sets busy; `decideSwipe` returns `reject` while busy
- [ ] Keep REJECT-not-queue semantics (architecture lean: no message queue)
- [ ] Remove `test.skip(` for this test, confirm RED, implement, GREEN
- [ ] Run test: `node --test __tests__/ui/swipe-gate.atdd.test.ts` from `triade/`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** included above (same module)

---

### Test: settle signal re-opens the gate

**File:** `triade/__tests__/ui/swipe-gate.atdd.test.ts`

**Tasks to make this test pass:**

- [ ] Encode: `reportSettled` clears busy (models the `GameBoard` early-input timer firing at ~30% / 84ms)
- [ ] Keep the `GameBoard` timer as the settle source; the pure module only holds state
- [ ] Remove `test.skip(` for this test, confirm RED, implement, GREEN
- [ ] Run test: `node --test __tests__/ui/swipe-gate.atdd.test.ts` from `triade/`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** included above (same module)

---

### Test: gate idempotent (noop after effective)

**File:** `triade/__tests__/ui/swipe-gate.atdd.test.ts`

**Tasks to make this test pass:**

- [ ] Encode: noop while armed leaves busy set; a later `reportSettled` still releases
- [ ] Guard the `moved ⟺ plan.length>0` invariant at the adapter (effective with empty plan must not arm forever — Df1 regression guard)
- [ ] Remove `test.skip(` for this test, confirm RED, implement, GREEN
- [ ] Run full suite: `node --test` from `triade/` + `npx tsc --noEmit` clean
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** included above (same module)

---

## Running Tests

```bash
# Run the new red-phase scaffolds (skipped until activation)
node --test __tests__/ui/swipe-gate.atdd.test.ts

# Run the story's automated input contract (green)
node --test __tests__/ui/swipe.test.ts __tests__/ui/ui.gesture.test.ts __tests__/ui/ui.purity.test.ts

# Full suite + types
node --test
npx tsc --noEmit
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All tests written as red-phase scaffolds with `test.skip()`
- ✅ Fixtures and factories N/A with reason (pure logic, zero-dep rule)
- ✅ Mock requirements N/A with reason (offline input path)
- ✅ data-testid requirements N/A with reason (no new UI surface)
- ✅ Implementation checklist created

**Verification:**

- New file present with 4 `test.skip()` scaffolds, no placeholder assertions
- `node --test __tests__/ui/swipe-gate.atdd.test.ts`: 4 skipped, 0 fail
- RED proof: activating the import fails `ERR_MODULE_NOT_FOUND` (missing `src/ui/swipeGate.ts`)
- `npx tsc --noEmit` clean; combined input-contract run 12 pass / 4 skipped / 0 fail
- No production code touched; `sprint-status.yaml` untouched (orchestrator-owned)

---

### GREEN Phase (DEV Team - Next Steps)

1. Pick one scaffolded test from the implementation checklist (start with noop-never-arms)
2. Remove `test.skip()` for that test and confirm it fails first (`ERR_MODULE_NOT_FOUND`)
3. Implement the pure `swipeGate.ts` module minimally for that test
4. Run the test to verify green; check off the task
5. Repeat per test; keep `tsc` + full suite green

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

1. Verify all tests pass; review the extracted module for quality
2. Keep the `App.tsx` adapter thin (wiring only, no rules)
3. Run tests after each change; do not change test behavior
4. Update `deferred-work.md` Df1 (close or re-scope) when the gate is covered

---

## Next Steps

1. Story file is `awaiting-operator` — do NOT flip status here; the 7 manual gesture checks stay with Eduardo
2. Optional follow-up (not an exit gate): implement `swipeGate.ts` per the checklist to close Df1/PROP-001
3. Begin GREEN using the checklist one test at a time (red → green each)
4. Manual validation remains human-only: 4-directions, sub-threshold, cancel, off-board, second finger (physical device), rapid-gate, pause reachability

---

## Knowledge Base References Applied

- **test-quality.md** - Given-When-Then, one assertion focus per test, determinism, isolation
- **data-factories.md** - literal fixtures applied (no fabricated data; faker N/A per zero-dep rule)
- **component-tdd.md** - red→green activation guidance
- **test-healing-patterns.md** - variable-specifier dynamic-import pattern for CI-green red phase (from S1.4/S1.5/S1.6)
- **test-levels-framework.md** - unit-first for pure logic, no duplicate coverage across levels
- **test-priorities-matrix.md** - P2 for the deferred gate gap (follow-up, not exit gate)

---

## Test Execution Evidence

### Initial Scaffold Review / RED Verification

**Command:** `node --test __tests__/ui/swipe.test.ts __tests__/ui/ui.gesture.test.ts __tests__/ui/ui.purity.test.ts __tests__/ui/swipe-gate.atdd.test.ts` (from `triade/`)

**Results:**

```
pass 12, fail 0, skipped 4 (new scaffolds), duration ~0.15s
```

**RED proof (activated import of the not-yet-existing module):**

```
RED-OK: ERR_MODULE_NOT_FOUND
```

**Types:** `npx tsc --noEmit` clean (exit 0).

**Summary:**

- Total tests: 16 (12 existing green + 4 new skipped)
- Skipped: 4 (expected before activation)
- Activated RED tests: proven failing via missing-module import (`ERR_MODULE_NOT_FOUND`)
- Passing: 12 before implementation (pre-existing shipped contract, untouched)
- Status: ✅ Red-phase scaffolds verified

---

## Notes

- Working tree carries no production diff (D-008 zero-drift): this run adds test-only scaffolds for the known Df1 gap rather than re-scaffolding the shipped `swipe.ts` contract.
- `sprint-status.yaml` was neither written nor reverted (orchestrator-owned).
- Web PWA (`js/*`, `test/game.test.js`) and `src/engine/core` untouched (frozen).
- RNGH stays pinned `~2.32.0` v2 API (`onEnd(event, success)`); any v3 upgrade re-opens R-006/T3.4.2.

---

**Generated by BMad TEA Agent** - 2026-09-06

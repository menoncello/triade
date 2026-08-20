---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-20'
workflowType: 'testarch-atdd'
storyId: '2.1'
storyKey: '2-1-deteccao-de-teto-de-spawn'
storyFile: '_bmad-output/planning-artifacts/epics.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-2-1-deteccao-de-teto-de-spawn.md'
generatedTestFiles:
  - 'test/spawn-ceiling.test.js'
inputDocuments:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/project-context.md'
  - 'test/game.test.js'
---

# ATDD Checklist - Epic 2, Story 2.1: Detecção de teto de spawn (spawn ceiling)

**Date:** 2026-08-20
**Author:** Eduardo
**Primary Test Level:** Unit (pure function, `node:test`)

---

## Story Summary

Players feel the signature mechanic: the pot of tiles ≥3 opens as the board's largest tile grows, with fixed 1/2 weights at 40/40 and a configurable curve. Story 2.1 delivers the **spawn ceiling detection**: a pure function that derives the current ceiling (largest tile on the board) and maps it to a pot tier.

**As a** player
**I want** the game to open bigger pieces as my largest tile grows
**So that** the late game grows with my mastery instead of grinding small tiles

---

## Acceptance Criteria

1. Given a board state, when the spawn ceiling is computed, the ceiling is the largest tile value currently on the board.
2. The ceiling maps to a tier via a pure `ceilingDetector` function (N1), returning the correct pot tier for `<48`, `≥48`, `≥96`, `≥192`, `≥384`, `≥768`, and doubling thereafter.
3. The ceiling is derived from the board in the immutable snapshot, so undo rewinds it with the board (ADR-06).
4. An empty-board edge case returns the `<48` tier (pot = 100% `3`).

---

## Story Integration Metadata

- **Story ID:** `2.1`
- **Story Key:** `2-1-deteccao-de-teto-de-spawn`
- **Story File:** `_bmad-output/planning-artifacts/epics.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-2-1-deteccao-de-teto-de-spawn.md`
- **Generated Test Files:** `test/spawn-ceiling.test.js`

---

## Red-Phase Test Scaffolds Created

### Unit Tests (15 tests)

**File:** `test/spawn-ceiling.test.js` (121 lines)

All tests assert EXPECTED behavior and currently FAIL because `game.ceilingDetector` is not yet implemented in `js/game.js` (TDD RED phase). Run `node --test` to verify.

- ✅ **Test:** CEILING_EMPTY
  - **Status:** RED - `game.ceilingDetector is not a function`
  - **Verifies:** empty board → `ceiling === 0`
- ✅ **Test:** CEILING_MAX_TILE
  - **Status:** RED - `game.ceilingDetector is not a function`
  - **Verifies:** ceiling equals largest tile (24)
- ✅ **Test:** CEILING_MAX_TILE_LARGE
  - **Status:** RED
  - **Verifies:** ceiling tracks large tiles (768)
- ✅ **Test:** CEILING_PURE_IMMUTABLE
  - **Status:** RED
  - **Verifies:** board snapshot is not mutated (ADR-06 immutability)
- ✅ **Test:** CEILING_DETERMINISTIC
  - **Status:** RED
  - **Verifies:** repeated calls return identical result (pure function)
- ✅ **Test:** TIER_LT48_BOUNDARY
  - **Status:** RED
  - **Verifies:** ceiling 47 → tier `'<48'`
- ✅ **Test:** TIER_GE48_LOWER
  - **Status:** RED
  - **Verifies:** ceiling 48 → tier `'>=48'`
- ✅ **Test:** TIER_GE48_UPPER
  - **Status:** RED
  - **Verifies:** ceiling 95 → tier `'>=48'`
- ✅ **Test:** TIER_GE96
  - **Status:** RED
  - **Verifies:** ceilings 96, 191 → tier `'>=96'`
- ✅ **Test:** TIER_GE192
  - **Status:** RED
  - **Verifies:** ceilings 192, 383 → tier `'>=192'`
- ✅ **Test:** TIER_GE384
  - **Status:** RED
  - **Verifies:** ceilings 384, 767 → tier `'>=384'`
- ✅ **Test:** TIER_GE768
  - **Status:** RED
  - **Verifies:** ceilings 768, 1535 → tier `'>=768'`
- ✅ **Test:** TIER_DOUBLING
  - **Status:** RED
  - **Verifies:** tiers double beyond 768 (`>=1536`, `>=3072`, `>=6144`)
- ✅ **Test:** TIER_EMPTY
  - **Status:** RED
  - **Verifies:** empty board returns the `'<48'` tier
- ✅ **Test:** TIER_POT_LT48
  - **Status:** RED
  - **Verifies:** `'<48'` tier maps to pot `[3]` (100% 3, Story 2.1 edge case)

---

## Data Factories / Fixtures

Not required. Tests reuse the existing helpers (`emptyBoard`, `boardWith`) already established in `test/game.test.js`, declared locally in `test/spawn-ceiling.test.js` for isolation.

---

## Mock Requirements

None. `ceilingDetector` is a pure, synchronous function with no external dependencies.

---

## Required data-testid Attributes

None (engine logic only; UI is validated manually per project rules).

---

## Implementation Checklist

### Function: `game.ceilingDetector(board)`

**File:** `test/spawn-ceiling.test.js` (red until implemented in `js/game.js`)

**Tasks to make these tests pass:**
- [ ] Add pure `ceilingDetector(board)` to `js/game.js` and export via the UMD `window.ThreeGame`/`module.exports` surface.
- [ ] Compute `ceiling` = largest tile value on the board (0 when the board is empty).
- [ ] Map `ceiling` to a `tier` string using thresholds: `'<48'` (`<48`), `'>=48'` (`48–95`), `'>=96'` (`96–191`), `'>=192'` (`192–383`), `'>=384'` (`384–767`), `'>=768'` (`768–1535`), then doubling (`'>=1536'`, `'>=3072'`, …).
- [ ] Keep the function pure: derive the ceiling from the passed board snapshot only (no global state), so undo rewinds it with the board (ADR-06); do not mutate the input board.
- [ ] Return `{ ceiling, tier }`.
- [ ] Ensure the `'<48'` tier is the empty-board edge case (pot = 100% `3`; pot distribution for higher tiers is owned by Story 2.3).
- [ ] Run `node --test`; confirm the 15 new tests pass (green) and the existing suite stays green (188 passing).

**Estimated Effort:** ~1–2 hours

---

## Running Tests

```bash
# Run full suite (existing green + new red scaffolds)
node --test

# Run only this story's scaffold
node --test test/spawn-ceiling.test.js
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ 15 unit tests written as red-phase scaffolds (fail because `ceilingDetector` is unimplemented)
- ✅ Pure-function behavior covered: ceiling detection, tier thresholds, doubling, empty-board edge, immutability/determinism
- ✅ Documented pot mapping for the `<48` tier (`[3]`)
- ✅ Existing 188 tests remain green

**Verification:** `node --test` → 188 pass / 15 fail; all failures are `game.ceilingDetector is not a function` (missing implementation, not test bugs).

### GREEN Phase (DEV Team - Next Steps)

1. Implement `ceilingDetector` in `js/game.js` per the implementation checklist.
2. Run `node --test`; confirm the 15 tests turn green.
3. Keep the existing suite green.

### REFACTOR Phase (DEV Team - After All Tests Pass)

1. Verify all tests pass.
2. Review for readability/maintainability against `docs/` conventions.
3. Ensure `js/game.js` stays the single source of truth for game rules (no duplicated logic in `ui.js`).

---

## Next Steps

1. Hand off `test/spawn-ceiling.test.js` and this checklist to the `dev-story` workflow for Story 2.1.
2. Implement `ceilingDetector` (GREEN), then proceed to Stories 2.2 (fixed 40/40 weights) and 2.3 (pot tiering).
3. After implementation, run `automate` to extend coverage if needed.

---

## Knowledge Base References Applied

Adapted from the bmad-testarch-atdd knowledge fragments to this repo's `node:test` conventions:
- `test-quality.md` - determinism, isolation, one behavior per test (Given-When-Then in comments)
- `test-levels-framework.md` - backend/pure-function → Unit level, no E2E

Project conventions applied from `project-context.md`:
- `node:test` + `node:assert`, exact command `node --test`
- Deterministic tests; no `Math.random` (RNG injectable where relevant — not needed here since detection is pure)
- Game rules live only in `js/game.js`; preserve UMD export

---

## Test Execution Evidence

### RED Verification

**Command:** `node --test`

**Results (summary):**

```
ℹ tests 203
ℹ pass 188
ℹ fail 15
```

**Summary:**
- Total tests: 203 (188 existing green + 15 new red)
- Passing before implementation: 188 (existing engine suite)
- Failing (RED): 15 (all `game.ceilingDetector is not a function`)
- Status: ✅ Red-phase scaffolds verified

**Expected Failure Messages:**
- All 15 tests: `TypeError: game.ceilingDetector is not a function`

---

## Notes

- This skill's default targets Playwright/API/E2E with `test.skip()` scaffolds. It was adapted to this repo's `node:test` backend-style convention: red-phase = genuinely failing (not skipped) unit tests, since the committed suite is expected to stay green except during active feature development.
- The pot distribution for tiers above `<48` (values, weights) is intentionally out of scope for Story 2.1 and owned by Stories 2.2/2.3; only the `<48` → `[3]` mapping is asserted here per AC #4.
- No TEA `config.yaml` / Playwright / faker present in this project; framework auto-detection resolved to backend/unit.

---

**Generated by BMad TEA Agent** - 2026-08-20

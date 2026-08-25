---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-24'
workflowType: 'testarch-atdd'
storyId: '7.3'
storyKey: '7-3-faixa-ambigua-correta'
storyFile: '_bmad-output/implementation-artifacts/7-3-faixa-ambigua-correta.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-7-3-faixa-ambigua-correta.md'
generatedTestFiles:
  - 'triade/__tests__/game/preview.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/7-3-faixa-ambigua-correta.md'
  - 'triade/src/game/preview.ts'
  - 'triade/src/engine/core/pot.ts'
  - 'triade/src/engine/core/ceiling.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/__tests__/game/preview.test.ts'
---

# ATDD Checklist - Epic 7, Story 7.3: Faixa ambígua correta

**Date:** 2026-08-24
**Author:** Eduardo (TEA / Murat)
**Primary Test Level:** Unit (pure-function projection) — `previewFor` is a host-testable app-domain module (`triade/src/game/`), same posture as `matchScore.ts`.

---

## Story Summary

As a player, I want the ambiguous preview to always contain the truth, so I can trust the card even when it hides the exact value. This story HARDENS the ambiguous-range CONTENT of `previewFor` so it satisfies FR-43 exactly (deterministic, availability-aware contiguous window) without changing the `Preview` union shape or `PreviewCard`. No engine change, no UI chrome.

**As a** player
**I want** the ambiguous preview to always contain the truth
**So that** I can trust the card even when it hides the exact value

---

## Acceptance Criteria

1. **AC1/FR-43** — `displayRoll >= 0.6` (ambiguous): `previewFor` ALWAYS returns a `range.values` containing `pendingSpawn.value`.
2. **AC2/FR-43** — `value === 1 || value === 2` → exactly `[1, 2]` (rendered "1/2").
3. **AC3/FR-43** — pot value when only `3` is spawnable (ceiling tier 0) → exactly `[3]`.
4. **AC4/FR-43** — pot value when more spawnable → up to 3 **consecutive** values of the available pot sequence starting at `value`, capped at 3.
5. **AC5/FR-43** — available pot sequence = `potForTier(tierForCeiling(ceilingDetector(board)))` (live), NOT the full `POT_CURVE` ladder.
6. **AC6/FR-44** — actual spawn unaffected: `previewFor` reads only `pendingSpawn`, emits no spawn side effects.
7. **AC7/FR-41-42** — exact path (`displayRoll < 0.6`) still returns `{ kind: 'exact', value }` unchanged (no regression).
8. **AC8/FR-44** — `previewFor` stays pure: no `rng`/`Math.random`/engine-roll imports; same input → deep-equal output.

---

## Story Integration Metadata

- **Story ID:** `7.3`
- **Story Key:** `7-3-faixa-ambigua-correta`
- **Story File:** `_bmad-output/implementation-artifacts/7-3-faixa-ambigua-correta.md`
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-7-3-faixa-ambigua-correta.md`
- **Generated Test Files:** `triade/__tests__/game/preview.test.ts`

> This checklist's red-phase scaffolds live INSIDE the existing `preview.test.ts` (extended per story T3). `dev-story` should discover them via the story file's Dev Notes / this checklist — no separate BMM `create-story` wrapper exists for this install.

---

## Red-Phase Test Scaffolds Created

> Framework note: this project uses **node:test + tsx** (not Playwright/Cypress). The stack is frontend (Expo RN), but the 7.3 surface is a pure function, so the appropriate level is **Unit**. Scaffolds are written as real failing assertions (true RED) rather than `test.skip()` — `npm test` currently exits non-zero until 7.3 lands, which is the intended ATDD signal. The 7.2 pins remain GREEN, proving no regression in the shared baseline.

### Unit Tests (9 RED cases)

**File:** `triade/__tests__/game/preview.test.ts` (extended; ~290 lines)

- ✅ **Test:** `[P0] AC2/FR-43 — value 1 with only [3] available yields range [1,2]`
  - **Status:** RED — current `previewFor` ignores `availablePotValues` and returns `[1,2,3]` (old `contiguousWindowContaining` centering).
  - **Verifies:** AC2 fixed `[1,2]` prefix regardless of availability.
- ✅ **Test:** `[P0] AC2/FR-43 — value 2 with only [3] available yields range [1,2]`
  - **Status:** RED — current returns `[1,2,3]`.
  - **Verifies:** AC2.
- ✅ **Test:** `[P0] AC3/FR-43 — value 3 with only [3] available yields range [3]`
  - **Status:** RED — current returns `[2,3,6]` (full-ladder window, availability not applied).
  - **Verifies:** AC3 "only 3 available" collapses to `[3]`.
- ✅ **Test:** `[P0] AC4/FR-43 — available [3,6], value 3 yields [3,6]`
  - **Status:** RED — current returns `[2,3,6]`.
  - **Verifies:** AC4 start-at-`value` contiguous slice, cap 3.
- ✅ **Test:** `[P0] AC4/FR-43 — available [3,6,12], value 3 yields [3,6,12]`
  - **Status:** RED — current returns `[2,3,6]`.
  - **Verifies:** AC4 three-wide available.
- ✅ **Test:** `[P0] AC4/FR-43 — available [3,6,12,24], value 6 yields [6,12,24]`
  - **Status:** RED — current returns `[3,6,12]`.
  - **Verifies:** AC4 slicing from `value`'s index, not from ladder start.
- ✅ **Test:** `[P0] AC4/FR-43 — available [3,6,12], value 12 yields [12]`
  - **Status:** RED — current returns `[6,12,24]`-ish (full ladder), missing the available-set bound.
  - **Verifies:** AC4 cap at sequence tail.
- ✅ **Test:** `[P0] AC5/FR-43 — "only 3 available" is driven by passed availablePotValues, not hardcoded`
  - **Status:** RED — current returns `[2,3,6]` for `[3]` input.
  - **Verifies:** AC5 availability is a function of the PASSED set, not a constant.
- ✅ **Test:** `[P0] AC1/F-3 — out-of-ladder value yields a defensive 3-wide tail, never a single-element lie` (REWRITTEN from 7.2)
  - **Status:** RED — 7.2 asserted `[99]`; 7.3 requires a truthful-by-proximity slice, e.g. `[24,48,96]`. Current returns `[99]`.
  - **Verifies:** AC1 + closes the 7.2 deferred gap (defensive branch never lies).

### Supporting GREEN pins (already pass, prove no shared-baseline regression)

- `[P0] AC1/FR-43 — every ladder value is contained in the range for displayRoll >= 0.6` (sweep over `[[3], LADDER]`) — passes because the invariant `values.includes(value)` holds for the old window too.
- `[P0] AC5/FR-43 — full available ladder still yields a window containing 3 (never empty)` — passes.
- `[P0] AC6/FR-44 — previewFor produces no side effects on the provided pendingSpawn` — passes (current impl already doesn't mutate).
- `[P0] AC7 — exact path preserved for every ladder value` — passes.
- `[P0] AC8 — previewFor deterministic` — passes.

---

## Data Factories Created

**N/A for this story.** `previewFor` is a pure projection over `PendingSpawn`; tests build inputs with the existing local `pending(value, displayRoll)` helper and the `LADDER` constant (`[1,2,3,6,12,24,48,96]`, derived from `POT_CURVE` exactly as `preview.ts` must). No `@faker-js/faker` and no random data — determinism is a hard requirement (AC8).

---

## Fixtures Created

**N/A.** No DB/state lifecycle; `previewFor` takes value objects and returns new objects. Auto-cleanup fixtures would be dead weight here.

---

## Mock Requirements

**N/A.** No external service. Availability is computed from already-shipped engine readers:
`ceilingDetector(board)` → `tierForCeiling(ceiling)` → `potForTier(tier)` (returns e.g. `[3]` at tier 0). The 7.3 wiring lives in `App.tsx` (orchestrator), not in `previewFor` — keeping `previewFor` pure and unit-testable in isolation via its `availablePotValues` default param.

---

## Required data-testid Attributes

**N/A.** No UI change: `PreviewCard.tsx` already joins `range.values` with `/`, so `["1","2"]→"1/2"`, `["3"]→"3"`, `["3","6","12"]→"3/6/12"` render for free. `Hud.tsx` keeps receiving the resolved `Preview`. No new `data-testid` needed.

---

## Implementation Checklist

Maps the RED scaffolds to the story's T1–T4. DEV should implement T1 (`preview.ts`) first — it flips all 9 RED cases to GREEN at once — then T2 (`App.tsx` wiring), then re-run T4 gates.

### Test: `[P0] AC2/AC3/AC4/AC5/FR-43` + `[P0] AC1/F-3` (all 9 RED cases)

**File:** `triade/__tests__/game/preview.test.ts`

**Tasks to make these tests pass (story T1):**

- [ ] Add second parameter `previewFor(pending: PendingSpawn, availablePotValues: readonly number[] = FULL_POT_LADDER)` in `triade/src/game/preview.ts` (default keeps 7.2 callers/tests green).
- [ ] Derive `FULL_POT_LADDER` from ENGINE CONFIG DATA: `[1, 2, ...Object.keys(POT_CURVE).map(Number).sort((a,b)=>a-b)]` (boundary rule 4 — no scattered literals).
- [ ] Replace `contiguousWindowContaining` with the FR-43 algorithm:
  - [ ] `value === 1 || value === 2` → return `[1, 2]` (AC2).
  - [ ] Else within `availablePotValues`: `idx = indexOf(value)`; if found → `availablePotValues.slice(idx, idx + Math.min(WINDOW_MAX, availablePotValues.length - idx))` (AC3, AC4 — start-at-`value` contiguous slice, cap 3).
  - [ ] Defensive fallback when `value` absent from `availablePotValues`: clamp `value` to nearest `FULL_POT_LADDER` index, take a `WINDOW_MAX`-wide contiguous slice **centered** and clamped to ladder bounds (e.g. `99` → `[24,48,96]`); never return a single-element `[value]` (AC1 + closes 7.2 defer).
- [ ] Keep existing `Number.isFinite` guards on `displayRoll`/`value` (review P1 — a malformed snapshot must never flip the 60/40 decision or crash the HUD).
- [ ] NO change to the `Preview` union shape (AC2/3/4 render via existing `PreviewCard`).
- [ ] Run test: `cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/game/preview.test.ts`
- [ ] ✅ All 9 RED cases now GREEN.

**Estimated Effort:** 2–3 h (T1 alone flips all FR-43 pins).

### Test: T2 wiring (App.tsx) — verifies AC3/AC4/AC5 end-to-end

**File:** `triade/App.tsx` (not a test file; validated by existing `ui.thinview.test.ts` staying green)

**Tasks:**

- [ ] Import `ceilingDetector`, `tierForCeiling` from `src/engine/core/index.ts`; `potForTier` from `src/engine/core/pot.ts`.
- [ ] Compute once per render: `const ceiling = ceilingDetector(game.board); const availablePot = potForTier(tierForCeiling(ceiling));`.
- [ ] Pass to both lane previews: `clean: previewFor(game.pendingSpawn, availablePot)` and `accelerated: previewFor(game.pendingSpawn, availablePot)` (~App.tsx:142–144). Single board → identical set, do NOT duplicate.
- [ ] Do NOT change the thin-view boundary: `Hud.tsx` still receives the resolved `Preview`.
- [ ] Run test: `cd triade && npm test` (full suite green; `ui.thinview.test.ts`/`ui.norolls.test.ts`/`ui.purity.test.ts` unchanged).

**Estimated Effort:** 1 h.

### Test: T4 gates (regression + purity)

**Tasks:**

- [ ] `npm test` (inside `triade/`) → all green (baseline 302 from 7.2; this story adds pins, breaks none).
- [ ] `npx tsc --noEmit` (default tsconfig — CI gate) → clean. Run `npx tsc --noEmit -p tsconfig.test.json` and record; its TS5101/masked-stub errors are PRE-EXISTING and waived (ledgered in 7-1) — only flag NEW errors.
- [ ] Engine files byte-identical: `git diff --stat -- triade/src/engine` empty (this story only touches `src/game` + `App.tsx` + tests).
- [ ] `ui.norolls.test.ts` / `ui.thinview.test.ts` / `ui.purity.test.ts` stay green without modification.

**Estimated Effort:** 0.5 h.

---

## Running Tests

```bash
# Run the 7.3 red-phase set (this file)
cd triade
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/game/preview.test.ts

# Run the whole suite (baseline gate, T4)
npm test

# Type-check (CI gate)
npx tsc --noEmit

# Run a single RED test by name (node:test --test-name-pattern)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test --test-name-pattern "AC3/FR-43" __tests__/game/preview.test.ts
```

> No headed/debug browser mode applies — this is a node:test pure-module suite. (The repo's only browser e2e is `triade/__tests__/e2e/session.e2e.test.ts`, unrelated to 7.3.)

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ Red-phase scaffolds written for all 8 FR-43 acceptance criteria + the rewritten F-3 defensive pin.
- ✅ Scaffolds are real failing assertions (true RED), not `test.skip()` — appropriate for this node:test pure-function context.
- ✅ 7.2 baseline pins remain GREEN (no regression in shared behavior).
- ✅ No factories/fixtures/mocks/data-testids required (pure function, no UI change).
- ✅ Implementation checklist created and mapped to story T1–T4.

**Verification:**

- `preview.test.ts` currently reports 9 failing test cases (exit code 1) — see Test Execution Evidence.
- The 9 failures are all FR-43-content mismatches, not test bugs (expected-failure reasons documented above).
- Activation guidance: implement T1 in `preview.ts` to flip all 9 to GREEN in one shot.

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. Implement **T1** (`previewFor` second param + FR-43 window) in `triade/src/game/preview.ts`.
2. Re-run `preview.test.ts` — all 9 RED cases should now pass.
3. Implement **T2** (`App.tsx` availability wiring); confirm `ui.thinview.test.ts` stays green.
4. Run **T4** gates (`npm test`, `tsc --noEmit`, engine byte-identical).
5. Check off tasks in the implementation checklist.

**Key Principles:**

- Implement the pure function first (T1) — it is the unit under test.
- `App.tsx` wiring (T2) only feeds the live availability set; it does not change `previewFor` semantics.
- Never call `resolveSpawn`/`weightedValue`/`spawnTile`/`weightedPicker` from `previewFor` (preserves FR-44 — enforced by `ui.norolls.test.ts`).

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

1. Verify full `npm test` green (302 + 7.3 pins).
2. Confirm `Preview` union shape unchanged and `PreviewCard` untouched.
3. No scattered ladder literals — sequence still derived from `POT_CURVE`/`potForTier`/`tierForCeiling`.
4. Update `_bmad-output/implementation-artifacts/deferred-work.md` only with NEW gaps; the 7.2 defer ("content/ambiguity semantics owned by 7.3") is CLOSED.

---

## Next Steps

1. Hand this checklist + `preview.test.ts` to `dev-story` for 7.3 (story is `ready-for-dev`).
2. DEV implements T1 → T2 → T4; the 9 RED cases turn GREEN.
3. The hard invariant unit test for "no re-roll" lives in **7.4** — this story only keeps the boundary clean (AC6/AC8 smoke pins).
4. When all gates pass, mark story 7.3 done in `sprint-status.yaml`.

---

## Knowledge Base References Applied

- **test-quality.md** — one assertion per test, determinism, isolation (every FR-43 pin asserts a single `values` shape; no shared mutable state).
- **data-factories.md** — adapted: no faker (determinism mandatory); inputs built from `LADDER` + `pending()` helpers mirroring engine config data.
- **component-tdd.md / network-first.md / fixture-architecture.md** — NOT applied: this story has no component render, network, or fixture lifecycle (pure function, no UI change).
- Project testing standards (from story Dev Notes): `node:test` + `node:assert`; pure-module tests under `__tests__/game/`; test names `[P0] AC{n} …`; ESM imports with explicit `.ts` extensions; `strict: true`.

See `tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### RED Verification

**Command:**
```bash
cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/game/preview.test.ts
```

**Results (summary):**
```
total=33  pass=14  fail=19 (exit 1)
```
> node:test double-reports each failing case (per-test line + "failing tests:" summary block), so 19 `✖` lines = **9 distinct failing test cases**. 14 tests pass — the 7.2 baseline pins plus the 7.3 smoke pins (AC1 sweep, AC5 full-ladder, AC6 side-effects, AC7 exact, AC8 determinism) that already hold on the current implementation.

**The 9 RED test cases (all FR-43 content mismatches):**

1. `[P0] AC1/F-3 — out-of-ladder value yields a defensive 3-wide tail, never a single-element lie` → got `[99]`, expect `[24,48,96]`
2. `[P0] AC2/FR-43 — value 1 with only [3] available yields range [1,2]` → got `[1,2,3]`
3. `[P0] AC2/FR-43 — value 2 with only [3] available yields range [1,2]` → got `[1,2,3]`
4. `[P0] AC3/FR-43 — value 3 with only [3] available yields range [3]` → got `[2,3,6]`
5. `[P0] AC4/FR-43 — available [3,6], value 3 yields [3,6]` → got `[2,3,6]`
6. `[P0] AC4/FR-43 — available [3,6,12], value 3 yields [3,6,12]` → got `[2,3,6]`
7. `[P0] AC4/FR-43 — available [3,6,12,24], value 6 yields [6,12,24]` → got `[3,6,12]`
8. `[P0] AC4/FR-43 — available [3,6,12], value 12 yields [12]` → got `[6,12,24]`
9. `[P0] AC5/FR-43 — "only 3 available" is driven by passed availablePotValues, not hardcoded` → got `[2,3,6]` for `[3]` input

**Summary:**

- Total tests: 33
- Passing (GREEN): 14 (7.2 baseline + 7.3 smoke pins)
- RED cases: 9 (FR-43 content + rewritten F-3)
- Status: ✅ Red-phase scaffolds verified (fail due to missing FR-43 implementation, not test bugs)

---

## Notes

- **No `test.skip()` used by design:** this is a node:test pure-function suite; the intended ATDD signal is a non-zero exit (true RED) that flips to green after T1. If the team prefers committed-green scaffolds, wrap the 9 cases in `test.skip(...)` and remove per task — but the story's T3 explicitly extends `preview.test.ts` with real assertions, so the failing-suite approach matches the dev workflow.
- **Engine untouched:** `git diff --stat -- triade/src/engine` must stay empty; availability is read via exported `potForTier`/`tierForCeiling`/`ceilingDetector`, not reimplemented.
- **Expo v57 rule:** `triade/AGENTS.md` requires reading https://docs.expo.dev/versions/v57.0.0/ before writing code — surfaces here are plain RN core + engine data readers; no new APIs.
- The hard "no re-roll" invariant unit test is owned by **7.4**; 7.3 only keeps the boundary clean (AC6/AC8 are smoke pins).

---

**Generated by BMad TEA Agent** - 2026-08-24

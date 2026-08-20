---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-19'
storyId: '1.7'
storyKey: '1-7-legibilidade-dos-numerais-em-landscape'
storyFile: '_bmad-output/implementation-artifacts/1-7-legibilidade-dos-numerais-em-landscape.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-7-legibilidade-dos-numerais-em-landscape.md'
generatedTestFiles: ['triade/__tests__/ui/tileNumerals.test.ts']
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-7-legibilidade-dos-numerais-em-landscape.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/test-quality.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/test-priorities-matrix.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/component-tdd.md'
  - '.agents/skills/bmad-testarch-atdd/resources/knowledge/test-healing-patterns.md'
---

# ATDD Checklist — Story 1.7: Legibilidade dos numerais em landscape

## Step 1: Preflight & Context — Complete

### Stack Detection

- **detected_stack:** `frontend` (browser PWA + React Native app)
- **test_stack_type config:** `auto`
- **Test framework:** `node:test` built-in (não Playwright/Cypress)
- **Playwright utils:** enabled but not applicable (no Playwright config)
- **Pact utils:** disabled

### Story Context

- **Story ID:** `1.7`
- **Story Key:** `1-7-legibilidade-dos-numerais-em-landscape`
- **Status:** ready-for-dev
- **Baseline commit:** `d72cbb8`

### Acceptance Criteria

1. **AC-1:** Landscape layout with minimized board, tiles have min ~44pt width; below that the layout re-runs the numeral/ink legibility check (UX-DR-18).
2. **AC-2:** 13pt (4-digit) and 9pt (6-digit) tile numerals are only used at tile widths that fit them — otherwise the ink-contrast check re-runs (UX-DR-18, review-hud-input).
3. **AC-3:** 9pt 6-digit tier (`1536`/`3072+`) is the explicit risk point and stays legible at the smallest landscape tile (review-hud-input).
4. **AC-4:** Fixed tile numerals remain legible at the largest accessibility text setting (deliberate Dynamic Type exception) (UX-DR-18).

### Components to Touch

| Component | Action | AC Coverage |
|---|---|---|
| `triade/src/ui/tileNumerals.ts` | NEW | AC: 1, 2, 3, 4 |
| `triade/src/render/GameBoard.tsx` | MODIFY | AC: 1, 2, 3 |
| `triade/src/ui/layout.ts` | MODIFY | AC: 1, 2, 3 |
| `triade/__tests__/ui/tileNumerals.test.ts` | NEW | AC: all |
| `triade/__tests__/ui/layout.test.ts` | MODIFY | AC: 1 |
| `triade/__tests__/ui/ui.purity.test.ts` | MODIFY | purity guard |

### TEA Config Flags

- `tea_use_playwright_utils: true` (not applicable — no Playwright)
- `tea_use_pactjs_utils: false`
- `tea_pact_mcp: none`
- `tea_browser_automation: auto`
- `tea_capability_probe: true`

### Knowledge Fragments Loaded

- Core: `test-quality.md`, `test-priorities-matrix.md`, `test-healing-patterns.md`
- Extended: `component-tdd.md`

## Step 2: Generation Mode — Complete

**Mode:** AI Generation

**Justification:**
- Acceptance criteria are clear and well-defined (digit-bucket tokens, fit check, scaling path, ink map)
- Tests target pure TS functions (`numeralTokenFor`, `numeralFits`, `numeralSizeFor`, `tileInkFor`) — no browser interaction needed
- Framework is `node:test` (not Playwright) — standard function I/O testing
- Scenarios are standard: boundary conditions, pure function I/O, constant pinning
- Recording mode not applicable (no live browser verification needed for pure module tests)

## Step 3: Test Strategy — Complete

### AC → Test Mapping

| AC | Scenario | Level | Priority | Rationale |
|---|---|---|---|---|
| AC-1 | `MIN_TILE_WIDTH === 44` constant pinning | Unit | P0 | Core design constraint |
| AC-1 | Board-size floor ≥ MIN_TILE_WIDTH * GRID + ... | Unit | P0 | Layout floor enforcement |
| AC-2 | `numeralFits` returns false when token too narrow | Unit | P0 | Legibility gate |
| AC-2 | `numeralSizeFor` returns scaled-down size when token doesn't fit | Unit | P0 | Scaling path = "re-run" |
| AC-2 | No gratuitous down-scaling when 32pt token fits normally | Unit | P1 | Correctness |
| AC-3 | 6-digit at MIN_TILE_WIDTH returns >= 9pt | Unit | P0 | Explicit risk point |
| AC-3 | Fit estimate for 6-digit at 44pt is conservative | Unit | P0 | No false positive |
| AC-4 | Legibility at max Dynamic Type | Manual | P1 | Accessibility compliance |
| T1.2 | Digit-bucket boundaries (1-3d/4-5d/6+d) | Unit | P0 | Design foundation |
| T1.2 | `tileInkFor` returns non-empty string per value | Unit | P1 | Ink map shape |
| T1.2 | `tileInkFor(12)='#3a2f1d'`, `tileInkFor(13)='#fff8e8'` | Unit | P0 | Renderer boundary match |
| T1.2 | `tileInkFor(1536)`/`tileInkFor(3072)` = light ink | Unit | P0 | E9-deferred contrast |
| T1.2 | Purity/determinism (no Math.random, no RN imports) | Unit | P0 | Same in = same out |
| T1.2 | `FIT_INSET_FACTOR` pinned constant | Unit | P1 | Estimate dependency |
| T2.3 | Layout golden anchor: landscape >= 44pt | Unit | P1 | Floor integration |

### Priority Distribution

| Priority | Count |
|---|---|
| P0 | 10 |
| P1 | 4 |
| P2 | 0 |
| P3 | 0 |

### Red Phase

All 14 unit tests fail before implementation (module does not exist yet).

## Step 4: Test Generation — Complete

### Execution Mode

- **Resolved Mode:** `sequential` (direct generation — API/E2E dispatch not applicable for pure TS unit tests)
- **Reason:** Tests target pure TS functions with `node:test`; no subagent orchestration needed

### Generated Test Scaffolds

| File | Tests | Status |
|---|---|---|
| `triade/__tests__/ui/tileNumerals.test.ts` | 15 tests | RED phase (will fail until `tileNumerals.ts` is implemented) |

### Test Inventory

| # | Test Name | AC | Priority |
|---|---|---|---|
| 1 | MIN_TILE_WIDTH is pinned to 44 | AC-1 | P0 |
| 2 | numeralTokenFor 1-3 digits => 32pt/800 | T1.2 | P0 |
| 3 | numeralTokenFor 4-5 digits => 13pt/700 | T1.2 | P0 |
| 4 | numeralTokenFor 6+ digits => 9pt/700 | T1.2 | P0 |
| 5 | numeralFits returns false when too narrow | AC-2 | P0 |
| 6 | numeralFits returns true when fits | AC-2 | P0 |
| 7 | numeralSizeFor returns token when fits (no scaling) | AC-2 | P0 |
| 8 | numeralSizeFor returns scaled-down when doesn't fit | AC-2 | P0 |
| 9 | numeralSizeFor >= 9pt at MIN_TILE_WIDTH for 6-digit | AC-3 | P0 |
| 10 | FIT_INSET_FACTOR pinned and documented | AC-3 | P1 |
| 11 | tileInkFor dark ink for values <= 12 | T1.2 | P0 |
| 12 | tileInkFor light ink for values > 12 | T1.2 | P0 |
| 13 | tileInkFor(1536)/tileInkFor(3072) = light ink | T1.2 | P0 |
| 14 | tileInkFor returns non-empty string for all tiers | T1.2 | P1 |
| 15 | Purity: deterministic for all functions | T1.2 | P0 |
| 16 | numeralSizeFor returns finite positive at tiny tile | AC-3 | P1 |

### TDD Red Phase Status

- All tests import from `../../src/ui/tileNumerals.ts` (does not exist yet)
- Tests will FAIL until module is implemented
- This is intentional (TDD red phase)

## Step 4C: Aggregation — Complete

### TDD Red Phase Validation

- **Validation:** PASS (adapted for `node:test` — no `test.skip()` needed; tests fail because module doesn't exist)
- All tests assert expected behavior (not placeholders)
- Tests are deterministic (no `Math.random`, no RN/Skia imports)

### Files Written to Disk

| File | Status |
|---|---|
| `triade/__tests__/ui/tileNumerals.test.ts` | Created (RED phase) |

### Summary Statistics

| Metric | Value |
|---|---|
| **TDD Phase** | RED |
| **Total Tests** | 16 |
| **P0 Tests** | 12 |
| **P1 Tests** | 4 |
| **Fixtures Created** | 0 (pure functions, no fixtures needed) |
| **AC Coverage** | AC-1, AC-2, AC-3, AC-4 (manual) |

### Acceptance Criteria Coverage

| AC | Covered By |
|---|---|
| AC-1 | MIN_TILE_WIDTH constant, board-size floor |
| AC-2 | numeralFits, numeralSizeFor scaling |
| AC-3 | 6-digit at MIN_TILE_WIDTH >= 9pt, FIT_INSET_FACTOR |
| AC-4 | Manual validation (simulator/device) |

## Step 5: Validate & Complete — Complete

### Validation Summary

| Item | Status |
|---|---|
| Story ACs analyzed and mapped | ✅ |
| Red-phase test scaffolds created | ✅ |
| Tests use descriptive names with AC refs | ✅ |
| Tests are deterministic | ✅ |
| Tests are isolated (no shared state) | ✅ |
| ATDD checklist created with frontmatter | ✅ |
| data-testid | N/A (pure functions) |
| Network-first pattern | N/A (no API calls) |
| Fixtures with cleanup | N/A (pure functions) |
| Factories with faker | N/A (pure functions) |

### Completion Summary

**Test Files Created:**
- `triade/__tests__/ui/tileNumerals.test.ts` (16 tests, RED phase)

**Checklist Output:**
- `_bmad-output/test-artifacts/atdd-checklist-1-7-legibilidade-dos-numerais-em-landscape.md`

**Story Handoff:**
- Story Key: `1-7-legibilidade-dos-numerais-em-landscape`
- Story File: `_bmad-output/implementation-artifacts/1-7-legibilidade-dos-numerais-em-landscape.md`

**Key Risks:**
- 9pt 6-digit tier (`1536`/`3072+`) is the explicit risk point (AC-3)
- Ink boundary must match renderer exactly (`value <= 12`)
- E9-deferred realignment: `tileInkFor` returns light ink for 1536/3072 (not DESIGN dark)

**Next Recommended Workflow:**
1. `dev-story` — implement `tileNumerals.ts` following TDD red-green-refactor
2. `automate` — expand test coverage after implementation
3. Manual validation for AC-4 (Dynamic Type legibility on simulator/device)

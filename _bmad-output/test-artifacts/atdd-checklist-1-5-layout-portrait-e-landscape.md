---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-08-16'
storyId: '1.5'
storyKey: '1-5-layout-portrait-e-landscape'
storyFile: '_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-5-layout-portrait-e-landscape.md'
generatedTestFiles:
  - 'triade/__tests__/ui/layout.test.ts'
  - 'triade/__tests__/ui/orientation.test.ts'
  - 'triade/__tests__/ui/ui.purity.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/mockups/key-game-portrait.html'
  - '_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/mockups/key-game-landscape.html'
  - '_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
  - 'triade/App.tsx'
  - 'triade/package.json'
  - 'triade/__tests__/render/transitionPlan.test.ts'
  - 'triade/__tests__/storage/schema.test.ts'
  - 'triade/__tests__/storage/keyspace.test.ts'
  - 'triade/__tests__/storage/storage.purity.test.ts'
---

# ATDD Checklist: Story 1.5 — Layout portrait e landscape

## Step 1: Preflight & Context

### Stack Detection

- `test_stack_type`: `auto` (no explicit value). Auto-detection finds the Expo RN app manifest (`triade/package.json` with react/react-native) — **frontend** stack. No backend indicators.
- **Detected stack (adapted):** Expo SDK 57 RN app tested with `node:test` on Node 26 (type-strips TS natively). **No Playwright/Cypress** — zero-dep rule for both the web PWA and the RN app (project-standard since S1.1). Native orientation/safe-area runtime (rotation, notch, home indicator) is validated **manually** on the simulator/device (project rule).

### TEA Config Flags

- `tea_use_playwright_utils`: `true` — **not applicable** (no web UI surface; RN device/Node runner only).
- `tea_use_pactjs_utils`: `false` — no contract testing.
- `tea_pact_mcp`: `none`.
- `tea_browser_automation`: `auto` — no browser tests possible.
- `tea_execution_mode`: `auto`.
- `tea_capability_probe`: `true`.

### Story Context

- **Story:** 1.5 — Layout portrait e landscape.
- **Story file:** `_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md` (status `ready-for-dev`).
- **ACs (6):**
  1. Portrait HUD composition: score center-top (34pt display), best below small (lane-scoped, muted), preview bottom corner, pause top-right — nothing else (UX-DR-7). **RN component = manual.**
  2. Landscape: HUD collapses to a thin top edge band — score+best left, preview right, pause top-right (opposite preview), at 22pt/11pt (UX-DR-5); placement per `mockups/key-game-landscape.html`. **RN component composition = manual; band-vs-board math = testable.**
  3. Pause top-right in both orientations, outside board swipe rect, ≥44×44, inside safe margins (UX-DR-6). **RN component + native = manual.**
  4. Safe areas from `react-native-safe-area-context` + 16pt safe margin on top of per-edge insets in both orientations (UX-DR-4, UX-DR-20). **Pure math = testable** (insets feed `layoutFor`). Native safe-area source = manual.
  5. Board maximizes in the space left; tiles scale with the container — tile size derives from the container, never hand-set (UX-DR-20). **Pure math = testable.**
  6. Landscape: HUD collapses to the thin top edge band and the board dominates below (D-006). **Pure math = testable** (bandHeight landscape < portrait; board > band; board height-bounded).
- **Affected components:** `triade/src/ui/layout.ts` (NEW pure), `triade/src/ui/orientation.ts` (NEW pure), `triade/src/ui/Hud.tsx` + `PauseButton.tsx` (NEW RN views, manual), `triade/App.tsx` (SafeAreaProvider + layout-module board size), `triade/app.json` (`orientation` → `default`, native), `triade/package.json` (`react-native-safe-area-context`). Web PWA (`js/*`, `test/game.test.js`) READ-ONLY.
- **Testable surface (this ATDD run):** the pure TS modules `layout.ts` (`layoutFor`, `SAFE_MARGIN`) and `orientation.ts` (`isLandscape`) + a purity/boundary guard. RN views and native rotation are manual.

### Framework & Existing Patterns

- Baseline: **109 triade tests green** (`node --test` in `triade/`, Node 26) + web PWA 26 frozen. `tsc --noEmit` clean.
- Red-phase scaffold pattern (S1.4): value imports of not-yet-existing modules via **variable-specifier dynamic `import(SPEC)`** inside the test body; contract types declared locally; `test.skip(` keeps the suite CI-green until activation.
- Purity guard pattern: `triade/__tests__/storage/storage.purity.test.ts` — scans a named pure module for RN/React/Skia/Expo imports + relative-imports-only. Reused verbatim-style for `layout.ts`/`orientation.ts`.
- Determinism: pure functions, literal fixtures, no `Math.random`, no RN imports.

### Prerequisites Check

- Story approved with clear, testable ACs: **PASS** (AC 4-6 automated at pure-math layer; AC 1-3 and native rotation are manual).
- Test framework configured: **PASS** — `node:test` built-in (Node 26). Project-mandated runner; Playwright/Cypress prerequisites do not apply.
- Development environment: **PASS** — Node v26.0.0 present, `triade/` suite green at baseline (109).

### Notes / Adaptations

- The ATDD two-worker split (API + E2E) does **not** map 1:1: no HTTP API and no browser UI in this story. Adapted levels: **Unit** (layout math: board maximize, band collapse, insets respected, container-derived tile size, edge cases), **Unit/boundary** (purity of `layout.ts`/`orientation.ts`), and **manual** (RN `Hud`/`PauseButton` composition, rotation/notch/home-indicator runtime on simulator — project rule).
- The layout contract is exercised against the real iOS mockup dimensions (390×844 portrait / 844×390 landscape, notch `top:47`/`bottom:34` and landscape `left:47`/`right:21`) and edge cases from the story testing standard (small screens 320×480, extreme aspect 2000×200, 200×2000).
- `SAFE_MARGIN = 16` pinned (UX-DR-4/DESIGN.md line 238).
- **Not automated:** `Hud.tsx`/`PauseButton.tsx` composition, safe-area native source, `app.json` orientation unlock, board/tile rendering — all manual on simulator/device (project rule). Do not pull numeral legibility (story 1.7), swipe input (1.6), or pause state (Epic 6) forward.
- Web PWA files READ-ONLY; `src/engine/core` untouched.

---

## Step 2: Generation Mode

### Mode Selection

- `test_generation_mode`: **AI Generation** (default). The testable surface for Story 1.5 is pure TS under `node:test` (`layoutFor`, `isLandscape`, `SAFE_MARGIN`); there is no web UI to record.
- **Recording (optional mode):** skipped. No browser surface exists — RN native orientation/safe-area runtime is manual validation on simulator/device (project rule), so `tea_browser_automation: auto` finds nothing to drive with Playwright CLI/MCP. Same adaptation as S1.1–S1.4.

---

## Step 3: Test Strategy

### Acceptance Criteria → Scenarios

| AC | Scenario | Level | Priority |
| -- | -------- | ----- | -------- |
| AC-4/5 (safe margin + board maximizes) | `layoutFor` portrait 390×844 notch top 47 + home bottom 34: isLandscape=false, boardSize = maximized square inside safe margins + 16pt, width-bounded | Unit | P0 |
| AC-2/6 (landscape board dominates below thin band) | `layoutFor` landscape 844×390 left 47 + right 21: isLandscape=true, boardSize = maximized square, height-bounded, board > bandHeight | Unit | P0 |
| AC-6 (thin top edge band) | bandHeight(landscape) < bandHeight(portrait); both > 0 | Unit | P0 |
| AC-5 (maximize in space left) | boardSize = min(horizontal bound, vertical bound - band) across a sweep of 5 container sizes | Unit | P0 |
| AC-5 (tile size derives from container) | Two container widths → different board sizes; board never a fixed constant | Unit | P0 |
| AC-4 (insets respected) | boardSize never exceeds safe-margin-bounded width or height for 4 container/inset combos; asymmetric notch insets bind | Unit | P0 |
| UX-DR-4 | `SAFE_MARGIN === 16` | Unit | P0 |
| Story edge case | Small screen 320×480: positive board, board + band never overlap | Unit | P0 |
| Story edge case | Extreme landscape 2000×200: positive board, board dominates band | Unit | P0 |
| Story edge case | Sweep incl. extreme aspect: outputs finite, board never negative | Unit | P0 |
| T2.2 (single source of truth) | `layoutFor.isLandscape` agrees with `isLandscape(width, height)` for 4 sizes | Unit | P1 |
| AC-4 (asymmetric insets) | Adding insets never grows the board; notch insets bind correctly | Unit | P1 |
| T2.2 (orientation boundary) | `isLandscape`: width>height true, width<height false, equal → false, exact boundary (501/500 vs 499/500) | Unit | P0 |
| T2.2 (purity) | `isLandscape` pure/deterministic across sizes | Unit | P1 |
| ADR-01/05 (boundary) | `layout.ts` + `orientation.ts` import nothing from RN/React/Skia/Expo, relative imports only | Unit (boundary) | P1 |
| AC-1/2/3 native runtime | HUD composition, rotation, notch/home-indicator insets, pause placement/hit target, safe-area source | Manual (simulator/device) | P1 |

### Test Level Selection

- **Unit** (`node:test`, pure TS): `layoutFor` math (portrait width-bounded, landscape height-bounded, band collapse, maximize sweep, container-derived board, insets respected, `SAFE_MARGIN`), `isLandscape` boundary, purity guard. Covers AC-4, AC-5, AC-6 + UX-DR-4 + T2.2.
- **Manual** (not automated): RN `Hud.tsx`/`PauseButton.tsx` composition (AC-1/2/3), native orientation/safe-area runtime, `app.json` unlock (T1.4/T5.1). Documented, not automated (project rule).
- **No E2E/API/Component levels**: no browser UI, no HTTP API, and no RN-component test framework exists (zero-dep; component behavior is simulator-manual).

### Red Phase Requirements

All three target modules (`layout.ts`, `orientation.ts`) **do not exist yet** — scaffolds use variable-specifier dynamic imports inside `test.skip(` so the suite stays CI-green (109 pass / 18 skipped) while the contracts assert expected behavior; activating a scaffold removes `test.skip(` and the dynamic import becomes a real failing import → then GREEN once the module ships.

### Notes / Deviations

- No duplicate coverage: layout math tested once at Unit level; RN composition + native runtime are manual, not re-tested.
- `SAFE_MARGIN` pinned 16; board/tile rendering, numeral legibility (1.7), swipe input (1.6), pause state (Epic 6) deliberately out of scope.
- No fixtures/factories needed: pure functions with literal inputs; no faker (project zero-dep rule overrides the generic data-factories guidance).

---

## Step 4/4C: Red-Phase Test Scaffold Generation & Aggregation

### Execution Mode

- `tea_execution_mode`: `auto`, `tea_capability_probe`: `true` → runtime supports subagents → **resolvedMode: `subagent`** (two workers in parallel, adapted).

### Workers

- **Worker A** (`step-04a`, adapted: Unit red-phase — layout math): 12 scaffolds in `triade/__tests__/ui/layout.test.ts`:
  - Portrait width-bounded board on 390×844 with notch/home insets (AC-1/4/5).
  - Landscape height-bounded board below the thin band on 844×390 (AC-2/6).
  - bandHeight landscape < portrait (D-006).
  - Maximize sweep (5 sizes) — boardSize = min(bounds) (AC-5/UX-DR-20).
  - Container-derived board (two widths → different board, never a constant).
  - Insets respected (4 combos never exceed bounds) + asymmetric notch bind.
  - `SAFE_MARGIN === 16`.
  - Small screen 320×480 (positive board, no overlap).
  - Extreme landscape 2000×200 (positive board, board dominates).
  - Finiteness/negativity sweep incl. 200×2000.
  - `layoutFor.isLandscape` agrees with `isLandscape` (T2.2).
  - Adding insets never grows the board.
- **Worker B** (`step-04b`, adapted: boundary + orientation): 6 scaffolds:
  - `triade/__tests__/ui/orientation.test.ts` — 5 tests: `isLandscape` true (844×390), false (390×844), square → false, exact boundary 501/500 vs 499/500, purity/determinism.
  - `triade/__tests__/ui/ui.purity.test.ts` — 1 test: `layout.ts` + `orientation.ts` import nothing from RN/React/Skia/Expo, relative imports only (ADR-01/05).

### TDD Red Phase Validation — PASS

- All 18 tests wrapped in `test.skip(`; no placeholder assertions; all `expected_to_fail: true`.
- **CI-green red phase:** value imports of not-yet-existing modules via variable-specifier dynamic `import(SPEC)` inside the skipped callbacks; contract types declared locally (no import from absent modules); `tsc --noEmit` clean; `node --test` reports 109 pass / 18 skipped. Scaffolds are red on *activation*, not red on *load*.

### Verification

- `node --test` from `triade/`: **127 total — 109 pass, 0 fail, 18 skipped** (skipped = red-phase scaffolds).
- `npx tsc --noEmit`: **clean**.
- Web PWA frozen: `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` untouched. `src/engine/core` untouched.

### Summary

| File | Tests | Priority | Covers |
| ---- | ----- | -------- | ------ |
| `triade/__tests__/ui/layout.test.ts` | 12 | P0/P1 | AC-1/2/4/5/6, UX-DR-4/20, D-006, T2.2 |
| `triade/__tests__/ui/orientation.test.ts` | 5 | P0/P1 | T2.2 (isLandscape boundary + purity) |
| `triade/__tests__/ui/ui.purity.test.ts` | 1 | P1 | ADR-01/05 boundary |

**Total: 18 red-phase scaffolds (all skipped).**

### Next Steps (Task-by-Task Activation)

During implementation of each task (dev-story), per TDD red-green:

1. Remove `test.skip(` from the test(s) for the current task.
2. Run `node --test` from `triade/` — the activated test must **fail first** (module doesn't exist / behavior absent).
3. Implement the module (`layout.ts`, `orientation.ts` — pure, no RN/Expo imports); the test turns green.
4. Keep `tsc --noEmit` green and the whole suite green; commit passing tests.
5. Native/component behavior (HUD composition, rotation, safe areas) is validated manually on the simulator/device (T5.1) — record evidence in the completion note.

---

## Step 5: Validate & Complete

### Validation

- [x] Story approved with clear testable ACs (6).
- [x] Development environment ready (Node 26, `triade/` baseline green at 109).
- [x] Framework configured — `node:test` built-in (project-mandated; Playwright/Cypress adapted to N/A, documented).
- [x] Story markdown parsed, ACs extracted, components identified, constraints documented.
- [x] Knowledge base fragments loaded (core): data-factories, component-tdd, test-quality, test-healing-patterns.
- [x] ACs mapped to test levels + priorities (Step 3 table); duplicate coverage avoided.
- [x] Red-phase scaffolds: 18 tests, all `test.skip()`, all `expected_to_fail`, no placeholder assertions.
- [x] Tests deterministic (no `Math.random`; pure functions/literal fixtures).
- [x] Tests isolated, no interdependencies, no hard waits, no cleanup needed (pure logic).
- [x] Frontmatter: `storyId`, `storyKey`, `storyFile`, `atddChecklistPath`, `generatedTestFiles` populated.
- [x] ATDD artifacts linked into story file (`### ATDD Artifacts` under Dev Agent Record).
- [x] Verification: `node --test` **127 total — 109 pass / 0 fail / 18 skipped**; `npx tsc --noEmit` **clean**; web PWA files untouched.
- [x] Temp artifacts: workflow convention honors subagent JSON outputs; persistent checklist in `_bmad-output/test-artifacts/`. No orphaned browser sessions (no browser used).

### Completion Summary

- **Story:** 1.5 — Layout portrait e landscape.
- **Story key:** `1-5-layout-portrait-e-landscape`.
- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-1-5-layout-portrait-e-landscape.md`.
- **Test files created (3, 18 red-phase scaffolds, all skipped):**
  - `triade/__tests__/ui/layout.test.ts` (12, P0/P1, AC-1/2/4/5/6)
  - `triade/__tests__/ui/orientation.test.ts` (5, P0/P1, T2.2)
  - `triade/__tests__/ui/ui.purity.test.ts` (1, P1, ADR-01/05 boundary)
- **Primary test level:** Unit (+ boundary; manual for RN/native runtime).
- **Key assumptions/risks:**
  - Contract: `layoutFor({ width, height, insets }) → { boardSize, bandHeight, isLandscape }`; `SAFE_MARGIN = 16`; `isLandscape(w, h) = w > h`. `layout.ts`/`orientation.ts` are pure (no RN/Expo imports) — `Hud.tsx`/`PauseButton.tsx` are NOT pure and are exempt from the guard.
  - Board maximizes: `boardSize = min(width − left − right − 2·SAFE_MARGIN, height − top − bottom − 2·SAFE_MARGIN − bandHeight)`. In portrait the width bound wins on 390-wide screens; in landscape the height bound wins below the thin band.
  - bandHeight is per-orientation and landscape must be strictly thinner than portrait (D-006); exact pixel values are implementation freedom as long as ordering + board-dominance + no-overlap hold.
  - Native safe-area source (`react-native-safe-area-context`), rotation, and RN view composition are **manual** — evidence recorded in the completion note, not CI.
  - Do not pull forward: numerals legibility (1.7), swipe input (1.6), pause state (Epic 6), preview data (Epic 7).
- **Knowledge base applied:** data-factories (literal fixtures, no fabricated data), test-quality (deterministic, isolated, explicit assertions), component-tdd (red→green activation), test-healing-patterns (variable-specifier dynamic-import pattern for CI-green red phase, from S1.4).
- **Next recommended workflow:** `gds-dev-story` / `bmad-dev-story` on `_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md` — task-by-task activation of scaffolds (remove `test.skip()`, confirm RED, implement, GREEN). `testarch-automate` comes after implementation.
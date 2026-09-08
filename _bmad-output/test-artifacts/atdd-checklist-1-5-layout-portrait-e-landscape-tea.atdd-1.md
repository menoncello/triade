---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-07'
storyId: '1.5'
storyKey: '1-5-layout-portrait-e-landscape'
storyFile: '_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-1-5-layout-portrait-e-landscape-tea.atdd-1.md'
generatedTestFiles:
  - '_bmad-output/test-artifacts/atdd-tests/1-5-layout-portrait-e-landscape.red.spec.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md'
  - '_bmad-output/test-artifacts/atdd-checklist-1-5-layout-portrait-e-landscape.md'
  - '_bmad/tea/config.yaml'
  - 'triade/App.tsx'
  - 'triade/app.json'
  - 'triade/package.json'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/ui/orientation.ts'
  - 'triade/src/ui/useSyncedLayout.ts'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/PauseButton.tsx'
---

# ATDD Checklist: Story 1.5 — Layout portrait e landscape (working-tree run, tea.atdd-1)

## Step 1: Preflight & Context

### Working-tree delta (the change under test)

`git status --porcelain` at HEAD `0125b87` (branch `feat/epic-10-telemetria`):

- `M _bmad-output/implementation-artifacts/sprint-status.yaml` — **orchestrator-owned**
  (`1-5-layout-portrait-e-landscape: ready-for-dev → awaiting-operator`). Per
  session instructions: never written, never reverted, never treated as a defect.
- Untracked parallel-session artifacts only (a `tea.td-1` result doc, a test-design
  doc). No triade code changes.

Conclusion: the story-1.5 code diff is **empty** — the implementation already
sits at HEAD and satisfies all ACs (verified: `app.json`, `layout.ts`,
`orientation.ts`, `Hud.tsx`, `PauseButton.tsx`, `App.tsx`, UI tests, Pinned
Version Matrix). This run therefore pins the **landed working-tree contracts as
regression guards** (RED on contract break, GREEN on the current tree), rather
than scaffolding pre-implementation tests for missing modules.

### Stack Detection

- `test_stack_type`: `auto`. Manifest `triade/package.json` (react/react-native,
  expo ~57) → **frontend**; no backend indicators.
- Adapted runner: `node:test` + tsx on Node 26 (project-mandated; `npm test` in
  `triade/`). No Playwright/Cypress (project zero-dep rule). Native
  rotation/notch/home-indicator rendering is **manual** (project rule, T5.1).

### TEA Config Flags (`_bmad/tea/config.yaml`)

- `tea_use_playwright_utils`: `true` — N/A (no web UI surface).
- `tea_use_pactjs_utils`: `false`; `tea_pact_mcp`: `none`.
- `tea_browser_automation`: `auto` — nothing to drive (no browser surface).
- `tea_execution_mode`: `auto`, `tea_capability_probe`: `true` → **resolvedMode:
  `sequential`** (single orchestrated run; API/E2E worker split adapted to
  Unit + Static-audit — no HTTP API, no browser UI in this story).
- `test_artifacts`: `_bmad-output/test-artifacts` (all outputs below it).

### Story Context

- Story 1.5, 6 ACs (portrait HUD UX-DR-7; landscape thin band UX-DR-5/D-006;
  pause top-right ≥44×44 UX-DR-6; safe-area + 16pt margin UX-DR-4/20; container-
  derived board UX-DR-20; landscape board dominance D-006).
- Current-tree implementation (evolved past the original story notes):
  `useSyncedLayout` coalesces `useWindowDimensions` + `useSafeAreaInsets`
  through `layoutFor`/`getBandTop` (rotation-race hardening); content is a
  `View` with `paddingTop: bandTop`, `paddingBottom: 24 + insets.bottom`;
  `Hud` renders real `PreviewCard` lanes + assistance affordances (later
  stories layered on top — out of scope here).
- Measured ground truth (node --import tsx, 2026-09-07): portrait 390×844 →
  `{boardSize: 358, bandHeight: 96, isLandscape: false}`; landscape 844×390 →
  `{boardSize: 310, bandHeight: 48, isLandscape: true}`; `SAFE_MARGIN` 16;
  `BOARD_SIZE_FLOOR` 216; `getBandTop({47,…},96)` = 159; NaN guard →
  `{0, 96, false}`; `HIT_TARGET` 48; `app.json` orientation `default`.

### Prerequisites Check

- Story with clear testable ACs: **PASS** (6 ACs + measured values above).
- Test framework configured: **PASS** (`node:test`, executed 16/16 skipped).
- Dev environment: **PASS** (Node 26, triade suite green).

## Step 2: Generation Mode

- **AI Generation** (default). Recording skipped: no browser surface; RN
  runtime is manual simulator validation (project rule). Same adaptation as the
  original 1-5 ATDD run and S1.1–S1.4.

## Step 3: Test Strategy

| AC | Scenario | Level | Priority |
| -- | -------- | ----- | -------- |
| AC-1/4/5 | U1 portrait 390×844 notch → 358 width-bounded, band 96 | Unit | P0 |
| AC-2/6 | U2 landscape 844×390 → 310 height-bounded, board > band | Unit | P0 |
| AC-6/D-006 | U3 band collapse 48 < 96, both > 0 | Unit | P0 |
| AC-4/UX-DR-4 | U4 SAFE_MARGIN 16 + getBandTop identity (159/64) | Unit | P0 |
| AC-5/UX-DR-20 | U5 maximize identity sweep (7 sizes incl. extremes) | Unit | P0 |
| AC-5 | U6 container-derived board (358 → 468) | Unit | P0 |
| DW-5 guard | U7 NaN/Infinity ×6 → finite {0, 96, false} | Unit | P0 |
| T2.2 | U8 isLandscape boundary + hook agreement + determinism | Unit | P1 |
| UX-DR-18 | U9 BOARD_SIZE_FLOOR ↔ MIN_TILE_WIDTH linkage (= 216) | Unit | P1 |
| AC-4 | U10 insets monotonicity + asymmetric notch bind | Unit | P1 |
| T1.1 | S1 app.json orientation == "default" | Static audit | P0 |
| T1.3/T4.2 | S2 SafeAreaProvider root + useSyncedLayout wiring | Static audit | P0 |
| AC-1/2/3 | S3 Hud typography/order/touch pins | Static audit | P0 |
| AC-3/UX-DR-6 | S4 HIT_TARGET 48, verbatim refs | Static audit | P0 |
| ADR-01/05 | S5 thin-view boundary + purity (word-boundary regexes) | Static audit | P1 |
| AC-4 | S6 bandTop padding + insets.bottom | Static audit | P1 |

Red-phase requirement: all 16 `test.skip()`; bodies assert EXPECTED behavior
with measured literals; each carries an "Expected failure" mutation note.

## Step 4/4C: Red-Phase Generation & Aggregation

### Execution

- `resolvedMode: sequential` — single pass, Unit + Static-audit sections in one
  spec (no HTTP API / browser workers exist for this story).

### TDD Red Phase Validation — PASS

- 16/16 `test.skip()`, zero placeholder assertions, Given-When-Then comments.
- File loads clean under the project runner:
  `node --import tsx --test …red.spec.ts` → **16 tests, 0 pass, 0 fail,
  16 skipped**.
- Activation check (temp copy, `test.skip(` → `test(`): **16/16 pass** on the
  current tree — guards hold.
- RED proof (temp copy + mutated `358 → 359`): **15 pass / 1 fail (U1)** —
  guards are not vacuous; they fail on contract break.

### Fixes applied during generation (guard bugs, not product bugs)

1. Top-level `await import()` → dynamic `import()` inside bodies + static
   `node:*` imports only (CJS-format transform rejects top-level await).
2. Relative depth `../../../../triade` → `../../../triade` (off-by-one; the
   pre-existing red specs share the broken depth — latent, never executed
   because skipped. This spec's paths are execution-verified).
3. Purity check `includes('expo')` → word-boundary regexes (`expo` ⊂ `export`
   false-positived on every export line).

### Generated files

- `_bmad-output/test-artifacts/atdd-tests/1-5-layout-portrait-e-landscape.red.spec.ts`
  (16 red-phase tests: U1–U10 unit, S1–S6 static audit)

## Implementation Checklist (working tree: no code changes required)

The tree already implements every item; the checklist is the
verify-each-contract path (activate → RED-check → confirm GREEN):

- [ ] U1–U2 golden anchors: portrait 358/96/false, landscape 310/48/true
  (`node --import tsx --test` on the red spec with `test.skip(` → `test(` in a
  temp copy; or run `triade/__tests__/ui/layout.test.ts`).
- [ ] U3–U4 constants: `LANDSCAPE_BAND_HEIGHT` 48 < 96; `SAFE_MARGIN` 16;
  `getBandTop` single helper (no re-inlined formula in App/Hud).
- [ ] U5–U6 maximize: board = max(0, min(availW, availH)); width growth moves
  the board (no fixed constant).
- [ ] U7 guard: 6-field `Number.isFinite` fallback `{0, 96, false}`.
- [ ] U8–U10: `isLandscape` strict `>` + hook agreement; floor linkage 216;
  insets monotonicity.
- [ ] S1–S2: `app.json` orientation `default`; `SafeAreaProvider` +
  `initialMetrics`; `useSyncedLayout` → `<Hud bandHeight={bandHeight}>`.
- [ ] S3–S4: Hud 34/22/11pt + pause-last ordering + pointerEvents; `HIT_TARGET`
  48 verbatim.
- [ ] S5–S6: thin-view imports; `paddingTop: bandTop`,
  `paddingBottom: 24 + insets.bottom`.
- [ ] Suite green: `npm test` in `triade/` + `npx tsc --noEmit` clean.
- [ ] Manual (human-only, T5.1): portrait HUD per UX-DR-7 → rotate → thin
  22/11pt band, dominant board, pause reachable both orientations.
- [ ] Do NOT touch `sprint-status.yaml` (orchestrator-owned); do NOT pull
  forward 1.6 (swipe), 1.7 (numerals), Epic 6 (pause state), Epic 7 (preview
  data); web PWA stays frozen.

## Step 5: Validate & Complete

- [x] Working-tree delta inspected (only orchestrator-owned board change).
- [x] 16 red-phase tests, all skipped, execution-verified load (16 skipped).
- [x] Activation → 16/16 GREEN; mutation → RED (U1 fails on 359).
- [x] No placeholder assertions; deterministic (pure functions + literal
  fixtures + source scans); isolated; no waits/cleanup needed.
- [x] Frontmatter (`storyId`, `storyKey`, `storyFile`, `atddChecklistPath`,
  `generatedTestFiles`) populated.
- [x] Temp activation copies removed; no orphaned browsers (none used).
- [x] Story linkage: run artifact appended under `### ATDD Artifacts`.

### Completion Summary

- **Story:** 1.5 — Layout portrait e landscape (working-tree regression run).
- **Checklist:** `_bmad-output/test-artifacts/atdd-checklist-1-5-layout-portrait-e-landscape-tea.atdd-1.md`
- **Red spec (16 skipped):**
  `_bmad-output/test-artifacts/atdd-tests/1-5-layout-portrait-e-landscape.red.spec.ts`
- **Primary level:** Unit + Static-audit (+ manual for RN/native runtime).
- **Key risks/assumptions:** tree already implements all ACs (empty code diff);
  guards pin measured literals (358/310/96/48/159/216) — any intentional
  constant change must update spec + `layout.test.ts` golden anchors together;
  pre-existing red specs under `atdd-tests/` share the fixed off-by-one path
  depth (latent, out of scope); simulator rotation stays human-only.
- **Next workflow:** none required for 1-5 (awaiting-operator); developer
  activates guards per-task if layout is ever touched.

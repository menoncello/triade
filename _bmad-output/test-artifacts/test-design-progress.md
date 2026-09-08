---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-07'
---

# Test-design progress — Story 7.2 preview-card-no-hud-60-40-nas-duas-pistas

## Step 1 — Detect mode

- **Mode: Epic-Level.** Story spec `7-2-preview-card-no-hud-60-40-nas-duas-pistas.md` carries 7 acceptance criteria;
  sprint-status.yaml exists (orchestrator-owned, read-only, not modified).
- Prerequisites present: story ACs, `triade/src/game/preview.ts`, `triade/src/ui/PreviewCard.tsx`,
  `triade/src/ui/Hud.tsx`, `triade/App.tsx` wiring, `preview.test.ts` (26 pins), component tests.

## Step 2 — Load context

- Config: `_bmad/tea/config.yaml` (test_artifacts `_bmad-output/test-artifacts`,
  test_design_output `_bmad-output/test-artifacts/test-design`, risk_threshold p1).
- Persistent fact: `_bmad-output/project-context.md` (engine-puro, preview lê pendingSpawn 60/40,
  nunca anima com feel, 26 testes engine gate, CI cobre puro / device cobre gesto-pixel).
- Scope under review: D-008 delta (commit ee3ce91 — null guards in `previewFor` + 3 pins) against the
  current tree. Working tree itself is clean except orchestrator-owned sprint-status.yaml, so the
  committed 7.2 surface + D-008 delta is the review target. Production code NOT modified by this workflow.
- Knowledge fragments: risk-governance, probability-impact, test-levels-framework, test-priorities-matrix.
- NFR note: preview is HUD chrome (not hot path); full screen-reader bridge is Epic 9; feel layer is Epic 8.

## Step 3 — Risk & testability

- Testability: STRONG — `previewFor` pure (no rng/Math.random/roll imports), host-testable; thin-view
  boundary enforced by `ui.thinview` / `ui.norolls` / `ui.purity` guards; pinned layout markers.
- 7 risks scored (P×I). Highest: R-002 and R-003 at 4 (MEDIUM). No risk ≥ 6, no score-9 blocker.
- See final document for the full matrix.

## Step 4 — Coverage plan

- P0: unit boundary/containment/purity/D-008 null pins + component chip/wiring/layout-marker pins
  (all exist — verify green, no new tests proposed).
- P1: real previewFor→Hud range wiring, distinct per-lane fixture, NOOP stability pin.
- P2: defensive ladder cases, a11y label-shape forward-compat.
- Execution: `npm test` in `triade/` (node:test, <15 min) on PR. No nightly needed for this scope.
- See final document for the full matrix, estimates (~5–11h), and gates.

## 2026-09-07 — Refresh: Story 8-2 punch-visual (epic-level, sequential)

- **Mode: Epic-Level.** Spec `spec-8-2-punch-visual.md` (status `done`, passes `7a85c33`/`0ba441b` in triage log) + `epic-8-context.md` (regen 2026-09-07); sprint-status.yaml exists (orchestrator-owned, read-only, not modified).
- Production delta committed as `e4629cd` (feel.ts overshootScale + punch.ts + GameBoard isMerge/overshoot/flash/glow/bursts + App reducedMotion wiring + punch.test.ts 9 cases + punch.atdd.test.ts); follow-ups metadata-only; working tree metadata-only. Engine untouched (no engine files in delta).
- Config `_bmad/tea/config.yaml` (test_artifacts `_bmad-output/test-artifacts`, test_design_output `.../test-design`, risk_threshold p1); persistent fact `_bmad-output/project-context.md` loaded.
- 10 risks (P×I), 3 high ≥6 (R-001 PERF burst jank 2×3, R-002 TECH early-input orphan 2×3, R-003 BUS FR-30 gate 2×3); forward-compat noted for landed 8-3/8-4 sharing GameBoard main-thread budget.
- Coverage: P0 9 groups (host unit, green), P1 6 (fixtures + wiring + device smoke), P2 5, P3 3 exploratory; ~5.5–12.5 h host + device → ~12–22 h elapsed; PR host gate <15 min; one 15-min iPhone pass pre-merge.
- Verified this run: full `triade/` suite `1034 pass / 0 fail / 457 skipped` (134 suites). No production code modified.
- Output: `_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md` (canonical) + mirror `_bmad-output/test-artifacts/test-design-epic-8-2-punch-visual.md`.

## 2026-09-07 — Targeted follow-up: Story 9-2 screen-reader-contract preview/banner delta (epic-level)

- **Mode: Epic-Level (targeted).** Spec `spec-9-2-screen-reader-contract.md` (`awaiting-operator`, baseline `d26bbdd` → final `9c33e33`); sprint-status.yaml exists (orchestrator-owned, read-only, not modified).
- Production delta `d26bbdd..HEAD` (3 files, +106/-5): `App.tsx` preview/banner announcement effects (skip-first-mount symmetry + empty/raw-key guards) + `PreviewCard.tsx` i18n `a11y.preview` label. Foundation (`src/a11y/*`, gate, tone, Dynamic Type) covered by 2026-09-02 full TD — not re-assessed.
- 6 delta risks (P×I), 0 high ≥6; highest: R-D1 preview chattiness (2×2), R-D2 banner flicker/order (2×2), R-D3 `a11y.preview` key gap (2×2), R-D4 App-gate missing new-wiring pins (2×2).
- Coverage: P0 3 groups (existing pins, green) / P1 4 (static extensions, no new harness) / P2 2 / P3 2 (operator ear-check) — ~4–7.5h (~1 day).
- Verified this run: full `triade/` suite 1051 pass / 0 fail / 460 skipped; `a11y.preview` keys present en+pt (`Next {{display}}` / `Próxima {{display}}`); engine untouched. No production code modified.
- Output: `_bmad-output/test-artifacts/test-design/test-design-9-2-screen-reader-contract-td-20260907.md`.

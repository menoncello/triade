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

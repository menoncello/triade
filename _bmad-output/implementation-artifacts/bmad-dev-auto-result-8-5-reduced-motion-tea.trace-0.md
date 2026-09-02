---
status: done
trace_target: "8-5-reduced-motion"
workflow: "bmad-testarch-trace"
gate_status: "CONCERNS"
coverage:
  overall: 100
  p0: 100
  p1: 100
  p2: 100
tests:
  total: 835
  pass: 824
  fail: 11
  scoped_host: "35 (21 ATDD + 12 api + 2 bench) -> 33 pass / 2 fail waived P2 (94.3% raw, 100% P0/P1)"
artifacts:
  - "_bmad-output/test-artifacts/traceability/traceability-matrix-8-5-reduced-motion.md"
  - "_bmad-output/test-artifacts/traceability/coverage-matrix-8-5-reduced-motion.json"
  - "_bmad-output/test-artifacts/traceability/e2e-trace-summary-8-5-reduced-motion.json"
  - "_bmad-output/test-artifacts/traceability/gate-decision-8-5-reduced-motion.json"
  - "_bmad-output/test-artifacts/traceability-matrix.md"
  - "_bmad-output/test-artifacts/e2e-trace-summary.json"
  - "_bmad-output/test-artifacts/gate-decision.json"
oracle:
  basis: "acceptance_criteria"
  confidence: "high"
  mode: "formal_requirements"
  sources:
    - "_bmad-output/implementation-artifacts/spec-8-5-reduced-motion.md"
    - "_bmad-output/implementation-artifacts/epic-8-context.md"
    - "_bmad-output/test-artifacts/test-design/test-design-epic-8-5-reduced-motion.md"
    - "_bmad-output/test-artifacts/atdd-checklist-8-5-reduced-motion.md"
working_tree:
  head: "0531056"
  final_revision: "0ec7482"
  baseline: "10a3449"
  diff: "metadata-only sprint-status.yaml backlog->done + test-design-progress.md 8-5 ledger + untracked ATDD scaffolds (21 cases, 19G/2R) + api/e2e fixtures"
  engine_purity: "git diff --stat -- triade/src/engine empty"
  tsc: "clean"
  bench: "full 9.6ms / reduced 6.5ms median ~0.0003 p99 ~0.0006 well under 0.05/0.1 both profiles"
---

Trace completed for 8-5-reduced-motion. Mapped 6 requirements (4 P0 +1 P1 +1 P2) to 45 tests (23 unit +12 api +10 e2e). All 6 FULL coverage 100%. P0 100% pass (15/15 scoped), P1 100% (9/9). Overall 100% coverage. Gate CONCERNS (not FAIL) due to 2 P2 EXPECTED RED with waivers (R-006 cancelAnimation missing, R-010 burst orphan) + manual device smoke P1-07 pending 15-min pre-merge — same precedent as 8-4. Risk LOW. Full suite 824/835 (98.68%) and scoped 33/35 (94.3% raw, 100% P0/P1 when waivers excluded). Artifacts under TEA test_artifacts/traceability as configured (`_bmad/tea/config.yaml` trace_output). Working-tree delta is preset-not-flag umbrella: REDUCED_PRESET frozen + reducedPresetFor haptic-preserving, punch/shake/bullet gating, GameBoard board-only Animated.View, GameOverOverlay instant vs 280ms wiring fix App.tsx:929, bench both profiles, haptics stay never gated.

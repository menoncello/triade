---
status: done
story: 8-2-punch-visual
workflow: bmad-testarch-test-design
mode: epic-level
artifacts:
  - _bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md
  - _bmad-output/test-artifacts/test-design-epic-8-2-punch-visual.md
  - _bmad-output/test-artifacts/test-design-progress.md
risks_total: 10
risks_high: 3
coverage_p0: 8
coverage_p1: 6
coverage_p2: 5
coverage_p3: 3
---

TEA Test Design for `8-2-punch-visual` completed — Epic-Level.

- Mode: epic-level (spec-8-2-punch-visual + epic-8-context + working-tree delta ef72635: src/feel + src/render/GameBoard + App wiring, engine byte-identical).
- Primary artifact: `_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md` (canonical, per `test_design_output`) + mirror at `_bmad-output/test-artifacts/test-design-epic-8-2-punch-visual.md` (per `workflow.yaml` path). Progress: `_bmad-output/test-artifacts/test-design-progress.md` (8-1 history preserved, 8-2 appended).
- Risk assessment: 10 risks (P×I, category TECH/PERF/BUS), 3 high (score ≥6: R-001 burst jank PERF 2×3, R-002 early-input orphan TECH 2×3, R-003 FR-30 gate BUS 2×3); NFR planning covers 60 FPS/never-throw/maintainability/FR-30+chrome/offline with explicit planned evidence (no PASS/FAIL — deferred to nfr-assess).
- Coverage: P0 8 groups (host unit, 8 it() already passing — light/medium/heavy/glow/reduced/non-finite/multi-merge/finite-cap), P1 6 (engine-trace→isMerge fixtures + chrome guard + overshoot preset mapping + burst scaling/gating + early-input orphan + device smoke 3/6/12+/1536 + Reduced Motion flat + preview chrome), P2 5 (cleanup/bench/static/NOOP), P3 3 exploratory; estimates ~5.5–12 h host + device → ~12–22 h elapsed, PR host gate <15 min, one 15-min real-iPhone pass pre-merge.
- sprint-status.yaml is orchestrator-owned — not written or reverted.
- No production code modified.

---
status: done
story: 8-2-punch-visual
workflow: bmad-testarch-test-design
mode: epic-level
run_date: 2026-09-07
artifacts:
  - _bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md
  - _bmad-output/test-artifacts/test-design-epic-8-2-punch-visual.md
  - _bmad-output/test-artifacts/test-design-progress.md
risks_total: 10
risks_high: 3
coverage_p0: 9
coverage_p1: 6
coverage_p2: 5
coverage_p3: 3
---

TEA Test Design for `8-2-punch-visual` completed — Epic-Level (refresh run 2026-09-07).

- Mode: epic-level (spec-8-2-punch-visual status `done` + epic-8-context + committed delta `e4629cd`: src/feel + src/render/GameBoard punch slice + App wiring, engine untouched; follow-up commits `7a85c33`/`0ba441b` and the working tree are metadata-only).
- Primary artifact (refreshed): `_bmad-output/test-artifacts/test-design/test-design-epic-8-2-punch-visual.md` (canonical, per `test_design_output`) + mirror at `_bmad-output/test-artifacts/test-design-epic-8-2-punch-visual.md` (per `workflow.yaml` path). Progress appended in `_bmad-output/test-artifacts/test-design-progress.md` (7.2 history preserved).
- Risk assessment: 10 risks (P×I, TECH/PERF/BUS), 3 high (score ≥6: R-001 burst jank PERF 2×3, R-002 early-input orphan TECH 2×3, R-003 FR-30 gate BUS 2×3) with mitigation/owner/timeline/status/verification; forward-compat notes added for landed 8-3/8-4 sharing the GameBoard main-thread budget. NFR planning covers 60 FPS/never-throw/maintainability/FR-30+chrome/offline with planned evidence (no PASS/FAIL — deferred to nfr-assess).
- Coverage: P0 9 groups (host unit, all in `punch.test.ts`, green), P1 6 (engine-trace→isMerge fixtures + chrome guard + overshoot mapping + burst scaling/gating + early-input orphan + device smoke 3/6/12+/1536 + Reduced Motion flat + preview chrome), P2 5 (cleanup/bench/static/NOOP), P3 3 exploratory; ~5.5–12.5 h host + device → ~12–22 h elapsed, PR host gate <15 min, one 15-min real-iPhone pass pre-merge.
- Verified this run: full `triade/` suite `1034 pass / 0 fail / 457 skipped` (134 suites); prior 8-1 expected-REDS resolved upstream.
- sprint-status.yaml is orchestrator-owned — not written or reverted. No production code modified.

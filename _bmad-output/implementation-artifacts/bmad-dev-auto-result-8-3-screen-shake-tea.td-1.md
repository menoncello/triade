---
status: done
story: 8-3-screen-shake
workflow: bmad-testarch-test-design
mode: epic-level
artifacts:
  - _bmad-output/test-artifacts/test-design/test-design-epic-8-3-screen-shake.md
  - _bmad-output/test-artifacts/test-design-epic-8-3-screen-shake.md
  - _bmad-output/test-artifacts/test-design-progress.md
delta_assessed: 721bf3a
date: 2026-09-01
---

TEA test design for 8-3 screen shake completed. Epic-level, risk-based.

Risk summary: 10 risks, 3 high (R-001 overlap PERF 2×3=6, R-002 FR-30 BUS 2×3=6, R-003 direction TECH 2×3=6).

Coverage: P0 9 groups (12 host it() already passing in shake.test.ts), P1 7 groups (engine-trace fixtures + App.lastDirectionRef + axis isolation + mid-flight snap + chrome + device smoke), P2 6, P3 3. Total ~11–23h elapsed.

Artifacts written to TEA test_artifacts per _bmad/tea/config.yaml (test_artifacts=_bmad-output/test-artifacts, test_design_output=_bmad-output/test-artifacts/test-design). Both canonical and workflow.yaml mirror match prior 8-1/8-2 pattern. test-design-progress.md appended.

No production code modified.

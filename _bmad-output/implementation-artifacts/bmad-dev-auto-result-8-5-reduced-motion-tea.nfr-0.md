---
status: done
gate: CONCERNS
story: 8-5-reduced-motion
workflow: bmad-testarch-nfr
date: '2026-09-01'
artifacts:
  - _bmad-output/test-artifacts/nfr-assessment-8-5-reduced-motion.md
  - _bmad-output/test-artifacts/nfr-assessment.md
  - _bmad-output/test-artifacts/traceability/gate-decision-8-5-reduced-motion.json
  - _bmad-output/test-artifacts/gate-decision.json
adr_score: '21/29'
overall_status: CONCERNS
blockers: 0
high_priority_issues: 2
evidence_gaps: 4
---

NFR assessment for 8-5-reduced-motion completed with gate CONCERNS (21/29 72% ADR, 0 FAIL, 8 CONCERNS). Host evidence GREEN for P0 9/9 + P1 6/6 + bench both profiles 2/2 (10.2ms/7.29ms total, median <0.05/p99 <0.1) + tsc clean + engine byte-identical. 2 waived P2 expected RED remain (R-006 cancelAnimation overlap score 4 + R-010 burst setTimeout orphan score 3) on same GameBoard file plus pending 15-min device smoke P1-07 — waived per spec deferred-work before verified, same precedent as 8-4. Gate decision already at _bmad-output/test-artifacts/traceability/gate-decision-8-5-reduced-motion.json (CONCERNS) and top-level gate-decision.json. Full report at _bmad-output/test-artifacts/nfr-assessment-8-5-reduced-motion.md (also copied to nfr-assessment.md per TEA default_output_file).

---
status: done
story: 8-2-punch-visual
workflow: bmad-testarch-atdd
generated:
  - triade/__tests__/feel/punch.atdd.test.ts
  - _bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual.md
red_phase:
  total: 19
  pass: 17
  fail: 2
  expected_red:
    - "[P1-05] R-002 early-input orphan safeguard — burst timer cleanup on unmount"
    - "[P2-01] burst accumulation — unmount guard missing"
full_suite:
  total: 749
  pass: 745
  fail: 4
  expected_red_includes:
    - "8-1 [P1-03] R-001 tutorial dedup (carry-over)"
    - "8-1 [P2-06] R-006 expo-haptics dep (carry-over)"
    - "8-2 [P1-05] R-002"
    - "8-2 [P2-01] R-007"
---

ATDD workflow for 8-2-punch-visual completed.

Artifacts written under TEA's configured `test_artifacts` (`_bmad-output/test-artifacts`):
- `triade/__tests__/feel/punch.atdd.test.ts` — 19 red-phase scaffolds (17 GREEN, 2 EXPECTED RED for R-002/R-007 burst timer cleanup)
- `_bmad-output/test-artifacts/atdd-checklist-8-2-punch-visual.md` — implementation checklist mapping RED scaffolds to `spec-8-2-punch-visual.md` tasks 8.2 + residual fix for burst `setTimeout(500)` unmount guard

Working-tree delta pinned: `ef72635` (`feel.ts:overshootScale` + `punch.ts` + `GameBoard isMerge/overshoot/flash/glow/burst` + `App reducedMotion` wiring); engine byte-identical.

Run `cd triade && npm test -- __tests__/feel/punch.atdd.test.ts` to verify (expect 17/19 pass, 2 RED until burst timer ref + clearTimeout on unmount is added).

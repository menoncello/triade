---
status: done
storyKey: dw-ci-gesture-wiring-docs
workflow: bmad-testarch-atdd
generatedTestFiles:
  - triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts
checklistPath: _bmad-output/test-artifacts/atdd-checklist-dw-ci-gesture-wiring-docs.md
testCount: 19
testsSkipped: 19
testsPassActivated: 19
testFramework: node:test + tsx
executionEvidence: "RED 19 skipped @ triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts; GREEN 19 pass when it.skip→it activated (O(1) predicate + DOTALL ledger + guard-order body slice)"
workingTreeDelta: "HEAD 66d711d vs baseline fa68173: package.json test/benchmark split, ci.yml engine-test-and-benchmark + benchmark job, gesture.ts 49 LOC new, App.tsx handleGestureEnd delegation, gesture-pipeline.test.ts import real wiring"
deferredWork: "DW-49,DW-50 status done 2026-09-02 resolution-undo facfde46 sprint-status.yaml untouched"
---

# ATDD dw-ci-gesture-wiring-docs — Complete

Failing acceptance tests (RED-phase `it.skip`) plus implementation checklist covering the current working-tree delta were generated under TEA's configured `test_artifacts` (`_bmad-output/test-artifacts`).

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-dw-ci-gesture-wiring-docs.md` (19 scaffolds, 7 P0 + 5 P1 + 4 P2 + 3 P3, YAML frontmatter workflowType testarch-atdd)
- Tests: `triade/__tests__/ui/ci-gesture-wiring-docs.atdd.test.ts` (267 LOC, `node:test` + `tsx`, host-only, no Playwright)
- Evidence: `bash -c 'cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/ui/ci-gesture-wiring-docs.atdd.test.ts'` → `tests 19 / skipped 19`; activated `it.skip→it` → `tests 19 / pass 19` (two green-regression fixes: P2-03 guard-order body slice, P2-04 DOTALL ledger)
- Coverage: package.json glob split, ci.yml 2-job shape, busy/success/NaN/type-gate fail-closed, valid dispatch via imported handleSwipe→game.move, WIRING secondary guard, single-helper/threshold allowlists, ledger facfde46, 10k× <80ms bench

Next: activate one `it.skip → it` at a time per Implementation Checklist task; `npm --prefix triade test` stays 852 pass / 11 fail (expected ATDD reds) + `npm run benchmark` 6 benches separate. Do not touch `sprint-status.yaml` (orchestrator-owned).

---
status: done
storyKey: dw-engine-defensive-guards
workflow: bmad-testarch-atdd
generatedTestFiles:
  - triade/__tests__/engine/defensive-guards.atdd.test.ts
checklist: _bmad-output/test-artifacts/atdd-checklist-dw-engine-defensive-guards.md
testDesign: _bmad-output/test-artifacts/test-design/test-design-dw-engine-defensive-guards.md
spec: _bmad-output/implementation-artifacts/spec-engine-defensive-guards.md
baseline: '266aa03'
head: '000b640'
workingTreeDelta: _bmad-output/implementation-artifacts/deferred-work.md DW-24/30/65 open→done 2026-09-02 + resolution-undo f115c8c241dd41f30a9433e5c90c8ba9eeaa2b0475b8319fc8a6df9dc2edea18
verification:
  dormant: 'TSX_TSCONFIG_PATH=tsconfig.test.json npm --prefix triade test -- __tests__/engine/defensive-guards.atdd.test.ts → 4 suites pass, 20 skipped (RED scaffolds dormant)'
  activated: 'python3 sed it.skip→it → TSX_TSCONFIG_PATH=tsconfig.test.json npm --prefix triade test -- __tests__/engine/defensive-guards.atdd.active.test.ts → 26 tests pass 0 fail (20 ATDD activated + 6 outer) — all P0 11/11 + P1 6/6 + P2 4/4 + P3 3/3 green when activated, proves working-tree delta implements contract'
  regression: 'npm --prefix triade test -- __tests__/game/matchScore.test.ts __tests__/render/transitionPlan.test.ts __tests__/engine/game.test.ts → 53 pass (8+13+32) byte-identical valid-paths'
  tsc: 'npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json clean; tsc --noEmit --project triade/tsconfig.test.json clean'
  manualProbe: "node --loader tsx -e \"...applyMove NaN→10,20 + moved:false 5→10,20 + plan ...from:[]→slide + undefined pendingSpawn→{1,0} + NaN spawn→1\" → 10,20 ×2 + slide plan + {value:1,displayRoll:0} not {} + board row without NaN"
sprintStatusUntouched: true
---

TEA ATDD for dw-engine-defensive-guards completed.

Artifacts:
- _bmad-output/test-artifacts/atdd-checklist-dw-engine-defensive-guards.md (20 RED-phase scaffolds, it.skip via node:test, 11 P0 + 6 P1 + 4 P2 + 3 P3; dormant 20 skipped, activated 20 pass)
- triade/__tests__/engine/defensive-guards.atdd.test.ts (NEW — 20 tests, 4 suites, covers spec I-O 10 rows + DW-24/30/65 + valid-path + draw budget + ledger)
- Spec delta: 266aa03 → 000b640 (matchScore.ts:12 NaN/Infinity/-5+noop guard, transitionPlan.ts:21 Array.isArray(from) fence, game.ts:27 sanitizePending {1,0} + safePending.value + ...safePending; spawn.ts/ceiling.ts byte-identical)
- Working-tree diff is deferred-work.md ledger only (DW-24/30/65 open→done 2026-09-02 + resolution-undo f115c8c…); sprint-status.yaml not written (orchestrator-owned).

Verification: dormant 20 skipped (RED), activated 20 pass (GREEN), regression 53 pass, both tsc clean, manual probe 10,20×2 + slide + {1,0} + board 1. Tests assert expected post-sweep behaviour — before sweep would be NaN poison / TypeError / {} loss / NaN tile; now GREEN with working-tree delta, correct TDD inversion for sweep bundle.

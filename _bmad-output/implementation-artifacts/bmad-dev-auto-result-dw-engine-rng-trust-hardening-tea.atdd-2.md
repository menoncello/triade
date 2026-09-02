---
status: done
storyKey: dw-engine-rng-trust-hardening
workflow: bmad-testarch-atdd
mode: create
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-dw-engine-rng-trust-hardening.md
generatedTestFiles:
  - triade/__tests__/engine/rng-trust-hardening.atdd.test.ts
testDesignPaths:
  - _bmad-output/test-artifacts/test-design-dw-engine-rng-trust-hardening.md
  - _bmad-output/test-artifacts/test-design/test-design-dw-engine-rng-trust-hardening.md
workingTreeDelta:
  - triade/src/engine/core/game.ts
  - triade/src/engine/core/weights.ts
  - _bmad-output/implementation-artifacts/deferred-work.md
sprintStatusUntouched: true
evidence:
  dormant: "npm --prefix triade test -- __tests__/engine/rng-trust-hardening.atdd.test.ts → 20 skipped / 0 pass (RED scaffolds dormant); full suite dormant 910 pass / 278 skipped (1188 tests)"
  activated: "it.skip→it 20 pass / 0 fail; full suite activated (swap) 930 pass / 258 skipped"
  tsc: "triade/tsconfig.json + tsconfig.test.json clean for this delta; pre-existing spawn-candidates-validation.atdd.test.ts TS2322 (8 hits) is not this bundle"
  scans: "safeRoll def 1 / total 2, normalizeDisplayRoll 3, Number.EPSILON 1+1=2, return 0.5 game 1 weights 0, Math.min(Math.max(roll 1, weights rng() 1, displayRoll: rng() 0, while rng 0, 1 - Number.EPSILON per file 1, dr >=0 && dr <1 1"
---

TEA ATDD `dw-engine-rng-trust-hardening` completed.

Artifacts written under TEA configured `test_artifacts` (`_bmad-output/test-artifacts`):

- `_bmad-output/test-artifacts/atdd-checklist-dw-engine-rng-trust-hardening.md` (716 lines, 20 RED-phase scaffolds, workflowStatus completed)
- `triade/__tests__/engine/rng-trust-hardening.atdd.test.ts` (412 lines, `it.skip` 20: 10 P0 + 4 P1 + 4 P2 + 2 P3 — host `node:test` + `tsx`)

Scope: working-tree delta `triade/src/engine/core/game.ts` (`normalizeDisplayRoll` 0.5/0/EPSILON + 2 call sites) + `triade/src/engine/core/weights.ts` (`safeRoll` clamp `[0,1-EPSILON]`) + ledger `_bmad-output/implementation-artifacts/deferred-work.md` DW-56 `0eb6ce6190c5acb9d12bf8a40d8fc456689ad334464c5ec964b0f6963b0d421e`. No production code modified beyond the hardening delta already in the tree. No `sprint-status.yaml` written (orchestrator-owned).

Risk: 9 scored (3 high ≥6: R-001 weightedPicker ≥1/Infinity/negative clamp vs fallthrough, R-002 displayRoll [0,1) NaN/Infinity leak to previewFor/HUD, R-003 draw-budget re-roll loop). NFRs: never-throw+finiteness, 40/40/20 via valid band, [0,1) correctness, single-guard maintainability, O(1) perf, 1-draw determinism.

Coverage: P0 10 tests (38 checks: negative/≥1/NaN/midpoint/finite/newGame/move/budget/bare), P1 4 (spawn/weights/game 32 + adaptive-spawn 5 + pending-spawn-contract N3 + ledger), P2 4 scans, P3 2 exploratory/bench. Effort ~3.0–5.6 h host, gate `<15 min` `npm test` + `tsc` + `rg`. `npm --prefix triade test` dormant 910 pass / 278 skipped (1188 tests) → activated 930 pass / 258 skipped (swap, 20 newly green); `rg` scans: `safeRoll def 1 total 2`, `normalizeDisplayRoll 3`, `displayRoll: rng() 0`, `const scaled = roll * total 0`, `Number.EPSILON 2`, `return 0.5 game 1`, `while rng 0` green; `sprint-status.yaml` untouched per orchestrator ownership.

Validation against `checklist.md` — prerequisites (engine RNG trust seam + helpers rngOf/spyRng/mulberry32), risk P×I with TECH/DATA/BUS/OPS, NFR thresholds with planned evidence (not final PASS), coverage matrix with levels/priorities/risk links, execution PR/Nightly/Weekly, interval estimates, quality gates P0 100% / P1 ≥95% / static 100%.

Implementation checklist maps each scaffold to `game.ts:8-18,34,110` + `weights.ts:20-30` tasks; all tasks already DONE in working tree (hardening at `3603d4d`/`6edc925`), activated 20 now GREEN. Next: `*nfr-assess` for final NFR PASS/CONCERNS/FAIL or `*automate` for broader coverage.


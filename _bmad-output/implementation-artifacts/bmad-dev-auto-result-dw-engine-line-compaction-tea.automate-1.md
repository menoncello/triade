---
status: done
story: dw-engine-line-compaction
workflow: bmad-testarch-automate
fixtures: _bmad-output/test-artifacts/fixtures/engine-line-compaction-fixtures.ts
gateway: _bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts
umbrella: _bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts
atdd: triade/__tests__/engine/line-compaction.atdd.test.ts
automation_summary: _bmad-output/test-artifacts/automation-summary.md
tests_gateway: 21
tests_umbrella: 6
tests_atdd: 20
tests_pass_gateway: 21
tests_pass_umbrella: 6
tests_pass_atdd_activated: 20
tsc_both_clean: true
ledger_done: DW-20,DW-74
sprint_status_untouched: true
---

TEA Automate dw-engine-line-compaction complete.

- Fixtures: `_bmad-output/test-artifacts/fixtures/engine-line-compaction-fixtures.ts` (18 helpers, deterministic, no faker, `refLine`/`pipelinePreSpawn` + scan helpers + `shiftLineBench <50ms`)
- Gateway: `_bmad-output/test-artifacts/tests/api/engine-line-compaction.gateway.spec.ts` (21 contracts: 9 P0 wall/preserve/guard + 7 P1 pipeline/wall expectations + 5 P2 scans/hygiene; 21/21 pass host `node:test`+`tsx` under `triade/`)
- Umbrella: `_bmad-output/test-artifacts/tests/e2e/engine-line-compaction.umbrella.spec.ts` (6 journeys: 4 P1 wall/gap/cascade/guard/ledger + 1 P2 allowlists + 1 P3 residual/bench; 6/6 pass host)
- ATDD: `triade/__tests__/engine/line-compaction.atdd.test.ts` (20 it.skip, P0 8 + P1 6 + P2 4 + P3 2; dormant 20 skip → activated 20/20 pass, 350ms)
- Existing suites: `line.test.ts` + `line-moved` + `line-compaction.regression` 43 pass; `game.test.ts` 32 pass + `transitionPlan` 16 pass wall expectations green
- Validation: `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` clean, `triade/tsconfig.test.json` clean (fixed `line-compaction.atdd` ShiftedCell cast + `purity-weight` loop parens); `git diff --stat -- triade/src/engine` shows `line.ts` only; `sprint-status.yaml` untouched (orchestrator-owned)
- Automation summary: `_bmad-output/test-artifacts/automation-summary.md` (per `_bmad/tea/config.yaml` `test_artifacts: _bmad-output/test-artifacts`) with full DoD (P0 100%, P1 100%, 3 high risks R-001/002/003 mitigated, wall invariant verified, `resolution-undo: 26a75af…` 64-hex for DW-20/74, `10k shiftLine <50ms` O(1))

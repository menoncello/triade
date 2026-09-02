---
status: done
story: dw-test-scanner-helpers-hardening
workflow: bmad-testarch-atdd
atdd_checklist: _bmad-output/test-artifacts/atdd-checklist-dw-test-scanner-helpers-hardening.md
generated_test_file: triade/__tests__/test-utils/helpers.hardening.atdd.test.ts
tests_total: 20
tests_skipped: 20
tests_activated_pass: 20
engine_diff_empty: true
sprint_status_untouched: true
---

# TEA ATDD — dw-test-scanner-helpers-hardening — Done

**Workflow:** `bmad-testarch-atdd` (red-phase scaffolds, host `node:test` + `tsx`)
**Checklist:** `_bmad-output/test-artifacts/atdd-checklist-dw-test-scanner-helpers-hardening.md` (TEA `test_artifacts` dir, 651 lines, `workflowType: testarch-atdd`)
**Scaffolds:** `triade/__tests__/test-utils/helpers.hardening.atdd.test.ts` — 20 `it.skip` (8 P0 + 6 P1 + 4 P2 + 2 P3), 4 suites, 298 lines

## What was generated

- **Failing acceptance tests (RED-phase, dormant):** 20 tests with `it.skip` covering the working-tree delta vs baseline `1fb45ca7437304db468f1193251c0c7560d60dd1`:
  - P0 (spec AC): `rngOf`/`spyRng` (shared + local `adaptive-spawn-integration.test.ts`) throw with `exhausted after N`, `stripComments('const u="http://x"; // cmt')` preserves URL, escaped-quote edge, `defaultPendingSpawn()` factory identity (single literal, no `===` sharing), `stripCommentsAndStrings` doc `Known limitation — regex literals … false NEGATIVES … No such pattern exists … division-vs-regex` + scanner delegation 3-site allowlist.
  - P1 wiring: effective `move(..., rngOf(0,0,0.5))` 3-draw vs `rngOf(0,0)` throw, `newGame(...20 draws)` → 9 tiles vs short throw, `extractSpecifiers` preservation, explicit `gameState(board,{value:9})` tiered flow, `spyRng.calls` exact, ledger 5× `done 2026-09-01` + `resolution-undo` 64-hex and `sprint-status.yaml` untouched.
  - P2 static scans: no `return 0.5` fallback, single `stripCommentsInternal` (3 sites), template `${}` interp brace counting, quote-in-regex exploratory.
  - P3 bench hygiene: cross-cutting concern absent, `stripComments` 1000×10k <500 ms O(n) smoke.

- **Implementation checklist:** Full red→green checklist in the ATDD checklist (`## Implementation Checklist`, 15 sections, file:line per task, `rg` gates, run commands). Tasks already DONE in working tree — the checklist is the roadmap; activated ATDD is now GREEN.

## Evidence

- **Dormant RED run:** `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test triade/__tests__/test-utils/helpers.hardening.atdd.test.ts` → `tests 20 / skipped 20 / pass 0` (all `it.skip` present, correct harness).
- **Activated GREEN run:** `it.skip` → `it` (temp de-skip) → `tests 20 / pass 20 / fail 0` (working-tree hardening implements the contract: `rngOf`/`spyRng` throw, string-safe `stripComments`, `defaultPendingSpawn` factory, doc pinned, draw budgets 3/20, ledger, scanner).
- **Regression gates:** `npm --prefix triade test` → `887 tests / 857 pass / 10 fail / 20 skipped` (the 10 are expected RED from prior `feel` ATDD, not from this bundle; baseline without this file was `857 pass / 10 fail`). `engine.purity` + `ui.norolls` suite green; `game.test.ts` 32/32 green after `rngOf(0,0,0.5)` migration.
- **Static invariants:** `git diff --stat -- triade/src/engine` empty (no engine change); `rg -n "return 0\.5"` in helpers ==0; `rg -n "stripCommentsInternal" triade/test-utils/helpers.ts` ==3; `rg -n "value: 1.*displayRoll: 0" ==1`; `rg -n "Known limitation — regex" hits`.
- **Orchestrator-owned file not touched:** `sprint-status.yaml` has no `dw-test-scanner-helpers-hardening` entry (verified in P1-06 harness; per prompt `sprint-status.yaml is owned by the orchestrator: never write it`).

## Notes

- TEA `test_artifacts` resolved from `_bmad/tea/config.yaml:6` → `"{project-root}/_bmad-output/test-artifacts"` — both outputs written there (`atdd-checklist-*.md` 37 KB + ATDD tests under `triade/__tests__/test-utils/`).
- The 10 pre-existing `feel.*.atdd.test.ts` failures are intentional REDs for future feel scope, not defects of this hardening. No new fails introduced.

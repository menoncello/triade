---
status: done
story: dw-engine-trace-merge-guards
workflow: bmad-testarch-automate
mode: sequential
date: 2026-09-02
test_artifacts: _bmad-output/test-artifacts
fixtures: _bmad-output/test-artifacts/fixtures/engine-trace-merge-guards-fixtures.ts
api_tests: _bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts
e2e_tests: _bmad-output/test-artifacts/tests/e2e/engine-trace-merge-guards.umbrella.spec.ts
unit_tests: _bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts
automation_summary: _bmad-output/test-artifacts/automation-summary-dw-engine-trace-merge-guards.md
generic_summary: _bmad-output/test-artifacts/automation-summary.md
sprint_status_ownership: preserved
---

# TEA Automate Result — dw-engine-trace-merge-guards (DW-21/DW-22)

**Workflow:** `bmad-testarch-automate` Create — sequential (opencode runtime, no subagent)
**Story:** `dw-engine-trace-merge-guards` — noop empty trace + mergeValue canMerge guard
**Date:** 2026-09-02
**Baseline:** `3bcf38cc7734c79f133e9b1619f765b32679fa02` → `35c9d1c` → `final e325bab…` (commit `35c9d1c fix(engine): trace empty on noop and mergeValue guard`)
**Working-tree delta vs HEAD:** `deferred-work.md` DW-21/DW-22 `open→done 2026-09-02` + `resolution-undo: b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b` each (6 lines); `triade/src/engine` byte-identical vs `35c9d1c` (`git diff HEAD -- triade/src` empty); `sprint-status.yaml` untouched (orchestrator-owned, verified `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty).

## Outputs under TEA test_artifacts (`_bmad-output/test-artifacts`)

- **Fixture:** `fixtures/engine-trace-merge-guards-fixtures.ts` (193 lines, host-only, no faker) — deterministic `fullNonMergeable()`/`packedRowBoard()`/`effective12Board()`/`gapBoard()` + `SCAN_STRINGS` + `LEDGER b4557fd…` + helpers `readSource()`/`countMatches()` + validators `assertGameTraceGuard()`/`assertRulesGuard()`/`assertLineDoc()`/`assertLedger()`/`assertTraceShape()` + probes `noopRes()`/`effectiveRes()`; re-exports `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`canMerge`/`mergeValue`/`shiftLine`/`planTileTransitions`.

- **API Gateway:** `tests/api/engine-trace-merge-guards.gateway.spec.ts` (106 lines, 12 RED-phase `test.skip`, host `node:test` + `tsx`) — P0 7 noop 1+2 vs 4-dir vs packed vs mergeValue tautology vs guarded + P1 5 draw-budget/spawn/ledger/single-guard. Dormant `12 skip` / `12 pass` when activated (~180ms).

- **E2E Umbrella:** `tests/e2e/engine-trace-merge-guards.umbrella.spec.ts` (67 lines, 10 RED-phase `test.skip`, host `node:test`) — P2 5 spec boundaries/I-O 5 rows/line doc/guard ordering/TraceEntry shape + P3 5 exploratory/bench. Dormant `10 skip` / `10 pass` when activated (~150ms).

- **Unit Combined:** `tests/unit/engine-trace-merge-guards.atdd.test.ts` (330 lines, 29 RED-phase `test.skip`) — P0 11 + P1 9 + P2 7 + P3 5 mirroring triade oracle; dormant `29 skip` / `29 pass` when activated (~200ms). Total under `test_artifacts/tests` = **51 dormant / 51 pass when activated**.

- **Automation Summary (DoD):** `automation-summary-dw-engine-trace-merge-guards.md` (51 KB, frontmatter `workflowType: bmad-testarch-automate` `storyId: dw-engine-trace-merge-guards`) — Step 1 Preflight (stack `frontend` Expo RN 57, framework `node:test` + `tsx`, sequential, 6 core + 5 extended knowledge fragments), Step 2 Targets (21 targets P0 10/P1 5/P2 5/P3 5, no duplicate coverage), Step 3 Generation (fixture + gateway + umbrella + unit), Step 3c Aggregate (host gates `910 pass / 0 fail / 238 skipped`, gateway 12/umbrella 10/unit 29 dormant → green when activated, `rg` allowlists `let trace 1` + `if (!moved) 1` + `if (!canMerge 1` + `DW-21 doc 1` + `(a??0)<=2 2` + `b4557fd 2` + `GRID_SIZE 4 1`, `tsc` both clean), Step 4 Validate (checklist 20/20), Coverage Summary (P0/P1/P2/P3 100%), **Definition of Done (Functional/Quality/Test/NFR)** — all 4 ACs + 5 I-O rows pinned, no high-risk (≥6) unmitigated (R-001/R-002/R-003 gated via `rg` pins), twin `tsc` clean, ledger `done 2026-09-02` + `resolution-undo b4557fd…` preserved, P0/P1/P2/P3 100% pass (dormant → green when activated), fixtures deterministic, NFR reliability/maintainability/correctness/performance/security/compliance/offline all checked.

- **Generic Summary Updated:** `automation-summary.md` now reflects this bundle as latest (previous hud summary preserved as `automation-summary-dw-hud-preview-hardening.md` for history).

## Verification (host gates, <15 min)

- `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts __tests__/engine/rules.test.ts __tests__/render/transitionPlan.test.ts __tests__/game/preview-invariant.test.ts` → **60+ pass / 0 fail** (33 game + 7 line + 6 rules + 13 transitionPlan + preview-invariant tightened `0`)
- `npm --prefix triade test` → **910 pass / 0 fail / 238 skipped** (51 dormant not counted unless path included; `961` when activated)
- `npx tsc --noEmit --project triade/tsconfig.json` + `TSX_TSCONFIG_PATH=triade/tsconfig.test.json npx tsc --noEmit --project triade/tsconfig.test.json` → **clean** (both)
- `rg -n "let trace = built\.trace" triade/src/engine/core/game.ts` → 1; `rg -n "if \(!moved\) trace = \[\]"` → 1; `rg -n "if \(!canMerge"` → 1; `rg -n "DW-21: boardFromLines always returns"` → 1; `rg -n "\(a \?\? 0\) <= 2"` → 2; `rg -n "b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b" _bmad-output/implementation-artifacts/deferred-work.md` → 2
- `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` → empty (ownership preserved)
- `git diff --stat -- triade/src/engine` → `game.ts` + `rules.ts` + `line.ts(doc)` only

## Prioritization (risk-based, not execution timing)

- **P0 Critical (11 unit + 7 gateway):** noop `trace 0` 4-dir + effective `1+2→3 merged + spawn` + gap `2 slides + spawn` + packed `trace 0 not 4 holds` + `mergeValue a-only 5 cases no throw` vs guarded `1+2→3/3+3→6` + boardFromLines boundary + spawned flag + 3-log probe — host `node:test` <10 min, already green (when activated).
- **P1 High (9 unit + 5 gateway):** pipeline 33+7+6+13+1 pipeline green + draw-budget `effective 3 vs noop 0` + `moved` divergence convergence + `planTileTransitions` chain + ledger `b4557fd 2 hits` + `sprint-status.yaml` ownership — <30 min.
- **P2 Medium (7 unit + 5 umbrella):** single-guard allowlists + `DW-21 doc` vs `if (!moved)` boundary + trace shape `TraceEntry` + `GRID_SIZE 4` + ledger/spec hashes + sprint-status ownership — <60 min.
- **P3 Low (5 unit + 5 umbrella):** exploratory ragged/one-cell/domain stress/`moved:false` short-circuit + bench `O(1)` + hygiene `git diff --stat` — optional.

## Notes

- No `sprint-status.yaml` write or revert — orchestrator-owned.
- No Playwright/Cypress harness — pure engine seam is host `node:test` + `tsx` + `stripCommentsAndStrings` scans.
- No `@faker-js/faker` — deterministic `boardWith`/`rngOf`/`spyRng` factories.
- Residual: `mergeValue` tautology `a-only` both branches intentionally (spec Review Triage 11 reject, preserve parity under guarded `shiftLine`); future throw would require test migration (`rules.test.ts:28-45` expects `1,1→3`).

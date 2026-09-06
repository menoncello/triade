---
title: 'Preview availability sync with POT_LADDER_DELAY=2'
type: 'bugfix'
created: '2026-09-06'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false # set by step-04 on status: done from the final review pass significance judgmentcontext: []
warnings: []
baseline_revision: '874d658'
final_revision: '916060e883fa9b95088eb22236ff73523668fa2d'
---

<intent-contract>

## Intent

**Problem:** The preview-availability integration test still expects the pre-delay pot ladder ([3,6] at ceiling 48), but potForTier with POT_LADDER_DELAY=2 yields [3] there by product-owner design, so the suite fails and FR-43 live-ceiling wiring is unpinned.

**Approach:** Update only the stale AC4/AC5 expectations in the integration test to the delay-2 ladder (tiers 0-2 collapse to [3]; widening demonstrated at ceilings 192/384/768), keeping the production mapping untouched.

## Boundaries & Constraints

**Always:** Keep production mapping (ceiling.ts, pot.ts, preview.ts, App.tsx wiring) unchanged — delay-2 is intended (product-owner request 2026-09-04, pinned by ladder-ceiling-chain.atdd.test.ts). Keep the live-ceiling derivation previewForBoard = potForTier(tierForCeiling(ceilingDetector(board))) intact. Full integration test file must pass.

**Block If:** Evidence shows the delay was unintended (requires product-owner decision).

**Never:** Change pot.ts POT_LADDER_DELAY, tierForCeiling formula, preview windowing logic, or unrelated tests. Do not edit the deferred-work ledger.

</intent-contract>

## Code Map

- `triade/__tests__/integration/preview-availability.integration.test.ts` -- stale AC5/AC4 expectations to sync with delay-2 ladder
- `triade/src/engine/core/pot.ts` -- reference only: POT_LADDER_DELAY=2 mapping (do not modify)
- `triade/src/engine/core/ceiling.ts` -- reference only: tierForCeiling (do not modify)
- `triade/src/game/preview.ts` -- reference only: ambiguousRange windowing (do not modify)
- `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` -- reference pin confirming delay-2 intent

## Tasks & Acceptance

**Execution:**
- [x] `triade/__tests__/integration/preview-availability.integration.test.ts` -- sync AC5 mapping to delay-2 ladder (24->[3], 48->[3], 96->[3], 192->[3,6], plus 384->[3,6,12] and 768->[3,6,12,24] progression pins) and rewrite AC4 widening slice to ceilings that actually widen under delay-2 (192 pending 3 -> [3,6]; 384 pending 6 -> [6,12]; 768 pending 6 -> [6,12,24]) -- restores FR-43 pin without touching production code

**Acceptance Criteria:**
- Given POT_LADDER_DELAY=2 semantics, when the integration test file runs, then all 6 tests pass
- Given ceilings 24/48/96, when availablePot is derived, then it equals [3] (tiers 0-2 collapse)
- Given ceilings 192/384/768, when availablePot is derived, then it equals [3,6] / [3,6,12] / [3,6,12,24] respectively
- Given no production file change, when git diff is inspected, then only the integration test file is modified

## Spec Change Log

## Review Triage Log

### 2026-09-06 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 15 (low 3, medium 12 — pre-existing hardening gaps outside this bundle's scope: AC3 comment breadth, vacuous `if kind==='range'` guards, AC1 fallback-path coverage, AC2/AC7 ceiling sets frozen below unlock points, off-by-one tier edges, coverage above 768, board filler realism, helper-drift pin location, inline ladder literals, low/mid/high naming, comment duplication of pot.ts math, displayRoll boundary distance, WINDOW_MAX head-cap and tail-slice pins; no finding disputes the delay-2 expected values, which the full suite confirms)
- addressed_findings:
  - none

## Verification

**Commands:**
- `npm test -- __tests__/integration/preview-availability.integration.test.ts` -- expected: all tests pass (6/6)
- `git status --short` -- expected: only the integration test file modified

## Auto Run Result

Status: done

Summary: Synced the stale AC4/AC5 expectations in triade/__tests__/integration/preview-availability.integration.test.ts to the intended POT_LADDER_DELAY=2 ladder (ceilings 24/48/96 collapse to [3]; 192 -> [3,6]; 384 -> [3,6,12]; 768 -> [3,6,12,24]; AC4 widening slices shifted to 192/384/768). No production code changed. Full triade suite green (1438 tests, 1012 pass, 0 fail, 426 skipped). Review pass: 15 pre-existing hardening gaps rejected as out of scope, no patches or defers. Commits 1617827 (test fix) + 78bc283 (spec done) on feat/epic-10-telemetria, not pushed. Deferred-work ledger untouched per orchestrator instruction.

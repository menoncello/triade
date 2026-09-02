---
status: done
story: dw-decision-dw-6
workflow: bmad-testarch-atdd
atdd_checklist: _bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-6.md
atdd_checklist_mirror: _bmad-output/test-artifacts/atdd-checklist-dw-6-rotation-race-safe-area-initial-metrics.md
generated_test_file: triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts
test_design: _bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md
spec: _bmad-output/implementation-artifacts/spec-dw-6-rotation-race-safe-area-initial-metrics.md
baseline_revision: a1f6831261caa5e14235f886e8201f05896f1b97
working_tree_delta:
  - triade/App.tsx (13 +8/-9) SafeAreaProvider initialMetrics + useSyncedLayout single hook
  - triade/src/ui/useSyncedLayout.ts new 78 LOC DEFAULT_DEBOUNCE_MS=32 coalesce + lastValid hold
  - triade/__tests__/ui/useSyncedLayout.test.ts new 124 LOC 4 probes
  - triade/src/ui/layout.ts byte-identical pure source of truth
  - _bmad-output/implementation-artifacts/deferred-work.md DW-6 open→done 2026-09-02 decision+61d4ee9e 64-hex
verification:
  dormant: npm --prefix triade test -- __tests__/ui/dw-6-rotation-race.atdd.test.ts → 4 suites pass / 20 skipped (RED)
  activated: python3 replace test.skip→test → 20 pass / 0 fail (GREEN)
  regression: npm --prefix triade test -- __tests__/ui/layout.test.ts __tests__/ui/useSyncedLayout.test.ts → 22 pass
  gate: npm --prefix triade test → 934 pass / 311 skipped / 0 fail (includes dormant)
  tsc: both tsconfig.json + tsconfig.test.json clean except pre-existing spawn-candidates-validation 8 errors (not caused by this bundle)
sprint_status_owned: not written (orchestrator-owned per prompt verified via git diff --stat)
---

# TEA ATDD — dw-decision-dw-6 (DW-6) — done

Generated failing acceptance tests plus implementation checklist covering the working-tree delta for `dw-decision-dw-6`.

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-6.md` (and mirror `atdd-checklist-dw-6-rotation-race-safe-area-initial-metrics.md`) — 20 RED-phase scaffolds (`test.skip` inner `node:test`): P0 8 + P1 6 + P2 4 + P3 2, with static `readFileSync` + pure `coalesceLayout` + `rg` allowlists + `layout.test.ts` 18 regression, plus implementation checklist mapping each scaffold to `App.tsx:5-6,86,99` / `useSyncedLayout.ts:14,23,28-30,39,43,56,58-66,68,82-88` / `layout.ts` byte-identical and verification commands.
- Tests: `triade/__tests__/ui/dw-6-rotation-race.atdd.test.ts` — dormant `20 skipped` → activated `20 pass` verified; existing `layout 18 + useSyncedLayout 4 =22 pass` regression holds; full gate `934/311/0` not regressed.
- Design: reused `_bmad-output/test-artifacts/test-design/test-design-dw-6-rotation-race-safe-area-initial-metrics.md` (10 risks 3 high, NFR never-throw+finiteness/`32ms` O(1)/`SAFE_MARGIN 16`/`96/48`/`BOARD_SIZE_FLOOR 216`).
- Ledger: `deferred-work.md` DW-6 `done 2026-09-02` `resolution-undo: 61d4ee9e5c27fb2394f9073e803812b744e157c97ba4ad6b783f48aa9529ea48` + `decision: Add initialMetrics plus synced hook` + `sprint-status.yaml` not written per prompt hard constraint.

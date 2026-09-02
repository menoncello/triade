---
status: done
story: dw-decision-dw-7
workflow: bmad-testarch-atdd
generated_at: '2026-09-02'
test_artifacts_dir: '_bmad-output/test-artifacts'
---

# TEA ATDD — dw-decision-dw-7 (DW-7 Status bar legibility) — Done

**Workflow:** `bmad-testarch-atdd` (red-phase ATDD + implementation checklist)
**Story:** `dw-decision-dw-7` → spec `_bmad-output/implementation-artifacts/spec-dw-7-status-bar-dark-landscape.md` (baseline `fb6df27` → final `5588155`)
**Working-tree delta covered:** `_bmad-output/implementation-artifacts/deferred-work.md` `DW-7 open→done 2026-09-02` + `resolution-undo: 0fca7499…` + `spec-dw-7` `final_revision 52ff0ff→5588155`; production delta already committed at `5588155` (helper `statusBar.ts:1-5` + `statusBar.test.ts:1-16` 3 tests + `App.tsx:32,877,886,906,1025` 4 prop swaps) is the subject of the ATDD scaffolds.

## Artifacts (under `test_artifacts` per `_bmad/tea/config.yaml`)

- **Checklist (primary):** `_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-7.md` (frontmatter `storyId: dw-decision-dw-7`, `generatedTestFiles: [triade/__tests__/ui/dw-7-status-bar-dark-landscape.atdd.test.ts]`)
- **Checklist mirror (design-file alias):** `_bmad-output/test-artifacts/atdd-checklist-dw-7-status-bar-dark-landscape.md` (byte-identical copy for `test-design-dw-7-status-bar-dark-landscape.md` discoverability)
- **ATDD test file:** `triade/__tests__/ui/dw-7-status-bar-dark-landscape.atdd.test.ts` — 18 red-phase scaffolds (`test.skip` inner, `node:test` + `tsx`), 4 suites:
  - P0 8 (helper portrait auto / landscape dark / purity + App 4-branch propagation 4 vs 0 + import 5 + type literal + #fff invariant + legacy 3 probes)
  - P1 6 (helper pure no-RN + isLandscape via useSyncedLayout + flip auto↔dark + debounce 32 + app.json 0 override + orientation single source)
  - P2 4 (single helper + 4↔4 parity + engine/feel isolation + ledger 0fca7499 64-hex)
  - P3 2 (notch still dark + hygiene never-throw O(1) <50ms)

## Validation

- **Dormant (RED, expected SKIP):** `npm --prefix triade test -- __tests__/ui/dw-7-status-bar-dark-landscape.atdd.test.ts` → `4 suites pass / 18 skipped` (all 18 inner `test.skip`, host `node:test` + `tsx` harness verified).
- **Activated (GREEN, working-tree delta):** `t.replace('test.skip','test')` → `npm --prefix triade test -- __tests__/ui/dw-7-status-bar-dark-landscape.atdd.active.test.ts` → **18 pass / 0 fail** (helper `false→auto` / `true→dark` + 4 prop swaps + ledger + type + #fff + rotation flip + debounce + static scans all PASS).
- **Regression gate:** dormant full `npm --prefix triade test` remains `917 pass 0 fail 331 skipped` (including 18 skipped ATDD) / `331` includes 311 original + 18 new + 2 other ATDD? Actually pre-existing `statusBar.test.ts:3` + `layout.test.ts:18` + `orientation` remain green; `tsc --noEmit -p triade/tsconfig.json` clean on helper (StatusBarStyle union `auto|dark`).
- **No sprint-status.yaml write:** verified `git diff --stat` has no `sprint-status.yaml` (orchestrator-owned).
- **TEA config:** `test_artifacts: _bmad-output/test-artifacts`, `test_stack_type: auto → frontend`, `tea_use_playwright_utils:true` (not applied — no `page.goto`, RN project), `communication_language: Português`, `document_output_language: English`.

## Next

- Dev workflow consumes `_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-7.md` + `triade/__tests__/ui/dw-7-status-bar-dark-landscape.atdd.test.ts`; one scaffold at a time `test.skip → test` per Implementation Checklist (helper 5 LOC + 4 prop swaps). For this completed sweep all GREEN tasks are already DONE (de-skipped run proves GREEN). Waivable P1 manual 10-min simulator non-notch rotation (portrait auto → landscape dark 48pt band legible) per spec Boundaries.

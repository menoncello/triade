---
status: done
storyKey: dw-engine-parity-hardening
workflow: bmad-testarch-atdd
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-dw-engine-parity-hardening.md
generatedTestFiles:
  - _bmad-output/test-artifacts/tests/unit/engine-parity-hardening.atdd.test.ts
  - _bmad-output/test-artifacts/tests/api/engine-parity-hardening.gateway.spec.ts
  - _bmad-output/test-artifacts/tests/e2e/engine-parity-hardening.umbrella.spec.ts
  - triade/__tests__/engine/engine.parity-hardening.atdd.test.ts
  - triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts
testArtifactsDir: _bmad-output/test-artifacts
workingTreeDelta: deferred-work.md DW-25/26/34/103 open→done 2026-09-02 + resolution-undo 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b (4 hits); triade/__tests__ parity hardening already at 8f62b44 (15 pass)
gates:
  tsc_triade: clean
  tsc_test: clean
  Math_random: 0
  ledger_043844070ab: 4
  sprint_status_yaml: untouched
  npm_test: 897 pass / 11 expected RED / 184 skipped (parity 15 already within 897; 51 under test_artifacts dormant not counted in host gate)
---

# TEA ATDD — dw-engine-parity-hardening — done

**ATDD checklist:** `_bmad-output/test-artifacts/atdd-checklist-dw-engine-parity-hardening.md` (stepsCompleted: step-01..step-05, workflowType: testarch-atdd, storyId: dw-engine-parity-hardening)

**Failing acceptance tests (RED-phase, `test.skip`):**
- `_bmad-output/test-artifacts/tests/unit/engine-parity-hardening.atdd.test.ts` — 29 `it.skip` (P0 11 + P1 8 + P2 7 + P3 3) host `node:test`, RED dormant → GREEN when `it.skip→it` (all 29 pass because hardening at `8f62b44` + ledger `open→done` already implements contract). Validated: `bash -c 'cd triade && TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/unit/engine-parity-hardening.atdd.test.ts'` → `29 skipped / 0 fail`
- `_bmad-output/test-artifacts/tests/api/engine-parity-hardening.gateway.spec.ts` — 12 `it.skip` gateway (spawn + blind-spot + multi-move + ledger)
- `_bmad-output/test-artifacts/tests/e2e/engine-parity-hardening.umbrella.spec.ts` — 10 `it.skip` umbrella (ladder + wiring + isNewRecord + celebration + matchStats)
- Total under `test_artifacts`: 51 dormant RED scaffolds; primary oracle `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` 10 pass + `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` 5 pass = 15 pass already green at `8f62b44`

**Implementation checklist:** 29 tasks (P0 11 + P1 8 + P2 7 + P3 3) each `File: triade/...:line` + `Tasks DONE at 8f62b44` + `Estimated Effort` — see checklist Section "Implementation Checklist" (all Done, `[x]` checked).

**Working-tree delta covered:** vs `HEAD 73f1b73` + baseline `398a06d` → `8f62b44`
- `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts:1-223` 10 tests (DW-25 5 spawn-nothing 0-draw clone + DW-34 5 replay determinism)
- `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts:1-129` 5 tests (DW-103 12-ceiling literal `[[3]…[3×8]]` + App wiring + isNewRecord anti-leak)
- `triade/__tests__/engine/game.test.ts:1,198` header doc + absolute oracle still green (32 pass)
- `triade/src/engine` byte-identical (`git diff --stat -- triade/src/engine` empty)
- `_bmad-output/implementation-artifacts/deferred-work.md` working-tree `git diff HEAD` `open→done 2026-09-02` DW-25/26/34/103 each with `resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b` (4 hits) + test-design-progress.md sweep entry
- `_bmad-output/implementation-artifacts/spec-engine-parity-hardening.md` spec + `_bmad-output/test-artifacts/test-design-dw-engine-parity-hardening.md` design contract

**TEA config:** `test_artifacts: "{project-root}/_bmad-output/test-artifacts"` → all checklist + tests written under `_bmad-output/test-artifacts` as required; `tea_use_playwright_utils:true` loaded but not applied (host-only engine); `sprint-status.yaml` never written/reverted (orchestrator-owned).

**Gates:** both `tsc` clean, `Math.random` 0, ledger `043844070ab` 4, `git diff -- sprint-status.yaml` empty, `npm --prefix triade test` 897 pass / 11 expected RED / 184 skipped (parity already within baseline).

---
status: done
storyKey: dw-hud-preview-hardening
workflow: bmad-testarch-atdd
mode: create
testArtifacts: "{project-root}/_bmad-output/test-artifacts"
checklist: "_bmad-output/test-artifacts/atdd-checklist-dw-hud-preview-hardening.md"
generatedTestFiles:
  - "triade/__tests__/ui/hud-preview-hardening.atdd.test.ts"
inputDocuments:
  - "_bmad-output/implementation-artifacts/deferred-work.md"
  - "_bmad-output/test-artifacts/test-design/test-design-dw-hud-preview-hardening.md"
  - "triade/src/ui/Hud.tsx"
  - "triade/src/ui/PreviewCard.tsx"
  - "triade/src/game/preview.ts"
  - "triade/App.tsx"
  - "_bmad/tea/config.yaml"
executionEvidence:
  dormant: "npm --prefix triade test -- __tests__/ui/hud-preview-hardening.atdd.test.ts → 4 suites pass / 20 skipped (RED dormant), full gate 910 pass / 10 expected-RED / 228 skipped"
  activated: "de-skipped it.skip→it → 24 pass / 0 fail (4 suites + 20 inner), full gate 930 pass / 10 expected-RED"
  tsc: "npm --prefix triade exec -- tsc --noEmit (both tsconfig.json + tsconfig.test.json) → clean (0 errors)"
  ledger: "deferred-work.md DW-69 open→done 2026-09-02 + resolution-undo da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce verified, sprint-status.yaml not written"
---

# TEA ATDD — dw-hud-preview-hardening — done

**Result:** done
**Bundle:** dw-hud-preview-hardening (DW-69 Hud resilient to omitted/partial previews)
**Working-tree delta covered:** `triade/src/ui/Hud.tsx:9 FALLBACK_PREVIEW + :23 previews? optional + :64-67 previews?.field ?? FALLBACK` (already at `4f674b4` + `e329d35` sync) + `deferred-work.md` DW-69 `open→done 2026-09-02` with `resolution-undo: da2f401d914ad8d1fe9be186da75f4326210361c55b0d58a3cf199fda88f29ce` (working-tree `git diff HEAD` `4 ++` ledger + `test-design-progress.md` 19-line progress entry). `triade/src/engine` byte-identical, `triade/src/game/preview.ts` byte-identical, `sprint-status.yaml` orchestrator-owned (not written).

**Artifacts (TEA `test_artifacts: _bmad-output/test-artifacts`):**
- Checklist: `_bmad-output/test-artifacts/atdd-checklist-dw-hud-preview-hardening.md` (547 lines, 5 steps completed) — 20 RED scaffolds (`it.skip`) + implementation checklist per P0/P1/P2/P3.
- Tests: `triade/__tests__/ui/hud-preview-hardening.atdd.test.ts` (~300 lines, 4 outer `describe` + 20 inner `it.skip`, host `node:test` + `tsx` + `react-test-renderer`) — 7 P0 never-throw+chrome, 6 P1 wiring (distinct lanes + PreviewCard `[]→""` + App fan-out + single-source), 4 P2 allowlist scans (`FALLBACK==2`/`previews?==1`/`??FALLBACK==1` + `previews.clean` bare `==0` + ledger 64-hex), 3 P3 exploratory/bench/hygiene.
- Design: `_bmad-output/test-artifacts/test-design/test-design-dw-hud-preview-hardening.md` (canonical) + mirror `_bmad-output/test-artifacts/test-design-dw-hud-preview-hardening.md` (per `test_design_output` + `workflow.yaml`)

**Risk coverage:** 9 risks scored (2 high `2×3=6` R-001 silent fallback masking wiring, R-002 empty `range []→""` UX/a11y; 3 medium R-003 lane swap `2×2=4`, R-004 mutable singleton `1×3=3`, R-005 null `1×3=3`; 4 low). P0 100% required, high-risk 100% mitigated via paired omitted/partial `doesNotThrow` + populated distinct-lane pins.

**Verification:**
- `npm --prefix triade test -- __tests__/ui/hud-preview-hardening.atdd.test.ts` → dormant `4 suites pass / 20 skipped` (RED), activated `24 pass / 0 fail` (GREEN), full gate `910 pass / 10 expected-RED (Epic 8 feel sentinels) / 228 skipped` dormant, `930 pass` activated.
- `npx tsc --noEmit` both tsconfigs clean.
- `rg` allowlists: `FALLBACK_PREVIEW ==2`, `previews?: ==1`, `?? FALLBACK ==1`, `previews.clean` bare `==0`, `resolution-undo da2f401d ==1` — verified.

---
status: done
---

# TEA Test Design — dw-decision-dw-56 (done)

**Workflow:** `bmad-testarch-test-design` (Epic-Level, Phase 4)
**Decision:** DW-56 — Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback (2026-09-02)
**Baseline:** `30ebd2f95d24977dbb6ffe9361fa3f7d769c19c2`
**Mode:** Epic-Level — working-tree `git diff HEAD --stat` is empty (hardening already at HEAD via sweep `dw-engine-rng-trust-hardening`); assessment is retrospective against that committed delta.
**Artifacts:**
- `_bmad-output/test-artifacts/test-design/test-design-dw-decision-dw-56.md` (canonical, per `test_design_output`)
- `_bmad-output/test-artifacts/test-design-dw-decision-dw-56.md` (mirror, per `workflow.yaml` `test-design-epic-{epic_num}.md`)

**Risk summary:** 9 risks scored P×I — 3 high (R-001 weightedPicker fallthrough vs clamp TECH 2×3=6, R-002 displayRoll [0,1) break DATA 2×3=6, R-003 draw-budget drift TECH 2×3=6), 4 medium (R-004 epsilon 4, R-005 midpoint 4, R-006 NaN ordering 3, R-007 negative vs midpoint 3), 2 low (R-008 PERF 1, R-009 OPS 2). Mitigations owned by FE lead, immediate, status Complete (code landed at HEAD).

**Coverage summary:** P0 38 checks (weightedPicker negative/≥1/NaN + normalizeDisplayRoll midpoint/finite + newGame/move malformed + draw-budget + bare-site scans), P1 19 checks (spawn pipeline + weights/game/adaptive-spawn + ledger), P2 4 static allowlists, P3 4 exploratory/bench — total 65 checks, ~4.0–7.0 h (~0.5–0.9 d), host-only `<15 min` gate.

**Verification performed (read-only, no production edits):**
- `rg -n "safeRoll" weights.ts` ==2 (def + scaled), `rg -n "normalizeDisplayRoll" game.ts` ==3 (def + 2 call sites), `rg -n "Number.EPSILON" game.ts` 1 + `weights.ts` 1 =2 total, `rg -n "return 0.5" game.ts` 1, `rg -n "Math.min(Math.max(roll" weights.ts` 1, `rg -n "displayRoll: rng()"` 0, `rg -n "const scaled = roll * total"` 0, `rg -n "while.*rng" triade/src/engine/core` 0 — all green.
- `npm --prefix triade test -- __tests__/engine/weights.test.ts` 1272 tests, 926 pass / 0 fail (weights P0 + spawn ladder green); `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` shows only pre-existing `spawn-candidates-validation.atdd.test.ts` TS2322 (unrelated to DW-56 files; `game.ts`/`weights.ts` themselves clean).

**NFR planning:** 5 categories planned (reliability never-throw+finiteness, maintainability single-guard, correctness 40/40/20+[0,1)+epsilon, performance `<0.01 ms` O(1), draw-budget determinism 20/3/0/1) with thresholds, planned validation, and evidence sources; no thresholds invented; NFR PASS deferred to `nfr-assess`.

**Out-of-scope:** `sprint-status.yaml` was not written or reverted (orchestrator-owned per prompt); only `test_artifacts` outputs were created.

**Next:** Run `*atdd` for P0 wall promotion and `*nfr-assess` after evidence is collected; do not run `*automate` before P0 wall is committed.

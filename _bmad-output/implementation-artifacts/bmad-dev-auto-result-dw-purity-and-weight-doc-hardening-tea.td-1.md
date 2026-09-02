---
status: done
---

TEA Test Design workflow `bmad-testarch-test-design` for `dw-purity-and-weight-doc-hardening` completed.

**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive
**Baseline:** `abd36bcc056bb060a867940a0afbe4d91aac2513` vs working-tree diff (`HEAD abd36bc`)
**Delta:** `pot.test.ts` PURITY_ROOTS fallback (`findFileSync`/`resolveWithFallback` mirroring `engine.purity.test.ts` `PURITY_ROOTS` `src/engine`+`src/game`) + `adaptive-spawn-integration.test.ts` DW-57 σ-budget header+4 inline docs without tolerance change (DW-58 literals preserved)

**Artifacts:**
- `_bmad-output/test-artifacts/test-design/test-design-dw-purity-and-weight-doc-hardening.md` (canonical per `test_design_output`)
- `_bmad-output/test-artifacts/test-design-dw-purity-and-weight-doc-hardening.md` (mirror per `workflow.yaml`)
- `_bmad-output/test-artifacts/test-design-progress.md` appended (step 01-05)

**Risk assessment:** 9 risks (P×I), 2 high (R-001 fallback dead-code 6, R-002 σ-comment drift 6), 3 medium (R-003 wrong-file 3, R-005 DW-58 oracle 4, R-006 verbatim oracle 3), remainder low; NFR planning: fail-closed/maintainability/60 FPS/compliance/statistical tripwire without PASS/FAIL.

**Coverage:** P0 6 groups (21/21 `pot`+`adaptive-spawn` green), P1 6 groups (mirror scan + `engine.purity` green + `tsc` both configs + ledger `resolution-undo` 64-hex), P2 4, P3 3; execution PR `<15 min` host-only; estimates ~4–6.5 h (~0.5–0.9 d).

**Validation:** Checklist `P×I` correct, high ≥6 flagged with mitigation/owner/timeline, NFR evidence planned without PASS/FAIL, P0/P1/P2/P3 criteria present with priority-not-timing note, execution PR/pre-merge/nightly-not-required, estimates as ranges, quality gates P0 100%/P1 ≥95%, no duplicate `findFileSync` predicate, single `PURITY_ROOTS_FALLBACK` + single σ header invariants, `sprint-status.yaml` never written, production `triade/src/engine` byte-identical.

**Next:** `nfr-assess` after scanner evidence, `atdd` for future `pot.ts` moves; this marker is the orchestrator completion signal (not `sprint-status.yaml`).

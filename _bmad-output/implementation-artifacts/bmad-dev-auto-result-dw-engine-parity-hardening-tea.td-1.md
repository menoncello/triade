---
status: done
---

TEA Test Design dw-engine-parity-hardening complete.

Artifacts:
- _bmad-output/test-artifacts/test-design/test-design-dw-engine-parity-hardening.md (canonical per test_design_output)
- _bmad-output/test-artifacts/test-design-dw-engine-parity-hardening.md (mirror per workflow.yaml/test_artifacts path)
- _bmad-output/test-artifacts/test-design-progress.md (appended dw-engine-parity-hardening Epic-Level section, steps 01-05)

Scope: DW-25, DW-26, DW-34, DW-103 vs baseline 398a06d → final 73f1b73 (8f62b44 on main). Working-tree delta is deferred-work.md 4 entries open→done + resolution-undo 043844070ab… (no sprint-status.yaml write, no production code change). Production delta: triade/__tests__/engine/engine.parity-hardening.atdd.test.ts 10 tests (DW-25 5 spawn-nothing full-board 0-draw clone hygiene + DW-26 header shared-bug blind-spot + absolute oracle + DW-34 5 seeded replay/draw-budget) + triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts 5 tests (DW-103 12-ceiling ladder chain + App wiring thin-view + isNewRecord sessionStart gating) + triade/__tests__/engine/game.test.ts header doc — engine byte-identical.

Risk: 10 scored (3 High ≥6: R-001 spawn-nothing clone hygiene, R-002 shared-bug blind spot, R-003 multi-move determinism+budget; 5 Medium 3-4: ladder chain/App wiring, isNewRecord alias, pool filter, deterministic helper, POT literal; 2 Low: ledger 64-hex, perf). NFRs: reliability never-throw, determinism seeded replay, maintainability single suite/availablePot, performance O(1)<0.1ms, compliance thin-view/no Math.random — planned evidence without PASS/FAIL per nfr-criteria.

Coverage: P0 11 groups (spawn-nothing 5 + header + replay identical/diverge/20-move/ladder chain/wiring/isNewRecord), P1 8 groups (hygiene sweep, draw-budget 3/0, game.test.ts 32, matchStats, thin-view), P2 7 groups (ledger 4, Math.random 0, empty-board edge, pot cap), P3 3 groups (single-def scans, bench). Estimates ~4.2–7.0h (~0.5–1.0d) host-only, no device lane. Quality gate P0 100%, P1 ≥95%, high-risk 100% mitigated.

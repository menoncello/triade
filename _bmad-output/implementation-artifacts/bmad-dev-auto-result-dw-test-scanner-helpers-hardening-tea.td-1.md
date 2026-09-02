---
status: done
epic: dw-test-scanner-helpers-hardening
workflow: bmad-testarch-test-design
outputs:
  - _bmad-output/test-artifacts/test-design/test-design-dw-test-scanner-helpers-hardening.md
  - _bmad-output/test-artifacts/test-design-dw-test-scanner-helpers-hardening.md
progress: _bmad-output/test-artifacts/test-design-progress.md
spec: _bmad-output/implementation-artifacts/spec-test-scanner-helpers-hardening.md
risks: 10
high: 3
---

TEA Test Design done for dw-test-scanner-helpers-hardening.

- Mode: Epic-Level (Phase 4) sweep bundle — assessed working-tree vs 1fb45ca baseline (spec baseline_revision). No engine change (git diff --stat -- triade/src/engine empty); deferred-work DW-3/48/59/60/66 resolved to done.
- Outputs: canonical `_bmad-output/test-artifacts/test-design/test-design-dw-test-scanner-helpers-hardening.md` + mirror `_bmad-output/test-artifacts/test-design-dw-test-scanner-helpers-hardening.md`; progress appended to `_bmad-output/test-artifacts/test-design-progress.md`.
- Risk Assessment: 10 risks scored P×I (1–9), 3 high (R-001 draw-budget fail-fast 2×3=6, R-002 single-parser drift 2×3=6, R-003 regex mode-desync false NEGATIVE 2×3=6), all high have mitigation/owner/timeline.
- NFR Planning: fail-fast vs never-throw, maintainability single parser/single literal/5-site allowlist+64-hex ledger, performance <1 ms, compliance scanner green+regex doc, offline unchanged — thresholds extracted, unknowns marked not guessed, evidence sources identified without PASS/FAIL.
- Coverage Plan: P0 7 groups (throw pins + string-safe stripComments + defaultPendingSpawn + scanner green), P1 6 groups (3-draw/20-draw fixtures + extractSpecifiers preservation + tiered gameState + ledger), P2 4 static scans, P3 3 exploratory; priorities assigned P0–P3 with test levels Unit/Integration/Static, no duplicate coverage.
- Execution Strategy: PR <15 min host-only (smoke <5 min, P0 <10 min, P1 <30 min, P2/P3 <60 min), no device lane, nightly not required — philosophy "run everything in PRs if <15 min".
- Estimates: ~4–6 h (~0.6–0.9 d) as ranges, no false precision; Quality Gates P0 100%/P1 ≥95%/high-risk 100% mitigated/coverage ≥80%+scanner 100%.
- Checklist: validated against `checklist.md` — mode, context, risk scoring, NFR planning, coverage deduplication, execution simplicity, interval estimates, output locations all green. No production code modified.

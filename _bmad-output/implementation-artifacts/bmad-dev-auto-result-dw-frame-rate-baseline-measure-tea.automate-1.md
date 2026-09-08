---
status: done
---

# Dev-auto result — dw-frame-rate-baseline-measure — TEA automate-1

Workflow `bmad-testarch-automate` (Create, sequential) completed 2026-09-07.

## Artifacts (under TEA `test_artifacts` = `_bmad-output/test-artifacts/`)

- `automation-summary-dw-frame-rate-baseline-measure.md` — full workflow record + Definition-of-Done (all boxes checked)
- `coverage-matrix-dw-frame-rate-baseline-measure.json` — P0 10 + P1 6 + P2 4 machine-readable map
- `fixtures/dw-frame-rate-baseline-measure-fixtures.ts` — RN-free replica + deterministic builders + GUARDS + scan helpers (reusable by DW-32)
- `tests/unit/frame-rate-baseline-measure.unit.spec.ts` — 6 dormant RED (`test.skip`)
- `tests/api/frame-rate-baseline-measure.gateway.spec.ts` — 9 dormant RED (source-contract; no HTTP surface exists)
- `tests/e2e/frame-rate-baseline-measure.umbrella.spec.ts` — 5 dormant RED (host journey wrappers; no browser harness exists)

## Evidence

- Dormant: 20 skipped / 0 fail. Activated (/tmp copies, repo untouched): 20 pass / 0 fail.
- RED proven: 5 wiring guards fail pre-fix `6b16593`, pass at HEAD (source-level, no tree mutation).
- Full suite: 1491 tests · 134 suites · 1034 pass · 0 fail · 457 skipped. `tsc --noEmit` clean.
- Zero churn in `triade/**`; `deferred-work.md` and `sprint-status.yaml` untouched (orchestrator-owned).

## Residual (not this workflow's to close)

- MANUAL one-screenshot re-measurement (P1-UMB-01 pin, owner Eduardo) — device publish proof stays open; budget verdict `STILL NO VERDICT`.
- Deferred math families (off-by-one p99 leniency, negative-delta) routed to DW-32/probe-math.

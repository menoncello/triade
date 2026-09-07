---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-04e-aggregate-nfr', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-09-07'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md'
  - '_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design-dw-frame-rate-baseline-measure.md'
  - 'triade/src/render/useFrameRateBaseline.ts'
  - 'triade/__tests__/render/useFrameRateBaseline.math.test.ts'
  - 'triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts'
  - 'triade/App.tsx'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
  - '.claude/skills/bmad-testarch-nfr/resources/knowledge/nfr-criteria.md'
  - '.claude/skills/bmad-testarch-nfr/resources/knowledge/ci-burn-in.md'
---

# NFR Evidence Audit — dw-frame-rate-baseline-measure

**Date:** 2026-09-07
**Story:** dw-frame-rate-baseline-measure (sweep bundle; DW-16 / DW-32 shared readout)
**Overall Status:** CONCERNS ⚠️ (non-blocking)

---

Note: This audit summarizes existing implementation evidence; it does not run tests or CI workflows. NFR thresholds come from the test-design NFR plan (`test-design-dw-frame-rate-baseline-measure.md`) and the T5.2 runbook. No thresholds were guessed — every UNKNOWN is marked and yields CONCERNS per the default rule.

## Scope assessed (working tree vs HEAD)

- Tracked diff vs `HEAD`: ledger-only — `_bmad-output/implementation-artifacts/deferred-work.md` (DW-16/DW-32 `open→done 2026-09-06`, `resolution: resolved by sweep bundle dw-frame-rate-baseline-measure`, `resolution-undo` present for both).
- `git diff HEAD --stat -- triade/`: empty. Committed bundle delta (`6b16593` → `HEAD`): `triade/src/render/useFrameRateBaseline.ts` (+41/−14), new `triade/__tests__/render/useFrameRateBaseline.math.test.ts`, spec + evidence docs; `triade/App.tsx` untouched.
- Untracked: `triade/__tests__/render/frame-rate-baseline-measure.atdd.test.ts` (dormant RED scaffolds, all `it.skip` — zero runtime effect) + prior TEA workflow outputs. No production-code change by this workflow (read-only verification).
- `sprint-status.yaml` untouched (orchestrator-owned; never written, never reverted).

## Execution mode

Requested `auto` (config `tea_execution_mode: auto`, probe on). Resolved **`sequential`**: the bundle scope is a 2-file hook fix plus metadata, and all four domain audits read the same already-loaded evidence — parallel workers would only re-read identical files. Finding contracts below match the step-04a–04d worker outputs.

## Executive Summary

**Assessment:** 1 PASS, 2 CONCERNS, 0 FAIL (Security N/A — no applicable surface)

**Blockers:** 0 — release builds untouched, probe is `__DEV__`-observable only, and device frame readings are informative-only per project rule (never a PR gate).

**High Priority Issues:** 0. Two MEDIUM residuals share one owner and one closing run (R-001).

**Recommendation:** Accept with CONCERNS (non-blocking). The probe fix is strictly safer than the code it replaces; the only open item is the one-screenshot re-measurement that proves it on device. Route the p99-verdict and probe-math follow-ups to DW-32 as already planned.

---

## NFR Thresholds (from test-design NFR plan — Step 2)

| NFR Category | Requirement / Threshold | Source | Status |
|--------------|------------------------|--------|--------|
| Performance | p99 < 16.7ms, fps ≥ 59 on 60Hz (T5.2 runbook) | test-design NFR plan + `1-1-device-gates-runbook.md` | UNKNOWN actual → CONCERNS |
| Reliability | Probe publishes within ~2s of board-window start; never latches `recording…` forever on a transient empty window | test-design NFR plan (spec EMPTY_WINDOW / RERENDER_CHURN) | Partially evidenced → CONCERNS |
| Maintainability | Frame math pure + testable; WINDOW/math pinned by guards; zero logging in worklets/frame math; `tsc` clean + suite green | test-design NFR plan + project-context hard rules | Met → PASS |
| Security / Compliance | None in scope (no auth, PII, export-control surface touched) | test-design NFR plan | N/A |

**Unknown thresholds:** none invented. The budget verdict is explicitly UNKNOWN pending re-measurement — the only on-record numbers remain the 2026-08-10 simulator informative reading (Mac GPU, not device evidence).

---

## Evidence gathered (Step 3 — fresh host verification 2026-09-07)

| # | Evidence | Result |
|---|----------|--------|
| E1 | `cd triade && npx tsc --noEmit` | ✅ clean, exit 0 |
| E2 | `cd triade && npm test` (full suite incl. new math test) | ✅ 1491 tests · 134 suites · 1034 pass · **0 fail** · 457 skipped |
| E3 | `grep -c "console\." src/render/useFrameRateBaseline.ts` | ✅ 0 — release hard rule holds |
| E4 | `grep -rn "console\." src/render/ src/feel/` | ✅ empty — no worklet/frame-math logging |
| E5 | `grep "const WINDOW" src/render/useFrameRateBaseline.ts` | ✅ `const WINDOW = 120` — Never-constraint pin holds |
| E6 | `App.tsx`: `useFrameRateBaseline` ×2, `computeFrameRateStats` ×0 | ✅ consumer boundary intact, math lives in hook module |
| E7 | Evidence file `shared with DW-32` ×3, `STILL NO VERDICT` ×1 | ✅ verdict-open + shared flags present |
| E8 | `deferred-work.md` `resolution-undo` present (79 hits file-wide; DW-16 + DW-32 entries) | ✅ reversible-close hygiene |
| E9 | Simulator/device readout post-fix | ⚠️ MISSING by design (diagnosis branch — no new build attempted) |
| E10 | Crash/redbox across all recorded runs (2026-09-06 + 2026-09-07 + this audit) | ✅ none |

---

## Performance Assessment — CONCERNS ⚠️

- **Status:** CONCERNS ⚠️
- **Threshold:** p99 < 16.7ms, fps ≥ 59 on 60Hz (T5.2 runbook).
- **Actual:** UNKNOWN — zero completed post-fix frame samples by design; no numbers invented. Only pre-existing reading: 2026-08-10 simulator informative (60 fps · p99 16.67ms, Mac GPU).
- **Evidence:** E9 (missing by design) + `dw-16-frame-rate-baseline-evidence.md` ("STILL NO VERDICT").
- **Findings:** Per the default rule (UNKNOWN actual → CONCERNS, never PASS), performance cannot pass until the one-screenshot re-measurement publishes a `baseline:` line. Not FAIL: no SLO breach is evidenced, and the off-by-one p99 leniency (R-002, pre-existing, owned by DW-32) is locked truthfully by the 119-shape test rather than fixed here.
- **Recommendation:** Run the one-screenshot protocol (evidence file §"Re-measurement protocol"; owner Eduardo; ~10–20 min). If `recording…` persists past 30s → device-log investigation (Reanimated/runtime), not a blind re-run.

## Security Assessment — N/A

- **Status:** N/A — no auth, authorization, secret, PII, or export-control surface in the diff (hook math + dormant test scaffolds + evidence/ledger docs). No thresholds apply; nothing to scan.
- **Evidence:** `git diff 6b16593 HEAD --stat -- triade/` (2 files, both probe-side) + E3/E4 (no logging added anywhere in the frame path).

## Reliability Assessment — CONCERNS ⚠️

- **Status:** CONCERNS ⚠️
- **Threshold:** probe publishes within ~2s of board-window start; transient empty window retries instead of latching `recording…` forever.
- **Actual:** fix applied + unit-guarded, **unproven on device** (R-001). Empty→null + reset path locked by test (7/7 math suite green inside E2); memoized `onFrame` + null-check + `count.current = 0` / `durations.current = []` / `last.current = 0` guards verified in source.
- **Evidence:** E2 (0 fail), hook source `useFrameRateBaseline.ts:48-69`, evidence file diagnosis (F1/F2).
- **Findings:** Retry-on-empty is strictly better than the old permanent latch, and no crash/redbox accompanied any run (E10) — hence not FAIL. Downgraded from PASS because runtime publish is still unobserved post-fix and the degenerate-clock family (R-003) is deferred to DW-32/probe-math.
- **Recommendation:** same single closing run as Performance (closes both). Keep the 30s escalation rule.

## Maintainability Assessment — PASS ✅

- **Status:** PASS ✅
- **Threshold:** pure testable math; WINDOW/math pinned; zero frame-path logging; `tsc` clean; suite green; engine gate intact.
- **Actual:** all met — `computeFrameRateStats` exported pure (byte-identical formulas); WINDOW + memoization + reset guards green; E1 clean; E2 0 fail (incl. 26 engine gate tests inside the full run); E3/E4/E5/E6 green.
- **Evidence:** E1–E6, E8.
- **Findings:** One follow-up (not a downgrade): guard brittleness R-004 — wiring asserts on source text and math via a local re-implementation because the RN-importing hook is unimportable under the tsx runner. Recommendation: extract math to an RN-free pure module so tests import the real function (owner Eduardo, with DW-32).

---

## Cross-domain risk

- **Performance × Reliability (R-001, MEDIUM):** both CONCERNS trace to the same residual — fix unproven on device. One screenshot run closes both; no compounding beyond that.

## Quick Wins

1. **Run the one-screenshot re-measurement** (Performance/Reliability) — HIGH value, ~10–20 min, owner Eduardo. Closes both CONCERNS or converts R-001 into a bounded device-log investigation.
2. **No code action needed** — retry path and memoization are already the safe defaults; no config change required.

## Recommended Actions

### Immediate (before DW-32 math work) — MEDIUM
1. **One-screenshot simulator re-measurement** — MEDIUM — ~0.5h — Eduardo. Steps: boot dev build with `EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1` (seed 20260808), ~10s board play, one screenshot of the `baseline:` line; record seed/build/verbatim text. Validation: `baseline: <fps> fps · p99 <p99>ms · <n> frames` visible, or `recording…` >30s → open device-log investigation.

### Short-term (with DW-32) — LOW
2. **Transfer off-by-one + negative-delta ownership to DW-32/probe-math** — LOW — docs only — Eduardo. The 119-shape test is the regression pin; any math change must update it deliberately.
3. **Extract frame math to an RN-free pure module** (kills R-004 guard brittleness) — LOW — ~1–2h — Eduardo. Validation: new tests import `computeFrameRateStats` directly; source-shape guards retired.

### Monitoring hooks
- Probe already self-monitors: permanent `recording…` is the visible alert. Keep the 30s escalation rule as the alerting threshold (owner Eduardo).
- No APM/Sentry changes needed — I/O errors route to the existing global handler → Crashlytics per project rule.

### Fail-fast mechanisms
- Empty-window retry (shipped in this bundle) is the fail-fast mechanism: degenerate windows reset instead of wedging the probe. No further circuit-breaker/rate-limit surface exists in this bundle.

---

## Evidence Gaps

- [ ] **Post-fix fps/p99 readout** (Performance/Reliability)
  - **Owner:** Eduardo
  - **Deadline:** 2026-09-08 (per test-design R-001 timeline)
  - **Suggested Evidence:** one screenshot + seed/build record in `dw-16-frame-rate-baseline-evidence.md`
  - **Impact:** budget verdict stays UNKNOWN; DW-32 device verdict stays open (by design, not a regression)

---

## Findings Summary (ADR Quality Readiness Checklist lens, bundle-scoped)

| Category | Result | Notes |
|----------|--------|-------|
| 1. Testability & Automation | PASS | 7/7 math checks + dormant ATDD scaffolds; host suite 0 fail |
| 2. Test Data Strategy | PASS | Seeded session (20260808) deterministic, recorded twice-identical |
| 3. Scalability & Availability | N/A | Single-device probe; no scale surface |
| 4. Disaster Recovery | N/A | No DR surface (offline game, no backend) |
| 5. Security | N/A | No applicable surface touched |
| 6. Monitorability/Debuggability/Manageability | CONCERNS | Probe observable (`recording…` vs `baseline:`) but post-fix publish unobserved |
| 7. QoS & QoE | CONCERNS | p99/fps budget verdict UNKNOWN by design |
| 8. Deployability | PASS | Release untouched; harness `__DEV__`-only; no TestFlight/App Store action |

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-09-07'
  story_id: 'dw-frame-rate-baseline-measure'
  feature_name: 'frame-rate baseline probe hardening (DW-16/DW-32)'
  categories:
    performance: 'CONCERNS'
    security: 'N/A'
    reliability: 'CONCERNS'
    maintainability: 'PASS'
  overall_status: 'CONCERNS'
  critical_issues: 0
  high_priority_issues: 0
  medium_priority_issues: 1
  concerns: 2
  blockers: false
  quick_wins: 1
  evidence_gaps: 1
  recommendations:
    - 'Run the one-screenshot re-measurement (closes Performance + Reliability CONCERNS or opens a bounded device-log investigation)'
    - 'Transfer off-by-one + negative-delta probe-math ownership to DW-32 (119-shape test is the regression pin)'
    - 'Extract frame math to an RN-free pure module so tests import the real function (retire source-shape guards)'
```

---

## Related Artifacts

- **Spec:** `_bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md`
- **Evidence:** `_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md`
- **Test Design:** `_bmad-output/test-artifacts/test-design-dw-frame-rate-baseline-measure.md`
- **Runbook:** `_bmad-output/implementation-artifacts/1-1-device-gates-runbook.md` (T5.2 budget)
- **Evidence Sources:** host suite + `tsc` (this run); simulator screenshots + device logs (prior runs, in evidence file)

---

## Recommendations Summary

**Release Blocker:** none — 0 FAIL, 0 blockers. Release builds are byte-identical in behavior (hook-only probe change, no harness shipped, no logging added).

**High Priority:** none.

**Medium Priority:** one-screenshot re-measurement (R-001) — scheduled 2026-09-08, owner Eduardo.

**Next Steps:** hand the gate YAML + evidence-gap entry to the orchestrator; proceed to `trace`/release-gate when ready. Re-run `*nfr-assess` after the screenshot run to flip Performance/Reliability to PASS (or scope the device-log investigation).

---

## Sign-Off

**NFR Evidence Audit:**

- Overall Status: CONCERNS ⚠️ (non-blocking)
- Critical Issues: 0
- High Priority Issues: 0
- Concerns: 2 (Performance, Reliability — shared R-001 residual)
- Evidence Gaps: 1 (post-fix readout; owner + deadline assigned)

**Gate Status:** ⚠️ CONCERNS — proceed; not a release blocker.

**Next Actions:**

- If PASS ✅: Proceed to `*gate` workflow or release
- If CONCERNS ⚠️: Address HIGH/CRITICAL issues, re-run `*nfr-assess` ← (no HIGH/CRITICAL here; single MEDIUM closing run scheduled)
- If FAIL ❌: Resolve FAIL status NFRs, re-run `*nfr-assess`

**Generated:** 2026-09-07
**Workflow:** testarch-nfr v5.0 (sequential mode; TEA / Murat — Master Test Architect)

---

<!-- Powered by BMAD-CORE™ -->

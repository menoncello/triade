---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-06'
---

# Test Design: Epic 10-6 — Gate de calibração da curva (dono: Eduardo)

**Date:** 2026-09-06
**Author:** Eduardo (TEA Test Architect)
**Status:** Draft
**Mode:** Epic-Level (story spec + working-tree diff on branch `feat/epic-10-telemetria`)
**Scope:** Changes in commit `20b91aa` (+ `a071db1` frontmatter): pure `evaluateCalibrationGate` evaluator, `calibration-gate.test.ts` (12 tests), runbook `docs/calibracao-da-curva.md`, decision-log template `docs/decisoes/calibracao-10-6-PADRAO.md`. No tracked modification to engine core or `spawnConfig.ts` data in this change (retune surface is future work gated by Eduardo).

**Risk Summary:**

- Total risks identified: 8
- High-priority risks (≥6): 3 (R-001, R-002, R-004)
- Critical categories: DATA (no automated feed; operator-supplied numbers), TECH (curve-invariant breakage on future retune), BUS (false retune / missed retune from bad summaries)

**Coverage Summary:**

- P0 scenarios: 7 (unit, `node --test`) — ~4-8 hours
- P1 scenarios: 6 (unit + boundary/ladder guards) — ~4-8 hours
- P2 scenarios: 4 (docs/runbook + CI wiring + diff-guard verification) — ~3-6 hours
- P3 scenarios: 2 (exploratory fuzz/property) — ~1-3 hours
- **Total effort**: ~12-25 hours (~0.5-1.5 weeks elapsed for a single QA/dev pairing, mostly verification, not new test authoring — the 12 gate tests + 8 spawn-config tests already exist and pass)

**Evidence (collected 2026-09-06, read-only):**

- `node --test __tests__/engine/calibration-gate.test.ts` → 12 pass / 0 fail
- `node --test __tests__/engine/spawn-config.test.ts` → 8 pass / 0 fail
- Full `npm test` still shows the known pre-existing `preview-availability.integration.test.ts` failure (deferred as DW-114, unrelated to this change — see spec Verification section)
- `git status` confirms no file under `triade/src/engine/core/` modified; only new files + spec frontmatter

---

## Not in Scope

| Item | Reasoning | Mitigation |
| ---- | --------- | ---------- |
| **Telemetry pipeline itself (events 10.2/10.3, dashboards, Firebase observer)** | Owned by stories 10-2/10-3; this gate consumes pasted summaries, never fetches | Covered by 10-2/10-3 test plans; gate treats absent data as `unknown` by design |
| **Actual retune values / playtest baseline numbers** | Eduardo's judgment; template marks every value OPERATOR / TBD, no invented numbers | Operator-action checklist in spec; decision log requires source/window per metric |
| **Engine rules (`spawn.ts`, `weights.ts`, `pot.ts`, `ceiling.ts`)** | Explicit boundary: engine never modified | Diff-guard + `validateSpawnConfig` + purity tests |
| **Preview windows 50-30-20 renormalization UI** | Lives in epic prose + `preview.ts` observer; no change in this diff | Regression via existing spawn-config + preview suites |
| **Store submission / privacy (10-5) / consent (10-4)** | Separate stories, already done/live | Out of this plan; no dependency |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-001 | DATA | Operator pastes wrong-window or mistyped dashboard summaries (p50s, median tier, clog) → false `retune` (needless curve churn) or false `ok` (missed degradation) | 2 | 3 | 6 | Runbook mandates same-window extraction + source/window recorded per metric; decision log schema requires fonte/janela; second-eyes check by Eduardo before any retune edit; gate returns partial `reasons` alongside `missing` so partial signal is visible | Eduardo (operator) | Before first real evaluation |
| R-002 | TECH | A future retune edit to `spawnConfig.ts` breaks curve invariants (pot share ≠ 0.2 ± epsilon, non-strict-decrease, non-2^k key, effective-curve fallback violation, fixed-sum drift) → warped spawn distribution ships | 2 | 3 | 6 | `validateSpawnConfig` rejects with listed violations; existing 8 spawn-config tests + 12 gate tests run in CI (`npm test -- calibration-gate && npm test -- spawn-config && npx tsc --noEmit`); startup fail-fast guard throws on invalid shipped defaults; procedure discards rejected candidates | Dev | Continuous (CI gate) |
| R-004 | DATA | No automated telemetry feed in repo (10.2/10.3 pipeline not present) → gate permanently `unknown`, calibration never happens | 3 | 2 | 6 | Accept as designed: `unknown` blocks retune safely (never defaults to retune); operator-action checklist tracks dashboard availability; do NOT build fetching into the gate (keeps it pure/testable offline) | Eduardo / PM | Before first calibration window |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-003 | TECH | Retune touches `triade/src/engine/core/` (boundary violation) instead of data-only `spawnConfig.ts` | 1 | 3 | 3 | Diff review rule (only `spawnConfig.ts` + docs/log may change); import rule (`src/engine` pure TS, UI never imports core); CI + reviewer checklist | Dev reviewer |
| R-005 | BUS | Thresholds 25s / 210s / 1-tier-drop miscalibrated vs real players → over-trigger (churn on healthy curve) or under-trigger (stale curve) | 2 | 2 | 4 | Thresholds pinned by constant test; first 1-2 real evaluations treated as calibration of the gate itself; log records verdict + decision so drift is auditable | Eduardo |
| R-006 | OPS | Decision log skipped or before/after values omitted → untraceable tuning, repeat debates | 2 | 2 | 4 | Template `calibracao-10-6-PADRAO.md` with required fields (data, métricas antes, veredito, decisão+aprovador, antes/depois, revalidação); PR review rejects retune without log entry | Dev / Eduardo |
| R-007 | TECH | Ladder edge cases misread (off-ladder values, baseline above current growth shown as negative drop, tiles beyond 384) → wrong verdict | 2 | 2 | 4 | `tierIndex` nearest-lower-tier rule tested (50→48, 100→96); drop is baseline-minus-current so growth never triggers; `buildLadder` extends to max(seen) so ladder covers observed range | Dev (done — tests pass) |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-008 | PERF | Gate adds runtime cost | 1 | 1 | 1 | Monitor — pure function, no I/O, O(ladder) ≤ ~12 entries; zero hot-path use (operator-invoked only) |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture 10-6 NFR thresholds and planned validation. No final PASS/CONCERNS/FAIL here — deferred to `nfr-assess` once real evaluation evidence exists.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
| ------------ | ----------------------- | --------- | ------------------ | --------------- |
| Reliability | Missing/invalid input → `unknown`, `needsRetune: false`, `missing[]` named; never throws on null summary | R-004 | Existing unit tests: empty summary, missing baseline, null summary, non-positive values | `calibration-gate.test.ts` 12/12 pass (collected) |
| Maintainability | Pure, dependency-free evaluator; constants pin spec values; `no-throw` in `src/engine` preserved (returns result object) | R-002 | Static: `tsc --noEmit` clean; lint `no-throw` on engine; reviewer diff check | tsc clean (per spec); test run output |
| Reliability | Retune candidate rejected unless `validateSpawnConfig` ok (pot share, strict decrease incl. effective curve, 2^k keys, fixed-sum) | R-002 | Existing `spawn-config.test.ts` 8/8 + gate invalid-candidate test; CI revalidation command | spawn-config 8/8 pass (collected); CI log on retune PRs |
| Operability | Every evaluation + retune logged with before/after + revalidation result | R-006 | Manual review of `docs/decisoes/` entry against schema on first real use | Filled decision-log entry |

**Unknown thresholds:** None invented. The playtest baseline (`maxTileMedianBaseline`) and all window metrics are OPERATOR-supplied TBDs in the template — correctly marked, not defaulted. Threshold constants themselves (25s / 210s / 1-tier) come from the spec/epic-context and are pinned by test.

---

## Entry Criteria

- [ ] Spec `spec-10-6-gate-de-calibracao-da-curva-dono-eduardo.md` (rev `20b91aa`) agreed as scope
- [ ] `calibrationGate.ts` + `calibration-gate.test.ts` + runbook + template present in tree (done)
- [ ] Node test runner available for `triade/__tests__/engine/` (done — evidence above)
- [ ] Operator-action checklist acknowledged by Eduardo (dashboard access for first-merge p50, first-gameover p50, max-tile mediana, same window)

## Exit Criteria

- [ ] All P0 tests passing (12 gate + 8 spawn-config — currently passing)
- [ ] No open high-priority items unmitigated: R-001/R-006 await first real operator evaluation (tracked, not blocking merge of the gate itself); R-002 mitigated by CI
- [ ] Diff-guard holds: no `triade/src/engine/core/` modification (verified via `git status`)
- [ ] Decision-log template present with OPERATOR placeholders and no invented numbers (verified)
- [ ] Pre-existing `preview-availability` failure remains deferred as DW-114 (not introduced here)

## Project Team

| Name | Role | Testing Responsibilities |
| ---- | ---- | ------------------------ |
| Eduardo | Owner / Operator | Supplies dashboard summaries, approves/fills decision log, owns threshold judgment |
| Dev | Implementer | Keeps gate pure + data-only boundary, runs revalidation, enforces CI gate |
| QA / TEA | Test design | This plan; verifies coverage matrix; confirms exit criteria |

---

## Test Coverage Plan

Note: P0/P1/P2/P3 = priority/risk, NOT execution timing. Execution timing is defined once in Execution Strategy below.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk (≥6) + No workaround.
**Purpose**: Gate correctness — wrong verdict directly causes needless retune or missed degradation.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Breach first-merge p50 alone (>25s) → `retune` + reasons | Unit | R-001, R-005 | 1 | Dev (done) | Exists: `breach first-merge p50 alone` |
| Breach first-gameover p50 alone (>210s) → `retune` + reasons | Unit | R-001, R-005 | 1 | Dev (done) | Exists |
| Max-tile drop ≥2 tiers (96→24) → `retune` | Unit | R-001, R-005 | 1 | Dev (done) | Exists |
| All within bounds → `ok`, empty reasons/missing | Unit | R-005 | 1 | Dev (done) | Exists |
| Missing fields → `unknown`, `needsRetune: false`, missing[] listed (incl. missing baseline) | Unit | R-004 | 1 | Dev (done) | 4 sub-cases + baseline case in one test |
| Invalid retune candidate rejected via `validateSpawnConfig` (bad key, non-decrease, sum drift) + shipped defaults accepted | Unit | R-002 | 1 | Dev (done) | 3 rejection + 1 acceptance in one test |
| Threshold constants pinned (25 / 210 / 1) | Unit | R-005 | 1 | Dev (done) | Guards spec drift |

**Total P0**: 7 tests (all exist, all pass)

### P1 (High)

**Criteria**: Important features + Medium risk (3-4) + Common workflows.
**Purpose**: Boundary and defensive-input confidence.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Boundary equality (== threshold) is `ok`, not breach | Unit | R-005 | 1 | Dev (done) | Exists |
| 1-tier drop `ok`, 2-tier drop `retune` (96→48 vs 96→24) | Unit | R-007 | 1 | Dev (done) | Ladder-index semantics |
| Off-ladder values resolve to nearest lower tier (50→48, 100→96) | Unit | R-007 | 1 | Dev (done) | Exists |
| Null summary → `unknown`, never throws | Unit | R-004 | 1 | Dev (done) | Optional-chaining guard (review patch) |
| Non-positive inputs (−5, 0) count as missing, never `ok` | Unit | R-004 | 1 | Dev (done) | `isUsableNumber` positivity guard (review patch) |
| Retune diff-guard: only `spawnConfig.ts` + docs/log change; `core/` untouched | Manual review + `git status`/`git diff --stat` | R-003 | 1 | Reviewer | Verified for this change; re-verify on every future retune PR |

**Total P1**: 6 scenarios (5 automated-done + 1 review-guard)

### P2 (Medium)

**Criteria**: Secondary features + Low risk (1-2) + Edge cases.
**Purpose**: Operability of the human process around the gate.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Runbook completeness: thresholds table, Eduardo summary flow, data-only procedure, log schema, revalidation command | Manual doc review | R-001, R-006 | 1 | QA | `docs/calibracao-da-curva.md` verified present; check clog12 marked informational-only |
| Decision-log template has OPERATOR placeholders, no invented numbers | Manual doc review | R-006 | 1 | QA | `calibracao-10-6-PADRAO.md` verified; re-check on first filled entry |
| CI revalidation wiring: `calibration-gate && spawn-config && tsc --noEmit` fails CI on invalid candidate | CI config review | R-002 | 1 | Dev | `.github/workflows/ci.yml` engine-test-and-benchmark gate; trigger once with a deliberately bad candidate in a scratch branch (do not merge) |
| Partial-signal behavior: present-metric reasons still reported when other fields missing (operator sees what's known) | Unit (already covered implicitly) | R-001 | 1 | Dev | Covered by missing-fields test structure; no new test needed — assert during review |

**Total P2**: 4 scenarios

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory + Benchmarks.
**Purpose**: Hardening beyond the I/O matrix.

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| Exploratory ladder fuzz (random tiles/baselines, growth cases, far-future tiers) — confirm no throw, monotonic-drop semantics sane | Unit (scratch, not committed unless valuable) | 1 | Dev | Time-boxed |
| Property check: `verdict === 'retune' ⟺ needsRetune`, `unknown ⟺ missing.length > 0` invariant across inputs | Unit (could fold into existing file) | 1 | Dev | Optional |

**Total P3**: 2 scenarios

---

## Execution Strategy

Philosophy: run everything in PRs — the whole gate + spawn-config surface executes in ~ms via `node --test` (<15 min trivially). Defer nothing to nightly except long/device suites owned elsewhere.

- **Every PR (touching `triade/src/engine/config/`, `triade/__tests__/engine/`, or any future retune)**: `node --test __tests__/engine/calibration-gate.test.ts __tests__/engine/spawn-config.test.ts` + `npx tsc --noEmit` + diff-guard (`git diff --stat` shows no `triade/src/engine/core/`). Manual doc-review checklist for runbook/template on first pass only.
- **Nightly/Weekly**: Nothing required by this change (no perf/chaos/long-running surface — pure function). The pre-existing `preview-availability` integration failure (DW-114) follows its own track.
- **On first real calibration (operator step, not CI)**: Eduardo extracts same-window summaries → runs evaluator → fills decision log → if `retune`, edits only `spawnConfig.ts` → revalidates → commits data + log. QA verifies the filled log against the schema (P2).

No Playwright/browser execution needed: zero UI, zero gesture, zero render path in this change.

---

## Resource Estimates

Ranges only (no false precision); dominated by verification already done.

| Priority | Count | Hours (range) | Notes |
| -------- | ----- | ------------- | ----- |
| P0 | 7 | ~4-8 hours | Already written + passing; cost is review + evidence collection (done) |
| P1 | 6 | ~4-8 hours | 5 done; diff-guard is per-PR reviewer discipline |
| P2 | 4 | ~3-6 hours | Doc reviews + one CI scratch-trigger |
| P3 | 2 | ~1-3 hours | Optional exploratory, time-boxed |
| **Total** | **19** | **~12-25 hours** | **~0.5-1.5 weeks elapsed (single person, interleaved); new-test authoring ~0 — verification-heavy** |

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (12/12 gate + 8/8 spawn-config — met)
- **P1 pass rate**: ≥95% (5/5 automated met; diff-guard procedural)
- **High-risk mitigations**: R-002 complete (validator + CI + tests); R-001/R-004 mitigated by design (`unknown`-blocks-retune, schema mandates source/window) with residual operator dependence explicitly tracked — acceptable for merge of the gate itself
- **Coverage**: all 4 acceptance criteria mapped (threshold breach / within-bounds / missing→unknown / invalid-candidate rejection); I/O matrix fully covered

### Coverage Targets

- **Critical paths (verdict logic)**: 100% of I/O matrix rows
- **Boundary/ladder semantics**: 100% (equality, 1-vs-2 tiers, off-ladder, null, non-positive)
- **Curve-invariant rejection**: representative violations (key shape, monotonicity, share sum) — effective-curve fallback edges covered by spawn-config suite

### Non-Negotiable Requirements

- [x] All P0 tests pass (verified 2026-09-06)
- [x] No `triade/src/engine/core/` modification in this change (verified)
- [x] No invented telemetry numbers in docs/template (verified — OPERATOR/TBD placeholders)
- [x] `unknown` never recommends retune (tested)
- [ ] First real operator evaluation fills the decision log per schema (pending — operator action, not a merge blocker)

---

## Mitigation Plans

### R-001: Wrong operator-supplied summaries (Score: 6)

**Mitigation Strategy:** (1) Runbook requires same-window extraction with fonte/janela recorded per metric. (2) Decision-log schema enforces it. (3) Gate surfaces partial reasons alongside missing so Eduardo sees what's known. (4) No retune without Eduardo approval.
**Owner:** Eduardo
**Timeline:** Before first real evaluation
**Status:** Planned (design complete; awaiting operator)
**Verification:** First filled `docs/decisoes/` entry reviewed against schema

### R-002: Future retune breaks curve invariants (Score: 6)

**Mitigation Strategy:** (1) `validateSpawnConfig` rejects with violation list. (2) 8 spawn-config + 12 gate tests in CI revalidation command. (3) Startup fail-fast on shipped defaults. (4) Reviewer diff-guard.
**Owner:** Dev
**Timeline:** Continuous
**Status:** Complete (tests pass; CI wiring to be scratch-verified in P2)
**Verification:** CI log on next retune PR; scratch-trigger with bad candidate (unmerged)

### R-004: No automated feed — gate stuck `unknown` (Score: 6)

**Mitigation Strategy:** Accept by design — `unknown` safely blocks retune; operator checklist tracks dashboard availability; fetching stays out of the gate to preserve purity/offline testability.
**Owner:** Eduardo / PM
**Timeline:** Before first calibration window
**Status:** In Progress (telemetry stories 10-2/10-3 are the feed)
**Verification:** First successful `ok`/`retune` verdict from real summaries

---

## Assumptions and Dependencies

### Assumptions

1. Thresholds 25s / 210s / 1-tier-drop are the approved spec values (from epic-context + spec); calibrating the thresholds themselves is out of scope.
2. `validateSpawnConfig` (pot share, strict decrease incl. effective curve, 2^k keys, fixed-sum) is the complete invariant set for a retune candidate.
3. `preview-availability.integration.test.ts` failure is pre-existing (DW-114) and unrelated — not re-investigated here.
4. Operator (Eduardo) has dashboard access to 10.2/10.3 events when calibration runs.

### Dependencies

1. Telemetry events from 10-2/10-3 emitting in production — Required by first real evaluation (R-004).
2. CI `engine-test-and-benchmark` gate executing the revalidation command — Required continuously (R-002).
3. Eduardo availability for first evaluation + log fill — Required by exit criteria (operator action in spec).

### Risks to Plan

- **Risk**: First real data shows thresholds constantly firing or never firing.
  - **Impact**: Gate noise or dead gate; curve churn or stagnation.
  - **Contingency**: Treat first 1-2 evaluations as gate calibration; adjust thresholds via spec amendment (with constant-test update), never silent edits.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
| ----------------- | ------ | ---------------- |
| **Spawn engine (`core/spawn.ts`, `weights.ts`, `pot.ts`, `ceiling.ts`)** | None (untouched by design) | Existing 26 engine tests must pass on every PR (blocking gate per project-context) |
| **Spawn config + preview (`spawnConfig.ts`, `game/preview.ts`)** | Future retunes only; this change adds no behavior | `spawn-config.test.ts` 8/8 + preview suites; `validateSpawnConfig` on any candidate |
| **Telemetry services (10-1..10-3)** | Gate consumes their output manually | No code coupling; runbook references event names only — schema changes in 10.2/10.3 require runbook sync |
| **CI (`.github/workflows/ci.yml`)** | Revalidation command must fail closed | P2 scratch-trigger verification |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — TECH/SEC/PERF/DATA/BUS/OPS classification
- `probability-impact.md` — 1-3 × 1-3 scoring, ≥6 high-priority flag
- `test-levels-framework.md` — unit-first for pure logic; no E2E for non-UI gate
- `test-priorities-matrix.md` — P0 = blocks core + high risk + no workaround

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-10-6-gate-de-calibracao-da-curva-dono-eduardo.md` (rev `20b91aa`)
- Epic context: `_bmad-output/implementation-artifacts/epic-10-context.md`
- Code: `triade/src/engine/config/calibrationGate.ts`, `triade/src/engine/config/spawnConfig.ts`
- Tests: `triade/__tests__/engine/calibration-gate.test.ts`
- Runbook: `docs/calibracao-da-curva.md` — Template: `docs/decisoes/calibracao-10-6-PADRAO.md`
- Project rules: `_bmad-output/project-context.md`

---

**Generated by**: TEA Test Architect — `bmad-testarch-test-design` (epic-level, sequential mode)
**Note**: `sprint-status.yaml` untouched per orchestrator ownership (10-6 row remains `awaiting-operator` — operator actions in spec §operator_actions are Eduardo's, not TEA defects).

---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-04'
inputDocuments:
  - 'triade/src/game/matchOrchestrator.ts'
  - 'triade/src/game/assistance.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/game/matchOrchestrator.test.ts'
  - 'triade/__tests__/game/matchOrchestrator.undoPack.test.ts'
  - 'triade/__tests__/game/matchOrchestrator.rewards.test.ts'
  - 'triade/__tests__/ui/components/app.undoAd.test.ts'
  - '_bmad-output/implementation-artifacts/bmad-dev-auto-result-dw-undo-iap-stub-cleanup.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-undo-iap-stub-cleanup — remove confirmUndoIap budget injection (DW-105)

**Date:** 2026-09-04
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-undo-iap-stub-cleanup`
**Scope:** Targeted test design for the working-tree delta of `dw-undo-iap-stub-cleanup` (DW-105)

> **Delta under assessment:** Working tree vs `HEAD` — 3 tracked files, `8 insertions / 8 deletions`:
> - `triade/src/game/matchOrchestrator.ts:99-103` — removed the 4-line `budgetForCheck` stub in `confirmUndoIap` that fabricated `iapRemaining: 1` when `freeUsed && !unlimited && iapRemaining === 0`; `confirmUndoIap` now strictly calls `consumeUndo(state.undoBudget, ...)`, symmetric with `confirmUndoAd`.
> - `triade/__tests__/game/matchOrchestrator.test.ts:120-128` — pinning test renamed to `confirmUndoIap respects budget — fails when freeUsed and no remaining without purchase`; now asserts `ok:false`, budget unchanged (`freeUsed:true, iapRemaining:0`), history retained (`length 1`), `showUndoPrompt:false`.
> - `_bmad-output/implementation-artifacts/deferred-work.md` — DW-105 flipped `open → done 2026-09-03` with `resolution: resolved by sweep bundle dw-undo-iap-stub-cleanup` + `resolution-undo` hash.
> - `sprint-status.yaml` is **orchestrator-owned** and intentionally not in scope — no write, no revert.

---

## Executive Summary

**Scope:** Remove the pre-Epic-4 simulation stub in `confirmUndoIap` that granted one phantom undo (`iapRemaining: 1` fabricated in a local copy) whenever the free undo was used and no IAP balance existed. Epic 4 entitlements now drive budgets exclusively via `purchaseUndoPack` (`+3`, cap 999) and `applyNoAds` (`unlimited:true`).

**Risk Summary:**

- Total risks identified: 6
- High-priority risks (≥6): 0 — no risk scores ≥6; the change is a 4-line deletion with an updated pin and 42/42 targeted tests green
- Critical categories: BUS (second-undo UX now blocked without purchase — intended monetization behavior), DATA (unmasks entitlement re-apply failures on new match), TECH (Ad/Iap body duplication, stale test comment)

**Coverage Summary:**

- P0 scenarios: 3 groups (deny-without-budget pin, purchase→consume decrement chain, `canUndo` gate parity)
- P1 scenarios: 4 groups (Ad/Iap symmetry, unlimited path, clean-lane no-op, `App.handleUndoIap` fail-closed prompt)
- P2/P3 scenarios: 4 groups (cap 999, non-mutation, empty-history snap guard, busy/purchase separation + exploratory sandbox purchase)
- **Total effort**: ~1–2 hours (~0.15–0.25 day; host-only `node:test`, no device lane — pure `triade/src/game/matchOrchestrator.ts` + `assistance.ts`, `npx tsx --test` `<5 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score/spawn/ceiling, Skia board, `Hud`/`GameOverOverlay`, `assistance.ts` `canUndo`/`consumeUndo` internals, `purchaseUndoPack`/`applyNoAds`/`resetForNewMatch` logic, RevenueCat gateway / `createPurchasesGateway`** | Delta touches none of these — `git diff` shows only `matchOrchestrator.ts` (4 lines removed) + its pinning test + ledger. `assistance.ts` byte-identical; `App.tsx` byte-identical. | Full `npm test` gate (~984 pass per dev-auto result) stays invariant; `undoPack`/`rewards` suites pin purchase paths. |
| **Merging `confirmUndoAd` + `confirmUndoIap` into one function** | Bodies are now identical; merging is a follow-up refactor decision, not part of this cleanup's intent (minimal diff, symmetric call-sites in `App.tsx`). | Tracked as R-002 monitor; any merge must keep both call-sites green. |
| **Editing `sprint-status.yaml` or ledger entries other than DW-105** | `sprint-status.yaml` is orchestrator-owned (`never write it, and never revert`). Ledger change is exactly 1 entry flipped `open → done 2026-09-03`. | This plan never writes either file; CI asserts `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` stays empty. |
| **Real StoreKit / Play purchase verification, refund/renewal flows** | No gateway code changed; `handleUndoPurchase` granted-path untouched. | Existing Epic 4 entitlement tests + optional P3 sandbox exploratory (defer, not gate). |

---

## Risk Assessment

### Testability Assessment

**Controllability — Excellent.** `confirmUndoIap`/`confirmUndoAd`/`canUndoForState`/`purchaseUndoPack` are pure functions of `(OrchestratorState, LaneProfile)` — fully controllable via `node:test` imports with hand-built budgets (`{freeUsed, iapRemaining, unlimited}`) and one-element histories. No RN/Expo harness needed.

**Observability — Excellent.** Every outcome is observable: `ok` boolean, resulting `undoBudget`, `undoHistory.length`, `showUndoPrompt`. The key regression signal (phantom grant) is observable as `r.state.undoBudget.iapRemaining === 0` after a denied call — the old stub never persisted the injection to state (it operated on a local copy), so the observable difference is purely `ok: true→false`.

**Reliability — Strong.** Pure, never-throws paths; `tsc` clean; targeted 42/42 pass (re-verified this session: `matchOrchestrator.test.ts` + `undoPack.test.ts` + `rewards.test.ts`); full suite 984 pass per dev-auto result.

**Testability Risks:** One thin surface — `App.handleUndoIap` fail-closed path (`!ok → setShowUndoPrompt(false)` with no user feedback) is only source-pinned, not covered by a mounted test. Mitigated by P1 source pin.

### High-Priority Risks (Score ≥6)

None. No risk scores ≥6 — the highest score is 4 (R-001, R-005). No mitigation plans with owners/timelines are required; P0 coverage pins the intended behavior change.

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-001 | BUS | **Second-undo UX now hard-blocks without purchase.** Previously the stub granted one phantom undo, so accelerated-lane users always got a 2nd undo per match. Now `handleUndoIap` returns `!ok` and just closes the prompt (`setShowUndoPrompt(false)`, no toast/error). Intended monetization behavior, but users habituated to 2 free undos may report "undo stopped working". | 2 | 2 | 4 | P0 pin asserts deny-without-budget (`ok:false`, history retained, prompt closed); P1 source-pin asserts `App.handleUndoIap` fail-closed branch exists and mutates nothing else. Product decision (add explicit "no undos left" affordance) is out of scope for this plan — flag to PM. |
| R-005 | DATA | **Removal unmasks entitlement re-apply failures on new match.** `resetForNewMatch` wipes `iapRemaining` to 0 and App re-applies from entitlements. Previously the stub masked a missed re-apply (user still got 1 undo); now a missed re-apply is user-visible (zero purchased undos). Pre-existing path, unchanged by this bundle, but its failure mode is now exposed. | 1 | 3 | 3 | P1 pin: `resetForNewMatch` resets to `{freeUsed:false, iapRemaining:0, unlimited:false}` (existing `undoPack` test line 128) + source-pin that App re-applies via `orchestratorPurchaseUndoPack`/`applyNoAds` from entitlements after reset. Any future re-apply regression must add a dedicated test. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-002 | TECH | **Duplicated bodies — `confirmUndoAd` and `confirmUndoIap` are now character-identical.** Future fix applied to one but not the other silently diverges the paths. | 1 | 2 | 2 | Monitor — P1 symmetry pin (same input → same output on both paths) catches divergence. |
| R-003 | TECH | **Stale comment in `app.undoAd.test.ts:111` — "IAP path would inject but still via orchestratorConfirmUndoIap".** Wording describes the removed stub; could mislead a future dev into re-adding the injection. | 2 | 1 | 2 | Monitor — not a logic risk (test asserts only path existence with `iapRemaining:1`, still valid). Suggest a one-line comment fix in a future touch (not this plan; no prod/test edits here). |
| R-004 | TECH | **Clean lane (`canUndo:false`) behavior unchanged but re-verified implicitly.** `consumeUndo` gates on profile first, so cleanup cannot enable undo on clean — but no test in the changed file asserts the Iap path on clean. | 1 | 2 | 2 | Monitor — covered by existing `undoPack` "Clean never gets undo" + `rewards` clean pins; P1 includes clean no-op row. |
| R-006 | OPS | **Ledger `resolution-undo` hash + orchestrator `sprint-status.yaml` ownership.** Single DW-105 entry flipped `open → done 2026-09-03`. | 1 | 1 | 1 | Monitor — `git diff HEAD -- deferred-work.md` shows 1 hunk only; status file untouched. |

### Risk Category Legend

- **TECH**: Ad/Iap body duplication, stale test comment, clean-lane gating
- **SEC**: n/a (no auth/tokens/network in delta)
- **PERF**: n/a (one fewer object spread per call; no measurable delta)
- **DATA**: entitlement re-apply unmasking on `resetForNewMatch`
- **BUS**: second-undo hard-block UX (intended), phantom-grant revenue leak closed (positive)
- **OPS**: ledger single-hunk close, `sprint-status.yaml` ownership never-write

---

## NFR Planning

**Purpose:** Capture NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability | `confirmUndoIap` never-throws for any budget/history/profile combo; deny path returns `{ok:false, state:{...state, showUndoPrompt:false}}` without mutating budget/history | R-001 | Host `node:test` deny pin + empty-history guard + full `npm test` gate | 42/42 targeted pass (this session) + 984 pass full gate (dev-auto result) |
| Data Integrity | No phantom budget: denied call leaves `iapRemaining` exactly as input (0 stays 0); granted call decrements by exactly 1; `freeUsed` untouched on deny | R-005 | Unit pins: deny asserts `iapRemaining:0, freeUsed:true`; purchase chain asserts `3→2→1→0` | `matchOrchestrator.test.ts:120-128` + `undoPack.test.ts:90-104,135-150` green |
| Maintainability | Ad/Iap symmetry: identical inputs produce identical outputs on both paths; stale-comment drift contained to one test comment | R-002,R-003 | Symmetry pin (P1) + `rg -n "budgetForCheck" triade/src` 0 hits | `rg` scan log + 42/42 pass |
| Performance | No threshold change — one fewer spread per call; suite wall-clock `<5 min` host-only | — | `npx tsx --test` wall-clock | Duration log (~150 ms for 42 tests) |
| Compliance / Contract | No free premium grants: IAP-gated undo only consumable after `purchaseUndoPack` grant or `unlimited`; `OrchestratorState`/`ConfirmUndoResult` shapes unchanged | R-001 | `rg -n "iapRemaining: 1" triade/src/game/matchOrchestrator.ts` 0 hits + type gate `tsc --noEmit` | `rg` scan + `tsc` clean |

**Unknown thresholds:** No new NFR thresholds introduced — pure stub removal with no timing, concurrency, or storage surface. Second-undo denial UX copy (toast vs silent close) has no spec'd threshold — flagged to PM, not guessed.

---

## Entry Criteria

- [ ] Working tree shows exactly the 3-file diff (`matchOrchestrator.ts`, `matchOrchestrator.test.ts`, `deferred-work.md`) — `git status --short` shows `M` on those; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty
- [ ] `rg -n "budgetForCheck" triade/src/game/matchOrchestrator.ts` returns 0 hits (stub gone)
- [ ] Host harness available (`npx tsx --test` resolves in `triade/`) — no Expo/Skia/RNGH runtime needed

## Exit Criteria

- [ ] All P0 3 groups passing (deny-without-budget, purchase→consume chain, `canUndo` gate parity)
- [ ] All P1 4 groups passing (symmetry, unlimited, clean no-op, App fail-closed source pin)
- [ ] No open high-priority (≥6) risks — true by construction (max score 4)
- [ ] `rg -n "iapRemaining: 1" triade/src/game/matchOrchestrator.ts` 0 hits; `sprint-status.yaml` untouched

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | FE / Test Architect | Owns deny-pin + symmetry/coverage hygiene, `budgetForCheck`/`iapRemaining: 1` source scans, ledger single-hunk gate |
| Murat (TEA) | QA / NFR assessor | Owns reliability/data-integrity/compliance mapping, `nfr-assess` evidence linkage |

---

## Test Coverage Plan

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

### P0 (Critical)

**Criteria**: Blocks core journey + High risk (≥6) + No workaround — applied here as: pins the exact behavior change (deny vs grant), so any regression re-introduces the phantom grant or breaks the purchase path.

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| `DENY_WITHOUT_BUDGET` — `confirmUndoIap` with `{freeUsed:true, iapRemaining:0, unlimited:false}` + non-empty history returns `ok:false`, budget deep-unchanged, history length unchanged, `showUndoPrompt:false` | Unit | R-001 | 1 | QA | Already implemented at `matchOrchestrator.test.ts:120-128` — verified green this session. Guards against stub re-introduction (old assertion was `ok:true`). |
| `PURCHASE_THEN_CONSUME` — `purchaseUndoPack` (0→3) then `confirmUndoIap` decrements 3→2 with history rewind; 3 packs allow exactly 3 undos, 4th denied | Unit | R-001 | 2 | QA | Existing `undoPack.test.ts:90-104,135-150` — verified green. Proves the legitimate path still works post-cleanup. |
| `CANUNDO_GATE_PARITY` — `canUndoForState` false when `freeUsed && iapRemaining:0 && !unlimited` (with history), true with `iapRemaining:3`, true when `unlimited`, false for clean profile | Unit | R-004,R-005 | 1 | QA | Existing `undoPack.test.ts:32-43` — verifies the gate `confirmUndoIap` now strictly obeys. |

**Total P0**: 4 tests (3 groups), already implemented and green

### P1 (High)

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| `AD_IAP_SYMMETRY` — same `(budget, historyLen, profile)` input yields same `ok` on `confirmUndoAd` and `confirmUndoIap` (both delegate to `consumeUndo`); covers free-first-use, iap-decrement, unlimited, and deny cases | Unit | R-002 | 4 | QA | New pins recommended (table-driven over 4 budget states). Catches one-sided divergence after the bodies became identical. |
| `UNLIMITED_PATH` — `applyNoAds` then repeated `confirmUndoIap` stays `ok:true` with `iapRemaining:0` untouched | Unit | R-005 | 1 | QA | Existing `undoPack.test.ts:106-117` (via Ad path) — add one Iap-path assertion or rely on symmetry pin. |
| `CLEAN_NOOP` — clean profile: `purchaseUndoPack`/`applyNoAds`/`requestUndo`/`confirmUndoIap` all deny or no-op | Unit | R-004 | 1 | QA | Existing `undoPack.test.ts:162-167` + `rewards.test.ts:109` — no new test needed. |
| `APP_FAIL_CLOSED` — `App.handleUndoIap` on `!ok` only `setShowUndoPrompt(false)`; never touches `undoHistory`/`undoBudget`/`game`/`match` state | Unit (source-pin) | R-001 | 1 | QA | `rg` pin on `App.tsx:678-692`: `if (!res.ok \|\| !res.snapshot)` branch contains only `setShowUndoPrompt(false); return;`. No mounted test required. |

**Total P1**: 7 tests, ~0.5–1 hour (4 new symmetry rows + pins)

### P2 (Medium)

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| `CAP_999` — `purchaseUndoPack` at 997→999, at 999 stays 999; never alters board/score/history | Unit | — | 2 | QA | Existing `undoPack.test.ts:58-65,152-160` — no new test needed. |
| `EMPTY_HISTORY_GUARD` — `confirmUndoIap` with empty `undoHistory` denies even with `iapRemaining>0` (via `canUndo` historyLen check + snap guard) | Unit | — | 1 | QA | Covered indirectly by `matchOrchestrator.test.ts:52` (clean) — recommend one explicit accelerated-profile empty-history row. |
| `BUSY_SEPARATION` — `requestUndo` busy-blocks but purchase still grants (purchase path independent of `busyRef`) | Unit | — | 1 | QA | Existing `undoPack.test.ts:119-126` — no new test needed. |
| `NON_MUTATION` — all orchestrator helpers deep-preserve caller state | Unit | — | 2 | QA | Existing non-mutation pins (`matchOrchestrator.test.ts` copy-check, `undoPack.test.ts:67-72`) — no new test needed. |

**Total P2**: 6 tests (1 new recommended), ~0.3–0.6 hour

### P3 (Low)

**Criteria**: Nice-to-have + Exploratory + Benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory sandbox purchase — real `purchaseUndoPack` grant via StoreKit sandbox then second-undo succeeds in-app | Manual | 1 | QA | Defer: requires device/sandbox harness; not a gate for this cleanup. |
| Fix stale comment `app.undoAd.test.ts:111` ("would inject") | N/A (docs) | — | DEV | One-line comment touch in a future commit; explicitly not done here (no code edits in this workflow). |

**Total P3**: 1 exploratory (deferred), negligible

---

## Execution Strategy

**Philosophy:** Run everything in PRs — the full targeted surface is host-only `node:test` completing in ~150 ms. Defer only what needs a device or sandbox account.

- **Every PR:** All P0 + P1 unit pins (`npx tsx --test __tests__/game/matchOrchestrator.test.ts __tests__/game/matchOrchestrator.undoPack.test.ts __tests__/game/matchOrchestrator.rewards.test.ts`) + `rg -n "budgetForCheck" triade/src/game/matchOrchestrator.ts` expecting 0 hits + full `npm test` gate. (~5–15 min with Playwright/parallel; the orchestrator suites themselves are milliseconds.)
- **Nightly/Weekly:** Nothing required for this bundle — no perf/chaos/long-running surface.
- **On-demand only:** P3 sandbox purchase exploratory (needs StoreKit sandbox account + device).

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 4 | 0 (done) | ~0 | Already implemented and green — zero new effort |
| P1 | 7 | ~0.1–0.15 | ~0.5–1 | 4-row symmetry table (new) + source pins (scans) |
| P2 | 6 | ~0.05–0.1 | ~0.3–0.6 | 1 new empty-history row; rest existing |
| P3 | 1 | manual | ~0.3–0.5 | Sandbox exploratory (deferred, optional) |
| **Total** | **18** | **-** | **~1–2** | **~0.15–0.25 day** |

### Prerequisites

**Test Data:**

- Hand-built `UndoBudget` states (`{freeUsed, iapRemaining, unlimited}`) + single-snapshot histories (existing `snap()` helpers in both suites)
- `LANE_PROFILES.accelerated` vs `clean` (existing imports)

**Tooling:**

- `npx tsx --test` host harness in `triade/` — no Expo/Skia/RNGH needed
- `rg` for source pins (`budgetForCheck`, `iapRemaining: 1`, `handleUndoIap` fail-closed branch)

**Environment:**

- Working tree with the DW-105 delta applied; `sprint-status.yaml` untouched

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — 4/4 green, verified this session 42/42 across the 3 suites)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational; P3 deferred)
- **High-risk mitigations**: n/a — 0 high risks; max score 4

### Coverage Targets

- **Deny path**: 100% (the behavior change itself is pinned)
- **Purchase→consume chain**: 100% (3→2→1→0 + 4th-deny)
- **Security scenarios**: n/a (no SEC surface)
- **Regression**: full `npm test` green (984 pass per dev-auto result)

### Non-Negotiable Requirements

- [ ] All P0 tests pass (verified: 42/42 this session)
- [ ] `rg -n "budgetForCheck" triade/src/game/matchOrchestrator.ts` → 0 hits
- [ ] `rg -n "iapRemaining: 1" triade/src/game/matchOrchestrator.ts` → 0 hits (no fabrication remains in prod code)
- [ ] `sprint-status.yaml` untouched (`git diff HEAD -- ...sprint-status.yaml` empty)
- [ ] No production-code edits by this workflow (test-design only)

---

## Mitigation Plans

No high-priority risks (≥6) — no formal mitigation plans required. Medium/low risks are addressed by the coverage rows linked above (R-001→P0 deny + P1 fail-closed pin; R-005→P1 re-apply pin; R-002→P1 symmetry pin; R-003→P3 comment fix; R-004→existing clean pins; R-006→ledger single-hunk check).

---

## Assumptions and Dependencies

### Assumptions

1. Epic 4 entitlement wiring (`purchaseUndoPack` grant on real purchase, re-apply after `resetForNewMatch`) is live and covered by Epic 4 suites — this plan assumes it, and R-005 flags the unmasking effect.
2. `App.handleUndoIap` is only reachable after the undo prompt (`showUndoPrompt:true`), which itself requires `requestUndo` → `canUndoForState` true — so the deny path in `confirmUndoIap` fires only in races (budget consumed between request and confirm) or direct calls.
3. `app.undoAd.test.ts:112` (`iapRemaining:1` → path exists) remains valid post-cleanup — verified by reading; it never asserted injection.

### Dependencies

1. Full `npm test` gate green on the working tree — already reported 984 pass (dev-auto result); targeted 42 re-verified this session.
2. Orchestrator harvest of DW-105 ledger close — out of scope for this workflow (no ledger writes here).

### Risks to Plan

- **Risk**: PM may want an explicit "no undos left — buy pack" affordance instead of silent prompt-close (R-001 UX tail).
  - **Impact**: Low — prompt closes cleanly today; no crash or state corruption.
  - **Contingency**: File as follow-up UX story; P1 fail-closed pin guarantees safe behavior until then.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **`assistance.ts` `canUndo`/`consumeUndo`** | None (byte-identical) — now the sole budget authority for both Ad and Iap paths | `undoPack` + `rewards` suites must stay green (verified) |
| **`App.tsx` `handleUndoIap` / `handleUndoPurchase`** | None (byte-identical) — deny now reachable without purchase (previously masked); grant path unchanged | `app.undoAd.test.ts` gateway flow (`r2 ok:false` second-ad block, `r3` Iap path) must stay green |
| **Epic 4 entitlements / RevenueCat gateway** | Positive — phantom grant removed, so paid balances are the only post-free source | Epic 4 purchase/entitlement suites must stay green |
| **Ledger (`deferred-work.md` DW-105)** | Single entry `open → done`; reversible via recorded `resolution-undo` | `git diff` shows 1 hunk; no other entries touched |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — TECH/SEC/PERF/DATA/BUS/OPS classification
- `probability-impact.md` — 1–3 × 1–3 scoring; ≥6 high, 3–4 medium, 1–2 low
- `test-levels-framework.md` — unit preferred for pure orchestrator logic; no E2E needed
- `test-priorities-matrix.md` — P0 = behavior-change pins; P1 = symmetry/contracts; P2 = edges; P3 = exploratory

### Related Documents

- Dev result: `_bmad-output/implementation-artifacts/bmad-dev-auto-result-dw-undo-iap-stub-cleanup.md`
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-105)
- Code: `triade/src/game/matchOrchestrator.ts:99-118`, `triade/src/game/assistance.ts:38-59`, `triade/App.tsx:678-708,768-805`
- Tests: `triade/__tests__/game/matchOrchestrator.test.ts:120-128`, `triade/__tests__/game/matchOrchestrator.undoPack.test.ts`, `triade/__tests__/ui/components/app.undoAd.test.ts:97-114`

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)

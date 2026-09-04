---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-04'
workflowType: 'testarch-atdd'
storyId: 'dw-undo-iap-stub-cleanup'
storyKey: 'dw-undo-iap-stub-cleanup'
storyFile: '_bmad-output/implementation-artifacts/deferred-work.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-dw-undo-iap-stub-cleanup.md'
generatedTestFiles:
  - '_bmad-output/test-artifacts/atdd-tests/dw-undo-iap-stub-cleanup.red.spec.ts'
inputDocuments:
  - 'triade/src/game/matchOrchestrator.ts'
  - 'triade/src/game/assistance.ts'
  - 'triade/App.tsx'
  - 'triade/__tests__/game/matchOrchestrator.test.ts'
  - 'triade/__tests__/game/matchOrchestrator.undoPack.test.ts'
  - 'triade/__tests__/game/matchOrchestrator.rewards.test.ts'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-undo-iap-stub-cleanup.md'
  - '_bmad-output/implementation-artifacts/bmad-dev-auto-result-dw-undo-iap-stub-cleanup.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — DW Bundle dw-undo-iap-stub-cleanup — remove confirmUndoIap budget injection (DW-105)

**Date:** 2026-09-04
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` + `tsx`, pure `matchOrchestrator.ts` + `assistance.ts`) — no Playwright/Cypress harness required. Stack `test_stack_type: auto` → detected `frontend` (Expo RN 57) but scenario is host-testable pure logic (same posture as test-design: host-only `<5 min`, no device lane).

---

## Story Summary

DW bundle `dw-undo-iap-stub-cleanup` closes deferred **DW-105**: remove the pre-Epic-4 simulation stub in `confirmUndoIap` that fabricated one phantom undo (`budgetForCheck = { ...budget, iapRemaining: 1 }` on a local copy) whenever `freeUsed && !unlimited && iapRemaining === 0`. Epic 4 entitlements now drive budgets exclusively via `purchaseUndoPack` (`+3`, cap 999) and `applyNoAds` (`unlimited:true`). After the cleanup `confirmUndoIap` strictly calls `consumeUndo(state.undoBudget, ...)`, symmetric with `confirmUndoAd`.

**As a** monetization owner
**I want** IAP-gated undo to deny without a purchased balance (no phantom grant)
**So that** the second undo per match requires a real `purchaseUndoPack` grant or `unlimited`, closing the revenue leak while keeping the legitimate purchase path green.

---

## Acceptance Criteria

1. **AC-1 Deny without budget (no phantom grant)** — Given `{freeUsed:true, iapRemaining:0, unlimited:false}` + non-empty history + accelerated profile, when `confirmUndoIap` is called, then `ok:false`, budget deep-unchanged, history length unchanged, `showUndoPrompt:false`, `snapshot` undefined. Maps to test-design P0 `DENY_WITHOUT_BUDGET`, risk R-001.
2. **AC-2 Purchase path survives** — Given `purchaseUndoPack` grant (`0→3`), when `confirmUndoIap` consumes, then each grant decrements by exactly 1 with history rewind; 3 packs allow exactly 3 undos, 4th denies. Maps to P0 `PURCHASE_THEN_CONSUME`, risk R-001.
3. **AC-3 Gate parity** — Given any `(budget, history, profile)`, when `canUndoForState` and `confirmUndoIap` are compared, then they agree (`canUndo:false ⇔ confirm ok:false`). Maps to P0 `CANUNDO_GATE_PARITY`, risks R-004/R-005.
4. **AC-4 Ad/Iap symmetry + entitlement paths + fail-closed App** — Given identical inputs, `confirmUndoAd` and `confirmUndoIap` return identical `ok`; `unlimited` never decrements; clean profile always denies without mutation; `App.handleUndoIap` on `!ok` only closes the prompt. Maps to P1 group, risks R-001/R-002/R-005.
5. **AC-5 Stub absent + ledger + hygiene** — Given the repo, `budgetForCheck`/`iapRemaining: 1` are absent from `matchOrchestrator.ts`; pinning test asserts deny; DW-105 ledger is `done 2026-09-03` with sweep resolution; orchestrator purity holds; `sprint-status.yaml` untouched. Maps to P2 group, risk R-006.

---

## Story Integration Metadata

- **Story ID:** `dw-undo-iap-stub-cleanup` (DW-105)
- **Story Key:** `dw-undo-iap-stub-cleanup`
- **Story File:** `_bmad-output/implementation-artifacts/deferred-work.md` (DW-105 entry) + `_bmad-output/implementation-artifacts/bmad-dev-auto-result-dw-undo-iap-stub-cleanup.md` (intent record)
- **Checklist Path:** `_bmad-output/test-artifacts/atdd-checklist-dw-undo-iap-stub-cleanup.md`
- **Generated Test Files:**
  - `_bmad-output/test-artifacts/atdd-tests/dw-undo-iap-stub-cleanup.red.spec.ts` (NEW — 13 RED-phase scaffolds, `test.skip` inner under 3 outer wrappers, host `node:test` + `tsx`; 4 P0 + 5 P1 + 4 P2)
  - Existing hardened suites (reference, already green): `triade/__tests__/game/matchOrchestrator.test.ts` (20 tests, incl. flipped deny pin `:120-128`), `matchOrchestrator.undoPack.test.ts` (13), `matchOrchestrator.rewards.test.ts` (9)
- **Working-tree delta covered (vs HEAD `8ac9a21`, `8 insertions / 8 deletions` across 3 files):**
  - `triade/src/game/matchOrchestrator.ts:99-103` — removed 4-line `budgetForCheck` stub; `confirmUndoIap` now `consumeUndo(state.undoBudget, state.undoHistory.length, profile)` directly.
  - `triade/__tests__/game/matchOrchestrator.test.ts:120-128` — pin renamed to `confirmUndoIap respects budget — fails when freeUsed and no remaining without purchase`; asserts `ok:false`, `freeUsed:true`, `iapRemaining:0`, history `length 1`, `showUndoPrompt:false`.
  - `_bmad-output/implementation-artifacts/deferred-work.md` — DW-105 `open → done 2026-09-03` + `resolution: resolved by sweep bundle dw-undo-iap-stub-cleanup` + `resolution-undo` hash.
  - `sprint-status.yaml` NOT written (orchestrator-owned — verified `git diff HEAD --stat` shows only the 3 files above).

---

## Stack Detection

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`; no backend manifest).
- **Test framework:** `node:test` + `tsx` (`TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test`, `npm --prefix triade test`).
- **No Playwright/Cypress harness needed:** scenario is pure `(OrchestratorState, LaneProfile) → ConfirmUndoResult`; correct level is **Unit host** + static `readFileSync` source pins (same posture as `test-design-dw-undo-iap-stub-cleanup.md` Execution Strategy). `tea_use_playwright_utils:true` loaded but not applied (no `page.goto`/`page.locator`).
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `test_artifacts: {project-root}/_bmad-output/test-artifacts`, `risk_threshold: p1`.

---

## Prerequisites

- [x] Story approved with clear acceptance criteria (5 ACs above, derived from working-tree diff + test-design P0/P1/P2).
- [x] Test framework configured — `triade/package.json` `test` script + `triade/tsconfig.test.json` + `node:test` (baseline targeted 42/42 green this session).
- [x] Development environment available (Node ≥26, `tsx`, `ripgrep`).
- [x] Existing patterns inspected — `matchOrchestrator.test.ts` Given-When-Then pins, `undoPack.test.ts` purchase/cap/clean rows, `App.tsx:678-708` fail-closed branch.
- [x] Working tree shows exactly the 3-file diff; `sprint-status.yaml` not written by this workflow (orchestrator-owned).

---

## Knowledge Base Fragments Loaded

- **Core (always):** `data-factories.md` (deterministic board literals, no faker — pure budget/history fixtures), `test-quality.md` (Given-When-Then per test, one behavior per `test.skip`, determinism via hand-built budgets + `readFileSync` pins, isolation via fresh state per test), `test-healing-patterns.md` (healing hooks `budgetForCheck` / `iapRemaining: 1` / `confirmUndoIap respects budget`), `component-tdd.md` (red-phase `test.skip` scaffolds, activation guidance).
- **Backend patterns (applicable — pure logic):** `test-levels-framework.md` (Unit for `confirmUndoIap`/`canUndoForState`/`purchaseUndoPack`, Static scan for stub-absent/App fail-closed/ledger), `test-priorities-matrix.md` (P0 = deny/purchase/parity, P1 = symmetry/entitlements/fail-closed, P2 = edge/ledger/hygiene), `ci-burn-in.md` (mirrored as `git diff --stat` + `rg` empty gates, not a burn).
- **Skipped:** Playwright `overview/api-request/network-recorder/auth-session/intercept/recurse/log/file-utils` (no browser surface), `fixture-architecture`/`network-first` (no `page.route`), `contract-testing`/Pact (no gateway change), `selector-resilience`/`timing-debugging` (no RN tree/timing).

---

## Generation Mode

**Chosen:** AI Generation (no browser recording). Reason: acceptance criteria are clear and the surface is a pure 4-line deletion plus a flipped pin — deterministically verifiable via host `node:test` behavioral imports + `readFileSync` source scans + `rg` allowlists. No UI interaction needs live verification; `tea_browser_automation: auto` finds no web surface to record (RN project, no `page.goto`).

---

## Test Strategy

| AC | Scenario | Level | Priority | File | Test Names |
|----|----------|-------|----------|------|------------|
| AC-1 | deny when `freeUsed && iapRemaining:0 && !unlimited` — `ok:false`, budget/history/prompt pins | Unit host | P0 | `dw-undo-iap-stub-cleanup.red.spec.ts` | `[P0-01] confirmUndoIap denies when freeUsed && iapRemaining:0 && !unlimited` |
| AC-1 | no phantom persistence — `iapRemaining` stays exactly 0, input unmutated | Unit host | P0 | same | `[P0-02] no phantom persistence` |
| AC-2 | purchase→consume — grant `0→3`, decrement chain, legitimate path survives | Unit host | P0 | same | `[P0-03] purchase→consume chain still works` |
| AC-3 | gate parity — `canUndoForState` agrees with `confirmUndoIap` on 3 budgets + clean | Unit host | P0 | same | `[P0-04] canUndo gate parity` |
| AC-4 | Ad/Iap symmetry over 4 budget rows | Unit host | P1 | same | `[P1-01] Ad/Iap symmetry` |
| AC-4 | unlimited path — 3× success, `iapRemaining` untouched | Unit host | P1 | same | `[P1-02] unlimited path` |
| AC-4 | clean no-op — confirm denies, purchase/apply unmutated | Unit host | P1 | same | `[P1-03] clean lane no-op` |
| AC-4 | App fail-closed source pin (`App.tsx:689-692` only `setShowUndoPrompt(false)`) | Unit (source-pin) | P1 | same | `[P1-04] SCAN App.handleUndoIap fail-closed` |
| AC-5 | stub-absent source pin (`budgetForCheck` 0 hits, direct `consumeUndo` call) | Unit (source-pin) | P1 | same | `[P1-05] SCAN stub absent` |
| AC-3/edge | empty-history guard denies even with `iapRemaining:2` | Unit host | P2 | same | `[P2-01] empty-history guard` |
| AC-5 | pinning-test flipped pin (`respects budget` + `ok:false`, old name gone) | Unit (source-pin) | P2 | same | `[P2-02] SCAN pinning test flipped` |
| AC-5 | ledger DW-105 done + resolution-undo + hex marker | Unit (source-pin) | P2 | same | `[P2-03] SCAN ledger DW-105` |
| AC-5 | purity + assistance ownership (no RN imports, `consumeUndo` in assistance) | Unit (source-pin) | P2 | same | `[P2-04] SCAN purity + assistance` |

Duplicate coverage avoided: P0 behavioral pins are the contract; P1/P2 source pins guard wiring/ledger/hygiene without re-executing the same behavior. Existing repo suites (`undoPack` cap/busy/clean, `rewards`) are referenced, not duplicated.

---

## Red-Phase Test Scaffolds Created

- `_bmad-output/test-artifacts/atdd-tests/dw-undo-iap-stub-cleanup.red.spec.ts` — 16 tests total (3 outer wrappers pass, 13 inner `test.skip` scaffolds), Given-When-Then comments, one behavior per scaffold, deterministic (hand-built budgets/snapshots, no faker/random), isolated (fresh state per test), no hard waits, no network.
- All inner tests use `test.skip()` (TDD RED). Activation guidance in file header: remove inner `test.skip` → `test` for the current task, run from `triade/` (`TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "../_bmad-output/test-artifacts/atdd-tests/dw-undo-iap-stub-cleanup.red.spec.ts"`), confirm RED (against stub) then GREEN (against cleaned code).
- RED evidence (stub logic): pre-fix `budgetForCheck` injection made P0-01 return `ok:true` (phantom) and broke P0-04 parity + P1-01 symmetry row 2 (Ad `false` vs Iap `true`); P1-05/P2-02/P2-03 source pins fail on pre-fix tree (`budgetForCheck` present, old test name, ledger `open`). GREEN evidence this session: activation check `P0-01 ok:false, budget {freeUsed:true,iapRemaining:0}, hist 1, prompt false` + `Ad==Iap true` (see Validation).

---

## Data Factories Created

None (intentional). Fixtures are inline deterministic board literals (`[[n,null,null,null],…]` + `pendingSpawn`) and budget literals (`{freeUsed, iapRemaining, unlimited}`) — zero-dep project, no `@faker-js/faker`. Factory/helper surface is the existing `initialOrchestratorState()` + `pushHistory` + `purchaseUndoPack`/`applyNoAds` imports used inside each scaffold's Harness line.

## Fixtures Created

None (intentional). Each scaffold builds fresh state inline (`{ ...initialOrchestratorState(), undoHistory: [snap], undoBudget: … }`) — isolated, no shared setup, no teardown needed (pure functions, no I/O). Composability N/A.

## Mock Requirements Documented

None. No external services in delta (no StoreKit/Play gateway, no network, no storage). `purchaseUndoPack`/`applyNoAds` are pure entitlement-application helpers, not mocked gateways. P3 sandbox exploratory (real StoreKit sandbox purchase) is deferred, not a gate — see test-design.

## Required data-testid Attributes

None. No UI changed (`App.tsx` byte-identical for this bundle; prompt close behavior unchanged). E2E `data-testid` surface N/A — correct level is Unit host.

---

## Implementation Checklist

Covers the working-tree delta only (3 files). RED phase (TEA) is complete; GREEN/REFACTOR are DEV tasks. Do NOT touch `sprint-status.yaml` (orchestrator-owned).

### GREEN — apply the production + test change (DEV)

- [ ] `triade/src/game/matchOrchestrator.ts:99-103` — delete the 4-line `budgetForCheck` stub (`let budgetForCheck = …; if (freeUsed && !unlimited && iapRemaining===0) { budgetForCheck = { …iapRemaining: 1 }; }`); call `consumeUndo(state.undoBudget, state.undoHistory.length, profile)` directly (symmetric with `confirmUndoAd`). Verify `rg -n "budgetForCheck" triade/src/game/matchOrchestrator.ts` → 0 hits and `rg -n "iapRemaining: 1" triade/src/game/matchOrchestrator.ts` → 0 hits. *(Already done in working tree — re-verify, do not re-add.)*
- [ ] `triade/__tests__/game/matchOrchestrator.test.ts:120-128` — rename pin to `confirmUndoIap respects budget — fails when freeUsed and no remaining without purchase`; assert `ok:false` + `freeUsed:true` + `iapRemaining:0` + history `length 1` + `showUndoPrompt:false`. *(Already done — re-verify.)*
- [ ] `_bmad-output/implementation-artifacts/deferred-work.md` — DW-105 `open → done 2026-09-03` + `resolution: resolved by sweep bundle dw-undo-iap-stub-cleanup` + `resolution-undo` hash. *(Already done — 1 hunk only; do not touch other entries.)*
- [ ] Activate RED scaffolds for the current task: remove inner `test.skip` → `test` in `dw-undo-iap-stub-cleanup.red.spec.ts` for P0-01/P0-04/P1-01/P1-05 first; confirm they FAIL against a stubbed copy (re-add `budgetForCheck` temporarily in a scratch branch) then PASS on the cleaned tree; re-skip or promote passing pins into `triade/__tests__/game/` per team convention.
- [ ] Run gates: `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/game/matchOrchestrator.test.ts __tests__/game/matchOrchestrator.undoPack.test.ts __tests__/game/matchOrchestrator.rewards.test.ts` → 42/42; `npm --prefix triade test` full gate; `npx tsc --noEmit -p triade/tsconfig.test.json` clean.

### REFACTOR / hygiene (optional, separate commit — NOT this bundle)

- [ ] Consider merging `confirmUndoAd` + `confirmUndoIap` (now identical bodies) — only with both call-sites (`App.tsx:handleUndoAd/handleUndoIap`) kept green; tracked as test-design R-002 monitor.
- [ ] Fix stale comment `triade/__tests__/ui/components/app.undoAd.test.ts:111` ("would inject") — one-line comment touch; explicitly out of scope here (test-design R-003).
- [ ] Product flag to PM: second-undo denial is now silent (`setShowUndoPrompt(false)`, no toast) — decide whether an explicit "no undos left" affordance is wanted (test-design R-001).

### Execution commands

- Red spec (from `triade/`): `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "../_bmad-output/test-artifacts/atdd-tests/dw-undo-iap-stub-cleanup.red.spec.ts"` → expect `pass 3 / skipped 13 / fail 0` while skipped; after activation expect RED on stub, GREEN on fix.
- Targeted: `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/game/matchOrchestrator.test.ts __tests__/game/matchOrchestrator.undoPack.test.ts __tests__/game/matchOrchestrator.rewards.test.ts` → expect 42/42.
- Source gates: `rg -n "budgetForCheck" triade/src/game/matchOrchestrator.ts` → 0 hits; `rg -n "iapRemaining: 1" triade/src/game/matchOrchestrator.ts` → 0 hits; `git diff HEAD --stat` → exactly the 3 files; `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` → empty.

**Estimated effort:** ~1–2 hours DEV (activate P0/P1 pins + gates; host-only, no device lane) — matches test-design estimate.

---

## Red-Green-Refactor Workflow

- **RED (TEA, complete):** 13 scaffolds assert EXPECTED post-cleanup behavior as `test.skip()`; RED rationale documented per scaffold (`Expected failure BEFORE fix` comments); source-pin RED verified via `budgetForCheck` presence pre-fix.
- **GREEN (DEV):** activate scaffolds task-by-task, confirm RED on stubbed copy, implement (already in tree — verify), confirm GREEN + 42/42 + full `npm test` + `tsc` clean.
- **REFACTOR (DEV, optional):** Ad/Iap merge + stale-comment fix in follow-up commits only; any merge must keep P1-01 symmetry green.

---

## Validation (this session)

- Red spec run (from `triade/`): `tests 16 / pass 3 (outer) / skipped 13 (inner) / fail 0` — TDD RED shape correct.
- Targeted suites: `tests 42 / pass 42 / fail 0` (`matchOrchestrator` 20 + `undoPack` 13 + `rewards` 9).
- Activation GREEN check (live import, not skipped): `P0-01 ok:false, budget {"freeUsed":true,"iapRemaining":0,"unlimited":false}, hist 1, prompt false`; `P1-01 Ad==Iap true`.
- Source gates: `rg budgetForCheck` → 0 hits; `rg iapRemaining: 1` (orchestrator file) → 0 hits; `git diff --stat` → exactly 3 files (`deferred-work.md`, `matchOrchestrator.test.ts`, `matchOrchestrator.ts`); `sprint-status.yaml` untouched (never written).
- Checklist validation against `bmad-testarch-atdd/checklist.md`: P0/P1/P2 scaffolds use Given-When-Then, descriptive names, no duplicates, no flaky patterns, no interdependencies, deterministic; `test.skip()` on all inner scaffolds with per-scaffold activation guidance; implementation checklist maps each scaffold to code tasks with commands; knowledge-base refs recorded above.

---

## Next Steps for DEV Team

1. Work the Implementation Checklist GREEN section top-to-bottom (verify stub removal → activate P0-01/P0-04/P1-01/P1-05 → run gates).
2. Usual next workflow is `dev-story` (promote passing pins); `automate` comes after implementation, not now.
3. Flags for PM (out of scope): silent second-undo denial UX; `resetForNewMatch` re-apply exposure (test-design R-005 — covered by existing `undoPack:128` pin + App re-apply source pin).

---

## Risks / Assumptions

- Highest risk score 4 (R-001 second-undo UX block — intended monetization; R-005 re-apply unmasking) — no score ≥6; see `test-design-dw-undo-iap-stub-cleanup.md` for the full 6-risk register.
- Assumption: `purchaseUndoPack` (`+3`, cap 999) + `applyNoAds` (`unlimited`) are the exclusive post-cleanup budget sources — verified via `undoPack` suite, not re-proven here.
- Assumption: `App.handleUndoIap` fail-closed branch stays silent-close — source-pinned, not mounted-tested (single thin surface per test-design testability assessment).

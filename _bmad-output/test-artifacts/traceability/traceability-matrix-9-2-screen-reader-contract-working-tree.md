---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-09-07'
workflowType: 'testarch-trace'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md'
  - '_bmad-output/test-artifacts/test-design/test-design-9-2-screen-reader-contract-td-20260907.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-9-2-screen-reader-contract.md'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources:
  - '_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md'
  - '_bmad-output/test-artifacts/test-design/test-design-9-2-screen-reader-contract-td-20260907.md'
externalPointerStatus: 'not_used'
tempCoverageMatrixPath: ''
---

# Traceability Matrix & Gate Decision - 9-2 Screen Reader Contract (working tree)

**Target:** 9-2-screen-reader-contract (preview/banner wiring delta, working tree)
**Date:** 2026-09-07
**Evaluator:** Eduardo (TEA Agent / Murat)
**Coverage Oracle:** acceptance_criteria
**Oracle Confidence:** high
**Oracle Sources:** spec-9-2-screen-reader-contract.md + test-design-9-2-screen-reader-contract-td-20260907.md

---

Note: This workflow does not generate tests. If gaps exist, run `*atdd` or `*automate` to create coverage.

## Step 1 — Coverage oracle (formal_requirements, high confidence)

Working-tree delta under trace (`git diff d26bbdd..HEAD`, verified this run): 3 files, +106/-5 —
`triade/App.tsx` (+51: `a11yPreviewDisplay` memo + `prevPreviewRef`/`prevBannerRef` null-init
skip-first-mount + `announcePreview` on display change + `announceBanner` on ceiling/stuck
false→true with `msg && msg !== key` guards), `triade/src/ui/PreviewCard.tsx` (+10/-5:
`accessibilityLabel` i18n-authored via `a11y.preview` with try/catch EN fallback), spec
bookkeeping only. Foundation (`src/a11y/*`, overlay, gesture gate, tone pause, Dynamic Type)
predates `d26bbdd`; its standing gate (2026-09-02 full test design + 15-test contract file) is
re-verified green this run, not re-assessed. Oracle = 6 spec ACs + 6 delta rows (AC-PB1..PB6)
derived from the targeted TD's delta I/O rows (R-D1..R-D6 → P0-D/P1-D/P2-D/P3-D).

Knowledge base loaded: test-priorities-matrix (P0 = screen-reader movement/announcement core,
P1 = i18n parity + wiring pins, P2 = ordering/interaction, P3 = device ear-check),
risk-governance, probability-impact (P×I), test-quality (assertions explicit, no hard waits,
<300 lines, <90s), selective-testing.

## Step 2 — Discovered tests (34 unique, 0 skipped)

| ID pattern | File | Level | Count | Result this run |
| ---------- | ---- | ----- | ----- | --------------- |
| `[P0] ×15` | `triade/__tests__/a11y/screenReader.contract.test.tsx` (285 lines) | Unit | 15 | 15/15 pass |
| `[P0/P1/P2]-API-PB-××` | `_bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts` (188 lines) | API (announcement-contract surface; RN bridge, no endpoints) | 11 | 11/11 pass |
| `[P0/P1/P2]-UMB-PB-××` | `_bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts` (182 lines) | E2E (user journeys via real PreviewCard + i18n + capture) | 8 | 8/8 pass |
| `[P1-D×]/[GATE]` | `_bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts` | ATDD RED scaffolds (`test.skip`, 6) | 0 active | 4 RED-as-designed (P1-D1..D4), 2 GREEN gate pins |

Heuristics inventory: no API endpoints in delta (`git diff d26bbdd..HEAD -- triade/src/engine` empty,
pinned by P2-UMB-PB-07) → endpoint gaps n/a. Auth/authz n/a (no login surface). Error-path:
NaN/empty/malformed preview → silent (P1-UMB-PB-04, P0-API-PB-03); empty banner → silent
(P0-API-PB-04); raw-key guarded at call-site (P1-API-PB-08). UI journeys: mount-silence +
change-announce + PT end-to-end (P0-UMB-PB-01/02/03); loading/empty/error states for the
preview card = empty-display silent (covered).

## Step 3 — Detailed mapping

### PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority  | Total Criteria | FULL Coverage | Coverage % | Status       |
| --------- | -------------- | ------------- | ---------- | ------------ |
| P0        | 7              | 7             | 100%       | ✅ PASS      |
| P1        | 3              | 3             | 100%       | ✅ PASS      |
| P2        | 1              | 1             | 100%       | ✅ PASS      |
| P3        | 1              | 0             | 0%         | ℹ️ INFO (manual, operator-owned) |
| **Total** | **12**         | **11**        | **92%**    | ✅ PASS      |

**Legend:** ✅ PASS - meets gate threshold · ⚠️ WARN - below threshold, not critical ·
❌ FAIL - blocker · ℹ️ INFO - tracked, doesn't block.

---

#### AC-1: Three-finger swipe moves + announced; single-finger never moves (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `[P0] three-finger gate ×3` - triade/__tests__/a11y/screenReader.contract.test.tsx
    - **Given:** VoiceOver enabled with 3-pointer touch event
    - **When:** Swipe resolves via `isThreeFingerMove`
    - **Then:** Direction returned; <3 pointers / tie / NaN → null (no move)
  - `[P0] App gesture gate` - triade/__tests__/a11y/screenReader.contract.test.tsx
    - **Given:** `screenReaderEnabled` flag in App pan handler
    - **When:** Screen reader on vs off
    - **Then:** Only 3-finger dispatches when on; single-finger path unchanged when off

#### AC-2: Tile focus announces value + position matching board[r][c]; tap re-announces; null cells silent (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `[P0] tileLabel engine-derived 1-indexed` + `[P0] overlay renders only non-null cells` + `[P0] overlay re-renders with board prop` + `[P0] accessible + text role` - triade/__tests__/a11y/screenReader.contract.test.tsx
    - **Given:** Any board state
    - **When:** VoiceOver focuses / taps a tile
    - **Then:** Label `"{value} row {r+1} column {c+1}"` equals `board[r][c]`; null cells expose no element; stable `a11y-${r}-${c}` keys

#### AC-3: Merge/spawn/score contract — per-pair merge phrasing, spawn announced, score only on merge throttled ~500ms, noop silent (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `[P0] announcement strings` + `[P0] i18n pt` + `[P0] noop silent` + `[P0] throttle` - triade/__tests__/a11y/screenReader.contract.test.tsx
    - **Given:** A `MoveResult` after `move()`
    - **When:** Merges / spawn / score delta / noop occur
    - **Then:** `announceMerge` per pair, `announceSpawn`, score throttled (repeat <500ms dropped), noop queues nothing

#### AC-4: Game over announces "Game over. Score X, best Y" + "New record" when isNewRecord (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `[P0] announcement strings` (game-over branch) + `[P0] announcement i18n pt` - triade/__tests__/a11y/screenReader.contract.test.tsx
    - **Given:** `isGameOver` with score/best/`isNewRecord`
    - **When:** Overlay appears
    - **Then:** `announceForAccessibility` carries score + best + new-record (en + pt)

#### AC-5: Tone screen pauses 2s auto-advance while VoiceOver/announcement in flight; ~5s fallback; dismiss tap works (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `[P0] ToneScreen pause contract` - triade/__tests__/a11y/screenReader.contract.test.tsx
    - **Given:** Tone screen mounted with VoiceOver active or announcement pending
    - **When:** 2s timer would fire
    - **Then:** Timer cleared on pause, re-armed on resume, ~5s fallback unblocks; dismiss tap intact

#### AC-6: Largest Dynamic Type — HUD, menu, lane cards, game-over stats, banners never truncate (tile numerals fixed per UX-DR-18) (P1)

- **Coverage:** FULL ✅
- **Tests:**
  - `[P0] Dynamic Type guard` - triade/__tests__/a11y/screenReader.contract.test.tsx
    - **Given:** Largest accessibility text scale
    - **When:** Chrome renders
    - **Then:** `allowFontScaling` present, no truncation (GameOver numerals keep accepted `numberOfLines=1` ellipsis per DW-101)

#### AC-PB1: Preview display announced on genuine change; mount silent; empty silent; en+pt i18n (P0, delta)

- **Coverage:** FULL ✅
- **Tests:**
  - `P0-API-PB-01`/`P0-API-PB-02` - gateway.spec.ts — EN `Next 8` / PT `Próxima 8`, exactly one message
  - `P0-API-PB-03` - gateway.spec.ts — `announcePreview('')` queues nothing
  - `P0-API-PB-05` - gateway.spec.ts — `a11y.preview` exists en+pt with `{{display}}` (closes TD R-D3 key gap at suite level)
  - `P0-UMB-PB-01` - umbrella.spec.ts — fresh mount renders label, `captured` empty, `prevPreviewRef.current === null` skip pinned
  - `P0-UMB-PB-02` - umbrella.spec.ts — display change → one EN announcement; same display → silent by construction
  - `P0-UMB-PB-03` - umbrella.spec.ts — PT end-to-end card label + preview announcement
  - `[P0] announcement strings` (preview branch `:170-171`) - contract.test.tsx — standing pin

#### AC-PB2: Banners announce on false→true only; mount silent; empty/raw-key guarded; ceiling→stuck order (P0, delta)

- **Coverage:** FULL ✅
- **Tests:**
  - `P0-API-PB-04` - gateway.spec.ts — verbatim passthrough; empty stays silent
  - `P0-API-PB-06` - gateway.spec.ts — 7-row transition matrix (mount silent, false→true announces, steady/flip silent)
  - `P1-API-PB-08` - gateway.spec.ts — `prevBannerRef === null` skip + `showCeilingBanner && !prev.ceiling` / `showStuckBanner && !prev.stuck` + `msg && msg !== key` guards (review patches pinned)
  - `P1-UMB-PB-05` - umbrella.spec.ts — both banners fire once each, ceiling→stuck order, locale-resolved text

#### AC-PB3: PreviewCard accessibilityLabel i18n-authored via a11y.preview with EN fallback, role text, lane note (P1, delta)

- **Coverage:** FULL ✅
- **Tests:**
  - `P1-API-PB-09` - gateway.spec.ts — `i18n.t('a11y.preview'` + `accessibilityLabel={announcement}` + `role text` + `Next` fallback
  - `P1-UMB-PB-06` - umbrella.spec.ts — lane-labeled card keeps display + lane note inside i18n wrapper
  - `P0-UMB-PB-03` - umbrella.spec.ts — PT card label matches `/Próxima/`

#### AC-PB4: Display derivation — exact value, range join, NaN filtered, empty/malformed → '' (P1, delta)

- **Coverage:** FULL ✅
- **Tests:**
  - `P1-UMB-PB-04` - umbrella.spec.ts — 6 fixture shapes (EXACT_8/NaN, RANGE_123/with-NaN/empty, MALFORMED) + empty stays silent through contract

#### AC-PB5: Engine untouched (bridge-only); bursts of distinct changes all announce (no throttle on preview/banner); follow-up pins tracked (P2, delta)

- **Coverage:** FULL ✅
- **Tests:**
  - `P2-UMB-PB-07` - umbrella.spec.ts — `git diff d26bbdd..HEAD -- triade/src/engine` empty (ADR-01 purity)
  - `P2-UMB-PB-08` - umbrella.spec.ts — back-to-back distinct previews both queue; `announcePreview` body has no throttle
  - `P2-API-PB-10` - gateway.spec.ts — P1-D1..D4 red scaffolds durably reference `a11y.preview`/`announcePreview`/`announceBanner`/`prevPreviewRef`/`prevBannerRef` (no silent drop)
  - `P2-API-PB-11` - gateway.spec.ts — `announcePreview`/`announceBanner` exist with empty guards, preview i18n-wrapped

#### AC-PB6: Device ear-check — preview/banner heard once, mount silent, no spam, TalkBack parity (P3, manual)

- **Coverage:** NONE ℹ️ (manual, operator-owned — story is `awaiting-operator`; spec `operator_actions` items 3+6 are the vehicle)
- **Gaps:** None automatable (genuine screen-reader behaviour needs a human ear).
- **Recommendation:** Operator runs P3-D1 (iOS VoiceOver) + P3-D2 (Android TalkBack) before closing `awaiting-operator`; sign-off checkbox in story close-out. Not a gate blocker.

---

### Step 4 — Gap analysis

#### Critical Gaps (BLOCKER) ❌

0 gaps found. All 7 P0 criteria FULL.

#### High Priority Gaps (PR BLOCKER) ⚠️

0 gaps found. All 3 P1 criteria FULL.

#### Medium Priority Gaps (Nightly) ⚠️

0 gaps found. P2 FULL.

#### Low Priority Gaps (Optional) ℹ️

1 item tracked, informational only:

1. **AC-PB6: device ear-check** (P3)
   - Current Coverage: NONE (manual by design)
   - Recommend: operator VoiceOver/TalkBack journey per spec `operator_actions`

### Coverage Heuristics Findings

- Endpoints without direct API tests: 0 (no endpoints in delta; engine diff empty — pinned).
- Auth negative-path gaps: n/a (no auth surface).
- Happy-path-only criteria: 0 — error paths pinned (NaN/empty/malformed → silent; empty banner → silent; raw-key guarded).
- UI journeys without E2E: 0 automated (mount/change/PT journeys covered); 1 manual (AC-PB6 device ear).
- UI states missing coverage: 0 (loading n/a; empty covered via silent-empty; error covered via guards).

### Quality Assessment

All 34 active tests meet quality gates: explicit assertions present, Given-When-Then
narrative in test names + comments, no hard waits except the score-throttle test's 600ms
real-time throttle window (deterministic by design, <90s), files <300 lines (285/188/182),
durations <1s each. No BLOCKER/WARNING/INFO issues.

Self-review note: gateway/umbrella suites use source-pattern pins (`readSource` regex) for
wiring effects — appropriate here (effects live inside `App.tsx`; the pins are tripwires
against refactor-removal, consistent with the existing contract file's own App-gate static
test). Behavioural paths (announce fns, i18n, transition matrix, PreviewCard render) are
asserted through real modules, not patterns.

### Duplicate Coverage Analysis

Acceptable overlap (defense in depth): AC-PB1/PB2 asserted at both API-contract level
(fn behaviour) and E2E-journey level (component + i18n + capture) — justified: different
failure modes (fn regression vs wiring/locale regression). PreviewCard label pinned in both
gateway (static) and umbrella (rendered) — justified (wording vs composition).
No unacceptable duplication.

### Coverage by Test Level

| Test Level | Tests    | Criteria Covered | Coverage % |
| ---------- | -------- | ---------------- | ---------- |
| E2E        | 8        | 6                | 75%        |
| API        | 11       | 6                | 75%        |
| Component  | 0        | 0                | n/a        |
| Unit       | 15       | 8                | 100%       |
| **Total**  | **34**   | **11/12**        | **92%**    |

### Traceability Recommendations

Immediate (before close of `awaiting-operator`):
1. **Operator ear-check** — P3-D1 (iOS) + P3-D2 (Android): preview/banner audibility, mount silence, no spam. Owner: operator.
2. **P1-D1..D4 contract migration (optional hardening)** — move the `a11y.preview` key pin + PT phrasing + App-gate `announcePreview|announceBanner` + change-check pins into `screenReader.contract.test.tsx`; durably tracked by P2-API-PB-10 + red scaffolds. Owner: DEV. Not coverage-blocking (invariants already pinned in working-tree suites).

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

### Evidence Summary

- **Total Tests**: 34 active (15 contract + 11 gateway + 8 umbrella), 6 skipped RED scaffolds (by design)
- **Passed**: 34/34 (100%)
- **Failed**: 0 · **Skipped**: 0 active (6 intentional ATDD scaffolds)
- **Duration**: <2s combined host runs
- **P0 Tests**: 25/25 passed (100%) ✅
- **P1 Tests**: 7/7 passed (100%) ✅
- **P2 Tests**: 4/4 passed (100%) ✅
- **Overall Pass Rate**: 100% ✅
- **Test Results Source**: local runs 2026-09-07 (gateway 11/11, umbrella 8/8, contract 15/15)
- **P0 Coverage**: 7/7 FULL (100%) ✅ · **P1 Coverage**: 3/3 FULL (100%) ✅ · **Overall**: 11/12 FULL (92%) ✅
- **NFRs**: Accessibility status-messages conformance ✅ (contract green); i18n parity en+pt ✅; never-throw (try/catch) ✅; no perf impact (2 effects + 1 memo on rendered state) ✅. Security n/a.
- **Flakiness**: no burn-in needed (deterministic host tests, no timers except 600ms throttle window which passed).

### Decision Criteria Evaluation

| Criterion | Threshold | Actual | Status |
| --------- | --------- | ------ | ------ |
| P0 Coverage | 100% | 100% | ✅ PASS |
| P0 Test Pass Rate | 100% | 100% | ✅ PASS |
| Overall Coverage | ≥80% | 92% | ✅ PASS |
| P1 Coverage | ≥90% (min 80%) | 100% | ✅ PASS |

### GATE DECISION: PASS

### Rationale

P0 coverage is 100% (7/7 FULL) with 100% P0 pass rate; P1 coverage 100% (target 90%);
overall 92% (minimum 80%). Zero critical/high gaps, zero security issues, zero flaky tests.
The single NONE item (AC-PB6) is a P3 manual device ear-check that is unautomatable by
design and tracked as residual risk — it does not block per priority-threshold rules, and
the story correctly remains `awaiting-operator` until the human ear-check signs off
(orchestrator bookkeeping, untouched by this workflow).

### Residual Risks

1. **Device audibility unconfirmed (P3)** — Probability Low × Impact Medium. Mitigation: operator ear-check before story close; remediation: follow-up story if spammy/flickery (design notes R-D1/R-D2).
2. **P1-D1..D4 pins live outside the contract file (P1, LOW)** — Probability Low × Impact Low. Mitigation: P2-API-PB-10 durability pin + red scaffolds; remediation: optional migration edit.
3. **DW-112/113/101 accepted residuals** — unchanged by this delta, tracked in deferred-work.md.

### Next Steps

1. Operator completes VoiceOver/TalkBack ear-check and closes `awaiting-operator`.
2. Optional: DEV migrates P1-D1..D4 pins into the contract file (activates 4 skipped scaffolds RED→GREEN).
3. No deployment block from this gate.

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  traceability:
    story_id: "9-2-screen-reader-contract"
    date: "2026-09-07"
    coverage:
      overall: 92%
      p0: 100%
      p1: 100%
      p2: 100%
      p3: 0%
    gaps:
      critical: 0
      high: 0
      medium: 0
      low: 1
    quality:
      passing_tests: 34
      total_tests: 34
      blocker_issues: 0
      warning_issues: 0
    recommendations:
      - "Operator ear-check (P3-D1/P3-D2) before awaiting-operator close"
      - "Optional P1-D1..D4 contract migration (tracked, non-blocking)"
  gate_decision:
    decision: "PASS"
    gate_type: "story"
    decision_mode: "deterministic"
    criteria:
      p0_coverage: 100%
      p0_pass_rate: 100%
      p1_coverage: 100%
      p1_pass_rate: 100%
      overall_pass_rate: 100%
      overall_coverage: 92%
      security_issues: 0
      critical_nfrs_fail: 0
      flaky_tests: 0
    evidence:
      test_results: "local 2026-09-07: gateway 11/11, umbrella 8/8, contract 15/15"
      traceability: "_bmad-output/test-artifacts/traceability/traceability-matrix-9-2-screen-reader-contract-working-tree.md"
      nfr_assessment: "targeted TD NFR planning (test-design-9-2-screen-reader-contract-td-20260907.md)"
      code_coverage: "n/a (RN bridge, host contract tests)"
    next_steps: "Operator ear-check, then close awaiting-operator; optional P1-D1..D4 migration"
```

## Related Artifacts

- **Story Spec:** _bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md
- **Test Design:** _bmad-output/test-artifacts/test-design/test-design-9-2-screen-reader-contract-td-20260907.md
- **Standing TD:** _bmad-output/test-artifacts/test-design/test-design-epic-9-2-screen-reader-contract.md
- **Test Files:** triade/__tests__/a11y/screenReader.contract.test.tsx; _bmad-output/test-artifacts/tests/api + tests/e2e (preview-banner); atdd-tests red scaffold; fixtures

## Sign-Off

- Overall Coverage: 92% · P0: 100% ✅ · P1: 100% ✅ · Critical: 0 · High: 0
- **Decision**: PASS ✅ · P0 Evaluation: ✅ ALL PASS · P1 Evaluation: ✅ ALL PASS
- **Generated:** 2026-09-07 · **Workflow:** testarch-trace (working-tree delta d26bbdd..HEAD + untracked suites)

<!-- Powered by BMAD-CORE™ -->

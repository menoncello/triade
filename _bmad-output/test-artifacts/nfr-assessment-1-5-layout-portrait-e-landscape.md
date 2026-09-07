---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04e-aggregate-nfr', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-09-07'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-1-5-layout-portrait-e-landscape.md'
  - '_bmad-output/test-artifacts/automation-summary-1-5-layout-portrait-e-landscape.md'
  - '_bmad-output/test-artifacts/coverage-matrix-1-5-layout-portrait-e-landscape.json'
  - '_bmad-output/test-artifacts/traceability/traceability-matrix-1-5-layout-portrait-e-landscape-tea.trace-0.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
  - 'triade/src/ui/layout.ts'
  - 'triade/src/ui/orientation.ts'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/PauseButton.tsx'
  - 'triade/app.json'
---

# NFR Evidence Audit: 1-5-layout-portrait-e-landscape

**Date:** 2026-09-07
**Story:** 1-5-layout-portrait-e-landscape (Layout portrait e landscape, `awaiting-operator`)
**Overall Status:** CONCERNS ⚠️

---

Note: This audit summarizes existing implementation evidence; it does not run tests or CI workflows beyond the host verification reads listed below. NFR thresholds come from the epic test-design NFR planning table (primary source per workflow Step 2 rule 0); raw story/project-context filled only what was missing. Nothing was guessed: every threshold below is either defined or marked UNKNOWN.

**Working-tree delta under audit:** NONE in production — `git diff HEAD --stat` shows only the story doc's own regression-run note (`1-5-layout-portrait-e-landscape.md`) plus the orchestrator-owned `sprint-status.yaml` (untouched per instructions). HEAD already satisfies all ACs at `final_revision 0ffd59a`. All findings below assess the shipped Story 1.5 state (orientation unlock + safe-area infra + pure layout + HUD/PauseButton + App wiring).

## Executive Summary

**Assessment:** 9 PASS, 4 CONCERNS, 0 FAIL (N/A excluded from the count)

**Blockers:** 0 (no FAIL finding; nothing blocks merge on NFR grounds)

**High Priority Issues:** 0 (the two CONCERNS that matter — rotation-stress observation, dependency-scan evidence — are both owned follow-ups, not code defects)

**Recommendation:** Merge/deploy with the operator rotation session scheduled. The analytic half of every NFR is green (pure math, tripwires, tsc); the residual is the device-temporal half (rotation stress, R-002) plus two evidence-hygiene items (dependency scan, coverage %). Keep DW-6/DW-7 open and re-run `*nfr-assess` after the operator session only if device observations contradict the analytic pins.

---

## Performance Assessment

### Frame-budget impact (layout math off the hot path)

- **Status:** PASS ✅
- **Threshold:** `layoutFor` is O(1) pure math, invoked on dimension/inset change only — 60 FPS budget unaffected (project rule: CI covers pure, device covers gesture/pixel)
- **Actual:** Straight-line arithmetic (`Math.max`/`Math.min`, no loops, no allocation, no timers); 26 committed UI tests execute in ~150ms host-side; automate bundle 36/36 in ~215ms
- **Evidence:** `triade/src/ui/layout.ts` (61 lines, read this run); host run `node --test triade/__tests__/ui/` → 26 pass / 0 fail; automation summary Step 3c (36/36)
- **Findings:** No worklet, no frame callback, no logging in the layout path (grep verified: no `console.*`/`Logger`/`Crashlytics` in `triade/src/ui/`). Meets threshold with margin.

### Response time / throughput (server)

- **Status:** N/A
- **Threshold:** Not applicable — offline single-device game, no network surface in the layout path
- **Actual:** N/A
- **Evidence:** N/A (grep verified: no `fetch`/`XMLHttpRequest`/`WebSocket`/`axios` in `triade/src/ui/`)

### Resource usage (allocation, timers, logging)

- **Status:** PASS ✅
- **Threshold:** Allocation-free layout path; worklet/release log ban honored; no timers or retained subscriptions
- **Actual:** No allocation beyond the returned `{ boardSize, bandHeight, isLandscape }` object; no `setTimeout`/`setInterval`/subscriptions in `layout.ts`/`orientation.ts`; no logging surface
- **Evidence:** `triade/src/ui/layout.ts` + `orientation.ts` source read; `NO_LOG_IN_SRC_UI` grep result this run
- **Findings:** Meets threshold. The project hard rule (never log in worklets/release frame math) is structurally satisfied — there is nothing in this path that could log.

---

## Security Assessment

### Authentication / Authorization

- **Status:** N/A
- **Threshold:** Not applicable — iOS-first offline game, no accounts/backend (project-context platform rules)
- **Actual:** N/A — layout path touches dimensions/insets only, never credentials, sessions, or entitlements
- **Evidence:** N/A

### Data protection (PII, network exfiltration)

- **Status:** PASS ✅
- **Threshold:** No PII collected, stored, or transmitted in the layout path; no network calls
- **Actual:** Confirmed — pure dimension/inset math; no storage, no network, no identifiers
- **Evidence:** Source read of `layout.ts`/`orientation.ts`/`Hud.tsx`/`PauseButton.tsx`; `NO_NET_IN_SRC_UI` grep result this run
- **Findings:** Meets threshold with no gaps.

### Vulnerability management (dependencies)

- **Status:** CONCERNS ⚠️
- **Threshold:** UNKNOWN. No dependency-scan gate threshold was found in the test-design NFR plan, story, or project-context during Step 2.
- **Actual:** The story's one new dependency (`react-native-safe-area-context` ~5.7.0, SDK 57 lockstep via `npx expo install`) ships pinned; no scan output (npm audit / Snyk / Dependabot) was collected in this run
- **Evidence:** MISSING for this run — `triade/package.json` pin cited in story completion notes; no scan artifact under `_bmad-output/test-artifacts/`
- **Findings:** The pin (+ SDK-lockstep install discipline) would support a PASS, but the finding is downgraded to CONCERNS: the threshold was UNKNOWN at Step 2 and no scan evidence exists. An absent measurement is not evidence the target was met.
- **Recommendation:** Let the repo's existing CI audit own this (no new scan harness for a layout story); record the pin as the mitigation meanwhile.

### Compliance (logging bans, PWA freeze)

- **Status:** PASS ✅
- **Threshold:** Worklet/release log ban honored; web PWA frozen files untouched
- **Actual:** No logging in `src/ui`; `git diff` shows zero changes to `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js`
- **Evidence:** Grep results + `git diff --stat HEAD` this run
- **Findings:** Meets threshold.

---

## Reliability Assessment

### Crash / NaN safety (degenerate inputs)

- **Status:** PASS ✅
- **Threshold:** Rotation transients and degenerate inputs never throw, never produce NaN, never produce a negative board (clamp to 0)
- **Actual:** Non-finite width/height/insets → `{ boardSize: 0, bandHeight: 96, isLandscape: false }`; `Math.max(0, …)` floor on the available board; extreme aspects finite and ≥ 0
- **Evidence:** `layout.ts:37-52` guard + clamp (read this run); `layout.test.ts` degenerate + extreme-aspect cases green (part of 26/26); automate D-1 unit cases (degenerate/extreme/determinism) 36/36 bundle
- **Findings:** Meets threshold with margin.

### Rotation stability (portrait↔landscape without persistent mislayout)

- **Status:** CONCERNS ⚠️
- **Threshold:** Rotation portrait↔landscape recovers without crash, NaN board, or persistent mislayout; transient contained to one frame
- **Actual:** Analytic half green — round-trip unit case (96→48→96, deep-equal portraits, finite/non-negative) + `useSyncedLayout` debounce + last-valid guard (gateway-pinned). Temporal half unobserved — manual rotation stress (rapid rotate ×10, mid-scroll rotation, one-frame flash note) is part of the owed operator session (R-002, DW-6)
- **Evidence:** Automate umbrella round-trip + gateway synced-seam tests (36/36); traceability OP-1 PARTIAL; story `operator_actions` still open (`awaiting-operator`)
- **Findings:** Unit containment evidence exists, but the device-temporal observation does not. Downgraded to CONCERNS (evidence incomplete), not FAIL — no automated signal contradicts the threshold.
- **Recommendation:** Bundle the rotation stress into the scheduled operator session (~20 min of the ~1h simulator pass); file/refresh DW-6 with observations.

### Availability / MTTR / Disaster recovery

- **Status:** N/A
- **Threshold:** Not applicable — client-side offline game; no uptime SLO, no incident-response path, no durable server state in this story
- **Actual:** N/A
- **Evidence:** N/A

### CI burn-in (stability over time)

- **Status:** CONCERNS ⚠️
- **Threshold:** UNKNOWN. No burn-in iteration threshold exists for this repo (no burn-in harness; suites are synchronous pure-math + source scans).
- **Actual:** 2 consecutive green runs observed this session (committed 26/26 + automate-bundle evidence 36/36 cited from 2026-09-07 runs); zero flaky patterns by construction (no waits, no shared state)
- **Evidence:** Host run output this session (26/26); automation summary Step 3c; traceability flakiness section (`not_available`)
- **Findings:** Deterministic-by-construction is documented, but with no burn-in threshold the finding defaults to CONCERNS per the no-guessing rule. Informational only — do not build a burn-in harness for a pure layout seam.

---

## Maintainability Assessment

### Pure/native split + thin views (architecture contract)

- **Status:** PASS ✅
- **Threshold:** `layout.ts`/`orientation.ts` import nothing from RN/React/Skia/Expo (ADR-01/05); HUD components stay thin views importing only tokens
- **Actual:** Purity + thin-view + HIT_TARGET tripwires all green; `Hud.tsx` imports only `SAFE_MARGIN`/`getBandTop`/`EdgeInsets`-type from `./layout` (symbol-level allowlist enforced)
- **Evidence:** Host run `ui.purity.test.ts` + `ui.thinview.test.ts` green (part of 26/26 this run); gateway purity + thin-view scans in the 36/36 bundle; `tsc --noEmit -p triade/tsconfig.json` clean (exit 0, verified this run)
- **Findings:** Meets threshold with margin.

### Constant-drift protection (band heights, hit target, floor)

- **Status:** PASS ✅
- **Threshold:** `PORTRAIT_BAND_HEIGHT=96` / `LANDSCAPE_BAND_HEIGHT=48` / `HIT_TARGET=48` / `SAFE_MARGIN=16` / `BOARD_SIZE_FLOOR` derivation pinned against silent "tidy-up" edits
- **Actual:** Golden anchors (96/48 + height-bounded 500×580 fixture 452=580−32−96) + non-tautological asymmetric-bind case + HIT_TARGET literal regex (no arithmetic) + floor single-source import — all green
- **Evidence:** `layout.test.ts` golden + asymmetric cases (26/26); gateway floor-single-source + HIT_TARGET-literal tests (36/36 bundle); source read confirms shipped values (`layout.ts:4-6`, `PauseButton.tsx:3`, `app.json` orientation `default`)
- **Findings:** Meets threshold. The exact-fit risk (band 48 vs HIT_TARGET 48, zero slack — R-004) is pinned, not just documented.

### Test coverage (line/branch %)

- **Status:** CONCERNS ⚠️
- **Threshold:** UNKNOWN. No line/branch/function coverage % target exists for this repo (no coverage instrument configured).
- **Actual:** 26/26 committed UI + 36/36 automate bundle green; purity + golden-anchor tripwires act as the structural substitute (documented in traceability, not gated)
- **Evidence:** Host run outputs; traceability coverage section (`NOT_ASSESSED (no instrument; tripwire substitute noted)`)
- **Findings:** Suite-health evidence is strong, but with no % threshold the dimension defaults to CONCERNS per the no-guessing rule. Do not instrument coverage for this story — the tripwire layering is the accepted substitute.
- **Recommendation:** If the team ever instruments coverage repo-wide, set the threshold then; until that day this dimension stays CONCERNS-by-construction on every 1.5 audit.

### Code duplication / drift (band formula, App↔Hud)

- **Status:** PASS ✅
- **Threshold:** No unguarded duplication; known duplication (band-height formula between `App.tsx` call-site arithmetic and `Hud.tsx`) stays deferred with a named owner and a guard test
- **Actual:** Duplication is explicitly deferred in the story (Review[Defer], R-007) with the DW layout-band-dedup guard; single-source rule (`getBandTop`) enforced for new call-sites
- **Evidence:** Story Review Findings + test-design R-007 + DW follow-up reference; `getBandTop` usage in `Hud.tsx:104,150`
- **Findings:** Meets threshold — acknowledged tech debt with an owner and a guard is not a finding against the threshold.

---

## Custom NFR Evidence Audits

### Accessibility (pause target, Dynamic Type, safe margins)

- **Status:** PASS ✅ (analytic half) with the pixel half tracked under Reliability/CONCERNS
- **Threshold:** Pause ≥44×44 in both orientations; HUD honors Dynamic Type (default `allowFontScaling`); safe margins 16pt + per-edge insets both orientations
- **Actual:** `HIT_TARGET=48` literal applied to the button box (`PauseButton.tsx:24-25`) + pause slots sized from it; all HUD `Text`s keep default font scaling with `numberOfLines` guards; `getBandTop` stacking (159 portrait-notch anchor, 64 zero-inset) green
- **Evidence:** HIT_TARGET tripwire + bandTop anchors green (26/26 + 36/36 bundle); `Hud.tsx` source read (allowFontScaling present, `numberOfLines={2}` on scores)
- **Findings:** Analytic contract meets threshold. Max-Dynamic-Type rotation pixel check (R-010, P2 manual) rides along with the operator session — tracked, not a separate gate.

---

## Quick Wins

2 quick wins identified (both zero-code, both already available):

1. **Reuse the scheduled operator session for three checks at once** (Reliability, LOW effort, ~1h bundled)
   - R-001 visual pass + R-002 rotation stress + R-006 non-notch legibility in one simulator sitting.
   - Closes the single CONCERNS with device evidence; no code changes needed.

2. **Point the next audit at the repo CI audit log for the dependency pin** (Security, LOW effort, ~10 min)
   - Attach the existing CI dependency-audit output covering `react-native-safe-area-context` ~5.7.0 to clear the vuln-management CONCERNS without any new harness.

---

## Recommended Actions

### Before closing 1.5: MEDIUM priority (all manual, all owned)

1. **Run the operator rotation session** (MEDIUM, ~1h, owner: Eduardo)
   - Boot the dev build on the iOS simulator (iPhone 17 Pro per story record) in portrait; confirm score 34pt center-top, best below, preview bottom corner, pause top-right vs `key-game-portrait.html`.
   - Rotate (Cmd+arrow); confirm thin 22/11pt band, score+best left, preview right beneath/left of pause with no overlap, board dominant below vs `key-game-landscape.html`; tap pause both ways.
   - Add rotation stress (rapid rotate ×10, mid-scroll rotation, one-frame flash note for DW-6) + non-notch landscape legibility read (DW-7 class).
   - Validation: evidence recorded in the story completion note; orchestrator flips `awaiting-operator` → `done`; re-run `*trace` to flip OP-1 → FULL and this audit's Reliability item → PASS.

### Next milestone: LOW priority

1. **Decide the coverage-% question repo-wide, once** (LOW, owner: Dev lead)
   - Either instrument coverage and set a threshold (this dimension becomes scorable) or formally record "tripwire substitute, never gated" (this dimension stays CONCERNS-by-construction without further discussion).

### Backlog: LOW priority

1. **DW-6 / DW-7 follow-ups consume the operator observations when scheduled** (LOW)
   - No new story needed; the deferred items already exist with owners.

---

## Monitoring Hooks

No new production monitoring is warranted for a pure offline layout seam. The existing guards are the monitors:

- **Maintainability monitor:** committed `__tests__/ui/` tripwires (purity, thin-view, HIT_TARGET, band anchors) run on every PR — any `src/ui/` touch re-runs them plus the 36-test automate bundle.
  - **Owner:** Dev
  - **Deadline:** ongoing (per-PR)
- **Reliability monitor:** `useSyncedLayout` debounce + last-valid guard (gateway-pinned) contains the rotation transient analytically until DW-6 is scheduled.
  - **Owner:** Dev
  - **Deadline:** DW-6 scheduling

---

## Fail-Fast Mechanisms

- **Degenerate-input clamp** (`layout.ts:37-52`): non-finite inputs fail fast to `{ boardSize: 0, bandHeight: 96, portrait }` — no throw, no NaN propagation. Shipped and tested. ✅
- **Available-space floor** (`layout.ts:52`): `Math.max(0, …)` guarantees a never-negative board on cramped/extreme containers. Shipped and tested. ✅
- **Config kill-switch visibility:** `app.json` `expo.orientation: "default"` is pinned by the gateway orientation-unlock test — a one-line regress to `"portrait"` breaks the suite loudly instead of shipping a silently portrait-locked app. ✅

---

## Evidence Gaps

2 evidence gaps identified (both owned, neither a code defect):

- [ ] **Rotation-stress observation** (Reliability)
  - **Owner:** Eduardo
  - **Deadline:** Before closing 1.5 (with the operator session)
  - **Suggested Evidence:** Operator note (rapid-rotate ×10, scroll-offset behavior, flash visibility) in the story completion note
  - **Impact:** The analytic containment (`useSyncedLayout`) is pinned, but the temporal behavior is unobserved; landscape-adjacent reliability stays CONCERNS until then.

- [ ] **Dependency-scan output for the safe-area-context pin** (Security)
  - **Owner:** Dev / CI
  - **Deadline:** Next milestone (informational)
  - **Suggested Evidence:** Existing CI dependency-audit log covering `react-native-safe-area-context` ~5.7.0
  - **Impact:** Vuln-management stays CONCERNS-by-default until a scan artifact is attached; no new harness warranted.

---

## Four-Domain Findings Summary

| Domain          | Findings Assessed | PASS | CONCERNS | FAIL | N/A | Overall Status |
| --------------- | ----------------- | ---- | -------- | ---- | --- | -------------- |
| Performance     | 3                 | 2    | 0        | 0    | 1   | PASS ✅        |
| Security        | 4                 | 2    | 1        | 0    | 1   | CONCERNS ⚠️    |
| Reliability     | 4                 | 1    | 2        | 0    | 1   | CONCERNS ⚠️    |
| Maintainability | 4                 | 3    | 1        | 0    | 0   | CONCERNS ⚠️    |
| Accessibility (custom) | 1          | 1    | 0        | 0    | 0   | PASS ✅        |
| **Total**       | **16**            | **9**| **4**    | **0**| **3**| **CONCERNS ⚠️**|

**Cross-Domain Risks:**

- Reliability + Maintainability: the rotation-race transient (R-002) is analytically contained by `useSyncedLayout`, but the observation proving the containment is the same owed operator session that holds the trace gate at CONCERNS — one session clears both workflows.
- Security + Maintainability: neither CONCERNS reflects a code weakness (pin discipline + tripwire layering are both green); both reflect missing second-order evidence (scan log, coverage %) that this repo has deliberately never gated on.

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-09-07'
  story_id: '1-5-layout-portrait-e-landscape'
  feature_name: 'Layout portrait e landscape'
  categories:
    testability_automation: 'PASS'
    test_data_strategy: 'N/A'
    scalability_availability: 'N/A'
    disaster_recovery: 'N/A'
    security: 'CONCERNS'
    monitorability: 'PASS'
    qos_qoe: 'CONCERNS'
    deployability: 'PASS'
  audited_domains:
    security: 'CONCERNS'
    performance: 'PASS'
    reliability: 'CONCERNS'
    maintainability: 'CONCERNS'
  overall_status: 'CONCERNS'
  critical_issues: 0
  high_priority_issues: 0
  medium_priority_issues: 1
  concerns: 4
  blockers: false
  quick_wins: 2
  evidence_gaps: 2
  recommendations:
    - 'Run the operator rotation session (visual + stress + non-notch) before closing 1.5 (MEDIUM)'
    - 'Attach the CI dependency-audit log for the safe-area-context pin (LOW)'
    - 'Decide the coverage-% question repo-wide, once (LOW)'
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md`
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-epic-1-5-layout-portrait-e-landscape.md`
- **Automation Summary:** `_bmad-output/test-artifacts/automation-summary-1-5-layout-portrait-e-landscape.md`
- **Coverage Matrix:** `_bmad-output/test-artifacts/coverage-matrix-1-5-layout-portrait-e-landscape.json`
- **Traceability & Gate:** `_bmad-output/test-artifacts/traceability/traceability-matrix-1-5-layout-portrait-e-landscape-tea.trace-0.md` (gate: CONCERNS, OP-1 owed)
- **Gate Decision JSON:** `_bmad-output/test-artifacts/nfr-gate-decision-1-5-layout-portrait-e-landscape.json`
- **Evidence Sources (this run):**
  - Host: `node --test triade/__tests__/ui/` → 26 pass / 0 fail (~150ms)
  - Static: `tsc --noEmit -p triade/tsconfig.json` → clean; greps (`NO_LOG_IN_SRC_UI`, `NO_NET_IN_SRC_UI`); `git diff --stat HEAD` (production delta: none)
  - Prior runs: automate bundle 36/36 (2026-09-07, per automation summary Step 3c)

---

## Recommendations Summary

**Release Blocker:** None — zero FAIL findings. Nothing blocks merge on NFR grounds.

**Medium Priority:** Operator rotation session (Reliability/CONCERNS) — the one device-evidence item that also flips the trace gate to PASS. Owned by Eduardo, due before closing 1.5.

**Low Priority:** Dependency-scan log attachment (Security/CONCERNS), coverage-% repo decision (Maintainability/CONCERNS), DW-6/DW-7 consumption of operator observations. None urgent, none code.

**Next Steps:** Schedule the ~1h operator simulator session; record evidence in the story completion note; re-run `*trace` (OP-1 → FULL) and optionally `*nfr-assess` (Reliability → PASS) afterwards.

---

## Sign-Off

**NFR Evidence Audit:**

- Overall Status: CONCERNS ⚠️
- Critical Issues: 0
- High Priority Issues: 0
- Concerns: 4
- Evidence Gaps: 2

**Gate Status:** CONCERNS ⚠️ (non-blocking; holding pattern for `awaiting-operator`)

**Next Actions:**

- If PASS ✅: Run `/bmad-testarch-trace` Phase 2 for the release gate decision, or release
- If CONCERNS ⚠️: Address HIGH/CRITICAL issues, re-run `/bmad-testarch-nfr` — here: run the operator session, then re-trace
- If FAIL ❌: Resolve FAIL status NFRs, re-run `/bmad-testarch-nfr` — n/a (no FAIL)

**Generated:** 2026-09-07
**Workflow:** testarch-nfr v5.0

---

<!-- Powered by BMAD-CORE™ -->

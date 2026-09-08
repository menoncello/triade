---
stepsCompleted: ['step-01-load-context', 'step-02-define-thresholds', 'step-03-gather-evidence', 'step-04-evaluate-and-score', 'step-05-generate-report']
lastStep: 'step-05-generate-report'
lastSaved: '2026-09-07'
workflowType: 'testarch-nfr-assess'
inputDocuments:
  - '_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md'
  - '_bmad-output/test-artifacts/test-design/test-design-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md'
  - 'triade/src/game/preview.ts'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/App.tsx'
  - 'triade/__tests__/game/preview.test.ts'
  - '_bmad/tea/config.yaml'
---

# NFR Evidence Audit: 7.2 Preview card no HUD (60/40) nas duas pistas

**Date:** 2026-09-07
**Story:** 7-2-preview-card-no-hud-60-40-nas-duas-pistas (final_revision ee3ce91, D-008 verification delta)
**Overall Status:** CONCERNS ⚠️ (non-blocking)

---

Note: This audit summarizes existing implementation evidence; it does not run tests or CI workflows. NFR thresholds and planned evidence come from the story spec and the epic-level test design (`test-design-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md` §NFR Planning). The working tree is clean except orchestrator-owned `_bmad-output` bookkeeping (`sprint-status.yaml` + TEA traceability artifacts from the sibling trace workflow); there is **no uncommitted production diff** — the assessed surface is the committed 7.2 change + D-008 delta (null guards in `previewFor` + 3 pins). Per the task brief, `sprint-status.yaml` rows at done/awaiting-operator are bookkeeping, not defects, and were not assessed.

## Executive Summary

**Assessment:** 4 PASS, 1 CONCERNS, 0 FAIL (5 assessed dimensions; Scalability/DR/Deployability N/A — pure client render projection, offline game, no deploy change).

**Blockers:** 0 — no FAIL in any category. Nothing here blocks release or the trace gate.

**Tracked residuals (all owner-accepted, with follow-up owners):** R-001 `exact-0` degrade path renders `"0"` (unreachable in production — engine guarantees well-formed `PendingSpawn`); R-002 identical-input per-lane fan-out (Epic 3 differentiates); R-003 basic-window content semantics (story 7.3 hardens).

**Recommendation:** Accept from an NFR standpoint (CONCERNS, non-blocking). Carry R-001 as a low-priority follow-up (degrade content, not crash posture), and let Epic 3 / story 7.3 own R-002 / R-003 per the spec's division of labor. Re-run `nfr-assess` only if the degrade path or the `previews` prop contract changes.

**Working-tree evidence snapshot (verified this session):**
- `npm test` in `triade/` → 1472 tests, **1027 pass / 0 fail / 445 skipped** (skips pre-existing). Includes the 3 D-008 pins (`previewFor(null)` / `(undefined)` / `(valid, null)` — all green, no throw), purity/determinism/0-draw pins, `previewCard` chip pins, `hud` wiring pins, and the `ui.norolls` / `ui.thinview` / `ui.purity` static guards (all green).
- `npx tsc --noEmit` (default tsconfig, the CI gate) → clean, exit 0.
- `npx tsc --noEmit -p tsconfig.test.json` → only the ledgered pre-existing errors in untouched files (`App.tsx __DEV__`, `ThemeContext.tsx` theme comparison) — byte-for-byte the set waived since 7-1; **zero new errors** from 7-2 files.
- `git diff --stat -- triade/src/engine` → empty (engine wall holds, ADR-01).
- Code inspection: `triade/src/game/preview.ts` (pure, ULP-stabilized `roll + EPSILON < 0.6` boundary per DW-78, frozen memo-safe arrays per DW-80, D-008 null guards) and `triade/src/ui/PreviewCard.tsx` (`displayOf` shape guard, chip chrome `#f1eee6`/`#c9c4b8`/12pt, value `#E8A33D` @20pt 700 tabular-nums, `accessibilityLabel="Próxima: …"`, `pointerEvents="none"`, zero animation/transform props).

---

## Performance Assessment

### Compute cost (render-time projection)

- **Status:** PASS ✅
- **Threshold:** Preview is HUD chrome, not the hot path; `previewFor` is O(ladder) pure with frozen memo-safe arrays (test-design NFR Planning). No latency/throughput SLO applies to a pure render-time projection; 60 FPS evidence obligations belong to the gesture/pixel device jobs, never a PR gate (project rule).
- **Actual:** Ladder is ≤8 elements (`[1,2]` + 6 `POT_CURVE` keys); the range path is one `indexOf` + one capped `slice(≤3)`; range windows reuse frozen constant identity (`RANGE_1_2`, DW-80 slices frozen). Host per-case timings in this session's run: 0.03–2.3ms for whole sweep suites (incl. 10k-spawn statistical pin at ~205ms total). No animation, no worklet, no layout thrash added — the card is a static chip inside the existing HUD slots.
- **Evidence:** `triade/src/game/preview.ts:10-16,31,72,85,98` (ladder derivation, frozen windows); this session's `npm test` output (per-case timings); `PreviewCard.tsx` (no Animated/transform — AC6 structural posture).
- **Findings:** Trivially bounded compute; no perf suite warranted for this scope. The P3 exploratory bench (`previewFor` O(1) 10k× median <0.05ms) exists but is SKIPped by design in normal runs — noted, not gated.

### Throughput / resource usage

- **Status:** N/A — no backend, no request path, no new allocation per frame beyond the pre-existing HUD render (frozen arrays defeat memo churn by construction).

---

## Security Assessment

### Attack surface / vulnerability management

- **Status:** PASS ✅
- **Threshold:** No new attack surface: no network, no storage, no auth, no new dependencies (story constraint: no new dependencies, no build step).
- **Actual:** Pure display projection over an in-memory snapshot field; zero new deps (`triade/package.json` untouched per story file list); no `Math.random`, no roll-symbol imports in view/orchestration layers (statically enforced).
- **Evidence:** `ui.norolls.test.ts` green in this session's run (`AC4 UI never rolls`); `ui.thinview` / `ui.purity` green; story File List (no engine, no service, no dependency changes).
- **Findings:** No SEC risks in scope (test-design records none). Nothing to scan beyond the existing guards.

---

## Reliability Assessment

### Degrade posture (malformed snapshot never crashes the HUD)

- **Status:** CONCERNS ⚠️ (low priority, non-blocking)
- **Threshold:** Malformed snapshot degrades instead of crashing the HUD (test-design NFR Planning, Reliability row).
- **Actual:** `previewFor(null/undefined)` → safe `{ kind: 'exact', value: 0 }`, no throw; non-finite `displayRoll`/`value` → `0`; null/non-array ladder → full ladder. All three D-008 pins green this session. `PreviewCard.displayOf` filters non-finite range values and renders `""` (never throws, never renders `"undefined"`).
- **Evidence:** `preview.ts:105-128` (D-008 guards + review-P1 guards); `PreviewCard.tsx:14-22` (`displayOf`); D-008 pins green in this session's run (`AC2 — previewFor(null)/(undefined)/(validPending, null)`).
- **Findings:** The no-crash half of the threshold is fully met. The residual is content, not crash: the `exact-0` fallback renders `"0"`, which is not a ladder value (test-design R-001, score 2: probability 1 — engine guarantees well-formed `PendingSpawn`, so unreachable in production). Downgraded to CONCERNS rather than PASS because the degrade path is safe-but-misleading instead of safe-and-neutral. Owner-accepted posture (review triage 2026-09-07); follow-up is a one-line content choice (e.g. render `""` or last-known preview), not a reliability fix.

### NOOP stability / determinism

- **Status:** PASS ✅ (folded into the Reliability dimension)
- **Threshold:** NOOP preserves `pendingSpawn` → card unchanged; `previewFor` deterministic, 0 draws.
- **Actual:** Pinned by engine contract + `AC5/UX-DR-23 NOOP` and `AC1/AC4/AC5/AC8` purity pins — all green this session.
- **Evidence:** This session's `npm test` output (`NOOP never re-resolves the preview`, `previewFor is pure`, `consumes 0 draws`).

---

## Maintainability Assessment

### Engine wall / boundary hygiene

- **Status:** PASS ✅
- **Threshold:** Engine byte-identical; no roll imports in view/orchestration; `tsc` CI gate clean; only NEW `tsconfig.test.json` errors gate.
- **Actual:** `git diff --stat -- triade/src/engine` empty (verified this session); `ui.norolls` / `ui.thinview` / `ui.purity` green; `npx tsc --noEmit` clean; `tsconfig.test.json` shows only the waived pre-existing set (verified this session — matches the 7-1 ledger exactly).
- **Evidence:** This session's command outputs (see snapshot above); story Change Log corroborates (288 → 302 → 1472-test growth with 0 fail).

### Test health

- **Status:** PASS ✅
- **Threshold:** P0 100% green; no high-risk items unmitigated (test-design Quality Gate Criteria; no risk ≥6 exists).
- **Actual:** Full suite 1027 pass / 0 fail; all 7.2 P0/P1 pins (boundary ULP neighbors, containment ≤3 contiguous, chip contract, wiring exact+range through real `previewFor`) green.
- **Evidence:** This session's `npm test` output; `preview.test.ts` 26/26 per story log (subset re-confirmed green here).

---

## Custom NFR: Accessibility (label forward-compat)

- **Status:** PASS ✅
- **Threshold:** `accessibilityLabel` announces the next spawn (`"Próxima: …"`); full screen-reader bridge is Epic 9 / S9.2 (out of scope).
- **Actual:** `announcement = "Próxima(lane): display"` on every card; lane caption pin + label-content pins green.
- **Evidence:** `PreviewCard.tsx:24-29`; `previewCard.test.ts` label pins + `[P0] AC3/FR-45` lane-caption test (green in this session's run).
- **Findings:** Scope-correct forward-compat; no bridge work attempted, none required.

---

## N/A Dimensions (with rationale)

- **Scalability & Availability:** N/A — single-device offline game; preview is a stateless projection of an in-memory snapshot, no backend to scale.
- **Disaster Recovery (RTO/RPO):** N/A — no durable state added (zero new state by the state-placement master rule; projection only).
- **Deployability:** N/A — no build-step, dependency, or config change; Expo v57 plain-RN surface only.

---

## Quick Wins

1. **Neutralize the `exact-0` degrade content** (Reliability R-001, LOW, ~30 min, Dev) — have `displayOf` render `""` for the sentinel `exact-0-from-null` path (or thread a `lastKnown` fallback from `App.tsx`) so the unreachable-in-production fallback can never show a non-ladder `"0"`. Validation: one unit pin on the sentinel path. Optional — accepted posture today; do not hold any gate for this.

## Recommended Actions

### Non-blocking follow-ups (do NOT gate release or trace)

1. **R-001 degrade content** (LOW, Dev) — see Quick Win above. Carries into the backlog as-is.
2. **R-002 identical-lane fan-out** (MEDIUM, score 4, Dev → Epic 3) — keep the distinct-value per-lane regression guard plus one prod-faithful same-pending wiring pin; Epic 3 test design owns per-lane differentiation. No action in this scope.
3. **R-003 basic-window content semantics** (MEDIUM, score 4, Dev → story 7.3) — containment/cap/contiguity pins hold the baseline; 7.3 owns exhaustive content pins ("always contains truth", `1/2` together, ≤3 window). No action in this scope.

### No action required

- Performance bench (P3 SKIP): intentionally skipped exploratory; do not promote to gate.
- `tsconfig.test.json` waived set: ledgered since 7-1, unchanged; flag only NEW errors on future runs.

---

## Monitoring Hooks

None warranted for this scope — no new failure mode with production reachability (R-001 requires a malformed snapshot the engine never produces; wiring is covered by pins, not telemetry). If `App.tsx` ever passes nullable pendings by contract change, add a dev-only warn on the sentinel path.

## Fail-Fast Mechanisms

None to add — the degrade-not-throw guards (`previewFor` null/finite checks + `displayOf` shape guard) already are the fail-fast mechanism for this surface, and they are pinned by tests.

---

## Evidence Gaps

No open evidence gaps for this scope. All planned NFR evidence from the test-design NFR Planning table exists and is green (D-008 pins + guard output + inspection notes). Device/gesture/pixel evidence is explicitly out of scope per project rule (CI covers pure, device covers gesture/pixel — never the inverse).

---

## Four-Domain Findings Summary

| Domain | Findings Assessed | PASS | CONCERNS | FAIL | N/A | Overall Status |
| ------ | ----------------- | ---- | -------- | ---- | --- | -------------- |
| Performance | 1 (compute cost; throughput N/A) | 1 | 0 | 0 | 1 | PASS ✅ |
| Security | 1 (attack surface) | 1 | 0 | 0 | 0 | PASS ✅ |
| Reliability | 2 (degrade posture; NOOP/determinism) | 1 | 1 | 0 | 0 | CONCERNS ⚠️ |
| Maintainability | 2 (engine wall; test health) | 2 | 0 | 0 | 0 | PASS ✅ |
| Custom: Accessibility | 1 (label forward-compat) | 1 | 0 | 0 | 0 | PASS ✅ |
| Scalability / DR / Deployability | 0 | 0 | 0 | 0 | 3 | N/A |
| **Total** | **7** | **6** | **1** | **0** | **4** | **CONCERNS ⚠️** |

**Cross-Domain Risks:** None — the single CONCERNS (R-001 degrade content) intersects no other domain: it is unreachable via Security (no input path admits null pending), costs nothing in Performance (same code path), and touches no Maintainability surface (pinned, documented, owner-accepted).

---

## Gate YAML Snippet

```yaml
nfr_assessment:
  date: '2026-09-07'
  story_id: '7-2-preview-card-no-hud-60-40-nas-duas-pistas'
  feature_name: 'Preview card no HUD (60/40) nas duas pistas'
  final_revision: 'ee3ce91'
  categories:
    performance: 'PASS'
    security: 'PASS'
    reliability: 'CONCERNS'
    maintainability: 'PASS'
    accessibility_custom: 'PASS'
    scalability_availability: 'N/A'
    disaster_recovery: 'N/A'
    deployability: 'PASS'
  overall_status: 'CONCERNS'
  critical_issues: 0
  high_priority_issues: 0
  medium_priority_issues: 0
  concerns: 1
  blockers: false
  quick_wins: 1
  evidence_gaps: 0
  recommendations:
    - 'Accept from an NFR standpoint (non-blocking CONCERNS); carry R-001 degrade-content as LOW backlog'
    - 'Epic 3 owns R-002 per-lane differentiation; story 7.3 owns R-003 range-content hardening'
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`
- **Test Design:** `_bmad-output/test-artifacts/test-design/test-design-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`
- **Evidence Sources (verified this session):**
  - `npm test` in `triade/` → 1472 tests, 1027 pass / 0 fail / 445 skipped
  - `npx tsc --noEmit` → clean; `npx tsc --noEmit -p tsconfig.test.json` → pre-existing waived set only
  - `git diff --stat -- triade/src/engine` → empty
  - Inspected: `triade/src/game/preview.ts`, `triade/src/ui/PreviewCard.tsx`

---

## Sign-Off

**NFR Evidence Audit:**

- Overall Status: CONCERNS ⚠️ (non-blocking)
- Critical Issues: 0
- High Priority Issues: 0
- Concerns: 1 (R-001 degrade content, LOW, owner-accepted posture with trivial follow-up)
- Evidence Gaps: 0

**Gate Status:** CONCERNS-PASS (proceed to trace/release gate; no re-run required unless the degrade path or the `previews` prop contract changes)

**Next Actions:**

- If PASS ✅: Run `trace` Phase 2 for the release gate decision, or release
- If CONCERNS ⚠️: Address HIGH/CRITICAL issues (none here — LOW backlog carry is sufficient), re-run `nfr-assess` only on contract change
- If FAIL ❌: Resolve FAIL status NFRs, re-run `nfr-assess` (not applicable — 0 FAIL)

**Generated:** 2026-09-07
**Workflow:** testarch-nfr v5.0

---

<!-- Powered by BMAD-CORE™ -->

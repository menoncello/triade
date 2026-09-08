---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-07'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-9-2-screen-reader-contract.md'
  - 'triade/App.tsx'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/a11y/announcements.ts'
  - 'triade/__tests__/a11y/screenReader.contract.test.tsx'
  - 'triade/src/i18n/locales/en.json'
  - 'triade/src/i18n/locales/pt.json'
  - '_bmad/tea/config.yaml'
---

# Test Design (Targeted): 9-2 Screen Reader Contract — Preview/Banner Wiring Delta

**Date:** 2026-09-07
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — targeted follow-up for `9-2-screen-reader-contract`
**Scope:** Risk-based test design for the incremental delta `d26bbdd..HEAD` (this story's own work per spec frontmatter `baseline_revision d26bbdd` → `final_revision 9c33e33` + spec finalisation `770cc39`)

> **Delta under assessment (verified via `git diff d26bbdd..HEAD`):** 3 files, `+106/-5` —
> `triade/App.tsx` (+51: preview announcement on `pendingSpawn`-display change with skip-first-mount +
> ceiling/stuck banner announcements on false→true transitions with skip-first-mount symmetry +
> empty/raw-key guards), `triade/src/ui/PreviewCard.tsx` (+10/-5: `accessibilityLabel` i18n-authored via
> `a11y.preview` with try/catch EN fallback), spec bookkeeping only. The full a11y foundation
> (`src/a11y/*`, overlay, gesture gate, tone pause, Dynamic Type) predates `d26bbdd` and is covered by the
> full test design of 2026-09-02 (`test-design-epic-9-2-screen-reader-contract.md`, 12 risks, 9 P0 groups
> green) — this document does **not** re-assess it, only the incremental wiring and its interaction risks.
> Working tree at run time is clean apart from orchestrator-owned `sprint-status.yaml` (ignored per instructions).
> No production code was modified by this workflow.

---

## Executive Summary

**Scope:** Targeted test design for the preview/banner announcement wiring: an `App.tsx` memo
(`a11yPreviewDisplay` from `potForTier(tierForCeiling(ceilingDetector(game.board)))` + `previewFor(game.pendingSpawn, pot)`,
deps `[game.pendingSpawn, game.board]`) announced via `announcePreview` only on change after first mount
(`prevPreviewRef` init `null` → skip), and ceiling/stuck banners announced via `announceBanner(i18n.t('accelerated.*Hint'))`
only on false→true transitions after first mount (`prevBannerRef` init `null` → skip) with `msg && msg !== key` guards.

**Risk Summary:**

- Total risks identified (this delta): 6
- High-priority risks (score ≥6): 0
- Critical categories: BUS / TECH (announcement chattiness on every board change; banner flicker re-announce; PT preview phrasing unpinned)

**Coverage Summary:**

- P0 scenarios: 3 groups (existing contract pins already green — keep as gate, ~0.5h)
- P1 scenarios: 4 groups (App-gate static extensions + i18n `a11y.preview` pins, ~2–4h)
- P2/P3 scenarios: 4 groups (ordering/chattiness, flicker, device ear-check, ~1.5–3h)
- **Total effort**: ~4–7.5 hours (~1 day wall-clock; host-only ~0.5 day)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Full a11y foundation (three-finger gate, overlay labels, merge/spawn/score/game-over contract, tone pause, Dynamic Type)** | Predates `d26bbdd`; assessed 2026-09-02 (12 risks, R-001/R-002/R-003 high, all P0 green). This delta does not touch `screenReaderGestures.ts`, `boardAccessibility.tsx`, `ToneScreen.tsx`, or chrome layout. | Keep the 2026-09-02 test design green as the standing gate; this plan only adds delta pins. |
| **Engine preview/pot/ceiling rules (`previewFor`, `potForTier`, `ceilingDetector`)** | ADR-01 purity: App derives the *display string* from engine outputs but duplicates no rule; `try/catch → ''` guards malformed states. | Engine suite remains gate; this plan asserts "no rule logic in the memo" by inspection. |
| **Banner copy / `AcceleratedAids.tsx` labels** | Intentionally left as-is — pinned by `acceleratedAids.test.ts` + `app.contextualHelp.test.ts` (spec Follow-up Verification). | Existing suites remain gate; do not re-assert banner wording here. |
| **DW-112 (focus auto-move), DW-113 (Canvas hide), DW-101 (GameOver ellipsis)** | Accepted residuals, unchanged by this delta. | Tracked in full TD + deferred-work.md; device ear-check covers audibility only. |
| **Device farm / visual goldens / perf harness** | Delta is announcement wiring; no frame cost (two `useEffect` + one `useMemo` on already-rendered state), no new native module. | Single iOS + single Android ear-check (P3); no Playwright/k6. |

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

None in this delta. The two review patches (banner skip-first-mount symmetry, empty/raw-key guard) are
low-consequence guards on an already-reviewed wiring; the highest residual scores are 4 (medium).

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-D1 | BUS / TECH | **Preview chattiness: `a11yPreviewDisplay` memo deps include `game.board`, so any move that changes the board (pot changes) re-derives the display even when `pendingSpawn` is unchanged — if the display string changes, `announcePreview` fires on moves the user did not ask to be narrated.** Per-move narration becomes move+merge+spawn+score+preview (5 utterances), risking TalkBack queue overflow and user annoyance. The `prevPreviewRef !== display` change-check bounds this to *actual display changes*, but a pot change mid-game legitimately changes the display on a plain move. | 2 | 2 | 4 | P1: host test asserting the change-check invariant (same display → no announce; changed display → one announce). P3: device ear-check on a mid-game move that changes pot — confirm the extra preview utterance is tolerable / queued once. If chatty, follow-up: narrow deps or coalesce preview into the move announcement. |
| R-D2 | TECH / BUS | **Banner flicker re-announce: `showCeilingBanner`/`showStuckBanner` are derived booleans; a true→false→true flicker across renders re-fires `announceBanner` with no throttle or dedup window.** Both banners can also fire in the same effect run (two back-to-back `announceBanner` calls — ordering TalkBack vs iOS queue untested). No throttle exists on the banner path (unlike score's 500 ms). | 2 | 2 | 4 | P2: host ordering test (ceiling+stuck in one run → both captured, order ceiling→stuck) + flicker note as known behaviour. Device ear-check confirms both heard once. Follow-up only if flicker observed on device (derived banners are stable per render in practice). |
| R-D3 | TECH | **`a11y.preview` key coverage gap: the P0 i18n key-existence guard (`screenReader.contract.test.tsx:267`) pins `a11y.moved/merged/spawn/gameOver/newRecord/tile` in en+pt but NOT `a11y.preview` — the exact key this delta introduces into `PreviewCard` and `announcePreview`.** EN is indirectly covered (`announcePreview('1/2')` asserts the display is interpolated — a missing key returns the raw key without `1/2`, failing the test), but PT preview phrasing (`Próxima {{display}}`) has no assertion, and key *existence* in both locales has no static pin. A future locale edit dropping `a11y.preview` in pt would announce the raw key (announcePreview has no `msg !== key` guard, unlike the banner path). | 2 | 2 | 4 | P1: extend the key list with `a11y.preview` + add PT `announcePreview` assertion (`/Próxima/`). One-line + three-line additions to the existing P0 file; highest value-per-effort item in this plan. |
| R-D4 | TECH | **App-gate static contract does not pin the new wiring: the `[P0] App gesture gate` test (`screenReader.contract.test.tsx:231-240`) asserts `announceMove|announceMerge|announceSpawn|announceGameOver` but NOT `announcePreview|announceBanner`, nor the skip-first-mount refs (`prevPreviewRef`/`prevBannerRef` init `null`).** A future refactor removing the preview/banner effects would stay green. | 2 | 2 | 4 | P1: extend the App-gate regex with `announcePreview|announceBanner` + `prevPreviewRef`/`prevBannerRef` null-init pins. Zero new harness needed. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-D5 | TECH | **Raw-key asymmetry: `announcePreview` interpolates `i18n.t('a11y.preview')` without a `msg !== key` guard, while the banner call-site guards.** If a locale lacks the key, users hear the raw key `a11y.preview`. | 1 | 2 | 2 | Monitor — keys verified present in en+pt (`Next {{display}}` / `Próxima {{display}}`); R-D3's key-existence pin is the durable guard. Harmonise (guard inside `announcePreview`) only if a third locale lands. |
| R-D6 | TECH | **Rules-of-Hooks / effect ordering: new `useMemo`+`useRef`+`useEffect` blocks were inserted mid-component (`App.tsx:1115-1162`); a future early return placed above them would break hook order.** Spec asserts hooks precede early returns (verified in review). | 1 | 2 | 2 | Monitor — `tsc --noEmit` + eslint `react-hooks/rules-of-hooks` (if configured) + full suite green is the tripwire. No dedicated test. |

### Risk Category Legend

- **TECH**: Technical/Architecture (wiring, refs, i18n guards, hooks order)
- **SEC**: Security — none in scope (no auth/data exposure)
- **PERF**: Performance — none (two effects + one memo on already-rendered state; no per-frame cost)
- **DATA**: Data Integrity — covered via TECH (display derived from engine outputs, never duplicated)
- **BUS**: Business Impact (WCAG status messages, announcement UX, blind-user journey)
- **OPS**: Operations — none (no CI/infra change; 600 ms throttle wall-wait unchanged)

---

## NFR Planning

**Purpose:** Capture delta-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Accessibility — status messages (WCAG 4.1.3) | Preview display announced on genuine preview change; ceiling/stuck banners announced on false→true transitions; mount always silent; empty/missing strings never announced. Threshold is contract-conformance. | R-D1, R-D2, R-D5 | Existing P0 unit pins (`announcePreview` interpolation, `announceBanner` passthrough + empty guards) + P1 static extensions (R-D3/R-D4) + P3 device ear-check. | Contract suite green (15/15 at last verification; full `npm test` 1051 pass / 0 fail / 460 skipped re-confirmed this run) + this TD artifact. |
| Accessibility — i18n parity | `a11y.preview` present and interpolated in en AND pt (`Next {{display}}` / `Próxima {{display}}` — verified this run). | R-D3 | P1: extend key-existence list + PT assertion. | Extended contract test green. |
| Reliability — never throw | Memo `try/catch → ''`; effects wrapped in `try/catch`; `PreviewCard` try/catch with EN fallback; `Number.isFinite` filters on `exact`/`values` branches. | — | Negative-path host checks (already covered pattern: NaN/empty → silent). | Suite green + `tsc --noEmit` clean. |
| Maintainability | Announcement surface stays centralised in `src/a11y/announcements.ts`; App call-sites are thin (`announcePreview(display)` / `announceBanner(msg)`); no `AccessibilityInfo` import added to `App.tsx` (verified: App imports only `announce*` fns). | R-D4 | R-D4 static pins (wiring presence). | Source scan (this run: `announceForAccessibility` only in `src/a11y/*` + existing listeners). |
| Performance | No new per-frame work; memo deps are already-rendered state. Threshold unchanged (frame <8 ms, p99 <16.7 ms per Epic 8 lane). | — | No harness; Epic 8 nightly `useFrameRateBaseline` reuse. | Nightly log (deferred to Epic 8 lane). |

**Unknown thresholds:** None material. TalkBack queue-vs-interrupt behaviour for back-to-back banner announcements is platform-defined; threshold is "both messages heard once", verified by ear (P3).

---

## Entry Criteria

- [x] Spec `spec-9-2-screen-reader-contract.md` at `awaiting-operator` with triage log + operator_actions (device checks defined).
- [x] Delta enumerated via `git diff d26bbdd..HEAD` (3 files, +106/-5); `triade/src/engine` untouched.
- [x] Full 2026-09-02 test design available as standing gate (foundation risks R-001..R-013 already assessed).
- [x] Host runner green at baseline: full `npm test` 1051 pass / 0 fail / 460 skipped + `tsc --noEmit` clean (per spec; re-confirmed full suite this run).
- [x] `a11y.preview` keys verified present in `en.json` + `pt.json` this run.
- [ ] P1 extensions (R-D3/R-D4) implemented — entry for the *follow-up dev* pass, not for this design.

## Exit Criteria

- [ ] All P0 tests passing (100%) — currently green; stays green after P1 extensions land.
- [ ] P1 extensions (R-D3: `a11y.preview` key pin + PT assertion; R-D4: App-gate `announcePreview|announceBanner` + ref pins) implemented and green (≥95% P1, waivers with owner+expiry otherwise).
- [ ] No open bugs against: mount announcing (cold-start), empty/raw-key announced, preview never announced on change, banner re-announced every render.
- [ ] Device ear-check sign-off (operator_actions items 1–3 + 6 for preview/banner audibility) present before close of `awaiting-operator`.
- [ ] `triade/src/engine` still untouched (`git diff --stat -- triade/src/engine` empty).

---

## Test Coverage Plan

> `P0/P1/P2/P3` denote priority/risk. Execution timing is under Execution Strategy.

### P0 (Critical) — already landed, keep as gate (host, <1 min)

**Criteria**: Existing contract pins covering this delta's functions; any failure blocks the story.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P0-D1 | `announcePreview` interpolates display | `announcePreview('1/2')` → captured contains `1/2` (EN) | Unit (mock) | R-D3 | 1 (exists `:170-171`) | DEV (done) | Fails if `a11y.preview` key missing in active locale — indirect key pin. |
| P0-D2 | `announceBanner` passthrough + empty-silent | `announceBanner('Ceiling open')` passthrough; `announceBanner('')` → 0 | Unit (mock) | R-D2 | 2 (exists `:174-175`, `:200-201`) | DEV (done) | Covers the guard the banner call-site relies on. |
| P0-D3 | Full suite no-regression | `npm test` 1051 pass / 0 fail + `tsc --noEmit` clean (re-confirmed this run) | Suite | — | — | TEA (done) | Standing gate for any follow-up edit. |

**Total P0**: 3 groups, all green, ~0.5h (verification + report only).

### P1 (High) — static extensions, no new harness (host, <5 min)

**Criteria**: Close the two pin gaps (R-D3/R-D4); each is a few-line addition to the existing P0 file.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P1-D1 | i18n `a11y.preview` existence both locales | Extend `:267` key list with `a11y.preview` (en+pt) | Unit (static) | R-D3 | 1 assertion | DEV | Durable guard against locale edits dropping the key. |
| P1-D2 | PT preview phrasing | `changeLanguage('pt'); announcePreview('8')` → `/Próxima/` + contains `8`; restore `en` | Unit (mock) | R-D3 | 1 `test()` | DEV | Mirrors existing PT gameOver/merge test (`:178-187`). |
| P1-D3 | App wires preview/banner + skip-first-mount | Extend `:238` regex with `announcePreview|announceBanner`; assert `prevPreviewRef` + `prevBannerRef` + `=== null` skip pattern in `App.tsx` src | Unit (static) | R-D4, R-D1 | 1 `test()` | DEV | Tripwire against refactor removing the effects. |
| P1-D4 | Preview change-check invariant | Render-level or src-level pin that `announcePreview` is called only when `prevPreviewRef.current !== a11yPreviewDisplay && a11yPreviewDisplay` (document the invariant; implement as src-pattern pin consistent with existing static style) | Unit (static) | R-D1 | 1 | DEV | Bounds chattiness risk at the contract level; device ear-check proves UX. |

**Total P1**: 4 groups, ~2–4h (edit + run + review).

### P2 (Medium) — ordering & interaction (host)

**Criteria**: Multi-announcement interaction on a single move; documents expected queue order.

| # | Requirement | Scenario | Test Level | Risk Link | Test Count | Owner | Notes |
|---|-------------|----------|------------|-----------|------------|-------|-------|
| P2-D1 | Banner pair ordering | Ceiling+stuck false→true in one run → captured order ceiling→stuck, exactly 2 | Unit | R-D2 | 1 | DEV | Requires a thin effect harness or documents manual order; keep informational if harness cost exceeds value. |
| P2-D2 | Move-with-preview capture order | One `doMove` with merge+spawn+score+preview-change → captured order `moved → merged → spawn → score → preview` (preview effect runs post-render, hence last) | Unit | R-D1 | 1 | DEV | Verifies coalescing still holds with the new utterance appended, not interleaved. |

**Total P2**: 2 checks, ~1–2h.

### P3 (Low) — device ear-check (manual, ~20 min)

**Criteria**: Only genuine screen-reader behaviour; human ear required.

| # | Requirement | Scenario | Test Level | Test Count | Owner | Notes |
|---|-------------|----------|------------|------------|-------|-------|
| P3-D1 | Preview/banner audibility + pacing | With VoiceOver on: play until `pendingSpawn` display changes → preview heard once, mount silent; trigger ceiling/stuck banners → each heard once on appearance, no repeat on subsequent renders; rapid moves → no preview spam | Exploratory (manual, iOS) | 1 journey | Operator/QA | Maps to operator_actions items 3+6; sign-off checkbox in story close-out. |
| P3-D2 | TalkBack fallback path | Same journey on Android: preview/banner delivered via `announceForAccessibility` (no queue branch) without truncation | Manual (device) | 1 | Operator/QA | Single data point, not a matrix. |

**Total P3**: 2 exploratory checks, ~0.5–1h.

---

## Execution Order

### Smoke (<1 min, host, every save)

- `npm test -- triade/__tests__/a11y/screenReader.contract.test.tsx` (P0-D1/P0-D2) + `npx tsc --noEmit`.

### PR gate for P1 follow-up (host, <15 min)

- Extended contract file (P1-D1..D4) green + full `npm test` no-regression + `git diff --stat -- triade/src/engine` empty.

### Device gate (manual, ~20 min, before `awaiting-operator` close)

- P3-D1 (iOS VoiceOver) + P3-D2 (Android TalkBack, one pass): preview/banner audibility, mount silence, no spam.

### Nightly/weekly — not required

No perf/chaos suites for this delta.

---

## Execution Strategy

**Philosophy**: The delta is three small, well-guarded wiring edits on top of a fully-pinned a11y contract.
Prove the wiring with cheap static pins (P1 extensions, same style as the existing file-read tests), keep the
suite green, and defer only genuine audibility/pacing judgement to the operator ear-check that the story already
requires (`awaiting-operator`). No new harness, no Playwright, no k6.

- **PR**: P0 (existing) + P1 extensions; `node --test` + `tsc` only.
- **Pre-close device**: P3 journey by the operator; sign-off checkbox referencing preview/banner audibility.
- **Nightly**: none.

---

## Resource Estimates

| Priority | Logical groups | Hours / group | Total | Notes |
|----------|----------------|---------------|-------|-------|
| P0 | 3 groups (already written, re-verified this run) | 0.1–0.25 | **~0.5 h** | Verification + report only. |
| P1 | 4 groups (static additions to existing file) | 0.5–1.0 | **~2–4 h** | No new harness; dominated by review. |
| P2 | 2 checks (ordering documentation/harness) | 0.5–1.0 | **~1–2 h** | Informational if harness costly. |
| P3 | 2 exploratory (iOS + Android ear-check) | 0.25–0.5 | **~0.5–1 h** | Operator-owned. |
| **Total** | **~11 checks** | — | **~4–7.5 h** | **~1 day** wall-clock; host-only ~0.5 day. |

Prerequisites:

- **Test data**: existing `AccessibilityInfo` stub doubles (`captured[]`), `i18n.changeLanguage('en'/'pt')`; no new fixtures needed.
- **Tooling**: `node --test`, `typescript`; iOS Simulator + Android emulator for P3 (operator-owned).
- **Environment**: host (`node >=26`); no staging backend.

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions; P0-D1..D3 green — confirmed this run).
- **P1 pass rate**: ≥95% (P1-D1..D4 land green; any waiver needs owner+expiry).
- **P2/P3**: ≥90% informational; P3 sign-off required to close `awaiting-operator`.
- **High-risk mitigations**: n/a (no score ≥6 in this delta); medium risks R-D1..R-D4 each have a P1/P2/P3 mitigation or explicit waiver.

### Coverage Targets

- **Delta I/O rows** (preview-change announce / banner false→true announce / mount silent / empty-silent): 100% have at least one automated pin (actual: P0-D1/D2 + P1-D3/D4).
- **i18n parity for new key**: 100% (en+pt existence + interpolation; PT phrasing via P1-D2).
- **No-regression**: full suite + `tsc` clean.

### Non-Negotiable Requirements

- [ ] All P0 tests pass (confirmed this run: 1051 pass / 0 fail / 460 skipped).
- [ ] P1-D1..D4 implemented and green before story close (or waived with owner+expiry).
- [ ] Mount is silent for preview AND banners (skip-first-mount symmetric — the applied review patch).
- [ ] Empty/missing strings never announced (banner call-site guard; `safeAnnounce` empty early-return).
- [ ] Engine untouched; announcements stay centralised in `src/a11y/*`.

---

## Mitigation Plans

### R-D1: Preview chattiness on board-driven display changes (Score: 4)

**Mitigation Strategy:**
1. Keep the change-check invariant (`prevPreviewRef.current !== a11yPreviewDisplay && a11yPreviewDisplay`) — pin via P1-D4.
2. Device ear-check (P3-D1) on a pot-changing move; if the extra utterance is disruptive, follow-up story: coalesce preview into the move announcement or narrow memo deps to `pendingSpawn`-only with pot-change announced separately.
3. No code change in this plan (design only, per instructions).

**Owner:** FE / Operator (ear-check)
**Timeline:** Before `awaiting-operator` close
**Status:** Planned (P1-D4 + P3-D1)
**Verification:** Extended contract green + operator sign-off checkbox.

### R-D2: Banner flicker re-announce + pair ordering (Score: 4)

**Mitigation Strategy:**
1. Document expected order (ceiling→stuck, one each) via P2-D1; derived-banner stability makes flicker unlikely in practice.
2. Device ear-check confirms single utterance per appearance (P3-D1).
3. Throttle/dedup follow-up only if device evidence shows repeats.

**Owner:** FE / Operator
**Timeline:** Before `awaiting-operator` close
**Status:** Planned (P2-D1 + P3-D1)
**Verification:** P2 informational + operator sign-off.

### R-D3: `a11y.preview` key coverage gap (Score: 4)

**Mitigation Strategy:**
1. P1-D1: add `a11y.preview` to the `:267` key-existence list (en+pt).
2. P1-D2: PT `announcePreview` phrasing assertion (`/Próxima/`).
3. Long-term: if a third locale lands, harmonise the raw-key guard into `announcePreview` (R-D5).

**Owner:** DEV
**Timeline:** P1 follow-up pass (~0.5 day)
**Status:** Planned
**Verification:** Extended contract file green.

### R-D4: App-gate static contract misses new wiring (Score: 4)

**Mitigation Strategy:**
1. P1-D3: extend App-gate regex with `announcePreview|announceBanner` + `prevPreviewRef`/`prevBannerRef` null-init pins.
2. Keeps the "wiring removed → red" tripwire the existing gate provides for the move announcements.

**Owner:** DEV
**Timeline:** P1 follow-up pass (same edit as R-D3)
**Status:** Planned
**Verification:** Extended contract file green.

---

## Assumptions and Dependencies

### Assumptions

1. The 2026-09-02 full test design remains the standing gate for the a11y foundation (risks R-001..R-013, DW-112/DW-113/DW-101) — this document layers only delta risks R-D1..R-D6.
2. `showCeilingBanner`/`showStuckBanner` are render-stable derived booleans (no per-frame flicker) — if device evidence contradicts, R-D2 escalates to a throttle/dedup story.
3. Operator device checks (`operator_actions` in spec frontmatter) are the P3 vehicle — no separate device plan needed.
4. No third locale is in flight; en+pt parity is the complete i18n surface.

### Dependencies

1. P1 follow-up dev pass implementing P1-D1..D4 (no production-code change in *this* workflow run) — required before story close.
2. Operator VoiceOver/TalkBack ear-check sign-off — required to clear `awaiting-operator`.

### Risks to Plan

- **Risk**: Pot-changing moves make preview announcements feel spammy to VoiceOver users.
  - **Impact**: UX annoyance; possible App Store a11y-quality complaint.
  - **Contingency**: Follow-up story coalescing preview into the move utterance (design note in R-D1).

---

## Follow-on Workflows (Manual)

- Run `*automate` for P1-D1..D4 if the follow-up dev pass wants ATDD-first pins (red-phase on the extended contract file).
- Run `*nfr-assess` after P1 lands + operator sign-off, citing this TD + the 2026-09-02 TD as plan inputs.
- Run `*trace` to link R-D1..R-D6 → P0-D/P1-D/P2-D/P3-D → spec AC rows.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: {name} Date: {date}
- [ ] Tech Lead: {name} Date: {date}
- [ ] QA Lead: {name} Date: {date}

**Comments:**

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|-------------------|--------|------------------|
| **`AcceleratedAids.tsx` banners** | Banner *copy* untouched; only announcement of appearance added. Labels intentionally left as-is per spec. | `acceleratedAids.test.ts` + `app.contextualHelp.test.ts` must stay green (verified green in spec run). |
| **`PreviewCard.tsx`** | `accessibilityLabel` now i18n (`a11y.preview`); visual tree unchanged (`pointerEvents="none"`, role `text`). | `previewCard` suites + Dynamic Type guard (`allowFontScaling` still present — verified in file). |
| **Engine (`previewFor`, `potForTier`, `ceilingDetector`)** | Read-only consumption in a memo; no rule duplication. | Engine suite + `git diff --stat -- triade/src/engine` empty. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology (P×I, 1–3 scales; ≥6 high)
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md` (`awaiting-operator`)
- Standing full test design: `_bmad-output/test-artifacts/test-design/test-design-epic-9-2-screen-reader-contract.md` (2026-09-02)
- Contract tests: `triade/__tests__/a11y/screenReader.contract.test.tsx` (15 tests)
- Implementation: `triade/App.tsx:1115-1162` (preview/banner effects), `triade/src/a11y/announcements.ts:62-71`, `triade/src/ui/PreviewCard.tsx:27-33`

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design` (targeted follow-up, Epic-Level)
**Version**: 4.0 (BMad v6)

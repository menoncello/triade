---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-07'
workflowType: 'bmad-testarch-automate'
storyId: '9-2-screen-reader-contract'
storyKey: '9-2-screen-reader-contract.preview-banner'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md'
  - 'triade/App.tsx'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/a11y/announcements.ts'
  - 'triade/src/i18n/locales/en.json'
  - 'triade/src/i18n/locales/pt.json'
  - 'triade/__tests__/a11y/screenReader.contract.test.tsx'
  - '_bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary-9-2-screen-reader-contract.preview-banner.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — 9-2 Screen Reader Contract, preview/banner wiring delta

**Date:** 2026-09-07
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `9-2-screen-reader-contract` preview/banner wiring
**Mode:** Standalone-delta (spec + ATDD red scaffolds + triade contract as inputs; no Playwright/Cypress harness — RN a11y seam, host `node:test` + `tsx`)
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx` + `react-test-renderer`, no backend)
**Working-tree delta under test:** `d26bbdd..HEAD` (`9c33e33` + `770cc39`) —
`triade/App.tsx` (+51: `a11yPreviewDisplay` memo + `prevPreviewRef`/`prevBannerRef` null-init skip-first-mount + `announcePreview` on display change + `announceBanner` on ceiling/stuck false→true with `msg && msg !== key` guards),
`triade/src/ui/PreviewCard.tsx` (+10/-5: `accessibilityLabel` i18n-authored via `a11y.preview` with try/catch EN fallback). Spec-only bookkeeping otherwise.
`sprint-status.yaml` untouched (orchestrator-owned — verified, never written here).

---

## Step 1 — Preflight & Context

- **Config `test_artifacts`:** `_bmad-output/test-artifacts` (from `_bmad/tea/config.yaml`); `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN host-only pins); `tea_use_pactjs_utils:false`.
- **Framework verified:** `triade/tsconfig.test.json` (`react-native` → `test-utils/rn-stub.ts` paths) + `NODE_PATH=triade/node_modules` for `react`/`react-test-renderer` resolve from `_bmad-output` location + existing `triade/__tests__/a11y/screenReader.contract.test.tsx` (15 P0, green) + `triade/__tests__/ui/components/previewCard.test.ts` (7 tests, render pattern reused).
- **Execution mode:** Standalone-delta on the preview/banner slice (the full-contract automate pass of 2026-09-03 already covers the base seam; this pass covers ONLY the `9c33e33` wiring). Sequential.
- **Knowledge applied:** `test-levels-framework` (API = announcement contract surface, E2E = user journeys via real component + real i18n + capture), `test-priorities` (P0 contract behavior, P1 wiring regression net, P2 durability/boundary), `fixture-architecture` (deterministic delta fixtures, no faker), `test-quality` (Given-When-Then, atomic, deterministic, no hard waits, no conditional flow).
- **Persistent facts:** `project-context.md` loaded — engine-puro boundary (a11y never duplicates engine rules), preview is chrome (never feel), labels engine-derived or `t()`-authored, `no-throw` in engine, 26 engine tests gate untouched.

## Step 2 — Automation Targets (no duplicate coverage)

| Target | File(s) | Level | Priority | Justification |
|--------|---------|-------|----------|---------------|
| `PREVIEW_ANNOUNCE_EN_PT` `announcePreview('8')` → EN `Next 8` / PT `Próxima 8`; `''` silent | `announcements.ts:62` + locales | API | P0 | Core contract of the delta — wrong-locale or raw-key leak is user-facing to blind users |
| `BANNER_PASSTHROUGH` `announceBanner(text)` verbatim; `''` silent | `announcements.ts:68` | API | P0 | Banner call-site resolves i18n; contract must not swallow or mutate |
| `A11Y_PREVIEW_KEYS` `a11y.preview` en+pt with `{{display}}` | `locales en/pt` | API | P0 | Closes TD R-D3 key-coverage gap (`announcePreview` has no `msg !== key` guard, unlike banner) |
| `BANNER_TRANSITIONS` 7-state matrix: mount silent, false→true announces, all else silent | `App.tsx` effect replica in fixtures | API | P0 | Mount-chattiness (R-D1) and cold-start asymmetry were the actual review patches |
| `PREVIEW_EFFECT_GUARDS` null-init skip + change-check + announce call | `App.tsx` | API (P1) | P1 | Regression net over the wiring; refactor removing the effect turns red |
| `BANNER_EFFECT_GUARDS` null-init symmetry + false→true + `msg && msg !== key` ×2 | `App.tsx` | API (P1) | P1 | Regression net over the two review patches |
| `PREVIEWCARD_I18N_LABEL` `i18n.t('a11y.preview')` + EN fallback + `accessibilityLabel` + role text | `PreviewCard.tsx` | API (P1) | P1 | Was hard-coded PT before `9c33e33` — must never regress |
| `MOUNT_SILENT_JOURNEY` fresh mount queues nothing | App effect + capture | E2E (P0) | P0 | User-facing: opening the game must not chatter |
| `DISPLAY_CHANGE_JOURNEY` change → exactly one locale-correct announcement | `PreviewCard` + i18n + capture | E2E (P0) | P0 | Happy path of the delta |
| `PT_END_TO_END` card label + preview + banner all PT | `PreviewCard` + i18n PT | E2E (P0) | P0 | Locale consistency across the whole slice |
| `DISPLAY_DERIVATION` exact/range/NaN/empty/malformed → memo contract | memo replica | E2E (P1) | P1 | Bounds R-D1 chattiness: only real display changes announce |
| `BANNER_JOURNEY` ceiling+stuck false→true → 2 ordered announcements | i18n + capture | E2E (P1) | P1 | Both banners in one session |
| `LANE_NOTE` `display (label)` survives i18n wrapper | `PreviewCard` FR-45 | E2E (P1) | P1 | Lane fan-out must not drop the caption |
| `ENGINE_UNTOUCHED` `git diff d26bbdd..HEAD -- triade/src/engine` empty | git | E2E (P2) | P2 | ADR-01 purity: a11y is bridge-only |
| `NO_THROTTLE_BY_DESIGN` preview/banner unthrottled; spam control lives in change-check | `announcements.ts` | E2E (P2) | P2 | Documents the throttle design decision (only score throttles) |
| `FOLLOWUP_TRACKED` P1-D1..D4 pins durably scaffolded in red spec | ATDD red spec | API (P2) | P2 | Contract-file extension still open — tracked, not silently dropped |

## Step 3 — Test Generation

### Fixtures

- **Created:** `_bmad-output/test-artifacts/fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts` — scan-string single source for the delta, `previewDisplayOf` pure memo replica + 6 display fixtures with expectations, 7-state `BANNER_TRANSITION_FIXTURES` matrix + `bannerTransitions` decision replica, `readSource`/`countMatches` helpers. Deterministic, host-only, no faker.

### API Gateway Tests

- **Created:** `_bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts` — **11 tests, all ACTIVE, 11 pass** (~175ms): P0 ×6 (EN/PT preview, empty-silent, banner passthrough, key existence, transition matrix) + P1 ×3 (preview effect guards, banner effect guards, PreviewCard label) + P2 ×2 (follow-up tracking, contract fns guards).
- Run: `TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules triade/node_modules/.bin/tsx --test "_bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts"` → **11 pass / 0 fail**.

### E2E Umbrella Tests

- **Created:** `_bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts` — **8 tests, all ACTIVE, 8 pass** (~265ms): P0 ×3 (mount silent, display-change journey, PT end-to-end) + P1 ×3 (display derivation, banner journey, lane note) + P2 ×2 (engine untouched, no-throttle-by-design).
- Run: `TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules triade/node_modules/.bin/tsx --test "_bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts"` → **8 pass / 0 fail**.

### Existing suites (regression check, not regenerated)

- `triade/__tests__/a11y/screenReader.contract.test.tsx` → **15/15 pass** (standing P0 contract unaffected).
- Standing full-contract automate fleet (2026-09-03) untouched.

## Step 4 — Validate & Summarize

- [x] Framework scaffolding verified (`node:test` + `tsx` + `rn-stub` paths + `NODE_PATH`).
- [x] Execution mode determined: Standalone-delta on the `9c33e33` slice, sequential.
- [x] Spec + ATDD red spec + contract loaded as inputs; ACs mapped (preview/banner announcements, i18n PreviewCard label, banner guards).
- [x] Test levels selected per framework (API = contract surface, E2E = journeys; no Playwright — RN bridge).
- [x] No duplicate coverage (gateway pins wiring statically + contract runtime; umbrella drives real component + real i18n journeys; ATDD red scaffolds track the open contract-extension follow-up).
- [x] Priorities assigned (P0 contract behavior, P1 wiring regression net, P2 durability/boundary).
- [x] Fixtures deterministic with auto-applicability (pure replicas, no shared state, no cleanup needed).
- [x] Given-When-Then + priority tags on every test; data-testid N/A (RN `accessibilityLabel` + role assertions per selector-resilience adaptation).
- [x] Quality: no hard waits, no conditional flow, no flaky patterns, deterministic inputs, atomic assertions.
- [x] `sprint-status.yaml` untouched (orchestrator-owned).

---

## Coverage Summary

| Priority | New (this pass) | Standing cover | Total |
|----------|-----------------|----------------|-------|
| P0 | 6 API + 3 E2E = 9 tests, all pass | 15 contract P0 green | 100% of delta P0 slice |
| P1 | 3 API + 3 E2E = 6 tests, all pass | red-spec P1-D1..D4 scaffolded (open) | wiring 100% pinned; contract-file extension tracked |
| P2 | 2 API + 2 E2E = 4 tests, all pass | — | boundary + design-decision documented |
| P3 | 0 (device ear-check stays operator-owned per spec `operator_actions`) | — | waived, manual |

- **Test level breakdown:** API gateway 11 + E2E umbrella 8 + fixtures 1 = 20 new artifacts, 19/19 tests green.
- **Files created:** `fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts`, `tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts`, `tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts`, this summary.

---

## Definition of Done (DoD) — preview/banner wiring delta

### Functional

- [x] Preview display changes announce exactly once via `announcePreview` with locale-correct phrasing (EN `Next`, PT `Próxima`); mount is silent (skip-first-mount).
- [x] Same-display re-renders stay silent (change-check `prev !== display && display`).
- [x] Ceiling/stuck banners announce only on false→true transitions with locale-resolved hints; mount silent (null-init symmetry); empty/missing locale strings never announce (`msg && msg !== key` + `if (!text) return`).
- [x] `PreviewCard` `accessibilityLabel` is i18n-authored via `a11y.preview` (never hard-coded) with EN fallback, role stays `text`, lane note preserved.
- [x] `a11y.preview` exists in en+pt with `{{display}}` interpolation (R-D3 gap closed at the locale level).
- [x] Engine untouched (`git diff d26bbdd..HEAD -- triade/src/engine` empty) — a11y remains bridge-only.

### Quality

- [x] `tsc` posture unchanged (no new source files in this pass — tests + fixtures only; standing `tsc --noEmit` clean per spec verification).
- [x] New suites green: API 11/11 + E2E 8/8; standing contract 15/15 green (no regression).
- [x] Deterministic: no network, no timers, no randomness; single `git` subprocess read in one P2 test.
- [x] `sprint-status.yaml` untouched (orchestrator-owned).

### Test

- [x] P0 pass rate 100% (9/9 new delta P0).
- [x] P1 pass rate 100% (6/6 new delta P1).
- [x] P2 pass rate 100% (4/4 new delta P2); P3 device ear-check remains operator-owned (spec `operator_actions`, `awaiting-operator` status unchanged).
- [x] No flaky patterns; tests isolated (capture reset per test, locale restored in `afterEach`).

---

## Next steps

1. **P1 contract-extension follow-up (open, tracked):** extend `triade/__tests__/a11y/screenReader.contract.test.tsx` per ATDD P1-D1..D4 (pin `a11y.preview` in the key list, PT `Próxima` phrasing, `announcePreview|announceBanner` + `prevPreviewRef`/`prevBannerRef` in the App-gate test, change-check invariant) — scaffolds at `_bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts`.
2. **Operator device checks (spec `operator_actions`, unchanged):** VoiceOver/TalkBack ear-check of preview/banner audibility, mount silence, and no-spam during rapid merges.
3. **No further automate needed** for this delta once (1) lands — re-run the two new specs + contract file to confirm green.

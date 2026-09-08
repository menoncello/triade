---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-07'
workflowType: 'testarch-atdd'
storyId: '9.2'
storyKey: '9-2-screen-reader-contract'
storyFile: '_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-9-2-screen-reader-contract.preview-banner.md'
generatedTestFiles:
  - '_bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md'
  - '_bmad-output/test-artifacts/test-design/test-design-9-2-screen-reader-contract-td-20260907.md'
  - '_bmad-output/test-artifacts/atdd-checklist-9-2-screen-reader-contract.md'
  - 'triade/App.tsx'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/a11y/announcements.ts'
  - 'triade/__tests__/a11y/screenReader.contract.test.tsx'
  - 'triade/src/i18n/locales/en.json'
  - 'triade/src/i18n/locales/pt.json'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — 9-2 Screen Reader Contract, Preview/Banner Wiring Delta (Follow-up)

**Date:** 2026-09-07
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Primary Test Level:** Unit (host `node:test` static tripwires + `AccessibilityInfo` mock pins) + Component (PreviewCard render pin)
**Mode:** Targeted follow-up. The 2026-09-02 ATDD checklist + 14-scaffold red spec cover the full
a11y foundation (gate, overlay, contract, tone pause, Dynamic Type) and are NOT duplicated here.
This document covers ONLY the incremental delta `d26bbdd..HEAD` (`9c33e33` + `770cc39`).

---

## Story Summary

Story 9-2 is at `awaiting-operator`. Since the standing P0 contract went green, two gaps were
wired (commit `9c33e33`): preview announcements on `pendingSpawn`-display change and
ceiling/stuck banner announcements on false→true transitions in `triade/App.tsx`, plus the
`PreviewCard` accessibility label switched from hard-coded PT to i18n-authored `a11y.preview`
with an EN fallback. Two low review patches landed in the same commit: banner skip-first-mount
symmetry (`prevBannerRef` init `null`) and the empty/raw-key guard (`msg && msg !== key`).

The targeted test design (`test-design-9-2-screen-reader-contract-td-20260907.md`) assessed this
delta as 6 risks (R-D1..R-D6, all score ≤4, none high) and prescribed 4 P1 static extensions
(P1-D1..D4) to the existing contract file. **This ATDD run generates those 4 as failing
red-phase scaffolds** (verified RED by execution, see Evidence) plus 2 already-green gate pins
that lock the review patches against regression while the contract file is being edited.

**As a** VoiceOver/TalkBack user
**I want** the next-piece preview and the ceiling/stuck banners announced once, in my locale,
never on first render and never as an empty/raw key
**So that** I get the same state awareness sighted players get from the HUD, without spam.

---

## Acceptance Criteria (delta scope)

1. **AC-preview-change:** Given a run where the engine-derived preview display string changes,
   when the new render commits, then `announcePreview(display)` fires exactly once; same
   display across renders is silent; first mount is silent (TD R-D1, P1-D4).
2. **AC-banner-transition:** Given ceiling/stuck derived banners, when either flips false→true,
   then its `accelerated.*Hint` message is announced once via `announceBanner`; mount is
   silent; true→false→true flicker re-announces (known behaviour, TD R-D2).
3. **AC-i18n-preview:** Given en/pt locales, when preview/banner strings resolve, then
   `a11y.preview` exists and interpolates `{{display}}` in both locales, PT phrasing matches
   `/Próxima/`, and empty/missing strings never reach the bridge (TD R-D3/R-D5, P1-D1/D2).
4. **AC-wiring-pinned:** Given the `[P0] App gesture gate` contract test, when someone refactors
   `App.tsx` announcement wiring, then the gate fails (it references `announcePreview`,
   `announceBanner`, `prevPreviewRef`, `prevBannerRef`) (TD R-D4, P1-D3).

Foundation ACs (three-finger gate, per-tile labels, merge/spawn/score/game-over, tone pause,
Dynamic Type) are already pinned green — see the 2026-09-02 checklist.

---

## Preflight & Generation Mode (Steps 1–2)

- **Stack detection:** `test_stack_type: auto` → `frontend` (Expo React Native app in `triade/`;
  no backend manifests). No `playwright.config.*` / `cypress.config.*` exists: the configured
  framework for this delta is host `node:test` + `tsx` + `react-test-renderer` (the same runner
  the standing P0 contract uses). This is an accepted adaptation, consistent with the prior
  ATDD run and the TD execution strategy — NOT a halt condition.
- **TEA flags:** `tea_use_playwright_utils: true` (no `page.goto`/`page.locator` in delta scope →
  utils not needed; static + mock patterns used), `tea_use_pactjs_utils: false`,
  `tea_pact_mcp: none`, `tea_browser_automation: auto` (recording skipped — no browser DOM;
  RN `AccessibilityInfo` bridge only), `tea_execution_mode: auto` + `tea_capability_probe: true`
  → resolved `sequential` (single runtime; API worker N/A, E2E worker N/A, see below).
- **Generation mode:** AI generation from source analysis. Recording skipped per above.

## Test Strategy (Step 3)

| AC | Level | Scaffolds | Priority | Risk |
|----|-------|-----------|----------|------|
| AC-i18n-preview | Unit (static JSON + contract-file tripwire) | P1-D1, P1-D2 | P1 | R-D3 (4) |
| AC-wiring-pinned | Unit (static contract-file tripwire) | P1-D3 | P1 | R-D4 (4) |
| AC-preview-change | Unit (static App + contract tripwire) | P1-D4 | P1 | R-D1 (4) |
| AC-banner-transition | Unit (static App + `announceBanner` guard — already green, gate) | GATE-2 | P1-gate | R-D2 (4) |
| PreviewCard label | Component (static render pin — already green, gate) | GATE-1 | P1-gate | R-D3/R-D5 |
| E2E | — | 0 (N/A: no browser DOM) | — | — |
| API/Contract (pact) | — | 0 (N/A: no endpoints; `triade/src/engine` untouched) | — | — |
| P3 device ear-check | Manual exploratory, operator-owned | not scaffolded (spec `operator_actions` 1–3+6) | P3 | R-D1/R-D2 |

No duplicate coverage: every scaffold asserts something the current contract file does NOT pin
(verified: 4 RED) or locks an unpinned-but-landed review patch (2 GREEN gates).

---

## Red-Phase Test Scaffolds Created

**File:** `_bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts`
(6 tests, all `test.skip()`; run from `triade/` so `tsx` resolves — see Execution Evidence.
Note: the 2026-09-02 red spec uses one `../` too many in its `fileURLToPath` URLs
(`'../../../../triade/…'` resolves outside the repo); the new scaffold uses the correct depth
`'../../../triade/…'` and is runnable.)

- `[P1-D1] contract pins a11y.preview key existence in en+pt` — **RED** (contract has no
  `a11y.preview` literal; en+pt JSON already have the key — the tripwire targets the file gap).
- `[P1-D2] PT announcePreview phrasing uses Próxima + display` — **RED** (no `Próxima` literal
  in contract; mirrors the `:178-187` PT gameOver/merge pattern for the live assertion).
- `[P1-D3] App-gate pins announcePreview|announceBanner + skip-first-mount refs` — **RED**
  (gate regex only has move|merge|spawn|gameOver; no `prev*Ref` literals).
- `[P1-D4] preview change-check invariant` — **RED** (contract has no change-check literal;
  the App-side invariant itself is implemented).
- `[GATE] PreviewCard accessibilityLabel i18n-authored with EN fallback` — **GREEN when
  activated** (locks `9c33e33` PreviewCard change while the contract file is edited).
- `[GATE] banner effects skip first mount and guard empty/raw-key strings` — **GREEN when
  activated** (locks both `9c33e33` review patches).

---

## Data Factories Created

None required. The delta is announcement wiring over engine-derived strings; coverage uses
literal display strings (`'1/2'`, `'8'`) and the existing `captured[]` mock harness. Board
fixtures remain literal `Board` arrays per engine purity (ADR-01); `data-factories.md`
(faker + overrides) was considered and deliberately not applied — deterministic strings keep
the i18n assertions exact.

## Fixtures Created

No Playwright fixtures (`fixture-architecture.md` `test.extend()` + auto-cleanup N/A — no
browser). The live-behavior assertions reuse the established harness pattern from the
standing contract file (`captured[]` double for `announceForAccessibility` /
`announceForAccessibilityWithOptions` + `resetScoreThrottleForTests()` + `i18n.changeLanguage`),
documented per scaffold so DEV copies the pattern instead of inventing a new one.

## Mock Requirements

Already satisfied by `triade/test-utils/rn-stub.ts` + the contract-file `beforeEach/afterEach`
(`captured: string[]`, WithOptions/announce branch swap, throttle reset, en/pt switch). No new
mocks, no `page.route()` (`network-first.md` N/A — the only fallible bridge is the native
`announceForAccessibility`, guarded by `safeAnnounce` try/catch).

## Required data-testid Attributes

None new. This surface uses `accessible` + `accessibilityRole="text"` + `accessibilityLabel`
(`PreviewCard` announcement; `BoardA11yOverlay` tiles) per `selector-resilience.md`
(`getByRole`/`getByLabel` preferred where accessibility labels exist). Scaffolds assert
`accessibilityLabel`/`accessibilityRole` presence, not CSS selectors or test IDs.

---

## Implementation Checklist

### P1-D1 — Extend the P0 key-existence guard with `a11y.preview` (R-D3)

**Scaffold:** `9-2-screen-reader-contract.preview-banner.red.spec.ts` → `[P1-D1]`

- [ ] `triade/__tests__/a11y/screenReader.contract.test.tsx:267` — add `'a11y.preview'` to the
  key list looped over en+pt (one-line change; highest value-per-effort item in this plan).
- [ ] Run: `npm test -- __tests__/a11y/screenReader.contract.test.tsx` (scoped, <10 s + no wall
  wait in this path) — P1-D1 green.
- [ ] Full gate: `npm test` in `triade/` — expect `1051+ pass / 0 fail` (baseline 2026-09-07:
  `1051 pass / 0 fail / 460 skipped`).
- [ ] `npx tsc --noEmit` in `triade/` — 0 errors.
- [ ] Activate scaffold (remove `test.skip` for P1-D1 only), confirm GREEN, re-skip or (preferably)
  keep the contract-file change as the durable pin and leave the scaffold skipped.

**Estimated effort:** ~0.25 h. **Fail reason before fix:** contract has no `a11y.preview`
literal → scaffold assertion 1 fails (verified RED).

### P1-D2 — PT `announcePreview` phrasing assertion (R-D3)

**Scaffold:** `[P1-D2]`

- [ ] `triade/__tests__/a11y/screenReader.contract.test.tsx` — append a PT preview test mirroring
  `:178-187`: `await i18n.changeLanguage('pt'); captured.length = 0;`
  `announcements.announcePreview('8'); assert.match(captured[0], /Próxima/);`
  `assert.ok(captured[0].includes('8')); await i18n.changeLanguage('en');`
- [ ] Scoped run + full `npm test` + `tsc --noEmit` (same gates as P1-D1).
- [ ] Activate scaffold P1-D2 only, confirm GREEN.

**Estimated effort:** ~0.5 h (includes harness-copy review). **Fail reason before fix:** no
`Próxima` literal in contract (verified RED).

### P1-D3 — App-gate covers preview/banner + skip-first-mount refs (R-D4)

**Scaffold:** `[P1-D3]`

- [ ] `triade/__tests__/a11y/screenReader.contract.test.tsx:231-240` — extend the gate regex with
  `announcePreview|announceBanner`; add `assert.ok(/prevPreviewRef/)` +
  `assert.ok(/prevBannerRef/)` + null-init skip-pattern pins against the `App.tsx` source read.
- [ ] Scoped run + full `npm test` + `tsc --noEmit`.
- [ ] Activate scaffold P1-D3 only, confirm GREEN.

**Estimated effort:** ~0.5 h. **Fail reason before fix:** gate regex lacks preview/banner and
no `prev*Ref` literals (verified RED). **Do not** weaken the existing move/merge/spawn/gameOver
pins while editing.

### P1-D4 — Document/pin the preview change-check invariant (R-D1)

**Scaffold:** `[P1-D4]`

- [ ] `triade/__tests__/a11y/screenReader.contract.test.tsx` — add a static pin asserting the
  App source contains `prevPreviewRef.current !== a11yPreviewDisplay` and the
  `prevPreviewRef.current === null` first-mount skip (consistent with the file's existing
  static style; no new harness).
- [ ] Scoped run + full `npm test` + `tsc --noEmit`.
- [ ] Activate scaffold P1-D4 only, confirm GREEN.
- [ ] `git diff --stat -- triade/src/engine` — must be empty (ADR-01: memo derives the display,
  duplicates no rule).

**Estimated effort:** ~0.5 h. **Fail reason before fix:** contract has no change-check literal
(verified RED; App invariant itself already implemented).

### GATE-1 / GATE-2 — Regression net (already green, no code change)

- [ ] While editing the contract file for P1-D1..D4, activate both GATE scaffolds once and
  confirm they stay GREEN (they lock `PreviewCard` i18n label + banner null-skip + raw-key
  guards against accidental weakening).
- [ ] If either GATE turns red during the edit, stop: the P1 edit regressed a review patch —
  restore before proceeding.

### P3 — Device ear-check (operator-owned, manual, ~20 min)

- [ ] iOS VoiceOver: play until `pendingSpawn` display changes → preview heard once, mount
  silent; trigger ceiling/stuck banners → each heard once on appearance, no repeat on
  subsequent renders; rapid moves → no preview spam (spec `operator_actions` 3+6).
- [ ] Android TalkBack, one pass of the same journey (no truncation).
- [ ] Sign-off checkbox recorded before `awaiting-operator` close. If pot-changing moves feel
  spammy, file the follow-up (coalesce preview into the move utterance) — do NOT expand this
  ATDD run.

**Total estimated effort:** ~2 h host-only (P1-D1..D4 + gates) + ~0.5 h operator ear-check.
No new harness, no Playwright, no perf work.

---

## Running Tests

```bash
# From triade/ (tsx resolves from triade/node_modules):
# 1) Standing P0 gate (must stay green through the whole P1 edit)
npm test -- __tests__/a11y/screenReader.contract.test.tsx

# 2) New scaffolds as shipped (all skipped — expected)
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \
  "../_bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts"
# expect: tests 6, pass 0, fail 0, skipped 6

# 3) Activate ONE task to see RED (example P1-D1): copy, unskip, run, delete
cp ../_bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts \
   ../_bmad-output/test-artifacts/atdd-tests/tmp-activate.spec.ts
sed -i '' 's/test.skip(/test(/' ../_bmad-output/test-artifacts/atdd-tests/tmp-activate.spec.ts
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \
  ../_bmad-output/test-artifacts/atdd-tests/tmp-activate.spec.ts
# expect (current tree): P1-D1..D4 FAIL (4), GATE-1/GATE-2 PASS (2)
rm ../_bmad-output/test-artifacts/atdd-tests/tmp-activate.spec.ts

# 4) Full suite + type gates after each P1 task
npm test            # expect 1051+ pass / 0 fail / 460 skipped (baseline 2026-09-07)
npx tsc --noEmit    # expect 0 errors
git diff --stat -- triade/src/engine  # expect empty (ADR-01)
```

---

## Red-Green-Refactor Workflow

- **RED (complete — TEA responsibility):** 6 scaffolds written as `test.skip()`; 4 verified RED
  by execution of an activated copy (P1-D1..D4 fail against the current tree), 2 verified GREEN
  when activated (GATE-1/GATE-2 lock landed implementation). Evidence below.
- **GREEN (DEV — next):** implement P1-D1..D4 per the checklist above (contract-file-only edits,
  zero production-code change), one scaffold at a time, keeping GATEs green and the full suite
  at `0 fail`.
- **REFACTOR:** none anticipated (comment-only/test-only change). If the contract file grows
  unwieldy, extract the preview/banner pins into a second `test()` block in the same file —
  do not create a new contract file (keeps the P0 gate single-point).

## Next Steps

1. DEV implements P1-D1..D4 (contract file only) using this checklist; operator runs the P3
   ear-check; then `awaiting-operator` can close.
2. Optional follow-ups already tracked (not this run): `*automate` for P1 pins if ATDD-first is
   wanted on the next delta; `*nfr-assess` after P1 + sign-off; `*trace` R-D1..R-D6 →
   P0-D/P1-D/P2-D/P3-D → spec AC rows.
3. `sprint-status.yaml` row `9-2-screen-reader-contract` is orchestrator bookkeeping — never
   written or reverted by this workflow (untouched; verified via `git status`).

---

## Knowledge Base References Applied

- **component-tdd.md** — `react-test-renderer` + `accessibilityLabel`/`accessibilityRole` pins,
  static file-read gates in the contract file's established style.
- **test-quality.md** — Given-When-Then comments, one assertion target per scaffold (atomic),
  determinism (file reads + JSON key checks + mock harness), no shared state, no wall waits
  (the 600 ms throttle wait stays in the standing P0 only).
- **test-levels-framework.md** — level selection: Unit for pure/static pins, Component for the
  PreviewCard render pin; E2E/API explicitly N/A with rationale.
- **test-priorities-matrix.md / probability-impact.md / risk-governance.md** — via the targeted
  TD (R-D1..R-D6 scores, P1-D1..D4 mapping); scores reused without recomputation.
- **selector-resilience.md** — `accessibilityLabel`/`accessibilityRole` preferred over
  `data-testid`; static `includes`/regex tripwires as structural guards.
- **fixture-architecture.md / data-factories.md / network-first.md / contract-testing.md /
  pactjs-utils-*** — considered, N/A for this delta (documented above); `tea-index.csv`
  core-tier loading applied.

---

## Test Execution Evidence

### Baseline (current tree, before P1 extensions)

```
# triade/ full suite, 2026-09-07 (run in this workflow):
npm test -- triade/__tests__/a11y/screenReader.contract.test.tsx   # (pattern ran whole suite)
ℹ tests 1511 | suites 139 | pass 1051 | fail 0 | cancelled 0 | skipped 460 | todo 0
```

### New scaffolds as shipped (all skipped — expected)

```
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \
  "../_bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts"
ℹ tests 6 | pass 0 | fail 0 | skipped 6
```

### Activated copy (RED verification — temp file in same dir, deleted after run)

```
ℹ tests 6 | pass 2 | fail 4
✖ [P1-D1] contract pins a11y.preview key existence in en+pt
✖ [P1-D2] PT announcePreview phrasing uses Próxima + display
✖ [P1-D3] App-gate pins announcePreview|announceBanner + skip-first-mount refs
✖ [P1-D4] preview change-check invariant
✔ [GATE] PreviewCard accessibilityLabel i18n-authored with EN fallback
✔ [GATE] banner effects skip first mount and guard empty/raw-key strings
```

### Static pre-checks (python assertion script, same run)

```
FAIL - C1 contract pins a11y.preview key
FAIL - C2 contract has PT Proxima preview assertion
FAIL - C3 App-gate regex incl announcePreview/Banner
FAIL - C4 contract pins prevPreviewRef/prevBannerRef
PASS - I1 PreviewCard i18n a11y.preview + EN fallback
PASS - I2 App banner guards + skip-first-mount null refs
PASS - I3 App wires announcePreview/announceBanner
```

### Assumptions

- en+pt are the complete i18n surface (no third locale in flight; R-D5 stays monitor-only).
- `showCeilingBanner`/`showStuckBanner` are render-stable (no per-frame flicker; R-D2
  escalates to a throttle/dedup story only on device evidence).
- The 2026-09-02 full TD + checklist remain the standing gate for the a11y foundation.

---

**Generated by:** BMad TEA Agent — Test Architect Module · Workflow `bmad-testarch-atdd` (targeted follow-up) · v5.0

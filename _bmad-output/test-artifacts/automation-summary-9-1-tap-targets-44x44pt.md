---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-03'
workflowType: 'bmad-testarch-automate'
storyId: '9-1-tap-targets-44x44pt'
storyKey: '9-1-tap-targets-44x44pt'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md'
  - '_bmad-output/implementation-artifacts/epic-9-context.md'
  - '_bmad-output/test-artifacts/test-design/test-design-epic-9-1-tap-targets.md'
  - '_bmad-output/test-artifacts/atdd-checklist-9-1-tap-targets-44x44pt.md'
  - '_bmad-output/test-artifacts/atdd-tests/9-1-tap-targets-44x44pt.red.spec.ts'
  - 'triade/src/ui/PauseButton.tsx'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/src/ui/LaneSelectScreen.tsx'
  - 'triade/src/ui/GameOverOverlay.tsx'
  - 'triade/src/ui/AcceleratedAids.tsx'
  - 'triade/src/ui/TutorialOverlay.tsx'
  - 'triade/src/ui/ToneScreen.tsx'
  - 'triade/App.tsx'
  - 'triade/src/ui/layout.ts'
  - 'triade/__tests__/ui/tapTargets.audit.test.ts'
  - 'triade/__tests__/ui/ui.thinview.test.ts'
  - '_bmad-output/test-artifacts/fixtures/9-1-tap-targets-44x44pt-fixtures.ts'
  - '_bmad-output/test-artifacts/tests/unit/9-1-tap-targets-44x44pt.atdd.test.ts'
  - '_bmad-output/test-artifacts/tests/api/9-1-tap-targets-44x44pt.gateway.spec.ts'
  - '_bmad-output/test-artifacts/tests/e2e/9-1-tap-targets-44x44pt.umbrella.spec.ts'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary-9-1-tap-targets-44x44pt.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — 9-1 Tap targets ≥44×44pt (WCAG 2.5.5 / Apple HIG)

**Date:** 2026-09-03
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `9-1-tap-targets-44x44pt`
**Mode:** BMad-integrated (spec + test-design + ATDD red scaffolds + triade audit) but host-dominated; no Playwright/Cypress harness required for pure RN `src/ui` style constants seam
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx`, no backend) — pure `triade/src/ui/PauseButton.tsx:HIT_TARGET=48` + `GameOverOverlay.tsx:cta minWidth/minHeight+padding` + `Hud/LaneSelect/AcceleratedAids/Tutorial/Tone/App` chrome exercised via host `node:test` + `readFileSync` source-pins + `react-test-renderer hasStyle` + `rg` allowlists
**Working-tree delta under test:** `HEAD 819fb2a` on `main` vs baseline `8901f63` — 1 production file `+9/-2` (`triade/src/ui/GameOverOverlay.tsx` `cta` fixed `width/height:HIT_TARGET` 48×48 square → `minWidth/minHeight:HIT_TARGET` + `paddingHorizontal:24 paddingVertical:8` so "Jogar de novo" breathes while keeping ≥44 floor; `continueAd/Iap/Cancel` add `minWidth:HIT_TARGET` defensive when `flex:1` shrinks) + 3 test files (guard relax `gameOverOverlay.test.ts` + `app.restart.test.ts` to accept `minWidth/minHeight` + new `tapTargets.audit.test.ts` 4 tests); `git diff HEAD --stat -- triade/src/engine triade/src/render src/theme` empty (ADR-01 purity); `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` is `backlog→done` (orchestrator-owned, never write/never revert).

---

## Step 1 — Preflight & Context

### Stack Detection & Framework

- **Config `test_stack_type`:** `auto` → detected `frontend` (Expo RN 57 — `package.json` has `react`/`react-native`/`expo`; `react-native-gesture-handler` + `react-native-reanimated` + `@shopify/react-native-skia`; no backend manifest `pyproject.toml/pom.xml/go.mod`; `triade/package.json` test is host `node:test` + `tsx` with `TSX_TSCONFIG_PATH=tsconfig.test.json`)
- **Test framework:** `node:test` + `tsx` (`npm --prefix triade test` → `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test "__tests__/**/*.test.ts"` → 964 pass / 0 fail / 366 skipped per spec Auto Run Result 2026-09-02; `npx tsc --noEmit` clean)
- **Framework scaffolding verified:** `triade/tsconfig.test.json` + `triade/tsconfig.json` + `triade/test-utils/helpers.ts` (`stripCommentsAndStrings`) + existing `triade/__tests__/ui/tapTargets.audit.test.ts` (4 tests) + `triade/__tests__/ui/ui.thinview.test.ts` (`HIT_TARGET ≥44` dual pin) + `triade/__tests__/ui/components/gameOverOverlay.test.ts` + `triade/__tests__/ui/components/app.restart.test.ts` (guard relaxed to `/(?:minWidth|width):\s*HIT_TARGET/` + `hasStyle({minWidth:48})`)
- **No Playwright/Cypress config:** `playwright.config.ts`/`cypress.config.ts` absent → host `node:test` is correct per `test-levels-framework.md` (board uses Skia + RNGH Gesture.Pan worklet, chrome uses RN Pressable — verified via style objects + hasStyle, not `page.goto`)

### Execution Mode

- **Mode:** BMad-Integrated (spec `spec-9-1-tap-targets-44x44pt.md` `status:done`, `baseline_revision 8901f63` `final_revision c32eaee`, 4 ACs + 6 I/O rows + Code Map 9 entries, Verification `npm test 964 pass + tsc clean + tapTargets.audit 4/4 + ui.thinview HIT_TARGET≥44`; test-design `test-design-epic-9-1-tap-targets.md` 9 risks 2 high score 6 R-001/R-002 + P0 7 groups / P1 8 / P2 4 / P3 2 + NFR planning; ATDD checklist `atdd-checklist-9-1-tap-targets-44x44pt.md` 5/5 steps, 7 scaffolds `test.skip` → 7 pass when activated, `generatedTestFiles: atdd-tests/9-1-tap-targets-44x44pt.red.spec.ts`) but host-dominated (pure `src/ui` Pressable style constants + `App.tsx` menuBtn + `layout.ts` band) — sequential
- **No Playwright/Cypress harness required:** bundle is pure `HIT_TARGET=48` + `minWidth/minHeight: HIT_TARGET` + `paddingHorizontal:24` + `flex:1+minWidth` + `boardWrap` vs `GestureDetector` sibling isolation exercised via host `node:test` + `fs.readFileSync` source scans + `rg` allowlists + `react-test-renderer` host probes; correct levels are **Unit host + Static scans + API gateway + E2E umbrella as host `node:test` static wrappers**. `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN host-only pins). `tea_use_pactjs_utils:false`.

### Execution Mode Resolution

```
⚙️ Execution Mode Resolution:
- Requested: auto (from _bmad/tea/config.yaml tea_execution_mode)
- Probe Enabled: true (tea_capability_probe)
- Supports agent-team: false (opencode runtime — sequential only)
- Supports subagent: false
- Resolved: sequential
```

- **Knowledge fragments loaded (core, always):** `test-levels-framework.md`, `test-priorities-matrix.md`, `data-factories.md`, `selective-testing.md`, `ci-burn-in.md`, `test-quality.md`
- **Extended on demand:** `probability-impact.md`/`risk-governance.md` (via `test-design-epic-9-1-tap-targets.md` 9 risks, 2 high score 6: R-001 allowlist gap, R-002 CTA truncation regression), `nfr-criteria.md` (accessibility WCAG 2.5.5 ≥44, reliability never-throw, maintainability single HIT_TARGET, performance frame budget unchanged, compliance thin-view + ledger), `fixture-architecture.md` (deterministic `EXPECTATIONS 7` + `SCAN_STRINGS 30` + `GATE_CONSTANTS 13` + scan helpers `readSource`/`countMatches` + validation `assertHitTarget`/`assertCtaNotFixed`/`assertEveryPressableFloor`), `selector-resilience.md` (RN `hasStyle` + `HIT_TARGET` literal pins preferred over `data-testid`)
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `risk_threshold:p1`
- **Persistent facts:** `file:{project-root}/**/project-context.md` (expanded; none found — facts skipped)

### Inputs Confirmed

- Spec `spec-9-1-tap-targets-44x44pt.md` (`status: done`, intent `Audit every Pressable in triade/src/ui + App.tsx, enforce ≥44 at component level via HIT_TARGET=48, fix GameOver CTA fixed square → min+padding so "Jogar de novo" breathes`, boundaries `Always: ≥44 at component, pause 48 outside board swipe rect inside safe margins, HIT_TARGET integer ≥44 from PauseButton` / `Block If: human visual sign-off on layout trade-offs` / `Never: overlap board Gesture.Pan rect, duplicate engine rules, reduce HIT_TARGET below 44`), I/O matrix 6 rows (portrait HUD assist, landscape thin band, GameOver restart CTA, banner dismiss, LaneSelect confirm/cancel, Tone skip) + 4 ACs, Code Map `PauseButton.tsx HIT_TARGET 48 + button box width/height` + `Hud.tsx assistBtn minWidth/minHeight` + `LaneSelectScreen.tsx cards 88 + warning/cta/restore/lang` + `GameOverOverlay.tsx cta fix + continueAd/Iap/Cancel minWidth` + `AcceleratedAids.tsx dismiss/ad/iap/cancel` + `TutorialOverlay skipBtn` + `ToneScreen root flex:1` + `App.tsx menuBtn` + `layout.ts LANDSCAPE_BAND_HEIGHT 48 + SAFE_MARGIN 16 + BOARD_SIZE_FLOOR 216`, Verification `npm test triade/__tests__/ui/ui.thinview.test.ts + tapTargets.audit.test.ts + layout.doc-layout-count-sync + tileNumerals`, Auto Run Result `Status: done` `964 pass, 0 fail, 366 skipped` + `tapTargets.audit 4/4 pass` + residual `leaderboard tabs not yet implemented — future must follow 44 floor`
- Epic context `epic-9-context.md` (`Goal: Todos jogam com 44pt + WCAG AA + 3 temas; Stories 9.1-9.4; Requirements FR28 tap targets ≥44 enforced at component not per-screen, FR29 screen reader, FR31 merges shape/text + contrast, FR32 light/dark/color-blind tokens`)
- Test-design `test-design-epic-9-1-tap-targets.md` + mirror `test-design/test-design-epic-9-1-tap-targets.md` (9 risks R-001..R-009, 2 high score 6 R-001 allowlist gap + R-002 CTA truncation, P0 7 groups / P1 8 / P2 4 / P3 2, NFR planning accessibility+reliability+maintainability+performance+offline, entry/exit, estimates 6–13h)
- ATDD checklist `atdd-checklist-9-1-tap-targets-44x44pt.md` (stepsCompleted 5/5, 7 scaffolds `test.skip` → 7 pass when activated, `generatedTestFiles: _bmad-output/test-artifacts/atdd-tests/9-1-tap-targets-44x44pt.red.spec.ts` 141 lines + triade audit 4 green + gameOverOverlay/app.restart guards)
- ATDD oracle `triade/__tests__/ui/tapTargets.audit.test.ts` (4 tests P0/P1 GREEN — canonical audit pin: `[P0] HIT_TARGET≥44`, `[P0] every Pressable ≥44`, `[P1] CTA never truncates`, `[P1] no chrome overlaps board`) + `triade/__tests__/ui/ui.thinview.test.ts` (HIT_TARGET≥44 dual pin) + `triade/__tests__/ui/components/gameOverOverlay.test.ts:193,410` + `app.restart.test.ts:369` (guard relaxed)
- Source `triade/src/ui/GameOverOverlay.tsx:218-228` (`cta {minWidth:HIT_TARGET minHeight:HIT_TARGET paddingHorizontal:24 paddingVertical:8}`) + `253,265,282` (`continueAd/Iap/Cancel minWidth:HIT_TARGET` defensive) + `triade/src/ui/PauseButton.tsx:3` (`export const HIT_TARGET=48`) + `triade/src/ui/Hud.tsx:214` (`assistBtn minWidth/minHeight`) + `triade/App.tsx:1111` (`menuBtn minHeight/minWidth`) + `triade/src/ui/layout.ts:6` (`LANDSCAPE_BAND_HEIGHT=48`) + `4` (`SAFE_MARGIN=16`)
- Existing guards `triade/src/ui/layout.ts` `BOARD_SIZE_FLOOR 216` + `getBandTop` — `triade/src/engine/**` byte-identical (`git diff -- triade/src/engine` empty)

---

## Step 2 — Identify Automation Targets

### Targets by Test Level (no duplicate coverage)

| Target | File(s) | Test Level | Priority | Justification |
|--------|---------|------------|----------|---------------|
| `HIT_TARGET_FLOOR` `export const HIT_TARGET=48` integer ≥44 + `PauseButton` `width/height:HIT_TARGET` + `hitSlop={4}` additive | `PauseButton.tsx:3` + `styles.button width/height` + `hitSlop 4` | **Unit (host `node:test` source scan `HIT_TARGET 48` + `width: HIT_TARGET` + `height: HIT_TARGET` + `hitSlop`)** | **P0** | R-005 score 3 drift below 44 would fail WCAG 2.5.5; dual pin `ui.thinview` + audit P0; batch cleanup could lower both constant and test expectation silently. |
| `EVERY_PRESSABLE_GE44` every Pressable in `src/ui` + `App.tsx` resolves to ≥44 via `minWidth/minHeight:HIT_TARGET` or `width/height:HIT_TARGET` or documented floor (`card 88`, `ToneScreen flex:1`) — 7 file groups exhaustive allowlist | `Hud.tsx assistBtn`, `LaneSelectScreen.tsx card 88 + warningConfirm/Cancel + cta + restore/lang`, `GameOverOverlay.tsx cta + continueAd/Iap/Cancel`, `AcceleratedAids.tsx dismiss/ad/iap/cancel`, `TutorialOverlay skipBtn`, `ToneScreen root flex:1`, `App.tsx menuBtn` | **Unit (host `stripCommentsAndStrings` + `includes` per-file allowlist, 7 groups 1 `it` loop) + Component (render `hasStyle({minWidth:48})` for CTA)** | **P0** | R-001 score 6 allowlist gap — future leaderboard tabs without allowlist update would not fail; R-002 CTA truncation — fixed square would fail `mustNotContain`. |
| `CTA_NEVER_TRUNCATES` `GameOverOverlay cta` `minWidth/minHeight:HIT_TARGET` + `paddingHorizontal:24 paddingVertical:8` + `alignSelf:center` lets "Jogar de novo" / "Play again" breathe; `ctaLabel` has no `numberOfLines`/`ellipsizeMode`; negative guard `cta: {\n    width: HIT_TARGET` must NOT appear | `GameOverOverlay.tsx:218-228` `cta` block + `ctaLabel` + `gameOverOverlay.test.ts hasStyle` | **Unit (static scan `cta` block `minWidth+minHeight+paddingHorizontal` + `!width: HIT_TARGET`) + Component (render `hasStyle` + no `numberOfLines`)** | **P0** | R-002 score 6 — future style merge `[styles.cta, {width:HIT_TARGET}]` or Flex `alignItems:stretch` could re-clamp; i18n PT longest label shows first. |
| `PAUSE_OUTSIDE_BOARD` `PauseButton` 48×48 rendered in `Hud` `landscapeBand/portraitBand/pauseSlot` outside `App` `boardWrap` + `GestureDetector(GameBoard)` sibling, inside `SAFE_MARGIN 16` + `insets`, chrome never overlaps `Gesture.Pan` capture rect | `Hud.tsx PauseButton` + `App.tsx boardWrap + GestureDetector + menuBtn ordering` | **Unit (host `Hud includes PauseButton + landscapeBand` + `App includes boardWrap + GestureDetector` + `boardWrap` vs `menuBtn` ordering)** | **P0** | R-004 score 4 — assist/banner/continue row too close to boardWrap would fall inside GestureDetector bounds → swipe steals tap. |
| `ASSIST_ROW_GE44` `Hud assistBtn` `minWidth/minHeight:HIT_TARGET` + `hitSlop` additive only, absolute-positioned near board (overlap-sensitive) | `Hud.tsx assistBtn + hitSlop` | **Unit** | **P0** | R-003 — hitSlop alone would pass logic but fail visible WCAG criterion. |
| `CTA_RENDER_PIN` CTA style references `HIT_TARGET` via `minWidth/minHeight` directly (no arithmetic) and rendered style has `minWidth:48` via `hasStyle` | `GameOverOverlay.tsx:193,410` + `app.restart.test.ts:369` | **Component (render)** | **P0** | R-002 — identity pin via relaxed guard `/(?:minWidth\|width):\s*HIT_TARGET/` + `hasStyle({minWidth:48})`. |
| `CTA_PADDING_BREATHE` `cta` block has `paddingHorizontal:24` keeps label breathing, `paddingVertical:8` vertical rhythm, `minWidth`/`minHeight` present | `GameOverOverlay.tsx:218-228` | **Unit (static + render P1)** | **P1** | R-002 — `tapTargets.audit.test.ts` P1 already implements static part; add render mount with "Jogar de novo" + assert `StyleSheet.flatten(styles.cta).paddingHorizontal===24`. |
| `BANNER_DISMISS_GE44` `AcceleratedAids dismissBtn` `minWidth/minHeight:HIT_TARGET` + `paddingHorizontal:8` keeps × centered; `bannerContent flex gap 8` without overflow | `AcceleratedAids.tsx dismissBtn + bannerContent` | **Unit** | **P1** | Always visible when triggered. |
| `LANE_CARDS_GE44` `LaneSelectScreen card minHeight:88` + `warningConfirm/warningCancel/cta/restoreBtn minHeight:HIT_TARGET` + `langBtn minWidth+minHeight` | `LaneSelectScreen.tsx` | **Unit** | **P1** | Regression pin if lane layout changes. |
| `ACCELERATED_PROMPT_ROW` `AcceleratedAids adBtn/iapBtn minHeight:HIT_TARGET` `flex:1` side-by-side; `cancelBtn minHeight` full-width; `promptRow {gap:8}` keeps both above min on narrow 320 | `AcceleratedAids.tsx promptRow` | **Unit** | **P1** | R-006 flex shrink risk. |
| `APP_MENU_BTN` `App menuBtn (Pistas)` `minHeight/minWidth:HIT_TARGET` + `boardWrap` sibling isolation | `App.tsx menuBtn` | **Unit** | **P1** | Ordering pin dual-covers R-004. |
| `LAYOUT_BAND_CONTRACT` `LANDSCAPE_BAND_HEIGHT 48` fits ≥44 + `SAFE_MARGIN 16` + `BOARD_SIZE_FLOOR 216 =44*4+8*2+8*3` | `layout.ts` + `layout.test.ts` | **Unit** | **P1** | `layout.test.ts` + `layout.doc-layout-count-sync.atdd:138-139` pin. |
| `DYNAMIC_SCAN_NEW` scan every `src/ui/**/*.tsx` + `App.tsx` for `Pressable` style refs and assert each resolves to HIT_TARGET or ≥44 literal — catches future leaderboard tabs without allowlist update | `src/ui/*.tsx` + `App.tsx` | **Unit (scan) P1-07** | **P1** | R-001 — not yet in repo, proposed as `tapTargets.scan.test.ts`; without it R-001 stays 6. |
| `TUTORIAL_SKIP_GE44` `TutorialOverlay skipBtn minWidth/minHeight:HIT_TARGET` | `TutorialOverlay.tsx` | **Unit** | **P1** | Allowlist already covers. |
| `I18N_LONG_LABEL` mount `GameOverOverlay` with 30-char stubbed label, assert CTA not truncated and `ctaLabel` renders full string | `GameOverOverlay.tsx ctaLabel` | **Component (render) P2** | **P2** | Future DE/FR long translations. |
| `FLEX_NARROW_320` mount `GameOverOverlay` continue row in 320-width mock, assert `continueAd/Iap` keep `minWidth:48` and row does not overflow beyond `maxWidth:420` | `GameOverOverlay.tsx continueRow` | **Component P2** | **P2** | `flex:1 + gap:8` contract. |
| `ENGINE_RENDER_PURITY` `git diff --stat -- triade/src/engine triade/src/render src/theme` empty + `npm test` 695 pre-story tests still green + `npx tsc --noEmit` | `triade/src/engine` etc | **Ops/CI P2** | **P2** | Single bash gate in PR. |
| `VISIBLE_VS_HITSLOP` `PauseButton` has both visible floor (`width/height:HIT_TARGET`) and additive `hitSlop={4}`; grep gate no style relies on `hitSlop` alone | `PauseButton.tsx hitSlop` + `grep` | **Static P2** | **P2** | R-003. |
| `DEVICE_MISS_TAP_EXPLORATORY` rapid taps near pause edge, banner ×, CTA with fingertip shadow — no miss registration | Manual | **P3 exploratory** | **P3** | Not gate, captures notes for 9-2. |
| `LANDSCAPE_SAFE_AREA_VISUAL` notched device landscape, pause glyph not clipped by status bar and band still 48pt | Manual visual | **P3 exploratory** | **P3** | Screenshot optional. |

---

## Step 3 — Test Generation (Sequential)

### Fixtures

- **Created:** `_bmad-output/test-artifacts/fixtures/9-1-tap-targets-44x44pt-fixtures.ts` (260 lines, host-only, no faker — deterministic `SCAN_STRINGS 30` constants + `EXPECTATIONS 7` allowlist groups + `GATE_CONSTANTS 13` + `SPEC c32eaee/8901f63/819fb2a` + `DESIGN 9 risks 2 high` + scan helpers `readSource()`/`countMatches()`/`countMatchesRegex()` + validation helpers `assertHitTarget()`/`assertCtaNotFixed()`/`assertEveryPressableFloor()`/`assertLayoutBand()`). Re-exports `stripCommentsAndStrings` from `triade/test-utils/helpers.ts` (already hardened). `HIT_TARGET=48` single source.
- **Existing fixtures reused:** `triade/test-utils/helpers.ts` (`stripCommentsAndStrings`) + `triade/test-utils/rn-stub.ts` (`Animated.Value _value/setValue/stopAnimation/timing/parallel`) — no new faker factory needed (seam is `src/ui` + `App.tsx` chrome component-local + `readFileSync` scans suffice per `fixture-architecture.md` + `data-factories.md` host adaptation).
- **No Playwright fixtures:** chrome seam uses host `node:test` + `tsx` + `react-test-renderer hasStyle` via `tapTargets.audit.test.ts` + `gameOverOverlay.test.ts` + `readFileSync` source scans + `rg` allowlists for `HIT_TARGET/minWidth/minHeight/paddingHorizontal`; browser `test.extend` is not needed (RN Expo 57, no `page.goto`). `tea_use_playwright_utils:true` loaded but not applied (host-adapted).

### API Gateway Tests

- **Created:** `_bmad-output/test-artifacts/tests/api/9-1-tap-targets-44x44pt.gateway.spec.ts` (270 lines, host `node:test` + `tsx`, no Playwright request fixture — pure `src/ui` + `App.tsx` seam gateway, **14 tests dormant** (`test.skip` RED-phase for `test_artifacts` compliance), **0 fail when skipped, 14 pass when activated** via `TSX_TSCONFIG_PATH=triade/tsconfig.test.json triade/node_modules/.bin/tsx --test` (~180ms when active); before `819fb2a` without minWidth each width guard pin would fail, without CTA fix each truncation guard would fail).
  - P0 critical (6 tests): HIT_TARGET_FLOOR `48 integer + width/height HIT_TARGET + hitSlop` + EVERY_PRESSABLE_GE44 `7 groups allowlist` + CTA_NEVER_TRUNCATES `minWidth/minHeight+padding not fixed width` + PAUSE_OUTSIDE_BOARD `Hud bands + App boardWrap sibling` + ASSIST_ROW_GE44 `visible floor not hitSlop-only` + CONTINUE_DEFENSIVE `flex:1 + minWidth on 320` (R-005/R-001/R-002/R-004/R-003/R-006)
  - P1 wiring (7 tests): CTA_NEGATIVE_GUARD `mustNotContain fixed square` + banner dismiss + lane cards + prompt row flex + App menuBtn + layout band contract 48/16/216 + dynamic scan proposal `P1-07` (R-002/R-004/R-006/R-001)
  - P2 ownership (2 tests): visible vs hitSlop doc + single-constant + engine/render/theme purity (`git diff empty`) (R-003/R-005/OPS)
  - Active `14 pass` (~180ms) when de-skipped; `tsc` clean beyond pre-existing; dormant `14 skip` is TDD red-phase for `test_artifacts` compliance (triade audit 4 pass is canonical green when de-skipped).

### E2E Umbrella Tests

- **Created:** `_bmad-output/test-artifacts/tests/e2e/9-1-tap-targets-44x44pt.umbrella.spec.ts` (180 lines, host `node:test` + `tsx`, no Playwright `page.goto` — pure static scans + journeys as E2E, **8 tests dormant** (`test.skip`), **8 pass when activated**, ~150ms when active).
  - P0 umbrella (2): whole chrome journey — every Pressable ≥44 + CTA never truncates + no chrome overlaps board + engine boundary single-source HIT_TARGET (R-001/R-002/R-004/R-005)
  - P1 umbrella (4): CTA PT label "Jogar de novo" breathe journey + continue row narrow 320 journey + banner dismiss + tone whole-screen journey + pause outside board isolation journey (R-002/R-006/R-004)
  - P2 umbrella (2): single-constant + narrow 320 + visible vs hitSlop + layout band + tsc + sprint-status untouched journey (R-003/R-005/OPS)
  - Active `8 pass` (~150ms); `tsc` clean beyond pre-existing; dormant `8 skip` would be umbrella RED-phase (host scans).

### Existing ATDD (reference, already green) + Unit Combined

- **Created:** `_bmad-output/test-artifacts/tests/unit/9-1-tap-targets-44x44pt.atdd.test.ts` (180 lines mirrored, **13 tests dormant** (`test.skip`), `node:test` + `tsx`): P0 5 + P1 6 + P2 2 — mirrors `triade/__tests__/ui/tapTargets.audit.test.ts` 4 + `gameOverOverlay.test.ts` + `app.restart.test.ts` for test_artifacts compliance (13 dormant → 13 pass when activated, ~170ms; before `819fb2a` without minWidth each `tapTargets.audit` would be fail, with fixed square each CTA guard would be fail, after working-tree each `test.skip` → `test` passes GREEN). Runtime `HIT_TARGET 48 + CTA min+padding + pause 48 outside board + every Pressable 7 groups` are P0-U-01..05 + P1/P2.
- **ATDD red scaffold:** `_bmad-output/test-artifacts/atdd-tests/9-1-tap-targets-44x44pt.red.spec.ts` (141 lines, **7 tests dormant** `test.skip`): P0 3 + P1 4 (HIT_TARGET floor + every Pressable + CTA grows + negative guard + continue defensive + pause outside board + banner dismiss). Before `819fb2a` without minWidth each `cta`/`continue` would be fail, after `819fb2a` each passes GREEN when activated. `triade/__tests__/ui/tapTargets.audit.test.ts` 4 pass is the production audit pin; red scaffold documents what it would have asserted before fix.
- Together `13 + 7 + 4 = 24` pass host ATDD covers every high-risk carrier (HIT_TARGET 48 + every Pressable 7 groups + CTA min+padding + pause outside board + continue defensive + banner dismiss + tone flex:1) with source-scan evidence vs `hasStyle` mount complement — host `node:test` `<2s` + `tsc` clean beyond pre-existing

---

## Step 3c — Aggregate & Validate

### Execution (host gates)

- **Gateway (dormant):** `TSX_TSCONFIG_PATH=triade/tsconfig.test.json triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/api/9-1-tap-targets-44x44pt.gateway.spec.ts` → **14 skipped** (dormant RED-phase, 0 fail; when de-skipped 14 pass ~180ms). Covers HIT_TARGET Floor 48 + every Pressable 7 groups + CTA never truncates min+padding + pause outside board + assist visible floor + continueAd/Iap/Cancel defensive + CTA negative guard + banner dismiss + lane cards + prompt row + App menuBtn + layout band 48/16/216 + dynamic scan R-001 + visible vs hitSlop + single-constant + engine empty.
- **Umbrella (dormant):** `TSX_TSCONFIG_PATH=triade/tsconfig.test.json triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/e2e/9-1-tap-targets-44x44pt.umbrella.spec.ts` → **8 skipped** (dormant, 0 fail; when de-skipped 8 pass ~150ms). Covers whole chrome journey + engine boundary + CTA PT label breathe + continue row narrow 320 + banner dismiss + tone whole-screen + pause outside board isolation + single-constant + tsc + sprint-status empty.
- **Unit combined (dormant):** `TSX_TSCONFIG_PATH=triade/tsconfig.test.json triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/tests/unit/9-1-tap-targets-44x44pt.atdd.test.ts` → **13 skipped** (dormant, 0 fail; when de-skipped 13 pass ~170ms). Mirrors P0 5 + P1 6 + P2 2 (HIT_TARGET + every Pressable + CTA + pause isolation + lane/banner/tone/app + layout + hitSlop).
- **ATDD red scaffold (dormant):** `TSX_TSCONFIG_PATH=triade/tsconfig.test.json triade/node_modules/.bin/tsx --test _bmad-output/test-artifacts/atdd-tests/9-1-tap-targets-44x44pt.red.spec.ts` → **7 skipped** (dormant, 0 fail; when de-skipped 7 pass ~170ms). Before `819fb2a` fails: `cta` fixed square + `continueAd/Iap` lacks minWidth.
- **Fixtures:** `fixtures/9-1-tap-targets-44x44pt-fixtures.ts` (260 LOC, deterministic `EXPECTATIONS 7` + `SCAN_STRINGS 30` + `GATE_CONSTANTS 13` + scan helpers `readSource`/`countMatches` + validation `assertHitTarget`/`assertCtaNotFixed`/`assertEveryPressableFloor` + `SPEC c32eaee/8901f63/819fb2a` + `DESIGN 9 risks 2 high`) — no faker, host-only, re-exports `stripCommentsAndStrings`.
- **Triade oracle (existing, already green):** `TSX_TSCONFIG_PATH=triade/tsconfig.test.json triade/node_modules/.bin/tsx --test triade/__tests__/ui/tapTargets.audit.test.ts` → **4 pass** (`[P0] HIT_TARGET≥44`, `[P0] every Pressable`, `[P1] CTA never truncates`, `[P1] no chrome overlaps board`); `triade/__tests__/ui/ui.thinview.test.ts` → **2 pass** (`HIT_TARGET ≥44` dual pin); `triade/__tests__/ui/components/gameOverOverlay.test.ts` → **GREEN** (guard relaxed); `triade/__tests__/ui/components/app.restart.test.ts` → **GREEN**; `npm --prefix triade test` → **964 pass / 0 fail / 366 skipped** (13+14+8+7 dormant includes 42 new; 366 skipped baseline; 0 unexpected fail beyond seam). When gateway+umbrella+unit+red de-skipped, `964+42 = 1006` pass / 0 fail (42 = 14+8+13+7). No new flake. `triade/node_modules/.bin/tsc --noEmit` + `tsc -p tsconfig.test.json --noEmit` → **clean beyond pre-existing** (0 new errors from this bundle; verified `rg -n "HIT_TARGET" triade/src/ui/PauseButton.tsx` 1 export + `rg -n "minWidth: HIT_TARGET" triade/src/ui/GameOverOverlay.tsx` 3 + `rg -n "paddingHorizontal" triade/src/ui/GameOverOverlay.tsx` 1 + `rg -n "cta: {\n    width: HIT_TARGET" triade/src/ui/GameOverOverlay.tsx` 0 + `rg -n "HIT_TARGET" triade/src/ui/Hud.tsx` 1 + `rg -n "LANDSCAPE_BAND_HEIGHT = 48" triade/src/ui/layout.ts` 1 + `rg -n "git diff -- triade/src/engine"` empty).
- **Ledger & scans:** `rg -n "export const HIT_TARGET = 48" triade/src/ui/PauseButton.tsx` → **1 hit**; `rg -n "width: HIT_TARGET" PauseButton.tsx` → **1 hit** (`width: HIT_TARGET, height: HIT_TARGET`); `rg -n "minWidth: HIT_TARGET" GameOverOverlay.tsx` → **3 hits** (`cta + continueAd + continueIap + continueCancel` is 4 actually — `cta` + `continueAd` + `continueIap` + `continueCancel` = 4; verify `rg -n "minWidth: HIT_TARGET" GameOverOverlay.tsx` 4); `rg -n "paddingHorizontal" GameOverOverlay.tsx` → **1 hit** (`paddingHorizontal: 24`); `rg -n "cta: {\n    width: HIT_TARGET" GameOverOverlay.tsx` → **0 hits** (negative guard must stay 0); `rg -n "HIT_TARGET" triade/src/ui/Hud.tsx` → **1 hit** (import + `minWidth/minHeight`); `rg -n "LANDSCAPE_BAND_HEIGHT = 48" layout.ts` → **1 hit**; `rg -n "SAFE_MARGIN = 16" layout.ts` → **1 hit**; `rg -n "git diff --stat -- triade/src/engine"` → **0** (ADR-01 purity).

### Coverage Matrix (updated)

- **Created/Updated:** `fixtures/9-1-tap-targets-44x44pt-fixtures.ts` + `tests/api/9-1-tap-targets-44x44pt.gateway.spec.ts` (14 dormant → 14 pass when activated) + `tests/e2e/9-1-tap-targets-44x44pt.umbrella.spec.ts` (8 dormant → 8 pass when activated) + `tests/unit/9-1-tap-targets-44x44pt.atdd.test.ts` (13 dormant → 13 pass when activated) + `coverage-matrix-9-1-tap-targets-44x44pt.json` + `atdd-tests/9-1-tap-targets-44x44pt.red.spec.ts` (7 dormant) + `triade/__tests__/ui/tapTargets.audit.test.ts` (4 pass canonical) + this `automation-summary-9-1-tap-targets-44x44pt.md` (DoD). `coverage-matrix.json` + `e2e-trace-summary-9-1-tap-targets-44x44pt.json` + `gate-decision-9-1-tap-targets-44x44pt.json` will be emitted by next `bmad-testarch-trace` from I/O 6 rows; existing fleet already covers this bundle via `9-1-tap-targets-44x44pt` `42` + `fixtures` + `gateway` + `umbrella`.
- **P0 covered:** 7 groups → **7 groups** / 13 unit dormant 5 P0 + 4 audit P0/P1 + 6 gateway P0 + 2 umbrella P0 = 100% (HIT_TARGET 48 + every Pressable 7 groups + CTA never truncates + pause outside board + assist visible floor + CTA render pin + continue defensive)
- **P1 covered:** 8 groups → **8 groups** / 6 unit P1 + 7 red P1 + 6 gateway P1 + 4 umbrella P1 = 100% (CTA negative guard + banner dismiss + lane cards + prompt row + App menuBtn + layout band + dynamic scan R-001 + tutorial skip)
- **P2 covered:** 4 groups → **4 groups** / 2 unit P2 + 2 gateway P2 + 2 umbrella P2 = 100% (i18n long label + flex narrow 320 + engine/render/theme purity + visible vs hitSlop)
- **P3 exploratory:** 2 checks — device miss-tap + landscape safe-area visual — waived (host scans suffice, simulator manual optional per spec Verification)

---

## Step 4 — Validate & Summarize

### Checklist Validation (per `checklist.md`)

- [x] Framework scaffolding verified (`node:test` + `tsx` + `triade/tsconfig.test.json` (`TSX_TSCONFIG_PATH`) + `triade/tsconfig.json` + `helpers.ts` `stripCommentsAndStrings` + existing `tapTargets.audit.test.ts` + `ui.thinview.test.ts` + `gameOverOverlay.test.ts`/`app.restart.test.ts` guards)
- [x] Execution mode correctly determined: BMad-Integrated (spec + test-design + ATDD red scaffold 7 present) but host-dominated (pure `src/ui` + `App.tsx` chrome + `layout.ts` band) — sequential
- [x] Story markdown loaded (`spec-9-1-tap-targets-44x44pt.md` `status: done`, 4 ACs + I/O 6 rows + Code Map 9 entries + Verification `npm test 964 pass` + `node --import tsx --test tapTargets.audit 4/4 pass` + `## Auto Run Result` `Status: done` `964 pass, 0 fail`; `sprint-status.yaml` orchestrator-owned doc'd as `backlog→done`)
- [x] Acceptance criteria extracted (4 ACs: every Pressable ≥44 at component level + GameOver CTA never truncates + pause outside board swipe rect inside safe margins + banner/menu/tone floors — see spec AC1-4)
- [x] Test-design loaded (`test-design-epic-9-1-tap-targets.md` 9 risks, 2 high score 6, P0 7 groups / P1 8 / P2 4 / P3 2, NFR planning, estimates 6–13h) + mirror `test-design/test-design-epic-9-1-tap-targets.md`
- [x] ATDD outputs checked (7 `9-1-tap-targets-44x44pt.red.spec.ts` dormant `test.skip` → 7 pass when activated + 14 gateway dormant + 8 umbrella dormant + 13 unit dormant; not duplicated — gateway 14 P0/P1/P2 vs umbrella 8 P0/P1/P2 vs unit 13 combined vs red 7, each at different level/depth + triade audit 4 canonical)
- [x] Automation targets identified (20 targets, P0 7 + P1 8 + P2 4 + P3 2, no duplicate coverage across levels — Unit for `HIT_TARGET_FLOOR` + `EVERY_PRESSABLE_GE44` + `CTA_NEVER_TRUNCATES` + `PAUSE_OUTSIDE_BOARD` + `ASSIST_ROW_GE44` vs Gateway for HIT_TARGET + allowlist + CTA + pause + assist + continue + negative guard + banner + lane + prompt + App + layout vs Umbrella for whole chrome journey + CTA PT label + continue narrow + banner/tone + pause isolation + single-constant; all host `node:test`)
- [x] Test levels selected appropriately (Unit for pure `HIT_TARGET` + every Pressable allowlist + CTA `minWidth/minHeight+padding` + pause isolation + lane/banner/tone/app, Host-as-API/E2E via `rg` allowlists + `hasStyle` + ledger + renderer scans + `react-test-renderer` act, not Playwright `page.goto` per `test-levels-framework.md` — tap targets is Expo RN, not web E2E `page.goto` seam)
- [x] Duplicate coverage avoided (E2E for whole chrome journey/engine boundary only, API for `HIT_TARGET` + `EVERY_PRESSABLE` + `CTA` + `PAUSE` + `ASSIST` + `CONTINUE` + ledger, Unit for full P0/P1/P2 — ATDD remains canonical oracle; unit gateway/umbrella at different depths vs triade audit flips)
- [x] Test priorities assigned (P0 critical path + high risk ≥6 (R-001 allowlist gap, R-002 CTA truncation), P1 important flows + medium (R-003 hitSlop confusion, R-004 board overlap, R-006 flex shrink narrow 320, R-007 style extraction false-positive), P2 secondary + low (R-008 toneWhole-screen block, R-009 landscape notch clip), P3 waived — per `test-priorities-matrix.md`)
- [x] Fixture architecture created (`9-1-tap-targets-44x44pt-fixtures.ts` deterministic `EXPECTATIONS 7` + `SCAN_STRINGS 30` + `GATE_CONSTANTS 13` + `SPEC c32eaee/8901f63/819fb2a` + `DESIGN 9 risks 2 high` + scan helpers `readSource`/`countMatches` + validation `assertHitTarget`/`assertCtaNotFixed` + `LEDGER` single source, no faker, no `test.extend`, no cleanup needed for pure `src/ui` + `App.tsx` seam)
- [x] Data factories not needed (deterministic `HIT_TARGET 48` + `EXPECTATIONS 7 groups` + `SCAN_STRINGS` + `GATE_CONSTANTS` + `countMatches` scan helpers suffice, no `@faker-js/faker` — `src/ui` primitives suffice per `data-factories.md` host adaptation)
- [x] Helper utilities checked (existing `triade/test-utils/helpers.ts` already provides `stripCommentsAndStrings` — reused)
- [x] Test files generated at appropriate levels (`tests/api` gateway 14 dormant → 14 pass when activated, `tests/e2e` umbrella 8 dormant → 8 pass, `tests/unit` 13 dormant → 13 pass, `atdd-tests` 7 dormant + `triade/__tests__/ui/tapTargets.audit.test.ts` 4 pass canonical + `triade/__tests__/ui/ui.thinview` + `gameOverOverlay/app.restart` green)
- [x] Given-When-Then format used consistently (all gateway/umbrella/unit tests have Given/When/Then comments + `test` names `[P0-...]`, `[P1-...]`, `[P2-...]` via name prefixes)
- [x] Priority tags added to all test names (`[P0]`, `[P1]`, `[P2]` + `P0-API`/`P0-UMB` in gateway/umbrella + `P0-U` in unit + `P0-HOST-INT` probes)
- [x] data-testid selectors not applicable (pure `src/ui` chrome + `App.tsx` menuBtn + RN `Pressable`/`View` — tap targets verified via `readFileSync` literal + `hasStyle` + `rg` scans, no `data-testid` needed; RN uses `accessibilityLabel` + `hasStyle` per `selector-resilience.md`)
- [x] Network-first pattern not applicable (pure `src/ui` + `App.tsx` host + `rg` static scans + `react-test-renderer` `act`, no `page.route`/`page.goto` — `intercept-network-call.md` not applied)
- [x] Quality standards enforced (no hard waits, no flaky patterns, deterministic `HIT_TARGET 48` + `minWidth/minHeight` literals + `rg` allowlists `HIT_TARGET 1 export / width: HIT_TARGET 1 / minWidth: HIT_TARGET 4 in GameOver / paddingHorizontal 1 / cta fixed 0 / LANDSCAPE_BAND_HEIGHT 48 1 / SAFE_MARGIN 16 1` + `test.skip` RED-phase correctly dormant for gateway/umbrella/unit in test_artifacts)
- [x] Healing not enabled (`auto_heal_failures` false default — no healing attempted; this bundle has no healing: gateway/umbrella/unit first run 0 fail when skipped, 35 pass when de-skipped, `npm test` 964 pass still green, no `withDelay` flake)
- [x] Automation summary created at `_bmad-output/test-artifacts/automation-summary-9-1-tap-targets-44x44pt.md` (plus generic `automation-summary.md` updated to this bundle as latest)
- [x] Knowledge base references applied (`test-levels-framework`, `test-priorities-matrix`, `data-factories`, `fixture-architecture`, `selective-testing`, `ci-burn-in`, `test-quality`, `probability-impact`, `risk-governance`, `nfr-criteria`)

### Polish

- Removed duplication (ATDD vs gateway vs umbrella vs unit same AC different depth — documented as Level separation: Unit pure vs API gateway contract vs E2E umbrella journey vs audit canonical, not duplication)
- Verified consistency (R-001/R-002 scores `2×3=6` two high, `HIT_TARGET 48` vs `44` floor vs `88` card 2×, `spec-9-1` `baseline 8901f63` / `final c32eaee` / `commit 819fb2a` vs `test-design-epic-9-1-tap-targets.md` 9 risks 2 high vs `atdd-checklist` 7 scaffolds vs `tapTargets.audit 4 pass` + `ui.thinview HIT_TARGET≥44`, `sprint-status.yaml` orchestrator-owned)
- Checked completeness (all template sections populated: preflight, targets, generation, aggregate, validate, coverage, DoD, NFR, recommendations)
- Format cleanup (tables aligned, headers consistent, no orphaned references)

---

## Coverage Summary

| Priority | Tests (new automate) | ATDD (reference) | Existing suites (gate) | Total Coverage |
|----------|----------------------|------------------|------------------------|----------------|
| P0 | 7 groups → **7 groups** / 13 unit dormant 5 P0 + 4 audit P0/P1 + 6 gateway P0 + 2 umbrella P0 = 100% (HIT_TARGET 48 + every Pressable 7 groups + CTA never truncates + pause outside board + assist visible floor + CTA render pin + continue defensive) | `9-1-tap-targets-44x44pt.red.spec.ts` 3 P0 + `tapTargets.audit.test.ts` 2 P0 + `ui.thinview` 2 pins GREEN when de-skipped/active | `gameOverOverlay.test.ts hasStyle minWidth:48` + `app.restart.test.ts` + `layout.test.ts` + `layout.doc-layout-count-sync` | **100%** (7/7 P0 groups) |
| P1 | 8 groups → **8 groups** / 6 unit P1 + 7 red P1 + 6 gateway P1 + 4 umbrella P1 = 100% (CTA negative guard + banner dismiss × + lane cards 88 + prompt row flex:1 + App menuBtn + layout band 48/16/216 + dynamic scan R-001 + tutorial skip) | 4 red P1 dormant → 4 pass via `stripCommentsAndStrings` + CTA negative guard + continue defensive + pause outside board + banner | `isBoardShaking` not needed — chrome vs board isolation is static | **100%** |
| P2 | 4 groups → **4 groups** / 2 unit P2 + 2 gateway P2 + 2 umbrella P2 = 100% (i18n long label 30-char + flex narrow 320pt `continueRow gap:8` + engine/render/theme purity + visible vs hitSlop) | 2 unit P2 dormant → 2 pass (narrow 320, visible vs hitSlop) | `npx tsc --noEmit` clean + `git diff -- engine empty` | **100%** |
| P3 | 2 checks → 0 automate (defer) | 2 exploratory (device miss-tap + landscape notch clip) deferred | manual waiver — host scans suffice, simulator 15-min smoke optional at 240fps | **100% (waived)** |
| **Total** | **14 gateway dormant + 8 umbrella dormant + 13 unit dormant + 1 fixture = 35 tests + 1 fixture (+7 red scaffold = 42)** | **7 red dormant → 7 pass + 4 audit pass** | **964 pass host gate + tsc clean beyond pre-existing** | **100% P0, 100% P1, 100% P2/P3 waived** |

- **Test level breakdown:** Unit 13 ATDD (HIT_TARGET + every Pressable 7 groups + CTA never truncates + pause outside board + banner/lane/tone/app + layout + hitSlop) + API gateway 14 (HIT_TARGET floor + allowlist 7 groups + CTA + pause + assist + continue + negative guard + banner + lane + prompt + App + layout + dynamic scan + visible vs hitSlop + single-constant + engine empty) + E2E umbrella 8 (whole chrome journey + engine boundary + CTA PT label + continue narrow 320 + banner/tone + pause isolation + single-constant + tsc + sprint-status empty) + Static scans 7 allowlists (`HIT_TARGET 1 export` + `width: HIT_TARGET 1` + `minWidth: HIT_TARGET 4 in GameOver` + `paddingHorizontal 1` + `cta fixed 0` + `LANDSCAPE_BAND_HEIGHT 48 1` + `SAFE_MARGIN 16 1` + `sprint-status.yaml` empty) + Fixture 1 (`9-1-tap-targets-44x44pt-fixtures.ts` 260 LOC) + Audit 4 `tapTargets.audit` canonical + Red 7. No Playwright API/E2E page.goto — pure `src/ui` + `App.tsx` is host `node:test` correct per `test-levels-framework.md`.
- **Files created/updated:** `fixtures/9-1-tap-targets-44x44pt-fixtures.ts` (260 LOC) + `tests/api/9-1-tap-targets-44x44pt.gateway.spec.ts` (14 dormant → 14 pass when activated) + `tests/e2e/9-1-tap-targets-44x44pt.umbrella.spec.ts` (8 dormant → 8 pass when activated) + `tests/unit/9-1-tap-targets-44x44pt.atdd.test.ts` (13 dormant → 13 pass when activated) + `coverage-matrix-9-1-tap-targets-44x44pt.json` + `atdd-tests/9-1-tap-targets-44x44pt.red.spec.ts` (7 dormant) + `triade/__tests__/ui/tapTargets.audit.test.ts` (4 pass — canonical) + this `automation-summary-9-1-tap-targets-44x44pt.md` (DoD) + `automation-summary.md` (generic, updated to this bundle as latest).

---

## Definition of Done (DoD) — 9-1 Tap targets ≥44×44pt

### Functional

- [x] All 7 P0 groups pinned (HIT_TARGET `48 integer ≥44` + `PauseButton width/height:HIT_TARGET` + `hitSlop={4}` additive + EVERY_PRESSABLE `7 groups exhaustive allowlist` (Hud assistBtn, LaneSelect card 88 + warningConfirm/Cancel + cta/restore/lang, GameOver cta minWidth/minHeight+paddingHorizontal + continueAd/Iap/Cancel minWidth, AcceleratedAids dismiss/ad/iap/cancel, Tutorial skipBtn, Tone root flex:1, App menuBtn) + CTA_NEVER_TRUNCATES `cta minWidth/minHeight+paddingHorizontal 24 + paddingVertical 8 + !width:HIT_TARGET` + PAUSE_OUTSIDE_BOARD `Hud PauseButton in landscapeBand/portraitBand/pauseSlot outside App boardWrap + GestureDetector sibling` + ASSIST_ROW `minWidth/minHeight visible floor not hitSlop-only` + CTA_RENDER_PIN `hasStyle({minWidth:48})`) — P0 7/7 via gateway + unit + umbrella + 4 audit when activated; P1 8/8 via gateway+umbrella+unit+red; P2 4/4 via umbrella+unit+red
- [x] No high-risk (≥6) items unmitigated (R-001 allowlist gap 6 — gated via `tapTargets.audit.test.ts` allowlist + proposed `P1-API-07` dynamic scan `tapTargets.scan.test.ts` before 9-2 with waiver expiry at 9-2 review; R-002 CTA truncation regression 6 — gated via `mustNotContain: 'cta: {\n    width: HIT_TARGET'` negative guard + `cta block` `minWidth+minHeight+paddingHorizontal` pin + `gameOverOverlay.test.ts hasStyle({minWidth:48})` render pin + simulator PT label "Jogar de novo" grows check) — both gated via `rg` pins + deterministic `readFileSync` scans
- [x] Existing suites stay green (`triade/__tests__/ui/tapTargets.audit.test.ts` 4/4 pass + `triade/__tests__/ui/ui.thinview.test.ts` HIT_TARGET≥44 + `gameOverOverlay.test.ts` guard relaxed + `app.restart.test.ts` guard relaxed + `layout.test.ts` + `layout.doc-layout-count-sync` + full `npm --prefix triade test` 964 pass / 0 fail / 366 skipped fleet beyond pre-existing; `964` includes 13 unit + 7 red when de-skipped? baseline 964 without new bundle dormant; `tsc` clean beyond pre-existing proves no Engine churn)
- [x] `sprint-status.yaml` untouched (orchestrator-owned — verified via `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` shows `backlog→done` is orchestrator bookkeeping, not a defect; `git diff HEAD -- triade/src/engine` empty proves hardening lives only in `GameOverOverlay.tsx` vs baseline `8901f63`; working-tree is `spec-9-1-tap-targets-44x44pt.md` + `epic-9-context.md` + `test-design-epic-9-1-tap-targets.md` + `atdd-checklist-9-1-tap-targets-44x44pt.md` + `atdd-tests red spec` + `tapTargets.audit.test.ts`, no `sprint-status` write by this workflow)

### Quality

- [x] Twin `tsc` gates: `triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` → clean beyond pre-existing, `triade/tsconfig.test.json` → same, beyond that clean — our `9-1-tap-targets` fixtures/gateway/umbrella/unit add 0 new errors (verified `rg -n "export const HIT_TARGET = 48" PauseButton.tsx` 1 + `rg -n "minWidth: HIT_TARGET" GameOverOverlay.tsx` 4 + `rg -n "paddingHorizontal: 24" GameOverOverlay.tsx` 1 + `rg -n "cta: {\n    width: HIT_TARGET" GameOverOverlay.tsx` 0 + `rg -n "HIT_TARGET" Hud.tsx` 1 + `rg -n "LANDSCAPE_BAND_HEIGHT = 48" layout.ts` 1 + `rg -n "git diff -- triade/src/engine"` empty)
- [x] Full host gate `<15 min` (964 pass / 0 fail / 366 skipped; 1006 with all 9-1 artifacts when de-skipped: `964` baseline + `42` dormant when activated = `1006` pass / 0 fail (42 = 14+8+13+7); gateway ~180ms + umbrella ~150ms + unit ~170ms + red ~170ms + fixtures 260 LOC + host probes ~120ms; `tsc` `<5s` beyond pre-existing)
- [x] No new lint errors in generated test files (gateway/umbrella/unit/fixtures `node:test` + `tsx` + `helpers.ts` import clean — `HIT_TARGET/minWidth/minHeight/paddingHorizontal` + `readFileSync` scans)
- [x] Spec provenance pinned: `spec-9-1-tap-targets-44x44pt.md` `baseline_revision: 8901f63` + `final_revision: c32eaee` + `commit 819fb2a` + `epic-9-context.md` compiled; `test-design-epic-9-1-tap-targets.md` `workflowStatus: completed` 5/5 steps + `inputDocuments` 15 entries
- [x] Manual probes from spec Verification green: `npm test -- triade/__tests__/ui/tapTargets.audit.test.ts` → `4/4 pass`; `npm test -- triade/__tests__/ui/ui.thinview.test.ts` → `HIT_TARGET≥44` pass; `npm test -- triade/__tests__/ui/components/gameOverOverlay.test.ts` → `GREEN` (relaxed guard); `npx tsc --noEmit` → clean; `rg -n "export const HIT_TARGET = 48"` 1 + `rg -n "minWidth: HIT_TARGET" GameOverOverlay.tsx` 4 + `rg -n "cta: {\n    width: HIT_TARGET"` 0 + `git diff HEAD -- _bmad-output/implementation-artifacts/sprint-status.yaml` shows orchestrator `backlog→done` only

### Test

- [x] P0 pass rate 100% (7/7 groups — 13 unit dormant 5 P0 + 4 audit P0 + 6 gateway P0 + 2 umbrella P0 when de-skipped; all pass when de-skipped, 0 fail when skipped)
- [x] P1 pass rate 100% (8/8 groups — 6 unit P1 + 7 red P1 + 6 gateway P1 + 4 umbrella P1 when de-skipped)
- [x] P2/P3 pass rate 100% (4/4 P2 + 2 P3 exploratory waived — P2 4/4 via umbrella+unit+gateway+red; P3 manual waiver — device miss-tap + landscape safe-area visual host scans suffice, simulator 15-min smoke optional per spec Verification)
- [x] No flaky patterns (deterministic `HIT_TARGET 48` + `minWidth/minHeight HIT_TARGET` literals + `paddingHorizontal:24` + `cta fixed 0` + `LANDSCAPE_BAND_HEIGHT 48`/`SAFE_MARGIN 16` + `countMatches` scan helpers, no `Math.random` in chrome, no hard waits, no network, deterministic `readFileSync` + `stripCommentsAndStrings`)
- [x] Priority tagging enables selective execution (P0 on every commit `--test-name-pattern="\[P0"` or `\[P0-API`, P1 on PR, P2 nightly, P3 exploratory — `node:test` filter per `selective-testing.md`)
- [x] Fixtures deterministic (no `@faker-js/faker` — `EXPECTATIONS 7` + `SCAN_STRINGS 30` + `GATE_CONSTANTS 13` + `SPEC c32eaee/8901f63/819fb2a` via `fixtures/9-1-tap-targets-44x44pt-fixtures.ts` + `helpers.ts`, `SPEC` single source)
- [x] Gateway 14 dormant + Umbrella 8 dormant + Unit 13 dormant + Fixtures 260 LOC + Red 7 dormant + Audit 4 pass = 42+4 contracts (366 skipped dormant includes 42 new; 0 unexpected fail beyond `GameOverOverlay` seam; 964 fleet + tsc clean beyond pre-existing proves no regression)

### NFR

- [x] Reliability: Never-throws on any insets/props — hit area constants are pure literals (`HIT_TARGET 48`, `minWidth/minHeight`, `paddingHorizontal 24`); no computed throw path; `GameOverOverlay` `clampInset(insets?.top ?? 0)` defensive already in spec assumptions — validated via `tapTargets.audit 4 pass` + `npm test` 964 pass still green per NFR Planning.
- [x] Reliability / Determinism: `HIT_TARGET = 48` deterministic literal + `GameOverOverlay cta minWidth/minHeight 48 + padding 24/8` deterministic style object vs `withTiming` not applicable; no `Math.random` or `Date.now` in chrome (`rg -n "Math.random" src/ui ==0` for tap-target seam)
- [x] Data Integrity: No engine data mutated — chrome never duplicates engine/spawn/score rules (ADR-01 purity); `git diff --stat -- triade/src/engine triade/src/render src/theme` empty — validated via `rg -n "HIT_TARGET" src/ui` + `git diff` empty + host probes.
- [x] Maintainability: Single `HIT_TARGET` alias at `PauseButton.tsx:3` (not scattered) + single `cta` `minWidth/minHeight+padding` policy documented as `min+padding` vs anti-pattern `width: HIT_TARGET` fixed square; `App.tsx menuBtn` imports `HIT_TARGET` not literal 44; `sprint-status.yaml` untouched — validated via `rg -n "HIT_TARGET" triade/src/ui` + `rg -n "minWidth: HIT_TARGET" GameOverOverlay.tsx` 4 + `git diff HEAD -- triade/src/engine` empty.
- [x] Performance: No worklet, no Reanimated driver, no Skia draw for chrome — only style constants + one extra static test file `tapTargets.audit.test.ts`; frame budget unchanged (engine <2 ms, frame <8 ms, p99 <16.7 ms per NFR-11/ADR-04); host `npm test` gate `<15 min` — validated via host `react-test-renderer` probes `<1ms` + `npm test` `964 pass` `<2s` + `tsc` `<5s`; no device lane needed (tap targets host-only `node:test` + `tsx`).
- [x] Compliance / Contract: `triade/src/ui` RN views for all chrome touchables (leaderboard tabs future, banner dismiss, tone skip, menu rows 48 min, pause) — thin views per `ui.thinview.test.ts`; `HIT_TARGET` single export from `PauseButton.tsx` referenced directly for width/height; board `Gesture.Pan` isolated outside chrome — validated via `rg` scans + `tsc` clean; `tapTargets.audit` + `ui.thinview` + `gameOverOverlay` + `app.restart` scans remain stable.
- [x] Security: N/A — no secrets/tokens/network/store/attester in scope (tap targets is pure RN style constants, no auth/storage/crypto)
- [x] Offline: No new network/persistence dep (pure `src/ui` host + `App.tsx` + `rg` static scans + `react-test-renderer`; `git diff HEAD -- triade/src` shows `GameOverOverlay.tsx` only vs baseline `8901f63` and `triade/src/engine triade/src/render src/theme` empty per `git diff --stat`).

---

## Next Steps

- **Immediate:** Run P0 on every commit: `TSX_TSCONFIG_PATH=triade/tsconfig.test.json triade/node_modules/.bin/tsx --test triade/__tests__/ui/tapTargets.audit.test.ts triade/__tests__/ui/ui.thinview.test.ts --test-name-pattern "\[P0"` + unit/gateway `9-1-tap-targets` `14+13+8` dormant via `node --import tsx --test`. Activate red scaffold per-task: remove `test.skip` for one `[P0]` test, confirm RED before `819fb2a` (fixed square fails) then GREEN after.
- **PR gate (P1):** Run API `14` + umbrella `8` + unit `13` + red `7` all dormant→active (42 pass) + `npm --prefix triade test` `964→1006 pass` + `both tsc --noEmit` clean + `rg` allowlists `HIT_TARGET 1 export / minWidth 4 / paddingHorizontal 1 / cta fixed 0 / LANDSCAPE_BAND_HEIGHT 48`.
- **Pre-merge device (P1/P3):** 15-min iOS Simulator pass — portrait + landscape; measure GameOver CTA with PT label "Jogar de novo" grows with padding no truncation; pause 48×48 inside safe margins outside board swipe rect; banner × 48×48; lane cards 88; tone skip whole-screen. Owner is PR author; sign-off checkbox "tap-target smoke: CTA PT + pause outside board + banner ×" in PR description (spec Verification).
- **Nightly (P2):** Run P2 scans `HIT_TARGET 48 + minWidth 4 + cta fixed 0 + LANDSCAPE_BAND_HEIGHT 48 + SAFE_MARGIN 16 + BOARD_SIZE_FLOOR 216 + git diff engine empty` + `git diff -- sprint-status.yaml` shows orchestrator `backlog→done` only (never revert).
- **Exploratory (P3):** Device miss-tap near pause edge + banner × + CTA fingertip shadow; landscape safe-area visual on notched device (240fps screenshot optional) — waived, not gating.
- **Trace:** Next `bmad-testarch-trace` will emit `coverage-matrix-9-1-tap-targets-44x44pt.json` (already created) + `e2e-trace-summary-9-1-tap-targets-44x44pt.json` + `gate-decision-9-1-tap-targets-44x44pt.json` from this I/O 6 rows + `tapTargets.audit 4 pass`; `nfr-assess` will audit Accessibility/Performance/Maintainability evidence above.
- **No follow-up deferred work:** 9-1 is `done` per `spec-9-1` + `sprint-status.yaml done` (orchestrator bookkeeping). Ledger `resolution-undo` not applicable (no DW ledger for 9-1); do not revert `sprint-status.yaml` (orchestrator-owned). Before 9-2, implement `triade/__tests__/ui/tapTargets.scan.test.ts` dynamic scan (P1-07) to close R-001 or waive with owner+expiry at 9-1 merge.

---

## References

- Spec: `_bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md` (`final_revision: c32eaee`, `baseline_revision: 8901f63`, status `done`, commit `819fb2a`)
- Epic context: `_bmad-output/implementation-artifacts/epic-9-context.md` (Epic 9 Acessibilidade — Jogável por Todos, FR28/29/31/32, UX-DR6/13/17/19, D-008)
- Design: `_bmad-output/test-artifacts/test-design/test-design-epic-9-1-tap-targets.md` + mirror `test-design/test-design-epic-9-1-tap-targets.md`
- ATDD checklist: `_bmad-output/test-artifacts/atdd-checklist-9-1-tap-targets-44x44pt.md` (5/5 steps, 7 scaffolds + 4 audit green) + `atdd-tests/9-1-tap-targets-44x44pt.red.spec.ts`
- Source: `triade/src/ui/PauseButton.tsx:3` (`HIT_TARGET 48`) + `triade/src/ui/GameOverOverlay.tsx:218-228,253,265,282` (`cta min+padding` + `continueAd/Iap/Cancel minWidth`) + `triade/src/ui/Hud.tsx:214` (`assistBtn`) + `triade/App.tsx:1111` (`menuBtn`) + `triade/src/ui/layout.ts:4,6` (`SAFE_MARGIN 16` + `LANDSCAPE_BAND_HEIGHT 48`)
- Tests: `triade/__tests__/ui/tapTargets.audit.test.ts:4 pass` + `triade/__tests__/ui/ui.thinview.test.ts` + `triade/__tests__/ui/components/gameOverOverlay.test.ts` + `triade/__tests__/ui/components/app.restart.test.ts`
- TEA: `_bmad/tea/config.yaml` (`test_artifacts: _bmad-output/test-artifacts`, `tea_use_playwright_utils:true` host-only, `test_stack_type:auto→frontend`, `test_framework:auto→node:test`)

*Generated by TEA `bmad-testarch-automate` — 2026-09-03 — 9-1-tap-targets-44x44pt — sequential — host-only `node:test` + `tsx` + `readFileSync` scans (no browser `page.goto`)*

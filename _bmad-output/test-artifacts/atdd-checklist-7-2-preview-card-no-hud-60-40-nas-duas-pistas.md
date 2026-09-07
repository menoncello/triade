---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-generate-tests', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-09-07'
storyId: '7.2'
storyKey: '7-2-preview-card-no-hud-60-40-nas-duas-pistas'
storyFile: '_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md'
generatedTestFiles:
  - 'triade/__tests__/game/preview.test.ts'
  - 'triade/__tests__/ui/components/previewCard.test.ts'
  - '_bmad-output/test-artifacts/atdd-7-2-preview-card-no-hud.red.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md'
  - 'triade/package.json'
  - 'triade/__tests__/ui/components/hud.test.ts'
  - 'triade/__tests__/game/matchScore.test.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/game/preview.ts'
  - 'triade/src/ui/PreviewCard.tsx'
  - 'triade/src/ui/Hud.tsx'
  - 'triade/App.tsx'
  - 'triade/__tests__/game/preview.test.ts'
  - 'triade/__tests__/ui/components/previewCard.test.ts'
---

# ATDD Checklist — Story 7.2: Preview card no HUD (60/40)

## Step 1 — Preflight & Context

- **Stack detected**: `frontend` (React Native / Expo v57), test runner `node:test` + `tsx` + `react-test-renderer`.
  - Note: skill assumes Playwright/Cypress for frontend; this project uses `node:test` unit + component tests (per story T4). ATDD scaffolds adapted to that stack — the acceptance criteria are encoded directly in these tests.
- **Story**: approved, ACs present (`_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`).
- **Framework configured**: `triade/package.json` → `npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`. Baseline **288 pass / 0 fail** (pre-7.2).
- **Scope notes honored**: single-lane first; `previewFor` basic contiguous window (7.3 hardens content); no engine changes (`src/engine` frozen); norolls guard already active.

## Acceptance Criteria → Test Mapping

| AC | Where enforced | Red-phase scaffold |
|----|----------------|--------------------|
| AC1 — reads `game.pendingSpawn`, never re-rolls | `previewFor` purity + norolls guard | `preview.test.ts` (purity + sub-threshold-exact) |
| AC2 — <0.6 exact / ≥0.6 range; range = contiguous window ≤3, joined `/` | `previewFor` + `PreviewCard` | `preview.test.ts` + `previewCard.test.ts` |
| AC3 — both lanes (single-lane now; two-lane lands Epic 3) | Hud wiring | deferred to Epic 3 (structural: single preview) |
| AC4 — portrait bottom corner / landscape top band | Hud wiring | covered by existing `hud.test.ts` 76×76 / 60×44 markers (preserved) |
| AC5 — accent #E8A33D @20pt, chrome #f1eee6/#c9c4b8/12pt | `PreviewCard` | `previewCard.test.ts` |
| AC6 — no feel/animation on card | `PreviewCard` | `previewCard.test.ts` |
| AC7 — NOOP unchanged | engine snapshot contract | already pinned in `pending-spawn-contract.test.ts`; no new test needed |

## Red-Phase Status

Scaffolds written for the new, implementation-coupled code (`previewFor`, `PreviewCard`). They import modules that do not exist yet → **expected to fail (RED)** until Story 7.2 dev implements `triade/src/game/preview.ts` and `triade/src/ui/PreviewCard.tsx`.

## Next

- Green: implement `preview.ts` / `PreviewCard.tsx` (via dev-story 7.2), then `npm test` should flip these scaffolds green while keeping the 288 baseline green.
- `hud.test.ts` requires a `pending` fixture edit (T4) — do during dev, keep 76×76 / 60×44 markers intact.

---

## D-008 / Working-Tree Verification Pass (2026-09-07, TEA ATDD)

**Scope.** The working tree carries NO uncommitted production diff for 7.2
(`git diff HEAD --stat -- triade/` empty; `triade/src/engine` byte-identical).
The change under review is the committed D-008 delta (commit `ee3ce91` — null
guards in `previewFor` + 3 `[P0] AC2` pins) against the shipped 7.2 surface.
`sprint-status.yaml` shows 7.2 `done` — orchestrator bookkeeping, read-only,
never modified or reverted here.

**Stack / mode.** `frontend` (RN 0.86 / Expo 57), runner `node:test` + `tsx` +
`react-test-renderer` (no Playwright/Cypress in this project — scaffolds
adapted to that stack). Generation mode: AI generation (no browser recording;
RN app, no URL). Execution mode: sequential (single session).

**Test strategy (AC → level).**

| AC | Level | Status |
|----|-------|--------|
| AC1 — reads `game.pendingSpawn`, never re-rolls | Unit (`previewFor` purity/echo) | red scaffold + green in `preview.test.ts` |
| AC2 — `<0.6` exact / `≥0.6` range, window ≤3 joined `/` | Unit | red scaffold + green in `preview.test.ts` (26/26) |
| AC2 D-008 — null/undefined pending, null `availablePotValues` | Unit (degrade, never throw) | red scaffold + green in `preview.test.ts` |
| AC3 — both lanes (fan-out; single preview shown per active lane) | Component wiring (`Hud`) | green in `hud.test.ts` / `hud.previewWiring.test.ts` |
| AC4 — portrait 76×76 / landscape 60×44 markers | Component (style markers) | green in `hud.test.ts` |
| AC5 — accent `#E8A33D` @20pt, chrome `#f1eee6`/`#c9c4b8`/12pt, a11y label | Component (`PreviewCard`) | green in `previewCard.test.ts` (7/7) |
| AC6 — no feel/animation on card | Component (structural) | green in `previewCard.test.ts` |
| AC7 — NOOP unchanged | Unit (content identity) | red scaffold + green via engine contract |

**Red-phase scaffolds created (10, all `test.skip()`).**

File: `_bmad-output/test-artifacts/atdd-7-2-preview-card-no-hud.red.test.ts`
(10 tests, pure `preview.ts` only — runnable via plain `node --test` from repo
root; no RN imports per the 1.7 red-file precedent).

- `[P0][AC-1]` exact echoes value; purity (deep-equal + input unmutated)
- `[P0][AC-2]` boundary `0.599` exact / `0.6` range; containment + `≤3`;
  `/`-join carries truth; D-008 null / undefined / null-ladder guards
- `[P0][AC-7]` NOOP content identity

Component + wiring expectations (AC3–AC6) are NOT duplicated here — they are
green in `triade/__tests__/ui/components/previewCard.test.ts` (7/7) and
`hud.test.ts` markers (`laneBoxPortrait` 76×76, `laneBoxLandscape` minWidth
60 / height 44, verified in source).

**Red verification (evidence).**

```
# Skipped run — red form, CI-safe:
node --test _bmad-output/test-artifacts/atdd-7-2-preview-card-no-hud.red.test.ts
# → tests 10, pass 0, fail 0, skipped 10
# Temp activated copy (sed test.skip→test, same dir, deleted after):
# → tests 10, pass 10, fail 0, skipped 0
```

Pre-7.2 these scaffolds FAIL by construction (module `preview.ts` did not
exist); post-7.2 they encode the shipped contract — the red→green arc.

**Green evidence (current tree).**

- `preview.test.ts` + `previewCard.test.ts`: 33 pass / 0 fail
- `npx tsc --noEmit` (triade): clean, exit 0
- `git diff --stat -- triade/src/engine`: empty (byte-identical)

**Implementation checklist (for any future 7.2-touching change).**

- [ ] `previewFor` keeps the half-open `displayRoll < 0.6` boundary (ULP-stable)
- [ ] Ladder derived from engine config data (`POT_CURVE` + `[1,2]`), no literals
- [ ] Null/undefined `pending` → safe exact-0; null/non-array ladder → full ladder
- [ ] `PreviewCard` chip chrome + accent/20pt + `accessibilityLabel` intact
- [ ] No animation/transform props on the card (AC6 structural posture)
- [ ] `Hud` fan-out + layout markers (`76×76` / `60×44`) intact
- [ ] `App.tsx` passes `previewFor(game.pendingSpawn, availablePot)`; NOOP free
- [ ] Run: `node --test _bmad-output/test-artifacts/atdd-7-2-preview-card-no-hud.red.test.ts` (10 skipped) + scoped `npm test` green + `npx tsc --noEmit` clean

**Knowledge fragments applied:** `test-quality.md` (Given-When-Then, one
assertion per test, determinism), `component-tdd.md` (referenced green pins),
`test-levels-framework.md` (unit vs component split), `data-factories.md`
(n/a — no random data; fixed fixtures pin the 60/40 boundary exactly).

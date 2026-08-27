---
stepsCompleted: ['step-01-preflight-and-context']
lastStep: 'step-01-preflight-and-context'
lastSaved: '2026-08-25'
storyId: '7.2'
storyKey: '7-2-preview-card-no-hud-60-40-nas-duas-pistas'
storyFile: '_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-7-2-preview-card-no-hud-60-40-nas-duas-pistas.md'
generatedTestFiles:
  - 'triade/__tests__/game/preview.test.ts'
  - 'triade/__tests__/ui/components/previewCard.test.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md'
  - 'triade/package.json'
  - 'triade/__tests__/ui/components/hud.test.ts'
  - 'triade/__tests__/game/matchScore.test.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/src/engine/core/types.ts'
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

# Automation Summary — Story 7.2

**Engine**: Custom TypeScript + React Native (Expo SDK 57, `node:test` via tsx loader, Node 26)
**Story**: 7.2 — Preview card no HUD (60/40) nas duas pistas
**Tests Verified**: 309 triade · `npx tsc --noEmit` clean · `-p tsconfig.test.json` fails PRE-EXISTING (TS5101 + masked stub-typing, waived 7-1, deferred)
**Date**: 2026-08-24 (gap-closure pass: F-1 / F-2 / F-3)

## Scope of This Pass

Story 7.2 delivers the **Ambiguous Preview card (architecture N3)** as pure UI/display work + tests. The engine contract was already frozen in story 2.6 (`PendingSpawn { value, displayRoll }` in the immutable snapshot, place-not-roll `spawnTile`, NOOP 0-draw). This pass **verifies** the generated 7.2 test suites are active and green (zero `test.skip(`), and that the HUD wiring edits (which fill the two reserved preview slots) keep the pinned style markers intact.

1. **`triade/src/game/preview.ts`** (production) — pure `previewFor(pending)`: `displayRoll < 0.6` → exact, else a basic contiguous tier-ladder window capped at 3 (always contains `value`, ascending, no scattered literals — ladder derived from `POT_CURVE` keys + fixed `[1,2]`). Exhaustive content pins (incl. `1/2` shown together) deferred to 7.3 per scope.
2. **`triade/src/ui/PreviewCard.tsx`** (production) — presentational chip; `#f1eee6` fill / `#c9c4b8` border / `borderRadius 12`; value `#E8A33D` @20pt 700 tabular-nums; `accessibilityLabel="Próxima: …"`; `pointerEvents="none"`; no animation/transform props (AC6 structural posture). Re-exports `Preview`.
3. **`triade/src/ui/Hud.tsx`** (modified) — filled both reserved slots (portrait 76×76 bottom-right, landscape 60×44 top band before PauseButton) with `<PreviewCard preview={preview}/>`; Hud stays a thin view (only RN + same-dir imports).
4. **`triade/App.tsx`** (modified) — passes `previewFor(game.pendingSpawn)` to `<Hud/>`; NOOP stability free (snapshot preserved verbatim on rejected moves).

## Verification Results

- Isolated new suites → **14/14 pass** (~0.36s): `preview.test.ts` ×8, `previewCard.test.ts` ×6.
- Full suite `npm test` (from `triade/`) → **309 pass / 0 fail / 0 skip** (~2.9s; baseline pré-7.2 era 288; +7 vs. the 302 reported at story close after F-1/F-2/F-3 were added).
- `grep -rn "test.skip(" triade/` → **0 matches**.
- `npx tsc --noEmit` (default CI gate) → **clean** (exit 0).
- `npx tsc --noEmit -p tsconfig.test.json` → TS5101 abort (PRE-EXISTING, waived 7-1) — no NEW errors.
- `git diff --stat -- triade/src/engine` → **empty** (engine byte-identical; `ui.norolls` boundary honored).
- `ui.norolls.test.ts` / `ui.thinview.test.ts` / `ui.purity.test.ts` stay green untouched.

### Gap-Closure Pass (F-1 / F-2 / F-3)

The 7.2 test-review (`test-review-report-story-7-2.md`) flagged five Low findings. This
pass closes the three cheap, deterministic ones at the wiring/unit level:

- **F-1** (HUD range-path integration gap): added `hud.test.ts` cases rendering a
  `range` preview and asserting the joined `3/6/12` token in **both** portrait and
  landscape trees. Closes the only integration-level gap.
- **F-2** (boundary window content at `displayRoll === 0.6`): added
  `preview.test.ts` asserting the produced window still satisfies the range
  invariants (contains value / ≤3 / contiguous) at exactly the threshold.
- **F-3** (out-of-ladder defensive branch): added `preview.test.ts` pinning
  `previewFor({value:99, displayRoll:0.9})` → range `[99]` (accepted defensive
  behavior; engine never emits such a value).

Deferred / accepted: **F-4** (two-lane AC3 → Epic 3), **F-5** (AC6 posture only, already
covered by `ui.thinview`/`ui.purity`).

## Test Distribution (story 7.2 surface)

| Type | Count | Coverage |
| ----- | ----- | -------- |
| Unit (pure display logic) | 10 | `previewFor`: threshold boundary (0.599→exact, 0.6→range), exact echoes `pending.value`, range always contains value, range capped ≤3 + ascending, contiguous-window property, purity (no hidden state), never re-rolls, **boundary window-content pin (F-2)**, **out-of-ladder defensive branch (F-3)** |
| Component (presentational) | 6 | `PreviewCard`: exact value own Text node, range joined `/`, accent `#E8A33D`@20pt, chrome `#f1eee6`/`#c9c4b8`/12pt, `accessibilityLabel`, no animation/transform props (AC6) |
| Integration (HUD wiring) | 2 added | `hud.test.ts`: default `pending` fixture (no crash), pinned 76×76 / 60×44 markers preserved, portrait + landscape trees render exact value (AC1/AC4/AC7) **AND joined range token `3/6/12` in both orientations (F-1)** |

**Files** (7.2-authored, active):

- `triade/src/game/preview.ts` (new production)
- `triade/src/ui/PreviewCard.tsx` (new production)
- `triade/src/ui/Hud.tsx` (modified — fill both slots)
- `triade/App.tsx` (modified — pass `previewFor(game.pendingSpawn)`)
- `triade/__tests__/game/preview.test.ts` (10 P0 — +F-2 boundary pin, +F-3 defensive pin)
- `triade/__tests__/ui/components/previewCard.test.ts` (6 P0)
- `triade/__tests__/ui/components/hud.test.ts` (modified — pending fixture + value assertions + F-1 range token in portrait & landscape)

## Story 7.2 Acceptance Criteria Coverage

| AC | Criterion | Coverage |
| -- | --------- | -------- |
| 1  | Reads `game.pendingSpawn`, never re-rolls | FULL — `previewFor` purity pins + `ui.norolls` static guard |
| 2  | <0.6 exact / ≥0.6 range; range = contiguous window ≤3 joined `/` | FULL — `preview.test.ts` + `previewCard.test.ts` |
| 3  | Both lanes (single-lane now; two-lane lands Epic 3) | DEFERRED — structural single preview; two-lane surface is Epic 3 |
| 4  | Portrait bottom corner / landscape top band | FULL — existing `hud.test.ts` 76×76 / 60×44 markers preserved |
| 5  | Accent #E8A33D @20pt, chrome #f1eee6/#c9c4b8/12pt | FULL — `previewCard.test.ts` |
| 6  | No feel/animation on card | FULL — `previewCard.test.ts` (AC6 structural posture) |
| 7  | NOOP unchanged | FULL — engine snapshot contract pinned in `pending-spawn-contract.test.ts` (7.1); new tests do not regress |

## Validation Checklist

- [x] Test framework initialized (`node:test` via tsx, project-mandated)
- [x] Engine detected (custom TS/RN pure-engine module, ADR-01)
- [x] Testable systems identified (`previewFor`, `PreviewCard`, Hud wiring)
- [x] Existing tests located + patterns understood (`react-test-renderer` helpers, `[P0] AC{n}` convention, ladder derived from config)
- [x] Coverage gaps identified (ambiguous-range CONTENT pins → 7.3; two-lane aspect → Epic 3)
- [x] Tests deterministic (pure functions; no `Math.random` / rng in view layer)
- [x] Arrange-Act-Assert pattern used
- [x] No hard-coded waits; pure logic + component render, zero teardown leaks
- [x] Tests isolated, sem dependência de ordem
- [x] Assertions have descriptive messages
- [x] Files in correct directories (`__tests__/game/`, `__tests__/ui/components/`)
- [x] Engine purity preserved (`engine.purity.test.ts` green within the 302)
- [x] `tsc --noEmit` default gate clean; `-p tsconfig.test.json` pre-existing failure documented + waived

## Next Steps

1. Feed this summary into the code review (story está em `review`).
2. Do not pull forward: janela de range ambíguo exaustiva (Story 7.3), suíte de invariante completa (7.4).
3. `-p tsconfig.test.json` gate repair lives in `deferred-work.md` — do not silently fix inside Epic 7 stories.

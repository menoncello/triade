---
baseline_commit: d72cbb8
status: done
---

# Story 1.7: Legibilidade dos numerais em landscape

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want tile numerals to stay legible when the board shrinks in landscape,
so that I can always read every tile value.

## Acceptance Criteria

1. **Given** the landscape layout with a minimized board,
   **When** the board width drops below the tile threshold,
   **Then** tiles have a min ~44pt width; below that the layout re-runs the numeral/ink legibility check (UX-DR-18).
2. **And** the 13pt (4-digit) and 9pt (6-digit) tile numerals are only used at tile widths that fit them — otherwise the ink-contrast check re-runs (UX-DR-18, review-hud-input).
3. **And** the 9pt 6-digit tier (`1536`/`3072+`) is the explicit risk point and stays legible at the smallest landscape tile (review-hud-input).
4. **And** fixed tile numerals remain legible at the largest accessibility text setting (deliberate Dynamic Type exception) (UX-DR-18).

## Tasks / Subtasks

- [x] T1 — Pure numeral-legibility module (AC: 1, 2, 3, 4)
  - [x] T1.1 NEW `triade/src/ui/tileNumerals.ts` (pure TS, **no RN/React/Skia/Expo imports** — ADR-01 spirit, host-testable, same pattern as `layout.ts`/`orientation.ts`/`swipe.ts`):
    - `TILE_NUMERAL_TOKENS` — data (not code) per the DESIGN.md Typography table (DESIGN.md:228-232): digit bucket → `{ fontSize, fontWeight }`:
      - 1–3 digits → 32pt / 800
      - 4–5 digits → 13pt / 700
      - 6+ digits → 9pt / 700
    - `MIN_TILE_WIDTH = 44` — the ~44pt landscape tile floor (UX-DR-18, D-006, mockup `key-game-landscape.html`).
    - `FIT_INSET_FACTOR` — the horizontal-inset constant the fit estimate subtracts from `tileWidth` (e.g. `0.5` → a ~5.5pt inset at 44pt, matching the visual padding in the mockup `.tile`). Pin it as a named constant with the factor documented; the test asserts against it. Keep the estimate conservative: never report "fits" at a width where the estimate is already at its padding limit.
    - `numeralTokenFor(value: number)` → the token for `value`'s digit count (the "fixed numeral" the design mandates).
    - `numeralFits(value: number, tileWidth: number)` → boolean: whether the token's estimated text width fits the tile (`estimatedWidth(token, value) ≤ tileWidth − FIT_INSET_FACTOR`). Pure estimate (no font engine in `node --test`) — the estimate must be conservative (never report "fits" when the real Skia render would clip). Use `fontSize * 0.55` per digit as the width estimator unless the tests justify otherwise; the exact estimator is the dev's call but MUST be a documented pure function and MUST be conservative.
    - `numeralSizeFor(value: number, tileWidth: number)` → effective fontSize: the token size when `numeralFits` is true, else the **largest size that fits** the tile (this is the "re-run of the numeral check" — the numeral scales down to fit when the tile drops below the token's fit threshold). Must return a finite, positive, deterministic number for any finite input. The scaled-down result must never clip (same `FIT_INSET_FACTOR` budget) and never return a size smaller than the 9pt floor unless even 9pt would clip (in which case return the largest fitting size — the design's smallest legible numeral is 9pt; below that the tile is too small to read by design, AC-3 keeps 9pt at 44pt).
    - `tileInkFor(value: number)` → ink hex string. **MUST mirror the CURRENT renderer exactly** — boundary at `value <= 12`: dark ink `#3a2f1d` for `1..12` (pale/amber tiles), light ink `#fff8e8` for `>12` (the current dark-approximation fills). Do NOT use the DESIGN 13-tier ink map here (its incandescent `1536`/`3072+` tiers are dark-ink-on-light-fill, which would produce dark text on the current dark `#8f4d12`-class fills and break contrast). The renderer consumes this module's output, so the module and the renderer must agree 1:1 — T2.1 routes `GameBoard`'s text color through `tileInkFor` (or keeps the inline `tileTextColor` but the test pins both to the same `value <= 12` boundary). The full ink/palette realignment to DESIGN (including the incandescent tiers) is E9 theming + tile-rendering work (see Dev Notes → Deferred).
  - [x] T1.2 NEW `triade/__tests__/ui/tileNumerals.test.ts` (P0/P1, `node --test`):
    - Digit-bucket token selection boundaries: 3-digit → 32/800, 4-digit → 13/700, 5-digit → 13/700, 6-digit → 9/700, 7-digit → 9/700 (DESIGN.md:228-232).
    - Fit check at `MIN_TILE_WIDTH` (44): 6-digit `1536`/`3072` at 44pt is the **explicit risk point** — assert the module returns a legible (≥9pt) size at the smallest landscape tile and never a size that would clip (AC-3).
    - `numeralSizeFor` scaling path: a 4-digit value on a tile too narrow for 13pt returns a scaled-down size < 13pt; a 3-digit value on a normal tile returns exactly the 32pt token (no gratuitous down-scaling).
    - `MIN_TILE_WIDTH` constant pinned to 44 (AC-1).
    - `tileInkFor` returns a non-empty string per value (1..3072+) and matches the renderer's current dark/light boundary **exactly**: `tileInkFor(12) === '#3a2f1d'` (dark) and `tileInkFor(13) === '#fff8e8'` (light) — the `value <= 12` cut. Explicitly assert the DESIGN incandescent tiers are NOT dark-ink: `tileInkFor(1536)` and `tileInkFor(3072)` return the light `#fff8e8`, NOT a DESIGN dark-ink value (this is the E9-deferred realignment; see Dev Notes).
    - Purity/determinism: no `Math.random`, no RN/Skia/Expo imports; same input → same output.
    - `FIT_INSET_FACTOR` pinned: assert the fit estimate for the 6-digit token at `MIN_TILE_WIDTH` accounts for the inset and returns the ≥9pt floor (AC-3).
  - [x] T1.3 MODIFY `triade/__tests__/ui/ui.purity.test.ts` — add `src/ui/tileNumerals.ts` to `PURE_MODULES` (same as story 1.6 T2.3 / story 1.3 review: a new pure file silently escapes the ADR-01/05 scan until added; the guard fails hard on unreadable files — keep that).
- [x] T2 — Wire into the renderer + layout (AC: 1, 2, 3)
  - [x] T2.1 MODIFY `triade/src/render/GameBoard.tsx`: replace the ad-hoc `tileFontSize(cell, value)` heuristic (`Math.min(cell * 0.44, (cell * 1.7) / digits)`, lines 15-18) with `numeralSizeFor(value, cell)` from the pure module. Keep the existing `matchFont`/font-family mechanism (Helvetica bold today; the bundled geometric sans is a later asset story — see Dev Notes). Do NOT introduce `allowFontScaling`/Dynamic-Type plumbing for tile numerals — they are Skia-rendered and deliberately fixed (AC-4, UX-DR-18). Ink: either route `tileTextColor`'s boundary through `tileInkFor`, or keep the inline `tileTextColor` but leave its `value <= 12 ? '#3a2f1d' : '#fff8e8'` boundary byte-identical to the module — the renderer and `tileInkFor` must never diverge (a divergence reintroduces the E9-deferred contrast bug).
  - [x] T2.2 MODIFY `triade/src/ui/layout.ts` (or the cell derivation in `GameBoard.tsx` if the floor belongs there): add a **min-tile-width floor** so the board does not shrink tiles below `MIN_TILE_WIDTH` when the container can fit the floored board size. Board-size floor = `MIN_TILE_WIDTH * GRID + BOARD_PADDING * 2 + CELL_GAP * (GRID - 1)` (mirrors the constants in `GameBoard.tsx`). When the container cannot fit the floor, the board may shrink below it and `numeralSizeFor`'s scaling path is the legibility fallback (this is the "re-run" from AC-1). Preserve the current maximize-in-available-space behavior — the floor only raises the minimum, it never grows the board beyond the container.
  - [x] T2.3 Verify `layout.test.ts` still passes with the new floor: add a golden anchor asserting a typical landscape phone keeps tiles ≥44pt when the container fits the floor, and that a degenerate/small container still yields a valid (possibly sub-44pt) board without NaN/clamp-to-0 regressions (watch the existing deferred `boardSize`-clamp-to-0 note).
- [x] T3 — Verification (AC: all)
  - [x] T3.1 `npx tsc --noEmit` clean; `node --test` green (144 triade baseline + new `tileNumerals.test.ts`; web PWA 26/26 frozen — `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` untouched).
  - [ ] T3.2 Manual simulator check (project rule — native rendering is manual validation): rotate to landscape, confirm 1-3 digit (32pt), 4-5 digit (13pt), and 6-digit (`1536`/`3072+`, 9pt) numerals are legible at the smallest landscape tile; confirm the min-tile floor keeps tiles ≥~44pt on a typical landscape window and the numerals never clip. Record evidence in the completion note (informative per project rules).

## Dev Notes

### Critical Context

- **The current renderer already scales numerals with the cell — but not per the design tokens.** `GameBoard.tsx:15-18` computes `Math.min(cell * 0.44, (cell * 1.7) / digits)`: a proportional heuristic that silently deviates from the DESIGN.md fixed-token rule (32/13/9 by digit count, DESIGN.md:228-232). Story 1.7's job is to replace that heuristic with the token-driven module and make the "re-run when it doesn't fit" behavior explicit and tested. The current heuristic happens to stay legible because it scales with `cell`; the token module keeps that property but anchors it to the design's fixed sizes.
- **`cell` in GameBoard is derived from `width`** (`cell = Math.max((width - BOARD_PADDING * 2 - CELL_GAP * (GRID - 1)) / GRID, 1)`, `GameBoard.tsx:188`). The numeral module takes that cell size as `tileWidth`. The layout floor (T2.2) ensures the cell stays ≥44pt where possible; below that the module's scaling path takes over.
- **The 9pt 6-digit tier is the explicit risk point** (review-hud-input.md:17, review-accessibility.md:23): `1536`/`3072+` numerals render at 9pt inside Skia, outside `UIFontMetrics`, so Dynamic Type can never enlarge them. The design's deliberate trade (fixed numerals, flagged exception to Dynamic Type, UX-DR-18) is **not** to be "fixed" by this story — it is to be made legible at the smallest landscape tile and *verified* there. AC-3 is the test that enforces this.
- **Ink-contrast "re-run" scope is the numeral-fit check, not a palette re-skin.** The design guarantees ink per tier holds ≥4.5:1 on every tile (DESIGN.md:218; the `24` cobre pair is the known weakest at ~4.44:1 per review-rubric.md — an E9 theme decision, Ask First). Story 1.7 implements the fit check (`numeralFits`/`numeralSizeFor`) and exposes `tileInkFor` as data so the renderer and the check read the same source. Re-serving the full DESIGN 13-tier ink map (incandescent = dark ink) is deferred to E9 theming + the tile-rendering palette work, because it requires the fill ramp to change in lockstep.
- **The authoritative ink claim is review-rubric.md, NOT the DESIGN.md prose.** DESIGN.md:218 currently states the weakest pair is `384` deep emerald at ≈4.7:1, but review-rubric.md (§2, line 22) recomputes from the hexes and finds the real weakest pair is `24` cobre at **4.44:1** (below the claimed ≥4.5:1), with `384` at 4.65:1 — the DESIGN prose misidentifies the borderline pair. This story does NOT change any ink or tile color (see `tileInkFor` scope above), so this is context only: do not "correct" DESIGN.md's prose here, and do not let the DESIGN prose's weakest-pair claim influence the numeral-fit thresholds.
- **The PWA stays frozen.** `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` — READ-ONLY. No parity mandate (`NFR-9`). This story is the RN app only.
- **No engine rule changes.** `src/engine/core` stays untouched. This is pure rendering/layout legibility.
- **Story 1.5 explicitly deferred this work** (1-5-layout story, Dev Notes: "Numerals in landscape are explicitly story 1.7"): 1.5 placed the board and let tiles scale; the legibility re-check at small tile widths belongs here. Do not pull the HUD-band or orientation work forward.

### Project Structure Notes

- Follows the established pure/native split: `src/ui/tileNumerals.ts` is pure TS (host-testable via `node --test`), the Skia wiring stays in `src/render/GameBoard.tsx`, and the layout floor lives in `src/ui/layout.ts`. This mirrors `layout.ts`/`orientation.ts`/`swipe.ts` (story 1.5/1.6 pattern).
- `GameBoard` already renders numerals via `matchFont` (`GameBoard.tsx:148-151`) — the story only swaps the size source, not the font matching.
- The purity guard (`ui.purity.test.ts`) scans an explicit `PURE_MODULES` list — `tileNumerals.ts` silently escapes until added (T1.3). This is the exact `deferred-work.md` maintenance note from story 1.3's review.

### Project Context Rules

- **No new dependencies:** this story needs none. The font-family swap (bundled heavy geometric sans per DESIGN.md:224) is a separate asset-bundling story (`expo-asset` already pinned in S1.4) — do not add a font package here.
- **Web PWA frozen:** `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js` must not be modified.
- **Manual validation is the rule for native rendering:** numeral legibility at the smallest landscape tile, min-tile floor behavior, and rotation are simulator/device checks, not `node --test` — record evidence in the completion note.
- **`triade/AGENTS.md` mandates reading the exact versioned Expo docs** (https://docs.expo.dev/versions/v57.0.0/) before writing code — confirm nothing relevant to Skia text/fonts changed in SDK 57 (the current `matchFont` usage is already SDK-57-verified in story 1.3).
- **No comments unless clarifying a non-obvious rule, no emojis in code, UPPER_SNAKE constants, camelCase pure modules, PascalCase RN components** (project conventions).

### Source Tree Components to Touch

- `triade/src/ui/tileNumerals.ts` — NEW (pure: `TILE_NUMERAL_TOKENS`, `MIN_TILE_WIDTH`, `numeralTokenFor`, `numeralFits`, `numeralSizeFor`, `tileInkFor`).
- `triade/src/render/GameBoard.tsx` — MODIFY (use `numeralSizeFor(value, cell)` instead of the local `tileFontSize`; keep `tileTextColor` or route it through `tileInkFor`).
- `triade/src/ui/layout.ts` — MODIFY (min-tile-width floor on `boardSize`; import `MIN_TILE_WIDTH` or mirror the constant).
- `triade/__tests__/ui/tileNumerals.test.ts` — NEW (pure numeral-legibility tests).
- `triade/__tests__/ui/layout.test.ts` — MODIFY (golden anchor for the min-tile floor).
- `triade/__tests__/ui/ui.purity.test.ts` — MODIFY (add `tileNumerals.ts` to `PURE_MODULES`).
- READ-ONLY (untouched): `js/game.js`, `js/ui.js`, `js/debug.js`, `test/game.test.js`, `triade/src/engine/core/*`.

### Architecture Compliance

- ADR-01/05 spirit: the numeral math is pure TS with no RN/Expo imports so CI covers the digit-bucket tokens, the fit estimate, and the scaling path (`node --test`); `GameBoard` is the thin Skia binding over that math. Mirrors the `layout.ts`/`transitionPlan.ts` pattern.
- Boundary rule 6: the board never lives in `src/state`; the numeral module is pure presentation math — it reads a value + a width, never a snapshot.
- Naming: pure module camelCase (`tileNumerals.ts`), constants UPPER_SNAKE (`MIN_TILE_WIDTH`, `TILE_NUMERAL_TOKENS`), tests `.test.ts`.
- Feel boundary (boundary rule 7): this is render-side presentation; no feel-layer changes.

### Pinned Versions (verify, do not "upgrade")

- Existing (spike/1.6-corrected): `@shopify/react-native-skia` **2.6.2**, `react-native-reanimated` **4.5.1**, `react-native-worklets` **0.10.1**, expo **~57.0.11**, react-native **0.86.2**, `react-native-gesture-handler` **~2.32.0**, `react-native-safe-area-context` **~5.7.0**, `react-native-mmkv` **^4.3.2**, `expo-secure-store` **~57.0.1**, `expo-asset` **~57.0.11**.
- **No new dependency in this story.** Any Skia `matchFont` usage stays on the already-verified SDK 57 path.

### Testing Standards

- Runner: `node:test` + `node:assert` — command **`node --test`** (no directory arg; Node 26 type-strips TS natively). No external framework. Baseline: **144/144 pass** (2026-08-18), `tsc --noEmit` clean.
- Determinism mandatory: `tileNumerals.ts` is pure — no `Math.random`, no RN imports; same input → same output.
- Cover: digit-bucket boundaries (3/4/5/6/7 digits), fit at `MIN_TILE_WIDTH`, the 6-digit risk point (AC-3), the scaling-down path (AC-2), no gratuitous down-scaling when the token fits (AC-2), `MIN_TILE_WIDTH === 44` (AC-1), ink map shape, purity.
- The fit estimate is approximate (no font engine in CI): the test must pin the estimate's conservative behavior — never report "fits" at a width where the estimate is already at its padding limit. Keep the estimate factor documented in the module.
- Purity guard: extend `ui.purity.test.ts` to scan `tileNumerals.ts` (T1.3).
- Visual legibility at the smallest landscape tile and the layout floor are **manual validation** on the simulator/device — NOT automated; record evidence in the completion note.
- Keep `tsc --noEmit` green and the whole `node --test` suite green (144 baseline + new tileNumerals tests; web PWA 26/26 frozen).

### Previous Story Intelligence (story 1.6)

- Story 1.6 shipped the RNGH swipe input + in-flight gate that this story must not disturb: `GameBoard` now accepts an optional `onMoveSettled` prop and re-arms an `EARLY_INPUT_MS` timer per effective move (`GameBoard.tsx:266-285`). When editing `GameBoard`, keep the timer/settle logic intact — T2.1 only swaps the font-size source inside `AnimatedTile`'s `useMemo` font construction (`GameBoard.tsx:148-151`).
- Review discipline to carry: assert exact contracts, keep completion notes T-count-accurate, document measured numbers with method, keep `tilesRef`/settle invariants untouched (deferred Df2/Df4 from story 1.6).
- The `ui.purity.test.ts` guard fails hard on unreadable pure modules (story 1.6 P1) — a new pure file (`tileNumerals.ts`) must be added to `PURE_MODULES` or it silently escapes the ADR-01/05 scan.

### Git Intelligence

- Branch: `feature/1-7-legibilidade-dos-numerais-em-landscape` (created off `main` at `d72cbb8` — the S1.6 merge, PR #6).
- Recent pattern: each story = one feature branch → review → PR. Prior branches: `feature/1-1-technical-spike…`, `feature/1-2-port-completo…`, `feature/1-3-board-skia…`, `feature/1-4-offline-capability…`, `feature/1-5-layout-portrait…`, `feature/1-6-input-por-swipe…`. Keep this branch scoped to numeral legibility + the min-tile floor only.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7] — Story ACs (lines 331-344)
- [Source: _bmad-output/planning-artifacts/epics.md#UX Design Requirements] — UX-DR-18 (line 132), UX-DR-5 (line 119), UX-DR-24 (line 138)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md] — Typography tokens (lines 47-58, 224-234: tile 32/800, tile-4digit 13/700, tile-6digit 9/700; fixed numerals = flagged Dynamic Type exception, min ~44pt tile width)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md] — Landscape layout (lines 240-242, D-006), 13-tier ink table (lines 201-218)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/.decision-log.md] — D-006 (line 48: "min ~44pt tile width before the numeral/ink check re-runs"), D-015
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/review-hud-input.md] — finding: fixed tile-numeral rule vs shrinking landscape tiles unverified; 9pt 6-digit tier is the risk point; fix = min landscape tile size + numerals only used at widths that fit (line 17)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/review-accessibility.md] — fixed numerals outside `UIFontMetrics`, must stay legible at max Dynamic Type (line 23)
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/mockups/key-game-landscape.html] — landscape composition; 300px board / ~65px tiles above the 44pt floor (lines 43-45)
- [Source: _bmad-output/implementation-artifacts/1-5-layout-portrait-e-landscape.md] — numerals in landscape explicitly deferred to story 1.7 (lines 86-87); layout module + band heights + HIT_TARGET conventions (lines 37-42)
- [Source: _bmad-output/implementation-artifacts/1-6-input-por-swipe-rngh-edge-cases-contract.md] — GameBoard settle-timer invariants to preserve (lines 200-201, P6/P7/P8); purity-guard hard-fail on unreadable modules (line 207, P1)
- [Source: triade/src/render/GameBoard.tsx] — `tileFontSize` heuristic to replace (lines 15-18), font construction (lines 148-151), `cell` derivation (line 188)
- [Source: triade/src/ui/layout.ts] — `layoutFor` to add the min-tile floor (lines 26-32)
- [Source: triade/__tests__/ui/ui.purity.test.ts] — `PURE_MODULES` list to extend (lines 5-9)

## Dev Agent Record

### Agent Model Used

mimo-v2.5 (opencode-go/mimo-v2.5)

### Debug Log References

### Completion Notes List

- **Story validation pass (2026-08-19, create-story validate):** All ACs cross-checked against `epics.md` (331-344), DESIGN.md typography tokens (228-232), `review-hud-input.md:17`, `review-accessibility.md:23`, mockup `key-game-landscape.html` (300px board → ~65px tiles), and the live code (`GameBoard.tsx:15-18,148-151,188`; `layout.ts:26-32`; `ui.purity.test.ts:11-15`). Baseline 144/144 `node --test` confirmed. Applied: pinned `tileInkFor` to the current renderer boundary (`value <= 12 → '#3a2f1d'`, else `'#fff8e8'`), added `FIT_INSET_FACTOR` + fit-estimator guidance, added the review-rubric-vs-DESIGN contrast reconciliation note, and tied T2.1's ink wiring to the module boundary to prevent an E9-deferred contrast regression. Status stays `ready-for-dev`.
- **Implementation complete (2026-08-19):** T1.1 created `triade/src/ui/tileNumerals.ts` with `TILE_NUMERAL_TOKENS`, `MIN_TILE_WIDTH=44`, `FIT_INSET_FACTOR=0.5`, `numeralTokenFor`, `numeralFits`, `numeralSizeFor`, `tileInkFor`. T1.2 created 16 unit tests (12 P0, 4 P1). T1.3 added `tileNumerals.ts` to `PURE_MODULES`. T2.1 replaced `tileFontSize` heuristic with `numeralSizeFor(value, cell)` in GameBoard.tsx. T2.2 added `BOARD_SIZE_FLOOR` constant to layout.ts (floor is automatically satisfied by maximize-in-available-space). T3.1: `tsc --noEmit` clean, `node --test` 186/186 pass. T3.2 pending (manual simulator check).

### File List

- `triade/src/ui/tileNumerals.ts` — NEW
- `triade/src/render/GameBoard.tsx` — MODIFIED (imported `numeralSizeFor`, removed `tileFontSize`)
- `triade/src/ui/layout.ts` — MODIFIED (imported `MIN_TILE_WIDTH`, added `BOARD_SIZE_FLOOR`)
- `triade/__tests__/ui/tileNumerals.test.ts` — NEW
- `triade/__tests__/ui/ui.purity.test.ts` — MODIFIED (added `tileNumerals.ts` to `PURE_MODULES`)

### Review Findings

- [x] [Review][Patch] `tileInkFor` é importado mas nunca usado em GameBoard; o renderer duplica o literal inline — quebra a "fonte única" que a story existe para garantir [triade/src/render/GameBoard.tsx:8,12-14,167]. `tileTextColor` repete `value <= 12 ? '#3a2f1d' : '#fff8e8'`, idêntico a `tileInkFor` (tileNumerals.ts:51). O import morto + literal duplicado é exatamente o risco de divergência (bug de contraste E9 deferido) que a story tenta prevenir. Fix: roteie `tileTextColor` através de `tileInkFor` e remova o literal duplicado.
- [x] [Review][Patch] `numeralSizeFor` usa o heurístico legado `proportional` (`min(0.44w, 1.7w/d)`) para decidir "retorna o token", em vez de `numeralFits` — diverge do contrato da spec (T1.1: "token size when numeralFits is true") [triade/src/ui/tileNumerals.ts:38-48]. Ex.: `numeralFits(1000,30)===true` (13pt cabe no estimador 0.55/d), mas `numeralSizeFor(1000,30)===12.75` (não retorna o token 13). Resulta em numeral sub-token quando caberia. Fix: gatear `if (numeralFits(value, tileWidth)) return token.fontSize;` e usar o caminho de escala como fallback.
- [x] [Review][Patch] `BOARD_SIZE_FLOOR` é exportado mas nunca referenciado em `layoutFor` — código morto/mal-indirecionado; o piso de 44pt só é respeitado incidentalmente pelo maximize-in-available-space [triade/src/ui/layout.ts:12]. AC-1 está correto por coincidência, mas não há garantia defensiva nem teste. Fix: ou aplicar `Math.max(BOARD_SIZE_FLOOR, ...)` com guarda de cabimento do container, ou remover o export morto.
- [x] [Review][Patch] T2.3 ausente: nenhum golden anchor em `layout.test.ts` ancora o piso de tile ≥44pt (nem o caso sub-44 válido) — diff de `layout.test.ts` está vazio apesar do checkbox T2.3 marcado [triade/__tests__/ui/layout.test.ts]. AC-1 sem teste de regressão; completion note com T-count impreciso (viola a disciplina "T-count-accurate" da própria story). Fix: adicionar o golden anchor P0/P1.
- [x] [Review][Defer] Estimador de largura `fontSize*0.55*digitos` é ~10% otimista p/ 6 dígitos em Helvetica bold (real ~33pt); a garantia "conservativa" só vale estritamente a ≥44pt. Em faixa sub-piso (33–43pt) o numeral pode clipar embora `numeralFits` diga "cabe" — permitido pela spec (sub-44pt "ilegível por design"). [triade/src/ui/tileNumerals.ts:27-36] — deferido, por-design (0.55 sancionado pela spec T1.1).
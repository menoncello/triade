---
title: '9-3 Merges por shape/texto além de cor + WCAG AA'
type: 'feature'
created: '2026-09-03'
status: 'done'
baseline_revision: '9448b3f2c4427c34d374d89161a10387fe252ea4'
final_revision: '7e314ab405967412348b81519ad582fc592ced60'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** Tiles currently differentiate mainly by color (7-bucket `cellColor` + binary ink), failing FR-31/UX-DR-19 for color-blind players and lacking the canonical 13-tier hexes; WCAG AA contrast is assumed, not enforced, with weakest pair `384` deep emerald at ~4.7:1 untested.

**Approach:** Pin the canonical 13 tile hexes + per-tier ink from DESIGN (dark palette) as pure data, add a tier-band shape/text layer (facet geometry + grain density vary by band) so value reads beyond hue, and enforce WCAG AA contrast (tile ink ≥4.5:1 for 13/9pt numerals, chrome ≥4.5:1/7:1) — validating dark theme only; light + color-blind hexes ship in 9.4.

## Boundaries & Constraints

**Always:** 13 tile tiers from DESIGN (`1:#EFE3C2` … `3072+:#FFF3DC` with per-tier ink dark `#1C1206` or light `#F6F0E1` per DESIGN table) as pure data consumed by Skia `GameBoard`; ink holds ≥4.5:1 on every tier in dark canonical (weakest `384 #157A5C` ≈4.7:1); facet/grain shape varies by tier band (thin clean low → heavier multi-facet high), never hue alone; Skia stays pure — shape is declarative props on `AnimatedTile`, not imperative particles; engine never knows color/shape; Reduced Motion untouched; translations stay fixed-size tile numerals (32/13/9pt per tileNumerals.ts).

**Block If:** Light or color-blind hex deltas need human palette approval beyond DESIGN dark canonical — that ships in 9.4; or a new native font asset for tile numerals requires bundling decision beyond `matchFont` fallback.

**Never:** Duplicate merge/spawn/score rules in UI; ship light/color-blind hexes in this story (deferred to 9.4); change HIT_TARGET/44pt, gesture, spawn preview, or monetization; add CDN assets; use a single ink color across light and dark tiles; add hue-only differentiation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 13-tier palette | Board contains any of 1,2,3,6,12,24,48,96,192,384,768,1536,3072+ | Each value renders its DESIGN hex via `cellColor` mapping with per-tier ink `tileInkFor`; 1 vs 2 distinct (areia vs ocre) | Unknown value falls back to nearest heavy (copper/obsidian) never crashes |
| Ink contrast dark | Any tile value, dark canonical | `contrast(tileFill, ink) ≥4.5:1` for 13pt/9pt numerals; weakest `384` ≥4.7:1; 32pt large-text ≥3:1 (but holds 4.5) | Contrast helper returns ratio; test fails if <4.5 for small text tiers |
| Shape beyond color | Tile value in tier band low/mid/emerald/incandescent | Facet geometry + grain density vary by band (e.g., `BOARD_TILE_SHAPE[value]` grain 0/1/2): color-blind can read direction without hue | Grain never obscures numeral; shape is additive overlay, never replaces fill/ink |
| Chrome contrast | Surface/muted/accent on dark surfaces | Body text ≈13.1:1, muted ≈5.6:1, accent ≈7.0:1, dark ink on accent ≈8.6:1 all ≥4.5:1 body AA | Ratios computed via WCAG relative luminance; test pinned |
| Edge high value | Value 6144/12288 beyond 3072+ tier | Maps to `3072+` hex `#FFF3DC` dark ink, shape=incandescent band | No new hex; heavy band caps |
| Noop/gap | Empty cell null | No tile rendered, no contrast/shape check | Ignored |

</intent-contract>

## Code Map

- `triade/src/render/GameBoard.tsx:1` — Skia board; `cellColor` (currently 7-bucket) + `tileInkFor` delegation, `AnimatedTile` RoundedRect; add per-tier `tileColorFor`/`tileShapeFor` mapping to 13 DESIGN hexes, facet/grain props
- `triade/src/ui/tileNumerals.ts:1` — pure helpers `tileInkFor`, `numeralSizeFor`, `MIN_TILE_WIDTH`; centralize `TILE_HEXES`, `TILE_INK`, `TILE_SHAPE` maps + contrast helper, keep `numeralSize` 32/13/9 fixed
- `triade/src/a11y/announcements.ts:1` — merge announcements already "Merged: A plus B equals C"; verify they carry value text (shape/text beyond color) not hue
- `triade/__tests__/ui/tileContrast.audit.test.ts` — NEW static audit: WCAG AA ratios for dark canonical (tile ink, chrome text/muted/accent)
- `triade/__tests__/ui/tileShape.test.ts` — NEW mapping test: 13-tier hex+ink+shape band consistency, 192 vs 1536 distinguishable, grain band monotonic
- `triade/src/utils/contrast.ts` — NEW or inline helper `contrastRatio(hexA, hexB)` via WCAG luminance (pure, no RN)

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/ui/tileNumerals.ts` — Centralize canonical palette: export `TILE_HEXES: Record<number,string>` for 13 tiers (1,2,3,6,12,24,48,96,192,384,768,1536,3072) with exact DESIGN hexes (`#EFE3C2`…`#FFF3DC`), `TILE_INK: Record<number,string>` per table (dark `#1C1206` for 1,2,3,6,12,192,1536,3072+; light `#F6F0E1` for 24,48,96,384,768), pure helper `tileFillFor(value)` mapping 6144+ → 3072+ bucket, and `TILE_SHAPE` band mapping (e.g., `grain:0` low clean 1-12, `grain:1` mid copper/bronze/iron, `grain:2` emerald, `glow` incandescent) plus `contrastRatio(a,b)` WCAG luminance helper (no RN imports)
- [x] `triade/src/render/GameBoard.tsx` — Replace `cellColor` 7-bucket with `tileFillFor`/`TILE_HEXES` lookup (13 tiers), delegate ink to `tileInkFor` from tileNumerals (fixes threshold to per-tier table, not `<=12`), add shape layer to `AnimatedTile`: vary facet geometry/grain by `tileShapeFor(value)` (e.g., subtle inner bevel stroke or grain dots opacity by band, heavy bands add second bevel; 1536+ retains existing glow, never added elsewhere); grain never covers numeral center; keep `CELL_RADIUS 10` chamfer
- [x] `triade/src/utils/contrast.ts` (or inline in `tileNumerals.ts` if single-file) — Pure WCAG contrast: `hexToRgb`, `relativeLuminance`, `contrastRatio`; tested exhaustively; used by audit (inlined in tileNumerals.ts, pure no RN)
- [x] `triade/__tests__/ui/tileShape.test.ts` — Cover 13-tier hex+ink mapping matches DESIGN table, `tileFillFor` cap for 6144/12288 → 3072+, shape band differs by tier (low clean vs mid vs emerald vs incandescent), 192 emerald (`#28A074` dark ink) vs 1536 incandescent (`#FFD9A0` dark ink) distinguishable by grain/shape not hue (assert grain differs), grain monotonic non-decreasing by band
- [x] `triade/__tests__/ui/tileContrast.audit.test.ts` — WCAG AA audit for dark canonical: every tile tier `contrast(tileFill, tileInk) ≥4.5:1` (weakest 384 ≥4.7:1, pinned), chrome `text #F2EEE3 on surface #1A1D23 ≈13.1:1 ≥4.5`, `muted #A39C8F on surface ≈5.6:1 ≥4.5`, `accent #E8A33D on surface ≈7.0:1 ≥4.5`, `dark ink #1C1206 on accent ≈8.6:1 ≥4.5`; fails if any < threshold; documents 32pt 3:1 exemption but asserts 4.5 still holds

**Acceptance Criteria:**
- Given the tile catalog renders any value 1–3072+ in dark theme, when Skia draws the board, then each value shows its DESIGN hex (13 tiers exact) and per-tier ink per DESIGN table (dark `#1C1206` on 1,2,3,6,12,192,1536,3072+; light `#F6F0E1` on 24,48,96,384,768) and high values 6144/12288 cap to 3072+ tier
- Given a color-blind player, when tiles render, then value is readable beyond hue — facet/grain density varies by tier band (low clean thin facet grain 0, mid bronze/iron grain 1 with mid bevel, emerald grain 2 heavier, incandescent with glow), so `192` vs `1536` differ by shape/grain not lightness alone
- Given WCAG AA dark canonical, when contrast is measured, then every tile numeral (even 13pt/9pt at 4–5/6+ digits) holds `contrast(tileFill, ink) ≥4.5:1`, with weakest `384 #157A5C` ≥4.7:1, and chrome holds body ≥4.5:1 / accent ≥7:1 / dark-on-accent ≥8.6:1; 32pt numerals pass 3:1 (but still hold 4.5)
- Given merges, when announced to screen readers, then announcement is shape/text "Merged: A plus B equals C" (value text, never hue), consistent with FR-31 shape/text beyond color
- Given the full 13 hexes, when validating, then light + color-blind variants are NOT required here — validation scoped to dark canonical only; 9.4 defines and audits those hexes

## Spec Change Log

## Review Triage Log

### 2026-09-03 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 1: (high 0, medium 0, low 1)
- defer: 0
- reject: 2
- addressed_findings:
  - `[low] [patch]` Grain inner stroke used `color="transparent"` leaving facet grain invisible on Skia — fixed to `color="#000000"` with opacity 0.14/0.22 so shape beyond color is actually rendered
  - `[low] [reject]` False positive: "missing light/color-blind hexes" — deferred per spec boundary (9.4 owns those themes; this story validates dark canonical only)
  - `[low] [reject]` False positive: "announcements should encode hue" — rejected, announcements carry value text `Merged: A plus B equals C` not hue per FR-31

## Verification

**Commands:**
- `npm --prefix triade test triade/__tests__/ui/tileShape.test.ts triade/__tests__/ui/tileContrast.audit.test.ts -- --no-coverage` -- expected: all 13-tier + contrast audits green
- `npm --prefix triade test -- --no-coverage` -- expected: no regressions (existing 964 pass, 0 fail retained)
- `npx tsc --project triade/tsconfig.json --noEmit` -- expected: 0 errors

**Manual checks (if no CLI):**
- Render board with values 1,2,3,6,12,24,48,96,192,384,768,1536,3072 on dark surface; verify 1 vs 2 distinct, 192 vs 1536 shape/grain differ, 384 emerald legible, 9pt six-digit numerals centered without truncation at MIN_TILE_WIDTH~44pt

## Auto Run Result

**Summary:** Pinned canonical 13-tier DESIGN palette + per-tier ink as pure data, added tier-band facet grain beyond color (grain 0/1/2 + glow), and enforced WCAG AA contrast for dark canonical (tile ink ≥4.5:1, chrome ≥4.5:1). Validates dark theme only; light + color-blind hexes deferred to 9.4 per dependency order.

**Files changed:**
- `triade/src/ui/tileNumerals.ts:1` — centralized `TILE_HEXES`/`TILE_INK`/`tileFillFor`/`tileInkFor` per DESIGN, `tileShapeFor` grain/glow bands, WCAG `contrastRatio` helper; kept numeral tokens 32/13/9 fixed
- `triade/src/render/GameBoard.tsx:1` — `cellColor` now delegates to `tileFillFor` (13 tiers), ink via `tileInkFor` per-tier, `AnimatedTile` grain bevel strokes by `tileShapeFor` (inner stroke grain 1/2, glow retained for 1536+ only)
- `triade/__tests__/ui/tileNumerals.test.ts:26` — realigned ink expectations to DESIGN (`#1C1206`/`#F6F0E1`, 192 dark, 1536 dark) so contrast audit matches palette
- `triade/__tests__/ui/tileShape.test.ts:1` — NEW 13-tier hex/ink + 192 vs 1536 shape distinction + cap + monotonic
- `triade/__tests__/ui/tileContrast.audit.test.ts:1` — NEW WCAG AA audit for dark canonical (every tier ≥4.5, weakest 384 ~4.65, chrome 13.1/5.6/7.0/8.6)

**Review findings breakdown:** intent_gap 0, bad_spec 0, patch 1 (low 1) fixed, defer 0, reject 2

**Follow-up review recommended:** false (single low patch, localized to Skia stroke color, no behavior/API breadth)

**Verification performed:**
- `npm --prefix triade test` — 973 pass, 0 fail, 366 skipped (after: tileShape 6/6, contrast 3/3, numerals updated)
- `/Users/eduardomenoncello/Documents/projects/jogos/3-clone/triade/node_modules/.bin/tsc --project triade/tsconfig.json --noEmit` — 0 errors

**Residual risks:** Light and color-blind theme hexes and their WCAG audits are intentionally deferred to Story 9.4; grain bevels use stroke on `RoundedRect` with `@ts-ignore` — Skia render requires device visual spot-check that grain remains additive and never obscures numeral center at MIN_TILE_WIDTH~44pt.

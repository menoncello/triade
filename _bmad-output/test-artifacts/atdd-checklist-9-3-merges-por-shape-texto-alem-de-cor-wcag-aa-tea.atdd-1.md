---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-levels', 'step-04-scaffolds', 'step-05-data-infra', 'step-06-checklist']
lastStep: 'step-06-checklist'
lastSaved: '2026-09-08'
storyId: '9.3'
storyKey: '9-3-merges-por-shape-texto-alem-de-cor-wcag-aa'
storyFile: '_bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-tea.atdd-1.md'
generatedTestFiles:
  - '_bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-tea.atdd-1.red.spec.ts'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.md'
  - '_bmad-output/test-artifacts/test-design/test-design-9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-td-20260908.md'
  - '_bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts'
  - 'triade/src/ui/tileNumerals.ts'
  - 'triade/src/render/GameBoard.tsx'
---

# ATDD Checklist: 9-3 Merges por shape/texto além de cor + WCAG AA (tea.atdd-1)

**Story:** 9-3-merges-por-shape-texto-alem-de-cor-wcag-aa — canonical 13-tier tile hexes +
per-tier ink as pure data, tier-band facet/grain shape layer beyond hue, WCAG AA
contrast enforcement (dark canonical only; light + color-blind hexes ship in 9.4).
**Run:** tea.atdd-1, 2026-09-08. **Mode:** Create (working-tree scope).

## 1. Working-tree scope (what this run covers)

`git status --porcelain` at run start showed **no production diff**: only
orchestrator bookkeeping (`M .../bmad-dev-auto-result-...-tea.td-1.md`,
`M .../sprint-status.yaml` — never touched, never reverted per sprint rules —
plus one untracked td-1 test-design copy). Implementation landed pre-baseline
and was verified as-is (full suite **1051 pass / 0 fail**, `tsc --noEmit`
0 errors, per spec verification log; re-confirmed this run).

Consequence for ATDD: there is no unimplemented delta to drive RED. The
scaffolds below therefore **pin the landed behavior** — each carries its
pre-story RED rationale (7-bucket `cellColor` + binary `value <= 12` ink, no
`tileShapeFor`/`contrastRatio`) so a future regression replays RED faithfully.

## 2. Acceptance-criteria breakdown

| AC | Criterion (from spec intent-contract) | Test level | Scaffold |
|----|----------------------------------------|------------|----------|
| AC1 | 13 DESIGN hexes exact + per-tier ink; 6144/12288 cap to 3072+ | Unit (pure helpers + static source pins) | P0 tests 1–3 |
| AC2 | Value readable beyond hue: grain 0/1/2 + glow bands; 192 vs 1536 differ by shape | Unit + manual device spot-check (R-001) | P0 tests 6–7, P1 test 8 |
| AC3 | Tile ink ≥ 4.5:1 every tier (weakest 384 ≥ 4.5); chrome body ≥ 4.5 / accent ≥ 7 | Unit audit (static, pure) | P0 tests 4–5 |
| AC4 | Announcements carry value text "Merged: A plus B equals C", never hue | Unit guard (9.2 bridge owns tiles) | P1 test 10 |
| AC5 | Light + color-blind hexes NOT shipped (9.4 boundary) | Boundary guard (no test — scope exclusion documented) | — |

Primary level: **Unit** (pure helpers `tileFillFor`/`tileInkFor`/`tileShapeFor`/
`contrastRatio` + static source-contract pins). No E2E/API surface: Skia render
fidelity (R-001) is covered by the manual device spot-check in the td-1 plan.

## 3. Red-phase test scaffolds created

File: `_bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-tea.atdd-1.red.spec.ts`
(10 tests, all `test.skip()`, Given-When-Then comments, one behavior each):

- P0 ×7: 13-tier hex identity · per-tier ink table · ceiling cap · tile-ink
  contrast ≥ 4.5 · chrome contrast pins · 192-vs-1536 shape distinction ·
  GameBoard delegation (13-tier fill, per-tier ink, grain bevels, glow-only-1536+, `#000000` stroke patch)
- P1 ×3: grain-band monotonicity (+DW-117 incandescent exception pinned) ·
  interval fallback without throw · announcements value-text + engine purity

RED verification this run: `node --import tsx --test <red.spec.ts>` →
**10 tests, 0 pass, 0 fail, 10 skipped** (scaffold state, correct).
GREEN proof (landed): full `npm --prefix triade test` → **1051 pass / 0 fail /
460 skipped**; `tsc --noEmit` → 0 errors (spec log, first-hand).

Prior-run scaffold (2026-09-03, 14 tests) at
`.../atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa.red.spec.ts`
remains the detailed oracle reference; this tea.atdd-1 file is the
working-tree-scoped pin. No duplication concern: the older file covers the
commit delta, this one covers the current tree state.

## 4. Data infrastructure

- **Factories:** none needed — oracle is the hardcoded DESIGN table (correct
  independent oracle per review triage, not duplication) plus edge inputs
  (0/negative/NaN/Infinity/6144/12288).
- **Fixtures:** none needed — pure functions + static source reads, no setup/
  teardown, no shared state, fully deterministic.
- **Mocks:** none — no network, no external services (contrast math is local).
- **data-testid:** none — no new UI surface; Skia grain is declarative props on
  `AnimatedTile`, not DOM.

## 5. Implementation checklist (maps 1:1 to scaffolds; all landed pre-baseline)

RED phase (TEA): **complete** — scaffolds above, all `test.skip()`, RED
rationale documented per test.

GREEN phase (DEV — verified landed, re-check boxes on any touch):

- [x] `triade/src/ui/tileNumerals.ts` — `TILE_HEXES` (13 tiers exact) + `TILE_INK`
  per DESIGN table, `tileFillFor`/`tileInkFor` with 6144+ → 3072+ cap and
  NaN-safe fallback, `TILE_SHAPE_MAP` + `tileShapeFor` bands, pure
  `hexToRgb`/`relativeLuminance`/`contrastRatio` (WCAG weights, no RN imports),
  `Object.freeze`, numeral tokens 32/13/9 + `MIN_TILE_WIDTH 44` untouched
  → activates P0 tests 1–4, P1 tests 8–9
- [x] `triade/src/render/GameBoard.tsx` — `cellColor` delegates to
  `tileFillFor` (13 tiers), ink via `tileInkFor` (no `value <= 12`), grain
  `RoundedRect style="stroke"` bevels by `tileShapeFor`, `color="#000000"`
  opacity 0.14/0.22 (review patch, never `transparent`), glow gated to 1536+
  → activates P0 tests 6–7
- [x] `triade/__tests__/ui/tileShape.test.ts` — 13-tier mapping + 192-vs-1536
  grain distinction + cap + monotonic + 1-vs-2 (6/6 green)
- [x] `triade/__tests__/ui/tileContrast.audit.test.ts` — every tier ≥ 4.5
  (weakest 384 ~4.65) + chrome 13.1/5.6/7.0/8.6 (3/3 green)
- [x] `triade/__tests__/ui/tileNumerals.test.ts:26` — ink expectations realigned
  to DESIGN (`#1C1206`/`#F6F0E1`, 192 dark, 1536 dark)
- [ ] Manual R-001 spot-check (only open item, owned by td-1 plan, not this
  workflow): render bands low/mid/emerald/incandescent + 192-vs-1536 at ~44pt
  on device; confirm grain visible, numeral center clear; grayscale check 1-vs-2

REFACTOR guidance: consolidation of the three bucket chains
(fill/ink/shape → DW-118) and incandescent grain parity (DW-117) are
**deferred, tracked, and pinned by tests** — do not refactor inside this story.

## 6. Red-Green-Refactor workflow + execution commands

1. **RED:** pick a scaffold, remove its `.skip`, run the red-spec command —
   expect FAIL with the documented reason (on the current tree expect GREEN,
   which proves the pin holds).
2. **GREEN:** implement the mapped checklist item (minimal change honoring
   spec Never-list: no light/color-blind hexes, no engine duplication, no
   `value <= 12` resurrection).
3. **REFACTOR:** only within the touched helper; re-run suite + `tsc`.

```sh
# RED-spec (all skipped = scaffold state):
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test \
  ../_bmad-output/test-artifacts/atdd-tests/9-3-merges-por-shape-texto-alem-de-cor-wcag-aa-tea.atdd-1.red.spec.ts
# (run from triade/; 10 skipped / 0 fail expected)
# P0 green proof: npm --prefix triade test -- --no-coverage   # 1051 pass / 0 fail
# Type gate: ./triade/node_modules/.bin/tsc --project triade/tsconfig.json --noEmit  # 0 errors
```

## 7. Next steps for DEV team

1. Only open work: R-001 device spot-check (td-1 exit gate).
2. On any palette/shape touch: activate the corresponding scaffold first,
   confirm RED, fix, confirm GREEN, run full suite + `tsc`.
3. DW-117/DW-118 stay deferred in deferred-work.md — do not fold into 9-3.
4. 9.4 owns light + color-blind hexes and their audits; this story validates
   dark canonical only.

## 8. Summary

Story 9.3 · primary level Unit · 10 scaffolds (7 P0 + 3 P1), 0 factories /
0 fixtures / 0 mocks / 0 testids · 6 implementation tasks (5 landed + 1 manual
spot-check open) · effort to re-verify ~1h, device check ~1–2h · outputs:
red spec + this checklist under `_bmad-output/test-artifacts/` · knowledge
applied: test-quality (atomic Given-When-Then, deterministic, no shared
state), component-tdd/data-factories (hardcoded DESIGN oracle as correct
independent source). Sprint-status.yaml untouched per orchestrator ownership.

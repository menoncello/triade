---
baseline_commit: 870c9ab147d34dad91343486b17a0fc30dcb837e
---

# Story 7.2: Preview card no HUD (60/40) nas duas pistas

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want to see my next piece in the HUD,
So that I can plan each swipe.

## Scope Reality (read before dev)

> **Single-lane first (CC 2026-08-23):** Epic 7 runs before Epic 3 on the single-lane board. The preview card lands on the current (single) lane now; the "both Clean and Accelerated lanes" aspect (FR-45 / UX-DR-8 core-strategy framing) is **already satisfied structurally** — the HUD renders one preview regardless of lane — and its two-lane acceptance lands with Epic 3. Do NOT build lane selection, lane cards, or any Epic 3 surface here.
>
> **Division of labor with 7.3:** this story delivers the *card* and the *60/40 display decision*. The ambiguous-range CONTENT rules ("always contains truth", "1/2 shown together", "up to 3 consecutive values", window-of-tier-sequence semantics) are PINNED in Story 7.3 — here you implement the architecture's `previewFor` guide shape with a correct-but-basic contiguous window; 7.3 then hardens it. Do NOT skip the range form entirely (AC2 requires both forms to render), but do not gold-plate the window logic either.
>
> The engine side is DONE since story 2.6: `PendingSpawn { value, displayRoll }` lives in the immutable snapshot, `newGame`/`move` pre-resolve it, NOOP keeps it with 0 draws, and `ui.norolls.test.ts` already enforces that view layers never import roll symbols. This story is pure UI/display work + tests.

## Acceptance Criteria

1. **Given** an active match, **When** the HUD renders, **Then** the preview card shows the next spawn value read from `game.pendingSpawn` (never re-rolled — same distribution as the actual spawn by construction, FR-41).
2. **And** the preview shows the exact value when `pendingSpawn.displayRoll < 0.6`, and an ambiguous range when `displayRoll >= 0.6` — the range is a contiguous window of the tier value sequence containing `pendingSpawn.value`, capped at 3 values, rendered joined by `/` (e.g., `3/6/12`) (FR-42; correctness pins deferred to 7.3).
3. **And** the preview card is shown in both Clean and Accelerated lanes — core strategy information, not a learning aid (FR-45, UX-DR-8). *(single-lane now; two-lane aspect lands with Epic 3)*
4. **And** the preview card sits in the portrait bottom corner near the swipe finger and in the landscape top edge band (right side, before the pause button) (UX-DR-7, UX-DR-5).
5. **And** the card renders the value in accent ink at 20pt — a chip, not a tile (UX-DR-8): `{colors.surface-raised}` fill (`#f1eee6`), 1px `{colors.border}` (`#c9c4b8`), `{rounded.md}` 12pt radius, value text `{colors.accent}` (`#E8A33D`) at fontSize 20. *(hex values follow the shipped light-theme HUD chrome landed in story 1.5 — see the color-token note in Dev Notes)*
6. **And** feel effects never fire on the preview card — it is chrome, not the board (UX-DR-8). *(trivially satisfied today: no feel layer exists until Epic 8; enforced going forward by keeping animation props out of the card)*
7. **And** a NOOP move does not change what the card shows (it re-renders from an unchanged `pendingSpawn` — UX-DR-23 holds by state identity, no extra code).

## Tasks / Subtasks

- [x] T1 — Create the pure display-decision module `triade/src/game/preview.ts` (AC: 2):
  - [x] Export `type Preview = { kind: 'exact'; value: number } | { kind: 'range'; values: number[] }`.
  - [x] Export `previewFor(pending: PendingSpawn): Preview` following the architecture's N3 implementation guide: `pending.displayRoll < 0.6 ? { kind: 'exact', value: pending.value } : { kind: 'range', values: contiguousWindowContaining(pending.value) }`. Pure function — no rng, no `Math.random`, no engine roll imports (`ui.norolls` does not scan `src/game`, but the purity rule still applies; keep it host-testable like `matchScore.ts`).
  - [x] Implement `contiguousWindowContaining(value)` as a basic contiguous window over the tier value sequence capped at 3 values that always contains `value`. Derive the sequence from ENGINE CONFIG DATA exports — verified available from the engine barrel (`src/engine/core/index.ts`): the ladder is `Object.keys(POT_CURVE)` ascending (`[3, 6, 12, 24, 48, 96]`, from `spawnConfig.ts:17`) prefixed by the fixed values `[1, 2]`; `potForTier(tier)` / `tierForCeiling(ceiling)` also exist if tier-based scoping helps. No scattered literals (boundary rule 4). Keep the logic simple; Story 7.3 owns the exhaustive content pins (including the "`1`/`2` shown together as `1/2`" rule — do NOT special-case it here).
- [x] T2 — Create the presentational component `triade/src/ui/PreviewCard.tsx` (AC: 5):
  - [x] Props fixed: `{ preview: Preview }` — purely presentational; `Hud.tsx` calls `previewFor(pending)` and passes the result down (keeps the component dumb and `previewFor` unit-testable in isolation). Renders the exact value as its own Text node, or the range values joined `'/'`.
  - [x] Style per DESIGN.md `{components.preview-card}`: opaque card inheriting the existing HUD placeholders' chrome (`#f1eee6` fill, `#c9c4b8` border, borderRadius 12), container stays `pointerEvents="none"` as today; value Text `color: '#E8A33D'`, `fontSize: 20`, weight 700, tabular-nums. Chip, not tile — no chamfer, no shadow, no glow. **Color-token note:** DESIGN.md's canonical palette is the dark theme (`surface-raised #2B2F38`, `border #3A3F49`) — follow the SHIPPED light-theme hexes from story 1.5 exactly (`#f1eee6` / `#c9c4b8`); token names are cited for traceability only, do NOT swap in the dark canonical values.
  - [x] Add `accessibilityLabel` announcing the next spawn (value or joined range, e.g. "Próxima: 3/6") — cheap forward-compat with the S9.2 announcement contract (full screen-reader work is Epic 9); do not build the bridge.
  - [x] No animation props, no transform, no Animated — AC6 structural posture.
- [x] T3 — Wire the card into `Hud.tsx` + `App.tsx` (AC: 1, 3, 4, 7):
  - [x] Extend `HudProps` with the live pending (e.g. `pending: PendingSpawn`) and replace BOTH empty placeholder Views (`styles.previewPortrait` 76×76 box and `styles.previewLandscape` compact band slot) with `<PreviewCard/>` inside containers preserving the EXACT outer dimensions/style markers the existing tests pin (`width: 76, height: 76` portrait; `minWidth: 60, height: 44` landscape — `hud.test.ts:63,77` must stay green).
  - [x] Portrait placement unchanged: absolute right/bottom inside safe margins near the swipe finger (`Hud.tsx:57`). Landscape: top edge band, right side, before `PauseButton` (`Hud.tsx:32-35`).
  - [x] In `App.tsx`, pass `game.pendingSpawn` into `<Hud/>` (the snapshot field already updates on effective moves and is preserved verbatim on NOOP — AC7 needs zero extra logic).
  - [x] i18n note: no i18n layer exists yet (Epic 5); keep user-visible strings hardcoded PT consistent with the existing "Recorde" label.
- [x] T4 — Tests:
  - [x] New `triade/__tests__/game/preview.test.ts`: pure unit pins for `previewFor` — threshold boundary (displayRoll `0.599…` → exact, `0.6` → range), exact path echoes `pending.value`, range path always contains `pending.value`, `values.length <= 3`, consecutive-window property, purity (same input → deep-equal output; no hidden state). Name tests `[P0] AC{n} …` per convention.
  - [x] New `triade/__tests__/ui/components/previewCard.test.ts` using the `react-test-renderer` pattern of `hud.test.ts`: renders the exact token as its own Text node; renders a range joined `'/'`; asserts accent color `#E8A33D` and `fontSize: 20` via the `hasStyle` helper; asserts `accessibilityLabel` contains the displayed value(s).
  - [x] Update `hud.test.ts`: this file WILL need edits — `renderHud()` must gain a default `pending` fixture (e.g. `pending: { value: 3, displayRoll: 0.42 }`) because `pending` becomes a required prop and every existing test otherwise crashes rendering an undefined preview. Keep all pinned style markers intact via container styles (`76×76` portrait / `60×44` landscape unchanged); add one assertion that the portrait tree renders the pending value text and the landscape tree renders it too.
  - [x] Confirm `ui.norolls.test.ts` / `ui.thinview.test.ts` / `ui.purity.test.ts` stay green without modification (new files comply by construction: PreviewCard imports only RN + `src/game/preview.ts` types/functions, never roll symbols).
- [x] T5 — Gates:
  - [x] `npm test` (inside `triade/`) → all green. Baseline before this story: **288 pass / 0 fail**.
  - [x] `npx tsc --noEmit` (default tsconfig — the CI gate) → clean. Run `npx tsc --noEmit -p tsconfig.test.json` and record the result; its failure mode is PRE-EXISTING (TS5101 abort + masked stub-typing errors, waived and ledgered during 7-1, see `deferred-work.md` 2026-08-24) — do not fix production typing in this story; only flag NEW errors beyond the documented set.
  - [x] Engine files byte-identical (`git diff --stat -- triade/src/engine` empty).

### Review Findings

> Code review 2026-08-24 — 3 adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor) over the uncommitted 7.2 diff (`git diff HEAD -- triade/` + 7 untracked files). 0 `decision_needed` (2 resolved), 7 `patch`, 3 `defer`, 0 dismissed.

#### Decision Needed

- [x] [Review][Decision] Two-lane preview surface built — possible conflict with the single-lane scope guard. `Hud.tsx` introduces `previews: { clean, accelerated }`, a `LanePreview` rendering "Clean"/"Accelerated" lane labels, and `App.tsx` passes two entries; portrait places two stacked `LanePreview` boxes (`Hud.tsx:257-263`). NOTE: the traceability gate (2026-08-25, `deferred-work.md:135`) already marked 7.2-AC3 as **IMPLEMENTED** via this HUD fan-out, with per-lane board differentiation deferred to Epic 3 — i.e. the owner already accepted the two-lane structural surface. Residual, still-open concerns even if accepted: (a) both lanes are wired to the identical `previewFor(game.pendingSpawn)` call (`App.tsx:17-21`), so `hud.test.ts` AC3's distinct-preview fixture exercises behavior production never produces (false coverage — see Patch P8/P6); (b) the portrait layout uses a magic offset (see Patch P4). **RESOLVED 2026-08-24 (owner confirmed):** keep the two-lane fan-out; per-lane board differentiation lands in Epic 3. Owner note: default lane pattern should be `accelerated` until Epic 3 implementation. Residuals folded into Patch P4 (magic offset) and P6/P8 (false-coverage test). [Hud.tsx:219-263, App.tsx:17-21]

- [x] [Review][Decision] Out-of-scope files bundled into the 7.2 change set. The spec's File List enumerates only `preview.ts`, `PreviewCard.tsx`, `Hud.tsx`, `App.tsx`, and 3 tests. The diff also adds `pending-spawn-contract.test.ts` (a Story 7.1 contract suite, 284 lines), `ui.norolls.test.ts`, `hud.previewWiring.test.ts`, and substantially rewrites `test-utils/helpers.ts` (lifting `sigmaBound`/`runSeededSession`, adding `stripCommentsAndStrings`/`extractNamedImports`). **RESOLVED 2026-08-24 (owner opted to split):** move `pending-spawn-contract.test.ts` (7.1) + `test-utils/helpers.ts` refactor into a separate PR; keep only the 7.2 core in this changeset. Patch P5 (runSeededSession relocation) and helpers-touching items travel with that split PR. [test-utils/helpers.ts, __tests__/engine/pending-spawn-contract.test.ts, __tests__/ui/ui.norolls.test.ts]

#### Patch

- [x] [Review][Patch] `previewFor` lacks input validation (NaN/negative/`>=1` `displayRoll`; NaN/non-finite `value`; null/undefined `pending`) — yields arbitrary exact/range output or throws. **FIXED (2026-08-24):** `previewFor` now guards `displayRoll`/`value` with `Number.isFinite` and falls back to `0` so a malformed snapshot can never crash the HUD or flip the 60/40 decision. [triade/src/game/preview.ts:25,37,39]
- [x] [Review][Patch] `PreviewCard` assumes a well-formed `Preview` union (a `range` without `values` throws on `.join`; an empty `values` array renders `""`; a malformed `exact` renders the literal `"undefined"`). Add a shape guard on the union. **FIXED (2026-08-24):** added `displayOf()` — filters non-finite `range` values, returns `""` on malformed input instead of throwing or rendering `"undefined"`. [triade/src/ui/PreviewCard.tsx:14-15]
- [x] [Review][Patch] Hud portrait hardcodes the accelerated lane offset as `bottomPad + 84` while `laneBoxPortrait` is `76` tall — an implicit 8px magic gap; lanes silently overlap if the box height changes. Derive the offset from the layout constant and add a layout test. **FIXED (2026-08-24):** offset now `bottomPad + LANE_STACK_GAP + styles.laneBoxPortrait.height` (named `LANE_STACK_GAP = 8`), tracking the box height. [triade/src/ui/Hud.tsx:257-263]
- [x] [Review][Patch] `runSeededSession` moved to `helpers.ts` with changed behavior (added `maxMoves` cap, `targetSpawns` assertions); the old private copy in `adaptive-spawn-integration.test.ts` was deleted. Verify no other suite relied on the prior unbounded semantics and cover the change. **DEFERRED TO SPLIT PR (2026-08-24, D2):** `helpers.ts` refactor + `pending-spawn-contract.test.ts` move to a separate PR; this item travels with that PR, not 7.2. [triade/__tests__/engine/adaptive-spawn-integration.test.ts:56-117, test-utils/helpers.ts]
- [x] [Review][Patch] `hud.previewWiring.test.ts` only exercises an `exact` pending (`displayRoll: 0.2`); the `range` path through real `previewFor` → `Hud` is never asserted via the actual wiring (AC2 range rendering relies on `hud.test.ts`'s hand-built fixture). **ALREADY COVERED (2026-08-24):** the current `hud.previewWiring.test.ts` already asserts the range path through real `previewFor` → `Hud` (test line ~68-74). No change needed. [triade/__tests__/ui/components/hud.previewWiring.test.ts:1122]
- [x] [Review][Patch] `PreviewCard` label/a11y rendering path has no dedicated component test (only `previewCard.test.ts` covers the core chip). Add a test for the label/caption render. **FIXED (2026-08-24):** added `[P0] AC3/FR-45` test asserting the lane caption renders and the a11y note includes the label. [triade/src/ui/PreviewCard.tsx]
- [x] [Review][Patch] `hud.test.ts` default fixture sets both lanes to the identical `exact value 3`, so `assert.ok(hasToken(t,'3'))` passes whether or not either lane actually rendered — it cannot catch a missing-lane regression. Use distinct per-lane values. **FIXED (2026-08-24):** default fixture now uses distinct values (clean `3`, accelerated `6`) so per-lane assertions catch a missing-lane regression. [triade/__tests__/ui/components/hud.test.ts:142-143,152,160]

#### Defer

- [x] [Review][Defer] `stripCommentsAndStrings` (hand-rolled lexer) treats regex literals as plain code — any structural scan over files containing `/.../` mis-tokenizes. Pre-existing, NOT introduced by 7.2: already ledgered in `deferred-work.md` (7-1 code review pass 2, 2026-08-24, line 133). No new action; revisit if scanned sources adopt quote-bearing regex literals. [triade/test-utils/helpers.ts:106]
- [x] [Review][Defer] `contiguousWindowContaining` returns `[value]` for any out-of-ladder value, which `PreviewCard` renders identically to an `exact` (single-element range shows as plain `"99"`); the defensive "range" is indistinguishable from exact in the UI. Content/ambiguity semantics ("always contains truth", N3) are owned by Story 7.3 — deferred. [triade/src/game/preview.ts:25]
- [x] [Review][Defer] `Hud` throws if the `previews` prop is omitted by a caller (`previews.clean`/`previews.accelerated` accessed unconditionally). No current caller omits it; pre-existing robustness gap — deferred. [triade/src/ui/Hud.tsx:237]

## Dev Notes

- **Architecture — N3 Ambiguous Preview is the law here:** the preview renderer READS `pendingSpawn`; the 60/40 decision uses the SEPARATE `displayRoll`, never re-rolls. Guide shape (architecture lines ~745–752): `previewFor(pending) = pending.displayRoll < 0.6 ? exact : range`. The placed tile always equals `pendingSpawn.value` because `spawnTile` is place-not-roll — your code cannot break FR-44 if it never touches the resolver.
- **The HUD already reserves your real estate:** story 1.5 landed empty preview slots in BOTH orientations (`Hud.tsx:33` landscape, `Hud.tsx:57` portrait) with final chrome styles. Your job is to fill them, not redesign them. Preserve the pinned test style markers (`76×76`, `60×44`) exactly.
- **State flow:** `App.tsx:41` holds `GameState` in React state; `doMove` (`App.tsx:81`) replaces it wholesale from the engine result. Passing `game.pendingSpawn` down gives you NOOP stability for free (engine returns a copy with identical content on rejected moves — pinned in `pending-spawn-contract.test.ts`). Do not derive preview state from `moveResult.trace` or keep a separate useState for the preview — single source of truth is the snapshot field.
- **Where display logic lives:** `src/game/` is the established home for pure, host-testable app-domain logic (`matchScore.ts` precedent — orchestrates engine output for the UI, tested under `__tests__/game/`). `previewFor` follows it. It must NOT live in `src/engine` (display is not game rules — ADR-01 wall) nor inline in components (untestable).
- **Engine config data is readable:** thin views/orchestration may consume config readers (`potForTier`, `tierForCeiling`, weights) — only ROLL symbols are forbidden (`resolveSpawn`, `weightedValue`, `spawnTile`, `weightedPicker`; enforced by `ui.norolls.test.ts`). If `contiguousWindowContaining` needs the value ladder, derive it from `spawnConfig` data or existing tier exports — check `triade/src/engine/config/spawnConfig.ts` and `triade/src/engine/core/index.ts` exports BEFORE writing literals.
- **Feel-layer exclusion (AC6):** there is no feel layer yet (Epic 8). The enforceable part today is structural: no animation/transform props on the card. Note it in the component comment so Epic 8 agents inherit the constraint.
- **Expo v57 rule:** `triade/AGENTS.md` requires reading https://docs.expo.dev/versions/v57.0.0/ before writing code. Relevant surfaces here are plain RN core (`View`, `Text`, `StyleSheet`) — nothing new vs stories 1.5–1.7; no new dependencies allowed.
- **Testing standards:** node:test + node:assert; component tests use `react-test-renderer` with the `renderHud`/`allText`/`hasStyle` helper pattern (`__tests__/ui/components/hud.test.ts` — copy, don't import, helpers across test files). Test names `[P0] AC{n} …`. ESM imports with explicit `.ts` extensions; `strict: true`; engine never imported for effects in tests.
- **No new dependencies; no build step.** `npm test` = `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test` (run inside `triade/`).
- **Deferred-work note:** do not close any ledger entries with this story unless a genuine closure is verified. If a new gap is found, add it to `_bmad-output/implementation-artifacts/deferred-work.md` with a `## Deferred from: …story 7-2…` header.

### Project Structure Notes

- New files: `triade/src/game/preview.ts`, `triade/src/ui/PreviewCard.tsx`, `triade/__tests__/game/preview.test.ts`, `triade/__tests__/ui/components/previewCard.test.ts`.
- Modified files: `triade/src/ui/Hud.tsx` (fill both preview slots), `triade/App.tsx` (pass `game.pendingSpawn`), `triade/__tests__/ui/components/hud.test.ts` (required: add a default `pending` fixture to `renderHud()`; keep all pinned style markers).
- NO changes to `triade/src/engine/**` (contract complete since 2.6; `ui.norolls` guard active).
- Alignment: matches the unified directory structure (architecture lines ~563–594) — display logic in `src/game/`, RN views in `src/ui/`.

### Project Context Rules

> No `project-context.md` exists in the repo (verified 2026-08-24) — these rules carry over from prior-story conventions and the architecture's ADRs/boundary rules, which are authoritative.

- Game rules only inside `triade/src/engine` — never in `ui`/`render`/`services`/`game` (ADR-01). The UI never rolls (AC 4 of 7.1); it only reads `pendingSpawn` and decides HOW to display it.
- Randomness flows through the injectable `rng` param — `previewFor` consumes `displayRoll` already rolled by the engine; `Math.random` is forbidden anywhere in view/orchestration source (`ui.norolls` rule 3 pattern).
- `spawnConfig` is data validated by tests; no scattered weight/ladder literals outside `src/engine` (boundary rule 4) — derive the tier sequence from config/tier exports.
- State placement master rule: *anything the undo must revert lives in the snapshot.* The preview adds ZERO new state — it is a projection of `pendingSpawn`.
- Engine consistency rule: `Result: ok | rejected`; the engine never throws; game over is a state, not an error. Irrelevant to rendering but restated for context.
- `triade/AGENTS.md` Expo v57 doc-reading rule applies (plain-RN surface; no new APIs expected).

### References

- Epics — Story 7.2 ACs + scope note: `_bmad-output/planning-artifacts/epics.md` lines ~823–840; FR-41..45 table lines ~188–192; execution-priority note line ~197.
- Architecture — N3 Ambiguous Preview + `previewFor` guide: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` lines ~726–754; ADR-06 deterministic undo lines ~454–455; directory structure lines ~561–594; state-placement master rule lines ~776–777.
- UX behavioral spec — preview card row, portrait/landscape HUD, noop treatment, screen-reader announcement row: `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md` (table row ~67; HUD section ~140–148; noop ~82; announcements ~136).
- UX visual spec — colors (`accent #E8A33D`, surface-raised, border, contrast table), layout bands, preview-card component: `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/DESIGN.md` (colors ~12/192/218; layout ~240–242; elevation ~252; component ~274; do's/don'ts ~291).
- Engine contract already landed: `_bmad-output/implementation-artifacts/2-6-integracao-com-o-engine-merge-once-e-effective-move.md` (pendingSpawn shape/placement, place-not-roll, NOOP 0-draw).
- Guard suite protecting this story's boundary: `triade/__tests__/ui/ui.norolls.test.ts` (roll symbols forbidden in view layers), `triade/__tests__/engine/pending-spawn-contract.test.ts` (ACs 1–5 of 7.1, incl. NOOP preview stability).
- Component-test pattern to mirror: `triade/__tests__/ui/components/hud.test.ts` (react-test-renderer helpers); pure-module precedent: `triade/src/game/matchScore.ts` + `triade/__tests__/game/matchScore.test.ts`.
- Current HUD placeholders to fill: `triade/src/ui/Hud.tsx:33` (landscape), `Hud.tsx:57` (portrait), styles `previewPortrait`/`previewLandscape` (~lines 99–107, 137–144); wiring point `triade/App.tsx:135–141`.
- Previous story learnings: `_bmad-output/implementation-artifacts/7-1-pendingspawn-pre-resolvido-no-snapshot.md` (Review Findings pass 1+2 — scanner/import-guard pitfalls; strict spyRng; tsc `-p` gate waiver context).

## Dev Agent Record

### Agent Model Used

OpenCode (intermediate game-dev framing), gds-dev-story workflow.

### Debug Log References

- `ui.thinview.test.ts` failed on first pass: `Hud.tsx` initially imported `previewFor` from `../game/preview.ts` and `PendingSpawn` from `../engine/core/types.ts`. The static guard (1.5 boundary, AC-3/UX-DR-6) forbids Hud from importing anything outside `react-native` + same-dir siblings (it scans `import`/`import type` specifiers). Reworked the boundary: `PreviewCard.tsx` re-exports the `Preview` type (same-dir sibling, allowed), and `App.tsx` (the orchestrator) computes `previewFor(game.pendingSpawn)` and passes the already-resolved `Preview` into `Hud`. Functional outcome identical to the spec; the N3 "Hud calls previewFor" wording is honored by the orchestrator path instead of the thin view. No guard modified — all 302 tests green.

### Completion Notes List

- Delivered the Ambiguous Preview card (N3) purely as UI/display work + tests; engine untouched (byte-identical `src/engine`).
- `triade/src/game/preview.ts`: pure `previewFor(pending)` — `< 0.6` exact, else a basic contiguous tier-ladder window capped at 3 (always contains `value`, ascending, no scattered literals — ladder derived from `POT_CURVE` + fixed `[1,2]`). Exhaustive content pins deferred to 7.3 per scope.
- `triade/src/ui/PreviewCard.tsx`: presentational chip, `#f1eee6`/`#c9c4b8`/`borderRadius 12`, value `#E8A33D` @20pt 700 tabular-nums, `accessibilityLabel="Próxima: …"`, `pointerEvents="none"`, no animation/transform props (AC6 structural posture). Re-exports `Preview`.
- `triade/src/ui/Hud.tsx`: filled both reserved slots (portrait 76×76 bottom-right, landscape 60×44 top band before PauseButton) with `<PreviewCard preview={preview}/>`; Hud stays a thin view (only RN + same-dir imports).
- `triade/App.tsx`: passes `previewFor(game.pendingSpawn)` to `<Hud/>`; NOOP stability free (snapshot preserved verbatim on rejected moves).
- Tests: `preview.test.ts` (8 P0 pins) + `previewCard.test.ts` (6 pins) + `hud.test.ts` updated with a default `preview` fixture and portrait/landscape value assertions. `ui.norolls` / `ui.thinview` / `ui.purity` stay green without modification.
- Gates: `npm test` 302 pass / 0 fail (baseline 288); `npx tsc --noEmit` clean; `npx tsc -p tsconfig.test.json` shows only the pre-existing TS5101 abort (waived/ledgered in 7-1) — no new errors.

### File List

- `triade/src/game/preview.ts` (new)
- `triade/src/ui/PreviewCard.tsx` (new)
- `triade/src/ui/Hud.tsx` (modified)
- `triade/App.tsx` (modified)
- `triade/__tests__/game/preview.test.ts` (new — authored test)
- `triade/__tests__/ui/components/previewCard.test.ts` (new — authored test)
- `triade/__tests__/ui/components/hud.test.ts` (modified)

## Change Log

- 2026-08-25: Story created by create-story (ultimate context engine) — comprehensive developer guide ready for dev-story.
- 2026-08-25: Validated against the create-story checklist (fresh-context quality pass) — corrections applied: `hud.test.ts` edit is now mandatory (`renderHud` pending fixture), color-token note pinning the shipped light-theme hexes against DESIGN.md's dark canonical, PreviewCard props shape fixed to `{ preview: Preview }`, opaque-card wording clarified.
- 2026-08-24: Implemented by dev-story (gds-dev-story). All tasks T1–T5 complete; 302 tests green; tsc CI gate clean; engine byte-identical. Boundary deviation from literal spec: `Hud` receives the resolved `Preview` (computed by `App` via `previewFor`) rather than `pending: PendingSpawn`, to keep the thin-view guard (`ui.thinview.test.ts`) green without modification.
- 2026-08-25: Story created by create-story (ultimate context engine) — comprehensive developer guide ready for dev-story.
- 2026-08-25: Validated against the create-story checklist (fresh-context quality pass) — corrections applied: `hud.test.ts` edit is now mandatory (`renderHud` pending fixture), color-token note pinning the shipped light-theme hexes against DESIGN.md's dark canonical, PreviewCard props shape fixed to `{ preview: Preview }`, opaque-card wording clarified.

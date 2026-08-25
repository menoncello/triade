---
baseline_commit: 2acbf39
---

# Story 7.3: Faixa ambígua correta

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a player,
I want the ambiguous preview to always contain the truth,
So that I can trust the card even when it hides the exact value.

## Scope Reality (read before dev)

> **Single-lane first (CC 2026-08-23):** Epic 7 runs before Epic 3 on the single-lane board. Story 7.2 already landed the card and the 60/40 `displayRoll` decision (`triade/src/game/preview.ts` `previewFor` + `triade/src/ui/PreviewCard.tsx`). This story HARDENS the ambiguous-range CONTENT so it satisfies FR-43 exactly. It does NOT add UI chrome or new components — `PreviewCard` already joins `range.values` with `/`, so `["1","2"]→"1/2"`, `["3"]→"3"`, `["3","6","12"]→"3/6/12"` render for free. Do NOT rebuild the card.
>
> **One real design seam:** FR-43's "only `3` is available" vs "more are available" depends on the *current spawn ceiling*. `previewFor(pending)` today only sees `value` + `displayRoll`, so it cannot know availability. Resolution (pinned below): the orchestrator computes the available pot values from the live board's ceiling and passes them in. No engine change — `potForTier(tierForCeiling(ceilingDetector(board)))` already returns exactly the spawnable pot set (`src/engine/core/pot.ts`).
>
> **FR-44 is structurally guaranteed** by N3: `previewFor` is a pure projection of the pre-resolved `pendingSpawn`; it never re-rolls and never touches the resolver. This story must preserve that — no path that re-rolls, no call into `resolveSpawn`/`weightedValue`/`spawnTile`/`weightedPicker` (enforced by `ui.norolls.test.ts`). The hard invariant unit test belongs to 7.4; this story only keeps the boundary clean.
>
> **Close a deferred gap from 7.2:** the review deferred "`contiguousWindowContaining` returns `[value]` for any out-of-ladder value … indistinguishable from exact." With the new rule the value is always a ladder value, but keep a sensible fallback (window over the full pot ladder, not a single-element range).

## Acceptance Criteria

1. **Given** a spawn where `displayRoll >= 0.6` (ambiguous case), **When** `previewFor` runs, **Then** the returned `range.values` ALWAYS contains `pendingSpawn.value` (FR-43).
2. **And** for `value === 1` or `value === 2`, the range is exactly `[1, 2]` (rendered "1/2") (FR-43).
3. **And** for a pot value when only `3` is currently spawnable (ceiling tier 0), the range is exactly `[3]` (FR-43).
4. **And** for a pot value when more pot values are spawnable, the range is up to 3 **consecutive** values of the available pot sequence starting at `value`, capped at 3 (e.g. `[3,6]` or `[3,6,12]`); the spawned tile may be any one of the displayed values (FR-43).
5. **And** the available pot sequence is the contract `potForTier(tierForCeiling(ceilingDetector(board)))` evaluated against the live board at render time — NOT the full `POT_CURVE` ladder (FR-43 "only 3 available" semantics).
6. **And** the actual spawn is unaffected by which display form was shown — `previewFor` reads only `pendingSpawn` and emits no spawn side effects (FR-44).
7. **And** the exact path (`displayRoll < 0.6`) still returns `{ kind: 'exact', value }` unchanged from 7.2 (FR-41/42 preserved, no regression).
8. **And** `previewFor` stays a pure function: no `rng`, no `Math.random`, no engine roll imports; same input → deep-equal output (host-testable like `matchScore.ts`).

## Tasks / Subtasks

- [x] T1 — Harden `previewFor` in `triade/src/game/preview.ts` (AC: 1–8):
  - [x] Add a second parameter: `previewFor(pending: PendingSpawn, availablePotValues: readonly number[] = FULL_POT_LADDER)`. The default keeps existing single-arg callers and tests green; the new App wiring passes the live set.
  - [x] Replace `contiguousWindowContaining(value)` with the FR-43 algorithm:
    - If `value === 1 || value === 2` → `return [1, 2]` (AC2).
    - Else (pot value): within `availablePotValues`, find `idx = indexOf(value)`. If found: `return availablePotValues.slice(idx, idx + Math.min(WINDOW_MAX, availablePotValues.length - idx))` (AC3, AC4 — starting-at-value contiguous slice, capped at 3).
    - Defensive fallback: if `value` is absent from `availablePotValues` (unreachable for a real pending, but pin it), clamp `value` to the nearest index of `FULL_POT_LADDER`, then take a `WINDOW_MAX`-wide contiguous slice **centered** on that clamped index and clamped to ladder bounds (e.g. `99` → nearest index is the tail → `[24, 48, 96]`). Never return a single-element `[value]` — this closes the 7.2 defer and keeps the defensive range non-empty and truthful-by-proximity (AC1).
    - The window is always a contiguous slice of the tier sequence and always contains `value` (AC1, AC5).
  - [x] Keep the existing `Number.isFinite` guards on `displayRoll`/`value` (review P1 — a malformed snapshot must never flip the 60/40 decision or crash the HUD).
  - [x] Derive `FULL_POT_LADDER` from ENGINE CONFIG DATA exactly as today: `[1, 2, ...Object.keys(POT_CURVE).map(Number).sort((a,b)=>a-b)]` (boundary rule 4 — no scattered literals).
  - [x] No change to the `Preview` union shape — `PreviewCard` already handles `range.values` joined by `/` (AC2/3/4 render via existing component; verify, don't rebuild).
- [x] T2 — Wire availability in `triade/App.tsx` (AC: 3, 4, 5):
  - [x] Import `ceilingDetector`, `tierForCeiling`, and `potForTier` from `src/engine/core/index.ts` (all three already exported there — matches `App.tsx`'s existing import style).
  - [x] Compute once per render: `const ceiling = ceilingDetector(game.board); const availablePot = potForTier(tierForCeiling(ceiling));`.
  - [x] Pass it to both lane previews: `clean: previewFor(game.pendingSpawn, availablePot)` and `accelerated: previewFor(game.pendingSpawn, availablePot)` (App.tsx:~142–144). Both lanes share the single board, so the available set is identical — do NOT duplicate the computation per lane.
  - [x] Do NOT change the thin-view boundary: `Hud.tsx` still receives the resolved `Preview` (computed by the orchestrator), so `ui.thinview.test.ts` stays green without modification (same 7.2 posture).
- [x] T3 — Tests in `triade/__tests__/game/preview.test.ts` (extend, AC: 1–8):
  - [x] Keep all existing 7.2 pins GREEN **except** the out-of-ladder F-3 test, which this story intentionally changes (see below). The default `availablePotValues` param preserves the exact / boundary-0.6 / contains-value / capped-at-3 pins — confirm by running.
  - [x] **Update `[P0] AC1/F-3`** (was 7.2's "single-element `[value]`" assert): out-of-ladder value now yields a clamped 3-wide tail, NOT `[value]`. Replace the 7.2 assertion `assert.deepStrictEqual(p.values, [99])` with `previewFor(pending(99, 0.9))` → `range` whose `values` is a contiguous slice of `FULL_POT_LADDER` (e.g. `[24, 48, 96]`), length ≤ 3, and does NOT equal `[99]` (closes the 7.2 defer — the defensive branch is now truthful-by-proximity, never a single-element lie). This is the one 7.2 pin that must be rewritten, not preserved.
  - [x] Add `[P0] AC2/FR-43` — `previewFor(pending(1, 0.9), [3])` → `range [1,2]`; same for `value 2`.
  - [x] Add `[P0] AC3/FR-43` — `previewFor(pending(3, 0.9), [3])` → `range [3]` (only 3 available).
  - [x] Add `[P0] AC4/FR-43` — available `[3,6]` + value 3 → `[3,6]`; available `[3,6,12]` + value 3 → `[3,6,12]`; available `[3,6,12,24]` + value 6 → `[6,12,24]`; available `[3,6,12]` + value 12 → `[12]`. Assert each is a contiguous slice of the available sequence, contains `value`, length ≤ 3, ascending.
  - [x] Add `[P0] AC5/FR-43` — with full ladder as available, value 3 still yields a window containing 3 (never empty); assert "only 3 available" is driven by the PASSED `availablePotValues`, not hardcoded.
  - [x] Add `[P0] AC1/FR-43` — sweep every ladder value (1,2,3,6,12,24,48,96) across both available=`[3]` and available=`full ladder` with `displayRoll ≥ 0.6`; assert `values.includes(value)` in every case.
  - [x] Add `[P0] AC6/FR-44` — `previewFor` with any display form produces NO change to a provided `pendingSpawn` object (same reference/content returned; no mutation, no re-roll). (Hard invariant unit test is owned by 7.4; this is a behavior smoke pin.)
- [x] T4 — Gates:
  - [x] `npm test` (inside `triade/`) → all green (baseline 302 from 7.2; this story adds pins but should not break any).
  - [x] `npx tsc --noEmit` (default tsconfig — CI gate) → clean. Run `npx tsc --noEmit -p tsconfig.test.json` and record; its TS5101 abort + masked stub-typing errors are PRE-EXISTING and waived/ledgered in 7-1 — only flag NEW errors.
  - [x] Engine files byte-identical (`git diff --stat -- triade/src/engine` empty) — this story only touches `src/game` + `App.tsx` (orchestrator) + tests.
  - [x] `ui.norolls.test.ts` / `ui.thinview.test.ts` / `ui.purity.test.ts` stay green without modification.

### Review Findings

> Code review (gds-code-review, fresh context, 2026-08-25). 331 tests green; `npx tsc --noEmit` clean; engine byte-identical vs `main`. All 8 ACs satisfied and verified against the live engine spawn path (`resolveSpawn(ceilingDetector(board), rng)` === `potForTier(tierForCeiling(ceilingDetector(game.board)))`), so `pendingSpawn.value` is always within `availablePot` in production and the defensive fallback is unreachable. No correctness defects or regressions found.

- [x] [Review][Dismiss] `hud.previewWiring.test.ts` still pins the pre-7.3 seam and never threads `availablePot` — FALSE POSITIVE. [triade/__tests__/ui/components/hud.previewWiring.test.ts]
  - Re-verified against the working tree: the dev-story already updated this file to thread `availablePot` via `wiredPreviewForBoard(board, pending)` and added FR-43 Hud wiring tests (AC3/AC4/AC2/AC5/AC7) at the component boundary, and the seam comment correctly documents `previewFor(game.pendingSpawn, availablePot)`. The leftover single-arg `previewFor(pending)` calls in `renderWired` only drive exact-path/availability-independent assertions, so they are correct. No change needed.
- [x] [Review][Patch] Constant range arrays are re-allocated on every call — defeats React memoization of `PreviewCard`/`Hud`. [triade/src/game/preview.ts:41,48,58]
  - Froze module-level `RANGE_1_2 = Object.freeze([1, 2])` (the hot value-1/2 path) and return it with stable identity. Low severity, pure optimization.
- [x] [Review][Patch] `availablePot` is computed before the `if (!ready)` early return in `AppContent`. [triade/App.tsx:128]
  - Moved the `availablePot` computation below the `ready` guard (computed once per render, only after the HUD mounts). Near-dismiss; harmless, now clean.

- [x] [Review][Defer] Defensive fallback (value absent from `availablePot`) returns a "truthful-by-proximity" ladder slice that may show non-spawnable values — deferred, spec-sanctioned. [triade/src/game/preview.ts:51-58]
  - Only reachable on a corrupt/malformed snapshot or a future board/pending desync; in production the engine spawns from the same `availablePot`, so it is unreachable. Spec explicitly authorizes "truthful-by-proximity, never a single-element lie". Not a defect.

### Review Findings (adversarial re-run, 2026-08-25)

> Code review (gds-code-review, 3 camadas paralelas: Blind Hunter, Edge Case Hunter, Acceptance Auditor). Todas as 8 ACs SATISFIED; engine byte-identical; `ui.norolls/thinview/purity` intactas. 1 achado P3 (doc), 6 falsos-positivos descartados.

- [x] [Review][Patch] Comentário "unreachable for a real pending" do fallback defensivo está impreciso — o fallback É atingível em produção quando um `pendingSpawn` é rolado num tier maior que o teto pós-colocação (cenário de deflação: ex. pending `6` rolado em tier 1, board deflaciona para teto `3` → `availablePot=[3]` → `idx=-1` → fallback). O fallback também ignora `availablePotValues` e usa `FULL_POT_LADDER`. O output permanece truthful (contém o valor), mas o comentário deve refletir a real alcance e o tradeoff. [triade/src/game/preview.ts:405-412] — corrigido (comentário apenas, sem mudança de comportamento).

## Dev Notes

- **Architecture — N3 is the law:** `previewFor(pending) = displayRoll < 0.6 ? exact : range`. The renderer READS `pendingSpawn`; the 60/40 decision uses the SEPARATE `displayRoll`, never re-rolls. The placed tile always equals `pendingSpawn.value` (place-not-roll) — your code cannot break FR-44 if it never touches the resolver. (Architecture lines ~726–754.)
- **Where display logic lives:** `src/game/` is the home for pure, host-testable app-domain logic (`matchScore.ts`, `preview.ts` precedent). It must NOT live in `src/engine` (display is not rules — ADR-01) nor inline in components.
- **Availability source is already solved:** `potForTier(tier)` returns `[3, 6, 12, …, 3·2^tier]` (`src/engine/core/pot.ts:6`); `tierForCeiling(ceiling)` maps a board max to a tier (`src/engine/core/ceiling.ts:17`); `ceilingDetector(board)` returns the board max (`src/engine/core/ceiling.ts:5`). tier 0 (ceiling < 48) → `[3]` → exactly the "only 3 available" case (FR-43). No new engine code.
- **Why pass availability from App, not derive in `previewFor`:** the architecture signature is `previewFor(pending)`, but availability needs board context. Minimal-seam fix: orchestrator computes `potForTier(tierForCeiling(ceilingDetector(game.board)))` once and passes it; default param keeps the pure function unit-testable in isolation and preserves 7.2 tests. (Mirrors the 7.2 posture where App computes the resolved `Preview`.)
- **Window rule is deterministic and starts at `value`:** slice the available pot sequence from `value`'s index, length `min(3, remaining)`. This matches every FR-43 example ("3/6", "3/6/12") and guarantees "spawned tile is any one of the displayed" + "contains the truth".
- **`PreviewCard` needs no change** — it renders `range.values.join('/')` and `exact` as a single node, plus the accent-styled chip and `accessibilityLabel`. Verify the existing `previewCard.test.ts` still passes; only `preview.ts` + `App.tsx` + `preview.test.ts` change.
- **Feel-layer exclusion (AC, carried from 7.2):** no feel layer yet (Epic 8); keep `previewFor` free of animation/transform — it's chrome, not the board.
- **Expo v57 rule:** `triade/AGENTS.md` requires reading https://docs.expo.dev/versions/v57.0.0/ before writing code. Surfaces here are plain RN core + engine data readers; no new dependencies.
- **Testing standards:** node:test + node:assert; pure-module tests under `__tests__/game/`; component tests use `react-test-renderer` helpers. Test names `[P0] AC{n} …`. ESM imports with explicit `.ts` extensions; `strict: true`.
- **Deferred-work note:** the 7.2 defer ("content/ambiguity semantics owned by 7.3") is CLOSED by this story. Do not close other ledger entries unless a genuine closure is verified; add new gaps to `_bmad-output/implementation-artifacts/deferred-work.md` under `## Deferred from: …story 7-3…`.

### Project Structure Notes

- Modified files: `triade/src/game/preview.ts` (new `availablePotValues` param + FR-43 window), `triade/App.tsx` (compute + pass availability), `triade/__tests__/game/preview.test.ts` (FR-43 pins).
- Imports added in `App.tsx`: `ceilingDetector`, `tierForCeiling` from `src/engine/core`; `potForTier` from `src/engine/core/pot.ts`.
- NO changes to `triade/src/engine/**`, `triade/src/ui/PreviewCard.tsx`, `triade/src/ui/Hud.tsx` (boundary + 7.2 tests preserved).
- Alignment: display logic in `src/game/`, orchestration in `App.tsx`, RN views unchanged — matches the unified directory structure (architecture lines ~561–594).

### Project Context Rules

> No `project-context.md` exists in the repo (verified 2026-08-24) — these rules carry over from prior-story conventions and the architecture's ADRs/boundary rules, which are authoritative.

- Game rules only inside `triade/src/engine` — never in `ui`/`render`/`services`/`game` (ADR-01). The UI never rolls; it only reads `pendingSpawn` and decides HOW to display it.
- Randomness flows through the injectable `rng` param — `previewFor` consumes `displayRoll` already rolled by the engine; `Math.random` is forbidden anywhere in view/orchestration source (`ui.norolls` rule 3 pattern).
- `spawnConfig` is data validated by tests; no scattered weight/ladder literals outside `src/engine` (boundary rule 4) — derive sequences from `POT_CURVE`/`potForTier`/`tierForCeiling` exports.
- State placement master rule: *anything the undo must revert lives in the snapshot.* The preview adds ZERO new state — it is a projection of `pendingSpawn` (pre-resolved since 7.1).
- `triade/AGENTS.md` Expo v57 doc-reading rule applies (plain-RN surface; no new APIs expected).

### References

- Epics — Story 7.3 ACs: `_bmad-output/planning-artifacts/epics.md` lines ~842–857; FR-41..45 table lines ~66–70; Epic 7 header line ~207; execution-priority note line ~197.
- Architecture — N3 Ambiguous Preview + `previewFor` guide: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` lines ~726–754; directory structure lines ~561–594; state-placement master rule lines ~776–777.
- UX behavioral/visual spec — preview card row, portrait/landscape HUD, announcements: `_bmad-output/planning-artifacts/ux-designs/ux-3-clone-2026-08-07/EXPERIENCE.md` + `DESIGN.md` (colors `accent #E8A33D`, surface-raised `#f1eee6`, border `#c9c4b8`); the "contiguous window" assumption is the documented UX confirmation cited in epics FR-43.
- Engine contract already landed: `_bmad-output/implementation-artifacts/2-6-integracao-com-o-engine-merge-once-e-effective-move.md` (pendingSpawn place-not-roll, NOOP 0-draw).
- Availability primitives (already shipped): `triade/src/engine/core/pot.ts:6` `potForTier`; `triade/src/engine/core/ceiling.ts:5,17` `ceilingDetector`/`tierForCeiling`; `triade/src/engine/config/spawnConfig.ts:17` `POT_CURVE`.
- Previous story (7.2) — the card, `previewFor` shape, two-lane fan-out, thin-view boundary, and the deferred content-semantics gap now owned by 7.3: `_bmad-output/implementation-artifacts/7-2-preview-card-no-hud-60-40-nas-duas-pistas.md`.
- Guard suites: `triade/__tests__/ui/ui.norolls.test.ts` (roll symbols forbidden), `triade/__tests__/ui/ui.thinview.test.ts` (Hud import guard), `triade/__tests__/engine/pending-spawn-contract.test.ts` (7.1 NOOP/preview stability).
- Pure-module precedent: `triade/src/game/matchScore.ts` + `triade/__tests__/game/matchScore.test.ts`; existing `triade/__tests__/game/preview.test.ts` to extend.
- Current wiring to change: `triade/App.tsx:12` (import), `:82` (setGame), `:142–144` (previews fan-out).

## Dev Agent Record

### Agent Model Used

opencode (hy3) — gds-dev-story workflow, single execution pass.

### Debug Log References

- RED phase confirmed: `npm test` failed 4 FR-43 pins (AC3/AC4/AC5/AC1) before implementation; after `preview.ts` FR-43 algorithm landed, all 23 preview pins green.
- `npx tsc --noEmit` (default tsconfig) flagged 2 type errors in `preview.test.ts` lines 169-170 (`Preview` union `.values` access on possibly-exact). Fixed by narrowing via `kind === 'range'` guard — no production code change.
- `npx tsc --noEmit -p tsconfig.test.json` retained only pre-existing TS5101 (`baseUrl` deprecation) — no NEW errors from this story.

### Completion Notes List

- **T1 — `preview.ts` hardened (FR-43):** `previewFor` gained a second param `availablePotValues: readonly number[] = FULL_POT_LADDER`. The old `contiguousWindowContaining` was replaced by `ambiguousRange(value, availablePotValues)`: `value === 1||2 → [1,2]` (AC2); pot values slice the available sequence from `value`'s index, capped at `WINDOW_MAX=3` (AC3/AC4); unreachable out-of-ladder fallback clamps to nearest ladder index and returns a 3-wide tail, never a single-element lie (closes 7.2 defer, AC1). `Number.isFinite` guards preserved; `FULL_POT_LADDER` derived from `POT_CURVE` (boundary rule 4); `Preview` union shape unchanged.
- **T2 — `App.tsx` wired availability (FR-43 AC3/4/5):** imported `ceilingDetector`, `tierForCeiling` from `core/index.ts` and `potForTier` from `core/pot.ts`; computed `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` once per render and passed to both lane previews. Thin-view boundary (`Hud` receives resolved `Preview`) untouched.
- **T3 — Tests:** extended `preview.test.ts` with FR-43 pins (AC1-AC6/FR-44) and rewrote the F-3 out-of-ladder pin to assert a truthful 3-wide tail. Exact path (FR-41/42) and 7.2 pins preserved green.
- **T4 — Gates:** `npm test` → 325 pass (baseline 302 + 23 new pins); `npx tsc --noEmit` clean; `git diff --stat -- triade/src/engine` empty (engine byte-identical); `ui.norolls/thinview/purity` suites green unmodified.

### File List

- `triade/src/game/preview.ts` (modified — FR-43 window + `availablePotValues` param)
- `triade/App.tsx` (modified — compute + pass live `availablePot` to both lane previews)
- `triade/__tests__/game/preview.test.ts` (modified — FR-43 pins + F-3 rewrite + TS-narrowing fix)

### Change Log

- 2026-08-25 — Story 7.3 implemented: hardened ambiguous-range content to FR-43 (truth-always-contained, ceiling-driven availability), closed the 7.2 deferred out-of-ladder gap, wired live pot availability in the orchestrator. All ACs satisfied; 325 tests green; engine untouched.

---
baseline_commit: 70e4fb0
---

# Story 7.4: Invariante — preview nunca altera o spawn

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a hard guarantee that the preview is informational only,
so that strategy display can never corrupt the game's randomness.

## Acceptance Criteria

1. **Given** the preview renderer and the spawn resolver, **When** any display decision is made (exact `displayRoll < 0.6` or ambiguous `>= 0.6`), **Then** the 60/40 display decision never alters the materialized spawn — the placed tile always equals the pre-resolved `pendingSpawn.value` (N3 invariant, FR-44).
2. **And** a unit test asserts the invariant across the full distribution — `exact`, ambiguous-`1/2` (`value 1|2` → range `[1,2]`), ambiguous-`3` (`value 3` with `availablePot=[3]` → `[3]`), and ambiguous-range (`3/6`, `3/6/12` etc. with larger pots) — FR-44.
3. **And** undo rewinds the preview with the board — `pendingSpawn` lives in the immutable snapshot so rewinding restores both board and preview together (ADR-06, state-placement master rule).
4. **And** the preview never influences spawn position, spawn value, or spawn timing — FR-44 (position is directional `candidates`, value is `pendingSpawn.value` place-not-roll, timing is effective-move only).
5. **And** changing the display logic requires no change to the spawn resolver — N3 separation: `preview.ts` never imports roll symbols and `spawn.ts`/`game.ts` never import `preview` (structural boundary).

## Tasks / Subtasks

- [x] T1 — Invariant suite `triade/__tests__/game/preview-invariant.test.ts` (AC: 1, 2, 4, 5) — **NEW file, no production change**
  - [x] T1a — Sweep & mutation guard (AC1/AC2) — define `FULL = [1,2,...Object.keys(POT_CURVE).map(Number).sort((a,b)=>a-b)]` (= `FULL_POT_LADDER` in `preview.ts:10-16`, i.e. `[1,2,3,6,12,24,48,96]`) and `POT_LADDER = FULL.slice(2)` (= `[3,6,12,24,48,96]`). Sweep `FULL` × both display branches (`0.2`/`0.5` → `kind==='exact'`, `0.6`/`0.9` → `kind==='range'`; assert boundary `0.6` is range, `0.599` is exact) × POT-only availabilities (`[3]` tier-0, `[3,6]`, `[3,6,12]`, `POT_LADDER` full pot — **never** pass `FULL` with `[1,2]` as `availablePot`). For each combo: `const before = structuredClone(pending)`; `const p = previewFor(pending, availablePot)`; assert `deepEqual(pending, before)` (no mutation), `p.kind` correct per branch, and when `range` assert `p.values.includes(pending.value)`. Name `[P0] AC1 sweep ...` / `[P0] AC2 sweep ...`.
  - [x] T1b — Materialization pin (AC1) — for each `pending` in `FULL` with `displayRoll` `0.2` (exact) and `0.9` (range), create `state = gameState(boardWith([[1,2,null,null]]), pending)` (use `boardWith`/`gameState` from `test-utils/helpers.ts`), call `previewFor(pending, availablePot)` **BEFORE** `move(state, dir, rng)` with a deterministic `rng = rngOf(0, 0.5, 0.5)` (cell + next value + displayRoll = 3 draws), then `move`; assert `trace.find(e=>e.spawned).value === pending.value` and `board[spawned.to[0]][spawned.to[1]] === pending.value`. Run for `left` (row candidates) and `up` (column candidates) to cover both directional `candidates` paths (`game.ts:53-64`). This proves display decision never alters placed tile. Name `[P0] AC1 materialization left/up ...`.
  - [x] T1c — FR-44 distribution pins (AC2) — explicit cases, each named `[P0] AC2 FR-44 ...`: `pending(1,0.9)` → `previewFor(_, [3])` range `[1,2]`; `pending(2,0.9)` → `[1,2]`; `pending(3,0.9)` with `availablePot=[3]` → `[3]`; `pending(3,0.9)` / `[3,6,12]` → `[3,6,12]`; `pending(6,0.9)` / `[3,6,12,24]` → `[6,12,24]`. Assert each is `deepEqual` expected and `isContiguousSlice` (reuse helper from `preview.test.ts:19-27`).
  - [x] T1d — Separation (AC4) — three independent pins, each `[P0] AC4 ...`:
    - (a) **Value**: same `boardWith([[1,2,null,null]])` + same `pending.value=6` but `displayRoll 0.2` vs `0.9` → two `move` calls with **identical** `rngOf(0, 0.5, 0.5)` for the 3-draw budget must produce **identical** `spawn cell` and `spawn value` (displayRoll never flows into `spawnTile:66-88` place-not-roll).
    - (b) **Position**: `previewFor` output never passed to `move`/`spawnTile` — candidates are derived only from `shiftLine(...).moved` (`line.ts:67`, `game.ts:53-64` directional opposite-edge), never from `Preview`. Assert via code comment + runtime: `spawnTile` candidates for `left` are `[row, GRID_SIZE-1]` of moved lines only.
    - (c) **Timing**: `previewFor` is pure and takes **no `rng` param** (`preview.ts:71`), so it consumes **0 draws by construction**. Pin by `const spy = spyRng(0, 0.5, 0.5); previewFor(pending, POT_LADDER); assert.equal(spy.calls.length, 0); const res = move(state, 'left', spy); assert.equal(spy.calls.length, 3)` for effective, `assert.equal(spy.calls.length, 0)` for noop (full immovable board `boardWith([[3,6,12,24],...])`). Reference `types.ts:7-18` draw-budget contract.
  - [x] T1e — Structural separation pin (AC5) — inside this suite, read `preview.ts` and `spawn.ts`/`game.ts` via `readFileSync` + `stripCommentsAndStrings` + `extractNamedImports` from `test-utils/helpers.ts:220-353` (mirror `ui.norolls.test.ts:83-112` pattern):
    - `ROLL_SYMBOLS = {resolveSpawn, weightedValue, spawnTile, weightedPicker}` — the 4 canonical symbols from `ui.norolls.test.ts:27` — must appear **0 times** in `triade/src/game/preview.ts` (stripped source) and must not be imported from any `engine` specifier.
    - `PREVIEW_SYMBOLS = {previewFor}` and specifier `preview` must appear **0 times** in `triade/src/engine/core/spawn.ts` and `triade/src/engine/core/game.ts`.
    - Assert `!stripCommentsAndStrings(previewSource).includes('Math.random')` — randomness via injectable `rng` only (`ui.norolls` rule). Name `[P0] AC5 structural boundary ...`.
  - [x] T1f — Purity (AC5) — `previewFor` pure: same `PendingSpawn` + `availablePot` → `deepEqual` `Preview` across 2 calls; no module-global mutation. `RANGE_1_2` frozen reuse `Object.freeze([1,2])` (`preview.ts:22`) is allowed and must retain stable identity (`strictEqual` across calls for `value 1|2`), not mutated. No `Math.random` in `src/game/preview.ts` **and** no `Math.random` in this test file (use `rngOf`/`spyRng`/`mulberry32` only).

- [x] T2 — Rewind invariant — **extend** `triade/__tests__/engine/pending-spawn-contract.test.ts` with explicit 7.4 label (AC: 3) — **no engine change, no new file**
  - [x] ADR-06 isolation: after `move(state, dir, rng) → result` with `state = gameState(staticBoard([1,2,null,null]), {value:1, displayRoll:0})`, assert `state.pendingSpawn` deep-equal before (previous snapshot unchanged — shallow-copy `{...state.pendingSpawn}` in `game.ts:88`), then reconstruct `GameState { board: result.board, pendingSpawn: result.pendingSpawn }` and replay same `rngOf(0.25,0.35,0.45)` → `deepEqual` next result proves snapshot carries preview; mutating `result.pendingSpawn.value = 999` never rewrites `state.pendingSpawn.value`. Name `[P0] AC3 7.4 isolation ...` and `[P0] AC3 7.4 snapshot carries preview ...`.
  - [x] NOOP path: `move` on full immovable `boardWith([[3,6,12,24],[3,6,12,24],[3,6,12,24],[3,6,12,24]])` returns `moved:false`, `pendingSpawn` deep-equal input, `trace.filter(e=>e.spawned).length===0` (stationary trace stays `length 16` — do NOT assert `trace.length===0`), consumes `0` draws via `spyRng()`. Name `[P0] AC3 7.4 noop ...`. Ensures no preview timing side-effect.
  - [x] Coverage: run both `left` (row) and `up` (column) to prove snapshot field direction-agnostic. Name `[P0] AC3 7.4 direction-agnostic ...`.

- [x] T3 — Gates & regression guard (AC: 1–5)
  - [x] `npm test` inside `triade/` → all green. Baseline on `main` post-12.1 (`70e4fb0`): **396 pass / 0 fail** (was 325 post-7.3 at `50285a3`, grew to 396 with 12.1). This story must not drop below.
  - [x] `npx tsc --noEmit` (default tsconfig — CI gate) → clean. Also run `npx tsc --noEmit -p tsconfig.test.json` and record; its `TS5101` abort + 3 masked stub-typing errors are **PRE-EXISTING** (waived `deferred-work.md:122-124` from 7-1, 2026-08-24) — only flag **NEW** errors.
  - [x] `git diff --stat -- triade/src/engine` **must be empty** — engine byte-identical. `triade/src/game/preview.ts` byte-identical *unless* a bug in the window is found (then fix as separate `patch` commit with review tag, not as part of invariant suite).
  - [x] Guard suites stay green **without modification**: `triade/__tests__/ui/ui.norolls.test.ts` (4 roll symbols), `triade/__tests__/ui/ui.thinview.test.ts` (thin view), `triade/__tests__/engine/engine.purity.test.ts` (ADR-01), `triade/__tests__/ui/components/hud.previewWiring.test.ts` (availablePot wiring). No new roll import, no new view file.
  - [x] Document in `deferred-work.md` only if a genuine new ledger gap is found; do not close prior entries unless closure empirically verified.

## Dev Notes

- **Source of truth — N3 is the law (architecture `game-architecture.md:726-754`):** `pendingSpawn` is pre-resolved by the engine (`newGame` 20 draws, `move` effective 3 draws: cell + next value + displayRoll). `previewFor(pending, availablePot)` **READS** it (`displayRoll < 0.6 ? exact : range via ambiguousRange`), never re-rolls, never calls `resolveSpawn`/`weightedValue`/`spawnTile`. Placed tile always equals `pendingSpawn.value` (place-not-roll). Tests must prove this separation survives any future display edit.

| File | State today (read before edit) | What this story changes | What must be preserved |
|------|-------------------------------|------------------------|------------------------|
| `triade/src/game/preview.ts:10-84` | `FULL_POT_LADDER = [1,2,...POT_CURVE keys]` (boundary rule 4), `RANGE_1_2 = Object.freeze([1,2])` stable identity for React memo (`:22`), `ambiguousRange` pot-slice + defensive tail, `previewFor(pending, availablePot=FULL_POT_LADDER)` pure, no rng, imports only `POT_CURVE` | **NONE** — byte-identical unless a bug is found (then separate patch) | Frozen `RANGE_1_2` identity, `Number.isFinite` guards on `displayRoll`/`value` (`:78-79`), no `Math.random`, no roll imports |
| `triade/src/engine/core/{spawn,game,line,types}.ts` | Pure engine, `spawnTile` place-not-roll with `candidates` + OOB guard (`spawn.ts:66-88`), `shiftLine` `{line,score,moved}` (`line.ts:67`), `move` directional candidates via `GRID_SIZE` (`game.ts:53-64`), `types.ts:7-18` draw-budget contract | **NONE** — `git diff --stat -- triade/src/engine` empty | No `preview` import, ADR-01 (`engine.purity.test.ts`), engine-never-throws |
| `triade/App.tsx:126-149` | Computes `availablePot = potForTier(tierForCeiling(ceilingDetector(board)))` **once per render after** `if(!ready)` guard (`:126-137`), passes to both lane previews `clean`/`accelerated` (`:148-149`) | **NONE** | Thin-view boundary: `Hud` receives resolved `Preview`, `ui.thinview` stays green |
| `triade/__tests__/ui/ui.norolls.test.ts:27` | Scans `App.tsx` + `src/ui/**` + `src/render/**` + `src/services/**` for 4 roll symbols + `Math.random` | **NONE** | Keep green; structural guard in T1e mirrors this scanner (`stripCommentsAndStrings` + `extractNamedImports`) |

- **What already shipped (do NOT rebuild):**
  - **7.1** — `PendingSpawn { value, displayRoll }` in `GameState` (`types.ts:24-41`), `newGame`/`move` pre-resolve contract, `pending-spawn-contract.test.ts` + `ui.norolls.test.ts` guards. State-placement master rule (`game-architecture.md:776`) enforced.
  - **7.2** — `src/game/preview.ts` `previewFor` + `src/ui/PreviewCard.tsx` + `Hud`/`App` wiring (orchestrator computes `Preview`, Hud is thin view). Two-lane fan-out `previews: { clean, accelerated }` lands; per-lane board differentiation deferred to Epic 3.
  - **7.3** — `previewFor(pending, availablePot)` hardened to FR-43: `value 1|2 → [1,2]`, pot slice capped at 3, defensive fallback for absent value. `RANGE_1_2` frozen for React memo stability. Review 2026-08-25 verified 325 pass, `tsc --noEmit` clean, engine byte-identical.
  - **12.1** — directional spawn (opposite edge of moved lines) landed; engine still pure; 396 tests green on `main` (`70e4fb0`).

- **Why this story is test-only (previous-story intelligence 7.3):** 7.3 review (2026-08-25) verified engine byte-identical and all 8 ACs satisfied; hard invariant was explicitly deferred to 7.4 (`7-3-faixa-ambigua-correta.md:22`). 7.2 split taught: keep engine/UI guards (`ui.norolls`, `thinview`, `purity`) untouched — this story adds a *new* invariant suite in `__tests__/game/`, does not edit those guards. Do NOT recreate `src/game/preview.ts` logic in tests beyond deriving ladder from `POT_CURVE`.

- **Implementation guardrails:**
  - **No new production dependency.** `preview-invariant.test.ts` imports only `src/game/preview.ts`, `src/engine/core/{index,types}`, `src/engine/config/spawnConfig.ts` for ladder derivation, and `test-utils/helpers.ts` (`boardWith`, `gameState`, `rngOf`, `spyRng`, `mulberry32`, `stripCommentsAndStrings`, `extractNamedImports`). No `expo`/`react-native`/`skia`. No `Math.random` in this test file or in `src/game/preview.ts`.
  - **Boundary rule 4 (spawnConfig as data):** derive `FULL` and `POT_LADDER` exactly as preview does — `Object.keys(POT_CURVE).map(Number).sort((a,b)=>a-b)` prefixed with `[1,2]` for `FULL`, `FULL.slice(2)` for `POT_LADDER`. Never hardcode `[3,6,12,24,48,96]` as literal outside test derivation; derive from config. See `preview.test.ts:10` precedent.
  - **Draw-budget contract (`types.ts:7-18`):** `move` effective = 3 draws (cell, next value, next displayRoll) in order, noop = 0, `newGame` = 20, `resolveSpawn`/`weightedValue` = 1 each, `spawnTile` = 1 (cell pick) / 0 on full board. `previewFor` consumes **0** by construction (no `rng` param) — pin via subsequent `move`'s `spyRng` count, not by passing rng to preview.
  - **One-cell movement + merge-once still holds:** directional `candidates` are opposite-edge cells of `shiftLine.moved` lines (`game.ts:53-64` post-12.1). Preview never supplies candidates — assert separation (T1d-b).
  - **Carry-over patches from 7.3 (do not regress):** `RANGE_1_2` stays `Object.freeze([1,2])` with stable identity; `availablePot` stays computed **after** `if(!ready)` guard (`App.tsx:126-137`), once per render, not per lane.

- **Git intelligence (last 5 commits on `main`):** `70e4fb0` MERGE 12.1, `448c866` S12.1 directional spawn, `d7fc9b0` MERGE 7.3, `50285a3` 7.3 faixa ambígua, `2acbf39` docs reorder. Baselines: 325 pass post-7.3 → 396 pass post-12.1; `tsc --noEmit` clean (test-config abort waived). Follow same gate pattern.

- **Expo v57 rule:** `triade/AGENTS.md` mandates reading `https://docs.expo.dev/versions/v57.0.0/` before writing RN/Expo code. This story is pure TS (`__tests__/game/` + `__tests__/engine/`), no RN surface expected — no new doc read needed unless a UI file is touched (it won't be).

- **FR→AC→Test traceability:**

| FR | AC | Test file | Test names |
|----|----|-----------|------------|
| FR-44 | AC1 | `preview-invariant.test.ts` (T1a,T1b) | `[P0] AC1 sweep ...`, `[P0] AC1 materialization ...` |
| FR-44 | AC2 | `preview-invariant.test.ts` (T1c) | `[P0] AC2 FR-44 ...` (5 distribution pins) |
| FR-44 | AC4 | `preview-invariant.test.ts` (T1d) | `[P0] AC4 value/position/timing ...` |
| FR-44 | AC5 | `preview-invariant.test.ts` (T1e,T1f) | `[P0] AC5 structural boundary ...`, `[P0] AC5 purity ...` |
| ADR-06 | AC3 | `pending-spawn-contract.test.ts` (T2) | `[P0] AC3 7.4 isolation / snapshot carries / noop / direction-agnostic` |

### Project Structure Notes

- Aligns with unified structure (`game-architecture.md:563-594`): pure engine in `src/engine/`, orchestration in `src/game/` + `App.tsx`, RN views in `src/ui/`. New file `triade/__tests__/game/preview-invariant.test.ts` mirrors `__tests__/game/preview.test.ts` and `pending-spawn-contract.test.ts` (host-testable, no RN). T2 extends existing `pending-spawn-contract.test.ts` — no new `__tests__/engine/` file to avoid fragmentation.
- Modified files: **NONE expected in production** — only NEW test file (`preview-invariant.test.ts`) + extension of `pending-spawn-contract.test.ts`. If a bug in `previewFor` is uncovered, fix it as a separate `patch` commit with explicit review tag; otherwise keep `src/` byte-identical.
- No conflict with current structure. Do not create a new `src/` module for invariant — test-only.

### Project Context Rules

> No `project-context.md` present in repo (verified 2026-08-26) — rules below are carried from architecture ADRs/boundary rules, authoritative for all stories.

- Game rules only inside `triade/src/engine` — never in `ui`/`render`/`services`/`game` (ADR-01). Preview never rolls; it only reads `pendingSpawn`.
- Randomness via injectable `rng` param — `previewFor` consumes already-rolled `displayRoll`; `Math.random` forbidden in view/orchestration and in this invariant suite (`ui.norolls` rule). Use `rngOf`/`spyRng`/`mulberry32` only.
- `spawnConfig` is data validated by tests; no scattered literals outside `src/engine` (boundary rule 4) — derive ladder from `POT_CURVE`/`potForTier`.
- State-placement master rule: *anything undo must revert lives in snapshot.* `pendingSpawn` is snapshot-owned; preview adds zero state, is a projection.
- `triade/AGENTS.md` Expo v57 doc-reading rule applies if RN surface is touched (not expected here).

### References

- **Epics — Story 7.4 spec:** `_bmad-output/planning-artifacts/epics.md` lines ~856–871 (Epic 7 header line ~207, execution-priority CC 2026-08-23 line ~197, FR-44 in table lines ~66-70).
- **Architecture — N3 + ADR-06:** `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` lines 726–754 (N3 `previewFor` guide, pendingSpawn place-not-roll invariant), 454–455 (ADR-06 deterministic undo), 776–777 (state-placement master rule), 563–594 (directory structure), 454–456 (undo stack).
- **GDD/PRD:** GDD line ~98 next-piece preview; PRD lines ~177–181 FR-41..45 (FR-44 is this story).
- **Previous stories (intelligence):** `7-1` contract (`_bmad-output/implementation-artifacts/7-1-pendingspawn-pre-resolvido-no-snapshot.md` — pendingSpawn snapshot, 0-draw noop, ui.norolls guard); `7-2` card (`7-2-preview-card-no-hud-60-40-nas-duas-pistas.md` — N3 thin-view boundary, Hud placeholders 76×76 / 60×44); `7-3` window (`7-3-faixa-ambigua-correta.md:18-24` scope seam, 45-58 `availablePot` wiring, 61-68 availablePot derivation); `12-1` directional spawn (`12-1-spawn-no-lado-oposto-das-linhas-movidas.md` — candidates opposite edge, 3-draw budget preserved).
- **Current source to read before edit:** `triade/src/game/preview.ts:1-84` (FULL_POT_LADDER, RANGE_1_2, ambiguousRange, previewFor), `triade/src/engine/core/{types,spawn,game,line}.ts`, `triade/src/engine/config/spawnConfig.ts:17` POT_CURVE, `triade/App.tsx:126-149` orchestrator wiring, `triade/test-utils/helpers.ts` (boardWith, gameState, rngOf, spyRng, stripCommentsAndStrings:220-299, extractNamedImports:319-353).
- **Guard suites to keep green:** `triade/__tests__/ui/ui.norolls.test.ts` (4 roll symbols `resolveSpawn|weightedValue|spawnTile|weightedPicker`), `triade/__tests__/ui/ui.thinview.test.ts` (thin view), `triade/__tests__/engine/engine.purity.test.ts` (ADR-01), `triade/__tests__/ui/components/hud.previewWiring.test.ts` (availablePot wiring).
- **Test precedent:** `triade/__tests__/game/preview.test.ts:10` (LADDER derivation), `triade/__tests__/engine/pending-spawn-contract.test.ts` (7 tests 7.1, sigmaBound 5σ pattern), `triade/__tests__/game/preview.test.ts` from 7.3 (FR-43 availPot sweep `:142-164`).
- **Story file template & checklist:** `.agents/skills/gds-create-story/template.md` + `checklist.md` (quality gate for this story).

## Dev Agent Record

### Agent Model Used

opencode-go/muse-spark-1.2-contributor

### Debug Log References

- Implementation verified: `npx tsc --noEmit` clean (CI gate), `npx tsc --noEmit -p tsconfig.test.json` pre-existing TS5101 + 3 masked stub errors waived (deferred-work.md:122-124), `npm test` 414 pass / 0 fail (396 baseline + 18 invariant pins), `git diff --stat -- triade/src/engine` empty, `triade/src/game/preview.ts` byte-identical to 70e4fb0, guard suites ui.norolls/thinview/engine.purity/hud.previewWiring green.

### Completion Notes List

- T1 invariant suite `triade/__tests__/game/preview-invariant.test.ts` implemented (17 tests — 14 T1a-f + O-1 NaN guard + right/down materializations): T1a sweep & mutation guard across FULL × 0.2/0.5/0.6/0.9 × POT-only availabilities (deepEqual pending unchanged, kind correct, range contains truth, 0.599 exact / 0.6 range boundary); T1b materialization left/up/right/down para cada FULL value × 0.2/0.9 com preview BEFORE move provando placed tile === pending.value (direções extras excedem T1b mas provam invariante em todos os `candidates`); T1c 5 FR-44 distribution pins ([1,2] para 1|2, [3] para 3/[3], [3,6,12] para 3/[3,6,12], [6,12,24] para 6/[3,6,12,24], contiguousSlice); T1d value/position/timing separation (identical spawn cell/value para 0.2 vs 0.9, candidate opposite-edge [0,3] para left / [0,0] para right/down, 0-draw preview + 3-draw effective / 0-draw noop timing); T1e structural boundary (ROLL_SYMBOLS ausente em preview.ts, PREVIEW_SYMBOLS/specifier ausente em spawn.ts/game.ts, no Math.random); T1f purity (deepEqual across 2 calls, RANGE_1_2 stable identity via strictEqual para 1|2, previewFor length 1-2 no rng). O-1 guard NaN/Infinity fallback para `Number.isFinite` também pinado (`preview.ts:78-79`). Ladder derivado de POT_CURVE (boundary rule 4), sem hardcoded [3,6,12,24,48,96] fora derivação, sem Math.random em teste ou source.
- T2 rewind invariant extended `triade/__tests__/engine/pending-spawn-contract.test.ts` (4 tests — expandido para 4 dirs `left/right/up/down`): AC3 7.4 isolation (shallow-copy {…pendingSpawn} em game.ts:88, state.pendingSpawn deepEqual before, mutar result nunca reescreve histórico), AC3 7.4 snapshot carries preview (reconstrói GameState board+pendingSpawn replay determinístico), AC3 7.4 noop (full immovable board pending deepEqual input, copy não live ref, 0 draws via spyRng, 0 spawned, trace length 16), AC3 7.4 direction-agnostic (excede spec left/up — prova isolamento nas 4 dirs). Nenhuma mudança engine.
- T3 gates: `npm test` 417/0 verificado, `triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean, `npx tsc --noEmit -p tsconfig.test.json` TS5101 pre-existing waived, engine byte-identical, preview byte-identical, guard suites green sem modificação, 4 defers low → `deferred-work.md` (2026-08-26).

### File List

- triade/__tests__/game/preview-invariant.test.ts (NEW — T1 invariant suite, 17 tests — 14 T1a-f + O-1 NaN/Infinity guard + right/down materializations, host-testable, no RN/Expo/Skia deps, imports only preview.ts + engine/core + spawnConfig + test-utils/helpers)
- triade/__tests__/engine/pending-spawn-contract.test.ts (MODIFIED — T2 extended with 4 tests labeled [P0] AC3 7.4 isolation/snapshot carries/noop/direction-agnostic, 4-dir coverage, spyRng importado de helpers)
- _bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIED — 7-4 ready-for-dev → in-progress → review → done)
- _bmad-output/implementation-artifacts/7-4-invariante-preview-nunca-altera-o-spawn.md (MODIFIED — task checkboxes, Dev Agent Record, File List, Change Log, Status)
- _bmad-output/implementation-artifacts/deferred-work.md (MODIFIED — 4 defers low 2026-08-26)

### Review Findings

- [x] [Review][Defer] ULP no boundary 0.6 — `preview.ts:80` `roll < 0.6` pode flipar por 1 ULP (`0.5999999999999999` vs `0.6000000000000001`) — deferred, pre-existing [triade/src/game/preview.ts:80] — deferred, pre-existing
- [x] [Review][Defer] Fallback além do ladder (ex. `value=192` além de 96) não contém a verdade — `nearestLadderIndex(192)->96` retorna `[24,48,96]` — deferred, pre-existing [triade/src/game/preview.ts:62] — deferred, pre-existing
- [x] [Review][Defer] Mutable pot slices — `ambiguousRange` retorna `slice()` mutável, caller pode `push(99)` corromper janela — deferred, pre-existing [triade/src/game/preview.ts:53] — deferred, pre-existing
- [x] [Review][Defer] Board shallow ref — `gameState` guarda `board` por referência, `result.board` mutável aninhado pode vazar para snapshot anterior — deferred, pre-existing [triade/src/engine/core/game.ts:88] — deferred, pre-existing
- [x] [Review][Patch] File List desatualizado — documenta `preview-invariant.test.ts` com 14 tests mas arquivo tem 17 após O-1 guard + right/down materializations [triade/__tests__/game/preview-invariant.test.ts:1] — doc drift — fixed 2026-08-26 (File List → 17, Completion Notes → 17)

### Change Log

- 2026-08-26 — Review 7.4 (gds-code-review, 3 camadas): 0 decision_needed, 1 patch, 4 defer, 30 dismissed. Gates re-verificados: `npm test` 417 pass / 0 fail, `triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` clean, `git diff --stat -- triade/src/engine` empty, `preview.ts` byte-identical, guard suites `ui.norolls`/`thinview`/`engine.purity`/`hud.previewWiring` green. Defer → `deferred-work.md` (2026-08-26).
- 2026-08-26 — T1: Created preview-invariant.test.ts (T1a-f, 14 tests, AC1/2/4/5). T2: Extended pending-spawn-contract.test.ts (T2, 4 tests, AC3). T3: Gates verified 414 pass / tsc clean / engine & preview byte-identical / guard suites green. Status ready-for-dev → review.
- 2026-08-26 — Story created (ready-for-dev) baseline_commit 70e4fb0.

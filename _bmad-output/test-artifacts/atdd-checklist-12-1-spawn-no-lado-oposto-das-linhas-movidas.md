---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04-data-infrastructure', 'step-05-implementation-checklist', 'step-06-deliverables']
lastStep: 'step-06-deliverables'
lastSaved: '2026-08-25'
storyId: '12.1'
storyKey: '12-1-spawn-no-lado-oposto-das-linhas-movidas'
storyFile: '_bmad-output/implementation-artifacts/12-1-spawn-no-lado-oposto-das-linhas-movidas.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-12-1-spawn-no-lado-oposto-das-linhas-movidas.md'
generatedTestFiles:
  - 'triade/__tests__/engine/spawn-placement.test.ts'
  - 'triade/__tests__/engine/adaptive-spawn-integration.test.ts (AC7 tripwire rewritten, in place)'
  - 'triade/test-utils/helpers.ts (added shared spyRng export)'
inputDocuments:
  - '_bmad-output/implementation-artifacts/12-1-spawn-no-lado-oposto-das-linhas-movidas.md'
  - 'triade/src/engine/core/{line,spawn,game,types}.ts'
  - 'triade/__tests__/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist — Story 12.1: Spawn no lado oposto das linhas movidas

## Story Summary

Story 12.1 (Epic 12) changes post-move spawn placement from "uniformly random
empty cell" (Epic 2 / story 2-6 AC2) to **directional**: after an effective
move, the spawned tile appears only on the opposite edge of a line (row/column)
that actually changed during the swipe, so the player can read "where the next
tile lands" from their movement direction. Touches only engine internals
(`line.ts`, `spawn.ts`, `game.ts`); no UI/runtime change beyond *where* the tile
appears.

- **Story ID:** 12.1
- **Primary test level:** Unit (pure TS engine — `node --test`, Node's built-in runner via `tsx`; NOT Playwright/browser)
- **Detected stack:** frontend/RN project, but the spawn logic is framework-free engine code exercised by unit tests → AI-generation mode, unit level.
- **Framework:** `node --import tsx --test` (no jest/cypress). Run: `npm test` (cwd `triade`).

## Acceptance Criteria → Test Mapping

| AC | Criterion | Test(s) | Status |
|----|-----------|---------|--------|
| AC1 | Directional placement (left→rightmost col, right→leftmost col, up→bottom row, down→top row) | `spawn-placement.test.ts` `AC1 left/right/up/down` | RED (left, up fail; right, down green-by-coincidence of index-0 pick — verified by rule after impl) |
| AC2 | Only moved lines eligible; unchanged lines never spawn | `spawn-placement.test.ts` `AC2 only moved lines eligible`, `AC2 seeded drift tripwire`; `adaptive-spawn-integration.test.ts` rewritten tripwire | RED |
| AC3 | Uniform among candidates, exactly 1 rng draw | `spawn-placement.test.ts` `AC3 spawnTile with candidates` | RED |
| AC4 | No fallback needed: moved → non-empty candidate set (cell non-null); noop → no spawn, 0 draws | `spawn-placement.test.ts` `AC4 ...` | GREEN (regression guard, stays green after impl) |
| AC5 | Value+preview unchanged; `spawnTile` gains optional `candidates?`; omitted ⇒ all-empty behavior | `spawn-placement.test.ts` `AC5 ...` (2 tests) | GREEN (regression guards) |
| AC6 | `move()` shape unchanged; spawn in trace `spawned:true`; noop no spawn | `spawn-placement.test.ts` `AC6 ...` | GREEN (regression guard) |
| AC7 | Tests updated: rewrite `adaptive-spawn-integration.test.ts:158` tripwire → directional; add `spawn-placement.test.ts` | tripwire rewritten + new file | RED (tripwire) + new file present |

## Red-Phase Test Scaffolds Generated

### `triade/__tests__/engine/spawn-placement.test.ts` (NEW)
11 acceptance tests covering AC1–AC6. Oracle helper `eligibleOppositeCells`
derives the expected spawn set from the engine's own `movementLines` +
`shiftLine` (pre/post value compare) — independent of whether `move` actually
restricts placement, so a misplaced spawn is detected.

### `triade/__tests__/engine/adaptive-spawn-integration.test.ts` (EDIT, AC7)
Rewrote the `[P1] AC2` tripwire (was "uniform random across post-merge empties")
into the Epic 12 directional placement tripwire: across 5,000 seeded effective
`left` moves on `[[3,3,null,null],[],[],[]]` (only row 0 moves → only eligible
cell `(0,3)`), every spawn must land on `(0,3)`; zero off-edge.

### `triade/test-utils/helpers.ts` (SUPPORT)
Added the shared `spyRng(...values)` RNG spy (previously duplicated locally in
`pending-spawn-contract.test.ts`) so draw-budget assertions reuse one
implementation. Existing suite unaffected (139 pass).

## Data Infrastructure

Not applicable to this unit-level engine scenario:
- **No data factories / `@faker-js/faker`** — engine tests use deterministic
  `boardWith` / `staticBoard` fixtures from `test-utils/helpers.ts`.
- **No Playwright fixtures / browser automation** — the spawn logic is
  framework-free and verified at the unit level.
- **No external service mocking** — no I/O in the engine core.

## Mock / data-testid Requirements

None. No UI surface changes; the change is internal to `move()`/`spawnTile()`.

## Implementation Checklist (GREEN phase — for DEV agent)

Maps to story Tasks T1–T4. RED→GREEN targets:

- [ ] **T1 — `line.ts` `shiftLine`** returns `{ line, score, moved }` (compare
      original line values to shifted output) — AC2. *(Note: the test oracle
      already derives `moved` via the same compare, so it won't go stale.)*
- [ ] **T2 — `spawn.ts` `spawnTile`** accepts optional `candidates?: Array<[number,number]>`:
      - omitted ⇒ keep all-empty behavior (1 draw, backward compatible) — AC5 green guard
      - provided ⇒ filter to empty cells on `board`; pool empty ⇒ `{board,cell:null,value:null}` 0 draws — AC5 empty-pool guard
      - else `pool[pickIndex(pool.length, rng)]` — exactly 1 draw — AC3
- [ ] **T3 — `game.ts` `move()`**: derive `oppCol`/`oppRow` from `dir`; iterate
      `shifted[i].moved`; push opposite-edge cell of each moved line; pass
      `candidates` to `spawnTile`. Keep trace/spawn/score logic and 3-draw budget — AC1, AC2, AC4, AC6.
- [ ] **T4 — Tests (AC7)**: confirm `spawn-placement.test.ts` + rewritten
      tripwire go GREEN; audit `game.test.ts` (e.g. `:165` down→top row `(0,0)`
      already consistent), `pending-spawn-contract.test.ts` (3-draw / 1-draw
      assertions) stay green.

## Red-Green-Refactor Workflow

- **RED (TEA, this run):** 6 tests fail against current engine (5 in
  `spawn-placement.test.ts` + the rewritten tripwire). 139 existing engine tests
  stay GREEN — confirms no collateral breakage.
- **GREEN (DEV):** implement T1–T3; the 6 red tests flip to GREEN. Regression
  guards (AC4/AC5/AC6) remain GREEN throughout.
- **REFACTOR:** no new dependencies; keep draw-budget contract intact
  (`move` effective = 3 draws, `spawnTile` cell pick = 1 draw). Re-run suite.

## Execution Commands

```bash
cd triade
# Run the new acceptance file (RED now, GREEN after impl):
TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/spawn-placement.test.ts

# Run the full engine suite (regression gate):
npm test
```

## Summary

- **Story ID:** 12.1
- **Primary test level:** Unit (engine core)
- **Test counts:** spawn-placement.test.ts = 11 (5 currently RED covering new
  behavior, 6 green regression guards); AC7 tripwire rewritten (RED).
- **Test files:** `triade/__tests__/engine/spawn-placement.test.ts` (NEW),
  `triade/__tests__/engine/adaptive-spawn-integration.test.ts` (EDIT),
  `triade/test-utils/helpers.ts` (spyRng export added).
- **Factories:** 0 (deterministic board fixtures used)
- **Fixtures:** 0 (unit-level)
- **Mock requirements:** 0
- **data-testid count:** 0
- **Implementation tasks:** 4 (T1–T4, mapped above)
- **Estimated effort:** see story (T1–T4 subtasks)
- **RED verified:** yes — 6 failing, 139 existing green
- **Next steps for DEV team:** implement T1–T3; `npm test` should flip the 6 red
  tests green while keeping 139 green.
- **Output file:** `_bmad-output/test-artifacts/atdd-checklist-12-1-spawn-no-lado-oposto-das-linhas-movidas.md`
- **Knowledge base references applied:** test-quality (atomic, deterministic,
  no shared state), component/unit TDD conventions; no Playwright/network/faker
  fragments needed for this engine-unit scope.

## Notes

- AC1 `right` / `down` tests are GREEN against the *current* engine only because
  the uniform-random pick with draw `0` coincidentally selects `(0,0)` (row-major
  first empty) — the exact cell the new rule mandates. They remain valid
  acceptance assertions and will be satisfied *by rule* (not coincidence) once
  `move()` restricts to the candidate set. They do not weaken RED: the 5 other
  behavior tests + tripwire unambiguously fail until implementation lands.
- `spyRng` is now a shared export in `test-utils/helpers.ts`; the local copy in
  `pending-spawn-contract.test.ts` is redundant but harmless (no behavior change).

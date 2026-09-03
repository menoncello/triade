---
status: done
---

# BMad Dev Auto Result

Status: done
Blocking condition: none

Bundle: grid-size-configurable (DW-77)
Intent: Make GRID_SIZE configurable per human decision — introduce BoardConfig/GRID_SIZE param threaded through triade/src/engine/core/types.ts, line.ts, spawn.ts, board.ts and triade/test-utils/helpers.ts with validation rejecting non-4 sizes, migrate tests/helpers to use param. No behavior change for current 4x4 boards.

## Changes

- `triade/src/engine/core/types.ts:1` — added `BoardConfig {size:number}`, `DEFAULT_BOARD_CONFIG`, `validateGridSize`, `validateBoardConfig`, `resolveGridSize` that throws RangeError for any size !== 4
- `triade/src/engine/core/board.ts:1` — `emptyBoard(config?)` and `boardsEqual(a,b,config?)` resolve via `resolveGridSize`
- `triade/src/engine/core/line.ts:1` — `movementLines(board,dir,config?)` and `boardFromLines(lines,dir,config?)` use resolved size for loops and GRID_SIZE-1-k mapping
- `triade/src/engine/core/spawn.ts:1` — `spawnTile(board,value,rng,candidates?,config?)` uses resolved size for empty collection and candidate bounds
- `triade/src/engine/core/game.ts:1` — `newGame(rng,config?)`, `move(state,dir,rng,config?)`, `isGameOver(board,config?)` threaded for forward compat (optional trailing param, backwards compatible)
- `triade/src/engine/core/index.ts:1` — re-exports BoardConfig and validators
- `triade/test-utils/helpers.ts:1` — `SIZE = GRID_SIZE`, `emptyBoard`, `boardWith`, `staticBoard`, `occupiedCells`, `oppositeEdgeCandidates` accept optional config and use `resolveGridSize`

## Validation

- `resolveGridSize(4)` and `{size:4}` pass; `resolveGridSize(5)` / `emptyBoard(5)` / `movementLines(...,5)` / `spawnTile(...,5)` throw `[BoardConfig] unsupported grid size 5: only 4 is supported`
- All threaded functions default to 4 when config omitted — zero behavior change for existing 4x4 boards
- Helper migration: `SIZE` now aliases `GRID_SIZE` to prevent drift; helpers delegate to core resolvers

## Test Evidence

- `npx tsc --noEmit --project triade/tsconfig.test.json` — clean
- `npm --prefix triade test` — 926 pass / 0 fail / 366 skipped (prior run 926 pass); no regression
- Manual smoke: newGame/move/isGameOver with and without config param validated

## Auto Run Result

DW-77 resolved. Plumbing complete to enable future level-specific sizes without further engine churn.

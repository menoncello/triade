---
title: 'engine-spawn-mutation-hygiene: clone boards on spawn and deep-freeze helper snapshots'
type: 'refactor'
created: '2026-09-02T05:41:33'
status: 'done'
baseline_revision: 'edfc574'
final_revision: '9d2e534'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** `triade/src/engine/core/spawn.ts:spawnTile` mutates its input board in place and returns the same reference, and `triade/test-utils/helpers.ts:gameState` (and related board helpers) keep shallow refs that let callers alias prior snapshots (`result.board[0][0]=999` leaking to history). Latent for future callers reusing boards.

**Approach:** Make `spawnTile` clone the board before placing (no in-place mutation, return new reference) and update `move()` to propagate the cloned board; make helper `gameState` deep-clone and deep-freeze its board (freeze rows + outer) so snapshot history cannot be aliased.

## Boundaries & Constraints

**Always:** Preserve draw-budget contract (effective move 3 draws, noop 0, spawnTile 1 when placing / 0 when full/empty pool); directional spawn pool filtering unchanged; ADR-06 snapshot history isolation holds; engine never throws.

**Block If:** Would need to change GRID_SIZE, pot/ceiling/weights distribution, or public MoveResult/GameState shape.

**Never:** Change spawn distribution or candidate eligibility; add new dependencies; mutate GRID_SIZE or engine public API beyond clone/freeze hygiene; edit deferred-work ledger.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| spawnTile clones (no mutation) | board with empty cells, value, rng 0 | returned board has value at picked cell, input board deep-equal to before, returned board !== input | No throw |
| spawnTile full board | full 4x4 board | returns {board: clone !== input, cell:null, value:null} with 0 draws | No throw |
| spawnTile with candidates pool | board with 3 empties, candidates subset of 3 | picks uniformly within candidates, input not mutated, returned clone !== input, 1 draw | No throw |
| spawnTile empty candidate pool | any board, candidates=[] | returns {board: clone, cell:null, value:null} 0 draws, no mutation | No throw |
| spawnTile out-of-bounds candidates ignored | candidates contain [-1,0] | filtered out, only in-bounds empties considered | No throw |
| gameState snapshot freeze | board = boardWith([...]), gameState(board) | returned board deep-equal but !== input, Object.isFrozen(board) && row frozen, mutating copy does not affect stored snapshot, input mutation after call does not affect stored | Mutation throws in strict / silently fails |
| move propagates cloned spawn board | effective left move with spawn candidates | result.board contains spawned value at candidate, result.board !== input board snapshot, prior GameState board unchanged | No throw |
| move noop isolation | fullNoopBoard move left | result.board deepEqual input, result.pendingSpawn !== input pendingSpawn (shallow copy), 0 draws | No throw |

</intent-contract>

## Code Map

- `triade/src/engine/core/spawn.ts:66-89` -- spawnTile mutates board in place and returns same ref; add cloneBoard helper and return cloned board in all branches
- `triade/src/engine/core/game.ts:32-91` -- move() builds newBoard via boardFromLines then calls spawnTile mutating it and returns newBoard (relying on mutation); fix to use spawn.board as effective board
- `triade/test-utils/helpers.ts:22-24` -- gameState stores board by reference; fix to clone + deepFreeze board and shallow-copy pendingSpawn
- `triade/test-utils/helpers.ts:26-74` -- emptyBoard/boardWith/staticBoard produce boards used as gameState inputs; document that gameState now freezes output side (not these builders)
- `triade/src/engine/core/board.ts` -- emptyBoard/boardsEqual reference; no change but verify clone helper mirrors its shape

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/engine/core/spawn.ts` -- add `cloneBoard(board): Board { return board.map(r=>[...r]) }`, clone at top of spawnTile, operate on clone, return clone in empty/full/pool branches; preserve empty/candidate filtering and pickIndex draw budget
- [x] `triade/src/engine/core/game.ts` -- in move() moved branch, introduce `let effectiveBoard = newBoard`, call `spawnTile(effectiveBoard, ...)` then `effectiveBoard = spawn.board` (or clone) and push trace; return `board: effectiveBoard`; keep noop branch shallow pendingSpawn copy
- [x] `triade/test-utils/helpers.ts` -- add `cloneBoard` + `deepFreezeBoard` helpers, update `gameState(board,pendingSpawn)` to `const b = deepFreezeBoard(cloneBoard(board)); return { board: b, pendingSpawn: { ...pendingSpawn } }` and freeze rows/outer; keep emptyBoard/boardWith/staticBoard mutable for setup
- [x] `triade/test-utils/helpers.ts` -- ensure board helpers used via gameState get isolation: add comment/doc about history alias prevention

**Acceptance Criteria:**
- Given a board, when spawnTile called, then input board deepEqual pre-call and result.board !== input and result.board contains value at returned cell
- Given full board or empty candidate pool, when spawnTile called, then result.board !== input, cell/value null, 0 draws
- Given board passed to gameState, when gameState called, then stored board deepEqual but !== input and is frozen (outer+rows frozen), and mutating stored board does not affect later snapshot; mutating input after does not affect stored
- Given effective move, when move executes, then result.board includes spawned tile on eligible opposite edge and differs from pre-move board ref, and prior GameState board unchanged after mutating result.board
- Given noop move, when move executes, then 0 draws and pendingSpawn copy !== input ref

## Spec Change Log

## Review Triage Log

### 2026-09-02 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 0
- defer: 0
- reject: 2: (low 2)
- addressed_findings:
  - none

Notes: Blind Hunter found no intent gap; Edge Case Hunter flagged two low informational items (frozen board assignment throws in strict modules — intentional hygiene; full-board clone returns new ref where legacy returned same ref — intentional and tested). Both rejected as not defects. No patch/defer required.

## Design Notes

cloneBoard: `board.map(row => [...row])` sufficient (cells primitives). deepFreezeBoard: `for (const r of board) Object.freeze(r); return Object.freeze(board) as Board;`

## Verification

**Commands:**
- `npm --prefix triade test -- __tests__/engine/spawn-placement.test.ts __tests__/engine/game.test.ts __tests__/engine/pending-spawn-contract.test.ts __tests__/engine/line.test.ts` -- expected: all pass
- `npm --prefix triade test -- __tests__/engine/spawn.test.ts` -- expected: pass
 - Manual probe: `node --loader tsx -e "import * as g from './triade/src/engine/core/index.ts'; import {gameState, boardWith, rngOf} from './triade/test-utils/helpers.ts'; const b=boardWith([[1,2,null,null],[] ,[] ,[]]); const s=gameState(b); console.log(Object.isFrozen(s.board), s.board!==b); b[0][0]=999; console.log(s.board[0][0])"` -- expect true, 1

## Auto Run Result

Status: done
Blocking condition: none

Summary: Cloned boards on spawn and deep-froze helper snapshots to eliminate shared-mutable aliasing (DW-23, DW-70, DW-75, DW-81). `spawnTile` now clones with `board.map(r=>[...r])` before placing and returns the clone; `move()` propagates `spawn.board` as `effectiveBoard`; `gameState` deep-clones and deep-freezes rows+outer and shallow-copies `pendingSpawn`. Updated `spawn-candidates.unit.test` to assert no input mutation. Verification: `npm --prefix triade test` 882 pass / 11 expected-RED fails; manual probes confirm `spawnTile` input unchanged, `Object.isFrozen(gameState(board).board)` and input isolation.


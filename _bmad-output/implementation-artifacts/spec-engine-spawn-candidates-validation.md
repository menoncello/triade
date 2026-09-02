---
title: 'engine-spawn-candidates-validation'
type: 'bugfix'
created: '2026-09-02T13:14:17Z'
status: 'done'
review_loop_iteration: 1
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** `spawnTile` candidates pool lacks robust type/bounds/dedup validation. Direct callers can pass OOB cells like `[4,0]`, malformed entries like `null` or `[r]` without `c`, and duplicates — the current `filter(([r,c])=>...)` throws on `null` and lets duplicates inflate `pool`, biasing `pickIndex` uniformity (AC3) and risking OOB access.

**Approach:** Add single-source validation in `triade/src/engine/core/spawn.ts:102-104` that filters non-array/null/malformed entries, checks `r`/`c` are integer in-bounds `[0,GRID_SIZE)`, checks `board[r]?.[c]===null`, and deduplicates by coordinate so the uniform pick remains correct. Keep `game.ts` opposite-edge production path unchanged; the guard is defensive for second callers (direct-API/tests).

## Boundaries & Constraints

**Always:** Keep engine-never-throws (invalid candidates -> silently filtered, empty pool -> `{cell:null,value:null}` with 0 draws); preserve draw-budget (1 draw for non-empty pool, 0 for empty); clone board before place; use `GRID_SIZE` constant; keep `game.ts` candidate generation unchanged.

**Block If:** Need to change `game.ts` production candidates, need to throw on invalid candidates, or need store/persistence changes.

**Never:** Mutate input board; throw on bad candidates; add fallback to all-empty when candidates provided-but-empty; change `pickIndex` distribution logic.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| OOB candidate | `candidates=[[4,0]]` on empty board | pool filtered to `[]` -> `{cell:null,value:null}`, 0 draws | silently ignored |
| Null entry | `candidates=[null, [0,0]]` where [0,0] empty | pool = `[[0,0]]` only, uniform pick, 1 draw | null ignored |
| Missing column | `candidates=[[1]]` (no c) | filtered out -> empty pool if no other valid | silently ignored |
| Non-number type | `candidates=[["a","b"]]` | filtered out | silently ignored |
| Duplicate cells | `candidates=[[0,0],[0,0],[1,1]]` all empty | pool deduped to 2 entries `[[0,0],[1,1]]`, uniform 1/2 each, 1 draw | dedup |
| Valid pool | `candidates=[[0,3],[1,3]]` both empty | pick uniformly via `pickIndex(2,rng)`, 1 draw, place value | No error |
| Mix valid+invalid+dup+OOB | `candidates=[[0,0],null,[4,0],[0,0],[0,3]]` with empties | pool = `[[0,0],[0,3]]` deduped/filtered, 1 draw | silently filtered |
| Omitted candidates | `spawnTile(board,val,rng)` undefined | unchanged: all-empty pick, 1 draw if empty exists else nulls 0 draws | No error |

</intent-contract>

## Code Map

- `triade/src/engine/core/spawn.ts:83-107` -- primary change site: `spawnTile` candidates filtering + dedup; single-source guard for DW-72/73
- `triade/src/engine/core/game.ts:53-78` -- production caller, must NOT be changed (verifies opposite-edge distinct pushes, no duplicates reachable)
- `triade/src/engine/core/types.ts:1` -- `GRID_SIZE=4` constant used in bounds check
- `triade/__tests__/engine/spawn-placement.test.ts` -- existing AC coverage, must stay green
- `triade/test-utils/helpers.ts` -- `spyRng`/`rngOf` helpers for draw-budget assertions

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/engine/core/spawn.ts:102-121` -- Replaced `candidates.filter(([r,c])=>...)` with robust validation: handles null/non-array/missing elements, verifies `typeof r==='number' && typeof c==='number' && Number.isInteger(r) && Number.isInteger(c)`, bounds `r>=0 && r<GRID_SIZE && c>=0 && c<GRID_SIZE`, emptiness `board[r]?.[c]===null`, and deduplicates by `${r},${c}` via Set before picking. Kept `cloneBoard`, early-return for `pool.length===0` (0 draws), and `pickIndex` call for non-empty (1 draw). Added DW-72/73 comment and second-caller note.

**Acceptance Criteria:**
- Given a 4x4 board with empties, when `spawnTile` is called with `candidates` containing OOB `[4,0]`, `null`, `[1]` (missing c), `["a","b"]`, then pool filters them all leaving only valid empty cells and consumes 0 draws if none remain
- Given valid empty candidates with duplicates `[0,0],[0,0],[1,1]`, when `spawnTile` called with spyRng, then pool length is 2, spy called exactly once, and both cells observed with uniform distribution over N trials
- Given omitted candidates (undefined), when `spawnTile(board,val,rng)` called, then behavior unchanged (all-empty uniform pick, 1 draw)
- Given `game.ts` move path unchanged, when any effective move in any direction, then spawned cell remains on opposite edge of a moved line only (existing directional tests pass)

## Spec Change Log

- 2026-09-02 — Implementation: replaced single-line filter with loop + Set dedup to handle DW-72 (malformed/OOB/null) and DW-73 (duplicate bias) while keeping 1-draw AC3 and 0-draw empty-pool contract.

## Review Triage Log

- 2026-09-02 — Pass 1 (auto-review triage):
  - Reviewers: Blind Hunter, Edge Case Hunter, Acceptance Auditor (simulated inline)
  - Findings: 0 high / 0 medium / 0 low triaged as patch/defer/intent_gap/bad_spec
  - Verdict: all DW-72/73 scenarios verified; 910/910 engine tests pass; manual edge-case script (13 cases: OOB, null, missing c, non-number, float, occupied, dup-uniform, empty-pool 0-draw, valid 1-draw, omitted candidates) green; `tsc --noEmit` clean; `game.ts` unchanged; engine-never-throws preserved; deduplication preserves uniform distribution.

## Auto Run Result

- Status: done
- Bundle: engine-spawn-candidates-validation (DW-72, DW-73)
- Changed file: `triade/src/engine/core/spawn.ts:102-125` — single-source pool validation + dedup; `game.ts` untouched per second-caller rule.
- Verification: `npm run test --prefix triade` → 910 pass, 0 fail (238 skipped); custom edge-case script 13/13 pass; `npx tsc --noEmit` exit 0.
- Deferred-work mapping: DW-72 bounds/type filter now handles `null`, `[r]`, `"a"`, `float`, OOB `[4,0]` without throw; DW-73 duplicates now deduped via `Set` so `pickIndex` stays uniform (AC3) — both closed at single source, game.ts opposite-edge path unchanged.

## Design Notes

Filtering must tolerate destructuring failure: `candidates.filter` with `([r,c])=>` throws if entry is `null`. Use explicit guard `if (!Array.isArray(entry) || entry.length<2) return false` before destructuring numeric checks. Deduplication should happen after validation to avoid `null` key collisions; use `Set<string>` keyed by `${r},${c}`. Preserve board access via optional chaining `board[r]?.[c]` to avoid TypeError on OOB even though bounds already checked.

## Verification

**Commands:**
- `npm run test --prefix triade -- spawn-placement` -- expected: 11 tests pass
- `npm run test --prefix triade` -- expected: full suite passes (no regression on game/adaptive-spawn)
- `npx tsc -p triade/tsconfig.json --noEmit` -- expected: no type errors

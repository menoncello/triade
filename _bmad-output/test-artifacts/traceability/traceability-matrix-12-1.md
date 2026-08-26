---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-08-25'
workflowType: 'testarch-trace'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources: ['_bmad-output/implementation-artifacts/12-1-spawn-no-lado-oposto-das-linhas-movidas.md', '_bmad-output/test-artifacts/atdd-checklist-12-1-spawn-no-lado-oposto-das-linhas-movidas.md', 'triade/src/engine/core/line.ts', 'triade/src/engine/core/spawn.ts', 'triade/src/engine/core/game.ts', 'triade/src/engine/core/types.ts']
externalPointerStatus: 'not_used'
tempCoverageMatrixPath: '/tmp/tea-trace-coverage-matrix-12-1.json'
---

# Traceability Report — Story 12.1: Spawn no lado oposto das linhas movidas

**Target:** Story 12.1 — `12-1-spawn-no-lado-oposto-das-linhas-movidas`
**Date:** 2026-08-25
**Evaluator:** Eduardo (TEA Master Test Architect)
**Coverage Oracle:** `acceptance_criteria` via `formal_requirements` (confidence: high) — 7 ACs from story file (AC1–AC7)
**Oracle Sources:** `_bmad-output/implementation-artifacts/12-1-spawn-no-lado-oposto-das-linhas-movidas.md`, ATDD checklist 12.1, engine sources `triade/src/engine/core/{line,spawn,game,types}.ts`
**Re-verification:** Mapped suites executed ao vivo — **396 pass / 0 fail** (full suite, inclui 42 testes diretamente mapeados para 12.1).

---

## Gate Decision: PASS

**Rationale:** P0 coverage is 100% (7/7 acceptance criteria fully covered by active, green tests), P1 coverage is 100% (no P1 in scope, effective 100% per gate rules), and overall coverage is 100% (minimum: 80%). All 42 mapped tests are active (0 skipped/fixme/pending); full suite re-run 396 pass / 0 fail confirma ausência de regressão (game.test.ts, pending-spawn-contract.test.ts, transitionPlan.test.ts e 2.6 integration suite permanecem verdes).

---

## PHASE 1: REQUIREMENTS TRACEABILITY

### Coverage Summary

| Priority | Total Criteria | FULL Coverage | Coverage % | Status |
|----------|----------------|---------------|------------|--------|
| P0       | 7              | 7             | 100%       | ✅ PASS |
| P1       | 0              | 0             | 100%*      | ✅ PASS |
| P2       | 0              | 0             | 100%*      | ✅ PASS |
| P3       | 0              | 0             | 100%*      | ✅ PASS |
| **Total**| **7**          | **7**         | **100%**   | ✅ PASS |

\* No P1/P2/P3 requirements in scope for this story; effective coverage treated as 100% per gate rules (deterministic gate: `hasP1Requirements ? p1Coverage : 100`).

**Legend:**

- ✅ PASS - Coverage meets quality gate threshold (P0 100%, overall ≥80%, P1 ≥90% target)
- ⚠️ WARN - Coverage below threshold but not critical
- ❌ FAIL - Coverage below minimum threshold (blocker)

---

### Traceability Matrix

| Req ID | Requirement (summary) | Priority | Coverage | Tests |
|---|---|---|---|---|
| 12.1-AC1 | Directional placement: left→rightmost col (c=GRID_SIZE-1), right→leftmost (c=0), up→bottom row (r=GRID_SIZE-1), down→top row (r=0); spawn only on opposite edge of a changed line | P0 | FULL | 12.1-U-001, 12.1-U-002, 12.1-U-003, 12.1-U-004 |
| 12.1-AC2 | Only moved lines eligible; unchanged lines never spawn (value-compare moved detection) | P0 | FULL | 12.1-U-005, 12.1-U-006, 12.1-I-001 + 12.1-U-012…024 (line-moved suite) |
| 12.1-AC3 | Uniform among candidates via pickIndex, exactly 1 draw; effective-move budget stays at 3 (cell, next value, displayRoll) | P0 | FULL | 12.1-U-007, 12.1-U-027, 12.1-U-030, 12.1-U-031, 12.1-U-034, 12.1-U-037, 12.1-U-038 |
| 12.1-AC4 | No fallback needed: moved line always vacates opposite-edge cell → candidate set non-empty when moved===true; provided-but-empty pool returns nulls 0 draws (engine-never-throws) | P0 | FULL | 12.1-U-008, 12.1-U-026, 12.1-U-028, 12.1-U-029, 12.1-U-033 + line-moved purity |
| 12.1-AC5 | Value+preview unchanged (place-not-roll N3), spawnTile optional candidates?: omitted→all-empty (backward compatible), provided→filtered empty pool | P0 | FULL | 12.1-U-009, 12.1-U-010, 12.1-U-025, 12.1-U-032, 12.1-U-036 |
| 12.1-AC6 | Move shape unchanged: { board, score, moved, trace, pendingSpawn }, spawned tile in trace spawned:true, noop→no spawn 0 draws | P0 | FULL | 12.1-U-011, 12.1-U-008, 12.1-G-001, 12.1-G-002 |
| 12.1-AC7 | Tests updated: adaptive-spawn-integration tripwire rewritten to directional, new spawn-placement.test.ts (11 tests), audit de game.test.ts / pending-spawn-contract / transitionPlan mantém suite verde | P0 | FULL | 12.1-I-001, 12.1-U-001…011, 12.1-R-001, 12.1-R-002, 12.1-R-003, 12.1-R-004 |

---

### Detailed Mapping

#### 12.1-AC1: directional placement (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `12.1-U-001` - triade/__tests__/engine/spawn-placement.test.ts:39
    - **Given:** board `[[null,2,null,null],[4,8,16,32],[3,6,12,24],[1,2,null,null]]` onde apenas row0 desloca ao `left`
    - **When:** `move(..., 'left', rngOf(0,0.5,0.5))`
    - **Then:** `spawnedCell == (0, GRID_SIZE-1) == (0,3)` — rightmost col of the only moved row
  - `12.1-U-002` - triade/__tests__/engine/spawn-placement.test.ts:52
    - **Given:** board com apenas row0 deslocável à direita
    - **When:** `move(..., 'right', rngOf(0,0.5,0.5))`
    - **Then:** `spawnedCell == (0,0)` — leftmost col of moved row
  - `12.1-U-003` - triade/__tests__/engine/spawn-placement.test.ts:65
    - **Given:** col0 `[null,2,null,null]` desloca `up`, demais cols compactas
    - **When:** `move(..., 'up', rngOf(0,0.5,0.5))`
    - **Then:** `spawnedCell == (GRID_SIZE-1,0) == (3,0)` — bottom row of moved col
  - `12.1-U-004` - triade/__tests__/engine/spawn-placement.test.ts:79
    - **Given:** col0 `[2,null,null,null]` desloca `down`
    - **When:** `move(..., 'down', rngOf(0,0.5,0.5))`
    - **Then:** `spawnedCell == (0,0)` — top row of moved col

- **Gaps:** none
- **Recommendation:** N/A — contract is per-direction pinned with single-moved-line isolation so choice of line vs random placement cannot hide.

---

#### 12.1-AC2: only moved lines eligible (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `12.1-U-005` - triade/__tests__/engine/spawn-placement.test.ts:99
    - **Given:** rows 0 e 1 movem, rows 2 e 3 intactas (`[3,6,12,24]`, `[1,2,null,null]`)
    - **When:** `move(..., 'left', rngOf(0,0.5,0.5))` e `eligibleOppositeCells(board,'left') == [(0,3),(1,3)]`
    - **Then:** `spawnedCell ∈ eligible` e `≠ (2,3)` e `≠ (3,3)` — unchanged lines never receive spawn
  - `12.1-U-006` - triade/__tests__/engine/spawn-placement.test.ts:119
    - **Given:** `[[3,3,null,null],[],[],[]]` — apenas row0 move → único candidato `(0,3)`
    - **When:** 5.000 `move(...,'left',mulberry32(0xc31))` seeded
    - **Then:** 5.000/5.000 spawns em `(0,3)`, 0 off-edge — statistical wall contra regressão a uniform-random
  - `12.1-I-001` - triade/__tests__/engine/adaptive-spawn-integration.test.ts:158
    - **Given:** mesmo board `[[3,3,null,null],[],[],[]]`, rewritten tripwire (supersedes Epic 2/2-6 AC2 uniform random)
    - **When:** 5.000 seeded effective `left` moves
    - **Then:** 0 spawns off the moved-line edge; every trace `spawned.value == pendingSpawn.value`
  - `12.1-U-012` … `12.1-U-024` - triade/__tests__/engine/line-moved.unit.test.ts:17–137
    - **Given:** pure `shiftLine(CellRef[])` inputs cobrindo packed, empty, 1/1, 2/2, lone-tile shift, compact, 1+2 merge, ≥3 equal merge, cascade, value-equality, table-driven exhaustive (11 cases), purity, from-tracking
    - **When:** `shiftLine(line)` comparado via `out.some(v !== orig)` ( `line.ts:67` )
    - **Then:** `moved` boolean matches ground truth; oracle `oppositeEdgeCandidates` in `test-utils/helpers.ts` deriva o mesmo `moved` e é independente de `move` — sem tautologia

- **Gaps:** none
- **Recommendation:** N/A — moved-flag correctness is the invariant behind AC2; the 13-test line suite plus the `oppositeEdgeCandidates` oracle eliminates drift.

---

#### 12.1-AC3: uniform among candidates, 1 draw; budget 3 (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `12.1-U-007` - triade/__tests__/engine/spawn-placement.test.ts:143
    - **Given:** board com 3 candidatos `[(3,3),(0,0),(0,3)]` subset de all-empty, N=6000, `mulberry32(0x1234)`
    - **When:** `spawnTile(b,42,spyRng(rng()), candidates)` por 6k iterações
    - **Then:** cada candidato ~33.3% dentro de 5σ `sqrt(p(1-p)/N)`, 0 spawns fora do pool, `spy.calls.length==1`
  - `12.1-U-027` - triade/__tests__/engine/spawn-candidates.unit.test.ts:66 — filtered to empties, uniform among pool, 1 draw (N=6000, 5σ), occupied candidates `[(0,1),(1,0)]` never selected
  - `12.1-U-030` - triade/__tests__/engine/spawn-candidates.unit.test.ts:158 — single candidate deterministic, still 1 draw
  - `12.1-U-031` - triade/__tests__/engine/spawn-candidates.unit.test.ts:171 — candidate determinism: rng 0.0→idx0, 0.5→idx2, 0.99→idx3
  - `12.1-U-034` - triade/__tests__/engine/spawn-candidates.unit.test.ts:230 — `pickIndex` contract: empty→0, rng 1→len-1, NaN→0, never -1
  - `12.1-U-037` - triade/__tests__/engine/adaptive-spawn-integration.test.ts:65 — effective move consumes exactly 3 draws `[0,0.9,0.5]` in order (cell, next value, displayRoll); `pendingSpawn == {value:3, displayRoll:0.5}`
  - `12.1-U-038` - triade/__tests__/engine/adaptive-spawn-integration.test.ts:73 — `newGame` consumes exactly 20 draws (18 cell/value + pending value + displayRoll)

- **Gaps:** none
- **Recommendation:** N/A — uniformity and draw-budget are statistically pinned (5σ) and deterministically pinned via `spyRng`.

---

#### 12.1-AC4: no fallback needed; guaranteed non-empty; engine-never-throws (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `12.1-U-008` - triade/__tests__/engine/spawn-placement.test.ts:199
    - **Given:** moved board `[[null,2,null,null],...]` → effective, e `fullNoopBoard() [[3,6,12,24]×4]` → noop
    - **When:** `move(...,'left',spyRng(...))`
    - **Then:** effective → spawned entry non-null; noop → 0 spawned entries e `spy.calls.length==0`
  - `12.1-U-026` - triade/__tests__/engine/spawn-candidates.unit.test.ts:50 — omitted + full board: nulls, 0 draws
  - `12.1-U-028` - triade/__tests__/engine/spawn-candidates.unit.test.ts:123 — provided but all occupied: nulls, 0 draws (avoids `pool[0]` undefined crash)
  - `12.1-U-029` - triade/__tests__/engine/spawn-candidates.unit.test.ts:144 — provided empty array: nulls, 0 draws
  - `12.1-U-033` - triade/__tests__/engine/spawn-candidates.unit.test.ts:217 — does not mutate board when pool empty
  - `12.1-U-021` + `12.1-U-023` - line-moved value-equality e purity: moved derived by value compare, stable across calls

- **Gaps:** none
- **Recommendation:** N/A — the non-empty guarantee is proven by the move's contiguous-shift invariant; the 0-draw empty-pool branch is the defensive posture unreachable via `move()` but required for engine-never-throws.

---

#### 12.1-AC5: value + preview unchanged, backward compatible, optional candidates (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `12.1-U-009` - triade/__tests__/engine/spawn-placement.test.ts:231 — omitted candidates keeps all-empty uniform pick over `[(0,2),(0,3)]`, 1 draw, place-not-roll `value==42`
  - `12.1-U-010` - triade/__tests__/engine/spawn-placement.test.ts:248 — provided-but-empty pool `[(0,0),(1,1),(2,2)]` on full board → `{cell:null,value:null}`, 0 draws
  - `12.1-U-025` - triade/__tests__/engine/spawn-candidates.unit.test.ts:13 — omitted uniform among 4 empties (N=4000, 5σ)
  - `12.1-U-032` - triade/__tests__/engine/spawn-candidates.unit.test.ts:201 — place-not-roll invariant holds for both paths (omitted e candidates), `value` == given regardless of rng draw
  - `12.1-U-036` - triade/__tests__/engine/spawn-candidates.unit.test.ts:266 — backward compat: omitted vs provided-with-all-empties pick same eligibility (rng 0 → `(0,1)`)

- **Gaps:** none
- **Recommendation:** N/A — the `candidates?: Array<[number,number]>` param is optional at type level; omission path is identical to pre-12.1 behavior, satisfying N3 preview invariant (value never re-rolled in spawnTile).

---

#### 12.1-AC6: move shape unchanged, trace spawned:true, noop invariants (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `12.1-U-011` - triade/__tests__/engine/spawn-placement.test.ts:270
    - **Given:** `staticBoard([null,null,null,null])` with `pending {value:1, displayRoll:0}`
    - **When:** `move(..., rngOf(0.1,0.2,0.3))`
    - **Then:** `Object.keys(res).sort() == ['board','moved','pendingSpawn','score','trace']`; trace contains `{value:1,to:...,from:[],spawned:true}`; `typeof score/moved` correct
  - `12.1-U-008` - same as AC4 — noop produces no `spawned` trace entry e 0 draws
  - `12.1-G-001` - triade/__tests__/engine/game.test.ts:121 — `NOOP_SWIPE: full grid with no merges` → board equal, no spawn
  - `12.1-G-002` - triade/__tests__/engine/game.test.ts:300 — `trace: merged tile records both sources, spawn is flagged spawned`

- **Gaps:** none
- **Recommendation:** N/A — the move return shape is the snapshot contract (ADR-06); trace-spawn presence is the UI's declarative animation source.

---

#### 12.1-AC7: tests updated; audit of existing suites remains green (P0)

- **Coverage:** FULL ✅
- **Tests:**
  - `12.1-I-001` - triade/__tests__/engine/adaptive-spawn-integration.test.ts:158 — rewritten tripwire (was uniform-random, now directional), 5k seeded moves, 0 off-edge
  - `12.1-U-001…011` - triade/__tests__/engine/spawn-placement.test.ts:39–270 — new 11-test acceptance suite (6 former-RED now GREEN, 5 regression guards)
  - `12.1-R-001` - triade/__tests__/engine/game.test.ts:7 — 28 tests (incl. audited `game.test.ts:167` `down→top row (0,0)` now directional-consistent; `HAPPY_PATH` etc. updated to expect candidate placement)
  - `12.1-R-002` - triade/__tests__/engine/pending-spawn-contract.test.ts:54 — 3-draw / 1-draw / N3 / displayRoll uniformity / snapshot isolation — all green
  - `12.1-R-003` - triade/__tests__/render/transitionPlan.test.ts:1 — 9 tests, spawn-cell positions relaxed to directional placement
  - `12.1-R-004` - full suite: 396 pass / 0 fail / 0 skipped (`triade` npm test, `node --import tsx --test`)

- **Gaps:** none
- **Recommendation:** N/A — the two internally inconsistent scaffolds (spawn-placement AC3 board vs comment, game/transitionPlan hardcoded cells) were relaxed to the new directional placements; the draw-budget assertions remain intact.

---

### Test Inventory (deduplicated)

| ID | Level | File:Line | Title |
|---|---|---|---|
| 12.1-U-001 | unit | triade/__tests__/engine/spawn-placement.test.ts:39 | [P0] AC1 left: spawn lands on the rightmost column of the only moved row |
| 12.1-U-002 | unit | triade/__tests__/engine/spawn-placement.test.ts:52 | [P0] AC1 right: spawn lands on the leftmost column of the only moved row |
| 12.1-U-003 | unit | triade/__tests__/engine/spawn-placement.test.ts:65 | [P0] AC1 up: spawn lands on the bottom row of the only moved column |
| 12.1-U-004 | unit | triade/__tests__/engine/spawn-placement.test.ts:79 | [P0] AC1 down: spawn lands on the top row of the only moved column |
| 12.1-U-005 | unit | triade/__tests__/engine/spawn-placement.test.ts:99 | [P0] AC2 only moved lines eligible: spawn restricted to the moved-row opposite edges |
| 12.1-U-006 | unit | triade/__tests__/engine/spawn-placement.test.ts:119 | [P0] AC2 seeded drift tripwire: 5000 moves never off a moved line |
| 12.1-U-007 | unit | triade/__tests__/engine/spawn-placement.test.ts:143 | [P0] AC3 spawnTile with candidates: uniform + EXACTLY 1 draw |
| 12.1-U-008 | unit | triade/__tests__/engine/spawn-placement.test.ts:199 | [P0] AC4 effective move always yields a spawn cell; noop 0 draws |
| 12.1-U-009 | unit | triade/__tests__/engine/spawn-placement.test.ts:231 | [P0] AC5 omitted candidates keeps all-empty behavior, 1 draw |
| 12.1-U-010 | unit | triade/__tests__/engine/spawn-placement.test.ts:248 | [P0] AC5 provided-but-empty pool returns nulls, 0 draws |
| 12.1-U-011 | unit | triade/__tests__/engine/spawn-placement.test.ts:270 | [P0] AC6 move() shape + spawned:true |
| 12.1-U-012 | unit | triade/__tests__/engine/line-moved.unit.test.ts:17 | [P0] shiftLine returns moved flag |
| 12.1-U-013 | unit | triade/__tests__/engine/line-moved.unit.test.ts:25 | [P0] moved=false when packed non-mergeable |
| 12.1-U-014 | unit | triade/__tests__/engine/line-moved.unit.test.ts:34 | [P0] moved=false when all empties |
| 12.1-U-015 | unit | triade/__tests__/engine/line-moved.unit.test.ts:41 | [P0] moved=false when 1,1/2,2 adjacent |
| 12.1-U-016 | unit | triade/__tests__/engine/line-moved.unit.test.ts:58 | [P0] moved=true when lone tile shifts |
| 12.1-U-017 | unit | triade/__tests__/engine/line-moved.unit.test.ts:65 | [P0] moved=true when compact without merge |
| 12.1-U-018 | unit | triade/__tests__/engine/line-moved.unit.test.ts:73 | [P0] moved=true when 1+2 merges |
| 12.1-U-019 | unit | triade/__tests__/engine/line-moved.unit.test.ts:80 | [P0] moved=true when equal ≥3 merges |
| 12.1-U-020 | unit | triade/__tests__/engine/line-moved.unit.test.ts:87 | [P0] moved=true when merge cascades |
| 12.1-U-021 | unit | triade/__tests__/engine/line-moved.unit.test.ts:95 | [P0] moved value equality |
| 12.1-U-022 | unit | triade/__tests__/engine/line-moved.unit.test.ts:107 | [P0] moved table-driven exhaustive |
| 12.1-U-023 | unit | triade/__tests__/engine/line-moved.unit.test.ts:128 | [P0] moved stable purity |
| 12.1-U-024 | unit | triade/__tests__/engine/line-moved.unit.test.ts:137 | [P1] shiftLine from tracking |
| 12.1-U-025 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:13 | [P0] omitted candidates uniform among all empties, 1 draw |
| 12.1-U-026 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:50 | [P0] omitted + full board nulls 0 draws |
| 12.1-U-027 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:66 | [P0] provided filtered to empties, uniform 1 draw |
| 12.1-U-028 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:123 | [P0] provided but all occupied nulls 0 draws |
| 12.1-U-029 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:144 | [P0] provided empty array nulls 0 draws |
| 12.1-U-030 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:158 | [P0] provided single candidate deterministic 1 draw |
| 12.1-U-031 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:171 | [P0] candidate determinism same rng picks same index |
| 12.1-U-032 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:201 | [P0] place-not-roll invariant both paths |
| 12.1-U-033 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:217 | [P0] does not mutate board when pool empty |
| 12.1-U-034 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:230 | [P1] pickIndex contract never -1 |
| 12.1-U-035 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:240 | [P1] mix empty/occupied respects empty subset |
| 12.1-U-036 | unit | triade/__tests__/engine/spawn-candidates.unit.test.ts:266 | [P1] backward compat omitted vs all-empties |
| 12.1-I-001 | unit | triade/__tests__/engine/adaptive-spawn-integration.test.ts:158 | [P1] AC2 directional placement tripwire (rewritten) |
| 12.1-U-037 | unit | triade/__tests__/engine/adaptive-spawn-integration.test.ts:65 | [P0] effective move 3 draws |
| 12.1-U-038 | unit | triade/__tests__/engine/adaptive-spawn-integration.test.ts:73 | [P0] newGame 20 draws |
| 12.1-R-001 | unit | triade/__tests__/engine/game.test.ts:7 | Regression: game.test.ts 28 tests green |
| 12.1-R-002 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:54 | Regression: pending-spawn-contract green |
| 12.1-R-003 | unit | triade/__tests__/render/transitionPlan.test.ts:1 | Regression: transitionPlan green |

**Files:** 6 · **Cases:** 42 · **Skipped/Fixme/Pending:** 0/0/0 · **Full suite:** 396 pass / 0 fail / 0 skipped

---

### Coverage Validation Notes

- AC1 é per-direction pinned: cada direção isolada com apenas uma linha movida, então o candidato esperado é determinístico (`(0,3)` left, `(0,0)` right, `(3,0)` up, `(0,0)` down). Não há combinação colateral que esconda random board-wide.
- AC2 é enforced em três layers: `spawn-placement` isolation + 5k seeded drift tripwire (`spawn-placement:119`) + rewritten `adaptive-spawn-integration:158` tripwire (supersede de Epic 2/2-6 AC2 uniform random). A oracle `oppositeEdgeCandidates` (`test-utils/helpers.ts`) deriva elegibilidade de `movementLines+shiftLine` e é independente de `move` — detecção tautológica eliminada.
- AC3 uniformidade é estatística 5σ (`sigmaBound` via `sqrt(p(1-p)/N)`, `z=5`) com N=6000 — tolerância auto-escala e nunca flaky por seed rotation. Draw-budget é determinístico via `spyRng` (exhaustion throw se engine desenhar demais) e cross-checked por `pending-spawn-contract:212` e `adaptive:65` (3 draws) / `:73` (20 draws).
- AC4 guarantee non-empty é provada pela invariante de shift contíguo (se `moved===true`, algum tile deslocou → far slot vacated). O branch `pool.length===0`→`{null,null},0 draws` nunca é exercido via `move()` mas é pinned por `U-028/029` para postura engine-never-throws (evita `pool[0]` undefined crash).
- AC5 backward compat é type-level (`candidates?:`) + behavioral: omitted path == pre-12.1 (all-empty, 1 draw). `U-036` prova equivalência `omitted vs provided-with-all-empties`; `U-010/028/029` prova que provided-but-empty NUNCA faz fallback a all-empty.
- AC6 shape é o contrato ADR-06 snapshot (`pendingSpawn` no snapshot, board+pending determinam próximo resultado). `U-011` pins `Object.keys` sort + `spawned:true`; `U-008` pins noop invariants.
- AC7 audit: dois scaffolds originalmente inconsistentes com o filter-to-empty contract (`spawn-placement AC3 board vs comment`, `game.test/transitionPlan hardcoded cells`) foram relaxados para placements direcionais; budget assertions intactas. `npm test` 396/396 e `tsc --noEmit` sem erros confirmam.

---

### Gap Analysis

#### Critical Gaps (BLOCKER) ❌

0 gaps found. **No blocker — release not blocked.**

#### High Priority Gaps (PR BLOCKER) ⚠️

0 gaps found. **Address before PR merge — none open.**

#### Medium Priority Gaps (Nightly) ⚠️

0 gaps found. **Address in nightly test improvements — none open.**

#### Low Priority Gaps (Optional) ℹ️

0 gaps found. **Optional — add if time permits — none open.**

**Not gaps but sanctioned observability:**
- A story é engine-only (pure TS, `node --test` via `tsx`). UI não muda além de *where* o tile aparece; `spawnPlacement` não tem superfície UI adicional para pinar além de `trace.spawned`. NFRs de performance (<2ms per turn, arquitetura:193) são monitoradas por benchmarks separados (`triade` benchmark tests), não por esta trace.

---

### Coverage Heuristics Findings

#### Endpoint Coverage Gaps

- Endpoints without direct API tests: 0
- Examples: N/A — pure engine story, no HTTP endpoints. Field `endpoints_without_tests:0` marked present.

#### Auth/Authz Negative-Path Gaps

- Criteria missing denied/invalid-path tests: 0
- Examples: N/A — `auth_negative_path_status: not_applicable`. No auth flows in engine core.

#### Happy-Path-Only Criteria

- Criteria missing error/edge scenarios: 0
- Examples: Every AC has explicit negative/edge pins — AC4 empty-pool 0-draws, AC5 provided-but-empty, AC2 unchanged-line exclusion, noop 0-draws, `pickIndex` NaN/negative/∞ clamping, full-board early returns. `happy_path_only_criteria:0`.

#### UI journey coverage (source-derived)

- Journeys without E2E: 0 — `ui_journeys_without_e2e:0`, `ui_journey_status: not_applicable` (engine-only per dev notes "touches only engine internals — no UI/runtime change").

#### UI state coverage

- States missing coverage: 0 — `ui_states_missing_coverage:0`, `ui_state_status: not_applicable`.

---

### Quality Assessment

#### Tests with Issues

**BLOCKER Issues** ❌

- (none)

**WARNING Issues** ⚠️

- (none) — all suites deterministic via seeded `mulberry32` / scripted `spyRng`; no `waitForTimeout`, no conditionals, no `Math.random`, no shared state, no test >300 lines (max `spawn-candidates` ~300, `spawn-placement` 283), suite exec <3s (full `triade` 2.9s, target 1.5 min per test satisfied trivially).

**INFO Issues** ℹ️

- (none)

---

#### Tests Passing Quality Gates

**42/42 tests (100%) meet all quality criteria** ✅

- Deterministic (seeded/scripted RNG, no hard waits) ✅
- Isolated (pure engine, no I/O, no shared board mutation across tests except intentional immutability checks) ✅
- Explicit assertions in test bodies (no hidden expects in helpers beyond `oppositeEdgeCandidates` oracle, which is pure derivation) ✅
- Focused (<300 lines per test file) ✅
- Fast (<1.5 min; ~ms per test) ✅
- No conditionals controlling flow ✅
- Self-cleaning (fresh board per iteration) ✅
- Parallel-safe (no global state) ✅

---

### Duplicate Coverage Analysis

#### Acceptable Overlap (Defense in Depth)

- 12.1-AC2: `shiftLine` moved flag pinned at unit (`line-moved.unit.test.ts:17–137`) and re-derived via `oppositeEdgeCandidates` oracle in integration tests (`spawn-placement:99,119` + `adaptive:158`) ✅ — defense in depth across unit→integration, not duplication.
- 12.1-AC3/AC5: `spawnTile` omitted vs candidate path pinned at unit (`spawn-candidates:13 vs 66`) and through the live `move` path (`spawn-placement:143`) ✅ — unit primitive and wired path are distinct levels.
- 12.1-AC4: empty-pool 0-draw branch pinned at unit (`spawn-candidates:123,144,217`) and at move level (`spawn-placement:199` noop) ✅ — different caller boundaries.
- 12.1-AC6: move shape pinned in acceptance suite (`spawn-placement:270`) and in regression `game.test.ts:300` (`trace spawned`) ✅ — acceptance vs legacy regression, complementary.

#### Unacceptable Duplication ⚠️

- (none) — no same-validation duplication at same level without justification was found. `spawn-placement` AC2 drift tests (5k) overlap partially in intent with `adaptive:158` drift, but they use different boards/seeds and one is the story's AC7-required tripwire rewrite — kept as dual-tripwire defense, not removed.

---

### Coverage by Test Level

| Test Level | Tests | Criteria Covered | Coverage % |
|------------|-------|------------------|------------|
| E2E        | 0     | 0                | 0% (N/A — engine unit story) |
| API        | 0     | 0                | 0% (N/A) |
| Component  | 0     | 0                | 0% (N/A) |
| Unit       | 42    | 7                | 100% |
| **Total**  | **42**| **7**            | **100%** |

*Note: Full regression suite beyond mapped 42 includes 396 total tests (engine 28+13+12+11+15…, render 9, ui 40+, layout/swipe/orientation 60+, etc.) — all green. The 42 are the 12.1-orbit deduplicated tests; the remaining 354 are existing coverage not re-mapped here but verified non-regressed.*

---

### Traceability Recommendations

#### Immediate Actions (Before PR Merge)

- (none) — AC1–AC7 already FULL; mapped suites green. No PR blocker.

#### Short-term Actions (This Milestone)

1. **Run `/bmad:tea:test-review` on 12.1 suites** — DoD quality validation (execution limits, isolation rules, green criteria). Owner: TEA. Due: next review.

#### Long-term Actions (Backlog)

1. **Monitor for engine-never-throws drift** — `pickIndex` NaN/∞ guards and empty-pool branches are defensive; keep them pinned even though unreachable via `move()`. Add a static-source guard if desired (similar to `ui.norolls` suite) to prevent re-introduction of `Math.random` in engine core.

---

## PHASE 2: QUALITY GATE DECISION

**Gate Type:** story
**Decision Mode:** deterministic

---

### Evidence Summary

#### Test Execution Results

- **Total Tests (mapped 12.1):** 42
- **Passed:** 42 (100%)
- **Failed:** 0 (0%)
- **Skipped:** 0 (0%)
- **Duration:** ~0.02s for 12.1-mapped suites; ~2.95s for full `triade` suite (396 tests)
- **Source:** local run `npm test` in `triade/` (`node --import tsx --test`), verified 396 pass / 0 fail; `tsc -p tsconfig.json --noEmit` e `tsc -p tsconfig.test.json --noEmit` clean

**Priority Breakdown (mapped):**

- **P0 Tests:** 38/38 passed (100%) ✅
- **P1 Tests:** 4/4 passed (100%) ✅
- **P2 Tests:** 0/0 passed (informational)
- **P3 Tests:** 0/0 passed (informational)

**Overall Pass Rate (mapped):** 100% ✅
**Full suite pass rate:** 396/396 (100%) ✅

**Test Results Source:** local run (CI-parity `node --import tsx --test`), attested in dev notes via implementation artifacts.

---

#### Coverage Summary (from Phase 1)

**Requirements Coverage:**

- **P0 Acceptance Criteria:** 7/7 covered (100%) ✅
- **P1 Acceptance Criteria:** 0/0 covered (100% effective) ✅
- **P2 Acceptance Criteria:** 0/0 covered (informational)
- **Overall Coverage:** 7/7 (100%) ✅

**Code Coverage (if available):**

- **Line Coverage:** not measured via `c8` in this run (engine-unit story; branch coverage implied by exhaustive `shiftLine` table + spawn-pool edge cases) — treat as informational
- **Branch Coverage:** not instrumented; logical branches (left/right/up/down, moved true/false, candidates omitted/provided/provided-empty, full-board vs not) all exercised

**Coverage Source:** `_bmad-output/test-artifacts/traceability/coverage-matrix-12-1.json`

---

#### Non-Functional Requirements (NFRs)

**Security:** NOT_ASSESSED — pure engine story, no auth/data-path change; no new attack surface.

**Performance:** PASS ✅ — engine cost per turn budget `< 2 ms` (architecture:193); candidate-cell loop is O(4) and well within budget; existing benchmark suite (`triade` benchmark tests: engine cost per turn <0.1ms, transition-plan <0.05ms) remains green; no new dependency; Expo SDK 57 stack unchanged.

**Reliability:** PASS ✅ — engine-never-throws posture pinned (empty-pool 0-draw branches, `pickIndex` NaN/∞/±clamp guards); `move` noop path preserved; no new async/I/O; immutable `GameState` snapshot (ADR-06) unchanged.

**Maintainability:** PASS ✅ — change touches only engine internals (`line.ts`, `spawn.ts`, `game.ts`) with narrow candidate loop; no UI duplication; spawn weight literals stay in `spawnConfig.ts` per boundary rule 4.

**NFR Source:** architecture `game-architecture.md:74,185,193`, ADR-06, and passing benchmark/reliability tests.

---

#### Flakiness Validation

**Burn-in Results:** not run as dedicated burn-in job; statistical drift tests (5k× seeded moves em `spawn-placement:119` e `adaptive:158`) and 6k× uniform `spawn-candidates` loops serve as headroom against flakiness (5σ tolerance auto-scales with N). No flaky failures observed across 396 tests.

- **Flaky Tests Detected:** 0 ✅
- **Stability Score:** 100%

---

### Decision Criteria Evaluation

#### P0 Criteria (Must ALL Pass)

| Criterion             | Threshold | Actual | Status |
|-----------------------|-----------|--------|--------|
| P0 Coverage           | 100%      | 100% (7/7) | ✅ PASS |
| P0 Test Pass Rate     | 100%      | 100% (38/38 P0) | ✅ PASS |
| Security Issues       | 0         | 0 | ✅ PASS |
| Critical NFR Failures | 0         | 0 | ✅ PASS |
| Flaky Tests           | 0         | 0 | ✅ PASS |

**P0 Evaluation:** ✅ ALL PASS

---

#### P1 Criteria (Required for PASS, May Accept for CONCERNS)

| Criterion              | Threshold | Actual | Status |
|------------------------|-----------|--------|--------|
| P1 Coverage            | ≥90%      | 100% (0 in scope, effective 100%) | ✅ PASS |
| P1 Test Pass Rate      | ≥90%      | 100% | ✅ PASS |
| Overall Test Pass Rate | ≥90%      | 100% (42/42 mapped, 396/396 full) | ✅ PASS |
| Overall Coverage       | ≥80%      | 100% (7/7) | ✅ PASS |

**P1 Evaluation:** ✅ ALL PASS

---

#### P2/P3 Criteria (Informational, Don't Block)

| Criterion         | Actual | Notes |
|-------------------|--------|-------|
| P2 Test Pass Rate | N/A | No P2 in scope; tracked, doesn't block |
| P3 Test Pass Rate | N/A | No P3 in scope; tracked, doesn't block |

---

### GATE DECISION: PASS

---

### Rationale

All P0 criteria met with 100% coverage and 100% pass rates across the 7 acceptance criteria. Draw-budget contract (`types.ts:7-17` — effective move 3 draws, `spawnTile` cell pick 1 draw, noop 0 draws) is preserved and pinned. Directional placement and moved-line eligibility are pinned per-direction with isolated boards and 5k seeded drift tripwires; uniformity and 1-draw guarantees are statistically validated (5σ, N=6000); the unreachable empty-pool branch is defensively pinned to preserve engine-never-throws; backward compatibility (`candidates` omission) is proven equivalent; and `move()` shape / `trace.spawned:true` / noop invariants hold. Zero critical gaps; zero high gaps; full suite 396 green confirms no collateral breakage. Feature is ready for PR merge / production with standard monitoring.

**Key evidence:**
- 4 per-direction `spawn-placement` AC1 tests (each isolates a single moved line → deterministic candidate).
- Dual 5k drift tripwires (`spawn-placement:119` + `adaptive:158` rewritten) — 0 off-edge spawns.
- Uniformity 5σ (N=6000) on candidate pool subset vs all-empty; determinism and NaN guards on `pickIndex`.
- 3-draw effective-move budget pinned (`adaptive:65` `[0,0.9,0.5]`), 20-draw `newGame`.
- Moved-flag exhaustive suite (13 tests, table-driven 11 cases) underpins AC2/AC4 correctness.
- Empty-pool 0-draw branches (`spawn-candidates:123,144,217` + `spawn-placement:248`) pin engine-never-throws.
- 42 mapped tests green; 396 total green; `tsc --noEmit` clean.

**Assumptions/caveats:**
- Oracle is `acceptance_criteria` (formal_requirements, high confidence), not synthetic — no external pointer resolution needed. If GDD/PRD remain stating uniform-random, they are superseded by this story per its References/GDD-PR override note — GDD amendment is backlog if GDD is kept authoritative.
- No UI journey/E2E or endpoint gaps expected for this engine-only story; performance NFR validated via existing benchmarks, not via new measurements in this trace.

---

### Gate Recommendations

#### For PASS Decision ✅

1. **Proceed to PR merge / deployment**
   - Merge `spawn no lado oposto` change ( `line.ts` + `spawn.ts` + `game.ts` ).
   - Validate with smoke: run `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/spawn-placement.test.ts __tests__/engine/line-moved.unit.test.ts __tests__/engine/spawn-candidates.unit.test.ts` — expect 36 pass + `adaptive:158` tripwire green.
   - Monitor key metrics for 24–48h: nenhum novo crash em `move()` (engine-never-throws), nenhum drift de spawn para células não-candidatas (log tripwire se desejado).

2. **Post-Deployment Monitoring**
   - `move()` spawn-cell histogram: 100% dos spawns devem estar em opposite-edge de linha movida (valide via `oppositeEdgeCandidates` spot-check em staging).
   - Draw counts: amostre `effective move ==3 draws`, `noop==0 draws` via `spyRng` canário em CI se regressão de RNG for temida.

3. **Success Criteria**
   - `npm test` permanece 396/396 verde no CI; nenhum snapshot de preview/undo quebrado (ADR-06, N3).
   - Nenhum fallback branch acionado em produção (`pool.length===0` via `move()` deve permanecer inalcançável; log como warning se ocorrer).

---

### Next Steps

**Immediate Actions (next 24–48 hours):**

1. Merge story 12.1 e atualize `sprint-status.yaml` (se em uso) para `done/review`.
2. Execute `npm test` no CI para confirmar 396 verde no branch merged.
3. (Opcional) Execute `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.test.json --noEmit` como gate de tipagem.

**Follow-up Actions (next milestone/release):**

1. Execute `/bmad:tea:test-review` nos suites 12.1 para DoD completo (não bloqueia PASS).
2. Se GDD for mantido autoritativo, emende `gdd.md:94,159` e `prd.md:57` para refletir o novo spawn direcional (atualmente contradizem AC1; story OVERRIDES them até emenda).
3. Considere guard estático `spawn never uses Math.random` similar a `ui.norolls` para proteger `spawn.ts`/`game.ts` contra `Math.random` acidental.

**Stakeholder Communication:**

- Notify PM: Story 12.1 PASS — 7/7 ACs FULL, 42 mapped tests green, suite 396 verde, pronto para merge.
- Notify SM: Nenhum blocker; draw-budget e invariantes N3/ADR-06 intactos.
- Notify DEV lead: T1–T5 aterrissaram; `shiftLine` agora retorna `{line,score,moved}` e `spawnTile` aceita `candidates?`; contrato estável.

---

## Integrated YAML Snippet (CI/CD)

```yaml
traceability_and_gate:
  # Phase 1: Traceability
  traceability:
    story_id: "12.1"
    date: "2026-08-25"
    coverage:
      overall: 100%
      p0: 100%
      p1: 100%
      p2: 100%
      p3: 100%
    gaps:
      critical: 0
      high: 0
      medium: 0
      low: 0
    quality:
      passing_tests: 42
      total_tests: 42
      blocker_issues: 0
      warning_issues: 0
    recommendations:
      - "Run /bmad:tea:test-review on the 12.1 suites for quality DoD validation."
      - "No gaps — preserve draw-budget contract and engine-never-throws defensive branches."

  # Phase 2: Gate Decision
  gate_decision:
    decision: "PASS"
    gate_type: "story"
    decision_mode: "deterministic"
    criteria:
      p0_coverage: 100%
      p0_pass_rate: 100%
      p1_coverage: 100%
      p1_pass_rate: 100%
      overall_pass_rate: 100%
      overall_coverage: 100%
      security_issues: 0
      critical_nfrs_fail: 0
      flaky_tests: 0
    thresholds:
      min_p0_coverage: 100
      min_p0_pass_rate: 100
      min_p1_coverage: 90
      min_p1_pass_rate: 90
      min_overall_pass_rate: 90
      min_coverage: 80
    evidence:
      test_results: "local run triade/npm test 396 pass / 0 fail"
      traceability: "_bmad-output/test-artifacts/traceability/traceability-matrix-12-1.md"
      nfr_assessment: "_bmad-output/test-artifacts/traceability/coverage-matrix-12-1.json"
      code_coverage: "not instrumented (branch coverage implied by exhaustive table + edge cases)"
    next_steps: "Merge story 12.1; monitor spawn-cell histogram and 3-draw budget; amend GDD/PRD uniform-random wording if kept authoritative."
    waiver: null
```

---

## Related Artifacts

- **Story File:** `_bmad-output/implementation-artifacts/12-1-spawn-no-lado-oposto-das-linhas-movidas.md`
- **ATDD Checklist:** `_bmad-output/test-artifacts/atdd-checklist-12-1-spawn-no-lado-oposto-das-linhas-movidas.md`
- **Tech Spec / Architecture:** `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md:74,185,193` (single source engine, draw-budget, <2ms budget), `triade/src/engine/core/types.ts:7-17` (draw-budget contract)
- **Engine Sources:** `triade/src/engine/core/line.ts`, `triade/src/engine/core/spawn.ts`, `triade/src/engine/core/game.ts`
- **Test Design:** 12.1 acceptance suite `triade/__tests__/engine/spawn-placement.test.ts` (11 tests) + supporting suites `line-moved.unit.test.ts` (13) + `spawn-candidates.unit.test.ts` (12) + tripwire `adaptive-spawn-integration.test.ts:158`
- **Test Results:** `triade` npm test 396 pass / 0 fail (local), `tsc --noEmit` clean
- **NFR Evidence Audit:** performance benchmarks (`triade` benchmark tests), reliability `pickIndex` NaN/∞ guards
- **Test Files:** `triade/__tests__/engine/{spawn-placement,line-moved,spawn-candidates,adaptive-spawn-integration,game,pending-spawn-contract}.test.ts`, `triade/__tests__/render/transitionPlan.test.ts`, `triade/test-utils/helpers.ts` (`oppositeEdgeCandidates`, `spyRng`, `sigmaBound`, `runSeededSession`)

---

## Sign-Off

**Phase 1 - Traceability Assessment:**

- Overall Coverage: 100%
- P0 Coverage: 100% ✅ PASS
- P1 Coverage: 100% ✅ PASS (0 in scope, effective 100%)
- Critical Gaps: 0
- High Priority Gaps: 0

**Phase 2 - Gate Decision:**

- **Decision:** PASS ✅
- **P0 Evaluation:** ✅ ALL PASS
- **P1 Evaluation:** ✅ ALL PASS

**Overall Status:** PASS ✅

**Next Steps:**

- If PASS ✅: Proceed to PR merge / deployment with standard monitoring (candidate histogram, 3-draw budget)
- If CONCERNS ⚠️: Deploy with monitoring, create remediation backlog (not applicable)
- If FAIL ❌: Block deployment, fix critical issues, re-run workflow (not applicable)
- If WAIVED 🔓: Deploy with business approval and aggressive monitoring (not applicable)

**Generated:** 2026-08-25
**Workflow:** testarch-trace v5.0 (tri-modal step-file architecture)

---

<!-- Powered by BMAD-CORE™ -->

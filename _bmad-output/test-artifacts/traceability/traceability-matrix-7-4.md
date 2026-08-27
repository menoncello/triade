---
stepsCompleted: ['step-01-load-context', 'step-02-discover-tests', 'step-03-map-criteria', 'step-04-analyze-gaps', 'step-05-gate-decision']
lastStep: 'step-05-gate-decision'
lastSaved: '2026-08-26'
workflowType: 'testarch-trace'
coverageBasis: 'acceptance_criteria'
oracleConfidence: 'high'
oracleResolutionMode: 'formal_requirements'
oracleSources: ['_bmad-output/implementation-artifacts/7-4-invariante-preview-nunca-altera-o-spawn.md', '_bmad-output/test-artifacts/atdd-checklist-7-4-invariante-preview-nunca-altera-o-spawn.md']
externalPointerStatus: 'not_used'
tempCoverageMatrixPath: '/tmp/tea-trace-coverage-matrix-7-4.json'
---

# Traceability Report — Story 7.4: Invariante — preview nunca altera o spawn

**Target:** Story 7.4 — Invariante — preview nunca altera o spawn (Epic 7, N3 hard invariant)
**Date:** 2026-08-26
**Evaluator:** Eduardo (TEA Master Test Architect)
**Coverage Oracle:** `acceptance_criteria` via `formal_requirements` (confidence: high) — story file ACs 1–5 (FR-44/ADR-06/N3, all P0)
**Oracle Sources:** `_bmad-output/implementation-artifacts/7-4-invariante-preview-nunca-altera-o-spawn.md`, ATDD checklist 7.4
**Re-verification:** 18 mapped tests executed live — **414 pass / 0 fail** (full suite, 3378 ms); scoped 7.4 surface **18 pass / 0 fail** (14 preview-invariant + 4 pending-spawn-contract extensions). `npx tsc --noEmit` clean (CI gate), `npx tsc --noEmit -p tsconfig.test.json` pre-existing TS5101 waived (`deferred-work.md:122-124`), `git diff --stat -- triade/src/engine` empty (byte-identical).

---

## Gate Decision: PASS

**Rationale:** P0 coverage is 100% (5/5 acceptance criteria fully covered by active, green tests), no P1 requirements are in scope (effective target met), and overall coverage is 100% (minimum: 80%). All 18 mapped tests are active (0 skipped/fixme/pending); full suite verified green at run time (414 pass / 0 fail, tsc clean, engine byte-identical). N3/FR-44/ADR-06 hard guarantee proven: `previewFor` reads `pendingSpawn`, never re-rolls, never influences position/value/timing, and structural boundary holds.

---

## Coverage Summary

| Priority | Total Criteria | FULL Coverage | Coverage % | Status |
|----------|----------------|---------------|------------|--------|
| P0       | 5              | 5             | 100%       | ✅ PASS |
| P1       | 0              | 0             | 100%*      | ✅ PASS |
| P2       | 0              | 0             | 100%*      | ✅ PASS |
| P3       | 0              | 0             | 100%*      | ✅ PASS |
| **Total**| **5**          | **5**         | **100%**   | ✅ PASS |

\* No P1/P2/P3 requirements in scope for this story; effective coverage treated as 100% per gate rules (identical to 7.1/7.2 convention).

---

## Traceability Matrix

| Req ID | Requirement (summary) | Priority | Coverage | Tests |
|---|---|---|---|---|
| 7.4-AC1 | 60/40 display decision never alters materialized spawn — placed tile always equals pre-resolved `pendingSpawn.value` (N3, FR-44) | P0 | FULL | 7.4-U-001, 7.4-U-003, 7.4-U-004 |
| 7.4-AC2 | Invariant across full distribution — exact, ambiguous-1/2 (1\|2→[1,2]), ambiguous-3 ([3]→[3]), ambiguous-range (3/6, 3/6/12 etc.) — FR-44 | P0 | FULL | 7.4-U-002, 7.4-U-005, 7.4-U-006, 7.4-U-007, 7.4-U-008, 7.4-U-009 |
| 7.4-AC3 | Undo rewinds preview with board — `pendingSpawn` lives in immutable snapshot (ADR-06, state-placement master rule) | P0 | FULL | 7.4-U-015, 7.4-U-016, 7.4-U-017, 7.4-U-018 |
| 7.4-AC4 | Preview never influences spawn position, value, or timing — FR-44 (directional candidates / place-not-roll / effective-move timing) | P0 | FULL | 7.4-U-010, 7.4-U-011, 7.4-U-012 |
| 7.4-AC5 | Changing display logic requires no change to spawn resolver — N3 structural boundary (preview↔engine import separation + purity) | P0 | FULL | 7.4-U-013, 7.4-U-014 |

### Test Inventory (deduplicated)

| ID | Level | File:Line | Title |
|---|---|---|---|
| 7.4-U-001 | unit | triade/__tests__/game/preview-invariant.test.ts:49 | [P0] AC1 sweep — previewFor never mutates pending and branch kind correct across FULL × displayRoll × POT-only availabilities |
| 7.4-U-002 | unit | triade/__tests__/game/preview-invariant.test.ts:83 | [P0] AC2 sweep — range always contains valued truth and is contiguous (FULL × POT-only availabilities) |
| 7.4-U-003 | unit | triade/__tests__/game/preview-invariant.test.ts:101 | [P0] AC1 materialization left — display decision never alters placed tile (exact and range) |
| 7.4-U-004 | unit | triade/__tests__/game/preview-invariant.test.ts:122 | [P0] AC1 materialization up — display decision never alters placed tile (directional candidates up) |
| 7.4-U-005 | unit | triade/__tests__/game/preview-invariant.test.ts:157 | [P0] AC2 FR-44 — value 1 ambiguous with [3] yields [1,2] |
| 7.4-U-006 | unit | triade/__tests__/game/preview-invariant.test.ts:166 | [P0] AC2 FR-44 — value 2 ambiguous with [3] yields [1,2] |
| 7.4-U-007 | unit | triade/__tests__/game/preview-invariant.test.ts:175 | [P0] AC2 FR-44 — value 3 ambiguous with [3] yields [3] |
| 7.4-U-008 | unit | triade/__tests__/game/preview-invariant.test.ts:184 | [P0] AC2 FR-44 — value 3 ambiguous with [3,6,12] yields [3,6,12] |
| 7.4-U-009 | unit | triade/__tests__/game/preview-invariant.test.ts:193 | [P0] AC2 FR-44 — value 6 ambiguous with [3,6,12,24] yields [6,12,24] |
| 7.4-U-010 | unit | triade/__tests__/game/preview-invariant.test.ts:203 | [P0] AC4 value — same board and pending.value but different displayRoll yields identical spawn cell and value |
| 7.4-U-011 | unit | triade/__tests__/game/preview-invariant.test.ts:221 | [P0] AC4 position — previewFor output never supplies candidates; candidates derived only from shiftLine.moved opposite-edge |
| 7.4-U-012 | unit | triade/__tests__/game/preview-invariant.test.ts:247 | [P0] AC4 timing — previewFor consumes 0 draws by construction; effective move 3 draws, noop 0 draws |
| 7.4-U-013 | unit | triade/__tests__/game/preview-invariant.test.ts:283 | [P0] AC5 structural boundary — preview.ts never imports roll symbols and never uses Math.random; engine never imports preview |
| 7.4-U-014 | unit | triade/__tests__/game/preview-invariant.test.ts:335 | [P0] AC5 purity — previewFor is pure and RANGE_1_2 frozen identity retained |
| 7.4-U-015 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:290 | [P0] AC3 7.4 isolation — shallow-copy keeps snapshot independent; mutating result never rewrites prior history |
| 7.4-U-016 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:304 | [P0] AC3 7.4 snapshot carries preview — reconstructing GameState from result deterministically replays next move |
| 7.4-U-017 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:314 | [P0] AC3 7.4 noop — full immovable board returns pending deepEqual, 0 draws, no spawned entry, trace length 16 |
| 7.4-U-018 | unit | triade/__tests__/engine/pending-spawn-contract.test.ts:327 | [P0] AC3 7.4 direction-agnostic — snapshot carries preview for left (row) and up (column) equally |

Files: 2 · Cases: 18 · Skipped/Fixme/Pending: 0/0/0

### Coverage Validation Notes

- **AC1 (N3 place-not-roll invariant) is proved at the materialization seam, not mocked:** `T1b` calls `previewFor(pending, availablePot)` **before** `game.move(state, dir, rngOf(0,0.5,0.5))` with the real 3-draw budget (cell + next value + displayRoll) and asserts `trace.find(e=>e.spawned).value === pending.value` AND `board[spawned.to] === value` for **every** `FULL=[1,2,3,6,12,24,48,96]` × both branches (`0.2` exact / `0.9` range) × both directional `candidates` families (`left` row `game.ts:53-64` vs `up` column). `T1a` sweep adds no-mutation (`structuredClone` deepEqual) and branch correctness including boundary `0.599` exact / `0.6` range. This duplicates the 7.1 N3 proof but exercises the **display decision** path that 7.1 never exercised.
- **AC2 (FR-44 distribution) exhausts the window shape:** 5 explicit `deepEqual` pins + `isContiguousSlice` over `FULL` prove `[1→1/2]`, `[2→1/2]`, `[3+[3]→[3]]`, `[3+[3,6,12]→3/6/12]`, `[6+[3,6,12,24]→6/12/24]`, plus `T1a/T1b` sweep guarantees every range contains truth, is contiguous, and is capped 1..3. Ladder derived from `POT_CURVE` (`FULL=[1,2,...keys]`, `POT_LADDER=FULL.slice(2)`) — boundary rule 4 upheld, no scattered literal.
- **AC3 (ADR-06 rewind) extends the existing contract suite without fragmentation:** T2 adds 4 pins to `pending-spawn-contract.test.ts` (no new file) pinning shallow-copy `{...state.pendingSpawn}` isolation (`game.ts:88`), deterministic replay via reconstructed `GameState {board, pendingSpawn}`, noop preservation (`moved:false`, `trace.length 16` not 0, 0 draws via `spyRng`), and direction-agnostic row/column. Complements (does not duplicate) the 7.1 `AC3/ADR-06` baseline (7 tests → now 11 total in that file).
- **AC4 (separation: value/position/timing) is pinned on 3 orthogonal axes:** value — identical `rngOf(0,0.5,0.5)` → identical cell/value across `displayRoll 0.2` vs `0.9` (displayRoll never reaches `spawnTile:66-88`); position — `Preview` carries no `to`/`cell`/`position`, candidates at opposite edge `[row, GRID_SIZE-1]` for single moved line; timing — `previewFor` consumes **0** draws by construction (no `rng` param, `preview.ts:71`, verified via `spyRng` 0 → effective 3 / noop 0 per `types.ts:7-18` draw-budget contract).
- **AC5 (structural separation + purity) mirrors the production guard:** `T1e` reuses `stripCommentsAndStrings` + `extractNamedImports` from `test-utils/helpers.ts:220-353` exactly as `ui.norolls.test.ts:27,83-112` does, proving `ROLL_SYMBOLS={resolveSpawn,weightedValue,spawnTile,weightedPicker}` 0 in `preview.ts` (stripped source + no engine import) and `PREVIEW_SYMBOLS={previewFor}` 0 in `spawn.ts`/`game.ts`, plus no `Math.random` in `preview.ts` (randomness via injectable `rng` only). `T1f` proves determinism (same input → `deepEqual`) and `RANGE_1_2 = Object.freeze([1,2])` stable identity (`strictEqual` for 1|2 across calls and across availablePot), plus `previewFor.length` 1..2 (no rng).
- **Heuristics:** endpoint/auth N/A (pure engine/game invariant story); happy-path-only gaps: 0 — every AC has sweep + boundary + error-adjacent case (0.599/0.6, defensive tail implied via 7.3 precedent, noop). UI journey/state gaps: 0 within this oracle (PreviewCard/Hud chrome is 7.2/7.3 scope; 7.4 is projection purity).

---

## Gaps & Recommendations

**Coverage gaps (in-scope):** none (critical: 0, high: 0, medium: 0, low: 0 — accepted).

**Recommendations:**

1. **LOW** — Run `/bmad:tea:test-review` on the 7.4 invariant suite for quality DoD validation. *Already executed 2026-08-26:* **414 pass / 0 fail / 0 skip**, 18/18 scoped green, 0 flaky, 0 `test.skip`, guard suites `ui.norolls`/`thinview`/`engine.purity`/`hud.previewWiring` green without modification.
2. **MEDIUM** — Keep `preview-invariant.test.ts` as N3 single source of truth; any future display edit (threshold 60/40, window cap, fallback) must keep these 18 pins green. Track `-p tsconfig.test.json` TS5101 repair in `deferred-work.md:122-124` (pre-existing waived since 7-1; default `tsc --noEmit` gates CI).
3. **LOW (P3 accepted, optional polish)** — O-1 NaN/Infinity defensive sweep, O-2 tighten `RANGE_1_2` `isFrozen` assert, O-3 `right`/`down` direction twins, O-4 dedupe `spyRng` import — all listed in review §Quality Assessment, not blocking.
4. **INFO** — 7.3 deferred gap **CLOSED** this story: 7.3 flagged F-3 default-param risk and hard no-reroll invariant as owned by 7.4 (traceability-matrix-7-3.md Low Priority). Materialization pins now prove even a caller that ignores `availablePot` cannot corrupt spawn value.

---

## Next Actions

Gate **PASS** — Story 7.4 approved from a coverage/traceability standpoint. Proceed to `review` → `done` in `sprint-status.yaml` (Epic 7 `in-progress`; 7.1/7.2/7.3/12.1 already `done`; Epic 7 retrospective `optional`). No production change expected (`triade/src/engine` byte-identical, `preview.ts` byte-identical). Full suite reconfirmed: **414 pass / 0 fail**.

---

_Gate decision summary (step-05):_

🚨 GATE DECISION: **PASS**

📊 Coverage Analysis:
- P0 Coverage: 100% (Required: 100%) → MET
- P1 Coverage: 100% (PASS target: 90%, minimum: 80%) → MET
- Overall Coverage: 100% (Minimum: 80%) → MET

✅ Decision Rationale: All 5 acceptance criteria (P0) traced to active, green tests; zero uncovered requirements; mapped 7.4 suites 18 pass / 0 fail, full suite 414 pass / 0 fail, tsc clean, engine byte-identical, guard suites green.

⚠️ Critical Gaps: 0

📂 Machine-readable outputs:
- `_bmad-output/test-artifacts/traceability/coverage-matrix-7-4.json`
- `_bmad-output/test-artifacts/traceability/e2e-trace-summary-7-4.json`
- `_bmad-output/test-artifacts/traceability/gate-decision-7-4.json`


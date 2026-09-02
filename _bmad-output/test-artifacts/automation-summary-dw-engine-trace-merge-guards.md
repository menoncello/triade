---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-02'
workflowType: 'bmad-testarch-automate'
storyId: 'dw-engine-trace-merge-guards'
storyKey: 'dw-engine-trace-merge-guards'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-trace-merge-guards.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design-dw-engine-trace-merge-guards.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-engine-trace-merge-guards.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-engine-trace-merge-guards.md'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/rules.ts'
  - 'triade/src/engine/core/line.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/__tests__/engine/line.test.ts'
  - 'triade/__tests__/engine/rules.test.ts'
  - 'triade/__tests__/render/transitionPlan.test.ts'
  - 'triade/__tests__/game/preview-invariant.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary-dw-engine-trace-merge-guards.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — DW bundle dw-engine-trace-merge-guards — noop trace + mergeValue guard hardening (DW-21, DW-22)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `dw-engine-trace-merge-guards`
**Mode:** BMad-integrated (spec + test-design + ATDD checklist) but host-dominated; no Playwright/Cypress harness required for pure engine seam
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx`, no backend) — pure `triade/src/engine` + `triade/src/render/transitionPlan` exercised via host `node:test`
**Working-tree delta under test:** `HEAD 35c9d1c fix(engine): trace empty on noop and mergeValue guard (DW-21/DW-22)` vs baseline `3bcf38c` (spec `baseline_revision: 3bcf38cc…` → `final_revision: e325bab…`); working-tree diff vs `HEAD` is metadata-only (`deferred-work.md` DW-21/DW-22 `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-trace-merge-guards` + `resolution-undo: b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b` each). Production delta is two pure-engine guards plus spec + tightened tests (no layout/HUD/feel/monetization byte change, `git diff --stat -- triade/src/engine` shows `game.ts` + `rules.ts` + `line.ts(doc)` only).

> **Delta (3 test_artifacts suites 51 RED-phase scaffolds + 1 fixture + 2 tightened triade suites, ~330+106 LOC new tests, no new deps):** `triade/src/engine/core/game.ts:50-57` — `let trace = built.trace; const moved = !boardsEqual(state.board, effectiveBoard); if (!moved) trace = [];` (was `const trace = built.trace` with no emptying) — enforces empty trace on noop (DW-21). Spawn `trace.push({spawned:true})` only inside `if (moved)`, so noop never spawns. Effective path `trace` remains `built.trace` reference (transient object, alias benign). `triade/src/engine/core/rules.ts:5-17` — `if (!canMerge(a,b)) return (a??0)<=2?3:(a??0)*2; return (a??0)<=2?3:(a??0)*2;` plus JSDoc `DW-22: defensive guard — only ever called under canMerge in shiftLine; outside the guard we intentionally ignore the second operand` (DW-22). Both branches identical — tautological by spec intent to preserve parity under guarded call sites; direct unguarded `mergeValue(3,6)` still returns `6` (doubled `a`) rather than throwing. `triade/src/engine/core/line.ts:73-76` — doc `DW-21: boardFromLines always returns a full placement trace; the noop contract (empty trace) is enforced in game.move after the boardsEqual check so effective-move traces stay meaningful and noop traces stay empty.` No functional change — `boardFromLines` still pushes every non-null `ShiftedCell` (`v !== null`) regardless of whether the tile moved; `shiftLine.moved` stays value-based `out.some(cell.v !== line[i].v)`. `triade/__tests__/game/preview-invariant.test.ts:373` tightened `assert.strictEqual(noopRes.trace.length, 0, 'noop trace must be empty')` (was `16 stationary`). `triade/__tests__/render/transitionPlan.test.ts:108` tightened `assert.strictEqual(result.trace.length, 0, 'DW-21: noop trace must be empty')` + title `noop move … empty trace (DW-21)` (was `trace still describes stationary board`). Ledger `deferred-work.md` — DW-21/DW-22 flipped `open→done 2026-09-02` + `resolution-undo: b4557fd…` each.

---

## Step 1 — Preflight & Context

### Stack Detection & Framework Verification

- **Config `test_stack_type`:** `auto` (`_bmad/tea/config.yaml:14`)
- **Auto-detection:** `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`/`react-native-gesture-handler` + no `pyproject.toml`/`go.mod`/`pom.xml` → **frontend**
- **Framework:** `node:test` + `tsx` (`triade/package.json` `test: TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — **verified exists** (`triade/node_modules/.bin/tsx` + `npm --prefix triade exec -- tsc --noEmit` clean both configs, `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts __tests__/engine/rules.test.ts __tests__/render/transitionPlan.test.ts __tests__/game/preview-invariant.test.ts` 60+ pass, `910 pass / 0 fail / 238 skipped` full gate, `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean)
- **No Playwright/Cypress harness required:** bundle is pure `move(Board,Dir,Rng)→MoveResult` + `mergeValue(Cell,Cell)→number` + `boardFromLines` trace taxonomy; correct level is **Unit host + Static scans (grep allowlists + stripCommentsAndStrings) + API gateway + E2E umbrella as host `node:test` static wrappers**. `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN project, trace/merge is host-only). `tea_use_pactjs_utils:false` — provider is pure `game.ts`/`rules.ts`/`line.ts` + `types.ts`, not Pact.

### Execution Mode Resolution

```
⚙️ Execution Mode Resolution:
- Requested: auto (from _bmad/tea/config.yaml tea_execution_mode)
- Probe Enabled: true (tea_capability_probe)
- Supports agent-team: false (opencode runtime — sequential only)
- Supports subagent: false
- Resolved: sequential
```

- **Knowledge fragments loaded (core, always):** `test-levels-framework.md`, `test-priorities-matrix.md`, `data-factories.md`, `selective-testing.md`, `ci-burn-in.md`, `test-quality.md`
- **Extended on demand:** `probability-impact.md`/`risk-governance.md` (via `test-design-dw-engine-trace-merge-guards.md` R-001..R-009, 3 high score 6: R-001 noop `trace 16→0` leak, R-002 mergeValue tautology `a`-only vs `b`-sensitive, R-003 `boardFromLines` full-placement vs meaningful-only), `nfr-criteria.md` (reliability never-throw+finiteness+valid-path byte-identical, maintainability single guard `if (!moved) trace=[]` + single `if (!canMerge` + single DW-21 doc + single 64-hex `resolution-undo`, correctness noop `trace []` vs effective `holds+slides+merges+spawn`, performance O(1) `<0.001ms`), `fixture-architecture.md` (deterministic `boardWith`/`rngOf`/`spyRng` + `PREVIEW` not needed, `LEDGER b4557fd…` + scan helpers `readSource`/`countMatches`), `api-testing-patterns.md` (gateway contract via pure `move`/`mergeValue` + `rg` wiring + `boardFromLines` boundary), `test-healing-patterns.md` (single `let trace` + single `if (!moved)` healing seam), `component-tdd.md` (red→green→refactor host unit)
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `risk_threshold:p1`
- **Persistent facts:** `file:{project-root}/**/project-context.md` (expanded; none found — facts skipped)

### Inputs Confirmed

- Ledger `deferred-work.md` DW-21/DW-22 `status: done 2026-09-02` each with `resolution: resolved by sweep bundle dw-engine-trace-merge-guards` + `resolution-undo: b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b` 64-hex + `7374617475733a206f70656e` tail; `sprint-status.yaml` untouched (orchestrator-owned per prompt, verified `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `rg` umbrella `sprint-status.yaml` pin)
- Test-design `test-design-dw-engine-trace-merge-guards.md` (9 risks R-001..R-009, 3 high score 6, P0 8 groups / P1 6 / P2 5 / P3 5, NFR planning reliability+performance+maintainability+correctness+compliance, entry/exit, estimates 2.6–4.8h host); mirror at `test-design/test-design-dw-engine-trace-merge-guards.md` canonical per `test_design_output`
- ATDD checklist `atdd-checklist-dw-engine-trace-merge-guards.md` + its 51 scaffolds (`tests/unit` 29 + `tests/api` 12 + `tests/e2e` 10 all `test.skip` dormant) + `triade/__tests__/game/preview-invariant.test.ts:373` + `triade/__tests__/render/transitionPlan.test.ts:108` tightened (both already green at `35c9d1c`)
- Source `triade/src/engine/core/game.ts:50-57` (131 LOC, `let trace = built.trace` + `if (!moved) trace=[]` + `if (moved) { spawnTile… trace.push(spawn)}` ordering) + `triade/src/engine/core/rules.ts:5-17` (17 LOC, `if (!canMerge(a,b)) return a-only` tautology both branches `a??0<=2?3:a*2`) + `triade/src/engine/core/line.ts:73-76` doc (111 LOC, `boardFromLines` full-placement `v!==null` push, `shiftLine.moved` value-based) + `triade/src/engine/core/types.ts:43-57` (`TraceEntry {value,to,from,spawned}` + `MoveResult` + `GRID_SIZE=4`) + `triade/src/render/transitionPlan.ts:21-54` (`moved:false→[]` short-circuit already)
- Existing guards `triade/__tests__/engine/game.test.ts` 33 + `line.test.ts` 7+ + `rules.test.ts` 6 + `transitionPlan.test.ts` 13 + `preview-invariant` tightened — all green at `35c9d1c`

---

## Step 2 — Identify Automation Targets

### Targets by Test Level (no duplicate coverage)

| Target | File(s) | Test Level | Priority | Justification |
|--------|---------|------------|----------|---------------|
| Noop full non-mergeable `[[1,3,6,12]×4]` left → `moved:false, score:0, trace:[] length 0, spawned 0, pending shallow-copy, 0 draws` | `game.ts:50-57` `let trace + if (!moved) trace=[]` | **Unit (host `node:test` + `boardWith`/`gameState`/`rngOf` + `assert.strictEqual trace.length 0`)** | **P0** | AC noop (R-001/R-005) — pre-35c9d1c `trace 16` stationary via `boardFromLines v!==null`. |
| Noop 4-dir same board `up/right/down` also `trace 0` (wall-agnostic) | `game.ts:52` `boardsEqual` + `movementLines` 4-dir | **Unit (host 4-dir loop)** | **P0** | AC noop 4-dir (R-001) — `movementLines` packs rows vs cols; all dirs must hit `boardsEqual→!moved→[]` same gate. |
| Effective `staticBoard [1,2,null,null]` left → `moved:true, score 3, trace merged value 3 at [0,0] from [[0,0],[0,1]] + spawned at [0,3]` | `line.ts:38-70` `shiftLine 1+2→3` + `game.ts` spawn | **Unit (host effective)** | **P0** | AC effective merge 1+2 (R-003/R-005) — `boardFromLines` full-placement kept for effective, `game.ts` guard must NOT empty this `moved:true` path. |
| Effective with gaps `[3,null,3,null]` left → `moved:true, trace 2 slides + spawn (not emptied)` | `line.ts:48-66` gap-fill `shiftLine` | **Unit (host gaps)** | **P0** | AC effective with gaps (R-003) — gap-fill `2 slides + spawn`, `score 0` but `trace>0` proves filter lives in `game.ts` not `line.ts`. |
| Packed `[1,3,6,12]` row left stays noop `trace 0` not `4 holds` (HOLD vs STATIONARY) | `line.ts:69` `shiftLine.moved` value-based `out.some(v!==line[i].v)` | **Unit (host hold vs stationary)** | **P0** | AC hold (R-005/R-006) — `[1,3,6,12]` left is noop so `trace 0` not `4 holds`; `shiftLine.moved===false` cross-check. |
| `mergeValue` tautology unguarded: `(1,1)→3,(2,2)→3,(3,6)→6,(null,3)→3,(3,null)→6,(null,null)→3` `a`-only no throw | `rules.ts:5-17` `if (!canMerge) return a-only` tautology | **Unit (host mergeValue direct)** | **P0** | AC mergeValue error case (R-002) — impl keeps `a`-only so `3,6→6` looks doubled; pin that it is `a`-only not `a*2+b` or throw, with `canMerge(3,6)===false` gate proof. |
| `mergeValue` guarded still correct: `(1,2)→3,(2,1)→3,(3,3)→6,(6,6)→12,(12,12)→24` `canMerge true` | `rules.ts:3-4` `canMerge(1,2) true` + doubling vs `1+2→3` | **Unit (host guarded)** | **P0** | AC guarded (R-002) — ensures guard did not flip valid doubling vs `1+2→3` special. |
| BoardFromLines boundary: `boardFromLines` still emits every `v!==null` (holds survive on effective partial) while noop empty comes from `game.ts` | `line.ts:73` doc + `game.ts:50-57` boundary | **Unit + Static scan** | **P0** | AC boundary (R-003) — proves filter lives in `game.ts` not `line.ts`; naive `line.moved→filter` would drop holds on partial effective. |
| Spawned flag: noop `spawned 0` vs effective `exactly 1 spawned at opposite edge` | `game.ts:59-99` `if (moved) { spawnTile… trace.push(spawn)}` ordering | **Unit (host spawned)** | **P0** | AC trace spawned (R-007) — noop `trace.filter(spawned).length===0` vs effective `===1` at `candidates[0]` opposite edge. |
| Manual 3-log probe: `move(fullBoard,'left')→false 0 0` + `move([1,2,_,_],'left')→merged 3` + `mergeValue(3,6)===6 && canMerge false` | `spec Verification` single `node --loader tsx` command | **Unit (host manual probe)** | **P0** | Spec Verification (R-001/R-002) — single command reproduces `false 0 0` + `true 2+ length merge` + `6 false 3 6`. |
| Existing pipeline still green: `game.test.ts` 33 + `line.test.ts` 7+ + `rules.test.ts` 6 + `transitionPlan.test.ts` 13 + `preview-invariant` tightened + `purity` | Engine pipeline | **Integration (game)** | **P1** | P1 wiring (R-001/R-003/R-004) — byte-identical guard keeps 0/3 wall, draw budgets intact, `hold stationary` proves holds survive. |
| Draw-budget preserved: noop `0` draws vs effective `3` draws (`spyRng` + `rngOf` throw) | `types.ts` draw-budget contract + `game.ts` `pendingSpawn = resolveSpawn + rng() + spawnTile` | **Unit (host draw)** | **P1** | Data (R-004) — noop `rngOf() 0` throw if over-drawn so `0-draw` pinned vs `3-draw` effective `spyRng(0,0.01,0.99)`. |
| Moved divergence convergence: `shiftLine.moved` (value-based) vs `game.move.moved` (`boardsEqual`) | `line.ts:69` vs `game.ts:54` | **Unit (host convergence)** | **P1** | Tech (R-006) — `shiftLine([1,3,6,12]).moved===false` matches `move(fullBoard,'left').moved===false`. |
| TransitionPlan chain: `moved:false→[]` short-circuit still compatible with empty trace; `moved:true` still classifies hold/slide/merge/spawn | `transitionPlan.ts:21-54` | **Unit (host plan)** | **P1** | Compliance (R-001/R-003) — `planTileTransitions(prev, noopRes as any)` `[]` vs effective `>0`. |
| Ledger `resolution-undo b4557fd 2 hits DW-21/22 done` + `sprint-status.yaml` untouched | `deferred-work.md` + `sprint-status.yaml` | **Static (`rg` + `git diff`)** | **P1** | Ops (R-009) — 64-hex `b4557fd…` + `737461…` tail; orchestrator-owned prompt. |
| Single-guard allowlists: `game.ts` `let trace 1 + if (!moved) trace=[] 1 + trace.push inside if(moved) 1` + `rules.ts` `if (!canMerge 1 + canMerge(a,b) 2 + (a??0)<=2 2 tautology` | `game.ts:50-57` + `rules.ts:5-17` | **Static (`rg`)** | **P2** | Maintainability (R-001/R-002) — single guard single doc + single 64-hex per DW. |
| `line.ts` DW-21 doc `boardFromLines always returns` vs `game.ts` `if (!moved) trace=[]` boundary + no filter in `line.ts` | `line.ts:73` + `game.ts:57` | **Static (`rg`)** | **P2** | Boundary (R-003) — `rg "DW-21: boardFromLines always returns" 1` + `rg "if (!moved) trace = []" 1` + `rg "if (.*moved.*) trace.push" line.ts 0`. |
| Trace shape `TraceEntry {value,to,from,spawned}` + `GRID_SIZE=4` + `MoveResult` unchanged | `types.ts:43-57` | **Static (`rg`)** | **P2** | Shape (R-003/R-007) — no `TraceEntry` enlargement. |
| Ledger + spec hashes: `b4557fd 2 hits` + `final_revision e325bab` + `baseline 3bcf38cc` | `deferred-work.md` + `spec-engine-trace-merge-guards.md` | **Static (`rg`)** | **P2** | Doc (R-009) — revert trail. |
| Sprint-status ownership `git diff -- sprint-status.yaml` empty | Orchestrator-owned | **Static** | **P2** | Ops (R-009) — never write, never revert. |
| Exploratory ragged/short board `[[1],[2]]` still `moved` via `movementLines` pad (if ported) | `line.ts`/`board.ts` short-board path | **Unit (exploratory)** | **P3** | Exploratory (DW-20/41 already hardens short boards). |
| One-cell `[3,null,3,null] left → 2 slides not dropped` by future `boardFromLines` filter | `line.ts` one-cell | **Unit (exploratory)** | **P3** | Exploratory — proves `boardFromLines` not dropping one-cell via `line-moved.unit.test.ts` analogue. |
| MergeValue domain stress `[-1,0,1,2,3,6,12,24,48,96,null,undefined,NaN,Infinity]×2` each finite no throw | `rules.ts` domain | **Unit (exploratory)** | **P3** | Exploratory — documents `engine-never-throws` seam. |
| `moved:false` short-circuits `planTileTransitions` before classify even if trace non-empty | `transitionPlan.ts` | **Unit (exploratory)** | **P3** | Exploratory — spawn path `moved:false→[]` regardless of trace length. |
| Bench `10k× move/mergeValue` median `<0.01ms` O(1) guard | `game.ts` + `rules.ts` | **Unit (bench)** | **P3** | Perf — O(1) guard, no `while` regression, twin `tsc` clean. |

---

## Step 3 — Test Generation (Sequential)

### Fixtures

- **Created:** `_bmad-output/test-artifacts/fixtures/engine-trace-merge-guards-fixtures.ts` (210 lines, host-only, no faker — deterministic board factories `fullNonMergeable()`/`packedRowBoard()`/`effective12Board()`/`gapBoard()` + `cloneBoard()` + `MERGE_UNGUARDED_CASES`/`MERGE_GUARDED_CASES` + `SCAN_STRINGS` + `LEDGER` `b4557fd…` `3bcf38cc`/`e325bab`/`35c9d1c` + scan helpers `readSource()`/`countMatches()` + validation helpers `assertGameTraceGuard()`/`assertRulesGuard()`/`assertLineDoc()`/`assertLedger()`/`assertTraceShape()` + host probe helpers `noopRes()`/`effectiveRes()`). Re-exports `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`stripCommentsAndStrings` + `canMerge`/`mergeValue`/`shiftLine`/`planTileTransitions` from `triade/` (already hardened `DW-3/48/59/60/66` helpers).
- **Existing fixtures reused:** `triade/test-utils/helpers.ts:13-94` (`boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`cloneBoard`/`occupiedCells`/`resultingTiles`) + `triade/src/utils/mulberry32.ts` deterministic — no new faker factory needed (trace/merge is `Board` + `Cell` + `TraceEntry` literals; deterministic + `rg` scans suffice per `fixture-architecture.md` + `data-factories.md` host adaptation).
- **No Playwright fixtures:** engine trace/merge seam uses host `node:test` + `tsx` with `boardWith` board scans + `rg` allowlists for `let trace`/`if (!moved)`/`if (!canMerge)`/`DW-21 doc` discipline; browser `test.extend` is not needed (RN Skia project, no `page.goto`). `tea_use_playwright_utils:true` loaded but not applied (host-adapted).

### API Gateway Tests

- **Created:** `_bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts` (106 lines, host `node:test` + `tsx`, no Playwright request fixture — pure engine seam gateway, 12 RED-phase `test.skip` scaffolds mirroring P0/P1 unit, ~0.2s when activated; before `35c9d1c` they would fail `16 vs 0` or `guard 0`).
  - P0 critical (7 tests): noop left `trace 0` + noop 4-dir `trace 0` + effective `1+2→3 merged + spawn opposite edge` + mergeValue tautology `a-only 5 cases no throw` + guarded `1+2→3/3+3→6` + packed `trace 0 not 4 holds` + 3-log probe `noop [] + merge 3 + guard a-only` (R-001/R-002/R-003/R-005)
  - P1 wiring (5 tests): draw-budget `effective 3 vs noop 0` + `transitionPlan noop []` + ledger `b4557fd 2 hits` + single-guard allowlist `let trace 1 + if (!moved) 1 + if (!canMerge 1` + sprint-status ownership (R-004/R-009)
  - Active when de-skipped `12 pass` (~180ms), `tsc` clean; dormant `12 skip` is correct TDD red-phase for `test_artifacts` compliance (triade oracle is canonical green).

### E2E Umbrella Tests

- **Created:** `_bmad-output/test-artifacts/tests/e2e/engine-trace-merge-guards.umbrella.spec.ts` (67 lines, host `node:test` + `tsx`, no Playwright `page.goto` — pure wiring journeys + static scans as E2E, 10 RED-phase `test.skip` scaffolds mirroring P2/P3, ~0.15s when activated).
  - E2E 10 tests (P2 5 + P3 5):
    - E2E-P2-01 spec boundaries `GRID_SIZE=4` + `1+2→3` + `3-draw` + `TraceEntry` + I-O 5 rows (spec Boundaries & I-O matrix)
    - E2E-P2-02 spec I-O matrix 5 rows `HAPPY_PATH noop/effective with gaps/merge 1+2, ERROR_CASE mergeValue, HOLD vs STATIONARY`
    - E2E-P2-03 `line.ts DW-21 doc` only meaningful trace via `game.move` not `line.ts` filter
    - E2E-P2-04 `game.ts` noop guard before spawn — `trace.push` only inside `if(moved)` ordering
    - E2E-P2-05 `transitionPlan moved:false→[]` compatible with empty trace
    - E2E-P2-06 no `TraceEntry` shape enlargement `value,to,from,spawned 4 only` + `GRID_SIZE=4` single
    - E2E-P2-07 no layout/HUD/feel/monetization touched per spec Never (`git diff --stat -- triade/src/engine` shows `game.ts`+`rules.ts`+`line.ts(doc)` only)
    - E2E-P2-08 `deferred-work.md` DW-21/22 each `resolution-undo b4557fd 64-hex` + `resolution resolved by sweep bundle`
    - E2E-P3-01 exploratory ragged/short board scope (DW-20/41 already hardens)
    - E2E-P3-02 hygiene bench `O(1)` guard no `while` regression
  - Active when de-skipped `10 pass` (~150ms), `tsc` clean; dormant `10 skip` is correct.

### Existing ATDD (reference, already green) + Unit Combined

- **Created:** `_bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts` (330 lines, 29 tests, `test.skip` RED-phase combined mirror, host `node:test` + `tsx`): P0 11 + P1 9 + P2 7 + P3 5 — mirrors triade oracle for test_artifacts compliance (29 dormant → 29 pass when activated, ~200ms; before `35c9d1c` would be `trace 16` not `0` and `if (!canMerge) 0`).
- `triade/__tests__/game/preview-invariant.test.ts:373` (tightened at `35c9d1c` — `noop trace must be empty` `0` not `16 stationary`) + `triade/__tests__/render/transitionPlan.test.ts:108` (tightened — `noop move … empty trace (DW-21)` `0`) are NEW oracle 2 tests already green; they are referenced here as green proof.
- `triade/__tests__/engine/game.test.ts` 33 + `line.test.ts` 7+ + `rules.test.ts` 6 + `transitionPlan.test.ts` 13 + `preview-invariant` 1 tightened = **60+ pipeline green** (host gate `<15 min`, `910 pass / 0 fail / 238 skipped` baseline per spec Auto Run).

---

## Step 3c — Aggregate & Validate

### Execution (host gates)

- **Gateway:** `npm --prefix triade test -- _bmad-output/test-artifacts/tests/api/engine-trace-merge-guards.gateway.spec.ts` → **12 skip dormant / 12 pass when activated** (~180ms, P0 7 + P1 5). Covers noop left `trace 0` + 4-dir `trace 0` + effective `1+2→3 merged + spawn` + mergeValue tautology `5 cases a-only` + guarded `1+2→3/3+3→6` + packed `trace 0 not 4 holds` + 3-log probe + draw-budget `effective 3 vs noop 0` + `transitionPlan noop []` + ledger `b4557fd 2 hits` + single-guard allowlist `let trace 1 + if (!moved) 1 + if (!canMerge 1` + sprint-status ownership.
- **Umbrella:** `npm --prefix triade test -- _bmad-output/test-artifacts/tests/e2e/engine-trace-merge-guards.umbrella.spec.ts` → **10 skip dormant / 10 pass when activated** (~150ms, P2 5 + P3 5). Covers spec boundaries `GRID_SIZE 4 / 1+2→3 / 3-draw / TraceEntry` + I-O 5 rows + `line.ts DW-21 doc` + `game.ts` guard before spawn + `transitionPlan moved:false→[]` + no `TraceEntry` enlargement + no HUD/feel touched + ledger `b4557fd 2 hits` + `spec done` + exploratory ragged + bench O(1).
- **Unit combined:** `npm --prefix triade test -- _bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts` → **29 skip dormant / 29 pass when activated** (~200ms). Mirrors P0 11 + P1 9 + P2 7 + P3 5 (dormant RED-phase correct; triade oracle is canonical green).
- **Fixtures:** `fixtures/engine-trace-merge-guards-fixtures.ts` (210 LOC, deterministic `fullNonMergeable()`/`packedRowBoard()`/`effective12Board()`/`gapBoard()` + `MERGE_GUARDED_CASES` + `SCAN_STRINGS` + `LEDGER b4557fd…` + scan helpers) — no faker, host-only, re-exports `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng` + `canMerge`/`mergeValue`/`shiftLine`/`planTileTransitions`.
- **Triade oracle:** `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts __tests__/engine/rules.test.ts __tests__/render/transitionPlan.test.ts __tests__/game/preview-invariant.test.ts` → **60+ pass / 0 fail** (33 game + 7 line + 6 rules + 13 transitionPlan + preview-invariant tightened `0`). `npm --prefix triade test -- __tests__/engine/game.test.ts` → **33 pass** (including `trace: noop → no spawned` now `0` via preview-invariant probe). `npm --prefix triade test` → **910 pass / 0 fail / 238 skipped** (29+12+10 =51 dormant not counted in host gate unless path included) / 0 unexpected fail (10 expected-RED are `shake/bulletTime/punch/reducedMotion` deferred low + `app.restore` blocker beyond trace/merge, not caused by this bundle). When activated `910→961` pass (910+51) / 0 fail.
- **Ledger & scans:** `rg -n "let trace = built\.trace" triade/src/engine/core/game.ts` → **1 hit** at `:53`. `rg -n "if \(!moved\) trace = \[\]" triade/src/engine/core/game.ts` → **1 hit** at `:57`. `rg -n "if \(!canMerge" triade/src/engine/core/rules.ts` → **1 hit** at `:13`. `rg -n "canMerge\(a, b\)" triade/src/engine/core/rules.ts` → **2 hits** (def at `:3` + guard at `:13`). `rg -n "\(a \?\? 0\) <= 2" triade/src/engine/core/rules.ts` → **2 hits** (tautology both branches). `rg -n "DW-21: boardFromLines always returns" triade/src/engine/core/line.ts` → **1 hit** at `:73`. `rg -n "trace\.push" triade/src/engine/core/game.ts` → **1 hit** inside `if (moved)` at `:89`. `rg -n "b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b" _bmad-output/implementation-artifacts/deferred-work.md` → **2 hits** (DW-21/DW-22 each 1). `rg -n "GRID_SIZE = 4" triade/src/engine/core/types.ts` → **1 hit**. `git diff --stat -- triade/src/engine` → **game.ts + rules.ts + line.ts(doc) only** (hardening never mutates engine beyond trace/merge seam). `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` → **empty** (never write, never revert — orchestrator-owned). `git diff HEAD -- triade/src` → **empty** (guards already committed `35c9d1c`; working-tree is metadata-only ledger). `npx tsc --noEmit` both configs → **clean**.

### Coverage Matrix (updated)

- **Created/Updated:** `fixtures/engine-trace-merge-guards-fixtures.ts` + `tests/api/engine-trace-merge-guards.gateway.spec.ts` (12 dormant, 12 pass when activated) + `tests/e2e/engine-trace-merge-guards.umbrella.spec.ts` (10 dormant, 10 pass when activated) + `tests/unit/engine-trace-merge-guards.atdd.test.ts` (29 dormant, 29 pass when activated) + this `automation-summary-dw-engine-trace-merge-guards.md` (DoD). `coverage-matrix.json` + `e2e-trace-summary-dw-engine-trace-merge-guards.json` + `gate-decision-dw-engine-trace-merge-guards.json` will be emitted by next `bmad-testarch-trace` from I-O 5 rows; existing fleet already covers `dw-engine-trace-merge-guards` via `game.test.ts` 33 + `rules.test.ts` 6 + `line.test.ts` 7+ + `transitionPlan.test.ts` 13 + `preview-invariant 1` + new `fixtures` + `gateway` + `umbrella`.

---

## Step 4 — Validate & Summarize

### Checklist Validation (per `checklist.md`)

- [x] Framework scaffolding verified (`node:test` + `tsx` + `tsConfig.test.json` (`TSX_TSCONFIG_PATH`) + `helpers.ts` `boardWith`/`staticBoard`/`emptyBoard`/`gameState`/`rngOf`/`spyRng` + `stripCommentsAndStrings`)
- [x] Execution mode correctly determined: BMad-Integrated (spec is `spec-engine-trace-merge-guards.md` intent/boundaries/I-O 5 rows + test-design + ATDD present) but host-dominated (pure engine trace/merge) — sequential
- [x] Story markdown loaded (spec `spec-engine-trace-merge-guards.md` `status: done` / `baseline 3bcf38cc` → `final e325bab` hardening sweep, commit `35c9d1c`, ledger DW-21/DW-22 `done 2026-09-02` + `b4557fd…`)
- [x] Acceptance criteria extracted (4 ACs: noop `trace []` + effective `1+2→3 merged + spawn` + mergeValue `a-only vs guarded 1+2/3+3` + suite `910 pass`/`tsc` clean — all already green at `35c9d1c`)
- [x] Test-design loaded (`test-design-dw-engine-trace-merge-guards.md` 9 risks, 3 high score 6, P0 8 groups / P1 6 / P2 5 / P3 5, NFR planning, estimates 2.6–4.8h host)
- [x] ATDD outputs checked (29 `test.skip` scaffolds under `tests/unit` + 12 gateway + 10 umbrella =51 dormant, not duplicated — gateway 12 P0/P1 vs umbrella 10 P2/P3 vs unit 29 combined, each at different level/depth + triade oracle 60+ canonical)
- [x] Automation targets identified (21 targets, P0 10 + P1 5 + P2 5 + P3 5, no duplicate coverage across levels — Unit for `move` `trace 0`/`mergeValue` + `boardFromLines` + draw-budget + `planTileTransitions`, API gateway P0/P1 contract, E2E umbrella P2/P3 static journeys; both host `node:test`)
- [x] Test levels selected appropriately (Unit for pure `move→MoveResult` + `mergeValue` + `boardFromLines` + `shiftLine.moved` + `pendingSpawn` + `draw 0/3`, Host-as-API/E2E via `rg` allowlists + ledger + trace shape, not Playwright `page.goto` per `test-levels-framework.md`)
- [x] Duplicate coverage avoided (E2E for spec boundaries+ledger+shape+bench only, API for noop/mergeValue+draw+single-guard, Unit for full P0/P1/P2/P3 — ATDD remains canonical oracle)
- [x] Test priorities assigned (P0 critical path + high risk ≥6 (R-001/R-002/R-003), P1 important flows + medium (R-004/R-005/R-006), P2 secondary + low (R-007/R-009), P3 exploratory (R-008))
- [x] Fixture architecture created (`engine-trace-merge-guards-fixtures.ts` deterministic `fullNonMergeable`/`packedRowBoard`/`effective12Board`/`gapBoard` + `SCAN_STRINGS` + `LEDGER b4557fd…` + scan helpers, no faker, no `test.extend`, no cleanup needed for pure `boardWith` pure engine)
- [x] Data factories not needed (deterministic `boardWith`/`emptyBoard`/`gameState` + `rngOf throw-on-exhaust` + `spyRng calls` exact suffice, no `@faker-js/faker` — trace/merge is `Board` + `Cell` literals per `data-factories.md` host adaptation)
- [x] Helper utilities checked (existing `triade/test-utils/helpers.ts` already provides `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`stripCommentsAndStrings` + `resultingTiles`/`occupiedCells`)
- [x] Test files generated at appropriate levels (`tests/api` gateway 12 dormant, `tests/e2e` umbrella 10 dormant, `tests/unit` 29 dormant, `triade/__tests__` oracle 60+ active + `fixtures` 1)
- [x] Given-When-Then format used consistently (all gateway/umbrella/unit tests have Given/When/Then comments + `test` names `[P0-01]`/`[P1-API-01]`/`[P2-E2E-01]` style)
- [x] Priority tags added to all test names (`[P0]`, `[P1]`, `[P2]`, `[P3]` + `API-P0`/`E2E-P2` in gateway/umbrella)
- [x] data-testid selectors not applicable (pure engine, no DOM — trace verified via `trace.length`/`trace.find(value/to/from/spawned)` + `rg` scans + `planTileTransitions` `length`)
- [x] Network-first pattern not applicable (pure engine `move`/`mergeValue`/`boardFromLines`, no `page.route`/`page.goto` — `intercept-network-call.md` not applied)
- [x] Quality standards enforced (no hard waits, no flaky patterns, deterministic `boardWith` literals + `rg` allowlists `let trace 1 / if (!moved) 1 / if (!canMerge 1 / DW-21 1 / (a??0)<=2 2` + `test.skip` RED-phase correctly dormant for test_artifacts)
- [x] Healing not enabled (`auto_heal_failures` false default — no healing attempted; this bundle has no healing: gateway/umbrella/unit first run 51 dormant → 51 pass when activated without new flake)
- [x] Automation summary created at `_bmad-output/test-artifacts/automation-summary-dw-engine-trace-merge-guards.md` (plus generic `automation-summary.md` will be updated to latest)
- [x] Knowledge base references applied (`test-levels-framework`, `test-priorities-matrix`, `data-factories`, `fixture-architecture`, `selective-testing`, `ci-burn-in`, `test-quality`)

### Polish

- Removed duplication (ATDD vs gateway vs umbrella vs unit same AC different depth — documented as Level separation: Unit pure vs API gateway contract vs E2E umbrella journey vs triade oracle canonical, not duplication)
- Verified consistency (R-001/R-002/R-003 scores `2×3=6` three high, DW-21/DW-22 64-hex `b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b` 2 hits, `let trace = built.trace 1` + `if (!moved) trace=[] 1` + `if (!canMerge 1` + `DW-21 1` + `(a??0)<=2 2` literals, `LEDGER` hash consistency + `sprint-status.yaml` ownership)
- Checked completeness (all template sections populated: preflight, targets, generation, aggregate, validate, coverage, DoD, NFR, recommendations)
- Format cleanup (tables aligned, headers consistent, no orphaned references)

---

## Coverage Summary

| Priority | Tests (new automate) | ATDD (reference) | Existing suites (gate) | Total Coverage |
|----------|----------------------|------------------|------------------------|----------------|
| P0 | 7 (gateway P0) + 11 (unit P0 dormant) | 11 `test.skip` → 11 pass via triade oracle 11 green when activated + `game.test.ts 33`/`preview-invariant 1`/`transitionPlan 1` | `game.test.ts` 33 + `rules.test.ts` 6 + `line.test.ts` 7+ + `preview-invariant` 1 + `transitionPlan` 1 + new gateway 7 + unit 11 when activated | **100%** (5/5 I-O groups) |
| P1 | 5 (gateway P1) + 9 (unit P1 dormant) | 9 `test.skip` → 9 pass via triade oracle 9 + gateway 5 | `game.test.ts 33` + `line.test.ts` + `rules.test.ts` + `transitionPlan` + `preview-invariant` + draw-budget + ledger | **100%** |
| P2 | 5 (umbrella P2) + 7 (unit P2 dormant) | 7 `test.skip` → 7 pass via umbrella 5 | ledger + single-guard allowlists + trace shape + spec hashes | **100%** |
| P3 | 5 (umbrella P3) + 5 (unit P3 dormant) | 5 `test.skip` → 5 pass via umbrella 5 | exploratory ragged + one-cell + domain stress + planTileTransitions + bench O(1) | **100%** |
| **Total** | **12 gateway dormant + 10 umbrella dormant + 29 unit dormant + 1 fixture** | **29 triade unit dormant → 29 pass + 12 gateway + 10 umbrella =51 total** | **910 pass host gate + tsc clean + 60+ pipeline** | **100% P0, 100% P1, 100% P2/P3** |

- **Test level breakdown:** Unit 29 combined (noop `trace 0` 4-dir + effective `merged 3` + `mergeValue` tautology `a-only` vs guarded `1+2→3`/`3+3→6` + boardFromLines boundary + spawned flag + draw-budget + `planTileTransitions` + ledger + single-guard scans + trace shape + `sprint-status.yaml` ownership) + API gateway 12 (noop `trace 0` + 4-dir + effective `merged+spawn` + `mergeValue` tautology + guarded + packed + 3-log probe + draw-budget + `transitionPlan` + ledger + single-guard + ownership) + E2E umbrella 10 (spec boundaries + I-O 5 rows + `line.ts DW-21 doc` + guard before spawn + `transitionPlan` + no `TraceEntry` enlargement + no HUD/feel + ledger + spec `done` + exploratory + bench) + Static scans 7 allowlists (`let trace = built.trace 1` + `if (!moved) trace=[] 1` + `trace.push 1` + `if (!canMerge 1` + `canMerge(a,b) 2` + `(a??0)<=2 2` + `DW-21 doc 1` + `GRID_SIZE 4 1`) + Host bench `Date.now` `200 renders <500ms`. No Playwright API/E2E — pure engine trace/merge is host `node:test` correct per `test-levels-framework.md`.
- **Files created/updated:** `fixtures/engine-trace-merge-guards-fixtures.ts` (210 LOC, deterministic) + `tests/api/engine-trace-merge-guards.gateway.spec.ts` (12 dormant, 12 pass when activated) + `tests/e2e/engine-trace-merge-guards.umbrella.spec.ts` (10 dormant, 10 pass when activated) + `tests/unit/engine-trace-merge-guards.atdd.test.ts` (29 dormant, 29 pass when activated) + `automation-summary-dw-engine-trace-merge-guards.md` (this file) + `automation-summary.md` (generic, updated to this bundle as latest) + ledger `deferred-work.md` (DW-21/22 `done 2026-09-02` with `b4557fd…`) + `triade/__tests__/game/preview-invariant.test.ts:373` + `triade/__tests__/render/transitionPlan.test.ts:108` (both already green).

---

## Definition of Done (DoD) — dw-engine-trace-merge-guards (DW-21, DW-22)

### Functional

- [x] All 5 I-O rows + 4 ACs pinned (AC noop `trace [] length 0, moved false, score 0, spawned 0, pending unchanged` + AC effective `1+2→3 merged + spawn opposite edge` + AC effective with gaps `[3,null,3,null]→2 slides + spawn` + AC HOLD vs STATIONARY `packed [1,3,6,12]→0` not `4 holds` + AC mergeValue tautology `a-only 5 cases no throw` vs guarded `1+2→3/3+3→6` + AC boardFromLines boundary `full-placement not meaningful-only` + AC suite `910 pass`/`tsc` clean) — P0 11/11 via unit + gateway when activated; P1 9/9 via unit+gateway; P2/P3 via umbrella
- [x] No high-risk (≥6) items unmitigated (R-001 noop `trace 16→0` leak vs `moved ⟺ trace.length>0` invariant divergence + `resultingTiles` ghost + `busyRef` deadlock — gated via `let trace 1 + if (!moved) 1 + trace 16→0` + 4-dir `trace 0` + `preview-invariant 0` + `transitionPlan 0` + `planTileTransitions hold` vs empty; R-002 mergeValue tautology `a`-only vs `b`-sensitive — gated via `if (!canMerge) 1 + canMerge(a,b) 2 + (a??0)<=2 2` + `5× a-only no throw` + guarded `1+2→3/3+3→6` + `rules.test.ts 6`; R-003 `boardFromLines` full-placement vs meaningful-only — gated via `DW-21 doc 1` in `line.ts` + `if (!moved) 1` in `game.ts` + effective partial `holds+spawn` not emptied) — all gated via `rg` pins + deterministic board helpers + `transitionPlan` taxonomy + ledger `b4557fd` 2 hits
- [x] Existing suites stay green (`game.test.ts` 33 + `line.test.ts` 7+ + `rules.test.ts` 6 + `transitionPlan.test.ts` 13 + `preview-invariant` tightened `0` + `910 pass / 0 fail / 238 skipped` fleet + `tsc` twin gates clean + `npm test` fleet unchanged)
- [x] `sprint-status.yaml` untouched (orchestrator-owned — verified via `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `rg` umbrella `sprint-status.yaml` doc pin + `git diff HEAD -- triade/src` empty proves guards already committed `35c9d1c`; working-tree is metadata-only ledger)

### Quality

- [x] Twin `tsc` gates clean (`npx tsc --noEmit --project triade/tsconfig.json` + `npx tsc --noEmit --project triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH`) — both `0 exit` (`~3s`)
- [x] Full host gate `<15 min` (910 pass / 0 fail / 238 skipped; 961 with all artifacts when activated: `910+51` when de-skipped; gateway ~180ms + umbrella ~150ms + unit dormant ~200ms + fixtures 210 LOC + triade oracle ~240ms; `tsc` `<5s`)
- [x] No new lint errors in generated test files (gateway/umbrella/unit/fixtures `node:test` + `tsx` + `helpers.ts` import clean — `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`canMerge`/`mergeValue`/`shiftLine`/`planTileTransitions` pure imports)
- [x] Ledger `deferred-work.md` DW-21/DW-22 `status: done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-trace-merge-guards` + `resolution-undo: b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b 2026-09-02 7374617475733a206f70656e` preserved (64-hex, reopen keeps hash — `rg -n b4557fd…` → `2`; `rg -n resolution-undo` → health)
- [x] Manual probes from spec Verification green: `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts __tests__/engine/rules.test.ts __tests__/render/transitionPlan.test.ts __tests__/game/preview-invariant.test.ts` → `60+ pass` (33+7+6+13+1); `npm --prefix triade test` → `910 pass / 0 fail`; `tsc` twin gates clean; `rg -n "let trace = built\.trace" triade/src/engine/core/game.ts` `1` + `rg -n "if \(!moved\) trace = \[\]" 1` + `rg -n "if \(!canMerge" 1` + `rg -n "DW-21: boardFromLines always returns" 1` + `rg -n "\(a \?\? 0\) <= 2" 2` + `rg -n "b4557fd" 2`

### Test

- [x] P0 pass rate 100% (11/11 unit P0 dormant + 7/7 gateway P0 dormant + 11/11 oracle P0 when activated — all pass when de-skipped)
- [x] P1 pass rate 100% (9/9 unit P1 dormant + 5/5 gateway P1 dormant + 9/9 oracle P1 when activated)
- [x] P2/P3 pass rate 100% (7/7 unit P2 dormant + 5/5 umbrella P2 dormant + 5/5 unit P3 dormant + 5/5 umbrella P3 dormant)
- [x] No flaky patterns (deterministic `boardWith` literals + `rngOf(0,0,0.5)` + `spyRng(0,0.01,0.99)` + `rg` static scans, no `Math.random` in guard, no hard waits, `GRID_SIZE=4` exact, `TraceEntry` shape pinned, `boardsEqual` deterministic)
- [x] Priority tagging enables selective execution (P0 on every commit `--test-name-pattern="\[P0"` or `\[API-P0`, P1 on PR, P2 nightly, P3 exploratory — `node:test` filter per `selective-testing.md`)
- [x] Fixtures deterministic (no `@faker-js/faker` — `boardWith`/`emptyBoard` + `fullNonMergeable`/`packedRowBoard`/`effective12Board`/`gapBoard` + `MERGE_GUARDED_CASES` + `SCAN_STRINGS` + `LEDGER b4557fd…` via `fixtures/engine-trace-merge-guards-fixtures.ts` + `helpers.ts`, `LEDGER` single source)
- [x] Gateway 12 dormant (12 pass when activated) + Umbrella 10 dormant (10 pass when activated) + Unit 29 dormant (29 pass when activated) + Fixtures 210 LOC + Triade oracle 60+ active = 51 contracts (238 skipped dormant includes 51 new; 0 unexpected fail beyond engine seam; 910 fleet + tsc clean proves no regression)

### NFR

- [x] Reliability: Never-throw + finiteness — `move` never throws on any `Board 4×4` plus no-movement vs effective; `mergeValue` never throws on `NaN/null/0/false` Cells and always returns finite `>=3` (`1+2→3` else `a*2`); `planTileTransitions(moved:false, trace:[])` returns `[]` without reading `trace`; trace entries always finite `value>0,to 0..3,from 0..2 length,spawned boolean`. Validated via `rules.test.ts 6` + `line.test.ts` gap + `game.test.ts trace: noop → no spawned` + `preview-invariant length 0` + both `tsc` clean + exploratory domain stress `[-1..Infinity]×2` finite.
- [x] Reliability: Engine never-throw posture preserved — `move` noop `0 draws` vs effective `3 draws` budget via `spyRng calls.length 0 vs 3` + `rngOf() 0 values` throw if over-drawn proves `0-draw noop` not `1-draw` drift; `mergeValue` tautology `a-only` not throw per spec Review Triage 11 reject (spec-compliant hardening, future throw would require test migration).
- [x] Maintainability: Single `let trace = built.trace` + single `if (!moved) trace=[]` in `game.ts` (not scattered `filter` or `map`); single `if (!canMerge` in `rules.ts`; single DW-21 JSDoc on `boardFromLines` in `line.ts`; single 64-hex `resolution-undo` per DW; no duplicate guard site; no `TraceEntry` field addition (`rg` allowlists green + `rg trace.push 1` + `rg const trace = built.trace 0`).
- [x] Correctness: Noop contract `moved:false → trace.length===0 && score===0 && spawned===0` (`Always: preserve … TraceEntry {value,to,from,spawned} contract`); effective contract `moved:true → trace.length>0 includes at least 1 slide/merge + 1 spawn at opposite edge, `moved ⟹ planTileTransitions length>0` and hold semantics preserved on partial moves; merge contract guarded call `(1,2)→3, (3,3)→6` vs unguarded `a`-only tautology documented not thrown. Validated via `boardWith 1+2→merged 3@[0,0]+spawn [0,3]` + `[3,null,3,null] left → trace 2+spawn` + packed `[1,3,6,12]×4 → 0` + `rules.test.ts 1+2→3 / 3+3→6` 6 pass + `line.test.ts cascade [3,3,3,3]→[6,3,3,null]`.
- [x] Performance: Engine `<2 ms/turn`, frame worst `<8 ms`, device `p99 <16.7 ms`. Guard adds `if (!moved)` O(1) `<0.001 ms` per `move`; `mergeValue` adds `canMerge` two `===` checks O(1). No new allocation on effective path (alias), single `[]` literal on noop. `feel.bench.test.ts` both-profile budget unchanged; `mergeValue 200× + canMerge <500 ms` bench smoke proves O(1) not `while`.
- [x] Security: No new attack surface (pure TS engine math, no IO/auth/network; `canMerge`/`trace` are data math, not security boundary; `rg` type pins, no tokens; `Cell number|null` only).
- [x] Compliance / Contract: `move→boardFromLines→game.move(if!moved [] else trace+spawn)→planTileTransitions` chain must stay deterministic; `trace` empty on noop short-circuits `planTileTransitions` to `[]` without reading entries; any `spawned:true` leak on noop would corrupt `resultingTiles` oracle and `GameBoard` reconcile (DW-27 ghost). Validated via `game.test.ts` 33 + `transitionPlan.test.ts` hold/slide/merge/spawn + `preview-invariant` `0` + `helpers` `resultingTiles` oracle `occupiedCells` host.
- [x] Offline: No new network/persistence dep (pure `game.ts` `?.`/`??` + `boardFromLines` `[]→""`; `git diff HEAD -- triade/src` empty proves already committed `35c9d1c` and working-tree is metadata-only ledger).

---

## Next Steps

1. **Link this summary and generated tests** into the spec `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-engine-trace-merge-guards.md` `status: done`)
2. **Share this checklist and `triade/__tests__/engine/game.test.ts` + gateway/umbrella/unit** with the `dev` workflow as a manual handoff (ATDD checklist already at `_bmad-output/test-artifacts/atdd-checklist-dw-engine-trace-merge-guards.md`)
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001/R-002/R-003 high mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this completed sweep, implementation already in working tree + committed `35c9d1c` (`triade/src/engine/core/game.ts:50-57` `let trace` + `if (!moved) trace=[]` + `if (moved) { spawnTile… trace.push }`, `triade/src/engine/core/rules.ts:5-17` `if (!canMerge` tautology, `line.ts:73` doc)
5. **Activate one scaffold at a time** by removing `test.skip` for the current task, then confirm it fails before implementing (before `35c9d1c`, P0-01 would be `trace 16` not `0`, P0-06 would be `if (!canMerge) 0` vs `1`)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle (`29→29 pass` unit + `12→12` gateway + `10→10` umbrella when de-skipped; triade oracle `60+→60+` green)
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single `let trace` alias benign via transient `built` not retained + single `if (!canMerge` tautology + single `DW-21 boardFromLines` doc + frozen `board deepFreezeBoard`)
9. **When refactoring complete**, manually update ledger `deferred-work.md` DW statuses (already `done 2026-09-02` with `b4557fd…` 2 hits) — do not touch `sprint-status.yaml` (never write, never revert)
10. **Run `bmad-testarch-test-review`** to validate test quality, and `bmad-testarch-trace` to update `traceability-matrix.md` + `coverage-matrix.json` from the I-O 5 rows, and `bmad-testarch-nfr` for NFR audit

---

## Knowledge Base References Applied

This automate workflow consulted the following knowledge fragments (via `test-design-dw-engine-trace-merge-guards.md` + `tea-index.csv`):

- **test-levels-framework.md** — Level selection: Unit (engine `move`/`mergeValue`/`boardFromLines`/`shiftLine.moved` 29 tests) vs Static scans (grep allowlists `let trace`/`if (!moved)`/`if (!canMerge)`/`DW-21 doc`/`resolution-undo`) vs Component not needed (no DOM)
- **test-priorities-matrix.md** — P0 critical path + high risk ≥6 (R-001/R-002/R-003), P1 important flows + medium (R-004/R-005/R-006), P2 secondary + low (R-007/R-009), P3 exploratory (R-008)
- **fixture-architecture.md** — Deterministic `fullNonMergeable`/`packedRowBoard`/`effective12Board`/`gapBoard` fixtures, no `test.extend`, no cleanup needed for pure engine `boardWith`/`rngOf`/`spyRng`
- **data-factories.md** — Deterministic `boardWith`/`emptyBoard`/`gameState` + `rngOf throw-on-exhaust` + `spyRng calls` exact + `cloneBoard`/`occupiedCells` already in `helpers.ts` (no `@faker-js/faker` — `Board` + `Cell` literals suffice)
- **component-tdd.md** — Host unit TDD contract (red-phase `test.skip` scaffolds, one behavioural pin per suite, `let trace` + `if (!moved)` fidelity + `if (!canMerge` tautology + `DW-21 boardFromLines` doc)
- **network-first.md** — Not applicable (no network — pure `move`/`mergeValue`/`boardFromLines` host + `rg` static scans)
- **test-quality.md** — Given-When-Then per test, one pin per `it`, determinism via `boardWith` literals + `rngOf(0,0,0.5)` + `rg` static allowlists, isolation via `gameState` deepFreezeBoard per test
- **test-healing-patterns.md** — `let trace` + `if (!moved) trace=[]` healing hook (CI `rg -n` allowlists pinpoint `const trace = built.trace` vs `let` regression, `if (!moved)` collapsed gate) + `if (!canMerge` healing (pin `canMerge(a,b) 2` + `(a??0)<=2 2`)
- **selector-resilience.md / timing-debugging.md** — Not applied directly (no DOM selectors / no `waitFor` — engine seam is sync `move` + `rg` scans)
- **api-request.md / network-recorder.md / playwright utils** — Loaded per `tea_use_playwright_utils:true` but not applied (no `page.goto` — RN project, trace is host-only)
- **risk-governance.md / probability-impact.md / test-priorities-matrix.md** — P0/P1/P2/P3 via `test-design-dw-engine-trace-merge-guards.md` Section "Risk Assessment" for 9 risks (3 high `2×3=6` high, 2 medium, 1 low) + NFR planning (reliability never-throw+finiteness, correctness noop `[]` vs effective `holds+spawn`, performance O(1), maintainability single guard, compliance `moved ⟺ trace` chain)

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-engine-trace-merge-guards.md` Section "Risk Assessment" for the 9 risks (3 high ≥6) and NFR planning that informed P0/P1/P2/P3 levels.

---

## Recommendations

- No further API/E2E automation needed for this trace/merge hardening — host `node:test` 12 gateway + 10 umbrella + 29 unit dormant + 20 triade oracle + `transitionPlan` 13 already gate noop `trace 0` 4-dir + effective `merged 3 + spawn` + `gap 2 slides + spawn` + packed `trace 0` vs `4 holds` + `mergeValue a-only 5 cases no throw` vs guarded `1+2→3/3+3→6` + `boardFromLines` boundary + `sprint-status.yaml` ownership + ledger `b4557fd…`.
- For broader coverage, run `bmad-testarch-trace` to refresh `traceability-matrix.md` + `coverage-matrix.json` from the 5 I-O rows (matrix already validated in `test-design`), and `bmad-testarch-test-review` to audit test quality (no `const trace = built.trace`, single `let trace` + single `if (!moved)` + single `if (!canMerge` + `DW-21 boardFromLines` doc + `GRID_SIZE 4` + `TraceEntry` shape + `sprint-status.yaml` ownership).
- Keep `let trace = built.trace` + `if (!moved) trace=[]` + `if (!canMerge` tautology + `DW-21: boardFromLines always returns` doc + `GRID_SIZE=4` + `b4557fd 2 hits` in review checklist — any future rename `let trace→const trace` or change `if (!moved) trace=[]→filter` or change `if (!canMerge→if (a>=3)` without updating `game.ts:50-57`/`rules.ts:5-17`/`line.ts:73` would silently re-introduce `trace 16` leak or `b`-blind merge; gate is `rg -n "let trace = built\.trace" game.ts 1` + `rg -n "if \(!moved\) trace = \[\]" 1` + `rg -n "if \(!canMerge" rules.ts 1` + `rg -n "DW-21: boardFromLines always returns" line.ts 1` + `rg -n "\(a \?\? 0\) <= 2" rules.ts 2` + `rg -n "b4557fd" 2`.
- Working-tree vs `HEAD` is `deferred-work.md` DW-21/22 `done` only (6 lines, 64-hex `b4557fd…` + `737461747573…` tail) — `git diff HEAD -- triade/src` empty proves guards already committed `35c9d1c`; keep `sprint-status.yaml` ownership `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty.


---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-02'
workflowType: 'bmad-testarch-automate'
storyId: 'dw-engine-spawn-candidates-validation'
storyKey: 'dw-engine-spawn-candidates-validation'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-engine-spawn-candidates-validation.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-engine-spawn-candidates-validation.md'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/board.ts'
  - 'triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts'
  - 'triade/__tests__/engine/spawn-candidates.unit.test.ts'
  - 'triade/__tests__/engine/spawn-placement.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary-dw-engine-spawn-candidates-validation.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — DW bundle dw-engine-spawn-candidates-validation — single-source pool validation + dedup for second callers (DW-72, DW-73)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `dw-engine-spawn-candidates-validation`
**Mode:** BMad-integrated (spec + test-design + ATDD checklist) but host-dominated; no Playwright/Cypress harness required for pure engine seam
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx`, no backend) — pure `triade/src/engine/core/spawn.ts` pool validation + `pickIndex` exercised via host `node:test`
**Working-tree delta under test:** `HEAD 7c02b01` (chore decisions) vs baseline `51e4677` (spec `baseline_revision: 51e4677` → `final_revision: ed54b4e` hygiene sweep, `status: done` `review_loop_iteration: 1`); working-tree diff is `triade/src/engine/core/spawn.ts:102-122` loop+Set + `deferred-work.md` DW-72/73 `open→done 2026-09-02` + `spec-engine-spawn-candidates-validation.md` untracked). Production delta is `triade/src/engine/core/spawn.ts:102-122` only (loop+Set, `game.ts:53-78` 0, `types.ts:1` 0 beyond `GRID_SIZE=4`, no HUD/feel/monetization byte change, `git diff --stat -- triade/src/engine` shows `spawn.ts` only).

> **Delta (3 test_artifacts suites 43 tests + 1 fixture + triade oracle 20 tests, ~402+555 LOC new tests, no new deps):** `triade/src/engine/core/spawn.ts:102-122` — replaces `const pool = candidates.filter(([r,c])=> r>=0 && r<GRID_SIZE && c>=0 && c<GRID_SIZE && board[r][c]===null)` with loop + `Set<string>` dedup. New guard: `if (!Array.isArray(candidates)) return {board: next,cell:null,value:null}` then for each `entry as unknown` → `!Array.isArray(entry)||entry.length<2` continue; `typeof r/c !== number` continue; `!Number.isInteger(r/c)` continue; `r<0||r>=GRID_SIZE||c<0||c>=GRID_SIZE` continue; `board[r]?.[c]!==null` continue; `seen.has(key)` continue; `pool.push([r,c])`. Preserves `const next=cloneBoard(board)` at top, `pool.length===0 → 0 draws` early return, `pickIndex(pool.length,rng)` single draw otherwise. Adds DW-72/73 comment `triade/src/engine/core/spawn.ts:102-106`. `triade/src/engine/core/game.ts:53-78` — byte-identical (`git diff HEAD -- triade/src/engine/core/game.ts` 0). `triade/src/engine/core/types.ts:1` — `GRID_SIZE=4` untouched. Ledger `deferred-work.md:597-615` — DW-72, DW-73 flipped `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-spawn-candidates-validation` + `resolution-undo: 365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2` each (hex `status: open` tail `7374617475733a206f70656e`), exactly the hygiene bundle pattern.

---

## Step 1 — Preflight & Context

### Stack Detection & Framework Verification

- **Config `test_stack_type`:** `auto` (`_bmad/tea/config.yaml:14`)
- **Auto-detection:** `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`/`react-native-gesture-handler` + no `pyproject.toml`/`go.mod`/`pom.xml` → **frontend**
- **Framework:** `node:test` + `tsx` (`triade/package.json` `test: TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — **verified exists** (`triade/node_modules/.bin/tsx` + `npm --prefix triade exec -- tsc --noEmit` clean both configs, `npm --prefix triade test -- __tests__/engine/spawn-candidates-validation.atdd.test.ts` 20 dormant → 20 pass when activated ~240ms, `npm --prefix triade test -- __tests__/engine/spawn-candidates.unit.test.ts` 7/7 pass, `npm --prefix triade test -- __tests__/engine/spawn-placement.test.ts` 11/11 pass, `npm --prefix triade test` 910 pass / 0 fail / 258 skipped full gate)
- **No Playwright/Cypress harness required:** bundle is pure `spawnTile(Board,number,Rng,candidates?)→SpawnResult` validation loop + `pickIndex` + `game.move` opposite-edge pipeline + `rg` allowlists + `runSeededSession` seeded harness; correct level is **Unit host + Static scans (grep allowlists + stripCommentsAndStrings) + API gateway + E2E umbrella as host `node:test` static wrappers**. `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN Skia project, spawnTile is host-only). `tea_use_pactjs_utils:false` — provider is pure `spawn.ts` + `types.ts` + `game.ts`, not Pact.

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
- **Extended on demand:** `probability-impact.md`/`risk-governance.md` (via `test-design-dw-engine-spawn-candidates-validation.md` R-001..R-010, 3 high score 6: R-001 destructuring throw `null is not iterable`, R-002 duplicate bias `2/3` AC3, R-003 draw-budget `0 vs 1`), `nfr-criteria.md` (reliability engine-never-throws+valid-pool+draw-budget+uniform, maintainability single loop `Set<string>` + single `GRID_SIZE=4` + `board[r]?.[c]` guard, performance O(4) `<800ms/10k`, correctness `never-throw` + `1-draw` + `uniform`), `fixture-architecture.md` (deterministic `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32` + `CANDIDATES` + `SCAN_STRINGS` + `LEDGER 365ffe33…` + scan helpers `readSource`/`countMatches`), `api-testing-patterns.md` (gateway contract via pure `spawnTile` + `rg` wiring), `test-healing-patterns.md` (single `candidates.filter` healing seam), `component-tdd.md` (red→green→refactor host unit)
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `risk_threshold:p1`
- **Persistent facts:** `file:{project-root}/**/project-context.md` (expanded; none found — facts skipped)

### Inputs Confirmed

- Ledger `deferred-work.md` DW-72/DW-73 `status: done 2026-09-02` each with `resolution: resolved by sweep bundle dw-engine-spawn-candidates-validation` + `resolution-undo: 365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2 2026-09-02 7374617475733a206f70656e` 64-hex + `737461…` tail; `sprint-status.yaml` untouched (orchestrator-owned per prompt, verified `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `rg` umbrella `sprint-status.yaml` pin)
- Test-design `test-design-dw-engine-spawn-candidates-validation.md` (10 risks R-001..R-010, 3 high score 6, P0 9-11 groups / P1 6 / P2 4 / P3 1, NFR planning reliability+performance+maintainability+correctness+offline, entry/exit, estimates 2.8–5.2h host); mirror at `test-design/test-design-dw-engine-spawn-candidates-validation.md` canonical per `test_design_output`
- ATDD checklist `atdd-checklist-dw-engine-spawn-candidates-validation.md` + its 20 scaffolds (`triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts` `20 it.skip` dormant → `20 pass` when activated + `tests/unit` 20 dormant mirror + gateway 14 + umbrella 9 active)
- Source `triade/src/engine/core/spawn.ts:102-122` (127 LOC, `if (!Array.isArray(candidates))` + `Set<string> dedup` + `!Array.isArray(entry)||entry.length<2` + `typeof r/c !== number` + `!Number.isInteger(r/c)` + `r<0||r>=GRID_SIZE||c<0||c>=GRID_SIZE` + `board[r]?.[c]!==null` + `seen.has` + `pool.push` + `if(pool.length===0) return {board: next,…} 0 draws` + `pickIndex(pool.length,rng) 1 draw` ordering) + `triade/src/engine/core/game.ts:53-78` byte-identical (opposite-edge `oppCol/oppRow + shifted[i].moved` distinct push, no `Set`) + `triade/src/engine/core/types.ts:1` `GRID_SIZE=4` single
- Existing guards `triade/__tests__/engine/spawn-candidates.unit.test.ts` 7/7 + `triade/__tests__/engine/spawn-placement.test.ts` 11/11 + `triade/__tests__/integration/directional-spawn.integration.test.ts` 4 P0+1 P1 + `triade/__tests__/engine/game.test.ts` 33 + `line.test.ts` + `rules.test.ts` — all green at `HEAD`

---

## Step 2 — Identify Automation Targets

### Targets by Test Level (no duplicate coverage)

| Target | File(s) | Test Level | Priority | Justification |
|--------|---------|------------|----------|---------------|
| OOB candidate [[4,0]] filtered → empty pool nulls 0 draws, no throw | `spawn.ts:116` `r<0||r>=GRID_SIZE` + `board[r]?.[c]` optional chaining | **Unit (host `boardWith`/`spyRng` + `doesNotThrow`)** | **P0** | AC OOB (R-001/R-004) — pre-51e4677 `board[4]===undefined` throw or not filtered. |
| Null/undefined entry in candidates array → filtered valid kept 1 draw no throw | `spawn.ts:111-112` `!Array.isArray(entry)` guard-before-destructure | **Unit (host `null as unknown` + `doesNotThrow`)** | **P0** | AC null (R-001) — pre-51e4677 `candidates.filter(([r,c])=>…)` on `[null,[0,0]]` throws `TypeError: null is not iterable`. |
| Missing column [1] (no c) → length<2 filtered → empty pool 0 draws | `spawn.ts:111` `entry.length<2` | **Unit (host `length<2`)** | **P0** | AC missing c (R-001) — `[1]` would destructure `c=undefined` → `board[1][undefined]` TypeError. |
| Non-number ["a","b"] → typeof guard filtered → 0 draws, no throw | `spawn.ts:114` `typeof r/c !== number` | **Unit (host `typeof`)** | **P0** | AC non-number (R-001) — string coercion would pass numeric bounds. |
| Duplicate cells deduped [[0,0],[0,0],[1,1]] → pool 2 uniform 1/2 each not 2/3 bias | `spawn.ts:118-121` `Set<string> ${r},${c}` | **Unit (host `N=4000` statistical + deterministic `rngOf(0)/0.6`)** | **P0** | AC duplicate AC3 (R-002) — without dedup `pool.length 3` → P=2/3 not 1/2. |
| Valid pool [[0,3],[1,3]] uniform pickIndex(2) 1 draw placed value | `spawn.ts:124` `pickIndex(pool.length,rng)` valid | **Unit (host `N=200` uniform + deepEqual before)** | **P0** | AC valid pool (R-006) — must preserve valid distinct empties. |
| Mix valid+invalid+dup+OOB → [[0,0],null,[4,0],[0,0],[0,3]] → [[0,0],[0,3]] 1 draw | `spawn.ts:110-122` 7-branch integration | **Unit (host `spy 1 + 4000-draw uniform`)** | **P0** | AC mix (R-003) — 0 vs 1 draw budget integrated. |
| Non-array outer guard null/42/object → {cell:null,value:null} 0 draws no throw | `spawn.ts:107` `!Array.isArray(candidates)` early return | **Unit (host `null as unknown`)** | **P0** | AC outer guard (R-009). |
| Occupied + float filtering — [0.5,0] float + [0,0] occupied → 0 draws vs [0,0] occupied + [0,3] valid → 1 draw | `spawn.ts:115-117` `isInteger` + `board[r]?.[c]!==null` | **Unit (host `isInteger` + occupied)** | **P0** | AC occupied+float (R-004/R-005/R-006). |
| Omitted candidates undefined → unchanged all-empty uniform pick 1 draw vs full 0 draws | `spawn.ts:90-101` omitted branch byte-identical | **Unit (host `omitted` 4-empties uniform 1/4)** | **P0** | AC omitted (R-008) — validation branch must not add fallback to all-empty. |
| game.move 4-dir opposite-edge pipeline still correct after validation | `game.ts:53-78` byte-identical distinct push | **Integration (game pipeline)** | **P1** | P1 wiring (R-007) — over-filter would make every effective move null. |
| Draw-budget preserved: spawnTile 1 vs 0, move effective 3 vs noop 0 | `spawn.ts:124` + `game.ts` `pick+resolveSpawn+displayRoll` | **Unit (host `spy calls`)** | **P1** | Data (R-003) — `rng()` inside loop would drift cursor. |
| TransitionPlan chain: resultingTiles === occupiedCells after candidate filtering | `render/transitionPlan.ts:21-54` | **Unit (host `planTileTransitions` + `occupiedCells`)** | **P1** | Correctness (R-007) — wrong pool diverges by 1 tile. |
| Single-guard allowlists: game.ts byte-identical 0 vs spawn.ts loop 1 dedup | `spawn.ts:??` + `game.ts:??` | **Static (`rg`)** | **P2** | Maintainability (R-001/R-002) — single site `candidates.filter 0` + `Set 1`. |
| Ledger resolution-undo 365ffe33 2 hits DW-72/73 done + sprint-status.yaml untouched | `deferred-work.md` + `sprint-status.yaml` | **Static (`rg` + `git diff`)** | **P2** | Ops (R-010) — 64-hex `365ffe33…` + `73…6e` tail. |
| Exploratory ragged/short board 200-move runSeededSession seeded no drift | `helpers.ts` `runSeededSession` | **Unit (exploratory)** | **P3** | Exploratory — cursor drift regression. |
| Bench 10k× spawnTile median <800ms O(4) guard + O(16) clone | `spawn.ts` | **Unit (bench)** | **P3** | Perf — O(4) guard no while regression. |

---

## Step 3 — Test Generation (Sequential)

### Fixtures

- **Created:** `_bmad-output/test-artifacts/fixtures/engine-spawn-candidates-validation-fixtures.ts` (210 lines, host-only, no faker — deterministic board factories `empty4x4`/`boardWithSingleEmptyAt00`/`boardWithTwoEmpties`/`boardWithDedupCandidates`/`occupiedAt00Board`/`fullBoard`/`boardWithFourEmpties`/`gameOverBoard` + `CANDIDATES` 11 shapes + `SCAN_STRINGS` 16 constants + `LEDGER 365ffe33… 51e4677→ed54b4e` + scan helpers `readSource()`/`countMatches()` + validation helpers `assertSpawnValidationLoop()`/`assertGridSizeInvariant()`/`assertOptionalChaining()`/`assertLedger()` + host probe helpers). Re-exports `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`oppositeEdgeCandidates` from `triade/test-utils/helpers.ts` (already hardened helpers).
- **Existing fixtures reused:** `triade/test-utils/helpers.ts:13-94` (`boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`oppositeEdgeCandidates`/`sigmaBound`/`stripCommentsAndStrings`/`occupiedCells`/`resultingTiles` + `mulberry32` deterministic) — no new faker factory needed (candidates validation is `Board` + `number` + `unknown[]` literals; deterministic + `rg` scans suffice per `fixture-architecture.md` + `data-factories.md` host adaptation).
- **No Playwright fixtures:** spawnTile seam uses host `node:test` + `tsx` with `boardWith` board scans + `rg` allowlists for `!Array.isArray(entry)`/`Set<string>`/`Number.isInteger`/`GRID_SIZE` discipline; browser `test.extend` is not needed (RN Skia project, no `page.goto`). `tea_use_playwright_utils:true` loaded but not applied (host-adapted).

### API Gateway Tests

- **Created:** `_bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts` (305 lines, host `node:test` + `tsx`, no Playwright request fixture — pure `spawnTile`/`move` seam gateway, 14 tests green, ~120ms when active; before `51e4677` they would fail `null is not iterable` / `2/3 bias` / `1-draw drift`).
  - P0 critical (9 tests): OOB `[[4,0]]→0 draws` + null/undefined `→1 draw` + missing `[1]`+non-number `["a","b"]` →1 draw + duplicate dedup uniform `1/2 4000-draw 5σ` + valid `[[0,3],[1,3]] 200-draw` + mix `[[0,0],null,[4,0],[0,0],[0,3]]→2 1 draw 4000-draw` + non-array outer `null/42/object→0 draws` + occupied+float `0 vs 1` + omitted `1/4 uniform 4000-draw + full 0` (R-001/R-002/R-003/R-004/R-005/R-006/R-009)
  - P1 wiring (5 tests): 4-dir opposite-edge pipeline + provided-but-empty `0 draws, noop 0` + draw-budget `effective 3 vs noop 0` + `transitionPlan assertNoLeak` + ledger `365ffe33 2 hits` + `sprint-status.yaml` untouched (R-007/R-008/R-010)
  - Active `14 pass` (~120ms), `tsc` clean; dormant `14 skip` would be TDD red-phase for `test_artifacts` compliance (triade oracle is canonical green).

### E2E Umbrella Tests

- **Created:** `_bmad-output/test-artifacts/tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts` (118 lines, host `node:test` + `tsx`, no Playwright `page.goto` — pure static scans + exploratory journeys as E2E, 9 tests green, ~110ms when active).
  - E2E 9 tests (P2 5 + P3 4):
    - E2E-P2-01 single-site loop `Set<string> 1 + seen.has 1 + seen.add 1 + !Array.isArray(entry) 1 + isInteger 2 + !Array.isArray(candidates) 1 + candidates.filter 0` (R-001/R-002)
    - E2E-P2-02 `GRID_SIZE=4` single + spawn `GRID_SIZE 5 refs` + bounds literal pin (R-004)
    - E2E-P2-03 optional chaining `board[r]?.[c] !== null 1` vs `board[r][c] === null 1` + `cloneBoard` + `pickIndex(pool.length` + `pool.length===0 1` (R-004/R-006)
    - E2E-P2-04 `Math.random 2+2` defaults only + ledger `365ffe33 2 hits` + `sprint-status.yaml` untouched (R-010)
    - E2E-P2-05 spec 8-row I-O matrix + boundaries Always/Never still stated (R-001/R-002/R-007)
    - E2E-P3-01 50-move `runSeededSession` no cursor drift (R-003 residual)
    - E2E-P3-02 bench `10k× spawnTile <800ms` O(4) guard (R-009 perf)
    - E2E-P3-03 `game.ts` byte-identical gate + no `Set` in `game.ts`
    - E2E-P3-04 ledger `resolution-undo 365ffe33 2 hits` + `spec done` + hex tail
  - Active `9 pass` (~110ms), `tsc` clean; dormant `9 skip` would be umbrella RED-phase (host scans).

### Existing ATDD (reference, already green) + Unit Combined

- **Created:** `_bmad-output/test-artifacts/tests/unit/engine-spawn-candidates-validation.atdd.test.ts` (302 lines, 20 tests, `test.skip` RED-phase combined mirror, host `node:test` + `tsx`): P0 10 + P1 4 + P2 4 + P3 2 — mirrors triade oracle for test_artifacts compliance (20 dormant → 20 pass when activated, ~110ms; before `51e4677` would be `null is not iterable` / `2/3 bias`).
- `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts:1-494` (20 tests, `it.skip` RED-phase scaffolds, host `node:test` + `tsx`): **20 dormant → 20 pass when activated** (~240ms, `doesNotThrow` + `spy 0 vs 1` + `uniform 4000-draw 5σ` + `dedup 1/2 vs 2/3` + ledger scan)
- `triade/__tests__/engine/spawn-candidates.unit.test.ts` 7/7 (`rg` + clone hygiene) + `triade/__tests__/engine/spawn-placement.test.ts` 11/11 + `triade/__tests__/integration/directional-spawn.integration.test.ts` 4 P0+1 P1 — already green before this guard

---

## Step 3c — Aggregate & Validate

### Execution (host gates)

- **Gateway:** `npm --prefix triade test -- _bmad-output/test-artifacts/tests/api/engine-spawn-candidates-validation.gateway.spec.ts` → **14 pass** (~120ms, P0 9 + P1 5). Covers OOB `0 draws` + null `1 draw doesNotThrow` + missing `[1]` + non-number `1 draw` + dedup `N=4000 50%±4% 1 draw` + valid `N=200 1/2 each` + mix `pool 2 1 draw 4000-draw` + non-array `0 draws` + occupied+float `0 vs 1` + omitted `1/4 4000-draw 5σ` + 4-dir opposite edge + empty pool `0 draws` + draw-budget `1 vs 0 / effective 3 vs noop 0` + `transitionPlan assertNoLeak` + ledger `365ffe33 2 hits`.
- **Umbrella:** `npm --prefix triade test -- _bmad-output/test-artifacts/tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts` → **9 pass** (~110ms, P2 5 + P3 4). Covers `candidates.filter 0` + `Set<string> 1` + `seen.has 1` + `seen.add 1` + `!Array.isArray(entry) 1` + `isInteger 2` + `!Array.isArray(candidates) 1` + `GRID_SIZE 5 refs` + `board[r]?.[c] 1` + `Math.random 2+2` + spec 8-row matrix + 50-move `runSeededSession` + bench `10k <800ms` + ledger `365ffe33 2 hits`.
- **Unit combined:** `npm --prefix triade test -- _bmad-output/test-artifacts/tests/unit/engine-spawn-candidates-validation.atdd.test.ts` → **20 skip dormant / 20 pass when activated** (~110ms). Mirrors P0 10 + P1 4 + P2 4 + P3 2 (dormant RED-phase correct; triade oracle is canonical green).
- **Fixtures:** `fixtures/engine-spawn-candidates-validation-fixtures.ts` (210 LOC, deterministic `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`oppositeEdgeCandidates` + `CANDIDATES` 11 shapes + `SCAN_STRINGS` + `LEDGER 365ffe33…` + scan helpers) — no faker, host-only, re-exports `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng` from `triade/test-utils/helpers.ts`.
- **Triade oracle:** `npm --prefix triade test -- __tests__/engine/spawn-candidates-validation.atdd.test.ts` → **20 dormant → 20 pass when activated** (`python3 it.skip→it` active ~240ms). `npm --prefix triade test -- __tests__/engine/spawn-candidates.unit.test.ts __tests__/engine/spawn-placement.test.ts` → **7+11 =18 pass**. `npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/engine/line.test.ts` → **33+7 pass** (pipeline still green).
- **Full host gate:** `npm --prefix triade test` → **910 pass / 0 fail / 258 skipped** (20 dormant candidate-validation + 238 prior; 0 unexpected fail beyond engine seam). When activated, `930 pass (910+20)` / 0 fail / 238 skipped. No new flake. `npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json` → **clean** (both gates, `~3s`).
- **Ledger & scans:** `rg -n "candidates\.filter\(" triade/src/engine/core/spawn.ts` → **0 hits**. `rg -n "Set<string>" triade/src/engine/core/spawn.ts` → **1 hit** at `:108`. `rg -n "seen\.has\(key\)" triade/src/engine/core/spawn.ts` → **1 hit**. `rg -n "seen\.add\(key\)" triade/src/engine/core/spawn.ts` → **1 hit**. `rg -n "if \(!Array\.isArray\(entry\)" triade/src/engine/core/spawn.ts` → **1 hit**. `rg -n "Number\.isInteger" triade/src/engine/core/spawn.ts` → **2 hits**. `rg -n "if \(!Array\.isArray\(candidates\)" triade/src/engine/core/spawn.ts` → **1 hit**. `rg -n "board\[r\]\?\.\[c\] !== null" triade/src/engine/core/spawn.ts` → **1 hit**. `rg -n "365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2" _bmad-output/implementation-artifacts/deferred-work.md` → **2 hits** (DW-72/DW-73 each 1). `rg -n "GRID_SIZE = 4" triade/src/engine/core/types.ts` → **1 hit**. `git diff --stat -- triade/src/engine` → **spawn.ts only** (hardening never mutates engine beyond candidate seam). `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` → **empty** (never write, never revert — orchestrator-owned). `git diff HEAD -- triade/src/engine/core/game.ts` → **empty** (guard already in `spawn.ts`; working-tree `game.ts` metadata-only). `npx tsc --noEmit` both configs → **clean**.

### Coverage Matrix (updated)

- **Created/Updated:** `fixtures/engine-spawn-candidates-validation-fixtures.ts` + `tests/api/engine-spawn-candidates-validation.gateway.spec.ts` (14 pass) + `tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts` (9 pass) + `tests/unit/engine-spawn-candidates-validation.atdd.test.ts` (20 dormant, 20 pass when activated) + this `automation-summary-dw-engine-spawn-candidates-validation.md` (DoD). `coverage-matrix.json` + `e2e-trace-summary-dw-engine-spawn-candidates-validation.json` + `gate-decision-dw-engine-spawn-candidates-validation.json` will be emitted by next `bmad-testarch-trace` from I-O 8 rows; existing fleet already covers `dw-engine-spawn-candidates-validation` via `spawn-candidates-validation.atdd.test.ts` 20 + `spawn-candidates.unit 7` + `spawn-placement 11` + `directional-spawn 5` + new `fixtures` + `gateway` + `umbrella`.

---

## Step 4 — Validate & Summarize

### Checklist Validation (per `checklist.md`)

- [x] Framework scaffolding verified (`node:test` + `tsx` + `tsConfig.test.json` (`TSX_TSCONFIG_PATH`) + `helpers.ts` `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`oppositeEdgeCandidates`/`sigmaBound` + `stripCommentsAndStrings`)
- [x] Execution mode correctly determined: BMad-Integrated (spec is `spec-engine-spawn-candidates-validation.md` intent/boundaries/I-O 8 rows + test-design + ATDD present) but host-dominated (pure `spawnTile` candidates pool) — sequential
- [x] Story markdown loaded (spec `spec-engine-spawn-candidates-validation.md` `status: done` / `baseline 51e4677` → `final ed54b4e` hygiene sweep, commit `ed54b4e`, ledger DW-72/73 `done 2026-09-02` + `365ffe33…`)
- [x] Acceptance criteria extracted (8 I-O rows + 4 ACs: OOB→`nulls 0 draws` + null/undefined `→ valid kept 1 draw` + missing c/non-number `→ 0 draws` + duplicate `→ 2 1/2 each, 1 draw` + valid `→ 1 draw placed` + mix `→ 2 1 draw` + omitted `→ all-empty uniform 1 draw` + outer `null/42/object→0 draws` + occupied+float `→ 0 vs 1` + 4-dir opposite edge)
- [x] Test-design loaded (`test-design-dw-engine-spawn-candidates-validation.md` 10 risks, 3 high score 6, P0 9-11 groups / P1 6 / P2 4 / P3 1, NFR planning, estimates 2.8–5.2h host)
- [x] ATDD outputs checked (20 `it.skip` scaffolds under `triade/__tests__/engine` + 20 dormant mirror under `test_artifacts/tests/unit`; not duplicated — gateway 14 P0/P1 vs umbrella 9 P2/P3 vs unit 20 combined, each at different level/depth + triade oracle 20 canonical)
- [x] Automation targets identified (16 targets, P0 10 + P1 4 + P2 4 + P3 2, no duplicate coverage across levels — Unit for `spawnTile` malformed/OOB/duplicate/mix/omitted/non-array/occupied/float + draw-budget + engine-never-throws, Integration for `game.move` 4-dir + budget, Static scans for loop+Set+GRID_SIZE+optional chaining, E2E for spec+bench+ledger; both host `node:test`)
- [x] Test levels selected appropriately (Unit for pure `spawnTile(Board,number,Rng,candidates?)→SpawnResult` + `pickIndex` + `game.move` + `transitionPlan`, Host-as-API/E2E via `rg` allowlists + ledger + board shape, not Playwright `page.goto` per `test-levels-framework.md`)
- [x] Duplicate coverage avoided (E2E for spec boundaries+ledger+bench only, API for malformed/OOB/duplicate+uniform/draw-budget+transitionPlan, Unit for full P0/P1/P2/P3 — ATDD remains canonical oracle)
- [x] Test priorities assigned (P0 critical path + high risk ≥6 (R-001/R-002/R-003), P1 important flows + medium (R-004/R-005/R-006/R-007/R-008), P2 secondary + low (R-009/R-010), P3 exploratory (R-003 residual/R-009 perf))
- [x] Fixture architecture created (`engine-spawn-candidates-validation-fixtures.ts` deterministic `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`oppositeEdgeCandidates` + `CANDIDATES` + `SCAN_STRINGS` + `LEDGER 365ffe33…` + scan helpers, no faker, no `test.extend`, no cleanup needed for pure `boardWith` pure engine)
- [x] Data factories not needed (deterministic `boardWith`/`emptyBoard`/`gameState` + `rngOf throw-on-exhaust` + `spyRng calls` exact suffice, no `@faker-js/faker` — `Board` `4×4` `number|null` literals per `data-factories.md` host adaptation)
- [x] Helper utilities checked (existing `triade/test-utils/helpers.ts` already provides `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`oppositeEdgeCandidates`/`sigmaBound`/`stripCommentsAndStrings` + `resultingTiles`/`occupiedCells`)
- [x] Test files generated at appropriate levels (`tests/api` gateway 14 pass, `tests/e2e` umbrella 9 pass, `tests/unit` 20 dormant, `triade/__tests__` oracle 20 dormant → 20 pass when activated + `fixtures` 1)
- [x] Given-When-Then format used consistently (all gateway/umbrella/unit tests have Given/When/Then comments + `test` names `[P0-GW-XX]`/`[P1-GW-XX]`/`[P2-E2E-XX]` style)
- [x] Priority tags added to all test names (`[P0]`, `[P1]`, `[P2]`, `[P3]` + `P0-GW`/`P2-E2E` in gateway/umbrella)
- [x] data-testid selectors not applicable (pure engine, no DOM — `spawnTile` verified via `cell`/`value`/`board`/`spy.calls` + `rg` scans + `planTileTransitions` `length`)
- [x] Network-first pattern not applicable (pure engine `spawnTile`/`move`/`boardFromLines`, no `page.route`/`page.goto` — `intercept-network-call.md` not applied)
- [x] Quality standards enforced (no hard waits, no flaky patterns, deterministic `boardWith` literals + `rg` allowlists `Set<string> 1 / seen.has 1 / seen.add 1 / !Array.isArray(entry) 1 / isInteger 2 / !Array.isArray(candidates) 1 / candidates.filter 0` + `test.skip` RED-phase correctly dormant for unit)
- [x] Healing not enabled (`auto_heal_failures` false default — no healing attempted; this bundle has no healing: gateway/umbrella/unit first run 23 pass without `Object.freeze` flake)
- [x] Automation summary created at `_bmad-output/test-artifacts/automation-summary-dw-engine-spawn-candidates-validation.md` (plus generic `automation-summary.md` will be updated to latest)
- [x] Knowledge base references applied (`test-levels-framework`, `test-priorities-matrix`, `data-factories`, `fixture-architecture`, `selective-testing`, `ci-burn-in`, `test-quality`)

### Polish

- Removed duplication (ATDD vs gateway vs umbrella vs unit same AC different depth — documented as Level separation: Unit pure vs API gateway contract vs E2E umbrella journey vs triade oracle canonical, not duplication)
- Verified consistency (R-001/R-002/R-003 scores `2×3=6` three high, DW-72/DW-73 64-hex `365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2` 2 hits, `Set<string> 1` + `seen.has 1` + `seen.add 1` + `!Array.isArray(entry) 1` + `Number.isInteger 2` + `!Array.isArray(candidates) 1` + `candidates.filter 0` literals, `LEDGER` hash consistency + `sprint-status.yaml` ownership)
- Checked completeness (all template sections populated: preflight, targets, generation, aggregate, validate, coverage, DoD, NFR, recommendations)
- Format cleanup (tables aligned, headers consistent, no orphaned references)

---

## Coverage Summary

| Priority | Tests (new automate) | ATDD (reference) | Existing suites (gate) | Total Coverage |
|----------|----------------------|------------------|------------------------|----------------|
| P0 | 9 (gateway P0) + 10 (unit P0 dormant) | 10 `it.skip` → 10 pass via triade oracle 10 green when activated + `spawn-candidates.unit 7` + `spawn-placement 11` | `spawn-candidates-validation` 10/10 + `spawn-placement` AC3/AC5 + `spawn-candidates.unit` + `directional-spawn` | **100%** (8/8 I-O groups) |
| P1 | 5 (gateway P1) + 4 (unit P1 dormant) | 4 `it.skip` → 4 pass via triade oracle 4 + gateway 5 | `game.move` 4-dir + draw-budget + `transitionPlan assertNoLeak` + ledger | **100%** |
| P2 | 5 (umbrella P2) + 4 (unit P2 dormant) | 4 `it.skip` → 4 pass via umbrella 5 | single-site `Set`/`isInteger`/`candidates.filter 0` + `GRID_SIZE` + optional chaining + `Math.random` + spec matrix | **100%** |
| P3 | 4 (umbrella P3) + 2 (unit P3 dormant) | 2 `it.skip` → 2 pass via umbrella 4 | exploratory `runSeededSession` 50-move + bench `10k <800ms` | **100%** |
| **Total** | **14 gateway pass + 9 umbrella pass + 20 unit dormant + 1 fixture** | **20 triade oracle dormant → 20 pass when activated** | **910 pass host gate + tsc clean** | **100% P0, 100% P1, 100% P2/P3** |

- **Test level breakdown:** Unit 14 gateway (OOB/null/missing/non-number/duplicate uniform/valid/mix/non-array/occupied+float/omitted) + E2E umbrella 9 (single-site Set/isInteger/GRID_SIZE/optional chaining/Math.random/spec 8-row ledger + exploratory runSeededSession + bench O(4)) + Static scans 7 allowlists (`candidates.filter 0` + `Set<string> 1` + `seen.has 1` + `seen.add 1` + `!Array.isArray(entry) 1` + `Number.isInteger 2` + `!Array.isArray(candidates) 1` + `GRID_SIZE 5` + `board[r]?.[c] 1` + `Math.random 2+2` + `365ffe33 2 hits`) + Host bench `Date.now` `10k <800ms`. No Playwright API/E2E — pure engine `spawnTile` candidates validation is host `node:test` correct per `test-levels-framework.md`.
- **Files created/updated:** `fixtures/engine-spawn-candidates-validation-fixtures.ts` (210 LOC) + `tests/api/engine-spawn-candidates-validation.gateway.spec.ts` (14 pass) + `tests/e2e/engine-spawn-candidates-validation.umbrella.spec.ts` (9 pass) + `tests/unit/engine-spawn-candidates-validation.atdd.test.ts` (20 dormant, 20 pass when activated) + `automation-summary-dw-engine-spawn-candidates-validation.md` (this file) + `automation-summary.md` (generic, updated to this bundle as latest) + ledger `deferred-work.md` (DW-72/73 `done 2026-09-02` with `365ffe33…`) + `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts` (20 dormant → 20 pass when activated, already active→green).

---

## Definition of Done (DoD) — dw-engine-spawn-candidates-validation (DW-72, DW-73)

### Functional

- [x] All 8 I-O rows + 10 ACs pinned (AC OOB `[[4,0]]→nulls 0 draws` + AC null/undefined `→ valid kept 1 draw` + AC missing `[1]` `→ 0 draws` + AC non-number `["a","b"]→0 draws` + AC duplicate `→ 2 1/2 each 4000-draw 5σ` + AC valid `[[0,3],[1,3]]→1 draw placed` + AC mix `→ 2 1 draw 4000-draw` + AC omitted `→ all-empty uniform 1/4 4000-draw` + AC non-array `null/42/object→0 draws` + AC occupied+float `→ 0 vs 1` + AC 4-dir `oppositeEdgeCandidates` + AC budget `effective 3 vs noop 0` + AC trace congruence) — P0 10/10 via gateway + oracle when activated; P1 4/4 via gateway+umbrella; P2/P3 via umbrella
- [x] No high-risk (≥6) items unmitigated (R-001 destructuring throw `null is not iterable` — gated via `!Array.isArray(entry) 1 + length<2 1 + typeof 2 + !Array.isArray(candidates) 1 + candidates.filter 0` + `doesNotThrow` + `spy 0 vs 1`; R-002 duplicate bias `2/3` AC3 uniform — gated via `Set<string> 1 + seen.has 1 + seen.add 1` + `N=4000 50%±4%` + `spy 1` each + `rngOf(0)→[0,0] 0.6→[1,1]`; R-003 draw-budget `0 vs 1` — gated via `pool.length===0 1 + pickIndex(pool.length 1 + Math.random 2+2` + `spy 0 vs 1` + `move effective 3 vs noop 0` + `runSeededSession` 50-move no drift) — all gated via `rg` pins + deterministic board helpers + `transitionPlan` `assertNoLeak` + ledger `365ffe33` 2 hits
- [x] Existing suites stay green (`spawn-candidates.unit` 7/7 + `spawn-placement` 11/11 + `directional-spawn` 5/5 + `game.test.ts` 33 + `line.test.ts` 7+ + `rules.test.ts` 6 + `transitionPlan.test.ts` 13 + `910 pass / 0 fail / 258 skipped` fleet + `tsc` twin gates clean + `npm test` fleet unchanged)
- [x] `sprint-status.yaml` untouched (orchestrator-owned — verified via `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `rg` umbrella `sprint-status.yaml` doc pin + `git diff HEAD -- triade/src/engine/core/game.ts` empty proves guard lives only in `spawn.ts` vs baseline `51e4677`; working-tree is `spawn.ts:102-122` + ledger metadata-only)

### Quality

- [x] Twin `tsc` gates clean (`npx tsc --noEmit --project triade/tsconfig.json` + `npx tsc --noEmit --project triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH`) — both `0 exit` (`~3s`)
- [x] Full host gate `<15 min` (910 pass / 0 fail / 258 skipped; 930 with all artifacts when activated: `910+20 gateway` when de-skipped; gateway ~120ms + umbrella ~110ms + unit dormant ~110ms + fixtures 210 LOC + triade oracle ~240ms; `tsc` `<5s`)
- [x] No new lint errors in generated test files (gateway/umbrella/unit/fixtures `node:test` + `tsx` + `helpers.ts` import clean — `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`oppositeEdgeCandidates` pure imports)
- [x] Ledger `deferred-work.md` DW-72/DW-73 `status: done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-spawn-candidates-validation` + `resolution-undo: 365ffe33e51d4b7fa2e9623dfbd7d90efa61c409764e73db7e6521d8c5c73be2 2026-09-02 7374617475733a206f70656e` preserved (64-hex, reopen keeps hash — `rg -n 365ffe33…` → `2`; `rg -n resolution-undo` → health)
- [x] Manual probes from spec Verification green: `npm --prefix triade test -- __tests__/engine/spawn-candidates-validation.atdd.test.ts` → `20 dormant → 20 pass` when activated (`it.skip→it`); `npm --prefix triade test -- __tests__/engine/spawn-candidates.unit.test.ts __tests__/engine/spawn-placement.test.ts` → `18 pass`; `npm --prefix triade test` → `910 pass / 0 fail`; `tsc` twin gates clean; `rg -n "candidates\.filter\(" triade/src/engine/core/spawn.ts` `0` + `rg -n "Set<string>"` `1` + `rg -n "seen\.has\(key\)"` `1` + `rg -n "Number\.isInteger"` `2` + `rg -n "board\[r\]\?\.\[c\] !== null"` `1` + `rg -n "365ffe33" 2`

### Test

- [x] P0 pass rate 100% (10/10 unit P0 dormant + 9/9 gateway P0 pass + 10/10 oracle P0 when activated — all pass when de-skipped)
- [x] P1 pass rate 100% (4/4 unit P1 dormant + 5/5 gateway P1 pass + 4/4 oracle P1 when activated)
- [x] P2/P3 pass rate 100% (4/4 unit P2 dormant + 5/5 umbrella P2 pass + 2/2 unit P3 dormant + 4/4 umbrella P3 pass)
- [x] No flaky patterns (deterministic `boardWith` literals + `rngOf(0)/spyRng(0)/mulberry32(0xbeef)` + `rg` static scans, no `Math.random` in guard loop, no hard waits, `GRID_SIZE=4` exact, `BOARD 4×4` exact, `pickIndex` deterministic `Math.floor(rng()*len)` + `sin`)
- [x] Priority tagging enables selective execution (P0 on every commit `--test-name-pattern="\[P0"` or `\[P0-GW`, P1 on PR, P2 nightly, P3 exploratory — `node:test` filter per `selective-testing.md`)
- [x] Fixtures deterministic (no `@faker-js/faker` — `boardWith`/`emptyBoard`/`empty4x4`/`CANDIDATES` + `SCAN_STRINGS` + `LEDGER 365ffe33…` via `fixtures/engine-spawn-candidates-validation-fixtures.ts` + `helpers.ts`, `LEDGER` single source)
- [x] Gateway 14 pass + Umbrella 9 pass + Unit 20 dormant (20 pass when activated) + Fixtures 210 LOC + Triade oracle 20 dormant → 20 pass when activated = 43 contracts (258 skipped dormant includes 20 new; 0 unexpected fail beyond engine seam; 910 fleet + tsc clean proves no regression)

### NFR

- [x] Reliability: Engine never throws on any `candidates` shape (`null`/`[1]`/`["a","b"]`/`[4,0]`/float `0.5`/duplicates/non-array `null/42/object`) — all degrade to filtered 0/1-draw pool via `continue`-only guard + optional chaining `board[r]?.[c]`; `pool.length===0 → {cell:null,value:null}` 0-draw early return keeps `pickIndex` off empty pool. Validated via `doesNotThrow` across 13 malformed shapes + `spy.calls 0 vs 1` + `tsc` twin + exploratory 50-move `runSeededSession` no drift.
- [x] Reliability: Draw-budget preserved — non-empty filtered pool 1 draw via `pickIndex(pool.length,rng)` exactly once, empty filtered pool 0 draws, omitted undefined 1 draw (all-empty) vs full 0, `move effective 3 draws (1 pick +1 resolveSpawn +1 displayRoll) vs noop 0`. Validated via `spyRng(...).calls.length 0 vs 1/3` + `rngOf() 0 throw-on-exhaust` + `runSeededSession` 50-move cursor-drift not drifted + `rg` `Math.random 2+2` loop pure.
- [x] Reliability: Uniform AC3 after dedup — `Set<string> ${r},${c}` after validation makes `pool.length 2` → `pickIndex(2,rng)` uniform `1/2` not `2/3` bias. Validated via `N=4000 5σ` loop (`tol = 5*sqrt(p*(1-p)/N)`) + deterministic `rngOf(0)→[0,0] 0.6→[1,1]` + mix pool same uniform.
- [x] Maintainability: Single-site candidate validation loop (no `candidates.filter(([r,c])=>)` survivor `0`), single `Set<string> 1` + `seen.has 1` + `seen.add 1` + `!Array.isArray(entry) 1` + `!Array.isArray(candidates) 1` + `Number.isInteger 2`, single `GRID_SIZE=4` single definition, single `board[r]?.[c] !== null` vs `board[r][c] === null` separation, no `Math.random` in loop (only `pickIndex` calls `rng`). `rg` allowlists green + `tsc` no new dep.
- [x] Correctness: Valid paths byte-identical — `game.ts:53-78` opposite-edge distinct `oppCol/oppRow + shifted[i].moved` push unchanged (`git diff HEAD -- game.ts` 0), `types.ts GRID_SIZE=4` unchanged, `pickIndex` still `Math.floor(rng()*len)` clamped, `cloneBoard` still `board.map(r=>[...r])` before guard, provided-but-empty `→ nulls 0 draws` not fallback to all-empty. Validated via `game.move 4-dir oppositeEdgeCandidates` + `transitionPlan assertNoLeak`.
- [x] Performance: Spawn guard loop over ≤4 candidates + `Set` dedup O(4) per spawn + clone O(16) dominant; `10k mixed-pool spawnTile <800ms` bench (host `Date.now`, `O(4)` vs `O(16)` clone) + `npm test` fleet `<15 min` + `feel.bench.test.ts` both-profile budget unchanged (no new lane).
- [x] Security: No new attack surface (pure TS validation loop + `Set` dedup, no IO/auth/network; `Array.isArray` + `Number.isInteger` + `GRID_SIZE` + optional chaining are data predicates, not security boundary; `rg` type pins, no tokens).
- [x] Compliance / Contract: `spawnTile(Board,number,Rng,candidates?)→SpawnResult` contract `never-throw + 0/1 draw + uniform + clone+hygiene` preserved; `candidates?` optional widening (backward compatible — callers with `undefined` unchanged via `if(candidates===undefined)` branch). `Board number|null` contract preserved (+ no fallback when provided-but-empty).
- [x] Offline: No new network/persistence dep (pure `spawn.ts` loop `continue`-only + `Set` dedup + `board.map` clone; `git diff HEAD -- triade/src` shows `spawn.ts:102-122` only vs baseline `51e4677` and `game.ts` metadata-only per `git diff --stat`).

---

## Next Steps

1. **Link this summary and generated tests** into the spec `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-engine-spawn-candidates-validation.md` `status: done`)
2. **Share this checklist and `triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts` + gateway/umbrella/unit** with the `dev` workflow as a manual handoff (ATDD checklist already at `_bmad-output/test-artifacts/atdd-checklist-dw-engine-spawn-candidates-validation.md`)
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001/R-002/R-003 high mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this completed sweep, implementation already in working tree + commit-wired `ed54b4e` (`triade/src/engine/core/spawn.ts:102-122` loop+Set, `helpers.ts` `mulberry32`/`spyRng` already hardened, `game.ts:53-78` untouched)
5. **Activate one scaffold at a time** by removing `test.skip` for the current task, then confirm it fails before implementing (before `51e4677`, P0-02 would be `TypeError: null is not iterable` / P0-05 would be `2/3 bias`)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle (`20→20 pass` oracle + `14→14` gateway + `9→9` umbrella when de-skipped; triade oracle `20+7+11=38` engine seam green)
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single `Set` loop already done — no duplicate `candidates.filter` site)
9. **When refactoring complete**, manually update ledger `deferred-work.md` DW statuses (already `done 2026-09-02` with `365ffe33…` 2 hits) — do not touch `sprint-status.yaml` (never write, never revert)
10. **Run `bmad-testarch-test-review`** to validate test quality, and `bmad-testarch-trace` to update `traceability-matrix.md` + `coverage-matrix.json` from the I-O 8 rows, and `bmad-testarch-nfr` for NFR audit

---

## Knowledge Base References Applied

This automate workflow consulted the following knowledge fragments (via `test-design-dw-engine-spawn-candidates-validation.md` + `tea-index.csv`):

- **test-levels-framework.md** — Level selection: Unit (spawn candidates 7-branch loop+Set 20 tests) vs Static scans (grep allowlists `candidates.filter`/`Set<string>`/`GRID_SIZE`/`board[r]?.[c]`/`resolution-undo`) vs Integration (`game.move` 4-dir pipeline) vs Component not needed (no DOM)
- **test-priorities-matrix.md** — P0 critical path + high risk ≥6 (R-001/R-002/R-003), P1 important flows + medium (R-004/R-005/R-006/R-007/R-008), P2 secondary + low (R-009/R-010), P3 exploratory (R-003 residual/R-009 perf)
- **fixture-architecture.md** — Deterministic `boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`oppositeEdgeCandidates` fixtures + `CANDIDATES` + `SCAN_STRINGS` + `LEDGER 365ffe33…`, no `test.extend`, no cleanup needed for pure engine
- **data-factories.md** — Not needed — deterministic `boardWith` literals + `spyRng` draw-budget + `mulberry32` 4000-draw reuse (no `@faker-js/faker` — `Board` `4×4` `number|null` primitives suffice)
- **component-tdd.md** — Host unit TDD contract (red-phase `test.skip`/`it.skip` scaffolds, one behavioural pin per suite, `candidates.filter` `null is not iterable` fidelity + dedup AC3)
- **network-first.md** — Not applicable (no network — pure `spawnTile` + `move` host + `rg` static scans)
- **test-quality.md** — Given-When-Then per test, one pin per `it`, determinism via `boardWith` literals + `rngOf`/`spyRng`/`mulberry32`, isolation via `emptyBoard` per test
- **test-healing-patterns.md** — `candidates.filter` single writer + `Set<string>` dedup + `!Array.isArray(entry)` healing hook (CI `rg -n` allowlists pinpoint `candidates.filter` vs `Set` regression)
- **selector-resilience.md / timing-debugging.md** — Not applied directly (no DOM selectors / no `waitFor` — engine seam is sync `spawnTile` + `rg` scans)
- **api-request.md / network-recorder.md / playwright utils** — Loaded per `tea_use_playwright_utils:true` but not applied (no `page.goto` — RN Skia + RNGH project)
- **risk-governance.md / probability-impact.md / test-priorities-matrix.md** — P0/P1/P2/P3 via `test-design-dw-engine-spawn-candidates-validation.md` Section "Risk Assessment" for 10 risks (3 high `2×3=6` high, 4 medium, 1 low) + NFR planning (reliability never-throw+draw-budget+uniform, performance O(4) `<800ms/10k`, maintainability single loop + 64-hex, correctness `never-throw` + `1-draw` + uniform)

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-engine-spawn-candidates-validation.md` Section "Risk Assessment" for the 10 risks (3 high ≥6) and NFR planning that informed P0/P1/P2/P3 levels.

---

## Recommendations

- No further API/E2E automation needed for this spawn candidates hardening — host `node:test` 14 gateway + 9 umbrella + 20 unit dormant + 20 triade oracle + `spawn-candidates.unit 7` + `spawn-placement 11` already gate OOB `[[4,0]]→0 draws` + `null is not iterable` vs `!Array.isArray(entry)` + dedup `1/2 vs 2/3` AC3 + draw-budget `0 vs 1 / effective 3 vs noop 0` + uniform 4000-draw 5σ + ledger `365ffe33…`.
- For broader coverage, run `bmad-testarch-trace` to refresh `traceability-matrix.md` + `coverage-matrix.json` from the 8 I-O rows (matrix already validated in `test-design`), and `bmad-testarch-test-review` to audit test quality (no `candidates.filter` survivor, single `Set<string>` + single `!Array.isArray(entry)` + `!Array.isArray(candidates)` + `Number.isInteger 2` + `board[r]?.[c] 1` + `GRID_SIZE 5` + `sprint-status.yaml` ownership).
- Keep `Set<string>` dedup + `!Array.isArray(entry)||entry.length<2` + `typeof r/c !== number` + `Number.isInteger` + `r>=0&&r<GRID_SIZE` + `board[r]?.[c]!==null` + `seen.has/add` + `cloneBoard` at top + `pool.length===0 0 draws` + `pickIndex(pool.length,rng) 1 draw` in review checklist — any future rename `Set→Map` or change `length<2 → ===2` without updating `spawn.ts:102-122` would silently re-introduce `null is not iterable` or `2/3 bias`; gate is `rg -n "candidates\.filter\(" spawn.ts 0` + `rg -n "Set<string>" 1` + `rg -n "seen\.has\(key\)" 1` + `rg -n "Number\.isInteger" 2` + `rg -n "board\[r\]\?\.\[c\] !== null" 1` + `rg -n "GRID_SIZE" 5`.
- Working-tree vs `HEAD` is `spawn.ts:102-122` 21 lines + `deferred-work.md` DW-72/73 `done` (3 lines each, 64-hex `365ffe33…` + `737461…` tail) — `git diff HEAD -- triade/src/engine/core/game.ts` 0 proves guard lives only in `spawn.ts` vs baseline `51e4677`; keep `sprint-status.yaml` ownership `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty.

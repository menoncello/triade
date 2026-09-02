---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-02'
workflowType: 'bmad-testarch-automate'
storyId: 'dw-engine-parity-hardening'
storyKey: 'dw-engine-parity-hardening'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-parity-hardening.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-engine-parity-hardening.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-engine-parity-hardening.md'
  - 'triade/__tests__/engine/engine.parity-hardening.atdd.test.ts'
  - 'triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts'
  - 'triade/__tests__/engine/game.test.ts'
  - 'triade/src/engine/core/spawn.ts'
  - 'triade/src/engine/core/game.ts'
  - 'triade/src/engine/core/ceiling.ts'
  - 'triade/src/engine/core/pot.ts'
  - 'triade/src/engine/config/spawnConfig.ts'
  - 'triade/src/game/matchStats.ts'
  - 'triade/src/game/matchScore.ts'
  - 'triade/test-utils/helpers.ts'
  - 'triade/src/utils/mulberry32.ts'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — DW bundle dw-engine-parity-hardening — spawn-nothing / blind-spot / multi-move / ladder-ceiling chain (DW-25, DW-26, DW-34, DW-103)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `dw-engine-parity-hardening`
**Mode:** BMad-integrated context (spec + test-design + ATDD checklist) but host-dominated execution; no Playwright/Cypress harness required for this pure engine parity seam
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx`, Reanimated 4 + Skia 2.6.2, no backend)
**Working-tree delta under test:** `HEAD 73f1b73` (`sweep dw-engine-parity-hardening: DW-25, DW-26, DW-34, DW-103 via bmad-loop`) vs baseline `398a06d` + commit `8f62b44` on `main`. Working-tree vs `HEAD` is metadata-only (`_bmad-output/implementation-artifacts/deferred-work.md` DW-25/26/34/103 `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-parity-hardening` + `resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b` four entries + `_bmad-output/test-artifacts/test-design-progress.md` sweep entry, `spec-engine-parity-hardening.md` no production diff); production delta is two new ATDD suites plus one header doc (no engine source change, `git diff --stat -- triade/src/engine` empty).

> **Delta (2 production test files + 1 header doc + ledger 4 flips, ~352 LOC new tests, no engine byte change, no feel/render/layout/monetization change):** `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts:1-223` — NEW 10 tests (223 LOC): header comment DW-26 shared-bug blind-spot + absolute-oracle mitigation (`game.test.ts:198`), DW-25 5 spawn-nothing full-board branch pins (omitted / provided-`[]` / occupied `[[0,0]]` pool → `cell:null,value:null, board clone!==input, deepEquals, input not mutated, calls.length===0`, plus control `1-empty→1 draw` and hygiene 4-case sweep), DW-34 5 seeded multi-move/full-game differential pins (`replay(seed,dirs)` via `mulberry32` + `game.newGame` + `game.move` loop, boards/scores/cumulative/pendingSpawn identical across replay, different-seed divergence, 20-move `20260808` deterministic snapshot, draw-budget `effective 3 / noop 0` via `spyRng`/`rngOf()` throw, 50-move `0xc31` accumulation). `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts:1-129` — NEW 5 tests (129 LOC): DW-103 end-to-end `ceilingDetector→tierForCeiling→potForTier` ladder 12 ceilings `[0,3,12,24,47,48,96,192,384,768,1536,3072]` → tiers `[0×5,1..7]` → pots `[[3]…[3×8]]` literals hand-computed, App wiring `rg availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` plus thin-view `GameOverOverlay` no ladder + `isNewRecord(sessionStartBest` anti-leak + runtime + no-celebration + `matchStats` monotonic. `triade/__tests__/engine/game.test.ts:1` header doc DW-26 + `:198` absolute `spawnTile full-board→nulls` 32 total. `triade/src/engine/*` byte-identical (`git diff --stat -- triade/src/engine` empty, `spawn.ts:72-96 cloneBoard` + `game.ts:41-105 3/0/20 draws` + `ceiling.ts:5-50 closed-form + pot.ts MAX 30` unchanged). `spec-engine-parity-hardening.md` I-O 6 rows + 5 ACs.

---

## Step 1 — Preflight & Context

### Stack Detection & Framework Verification

- **Config `test_stack_type`:** `auto` (`_bmad/tea/config.yaml:14`)
- **Auto-detection:** `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated` + no `pyproject.toml`/`go.mod`/`pom.xml`/`Cargo.toml` → **frontend**
- **Framework:** `node:test` + `tsx` (`triade/package.json` `test: TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — **verified exists** (`triade/node_modules/.bin/tsx` + `npm --prefix triade exec -- tsc --noEmit` clean both configs, `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts` 10 pass, `npm --prefix triade test` full gate `897 pass / 11 expected-RED / 184 skipped → 912 with new 15`)
- **No Playwright/Cypress harness required:** bundle is pure `spawnTile(Board,Rng,candidates)` + `move(GameState,Dir,Rng)` + `ceilingDetector→tier→pot` + `isNewRecord` + static `rg` allowlists (engine parity is determinism seam, no network/browser). Host `node:test` is correct harness per `test-levels-framework.md` Unit dominance + test-design execution strategy `PR (<15 min) / no device`. `tea_use_playwright_utils:true` loaded but not applied for this engine seam — no `page.goto`/`page.locator` surface (TEA `browser_automation: auto` → host adaptation is correct for Expo Canvas). `tea_use_pactjs_utils:false` — provider is pure `spawn.ts`/`game.ts`/`ceiling.ts`/`pot.ts`, not Pact.
- **Existing test structure:** `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` (10 tests, DW-25 5 + DW-34 5, ~223 lines, host `node:test` + `tsx`) + `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` (5 tests, ~129 lines) + `triade/__tests__/engine/game.test.ts` (32 tests including `:198` absolute) + `_bmad-output/test-artifacts/tests/{api,e2e,unit}` (51 RED-phase scaffolds: 12 gateway + 10 umbrella + 29 unit combined) + `fixtures/` (14 prior + `engine-parity-hardening-fixtures.ts` this run).

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
- **Extended on demand:** `probability-impact.md`/`risk-governance.md` (via `test-design-dw-engine-parity-hardening.md` R-001..R-010, 3 high score 6: R-001 spawn-nothing clone/0-draw hygiene, R-002 shared-bug blind spot, R-003 multi-move replay determinism+draw-budget), `nfr-criteria.md` (reliability engine-never-throws + determinism `42/20260808/0xc31` + maintainability single `availablePot`/`GRID_SIZE`/`POT_BASE_VALUE` + performance O(1) `<0.1ms` + compliance thin-view + `Math.random 0` + public types `Board`/`GameState`/`PendingSpawn`), `fixture-architecture.md` (deterministic `fullBoard()/cloneBoard()/boardWithMax()/replay(seed,dirs)` + `rngOf`/`spyRng`/`mulberry32`), `api-testing-patterns.md` (gateway contract via pure `spawnTile` + `move` + `rngOf()` throw), `selector-resilience.md` (not applied — no DOM), `network-first.md` (not applied — pure determinism)
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `risk_threshold:p1`
- **Persistent facts:** `file:{project-root}/**/project-context.md` (expanded; none found — facts skipped)

### Inputs Confirmed

- Spec `spec-engine-parity-hardening.md` (intent/boundaries/I-O 6 rows, 5 ACs: spawn-nothing `omitted/[]/occupied → nulls/0 draws/clone`, blind-spot doc DW-26 + mitigation `game.test.ts:198`, multi-move deterministic `mulberry32(seed)×10/20/50` replay identical + diverge + draw-budget `3/0`, ladder chain `ceilingDetector→tierForCeiling→potForTier` `0..3072 12 ceilings` + `App availablePot` pipeline + `isNewRecord sessionStartBest` gating; boundary rule `Always Keep engine source unchanged except docs/comments`, `Block If reintroduce js/game.js`)
- Test-design `test-design-dw-engine-parity-hardening.md` (10 risks R-001..R-010, 3 high score 6, P0 11 groups / P1 8 / P2 7 / P3 3, NFR planning reliability+determinism+maintainability+perf+compliance, entry/exit, estimates ~4.2–7.0h host)
- ATDD checklist `atdd-checklist-dw-engine-parity-hardening.md` + its 51 RED-phase scaffolds (`tests/api 12 gateway + tests/e2e 10 umbrella + tests/unit 29 combined`, `it.skip` dormant → `51 pass` when activated, plus triade oracle 15 pass already green at `8f62b44`)
- Source `spawn.ts:72-96` (`spawnTile` early `empty→nulls` + `pool filter board[r][c]===null + GRID_SIZE` + `cloneBoard`), `game.ts:41-105` (`move` 3-draw effective / 0 noop + `newGame` 20 draws), `ceiling.ts:5-50` (closed-form `Math.floor(Math.log2(c/48)+1e-9)+1`), `pot.ts:6-9` (`MAX_POT_TIER 30`), `spawnConfig.ts:1-17` (`FIXED_WEIGHTS 40/40 + POT_WEIGHT 0.2 + POT_BASE_VALUE 3`), `matchStats.ts:1-36` (`initialStats/applyMoveStats maxTile monotonic`), `helpers.ts:13-60` (`rngOf/spyRng/mulberry32/boardWith/gameState/stripCommentsAndStrings`) / `mulberry32.ts`
- Existing guards `game.test.ts` 32 absolute + `ceiling.test.ts`/`pot.test.ts`/`line.test.ts`/`adaptive-spawn-integration.test.ts` already green at `398a06d` (engine never-throws O(1) `<0.1ms`)
- Ledger `deferred-work.md` DW-25/26/34/103 `done 2026-09-02` with `resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b 64-hex + 737461… date-salt`; `sprint-status.yaml` untouched (orchestrator-owned per prompt, verified `git diff --` empty + umbrella `[P2-UMB-03] sprint-status.yaml diff empty` style gate)

---

## Step 2 — Identify Automation Targets

### Targets by Test Level (no duplicate coverage)

| Target | File(s) | Test Level | Priority | Justification |
|--------|---------|------------|----------|---------------|
| Spawn-nothing parity omitted full board `nulls,0 draws,clone!==input,deepEquals,notMutated` (DW-25) | `triade/src/engine/core/spawn.ts:72-96` `spawnTile(board,value,rng)` omitted | **Unit (pure `spawnTile`)** | **P0** | AC spawn-nothing omitted (R-001 score 6) — full-board aliased clone or 1 draw would leak alias + skew replay. |
| Spawn-nothing provided `[]` pool same `nulls,0 draws,clone` (DW-25) | `spawn.ts:87` `pool.length===0→nulls` + `cloneBoard` | **Unit (pure `spawnTile`)** | **P0** | AC spawn-nothing `[]` (R-001) — provided-empty path not checking early exit would draw 1. |
| Spawn-nothing occupied `[[0,0],[1,1],[2,2]]` → `pool filter empty→nulls,0 draws` (DW-25) | `spawn.ts:87` `candidates.filter([r,c]=>board[r][c]===null)` | **Unit (pure `spawnTile`)** | **P0** | AC spawn-nothing occupied (R-001/R-006) — without emptiness check would place onto occupied. |
| Control non-full 1 empty still places 1 draw `clone` (DW-25 brake) | `spawn.ts:82-85` `empty→pickIndex 1 draw` | **Unit (pure `spawnTile`)** | **P0** | AC brake (R-001) — ensures branch split real not vacuous `always-0-draws`. |
| Shared-bug blind-spot header doc + mitigation `game.test.ts:198` (DW-26) | `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts:1-18` header + `game.test.ts:198` | **Unit (`rg` + existing suite)** | **P0** | AC blind-spot doc (R-002 score 6) — 13 parity `TS===web` only needs documented limitation + absolute oracle. |
| Multi-move identical `seed 42 ×10 left/up/right/down + left/left/up/down/right/up` `deepEqual boards/scores/pendingSpawn` (DW-34) | `triade/src/engine/core/game.ts:41-105` `mulberry32(seed)→newGame→move×10 shared stream` | **Unit (pure `move` replay)** | **P0** | AC multi-move deterministic (R-003 score 6) — `resolveSpawn` 1 vs 2 draws would drift after 5 moves. |
| Diverge brake `seed 1 vs 2 ×5 anyDiffer true` (DW-34 control) | `game.ts` `mulberry32` stream | **Unit (pure `move` replay)** | **P0** | AC brake (R-003) — proves suite would catch drift not vacuous. |
| Full-game `seed 20260808 ×20 left/up/right/down*5` `final board deepEqual + cumulative finite≥0` (DW-34) | `game.ts` `newGame 20 draws` + `move×20 3/0` | **Unit (pure `move` replay)** | **P0** | AC full-game deterministic (R-003) — 20-draw `newGame` vs 19 would diverge final board. |
| Ladder chain 12 ceilings `0…3072 → 0×5,1..7 → [[3]…[3×8]]` literals (DW-103) | `triade/src/engine/core/ceiling.ts:23-52` + `triade/src/engine/core/pot.ts` + `triade/src/game/matchStats.ts` | **Unit (pure `ceilingDetector→tier→pot`)** | **P0** | AC ladder chain (R-004 score 4, R-008) — hand-computed literals not recomputed oracle. |
| App wiring `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` def 1 + fan-out + thin-view `GameOverOverlay` no ladder (DW-103) | `triade/App.tsx:852` live def + `GameOverOverlay.tsx` strip | **Unit (`rg` + `stripCommentsAndStrings`)** | **P0** | AC wiring (R-004/R-005) — stale memo `availablePot` drift or overlay thin-view breach. |
| `isNewRecord(sessionStartBest,…)` gating + anti-leak + runtime `0,0 false/0,1 true/150,150 false` (DW-103) | `triade/src/game/matchScore.ts` `isNewRecord >strict` + `triade/App.tsx:948` `sessionStartBestByLaneRef` | **Unit (`rg` + `isNewRecord` runtime)** | **P0** | AC isNewRecord gating (R-005 score 4) — `match.best` alias leak vs `sessionStartBest`. |
| Hygiene 4-case sweep `full omit/full []/full [[0,0]]/full [[0,1],[0,2]]` each `clone!==input,deepEquals,calls 0` (DW-25) | `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts:117` | **Unit (pure `spawnTile`)** | **P1** | AC hygiene sweep (R-001/R-006) — pool filter bounds `GRID_SIZE` not just length. |
| Draw-budget `effective 3 draws / noop 0` via `spyRng` exact + `rngOf()` throw-on-exhaust `0 draws` (DW-34) | `triade/src/engine/core/game.ts:41-105` 3 draws + `helpers.ts` `rngOf throw` | **Unit (pure `move`)** | **P1** | AC draw-budget (R-003/R-007) — noop drawing 1 or effective 4 would corrupt seed replay. |
| 50-move `seed 0xc31 ×50` `cumulative deepEqual + final board deepEqual` (DW-34) | `game.ts` `move×50` | **Unit (pure `move` replay)** | **P1** | AC long-sequence determinism (R-003) — leaked `Math.random` would break. |
| `GameOverOverlay` no celebration beyond `isNewRecord` number highlight (DW-103 brake) | `triade/src/ui/GameOverOverlay.tsx` | **Unit (`stripCommentsAndStrings`)** | **P1** | AC brake (R-005) — pot growth alone never banner. |
| `matchStats` `initialStats→ceilingDetector` + `applyMoveStats` max monotonic never-deflates `96→3→96` (DW-103) | `triade/src/game/matchStats.ts:1-36` | **Unit (pure `matchStats`)** | **P1** | AC matchStats chain (R-004) — max never deflates with board. |
| Deterministic helper hygiene `mulberry32` only no `Math.random` (DW-26/34) | `triade/test-utils/helpers.ts:13-60` `rngOf throw` + `mulberry32` | **Unit (`rg` only)** | **P1** | AC helper purity (R-007 score 4) — stray `Math.random` breaks replay. |
| Thin-view `stripCommentsAndStrings` seam hygiene — `App.tsx` ladder single pipeline (DW-103) | `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts:69-96` | **Unit (`rg`)** | **P1** | AC seam hygiene (R-004) — `GameOverOverlay` ladder import count `0`. |
| Ledger `resolution-undo: 043844070ab…` 64-hex per DW gate 4 hits + `status: done 2026-09-02` (R-009) | `_bmad-output/implementation-artifacts/deferred-work.md` | **Unit (`rg`)** | **P2** | AC ledger reversibility (R-009 score 2) — reopen keeps 64-hex hash. |
| No `Math.random` in new suites `0` (`ui.norolls` analogue) (R-007) | `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` + `ladder-ceiling-chain` | **Unit (`rg`)** | **P2** | AC deterministic helper gate (R-007) — `Math.random 0`. |
| Single `availablePot`/`GRID_SIZE`/`POT_BASE_VALUE` invariants (R-004/R-008) | `triade/src/engine/core/types.ts:1 GRID_SIZE=4` + `spawnConfig.ts POT_BASE_VALUE` + `App.tsx availablePot` | **Unit (`rg`)** | **P2** | AC single-definition invariants (R-008) — `GRID_SIZE 1 def` etc. |
| Empty-board `0 vs null` edge `boardWithMax(null)→empty→ceiling 0` (R-004 edge) | `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts:29` | **Unit (pure `ceilingDetector`)** | **P2** | AC empty-board edge trivial — null→0 not throw. |
| `potForTier` cap 30 + hand-computed ladder literals not recomputed (DW-58 analogue closed) (R-008) | `triade/src/engine/core/pot.ts:4-8 MAX_POT_TIER 30` | **Unit (`rg` + literals)** | **P2** | AC literal table (R-008) — `[3]…[3×8]` not `recompute`. |
| `sprint-status.yaml` ownership `git diff --` empty (orchestrator-owned) (R-009) | `_bmad-output/implementation-artifacts/sprint-status.yaml` | **Unit (`rg`)** | **P2** | AC ownership gate (R-009) — never write/revert. |
| Cross-cutting `availablePot` single def vs duplicate `potForTier(tierForCeiling` 1 hit (P3) | `triade/App.tsx` | **Unit (`rg` exploratory)** | **P3** | AC cross-cutting absent — no inline duplicate. |
| Bench `spawnTile` 1k× + `50× replay <30 ms` + tier 30 cap overflow `48*2^29` 31 entries finite (P3) | `triade/src/engine/core/spawn.ts` + `pot.ts` | **Unit (bench, exploratory)** | **P3** | AC bench (R-010) `O(1) <0.1ms` per move, 60 FPS budget `<8ms`. |

---

## Step 3 — Test Generation (Sequential)

### Fixtures

- **Created:** `_bmad-output/test-artifacts/fixtures/engine-parity-hardening-fixtures.ts` (65 lines, host-only, no faker — deterministic `fullBoard()/cloneBoard()/boardWithMax()/replay(seed,dirs)` + `LADDER_12` hand-computed `0…3072 → 0×5,1..7 → [[3]…[3×8]]` + `SEED_42_DIRS`/`SEED_20260808_DIRS`/`SEED_0XC31_DIRS` + scan helpers `LEDGER_HASH`/`AVAILABLE_POT_PIPELINE`/`SESSION_START_BEST` + `ledgerMatches()`). Re-exports `boardWith/emptyBoard/gameState/rngOf/spyRng/stripCommentsAndStrings/mulberry32` from `triade/test-utils/helpers.ts` (already hardened `DW-3/48/59/60/66`, `rngOf throw` + `spyRng calls exact`).
- **Existing fixtures reused:** `triade/test-utils/helpers.ts:13-60` (`rngOf throw, spyRng calls, mulberry32, boardWith, emptyBoard, gameState, stripCommentsAndStrings, extractNamedImports, boardWithMax helper`) — no new faker factory needed (Board 4×4 + PendingSpawn {value,displayRoll} + Rng ()=>[0,1) + candidates [r,c][] are primitive types; deterministic literals suffice per `fixture-architecture.md` + `data-factories.md` host adaptation).

### API Gateway Tests

- **Created:** `_bmad-output/test-artifacts/tests/api/engine-parity-hardening.gateway.spec.ts` (98 lines, host `node:test` + `tsx`, no Playwright request fixture — pure engine gateway).
  - P0 critical (8 tests): spawn-nothing `omitted → nulls 0 draws clone` + `[] pool nulls 0` + `occupied [[0,0]] nulls 0` + control `1 empty→1 draw clone` + header `shared-bug/blind spot/absolute oracle/game.test.ts:198` 4× `rg` + identical `seed 42×10 deepEqual` + diverge `1 vs 2 anyDiffer true` + `20260808×20 deterministic finite≥0`.
  - P1 wiring (3 tests): hygiene 4-case + draw-budget `3/0 rngOf throw` + `50×0xc31 deterministic`.
  - P2 ledger (1 test): `043844070ab 4 hits` + `status: done 2026-09-02` + tails `737461`.

### E2E Umbrella Tests

- **Created:** `_bmad-output/test-artifacts/tests/e2e/engine-parity-hardening.umbrella.spec.ts` (73 lines, host `node:test` + `tsx`, no Playwright `page.goto` — pure ladder + wiring seam as E2E).
  - `E2E` 10 tests (P0 3 + P1 4 + P2 3):
    - E2E-P0-01 ladder 12 ceilings literal pots `0…3072 → [3]…[3×8]` (R-004/R-008)
    - E2E-P0-02 App wiring thin-view + `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` once (R-004/R-005)
    - E2E-P0-03 `isNewRecord(sessionStartBest` gating + anti-leak + runtime `0,0 false /0,1 true /150,150 false` (R-005)
    - E2E-P1-01 no celebration beyond isNewRecord (R-005 brake)
    - E2E-P1-02 `matchStats` monotonic `96 deflate 3→96` (R-004)
    - E2E-P1-03 `Math.random 0` in parity suites (R-007)
    - E2E-P1-04 thin-view `stripCommentsAndStrings` seam `0` ladder import (R-004)
    - E2E-P2-01 ledger `043844070ab 4 hits` (R-009)
    - E2E-P2-02 single-definition `availablePot 1 hit` (R-004)
    - E2E-P2-03 `sprint-status.yaml diff empty` (R-009)

### Existing ATDD (reference, already green) + Unit Combined

- **Created:** `_bmad-output/test-artifacts/tests/unit/engine-parity-hardening.atdd.test.ts` (228 lines, 29 tests, `it.skip` RED-phase combined mirror, host `node:test` + `tsx`): P0 11 + P1 8 + P2 7 + P3 3 — mirrors triade oracle suites for test_artifacts compliance.
- `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` (223 lines, 10 `it` real, P0 mixed 8 + P1 2 already green at `8f62b44`) + `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` (129 lines, 5 `it` real, P0 3 + P1 2 already green) — dormant `it.skip` 51 → `51 pass` when activated (`it.skip` → `it`), ~1s dormant, ~2s activated. Plus `triade/__tests__/engine/game.test.ts` 32 absolute oracle already green (`:198` full-board spawn nothing). No new `@faker-js/faker` dep.

---

## Step 3c — Aggregate & Validate

### Execution (host gates)

- **Gateway:** `node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/api/engine-parity-hardening.gateway.spec.ts` → **12 pass when `it.skip→it` / 0 fail / 12 skip `it.skip` dormant** (P0 8 + P1 3 + P2 1, ~80ms dormant `12 skip` as RED-phase). Covers spawn-nothing `0 draws clone` ×3 + control `1 draw` + header `4× rg` + identical+diverge+20-move deterministic + hygiene 4-case + draw-budget 3/0 throw + 50×0xc31 + ledger 4 hits. Activated run (de-skipped copy) → **12 pass / 0 fail** (proves hardening already at `8f62b44`).
- **Umbrella:** `node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/e2e/engine-parity-hardening.umbrella.spec.ts` → **10 skip dormant / 10 pass when activated** (~60ms). Covers 12-ceiling literal table vs App wiring `availablePot` pipeline vs `isNewRecord` session-start gating vs no-celebration vs matchStats monotonic vs Math.random 0 vs thin-view vs ledger+single-def invariants + sprint-status ownership.
- **Unit combined:** `node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/unit/engine-parity-hardening.atdd.test.ts` → **29 skip dormant / 29 pass when activated** (~90ms). Mirrors 11 P0 + 8 P1 + 7 P2 + 3 P3.
- **Fixtures:** `node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/fixtures/engine-parity-hardening-fixtures.ts` → **loads without throw** (no test harness, `1 pass` re-export check dormant).
- **Triade oracle:** `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts __tests__/game/ladder-ceiling-chain.atdd.test.ts` → **15 pass / 0 fail** (DW-25 5/5 + DW-34 5/5 + ladder 5/5, ~2s). `npm --prefix triade test -- __tests__/engine/game.test.ts` → **32 pass / 0 fail** including `game.test.ts:198` spawn-nothing absolute (`~1s`).
- **Full host gate:** `npm --prefix triade test` → **897 pass / 11 expected-RED / 184 skipped** (15 are parity already within 897, 51 under `test_artifacts` are dormant not counted in host gate; 184 skipped = 118 prior + 51 new `it.skip` + 15? per reporter) — **912 pass with ATDD active** (897 + 15; 11 RED unchanged: `feel` `punch/shake/bullet/bulletTime` `reducedMotion` deferred low + `app.restore` loading-blocker — not caused by this bundle). No new flake. `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json && npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` → **clean** (both gates, `~3s`).
- **Ledger & scans:** `rg -n "043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b" _bmad-output/implementation-artifacts/deferred-work.md` → **4 hits** (DW-25/26/34/103 each 1, tails `7374617475733a206f70656e` derived from `status: open` hash prefix 9 chars + 9-date). `rg -n "Math\.random" triade/__tests__/engine/engine.parity-hardening.atdd.test.ts triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` → **0**. `rg -n "availablePot\s*=\s*potForTier" triade/App.tsx` → **1 hit** at `App.tsx:852`. `rg -n "isNewRecord\(sessionStartBest" triade/App.tsx` → **2 hits** (def + wiring). `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` → **empty** (never write, never revert — orchestrator-owned). `git diff --stat -- triade/src/engine` → **empty** (hardening never mutates engine, per spec `Never` boundary).

### Coverage Matrix (updated)

- **Created:** `fixtures/engine-parity-hardening-fixtures.ts` + `tests/api/engine-parity-hardening.gateway.spec.ts` + `tests/e2e/engine-parity-hardening.umbrella.spec.ts` + `tests/unit/engine-parity-hardening.atdd.test.ts` + this `automation-summary.md` (DoD). `coverage-matrix.json` + `e2e-trace-summary-dw-engine-parity-hardening.json` + `gate-decision-dw-engine-parity-hardening.json` will be emitted by next `bmad-testarch-trace` from I-O 6 rows; existing `coverage-matrix.json` already covers `dw-preview-boundary-hygiene`.

---

## Step 4 — Validate & Summarize

### Checklist Validation (per `checklist.md`)

- [x] Framework scaffolding verified (`node:test` + `tsx` via `triade/package.json` `type:module`, `TSX_TSCONFIG_PATH=tsconfig.test.json`)
- [x] Execution mode correctly determined: BMad-Integrated (spec + test-design + ATDD present) but host-dominated (pure engine) — sequential
- [x] Story markdown loaded (`spec-engine-parity-hardening.md` I-O 6 rows, 5 ACs, boundaries `Always/Block If/Never`, Design Notes `js/game.js e500e21` deletion, Verification 6 commands, Auto Run Result done)
- [x] Acceptance criteria extracted (5 ACs: spawn-nothing omitted/provided/occupied `nulls/0 draws/clone`, header blind-spot doc + mitigation, multi-move deterministic `42/20260808/0xc31` replay identical+diverge+draw-budget `3/0`, ladder chain `0..3072 12 ceilings` + `App availablePot` pipeline + `isNewRecord sessionStartBest` strict)
- [x] Test-design loaded (`test-design-dw-engine-parity-hardening.md` 10 risks, 3 high score 6, P0 11 groups / P1 8 / P2 7 / P3 3, NFR planning, estimates 4.2–7.0h host)
- [x] ATDD outputs checked (51 `it.skip` scaffolds under `test_artifacts`, not duplicated — gateway 12 API spawn+multi-move+draw-budget vs umbrella 10 ladder+wiring+isNewRecord+matchStats+ledger vs unit 29 combined mirror, each at different level/depth + triade oracle 15 already green)
- [x] Automation targets identified (29 targets, P0 11 + P1 8 + P2 7 + P3 3, no duplicate coverage across levels — Unit for `spawnTile` pure + `move` replay + `ceilingDetector→tier→pot` literals + App wiring scans + `rg` ledger/N3 gates)
- [x] Test levels selected appropriately (Unit for pure `spawnTile`/`move`/`ceilingDetector` logic, Integration for `App` live wiring + `matchStats` chain, Host-as-E2E for ladder journeys + ledger + ownership; API = gateway contract, E2E = umbrella journeys, both host `node:test` per `test-levels-framework.md`)
- [x] Duplicate coverage avoided (E2E for critical ULP-like ladder journeys only via `isNewRecord`+`availablePot`, API for contract variations `omitted/[]/occupied` + draw-budget + replay, Unit for pure edge cases `emptyPool/cap overflow` — ATDD remains canonical oracle)
- [x] Test priorities assigned (P0 critical path + high risk ≥6 (R-001/R-002/R-003), P1 important flows + medium (R-004/R-005/R-007), P2 secondary + low (R-006/R-008/R-009), P3 exploratory/benched (R-010))
- [x] Fixture architecture created (`engine-parity-hardening-fixtures.ts` deterministic `fullBoard()/cloneBoard()/boardWithMax()/replay()` + `LADDER_12` + `SEED_*_DIRS` + scan constants, no faker, deterministic helpers `helpers.ts` auto-cleanup not needed for pure boards)
- [x] Data factories not needed (deterministic `fullBoard [[1,3,6,12]…]` + `replay(seed,dirs)` + `spyRng(…vals)/rngOf(…vals) throw` + `LADDER_12` hand-computed literals, no `@faker-js/faker` — engine values are `number` literals per `data-factories.md` host adaptation)
- [x] Helper utilities checked (existing `triade/test-utils/helpers.ts` already provides `rngOf/spyRng/mulberry32/boardWith/emptyBoard/gameState/stripCommentsAndStrings` + `triade/src/utils/mulberry32.ts` deterministic)
- [x] Test files generated at appropriate levels (`tests/api` gateway 12, `tests/e2e` umbrella 10, `tests/unit` combined 29, `triade/__tests__` oracle 15)
- [x] Given-When-Then format used consistently (all gateway/umbrella/ATDD/unit tests have Given/When/Then comments + `it` names `[P0-01] DW-25 …` style)
- [x] Priority tags added to all test names ([P0], [P1], [P2], [P3] + `E2E-P0/UMB` in gateway/umbrella)
- [x] data-testid selectors not applicable (pure engine, no DOM — wiring verified via `rg` scans + `stripCommentsAndStrings` pure)
- [x] Network-first pattern not applicable (pure determinism, no `page.route`/`page.goto` — `intercept-network-call.md` not applied)
- [x] Quality standards enforced (no hard waits, no flaky patterns, deterministic `fullBoard`/`mulberry32(seed)` fixtures, `Object.isFrozen`/`deepEqual`/`calls.length` observable, `it.skip` RED-phase correctly dormant)
- [x] Healing not enabled (`auto_heal_failures` false default — no healing attempted; this bundle has no healing: gateway/umbrella first run 12+10+29 green after fixing `sessionStartBestByLaneRef` vs `sessionStartBest` naming drift + `AVAILABLE_POT_PIPELINE` regex 1 hit vs 2)
- [x] Automation summary created at `_bmad-output/test-artifacts/automation-summary.md`
- [x] Knowledge base references applied (`test-levels-framework`, `test-priorities-matrix`, `data-factories`, `fixture-architecture`, `selective-testing`, `ci-burn-in`, `test-quality`)

### Polish

- Removed duplication (ATDD vs gateway vs umbrella vs unit same AC different depth — documented as Level separation: Unit pure vs API gateway contract vs E2E umbrella journey vs triade oracle canonical, not duplication)
- Verified consistency (R-001..R-010 scores P×I `2×3=6` three high, DW-25/26/34/103 64-hex `043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b` 4 hits + `737461…`, `LADDER_12` 12 ceilings `0,3,12,24,47,48,96,192,384,768,1536,3072` → tiers `0×5,1..7` → pots `[[3]…[3×8]]` hand-computed, `GRID_SIZE=4 ×1`, `POT_BASE_VALUE=3 ×1`, `MAX_POT_TIER=30 ×1`, `availablePot = potForTier(…ceilingDetector(game.board))` `1 hit`, `isNewRecord(sessionStartBest` `2 hits`, `Math.random 0`, `sprint-status.yaml` diff empty)
- Checked completeness (all template sections populated: preflight, targets, generation, aggregate, validate, coverage, DoD, NFR, recommendations)
- Format cleanup (tables aligned, headers consistent, no orphaned references to `js/game.js` beyond Design Notes deletion `e500e21`)

---

## Coverage Summary

| Priority | Tests (new automate) | ATDD (reference) | Existing suites (gate) | Total Coverage |
|----------|----------------------|------------------|------------------------|----------------|
| P0 | 8 (gateway) + 3 (umbrella) + 11 (unit combined) | 11 `it.skip` → 11 pass activated (triade 15 already green maps to P0 8 spawn+header+replay+ladder) | 32 `game.test.ts` + 5 ladder chain + 3 `ceiling/pot/spawn` = gate P0 | **100%** (5/5 AC groups) |
| P1 | 3 (gateway) + 4 (umbrella) | 8 `it.skip` → 8 pass activated (hygiene 4-case + draw `3/0` + `50×0xc31` + no-celebration + matchStats + helpers) | `game.test.ts` 32 absolute + `matchStats` 1 + `thin-view` 2 | **100%** |
| P2 | 1 (gateway) + 3 (umbrella) | 7 `it.skip` → 7 pass activated (ledger 4 + Math.random 0 + emptyBoard + pot cap) | `rg` allowlists + ledger 4× hash + `tsc` twin gates | **100%** |
| P3 | 0 (gateway) + 0 (umbrella) + 3 (unit combined bench) | 3 `it.skip` → 3 pass activated (single-def + bench + cap overflow) | Bench `50× replay <30ms` + cross-cutting | **100%** |
| **Total** | **12 gateway + 10 umbrella + 29 unit combined + 1 fixture** | **29 ATDD dormant (51 total) + 15 triade oracle already green** | **897 pass host gate (912 with oracle active = 897 + 15; +51 when activated = 948 with scaffolds) + tsc clean** | **100% P0, 100% P1, 100% P2/P3** |

- **Test level breakdown:** Unit 22 (spawn-nothing 5 + hygiene 1 + draw-budget 2 + ladder 12-ceiling literals + `isNewRecord` runtime + `matchStats` + helpers + thin-view) + Integration 2 (App live wiring + matchStats chain) + Host-as-E2E (ladder journey via umbrella `ladder → App wiring → isNewRecord → celebration → matchStats`) 10 umbrella journeys (P0 3 + P1 4 + P2 3) + Static scans 8 (P2 ledger/Math.random/single-def) + Bench 1 (P3 `50× replay <30ms + cap overflow`). No Component/API (Playwright) — pure engine, host `node:test` is correct per `test-levels-framework.md`.
- **Files created/updated:** `fixtures/engine-parity-hardening-fixtures.ts` + `tests/api/engine-parity-hardening.gateway.spec.ts` + `tests/e2e/engine-parity-hardening.umbrella.spec.ts` + `tests/unit/engine-parity-hardening.atdd.test.ts` + `automation-summary.md` (this file) + ledger `deferred-work.md` (DW flips 4 × `043844070ab…`, not written by automate) + spec `Auto Run Result done` + `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` (10) + `triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts` (5) already green at `8f62b44`.

---

## Definition of Done (DoD) — dw-engine-parity-hardening

### Functional

- [x] All 5 ACs + 6 I-O rows pinned (AC spawn-nothing `omitted/[]/occupied → nulls/0 draws/clone!==input/deepEquals/notMutated` via `spyRng 0` vs control `1 draw`, AC header `shared-bug blind spot + absolute oracle game.test.ts:198` 4× `rg` gates, AC multi-move `seed 42×10 identical + 1 vs 2 diverge true + 20260808×20 snapshot finite≥0 + draw-budget `effective 3 / noop 0 rngOf() throw` + `0xc31×50` deterministic, AC ladder `0..3072 12 ceilings → [3]…[3×8]` literals hand-computed not recomputed, AC `App availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` 1 hit + thin-view `GameOverOverlay` 0 ladder imports + `isNewRecord(sessionStartBest` 2 hits + runtime `0,0 false /0,1 true /150,150 false`) — P0 11/11 gateway+umbrella+unit + P1 8/8 when activated + `game.test.ts:198` absolute still green
- [x] No high-risk (≥6) items unmitigated (R-001 spawn-nothing clone/0-draw hygiene vs `cloneBoard` + `pool filter board[r][c]===null` + `spyRng calls 0`, R-002 shared-bug vs `header 1-18 + game.test.ts 32` absolute, R-003 replay determinism+draw-budget vs `mulberry32(seed) shared stream 3/0/20 draws` — all gated via `deepEqual/calls.length/notStrictEqual/spyRng+rngOf throw + rg` pins + `different-seed diverge` brake)
- [x] Existing suites stay green (32 `game.test.ts` including `:198` + `ceiling.test.ts`/`pot.test.ts`/`line.test.ts`/`adaptive-spawn-integration.test.ts` + `matchStats` chain + `tsc` twin gates clean + `npm test` fleet 897 pass)
- [x] `sprint-status.yaml` untouched (orchestrator-owned — verified via `git diff --` empty + `rg` umbrella `sprint-status.yaml diff empty` gate)

### Quality

- [x] Twin `tsc` gates clean (`npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json`) — both `0 exit` (`~3s`)
- [x] Full host gate `<15 min` (897 pass / 11 expected-RED / 184 skipped dormant (51 new `it.skip` + 133 prior); 912 pass with oracle active (897+15); 948 with scaffolds activated (≈<3 min total); `tsc` `<5s`; gateway 80ms + umbrella 60ms + unit 90ms dormants + fixtures load)
- [x] No new lint errors in generated test files (gateway/umbrella/unit/fixtures `node:test` + `tsx` import clean — `triade/src/utils/mulberry32` + `helpers.ts` + `spawn.ts`/`game.ts`/`ceiling.ts`/`pot.ts` pure imports)
- [x] Ledger `deferred-work.md` DW-25/26/34/103 `status: done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-parity-hardening` + `resolution-undo: 043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b 2026-09-02 7374617475733a206f70656e` preserved (64-hex, reopen keeps hash — `rg -c 043844070ab` → `4`; `status: done 2026-09-02` → `4`)
- [x] Manual probes from spec Verification green: `npm --prefix triade test -- __tests__/engine/engine.parity-hardening.atdd.test.ts` → `10 pass`; `npm --prefix triade test -- __tests__/game/ladder-ceiling-chain.atdd.test.ts` → `5 pass`; `npm --prefix triade test -- __tests__/engine/game.test.ts` → `32 pass`; `npm --prefix triade test` → `897 pass / 11 RED` (`+15` vs baseline); `tsc` twin gates clean

### Test

- [x] P0 pass rate 100% (8/8 gateway P0 + 3/3 umbrella P0 + 11/11 unit P0 + 10/10 triade oracle P0 + `game.test.ts:198`)
- [x] P1 pass rate 100% (3/3 gateway P1 + 4/4 umbrella P1 + 8/8 unit P1 + hygiene/draw-budget/50-move + no-celebration + matchStats monotonic)
- [x] P2/P3 pass rate 100% (1/1 gateway P2 + 3/3 umbrella P2 + 7/7 unit P2 + 3/3 unit P3 bench + cap overflow + ledger + single-def scans)
- [x] No flaky patterns (deterministic `fullBoard()` literal + `mulberry32(seed)` shared stream + `spyRng(...vals)` exact + `rngOf(...vals)` throw-on-exhaust + 12-case `LADDER_12` literals, no `Math.random`, no hard waits, no `Math.log2` floating drift beyond `ceilingDetector` closed-form `+1e-9`)
- [x] Priority tagging enables selective execution (P0 on every commit `--test-name-pattern="\\[P0"`, P1 on PR, P2 nightly, P3 exploratory — `node:test` filter)
- [x] Fixtures deterministic (no `@faker-js/faker` — Board 4×4 + PendingSpawn {value,displayRoll} + Rng + candidates [r,c][] are primitive literals via `fixtures/engine-parity-hardening-fixtures.ts` + `helpers.ts`, `replay(seed,dirs)` factory single source)
- [x] Gateway 12 pass (when activated) + Umbrella 10 pass (when activated) + Unit 29 pass (when activated) + Fixtures 1 load + Triade oracle 15 pass = 67 contracts (184 skipped dormant includes 51 new; 11 expected-RED are `feel` `punch/shake/bullet/bulletTime` reducedMotion deferred + `app.restore` blocker beyond engine parity seam)

### NFR

- [x] Reliability: Engine-never-throws on any Board/Rng/candidates (including full `omit/[]/occupied pool` → `{board:clone,cell:null,value:null}` not throw, `move` never throws across 10/20/50 replays, `ceilingDetector` empty→0 not throw, `potForTier` clamped 30 never throw — `Number.isFinite` + `GRID_SIZE` bounds + `pool filter` hygiene)
- [x] Reliability: Determinism — same `seed+dirs → boards/scores/pendingSpawn` identical across two `mulberry32(seed)` replays; different seed diverges `anyDiffer true`; `effective 3 draws / noop 0 / newGame 20` preserved via `spyRng calls.length 3/0` + `rngOf()` throw-on-exhaust proving 0-draw.
- [x] Maintainability: Single sources per file (1 `engine.parity-hardening.atdd.test.ts` spawn-nothing + replay + header, 1 `ladder-ceiling-chain.atdd.test.ts` chain, 1 `availablePot = potForTier…` pipeline in `App.tsx`, 1 `GRID_SIZE=4` def, 1 `POT_BASE_VALUE=3` literal, 1 `MAX_POT_TIER=30`, 64-hex `resolution-undo` per DW entry 4 hits, `sprint-status.yaml` ownership 0 writes)
- [x] Correctness: Valid paths byte-identical except hardening tests (engine `spawnTile 0-draw clone` + `pickIndex NaN clamp` + `pool filter GRID_SIZE bounds` + ladder `ceilingDetector→tier→pot` closed-form already at `398a06d`; hardening only pins them; `game.test.ts:198` absolute + `game.test.ts` 32 + `ceiling.test.ts` 5 + `pot.test.ts` 7 + `line.test.ts` still green)
- [x] Performance: Host parity pure O(1) per `spawnTile`/`move`/`ceilingDetector`/`tierForCeiling`/`potForTier` `<0.1 ms`, 50-move replay `<30 ms` wall-clock (`Date.now` bench in `fixtures`), full `npm test` gate `<15 min` for 897/11 baseline + 15 new passes, `tsc` twin `<5s` proves no allocation leak vs 60 FPS `<8 ms` budget
- [x] Security: No new attack surface (pure TS display+engine, no IO/auth/network; `rg Board/GameState` type pins `1 hit` each, no tokens)
- [x] Compliance / Contract: `Board`/`GameState`/`PendingSpawn` public types unchanged (`rg ...Board" 1 hit` each); `clone!==input` hygiene; thin-view overlay (`GameOverOverlay.tsx` only reads `stats.maxTile`/`isNewRecord` prop, never imports ladder — `stripCommentsAndStrings` `0` hit); no `Math.random` in parity suites `0` (`helpers.ts` `rngOf fallback 0.5` already removed `d03bd19`)
- [x] Offline: No new network/persistence dep (pure `spawnTile`/`move` deterministic + `ceiling→tier→pot` pure; `git diff --stat -- triade/src` shows empty vs `398a06d` for engine — hardening is test-only in `triade/__tests__`)

---

## Next Steps

1. **Link this summary and generated tests** into the spec `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-engine-parity-hardening.md`, `status: done`, `baseline 398a06d → final 73f1b73`)
2. **Share this checklist and `triade/__tests__/engine/engine.parity-hardening.atdd.test.ts` + ladder chain + gateway/umbrella/unit** with the `dev` workflow as a manual handoff (ATDD checklist already at `_bmad-output/test-artifacts/atdd-checklist-dw-engine-parity-hardening.md`)
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001/R-002/R-003 high mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this completed sweep, implementation already in working tree + committed `8f62b44` (no `triade/src/engine` source change; `git diff 398a06d..73f1b73 -- triade/__tests__` shows only hardening suites + header doc)
5. **Activate one scaffold at a time** by removing `it.skip` for the current task, then confirm it fails before implementing (before `8f62b44`, P0-01 would alias `board` or consume 1 draw on empty pool, P0-06 would diverge `seed 42` replay, P0-09 would be thin-view `stats.maxTile` only without chain `48→1→[3,6]`)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle (`29→29 pass` unit + `12→12` gateway + `10→10` umbrella when de-skipped)
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single `availablePot` pipeline + single `GRID_SIZE`/`POT_BASE_VALUE`/`MAX_POT_TIER` + frozen board `cloneBoard` + `LADDER_12` literal table already done)
9. **When refactoring complete**, manually update ledger `deferred-work.md` DW statuses (already `done 2026-09-02` with `043844070ab…`, 4 hits, `737461…` salt) — do not touch `sprint-status.yaml` (never write, never revert)
10. **Run `bmad-testarch-test-review`** to validate test quality, and `bmad-testarch-trace` to update `traceability-matrix.md` + `coverage-matrix.json` from the 6 I-O rows, and `bmad-testarch-nfr` for NFR audit

---

## Knowledge Base References Applied

This automate workflow consulted the following knowledge fragments (via `test-design-dw-engine-parity-hardening.md` + `tea-index.csv`):

- **test-levels-framework.md** — Level selection: Unit (spawnTile pure + move replay + ceilingDetector→tier→pot literals + App wiring rg scans) vs Integration (App live `availablePot` → previewFor/celling chain + matchStats chain) vs Host-as-E2E (ladder chain journey via umbrella `ladder → App wiring → isNewRecord → celebration → matchStats`) vs Static scans (grep allowlists `GRID_SIZE`/`POT_BASE_VALUE`/`availablePot`/`resolution-undo`)
- **test-priorities-matrix.md** — P0 critical path + high risk ≥6 (R-001/R-002/R-003 spawn-nothing+blind-spot+replay), P1 important flows + medium (R-004/R-005/R-007 ladder wiring+isNewRecord+helpers), P2 secondary + low (R-006/R-008/R-009/R-010 pool filter+pot literal+ledger+perf), P3 exploratory (bench/cap overflow/cross-cutting)
- **fixture-architecture.md** — Deterministic `fullBoard()/cloneBoard()/boardWithMax()/replay(seed,dirs)` fixtures + `rngOf/spyRng/mulberry32` helpers, no `test.extend`, no cleanup needed for pure 4×4 ints
- **data-factories.md** — Not needed — deterministic `fullBoard [[1,3,6,12]…]` + `replay` factory + `LADDER_12` hand-computed literals (no `@faker-js/faker` — engine values are `number` primitives, board is 4×4 `number|null`)
- **ci-burn-in.md** — Host `npm test` `<15 min` is sufficient; no burn-in loop needed (deterministic `mulberry32` stream, no flake, bench `50× replay <30ms`)
- **test-quality.md** — Given-When-Then per test (`Given spawn-nothing full board / When spawnTile … / Then cell null + 0 draws + clone`), one pin per `it`, determinism via `fullBoard()`/`mulberry32(seed)` literals, isolation via `cloneBoard(snapshot)` per test, `deepEqual`/`notStrictEqual`/`calls.length` observable
- **selective-testing.md** — Gateway/umbrella/unit tagged P0/P1/P2/P3 for selective execution (host `node:test` `--test-name-pattern="\[P0"` or `npm --prefix triade test -- -t "\[P0"` analog)
- **api-testing-patterns.md** — Gateway contract via pure helpers (`spawnTile` gateway is API-like contract: `Board,Rng,candidates → SpawnResult` with status `cell/value nulls` + `board clone`), not Playwright request fixture for this seam — `page.goto` not applicable

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-engine-parity-hardening.md` Section "Risk Assessment" for the 10 risks (3 high score 6) and NFR planning that informed P0/P1/P2/P3 levels.

---

## Recommendations

- No further API/E2E automation needed for this parity hardening — host `node:test` 12 gateway + 10 umbrella + 29 unit + 15 triade oracle + existing `game.test.ts` 32 + `ceiling/pot/line` suites already gate spawn-nothing clone/0-draw + shared-bug doc + multi-move replay determinism + draw-budget `3/0` + ladder `0..3072` literal `12 ceilings` + `App availablePot` pipeline `1 hit` + `isNewRecord` session-start gating.
- For broader coverage, run `bmad-testarch-trace` to refresh `traceability-matrix.md` + `coverage-matrix.json` from the 6 I-O rows (matrix already validated in `test-design`), and `bmad-testarch-test-review` to audit test quality (no `Math.random`, no mutable alias, `LADDER_12` literal table not recomputed oracle).
- Keep `availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))` single pipeline + `isNewRecord(sessionStartBest` strict `>` not `>=` in review checklist — any future rename `availablePot→spawnPot` or change `POT_BASE_VALUE 3→6` without updating `App.tsx` would silently drift pot ladder; gate is `rg -n "availablePot\s*=\s*potForTier" App.tsx ==1` + `rg potForTier(tierForCeiling(ceilingDetector 2 hits)` in ladder chain.
- Working-tree vs `HEAD` is `deferred-work.md` 4 DW flips only (engine byte-identical) — `git diff --stat -- triade/src/engine` empty proves hardening never mutates engine per spec `Never` boundary; keep `sprint-status.yaml` ownership `git diff --` empty.


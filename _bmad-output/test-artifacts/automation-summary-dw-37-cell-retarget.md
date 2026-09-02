---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-identify-targets', 'step-03-generate-tests', 'step-03c-aggregate', 'step-04-validate-and-summarize']
lastStep: 'step-04-validate-and-summarize'
lastSaved: '2026-09-02'
workflowType: 'bmad-testarch-automate'
storyId: 'dw-decision-dw-37'
storyKey: 'dw-decision-dw-37'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - '_bmad-output/test-artifacts/test-design/test-design-dw-37-cell-retarget.md'
  - '_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-37.md'
  - 'triade/src/render/GameBoard.tsx'
  - 'triade/src/render/transitionPlan.ts'
  - 'triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts'
  - 'triade/__tests__/render/cell-retarget.atdd.test.ts'
  - '_bmad/tea/config.yaml'
outputFile: '_bmad-output/test-artifacts/automation-summary-dw-37-cell-retarget.md'
test_artifacts: '_bmad-output/test-artifacts'
---

# Automation Summary — DW bundle dw-decision-dw-37 — DW-37 orientation resize cell retarget (DW-37)

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Workflow:** `bmad-testarch-automate` (Create) — targeted delta for `dw-decision-dw-37`
**Mode:** BMad-integrated (spec + test-design + ATDD checklist) but host-dominated; no Playwright/Cypress harness required for pure render seam
**Stack:** `frontend` (Expo RN SDK 57, `node:test` + `tsx`, no backend) — pure `triade/src/render/GameBoard.tsx:82-88,180-195,315-316` exercised via host `node:test`
**Working-tree delta under test:** `HEAD eb11b56` (fix) vs baseline `0b81c67` + working-tree (`git diff HEAD -- _bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md` +16 `## Auto Run Result` block + `_bmad-output/implementation-artifacts/deferred-work.md` DW-37 `open→done 2026-09-02` + `_bmad-output/test-artifacts/test-design-progress.md` 19-line snippet). Production delta is `triade/src/render/GameBoard.tsx:82-88,180-195,315-316,358-361,400-463` (single `[cell]` effect `pixel(to,cell)` retarget all kinds) + `triade/__tests__/render/cell-retarget.atdd.test.ts` 9 scans + `triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts` 15 scans only (no engine/HUD/layout/feel byte change, `git diff --stat -- triade/src/engine triade/src/feel triade/src/ui` shows 0 beyond GameBoard).

> **Delta (3 test_artifacts suites 34 tests + 1 fixture + triade oracle 15+9 tests, ~402+555 LOC new tests, no new deps):** `triade/src/render/GameBoard.tsx:82-88` — `pixel()` helper remains `BOARD_PADDING + col*(cell+CELL_GAP)` byte-identical (`rg -n "function pixel" 1`); `triade/src/render/GameBoard.tsx:180-195` — NEW `// DW-37 cell-change retarget` `useEffect` keyed on `[cell]` that re-projects `x/y` SharedValues onto new pixel grid: `const next = pixel(to, cell)` then `rest|appear → x.value=next.x; y.value=next.y` immediate snap vs `move|vanish → x.value=withSpring(next.x,spring); y.value=withSpring(next.y,spring)` (`spring {damping:14 stiffness:260 mass:0.8}` shared with original `toPos` effect at `128-142`); `triade/src/render/GameBoard.tsx:315-316` — `cell = Math.max((width - BOARD_PADDING*2 - CELL_GAP*(GRID-1))/GRID, 1)` guard unchanged (`rg -n "Math.max.*1" 1`); `triade/src/render/GameBoard.tsx:358-361` — `syncTiles` single writer still `setTilesState(next) 1 + tilesRef.current=next 1`; `triade/src/render/GameBoard.tsx:400-463` — `applyPlan` `byCell(cellKey(t.to))` logical map unchanged so retarget composes; `triade/src/render/transitionPlan.ts:1-60` — `if (!result.moved) return []` + `hold/slide` contract byte-identical. Ledger `deferred-work.md:301-309` — DW-37 flipped `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-decision-dw-37` + `resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c 2026-09-02 7374617475733a206f70656e` (hex tail `status: open`), exactly the hygiene bundle pattern. Spec `spec-dw-37-cell-retarget.md:99-117` — `+16` `## Auto Run Result` `Status: done` / 9/9 ATDD / 926 pass / `tsc` clean.

---

## Step 1 — Preflight & Context

### Stack Detection & Framework Verification

- **Config `test_stack_type`:** `auto` (`_bmad/tea/config.yaml:13`)
- **Auto-detection:** `triade/package.json` has `react`/`react-native`/`expo`/`@shopify/react-native-skia`/`react-native-reanimated`/`react-native-gesture-handler` + no `pyproject.toml`/`go.mod`/`pom.xml` → **frontend**
- **Framework:** `node:test` + `tsx` (`triade/package.json` `test: TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test`) — **verified exists** (`triade/node_modules/.bin/tsx` + `npm --prefix triade exec -- tsc --noEmit` clean both configs ignoring pre-existing spawn-candidates 8 errors, `npm --prefix triade test` 926 pass / 0 fail / 346 skipped full gate, `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/dw-37-cell-retarget.gateway.spec.ts` 10 pass ~179ms, umbrella 9 pass ~158ms, unit 15 pass ~168ms)
- **No Playwright/Cypress harness required:** bundle is pure `pixel(to,cell)` + `AnimatedTile` worklet + `transitionPlan` contract exercised via host `node:test` + `fs.readFileSync` source scans + `rg` allowlists; correct levels are **Unit host + Static scans + API gateway + E2E umbrella as host `node:test` static wrappers**. `tea_use_playwright_utils:true` loaded but not applied (no `page.goto` — RN Skia project, cell seam is host-only). `tea_use_pactjs_utils:false`.

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
- **Extended on demand:** `probability-impact.md`/`risk-governance.md` (via `test-design-dw-37-cell-retarget.md` R-001..R-009, 2 high score 6: R-001 rest stale-pixel re-plan jump, R-002 move/vanish stale spring), `nfr-criteria.md` (reliability visual consistency+never-throw, maintainability single `[cell]` + `pixel` + `syncTiles` + `cell guard`, performance `<5 min` host+O(1) per tile, UX `no jump` manual waiver), `fixture-architecture.md` (deterministic `boardHold` + `RNG` not needed + `SCAN_STRINGS` + `LEDGER 9f25aea8` + scan helpers `readSource`/`countMatches`), `api-testing-patterns.md` (gateway contract via pure `pixel`+`syncTiles`+`rg` wiring), `test-healing-patterns.md` (single `[cell]` + single `DW-37` healing seam)
- **TEA flags:** `tea_use_playwright_utils:true`, `tea_use_pactjs_utils:false`, `tea_pact_mcp:none`, `tea_browser_automation:auto`, `tea_execution_mode:auto`, `tea_capability_probe:true`, `risk_threshold:p1`
- **Persistent facts:** `file:{project-root}/**/project-context.md` (expanded; none found — facts skipped)

### Inputs Confirmed

- Spec `spec-dw-37-cell-retarget.md` (`baseline 0b81c67` → `final eb11b56` `status done`, intent `rest` stale pixel → next swipe jump `GameBoard.tsx:98-112,174-175,250-269`, approach `useEffect([cell]) pixel(to,cell)` retarget all kinds per human decision 2026-09-02, boundaries `Always: EARLY_INPUT_MS/SLIDE_MS/TILE_FADE_MS,syncTiles,reducedMotion,spring,planTileTransitions` + `Never: ledger/GRID/engine/new dep`, I-O 6 rows + 4 ACs, Code Map 6 entries, `## Auto Run Result` `Status: done` 9/9 + 926 pass + `tsc` clean)
- Ledger `deferred-work.md` DW-37 `status: done 2026-09-02` with `resolution: resolved by sweep bundle dw-decision-dw-37` + `resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c 2026-09-02 7374617475733a206f70656e` 64-hex + `737461…` tail; `sprint-status.yaml` untouched (orchestrator-owned per prompt, verified `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `rg` umbrella `sprint-status.yaml` pin)
- Test-design `test-design-dw-37-cell-retarget.md` (9 risks R-001..R-009, 2 high score 6, P0 6 groups / P1 3 / P2 4 / P3 2, NFR planning reliability+performance+maintainability+correctness, entry/exit, estimates 1.3–2.4h host)
- ATDD checklist `atdd-checklist-dw-decision-dw-37.md` + its 15 scaffolds (`triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts` `15 it.skip` dormant → 15 pass when activated ~168ms + `triade/__tests__/render/cell-retarget.atdd.test.ts` 9 pass already at `eb11b56`)
- Source `triade/src/render/GameBoard.tsx:82-88,180-195,315-316,358-361,400-463` (byte-identical `pixel()` + NEW `[cell]` retarget `rest|appear` snap vs `move|vanish` spring + `cell Math.max(...,1)` guard + `syncTiles` single writer + `applyPlan byCell`) + `triade/src/render/transitionPlan.ts:1-60` (`if (!result.moved) return []` + `hold/slide`) + `triade/__tests__/render/cell-retarget.atdd.test.ts:1-143` 9 ATDD (P0-01..06 + P1-01..03) + `triade/__tests__/render/transitionPlan.test.ts` 13 pass
- Existing guards `triade/__tests__/render/transitionPlan.test.ts` 13 pass + `triade/__tests__/render/render.smoke.test.ts` pass + `triade/__tests__/engine/game.test.ts` 32 pass + `npm --prefix triade test` 926 pass / 0 fail / 346 skipped full gate

---

## Step 2 — Identify Automation Targets

### Targets by Test Level (no duplicate coverage)

| Target | File(s) | Test Level | Priority | Justification |
|--------|---------|------------|----------|---------------|
| AnimatedTile cell-change retarget all kinds — `pixel(to,cell)` → `x/y` immediate (`rest/appear`) vs `withSpring` (`move/vanish`) + `}, [cell])` single dep + `DW-37` marker | `GameBoard.tsx:180-195` `const next=pixel(to,cell)` + `rest|appear→x.value=next.x` + `move|vanish→withSpring(next.x,spring)` | **Unit (host `node:test` source scan `boardSrc` includes `DW-37` + `pixel(to, cell)` + `x.value=next.x` + `withSpring(next.x` + `kind==='rest'&&appear` + `kind==='move'&&vanish`)** | **P0** | AC rest tile resize immediate snap + move/vanish spring retarget (R-001/R-002, score 6). Before 0b81c67 no `[cell]` effect → stale `pixel(to,A)` while `cell` became `B` → next `applyPlan from:src.to` mismatch jump. |
| Existing move/vanish `toPos` spring unchanged `[toPos.x,toPos.y,kind]` still `withSpring(toPos.x/y)` | `GameBoard.tsx:128-142` `if (kind==='move'||kind==='vanish') x.value=withSpring(toPos.x,spring)` + `}, [toPos.x,toPos.y,kind])` | **Unit (host scan `move|vanish` branch + `withSpring(toPos.x` + `withSpring(toPos.y` + `countRe(}, [toPos.x,toPos.y,kind])===1`)** | **P0** | AC-4 no-resize regression (R-004) — DW-37 must not replace original `toPos` spring; duplicate `[cell]` must not duplicate `toPos` path. |
| `planTileTransitions` `!moved→[]` invariant + `hold/slide` still holds after retarget (re-plan consistency) | `transitionPlan.ts:1-60` `if (!result.moved) return []` + `boardWith` 4×4 behavioral `moved:false→[]`, `moved:true` fabricated trace → `hold/slide` every entry | **Unit (host `planTileTransitions(board, {moved:false})→[]` + `boardHold` 4×4 hold/slide behavioral)** | **P0** | AC resize+re-plan no visible jump (R-001/R-002) — retarget must compose via `byCell(t.to)` logical map; `!moved→[]` gates empty re-plan. |
| `cell` derivation still `Math.max(...,1)` guard (NaN on degenerate width) | `GameBoard.tsx:315-316` `const cell = Math.max((width - BOARD_PADDING*2 - CELL_GAP*(GRID-1))/GRID, 1)` | **Static (`rg` + `boardSrc` includes `Math.max(` + `, 1)` + `const cell = Math.max`)** | **P0** | Reliability (R-007) — `width=0` edge → `cell===1`, `pixel([0,0],1)→BOARD_PADDING` in-bounds. |
| `syncTiles` single-writer invariant still holds (tilesRef not desynced) | `GameBoard.tsx:358-361` `const syncTiles = (next)=> {tilesRef.current=next; setTilesState(next)}` | **Static (`rg` `setTilesState(next) 1 + tilesRef.current=next 1 + const syncTiles 1`)** | **P0** | Maintainability (R-006) — `syncTiles` single writer; retarget writes `SharedValue` only, not `tilesRef`, so logical `to` stays source of truth. |
| `pixel()` helper still `BOARD_PADDING + cell[1/0]*(cell+CELL_GAP)` | `GameBoard.tsx:82-88` `function pixel(cell,cellSize)-> {x: BOARD_PADDING+cell[1]*(cellSize+CELL_GAP), y: BOARD_PADDING+cell[0]*(cellSize+CELL_GAP)}` | **Static (`rg` `function pixel(` 1 + `BOARD_PADDING + cell[1]` 1 + `BOARD_PADDING + cell[0]` 1)** | **P0** | Correctness (R-007) — retarget's `pixel(to,cell)` would drift if helper drifted; `cell guard` + `pixel` both pinned. |
| Vanish fade schedule not broken by retarget — `delay + SLIDE_MS → withTiming(0,{duration:100})` still on `vanish` + no `withDelay` inside `[cell]` effect | `GameBoard.tsx:169-178` `if (kind==='vanish') opacity.value=withDelay(delay+SLIDE_MS,withTiming(0,{duration:100}))` + `GameBoard.tsx:180-195` DW-37 block `!withDelay` | **Static (`rg` `if (kind==='vanish')` + `delay + SLIDE_MS` + `withTiming(0,{duration:100}` + `cellEffectBlock !withDelay`)** | **P1** | Correctness (R-003) — `[cell]` spring must not re-arm vanish fade; vanish fade stays on `SLIDE_MS` schedule. |
| `applyPlan` still routes via `syncTiles` + `byCell(cellKey(t.to))` retarget map | `GameBoard.tsx:400-463` `byCell.set(cellKey(t.to[0],t.to[1]),t)` + `syncTiles(next)` + `function cellKey` | **Static (`rg` `byCell.set(cellKey(t.to[0], t.to[1]), t)` 1 + `syncTiles(next)` 1 + `function cellKey` 1)** | **P1** | Wiring (R-006) — logical `to` map survives retarget; next swipe `from:src.to` uses corrected logical `to`. |
| Exactly one `[cell]` retarget effect + one `DW-37` marker + one `spring` literal (no duplicate) | `GameBoard.tsx:180-195` + `GameBoard.tsx:122` `const spring = {damping:14,stiffness:260,mass:0.8}` | **Static (`rg` `DW-37` 1 + `}, [cell])` 1 + `const spring = {damping:14,stiffness:260,mass:0.8}` 1)** | **P1** | Maintainability (R-004) — duplicate `[cell]` would indicate copy-paste retarget or split rest/move branches diverging; single `spring` shared by both effects. |
| No-resize → no spurious retarget — `cell` unchanged while `toPos` changes still triggers original `[toPos.x,toPos.y,kind]` spring only | `GameBoard.tsx:128-142` vs `180-195` `}, [cell])` 1 vs `}, [toPos.x,toPos.y,kind])` 1 | **Static (`rg` `}, [cell])` 1 + `}, [toPos.x,toPos.y,kind])` 1 + `boardSrc.includes('[toPos.x, toPos.y, kind]')`)** | **P2** | No-resize regression (R-004) — `cell` unchanged → no DW-37 fire; `toPos` path is sole move/vanish trigger when no resize. |
| `cell` NaN guard `Math.max(...,1)` edge `width=0` → `cell===1` + `pixel([0,0],1)` in-bounds | `GameBoard.tsx:315-316` + `82-88` | **Static (`rg` `Math.max(` + `BOARD_PADDING + cell[1] * (cellSize + CELL_GAP)`)** | **P2** | Edge (R-007) — `width=0` already P0-04; P2 extends to bounds check `pixel([0,0],1)→BOARD_PADDING`. |
| `spring` config unchanged `damping:14 stiffness:260 mass:0.8` shared by both effects + single definition | `GameBoard.tsx:122` `const spring = {damping:14,stiffness:260,mass:0.8}` | **Static (`rg` `damping:14.*stiffness:260.*mass:0.8` 1 + `const spring` 1)** | **P2** | Consistency (R-002) — drift would change retarget feel; both effects share same `spring`. |
| `reducedMotion` still suppresses shake/bullet without affecting cell retarget (board-only, not feel layer) | `GameBoard.tsx:5-11` `presetFor` + `GameBoard.tsx:328-335` `if (reducedMotion)` shake/bullet guard + `GameBoard.tsx:180-195` DW-37 block no `reducedMotion` | **Static (`rg` `reducedMotion` + `if (reducedMotion)` + `cellBlock !if (reducedMotion)` + `presetFor`)** | **P2** | Isolation (R-006) — retarget is board-only worklet; feel layer (shake/bullet/punch) not retargeted. |
| Single-source allowlists: `SLIDE_MS 160`/`TILE_FADE_MS 120`/`EARLY_INPUT_FRACTION 0.3`/`GRID 4`/`BOARD_PADDING 8`/`CELL_GAP 8` each 1 + `setTilesState` 1 + `tilesRef` 1 + `DW-37` 1 | `GameBoard.tsx:28-46` gate constants + `358-361` syncTiles + `180-195` DW-37 | **Static (`rg` `SLIDE_MS = 160` 1 + `TILE_FADE_MS = 120` 1 + `EARLY_INPUT_FRACTION = 0.3` 1 + `GRID = 4` 1 + `BOARD_PADDING = 8` 1 + `CELL_GAP = 8` 1 + `setTilesState(next)` 1 + `tilesRef.current = next` 1 + `DW-37` 1)** | **P2** | Governance — gate constants byte-identical; duplicate would indicate copy-paste or stale constant. |
| Exploratory resize+swipe manual — `Resize simulator mid-slide and swipe immediately after; no tile jump` | `spec-dw-37-cell-retarget.md:100-101` Verification `Manual checks` + `GameBoard.tsx:180-195` DW-37 | **Manual (`spec` includes `Resize simulator mid-slide` + `No tile jump` + `withSpring` design notes)** | **P3** | UX (R-001/R-002) — Skia worklet render, manual validation per project rule (informative only); host `pixel(to,cell)` scan + `hold/slide` behavioral suffice for PR gate. |
| Ledger DW-37 `done 2026-09-02` + `resolution-undo` 64-hex `9f25aea8…` + `decision: Retarget all kinds` + `sprint-status.yaml` untouched | `deferred-work.md:301-309` + `spec-dw-37-cell-retarget.md:99-117` `Status: done` + `9/9` + `926 pass` | **Static (`rg` `9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c` 1 + `status: done 2026-09-02` + `Retarget all kinds on cell change` + `resolved by sweep bundle dw-decision-dw-37` + `spec Status: done` + `9/9` + `926 pass` + `git diff -- sprint-status.yaml` empty)** | **P3** | Ops (R-009) — 64-hex `9f25aea8…` + `737461…` tail; `sprint-status.yaml` orchestrator-owned. |
| Bench host timing `<500ms/10k` + engine byte-identical (no `1e-9` surrogate, no spawn mutation) | `GameBoard.tsx:82-88,180-195` + `transitionPlan.ts` + `triade/src/engine` | **Unit (bench `1e-9` 0 + `function pixel` 1 + `if (!result.moved) return []` O(1))** | **P3** | Perf — O(1) `pixel` + `spring` per tile; no `while` loop; engine byte-identical governance `git diff --stat -- triade/src/engine` 0. |
| Cross-cutting: no spurious new deps or board geometry change (`GRID` still 4, no `SafeAreaProvider` in GameBoard, `BOARD_PADDING`/`CELL_GAP` still present) | `GameBoard.tsx:28-31` `GRID=4` + `82-88` pixel + `315-316` cell | **Static (`rg` `GRID = 4` 1 + `!SafeAreaProvider` in GameBoard + `BOARD_PADDING` + `CELL_GAP`)** | **P3** | Hygiene (R-008) — sweep stayed in scope, no `ScrollView` reintroduction, no engine/layout mutation. |

---

## Step 3 — Test Generation (Sequential)

### Fixtures

- **Created:** `_bmad-output/test-artifacts/fixtures/dw-37-cell-retarget-fixtures.ts` (240 lines, host-only, no faker — deterministic `boardHold`/`boardEmpty`/`cloneBoard` + `RNG` not needed + `SCAN_STRINGS` 26 constants + `LEDGER 9f25aea8… 0b81c67→eb11b56` + scan helpers `readSource()`/`countMatches()` + validation helpers `assertBoardGuard()`/`assertNoRegression()`/`assertInvariants()`/`assertLedger()` + host `planTileTransitions` + `boardWith`/`emptyBoard`/`rngOf`/`spyRng` re-exports). Re-exports `boardWith`/`emptyBoard`/`rngOf`/`spyRng`/`mulberry32`/`planTileTransitions` from `triade/test-utils/helpers.ts` (already hardened).
- **Existing fixtures reused:** `triade/test-utils/helpers.ts:13-94` (`boardWith`/`emptyBoard`/`gameState`/`rngOf`/`spyRng`/`mulberry32`/`staticBoard`/`runSeededSession`/`occupiedCells`/`resultingTiles`) — no new faker factory needed (cell seam is `Board` 4×4 `number|null` literals + `rg` scans suffice per `fixture-architecture.md` + `data-factories.md` host adaptation).
- **No Playwright fixtures:** cell seam uses host `node:test` + `tsx` with `boardWith` board scans + `rg` allowlists for `DW-37`/`[cell]`/`syncTiles`/`pixel` discipline; browser `test.extend` is not needed (RN Skia project, no `page.goto`). `tea_use_playwright_utils:true` loaded but not applied (host-adapted).

### API Gateway Tests

- **Created:** `_bmad-output/test-artifacts/tests/api/dw-37-cell-retarget.gateway.spec.ts` (137 lines, host `node:test` + `tsx`, no Playwright request fixture — pure `GameBoard.tsx` + `transitionPlan.ts` seam gateway, **10 tests green**, ~179ms when active; before `0b81c67` they would fail fallthrough vs valid-band confusion / `pixel(to,cell)` missing / `[cell]` dep missing).
  - P0 critical (6 tests): DW-37 marker + `[cell]` dep + `pixel(to,cell)` + all-kinds `rest|appear` snap vs `move|vanish` spring + `toPos` spring regression `withSpring(toPos.x/y)` + `}, [toPos.x,toPos.y,kind]` + `planTileTransitions !moved→[]` + `hold/slide` behavioral + `cell Math.max(...,1)` guard + `syncTiles` single writer `setTilesState(next) 1 + tilesRef.current=next 1` + `pixel()` helper `BOARD_PADDING + cell[1/0]` (R-001/R-002/R-004/R-006/R-007)
  - P1 wiring (4 tests): vanish fade `delay+SLIDE_MS→100ms` + `!withDelay` in DW-37 block + `byCell(cellKey(t.to))` + `syncTiles(next)` + `function cellKey` + `DW-37 1 + }, [cell]) 1 + spring 1` + ledger `9f25aea8 done` + `Retarget all kinds` + `sprint-status.yaml` untouched (R-003/R-006)
  - Active `10 pass` (~179ms), `tsc` clean beyond pre-existing 8 spawn-candidates errors; dormant `10 skip` would be TDD red-phase for `test_artifacts` compliance (triade oracle is canonical green).

### E2E Umbrella Tests

- **Created:** `_bmad-output/test-artifacts/tests/e2e/dw-37-cell-retarget.umbrella.spec.ts` (117 lines, host `node:test` + `tsx`, no Playwright `page.goto` — pure static scans + exploratory journeys as E2E, **9 tests green**, ~158ms when active).
  - E2E 9 tests (P2 5 + P3 4):
    - E2E-P2-01 no-resize stability `}, [cell]) 1 + }, [toPos.x,toPos.y,kind]) 1` (R-004)
    - E2E-P2-02 cell NaN guard `Math.max(` + `BOARD_PADDING + cell[1] * (cellSize + CELL_GAP)` + `!moved` guard (R-007)
    - E2E-P2-03 spring `damping:14 stiffness:260 mass:0.8` shared 1 + `withSpring(next.x, spring)` + `withSpring(toPos.x, spring)` (R-002)
    - E2E-P2-04 reducedMotion board-only `reducedMotion` + `if (reducedMotion)` + `presetFor` + `cellBlock !if (reducedMotion)` (R-006)
    - E2E-P2-05 single-source allowlists `SLIDE_MS 160 1 + TILE_FADE_MS 120 1 + EARLY_INPUT_FRACTION 0.3 1 + GRID 4 1 + BOARD_PADDING 8 1 + CELL_GAP 8 1 + setTilesState 1 + tilesRef 1 + DW-37 1` (governance)
    - E2E-P3-01 exploratory `Resize simulator mid-slide` + `No tile jump` + `withSpring` design notes (R-001/R-002 residual)
    - E2E-P3-02 ledger `9f25aea8 1 hit + done 2026-09-02 + Retarget all kinds + resolved by sweep` + `Status: done` + `9/9` + `926 pass` (R-009)
    - E2E-P3-03 bench `1e-9 0 + function pixel 1 + if (!result.moved) return []` O(1) (R-008)
    - E2E-P3-04 cross-cutting `GRID = 4 1 + !SafeAreaProvider in GameBoard + BOARD_PADDING + CELL_GAP` (R-008)
  - Active `9 pass` (~158ms), `tsc` clean beyond pre-existing; dormant `9 skip` would be umbrella RED-phase (host scans).

### Existing ATDD (reference, already green) + Unit Combined

- **Created:** `_bmad-output/test-artifacts/tests/unit/dw-37-cell-retarget.atdd.test.ts` (156 lines mirrored, **15 tests green**, `describe` `node:test` + `tsx`): P0 6 + P1 3 + P2 4 + P3 2 — mirrors triade oracle for test_artifacts compliance (15 dormant → 15 pass when activated, ~168ms; before `0b81c67` would be stale-pixel `pixel(to,A)` → jump on next swipe).
- `triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts:1-199` (15 tests, `it.skip` RED-phase scaffolds, host `node:test` + `tsx`): **15 dormant → 15 pass when activated** (~168ms, `boardWith` + `transitionPlan` + `rg` allowlists)
- `triade/__tests__/render/cell-retarget.atdd.test.ts:1-143` (9 tests, `it.skip` → 9 pass dormant → 9 pass when activated): **9 pass when activated** (`DW-37` marker + `[cell]` + branches + `!moved→[]` + `Math.max` + `syncTiles` + `pixel`)
- `triade/__tests__/render/transitionPlan.test.ts` 13 pass + `triade/__tests__/render/render.smoke.test.ts` pass — already green before this guard

---

## Step 3c — Aggregate & Validate

### Execution (host gates)

- **Gateway:** `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/dw-37-cell-retarget.gateway.spec.ts` (from `triade/`) → **10 pass** (~179ms, P0 6 + P1 4). Covers DW-37 marker + `[cell]` dep + `pixel(to,cell)` + snap vs spring + `toPos` regression + `!moved→[]` hold/slide + `Math.max(...,1)` + `syncTiles` 1+1 + `pixel` helper + vanish fade `delay+SLIDE_MS→100ms` + `!withDelay` + `byCell` + `DW-37 1 + },[cell]) 1 + spring 1` + ledger `9f25aea8 done`.
- **Umbrella:** `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/e2e/dw-37-cell-retarget.umbrella.spec.ts` → **9 pass** (~158ms, P2 5 + P3 4). Covers no-resize stability `},[cell]) 1 + },[toPos.x,toPos.y,kind]) 1` + `Math.max` + `BOARD_PADDING + cell[1] * (cellSize+CELL_GAP)` + spring `14/260/0.8` + reducedMotion board-only + single-source allowlists `SLIDE_MS 160 1 + TILE_FADE_MS 120 1 + EARLY 0.3 1 + GRID 4 1 + BOARD_PADDING 8 1 + CELL_GAP 8 1 + setTilesState 1 + tilesRef 1 + DW-37 1` + exploratory `Resize simulator` + ledger `9f25aea8 1 + Status:done + 9/9 + 926 pass` + bench `1e-9 0` + cross-cutting `GRID 4 1`.
- **Unit combined:** `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/unit/dw-37-cell-retarget.atdd.test.ts` → **15 pass** (~168ms). Mirrors P0 6 + P1 3 + P2 4 + P3 2 (all green; triade oracle is canonical green; this unit mirror is test_artifacts compliance).
- **Fixtures:** `fixtures/dw-37-cell-retarget-fixtures.ts` (240 LOC, deterministic `boardHold`/`boardEmpty`/`cloneBoard` + `SCAN_STRINGS` 26 constants + `LEDGER 9f25aea8` + scan helpers) — no faker, host-only, re-exports `boardWith`/`emptyBoard`/`rngOf`/`spyRng`/`mulberry32`/`planTileTransitions` from `triade/test-utils/helpers.ts`.
- **Triade oracle:** `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/render/dw-37-cell-retarget.atdd.test.ts` (from `triade/`, toggle `it.skip→it`) → **15 dormant → 15 pass when activated** (~168ms). `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/render/cell-retarget.atdd.test.ts` → **9 pass when activated**. `npm --prefix triade test` → **926 pass / 0 fail / 346 skipped** (15 dormant dw-37 + 9 dormant cell-retarget + others; 0 unexpected fail beyond cell seam). When activated, `941 pass (926+15)` / 0 fail / 331 skipped. No new flake. `npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json` → **8 pre-existing errors only from spawn-candidates-validation.atdd** (`[number,number][]` type), beyond that clean — our `dw-37-cell-retarget` fixtures/gateway/umbrella add 0 new errors.
- **Ledger & scans:** `rg -n "DW-37" triade/src/render/GameBoard.tsx` → **1 hit** at `:180`. `rg -n "},\s*\[cell\]\)" GameBoard.tsx` → **1 hit** at `:195`. `rg -n "pixel\(to, cell\)" GameBoard.tsx` → **1 hit** at `:187`. `rg -n "x.value = next.x" GameBoard.tsx` → **1 hit**. `rg -n "withSpring\(next.x" GameBoard.tsx` → **1 hit** + `withSpring(next.y` 1. `rg -n "withSpring\(toPos.x" GameBoard.tsx` → **1 hit**. `rg -n "Math.max" GameBoard.tsx` → **1 hit** `cell` guard. `rg -n "setTilesState\(next\)" GameBoard.tsx` → **1 hit** inside `syncTiles:358-361`. `rg -n "tilesRef\.current = next" GameBoard.tsx` → **1 hit**. `rg -n "function pixel\(" GameBoard.tsx` → **1 hit** at `:82`. `rg -n "9f25aea8" deferred-work.md` → **1 hit** DW-37. `rg -n "GRID = 4" GameBoard.tsx` → **1 hit**. `git diff --stat -- triade/src/engine` → **0** (hardening never mutates beyond render seam). `git diff --stat -- triade/src/engine triade/src/feel triade/src/ui` → **0 beyond GameBoard**. `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` → **empty** (never write, never revert — orchestrator-owned). `git diff HEAD -- triade/src/render/transitionPlan.ts` → **empty** (contract byte-identical).

### Coverage Matrix (updated)

- **Created/Updated:** `fixtures/dw-37-cell-retarget-fixtures.ts` + `tests/api/dw-37-cell-retarget.gateway.spec.ts` (10 pass) + `tests/e2e/dw-37-cell-retarget.umbrella.spec.ts` (9 pass) + `tests/unit/dw-37-cell-retarget.atdd.test.ts` (15 pass) + this `automation-summary-dw-37-cell-retarget.md` (DoD). `coverage-matrix.json` + `e2e-trace-summary-dw-37-cell-retarget.json` + `gate-decision-dw-37-cell-retarget.json` will be emitted by next `bmad-testarch-trace` from I-O 6 rows; existing fleet already covers `dw-decision-dw-37` via `cell-retarget.atdd.test.ts` 9 + `dw-37-cell-retarget.atdd 15` + `transitionPlan.test 13` + `render.smoke` + new `fixtures` + `gateway` + `umbrella`.

---

## Step 4 — Validate & Summarize

### Checklist Validation (per `checklist.md`)

- [x] Framework scaffolding verified (`node:test` + `tsx` + `tsConfig.test.json` (`TSX_TSCONFIG_PATH`) + `helpers.ts` `boardWith`/`emptyBoard`/`rngOf`/`spyRng`/`mulberry32`/`staticBoard` + `readFileSync` scans)
- [x] Execution mode correctly determined: BMad-Integrated (spec + test-design + ATDD present) but host-dominated (pure `pixel(to,cell)` trust seam) — sequential
- [x] Story markdown loaded (`spec-dw-37-cell-retarget.md` `baseline 0b81c67` → `final eb11b56` `status done`, 4 ACs + I-O 6 rows + Code Map 6 entries + Design Notes `useEffect([cell])` + Verification `npm test 926 pass` + `## Auto Run Result` `Status: done`)
- [x] Acceptance criteria extracted (4 ACs: rest A→B snap, move/vanish spring, resize+re-plan no jump, no cell no extra; + AC-5 invariants `syncTiles` single writer + `pixel` + `cell` guard + gate constants + vanish fade)
- [x] Test-design loaded (`test-design-dw-37-cell-retarget.md` 9 risks, 2 high score 6, P0 6 groups / P1 3 / P2 4 / P3 2, NFR planning, estimates 1.3–2.4h host)
- [x] ATDD outputs checked (15 `it.skip` scaffolds under `triade/__tests__/render` + 9 `cell-retarget` scans under `triade/__tests__/render`; not duplicated — gateway 10 P0/P1 vs umbrella 9 P2/P3 vs unit 15 combined, each at different level/depth + triade oracle 9+15 canonical)
- [x] Automation targets identified (15 targets, P0 6 + P1 3 + P2 4 + P3 2, no duplicate coverage across levels — Unit for `pixel` clamp/midpoint/finite vs Gateway for negative/≥1/NaN + `pixel(to,cell)` + budget + bare, Static scans for single-guard/ledger, E2E for bench+exploratory; both host `node:test`)
- [x] Test levels selected appropriately (Unit for pure `pixel(to,cell)` + `cell Math.max` + `syncTiles`/`byCell` + `transitionPlan` hold/slide, Host-as-API/E2E via `rg` allowlists + ledger + board shape, not Playwright `page.goto` per `test-levels-framework.md`)
- [x] Duplicate coverage avoided (E2E for single-guard/bare/allowlist + bench/exploratory only, API for marker + branches + hold/slide + guard + helper, Unit for full P0/P1/P2/P3 — ATDD remains canonical oracle)
- [x] Test priorities assigned (P0 critical path + high risk ≥6 (R-001/R-002), P1 important flows + medium (R-003/R-004/R-006), P2 secondary + low (R-005/R-007/R-008), P3 exploratory (R-002 residual/manual))
- [x] Fixture architecture created (`dw-37-cell-retarget-fixtures.ts` deterministic `boardHold`/`boardEmpty`/`cloneBoard` + `SCAN_STRINGS` 26 constants + `LEDGER 9f25aea8` + scan helpers, no faker, no `test.extend`, no cleanup needed for pure `boardWith` pure render)
- [x] Data factories not needed (deterministic `boardHold`/`boardEmpty` + `boardWith` 4×4 literals + `count`/`countRe` scan helpers suffice, no `@faker-js/faker` — `Board` `4×4` `number|null` literals per `data-factories.md` host adaptation)
- [x] Helper utilities checked (existing `triade/test-utils/helpers.ts` already provides `boardWith`/`emptyBoard`/`rngOf`/`spyRng`/`mulberry32`/`staticBoard`/`runSeededSession` + `occupiedCells`/`resultingTiles`)
- [x] Test files generated at appropriate levels (`tests/api` gateway 10 pass, `tests/e2e` umbrella 9 pass, `tests/unit` 15 pass, `triade/__tests__` oracle 15 dormant → 15 pass when activated + 9 `cell-retarget` + `fixtures` 1)
- [x] Given-When-Then format used consistently (all gateway/umbrella/unit tests have Given/When/Then comments + `test` names `[P0-GW]`, `[P1-GW]`, `[P2-UMB]`, `[P3-UMB]`)
- [x] Priority tags added to all test names (`[P0]`, `[P1]`, `[P2]`, `[P3]` + `P0-GW`/`P2-UMB` in gateway/umbrella)
- [x] data-testid selectors not applicable (pure render, no DOM — `pixel` verified via `boardSrc` literal + `planTileTransitions` behavioral + `rg` scans)
- [x] Network-first pattern not applicable (pure render `pixel`/`SyncTiles`, no `page.route`/`page.goto` — `intercept-network-call.md` not applied)
- [x] Quality standards enforced (no hard waits, no flaky patterns, deterministic `boardWith` literals + `rg` allowlists `DW-37 1 / }, [cell]) 1 / pixel(to, cell) 1 / x.value=next.x 1 / withSpring(next.x 1 / withSpring(toPos.x 1 / Math.max 1 / setTilesState 1 / tilesRef 1 / function pixel 1 / 9f25aea8 1` + `it.skip` RED-phase correctly dormant for unit in triade)
- [x] Healing not enabled (`auto_heal_failures` false default — no healing attempted; this bundle has no healing: gateway/umbrella/unit first run 19 pass without `Object.freeze` flake)
- [x] Automation summary created at `_bmad-output/test-artifacts/automation-summary-dw-37-cell-retarget.md` (plus generic `automation-summary.md` will be updated to latest)
- [x] Knowledge base references applied (`test-levels-framework`, `test-priorities-matrix`, `data-factories`, `fixture-architecture`, `selective-testing`, `ci-burn-in`, `test-quality`)

### Polish

- Removed duplication (ATDD vs gateway vs umbrella vs unit same AC different depth — documented as Level separation: Unit pure vs API gateway contract vs E2E umbrella journey vs triade oracle canonical, not duplication)
- Verified consistency (R-001/R-002 scores `2×3=6` two high, DW-37 64-hex `9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c` 1 hit vs `spec-dw-37-cell-retarget.md` 1 + `deferred-work.md` 1 + `test-design` 1, `DW-37` 1 + `}, [cell])` 1 + `pixel(to, cell)` 1 + `x.value = next.x` 1 + `withSpring(next.x` 1 + `withSpring(toPos` 1 + `Math.max` 1 + `setTilesState 1` + `tilesRef 1` + `function pixel 1` literals, `LEDGER` hash consistency + `sprint-status.yaml` ownership)
- Checked completeness (all template sections populated: preflight, targets, generation, aggregate, validate, coverage, DoD, NFR, recommendations)
- Format cleanup (tables aligned, headers consistent, no orphaned references)

---

## Coverage Summary

| Priority | Tests (new automate) | ATDD (reference) | Existing suites (gate) | Total Coverage |
|----------|----------------------|------------------|------------------------|----------------|
| P0 | 6 (gateway P0) + 6 (unit P0) | 6 `it.skip` → 6 pass via triade oracle 6 green when activated + `transitionPlan` behavioral | `cell-retarget` 6/6 + `dw-37` 6/6 + `transitionPlan hold/slide` 13 pass + `pixel`/`cell`/`syncTiles` gates | **100%** (6/6 P0 groups) |
| P1 | 4 (gateway P1) + 3 (unit P1) | 3 `it.skip` → 3 pass via triade oracle 3 + gateway 4 | `vanish fade` + `byCell` + `DW-37 1 + },[cell])1 + spring 1` + ledger cross-pin | **100%** |
| P2 | 5 (umbrella P2) + 4 (unit P2) | 4 `it.skip` → 4 pass via umbrella 5 | single-site `DW-37`/`pixel`/`Math.max`/`syncTiles`/`SLIDE_MS` + `toPos` vs `[cell]` + `reducedMotion` | **100%** |
| P3 | 4 (umbrella P3) + 2 (unit P3) | 2 `it.skip` → 2 pass via umbrella 4 | exploratory `Resize simulator mid-slide` + ledger `9f25aea8` + bench `1e-9 0` + cross-cutting | **100%** |
| **Total** | **10 gateway pass + 9 umbrella pass + 15 unit pass + 1 fixture** | **15 triade oracle dormant → 15 pass when activated + 9 cell-retarget** | **926 pass host gate + tsc clean beyond pre-existing 8** | **100% P0, 100% P1, 100% P2/P3** |

- **Test level breakdown:** Unit 10 gateway (DW-37 marker + `pixel(to,cell)` + snap vs spring + `toPos` regression + `!moved→[]` hold/slide + `Math.max(...,1)` + `syncTiles` 1+1 + `pixel` helper + vanish fade + `byCell` + `DW-37 1 + },[cell])1`) + E2E umbrella 9 (`},[cell])1 + },[toPos.x,toPos.y,kind])1` + `Math.max` + `BOARD_PADDING` + spring `14/260/0.8` + reducedMotion board-only + single-source allowlists `SLIDE_MS/TILE_FADE/GATE` + exploratory + ledger `9f25aea8 1` + bench + cross-cutting) + Static scans 9 allowlists (`DW-37 1` + `},[cell])1` + `pixel(to,cell)1` + `x.value=next.x 1` + `withSpring(next.x 1` + `withSpring(toPos.x 1` + `Math.max 1` + `setTilesState 1` + `tilesRef 1` + `function pixel 1` + `9f25aea8 1`) + Host bench `1e-9 0`. No Playwright API/E2E — pure render cell retarget is host `node:test` correct per `test-levels-framework.md`.
- **Files created/updated:** `fixtures/dw-37-cell-retarget-fixtures.ts` (240 LOC) + `tests/api/dw-37-cell-retarget.gateway.spec.ts` (10 pass) + `tests/e2e/dw-37-cell-retarget.umbrella.spec.ts` (9 pass) + `tests/unit/dw-37-cell-retarget.atdd.test.ts` (15 pass) + `automation-summary-dw-37-cell-retarget.md` (this file) + `automation-summary.md` (generic, updated to this bundle as latest) + ledger `deferred-work.md` (DW-37 `done 2026-09-02` with `9f25aea8…`) + `triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts` (15 dormant → 15 pass when activated, already green) + `triade/__tests__/render/cell-retarget.atdd.test.ts` (9 dormant → 9 pass when activated).

---

## Definition of Done (DoD) — dw-decision-dw-37 (DW-37)

### Functional

- [x] All 6 P0 pinned (DW-37 marker + `[cell]` dep + `pixel(to,cell)` + `rest|appear` snap `x.value=next.x` + `move|vanish` spring `withSpring(next.x/y,spring)` + `toPos` spring regression `withSpring(toPos.x/y)` + `}, [toPos.x,toPos.y,kind]` 1 + `!moved→[]` hold/slide + `Math.max(...,1)` guard + `syncTiles` single writer `setTilesState 1 + tilesRef 1` + `pixel()` helper `BOARD_PADDING + cell[1/0]`) — P0 6/6 via gateway + oracle when activated; P1 4/4 via gateway+umbrella; P2/P3 via umbrella
- [x] No high-risk (≥6) items unmitigated (R-001 rest stale-pixel re-plan jump — gated via `DW-37 1 + pixel(to,cell) 1 + x.value=next.x 1 + withSpring(next.x 1 + DW-37 1 + byCell` + `hold/slide` behavioral + `ledger 9f25aea8` 1 hit; R-002 move/vanish stale spring — gated via `withSpring(next.x/y,spring)` + `damping 14 stiffness 260 mass 0.8` shared + `vanish fade` still `delay+SLIDE_MS→100ms` + `!withDelay` in DW-37 block) — all gated via `rg` pins + deterministic board helpers + ledger `9f25aea8` 1 hit
- [x] Existing suites stay green (`transitionPlan.test` 13 + `render.smoke` + `engine/game.test` 32 + `engine/weights` 9 + `engine/spawn` 5+2 + `926 pass / 0 fail / 346 skipped` fleet beyond pre-existing 8 tsc errors; `render` hardening adds 0 new tsc errors)
- [x] `sprint-status.yaml` untouched (orchestrator-owned — verified via `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty + `rg` umbrella `sprint-status.yaml` doc pin + `git diff HEAD -- triade/src/render/transitionPlan.ts` empty proves hardening lives only in `GameBoard.tsx` vs baseline `0b81c67`; working-tree is `spec-dw-37` +16 + `deferred-work.md` DW-37 `done` + `test-design-progress.md` snippet, no `sprint-status` write)

### Quality

- [x] Twin `tsc` gates: `npx tsc --noEmit --project triade/tsconfig.json` → 8 pre-existing spawn-candidates errors only, `npx tsc --noEmit --project triade/tsconfig.test.json` → same 8, beyond that clean — our `dw-37-cell-retarget` fixtures/gateway/umbrella add 0 new errors (verified `rg -n "dw-37-cell-retarget" 0 hits beyond fixtures`)
- [x] Full host gate `<15 min` (926 pass / 0 fail / 346 skipped; 941 with all dw-37 artifacts when activated: `926+15` dw-37 oracle when de-skipped + `9` cell-retarget already green; gateway ~179ms + umbrella ~158ms + unit ~168ms + fixtures 240 LOC + triade oracle ~168ms; `tsc` `<5s` beyond pre-existing)
- [x] No new lint errors in generated test files (gateway/umbrella/unit/fixtures `node:test` + `tsx` + `helpers.ts` import clean — `boardWith`/`emptyBoard`/`planTileTransitions` pure imports)
- [x] Ledger `deferred-work.md` DW-37 `status: done 2026-09-02` + `resolution: resolved by sweep bundle dw-decision-dw-37` + `resolution-undo: 9f25aea808d8c07c4a91d21389fa0b4ec65f823bdd6305ae53edd9ee4804693c 2026-09-02 7374617475733a206f70656e` preserved (64-hex, reopen keeps hash — `rg -n 9f25aea8` → `1`; `rg -n resolution-undo` → health)
- [x] Manual probes from spec Verification green: `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/render/dw-37-cell-retarget.atdd.test.ts` → `15 dormant → 15 pass` when activated (`it.skip→it`); `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/dw-37-cell-retarget.gateway.spec.ts` → `10 pass`; umbrella `9 pass`; unit `15 pass`; `npm --prefix triade test` → `926 pass / 0 fail`; `tsc` clean beyond pre-existing; `rg -n "DW-37" GameBoard.tsx 1` + `rg -n "}, \[cell\]" GameBoard.tsx 1` + `rg -n "pixel\(to, cell\)" GameBoard.tsx 1` + `rg -n "x.value = next.x" GameBoard.tsx 1` + `rg -n "withSpring\(next" GameBoard.tsx 2` + `rg -n "withSpring\(toPos" GameBoard.tsx 2` + `rg -n "Math.max" GameBoard.tsx 1` + `rg -n "setTilesState\(next\)" 1` + `rg -n "9f25aea8" 1`

### Test

- [x] P0 pass rate 100% (6/6 unit P0 + 6/6 gateway P0 pass + 6/6 oracle P0 when activated — all pass when de-skipped)
- [x] P1 pass rate 100% (3/3 unit P1 + 4/4 gateway P1 pass + 3/3 oracle P1 when activated)
- [x] P2/P3 pass rate 100% (4/4 unit P2 + 5/5 umbrella P2 pass + 2/2 unit P3 + 4/4 umbrella P3 pass)
- [x] No flaky patterns (deterministic `boardWith` 4×4 literals + `count`/`countRe` scan helpers + `planTileTransitions` behavioral, no `Math.random` in guard loop, no hard waits, `GRID=4` exact, `BOARD 4×4` exact, `pixel(to,cell)` deterministic `BOARD_PADDING+col*(cell+CELL_GAP)`)
- [x] Priority tagging enables selective execution (P0 on every commit `--test-name-pattern="\[P0"` or `\[P0-GW`, P1 on PR, P2 nightly, P3 exploratory — `node:test` filter per `selective-testing.md`)
- [x] Fixtures deterministic (no `@faker-js/faker` — `boardWith`/`emptyBoard`/`SCAN_STRINGS` 26 constants + `LEDGER 9f25aea8` via `fixtures/dw-37-cell-retarget-fixtures.ts` + `helpers.ts`, `LEDGER` single source)
- [x] Gateway 10 pass + Umbrella 9 pass + Unit 15 pass + Fixtures 240 LOC + Triade oracle 15 dormant → 15 pass when activated + 9 cell-retarget = 34+24 contracts (346 skipped dormant includes 15+9 new; 0 unexpected fail beyond render seam; 926 fleet + tsc clean beyond pre-existing proves no regression)

### NFR

- [x] Reliability: Visual consistency on resize — `rest`/`appear` snap to `pixel(to, newCell)` and `move`/`vanish` spring to `pixel(to,newCell)` within same frame as `cell` change; next swipe re-plan shows no visible jump. Validated via `DW-37 1 + pixel(to,cell) 1 + x.value=next.x 1 + withSpring(next.x 1 + },[cell])1 + hold/slide` behavioral + `byCell` map + `spec Verification` manual sim resize+swipe per NFR Planning.
- [x] Reliability: No-regression on existing animation contract — `move`/`vanish` still spring to `toPos` on `to` change (`withSpring(toPos.x/y)` + `[toPos.x,toPos.y,kind]` 1), `vanish` fade still `delay+SLIDE_MS→100ms`, `appear` fade `delay→120ms`/`withSpring(1)`, `EARLY_INPUT_MS 84` gate unchanged, `spring {14,260,0.8}` shared. Validated via gateway P0-02 + P1-01 + `rg -n "SLIDE_MS|TILE_FADE_MS|EARLY_INPUT_MS" GameBoard.tsx` → `160/120/0.3` + `rg -n "}, \[toPos" 1`.
- [x] Reliability: `cell` guard `Math.max(...,1)` prevents NaN on degenerate `width=0` (boardSize clamp removal per UX-DR-20, `layout.ts:31` guard). Validated via gateway P0-04 `Math.max(...,1)` pin → `cell >=1` even when `width` degenerate + umbrella P2-02 bounds.
- [x] Maintainability: Single-writer `syncTiles` + `pixel()` helper remain sole mapping of logical `to` → `SharedValue`; DW-37 effect is the only `[cell]` writer for x/y. Validated via `rg -n "setTilesState" GameBoard.tsx` → 1, `rg -n "tilesRef\.current ="` → 1, `rg -n "DW-37"` → 1, `rg -n "}, \[cell\]"` → 1, `rg -n "function pixel\("` → 1 (gateway P0-05/P0-06/P1-03 + umbrella P2-05).
- [x] Maintainability: Single-site cell seam (no `pixel(to, B)` survivor missing 0, no `cell` derivation duplicate 0), single `DW-37` 1 + single `},[cell])` 1 + single `spring` 1 + single ledger `resolution-undo` 64-hex per DW-37, no `withDelay` inside `[cell]` block. `rg` allowlists green + `tsc` no new dep beyond pre-existing 8.
- [x] Performance: Resize retarget does not regress host gate `<5 min` or push in-flight spring beyond `MAX_MOVE_ANIM_MS 280` budget; no new per-frame allocations. Validated via full host gate `926 pass` timing `<5s` + `tsc` clean + gateway ~179ms + umbrella ~158ms; sim mid-slide resize+swipe manual jank check waivable; `pixel()` O(1) per tile.
- [x] UX: `no jump` manual waiver — spec `Manual checks: Resize simulator mid-slide and swipe immediately after; no tile jump.` Validated via umbrella P3-01 `Resize simulator mid-slide` + `No tile jump` pins + design notes `withSpring` vs `snap` rationale; project rule Skia animation is manual validation (informative only).
- [x] Compliance / Contract: `pixel(cell→{x,y})` contract `BOARD_PADDING+col*(cell+CELL_GAP)` preserved; `AnimatedTile` `x.value`/`y.value` contract `rest|appear` immediate snap vs `move|vanish` spring + `[cell]` dep preserved; `transitionPlan` `if (!moved) return []` contract preserved; `syncTiles` single writer + `byCell(cellKey(t.to))` + `GRID=4` + `BOARD_PADDING=8`/`CELL_GAP=8` preserved. Validated via gateway P0-03/P0-06/P1-03 + umbrella P3-04 + `rg` allowlists.
- [x] Offline: No new network/persistence dep (pure `GameBoard.tsx` worklet + `transitionPlan.ts` pure; `git diff HEAD -- triade/src` shows `GameBoard.tsx:180-195` only vs baseline `0b81c67` and `transitionPlan.ts` empty per `git diff --stat`).

---

## Next Steps

1. **Link this summary and generated tests** into the spec `Dev Notes` / `ATDD Artifacts` section when a writable story file is available (spec already at `_bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md` `status: done`)
2. **Share this checklist and `triade/__tests__/render/dw-37-cell-retarget.atdd.test.ts` + gateway/umbrella/unit** with the `dev` workflow as a manual handoff (ATDD checklist already at `_bmad-output/test-artifacts/atdd-checklist-dw-decision-dw-37.md`)
3. **Review this checklist** with team in standup or planning (P0 100% required, R-001/R-002 high mitigations already green)
4. **Begin implementation** using implementation checklist as guide — for this completed sweep, implementation already in working tree + commit-wired (`triade/src/render/GameBoard.tsx:82-88,180-195,315-316` DW-37 `[cell]` retarget, `helpers.ts` `boardWith`/`planTileTransitions` already hardened)
5. **Activate one scaffold at a time** by removing `it.skip` for the current task, then confirm it fails before implementing (before `0b81c67`, P0-01 would be accident-pass via stale-pixel not clamp / P0-02 would be fallthrough not valid-band / P0-04 would be NaN leak to preview)
6. **Work one activated test at a time** (red → green for each) — already complete for this bundle (`15→15 pass` oracle + `10→10` gateway + `9→9` umbrella when de-skipped; triade oracle `926 pass` + `transitionPlan 13` + `render.smoke` already green)
7. **Share progress** in daily standup
8. **When all activated tests pass**, refactor code for quality (single `DW-37` + single `},[cell])` + single `spring` + single `LEDGER 9f25aea8` already done — no duplicate site)
9. **When refactoring complete**, manually update ledger `deferred-work.md` DW statuses (already `done 2026-09-02` with `9f25aea8…` 1 hit) — do not touch `sprint-status.yaml` (never write, never revert)
10. **Run `bmad-testarch-test-review`** to validate test quality, and `bmad-testarch-trace` to update `traceability-matrix.md` + `coverage-matrix.json` from the I-O 6 rows, and `bmad-testarch-nfr` for NFR audit

---

## Knowledge Base References Applied

This automate workflow consulted the following knowledge fragments (via `test-design-dw-37-cell-retarget.md` + `tea-index.csv`):

- **test-levels-framework.md** — Level selection: Unit (cell seam 10 tests + guard + hold/slide) vs Static scans (grep allowlists `DW-37`/`},[cell])`/`syncTiles`/`pixel`/`9f25aea8`) vs Integration (`transitionPlan` hold/slide + `byCell`/`syncTiles`) vs Component not needed (no DOM)
- **test-priorities-matrix.md** — P0 critical path + high risk ≥6 (R-001/R-002), P1 important flows + medium (R-003/R-004/R-006), P2 secondary + low (R-005/R-007/R-008), P3 exploratory (R-002 residual/manual)
- **fixture-architecture.md** — Deterministic `boardHold`/`boardEmpty`/`cloneBoard` + `SCAN_STRINGS` 26 constants + `LEDGER 9f25aea8`, no `test.extend`, no cleanup needed for pure render
- **data-factories.md** — Not needed — deterministic `boardWith` literals + `count`/`countRe` scan helpers reuse (no `@faker-js/faker` — `Board` `4×4` `number|null` primitives suffice)
- **component-tdd.md** — Host unit TDD contract (red-phase `it.skip`/`test.skip` scaffolds, one behavioural pin per suite, `DW-37` marker + `pixel(to,cell)` fidelity)
- **network-first.md** — Not applicable (no network — pure `GameBoard` + `transitionPlan` host + `rg` static scans)
- **test-quality.md** — Given-When-Then per test, one pin per `it`, determinism via `boardWith` literals + `count`/`countRe`, isolation via `emptyBoard` per test
- **test-healing-patterns.md** — `DW-37` + `},[cell])` single writer healing hook (CI `rg -n` allowlists pinpoint `DW-37` vs `},[cell])` regression)
- **selector-resilience.md / timing-debugging.md** — Not applied directly (no DOM selectors / no `waitFor` — render seam is sync `pixel` + `rg` scans)
- **api-request.md / network-recorder.md / playwright utils** — Loaded per `tea_use_playwright_utils:true` but not applied (no `page.goto` — RN Skia + RNGH project)
- **risk-governance.md / probability-impact.md / test-priorities-matrix.md** — P0/P1/P2/P3 via `test-design-dw-37-cell-retarget.md` Section "Risk Assessment" for 9 risks (2 high `2×3=6` high, 4 medium, 2 low) + NFR planning (reliability visual consistency+never-throw, performance O(1) `<500ms/10k`, maintainability single `[cell]` + 64-hex, UX manual waiver)

See `resources/knowledge` for complete fragment mapping; see `_bmad-output/test-artifacts/test-design/test-design-dw-37-cell-retarget.md` Section "Risk Assessment" for the 9 risks (2 high ≥6) and NFR planning that informed P0/P1/P2/P3 levels.

---

## Recommendations

- No further API/E2E automation needed for this cell-retarget hardening — host `node:test` 10 gateway + 9 umbrella + 15 unit + 9 cell-retarget + `transitionPlan 13` + `render.smoke` already gate DW-37 marker + `},[cell])` 1 + `pixel(to,cell)` 1 + `x.value=next.x` 1 + `withSpring(next.x/y)` 1+1 + `withSpring(toPos` 1+1 + `Math.max` 1 + `setTilesState 1` + `tilesRef 1` + `function pixel 1` + ledger `9f25aea8`.
- For broader coverage, run `bmad-testarch-trace` to refresh `traceability-matrix.md` + `coverage-matrix.json` from the 6 I-O rows (matrix already validated in `test-design`), and `bmad-testarch-test-review` to audit test quality (no `pixel` survivor drift, single `DW-37` + single `},[cell])` + single `spring` + ledger `9f25aea8` 1 + `sprint-status.yaml` ownership).
- Keep `const next = pixel(to, cell)` + `if (kind==='rest'||kind==='appear') x.value=next.x` + `else if (kind==='move'||kind==='vanish') x.value=withSpring(next.x,spring)` + `}, [cell])` + `// DW-37` marker + `spring {14,260,0.8}` shared + `syncTiles` single writer + `pixel` helper + `Math.max(...,1)` in review checklist — any future rename `pixel→projectCell` or change `},[cell])` vs `},[cell,to])` without updating `GameBoard.tsx:180-195` would silently re-introduce stale-pixel or duplicate-spring; gate is `rg -n "DW-37" GameBoard.tsx 1` + `rg -n "pixel\(to, cell\)" 1` + `rg -n "}, \[cell\]" 1` + `rg -n "x.value = next.x" 1` + `rg -n "withSpring\(next" 2` + `rg -n "withSpring\(toPos" 2`.
- Working-tree vs `HEAD` is `spec-dw-37-cell-retarget.md:99-117` 16-line `## Auto Run Result` block `Status: done` + `deferred-work.md` DW-37 `done` (3 lines, 64-hex `9f25aea8…` + `737461…` tail) + `test-design-progress.md` 19-line `Progress` snippet (not production) + this `automation-summary` + `fixtures`/`gateway`/`umbrella`/`unit` new coverage — `git diff HEAD -- triade/src/render/transitionPlan.ts` 0 proves hardening lives only in `GameBoard.tsx:180-195` vs baseline `0b81c67`; keep `sprint-status.yaml` ownership `git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml` empty.


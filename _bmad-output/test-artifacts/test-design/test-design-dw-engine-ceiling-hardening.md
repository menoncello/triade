---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-09-02'
inputDocuments:
  - '_bmad-output/implementation-artifacts/spec-engine-ceiling-hardening.md'
  - '_bmad-output/implementation-artifacts/deferred-work.md'
  - 'triade/src/engine/core/ceiling.ts'
  - 'triade/src/engine/core/pot.ts'
  - 'triade/src/engine/core/types.ts'
  - 'triade/src/engine/core/index.ts'
  - 'triade/__tests__/engine/ceiling.test.ts'
  - 'triade/test-utils/helpers.ts'
  - '_bmad/tea/config.yaml'
---

# Test Design: DW bundle dw-engine-ceiling-hardening — ceiling/tier pipeline defensive guards

**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat — Master Test Architect)
**Status:** Draft
**Mode:** Epic-Level (Phase 4) — sweep-bundle deep-dive for `dw-engine-ceiling-hardening`
**Scope:** Targeted test design for the working-tree delta of `dw-engine-ceiling-hardening`

> **Delta under assessment:** Hardening of `triade/src/engine/core/ceiling.ts` for DW-41–DW-45 vs baseline `bc7d8588539e4da4a3babf50226457078c65a734` (`spec-engine-ceiling-hardening.md` `baseline_revision: bc7d858…`, `final_revision: 7ec307b05c2b50f6e28112f97aede463db1c5d2e`). Working-tree diff vs `HEAD` is metadata-only (`_bmad-output/implementation-artifacts/deferred-work.md` DW-41..45 `open→done 2026-09-02` + `resolution-undo: d403df0b…` + `_bmad-output/implementation-artifacts/spec-engine-ceiling-hardening.md` `Auto Run Result Status: done`); production delta is `triade/src/engine/core/ceiling.ts` + spec:
> - `triade/src/engine/core/ceiling.ts:1-52` — `ceilingDetector` gains `if (!Array.isArray(board)) return 0`, `if (!Array.isArray(row)) continue`, tile filter `typeof v === 'number' && Number.isFinite(v) && v > 0` (was `v !== null && v > max`); `tierForCeiling` gains `if (typeof ceiling !== 'number' || !Number.isFinite(ceiling) || ceiling < 48) return 0`, keeps `Math.floor(Math.log2(ceiling/48)+1e-9)+1` then `if (!Number.isFinite(raw) || raw < 0) return 0` + `Math.trunc(raw)`; module + function JSDoc documents unbounded-tier contract (48*2^(k-1), capping belongs to `potForTier` MAX_POT_TIER=30) and DW-42 float caveat.
> - `triade/src/engine/core/pot.ts:4-8` unchanged — `potForTier` already clamps `Number.isFinite(tier) ? min(max(0,floor(tier)),30) : 0` and proves unbounded tier safe.
> - `triade/src/engine/core/types.ts:1-5` unchanged — `Board = Cell[][]` (`Cell = number|null`), `GRID_SIZE=4` rectangular contract but defensive guards allowed.
> - `triade/__tests__/engine/ceiling.test.ts:1-92` unchanged — 7 cases (empty, largest tile, full scan, boundary map, board→tier, mid-tier, jagged) all still green; DW-45 notes missing negative/0/fractional/Infinity coverage but spec keeps formula while guarding.
> - Ledger `deferred-work.md` — DW-41 (row crash), DW-42 (float >MAX_SAFE_INTEGER), DW-43 (unbounded tier), DW-44 (NaN/negative/0 silent), DW-45 (negative/0/fractional/Infinity untested) flipped `open→done 2026-09-02` + `resolution: resolved by sweep bundle dw-engine-ceiling-hardening` + `resolution-undo: d403df0b…`.

---

## Executive Summary

**Scope:** Harden the pure engine spawn-ceiling pipeline (`ceilingDetector` + `tierForCeiling`) that feeds `potForTier` and `weights.ts` / `spawn.ts` / `game.ts` `resolveSpawn`. Before the sweep a missing/`undefined` row crashed on `row.length`, invalid tiles (`NaN`, `Infinity`, `0`, negative) could leak an `Infinity` ceiling → `Infinity` tier (or be swallowed), and `tierForCeiling(NaN|Infinity|-5|0|47.9)` returned `NaN`/`Infinity` or wrong tier via unguarded `Math.log2`. The ceiling ladder `48,96,192,384,768…` (`k>=1 => 48*2^(k-1)`) is intentionally unbounded — capping belongs to `potForTier(30)` — and is now documented. Production blast radius is low on valid 4×4 boards (rectangular, positive powers-of-two multiples of 3), but the defensive seam is load-bearing for correctness: a fuzzed/ragged board, a future `Board` helper, or a direct `tierForCeiling(malicious)` call would have propagated `NaN`/`Infinity` into spawn weights and violated `engine-never-throws`.

**Risk Summary:**

- Total risks identified: 10
- High-priority risks (≥6): 3
- Critical categories: TECH (row guard vs rectangular contract, invalid-tile filter vs Infinity leak, unbounded-tier contract vs fixed-enum consumers), DATA (ceiling→tier→pot chain integrity for spawn), BUS (tier boundary fidelity 48→1 / 96→2 …)

**Coverage Summary:**

- P0 scenarios: 8 groups (host unit, pure `ceilingDetector` guards + `tierForCeiling` guards + boundary pins + manual probe gate)
- P1 scenarios: 6 groups (engine pipeline `ceiling→tier→pot` + existing `ceiling.test.ts` + `pot`/`adaptive-spawn` + `game` wiring + `stateFromResult` determinism)
- P2/P3 scenarios: 6 groups (static single-guard / single-formula / single-cap scans, finiteness bench, ledger `resolution-undo`)
- **Total effort**: ~3.2–5.8 hours (~0.4–0.8 days; host-only, no device lane — pure engine TS, `npm test` + `tsc` gate `<15 min`)

> `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is defined in the Execution Strategy section.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|------|-----------|------------|
| **Engine merge/score rules `canMerge(1+2→3, >=3 equal)` / `mergeValue` / merge-once cascade, `shiftLine`/`movementLines`/`boardFromLines` wall-scan, `spawnTile` cell/value draw budget (20 newGame / 3 effective move), `pickIndex` NaN clamp, `previewFor` ambiguous band, `matchOrchestrator`/`undo`/`rewardedAd`/`entitlements`, `src/feel` haptics/punch/shake/bullet/sfx, `App.tsx`/`GameBoard.tsx` Skia/Reanimated, `RNGH` gesture, `layout.ts`/`Hud.tsx`** | `git diff --stat -- triade/src/engine` between baseline `bc7d858` and `7ec307b` shows only `ceiling.ts` changed; `types.ts:GRID_SIZE=4` + `rules.ts` + `game.ts` + `spawn.ts`/`pot.ts`/`weights.ts`/`line.ts`/`board.ts` byte-identical. `git diff HEAD` shows only `ceiling.ts` + `deferred-work.md` + `spec-engine-ceiling-hardening.md` — no line/spawn/feel/render/layout/monetization change. | Engine invariants stay gated by 182 `__tests__/engine/*.test.ts` pass (per spec Auto Run 882/11 expected RED baseline) + `git diff --stat -- triade/src/engine` shows single-file `ceiling.ts` delta as gate. |
| **Capping `tierForCeiling` at a hard MAX_TIER inside `ceiling.ts`** | Spec Boundaries: `Always: Keep log2 formula and epsilon 1e-9`; `Never: Change spawn weights/distribution or GRID_SIZE`; `Block If: Would need to cap tierForCeiling at a hard MAX_TIER inside ceiling.ts, change spawn distribution, change Board/Grid semantics`. Unbounded tier is intentional — capping belongs to `potForTier` (MAX_POT_TIER=30). | This plan pins unbounded contract via JSDoc `48*2^(k-1) (6=>1536…)` + `potForTier` cap scan `rg -n "MAX_POT_TIER" triade/src/engine/core/pot.ts` ==1 and manual probe `tier MAX_SAFE_INTEGER → 48` stays finite. Capping ceiling.ts would require architecture review (Block If). |
| **Changing `GRID_SIZE` from 4, altering `Board` rectangular contract to ragged-first, or rework of `spawnConfig`/`pot` ladder** | Production `Board` is always 4×4 via `emptyBoard()`/`boardWith()`/`emptyBoard` fixtures; `ceilingDetector` guards are defensive-only for harness/fuzz/ragged input, not a new live shape. | Captured as R-002 residual — guard silently pads/skips ragged rows but masks a malformed-board caller that should have been caught earlier. Document-only residual. |
| **Real float-precise `tierForCeiling` via loop vs closed-form `log2` micro-bench lane** | Sweep formula is closed-form `Math.floor(Math.log2(ceiling/48)+1e-9)+1` per spec; drift for ceilings >MAX_SAFE_INTEGER is negligible within 2048 tile bounds (spec `Float note DW-42`). | No extra bench lane; host `npm test` + manual probe `1e15→45, MAX_SAFE_INTEGER→48` finite is the gate. |
| **Short-board production path (production `Board` is always 4×4)** | Production `ceilingDetector` consumers (`game.ts:move`, `adaptive-spawn-integration`, `helpers.preSpawnBoardOf`) always pass 4×4 boards. Missing-row guard exists for sparse/undefined harness input, not for a shipped 1×1 board. | Document-only residual; short guard is the mitigation, not a new live path. |
| **RevenueCat / AdMob / IAP / Epic 9-11 a11y** | No monetization/a11y code touched. | Existing suites remain gate. |

---

## Risk Assessment

### Testability Assessment

**Controllability — Strong.** `ceilingDetector(Board)→number` and `tierForCeiling(number)→CeilingTier` are pure with no `expo-*`/`Skia`/`RNG` dependency; `potForTier` is pure with only `POT_BASE_VALUE` + `MAX_POT_TIER`. Every path is host-testable via `node --import tsx --test` with `emptyBoard()`/`boardWith()`/`Board` literal `[[3,null],[undefined],[NaN,-5,0,Infinity,96]]` and `tierForCeiling` scalar probes `[-5,0,NaN,Infinity,47.9,48,48.1,95.9,96,192,768,1e15,MAX_SAFE_INTEGER]` plus `potForTier` length check.

**Observability — Good.** Outputs are deterministic numerics/booleans with no hidden state: `ceilingDetector` `0` or max finite `>0`, `tierForCeiling` integer `0..48+` (`48→1, 96→2…`), `potForTier` `length t+1 capped 31`. Invalid-tile filtering is observable as `ceilingDetector([NaN,-5,0,Infinity,96])===96` not `Infinity`; unbounded-tier is observable as `tierForCeiling(Number.MAX_SAFE_INTEGER)===48` finite via `Number.isFinite` guard.

**Reliability — Strong (engine never throws, helpers never throw).** Guard prevents `TypeError: Cannot read properties of undefined (reading 'length')` on `board[r].length` and `NaN`/`Infinity` leak into `Math.log2`; `Array.isArray(row)` + `typeof v === 'number' && Number.isFinite(v) && v>0` is bounds-checked; `tierForCeiling` early `!Number.isFinite(ceiling) || ceiling<48 →0` plus `!Number.isFinite(raw) →0` + `Math.trunc` normalizes. Both `tsc` gates (`tsconfig.json` + `tsconfig.test.json`) clean; `npm --prefix triade test` full gate `<15 min` (882 pass / 11 expected RED baseline preserved).

**Testability Risks:** Two surfaces are thin: (a) invalid-tile filter `isFinite && >0` vs old `v !== null && v > max` — a follow-on that reintroduced `v !== null` would let `Infinity` become ceiling and `Infinity` tier leak (R-001); mitigated by Infinity pin + scan. (b) unbounded-tier docs vs fixed-enum consumers — a future `switch(tier){case 0..5}` without `default` would OOB on tier 6+ (R-003); mitigated by pot cap allowlist.

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---------|----------|-------------|-------------|--------|-------|------------|-------|----------|
| R-001 | TECH | **Invalid tile filter regression — `NaN`/`Infinity`/`-`/`0` leak to ceiling → tier Infinity/NaN → `potForTier` weight corruption.** Before fix `ceilingDetector` used `v !== null && v > max` so `Infinity > max` became ceiling `Infinity`, then `tierForCeiling(Infinity)` returned `Infinity` (old: `Math.log2(Infinity) → Infinity → Infinity+1`) which `potForTier` clamps to `0` but a direct `weights.ts` consumer of raw tier would OOB. After fix invalid tiles are skipped and `tierForCeiling(Infinity/NaN)` returns `0`. Risk: a revert that loosened filter to `v != null` or removed `Number.isFinite` would re-expose Infinity ceiling and tier Infinity leak on fuzzed boards. | 2 | 3 | **6** | Enforce filter: (a) **host P0 pins** `ceilingDetector([[3,null],[undefined],[NaN,-5,0,Infinity,96]])===96` and `[[Infinity,null], [96,null]]→96` (already manual probe in spec Verification); (b) **static scan** `rg -n "Number\.isFinite\(v\)" triade/src/engine/core/ceiling.ts` ==1 and `rg -n "v !== null" triade/src/engine/core/ceiling.ts` ==0 (no old predicate); (c) **pipeline tie** `tierForCeiling(Infinity)===0 && tierForCeiling(NaN)===0` pin prevents NaN/Infinity tier leak. | FE lead | Immediate (gate this sweep; protects DW-44) |
| R-002 | TECH | **Missing/non-array row guard masks ragged boards and changes `ceilingDetector` totals — `board[r]?.` silent pad vs throw.** Before fix `board[r][c]` on `[[3,null], undefined, [768]]` threw `TypeError: Cannot read properties of undefined (reading 'length')` / `0`. After fix `if (!Array.isArray(board)) return 0` and `if (!Array.isArray(row)) continue` skips undefined/non-array rows and `board[r]?.[c]` path pads. Risk: a caller that accidentally built a ragged `Board` (`[[3,null], undefined]` from a `boardWith` off-by-one) now silently returns `3` not throw, masking caller defect and letting `tier→pot` resolve from a truncated board (fewer tiles scanned, ceiling underestimated, pot too narrow). Production boards are always 4×4 via `emptyBoard()`, but a test that built `[[1]]` ragged would now be green-hiding. | 2 | 3 | **6** | Make guard observable, not hidden: (a) **host P0** `ceilingDetector([[3,null], undefined as any, [768,null]] as Board)===768` + `ceilingDetector([[3,null], undefined as any] as Board)===3` + `ceilingDetector([])===0` + `ceilingDetector(null as any)===0`; (b) **grep guard** `rg -n "Array\.isArray\(row\)" triade/src/engine/core/ceiling.ts` ==1 and `rg -n "Array\.isArray\(board\)" triade/src/engine/core/ceiling.ts` ==1 and `rg -n "board\[r\]\.\[c\]" triade/src/engine/core/ceiling.ts` ==0 (no bare `board[r][c]`); (c) **pipeline pin** `ceilingDetector` jagged `[[3,null],[null,6,12],[null,null,null,768,1536]]→1536` already `ceiling.test.ts:85-92` stays green — ragged scan must equal full scan. | FE lead | Immediate (gate DW-41 crash; protects trace/spawn) |
| R-003 | TECH | **Unbounded tier contract drift — `tierForCeiling` grows ilimitado (`48*2^(k-1)`) and a fixed-enum consumer assumes `0..5`.** Before fix already unbounded, but undocumented; after fix JSDoc says unbounded and `potForTier` caps at 30. Risk: a future consumer that enumerates tiers `0..5` (e.g. `switch(tier){case 0: … case 5: …}` without default) would OOB on `tier 6 (1536)` or tier `45 (1e15)` / `48 (MAX_SAFE_INTEGER)` which are finite but large; spawn `potWeights`/`potForTier` handles it (capped), but a new UI `tierBadge` or analytics `TIER_NAMES[tier]` would index OOB. | 2 | 3 | **6** | Pin unbounded invariant: (a) **host P0** `tierForCeiling(1e15)` finite `45` + `Number.MAX_SAFE_INTEGER` finite `48` + `potForTier(45).length===31` capped + `potForTier(48).length===31` (manual probe already in spec Verification); (b) **doc scan** `rg -n "Unbounded" triade/src/engine/core/ceiling.ts` ==1 and `rg -n "MAX_POT_TIER" triade/src/engine/core/pot.ts` ==1 and `rg -n "Math\.floor\(Math\.log2\(ceiling / 48\)" triade/src/engine/core/ceiling.ts` ==1 (formula preserved); (c) **static scan** `rg -n "tierForCeiling" triade/src --include="*.ts" | wc -l` shows only `ceiling.ts` definition + `index.ts` re-export + `game.ts`/`helpers.ts`/`adaptive-spawn-integration` consumers (no new fixed-enum switch). | FE lead | Immediate (gate DW-43; protects pot/weights) |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---------|----------|-------------|-------------|--------|-------|------------|-------|
| R-004 | TECH | **Float/epsilon drift for ceilings >MAX_SAFE_INTEGER — closed-form `Math.floor(Math.log2(ceiling/48)+1e-9)+1` vs loop ladder.** Log2 ladder via floating `log2` can be off-by-1 where `ceiling/48` is not exact power-of-two near 2^53 boundary; epsilon `1e-9` biases toward the lower tier at exact boundaries but drifts one tier high/low beyond `2^53`. Within 2048 tile bounds (max tile `3*2^11=6144`, ceiling < ~1e4) drift negligible, but stress `1e15` / `MAX_SAFE_INTEGER` probe would tier-misplace by 1 and pick wrong `potWeights` bucket. | 1 | 3 | 3 | Keep closed-form per spec but pin boundaries: host `tierForCeiling` exact boundaries `47→0,48→1,95→1,96→2,191→2,192→3,383→3,384→4,767→4,768→5,1536→6,3072→7,6144→8` already `ceiling.test.ts:33-48` + mid-tier `50→1,100→2,200→3,400→4,800→5,1600→6,3071→6,3073→7` + stress `1e15→45` + `MAX_SAFE_INTEGER→48` finite via manual probe; `rg -n "1e-9" triade/src/engine/core/ceiling.ts` ==1 (epsilon preserved). |
| R-005 | TECH | **Fractional ceiling floor vs ceil-vs-trunc — `47.9→0, 48.1→1, 95.9→1, 96→2` must stay `Math.floor(log2)+1`.** `tierForCeiling` handles fractional via `log2` floor; a follow-on that introduced `Math.trunc(ceiling/48)` or `Math.ceil(log2)` would map `48.1→0` or `47.9→1` and break the ladder doubling contract `48*2^(k-1)`. | 2 | 2 | 4 | Pin fractional ladder: host `tierForCeiling(47.9)===0 && 48.1===1 && 95.9===1 && 96===2` already manual probe; `rg -n "Math\.floor\(Math\.log2" triade/src/engine/core/ceiling.ts` ==1 (floor preserved) + `Math.trunc(raw)` only after `floor`, not on input. |
| R-006 | DATA | **Ceiling→tier→pot chain drift — `ceilingDetector` max feeds `tierForCeiling` feeds `potForTier` feeds `weights.ts`/`spawn.ts` `resolveSpawn` / `game.ts` `move`.** Invalid max `Infinity` or tier `Infinity`/`NaN` would propagate through `potForTier` length and `weightedPicker` normalization; guarded chain `finite max>0 → finite tier 0..48 → pot length 1..31` keeps `spawnTile` draw budget `1` and `game.move` `3`/`20` intact. A revert that removed `Number.isFinite` in either helper would re-leak `Infinity` into weights and make `pickIndex` clamp produce biased `value`. | 1 | 3 | 3 | Pin chain end-to-end: (a) host `ceilingDetector([[NaN,-5,0,Infinity,96]] as any)===96` → `tierForCeiling(96)===2` → `potForTier(2).length===3` → `weights.test.ts` pot composition still green; (b) `adaptive-spawn-integration` `tier>=1 v<=ceiling` companion + AC4 `3-draw`/`20-draw` `spyRng` exact stay green. |
| R-007 | BUS | **Boundary tier off-by-one vs legacy expectations — `48→1` switch is the pot onset; `47→0` stays minimal spawn.** A follow-on that changed guard to `ceiling<=48→0` would delay pot onset one tile and shift `potWeights` 40/40 distribution one ceiling step (spawn `value` would stay `1` pool one tier too long, `3` delayed). | 1 | 3 | 3 | Keep `ceiling<48→0` pin: host `tierForCeiling(47)===0 && 48===1 && 48.1===1 && 47.9===0` + boundary 8-tier spec `spec-engine-ceiling-hardening.md` Code Map `Always: Keep … tier boundaries <48→0, ≥48→1 … doubling thereafter remain pinned`. |
| R-008 | OPS | **Deferred-ledger `resolution-undo` hash coupling + `sprint-status.yaml` ownership.** Sweep marks DW-41..45 `done` with `resolution-undo: d403df0b… 2026-09-02 7374617475733a206f70656e`; `sprint-status.yaml` is orchestrator-owned and must not be written or reverted by this workflow. | 1 | 2 | 2 | Ledger already records `resolution-undo: d403df0b…` per entry; any reopen must keep the hash. `git diff --stat` gate shows `deferred-work.md` + `spec-engine-ceiling-hardening.md` but NOT `sprint-status.yaml`. This plan never writes the latter. |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---------|----------|-------------|-------------|--------|-------|--------|
| R-009 | PERF | **Guard cost — `Array.isArray(row)` per row (4) + `typeof v === 'number' && Number.isFinite(v) && v>0` per cell (16) + `tierForCeiling` `isFinite`+`log2` per call.** On 4×4 board 4 rows ×4 cells =16 null checks + log2 per `move()` — negligible vs frame budget `<8ms`. Tier stress `MAX_SAFE_INTEGER` still O(1) `<0.01 ms`. | 1 | 1 | 1 | Monitor — `npm test` full gate `<15 min` is sufficient; no bench lane. Existing `feel.bench` + `engine.smoke` already gate frame budget. |
| R-010 | TECH | **Spec `final_revision` + `deferred-work.md` `baseline_revision` hash staleness — `spec-engine-ceiling-hardening.md` `final_revision: 7ec307b…` is a commit hash literal; a follow-on commit would make it stale.** Bundle spec is intentionally `status: done` with `followup_review_recommended: false`; stale hash is doc-only. | 1 | 1 | 1 | Monitor — doc pin only; `deferred-work.md` DW-41..45 `resolution-undo` 64-hex hash is the revert trail, not `final_revision`. |

### Risk Category Legend

- **TECH**: Technical/Architecture (row guard, invalid-tile filter, unbounded-tier contract, float/epsilon, fractional ladder)
- **SEC**: Security — none this sweep (pure engine math, no auth/data exposure; `Array.isArray` + `isFinite` are data math, not security boundary)
- **PERF**: Performance — `isFinite` per cell O(n) n=4 + log2 O(1) (R-009); no async/worklet lane
- **DATA**: Data Integrity — ceiling→tier→pot→spawn chain (R-006) and board occupancy via `ceilingDetector`
- **BUS**: Business Impact — tier boundary fidelity (R-005, R-007) and spawn distribution via pot
- **OPS**: Operations (deferred ledger `resolution-undo`, `sprint-status.yaml` ownership, `tsc` gates)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

Sweep `dw-engine-ceiling-hardening` touches the **engine ceiling/tier seam only**: **reliability/never-throw + finiteness** (every `ceilingDetector`/`tierForCeiling` finite and non-throwing on any `Board`/`number` including ragged/empty/NaN/Infinity), **maintainability (single `Number.isFinite` tile filter + single row/board guard + single `Math.log2` formula + single `MAX_POT_TIER=30` cap + single 64-hex `resolution-undo`)**, **correctness** (tier ladder `48*2^(k-1)` vs pot cap 30, no Infinity/NaN leak), **60 FPS/frame budget unchanged** (O(1) guards, no worklet), and **offline/installability** unchanged (no new deps).

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|--------------|-------------------------|-----------|--------------------|-----------------|
| Reliability — never-throw + finiteness | `ceilingDetector` never throws on any `Board` including `[]`, `[[3,null],undefined as Board]`, `[[NaN,-5,0,Infinity,96]]`, `null as Board`, `[[1]]` ragged; `tierForCeiling` never throws on `NaN/Infinity/-5/0/47.9/MAX_SAFE_INTEGER` and never returns `NaN`/`Infinity`; every returned `tier` finite `0..48+` and `ceiling` finite `0..768+`; `moved`/`pot length` downstream finite. | R-001, R-002, R-006 | Host unit negative-path sweep: `ceilingDetector([[3,null],[undefined],[NaN,-5,0,Infinity,96]] as any)===96` + `tierForCeiling(-5)===0 && 0===0 && NaN===0 && Infinity===0 && 47.9===0 && 48.1===1 && 1e15 finite && MAX_SAFE_INTEGER finite` — from spec Verification manual probe; ragged `[[3,null],undefined]` + jagged `[[3,null],[null,6,12],[null,null,null,768,1536]]→1536` already `ceiling.test.ts:85-92`. | `triade/__tests__/engine/ceiling.test.ts` 7 pins + manual probe `96` + `tier finite array` + `npm --prefix triade test -- __tests__/engine/ceiling.test.ts` green + both `tsc` clean |
| Maintainability | Single `Array.isArray(board)` + single `Array.isArray(row)` in `ceiling.ts`; single tile predicate `typeof v === 'number' && Number.isFinite(v) && v>0` (no `v !== null`); single `Math.floor(Math.log2(ceiling/48)+1e-9)+1` formula with single `1e-9` epsilon; single `MAX_POT_TIER=30` in `pot.ts`; `resolution-undo` 64-hex per resolved DW; no duplicate `tierForCeiling` site. | R-001, R-002, R-003, R-008 | Static scans: `rg -n "Array\.isArray\(board\)" triade/src/engine/core/ceiling.ts` ==1, `rg -n "Array\.isArray\(row\)" triade/src/engine/core/ceiling.ts` ==1, `rg -n "Number\.isFinite\(v\)" triade/src/engine/core/ceiling.ts` ==1, `rg -n "Math\.floor\(Math\.log2" triade/src/engine/core/ceiling.ts` ==1, `rg -n "1e-9" triade/src/engine/core/ceiling.ts` ==1, `rg -n "MAX_POT_TIER" triade/src/engine/core/pot.ts` ==1, ledger `rg -n "resolution-undo" _bmad-output/implementation-artifacts/deferred-work.md` shows 5 new 64-hex entries DW-41..45. | Source scans + `ceiling.ts:23-51` diff + `pot.ts:4` + ledger diff |
| Correctness — tier ladder + pot cap | Tier ladder `k>=0: <48→0, >=48→1, >=96→2, >=192→3, >=384→4, >=768→5, >=1536→6 … 48*2^(k-1)` vs pot cap `MAX_POT_TIER=30` → `potForTier` caps length `t+1` at 31; `ceilingDetector` max is always valid `finite>0` not `Infinity`; `tierForCeiling` fractional `47.9→0,48.1→1` via `floor(log2)` preserved. | R-003, R-004, R-005, R-007 | Host boundary suite + chain: `ceiling.test.ts:33-48` 13 boundary pins + `50→1,100→2,200→3,400→4,800→5,1600→6,3071→6,3073→7` + `tier 45 (1e15)` + `tier 48 (MAX_SAFE_INTEGER)` + `potForTier(45/48).length===31` capped. | `ceiling.test.ts` 7 pass + `pot.test.ts` FR7 ladder 8 tiers + `adaptive-spawn-integration` tier composition `100k N` |
| Performance — 60 FPS / frame budget | NFR-1/11/14 unchanged: engine `<2 ms/turn` (ceiling scan 16 cells O(1) + log2 O(1)), frame worst `<8 ms`, device `p99 <16.7 ms`. Guard adds ≤16 `isFinite` checks per `move()` — `<0.01 ms`. No `Math.random` in `ceiling.ts`, no worklet, no `setTimeout`. | R-009 | Host gate only: `npm --prefix triade test` (full) median per `ceiling.test.ts` `<0.01 ms` (observed `<1 s` for 7-case suite); `feel.bench.test.ts` both-profile budget unchanged. | CI `npm test` timing + both `tsc` clean; no bench lane |
| Compliance — ceiling→tier→pot→spawn chain | `ceilingDetector→tierForCeiling→potForTier→weights.ts/potWeights→spawn.ts/resolveSpawn→game.ts:move` chain must stay finite and capped; any `NaN`/`Infinity` leak would corrupt `weights` normalization and `spawnTile` `pickIndex` clamp → biased `value`. | R-001, R-006 | Host + pipeline: `game.test.ts` 32 pass + `spawn`/`pot`/`weights`/`adaptive-spawn-integration` suites (all `__tests__/engine/*.test.ts` 182 pass per spec Auto Run) + `helpers.preSpawnBoardOf`/`runSeededSession` `N3` pin. | `game.test.ts` 32 pass + `ceiling.test.ts` 7 pass + `pot.test.ts` + `weights.test.ts` + `adaptive-spawn-integration` 5 suites |
| Offline / Installability | Installable + offline (NFR-2/6) unchanged; no new native module or network dep (ceiling is pure TS `types` + `pot`). | — | `npm --prefix triade test` offline (no network) still green. | Manual offline device lane not needed for this sweep (no new native module). |

**Unknown thresholds:** None material. Guard cost `<0.01 ms` is observed, not threshold-invented; `ceilingDetector` `null`-pad is defensive-only (no PRD threshold). If a future sweep introduces a `BOARD_SIZE` change, record its measured `emptyBoard()` cost as baseline rather than inventing a threshold. `MAX_POT_TIER=30` threshold is already pinned in `pot.ts:4` (not NFR-invented).

---

## Entry Criteria

- [ ] Requirements and assumptions agreed upon by QA, Dev, PM (spec `spec-engine-ceiling-hardening.md` intent/boundaries/I-O matrix 8 rows + 4 ACs signed; DW-41..45 ledger entries `open→done` reviewed)
- [ ] Test environment provisioned and accessible (`triade/` host `node --import tsx --test` + `tsx` + `tsconfig.test.json` (`TSX_TSCONFIG_PATH`) + `helpers.ts` `emptyBoard`/`boardWith`/`gameState`/`rngOf`/`mulberry32`)
- [ ] Test data available or factories ready (`boardWith` 4×4 16-cell + `[[3,null],[undefined],[NaN,-5,0,Infinity,96]]` invalid mix + ragged `[[3,null],undefined]` + scalar sweep `[-5,0,NaN,Infinity,47.9,48,48.1,95.9,96,192,768,1e15,MAX_SAFE_INTEGER]` + `emptyBoard`/`jagged` fixtures + `rngOf(0,0,0.5)` 3-draw effective / `rngOf(0,0, 9×0, 9×0.5)` 20-draw `newGame`)
- [ ] Feature deployed to test environment (commit `7ec307b` on host — `ceiling.ts` patched + ledger `deferred-work.md` DW-41..45 + spec `Auto Run Result Status: done`; baseline `bc7d858` committed; `git diff --stat -- triade/src/engine` shows single file `ceiling.ts` delta vs baseline)
- [ ] No line/spawn/feel/layout edits (`git diff --stat -- triade/src/engine -- triade/src/feel triade/src/ui triade/src/services` shows `ceiling.ts` only) and `sprint-status.yaml` not written by this workflow (orchestrator-owned per prompt)

## Exit Criteria

- [ ] All P0 tests passing (`ceilingDetector` invalid/row guards + `tierForCeiling` negative/0/NaN/Infinity/fractional/very-large guards + 8-tier boundary ladder)
- [ ] All P1 tests passing (or failures triaged with waivers) — `ceiling.test.ts` 7 pass + pot/weights/adaptive-spawn chain 5 suites + pipeline `game.move` 32 pass green
- [ ] No open high-priority / high-severity bugs (R-001..R-003 mitigations green or formally waived with owner/expiry)
- [ ] Test coverage agreed as sufficient (P0/P1 ≥95% on ceiling seam; `rg` allowlists for single `isFinite`/`Array.isArray`/`log2`/`1e-9`/`MAX_POT_TIER` green)
- [ ] `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` clean (both via `TSX_TSCONFIG_PATH`)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness+ladder correctness, single-guard maintainability, O(1) frame budget, pot cap 30)

## Project Team (Optional)

| Name | Role | Testing Responsibilities |
|------|------|--------------------------|
| Eduardo | QA Lead / TEA | Owns ceiling P0 guard + tier boundary + pot cap pins, pipeline `ceiling→tier→pot→spawn` gates, ledger `resolution-undo` verification, nfr-assess handoff |
| FE lead | Dev Lead | Owns `ceiling.ts` row/tile guards + tier finite guards vs `Math.log2` ladder, unbounded-tier docs + `potForTier` cap contract, formula preservation `1e-9` |
| PM | PM | Signs unbounded-tier contract (no hard MAX_TIER in ceiling.ts, capping belongs to `potForTier:30`) + accepts ragged-board silent-skip residual (spec-allowed) + `Float note DW-42` negligible |


---

## Test Coverage Plan

> Note: `P0/P1/P2/P3` = priority/risk, **not** execution timing. Execution timing is in Execution Strategy.

### P0 (Critical) — Must-pass to ship the hardening; host unit, already green (manual probe + `ceiling.test.ts` 7)

**Criteria**: Blocks defensive bypass (row crash / Infinity leak / NaN leak / unbounded OOB) or tier boundary drift + high risk (≥6) + no workaround (ceiling is the spawn-seed for every `move`)

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| AC — `ceilingDetector([[3,null],[undefined],[NaN,-5,0,Infinity,96]] as any) → 96` (invalid tiles ignored, valid max wins) | Unit | R-001 | 1 | QA (done) | Spec Verification manual probe `console.log(ceilingDetector(...)) → 96`; gate `Number.isFinite(v) && v>0` filter proven. |
| AC — `ceilingDetector([[3,null],[undefined],[768,null]] as Board) → 768` skips missing/non-array row, no throw + `ceilingDetector([])→0` + `ceilingDetector(null as any)→0` + `ceilingDetector([[3,null],undefined as any])→3` | Unit | R-002 | 4 | QA (done) | `if (!Array.isArray(board)) return 0` + `if (!Array.isArray(row)) continue` guards; `board[r][c]` bare access gone. |
| AC — `tierForCeiling` non-finite/negative/0 guards: `-5→0, 0→0, NaN→0, Infinity→0` (no `NaN`/`Infinity` leak) | Unit | R-001, R-006 | 4 | QA (done) | `if (typeof ceiling !== 'number' \|\| !Number.isFinite(ceiling) \|\| ceiling < 48) return 0` + `!Number.isFinite(raw) →0`. |
| AC — `tierForCeiling` fractional ladder: `47.9→0, 48→1, 48.1→1, 95.9→1, 96→2` (floor via log2, epsilon preserved) | Unit | R-005 | 5 | QA (done) | Keeps `Math.floor(Math.log2(ceiling/48)+1e-9)+1`; `Math.trunc(raw)` only after floor, not on input. |
| AC — Boundary ladder pinned: `24→0,47→0,48→1,95→1,96→2,191→2,192→3,383→3,384→4,767→4,768→5,1536→6,3072→7,6144→8` | Unit | R-004, R-007 | 1 | QA (done) | `ceiling.test.ts:33-48` `tierForCeiling maps every boundary` — keep green; 14-case wall. |
| AC — Very-large ceilings stay finite + capped pot: `tierForCeiling(1e15)→45 finite && tierForCeiling(MAX_SAFE_INTEGER)→48 finite && potForTier(45/48).length===31` (unbounded tier safe) | Unit | R-003 | 3 | QA (done) | Manual probe `tier finite` second element; `pot.ts:MAX_POT_TIER=30` cap proven. |
| AC — Existing `ceilingDetector` jagged+empty+full scan: `emptyBoard→0`, `768 at [0,0] vs [3,3]`, jagged `[[3,null],[null,6,12],[null,null,null,768,1536]]→1536` | Unit | R-002 | 3 | QA (done) | `ceiling.test.ts:7-31,85-92` 4 cases — keep green; ensures `16-cell` scan still covers every cell. |
| AC — Manual probe gate from spec Verification: `node --import tsx -e "…ceilingDetector(...)→96… tierForCeiling([…])→[0,0,0,0,0,1,1,1,2,3,5,45,48]"` no `NaN`/`Infinity` | Unit | R-001, R-005, R-006 | 1 | QA (done) | Spec `Verification` command — run host, expect `96` and `0,0,0,0,0,1,1,1,2,3,5,45,48` (finite). |

**Total P0**: 22 checks (host unit: invalid 1 + row 4 + non-finite 4 + fractional 5 + boundary 1 wall (14 asserts) + very-large 3 + existing 3 + probe 1), `<1 s` host + `<15 min` full gate

### P1 (High) — Core wiring & wall pipeline

**Criteria**: Important ceiling→tier→pot→spawn pipeline + medium/high risk + common game workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Engine→pot pipeline 4 tiers: `ceilingDetector→tierForCeiling→potForTier` ladder `FR7 48→[Pot1],96→[1,2],384→[1,2,4,8],768→[1,2,4,8,16]` + `potForTier(30)` length 31 capped | Integration (engine→pot) | R-003, R-006 | 4 | QA | `pot.test.ts` 8-tier `FR7_LADDER` + `potForTier` cap suites — gate `npm test -- __tests__/engine/pot.test.ts`. |
| `adaptive-spawn-integration` 5 suites: `AC7 distribution 10k N`, `pot-by-ceiling conditional`, `tier-0 0/1/2 exception`, `ceiling ordering tier>=1 v<=ceiling`, `N3 promise/materialization` | Integration (engine) | R-004, R-006 | 5 | QA | `triade/__tests__/engine/adaptive-spawn-integration.test.ts` 5 suites (280 LOC) — proves `ceiling→tier` drives `weightedPicker` pot branch. |
| `spawn.ts`/`weights.ts` 3 suites: `spawnConfig FIXED_WEIGHTS 40/40`, `potWeights.normalizeTo`, `pickIndex` NaN clamp (no ceiling leak) | Integration (engine) | R-001, R-006 | 3 | QA | `spawn.test.ts`/`weights.test.ts` — keep green; `weights` `normalizeTo` must never see `Infinity` tier. |
| `game.move` 4 suites: `HAPPY_PATH/CASCADE/ONE_CELL` + `newGame 20-draw`/`effective 3-draw` + `trace` spawned + `isGameOver` (indirectly consumes `ceilingDetector` via `newGame`/`move` spawn branch) | Integration (game) | R-002, R-006 | 4 | QA | `game.test.ts` 32 pass — `ceilingDetector` feeds `tierForCeiling` inside `move` spawn resolver; regression guard for ceiling change. |
| Existing `ceiling.test.ts` + `pot.test.ts` + `helpers.preSpawnBoardOf`/`runSeededSession` `tieredPairs` green (no regression on `line.test.ts`/`game.test.ts` 32+18 pass) | Unit | R-001, R-004 | 1 | QA | Spec `Verification: npm test -- ceiling.test.ts` expected pass; Auto Run Result `882/11 expected-RED` baseline preserved. |
| Ledger `deferred-work.md` DW-41..45 `done` with `resolution-undo` 64-hex hash, `sprint-status.yaml` untouched (orchestrator-owned) | Static | R-008 | 1 | QA | `rg -n "status: done 2026-09-02" deferred-work.md` shows 5 hits DW-41..45 each with `resolution-undo: d403df0b…`; `git diff --stat` shows `deferred-work.md` but not `sprint-status.yaml`. |

**Total P1**: 18 checks, ~1.0–1.8 h host (mostly existing suites, manual probe + ledger 5 hits already landed)

### P2 (Medium) — Secondary flows + low/medium risk (4)

**Criteria**: Secondary helper edges + low/medium risk + static scans

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
|-------------|------------|-----------|------------|-------|-------|
| Single-row/board guard + single-tile-filter + single-log2 + single-epsilon + single-pot-cap allowlists — `rg -n "Array\.isArray\(board\)" ==1`, `Array.isArray(row) ==1`, `Number.isFinite(v) ==1`, `Math.floor(Math.log2 ==1`, `1e-9 ==1`, `MAX_POT_TIER ==1` | Static scan | R-001, R-002, R-003 | 1 | QA | Any duplicate `Array.isArray` or reintroduced `v !== null` or second `Math.log2` is a fail; `ceiling.ts` stays single guard each. |
| No duplicate filter predicate — `v !== null` 0 hits in `ceiling.ts` (filter is `isFinite && >0`), `!Number.isFinite(ceiling)` 2 hits in `tierForCeiling` (early + raw) + `!Number.isFinite(raw)` 1 | Static scan | R-001 | 1 | QA | `rg -n "v !== null" triade/src/engine/core/ceiling.ts` ==0; `rg -n "!Number\.isFinite\(ceiling" triade/src/engine/core/ceiling.ts` ==1 + `!Number\.isFinite\(raw"` ==1. |
| `CeilingTier` unbounded doc + `potForTier` cap coupling — `rg -n "Unbounded" ceiling.ts` ==1 + `rg -n "capped" ceiling.ts` ==1 + `rg -n "MAX_POT_TIER" pot.ts` ==1 + `rg -n "48 \* 2" ceiling.ts` ==1 (ladder doc 48*2^(k-1)) | Static scan | R-003 | 1 | QA | Ensures `ceiling.ts:4-11` unbounded JSDoc stays + `pot.ts` cap not drifted to 31+; `CeilingTier = number` alias unchanged. |
| Board `board never exceeds` complement + zero-board `emptyBoard` 4×4 zero board + `adaptive-spawn` `N3` no-leak sweep | Integration | R-006 | 1 | QA | `helpers.preSpawnBoardOf` + `runSeededSession` 200-move sweep still green — proves guarded ceiling never leaks `Infinity` into `tieredPairs`. |

**Total P2**: 4 checks, ~0.4–0.8 h host

### P3 (Low) — Exploratory / benchmarks

**Criteria**: Nice-to-have, exploratory, benchmarks, tuning

| Requirement | Test Level | Test Count | Owner | Notes |
|-------------|------------|------------|-------|-------|
| Exploratory — ragged board beyond `[[3,null],undefined]` : `ceilingDetector([[1,2],[3]] as Board)` still pads to finite max vs old throw, `ceilingDetector([undefined, null, [0, -1]] as any) →0` (all invalid→0) | Device exploratory (host `node`) | 1 | QA | No assertion beyond no-throw + finite max; if hit, file DW for ragged-Board production guard vs silent-pad decision (R-002 residual). |
| Micro-zero — `ceilingDetector(emptyBoard)===0` + `tierForCeiling(0)===0 && tierForCeiling(-Infinity)===0` + `tierForCeiling(Infinity)===0 && NaN===0` complements 4×4 full board `ceiling 384→tier 4` + `768→5` + `1536→6` | Unit | 1 | DEV | Already `emptyBoard→0` + boundary 384/768/1536 →4/5/6 via `ceiling.test.ts:33-48`. |
| No-leak ladder bench — `ceilingDetector` 10k × 4×4 random board (density 75% + 10% Infinity/NaN injection filtered) median `<0.05 ms` + `tierForCeiling` 10k × `MAX_SAFE_INTEGER` median `<0.01 ms` (guard `isFinite` O(1), no bench lane beyond `feel.bench.test.ts` full-board `median/p99` unchanged) | Unit (bench) | 1 | DEV | Engine `<2 ms/turn`, frame worst `<8 ms`; guard adds `<0.01 ms` per call — just confirm no `while` infinite (no loop). Not a new lane, just CI `npm test` timing. |
| Cross-cutting negative scan — `rg -n "music\|bgm\|RevenueCat\|AdMob" triade/src/engine --include="*.ts"` empty (engine sweep stayed in scope, no cross-cutting concern leaked) | Static scan | 1 | QA | Trivial hygiene; carry-over — no new gate, just prove sweep stayed in scope. |

**Total P3**: 4 checks, ~0.2–0.4 h host

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch guard/format regressions before full gate

- [ ] `npm --prefix triade test -- __tests__/engine/ceiling.test.ts` green on clean working tree (7 pass) — includes empty, largest tile, full scan, boundary ladder, board→tier, mid-tier, jagged
- [ ] Manual probe from spec Verification: `npm --prefix triade exec -- node --import tsx --test` probe `ceilingDetector([[3,null],[undefined],[NaN,-5,0,Infinity,96]] as any) →96` + `tierForCeiling([-5,0,NaN,Infinity,47.9,48,48.1,95.9,96,192,768,1e15,MAX_SAFE_INTEGER]) → [0,0,0,0,0,1,1,1,2,3,5,45,48]` no `NaN`/`Infinity`
- [ ] `npx tsc --noEmit --project triade/tsconfig.json` + `triade/tsconfig.test.json` via `TSX_TSCONFIG_PATH` clean (no new `@ts-ignore`, guards typed `number`)
- [ ] `rg -n "Array\.isArray\(board\)" triade/src/engine/core/ceiling.ts | wc -l` ==1 and `rg -n "Number\.isFinite\(v\)" | wc -l` ==1 and `rg -n "Math\.floor\(Math\.log2" | wc -l` ==1 and `rg -n "v !== null" triade/src/engine/core/ceiling.ts | wc -l` ==0 (quick scan)

**Total**: 4 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical ceiling/tier guards (host only)

- [ ] Invalid-tile filter: `NaN/-5/0/Infinity` ignored →96 vs Infinity leak
- [ ] Row/board guard: `undefined` row skipped →768 + `[]`/`null`→0
- [ ] Tier guards: `-5/0/NaN/Infinity→0` + `47.9→0` / `48.1→1` / `95.9→1` / `96→2`
- [ ] Boundary ladder 14-case + very-large `1e15→45` + `MAX_SAFE_INTEGER→48` + `potForTier` cap 31

**Total**: 22 P0 checks (already passing in `7ec307b` — `ceiling.test.ts:7` + manual probe green)

### P1 Tests (<30 min)

**Purpose**: Pipeline + ladder chain

- [ ] `pot.test.ts` 8-tier + cap + `weights.test.ts` FIXED 40/40 + `spawn.test.ts` NaN clamp
- [ ] `adaptive-spawn-integration` 5 suites (distribution 10k + pot-by-ceiling conditional)
- [ ] `game.test.ts` 32 pass (newGame 20-draw / effective 3-draw + trace spawned)
- [ ] Ledger `resolution-undo` 64-hex 5 hits + `git diff --stat -- triade/src/engine` shows `ceiling.ts` only, not `sprint-status.yaml`

**Total**: 18 P1 groups

### P2/P3 Tests (<60 min)

**Purpose**: Scans, bench, exploratory

- [ ] Single-guard / single-formula / single-cap + pot coupling + `v !== null` 0-hit scans (<1 min)
- [ ] Ledger `resolution-undo` 64-hex 5 hits + `git diff` `sprint-status.yaml` untouched (<1 min)
- [ ] Ragged exploratory + micro-bench + cross-cutting scan (<2 min)

**Total**: 8 P2/P3 checks

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|----------|-------|------------|-------------|-------|
| P0 | 22 | ~0.08 | ~1.2–1.8 | Pure `ceiling.ts` + `ceiling.test.ts` 7 + manual probe 96 + tier finite array are O(1) host; invalid/row/non-finite/fractional/boundary/very-large already green (done in `7ec307b`) |
| P1 | 18 | ~0.12 | ~1.4–2.8 | Existing `ceiling.test.ts:7` + `pot:8-tier` + `adaptive-spawn-integration:5` + `game:32` + `weights/spawn:3` + ledger 5-hit (mostly existing suites, manual probe guard already landed) |
| P2 | 4 | ~0.15 | ~0.4–0.8 | Static allowlists + pot coupling + filter 0-hit + no-leak sweep |
| P3 | 4 | ~0.10 | ~0.2–0.4 | Ragged exploratory + micro-bench + cross-cutting scan |
| **Total** | **48** | **-** | **~3.2–5.8** | **~0.4–0.8 days host; full gate `<15 min` (`npm test` + `tsc` + `rg`) — no device bench lane required; guard is O(1) <0.01ms** |

### Prerequisites

**Test Data:**

- `boardWith` 4×4 16-cell + `[[3,null],[undefined],[NaN,-5,0,Infinity,96]]` invalid mix + ragged `[[3,null],undefined]` + scalar sweep `[-5,0,NaN,Infinity,47.9,48,48.1,95.9,96,192,768,1e15,MAX_SAFE_INTEGER]` + `emptyBoard`/`jagged` 3-row + `rngOf(0,0,0.5)` 3-draw + `mulberry32(seed)` + `stateFromResult`/`preSpawnBoardOf`/`runSeededSession`
- `GRID_SIZE=4` + `POT_BASE_VALUE` + `MAX_POT_TIER=30` + `FIXED_WEIGHTS 40/40` + `POT_CURVE` fixtures

**Tooling:**

- `node --import tsx --test` (host) via `TSX_TSCONFIG_PATH=tsconfig.test.json` — already in `triade/package.json` `test` script
- `rg` (ripgrep) for allowlist scans (`Array.isArray(board/row)`, `Number.isFinite(v)`, `Math.floor(Math.log2`, `1e-9`, `MAX_POT_TIER`, `v !== null`, `Unbounded`, `resolution-undo`)
- `npm --prefix triade exec -- tsc --noEmit` for both `tsconfig.json` + `tsconfig.test.json`

**Environment:**

- `triade/` host Node 20+ (no Expo dev build needed — engine is pure TS, no native module)
- Working tree on `bc7d858` baseline + `7ec307b` delta; `triade/src/engine` delta guard `ceiling.ts` only

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — invalid filter + row guard + tier non-finite/fractional/very-large + boundary ladder)
- **P1 pass rate**: ≥95% (waivers required for failures — e.g. `adaptive-spawn-integration` statistical `N=10k` 5σ tripwire may be `WAIVED` only with seed reason if `sigmaBound` 5σ headroom drifts)
- **P2/P3 pass rate**: ≥90% (informational; static allowlists must be 100%)
- **High-risk mitigations**: 100% complete or approved waivers with owner + expiry (R-001..R-003)

### Coverage Targets

- **Critical paths**: ≥90% (ceiling scan 16-cell + tier ladder 8 boundaries + pot cap are all critical)
- **Ceiling seam scenarios**: 100% (`[NaN,-5,0,Infinity,96]→96`, `undefined` row skip, `-5/0/NaN/Infinity→0`, `47.9/48.1`, `1e15/MAX_SAFE_INTEGER` finite must be PINNED)
- **Business logic** (`ceilingDetector` pure + `tierForCeiling` `log2+1e-9` + `potForTier` cap 30): ≥85%
- **Edge cases** (empty board, jagged, `null` board, `0`/`-Infinity`, `95.9`, right-row ragged, `Infinity` pot capped): ≥80%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (invalid 96 + row 768 + non-finite 0s + fractional 0/1 + 14 boundary + 2 very-large finite + pot 31 cap)
- [ ] No high-risk (≥6) items unmitigated (R-001..R-003 mitigations green or formally waived with owner+expiry)
- [ ] Boundary invariant holds (`47→0,48→1,95→1,96→2,191→2,192→3,383→3,384→4,767→4,768→5` and `47.9→0,48.1→1`)
- [ ] Invalid-tile invariant holds (`Infinity` never becomes ceiling, `v !== null` 0 hits, `isFinite(v)&&>0` 1 hit)
- [ ] No duplicate row/board guard and no `board[r][c]` bare access (2 `Array.isArray` in `ceiling.ts`, 0 bare)
- [ ] Unbounded tier documented (`Unbounded` 1 hit) + formula preserved (`1e-9` 1 hit, `Math.floor(Math.log2` 1 hit) + pot cap `MAX_POT_TIER` 1 hit
- [ ] `npx tsc --noEmit` clean for both `tsconfig.json` + `tsconfig.test.json` (no new `@ts-ignore` outside `rn-stub` ring)
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers (never-throw+finiteness+ladder correctness, single-guard maintainability, O(1) frame budget, pot cap 30)

---

## Mitigation Plans

### R-001: Invalid tile filter regression — Infinity/NaN leak (Score: 6)

**Mitigation Strategy:** Pin invalid-tile contract as **finite `>0` only**: host unit `ceilingDetector([[3,null],[undefined],[NaN,-5,0,Infinity,96]] as any)===96` + `[[Infinity,96]]→96` not `Infinity`; grep `Number.isFinite(v)` ==1 and `v !== null` ==0; tier leak `tierForCeiling(Infinity)===0 && NaN===0`.

**Owner:** FE lead
**Timeline:** Immediate (gate this sweep; protects DW-44)
**Status:** Complete (code `7ec307b: ceiling.ts:31` guard landed + manual probe `96` green + `potForTier(Infinity)===0` already via `pot.ts:7`)
**Verification:** `npm --prefix triade test -- __tests__/engine/ceiling.test.ts` (7 pass) + `rg -n "Number\.isFinite\(v\)" triade/src/engine/core/ceiling.ts` ==1 + `rg -n "v !== null" triade/src/engine/core/ceiling.ts` ==0 + manual probe `Infinity→96`

### R-002: Missing/non-array row guard masks ragged boards (Score: 6)

**Mitigation Strategy:** Make guard observable: `Array.isArray(board)` early `→0` + `Array.isArray(row)` skip is defensive-only; host pins `[[3,null],undefined,[768]]→768` + `[[3,null],undefined]→3` + `[]→0` + `null→0`; grep 2 `Array.isArray` sites + 0 `board[r][c]` bare; jagged `[[3,null],[null,6,12],[null,null,null,768,1536]]→1536` already `ceiling.test.ts:85-92` stays green.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-41 crash; protects spawn)
**Status:** Complete (`ceiling.ts:25-28` guards landed; 4 P0 row pins via manual probe reproducible)
**Verification:** Manual probe `[[3,null],[undefined],[768]]→768` + `ceiling.test.ts` jagged 1536 + `rg -n "Array\.isArray\(row\)" triade/src/engine/core/ceiling.ts` ==1 + `rg -n "board\[r\]\.\[c\]" triade/src/engine/core/ceiling.ts` ==0

### R-003: Unbounded tier contract drift — fixed-enum consumer OOB (Score: 6)

**Mitigation Strategy:** Keep unbounded contract and cap at pot: JSDoc `Unbounded: grows with ceiling; consumers that need capped range should clamp (e.g. potForTier caps at MAX_POT_TIER=30)` + ladder doc `k>=1 => 48*2^(k-1)`; host `1e15→45` + `MAX_SAFE_INTEGER→48` finite + `potForTier(45/48).length===31` capped; scan `Unbounded` 1 + `MAX_POT_TIER` 1 + `48 * 2` ladder 1.

**Owner:** FE lead
**Timeline:** Immediate (gate DW-43; protects weights)
**Status:** Complete (JSDoc `ceiling.ts:4-11` + formula `ceiling.ts:49` + `pot.ts:4 MAX_POT_TIER=30` landed; probe `45,48` + `31 cap` green per spec Verification)
**Verification:** Manual probe `1e15→45, MAX_SAFE_INTEGER→48` + `potForTier(45).length===31` + `rg -n "Unbounded" ceiling.ts` ==1 + `rg -n "MAX_POT_TIER" pot.ts` ==1 + `npm --prefix triade test -- __tests__/engine/pot.test.ts` 8-tier ladder pass

---

## Assumptions and Dependencies

### Assumptions

1. Production `Board` is always 4×4 via `emptyBoard()`/`boardWith()`/`boardFromLines(emptyBoard())`/`staticBoard` (spec I-O: invalid/ragged inputs are harness/fuzz/edge only; `deferred-work.md` DW-41 says "Contrato de board retangular do engine; pré-existente e consistente com o resto do core"). Guard paths are defensive-only.
2. Invalid tiles are precisely `NaN`/`Infinity`/`-Infinity`/`negative`/`0`/`non-number` (`null`/`undefined`/`string`); valid game tiles are positive finite powers-of-two multiples of 3 (`1`/`2`/`3`/`6`/`12`…`6144`). No valid tile is `0` or `Infinity`.
3. Tier ladder `48*2^(k-1)` with `k=0→<48` is exact; epsilon `1e-9` is intentional to bias exact boundaries toward the lower tier's successor where `log2` is within `1e-9` of integer (spec `Always: Keep log2 formula and epsilon 1e-9`); very-large drift beyond `MAX_SAFE_INTEGER` is negligible within 2048 bounds (spec `Float note DW-42`).
4. `GRID_SIZE=4` stays fixed (spec `Never: Change GRID_SIZE, introduce async I/O, or alter tier/spawn RNG budgets`); `potForTier` `MAX_POT_TIER=30` cap is the only ceiling cap (spec Design Notes: "Unbounded tier is intentional … Capping belongs in potForTier").

### Dependencies

1. `triade/src/engine/core/pot.ts:4-8` `potForTier` cap 30 — required to prove unbounded tier safe; scan `rg -n "MAX_POT_TIER" triade/src/engine/core/pot.ts` ==1.
2. `triade/src/engine/core/types.ts:1-5` `Board`/`Cell` 4×4 contract — required for ragged guard rationale; `git diff --stat -- triade/src/engine` shows `types.ts` byte-identical.
3. `triade/__tests__/engine/ceiling.test.ts:1-92` 7-case suite — required as P0 baseline; `npm --prefix triade test -- __tests__/engine/ceiling.test.ts` must stay 7 pass before sweep lands P0 manual probe pins.
4. `triade/test-utils/helpers.ts: preSpawnBoardOf`/`runSeededSession`/`sigmaBound` — required for adaptive-spawn-integration tier composition over live move path; `git diff --stat -- triade/test-utils` shows `helpers.ts` unchanged (no new helper drift).

### Risks to Plan

- **Risk**: Manual probe `ceilingDetector([[3,null],[undefined],[NaN,-5,0,Infinity,96]] as any) → 96` not yet in `ceiling.test.ts` (only spec Verification) — a follow-on that reverts filter to `v !== null` would pass existing `ceiling.test.ts` 7 but fail the probe.
  - **Impact**: `Infinity` ceiling leak would be hidden until spawn weight corruption.
  - **Contingency**: Promote probe pin to a committed `ceiling.defensive.test.ts` if guard ever regresses; keep probe in this plan's P0 Smoke.

- **Risk**: Very-large tier `MAX_SAFE_INTEGER→48` float drift off-by-1 if Node `Math.log2` precision changes (e.g. V8 update).
  - **Impact**: Wrong pot bucket one tier high/low — spawn `value` biased by one `weights.ts` ladder step.
  - **Contingency**: If drift ever observed, add `tierForCeiling` loop-correction `while(48*2^(tier-1) > ceiling) tier--` as patch — but spec says negligible, so no patch now.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|------------------|--------|------------------|
| **triade/src/engine/core/pot.ts `potForTier`** | `tierForCeiling` output is `potForTier` input; unbounded tier `45/48` must be capped at `30 → length 31` not OOB; `Number.isFinite(tier)` check in `pot.ts:7` is the safety net. | `pot.test.ts` FR7 ladder 8 tiers + `potForTier(30)` cap + `potForTier(Infinity)→0` companion must stay green (`npm --prefix triade test -- __tests__/engine/pot.test.ts`). |
| **triade/src/engine/config/spawnConfig.ts + triade/src/engine/core/spawn.ts / weights.ts** | `FIXED_WEIGHTS 40/40` + `POT_WEIGHT` normalized via `weightedPicker` consumes `potForTier` ladder; ceiling→tier drift by one would shift pot membership one tier and bias `resolveSpawn` `value` distribution (40/40 vs pot-by-ceiling). | `weights.test.ts` `>N*0.1 → sigmaBound 5σ±1%` dual gate + `spawn.test.ts` `pickIndex` NaN clamp + `adaptive-spawn-integration` `10k N` `AC7` distribution must stay green. |
| **triade/src/engine/core/game.ts `newGame`/`move`/`stateFromResult`** | `newGame` resolves initial `pendingSpawn` via `ceilingDetector→tierForCeiling`; `move` effective `3-draw` re-resolves NEXT pending from post-merge board `preSpawnBoardOf` ceiling. Invalid guards keep draw budgets `20`/`3`/`0` intact. | `game.test.ts` 32 pass (HAPPY_PATH/CASCADE/ONE_CELL + `trace:spawned` + `isGameOver` + `20/3/0` draw) must stay green; `helpers.runSeededSession` `tieredPairs` composition must stay green. |
| **triade/test-utils/helpers.ts `preSpawnBoardOf`/`runSeededSession`/`sigmaBound`** | Helpers derive `tieredPairs` buckets from `ceilingDetector→tierForCeiling` on reconstructed pre-spawn boards; guard change alters `lastResolvedTier` bucketing if ceiling becomes `Infinity` vs `96`. | `adaptive-spawn-integration` 5 suites + `helpers.test` + `pot.test` green; `sigmaBound 5σ≈0.0063` header docs must stay `z=5`. |
| **triade/src/render/transitionPlan.ts `classify` / GameBoard.tsx** | Indirectly affected via `game.move` trace `spawned` flag (spawn lands on opposite-edge of each `moved` line); ceiling does not directly affect `classify` but a corrupted `tier→pot→value` would change trace `spawned.value` and `initialStats.maxTile`. | `transitionPlan.test.ts` 16 pass + `App.tsx` wiring `initialStats` `ceilingDetector(board)` + `matchOrchestrator` `Snapshot` `pendingSpawn` must stay green (no new `transitionPlan` pin required for this sweep, but smoke `game→transition` `resultingTiles→occupiedCells` `assertNoLeak` 200-move sweep must stay green). |
| **triade/__tests__/engine/ceiling.test.ts (7-case seam)** | Only seam that directly consumes both exports; `grid 4×4` + jagged + boundaries are the living pins. | Must remain 7 pass with no new `@ts-ignore`; `rg -n "ceilingDetector\|tierForCeiling" triade/__tests__ --include="*.ts" | wc -l` shows seam stability. |

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection (Unit for pure `ceilingDetector`/`tierForCeiling`/`potForTier`, Integration for `ceiling→tier→pot→spawn` chain, no E2E for this sweep)
- `test-priorities-matrix.md` - P0-P3 prioritization
- `nfr-criteria.md` - NFR planning (reliability/maintainability/performance/offline)
- `adr-quality-readiness-checklist.md` - readiness gate (not system-level; sweep bundle uses epic-level checklist)
- `test-quality.md` - quality gates P0 100%/P1 ≥95%

### Related Documents

- Spec: `_bmad-output/implementation-artifacts/spec-engine-ceiling-hardening.md` (`intent-contract` I/O matrix 8 rows + tasks + acceptance + verification manual probe)
- Engine: `triade/src/engine/core/ceiling.ts:1-52` (hardened source), `triade/src/engine/core/pot.ts:4-8` (cap 30), `triade/src/engine/core/types.ts:1-5` (Board), `triade/src/engine/core/index.ts:6-7` (re-exports)
- Tests: `triade/__tests__/engine/ceiling.test.ts:1-92` (7-case seam)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` (DW-41..45 `done 2026-09-02` + `resolution-undo: d403df0b…`)
- Config: `_bmad/tea/config.yaml` (`test_artifacts _bmad-output/test-artifacts`, `test_design_output _bmad-output/test-artifacts/test-design`, `risk_threshold p1`)

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
**Execution Mode**: sequential
**Delta SHA (spec)**: `final_revision 7ec307b05c2b50f6e28112f97aede463db1c5d2e` vs `baseline bc7d8588539e4da4a3babf50226457078c65a734`
**Working-tree diff vs HEAD**: `deferred-work.md` DW-41..45 `open→done` + `spec-engine-ceiling-hardening.md` `Auto Run Result Status: done` (engine `ceiling.ts` already `7ec307b`)

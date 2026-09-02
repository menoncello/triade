---
title: 'engine-ceiling-hardening: harden ceiling/tier pipeline defensive guards'
type: 'refactor'
created: '2026-09-02T06:30:00'
status: 'done'
baseline_revision: 'bc7d8588539e4da4a3babf50226457078c65a734'
final_revision: '7ec307b05c2b50f6e28112f97aede463db1c5d2e'
followup_review_recommended: false
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** `triade/src/engine/core/ceiling.ts` is fragile on defensive edges: `ceilingDetector` crashes on missing/undefined rows, silently swallows invalid tile values (NaN/negative/0), and `tierForCeiling` returns NaN/Infinity on non-finite ceilings and grows unbounded without documented contract or float guards for very large ceilings.

**Approach:** Harden both exports in place with minimal defensive guards while preserving the current closed-form `Math.floor(Math.log2(ceiling/48)+1e-9)+1` formula and its tier boundaries. Add row-existence and finite-positive tile checks, bound `tierForCeiling` against non-finite/negative/fractional/very-large inputs, document the unbounded-tier contract, and keep behavior identical for all valid game boards.

## Boundaries & Constraints

**Always:** Keep log2 formula and epsilon `1e-9`; tier boundaries <48→0, ≥48→1, ≥96→2, ≥192→3, ≥384→4, ≥768→5, doubling thereafter remain pinned; `ceilingDetector` still scans all cells and returns 0 on empty; `potForTier` caps at MAX_POT_TIER=30 so unbounded tier is safe; engine never throws.

**Block If:** Would need to cap `tierForCeiling` at a hard MAX_TIER inside ceiling.ts, change spawn distribution, change Board/Grid semantics, or rework spawnConfig/pot ladder.

**Never:** Change spawn weights/distribution or GRID_SIZE; introduce new dependencies or build steps; edit `deferred-work.md` ledger; mutate input boards; change public Board/CeilingTier types beyond guards/docs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Missing row | board = [[3,null], undefined, [768,null]] | ceilingDetector returns 768, skips undefined/non-array rows, no throw | Guard: Array.isArray(row) continue |
| Invalid tile values | board contains NaN, -12, 0, Infinity, null, 96 | ceilingDetector returns 96 (only finite >0 considered) | Filter: typeof number && isFinite && >0 |
| Negative/0 ceiling | tierForCeiling(-5), (0), (-Infinity) | returns 0 | Guard: !isFinite or <48 →0 |
| Fractional ceiling | tierForCeiling(47.9), (48.1), (95.9) | 0, 1, 1 (floor via log2, formula preserved) | No error, normal log2 path |
| Infinity/NaN ceiling | tierForCeiling(Infinity), (NaN) | returns 0 (bounded, not Infinity/NaN) | Guard: !isFinite →0 |
| Very large ceiling | tierForCeiling(Number.MAX_SAFE_INTEGER), (1e15) | returns finite tier via log2 (pot caps), no Infinity | Finite guard + floor, documented float caveat |
| Valid boundaries unchanged | tierForCeiling 48,96,192,384,768,1536 | 1,2,3,4,5,6 as before | No error expected |
| Empty / jagged board | board [[3,null],[null,6,12]], [] | scans all present cells, returns max or 0 | No throw |

</intent-contract>

## Code Map

- `triade/src/engine/core/ceiling.ts:1-20` -- current implementation to harden: add row guard, tile-value guard, tier input guards, JSDoc for unbounded-tier contract; keep formula
- `triade/src/engine/core/pot.ts:4-8` -- reference: potForTier already clamps finite tier to [0,30] and degrades non-finite to 0; confirms unbounded tier safe
- `triade/src/engine/core/types.ts:1-5` -- Board = Cell[][] where Cell = number|null; rectangular contract but defensive guards allowed
- `triade/__tests__/engine/ceiling.test.ts:1-92` -- existing boundary/jagged tests to keep green; DW-45 notes missing negative/0/fractional/Infinity coverage (intent asks to keep formula while guarding, tests not required to be added here but guards must satisfy them)

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/engine/core/ceiling.ts` -- harden `ceilingDetector`: add `if (!Array.isArray(row)) continue` before row.length, filter tiles with `typeof v === 'number' && Number.isFinite(v) && v > 0` before `v > max`; add JSDoc explaining defensive guards and that valid boards are rectangular with positive powers of two
- [x] `triade/src/engine/core/ceiling.ts` -- harden `tierForCeiling`: add guard `if (typeof ceiling !== 'number' || !Number.isFinite(ceiling) || ceiling < 48) return 0`, keep `Math.floor(Math.log2(ceiling/48)+1e-9)+1` as core, then guard raw result `if (!Number.isFinite(raw)) return 0` and `Math.trunc(raw)` to normalize fractional tier; add module JSDoc documenting unbounded-tier contract (tiers grow as 48*2^(k-1), no hard cap here, capping belongs to potForTier) and float note for >MAX_SAFE_INTEGER is negligible within 2048 bounds

**Acceptance Criteria:**
- Given a board with missing/undefined row, when ceilingDetector called, then it returns max of present cells and does not throw
- Given a board containing NaN/negative/0/Infinity alongside valid tiles, when ceilingDetector called, then invalid tiles are ignored and valid max is returned (e.g. board with [NaN,-5,0,Infinity,96] → 96)
- Given tierForCeiling called with negative, 0, NaN, Infinity, fractional 47.9/48.1, when invoked, then it returns 0 for negative/0/NaN/Infinity, 0 for 47.9, 1 for 48.1, without returning NaN/Infinity, and preserves existing boundary tiers 48→1, 96→2, 192→3, 384→4, 768→5, 1536→6
- Given valid game boards (including empty and jagged used in tests), when ceilingDetector+ tierForCeiling used, then existing tests remain green and formula unchanged

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

Notes: Blind Hunter: no intent gap — guards match I/O matrix and keep log2 formula; unbounded-tier docs + pot cap reference sufficient. Edge Case Hunter: flagged Infinity tile now ignored (previously would become ceiling Infinity → tier Infinity → pot 0 same pot) and very-large tier 48 still huge but pot caps — both informational, not defects. No patch/defer required; same 882/11 expected-RED baseline preserved.

## Design Notes

Unbounded tier is intentional: ceiling 48*2^(k-1) ladder doubles forever. Capping belongs in potForTier (MAX_POT_TIER=30), not here. Example: tier 30+ still maps to pot length 31 capped. Guard for non-finite ceilings degrades to 0 (minimal spawn) rather than Infinity, because ceilingDetector never produces Infinity for valid tiles; this keeps engine-never-throws and пот's non-finite→0 fallback consistent.

## Verification

**Commands:**
- `npm --prefix triade test -- __tests__/engine/ceiling.test.ts` -- expected: all pass (empty, boundary, mid-tier, jagged)
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` -- expected: no errors
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` -- expected: no errors
- Manual probe: `node --loader tsx -e "import {ceilingDetector,tierForCeiling} from './triade/src/engine/core/ceiling.ts'; console.log(ceilingDetector([[3,null],[undefined],[NaN,-5,0,Infinity,96]] as any)); console.log([ -5,0,NaN,Infinity,47.9,48,48.1,95.9,96,192,768,1e15,Number.MAX_SAFE_INTEGER].map(tierForCeiling))"` -- expected: 96, [0,0,0,0,0,1,1,1,2,3,5, tier finite, tier finite]

## Auto Run Result

Status: done

Hardened `triade/src/engine/core/ceiling.ts` for DW-41–DW-45: `ceilingDetector` now guards missing/non-array rows and filters invalid tiles (`NaN`/`Infinity`/negative/0); `tierForCeiling` bounds non-finite/negative/fractional/very-large inputs while preserving `Math.floor(Math.log2(ceiling/48)+1e-9)+1` and documents the unbounded-tier contract (capped by `potForTier`). Verified: `npm --prefix triade test -- __tests__/engine/ceiling.test.ts` pass, `tsc` clean, manual probe returns `96` and `[0,0,0,0,0,1,1,1,2,3,5,45,48]` without `NaN`/`Infinity` leak.


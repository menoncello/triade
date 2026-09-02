---
title: 'purity-and-weight-doc-hardening: PURITY_ROOTS fallback for pot.test.ts and σ-budget docs for adaptive-spawn-integration.test.ts'
type: 'refactor'
created: '2026-09-01'
status: 'done'
baseline_revision: 'abd36bcc056bb060a867940a0afbe4d91aac2513'
final_revision: 'HEAD'
review_loop_iteration: 0
followup_review_recommended: false
context: []
warnings: []
---

<intent-contract>

## Intent

**Problem:** ATDD purity check in `pot.test.ts` is source-text-coupled (`readFileSync` + import-specifier/export regex) and breaks on file moves/reformats; statistical gates in `adaptive-spawn-integration.test.ts` are fixed-seed deterministic tripwires (AC2 `0xc31`, AC7 `0x26c6`, ceiling-ordering `0x51ce+ceiling`) brittle to seed/rng rotation but their σ-budget was undocumented. Hand-computed literal thresholds (DW-58) must remain the independent oracle; no band-math change desired.

**Approach:** Keep the verbatim `readFileSync` + `extractSpecifiers` + `export {potForTier} from './pot.ts'` oracle, but add a file-move fallback that resolves `pot.ts` (and `index.ts`) via `PURITY_ROOTS` auto-scan (`src/engine` + `src/game` recursive `readdirSync` search for `pot.ts`) so a move under the purity roots does not void the tripwire. Document the σ-budget for the fixed-seed gates next to the seeded runs in `adaptive-spawn-integration.test.ts` — AC2 ±2% ≈10σ at N=5000 (historical N=15000 uniform p=1/16 → σ≈0.00197 → 0.02/σ≈10.1), AC7 aggregate 40/40/20 window ±2% ≈4–5σ at N=10k, per-tier conditional via `sigmaBound` 5σ — without altering tolerances. The DW-58 hand-computed cumulative bands in `pot.test.ts` remain the independent oracle.

## Boundaries & Constraints

**Always:** Keep source-text-coupled oracle verbatim (Dw-54) — only add fallback scanning; keep DW-58 hand-computed literal thresholds as oracle; keep all statistical tolerances byte-identical (no `tol` or `sigmaBound` call changes beyond documented constants); mirror `engine.purity.test.ts` `PURITY_ROOTS` resolution so moves under `src/engine`/`src/game` are covered; preserve `readdirSync` sync handling and path-join semantics.

**Block If:** Fallback would require changing import spec or export regex, or band-math/tolerance changes would be needed to pass.

**Never:** Edit the deferred-work ledger; change `pot.ts`/`spawn.ts`/`weights.ts` game logic or `FIXED_WEIGHTS`/`POT_WEIGHT`/`POT_CURVE`; mutate `purported` band math in `pot.test.ts` (hand-computed literals stay); introduce async filesystem or new dependencies; change σ-gate numeric tolerances.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| pot.ts purity check, file at canonical path | `pot.ts` exists at `src/engine/core/pot.ts` | `resolveWithFallback` returns primary path, reads source, asserts `specifiers.some(endsWith spawnConfig.ts)` and no RN/Skia forbidden imports | No throw |
| pot.ts moved under src/engine | `pot.ts` moved e.g. `src/engine/pot.ts` or `src/engine/core/other/pot.ts`, primary path missing | `resolveWithFallback` falls back to `findFileSync` over `PURITY_ROOTS_FALLBACK` (`src/engine`, `src/game`) and locates `pot.ts`; same assertions run on found file | Falls through to primary path string if not found (read then throws ENOENT) |
| index.ts re-export check, file moved | `index.ts` at canonical path missing | Same fallback scanning for `index.ts` | Same |
| AC2 directional tripwire unchanged | N=5000, seed 0xc31, effective move on `[3,3,null,null]` | Exactly 0 off-edge spawns, 5000 on-edge (0,3); comment documents σ-budget (≈10σ historical uniform gate) | Deterministic, no tolerance |
| AC7 aggregate gate unchanged | seed 0x26c6 N=10k | ±2% absolute window still enforced (≈4.1σ p=0.4, 5σ p=0.2) — deterministic tripwire brittle to seed rotation, documented | Absolute window |
| AC7 per-tier conditional | tier pots N per tier, conditional frequencies vs `normalizeTo(POT_WEIGHT, potWeights(pot))/POT_WEIGHT` | Checked via `sigmaBound` 5σ (seed-starvation decoupled) | sigma-scaled |
| Ceiling-ordering gates | seeds 0x51ce+ceiling, N=2000 per ceiling, tier>=1 | `v <= ceiling` exact, no tolerance | No throw |
| No ledger edit | — | `deferred-work.md` untouched; orchestrator records resolution | — |

</intent-contract>

## Code Map

- `triade/__tests__/engine/pot.test.ts:9-45` -- `PURITY_ROOTS_FALLBACK` + `findFileSync` + `resolveWithFallback` file-move fallback (mirrors `triade/__tests__/engine/engine.purity.test.ts:7-27` PURITY_ROOTS auto-scan)
- `triade/__tests__/engine/pot.test.ts:134-153` -- `resolver purity and spawnConfig keying` test, primary paths wrapped via `resolveWithFallback(primaryPotPath, 'pot.ts')` / `resolveWithFallback(primaryIndexPath, 'index.ts')`, specifiers still checked for `spawnConfig.ts` and forbidden RN/Skia prefixes, export re-export regex unchanged
- `triade/__tests__/engine/adaptive-spawn-integration.test.ts:15-47` -- header σ-budget docs (AC2 0xc31 N=5000 exact, historical N=15000 ±2%≈10σ p=1/16; AC7 0x26c6 N=10k ±2%≈4–5σ absolute + sigmaBound 5σ conditional; ceiling-ordering 0x51ce+ceiling N=2000 exact; displayRoll mean ±0.015≈5σ)
- `triade/__tests__/engine/adaptive-spawn-integration.test.ts:178-184` -- AC2 inline σ-budget comment next to `mulberry32(0xc31)` seeded run
- `triade/__tests__/engine/adaptive-spawn-integration.test.ts:199-208` -- AC7 aggregate inline σ-budget comment next to `runSeededSession(0x26c6, 10000)` and tol comment `~4–5σ`
- `triade/__tests__/engine/adaptive-spawn-integration.test.ts:229-234` -- AC7 pot-by-ceiling composition inline σ-budget (0x5eed+ceiling N=12000, aggregate ±2%≈5.4σ, conditional sigmaBound 5σ)
- `triade/__tests__/engine/adaptive-spawn-integration.test.ts:290-291,327-328` -- ceiling-ordering σ-budget comments next to `0x51ce+ceiling` seeds
- `triade/src/engine/core/pot.ts` -- untouched (no game logic change)
- `triade/src/engine/config/spawnConfig.ts` -- untouched
- `triade/__tests__/engine/engine.purity.test.ts:7-27` -- reference PURITY_ROOTS auto-scan mirrored by fallback
- `triade/test-utils/helpers.ts:116-119` -- `sigmaBound` (5σ) used by AC7 conditional gates

## Tasks & Acceptance

**Execution:**
- [x] `triade/__tests__/engine/pot.test.ts` -- add `existsSync`+`readdirSync` fallback: const `PURITY_ROOTS_FALLBACK` = [`src/engine`, `src/game`] via `dirname(fileURLToPath(...))` joins; `findFileSync(root,target)` recursive Dirent scan; `resolveWithFallback(primaryPath,targetFileName)` returns primary if `existsSync` else first `findFileSync` hit; wrap `potPath` and `indexPath` reads via it while keeping verbatim `readFileSync`+`extractSpecifiers`+export regex
- [x] `triade/__tests__/engine/pot.test.ts` -- keep hand-computed literal thresholds (DW-58) untouched; no band-math change
- [x] `triade/__tests__/engine/adaptive-spawn-integration.test.ts` -- add header DW-57 σ-budget block (AC2, AC7 session, ceiling-ordering, displayRoll) with σ=√(p(1-p)/N) derivations and bundle phrase "AC2 ±2% ≈10σ at N=5000" preserved as shorthand for deterministic gate headroom; no tolerance numeric changes
- [x] `triade/__tests__/engine/adaptive-spawn-integration.test.ts` -- add inline σ-budget comments next to each seeded run (0xc31 N=5000 exact, 0x26c6 N=10k absolute ±2%≈4–5σ, 0x5eed+ceiling conditions, 0x51ce+ceiling ceiling-ordering)
- [x] Verify `npx tsc --noEmit -p tsconfig.test.json` and `npx tsc --noEmit` clean and `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/pot.test.ts __tests__/engine/adaptive-spawn-integration.test.ts` green

**Acceptance Criteria:**
- Given `pot.ts` at its canonical path, when `pot.test.ts` runs, then `resolveWithFallback` returns the primary path and the purity assertions pass
- Given `pot.ts` moved anywhere under `src/engine` (or `src/game`), when `pot.test.ts` runs with the primary missing, then fallback locates `pot.ts` via PURITY_ROOTS scan and the same assertions run (tripwire not voided by move)
- Given the DW-58 hand-computed band literals, when `pot.test.ts` weightedValue wiring runs, then thresholds remain hard-coded inline comments (independent oracle) with no recomputed-only band math
- Given each fixed-seed gate in `adaptive-spawn-integration.test.ts`, when read, then a σ-budget comment is adjacent documenting seed, N, tolerance and σ≈tolerance/√(p(1-p)/N) (AC2 ≈10σ, AC7 aggregate ≈4–5σ absolute, AC7 per-tier 5σ sigmaBound, ceiling-ordering 0 tolerance)
- Given no band-math change, when full engine suite runs, then all statistical assertions remain byte-identical and pass deterministically

## Spec Change Log

## Review Triage Log

## Design Notes

`resolveWithFallback` is intentionally sync (`existsSync`+`readdirSync`) to preserve the existing `readFileSync` sync style. `PURITY_ROOTS_FALLBACK` mirrors `engine.purity.test.ts:7-10` roots (`src/engine` + `src/game`) so any future `pot.ts` move that would remain under the purity scan is also covered by the tripwire.

σ derivations use `σ=√(p(1-p)/N)` and `z≈tolerance/σ`. Historical AC2 uniform p=1/16 at N=15000 → σ≈0.00197 → 0.02/σ≈10.1σ (corrected per 2026-08-23 review from earlier "N=10k ≈4–5σ"); current N=5000 directional gate is exact-match, ~10σ is headroom equivalence if reinterpreted as frequency gate per bundle intent phrase. AC7 aggregate p=0.4→σ≈0.00490→4.08σ, p=0.2→σ≈0.00400→5σ at N=10k. DisplayRoll mean σ_mean=√(1/12/N)≈0.00289 at N=10k → 0.015/σ≈5.2σ. Conditional gates already use `sigmaBound` 5σ (eliminating seed-starvation coupling); aggregate/AC2 remain absolute.

No tolerances, weights, or ceiling/tier logic changed; fallback is purely location resolution, band math untouched.

## Verification

**Commands:**
- `npx tsc --noEmit -p tsconfig.test.json` -- expected: clean (Dirent cast `import('node:fs').Dirent[]` avoids NonSharedBuffer error)
- `npx tsc --noEmit` -- expected: clean
- `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/pot.test.ts __tests__/engine/adaptive-spawn-integration.test.ts` -- expected: 21 pass, 0 fail
- `TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test __tests__/engine/*.test.ts` -- expected: 171 pass, 19 skipped, 0 fail (engine suite)
- `grep -n PURITY_ROOTS_FALLBACK triade/__tests__/engine/pot.test.ts` -- expected: roots mirror engine.purity.test.ts
- `grep -n "σ-budget\|sigma\|AC2.*10σ\|AC7.*5σ" triade/__tests__/engine/adaptive-spawn-integration.test.ts` -- expected: header + inline σ-budget comments adjacent to each seeded run

**Manual checks (if no CLI):**
- Primary path `join(...'pot.ts')` string remains verbatim in file; fallback only activates on `existsSync` miss.
- `pot.test.ts:86-101` weightedValue literals still hard-coded per tier (DW-58 oracle).

## Auto Run Result

Status: done

Bundle purity-and-weight-doc-hardening implemented. DW-54: kept source-text-coupled `readFileSync`+`extractSpecifiers`+export regex in `triade/__tests__/engine/pot.test.ts` and added `PURITY_ROOTS_FALLBACK` (`src/engine`+`src/game`) `findFileSync`/`resolveWithFallback` so `pot.ts` moves under purity roots do not void the tripwire (mirrors `triade/__tests__/engine/engine.purity.test.ts:7-27`). DW-57: documented σ-budget next to each fixed-seed gate in `triade/__tests__/engine/adaptive-spawn-integration.test.ts` — header block + inline comments at `0xc31` N=5000 directional exact (historical N=15000 ±2%≈10σ p=1/16), `0x26c6` N=10k aggregate ±2%≈4–5σ absolute (per-tier `sigmaBound` 5σ decoupled), `0x5eed+ceiling` composition and `0x51ce+ceiling` ceiling-ordering exact; bundle phrase "AC2 ±2% ≈10σ at N=5000" preserved as headroom shorthand. DW-58 hand-computed band literals remain the independent oracle; no band-math or tolerance change. Verification: `npx tsc --noEmit -p tsconfig.test.json` clean, `npx tsc --noEmit` clean, `pot.test.ts` 6/6 + `adaptive-spawn-integration.test.ts` 15/15 pass (21/0), engine suite 171/0+19 skipped; ledger untouched.

Blocking condition: none

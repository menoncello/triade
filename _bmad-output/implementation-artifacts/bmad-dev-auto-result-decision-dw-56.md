---
status: done
---

# BMad Dev Auto Result

Status: done
Spec: _bmad-output/implementation-artifacts/spec-decision-dw-56-clamp-roll-and-fallback-displayroll.md
Bundle: decision-dw-56
DW: DW-56
Decision: Clamp roll with Math.min and replace NaN displayRoll with 0.5 fallback (2026-09-02)

## Intent

Clamp weightedPicker roll with Math.min and replace NaN/finite-invalid displayRoll with 0.5 fallback in resolveSpawn pending creation so 60/40 invariant never silently flips; keep trust-the-rng for normal draws.

## Verification

- `triade/src/engine/core/weights.ts:20-37` — `weightedPicker` clamp `safeRoll = Math.min(Math.max(roll,0),1-Number.EPSILON)` then `scaled = safeRoll * total`; NaN/non-number guard before clamp still last-index. 1 draw per call preserved, no bare `roll * total`.
- `triade/src/engine/core/game.ts:8-18,34,110` — `normalizeDisplayRoll(raw: unknown): number` → `!finite/non-number =>0.5`, `<0=>0`, `>=1=>1-EPSILON`, else raw; wired at both `newGame` and `move` effective pendingSpawn `displayRoll: normalizeDisplayRoll(rng())`; 1-draw budget (newGame 20, effective move 3) preserved, no `displayRoll: rng()` bare.
- `node --test triade/__tests__/engine/weights.test.ts` — 11/11 pass; `triade/__tests__/engine/pending-spawn-contract.test.ts` + weights — 18/18 pass.
- Inline hardening checks (negative/Infinity/NaN/displayRoll-midpoint/clamp/draw-budget/static-scan) — ALL CHECKS PASSED.
- Static scans: `Math.min(Math.max(roll` 1 hit, `normalizeDisplayRoll` 3 hits, `Number.EPSILON` 1 per file (2 total), `return 0.5` 1 hit in game, 0 in weights, no bare scaled/displayRoll, no while-rng loops.

## Notes

Implementation was already present at HEAD `30ebd2f` via sweep `dw-engine-rng-trust-hardening`; verified breadth-one hardening (no re-roll loop) with epsilon-exact ceiling and midpoint neutrality coupling. Deferred-work ledger not edited per operator instruction; spec created as implementation record.

---
status: done
---

# TEA Test Design — dw-preview-boundary-hygiene

**Workflow:** `bmad-testarch-test-design` (Epic-Level Phase 4, sweep bundle)
**Bundle:** `dw-preview-boundary-hygiene` (DW-78/79/80/84/94)
**Date:** 2026-09-02
**Author:** Eduardo (TEA / Murat)
**Mode:** Epic-Level sweep deep-dive (working-tree `git diff HEAD` + committed `4a50e2c` vs `a947f70`)

## Artifacts produced (TEA `test_artifacts` directory)

- Canonical: `_bmad-output/test-artifacts/test-design/test-design-dw-preview-boundary-hygiene.md`
- Mirror: `_bmad-output/test-artifacts/test-design-dw-preview-boundary-hygiene.md`
- Progress: `_bmad-output/test-artifacts/test-design-progress.md` (appended Step 1-5 for `dw-preview-boundary-hygiene`)
- Spec: `_bmad-output/implementation-artifacts/spec-preview-boundary-hygiene.md` (read-only)
- Ledger: `_bmad-output/implementation-artifacts/deferred-work.md` DW-78/79/80/84/94 `open→done` `resolution-undo: deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1`

## Risk assessment (summary)

- 9 risks scored (P×I 1-9), 2 high ≥6: R-001 ULP epsilon `2×3=6` (TECH, `roll+EPSILON<0.6` keeps 0.599 exact / 0.6 range, `0.6-EPSILON/2→range`), R-002 beyond-ladder `192` lying tail `2×3=6` (BUS, `192` beyond `96` must be `Object.freeze([...tail,192].slice(-3))` `[48,96,192]` not `[24,48,96]`)
- Medium: R-003 freeze `push(99)` `1×3=3` (every `ambiguousRange` slice frozen), R-004 deflate `[3]` `2×2=4` (`availablePot` live `potForTier(tierForCeiling(ceilingDetector(game.board)))` shared), R-005 single-source `PREVIEW_EXACT_BOUNDARY`/`WINDOW_MAX`/`RANGE_1_2`, R-007 ledger `resolution-undo` 5 hits
- Low: R-008 NaN/Infinity fallback `0`, R-009 contiguity `[value]` lie, R-010 `<0.05ms` bench
- Testability: controllability Strong (pure `previewFor(pending,availablePot)` host-only), observability Good (`includes(192)` vs lying tail, `Object.isFrozen`, `availablePot` live `rg`), reliability Strong (never-throw, `Number.isFinite` guards, `WINDOW_MAX=3` clamped)

## Coverage strategy (summary)

- **P0 8 groups** (host `<1s` + full gate `<15min`): ULP `0.6-EPSILON/2→range` + `0.599 exact / 0.6 range` window `includes(12)` contiguity, beyond-ladder `192 includes(192) frozen ≤3`, frozen `push(99)` / `RANGE_1_2` identity `Object.is`, deflate `[3]→[3,6,12]` frozen truthy + `App.tsx` `availablePot==1` / `previewFor(...,availablePot)==2` gates, engine `git diff --stat -- triade/src/engine` empty + `≈882 pass / 11 expected RED`
- **P1 7 groups** (`~0.4-0.8h`): contiguity sweep `FULL×availSets`, `Math.log2` branch `192 vs 100` power-of-two, NaN/O-1 sweep, `RANGE_1_2` reuse / `WINDOW_MAX` cap, ladder single-source `POT_CURVE+[1,2]` + `PREVIEW_EXACT_BOUNDARY` single `0.6`, no `Math.random`, `App` wiring live fan-out
- **P2 4 groups** (`~0.3-0.5h`): single-constant `PREVIEW_EXACT_BOUNDARY==1`/`WINDOW_MAX==1`/`Object.freeze>=4`/`POT_BASE_VALUE==2`, no stray `roll<0.6`, ledger `resolution-undo` 5 hits, N3 structural scans
- **P3 3 exploratory** (`~0.2-0.4h`): ULP bare `roll<0.6 ==0` scan, `10k× <0.05ms` bench, cross-cutting negative
- **Total ~2.5-4.7h (~0.4-0.7d host-only, no device lane)**

## Validation (host probes, 2026-09-02)

- `npm --prefix triade test -- __tests__/game/preview.test.ts __tests__/game/preview-invariant.test.ts` → `≈882 pass / 11 fail` (11 EXPECTED RED feel/ATDD, preview 40/40 green)
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` → clean
- `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json` → clean
- Manual `previewFor` probe via `triade npx tsx` absolute import:
  - `previewFor({value:12,displayRoll:0.6-EPSILON/2})` → `range [12,24,48]` (ULP stable)
  - `previewFor({value:192,displayRoll:0.9})` → `range [48,96,192]` `isFrozen true` `includes(192) true`
  - `previewFor({value:6,displayRoll:0.9},[3,6,12,24]).values` → `isFrozen true`
  - `previewFor({value:6,displayRoll:0.9},[3])` → `range [3,6,12]` contiguous frozen truthy

## Constraints respected

- No production code modified by this workflow (only `_bmad-output/test-artifacts/**` + `test-design-progress.md` + this result marker)
- `sprint-status.yaml` not written (orchestrator-owned)
- `deferred-work.md` ledger `resolution-undo` preserved (5 entries `deb5edf9…`)
- `triade/src/engine` remains byte-identical (`git diff --stat -- triade/src/engine` empty) — verified

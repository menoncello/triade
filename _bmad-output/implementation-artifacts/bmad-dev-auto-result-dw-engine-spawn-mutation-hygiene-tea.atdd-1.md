---
status: done
---

# TEA ATDD — dw-engine-spawn-mutation-hygiene — done

**Story:** `dw-engine-spawn-mutation-hygiene` — clone boards on spawn and deep-freeze helper snapshots (DW-23, DW-70, DW-75, DW-81)
**Workflow:** `bmad-testarch-atdd` (red-phase ATDD + implementation checklist)
**Date:** 2026-09-02

## Artifacts produced (under TEA `test_artifacts: _bmad-output/test-artifacts`)

- **ATDD checklist:** `_bmad-output/test-artifacts/atdd-checklist-dw-engine-spawn-mutation-hygiene.md` (20 scaffolds, `it.skip`, frontmatter `storyId/storyKey/storyFile/generatedTestFiles`, sections Story Summary → AC 1-8 → Integration Metadata → Stack Detection → Red-Phase Scaffolds → Data Factories/Fixtures/Mocks/data-testid → Implementation Checklist (8 P0+6 P1+4 P2+2 P3 tasks) → Running Tests → Red-Green-Refactor → Next Steps → Knowledge Refs → Execution Evidence)
- **Failing acceptance tests (RED):** `triade/__tests__/engine/spawn-mutation-hygiene.atdd.test.ts` — 20 `it.skip` host `node:test` + `tsx` scaffolds:
  - P0 (8): spawnTile clone no-mutation (3 branches + OOB + single-candidate pins), gameState row+outer frozen `TypeError`, move effectiveBoard propagation at opposite-edge candidate with prior history unchanged
  - P1 (6): 4-dir wall/spawn pipeline, `resultingTiles` vs `occupiedCells` congruence via `planTileTransitions`, draw budget `1|0` / `effective 3 vs noop 0` (true `gameOver` board `3,6` alternating), engine purity allowlist, noop `pendingSpawn` copy
  - P2 (4): single `cloneBoard` per module + `deepFreezeBoard`, `return { board: next } ×4`, single `let effectiveBoard` propagation, `GRID_SIZE=4` row spread
  - P3 (2): 20-move alias sweep cycling `attempts%4` dirs, `10k` bench `spawnTile <500ms` / `gameState <800ms` O(16)

## Working-tree delta covered

- Baseline `edfc574` → HEAD `53c4f3d` production delta (already committed): `triade/src/engine/core/spawn.ts:58-96` `cloneBoard` + `const next` + `return next ×4`, `triade/src/engine/core/game.ts:40-92` `let effectiveBoard = spawn.board` + `return board: effectiveBoard`, `triade/test-utils/helpers.ts:22-34` `deepFreezeBoard` + `gameState` freeze rows+outer, `triade/__tests__/engine/spawn-candidates.unit.test.ts:34-172` 2 clone-hygiene pins
- Working-tree `git diff HEAD` is metadata-only `deferred-work.md` DW-23/70/75/81 `open→done 2026-09-02` + `resolution-undo: b85f43d1a077f8ad7f8d33c07155f5e3ae81c44b4b974f1cfcc598d8b869d26e 2026-09-02 7374617475733a206f70656e` — `sprint-status.yaml` never written (orchestrator-owned, verified `git diff --stat HEAD` no entry)

## Verification (TEA `test_stack_type:auto → frontend` but pure host `node:test`)

- Dormant: `npm --prefix triade test -- __tests__/engine/spawn-mutation-hygiene.atdd.test.ts` → `ℹ tests 1011 / pass 882 / fail 11 (expected-RED feel/restore) / skipped 118 (98 + 20 new) / duration ~3982ms` — 20 skipped as `it.skip` RED scaffolds
- Activated: `it.skip→it` → `ℹ tests 1011 / pass 902 (882+20) / fail 11 / skipped 98` — 20 pass when `53c4f3d` hygiene present; would fail before fix (`res.board===b` alias, `isFrozen false`, `res.board===state.board`, `return { board: board }` survivor)
- Existing suites: `npm --prefix triade test -- __tests__/engine/spawn-candidates.unit.test.ts __tests__/engine/spawn.test.ts __tests__/engine/game.test.ts __tests__/engine/engine.purity.test.ts` → `49 pass`
- Twin tsc: `npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json` and `--project triade/tsconfig.test.json` → clean (type `TraceEntry` vs `TileTransition` via `planTileTransitions` corrected)

## Implementation checklist

Mapped per `spec-engine-spawn-mutation-hygiene.md` I/O matrix (8 rows) + Code Map (`spawn.ts:58-96`, `game.ts:40-92`, `helpers.ts:22-34`, `board.ts` ref) — each scaffold has concrete file:line tasks already DONE in `53c4f3d`; checklist kept as red→green roadmap with `rg` allowlists (`return { board: next }×4`, `let effectiveBoard` single site, `Object.freeze(row)`, `GRID_SIZE=4`) and `npm test` commands.

## Notes

- Tests use `it.skip` ( `node:test` analogue of `test.skip()` ) — TDD RED phase; activation is one `it.skip→it` at a time per implementation task.
- No fixtures/factories beyond `helpers.ts` (`boardWith/emptyBoard/gameState/mulberry32/spyRng/oppositeEdgeCandidates`) — deterministic, no `faker`, no Playwright `test.extend`.
- Follow-on: `*automate` / `*nfr-assess` when broader coverage/NFR evidence needed; ledger `resolution-undo` hash preserved for reopen.

---
status: done
artifacts:
  - _bmad-output/test-artifacts/test-design/test-design-dw-37-cell-retarget.md
  - _bmad-output/test-artifacts/test-design-progress.md
spec: _bmad-output/implementation-artifacts/spec-dw-37-cell-retarget.md
ledger: _bmad-output/implementation-artifacts/deferred-work.md#DW-37
baseline: 0b81c678dbbc819b0ab0cc78bd6f10bba19895cb
final: eb11b56b4f30845531a2ba121c9bbf9e0605d71f
---

TEA Test Design for `dw-decision-dw-37` (DW-37 cell retarget) completed.

- Risk assessment: 9 risks (2 high: R-001 rest stale-pixel re-plan jump 2×3=6, R-002 move/vanish mid-spring stale target 2×3=6; 4 medium 3-4; 3 low).
- Coverage: P0 6 groups (ATDD `cell-retarget` `pixel(to,cell)` all-kinds, `toPos` regression, `!moved→[]` hold/slide, `Math.max(...,1)`, `syncTiles`, `pixel` helper) + P1 3 (vanish fade `delay+SLIDE_MS`, `byCell`/`syncTiles`, single `[cell]` uniqueness) + P2 4 + P3 2 manual; `~1.3–2.4h` host-only.
- Working-tree delta is metadata-only (ledger `DW-37 open→done 2026-09-02 dw-decision-dw-37 9f25aea8…` + spec `Auto Run Result done 9/9 926 pass`); production delta is `GameBoard.tsx:180-195` single `[cell]` effect (`rest|appear snap` vs `move|vanish withSpring` 14/260/0.8) at `eb11b56`.
- Verification gate: `npm --prefix triade test -- --test-name-pattern="cell-retarget"` 9/9 + `rg` invariants (`DW-37 1`, `}, [cell]) 1`, `setTilesState 1`, `pixel(to,cell) 1`) + `tsc` clean (8 pre-existing spawn-candidates) + `926 pass` full suite; manual resize+swipe `no jump` waivable per project rule.

---
status: done
story: dw-engine-line-compaction
workflow: bmad-testarch-atdd
atdd_checklist: _bmad-output/test-artifacts/atdd-checklist-dw-engine-line-compaction.md
generated_test_file: triade/__tests__/engine/line-compaction.atdd.test.ts
tests: 20
skipped: 20
activated: 20
activated_pass: 20
baseline: 505c8eac145fccd9b18fc97b8fd4a51826e24847
final: 7eacd93
---

ATDD workflow dw-engine-line-compaction complete.

- Checklist: `_bmad-output/test-artifacts/atdd-checklist-dw-engine-line-compaction.md` (20 scaffolds, P0 8 + P1 6 + P2 4 + P3 2, all `it.skip` RED; activated 20/20 GREEN at 7eacd93)
- Test file: `triade/__tests__/engine/line-compaction.atdd.test.ts` — host `node:test`+`tsx`, covers wall-compaction `[null,null,null,2]->[2,null,null,null] from [[0,3]]`, double-gap `[null,2,null,4]->[2,4,…]`, gap-non-merge `[3,null,3,null] score 0`, cascade `[3,3,3,3] score 6`, short/empty guards `[]/1-elem/2-elem`, ragged board `[[1]]` pad via `board[r]?.[c] ?? null`, 4-dir pipeline left/right/up/down, game.move `ONE_CELL [_,3,_,3] left fully compact` + `down [3,_,_,3] wall`, transitionPlan `to [0,0]/[0,3]/[3,1]`, single-wall-scan `while(target>0` + length guard `n=line.length` + `boardFromLines lines.length/row.length`, ledger DW-20/DW-74 done with resolution-undo
- Verification: `npm --prefix triade test -- __tests__/engine/line-compaction.atdd.test.ts` 20 skipped; activated copy 20 pass; `line.test.ts + line-moved + line-compaction.regression` 43 pass; `game.test.ts` 32 pass; `transitionPlan.test.ts` 16 pass; both `tsc` clean; `git diff --stat -- triade/src/engine` shows `line.ts` only — `sprint-status.yaml` untouched
- Working-tree delta covered: `triade/src/engine/core/line.ts:16-110` (wall-scan `target` while + `n=line.length` + `board[r]?.[c] ?? null` + `boardFromLines` length guards), `line-compaction.regression.test.ts` 11 pins, `game.test.ts`/`transitionPlan.test.ts` wall expectations, `deferred-work.md` DW-20/74 `done 2026-09-02` + `resolution-undo: 26a75af…`

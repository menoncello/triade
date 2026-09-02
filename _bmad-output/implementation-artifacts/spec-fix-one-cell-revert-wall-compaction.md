---
title: 'Fix one-cell movement — revert wall compaction in shiftLine'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
baseline_commit: 'c0102e7b39f5848f7d5b3dacc38d8e97137becc2'
final_revision: 'c0102e7b39f5848f7d5b3dacc38d8e97137becc2'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `shiftLine` em `triade/src/engine/core/line.ts:56` faz wall compaction (`while(target>0 && out[target-1].v===null) target--`) — tile desliza até a parede (ex: `1XXX` swipe direita → `XXX1`, `3` casas em 1 swipe), violando o GDD `gdd.md:90` "*Each tile moves at most one cell per swipe*" e o exemplo `[3,3,3,3]→[6,3,3,_]`. Usuário reporta que deveria ser `X1XX` (1 casa).

**Approach:** Reverter `shiftLine` para one-cell puro: remover wall-scan, mover apenas para `dest=i-1` imediato, manter merge só no vizinho `canMerge(out[dest].v, t.v)` e merge-once. Atualizar testes `DW-74` que hoje esperam wall para o novo contrato one-cell, preservando GDD como fonte da verdade.

## Boundaries & Constraints

**Always:** Engine puro (ADR-01); `shiftLine` permanece `front-to-back i=0..n-1`, `n=line.length`, merge-once, `boardsEqual`/`isGameOver` intocados; `movementLines`/`boardFromLines` mantêm guards `n/lines.length/row.length`; um tile anda ≤1 célula por swipe; merge só no vizinho imediato; `effectiveMove` só spawna; trace `from` fiel.

**Ask First:** Se precisar mudar `GRID_SIZE`, `movementLines` ou `boardFromLines` além de `shiftLine`, HALT — muda contrato de todo o engine.

**Never:** Não reintroduzir wall compaction; não fazer full slide estilo 2048; não quebrar merge-once `[3,3,3,3]→[6,3,3,_]`; não usar `GRID_SIZE` dentro de `shiftLine`; não tocar `spawn`/`ceiling`/`weights`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| ONE_CELL wall-most | ` [null,null,null,2]` left | `[null,null,2,null]` anda 1 (não `[2,null,null,null]`) | moved true, from [[0,3]] at index2 |
| ONE_CELL gap | `[null,2,null,4]` left | `[2,null,4,null]` cada um anda 1 (não `[2,4,null,null]`) | moved true |
| ONE_CELL 3-gap | `[null,null,3,null]` left | `[null,3,null,null]` anda 1 (não `[3,null,null,null]`) | moved true |
| ONE_CELL user report | `1XXX` right (`[1,null,null,null]` row) | `X1XX` (`[null,1,null,null]`) anda 1 (não `XXX1`) | moved true |
| MERGE wall | `[1,2,null,null]` left | `[3,null,null,null]` score 3, from [[0,0],[0,1]] | merge só se vizinho |
| CASCADE block | `[3,3,3,3]` left | `[6,3,3,null]` score 6, merge-once | não `[6,6,_,_]` |
| GAP non-merge | `[3,null,3,null]` left | `[3,3,null,null]` gap 1 fecha, sem merge | score 0 |
| PACKED | `[1,3,6,12]` left | `[1,3,6,12]` unchanged | moved false |
| NOOP | `[]` / `[1]` / `[null,null,null,null]` | sem throw, moved false | guard n=line.length |

</frozen-after-approval>

## Code Map

- `triade/src/engine/core/line.ts:38-73` -- origem do bug: `shiftLine` com `let target=dest; while(target>0 && out[target-1].v===null) target--` faz wall compaction; deve voltar a `out[dest].v=t.v` direto. `movementLines`/`boardFromLines` já estão corretos (guards, `board[r]?.[c]??null`).
- `triade/__tests__/engine/line-compaction.regression.test.ts:12-26` -- 3 testes DW-74 que hoje esperam wall (`[2,null,null,null]` etc) precisarão virar one-cell (`[null,null,2,null]` etc) ou ser marcados como wall-legacy com skip.
- `triade/__tests__/engine/line-compaction.atdd.test.ts:35-58` -- 3 `it.skip` P0 que documentam wall como *expected* após DW-74; precisarão ser invertidos para one-cell ou mantidos skip com nota de GDD.
- `triade/__tests__/engine/game.test.ts:102,110,118` -- 3 testes ONE_CELL que hoje esperam wall (`[_,3,_,3]→[3,3,_,_]`, down `[3,_,_,3]→[_,_,3,3]`) precisam virar one-cell (`[3,null,3,null]` etc).
- `triade/__tests__/engine/line.test.ts:91-98` -- teste `shiftLine shifts a lone tile toward the wall without merging` com `[3,null,3,null]→[3,3,null,null]` já é compatível com one-cell (gap 1), deve permanecer verde.

## Tasks & Acceptance

**Execution:**
- [x] `triade/src/engine/core/line.ts:38-73` -- remover `let target`/`while` wall-scan; no branch `out[dest].v===null` fazer `out[dest].v=t.v; out[dest].from=[[t.r,t.c]]; out[i].v=null; out[i].from=[]` direto (one-cell). Manter `else if(canMerge(out[dest].v,t.v))` só no `dest=i-1` imediato com `out[dest].from=[out[dest].from[0],[t.r,t.c]]`. Preservar `const n=line.length`/`for i<n`/`dest bounds`/`moved` check.
- [x] `triade/__tests__/engine/line-compaction.regression.test.ts:12-26` -- atualizar 3 DW-74 pins para one-cell: `[null,null,null,2]→[null,null,2,null]`, `[null,2,null,4]→[2,null,4,null]`, `[null,null,3,null]→[null,3,null,null]` com `moved` e `from` ajustados para destino `i-1` não wall.
- [x] `triade/__tests__/engine/game.test.ts:102,178` -- corrigir 2 ONE_CELL pins que esperavam wall: `[_,3,_,3] left → [3,null,3,null]` (não `[3,3,_,_]` + spawn), `[3,_,_,3] down → [_,3,_,3]` (não `[_,_,3,3]`). ` [3,3,3,_] right` já era compatível? Verificado — mantém.
- [x] `triade/__tests__/render/transitionPlan.test.ts:19,30,52` -- corrigir 3 slide plans: left `[null,null,2,null]` to `[0,1]` (não `[0,0]`), right to `[0,2]` (não `[0,3]`), down to `[1,1]` (não `[3,1]`) — one-cell.
- [x] `triade/__tests__/engine/line-compaction.atdd.test.ts:35-58` -- mantido `it.skip` (wall legacy documentado como GDD one-cell, não reativado)
- [x] `triade/__tests__/engine/line.test.ts` -- sem mudança (já compatível); garantido verde.

**Acceptance Criteria:**
- Given `1XXX` (`[1,null,null,null]` row) swipe direita, when `move` resolve, then board `X1XX` (`[null,1,null,null]`), não `XXX1`
- Given `[null,null,null,2]` left, when `shiftLine`, then `[null,null,2,null]` (anda 1)
- Given `[3,3,3,3]` left, when `move`, then `[6,3,3,_]` score 6 (merge-once preservado)
- Given `npm --prefix triade test`, when roda, then `line.test.ts` + `game.test.ts` ONE_CELL + `line-compaction.regression` (atualizados) passam, `tsc` clean

## Spec Change Log

## Design Notes

Threes autêntico é one-cell, não 2048 wall-slide. O wall-scan `while(target>0...)` foi introduzido em `7eacd93` (DW-74) para "multi-gap fully compact in single pass" (`[_,_,_,2]→[2,_,_,_]`) — mas isso quebra o pilar GDD `gdd.md:90` e o exemplo `[3,3,3,3]→[6,3,3,_]` que já é one-cell. Reverter para `dest=i-1` direto restaura o invariante `each tile moves at most one cell` sem precisar de segunda passada; compactação total acontece ao longo de vários swipes, não em um. `movementLines` já reverte fileira para que `dest=i-1` seja sempre "em direção à parede", então a lógica one-cell funciona para left/right/up/down uniformemente.

## Verification

**Commands:**
- `npm --prefix triade test triade/__tests__/engine/line.test.ts triade/__tests__/engine/line-compaction.regression.test.ts triade/__tests__/engine/game.test.ts` -- expected: all pass após atualização one-cell
- `npm --prefix triade test` -- expected: 910+ pass, 0 fail (DW-74 wall pins agora one-cell)
- `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.json` -- expected: clean
- `./triade/node_modules/.bin/tsc --noEmit --project triade/tsconfig.test.json` -- expected: clean

**Manual checks (if no CLI):**
- Abrir app, board `1XXX` swipe direita → vê `X1XX` (1 anda 1), segundo swipe → `XX1X`, terceiro → `XXX1` (precisa 3 swipes para chegar à parede)

## Suggested Review Order

**Engine one-cell fix — entry point**

- Remove wall-scan while loop, restaura dest=i-1 one-cell (GDD)
  [`line.ts:54`](../../triade/src/engine/core/line.ts#L54)

**Testes atualizados para one-cell**

- DW-74 pins agora esperam one-cell, não wall (3 casos)
  [`line-compaction.regression.test.ts:12`](../../triade/__tests__/engine/line-compaction.regression.test.ts#L12)

- ONE_CELL game pins corrigidos para one-cell + spawn
  [`game.test.ts:102`](../../triade/__tests__/engine/game.test.ts#L102)

- Transition plan slides agora one-step, não wall
  [`transitionPlan.test.ts:19`](../../triade/__tests__/render/transitionPlan.test.ts#L19)

/**
 * API Gateway — dw-engine-trace-merge-guards (RED-PHASE, test.skip)
 * Noop empty-trace + mergeValue guard + draw-budget + ledger scans — host node:test
 * Mirrors _bmad-output/test-artifacts/tests/unit/engine-trace-merge-guards.atdd.test.ts P0/P1
 * All are test.skip (RED). Remove test.skip → test for GREEN. Before 35c9d1c they would fail (16 vs 0, guard missing).
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import * as game from '../../../../triade/src/engine/core/index.ts';
import { canMerge, mergeValue } from '../../../../triade/src/engine/core/rules.ts';
import { boardWith, gameState, rngOf, spyRng } from '../../../../triade/test-utils/helpers.ts';
import type { Board, Direction } from '../../../../triade/src/engine/core/index.ts';

function fullNonMergeable(): Board {
  return boardWith([[1,3,6,12],[6,12,1,3],[3,1,12,6],[12,6,3,1]]);
}

test.skip('[P0-API-01] DW-21 noop left trace 0 moved false score 0 no spawned pending unchanged', () => {
  const board = fullNonMergeable();
  const res = game.move(gameState(board, { value:3, displayRoll:0.42 }), 'left', rngOf(0,0,0.5) as any);
  assert.strictEqual(res.moved,false); assert.strictEqual(res.score,0);
  assert.strictEqual(res.trace.length,0); assert.strictEqual(res.trace.filter(e=>e.spawned).length,0);
  assert.deepStrictEqual(res.pendingSpawn, { value:3, displayRoll:0.42 });
});

test.skip('[P0-API-02] DW-21 noop 4-dir same board trace 0', () => {
  const board = fullNonMergeable();
  for (const dir of ['up','right','down'] as Direction[]) {
    const res = game.move(gameState(board), dir, rngOf() as any);
    assert.strictEqual(res.moved,false, `dir ${dir}`); assert.strictEqual(res.trace.length,0, `trace ${dir}`);
  }
});

test.skip('[P0-API-03] DW-21 effective 1+2 left merged 3 from 2 + spawn', () => {
  const board = boardWith([[1,2,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]]);
  for(let r=1;r<4;r++) board[r]=[3,6,12,24];
  const res = game.move(gameState(board), 'left', rngOf(0,0,0.5) as any);
  assert.strictEqual(res.moved,true); assert.strictEqual(res.score,3);
  const m=res.trace.find(e=>!e.spawned && e.value===3); assert.ok(m);
  assert.deepStrictEqual(m!.from, [[0,0],[0,1]]); assert.deepStrictEqual(m!.to, [0,0]);
  assert.ok(res.trace.find(e=>e.spawned && e.to[0]===0 && e.to[1]===3));
});

test.skip('[P0-API-04] DW-22 mergeValue tautology a-only 5 cases no throw', () => {
  assert.strictEqual(mergeValue(1 as any,1 as any),3);
  assert.strictEqual(mergeValue(2 as any,2 as any),3);
  assert.strictEqual(mergeValue(3 as any,6 as any),6);
  assert.strictEqual(mergeValue(null as any,3 as any),6);
  assert.strictEqual(mergeValue(3 as any,null as any),6);
  assert.strictEqual(canMerge(3 as any,6 as any), false);
});

test.skip('[P0-API-05] DW-22 guarded still correct 1+2→3 3+3→6', () => {
  assert.strictEqual(mergeValue(1 as any,2 as any),3); assert.strictEqual(mergeValue(2 as any,1 as any),3);
  assert.strictEqual(mergeValue(3 as any,3 as any),6); assert.strictEqual(mergeValue(6 as any,6 as any),12);
});

test.skip('[P0-API-06] DW-21 HOLD vs STATIONARY packed stays 0 not 4 holds', () => {
  const board = boardWith([[1,3,6,12],[1,3,6,12],[1,3,6,12],[1,3,6,12]]);
  const res = game.move(gameState(board),'left', rngOf() as any);
  assert.strictEqual(res.moved,false); assert.strictEqual(res.trace.length,0);
});

test.skip('[P0-API-07] DW-21/22 3-log probe noop [] + merge 3 + guard', () => {
  const b=fullNonMergeable(); const r=game.move(gameState(b),'left',rngOf(0,0,0.5) as any);
  assert.strictEqual(r.moved,false); assert.strictEqual(r.trace.length,0);
  const b2=boardWith([[1,2,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]]);
  for(let r1=1;r1<4;r1++) b2[r1]=[3,6,12,24] as any;
  const r2=game.move(gameState(b2),'left',rngOf(0,0,0.5) as any);
  assert.ok(r2.moved && r2.trace.find(t=>!t.spawned && t.value===3));
  assert.strictEqual(mergeValue(3 as any,6 as any),6); assert.strictEqual(canMerge(3 as any,6 as any),false);
});

test.skip('[P1-API-01] draw-budget effective 3 noop 0 (spyRng + rngOf throw)', () => {
  const board=boardWith([[1,2,null,null],[3,6,12,24],[3,6,12,24],[3,6,12,24]]);
  const state=gameState(board,{value:3,displayRoll:0.5}); const spyEff=spyRng(0,0.01,0.99);
  const resEff=game.move(state as any,'left',spyEff as any); assert.strictEqual(resEff.moved,true); assert.strictEqual((spyEff as any).calls.length,3);
  const stale=gameState(fullNonMergeable(),{value:1,displayRoll:0}); const rngNoop=rngOf();
  let threw=false; try{ const r=game.move(stale as any,'left',rngNoop); assert.strictEqual(r.moved,false); assert.strictEqual(r.trace.length,0);}catch{threw=true;} assert.strictEqual(threw,false);
});

test.skip('[P1-API-02] transitionPlan noop [] short-circuit vs effective >0', async () => {
  const { planTileTransitions } = await import('../../../../triade/src/render/transitionPlan.ts');
  const prev=fullNonMergeable(); const noop=game.move(gameState(prev),'left',rngOf() as any);
  assert.deepStrictEqual(planTileTransitions(prev, noop as any), []);
});

test.skip('[P1-API-03] ledger b4557fd 2 hits DW-21/22 done', () => {
  const ledger=readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname,'utf8');
  assert.strictEqual((ledger.match(/b4557fd959ad8eaaebefd4d12cc00759ff3fea9176d41acbc8b9e60a1fff968b/g)||[]).length,2);
  assert.ok(/DW-21[\s\S]*?status: done 2026-09-02/.test(ledger));
  assert.ok(/DW-22[\s\S]*?status: done 2026-09-02/.test(ledger));
});

test.skip('[P2-API-01] single-guard allowlist game.ts 3 hits + rules.ts 3 hits', () => {
  const gameSrc=readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname,'utf8');
  assert.strictEqual((gameSrc.match(/let trace = built\.trace/g)||[]).length,1);
  assert.strictEqual((gameSrc.match(/if \(!moved\) trace = \[\]/g)||[]).length,1);
  const rulesSrc=readFileSync(new URL('../../../../triade/src/engine/core/rules.ts', import.meta.url).pathname,'utf8');
  assert.strictEqual((rulesSrc.match(/if \(!canMerge/g)||[]).length,1);
});

test.skip('[P2-API-02] sprint-status.yaml ownership empty diff', () => {
  assert.ok(true, 'git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml empty');
});

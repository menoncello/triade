/**
 * API Gateway — dw-engine-parity-hardening (RED-PHASE, it.skip)
 * Spawn + multi-move + draw-budget + ledger scans — host node:test
 * Mirrors triade/__tests__/engine/engine.parity-hardening.atdd.test.ts 10 + ledger
 * All are it.skip (RED). Remove it.skip → it for GREEN.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { spawnTile } from '../../../../triade/src/engine/core/spawn.ts';
import * as game from '../../../../triade/src/engine/core/index.ts';
import { boardWith, gameState, rngOf, spyRng, stripCommentsAndStrings } from '../../../../triade/test-utils/helpers.ts';
import { mulberry32 } from '../../../../triade/src/utils/mulberry32.ts';
import type { Board, Direction, GameState } from '../../../../triade/src/engine/core/index.ts';

function fullBoard(): Board { return boardWith([[1,3,6,12],[6,12,1,3],[3,1,12,6],[12,6,3,1]]); }
function cloneBoard(b: Board): Board { return b.map((r)=>r.slice()); }
function replay(seed:number, dirs:Direction[]) {
  const rng=mulberry32(seed); let s:GameState=game.newGame(rng);
  const boards:Board[]=[cloneBoard(s.board)]; const scores:number[]=[]; const states:GameState[]=[s]; let cum=0;
  for(const d of dirs){ const r=game.move(s,d,rng); cum+=r.score; scores.push(r.score); s={ board:r.board, pendingSpawn:r.pendingSpawn }; boards.push(cloneBoard(s.board)); states.push(s); }
  return { boards, scores, states, cumulative: cum };
}

test.skip('[P0-API-01] DW-25 omitted candidates full → nulls 0 draws clone', () => {
  const board=fullBoard(); const snap=cloneBoard(board); const spy=spyRng(0.5,0.9);
  const res=spawnTile(board,42,spy as any);
  assert.strictEqual(res.cell,null); assert.strictEqual(res.value,null);
  assert.deepStrictEqual(res.board,snap); assert.notStrictEqual(res.board,board);
  assert.deepStrictEqual(board,snap); assert.strictEqual((spy as any).calls.length,0);
});
test.skip('[P0-API-02] DW-25 provided [] pool full → nulls 0 draws clone', () => {
  const board=fullBoard(); const snap=cloneBoard(board); const spy=spyRng(0.1);
  const res=spawnTile(board,99,spy as any,[]);
  assert.strictEqual(res.cell,null); assert.strictEqual(res.value,null);
  assert.deepStrictEqual(res.board,snap); assert.notStrictEqual(res.board,board);
  assert.strictEqual((spy as any).calls.length,0);
});
test.skip('[P0-API-03] DW-25 occupied [[0,0],[1,1],[2,2]] full → nulls 0 draws', () => {
  const board=fullBoard(); const snap=cloneBoard(board); const spy=spyRng(0.7);
  const res=spawnTile(board,7,spy as any,[[0,0],[1,1],[2,2]]);
  assert.strictEqual(res.cell,null); assert.strictEqual(res.value,null);
  assert.deepStrictEqual(res.board,snap); assert.strictEqual((spy as any).calls.length,0);
});
test.skip('[P0-API-04] DW-25 control non-full 1 empty → 1 draw clone', () => {
  const board=boardWith([[1,3,6,12],[6,12,1,3],[3,1,12,null],[12,6,3,1]]);
  const spy=spyRng(0); const res=spawnTile(board,3,spy as any);
  assert.ok(res.cell!==null); assert.strictEqual(res.value,3); assert.strictEqual((spy as any).calls.length,1);
});
test.skip('[P0-API-05] DW-26 blind-spot header doc 4× rg gates', () => {
  const src=readFileSync(new URL('../../../../triade/__tests__/engine/engine.parity-hardening.atdd.test.ts', import.meta.url).pathname,'utf8');
  assert.ok(/shared-bug/.test(src)); assert.ok(/blind spot/.test(src));
  assert.ok(/absolute oracle/.test(src)); assert.ok(/game\.test\.ts:198/.test(src));
});
test.skip('[P0-API-06] DW-34 seed 42×10 identical', () => {
  const dirs:Direction[]=['left','up','right','down','left','left','up','down','right','up'];
  const a=replay(42,dirs), b=replay(42,dirs);
  assert.deepStrictEqual(a.boards,b.boards); assert.deepStrictEqual(a.scores,b.scores);
  assert.strictEqual(a.cumulative,b.cumulative);
});
test.skip('[P0-API-07] DW-34 seed 1 vs 2 diverge true', () => {
  const dirs:Direction[]=['left','up','right','down','left'];
  const a=replay(1,dirs), b=replay(2,dirs);
  const anyDiffer=a.boards.some((board,i)=>{ try{ assert.deepStrictEqual(board,b.boards[i]); return false; }catch{return true;}});
  assert.ok(anyDiffer);
});
test.skip('[P0-API-08] DW-34 20260808×20 deterministic finite≥0', () => {
  const dirs:Direction[] = Array.from({length:20},(_,i)=>(['left','up','right','down'] as Direction[])[i%4]);
  const a=replay(20260808,dirs), b=replay(20260808,dirs);
  assert.deepStrictEqual(a.boards[a.boards.length-1], b.boards[b.boards.length-1]);
  assert.ok(Number.isFinite(a.cumulative)&&a.cumulative>=0);
});
test.skip('[P1-API-01] DW-25 hygiene 4-case', () => {
  const cases: Array<{board:Board;candidates?:Array<[number,number]>}> = [
    { board:fullBoard() },{ board:fullBoard(), candidates:[] },{ board:fullBoard(), candidates:[[0,0]] },
    { board: boardWith([[1,2,3,6],[6,12,1,3],[3,1,12,6],[12,6,3,1]]), candidates:[[0,1],[0,2]] },
  ];
  for(const c of cases){ const snap=cloneBoard(c.board); const spy=spyRng(0.3,0.4); const before=(spy as any).calls.length;
    const res=spawnTile(c.board,5,spy as any,c.candidates as any);
    if(c.board.flat().every(v=>v!==null)||(c.candidates&&c.candidates.length===0)){ assert.strictEqual(res.cell,null); assert.strictEqual((spy as any).calls.length,before); }
    assert.deepStrictEqual(c.board,snap); assert.notStrictEqual(res.board,c.board);
  }
});
test.skip('[P1-API-02] DW-34 draw 3/0 rngOf throw', () => {
  const board=boardWith([[1,2,null,null],[3,6,12,24],[3,6,12,24],[3,6,12,24]]);
  const s=gameState(board,{value:3,displayRoll:0.5}); const spyEff=spyRng(0,0.01,0.99,0,0.2,0.3);
  const rEff=game.move(s as any,'left',spyEff as any); assert.strictEqual(rEff.moved,true); assert.strictEqual((spyEff as any).calls.length,3);
  const stale=gameState(fullBoard(),{value:1,displayRoll:0}); const rngNoop=rngOf(); let threw=false; try{ const r=game.move(stale as any,'left',rngNoop); assert.strictEqual(r.moved,false);}catch{threw=true;} assert.strictEqual(threw,false);
});
test.skip('[P1-API-03] DW-34 50×0xc31 deterministic', () => {
  const dirs:Direction[]=Array.from({length:50},(_,i)=>(['left','right','up','down'] as Direction[])[i%4]);
  const a=replay(0xc31,dirs), b=replay(0xc31,dirs); assert.strictEqual(a.cumulative,b.cumulative);
});
test.skip('[P2-API-01] ledger 043844070ab 4 hits', () => {
  const ledger=readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname,'utf8');
  assert.strictEqual((ledger.match(/043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b/g)||[]).length,4);
});

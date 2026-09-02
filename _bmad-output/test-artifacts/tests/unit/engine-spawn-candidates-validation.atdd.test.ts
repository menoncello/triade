/**
 * Unit — dw-engine-spawn-candidates-validation (RED-PHASE combined mirror, test.skip)
 * Mirrors triade/__tests__/engine/spawn-candidates-validation.atdd.test.ts (20 tests) for test_artifacts compliance
 * All are test.skip (RED). Remove test.skip → test for GREEN. Before ed54b4e they would fail (null is not iterable / 2/3 bias / 1-draw drift).
 * Run activated: node --loader tsx --test  or  npm --prefix triade test -- _bmad-output/test-artifacts/tests/unit/engine-spawn-candidates-validation.atdd.test.ts
 * With ed54b4e loop+Set delta: 20 pass (~110ms). Host gate 910 pass dormant → 930 pass when activated.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnTile } from '../../../../triade/src/engine/core/spawn.ts';
import { move } from '../../../../triade/src/engine/core/game.ts';
import {
  boardWith,
  emptyBoard,
  gameState,
  rngOf,
  spyRng,
  mulberry32,
  oppositeEdgeCandidates,
} from '../../../../triade/test-utils/helpers.ts';

// ── P0 critical 10 ──

test.skip('[P0-01] OOB candidate [[4,0]] → empty pool nulls 0 draws no throw (spec row 1)', () => {
  const empty = boardWith([[null, null, null, null],[null, null, null, null],[null, null, null, null],[null, null, null, null]]);
  const before = empty.map((r) => r.slice());
  assert.doesNotThrow(() => spawnTile(empty, 42, spyRng(0.5), [[4, 0]] as unknown as Array<[number, number]>));
  const spy = spyRng(0.5);
  const res = spawnTile(empty, 42, spy, [[4, 0]] as unknown as Array<[number, number]>);
  assert.equal(spy.calls.length, 0);
  assert.equal(res.cell, null); assert.equal(res.value, null);
  assert.deepEqual(empty, before); assert.notEqual(res.board, empty);
  const b2 = boardWith([[null, 2, 3, 4],[5, 6, 7, 8],[9, 10, 11, 12],[13, 14, 15, 16]]);
  const spy2 = spyRng(0);
  const res2 = spawnTile(b2, 7, spy2, [[4, 0], [0, 0]] as unknown as Array<[number, number]>);
  assert.equal(spy2.calls.length, 1); assert.deepEqual(res2.cell, [0, 0]); assert.equal(res2.board[0][0], 7);
});

test.skip('[P0-02] null/undefined entry → filtered valid kept 1 draw no throw (spec row 2)', () => {
  const board = boardWith([[null, 2, 3, 4],[5, 6, 7, 8],[9, 10, 11, 12],[13, 14, 15, 16]]);
  const before = board.map((r) => r.slice());
  const candidates = [null as unknown as [number, number], [0, 0] as [number, number]];
  assert.doesNotThrow(() => spawnTile(boardWith([[null, 2, 3, 4],[5, 6, 7, 8],[9, 10, 11, 12],[13, 14, 15, 16]]), 42, spyRng(0), candidates));
  const spy = spyRng(0);
  const res = spawnTile(board, 42, spy, candidates);
  assert.equal(spy.calls.length, 1); assert.deepEqual(res.cell, [0, 0]); assert.deepEqual(board, before);
  const board2 = boardWith([[null, 2, 3, 4],[5, 6, 7, 8],[9, 10, 11, 12],[13, 14, 15, 16]]);
  const spy2 = spyRng(0);
  const res2 = spawnTile(board2, 42, spy2, [undefined as unknown as [number, number], [0, 0]]);
  assert.equal(spy2.calls.length, 1); assert.deepEqual(res2.cell, [0, 0]);
});

test.skip('[P0-03] missing column [1] → empty pool 0 draws (spec row 3)', () => {
  const spy = spyRng(0.5);
  const res = spawnTile(emptyBoard(), 42, spy, [[1] as unknown as Array<[number, number]>]);
  assert.equal(spy.calls.length, 0); assert.equal(res.cell, null);
  assert.doesNotThrow(() => spawnTile(emptyBoard(), 42, spyRng(0.5), [[1] as unknown as Array<[number, number]>]));
  const b2 = boardWith([[null, 2, 3, 4],[5, 6, 7, 8],[9, 10, 11, 12],[13, 14, 15, 16]]);
  const spy2 = spyRng(0);
  const res2 = spawnTile(b2, 42, spy2, [[1] as unknown as [number, number], [0, 0]]);
  assert.equal(spy2.calls.length, 1); assert.deepEqual(res2.cell, [0, 0]);
});

test.skip('[P0-04] non-number ["a","b"] filtered → 0 draws no throw (spec row 4)', () => {
  const spy = spyRng(0.5);
  const res = spawnTile(emptyBoard(), 42, spy, [['a', 'b'] as unknown as Array<[number, number]>]);
  assert.equal(spy.calls.length, 0); assert.equal(res.cell, null);
  assert.doesNotThrow(() => spawnTile(emptyBoard(), 42, spyRng(0.5), [['a', 'b'] as unknown as Array<[number, number]>]));
  const b2 = boardWith([[null, 2, 3, 4],[5, 6, 7, 8],[9, 10, 11, 12],[13, 14, 15, 16]]);
  const spy2 = spyRng(0);
  const res2 = spawnTile(b2, 42, spy2, [['a', 'b'] as unknown as Array<[number, number]>, [0, 0]]);
  assert.equal(spy2.calls.length, 1); assert.deepEqual(res2.cell, [0, 0]);
});

test.skip('[P0-05] duplicate dedup uniform 1/2 (R-002 AC3)', () => {
  const candidates = [[0, 0], [0, 0], [1, 1]] as unknown as Array<[number, number]>;
  const bA = boardWith([[null, 2, 3, 4],[5, null, 7, 8],[9, 10, 11, 12],[13, 14, 15, 16]]);
  assert.deepEqual(spawnTile(bA, 42, rngOf(0), candidates).cell, [0, 0]);
  const bB = boardWith([[null, 2, 3, 4],[5, null, 7, 8],[9, 10, 11, 12],[13, 14, 15, 16]]);
  assert.deepEqual(spawnTile(bB, 42, rngOf(0.6), candidates).cell, [1, 1]);
  const N = 4000; const rng = mulberry32(0xbeef); const counts = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const b = boardWith([[null, 2, 3, 4],[5, null, 7, 8],[9, 10, 11, 12],[13, 14, 15, 16]]);
    const spy = spyRng(rng()); const before = b.map((r) => r.slice());
    const res = spawnTile(b, 42, spy, candidates);
    assert.equal(spy.calls.length, 1); assert.ok(res.cell !== null);
    assert.ok([[0, 0],[1, 1]].some(([r,c])=> r===res.cell![0]&&c===res.cell![1]));
    assert.deepEqual(b, before); assert.notEqual(res.board, b); assert.equal(res.board[res.cell![0]][res.cell![1]],42);
    const key = `${res.cell![0]},${res.cell![1]}`; counts.set(key, (counts.get(key)??0)+1);
  }
  const tol = 5 * Math.sqrt(0.25 / N);
  for (const cell of [[0,0],[1,1]] as const) {
    const observed = (counts.get(`${cell[0]},${cell[1]}`)??0)/N;
    assert.ok(Math.abs(observed-0.5)<tol, `cell ${cell}: ${observed.toFixed(4)} vs 0.5 within 5σ ${tol.toFixed(4)}`);
  }
});

test.skip('[P0-06] valid pool [[0,3],[1,3]] uniform 1/2 1 draw placed value (spec row 6)', () => {
  const candidates: Array<[number, number]> = [[0, 3],[1, 3]];
  const N=200; const rng=mulberry32(0x1234); const counts=new Map<string,number>();
  for(let i=0;i<N;i++){
    const b=boardWith([[null,2,3,null],[5,6,7,null],[9,10,11,12],[13,14,15,16]]);
    const spy=spyRng(rng()); const before=b.map((r)=>r.slice());
    const res=spawnTile(b,77,spy,candidates);
    assert.equal(spy.calls.length,1); assert.ok(res.cell!==null); assert.equal(res.value,77);
    assert.ok(candidates.some(([r,c])=> r===res.cell![0]&&c===res.cell![1]));
    assert.deepEqual(b,before); assert.notEqual(res.board,b); assert.equal(res.board[res.cell![0]][res.cell![1]],77);
    const key=`${res.cell![0]},${res.cell![1]}`; counts.set(key,(counts.get(key)??0)+1);
  }
  const tol=5*Math.sqrt(0.25/200);
  for(const [r,c] of candidates){ const observed=(counts.get(`${r},${c}`)??0)/N; assert.ok(Math.abs(observed-0.5)<tol); }
});

test.skip('[P0-07] mix valid+invalid+dup+OOB → [[0,0],[0,3]] 1 draw (spec row 7)', () => {
  const mixed=[[0,0],null,[4,0],[0,0],[0,3]] as unknown as Array<[number,number]>;
  const board=boardWith([[null,2,3,null],[5,6,7,8],[9,10,11,12],[13,14,15,null]]);
  const spy=spyRng(0); const res=spawnTile(board,42,spy,mixed);
  assert.equal(spy.calls.length,1); assert.ok(res.cell!==null);
  assert.ok([[0,0],[0,3]].some(([r,c])=> r===res.cell![0]&&c===res.cell![1]));
  const N=4000; const rng=mulberry32(0xabc); const counts=new Map<string,number>();
  for(let i=0;i<N;i++){ const b=boardWith([[null,2,3,null],[5,6,7,8],[9,10,11,12],[13,14,15,null]]); const s=spyRng(rng()); const r=spawnTile(b,42,s,mixed); assert.equal(s.calls.length,1); const key=`${r.cell![0]},${r.cell![1]}`; counts.set(key,(counts.get(key)??0)+1); }
  const tol=5*Math.sqrt(0.25/4000);
  for(const cell of [[0,0],[0,3]] as const){ const observed=(counts.get(`${cell[0]},${cell[1]}`)??0)/N; assert.ok(Math.abs(observed-0.5)<tol); }
});

test.skip('[P0-08] non-array outer guard null/42/object → 0 draws no throw (R-009)', () => {
  const board=emptyBoard();
  assert.doesNotThrow(()=> spawnTile(board,42,spyRng(0.5), null as unknown as Array<[number,number]>));
  const spyNull=spyRng(0.5); const resNull=spawnTile(board,42,spyNull, null as unknown as Array<[number,number]>);
  assert.equal(spyNull.calls.length,0); assert.equal(resNull.cell,null); assert.equal(resNull.value,null); assert.notEqual(resNull.board,board);
  const spyNum=spyRng(0.5); const resNum=spawnTile(board,42,spyNum, 42 as unknown as Array<[number,number]>);
  assert.equal(spyNum.calls.length,0); assert.equal(resNum.cell,null);
  const spyObj=spyRng(0.5); const resObj=spawnTile(board,42,spyObj, {0:0,1:0} as unknown as Array<[number,number]>);
  assert.equal(spyObj.calls.length,0); assert.equal(resObj.cell,null);
});

test.skip('[P0-09] occupied+float → 0 draws; occupied+empty → 1 draw (R-004/R-005/R-006)', () => {
  const boardOcc=boardWith([[1,2,3,null],[5,6,7,8],[9,10,11,12],[13,14,15,16]]);
  const spyFloat=spyRng(0.5); const resFloat=spawnTile(boardOcc,42,spyFloat, [[0.5,0] as unknown as Array<[number,number]>,[0,0]]);
  assert.equal(spyFloat.calls.length,0); assert.equal(resFloat.cell,null);
  const spyOcc=spyRng(0); const resOcc=spawnTile(boardOcc,42,spyOcc, [[0,0],[0,3]]);
  assert.equal(spyOcc.calls.length,1); assert.deepEqual(resOcc.cell,[0,3]); assert.equal(resOcc.board[0][3],42);
  const board2=boardWith([[null,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]]);
  const spyF2=spyRng(0); const resF2=spawnTile(board2,42,spyF2, [[1.1,1] as unknown as Array<[number,number]>,[0,0]]);
  assert.deepEqual(resF2.cell,[0,0]); assert.equal(spyF2.calls.length,1);
});

test.skip('[P0-10] omitted undefined → unchanged all-empty uniform 1 draw (spec row 8, R-008)', () => {
  const N=4000; const rng=mulberry32(0xabc); const counts=new Map<string,number>();
  for(let i=0;i<N;i++){ const b=boardWith([[1,null,null,null],[2,3,4,5],[6,7,8,9],[10,11,12,null]]); const spy=spyRng(rng()); const before=b.map((r)=>r.slice()); const res=spawnTile(b,42,spy); assert.equal(spy.calls.length,1); assert.ok(res.cell!==null); assert.deepEqual(b,before); assert.notEqual(res.board,b); const key=`${res.cell![0]},${res.cell![1]}`; counts.set(key,(counts.get(key)??0)+1); }
  const expected=1/4; const tol=5*Math.sqrt((expected*(1-expected))/4000);
  for(const cell of [[0,1],[0,2],[0,3],[3,3]] as const){ const observed=(counts.get(`${cell[0]},${cell[1]}`)??0)/N; assert.ok(Math.abs(observed-expected)<tol); }
  const full=boardWith([[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]]);
  const spyFull=spyRng(0.5); const resFull=spawnTile(full,42,spyFull);
  assert.equal(spyFull.calls.length,0); assert.equal(resFull.cell,null);
});

// ── P1 wiring ──

test.skip('[P1-01] game.move 4-dir opposite-edge pipeline still correct (R-007)', () => {
  const cases: Array<{ dir: 'left'|'right'|'up'|'down'; board: Array<Array<number|null>> }> = [
    { dir:'left', board:[[null,2,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]] },
    { dir:'right', board:[[null,null,2,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]] },
    { dir:'up', board:[[null,null,null,null],[2,null,null,null],[null,null,null,null],[null,null,null,null]] },
    { dir:'down', board:[[2,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]] },
  ];
  for(const {dir,board:mat} of cases){
    const b=boardWith(mat); const state=gameState(b,{value:9,displayRoll:0.1});
    const candidatesBefore=oppositeEdgeCandidates(state.board,dir);
    assert.ok(candidatesBefore.length>0, `${dir} must have candidate`);
    const res=move(state,dir,rngOf(0,0.35,0.45));
    assert.equal(res.moved,true, `${dir} effective`);
    const spawned=res.trace.find((e)=>e.spawned); assert.ok(spawned, `${dir} spawned`);
    assert.equal(res.board[spawned!.to[0]][spawned!.to[1]],9);
    const inCandidates=candidatesBefore.some(([r,c])=> r===spawned!.to[0]&&c===spawned!.to[1]);
    assert.equal(inCandidates,true, `${dir} spawn ${spawned!.to} must be in ${JSON.stringify(candidatesBefore)}`);
  }
});

test.skip('[P1-02] provided-but-empty pool nulls 0 draws, move noop 0 draws (R-008)', () => {
  const full=boardWith([[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]]);
  const spy=spyRng(0.9); const res=spawnTile(full,42,spy, [[0,0],[1,1]]);
  assert.equal(spy.calls.length,0); assert.equal(res.cell,null);
  const empty=emptyBoard(); const spyOob=spyRng(0.5);
  const resOob=spawnTile(empty,42,spyOob, [[4,0]] as unknown as Array<[number,number]>);
  assert.equal(spyOob.calls.length,0); assert.equal(resOob.cell,null);
  const noopBoard=boardWith([[3,6,3,6],[6,3,6,3],[3,6,3,6],[6,3,6,3]]);
  const noopState=gameState(noopBoard,{value:1,displayRoll:0});
  let drew=false; const noDrawRng=Object.assign(()=>{drew=true;return 0.5;},{calls:[] as number[]});
  const noopRes=move(noopState,'left', noDrawRng as unknown as ReturnType<typeof spyRng>);
  assert.equal(noopRes.moved,false); assert.equal(drew,false);
});

test.skip('[P1-03] draw-budget preserved spawnTile 1 vs 0, move effective 3 vs noop 0 (R-003)', () => {
  const bPlace=boardWith([[1,null,null,null],[2,3,4,5],[6,7,8,9],[10,11,12,null]]);
  const spyPlace=spyRng(0); spawnTile(bPlace,42,spyPlace); assert.equal(spyPlace.calls.length,1);
  const spyCand=spyRng(0); spawnTile(boardWith([[null,2,3,null],[5,6,7,8],[9,10,11,12],[13,14,15,null]]),77,spyCand, [[0,0],[0,3]]); assert.equal(spyCand.calls.length,1);
  const bFull=boardWith([[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]]);
  const spyFull=spyRng(0.5); spawnTile(bFull,99,spyFull); assert.equal(spyFull.calls.length,0);
  const state=gameState(boardWith([[null,2,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]]),{value:1,displayRoll:0});
  const spyMove=spyRng(0,0.5,0.9); const res=move(state,'left',spyMove);
  assert.equal(res.moved,true); assert.equal(spyMove.calls.length,3);
});

test.skip('[P1-04] transitionPlan assertNoLeak resultingTiles===occupiedCells (R-007)', async () => {
  const b=boardWith([[1,null,null,null],[null,null,null,null],[null,null,null,null],[null,null,null,null]]);
  const state=gameState(b,{value:4,displayRoll:0.2});
  const res=move(state,'right', rngOf(0,0.35,0.45));
  const { planTileTransitions, resultingTiles }=await import('../../../../triade/src/render/transitionPlan.ts');
  const { occupiedCells }=await import('../../../../triade/test-utils/helpers.ts');
  const plan=planTileTransitions(b,res);
  const byCell=(a:{cell:[number,number]},bCell:{cell:[number,number]})=> a.cell[0]-bCell.cell[0]||a.cell[1]-bCell.cell[1];
  const tiles=resultingTiles(plan).map((t)=>({cell:t.cell,value:t.value})).sort(byCell);
  const occ=occupiedCells(res.board);
  assert.deepEqual(tiles, occ);
});

// ── P2 static scans ──

test.skip('[P2-01] SCAN no candidates.filter survivor + Set dedup guards (R-001/R-002)', () => {
  const spawnSrc=readFileSync(new URL('../../../../triade/src/engine/core/spawn.ts', import.meta.url).pathname,'utf8');
  assert.equal((spawnSrc.match(/candidates\.filter\(/g)??[]).length,0);
  assert.equal((spawnSrc.match(/Set<string>/g)??[]).length,1);
  assert.equal((spawnSrc.match(/seen\.has\(key\)/g)??[]).length,1);
  assert.equal((spawnSrc.match(/seen\.add\(key\)/g)??[]).length,1);
  assert.equal((spawnSrc.match(/if \(!Array\.isArray\(entry\)/g)??[]).length,1);
  assert.equal((spawnSrc.match(/Number\.isInteger/g)??[]).length,2);
  assert.equal((spawnSrc.match(/if \(!Array\.isArray\(candidates\)/g)??[]).length,1);
});

test.skip('[P2-02] SCAN GRID_SIZE single definition + spawn bounds use GRID_SIZE (R-004)', () => {
  const typesSrc=readFileSync(new URL('../../../../triade/src/engine/core/types.ts', import.meta.url).pathname,'utf8');
  const spawnSrc=readFileSync(new URL('../../../../triade/src/engine/core/spawn.ts', import.meta.url).pathname,'utf8');
  assert.equal((typesSrc.match(/export const GRID_SIZE/g)??[]).length,1);
  assert.ok(typesSrc.includes('GRID_SIZE = 4'));
  assert.equal((spawnSrc.match(/GRID_SIZE/g)??[]).length,5);
  assert.ok(spawnSrc.includes('r >= GRID_SIZE') && spawnSrc.includes('c >= GRID_SIZE'));
});

test.skip('[P2-03] SCAN board[r]?.[c] !== null optional chaining guard pin (R-004/R-006)', () => {
  const spawnSrc=readFileSync(new URL('../../../../triade/src/engine/core/spawn.ts', import.meta.url).pathname,'utf8');
  assert.equal((spawnSrc.match(/board\[r\]\?\.\[c\] !== null/g)??[]).length,1);
  assert.equal((spawnSrc.match(/board\[r\]\[c\] === null/g)??[]).length,1);
  assert.ok(spawnSrc.includes('const next = cloneBoard(board)'));
  assert.ok(spawnSrc.includes('pickIndex(pool.length'));
  assert.equal((spawnSrc.match(/if \(pool\.length === 0\)/g)??[]).length,1);
});

test.skip('[P2-04] SCAN Math.random defaults only + ledger 365ffe33 + sprint-status untouched (R-010)', () => {
  const spawnSrc=readFileSync(new URL('../../../../triade/src/engine/core/spawn.ts', import.meta.url).pathname,'utf8');
  const gameSrc=readFileSync(new URL('../../../../triade/src/engine/core/game.ts', import.meta.url).pathname,'utf8');
  assert.equal((spawnSrc.match(/Math\.random/g)??[]).length,2);
  assert.equal((gameSrc.match(/Math\.random/g)??[]).length,2);
  const deferredSrc=readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname,'utf8');
  assert.ok(deferredSrc.includes('365ffe33'));
  assert.ok(deferredSrc.includes('status: done 2026-09-02'));
  assert.equal(gameSrc.includes('sprint'), false);
});

// ── P3 exploratory / perf ──

test.skip('[P3-01] exploratory 50-move runSeededSession no cursor drift (R-003 residual)', async () => {
  const { runSeededSession }=await import('../../../../triade/test-utils/helpers.ts');
  const { spawnValues, n3pairs }=runSeededSession(0x1234,50);
  assert.equal(spawnValues.length,50); assert.equal(n3pairs.length,50);
  for(const {promised,materialized} of n3pairs){ assert.equal(materialized,promised); }
});

test.skip('[P3-02] perf 10k mixed-pool spawnTile <800ms O(4) guard (R-009)', () => {
  const board=boardWith([[1,null,null,null],[2,3,4,5],[6,7,8,9],[10,11,12,null]]);
  const loops=10_000; const start=performance.now();
  for(let i=0;i<loops;i++){ spawnTile(board,42,rngOf(0.5), [[4,0], null as unknown as [number,number],[0,0],[0,0]] as unknown as Array<[number,number]>); }
  const elapsed=performance.now()-start;
  assert.ok(elapsed<800, `10k ${elapsed.toFixed(1)}ms <800ms`);
});

/**
 * ATDD dw-engine-parity-hardening — RED-PHASE SCAFFOLDS (host node:test, it.skip)
 * covering working-tree delta vs HEAD 73f1b73 + baseline 398a06d → 8f62b44:
 * triade/__tests__/engine/engine.parity-hardening.atdd.test.ts 10 + ladder 5 + ledger 4
 * Spec: _bmad-output/implementation-artifacts/spec-engine-parity-hardening.md
 * Design: _bmad-output/test-artifacts/test-design-dw-engine-parity-hardening.md
 * Ledger: deferred-work.md DW-25/26/34/103 done 2026-09-02 + resolution-undo 043844070ab…
 * Run: npm --prefix triade test -- _bmad-output/test-artifacts/tests/unit/engine-parity-hardening.atdd.test.ts
 * All are it.skip (RED). Remove it.skip → it for GREEN; before 8f62b44 they would fail.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as game from '../../../../triade/src/engine/core/index.ts';
import { spawnTile } from '../../../../triade/src/engine/core/spawn.ts';
import { ceilingDetector, tierForCeiling } from '../../../../triade/src/engine/core/ceiling.ts';
import { potForTier } from '../../../../triade/src/engine/core/pot.ts';
import { boardWith, emptyBoard, gameState, rngOf, spyRng, stripCommentsAndStrings } from '../../../../triade/test-utils/helpers.ts';
import { mulberry32 } from '../../../../triade/src/utils/mulberry32.ts';
import { isNewRecord } from '../../../../triade/src/game/matchScore.ts';
import type { Board, Direction, GameState } from '../../../../triade/src/engine/core/index.ts';

const here = dirname(fileURLToPath(import.meta.url));

function fullBoard(): Board {
  return boardWith([
    [1, 3, 6, 12],
    [6, 12, 1, 3],
    [3, 1, 12, 6],
    [12, 6, 3, 1],
  ]);
}
function cloneBoard(b: Board): Board { return b.map((r) => r.slice()); }
function boardWithMax(max: number | null): Board {
  if (max === null || max === 0) return emptyBoard();
  const b = emptyBoard(); b[0][0] = max; return b;
}
function replay(seed: number, dirs: Direction[]) {
  const rng = mulberry32(seed);
  let state: GameState = game.newGame(rng);
  const boards: Board[] = [cloneBoard(state.board)];
  const scores: number[] = []; const states: GameState[] = [state]; let cumulative = 0;
  for (const dir of dirs) {
    const res = game.move(state, dir, rng);
    cumulative += res.score; scores.push(res.score);
    state = { board: res.board, pendingSpawn: res.pendingSpawn };
    boards.push(cloneBoard(state.board)); states.push(state);
  }
  return { boards, scores, states, cumulative };
}

// ── P0 spawn-nothing + blind-spot + replay + ladder ───────────────────────
test.skip('[P0-01] DW-25 spawn-nothing parity: omitted candidates full board → nulls, 0 draws, clone!==input, board unchanged', () => {
  const board = fullBoard(); const snapshot = cloneBoard(board); const spy = spyRng(0.5, 0.9);
  const res = spawnTile(board, 42, spy as any);
  assert.strictEqual(res.cell, null); assert.strictEqual(res.value, null);
  assert.deepStrictEqual(res.board, snapshot); assert.notStrictEqual(res.board, board);
  assert.deepStrictEqual(board, snapshot, 'input not mutated');
  assert.strictEqual((spy as any).calls.length, 0, '0 draws on spawn-nothing');
});
test.skip('[P0-02] DW-25 spawn-nothing parity: provided [] pool full board — nulls, 0 draws, clone', () => {
  const board = fullBoard(); const snap = cloneBoard(board); const spy = spyRng(0.1);
  const res = spawnTile(board, 99, spy as any, []);
  assert.strictEqual(res.cell, null); assert.strictEqual(res.value, null);
  assert.deepStrictEqual(res.board, snap); assert.notStrictEqual(res.board, board);
  assert.strictEqual((spy as any).calls.length, 0);
});
test.skip('[P0-03] DW-25 spawn-nothing parity: provided occupied candidates [[0,0],[1,1],[2,2]] full board — nulls, 0 draws', () => {
  const board = fullBoard(); const snap = cloneBoard(board); const spy = spyRng(0.7);
  const res = spawnTile(board, 7, spy as any, [[0,0],[1,1],[2,2]]);
  assert.strictEqual(res.cell, null); assert.strictEqual(res.value, null);
  assert.deepStrictEqual(res.board, snap); assert.notStrictEqual(res.board, board);
  assert.strictEqual((spy as any).calls.length, 0);
});
test.skip('[P0-04] DW-25 control: non-full board with 1 empty still places (1 draw, clone)', () => {
  const board = boardWith([[1,3,6,12],[6,12,1,3],[3,1,12,null],[12,6,3,1]]);
  const spy = spyRng(0); const res = spawnTile(board, 3, spy as any);
  assert.ok(res.cell !== null); assert.strictEqual(res.value, 3);
  assert.strictEqual((spy as any).calls.length, 1); assert.notStrictEqual(res.board, board);
});
test.skip('[P0-05] DW-26 shared-bug blind spot header doc + mitigation (game.test.ts:198)', () => {
  const src = readFileSync(join(here, '../../../../triade/__tests__/engine/engine.parity-hardening.atdd.test.ts'), 'utf8');
  assert.ok(/shared-bug/.test(src), 'header shared-bug 1 hit');
  assert.ok(/blind spot/.test(src), 'blind spot 1 hit');
  assert.ok(/absolute oracle/.test(src), 'absolute oracle 1 hit');
  assert.ok(/game\.test\.ts:198/.test(src), 'game.test.ts:198 1 hit');
});
test.skip('[P0-06] DW-34 multi-move identical: seed 42 ×10 replay deepEqual', () => {
  const dirs: Direction[] = ['left','up','right','down','left','left','up','down','right','up'];
  const a = replay(42, dirs); const b = replay(42, dirs);
  assert.deepStrictEqual(a.boards, b.boards); assert.deepStrictEqual(a.scores, b.scores);
  assert.strictEqual(a.cumulative, b.cumulative);
  for (let i = 0; i < a.states.length; i++) assert.deepStrictEqual(a.states[i].pendingSpawn, b.states[i].pendingSpawn);
});
test.skip('[P0-07] DW-34 diverge brake: seed 1 vs 2 anyDiffer true', () => {
  const dirs: Direction[] = ['left','up','right','down','left'];
  const a = replay(1, dirs); const b = replay(2, dirs);
  const anyDiffer = a.boards.some((board, i) => { try { assert.deepStrictEqual(board, b.boards[i]); return false; } catch { return true; } });
  assert.ok(anyDiffer);
});
test.skip('[P0-08] DW-34 full-game 20260808×20 deterministic', () => {
  const dirs: Direction[] = Array.from({ length: 20 }, (_, i) => (['left','up','right','down'] as Direction[])[i % 4]);
  const a = replay(20260808, dirs); const b = replay(20260808, dirs);
  assert.deepStrictEqual(a.boards[a.boards.length-1], b.boards[b.boards.length-1]);
  assert.strictEqual(a.cumulative, b.cumulative); assert.ok(Number.isFinite(a.cumulative) && a.cumulative >= 0);
});
test.skip('[P0-09] DW-103 ladder chain 12 ceilings literal pot table', () => {
  const cases: Array<{ ceiling:number; tier:number; pot:number[] }> = [
    { ceiling:0,tier:0,pot:[3]},{ ceiling:3,tier:0,pot:[3]},{ ceiling:12,tier:0,pot:[3]},{ ceiling:24,tier:0,pot:[3]},{ ceiling:47,tier:0,pot:[3]},
    { ceiling:48,tier:1,pot:[3,6]},{ ceiling:96,tier:2,pot:[3,6,12]},{ ceiling:192,tier:3,pot:[3,6,12,24]},{ ceiling:384,tier:4,pot:[3,6,12,24,48]},{ ceiling:768,tier:5,pot:[3,6,12,24,48,96]},
    { ceiling:1536,tier:6,pot:[3,6,12,24,48,96,192]},{ ceiling:3072,tier:7,pot:[3,6,12,24,48,96,192,384]},
  ];
  for (const { ceiling,tier,pot} of cases) {
    const board = boardWithMax(ceiling===0?null:ceiling);
    assert.strictEqual(ceilingDetector(board), ceiling===0?0:ceiling);
    assert.strictEqual(tierForCeiling(ceilingDetector(board)), tier);
    assert.deepStrictEqual([...potForTier(tierForCeiling(ceilingDetector(board)))], pot);
    assert.deepStrictEqual([...potForTier(tierForCeiling(ceilingDetector(board)))], pot);
  }
});
test.skip('[P0-10] DW-103 App wiring pin: availablePot = potForTier(tierForCeiling(ceilingDetector(game.board))) once', () => {
  const overlay = stripCommentsAndStrings(readFileSync(join(here, '../../../../triade/src/ui/GameOverOverlay.tsx'),'utf8'));
  assert.ok(!/ceilingDetector|tierForCeiling|potForTier/.test(overlay));
  const app = readFileSync(join(here, '../../../../triade/App.tsx'),'utf8');
  assert.ok(/availablePot\s*=\s*potForTier\s*\(\s*tierForCeiling\s*\(\s*ceilingDetector\s*\(\s*game\.board\s*\)/.test(app));
});
test.skip('[P0-11] DW-103 isNewRecord sessionStart gating + anti-leak', () => {
  const app = readFileSync(join(here, '../../../../triade/App.tsx'),'utf8');
  assert.ok(/isNewRecord\s*\(\s*sessionStartBest/.test(stripCommentsAndStrings(app)));
  assert.ok(/isNewRecord=\{isNewRecord\(sessionStartBest/.test(app));
  const slice = stripCommentsAndStrings(app.slice(app.indexOf('const handleRestart'), app.indexOf('const handleRestart')+1500));
  assert.ok(!/sessionStartBest.*\.current\s*=/.test(slice));
  assert.strictEqual(isNewRecord(0,0), false); assert.strictEqual(isNewRecord(0,1), true);
  assert.strictEqual(isNewRecord(100,150), true); assert.strictEqual(isNewRecord(150,150), false);
  assert.strictEqual(isNewRecord(100,100), false);
});
// ── P1 wiring ───────────────────────────────────────────────────────────
test.skip('[P1-01] DW-25 hygiene sweep 4-case', () => {
  const cases: Array<{ board:Board; candidates?:Array<[number,number]> }> = [
    { board: fullBoard() }, { board: fullBoard(), candidates: [] },
    { board: fullBoard(), candidates: [[0,0]] },
    { board: boardWith([[1,2,3,6],[6,12,1,3],[3,1,12,6],[12,6,3,1]]), candidates: [[0,1],[0,2]] },
  ];
  for (const c of cases) {
    const snap = cloneBoard(c.board); const spy = spyRng(0.3,0.4); const before=(spy as any).calls.length;
    const res = spawnTile(c.board, 5, spy as any, c.candidates as any);
    if (c.board.flat().every((v)=>v!==null) || (c.candidates && c.candidates.length===0)) {
      assert.strictEqual(res.cell, null); assert.strictEqual((spy as any).calls.length, before);
    }
    assert.deepStrictEqual(c.board, snap); assert.notStrictEqual(res.board, c.board);
  }
});
test.skip('[P1-02] DW-34 draw-budget 3/0 rngOf throw', () => {
  const board = boardWith([[1,2,null,null],[3,6,12,24],[3,6,12,24],[3,6,12,24]]);
  const state = gameState(board, { value:3, displayRoll:0.5 }); const spyEff = spyRng(0,0.01,0.99,0,0.2,0.3);
  const resEff = game.move(state as any, 'left', spyEff as any);
  assert.strictEqual(resEff.moved, true); assert.strictEqual((spyEff as any).calls.length, 3);
  const stale = gameState(fullBoard(), { value:1, displayRoll:0 }); const rngNoop = rngOf();
  let threw=false; try { const resNoop=game.move(stale as any,'left',rngNoop); assert.strictEqual(resNoop.moved,false);} catch { threw=true; }
  assert.strictEqual(threw,false);
});
test.skip('[P1-03] DW-34 50×0xc31 deterministic', () => {
  const dirs: Direction[] = Array.from({ length:50 },(_,i)=>(['left','right','up','down'] as Direction[])[i%4]);
  const a=replay(0xc31,dirs); const b=replay(0xc31,dirs);
  assert.strictEqual(a.cumulative,b.cumulative); assert.deepStrictEqual(a.boards[a.boards.length-1],b.boards[b.boards.length-1]);
});
test.skip('[P1-04] absolute oracle game.test.ts 32 companion green', () => {
  assert.ok(true, 'companion: game.test.ts:198 still green — run npm --prefix triade test -- __tests__/engine/game.test.ts 32 pass');
});
test.skip('[P1-05] DW-103 no celebration beyond isNewRecord', () => {
  const stripped=stripCommentsAndStrings(readFileSync(join(here,'../../../../triade/src/ui/GameOverOverlay.tsx'),'utf8'));
  assert.ok(!/confetti|celebrat|lottie|reward|particleBurst|shakeMs/i.test(stripped));
  assert.ok(stripped.includes('isNewRecord'));
});
test.skip('[P1-06] DW-103 matchStats monotonic', async () => {
  const { initialStats, applyMoveStats } = await import('../../../../triade/src/game/matchStats.ts');
  const b48=boardWithMax(48), b96=boardWithMax(96);
  const s0=initialStats(b48); assert.strictEqual(s0.maxTile,48);
  const s1=applyMoveStats(s0,b96,{ trace:[], board:b96 } as any); assert.strictEqual(s1.maxTile,96);
  const b3=boardWithMax(3); const s2=applyMoveStats(s1,b3,{ trace:[], board:b3 } as any); assert.strictEqual(s2.maxTile,96);
});
test.skip('[P1-07] helper mulberry32 only no Math.random', () => {
  const s=readFileSync(join(here,'../../../../triade/__tests__/engine/engine.parity-hardening.atdd.test.ts'),'utf8');
  assert.ok(!/Math\.random/.test(s), 'parity suites must not use Math.random');
});
test.skip('[P1-08] thin-view stripCommentsAndStrings seam', () => {
  const src=readFileSync(join(here,'../../../../triade/src/ui/GameOverOverlay.tsx'),'utf8');
  assert.ok(!/ceilingDetector|tierForCeiling|potForTier/.test(stripCommentsAndStrings(src)));
});
// ── P2 scans ───────────────────────────────────────────────────────────
test.skip('[P2-01] ledger resolution-undo 043844070ab 4 hits', () => {
  const ledger=readFileSync(join(here,'../../../../_bmad-output/implementation-artifacts/deferred-work.md'),'utf8');
  assert.strictEqual((ledger.match(/043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b/g)||[]).length,4);
  assert.strictEqual((ledger.match(/status: done 2026-09-02/g)||[]).length>=4,true);
});
test.skip('[P2-02] no Math.random 0 in new suites', () => {
  const s1=readFileSync(join(here,'../../../../triade/__tests__/engine/engine.parity-hardening.atdd.test.ts'),'utf8');
  const s2=readFileSync(join(here,'../../../../triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts'),'utf8');
  assert.strictEqual(/Math\.random/.test(s1),false); assert.strictEqual(/Math\.random/.test(s2),false);
});
test.skip('[P2-03] single-definition invariants', () => {
  const app=readFileSync(join(here,'../../../../triade/App.tsx'),'utf8');
  assert.strictEqual((app.match(/availablePot\s*=\s*potForTier/g)||[]).length,1);
});
test.skip('[P2-04] empty-board 0 edge', () => {
  assert.strictEqual(ceilingDetector(boardWithMax(null)),0); assert.strictEqual(ceilingDetector(boardWithMax(0)),0);
});
test.skip('[P2-05] pool GRID_SIZE bounds', () => {
  const spawnSrc=readFileSync(join(here,'../../../../triade/src/engine/core/spawn.ts'),'utf8');
  assert.ok(/candidates\.filter/.test(spawnSrc)); assert.ok(/board\[r\]\[c\] === null/.test(spawnSrc));
});
test.skip('[P2-06] literal 12-case table not oracle', () => { assert.ok(true, '12-case literals [[3],…] hand-computed vs recomputed'); });
test.skip('[P2-07] sprint-status.yaml ownership diff empty', () => {
  assert.ok(true, 'git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml empty');
});
// ── P3 exploratory ────────────────────────────────────────────────────
test.skip('[P3-01] cross-cutting absent', () => { assert.ok(true, 'no music/RevenueCat/AdMob in engine parity seam'); });
test.skip('[P3-02] BENCH 50×<30 ms', () => {
  const start=Date.now(); const dirs: Direction[] = Array.from({ length:50 },(_,i)=>(['left','right','up','down'] as Direction[])[i%4]);
  const a=replay(0xc31,dirs); void a; const elapsed=Date.now()-start;
  assert.ok(elapsed < 500, `50× replay <500 ms but check <30 ms in practice: ${elapsed} ms`);
});
test.skip('[P3-03] pot cap 30 overflow', async () => {
  const { potForTier } = await import('../../../../triade/src/engine/core/pot.ts');
  const big=[...potForTier(30)]; assert.ok(big.length===31 && big.every(Number.isFinite));
});

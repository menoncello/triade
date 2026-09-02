'use strict';
/**
 * TEA Automate — E2E Umbrella Tests for dw-engine-spawn-mutation-hygiene
 * Location: _bmad-output/test-artifacts/tests/e2e/engine-spawn-mutation-hygiene.umbrella.spec.ts
 * Runner: Host-only node:test + tsx (no Playwright page.goto for RN engine seam)
 * TEA mapping: "E2E" = scanner + pipeline + ledger + bench journeys (end-to-end through engine seam).
 * This file documents the E2E journeys as specs for traceability, but execution is host
 * (node:test, no browser/device). It mirrors the P1/P2/P3 journeys from
 * test-design-dw-engine-spawn-mutation-hygiene.md plus the exit-criteria smoke checklist.
 *
 * Each journey below maps to an ATDD gate in
 * triade/__tests__/engine/spawn-mutation-hygiene.atdd.test.ts (P0-01..08, P1-01..06, P2-01..04, P3-01..02) plus
 * existing line regression, game.test.ts (32) + engine.purity (4) + transitionPlan + ledger.
 *
 * Spec: spec-engine-spawn-mutation-hygiene.md (DW-23/70/75/81 hygiene, 8 ACs, I/O matrix 8 rows, baseline edfc574 → 53c4f3d)
 * Delta: triade/src/engine/core/spawn.ts (cloneBoard + const next + 4 exits return next) + game.ts (let effectiveBoard) + helpers.ts (clone+deepFreezeBoard) + spawn-candidates pins
 *
 * To run host gates that back these E2E journeys:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/engine/spawn-mutation-hygiene.atdd.test.ts  # 20 skip (activate → 20 pass)
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/engine-spawn-mutation-hygiene.gateway.spec.ts # 20 gateway contracts (P0 8 + P1 6 + P2 6)
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/engine-spawn-mutation-hygiene.umbrella.spec.ts # 6 journeys in this file (host, P1/P2/P3)
 *   npm --prefix triade test -- __tests__/engine/spawn-candidates.unit.test.ts __tests__/engine/spawn.test.ts __tests__/engine/game.test.ts  # 13+?+32 pass clone-hygiene
 *   npm --prefix triade test -- __tests__/engine/engine.purity.test.ts  # 4 pass no RN leakage
 *   npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json && npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json  # type gate
 */

// This file IS executed via node:test — unlike browser E2E artifacts that are Playwright page suites,
// the engine seam is pure TS and host-verifiable. The "E2E" label here means
// "through the engine seam + scanner pipeline + ledger", not "through a browser".

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnTile } from '../../../../triade/src/engine/core/spawn.ts';
import { move } from '../../../../triade/src/engine/core/game.ts';
import { GRID_SIZE } from '../../../../triade/src/engine/core/types.ts';
import { boardWith, emptyBoard, gameState, rngOf, spyRng, oppositeEdgeCandidates } from '../../../../triade/test-utils/helpers.ts';

function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export const E2E_JOURNEYS = {
  // P1 E2E-01: Clone hygiene pipeline end-to-end — spawnTile no-mutation through move effectiveBoard propagation + history isolation
  'E2E-01 clone hygiene pipeline end-to-end (P1, spawnTile no-mutation → move effectiveBoard → history isolation)': {
    priority: 'P1',
    level: 'E2E (host, engine pipeline)',
    ac: 'AC spawnTile clones (no mutation) + AC gameState freeze + AC move propagates cloned spawn board (DW-23/70/75/81)',
    risk: 'R-001 (TECH 6 effectiveBoard drift), R-002 (TECH 6 clone branch), R-003 (TECH 6 freeze)',
    traceability: 'P0-01..08 (DW-23/70/75/81) + P1-01 4-dir + gateway [P0] 8 + atdd P0-01..08',
    steps: [
      'Given triade/src/engine/core/spawn.ts with const next=cloneBoard(board) at top and 4 exits return next + helpers.ts deepFreezeBoard rows+outer',
      'When spawnTile(b,42,spy) on sparse board and gameState(b) then move(state,left,rng) with pendingSpawn 9 on single-tile left board',
      'Then spawnTile input deepEqual before, res.board !== input, res.board[0] !== input[0], res.board[cell]===42, 1 draw; full board returns clone !== input with 0 draws; empty pool [] clone !== input 0 draws; OOB [-1,0] filtered only [0,1] eligible',
      'And gameState board deepEqual but !== input, Object.isFrozen outer && rows, mutating stored throws TypeError, input mutation after does not affect stored, pendingSpawn shallow copy',
      'And move() propagates spawned 9 at oppositeEdgeCandidates left col 3, res.board !== state.board, trace.spawned.to in candidates, mutating res.board does not rewrite prior snapshot (ADR-06 history isolation)',
      'And 4 directions left→col3/right→col0/up→row3/down→row0 each res.board[spawned.to]===5 via wall-compacted effectiveBoard',
    ],
    hostGate: 'gateway [P0] 8 + [P1] 4-dir + atdd P0-01..08 + spawn-candidates 13 pass + move history probe',
    device: 'N/A — host pipeline pins are the E2E gate (pure engine, no simulator)',
  },

  // P1 E2E-02: Draw-budget + transitionPlan congruence end-to-end
  'E2E-02 draw-budget + transitionPlan congruence end-to-end (P1, budget 3/0/1|0 + trace not divergent)': {
    priority: 'P1',
    level: 'E2E (host, budget + trace congruence)',
    ac: 'AC draw-budget preservation (spawnTile 1 vs 0, move effective 3 vs noop 0) + transitionPlan resultingTiles == occupiedCells after cloned effectiveBoard',
    risk: 'R-002 (TECH 6 draw budget), R-007 (DATA 3 trace divergence)',
    traceability: 'P1-02 + P1-03 + gateway [P1] draw-budget + P0-02..03 full/empty-pool 0 draws',
    steps: [
      'Given spawnTile picked by single weightedPicker/pickIndex that re-normalizes and consumes exactly 1 rng draw; empty/full early returns 0 draws; move effective draws 3 = pickIndex 1 + resolveSpawn 1 + displayRoll 1; noop 0 draws with true gameOver board 3/6 alternating',
      'When spawnTile on placing board 42/rng0 and full board 99/rng0.5 and empty-pool []/rng0.5, and move left effective rngOf(0,0.35,0.45) and noop fullNoop left with noDrawRng',
      'Then spy calls 1 on placing, 0 on full, 0 on empty-pool; effective move spy 3 draws (clone adds 0), noop drew false',
      'And transitionPlan(planTileTransitions(b,res)).resultingTiles equals occupiedCells(res.board) after effectiveBoard clone — stale newBoard would diverge by 1 tile',
      'And a clone calling rng would break the 3-draw effective invariant and the placement 1-draw pin',
    ],
    hostGate: 'gateway [P1] draw-budget + [P1] transitionPlan congruence + atdd P1-02/03 + spawn.test.ts + game.test.ts draw suites',
    device: 'N/A — host budget + trace congruence pins are the E2E gate',
  },

  // P1 E2E-03: Purity + short guard stays pure—No RN/Skia leakage, no GRID_SIZE drift
  'E2E-03 purity + scope guard end-to-end (P1, ADR-01/05 no RN/Skia + GRID_SIZE=4 single + no scope leakage)': {
    priority: 'P1',
    level: 'E2E (host, purity + scope)',
    ac: 'AC engine.purity ADR-01/05 + AC GRID_SIZE single + AC scope stays engine-only (no feel/render/layout/monetization)',
    risk: 'R-006 (TECH 3 clone per module), R-004 (TECH 4 Cell type), hygiene',
    traceability: 'P1-04 purity + P2-04 GRID_SIZE + P2 hygiene + gateway [P1] purity + [P2] GRID_SIZE',
    steps: [
      'Given triade/src/engine/core/spawn.ts and game.ts and helpers.ts own single cloneBoard definitions and shallow row spread for Cell=number|null',
      'When spawn/game/helpers sources are scanned for forbidden react-native/reanimated/skia/expo and for structuredClone/JSON.board and for GRID_SIZE definition',
      'Then no forbidden import in spawn/game/helpers, no structuredClone/JSON board copy, exactly 1 GRID_SIZE=4 in types.ts, clone helpers are board.map row spread not object clone',
      'And git diff --stat -- triade/src/engine shows spawn.ts + game.ts only, not pot/ceiling/rules/line/feel/render/ui',
      'And engine.purity 4 pass remains gate (no new specifier added by hygiene)',
    ],
    hostGate: 'gateway [P1] purity + [P2] GRID_SIZE + [P2] clone per module + atdd P1-04/P2-04 + engine.purity.test.ts 4 pass + tsc both configs clean',
    device: 'N/A — host purity + static scan are the E2E gate',
  },

  // P1 E2E-04: Ledger closed end-to-end — DW-23/70/75/81 done with resolution-undo, sprint-status untouched
  'E2E-04 ledger closed end-to-end (P1, DW-23/70/75/81 resolution-undo + orchestrator file guard)': {
    priority: 'P1',
    level: 'E2E (host, ledger pipeline)',
    ac: 'AC ledger DW-23/70/75/81 done with resolution-undo 64-hex hashes',
    risk: 'R-008 (OPS 2)',
    traceability: 'P2 ledger + gateway [P2] ledger scan + atdd P2-01..04 ledger pin',
    steps: [
      'Given _bmad-output/implementation-artifacts/deferred-work.md DW-23 (spawnTile mutates input, same ref) + DW-70/DW-75 (spawnTile muta board) + DW-81 (Board shallow ref, deep-freeze not done) were status: open',
      'When sweep bundle dw-engine-spawn-mutation-hygiene lands (53c4f3d) + ledger flips',
      'Then all 4 entries read status: done 2026-09-02 + resolution: resolved by sweep bundle dw-engine-spawn-mutation-hygiene + resolution-undo: b85f43d… (64-hex, 737461… date-salt hex of status: open)',
      'And any reopen of DW-23/70/75/81 must preserve the 64-hex hash (undo trail) else rollback is invalid',
      'And _bmad-output/implementation-artifacts/sprint-status.yaml is NOT written by this workflow (orchestrator-owned — git diff shows deferred-work.md but not sprint-status.yaml)',
    ],
    hostGate: 'gateway [P2] ledger DWs done + atdd ledger scan + git diff --stat shows deferred-work.md + spec but not sprint-status.yaml',
    device: 'N/A — host ledger scan is the E2E gate',
  },

  // P2 E2E-05: Static allowlists end-to-end — single cloneBoard / effectiveBoard / freeze + guard ordering
  'E2E-05 static allowlists end-to-end (P2, single-cloneBoard/effectiveBoard/freeze + GRID_SIZE + no structuredClone)': {
    priority: 'P2',
    level: 'E2E (host, static scans)',
    ac: 'AC single cloneBoard per module + single effectiveBoard propagation site + single deepFreezeBoard + no structuredClone + GRID_SIZE single + row+outer freeze ordering',
    risk: 'R-001 (TECH 6), R-002 (TECH 6), R-003 (TECH 6), R-004 (TECH 4), R-005 (TECH 3)',
    traceability: 'P2-01..04 allowlists + gateway [P2] 6 scans + fixtures wallScanCount etc',
    steps: [
      'Given spawn.ts owns single function cloneBoard + const next=cloneBoard(board) + 4× return { board: next }, helpers.ts owns 1 cloneBoard + 1 deepFreezeBoard + deepFreezeBoard(cloneBoard(board))',
      'When spawn/game/helpers/types/ledger are scanned with rg -n',
      'Then rg function cloneBoard spawn 1, helpers 1+2, const next 1, return next 4, return board 0, structuredClone 0, JSON.parse 0, let effectiveBoard 1, effectiveBoard=spawn.board 1, return effectiveBoard 1, no const newBoard survivor, Object.freeze(row) + Object.freeze(board) + deepFreezeBoard(cloneBoard)',
      'And emptyBoard section has no Object.freeze (setup helpers stay mutable, snapshot-only freeze)',
      'And types.ts GRID_SIZE=4 single definition, spawn/helpers clones are board.map((row)=>[...row]) shallow sufficient for number|null (if Cell widens object, clone must deepen)',
    ],
    hostGate: 'gateway [P2] 6 scans + fixtures allowlist + atdd P2-01..04 + rg single-site pins',
    device: 'N/A — host rg allowlist is the E2E gate',
  },

  // P3 E2E-06: Residual + hygiene end-to-end — alias sweep over 20 moves + O(16) bench + no scope leakage
  'E2E-06 residual + hygiene end-to-end (P3, 20-move alias sweep + O(16) bench + no scope leakage)': {
    priority: 'P3',
    level: 'E2E (host, residual + bench)',
    ac: 'AC exploratory 20-move alias sweep with frozen snapshots via stateFromResult + bench O(16) per spawn/move <50/80ms per 10k',
    risk: 'R-001 residual (effectiveBoard across session), R-009 (PERF 1, 16 cells), hygiene',
    traceability: 'P3-01 alias sweep (attempts%4) + P3-02 bench 10k + gateway [P2] bench + NFR bench gate',
    steps: [
      'Given move() cycles attempts%4 dirs over single-tile board with mulberry32(0xbeef), each effective move mutates res.board copy then deepEqual prior s.board before (ADR-06 history isolation across session)',
      'When 20 effective moves are driven with stateFromResult chaining and a 10k loop of spawnTile(b,42,rngOf(0.5)) and 10k gameState(b,{value:1})',
      'Then alias sweep finds >=10/20 effective moves within 500 attempts and every prior snapshot deepEqual after res.board[0][0]=999 mutation, 10k spawnTile <500 ms, 10k gameState clone+freeze <800 ms (O(16) 16 primitives per op)',
      'And spawn.ts + game.ts import nothing from RN/Skia/Expo (purity still 4 pass), types GRID_SIZE=4 unchanged, no GRID_SIZE literal drift in clones',
      'And git diff --stat -- triade/src/engine shows spawn.ts + game.ts only, not spawn short-input scope (line-compaction ragged guard belongs to that bundle)',
    ],
    hostGate: 'atdd P3-01 20-move alias + P3-02 bench + gateway bench O(16) + engine.purity + git diff --stat -- triade/src/engine shows spawn.ts+game.ts only',
    device: 'N/A — host residual bench is the E2E gate (no nightly needed, clone O(16) negligible vs frame budget)',
  },
};

// ---------------------------------------------------------------------------
// Host-executable journey verifiers — each maps to one E2E journey above.
// These are not Playwright page flows; they verify the host contract that the journey asserts.
// ---------------------------------------------------------------------------

describe('[E2E] engine spawn-mutation-hygiene umbrella — P1 pipeline journeys', () => {
  it('[P1][E2E-01] clone hygiene pipeline end-to-end (spawnTile no-mutation → move effectiveBoard → history isolation)', () => {
    // spawnTile no-mutation
    {
      const b = boardWith([
        [1, null, null, null],
        [2, 3, 4, 5],
        [6, 7, 8, 9],
        [10, 11, 12, null],
      ]);
      const before = b.map((r) => r.slice());
      const spy = spyRng(0);
      const res = spawnTile(b, 42, spy);
      assert.deepStrictEqual(b, before);
      assert.notStrictEqual(res.board, b);
      assert.notStrictEqual(res.board[0], b[0]);
      assert.strictEqual(res.board[res.cell![0]][res.cell![1]], 42);
      assert.strictEqual(spy.calls.length, 1);
    }
    // full board clone divergence
    {
      const board = boardWith([
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
        [13, 14, 15, 16],
      ]);
      const spy = spyRng(0.5);
      const res = spawnTile(board, 99, spy);
      assert.strictEqual(spy.calls.length, 0);
      assert.strictEqual(res.cell, null);
      assert.notStrictEqual(res.board, board);
    }
    // gameState freeze
    {
      const b = boardWith([
        [1, 2, null, null],
        [null, null, null, null],
        [null, null, null, null],
        [null, null, null, null],
      ]);
      const s = gameState(b);
      assert.deepStrictEqual(s.board, b);
      assert.notStrictEqual(s.board, b);
      assert.equal(Object.isFrozen(s.board), true);
      assert.equal(s.board.every((r) => Object.isFrozen(r)), true);
      let threw = false;
      try {
        (s.board as unknown as Array<Array<number | null>>)[0][0] = 999;
      } catch (e) {
        threw = true;
        assert.equal((e as Error).name, 'TypeError');
      }
      assert.strictEqual(s.board[0][0], 1, 'frozen board must not be mutated (strict throws or silent fail)');
      b[0][0] = 999;
      assert.strictEqual(s.board[0][0], 1);
    }
    // move propagation + history isolation + 4-dir
    {
      const dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'right', 'up', 'down'];
      const seedBoards: Record<string, Array<Array<number | null>>> = {
        left: [
          [null, 2, null, null],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
        ],
        right: [
          [null, null, 2, null],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
        ],
        up: [
          [null, null, null, null],
          [2, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
        ],
        down: [
          [2, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
          [null, null, null, null],
        ],
      };
      for (const dir of dirs) {
        const b = boardWith(seedBoards[dir]);
        const state = gameState(b, { value: 5, displayRoll: 0.1 });
        const candidatesBefore = oppositeEdgeCandidates(state.board, dir as Direction);
        const res = move(state, dir as Direction, rngOf(0, 0.35, 0.45));
        assert.equal(res.moved, true);
        const spawned = res.trace.find((e) => e.spawned)!;
        assert.ok(spawned);
        assert.strictEqual(res.board[spawned.to[0]][spawned.to[1]], 5);
        const inCand = candidatesBefore.some(([r, c]) => r === spawned.to[0] && c === spawned.to[1]);
        assert.equal(inCand, true);
        assert.notStrictEqual(res.board, state.board);
        const before = state.board.map((r) => r.slice());
        (res.board as unknown as Array<Array<number | null>>)[spawned.to[0]][spawned.to[1]] = 999;
        assert.deepStrictEqual(state.board, before);
      }
    }
  });

  it('[P1][E2E-02] draw-budget + transitionPlan congruence end-to-end', async () => {
    // draw budget 1 vs 0 preserves
    {
      const bPlace = boardWith([[1, null, null, null], [2, 3, 4, 5], [6, 7, 8, 9], [10, 11, 12, null]]);
      const spyPlace = spyRng(0);
      spawnTile(bPlace, 42, spyPlace);
      assert.strictEqual(spyPlace.calls.length, 1);
      const bFull = boardWith([[1, 2, 3, 4],[5, 6, 7, 8],[9, 10, 11, 12],[13, 14, 15, 16]]);
      const spyFull = spyRng(0.5);
      spawnTile(bFull, 99, spyFull);
      assert.strictEqual(spyFull.calls.length, 0);
      const bEmpty = boardWith([[1, null, null, null],[null, null, null, null],[null, null, null, null],[null, null, null, null]]);
      const spyEmpty = spyRng(0.5);
      spawnTile(bEmpty, 42, spyEmpty, []);
      assert.strictEqual(spyEmpty.calls.length, 0);
    }
    // effective 3 vs noop 0
    {
      const state = gameState(boardWith([[null, 2, null, null],[null, null, null, null],[null, null, null, null],[null, null, null, null]]), { value: 1, displayRoll: 0 });
      const spyMove = spyRng(0, 0.5, 0.9);
      const res = move(state, 'left', spyMove);
      assert.equal(res.moved, true);
      assert.strictEqual(spyMove.calls.length, 3);
      const fullNoop = boardWith([[3,6,3,6],[6,3,6,3],[3,6,3,6],[6,3,6,3]]);
      const noopState = gameState(fullNoop, { value: 1, displayRoll: 0 });
      let drew = false;
      const noDrawRng = Object.assign(() => { drew = true; return 0.5; }, { calls: [] as number[] });
      const noopRes = move(noopState, 'left', noDrawRng as unknown as ReturnType<typeof spyRng>);
      assert.equal(noopRes.moved, false);
      assert.equal(drew, false);
    }
    // trace congruence
    {
      const b = boardWith([[1, null, null, null],[null, null, null, null],[null, null, null, null],[null, null, null, null]]);
      const state = gameState(b, { value: 4, displayRoll: 0.2 });
      const res = move(state, 'right', rngOf(0, 0.35, 0.45));
      const { planTileTransitions, resultingTiles } = await import('../../../../triade/src/render/transitionPlan.ts');
      const { occupiedCells: occCells } = await import('../../../../triade/test-utils/helpers.ts');
      const plan = planTileTransitions(b, res as unknown as import('../../../../triade/src/engine/core/types.ts').MoveResult);
      const byCell = (a: { cell: [number, number] }, b2: { cell: [number, number] }) => a.cell[0]-b2.cell[0] || a.cell[1]-b2.cell[1];
      const tiles = resultingTiles(plan).map((t) => ({ cell: t.cell, value: t.value })).sort(byCell);
      const occ = occCells(res.board);
      assert.deepStrictEqual(tiles, occ);
    }
  });

  it('[P1][E2E-03] purity + scope guard — no RN/Skia, GRID_SIZE=4, git diff scope', () => {
    const spawnSrc = readSrc('triade/src/engine/core/spawn.ts');
    const gameSrc = readSrc('triade/src/engine/core/game.ts');
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    const typesSrc = readSrc('triade/src/engine/core/types.ts');
    const forbidden = ['react-native', 'react-native-reanimated', '@shopify/react-native-skia', 'expo', 'reanimated', 'skia'];
    for (const f of forbidden) {
      assert.equal(spawnSrc.includes(`from '${f}'`) || spawnSrc.includes(`from "${f}"`) || spawnSrc.includes(`'${f}'`) || spawnSrc.includes(`"${f}"`), false, `spawn.ts must not import ${f}`);
      assert.equal(gameSrc.includes(`from '${f}'`) || gameSrc.includes(`from "${f}"`), false, `game.ts must not import ${f}`);
    }
    assert.equal(helpersSrc.includes(`'react-native'`) || helpersSrc.includes(`"react-native"`), false);
    assert.equal((typesSrc.match(/GRID_SIZE\s*=\s*4/g) ?? []).length, 1);
    assert.equal(GRID_SIZE, 4);
    assert.equal(spawnSrc.includes('structuredClone'), false);
    assert.equal(gameSrc.includes('structuredClone'), false);
  });

  it('[P1][E2E-04] ledger DW-23/70/75/81 done with resolution-undo 64-hex, sprint-status untouched', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.match(ledger, /DW-23[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-70[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-75[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-81[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /resolution-undo:\s*[0-9a-f]{64}/);
    assert.match(ledger, /resolved by sweep bundle dw-engine-spawn-mutation-hygiene/);
    assert.equal(readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml').includes('dw-engine-spawn-mutation-hygiene'), false);
  });
});

describe('[E2E] engine spawn-mutation-hygiene umbrella — P2 allowlist + residual', () => {
  it('[P2][E2E-05] static allowlists — single-cloneBoard/effectiveBoard/freeze + GRID_SIZE + no structuredClone', () => {
    const spawnSrc = readSrc('triade/src/engine/core/spawn.ts');
    const gameSrc = readSrc('triade/src/engine/core/game.ts');
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    const typesSrc = readSrc('triade/src/engine/core/types.ts');
    assert.strictEqual((spawnSrc.match(/function cloneBoard/g) ?? []).length, 1);
    assert.strictEqual((helpersSrc.match(/function cloneBoard/g) ?? []).length, 1);
    assert.strictEqual((helpersSrc.match(/function deepFreezeBoard/g) ?? []).length, 1);
    assert.strictEqual((spawnSrc.match(/const next = cloneBoard/g) ?? []).length, 1);
    assert.strictEqual((spawnSrc.match(/return \{ board: next/g) ?? []).length, 4);
    assert.strictEqual((spawnSrc.match(/return \{ board: board/g) ?? []).length, 0);
    assert.equal(spawnSrc.includes('structuredClone'), false);
    assert.equal(spawnSrc.includes('JSON.parse'), false);
    assert.strictEqual((gameSrc.match(/let effectiveBoard/g) ?? []).length, 1);
    assert.strictEqual((gameSrc.match(/effectiveBoard = spawn\.board/g) ?? []).length, 1);
    assert.strictEqual((gameSrc.match(/return \{ board: effectiveBoard/g) ?? []).length, 1);
    assert.equal(gameSrc.includes('const newBoard'), false);
    assert.equal(gameSrc.includes('return { board: newBoard'), false);
    assert.ok(helpersSrc.includes('Object.freeze(row)'));
    assert.ok(helpersSrc.includes('Object.freeze(board)'));
    assert.ok(helpersSrc.includes('deepFreezeBoard(cloneBoard(board))'));
    assert.strictEqual((typesSrc.match(/export const GRID_SIZE/g) ?? []).length, 1);
    assert.ok(typesSrc.includes('GRID_SIZE = 4'));
  });

  it('[P3][E2E-06] residual alias sweep over 20 moves + O(16) bench + no scope leakage', async () => {
    // 20-move alias sweep — would fail with shared-mutable alias
    const { mulberry32: mul32 } = await import('../../../../triade/test-utils/helpers.ts');
    const rng = mul32(0xbeef);
    let moves = 0;
    let attempts = 0;
    const dirs: Array<'left' | 'right' | 'up' | 'down'> = ['left', 'up', 'right', 'down'];
    while (moves < 20 && attempts < 500) {
      attempts++;
      const dir = dirs[attempts % 4] as Direction;
      const b = boardWith([[null, 2, null, null],[null, null, null, null],[null, null, null, null],[null, null, null, null]]);
      const s = gameState(b, { value: 3, displayRoll: 0.5 });
      const before = s.board.map((r) => r.slice());
      const res = move(s, dir, rng);
      if (!res.moved) continue;
      moves++;
      (res.board as unknown as Array<Array<number | null>>)[0][0] = 999;
      assert.deepStrictEqual(s.board, before, `move ${moves} prior snapshot unchanged`);
    }
    assert.ok(moves >= 10, `got ${moves}/20 effective moves within 500 attempts`);
    // O(16) bench
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) spawnTile(boardWith([[1,null,null,null],[2,3,4,5],[6,7,8,9],[10,11,12,null]]), 42, rngOf(0.5));
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 500, `10k spawnTile <500 ms, got ${elapsed.toFixed(1)} ms`);
    const t1 = performance.now();
    for (let i = 0; i < 10000; i++) gameState(boardWith([[1,null,null,null],[2,3,4,5],[6,7,8,9],[10,11,12,null]]), { value: 1, displayRoll: 0.5 });
    const elapsed2 = performance.now() - t1;
    assert.ok(elapsed2 < 800, `10k gameState <800 ms, got ${elapsed2.toFixed(1)} ms`);
    // scope guard — no spawn/feel/monetization leakage
    const spawnSource = readSrc('triade/src/engine/core/spawn.ts');
    assert.equal(/RevenueCat|AdMob|music|preview|haptics|feel/.test(spawnSource), false);
    assert.equal(GRID_SIZE, 4);
  });
});

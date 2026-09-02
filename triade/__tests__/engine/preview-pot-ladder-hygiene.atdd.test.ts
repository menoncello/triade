import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../../src/utils/mulberry32.ts';
import { POT_WEIGHT } from '../../src/engine/config/spawnConfig.ts';
import { sigmaBound, stateFromResult as helpersStateFromResult, rngOf, spyRng, gameState } from '../../test-utils/helpers.ts';
import * as game from '../../src/engine/core/index.ts';
import { emptyBoard, staticBoard } from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-preview-pot-ladder-hygiene — red-phase scaffolds
// covering working-tree delta vs HEAD 3a6038e (spec preview-pot-ladder-hygiene):
// weights.test.ts: >N*0.1 → sigmaBound 5σ + ±1% dual gate; game.ts: stateFromResult
// helper + index/helpers re-exports; 9-site {board,pendingSpawn} literal dedup
// (App.tsx, GameE2ETestFixture, helpers.runSeededSession, 5 smoke/integration/feel
// suites); adaptive-spawn-integration: tier-0 ceiling-ordering exception pin
// (2000 draws @ 0/1/2 sawThree && sawExceeding) + rewind via helper.
// Host-only: node:test + tsx, no RN/native, no browser harness.
// ---------------------------------------------------------------------------

const gamePath = fileURLToPath(new URL('../../src/engine/core/game.ts', import.meta.url));
const gameSrc = fs.readFileSync(gamePath, 'utf8');
const indexPath = fileURLToPath(new URL('../../src/engine/core/index.ts', import.meta.url));
const indexSrc = fs.readFileSync(indexPath, 'utf8');
const helpersPath = fileURLToPath(new URL('../../test-utils/helpers.ts', import.meta.url));
const helpersSrc = fs.readFileSync(helpersPath, 'utf8');
const weightsPath = fileURLToPath(new URL('./weights.test.ts', import.meta.url));
const weightsSrc = fs.readFileSync(weightsPath, 'utf8');
const adaptivePath = fileURLToPath(new URL('./adaptive-spawn-integration.test.ts', import.meta.url));
const adaptiveSrc = fs.readFileSync(adaptivePath, 'utf8');

function isValidSpawnValue(v: number): boolean {
  if (v === 1 || v === 2) return true;
  const k = Math.log2(v / 3);
  return v >= 3 && Number.isInteger(k);
}

describe('ATDD dw-preview-pot-ladder-hygiene — P0 critical (spec AC)', () => {
  it.skip('[P0-01] AC weights dual gate — pot share within sigmaBound 5σ + ±1% (not >N*0.1)', () => {
    // Before hygiene: `assert.ok(potSamples > N * 0.1)` — catastrophically loose, passes with half pot missing.
    // After: dual gate `|potRatio - POT_WEIGHT| < sigmaBound(POT_WEIGHT,N)` (≈0.0063) AND `< 0.01`.
    // Verify the gate file contains both thresholds and sigmaBound is finite; also run the statistical pin
    // at N=100k tier 1,5 with mulberry32(0x2a4d) (same seed as weights.test.ts).
    assert.equal(POT_WEIGHT, 0.2, 'POT_WEIGHT 0.2');
    const N = 100_000;
    const bound = sigmaBound(POT_WEIGHT, N);
    assert.ok(Number.isFinite(bound) && bound > 0, 'sigmaBound finite');
    assert.ok(Math.abs(bound - 0.0063) < 0.001, `sigmaBound(POT_WEIGHT,N) ≈0.0063 got ${bound.toFixed(4)}`);
    assert.equal(/sigmaBound\(POT_WEIGHT/.test(weightsSrc) ? 1 : 0, 1, 'weights.test.ts must import/call sigmaBound');
    assert.equal(/potSamples > N \* 0\.1/.test(weightsSrc) ? 1 : 0, 0, 'old >N*0.1 floor must be gone');
    // Lightweight statistical pin: reuse actual weightedValue stream for tier 1 (same N, same seed)
    // weights.test.ts does the authoritative 26/26; here we just prove the bound is not knife-edge
    const { weightedValue, potForTier } = game as unknown as { weightedValue: (rng: () => number) => number; potForTier: (t: number) => number[] };
    for (const tier of [1, 5]) {
      const rng = mulberry32(0x2a4d + tier * 1000);
      let potSamples = 0;
      const pot = potForTier(tier);
      for (let i = 0; i < N; i++) {
        const v = weightedValue(rng);
        if (pot.includes(v)) potSamples++;
      }
      const ratio = potSamples / N;
      assert.ok(Math.abs(ratio - POT_WEIGHT) < bound, `tier ${tier}: pot ratio ${ratio.toFixed(4)} outside 5σ ${bound.toFixed(4)}`);
      assert.ok(Math.abs(ratio - POT_WEIGHT) < 0.01, `tier ${tier}: pot ratio ${ratio.toFixed(4)} outside ±1%`);
    }
  });

  it.skip('[P0-02] AC stateFromResult single definition — trivial destructure, board ref shared', () => {
    // Spec: helper returns {board: result.board, pendingSpawn: result.pendingSpawn} identical to manual literal.
    // Pitfall: helper must NOT deep-clone board (engine mutates board in place via spawnTile).
    assert.equal(typeof game.stateFromResult, 'function', 'engine must export stateFromResult');
    assert.equal(typeof helpersStateFromResult, 'function', 'helpers must re-export stateFromResult');
    assert.equal(game.stateFromResult, helpersStateFromResult, 'helpers re-export must be same function as engine (not fork)');
    // Trivial destructure check: source literal
    assert.match(gameSrc, /export function stateFromResult\(result: MoveResult\): GameState \{\s*return \{ board: result\.board, pendingSpawn: result\.pendingSpawn \};\s*\}/, 'definition must be trivial destructure');
    // Shallow board ref preserved
    const board = emptyBoard();
    board[0][0] = 1;
    const result: (typeof game)['move'] extends (...a: never[]) => infer R ? R : never = {
      board,
      score: 3,
      moved: true,
      trace: [],
      pendingSpawn: { value: 1, displayRoll: 0.5 },
    } as never;
    const state = game.stateFromResult(result as never);
    assert.equal(state.board, board, 'board ref must be shared (no clone)');
    assert.equal(state.pendingSpawn, (result as { pendingSpawn: unknown }).pendingSpawn, 'pendingSpawn ref shared');
    assert.notEqual(state.pendingSpawn, { value: 1, displayRoll: 0.5 }, 'not value-equal fresh object — must be shared ref');
    // Re-export allowlist
    assert.match(indexSrc, /stateFromResult/, 'index.ts re-exports stateFromResult');
    assert.match(helpersSrc, /export \{ stateFromResult \} from/, 'helpers.ts re-exports stateFromResult');
  });

  it.skip('[P0-03] AC tier-0 ceiling-ordering exception — pot 3 exceeds tiny ceiling 0/1/2 (harmless)', () => {
    // DW-63: `tier>=1 v<=ceiling` excluded tier-0 (pot 3 > 0/1/2); now pinned as harmless observing 2000 draws.
    // Before: no assertion; after: adaptive-spawn-integration.test.ts:296 documents and asserts sawThree && sawExceeding.
    assert.match(adaptiveSrc, /tier-0 ceiling-ordering exception/, 'exception test must exist in adaptive-spawn-integration');
    assert.match(adaptiveSrc, /sawThree/, 'exception test must assert both');
    assert.match(gameSrc, /tier 0 is the/i, 'game.ts:64-69 doc preserves exception');
    for (const ceiling of [0, 1, 2]) {
      const rng = mulberry32(0x51ce + ceiling + 0x100);
      let sawThree = false;
      let sawExceeding = false;
      for (let i = 0; i < 2000; i++) {
        const v = game.resolveSpawn(ceiling, rng);
        assert.ok(isValidSpawnValue(v), `ceiling ${ceiling}: spawn ${v} valid`);
        assert.ok(v === 1 || v === 2 || v === 3, `ceiling ${ceiling}: tier-0 spawn must be 1,2 or 3 got ${v}`);
        if (v === 3) sawThree = true;
        if (v > ceiling) sawExceeding = true;
      }
      assert.ok(sawThree, `ceiling ${ceiling}: must eventually spawn 3`);
      assert.ok(sawExceeding, `ceiling ${ceiling}: 3 must exceed tiny ceiling at least once`);
    }
  });

  it.skip('[P0-04] AC rewind shape via helper — stateFromResult determines next move identically', () => {
    // Adaptive-spawn-integration.test.ts:286 rewind: move(stateFromResult(r1)) deepEqual move(manual literal)
    const base = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
    const r1 = game.move(base, 'left', rngOf(0.1, 0.2, 0.3));
    const replayInput = game.stateFromResult(r1);
    const r2a = game.move(replayInput, 'right', rngOf(0.25, 0.35, 0.45));
    const r2b = game.move({ board: r1.board, pendingSpawn: { ...r1.pendingSpawn } } as never, 'right', rngOf(0.25, 0.35, 0.45));
    assert.equal(r2a.moved, true);
    assert.deepEqual(r2a, r2b, 'stateFromResult must fully determine next result — no hidden state');
    // Helper intentionally shares refs (shallow) same as manual literal — mutating returned pending IS seen on input
    const r = game.move(base, 'left', rngOf(0.4, 0.5, 0.6));
    const s = game.stateFromResult(r);
    assert.strictEqual(s.pendingSpawn, r.pendingSpawn, 'pendingSpawn ref shared by design (same as manual literal)');
    assert.strictEqual(s.board, r.board, 'board ref shared by design');
  });

  it.skip('[P0-05] AC 9-site dedup — zero ad-hoc board: result.board literal outside definition', () => {
    // Sweep replaced 9 sites: App.tsx, GameE2ETestFixture, helpers.runSeededSession (2×), engine.smoke, render.smoke (2×),
    // session.integration, criticalPath, directional-spawn (2×), bulletTime.atdd, adaptive rewind.
    // Literal `board: result.board` must appear only at helper definition game.ts:93.
    const hitsInGame = (gameSrc.match(/board: result\.board/g) ?? []).length;
    assert.equal(hitsInGame, 1, 'exactly 1 literal inside game.ts definition');
    // Cross-file ad-hoc remainder check: App.tsx + fixture + helpers + smoke suites must NOT contain the literal duplicated.
    // We read the deduped consumers and ensure they import stateFromResult instead.
    const appPath2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../App.tsx');
    const appSrc2 = fs.readFileSync(appPath2, 'utf8');
    assert.match(appSrc2, /stateFromResult/, 'App.tsx must import stateFromResult');
    assert.equal((appSrc2.match(/board: result\.board/g) ?? []).length, 0, 'App.tsx must not contain ad-hoc literal after dedup');
    const fixtureSrc = fs.readFileSync(fileURLToPath(new URL('../../test-utils/e2e/GameE2ETestFixture.ts', import.meta.url)), 'utf8');
    assert.match(fixtureSrc, /stateFromResult/, 'GameE2ETestFixture must import stateFromResult');
    assert.equal((fixtureSrc.match(/board: result\.board/g) ?? []).length, 0, 'fixture must not contain ad-hoc literal');
    // helpers.ts internal: snapshots/push and state= must use helper, not literal (only re-export definition counted)
    const helperLiteralOutsideDef = helpersSrc.includes('snapshots.push(stateFromResult') && helpersSrc.includes('state = stateFromResult');
    assert.ok(helperLiteralOutsideDef, 'helpers.ts must use stateFromResult for snapshots/state');
  });

  it.skip('[P0-06] AC engine + preview byte-identical except additive helper', async () => {
    // `git diff --stat -- triade/src/engine` shows game.ts +4 / index.ts 1 change, preview empty.
    // This test pins that byte-identical contract via source-level allowlist: no move/spawn/ceiling/pot/weights logic change.
    assert.equal(/function move\(/.test(gameSrc) ? 1 : 0, 1);
    assert.equal(/function newGame\(/.test(gameSrc) ? 1 : 0, 1);
    // Helper is strictly additive — does not touch move/newGame/isGameOver bodies
    assert.ok(gameSrc.includes('export function stateFromResult'), 'helper must be present');
    assert.ok(!gameSrc.includes('potForTier(0)=[]'), 'must not clamp tier-0 pot to fix exception');
  });

  it.skip('[P0-07] AC smoke/integration still green via helper (engine→helper path)', () => {
    // Lightweight pin: a 200-move session via stateFromResult never leaks and board stays bounded.
    // Full suites green is `npm test` gate; this is the harness-smoke pin.
    let state = game.newGame(mulberry32(0x1234));
    for (let i = 0; i < 200; i++) {
      const dir = (['left', 'right', 'up', 'down'] as const)[i % 4];
      const res = game.move(state, dir, mulberry32(0x9000 + i));
      if (res.moved) state = game.stateFromResult(res);
      else state = { board: res.board, pendingSpawn: res.pendingSpawn } as never; // noop path not via helper (ADR-06 shallow copy), just for counter-check
      // board 4x4 invariant
      assert.equal(state.board.length, 4);
      for (const row of state.board) assert.equal(row.length, 4);
    }
  });
});

describe('ATDD dw-preview-pot-ladder-hygiene — P1 wiring (helper→engine/scanner)', () => {
  it.skip('[P1-01] AC draw-budget preservation — move 3 draws / newGame 20 draws still exact after helper', () => {
    // Helper consumes 0 draws (pure destructure), so 3/20 budgets stay exact. Preserve adaptive-spawn-integration.test.ts:68+76.
    const base = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
    const rng3 = spyRng(0, 0.9, 0.5);
    const r3 = game.move(base, 'left', rng3 as unknown as () => number);
    assert.equal(r3.moved, true);
    assert.deepEqual((rng3 as unknown as { calls: number[] }).calls, [0, 0.9, 0.5], 'effective move exact 3 draws: pickIndex 0 + resolve 0.9 + displayRoll 0.5');
    const s3 = game.stateFromResult(r3);
    assert.deepEqual(s3, { board: r3.board, pendingSpawn: r3.pendingSpawn }, 'helper 0 draws preserves 3-draw pin');
    // newGame 20 draws: 9 pickIndex + 9 weightedValue + 1 resolve + 1 displayRoll
    const rng20 = spyRng(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.9, 0.25);
    const ng = game.newGame(rng20 as unknown as () => number);
    assert.equal((rng20 as unknown as { calls: number[] }).calls.length, 20, 'newGame exact 20 draws');
    void ng;
  });

  it.skip('[P1-02] AC helpers.ts re-export seam — import from helpers equals engine helper', () => {
    // Consumers may `import { stateFromResult } from '../../test-utils/helpers.ts'` for ergonomics.
    assert.equal(game.stateFromResult, helpersStateFromResult, 're-export must be same function (===), not fork');
    assert.equal(typeof helpersStateFromResult, 'function');
    // Static allowlist: helpers.ts has exactly one `export { stateFromResult } from` seam
    assert.equal((helpersSrc.match(/export \{ stateFromResult \}/g) ?? []).length, 1, 'single re-export seam in helpers.ts');
  });

  it.skip('[P1-03] AC runSeededSession determinism via helper — snapshots/tiers still correct', async () => {
    // runSeededSession now does snapshots.push(stateFromResult(res)) + state=stateFromResult(res).
    // Keep determinism: same seed reproduces identical snapshots/spawnValues; tiers via preSpawnBoardOf correct.
    const { runSeededSession } = await import('../../test-utils/helpers.ts');
    const a = runSeededSession(1234, 60);
    const b = runSeededSession(1234, 60);
    assert.deepEqual(a.spawnValues, b.spawnValues, 'same seed deterministic spawnValues');
    assert.deepEqual(a.snapshots.map((s) => s.board), b.snapshots.map((s) => s.board), 'same seed deterministic snapshots');
    assert.equal(a.spawnValues.length, 60);
    assert.equal(a.tieredPairs.length, 60);
  });

  it.skip('[P1-04] AC ceiling ordering companion tier>=1 v<=ceiling holds (2000 draws each 48..1536)', () => {
    // Keeps the non-trivial invariant alongside the tier-0 exception.
    for (const ceiling of [48, 96, 192, 384, 768, 1536]) {
      const rng = mulberry32(0x51ce + ceiling);
      for (let i = 0; i < 2000; i++) {
        const v = game.resolveSpawn(ceiling, rng);
        assert.ok(isValidSpawnValue(v), `ceiling ${ceiling}: spawn ${v} valid`);
        assert.ok(v <= ceiling, `tier>=1 ceiling ${ceiling}: spawn ${v} exceeds ceiling`);
      }
    }
  });

  it.skip('[P1-05] AC no old floor — rg gate for >N*0.1 plus allowlists', () => {
    assert.equal(/potSamples > N \* 0\.1/.test(weightsSrc) ? 1 : 0, 0, 'old floor literal remnant ==0');
    assert.match(weightsSrc, /sigmaBound\(POT_WEIGHT,\s*N\)/, 'new sigma gate present in weights.test.ts');
    assert.match(weightsSrc, /Math\.abs\(potRatio - POT_WEIGHT\) < 0\.01/, '±1% backstop present');
    assert.equal((gameSrc.match(/stateFromResult/g) ?? []).length, 1, 'single definition in game.ts');
  });
});

describe('ATDD dw-preview-pot-ladder-hygiene — P2 static scans', () => {
  it.skip('[P2-01] SCAN single-helper 3-site definition allowlist (game.ts + index.ts + helpers.ts)', () => {
    // 3 definition/re-export sites total; 9 consumers use it. Lite rg allowlist already in P1-05; here pin 3-site total.
    const totalDefs = (gameSrc.match(/stateFromResult/g) ?? []).length + (indexSrc.match(/stateFromResult/g) ?? []).length + (helpersSrc.match(/export \{ stateFromResult \}/g) ?? []).length;
    // game.ts has 1 def, index.ts 1 re-export, helpers.ts 1 seam = 3 literal hits of the symbol in those 3 files (module + re-exports)
    assert.ok(totalDefs >= 3, 'at least 3 definition/re-export sites');
    assert.ok(indexSrc.includes('stateFromResult'), 'index.ts must re-export');
  });

  it.skip('[P2-02] SCAN sigmaBound budget doc — comment mentions 5σ≈0.0063 vs ±1% absolute', () => {
    assert.match(weightsSrc, /5σ/, 'weights.test.ts must document 5σ budget');
    assert.match(weightsSrc, /≈0\.0063/, 'must document ≈0.0063 at 0.2,100k');
    assert.match(weightsSrc, /±1%/, 'must document ±1% backstop alongside sigma');
    assert.match(helpersSrc, /sigmaBound/, 'helpers.ts defines sigmaBound helper');
    // z=5 default
    assert.match(helpersSrc, /z\s*=\s*5/, 'sigmaBound default z=5');
  });

  it.skip('[P2-03] SCAN tier-0 domain scan — only game.ts doc + adaptive copy reference tier-0', () => {
    // Any new doc claiming tier-0 fixed without updating potForTier(0)=[3] would be missed.
    assert.match(gameSrc, /tier 0 is the/i, 'game.ts documents tier-0 exception');
    assert.match(adaptiveSrc, /tier-0 ceiling-ordering exception/i, 'adaptive documents tier-0 exception');
    // pot.ts single-source invariant
    const potSrc = fs.readFileSync(fileURLToPath(new URL('../../src/engine/core/pot.ts', import.meta.url)), 'utf8');
    assert.match(potSrc, /potForTier/, 'pot.ts defines potForTier');
  });

  it.skip('[P2-04] SCAN bulletTime.atdd import path — engine helper direct (not helpers exclusive)', () => {
    const bulletSrc = fs.readFileSync(fileURLToPath(new URL('../feel/bulletTime.atdd.test.ts', import.meta.url)), 'utf8');
    assert.match(bulletSrc, /stateFromResult/, 'bulletTime.atdd must import stateFromResult');
    assert.match(bulletSrc, /from ['"]\.\.\/\.\.\/src\/engine\/core\/index\.ts['"]/, 'bulletTime.atdd imports from engine core, not only helpers');
  });
});

describe('ATDD dw-preview-pot-ladder-hygiene — P3 exploratory / bench hygiene', () => {
  it.skip('[P3-01] SCAN stray literal exploratory — board: res.board / board: result.board outside game.ts is 0', () => {
    // Lightweight proxy: App.tsx + fixture already pinned in P0-05; here just sanity that game.ts is the only site
    assert.equal((gameSrc.match(/board: result\.board/g) ?? []).length, 1, 'game.ts single literal');
  });

  it.skip('[P3-02] BENCH stateFromResult O(1) 10k× median <0.05 ms (no clone regression)', () => {
    const b = emptyBoard();
    b[0][0] = 1;
    const res = { board: b, score: 0, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } } as never;
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) game.stateFromResult(res);
    const elapsed = performance.now() - t0;
    // 10k calls in <50ms (median <0.005 ms) — generous O(1) gate; defensive clone would still be tiny but this documents intent
    assert.ok(elapsed < 80, `stateFromResult 10k× in ${elapsed.toFixed(1)}ms must be <80ms (O(1) destructure, no clone)`);
    // Correctness across 10k
    const s = game.stateFromResult(res);
    assert.equal(s.board, b);
  });

  it.skip('[P3-03] SCAN cross-cutting absent — no music/RevenueCat/AdMob in helper/engine seam', () => {
    assert.equal(/music|RevenueCat|AdMob/i.test(gameSrc), false, 'game.ts stays in scope');
    assert.equal(/music|RevenueCat|AdMob/i.test(helpersSrc), false, 'helpers.ts stays in scope');
    assert.equal(/music|RevenueCat|AdMob/i.test(weightsSrc), false, 'weights.test.ts stays in scope');
  });
});

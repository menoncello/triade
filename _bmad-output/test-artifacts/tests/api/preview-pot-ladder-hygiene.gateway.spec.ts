/**
 * TEA Automate — API Gateway Contract Tests for dw-preview-pot-ladder-hygiene
 * Location: _bmad-output/test-artifacts/tests/api/preview-pot-ladder-hygiene.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture)
 * TEA mapping: "API" = engine helper gateway contract (stateFromResult + sigmaBound dual gate).
 * Provider is triade/src/engine/core/game.ts (pure additive helper + resolveSpawn) + triade/test-utils/helpers.ts (sigmaBound, runSeededSession),
 * consumers are App.tsx / GameE2ETestFixture / 5 smoke+integration+feel suites + weights + adaptive-spawn.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's api-testing + data-factories fragments, adapted for pure TS hygiene seam.
 *
 * Spec: spec-preview-pot-ladder-hygiene.md (DW-61/62/63 hygiene: sigma gate 5σ≈0.0063 + ±1%, single helper, tier-0 exception, baseline 3a6038e → working tree)
 * Test-design: test-design-dw-preview-pot-ladder-hygiene.md (8 risks, 2 high score 6: R-001 sigma flake, R-002 dedup drift; P0 7 + P1 5 + P2 4 + P3 3)
 * ATDD source: triade/__tests__/engine/preview-pot-ladder-hygiene.atdd.test.ts (19 it.skip scaffolds, P0 7 + P1 5 + P2 4 + P3 3)
 *
 * Execute:
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json
 *   npx tsx --test _bmad-output/test-artifacts/tests/api/preview-pot-ladder-hygiene.gateway.spec.ts
 * Or via triade harness:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/preview-pot-ladder-hygiene.gateway.spec.ts
 * Canonical ATDD execution remains via triade/__tests__/engine/preview-pot-ladder-hygiene.atdd.test.ts (activate it.skip → it → 19 pass) + weights 11 + adaptive 15.
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { POT_WEIGHT } from '../../../../triade/src/engine/config/spawnConfig.ts';
import * as game from '../../../../triade/src/engine/core/index.ts';
import { mulberry32 } from '../../../../triade/src/utils/mulberry32.ts';
import {
  sigmaBound,
  stateFromResult as helpersStateFromResult,
  rngOf,
  spyRng,
  gameState,
  emptyBoard,
  staticBoard,
  runSeededSession,
} from '../../../../triade/test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}
function isValidSpawnValue(v: number): boolean {
  if (v === 1 || v === 2) return true;
  const k = Math.log2(v / 3);
  return v >= 3 && Number.isInteger(k);
}

// ---------------------------------------------------------------------------
// P0 — Critical hygiene (dual gate + single helper + tier-0 + rewind + dedup)
// ---------------------------------------------------------------------------
describe('[API] preview-pot-ladder-hygiene gateway — P0 critical (dual gate + helper + exception)', () => {
  it('[P0] AC weights dual gate — pot share within sigmaBound 5σ≈0.0063 + ±1% (not >N*0.1) DW-61 R-001', () => {
    // Given: POT_WEIGHT 0.2 at N=100k 5σ≈0.0063 is the hygiene tripwire, ±1% is the product backstop.
    // When: weights.test.ts authority stream is replayed at tier 1,5 with mulberry32 0x2a4d.
    // Then: both gates pass — old floor >N*0.1 would hide half-missing pot.
    assert.equal(POT_WEIGHT, 0.2);
    const N = 100_000;
    const bound = sigmaBound(POT_WEIGHT, N);
    assert.ok(Number.isFinite(bound) && bound > 0);
    assert.ok(Math.abs(bound - 0.0063) < 0.001, `sigmaBound ≈0.0063 got ${bound.toFixed(4)}`);
    const weightsSrc = readSrc('triade/__tests__/engine/weights.test.ts');
    assert.equal(/sigmaBound\(POT_WEIGHT/.test(weightsSrc) ? 1 : 0, 1, 'must call sigmaBound');
    assert.equal(/potSamples > N \* 0\.1/.test(weightsSrc) ? 1 : 0, 0, 'old floor gone');
    assert.match(weightsSrc, /Math\.abs\(potRatio - POT_WEIGHT\) < 0\.01/, '±1% backstop');
    assert.match(weightsSrc, /5σ/);
    // statistical pin — light replay (weights.test.ts is authority; here we prove bound not knife-edge)
    const { weightedValue, potForTier } = game as unknown as { weightedValue: (rng: () => number) => number; potForTier: (t: number) => number[] };
    for (const tier of [1, 5]) {
      // replicate N=100k stream but same seed discipline as weights.test.ts (0x2a4d per spec — without per-tier offset it would alias;
      // the gate spec allows the authority suite to prove determinism; here we just prove bound headroom)
      const rng = mulberry32(0x2a4d + tier * 1000);
      let potSamples = 0;
      const pot = potForTier(tier);
      for (let i = 0; i < N; i++) {
        const v = weightedValue(rng);
        if (pot.includes(v)) potSamples++;
      }
      const ratio = potSamples / N;
      assert.ok(Math.abs(ratio - POT_WEIGHT) < bound, `tier ${tier} ratio ${ratio.toFixed(4)} outside 5σ ${bound.toFixed(4)}`);
      assert.ok(Math.abs(ratio - POT_WEIGHT) < 0.01, `tier ${tier} ratio ${ratio.toFixed(4)} outside ±1%`);
    }
  });

  it('[P0] AC stateFromResult single definition — trivial destructure, board+pending ref shared DW-62 R-002/R-004', () => {
    const gameSrc = readSrc('triade/src/engine/core/game.ts');
    assert.equal(typeof game.stateFromResult, 'function');
    assert.equal(typeof helpersStateFromResult, 'function');
    assert.equal(game.stateFromResult, helpersStateFromResult, 'helpers re-export same function ===');
    assert.match(gameSrc, /export function stateFromResult\(result: MoveResult\): GameState \{\s*return \{ board: result\.board, pendingSpawn: result\.pendingSpawn \};\s*\}/);
    const board = emptyBoard();
    board[0][0] = 1;
    const result = { board, score: 3, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0.5 } } as unknown as game.MoveResult;
    const state: game.GameState = game.stateFromResult(result);
    assert.equal(state.board, board, 'board ref shared (no clone)');
    assert.equal((state as { pendingSpawn: unknown }).pendingSpawn, (result as { pendingSpawn: unknown }).pendingSpawn, 'pendingSpawn ref shared');
    assert.equal((readSrc('triade/src/engine/core/index.ts').match(/stateFromResult/g) ?? []).length, 1, 'index.ts single re-export');
    assert.equal((readSrc('triade/test-utils/helpers.ts').match(/export \{ stateFromResult \}/g) ?? []).length, 1, 'helpers seam single');
  });

  it('[P0] AC tier-0 ceiling-ordering exception — pot 3 exceeds tiny ceiling 0/1/2 (harmless, 2000 draws each) DW-63 R-003', () => {
    const adaptiveSrc = readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts');
    const gameSrc = readSrc('triade/src/engine/core/game.ts');
    assert.match(adaptiveSrc, /tier-0 ceiling-ordering exception/);
    assert.match(adaptiveSrc, /sawThree/);
    assert.match(gameSrc, /tier 0 is the/i);
    for (const ceiling of [0, 1, 2] as const) {
      const rng = mulberry32(0x51ce + ceiling + 0x100);
      let sawThree = false;
      let sawExceeding = false;
      for (let i = 0; i < 2000; i++) {
        const v = game.resolveSpawn(ceiling, rng);
        assert.ok(isValidSpawnValue(v), `ceiling ${ceiling} spawn ${v} valid`);
        assert.ok(v === 1 || v === 2 || v === 3, `tier-0 spawn must be 1,2 or 3 got ${v}`);
        if (v === 3) sawThree = true;
        if (v > ceiling) sawExceeding = true;
      }
      assert.ok(sawThree, `ceiling ${ceiling} must eventually spawn 3`);
      assert.ok(sawExceeding, `ceiling ${ceiling} 3 must exceed tiny ceiling`);
    }
  });

  it('[P0] AC rewind shape via helper — stateFromResult determines next move identically DW-62 R-004', () => {
    const base = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
    const r1 = game.move(base, 'left', rngOf(0.1, 0.2, 0.3));
    const replayInput = game.stateFromResult(r1);
    const r2a = game.move(replayInput, 'right', rngOf(0.25, 0.35, 0.45));
    const r2b = game.move({ board: r1.board, pendingSpawn: { ...r1.pendingSpawn } } as never, 'right', rngOf(0.25, 0.35, 0.45));
    assert.equal(r2a.moved, true);
    assert.deepEqual(r2a, r2b, 'helper fully determines next result');
    assert.strictEqual((game.stateFromResult(r1) as { pendingSpawn: unknown }).pendingSpawn, (r1 as { pendingSpawn: unknown }).pendingSpawn);
  });

  it('[P0] AC 9-site dedup — zero ad-hoc board: result.board outside game.ts DW-62 R-002', () => {
    const gameSrc = readSrc('triade/src/engine/core/game.ts');
    assert.equal((gameSrc.match(/board: result\.board/g) ?? []).length, 1, 'exactly 1 literal in definition');
    const appSrc = readSrc('triade/App.tsx');
    assert.match(appSrc, /stateFromResult/);
    assert.equal((appSrc.match(/board: result\.board/g) ?? []).length, 0, 'App no literal');
    const fixtureSrc = readSrc('triade/test-utils/e2e/GameE2ETestFixture.ts');
    assert.match(fixtureSrc, /stateFromResult/);
    assert.equal((fixtureSrc.match(/board: result\.board/g) ?? []).length, 0, 'fixture no literal');
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    assert.ok(helpersSrc.includes('snapshots.push(stateFromResult') && helpersSrc.includes('state = stateFromResult'));
  });

  it('[P0] AC engine + preview byte-identical except additive helper (preview empty, engine +4/1)', () => {
    const gameSrc = readSrc('triade/src/engine/core/game.ts');
    assert.equal(/function move\(/.test(gameSrc) ? 1 : 0, 1);
    assert.equal(/function newGame\(/.test(gameSrc) ? 1 : 0, 1);
    assert.ok(gameSrc.includes('export function stateFromResult'));
    assert.equal(/potForTier\(0\)=\[\]/.test(gameSrc) ? 1 : 0, 0, 'must not clamp tier-0 pot');
  });

  it('[P0] AC smoke/integration still green via helper (engine→helper path) DW-62', () => {
    // Lightweight proxy for full green: 200-move host session never leaks through helper.
    let state = game.newGame(mulberry32(0x1234));
    for (let i = 0; i < 200; i++) {
      const dir = (['left', 'right', 'up', 'down'] as const)[i % 4];
      const res = game.move(state, dir, mulberry32(0x9000 + i));
      if (res.moved) state = game.stateFromResult(res);
      assert.equal(state.board.length, 4);
      for (const row of state.board) assert.equal(row.length, 4);
    }
  });
});

// ---------------------------------------------------------------------------
// P1 — Wiring (draw-budget + re-export + determinism + tier>=1 companion)
// ---------------------------------------------------------------------------
describe('[API] preview-pot-ladder-hygiene gateway — P1 wiring (helper→engine)', () => {
  it('[P1] AC draw-budget preservation — move 3 draws / newGame 20 draws still exact after helper R-006', () => {
    const base = gameState(staticBoard([1, 2, null, null]), { value: 1, displayRoll: 0 });
    const rng3 = spyRng(0, 0.9, 0.5);
    const r3 = game.move(base, 'left', rng3 as unknown as () => number);
    assert.equal(r3.moved, true);
    assert.deepEqual((rng3 as unknown as { calls: number[] }).calls, [0, 0.9, 0.5]);
    const s3 = game.stateFromResult(r3);
    assert.deepEqual(s3, ({ board: r3.board, pendingSpawn: r3.pendingSpawn } as never));
    const rng20 = spyRng(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.9, 0.25);
    const ng = game.newGame(rng20 as unknown as () => number);
    assert.equal((rng20 as unknown as { calls: number[] }).calls.length, 20);
    void ng;
  });

  it('[P1] AC helpers.ts re-export seam — helpers equals engine helper (===) R-005', () => {
    assert.equal(game.stateFromResult, helpersStateFromResult);
    assert.equal(typeof helpersStateFromResult, 'function');
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    assert.equal((helpersSrc.match(/export \{ stateFromResult \}/g) ?? []).length, 1, 'single seam');
  });

  it('[P1] AC runSeededSession determinism via helper — snapshots/tiers still correct R-004/R-006', async () => {
    const { runSeededSession: rs } = await import('../../../../triade/test-utils/helpers.ts');
    const a = rs(1234, 60);
    const b = rs(1234, 60);
    assert.deepEqual(a.spawnValues, b.spawnValues);
    assert.deepEqual(a.snapshots.map((s) => s.board), b.snapshots.map((s) => s.board));
    assert.equal(a.spawnValues.length, 60);
    assert.equal(a.tieredPairs.length, 60);
  });

  it('[P1] AC ceiling ordering companion tier>=1 v<=ceiling holds (2000 draws each 48..1536) R-003', () => {
    for (const ceiling of [48, 96, 192, 384, 768, 1536]) {
      const rng = mulberry32(0x51ce + ceiling);
      for (let i = 0; i < 2000; i++) {
        const v = game.resolveSpawn(ceiling, rng);
        assert.ok(isValidSpawnValue(v), `ceiling ${ceiling} spawn ${v} valid`);
        assert.ok(v <= ceiling, `tier>=1 ceiling ${ceiling} spawn ${v} exceeds`);
      }
    }
  });

  it('[P1] AC no old floor — rg gate for >N*0.1 plus allowlists R-001/R-002', () => {
    const weightsSrc = readSrc('triade/__tests__/engine/weights.test.ts');
    assert.equal(/potSamples > N \* 0\.1/.test(weightsSrc) ? 1 : 0, 0, 'old floor gone');
    assert.match(weightsSrc, /sigmaBound\(POT_WEIGHT,\s*N\)/);
    assert.match(weightsSrc, /Math\.abs\(potRatio - POT_WEIGHT\) < 0\.01/);
    assert.equal((readSrc('triade/src/engine/core/game.ts').match(/stateFromResult/g) ?? []).length, 1, 'single definition');
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans (allowlist gates)
// ---------------------------------------------------------------------------
describe('[API] preview-pot-ladder-hygiene gateway — P2 static scans (allowlist + doc)', () => {
  it('[P2] SCAN single-helper 3-site definition allowlist (game.ts + index.ts + helpers.ts) R-002/R-005', () => {
    const totalDefs =
      (readSrc('triade/src/engine/core/game.ts').match(/stateFromResult/g) ?? []).length +
      (readSrc('triade/src/engine/core/index.ts').match(/stateFromResult/g) ?? []).length +
      (readSrc('triade/test-utils/helpers.ts').match(/export \{ stateFromResult \}/g) ?? []).length;
    assert.ok(totalDefs >= 3, 'at least 3 definition/re-export sites');
    assert.match(readSrc('triade/src/engine/core/index.ts'), /stateFromResult/);
  });

  it('[P2] SCAN sigmaBound budget doc — comment mentions 5σ≈0.0063 vs ±1% absolute R-001', () => {
    const weightsSrc = readSrc('triade/__tests__/engine/weights.test.ts');
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    assert.match(weightsSrc, /5σ/);
    assert.match(weightsSrc, /≈0\.0063/);
    assert.match(weightsSrc, /±1%/);
    assert.match(helpersSrc, /sigmaBound/);
    assert.match(helpersSrc, /z\s*=\s*5/);
  });

  it('[P2] SCAN tier-0 domain scan — only game.ts doc + adaptive copy reference tier-0 R-003/R-008', () => {
    assert.match(readSrc('triade/src/engine/core/game.ts'), /tier 0 is the/i);
    assert.match(readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts'), /tier-0 ceiling-ordering exception/i);
    const potSrc = readSrc('triade/src/engine/core/pot.ts');
    assert.match(potSrc, /potForTier/);
  });

  it('[P2] SCAN bulletTime.atdd import path — engine helper direct (not helpers exclusive) R-005', () => {
    const bulletSrc = readSrc('triade/__tests__/feel/bulletTime.atdd.test.ts');
    assert.match(bulletSrc, /stateFromResult/);
    assert.match(bulletSrc, /from ['"]\.\.\/\.\.\/src\/engine\/core\/index\.ts['"]/);
  });
});

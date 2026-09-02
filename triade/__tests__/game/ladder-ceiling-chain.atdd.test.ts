/**
 * LADDER-CEILING END-TO-END CHAIN PIN — DW-103
 *
 * Thin-view is intentional per spec: `GameOverOverlay` only reads `stats.maxTile`
 * and `isNewRecord(match.best|sessionStartBest)` props and never imports
 * `ceilingDetector|tierForCeiling|potForTier` (ADR-01 purity). This suite pins
 * the *engine* chain beyond the overlay prop, proving the ladder itself plus
 * the App wiring that derives `availablePot` and the `isNewRecord` session-start
 * gating (leak via `match.best` alias not Runtime-pinned).
 *
 * Chain: ceilingDetector(board) → tierForCeiling(ceiling) → potForTier(tier)
 *        App's live derivation must be potForTier(tierForCeiling(ceilingDetector(game.board)))
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ceilingDetector, tierForCeiling } from '../../src/engine/core/ceiling.ts';
import { potForTier } from '../../src/engine/core/pot.ts';
import { boardWith, emptyBoard } from '../../test-utils/helpers.ts';
import { isNewRecord } from '../../src/game/matchScore.ts';
import { stripCommentsAndStrings } from '../../test-utils/helpers.ts';
import type { Board } from '../../src/engine/core/types.ts';

const here = dirname(fileURLToPath(import.meta.url));

function boardWithMax(max: number | null): Board {
  if (max === null || max === 0) return emptyBoard();
  const b = emptyBoard();
  b[0][0] = max;
  return b;
}

// ── Chain mapping ─────────────────────────────────────────────────────────

test('[P0] DW-103 ladder chain end-to-end: ceilingDetector→tierForCeiling→potForTier matches expected ladder', () => {
  // Spec ladder: <48→0, 48→1, 96→2, 192→3, 384→4, 768→5, 1536→6, 3072→7
  const cases: Array<{ ceiling: number; tier: number; pot: number[] }> = [
    { ceiling: 0, tier: 0, pot: [3] },
    { ceiling: 3, tier: 0, pot: [3] },
    { ceiling: 12, tier: 0, pot: [3] },
    { ceiling: 24, tier: 0, pot: [3] },
    { ceiling: 47, tier: 0, pot: [3] },
    { ceiling: 48, tier: 1, pot: [3, 6] },
    { ceiling: 96, tier: 2, pot: [3, 6, 12] },
    { ceiling: 192, tier: 3, pot: [3, 6, 12, 24] },
    { ceiling: 384, tier: 4, pot: [3, 6, 12, 24, 48] },
    { ceiling: 768, tier: 5, pot: [3, 6, 12, 24, 48, 96] },
    { ceiling: 1536, tier: 6, pot: [3, 6, 12, 24, 48, 96, 192] },
    { ceiling: 3072, tier: 7, pot: [3, 6, 12, 24, 48, 96, 192, 384] },
  ];
  for (const { ceiling, tier, pot } of cases) {
    const board = boardWithMax(ceiling === 0 ? null : ceiling);
    const detected = ceilingDetector(board);
    // Empty board ceiling is 0
    const expectedDetected = ceiling === 0 ? 0 : ceiling;
    assert.strictEqual(detected, expectedDetected, `ceilingDetector for max ${ceiling}`);
    const gotTier = tierForCeiling(detected);
    assert.strictEqual(gotTier, tier, `tierForCeiling(${detected}) → ${tier}`);
    const gotPot = [...potForTier(gotTier)];
    assert.deepStrictEqual(gotPot, pot, `potForTier(${gotTier}) for ceiling ${ceiling}`);
    // End-to-end: availablePot pipeline as App derives it
    const availablePot = [...potForTier(tierForCeiling(ceilingDetector(board)))];
    assert.deepStrictEqual(availablePot, pot, `chain availablePot for ceiling ${ceiling}`);
  }
});

test('[P0] DW-103 App wiring pin: App.tsx derives availablePot = potForTier(tierForCeiling(ceilingDetector(game.board))) once per render', () => {
  const src = readFileSync(join(here, '../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  // Overlay must stay thin-view: no ladder imports
  assert.ok(!/ceilingDetector|tierForCeiling|potForTier/.test(stripped), 'GameOverOverlay must not reference ladder chain (thin-view)');

  const appSrc = readFileSync(join(here, '../../App.tsx'), 'utf8');
  assert.ok(
    /availablePot\s*=\s*potForTier\s*\(\s*tierForCeiling\s*\(\s*ceilingDetector\s*\(\s*game\.board\s*\)/.test(appSrc),
    'App.tsx must contain availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)))'
  );
});

test('[P0] DW-103 isNewRecord session-start gating pin: sessionStartBest, not match.best alias', () => {
  const appSrc = readFileSync(join(here, '../../App.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(appSrc);

  // Session-start ref gating
  assert.ok(/isNewRecord\s*\(\s*sessionStartBest/.test(stripped), 'App must call isNewRecord(sessionStartBest*...)');
  assert.ok(/isNewRecord=\{isNewRecord\(sessionStartBest/.test(appSrc), 'GameOverOverlay isNewRecord prop must be isNewRecord(sessionStartBest*Ref.current, match.score)');

  // Anti-leak: handleRestart must never overwrite sessionStartBest*Ref
  const handleStart = appSrc.indexOf('const handleRestart');
  assert.ok(handleStart !== -1, 'handleRestart must exist');
  const handleSlice = appSrc.slice(handleStart, handleStart + 1500);
  const handleStripped = stripCommentsAndStrings(handleSlice);
  assert.ok(!/sessionStartBest.*\.current\s*=/.test(handleStripped), 'handleRestart must never write sessionStartBest*Ref.current');

  // Runtime pin: isNewRecord semantics (alias leak would hide record after best==score)
  assert.strictEqual(isNewRecord(0, 0), false, 'isNewRecord(0,0) false — first 0 not a record (strict >)');
  assert.strictEqual(isNewRecord(0, 1), true, 'isNewRecord(0,1) true');
  assert.strictEqual(isNewRecord(100, 150), true);
  assert.strictEqual(isNewRecord(150, 150), false, 'isNewRecord(live best 150, score 150) false — alias leak pin (matchScore.test.ts:58-65)');
  assert.strictEqual(isNewRecord(100, 100), false);
});

test('[P1] DW-103 ceiling ladder produces no overlay celebration beyond isNewRecord number highlight', () => {
  // This is a docs/purity pin that the ladder growing does not introduce a tier-crossing banner
  // in the overlay — already covered by gameOverOverlay.recordHighlight.test.ts thin-view check,
  // but pinned here as chain-level invariant: pot growth alone never triggers UI celebration.
  const src = readFileSync(join(here, '../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  assert.ok(!/confetti|celebrat|lottie|reward|particleBurst|shakeMs/i.test(stripped), 'overlay must not contain celebration symbols');
  assert.ok(stripped.includes('isNewRecord'), 'overlay highlight must still be gated by isNewRecord only');
});

test('[P1] DW-103 board maxTile via matchStats chain equals ceilingDetector(board)', async () => {
  // End-to-end through matchStats: initialStats → ceilingDetector, applyMoveStats → max(maxTile, ceilingDetector(board))
  const { initialStats, applyMoveStats } = await import('../../src/game/matchStats.ts');
  const b48 = boardWithMax(48);
  const b96 = boardWithMax(96);
  const s0 = initialStats(b48);
  assert.strictEqual(s0.maxTile, 48, 'initialStats maxTile == ceilingDetector(board) for 48');
  const fakeRes: any = { trace: [], board: b96 };
  const s1 = applyMoveStats(s0, b96, fakeRes);
  assert.strictEqual(s1.maxTile, 96, 'applyMoveStats maxTile tracks max of prev and new ceiling');
  // Deflate case: board max drops but maxTile is monotonic
  const b3 = boardWithMax(3);
  const s2 = applyMoveStats(s1, b3, { trace: [], board: b3 } as any);
  assert.strictEqual(s2.maxTile, 96, 'maxTile never deflates even when board ceiling drops');
});

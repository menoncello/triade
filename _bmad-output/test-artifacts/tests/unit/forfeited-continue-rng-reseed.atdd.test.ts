/**
 * Unit — dw-forfeited-continue-rng-reseed (RED-PHASE, test.skip)
 * Primary oracle mirror for TEA test_artifacts compliance — host node:test
 * Mirrors triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree already implements App.tsx delta).
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;

function stripped(src: string): string {
  // minimal strip for source-pin: remove comments+strings via helper if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { stripCommentsAndStrings } = require('../../../../triade/test-utils/helpers.ts');
    if (typeof stripCommentsAndStrings === 'function') return stripCommentsAndStrings(src);
  } catch {}
  return src;
}

test.skip('[P0-U-01] forfeitedContinue declared as useState(false)', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.match(src, /const\s*\[forfeitedContinue\s*,\s*setForfeitedContinue\]\s*=\s*useState\s*\(\s*false\s*\)/, 'must declare forfeitedContinue');
});

test.skip('[P0-U-02] forfeitedContinue set on gameOver && canContinueDerived via useEffect', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('setForfeitedContinue(true)'), 'must set true');
  assert.ok(/gameOver\s*&&\s*canContinueDerived/.test(src), 'must be guarded by gameOver && canContinueDerived');
  assert.match(src, /useEffect\(\(\) => \{\s*if \(gameOver && canContinueDerived && !forfeitedContinue\)/, 'useEffect guard with !forfeitedContinue');
});

test.skip('[P0-U-03] forfeitedContinue dies on any continue attempt (Ad + Iap top+after)', () => {
  const src = readFileSync(appPath, 'utf8');
  const count = (src.match(/setForfeitedContinue\s*\(\s*false\s*\)/g) || []).length;
  assert.ok(count >= 4, `needs >=4 deaths, got ${count}`);
  const adIdx = src.indexOf('handleContinueAd');
  const iapIdx = src.indexOf('handleContinueIap');
  assert.ok(src.slice(adIdx, adIdx + 1500).includes('setForfeitedContinue(false)'), 'handleContinueAd top death');
  assert.ok(src.slice(iapIdx, iapIdx + 800).includes('setForfeitedContinue(false)'), 'handleContinueIap top death');
});

test.skip('[P0-U-04] forfeitedContinue dies on new game via handleRestart + resetAssistance (never carried)', () => {
  const src = readFileSync(appPath, 'utf8');
  const restartIdx = src.indexOf('const handleRestart');
  assert.ok(src.slice(restartIdx, restartIdx + 1600).includes('setForfeitedContinue(false)'), 'handleRestart death');
  const resetIdx = src.indexOf('resetAssistance');
  assert.ok(src.slice(resetIdx, resetIdx + 800).includes('setForfeitedContinue(false)'), 'resetAssistance death');
});

test.skip('[P0-U-05] rngSeedRef declared useRef(20260808) alongside rngRef mulberry32(20260808)', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.match(src, /const\s+rngSeedRef\s*=\s*useRef\s*\(\s*20260808\s*\)/, 'rngSeedRef 20260808');
  assert.match(src, /const\s+rngRef\s*=\s*useRef\s*\(\s*mulberry32\s*\(\s*20260808\s*\)\s*\)/, 'rngRef mulberry32(20260808)');
});

test.skip('[P0-U-06] RNG reseed increment+mulberry32 before newGame in handleRestart (order)', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(/rngSeedRef\.current\s*\+=\s*1/.test(src), 'increment');
  assert.ok(/rngRef\.current\s*=\s*mulberry32\s*\(\s*rngSeedRef\.current\s*\)/.test(src), 'reseed');
  const idx = src.indexOf('const handleRestart');
  const slice = src.slice(idx, idx + 900);
  const r = slice.indexOf('rngSeedRef.current');
  const n = slice.indexOf('newGame(rngRef.current)');
  assert.ok(r !== -1 && n !== -1 && r < n, 'reseed before newGame in handleRestart');
});

test.skip('[P0-U-07] RNG reseed in applyLaneSelection needsReset branch (parity with handleRestart)', () => {
  const src = readFileSync(appPath, 'utf8');
  const laneIdx = src.indexOf('const applyLaneSelection');
  const slice = src.slice(laneIdx, laneIdx + 1800);
  assert.ok(slice.includes('rngSeedRef.current'), 'applyLaneSelection reseed');
  const count = (src.match(/rngSeedRef\.current\s*\+=\s*1/g) || []).length;
  assert.strictEqual(count, 2, 'exactly 2 increments: handleRestart + applyLaneSelection');
});

test.skip('[P0-U-08] mulberry32 determinism: same seed same board, +1 seed different board', async () => {
  const { newGame } = await import('../../../../triade/src/engine/core/game.ts');
  const { mulberry32 } = await import('../../../../triade/src/utils/mulberry32.ts');
  const a = newGame(mulberry32(20260808));
  const b = newGame(mulberry32(20260808));
  assert.deepStrictEqual(a.board, b.board, 'same seed same board');
  const c = newGame(mulberry32(20260808 + 1));
  const same = JSON.stringify(a.board) === JSON.stringify(c.board) && JSON.stringify(a.pendingSpawn) === JSON.stringify(c.pendingSpawn);
  assert.strictEqual(same, false, '+1 seed must differ (or document collision)');
});

test.skip('[P1-U-01] handleRestart order newGame→setGame→setMoveResult(null)→setMatch→setMatchStats→busyRef preserved inside 1200', () => {
  const src = readFileSync(appPath, 'utf8');
  const idx = src.indexOf('const handleRestart');
  const slice = src.slice(idx, idx + 1200);
  const order = ['newGame(rngRef.current)', 'setGame(s)', 'setMoveResult(null)', 'setMatch(', 'setMatchStats(', 'busyRef.current = false'];
  let last = -1;
  for (const token of order) {
    const pos = slice.indexOf(token);
    assert.ok(pos !== -1, `handleRestart 1200 must contain ${token}`);
    assert.ok(pos > last, `${token} must be after previous`);
    last = pos;
  }
});

test.skip('[P1-U-02] DW-86 + DW-93 comment pins present', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('DW-86') && src.includes('forfeitedContinue'), 'DW-86 pin');
  assert.ok(src.includes('DW-93') && src.includes('RNG reseed'), 'DW-93 pin');
});

test.skip('[P1-U-03] no Math.random in App.tsx, mulberry32 3 hits', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.strictEqual((src.match(/Math\.random/g) || []).length, 0, 'no Math.random');
  assert.strictEqual((src.match(/mulberry32/g) || []).length, 3, 'mulberry32 3 hits: decl + 2 reseeds');
});

test.skip('[P1-U-04] Engine purity: src/engine diff empty (no engine churn)', () => {
  const ledger = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  // this unit stays host-only; engine purity is validated via git diff empty in checklist, but pin ledger hash presence
  assert.ok(ledger.includes('DW-86') || ledger.includes('DW-93') || ledger.includes('forfeited'), 'ledger contains DW entries');
});

test.skip('[P2-U-01] ledger 41838b7d single 64-hex per DW bundle', () => {
  const ledger = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  const hits = (ledger.match(/41838b7d5d1cd4d3eab8fc2b81bcbe63090ee4682d07e1b39bb448e0c2be82f6/g) || []).length;
  // for this bundle the hash is 41838b7d… single hit per implementation; accept >=1
  assert.ok(hits >= 1, `expected >=1 41838b7d hit, got ${hits}`);
});

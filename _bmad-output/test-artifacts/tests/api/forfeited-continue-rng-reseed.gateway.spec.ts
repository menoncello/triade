/**
 * API Gateway — dw-forfeited-continue-rng-reseed (RED-PHASE, test.skip)
 * ForfeitedContinue flag + RNG reseed seam — host node:test + tsx, no network
 * Mirrors triade/__tests__/ui/components/app.forfeited-continue-rng-reseed.test.ts P0/P1
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;

test.skip('[P0-API-01] forfeitedContinue declare useState(false) present', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.match(src, /const\s*\[forfeitedContinue\s*,\s*setForfeitedContinue\]\s*=\s*useState\s*\(\s*false\s*\)/);
});

test.skip('[P0-API-02] forfeitedContinue setForfeitedContinue(true) guarded by gameOver && canContinueDerived', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('setForfeitedContinue(true)'));
  assert.ok(/gameOver\s*&&\s*canContinueDerived/.test(src));
});

test.skip('[P0-API-03] forfeitedContinue deaths >=4: handleContinueAd + handleContinueIap + handleRestart + resetAssistance', () => {
  const src = readFileSync(appPath, 'utf8');
  const count = (src.match(/setForfeitedContinue\s*\(\s*false\s*\)/g) || []).length;
  assert.ok(count >= 4, `got ${count}`);
});

test.skip('[P0-API-04] rngSeedRef useRef(20260808) and reseed increment before newGame', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.match(src, /const\s+rngSeedRef\s*=\s*useRef\s*\(\s*20260808\s*\)/);
  assert.ok(/rngSeedRef\.current\s*\+=\s*1/.test(src));
  assert.ok(/rngRef\.current\s*=\s*mulberry32\s*\(\s*rngSeedRef\.current\s*\)/.test(src));
});

test.skip('[P0-API-05] handleRestart reseed before newGame + order newGame→setGame→setMoveResult(null)', () => {
  const src = readFileSync(appPath, 'utf8');
  const idx = src.indexOf('const handleRestart');
  const slice = src.slice(idx, idx + 900);
  assert.ok(slice.indexOf('rngSeedRef.current') < slice.indexOf('newGame(rngRef.current)'));
  assert.ok(slice.includes('setGame(s)') && slice.includes('setMoveResult(null)'));
});

test.skip('[P0-API-06] mulberry32 determinism replay same seed same board +1 different', async () => {
  const { newGame } = await import('../../../../triade/src/engine/core/game.ts');
  const { mulberry32 } = await import('../../../../triade/src/utils/mulberry32.ts');
  const a = newGame(mulberry32(20260808));
  const b = newGame(mulberry32(20260808));
  assert.deepStrictEqual(a.board, b.board);
  const c = newGame(mulberry32(20260809));
  assert.notDeepStrictEqual(JSON.stringify(a.board), JSON.stringify(c.board));
});

test.skip('[P1-API-01] applyLaneSelection needsReset reseed parity 2 increments total', () => {
  const src = readFileSync(appPath, 'utf8');
  const count = (src.match(/rngSeedRef\.current\s*\+=\s*1/g) || []).length;
  assert.strictEqual(count, 2);
});

test.skip('[P1-API-02] handleContinueAd top death before hasNoAds/adBusy guard', () => {
  const src = readFileSync(appPath, 'utf8');
  const adIdx = src.indexOf('handleContinueAd');
  const slice = src.slice(adIdx, adIdx + 1500);
  assert.ok(slice.includes('setForfeitedContinue(false)'));
  assert.ok(slice.indexOf('setForfeitedContinue(false)') < slice.indexOf('hasNoAds'));
});

test.skip('[P1-API-03] no Math.random in App.tsx, mulberry32 3 hits', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.strictEqual((src.match(/Math\.random/g) || []).length, 0);
  assert.strictEqual((src.match(/mulberry32/g) || []).length, 3);
});

test.skip('[P1-API-04] ledger DW-86+DW-93 done status', () => {
  const ledger = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname, 'utf8');
  assert.ok(ledger.includes('forfeited') || ledger.includes('DW-86'));
});

test.skip('[P2-API-01] DW-86/DW-93 comment pins', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('DW-86') && src.includes('forfeitedContinue'));
  assert.ok(src.includes('DW-93') && src.includes('RNG reseed'));
});

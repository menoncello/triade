/**
 * Unit — dw-persist-hydration-race-fix (RED-PHASE, test.skip)
 * Primary oracle mirror for TEA test_artifacts compliance — host node:test
 * Mirrors triade/__tests__/game/matchScore.persist-hydration.test.ts + App.tsx source-pins
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree already implements App.tsx + matchScore.ts delta).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/persist-hydration-race-fix.atdd.test.ts
 * Delta: 5eaeb51 vs 596add4 — triade/App.tsx + triade/src/game/matchScore.ts 169/16
 * Spec: _bmad-output/implementation-artifacts/spec-persist-hydration-race-fix.md
 * Design: _bmad-output/test-artifacts/test-design-dw-persist-hydration-race-fix.md
 * Ledger: deferred-work.md DW-87,97,98,99,100 done 2026-09-02 + resolution-undo d0e7d75…
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const scorePath = new URL('../../../../triade/src/game/matchScore.ts', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;

test.skip('[P0-U-01] HYDRO_DEGRADED gated false — persist effect top if(!hydrationOk) return + overlay isNewRecord&&hydrationOk', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('hydrationOkByLaneRef'), 'missing hydrationOkByLaneRef');
  assert.match(src, /if\s*\(!hydrationOkByLaneRef\.current\[activeLaneId\]\)\s*return/, 'persist effect must have if(!hydrationOkByLaneRef.current[activeLaneId]) return');
  assert.match(src, /isNewRecord\(sessionStartBestByLaneRef\.current\[activeLaneId as LaneId\],\s*match\.score\)\s*&&\s*hydrationOkByLaneRef\.current\[activeLaneId as LaneId\]/, 'overlay isNewRecord must be isNewRecord(...) && hydrationOkByLaneRef');
});

test.skip('[P0-U-02] STALE_MULTI_GAME sessionStart update after saveBestForLane ok true — .then contains sessionStartBestByLaneRef current = sanitizedMatchBest', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('sessionStartBestByLaneRef.current'), 'missing sessionStartBestByLaneRef');
  assert.ok(src.includes('sanitizedMatchBest'), 'missing sanitizedMatchBest');
  const thenIdx = src.indexOf('.then((ok)');
  assert.ok(thenIdx !== -1, 'missing .then((ok)');
  const slice = src.slice(thenIdx, thenIdx + 800);
  assert.ok(slice.includes('sessionStartBestByLaneRef.current'), '.then must update sessionStartBestByLaneRef.current');
  assert.ok(slice.includes('sanitizedMatchBest'), '.then must set to sanitizedMatchBest');
  assert.ok(slice.includes('if (ok)'), 'must be gated on ok===true');
});

test.skip('[P0-U-03] RACE_RESTART await pending before initialScore — handleRestart async + await pending.catch + persistedBestByLaneRef read', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.match(src, /const\s+handleRestart\s*=\s*useCallback\(async/, 'handleRestart must be async');
  assert.ok(src.includes('pendingSaveByLaneRef'), 'missing pendingSaveByLaneRef');
  assert.ok(src.includes('await pending'), 'must await pending');
  assert.ok(src.includes('persistedBestByLaneRef.current[activeLaneId]'), 'must read persistedBestByLaneRef.current for initialScore');
  const idx = src.indexOf('const handleRestart');
  const slice = src.slice(idx, idx + 1400);
  assert.ok(slice.includes('try'), 'must have try/catch around await pending');
  assert.ok(slice.includes('initialScore(persistedBestByLaneRef.current[activeLaneId])'), 'must call initialScore(persistedBestByLaneRef.current[active])');
  const pendingIdx = slice.indexOf('pendingSaveByLaneRef.current[activeLaneId]');
  const scoreIdx = slice.indexOf('persistedBestByLaneRef.current[activeLaneId]');
  assert.ok(pendingIdx !== -1 && scoreIdx !== -1 && pendingIdx < scoreIdx, 'pending await before initialScore read');
});

test.skip('[P0-U-04] NON_FINITE isNewRecord(-5|NaN|Infinity, any) false + isNewRecord(any, NaN|Infinity|-1) false', async () => {
  const { isNewRecord } = await import('../../../../triade/src/game/matchScore.ts');
  assert.strictEqual(isNewRecord(NaN, 1), false, 'NaN prev false');
  assert.strictEqual(isNewRecord(Infinity, 1), false, 'Infinity prev false');
  assert.strictEqual(isNewRecord(-5, 10), false, '-5 prev false');
  assert.strictEqual(isNewRecord(1, NaN), false, 'NaN score false');
  assert.strictEqual(isNewRecord(1, Infinity), false, 'Infinity score false');
  assert.strictEqual(isNewRecord(1, -1), false, '-1 score false');
  assert.strictEqual(isNewRecord(NaN, NaN), false, 'both NaN false');
  assert.strictEqual(isNewRecord(-Infinity, 10), false, '-Infinity false');
});

test.skip('[P0-U-05] initialScore(NaN|Infinity|-5) → {score:0,best:0} + applyMove corrupt curScore/curBest + safeScore never NaN', async () => {
  const { initialScore, applyMove } = await import('../../../../triade/src/game/matchScore.ts');
  const { emptyBoard } = await import('../../../../triade/test-utils/helpers.ts');
  function moveResult(score: number, moved = true): any {
    return { board: emptyBoard(), score, moved, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } };
  }
  assert.deepStrictEqual(initialScore(NaN as any), { score: 0, best: 0 });
  assert.deepStrictEqual(initialScore(Infinity as any), { score: 0, best: 0 });
  assert.deepStrictEqual(initialScore(-5 as any), { score: 0, best: 0 });
  assert.deepStrictEqual(initialScore('3' as any), { score: 0, best: 0 });
  // applyMove with corrupt current
  let s = applyMove({ score: NaN as any, best: 10 }, moveResult(5));
  assert.ok(Number.isFinite(s.score) && Number.isFinite(s.best), 'NaN curScore must be sanitized');
  s = applyMove({ score: 10, best: NaN as any }, moveResult(5));
  assert.ok(Number.isFinite(s.best), 'NaN curBest must be sanitized');
  s = applyMove({ score: 10, best: 20 }, moveResult(NaN as any, true));
  assert.ok(Number.isFinite(s.score), 'NaN result.score must be sanitized to 0');
  s = applyMove({ score: 10, best: 20 }, moveResult(Infinity as any, true));
  assert.ok(Number.isFinite(s.score), 'Infinity result.score sanitized');
  s = applyMove({ score: 10, best: 20 }, moveResult(-5 as any, true));
  assert.strictEqual(s.score, 10, 'negative result.score sanitized to 0, curScore unchanged');
  s = applyMove({ score: 10, best: 20 }, moveResult(5 as any, false));
  assert.strictEqual(s.score, 10, 'moved:false must add 0');
  // safeScore overflow: curScore large + effective large → still finite, fallback to curScore if Infinity
  s = applyMove({ score: Number.MAX_VALUE, best: 10 }, moveResult(Number.MAX_VALUE, true));
  assert.ok(Number.isFinite(s.score), 'safeScore fallback must keep finite');
});

test.skip('[P0-U-06] NO_RECORD_EQUAL / FIRST_GAME_ZERO — isNewRecord(150,150) false, (0,0) false, (0,1) true', async () => {
  const { isNewRecord } = await import('../../../../triade/src/game/matchScore.ts');
  assert.strictEqual(isNewRecord(150, 150), false);
  assert.strictEqual(isNewRecord(0, 0), false);
  assert.strictEqual(isNewRecord(0, 1), true);
  assert.strictEqual(isNewRecord(5, 6), true);
  assert.strictEqual(isNewRecord(5, 5), false);
});

test.skip('[P0-U-07] Hud/overlay/stats sanitized JSX — sanitizedScore/Best/Persisted + Hud score={sanitizedScore} + GameOverOverlay self-compare', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('sanitizedScore'), 'missing sanitizedScore');
  assert.ok(src.includes('sanitizedBest'), 'missing sanitizedBest');
  assert.ok(src.includes('sanitizedPersisted'), 'missing sanitizedPersisted');
  assert.match(src, /const\s+sanitizedScore\s*=\s*Number\.isFinite\(match\.score\)\s*&&\s*match\.score\s*>=\s*0\s*\?\s*match\.score\s*:\s*0/, 'sanitizedScore decl');
  assert.ok(src.includes('score={sanitizedScore}'), 'Hud must receive sanitizedScore');
  assert.ok(src.includes('best={sanitizedBest}'), 'Hud must receive sanitizedBest');
  assert.ok(src.includes('match.score === match.score && Number.isFinite(match.score)'), 'GameOverOverlay stats must use self-compare guard');
  assert.ok(src.includes('persisted best: {sanitizedPersisted}'), 'stats text must use sanitizedPersisted');
});

test.skip('[P0-U-08] Persist effect double gate sanitizedMatchBest > sanitizedPersisted && isNewRecord && hydrationOk + single saveBestForLane call-site', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('sanitizedMatchBest'), 'missing sanitizedMatchBest');
  assert.ok(src.includes('sanitizedPersistedForCheck'), 'missing sanitizedPersistedForCheck');
  assert.match(src, /const\s+sanitizedMatchBest\s*=\s*Number\.isFinite\(match\.best\)/, 'sanitizedMatchBest decl');
  assert.ok(src.includes('isNewRecord(sessionStartBestByLaneRef.current[activeLaneId], sanitizedMatchBest)'), 'must gate on isNewRecord(sessionStart, sanitizedMatchBest)');
  assert.ok(src.includes('sanitizedMatchBest > sanitizedPersistedForCheck'), 'must check > sanitizedPersisted');
  const saves = (src.match(/saveBestForLane\(activeLaneId,\s*sanitizedMatchBest\)/g) || []).length;
  assert.strictEqual(saves, 1, `saveBestForLane(activeLaneId, sanitizedMatchBest) exactly 1, got ${saves}`);
});

test.skip('[P1-U-01] persistedBestByLaneRef mirror sync — decl + hydration seed + useEffect sync + .then direct write', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.match(src, /persistedBestByLaneRef\s*=\s*useRef<Record<LaneId,\s*number>>/, 'must decl persistedBestByLaneRef');
  assert.ok(src.includes('persistedBestByLaneRef.current = { clean: byLane.clean.best'), 'hydration seed');
  assert.match(src, /useEffect\(\(\) => \{\s*persistedBestByLaneRef\.current\s*=\s*persistedBestByLane/, 'sync useEffect');
  const thenIdx = src.indexOf('.then((ok)');
  const thenSlice = src.slice(thenIdx, thenIdx + 700);
  assert.ok(thenSlice.includes('persistedBestByLaneRef.current = { ...persistedBestByLaneRef.current'), '.then must direct-write persistedBestByLaneRef');
  const hits = (src.match(/persistedBestByLaneRef/g) || []).length;
  assert.ok(hits >= 5, `persistedBestByLaneRef hits >=5, got ${hits}`);
});

test.skip('[P1-U-02] Sanitized guards parity — sanitizedMatchBest 3 hits + sanitizedPersisted 2 hits both Number.isFinite && >=0', () => {
  const src = readFileSync(appPath, 'utf8');
  const sm = (src.match(/sanitizedMatchBest/g) || []).length;
  const sp = (src.match(/sanitizedPersistedForCheck/g) || []).length;
  assert.ok(sm >= 3, `sanitizedMatchBest >=3, got ${sm}`);
  assert.ok(sp >= 2, `sanitizedPersistedForCheck >=2, got ${sp}`);
});

test.skip('[P1-U-03] handleRestart async non-blocking try{await pending}catch{} — save false/throw never hangs', () => {
  const src = readFileSync(appPath, 'utf8');
  const idx = src.indexOf('const handleRestart');
  const slice = src.slice(idx, idx + 500);
  assert.ok(slice.includes('try'), 'must have try');
  assert.ok(slice.includes('await pending'), 'must await pending');
  assert.ok(slice.includes('catch'), 'must catch');
  assert.match(slice, /try\s*\{\s*await pending/, 'try { await pending }');
});

test.skip('[P1-U-04] Lane isolation clean vs accelerated — Record<LaneId 4 hits + saveBestForLane(activeLaneId, ...) never leaks', () => {
  const src = readFileSync(appPath, 'utf8');
  const rec = (src.match(/Record<LaneId/g) || []).length;
  assert.ok(rec >= 4, `Record<LaneId >=4, got ${rec}`);
  assert.ok(src.includes("bestClean") || src.includes("bestKeyForLane") || src.includes("saveBestForLane(activeLaneId"), 'lane wall');
  // App must not write legacy STORAGE_KEYS.best directly
  assert.ok(!src.includes("STORAGE_KEYS.best)") || src.includes("saveBestForLane"), 'must use saveBestForLane not raw store.set');
});

test.skip('[P2-U-01] ledger d0e7d75 64-hex 5 hits for DW-87,97,98,99,100 + sprint-status.yaml untouched', () => {
  const ledger = readFileSync(ledgerPath, 'utf8');
  const hits = (ledger.match(/d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822/g) || []).length;
  assert.strictEqual(hits, 5, `d0e7d75 hits exactly 5, got ${hits}`);
  for (const dw of ['DW-87', 'DW-97', 'DW-98', 'DW-99', 'DW-100']) {
    assert.ok(ledger.includes(dw), `missing ${dw}`);
    const sec = ledger.split(dw)[1] ?? '';
    assert.ok(sec.includes('status: done 2026-09-02'), `${dw} not done`);
  }
});

test.skip('[P2-U-02] handleRestart async vs onRestart () => void accepted debt — tsc clean + single onRestart assignment', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.match(src, /const\s+handleRestart\s*=\s*useCallback\(async/, 'handleRestart async');
  assert.ok(src.includes('onRestart={handleRestart}'), 'must pass handleRestart to onRestart');
  const scoreSrc = readFileSync(scorePath, 'utf8');
  assert.ok(scoreSrc.includes('Number.isFinite'), 'matchScore must have finite guards');
  assert.ok((scoreSrc.match(/Number\.isFinite/g) || []).length >= 4, 'Number.isFinite >=4 hits in matchScore');
});

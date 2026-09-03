/**
 * API Gateway — dw-persist-hydration-race-fix (RED-PHASE, test.skip)
 * Host node:test — source-pins for gates + guards + ledger
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/persist-hydration-race-fix.gateway.spec.ts
 * Mirrors _bmad-output/test-artifacts/tests/unit/persist-hydration-race-fix.atdd.test.ts P0/P1 for api level compliance.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const scorePath = new URL('../../../../triade/src/game/matchScore.ts', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;

test.skip('[P0-API-01] HYDRO_DEGRADED gate — persist effect hydationOk top return + overlay && hydrationOk', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.match(src, /if\s*\(!hydrationOkByLaneRef\.current\[activeLaneId\]\)\s*return/, 'missing persist top return');
  assert.ok(src.includes('&& hydrationOkByLaneRef.current[activeLaneId'), 'missing overlay && hydrationOk');
});

test.skip('[P0-API-02] STALE_MULTI_GAME — sessionStart update in .then on ok true', () => {
  const src = readFileSync(appPath, 'utf8');
  const then = src.indexOf('.then((ok)');
  assert.ok(then !== -1);
  const slice = src.slice(then, then + 700);
  assert.ok(slice.includes('sessionStartBestByLaneRef.current'), 'missing sessionStart update');
  assert.ok(slice.includes('sanitizedMatchBest'), 'must be sanitizedMatchBest');
});

test.skip('[P0-API-03] RACE_RESTART — pendingSaveByLaneRef + await pending + persistedBestByLaneRef read', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('pendingSaveByLaneRef'), 'missing pendingSave');
  assert.ok(src.includes('await pending'), 'missing await pending');
  assert.ok(src.includes('persistedBestByLaneRef.current[activeLaneId]'), 'missing ref read');
  assert.ok(src.includes('p.finally'), 'missing p.finally clear');
});

test.skip('[P0-API-04] NON_FINITE isNewRecord false', async () => {
  const { isNewRecord } = await import('../../../../triade/src/game/matchScore.ts');
  assert.strictEqual(isNewRecord(NaN, 10), false);
  assert.strictEqual(isNewRecord(-5, 10), false);
  assert.strictEqual(isNewRecord(10, Infinity), false);
});

test.skip('[P0-API-05] initialScore/applyMove sanitization', async () => {
  const { initialScore, applyMove } = await import('../../../../triade/src/game/matchScore.ts');
  const { emptyBoard } = await import('../../../../triade/test-utils/helpers.ts');
  assert.deepStrictEqual(initialScore(NaN as any), { score: 0, best: 0 });
  const s = applyMove({ score: 10, best: 20 }, { board: emptyBoard(), score: NaN as any, moved: true, trace: [], pendingSpawn: { value: 1, displayRoll: 0 } } as any);
  assert.ok(Number.isFinite(s.score));
});

test.skip('[P0-API-06] sanitized JSX Hud/overlay/stats', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('sanitizedScore') && src.includes('sanitizedBest') && src.includes('sanitizedPersisted'));
  assert.ok(src.includes('match.score === match.score && Number.isFinite'));
});

test.skip('[P1-API-01] persistedBestByLaneRef mirror sync double-write', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('persistedBestByLaneRef.current = { clean: byLane.clean.best'));
  assert.match(src, /useEffect\(\(\) => \{\s*persistedBestByLaneRef\.current\s*=\s*persistedBestByLane/, 'missing sync effect');
  assert.ok(src.slice(src.indexOf('.then((ok)'), src.indexOf('.then((ok)') + 700).includes('persistedBestByLaneRef.current'));
});

test.skip('[P1-API-02] double gate parity — sanitizedMatchBest > sanitizedPersisted && isNewRecord', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('sanitizedMatchBest > sanitizedPersistedForCheck'));
  assert.ok(src.includes('isNewRecord(sessionStartBestByLaneRef.current[activeLaneId], sanitizedMatchBest)'));
});

test.skip('[P1-API-03] handleRestart non-blocking try/catch', () => {
  const src = readFileSync(appPath, 'utf8');
  const idx = src.indexOf('const handleRestart');
  const slice = src.slice(idx, idx + 600);
  assert.ok(slice.includes('try') && slice.includes('await pending') && slice.includes('catch'));
});

test.skip('[P1-API-04] lane isolation clean vs accelerated', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok((src.match(/Record<LaneId/g) || []).length >= 4);
  assert.ok(src.includes('saveBestForLane(activeLaneId, sanitizedMatchBest)'));
});

test.skip('[P2-API-01] ledger d0e7d75 5 hits + sprint-status.yaml empty', () => {
  const ledger = readFileSync(ledgerPath, 'utf8');
  assert.strictEqual((ledger.match(/d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822/g) || []).length, 5);
  assert.ok(ledger.includes('DW-87') && ledger.includes('DW-97'));
});

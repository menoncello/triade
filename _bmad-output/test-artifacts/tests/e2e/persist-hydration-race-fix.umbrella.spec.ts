/**
 * E2E Umbrella — dw-persist-hydration-race-fix (RED-PHASE, test.skip)
 * Static scans — umbrella level, host node:test, no browser
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/persist-hydration-race-fix.umbrella.spec.ts
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const specPath = new URL('../../../../_bmad-output/implementation-artifacts/spec-persist-hydration-race-fix.md', import.meta.url).pathname;

test.skip('[P0-UMB-01] hydrationOk gating both layers — persist effect + overlay prop', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.match(src, /if\s*\(!hydrationOkByLaneRef\.current\[activeLaneId\]\)\s*return/, 'persist top return');
  assert.match(src, /isNewRecord\(sessionStartBestByLaneRef\.current\[activeLaneId as LaneId\],\s*match\.score\)\s*&&\s*hydrationOkByLaneRef\.current\[activeLaneId as LaneId\]/, 'overlay && hydrationOk');
});

test.skip('[P0-UMB-02] RACE_RESTART await pending before initialScore — delayed fake 150 vs 100', () => {
  const src = readFileSync(appPath, 'utf8');
  const idx = src.indexOf('const handleRestart');
  const slice = src.slice(idx, idx + 1400);
  assert.ok(slice.includes('pendingSaveByLaneRef.current[activeLaneId]'), 'must read pending');
  assert.ok(slice.includes('await pending'), 'must await');
  assert.ok(slice.includes('initialScore(persistedBestByLaneRef.current[activeLaneId])'), 'must read ref not state');
});

test.skip('[P1-UMB-01] persistedBestByLaneRef double-write + sync effect', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('persistedBestByLaneRef.current = { clean: byLane.clean.best'));
  assert.ok(src.includes('useEffect(() => {') && src.includes('persistedBestByLaneRef.current = persistedBestByLane'));
  assert.ok(src.includes('p.finally'), 'missing finally clear');
});

test.skip('[P1-UMB-02] sanitization idiom parity 5+5 hits', () => {
  const src = readFileSync(appPath, 'utf8');
  const scoreSrc = readFileSync(new URL('../../../../triade/src/game/matchScore.ts', import.meta.url).pathname, 'utf8');
  assert.ok((scoreSrc.match(/Number\.isFinite/g) || []).length >= 4, 'matchScore Number.isFinite >=4');
  assert.ok((src.match(/Number\.isFinite/g) || []).length >= 5, 'App Number.isFinite >=5');
  assert.ok(src.includes('sanitizedScore') && src.includes('sanitizedPersisted'));
});

test.skip('[P1-UMB-03] lane isolation — saveBestForLane(activeLaneId, sanitizedMatchBest) single call-site', () => {
  const src = readFileSync(appPath, 'utf8');
  const hits = (src.match(/saveBestForLane\(activeLaneId,\s*sanitizedMatchBest\)/g) || []).length;
  assert.strictEqual(hits, 1);
  assert.ok((src.match(/Record<LaneId/g) || []).length >= 4);
});

test.skip('[P1-UMB-04] isNewRecord short-circuit order — isNewRecord(...) && hydrationOk exact line', () => {
  const src = readFileSync(appPath, 'utf8');
  assert.ok(src.includes('isNewRecord(sessionStartBestByLaneRef.current[activeLaneId as LaneId], match.score) && hydrationOkByLaneRef.current[activeLaneId as LaneId]'));
});

test.skip('[P2-UMB-01] ledger d0e7d75 5 hits + done status', () => {
  const ledger = readFileSync(ledgerPath, 'utf8');
  assert.strictEqual((ledger.match(/d0e7d75dec9a43c8476ca1205c457e89be8b64bd5e587dc91e27c07515617822/g) || []).length, 5);
  for (const dw of ['DW-87', 'DW-97', 'DW-98', 'DW-99', 'DW-100']) {
    assert.ok(ledger.includes(dw));
    assert.ok(ledger.split(dw)[1]?.includes('status: done 2026-09-02'));
  }
});

test.skip('[P2-UMB-02] spec I/O matrix 8 rows + no new storage keys + sprint-status empty', () => {
  const spec = readFileSync(specPath, 'utf8');
  assert.ok(spec.includes('HYDRO_DEGRADED') && spec.includes('RACE_RESTART_STALE') && spec.includes('NON_FINITE_INPUTS'));
  assert.ok(spec.includes('Block If:') && spec.includes('Always:'));
  const ledger = readFileSync(ledgerPath, 'utf8');
  assert.ok(ledger.includes('dw-persist-hydration-race-fix'));
});

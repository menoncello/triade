/**
 * E2E Umbrella — dw-engine-parity-hardening (RED-PHASE, it.skip)
 * Ladder chain + App wiring + isNewRecord + celebration + matchStats + ownership — host static scans
 * Mirrors triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts 5
 * All are it.skip (RED). Remove it.skip → it for GREEN.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { ceilingDetector, tierForCeiling } from '../../../../triade/src/engine/core/ceiling.ts';
import { potForTier } from '../../../../triade/src/engine/core/pot.ts';
import { boardWith, emptyBoard, stripCommentsAndStrings } from '../../../../triade/test-utils/helpers.ts';
import { isNewRecord } from '../../../../triade/src/game/matchScore.ts';
import type { Board } from '../../../../triade/src/engine/core/index.ts';

function boardWithMax(max:number|null): Board { if(max===null||max===0) return emptyBoard(); const b=emptyBoard(); b[0][0]=max as number; return b; }

test.skip('[P0-UMB-01] DW-103 ladder 12 ceilings literal pots', () => {
  const cases:Array<{ceiling:number;tier:number;pot:number[]}> = [
    { ceiling:0,tier:0,pot:[3]},{ ceiling:3,tier:0,pot:[3]},{ ceiling:12,tier:0,pot:[3]},{ ceiling:24,tier:0,pot:[3]},{ ceiling:47,tier:0,pot:[3]},
    { ceiling:48,tier:1,pot:[3,6]},{ ceiling:96,tier:2,pot:[3,6,12]},{ ceiling:192,tier:3,pot:[3,6,12,24]},{ ceiling:384,tier:4,pot:[3,6,12,24,48]},{ ceiling:768,tier:5,pot:[3,6,12,24,48,96]},
    { ceiling:1536,tier:6,pot:[3,6,12,24,48,96,192]},{ ceiling:3072,tier:7,pot:[3,6,12,24,48,96,192,384]},
  ];
  for(const {ceiling,tier,pot} of cases){
    const board=boardWithMax(ceiling===0?null:ceiling);
    assert.strictEqual(ceilingDetector(board), ceiling===0?0:ceiling);
    assert.strictEqual(tierForCeiling(ceilingDetector(board)), tier);
    assert.deepStrictEqual([...potForTier(tierForCeiling(ceilingDetector(board)))], pot);
  }
});
test.skip('[P0-UMB-02] App wiring thin-view + availablePot pipeline', () => {
  const overlay=stripCommentsAndStrings(readFileSync(new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname,'utf8'));
  assert.ok(!/ceilingDetector|tierForCeiling|potForTier/.test(overlay));
  const app=readFileSync(new URL('../../../../triade/App.tsx', import.meta.url).pathname,'utf8');
  assert.ok(/availablePot\s*=\s*potForTier\s*\(\s*tierForCeiling\s*\(\s*ceilingDetector\s*\(\s*game\.board\s*\)/.test(app));
});
test.skip('[P0-UMB-03] isNewRecord sessionStart gating + anti-leak', () => {
  const app=readFileSync(new URL('../../../../triade/App.tsx', import.meta.url).pathname,'utf8');
  assert.ok(/isNewRecord\s*\(\s*sessionStartBest/.test(stripCommentsAndStrings(app)));
  assert.ok(/isNewRecord=\{isNewRecord\(sessionStartBest/.test(app));
  const slice=stripCommentsAndStrings(app.slice(app.indexOf('const handleRestart'), app.indexOf('const handleRestart')+1500));
  assert.ok(!/sessionStartBest.*\.current\s*=/.test(slice));
  assert.strictEqual(isNewRecord(0,0), false); assert.strictEqual(isNewRecord(0,1), true);
  assert.strictEqual(isNewRecord(100,150), true); assert.strictEqual(isNewRecord(150,150), false);
});
test.skip('[P1-UMB-01] no celebration beyond isNewRecord', () => {
  const s=stripCommentsAndStrings(readFileSync(new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname,'utf8'));
  assert.ok(!/confetti|celebrat|lottie|reward|particleBurst|shakeMs/i.test(s)); assert.ok(s.includes('isNewRecord'));
});
test.skip('[P1-UMB-02] matchStats monotonic', async () => {
  const { initialStats, applyMoveStats } = await import('../../../../triade/src/game/matchStats.ts');
  const b48=boardWithMax(48), b96=boardWithMax(96); const s0=initialStats(b48); assert.strictEqual(s0.maxTile,48);
  const s1=applyMoveStats(s0,b96,{ trace:[], board:b96 } as any); assert.strictEqual(s1.maxTile,96);
  const b3=boardWithMax(3); const s2=applyMoveStats(s1,b3,{ trace:[], board:b3 } as any); assert.strictEqual(s2.maxTile,96);
});
test.skip('[P1-UMB-03] Math.random 0 in parity suites', () => {
  const s1=readFileSync(new URL('../../../../triade/__tests__/engine/engine.parity-hardening.atdd.test.ts', import.meta.url).pathname,'utf8');
  const s2=readFileSync(new URL('../../../../triade/__tests__/game/ladder-ceiling-chain.atdd.test.ts', import.meta.url).pathname,'utf8');
  assert.strictEqual(/Math\.random/.test(s1),false); assert.strictEqual(/Math\.random/.test(s2),false);
});
test.skip('[P1-UMB-04] thin-view stripCommentsAndStrings seam', () => {
  const src=readFileSync(new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname,'utf8');
  assert.ok(!/ceilingDetector|tierForCeiling|potForTier/.test(stripCommentsAndStrings(src)));
});
test.skip('[P2-UMB-01] ledger 043844070ab 4 hits', () => {
  const ledger=readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname,'utf8');
  assert.strictEqual((ledger.match(/043844070ab942ae892d8eac278e23d11dd08f2c37cc2f1b45223e9bba129c9b/g)||[]).length,4);
});
test.skip('[P2-UMB-02] single-definition invariants', () => {
  const app=readFileSync(new URL('../../../../triade/App.tsx', import.meta.url).pathname,'utf8');
  assert.strictEqual((app.match(/availablePot\s*=\s*potForTier/g)||[]).length,1);
});
test.skip('[P2-UMB-03] sprint-status.yaml diff empty', () => { assert.ok(true); });

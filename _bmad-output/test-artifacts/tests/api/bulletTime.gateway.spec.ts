/**
 * TEA Automate — API Gateway Contract Tests for 8-4 Bullet Time
 * Location: _bmad-output/test-artifacts/tests/api/bulletTime.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture needed)
 * TEA mapping: "API" = engine trace gateway contract (Typed TraceEntry → bulletTime helpers).
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's
 * api-testing-patterns + data-factories knowledge fragments, but adapted for Expo RN:
 * provider is the engine (newGame/move via mulberry32), consumer is feel/bulletTime.ts.
 *
 * Execute:
 *   cd triade && npm test -- ../_bmad-output/test-artifacts/tests/api/bulletTime.gateway.spec.ts
 * Or via triade tsconfig.test.json path mapping (requires copy or --import tsx with relative).
 * Canonical host execution remains via triade/__tests__/feel/bulletTime.atdd.test.ts (P1-01).
 * This file is the TEA artifact under test_artifacts/tests/api per config.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BULLET_TIME_MS,
  maxMergeValue,
  isNewSessionBest,
  shouldTriggerBulletTime,
  nextSessionBest,
} from '../../../../triade/src/feel/bulletTime.ts';
import { newGame, move } from '../../../../triade/src/engine/core/index.ts';
import type { TraceEntry } from '../../../../triade/src/engine/core/types.ts';
import { mulberry32 } from '../../../../triade/src/utils/mulberry32.ts';

function mergeEntry(value: number, spawned = false, fromLen = 2): TraceEntry {
  const from =
    fromLen === 2 ? ([[0, 0], [0, 1]] as any) : fromLen === 1 ? ([[0, 0]] as any) : ([] as any);
  return { value, to: [0, 0], from, spawned } as unknown as TraceEntry;
}

// Provider: engine move() with deterministic RNG — no hand-built stub drift
function realTrace(seed = 42) {
  const rng = mulberry32(seed);
  const game = newGame(rng);
  return move(game, 'left', rng) as { trace: TraceEntry[]; moved: boolean };
}

describe('[API] Bullet Time gateway contract — engine trace → bulletTime helpers', () => {
  it('[P0] shouldTrigger only when maxMergeValue > sessionBest (rarity-gated, not value-gated)', async () => {
    // Given a trace with max 12 and sessionBest 6
    const trace = [mergeEntry(3), mergeEntry(12)] as unknown as TraceEntry[];
    // When gateway evaluates
    const max = maxMergeValue(trace as any);
    const trigger = shouldTriggerBulletTime(trace as any, 6, false);
    const next = nextSessionBest(trace as any, 6);
    // Then new session-best triggers single 200ms
    assert.equal(max, 12);
    assert.equal(trigger, true);
    assert.equal(next, 12);
    assert.equal(BULLET_TIME_MS, 200);
  });

  it('[P0] should NOT trigger when max <= sessionBest (ordinary merge)', async () => {
    const trace = [mergeEntry(3)] as unknown as TraceEntry[];
    assert.equal(shouldTriggerBulletTime(trace as any, 6, false), false);
    assert.equal(nextSessionBest(trace as any, 6), 6);
  });

  it('[P0] should NOT trigger under Reduced Motion but still advance sessionBest (FR-30)', async () => {
    const trace = [mergeEntry(12)] as unknown as TraceEntry[];
    assert.equal(shouldTriggerBulletTime(trace as any, 6, true), false);
    assert.equal(shouldTriggerBulletTime(trace as any, 0, true), false);
    // FR-30: sessionBest still advances even when flash suppressed
    assert.equal(nextSessionBest(trace as any, 6), 12);
  });

  it('[P0] should return null/false for NOOP / spawn-only / slide-only traces', async () => {
    assert.equal(maxMergeValue([] as any), null);
    assert.equal(maxMergeValue(null as any), null);
    assert.equal(maxMergeValue([{ value: 2, to: [3, 3], from: [], spawned: true } as unknown as TraceEntry]), null);
    assert.equal(maxMergeValue([mergeEntry(6, true)] as any), null); // spawned:true ignored
    assert.equal(maxMergeValue([mergeEntry(12, false, 1)] as any), null); // from.length !==2 ignored
    assert.equal(shouldTriggerBulletTime([] as any, 0, false), false);
  });

  it('[P1] should match real engine trace: fires iff from.length===2 && !spawned && finite', async () => {
    const { trace } = realTrace(42);
    // Contract mirrors shake's P1-01: provider scrutiny via real move() trace
    let hasMerge = false;
    for (const e of trace as unknown as TraceEntry[]) {
      if (!e.spawned && Array.isArray((e as any).from) && (e as any).from.length === 2 && Number.isFinite(e.value)) {
        hasMerge = true;
        break;
      }
    }
    if (hasMerge) {
      assert.notEqual(maxMergeValue(trace as any), null);
    } else {
      assert.equal(maxMergeValue(trace as any), null);
      assert.equal(shouldTriggerBulletTime(trace as any, 0, false), false);
    }
    // Spawn entries never trigger even with from.length===2
    const mixed: TraceEntry[] = [
      { value: 12, to: [0, 0], from: [[0, 1], [0, 2]], spawned: false } as unknown as TraceEntry,
      { value: 2, to: [3, 3], from: [], spawned: true } as unknown as TraceEntry,
    ];
    assert.equal(maxMergeValue(mixed), 12);
    assert.equal(shouldTriggerBulletTime(mixed, 6, false), true);
  });

  it('[P1] should re-trigger after undo rewind (Snapshot sessionBestMerge, ADR-06)', async () => {
    let best = 0;
    best = nextSessionBest([mergeEntry(3)] as any, best); // 3
    best = nextSessionBest([mergeEntry(6)] as any, best); // 6
    best = nextSessionBest([mergeEntry(12)] as any, best); // 12
    assert.equal(best, 12);
    // Undo pops Snapshot with prior best 6
    best = 6;
    assert.equal(isNewSessionBest([mergeEntry(12)] as any, best), true);
    assert.equal(shouldTriggerBulletTime([mergeEntry(12)] as any, best, false), true);
  });

  it('[P2] should never throw on non-finite / null / undefined inputs', async () => {
    assert.doesNotThrow(() => maxMergeValue([mergeEntry(NaN)] as any));
    assert.doesNotThrow(() => isNewSessionBest([mergeEntry(NaN)] as any, 0));
    assert.doesNotThrow(() => shouldTriggerBulletTime([mergeEntry(Infinity)] as any, 0, false));
    assert.doesNotThrow(() => nextSessionBest([mergeEntry(NaN)] as any, 6));
    assert.doesNotThrow(() => shouldTriggerBulletTime([mergeEntry(12)] as any, NaN, false));
    assert.equal(nextSessionBest([mergeEntry(6)] as any, NaN), 0);
  });
});

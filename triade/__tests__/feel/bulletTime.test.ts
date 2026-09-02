import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BULLET_TIME_MS,
  maxMergeValue,
  isNewSessionBest,
  shouldTriggerBulletTime,
  nextSessionBest,
} from '../../src/feel/bulletTime.ts';

function entry(value: number, spawned = false, fromLen = 2): any {
  const from = fromLen === 2 ? ([[0, 0], [0, 1]] as any) : fromLen === 1 ? ([[0, 0]] as any) : ([] as any);
  return { value, to: [0, 0], from, spawned };
}

describe('feel — bullet time (S8.4)', () => {
  it('[P0] BULLET_TIME_MS is 200', () => {
    assert.equal(BULLET_TIME_MS, 200);
  });

  it('[P0] maxMergeValue extraction — only board merges count', () => {
    assert.equal(maxMergeValue(null as any), null);
    assert.equal(maxMergeValue(undefined as any), null);
    assert.equal(maxMergeValue([] as any), null);
    assert.equal(maxMergeValue([entry(6)] as any), 6);
    assert.equal(maxMergeValue([entry(3), entry(12)] as any), 12);
    // spawned ignored
    assert.equal(maxMergeValue([entry(12, true), entry(3)] as any), 3);
    assert.equal(maxMergeValue([entry(12, true)] as any), null);
    // from length !=2 ignored
    assert.equal(maxMergeValue([entry(12, false, 1)] as any), null);
    assert.equal(maxMergeValue([entry(12, false, 0)] as any), null);
    // non-finite ignored
    assert.equal(maxMergeValue([entry(NaN), entry(6)] as any), 6);
    assert.equal(maxMergeValue([entry(Infinity)] as any), null);
    assert.equal(maxMergeValue([entry(NaN)] as any), null);
    // single max
    assert.equal(maxMergeValue([entry(3), entry(6), entry(12)] as any), 12);
  });

  it('[P0] isNewSessionBest true/false', () => {
    assert.equal(isNewSessionBest([entry(6)] as any, 6), false);
    assert.equal(isNewSessionBest([entry(12)] as any, 6), true);
    assert.equal(isNewSessionBest([entry(3)] as any, 0), true);
    assert.equal(isNewSessionBest([entry(6)] as any, 12), false);
    assert.equal(isNewSessionBest([] as any, 0), false);
    assert.equal(isNewSessionBest(null as any, 0), false);
    // non-finite ignored -> no trigger
    assert.equal(isNewSessionBest([entry(NaN)] as any, 0), false);
    assert.equal(isNewSessionBest([entry(Infinity)] as any, 0), false);
  });

  it('[P0] shouldTrigger respects Reduced Motion', () => {
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, 0, true), false);
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, 0, false), true);
    // sessionBest still advances even when reduced (via nextSessionBest), but trigger suppressed
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, 6, true), false);
    assert.equal(shouldTriggerBulletTime([entry(3)] as any, 0, true), false);
    assert.equal(shouldTriggerBulletTime(null as any, 0, false), false);
  });

  it('[P0] multiple merges max wins — single 200ms not per-merge', () => {
    const trace = [entry(3), entry(12)] as any;
    assert.equal(maxMergeValue(trace), 12);
    assert.equal(isNewSessionBest(trace, 6), true);
    assert.equal(shouldTriggerBulletTime(trace, 6, false), true);
    assert.equal(nextSessionBest(trace, 6), 12);
    // if max <= best, no trigger
    const trace2 = [entry(3), entry(6)] as any;
    assert.equal(shouldTriggerBulletTime(trace2, 12, false), false);
    assert.equal(nextSessionBest(trace2, 12), 12);
  });

  it('[P0] NOOP / empty no trigger', () => {
    assert.equal(shouldTriggerBulletTime([] as any, 0, false), false);
    assert.equal(shouldTriggerBulletTime(null as any, 0, false), false);
    assert.equal(shouldTriggerBulletTime(undefined as any, 0, false), false);
    const noMerge: any[] = [
      { value: 3, to: [0, 0], from: [[0, 1]], spawned: false },
      { value: 1, to: [3, 3], from: [], spawned: true },
    ];
    assert.equal(shouldTriggerBulletTime(noMerge, 0, false), false);
    assert.equal(isNewSessionBest(noMerge, 0), false);
    assert.equal(maxMergeValue(noMerge), null);
  });

  it('[P0] non-finite ignored, never throws', () => {
    assert.doesNotThrow(() => maxMergeValue([entry(NaN), entry(Infinity), entry(-Infinity)] as any));
    assert.doesNotThrow(() => isNewSessionBest([entry(NaN)] as any, 0));
    assert.doesNotThrow(() => shouldTriggerBulletTime([entry(NaN)] as any, 0, false));
    assert.doesNotThrow(() => nextSessionBest([entry(NaN)] as any, 0));
    assert.doesNotThrow(() => maxMergeValue(null as any));
    assert.doesNotThrow(() => shouldTriggerBulletTime([entry(NaN)] as any, NaN, false));
    assert.equal(nextSessionBest([entry(NaN)] as any, 6), 6);
    assert.equal(nextSessionBest([entry(Infinity)] as any, 6), 6);
  });

  it('[P0] nextSessionBest returns updated best or unchanged', () => {
    assert.equal(nextSessionBest([entry(12)] as any, 6), 12);
    assert.equal(nextSessionBest([entry(6)] as any, 12), 12);
    assert.equal(nextSessionBest([] as any, 6), 6);
    assert.equal(nextSessionBest(null as any, 6), 6);
    assert.equal(nextSessionBest([entry(3)] as any, 0), 3);
    assert.equal(nextSessionBest([entry(12), entry(3)] as any, 6), 12);
    // undoes: if we rewind from 12 to 6, next 12 re-triggers — simulates undo rewind
    let best = 0;
    best = nextSessionBest([entry(3)] as any, best); // 3
    assert.equal(best, 3);
    best = nextSessionBest([entry(6)] as any, best); // 6
    assert.equal(best, 6);
    best = nextSessionBest([entry(12)] as any, best); // 12
    assert.equal(best, 12);
    // undo pops to 6
    best = 6;
    assert.equal(isNewSessionBest([entry(12)] as any, best), true);
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, best, false), true);
    // ordinary merge no bump
    assert.equal(nextSessionBest([entry(6)] as any, 12), 12);
  });

  it('[P0] new session-best triggers timing datum 200ms (via BULLET_TIME_MS)', () => {
    // first merge always triggers when sessionBest 0
    assert.equal(shouldTriggerBulletTime([entry(3)] as any, 0, false), true);
    // ordinary later 3 never does when best is 6
    assert.equal(shouldTriggerBulletTime([entry(3)] as any, 6, false), false);
    // 6 while best 3 triggers
    assert.equal(shouldTriggerBulletTime([entry(6)] as any, 3, false), true);
    // 6 again no flash
    assert.equal(shouldTriggerBulletTime([entry(6)] as any, 6, false), false);
    // 12 triggers
    assert.equal(shouldTriggerBulletTime([entry(12)] as any, 6, false), true);
  });
});

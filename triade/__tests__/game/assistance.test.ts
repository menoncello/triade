import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  initialUndoBudget,
  initialHintBudget,
  initialContinueBudget,
  canUndo,
  consumeUndo,
  canHint,
  consumeHint,
  canContinue,
  consumeContinue,
  findMergeablePair,
} from '../../src/game/assistance.ts';
import { LANE_PROFILES } from '../../src/game/lanes.ts';
import { canMerge } from '../../src/engine/core/rules.ts';

describe('assistance — budgets and contracts', () => {
  it('initial budgets are clean', () => {
    assert.deepEqual(initialUndoBudget(), { freeUsed: false, iapRemaining: 0, unlimited: false });
    assert.deepEqual(initialHintBudget(), { remaining: 5 });
    assert.deepEqual(initialHintBudget(3), { remaining: 3 });
    assert.deepEqual(initialContinueBudget(), { used: false });
  });

  it('canUndo gates by profile and history', () => {
    const clean = LANE_PROFILES.clean;
    const acc = LANE_PROFILES.accelerated;
    const bud = initialUndoBudget();
    assert.equal(canUndo(bud, 0, acc), false);
    assert.equal(canUndo(bud, 1, acc), true);
    assert.equal(canUndo(bud, 1, clean), false);
  });

  it('consumeUndo free-only-once', () => {
    const acc = LANE_PROFILES.accelerated;
    let bud = initialUndoBudget();
    const r1 = consumeUndo(bud, 1, acc);
    assert.equal(r1.ok, true);
    if (r1.ok) bud = r1.budget;
    assert.equal(bud.freeUsed, true);
    const r2 = consumeUndo(bud, 1, acc);
    assert.equal(r2.ok, false);
  });

  it('consumeUndo via IAP after free used', () => {
    const acc = LANE_PROFILES.accelerated;
    const bud = { freeUsed: true, iapRemaining: 2, unlimited: false };
    const r = consumeUndo(bud, 1, acc);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.budget.iapRemaining, 1);
  });

  it('consumeUndo unlimited stays true', () => {
    const acc = LANE_PROFILES.accelerated;
    const bud = { freeUsed: true, iapRemaining: 0, unlimited: true };
    const r = consumeUndo(bud, 5, acc);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.budget.unlimited, true);
  });

  it('consumeUndo does not mutate caller', () => {
    const acc = LANE_PROFILES.accelerated;
    const bud = initialUndoBudget();
    const copy = { ...bud };
    consumeUndo(bud, 1, acc);
    assert.deepEqual(bud, copy);
  });

  it('canHint gates by profile, budget and mergeable pair', () => {
    const acc = LANE_PROFILES.accelerated;
    const clean = LANE_PROFILES.clean;
    const boardWithPair: any = [
      [1, 2, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const boardNoPair: any = [
      [1, 1, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    assert.equal(canHint({ remaining: 5 }, boardWithPair, acc), true);
    assert.equal(canHint({ remaining: 5 }, boardNoPair, acc), false);
    assert.equal(canHint({ remaining: 0 }, boardWithPair, acc), false);
    assert.equal(canHint({ remaining: 5 }, boardWithPair, clean), false);
  });

  it('consumeHint decrements remaining', () => {
    const acc = LANE_PROFILES.accelerated;
    const board: any = [
      [3, 3, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const bud = { remaining: 5 };
    const r = consumeHint(bud, board, acc);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.budget.remaining, 4);
  });

  it('findMergeablePair returns valid pair via canMerge', () => {
    const board: any = [
      [1, 2, null, null],
      [3, 3, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    const pair = findMergeablePair(board);
    assert.ok(pair !== null);
    const [[r1, c1], [r2, c2]] = pair!;
    assert.equal(canMerge(board[r1][c1], board[r2][c2]), true);
  });

  it('findMergeablePair returns null when none', () => {
    const board: any = [
      [1, 1, null, null],
      [null, null, null, null],
      [null, null, null, null],
      [null, null, null, null],
    ];
    assert.equal(findMergeablePair(board), null);
  });

  it('findMergeablePair guards invalid board', () => {
    assert.equal(findMergeablePair(null as any), null);
    assert.equal(findMergeablePair([] as any), null);
  });

  it('canContinue gates by profile and used', () => {
    const acc = LANE_PROFILES.accelerated;
    const clean = LANE_PROFILES.clean;
    assert.equal(canContinue({ used: false }, acc), true);
    assert.equal(canContinue({ used: true }, acc), false);
    assert.equal(canContinue({ used: false }, clean), false);
  });

  it('consumeContinue once', () => {
    const acc = LANE_PROFILES.accelerated;
    let bud = initialContinueBudget();
    const r1 = consumeContinue(bud, acc);
    assert.equal(r1.ok, true);
    if (r1.ok) bud = r1.budget;
    assert.equal(bud.used, true);
    const r2 = consumeContinue(bud, acc);
    assert.equal(r2.ok, false);
  });

  it('assistance module is pure — no RN imports', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../src/game/assistance.ts'), 'utf8');
    const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(stripped, /from\s+['"]react-native['"]/);
    assert.doesNotMatch(stripped, /from\s+['"]expo-/);
    assert.doesNotMatch(stripped, /Math\.random/);
  });
});

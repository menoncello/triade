import { test } from 'node:test';
import assert from 'node:assert';
import { canMerge, mergeValue } from '../../src/engine/core/rules.ts';

test('canMerge: 1 and 2 are the only cross-value pair that merges', () => {
  assert.strictEqual(canMerge(1, 2), true);
  assert.strictEqual(canMerge(2, 1), true);
  assert.strictEqual(canMerge(1, 1), false);
  assert.strictEqual(canMerge(2, 2), false);
  assert.strictEqual(canMerge(1, 3), false);
  assert.strictEqual(canMerge(3, 1), false);
});

test('canMerge: equal tiles >= 3 merge, different values do not', () => {
  assert.strictEqual(canMerge(3, 3), true);
  assert.strictEqual(canMerge(6, 6), true);
  assert.strictEqual(canMerge(12, 12), true);
  assert.strictEqual(canMerge(3, 6), false);
  assert.strictEqual(canMerge(6, 12), false);
});

test('canMerge: nulls never merge', () => {
  assert.strictEqual(canMerge(null, 3), false);
  assert.strictEqual(canMerge(3, null), false);
  assert.strictEqual(canMerge(null, null), false);
});

test('mergeValue: a value <= 2 always resolves to 3 (1+2)', () => {
  assert.strictEqual(mergeValue(1, 2), 3);
  assert.strictEqual(mergeValue(2, 1), 3);
  assert.strictEqual(mergeValue(1, 1), 3);
  assert.strictEqual(mergeValue(2, 2), 3);
});

test('mergeValue: equal tiles >= 3 double', () => {
  assert.strictEqual(mergeValue(3, 3), 6);
  assert.strictEqual(mergeValue(6, 6), 12);
  assert.strictEqual(mergeValue(12, 12), 24);
  assert.strictEqual(mergeValue(24, 24), 48);
});

test('mergeValue: relies on the first operand even when second is null', () => {
  assert.strictEqual(mergeValue(3, null), 6);
  assert.strictEqual(mergeValue(6, null), 12);
});

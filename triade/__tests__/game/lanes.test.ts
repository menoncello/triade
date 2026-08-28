import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { LANES, laneFromIndex, indexFromId, DEFAULT_LANE_INDEX, isValidLaneIndex, LANE_PROFILES, profileForLaneId, profileForIndex, isLaneId } from '../../src/game/lanes.ts';
import { stripCommentsAndStrings, extractSpecifiers } from '../../test-utils/helpers.ts';

test('[P0] lane module round-trip and defaults', () => {
  assert.equal(LANES.length, 2);
  assert.equal(LANES[0].id, 'clean');
  assert.equal(LANES[1].id, 'accelerated');
  assert.equal(DEFAULT_LANE_INDEX, 0);
  assert.equal(laneFromIndex(0).id, 'clean');
  assert.equal(laneFromIndex(1).id, 'accelerated');
  assert.equal(laneFromIndex(99).id, 'clean');
  assert.equal(indexFromId('clean'), 0);
  assert.equal(indexFromId('accelerated'), 1);
  assert.equal(isValidLaneIndex(0), true);
  assert.equal(isValidLaneIndex(1), true);
  assert.equal(isValidLaneIndex(2), false);
  assert.equal(isValidLaneIndex(-1), false);
  assert.equal(isValidLaneIndex('0'), false);
});

test('[P0] lane labels and tone lines non-empty', () => {
  for (const lane of LANES) {
    assert.ok(lane.label.length > 0, `${lane.id} label non-empty`);
    assert.ok(lane.toneLine.length > 0, `${lane.id} toneLine non-empty`);
  }
  assert.equal(LANES[0].label, 'Pura');
  assert.equal(LANES[1].label, 'Iniciante');
  assert.equal(LANES[1].subtitle, 'Com ajuda');
});

test('[P1] lanes.ts has no RN/Skia/Expo imports and uses relative-only pattern', async () => {
  const file = fileURLToPath(new URL('../../src/game/lanes.ts', import.meta.url));
  const source = await readFile(file, 'utf8');
  const stripped = stripCommentsAndStrings(source);
  // No forbidden specifiers via extractSpecifiers
  for (const spec of extractSpecifiers(source)) {
    const lower = spec.toLowerCase();
    assert.ok(!lower.startsWith('react'), `lanes.ts must not import ${spec}`);
    assert.ok(!lower.startsWith('react-native'), `lanes.ts must not import ${spec}`);
    assert.ok(!lower.startsWith('@shopify'), `lanes.ts must not import ${spec}`);
    assert.ok(!lower.startsWith('expo'), `lanes.ts must not import ${spec}`);
  }
  // No Math.random, no engine roll symbols
  assert.ok(!stripped.includes('Math.random'), 'lanes.ts must not use Math.random');
  assert.ok(!stripped.includes('resolveSpawn'), 'lanes.ts must not import resolveSpawn');
});

test('[P0] LaneProfile — clean has no assistance and accelerated has all', () => {
  const clean = profileForLaneId('clean');
  assert.equal(clean.id, 'clean');
  assert.equal(clean.canUndo, false);
  assert.equal(clean.canHint, false);
  assert.equal(clean.canContinue, false);
  assert.equal(clean.allowAds, false);
  assert.equal(clean.showLearningAids, false);
  assert.equal(clean.leaderboard, 'clean');

  const acc = profileForLaneId('accelerated');
  assert.equal(acc.id, 'accelerated');
  assert.equal(acc.canUndo, true);
  assert.equal(acc.canHint, true);
  assert.equal(acc.canContinue, true);
  assert.equal(acc.allowAds, true);
  assert.equal(acc.showLearningAids, true);
  assert.equal(acc.leaderboard, 'assisted');
});

test('[P0] LaneProfile fallback — invalid id and index map to clean', () => {
  assert.equal(profileForLaneId('clean').id, 'clean');
  assert.equal(profileForLaneId('bogus' as any).id, 'clean');
  assert.equal(profileForIndex(0).id, 'clean');
  assert.equal(profileForIndex(1).id, 'accelerated');
  assert.equal(profileForIndex(99).id, 'clean');
  assert.equal(isLaneId('clean'), true);
  assert.equal(isLaneId('accelerated'), true);
  assert.equal(isLaneId('bogus'), false);
  assert.deepStrictEqual(LANE_PROFILES.clean, profileForLaneId('clean'));
  assert.deepStrictEqual(LANE_PROFILES.accelerated, profileForLaneId('accelerated'));
});

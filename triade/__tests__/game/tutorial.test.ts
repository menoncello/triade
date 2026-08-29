import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createTutorialState, nextPhase, skipTutorial, isTutorialActive, has12MergeInResult } from '../../src/game/tutorial.ts';
import { stripCommentsAndStrings, extractSpecifiers } from '../../test-utils/helpers.ts';

function moveResultWithTrace(trace: any[], moved = true) {
  return { board: [[null]], score: 0, moved, trace, pendingSpawn: { value: 1, displayRoll: 0 } } as any;
}

test('[P0] createTutorialState starts at merge12 and is active', () => {
  const s = createTutorialState('clean');
  assert.equal(s.phase, 'merge12');
  assert.equal(s.laneId, 'clean');
  assert.equal(isTutorialActive(s), true);
});

test('[P0] NOOP does not advance tutorial phase', () => {
  const s = createTutorialState('clean');
  const noop = moveResultWithTrace([], false);
  const next = nextPhase(s, noop);
  assert.deepStrictEqual(next, s, 'noop must not advance');
});

test('[P0] merge12 only advances on 1+2→3 trace', () => {
  const s = createTutorialState('clean');
  const noMerge = moveResultWithTrace([{ value: 6, from: [[0, 0], [0, 1]], to: [0, 0], spawned: false }], true);
  assert.deepStrictEqual(nextPhase(s, noMerge), s, 'non-3 merge stays');
  const merge12 = moveResultWithTrace([{ value: 3, from: [[0, 0], [0, 1]], to: [0, 0], spawned: false }], true);
  const after = nextPhase(s, merge12);
  assert.equal(after.phase, 'merge12_followup', '1+2→3 advances to followup');
  assert.equal(has12MergeInResult(merge12), true);
});

test('[P0] followup and oneCell advance on any effective move', () => {
  let s = createTutorialState('clean');
  const merge12 = moveResultWithTrace([{ value: 3, from: [[0, 0], [0, 1]], to: [0, 0], spawned: false }], true);
  s = nextPhase(s, merge12);
  assert.equal(s.phase, 'merge12_followup');
  const anyMove = moveResultWithTrace([], true);
  s = nextPhase(s, anyMove);
  assert.equal(s.phase, 'oneCell');
  s = nextPhase(s, anyMove);
  assert.equal(s.phase, 'completed');
  assert.equal(isTutorialActive(s), false);
});

test('[P0] skipTutorial marks skipped and is not active', () => {
  const s = createTutorialState('accelerated');
  const skipped = skipTutorial(s);
  assert.equal(skipped.phase, 'skipped');
  assert.equal(isTutorialActive(skipped), false);
  // completed/skipped never rewind
  const anyMove = moveResultWithTrace([{ value: 3, from: [[0, 0], [0, 1]], to: [0, 0], spawned: false }], true);
  assert.deepStrictEqual(nextPhase(skipped, anyMove), skipped);
  const completed = { laneId: 'clean' as const, phase: 'completed' as const, stepIndex: 3 };
  assert.deepStrictEqual(nextPhase(completed, anyMove), completed);
});

test('[P1] tutorial.ts is pure — no RN/Skia/Expo imports', async () => {
  const file = fileURLToPath(new URL('../../src/game/tutorial.ts', import.meta.url));
  const src = await readFile(file, 'utf8');
  const stripped = stripCommentsAndStrings(src);
  for (const spec of extractSpecifiers(src)) {
    const lower = spec.toLowerCase();
    assert.ok(!lower.startsWith('react'), `tutorial.ts must not import ${spec}`);
    assert.ok(!lower.startsWith('react-native'), `tutorial.ts must not import ${spec}`);
    assert.ok(!lower.startsWith('@shopify'), `tutorial.ts must not import ${spec}`);
    assert.ok(!lower.startsWith('expo'), `tutorial.ts must not import ${spec}`);
  }
  assert.ok(!stripped.includes('Math.random'), 'pure module must not use Math.random');
});

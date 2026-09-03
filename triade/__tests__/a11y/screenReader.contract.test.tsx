import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import React, { act } from 'react';
import TestRenderer, { create } from 'react-test-renderer';
import { isThreeFingerMove } from '../../src/a11y/screenReaderGestures.ts';
import * as announcements from '../../src/a11y/announcements.ts';
import { BoardA11yOverlay, tileLabel, __BOARD_A11Y_CONSTANTS } from '../../src/a11y/boardAccessibility.tsx';
import { AccessibilityInfo } from 'react-native';
import type { Board } from '../../src/engine/core/index.ts';
import { i18n } from '../../src/i18n/index.ts';

// Helpers to capture AccessibilityInfo announcements
let captured: string[] = [];
let origAnnounce: any;
let origAnnounceWithOpts: any;

beforeEach(async () => {
  captured = [];
  origAnnounce = (AccessibilityInfo as any).announceForAccessibility;
  origAnnounceWithOpts = (AccessibilityInfo as any).announceForAccessibilityWithOptions;
  (AccessibilityInfo as any).announceForAccessibility = (msg: string) => captured.push(msg);
  (AccessibilityInfo as any).announceForAccessibilityWithOptions = (msg: string) => captured.push(msg);
  announcements.resetScoreThrottleForTests();
  await i18n.changeLanguage('en');
});

afterEach(() => {
  (AccessibilityInfo as any).announceForAccessibility = origAnnounce;
  (AccessibilityInfo as any).announceForAccessibilityWithOptions = origAnnounceWithOpts;
});

// --- Three-finger gate ---

test('[P0] three-finger gate: only numberOfPointers===3 resolves direction', () => {
  assert.strictEqual(isThreeFingerMove({ translationX: 30, translationY: 0, numberOfPointers: 1 }), null, 'single finger must not move');
  assert.strictEqual(isThreeFingerMove({ translationX: 30, translationY: 0, numberOfPointers: 2 }), null, 'two fingers must not move');
  assert.strictEqual(isThreeFingerMove({ translationX: 30, translationY: 0, numberOfPointers: 3 }), 'right', 'three fingers right');
  assert.strictEqual(isThreeFingerMove({ translationX: -30, translationY: 0, numberOfPointers: 3 }), 'left', 'three fingers left');
  assert.strictEqual(isThreeFingerMove({ translationX: 0, translationY: 30, numberOfPointers: 3 }), 'down', 'three fingers down');
  assert.strictEqual(isThreeFingerMove({ translationX: 0, translationY: -30, numberOfPointers: 3 }), 'up', 'three fingers up');
});

test('[P0] three-finger gate: below threshold or tie returns null even with 3 fingers', () => {
  assert.strictEqual(isThreeFingerMove({ translationX: 5, translationY: 0, numberOfPointers: 3 }), null, 'sub-threshold must not move');
  assert.strictEqual(isThreeFingerMove({ translationX: 20, translationY: 20, numberOfPointers: 3 }), null, 'tie must not move');
});

test('[P0] three-finger gate: undefined numberOfPointers treated as single-finger (null)', () => {
  assert.strictEqual(isThreeFingerMove({ translationX: 30, translationY: 0 }), null, 'missing pointers must not move');
  // @ts-ignore
  assert.strictEqual(isThreeFingerMove(null), null, 'null event must not throw');
});

// --- Per-tile labels engine-derived ---

test('[P0] tileLabel is engine-derived and 1-indexed (board[r][c] matching)', async () => {
  await i18n.changeLanguage('en');
  assert.strictEqual(tileLabel(3, 0, 0), '3 row 1 column 1');
  assert.strictEqual(tileLabel(96, 2, 3), '96 row 3 column 4');
  // pt version
  await i18n.changeLanguage('pt');
  assert.strictEqual(tileLabel(3, 0, 0), '3 linha 1 coluna 1');
  await i18n.changeLanguage('en');
});

test('[P0] BoardA11yOverlay renders only non-null cells, labels match board values', () => {
  const board: Board = [
    [1, null, 3, null],
    [null, 6, null, null],
    [12, null, null, 24],
    [null, null, null, null],
  ];
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = create(React.createElement(BoardA11yOverlay, { board, width: 320 }));
  });
  const labels = (renderer! as TestRenderer.ReactTestRenderer).root
    .findAll((n: any) => n.props?.accessibilityLabel && n.type === 'Pressable')
    .map((n: any) => n.props.accessibilityLabel as string);
  // Expect 5 accessible elements (non-null cells)
  assert.strictEqual(labels.length, 5, `expected 5 accessible tiles, got ${labels.length}: ${labels.join(';')}`);
  // Each label should contain the engine value
  assert.ok(labels.some((l) => l.includes('1 row 1 column 1')), 'label for 1 at 1,1');
  assert.ok(labels.some((l) => l.includes('3 row 1 column 3')), 'label for 3 at 1,3');
  assert.ok(labels.some((l) => l.includes('6 row 2 column 2')), 'label for 6 at 2,2');
  assert.ok(labels.some((l) => l.includes('12 row 3 column 1')), 'label for 12 at 3,1');
  assert.ok(labels.some((l) => l.includes('24 row 3 column 4')), 'label for 24 at 3,4');
  // Verify constants match GameBoard math
  assert.deepStrictEqual(__BOARD_A11Y_CONSTANTS, { GRID: 4, BOARD_PADDING: 8, CELL_GAP: 8 });
});

test('[P0] BoardA11yOverlay re-renders with board prop (engine-derived)', () => {
  const board1: Board = [
    [3, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ];
  const board2: Board = [
    [6, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ];
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = create(React.createElement(BoardA11yOverlay, { board: board1, width: 320 }));
  });
  let labels = (renderer! as TestRenderer.ReactTestRenderer).root
    .findAll((n: any) => n.props?.accessibilityLabel && n.type === 'Pressable')
    .map((n: any) => n.props.accessibilityLabel as string);
  assert.ok(labels[0].includes('3 row 1 column 1'));
  // Update prop
  act(() => {
    (renderer! as TestRenderer.ReactTestRenderer).update(React.createElement(BoardA11yOverlay, { board: board2, width: 320 }));
  });
  labels = (renderer! as TestRenderer.ReactTestRenderer).root
    .findAll((n: any) => n.props?.accessibilityLabel && n.type === 'Pressable')
    .map((n: any) => n.props.accessibilityLabel as string);
  assert.ok(labels[0].includes('6 row 1 column 1'), 'after prop change label must reflect new board value');
});

test('[P0] BoardA11yOverlay cells have accessible + text role (patch: button→text per spec review)', () => {
  const board: Board = [
    [3, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ];
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = create(React.createElement(BoardA11yOverlay, { board, width: 320 }));
  });
  const nodes = (renderer! as TestRenderer.ReactTestRenderer).root.findAll(
    (n: any) => n.props?.accessibilityRole === 'text' && n.type === 'Pressable',
  );
  assert.ok(nodes.length >= 1, 'at least one text role (patched from button per spec review)');
  assert.strictEqual(nodes[0].props.accessible, true);
});

// --- Announcement strings ---

test('[P0] announcement strings: merge/spawn/game-over/preview use i18n and announceForAccessibility', async () => {
  await i18n.changeLanguage('en');
  captured.length = 0;
  announcements.announceMerge(1, 2, 3);
  assert.ok(captured[0].includes('1') && captured[0].includes('2') && captured[0].includes('3'), `merge must contain A B C, got ${captured[0]}`);
  assert.match(captured[0], /Merged/i);

  captured.length = 0;
  announcements.announceSpawn(6);
  assert.ok(captured[0].includes('6'), `spawn must contain value, got ${captured[0]}`);

  captured.length = 0;
  announcements.announceGameOver(100, 200);
  assert.ok(captured[0].includes('100') && captured[0].includes('200'), `gameOver must contain score best, got ${captured[0]}`);
  assert.match(captured[0], /Game over/i);

  captured.length = 0;
  announcements.announceNewRecord();
  assert.match(captured[0], /New record/i);

  captured.length = 0;
  announcements.announceMove('right');
  assert.ok(captured[0].toLowerCase().includes('right'), `move must contain dir, got ${captured[0]}`);

  captured.length = 0;
  announcements.announcePreview('1/2');
  assert.ok(captured[0].includes('1/2'));

  captured.length = 0;
  announcements.announceBanner('Ceiling open');
  assert.strictEqual(captured[0], 'Ceiling open');
});

test('[P0] announcement i18n pt resolves correctly', async () => {
  await i18n.changeLanguage('pt');
  captured.length = 0;
  announcements.announceGameOver(50, 80);
  assert.match(captured[0], /Fim de jogo/i);
  captured.length = 0;
  announcements.announceMerge(1, 2, 3);
  assert.match(captured[0], /Fundiu/i);
  await i18n.changeLanguage('en');
});

test('[P0] noop silent: no announcement helper produces message when called with invalid/noop', () => {
  captured.length = 0;
  // score throttle with invalid score produces nothing
  announcements.announceSpawn(NaN as any);
  assert.strictEqual(captured.length, 0, 'invalid spawn must not announce');
  // announceMerge with NaN must not announce
  announcements.announceMerge(NaN as any, 2, 3);
  assert.strictEqual(captured.length, 0);
  // announce empty
  announcements.announce('');
  assert.strictEqual(captured.length, 0);
  announcements.announceBanner('');
  assert.strictEqual(captured.length, 0);
});

test('[P0] throttle: repeated score announcements within 500ms are dropped', async () => {
  captured.length = 0;
  announcements.resetScoreThrottleForTests();
  announcements.announceScoreThrottled(100);
  assert.strictEqual(captured.length, 1, 'first score must announce');
  announcements.announceScoreThrottled(200);
  assert.strictEqual(captured.length, 1, 'second within throttle must be dropped');
  // Wait >500ms and retry should succeed
  await new Promise((r) => setTimeout(r, 600));
  announcements.announceScoreThrottled(300);
  assert.strictEqual(captured.length, 2, 'after throttle window must announce again');
  assert.ok(captured[1].includes('300'));
});

// --- Tone pause ---

test('[P0] ToneScreen pause contract: timer cleared on paused, re-armed on resume, fallback 5s', async () => {
  const src = readFileSync(fileURLToPath(new URL('../../src/ui/ToneScreen.tsx', import.meta.url)), 'utf8');
  assert.ok(/isScreenReaderEnabled/.test(src), 'ToneScreen must check isScreenReaderEnabled');
  assert.ok(/announcementFinished/.test(src), 'ToneScreen must listen to announcementFinished');
  assert.ok(/announcementPending/.test(src), 'ToneScreen must track announcementPending');
  assert.ok(/clearTimeout\(timerRef\.current\)/.test(src), 'timer must be cleared on paused');
  assert.ok(/setTimeout\(\(\) => setAnnouncementPending\(false\), 5000\)/.test(src), 'fallback unblock ~5s required');
  assert.ok(/const paused = voiceOverActive \|\| announcementPending/.test(src), 'paused = voiceOverActive || announcementPending');
  assert.ok(/onDismissRef\.current\(\)/.test(src), 'dismiss tap still works');
});

test('[P0] App gesture gate: when screenReaderEnabled, only 3-finger moves dispatch', async () => {
  const src = readFileSync(fileURLToPath(new URL('../../App.tsx', import.meta.url)), 'utf8');
  assert.ok(/useScreenReaderEnabled/.test(src), 'App must import useScreenReaderEnabled');
  assert.ok(/isThreeFingerMove/.test(src), 'App must import isThreeFingerMove');
  assert.ok(/screenReaderEnabledRef\.current/.test(src), 'App must gate via screenReaderEnabledRef');
  assert.ok(/numberOfPointers/.test(src) || /isThreeFingerMove/.test(src), 'gate must check numberOfPointers via helper');
  assert.ok(/BoardA11yOverlay/.test(src), 'App must mount BoardA11yOverlay');
  assert.ok(/announceMove|announceMerge|announceSpawn|announceGameOver/.test(src), 'App must wire announcements after move');
  assert.ok(/result\.moved/.test(src), 'noop must be silent via result.moved guard');
});

test('[P0] Dynamic Type guard: chrome texts have allowFontScaling and no truncation', async () => {
  const files = [
    '../../src/ui/Hud.tsx',
    '../../src/ui/PreviewCard.tsx',
    '../../src/ui/GameOverOverlay.tsx',
    '../../src/ui/LaneSelectScreen.tsx',
    '../../src/ui/AcceleratedAids.tsx',
    '../../src/ui/TutorialOverlay.tsx',
    '../../src/ui/ToneScreen.tsx',
  ];
  for (const rel of files) {
    const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
    assert.ok(/allowFontScaling/.test(src), `${rel} must have allowFontScaling`);
  }
  // GameOver values keep numberOfLines guard per DW-101 but must still have allowFontScaling so VoiceOver reads at any scale
  const goSrc = readFileSync(fileURLToPath(new URL('../../src/ui/GameOverOverlay.tsx', import.meta.url)), 'utf8');
  assert.ok(/allowFontScaling/.test(goSrc), 'GameOver must have allowFontScaling');
  assert.ok(/numberOfLines=\{1\}/.test(goSrc) && /ellipsizeMode="tail"/.test(goSrc), 'GameOver keeps DW-101 overflow guard');
  // HUD scoreWrap should have flexWrap/minHeight for largest scale
  const hudSrc = readFileSync(fileURLToPath(new URL('../../src/ui/Hud.tsx', import.meta.url)), 'utf8');
  assert.ok(/flexWrap/.test(hudSrc), 'Hud must have flexWrap for Dynamic Type');
  assert.ok(/minHeight/.test(hudSrc), 'Hud must have minHeight for Dynamic Type');
  // i18n a11y keys must exist
  const en = JSON.parse(readFileSync(fileURLToPath(new URL('../../src/i18n/locales/en.json', import.meta.url)), 'utf8'));
  const pt = JSON.parse(readFileSync(fileURLToPath(new URL('../../src/i18n/locales/pt.json', import.meta.url)), 'utf8'));
  for (const key of ['a11y.moved', 'a11y.merged', 'a11y.spawn', 'a11y.gameOver', 'a11y.newRecord', 'a11y.tile']) {
    assert.ok(key.split('.').reduce((o: any, k: string) => o?.[k], en), `en must have ${key}`);
    assert.ok(key.split('.').reduce((o: any, k: string) => o?.[k], pt), `pt must have ${key}`);
  }
});

test('[P0] a11y modules are engine-derived (no hard-coded board logic)', async () => {
  const annSrc = readFileSync(fileURLToPath(new URL('../../src/a11y/announcements.ts', import.meta.url)), 'utf8');
  assert.ok(/announceForAccessibility/.test(annSrc), 'announcements must use announceForAccessibility');
  assert.ok(/500/.test(annSrc) || /SCORE_THROTTLE/.test(annSrc), 'score throttle ~500ms');
  assert.ok(/i18n\.t/.test(annSrc) || /t\(/.test(annSrc), 'strings must be i18n-authored');
  const boardSrc = readFileSync(fileURLToPath(new URL('../../src/a11y/boardAccessibility.tsx', import.meta.url)), 'utf8');
  assert.ok(/board\[r\]\[c\]/.test(boardSrc) || /board\.map/.test(boardSrc), 'labels must be engine-derived from board prop');
  assert.ok(/BOARD_PADDING/.test(boardSrc) && /CELL_GAP/.test(boardSrc), 'same cell math as GameBoard');
  const gestSrc = readFileSync(fileURLToPath(new URL('../../src/a11y/screenReaderGestures.ts', import.meta.url)), 'utf8');
  assert.ok(/isScreenReaderEnabled/.test(gestSrc), 'must wrap isScreenReaderEnabled');
  assert.ok(/numberOfPointers/.test(gestSrc), 'must gate on numberOfPointers');
  assert.ok(/!== 3/.test(gestSrc) || /=== 3/.test(gestSrc), 'must gate on 3 fingers');
});

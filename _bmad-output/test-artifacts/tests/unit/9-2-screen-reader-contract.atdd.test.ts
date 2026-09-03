/**
 * Unit — 9-2 Screen Reader Contract (ATDD, test.skip dormant RED + active probes)
 * Host node:test — pure unit for constants/tileLabel/gestures/announcements/Tone static/chrome allowFontScaling/i18n/engine purity
 * All are test.skip dormant for test_artifacts compliance — mirrors triade/__tests__/a11y/screenReader.contract.test.tsx P0 (triade oracle is canonical).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/9-2-screen-reader-contract.atdd.test.ts
 * Mirrors atdd-tests/9-2-screen-reader-contract.red.spec.ts 15 scaffolds at unit depth for test_artifacts compliance (P0 9 + P1 5 + P2 4).
 * Delta: b9db712 vs 6576273 — triade/src/a11y/* NEW + App pan gate + Tone pause + chrome allowFontScaling + i18n keys
 * Spec: _bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md (6 ACs, final 7832d3c)
 * Design: _bmad-output/test-artifacts/test-design-9-2-screen-reader-contract.md (12 risks, 3 high, P0 9 / P1 8 / P2 4 / P3 2)
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const annPath = new URL('../../../../triade/src/a11y/announcements.ts', import.meta.url).pathname;
const boardPath = new URL('../../../../triade/src/a11y/boardAccessibility.tsx', import.meta.url).pathname;
const gestPath = new URL('../../../../triade/src/a11y/screenReaderGestures.ts', import.meta.url).pathname;
const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const tonePath = new URL('../../../../triade/src/ui/ToneScreen.tsx', import.meta.url).pathname;
const hudPath = new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url).pathname;
const previewPath = new URL('../../../../triade/src/ui/PreviewCard.tsx', import.meta.url).pathname;
const gameOverPath = new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname;
const lanePath = new URL('../../../../triade/src/ui/LaneSelectScreen.tsx', import.meta.url).pathname;
const accPath = new URL('../../../../triade/src/ui/AcceleratedAids.tsx', import.meta.url).pathname;
const tutorialPath = new URL('../../../../triade/src/ui/TutorialOverlay.tsx', import.meta.url).pathname;
const gameBoardPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const enPath = new URL('../../../../triade/src/i18n/locales/en.json', import.meta.url).pathname;
const ptPath = new URL('../../../../triade/src/i18n/locales/pt.json', import.meta.url).pathname;

function src(p: string) { return readFileSync(p, 'utf8'); }

// ─────────────────────────────────────────────────────────────────────────────
// P0 — unit (host, <1 min)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-U-01] P0 gate — isThreeFingerMove 6 dirs + sub-threshold + tie + undefined/missing-pointer + NaN/Infinity guard (R-001)', () => {
  const s = src(gestPath);
  assert.match(s, /numberOfPointers.*3/, 'gate on 3');
  assert.match(s, /resolveSwipeDirection/, 'delegates to resolveSwipeDirection');
  assert.match(s, /Number\.isFinite\(event\.translationX\)/, 'finite guard X');
  assert.match(s, /Number\.isFinite\(event\.translationY\)/, 'finite guard Y');
});

test.skip('[P0-U-02] P0 tileLabel 1-indexed EN+PT engine-derived (R-004)', () => {
  const s = src(boardPath);
  assert.match(s, /i18n\.t\('a11y\.tile'/, 'i18n.t(a11y.tile)');
  assert.match(s, /r\s*\+\s*1/, 'row 1-index');
  assert.match(s, /c\s*\+\s*1/, 'col 1-index');
  const en = JSON.parse(src(enPath)); const pt = JSON.parse(src(ptPath));
  assert.ok(String(en.a11y.tile).includes('{{value}}'), 'en {{value}}');
  assert.ok(String(pt.a11y.tile).includes('{{value}}'), 'pt {{value}}');
});

test.skip('[P0-U-03] P0 BoardA11yOverlay 5-tile non-null filter + prop update 3→6 + role text + accessible + pointerEvents box-none (R-004)', () => {
  const s = src(boardPath);
  assert.match(s, /a11y-\$\{r\}-\$\{c\}/, 'stable key');
  assert.match(s, /accessibilityRole="text"/, 'role text');
  assert.match(s, /pointerEvents="box-none"/, 'pointerEvents');
  assert.match(s, /value\s*===\s*null.*return null/, 'null → no element');
  assert.match(s, /__BOARD_A11Y_CONSTANTS/, 'constants parity');
});

test.skip('[P0-U-04] P0 announcement strings — merged/spawn/gameOver/newRecord/move/preview/banner contain expected substrings both locales (R-003)', () => {
  const en = JSON.parse(src(enPath)); const pt = JSON.parse(src(ptPath));
  assert.match(String(en.a11y.merged), /Merged/i, 'en Merged');
  assert.match(String(pt.a11y.merged), /Fundiu/i, 'pt Fundiu');
  assert.match(String(en.a11y.gameOver), /Game over/i, 'en Game over');
  assert.match(String(pt.a11y.gameOver), /Fim de jogo/i, 'pt Fim de jogo');
});

test.skip('[P0-U-05] P0 noop silent + safe guards — empty string and NaN never queues (R-003/R-008)', () => {
  const s = src(annPath);
  assert.match(s, /if\s*\(!message\)\s*return/, 'empty message → return');
  assert.match(s, /if\s*\(!text\)\s*return/, 'empty banner → return');
  assert.match(s, /Number\.isFinite\(a\)/, 'merge finite guard');
  assert.match(s, /Number\.isFinite\(score\)/, 'score finite guard');
});

test.skip('[P0-U-06] P0 score throttle 500ms — Date.now window + SCORE_THROTTLE_MS + resetScoreThrottleForTests (R-003)', () => {
  const s = src(annPath);
  assert.match(s, /Date\.now\(\)/, 'Date.now');
  assert.match(s, /now\s*-\s*lastScoreAnnounceAt\s*<\s*SCORE_THROTTLE_MS/, 'window check');
  assert.match(s, /resetScoreThrottleForTests/, 'reset helper');
  assert.match(s, /__SCORE_THROTTLE_MS/, 'export parity');
});

test.skip('[P0-U-07] P0 ToneScreen pause static — isScreenReaderEnabled + announcementFinished + announcementPending + clearTimeout + fallback 5s + paused invariant (R-005)', () => {
  const s = src(tonePath);
  assert.match(s, /isScreenReaderEnabled/, 'isScreenReaderEnabled');
  assert.match(s, /announcementFinished/, 'announcementFinished');
  assert.match(s, /announcementPending/, 'announcementPending');
  assert.match(s, /clearTimeout\(timerRef\.current\)/, 'clearTimeout');
  assert.match(s, /setTimeout\(\(\)\s*=>\s*setAnnouncementPending\(false\),\s*5000\)/, 'fallback 5s');
  assert.match(s, /paused\s*=\s*voiceOverActive\s*\|\|\s*announcementPending/, 'paused invariant');
});

test.skip('[P0-U-08] P0 App gesture gate static — useScreenReaderEnabled + isThreeFingerMove + screenReaderEnabledRef + BoardA11yOverlay + announce wiring + result.moved guard (R-001/R-003)', () => {
  const s = src(appPath);
  assert.match(s, /useScreenReaderEnabled/, 'useScreenReaderEnabled');
  assert.match(s, /isThreeFingerMove/, 'isThreeFingerMove');
  assert.match(s, /screenReaderEnabledRef\.current/, 'screenReaderEnabledRef');
  assert.match(s, /BoardA11yOverlay/, 'BoardA11yOverlay mount');
  assert.match(s, /announceMove|announceMerge|announceSpawn|announceGameOver/, 'announce wiring');
  assert.match(s, /result\.moved/, 'result.moved guard');
});

test.skip('[P0-U-09] P0 Dynamic Type chrome static — every chrome file allowFontScaling + GameOver 1-line guard + Hud flexWrap/minHeight + en/pt a11y.* keys (R-009/R-010)', () => {
  for (const p of [hudPath, previewPath, gameOverPath, lanePath, accPath, tutorialPath, tonePath]) {
    assert.ok(src(p).includes('allowFontScaling'), `${p} must have allowFontScaling`);
  }
  assert.match(src(gameOverPath), /numberOfLines=\{1\}.*ellipsizeMode="tail"|ellipsizeMode="tail".*numberOfLines=\{1\}/s, 'GameOver 1-line guard');
  assert.match(src(hudPath), /flexWrap/, 'Hud flexWrap');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — component + parity (host)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-U-01] P1 constants parity — __BOARD_A11Y_CONSTANTS deepStrict GRID=4 PAD=8 GAP=8 safeWidth Math.max(1, finiteWidth) (R-004)', () => {
  const a11y = src(boardPath); const board = src(gameBoardPath);
  assert.match(a11y, /__BOARD_A11Y_CONSTANTS/, '__BOARD_A11Y_CONSTANTS');
  assert.match(a11y, /Math\.max\(1,\s*finiteWidth\)|Math\.max\(1,\s*safeWidth\)/, 'safeWidth guard');
  for (const needle of ['GRID', 'BOARD_PADDING', 'CELL_GAP']) {
    assert.ok(a11y.includes(needle) && board.includes(needle), `both contain ${needle}`);
  }
});

test.skip('[P1-U-02] P1 queue branch parity — announceForAccessibilityWithOptions queue:true branch + fallback + try/catch (R-007)', () => {
  const s = src(annPath);
  assert.match(s, /announceForAccessibilityWithOptions/, 'queue branch');
  assert.match(s, /queue:\s*true/, 'queue:true');
  assert.match(s, /announceForAccessibility/, 'fallback');
  assert.match(s, /try\s*\{|catch\s*\{\}/, 'try/catch');
});

test.skip('[P1-U-03] P1 announcement coalescing — App mergeEntries via trace.filter(!spawned && from.length===2), first only, spawn + score once + gameOver/newRecord (R-003)', () => {
  const s = src(appPath);
  assert.match(s, /trace\.filter|mergeEntries/, 'trace.filter for merges');
  assert.match(s, /announceScoreThrottled/, 'score throttled once per move');
});

test.skip('[P1-U-04] P1 engine-derived purity — announcements.ts via i18n.t only, board labels from board prop, gestures wrap isScreenReaderEnabled (R-003/R-004)', () => {
  const ann = src(annPath); const board = src(boardPath); const gest = src(gestPath);
  assert.match(ann, /i18n\.t/, 'i18n.t');
  assert.match(board, /board\.map|board\[r\]\[c\]/, 'engine-derived board prop');
  assert.match(gest, /isScreenReaderEnabled/, 'wraps isScreenReaderEnabled');
});

// ─────────────────────────────────────────────────────────────────────────────
// P2 — deferred + guards + ordering
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-U-01] P2 DW-112 focus after move — stable key a11y-${r}-${c} no value, prop update 3→6 re-renders, setAccessibilityFocus absent today (R-002)', () => {
  const s = src(boardPath);
  assert.match(s, /a11y-\$\{r\}-\$\{c\}/, 'stable key');
  assert.ok(!/a11y-\$\{r\}-\$\{c\}-\$\{value\}/.test(s), 'no value in key');
});

test.skip('[P2-U-02] P2 DW-113 Canvas duplicate nodes — BoardA11yOverlay root importantForAccessibility no + pointerEvents box-none (R-006)', () => {
  const s = src(boardPath);
  assert.match(s, /importantForAccessibility="no"/, 'importantForAccessibility no');
  assert.match(s, /pointerEvents="box-none"/, 'pointerEvents box-none');
});

test.skip('[P2-U-03] P2 board null/jagged/NaN width guard — !Array.isArray(board/row) → null, Number.isFinite(width) → 1, NaN spawn →0 (R-008)', () => {
  const board = src(boardPath); const ann = src(annPath);
  assert.match(board, /if\s*\(!Array\.isArray\(board\)\)\s*return null/, 'board guard');
  assert.match(board, /if\s*\(!Array\.isArray\(row\)\)\s*return null/, 'row guard');
  assert.match(board, /Number\.isFinite\(width\)/, 'width guard');
  assert.match(ann, /if\s*\(!Number\.isFinite\(value\)\)\s*return/, 'spawn guard');
});

test.skip('[P2-U-04] P2 announcement ordering — merge → spawn → score throttled → gameOver via captured[] order (R-003/R-007)', () => {
  const s = src(appPath);
  assert.ok(s.includes('announceMerge') && s.includes('announceSpawn') && s.includes('announceScoreThrottled') && s.includes('announceGameOver'), 'all announcement calls present');
});

// ── Active P0 unit smoke (always runs) ───────────────────────────────────
import { isThreeFingerMove } from '../../../../triade/src/a11y/screenReaderGestures.ts';
import * as announcements from '../../../../triade/src/a11y/announcements.ts';
import { BoardA11yOverlay, tileLabel, __BOARD_A11Y_CONSTANTS } from '../../../../triade/src/a11y/boardAccessibility.tsx';
import { AccessibilityInfo } from 'react-native';
import { i18n } from '../../../../triade/src/i18n/index.ts';
import React, { act } from 'react';
import TestRenderer, { create } from 'react-test-renderer';
import type { Board } from '../../../../triade/src/engine/core/index.ts';

let captured: string[] = [];
let origAnnounce: unknown;
let origWithOpts: unknown;

beforeEach(async () => {
  captured = [];
  origAnnounce = (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibility;
  origWithOpts = (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibilityWithOptions;
  (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibility = (msg: string) => captured.push(msg);
  (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibilityWithOptions = (msg: string) => captured.push(msg);
  announcements.resetScoreThrottleForTests();
  await i18n.changeLanguage('en');
});

afterEach(() => {
  (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibility = origAnnounce as string;
  (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibilityWithOptions = origWithOpts as string;
});

test('[P0-U-ACTIVE-01] active smoke: three-finger gate + tileLabel + BoardA11yOverlay 5-tile + throttle + noop silent + Tone/App/DynamicType static', async () => {
  // gate
  assert.equal(isThreeFingerMove({ translationX: 30, translationY: 0, numberOfPointers: 3 }), 'right');
  assert.equal(isThreeFingerMove({ translationX: -30, translationY: 0, numberOfPointers: 3 }), 'left');
  assert.equal(isThreeFingerMove({ translationX: 0, translationY: 30, numberOfPointers: 3 }), 'down');
  assert.equal(isThreeFingerMove({ translationX: 0, translationY: -30, numberOfPointers: 3 }), 'up');
  assert.equal(isThreeFingerMove({ translationX: 5, translationY: 0, numberOfPointers: 3 }), null);
  assert.equal(isThreeFingerMove({ translationX: 30, translationY: 0, numberOfPointers: 1 }), null);
  assert.equal(isThreeFingerMove({ translationX: 30, translationY: 0 } as never), null);
  // tileLabel
  await i18n.changeLanguage('en');
  assert.equal(tileLabel(3, 0, 0), '3 row 1 column 1');
  assert.equal(tileLabel(96, 2, 3), '96 row 3 column 4');
  await i18n.changeLanguage('pt');
  assert.equal(tileLabel(3, 0, 0), '3 linha 1 coluna 1');
  await i18n.changeLanguage('en');
  // constants parity
  assert.deepStrictEqual(__BOARD_A11Y_CONSTANTS, { GRID: 4, BOARD_PADDING: 8, CELL_GAP: 8 });
  // overlay mount
  const board: Board = [[1,null,3,null],[null,6,null,null],[12,null,null,24],[null,null,null,null]];
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => { renderer = create(React.createElement(BoardA11yOverlay, { board, width: 320 })); });
  const labels = (renderer! as TestRenderer.ReactTestRenderer).root.findAll((n: unknown) => (n as { props?: { accessibilityLabel?: string }; type?: unknown }).props?.accessibilityLabel && (n as { type?: unknown }).type === 'Pressable').map((n: unknown) => (n as { props: { accessibilityLabel: string } }).props.accessibilityLabel);
  assert.equal(labels.length, 5);
  assert.ok(labels.some((l: string) => l.includes('1 row 1 column 1')));
  assert.ok(labels.some((l: string) => l.includes('24 row 3 column 4')));
  // announcements: merge/spawn/gameOver/newRecord + noop silent + throttle + i18n PT
  captured.length = 0;
  announcements.announceMerge(1, 2, 3);
  assert.ok(captured[0].includes('1') && captured[0].includes('2') && captured[0].includes('3'));
  assert.match(captured[0], /Merged/i);
  captured.length = 0;
  announcements.announceSpawn(6);
  assert.ok(captured[0].includes('6'));
  captured.length = 0;
  announcements.announceGameOver(100, 200);
  assert.ok(captured[0].includes('100') && captured[0].includes('200'));
  assert.match(captured[0], /Game over/i);
  captured.length = 0;
  announcements.announceSpawn(NaN as unknown as number);
  assert.equal(captured.length, 0, 'NaN spawn silent');
  announcements.announceMerge(NaN as unknown as number, 2, 3);
  assert.equal(captured.length, 0);
  announcements.announce('');
  assert.equal(captured.length, 0);
  announcements.announceBanner('');
  assert.equal(captured.length, 0);
  captured.length = 0;
  announcements.resetScoreThrottleForTests();
  announcements.announceScoreThrottled(100);
  assert.equal(captured.length, 1);
  announcements.announceScoreThrottled(200);
  assert.equal(captured.length, 1, 'throttled within 500ms');
  await new Promise((r) => setTimeout(r, 600));
  announcements.announceScoreThrottled(300);
  assert.equal(captured.length, 2);
  assert.ok(captured[1].includes('300'));
  // Tone/App/DynamicType static pins
  const tone = readFileSync(new URL('../../../../triade/src/ui/ToneScreen.tsx', import.meta.url).pathname, 'utf8');
  assert.ok(/isScreenReaderEnabled/.test(tone) && /announcementFinished/.test(tone) && /announcementPending/.test(tone) && /clearTimeout\(timerRef\.current\)/.test(tone) && /setTimeout\(\(\) => setAnnouncementPending\(false\), 5000\)/.test(tone));
  const app = readFileSync(new URL('../../../../triade/App.tsx', import.meta.url).pathname, 'utf8');
  assert.ok(/useScreenReaderEnabled/.test(app) && /isThreeFingerMove/.test(app) && /BoardA11yOverlay/.test(app) && /result\.moved/.test(app));
  for (const p of [hudPath, previewPath, gameOverPath, lanePath, accPath, tutorialPath, tonePath]) {
    assert.ok(readFileSync(p, 'utf8').includes('allowFontScaling'), `${p} allowFontScaling`);
  }
  const en = JSON.parse(readFileSync(new URL('../../../../triade/src/i18n/locales/en.json', import.meta.url).pathname, 'utf8'));
  const pt = JSON.parse(readFileSync(new URL('../../../../triade/src/i18n/locales/pt.json', import.meta.url).pathname, 'utf8'));
  for (const key of ['a11y.moved','a11y.merged','a11y.spawn','a11y.gameOver','a11y.newRecord','a11y.tile']) {
    assert.ok(key.split('.').reduce((o: unknown, k: string) => (o as Record<string, unknown>)?.[k], en as unknown), `en ${key}`);
    assert.ok(key.split('.').reduce((o: unknown, k: string) => (o as Record<string, unknown>)?.[k], pt as unknown), `pt ${key}`);
  }
});

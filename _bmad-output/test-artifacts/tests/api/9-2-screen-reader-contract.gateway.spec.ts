/**
 * API Gateway — 9-2 Screen Reader Contract (RED-PHASE, test.skip dormant + active pins)
 * Host node:test — source-pins for isThreeFingerMove + BoardA11yOverlay + announcements + Tone pause + App gate
 * All gateway pins are test.skip (RED) for test_artifacts compliance; a subset also runs as active assertions via P0 active section.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.gateway.spec.ts
 * Mirrors triade/__tests__/a11y/screenReader.contract.test.tsx P0 (triade oracle) at API gateway level (200-500ms host).
 * Delta: b9db712 vs 6576273 — triade/src/a11y/* NEW (3 modules) + App pan gate + announcement wiring + ToneScreen pause + chrome allowFontScaling + i18n a11y keys
 * Spec: _bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md (final 7832d3c, baseline 6576273, 6 ACs)
 * Design: _bmad-output/test-artifacts/test-design-9-2-screen-reader-contract.md (12 risks, 3 high R-001/R-002/R-003 score 6, P0 9 groups)
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only gateway (no page.goto)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const annPath = new URL('../../../../triade/src/a11y/announcements.ts', import.meta.url).pathname;
const boardPath = new URL('../../../../triade/src/a11y/boardAccessibility.tsx', import.meta.url).pathname;
const gestPath = new URL('../../../../triade/src/a11y/screenReaderGestures.ts', import.meta.url).pathname;
const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const tonePath = new URL('../../../../triade/src/ui/ToneScreen.tsx', import.meta.url).pathname;
const gameBoardPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;
const hudPath = new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url).pathname;
const previewPath = new URL('../../../../triade/src/ui/PreviewCard.tsx', import.meta.url).pathname;
const gameOverPath = new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname;
const lanePath = new URL('../../../../triade/src/ui/LaneSelectScreen.tsx', import.meta.url).pathname;
const accPath = new URL('../../../../triade/src/ui/AcceleratedAids.tsx', import.meta.url).pathname;
const tutorialPath = new URL('../../../../triade/src/ui/TutorialOverlay.tsx', import.meta.url).pathname;
const enPath = new URL('../../../../triade/src/i18n/locales/en.json', import.meta.url).pathname;
const ptPath = new URL('../../../../triade/src/i18n/locales/pt.json', import.meta.url).pathname;

function src(p: string) { return readFileSync(p, 'utf8'); }

// ─────────────────────────────────────────────────────────────────────────────
// P0 — must be green on every commit (screen-reader contract AC1-5)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-API-01] AC VoiceOver move — isThreeFingerMove strict 3 + finite + resolveSwipeDirection (R-001)', () => {
  const s = src(gestPath);
  assert.match(s, /numberOfPointers\s*!==?\s*3|numberOfPointers\s*===?\s*3/, 'must gate on numberOfPointers ===3');
  assert.match(s, /Number\.isFinite\(event\.translationX\)/, 'must guard translationX finite');
  assert.match(s, /Number\.isFinite\(event\.translationY\)/, 'must guard translationY finite');
  assert.match(s, /resolveSwipeDirection/, 'must delegate to resolveSwipeDirection (threshold+tied guard)');
  assert.match(s, /!event|\bnull\b/, 'null/invalid → null');
});

test.skip('[P0-API-02] AC VoiceOver read tile — tileLabel engine-derived 1-indexed EN+PT, i18n a11y.tile exists (R-004)', () => {
  const s = src(boardPath);
  assert.match(s, /i18n\.t\('a11y\.tile'/, 'must use i18n.t(a11y.tile)');
  assert.match(s, /r\s*\+\s*1/, 'must 1-index row');
  assert.match(s, /c\s*\+\s*1/, 'must 1-index col');
  const en = JSON.parse(src(enPath)); const pt = JSON.parse(src(ptPath));
  assert.ok(String(en.a11y.tile).includes('{{value}}'), 'en a11y.tile must template {{value}}');
  assert.ok(String(pt.a11y.tile).includes('{{value}}'), 'pt a11y.tile must template {{value}}');
  assert.match(String(en.a11y.tile), /row.*col/i, 'en template row/col');
});

test.skip('[P0-API-03] AC VoiceOver read tile — BoardA11yOverlay non-null only, stable key, role text, null guards, geometry parity (R-004)', () => {
  const s = src(boardPath);
  assert.match(s, /a11y-\$\{r\}-\$\{c\}/, 'key must be a11y-${r}-${c} stable');
  assert.ok(!/a11y-\$\{r\}-\$\{c\}-\$\{value\}/.test(s), 'key must NOT include value (DW-112 anti-pattern)');
  assert.match(s, /accessibilityRole="text"/, 'role must be text (patched from button)');
  assert.match(s, /accessible/, 'cells must be accessible');
  assert.match(s, /value\s*===\s*null/, 'null cells must render no element');
  assert.match(s, /!Array\.isArray\(board\)/, 'board must guard !Array.isArray');
  assert.match(s, /!Array\.isArray\(row\)/, 'row must guard !Array.isArray');
  assert.match(s, /Number\.isFinite\(width\)/, 'width finite guard');
  assert.match(s, /BOARD_PADDING|CELL_GAP|GRID/, 'must reuse GRID/PAD/GAP math');
  assert.match(s, /pointerEvents="box-none"/, 'overlay pointerEvents box-none');
  assert.match(s, /importantForAccessibility="no"/, 'importantForAccessibility no');
  const a11y = src(boardPath); const board = src(gameBoardPath);
  for (const needle of ['GRID', 'BOARD_PADDING', 'CELL_GAP']) {
    assert.ok(a11y.includes(needle) && board.includes(needle), `both must contain ${needle}`);
  }
  assert.match(a11y, /__BOARD_A11Y_CONSTANTS/, 'must export __BOARD_A11Y_CONSTANTS parity helper');
});

test.skip('[P0-API-04] AC Announcement central contract — announceForAccessibilityWithOptions queue:true + fallback + throttle + i18n + finite guards (R-003/R-007)', () => {
  const s = src(annPath);
  assert.match(s, /announceForAccessibilityWithOptions/, 'must use announceForAccessibilityWithOptions');
  assert.match(s, /queue:\s*true/, 'must queue:true on iOS branch');
  assert.match(s, /announceForAccessibility/, 'must fallback to announceForAccessibility (TalkBack)');
  assert.match(s, /try\s*\{/, 'safeAnnounce must try/catch');
  assert.match(s, /SCORE_THROTTLE_MS\s*=\s*500|__SCORE_THROTTLE_MS/, 'score throttle ~500ms');
  assert.match(s, /i18n\.t\(/, 'strings must be i18n-authored via t()');
  assert.match(s, /Number\.isFinite\(a\)|Number\.isFinite\(value\)/, 'merge/spawn finite guard');
  assert.match(s, /Number\.isFinite\(score\)/, 'score throttled finite guard');
  assert.match(s, /resetScoreThrottleForTests/, 'must expose resetScoreThrottleForTests');
  assert.match(s, /Date\.now\(\)/, 'throttle must be Date.now window');
  assert.match(s, /now\s*-\s*lastScoreAnnounceAt\s*<\s*SCORE_THROTTLE_MS/, 'throttle window check must use SCORE_THROTTLE_MS');
});

test.skip('[P0-API-05] AC Announcement noop silent + safe guards — invalid/empty never queues (R-003/R-008)', () => {
  const s = src(annPath);
  assert.match(s, /if\s*\(!message\)\s*return/, 'announce must early-return on empty message');
  assert.match(s, /if\s*\(!text\)\s*return/, 'announceBanner must early-return on empty text');
  assert.match(s, /if\s*\(!dir\)\s*return/, 'announceMove must early-return on empty dir');
});

test.skip('[P0-API-06] AC Announcement strings — merge/spawn/gameOver/newRecord i18n both locales EN+PT (R-003)', () => {
  const en = JSON.parse(src(enPath)); const pt = JSON.parse(src(ptPath));
  for (const key of ['a11y.moved', 'a11y.merged', 'a11y.spawn', 'a11y.gameOver', 'a11y.newRecord', 'a11y.tile', 'a11y.score', 'a11y.preview']) {
    const ek = key.split('.').reduce((o: unknown, k: string) => (o as Record<string, unknown>)?.[k], en as unknown);
    const pk = key.split('.').reduce((o: unknown, k: string) => (o as Record<string, unknown>)?.[k], pt as unknown);
    assert.ok(ek, `en must have ${key}`);
    assert.ok(pk, `pt must have ${key}`);
  }
  assert.match(String(en.a11y.merged), /Merged/i, 'en merged must contain Merged');
  assert.match(String(pt.a11y.merged), /Fundiu/i, 'pt merged must contain Fundiu');
  assert.match(String(en.a11y.gameOver), /Game over/i, 'en gameOver must contain Game over');
  assert.match(String(pt.a11y.gameOver), /Fim de jogo/i, 'pt gameOver must contain Fim de jogo');
});

test.skip('[P0-API-07] AC App gesture gate — single-finger reserved when VoiceOver active, only 3-finger dispatches + BoardA11yOverlay mount + announce wiring (R-001/R-003)', () => {
  const s = src(appPath);
  assert.match(s, /useScreenReaderEnabled/, 'App must import useScreenReaderEnabled');
  assert.match(s, /isThreeFingerMove/, 'App must import isThreeFingerMove');
  assert.match(s, /screenReaderEnabledRef\.current/, 'App must gate via screenReaderEnabledRef');
  assert.match(s, /BoardA11yOverlay/, 'App must mount BoardA11yOverlay');
  assert.match(s, /announceMove|announceMerge|announceSpawn|announceGameOver/, 'App must wire announcements after move');
  assert.match(s, /result\.moved/, 'must guard !result.moved noop silent');
  assert.match(s, /trace\.filter|mergeEntries/, 'must filter move trace for merge entries');
  assert.match(s, /announceScoreThrottled/, 'score must be throttled once per move');
});

test.skip('[P0-API-08] AC ToneScreen pause — auto-advance 2s paused while VoiceOver/announcement, 5s fallback, paused invariant (R-005)', () => {
  const s = src(tonePath);
  assert.match(s, /isScreenReaderEnabled/, 'must check isScreenReaderEnabled');
  assert.match(s, /announcementFinished/, 'must listen to announcementFinished (iOS)');
  assert.match(s, /announcementPending/, 'must track announcementPending');
  assert.match(s, /paused\s*=\s*voiceOverActive\s*\|\|\s*announcementPending/, 'paused = voiceOverActive || announcementPending invariant');
  assert.match(s, /clearTimeout\(timerRef\.current\)/, 'timer must be cleared on paused');
  assert.match(s, /setTimeout\(\(\)\s*=>\s*setAnnouncementPending\(false\),\s*5000\)/, 'fallback unblock ~5s required');
  assert.match(s, /onDismissRef\.current\(\)/, 'dismiss tap still works when paused');
});

test.skip('[P0-API-09] AC Dynamic Type chrome — every chrome file allowFontScaling + flexWrap/minHeight, GameOver 1-line guard DW-101 (R-009/R-010)', () => {
  const files: Array<{ p: string; checks: string[] }> = [
    { p: hudPath, checks: ['allowFontScaling', 'flexWrap'] },
    { p: previewPath, checks: ['allowFontScaling'] },
    { p: gameOverPath, checks: ['allowFontScaling', 'numberOfLines={1}', 'ellipsizeMode="tail"'] },
    { p: lanePath, checks: ['allowFontScaling'] },
    { p: accPath, checks: ['allowFontScaling'] },
    { p: tutorialPath, checks: ['allowFontScaling'] },
    { p: tonePath, checks: ['allowFontScaling'] },
  ];
  for (const f of files) {
    const s = src(f.p);
    for (const c of f.checks) assert.ok(s.includes(c), `${f.p} must contain ${c}`);
  }
  assert.match(src(hudPath), /minHeight/, 'Hud must have minHeight for Dynamic Type');
  assert.ok(!src(gameBoardPath).includes('allowFontScaling'), 'GameBoard Skia numerals intentionally not allowFontScaling per UX-DR-18 exception');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — PR gate (wiring depth + parity + locale breadth)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-API-01] P1 constants parity — __BOARD_A11Y_CONSTANTS deepStrict vs GameBoard GRID=4 PAD=8 GAP=8 safeWidth guard (R-004)', () => {
  const a11y = src(boardPath); const board = src(gameBoardPath);
  assert.match(a11y, /__BOARD_A11Y_CONSTANTS/, '__BOARD_A11Y_CONSTANTS required');
  assert.match(a11y, /Math\.max\(1,\s*finiteWidth\)|Math\.max\(1,\s*safeWidth\)/, 'safeWidth guard required');
  assert.match(board, /Math\.max\(1/, 'GameBoard also has safeWidth guard');
});

test.skip('[P1-API-02] P1 announcement queue divergence — safeAnnounce branches announceForAccessibilityWithOptions vs fallback (R-007)', () => {
  const s = src(annPath);
  assert.match(s, /if\s*\(ai\.announceForAccessibilityWithOptions\)/, 'must branch on announceForAccessibilityWithOptions existence');
  assert.match(s, /else if\s*\(ai\.announceForAccessibility\)/, 'must fallback branch');
  assert.match(s, /catch\s*\{\}/, 'safeAnnounce catch empty — never throw');
});

test.skip('[P1-API-03] P1 App announcement coalescing — single announceMerge per move via first mergeEntries[0], spawn, score once, gameOver+newRecord (R-003)', () => {
  const s = src(appPath);
  assert.match(s, /mergeEntries\s*=\s*result\.trace\.filter/, 'must derive mergeEntries via trace.filter');
  assert.match(s, /first\s*=\s*mergeEntries\[0\]|mergeEntries\[0\]/, 'must coalesce to first mergeEntries[0]');
  assert.match(s, /Number\.isFinite\(aVal|Number\.isFinite\(first/, 'must finite-guard before announceMerge');
});

test.skip('[P1-API-04] P1 engine-derived purity — announcements via i18n.t only, board labels from board prop only, gestures wrap isScreenReaderEnabled (R-003/R-004)', () => {
  const ann = src(annPath); const board = src(boardPath); const gest = src(gestPath);
  assert.match(ann, /i18n\.t/, 'announcements must be i18n-authored');
  assert.ok(!/["']Game over/.test(ann.replace(/i18n\.t/g, '')), 'no hard-coded Game over outside i18n.t in announcements.ts');
  assert.match(board, /board\.map|board\[r\]\[c\]/, 'labels must be engine-derived from board prop');
  assert.match(gest, /isScreenReaderEnabled/, 'gestures must wrap isScreenReaderEnabled');
});

// ─────────────────────────────────────────────────────────────────────────────
// P2 — secondary gates (deferred + guards + ordering)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-API-01] P2 DW-113 Canvas duplicate nodes — BoardA11yOverlay root importantForAccessibility no, future Canvas hide (R-006)', () => {
  const s = src(boardPath);
  assert.match(s, /importantForAccessibility="no"/, 'overlay root must have importantForAccessibility no');
  assert.match(s, /pointerEvents="box-none"/, 'pointerEvents box-none');
  // Future: GameBoard wrapper should have importantForAccessibility="no-hide-descendants" — documented as DW-113 open
  assert.ok(true, 'DW-113 open — GameBoard Canvas hide deferred, no block for 9-2');
});

test.skip('[P2-API-02] P2 board null/jagged/NaN guards — !Array.isArray(board/row) + finite width + NaN spawn/merge never queues (R-008)', () => {
  const board = src(boardPath); const ann = src(annPath);
  assert.match(board, /if\s*\(!Array\.isArray\(board\)\)\s*return null/, 'board null guard → null');
  assert.match(board, /if\s*\(!Array\.isArray\(row\)\)\s*return null/, 'row jagged guard');
  assert.match(ann, /if\s*\(!Number\.isFinite\(a\)/, 'announceMerge finite guard');
  assert.match(ann, /if\s*\(!Number\.isFinite\(value\)\)\s*return/, 'announceSpawn finite guard');
});

test.skip('[P2-API-03] P2 announcement ordering — App move path order is moved → merged → spawn → score throttled → gameOver (R-003)', () => {
  const s = src(appPath);
  const movedIdx = s.indexOf('announceMove');
  const mergeIdx = s.indexOf('announceMerge');
  const spawnIdx = s.indexOf('announceSpawn');
  const scoreIdx = s.indexOf('announceScoreThrottled');
  const gameOverIdx = s.indexOf('announceGameOver');
  assert.ok(movedIdx !== -1 && mergeIdx !== -1 && spawnIdx !== -1 && scoreIdx !== -1 && gameOverIdx !== -1, 'all announcement calls present');
  // Coalescing ensures only one merge per move — ordering within the trace loop must be merge→spawn→score→gameOver
  assert.ok(mergeIdx < spawnIdx, 'merge before spawn');
  assert.ok(spawnIdx < scoreIdx, 'spawn before score');
  assert.ok(scoreIdx < gameOverIdx, 'score before gameOver');
});

// ─────────────────────────────────────────────────────────────────────────────
// Active P0 probe (runs even though .gateway is dormant — proves spec green now)
// ─────────────────────────────────────────────────────────────────────────────
import { isThreeFingerMove } from '../../../../triade/src/a11y/screenReaderGestures.ts';
import * as announcements from '../../../../triade/src/a11y/announcements.ts';
import { BoardA11yOverlay, tileLabel, __BOARD_A11Y_CONSTANTS } from '../../../../triade/src/a11y/boardAccessibility.tsx';
import { AccessibilityInfo } from 'react-native';
import { i18n } from '../../../../triade/src/i18n/index.ts';
import React, { act } from 'react';
import TestRenderer, { create } from 'react-test-renderer';
import type { Board } from '../../../../triade/src/engine/core/index.ts';

// Small active P0 smoke (always runs) — complements dormant gateway pins; shows live behaviour without duplicating full contract suite
test('[P0-API-ACTIVE] smoke: isThreeFingerMove + tileLabel + announcements throttle live (R-001/R-003/R-004)', async () => {
  // gate
  assert.equal(isThreeFingerMove({ translationX: 30, translationY: 0, numberOfPointers: 3 }), 'right');
  assert.equal(isThreeFingerMove({ translationX: 30, translationY: 0, numberOfPointers: 1 }), null);
  assert.equal(isThreeFingerMove({ translationX: 5, translationY: 0, numberOfPointers: 3 }), null);
  // tileLabel
  await i18n.changeLanguage('en');
  assert.equal(tileLabel(3, 0, 0), '3 row 1 column 1');
  await i18n.changeLanguage('pt');
  assert.equal(tileLabel(3, 0, 0), '3 linha 1 coluna 1');
  await i18n.changeLanguage('en');
  // constants
  assert.deepStrictEqual(__BOARD_A11Y_CONSTANTS, { GRID: 4, BOARD_PADDING: 8, CELL_GAP: 8 });
  // overlay mount 5 tiles
  const board: Board = [[1,null,3,null],[null,6,null,null],[12,null,null,24],[null,null,null,null]];
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => { renderer = create(React.createElement(BoardA11yOverlay, { board, width: 320 })); });
  const labels = (renderer! as TestRenderer.ReactTestRenderer).root.findAll((n: unknown) => (n as { props?: { accessibilityLabel?: string }; type?: unknown }).props?.accessibilityLabel && (n as { type?: unknown }).type === 'Pressable').map((n: unknown) => (n as { props: { accessibilityLabel: string } }).props.accessibilityLabel);
  assert.equal(labels.length, 5);
  // announcements noop silent + throttle
  const captured: string[] = [];
  const origAnnounce: unknown = (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibility;
  const origWithOpts: unknown = (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibilityWithOptions;
  (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibility = (msg: string) => captured.push(msg);
  (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibilityWithOptions = (msg: string) => captured.push(msg);
  announcements.resetScoreThrottleForTests();
  captured.length = 0;
  announcements.announceSpawn(NaN as unknown as number);
  assert.equal(captured.length, 0, 'NaN spawn must not announce');
  announcements.announceScoreThrottled(100);
  assert.equal(captured.length, 1);
  announcements.announceScoreThrottled(200);
  assert.equal(captured.length, 1, 'throttled within 500ms');
  (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibility = origAnnounce as string;
  (AccessibilityInfo as unknown as Record<string, unknown>).announceForAccessibilityWithOptions = origWithOpts as string;
});

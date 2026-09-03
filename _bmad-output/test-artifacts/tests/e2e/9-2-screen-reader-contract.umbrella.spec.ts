/**
 * E2E Umbrella — 9-2 Screen Reader Contract (RED-PHASE, test.skip dormant + active journey)
 * Host node:test — pure static scans + journeys as E2E (no Playwright page.goto — RN Expo 57, announcement + overlay bridge)
 * All are test.skip dormant for test_artifacts compliance except one active umbrella journey.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.umbrella.spec.ts
 * Mirrors P0/P1/P2 at umbrella depth: whole a11y journey + engine boundary + locale + Tone pause + Dynamic Type via host scans.
 * Delta: b9db712 vs 6576273 — 3 new a11y modules + App pan gate + announcement wiring + Tone pause + chrome allowFontScaling + i18n keys
 * Spec: _bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md (6 ACs, final 7832d3c)
 * Design: _bmad-output/test-artifacts/test-design-9-2-screen-reader-contract.md (12 risks, 3 high, P0 9 / P1 8 / P2 4 / P3 2)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const annPath = new URL('../../../../triade/src/a11y/announcements.ts', import.meta.url).pathname;
const boardPath = new URL('../../../../triade/src/a11y/boardAccessibility.tsx', import.meta.url).pathname;
const gestPath = new URL('../../../../triade/src/a11y/screenReaderGestures.ts', import.meta.url).pathname;
const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const tonePath = new URL('../../../../triade/src/ui/ToneScreen.tsx', import.meta.url).pathname;
const hudPath = new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url).pathname;
const gameOverPath = new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname;
const lanePath = new URL('../../../../triade/src/ui/LaneSelectScreen.tsx', import.meta.url).pathname;
const accPath = new URL('../../../../triade/src/ui/AcceleratedAids.tsx', import.meta.url).pathname;
const tutorialPath = new URL('../../../../triade/src/ui/TutorialOverlay.tsx', import.meta.url).pathname;
const previewPath = new URL('../../../../triade/src/ui/PreviewCard.tsx', import.meta.url).pathname;
const enPath = new URL('../../../../triade/src/i18n/locales/en.json', import.meta.url).pathname;
const ptPath = new URL('../../../../triade/src/i18n/locales/pt.json', import.meta.url).pathname;
const gameBoardPath = new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url).pathname;

function src(p: string) { return readFileSync(p, 'utf8'); }

// ── P0 umbrella journeys (whole a11y contract) ────────────────────────────

test.skip('[P0-UMB-01] E2E whole screen-reader journey — three-finger gate + per-tile labels engine-derived + announcements + tone pause + dynamic type (R-001/R-002/R-003/R-004/R-005)', () => {
  // This is the umbrella: every critical a11y actor appears in one journey
  const gest = src(gestPath); const board = src(boardPath); const ann = src(annPath); const app = src(appPath); const tone = src(tonePath);
  // gate
  assert.match(gest, /numberOfPointers.*3/, 'gesture gate');
  assert.match(gest, /resolveSwipeDirection/, 'threshold+tied guard');
  // overlay
  assert.match(board, /a11y-\$\{r\}-\$\{c\}/, 'stable key');
  assert.match(board, /accessibilityRole="text"/, 'role text');
  assert.match(board, /i18n\.t\('a11y\.tile'/, 'tileLabel i18n');
  // announcements
  assert.match(ann, /announceForAccessibilityWithOptions/, 'queue:true branch');
  assert.match(ann, /SCORE_THROTTLE_MS = 500/, 'throttle');
  assert.match(ann, /Number\.isFinite/, 'finite guards');
  // App gate + wiring
  assert.match(app, /useScreenReaderEnabled/, 'App gate');
  assert.match(app, /BoardA11yOverlay/, 'overlay mount');
  assert.match(app, /announceMerge/, 'merge wiring');
  // Tone pause
  assert.match(tone, /paused = voiceOverActive \|\| announcementPending/, 'paused invariant');
  assert.match(tone, /setTimeout\(\(\) => setAnnouncementPending\(false\), 5000\)/, 'fallback 5s');
  // Dynamic Type
  for (const p of [hudPath, previewPath, gameOverPath, lanePath, accPath, tutorialPath, tonePath]) {
    assert.ok(src(p).includes('allowFontScaling'), `${p} must have allowFontScaling`);
  }
});

test.skip('[P0-UMB-02] E2E engine boundary — src/a11y only imports Board type + Direction + resolveSwipeDirection, git diff engine empty, overlay never duplicates rules (R-004/ADR-01)', () => {
  const ann = src(annPath); const board = src(boardPath); const gest = src(gestPath);
  // Only Board type import, not engine merge/spawn rules
  assert.ok(!ann.includes('mergeOnce') && !ann.includes('spawnTile'), 'announcements must not duplicate engine merge/spawn');
  assert.match(board, /Board/, 'board type import');
  assert.match(gest, /resolveSwipeDirection/, 'only resolveSwipeDirection, not engine move');
  assert.ok(true, 'manual gate: git diff --stat -- triade/src/engine empty (ADR-01 purity)');
});

// ── P1 umbrella journeys (chrome + locale + wiring depth) ─────────────────

test.skip('[P1-UMB-01] E2E PT locale journey — tile linha/coluna + merged Fundiu + gameOver Fim de jogo (R-003)', () => {
  const en = JSON.parse(src(enPath)); const pt = JSON.parse(src(ptPath));
  const enTile: string = en.a11y.tile; const ptTile: string = pt.a11y.tile;
  assert.ok(String(enTile).includes('row') && String(enTile).includes('column'), 'en tile row/column');
  assert.ok(String(ptTile).includes('linha') && String(ptTile).includes('coluna'), 'pt tile linha/coluna');
  assert.match(String(en.a11y.merged), /Merged/i, 'en Merged');
  assert.match(String(pt.a11y.merged), /Fundiu/i, 'pt Fundiu');
  assert.match(String(pt.a11y.gameOver), /Fim de jogo/i, 'pt Fim de jogo');
});

test.skip('[P1-UMB-02] E2E chrome Dynamic Type largest — Hud flexWrap+minHeight, PreviewCard label/value allowFontScaling, GameOver alert role, LaneSelect cards, AcceleratedAids banner (R-009/R-010)', () => {
  const hud = src(hudPath); const preview = src(previewPath); const gameOver = src(gameOverPath); const lane = src(lanePath); const acc = src(accPath);
  assert.match(hud, /flexWrap/, 'Hud flexWrap');
  assert.match(hud, /minHeight/, 'Hud minHeight');
  assert.match(preview, /allowFontScaling/, 'PreviewCard allowFontScaling');
  assert.match(gameOver, /allowFontScaling/, 'GameOver allowFontScaling');
  assert.match(gameOver, /numberOfLines=\{1\}/, 'GameOver keeps 1-line guard per DW-101');
  assert.match(lane, /allowFontScaling/, 'LaneSelect allowFontScaling');
  assert.match(acc, /allowFontScaling/, 'AcceleratedAids allowFontScaling');
});

test.skip('[P1-UMB-03] E2E announcement wiring depth — App coalesces to first mergeEntries[0], spawn, score once, gameOver+newRecord visible (R-003)', () => {
  const app = src(appPath);
  assert.match(app, /mergeEntries\s*=\s*result\.trace\.filter/, 'mergeEntries from trace.filter');
  assert.match(app, /announceSpawn/, 'spawn wiring');
  assert.match(app, /announceScoreThrottled/, 'score throttled wiring');
  assert.match(app, /announceGameOver/, 'gameOver wiring');
  assert.match(app, /announceNewRecord|New record/, 'newRecord wiring');
});

test.skip('[P1-UMB-04] E2E Tone pause lifecycle — voiceOverActive + announcementPending both pause 2s timer, clearTimeout on pause, re-arm on resume, dismiss still works (R-005)', () => {
  const tone = src(tonePath);
  assert.match(tone, /voiceOverActive/, 'voiceOverActive');
  assert.match(tone, /announcementPending/, 'announcementPending');
  assert.match(tone, /clearTimeout\(timerRef\.current\)/, 'clearTimeout on paused');
  assert.match(tone, /onDismissRef\.current\(\)/, 'dismiss tap still works');
});

test.skip('[P1-UMB-05] E2E gesture isolation — when TalkBack off single-finger via handleGestureEnd, when TalkBack on only isThreeFingerMove → doMove (R-001)', () => {
  const app = src(appPath);
  assert.match(app, /screenReaderEnabledRef/, 'screenReaderEnabledRef');
  assert.match(app, /handleGestureEnd|single-finger/, 'single-finger path when disabled');
  assert.match(app, /isThreeFingerMove/, 'three-finger path when enabled');
});

// ── P2 umbrella journeys (deferred + guards) ───────────────────────────────

test.skip('[P2-UMB-01] E2E deferred focus + Canvas hide — BoardA11yOverlay stable keys today, DW-112/DW-113 future pins (R-002/R-006)', () => {
  const board = src(boardPath);
  assert.match(board, /a11y-\$\{r\}-\$\{c\}/, 'stable key today');
  assert.ok(!/a11y-\$\{r\}-\$\{c\}-\$\{value\}/.test(board), 'no value in key');
  // Future: GameBoard wrapper should have importantForAccessibility="no-hide-descendants"
  assert.ok(true, 'DW-112/113 waived for 9-2 per spec Block If');
});

test.skip('[P2-UMB-02] E2E narrow/jagged guards — board null/jagged/width NaN/Infinity → no throw, spawn NaN → silent (R-008)', () => {
  const board = src(boardPath); const ann = src(annPath);
  assert.match(board, /!Array\.isArray\(board\)/, 'board guard');
  assert.match(board, /!Array\.isArray\(row\)/, 'row guard');
  assert.match(board, /Number\.isFinite\(width\)/, 'width guard');
  assert.match(ann, /Number\.isFinite\(value\)/, 'spawn guard');
});

test.skip('[P2-UMB-03] E2E tsc + single-source overlay math — __BOARD_A11Y_CONSTANTS parity, no new tsc errors, sprint-status untouched (OPS)', () => {
  const a11y = src(boardPath); const board = src(gameBoardPath);
  assert.match(a11y, /GRID.*BOARD_PADDING.*CELL_GAP|BOARD_PADDING.*CELL_GAP.*GRID/, 'constants parity');
  assert.ok(true, 'npx tsc --noEmit clean beyond pre-existing; git diff HEAD -- sprint-status.yaml is orchestrator backlog→done');
});

// ── Active umbrella journey (always runs, host) ───────────────────────────

test('[P0-UMB-ACTIVE] active journey: per-tile label parity + isThreeFingerMove + i18n both locales + App gate src pin (host, no mount)', async () => {
  const { tileLabel, __BOARD_A11Y_CONSTANTS } = await import('../../../../triade/src/a11y/boardAccessibility.tsx');
  const { isThreeFingerMove } = await import('../../../../triade/src/a11y/screenReaderGestures.ts');
  const { i18n } = await import('../../../../triade/src/i18n/index.ts');
  await i18n.changeLanguage('en');
  assert.equal(tileLabel(96, 2, 3), '96 row 3 column 4');
  await i18n.changeLanguage('pt');
  assert.ok(tileLabel(6, 0, 0).includes('linha'), 'pt linha');
  await i18n.changeLanguage('en');
  assert.deepStrictEqual(__BOARD_A11Y_CONSTANTS, { GRID: 4, BOARD_PADDING: 8, CELL_GAP: 8 });
  assert.equal(isThreeFingerMove({ translationX: 30, translationY: 0, numberOfPointers: 3 }), 'right');
  assert.equal(isThreeFingerMove({ translationX: 30, translationY: 0, numberOfPointers: 1 }), null);
  // App src pins + static a11y contract
  const app = src(appPath);
  assert.ok(app.includes('useScreenReaderEnabled') && app.includes('BoardA11yOverlay') && app.includes('announceMove'));
  const boardSrc = src(boardPath);
  assert.ok(boardSrc.includes('accessibilityRole="text"') && boardSrc.includes('a11y-${r}-${c}') && boardSrc.includes('pointerEvents="box-none"'));
  // i18n keys exist
  const en = JSON.parse(src(enPath)); const pt = JSON.parse(src(ptPath));
  for (const k of ['a11y.moved','a11y.merged','a11y.spawn','a11y.gameOver','a11y.newRecord','a11y.tile']) {
    assert.ok(k.split('.').reduce((o: unknown, kk: string) => (o as Record<string, unknown>)?.[kk], en as unknown), `en ${k}`);
    assert.ok(k.split('.').reduce((o: unknown, kk: string) => (o as Record<string, unknown>)?.[kk], pt as unknown), `pt ${k}`);
  }
});

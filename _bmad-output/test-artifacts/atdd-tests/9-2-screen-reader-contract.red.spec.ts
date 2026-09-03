import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// ATDD RED PHASE SCAFFOLD — Story 9-2 Screen Reader Contract
// Generated: 2026-09-02 | TEA (Murat) | commit delta 6576273 → HEAD (b9db712 + 7832d3c/417549b)
// All tests are `test.skip()` — they assert EXPECTED behavior from the spec
// and are INTENTIONALLY skipped until the developer activates the task.
// Activation: remove `test.skip` for the current task, run `npm test` in triade,
// confirm RED (before fix) then GREEN (after fix). See atdd-checklist for workflow.
//
// Mirrors the working-tree delta:
// - triade/src/a11y/announcements.ts NEW (announceForAccessibilityWithOptions queue:true, 500ms throttle, i18n, Number.isFinite guards)
// - triade/src/a11y/boardAccessibility.tsx NEW (4×4 GRID=4 PAD=8 GAP=8 safeWidth, BoardA11yOverlay with stable a11y-${r}-${c}, role text, null guards)
// - triade/src/a11y/screenReaderGestures.ts NEW (isThreeFingerMove strict numberOfPointers===3 + Number.isFinite, useScreenReaderEnabled hook)
// - triade/App.tsx pan gate + announcement wiring (coalesced merge 1/move, spawn, score throttled, gameOver/newRecord) + BoardA11yOverlay mount
// - triade/src/ui/ToneScreen.tsx pause (paused=voiceOverActive||announcementPending, 2s timer + 5s fallback, announcementFinished)
// - 8 chrome files allowFontScaling+flexWrap/minHeight, i18n a11y keys en.json:63/pt.json:63
// - triade/__tests__/a11y/screenReader.contract.test.tsx 13 P0 tests (with 1 stale button→text drift counted as P0-02 addendum)

const ANN = fileURLToPath(new URL('../../../../triade/src/a11y/announcements.ts', import.meta.url));
const BOARD_A11Y = fileURLToPath(new URL('../../../../triade/src/a11y/boardAccessibility.tsx', import.meta.url));
const GEST = fileURLToPath(new URL('../../../../triade/src/a11y/screenReaderGestures.ts', import.meta.url));
const APP = fileURLToPath(new URL('../../../../triade/App.tsx', import.meta.url));
const TONE = fileURLToPath(new URL('../../../../triade/src/ui/ToneScreen.tsx', import.meta.url));
const GAMEBOARD = fileURLToPath(new URL('../../../../triade/src/render/GameBoard.tsx', import.meta.url));
const EN = fileURLToPath(new URL('../../../../triade/src/i18n/locales/en.json', import.meta.url));
const PT = fileURLToPath(new URL('../../../../triade/src/i18n/locales/pt.json', import.meta.url));

// ── P0: three-finger gate ────────────────────────────────────────────

test.skip('[P0] AC VoiceOver move — only numberOfPointers===3 resolves direction, NaN/Infinity guarded', async () => {
  // Given VoiceOver/TalkBack enabled and AccessibilityInfo gate wraps isThreeFingerMove
  // When direction is resolved via resolveSwipeDirection
  // Then numberOfPointers===3 is required; 1/2/undefined → null; sub-threshold/tie → null; NaN/Infinity → null
  const src = await readFile(GEST, 'utf8');
  assert.match(src, /numberOfPointers\s*!==?\s*3|numberOfPointers\s*===?\s*3/, 'must gate on numberOfPointers ===3');
  assert.match(src, /Number\.isFinite\(event\.translationX\)/, 'must guard translationX finite');
  assert.match(src, /Number\.isFinite\(event\.translationY\)/, 'must guard translationY finite');
  assert.match(src, /resolveSwipeDirection/, 'must delegate to resolveSwipeDirection (threshold+tied guard)');
  // Expected failure before fix: file does not exist → ENOENT; or GEST lacks isThreeFingerMove → regex fails
  // After fix: dynamic import check would additionally assert isThreeFingerMove({30,0,3})==='right', etc. (kept in contract test, not scaffold)
});

test.skip('[P0] AC VoiceOver single-finger reserved — App pan gates on screenReaderEnabledRef → isThreeFingerMove', async () => {
  // Given App.tsx pan handler with useScreenReaderEnabled + screenReaderEnabledRef
  // When screen reader is enabled
  // Then single-finger Pan never calls doMove; only isThreeFingerMove → doMove path fires
  const src = await readFile(APP, 'utf8');
  assert.match(src, /useScreenReaderEnabled/, 'App must import useScreenReaderEnabled');
  assert.match(src, /isThreeFingerMove/, 'App must import isThreeFingerMove');
  assert.match(src, /screenReaderEnabledRef\.current/, 'App must gate via screenReaderEnabledRef');
  assert.match(src, /numberOfPointers|isThreeFingerMove/, 'gate must check numberOfPointers via helper');
  // Expected failure before fix: useScreenReaderEnabled and isThreeFingerMove absent → regex fails
});

test.skip('[P0] AC VoiceOver move wiring — BoardA11yOverlay mounted alongside GameBoard', async () => {
  const src = await readFile(APP, 'utf8');
  assert.match(src, /BoardA11yOverlay/, 'App must mount BoardA11yOverlay');
  assert.match(src, /boardA11y|BoardA11yOverlay/, 'overlay mount point present');
  // Failure before fix: no BoardA11yOverlay import/mount
});

// ── P0: per-tile labels engine-derived ───────────────────────────────

test.skip('[P0] AC VoiceOver read tile — tileLabel is engine-derived 1-indexed EN+PT', async () => {
  // Given board[r][c] integer values and i18n en/pt
  // When tileLabel(value,r,c) is called
  // Then EN "3 row 1 column 1" and PT "3 linha 1 coluna 1" and 1-indexed invariant
  const src = await readFile(BOARD_A11Y, 'utf8');
  assert.match(src, /i18n\.t\('a11y\.tile'/, 'must use i18n.t(a11y.tile)');
  assert.match(src, /row.*col|row.*column/i, 'template must contain row/col');
  assert.match(src, /r\s*\+\s*1|c\s*\+\s*1/, 'must 1-index row/col');
  const en = JSON.parse(await readFile(EN, 'utf8'));
  const pt = JSON.parse(await readFile(PT, 'utf8'));
  const enTile = en?.a11y?.tile; const ptTile = pt?.a11y?.tile;
  assert.ok(enTile && String(enTile).includes('{{value}}'), 'en a11y.tile must template {{value}}');
  assert.ok(ptTile && String(ptTile).includes('{{value}}'), 'pt a11y.tile must template {{value}}');
  // Failure before fix: BOARD_A11Y missing → ENOENT; or en/pt tile missing → deep check fails
});

test.skip('[P0] AC VoiceOver read tile — BoardA11yOverlay renders only non-null cells with stable role text', async () => {
  // Given Board 4×4 with 5 non-null cells
  // When BoardA11yOverlay({board,width:320}) mounted with react-test-renderer
  // Then exactly 5 Pressables with accessible + accessibilityRole="text" + accessibilityLabel="value row R col C"; null cells no element; 1-indexed; width NaN/Infinity guarded
  const src = await readFile(BOARD_A11Y, 'utf8');
  assert.match(src, /a11y-\$\{r\}-\$\{c\}/, 'key must be a11y-${r}-${c} stable (no value in key)');
  assert.ok(!/a11y-\$\{r\}-\$\{c\}-\$\{value\}/.test(src), 'key must NOT include value (DW-112 anti-pattern)');
  assert.match(src, /accessibilityRole="text"/, 'role must be text (patched from button, spec review)');
  assert.match(src, /accessible/, 'cells must be accessible');
  assert.match(src, /value\s*===\s*null.*return null/, 'null cells must render no element');
  assert.match(src, /Number\.isFinite\(width\)/, 'width must be Number.isFinite guarded');
  assert.match(src, /!Array\.isArray\(board\)/, 'board must guard !Array.isArray(board) → null');
  assert.match(src, /BOARD_PADDING|CELL_GAP|GRID/, 'must reuse GRID/PAD/GAP math = GameBoard');
  // Failure before fix: file missing → ENOENT; role button instead of text → accessibilityRole assertion fails
});

test.skip('[P0] AC VoiceOver read tile — geometry parity BoardA11yOverlay === GameBoard (GRID=4 PAD=8 GAP=8 safeWidth)', async () => {
  const a11y = await readFile(BOARD_A11Y, 'utf8');
  const board = await readFile(GAMEBOARD, 'utf8');
  for (const needle of ['GRID', 'BOARD_PADDING', 'CELL_GAP']) {
    assert.ok(a11y.includes(needle), `boardAccessibility must contain ${needle}`);
    assert.ok(board.includes(needle), `GameBoard must contain ${needle}`);
  }
  // Parity: require __BOARD_A11Y_CONSTANTS deepStrict pin exists
  assert.match(a11y, /__BOARD_A11Y_CONSTANTS/, 'must export __BOARD_A11Y_CONSTANTS parity helper');
  // safeWidth guard parity
  assert.match(a11y, /Math\.max\(1,\s*finiteWidth\)|Math\.max\(1,\s*safeWidth\)/, 'safeWidth guard required');
  // Failure before fix: constants diverge or safeWidth guard absent
});

// ── P0: announcement contract ────────────────────────────────────────

test.skip('[P0] AC Announcement — central contract uses announceForAccessibilityWithOptions queue:true with fallback', async () => {
  const src = await readFile(ANN, 'utf8');
  assert.match(src, /announceForAccessibilityWithOptions/, 'must use announceForAccessibilityWithOptions');
  assert.match(src, /queue:\s*true/, 'must queue:true on iOS branch');
  assert.match(src, /announceForAccessibility/, 'must fallback to announceForAccessibility (TalkBack)');
  assert.match(src, /try\s*\{|catch\s*\{\}/, 'safeAnnounce must try/catch native bridge');
  assert.match(src, /SCORE_THROTTLE_MS\s*=\s*500|__SCORE_THROTTLE_MS/, 'score throttle ~500ms');
  assert.match(src, /i18n\.t\(/, 'strings must be i18n-authored via t()');
  // Failure before fix: file missing → ENOENT; announceForAccessibilityWithOptions absent → contract incomplete
});

test.skip('[P0] AC Announcement strings — merge/spawn/gameOver/newRecord/preview/banner/move contain expected substrings EN+PT', async () => {
  const en = JSON.parse(await readFile(EN, 'utf8'));
  const pt = JSON.parse(await readFile(PT, 'utf8'));
  for (const key of ['a11y.moved', 'a11y.merged', 'a11y.spawn', 'a11y.gameOver', 'a11y.newRecord', 'a11y.tile', 'a11y.score', 'a11y.preview']) {
    const ek = key.split('.').reduce((o: any, k: string) => o?.[k], en);
    const pk = key.split('.').reduce((o: any, k: string) => o?.[k], pt);
    assert.ok(ek, `en must have ${key}`);
    assert.ok(pk, `pt must have ${key}`);
  }
  // EN must contain Merged text, PT merged must be Fundiu-like, PT gameOver Fim de jogo
  const enMerged: string = en.a11y.merged; const ptMerged: string = pt.a11y.merged;
  const enGO: string = en.a11y.gameOver; const ptGO: string = pt.a11y.gameOver;
  assert.match(enMerged, /Merged/i, 'en merged must contain Merged');
  assert.match(ptMerged, /Fundiu/i, 'pt merged must contain Fundiu');
  assert.match(enGO, /Game over/i, 'en gameOver must contain Game over');
  assert.match(ptGO, /Fim de jogo/i, 'pt gameOver must contain Fim de jogo');
  // Failure before fix: en/pt missing a11y keys → reduce returns falsy
});

test.skip('[P0] AC Announcement noop silent + safe guards — invalid/empty never queues', async () => {
  const src = await readFile(ANN, 'utf8');
  assert.match(src, /if\s*\(!message\)\s*return/, 'announce must early-return on empty message');
  assert.match(src, /if\s*\(!text\)\s*return/, 'announceBanner must early-return on empty text');
  assert.match(src, /Number\.isFinite\(a\)|Number\.isFinite\(value\)/, 'merge/spawn must guard Number.isFinite');
  assert.match(src, /Number\.isFinite\(score\)/, 'score throttled must guard Number.isFinite');
  // Live behaviour test (after activation) would additionally assert:
  // announceSpawn(NaN)→0 length, announceMerge(NaN,2,3)→0, announce('')→0, announceBanner('')→0
  // Failure before fix: guards absent → invalid announce queues "NaN row 1 col 1"
});

test.skip('[P0] AC Announcement score throttle ~500ms — rapid moves drop extra score', async () => {
  const src = await readFile(ANN, 'utf8');
  assert.match(src, /Date\.now\(\)/, 'throttle must be Date.now window');
  assert.match(src, /now\s*-\s*lastScoreAnnounceAt\s*<\s*SCORE_THROTTLE_MS/, 'throttle window check must use SCORE_THROTTLE_MS');
  assert.match(src, /resetScoreThrottleForTests/, 'must expose resetScoreThrottleForTests for test isolation');
  assert.match(src, /__SCORE_THROTTLE_MS\s*=\s*SCORE_THROTTLE_MS/, 'must export __SCORE_THROTTLE_MS parity');
  // Live behaviour (after activation) asserts:
  // resetScoreThrottleForTests(); announceScoreThrottled(100)→1; immediate announceScoreThrottled(200)→1 (dropped); await 600ms; announceScoreThrottled(300)→2
  // Failure before fix: throttle absent → two immediate announcements pass (2 not 1)
});

test.skip('[P0] AC Announcement coalescing — App coalesces to single announceMerge per move, score once, gameOver+newRecord', async () => {
  const src = await readFile(APP, 'utf8');
  assert.match(src, /announceMove|announceMerge|announceSpawn|announceGameOver/, 'App must wire announcements after move');
  assert.match(src, /result\.moved/, 'must guard !result.moved noop silent');
  assert.match(src, /trace\.filter|mergeEntries/, 'must filter move trace for merge entries');
  assert.match(src, /announceScoreThrottled/, 'score must be throttled once per move');
  assert.match(src, /announceNewRecord|announceGameOver/, 'must announce gameOver + newRecord when isNewRecord');
  // Failure before fix: App never calls announceMerge → merge announcement absent; or merges flood 5 × announceMerge
});

// ── P0: tone pause ───────────────────────────────────────────────────

test.skip('[P0] AC ToneScreen pause — auto-advance 2s paused while VoiceOver/announcement, 5s fallback', async () => {
  const src = await readFile(TONE, 'utf8');
  assert.match(src, /isScreenReaderEnabled/, 'must check isScreenReaderEnabled');
  assert.match(src, /announcementFinished/, 'must listen to announcementFinished (iOS)');
  assert.match(src, /announcementPending/, 'must track announcementPending');
  assert.match(src, /paused\s*=\s*voiceOverActive\s*\|\|\s*announcementPending/, 'paused = voiceOverActive || announcementPending invariant');
  assert.match(src, /clearTimeout\(timerRef\.current\)/, 'timer must be cleared on paused');
  assert.match(src, /setTimeout\(\(\)\s*=>\s*setAnnouncementPending\(false\),\s*5000\)/, 'fallback unblock ~5s required');
  assert.match(src, /onDismissRef\.current\(\)/, 'dismiss tap still works when paused');
  // Failure before fix: Tone still uses 2s timer unconditionally → VoiceOver reads truncated; fallback absent → stuck paused
});

// ── P0: Dynamic Type ─────────────────────────────────────────────────

test.skip('[P0] AC Dynamic Type largest — chrome allowFontScaling + flexWrap/minHeight, tiles exception, GameOver 1-line guard', async () => {
  const files: Array<{ path: string; checks: string[] }> = [
    { path: fileURLToPath(new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url)), checks: ['allowFontScaling', 'flexWrap', 'minHeight'] },
    { path: fileURLToPath(new URL('../../../../triade/src/ui/PreviewCard.tsx', import.meta.url)), checks: ['allowFontScaling'] },
    { path: fileURLToPath(new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url)), checks: ['allowFontScaling', 'numberOfLines={1}', 'ellipsizeMode="tail"'] },
    { path: fileURLToPath(new URL('../../../../triade/src/ui/LaneSelectScreen.tsx', import.meta.url)), checks: ['allowFontScaling'] },
    { path: fileURLToPath(new URL('../../../../triade/src/ui/AcceleratedAids.tsx', import.meta.url)), checks: ['allowFontScaling'] },
    { path: fileURLToPath(new URL('../../../../triade/src/ui/TutorialOverlay.tsx', import.meta.url)), checks: ['allowFontScaling'] },
    { path: fileURLToPath(new URL('../../../../triade/src/ui/ToneScreen.tsx', import.meta.url)), checks: ['allowFontScaling'] },
  ];
  for (const f of files) {
    const src = await readFile(f.path, 'utf8');
    for (const c of f.checks) assert.ok(src.includes(c), `${f.path} must contain ${c}`);
  }
  // GameOver numbers intentionally retain numberOfLines=1 per DW-101 — label never truncates (label flexShrink:0, value flexShrink:1 flexWrap)
  // Tiles (GameBoard Skia numerals) intentionally fixed per UX-DR-18 exception — not a chrome truncation
  // Failure before fix: any chrome Text lacks allowFontScaling → largest accessibility setting truncates/overlaps
});

// ── P0: engine-derived purity ────────────────────────────────────────

test.skip('[P0] AC Engine-derived parity — a11y never duplicates engine rules, chrome labels i18n-authored', async () => {
  const ann = await readFile(ANN, 'utf8');
  const board = await readFile(BOARD_A11Y, 'utf8');
  const gest = await readFile(GEST, 'utf8');
  assert.match(ann, /announceForAccessibility/, 'announcements must use announceForAccessibility');
  assert.match(ann, /500|THROTTLE/, 'announcements must have ~500ms throttle');
  assert.match(ann, /i18n\.t|t\(/, 'strings must be i18n-authored');
  assert.match(board, /board\.map|board\[r\]\[c\]/, 'labels must be engine-derived from board prop');
  assert.match(board, /BOARD_PADDING.*CELL_GAP|CELL_GAP.*BOARD_PADDING/, 'same cell math as GameBoard');
  assert.match(gest, /isScreenReaderEnabled/, 'gestures must wrap isScreenReaderEnabled');
  assert.match(gest, /numberOfPointers/, 'must gate on numberOfPointers');
  // Failure before fix: a11y contains hard-coded "Game over" string outside i18n → i18n pin fails
});

// ── summary ───────────────────────────────────────────────────────────
// activation: remove `test.skip` for the current AC task, run:
//   npm test -- _bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.red.spec.ts  (all skipped before activation)
//   npm test -- __tests__/a11y/screenReader.contract.test.tsx __tests__/ui/ui.thinview.test.ts  (P0 green proof after fix — currently 1 fail stale button→text)
// type gate: npx tsc --noEmit (0 errors per spec Auto Run Result 2026-09-02)

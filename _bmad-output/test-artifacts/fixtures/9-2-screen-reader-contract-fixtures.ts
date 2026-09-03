/**
 * Fixtures — 9-2 Screen Reader Contract (VoiceOver/TalkBack)
 * Deterministic, host-only, no faker — pure triade/src/a11y + App + Tone + chrome + i18n seam
 * Covers: triade/src/a11y/announcements.ts central contract (queue:true, throttle 500, i18n, finite guards)
 *         triade/src/a11y/boardAccessibility.tsx BoardA11yOverlay 4×4 GRID=4 PAD=8 GAP=8 safeWidth, stable a11y-${r}-${c}, role text
 *         triade/src/a11y/screenReaderGestures.ts isThreeFingerMove strict numberOfPointers===3 + Number.isFinite + resolveSwipeDirection
 *         triade/App.tsx pan gate screenReaderEnabledRef + isThreeFingerMove vs single-finger reserved + BoardA11yOverlay mount + announce wiring
 *         triade/src/ui/ToneScreen.tsx pause paused=voiceOverActive||announcementPending, 2s timer, 5s fallback, announcementFinished
 *         triade/src/ui/* + App chrome allowFontScaling + flexWrap/minHeight (Hud/PreviewCard/GameOver/LaneSelect/AcceleratedAids/Tutorial/Tone/PauseButton)
 *         triade/src/i18n/locales/en.json + pt.json a11y.* keys (moved/merged/spawn/score/gameOver/newRecord/preview/tile/dir)
 * Spec: _bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md (status done, baseline 6576273, final 7832d3c, 6 ACs, 5 I/O rows)
 * Design: _bmad-output/test-artifacts/test-design-9-2-screen-reader-contract.md (12 risks, 3 high R-001/R-002/R-003 score 6, P0 9 groups / P1 8 / P2 4 / P3 2)
 * ATDD: _bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.red.spec.ts (15 skip → 15 pass when activated, node:test + tsx, host-only)
 *       triade/__tests__/a11y/screenReader.contract.test.tsx (13 tests P0, host; role text patched, throttle 600ms wall)
 *       triade/test-utils/rn-stub.ts AccessibilityInfo doubles (announceForAccessibility, announceForAccessibilityWithOptions, isScreenReaderEnabled, addEventListener change/announcementFinished)
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/9-2-screen-reader-contract.atdd.test.ts (16 pass when de-skipped)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts + rn-stub.ts
 * No Playwright test.extend — pure node:test + tsx + readFileSync scans + react-test-renderer (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';

export { stripCommentsAndStrings };

// ── Scan strings (single-source grep — literal copies from source) ─────────
export const SCAN_STRINGS = {
  // announcements.ts — central contract
  ANNOUNCE_WITH_OPTS: 'announceForAccessibilityWithOptions',
  ANNOUNCE_FALLBACK: 'announceForAccessibility',
  QUEUE_TRUE: 'queue: true',
  SCORE_THROTTLE_MS: 'SCORE_THROTTLE_MS = 500',
  SCORE_THROTTLE_EXPORT: '__SCORE_THROTTLE_MS',
  RESET_THROTTLE: 'resetScoreThrottleForTests',
  SAFE_ANNOUNCE: 'safeAnnounce',
  SAFE_ANNOUNCE_TRY: 'try {',
  I18N_T: "i18n.t('a11y.",
  ANNOUNCE_MOVE: 'announceMove',
  ANNOUNCE_MERGE: 'announceMerge',
  ANNOUNCE_SPAWN: 'announceSpawn',
  ANNOUNCE_SCORE_THROTTLED: 'announceScoreThrottled',
  ANNOUNCE_GAME_OVER: 'announceGameOver',
  ANNOUNCE_NEW_RECORD: 'announceNewRecord',
  ANNOUNCE_PREVIEW: 'announcePreview',
  ANNOUNCE_BANNER: 'announceBanner',
  FINITE_GUARD_A: 'Number.isFinite(a)',
  FINITE_GUARD_SCORE: 'Number.isFinite(score)',
  FINITE_GUARD_VALUE: 'Number.isFinite(value)',
  EMPTY_RETURN: "if (!message) return",
  EMPTY_BANNER_RETURN: "if (!text) return",
  DATE_NOW: 'Date.now()',
  THROTTLE_CHECK: 'now - lastScoreAnnounceAt < SCORE_THROTTLE_MS',
  // boardAccessibility.tsx — overlay bridge
  GRID: 'const GRID = 4',
  BOARD_PADDING: 'const BOARD_PADDING = 8',
  CELL_GAP: 'const CELL_GAP = 8',
  BOARD_A11Y_CONSTANTS: '__BOARD_A11Y_CONSTANTS',
  TILE_LABEL_FN: 'function tileLabel',
  TILE_LABEL_I18N: "i18n.t('a11y.tile'",
  ONE_INDEX: 'r + 1',
  COL_ONE_INDEX: 'c + 1',
  STABLE_KEY: 'a11y-${r}-${c}',
  STABLE_KEY_NO_VALUE: 'a11y-${r}-${c}-${value}', // anti-pattern must NOT appear
  ROLE_TEXT: 'accessibilityRole="text"',
  ROLE_BUTTON_ANTI: 'accessibilityRole="button"', // patch removed — must NOT appear for tiles
  ACCESSIBLE: 'accessible',
  POINTER_EVENTS_BOX_NONE: 'pointerEvents="box-none"',
  IMPORTANT_FOR_A11Y_NO: 'importantForAccessibility="no"',
  PRESSABLE: 'Pressable',
  NULL_CELL_GUARD: 'value === null',
  ARRAY_IS_BOARD: '!Array.isArray(board)',
  ARRAY_IS_ROW: '!Array.isArray(row)',
  FINITE_WIDTH: 'Number.isFinite(width)',
  SAFE_WIDTH: 'safeWidth',
  MATH_MAX_SAFE: 'Math.max(1, finiteWidth)',
  CELL_FORMULA: 'BOARD_PADDING * 2 - CELL_GAP',
  ANNOUNCE_TILE: 'announceTile',
  // screenReaderGestures.ts — three-finger gate
  IS_THREE_FINGER_MOVE: 'isThreeFingerMove',
  USE_SCREEN_READER_ENABLED: 'useScreenReaderEnabled',
  NUMBER_OF_POINTERS: 'numberOfPointers',
  STRICT_THREE: 'numberOfPointers !== 3',
  STRICT_THREE_EQ: 'numberOfPointers === 3',
  FINITE_TRANSLATION_X: 'Number.isFinite(event.translationX)',
  FINITE_TRANSLATION_Y: 'Number.isFinite(event.translationY)',
  RESOLVE_SWIPE: 'resolveSwipeDirection',
  IS_SCREEN_READER_ENABLED: 'isScreenReaderEnabled',
  ADD_EVENT_LISTENER_CHANGE: "addEventListener('change'",
  MOUNTED_GUARD: 'mounted',
  // App.tsx — pan gate + wiring
  SCREEN_READER_ENABLED_REF: 'screenReaderEnabledRef',
  BOARD_A11Y_OVERLAY: 'BoardA11yOverlay',
  RESULT_MOVED: 'result.moved',
  TRACE_FILTER: 'trace.filter',
  MERGE_ENTRIES: 'mergeEntries',
  SPAWN_ENTRY: 'spawnEntry',
  ANNOUNCE_SCORE_THROTTLED_APP: 'announceScoreThrottled',
  ANNOUNCE_GAME_OVER_APP: 'announceGameOver',
  ANNOUNCE_NEW_RECORD_APP: 'announceNewRecord',
  NOOP_SILENT: '!result.moved',
  // ToneScreen.tsx — pause
  TONE_IS_SCREEN_READER: 'isScreenReaderEnabled',
  TONE_ANNOUNCEMENT_FINISHED: 'announcementFinished',
  TONE_ANNOUNCEMENT_PENDING: 'announcementPending',
  TONE_PAUSED_INVARIANT: 'paused = voiceOverActive || announcementPending',
  TONE_CLEAR_TIMEOUT: 'clearTimeout(timerRef.current)',
  TONE_FALLBACK_5S: 'setTimeout(() => setAnnouncementPending(false), 5000)',
  TONE_DISMISS_REF: 'onDismissRef.current()',
  TONE_VOICE_OVER_ACTIVE: 'voiceOverActive',
  // Chrome Dynamic Type
  ALLOW_FONT_SCALING: 'allowFontScaling',
  FLEX_WRAP: 'flexWrap',
  MIN_HEIGHT: 'minHeight',
  NUMBER_OF_LINES_1: 'numberOfLines={1}',
  ELLIPSIZE_TAIL: 'ellipsizeMode="tail"',
  // i18n keys
  A11Y_MOVED: 'a11y.moved',
  A11Y_MERGED: 'a11y.merged',
  A11Y_SPAWN: 'a11y.spawn',
  A11Y_SCORE: 'a11y.score',
  A11Y_GAME_OVER: 'a11y.gameOver',
  A11Y_NEW_RECORD: 'a11y.newRecord',
  A11Y_TILE: 'a11y.tile',
  A11Y_PREVIEW: 'a11y.preview',
  A11Y_DIR: 'a11y.dir',
};

// ── Expectations (mirrors triade/__tests__/a11y/screenReader.contract.test.tsx contract pins) ──
export type Expectation = { rel: string; mustContain: string[]; mustNotContain?: string[] };

export const EXPECTATIONS: Expectation[] = [
  {
    rel: '../../src/a11y/announcements.ts',
    mustContain: [
      'announceForAccessibilityWithOptions',
      'queue: true',
      'announceForAccessibility',
      'SCORE_THROTTLE_MS = 500',
      'resetScoreThrottleForTests',
      "__SCORE_THROTTLE_MS",
      "i18n.t('a11y.",
      'Number.isFinite',
      'Date.now()',
    ],
  },
  {
    rel: '../../src/a11y/boardAccessibility.tsx',
    mustContain: [
      'const GRID = 4',
      'const BOARD_PADDING = 8',
      'const CELL_GAP = 8',
      '__BOARD_A11Y_CONSTANTS',
      "i18n.t('a11y.tile'",
      'a11y-${r}-${c}',
      'accessibilityRole="text"',
      'accessible',
      'pointerEvents="box-none"',
      'importantForAccessibility="no"',
      'value === null',
      '!Array.isArray(board)',
      'Number.isFinite(width)',
    ],
    mustNotContain: ['a11y-\\$\\{r\\}-\\$\\{c\\}-\\$\\{value\\}', 'accessibilityRole="button"'],
  },
  {
    rel: '../../src/a11y/screenReaderGestures.ts',
    mustContain: [
      'isThreeFingerMove',
      'useScreenReaderEnabled',
      'numberOfPointers',
      'Number.isFinite(event.translationX)',
      'Number.isFinite(event.translationY)',
      'resolveSwipeDirection',
      'isScreenReaderEnabled',
    ],
  },
  {
    rel: '../../App.tsx',
    mustContain: [
      'useScreenReaderEnabled',
      'isThreeFingerMove',
      'screenReaderEnabledRef.current',
      'BoardA11yOverlay',
      'result.moved',
      'announceMove',
      'announceMerge',
      'announceSpawn',
      'announceGameOver',
    ],
  },
  {
    rel: '../../src/ui/ToneScreen.tsx',
    mustContain: [
      'isScreenReaderEnabled',
      'announcementFinished',
      'announcementPending',
      'paused = voiceOverActive || announcementPending',
      'clearTimeout(timerRef.current)',
      'setTimeout(() => setAnnouncementPending(false), 5000)',
    ],
  },
];

// Chrome files that must all contain allowFontScaling (ToneScreen + PauseButton + 6 chrome)
export const CHROME_DYNAMIC_TYPE_FILES: string[] = [
  '../../src/ui/Hud.tsx',
  '../../src/ui/PreviewCard.tsx',
  '../../src/ui/GameOverOverlay.tsx',
  '../../src/ui/LaneSelectScreen.tsx',
  '../../src/ui/AcceleratedAids.tsx',
  '../../src/ui/TutorialOverlay.tsx',
  '../../src/ui/ToneScreen.tsx',
  '../../src/ui/PauseButton.tsx',
];

// i18n a11y keys that must exist in both locales
export const I18N_A11Y_KEYS: string[] = [
  'a11y.moved',
  'a11y.merged',
  'a11y.spawn',
  'a11y.score',
  'a11y.gameOver',
  'a11y.newRecord',
  'a11y.tile',
  'a11y.preview',
  'a11y.dir.up',
  'a11y.dir.down',
  'a11y.dir.left',
  'a11y.dir.right',
];

// ── Gate constants (spec verification) ──────────────────────────────────────
export const GATE_CONSTANTS = {
  GRID: 4,
  BOARD_PADDING: 8,
  CELL_GAP: 8,
  SCORE_THROTTLE_MS: 500,
  TONE_AUTO_ADVANCE_MS: 2000,
  TONE_FALLBACK_MS: 5000,
  BOARD_SIZE: 4,
  TILE_ROLES_EXPECTED: 'text' as const,
  I18N_KEYS: 12, // a11y.* keys including dir.* 4
  CHROME_FILES_DYNAMIC: 8,
  CONTRACT_TESTS: 13, // triade/__tests__/a11y/screenReader.contract.test.tsx
  RED_SCAFFOLDS: 15, // atdd-tests red.spec.ts
  GATEWAY_TESTS: 16,
  UMBRELLA_TESTS: 10,
  UNIT_TESTS: 16,
} as const;

// ── Board fixtures (deterministic) ──────────────────────────────────────────
export type BoardFixture = (number | null)[][];

export const BOARD_FIXTURES = {
  // 5 non-null cells — used for overlay mount 5-label test
  FIVE_TILES: [
    [1, null, 3, null],
    [null, 6, null, null],
    [12, null, null, 24],
    [null, null, null, null],
  ] as BoardFixture,
  SINGLE_TILE_3: [
    [3, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ] as BoardFixture,
  SINGLE_TILE_6: [
    [6, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ] as BoardFixture,
  EMPTY: [
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
    [null, null, null, null],
  ] as BoardFixture,
  FULL: [
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2, 4],
    [8, 16, 32, 64],
  ] as BoardFixture,
  // Jagged / malformed — for guard tests
  JAGGED: [[1, null], [null]] as unknown as BoardFixture,
  NAN_WIDTH_CASE: 'NaN' as const,
} as const;

// ── Scan helpers ────────────────────────────────────────────────────────────
export function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

export function countMatches(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

export function countMatchesRegex(source: string, pattern: RegExp): number {
  const m = source.match(pattern);
  return m ? m.length : 0;
}

// ── Spec / design provenance ───────────────────────────────────────────────
export const SPEC = {
  PATH: '_bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md',
  BASELINE_REVISION: '6576273',
  FINAL_REVISION: '7832d3c',
  COMMIT: 'b9db712',
  STATUS: 'done',
} as const;

export const DESIGN = {
  PATH: '_bmad-output/test-artifacts/test-design-9-2-screen-reader-contract.md',
  RISKS_TOTAL: 12,
  RISKS_HIGH: 3, // R-001 gate 6, R-002 focus 6, R-003 announcement 6
  P0_GROUPS: 9,
  P1_GROUPS: 8,
  P2_GROUPS: 4,
  P3_GROUPS: 2,
} as const;

// ── Validation helpers (host-only) ──────────────────────────────────────────
export function assertAnnouncementsContract(source: string): void {
  if (!source.includes('announceForAccessibilityWithOptions')) throw new Error('must use announceForAccessibilityWithOptions');
  if (!source.includes('queue: true')) throw new Error('must queue:true');
  if (!source.includes('announceForAccessibility')) throw new Error('must fallback to announceForAccessibility');
  if (!source.includes('SCORE_THROTTLE_MS = 500')) throw new Error('score throttle 500 missing');
  if (!source.includes('resetScoreThrottleForTests')) throw new Error('resetScoreThrottleForTests missing');
  if (!source.includes("__SCORE_THROTTLE_MS")) throw new Error('__SCORE_THROTTLE_MS export missing');
  if (!source.includes("i18n.t('a11y.")) throw new Error('must be i18n-authored');
  if (!source.includes('Number.isFinite')) throw new Error('finite guards missing');
}

export function assertBoardOverlayContract(source: string): void {
  if (!source.includes('const GRID = 4')) throw new Error('GRID 4 missing');
  if (!source.includes('const BOARD_PADDING = 8')) throw new Error('BOARD_PADDING 8 missing');
  if (!source.includes('const CELL_GAP = 8')) throw new Error('CELL_GAP 8 missing');
  if (!source.includes('__BOARD_A11Y_CONSTANTS')) throw new Error('__BOARD_A11Y_CONSTANTS missing');
  if (!source.includes('a11y-${r}-${c}')) throw new Error('stable key a11y-${r}-${c} missing');
  if (source.includes('a11y-${r}-${c}-${value}')) throw new Error('key must NOT include value');
  if (!source.includes('accessibilityRole="text"')) throw new Error('role must be text');
  if (!source.includes('pointerEvents="box-none"')) throw new Error('pointerEvents box-none missing');
  if (!source.includes('importantForAccessibility="no"')) throw new Error('importantForAccessibility no missing');
  if (!source.includes('value === null')) throw new Error('null guard missing');
  if (!source.includes('!Array.isArray(board)')) throw new Error('board array guard missing');
  if (!source.includes('Number.isFinite(width)')) throw new Error('width finite guard missing');
}

export function assertGestureGateContract(source: string): void {
  if (!source.includes('isThreeFingerMove')) throw new Error('isThreeFingerMove missing');
  if (!source.includes('useScreenReaderEnabled')) throw new Error('useScreenReaderEnabled missing');
  if (!source.includes('numberOfPointers')) throw new Error('numberOfPointers gate missing');
  if (!source.includes('Number.isFinite(event.translationX)')) throw new Error('translationX finite guard missing');
  if (!source.includes('resolveSwipeDirection')) throw new Error('must delegate to resolveSwipeDirection');
  if (!source.includes('isScreenReaderEnabled')) throw new Error('must wrap isScreenReaderEnabled');
}

export function assertI18nA11yKeys(en: Record<string, unknown>, pt: Record<string, unknown>): void {
  for (const key of I18N_A11Y_KEYS) {
    const ek = key.split('.').reduce((o: unknown, k: string) => (o as Record<string, unknown>)?.[k], en as unknown);
    const pk = key.split('.').reduce((o: unknown, k: string) => (o as Record<string, unknown>)?.[k], pt as unknown);
    if (!ek) throw new Error(`en must have ${key}`);
    if (!pk) throw new Error(`pt must have ${key}`);
  }
  const enMerged = (en as unknown as { a11y: { merged: string } }).a11y.merged;
  const ptMerged = (pt as unknown as { a11y: { merged: string } }).a11y.merged;
  const enGO = (en as unknown as { a11y: { gameOver: string } }).a11y.gameOver;
  const ptGO = (pt as unknown as { a11y: { gameOver: string } }).a11y.gameOver;
  if (!/Merged/i.test(enMerged)) throw new Error('en merged must contain Merged');
  if (!/Fundiu/i.test(ptMerged)) throw new Error('pt merged must contain Fundiu');
  if (!/Game over/i.test(enGO)) throw new Error('en gameOver must contain Game over');
  if (!/Fim de jogo/i.test(ptGO)) throw new Error('pt gameOver must contain Fim de jogo');
}

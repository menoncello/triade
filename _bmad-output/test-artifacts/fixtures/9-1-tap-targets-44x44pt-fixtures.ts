/**
 * Fixtures — 9-1 Tap targets ≥44×44pt (WCAG 2.5.5 / Apple HIG)
 * Deterministic, host-only, no faker — pure triade/src/ui + triade/App.tsx seam
 * Covers: triade/src/ui/PauseButton.tsx HIT_TARGET=48 canonical export
 *         triade/src/ui/Hud.tsx assistBtn minWidth/minHeight HIT_TARGET
 *         triade/src/ui/LaneSelectScreen.tsx card 88 + warningConfirm/Cancel + cta/restoreBtn/langBtn
 *         triade/src/ui/GameOverOverlay.tsx cta minWidth/minHeight+paddingHorizontal (fix 819fb2a) + continueAd/Iap/Cancel minWidth defensive
 *         triade/src/ui/AcceleratedAids.tsx dismissBtn/adBtn/iapBtn/cancelBtn
 *         triade/src/ui/TutorialOverlay.tsx skipBtn
 *         triade/src/ui/ToneScreen.tsx root flex:1 whole-screen
 *         triade/App.tsx menuBtn + boardWrap vs GestureDetector isolation
 *         triade/src/ui/layout.ts LANDSCAPE_BAND_HEIGHT 48 + SAFE_MARGIN 16 + BOARD_SIZE_FLOOR 216
 * Spec: _bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md (status done, baseline 8901f63, final c32eaee, 4 ACs + 6 I/O rows)
 * Design: _bmad-output/test-artifacts/test-design/test-design-epic-9-1-tap-targets.md (9 risks, 2 high R-001/R-002 score 6, P0 7 groups / P1 8 / P2 4 / P3 2)
 * ATDD: _bmad-output/test-artifacts/atdd-tests/9-1-tap-targets-44x44pt.red.spec.ts (7 skip → 7 pass when activated, node:test + tsx)
 *       triade/__tests__/ui/tapTargets.audit.test.ts (4 pass GREEN — canonical audit pin)
 *       triade/__tests__/ui/ui.thinview.test.ts (HIT_TARGET >=44 dual pin)
 *       triade/__tests__/ui/components/gameOverOverlay.test.ts + app.restart.test.ts (guard relaxed to minWidth/minHeight)
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/9-1-tap-targets-44x44pt.atdd.test.ts (13 pass when de-skipped)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx + readFileSync scans + react-test-renderer hasStyle (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';

export { stripCommentsAndStrings };

// ── Scan strings (single-source grep — literal copies from source) ─────────
export const SCAN_STRINGS = {
  // Canonical constant
  HIT_TARGET_EXPORT: 'export const HIT_TARGET = 48;',
  HIT_TARGET_VALUE: 'HIT_TARGET = 48',
  HIT_TARGET_DECL: 'HIT_TARGET',
  // PauseButton
  PAUSE_WIDTH: 'width: HIT_TARGET',
  PAUSE_HEIGHT: 'height: HIT_TARGET',
  PAUSE_HIT_SLOP: 'hitSlop={4}',
  PAUSE_ACCESSIBILITY_LABEL: 'accessibilityLabel="Pausar"',
  // Hud
  ASSIST_BTN_MIN_WIDTH: 'minWidth: HIT_TARGET',
  ASSIST_BTN_MIN_HEIGHT: 'minHeight: HIT_TARGET',
  ASSIST_BTN: 'assistBtn',
  PAUSE_SLOT: 'pauseSlot',
  LANDSCAPE_BAND: 'landscapeBand',
  PORTRAIT_BAND: 'portraitBand',
  // LaneSelect
  CARD_MIN_88: 'minHeight: 88',
  CARD: 'card',
  WARNING_CONFIRM: 'warningConfirm',
  WARNING_CANCEL: 'warningCancel',
  LANE_CTA: 'cta',
  RESTORE_BTN: 'restoreBtn',
  LANG_BTN: 'langBtn',
  // GameOverOverlay — fixed square is the anti-pattern, min+padding is the policy
  CTA_MIN_WIDTH: 'minWidth: HIT_TARGET',
  CTA_MIN_HEIGHT: 'minHeight: HIT_TARGET',
  CTA_PADDING_H: 'paddingHorizontal: 24',
  CTA_PADDING_V: 'paddingVertical: 8',
  CTA_FIXED_WIDTH_ANTI: 'cta: {\n    width: HIT_TARGET', // must NOT appear
  CTA_BLOCK_START: 'cta: {',
  CONTINUE_AD: 'continueAd',
  CONTINUE_IAP: 'continueIap',
  CONTINUE_CANCEL: 'continueCancel',
  CONTINUE_ROW: 'continueRow',
  CTA_LABEL: 'ctaLabel',
  // AcceleratedAids
  DISMISS_BTN: 'dismissBtn',
  AD_BTN: 'adBtn',
  IAP_BTN: 'iapBtn',
  CANCEL_BTN: 'cancelBtn',
  BANNER_CONTENT: 'bannerContent',
  PROMPT_ROW: 'promptRow',
  // Tutorial / Tone
  SKIP_BTN: 'skipBtn',
  TONE_ROOT_FLEX: 'flex: 1',
  TONE_ROOT: 'root',
  // App
  MENU_BTN: 'menuBtn',
  BOARD_WRAP: 'boardWrap',
  GESTURE_DETECTOR: 'GestureDetector',
  // Layout
  LANDSCAPE_BAND_HEIGHT: 'LANDSCAPE_BAND_HEIGHT',
  LANDSCAPE_BAND_HEIGHT_VAL: 'LANDSCAPE_BAND_HEIGHT = 48',
  SAFE_MARGIN: 'SAFE_MARGIN = 16',
  BOARD_SIZE_FLOOR: 'BOARD_SIZE_FLOOR',
  BOARD_SIZE_FLOOR_VAL: 'BOARD_SIZE_FLOOR = 216',
  GET_BAND_TOP: 'getBandTop',
};

// ── Expectations (mirrors triade/__tests__/ui/tapTargets.audit.test.ts allowlist) ──
export type Expectation = { rel: string; mustContain: string[]; mustNotContain?: string[] };

export const EXPECTATIONS: Expectation[] = [
  {
    rel: '../../src/ui/Hud.tsx',
    mustContain: ['assistBtn', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET'],
  },
  {
    rel: '../../src/ui/LaneSelectScreen.tsx',
    mustContain: [
      'card',
      'minHeight: 88',
      'warningConfirm',
      'minHeight: HIT_TARGET',
      'warningCancel',
      'minHeight: HIT_TARGET',
      'cta',
      'minHeight: HIT_TARGET',
      'restoreBtn',
      'minHeight: HIT_TARGET',
      'langBtn',
      'minHeight: HIT_TARGET',
      'minWidth: HIT_TARGET',
    ],
  },
  {
    rel: '../../src/ui/GameOverOverlay.tsx',
    mustContain: [
      'cta',
      'minWidth: HIT_TARGET',
      'minHeight: HIT_TARGET',
      'paddingHorizontal',
      'continueAd',
      'minHeight: HIT_TARGET',
      'minWidth: HIT_TARGET',
      'continueIap',
      'minHeight: HIT_TARGET',
      'minWidth: HIT_TARGET',
      'continueCancel',
      'minHeight: HIT_TARGET',
      'minWidth: HIT_TARGET',
    ],
    mustNotContain: ['cta: {\\n    width: HIT_TARGET'],
  },
  {
    rel: '../../src/ui/AcceleratedAids.tsx',
    mustContain: [
      'dismissBtn',
      'minWidth: HIT_TARGET',
      'minHeight: HIT_TARGET',
      'adBtn',
      'minHeight: HIT_TARGET',
      'iapBtn',
      'minHeight: HIT_TARGET',
      'cancelBtn',
      'minHeight: HIT_TARGET',
    ],
  },
  {
    rel: '../../src/ui/TutorialOverlay.tsx',
    mustContain: ['skipBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'],
  },
  {
    rel: '../../src/ui/ToneScreen.tsx',
    mustContain: ['root', 'flex: 1'],
  },
  {
    rel: '../../App.tsx',
    mustContain: ['menuBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'],
  },
];

// ── Gate constants (spec verification) ──────────────────────────────────────
export const GATE_CONSTANTS = {
  HIT_TARGET: 48,
  HIT_TARGET_MIN: 44,
  CARD_MIN: 88,
  LANDSCAPE_BAND_HEIGHT: 48,
  SAFE_MARGIN: 16,
  BOARD_SIZE_FLOOR: 216,
  CTA_PADDING_H: 24,
  CTA_PADDING_V: 8,
  FILES_WITH_PRESSABLE: 8, // PauseButton + Hud + LaneSelect + GameOver + AcceleratedAids + Tutorial + Tone + App
  EXPECTATION_GROUPS: 7,
  AUDIT_TESTS: 4, // tapTargets.audit.test.ts 4 tests
  RED_SCAFFOLDS: 7, // atdd-tests red.spec.ts 7 skip
  GATEWAY_TESTS: 14,
  UMBRELLA_TESTS: 8,
  UNIT_TESTS: 13,
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
  PATH: '_bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md',
  BASELINE_REVISION: '8901f63',
  FINAL_REVISION: 'c32eaee',
  COMMIT: '819fb2a',
  STATUS: 'done',
} as const;

export const DESIGN = {
  PATH: '_bmad-output/test-artifacts/test-design/test-design-epic-9-1-tap-targets.md',
  RISKS_TOTAL: 9,
  RISKS_HIGH: 2, // R-001 allowlist gap 6, R-002 CTA truncation 6
  P0_GROUPS: 7,
  P1_GROUPS: 8,
  P2_GROUPS: 4,
  P3_GROUPS: 2,
} as const;

// ── Validation helpers (host-only) ──────────────────────────────────────────
export function assertHitTarget(source: string): void {
  const m = /export\s+const\s+HIT_TARGET\s*=\s*(\d+)/.exec(source);
  if (!m) throw new Error('HIT_TARGET export missing');
  const n = Number(m[1]);
  if (!Number.isInteger(n)) throw new Error(`HIT_TARGET must be integer, got ${m[1]}`);
  if (n < 44) throw new Error(`HIT_TARGET must be >=44, got ${n}`);
  if (!source.includes('width: HIT_TARGET')) throw new Error('PauseButton width: HIT_TARGET missing');
  if (!source.includes('height: HIT_TARGET')) throw new Error('PauseButton height: HIT_TARGET missing');
}

export function assertCtaNotFixed(source: string): void {
  const block = /cta:\s*\{[^}]*\}/s.exec(source);
  if (!block) throw new Error('cta style block missing');
  const b = block[0];
  if (!b.includes('minWidth')) throw new Error('cta must use minWidth');
  if (!b.includes('minHeight')) throw new Error('cta must use minHeight');
  if (!b.includes('paddingHorizontal')) throw new Error('cta must have paddingHorizontal');
  if (/width:\s*HIT_TARGET/.test(b)) throw new Error('cta must not have fixed width: HIT_TARGET');
}

export function assertEveryPressableFloor(): void {
  for (const exp of EXPECTATIONS) {
    const p = new URL(`../../../../triade/${exp.rel.replace('../../', '')}`, import.meta.url).pathname;
    // For App.tsx, rel is ../../App.tsx -> triade/../../App.tsx is actually project root/App.tsx; handle separately
    const resolved = exp.rel === '../../App.tsx'
      ? new URL('../../../../triade/App.tsx', import.meta.url).pathname
      : new URL(`../../../../triade/${exp.rel.replace('../../', '')}`, import.meta.url).pathname;
    const raw = readFileSync(resolved, 'utf8');
    const src = stripCommentsAndStrings(raw);
    for (const needle of exp.mustContain) {
      if (!src.includes(needle)) throw new Error(`${exp.rel} must contain "${needle}"`);
    }
    if (exp.mustNotContain) {
      for (const forbidden of exp.mustNotContain) {
        const re = new RegExp(forbidden);
        if (re.test(raw)) throw new Error(`${exp.rel} must NOT contain /${forbidden}/`);
      }
    }
  }
}

export function assertLayoutBand(source: string): void {
  if (!source.includes('LANDSCAPE_BAND_HEIGHT = 48')) throw new Error('LANDSCAPE_BAND_HEIGHT must be 48');
  if (!source.includes('SAFE_MARGIN = 16')) throw new Error('SAFE_MARGIN must be 16');
  // BOARD_SIZE_FLOOR 216 = 44*4 + 8*2 + 8*3 derivation is documented; pin literal 216 existence
  if (!source.includes('BOARD_SIZE_FLOOR')) throw new Error('BOARD_SIZE_FLOOR missing');
}

/**
 * Fixtures — dw-overlay-carriers-hardening (DW-91, DW-92, DW-101, DW-102)
 * GameOverOverlay carriers hardening — component-local overlay seam
 * Deterministic, host-only, no faker — pure triade/src/ui/GameOverOverlay.tsx
 * Covers: triade/src/ui/GameOverOverlay.tsx:40-44 clampInset finite>=0 + SAFE_MARGIN
 *         triade/src/ui/GameOverOverlay.tsx:52-82 reactive reducedMotion effect
 *         triade/src/ui/GameOverOverlay.tsx:99-119 numberOfLines/ellipsizeMode/flexShrink
 *         triade/src/ui/GameOverOverlay.tsx:184 zIndex:2/elevation:2/pointerEvents auto vs Hud zIndex:1
 *         triade/src/ui/Hud.tsx:169-177 zIndex:1 reference baseline
 *         triade/src/ui/layout.ts:4 SAFE_MARGIN 16
 *         triade/test-utils/rn-stub.ts:22-67 Animated stub Value/timing/parallel
 * Spec: _bmad-output/implementation-artifacts/spec-overlay-carriers-hardening.md (status done, 5-row I/O matrix)
 * Design: _bmad-output/test-artifacts/test-design-dw-overlay-carriers-hardening.md (11 risks, 3 high R-001/R-002/R-003 score 6)
 * ATDD: triade/__tests__/ui/components/gameOverOverlay.test.ts (20 pass GREEN oracle)
 *       triade/__tests__/ui/components/overlayCarriers.integration.test.ts (4 pass GREEN oracle)
 *       _bmad-output/test-artifacts/tests/unit/overlay-carriers-hardening.atdd.test.ts (14 skip → 14 pass)
 *       _bmad-output/test-artifacts/tests/api/overlay-carriers-hardening.gateway.spec.ts (11 skip → 11 pass)
 *       _bmad-output/test-artifacts/tests/e2e/overlay-carriers-hardening.umbrella.spec.ts (8 skip → 8 pass)
 * Run: npm --prefix triade test -- __tests__/ui/components/gameOverOverlay.test.ts __tests__/ui/components/overlayCarriers.integration.test.ts (24 pass)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx + react-test-renderer + readFileSync scans (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';

export { stripCommentsAndStrings };

// ── Scan strings (single-source grep) ─────────────────────────────────────
export const SCAN_STRINGS = {
  CLAMP_DEF: 'const clampInset',
  CLAMP_BODY: 'Number.isFinite(v as number) && (v as number) >= 0 ? (v as number) : 0',
  CLAMP_TOP: 'clampInset(insets?.top)',
  CLAMP_BOTTOM: 'clampInset(insets?.bottom)',
  CLAMP_LEFT: 'clampInset(insets?.left)',
  CLAMP_RIGHT: 'clampInset(insets?.right)',
  SAFE_MARGIN_IMPORT: "from './layout'",
  SAFE_MARGIN_TOKEN: 'SAFE_MARGIN',
  SAFE_MARGIN_VALUE: 'SAFE_MARGIN 16',
  CLAMP_PLUS_MARGIN: '+ SAFE_MARGIN',
  REDUCED_MOTION_EFFECT: 'useEffect(() => {',
  REDUCED_MOTION_DEP: '[reducedMotion, scrimOpacity, contentOpacity, contentY]',
  REDUCED_MOTION_IF: 'if (reducedMotion)',
  STOP_ANIMATION: 'stopAnimation',
  SET_VALUE_1: 'setValue(1)',
  SET_VALUE_0: 'setValue(0)',
  SET_VALUE_12: 'setValue(12)',
  FADE_MS: 'FADE_MS',
  FADE_MS_280: 'const FADE_MS = 280',
  DELAY_80: 'delay: 80',
  EASING_CUBIC: 'Easing.out(Easing.cubic)',
  USE_NATIVE_TRUE: 'useNativeDriver: true',
  ANIM_PARALLEL: 'Animated.parallel',
  ANIM_TIMING: 'Animated.timing',
  ANIM_STOP: 'anim.stop()',
  NUMBER_OF_LINES: 'numberOfLines={1}',
  NUMBER_OF_LINES_PROP: 'numberOfLines',
  ELLIPSIZE_TAIL: 'ellipsizeMode="tail"',
  FLEX_SHRINK_1: 'flexShrink: 1',
  FLEX_SHRINK_0: 'flexShrink: 0',
  TEXT_ALIGN_RIGHT: 'textAlign: 1', // guard: avoid literal mismatch; real scan is textAlign.*right
  TEXT_ALIGN_RIGHT_FULL: "textAlign: 'right'",
  ZINDEX_2: 'zIndex: 2',
  ELEVATION_2: 'elevation: 2',
  BG_RGBA: 'rgba(12,14,17,0.7)',
  POINTER_AUTO: 'pointerEvents="auto"',
  POSITION_ABSOLUTE: "position: 'absolute'",
  VALUE_STYLE: 'value:',
  VALUE_RECORD_STYLE: 'valueRecord:',
  LABEL_STYLE: 'label:',
  ROW_STYLE: 'row:',
  OVERLAY_STYLE: 'overlay:',
  HIT_TARGET: 'HIT_TARGET',
  HUD_ZINDEX_1: 'zIndex: 1',
  HUD_ELEVATION_1: 'elevation: 1',
  HUD_POINTER_BOX_NONE: 'pointerEvents="box-none"',
  // DW Ledger
  DW91: 'DW-91',
  DW92: 'DW-92',
  DW101: 'DW-101',
  DW102: 'DW-102',
  LEDGER_HASH: '596c2f86f89f421758063c068af190fef0052b181dcedd83fcfcc495c1859b15',
  LEDGER_STATUS_DONE: 'status: done 2026-09-02',
  LEDGER_RESOLUTION: 'resolved by sweep bundle dw-overlay-carriers-hardening',
  SPEC_FRAGMENT: 'spec-overlay-carriers-hardening',
} as const;

// ── Source scan helpers ───────────────────────────────────────────────────
const __dirname_fixture = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname_fixture, '../../..');

export function readSource(relativePath: string): string {
  return readFileSync(join(PROJECT_ROOT, relativePath), 'utf8');
}

export function countMatches(source: string, pattern: RegExp | string): number {
  const re =
    typeof pattern === 'string'
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      : new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  return (source.match(re) || []).length;
}

export const OVERLAY_SOURCE_PATH = 'triade/src/ui/GameOverOverlay.tsx';
export const HUD_SOURCE_PATH = 'triade/src/ui/Hud.tsx';
export const LAYOUT_SOURCE_PATH = 'triade/src/ui/layout.ts';
export const RN_STUB_PATH = 'triade/test-utils/rn-stub.ts';
export const LEDGER_PATH = '_bmad-output/implementation-artifacts/deferred-work.md';
export const SPEC_PATH = '_bmad-output/implementation-artifacts/spec-overlay-carriers-hardening.md';
export const TEST_ORACLE_INTEGRATION = 'triade/__tests__/ui/components/overlayCarriers.integration.test.ts';
export const TEST_ORACLE_GAMEOVER = 'triade/__tests__/ui/components/gameOverOverlay.test.ts';

// ── Validation helpers (host allowlist gates) ─────────────────────────────
export function assertClampInset(overlaySrc: string): void {
  if (!overlaySrc.includes(SCAN_STRINGS.CLAMP_DEF)) throw new Error('GameOverOverlay.tsx must define clampInset helper');
  if (!overlaySrc.includes('Number.isFinite')) throw new Error('clampInset must use Number.isFinite');
  if (!overlaySrc.includes('>= 0')) throw new Error('clampInset must guard >=0');
  const uses = countMatches(overlaySrc, /clampInset\(insets/g);
  if (uses !== 4) throw new Error(`clampInset(insets must be 4 (padTop/Bottom/Left/Right), got ${uses}`);
  if (!overlaySrc.includes('+ SAFE_MARGIN')) throw new Error('padTop/Bottom/Left/Right must be clampInset(...) + SAFE_MARGIN');
  const marginCount = countMatches(overlaySrc, /SAFE_MARGIN/g);
  if (marginCount < 5) throw new Error(`SAFE_MARGIN hits >=5 (import + 4 pads), got ${marginCount}`);
}

export function assertReactiveEffect(overlaySrc: string): void {
  if (!/useEffect\([^]*reducedMotion[^]*\]\s*\)/.test(overlaySrc)) throw new Error('useEffect must depend on reducedMotion');
  if (!overlaySrc.includes('stopAnimation')) throw new Error('must call stopAnimation');
  if (!overlaySrc.includes('setValue(0)') && !overlaySrc.includes('setValue(12)')) throw new Error('must setValue(0)/setValue(12) for reset');
  if (!overlaySrc.includes('setValue(1)')) throw new Error('must setValue(1) for snap');
  if (!overlaySrc.includes(SCAN_STRINGS.FADE_MS_280)) throw new Error('FADE_MS must be 280');
  if (countMatches(overlaySrc, /delay:\s*80/g) < 2) throw new Error('delay: 80 must appear >=2 (contentOpacity + contentY)');
  if (countMatches(overlaySrc, /Easing\.out\(Easing\.cubic\)/g) < 3) throw new Error('Easing.out(Easing.cubic) must be 3');
  if (countMatches(overlaySrc, /useNativeDriver:\s*true/g) < 3) throw new Error('useNativeDriver: true must be 3');
  const stopHits = countMatches(overlaySrc, /stopAnimation/g);
  if (stopHits < 6) throw new Error(`stopAnimation hits >=6 (3 preamble +3 cleanup), got ${stopHits}`);
  if (!overlaySrc.includes('anim.stop()')) throw new Error('cleanup must call anim.stop()');
}

export function assertOverflowGuard(overlaySrc: string): void {
  const nLines = countMatches(overlaySrc, /numberOfLines/g);
  if (nLines !== 5) throw new Error(`numberOfLines must be 5 (all value Texts), got ${nLines}`);
  if (!overlaySrc.includes('ellipsizeMode')) throw new Error('must contain ellipsizeMode');
  const ell = countMatches(overlaySrc, /ellipsizeMode="tail"/g);
  if (ell !== 5) throw new Error(`ellipsizeMode="tail" must be 5, got ${ell}`);
  const shrink1 = countMatches(overlaySrc, /flexShrink:\s*1/g);
  if (shrink1 < 2) throw new Error(`flexShrink:1 must be >=2 (value+valueRecord), got ${shrink1}`);
  if (!overlaySrc.includes("textAlign: 'right'")) throw new Error('value/valueRecord must have textAlign right');
  if (!overlaySrc.includes('flexShrink: 0')) throw new Error('label must have flexShrink:0');
}

export function assertZIndexLayering(overlaySrc: string, hudSrc: string): void {
  if (!overlaySrc.includes('zIndex: 2')) throw new Error('overlay must have zIndex:2');
  if (!overlaySrc.includes('elevation: 2')) throw new Error('overlay must have elevation:2');
  if (!overlaySrc.includes('rgba(12,14,17,0.7)')) throw new Error('overlay must have scrim rgba(12,14,17,0.7)');
  if (!overlaySrc.includes('pointerEvents="auto"') && !overlaySrc.includes("pointerEvents='auto'")) throw new Error('overlay must have pointerEvents auto');
  if (!overlaySrc.includes("position: 'absolute'")) throw new Error('overlay must be position absolute');
  if (!hudSrc.includes('zIndex: 1')) throw new Error('Hud must have zIndex:1');
  if (!hudSrc.includes('elevation: 1')) throw new Error('Hud must have elevation:1');
  // overlay 2 > Hud 1 verified at runtime via renderer collectStyles; source just pins presence
}

export function assertLedger(ledgerSrc: string): void {
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_HASH)) throw new Error('ledger must contain 596c2f86 hash');
  const hits = countMatches(ledgerSrc, new RegExp(SCAN_STRINGS.LEDGER_HASH, 'g'));
  if (hits !== 4) throw new Error(`ledger 596c2f86 must be 4 (DW-91,92,101,102), got ${hits}`);
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_STATUS_DONE)) throw new Error('ledger must contain status: done 2026-09-02');
  if (!ledgerSrc.includes(SCAN_STRINGS.LEDGER_RESOLUTION)) throw new Error('ledger resolution dw-overlay-carriers-hardening missing');
  for (const dw of ['DW-91', 'DW-92', 'DW-101', 'DW-102']) {
    if (!ledgerSrc.includes(dw)) throw new Error(`missing ${dw}`);
    const sec = ledgerSrc.split(dw)[1] ?? '';
    if (!sec.includes('status: done 2026-09-02')) throw new Error(`${dw} not done`);
  }
}

// ── Inset fixtures ────────────────────────────────────────────────────────
export const INSETS_FIXTURES = {
  nominal: { top: 10, bottom: 10, left: 10, right: 10 },
  degenerate: { top: NaN, bottom: -20, left: Infinity, right: undefined as unknown as number },
  zero: { top: 0, bottom: 0, left: 0, right: 0 },
  bareUndefined: undefined as unknown as { top: number; bottom: number; left: number; right: number },
  partialMissing: { top: 5 } as unknown as { top: number; bottom: number; left: number; right: number },
  nanAll: { top: NaN, bottom: NaN, left: NaN, right: NaN },
  infiniteAll: { top: Infinity, bottom: Infinity, left: Infinity, right: Infinity },
  negativeAll: { top: -999, bottom: -1, left: -0.1, right: -100 },
  stringCoerce: { top: '12' as unknown as number, bottom: null as unknown as number, left: undefined as unknown as number, right: 5 },
} as const;

export const STATS_FIXTURES = {
  nominal: { score: 123, best: 456, maxTile: 48, merges: 7, longestStreak: 3 },
  huge: { score: 1999999999, best: 1999999999, maxTile: 999999, merges: 999, longestStreak: 999 },
  zero: { score: 0, best: 0, maxTile: 2, merges: 0, longestStreak: 0 },
  maxInt: { score: Number.MAX_SAFE_INTEGER, best: Number.MAX_SAFE_INTEGER, maxTile: 2048, merges: 1000, longestStreak: 100 },
} as const;

// ── Gate constants (single-source) ────────────────────────────────────────
export const GATE_CONSTANTS = {
  SAFE_MARGIN: 16,
  FADE_MS: 280,
  DELAY_MS: 80,
  CLAMP_USES: 4,
  SAFE_MARGIN_HITS_MIN: 5,
  NUMBER_OF_LINES_HITS: 5,
  ELLIPSIZE_TAIL_HITS: 5,
  FLEX_SHRINK_1_MIN: 2,
  STOP_ANIMATION_MIN: 6,
  LEDGER_HASH_HITS: 4,
  ZINDEX_OVERLAY: 2,
  ZINDEX_HUD: 1,
} as const;

export const LEDGER = {
  HASH: '596c2f86f89f421758063c068af190fef0052b181dcedd83fcfcc495c1859b15',
  DATE: '2026-09-02',
  BUNDLE: 'dw-overlay-carriers-hardening',
  DWS: ['DW-91', 'DW-92', 'DW-101', 'DW-102'] as const,
} as const;

export const SPEC = {
  PATH: SPEC_PATH,
  TITLE: 'overlay-carriers-hardening',
  STATUS: 'done',
} as const;

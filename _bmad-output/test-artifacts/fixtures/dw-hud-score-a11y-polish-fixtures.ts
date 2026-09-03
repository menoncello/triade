/**
 * Fixtures — dw-hud-score-a11y-polish (DW-8)
 * Hud pt-BR thousands + preview a11y polish — pure Hud.tsx + PreviewCard.tsx seam
 * Deterministic, host-only, no faker — pure triade/src/ui/Hud.tsx + triade/src/ui/PreviewCard.tsx
 * Covers: triade/src/ui/Hud.tsx:11-13 fmt helper + 44 LanePreview accessible={false} + 81,84,128,131 fmt(score/best)×4
 *         triade/src/ui/Hud.tsx:88 landscapePreviews accessible={false} + 138 previewPortrait accessible={false}
 *         triade/src/ui/PreviewCard.tsx:29 accessibilityLabel + pointerEvents none pinned
 * Spec: _bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md (status done, final_revision b41ba16, baseline 2a9b015)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-hud-score-a11y-polish.md (8 risks, 2 high R-001/R-002 score 6)
 * ATDD: triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts (19 skip → 19 pass when activated, node:test + tsx + react-test-renderer)
 *       _bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts (mirror)
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts (19 pass when de-skipped)
 * TEA-required fixture surface under test_artifacts/fixtures; oracle helpers live in triade/test-utils/helpers.ts
 * No Playwright test.extend — pure node:test + tsx + readFileSync scans + react-test-renderer (RN Expo 57, no page.goto).
 */

import { readFileSync } from 'node:fs';
import { stripCommentsAndStrings } from '../../../triade/test-utils/helpers.ts';

export { stripCommentsAndStrings };

// ── Scan strings (single-source grep — literal copies from source) ─────────
export const SCAN_STRINGS = {
  // fmt helper
  FMT_FN: "function fmt(n: number): string {",
  FMT_BODY: "return Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0';",
  FMT_FINITE: 'Number.isFinite(n)',
  TOLOCALE_PTBR: "toLocaleString('pt-BR')",
  FMT_SCORE: 'fmt(score)',
  FMT_BEST: 'fmt(best)',
  BARE_SCORE: '{score}',
  BARE_BEST: '{best}',
  // accessible wrappers
  ACCESSIBLE_FALSE: 'accessible={false}',
  LANE_PREVIEW_WRAPPER: '<View accessible={false} style={isLandscape ? styles.laneBoxLandscape : styles.laneBoxPortrait}>',
  LANDSCAPE_PREVIEWS: '<View pointerEvents="none" accessible={false} style={styles.landscapePreviews}>',
  PREVIEW_PORTRAIT: '<View pointerEvents="box-none" accessible={false} style={[styles.previewPortrait',
  // PreviewCard pinned
  PREVIEW_CARD_LABEL: 'accessibilityLabel={announcement}',
  PREVIEW_CARD_POINTER: 'pointerEvents="none"',
  PREVIEW_CARD_ACCESSIBLE: 'accessible',
  PREVIEW_CARD_ROLE: 'accessibilityRole="text"',
  ANNOUNCEMENT: 'const announcement = `Próxima${laneNote}: ${display}`;',
  // pointerEvents contracts
  OVERLAY_BOX_NONE: 'pointerEvents="box-none"',
  LANDSCAPE_NONE: 'pointerEvents="none"',
  // layout markers
  LANE_BOX_PORTRAIT: 'width: 76,',
  LANE_BOX_PORTRAIT_H: 'height: 76,',
  LANE_BOX_LANDSCAPE_W: 'minWidth: 60,',
  LANE_BOX_LANDSCAPE_H: 'height: 44,',
  // ledger
  DW8: 'DW-8',
  LEDGER_HASH: 'cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510',
  RESOLUTION_UNDO: 'resolution-undo: cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510',
  SPEC_FINAL: 'final_revision: b41ba16',
  SPEC_BASELINE: 'baseline_revision: 2a9b015',
  FALLBACK_PREVIEW: 'FALLBACK_PREVIEW',
};

// ── Score/best fixtures (fmt table) ────────────────────────────────────────
export const SCORE_FIXTURES = {
  ZERO: 0,
  SMALL_123: 123,
  BOUNDARY_999: 999,
  THOUSAND_1000: 1000,
  MOCKUP_3240: 3240,
  BEST_12456: 12456,
  LARGE_1M: 1_000_000,
  NEG_3240: -3240,
  NAN: NaN as unknown as number,
  INFINITY: Infinity as unknown as number,
  NEG_INFINITY: -Infinity as unknown as number,
  STRING_MISUSE: '3240' as unknown as number,
} as const;

export const EXPECTED_FMT: Record<string, string> = {
  '0': '0',
  '123': '123',
  '999': '999',
  '1000': '1.000',
  '3240': '3.240',
  '12456': '12.456',
  '1000000': '1.000.000',
  '-3240': '-3.240',
  'NaN': '0',
  'Infinity': '0',
  '-Infinity': '0',
};

export function expectedFmt(n: unknown): string {
  return Number.isFinite(n as number) ? (n as number).toLocaleString('pt-BR') : '0';
}

// ── Preview fixtures ────────────────────────────────────────────────────────
export const PREVIEW_FIXTURES = {
  EXACT_3: { kind: 'exact' as const, value: 3 },
  EXACT_6: { kind: 'exact' as const, value: 6 },
  EXACT_12: { kind: 'exact' as const, value: 12 },
  RANGE_3_6_12: { kind: 'range' as const, values: [3, 6, 12] },
  FALLBACK_EMPTY: { kind: 'range' as const, values: [] as number[] },
} as const;

export const INSETS_FIXTURE = { top: 10, left: 10, right: 10, bottom: 10 } as const;
export const BAND_HEIGHT_FIXTURE = 40 as const;

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

// ── Gate constants (spec verification) ──────────────────────────────────────
export const GATE_CONSTANTS = {
  FMT_FN_COUNT: 1,
  FMT_SCORE_COUNT: 2,
  FMT_BEST_COUNT: 2,
  ACCESSIBLE_FALSE_COUNT: 3,
  TOLOCALE_PTBR_COUNT: 1,
  BARE_SCORE_COUNT: 0,
  BARE_BEST_COUNT: 0,
  FALLBACK_PREVIEW_COUNT: 2,
  PREVIEWS_OPTIONAL_COUNT: 1,
  LEDGER_HASH_COUNT: 1, // resolution-undo line
  RESOLUTION_UNDO_LINES: 2, // status done line + resolution-undo line share hash? Actually hash appears once
  POINTER_BOX_NONE_MIN: 2,
  POINTER_NONE_MIN: 1,
  WIDTH_76_COUNT: 1,
  HEIGHT_44_COUNT: 1,
} as const;

// ── Ledger / spec ───────────────────────────────────────────────────────────
export const LEDGER = {
  HASH: 'cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510',
  DW8: 'DW-8',
  DONE_DATE: '2026-09-03',
  RESOLUTION: 'resolved by sweep bundle dw-hud-score-a11y-polish',
} as const;

export const SPEC = {
  FINAL_REVISION: 'b41ba16',
  BASELINE_REVISION: '2a9b015',
  SPEC_PATH: '_bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md',
} as const;

// ── Validation helpers (host-only) ──────────────────────────────────────────
export function assertFmtHelper(source: string): void {
  if (!source.includes(SCAN_STRINGS.FMT_FN)) throw new Error('fmt function missing');
  if (!source.includes(SCAN_STRINGS.FMT_BODY)) throw new Error('fmt body missing');
  if (countMatches(source, SCAN_STRINGS.TOLOCALE_PTBR) !== GATE_CONSTANTS.TOLOCALE_PTBR_COUNT) {
    throw new Error(`toLocaleString pt-BR expected ${GATE_CONSTANTS.TOLOCALE_PTBR_COUNT} got ${countMatches(source, SCAN_STRINGS.TOLOCALE_PTBR)}`);
  }
  if (countMatches(source, SCAN_STRINGS.FMT_SCORE) !== GATE_CONSTANTS.FMT_SCORE_COUNT) {
    throw new Error(`fmt(score) expected ${GATE_CONSTANTS.FMT_SCORE_COUNT} got ${countMatches(source, SCAN_STRINGS.FMT_SCORE)}`);
  }
  if (countMatches(source, SCAN_STRINGS.FMT_BEST) !== GATE_CONSTANTS.FMT_BEST_COUNT) {
    throw new Error(`fmt(best) expected ${GATE_CONSTANTS.FMT_BEST_COUNT} got ${countMatches(source, SCAN_STRINGS.FMT_BEST)}`);
  }
  if (countMatches(source, SCAN_STRINGS.BARE_SCORE) !== GATE_CONSTANTS.BARE_SCORE_COUNT) {
    throw new Error(`bare {score} expected 0 got ${countMatches(source, SCAN_STRINGS.BARE_SCORE)}`);
  }
  if (countMatches(source, SCAN_STRINGS.BARE_BEST) !== GATE_CONSTANTS.BARE_BEST_COUNT) {
    throw new Error(`bare {best} expected 0 got ${countMatches(source, SCAN_STRINGS.BARE_BEST)}`);
  }
}

export function assertAccessibleWrappers(source: string): void {
  if (countMatches(source, SCAN_STRINGS.ACCESSIBLE_FALSE) !== GATE_CONSTANTS.ACCESSIBLE_FALSE_COUNT) {
    throw new Error(`accessible={false} expected ${GATE_CONSTANTS.ACCESSIBLE_FALSE_COUNT} got ${countMatches(source, SCAN_STRINGS.ACCESSIBLE_FALSE)}`);
  }
  if (!source.includes(SCAN_STRINGS.LANE_PREVIEW_WRAPPER)) throw new Error('LanePreview wrapper accessible false missing');
  if (!source.includes(SCAN_STRINGS.LANDSCAPE_PREVIEWS)) throw new Error('landscapePreviews accessible false missing');
  if (!source.includes(SCAN_STRINGS.PREVIEW_PORTRAIT)) throw new Error('previewPortrait accessible false missing');
}

export function assertPreviewCard(source: string): void {
  if (!source.includes(SCAN_STRINGS.PREVIEW_CARD_LABEL)) throw new Error('PreviewCard accessibilityLabel missing');
  if (!source.includes(SCAN_STRINGS.PREVIEW_CARD_POINTER)) throw new Error('PreviewCard pointerEvents none missing');
  if (!source.includes(SCAN_STRINGS.PREVIEW_CARD_ACCESSIBLE)) throw new Error('PreviewCard accessible missing');
}

export function assertLedger(ledgerSource: string): void {
  if (!ledgerSource.includes(LEDGER.HASH)) throw new Error('ledger hash missing');
  if (!ledgerSource.includes(LEDGER.DW8)) throw new Error('DW-8 missing in ledger');
  if (!ledgerSource.includes('status: done 2026-09-03')) throw new Error('ledger done date missing');
  if (!ledgerSource.includes(LEDGER.RESOLUTION)) throw new Error('ledger resolution missing');
}

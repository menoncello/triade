/**
 * Fixtures — 9-2 Screen Reader Contract, preview/banner wiring delta (9c33e33)
 * Deterministic, host-only, no faker. Single source for the delta seam:
 *   triade/App.tsx (+51: a11yPreviewDisplay memo + prevPreviewRef/prevBannerRef
 *     null-init skip-first-mount + announcePreview on display change +
 *     announceBanner on ceiling/stuck false→true with msg && msg !== key guards)
 *   triade/src/ui/PreviewCard.tsx (accessibilityLabel i18n-authored via
 *     i18n.t('a11y.preview', { display }) with try/catch EN fallback)
 *   triade/src/a11y/announcements.ts (announcePreview/announceBanner, already landed)
 * Spec: _bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md
 *   (status awaiting-operator; review pass 2026-09-07: patch 2 low fixed, reject 17)
 * Design input: _bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts
 *   (P1-D1..D4 RED scaffolds + 2 GREEN gate pins) — this automate pass turns the
 *   GREEN gate pins + P1 coverage into ACTIVE host tests (no test.skip here).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules
 *   triade/node_modules/.bin/tsx --test "_bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts"
 * No Playwright test.extend — RN AccessibilityInfo bridge, no browser DOM.
 */

import { readFileSync } from 'node:fs';

// ── Source paths (resolved by consumers via readSource) ─────────────────────
export const DELTA_SOURCES = {
  app: 'triade/App.tsx',
  previewCard: 'triade/src/ui/PreviewCard.tsx',
  announcements: 'triade/src/a11y/announcements.ts',
  en: 'triade/src/i18n/locales/en.json',
  pt: 'triade/src/i18n/locales/pt.json',
  contract: 'triade/__tests__/a11y/screenReader.contract.test.tsx',
} as const;

// ── Scan strings (literal copies from the delta source) ─────────────────────
export const PREVIEW_BANNER_SCAN_STRINGS = {
  // App.tsx preview effect
  PREVIEW_DISPLAY_MEMO: 'a11yPreviewDisplay',
  PREV_PREVIEW_REF: 'prevPreviewRef',
  PREV_BANNER_REF: 'prevBannerRef',
  NULL_INIT: 'useRef<string | null>(null)',
  BANNER_NULL_INIT: 'useRef<{ ceiling: boolean; stuck: boolean } | null>(null)',
  FIRST_MOUNT_SKIP: '.current === null',
  CHANGE_CHECK: 'prevPreviewRef.current !== a11yPreviewDisplay',
  NON_EMPTY_DISPLAY: '&& a11yPreviewDisplay',
  ANNOUNCE_PREVIEW_CALL: 'announcePreview(a11yPreviewDisplay)',
  CEILING_TRANSITION: 'showCeilingBanner && !prev.ceiling',
  STUCK_TRANSITION: 'showStuckBanner && !prev.stuck',
  CEILING_GUARD: "msg !== 'accelerated.ceilingHint'",
  STUCK_GUARD: "msg !== 'accelerated.stuckHint'",
  CEILING_KEY: "i18n.t('accelerated.ceilingHint')",
  STUCK_KEY: "i18n.t('accelerated.stuckHint')",
  // PreviewCard.tsx i18n label
  PREVIEW_I18N_CALL: "i18n.t('a11y.preview'",
  EN_FALLBACK_NEXT: 'Next',
  A11Y_LABEL_FEED: 'accessibilityLabel={announcement}',
  ROLE_TEXT: 'accessibilityRole="text"',
  // announcements.ts contract (already landed, pinned as regression net)
  ANNOUNCE_PREVIEW_FN: 'export function announcePreview',
  ANNOUNCE_BANNER_FN: 'export function announceBanner',
  PREVIEW_EMPTY_GUARD: 'if (!display) return',
  BANNER_EMPTY_GUARD: 'if (!text) return',
} as const;

// ── Deterministic display inputs (mirror of App a11yPreviewDisplay memo) ────
// Pure replica of the memo logic: exact → String(value) or ''; range → join('/')
// with Number.isFinite filtering and '' on empty/exception. Lets E2E tests pin
// the change-check invariant without mounting App.
export function previewDisplayOf(preview: { kind: string; value?: number; values?: number[] }): string {
  try {
    if (preview.kind === 'exact') {
      return Number.isFinite(preview.value) ? String(preview.value) : '';
    }
    const vals = Array.isArray(preview.values) ? preview.values.filter((v) => Number.isFinite(v)) : [];
    return vals.length > 0 ? vals.join('/') : '';
  } catch {
    return '';
  }
}

export const PREVIEW_DISPLAY_FIXTURES = {
  EXACT_8: { kind: 'exact', value: 8 },
  EXACT_NAN: { kind: 'exact', value: NaN },
  RANGE_123: { kind: 'range', values: [1, 2, 3] },
  RANGE_WITH_NAN: { kind: 'range', values: [4, NaN, 8] },
  RANGE_EMPTY: { kind: 'range', values: [] },
  MALFORMED: { kind: 'bogus', values: undefined },
} as const;

export const PREVIEW_DISPLAY_EXPECTATIONS = {
  EXACT_8: '8',
  EXACT_NAN: '',
  RANGE_123: '1/2/3',
  RANGE_WITH_NAN: '4/8',
  RANGE_EMPTY: '',
  MALFORMED: '',
} as const;

// ── Banner transition matrix (false→true announces, all else silent) ─────────
export interface BannerState {
  ceiling: boolean;
  stuck: boolean;
}
export const BANNER_TRANSITION_FIXTURES: Array<{
  name: string;
  prev: BannerState | null;
  next: BannerState;
  expectCeiling: boolean;
  expectStuck: boolean;
}> = [
  { name: 'first mount silent', prev: null, next: { ceiling: true, stuck: true }, expectCeiling: false, expectStuck: false },
  { name: 'ceiling false→true announces', prev: { ceiling: false, stuck: false }, next: { ceiling: true, stuck: false }, expectCeiling: true, expectStuck: false },
  { name: 'stuck false→true announces', prev: { ceiling: false, stuck: false }, next: { ceiling: false, stuck: true }, expectCeiling: false, expectStuck: true },
  { name: 'both false→true announce', prev: { ceiling: false, stuck: false }, next: { ceiling: true, stuck: true }, expectCeiling: true, expectStuck: true },
  { name: 'steady true silent', prev: { ceiling: true, stuck: true }, next: { ceiling: true, stuck: true }, expectCeiling: false, expectStuck: false },
  { name: 'true→false silent', prev: { ceiling: true, stuck: true }, next: { ceiling: false, stuck: false }, expectCeiling: false, expectStuck: false },
  { name: 'steady false silent', prev: { ceiling: false, stuck: false }, next: { ceiling: false, stuck: false }, expectCeiling: false, expectStuck: false },
];

/** Pure replica of the App banner effect decision (without i18n). */
export function bannerTransitions(prev: BannerState | null, next: BannerState): { ceiling: boolean; stuck: boolean } {
  if (prev === null) return { ceiling: false, stuck: false };
  return {
    ceiling: next.ceiling && !prev.ceiling,
    stuck: next.stuck && !prev.stuck,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
export function readSource(path: string): string {
  return readFileSync(path, 'utf8');
}

export function countMatches(src: string, re: RegExp): number {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
  return (src.match(new RegExp(re.source, flags)) ?? []).length;
}

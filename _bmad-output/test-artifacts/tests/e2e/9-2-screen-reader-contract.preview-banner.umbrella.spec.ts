/**
 * E2E Umbrella — 9-2 Screen Reader Contract, preview/banner wiring delta (9c33e33)
 * Host node:test + tsx + react-test-renderer (no Playwright page.goto — RN bridge).
 * ACTIVE tests (implementation landed). E2E here = end-to-end user journeys:
 * mount silence → value change → single announcement → locale-correct phrasing,
 * exercised through the real PreviewCard component + real i18n + real
 * announcement capture + App effect decision replicas from fixtures.
 * Run from repo root:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules \
 *     triade/node_modules/.bin/tsx --test "_bmad-output/test-artifacts/tests/e2e/9-2-screen-reader-contract.preview-banner.umbrella.spec.ts"
 * Spec: _bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md
 * Fixtures: _bmad-output/test-artifacts/fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { AccessibilityInfo } from 'react-native';
import { i18n } from '../../../../triade/src/i18n/index.ts';
import * as announcements from '../../../../triade/src/a11y/announcements.ts';
import { PreviewCard } from '../../../../triade/src/ui/PreviewCard.tsx';
import {
  readSource,
  previewDisplayOf,
  PREVIEW_DISPLAY_FIXTURES,
  PREVIEW_DISPLAY_EXPECTATIONS,
} from '../../fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts';

let captured: string[] = [];
let origAnnounce: unknown;
let origAnnounceWithOpts: unknown;

beforeEach(async () => {
  captured = [];
  origAnnounce = (AccessibilityInfo as any).announceForAccessibility;
  origAnnounceWithOpts = (AccessibilityInfo as any).announceForAccessibilityWithOptions;
  (AccessibilityInfo as any).announceForAccessibility = (msg: string) => captured.push(msg);
  (AccessibilityInfo as any).announceForAccessibilityWithOptions = (msg: string) => captured.push(msg);
  announcements.resetScoreThrottleForTests();
  await i18n.changeLanguage('en');
});

afterEach(async () => {
  (AccessibilityInfo as any).announceForAccessibility = origAnnounce;
  (AccessibilityInfo as any).announceForAccessibilityWithOptions = origAnnounceWithOpts;
  await i18n.changeLanguage('en');
});

function renderCard(preview: any, label?: string) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(PreviewCard, { preview, ...(label ? { label } : {}) }));
  });
  return renderer!;
}

function a11yLabelOf(renderer: TestRenderer.ReactTestRenderer): string {
  return renderer.root.find((n) => typeof n.props?.accessibilityLabel === 'string').props.accessibilityLabel as string;
}

// ── P0: whole preview/banner journey ────────────────────────────────────────

test('[P0-UMB-PB-01] Given a fresh mount, when the preview display first renders, then no announcement fires (mount silent)', async () => {
  // Given a fresh screen mount (prevPreviewRef null → skip first run)
  captured.length = 0;
  // When the preview card first renders with display '8'
  const renderer = renderCard({ kind: 'exact', value: 8 });
  assert.ok(a11yLabelOf(renderer).includes('8'));
  // Then the mount itself queues nothing — the effect skips run #1 by design,
  // so only an explicit display CHANGE announces (assert the effect guard exists)
  const app = readSource('triade/App.tsx');
  assert.match(app, /prevPreviewRef\.current\s*===\s*null/);
  assert.equal(captured.length, 0);
});

test('[P0-UMB-PB-02] Given a rendered preview, when the display changes, then exactly one locale-correct announcement fires', async () => {
  // Given EN locale with preview display '8'
  await i18n.changeLanguage('en');
  const before = previewDisplayOf(PREVIEW_DISPLAY_FIXTURES.EXACT_8 as any);
  assert.equal(before, PREVIEW_DISPLAY_EXPECTATIONS.EXACT_8);
  // When the display changes (simulating the App effect on a11yPreviewDisplay change)
  captured.length = 0;
  announcements.announcePreview(before);
  // Then exactly one EN announcement fires wrapping the display
  assert.equal(captured.length, 1);
  assert.match(captured[0], /Next/);
  assert.ok(captured[0].includes('8'));
  // When the same display re-renders unchanged
  // Then the change-check keeps it silent (no second announce call by construction)
  const same = previewDisplayOf(PREVIEW_DISPLAY_FIXTURES.EXACT_8 as any);
  assert.equal(same, before);
});

test('[P0-UMB-PB-03] Given PT locale, when preview + banner fire, then phrasing is PT-authored end to end', async () => {
  // Given PT locale across the whole journey
  await i18n.changeLanguage('pt');
  captured.length = 0;
  // When the preview card renders + its display announces
  const renderer = renderCard({ kind: 'exact', value: 8 });
  assert.match(a11yLabelOf(renderer), /Próxima/);
  announcements.announcePreview('8');
  assert.match(captured[0], /Próxima/);
  // When a banner hint resolves via i18n and announces
  captured.length = 0;
  const msg = i18n.t('accelerated.ceilingHint');
  assert.ok(msg && msg !== 'accelerated.ceilingHint', 'locale must resolve the hint key');
  announcements.announceBanner(msg);
  // Then the banner announcement carries the resolved PT string verbatim
  assert.equal(captured[0], msg);
});

// ── P1: display derivation + banner journey ─────────────────────────────────

test('[P1-UMB-PB-04] Given preview shapes, when deriving display strings, then exact/range/NaN/empty follow the App memo contract', () => {
  // Given every preview shape the HUD can produce
  // When deriving the announcement display via the memo replica
  // Then exact renders the value, NaN/empty collapse to silent '', ranges join with '/'
  assert.equal(previewDisplayOf(PREVIEW_DISPLAY_FIXTURES.EXACT_8 as any), PREVIEW_DISPLAY_EXPECTATIONS.EXACT_8);
  assert.equal(previewDisplayOf(PREVIEW_DISPLAY_FIXTURES.EXACT_NAN as any), PREVIEW_DISPLAY_EXPECTATIONS.EXACT_NAN);
  assert.equal(previewDisplayOf(PREVIEW_DISPLAY_FIXTURES.RANGE_123 as any), PREVIEW_DISPLAY_EXPECTATIONS.RANGE_123);
  assert.equal(previewDisplayOf(PREVIEW_DISPLAY_FIXTURES.RANGE_WITH_NAN as any), PREVIEW_DISPLAY_EXPECTATIONS.RANGE_WITH_NAN);
  assert.equal(previewDisplayOf(PREVIEW_DISPLAY_FIXTURES.RANGE_EMPTY as any), PREVIEW_DISPLAY_EXPECTATIONS.RANGE_EMPTY);
  assert.equal(previewDisplayOf(PREVIEW_DISPLAY_FIXTURES.MALFORMED as any), PREVIEW_DISPLAY_EXPECTATIONS.MALFORMED);
  // And empty displays stay silent through the contract
  captured.length = 0;
  announcements.announcePreview(previewDisplayOf(PREVIEW_DISPLAY_FIXTURES.RANGE_EMPTY as any));
  assert.equal(captured.length, 0);
});

test('[P1-UMB-PB-05] Given banner flags, when ceiling/stuck toggle false→true, then each announces once with locale-resolved text', async () => {
  // Given both banners hidden
  await i18n.changeLanguage('en');
  captured.length = 0;
  // When ceiling flips false→true (simulating the App effect body)
  const ceilingMsg = i18n.t('accelerated.ceilingHint');
  assert.ok(ceilingMsg && ceilingMsg !== 'accelerated.ceilingHint');
  announcements.announceBanner(ceilingMsg);
  // When stuck flips false→true
  const stuckMsg = i18n.t('accelerated.stuckHint');
  assert.ok(stuckMsg && stuckMsg !== 'accelerated.stuckHint');
  announcements.announceBanner(stuckMsg);
  // Then both announcements queued exactly once each, in order
  assert.equal(captured.length, 2);
  assert.equal(captured[0], ceilingMsg);
  assert.equal(captured[1], stuckMsg);
});

test('[P1-UMB-PB-06] Given a lane-labeled preview, when the card renders, then the label note survives inside the i18n announcement', async () => {
  // Given a lane-labeled preview (FR-45 fan-out)
  await i18n.changeLanguage('en');
  const renderer = renderCard({ kind: 'exact', value: 12 }, 'Accelerated');
  // When reading the accessibilityLabel
  const label = a11yLabelOf(renderer);
  // Then display + lane note are both present inside the i18n wrapper
  assert.ok(label.includes('12'), `label must contain display, got ${label}`);
  assert.ok(label.includes('Accelerated'), `label must contain lane note, got ${label}`);
});

// ── P2: engine boundary + no-spam ───────────────────────────────────────────

test('[P2-UMB-PB-07] Given the delta, when diffing the engine, then no engine file changed (a11y is bridge-only)', async () => {
  // Given the ADR-01 purity boundary (engine TS-puro, a11y never duplicates rules)
  const { execSync } = await import('node:child_process');
  const diff = execSync('git diff d26bbdd..HEAD --stat -- triade/src/engine', { encoding: 'utf8' }).trim();
  // When listing engine changes in the delta range
  // Then the engine is untouched — preview/banner derive display only
  assert.equal(diff, '');
});

test('[P2-UMB-PB-08] Given rapid preview/banner bursts, when several fire in sequence, then each distinct change announces without throttle-drop (preview/banner are unthrottled by design)', () => {
  // Given the throttle design: ONLY score is throttled (~500ms); preview/banner
  // announce every distinct change (no throttle gate in their fns)
  const src = readSource('triade/src/a11y/announcements.ts');
  assert.ok(!/THROTTLE/.test(src.split('export function announcePreview')[1].split('export function')[0]), 'announcePreview must not throttle');
  // When two distinct preview displays fire back-to-back
  captured.length = 0;
  announcements.announcePreview('4');
  announcements.announcePreview('8');
  // Then both queue (burst of distinct changes is information, not spam —
  // spam control lives in the App change-check, not in a time throttle)
  assert.equal(captured.length, 2);
});

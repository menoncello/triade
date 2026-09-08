/**
 * API Gateway — 9-2 Screen Reader Contract, preview/banner wiring delta (9c33e33)
 * Host node:test + tsx. ACTIVE tests (no test.skip — implementation landed).
 * Run from repo root:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json NODE_PATH=triade/node_modules \
 *     triade/node_modules/.bin/tsx --test "_bmad-output/test-artifacts/tests/api/9-2-screen-reader-contract.preview-banner.gateway.spec.ts"
 * Levels: API here = announcement contract surface (announcePreview/announceBanner
 * + i18n a11y.preview/accelerated.*Hint + App wiring static pins). No endpoints,
 * no page.goto — RN AccessibilityInfo bridge per test-levels-framework host adaptation.
 * Spec: _bmad-output/implementation-artifacts/spec-9-2-screen-reader-contract.md
 * Fixtures: _bmad-output/test-artifacts/fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { i18n } from '../../../../triade/src/i18n/index.ts';
import { AccessibilityInfo } from 'react-native';
import * as announcements from '../../../../triade/src/a11y/announcements.ts';
import {
  readSource,
  BANNER_TRANSITION_FIXTURES,
  bannerTransitions,
} from '../../fixtures/9-2-screen-reader-contract.preview-banner.fixtures.ts';

const APP = 'triade/App.tsx';
const CARD = 'triade/src/ui/PreviewCard.tsx';
const ANN = 'triade/src/a11y/announcements.ts';
const EN_PATH = 'triade/src/i18n/locales/en.json';
const PT_PATH = 'triade/src/i18n/locales/pt.json';

// ── Announcement capture ────────────────────────────────────────────────────
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

// ── P0: announcement contract surface ───────────────────────────────────────

test('[P0-API-PB-01] Given announcePreview, when EN locale, then message uses Next + display', async () => {
  // Given the central contract announcePreview(display)
  await i18n.changeLanguage('en');
  captured.length = 0;
  // When a preview display changes to '8'
  announcements.announcePreview('8');
  // Then exactly one queued message wraps the display
  assert.equal(captured.length, 1);
  assert.match(captured[0], /Next/);
  assert.ok(captured[0].includes('8'));
});

test('[P0-API-PB-02] Given announcePreview, when PT locale, then message uses Próxima + display', async () => {
  // Given PT locale (mirrors contract PT pattern for gameOver/merge)
  await i18n.changeLanguage('pt');
  captured.length = 0;
  // When a preview display changes
  announcements.announcePreview('8');
  // Then the queued message is PT-authored via a11y.preview
  assert.equal(captured.length, 1);
  assert.match(captured[0], /Próxima/);
  assert.ok(captured[0].includes('8'));
});

test('[P0-API-PB-03] Given empty preview display, when announcePreview fires, then it stays silent', () => {
  // Given an empty display string (malformed preview / cleared value)
  captured.length = 0;
  // When announcePreview('') fires
  announcements.announcePreview('');
  // Then nothing is queued (empty early-return guard)
  assert.equal(captured.length, 0);
});

test('[P0-API-PB-04] Given announceBanner, when text present, then it passes through verbatim; empty stays silent', () => {
  // Given a resolved banner hint string
  captured.length = 0;
  // When announceBanner fires with text
  announcements.announceBanner('Ceiling open');
  // Then it passes through verbatim (banner strings are i18n-resolved at call-site)
  assert.deepEqual(captured, ['Ceiling open']);
  // When fired with empty text
  announcements.announceBanner('');
  // Then nothing further is queued
  assert.equal(captured.length, 1);
});

test('[P0-API-PB-05] Given both locales, when reading a11y.preview, then en+pt keys exist with {{display}}', () => {
  // Given the P0 i18n surface for the delta
  const en = JSON.parse(readFileSync(EN_PATH, 'utf8'));
  const pt = JSON.parse(readFileSync(PT_PATH, 'utf8'));
  // When resolving a11y.preview in each locale
  // Then both exist and interpolate {{display}} (closes TD R-D3 key-coverage gap)
  assert.ok(en?.a11y?.preview, 'en must have a11y.preview');
  assert.ok(pt?.a11y?.preview, 'pt must have a11y.preview');
  assert.ok(String(en.a11y.preview).includes('{{display}}'), 'en preview must interpolate {{display}}');
  assert.ok(String(pt.a11y.preview).includes('{{display}}'), 'pt preview must interpolate {{display}}');
});

test('[P0-API-PB-06] Given App banner wiring, when transitions occur, then only false→true announces (mount silent)', () => {
  // Given the banner transition matrix from fixtures
  // When each (prev, next) pair is evaluated
  for (const fix of BANNER_TRANSITION_FIXTURES) {
    const got = bannerTransitions(fix.prev, fix.next);
    // Then the decision matches the expected announce/silent outcome
    assert.equal(got.ceiling, fix.expectCeiling, `${fix.name}: ceiling`);
    assert.equal(got.stuck, fix.expectStuck, `${fix.name}: stuck`);
  }
});

// ── P1: wiring pins (regression net over the review patches) ────────────────

test('[P1-API-PB-07] Given App.tsx, when reading the preview effect, then it skips first mount and announces only on display change', () => {
  // Given the App preview effect (9c33e33 + review symmetry patch)
  const src = readSource(APP);
  // When inspecting the effect guards
  // Then the ref inits null, mount skips, and announce fires only on real change
  assert.match(src, /prevPreviewRef\.current\s*===\s*null/);
  assert.match(src, /prevPreviewRef\.current\s*!==\s*a11yPreviewDisplay/);
  assert.match(src, /announcePreview\(a11yPreviewDisplay\)/);
});

test('[P1-API-PB-08] Given App.tsx, when reading the banner effect, then it skips first mount, gates false→true, and guards empty/raw-key strings', () => {
  // Given the App banner effect (review patches: null-init symmetry + msg guard)
  const src = readSource(APP);
  // When inspecting mount silence
  // Then the banner ref inits null and skips the first run like preview
  assert.match(src, /prevBannerRef\.current\s*===\s*null/);
  // When inspecting transition gating
  // Then only false→true transitions announce
  assert.match(src, /showCeilingBanner && !prev\.ceiling/);
  assert.match(src, /showStuckBanner && !prev\.stuck/);
  // When inspecting locale safety
  // Then each hint guards empty/raw-key before announcing
  assert.match(src, /msg && msg !== 'accelerated\.ceilingHint'/);
  assert.match(src, /msg && msg !== 'accelerated\.stuckHint'/);
});

test('[P1-API-PB-09] Given PreviewCard, when composing accessibilityLabel, then it is i18n-authored with EN fallback and text role', () => {
  // Given PreviewCard label composition (was hard-coded PT before 9c33e33)
  const src = readSource(CARD);
  // When inspecting the label path
  // Then it uses i18n a11y.preview (never hard-coded), keeps an EN fallback,
  // feeds accessibilityLabel, and stays role text
  assert.match(src, /i18n\.t\('a11y\.preview'/);
  assert.match(src, /accessibilityLabel=\{announcement\}/);
  assert.match(src, /accessibilityRole="text"/);
  assert.ok(src.includes('Next'), 'EN fallback must exist');
});

// ── P2: contract-file durability ────────────────────────────────────────────

test('[P2-API-PB-10] Given the contract follow-up, when reading the preview-banner red scaffolds, then P1-D1..D4 pins are durably tracked', () => {
  // Given the P1 contract-extension follow-up is still open (contract file itself
  // does not yet pin a11y.preview/prevPreviewRef/prevBannerRef — ATDD P1-D1..D4 RED)
  // When reading the preview-banner red scaffold that tracks the follow-up
  // Then the pins are durably scaffolded there (no silent drop of the gap)
  const src = readSource('_bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts');
  assert.match(src, /a11y\.preview/);
  assert.match(src, /announcePreview/);
  assert.match(src, /announceBanner/);
  assert.match(src, /prevPreviewRef/);
  assert.match(src, /prevBannerRef/);
});

test('[P2-API-PB-11] Given announcements.ts, when reading preview/banner fns, then empty guards exist and preview stays i18n-wrapped', () => {
  // Given the central contract module
  const src = readSource(ANN);
  // When inspecting the preview/banner surface
  // Then both fns exist, both guard empty, preview resolves via i18n (no raw display leak)
  assert.match(src, /export function announcePreview/);
  assert.match(src, /export function announceBanner/);
  assert.match(src, /if\s*\(!display\)\s*return/);
  assert.match(src, /if\s*\(!text\)\s*return/);
  assert.match(src, /i18n\.t\('a11y\.preview'/);
});

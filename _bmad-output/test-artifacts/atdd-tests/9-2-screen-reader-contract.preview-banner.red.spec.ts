import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// ATDD RED PHASE SCAFFOLD — Story 9-2 Screen Reader Contract, preview/banner wiring delta
// Generated: 2026-09-07 | TEA (Murat — Master Test Architect) | bmad-testarch-atdd follow-up
// Delta under test: d26bbdd..HEAD (9c33e33 + 770cc39) —
//   triade/App.tsx (+51: a11yPreviewDisplay memo + prevPreviewRef/prevBannerRef skip-first-mount
//     + announcePreview on display change + announceBanner on ceiling/stuck false→true with
//     msg && msg !== key guards),
//   triade/src/ui/PreviewCard.tsx (+10/-5: accessibilityLabel i18n-authored via a11y.preview
//     with try/catch EN fallback), spec bookkeeping only.
// Standing gate (not re-scaffolded): triade/__tests__/a11y/screenReader.contract.test.tsx (15 P0,
// green 2026-09-07: full npm test 1051 pass / 0 fail / 460 skipped) + 2026-09-02 red spec
// (atdd-tests/9-2-screen-reader-contract.red.spec.ts, 14 skipped scaffolds) +
// targeted TD test-design-9-2-screen-reader-contract-td-20260907.md (R-D1..R-D6, P1-D1..D4).
//
// All tests below are `test.skip()` — they assert EXPECTED behavior and stay skipped until
// the developer activates ONE task at a time:
//   1. remove `test.skip` for the current task,
//   2. run `npm test` in triade/ (or node --test on this file from repo root with tsx),
//   3. confirm RED (fails before the P1 extension) then GREEN (passes after).
// RED/ GREEN status of each scaffold against the CURRENT tree was verified at generation
// time (see atdd-checklist-9-2-screen-reader-contract.preview-banner.md, Execution Evidence).

const CONTRACT = fileURLToPath(
  new URL('../../../triade/__tests__/a11y/screenReader.contract.test.tsx', import.meta.url),
);
const APP = fileURLToPath(new URL('../../../triade/App.tsx', import.meta.url));
const PREVIEW_CARD = fileURLToPath(
  new URL('../../../triade/src/ui/PreviewCard.tsx', import.meta.url),
);
const ANN = fileURLToPath(new URL('../../../triade/src/a11y/announcements.ts', import.meta.url));
const EN = fileURLToPath(new URL('../../../triade/src/i18n/locales/en.json', import.meta.url));
const PT = fileURLToPath(new URL('../../../triade/src/i18n/locales/pt.json', import.meta.url));

// ── P1: close the a11y.preview key-coverage gap (TD R-D3) ────────────────────

test.skip('[P1-D1] AC preview/banner — contract pins a11y.preview key existence in en+pt', async () => {
  // Given the P0 i18n key-existence guard (contract :267) lists a11y.moved/merged/spawn/…
  // When the preview/banner delta ships a11y.preview into PreviewCard + announcePreview
  // Then the guard list includes a11y.preview for en AND pt (durable pin against locale edits
  // dropping the key — announcePreview has no msg !== key guard, unlike the banner call-site).
  const src = await readFile(CONTRACT, 'utf8');
  assert.match(src, /a11y\.preview/, 'contract must pin the a11y.preview key (R-D3)');
  const en = JSON.parse(await readFile(EN, 'utf8'));
  const pt = JSON.parse(await readFile(PT, 'utf8'));
  assert.ok(en?.a11y?.preview, 'en must have a11y.preview');
  assert.ok(pt?.a11y?.preview, 'pt must have a11y.preview');
  assert.ok(String(en.a11y.preview).includes('{{display}}'), 'en preview must interpolate {{display}}');
  assert.ok(String(pt.a11y.preview).includes('{{display}}'), 'pt preview must interpolate {{display}}');
  // Expected failure before fix (VERIFIED RED 2026-09-07): contract has no a11y.preview
  // literal → first assertion fails. After fix: extend the :267 key list with 'a11y.preview'.
});

test.skip('[P1-D2] AC preview/banner — PT announcePreview phrasing uses Próxima + display', async () => {
  // Given announcePreview(display) interpolates i18n a11y.preview in the active locale
  // When locale is pt and announcePreview('8') fires
  // Then the queued message matches /Próxima/ and contains '8' (mirrors the existing PT
  // gameOver/merge test pattern at contract :178-187).
  const src = await readFile(CONTRACT, 'utf8');
  assert.match(src, /Próxima/, 'contract must assert PT preview phrasing (R-D3)');
  // Live behaviour (after activation) additionally asserts:
  //   await i18n.changeLanguage('pt'); captured.length = 0;
  //   announcements.announcePreview('8');
  //   assert.match(captured[0], /Próxima/); assert.ok(captured[0].includes('8'));
  //   await i18n.changeLanguage('en');
  // Expected failure before fix (VERIFIED RED 2026-09-07): no Próxima literal in contract.
});

// ── P1: pin the App preview/banner wiring in the App-gate (TD R-D4) ─────────

test.skip('[P1-D3] AC preview/banner — App-gate pins announcePreview|announceBanner + skip-first-mount refs', async () => {
  // Given the [P0] App gesture gate test (contract :231-240) asserts
  // announceMove|announceMerge|announceSpawn|announceGameOver + screenReaderEnabledRef
  // When the preview/banner effects land in App.tsx (a11yPreviewDisplay memo +
  // prevPreviewRef/prevBannerRef init null → skip first run)
  // Then the gate also asserts announcePreview|announceBanner and the null-init skip pattern,
  // so a future refactor removing the effects turns red.
  const src = await readFile(CONTRACT, 'utf8');
  assert.match(
    src,
    /announcePreview\|announceBanner|announcePreview.*announceBanner/,
    'App-gate must reference announcePreview + announceBanner (R-D4)',
  );
  assert.match(src, /prevPreviewRef/, 'App-gate must pin prevPreviewRef (R-D1/R-D4)');
  assert.match(src, /prevBannerRef/, 'App-gate must pin prevBannerRef (R-D2/R-D4)');
  // Expected failure before fix (VERIFIED RED 2026-09-07): gate regex has only
  // move|merge|spawn|gameOver and no prev*Ref literals → assertions fail.
});

test.skip('[P1-D4] AC preview/banner — preview change-check invariant (same display silent, changed announces once)', async () => {
  // Given the preview effect guards `prevPreviewRef.current !== a11yPreviewDisplay
  // && a11yPreviewDisplay` (bounds R-D1 chattiness: board-driven pot changes only
  // announce when the display string actually changes)
  // When the display is unchanged across renders
  // Then announcePreview is NOT called; when it changes, it is called exactly once.
  const app = await readFile(APP, 'utf8');
  assert.match(
    app,
    /prevPreviewRef\.current\s*!==\s*a11yPreviewDisplay/,
    'effect must compare prev display before announcing (R-D1)',
  );
  assert.match(app, /prevPreviewRef\.current\s*===\s*null/, 'first mount must skip (null init)');
  const src = await readFile(CONTRACT, 'utf8');
  assert.match(
    src,
    /prevPreviewRef\.current !== a11yPreviewDisplay|change-check|same display/,
    'contract must document/pin the change-check invariant (R-D1)',
  );
  // Expected failure before fix (VERIFIED RED 2026-09-07): contract has no change-check
  // literal → third assertion fails (App-side invariant itself is already implemented).
});

// ── Gate pins: implementation already landed, kept as regression net ────────
// The two scaffolds below PASS when activated against the current tree (VERIFIED
// GREEN 2026-09-07). They are included so the P1 follow-up cannot regress the
// review patches (banner skip-first-mount symmetry, empty/raw-key guard) or the
// PreviewCard i18n label while editing the contract file.

test.skip('[GATE] AC preview/banner — PreviewCard accessibilityLabel i18n-authored with EN fallback', async () => {
  // Given PreviewCard({preview, label}) with engine-derived display string
  // When the accessibilityLabel is composed
  // Then it uses i18n.t('a11y.preview', {display}) (never hard-coded PT/EN) with a
  // try/catch EN fallback (`Next…`), preserving the lane note `display (label)`.
  const src = await readFile(PREVIEW_CARD, 'utf8');
  assert.match(src, /i18n\.t\('a11y\.preview'/, 'label must be i18n-authored via a11y.preview');
  assert.match(src, /try\s*\{/, 'must try/catch the i18n lookup');
  assert.match(src, /Next/, 'EN fallback must exist');
  assert.match(src, /accessibilityLabel=\{announcement\}/, 'label must feed accessibilityLabel');
  assert.match(src, /accessibilityRole="text"/, 'role stays text');
  // Status against current tree: GREEN (implementation landed in 9c33e33).
});

test.skip('[GATE] AC preview/banner — banner effects skip first mount and guard empty/raw-key strings', async () => {
  // Given showCeilingBanner/showStuckBanner derived booleans
  // When the banner effect runs on mount (prev null) or with an empty/missing locale string
  // Then mount is silent (null-init skip, symmetric with preview) and only false→true
  // transitions announce, each guarded by `msg && msg !== key`.
  const src = await readFile(APP, 'utf8');
  assert.match(src, /prevBannerRef\.current\s*===\s*null/, 'banner ref must init null (mount silent)');
  assert.match(
    src,
    /showCeilingBanner && !prev\.ceiling|showStuckBanner && !prev\.stuck/,
    'must announce only on false→true transitions',
  );
  assert.match(
    src,
    /msg && msg !== 'accelerated\.ceilingHint'|msg !== 'accelerated\.ceilingHint'/,
    'ceiling hint must guard empty/raw-key',
  );
  assert.match(
    src,
    /msg && msg !== 'accelerated\.stuckHint'|msg !== 'accelerated\.stuckHint'/,
    'stuck hint must guard empty/raw-key',
  );
  const ann = await readFile(ANN, 'utf8');
  assert.match(ann, /if\s*\(!text\)\s*return/, 'announceBanner keeps the empty early-return');
  // Status against current tree: GREEN (review patches landed in 9c33e33).
});

// ── summary ─────────────────────────────────────────────────────────────────
// E2E (0 — N/A): RN AccessibilityInfo bridge, no browser DOM; playwright-cli skipped per TD.
// API (0 — N/A): no endpoints in delta (git diff d26bbdd..HEAD -- triade/src/engine empty).
// P3 device ear-check (manual, operator-owned, NOT scaffolded): iOS VoiceOver + Android
// TalkBack preview/banner audibility, mount silence, no spam — see checklist + spec
// operator_actions. Row 9-2-screen-reader-contract in sprint-status.yaml is orchestrator
// bookkeeping — never edited here.
// Activation: remove `test.skip` for ONE task, run from repo root:
//   node --import tsx --test _bmad-output/test-artifacts/atdd-tests/9-2-screen-reader-contract.preview-banner.red.spec.ts
// or in triade/: npm test -- <path>. Confirm RED (P1-D1..D4 fail) then GREEN (after fix).

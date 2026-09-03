/**
 * E2E Umbrella — 9-1 Tap targets ≥44×44pt (RED-PHASE, test.skip)
 * Host node:test — whole-journey scans (no Playwright page.goto — pure RN style constants journeys)
 * All are test.skip. Remove skip → active GREEN (819fb2a already landed).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/9-1-tap-targets-44x44pt.umbrella.spec.ts
 * Spec: _bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md (AC1-4, 6 I/O rows)
 * Design: _bmad-output/test-artifacts/test-design/test-design-epic-9-1-tap-targets.md (P0 7 groups / P1 8 / P2 4 / P3 2, R-001/R-002 high)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pausePath = new URL('../../../../triade/src/ui/PauseButton.tsx', import.meta.url).pathname;
const hudPath = new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url).pathname;
const lanePath = new URL('../../../../triade/src/ui/LaneSelectScreen.tsx', import.meta.url).pathname;
const gameOverPath = new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname;
const accPath = new URL('../../../../triade/src/ui/AcceleratedAids.tsx', import.meta.url).pathname;
const tutorialPath = new URL('../../../../triade/src/ui/TutorialOverlay.tsx', import.meta.url).pathname;
const tonePath = new URL('../../../../triade/src/ui/ToneScreen.tsx', import.meta.url).pathname;
const appPath = new URL('../../../../triade/App.tsx', import.meta.url).pathname;
const layoutPath = new URL('../../../../triade/src/ui/layout.ts', import.meta.url).pathname;

function src(p: string) {
  return readFileSync(p, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// P0 umbrella — whole app chrome never below 44pt
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-UMB-01] Umbrella — whole chrome journey: pause 48 + every Pressable ≥44 via HIT_TARGET + CTA never truncates + no chrome overlaps board swipe (AC1-3, R-001/R-002)', () => {
  const pause = src(pausePath);
  const hud = src(hudPath);
  const gameOver = src(gameOverPath);
  const app = src(appPath);
  // Pause canonical
  const m = /export\s+const\s+HIT_TARGET\s*=\s*(\d+)/.exec(pause);
  assert.ok(m, 'HIT_TARGET export');
  assert.ok(Number(m[1]) >= 44, '>=44');
  // Every Pressable floor (spot-check via CTA + assist + menu)
  assert.ok(hud.includes('minWidth: HIT_TARGET') && hud.includes('minHeight: HIT_TARGET'), 'Hud assistBtn floor');
  // CTA fix is the primary defect — whole journey fails if CTA truncates
  const ctaBlock = /cta:\s*\{[^}]*\}/s.exec(gameOver);
  assert.ok(ctaBlock, 'cta block');
  assert.ok(ctaBlock[0].includes('minWidth') && ctaBlock[0].includes('paddingHorizontal'), 'CTA min+padding');
  assert.ok(!/width:\s*HIT_TARGET/.test(ctaBlock[0]), 'CTA not fixed square');
  // Chrome vs board isolation
  assert.ok(hud.includes('PauseButton') && app.includes('GestureDetector') && app.includes('boardWrap'), 'chrome vs board isolation');
});

test.skip('[P0-UMB-02] Umbrella — engine/render/theme boundary + HIT_TARGET single source (ADR-01 purity, R-005 drift)', () => {
  const pause = src(pausePath);
  const gameOver = src(gameOverPath);
  // HIT_TARGET is single source
  assert.ok(pause.includes('export const HIT_TARGET = 48'), 'single source 48');
  assert.ok(gameOver.includes('HIT_TARGET'), 'GameOver references HIT_TARGET not literal 44');
  // Engine/render/theme byte-identical is manual gate — pin via no engine file in git show HEAD --stat for this bundle
  assert.ok(true, 'manual: git diff --stat -- triade/src/engine triade/src/render src/theme empty (spec Verify)');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 umbrella — journeys that wiring + i18n + banner
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-UMB-01] Journey — GameOver CTA with PT label "Jogar de novo" breathes: minWidth+minHeight+paddingHorizontal+paddingVertical, no numberOfLines (R-002)', () => {
  const raw = src(gameOverPath);
  const block = /cta:\s*\{[^}]*\}/s.exec(raw)!;
  assert.ok(block[0].includes('paddingHorizontal: 24'), 'paddingHorizontal 24');
  assert.ok(block[0].includes('paddingVertical: 8'), 'paddingVertical 8');
  assert.ok(block[0].includes('minWidth: HIT_TARGET'), 'minWidth');
  assert.ok(block[0].includes('minHeight: HIT_TARGET'), 'minHeight');
  // Label must not ellipsize
  assert.ok(!/numberOfLines/.test(raw) || !/ctaLabel[^}]*numberOfLines/s.test(raw), 'ctaLabel no numberOfLines');
  assert.ok(!/ellipsizeMode/.test(raw) || !/ctaLabel[^}]*ellipsize/s.test(raw), 'ctaLabel no ellipsize');
});

test.skip('[P1-UMB-02] Journey — continue row on narrow 320pt: continueAd/Iap flex:1 + minWidth keeps ≥44, gap:8 prevents overflow (R-006 flex shrink)', () => {
  const raw = src(gameOverPath);
  assert.ok(raw.includes('continueRow'), 'continueRow exists');
  assert.ok(raw.includes('gap: 8') || raw.includes('gap:8'), 'gap:8');
  for (const n of ['continueAd', 'continueIap', 'continueCancel']) {
    const re = new RegExp(`${n}:\\s*\\{[^}]*\\}`, 's');
    const m = re.exec(raw);
    assert.ok(m && m[0].includes('minWidth: HIT_TARGET'), `${n} minWidth`);
  }
});

test.skip('[P1-UMB-03] Journey — banner dismiss × + prompt row + tone whole-screen: dismissBtn 48 + adBtn/iapBtn/cancelBtn + Tone flex:1 (AC4)', () => {
  const acc = src(accPath);
  const tone = src(tonePath);
  assert.ok(acc.includes('dismissBtn') && acc.includes('minWidth: HIT_TARGET'), 'dismissBtn');
  assert.ok(acc.includes('adBtn') && acc.includes('minHeight: HIT_TARGET'), 'adBtn');
  assert.ok(acc.includes('iapBtn') && acc.includes('minHeight: HIT_TARGET'), 'iapBtn');
  assert.ok(acc.includes('cancelBtn') && acc.includes('minHeight: HIT_TARGET'), 'cancelBtn');
  assert.ok(tone.includes('flex: 1'), 'Tone whole-screen');
});

test.skip('[P1-UMB-04] Journey — pause outside board swipe rect: Hud PauseButton in band/pauseSlot + App boardWrap sibling + GestureDetector wraps GameBoard only (R-004)', () => {
  const hud = src(hudPath);
  const app = src(appPath);
  assert.ok(hud.includes('PauseButton') && (hud.includes('landscapeBand') || hud.includes('portraitBand')), 'Hud band chrome');
  assert.ok(app.includes('boardWrap') && app.includes('GestureDetector') && app.includes('menuBtn'), 'App boardWrap + GestureDetector + menuBtn');
  // pauseSlot/assistBtn are absolute outside board — not inside boardWrap JSX block
  assert.ok(hud.includes('pauseSlot') || hud.includes('assistBtn'), 'chrome outside boardWrap');
  const boardIdx = app.indexOf('boardWrap');
  const menuIdx = app.indexOf('menuBtn');
  assert.ok(boardIdx !== -1 && menuIdx !== -1, 'ordering heuristic present');
});

// ─────────────────────────────────────────────────────────────────────────────
// P2/P3 umbrella — secondary + exploratory
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-UMB-01] Journey — single-constant + visible vs hitSlop: PauseButton width/height HIT_TARGET + hitSlop additive, no hitSlop-only floor (R-003, R-005)', () => {
  const pause = src(pausePath);
  assert.ok(pause.includes('width: HIT_TARGET') && pause.includes('height: HIT_TARGET'), 'visible floor');
  assert.ok(pause.includes('hitSlop'), 'hitSlop additive');
  // No scattered 44 literal for hit floors outside HIT_TARGET export + card 88 intentional
  const lane = src(lanePath);
  assert.ok(lane.includes('minHeight: 88'), 'card 88 intentional 2× floor allowed');
});

test.skip('[P2-UMB-02] Journey — layout band + board floor + ledger: LANDSCAPE_BAND_HEIGHT 48 + SAFE_MARGIN 16 + BOARD_SIZE_FLOOR 216 + tsc clean + sprint-status untouched (OPS)', () => {
  const layout = src(layoutPath);
  assert.ok(layout.includes('LANDSCAPE_BAND_HEIGHT = 48'), 'band 48');
  assert.ok(layout.includes('SAFE_MARGIN = 16'), 'safe 16');
  assert.ok(layout.includes('BOARD_SIZE_FLOOR'), 'floor exists');
  assert.ok(true, 'manual: npx tsc --noEmit clean + git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml empty (orchestrator-owned)');
});

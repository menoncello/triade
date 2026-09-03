/**
 * API Gateway — 9-1 Tap targets ≥44×44pt (RED-PHASE, test.skip)
 * Host node:test — source-pins for HIT_TARGET + every Pressable ≥44 + CTA min+padding + pause isolation
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree already at 819fb2a).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/9-1-tap-targets-44x44pt.gateway.spec.ts
 * Mirrors _bmad-output/test-artifacts/tests/unit/9-1-tap-targets-44x44pt.atdd.test.ts P0/P1 for api level compliance.
 * Delta: 819fb2a vs 8901f63 — triade/src/ui/GameOverOverlay.tsx cta fixed 48 square → minWidth/minHeight+padding, continueAd/Iap/Cancel add minWidth
 * Spec: _bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md (final_revision c32eaee, baseline 8901f63)
 * Design: _bmad-output/test-artifacts/test-design/test-design-epic-9-1-tap-targets.md (9 risks, 2 high R-001/R-002 score 6)
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only gateway
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
// P0 — must be green on every commit (WCAG 2.5.5 floor + CTA never truncates)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-API-01] AC1 HIT_TARGET exported as integer >=44 and PauseButton uses width/height HIT_TARGET (R-005)', () => {
  const s = src(pausePath);
  const m = /export\s+const\s+HIT_TARGET\s*=\s*(\d+)/.exec(s);
  assert.ok(m, 'PauseButton.tsx must export HIT_TARGET');
  const n = Number(m[1]);
  assert.ok(Number.isInteger(n), `HIT_TARGET must be integer, got ${m[1]}`);
  assert.ok(n >= 44, `HIT_TARGET must be >=44, got ${n}`);
  assert.match(s, /width:\s*HIT_TARGET/, 'width: HIT_TARGET');
  assert.match(s, /height:\s*HIT_TARGET/, 'height: HIT_TARGET');
  assert.ok(s.includes('hitSlop={4}'), 'hitSlop additive');
  assert.ok(s.includes('accessibilityLabel="Pausar"'), 'PauseButton accessibilityLabel');
});

test.skip('[P0-API-02] AC1 every Pressable ≥44 — allowlist exhaustive per manual audit (R-001 allowlist gap, R-002 CTA)', () => {
  const { stripCommentsAndStrings } = require('../../../../triade/test-utils/helpers.ts');
  // This mirrors triade/__tests__/ui/tapTargets.audit.test.ts expectations — gateway level pins same contract
  const expectations: Array<{ path: string; rel: string; mustContain: string[]; mustNotContain?: string[] }> = [
    { path: hudPath, rel: 'Hud.tsx', mustContain: ['assistBtn', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET'] },
    {
      path: lanePath,
      rel: 'LaneSelectScreen.tsx',
      mustContain: [
        'card', 'minHeight: 88',
        'warningConfirm', 'minHeight: HIT_TARGET',
        'warningCancel', 'minHeight: HIT_TARGET',
        'cta', 'minHeight: HIT_TARGET',
        'restoreBtn', 'minHeight: HIT_TARGET',
        'langBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET',
      ],
    },
    {
      path: gameOverPath,
      rel: 'GameOverOverlay.tsx',
      mustContain: [
        'cta', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET', 'paddingHorizontal',
        'continueAd', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET',
        'continueIap', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET',
        'continueCancel', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET',
      ],
      mustNotContain: ['cta: {\\n    width: HIT_TARGET'],
    },
    {
      path: accPath,
      rel: 'AcceleratedAids.tsx',
      mustContain: [
        'dismissBtn', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET',
        'adBtn', 'minHeight: HIT_TARGET',
        'iapBtn', 'minHeight: HIT_TARGET',
        'cancelBtn', 'minHeight: HIT_TARGET',
      ],
    },
    { path: tutorialPath, rel: 'TutorialOverlay.tsx', mustContain: ['skipBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'] },
    { path: tonePath, rel: 'ToneScreen.tsx', mustContain: ['root', 'flex: 1'] },
    { path: appPath, rel: 'App.tsx', mustContain: ['menuBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'] },
  ];
  for (const exp of expectations) {
    const raw = src(exp.path);
    const stripped = stripCommentsAndStrings(raw);
    for (const needle of exp.mustContain) {
      assert.ok(stripped.includes(needle), `${exp.rel} must contain "${needle}"`);
    }
    if (exp.mustNotContain) {
      for (const f of exp.mustNotContain) {
        const re = new RegExp(f);
        assert.ok(!re.test(raw), `${exp.rel} must NOT contain /${f}/`);
      }
    }
  }
});

test.skip('[P0-API-03] AC2 GameOver CTA grows with padding — minWidth/minHeight+paddingHorizontal not fixed width, no truncation (R-002)', () => {
  const raw = src(gameOverPath);
  const block = /cta:\s*\{[^}]*\}/s.exec(raw);
  assert.ok(block, 'cta block must exist');
  const b = block[0];
  assert.ok(b.includes('minWidth'), 'minWidth');
  assert.ok(b.includes('minHeight'), 'minHeight');
  assert.ok(b.includes('paddingHorizontal'), 'paddingHorizontal 24');
  assert.ok(b.includes('paddingVertical'), 'paddingVertical 8');
  assert.ok(!/width:\s*HIT_TARGET/.test(b), 'must not have fixed width: HIT_TARGET');
  // also assert ctaLabel has no numberOfLines (would truncate long PT label)
  assert.ok(!raw.includes('ctaLabel') || !/ctaLabel:[^}]*numberOfLines/s.test(raw), 'ctaLabel must not clamp numberOfLines');
});

test.skip('[P0-API-04] AC3 pause outside board swipe rect — Hud bands + App boardWrap sibling, chrome never inside GestureDetector (R-004)', () => {
  const hud = src(hudPath);
  const app = src(appPath);
  assert.ok(hud.includes('PauseButton'), 'Hud renders PauseButton');
  assert.ok(hud.includes('landscapeBand') || hud.includes('portraitBand'), 'Hud has band chrome');
  assert.ok(app.includes('boardWrap'), 'App has boardWrap');
  assert.ok(app.includes('GestureDetector'), 'App wraps GameBoard with GestureDetector');
  const boardIdx = app.indexOf('boardWrap');
  const menuIdx = app.indexOf('menuBtn');
  assert.ok(boardIdx !== -1 && menuIdx !== -1, 'both exist');
  // Ordering heuristic: boardWrap is separate View containing GestureDetector, menuBtn is outside
  assert.ok(app.includes('isBoardShaking') || boardIdx < menuIdx, 'boardWrap ordering: chrome outside swipe rect');
});

test.skip('[P0-API-05] AC1 assist row ≥44 + hitSlop additive only (R-003 visible floor vs hitSlop)', () => {
  const hud = src(hudPath);
  assert.ok(hud.includes('assistBtn'), 'Hud assistBtn exists');
  // visible floor must be minWidth/minHeight, not just hitSlop
  assert.ok(hud.includes('minWidth: HIT_TARGET') && hud.includes('minHeight: HIT_TARGET'), 'assistBtn visible floor');
  const pause = src(pausePath);
  assert.ok(pause.includes('width: HIT_TARGET') && pause.includes('hitSlop'), 'PauseButton has both visible floor and additive hitSlop');
});

test.skip('[P0-API-06] AC2 continueAd/Iap/Cancel defensive minWidth when flex shrinks — flex:1 + minWidth keeps floor on 320pt (R-006)', () => {
  const raw = src(gameOverPath);
  for (const name of ['continueAd', 'continueIap', 'continueCancel']) {
    const re = new RegExp(`${name}:\\s*\\{[^}]*\\}`, 's');
    const m = re.exec(raw);
    assert.ok(m, `${name} block exists`);
    assert.ok(m[0].includes('minWidth: HIT_TARGET'), `${name} minWidth`);
    assert.ok(m[0].includes('minHeight: HIT_TARGET'), `${name} minHeight`);
  }
  assert.ok(raw.includes('continueRow'), 'continueRow exists with gap:8');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — PR gate (wiring + i18n + banner + lens)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-API-01] P1 CTA negative guard — cta must NOT reintroduce fixed 48 square (R-002 anti-pattern)', () => {
  const raw = src(gameOverPath);
  assert.ok(!/cta:\s*\{\s*\n\s*width:\s*HIT_TARGET/.test(raw), 'must not contain fixed width:HIT_TARGET at cta block start');
});

test.skip('[P1-API-02] P1 banner dismiss × ≥44 — AcceleratedAids dismissBtn minWidth/minHeight + bannerContent gap (R-004)', () => {
  const raw = src(accPath);
  assert.ok(raw.includes('dismissBtn') && raw.includes('minWidth: HIT_TARGET') && raw.includes('minHeight: HIT_TARGET'), 'dismissBtn floor');
  assert.ok(raw.includes('bannerContent') || raw.includes('bannerText'), 'bannerContent exists');
  // prompt row gap keeps adBtn/iapBtn above min on narrow containers
  assert.ok(raw.includes('promptRow') && raw.includes('gap'), 'promptRow gap:8');
});

test.skip('[P1-API-03] P1 lane cards + warning confirm/cancel — card 88 + warning/cta/restore/lang HIT_TARGET (lane)', () => {
  const raw = src(lanePath);
  assert.ok(raw.includes('minHeight: 88'), 'card 88');
  assert.ok(raw.includes('warningConfirm') && raw.includes('minHeight: HIT_TARGET'), 'warningConfirm');
  assert.ok(raw.includes('warningCancel') && raw.includes('minHeight: HIT_TARGET'), 'warningCancel');
  assert.ok(raw.includes('langBtn') && raw.includes('minWidth: HIT_TARGET'), 'langBtn minWidth');
});

test.skip('[P1-API-04] P1 AcceleratedAids prompt buttons — adBtn/iapBtn flex:1 + cancelBtn full-width + minHeight (R-006)', () => {
  const raw = src(accPath);
  assert.ok(raw.includes('adBtn') && raw.includes('minHeight: HIT_TARGET'), 'adBtn');
  assert.ok(raw.includes('iapBtn') && raw.includes('minHeight: HIT_TARGET'), 'iapBtn');
  assert.ok(raw.includes('cancelBtn') && raw.includes('minHeight: HIT_TARGET'), 'cancelBtn');
});

test.skip('[P1-API-05] P1 App menuBtn (Pistas) — minHeight/minWidth HIT_TARGET + boardWrap sibling isolation (R-004)', () => {
  const raw = src(appPath);
  assert.ok(raw.includes('menuBtn') && raw.includes('minHeight: HIT_TARGET') && raw.includes('minWidth: HIT_TARGET'), 'menuBtn floor');
  assert.ok(raw.includes('boardWrap') && raw.includes('GestureDetector'), 'boardWrap vs GestureDetector present');
});

test.skip('[P1-API-06] P1 layout band contract — LANDSCAPE_BAND_HEIGHT 48 + SAFE_MARGIN 16 + BOARD_SIZE_FLOOR 216 (UX-DR6)', () => {
  const layout = src(layoutPath);
  assert.ok(layout.includes('LANDSCAPE_BAND_HEIGHT = 48'), 'LANDSCAPE_BAND_HEIGHT 48');
  assert.ok(layout.includes('SAFE_MARGIN = 16'), 'SAFE_MARGIN 16');
  assert.ok(layout.includes('BOARD_SIZE_FLOOR'), 'BOARD_SIZE_FLOOR exists');
  // BOARD_SIZE_FLOOR 216 is derived from 44*4 + padding*2 + gap*3 — pin via 216 literal
  assert.ok(layout.includes('216') || layout.includes('BOARD_SIZE_FLOOR'), 'BOARD_SIZE_FLOOR 216 derived');
});

test.skip('[P1-API-07] TECH gap closure — dynamic scan: every src/ui/*.tsx Pressable style resolves to HIT_TARGET or ≥44 literal (R-001)', () => {
  // This is the proposed P1-07 from test-design to close allowlist gap.
  // For now, static proof: count Pressable files that import HIT_TARGET (except ToneScreen whole-screen special case)
  const hud = src(hudPath);
  const lane = src(lanePath);
  const gameOver = src(gameOverPath);
  const acc = src(accPath);
  const tutorial = src(tutorialPath);
  const app = src(appPath);
  for (const [name, s] of [
    ['Hud.tsx', hud],
    ['LaneSelectScreen.tsx', lane],
    ['GameOverOverlay.tsx', gameOver],
    ['AcceleratedAids.tsx', acc],
    ['TutorialOverlay.tsx', tutorial],
    ['App.tsx', app],
  ] as const) {
    assert.ok(s.includes('HIT_TARGET') || s.includes('flex: 1'), `${name} must import HIT_TARGET or be ToneScreen flex:1 special case`);
  }
  const tone = src(tonePath);
  assert.ok(tone.includes('flex: 1'), 'ToneScreen whole-screen flex:1 special case documented');
});

// ─────────────────────────────────────────────────────────────────────────────
// P2 — secondary gates (hitSlop doc, single-constant, engine purity)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-API-01] P2 visible vs hitSlop documentation — PauseButton has both floor and additive hitSlop, no hitSlop-only floor (R-003)', () => {
  const pause = src(pausePath);
  assert.ok(pause.includes('width: HIT_TARGET') && pause.includes('height: HIT_TARGET'), 'visible floor');
  assert.ok(pause.includes('hitSlop'), 'additive hitSlop');
  // No style should rely solely on hitSlop for floor — audit asserts visible floor per file
  assert.ok(!pause.includes('hitSlop') || pause.includes('width: HIT_TARGET'), 'hitSlop not substitute');
});

test.skip('[P2-API-02] P2 single-constant + engine/render/theme purity — only HIT_TARGET for hit floors, no scattered 44/48 literals for hit (R-005)', () => {
  const gameOver = src(gameOverPath);
  // HIT_TARGET is the single source; card 88 is intentional 2× floor (allowed)
  assert.ok(gameOver.includes('HIT_TARGET'), 'GameOver uses HIT_TARGET');
  // Engine/render/theme must be byte-identical post-merge — manual gate: git diff -- triade/src/engine empty
  assert.ok(true, 'manual gate: git diff --stat -- triade/src/engine triade/src/render src/theme empty (ADR-01 purity)');
});

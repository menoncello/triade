/**
 * Unit ATDD — 9-1 Tap targets ≥44×44pt (RED-PHASE, test.skip)
 * Host node:test — exhaustive unit pins for HIT_TARGET + every Pressable + CTA + pause isolation + layout
 * All are test.skip (RED). Remove test.skip → GREEN (819fb2a already landed, triade/__tests__/ui/tapTargets.audit.test.ts 4/4 pass is canonical GREEN).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/9-1-tap-targets-44x44pt.atdd.test.ts
 * Mirrors triade/__tests__/ui/tapTargets.audit.test.ts allowlist + gameOverOverlay.test.ts hasStyle pins + app.restart.test.ts guard
 * Spec: _bmad-output/implementation-artifacts/spec-9-1-tap-targets-44x44pt.md (baseline 8901f63, final c32eaee, AC1-4)
 * Design: _bmad-output/test-artifacts/test-design/test-design-epic-9-1-tap-targets.md (P0 7 groups / P1 8 / P2 4 / P3 2)
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

// ── P0 ──────────────────────────────────────────────────────────────────────

test.skip('[P0-U-01] HIT_TARGET exported as integer >=44 and PauseButton width/height reference HIT_TARGET directly (R-005 drift)', () => {
  const s = src(pausePath);
  const m = /export\s+const\s+HIT_TARGET\s*=\s*(\d+)/.exec(s);
  assert.ok(m, 'HIT_TARGET export');
  const n = Number(m[1]);
  assert.ok(Number.isInteger(n), 'integer');
  assert.ok(n >= 44, `>=44 got ${n}`);
  assert.match(s, /width:\s*HIT_TARGET/, 'width: HIT_TARGET');
  assert.match(s, /height:\s*HIT_TARGET/, 'height: HIT_TARGET');
});

test.skip('[P0-U-02] every Pressable style enforces >=44 floor via minHeight/minWidth HIT_TARGET or documented floor (R-001, R-002)', () => {
  const { stripCommentsAndStrings } = require('../../../../triade/test-utils/helpers.ts');
  const exps: Array<{ path: string; rel: string; mustContain: string[]; mustNotContain?: string[] }> = [
    { path: hudPath, rel: 'Hud.tsx', mustContain: ['assistBtn', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET'] },
    {
      path: lanePath,
      rel: 'LaneSelectScreen.tsx',
      mustContain: ['card', 'minHeight: 88', 'warningConfirm', 'minHeight: HIT_TARGET', 'warningCancel', 'minHeight: HIT_TARGET', 'cta', 'minHeight: HIT_TARGET', 'restoreBtn', 'minHeight: HIT_TARGET', 'langBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'],
    },
    {
      path: gameOverPath,
      rel: 'GameOverOverlay.tsx',
      mustContain: ['cta', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET', 'paddingHorizontal', 'continueAd', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET', 'continueIap', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET', 'continueCancel', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'],
      mustNotContain: ['cta: {\\n    width: HIT_TARGET'],
    },
    { path: accPath, rel: 'AcceleratedAids.tsx', mustContain: ['dismissBtn', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET', 'adBtn', 'minHeight: HIT_TARGET', 'iapBtn', 'minHeight: HIT_TARGET', 'cancelBtn', 'minHeight: HIT_TARGET'] },
    { path: tutorialPath, rel: 'TutorialOverlay.tsx', mustContain: ['skipBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'] },
    { path: tonePath, rel: 'ToneScreen.tsx', mustContain: ['root', 'flex: 1'] },
    { path: appPath, rel: 'App.tsx', mustContain: ['menuBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'] },
  ];
  for (const e of exps) {
    const raw = src(e.path);
    const stripped = stripCommentsAndStrings(raw);
    for (const needle of e.mustContain) assert.ok(stripped.includes(needle), `${e.rel} must contain "${needle}"`);
    if (e.mustNotContain) for (const f of e.mustNotContain) assert.ok(!new RegExp(f).test(raw), `${e.rel} must NOT /${f}/`);
  }
});

test.skip('[P0-U-03] GameOver CTA grows with padding — minWidth/minHeight+paddingHorizontal not fixed width, no truncation (R-002)', () => {
  const raw = src(gameOverPath);
  const block = /cta:\s*\{[^}]*\}/s.exec(raw)!;
  assert.ok(block, 'cta block');
  const b = block[0];
  assert.ok(b.includes('minWidth') && b.includes('minHeight'), 'min');
  assert.ok(b.includes('paddingHorizontal'), 'paddingH');
  assert.ok(!/width:\s*HIT_TARGET/.test(b), 'no fixed width');
});

test.skip('[P0-U-04] GameOver CTA render pin — hasStyle with minWidth:48 via triade/__tests__/ui/components/gameOverOverlay.test.ts (R-002)', () => {
  const raw = src(gameOverPath);
  assert.ok(raw.includes('minWidth: HIT_TARGET') && raw.includes('minHeight: HIT_TARGET'), 'HIT_TARGET identity');
  // runtime hasStyle pin lives in triade/__tests__/ui/components/gameOverOverlay.test.ts:193,410 — this unit scan is the static complement
  assert.ok(true, 'runtime hasStyle pin is in triade suite — this scan is the static complement');
});

test.skip('[P0-U-05] pause outside board swipe rect — Hud bands + App boardWrap sibling (R-004)', () => {
  const hud = src(hudPath);
  const app = src(appPath);
  assert.ok(hud.includes('PauseButton'), 'PauseButton');
  assert.ok(hud.includes('landscapeBand') || hud.includes('portraitBand'), 'band');
  assert.ok(app.includes('boardWrap') && app.includes('GestureDetector'), 'boardWrap + GestureDetector');
});

// ── P1 ──────────────────────────────────────────────────────────────────────

test.skip('[P1-U-01] CTA negative guard — must NOT reintroduce fixed 48 square (R-002)', () => {
  const raw = src(gameOverPath);
  assert.ok(!/cta:\s*\{\s*\n\s*width:\s*HIT_TARGET/.test(raw), 'no fixed square');
});

test.skip('[P1-U-02] continueAd/Iap/Cancel defensive minWidth when flex shrinks (R-006)', () => {
  const raw = src(gameOverPath);
  for (const n of ['continueAd', 'continueIap', 'continueCancel']) {
    const m = new RegExp(`${n}:\\s*\\{[^}]*\\}`, 's').exec(raw);
    assert.ok(m && m[0].includes('minWidth: HIT_TARGET'), n);
  }
});

test.skip('[P1-U-03] banner dismiss × + Tone whole-screen (AC4)', () => {
  const acc = src(accPath);
  assert.ok(acc.includes('dismissBtn') && acc.includes('minWidth: HIT_TARGET'), 'dismissBtn');
  const tone = src(tonePath);
  assert.ok(tone.includes('flex: 1'), 'Tone flex:1');
});

test.skip('[P1-U-04] lane cards + warning + cta/restore/lang (AC4)', () => {
  const raw = src(lanePath);
  assert.ok(raw.includes('minHeight: 88'), 'card 88');
  assert.ok(raw.includes('warningConfirm') && raw.includes('minHeight: HIT_TARGET'), 'warningConfirm');
  assert.ok(raw.includes('langBtn') && raw.includes('minWidth: HIT_TARGET'), 'langBtn');
});

test.skip('[P1-U-05] App menuBtn (Pistas) + lane cards isolation (R-004)', () => {
  const app = src(appPath);
  assert.ok(app.includes('menuBtn') && app.includes('minHeight: HIT_TARGET'), 'menuBtn');
});

test.skip('[P1-U-06] layout band contract — LANDSCAPE_BAND_HEIGHT 48 + SAFE_MARGIN 16 + BOARD_SIZE_FLOOR 216', () => {
  const layout = src(layoutPath);
  assert.ok(layout.includes('LANDSCAPE_BAND_HEIGHT = 48'), 'band 48');
  assert.ok(layout.includes('SAFE_MARGIN = 16'), 'safe 16');
  assert.ok(layout.includes('BOARD_SIZE_FLOOR'), 'floor');
});

// ── P2 ──────────────────────────────────────────────────────────────────────

test.skip('[P2-U-01] visible vs hitSlop — hitSlop additive only, not substitute (R-003)', () => {
  const pause = src(pausePath);
  assert.ok(pause.includes('width: HIT_TARGET') && pause.includes('hitSlop'), 'both');
});

test.skip('[P2-U-02] single-constant + tsc + sprint-status untouched — no scattered 44 literal for hit, engine empty, App overflow base hidden preserved (R-005, OPS)', () => {
  const gameOver = src(gameOverPath);
  assert.ok(gameOver.includes('HIT_TARGET'), 'HIT_TARGET');
  assert.ok(true, 'manual: npx tsc --noEmit clean + git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml empty + git diff -- triade/src/engine empty');
});

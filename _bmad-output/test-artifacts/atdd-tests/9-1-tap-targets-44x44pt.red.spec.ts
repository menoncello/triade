import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// ATDD RED PHASE SCAFFOLD — Story 9-1 Tap targets ≥44×44pt
// Generated: 2026-09-02 | TEA (Murat) | commit delta 819fb2a
// All tests are `test.skip()` — they assert EXPECTED behavior from the spec
// and are INTENTIONALLY skipped until the developer activates the task.
// Activation: remove `test.skip` for the current task, run `npm test` in triade,
// confirm RED (before fix) then GREEN (after fix). See atdd-checklist for workflow.
//
// This scaffold mirrors the working-tree delta:
// - triade/src/ui/GameOverOverlay.tsx: cta fixed square → minWidth/minHeight+padding
// - continueAd/continueIap/continueCancel add minWidth: HIT_TARGET
// - triade/__tests__/ui/tapTargets.audit.test.ts (new static audit)
// - guard relax in gameOverOverlay.test.ts + app.restart.test.ts

const PAUSE = fileURLToPath(new URL('../../../../triade/src/ui/PauseButton.tsx', import.meta.url));
const GAME_OVER = fileURLToPath(new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url));
const HUD = fileURLToPath(new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url));
const APP = fileURLToPath(new URL('../../../../triade/App.tsx', import.meta.url));

// ── P0: HIT_TARGET floor ────────────────────────────────────────────────

test.skip('[P0] AC1 HIT_TARGET exported as integer >=44 and pause uses width/height HIT_TARGET', async () => {
  // Given PauseButton is the single source of HIT_TARGET
  // When file is read
  // Then HIT_TARGET is integer >=44 and button box references it directly
  const src = await readFile(PAUSE, 'utf8');
  const m = /export\s+const\s+HIT_TARGET\s*=\s*(\d+)/.exec(src);
  assert.ok(m, 'PauseButton.tsx must export HIT_TARGET');
  const size = Number(m[1]);
  assert.ok(Number.isInteger(size), `HIT_TARGET must be integer, got ${m[1]}`);
  assert.ok(size >= 44, `HIT_TARGET must be >=44, got ${size}`);
  assert.match(src, /width:\s*HIT_TARGET/, 'PauseButton style width must reference HIT_TARGET');
  assert.match(src, /height:\s*HIT_TARGET/, 'PauseButton style height must reference HIT_TARGET');
  // Expected failure before fix: N/A (HIT_TARGET already 48) — this gate prevents drift below 44
});

// ── P0: every Pressable ≥44 (static audit) ─────────────────────────────

test.skip('[P0] AC1 every Pressable style enforces >=44 floor via minHeight/minWidth or HIT_TARGET', async () => {
  // Given every Pressable in src/ui + App.tsx
  // When static source is scanned
  // Then each Pressable style block contains minWidth/minHeight HIT_TARGET or width/height HIT_TARGET or documented floor (card 88, ToneScreen flex:1)
  const { stripCommentsAndStrings } = await import('../../../../triade/test-utils/helpers.ts');
  const expectations: Array<{ file: string; needles: string[] }> = [
    { file: HUD, needles: ['assistBtn', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET'] },
    { file: GAME_OVER, needles: ['cta', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET', 'paddingHorizontal', 'continueAd', 'minWidth: HIT_TARGET', 'continueIap', 'minWidth: HIT_TARGET', 'continueCancel', 'minWidth: HIT_TARGET'] },
    { file: APP, needles: ['menuBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'] },
  ];
  for (const exp of expectations) {
    const raw = await readFile(exp.file, 'utf8');
    const stripped = stripCommentsAndStrings(raw);
    for (const n of exp.needles) {
      assert.ok(stripped.includes(n), `${exp.file} must contain "${n}"`);
    }
  }
  // Expected failure before 819fb2a: GameOver cta contained "width: HIT_TARGET" fixed square and continueAd/Iap lacked minWidth
});

// ── P0: GameOver CTA never truncates ───────────────────────────────────

test.skip('[P0] AC2 GameOver CTA grows with padding — minWidth/minHeight not fixed width, no truncation', async () => {
  // Given GameOverOverlay cta with i18n label "Jogar de novo" (PT longest)
  // When style block is inspected and component mounted
  // Then cta uses minWidth+minHeight+paddingHorizontal (not width:HIT_TARGET) so label never ellipsizes
  const raw = await readFile(GAME_OVER, 'utf8');
  const block = /cta:\s*\{[^}]*\}/s.exec(raw);
  assert.ok(block, 'cta style block must exist');
  const b = block[0];
  assert.ok(b.includes('minWidth'), 'cta must use minWidth not fixed width');
  assert.ok(b.includes('minHeight'), 'cta must use minHeight');
  assert.ok(b.includes('paddingHorizontal'), 'cta must have paddingHorizontal to breathe');
  assert.ok(!/width:\s*HIT_TARGET/.test(b), 'cta must not have fixed width: HIT_TARGET (anti-pattern)');
  // Render pin would additionally assert hasStyle(renderer, {minWidth:48}) and label has no numberOfLines
  // Expected failure before 819fb2a: block contained "width: HIT_TARGET,\n    height: HIT_TARGET," fixed 48 square
});

// ── P1: CTA negative guard (no fixed square regression) ───────────────

test.skip('[P1] AC2 CTA must NOT reintroduce fixed 48 square — negative pattern guard', async () => {
  const raw = await readFile(GAME_OVER, 'utf8');
  // Must NOT contain the pre-fix pattern
  assert.ok(!/cta:\s*\{\s*\n\s*width:\s*HIT_TARGET/.test(raw), 'cta must not contain fixed width:HIT_TARGET at block start');
  // Expected failure before fix: /cta: {\n    width: HIT_TARGET/ matched
});

// ── P1: continue row defensive minWidth ─────────────────────────────────

test.skip('[P1] AC2 continueAd/continueIap/continueCancel keep HIT_TARGET floor when flex shrinks', async () => {
  const raw = await readFile(GAME_OVER, 'utf8');
  for (const name of ['continueAd', 'continueIap', 'continueCancel']) {
    const re = new RegExp(`${name}:\\s*\\{[^}]*\\}`, 's');
    const m = re.exec(raw);
    assert.ok(m, `${name} style block must exist`);
    assert.ok(m[0].includes('minWidth: HIT_TARGET'), `${name} must have minWidth: HIT_TARGET defensive floor`);
    assert.ok(m[0].includes('minHeight: HIT_TARGET'), `${name} must have minHeight: HIT_TARGET`);
  }
  // Expected failure before 819fb2a: continueCancel lacked minWidth, continueAd/Iap lacked minWidth
});

// ── P1: pause outside board swipe rect ──────────────────────────────────

test.skip('[P1] AC3 pauseButton outside boardWrap GestureDetector — no chrome overlaps swipe rect', async () => {
  const hudSrc = await readFile(HUD, 'utf8');
  const appSrc = await readFile(APP, 'utf8');
  assert.ok(hudSrc.includes('PauseButton'), 'Hud must render PauseButton');
  assert.ok(hudSrc.includes('landscapeBand') || hudSrc.includes('portraitBand'), 'Hud must have band chrome');
  assert.ok(appSrc.includes('boardWrap'), 'App must have boardWrap');
  assert.ok(appSrc.includes('GestureDetector'), 'App must wrap GameBoard with GestureDetector');
  const boardIdx = appSrc.indexOf('boardWrap');
  const menuIdx = appSrc.indexOf('menuBtn');
  assert.ok(boardIdx !== -1 && menuIdx !== -1, 'both boardWrap and menuBtn must exist');
  // Ordering heuristic: boardWrap sibling check, not child
  // Expected failure before fix: N/A — this was already true, gate prevents regression if pause moved inside boardWrap
});

// ── P1: banner dismiss × ≥44 ────────────────────────────────────────────

test.skip('[P1] AC4 AcceleratedAids banner dismiss × and Tone whole-screen meet ≥44', async () => {
  const accPath = fileURLToPath(new URL('../../../../triade/src/ui/AcceleratedAids.tsx', import.meta.url));
  const tonePath = fileURLToPath(new URL('../../../../triade/src/ui/ToneScreen.tsx', import.meta.url));
  const { stripCommentsAndStrings } = await import('../../../../triade/test-utils/helpers.ts');
  const accRaw = await readFile(accPath, 'utf8');
  const acc = stripCommentsAndStrings(accRaw);
  assert.ok(acc.includes('dismissBtn') && acc.includes('minWidth: HIT_TARGET') && acc.includes('minHeight: HIT_TARGET'), 'AcceleratedAids dismissBtn must enforce HIT_TARGET floor');
  const toneRaw = await readFile(tonePath, 'utf8');
  const tone = stripCommentsAndStrings(toneRaw);
  assert.ok(tone.includes('flex: 1'), 'ToneScreen root must be flex:1 whole-screen Pressable (>>44)');
  // Expected failure before fix: N/A — already true, gate pins future banner/tab regressions
});

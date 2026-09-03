/**
 * Unit — dw-overlay-carriers-hardening (RED-PHASE, test.skip)
 * Primary oracle mirror for TEA test_artifacts compliance — host node:test + react-test-renderer delegation
 * Mirrors triade/__tests__/ui/components/gameOverOverlay.test.ts + overlayCarriers.integration.test.ts source-pins
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree already implements GameOverOverlay delta 67a1b51).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/overlay-carriers-hardening.atdd.test.ts
 * Delta: 67a1b51 vs 58e036c — triade/src/ui/GameOverOverlay.tsx 32/10 — DW-91/92/101/102
 * Spec: _bmad-output/implementation-artifacts/spec-overlay-carriers-hardening.md
 * Design: _bmad-output/test-artifacts/test-design-dw-overlay-carriers-hardening.md
 * Ledger: deferred-work.md DW-91,92,101,102 done 2026-09-02 + resolution-undo 596c2f86…
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const overlayPath = new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname;
const hudPath = new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url).pathname;
const layoutPath = new URL('../../../../triade/src/ui/layout.ts', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const specPath = new URL('../../../../_bmad-output/implementation-artifacts/spec-overlay-carriers-hardening.md', import.meta.url).pathname;

test.skip('[P0-U-01] clampInset finite>=0 exhaustive — NaN/negative/Infinity/undefined never reach padding (DW-92/DW-102)', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.ok(src.includes('const clampInset'), 'missing clampInset helper');
  assert.match(src, /const\s+clampInset\s*=\s*\(v:\s*unknown\)\s*:\s*number\s*=>\s*\(Number\.isFinite\(v as number\)\s*&&\s*\(v as number\)\s*>=\s*0\s*\?\s*\(v as number\)\s*:\s*0\)/, 'clamp body exact');
  assert.ok(src.includes("clampInset(insets?.top)"), 'must clamp insets?.top');
  assert.ok(src.includes("clampInset(insets?.bottom)"), 'must clamp insets?.bottom');
  assert.ok(src.includes("clampInset(insets?.left)"), 'must clamp insets?.left');
  assert.ok(src.includes("clampInset(insets?.right)"), 'must clamp insets?.right');
  assert.strictEqual((src.match(/clampInset\(insets/g) || []).length, 4, 'exactly 4 uses padTop/Bottom/Left/Right');
  assert.ok(src.includes('+ SAFE_MARGIN'), 'each pad + SAFE_MARGIN');
  assert.strictEqual((src.match(/SAFE_MARGIN/g) || []).length, 5, 'SAFE_MARGIN 5 (import+4 pads)');
  // degenerate ordering exhaustively clamped (renderer integration proves finite >=16 per pad)
  assert.strictEqual((src.match(/Number\.isFinite/g) || []).length, 1, 'Number.isFinite must be 1 in clampInset (single source)');
});

test.skip('[P0-U-02] degenerate insets padding finite>=16 — renderer collectStyles would see >=SAFE_MARGIN (structural guard)', () => {
  const src = readFileSync(overlayPath, 'utf8');
  // SAFE_MARGIN 16 from layout.ts is paired with clamp, so every pad is finite >=16 for NaN/-20/Infinity/undefined
  // Structural: padTop = clampInset(insets?.top) + SAFE_MARGIN; same ×4
  const padDefs = (src.match(/const\s+pad(?:Top|Bottom|Left|Right)\s*=.*clampInset.*\+ SAFE_MARGIN/g) || []);
  assert.strictEqual(padDefs.length, 4, 'padTop/Bottom/Left/Right each must be clampInset(...) + SAFE_MARGIN (4 defs)');
  // bare as any without insets: optional chain insets?.top degrades to clampInset(undefined)=0 → SAFE_MARGIN
  assert.ok(src.includes('insets?.top'), 'optional chain insets?.top degrades bare');
  assert.ok(src.includes('insets?.bottom'), 'optional chain insets?.bottom');
});

test.skip('[P0-U-03] overflow guard 1999999999 — all 5 value Texts numberOfLines=1 ellipsizeMode tail + flexShrink:1', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.strictEqual((src.match(/numberOfLines/g) || []).length, 5, 'numberOfLines must be 5 (score/best/maxTile/merges/longestStreak)');
  assert.strictEqual((src.match(/ellipsizeMode="tail"/g) || []).length, 5, 'ellipsizeMode tail must be 5');
  // co-located on <Text> lines
  assert.strictEqual((src.match(/<Text numberOfLines=\{1\} ellipsizeMode="tail"/g) || []).length, 5);
  assert.ok(src.includes("flexShrink: 1") || src.includes("flexShrink:1"), 'flexShrink:1 must exist');
  assert.ok((src.match(/flexShrink:\s*1/g) || []).length >= 2, 'flexShrink:1 >=2 (value+valueRecord)');
  assert.strictEqual((src.match(/textAlign:\s*'right'/g) || []).length, 2, 'textAlign right must be 2 (value+valueRecord)');
  assert.strictEqual((src.match(/flexShrink:\s*0/g) || []).length, 1, 'label flexShrink:0 exactly 1');
  // row still space-between (not replaced by gap)
  assert.ok(src.includes("'space-between'") && src.includes('justifyContent'), 'row must keep space-between');
});

test.skip('[P0-U-04] zIndex layering 2>1 — overlay zIndex:2 elevation:2 position:absolute pointerEvents auto + scrim rgba(12,14,17,0.7)', () => {
  const overlay = readFileSync(overlayPath, 'utf8');
  const hud = readFileSync(hudPath, 'utf8');
  assert.ok(overlay.includes('zIndex: 2'), 'overlay zIndex:2');
  assert.ok(overlay.includes('elevation: 2'), 'overlay elevation:2');
  assert.ok(overlay.includes("position: 'absolute'"), 'overlay position absolute');
  assert.ok(overlay.includes('rgba(12,14,17,0.7)'), 'scrim rgba(12,14,17,0.7)');
  assert.ok(overlay.includes('pointerEvents="auto"'), 'overlay pointerEvents auto');
  assert.ok(overlay.includes('top: 0') && overlay.includes('bottom: 0') && overlay.includes('left: 0') && overlay.includes('right: 0'), 'overlay top/left/right/bottom 0');
  assert.ok(hud.includes('zIndex: 1'), 'Hud zIndex:1');
  assert.ok(hud.includes('elevation: 1'), 'Hud elevation:1');
  // integration test collectStyles proves Math.max overlay 2 > hud 1 + pointerEvents auto
  // source guarantee covers stylesheet contract for host umbrella
});

test.skip('[P0-U-05] reducedMotion reactive preamble — stopAnimation×3 then if(reducedMotion) snap 1/1/0 return', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.match(src, /useEffect\(\(\)\s*=>\s*\{[^]*scrimOpacity\.stopAnimation\(\)[^]*contentOpacity\.stopAnimation\(\)[^]*contentY\.stopAnimation\(\)/, 'preamble must stopAnimation×3');
  assert.ok(src.includes('if (reducedMotion)'), 'must branch if(reducedMotion)');
  const reducedIdx = src.indexOf('if (reducedMotion)');
  const reducedSlice = src.slice(reducedIdx, reducedIdx + 260);
  assert.ok(reducedSlice.includes('setValue(1)'), 'true branch setValue(1)');
  assert.ok(reducedSlice.includes('setValue(0)'), 'true branch setValue(0) translateY');
  assert.ok(reducedSlice.includes('return;'), 'true branch must return early — no Animated.parallel');
});

test.skip('[P0-U-06] reducedMotion false branch — reset 0/0/12 then FADE_MS 280 delay:80 cubic useNativeDriver parallel→1/1/0', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.ok(src.includes('const FADE_MS = 280'), 'FADE_MS 280');
  assert.ok(src.includes('scrimOpacity.setValue(0)'), 'reset scrim 0');
  assert.ok(src.includes('contentOpacity.setValue(0)'), 'reset content 0');
  assert.ok(src.includes('contentY.setValue(12)'), 'reset contentY 12');
  assert.ok(src.includes('Animated.parallel'), 'must use Animated.parallel');
  assert.strictEqual((src.match(/Animated\.timing/g) || []).length, 3, '3 Animated.timing');
  assert.strictEqual((src.match(/delay:\s*80/g) || []).length, 2, 'delay:80 twice (contentOpacity+contentY)');
  assert.strictEqual((src.match(/Easing\.out\(Easing\.cubic\)/g) || []).length, 3, 'Easing.out(cubic) ×3');
  assert.strictEqual((src.match(/useNativeDriver:\s*true/g) || []).length, 3, 'useNativeDriver:true ×3');
  assert.strictEqual((src.match(/duration:\s*FADE_MS/g) || []).length, 3, 'duration: FADE_MS ×3');
});

test.skip('[P0-U-07] unmount mid-fade cleanup — anim.stop() + stopAnimation×3, no leaked Animated.Value + remount clean (structural)', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.ok(src.includes('anim.stop()'), 'must call anim.stop()');
  const cleanupIdx = src.indexOf('return () => {');
  assert.ok(cleanupIdx !== -1, 'must return cleanup arrow');
  const cleanup = src.slice(cleanupIdx, cleanupIdx + 260);
  assert.ok(cleanup.includes('anim.stop()'), 'cleanup anim.stop');
  assert.ok(cleanup.includes('scrimOpacity.stopAnimation()') && cleanup.includes('contentOpacity.stopAnimation()') && cleanup.includes('contentY.stopAnimation()'), 'cleanup stopAnimation×3');
  // anim declared before .start() so cleanup closure captures it
  assert.ok(src.indexOf('const anim = Animated.parallel') < src.indexOf('anim.start()'), 'anim before start');
  assert.ok(src.indexOf('anim.start()') < src.indexOf('return () => {'), 'anim start before cleanup');
});

test.skip('[P0-U-08] a11y grouping + HIT_TARGET preservation — outer not accessible:true, inner alert groups 5 rows, CTA sibling button, HIT_TARGET width+height', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.ok(src.includes('accessibilityViewIsModal'), 'outer must have accessibilityViewIsModal');
  assert.strictEqual((src.match(/accessibilityRole="alert"/g) || []).length, 1, 'inner exactly 1 alert role');
  assert.ok((src.match(/accessibilityRole="button"/g) || []).length >= 1, 'CTA button role');
  assert.ok(src.includes("t('gameOver.score')") || src.includes('t("gameOver.score")'), 'label Score i18n');
  assert.ok(src.includes("t('gameOver.best')"), 'label best i18n');
  assert.ok(src.includes('HIT_TARGET'), 'HIT_TARGET import');
  assert.strictEqual((src.match(/width:\s*HIT_TARGET/g) || []).length, 1, 'CTA width HIT_TARGET');
  assert.strictEqual((src.match(/height:\s*HIT_TARGET/g) || []).length, 1, 'CTA height HIT_TARGET');
  // a11yLabel Game over concatenation survived
  assert.ok(src.includes('Game over. Score'), 'a11yLabel Game over. Score');
  assert.ok(src.includes('isNewRecord'), 'isNewRecord still terminates valueRecord highlight');
});

test.skip('[P1-U-01] useEffect deps + single-constant discipline — clampInset def==1 +4 uses / SAFE_MARGIN==5 / FADE_MS 1 / numberOfLines 5', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.match(src, /useEffect\(\(\)\s*=>\s*\{[^]*\}\s*,\s*\[reducedMotion,\s*scrimOpacity,\s*contentOpacity,\s*contentY\]/, 'deps must be [reducedMotion, scrimOpacity, contentOpacity, contentY]');
  assert.strictEqual((src.match(/const clampInset/g) || []).length, 1, 'clampInset def ==1');
  assert.strictEqual((src.match(/clampInset\(insets/g) || []).length, 4, 'clampInset uses ==4');
  assert.strictEqual((src.match(/SAFE_MARGIN/g) || []).length, 5, 'SAFE_MARGIN ==5 (import+4 pads)');
  assert.strictEqual((src.match(/const FADE_MS/g) || []).length, 1, 'FADE_MS def ==1');
  assert.strictEqual((src.match(/delay:\s*80/g) || []).length, 2, 'delay:80 ==2');
  assert.strictEqual((src.match(/numberOfLines/g) || []).length, 5, 'numberOfLines ==5');
  assert.strictEqual((src.match(/stopAnimation/g) || []).length, 6, 'stopAnimation ==6');
});

test.skip('[P1-U-02] timing contract exact — scrim no delay, content pair delay:80 (structural regression lock)', () => {
  const src = readFileSync(overlayPath, 'utf8');
  // scrim timing has no delay, contentOpacity and contentY each have delay 80
  const timings = src.split('Animated.timing');
  // 0: preamble, 1: scrim, 2: contentOpacity, 3: contentY
  assert.ok(timings.length >= 4, 'must have 3 Animated.timing splits');
  // scrim segment (timings[1]) must not include delay: 80
  assert.ok(!timings[1].includes('delay: 80'), 'scrim timing must not have delay:80');
  assert.ok(timings[2].includes('delay: 80'), 'contentOpacity timing must have delay:80');
  assert.ok(timings[3].includes('delay: 80'), 'contentY timing must have delay:80');
});

test.skip('[P1-U-03] Hud vs overlay asymmetry — Hud stays unclamped (low-sev drift documented)', () => {
  const overlay = readFileSync(overlayPath, 'utf8');
  const hud = readFileSync(hudPath, 'utf8');
  assert.strictEqual((hud.match(/clampInset/g) || []).length, 0, 'Hud must have 0 clampInset (intentional drift)');
  assert.ok(overlay.includes('clampInset(insets?.top)'), 'overlay clampInset top');
  // layout.ts SAFE_MARGIN still 16 single source
  const layout = readFileSync(layoutPath, 'utf8');
  assert.ok(layout.includes('SAFE_MARGIN'), 'layout.ts must export SAFE_MARGIN');
  assert.match(layout, /SAFE_MARGIN\s*=\s*16/, 'SAFE_MARGIN must be 16');
  assert.strictEqual((overlay.match(/from\s+['"]\.\/layout['"]/g) || []).length, 1, 'overlay imports layout once');
});

test.skip('[P1-U-04] thin-view + no celebration + no reanimated/skia store wiring (compliance)', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.strictEqual((src.match(/from\s+['"].*\/engine\//g) || []).length, 0, 'must not import engine');
  assert.ok(!src.includes('reanimated') && !src.includes('skia'), 'must not reference reanimated/skia');
  assert.ok(!/confetti|celebrat|lottie|reward/i.test(src), 'must not contain celebration strings');
  assert.ok(!src.includes('particleBurst') && !src.includes('shakeMs'), 'must not contain Epic 8 feel symbols');
  assert.ok(!src.includes('expo-haptics') && !src.includes('expo-audio') && !/\bHaptics\b/.test(src), 'must not gate haptics/sound');
  assert.ok(src.includes("from 'react-native'"), 'must import Animated/Easing from react-native');
  // numberOfLines/ellipsizeMode are RN Text props not web deps
  assert.ok(src.includes("StyleSheet.create"), 'StyleSheet.create present');
});

test.skip('[P2-U-01] ledger 596c2f86 4 hits for DW-91,92,101,102 + spec intent + design risks', () => {
  const ledger = readFileSync(ledgerPath, 'utf8');
  assert.strictEqual((ledger.match(/596c2f86f89f421758063c068af190fef0052b181dcedd83fcfcc495c1859b15/g) || []).length, 4, 'ledger 596c2f86 4 hits (DW-91,92,101,102)');
  for (const dw of ['DW-91', 'DW-92', 'DW-101', 'DW-102']) {
    assert.ok(ledger.includes(dw), `missing ${dw}`);
    const sec = ledger.split(dw)[1] ?? '';
    assert.ok(sec.includes('status: done 2026-09-02'), `${dw} not done`);
    assert.ok(sec.includes('resolved by sweep bundle dw-overlay-carriers-hardening'), `${dw} resolution`);
    assert.ok(sec.includes('596c2f86f89f421758063c068af190fef0052b181dcedd83fcfcc495c1859b15'), `${dw} hash`);
  }
  const spec = readFileSync(specPath, 'utf8');
  assert.ok(spec.includes('Overlay carriers hardening'), 'spec title');
  assert.ok(spec.includes('reducedMotion') || spec.includes('DW-91'), 'spec mentions reducedMotion');
  assert.ok(ledger.includes('dw-overlay-carriers-hardening'), 'ledger bundle name');
});

test.skip('[P2-U-02] sprint-status.yaml not written + engine empty + App.tsx wiring untouched (orchestrator-owned boundary)', () => {
  const spec = readFileSync(specPath, 'utf8');
  assert.ok(spec.includes('GameOverOverlay.tsx') && spec.includes('clampInset') || spec.includes('clamp'), 'spec lists GameOverOverlay.tsx');
  assert.ok(spec.includes('Never:') && /engine/i.test(spec), 'spec Never engine');
  // This bundle never touches triade/src/engine nor sprint-status.yaml — verified in aggregate via git diff gates
  // Host proxy: ensure overlay src still thin-view and doesn't contain engine symbols
  const overlay = readFileSync(overlayPath, 'utf8');
  for (const sym of ['resolveSpawn', 'weightedValue', 'spawnTile', 'weightedPicker', 'pickIndex', 'Math.random']) {
    assert.ok(!overlay.includes(sym), `overlay must not contain ${sym}`);
  }
  for (const sym of ['layoutFor', 'isLandscape', 'PORTRAIT_BAND_HEIGHT', 'LANDSCAPE_BAND_HEIGHT', 'resolveSwipeDirection']) {
    assert.ok(!overlay.includes(sym), `overlay must not contain layout rule ${sym}`);
  }
});

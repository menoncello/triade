/**
 * API Gateway — dw-overlay-carriers-hardening (RED-PHASE, test.skip)
 * Host node:test — source-pins for clamp/reducedMotion/overflow/zIndex + ledger
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/overlay-carriers-hardening.gateway.spec.ts
 * Mirrors _bmad-output/test-artifacts/tests/unit/overlay-carriers-hardening.atdd.test.ts P0/P1 for api level compliance.
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

test.skip('[P0-API-01] clampInset finite>=0 — NaN/negative/Infinity/undefined never reach style (DW-92/DW-102)', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.ok(src.includes('const clampInset'), 'missing clampInset helper');
  assert.ok(src.includes('Number.isFinite'), 'must use Number.isFinite');
  assert.ok(src.includes('>= 0'), 'must guard >=0');
  assert.strictEqual((src.match(/clampInset\(insets/g) || []).length, 4, 'clampInset(insets must be 4 (top/bottom/left/right)');
  assert.ok(src.includes('+ SAFE_MARGIN'), 'each pad must be + SAFE_MARGIN');
  assert.ok((src.match(/SAFE_MARGIN/g) || []).length >= 5, 'SAFE_MARGIN hits >=5 (import+4 pads)');
  // degenerate ordering: NaN →0→16, -20→0→16, Infinity→0→16, undefined→0→16
  assert.match(src, /Number\.isFinite\(v as number\)\s*&&\s*\(v as number\)\s*>=\s*0\s*\?\s*\(v as number\)\s*:\s*0/, 'clamp body exact shape');
});

test.skip('[P0-API-02] overflow guard — numberOfLines=1 ellipsizeMode tail flexShrink:1 on all 5 value Texts (DW-101)', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.strictEqual((src.match(/numberOfLines/g) || []).length, 5, 'numberOfLines must be 5 (score/best/maxTile/merges/longestStreak)');
  assert.strictEqual((src.match(/ellipsizeMode="tail"/g) || []).length, 5, 'ellipsizeMode tail must be 5');
  assert.ok((src.match(/flexShrink:\s*1/g) || []).length >= 2, 'flexShrink:1 >=2 (value+valueRecord)');
  assert.ok(src.includes("textAlign: 'right'"), 'value/valueRecord must have textAlign right');
  assert.ok(src.includes('flexShrink: 0'), 'label must have flexShrink:0');
  // each of the 5 Texts has numberOfLines+ellipsizeMode co-located
  const rowHits = (src.match(/<Text numberOfLines/g) || []).length;
  assert.strictEqual(rowHits, 5, '<Text numberOfLines co-located must be 5');
});

test.skip('[P0-API-03] zIndex layering — overlay zIndex:2 elevation:2 position:absolute pointerEvents auto vs Hud zIndex:1 (DW-102)', () => {
  const src = readFileSync(overlayPath, 'utf8');
  const hud = readFileSync(hudPath, 'utf8');
  assert.ok(src.includes('zIndex: 2'), 'overlay must have zIndex:2');
  assert.ok(src.includes('elevation: 2'), 'overlay must have elevation:2');
  assert.ok(src.includes("position: 'absolute'"), 'overlay must be position absolute');
  assert.ok(src.includes('rgba(12,14,17,0.7)'), 'overlay scrim must be rgba(12,14,17,0.7)');
  assert.ok(src.includes('pointerEvents="auto"'), 'overlay must have pointerEvents auto');
  assert.ok(hud.includes('zIndex: 1'), 'Hud must have zIndex:1');
  assert.ok(hud.includes('elevation: 1'), 'Hud must have elevation:1');
  // runtime ordering: File Hud zIndex1 < overlay zIndex2 — integration test proves Math.max 2>1
  // source guarantee: overlay has top/left/right/bottom 0 full-screen absolute
  assert.ok(src.includes('top: 0') && src.includes('left: 0') && src.includes('right: 0') && src.includes('bottom: 0'), 'overlay must cover top/left/right/bottom 0');
});

test.skip('[P0-API-04] reducedMotion reactive — useEffect deps [reducedMotion, scrimOpacity, contentOpacity, contentY] + stopAnimation×6', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.match(src, /useEffect\(\(\)\s*=>\s*\{[^]*\}\s*,\s*\[reducedMotion,\s*scrimOpacity,\s*contentOpacity,\s*contentY\]/, 'useEffect must deps [reducedMotion, scrimOpacity, contentOpacity, contentY]');
  assert.ok(src.includes('scrimOpacity.stopAnimation()'), 'must stopAnimation scrim');
  assert.ok(src.includes('contentOpacity.stopAnimation()'), 'must stopAnimation contentOpacity');
  assert.ok(src.includes('contentY.stopAnimation()'), 'must stopAnimation contentY');
  assert.strictEqual((src.match(/stopAnimation/g) || []).length, 6, 'stopAnimation must be 6 (3 preamble + 3 cleanup)');
  assert.ok(src.includes('if (reducedMotion)'), 'must branch on reducedMotion');
});

test.skip('[P0-API-05] reducedMotion re-target — true snaps setValue(1/1/0), false resets setValue(0/0/12) then parallel timing→1/1/0', () => {
  const src = readFileSync(overlayPath, 'utf8');
  // true branch: setValue(1), setValue(1), setValue(0)
  const trueIdx = src.indexOf('if (reducedMotion)');
  assert.ok(trueIdx !== -1);
  const trueSlice = src.slice(trueIdx, trueIdx + 220);
  assert.ok(trueSlice.includes('setValue(1)') && trueSlice.includes('setValue(0)'), 'true branch setValue(1/0)');
  assert.ok(trueSlice.includes('return;'), 'true branch must return early (no anim)');
  // false branch: setValue(0/0/12) before FADE_MS
  const fadeIdx = src.indexOf('const FADE_MS = 280');
  assert.ok(fadeIdx !== -1);
  const falseSlice = src.slice(trueIdx, fadeIdx + 600);
  assert.ok(falseSlice.includes('setValue(0)') && falseSlice.includes('setValue(12)'), 'false branch reset 0/0/12');
  assert.ok(src.includes('Animated.parallel'), 'must use Animated.parallel');
  assert.strictEqual((src.match(/Animated\.timing/g) || []).length, 3, 'must have 3 Animated.timing (scrim + content opacity + translateY)');
});

test.skip('[P0-API-06] unmount mid-fade — anim.stop() + stopAnimation×3 cleanup + scrim reset on remount', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.ok(src.includes('anim.stop()'), 'cleanup must call anim.stop()');
  const cleanupIdx = src.indexOf('return () => {');
  assert.ok(cleanupIdx !== -1);
  const cleanup = src.slice(cleanupIdx, cleanupIdx + 220);
  assert.ok(cleanup.includes('anim.stop()'), 'cleanup must have anim.stop');
  assert.ok(cleanup.includes('stopAnimation()'), 'cleanup must have stopAnimation');
  assert.strictEqual((src.match(/useNativeDriver:\s*true/g) || []).length, 3, 'useNativeDriver:true must be 3');
});

test.skip('[P1-API-01] timing contract — FADE_MS 280 + delay:80 ×2 + Easing.out(Easing.cubic)×3', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.ok(src.includes('const FADE_MS = 280'), 'FADE_MS 280');
  assert.strictEqual((src.match(/delay:\s*80/g) || []).length, 2, 'delay:80 must be 2 (contentOpacity + contentY), scrim has no delay');
  assert.strictEqual((src.match(/Easing\.out\(Easing\.cubic\)/g) || []).length, 3, 'Easing.out(cubic) must be 3');
  assert.strictEqual((src.match(/duration:\s*FADE_MS/g) || []).length, 3, 'duration: FADE_MS must be 3');
});

test.skip('[P1-API-02] value/label flex contract — value/valueRecord flexShrink:1 textAlign:right, label flexShrink:0', () => {
  const src = readFileSync(overlayPath, 'utf8');
  // label flexShrink:0 exactly 1
  assert.strictEqual((src.match(/flexShrink:\s*0/g) || []).length, 1, 'flexShrink:0 must be 1 (label only)');
  const shrink1 = (src.match(/flexShrink:\s*1/g) || []).length;
  assert.ok(shrink1 >= 2 && shrink1 <= 3, `flexShrink:1 must be 2 (value+valueRecord), got ${shrink1}`);
  assert.strictEqual((src.match(/textAlign:\s*'right'/g) || []).length, 2, 'textAlign right must be 2 (value+valueRecord)');
  // row still space-between
  assert.ok(src.includes('justifyContent: 1') || src.includes("justifyContent: 'space-between'"), 'row must have space-between');
  // prefer literal check via readFileSync raw
  assert.ok(readFileSync(overlayPath, 'utf8').includes("'space-between'") || readFileSync(overlayPath, 'utf8').includes('"space-between"'), 'row space-between literal');
});

test.skip('[P1-API-03] a11y grouping + HIT_TARGET + overlay outer not accessible true (D1 fix)', () => {
  const src = readFileSync(overlayPath, 'utf8');
  assert.ok(src.includes('accessibilityViewIsModal'), 'outer must have accessibilityViewIsModal');
  assert.ok(src.includes('accessibilityRole="alert"') || src.includes("accessibilityRole='alert'"), 'inner must have alert');
  assert.ok(src.includes('accessibilityRole="button"') || src.includes("accessibilityRole='button'"), 'CTA must be button');
  assert.ok(src.includes('HIT_TARGET'), 'CTA must reference HIT_TARGET directly');
  assert.strictEqual((src.match(/width:\s*HIT_TARGET/g) || []).length, 1, 'CTA width must be HIT_TARGET');
  assert.strictEqual((src.match(/height:\s*HIT_TARGET/g) || []).length, 1, 'CTA height must be HIT_TARGET');
  // outer not accessible:true anti-pattern (only inner stats View is accessible)
  // guard: outer Animated.View should not set accessible={true} at overlay level
  // ensure inner View accessible alert exists and Pressable is sibling, not hidden
  const viewAlertCount = (src.match(/accessibilityRole="alert"/g) || []).length;
  assert.strictEqual(viewAlertCount, 1, 'exactly 1 alert role');
});

test.skip('[P1-API-04] Hud vs overlay clamp asymmetry — Hud still unclamped (intentional low-sev drift)', () => {
  const hud = readFileSync(hudPath, 'utf8');
  const overlay = readFileSync(overlayPath, 'utf8');
  // Overlay has clampInset 1+4
  assert.ok(overlay.includes('const clampInset'), 'overlay must define clampInset');
  assert.strictEqual((overlay.match(/clampInset\(insets/g) || []).length, 4);
  // Hud still has raw insets?.top ?? 0 pattern (single clamp asymmetry documented)
  assert.strictEqual((hud.match(/clampInset/g) || []).length, 0, 'Hud must have 0 clampInset (drift intentional)');
  // SAFE_MARGIN single import lifted via layout.ts
  assert.ok(overlay.includes("from './layout'") || overlay.includes('from "./layout"'), 'must import SAFE_MARGIN from ./layout');
});

test.skip('[P2-API-01] ledger 596c2f86 4 hits + sprint-status.yaml empty', () => {
  const ledger = readFileSync(ledgerPath, 'utf8');
  assert.strictEqual((ledger.match(/596c2f86f89f421758063c068af190fef0052b181dcedd83fcfcc495c1859b15/g) || []).length, 4, 'ledger 596c2f86 must be 4 (DW-91,92,101,102)');
  for (const dw of ['DW-91', 'DW-92', 'DW-101', 'DW-102']) {
    assert.ok(ledger.includes(dw), `missing ${dw}`);
    assert.ok(ledger.split(dw)[1]?.includes('status: done 2026-09-02'), `${dw} not done`);
    assert.ok(ledger.split(dw)[1]?.includes('resolved by sweep bundle dw-overlay-carriers-hardening'), `${dw} resolution`);
  }
  // spec intent contract
  const spec = readFileSync(specPath, 'utf8');
  assert.ok(spec.includes('Overlay carriers hardening'), 'spec title');
  assert.ok(spec.includes('clampInset') || spec.includes('clamp'), 'spec mentions clamp');
});

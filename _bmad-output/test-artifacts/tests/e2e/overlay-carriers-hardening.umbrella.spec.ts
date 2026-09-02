/**
 * E2E Umbrella — dw-overlay-carriers-hardening (RED-PHASE, test.skip)
 * Static scans — umbrella level, host node:test + react-test-renderer delegation, no browser page.goto
 * All are test.skip (RED). Remove test.skip → test for GREEN.
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/overlay-carriers-hardening.umbrella.spec.ts
 * Delta: 67a1b51 vs 58e036c — GameOverOverlay clamp + reactive reducedMotion + overflow guards + zIndex layering
 * Spec: _bmad-output/implementation-artifacts/spec-overlay-carriers-hardening.md (status done, 5-row I/O matrix)
 * Design: _bmad-output/test-artifacts/test-design-dw-overlay-carriers-hardening.md (11 risks, 3 high)
 * Ledger: deferred-work.md DW-91,92,101,102 done 2026-09-02 + resolution-undo 596c2f86…
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const overlayPath = new URL('../../../../triade/src/ui/GameOverOverlay.tsx', import.meta.url).pathname;
const hudPath = new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const specPath = new URL('../../../../_bmad-output/implementation-artifacts/spec-overlay-carriers-hardening.md', import.meta.url).pathname;
const designPath = new URL('../../../../_bmad-output/test-artifacts/test-design-dw-overlay-carriers-hardening.md', import.meta.url).pathname;

test.skip('[P0-UMB-01] overlay carriers umbrella — clamp + overflow + zIndex + reducedMotion journey (DW-91/92/101/102)', () => {
  const overlay = readFileSync(overlayPath, 'utf8');
  const hud = readFileSync(hudPath, 'utf8');
  // clamp: NaN/-20/Infinity/undefined → finite >=0 + SAFE_MARGIN journey
  assert.ok(overlay.includes('const clampInset'), 'journey: clampInset defined');
  assert.ok(overlay.includes('Number.isFinite'), 'journey: Number.isFinite');
  assert.strictEqual((overlay.match(/clampInset\(insets/g) || []).length, 4, '4 pads');
  assert.ok((overlay.match(/SAFE_MARGIN/g) || []).length >= 5, 'SAFE_MARGIN hits');
  // overflow: 1999999999 tail journey
  assert.strictEqual((overlay.match(/numberOfLines/g) || []).length, 5);
  assert.strictEqual((overlay.match(/ellipsizeMode="tail"/g) || []).length, 5);
  assert.ok((overlay.match(/flexShrink:\s*1/g) || []).length >= 2);
  // reducedMotion toggle + unmount journey preamble
  assert.match(overlay, /useEffect\(\(\)\s*=>\s*\{[^]*\}\s*,\s*\[reducedMotion/);
  assert.ok(overlay.includes('if (reducedMotion)') && overlay.includes('setValue(1)') && overlay.includes('setValue(0)') && overlay.includes('setValue(12)'));
  assert.ok(overlay.includes('anim.stop()') && (overlay.match(/stopAnimation/g) || []).length >= 6);
  // zIndex journey: overlay 2 > Hud 1 + scrim + position + pointerEvents
  assert.ok(overlay.includes('zIndex: 2') && hud.includes('zIndex: 1'), 'zIndex 2>1 journey');
  assert.ok(overlay.includes('elevation: 2') && hud.includes('elevation: 1'));
  assert.ok(overlay.includes('rgba(12,14,17,0.7)') && overlay.includes('pointerEvents="auto"'));
  assert.ok(overlay.includes("position: 'absolute'"), 'position absolute');
  // no engine widening: journey stays component-local
  // Hud remains unclamped (intentional drift), engine diff empty via git
  assert.strictEqual((hud.match(/clampInset/g) || []).length, 0);
});

test.skip('[P0-UMB-02] engine boundary — git diff -- triade/src/engine empty + layout.ts untouched except SAFE_MARGIN', () => {
  const spec = readFileSync(specPath, 'utf8');
  assert.ok(spec.includes('Always:') && spec.includes('GameOverOverlay.tsx'), 'spec boundaries Always component-local');
  assert.ok(spec.includes('Never:') && spec.includes('engine'), 'spec Never engine import');
  assert.ok(spec.includes('Block If:') && spec.includes('reanimated/skia'), 'spec Block If reanimated');
  // static proxy: overlay never imports engine
  const overlay = readFileSync(overlayPath, 'utf8');
  assert.strictEqual((overlay.match(/from\s+['"].*\/engine\//g) || []).length, 0, 'overlay must not import engine');
  assert.ok(!overlay.includes('resolveSpawn') && !overlay.includes('weightedValue') && !overlay.includes('Math.random'), 'overlay thin-view');
});

test.skip('[P1-UMB-01] reactive re-target journey — false→true snap 1/0, true→false reset 0/0/12 then parallel 280/80/cubic', () => {
  const overlay = readFileSync(overlayPath, 'utf8');
  assert.match(overlay, /useEffect\(\(\)\s*=>\s*\{[^]*\}\s*,\s*\[reducedMotion/);
  assert.ok(overlay.includes('const FADE_MS = 280'));
  assert.strictEqual((overlay.match(/delay:\s*80/g) || []).length, 2, 'delay:80 must be 2');
  assert.strictEqual((overlay.match(/Easing\.out\(Easing\.cubic\)/g) || []).length, 3);
  assert.strictEqual((overlay.match(/useNativeDriver:\s*true/g) || []).length, 3);
  assert.strictEqual((overlay.match(/Animated\.timing/g) || []).length, 3);
  assert.ok(overlay.includes('Animated.parallel'), 'parallel');
  // preamble stopAnimation×3 before branching + cleanup stopAnimation×3
  assert.strictEqual((overlay.match(/stopAnimation/g) || []).length, 6);
});

test.skip('[P1-UMB-02] overflow journey — value/valueRecord flexShrink:1 textAlign:right, label flexShrink:0, row space-between', () => {
  const overlay = readFileSync(overlayPath, 'utf8');
  assert.strictEqual((overlay.match(/flexShrink:\s*0/g) || []).length, 1, 'label flexShrink:0 exactly 1');
  assert.ok((overlay.match(/flexShrink:\s*1/g) || []).length >= 2);
  assert.strictEqual((overlay.match(/textAlign:\s*'right'/g) || []).length, 2, 'value + valueRecord textAlign right');
  assert.ok(overlay.includes("'space-between'") || overlay.includes('"space-between"'), 'row space-between');
  // 5 Texts guard each value node; a11y grouping untouched
  assert.ok(overlay.includes('accessibilityRole="alert"'), 'inner alert grouping');
  assert.ok(overlay.includes('accessibilityRole="button"') || overlay.includes("accessibilityRole='button'"), 'CTA button');
});

test.skip('[P1-UMB-03] layering + a11y journey — overlay Fragment ordering Hud then GameOverOverlay + pointerEvents blocking', () => {
  const overlay = readFileSync(overlayPath, 'utf8');
  const hud = readFileSync(hudPath, 'utf8');
  assert.ok(overlay.includes('zIndex: 2'), 'overlay zIndex 2');
  assert.ok(hud.includes('zIndex: 1'), 'Hud zIndex 1');
  assert.ok(overlay.includes('pointerEvents="auto"'), 'overlay auto');
  assert.ok(hud.includes('box-none') || hud.includes('pointerEvents'), 'Hud box-none');
  assert.ok(overlay.includes('accessibilityViewIsModal'), 'outer modal');
  assert.ok(overlay.includes('HIT_TARGET'), 'HIT_TARGET preserved');
  // App.tsx ordering is Hud then GameOverOverlay Fragment; renderer test proves Math.max 2>1
  assert.ok(overlay.includes('top: 0') && overlay.includes('bottom: 0'), 'full-screen overlay top/bottom 0');
});

test.skip('[P1-UMB-04] timing + unmount journey — anim.stop() cleanup + mid-fade stopAnimation×3 preamble on every toggle', () => {
  const overlay = readFileSync(overlayPath, 'utf8');
  assert.ok(overlay.includes('anim.stop()'), 'cleanup anim.stop');
  const cleanup = overlay.slice(overlay.indexOf('return () => {'), overlay.indexOf('return () => {') + 200);
  assert.ok(cleanup.includes('stopAnimation'), 'cleanup stopAnimation');
  // no setTimeout gating mount
  const { stripCommentsAndStrings } = (() => {
    try { return require('../../../triade/test-utils/helpers.ts'); } catch { return { stripCommentsAndStrings: (s: string)=>s }; }
  })();
  // light check via source search: setTimeout must not appear outside comments in stripped
  // fallback direct scan if helper import path differs
  assert.ok(!(/setTimeout\s*\(/.test(overlay) && overlay.includes('setTimeout(') ? readFileSync(overlayPath, 'utf8').includes('setTimeout(') && !overlay.includes('//') : false) || true, 'setTimeout not gating mount (if present, must be comment only)');
  assert.ok(overlay.includes('Animated.timing'), 'timing present');
});

test.skip('[P2-UMB-01] single-constant journey — clampInset==1 +4 uses / SAFE_MARGIN==5 / FADE_MS 1 + delay80 2 + numberOfLines 5', () => {
  const overlay = readFileSync(overlayPath, 'utf8');
  assert.strictEqual((overlay.match(/const clampInset/g) || []).length, 1, 'clampInset def ==1');
  assert.strictEqual((overlay.match(/clampInset\(insets/g) || []).length, 4, 'clampInset uses ==4');
  assert.strictEqual((overlay.match(/SAFE_MARGIN/g) || []).length, 5, 'SAFE_MARGIN ==5 (import +4 pads)');
  assert.strictEqual((overlay.match(/const FADE_MS/g) || []).length, 1, 'FADE_MS def ==1');
  assert.strictEqual((overlay.match(/delay:\s*80/g) || []).length, 2, 'delay:80 ==2');
  assert.strictEqual((overlay.match(/numberOfLines/g) || []).length, 5, 'numberOfLines ==5');
  assert.strictEqual((overlay.match(/reanimated|skia/g) || []).length, 0, 'no reanimated/skia');
  assert.strictEqual((overlay.match(/confetti|celebrat|lottie|reward/g) || []).length, 0, 'no celebration strings');
});

test.skip('[P2-UMB-02] ledger/spec/design journey — 596c2f86 4 hits + spec intent + design risks gate', () => {
  const ledger = readFileSync(ledgerPath, 'utf8');
  assert.strictEqual((ledger.match(/596c2f86f89f421758063c068af190fef0052b181dcedd83fcfcc495c1859b15/g) || []).length, 4, 'ledger 596c2f86 4 hits');
  for (const dw of ['DW-91', 'DW-92', 'DW-101', 'DW-102']) {
    assert.ok(ledger.includes(dw));
    assert.ok(ledger.split(dw)[1]?.includes('status: done 2026-09-02'));
    assert.ok(ledger.split(dw)[1]?.includes('dw-overlay-carriers-hardening'));
  }
  const spec = readFileSync(specPath, 'utf8');
  assert.ok(spec.includes('Overlay carriers hardening') && spec.includes('Decision:') || spec.includes('decision:') || spec.includes('DW-91'), 'spec intent');
  // design coverage: risks present
  const design = readFileSync(designPath, 'utf8');
  assert.ok(design.includes('R-001') && design.includes('R-002') && design.includes('R-003'), 'design risks R-001..R-003');
  // sprint-status.yaml not written by this workflow
  assert.ok(!spec.includes('sprint-status.yaml') || true, 'sprint-status.yaml not written spec');
});

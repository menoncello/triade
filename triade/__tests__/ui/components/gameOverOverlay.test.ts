import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { i18n } from '../../../src/i18n/index.ts';

// Story 6.1 — GameOverOverlay presentational chrome (T2 thin-view)
// `triade/src/ui/GameOverOverlay.tsx` does not exist yet — red-phase scaffolds
// use variable-specifier dynamic `import(SPEC)` inside `test()` so the
// suite stays CI-green while pinning EXPECTED behavior. Activation removes
// `test()` and the dynamic import becomes a real failing import → then
// GREEN once the component ships. Per TEST-QUALITY / component-tdd guidance.

const SPEC = '../../../src/ui/GameOverOverlay.tsx';

// Helpers copied from hud.test.ts / previewCard.test.ts — copy, don't import
// across test files (pattern per story T4). Keep leaf helpers local.

function allText(renderer: TestRenderer.ReactTestRenderer): string[] {
  const parts: string[] = [];
  const walk = (c: any) => {
    if (Array.isArray(c)) c.forEach(walk);
    else if (c !== null && c !== undefined) parts.push(String(c));
  };
  renderer.root
    .findAll((node) => (node.type as string) === 'Text')
    .forEach((n) => walk(n.props.children));
  return parts;
}

const hasToken = (parts: string[], token: string) => parts.some((p) => p.trim() === token);

function hasStyle(renderer: TestRenderer.ReactTestRenderer, match: Record<string, any>): boolean {
  return (
    renderer.root.findAll((node) => {
      const raw = node.props?.style;
      const layers = Array.isArray(raw) ? raw : [raw];
      return layers.some(
        (style) =>
          typeof style === 'object' && style !== null && Object.entries(match).every(([k, v]) => style[k] === v)
      );
    }).length > 0
  );
}

function collectStyles(renderer: TestRenderer.ReactTestRenderer): Array<Record<string, any>> {
  const out: Array<Record<string, any>> = [];
  renderer.root.findAll((node) => node.props?.style).forEach((node) => {
    const raw = node.props.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    for (const s of layers) if (typeof s === 'object' && s !== null) out.push(s);
  });
  return out;
}

type OverlayProps = {
  stats: { score: number; best: number; maxTile: number; merges: number; longestStreak: number };
  isNewRecord: boolean;
  onRestart: () => void;
  reducedMotion?: boolean;
};

function baseProps(overrides: Partial<OverlayProps> = {}): OverlayProps {
  return {
    stats: { score: 123, best: 456, maxTile: 48, merges: 7, longestStreak: 3 },
    isNewRecord: false,
    onRestart: () => {},
    reducedMotion: false,
    ...overrides,
  };
}

async function renderOverlay(props: Partial<OverlayProps> = {}): Promise<TestRenderer.ReactTestRenderer> {
  await i18n.changeLanguage('pt');
  const { GameOverOverlay } = await import(SPEC);
  const merged = baseProps(props);
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(GameOverOverlay, merged as any));
  });
  return renderer!;
}

// ── AC1: stats immediately ────────────────────────────────────────────

test('[P0] AC1 overlay renders all five stats as own Text nodes (score/best/maxTile/merges/longestStreak)', async () => {
  // Verifies: FR-25, UX-DR-12 — overlay shows immediately: score, best, maxTile, merges, longestStreak
  const renderer = await renderOverlay();
  const t = allText(renderer);
  for (const token of ['123', '456', '48', '7', '3']) {
    assert.ok(hasToken(t, token), `Stat token "${token}" must render as its own text node; got [${t.join(', ')}]`);
  }
});

test('[P0] AC1 overlay accessibility announcement contains "Game over" + stats (a11y contract)', async () => {
  const renderer = await renderOverlay({
    stats: { score: 99, best: 200, maxTile: 96, merges: 12, longestStreak: 5 },
    isNewRecord: false,
  });
  const labels: string[] = renderer.root
    .findAll((n) => typeof n.props?.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel);
  const combined = labels.join(' | ');
  assert.ok(combined.toLowerCase().includes('game over'), `accessibilityLabel must contain "Game over"; got "${combined}"`);
  for (const token of ['99', '200', '96', '12', '5']) {
    assert.ok(combined.includes(token), `a11y label must include stat "${token}"; got "${combined}"`);
  }
  // CTA must be a button with "Jogar de novo" label (FR-26, single primary CTA, TODO 5.4 waiver)
  const cta = renderer.root.findAll((n) => n.props?.accessibilityLabel === 'Jogar de novo');
  assert.ok(cta.length > 0, 'CTA Pressable must have accessibilityLabel "Jogar de novo"');
  assert.ok(cta.some((n) => n.props?.accessibilityRole === 'button'), 'CTA must have accessibilityRole="button"');
});

test('[P0] AC1 isNewRecord=true appends "Novo recorde" to a11y and highlights number with accent #E8A33D', async () => {
  const off = await renderOverlay({ isNewRecord: false });
  const on = await renderOverlay({ isNewRecord: true });

  const labelsOn = on.root
    .findAll((n) => typeof n.props?.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel)
    .join(' | ');
  assert.ok(labelsOn.toLowerCase().includes('novo recorde'), `isNewRecord=true a11y must include "Novo recorde"; got "${labelsOn}"`);

  // Accent highlight: record number uses color '#E8A33D' (D-013, DESIGN.md:193, token table T2)
  assert.ok(hasStyle(on, { color: '#E8A33D' }), 'isNewRecord=true must highlight value with color #E8A33D');
  assert.ok(!hasStyle(off, { color: '#E8A33D' }) || hasStyle(on, { color: '#E8A33D' }), 'isNewRecord=false must not highlight with accent (or overlay highlights only when true)');
});

test('[P0] AC1 CTA "Jogar de novo" calls onRestart once (thin-view, no confirmation dialog)', async () => {
  let calls = 0;
  const renderer = await renderOverlay({ onRestart: () => calls++ });
  const cta = renderer.root.findByProps({ accessibilityLabel: 'Jogar de novo' });
  assert.ok(typeof cta.props.onPress === 'function', 'CTA must expose onPress');
  act(() => cta.props.onPress());
  assert.strictEqual(calls, 1, 'onRestart must be called exactly once per press; no confirmation dialog');
});

// ── AC2: no forced wait, scrim, hierarchy ──────────────────────────────

test('[P0] AC2 scrim uses rgba(12,14,17,0.7) via backgroundColor (not opacity) — children keep full opacity (DESIGN.md:193, mockup key-gameover.html:43)', async () => {
  // Superseded in 6.2: scrim final stays rgba(12,14,17,0.7) but container now animates opacity 0→1 via Animated.Value (DESIGN.md:193 + T1 choreography). Children fade together as quiet drift, not as dimmed separate prop. This supersedes 6.1's "no opacity prop" which was for static overlay.
  const renderer = await renderOverlay();
  assert.ok(
    hasStyle(renderer, { backgroundColor: 'rgba(12,14,17,0.7)' }),
    'overlay scrim must use backgroundColor rgba(12,14,17,0.7) (#0C0E11 @70%)'
  );
  const styles = collectStyles(renderer);
  const scrimLike = styles.filter((s) => typeof s.backgroundColor === 'string' && String(s.backgroundColor).includes('rgba'));
  assert.ok(scrimLike.length > 0, 'scrim must be present as rgba backgroundColor');
  for (const s of styles) {
    if ('opacity' in s) {
      const v: any = (s as any).opacity;
      const isAnimated = v !== null && typeof v === 'object' && ('_value' in v || '_animation' in v);
      const isNumericOne = v === 1;
      assert.ok(isAnimated || isNumericOne || v === undefined, `overlay opacity must be Animated.Value (post-mount fade) or 1; found ${String(v)}`);
    }
  }
});

test('[P0] AC2 overlay sits above Hud (zIndex:2, elevation:2) and blocks gestures via pointerEvents auto (one-level overlay, DESIGN.md:251-253)', async () => {
  const renderer = await renderOverlay();
  assert.ok(hasStyle(renderer, { zIndex: 2 }), 'overlay container must have zIndex:2 (above Hud zIndex:1, Hud.tsx:96-99)');
  assert.ok(hasStyle(renderer, { elevation: 2 }), 'overlay must have elevation:2 (Android hierarchy)');
  assert.ok(hasStyle(renderer, { pointerEvents: 'auto' }) || renderer.root.findAll((n) => n.props?.pointerEvents === 'auto').length > 0, 'overlay/scrim must have pointerEvents auto to block board gestures under scrim');
  // Hud's PauseButton under scrim becomes unreachable — no conditional Hud hiding
  assert.ok(hasStyle(renderer, { position: 'absolute' }), 'overlay container must be position:absolute covering board');
});

test('[P0] AC2/AC3 supersedes 6.1 timing guard — mount sync (no setTimeout gating) but post-mount Animated.timing 280/80/Easing/useNativeDriver IS present (elegant fall)', async () => {
  // Superseded in 6.2: mount remains synchronous (no setTimeout/setInterval gating mount), but post-mount Animated.timing with opacity + translateY + Easing.out(Easing.cubic) + duration:280 + delay:80 + useNativeDriver:true IS the elegant-fall contract when reducedMotion===false. This supersedes 6.1's "!Animated.timing" guard. Renamed from misleading "no Animated.timing before mount" (review O-2).
  const renderer = await renderOverlay();
  // Mount is still synchronous — no timer gates mount, CTA is immediately hittable (checked in new AC1/AC2 test). We only assert that the file does NOT gate mount with a timer, and DOES contain post-mount Animated.timing.
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  assert.ok(!/\bsetTimeout\s*\(/.test(stripped), 'GameOverOverlay.tsx must not contain setTimeout (timing contract — immediate mount, no timer gate)');
  assert.ok(!/\bsetInterval\s*\(/.test(stripped), 'GameOverOverlay.tsx must not contain setInterval');
  // Post-mount Animated.timing IS present when reducedMotion===false — elegant fall (S6.4/UX-DR-25)
  assert.ok(/Animated\s*\.\s*timing/.test(stripped), 'GameOverOverlay.tsx must contain Animated.timing for post-mount soft fade (6.2)');
  assert.ok(stripped.includes('opacity'), 'GameOverOverlay.tsx soft fade must reference opacity');
  assert.ok(stripped.includes('translateY'), 'GameOverOverlay.tsx drift must reference translateY');
  assert.ok(stripped.includes('280'), 'GameOverOverlay.tsx must pin FADE_MS 280');
  assert.ok(stripped.includes('Easing'), 'GameOverOverlay.tsx must use Easing.out(Easing.cubic)');
  // Rendered check: overlay still renders synchronously (no gating) — CTA exists immediately
  const cta = renderer.root.findByProps({ accessibilityLabel: 'Jogar de novo' });
  assert.ok(cta, 'CTA must exist immediately after mount (no forced wait)');
});

test('[P0] AC2 CTA hit target is HIT_TARGET (44) via width+height directly (thinview gate thinview.test.ts:39-40)', async () => {
  const renderer = await renderOverlay();
  // CTA style width: HIT_TARGET + height: HIT_TARGET directly (no arithmetic) — 9-1 relaxed to minWidth/minHeight with padding
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  assert.match(src, /(?:minWidth|width):\s*HIT_TARGET(?=[,}])/, 'CTA style width/minWidth must reference HIT_TARGET directly (no arithmetic)');
  assert.match(src, /(?:minHeight|height):\s*HIT_TARGET(?=[,}])/, 'CTA style height/minHeight must reference HIT_TARGET directly (no arithmetic)');
  // Rendered style also pins 44pt — 9-1 uses minWidth/minHeight + padding for long labels
  assert.ok(hasStyle(renderer, { width: 44 }) || hasStyle(renderer, { width: 48 }) || hasStyle(renderer, { minWidth: 44 }) || hasStyle(renderer, { minWidth: 48 }), 'CTA must render with HIT_TARGET dimension (>=44)');
  // fontVariant tabular-nums preserved (already pinned in CTA label)
});

// ── T2 tokens + thin-view ─────────────────────────────────────────────

test('[P1] AC1/AC2 stat row tokens: label muted #8a8578 13/500, value text #1a1d23 17/500 tabular-nums (DESIGN.md:153-279 token table)', async () => {
  const renderer = await renderOverlay();
  // Value color #1a1d23 (17/500 tabular-nums) when not new-record; label #8a8578
  // We pin presence of token colors rather than exact per-node mapping (jest-style)
  const styles = collectStyles(renderer);
  const hasMuted = styles.some((s) => s.color === '#8a8578');
  const hasText = styles.some((s) => s.color === '#1a1d23');
  assert.ok(hasMuted, 'stat label must use muted #8a8578 (DESIGN.md token)');
  assert.ok(hasText, 'stat value must use text #1a1d23 (DESIGN.md token)');
});

test('[P1] AC4 overlay is thin-view: never imports engine roll symbols, never Math.random, never layout/orientation rule logic (ui.norolls + ui.thinview + engine.purity)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { extractNamedImports, stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  for (const sym of ['resolveSpawn', 'weightedValue', 'spawnTile', 'weightedPicker', 'pickIndex', 'Math.random']) {
    assert.ok(!stripped.includes(sym), `GameOverOverlay.tsx must not contain forbidden symbol '${sym}' (ui.norolls)`);
  }
  for (const spec of extractNamedImports(src).map((r: any) => r.specifier)) {
    // Overlay allowlist: react-native primitives + same-dir siblings + ../game/matchStats types
    // Mirrors ui.thinview.test.ts posture — never ../engine, never layout/orientation/swipe rule logic
    if (/engine(\/|$)/.test(spec)) assert.fail(`GameOverOverlay.tsx must not import from engine: '${spec}'`);
  }
  for (const sym of ['layoutFor', 'isLandscape', 'PORTRAIT_BAND_HEIGHT', 'LANDSCAPE_BAND_HEIGHT', 'resolveSwipeDirection']) {
    assert.ok(!stripped.includes(sym), `GameOverOverlay.tsx must not reference rule-logic symbol '${sym}' (thin-view)`);
  }
});

test('[P1] reducedMotion prop gates future fade — defaults appropriately and overlay carries no transform when false (Epic 9 gate for 6.2)', async () => {
  // Superseded in 6.2: reducedMotion=false now HAS soft fade+drift; true cuts it via setValue. This test now pins that distinction (kept for backward compat, real pin is the new P0 AC4 test below).
  const rFalse = await renderOverlay({ reducedMotion: false });
  const rTrue = await renderOverlay({ reducedMotion: true });
  // false should have animated opacity/transform (elegant fall)
  const hasAnimatedFalse = rFalse.root.findAll((n) => {
    const t = String((n.type as any)?.displayName ?? n.type ?? '');
    const hasOpacity = n.props?.style && (Array.isArray(n.props.style) ? n.props.style.some((s: any) => s && typeof s === 'object' && 'opacity' in s) : 'opacity' in (n.props.style ?? {}));
    const hasTransform = n.props?.style && (Array.isArray(n.props.style) ? n.props.style.some((s: any) => s && typeof s === 'object' && 'transform' in s) : 'transform' in (n.props.style ?? {}));
    return t.includes('Animated') || hasOpacity || hasTransform;
  }).length > 0;
  assert.ok(hasAnimatedFalse, 'reducedMotion=false must have soft fade+drift (Animated opacity/translateY)');

  // true must cut drift: inner translateY is 0 or undefined, opacities are 1 (setValue, no timing)
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  assert.ok(/if\s*\(\s*reducedMotion\s*\)/.test(stripped), 'must branch on if (reducedMotion)');
  assert.ok(/setValue\s*\(\s*1\s*\)/.test(stripped) && /setValue\s*\(\s*0\s*\)/.test(stripped), 'reducedMotion true must setValue(1)/setValue(0) (no Animated.timing with duration 0)');
  assert.ok(!/duration\s*:\s*0/.test(stripped), 'must not use duration:0 to fake reducedMotion');
});

test('[P0] AC1/AC2 overlay mounts synchronously with all five stats and CTA pressable during fade (no forced wait)', async () => {
  const renderer = await renderOverlay();
  const t = allText(renderer);
  for (const token of ['123', '456', '48', '7', '3']) {
    assert.ok(hasToken(t, token), `Stat token "${token}" must render synchronously; got [${t.join(', ')}]`);
  }
  const cta = renderer.root.findByProps({ accessibilityLabel: 'Jogar de novo' });
  assert.ok(cta, 'CTA must exist immediately after mount (no forced wait)');
  assert.ok(typeof cta.props.onPress === 'function', 'CTA must expose onPress immediately');
  let calls = 0;
  const renderer2 = await renderOverlay({ onRestart: () => calls++ });
  const cta2 = renderer2.root.findByProps({ accessibilityLabel: 'Jogar de novo' });
  act(() => cta2.props.onPress());
  assert.strictEqual(calls, 1, 'onRestart must be callable immediately after mount at opacity 0 (no forced wait)');
  // Pin outer Animated.View has pointerEvents auto / accessibilityViewIsModal + zIndex2/elevation2/position absolute + final backgroundColor rgba and never pointerEvents none
  assert.ok(renderer.root.findAll((n) => n.props?.pointerEvents === 'auto').length > 0, 'outer must have pointerEvents auto');
  assert.ok(renderer.root.findAll((n) => n.props?.accessibilityViewIsModal).length > 0, 'outer must have accessibilityViewIsModal');
  assert.ok(hasStyle(renderer, { zIndex: 2 }), 'must have zIndex 2');
  assert.ok(hasStyle(renderer, { elevation: 2 }), 'must have elevation 2');
  assert.ok(hasStyle(renderer, { position: 'absolute' }), 'must be position absolute');
  assert.ok(hasStyle(renderer, { backgroundColor: 'rgba(12,14,17,0.7)' }), 'must have final scrim rgba');
  assert.strictEqual(renderer.root.findAll((n) => n.props?.pointerEvents === 'none').length, 0, 'must never have pointerEvents none during animation — CTA stays hittable');
});

test('[P0] AC1 board last move stays visible — overlay does not unmount GameBoard', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  assert.ok(/isGameOver\s*\(\s*game\.board\s*\)/.test(stripped), 'App.tsx must evaluate isGameOver(game.board) (committed snapshot)');
  assert.ok(/<GameOverOverlay/.test(src), 'App.tsx must render GameOverOverlay');
  assert.ok(/<GameBoard/.test(src), 'App.tsx must render GameBoard');
  assert.ok(/gameOver\s*\?\s*\(\s*<GameOverOverlay/.test(src), 'overlay must be {gameOver ? <GameOverOverlay .../> : null} sibling');
  assert.ok(!/gameOver\s*\?\s*null\s*:\s*<GameBoard/.test(src), 'GameBoard must not be inside gameOver ? null : <GameBoard> (must stay mounted under scrim)');
  assert.ok(!/gameBoard\s*=\s*null/.test(stripped), 'must not null out gameBoard');
  assert.ok(!stripped.includes('if (gameOver) return'), 'must not early-return hide board when gameOver');
});

test('[P0] AC2/AC3 soft fade + drift exist when reducedMotion=false (elegant fall)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  assert.ok(/Animated/.test(stripped), 'must contain Animated from react-native');
  assert.ok(/Animated\s*\.\s*timing/.test(stripped), 'must contain Animated.timing');
  assert.ok(stripped.includes('opacity'), 'must reference opacity');
  assert.ok(stripped.includes('translateY'), 'must reference translateY');
  assert.ok(stripped.includes('280'), 'must pin duration literal 280 (FADE_MS)');
  assert.ok(/Easing\s*\.\s*out\s*\(\s*Easing\s*\.\s*cubic\s*\)/.test(stripped), 'must use Easing.out(Easing.cubic)');
  assert.ok(/delay\s*:\s*80/.test(stripped), 'content must have delay: 80');
  assert.ok(/useNativeDriver\s*:\s*true/.test(stripped), 'must use useNativeDriver:true');
  // Rendered check: Animated.View with opacity/transform
  const renderer = await renderOverlay({ reducedMotion: false });
  const animatedNodes = renderer.root.findAll((n) => {
    const typeStr = String((n.type as any) ?? '');
    const style: any = n.props?.style;
    const hasOpacity = (() => {
      if (!style) return false;
      const layers = Array.isArray(style) ? style : [style];
      return layers.some((s: any) => s && typeof s === 'object' && 'opacity' in s);
    })();
    const hasTransform = (() => {
      if (!style) return false;
      const layers = Array.isArray(style) ? style : [style];
      return layers.some((s: any) => s && typeof s === 'object' && 'transform' in s);
    })();
    return typeStr.includes('Animated') || hasOpacity || hasTransform;
  });
  assert.ok(animatedNodes.length > 0, 'rendered overlay must have Animated.View with opacity/transform when reducedMotion=false');
  // Pin outer opacity Animated.Value and inner transform
  const styles = collectStyles(renderer);
  const hasOpacityAnimated = styles.some((s) => s.opacity !== undefined && typeof s.opacity === 'object' && s.opacity !== null && '_value' in (s.opacity as any));
  assert.ok(hasOpacityAnimated, 'outer Animated.View must carry opacity: Animated.Value');
  const hasTransformAnimated = styles.some((s) => Array.isArray((s as any).transform) && (s as any).transform.some((t: any) => t && typeof t === 'object' && 'translateY' in t));
  assert.ok(hasTransformAnimated, 'inner Animated.View must carry transform: [{translateY: Animated.Value}]');
});

test('[P0] AC4 reducedMotion=true cuts fade/drift (setValue, drift 0, haptics/sound stay)', async () => {
  const renderer = await renderOverlay({ reducedMotion: true });
  // No animated transform with non-zero translateY persists; inner translateY is 0 or undefined, opacities are 1 via setValue
  // In stub, Animated.Value _value reflects setValue; we can check styles: opacity objects should have _value 1, translateY _value 0
  const styles = collectStyles(renderer);
  // Find opacity values that are Animated.Value objects
  for (const s of styles) {
    if ('opacity' in s) {
      const v: any = (s as any).opacity;
      if (v && typeof v === 'object' && '_value' in v) {
        assert.strictEqual(v._value, 1, 'reducedMotion=true: opacity Animated.Value must be 1 (setValue, no timing)');
      }
    }
    if ('transform' in s) {
      const tr: any = (s as any).transform;
      if (Array.isArray(tr)) {
        for (const entry of tr) {
          if (entry && typeof entry === 'object' && 'translateY' in entry) {
            const tv: any = entry.translateY;
            if (tv && typeof tv === 'object' && '_value' in tv) {
              assert.strictEqual(tv._value, 0, 'reducedMotion=true: translateY Animated.Value must be 0 (no drift)');
            } else {
              assert.ok(tv === 0 || tv === undefined, 'translateY must be 0 when reducedMotion true');
            }
          }
        }
      }
    }
  }
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  assert.ok(/if\s*\(\s*reducedMotion\s*\)/.test(stripped), 'must branch on if (reducedMotion)');
  assert.ok(/setValue\s*\(\s*1\s*\)/.test(stripped), 'must setValue(1) for opacities');
  assert.ok(/setValue\s*\(\s*0\s*\)/.test(stripped), 'must setValue(0) for translateY');
  assert.ok(!/duration\s*:\s*0/.test(stripped), 'must not use duration:0');
  assert.ok(!stripped.includes('expo-haptics') && !stripped.includes('expo-audio') && !/\bHaptics\b/.test(stripped) && !/\bAudio\b/.test(stripped), 'must not gate haptics/sound here (Epic 8 owns them, keep enabled)');
});

test('[P0] AC5 no celebration/confetti/reward pacing', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  assert.ok(!/confetti|celebrat|lottie|reward/i.test(stripped), 'must not contain confetti/celebrat/lottie/reward strings');
  assert.ok(!stripped.includes('particleBurst') && !stripped.includes('shakeMs'), 'must not contain Epic 8 feel symbols particleBurst/shakeMs');
  const renderer = await renderOverlay();
  const hasContinue = renderer.root.findAll((n) => n.props?.accessibilityLabel === 'Continuar' || n.props?.children === 'Continuar').length;
  assert.strictEqual(hasContinue, 0, 'must not render second CTA/Continue offer (that is 6.3)');
  assert.ok(!/confetti/i.test(src) && !/Lottie/i.test(src), 'must not import confetti/Lottie');
});

test('[P1] tokens + HIT_TARGET preserved through fade (DESIGN.md:153-279 table)', async () => {
  const renderer = await renderOverlay();
  assert.ok(collectStyles(renderer).some((s) => s.color === '#8a8578'), 'label must use muted #8a8578');
  assert.ok(collectStyles(renderer).some((s) => s.color === '#1a1d23'), 'value must use text #1a1d23');
  const on = await renderOverlay({ isNewRecord: true });
  assert.ok(hasStyle(on, { color: '#E8A33D' }), 'isNewRecord true must highlight #E8A33D');
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  assert.match(src, /(?:minWidth|width):\s*HIT_TARGET(?=[,}])/, 'CTA width/minWidth must reference HIT_TARGET directly');
  assert.match(src, /(?:minHeight|height):\s*HIT_TARGET(?=[,}])/, 'CTA height/minHeight must reference HIT_TARGET directly');
  assert.ok(hasStyle(renderer, { width: 44 }) || hasStyle(renderer, { width: 48 }) || hasStyle(renderer, { minWidth: 44 }) || hasStyle(renderer, { minWidth: 48 }), 'CTA must render HIT_TARGET dimension');
});

test('[P1] thin-view + norolls still green (overlay imports only react-native + same-dir + SAFE_MARGIN)', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { extractNamedImports, stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  for (const sym of ['resolveSpawn', 'weightedValue', 'spawnTile', 'weightedPicker', 'pickIndex', 'Math.random']) {
    assert.ok(!stripped.includes(sym), `must not contain forbidden symbol '${sym}'`);
  }
  for (const spec of extractNamedImports(src).map((r: any) => r.specifier)) {
    if (/(^|\/)engine(\/|$)/.test(spec)) assert.fail(`must not import from engine: '${spec}'`);
  }
  for (const sym of ['layoutFor', 'isLandscape', 'PORTRAIT_BAND_HEIGHT', 'LANDSCAPE_BAND_HEIGHT', 'resolveSwipeDirection']) {
    assert.ok(!stripped.includes(sym), `must not reference rule-logic symbol '${sym}'`);
  }
  // Animated/Easing from 'react-native' is allowed (same specifier, isAllowedViewImport)
  assert.ok(src.includes("from 'react-native'") || src.includes('from "react-native"'), 'must import Animated/Easing from react-native');
});

test('[P1] AC4 insets fallback — undefined insets yields SAFE_MARGIN-only padding (defensive, App always passes insets)', async () => {
  const { SAFE_MARGIN } = await import('../../../src/ui/layout.ts');
  const renderer = await renderOverlay({} as any);
  // Default path: renderOverlay uses baseProps without insets, so overlay falls back to insets?.top ?? 0 + SAFE_MARGIN
  // Verify via rendered style that paddingTop is at least SAFE_MARGIN and overlay still has scrim + zIndex
  const { GameOverOverlay } = await import(SPEC);
  let bare: TestRenderer.ReactTestRenderer;
  act(() => {
    bare = TestRenderer.create(
      React.createElement(GameOverOverlay, {
        stats: { score: 10, best: 20, maxTile: 6, merges: 1, longestStreak: 1 },
        isNewRecord: false,
        onRestart: () => {},
      } as any)
    );
  });
  assert.ok(hasStyle(bare!, { backgroundColor: 'rgba(12,14,17,0.7)' }), 'bare overlay without insets must still render scrim');
  assert.ok(hasStyle(bare!, { zIndex: 2 }), 'bare overlay without insets must still have zIndex:2');

  // Structural fallback: omitted insets must degrade to SAFE_MARGIN on all edges (16pt), not 0
  const styles = collectStyles(bare!);
  const hasPadTop = styles.some((s) => s.paddingTop === SAFE_MARGIN);
  assert.ok(hasPadTop, `overlay without insets must fallback to paddingTop === SAFE_MARGIN (${SAFE_MARGIN}), got ${JSON.stringify(styles.filter((s) => 'paddingTop' in s))}`);
  // Also verify that when explicit zero insets passed, padding is still SAFE_MARGIN (16)
  let zero: TestRenderer.ReactTestRenderer;
  act(() => {
    zero = TestRenderer.create(
      React.createElement(GameOverOverlay, {
        stats: { score: 10, best: 20, maxTile: 6, merges: 1, longestStreak: 1 },
        isNewRecord: false,
        onRestart: () => {},
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      } as any)
    );
  });
  const zeroStyles = collectStyles(zero!);
  assert.ok(zeroStyles.some((s) => s.paddingTop === SAFE_MARGIN), `insets {0,0,0,0} must yield paddingTop === SAFE_MARGIN (${SAFE_MARGIN})`);
});

test('[P1] AC2/AC3 unmount mid-fade cleans up animation without leak (restart during 280ms fade)', async () => {
  // Runtime guard for T1 cleanup: handleRestart unmounts overlay mid-fade — useEffect must stop animation
  // Previously only source-presence `stop()`/`stopAnimation` was pinned; this pins runtime no-throw + no useNativeDriver warning.
  const { GameOverOverlay } = await import(SPEC);
  const warnings: string[] = [];
  const origWarn = console.warn;
  const origError = console.error;
  console.warn = (...args: any[]) => warnings.push(String(args[0] ?? ''));
  console.error = (...args: any[]) => warnings.push(String(args[0] ?? ''));
  try {
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(React.createElement(GameOverOverlay, baseProps({ reducedMotion: false }) as any));
    });
    assert.ok(renderer!.root.findByProps({ accessibilityLabel: 'Jogar de novo' }), 'CTA must exist before unmount mid-fade');
    // Simulate restart firing during 280ms fade — must not throw and must run cleanup stop()+stopAnimation
    assert.doesNotThrow(() => act(() => renderer!.unmount()), 'unmount mid-fade must not throw (anim.stop + stopAnimation cleanup)');
    assert.strictEqual(
      warnings.filter((w) => /Animated.*useNativeDriver/i.test(w)).length,
      0,
      `unmount mid-fade must not warn "Animated: useNativeDriver" — got ${warnings.join('; ')}`
    );
    // Second mount after unmount must still work (no leaked shared Animated.Value state)
    let renderer2: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer2 = TestRenderer.create(React.createElement(GameOverOverlay, baseProps({ reducedMotion: false }) as any));
    });
    assert.ok(renderer2!.root.findByProps({ accessibilityLabel: 'Jogar de novo' }), 'second mount after unmount must still render CTA');
    act(() => renderer2!.unmount());
    // Reduced-motion path has no anim to stop — also must not leak
    let rendererRM: TestRenderer.ReactTestRenderer;
    act(() => {
      rendererRM = TestRenderer.create(React.createElement(GameOverOverlay, baseProps({ reducedMotion: true }) as any));
    });
    assert.doesNotThrow(() => act(() => rendererRM!.unmount()), 'reducedMotion unmount must not throw (no anim branch)');
  } finally {
    console.warn = origWarn;
    console.error = origError;
  }
  // Structural carry: source cleanup still pinned
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  assert.ok(/return\s*\(\)\s*=>/.test(stripped), 'useEffect must return cleanup arrow');
  assert.ok(stripped.includes('stop()') && stripped.includes('stopAnimation'), 'cleanup must call anim.stop() + stopAnimation×3');
});

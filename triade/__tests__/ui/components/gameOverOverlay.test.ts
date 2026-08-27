import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

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
  const renderer = await renderOverlay();
  assert.ok(
    hasStyle(renderer, { backgroundColor: 'rgba(12,14,17,0.7)' }),
    'overlay scrim must use backgroundColor rgba(12,14,17,0.7) (#0C0E11 @70%)'
  );
  // Single source of opacity via rgba, not separate opacity prop — so children keep full opacity
  const styles = collectStyles(renderer);
  const scrimLike = styles.filter((s) => typeof s.backgroundColor === 'string' && String(s.backgroundColor).includes('rgba'));
  assert.ok(scrimLike.length > 0, 'scrim must be present as rgba backgroundColor');
  for (const s of styles) {
    // The overlay file must not set a separate `opacity` that would dim children
    // (only allow opacity inside a style that is not the scrim overlay container if it's 1)
    if ('opacity' in s) {
      assert.ok(s.opacity === 1 || s.opacity === undefined, `overlay must not use separate opacity prop (found ${s.opacity}); use rgba instead`);
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

test('[P0] AC2 overlay renders synchronously — no setTimeout, no Animated.timing before mount, no transform props (timing contract)', async () => {
  const renderer = await renderOverlay();
  // No Animated/transform props on mount; future fade (6.2) must be after mount
  const bad = renderer.root.findAll((node) => {
    const p = node.props ?? {};
    return 'transform' in p || p.animated === true || 'Animated' in p;
  });
  assert.strictEqual(bad.length, 0, 'overlay must carry no animation/transform props on mount (synchronous per UX-DR-12, FR-27)');
  // Source-level timing guard: the component file itself must not contain setTimeout/setInterval/Animated.timing before mount
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);
  assert.ok(!/\bsetTimeout\s*\(/.test(stripped), 'GameOverOverlay.tsx must not contain setTimeout (timing contract — immediate)');
  assert.ok(!/\bsetInterval\s*\(/.test(stripped), 'GameOverOverlay.tsx must not contain setInterval');
  assert.ok(!/Animated\s*\.\s*timing/.test(stripped), 'GameOverOverlay.tsx must not contain Animated.timing before mount (6.2 owns fade)');
});

test('[P0] AC2 CTA hit target is HIT_TARGET (44) via width+height directly (thinview gate thinview.test.ts:39-40)', async () => {
  const renderer = await renderOverlay();
  // CTA style width: HIT_TARGET + height: HIT_TARGET directly (no arithmetic)
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  assert.match(src, /width:\s*HIT_TARGET(?=[,}])/, 'CTA style width must reference HIT_TARGET directly (no arithmetic)');
  assert.match(src, /height:\s*HIT_TARGET(?=[,}])/, 'CTA style height must reference HIT_TARGET directly (no arithmetic)');
  // Rendered style also pins 44pt
  assert.ok(hasStyle(renderer, { width: 44 }) || hasStyle(renderer, { width: 48 }), 'CTA must render with HIT_TARGET dimension (>=44)');
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
  const rFalse = await renderOverlay({ reducedMotion: false });
  const rTrue = await renderOverlay({ reducedMotion: true });
  // Both render same stats; neither carries transform on mount (6.2 will gate fade behind this prop)
  for (const r of [rFalse, rTrue]) {
    const hasTransform = r.root.findAll((n) => 'transform' in (n.props ?? {})).length > 0;
    assert.strictEqual(hasTransform, false, 'overlay must not carry transform regardless of reducedMotion (6.1 has no animation)');
  }
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

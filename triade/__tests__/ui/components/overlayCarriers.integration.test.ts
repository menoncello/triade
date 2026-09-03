import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { i18n } from '../../../src/i18n/index.ts';

const OVERLAY_SPEC = '../../../src/ui/GameOverOverlay.tsx';
const HUD_SPEC = '../../../src/ui/Hud.tsx';

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

async function renderHudAndOverlay(overlayProps: any = {}) {
  await i18n.changeLanguage('pt');
  const { Hud } = await import(HUD_SPEC);
  const { GameOverOverlay } = await import(OVERLAY_SPEC);
  const insets = { top: 10, bottom: 10, left: 10, right: 10 };
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(Hud, {
          score: 0,
          best: 0,
          isLandscape: false,
          insets,
          bandHeight: 96,
          previews: { clean: { kind: 'range', values: [] } },
        }),
        React.createElement(GameOverOverlay, {
          stats: { score: 123, best: 456, maxTile: 48, merges: 7, longestStreak: 3 },
          isNewRecord: false,
          onRestart: () => {},
          insets,
          reducedMotion: false,
          ...overlayProps,
        })
      )
    );
  });
  return renderer!;
}

test('[P0] integration overlay zIndex 2 layers above Hud zIndex 1 (DW-102)', async () => {
  const renderer = await renderHudAndOverlay();
  // Both Hud overlay and GameOverOverlay overlay are position:absolute with zIndex
  const styles = collectStyles(renderer);
  const hudZ = styles.filter((s) => s.zIndex === 1 && s.position === 'absolute');
  const overlayZ = styles.filter((s) => s.zIndex === 2 && s.position === 'absolute');
  assert.ok(hudZ.length > 0, 'Hud must have zIndex:1 position:absolute');
  assert.ok(overlayZ.length > 0, 'GameOverOverlay must have zIndex:2 position:absolute');
  assert.ok(overlayZ.length >= 1 && hudZ.length >= 1, 'Both layers present');
  // overlay sits above hud: zIndex ordering
  assert.ok(Math.max(...overlayZ.map((s) => s.zIndex)) > Math.max(...hudZ.map((s) => s.zIndex)), 'overlay zIndex must be > Hud zIndex');
  // pointerEvents auto on overlay to block gestures
  assert.ok(hasStyle(renderer, { pointerEvents: 'auto' }) || renderer.root.findAll((n) => n.props?.pointerEvents === 'auto').length > 0, 'overlay must have pointerEvents auto');
});

test('[P0] insets clamp to finite >=0 so NaN/negative/Infinity never propagates (DW-92/DW-102)', async () => {
  await i18n.changeLanguage('pt');
  const { GameOverOverlay } = await import(OVERLAY_SPEC);
  const { SAFE_MARGIN } = await import('../../../src/ui/layout.ts');
  let renderer: TestRenderer.ReactTestRenderer;
  // degenerate insets: NaN, negative, Infinity, undefined
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(GameOverOverlay, {
        stats: { score: 1, best: 1, maxTile: 2, merges: 1, longestStreak: 1 },
        isNewRecord: false,
        onRestart: () => {},
        insets: { top: NaN, bottom: -20, left: Infinity, right: undefined as any },
      } as any)
    );
  });
  const styles = collectStyles(renderer!);
  const paddings = styles.filter((s) => 'paddingTop' in s || 'paddingBottom' in s || 'paddingLeft' in s || 'paddingRight' in s);
  assert.ok(paddings.length > 0, 'overlay must emit padding styles');
  // Every padding must be finite >= SAFE_MARGIN and not NaN/Infinity/negative
  for (const s of paddings) {
    for (const k of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'] as const) {
      if (k in s) {
        const v = (s as any)[k];
        assert.ok(Number.isFinite(v), `padding ${k} must be finite, got ${v}`);
        assert.ok(v >= SAFE_MARGIN, `padding ${k} must be >= SAFE_MARGIN (${SAFE_MARGIN}), got ${v}`);
        assert.ok(v >= 0, `padding ${k} must be >=0`);
      }
    }
  }
  // undefined bare insets via as any must fallback to SAFE_MARGIN only
  let bare: TestRenderer.ReactTestRenderer;
  act(() => {
    bare = TestRenderer.create(
      React.createElement(GameOverOverlay, {
        stats: { score: 1, best: 1, maxTile: 2, merges: 1, longestStreak: 1 },
        isNewRecord: false,
        onRestart: () => {},
      } as any)
    );
  });
  const bareStyles = collectStyles(bare!);
  assert.ok(bareStyles.some((s) => s.paddingTop === SAFE_MARGIN), `bare insets must fallback to paddingTop === SAFE_MARGIN (${SAFE_MARGIN})`);
});

test('[P0] overflow guard: value Texts have numberOfLines=1 ellipsizeMode tail flexShrink 1 (DW-101)', async () => {
  await i18n.changeLanguage('pt');
  const { GameOverOverlay } = await import(OVERLAY_SPEC);
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(GameOverOverlay, {
        stats: { score: 1999999999, best: 1999999999, maxTile: 999999, merges: 999, longestStreak: 999 },
        isNewRecord: false,
        onRestart: () => {},
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      } as any)
    );
  });
  const valueNodes = renderer!.root.findAll((n) => (n.type as string) === 'Text' && typeof n.props?.children === 'string' && n.props.children.includes('1999999999'));
  // At least score and best should be present
  assert.ok(valueNodes.length >= 1, 'huge score Text node must exist');
  for (const n of valueNodes) {
    assert.strictEqual(n.props.numberOfLines, 1, 'value Text must have numberOfLines=1');
    assert.strictEqual(n.props.ellipsizeMode, 'tail', 'value Text must have ellipsizeMode tail');
    // style flexShrink:1 must be present (either in node style or in stylesheet)
  }
  const styles = collectStyles(renderer!);
  const hasFlexShrink = styles.some((s) => s.flexShrink === 1 && (s.color === '#1a1d23' || s.color === '#E8A33D'));
  assert.ok(hasFlexShrink, 'value style must have flexShrink:1');
  // Also pin source contains clamp helper defensively (structural guard)
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  assert.ok(src.includes('clampInset') && src.includes('Number.isFinite'), 'source must contain clampInset helper with Number.isFinite');
  assert.ok(src.includes('numberOfLines') && src.includes('ellipsizeMode'), 'source must contain numberOfLines + ellipsizeMode');
  assert.ok(src.includes('flexShrink: 1') || src.includes('flexShrink:1'), 'source must contain flexShrink:1');
});

test('[P0] reducedMotion reactive re-target + unmount mid-fade clears and restarts cleanly (DW-91/DW-102)', async () => {
  await i18n.changeLanguage('pt');
  const { GameOverOverlay } = await import(OVERLAY_SPEC);
  // Start false -> mount animates to 1/1/0
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(GameOverOverlay, {
        stats: { score: 10, best: 20, maxTile: 6, merges: 1, longestStreak: 1 },
        isNewRecord: false,
        onRestart: () => {},
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
        reducedMotion: false,
      } as any)
    );
  });
  // Immediately flip to true -> should snap to 1/1/0
  act(() => {
    renderer!.update(
      React.createElement(GameOverOverlay, {
        stats: { score: 10, best: 20, maxTile: 6, merges: 1, longestStreak: 1 },
        isNewRecord: false,
        onRestart: () => {},
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
        reducedMotion: true,
      } as any)
    );
  });
  let styles = collectStyles(renderer!);
  // After true, opacities must be 1, translateY 0 (via stub setValue)
  for (const s of styles) {
    if ('opacity' in s) {
      const v: any = (s as any).opacity;
      if (v && typeof v === 'object' && '_value' in v) assert.strictEqual(v._value, 1, 'reducedMotion true must set opacity Animated.Value to 1');
    }
    if ('transform' in s) {
      const tr: any = (s as any).transform;
      if (Array.isArray(tr)) for (const e of tr) if (e && 'translateY' in e) {
        const tv: any = e.translateY;
        if (tv && typeof tv === 'object' && '_value' in tv) assert.strictEqual(tv._value, 0, 'reducedMotion true must set translateY to 0');
      }
    }
  }
  // Flip back to false -> should reset to 0/0/12 then animate to 1/1/0 (stub sets toValue immediately => 1)
  act(() => {
    renderer!.update(
      React.createElement(GameOverOverlay, {
        stats: { score: 10, best: 20, maxTile: 6, merges: 1, longestStreak: 1 },
        isNewRecord: false,
        onRestart: () => {},
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
        reducedMotion: false,
      } as any)
    );
  });
  styles = collectStyles(renderer!);
  for (const s of styles) {
    if ('opacity' in s) {
      const v: any = (s as any).opacity;
      if (v && typeof v === 'object' && '_value' in v) assert.strictEqual(v._value, 1, 'toggling back to false must re-animate opacity to 1');
    }
  }
  // Unmount mid-fade must not throw and must cleanup
  assert.doesNotThrow(() => act(() => renderer!.unmount()), 'unmount mid-fade must not throw');
  // Remount immediately must start clean
  let renderer2: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer2 = TestRenderer.create(
      React.createElement(GameOverOverlay, {
        stats: { score: 10, best: 20, maxTile: 6, merges: 1, longestStreak: 1 },
        isNewRecord: false,
        onRestart: () => {},
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
        reducedMotion: false,
      } as any)
    );
  });
  assert.ok(renderer2!.root.findByProps({ accessibilityLabel: 'Jogar de novo' }), 'remount after unmount must render CTA');
  act(() => renderer2!.unmount());

  // Structural guard: reducedMotion effect deps must include reducedMotion and stopAnimation/setValue
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  assert.ok(/useEffect\([^]*reducedMotion[^]*\]\s*\)/.test(src), 'useEffect must depend on reducedMotion');
  assert.ok(src.includes('stopAnimation') && src.includes('setValue(0)') && src.includes('setValue(1)'), 'effect must stopAnimation and re-target via setValue');
});

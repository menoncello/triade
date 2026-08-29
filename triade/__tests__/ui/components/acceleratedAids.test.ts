import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { HIT_TARGET } from '../../../src/ui/PauseButton.tsx';

const SPEC = '../../../src/ui/AcceleratedAids.tsx';

async function renderCeiling(onDismiss: () => void): Promise<TestRenderer.ReactTestRenderer> {
  const { CeilingBanner } = await import(SPEC);
  let r: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(CeilingBanner, { onDismiss }));
  });
  return r!;
}

async function renderStuck(onDismiss: () => void): Promise<TestRenderer.ReactTestRenderer> {
  const { StuckBanner } = await import(SPEC);
  let r: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(StuckBanner, { onDismiss }));
  });
  return r!;
}

function collectStyles(renderer: TestRenderer.ReactTestRenderer): Array<Record<string, any>> {
  const out: Array<Record<string, any>> = [];
  renderer.root.findAll((n) => n.props?.style).forEach((n) => {
    const raw = n.props.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    for (const s of layers) if (s && typeof s === 'object') out.push(s);
  });
  return out;
}

function allText(renderer: TestRenderer.ReactTestRenderer): string[] {
  const parts: string[] = [];
  renderer.root.findAll((n) => (n.type as string) === 'Text').forEach((n) => {
    const c = n.props.children;
    if (Array.isArray(c)) c.forEach((x) => parts.push(String(x ?? '')));
    else parts.push(String(c ?? ''));
  });
  return parts;
}

test('[P0] CeilingBanner renders factual copy, accent edge and 44pt dismiss with a11y', async () => {
  const renderer = await renderCeiling(() => {});
  const texts = allText(renderer);
  assert.ok(texts.some((t) => t.includes('Teto aberto')), `CeilingBanner must contain "Teto aberto — peças maiores podem surgir."; got ${texts.join('|')}`);
  // factual never scolding
  assert.ok(!texts.some((t) => /travad|errad|burro/i.test(t)), 'copy must be factual never scolding');
  // accent edge #E8A33D present
  const styles = collectStyles(renderer);
  assert.ok(styles.some((s) => s.backgroundColor === '#E8A33D'), 'must have accent edge backgroundColor #E8A33D (3pt)');
  assert.ok(styles.some((s) => s.borderColor === '#E8A33D'), 'banner borderColor must be #E8A33D');
  assert.ok(styles.some((s) => s.backgroundColor === '#fff7ec'), 'banner surface must be #fff7ec (surface-raised)');
  // dismiss button 44pt and a11y
  const dismiss = renderer.root.findAll((n) => n.props?.accessibilityLabel === 'Dispensar')[0];
  assert.ok(dismiss, 'dismiss button must have accessibilityLabel Dispensar');
  assert.equal(dismiss.props.accessibilityRole, 'button', 'dismiss must be button');
  const dismissStyles = collectStyles(renderer).filter((s) => s.minHeight >= HIT_TARGET || s.minWidth >= HIT_TARGET);
  assert.ok(dismissStyles.length > 0, `dismiss must meet HIT_TARGET ${HIT_TARGET}pt`);
  // find specific dismiss btn styles
  const btnStyles = styles.filter((s) => s.minHeight === HIT_TARGET || s.minWidth === HIT_TARGET);
  assert.ok(btnStyles.some((s) => s.minHeight === HIT_TARGET), 'dismiss minHeight must be HIT_TARGET');
  assert.ok(btnStyles.some((s) => s.minWidth === HIT_TARGET), 'dismiss minWidth must be HIT_TARGET');
  // banner a11y label
  const banner = renderer.root.findAll((n) => n.props?.accessibilityLabel === 'indicador de teto')[0];
  assert.ok(banner, 'banner must have accessibilityLabel "indicador de teto"');
});

test('[P0] StuckBanner renders factual copy, accent and dismiss', async () => {
  const renderer = await renderStuck(() => {});
  const texts = allText(renderer);
  assert.ok(texts.some((t) => t.includes('Pouco espaço')), `StuckBanner must contain "Pouco espaço — procure fusões."; got ${texts.join('|')}`);
  assert.ok(!texts.some((t) => /travad|culpa/i.test(t)), 'stuck copy factual never scolding');
  const styles = collectStyles(renderer);
  assert.ok(styles.some((s) => s.backgroundColor === '#E8A33D'), 'accent edge #E8A33D required');
  assert.ok(styles.some((s) => s.backgroundColor === '#fff7ec'), 'surface #fff7ec required');
  const dismiss = renderer.root.findAll((n) => n.props?.accessibilityLabel === 'Dispensar')[0];
  assert.ok(dismiss, 'dismiss button must exist');
  assert.equal(dismiss.props.accessibilityRole, 'button');
  // 44pt
  assert.ok(collectStyles(renderer).some((s) => s.minHeight === HIT_TARGET && s.minWidth === HIT_TARGET), 'dismiss must be 44pt both dims');
  const banner = renderer.root.findAll((n) => n.props?.accessibilityLabel === 'aviso de travamento')[0];
  assert.ok(banner, 'banner must have accessibilityLabel "aviso de travamento"');
});

test('[P0] Ceiling/Stuck onDismiss called and banner does not block board gesture', async () => {
  let ceilingCalls = 0;
  const rCeiling = await renderCeiling(() => ceilingCalls++);
  const cBtn = rCeiling.root.findAll((n) => n.props?.accessibilityLabel === 'Dispensar')[0];
  act(() => cBtn.props.onPress());
  assert.equal(ceilingCalls, 1, 'Ceiling onDismiss must be called once');
  let stuckCalls = 0;
  const rStuck = await renderStuck(() => stuckCalls++);
  const sBtn = rStuck.root.findAll((n) => n.props?.accessibilityLabel === 'Dispensar')[0];
  act(() => sBtn.props.onPress());
  assert.equal(stuckCalls, 1, 'Stuck onDismiss must be called once');
  // banner is View not capturing swipe — no GestureDetector inside
  const json = JSON.stringify(rCeiling.toJSON());
  assert.ok(!json.includes('GestureDetector') && !json.includes('Pan'), 'banner must not contain gesture — non-blocking View');
});

test('[P1] AcceleratedAids source has TODO 5.4 waiver and pure copy', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/AcceleratedAids.tsx'), 'utf8');
  assert.ok(src.includes("TODO 5.4: t('accelerated.ceilingHint')"), 'CeilingBanner must have // TODO 5.4: t(\'accelerated.ceilingHint\') waiver');
  assert.ok(src.includes("TODO 5.4: t('accelerated.stuckHint')"), 'StuckBanner must have // TODO 5.4: t(\'accelerated.stuckHint\') waiver');
  assert.ok(src.includes("HIT_TARGET"), 'must reference HIT_TARGET for 44pt');
  assert.ok(!src.includes('Math.random'), 'banner must not use Math.random');
  assert.ok(!src.includes('ceilingDetector'), 'banner is presentational — must not import ceiling logic');
});

test('[P1] Banner styles hold 13pt muted copy and 20pt dismiss plus container constraints', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/AcceleratedAids.tsx'), 'utf8');
  assert.ok(/fontSize:\s*13/.test(src), 'bannerText must be 13pt');
  assert.ok(/fontSize:\s*20/.test(src), 'dismissLabel must be 20pt');
  assert.ok(/maxWidth:\s*420/.test(src), 'banner maxWidth 420');
  assert.ok(/borderRadius:\s*8/.test(src), 'banner borderRadius 8');
  assert.ok(/width:\s*3/.test(src), 'accent edge width 3');
});

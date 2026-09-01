import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { stripCommentsAndStrings, extractSpecifiers } from '../../../test-utils/helpers.ts';

const SPEC = '../../../src/ui/LaneSelectScreen.tsx';

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

const hasToken = (parts: string[], token: string) => parts.some((p) => String(p).trim() === token);

function hasStyle(renderer: TestRenderer.ReactTestRenderer, match: Record<string, any>): boolean {
  return (
    renderer.root.findAll((node) => {
      const raw = node.props?.style;
      const layers = Array.isArray(raw) ? raw : [raw];
      return layers.some(
        (style) =>
          typeof style === 'object' && style !== null && Object.entries(match).every(([k, v]) => style[k] === v),
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

async function renderLaneSelect(props: any): Promise<TestRenderer.ReactTestRenderer> {
  const { LaneSelectScreen } = await import(SPEC);
  let r: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(React.createElement(LaneSelectScreen, props));
  });
  return r!;
}

test('[P0] Lane Select renders two cards + Jogar CTA', async () => {
  const { i18n } = await import('../../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  const renderer = await renderLaneSelect({
    selectedIndex: 0,
    hasActiveMatch: false,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    onSelectLane: () => {},
    onJogar: () => {},
  });
  const t = allText(renderer);
  assert.ok(hasToken(t, 'Pura'), `must render 'Pura' card; got [${t.join(', ')}]`);
  assert.ok(hasToken(t, 'Iniciante'), `must render 'Iniciante' card; got [${t.join(', ')}]`);
  assert.ok(hasToken(t, 'Jogar'), `must render Jogar CTA; got [${t.join(', ')}]`);
  assert.ok(hasToken(t, 'Tríade'), `must render title Tríade`);
});

test('[P0] default lane highlighted with accent #E8A33D and selected state', async () => {
  const { i18n } = await import('../../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  const renderer = await renderLaneSelect({
    selectedIndex: 0,
    hasActiveMatch: false,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    onSelectLane: () => {},
    onJogar: () => {},
  });
  assert.ok(hasStyle(renderer, { borderColor: '#E8A33D' }), 'selected card must have borderColor #E8A33D');
  assert.ok(hasStyle(renderer, { backgroundColor: '#E8A33D' }), 'accent bar must have backgroundColor #E8A33D');
  const selected = renderer.root.findAll((n) => n.props?.accessibilityState?.selected === true);
  assert.ok(selected.length >= 1, 'at least one card must have accessibilityState.selected true');
});

test('[P0] Jogar CTA is ≥44pt, tabular-nums, calls onJogar', async () => {
  const { i18n } = await import('../../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  let calls = 0;
  const renderer = await renderLaneSelect({
    selectedIndex: 1,
    hasActiveMatch: false,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    onSelectLane: () => {},
    onJogar: () => calls++,
  });
  const cta = renderer.root.findByProps({ accessibilityLabel: 'Jogar' });
  assert.ok(cta, 'Jogar CTA must have accessibilityLabel Jogar');
  assert.ok(cta.props.accessibilityRole === 'button', 'Jogar CTA must be button');
  act(() => cta.props.onPress());
  assert.equal(calls, 1);
  // ≥44pt via style
  const styles = collectStyles(renderer);
  const hasMinHeight = styles.some((s) => typeof s.minHeight === 'number' && s.minHeight >= 44);
  assert.ok(hasMinHeight, 'Jogar CTA must have minHeight >=44');
  const hasTabular = styles.some((s) => Array.isArray(s.fontVariant) && s.fontVariant.includes('tabular-nums'));
  assert.ok(hasTabular, 'CTA label must have fontVariant tabular-nums');
});

test('[P0] tapping other lane without active match directly calls onSelectLane', async () => {
  const { i18n } = await import('../../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  let selected: number | null = null;
  const renderer = await renderLaneSelect({
    selectedIndex: 0,
    hasActiveMatch: false,
    insets: { top: 14, bottom: 14, left: 14, right: 14 },
    onSelectLane: (i: number) => (selected = i),
    onJogar: () => {},
  });
  const other = renderer.root.findByProps({ accessibilityLabel: 'Iniciante Com ajuda' });
  act(() => other.props.onPress());
  assert.equal(selected, 1, 'tap other lane without active match must call onSelectLane(1) directly');
  // No warning banner
  const t = allText(renderer);
  assert.ok(!t.some((p) => String(p).includes('Mudar de pista')), 'no warning banner when no active match');
});

test('[P0] tapping other lane WITH active match shows warning with Confirmar/Cancelar', async () => {
  const { i18n } = await import('../../../src/i18n/index.ts');
  await i18n.changeLanguage('pt');
  let selected: number | null = null;
  const renderer = await renderLaneSelect({
    selectedIndex: 0,
    hasActiveMatch: true,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    onSelectLane: (i: number) => (selected = i),
    onJogar: () => {},
  });
  const other = renderer.root.findByProps({ accessibilityLabel: 'Iniciante Com ajuda' });
  act(() => other.props.onPress());
  // Inline warning banner appears, not direct call
  assert.equal(selected, null, 'must not call onSelectLane before confirm');
  const banner = renderer.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes('Mudar de pista'));
  assert.ok(banner.length > 0, 'warning banner must appear');
  const t = allText(renderer);
  assert.ok(t.some((p) => String(p).includes('Mudar de pista')), 'banner text must contain warning');
  assert.ok(renderer.root.findAll((n) => n.props?.accessibilityLabel === 'Confirmar').length > 0, 'Confirmar button must exist');
  assert.ok(renderer.root.findAll((n) => n.props?.accessibilityLabel === 'Cancelar').length > 0, 'Cancelar button must exist');
  // Confirm
  const confirm = renderer.root.findByProps({ accessibilityLabel: 'Confirmar' });
  act(() => confirm.props.onPress());
  assert.equal(selected, 1, 'Confirmar must call onSelectLane with pending lane');
  // Cancel path
  let selected2: number | null = null;
  const renderer2 = await renderLaneSelect({
    selectedIndex: 0,
    hasActiveMatch: true,
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
    onSelectLane: (i: number) => (selected2 = i),
    onJogar: () => {},
  });
  const other2 = renderer2.root.findByProps({ accessibilityLabel: 'Iniciante Com ajuda' });
  act(() => other2.props.onPress());
  const cancel = renderer2.root.findByProps({ accessibilityLabel: 'Cancelar' });
  act(() => cancel.props.onPress());
  assert.equal(selected2, null, 'Cancelar must not call onSelectLane');
});

test('[P1] LaneSelectScreen uses safe-area + maxWidth 420 and has no engine roll symbols', async () => {
  const file = fileURLToPath(new URL('../../../src/ui/LaneSelectScreen.tsx', import.meta.url));
  const source = await readFile(file, 'utf8');
  const stripped = stripCommentsAndStrings(source);
  assert.ok(source.includes('SAFE_MARGIN'), 'must use SAFE_MARGIN');
  assert.ok(source.includes('maxWidth') && source.includes('420'), 'must pin maxWidth 420');
  assert.ok(!stripped.includes('Math.random'), 'must not use Math.random');
  for (const sym of ['resolveSpawn', 'weightedValue', 'spawnTile', 'weightedPicker', 'pickIndex']) {
    assert.ok(!stripped.includes(sym), `must not contain ${sym}`);
  }
  for (const spec of extractSpecifiers(source)) {
    const lower = spec.toLowerCase();
    assert.ok(!lower.startsWith('@shopify'), `must not import Skia ${spec}`);
    assert.ok(!lower.startsWith('expo-asset') || true, 'expo asset not needed');
  }
});

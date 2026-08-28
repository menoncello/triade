import { test } from 'node:test';
import assert from 'node:assert';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';

// Story 6.4 — Novo recorde como número destacado (D-013, UX-DR-12)
// `triade/src/ui/GameOverOverlay.tsx` already ships highlight via 6.1
// (isNewRecord ? styles.valueRecord : styles.value on score & best, valueRecord #E8A33D,
// a11yLabel "Novo recorde"). 6.4 verifies/strengthens: highlight is number not event,
// no celebration (AC2/3), contrast + color-blind carriers (AC4), ceiling ladder no banner,
// and App wiring sessionStartBestRef gating. ATDD RED→GREEN verified (453/5 skipped → 458/0 active):
// direct `import(SPEC)` + `stripCommentsAndStrings` pinning kept; suite stays CI-green
// with all 5 pins GREEN on HEAD `842966a+5` — verify story — stays GREEN after strengthen.
// Per TEST-QUALITY / component-tdd / timing-debugging guidance.

const SPEC = '../../../src/ui/GameOverOverlay.tsx';

// Helpers copied from hud.test.ts / previewCard.test.ts / gameOverOverlay.test.ts — copy, don't import
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
  insets?: { top: number; bottom: number; left: number; right: number };
};

function baseProps(overrides: Partial<OverlayProps> = {}): OverlayProps {
  return {
    stats: { score: 123, best: 456, maxTile: 48, merges: 7, longestStreak: 3 },
    isNewRecord: false,
    onRestart: () => {},
    reducedMotion: false,
    insets: { top: 10, bottom: 10, left: 10, right: 10 },
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

// ── P0 AC1: highlight is number not event ───────────────────────────────

test('[P0] AC1 highlight is number not event — isNewRecord true renders valueRecord #E8A33D, false renders no accent', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);

  assert.ok(/isNewRecord\s*\?\s*styles\.valueRecord\s*:\s*styles\.value/.test(stripped), 'GameOverOverlay.tsx must contain `isNewRecord ? styles.valueRecord : styles.value` ternary on score/best rows (AC1, D-013)');
  const ternaryCount = (stripped.match(/isNewRecord\s*\?\s*styles\.valueRecord\s*:\s*styles\.value/g) || []).length;
  assert.ok(ternaryCount >= 2, `isNewRecord ternary must appear at least twice (score + best rows), got ${ternaryCount}`);

  assert.ok(src.includes('#E8A33D'), 'valueRecord must be #E8A33D accent token (DESIGN.md:153 game-over-stat-row.recordColor {colors.accent})');
  assert.ok(/valueRecord\s*:\s*\{[^}]*color\s*:\s*['"]#E8A33D['"]/.test(src), 'valueRecord style definition must be `{ color: \'#E8A33D\' }`');
  assert.ok(/valueRecord[^}]*fontVariant\s*:\s*\[.*tabular-nums.*\]/.test(src), 'valueRecord must preserve fontVariant: [\'tabular-nums\'] (E9 shape/text, DESIGN.md:261)');

  assert.ok(/a11yLabel[\s\S]*isNewRecord\s*\?\s*['"] Novo recorde['"]/.test(src) || /a11yLabel[\s\S]*\(isNewRecord \? ' Novo recorde' : ''\)/.test(src), 'a11yLabel must append " Novo recorde" when isNewRecord true (UX-DR-2 announcement contract)');

  const off = await renderOverlay({ isNewRecord: false });
  const on = await renderOverlay({ isNewRecord: true });

  const isStrictValueRecord = (s: any) => s && typeof s === 'object' && s.color === '#E8A33D' && s.fontVariant?.includes?.('tabular-nums') && s.fontWeight === '500';
  const offHasAccentValue = off.root.findAll((node) => {
    const raw = node.props?.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    return layers.some(isStrictValueRecord);
  }).length > 0;
  assert.strictEqual(offHasAccentValue, false, 'isNewRecord=false must not render valueRecord #E8A33D tabular-nums 500 on stat rows — accent only when true');
  // tighter: score/best Text nodes specifically must not carry valueRecord when false
  for (const token of ['123', '456']) {
    const offTokenAccent = off.root.findAll((n) => (n.type as string) === 'Text' && String(n.props.children) === token).some((n) => {
      const raw = (n.props as any)?.style;
      const layers = Array.isArray(raw) ? raw : [raw];
      return layers.some(isStrictValueRecord);
    });
    assert.strictEqual(offTokenAccent, false, `isNewRecord=false Text "${token}" must not carry valueRecord`);
  }

  const onHasAccentValue = on.root.findAll((node) => {
    const raw = node.props?.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    return layers.some(isStrictValueRecord);
  }).length > 0;
  assert.ok(onHasAccentValue, 'isNewRecord=true must highlight value with strict valueRecord #E8A33D tabular-nums 500 (symmetric to off check)');
  // tighter: score/best Text nodes must carry valueRecord when true (both rows per spec 71,76)
  for (const token of ['123', '456']) {
    const onTokenAccent = on.root.findAll((n) => (n.type as string) === 'Text' && String(n.props.children) === token).some((n) => {
      const raw = (n.props as any)?.style;
      const layers = Array.isArray(raw) ? raw : [raw];
      return layers.some(isStrictValueRecord);
    });
    assert.ok(onTokenAccent, `isNewRecord=true Text "${token}" must carry valueRecord #E8A33D tabular-nums 500`);
  }

  const tOn = allText(on);
  for (const token of ['123', '456']) {
    assert.ok(hasToken(tOn, token), `isNewRecord=true overlay must still render stat token "${token}" as own text node; got [${tOn.join(', ')}]`);
  }

  const labelsOn = on.root
    .findAll((n) => typeof n.props?.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel)
    .join(' | ');
  assert.ok(labelsOn.toLowerCase().includes('novo recorde'), `isNewRecord=true a11y must include "Novo recorde"; got "${labelsOn}"`);

  const labelsOff = off.root
    .findAll((n) => typeof n.props?.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel)
    .join(' | ');
  assert.ok(!labelsOff.toLowerCase().includes('novo recorde'), `isNewRecord=false a11y must NOT include "Novo recorde"; got "${labelsOff}"`);

  act(() => {
    off.unmount();
    on.unmount();
  });
});

// ── P0 AC2/AC3: no celebration ──────────────────────────────────────────

test('[P0] AC2/AC3 no celebration — stripped source has no confetti/celebrat/lottie/reward/particleBurst/shakeMs and rendered overlay has no second CTA/banner/confetti node', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);

  assert.ok(!/confetti|celebrat|lottie|reward/i.test(stripped), 'GameOverOverlay.tsx must not contain confetti/celebrat/lottie/reward strings (AC2/3 D-013 no celebration)');
  assert.ok(!stripped.includes('particleBurst') && !stripped.includes('shakeMs'), 'GameOverOverlay.tsx must not contain Epic 8 feel symbols particleBurst/shakeMs (AC2/3)');
  assert.ok(!stripped.includes('Confetti') && !/Lottie/.test(src), 'must not import Confetti/Lottie');
  assert.ok(!/congrat|banner/i.test(stripped), 'must not contain congrat/banner as new-record event');
  assert.ok(!src.includes('expo-haptics') && !src.includes('expo-audio'), 'GameOverOverlay.tsx must not import expo-haptics/expo-audio to gate record highlight (Epic 8 feel owned elsewhere)');
  assert.ok(!/Dialog/.test(stripped), 'GameOverOverlay.tsx must not contain Dialog (AA2 strict, not || loophole)');
  assert.ok(stripped.includes('accessibilityViewIsModal'), 'must keep accessibilityViewIsModal (outer) pin separate from Dialog ban');
  assert.ok(!/shake|bounce|celebrat/i.test(stripped), 'no shake/bounce/celebrat animation outside existing fade/drift');

  const renderer = await renderOverlay({ isNewRecord: true });
  const buttons = renderer.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'button');
  assert.strictEqual(buttons.length, 1, 'overlay must have exactly one button (Jogar de novo) — no second Continue/Continue offer');
  assert.ok(renderer.root.findByProps({ accessibilityLabel: 'Jogar de novo' }), 'CTA must be "Jogar de novo"');

  const continuars = renderer.root.findAll((n) => n.props?.accessibilityLabel === 'Continuar' || String(n.props?.children ?? '').includes('Novo recorde!'));
  assert.strictEqual(continuars.length, 0, 'must not render second CTA/banner "Continuar" or "Novo recorde!" banner — record is number highlight, not event');

  const confettiNodes = renderer.root.findAll((n) => String((n.type as any)?.displayName ?? (n.type as any)?.name ?? n.type ?? '').toLowerCase().includes('confetti'));
  assert.strictEqual(confettiNodes.length, 0, 'must not render Confetti composite node');

  const off = await renderOverlay({ isNewRecord: false });
  assert.strictEqual(off.root.findAll((n) => n.props?.accessibilityLabel === 'Continuar').length, 0, 'isNewRecord=false also must not render Continuar');

  act(() => {
    renderer.unmount();
    off.unmount();
  });
});

// ── P1 AC4: contrast & color-blind ──────────────────────────────────────

test('[P1] AC4 contrast & color-blind — valueRecord #E8A33D token + tabular-nums preserved, muted/text tokens unchanged, shape/text beyond color', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');

  assert.ok(/valueRecord\s*:\s*\{[^}]*color\s*:\s*['"]#E8A33D['"]/.test(src), 'valueRecord: { color: \'#E8A33D\' } must match DESIGN.md components.game-over-stat-row.recordColor {colors.accent}');
  assert.ok(src.includes('#E8A33D'), 'source must keep accent #E8A33D (same as PreviewCard value ink 20pt + leaderboard-tab activeFill)');
  // P7 fix: count only value/valueRecord, not ctaLabel (ctlLabel also has tabular-nums but must not mask missing value/valueRecord)
  const tabularMatches = (src.match(/(?:valueRecord|value)\s*:\s*\{[^}]*fontVariant\s*:\s*\[.*tabular-nums.*\]/g) || []).length;
  assert.ok(tabularMatches >= 2, `fontVariant ['tabular-nums'] must appear on both value and valueRecord (ctaLabel excluded), got ${tabularMatches} (E9 shape/text)`);
  assert.ok(src.includes('#8a8578'), 'stat label must stay muted #8a8578 (DESIGN.md token)');
  assert.ok(src.includes('#1a1d23'), 'stat value must stay text #1a1d23 (DESIGN.md token)');
  assert.ok(src.includes('#fff') || src.includes('"#fff"') || src.includes("'#fff'"), 'overlay content background must stay #fff (card)');
  assert.ok(src.includes('#1C1206'), 'CTA label must stay dark ink #1C1206 (~8.6:1 on accent, DESIGN.md)');

  const on = await renderOverlay({ isNewRecord: true });
  assert.ok(hasStyle(on, { color: '#E8A33D' }), 'isNewRecord=true must highlight #E8A33D');
  const stylesOn = collectStyles(on);
  assert.ok(stylesOn.some((s) => s.color === '#8a8578'), 'label must use muted #8a8578 even when isNewRecord true');
  assert.ok(stylesOn.some((s) => s.color === '#1a1d23'), 'value must use text #1a1d23 even when accent highlight present (non-record rows)');
  // P7 fix: tabular-nums must be on value/valueRecord colors, not just CTA label #1C1206
  const hasTabularValue = stylesOn.some((s) => s.color === '#1a1d23' && Array.isArray(s.fontVariant) && s.fontVariant.includes('tabular-nums'));
  const hasTabularRecord = stylesOn.some((s) => s.color === '#E8A33D' && Array.isArray(s.fontVariant) && s.fontVariant.includes('tabular-nums') && s.fontWeight === '500');
  assert.ok(hasTabularValue, 'rendered value #1a1d23 must have fontVariant tabular-nums (E9 shape/text)');
  assert.ok(hasTabularRecord, 'rendered valueRecord #E8A33D must have fontVariant tabular-nums 500 (E9, CTA #1C1206 excluded)');

  const off = await renderOverlay({ isNewRecord: false });
  const stylesOff = collectStyles(off);
  assert.ok(stylesOff.some((s) => s.color === '#8a8578'), 'label muted #8a8578 must persist when isNewRecord false');
  assert.ok(stylesOff.some((s) => s.color === '#1a1d23'), 'value text #1a1d23 must persist when isNewRecord false');

  act(() => {
    on.unmount();
    off.unmount();
  });
});

// ── P1 AC3: ceiling ladder produces no celebration ──────────────────────

test('[P1] AC3 ceiling ladder produces no celebration — increasing ceilingDetector still only isNewRecord highlight, thin-view no engine import', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { extractNamedImports, stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const overlaySrc = readFileSync(join(here, '../../../src/ui/GameOverOverlay.tsx'), 'utf8');
  const overlayStripped = stripCommentsAndStrings(overlaySrc);

  for (const spec of extractNamedImports(overlaySrc).map((r: any) => r.specifier)) {
    assert.ok(!/(^|\/)engine(\/|$)/.test(spec), `GameOverOverlay.tsx must not import from engine: '${spec}' (thin-view, ADR-01)`);
  }
  assert.ok(!/ceilingDetector|tierForCeiling|potForTier/.test(overlayStripped), 'GameOverOverlay.tsx must not reference ceilingDetector|tierForCeiling|potForTier (thin-view: overlay only renders stats.maxTile prop)');
  assert.ok(!overlayStripped.includes('Math.random'), 'GameOverOverlay.tsx must not contain Math.random (ui.norolls)');
  for (const sym of ['resolveSpawn', 'weightedValue', 'spawnTile', 'weightedPicker', 'pickIndex']) {
    assert.ok(!overlayStripped.includes(sym), `GameOverOverlay.tsx must not contain roll symbol '${sym}' (ui.norolls)`);
  }

  const tiers = [3, 6, 12, 24, 48, 96, 192, 384, 768, 1536];
  for (const maxTile of tiers) {
    const off = await renderOverlay({ stats: { score: 100, best: 200, maxTile, merges: 2, longestStreak: 1 }, isNewRecord: false });
    const offHasAccentValue = off.root.findAll((node) => {
      const raw = node.props?.style;
      const layers = Array.isArray(raw) ? raw : [raw];
      return layers.some((s: any) => s && typeof s === 'object' && s.color === '#E8A33D' && s.fontVariant?.includes?.('tabular-nums') && s.fontWeight === '500');
    }).length > 0;
    assert.strictEqual(offHasAccentValue, false, `maxTile ${maxTile} isNewRecord=false must not show valueRecord accent (no tier-crossing highlight)`);
    assert.strictEqual(off.root.findAll((n) => n.props?.accessibilityLabel === 'Continuar').length, 0, `maxTile ${maxTile} must not render Continuar banner`);
    const confetti = off.root.findAll((n) => String((n.type as any)?.displayName ?? n.type ?? '').toLowerCase().includes('confetti'));
    assert.strictEqual(confetti.length, 0, `maxTile ${maxTile} must not render Confetti node`);

    const on = await renderOverlay({ stats: { score: 300, best: 300, maxTile, merges: 5, longestStreak: 2 }, isNewRecord: true });
    assert.ok(hasStyle(on, { color: '#E8A33D' }), `maxTile ${maxTile} isNewRecord=true must still highlight #E8A33D (number, not tier celebration)`);
    assert.strictEqual(on.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'button').length, 1, `maxTile ${maxTile} isNewRecord=true still single CTA`);
    act(() => {
      off.unmount();
      on.unmount();
    });
  }

  const appSrc = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const appStripped = stripCommentsAndStrings(appSrc);
  assert.ok(/availablePot\s*=\s*potForTier\s*\(\s*tierForCeiling\s*\(\s*ceilingDetector\s*\(\s*game\.board\s*\)\s*\)/.test(appSrc), 'App.tsx must keep availablePot = potForTier(tierForCeiling(ceilingDetector(game.board))) once per render (review patch F2)');
  assert.ok(appStripped.includes('ceilingDetector'), 'App.tsx must still import ceilingDetector (ladder lives in orchestrator, not overlay)');
});

// ── P0 AC1/T2: App wiring sessionStartBestRef gating ────────────────────

test('[P0] AC1/T2 App wiring sessionStartBestRef gating — isNewRecord(sessionStartBestRef.current, match.score) and handleRestart never writes sessionStartBestRef', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const { stripCommentsAndStrings } = await import('../../../test-utils/helpers.ts');
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../../../App.tsx'), 'utf8');
  const stripped = stripCommentsAndStrings(src);

  assert.ok(/isNewRecord\s*\(\s*sessionStartBest/.test(stripped), 'App.tsx must pass isNewRecord(sessionStartBest*Ref.current, match.score) to GameOverOverlay (session-start best gating preserves highlight across restarts)');
  assert.ok(/sessionStartBest.*\.current/.test(src), 'sessionStartBest*Ref.current must be seeded at hydration');
  assert.ok(/isNewRecord=\{isNewRecord\(sessionStartBest/.test(src), 'GameOverOverlay isNewRecord prop must be isNewRecord(sessionStartBest*Ref.current, match.score)');

  const handleStart = src.indexOf('const handleRestart');
  assert.ok(handleStart !== -1, 'App.tsx must define const handleRestart = useCallback');
  const handleSlice = src.slice(handleStart, handleStart + 1200);
  const handleStripped = stripCommentsAndStrings(handleSlice);

  assert.ok(!/sessionStartBest.*\.current\s*=\s*persistedBest/.test(handleStripped), 'handleRestart must NOT set sessionStartBest*Ref.current = persistedBest — ref stays session-start so isNewRecord highlight remains correct');
  assert.ok(!/sessionStartBest.*\.current\s*=\s*match\.best/.test(handleStripped), 'handleRestart must NOT set sessionStartBest*Ref.current = match.best (match.best leak would hide record after restart per matchScore.test.ts:58-65 pin)');
  assert.ok(!/sessionStartBest.*\.current\s*=/.test(handleStripped), 'handleRestart must never write sessionStartBest*Ref.current at all');

  assert.ok(/handleRestart[\s\S]*?},\s*\[.*persistedBest/.test(src), 'handleRestart deps must include persistedBest* (or persistedBestByLane after 3.4)');
  assert.ok(!/handleRestart[\s\S]*?match\.best/.test(handleSlice), 'handleRestart must not depend on match.best');

  const order = [
    /const\s+s\s*=\s*newGame\s*\(\s*rngRef\.current\s*\)/,
    /setGame\s*\(\s*s\s*\)/,
    /setMoveResult\s*\(\s*null\s*\)/,
    /setMatch\s*\(\s*initialScore\s*\(\s*persistedBest/,
    /setMatchStats\s*\(\s*initialStats\s*\(\s*s\.board\s*\)\s*\)/,
    /busyRef\.current\s*=\s*false/,
  ];
  let lastIdx = -1;
  for (const re of order) {
    const idx = handleSlice.search(re);
    assert.ok(idx !== -1, `handleRestart body must contain \`${re.source}\` in order (6.3 Pin)`);
    assert.ok(idx > lastIdx, `handleRestart ordering violated for \`${re.source}\``);
    lastIdx = idx;
  }

  assert.ok(!/confetti|celebrat|lottie/i.test(handleStripped), 'handleRestart must not contain confetti/celebrat/lottie (no celebration for record in MVP)');

  const { isNewRecord } = await import('../../../src/game/matchScore.ts');
  const storedBest = 100;
  assert.strictEqual(isNewRecord(storedBest, 150), true, 'isNewRecord(stored 100, score 150) must be true');
  assert.strictEqual(isNewRecord(150, 150), false, 'isNewRecord(live best 150, score 150) must be false — live best equals score hides record (pin from matchScore.test.ts:58-65)');
  assert.strictEqual(isNewRecord(storedBest, 100), false, 'isNewRecord(stored 100, score 100) must be false (not >)');
  // P6 zero boundary: first game best=0 score=0 must NOT highlight (strict >)
  assert.strictEqual(isNewRecord(0, 0), false, 'isNewRecord(0,0) must be false — first game 0 score not a record');
  assert.strictEqual(isNewRecord(0, 1), true, 'isNewRecord(0,1) must be true — 1 point beats 0');
  const zeroOff = await renderOverlay({ stats: { score: 0, best: 0, maxTile: 3, merges: 0, longestStreak: 0 }, isNewRecord: isNewRecord(0, 0) });
  const isStrict = (s: any) => s && typeof s === 'object' && s.color === '#E8A33D' && s.fontVariant?.includes?.('tabular-nums') && s.fontWeight === '500';
  const zeroHasAccent = zeroOff.root.findAll((node: any) => {
    const raw = node.props?.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    return layers.some(isStrict);
  }).length > 0;
  assert.strictEqual(zeroHasAccent, false, 'score 0 with best 0 isNewRecord=false must not show valueRecord accent');
  act(() => zeroOff.unmount());
});

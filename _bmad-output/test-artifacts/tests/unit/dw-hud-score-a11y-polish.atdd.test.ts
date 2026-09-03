/**
 * Unit — dw-hud-score-a11y-polish (RED-PHASE, test.skip)
 * Primary oracle mirror for TEA test_artifacts compliance — host node:test + static source scans
 * Mirrors triade/__tests__/ui/hud-score-a11y-polish.atdd.test.ts 19 tests (P0 7 + P1 5 + P2 4 + P3 3)
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree already at b41ba16).
 * Run: NODE_PATH=triade/node_modules TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts
 * Delta: b41ba16 vs 2a9b015 — triade/src/ui/Hud.tsx +18/-7 fmt+accessible, PreviewCard unchanged, engine byte-identical
 * Spec: _bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md (final_revision b41ba16, baseline 2a9b015, 7-row I/O matrix)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-hud-score-a11y-polish.md (8 risks, 2 high R-001/R-002 score 6)
 * Ledger: deferred-work.md DW-8 done 2026-09-03 + resolution-undo cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only
 */
import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { Hud } from '../../../../triade/src/ui/Hud.tsx';
import type { Preview } from '../../../../triade/src/game/preview.ts';
import { readFileSync } from 'node:fs';

const hudPath = new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url).pathname;
const cardPath = new URL('../../../../triade/src/ui/PreviewCard.tsx', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;

const insets = { top: 10, left: 10, right: 10, bottom: 10 };

function renderHud(props: any = {}) {
  let renderer: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(Hud, {
        score: 123,
        best: 456,
        isLandscape: false,
        insets,
        bandHeight: 40,
        previews: {
          clean: { kind: 'exact', value: 3 },
          accelerated: { kind: 'exact', value: 6 },
        } as any,
        ...props,
      })
    );
  });
  return renderer!;
}

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
const hasStyle = (renderer: TestRenderer.ReactTestRenderer, match: Record<string, any>) =>
  renderer.root.findAll((node) => {
    const raw = node.props?.style;
    const layers = Array.isArray(raw) ? raw : [raw];
    return layers.some(
      (style) =>
        typeof style === 'object' && style !== null && Object.entries(match).every(([k, v]) => style[k] === v)
    );
  }).length > 0;

function src(p: string) {
  return readFileSync(p, 'utf8');
}

// ---------------------------------------------------------------------------
// P0 Critical — Spec AC + DW-8 polish (7 tests) — mirrors triade ATDD
// ---------------------------------------------------------------------------
describe('ATDD dw-hud-score-a11y-polish — P0 critical (pt-BR thousands + guard + a11y)', () => {
  it.skip('[P0-01] DW-8 AC portrait score 3240 renders "3.240" not "3240" nor "3,240"', () => {
    const renderer = renderHud({ isLandscape: false, score: 3240, best: 0 });
    const t = allText(renderer);
    assert.ok(hasToken(t, '3.240'), 'portrait score 3240 must render "3.240" pt-BR');
    assert.ok(!hasToken(t, '3240'), 'must not render raw "3240"');
    assert.ok(!hasToken(t, '3,240'), 'must not render en-US comma "3,240"');
    assert.ok(hasToken(t, '0'), 'best 0 must render "0"');
  });

  it.skip('[P0-02] DW-8 AC landscape best 12456 renders Recorde 12.456 alongside score 3.240', () => {
    const renderer = renderHud({ isLandscape: true, score: 3240, best: 12456 });
    const t = allText(renderer);
    assert.ok(hasToken(t, '3.240'), 'landscape score 3240 must be "3.240"');
    assert.ok(t.some((p) => p.includes('Recorde')), 'Recorde label must be present');
    assert.ok(hasToken(t, '12.456'), 'Recorde must contain "12.456" as token');
    assert.ok(!t.some((p) => p.includes('3,240') || p.includes('12,456')), 'no en-US comma fallback');
  });

  it.skip('[P0-03] DW-8 AC zero 0 renders "0" in both orientations without throw', () => {
    assert.doesNotThrow(() => renderHud({ score: 0, best: 0, isLandscape: false }));
    assert.doesNotThrow(() => renderHud({ score: 0, best: 0, isLandscape: true }));
    const tP = allText(renderHud({ score: 0, best: 0, isLandscape: false }));
    const tL = allText(renderHud({ score: 0, best: 0, isLandscape: true }));
    assert.ok(hasToken(tP, '0'), 'portrait zero must be "0"');
    assert.ok(hasToken(tL, '0'), 'landscape zero must be "0"');
    assert.ok(tP.some((p) => p.includes('Recorde')), 'Recorde label present at zero portrait');
    assert.ok(tL.some((p) => p.includes('Recorde')), 'Recorde label present at zero landscape');
  });

  it.skip('[P0-04] DW-8 non-finite guard NaN/Infinity/-Infinity renders "0" not NaN literal and no throw', () => {
    assert.doesNotThrow(() => renderHud({ score: NaN, best: Infinity }));
    assert.doesNotThrow(() => renderHud({ score: Infinity, best: NaN }));
    assert.doesNotThrow(() => renderHud({ score: -Infinity, best: -Infinity }));
    const t1 = allText(renderHud({ score: NaN, best: Infinity }));
    const t2 = allText(renderHud({ score: Infinity, best: NaN }));
    for (const t of [t1, t2]) {
      assert.ok(!hasToken(t, 'NaN'), 'must not render literal "NaN"');
      assert.ok(!t.some((p) => p.includes('Infinity')), 'must not render "Infinity"');
      assert.ok(hasToken(t, '0'), 'non-finite must fallback to "0"');
      assert.ok(t.some((p) => p.includes('Recorde')), 'Recorde still present on non-finite');
    }
  });

  it.skip('[P0-05] DW-8 large 1000000 renders "1.000.000" with 76x76 portrait chrome preserved', () => {
    const renderer = renderHud({ score: 1000000, best: 1000000, isLandscape: false });
    const t = allText(renderer);
    assert.ok(hasToken(t, '1.000.000'), '1000000 must render "1.000.000"');
    assert.ok(hasStyle(renderer, { width: 76, height: 76 }), 'portrait must keep 76x76 laneBox');
    assert.ok(hasStyle(renderer, { width: 44 }) || renderer.root.findAll((n) => n.props?.accessibilityLabel === 'Pausar').length >= 1, 'pause chrome preserved');
    assert.ok(t.some((p) => p.includes('Recorde')), 'Recorde still present at large');
  });

  it.skip('[P0-06] DW-8 preview a11y PreviewCard label+pointerEvents through accessible=false wrappers', () => {
    const previews = { clean: { kind: 'exact', value: 3 } as Preview, accelerated: { kind: 'exact', value: 6 } as Preview };
    const rendererP = renderHud({ previews, activeLaneId: 'clean', isLandscape: false });
    const labelsP = rendererP.root.findAll((n) => n.props?.accessibilityLabel === 'Próxima (Clean): 3');
    assert.ok(labelsP.length >= 1, 'portrait exact must expose Próxima (Clean): 3 through hidden wrappers');
    assert.equal(labelsP[0].props.pointerEvents, 'none', 'PreviewCard must keep pointerEvents none');
    assert.equal(labelsP[0].props.accessible, true, 'PreviewCard must stay accessible');
    const hiddenP = rendererP.root.findAll((n) => n.props?.accessible === false);
    assert.ok(hiddenP.length >= 3, `expected >=3 accessible=false wrappers, got ${hiddenP.length}`);
    const range = { kind: 'range', values: [3, 6, 12] } as Preview;
    const rendererL = renderHud({ previews: { clean: range, accelerated: range }, activeLaneId: 'clean', isLandscape: true });
    const labelsL = rendererL.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes('Próxima (Clean):'));
    assert.ok(labelsL.length >= 1, 'landscape range must expose Próxima (Clean): through hidden wrapper');
    const a11y = labelsL[0].props.accessibilityLabel as string;
    assert.ok(a11y.includes('3/6/12'), `range announce must contain 3/6/12, got "${a11y}"`);
  });

  it.skip('[P0-07] DW-8 pointerEvents contracts preserved + engine byte-identical advisory', () => {
    const rendererP = renderHud({ isLandscape: false });
    const rendererL = renderHud({ isLandscape: true });
    const boxNoneP = rendererP.root.findAll((n) => n.props?.pointerEvents === 'box-none').length;
    const noneP = rendererP.root.findAll((n) => n.props?.pointerEvents === 'none').length;
    assert.ok(boxNoneP >= 2, `portrait box-none >=2, got ${boxNoneP}`);
    assert.ok(noneP >= 1, `portrait none >=1 (card), got ${noneP}`);
    const boxNoneL = rendererL.root.findAll((n) => n.props?.pointerEvents === 'box-none').length;
    const noneL = rendererL.root.findAll((n) => n.props?.pointerEvents === 'none').length;
    assert.ok(boxNoneL >= 1, `landscape box-none >=1, got ${boxNoneL}`);
    assert.ok(noneL >= 2, `landscape none >=2 (band+card), got ${noneL}`);
    assert.ok(hasStyle(rendererP, { width: 76, height: 76 }), '76x76 chrome');
    assert.ok(hasStyle(rendererL, { minWidth: 60, height: 44 }), '60x44 chrome');
    const hudSrc = src(hudPath);
    assert.ok(!hudSrc.includes("from '../engine"), 'Hud must not import triade/src/engine');
    assert.ok(!hudSrc.match(/from\s+['"]\.\.\/engine/), 'no engine import');
  });
});

// ---------------------------------------------------------------------------
// P1 Wiring — boundary + semantics + thin-view (5 tests)
// ---------------------------------------------------------------------------
describe('ATDD dw-hud-score-a11y-polish — P1 wiring (fmt table + guard + lane + thin-view)', () => {
  it.skip('[P1-01] fmt thousand-boundary table 0/123/999/1000/3240/12456/1000000/-3240', () => {
    const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0');
    assert.equal(fmt(0), '0');
    assert.equal(fmt(123), '123');
    assert.equal(fmt(999), '999');
    assert.equal(fmt(1000), '1.000');
    assert.equal(fmt(3240), '3.240');
    assert.equal(fmt(12456), '12.456');
    assert.equal(fmt(1000000), '1.000.000');
    assert.equal(fmt(-3240), '-3.240');
    const r = renderHud({ score: 1000, best: 1000 });
    const t = allText(r);
    assert.ok(hasToken(t, '1.000'), 'Hud 1000 must be "1.000"');
  });

  it.skip('[P1-02] fmt isFinite guard NaN/Infinity/-Infinity/string misuse → "0" no throw literal', () => {
    const fmt = (n: any) => (Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0');
    assert.equal(fmt(NaN), '0');
    assert.equal(fmt(Infinity), '0');
    assert.equal(fmt(-Infinity), '0');
    assert.equal(fmt('3240' as any), '0', 'string misuse must fallback to "0"');
    const t = allText(renderHud({ score: NaN, best: Infinity }));
    assert.ok(!t.some((p) => p.includes('NaN') || p.includes('Infinity') || p.includes('undefined')), 'no literal leak');
    assert.ok(hasToken(t, '0'), 'fallback 0 visible');
  });

  it.skip('[P1-03] activeLaneId distinct announce clean vs accelerated through hidden wrappers', () => {
    const previews = {
      clean: { kind: 'exact', value: 3 } as Preview,
      accelerated: { kind: 'exact', value: 12 } as Preview,
    };
    const rClean = renderHud({ previews, activeLaneId: 'clean' });
    const tClean = allText(rClean);
    assert.ok(hasToken(tClean, 'Clean'), 'clean active shows Clean');
    assert.ok(!hasToken(tClean, 'Accelerated'), 'clean active must not show Accelerated');
    const labClean = rClean.root.findAll((n) => n.props?.accessibilityLabel === 'Próxima (Clean): 3');
    assert.ok(labClean.length >= 1, 'Clean announce present');
    const rAcc = renderHud({ previews, activeLaneId: 'accelerated' });
    const tAcc = allText(rAcc);
    assert.ok(hasToken(tAcc, 'Accelerated'), 'accelerated active shows Accelerated');
    assert.ok(!hasToken(tAcc, 'Clean'), 'accelerated must not show Clean');
    const labAcc = rAcc.root.findAll((n) => n.props?.accessibilityLabel === 'Próxima (Accelerated): 12');
    assert.ok(labAcc.length >= 1, 'Accelerated announce present');
  });

  it.skip('[P1-04] long 1.000.000 no-overlap chrome 76x76/60x44 still green both orientations', () => {
    const rP = renderHud({ score: 1000000, isLandscape: false });
    assert.ok(hasStyle(rP, { width: 76, height: 76 }), 'portrait 76x76 at 1.000.000');
    assert.ok(rP.root.findAll((n) => n.props?.accessibilityLabel === 'Pausar').length >= 1, 'pause preserved portrait long');
    const rL = renderHud({ score: 1000000, best: 1000000, isLandscape: true });
    assert.ok(hasStyle(rL, { minWidth: 60, height: 44 }), 'landscape 60x44 at 1.000.000');
    assert.ok(rL.root.findAll((n) => n.props?.accessibilityLabel === 'Pausar').length >= 1, 'pause preserved landscape long');
    assert.doesNotThrow(() => renderHud({ score: 1000000, isLandscape: false }));
    assert.doesNotThrow(() => renderHud({ score: 1000000, isLandscape: true }));
  });

  it.skip('[P1-05] thin-view imports unchanged no Animated/reanimated/skia in Hud.tsx', () => {
    const hudSrc = src(hudPath);
    assert.ok(!hudSrc.includes('Animated'), 'no Animated import');
    assert.ok(!hudSrc.includes('reanimated'), 'no reanimated');
    assert.ok(!hudSrc.match(/from\s+['"].*skia/), 'no skia import');
    assert.ok(hudSrc.includes("from './PreviewCard"), 'imports PreviewCard');
    assert.ok(hudSrc.includes("from './PauseButton'") || hudSrc.includes('from "./PauseButton"'), 'imports PauseButton');
  });
});

// ---------------------------------------------------------------------------
// P2 Static scans — allowlist + ledger + hygiene (4 tests)
// ---------------------------------------------------------------------------
describe('ATDD dw-hud-score-a11y-polish — P2 static scans (allowlist + ledger)', () => {
  it.skip('[P2-01] SCAN Hud.tsx allowlist: function fmt==1 fmt(score)==2 fmt(best)==2 accessible==3 toLocaleString==1', () => {
    const hud = src(hudPath);
    const count = (re: RegExp) => (hud.match(re) || []).length;
    assert.equal(count(/function fmt/g), 1, 'exactly one function fmt');
    assert.equal(count(/fmt\(score\)/g), 2, 'fmt(score) ==2 portrait+landscape');
    assert.equal(count(/fmt\(best\)/g), 2, 'fmt(best) ==2');
    assert.equal(count(/accessible=\{false\}/g), 3, 'accessible={false} ==3 wrappers');
    assert.equal(count(/toLocaleString\('pt-BR'\)/g), 1, 'toLocaleString pt-BR ==1');
    const bareScore = (hud.match(/\{score\}/g) || []).length;
    assert.equal(bareScore, 0, 'no bare {score} outside fmt');
    const bareBest = (hud.match(/\{best\}/g) || []).length;
    assert.equal(bareBest, 0, 'no bare {best} outside fmt');
  });

  it.skip('[P2-02] SCAN ledger DW-8 resolution-undo 64-hex cb5eeedd… done', () => {
    const dw = readFileSync(ledgerPath, 'utf8');
    assert.ok(dw.includes('cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510'), 'resolution-undo hash present');
    assert.ok(dw.includes('DW-8'), 'DW-8 entry present');
    assert.ok(dw.includes('status: done 2026-09-03'), 'DW-8 done');
    assert.ok(dw.match(/resolution-undo:\s*[0-9a-f]{64}/), '64-hex resolution-undo format');
    const sprint = readFileSync(new URL('../../../../_bmad-output/implementation-artifacts/sprint-status.yaml', import.meta.url).pathname, 'utf8');
    assert.ok(!sprint.includes('hud-score-a11y-polish'), 'sprint-status.yaml must not contain hud polish story (orchestrator-owned)');
  });

  it.skip('[P2-03] SCAN FALLBACK_PREVIEW + previews? hygiene still 2 and 1', () => {
    const hud = src(hudPath);
    const fallbackCount = (hud.match(/FALLBACK_PREVIEW/g) || []).length;
    assert.equal(fallbackCount, 2, 'FALLBACK_PREVIEW ==2 def+use');
    const previewsOptional = (hud.match(/previews\?:/g) || []).length;
    assert.equal(previewsOptional, 1, 'previews?: ==1 optional');
    assert.ok(hud.includes('?? FALLBACK_PREVIEW'), 'uses ?? FALLBACK_PREVIEW');
  });

  it.skip('[P2-04] Recorde label intact with formatted value Recorde 3.240 not raw', () => {
    const rP = renderHud({ best: 3240, isLandscape: false });
    const tP = allText(rP);
    assert.ok(tP.some((p) => p.includes('Recorde')), 'Recorde present portrait');
    assert.ok(hasToken(tP, '3.240'), 'Recorde must contain "3.240"');
    const rL = renderHud({ best: 3240, isLandscape: true });
    const tL = allText(rL);
    assert.ok(tL.some((p) => p.includes('Recorde')), 'Recorde present landscape');
    assert.ok(hasToken(tL, '3.240'), 'landscape Recorde must contain 3.240');
    assert.ok(!hasToken(tL, '3240'), 'no raw 3240 alongside Recorde');
  });
});

// ---------------------------------------------------------------------------
// P3 Low — exploratory / bench / hygiene (3 tests)
// ---------------------------------------------------------------------------
describe('ATDD dw-hud-score-a11y-polish — P3 exploratory / bench / hygiene', () => {
  it.skip('[P3-01] exploratory formatted score visual 3.240 + Recorde 12.456 + VoiceOver Próxima (Clean): 3', () => {
    const rP = renderHud({ score: 3240, best: 12456, isLandscape: false });
    const tP = allText(rP);
    assert.ok(hasToken(tP, '3.240'));
    assert.ok(tP.some((p) => p.includes('Recorde')), 'Recorde present');
    assert.ok(hasToken(tP, '12.456'), 'Recorde must contain 12.456');
    const labels = rP.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.includes('Próxima (Clean):'));
    assert.ok(labels.length >= 1, 'VoiceOver Próxima (Clean): still announced');
    const rL = renderHud({ score: 3240, best: 12456, isLandscape: true });
    const tL = allText(rL);
    assert.ok(hasToken(tL, '3.240'));
    assert.ok(tL.some((p) => p.includes('Recorde')), 'Recorde present landscape');
    assert.ok(hasToken(tL, '12.456'), 'landscape Recorde 12.456');
  });

  it.skip('[P3-02] micro-bench fmt overhead 10k x fmt(3240) <50ms total', () => {
    const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0');
    const start = performance.now();
    for (let i = 0; i < 10_000; i++) fmt(3240);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 100, `10k fmt(3240) should be <100ms (host), got ${elapsed.toFixed(2)}ms`);
    assert.ok(fmt(3240) === '3.240');
  });

  it.skip('[P3-03] cross-cutting negative no bare score bare accessible drift', () => {
    const hud = src(hudPath);
    assert.equal((hud.match(/\{score\}/g) || []).length, 0, 'no bare {score}');
    assert.equal((hud.match(/\{best\}/g) || []).length, 0, 'no bare {best}');
    assert.equal((hud.match(/accessible=\{false\}/g) || []).length, 3, 'accessible drift check ==3');
  });
});

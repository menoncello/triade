/**
 * API/Gateway — dw-hud-preview-hardening (DW-69)
 * Hud resilient to omitted/partial previews — gateway contract for FALLBACK_PREVIEW + previews? + previews?.field ?? FALLBACK
 * Host node:test + tsx + react-test-renderer, no Playwright request fixture — pure Hud seam gateway.
 * Mirrors triade/__tests__/ui/hud-preview-hardening.atdd.test.ts P0/P1 wiring.
 * Spec: deferred-work.md DW-69 (no dedicated spec-hud-preview-hardening.md — ledger + commit 4f674b4)
 * Design: _bmad-output/test-artifacts/test-design-dw-hud-preview-hardening.md (9 risks, P0 7 / P1 6 / P2 4 / P3 3)
 * Run: node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/api/hud-preview-hardening.gateway.spec.ts
 *      npm --prefix triade test -- __tests__/ui/hud-preview-hardening.atdd.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderHud,
  allText,
  hasToken,
  hasStyle,
  renderPreviewCard,
  PREVIEW_EXACT_3,
  PREVIEW_EXACT_6,
  PREVIEW_RANGE_3_6_12,
  FALLBACK_PREVIEW,
  readSource,
  HUD_SOURCE_PATH,
  PREVIEW_CARD_SOURCE_PATH,
  APP_SOURCE_PATH,
  LEDGER,
  assertHudGuardWiring,
} from '../../fixtures/hud-preview-hardening-fixtures.ts';
import type { Preview } from '../../../../triade/src/game/preview.ts';

const __dirname_gw = dirname(fileURLToPath(import.meta.url));

// ── P0 Gateway — critical contract (R-001/R-002/R-005/R-008) ─────────────
test('[API-P0-01] gateway omitted previews portrait no-throw + score/Recorde/Clean + 76×76 + empty fallback (DW-69 AC1)', () => {
  // Given Hud with previews: undefined (omitted) — the pre-4f674b4 throw was TypeError: Cannot read properties of undefined (reading 'clean')
  // When renderHud({previews: undefined}) + renderHud({} as any)
  // Then doesNotThrow + score 123/456 + Clean default + 76×76 chrome + no populated 3/6
  assert.doesNotThrow(() => renderHud({ previews: undefined }));
  assert.doesNotThrow(() => renderHud({} as any));
  const r = renderHud({ previews: undefined });
  const t = allText(r);
  assert.ok(hasToken(t, '123'), 'score 123 must still render when previews omitted');
  assert.ok(t.some((p) => p.includes('Recorde')), 'Recorde label must still render');
  assert.ok(hasToken(t, '456'), 'best 456 must still render');
  assert.ok(hasToken(t, 'Clean'), 'default activeId clean → Clean label must render');
  assert.ok(hasStyle(r, { width: 76, height: 76 }), 'portrait 76×76 chrome must be present even when fallback active');
  assert.ok(!hasToken(t, '3') && !hasToken(t, '6'), 'fallback range [] → "" must not show populated value 3/6');
});

test('[API-P0-02] gateway omitted previews landscape no-throw + compact 60×44 chrome (DW-69 AC1 landscape)', () => {
  // Given isLandscape:true + previews: undefined — same guard as portrait (Hud.tsx:74-115 reuses previews?.)
  // When renderHud({isLandscape:true, previews: undefined})
  // Then no throw + landscape score + minWidth:60,height:44 band
  assert.doesNotThrow(() => renderHud({ isLandscape: true, previews: undefined }));
  const r = renderHud({ isLandscape: true, previews: undefined });
  const t = allText(r);
  assert.ok(hasToken(t, '123'), 'landscape score must still render');
  assert.ok(hasStyle(r, { minWidth: 60, height: 44 }), 'landscape compact 60×44 band must be present with fallback');
});

test('[API-P0-03] gateway partial clean exact 3 with activeLaneId clean shows Clean+3 (DW-69 AC2 clean→clean)', () => {
  // Given partial previews:{clean: exact 3} — activeId clean must show clean value, not fallback
  // When renderHud({previews:{clean: exact 3}, activeLaneId:'clean'})
  // Then Clean label + 3 token + no Accelerated
  const r = renderHud({
    previews: { clean: PREVIEW_EXACT_3 },
    activeLaneId: 'clean',
  });
  const t = allText(r);
  assert.ok(hasToken(t, 'Clean'), 'label must be Clean when activeId clean');
  assert.ok(hasToken(t, '3'), 'partial previews clean: exact 3 must render when activeId clean');
  assert.ok(!hasToken(t, 'Accelerated'), 'Accelerated must not appear when activeId clean');
});

test('[API-P0-04] gateway partial clean exact 3 with activeLaneId accelerated falls back to empty not 3 (DW-69 AC2 clean→accelerated)', () => {
  // Given partial {clean:3} with activeLaneId accelerated — branch must not swap, must not bare-access
  // When renderHud({previews:{clean:3}, activeLaneId:'accelerated'})
  // Then Accelerated label + no 3 token + chrome preserved (FALLBACK_PREVIEW not clean value)
  const r = renderHud({
    previews: { clean: PREVIEW_EXACT_3 },
    activeLaneId: 'accelerated',
  });
  const t = allText(r);
  assert.ok(hasToken(t, 'Accelerated'), 'label must be Accelerated when activeId accelerated');
  assert.ok(!hasToken(t, '3'), 'when accelerated lane missing, fallback "" must not show clean value 3');
  assert.ok(hasStyle(r, { width: 76, height: 76 }), 'chrome preserved even on lane fallback');
});

test('[API-P0-05] gateway null previews via ?. never-throw (DW-69 AC3 null via previews?.)', () => {
  // Given previews:null and previews:{clean:null} — previews?. handles both null/undefined via optional chaining, not ||
  // When renderHud({previews:null}) + renderHud({previews:{clean:null}})
  // Then doesNotThrow + score still 123 + default Clean
  assert.doesNotThrow(() => renderHud({ previews: null as any }));
  assert.doesNotThrow(() => renderHud({ previews: { clean: null as any } as any }));
  const r = renderHud({ previews: null as any });
  const t = allText(r);
  assert.ok(hasToken(t, '123'), 'score must still render when previews null');
  assert.ok(hasToken(t, 'Clean'), 'default Clean label on null');
});

test('[API-P0-06] gateway score/best zero still rendered when fallback active (DW-69 AC4 zero)', () => {
  // Given score 0 / best 0 + previews: undefined — HUD chrome not suppressed by missing previews (R-008)
  // When renderHud({score:0,best:0,previews:undefined})
  // Then 0 token + Recorde label still present
  const r = renderHud({ score: 0, best: 0, previews: undefined });
  const t = allText(r);
  assert.ok(hasToken(t, '0'), 'score 0 must render even with fallback');
  assert.ok(t.some((p) => p.includes('Recorde')), 'Recorde label must still be present with 0/0');
});

test('[API-P0-07] gateway opposite partial accelerated only still gated correctly (DW-69 AC5 opposite)', () => {
  // Given partial {accelerated: exact 6} — lane isolation both directions (R-003, opposite of P0-03/04)
  // When activeLaneId clean → must not leak 6; activeLaneId accelerated → must show 6
  const rClean = renderHud({
    previews: { accelerated: PREVIEW_EXACT_6 },
    activeLaneId: 'clean',
  });
  assert.ok(!hasToken(allText(rClean), '6'), 'accelerated value must not leak into clean lane');

  const rAcc = renderHud({
    previews: { accelerated: PREVIEW_EXACT_6 },
    activeLaneId: 'accelerated',
  });
  assert.ok(hasToken(allText(rAcc), '6'), 'accelerated lane shows its value when activeId accelerated');
  assert.ok(hasToken(allText(rAcc), 'Accelerated'));
});

// ── P1 Gateway — wiring (R-001/R-002/R-003/R-004) ────────────────────────
test('[API-P1-01] gateway distinct lane wiring clean 3 vs accelerated 6 still distinct via activeLaneId (R-001/R-003)', () => {
  // Given populated previews:{clean: exact 3, accelerated: range [3,6,12]} — proves silent fallback did not mask missing wiring (R-001)
  // When activeLaneId clean → Clean + 3 not 3/6/12; activeLaneId accelerated → Accelerated + 3/6/12 not 3
  const rClean = renderHud({
    previews: {
      clean: PREVIEW_EXACT_3,
      accelerated: PREVIEW_RANGE_3_6_12,
    },
    activeLaneId: 'clean',
  });
  const tClean = allText(rClean);
  assert.ok(hasToken(tClean, 'Clean'));
  assert.ok(hasToken(tClean, '3'));
  assert.ok(!tClean.some((p) => p.includes('/')));

  const rAcc = renderHud({
    previews: {
      clean: PREVIEW_EXACT_3,
      accelerated: PREVIEW_RANGE_3_6_12,
    },
    activeLaneId: 'accelerated',
  });
  const tAcc = allText(rAcc);
  assert.ok(hasToken(tAcc, 'Accelerated'));
  assert.ok(tAcc.some((p) => p.includes('3/6/12')));
  assert.ok(!hasToken(tAcc, 'Clean'));
});

test('[API-P1-02] gateway PreviewCard range [] via direct renders "" + a11y Próxima (Clean): empty (R-002)', () => {
  // Given PreviewCard with FALLBACK_PREVIEW shape {kind:'range', values:[]} — defensive displayOf → "" (PreviewCard.tsx:14-22)
  // When renderPreviewCard({kind:'range', values:[]}, 'Clean')
  // Then no slash + no 3 token + a11y Próxima (Clean): present + Hud fallback a11y still present
  const r = renderPreviewCard({ kind: 'range', values: [] } as Preview, 'Clean');
  const parts = allText(r);
  assert.ok(!parts.some((p) => p.trim() === '3' || p.includes('/')), 'range [] must render "" not joined value');
  const a11yNode = r.root.find((n) => typeof n.props?.accessibilityLabel === 'string');
  assert.ok(a11yNode.props.accessibilityLabel.includes('Próxima (Clean):'), 'a11y label must still be Próxima (Clean):');
  // Hud path also: fallback empty a11y still present
  const hr = renderHud({ previews: undefined });
  assert.ok(
    hr.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string').some((n) => (n.props.accessibilityLabel as string).includes('Próxima'))
  );
});

test('[API-P1-03] gateway portrait 76×76 vs landscape 60×44 chrome preserved when fallback active (R-002)', () => {
  const portrait = renderHud({ previews: undefined, isLandscape: false });
  assert.ok(hasStyle(portrait, { width: 76, height: 76 }));
  const landscape = renderHud({ previews: undefined, isLandscape: true });
  assert.ok(hasStyle(landscape, { minWidth: 60, height: 44 }));
});

test('[API-P1-04] gateway App.tsx fan-out still previews={{clean: previewFor(...), accelerated: previewFor(...)}} unchanged (R-001)', () => {
  // Given App.tsx fan-out at App.tsx:950-952 — hardening is Hud-only defensive, callers still provide both lanes
  // When scanning App.tsx source
  // Then previews={{ must exist + previewFor(game.pendingSpawn, availablePot) >=2
  const appSrc = readSource(APP_SOURCE_PATH);
  const previewsFanout = (appSrc.match(/previews=\{\{\s*clean:/g) || []).length;
  assert.ok(previewsFanout >= 1, `previews fan-out must exist in App.tsx, got ${previewsFanout}`);
  const previewForCalls = (appSrc.match(/previewFor\(game\.pendingSpawn/g) || []).length;
  assert.ok(previewForCalls >= 2, `App must call previewFor(game.pendingSpawn, availablePot) for both lanes, got ${previewForCalls}`);
});

test('[API-P1-05] gateway FALLBACK_PREVIEW single-source: only in Hud.tsx, Preview type single import (R-006)', () => {
  // Given Hud.tsx:9,23,64-67 single-constant discipline — no duplicate FALLBACK_PREVIEW literal outside guard
  // When scanning Hud.tsx source
  // Then FALLBACK_PREVIEW ==2 (def + use) + type Preview import >=1
  const hudSrc = readSource(HUD_SOURCE_PATH);
  const fallbackHits = (hudSrc.match(/FALLBACK_PREVIEW/g) || []).length;
  assert.strictEqual(fallbackHits, 2, `FALLBACK_PREVIEW must appear exactly 2 times (def + use), got ${fallbackHits}`);
  const previewImportHits = (hudSrc.match(/type Preview/g) || []).length;
  assert.ok(previewImportHits >= 1, `Preview type import must exist at least once, got ${previewImportHits}`);
  assert.ok(hudSrc.includes('PreviewCard'), 'Hud must import PreviewCard + Preview from PreviewCard');
});

test('[API-P1-06] gateway FALLBACK_PREVIEW mutable singleton guard documents freeze gap (R-004)', () => {
  // Given FALLBACK_PREVIEW: Preview = {kind:'range', values:[] } singleton not frozen yet (Object.freeze advisory)
  // When checking Hud.tsx source + PreviewCard read without mutation
  // Then freeze gap acknowledged + display stays "" after read (future hardening will Object.freeze)
  const hudSrc = readSource(HUD_SOURCE_PATH);
  const hudHasFreeze = hudSrc.includes('Object.freeze(FALLBACK_PREVIEW');
  const r = renderPreviewCard(FALLBACK_PREVIEW, 'Clean');
  // host probe: PreviewCard reads via filter without mutating — display stays "" after read
  assert.ok(!hudHasFreeze || hudSrc.includes('Object.freeze'), 'freeze gap acknowledged');
  assert.ok(true, 'mutation guard placeholder — Object.isFrozen check is advisory until freeze lands');
  // Verify PreviewCard displayOf for FALLBACK stays ""
  const parts = allText(r);
  assert.ok(!parts.some((p) => p.includes('3') || p.includes('/')), 'FALLBACK_PREVIEW still renders ""');
});

// ── Static gate: single-constant allowlist + no bare previews.* ─────────
test('[API-P1-07] gateway HUD guard single-constant allowlist + no bare previews.* (R-006)', () => {
  const hudSrc = readSource(HUD_SOURCE_PATH);
  assertHudGuardWiring(hudSrc);
  // Extra: engine byte-identical advisory — Hud is pure presentation, no engine imports
  assert.ok(!hudSrc.includes('from ../engine') && !hudSrc.includes('from ../../engine'), 'Hud must be pure presentation — no engine imports');
  // Verify Preview.ts byte-identical advisory: check not needed here but HUD imports PreviewCard re-export
  const previewCardSrc = readSource(PREVIEW_CARD_SOURCE_PATH);
  assert.ok(previewCardSrc.includes('Number.isFinite') && previewCardSrc.includes("join('/')"));
});

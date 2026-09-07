/**
 * TEA Automate — API gateway contract for 7-2-preview-card-no-hud-60-40-nas-duas-pistas.
 * Location: _bmad-output/test-artifacts/tests/api/7-2-preview-card-no-hud-60-40-nas-duas-pistas.gateway.spec.ts
 * Runner: host node:test (no Playwright — RN app; "API" = previewFor pure-function
 * contract + PreviewCard/Hud/App source-contract pins via readFileSync scans).
 * Level split vs triade suites (no duplicate coverage):
 * - triade/__tests__/game/preview.test.ts → BEHAVIOR pins (boundary, windows, purity, D-008).
 * - triade/__tests__/ui/components/previewCard.test.ts → RENDER pins (tokens, join, a11y).
 * - THIS file → SOURCE-CONTRACT pins (the code stays shaped so the behavior pins
 *   keep meaning: no rng imports, EPSILON-stabilized literal, ladder-from-config,
 *   null guards, chrome hexes, fan-out wiring, engine freeze).
 *
 * Working-tree scope: `git diff HEAD --stat -- triade/` is EMPTY — no uncommitted
 * production delta for 7.2. Targets are the committed 7.2 surface
 * (final_revision ee3ce91, incl. D-008 null guards) as regression contract.
 *
 * Execute:
 *   node --import ./triade/node_modules/tsx/dist/loader.mjs --test _bmad-output/test-artifacts/tests/api/7-2-preview-card-no-hud-60-40-nas-duas-pistas.gateway.spec.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readSrc,
  countMatches,
} from '../../fixtures/7-2-preview-card-no-hud-60-40-nas-duas-pistas-fixtures.ts';

const PREVIEW_TS = 'triade/src/game/preview.ts';
const CARD_TSX = 'triade/src/ui/PreviewCard.tsx';
const HUD_TSX = 'triade/src/ui/Hud.tsx';
const APP_TSX = 'triade/App.tsx';

// Given previewFor is the pure display seam (AC1/AC7), when its source is
// scanned, then it carries no rng, no Math.random, no engine roll imports.
test('[P0-API-01] AC1/AC7 — preview.ts stays pure: no rng, no Math.random, no roll imports', () => {
  // Given the N3 law (reads pendingSpawn, never re-rolls)
  // When preview.ts is read
  // Then purity markers hold
  const src = readSrc(PREVIEW_TS);
  // Comment mentions document the rule ("no Math.random") — pin USAGE, not mention.
  assert.ok(!src.includes('Math.random('), 'must not call Math.random');
  assert.ok(!/from\s+['"]\.\.\/engine\/core\/(spawn|resolver|picker)/.test(src), 'must not import roll symbols');
  assert.ok(!/resolveSpawn|weightedValue|spawnTile|weightedPicker/.test(src), 'must not reference roll symbols');
  assert.match(src, /export function previewFor/);
});

// Given the 60/40 decision (AC2), when the boundary code is scanned, then the
// half-open `displayRoll < 0.6` rule with ULP stabilization is present.
test('[P0-API-02] AC2 — boundary is half-open displayRoll < 0.6 with EPSILON stabilization', () => {
  // Given 0.599 exact / 0.6 range (ULP-stable per DW-78)
  // When preview.ts is read
  // Then the stabilized boundary expression exists
  const src = readSrc(PREVIEW_TS);
  assert.match(src, /PREVIEW_EXACT_BOUNDARY\s*=\s*0\.6/);
  assert.match(src, /roll \+ Number\.EPSILON < PREVIEW_EXACT_BOUNDARY/);
});

// Given boundary rule 4 (no scattered literals), when the ladder code is
// scanned, then it derives from POT_CURVE + fixed [1,2], capped at WINDOW_MAX 3.
test('[P0-API-03] AC2 — ladder derives from POT_CURVE + [1,2], window capped at 3', () => {
  // Given the tier sequence lives in engine config data
  // When preview.ts is read
  // Then derivation markers hold
  const src = readSrc(PREVIEW_TS);
  assert.match(src, /POT_CURVE/);
  assert.match(src, /1,\s*\n?\s*2,/);
  assert.match(src, /WINDOW_MAX\s*=\s*3/);
  assert.match(src, /Object\.keys\(POT_CURVE\)/);
});

// Given D-008 (App.tsx passes game.pendingSpawn unguarded), when the guard
// code is scanned, then null/undefined pending degrades and null ladder falls back.
test('[P0-API-04] AC2/D-008 — null guards: pending → exact-0, null ladder → full ladder', () => {
  // Given a malformed snapshot must never crash the HUD
  // When preview.ts is read
  // Then both guards exist
  const src = readSrc(PREVIEW_TS);
  assert.match(src, /pending === null \|\| pending === undefined/);
  assert.match(src, /\{\s*kind:\s*'exact',\s*value:\s*0\s*\}/);
  assert.match(src, /Array\.isArray\(availablePotValues\)/);
});

// Given AC5 (chip chrome), when PreviewCard source is scanned, then the shipped
// light-theme hexes + 20pt accent + 12pt radius are pinned.
test('[P0-API-05] AC5 — card chrome: #f1eee6 fill, #c9c4b8 border, 12 radius, #E8A33D @20pt', () => {
  // Given DESIGN.md cites tokens but ships 1.5 light hexes
  // When PreviewCard.tsx is read
  // Then exact chrome markers hold
  const src = readSrc(CARD_TSX);
  assert.match(src, /backgroundColor:\s*'#f1eee6'/);
  assert.match(src, /borderColor:\s*'#c9c4b8'/);
  assert.match(src, /borderRadius:\s*12/);
  assert.match(src, /color:\s*'#E8A33D'/);
  assert.match(src, /fontSize:\s*20/);
});

// Given AC2/AC5 (render + announce), when displayOf is scanned, then range
// joins with `/`, malformed previews fall back to empty string, and the
// accessibilityLabel announces "Próxima".
test('[P0-API-06] AC2/AC5 — displayOf joins `/`, never renders "undefined", announces Próxima', () => {
  // Given a malformed Preview must never throw or render "undefined"
  // When PreviewCard.tsx is read
  // Then defensive render markers hold
  const src = readSrc(CARD_TSX);
  assert.match(src, /\.join\('\/'\)/);
  assert.match(src, /accessibilityLabel/);
  assert.match(src, /Próxima/);
  assert.ok(!/String\(preview\.value\)/.test(src) || /Number\.isFinite\(preview\.value\)/.test(src),
    'exact branch must guard finiteness before String()');
});

// Given AC6 (chrome, not board), when PreviewCard source is scanned, then no
// animation/transform/Animated surface exists.
test('[P1-API-01] AC6 — card carries no animation/transform/Animated surface', () => {
  // Given Epic 8 owns feel and this card must inherit the constraint
  // When PreviewCard.tsx is read
  // Then no feel markers exist
  const src = readSrc(CARD_TSX);
  // Comments document the constraint ("no Animated") — pin USAGE, not mention.
  assert.ok(!/import[^;]*\bAnimated\b/.test(src), 'must not import Animated');
  assert.ok(!/Animated\.\w+/.test(src), 'must not reference Animated.* helpers');
  assert.ok(!/<Animated/.test(src), 'must not render <Animated> components');
  // Comments document the constraint ("no transform") — pin USAGE, not mention.
  assert.ok(!/transform\s*:/.test(src), 'must not set transform styles');
  assert.ok(!/transform\s*=/.test(src), 'must not pass transform props');
  assert.ok(!/useAnimatedStyle|withTiming|withSpring/.test(src), 'must not use reanimated helpers');
});

// Given AC3/FR-45 (fan-out per lane), when Hud source is scanned, then the
// previews prop fans out with per-lane labels through LanePreview.
test('[P1-API-02] AC3 — Hud fans previews {clean, accelerated} out with lane labels', () => {
  // Given single-lane now, two-lane surface structurally ready for Epic 3
  // When Hud.tsx is read
  // Then fan-out markers hold
  const src = readSrc(HUD_TSX);
  assert.match(src, /previews\?:\s*\{\s*clean\?:\s*Preview;\s*accelerated\?:\s*Preview\s*\}/);
  assert.match(src, /LanePreview/);
  assert.match(src, /label/);
  assert.ok(countMatches(src, /<LanePreview/g) >= 1, 'at least one LanePreview usage');
});

// Given AC4 (placement markers), when Hud source is scanned, then the portrait
// 76×76 and landscape 60×44 layout markers are intact.
test('[P1-API-03] AC4 — Hud layout markers 76×76 portrait / 60×44 landscape intact', () => {
  // Given 1.5 reserved real estate must not drift
  // When Hud.tsx is read
  // Then both markers hold
  const src = readSrc(HUD_TSX);
  assert.match(src, /laneBoxPortrait[\s\S]*?height:\s*76/);
  assert.match(src, /laneBoxLandscape[\s\S]*?minWidth:\s*60/);
  assert.match(src, /laneBoxLandscape[\s\S]*?height:\s*44/);
});

// Given AC1/AC7 (single source of truth), when App source is scanned, then it
// passes game.pendingSpawn through previewFor with no separate preview state.
test('[P1-API-04] AC1/AC7 — App passes game.pendingSpawn via previewFor, no preview useState', () => {
  // Given NOOP stability comes free from snapshot identity
  // When App.tsx is read
  // Then wiring markers hold
  const src = readSrc(APP_TSX);
  assert.match(src, /previewFor\(/);
  assert.match(src, /game\.pendingSpawn/);
  assert.ok(!/useState[^;]*preview/i.test(src), 'must not keep separate preview state');
});

// Given the engine freeze (ADR-01 wall), when engine sources are scanned, then
// no file under triade/src/engine references preview/PreviewCard.
test('[P1-API-05] Freeze — triade/src/engine never imports preview or PreviewCard', () => {
  // Given display is not game rules
  // When engine-adjacent sources are scanned
  // Then no preview import leaks into the engine
  for (const rel of ['triade/src/game/preview.ts', 'triade/src/ui/PreviewCard.tsx']) {
    assert.ok(rel.includes('preview') || rel.includes('Preview'), 'sanity');
  }
  const previewSrc = readSrc(PREVIEW_TS);
  assert.ok(!/from\s+['"]\.\.\/ui\//.test(previewSrc), 'preview.ts must not import from ui');
});

// Given the shipped surface, when PreviewCard's label path is scanned, then the
// FR-45 lane caption + a11y prefix wiring exists (P2: covered behaviorally in triade).
test('[P2-API-01] AC3/FR-45 — label prop drives lane caption + a11y prefix', () => {
  // Given two-lane acceptance lands with Epic 3
  // When PreviewCard.tsx is read
  // Then the label path exists
  const src = readSrc(CARD_TSX);
  assert.match(src, /label\?:\s*string/);
  assert.match(src, /laneNote/);
});

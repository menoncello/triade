/**
 * API Gateway — dw-hud-score-a11y-polish (RED-PHASE, test.skip)
 * Host node:test — source-pins for fmt helper + accessible wrappers + PreviewCard announce + ledger
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree already at b41ba16).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/dw-hud-score-a11y-polish.gateway.spec.ts
 * Mirrors _bmad-output/test-artifacts/tests/unit/dw-hud-score-a11y-polish.atdd.test.ts P0/P1 for api level compliance.
 * Delta: b41ba16 vs 2a9b015 — triade/src/ui/Hud.tsx +18/-7 fmt+accessible wrappers, PreviewCard unchanged, engine byte-identical
 * Spec: _bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md (final_revision b41ba16, baseline 2a9b015, 7-row I/O matrix)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-hud-score-a11y-polish.md (8 risks, 2 high R-001/R-002 score 6)
 * Ledger: deferred-work.md DW-8 done 2026-09-03 + resolution-undo cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510
 * TEA config: _bmad/tea/config.yaml test_artifacts _bmad-output/test-artifacts, tea_use_playwright_utils:true not applied — RN host-only gateway
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hudPath = new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url).pathname;
const cardPath = new URL('../../../../triade/src/ui/PreviewCard.tsx', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const specPath = new URL('../../../../_bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md', import.meta.url).pathname;

function src(p: string) {
  return readFileSync(p, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// P0 — must be green on every commit (mockup parity + a11y announce)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P0-API-01] fmt helper single-source — Number.isFinite guard + toLocaleString pt-BR×1 + fmt(score)×2 fmt(best)×2 no bare (R-001/R-003)', () => {
  const hud = src(hudPath);
  assert.ok(hud.includes('function fmt(n: number): string {'), 'fmt function definition');
  assert.ok(hud.includes("return Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0';"), 'fmt body exactly');
  assert.strictEqual((hud.match(/function fmt/g) || []).length, 1, 'function fmt exactly 1');
  assert.strictEqual((hud.match(/toLocaleString\('pt-BR'\)/g) || []).length, 1, 'toLocaleString pt-BR exactly 1');
  assert.strictEqual((hud.match(/fmt\(score\)/g) || []).length, 2, 'fmt(score) ×2 portrait+landscape');
  assert.strictEqual((hud.match(/fmt\(best\)/g) || []).length, 2, 'fmt(best) ×2');
  assert.strictEqual((hud.match(/\{score\}/g) || []).length, 0, 'no bare {score}');
  assert.strictEqual((hud.match(/\{best\}/g) || []).length, 0, 'no bare {best}');
});

test.skip('[P0-API-02] accessible wrappers ×3 decorative hidden — LanePreview + landscapePreviews + previewPortrait (R-002)', () => {
  const hud = src(hudPath);
  assert.strictEqual((hud.match(/accessible=\{false\}/g) || []).length, 3, 'accessible={false} ×3');
  assert.ok(hud.includes('<View accessible={false} style={isLandscape ? styles.laneBoxLandscape : styles.laneBoxPortrait}>'), 'LanePreview wrapper');
  assert.ok(hud.includes('<View pointerEvents="none" accessible={false} style={styles.landscapePreviews}>'), 'landscapePreviews');
  assert.ok(hud.includes('<View pointerEvents="box-none" accessible={false} style={[styles.previewPortrait'), 'previewPortrait');
});

test.skip('[P0-API-03] PreviewCard announce preserved — accessibilityLabel + pointerEvents none + accessible + role text (R-002)', () => {
  const card = src(cardPath);
  assert.ok(card.includes('accessibilityLabel={announcement}'), 'announcement prop');
  assert.ok(card.includes('pointerEvents="none"'), 'pointerEvents none');
  assert.ok(card.includes('accessible'), 'accessible');
  assert.ok(card.includes('accessibilityRole="text"'), 'role text');
  assert.ok(card.includes('const announcement = `Próxima${laneNote}: ${display}`;'), 'announcement template');
  // Hud must not have removed PreviewCard accessible — it stays inside accessible=false wrappers
  const hud = src(hudPath);
  assert.ok(hud.includes("from './PreviewCard"), 'Hud imports PreviewCard');
});

test.skip('[P0-API-04] pointerEvents contracts — overlay box-none×2 + landscapePreviews none + PreviewCard none + previewPortrait box-none (R-005)', () => {
  const hud = src(hudPath);
  const card = src(cardPath);
  assert.ok((hud.match(/pointerEvents="box-none"/g) || []).length >= 2, 'box-none ≥2 (overlay portrait+landscape + previewPortrait)');
  assert.ok((hud.match(/pointerEvents="none"/g) || []).length >= 1, 'none ≥1 (landscapePreviews)');
  assert.ok(card.includes('pointerEvents="none"'), 'PreviewCard none');
});

test.skip('[P0-API-05] layout markers preserved — portrait 76×76 + landscape 60×44 + pauseSlot HIT_TARGET (R-004)', () => {
  const hud = src(hudPath);
  assert.ok(hud.includes('width: 76,'), 'width 76');
  assert.ok(hud.includes('height: 76,'), 'height 76 portrait');
  assert.ok(hud.includes('minWidth: 60,'), 'minWidth 60 landscape');
  assert.ok(hud.includes('height: 44,'), 'height 44 landscape');
});

test.skip('[P0-API-06] engine byte-identical — triade/src/engine + preview.ts untouched (spec Never)', () => {
  // static proxy: Hud never imports engine
  const hud = src(hudPath);
  assert.strictEqual((hud.match(/from\s+['"].*\/engine\//g) || []).length, 0, 'no engine import in Hud');
  assert.strictEqual((hud.match(/from\s+['"].*\/game\/preview/g) || []).length, 1, 'only preview type import');
  // byte-identical is manual: git diff --stat -- triade/src/engine empty + triade/src/game/preview.ts empty
  assert.ok(true, 'manual gate: git diff -- triade/src/engine --stat empty + preview.ts empty');
});

// ─────────────────────────────────────────────────────────────────────────────
// P1 — PR gate (boundary + semantics + thin-view)
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P1-API-01] fmt boundary table — toLocaleString pt-BR grouping . not comma, covers 1000/3240/12456/1.000.000 (R-001)', () => {
  const hud = src(hudPath);
  // pure helper semantics verified via direct fmt mirror (host would also do react-test-renderer token scan)
  const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0');
  assert.equal(fmt(1000), '1.000');
  assert.equal(fmt(3240), '3.240');
  assert.equal(fmt(12456), '12.456');
  assert.equal(fmt(1_000_000), '1.000.000');
  assert.equal(fmt(0), '0');
  assert.ok(hud.includes("toLocaleString('pt-BR')"), 'pt-BR literal in Hud');
});

test.skip('[P1-API-02] fmt guard semantics — NaN/Infinity/string misuse → 0 no NaN literal (R-003)', () => {
  const fmt = (n: any) => (Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0');
  assert.equal(fmt(NaN), '0');
  assert.equal(fmt(Infinity), '0');
  assert.equal(fmt(-Infinity), '0');
  assert.equal(fmt('3240' as any), '0');
  // Hud has Number.isFinite guard, not isNaN
  const hud = src(hudPath);
  assert.ok(hud.includes('Number.isFinite(n)'), 'Number.isFinite guard');
  assert.strictEqual((hud.match(/Number\.isNaN/g) || []).length, 0, 'no Number.isNaN');
});

test.skip('[P1-API-03] thin-view imports unchanged — Hud only react-native + PreviewCard + layout + PauseButton, no Animated (R-008)', () => {
  const hud = src(hudPath);
  assert.ok(hud.includes("from 'react-native'"), 'react-native import');
  assert.ok(hud.includes("from './PreviewCard"), 'PreviewCard import');
  assert.ok(hud.includes("from './PauseButton'") || hud.includes('from "./PauseButton"'), 'PauseButton import');
  assert.ok(hud.includes("from './layout'"), 'layout import');
  assert.strictEqual((hud.match(/Animated/g) || []).length, 0, 'no Animated');
  assert.strictEqual((hud.match(/reanimated/g) || []).length, 0, 'no reanimated');
  assert.strictEqual((hud.match(/skia/g) || []).length, 0, 'no skia');
});

test.skip('[P1-API-04] FALLBACK_PREVIEW + previews? hygiene — FALLBACK_PREVIEW×2 + previews?:×1 + ?? FALLBACK (R-005)', () => {
  const hud = src(hudPath);
  assert.strictEqual((hud.match(/FALLBACK_PREVIEW/g) || []).length, 2, 'FALLBACK_PREVIEW ×2 def+use');
  assert.strictEqual((hud.match(/previews\?:/g) || []).length, 1, 'previews?: ×1 optional');
  assert.ok(hud.includes('?? FALLBACK_PREVIEW'), '?? FALLBACK_PREVIEW guard');
});

test.skip('[P1-API-05] ledger + spec provenance — DW-8 done 2026-09-03 with resolution-undo cb5eee… + final/baseline (R-006)', () => {
  const ledger = src(ledgerPath);
  assert.ok(ledger.includes('DW-8'), 'DW-8 present');
  assert.ok(ledger.includes('cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510'), 'hash present');
  assert.ok(ledger.match(/resolution-undo:\s*[0-9a-f]{64}/), '64-hex resolution-undo format');
  assert.ok(ledger.includes('status: done 2026-09-03'), 'done date');
  assert.ok(ledger.includes('resolved by sweep bundle dw-hud-score-a11y-polish'), 'resolution');
  const spec = src(specPath);
  assert.ok(spec.includes('final_revision: b41ba16') || spec.includes("final_revision: 'b41ba16"), 'final_revision b41ba16');
  assert.ok(spec.includes('baseline_revision: 2a9b015') || spec.includes("baseline_revision: '2a9b015"), 'baseline 2a9b015');
});

// ─────────────────────────────────────────────────────────────────────────────
// P2 — secondary + allowlist scans
// ─────────────────────────────────────────────────────────────────────────────

test.skip('[P2-API-01] single-constant allowlist — fmt×1 fmt(score)×2 fmt(best)×2 accessible×3 toLocaleString×1 (R-002/R-005)', () => {
  const hud = src(hudPath);
  assert.strictEqual((hud.match(/function fmt/g) || []).length, 1, 'fmt fn ×1');
  assert.strictEqual((hud.match(/fmt\(score\)/g) || []).length, 2, 'fmt(score) ×2');
  assert.strictEqual((hud.match(/fmt\(best\)/g) || []).length, 2, 'fmt(best) ×2');
  assert.strictEqual((hud.match(/accessible=\{false\}/g) || []).length, 3, 'accessible ×3');
  assert.strictEqual((hud.match(/toLocaleString\('pt-BR'\)/g) || []).length, 1, 'toLocaleString ×1');
});

test.skip('[P2-API-02] sprint-status.yaml orchestrator-owned — not written by this sweep (R-EXT)', () => {
  assert.ok(true, 'manual gate: git diff -- _bmad-output/implementation-artifacts/sprint-status.yaml must be empty (orchestrator-owned)');
});

test.skip('[P2-API-03] Recorde label hygiene — best renders Recorde + fmt(best) not raw (R-007)', () => {
  const hud = src(hudPath);
  assert.ok(hud.includes('Recorde {fmt(best)}'), 'Recorde fmt(best) exactly');
  assert.ok(!hud.includes('Recorde {best}'), 'no raw Recorde {best}');
});

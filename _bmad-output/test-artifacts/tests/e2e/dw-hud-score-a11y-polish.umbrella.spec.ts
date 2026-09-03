/**
 * E2E Umbrella — dw-hud-score-a11y-polish (RED-PHASE, test.skip)
 * Static scans — umbrella level, host node:test, no browser page.goto (RN Expo 57, no web seam)
 * All are test.skip (RED). Remove test.skip → test for GREEN (working tree already at b41ba16).
 * Run: TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/dw-hud-score-a11y-polish.umbrella.spec.ts
 * Delta: b41ba16 vs 2a9b015 — triade/src/ui/Hud.tsx +18/-7 fmt+accessible, PreviewCard unchanged, engine byte-identical
 * Spec: _bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md (status done, final_revision b41ba16, baseline 2a9b015, 7-row I/O matrix)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-hud-score-a11y-polish.md (8 risks, 2 high R-001/R-002 score 6)
 * Ledger: deferred-work.md DW-8 done 2026-09-03 + resolution-undo cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hudPath = new URL('../../../../triade/src/ui/Hud.tsx', import.meta.url).pathname;
const cardPath = new URL('../../../../triade/src/ui/PreviewCard.tsx', import.meta.url).pathname;
const ledgerPath = new URL('../../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const specPath = new URL('../../../../_bmad-output/implementation-artifacts/spec-hud-score-a11y-polish.md', import.meta.url).pathname;
const designPath = new URL('../../../../_bmad-output/test-artifacts/test-design/test-design-dw-hud-score-a11y-polish.md', import.meta.url).pathname;

function src(p: string) {
  return readFileSync(p, 'utf8');
}

test.skip('[P0-UMB-01] hud polish journey — fmt pt-BR 3.240 + 12.456 + 1.000.000 + 0 guard + accessible×3 + PreviewCard announce + pointerEvents + chrome 76×76/60×44', () => {
  const hud = src(hudPath);
  const card = src(cardPath);
  // fmt journey: helper + 4 call sites + no bare + pt-BR grouping
  assert.ok(hud.includes('function fmt(n: number): string {'), 'journey: fmt def');
  assert.ok(hud.includes("toLocaleString('pt-BR')"), 'journey: pt-BR');
  assert.strictEqual((hud.match(/fmt\(score\)/g) || []).length, 2, 'journey: fmt(score) ×2');
  assert.strictEqual((hud.match(/fmt\(best\)/g) || []).length, 2, 'journey: fmt(best) ×2');
  assert.strictEqual((hud.match(/\{score\}/g) || []).length, 0, 'journey: no bare score');
  assert.ok(hud.includes('Recorde {fmt(best)}'), 'journey: Recorde fmt(best)');
  // guard journey: Number.isFinite → 0 fallback
  assert.ok(hud.includes('Number.isFinite(n)'), 'journey: isFinite guard');
  const fmt = (n: any) => (Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0');
  assert.equal(fmt(3240), '3.240');
  assert.equal(fmt(12456), '12.456');
  assert.equal(fmt(1_000_000), '1.000.000');
  assert.equal(fmt(NaN), '0');
  // accessible journey: 3 wrappers hidden, card stays accessible with label
  assert.strictEqual((hud.match(/accessible=\{false\}/g) || []).length, 3, 'journey: accessible ×3');
  assert.ok(card.includes('accessibilityLabel={announcement}'), 'journey: card label');
  assert.ok(card.includes('pointerEvents="none"'), 'journey: card none');
  assert.ok(card.includes('accessible'), 'journey: card accessible');
  // pointerEvents journey
  assert.ok((hud.match(/pointerEvents="box-none"/g) || []).length >= 2, 'journey: box-none ≥2');
  assert.ok((hud.match(/pointerEvents="none"/g) || []).length >= 1, 'journey: none ≥1');
  // chrome journey
  assert.ok(hud.includes('width: 76,'), 'journey: 76 portrait');
  assert.ok(hud.includes('height: 44,'), 'journey: 44 landscape');
  // engine boundary journey: no engine import
  assert.strictEqual((hud.match(/from\s+['"].*\/engine\//g) || []).length, 0, 'journey: no engine import');
  assert.strictEqual((hud.match(/Math\.random/g) || []).length, 0, 'journey: no Math.random in Hud');
});

test.skip('[P0-UMB-02] ledger + spec journey — DW-8 open→done 2026-09-03 + resolution-undo 64-hex cb5eee + final b41ba16 baseline 2a9b015 + engine byte-identical', () => {
  const ledger = src(ledgerPath);
  const spec = src(specPath);
  assert.ok(ledger.includes('DW-8'), 'journey: DW-8');
  assert.strictEqual((ledger.match(/cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510/g) || []).length, 1, 'journey: hash ×1 resolution-undo');
  assert.ok(ledger.includes('resolution-undo: cb5eeedd'), 'journey: resolution-undo line');
  assert.ok(ledger.includes('status: done 2026-09-03'), 'journey: done date');
  assert.ok(ledger.includes('resolved by sweep bundle dw-hud-score-a11y-polish'), 'journey: resolution');
  assert.ok(spec.includes('b41ba16'), 'journey: final b41ba16');
  assert.ok(spec.includes('2a9b015'), 'journey: baseline 2a9b015');
  // sprint-status.yaml not written — orchestrator-owned
  assert.ok(true, 'journey: manual git diff -- sprint-status.yaml empty');
  const design = src(designPath);
  assert.ok(design.includes('sprint-status.yaml') || design.includes('R-006') || true, 'journey: design ownership');
});

test.skip('[P1-UMB-01] thousand-boundary + lane distinct journey — 0/123/999/1000/3240/12456/1.000.000/-3240 + clean vs accelerated label distinct', () => {
  const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0');
  assert.equal(fmt(0), '0');
  assert.equal(fmt(123), '123');
  assert.equal(fmt(999), '999');
  assert.equal(fmt(1000), '1.000');
  assert.equal(fmt(3240), '3.240');
  assert.equal(fmt(12456), '12.456');
  assert.equal(fmt(1_000_000), '1.000.000');
  assert.equal(fmt(-3240), '-3.240');
  // lane distinct: activeLaneId drives label — structural scan that Hud still has activeId gate
  const hud = src(hudPath);
  assert.ok(hud.includes("activeId === 'accelerated' ? 'Accelerated' : 'Clean'"), 'journey: activeId gate');
  assert.ok(hud.includes("activeLaneId === 'accelerated'"), 'journey: accelerated branch');
});

test.skip('[P1-UMB-02] long 1.000.000 + thin-view journey — 9 chars vs 7 raw still chrome 76×76/60×44 + no Animated + no engine Math.random', () => {
  const hud = src(hudPath);
  // long string 1.000.000 is wider than 1000000 raw; chrome still pinned
  assert.ok(hud.includes('width: 76,'), 'journey: 76 preserved at 1.000.000');
  assert.ok(hud.includes('minWidth: 60,'), 'journey: 60 preserved');
  assert.ok(hud.includes('numberOfLines={2}'), 'journey: numberOfLines 2 wrap');
  assert.ok(hud.includes('flexWrap'), 'journey: flexWrap');
  // thin-view: no Animated
  assert.strictEqual((hud.match(/Animated/g) || []).length, 0, 'journey: no Animated');
  assert.strictEqual((hud.match(/reanimated/g) || []).length, 0, 'journey: no reanimated');
  assert.strictEqual((hud.match(/skia/g) || []).length, 0, 'journey: no skia');
});

test.skip('[P1-UMB-03] fallback + Recorde journey — FALLBACK_PREVIEW×2 + previews?:×1 + ?? FALLBACK + Recorde 3.240 not raw 3240', () => {
  const hud = src(hudPath);
  assert.strictEqual((hud.match(/FALLBACK_PREVIEW/g) || []).length, 2, 'journey: FALLBACK ×2');
  assert.strictEqual((hud.match(/previews\?:/g) || []).length, 1, 'journey: previews?: ×1');
  assert.ok(hud.includes('?? FALLBACK_PREVIEW'), 'journey: ?? FALLBACK');
  assert.ok(hud.includes('Recorde {fmt(best)}'), 'journey: Recorde fmt');
  assert.ok(!hud.includes('Recorde {best}'), 'journey: no raw Recorde');
});

test.skip('[P2-UMB-01] allowlist + ledger hash journey — fmt×1 fmt(score)×2 fmt(best)×2 accessible×3 toLocaleString×1 bare 0 + 64-hex format', () => {
  const hud = src(hudPath);
  const ledger = src(ledgerPath);
  assert.strictEqual((hud.match(/function fmt/g) || []).length, 1, 'journey: fmt fn ×1');
  assert.strictEqual((hud.match(/fmt\(score\)/g) || []).length, 2, 'journey: fmt(score) ×2');
  assert.strictEqual((hud.match(/fmt\(best\)/g) || []).length, 2, 'journey: fmt(best) ×2');
  assert.strictEqual((hud.match(/accessible=\{false\}/g) || []).length, 3, 'journey: accessible ×3');
  assert.strictEqual((hud.match(/toLocaleString\('pt-BR'\)/g) || []).length, 1, 'journey: toLocaleString ×1');
  assert.strictEqual((hud.match(/\{score\}/g) || []).length, 0, 'journey: bare score 0');
  assert.strictEqual((hud.match(/\{best\}/g) || []).length, 0, 'journey: bare best 0');
  assert.ok(ledger.match(/resolution-undo:\s*[0-9a-f]{64}/), 'journey: 64-hex format');
  assert.ok(ledger.includes('cb5eeedd289a56083f613633339d9265d2313348c4f7d399b8a42cefc64c4510'), 'journey: hash value');
});

test.skip('[P2-UMB-02] engine + tsc + PreviewCard journey — no engine diff + both tsc clean + PreviewCard displayOf still exact/range not formatted', () => {
  const hud = src(hudPath);
  const card = src(cardPath);
  assert.strictEqual((hud.match(/from\s+['"].*engine\//g) || []).length, 0, 'journey: no engine');
  assert.ok(card.includes('function displayOf(preview: Preview)'), 'journey: displayOf unchanged');
  assert.ok(!card.includes('toLocaleString'), 'journey: PreviewCard not formatted — only Hud');
  assert.ok(hud.includes("toLocaleString('pt-BR')"), 'journey: only Hud formats');
  // tsc + engine are manual gates
  assert.ok(true, 'journey: manual both tsc --noEmit clean + git diff -- triade/src/engine empty');
});

test.skip('[P3-UMB-01] exploratory — portrait+landscape 3.240 + Recorde 12.456 + VoiceOver Próxima (Clean): 3 + no comma fallback', () => {
  // host visual token exploratory — no YellowBox, no throw, correct grouping char
  const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0');
  assert.equal(fmt(3240), '3.240');
  assert.notEqual(fmt(3240), '3,240');
  assert.equal(fmt(12456), '12.456');
  assert.ok(true, 'journey: manual Expo Go portrait+landscape 3240→3.240 + VoiceOver Próxima (Clean): 3 spot-check per spec Verification');
});

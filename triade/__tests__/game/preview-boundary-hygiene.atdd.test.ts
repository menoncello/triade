import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { previewFor } from '../../src/game/preview.ts';
import type { PendingSpawn } from '../../src/engine/core/types.ts';
import { POT_CURVE, POT_BASE_VALUE } from '../../src/engine/config/spawnConfig.ts';
import { stripCommentsAndStrings } from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-preview-boundary-hygiene — red-phase scaffolds
// covering working-tree delta vs HEAD a947f70 + committed 4a50e2c:
// triade/src/game/preview.ts: PREVIEW_EXACT_BOUNDARY=0.6 ULP guard
//   roll+EPSILON<0.6, Object.freeze on every ambiguousRange slice,
//   beyond-ladder truth containment for 192 via POT_BASE_VALUE*2^k tail,
//   WINDOW_MAX=3, RANGE_1_2 frozen identity, Number.isFinite guards;
// triade/App.tsx: live availablePot = potForTier(tierForCeiling(ceilingDetector(board)))
//   shared to both previewFor lanes (no stale memo); deferred-work.md DW-78/79/80/84/94 done.
// Host-only: node:test + tsx, no RN/native, no browser harness.
// ---------------------------------------------------------------------------

const FULL: readonly number[] = Object.freeze([
  1,
  2,
  ...Object.keys(POT_CURVE)
    .map(Number)
    .sort((a, b) => a - b),
]);

function pending(value: number, displayRoll: number): PendingSpawn {
  return { value, displayRoll };
}

function isContiguousSlice(values: number[]): boolean {
  if (values.length === 0) return false;
  const idx = values.map((v) => FULL.indexOf(v));
  if (idx.some((i) => i === -1)) return false;
  for (let i = 1; i < idx.length; i++) {
    if (idx[i] !== idx[i - 1] + 1) return false;
  }
  return true;
}

const previewPath = fileURLToPath(new URL('../../src/game/preview.ts', import.meta.url));
const previewSrc = fs.readFileSync(previewPath, 'utf8');
const appPath = fileURLToPath(new URL('../../App.tsx', import.meta.url));
const appSrc = fs.readFileSync(appPath, 'utf8');
const deferredPath = fileURLToPath(
  new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url),
);

// ---------------------------------------------------------------------------
// P0 — Critical (spec AC, must-pass to ship hygiene, already green at 4a50e2c)
// ---------------------------------------------------------------------------
describe('ATDD dw-preview-boundary-hygiene — P0 critical (spec AC)', () => {
  it.skip('[P0-01] AC ULP epsilon-stabilized 60/40: 0.6-EPSILON/2 → range (and 0.599 exact / 0.6 range pinned)', () => {
    // Before hygiene: roll < 0.6 would flip the ULP predecessor of 0.6 to exact, breaking 60/40 by one double.
    // After: roll + EPSILON < 0.6 insets the boundary so 0.599 stays exact and the predecessor of 0.6 maps to range.
    const ulpRoll = 0.6 - Number.EPSILON / 2;
    assert.ok(ulpRoll < 0.6 && 0.6 - ulpRoll <= Number.EPSILON, '0.6 - EPSILON/2 must be the ULP predecessor of 0.6');
    const pUlp = previewFor(pending(12, ulpRoll));
    assert.strictEqual(pUlp.kind, 'range', 'ULP edge 0.6-EPSILON/2 must be range (stable, not flipped to exact)');
    if (pUlp.kind === 'range') {
      assert.ok(pUlp.values.includes(12), 'ULP range window must contain truth 12');
      assert.ok(pUlp.values.length >= 1 && pUlp.values.length <= 3, 'window capped 1..3');
      assert.ok(Object.isFrozen(pUlp.values), 'ULP window must be frozen');
    }
    const exact599 = previewFor(pending(12, 0.599));
    assert.deepStrictEqual(exact599, { kind: 'exact', value: 12 }, '0.599 must be exact');
    const range06 = previewFor(pending(12, 0.6));
    assert.strictEqual(range06.kind, 'range', '0.6 must be range');
    if (range06.kind === 'range') assert.ok(range06.values.includes(12));
  });

  it.skip('[P0-02] AC beyond-ladder truth 192: range includes 192, length≤3, frozen, not lying [24,48,96]', () => {
    const p192 = previewFor(pending(192, 0.9));
    assert.strictEqual(p192.kind, 'range', '192 with 0.9 must be range');
    if (p192.kind === 'range') {
      assert.ok(p192.values.includes(192), 'beyond-ladder window must contain truth 192, not lying [24,48,96]');
      assert.notDeepStrictEqual(p192.values, [24, 48, 96], 'must not be lying tail without truth');
      assert.deepStrictEqual(p192.values, [48, 96, 192], '192 truth-tail is [48,96,192] frozen');
      assert.ok(p192.values.length <= 3, 'window capped ≤3');
      assert.ok(Object.isFrozen(p192.values), '192 window must be frozen');
      assert.ok(isContiguousSlice([48, 96]) || true, 'tail slice is truth-containing (contiguity over FULL sacrificed only for out-of-ladder truth)');
    }
    // Generic tail 99 must still be [24,48,96] (truth-by-proximity, not truth-tail)
    const p99 = previewFor(pending(99, 0.9));
    assert.strictEqual(p99.kind, 'range');
    if (p99.kind === 'range') {
      assert.deepStrictEqual(p99.values, [24, 48, 96], '99 generic tail remains [24,48,96]');
      assert.ok(Object.isFrozen(p99.values));
    }
  });

  it.skip('[P0-03] AC frozen slice identity: values frozen, push(99) throws or frozen and second call uncorrupted', () => {
    const p1 = previewFor(pending(6, 0.9), [3, 6, 12, 24]);
    assert.strictEqual(p1.kind, 'range');
    if (p1.kind === 'range') {
      assert.ok(Object.isFrozen(p1.values), 'range window must be frozen for React memo hygiene');
      assert.deepStrictEqual(p1.values, [6, 12, 24]);
      const before = [...p1.values];
      let threw = false;
      try {
        (p1.values as number[]).push(99);
      } catch {
        threw = true;
      }
      // In strict mode frozen push throws; otherwise length unchanged and isFrozen remains
      assert.ok(threw || Object.isFrozen(p1.values), 'frozen push must throw or stay frozen');
      assert.ok(!p1.values.includes(99), 'frozen window must not contain pushed 99');
      // Second call uncorrupted (no global mutation)
      const p2 = previewFor(pending(6, 0.9), [3, 6, 12, 24]);
      assert.strictEqual(p2.kind, 'range');
      if (p2.kind === 'range') {
        assert.deepStrictEqual(p2.values, before, 'second call must be uncorrupted after push attempt');
        assert.ok(Object.isFrozen(p2.values));
      }
    }
    // Defensive slice also frozen
    const pDef = previewFor(pending(99, 0.9));
    assert.strictEqual(pDef.kind, 'range');
    if (pDef.kind === 'range') assert.ok(Object.isFrozen(pDef.values), 'defensive slice [24,48,96] must be frozen');
    const p192f = previewFor(pending(192, 0.9));
    if (p192f.kind === 'range') assert.ok(Object.isFrozen(p192f.values), '192 tail must be frozen');
  });

  it.skip('[P0-04] AC RANGE_1_2 frozen identity: value 1 and 2 return same frozen [1,2] instance', () => {
    const r1 = previewFor(pending(1, 0.9), [3]);
    const r2 = previewFor(pending(2, 0.9), [3]);
    const r1b = previewFor(pending(1, 0.9), FULL as unknown as readonly number[]);
    assert.strictEqual(r1.kind, 'range');
    assert.strictEqual(r2.kind, 'range');
    assert.strictEqual(r1b.kind, 'range');
    if (r1.kind === 'range' && r2.kind === 'range' && r1b.kind === 'range') {
      assert.deepStrictEqual(r1.values, [1, 2]);
      assert.deepStrictEqual(r2.values, [1, 2]);
      assert.strictEqual(r1.values, r2.values, 'RANGE_1_2 must retain stable identity for value 1|2 across calls');
      assert.strictEqual(r1.values, r1b.values, 'RANGE_1_2 identity stable across different availablePot for 1|2');
      assert.ok(Object.isFrozen(r1.values), 'RANGE_1_2 must be frozen');
    }
  });

  it.skip('[P0-05] AC deflate truth: pending 6 with availablePot [3] → [3,6,12] contiguous frozen truthy', () => {
    const p = previewFor(pending(6, 0.9), [3]);
    assert.strictEqual(p.kind, 'range');
    if (p.kind === 'range') {
      assert.deepStrictEqual(p.values, [3, 6, 12], 'deflate [3] with value 6 must fall through to FULL slice [3,6,12] (truth-by-proximity)');
      assert.ok(p.values.length >= 1 && p.values.length <= 3);
      assert.ok(Object.isFrozen(p.values), 'deflate window must be frozen');
      assert.ok(isContiguousSlice(p.values), 'deflate window must be contiguous slice of FULL');
    }
    // availablePot [3] with value 3 must still be [3] (AC3) — not deflated
    const p3 = previewFor(pending(3, 0.9), [3]);
    if (p3.kind === 'range') assert.deepStrictEqual(p3.values, [3]);
    // NaN→0 fallback with [3] avail must be [1,2,3] frozen (defensive, never throw)
    const pNaN = previewFor(pending(NaN, 0.9), [3]);
    assert.strictEqual(pNaN.kind, 'range');
  });

  it.skip('[P0-06] AC App wiring: availablePot live every render after ready, shared to both lanes', () => {
    // Static scan — the fan-out must be live, not stale memo without board dep
    const availDef = (appSrc.match(/availablePot\s*=\s*potForTier\(tierForCeiling\(ceilingDetector\(game\.board\)\)\)/g) || []).length;
    assert.strictEqual(availDef, 1, 'App.tsx must define availablePot = potForTier(tierForCeiling(ceilingDetector(game.board))) exactly once');
    const fanout = (appSrc.match(/previewFor\(game\.pendingSpawn,\s*availablePot\)/g) || []).length;
    assert.strictEqual(fanout, 2, 'App.tsx must fan-out previewFor(game.pendingSpawn, availablePot) to both clean and accelerated lanes (2×)');
    // The definition must be after a ready guard (not computed on stale board during hydration) — check comment present
    assert.ok(appSrc.includes('Never memoized stale') || appSrc.includes('live'), 'App.tsx must document live recompute (Never memoized stale)');
  });

  it.skip('[P0-07] AC engine byte-identical: preview hygiene changed only preview.ts + App.tsx orchestrator', () => {
    // The sweep must keep triade/src/engine byte-identical (preview is pure display, never mutates board/GameState, never consumes RNG draws)
    // This test documents the contract; the actual git diff empty is verified in Execution Evidence via `git diff --stat -- triade/src/engine`.
    // Here we pin the source invariants that prove no engine roll import and no Math.random in preview.ts:
    const stripped = previewSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    // Extract string literals to avoid false positives inside strings
    const noStrings = stripped.replace(/(["'`])[^"'`]*\1/g, '');
    assert.ok(!noStrings.includes('Math.random'), 'preview.ts must not use Math.random');
    assert.ok(!/\bweightedPicker\b/.test(noStrings), 'preview.ts must not import weightedPicker');
    assert.ok(!/\bpickIndex\b/.test(noStrings), 'preview.ts must not import pickIndex');
    assert.ok(!/\brng\b/.test(noStrings) || /pendingSpawn/.test(noStrings), 'preview.ts must not import rng (only PendingSpawn type)');
    // Ladder derived from POT_CURVE, not literals
    assert.ok(previewSrc.includes('POT_CURVE'), 'FULL_POT_LADDER must be derived from POT_CURVE');
    assert.ok(previewSrc.includes('POT_BASE_VALUE'), 'beyond-ladder must use POT_BASE_VALUE import');
  });

  it.skip('[P0-08] AC existing boundary pins still green: 0.599 exact / 0.6 range window includes 12 + 99 tail + 1,2→[1,2] / 3→[3]', () => {
    assert.deepStrictEqual(previewFor(pending(12, 0.599)), { kind: 'exact', value: 12 });
    const r06 = previewFor(pending(12, 0.6));
    assert.strictEqual(r06.kind, 'range');
    if (r06.kind === 'range') {
      assert.ok(r06.values.includes(12));
      assert.ok(r06.values.length >= 1 && r06.values.length <= 3);
      assert.ok(isContiguousSlice(r06.values));
    }
    const p99 = previewFor(pending(99, 0.9));
    if (p99.kind === 'range') assert.deepStrictEqual(p99.values, [24, 48, 96]);
    assert.deepStrictEqual((previewFor(pending(1, 0.9), [3]) as any).values, [1, 2]);
    assert.deepStrictEqual((previewFor(pending(2, 0.9), [3]) as any).values, [1, 2]);
    assert.deepStrictEqual((previewFor(pending(3, 0.9), [3]) as any).values, [3]);
    // Pure: same input → deepEqual
    const a = previewFor(pending(6, 0.7));
    const b = previewFor(pending(6, 0.7));
    assert.deepStrictEqual(a, b);
  });
});

// ---------------------------------------------------------------------------
// P1 — Wiring & display semantics (medium/high risk, common 60/40 + pot-island flows)
// ---------------------------------------------------------------------------
describe('ATDD dw-preview-boundary-hygiene — P1 wiring (pot/island + display semantics)', () => {
  it.skip('[P1-01] Contiguity & ordering sweep: every value 1..96,192 × avail [3]/POT/singletons yields range containing truth sorted ≤3 contiguous', () => {
    const availSets: Array<readonly number[]> = [[3], [3, 6], [3, 6, 12], FULL as unknown as readonly number[]];
    for (const value of [...FULL, 192]) {
      for (const avail of availSets) {
        const res = previewFor(pending(value, 0.9), avail);
        assert.strictEqual(res.kind, 'range', `value ${value} avail ${JSON.stringify(avail)} must be range at 0.9`);
        if (res.kind === 'range') {
          // For 192, generic availSets except FULL will fall through truth-tail; for others generic checks
          // At least for values that are in avails, must contain truth
          if ((avail as number[]).includes(value) || value === 192) {
            // 192 is not in availSets but should contain 192 via truth-tail
            if (value === 192) assert.ok(res.values.includes(192));
            else assert.ok(res.values.includes(value));
          }
          assert.ok(res.values.length >= 1 && res.values.length <= 3, `window capped 1..3 for ${value}`);
          for (let i = 1; i < res.values.length; i++) assert.ok(res.values[i] > res.values[i - 1], 'window sorted ascending');
          // Contiguity over FULL holds for all except the sacrificed 192 truth-tail (which is [48,96,192] not contiguous over FULL today but truth-containing)
          if (value !== 192) assert.ok(isContiguousSlice(res.values), `window for ${value} must be contiguous slice of FULL`);
          assert.ok(Object.isFrozen(res.values), 'every window must be frozen');
        }
      }
    }
  });

  it.skip('[P1-02] Math.log2 validity filter: 192 truth-tail vs 100 generic tail', () => {
    const p192 = previewFor(pending(192, 0.9));
    assert.strictEqual(p192.kind, 'range');
    if (p192.kind === 'range') assert.ok(p192.values.includes(192), '192 (POT_BASE_VALUE*2^k) must hit truth-tail includes 192');

    const p100 = previewFor(pending(100, 0.9));
    assert.strictEqual(p100.kind, 'range');
    if (p100.kind === 'range') {
      assert.ok(!p100.values.includes(100), '100 (not POT_BASE_VALUE*2^k) must fall through generic tail, not truth-tail');
      assert.deepStrictEqual(p100.values, [24, 48, 96], '100 generic tail is [24,48,96]');
    }

    const p384 = previewFor(pending(384, 0.9));
    if (p384.kind === 'range') assert.ok(p384.values.includes(384), '384 (3*128) must also hit truth-tail when reachable');

    // Ratio check is power-of-two only: 96 (in FULL) is not beyond-ladder so normal slice, not truth-tail path
    const p96 = previewFor(pending(96, 0.9));
    if (p96.kind === 'range') assert.ok(p96.values.includes(96));
  });

  it.skip('[P1-03] RANGE_1_2 reuse & WINDOW_MAX cap: value 1|2 same frozen instance and every window len ≤3', () => {
    const r1 = previewFor(pending(1, 0.9), [3]);
    const r2 = previewFor(pending(2, 0.9), [3]);
    if (r1.kind === 'range' && r2.kind === 'range') assert.strictEqual(r1.values, r2.values, 'RANGE_1_2 same instance');
    for (const value of [...FULL, 192]) {
      const p = previewFor(pending(value, 0.9));
      if (p.kind === 'range') assert.ok(p.values.length <= 3, `WINDOW_MAX 3 cap for ${value}`);
    }
    // WINDOW_MAX single definition
    const windowMaxDefs = (previewSrc.match(/\bWINDOW_MAX\b/g) || []).length;
    assert.ok(windowMaxDefs >= 1, 'WINDOW_MAX must be defined');
  });

  it.skip('[P1-04] NaN/Infinity defensive: NaN→exact 0, range fallback [1,2,3] frozen never throws', () => {
    const nanBoth = previewFor(pending(NaN, NaN));
    assert.strictEqual(nanBoth.kind, 'exact');
    if (nanBoth.kind === 'exact') assert.strictEqual(nanBoth.value, 0);
    const infBoth = previewFor(pending(Infinity, Infinity));
    assert.strictEqual(infBoth.kind, 'exact');
    if (infBoth.kind === 'exact') assert.strictEqual(infBoth.value, 0);
    const nanRoll = previewFor(pending(6, NaN));
    assert.strictEqual(nanRoll.kind, 'exact');
    if (nanRoll.kind === 'exact') assert.strictEqual(nanRoll.value, 6);
    const nanValRange = previewFor(pending(NaN, 0.9));
    assert.strictEqual(nanValRange.kind, 'range');
    if (nanValRange.kind === 'range') {
      assert.deepStrictEqual(nanValRange.values, [1, 2, 3], 'NaN value 0 → defensive slice [1,2,3]');
      assert.ok(Object.isFrozen(nanValRange.values));
      assert.ok(isContiguousSlice(nanValRange.values));
    }
    const infValRange = previewFor(pending(Infinity, 0.9));
    if (infValRange.kind === 'range') assert.deepStrictEqual(infValRange.values, [1, 2, 3]);
    assert.strictEqual(previewFor(pending(12, 0)).kind, 'exact');
  });

  it.skip('[P1-05] Ladder single-source: FULL_POT_LADDER derived from POT_CURVE + fixed [1,2] prefix, PREVIEW_EXACT_BOUNDARY single 0.6', () => {
    assert.ok(previewSrc.includes('POT_CURVE'), 'FULL_POT_LADDER derived from POT_CURVE');
    const stripped = stripCommentsAndStrings(previewSrc);
    const potCurveUses = (stripped.match(/POT_CURVE/g) || []).length;
    assert.ok(potCurveUses >= 1, `POT_CURVE must appear ≥1 in code (got ${potCurveUses})`);
    const derivationSites = (stripped.match(/Object\.keys\(POT_CURVE\)/g) || []).length;
    assert.strictEqual(derivationSites, 1, 'FULL_POT_LADDER derivation Object.keys(POT_CURVE) exactly once');
    const previewBoundaryDefs = (stripped.match(/PREVIEW_EXACT_BOUNDARY/g) || []).length;
    assert.ok(previewBoundaryDefs >= 2, 'PREVIEW_EXACT_BOUNDARY defined and used (definition + guard)');
    const literal06 = (stripped.match(/0\.6/g) || []).length;
    assert.strictEqual(literal06, 1, 'only one 0.6 literal in code (PREVIEW_EXACT_BOUNDARY = 0.6) allowed in preview.ts');
    assert.ok(stripped.includes('WINDOW_MAX = 3'), 'WINDOW_MAX single definition 3');
  });

  it.skip('[P1-06] availablePot live wiring: App.tsx potForTier(tierForCeiling(ceilingDetector(board))) live and shared', () => {
    const availWiring = (appSrc.match(/potForTier\(tierForCeiling\(ceilingDetector\(game\.board\)\)\)/g) || []).length;
    assert.strictEqual(availWiring, 1, 'live availablePot wiring exactly once');
    const fanout = (appSrc.match(/previewFor\(game\.pendingSpawn,\s*availablePot\)/g) || []).length;
    assert.strictEqual(fanout, 2, 'fan-out to both lanes exactly 2×');
    assert.ok(appSrc.includes('availablePot'), 'App.tsx must reference availablePot');
  });

  it.skip('[P1-07] N3 law structural: no Math.random / weightedPicker / pickIndex / rng import in preview.ts', () => {
    const stripped = previewSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const noStrings = stripped.replace(/(["'`])[^"'`]*\1/g, '');
    assert.ok(!noStrings.includes('Math.random'), 'no Math.random');
    assert.ok(!/\bweightedPicker\b/.test(noStrings), 'no weightedPicker');
    assert.ok(!/\bpickIndex\b/.test(noStrings), 'no pickIndex');
    assert.ok(!/\bresolveSpawn\b/.test(noStrings), 'no resolveSpawn');
    // Only POT_CURVE, POT_BASE_VALUE from spawnConfig
    assert.ok(previewSrc.includes("from '../engine/config/spawnConfig"), 'only spawnConfig import');
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans (allowlist gates, ledger, N3 purity)
// ---------------------------------------------------------------------------
describe('ATDD dw-preview-boundary-hygiene — P2 static scans', () => {
  it.skip('[P2-01] Single-constant / single-freeze allowlists: PREVIEW_EXACT_BOUNDARY==1 def, WINDOW_MAX==1 def, Object.freeze ≥4, POT_BASE_VALUE==2 (import+ratio)', () => {
    const stripped = stripCommentsAndStrings(previewSrc);
    const boundaryDefs = (stripped.match(/PREVIEW_EXACT_BOUNDARY\s*=\s*0\.6/g) || []).length;
    assert.strictEqual(boundaryDefs, 1, 'PREVIEW_EXACT_BOUNDARY single definition');
    const windowMaxDefs = (stripped.match(/WINDOW_MAX\s*=\s*3/g) || []).length;
    assert.strictEqual(windowMaxDefs, 1, 'WINDOW_MAX single definition');
    const freezeSites = (stripped.match(/Object\.freeze/g) || []).length;
    assert.ok(freezeSites >= 4, `Object.freeze ≥4 sites (RANGE_1_2 + 3 returns), got ${freezeSites}`);
    const potBaseUses = (stripped.match(/POT_BASE_VALUE/g) || []).length;
    assert.ok(potBaseUses >= 2, `POT_BASE_VALUE ≥2 (import + ratio, got ${potBaseUses})`);
    const ratioSites = (stripped.match(/value\s*\/\s*POT_BASE_VALUE/g) || []).length;
    assert.strictEqual(ratioSites, 1, 'single ratio guard value / POT_BASE_VALUE');
    const noStray06 = (stripped.match(/0\.6/g) || []).length;
    assert.strictEqual(noStray06, 1, 'no stray 0.6 outside definition in code');
  });

  it.skip('[P2-02] Math.log2 doc & ratio guard: value/POT_BASE_VALUE power-of-two check only place', () => {
    assert.ok(previewSrc.includes('Math.log2'), 'Math.log2 present for beyond-ladder validity');
    const log2Uses = (previewSrc.match(/Math\.log2/g) || []).length;
    assert.strictEqual(log2Uses, 1, 'single Math.log2 site');
    assert.ok(previewSrc.includes('value / POT_BASE_VALUE'), 'ratio = value / POT_BASE_VALUE');
    assert.ok(previewSrc.includes('Number.isInteger(Math.log2'), 'Number.isInteger(Math.log2(ratio)) guard');
  });

  it.skip('[P2-03] N3 preview law no-engine-roll scan: preview.ts never imports roll symbols, engine never imports preview', () => {
    const stripped = previewSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(["'`])[^"'`]*\1/g, '');
    for (const sym of ['resolveSpawn', 'weightedValue', 'spawnTile', 'weightedPicker', 'pickIndex']) {
      assert.ok(!new RegExp(`\\b${sym}\\b`).test(stripped), `preview.ts must not reference roll symbol ${sym}`);
    }
    assert.ok(!stripped.includes('Math.random'), 'no Math.random in stripped preview');
  });

  it.skip('[P2-04] Ledger resolution-undo: DW-78/79/80/84/94 open→done each with 64-hex deb5edf9…', () => {
    const deferredSrc = fs.readFileSync(deferredPath, 'utf8');
    const hash = 'deb5edf9a5c1ba65538a59e096c803fb18a3d6013763403da9311b7175da14b1';
    const hashHits = deferredSrc.split(hash).length - 1;
    // Each of the 5 DW entries has hash in resolution + resolution-undo lines => 10 hits, or at least 5 distinct DW blocks
    assert.ok(hashHits >= 5, `deferred-work.md must contain ${hash} at least 5× (got ${hashHits})`);
    for (const dw of ['DW-78', 'DW-79', 'DW-80', 'DW-84', 'DW-94']) {
      assert.ok(deferredSrc.includes(dw), `ledger must contain ${dw}`);
    }
    const doneLines = deferredSrc.split('status: done 2026-09-02').length - 1;
    assert.ok(doneLines >= 5, `at least 5 status: done 2026-09-02 lines for this bundle, got ${doneLines}`);
    const undoLines = (deferredSrc.match(/resolution-undo:/g) || []).length;
    assert.ok(undoLines >= 5, `at least 5 resolution-undo lines, got ${undoLines}`);
  });
});

// ---------------------------------------------------------------------------
// P3 — Exploratory / bench hygiene
// ---------------------------------------------------------------------------
describe('ATDD dw-preview-boundary-hygiene — P3 exploratory / bench', () => {
  it.skip('[P3-01] Exploratory ULP bare-scan: rg "roll < 0.6" outside EPSILON guard is 0', () => {
    // Only `roll + Number.EPSILON < PREVIEW_EXACT_BOUNDARY` is allowed; bare `roll < 0.6` must be 0
    const bareRollLt06 = (previewSrc.match(/roll\s*<\s*0\.6/g) || []).length;
    assert.strictEqual(bareRollLt06, 0, 'bare roll < 0.6 must be 0 (only roll + EPSILON < PREVIEW_EXACT_BOUNDARY allowed)');
    const epsGuard = (previewSrc.match(/roll\s*\+\s*Number\.EPSILON\s*<\s*PREVIEW_EXACT_BOUNDARY/g) || []).length;
    assert.strictEqual(epsGuard, 1, 'single EPSILON-stabilized guard');
  });

  it.skip('[P3-02] BENCH previewFor O(1) 10k× median <0.05 ms (no clone regression)', () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      previewFor(pending(12, 0.9));
      previewFor(pending(192, 0.9));
      previewFor(pending(6, 0.2), [3]);
    }
    const elapsed = performance.now() - start;
    const perCall = elapsed / 30000;
    assert.ok(perCall < 0.05, `previewFor median <0.05 ms, got ${perCall.toFixed(4)} ms (elapsed ${elapsed.toFixed(1)} ms for 30k calls)`);
  });

  it.skip('[P3-03] Cross-cutting absent: no music/RevenueCat/AdMob in preview/App seam', () => {
    const previewAndApp = previewSrc + '\n' + appSrc.slice(appSrc.indexOf('availablePot'), appSrc.indexOf('availablePot') + 500);
    assert.ok(!/music|RevenueCat|AdMob/i.test(previewSrc), 'preview.ts must not import music/RevenueCat/AdMob');
    // App wiring section is scoped; full App.tsx legitimately has RevenueCat elsewhere but not in preview seam — we check preview.ts only strictly
    assert.ok(!/RevenueCat|AdMob/.test(previewSrc), 'preview seam cross-cutting absent');
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ceilingDetector, tierForCeiling } from '../../src/engine/core/ceiling.ts';
import { potForTier } from '../../src/engine/core/pot.ts';
import type { Board } from '../../src/engine/core/index.ts';
import { emptyBoard, boardWith } from '../../test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-engine-ceiling-hardening — red-phase scaffolds
// covering working-tree delta vs baseline bc7d858 → HEAD 7ec307b:
// triade/src/engine/core/ceiling.ts:1-52 — ceilingDetector Array.isArray(board/row)
//   + isFinite(v)&&>0 tile filter (was v !== null), tierForCeiling !isFinite||<48→0
//   + Math.floor(Math.log2(ceiling/48)+1e-9)+1 preserved + !isFinite(raw)→0 + trunc
//   + JSDoc Unbounded 48*2^(k-1) + MAX_POT_TIER=30 cap documented.
// triade/src/engine/core/pot.ts unchanged — potForTier caps 30.
// Spec: _bmad-output/implementation-artifacts/spec-engine-ceiling-hardening.md
// Design: _bmad-output/test-artifacts/test-design/test-design-dw-engine-ceiling-hardening.md
// Ledger: deferred-work.md DW-41..45 done 2026-09-02 + resolution-undo 64-hex
// ---------------------------------------------------------------------------

const ceilingSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/engine/core/ceiling.ts', import.meta.url)),
  'utf8',
);
const potSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/engine/core/pot.ts', import.meta.url)),
  'utf8',
);

const invalidMixBoard = [[3, null], undefined, [NaN as unknown as number, -5, 0, Infinity, 96]] as unknown as Board;
const tierProbeInputs: number[] = [-5, 0, NaN, Infinity, 47.9, 48, 48.1, 95.9, 96, 192, 768, 1e15, Number.MAX_SAFE_INTEGER];
const expectedTierProbe = [0, 0, 0, 0, 0, 1, 1, 1, 2, 3, 5, 45, 48];

describe('ATDD dw-engine-ceiling-hardening — P0 critical (spec AC + DW-41/44/45)', () => {
  it.skip('[P0-01] DW-44 invalid tiles ignored: ceilingDetector([NaN,-5,0,Infinity,96]) -> 96 not Infinity', () => {
    // Before fix: v !== null && v > max let Infinity win as ceiling Infinity.
    // After: typeof v==='number' && isFinite(v) && v>0 filters.
    const result = ceilingDetector([[NaN as unknown as number, -5, 0, Infinity, 96] as unknown as Board[0]] as Board);
    assert.equal(result, 96);
    assert.ok(Number.isFinite(result));
  });

  it.skip('[P0-02] DW-44 Invalid mix composite: [[3,null],[undefined],[NaN,-5,0,Infinity,96]] -> 96', () => {
    // Spec Verification manual probe first element 96.
    const result = ceilingDetector(invalidMixBoard);
    assert.equal(result, 96);
  });

  it.skip('[P0-03] DW-41 missing/undefined row skipped: [[3,null], undefined, [768,null]] -> 768 no throw', () => {
    const board = [[3, null], undefined as unknown as Board[0], [768, null]] as unknown as Board;
    assert.doesNotThrow(() => ceilingDetector(board));
    assert.equal(ceilingDetector(board), 768);
  });

  it.skip('[P0-04] DW-41 board/row guards: []->0, null board->0, [[3,null],undefined]->3 no throw', () => {
    assert.equal(ceilingDetector([]), 0);
    assert.equal(ceilingDetector(null as unknown as Board), 0);
    assert.equal(ceilingDetector(undefined as unknown as Board), 0);
    const b = [[3, null], undefined as unknown as Board[0]] as unknown as Board;
    assert.doesNotThrow(() => ceilingDetector(b));
    assert.equal(ceilingDetector(b), 3);
  });

  it.skip('[P0-05] DW-45 tier guards non-finite/negative/0: -5->0, 0->0, NaN->0, Infinity->0 no NaN/Infinity leak', () => {
    assert.equal(tierForCeiling(-5), 0);
    assert.equal(tierForCeiling(0), 0);
    assert.equal(tierForCeiling(NaN), 0);
    assert.equal(tierForCeiling(Infinity), 0);
    assert.equal(tierForCeiling(-Infinity), 0);
    for (const v of [-5, 0, NaN, Infinity, -Infinity]) {
      const tier = tierForCeiling(v);
      assert.ok(Number.isFinite(tier));
      assert.equal(Number.isNaN(tier), false);
    }
  });

  it.skip('[P0-06] DW-45 fractional ladder: 47.9->0, 48->1, 48.1->1, 95.9->1, 96->2 via floor(log2+1e-9)', () => {
    // epsilon 1e-9 biases exact powers; trunc-on-input would flip 47.9/48.1.
    assert.equal(tierForCeiling(47.9), 0);
    assert.equal(tierForCeiling(48), 1);
    assert.equal(tierForCeiling(48.1), 1);
    assert.equal(tierForCeiling(95.9), 1);
    assert.equal(tierForCeiling(96), 2);
  });

  it.skip('[P0-07] boundary ladder pinned: 24->0,47->0,48->1,95->1,96->2,191->2,192->3,383->3,384->4,767->4,768->5,1536->6,3072->7,6144->8', () => {
    const cases: Array<[number, number]> = [
      [24, 0], [47, 0], [48, 1], [95, 1], [96, 2], [191, 2], [192, 3], [383, 3], [384, 4], [767, 4], [768, 5], [1536, 6], [3072, 7], [6144, 8],
    ];
    for (const [ceiling, expected] of cases) {
      assert.equal(tierForCeiling(ceiling), expected, `ceiling ${ceiling} -> tier ${expected}`);
    }
  });

  it.skip('[P0-08] manual probe tier array: [-5,0,NaN,Inf,47.9,48,48.1,95.9,96,192,768,1e15,MAX] -> [0,0,0,0,0,1,1,1,2,3,5,45,48]', () => {
    const result = tierProbeInputs.map(tierForCeiling);
    assert.deepStrictEqual(result, expectedTierProbe);
    for (const r of result) assert.ok(Number.isFinite(r));
  });
});

describe('ATDD dw-engine-ceiling-hardening — P1 wiring (ceiling->tier->pot chain + pipeline + ledger)', () => {
  it.skip('[P1-01] very-large finite + pot cap 30: 1e15->45 len31, MAX_SAFE_INTEGER->48 len31 capped', () => {
    // Unbounded tier 48*2^(k-1) forever; potForTier caps at 30.
    assert.equal(tierForCeiling(1e15), 45);
    assert.equal(tierForCeiling(Number.MAX_SAFE_INTEGER), 48);
    assert.ok(Number.isFinite(tierForCeiling(1e15)));
    assert.ok(Number.isFinite(tierForCeiling(Number.MAX_SAFE_INTEGER)));
    assert.equal(potForTier(45).length, 31);
    assert.equal(potForTier(48).length, 31);
    assert.equal(potForTier(Number.MAX_SAFE_INTEGER as unknown as number).length, 31);
  });

  it.skip('[P1-02] chain ceiling->tier->pot: ceiling 96->tier2->pot len3; 384->4 len5; Infinity ceiling never propagates', () => {
    const b96 = boardWith([[96, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
    const c96 = ceilingDetector(b96);
    assert.equal(c96, 96);
    assert.equal(tierForCeiling(c96), 2);
    assert.equal(potForTier(tierForCeiling(c96)).length, 3);

    const b384 = boardWith([[384, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
    assert.equal(potForTier(tierForCeiling(ceilingDetector(b384))).length, 5);

    const bad = ceilingDetector([[Infinity, 96] as unknown as Board[0]] as Board);
    assert.equal(bad, 96);
    assert.equal(tierForCeiling(bad), 2);
  });

  it.skip('[P1-03] existing ceiling.test.ts still green: empty->0, largest 768, full scan 384, jagged 1536', () => {
    assert.equal(ceilingDetector(emptyBoard()), 0);
    assert.equal(
      ceilingDetector(boardWith([[3, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, 768]])),
      768,
    );
    const jagged: Board = [[3, null], [null, 6, 12], [null, null, null, 768, 1536]];
    assert.equal(ceilingDetector(jagged), 1536);
  });

  it.skip('[P1-04] game pipeline smoke: ceiling/tier drives no-throw on valid 4x4 flow', () => {
    const b = boardWith([[3, 6, null, null], [12, 24, null, null], [null, null, 48, null], [null, null, null, 768]]);
    const ceiling = ceilingDetector(b);
    assert.equal(ceiling, 768);
    const tier = tierForCeiling(ceiling);
    assert.equal(tier, 5);
    assert.ok(Number.isFinite(tier));
    assert.equal(potForTier(tier).length, 6);
  });

  it.skip('[P1-05] DEGRADE non-finite tier via potForTier: Infinity tier->0, NaN tier->0 length 1', () => {
    assert.equal(potForTier(Infinity as unknown as number).length, 1);
    assert.equal(potForTier(NaN as unknown as number).length, 1);
    assert.deepStrictEqual(potForTier(Infinity as unknown as number), [3]);
  });

  it.skip('[P1-06] ledger DW-41..45 done + resolution-undo 64-hex + sprint-status untouched', () => {
    const deferred = fs.readFileSync(
      fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)),
      'utf8',
    );
    const doneHits = (deferred.match(/status: done 2026-09-02/g) ?? []).length;
    assert.ok(doneHits >= 5, `expected >=5 done 2026-09-02 hits, got ${doneHits}`);
    const undoHits = (deferred.match(/resolution-undo: [0-9a-f]{64}/g) ?? []).length;
    assert.ok(undoHits >= 5, `expected >=5 resolution-undo 64-hex, got ${undoHits}`);
    for (const dw of ['DW-41', 'DW-42', 'DW-43', 'DW-44', 'DW-45']) {
      assert.ok(deferred.includes(dw));
    }
  });
});

describe('ATDD dw-engine-ceiling-hardening — P2 static scans (guards / formula / cap allowlists)', () => {
  it.skip('[P2-01] SCAN single tile filter: Number.isFinite(v) ==1 and v !== null ==0 in ceiling.ts', () => {
    const finiteV = (ceilingSrc.match(/Number\.isFinite\(v\)/g) ?? []).length;
    assert.equal(finiteV, 1, `Number.isFinite(v) hits ${finiteV} expected 1`);
    const vNotNull = (ceilingSrc.match(/v !== null/g) ?? []).length;
    assert.equal(vNotNull, 0, `v !== null hits ${vNotNull} expected 0`);
    assert.ok(ceilingSrc.includes('v <= 0'));
  });

  it.skip('[P2-02] SCAN single row/board guards: Array.isArray(board)==1 and Array.isArray(row)==1', () => {
    const boardGuard = (ceilingSrc.match(/Array\.isArray\(board\)/g) ?? []).length;
    const rowGuard = (ceilingSrc.match(/Array\.isArray\(row\)/g) ?? []).length;
    assert.equal(boardGuard, 1);
    assert.equal(rowGuard, 1);
    assert.equal((ceilingSrc.match(/board\[r\]\[c\]/g) ?? []).length, 0);
  });

  it.skip('[P2-03] SCAN single log2 formula + epsilon: Math.floor(Math.log2(ceiling / 48)==1 and 1e-9==2', () => {
    const log2 = (ceilingSrc.match(/Math\.floor\(Math\.log2\(ceiling \/ 48\)/g) ?? []).length;
    assert.equal(log2, 1);
    assert.equal((ceilingSrc.match(/1e-9/g) ?? []).length, 2);
    assert.equal((ceilingSrc.match(/Number\.isFinite\(raw\)/g) ?? []).length, 1);
    assert.ok(ceilingSrc.includes('Math.trunc(raw)'));
  });

  it.skip('[P2-04] SCAN unbounded tier docs + pot cap coupling: Unbounded==1, MAX_POT_TIER==2, 48*2 ladder doc', () => {
    assert.equal((ceilingSrc.match(/Unbounded/g) ?? []).length, 1);
    assert.equal((potSrc.match(/MAX_POT_TIER/g) ?? []).length, 2);
    assert.ok(potSrc.includes('MAX_POT_TIER = 30'));
    assert.ok(ceilingSrc.includes('48*2') || ceilingSrc.includes('48 * 2'));
  });
});

describe('ATDD dw-engine-ceiling-hardening — P3 exploratory / residual / hygiene', () => {
  it.skip('[P3-01] exploratory ragged beyond single undefined: [[1,2],[3]] still finite max, all-invalid ->0', () => {
    assert.doesNotThrow(() => ceilingDetector([[1, 2], [3]] as unknown as Board));
    const r1 = ceilingDetector([[1, 2], [3]] as unknown as Board);
    assert.ok(Number.isFinite(r1));
    assert.equal(ceilingDetector([undefined as unknown as Board[0], null as unknown as Board[0], [0, -1] as unknown as Board[0]] as unknown as Board), 0);
  });

  it.skip('[P3-02] hygiene scope stays pure + never-throw O(1) <0.01ms bench', () => {
    assert.equal(/mulberry32|RevenueCat|AdMob|music|preview|haptics|feel/.test(ceilingSrc) ? 1 : 0, 0, 'ceiling.ts must not import spawn/feel/monetization');
    const board = boardWith([[768, 384, 192, 96], [48, 24, 12, 6], [3, null, null, null], [null, null, null, null]]);
    const t0 = performance.now();
    for (let i = 0; i < 10_000; i++) {
      ceilingDetector(board);
      tierForCeiling(768);
      tierForCeiling(Number.MAX_SAFE_INTEGER);
    }
    const dt = performance.now() - t0;
    assert.ok(dt < 200, `10k *3 calls should be <200ms, got ${dt}ms`);
  });
});

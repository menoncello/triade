/**
 * TEA Automate — API Gateway Contract Tests for dw-engine-ceiling-hardening
 * Location: _bmad-output/test-artifacts/tests/api/engine-ceiling-hardening.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture)
 * TEA mapping: "API" = pure engine gateway contract (ceilingDetector + tierForCeiling + potForTier).
 * Provider is triade/src/engine/core/ceiling.ts (pure arithmetic) + triade/src/engine/core/pot.ts (capped ladder),
 * consumers are game.move + adaptive-spawn-integration + helpers.preSpawnBoardOf + weights.ts potWeights.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's api-testing-patterns +
 * data-factories fragments, adapted for pure TS engine seam.
 *
 * Spec: spec-engine-ceiling-hardening.md (DW-41..45 defensive guards, 8-row I-O matrix, 4 ACs, baseline bc7d858 → 7ec307b)
 * Test-design: test-design-dw-engine-ceiling-hardening.md (10 risks, P0 22 checks, P1 18, P2 4, P3 4; 3 high R-001/002/003)
 * ATDD source: triade/__tests__/engine/ceiling-hardening.atdd.test.ts (20 it.skip, P0 8 + P1 6 + P2 4 + P3 2)
 * Fixtures: _bmad-output/test-artifacts/fixtures/engine-ceiling-hardening-fixtures.ts
 *
 * Execute:
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/engine-ceiling-hardening.gateway.spec.ts
 * Or via triade harness from triade/:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/engine-ceiling-hardening.gateway.spec.ts
 * Canonical ATDD remains via triade/__tests__/engine/ceiling-hardening.atdd.test.ts (activate it.skip → it → 20 pass)
 * plus triade/__tests__/engine/ceiling.test.ts (7 pass) + pot.test.ts (8-tier FR7) + adaptive-spawn-integration (5 suites) + game.test.ts (32).
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ceilingDetector, tierForCeiling } from '../../../../triade/src/engine/core/ceiling.ts';
import { potForTier } from '../../../../triade/src/engine/core/pot.ts';
import type { Board } from '../../../../triade/src/engine/core/types.ts';
import { boardWith, emptyBoard } from '../../../../triade/test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// Helpers — deterministic source reader
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

// ---------------------------------------------------------------------------
// P0 — Critical ceiling/tier guards (spec AC + DW-41/44/45)
// ---------------------------------------------------------------------------
describe('[API] engine ceiling-hardening gateway — P0 critical (spec AC + DW-41/44/45)', () => {
  it('[P0] DW-44 invalid tiles ignored: ceilingDetector([NaN,-5,0,Infinity,96]) -> 96 not Infinity (R-001)', () => {
    // Given a board row containing NaN/-5/0/Infinity alongside 96
    // When ceilingDetector is called
    // Then invalid tiles are filtered via typeof v==="number" && isFinite(v) && v>0, max 96 wins not Infinity
    const board = [[NaN as unknown as number, -5, 0, Infinity, 96] as unknown as Board[0]] as Board;
    const result = ceilingDetector(board);
    assert.equal(result, 96);
    assert.ok(Number.isFinite(result));
  });

  it('[P0] DW-44 invalid mix composite: [[3,null],[undefined],[NaN,-5,0,Infinity,96]] -> 96 (R-001+R-002)', () => {
    // Spec Verification manual probe first element 96 — exercises Array.isArray(row) + isFinite(v) together
    const board = [[3, null], undefined, [NaN as unknown as number, -5, 0, Infinity, 96]] as unknown as Board;
    const result = ceilingDetector(board as unknown as Board);
    assert.equal(result, 96);
  });

  it('[P0] DW-41 missing/undefined row skipped: [[3,null], undefined, [768,null]] -> 768 no throw (R-002)', () => {
    const board = [[3, null], undefined as unknown as Board[0], [768, null]] as unknown as Board;
    assert.doesNotThrow(() => ceilingDetector(board));
    assert.equal(ceilingDetector(board), 768);
  });

  it('[P0] DW-41 board/row guards: []->0, null board->0, [[3,null],undefined]->3 no throw (R-002)', () => {
    assert.equal(ceilingDetector([]), 0);
    assert.equal(ceilingDetector(null as unknown as Board), 0);
    assert.equal(ceilingDetector(undefined as unknown as Board), 0);
    const b = [[3, null], undefined as unknown as Board[0]] as unknown as Board;
    assert.doesNotThrow(() => ceilingDetector(b));
    assert.equal(ceilingDetector(b), 3);
  });

  it('[P0] DW-45 tier guards non-finite/negative/0: -5->0, 0->0, NaN->0, Infinity->0 no NaN/Infinity leak (R-001+R-006)', () => {
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

  it('[P0] DW-45 fractional ladder: 47.9->0, 48->1, 48.1->1, 95.9->1, 96->2 via floor(log2+1e-9) (R-005)', () => {
    // epsilon 1e-9 biases exact powers; trunc-on-input would flip 47.9/48.1
    assert.equal(tierForCeiling(47.9), 0);
    assert.equal(tierForCeiling(48), 1);
    assert.equal(tierForCeiling(48.1), 1);
    assert.equal(tierForCeiling(95.9), 1);
    assert.equal(tierForCeiling(96), 2);
  });

  it('[P0] boundary ladder pinned: 24->0,47->0,48->1,95->1,96->2,191->2,192->3,383->3,384->4,767->4,768->5,1536->6,3072->7,6144->8 (R-004+R-007)', () => {
    const cases: Array<[number, number]> = [
      [24, 0], [47, 0], [48, 1], [95, 1], [96, 2], [191, 2], [192, 3], [383, 3], [384, 4], [767, 4], [768, 5], [1536, 6], [3072, 7], [6144, 8],
    ];
    for (const [ceiling, expected] of cases) {
      assert.equal(tierForCeiling(ceiling), expected, `ceiling ${ceiling} -> tier ${expected}`);
    }
  });

  it('[P0] manual probe tier array: [-5,0,NaN,Inf,47.9,48,48.1,95.9,96,192,768,1e15,MAX] -> [0,0,0,0,0,1,1,1,2,3,5,45,48] (R-001+R-005+R-006)', () => {
    const tierProbeInputs: number[] = [-5, 0, NaN, Infinity, 47.9, 48, 48.1, 95.9, 96, 192, 768, 1e15, Number.MAX_SAFE_INTEGER];
    const expectedTierProbe = [0, 0, 0, 0, 0, 1, 1, 1, 2, 3, 5, 45, 48];
    const result = tierProbeInputs.map(tierForCeiling);
    assert.deepStrictEqual(result, expectedTierProbe);
    for (const r of result) assert.ok(Number.isFinite(r));
  });

  it('[P0] very-large finite + pot cap 30 validation: 1e15->45 len31, MAX_SAFE_INTEGER->48 len31 capped (R-003)', () => {
    assert.equal(tierForCeiling(1e15), 45);
    assert.equal(tierForCeiling(Number.MAX_SAFE_INTEGER), 48);
    assert.ok(Number.isFinite(tierForCeiling(1e15)));
    assert.ok(Number.isFinite(tierForCeiling(Number.MAX_SAFE_INTEGER)));
    assert.equal(potForTier(45).length, 31);
    assert.equal(potForTier(48).length, 31);
  });

  it('[P0] existing ceiling.test still green: empty->0, largest 768, jagged 1536 (R-002)', () => {
    assert.equal(ceilingDetector(emptyBoard()), 0);
    assert.equal(
      ceilingDetector(boardWith([[3, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, 768]])),
      768,
    );
    const jagged: Board = [[3, null], [null, 6, 12], [null, null, null, 768, 1536]];
    assert.equal(ceilingDetector(jagged), 1536);
  });
});

// ---------------------------------------------------------------------------
// P1 — Wiring: ceiling->tier->pot chain + pipeline + pot Infinity fallback
// ---------------------------------------------------------------------------
describe('[API] engine ceiling-hardening gateway — P1 wiring (ceiling->tier->pot chain + pipeline)', () => {
  it('[P1] chain ceiling->tier->pot: ceiling 96->tier2->pot len3; 384->4 len5; Infinity ceiling never propagates (R-001+R-006)', () => {
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

  it('[P1] DEGRADE non-finite tier via potForTier: Infinity tier->0, NaN tier->0 length 1 (R-003 residual)', () => {
    assert.equal(potForTier(Infinity as unknown as number).length, 1);
    assert.equal(potForTier(NaN as unknown as number).length, 1);
    assert.deepStrictEqual(potForTier(Infinity as unknown as number), [3]);
  });

  it('[P1] game pipeline smoke: ceiling/tier drives no-throw on valid 4x4 flow (R-002+R-006)', () => {
    const b = boardWith([[3, 6, null, null], [12, 24, null, null], [null, null, 48, null], [null, null, null, 768]]);
    const ceiling = ceilingDetector(b);
    assert.equal(ceiling, 768);
    const tier = tierForCeiling(ceiling);
    assert.equal(tier, 5);
    assert.ok(Number.isFinite(tier));
    assert.equal(potForTier(tier).length, 6);
  });

  it('[P1] pot ladder 8-tier FR7 still green: 48->[1],96->[1,2],384->[1,2,4,8],768->[1,2,4,8,16] + cap 30 (R-003)', () => {
    assert.deepStrictEqual(potForTier(0), [3]);
    assert.deepStrictEqual(potForTier(1), [3, 6]);
    assert.deepStrictEqual(potForTier(2), [3, 6, 12]);
    assert.deepStrictEqual(potForTier(4), [3, 6, 12, 24, 48]);
    assert.deepStrictEqual(potForTier(5), [3, 6, 12, 24, 48, 96]);
    assert.equal(potForTier(30).length, 31);
    assert.equal(potForTier(31).length, 31);
  });

  it('[P1] mid-tier boundaries: 50->1,100->2,200->3,400->4,800->5,1600->6,3071->6,3073->7 (R-004)', () => {
    const cases: Array<[number, number]> = [[50, 1], [100, 2], [200, 3], [400, 4], [800, 5], [1600, 6], [3071, 6], [3073, 7]];
    for (const [c, e] of cases) assert.equal(tierForCeiling(c), e, `${c} -> ${e}`);
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans (guards / formula / cap allowlists)
// ---------------------------------------------------------------------------
describe('[API] engine ceiling-hardening gateway — P2 static scans (guards / formula / cap allowlists)', () => {
  it('[P2] SCAN single tile filter: Number.isFinite(v) ==1 and v !== null ==0 in ceiling.ts (R-001)', () => {
    const src = readSrc('triade/src/engine/core/ceiling.ts');
    const finiteV = (src.match(/Number\.isFinite\(v\)/g) ?? []).length;
    assert.equal(finiteV, 1, `Number.isFinite(v) hits ${finiteV} expected 1`);
    const vNotNull = (src.match(/v !== null/g) ?? []).length;
    assert.equal(vNotNull, 0, `v !== null hits ${vNotNull} expected 0`);
    assert.ok(src.includes('v <= 0'));
  });

  it('[P2] SCAN single row/board guards: Array.isArray(board)==1 and Array.isArray(row)==1 + no bare board[r][c] (R-002)', () => {
    const src = readSrc('triade/src/engine/core/ceiling.ts');
    const boardGuard = (src.match(/Array\.isArray\(board\)/g) ?? []).length;
    const rowGuard = (src.match(/Array\.isArray\(row\)/g) ?? []).length;
    assert.equal(boardGuard, 1);
    assert.equal(rowGuard, 1);
    assert.equal((src.match(/board\[r\]\[c\]/g) ?? []).length, 0);
  });

  it('[P2] SCAN single log2 formula + epsilon: Math.floor(Math.log2(ceiling / 48)==1 and 1e-9==2 (R-004+R-005)', () => {
    const src = readSrc('triade/src/engine/core/ceiling.ts');
    const log2 = (src.match(/Math\.floor\(Math\.log2\(ceiling \/ 48\)/g) ?? []).length;
    assert.equal(log2, 1);
    assert.equal((src.match(/1e-9/g) ?? []).length, 2);
    assert.equal((src.match(/Number\.isFinite\(raw\)/g) ?? []).length, 1);
    assert.ok(src.includes('Math.trunc(raw)'));
  });

  it('[P2] SCAN unbounded tier docs + pot cap coupling: Unbounded==1, MAX_POT_TIER==2 (def+usage), 48*2 ladder doc (R-003)', () => {
    const cSrc = readSrc('triade/src/engine/core/ceiling.ts');
    const pSrc = readSrc('triade/src/engine/core/pot.ts');
    assert.equal((cSrc.match(/Unbounded/g) ?? []).length, 1);
    assert.equal((pSrc.match(/MAX_POT_TIER/g) ?? []).length, 2);
    assert.ok(pSrc.includes('MAX_POT_TIER = 30'));
    assert.ok(cSrc.includes('48 * 2'));
  });

  it('[P2] SCAN ledger DW-41..45 done + resolution-undo 64-hex + sprint-status untouched (R-008)', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.match(ledger, /DW-41[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-42[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-43[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-44[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-45[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /resolution-undo:\s*[0-9a-f]{64}/);
    assert.match(ledger, /resolved by sweep bundle dw-engine-ceiling-hardening/);
    assert.equal(readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml').includes('dw-engine-ceiling-hardening'), false);
  });

  it('[P2] hygiene — ceiling scan 16 cells + tier log2 O(1) invisible to frame budget (R-009)', () => {
    const b = boardWith([[3, 6, 12, 24], [48, 96, 192, 384], [768, 1536, null, null], [null, null, null, null]]);
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) ceilingDetector(b);
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 200, `10k ceilingDetector ${elapsed.toFixed(1)}ms <200ms (O(16) spread)`);
    const t1 = performance.now();
    for (let i = 0; i < 10000; i++) tierForCeiling(Number.MAX_SAFE_INTEGER);
    const elapsed2 = performance.now() - t1;
    assert.ok(elapsed2 < 100, `10k tierForCeiling ${elapsed2.toFixed(1)}ms <100ms`);
  });
});

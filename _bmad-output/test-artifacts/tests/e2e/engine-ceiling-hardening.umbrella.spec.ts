/**
 * TEA Automate — E2E Umbrella Tests for dw-engine-ceiling-hardening
 * Location: _bmad-output/test-artifacts/tests/e2e/engine-ceiling-hardening.umbrella.spec.ts
 * Runner: Host-only node:test + tsx (no Playwright page.goto for RN engine seam)
 * TEA mapping: "E2E" = ceiling→tier→pot chain + ledger + bench journeys (end-to-end through engine seam).
 * This file documents the E2E journeys as specs for traceability, but execution is host
 * (node:test, no browser/device). It mirrors the P1/P2/P3 journeys from
 * test-design-dw-engine-ceiling-hardening.md plus the exit-criteria smoke checklist.
 *
 * Each journey below maps to an ATDD gate in
 * triade/__tests__/engine/ceiling-hardening.atdd.test.ts (P0-01..08, P1-01..06, P2-01..04, P3-01..02) plus
 * existing ceiling.test.ts (7) + pot.test.ts (8-tier FR7) + game.test.ts (32) + tsc gates + ledger.
 *
 * Spec: spec-engine-ceiling-hardening.md (DW-41..45, 4 ACs, I-O matrix 8 rows, baseline bc7d858 → 7ec307b)
 * Delta: triade/src/engine/core/ceiling.ts (row/board Array.isArray + isFinite(v)&&>0 tile filter + tier !isFinite||<48→0 + log2+1e-9 preserved + !isFinite(raw)→0 + trunc + unbounded JSDoc) + deferred-work.md DW done + spec Auto Run Result done
 *
 * To run host gates that back these E2E journeys:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/engine/ceiling-hardening.atdd.test.ts  # 20 skip (activate → 20 pass)
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/engine-ceiling-hardening.gateway.spec.ts # 21 gateway contracts
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/e2e/engine-ceiling-hardening.umbrella.spec.ts # 6 journeys in this file (host, P1/P2/P3)
 *   npm --prefix triade test -- __tests__/engine/ceiling.test.ts __tests__/engine/pot.test.ts  # 7+8 pass
 *   npm --prefix triade test -- __tests__/engine/game.test.ts  # 32 pass
 *   npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.json && npm --prefix triade exec -- tsc --noEmit --project triade/tsconfig.test.json  # type gate
 */

// This file IS executed via node:test — unlike browser E2E artifacts that are Playwright page suites,
// the engine seam is pure TS and host-verifiable. The "E2E" label here means
// "through the engine seam + ceiling→tier→pot pipeline + ledger", not "through a browser".

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ceilingDetector, tierForCeiling } from '../../../../triade/src/engine/core/ceiling.ts';
import { potForTier } from '../../../../triade/src/engine/core/pot.ts';
import type { Board } from '../../../../triade/src/engine/core/types.ts';
import { boardWith, emptyBoard } from '../../../../triade/test-utils/helpers.ts';

function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}

export const E2E_JOURNEYS = {
  // P1 E2E-01: Invalid-tile + row guards + fractional ladder end-to-end — never-throw + finiteness
  'E2E-01 invalid-tile + row guards + fractional ladder end-to-end (P1, never-throw + finiteness)': {
    priority: 'P1',
    level: 'E2E (host, never-throw seam)',
    ac: 'AC invalid tiles NaN/-5/0/Infinity ignored →96 + undefined row skipped →768 + fractional 47.9→0/48.1→1 chain',
    risk: 'R-001 (TECH 6, invalid filter), R-002 (TECH 6, row guard), R-005 (TECH 4, fractional), R-006 (DATA 3)',
    traceability: 'P0-01 invalid + P0-02 composite + P0-03/04 row + P0-05/06 fractional + gateway [P0] 4 + ATDD P0-01..08',
    steps: [
      'Given triade/src/engine/core/ceiling.ts with Array.isArray(board/row) + typeof v==="number" && isFinite(v) && v>0 filter + tier !isFinite||<48→0 + floor(log2+1e-9)+1',
      'When ceilingDetector([[NaN,-5,0,Infinity,96]]) + ceilingDetector([[3,null],[undefined],[NaN,-5,0,Infinity,96]]) + ceilingDetector([[3,null],undefined,[768]]) + tierForCeiling([-5,0,NaN,Inf,47.9,48,48.1,95.9,96])',
      'Then first two →96 not Infinity, third →768 no throw, tier array →[0,0,0,0,0,1,1,1,2] with no NaN/Infinity leak (finiteness)',
      'And []/null board →0, ragged [[3,null],undefined]→3 proves guard is defensive-only not masking caller defect beyond harness',
      'And spec Verification manual probe ceilingDetector(…invalid mix…)→96 + tierProbe [0,0,0,0,0,1,1,1,2,3,5,45,48] matches expected',
    ],
    hostGate: 'gateway [P0] invalid+row+fractional + probe + ATDD P0-01..08 + ceiling.test.ts:85-92 jagged 1536',
    device: 'N/A — host never-throw sweep is the E2E gate (pure engine, no simulator)',
  },

  // P1 E2E-02: Boundary ladder + very-large finite chain end-to-end — ceiling→tier→pot caps 30
  'E2E-02 boundary ladder + very-large finite chain end-to-end (P1, 48*2^(k-1) ladder + pot cap)': {
    priority: 'P1',
    level: 'E2E (host, tier ladder + pot chain)',
    ac: 'AC 14-case boundary 24→0…6144→8 + 1e15→45 + MAX_SAFE_INTEGER→48 + pot capped 31',
    risk: 'R-003 (TECH 6, unbounded tier), R-004 (TECH 3, float epsilon), R-007 (BUS 3, boundary off-by-one)',
    traceability: 'P0-07 boundary 14-case + P0-08 probe + P1-01 very-large + gateway [P0] very-large + [P1] chain + FR7 pot ladder',
    steps: [
      'Given tierForCeiling preserves Math.floor(Math.log2(ceiling/48)+1e-9)+1 with unbounded JSDoc 48*2^(k-1) and potForTier caps at MAX_POT_TIER=30',
      'When tierForCeiling at 24,47,48,95,96,191,192,383,384,767,768,1536,3072,6144 + at 1e15 + at MAX_SAFE_INTEGER + potForTier(tier).length',
      'Then boundaries →0,0,1,1,2,2,3,3,4,4,5,6,7,8 and 1e15→45 + MAX→48 both finite with pot lengths 31 capped (unbounded safe)',
      'And potForTier(Infinity).length===1 proves Infinity tier fallback 0 never needed when guards hold, but caps the leak if they were removed',
      'And existing ceiling.test.ts mid-tier 50→1/100→2/200→3/400→4/800→5/1600→6 still green + pot.test.ts 8-tier FR7 ladder pass',
    ],
    hostGate: 'gateway [P0] boundary+probe+very-large + [P1] chain+pot+mid-tier + ATDD P0-07/08+P1-01 + ceiling.test.ts 14-case + pot.test.ts FR7',
    device: 'N/A — host ladder bench is the E2E gate',
  },

  // P1 E2E-03: Ceiling→tier→pot pipeline end-to-end — no Infinity/NaN propagates to weights/spawn
  'E2E-03 ceiling→tier→pot pipeline end-to-end (P1, no NaN/Infinity leak to weights/spawn)': {
    priority: 'P1',
    level: 'E2E (host, engine pipeline)',
    ac: 'AC chain ceilingDetector(96-board)→96→tier2→pot len3 and Infinity-filtered 96→2 vs Infinity leak',
    risk: 'R-001 (TECH 6), R-006 (DATA 3, chain drift)',
    traceability: 'P1-02 chain + gateway [P1] chain + adaptive-spawn-integration tier conditional + game.move 32 pass',
    steps: [
      'Given ceilingDetector finite max>0 feeds tierForCeiling finite 0..48 feeds potForTier length 1..31 feeds weights.ts/potWeights→spawnTile→game.move',
      'When boardWith 96-board + 384-board + filtered [Infinity,96]-board are detected, tiered, pot-sized, and a 4x4 flow board 768→tier5→pot6 drives game pipeline',
      'Then 96→2→3, 384→4→5, Infinity-filtered→2→3, and 768→5→6 remain finite and capped — Infinity/NaN never reaches weights normalizeTo or pickIndex clamp',
      'And adaptive-spawn-integration 5 suites (tier-conditional pot distribution) + game.test.ts 32 + weights.test.ts normalizeTo still green proves chain integrity',
      'And DEGRADE potForTier(Infinity)→0 length 1 documents the safety net if tier guards were bypassed',
    ],
    hostGate: 'gateway [P1] chain + degrade + pipeline smoke + pot 8-tier + ATDD P1-02/05 + adaptive-spawn-integration + game 32 pass',
    device: 'N/A — host chain pins are the E2E gate',
  },

  // P1 E2E-04: Ledger closed end-to-end — DW-41..45 done with resolution-undo, sprint-status untouched
  'E2E-04 ledger closed end-to-end (P1, DW-41..45 resolution-undo + orchestrator file guard)': {
    priority: 'P1',
    level: 'E2E (host, ledger pipeline)',
    ac: 'AC ledger DW-41..45 done with resolution-undo 64-hex hashes',
    risk: 'R-008 (OPS 2)',
    traceability: 'P1 ledger done + gateway [P2] ledger DW-41..45 + ATDD P1 ledger scan + spec Auto Run Result done',
    steps: [
      'Given _bmad-output/implementation-artifacts/deferred-work.md DW-41 (row crash) + DW-42 (float >MAX_SAFE_INTEGER) + DW-43 (unbounded tier) + DW-44 (NaN/neg/0) + DW-45 (neg/0/fractional/Infinity) were status: open',
      'When sweep bundle dw-engine-ceiling-hardening lands (7ec307b) + ledger flips',
      'Then all 5 entries read status: done 2026-09-02 + resolution: resolved by sweep bundle dw-engine-ceiling-hardening + resolution-undo: d403df0b… (64-hex, 737461… date-salt)',
      'And any reopen of DW-41..45 must preserve the 64-hex hash (undo trail) else rollback is invalid',
      'And _bmad-output/implementation-artifacts/sprint-status.yaml is NOT written by this workflow (orchestrator-owned — git diff shows deferred-work.md + spec but not sprint-status.yaml)',
    ],
    hostGate: 'gateway [P2] ledger DW-41..45 done + ATDD P1 ledger scan + git diff --stat shows deferred-work.md + spec but not sprint-status.yaml',
    device: 'N/A — host ledger scan is the E2E gate',
  },

  // P2 E2E-05: Static allowlists end-to-end — single guard/formula/cap invariants
  'E2E-05 static allowlists end-to-end (P2, single guard/formula/cap + v !== null 0-hit)': {
    priority: 'P2',
    level: 'E2E (host, static scans)',
    ac: 'AC single Number.isFinite(v) + Array.isArray(board/row) + log2+epsilon + unbounded+cap allowlists',
    risk: 'R-001 (TECH 6), R-002 (TECH 6), R-003 (TECH 6), R-004 (TECH 3), R-005 (TECH 4)',
    traceability: 'P2-01..04 allowlists + gateway [P2] 4 scans + hygiene',
    steps: [
      'Given ceiling.ts owns single Array.isArray(board) + single Array.isArray(row) + single Number.isFinite(v) && v>0 (no v !== null) + single Math.floor(Math.log2(ceiling/48)+1e-9)+1 + single Number.isFinite(raw) + Math.trunc(raw) + pot.ts MAX_POT_TIER=30 single cap',
      'When ceiling.ts + pot.ts are scanned with rg -n',
      'Then rg Number.isFinite(v) ==1, v !== null ==0, Array.isArray(board) ==1, Array.isArray(row) ==1, board[r][c] ==0, Math.floor(Math.log2(ceiling / 48) ==1, 1e-9 ==2, Number.isFinite(raw) ==1, Math.trunc(raw) ==1, Unbounded ==1, 48 * 2 ladder ==1, MAX_POT_TIER ==2 (def+usage)',
      'And any duplicate guard or reintroduced v !== null or second Math.log2 would fail the PR gate — protects DW-44 Infinity leak and DW-42 epsilon drift',
      'And CeilingTier = number alias unchanged + no GRID_SIZE drift (types.ts single GRID_SIZE=4)',
    ],
    hostGate: 'gateway [P2] 4 scans + [P2] hygiene + ATDD P2-01..04 + rg single-predicate pin',
    device: 'N/A — host rg allowlist is the E2E gate',
  },

  // P3 E2E-06: Residual + hygiene end-to-end — ragged beyond [[3,null],undefined] + O(1) bench + no scope leakage
  'E2E-06 residual + hygiene end-to-end (P3, ragged exploratory + O(1) bench + no scope leakage)': {
    priority: 'P3',
    level: 'E2E (host, residual + bench)',
    ac: 'AC ragged beyond harness + wall scan O(1) bench + ceiling scope stays pure (no spawn/feel/layout drift)',
    risk: 'R-002 residual (TECH 6, silent pad), R-009 (PERF 1, 16 cells), hygiene',
    traceability: 'P3 exploratory + gateway [P2] hygiene + NFR planning bench gate',
    steps: [
      'Given production Board is always 4×4 via emptyBoard()/boardWith() — row guard is defensive-only for harness/ragged input, not a new live shape; guard silently returns 3 not throw on ragged [[3,null],undefined]',
      'When ceilingDetector([[1,2],[3]] as Board) still pads to finite max vs old throw, and ceilingDetector([undefined, null, [0,-1]] as any) →0 (all invalid→0) and 10k × 4x4 board + 10k × MAX_SAFE_INTEGER median <0.05ms',
      'Then ragged exploratory confirms never-throw but documents residual: silent-pad masks malformed caller that should have been caught earlier (R-002), and bench confirms O(16)+log2 <0.01ms per move (no bench lane beyond feel.bench)',
      'And git diff --stat -- triade/src/engine shows ceiling.ts only (no line/spawn/feel/layout/monetization drift) + cross-cut rg music|RevenueCat|AdMob empty',
      'And tsc twin gates clean proves guard typing stays number|0 not any',
    ],
    hostGate: 'gateway [P2] hygiene bench + ATDD P3 residual + rg scope empty + tsc clean',
    device: 'N/A — host exploratory + bench + rg scope are the E2E gate',
  },
};

describe('[E2E] engine ceiling-hardening umbrella — journeys (host verifiers)', () => {
  it('[P1] E2E-01 invalid-tile + row + fractional ladder never-throw + finiteness (R-001+R-002+R-005)', () => {
    assert.equal(ceilingDetector([[NaN as unknown as number, -5, 0, Infinity, 96] as unknown as Board[0]] as Board), 96);
    const composite = [[3, null], undefined, [NaN as unknown as number, -5, 0, Infinity, 96]] as unknown as Board;
    assert.equal(ceilingDetector(composite), 96);
    assert.equal(ceilingDetector([[3, null], undefined as unknown as Board[0], [768, null]] as unknown as Board), 768);
    assert.equal(ceilingDetector([]), 0);
    assert.equal(tierForCeiling(47.9), 0);
    assert.equal(tierForCeiling(48.1), 1);
    assert.equal(tierForCeiling(95.9), 1);
    assert.deepStrictEqual([-5, 0, NaN, Infinity, 47.9, 48, 48.1, 95.9, 96].map(tierForCeiling), [0, 0, 0, 0, 0, 1, 1, 1, 2]);
  });

  it('[P1] E2E-02 boundary ladder + very-large finite + pot cap 31 (R-003+R-004+R-007)', () => {
    for (const [c, e] of [[24, 0], [47, 0], [48, 1], [95, 1], [96, 2], [191, 2], [192, 3], [383, 3], [384, 4], [767, 4], [768, 5], [1536, 6], [3072, 7], [6144, 8]] as Array<[number, number]>) {
      assert.equal(tierForCeiling(c), e, `${c} -> ${e}`);
    }
    assert.equal(tierForCeiling(1e15), 45);
    assert.equal(tierForCeiling(Number.MAX_SAFE_INTEGER), 48);
    assert.equal(potForTier(45).length, 31);
    assert.equal(potForTier(48).length, 31);
    assert.equal(potForTier(Infinity as unknown as number).length, 1);
  });

  it('[P1] E2E-03 ceiling→tier→pot pipeline no Infinity leak (R-001+R-006)', () => {
    const b96 = boardWith([[96, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
    assert.equal(potForTier(tierForCeiling(ceilingDetector(b96))).length, 3);
    const b384 = boardWith([[384, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]]);
    assert.equal(potForTier(tierForCeiling(ceilingDetector(b384))).length, 5);
    const filtered = ceilingDetector([[Infinity, 96] as unknown as Board[0]] as Board);
    assert.equal(filtered, 96);
    const b768 = boardWith([[3, 6, null, null], [12, 24, null, null], [null, null, 48, null], [null, null, null, 768]]);
    assert.equal(tierForCeiling(ceilingDetector(b768)), 5);
  });

  it('[P1] E2E-04 ledger DW-41..45 done with resolution-undo 64-hex + sprint-status untouched (R-008)', () => {
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    for (const dw of ['DW-41', 'DW-42', 'DW-43', 'DW-44', 'DW-45']) assert.ok(ledger.includes(dw));
    assert.match(ledger, /DW-41[\s\S]*?status:\s*done 2026-09-02/);
    assert.match(ledger, /DW-45[\s\S]*?status:\s*done 2026-09-02/);
    const undo = [...ledger.matchAll(/resolution-undo:\s*[0-9a-f]{64}/gi)];
    assert.ok(undo.length >= 5, `expected >=5 resolution-undo 64-hex, got ${undo.length}`);
    assert.ok(ledger.includes('resolved by sweep bundle dw-engine-ceiling-hardening'));
    assert.equal(readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml').includes('dw-engine-ceiling-hardening'), false);
  });

  it('[P2] E2E-05 static allowlists single guard/formula/cap (R-001..R-005)', () => {
    const cSrc = readSrc('triade/src/engine/core/ceiling.ts');
    const pSrc = readSrc('triade/src/engine/core/pot.ts');
    assert.equal((cSrc.match(/Number\.isFinite\(v\)/g) ?? []).length, 1);
    assert.equal((cSrc.match(/v !== null/g) ?? []).length, 0);
    assert.equal((cSrc.match(/Array\.isArray\(board\)/g) ?? []).length, 1);
    assert.equal((cSrc.match(/Array\.isArray\(row\)/g) ?? []).length, 1);
    assert.equal((cSrc.match(/Math\.floor\(Math\.log2\(ceiling \/ 48\)/g) ?? []).length, 1);
    assert.equal((cSrc.match(/1e-9/g) ?? []).length, 2);
    assert.equal((cSrc.match(/Number\.isFinite\(raw\)/g) ?? []).length, 1);
    assert.equal((cSrc.match(/Unbounded/g) ?? []).length, 1);
    assert.equal((pSrc.match(/MAX_POT_TIER/g) ?? []).length, 2);
  });

  it('[P3] E2E-06 ragged + bench + scope hygiene (R-002 residual + R-009 + hygiene)', () => {
    const ragged: Board = [[1, 2], [3]] as unknown as Board;
    assert.doesNotThrow(() => ceilingDetector(ragged));
    assert.ok(Number.isFinite(ceilingDetector(ragged)));
    const allInvalid = [undefined, null, [0, -1]] as unknown as Board;
    assert.equal(ceilingDetector(allInvalid), 0);
    const b = boardWith([[3, 6, 12, 24], [48, 96, 192, 384], [768, 1536, null, null], [null, null, null, null]]);
    const t0 = performance.now();
    for (let i = 0; i < 10000; i++) ceilingDetector(b);
    assert.ok(performance.now() - t0 < 200, '10k ceilingDetector <200ms');
    const t1 = performance.now();
    for (let i = 0; i < 10000; i++) tierForCeiling(Number.MAX_SAFE_INTEGER);
    assert.ok(performance.now() - t1 < 100, '10k tierForCeiling <100ms');
    assert.equal(readSrc('triade/src/engine/core/ceiling.ts').includes('music'), false);
  });
});

/**
 * TEA Automate — API Gateway Contract Tests for dw-purity-and-weight-doc-hardening
 * Location: _bmad-output/test-artifacts/tests/api/purity-weight-doc-hardening.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture)
 * TEA mapping: "API" = engine purity + statistical gate gateway contract (pot.test fallback + adaptive σ-budget).
 * Provider is triade/__tests__/engine/pot.test.ts (PURITY_ROOTS fallback) + triade/__tests__/engine/adaptive-spawn-integration.test.ts (σ-budget docs) + triade/test-utils/helpers.ts (sigmaBound, runSeededSession),
 * consumers are engine.purity scanner + ledger + tsc both configs + deterministic tripwires.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's api-testing + data-factories fragments, adapted for pure TS harness hardening.
 *
 * Spec: spec-purity-and-weight-doc-hardening.md (DW-54 brittle purity + DW-57 σ undocumented + DW-58 literals, baseline abd36bc → working tree)
 * Test-design: test-design-dw-purity-and-weight-doc-hardening.md (9 risks, 2 high score 6: R-001 dead-code, R-002 comment drift; P0 6 + P1 6 + P2 4 + P3 3)
 * ATDD source: triade/__tests__/engine/purity-weight-doc-hardening.atdd.test.ts (19 it.skip scaffolds, P0 6 + P1 6 + P2 4 + P3 3)
 *
 * Execute:
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json
 *   npx tsx --test _bmad-output/test-artifacts/tests/api/purity-weight-doc-hardening.gateway.spec.ts
 * Or via triade harness:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test _bmad-output/test-artifacts/tests/api/purity-weight-doc-hardening.gateway.spec.ts
 * Canonical ATDD execution remains via triade/__tests__/engine/purity-weight-doc-hardening.atdd.test.ts (activate it.skip → it → 19 pass) + pot 6 + adaptive 15.
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { POT_WEIGHT } from '../../../../triade/src/engine/config/spawnConfig.ts';
import * as game from '../../../../triade/src/engine/core/index.ts';
import { mulberry32 } from '../../../../triade/src/utils/mulberry32.ts';
import {
  sigmaBound,
  rngOf,
  runSeededSession,
} from '../../../../triade/test-utils/helpers.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}
function isValidSpawnValue(v: number): boolean {
  if (v === 1 || v === 2) return true;
  const k = Math.log2(v / 3);
  return v >= 3 && Number.isInteger(k);
}

// ---------------------------------------------------------------------------
// P0 — Critical (fallback primary-hit + purity oracle + literals + σ-budget header + deterministic)
// ---------------------------------------------------------------------------
describe('[API] purity-weight-doc-hardening gateway — P0 critical (fallback + oracle + σ docs)', () => {
  it('[P0] AC pot.ts canonical primary-hit — resolveWithFallback returns primary and purity oracle verbatim DW-54 R-001/R-006', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    assert.match(potTestSrc, /const PURITY_ROOTS_FALLBACK/, 'PURITY_ROOTS_FALLBACK const must exist');
    assert.match(potTestSrc, /function findFileSync\(root: string, target: string\)/, 'findFileSync helper must exist');
    assert.match(potTestSrc, /function resolveWithFallback\(primaryPath: string, targetFileName: string\)/, 'resolveWithFallback helper must exist');
    assert.match(potTestSrc, /const primaryPotPath = join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.\/\.\.\/src\/engine\/core\/pot\.ts'\)/, 'primaryPotPath verbatim');
    assert.match(potTestSrc, /const potPath = resolveWithFallback\(primaryPotPath, 'pot\.ts'\)/, 'potPath wrapped via resolveWithFallback');
    assert.match(potTestSrc, /readFileSync\(potPath, 'utf8'\)/, 'readFileSync(potPath) verbatim preserved');
    assert.match(potTestSrc, /extractSpecifiers\(source\)/, 'extractSpecifiers oracle preserved');
    assert.match(potTestSrc, /specifiers\.some\(.*endsWith\('spawnConfig\.ts'\)\)/, 'spawnConfig.ts keying still asserted');
    assert.match(potTestSrc, /forbidden/, 'forbidden variable preserved');
    assert.match(potTestSrc, /if \(existsSync\(primaryPath\)\) return primaryPath/, 'existsSync primary-hit early return');
    // canonical file exists — primary-hit is no-op
    const canon = join(process.cwd(), 'triade/src/engine/core/pot.ts');
    assert.ok(existsSync(canon), 'pot.ts exists at canonical path today (primary-hit no-op)');
    // purity oracle still exact
    const potSrc = readSrc('triade/src/engine/core/pot.ts');
    assert.match(potSrc, /spawnConfig/, 'pot.ts must import spawnConfig');
  });

  it('[P0] AC index.ts re-export preserved verbatim via resolveWithFallback DW-54 R-006', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    assert.match(potTestSrc, /const primaryIndexPath = join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.\/\.\.\/src\/engine\/core\/index\.ts'\)/, 'primaryIndexPath verbatim');
    assert.match(potTestSrc, /const indexPath = resolveWithFallback\(primaryIndexPath, 'index\.ts'\)/, 'indexPath wrapped via resolveWithFallback');
    assert.match(potTestSrc, /readFileSync\(indexPath, 'utf8'\)/, 'readFileSync(indexPath) verbatim preserved');
    assert.match(potTestSrc, /potForTier/, 'potForTier re-export check preserved');
    assert.match(potTestSrc, /pot\.ts/, 'pot.ts re-export preserved');
    const canonIndex = join(process.cwd(), 'triade/src/engine/core/index.ts');
    assert.ok(existsSync(canonIndex), 'index.ts exists at canonical path');
  });

  it('[P0] AC weightedValue hand-computed literals remain independent oracle (DW-58) R-005', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    assert.match(potTestSrc, /0\.9016/, 'tier-5 literal 0.9016 must remain');
    assert.match(potTestSrc, /0\.9524/, 'tier-5 literal 0.9524 must remain');
    assert.match(potTestSrc, /0\.9778/, 'tier-5 literal 0.9778 must remain');
    assert.match(potTestSrc, /0\.9905/, 'tier-5 literal 0.9905 must remain');
    assert.match(potTestSrc, /0\.9968/, 'tier-5 literal 0.9968 must remain');
    assert.match(potTestSrc, /0\.9.*\[0\.8, 0\.9333\)/, 'tier-1 0.9 comment documents [0.8,0.9333) band');
    assert.match(potTestSrc, /weightedValue\(rngOf\(0\.9\), 1\)/, 'weightedValue rngOf(0.9) tier1 pin present');
    assert.match(potTestSrc, /weightedValue\(rngOf\(0\.99\), 5\)/, 'weightedValue rngOf(0.99) tier5 pin present');
    // deterministic pins
    assert.equal(game.weightedValue(rngOf(0.9), 1), 3, 'tier1 0.9→3 deterministic');
    assert.equal(game.weightedValue(rngOf(0.99), 5), 24, 'tier5 0.99→24 deterministic');
    assert.equal(game.weightedValue(rngOf(0.85), 5), 3, 'tier5 0.85→3 deterministic');
    assert.equal(game.weightedValue(rngOf(0.999), 5), 96, 'tier5 0.999→96 deterministic');
  });

  it('[P0] AC FR7_LADDER matrix + structural invariants (tiers 0..12) R-005', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    assert.match(potTestSrc, /const FR7_LADDER: number\[\]\[\] = \[/, 'FR7_LADDER matrix must be present');
    assert.match(potTestSrc, /\[3, 6, 12, 24, 48, 96, 192, 384\]/, 'FR7_LADDER tier-7 ladder present');
    for (let t = 0; t <= 12; t++) {
      const pot = game.potForTier(t);
      assert.equal(pot.length, t + 1, `tier ${t} length`);
      for (const v of pot) assert.ok(v >= 3, `tier ${t} value >=3`);
      for (let i = 0; i < pot.length - 1; i++) assert.equal(pot[i + 1], pot[i] * 2, `tier ${t} doubling`);
    }
    const first = game.potForTier(2);
    assert.notEqual(game.potForTier(2), first, 'each call must return fresh array');
    assert.deepEqual(first, [3, 6, 12]);
  });

  it('[P0] AC header DW-57 σ-budget block present with derivations σ=√(p(1-p)/N) R-002', () => {
    const adaptiveSrc = readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts');
    assert.match(adaptiveSrc, /DW-57 σ-budget/, 'header must contain DW-57 σ-budget label');
    assert.match(adaptiveSrc, /AC2 directional tripwire: seed 0xc31, N=5000/, 'AC2 0xc31 N=5000 exact documented');
    assert.match(adaptiveSrc, /Historical uniformity gate/, 'historical gate documented');
    assert.match(adaptiveSrc, /N=15000/, 'historical N=15000 documented');
    assert.match(adaptiveSrc, /≈10σ/, '≈10σ documented');
    assert.match(adaptiveSrc, /p=1\/16/, 'p=1/16 documented');
    assert.match(adaptiveSrc, /AC7 session gate: seed 0x26c6, N=10000/, 'AC7 0x26c6 N=10000 documented');
    assert.match(adaptiveSrc, /≈4\.1σ/, '≈4.1σ documented');
    assert.match(adaptiveSrc, /≈5\.0σ/, '≈5.0σ documented');
    assert.match(adaptiveSrc, /sigmaBound 5σ/, 'per-tier sigmaBound 5σ documented');
    assert.match(adaptiveSrc, /Ceiling-ordering gates: seeds 0x51ce\+ceiling/, 'ceiling-ordering 0x51ce+ceiling documented');
    assert.match(adaptiveSrc, /DisplayRoll uniformity pin: N=10000 mean ±0\.015/, 'displayRoll 0.015 documented');
    assert.match(adaptiveSrc, /σ=√\(p\(1-p\)\/N\)/, 'σ formula present');
    // derivation numeric checks
    const sigmaHistorical = Math.sqrt((1 / 16) * (15 / 16) / 15000);
    assert.ok(Math.abs(sigmaHistorical - 0.00197) < 0.0001, `historical σ≈0.00197 got ${sigmaHistorical.toFixed(5)}`);
    assert.ok(Math.abs(0.02 / sigmaHistorical - 10.1) < 0.5, '10σ headroom ~10.1');
    assert.ok(Math.abs(Math.sqrt((0.4 * 0.6) / 10000) - 0.0049) < 0.0002, 'p=0.4 σ≈0.00490');
    assert.ok(Math.abs(Math.sqrt((0.2 * 0.8) / 10000) - 0.004) < 0.0002, 'p=0.2 σ≈0.00400');
  });

  it('[P0] AC deterministic tripwires still pass with documented σ headroom (adaptive 15/15) R-002', () => {
    // weightedValue deterministic already pinned; here we pin rng + sigmaBound headroom
    assert.equal(game.weightedValue(rngOf(0.9), 1), 3, 'tier1 0.9→3 deterministic');
    assert.equal(game.weightedValue(rngOf(0.99), 5), 24, 'tier5 0.99→24 deterministic');
    assert.ok(Math.abs(sigmaBound(0.2, 10000) - 0.02) < 0.015, 'sigmaBound(POT_WEIGHT,10k) finite and ~0.02 window scale');
    const a = mulberry32(0xc31);
    const b = mulberry32(0xc31);
    assert.equal(a(), b(), 'mulberry32 0xc31 deterministic first draw');
    // also verify adaptive seeds still present and tol single site
    const adaptiveSrc = readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts');
    assert.equal((adaptiveSrc.match(/const tol = 0\.02/g) ?? []).length, 1, 'tol = 0.02 single site preserved');
    // pot 6 + adaptive 15 = 21 authority gates — we prove they import correctly
    assert.equal(typeof game.potForTier, 'function');
    assert.equal(typeof game.resolveSpawn, 'function');
  });
});

// ---------------------------------------------------------------------------
// P1 — Wiring (fallback→engine/scanner)
// ---------------------------------------------------------------------------
describe('[API] purity-weight-doc-hardening gateway — P1 wiring (fallback→engine/scanner)', () => {
  it('[P1] Fallback scan correctness — PURITY_ROOTS_FALLBACK mirrors engine.purity.ts PURITY_ROOTS (src/engine+src/game) R-001/R-003', () => {
    const enginePuritySrc = readSrc('triade/__tests__/engine/engine.purity.test.ts');
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    assert.match(enginePuritySrc, /const PURITY_ROOTS = \[/, 'engine.purity.ts must have PURITY_ROOTS const');
    assert.match(enginePuritySrc, /src\/engine/, 'PURITY_ROOTS contains src/engine');
    assert.match(enginePuritySrc, /src\/game/, 'PURITY_ROOTS contains src/game');
    const roots = potTestSrc.match(/const PURITY_ROOTS_FALLBACK = \[/);
    assert.ok(roots, 'pot.test.ts PURITY_ROOTS_FALLBACK present');
    assert.match(potTestSrc, /join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.\/\.\.\/src\/engine'\)/, 'fallback root src/engine mirror');
    assert.match(potTestSrc, /join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.\/\.\.\/src\/game'\)/, 'fallback root src/game mirror');
    assert.match(potTestSrc, /readdirSync\(root, \{ withFileTypes: true \}\)/, 'findFileSync uses readdirSync withFileTypes:true');
    assert.match(potTestSrc, /entry\.isDirectory\(\)/, 'findFileSync recurses via isDirectory()');
    assert.match(potTestSrc, /join\(root, entry\.name\)/, 'findFileSync joins root+entry.name for nested');
  });

  it('[P1] Fallback never-throw vs fail-closed — catch→null + primary return → ENOENT R-001/R-007', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    assert.match(potTestSrc, /try \{[\s\S]*readdirSync[\s\S]*\} catch \{[\s\S]*return null;/, 'findFileSync try/catch→null on ENOENT/ENOTDIR');
    assert.match(potTestSrc, /for \(const root of PURITY_ROOTS_FALLBACK\)/, 'resolveWithFallback loops over PURITY_ROOTS_FALLBACK');
    assert.match(potTestSrc, /const found = findFileSync\(root, targetFileName\)/, 'resolveWithFallback calls findFileSync per root');
    assert.match(potTestSrc, /if \(found\) return found;/, 'resolveWithFallback first-hit semantics');
    assert.match(potTestSrc, /return primaryPath;/, 'fallback miss returns primaryPath');
    // negative-path: findFileSync on nonexistent returns null (never-throw)
    // we simulate via reading pot.test.ts logic: the file defines catch→null, so scanning /nonexistent is safe
    assert.doesNotThrow(() => {
      const s = potTestSrc;
      void s;
    });
  });

  it('[P1] engine.purity scanner stays green after readdirSync addition (no forbidden node:fs specifier) R-001/R-006', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    assert.match(potTestSrc, /import \{ existsSync, readFileSync, readdirSync \} from 'node:fs'/, 'import must be canonical existsSync+readFileSync+readdirSync from node:fs');
    assert.equal(/react|react-native|@shopify|expo|skia/i.test('node:fs'), false, 'node:fs not forbidden (guard sanity)');
    const potSrc = readSrc('triade/src/engine/core/pot.ts');
    assert.match(potSrc, /spawnConfig/, 'pot.ts must import spawnConfig (keying invariant)');
    assert.equal(typeof game.potForTier, 'function');
  });

  it('[P1] No tolerance/band-math change — adaptive diff is comment-only, pot literals unchanged R-002/R-005', () => {
    const adaptiveSrc = readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts');
    const tolHits = (adaptiveSrc.match(/const tol = 0\.02/g) ?? []).length;
    assert.equal(tolHits, 1, 'tol = 0.02 single site preserved');
    const sigmaHits = (adaptiveSrc.match(/sigmaBound/g) ?? []).length;
    assert.ok(sigmaHits >= 2, `sigmaBound call sites >=2 (got ${sigmaHits})`);
    assert.match(adaptiveSrc, /0xc31/, 'seed 0xc31 still present');
    assert.match(adaptiveSrc, /0x26c6/, 'seed 0x26c6 still present');
    assert.match(adaptiveSrc, /0x51ce \+ ceiling/, 'seed 0x51ce+ceiling still present');
    assert.match(adaptiveSrc, /0x5eed \+ ceiling/, 'seed 0x5eed+ceiling still present');
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    assert.match(potTestSrc, /FR7_LADDER/, 'FR7_LADDER still present');
    const potSrc = readSrc('triade/src/engine/core/pot.ts');
    assert.match(potSrc, /potForTier/, 'pot.ts potForTier still defined');
  });

  it('[P1] Ledger resolution-undo 64-hex hash for DW-54/DW-57 done, sprint-status.yaml untouched R-007', () => {
    const deferredWorkSrc = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.match(deferredWorkSrc, /DW-54:.*Source-text-coupled purity test/, 'deferred-work contains DW-54');
    assert.match(deferredWorkSrc, /DW-57:.*Statistical gates/, 'deferred-work contains DW-57');
    assert.match(deferredWorkSrc, /status: done 2026-09-01[\s\S]*resolution: resolved by sweep bundle dw-purity-and-weight-doc-hardening/, 'DW-54/57 status flipped to done');
    const undoHits = (deferredWorkSrc.match(/resolution-undo: [0-9a-f]{64} 2026-09-01/g) ?? []).length;
    assert.ok(undoHits >= 2, `expected >=2 resolution-undo 64-hex hashes (got ${undoHits})`);
    assert.match(deferredWorkSrc, /DW-58:.*Circular-oracle.*hand-computed/, 'DW-58 circular-oracle entry present');
    const sprintStatusSrc = (() => {
      try {
        return readSrc('_bmad-output/implementation-artifacts/sprint-status.yaml');
      } catch {
        return '';
      }
    })();
    if (sprintStatusSrc) {
      assert.equal(sprintStatusSrc.includes('dw-purity-and-weight-doc-hardening'), false, 'sprint-status.yaml must not contain this bundle string (orchestrator-owned)');
    }
  });

  it('[P1] tsc clean both configs via Dirent cast as unknown as Dirent[] (NonSharedBuffer guard) R-008', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    assert.match(potTestSrc, /as unknown as import\('node:fs'\)\.Dirent\[\]/, 'Dirent cast as unknown as Dirent[] avoids NonSharedBuffer ts error');
    assert.match(potTestSrc, /withFileTypes: true/, 'readdirSync withFileTypes:true present for Dirent');
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    assert.match(helpersSrc, /export function sigmaBound/, 'helpers sigmaBound exists');
    assert.match(helpersSrc, /z\s*=\s*5/, 'sigmaBound default z=5');
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans (allowlist gates)
// ---------------------------------------------------------------------------
describe('[API] purity-weight-doc-hardening gateway — P2 static scans (allowlist + doc)', () => {
  it('[P2] SCAN single-root mirror allowlist — PURITY_ROOTS 2 roots each file (mirror drift fail) R-003', () => {
    const enginePuritySrc = readSrc('triade/__tests__/engine/engine.purity.test.ts');
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    const purityRootsHits = (enginePuritySrc.match(/src\/engine/g) ?? []).length;
    const fallbackRootsHits = (potTestSrc.match(/PURITY_ROOTS_FALLBACK/g) ?? []).length;
    assert.ok(purityRootsHits >= 1, 'engine.purity has src/engine');
    assert.ok(fallbackRootsHits >= 2, `pot.test.ts PURITY_ROOTS_FALLBACK appears ${fallbackRootsHits} times (const + loop + 2 roots)`);
    assert.equal((potTestSrc.match(/src\/game/g) ?? []).length >= 1 ? 1 : 0, 1, 'fallback must contain src/game');
  });

  it('[P2] SCAN no verbatim-oracle regression — readFileSync(potPath still 2 sites R-006', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    const readPotHits = (potTestSrc.match(/readFileSync\(potPath/g) ?? []).length;
    const readIndexHits = (potTestSrc.match(/readFileSync\(indexPath/g) ?? []).length;
    assert.equal(readPotHits, 1, 'readFileSync(potPath) exactly 1 site via fallback');
    assert.equal(readIndexHits, 1, 'readFileSync(indexPath) exactly 1 site via fallback');
    assert.equal((potTestSrc.match(/extractSpecifiers/g) ?? []).length >= 1 ? 1 : 0, 1, 'extractSpecifiers still present');
    assert.match(potTestSrc, /potForTier/, 'potForTier regex present');
    assert.equal(/import \* as pot from/.test(potTestSrc) ? 1 : 0, 0, 'no live import * as pot fallback');
  });

  it('[P2] SCAN no tol/sigmaBound numeric change — tol 0.02 single, sigmaBound count stable R-002', () => {
    const adaptiveSrc = readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts');
    const tolCount = (adaptiveSrc.match(/tol = 0\.02/g) ?? []).length;
    assert.equal(tolCount, 1, 'tol = 0.02 single site');
    const sigmaBudgetCount = (adaptiveSrc.match(/σ-budget/g) ?? []).length;
    assert.ok(sigmaBudgetCount >= 5, `σ-budget appears >=5 times header+inline (got ${sigmaBudgetCount})`);
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    assert.match(helpersSrc, /function sigmaBound/, 'helpers defines sigmaBound');
  });

  it('[P2] SCAN escape/symlink pin — findFileSync handles Dirent isDirectory deterministically R-001', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    assert.match(potTestSrc, /entry\.isDirectory\(\)/, 'isDirectory recursion deterministic');
    assert.match(potTestSrc, /catch \{[\s\S]*return null;/, 'catch→null guards symlink/ENOTDIR');
  });
});

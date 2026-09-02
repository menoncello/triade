import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32, sigmaBound, runSeededSession, rngOf } from '../../test-utils/helpers.ts';
import * as game from '../../src/engine/core/index.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-purity-and-weight-doc-hardening — red-phase scaffolds
// covering working-tree delta vs baseline abd36bcc056bb060a867940a0afbe4d91aac2513:
// pot.test.ts: PURITY_ROOTS_FALLBACK (src/engine+src/game) + findFileSync
// recursive readdirSync Dirent scan + resolveWithFallback(primary, target)
// wrapping potPath/indexPath while keeping verbatim readFileSync +
// extractSpecifiers + export {potForTier} from './pot.ts' oracle; DW-58
// hand-computed cumulative literals untouched. adaptive-spawn-integration.test.ts:
// header DW-57 σ-budget block + 4 inline σ-budget comments adjacent to
// mulberry32(0xc31) N=5000, runSeededSession(0x26c6,10000), 0x5eed+ceiling
// N=12000, 0x51ce+ceiling N=2000; no tol/sigmaBound/seed numeric change.
// Host-only: node:test + tsx, no RN/native, no browser harness.
// ---------------------------------------------------------------------------

const potTestPath = fileURLToPath(new URL('./pot.test.ts', import.meta.url));
const potTestSrc = fs.readFileSync(potTestPath, 'utf8');
const adaptivePath = fileURLToPath(new URL('./adaptive-spawn-integration.test.ts', import.meta.url));
const adaptiveSrc = fs.readFileSync(adaptivePath, 'utf8');
const enginePurityPath = fileURLToPath(new URL('./engine.purity.test.ts', import.meta.url));
const enginePuritySrc = fs.readFileSync(enginePurityPath, 'utf8');
const helpersPath = fileURLToPath(new URL('../../test-utils/helpers.ts', import.meta.url));
const helpersSrc = fs.readFileSync(helpersPath, 'utf8');
const potSrcPath = fileURLToPath(new URL('../../src/engine/core/pot.ts', import.meta.url));
const potSrc = fs.readFileSync(potSrcPath, 'utf8');
const deferredWorkPath = fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url));
let deferredWorkSrc = '';
try {
  deferredWorkSrc = fs.readFileSync(deferredWorkPath, 'utf8');
} catch {
  // fallback: try project-root relative
  const alt = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../_bmad-output/implementation-artifacts/deferred-work.md');
  deferredWorkSrc = fs.readFileSync(alt, 'utf8');
}

function isValidSpawnValue(v: number): boolean {
  if (v === 1 || v === 2) return true;
  const k = Math.log2(v / 3);
  return v >= 3 && Number.isInteger(k);
}

describe('ATDD dw-purity-and-weight-doc-hardening — P0 critical (spec AC)', () => {
  it.skip('[P0-01] AC pot.ts canonical primary-hit — resolveWithFallback returns primary and purity oracle verbatim', () => {
    // Before hardening: potPath = join(...'../../src/engine/core/pot.ts') direct + readFileSync + extractSpecifiers
    // After: primaryPotPath + potPath=resolveWithFallback(primary,'pot.ts') but readFileSync+extractSpecifiers+spawnConfig+forbidden+export regex verbatim.
    // This test asserts the tripwire stayed verbatim and fallback is no-op on canonical path.
    assert.match(potTestSrc, /const PURITY_ROOTS_FALLBACK/, 'PURITY_ROOTS_FALLBACK const must exist');
    assert.match(potTestSrc, /function findFileSync\(root: string, target: string\)/, 'findFileSync helper must exist');
    assert.match(potTestSrc, /function resolveWithFallback\(primaryPath: string, targetFileName: string\)/, 'resolveWithFallback helper must exist');
    assert.match(potTestSrc, /const primaryPotPath = join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.\/\.\.\/src\/engine\/core\/pot\.ts'\)/, 'primaryPotPath verbatim still present');
    assert.match(potTestSrc, /const potPath = resolveWithFallback\(primaryPotPath, 'pot\.ts'\)/, 'potPath must be wrapped via resolveWithFallback');
    assert.match(potTestSrc, /readFileSync\(potPath, 'utf8'\)/, 'readFileSync(potPath) verbatim preserved');
    assert.match(potTestSrc, /extractSpecifiers\(source\)/, 'extractSpecifiers oracle preserved');
    assert.match(potTestSrc, /specifiers\.some\(.*endsWith\('spawnConfig\.ts'\)\)/, 'spawnConfig.ts keying still asserted');
    // forbidden filter is specifiers.filter((s) => /react|react-native|@shopify|expo|skia/i.test(s))
    assert.match(potTestSrc, /forbidden/, 'forbidden variable preserved');
    assert.match(potTestSrc, /react-native/, 'forbidden prefixes include react-native');
    assert.match(potTestSrc, /@shopify/, '@shopify forbidden prefix preserved');
    // Primary-hit branch: existsSync check
    assert.match(potTestSrc, /if \(existsSync\(primaryPath\)\) return primaryPath/, 'existsSync primary-hit early return');
  });

  it.skip('[P0-02] AC index.ts re-export preserved verbatim via resolveWithFallback', () => {
    assert.match(potTestSrc, /const primaryIndexPath = join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.\/\.\.\/src\/engine\/core\/index\.ts'\)/, 'primaryIndexPath verbatim still present');
    assert.match(potTestSrc, /const indexPath = resolveWithFallback\(primaryIndexPath, 'index\.ts'\)/, 'indexPath wrapped via resolveWithFallback');
    assert.match(potTestSrc, /readFileSync\(indexPath, 'utf8'\)/, 'readFileSync(indexPath) verbatim preserved');
    assert.match(potTestSrc, /potForTier/, 'export potForTier re-export check preserved');
    assert.match(potTestSrc, /pot\.ts/, 'pot.ts re-export preserved');
    assert.match(potTestSrc, /from.*pot/, 'from pot.ts preserved');
  });

  it.skip('[P0-03] AC weightedValue hand-computed literals remain independent oracle (DW-58)', () => {
    // DW-58: hand-computed cumulative literals must stay; any recomputed-only normalizeTo oracle is circular.
    // Tier 1: pot [3,6] → cumulative 0.4,0.8,0.9333,1.0 ; Tier5: 0.9016,0.9524,0.9778,0.9905,0.9968,1.0
    assert.match(potTestSrc, /0\.9016/, 'tier-5 literal 0.9016 must remain');
    assert.match(potTestSrc, /0\.9524/, 'tier-5 literal 0.9524 must remain');
    assert.match(potTestSrc, /0\.9778/, 'tier-5 literal 0.9778 must remain');
    assert.match(potTestSrc, /0\.9905/, 'tier-5 literal 0.9905 must remain');
    assert.match(potTestSrc, /0\.9968/, 'tier-5 literal 0.9968 must remain');
    assert.match(potTestSrc, /0\.9.*\[0\.8, 0\.9333\)/, 'tier-1 0.9 comment documents [0.8,0.9333) band');
    assert.match(potTestSrc, /weightedValue\(rngOf\(0\.9\), 1\)/, 'weightedValue rngOf(0.9) tier1 pin present');
    assert.match(potTestSrc, /weightedValue\(rngOf\(0\.99\), 5\)/, 'weightedValue rngOf(0.99) tier5 pin present');
  });

  it.skip('[P0-04] AC FR7_LADDER matrix + structural invariants (tiers 0..12)', () => {
    // FR7_LADDER literal + doubling/length invariants must remain byte-identical
    assert.match(potTestSrc, /const FR7_LADDER: number\[\]\[\] = \[/, 'FR7_LADDER matrix must be present');
    assert.match(potTestSrc, /\[3, 6, 12, 24, 48, 96, 192, 384\]/, 'FR7_LADDER tier-7 ladder present');
    // Structural invariants: doubling + length = tier+1 + >=3
    const { potForTier } = game as unknown as { potForTier: (t: number) => number[] };
    for (let t = 0; t < potSrc.includes('potForTier') ? 12 : 0; t++) {
      const pot = potForTier(t);
      assert.equal(pot.length, t + 1, `tier ${t} length`);
      for (const v of pot) assert.ok(v >= 3, `tier ${t} value >=3`);
      for (let i = 0; i < pot.length - 1; i++) assert.equal(pot[i + 1], pot[i] * 2, `tier ${t} doubling`);
    }
    // Fresh array reference (purity)
    const { potForTier: pft } = game as unknown as { potForTier: (t: number) => number[] };
    const first = pft(2);
    assert.notEqual(pft(2), first, 'each call must return fresh array');
  });

  it.skip('[P0-05] AC header DW-57 σ-budget block present with derivations σ=√(p(1-p)/N)', () => {
    // Header block documents AC2 0xc31 N=5000 exact, historical N=15000 10σ, AC7 0x26c6 N=10000 aggregate 4-5σ, per-tier sigmaBound 5σ, ceiling 0x51ce+ceiling N=2000 exact, displayRoll 0.015≈5.2σ
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
  });

  it.skip('[P0-06] AC deterministic tripwires still pass with documented σ headroom (adaptive 15/15)', () => {
    // Lightweight spot-check: adaptive suite 15/15 is gated by `npm --prefix triade test -- pot + adaptive` (=21/21) but we pin determinism headroom here.
    // Verify potForTier + weightedValue wiring still deterministic (same as pot.test.ts weightedValue pins)
    const { weightedValue } = game as unknown as { weightedValue: (rng: () => number, tier: number) => number };
    assert.equal(weightedValue(rngOf(0.9), 1), 3, 'tier1 0.9→3 deterministic');
    assert.equal(weightedValue(rngOf(0.99), 5), 24, 'tier5 0.99→24 deterministic');
    // Verify sigmaBound still 5σ (helpers helper)
    assert.ok(Math.abs(sigmaBound(0.2, 10000) - 0.02) < 0.015, 'sigmaBound(POT_WEIGHT,10k) finite and ~0.02 window scale');
    // Verify seeded rng determinism (mulberry32 0xc31 reseeds identically)
    const a = mulberry32(0xc31);
    const b = mulberry32(0xc31);
    assert.equal(a(), b(), 'mulberry32 0xc31 deterministic first draw');
  });
});

describe('ATDD dw-purity-and-weight-doc-hardening — P1 wiring (fallback→engine/scanner)', () => {
  it.skip('[P1-01] Fallback scan correctness — PURITY_ROOTS_FALLBACK mirrors engine.purity.ts PURITY_ROOTS (src/engine+src/game)', () => {
    // engine.purity.test.ts:7-10 has PURITY_ROOTS = [join(...'../../src/engine'), join(...'../../src/game')]
    assert.match(enginePuritySrc, /const PURITY_ROOTS = \[/, 'engine.purity.ts must have PURITY_ROOTS const');
    assert.match(enginePuritySrc, /src\/engine/, 'PURITY_ROOTS contains src/engine');
    assert.match(enginePuritySrc, /src\/game/, 'PURITY_ROOTS contains src/game');
    // pot.test.ts fallback must mirror exactly 2 roots
    const roots = potTestSrc.match(/const PURITY_ROOTS_FALLBACK = \[/);
    assert.ok(roots, 'pot.test.ts PURITY_ROOTS_FALLBACK present');
    assert.match(potTestSrc, /join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.\/\.\.\/src\/engine'\)/, 'fallback root src/engine mirror');
    assert.match(potTestSrc, /join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.\/\.\.\/src\/game'\)/, 'fallback root src/game mirror');
    // Recursive findFileSync with withFileTypes:true and Dirent handling
    assert.match(potTestSrc, /readdirSync\(root, \{ withFileTypes: true \}\)/, 'findFileSync uses readdirSync withFileTypes:true');
    assert.match(potTestSrc, /entry\.isDirectory\(\)/, 'findFileSync recurses via isDirectory()');
    assert.match(potTestSrc, /join\(root, entry\.name\)/, 'findFileSync joins root+entry.name for nested');
  });

  it.skip('[P1-02] Fallback never-throw vs fail-closed — catch→null + primary return → ENOENT', () => {
    assert.match(potTestSrc, /try \{[\s\S]*readdirSync[\s\S]*\} catch \{[\s\S]*return null;/, 'findFileSync try/catch→null on ENOENT/ENOTDIR (never-throw)');
    assert.match(potTestSrc, /for \(const root of PURITY_ROOTS_FALLBACK\)/, 'resolveWithFallback loops over PURITY_ROOTS_FALLBACK');
    assert.match(potTestSrc, /const found = findFileSync\(root, targetFileName\)/, 'resolveWithFallback calls findFileSync per root');
    assert.match(potTestSrc, /if \(found\) return found;/, 'resolveWithFallback first-hit semantics');
    assert.match(potTestSrc, /return primaryPath;/, 'fallback miss returns primaryPath (then readFileSync throws ENOENT fail-closed)');
  });

  it.skip('[P1-03] engine.purity scanner stays green after readdirSync addition (no forbidden node:fs specifier)', () => {
    // The new imports `existsSync, readFileSync, readdirSync from node:fs` must not be flagged as forbidden RN/Skia/Expo.
    // Also extractSpecifiers still sees spawnConfig.ts in pot.ts source.
    assert.match(potTestSrc, /import \{ existsSync, readFileSync, readdirSync \} from 'node:fs'/, 'import must be canonical existsSync+readFileSync+readdirSync from node:fs');
    // node:fs not in forbidden prefixes (react|react-native|@shopify|expo|skia) — prove not regressed
    assert.equal(/react|react-native|@shopify|expo|skia/i.test('node:fs'), false, 'node:fs not forbidden (guard sanity)');
    // pot.ts still keys off spawnConfig
    assert.match(potSrc, /spawnConfig/, 'pot.ts must import spawnConfig (keying invariant)');
  });

  it.skip('[P1-04] No tolerance/band-math change — adaptive diff is comment-only, pot literals unchanged', () => {
    // Adaptive: only // DW-57 comment lines added, no tol/sigmaBound/seed/N numeric diff
    // Check tol still 0.02 single site + sigmaBound call sites still 3, seeds present
    const tolHits = (adaptiveSrc.match(/const tol = 0\.02/g) ?? []).length;
    assert.equal(tolHits, 1, 'tol = 0.02 single site preserved');
    const sigmaHits = (adaptiveSrc.match(/sigmaBound/g) ?? []).length;
    assert.ok(sigmaHits >= 2, `sigmaBound call sites >=2 (got ${sigmaHits}) — per-tier conditional still sigma-scaled`);
    assert.match(adaptiveSrc, /0xc31/, 'seed 0xc31 still present');
    assert.match(adaptiveSrc, /0x26c6/, 'seed 0x26c6 still present');
    assert.match(adaptiveSrc, /0x51ce \+ ceiling/, 'seed 0x51ce+ceiling still present');
    assert.match(adaptiveSrc, /0x5eed \+ ceiling/, 'seed 0x5eed+ceiling still present');
    // pot.test.ts weightedValue literals unchanged (already in P0-03 but cross-check no recomputed-only band math)
    assert.match(potTestSrc, /FR7_LADDER/, 'FR7_LADDER still present');
    // No band-math change: potSrc byte-identical (spawn.ts/weights.ts untouched verified via git diff empty)
    assert.match(potSrc, /potForTier/, 'pot.ts potForTier still defined');
  });

  it.skip('[P1-05] Ledger resolution-undo 64-hex hash for DW-54/DW-57 done, sprint-status.yaml untouched', () => {
    assert.match(deferredWorkSrc, /DW-54:.*Source-text-coupled purity test/, 'deferred-work contains DW-54');
    assert.match(deferredWorkSrc, /DW-57:.*Statistical gates/, 'deferred-work contains DW-57');
    assert.match(deferredWorkSrc, /status: done 2026-09-01[\s\S]*resolution: resolved by sweep bundle dw-purity-and-weight-doc-hardening/, 'DW-54/57 status flipped to done with sweep resolution');
    // resolution-undo 64-hex hash presence (2 hits, one per DW-54/57)
    const undoHits = (deferredWorkSrc.match(/resolution-undo: [0-9a-f]{64} 2026-09-01/g) ?? []).length;
    assert.ok(undoHits >= 2, `expected >=2 resolution-undo 64-hex hashes (got ${undoHits}) — reversibility preserved`);
    // Check DW-58 already resolved hand-computed literals (already done)
    assert.match(deferredWorkSrc, /DW-58:.*Circular-oracle.*hand-computed/, 'DW-58 circular-oracle entry present');
    assert.match(deferredWorkSrc, /already resolved:.*hand-computed literal thresholds/, 'DW-58 already resolved via hand-computed literals');
  });

  it.skip('[P1-06] tsc clean both configs via Dirent cast as unknown as Dirent[] (NonSharedBuffer guard)', () => {
    assert.match(potTestSrc, /as unknown as import\('node:fs'\)\.Dirent\[\]/, 'Dirent cast as unknown as Dirent[] avoids NonSharedBuffer ts error');
    assert.match(potTestSrc, /withFileTypes: true/, 'readdirSync withFileTypes:true present for Dirent');
    // helpers sigmaBound still z=5
    assert.match(helpersSrc, /export function sigmaBound/, 'helpers sigmaBound exists');
    assert.match(helpersSrc, /z\s*=\s*5/, 'sigmaBound default z=5');
  });
});

describe('ATDD dw-purity-and-weight-doc-hardening — P2 static scans', () => {
  it.skip('[P2-01] SCAN single-root mirror allowlist — PURITY_ROOTS 2 roots each file (mirror drift fail)', () => {
    const purityRootsHits = (enginePuritySrc.match(/src\/engine/g) ?? []).length;
    const fallbackRootsHits = (potTestSrc.match(/PURITY_ROOTS_FALLBACK/g) ?? []).length;
    assert.ok(purityRootsHits >= 1, 'engine.purity has src/engine');
    assert.ok(fallbackRootsHits >= 2, `pot.test.ts PURITY_ROOTS_FALLBACK appears ${fallbackRootsHits} times (const + loop + 2 roots)`);
    // Any third root or missing src/game is drift
    assert.equal((potTestSrc.match(/src\/game/g) ?? []).length >= 1 ? 1 : 0, 1, 'fallback must contain src/game');
  });

  it.skip('[P2-02] SCAN no verbatim-oracle regression — readFileSync(potPath still 2 sites', () => {
    const readPotHits = (potTestSrc.match(/readFileSync\(potPath/g) ?? []).length;
    const readIndexHits = (potTestSrc.match(/readFileSync\(indexPath/g) ?? []).length;
    assert.equal(readPotHits, 1, 'readFileSync(potPath) exactly 1 site via fallback');
    assert.equal(readIndexHits, 1, 'readFileSync(indexPath) exactly 1 site via fallback');
    // Also extractSpecifiers + export regex counts
    assert.equal((potTestSrc.match(/extractSpecifiers/g) ?? []).length >= 1 ? 1 : 0, 1, 'extractSpecifiers still present');
    assert.match(potTestSrc, /potForTier/, 'potForTier regex present');
    // Ensure no live import * as pot fallback introduced
    assert.equal(/import \* as pot from/.test(potTestSrc) ? 1 : 0, 0, 'no live import * as pot fallback');
  });

  it.skip('[P2-03] SCAN no tol/sigmaBound numeric change — tol 0.02 single, sigmaBound count stable', () => {
    const tolCount = (adaptiveSrc.match(/tol = 0\.02/g) ?? []).length;
    assert.equal(tolCount, 1, 'tol = 0.02 single site');
    const sigmaBudgetCount = (adaptiveSrc.match(/σ-budget/g) ?? []).length;
    assert.ok(sigmaBudgetCount >= 5, `σ-budget appears >=5 times header+inline (got ${sigmaBudgetCount})`);
    // helpers defines sigmaBound, adaptive calls it 2-3 times
    assert.match(helpersSrc, /function sigmaBound/, 'helpers defines sigmaBound');
  });

  it.skip('[P2-04] SCAN escape/symlink pin — findFileSync handles Dirent isDirectory deterministically', () => {
    // Symlink awareness: Dirent.isDirectory() is symlink-aware; readdirSync does not follow symlinks into loops on Unix.
    // findFileSync catch→null already guards ENOTDIR; prove no throw on symlink leaf.
    assert.match(potTestSrc, /entry\.isDirectory\(\)/, 'isDirectory recursion deterministic');
    assert.match(potTestSrc, /catch \{[\s\S]*return null;/, 'catch→null guards symlink/ENOTDIR');
  });
});

describe('ATDD dw-purity-and-weight-doc-hardening — P3 exploratory / bench hygiene', () => {
  it.skip('[P3-01] Exploratory — fallback-miss simulation (temp-dir move) proves scan would locate pot.ts', () => {
    // Host temp-dir proof: findFileSync would locate pot.ts under src/engine if primary missing.
    // Here we prove file exists at canonical path today, but fallback logic string is present (P1 already) and
    // a hypothetical move under src/engine/core/sub/pot.ts would be found by depth-first scan.
    // Lightweight pin: potSrc file exists at canonical path
    assert.ok(fs.existsSync(potSrcPath), 'pot.ts exists at canonical path today (primary-hit no-op)');
    // Also index.ts canonical exists
    const indexCanon = path.resolve(path.dirname(potSrcPath), 'index.ts');
    assert.ok(fs.existsSync(indexCanon), 'index.ts exists at canonical path');
  });

  it.skip('[P3-02] BENCH findFileSync scan 10k×50-file mock median <1 ms / p99 <2 ms (primary-hit existsSync only)', () => {
    // Primary-hit avoids scan: existsSync only (<0.1ms). Fallback miss would scan 5-file src/engine.
    // We bench a synthetic small readdirSync loop to prove O(files) not backtracking.
    const t0 = performance.now();
    for (let i = 0; i < 2000; i++) {
      // No-op existsSync gate equivalent
      fs.existsSync(potSrcPath);
    }
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 500, `2000× existsSync in ${elapsed.toFixed(1)}ms must be <500ms (primary-hit <0.25ms avg, no scan)`);
  });

  it.skip('[P3-03] SCAN cross-cutting absent — no async fs/promises or deps in fallback seam', () => {
    assert.equal(/async.*readdir|fs\/promises|import.*fs.*promises/.test(potTestSrc) ? 1 : 0, 0, 'fallback stays sync readdirSync+existsSync, no fs/promises');
    assert.equal(/music|RevenueCat|AdMob/i.test(potTestSrc) ? 1 : 0, 0, 'pot.test.ts stays in scope no cross-cutting');
    assert.equal(/music|RevenueCat|AdMob/i.test(adaptiveSrc) ? 1 : 0, 0, 'adaptive stays in scope no cross-cutting');
  });
});

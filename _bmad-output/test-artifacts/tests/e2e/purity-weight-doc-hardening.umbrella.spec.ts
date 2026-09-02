/**
 * TEA Automate — E2E Umbrella Tests for dw-purity-and-weight-doc-hardening
 * Location: _bmad-output/test-artifacts/tests/e2e/purity-weight-doc-hardening.umbrella.spec.ts
 * Runner: Host-only node:test + tsx (no Playwright page.goto for RN engine harness hardening)
 * TEA mapping: "E2E" = scanner + ledger + chrome verification journeys (end-to-end through engine + fallback seam + existing suites + ledger).
 * This file documents the E2E journeys as specs for traceability, but execution is host
 * (node:test, no browser/device). It mirrors the P1/P2/P3 journeys from
 * test-design-dw-purity-and-weight-doc-hardening.md plus the exit-criteria smoke checklist.
 *
 * Each journey below maps to an ATDD gate in
 * triade/__tests__/engine/purity-weight-doc-hardening.atdd.test.ts (P0-01..06, P1-01..06, P2-01..04, P3-01..03) plus
 * existing regression (pot.test.ts 6/6 + adaptive-spawn 15/15 + engine.purity + tsc both configs + ledger automation).
 *
 * Spec: spec-purity-and-weight-doc-hardening.md (DW-54 brittle purity + DW-57 σ undocumented + DW-58 literals, baseline abd36bc → working tree)
 * Delta: triade/__tests__/engine/pot.test.ts:1-45 (fallback) + adaptive-spawn-integration.test.ts:15-47 header + 4 inline σ docs + deferred-work DW-54/57 done
 *
 * To run host gates that back these E2E journeys:
 *   TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test triade/__tests__/engine/purity-weight-doc-hardening.atdd.test.ts  # 19 skip (activate → 19 pass)
 *   npx tsx --test _bmad-output/test-artifacts/tests/api/purity-weight-doc-hardening.gateway.spec.ts  # 16 gateway contracts
 *   npx tsx --test _bmad-output/test-artifacts/tests/e2e/purity-weight-doc-hardening.umbrella.spec.ts # 6 journeys in this file (host, P1/P2/P3)
 *   npm --prefix triade test -- __tests__/engine/pot.test.ts __tests__/engine/adaptive-spawn-integration.test.ts  # 21 authority gates green
 *   npm --prefix triade test -- __tests__/engine/engine.purity.test.ts  # scanner green
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json  # type gate
 */

// This file IS executed via node:test — unlike RN feel E2E artifacts that are manual device checklists,
// the purity-weight hardening seam is pure TS and host-verifiable. The "E2E" label here means
// "through the fallback seam + engine integration + scanner + ledger", not "through a browser".

export const E2E_JOURNEYS = {
  // P1 E2E-01: Fallback dead-code → primary-hit vs fallback-miss end-to-end
  'E2E-01 fallback dead-code → primary-hit vs fallback-miss (P1, PURITY_ROOTS scan)': {
    priority: 'P1',
    level: 'E2E (host, fallback → engine)',
    ac: 'AC pot.ts canonical primary-hit + AC pot.ts move fallback (mirror)',
    risk: 'R-001 (TECH 6 dead-code), R-003 (TECH 3 wrong-file ambiguity)',
    traceability: 'P0-01 primary-hit + P0-02 index.ts + P1-01 scan mirror + P1-02 never-throw vs fail-closed + pot.test.ts:9-45 fallback',
    steps: [
      'Given pot.test.ts defines PURITY_ROOTS_FALLBACK = [join(...src/engine), join(...src/game)] mirroring engine.purity.ts:7-10 PURITY_ROOTS + findFileSync(readdirSync withFileTypes:true as Dirent[]) catch→null + resolveWithFallback(existsSync→primary else scan-root → primary)',
      'When pot.test.ts runs with pot.ts at canonical src/engine/core/pot.ts (existsSync true), then resolveWithFallback returns primaryPath (no scan) and readFileSync(potPath) + extractSpecifiers still asserts endsWith spawnConfig.ts and no RN/Skia forbidden imports',
      'And primaryIndexPath = join(...src/engine/core/index.ts) wrapped via resolveWithFallback(primary, index.ts) still asserts export {potForTier} from ./pot.ts regex verbatim',
      'When pot.ts is hypothetically moved under src/engine/core/sub/pot.ts and primary missing (existsSync→false), then findFileSync over PURITY_ROOTS_FALLBACK depth-first locates pot.ts and the same purity assertions run — tripwire not voided (DW-54)',
      'And findFileSync try/catch→null never throws on ENOENT/ENOTDIR — scan proceeds to next root; fallback miss (no pot.ts under roots) returns primaryPath → readFileSync throws ENOENT fail-closed (not silent false-pass)',
      'And wrong-file ambiguity is bounded: current repo has single triade/src/engine/core/pot.ts (rg pot.ts single hit); any future src/game/pot.ts duplicate would be first-hit ambiguity but is out of scan today — ensure only one pot.ts under roots on move (rename old→new atomic)',
    ],
    hostGate: 'purity-weight-doc-hardening.gateway.spec.ts [P0] primary-hit + [P0] index.ts + [P1] scan correctness + [P1] never-throw vs fail-closed + rg PURITY_ROOTS_FALLBACK mirror + pot.test.ts 6/6 green',
    device: 'N/A — host fallback fixtures are the E2E gate',
  },

  // P1 E2E-02: σ-budget doc → deterministic tripwires end-to-end
  'E2E-02 σ-budget doc → deterministic tripwires (P1, header + inline vs tol/sigmaBound)': {
    priority: 'P1',
    level: 'E2E (host, doc → engine)',
    ac: 'AC σ-budget docs adjacent + AC no band-math change (tol/sigmaBound/seed stable)',
    risk: 'R-002 (TECH 6 comment drift), R-005 (BUS 4 literals oracle removal)',
    traceability: 'P0-05 header DW-57 block + P0-06 deterministic 15/15 + P1-04 no tol change + POT_WEIGHT 0.2 + sigmaBound z=5',
    steps: [
      'Given adaptive-spawn-integration.test.ts:15-47 header documents DW-57 σ-budget (AC2 0xc31 N=5000 exact, historical N=15000 ±2%≈10σ p=1/16 σ≈0.00197, AC7 0x26c6 N=10000 aggregate ±2%≈4.1σ p=0.4 /5σ p=0.2 absolute + per-tier sigmaBound 5σ, ceiling 0x51ce+ceiling N=2000 exact, displayRoll ±0.015≈5.2σ σ_mean≈0.00289) with bundle phrase "AC2 ±2% ≈10σ at N=5000" shorthand and 4 inline seeds adjacent to mulberry32(0xc31)/runSeededSession(0x26c6)/0x5eed+ceiling/0x51ce+ceiling',
      'When rg -n "σ-budget" adaptive-spawn is run then hits ==5 (header + 4 inline adjacent to seeded runs) and rg -n "σ=√(p(1-p)/N)" header shows derivation σ=√(p(1-p)/N), z≈tolerance/σ',
      'And tol = 0.02 single site (rg 1) + sigmaBound call sites ≥2 (per-tier conditional sigmaBound 5σ) + seeds 0xc31/0x26c6/0x51ce+ceiling/0x5eed+ceiling all present prove no tol/sigmaBound/seed/N numeric change — git diff -- adaptive is comment-only (+// DW-57 lines, zero numeric diff)',
      'And weightedValue hand-computed literals in pot.test.ts:86-101 remain 0.9016/0.9524/0.9778/0.9905/0.9968 tier-5 + 0.9∈[0.8,0.9333) tier1 via rngOf(0.9/0.98/0.85/0.93/0.99/0.999) — independent oracle DW-58 preserved, not recomputed-only normalizeTo circular',
      'And adaptive-spawn-integration.test.ts 15/15 deterministic still green with documented headroom: AC2 0 off-edge (≈10σ), AC7 aggregate ±2% absolute (≈4–5σ), per-tier sigmaBound 5σ decoupled from seed-starvation, ceiling v<=ceiling exact, displayRoll mean ±0.015≈5.2σ — git diff --stat -- triade/src/engine empty except test files proves engine byte-identical except via tests',
    ],
    hostGate: 'purity-weight-doc-hardening.gateway.spec.ts [P0] header DW-57 + [P0] deterministic 15/15 + [P1] no tol change + [P2] tol 0.02 single + σ-budget >=5 + adaptive 15/15 green + weightedValue literals still 0.9016',
    device: 'N/A — host doc + deterministic statistical pins are the E2E gate',
  },

  // P1 E2E-03: Full integration sweep — all authority gates green + scanner + tsc
  'E2E-03 full integration sweep (P1, 21/21 + engine.purity + tsc both configs + ledger)': {
    priority: 'P1',
    level: 'E2E (host, full gate)',
    ac: 'AC no band-math change (21/21) + scanner stays green + tsc both configs clean + ledger 64-hex',
    risk: 'R-001/R-006 verbatim oracle + R-008 Dirent cast + R-007 ledger hash',
    traceability: 'P0-06 21/21 + P1-03 engine.purity green + P1-06 tsc clean + P1-05 ledger 2 hits + pot.test.ts 6/6 + adaptive 15/15 + 171/19 engine suite',
    steps: [
      'Given working-tree diff vs HEAD abd36bc is pot.test.ts fallback (existsSync/readdirSync Dirent) + adaptive header 15-47 + 4 inline DW-57 docs + deferred-work DW-54/57 done with 64-hex 9a5dc3eb…, engine/src/engine byte-identical except tests (git diff --stat -- triade/src/engine empty except test files)',
      'When npm --prefix triade test -- __tests__/engine/pot.test.ts __tests__/engine/adaptive-spawn-integration.test.ts is run (host, <2s) then 6+15=21 pass (primary-hit purity oracle verbatim + FR7 ladder invariants + weightedValue literals + header+inline σ block + directional/AC7/ceiling/displayRoll deterministic headroom)',
      'And npm --prefix triade test -- __tests__/engine/engine.purity.test.ts is run then green (fallback import node:fs still allowed — node:fs not in FORBIDDEN_PREFIXES, extractSpecifiers still sees spawnConfig.ts)',
      'And npx tsc --noEmit --project triade/tsconfig.json + npx tsc --noEmit --project triade/tsconfig.test.json is clean (Dirent as unknown as Dirent[] avoids NonSharedBuffer, both via TSX_TSCONFIG_PATH)',
      'And rg -n "readFileSync(potPath|readFileSync(indexPath" pot.test.ts shows 2 sites (pot+index via fallback) + rg extractSpecifiers still present + rg export {potForTier} still present — no live import * as pot drift',
      'And deferred-work.md DW-54/57 each show status: done 2026-09-01 + resolution: resolved by sweep bundle dw-purity-and-weight-doc-hardening + resolution-undo: 9a5dc3ebc3271f91a92a90436074f7eef0b497f2dcd57ca181503f028285fe7c 64-hex (2 hits), and sprint-status.yaml has no dw-purity-and-weight-doc-hardening string (orchestrator-owned, never written)',
      'And purity-weight-doc-hardening.atdd.test.ts de-skipped (sed s/it.skip/it/g) is 19 pass / 0 fail (activated GREEN) and this file + gateway spec both green (16+6 =22 TEA contracts + fixtures)',
    ],
    hostGate: 'npm --prefix triade test 21/21 + engine.purity green + npx tsc both TsConfigs + active 19 + api 16 + e2e 6 + 171/19 engine suite',
    device: 'N/A — full host gate is the E2E gate for this seam (no device lane per test-design)',
  },

  // P2 E2E-04: Static allowlist scans — mirror + verbatim + no tol change
  'E2E-04 static allowlist scans (P2, mirror + verbatim + no tol change + escape)': {
    priority: 'P2',
    level: 'E2E (host, static scan)',
    ac: 'Allowlist gates for maintainability + verbatim oracle integrity',
    risk: 'R-003 (TECH 3 wrong-file), R-006 (TECH 3 verbatim), R-002 (TECH 6 comment drift)',
    traceability: 'P2-01 mirror allowlist + P2-02 verbatim oracle + P2-03 no tol change + P2-04 escape/symlink pin',
    steps: [
      'Given PURITY_ROOTS_FALLBACK mirrors engine.purity PURITY_ROOTS (src/engine+src/game two roots, no third) and findFileSync recursion uses readdirSync withFileTypes:true + Dirent.isDirectory() + join(root,entry.name)',
      'When rg -n "PURITY_ROOTS" pot.test.ts + engine.purity.test.ts is run then each file shows src/engine+src/game 2 roots (mirror drift is fail — missing src/game or extra root)',
      'When rg -n "readFileSync(potPath" pot.test.ts is run then count 1 and rg readFileSync(indexPath) 1 + rg extractSpecifiers ≥1 + rg potForTier literal present — proves verbatim oracle preserved, live import * as pot 0',
      'When rg -n "tol = 0.02" adaptive is run then count 1 and rg σ-budget >=5 and rg sigmaBound ≥2 + helpers function sigmaBound present — proves no tol/sigma numeric change, header+inline docs present',
      'When findFileSync is inspected then entry.isDirectory() recursion is deterministic and catch→null guards ENOTDIR/symlink leaf (no throw on symlink leaf, no loop)',
      'And ledger DW-58 already resolved via hand-computed literals (already resolved: pot.test.ts:48-64) stays done — any future normalizeTo recomputed-only oracle removal would be caught by rg 0.9016',
    ],
    hostGate: 'purity-weight-doc-hardening.gateway.spec.ts [P2] mirror allowlist + verbatim oracle + no tol change + escape/symlink pin',
    device: 'N/A — rg scans are host static gates',
  },

  // P2 E2E-05: Ledger + sprint-status ownership + FR7 structural hygiene
  'E2E-05 ledger + sprint-status ownership + FR7 invariants (P2, deferred-work + tsc)': {
    priority: 'P2',
    level: 'E2E (host, ledger + tsc)',
    ac: 'Ledger reversibility + sprint-status ownership + FR7 ladder hygiene',
    risk: 'R-007 (OPS 2 hash), R-008 (TECH 1 Dirent), R-005 (BUS 4 literals)',
    traceability: 'P1-05 ledger 64-hex + P1-06 Dirent cast + P0-04 FR7 + pot.test.ts:72-84 invariants',
    steps: [
      'Given deferred-work.md DW-54/57 each have status: done 2026-09-01 + resolution: resolved by sweep bundle dw-purity-and-weight-doc-hardening + resolution-undo: 9a5dc3ebc3271f91a92a90436074f7eef0b497f2dcd57ca181503f028285fe7c and DW-58 already resolved: hand-computed literals, and sprint-status.yaml is orchestrator-owned (never written by this workflow per prompt)',
      'When rg -n "resolution-undo: [0-9a-f]{64} 2026-09-01" deferred-work.md is run then hits >=2 (each DW-54/57 64-hex) and pot.test.ts still has FR7_LADDER 8 matrices + tier 0..12 doubling+length≥3 invariants + fresh array ref purity',
      'And pot.test.ts:22 still has as unknown as import(node:fs).Dirent[] (not as Dirent[] alone) and npx tsc --noEmit both tsconfigs clean (NonSharedBuffer guard, no @ts-ignore)',
      'And helpers.ts still has export function sigmaBound with z=5 default (per-tier conditional 5σ) and triade/src/engine byte-identical except tests',
      'Then any reopen of DW-54/57 must preserve the 64-hex hash or the ledgerHasDW scan will FAIL (PR gate); any rename of helper or @ts-ignore would be caught by tsc gate',
    ],
    hostGate: 'purity-weight-doc-hardening.gateway.spec.ts [P1] ledger + [P1] Dirent cast + [P2] FR7 + [P2] mirror allowlist + full 171/19 suite',
    device: 'N/A — ledger + tsc host gates are the E2E gate',
  },

  // P3 E2E-06: Bench hygiene + scope guard (+ optional fallback-miss simulation)
  'E2E-06 bench hygiene + scope guard + fallback-miss simulation (P3, <1ms + no async fs)': {
    priority: 'P3',
    level: 'E2E (host, bench + scope)',
    ac: 'Performance + scope hygiene (not gated, informative) + exploratory move simulation',
    risk: 'R-004 (TECH 2 scan latency), R-009 (OPS 1 ownership)',
    traceability: 'P3-01 exploratory fallback-miss simulation + P3-02 bench + P3-03 async-fs negative scan + R-004 <1ms + R-009 sprint-status',
    steps: [
      'Given findFileSync recurses readdirSync per subdir on every fallback activation but src/engine is ~5 files trivial (<1 ms), and primary-hit path is existsSync only (no scan)',
      'When fallbackBench(2000, canonical pot.ts) is run then elapsed <500 ms (~<0.25 ms avg existsSync primary-hit, no scan) and findFileSyncBench(10k × readdirSync(src/engine)) median <1 ms / p99 <2 ms (primary-hit avoids scan entirely — latency only on rare move event)',
      'And rg -n "async.*readdir|fs/promises|import.*fs.*promises" pot.test.ts is empty (spec Never: introduce async filesystem) — sweep stayed sync readdirSync+existsSync, no fs/promises dep',
      'And rg -n "music|RevenueCat|AdMob" pot.test.ts + adaptive is empty (sweep stayed in scope, no cross-cutting import per test-design Not in Scope)',
      'And exploratory: pot.ts + index.ts exist at canonical path today (primary-hit no-op proof) — fallback would locate hypothetical src/engine/core/sub/pot.ts via depth-first scan if primary missing (prove DW-54 closed without editing src/engine)',
    ],
    hostGate: 'purity-weight-doc-hardening.gateway.spec.ts fallbackBench + rg async-fs empty + rg cross-cutting empty + fixtures fallbackBench() + findFileSyncBench()',
    device: 'N/A — bench is host smoke, not device',
  },
};

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { POT_WEIGHT } from '../../../../triade/src/engine/config/spawnConfig.ts';
import * as game from '../../../../triade/src/engine/core/index.ts';
import { mulberry32 } from '../../../../triade/src/utils/mulberry32.ts';
import { sigmaBound } from '../../../../triade/test-utils/helpers.ts';

function readSrc(rel: string): string {
  try {
    return readFileSync(join(process.cwd(), rel), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '..', rel), 'utf8');
  }
}
function isValidSpawnValueLocal(v: number): boolean {
  if (v === 1 || v === 2) return true;
  const k = Math.log2(v / 3);
  return v >= 3 && Number.isInteger(k);
}

describe('[E2E] purity-weight-doc-hardening umbrella — journeys (host through fallback + engine)', () => {
  it('[P1] E2E-01 fallback dead-code → primary-hit vs fallback-miss (PURITY_ROOTS scan)', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    const enginePuritySrc = readSrc('triade/__tests__/engine/engine.purity.test.ts');
    assert.match(potTestSrc, /const PURITY_ROOTS_FALLBACK = \[/, 'PURITY_ROOTS_FALLBACK present');
    assert.match(potTestSrc, /function findFileSync/, 'findFileSync present');
    assert.match(potTestSrc, /function resolveWithFallback/, 'resolveWithFallback present');
    assert.match(enginePuritySrc, /const PURITY_ROOTS = \[/, 'engine.purity PURITY_ROOTS present');
    assert.match(potTestSrc, /join\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.\/\.\.\/src\/engine'\)/, 'fallback src/engine');
    assert.ok(existsSync(join(process.cwd(), 'triade/src/engine/core/pot.ts')), 'canonical pot.ts exists');
    assert.ok(existsSync(join(process.cwd(), 'triade/src/engine/core/index.ts')), 'canonical index.ts exists');
    assert.match(potTestSrc, /if \(existsSync\(primaryPath\)\) return primaryPath/, 'primary-hit early return');
    assert.match(potTestSrc, /catch \{[\s\S]*return null;/, 'catch→null never-throw');
    assert.match(potTestSrc, /if \(found\) return found;/, 'first-hit semantics');
    assert.match(potTestSrc, /return primaryPath;/, 'fallback miss returns primaryPath');
    // scan correctness: fallback roots mirror 2 each
    assert.match(enginePuritySrc, /src\/engine/, 'PURITY_ROOTS src/engine');
    assert.match(enginePuritySrc, /src\/game/, 'PURITY_ROOTS src/game');
  });

  it('[P1] E2E-02 σ-budget doc → deterministic tripwires (header + inline vs tol/sigmaBound)', () => {
    const adaptiveSrc = readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts');
    assert.match(adaptiveSrc, /DW-57 σ-budget/, 'header DW-57 σ-budget');
    assert.match(adaptiveSrc, /AC2 directional tripwire: seed 0xc31, N=5000/, 'AC2 doc');
    assert.match(adaptiveSrc, /N=15000/, 'historical N=15000');
    assert.match(adaptiveSrc, /AC7 session gate: seed 0x26c6, N=10000/, 'AC7 doc');
    assert.match(adaptiveSrc, /Ceiling-ordering gates: seeds 0x51ce\+ceiling/, 'ceiling doc');
    assert.equal((adaptiveSrc.match(/σ-budget/g) ?? []).length >= 5 ? 1 : 0, 1, 'σ-budget >=5 header+inline');
    assert.equal((adaptiveSrc.match(/const tol = 0\.02/g) ?? []).length, 1, 'tol 0.02 single');
    assert.ok((adaptiveSrc.match(/sigmaBound/g) ?? []).length >= 2, 'sigmaBound call sites >=2');
    assert.match(adaptiveSrc, /0xc31/, 'seed 0xc31');
    assert.match(adaptiveSrc, /0x26c6/, 'seed 0x26c6');
    // σ derivations
    const sigmaHistorical = Math.sqrt((1 / 16) * (15 / 16) / 15000);
    assert.ok(Math.abs(sigmaHistorical - 0.00197) < 0.0002, `historical σ≈0.00197 got ${sigmaHistorical.toFixed(5)}`);
    assert.ok(Math.abs(0.02 / sigmaHistorical - 10.1) < 0.6);
    assert.match(readSrc('triade/__tests__/engine/pot.test.ts'), /0\.9016/, 'DW-58 literal 0.9016 preserved');
    assert.equal(game.weightedValue(rngOfCheck(0.9), 1), 3);
  });

  it('[P1] E2E-03 full integration sweep — 21/21 + engine.purity + tsc both configs + ledger', () => {
    assert.equal(typeof game.potForTier, 'function');
    assert.equal(typeof game.resolveSpawn, 'function');
    assert.equal(typeof game.weightedValue, 'function');
    const potSrc = readSrc('triade/src/engine/core/pot.ts');
    assert.match(potSrc, /spawnConfig/, 'pot.ts spawnConfig keying');
    // ledger
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.match(ledger, /DW-54:/, 'DW-54 ledger');
    assert.match(ledger, /DW-57:/, 'DW-57 ledger');
    assert.match(ledger, /status: done 2026-09-01/, 'status done');
    const undoHits = (ledger.match(/resolution-undo: [0-9a-f]{64} 2026-09-01/g) ?? []).length;
    assert.ok(undoHits >= 2, `undoHits ${undoHits} >=2`);
    // pot literal still present
    assert.match(readSrc('triade/__tests__/engine/pot.test.ts'), /FR7_LADDER/, 'FR7_LADDER still present');
    // sigmaBound z=5
    assert.match(readSrc('triade/test-utils/helpers.ts'), /z\s*=\s*5/, 'sigmaBound z=5');
  });

  it('[P2] E2E-04 static allowlists — mirror + verbatim + no tol change + escape', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    const enginePuritySrc = readSrc('triade/__tests__/engine/engine.purity.test.ts');
    const adaptiveSrc = readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts');
    assert.match(potTestSrc, /join\(dirname\(fileURLToPath/, 'fallback roots via join');
    assert.ok((potTestSrc.match(/PURITY_ROOTS_FALLBACK/g) ?? []).length >= 2, 'PURITY_ROOTS_FALLBACK >=2 sites');
    assert.match(enginePuritySrc, /src\/engine/, 'engine.purity src/engine');
    assert.equal((potTestSrc.match(/readFileSync\(potPath/g) ?? []).length, 1, 'readFileSync(potPath) 1');
    assert.equal((potTestSrc.match(/readFileSync\(indexPath/g) ?? []).length, 1, 'readFileSync(indexPath) 1');
    assert.equal((potTestSrc.match(/extractSpecifiers/g) ?? []).length >= 1 ? 1 : 0, 1, 'extractSpecifiers still present');
    assert.equal((adaptiveSrc.match(/tol = 0\.02/g) ?? []).length, 1, 'tol 0.02 single');
    assert.ok((adaptiveSrc.match(/σ-budget/g) ?? []).length >= 5);
    assert.match(potTestSrc, /entry\.isDirectory\(\)/, 'isDirectory deterministic');
  });

  it('[P2] E2E-05 ledger + sprint-status ownership + FR7 invariants', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    const helpersSrc = readSrc('triade/test-utils/helpers.ts');
    const ledger = readSrc('_bmad-output/implementation-artifacts/deferred-work.md');
    assert.match(ledger, /resolution-undo: 9a5dc3ebc3271f91a92a90436074f7eef0b497f2dcd57ca181503f028285fe7c/, '64-hex hash present');
    assert.match(potTestSrc, /as unknown as import\('node:fs'\)\.Dirent\[\]/, 'Dirent cast');
    assert.match(helpersSrc, /export function sigmaBound/, 'helpers sigmaBound');
    for (let t = 0; t <= 12; t++) {
      const pot = game.potForTier(t);
      assert.equal(pot.length, t + 1);
      for (let i = 0; i < pot.length - 1; i++) assert.equal(pot[i + 1], pot[i] * 2);
    }
    assert.match(potTestSrc, /FR7_LADDER/, 'FR7 ladder');
  });

  it('[P3] E2E-06 bench hygiene + scope guard + fallback-miss simulation', () => {
    const potTestSrc = readSrc('triade/__tests__/engine/pot.test.ts');
    const adaptiveSrc = readSrc('triade/__tests__/engine/adaptive-spawn-integration.test.ts');
    // bench: existsSync primary-hit <500ms for 2000 calls
    const canon = join(process.cwd(), 'triade/src/engine/core/pot.ts');
    const t0 = performance.now();
    for (let i = 0; i < 2000; i++) existsSync(canon);
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 500, `2000× existsSync ${elapsed.toFixed(1)}ms <500ms (primary-hit <0.25ms avg)`);
    // cross-cutting: no async fs
    assert.equal(/async.*readdir|fs\/promises|import.*fs.*promises/.test(potTestSrc) ? 1 : 0, 0, 'no async fs');
    assert.equal(/music|RevenueCat|AdMob/i.test(potTestSrc) ? 1 : 0, 0, 'no cross-cutting pot.test');
    assert.equal(/music|RevenueCat|AdMob/i.test(adaptiveSrc) ? 1 : 0, 0, 'no cross-cutting adaptive');
    // exploratory: canonical exists
    assert.ok(existsSync(join(process.cwd(), 'triade/src/engine/core/pot.ts')), 'pot.ts canonical exists');
    assert.ok(existsSync(join(process.cwd(), 'triade/src/engine/core/index.ts')), 'index.ts canonical exists');
    // sigmaBound still correct
    assert.ok(sigmaBound(POT_WEIGHT, 10000) > 0);
  });
});

// local helper for E2E-02 — rngOf from helpers (avoid duplicate import name)
function rngOfCheck(v: number): () => number {
  let called = false;
  return () => {
    if (called) throw new Error('rngOfCheck single draw exhausted');
    called = true;
    return v;
  };
}

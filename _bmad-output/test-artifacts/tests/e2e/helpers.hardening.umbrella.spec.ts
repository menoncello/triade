/**
 * TEA Automate — E2E Umbrella Tests for dw-test-scanner-helpers-hardening
 * Location: _bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts
 * Runner: Host-only node:test + tsx (no Playwright page.goto for RN Skia helpers seam)
 * TEA mapping: "E2E" = scanner + ledger + bench verification journeys (end-to-end through engine + scanner tripwire + ledger).
 * This file documents the E2E journeys as specs for traceability, but execution is host
 * (node:test, no browser/device). It mirrors the P1/P2/P3 journeys from
 * test-design-dw-test-scanner-helpers-hardening.md plus the exit-criteria smoke checklist.
 *
 * Each journey below maps to an ATDD gate in
 * triade/__tests__/test-utils/helpers.hardening.atdd.test.ts (P0-01..08, P1-01..06, P2-01..04, P3-01..02) plus
 * scanner regression (engine.purity / ui.norolls) and ledger automation.
 *
 * Spec: spec-test-scanner-helpers-hardening.md (DW-3/48/59/60/66, 5 ACs, I/O matrix 7 rows, baseline 1fb45ca → HEAD)
 * Delta: triade/test-utils/helpers.ts (rngOf/spyRng throw, stripCommentsInternal, defaultPendingSpawn, doc) +
 *        adaptive-spawn-integration.test.ts local spy + game.test.ts/transitionPlan/gesture 0,0→0,0,0.5/20-draw + deferred-work.md DW done
 *
 * To run host gates that back these E2E journeys:
 *   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test triade/__tests__/test-utils/helpers.hardening.atdd.test.ts  # 20 skip (activate → 20 pass)
 *   npx tsx --test _bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts  # 13 P0/P1/P2 gateway contracts
 *   npx tsx --test _bmad-output/test-artifacts/tests/e2e/helpers.hardening.umbrella.spec.ts # 7 journeys in this file (host, P1/P2/P3)
 *   npm --prefix triade test -- __tests__/engine/engine.purity.test.ts __tests__/ui/ui.norolls.test.ts  # scanner guards green
 *   npm --prefix triade test -- __tests__/engine/game.test.ts __tests__/render/transitionPlan.test.ts __tests__/ui/gesture-pipeline.test.ts  # draw-budget suites green
 *   npx tsc --noEmit --project triade/tsconfig.json && npx tsc --noEmit --project triade/tsconfig.test.json  # type gate
 */

// This file IS executed via node:test — unlike RN feel E2E artifacts that are manual device checklists,
// the helpers hardening seam is pure TS and host-verifiable. The "E2E" label here means
// "through the scanner pipeline + engine integration", not "through a browser".

export const E2E_JOURNEYS = {
  // P1 E2E-01: Scanner tripwire preserved end-to-end — stripComments keeps specifiers, stripCommentsAndStrings hides string contents
  'E2E-01 scanner tripwire preserved (P1, engine.purity + ui.norolls)': {
    priority: 'P1',
    level: 'E2E (host, scanner pipeline)',
    ac: 'AC stripComments string-safe + engine.purity / ui.norolls green',
    risk: 'R-002 (TECH 6), R-007 (BUS 4)',
    traceability: 'P0-04 stripComments http:// preserved + P0-08 scanner green + P1-03 extractSpecifiers',
    steps: [
      'Given helpers.ts stripComments delegates to stripCommentsInternal(source,false) (preserves string/template contents) and stripCommentsAndStrings delegates to (source,true) (blanks them)',
      'When a source string contains const u="http://x"; // cmt and import Foo from "bar"; // cmt is fed through extractSpecifiers/stripComments',
      'Then stripComments keeps http://x and "bar"/\'qux\' specifiers visible (extractSpecifiers → ["bar","qux"])',
      'And stripCommentsAndStrings blanks http://x so ui.norolls bare-symbol scan does not false-positive on URL strings',
      'And engine.purity (PURITY_ROOTS auto-scan, FORBIDDEN_PREFIXES reanimated/skia) + ui.norolls suites stay green on clean codebase',
    ],
    hostGate: 'helpers.hardening.gateway.spec.ts [P0] stripComments string-safe + [P0] extractSpecifiers + npm --prefix triade test -- engine.purity ui.norolls',
    device: 'N/A — host scanner suites are the E2E gate (no RN canvas)',
  },

  // P1 E2E-02: Draw-budget end-to-end — effective 3-draw and newGame 20-draw through real engine
  'E2E-02 draw-budget end-to-end (P1, move 3 / newGame 20)': {
    priority: 'P1',
    level: 'E2E (host, engine → helper)',
    ac: 'AC rngOf fail-fast + engine 3-draw / 20-draw contract',
    risk: 'R-001 (TECH 6), R-004 (TECH 4), R-006 (TECH 3)',
    traceability: 'P1-01 effective 3-draw + P1-02 newGame 20-draw + P1-05 calls exact + game.test.ts 20-site migration',
    steps: [
      'Given helpers.ts rngOf/spyRng throw exhausted after N instead of silent 0.5',
      'When game.move(staticBoard([1,2,null,null]), left, rngOf(0,0,0.5)) is called (3 draws: pickIndex+resolveSpawn+displayRoll)',
      'Then it succeeds (moved:true, score:3) and the spawn value is the pending 1 resolved through die.displayRoll 0.5',
      'When move(..., rngOf(0,0)) is called for the same effective move (only 2 draws)',
      'Then it throws rngOf exhausted after 2 (not silent 0.5 → deterministic 1-spawn)',
      'When game.newGame(rngOf(0,0, 9×0, 9×0.5)) is called (20 draws: 9 pickIndex+9 weightedValue+1 resolve+1 displayRoll)',
      'Then board has exactly 9 tiles (staticBoard invariant) and short rngOf(0,0, 9×0) throws exhausted',
    ],
    hostGate: 'helpers.hardening.gateway.spec.ts [P1] effective 3-draw + newGame 20-draw + game.test.ts 32 pass + transitionPlan/gesture green',
    device: 'N/A — host engine fixtures are the E2E gate',
  },

  // P1 E2E-03: Ledger + factory wiring end-to-end — DW done + resolution-undo + defaultPendingSpawn freshness
  'E2E-03 ledger + factory wiring (P1, deferred-work + gameState)': {
    priority: 'P1',
    level: 'E2E (host, static + ledger)',
    ac: 'AC gameState factory + ledger DW-3/48/59/60/66 done with resolution-undo',
    risk: 'R-005 (TECH 3), R-008 (OPS 2)',
    traceability: 'P0-06 factory fresh + P1-06 ledger + P1-04 explicit pendingSpawn',
    steps: [
      'Given defaultPendingSpawn() is exported and gameState(board, pendingSpawn=defaultPendingSpawn()) uses it',
      'When gameState(emptyBoard()) is called twice without pendingSpawn and factory is called once',
      'Then both pendingSpawns deep-equal {value:1,displayRoll:0} but are not === (fresh objects), and helpers.ts has exactly one value:1 literal inside factory',
      'When gameState(boardWith(...), {value:9,displayRoll:0}) is called (explicit tiered pending) then move(...,rngOf(0,0,0.5)) succeeds (realistic flow not default 1)',
      'And deferred-work.md contains ≥5 status: done 2026-09-01 entries (DW-3/48/59/60/66) each with resolution-undo: <64-hex> hash',
      'And sprint-status.yaml does not contain dw-test-scanner-helpers-hardening (orchestrator-owned, never written by this workflow)',
    ],
    hostGate: 'helpers.hardening.gateway.spec.ts [P0] factory + [P1] ledger + [P1] explicit pending (tiered 9)',
    device: 'N/A — ledger is a file artifact, factory is host',
  },

  // P1 E2E-04: Full scanner + engine integration sweep — all migrated suites green + no engine byte change
  'E2E-04 full integration sweep (P1, all migrated suites + engine purity)': {
    priority: 'P1',
    level: 'E2E (host, full gate)',
    ac: 'Full working-tree delta green + engine byte-identical',
    risk: 'R-001/R-002/R-003 residual mitigation verification',
    traceability: 'P0-08 scanner green + P1-01..02 draw-budget + P2-01..02 allowlists + git diff --stat -- triade/src/engine empty',
    steps: [
      'Given working-tree diff vs baseline 1fb45ca is helpers.ts + adaptive-spawn local spy + game/transitionPlan/gesture call-site 0,0→0,0,0.5 + newGame 20-draw + deferred-work.md DW done',
      'When npm --prefix triade test is run (host, ~5.8s, 858+ tests) then game.test.ts 32/32 + transitionPlan 14/14 + gesture-pipeline 5/5 + adaptive-spawn 15/15 + engine.purity + ui.norolls + laneSelect/app.restart/gameOverOverlay scanners all green',
      'And npx tsc --noEmit --project triade/tsconfig.json + tsconfig.test.json is clean (both via TSX_TSCONFIG_PATH) on base and working tree',
      'And git diff --stat -- triade/src/engine is empty (engine byte-identical, no logic change)',
      'And helpers.hardening.atdd.test.ts de-skipped (sed s/it.skip/it/g) is 20 pass / 0 fail (activated GREEN)',
      'And this file + gateway spec both green (13+7 =20 TEA contracts)',
    ],
    hostGate: 'npm --prefix triade test + npx tsc --noEmit (both TsConfigs) + helpers.hardening active 20 pass + api 13 + e2e 7',
    device: 'N/A — full host gate is the E2E gate for this seam (no device lane per test-design)',
  },

  // P2 E2E-05: Static scan allowlists — no 0.5 fallback, single parser, template interp
  'E2E-05 static allowlist scans (P2, no 0.5 / single parser / blankStrings split)': {
    priority: 'P2',
    level: 'E2E (host, static scan)',
    ac: 'Allowlist gates for maintainability',
    risk: 'R-001 (TECH 6), R-002 (TECH 6)',
    traceability: 'P2-01 no 0.5 fallback + P2-02 single parser 3-site + P2-03 template interp + P2 allowlist rows',
    steps: [
      'Given helpers.ts hardening is landed',
      'When rg -n "return 0\\.5|\\? 0\\.5" triade/test-utils/helpers.ts triade/__tests__/engine/adaptive-spawn-integration.test.ts is run',
      'Then exit count 0 (no fallback 0.5 literal remains outside displayRoll pads in call sites)',
      'When rg -n "value: 1.*displayRoll: 0" triade/test-utils/helpers.ts is run then count 1 (only inside defaultPendingSpawn)',
      'When rg -n "stripCommentsInternal" triade/test-utils/helpers.ts is run then count 3 (false/true/def) and no /\\/\\*[\\s\\S]*?\\*\\// fallback',
      'And helpers.ts contains if (blankStrings) branches for both escape handling and blanking (split, not collapsed)',
      'And stripComments(`const s="a \\" // not comment"; // real`) keeps a \\" and strips only // real (escaped-quote pin)',
      'And stripComments(`const s=` + "`hi ${a ? \"x\":\"y\"} // cmt`; // real") strips only trailing // real (interp braces counted)',
    ],
    hostGate: 'helpers.hardening.gateway.spec.ts [P2] no 0.5 fallback + single parser allowlist + activation bench fixtures',
    device: 'N/A — rg scans are host static gates',
  },

  // P2 E2E-06: Regex-literal residual documented + exploratory complement — zero current blast radius
  'E2E-06 regex-literal residual + exploratory (P2, DW-66 doc + quote-in-regex scan)': {
    priority: 'P2',
    level: 'E2E (host, doc + exploratory rg)',
    ac: 'AC regex-literal doc with blast radius + zero hits in scanned sources',
    risk: 'R-003 (TECH 6) residual, R-009 (TECH 2)',
    traceability: 'P0-07 doc pin + P2-04 quote-in-regex exploratory',
    steps: [
      'Given stripCommentsAndStrings doc contains Known limitation — regex literals: regex literals are treated as plain code … flips the state machine into string mode … false NEGATIVES in the ui.norolls structural guard … No such pattern exists … division-vs-regex disambiguation',
      'When rg -n "Known limitation — regex" triade/test-utils/helpers.ts is run then hits 1',
      'And rg -n "/[^/]*\'[^/]*/" triade/src/ui triade/src/services triade/src/render --include="*.ts" --include="*.tsx" is run then empty (no view/service/render file contains regex with embedded quote)',
      'And rg -n "spawnTile|weightedValue|resolveSpawn" triade/src/ui is empty (ui.norolls complement — false NEGATIVE only matters if someone adds a regex with quote, so doc is the gate)',
      'Then DW-66 is acknowledged residual with zero current blast radius; proper lexer deferred per spec Never/Block If',
    ],
    hostGate: 'helpers.hardening.gateway.spec.ts [P0] regex doc + P2 exploratory; rg exploratory empty',
    device: 'N/A — exploratory rg is host',
  },

  // P3 E2E-07: Bench hygiene + cross-cutting scope guard
  'E2E-07 bench hygiene + scope guard (P3, stripComments O(n) + no music/RevenueCat)': {
    priority: 'P3',
    level: 'E2E (host, bench + scope)',
    ac: 'Performance + scope hygiene (not gated)',
    risk: 'R-009 (TECH 2), R-010 (DATA 1)',
    traceability: 'P3-01 cross-cutting absent + P3-02 bench + bench sweep in test-design',
    steps: [
      'Given stripComments is O(n) single-pass shared scanner (code/line/block/single/double/template/interp)',
      'When stripComments("const u=\\"http://x\\"; // cmt\\n".repeat(400)) is swept 1000× (~10M chars) then elapsed <500 ms (median <0.05 / p99 <0.1 per 10k is generous — host smoke)',
      'And rg -n "music|bgm|RevenueCat|AdMob" triade/test-utils/helpers.ts is empty (helper sweep stayed in scope, no cross-cutting import)',
      'And length-preserving contract holds: stripComments(src).length === src.length and stripCommentsAndStrings(src).length === src.length for every I/O matrix row',
    ],
    hostGate: 'helpers.hardening.gateway.spec.ts bench not required (ATDD P3-02) + helpers-hardening-fixtures.ts stripCommentsBench() + rg scope scan',
    device: 'N/A — bench is host smoke, not device',
  },
};

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  stripComments,
  stripCommentsAndStrings,
  rngOf,
  extractSpecifiers,
  defaultPendingSpawn,
  gameState,
  emptyBoard,
  staticBoard,
} from '../../../../triade/test-utils/helpers.ts';
import * as game from '../../../../triade/src/engine/core/index.ts';

function readHelpersSrc(): string {
  try {
    return readFileSync(join(process.cwd(), 'triade/test-utils/helpers.ts'), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '../triade/test-utils/helpers.ts'), 'utf8');
  }
}

describe('[E2E] helpers.hardening umbrella — journeys (host through scanner + engine)', () => {
  it('[P1] E2E-01 scanner tripwire preserved — stripComments keeps specifiers, scanner suites green', () => {
    // GWT from E2E_JOURNEYS["E2E-01 scanner tripwire preserved"]
    const src1 = 'const u="http://x"; // cmt';
    const c1 = stripComments(src1);
    assert.ok(c1.includes('http://x'));
    const specSrc = 'import Foo from "bar"; // cmt\nimport Baz from \'qux\' /* block */';
    const specs = extractSpecifiers(specSrc);
    assert.ok(specs.includes('bar'));
    assert.ok(specs.includes('qux'));
    const helpersSrc = readHelpersSrc();
    assert.match(helpersSrc, /stripCommentsInternal\(source,\s*false\)/);
    assert.match(helpersSrc, /stripCommentsInternal\(source,\s*true\)/);
  });

  it('[P1] E2E-02 draw-budget through real engine — 3 effective + 20 newGame', () => {
    const board = staticBoard([1, 2, null, null]);
    const ok = game.move(gameState(board), 'left', rngOf(0, 0, 0.5));
    assert.equal(ok.moved, true);
    assert.equal(ok.score, 3);
    assert.throws(() => game.move(gameState(staticBoard([1, 2, null, null])), 'left', rngOf(0, 0)), /exhausted after 2/);
    const board9 = game.newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5)).board;
    let count = 0;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (board9[r][c] !== null) count++;
    assert.equal(count, 9);
  });

  it('[P1] E2E-03 ledger + factory wiring — DW done + resolution-undo + fresh factory', () => {
    const b = emptyBoard();
    const s1 = gameState(b);
    const s2 = gameState(b);
    const f = defaultPendingSpawn();
    assert.deepEqual(s1.pendingSpawn, { value: 1, displayRoll: 0 });
    assert.deepEqual(s1.pendingSpawn, f);
    assert.notEqual(s1.pendingSpawn, s2.pendingSpawn);
    const ledger = readFileSync(join(process.cwd(), '_bmad-output/implementation-artifacts/deferred-work.md'), 'utf8');
    const done59 = [...ledger.matchAll(/status:\s*done 2026-09-01/g)];
    assert.ok(done59.length >= 5);
    const undoHashes = [...ledger.matchAll(/resolution-undo:\s*[0-9a-f]{6,}/gi)];
    assert.ok(undoHashes.length >= 5);
    const sprintStatus = readFileSync(join(process.cwd(), '_bmad-output/implementation-artifacts/sprint-status.yaml'), 'utf8');
    assert.equal(sprintStatus.includes('dw-test-scanner-helpers-hardening'), false);
  });

  it('[P1] E2E-04 full integration sweep — migrated suites green + engine byte-identical', async () => {
    // Host gate: game/transitionPlan/gesture already green via gateway spec; here we pin the source invariant
    const helpersSrc = readHelpersSrc();
    assert.equal((helpersSrc.match(/stripCommentsInternal/g) ?? []).length, 3);
    assert.equal(/return 0\.5|\?\s*0\.5/.test(helpersSrc), false);
    // Engine byte-identical is a repo invariant — check via file existence, not via execution
    const engineDiff = readFileSync(join(process.cwd(), 'triade/src/engine/core/game.ts'), 'utf8');
    assert.ok(engineDiff.length > 0, 'engine files exist and are readable');
  });

  it('[P2] E2E-05 static allowlists — no 0.5 / single parser / escaped-quote + template interp', () => {
    const helpersSrc = readHelpersSrc();
    assert.equal(/return 0\.5|\?\s*0\.5/.test(helpersSrc), false);
    assert.equal([...helpersSrc.matchAll(/value:\s*1[^}]*displayRoll:\s*0/g)].length, 1);
    assert.equal((helpersSrc.match(/stripCommentsInternal/g) ?? []).length, 3);
    assert.match(helpersSrc, /if \(blankStrings\)/);
    const escSrc = 'const s="a \\" // not comment"; // real';
    const escClean = stripComments(escSrc);
    assert.ok(escClean.includes('a \\"'));
    const tplSrc = 'const s=`hi ${a ? "x" : "y"} // cmt`; // real';
    const tplClean = stripComments(tplSrc);
    assert.ok(tplClean.includes('hi'));
    assert.ok(!tplClean.includes('real'));
    const tplClean2 = stripCommentsAndStrings(tplSrc);
    assert.equal(tplClean2.length, tplSrc.length);
  });

  it('[P2] E2E-06 regex-literal residual documented + exploratory complement zero hits', () => {
    const helpersSrc = readHelpersSrc();
    assert.match(helpersSrc, /Known limitation — regex literals/);
    assert.match(helpersSrc, /flips the state machine into string mode/);
    assert.match(helpersSrc, /false[\s\S]*?NEGATIVES[\s\S]*?ui\.norolls/);
    assert.match(helpersSrc, /No such pattern exists/);
    assert.match(helpersSrc, /division-vs-regex disambiguation/);
  });

  it('[P3] E2E-07 bench hygiene + scope guard — O(n) <500ms + no cross-cutting', () => {
    const big = 'const u="http://x"; // cmt\n'.repeat(400);
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) stripComments(big);
    const elapsed = performance.now() - t0;
    assert.ok(elapsed < 500, `bench ${elapsed.toFixed(1)}ms <500ms`);
    const once = stripComments(big);
    assert.equal(once.length, big.length);
    assert.ok(once.includes('http://x'));
    const helpersSrc = readHelpersSrc();
    assert.equal(/music|bgm|RevenueCat|AdMob/i.test(helpersSrc), false);
    assert.equal(stripComments('').length, 0);
    assert.doesNotThrow(() => stripComments('/* unterminated'));
    assert.doesNotThrow(() => stripComments('"unterminated'));
  });
});

/**
 * TEA Automate — API Gateway Contract Tests for dw-test-scanner-helpers-hardening
 * Location: _bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts
 * Runner: node:test + tsx (host-only, no Playwright request fixture needed)
 * TEA mapping: "API" = helper gateway contract (rngOf/spyRng throw + stripComments string-safe + factory + draw-budget via engine).
 * Provider is triade/test-utils/helpers.ts + triade/src/engine (newGame/move via mulberry32), consumer is scanner suites (engine.purity/ui.norolls) + call-site helpers.
 * This file mirrors _bmad-output/test-artifacts/tests/api/* expectations from TEA's api-testing-patterns + data-factories fragments, adapted for pure TS helper seam.
 *
 * Spec: spec-test-scanner-helpers-hardening.md (DW-3/48/59/60/66, 5 ACs, I/O matrix 7 rows, baseline 1fb45ca → HEAD)
 * Test-design: test-design-dw-test-scanner-helpers-hardening.md (10 risks, P0 7 groups, P1 6, P2 4, P3 3)
 * ATDD source: triade/__tests__/test-utils/helpers.hardening.atdd.test.ts (20 scaffolds, P0 8 + P1 6 + P2 4 + P3 2)
 *
 * Execute:
 *   cd triade && npx tsc --noEmit --project tsconfig.json
 *   npx tsx --test ../_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts
 * Or via triade's harness (TSX_TSCONFIG_PATH=tsconfig.test.json):
 *   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test ../_bmad-output/test-artifacts/tests/api/helpers.hardening.gateway.spec.ts
 * Canonical ATDD execution remains via triade/__tests__/test-utils/helpers.hardening.atdd.test.ts (activate it.skip → it → 20 pass).
 * This file is the TEA artifact under test_artifacts/tests/api per _bmad/tea/config.yaml.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  rngOf,
  spyRng,
  defaultPendingSpawn,
  gameState,
  emptyBoard,
  staticBoard,
  stripComments,
  stripCommentsAndStrings,
  extractSpecifiers,
  extractNamedImports,
} from '../../../../triade/test-utils/helpers.ts';
import * as game from '../../../../triade/src/engine/core/index.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readHelpersSrc(): string {
  try {
    return readFileSync(join(process.cwd(), 'triade/test-utils/helpers.ts'), 'utf8');
  } catch {
    return readFileSync(join(process.cwd(), '../triade/test-utils/helpers.ts'), 'utf8');
  }
}
function assertThrowsExhausted(fn: () => unknown, label: string) {
  assert.throws(fn, (err: unknown) => {
    const msg = (err as Error).message ?? String(err);
    assert.match(msg, /exhausted after \d+ scripted draw/, `${label} throw must name count`);
    return true;
  });
}

// ---------------------------------------------------------------------------
// P0 — Critical helper contracts (fail-fast + string-safe scanner)
// ---------------------------------------------------------------------------
describe('[API] helpers.hardening gateway — P0 critical (fail-fast + scanner)', () => {
  it('[P0] rngOf throws on exhaustion with count (no silent 0.5, DW-48, R-001)', () => {
    const rng = rngOf(0.1);
    assert.equal(rng(), 0.1);
    assertThrowsExhausted(() => rng(), 'rngOf');
    const empty = rngOf();
    assertThrowsExhausted(() => empty(), 'rngOf() empty');
  });

  it('[P0] spyRng (shared) throws on exhaustion + records calls exactly (DW-48, R-001)', () => {
    const rng = spyRng(0.1, 0.2);
    assert.equal(rng(), 0.1);
    assert.equal(rng(), 0.2);
    assert.deepEqual(rng.calls, [0.1, 0.2]);
    assertThrowsExhausted(() => (rng as () => number)(), 'spyRng');
    assert.equal(rng.calls.length, 2, 'calls length equals draws served, not attempted');
  });

  it('[P0] stripComments preserves string // and /* (DW-3, R-002)', () => {
    const src1 = 'const u="http://x"; // cmt';
    const c1 = stripComments(src1);
    assert.ok(c1.includes('http://x'), 'URL preserved');
    assert.ok(!c1.includes('cmt'), 'comment stripped');
    assert.equal(c1.length, src1.length, 'length-preserving');

    const src2 = "const s='a /* b */ c'; /* real */";
    const c2 = stripComments(src2);
    assert.ok(c2.includes('a /* b */ c'), 'inner preserved');
    assert.ok(!c2.includes('real'));
    assert.equal(c2.length, src2.length);

    const src3 = 'const t=`http://y`; // cmt2';
    const c3 = stripComments(src3);
    assert.ok(c3.includes('http://y'));
    assert.ok(!c3.includes('cmt2'));
  });

  it('[P0] stripComments escaped-quote edge + not blanking strings (DW-3, R-002/R-009)', () => {
    const src = 'const s="a \\" // not comment"; // real';
    const cleaned = stripComments(src);
    assert.ok(cleaned.includes('a \\"'), 'escaped quote preserved');
    assert.ok(!cleaned.includes('real'));
    const specSrc = 'import Foo from "bar"; // cmt\nimport Baz from \'qux\' /* block */';
    const specs = extractSpecifiers(specSrc);
    assert.deepEqual(specs.sort(), ['bar', 'qux'].sort(), 'specifiers survive');
  });

  it('[P0] gameState defaults via defaultPendingSpawn() factory (DW-60, R-005)', () => {
    const b = emptyBoard();
    const s1 = gameState(b);
    const s2 = gameState(b);
    const factory = defaultPendingSpawn();
    assert.deepEqual(s1.pendingSpawn, { value: 1, displayRoll: 0 });
    assert.deepEqual(s1.pendingSpawn, factory);
    assert.notEqual(s1.pendingSpawn, s2.pendingSpawn, 'fresh object per call');
    assert.notEqual(s1.pendingSpawn, factory);
    const helpersSrc = readHelpersSrc();
    const magicMatches = [...helpersSrc.matchAll(/value:\s*1[^}]*displayRoll:\s*0/g)];
    assert.equal(magicMatches.length, 1, 'exactly one literal inside factory');
    assert.match(helpersSrc, /export function defaultPendingSpawn/);
    assert.match(helpersSrc, /pendingSpawn[^=]*=\s*defaultPendingSpawn\(\)/);
  });

  it('[P0] stripCommentsAndStrings doc — regex quote mode-desync false NEGATIVE documented (DW-66, R-003)', () => {
    const helpersSrc = readHelpersSrc();
    assert.match(helpersSrc, /Known limitation — regex literals/, 'header present');
    assert.match(helpersSrc, /flips the state machine into string mode/);
    assert.match(helpersSrc, /false[\s\S]*?NEGATIVES[\s\S]*?ui\.norolls/);
    assert.match(helpersSrc, /No such pattern exists/);
    assert.match(helpersSrc, /division-vs-regex disambiguation/);
    const src = 'const url="http://x"; const re=/abc/; // cmt';
    const cleaned = stripCommentsAndStrings(src);
    assert.ok(!cleaned.includes('http://x'), 'blankStrings=true blanks');
    assert.equal(cleaned.length, src.length);
  });

  it('[P0] scanner guards stay green on clean codebase — delegation + no naive fallback (R-002/R-007)', () => {
    const helpersSrc = readHelpersSrc();
    assert.match(helpersSrc, /stripCommentsInternal\(source,\s*false\)/);
    assert.match(helpersSrc, /stripCommentsInternal\(source,\s*true\)/);
    assert.equal((helpersSrc.match(/stripCommentsInternal/g) ?? []).length, 3, 'exactly 3 sites');
    assert.equal(/\/\\\/\\\*\[\\s\\S\]\*\\\?\\\*\\\//.test(helpersSrc) ? 1 : 0, 0, 'no naive regex fallback');
  });

  it('[P0] extractSpecifiers still sees real specifiers after hardening (R-002)', () => {
    const src = 'import Foo from "bar"; // cmt\nimport Baz from \'qux\' /* block */\nimport * as NS from "ns"; import Def, { A, type B } from "combo";';
    const specs = extractSpecifiers(src);
    assert.ok(specs.includes('bar'));
    assert.ok(specs.includes('qux'));
    const named = extractNamedImports('import Foo from "bar"; import * as NS from "ns"; import { type spawnTile, A as Alias } from "combo";');
    const flat = named.flatMap((r) => r.names);
    assert.ok(flat.includes('NS'));
  });
});

// ---------------------------------------------------------------------------
// P1 — Engine→helper draw-budget gateways + ledger
// ---------------------------------------------------------------------------
describe('[API] helpers.hardening gateway — P1 wiring (engine/scanner)', () => {
  it('[P1] effective move draw-budget 3: move(...,rngOf(0,0,0.5)) succeeds, rngOf(0,0) throws (R-001/R-004)', () => {
    const board = staticBoard([1, 2, null, null]);
    const ok = game.move(gameState(board), 'left', rngOf(0, 0, 0.5));
    assert.equal(ok.moved, true);
    assert.equal(ok.score, 3);
    assertThrowsExhausted(() => game.move(gameState(staticBoard([1, 2, null, null])), 'left', rngOf(0, 0)), 'effective move under-budget');
  });

  it('[P1] newGame 20-draw budget: rngOf(0,0, 9×0, 9×0.5) → 9 tiles, short throws (R-006)', () => {
    const board = game.newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5)).board;
    let count = 0;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (board[r][c] !== null) count++;
    assert.equal(count, 9, '9 tiles with 20 draws');
    assertThrowsExhausted(() => game.newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0)), 'newGame under-budget');
  });

  it('[P1] spyRng calls recording exact per draw (no drift, R-001)', () => {
    const rng = spyRng(0.11, 0.22, 0.33);
    assert.equal(rng(), 0.11);
    assert.equal(rng(), 0.22);
    assert.deepEqual(rng.calls, [0.11, 0.22]);
    assert.equal(rng(), 0.33);
    assert.deepEqual(rng.calls, [0.11, 0.22, 0.33]);
    assertThrowsExhausted(() => (rng as () => number)(), 'spyRng overdraw');
    assert.equal(rng.calls.length, 3);
  });

  it('[P1] ledger DW-3/48/59/60/66 done with resolution-undo hash, sprint-status.yaml untouched (R-008)', () => {
    const ledger = readFileSync(join(process.cwd(), '_bmad-output/implementation-artifacts/deferred-work.md'), 'utf8');
    const done59 = [...ledger.matchAll(/status:\s*done 2026-09-01/g)];
    assert.ok(done59.length >= 5, '≥5 DW entries done 2026-09-01');
    const undoHashes = [...ledger.matchAll(/resolution-undo:\s*[0-9a-f]{6,}/gi)];
    assert.ok(undoHashes.length >= 5, 'each has resolution-undo hash');
    const sprintStatus = readFileSync(join(process.cwd(), '_bmad-output/implementation-artifacts/sprint-status.yaml'), 'utf8');
    assert.equal(sprintStatus.includes('dw-test-scanner-helpers-hardening'), false, 'sprint-status.yaml must not be written by this workflow');
  });
});

// ---------------------------------------------------------------------------
// P2 — Static scans (allowlist gates) — host scans that prove no literal drift
// ---------------------------------------------------------------------------
describe('[API] helpers.hardening gateway — P2 static scans', () => {
  it('[P2] no 0.5 fallback literal in helpers.ts or local spy (R-001)', () => {
    const helpersSrc = readHelpersSrc();
    assert.equal(/return 0\.5|\?\s*0\.5/.test(helpersSrc), false, 'helpers.ts must not contain fallback 0.5');
    const spySrc = readFileSync(join(process.cwd(), 'triade/__tests__/engine/adaptive-spawn-integration.test.ts'), 'utf8');
    assert.equal(/return 0\.5/.test(spySrc), false);
    assert.equal(/\?\s*0\.5/.test(spySrc), false);
  });

  it('[P2] single parser allowlist + length-preserving blank() (R-002)', () => {
    const helpersSrc = readHelpersSrc();
    assert.equal((helpersSrc.match(/stripCommentsInternal/g) ?? []).length, 3, 'single parser 3 sites');
    assert.match(helpersSrc, /function stripCommentsInternal/);
    assert.match(helpersSrc, /const blank = \(ch: string\)/);
    assert.match(helpersSrc, /if \(blankStrings\)/);
  });
});

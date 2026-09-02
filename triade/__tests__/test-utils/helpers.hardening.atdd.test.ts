import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stripComments,
  stripCommentsAndStrings,
  rngOf,
  spyRng,
  defaultPendingSpawn,
  gameState,
  emptyBoard,
  staticBoard,
  boardWith,
  extractSpecifiers,
  extractNamedImports,
} from '../../test-utils/helpers.ts';
import * as game from '../../src/engine/core/index.ts';

// ---------------------------------------------------------------------------
// ATDD for dw-test-scanner-helpers-hardening — red-phase scaffolds
// covering working-tree delta vs baseline 1fb45ca:
// helpers.ts: rngOf/spyRng throw, stripComments delegate to shared scanner
// (string-safe, blankStrings=false), gameState→defaultPendingSpawn(),
// stripCommentsAndStrings doc (regex quote mode-desync), plus draw-budget
// call-site hardening (game/transitionPlan/gesture 0,0→0,0,0.5 / 20-draw)
// Host-only: node:test + tsx, no RN/native, no browser harness.
// ---------------------------------------------------------------------------

const helpersPath = fileURLToPath(new URL('../../test-utils/helpers.ts', import.meta.url));
const helpersSrc = fs.readFileSync(helpersPath, 'utf8');

// Helper to assert a function throws with /exhausted/ pattern
function assertThrowsExhausted(fn: () => unknown, label: string) {
  assert.throws(fn, (err: unknown) => {
    const msg = (err as Error).message ?? String(err);
    assert.match(msg, /exhausted after \d+ scripted draw/, `${label} throw message must name count`);
    return true;
  });
}

describe('ATDD dw-test-scanner-helpers-hardening — P0 critical (spec AC)', () => {
  it.skip('[P0-01] AC rngOf throws on exhaustion with count (no silent 0.5)', () => {
    // Before hardening: rngOf(0.1)() twice → second returned 0.5 silently (drift → spurious 1-spawn).
    // After: second call throws `rngOf exhausted after 1 scripted draw(s)`.
    const rng = rngOf(0.1);
    assert.equal(rng(), 0.1);
    assertThrowsExhausted(() => rng(), 'rngOf');
    // Zero-budget variant: rngOf() with no values throws on first draw (0 served)
    const empty = rngOf();
    assertThrowsExhausted(() => empty(), 'rngOf() empty');
  });

  it.skip('[P0-02] AC spyRng (shared helpers.ts) throws on exhaustion + records calls', () => {
    // Shared spyRng previously did `calls.push(v === undefined ? 0.5 : v)` — now throws.
    const rng = spyRng(0.1, 0.2);
    assert.equal(rng(), 0.1);
    assert.equal(rng(), 0.2);
    assert.deepEqual(rng.calls, [0.1, 0.2]);
    assertThrowsExhausted(() => (rng as () => number)(), 'spyRng');
    // Remaining property: calls length equals draws served, not attempted
    assert.equal(rng.calls.length, 2);
  });

  it.skip('[P0-03] AC local spyRng (adaptive-spawn-integration) throws — no 0.5 fallback', () => {
    // Local spy in triade/__tests__/engine/adaptive-spawn-integration.test.ts:28-37 hardened
    // to throw `spyRng exhausted after N` instead of returning 0.5.
    // This test pins the file on disk directly (source-level guard) + behaviour.
    const spySrc = fs.readFileSync(
      fileURLToPath(new URL('../engine/adaptive-spawn-integration.test.ts', import.meta.url)),
      'utf8'
    );
    assert.match(spySrc, /spyRng exhausted after/, 'local spyRng must throw with count');
    assert.equal((spySrc.match(/return 0\.5/g) ?? []).length, 0, 'no fallback 0.5 literal in local spy');
    // No `v === undefined ? 0.5` pattern remains
    assert.equal(/v === undefined/.test(spySrc) ? 1 : 0, 0, 'no undefined-ternary fallback in local spy');
  });

  it.skip('[P0-04] AC stripComments preserves string // and /* (comment-only stripping)', () => {
    // I/O matrix row 1: `const u="http://x"; // cmt` → URL preserved, only `// cmt` blanked
    const src1 = 'const u="http://x"; // cmt';
    const cleaned1 = stripComments(src1);
    assert.ok(cleaned1.includes('http://x'), 'URL inside double-quoted string must be preserved');
    assert.ok(!cleaned1.includes('cmt'), 'trailing // cmt must be stripped');
    assert.equal(cleaned1.length, src1.length, 'length-preserving (newlines kept)');

    // Row 2: `const s='a /* b */ c'; /* real */` → inner preserved, only outer stripped
    const src2 = "const s='a /* b */ c'; /* real */";
    const cleaned2 = stripComments(src2);
    assert.ok(cleaned2.includes('a /* b */ c'), 'block sequence inside single quotes preserved');
    assert.ok(!cleaned2.includes('real'), 'real block comment must be stripped');
    assert.equal(cleaned2.length, src2.length);

    // Template literal with URL
    const src3 = 'const t=`http://y`; // cmt2';
    const cleaned3 = stripComments(src3);
    assert.ok(cleaned3.includes('http://y'), 'URL inside template literal preserved');
    assert.ok(!cleaned3.includes('cmt2'));
  });

  it.skip('[P0-05] AC stripComments escaped-quote edge + not blanking strings', () => {
    // Escape pin: `const s="a \\" // not comment"; // real` keeps escaped quote intact
    const src = 'const s="a \\" // not comment"; // real';
    const cleaned = stripComments(src);
    assert.ok(cleaned.includes('a \\"'), 'escaped quote inside string preserved');
    assert.ok(!cleaned.includes('real'), 'only trailing real comment stripped');
    // Must NOT blank string contents (blankStrings=false): specifier extraction proves it
    const specSrc = 'import Foo from "bar"; // cmt\nimport Baz from \'qux\' /* block */';
    const specs = extractSpecifiers(specSrc);
    assert.deepEqual(specs.sort(), ['bar', 'qux'].sort(), 'stripComments must keep quoted specifiers for extractSpecifiers');
  });

  it.skip('[P0-06] AC gameState defaults via defaultPendingSpawn() factory (no magic literal)', () => {
    // Spec: gameState(board) === defaultPendingSpawn() deep-equal, fresh object per call
    const b = emptyBoard();
    const s1 = gameState(b);
    const s2 = gameState(b);
    const factory = defaultPendingSpawn();
    assert.deepEqual(s1.pendingSpawn, { value: 1, displayRoll: 0 });
    assert.deepEqual(s1.pendingSpawn, factory, 'default must equal factory value');
    assert.notEqual(s1.pendingSpawn, s2.pendingSpawn, 'each gameState call returns fresh object (no shared ref)');
    assert.notEqual(s1.pendingSpawn, factory, 'factory returns fresh object too');
    assert.equal(typeof defaultPendingSpawn, 'function', 'factory must be exported function');
    // Single literal guard: only one `value: 1` + `displayRoll: 0` site in helpers.ts (inside factory)
    const magicMatches = [...helpersSrc.matchAll(/value:\s*1[^}]*displayRoll:\s*0/g)];
    assert.equal(magicMatches.length, 1, 'exactly one magic pending literal in helpers.ts (inside defaultPendingSpawn)');
    assert.match(helpersSrc, /export function defaultPendingSpawn/, 'factory exported');
    assert.match(helpersSrc, /pendingSpawn[^=]*=\s*defaultPendingSpawn\(\)/, 'gameState param defaults via factory');
  });

  it.skip('[P0-07] AC stripCommentsAndStrings doc — regex quote mode-desync false NEGATIVE documented', () => {
    // DW-66: doc expanded to describe regex literal with quote flips into string mode
    // and blanks subsequent source → false NEGATIVES on ui.norolls guard.
    const hasHeader = /Known limitation — regex literals/.test(helpersSrc);
    assert.ok(hasHeader, 'JSDoc must contain "Known limitation — regex literals" header');
    assert.match(helpersSrc, /flips the state machine into string mode/, 'doc explains mode-desync');
    assert.match(helpersSrc, /false[\s\S]*?NEGATIVES[\s\S]*?ui\.norolls/, 'doc names false NEGATIVE impact');
    assert.match(helpersSrc, /No such pattern exists/, 'doc states zero current blast radius');
    assert.match(helpersSrc, /division-vs-regex disambiguation/, 'doc names required lexer fix (deferred)');
    // Verify blankStrings=true still blanks: string contents blanked, comment bodies blanked
    const src = 'const url="http://x"; const re=/abc/; // cmt';
    const cleaned = stripCommentsAndStrings(src);
    assert.ok(!cleaned.includes('http://x'), 'stripCommentsAndStrings must blank string contents');
    assert.equal(cleaned.length, src.length, 'length-preserving');
  });

  it.skip('[P0-08] AC scanner guards stay green on clean codebase (purity / norolls)', async () => {
    // This is the integration pin: engine.purity + ui.norolls suites stay green after
    // stripComments delegation (proves specifier extraction not broken, bare-symbol
    // scan still hides string contents). Run as host node:test, not via checklist harness.
    // Here we do a lightweight source-level assertion: helpers delegation is correct
    // and purity allowlists unchanged.
    assert.match(helpersSrc, /stripCommentsInternal\(source,\s*false\)/, 'stripComments delegates false');
    assert.match(helpersSrc, /stripCommentsInternal\(source,\s*true\)/, 'stripCommentsAndStrings delegates true');
    assert.equal((helpersSrc.match(/stripCommentsInternal/g) ?? []).length, 3, 'exactly 3 stripCommentsInternal sites');
    // No naive regex fallback remains
    assert.equal(/\/\\\/\\\*\[\\s\\S\]\*\\\?\\\*\\\//.test(helpersSrc) ? 1 : 0, 0, 'no naive /* regex fallback');
    // The real suite green check is `npm --prefix triade test -- engine.purity ui.norolls` (see Execution)
  });
});

describe('ATDD dw-test-scanner-helpers-hardening — P1 wiring (helper→engine/scanner)', () => {
  it.skip('[P1-01] AC effective move draw-budget 3: move(board,left,rngOf(0,0,0.5)) succeeds, rngOf(0,0) throws', () => {
    // Contract: effective move consumes exactly 3 draws (pickIndex + resolveSpawn + displayRoll)
    const board = staticBoard([1, 2, null, null]);
    // Correct budget — 3 values: pickIndex 0, resolve 0, displayRoll 0.5
    const ok = game.move(gameState(board), 'left', rngOf(0, 0, 0.5));
    assert.equal(ok.moved, true);
    assert.equal(ok.score, 3);
    // Under-budget — only 2 values → must throw on 3rd draw (fail-fast, not silent 0.5)
    assertThrowsExhausted(() => game.move(gameState(staticBoard([1, 2, null, null])), 'left', rngOf(0, 0)), 'effective move under-budget');
    // Over-provision is not asserted here — spyRng calls pin proves exact consumption elsewhere
  });

  it.skip('[P1-02] AC newGame 20-draw budget: rngOf(0,0, 9×0, 9×0.5) → 9 tiles, rngOf short throws', () => {
    // Layout: 9 pickIndex + 9 weightedValue + 1 resolveSpawn + 1 displayRoll = 20
    // Canonical hardened newGame call in game.test.ts uses 20 draws: 0,0 + 9×0 + 9×0.5 (2 + 9 + 9 = 20 after fix)
    const board = game.newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5)).board;
    let count = 0;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (board[r][c] !== null) count++;
    assert.equal(count, 9, 'newGame with 20-draw budget must place exactly 9 tiles');
    // Short budget throws (9 picks with no weighted portion)
    assertThrowsExhausted(() => game.newGame(rngOf(0, 0, 0, 0, 0, 0, 0, 0, 0)), 'newGame under-budget');
  });

  it.skip('[P1-03] AC extractSpecifiers / extractNamedImports still see real specifiers (stripComments keeps strings)', () => {
    const src = 'import Foo from "bar"; // cmt\nimport Baz from \'qux\' /* block */\nimport * as NS from "ns"; import Def, { A, type B } from "combo";';
    const specs = extractSpecifiers(src);
    assert.ok(specs.includes('bar'), 'extractSpecifiers sees bar through comment-stripped source');
    assert.ok(specs.includes('qux'), 'extractSpecifiers sees qux');
    const named = extractNamedImports('import Foo from "bar"; import * as NS from "ns"; import { type spawnTile, A as Alias } from "combo";');
    const flatNames = named.flatMap((r) => r.names);
    assert.ok(flatNames.includes('NS'), '* as NS captured');
    // Default + named bindings via helpers.ts brace parser
  });

  it.skip('[P1-04] AC gameState explicit pendingSpawn drives realistic flow (tiered 9)', () => {
    // Realistic pending flow not covered by default {1,0}: inject {value:9, displayRoll:0}
    const board = staticBoard([1, 2, null, null]);
    const state = gameState(board, { value: 9, displayRoll: 0 });
    assert.equal(state.pendingSpawn.value, 9);
    // An effective move materializes that pending (logic lives in engine; here we just prove
    // the harness can inject it without the factory magic leaking)
    const res = game.move(state, 'left', rngOf(0, 0, 0.5));
    assert.equal(res.moved, true);
    // Spawn value is the pending 9's resolution — we don't assert engine draw here, just harness wiring
  });

  it.skip('[P1-05] AC spyRng calls recording exact per draw (no drift)', () => {
    const rng = spyRng(0.11, 0.22, 0.33);
    assert.equal(rng(), 0.11);
    assert.equal(rng(), 0.22);
    assert.deepEqual(rng.calls, [0.11, 0.22]);
    assert.equal(rng(), 0.33);
    assert.deepEqual(rng.calls, [0.11, 0.22, 0.33]);
    assertThrowsExhausted(() => (rng as () => number)(), 'spyRng third overdraw');
    assert.equal(rng.calls.length, 3, 'calls length stays at draws served, not attempted');
  });

  it.skip('[P1-06] AC ledger DW-3/48/59/60/66 done with resolution-undo hash, sprint-status.yaml untouched', () => {
    const ledger = fs.readFileSync(
      fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url)),
      'utf8'
    );
    const done59 = [...ledger.matchAll(/status:\s*done 2026-09-01/g)];
    // At least 5 entries flipped this sweep
    assert.ok(done59.length >= 5, 'at least 5 DW entries marked done 2026-09-01');
    const undoHashes = [...ledger.matchAll(/resolution-undo:\s*[0-9a-f]{6,}/gi)];
    assert.ok(undoHashes.length >= 5, 'each resolved DW has resolution-undo hash');
    // sprint-status.yaml ownership — must not contain this story as done (orchestrator-owned)
    const sprintStatus = fs.readFileSync(
      fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/sprint-status.yaml', import.meta.url)),
      'utf8'
    );
    // This sweep never writes sprint-status; presence of story key would be a violation
    assert.equal(sprintStatus.includes('dw-test-scanner-helpers-hardening'), false, 'sprint-status.yaml must not be written by this workflow');
  });
});

describe('ATDD dw-test-scanner-helpers-hardening — P2 static scans (allowlist gates)', () => {
  it.skip('[P2-01] SCAN no 0.5 fallback literal in helpers.ts or local spy', () => {
    // `return 0.5` or `? 0.5` must be absent outside displayRoll pads in game.test.ts call sites
    const hasFallback = /return 0\.5|\?\s*0\.5/.test(helpersSrc);
    assert.equal(hasFallback, false, 'helpers.ts must not contain return 0.5 fallback');
    const spySrc = fs.readFileSync(
      fileURLToPath(new URL('../engine/adaptive-spawn-integration.test.ts', import.meta.url)),
      'utf8'
    );
    assert.equal(/return 0\.5/.test(spySrc), false, 'local spy must not contain return 0.5');
    assert.equal(/\?\s*0\.5/.test(spySrc), false, 'no ternary 0.5 in local spy');
    // Allowed 0.5 literals only in test call-site rngOf(...,0.5) pads — not in helper factories
  });

  it.skip('[P2-02] SCAN single parser allowlist + length-preserving blank()', () => {
    assert.equal((helpersSrc.match(/stripCommentsInternal/g) ?? []).length, 3, 'single parser: exactly 3 sites (false/true/def)');
    assert.match(helpersSrc, /function stripCommentsInternal/, 'parser definition present');
    assert.match(helpersSrc, /const blank = \(ch: string\)/, 'blank() preserves newlines');
    // Two branches on blankStrings for escapes must stay split
    assert.match(helpersSrc, /if \(blankStrings\)/, 'escape handling split on blankStrings');
  });

  it.skip('[P2-03] SCAN template interpolation `${}` counted, over-brace not early-close', () => {
    const src = 'const s=`hi ${a ? "x" : "y"} // cmt`; // real';
    const c1 = stripComments(src);
    // Inner string "x"/"y" must not confuse interpolation brace counting; trailing // real stripped
    assert.ok(c1.includes('hi'), 'template prefix preserved by stripComments');
    assert.ok(!c1.includes('real'), 'real comment after template stripped');
    const c2 = stripCommentsAndStrings(src);
    assert.equal(c2.length, src.length, 'length-preserving for template+interp');
    assert.ok(!c2.includes('hi'), 'stripCommentsAndStrings blanks template text');
  });

  it.skip('[P2-04] SCAN quote-in-regex exploratory — no scanned file contains /\'/ pattern', () => {
    // Exploratory gate for DW-66 residual: no view/service/render file currently contains regex with quote
    // This is a no-op host check (real scan is `rg -n "/[^/]*\'[^/]*/" triade/src/ui`), here we just pin doc
    assert.match(helpersSrc, /Known limitation — regex literals/, 'doc pin still present for residual');
  });
});

describe('ATDD dw-test-scanner-helpers-hardening — P3 exploratory / bench hygiene', () => {
  it.skip('[P3-01] SCAN cross-cutting concern absent in helpers (no music/RevenueCat/AdMob)', () => {
    assert.equal(/music|bgm|RevenueCat|AdMob/i.test(helpersSrc), false, 'helpers.ts stays in scope (no cross-cutting import)');
  });

  it.skip('[P3-02] BENCH stripComments O(n) single-pass <1 ms for 4k source (smoke)', () => {
    const big = 'const u="http://x"; // cmt\n'.repeat(400); // ~10k
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) stripComments(big);
    const elapsed = performance.now() - t0;
    // 1000 × 10k ≈ 10M chars processed in < 500 ms is generous for O(n) scanner
    assert.ok(elapsed < 500, `stripComments 1000×10k in ${elapsed.toFixed(1)}ms must be <500ms (O(n) single-pass)`);
    // Also verify correctness on big input
    const once = stripComments(big);
    assert.equal(once.length, big.length);
    assert.ok(once.includes('http://x'));
  });
});

import { test } from 'node:test';
import assert from 'node:assert';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractNamedImports, stripCommentsAndStrings } from '../../test-utils/helpers.ts';

// Story 7.1 AC4 ("the UI never rolls — it only reads pendingSpawn"): the
// engine guarantees place-not-roll by construction (spawn.ts), but nothing
// stopped a future UI/render/service edit from importing a roll function and
// silently re-rolling. This structural guard scans the thin-view + render +
// service layers (App.tsx + src/ui/** + src/render/** + src/services/**) and
// forbids:
//   1. importing the roll/resolve symbols from the engine
//      (resolveSpawn, weightedValue, spawnTile, weightedPicker) — thin views
//      may still consume newGame/move/types;
//   2. any source reference to those symbols (catches namespace-style calls
//      like `game.spawnTile(...)` that named-import scanning would miss) —
//      scanned over comment- AND string-stripped source so text inside string
//      literals cannot trip the guard;
//   3. Math.random anywhere in view/service source (randomness flows through
//      the injectable rng param only).
// Runtime-bound files (GameBoard.tsx, useFrameRateBaseline.ts) are exempt from
// other layers' RN-import rules but must still never import roll symbols.

const SCAN_ROOTS = ['../../App.tsx', '../../src/ui', '../../src/render', '../../src/services'];

const ROLL_SYMBOLS = new Set(['resolveSpawn', 'weightedValue', 'spawnTile', 'weightedPicker']);

const CODE_FILE = /\.tsx?$/;
// A code file with any other extension would silently escape this guard.
const UNEXPECTED_CODE_FILE = /\.(jsx?|mjs|cjs|mts|cts)$/;
const SKIP_DIRS = new Set(['node_modules']);

async function collectViewFiles(): Promise<Array<{ file: string; rel: string }>> {
  const out: Array<{ file: string; rel: string }> = [];
  const visited = new Set<string>();

  function classify(abs: string, rel: string): void {
    if (CODE_FILE.test(rel)) out.push({ file: abs, rel });
    else if (UNEXPECTED_CODE_FILE.test(rel)) {
      assert.fail(`${rel}: non-TypeScript code file exists under a scanned layer and escapes this guard`);
    }
  }

  async function visit(abs: string, rel: string): Promise<void> {
    let s;
    try {
      s = await stat(abs);
    } catch (err) {
      throw new Error(`cannot scan '${rel}': ${(err as Error).message}`);
    }
    if (s.isDirectory()) {
      // realpath guards against symlink cycles; dot-dirs and node_modules are
      // never part of these layers.
      const key = await realpath(abs);
      if (visited.has(key)) return;
      visited.add(key);
      const entries = await readdir(abs, { withFileTypes: true });
      for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
        await visit(`${abs}/${entry.name}`, rel ? `${rel}/${entry.name}` : entry.name);
      }
    } else {
      classify(abs, rel);
    }
  }

  for (const entry of SCAN_ROOTS) {
    await visit(fileURLToPath(new URL(entry, import.meta.url)), entry.replace(/^(\.\.\/)+/, ''));
  }
  assert.ok(out.length > 0, 'scan roots must yield at least one TS/TSX view file');
  return out;
}

function isEngineSpecifier(specifier: string): boolean {
  // Any specifier with an engine segment boundary: '../src/engine' (barrel,
  // no trailing slash), '../src/engine/…', bare 'engine/…'. Over-matching a
  // hypothetical non-engine path ending in 'engine' is acceptable strictness
  // for a guard.
  return /(^|\/)engine(\/|$)/.test(specifier);
}

test('[P0] AC4 UI never rolls: App/src-ui/src-render/src-services never import or reference roll symbols and never use Math.random', async () => {
  for (const { file, rel } of await collectViewFiles()) {
    const source = await readFile(file, 'utf8');
    // 1. Imports of roll symbols from any engine module (named, namespace
    //    and default forms).
    for (const { specifier, names } of extractNamedImports(source)) {
      if (!isEngineSpecifier(specifier)) continue;
      for (const name of names) {
        assert.ok(
          !ROLL_SYMBOLS.has(name),
          `${rel}: imports roll symbol '${name}' from '${specifier}' — the UI never rolls; it only reads pendingSpawn`
        );
      }
    }
    // 2. Any bare reference to a roll symbol (namespace calls included),
    //    over source with comments AND string/template contents blanked.
    const cleaned = stripCommentsAndStrings(source);
    for (const symbol of ROLL_SYMBOLS) {
      const re = new RegExp(`\\b${symbol}\\b`);
      assert.ok(
        !re.test(cleaned),
        `${rel}: references '${symbol}' in source — roll/resolve logic must stay inside src/engine`
      );
    }
    // 3. No Math.random in view source (rng is injectable engine territory).
    assert.ok(
      !cleaned.includes('Math.random'),
      `${rel}: uses Math.random — randomness must flow through the injectable rng param in the engine only`
    );
  }
});

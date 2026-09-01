import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, globSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../..');
function read(rel: string): string {
  // If rel looks absolute, read directly; otherwise join with repoRoot
  const abs = rel.startsWith('/') ? rel : join(repoRoot, rel);
  return readFileSync(abs, 'utf8');
}
function globRepo(pattern: string): string[] {
  const absPattern = join(repoRoot, pattern);
  return globSync(absPattern);
}

function stripCommentsAndStrings(src: string): string {
  let out = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlock = false;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (inLineComment) {
      if (ch === '\n') { inLineComment = false; out += ch; }
      i++; continue;
    }
    if (inBlock) {
      if (ch === '*' && next === '/') { inBlock = false; i += 2; continue; }
      i++; continue;
    }
    if (inSingle) {
      if (ch === "'" && src[i - 1] !== '\\') inSingle = false;
      i++; continue;
    }
    if (inDouble) {
      if (ch === '"' && src[i - 1] !== '\\') inDouble = false;
      i++; continue;
    }
    if (inBacktick) {
      if (ch === '`' && src[i - 1] !== '\\') inBacktick = false;
      i++; continue;
    }
    if (ch === '/' && next === '/') { inLineComment = true; i += 2; continue; }
    if (ch === '/' && next === '*') { inBlock = true; i += 2; continue; }
    if (ch === "'") { inSingle = true; i++; continue; }
    if (ch === '"') { inDouble = true; i++; continue; }
    if (ch === '`') { inBacktick = true; i++; continue; }
    out += ch; i++;
  }
  return out;
}

describe('appStoreDeclarations purity — monetization never mutates engine rules', () => {
  it('appStoreDeclarations is pure data (no engine math/merge/spawn literals)', () => {
    const src = stripCommentsAndStrings(read('triade/src/services/monetization/appStoreDeclarations.ts'));
    assert.ok(!/canMerge|mergeValue|pendingSpawn|spawnTile|move\(/.test(src), 'must not contain engine rule literals');
    assert.ok(!/Math\.random/.test(src), 'must not contain Math.random');
    assert.ok(!/from\s+['"].*\/engine\//.test(src), 'must not import from src/engine');
  });

  it('no monetization file imports src/engine (boundary ADR-01)', () => {
    const monetFiles = globRepo('triade/src/services/monetization/*.ts');
    for (const f of monetFiles) {
      const src = stripCommentsAndStrings(read(f));
      assert.ok(!/from\s+['"].*\/engine\//.test(src), `${f} must not import from src/engine`);
      assert.ok(!/src\/engine/.test(src), `${f} must not reference src/engine`);
    }
  });

  it('no monetization file duplicates merge predicate or mutates pendingSpawn', () => {
    const monetFiles = globRepo('triade/src/services/monetization/*.ts');
    for (const f of monetFiles) {
      const src = stripCommentsAndStrings(read(f));
      assert.ok(!/a\s*===\s*1\s*&&\s*b\s*===\s*2/.test(src), `${f} must not duplicate merge predicate 1+2`);
      assert.ok(!/pendingSpawn\s*=/.test(src) && !/\.pendingSpawn/.test(src) || f.endsWith('appStoreDeclarations.ts') === false || !/pendingSpawn\s*=/.test(src), `${f} must not mutate pendingSpawn`);
    }
  });

  it('no monetization file mutates board/score directly', () => {
    const monetFiles = globRepo('triade/src/services/monetization/*.ts');
    for (const f of monetFiles) {
      const src = stripCommentsAndStrings(read(f));
      // Allow ENTITLEMENT_* keys but not board[ or score mutation; appStoreDeclarations is data-only
      if (f.endsWith('appStoreDeclarations.ts')) {
        assert.ok(!/board\s*\[/.test(src), `${f} must not touch board`);
        continue;
      }
      // purchases/rewardedAds should not assign board/score
      assert.ok(!/board\s*=\s*\[/.test(src), `${f} must not assign board`);
    }
  });
});

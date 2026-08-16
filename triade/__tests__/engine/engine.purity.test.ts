import { test } from 'node:test';
import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PURITY_ROOTS = [
  fileURLToPath(new URL('../../src/engine/', import.meta.url)),
  fileURLToPath(new URL('../../src/game/', import.meta.url))
];

// ADR-05: the frame math in src/render must stay pure TS (host-testable,
// relative imports only). The render layer also holds runtime-bound modules
// (React/Skia/Reanimated hooks/components) that legitimately import RN. Instead
// of hand-maintaining a purity allowlist, we auto-scan every file under
// src/render and exempt only the documented runtime-bound files below — a NEW
// pure module is scanned automatically, and any new RN-bound module fails until
// it is consciously added to the exemption set.
const RENDER_ROOT = fileURLToPath(new URL('../../src/render/', import.meta.url));
const RENDER_RUNTIME_BOUND = new Set(['GameBoard.tsx', 'useFrameRateBaseline.ts']);

const FORBIDDEN_PREFIXES = ['react', 'react-native', '@shopify', 'expo', '@react-native', 'reanimated', 'skia'];

function isForbidden(specifier: string): string | undefined {
  const lower = specifier.toLowerCase();
  return FORBIDDEN_PREFIXES.find((p) => lower === p || lower.startsWith(`${p}/`) || lower.startsWith(`${p}-`));
}

async function collectTsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsFiles(full)));
    } else if (/\.tsx?$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

async function collectAllSourceFiles(): Promise<Array<{ root: string; file: string }>> {
  const files: Array<{ root: string; file: string }> = [];
  for (const root of PURITY_ROOTS) {
    const rootFiles = await collectTsFiles(root);
    assert.ok(rootFiles.length > 0, `no TypeScript source files under ${root} — ADR-01 scope silently void`);
    for (const file of rootFiles) files.push({ root, file });
  }
  return files;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function extractSpecifiers(source: string): string[] {
  const cleaned = stripComments(source);
  const specifiers: string[] = [];
  const staticRe = /(?:import|export)\s+(?:[\w*{},\s]+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = staticRe.exec(cleaned)) !== null) specifiers.push(m[1]);
  while ((m = dynamicRe.exec(cleaned)) !== null) specifiers.push(m[1]);
  return specifiers;
}

test('ADR-01: src/engine + src/game import nothing from RN/React/Skia/Expo', async () => {
  const files = await collectAllSourceFiles();
  assert.ok(files.length > 0, 'engine/game source files discovered');

  for (const { root, file } of files) {
    const source = await readFile(file, 'utf8');
    const rel = relative(root, file);
    for (const spec of extractSpecifiers(source)) {
      const forbidden = isForbidden(spec);
      assert.ok(
        !forbidden,
        `${rel}: imports '${spec}' from forbidden RN/React/Skia/Expo module '${forbidden}' (ADR-01 violation)`
      );
    }
  }
});

async function renderPureModules(): Promise<string[]> {
  const all = await collectTsFiles(RENDER_ROOT);
  assert.ok(all.length > 0, 'no TypeScript source files under src/render — ADR-05 scope silently void');
  const pure = all.filter((f) => !RENDER_RUNTIME_BOUND.has(relative(RENDER_ROOT, f)));
  assert.ok(pure.length > 0, 'no pure modules under src/render — is the runtime-bound exemption too broad?');
  return pure;
}

test('ADR-01: src/render pure modules import nothing from RN/React/Skia/Expo (runtime-bound files exempt)', async () => {
  for (const file of await renderPureModules()) {
    const source = await readFile(file, 'utf8');
    const rel = relative(RENDER_ROOT, file);
    for (const spec of extractSpecifiers(source)) {
      const forbidden = isForbidden(spec);
      assert.ok(
        !forbidden,
        `${rel}: imports '${spec}' from forbidden RN/React/Skia/Expo module '${forbidden}' (ADR-05 violation)`
      );
    }
  }
});

test('ADR-01: src/render pure modules use relative imports only (self-contained frame math)', async () => {
  for (const file of await renderPureModules()) {
    const source = await readFile(file, 'utf8');
    const rel = relative(RENDER_ROOT, file);
    for (const spec of extractSpecifiers(source)) {
      const relativeImport = spec.startsWith('./') || spec.startsWith('../');
      assert.ok(
        relativeImport,
        `${rel}: non-relative import '${spec}' breaks the pure-TS self-contained boundary (ADR-01)`
      );
    }
  }
});

test('ADR-01: src/render runtime-bound exemption set is current (no stale entries)', async () => {
  const all = new Set((await collectTsFiles(RENDER_ROOT)).map((f) => relative(RENDER_ROOT, f)));
  for (const name of RENDER_RUNTIME_BOUND) {
    assert.ok(
      all.has(name),
      `exemption '${name}' no longer exists under src/render — remove it from RENDER_RUNTIME_BOUND`
    );
  }
});

test('ADR-01: src/engine + src/game imports are self-contained (relative paths only)', async () => {
  const files = await collectAllSourceFiles();
  for (const { root, file } of files) {
    const source = await readFile(file, 'utf8');
    const rel = relative(root, file);
    for (const spec of extractSpecifiers(source)) {
      const relativeImport = spec.startsWith('./') || spec.startsWith('../');
      assert.ok(
        relativeImport,
        `${rel}: non-relative import '${spec}' breaks the pure-TS self-contained boundary (ADR-01)`
      );
    }
  }
});

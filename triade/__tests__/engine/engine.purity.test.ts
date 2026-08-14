import { test } from 'node:test';
import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PURITY_ROOTS = [
  fileURLToPath(new URL('../../src/engine/', import.meta.url)),
  fileURLToPath(new URL('../../src/game/', import.meta.url))
];

// Story 1.3 ADR-05: transitionPlan.ts is pure TS in src/render — the frame math
// must stay host-testable and import nothing from RN/React/Skia/Reanimated.
const PURITY_FILES = [fileURLToPath(new URL('../../src/render/transitionPlan.ts', import.meta.url))];

const FORBIDDEN_PREFIXES = ['react', 'react-native', '@shopify', 'expo', '@react-native'];

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

test('ADR-01: src/render/transitionPlan.ts is pure TS (no RN/React/Skia/Expo imports)', async () => {
  for (const file of PURITY_FILES) {
    const source = await readFile(file, 'utf8');
    for (const spec of extractSpecifiers(source)) {
      const forbidden = isForbidden(spec);
      assert.ok(
        !forbidden,
        `${file}: imports '${spec}' from forbidden RN/React/Skia/Expo module '${forbidden}' (ADR-05 violation)`
      );
    }
  }
});

test('ADR-01: src/render/transitionPlan.ts uses relative imports only (self-contained frame math)', async () => {
  for (const file of PURITY_FILES) {
    const source = await readFile(file, 'utf8');
    for (const spec of extractSpecifiers(source)) {
      const relativeImport = spec.startsWith('./') || spec.startsWith('../');
      assert.ok(
        relativeImport,
        `${file}: non-relative import '${spec}' breaks the pure-TS self-contained boundary (ADR-01)`
      );
    }
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

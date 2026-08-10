import { test } from 'node:test';
import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE_ROOT = fileURLToPath(new URL('../../src/engine/', import.meta.url));

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

test('ADR-01: src/engine imports nothing from RN/React/Skia/Expo', async () => {
  const files = await collectTsFiles(ENGINE_ROOT);
  assert.ok(files.length > 0, 'engine source files discovered');

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const rel = relative(ENGINE_ROOT, file);
    for (const spec of extractSpecifiers(source)) {
      const forbidden = isForbidden(spec);
      assert.ok(
        !forbidden,
        `${rel}: imports '${spec}' from forbidden RN/React/Skia/Expo module '${forbidden}' (ADR-01 violation)`
      );
    }
  }
});

test('ADR-01: src/engine imports are self-contained (relative paths only)', async () => {
  const files = await collectTsFiles(ENGINE_ROOT);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const rel = relative(ENGINE_ROOT, file);
    for (const spec of extractSpecifiers(source)) {
      const relativeImport = spec.startsWith('./') || spec.startsWith('../');
      assert.ok(
        relativeImport,
        `${rel}: non-relative import '${spec}' breaks the pure-TS self-contained boundary (ADR-01)`
      );
    }
  }
});

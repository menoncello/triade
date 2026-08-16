import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Story 1.4 boundary rule 8 (ADR-05 spirit): schema.ts is the pure, host-testable
// half of the storage layer. settingsStore.ts and entitlements.ts MAY import
// native modules, so this guard scans ONLY schema.ts.
const SCHEMA_FILE = fileURLToPath(new URL('../../src/services/storage/schema.ts', import.meta.url));

const FORBIDDEN_PREFIXES = ['react', 'react-native', '@shopify', 'expo', '@react-native'];

function isForbidden(specifier: string): string | undefined {
  const lower = specifier.toLowerCase();
  return FORBIDDEN_PREFIXES.find((p) => lower === p || lower.startsWith(`${p}/`) || lower.startsWith(`${p}-`));
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

test('[P1] ADR-05/boundary rule 8: src/services/storage/schema.ts imports nothing from RN/React/Skia/Expo and uses relative imports only', async () => {
  const source = await readFile(SCHEMA_FILE, 'utf8');
  for (const spec of extractSpecifiers(source)) {
    const forbidden = isForbidden(spec);
    assert.ok(
      !forbidden,
      `schema.ts: imports '${spec}' from forbidden RN/React/Skia/Expo module '${forbidden}' (boundary rule 8 violation)`
    );
    const relativeImport = spec.startsWith('./') || spec.startsWith('../');
    assert.ok(
      relativeImport,
      `schema.ts: non-relative import '${spec}' breaks the pure-TS self-contained boundary (ADR-05 spirit)`
    );
  }
});

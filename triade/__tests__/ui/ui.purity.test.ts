import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractSpecifiers } from '../../test-utils/helpers.ts';

// Story 1.5 boundary rule (ADR-01/05 spirit, T2.1/T2.2): layout.ts and
// orientation.ts are the pure, host-testable halves of the UI layer. Hud.tsx
// and PauseButton.tsx MAY import RN/Expo, so this guard scans ONLY the two pure
// modules. Red-phase: the files do not exist yet, so the read is skipped until
// the developer activates the scaffold.
const PURE_MODULES = [
  fileURLToPath(new URL('../../src/ui/layout.ts', import.meta.url)),
  fileURLToPath(new URL('../../src/ui/orientation.ts', import.meta.url))
];

const FORBIDDEN_PREFIXES = ['react', 'react-native', '@shopify', 'expo', '@react-native', 'reanimated', 'skia'];

function isForbidden(specifier: string): string | undefined {
  const lower = specifier.toLowerCase();
  return FORBIDDEN_PREFIXES.find((p) => lower === p || lower.startsWith(`${p}/`) || lower.startsWith(`${p}-`));
}

test('[P1] ADR-01/05: src/ui pure modules (layout.ts, orientation.ts) import nothing from RN/React/Skia/Expo and use relative imports only', async () => {
  for (const file of PURE_MODULES) {
    const source = await readFile(file, 'utf8');
    const rel = file.split('/').pop() ?? file;
    for (const spec of extractSpecifiers(source)) {
      const forbidden = isForbidden(spec);
      assert.ok(
        !forbidden,
        `${rel}: imports '${spec}' from forbidden RN/React/Skia/Expo module '${forbidden}' (ADR-01 violation)`
      );
      const relativeImport = (spec.startsWith('./') || spec.startsWith('../')) && spec !== './..';
      assert.ok(
        relativeImport,
        `${rel}: non-relative import '${spec}' breaks the pure-TS self-contained boundary (ADR-01)`
      );
    }
  }
});
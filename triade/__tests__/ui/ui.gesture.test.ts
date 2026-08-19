import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractNamedImports } from '../../test-utils/helpers.ts';
import { SWIPE_THRESHOLD } from '../../src/ui/swipe.ts';

// Story 1.6 boundary rule (AC-1, UX-DR-3): the RNGH activation threshold in
// App.tsx must reference the tested SWIPE_THRESHOLD constant — never a bare
// numeric literal — so the real gesture activation can never drift from the
// contract pinned by swipe.test.ts. Gesture recognition itself is manual on the
// device; this static guard is the automated tripwire for the threshold wiring.
const APP_FILE = fileURLToPath(new URL('../../App.tsx', import.meta.url));
const SWIPE_MODULE = './src/ui/swipe.ts';

test('[P1] AC-1/UX-DR-3: App.tsx gesture activation references SWIPE_THRESHOLD (no bare ~10px literal)', async () => {
  const source = await readFile(APP_FILE, 'utf8');
  const swipeImports = extractNamedImports(source).filter((i) => i.specifier === SWIPE_MODULE);
  assert.ok(
    swipeImports.some((i) => i.names.includes('SWIPE_THRESHOLD')),
    'App.tsx must import SWIPE_THRESHOLD from src/ui/swipe.ts'
  );
  assert.match(
    source,
    /activeOffsetX\(\s*\[-SWIPE_THRESHOLD,\s*SWIPE_THRESHOLD\]\s*\)/,
    'activeOffsetX must be [-SWIPE_THRESHOLD, SWIPE_THRESHOLD]'
  );
  assert.match(
    source,
    /activeOffsetY\(\s*\[-SWIPE_THRESHOLD,\s*SWIPE_THRESHOLD\]\s*\)/,
    'activeOffsetY must be [-SWIPE_THRESHOLD, SWIPE_THRESHOLD]'
  );
  assert.ok(
    !/activeOffset[XY]\(\s*\[-[0-9]+,\s*[0-9]+\]\s*\)/.test(source),
    'activeOffset must not use a bare numeric literal'
  );
  assert.strictEqual(SWIPE_THRESHOLD, 10, 'activation threshold must stay 10px (UX-DR-3)');
});

import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extractNamedImports, extractSpecifiers } from '../../test-utils/helpers.ts';

// Story 1.5 boundary rule (AC-3, UX-DR-6): Hud.tsx, PauseButton.tsx and
// GameOverOverlay.tsx are the thin RN views of the UI layer. They may import
// react-native view primitives and same-dir siblings in src/ui — never
// engine/state/render/service/game logic and never Skia/Expo/Reanimated (a HUD
// duplicating game rules is the exact failure the game.js/ui.js split forbids).
// RN composition is validated manually on the simulator, so this static guard
// is the automated tripwire. GameOverOverlay was added in 6.1; its local
// scanner in gameOverOverlay.test.ts now delegates to this production guard.
const VIEW_FILES = [
  { file: fileURLToPath(new URL('../../src/ui/Hud.tsx', import.meta.url)), rel: 'Hud.tsx' },
  { file: fileURLToPath(new URL('../../src/ui/PauseButton.tsx', import.meta.url)), rel: 'PauseButton.tsx' },
  { file: fileURLToPath(new URL('../../src/ui/GameOverOverlay.tsx', import.meta.url)), rel: 'GameOverOverlay.tsx' }
];

// Symbols that re-derive layout/rule logic. A thin view may consume pure
// constants (SAFE_MARGIN, EdgeInsets) but must never recompute the layout:
// calling these from a HUD duplicates the layout module (the rule-duplication
// failure the game.js/ui.js split forbids) and the same-dir allowlist alone
// cannot tell a constant import from a logic import.
const RULE_LOGIC_SYMBOLS = new Set(['layoutFor', 'isLandscape', 'PORTRAIT_BAND_HEIGHT', 'LANDSCAPE_BAND_HEIGHT']);

function isSameDirImport(specifier: string): boolean {
  const lower = specifier.toLowerCase();
  return lower.startsWith('./') && lower !== './..' && !lower.startsWith('./../') && !lower.startsWith('./../../');
}

function isAllowedViewImport(specifier: string): boolean {
  const lower = specifier.toLowerCase();
  return (
    lower === 'react' ||
    lower === 'react-native' ||
    lower.startsWith('react-native/') ||
    isSameDirImport(lower)
  );
}

test('[P1] AC-3/UX-DR-6: Hud.tsx, PauseButton.tsx and GameOverOverlay.tsx import only react-native primitives and same-dir siblings (thin views, no rule logic)', async () => {
  for (const { file, rel } of VIEW_FILES) {
    const source = await readFile(file, 'utf8');
    for (const spec of extractSpecifiers(source)) {
      assert.ok(
        isAllowedViewImport(spec),
        `${rel}: import '${spec}' is not a react-native primitive or same-dir sibling (thin view violation)`
      );
    }
    for (const { specifier, names } of extractNamedImports(source)) {
      if (!isSameDirImport(specifier)) continue;
      for (const name of names) {
        assert.ok(
          !RULE_LOGIC_SYMBOLS.has(name),
          `${rel}: imports '${name}' from same-dir '${specifier}' — layout/rule logic must never be re-derived in a thin view`
        );
      }
    }
  }
});

test('[P1] AC-3: PauseButton keeps a >= 44pt hit target exported as HIT_TARGET and applied to the button box', async () => {
  const pause = VIEW_FILES.find((v) => v.rel === 'PauseButton.tsx');
  assert.ok(pause, 'PauseButton.tsx must be scanned');
  const source = await readFile(pause.file, 'utf8');
  const hitTarget = /export\s+const\s+HIT_TARGET\s*=\s*(\d+)/.exec(source);
  assert.ok(hitTarget, 'PauseButton.tsx must export const HIT_TARGET as a numeric literal');
  const size = Number(hitTarget[1]);
  assert.ok(Number.isInteger(size), `HIT_TARGET must be an integer, got ${hitTarget[1]}`);
  assert.ok(size >= 44, `HIT_TARGET must be >= 44pt, got ${size}`);
  assert.match(source, /width:\s*HIT_TARGET(?=[,}])/, 'button style width must reference HIT_TARGET directly (no arithmetic)');
  assert.match(source, /height:\s*HIT_TARGET(?=[,}])/, 'button style height must reference HIT_TARGET directly (no arithmetic)');
});
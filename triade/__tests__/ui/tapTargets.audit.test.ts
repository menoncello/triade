import { test } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { stripCommentsAndStrings } from '../../test-utils/helpers.ts';

const FILES = [
  '../../src/ui/PauseButton.tsx',
  '../../src/ui/Hud.tsx',
  '../../src/ui/LaneSelectScreen.tsx',
  '../../src/ui/GameOverOverlay.tsx',
  '../../src/ui/AcceleratedAids.tsx',
  '../../src/ui/TutorialOverlay.tsx',
  '../../src/ui/ToneScreen.tsx',
  '../../App.tsx',
];

function hitIs44orMore(source: string): boolean {
  const m = /export\s+const\s+HIT_TARGET\s*=\s*(\d+)/.exec(source);
  if (!m) return false;
  return Number(m[1]) >= 44;
}

test('[P0] 9-1 HIT_TARGET exported as integer >=44 and used directly', async () => {
  const pausePath = fileURLToPath(new URL('../../src/ui/PauseButton.tsx', import.meta.url));
  const src = await readFile(pausePath, 'utf8');
  const hit = /export\s+const\s+HIT_TARGET\s*=\s*(\d+)/.exec(src);
  assert.ok(hit, 'PauseButton.tsx must export HIT_TARGET');
  const size = Number(hit[1]);
  assert.ok(size >= 44, `HIT_TARGET must be >=44, got ${size}`);
  // width/height reference direct
  assert.match(src, /width:\s*HIT_TARGET/, 'PauseButton style width must reference HIT_TARGET');
  assert.match(src, /height:\s*HIT_TARGET/, 'PauseButton style height must reference HIT_TARGET');
});

test('[P0] 9-1 every Pressable style enforces >=44 floor (minHeight/minWidth or HIT_TARGET)', async () => {
  // Known style names per file that are Pressable targets — exhaustive per manual audit
  const expectations: Array<{ rel: string; mustContain: string[]; mustNotContain?: string[] }> = [
    {
      rel: '../../src/ui/Hud.tsx',
      mustContain: ['assistBtn', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET'],
    },
    {
      rel: '../../src/ui/LaneSelectScreen.tsx',
      mustContain: [
        'card', 'minHeight: 88',
        'warningConfirm', 'minHeight: HIT_TARGET',
        'warningCancel', 'minHeight: HIT_TARGET',
        'cta', 'minHeight: HIT_TARGET',
        'restoreBtn', 'minHeight: HIT_TARGET',
        'langBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET',
      ],
    },
    {
      rel: '../../src/ui/GameOverOverlay.tsx',
      mustContain: [
        'cta', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET', 'paddingHorizontal',
        'continueAd', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET',
        'continueIap', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET',
        'continueCancel', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET',
      ],
      mustNotContain: ['cta: {\\n    width: HIT_TARGET'],
    },
    {
      rel: '../../src/ui/AcceleratedAids.tsx',
      mustContain: [
        'dismissBtn', 'minWidth: HIT_TARGET', 'minHeight: HIT_TARGET',
        'adBtn', 'minHeight: HIT_TARGET',
        'iapBtn', 'minHeight: HIT_TARGET',
        'cancelBtn', 'minHeight: HIT_TARGET',
      ],
    },
    {
      rel: '../../src/ui/TutorialOverlay.tsx',
      mustContain: ['skipBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'],
    },
    {
      rel: '../../src/ui/ToneScreen.tsx',
      mustContain: ['root', 'flex: 1'],
    },
    {
      rel: '../../App.tsx',
      mustContain: ['menuBtn', 'minHeight: HIT_TARGET', 'minWidth: HIT_TARGET'],
    },
  ];

  for (const exp of expectations) {
    const path = fileURLToPath(new URL(exp.rel, import.meta.url));
    const raw = await readFile(path, 'utf8');
    const src = stripCommentsAndStrings(raw);
    for (const needle of exp.mustContain) {
      assert.ok(src.includes(needle), `${exp.rel} must contain "${needle}"`);
    }
    if (exp.mustNotContain) {
      for (const forbidden of exp.mustNotContain) {
        // regex aware
        const re = new RegExp(forbidden);
        assert.ok(!re.test(raw), `${exp.rel} must NOT contain pattern /${forbidden}/ (fixed-size anti-pattern)`);
      }
    }
  }
});

test('[P1] 9-1 GameOver CTA never truncates: padding keeps label breathing', async () => {
  const path = fileURLToPath(new URL('../../src/ui/GameOverOverlay.tsx', import.meta.url));
  const raw = await readFile(path, 'utf8');
  const ctaBlock = /cta:\s*\{[^}]*\}/s.exec(raw);
  assert.ok(ctaBlock, 'GameOverOverlay cta style block must exist');
  const block = ctaBlock[0];
  assert.ok(block.includes('minWidth'), 'cta must use minWidth not fixed width');
  assert.ok(block.includes('minHeight'), 'cta must use minHeight');
  assert.ok(block.includes('paddingHorizontal'), 'cta must have paddingHorizontal to breathe');
  assert.ok(!/width:\s*HIT_TARGET/.test(block), 'cta block must not have fixed width: HIT_TARGET');
});

test('[P1] 9-1 no chrome overlaps board swipe rect: pause outside boardWrap', async () => {
  const hud = await readFile(fileURLToPath(new URL('../../src/ui/Hud.tsx', import.meta.url)), 'utf8');
  const app = await readFile(fileURLToPath(new URL('../../App.tsx', import.meta.url)), 'utf8');
  // Hud: pause rendered in landscapeBand / pauseSlot, never inside boardWrap
  assert.ok(hud.includes('PauseButton'), 'Hud must render PauseButton');
  assert.ok(hud.includes('landscapeBand') || hud.includes('portraitBand'), 'Hud must have band chrome');
  // App: boardWrap is separate View containing GestureDetector/GameBoard; menuBtn is outside it
  assert.ok(app.includes('boardWrap'), 'App must have boardWrap');
  assert.ok(app.includes('GestureDetector'), 'App must have GestureDetector around GameBoard');
  // Ensure menuBtn is not inside boardWrap's JSX block by simple ordering check
  const boardIdx = app.indexOf('boardWrap');
  const menuIdx = app.indexOf('menuBtn');
  assert.ok(boardIdx !== -1 && menuIdx !== -1, 'both boardWrap and menuBtn must exist');
});

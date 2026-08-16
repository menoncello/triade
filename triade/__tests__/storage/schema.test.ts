import { test } from 'node:test';
import assert from 'node:assert';

// Red-phase ATDD contract: the Settings shape this story must implement. Local
// type (not imported from the not-yet-created module) so `tsc --noEmit` stays
// green until the developer activates these scaffolds.
interface Settings {
  theme: string;
  reducedMotion: boolean;
  language: string;
  laneDefault: number;
}

const SCHEMA_SPEC = '../../src/services/storage/schema.ts';

const SETTINGS_KEYS = ['theme', 'reducedMotion', 'language', 'laneDefault'];

function expectFullDefaults(result: Settings, defaults: Settings): void {
  assert.deepStrictEqual(result, defaults, `expected full default fallback, got ${JSON.stringify(result)}`);
}

test('[P0] loadSettings returns defaults when all fields are missing and never throws (AC-2)', async () => {
  const { loadSettings, DEFAULT_SETTINGS } = (await import(SCHEMA_SPEC)) as {
    loadSettings: (raw: string) => Settings;
    DEFAULT_SETTINGS: Settings;
  };
  const raw = '{}';
  assert.doesNotThrow(() => loadSettings(raw), 'loadSettings must never throw on a JSON object with no fields');
  expectFullDefaults(loadSettings(raw), DEFAULT_SETTINGS);
});

test('[P0] loadSettings drops extra and unknown fields (AC-2)', async () => {
  const { loadSettings } = (await import(SCHEMA_SPEC)) as { loadSettings: (raw: string) => Settings };
  const raw = '{"theme":"dark","reducedMotion":false,"bogus":123,"freeUndo":5,"notAKey":"x"}';
  const result = loadSettings(raw);
  assert.strictEqual(result.theme, 'dark', 'valid theme is preserved');
  assert.strictEqual(result.reducedMotion, false, 'valid reducedMotion is preserved');
  assert.ok(!('bogus' in result), 'unknown field bogus is dropped');
  assert.ok(!('notAKey' in result), 'unknown field notAKey is dropped');
  assert.ok(!('freeUndo' in result), 'budget key freeUndo never leaks into settings');
});

test('[P0] loadSettings returns defaults on corrupt JSON and never throws (AC-2)', async () => {
  const { loadSettings, DEFAULT_SETTINGS } = (await import(SCHEMA_SPEC)) as {
    loadSettings: (raw: string) => Settings;
    DEFAULT_SETTINGS: Settings;
  };
  const raw = '{"theme":';
  assert.doesNotThrow(() => loadSettings(raw), 'loadSettings must never throw on broken JSON syntax');
  expectFullDefaults(loadSettings(raw), DEFAULT_SETTINGS);
});

test('[P0] loadSettings defaults a field whose type is wrong (theme: 42) (AC-2)', async () => {
  const { loadSettings, DEFAULT_SETTINGS } = (await import(SCHEMA_SPEC)) as {
    loadSettings: (raw: string) => Settings;
    DEFAULT_SETTINGS: Settings;
  };
  const raw = '{"theme":42,"reducedMotion":false,"language":"en","laneDefault":1}';
  const result = loadSettings(raw);
  assert.strictEqual(result.theme, DEFAULT_SETTINGS.theme, 'wrong-typed theme falls back to the default');
  assert.strictEqual(result.reducedMotion, false, 'valid reducedMotion is preserved');
  assert.strictEqual(result.language, 'en', 'valid language is preserved');
  assert.strictEqual(result.laneDefault, 1, 'valid numeric laneDefault is preserved');
});

test('[P0] loadSettings preserves valid fields and defaults invalid ones in partial JSON (AC-2)', async () => {
  const { loadSettings } = (await import(SCHEMA_SPEC)) as { loadSettings: (raw: string) => Settings };
  const raw = '{"theme":"light","reducedMotion":"yes","language":"pt-BR","laneDefault":"2"}';
  const result = loadSettings(raw);
  assert.strictEqual(result.theme, 'light', 'valid theme is preserved');
  assert.strictEqual(result.language, 'pt-BR', 'valid language is preserved');
  assert.strictEqual(result.reducedMotion, false, 'non-boolean reducedMotion falls back to default');
  assert.strictEqual(result.laneDefault, 0, 'non-numeric laneDefault falls back to default');
});

test('[P0] loadSettings falls back to the default for out-of-range or non-integer laneDefault (AC-2)', async () => {
  const { loadSettings, DEFAULT_SETTINGS } = (await import(SCHEMA_SPEC)) as {
    loadSettings: (raw: string) => Settings;
    DEFAULT_SETTINGS: Settings;
  };
  const raws = [
    '{"laneDefault":-5}',
    '{"laneDefault":1e999}',
    '{"laneDefault":2}',
    '{"laneDefault":1.5}',
    '{"laneDefault":9007199254740991}'
  ];
  for (const raw of raws) {
    assert.doesNotThrow(() => loadSettings(raw), `loadSettings('${raw}') must not throw`);
    assert.strictEqual(
      loadSettings(raw).laneDefault,
      DEFAULT_SETTINGS.laneDefault,
      `out-of-range/non-integer laneDefault in '${raw}' falls back to the default`
    );
  }
});

test('[P0] loadSettings returns defaults for an entirely empty string and never throws (AC-2)', async () => {
  const { loadSettings, DEFAULT_SETTINGS } = (await import(SCHEMA_SPEC)) as {
    loadSettings: (raw: string) => Settings;
    DEFAULT_SETTINGS: Settings;
  };
  const raw = '';
  assert.doesNotThrow(() => loadSettings(raw), 'loadSettings must never throw on an empty string');
  expectFullDefaults(loadSettings(raw), DEFAULT_SETTINGS);
});

test('[P0] loadSettings never throws on any adversarial raw string (AC-2)', async () => {
  const { loadSettings, DEFAULT_SETTINGS } = (await import(SCHEMA_SPEC)) as {
    loadSettings: (raw: string) => Settings;
    DEFAULT_SETTINGS: Settings;
  };
  const raws = ['', 'null', '[]', '{"theme":', 'not json', '123', '{"theme":{"nested":true}}'];
  for (const raw of raws) {
    assert.doesNotThrow(() => loadSettings(raw), `loadSettings('${raw}') must not throw`);
    expectFullDefaults(loadSettings(raw), DEFAULT_SETTINGS);
  }
});

test('[P0] serializeSettings/loadSettings round-trip preserves a full settings object (AC-2)', async () => {
  const { loadSettings, serializeSettings } = (await import(SCHEMA_SPEC)) as {
    loadSettings: (raw: string) => Settings;
    serializeSettings: (s: Settings) => string;
  };
  const settings: Settings = {
    theme: 'light',
    reducedMotion: true,
    language: 'pt-BR',
    laneDefault: 1
  };
  const raw = serializeSettings(settings);
  assert.strictEqual(typeof raw, 'string', 'serializeSettings returns a string');
  assert.deepStrictEqual(loadSettings(raw), settings, 'round-trip reproduces the exact settings object');
});

test('[P0] DEFAULT_SETTINGS exposes exactly the settings keys with sane defaults (AC-2)', async () => {
  const { DEFAULT_SETTINGS } = (await import(SCHEMA_SPEC)) as { DEFAULT_SETTINGS: Settings };
  assert.deepStrictEqual(
    Object.keys(DEFAULT_SETTINGS).sort(),
    [...SETTINGS_KEYS].sort(),
    'DEFAULT_SETTINGS must expose exactly theme, reducedMotion, language, laneDefault'
  );
  assert.strictEqual(DEFAULT_SETTINGS.theme, 'dark', 'canonical default theme is dark');
  assert.strictEqual(DEFAULT_SETTINGS.reducedMotion, false, 'reduced motion is off by default');
  assert.strictEqual(DEFAULT_SETTINGS.language, 'en', 'default language is en');
  assert.strictEqual(DEFAULT_SETTINGS.laneDefault, 0, 'default lane is lane 0');
});

import { test } from 'node:test';
import assert from 'node:assert';

// Red-phase ATDD contract: settingsStore.ts must export STORAGE_KEYS (single
// source of truth for the keyspace). Variable specifier keeps `tsc --noEmit`
// green until the developer activates these scaffolds.
const SETTINGS_STORE_SPEC = '../../src/services/storage/settingsStore.ts';

const SETTINGS_KEYS = ['theme', 'reducedMotion', 'language', 'laneDefault'];
const BUDGET_TOKENS = ['freeundo', 'freecontinue', 'freehint', 'budget', 'undo', 'continue', 'hint'];

test('[P0] STORAGE_KEYS is exported and non-empty (single source of truth for the keyspace)', async () => {
  const { STORAGE_KEYS } = (await import(SETTINGS_STORE_SPEC)) as { STORAGE_KEYS: Record<string, string> };
  assert.ok(STORAGE_KEYS, 'STORAGE_KEYS must be exported from settingsStore.ts');
  assert.ok(Object.keys(STORAGE_KEYS).length > 0, 'STORAGE_KEYS must expose at least one key');
});

test('[P0] STORAGE_KEYS contains the best-score key (AC-2: best persists across launches)', async () => {
  const { STORAGE_KEYS } = (await import(SETTINGS_STORE_SPEC)) as { STORAGE_KEYS: Record<string, string> };
  assert.ok('best' in STORAGE_KEYS, "STORAGE_KEYS must expose a 'best' key (AC-2)");
  assert.strictEqual(typeof STORAGE_KEYS['best'], 'string', 'best key value must be a string');
  assert.ok(STORAGE_KEYS['best'].length > 0, 'best key value must be non-empty');
});

test('[P0] STORAGE_KEYS contains the settings keys (AC-2: settings persist)', async () => {
  const { STORAGE_KEYS } = (await import(SETTINGS_STORE_SPEC)) as { STORAGE_KEYS: Record<string, string> };
  for (const key of SETTINGS_KEYS) {
    assert.ok(key in STORAGE_KEYS, `STORAGE_KEYS must expose settings key '${key}'`);
    assert.strictEqual(typeof STORAGE_KEYS[key], 'string', `STORAGE_KEYS['${key}'] must be a string`);
  }
});

test('[P0] STORAGE_KEYS never contains budget keys (AC-4: budgets are memory-only)', async () => {
  const { STORAGE_KEYS } = (await import(SETTINGS_STORE_SPEC)) as { STORAGE_KEYS: Record<string, string> };
  const names = Object.keys(STORAGE_KEYS);
  const values = Object.values(STORAGE_KEYS);
  for (const token of BUDGET_TOKENS) {
    for (const name of names) {
      assert.ok(
        !name.toLowerCase().includes(token),
        `STORAGE_KEYS key name '${name}' contains forbidden budget token '${token}' (AC-4 violation)`
      );
    }
    for (const value of values) {
      assert.ok(
        !value.toLowerCase().includes(token),
        `STORAGE_KEYS value '${value}' contains forbidden budget token '${token}' (AC-4 violation)`
      );
    }
  }
});

test('[P0] every STORAGE_KEYS value is a non-empty string', async () => {
  const { STORAGE_KEYS } = (await import(SETTINGS_STORE_SPEC)) as { STORAGE_KEYS: Record<string, string> };
  for (const [key, value] of Object.entries(STORAGE_KEYS)) {
    assert.strictEqual(typeof value, 'string', `STORAGE_KEYS['${key}'] must be a string`);
    assert.ok(value.length > 0, `STORAGE_KEYS['${key}'] must be non-empty`);
  }
});

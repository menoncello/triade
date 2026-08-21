import { test, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import * as storage from '../../src/services/storage/settingsStore.ts';
import type { StorageBackend } from '../../src/services/storage/settingsStore.ts';
import { DEFAULT_SETTINGS } from '../../src/services/storage/schema.ts';

class FakeBackend implements StorageBackend {
  private map = new Map<string, string>();
  getString(key: string): string | undefined {
    return this.map.get(key);
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
  get(key: string): string | undefined {
    return this.map.get(key);
  }
}

let backend: FakeBackend;

beforeEach(() => {
  backend = new FakeBackend();
  storage.setStorageBackendForTests(backend);
});

afterEach(() => {
  storage.setStorageBackendForTests(null);
});

test('parseBest: undefined raw is a valid (never-played) read', () => {
  assert.deepStrictEqual(storage.parseBest(undefined), { best: 0, ok: true });
});

test('parseBest: a positive integer parses ok', () => {
  assert.deepStrictEqual(storage.parseBest('123'), { best: 123, ok: true });
  assert.deepStrictEqual(storage.parseBest(' 45 '), { best: 45, ok: true });
});

test('parseBest: non-numeric content degrades (ok=false)', () => {
  assert.deepStrictEqual(storage.parseBest('abc'), { best: 0, ok: false });
  assert.deepStrictEqual(storage.parseBest('1.5'), { best: 0, ok: false });
  assert.deepStrictEqual(storage.parseBest(''), { best: 0, ok: false });
});

test('parseBest: zero and negative values degrade (ok=false)', () => {
  assert.deepStrictEqual(storage.parseBest('0'), { best: 0, ok: false });
  assert.deepStrictEqual(storage.parseBest('-1'), { best: 0, ok: false });
});

test('loadBest: missing key reads as a fresh 0 with ok=true', async () => {
  const res = await storage.loadBest();
  assert.deepStrictEqual(res, { best: 0, ok: true });
});

test('loadBest: reads and validates a persisted best', async () => {
  backend.set(storage.STORAGE_KEYS.best, '999');
  assert.deepStrictEqual(await storage.loadBest(), { best: 999, ok: true });
});

test('loadBest: a corrupt persisted value degrades (ok=false)', async () => {
  backend.set(storage.STORAGE_KEYS.best, 'not-a-number');
  assert.deepStrictEqual(await storage.loadBest(), { best: 0, ok: false });
});

test('saveBest: persists the stringified best and reports success', async () => {
  const ok = await storage.saveBest(500);
  assert.strictEqual(ok, true);
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.best), '500');
});

test('saveBest: a failing backend does not throw and returns false', async () => {
  const failing: StorageBackend = {
    getString: () => undefined,
    set: () => {
      throw new Error('disk full');
    }
  };
  storage.setStorageBackendForTests(failing);
  const ok = await storage.saveBest(10);
  assert.strictEqual(ok, false);
});

test('loadBest/saveBest round-trip through the backend', async () => {
  await storage.saveBest(2048);
  assert.deepStrictEqual(await storage.loadBest(), { best: 2048, ok: true });
});

test('loadSettingsFromStorage: no keys returns DEFAULT_SETTINGS', async () => {
  const settings = await storage.loadSettingsFromStorage();
  assert.deepStrictEqual(settings, { ...DEFAULT_SETTINGS });
});

test('loadSettingsFromStorage: merges persisted fields over defaults', async () => {
  backend.set(storage.STORAGE_KEYS.theme, JSON.stringify('midnight'));
  backend.set(storage.STORAGE_KEYS.reducedMotion, JSON.stringify(true));
  const settings = await storage.loadSettingsFromStorage();
  assert.strictEqual(settings.theme, 'midnight');
  assert.strictEqual(settings.reducedMotion, true);
  assert.strictEqual(settings.language, DEFAULT_SETTINGS.language);
});

test('loadSettingsFromStorage: corrupt JSON for a field falls back to default', async () => {
  backend.set(storage.STORAGE_KEYS.theme, '{not json');
  const settings = await storage.loadSettingsFromStorage();
  assert.strictEqual(settings.theme, DEFAULT_SETTINGS.theme);
});

test('saveSettings: writes each field as JSON under its key', async () => {
  const settings = { ...DEFAULT_SETTINGS, theme: 'midnight' as const, reducedMotion: true };
  await storage.saveSettings(settings);
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.theme), JSON.stringify('midnight'));
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.reducedMotion), JSON.stringify(true));
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.language), JSON.stringify(DEFAULT_SETTINGS.language));
});

test('saveSettings: a partially failing backend still writes the rest', async () => {
  const written = new Map<string, string>();
  const partial: StorageBackend = {
    getString: () => undefined,
    set: (key, value) => {
      if (key === storage.STORAGE_KEYS.theme) throw new Error('write blocked');
      written.set(key, value);
    }
  };
  storage.setStorageBackendForTests(partial);
  await storage.saveSettings({ ...DEFAULT_SETTINGS, reducedMotion: true });
  // theme write threw but the remaining keys were still persisted
  assert.strictEqual(written.has(storage.STORAGE_KEYS.theme), false, 'theme write should have failed');
  assert.strictEqual(written.get(storage.STORAGE_KEYS.reducedMotion), 'true');
  assert.strictEqual(written.get(storage.STORAGE_KEYS.language), JSON.stringify(DEFAULT_SETTINGS.language));
  assert.strictEqual(written.get(storage.STORAGE_KEYS.laneDefault), JSON.stringify(DEFAULT_SETTINGS.laneDefault));
});

test('load: combines best and settings', async () => {
  backend.set(storage.STORAGE_KEYS.best, '777');
  const state = await storage.load();
  assert.strictEqual(state.best, 777);
  assert.deepStrictEqual(state.settings, { ...DEFAULT_SETTINGS });
});

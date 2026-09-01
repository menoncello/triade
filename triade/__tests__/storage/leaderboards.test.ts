import { test, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import * as storage from '../../src/services/storage/settingsStore.ts';
import type { StorageBackend } from '../../src/services/storage/settingsStore.ts';

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
  raw(): Map<string, string> {
    return this.map;
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

test('3.4 isolation: saveBestForLane clean never touches assisted', async () => {
  await storage.saveBestForLane('clean', 300);
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.bestClean), '300');
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.bestAssisted), undefined);
  const assisted = await storage.loadBestForLane('accelerated');
  assert.deepStrictEqual(assisted, { best: 0, ok: true });
  const clean = await storage.loadBestForLane('clean');
  assert.deepStrictEqual(clean, { best: 300, ok: true });
});

test('3.4 isolation: saveBestForLane assisted never touches clean', async () => {
  await storage.saveBestForLane('accelerated', 500);
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.bestAssisted), '500');
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.bestClean), undefined);
});

test('3.4 loadAllBests reflects per-lane values', async () => {
  await storage.saveBestForLane('clean', 111);
  await storage.saveBestForLane('accelerated', 222);
  const all = await storage.loadAllBests();
  assert.deepStrictEqual(all.clean, { best: 111, ok: true });
  assert.deepStrictEqual(all.accelerated, { best: 222, ok: true });
});

test('3.4 corrupted clean does not contaminate assisted', async () => {
  backend.set(storage.STORAGE_KEYS.bestClean, 'abc');
  backend.set(storage.STORAGE_KEYS.bestAssisted, '400');
  const clean = await storage.loadBestForLane('clean');
  const assisted = await storage.loadBestForLane('accelerated');
  assert.deepStrictEqual(clean, { best: 0, ok: false });
  assert.deepStrictEqual(assisted, { best: 400, ok: true });
});

test('3.4 degrade ok:false for corrupted value', async () => {
  backend.set(storage.STORAGE_KEYS.bestClean, '-5');
  assert.deepStrictEqual(await storage.loadBestForLane('clean'), { best: 0, ok: false });
  backend.set(storage.STORAGE_KEYS.bestClean, '0');
  assert.deepStrictEqual(await storage.loadBestForLane('clean'), { best: 0, ok: false });
});

test('3.4 migrateLegacyBest copies legacy to laneDefault when per-lane empty', async () => {
  backend.set(storage.STORAGE_KEYS.best, '777');
  const migrated = await storage.migrateLegacyBest(0);
  assert.strictEqual(migrated, true);
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.bestClean), '777');
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.bestAssisted), undefined);
});

test('3.4 migrateLegacyBest with laneDefault 1 copies to assisted', async () => {
  backend.set(storage.STORAGE_KEYS.best, '999');
  const migrated = await storage.migrateLegacyBest(1);
  assert.strictEqual(migrated, true);
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.bestAssisted), '999');
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.bestClean), undefined);
});

test('3.4 migrateLegacyBest does nothing when per-lane already present', async () => {
  backend.set(storage.STORAGE_KEYS.bestClean, '100');
  backend.set(storage.STORAGE_KEYS.best, '777');
  const migrated = await storage.migrateLegacyBest(0);
  assert.strictEqual(migrated, false);
  assert.strictEqual(backend.get(storage.STORAGE_KEYS.bestClean), '100');
});

test('3.4 migrateLegacyBest does nothing when legacy invalid', async () => {
  backend.set(storage.STORAGE_KEYS.best, 'not-a-number');
  const migrated = await storage.migrateLegacyBest(0);
  assert.strictEqual(migrated, false);
});

test('3.4 STORAGE_KEYS bestClean/bestAssisted never contain budget tokens', async () => {
  const keys = storage.STORAGE_KEYS;
  assert.ok(keys.bestClean && keys.bestClean.length > 0, 'bestClean must exist');
  assert.ok(keys.bestAssisted && keys.bestAssisted.length > 0, 'bestAssisted must exist');
  assert.ok(String(keys.bestClean) !== String(keys.bestAssisted), 'per-lane keys must differ');
  for (const token of ['freeundo', 'budget', 'undo', 'hint']) {
    assert.ok(!keys.bestClean.toLowerCase().includes(token), `bestClean contains forbidden token ${token}`);
    assert.ok(!keys.bestAssisted.toLowerCase().includes(token), `bestAssisted contains forbidden token ${token}`);
  }
});

test('3.4 bestKeyForLane routes correctly and never uses budget string', async () => {
  assert.strictEqual(storage.bestKeyForLane('clean'), storage.STORAGE_KEYS.bestClean);
  assert.strictEqual(storage.bestKeyForLane('accelerated'), storage.STORAGE_KEYS.bestAssisted);
  assert.strictEqual(storage.bestKeyForLane('bogus' as any), storage.STORAGE_KEYS.bestClean);
});

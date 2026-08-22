import type { StorageBackend } from '../../src/services/storage/settingsStore.ts';

export interface MemoryStorage extends StorageBackend {
  dump(): Record<string, string>;
}

export function createMemoryStorage(initial: Record<string, string> = {}): MemoryStorage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getString: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
    dump: () => Object.fromEntries(map)
  };
}

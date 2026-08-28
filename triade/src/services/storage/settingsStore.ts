import { DEFAULT_SETTINGS, loadSettings } from './schema.ts';
import type { Settings } from './schema.ts';

export const STORAGE_KEYS = {
  best: '@triade/best',
  bestClean: '@triade/best:clean',
  bestAssisted: '@triade/best:assisted',
  theme: '@triade/theme',
  reducedMotion: '@triade/reducedMotion',
  language: '@triade/language',
  laneDefault: '@triade/laneDefault'
} as const;

export type LaneId = 'clean' | 'accelerated';
export type LeaderboardId = 'clean' | 'assisted';

export interface HydratedState {
  best: number;
  settings: Settings;
}

export interface HydratedStateByLane {
  bestByLane: Record<LaneId, number>;
  okByLane: Record<LaneId, boolean>;
  settings: Settings;
}

// Storage backend contract. In production this is backed by MMKV (see `mmkv()`);
// tests inject a fake via `setStorageBackendForTests` so the persistence logic
// can be exercised under `node:test` without the native module.
export interface StorageBackend {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
}

export interface BestLoadResult {
  best: number;
  ok: boolean;
}

// Injected backend for tests; when set, `mmkv()` returns it directly and the
// native `react-native-mmkv` module is never imported. TEST-ONLY hook — never
// call from app code: replacing the backend here silently swaps MMKV for
// whatever is injected and discards any in-flight native init (`storePromise`).
let backendOverride: StorageBackend | null = null;

// MMKV is synchronous and single-instance — resolve + create it once and reuse.
// The module-level promise survives the module's lifetime in the app; tests
// exercise the native path only through the injected backend above.
// On rejection the cached promise is reset so the next call retries (one bad
// init must not brick persistence for the process).
let storePromise: Promise<StorageBackend> | null = null;

export function setStorageBackendForTests(backend: StorageBackend | null): void {
  backendOverride = backend;
  storePromise = null;
}

async function mmkv(): Promise<StorageBackend> {
  if (backendOverride) return backendOverride;
  if (!storePromise) {
    storePromise = (async () => {
      const mod = (await import('react-native-mmkv')) as typeof import('react-native-mmkv');
      return mod.createMMKV({ id: '@triade' });
    })().catch((err) => {
      storePromise = null;
      throw err;
    });
  }
  return storePromise;
}

// Pure parser for the persisted best score. Separated so the validation rules
// (non-negative integer, no leading junk) are unit-testable without a backend.
export function parseBest(raw: string | undefined): BestLoadResult {
  if (raw === undefined) return { best: 0, ok: true };
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return { best: 0, ok: false };
  const value = Number(trimmed);
  if (Number.isSafeInteger(value) && value > 0) return { best: value, ok: true };
  return { best: 0, ok: false };
}

// Lane-scoped key routing — the ONLY mapping from lane to storage key (Lane Wall).
export function bestKeyForLane(laneId: LaneId): string {
  return laneId === 'accelerated' ? STORAGE_KEYS.bestAssisted : STORAGE_KEYS.bestClean;
}

export function bestKeyForLeaderboard(leaderboard: LeaderboardId): string {
  return leaderboard === 'assisted' ? STORAGE_KEYS.bestAssisted : STORAGE_KEYS.bestClean;
}

// ok=false means the read degraded (native failure or unparseable stored value):
// the caller must NOT persist during the session, or a new score would overwrite
// the real record with a smaller one. undefined (never played) is a valid read.
export async function loadBest(): Promise<BestLoadResult> {
  try {
    const store = await mmkv();
    return parseBest(store.getString(STORAGE_KEYS.best));
  } catch {
    return { best: 0, ok: false };
  }
}

export async function saveBest(best: number): Promise<boolean> {
  try {
    const store = await mmkv();
    store.set(STORAGE_KEYS.best, String(best));
    return true;
  } catch (err) {
    console.error('[storage] saveBest failed:', err);
    return false;
  }
}

export async function loadBestForLane(laneId: LaneId): Promise<BestLoadResult> {
  try {
    const store = await mmkv();
    return parseBest(store.getString(bestKeyForLane(laneId)));
  } catch {
    return { best: 0, ok: false };
  }
}

export async function saveBestForLane(laneId: LaneId, best: number): Promise<boolean> {
  try {
    const store = await mmkv();
    store.set(bestKeyForLane(laneId), String(best));
    return true;
  } catch (err) {
    console.error('[storage] saveBestForLane failed:', err);
    return false;
  }
}

export async function loadAllBests(): Promise<Record<LaneId, BestLoadResult>> {
  try {
    const store = await mmkv();
    return {
      clean: parseBest(store.getString(STORAGE_KEYS.bestClean)),
      accelerated: parseBest(store.getString(STORAGE_KEYS.bestAssisted)),
    };
  } catch {
    return { clean: { best: 0, ok: false }, accelerated: { best: 0, ok: false } };
  }
}

// Migration for legacy single-key installs: if no per-lane keys exist and legacy
// holds a valid best, seed the lane indicated by laneDefaultIndex (the user's
// preferred lane). Returns true when a migration write happened.
export async function migrateLegacyBest(laneDefaultIndex: number): Promise<boolean> {
  try {
    const store = await mmkv();
    const hasClean = store.getString(STORAGE_KEYS.bestClean) !== undefined;
    const hasAssisted = store.getString(STORAGE_KEYS.bestAssisted) !== undefined;
    if (hasClean || hasAssisted) return false;
    const legacy = parseBest(store.getString(STORAGE_KEYS.best));
    if (!legacy.ok || legacy.best === 0) return false;
    const targetLane: LaneId = laneDefaultIndex === 1 ? 'accelerated' : 'clean';
    store.set(bestKeyForLane(targetLane), String(legacy.best));
    return true;
  } catch {
    return false;
  }
}

function getField(store: { getString(key: string): string | undefined }, key: string): unknown {
  const raw = store.getString(key);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function loadSettingsFromStorage(): Promise<Settings> {
  try {
    const store = await mmkv();
    const theme = getField(store, STORAGE_KEYS.theme);
    const reducedMotion = getField(store, STORAGE_KEYS.reducedMotion);
    const language = getField(store, STORAGE_KEYS.language);
    const laneDefault = getField(store, STORAGE_KEYS.laneDefault);
    const partial = {
      ...(theme !== undefined ? { theme } : {}),
      ...(reducedMotion !== undefined ? { reducedMotion } : {}),
      ...(language !== undefined ? { language } : {}),
      ...(laneDefault !== undefined ? { laneDefault } : {})
    };
    return loadSettings(JSON.stringify(partial));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  let store: StorageBackend;
  try {
    store = await mmkv();
  } catch (err) {
    console.error('[storage] saveSettings: mmkv init failed:', err);
    return;
  }
  // Per-key writes keep a single-field failure from silently dropping the rest
  // (a partial write is logged, never treated as a full save).
  const writes: Array<[string, string]> = [
    [STORAGE_KEYS.theme, JSON.stringify(settings.theme)],
    [STORAGE_KEYS.reducedMotion, JSON.stringify(settings.reducedMotion)],
    [STORAGE_KEYS.language, JSON.stringify(settings.language)],
    [STORAGE_KEYS.laneDefault, JSON.stringify(settings.laneDefault)]
  ];
  for (const [key, value] of writes) {
    try {
      store.set(key, value);
    } catch (err) {
      console.error(`[storage] saveSettings: failed to write ${key}:`, err);
    }
  }
}

export async function load(): Promise<HydratedState> {
  const [bestResult, settings] = await Promise.all([loadBest(), loadSettingsFromStorage()]);
  return { best: bestResult.best, settings };
}

export async function loadByLane(): Promise<HydratedStateByLane> {
  const [byLane, settings] = await Promise.all([loadAllBests(), loadSettingsFromStorage()]);
  return {
    bestByLane: { clean: byLane.clean.best, accelerated: byLane.accelerated.best },
    okByLane: { clean: byLane.clean.ok, accelerated: byLane.accelerated.ok },
    settings,
  };
}

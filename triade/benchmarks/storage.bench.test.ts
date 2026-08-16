import { test } from 'node:test';
import assert from 'node:assert';
import { performance } from 'node:perf_hooks';

// Red-phase ATDD contract: schema.ts will export the pure payload layer. The
// variable specifier keeps `tsc --noEmit` green until the developer activates
// this scaffold (red phase).
const SCHEMA_SPEC = '../src/services/storage/schema.ts';

// Story 1.4 T1.2: both storage adapters (AsyncStorage/MMKV) share this pure JS
// payload layer; the native startup/read differential is measured manually on the
// simulator. Budget keeps ~100x headroom over the baseline so the CI gate catches
// real regressions (e.g., an accidental O(n^2) sanitize loop) without flaking.
const BUDGET_SERIALIZE_ROUNDTRIP_MS = 0.1;
const TURNS = 10000;
const WARMUP = 1000;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface Settings {
  theme: string;
  reducedMotion: boolean;
  language: string;
  laneDefault: number;
}

test('[P1] benchmark: settings serializeSettings->loadSettings round-trip < 0.1ms median (CI-gated JS payload layer, T1.2)', async () => {
  const { serializeSettings, loadSettings, DEFAULT_SETTINGS } = (await import(SCHEMA_SPEC)) as {
    serializeSettings: (s: Settings) => string;
    loadSettings: (raw: string) => Settings;
    DEFAULT_SETTINGS: Settings;
  };

  // Realistic S1.4 persisted settings built from DEFAULT_SETTINGS (theme,
  // reducedMotion, language, laneDefault). Best score is a separate STORAGE_KEYS
  // entry handled by saveBest(), not part of the Settings schema. Deterministic —
  // pure function, no RNG needed.
  const SETTINGS_SAMPLE = {
    ...DEFAULT_SETTINGS,
    theme: 'light',
    reducedMotion: true,
    language: 'pt-BR',
    laneDefault: 1
  };

  for (let i = 0; i < WARMUP; i++) {
    loadSettings(serializeSettings(SETTINGS_SAMPLE));
  }

  const samples: number[] = [];
  for (let i = 0; i < TURNS; i++) {
    const start = performance.now();
    const raw = serializeSettings(SETTINGS_SAMPLE);
    loadSettings(raw);
    samples.push(performance.now() - start);
  }
  const roundTripMs = median(samples);

  assert.ok(
    roundTripMs < BUDGET_SERIALIZE_ROUNDTRIP_MS,
    `settings serialize->load round-trip median ${roundTripMs.toFixed(4)}ms >= budget ${BUDGET_SERIALIZE_ROUNDTRIP_MS}ms`
  );
});

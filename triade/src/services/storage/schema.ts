export interface Settings {
  theme: string;
  reducedMotion: boolean;
  language: string;
  laneDefault: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  reducedMotion: false,
  language: 'en',
  laneDefault: 0
};

// Lane count is a game domain constant (Clean / Accelerated); laneDefault is an
// index into the lane list. Kept local so schema.ts stays pure and host-testable
// (boundary rule 8) — no engine import.
const LANE_COUNT = 2;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidLaneIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < LANE_COUNT;
}

export function loadSettings(raw: string): Settings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (!isObject(parsed)) {
    return { ...DEFAULT_SETTINGS };
  }
  return {
    theme: typeof parsed.theme === 'string' ? parsed.theme : DEFAULT_SETTINGS.theme,
    reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    language: typeof parsed.language === 'string' ? parsed.language : DEFAULT_SETTINGS.language,
    laneDefault: isValidLaneIndex(parsed.laneDefault) ? parsed.laneDefault : DEFAULT_SETTINGS.laneDefault
  };
}

export function serializeSettings(settings: Settings): string {
  return JSON.stringify(settings);
}

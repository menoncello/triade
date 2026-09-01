export interface TutorialCompleted {
  clean: boolean;
  accelerated: boolean;
}

export type SupportedLanguage = 'pt' | 'en';

export interface Settings {
  theme: string;
  reducedMotion: boolean;
  language: string;
  laneDefault: number;
  tutorialCompleted: TutorialCompleted;
  hasSeenToneScreen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  reducedMotion: false,
  language: 'en',
  laneDefault: 0,
  tutorialCompleted: { clean: false, accelerated: false },
  hasSeenToneScreen: false
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

function parseTutorialCompleted(value: unknown): TutorialCompleted {
  if (!isObject(value)) return { ...DEFAULT_SETTINGS.tutorialCompleted };
  return {
    clean: typeof value.clean === 'boolean' ? value.clean : DEFAULT_SETTINGS.tutorialCompleted.clean,
    accelerated: typeof value.accelerated === 'boolean' ? value.accelerated : DEFAULT_SETTINGS.tutorialCompleted.accelerated
  };
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
    language: typeof (parsed as Record<string, unknown>).language === 'string' ? ((parsed as Record<string, unknown>).language as string) : DEFAULT_SETTINGS.language,
    laneDefault: isValidLaneIndex(parsed.laneDefault) ? parsed.laneDefault : DEFAULT_SETTINGS.laneDefault,
    tutorialCompleted: parseTutorialCompleted((parsed as Record<string, unknown>).tutorialCompleted),
    hasSeenToneScreen:
      typeof (parsed as Record<string, unknown>).hasSeenToneScreen === 'boolean'
        ? ((parsed as Record<string, unknown>).hasSeenToneScreen as boolean)
        : DEFAULT_SETTINGS.hasSeenToneScreen
  };
}

export function serializeSettings(settings: Settings): string {
  return JSON.stringify(settings);
}

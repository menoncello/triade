export const TEST_IDS = {
  android: {
    appId: 'ca-app-pub-3940256099942544~3347511713',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    appId: 'ca-app-pub-3940256099942544~1458002511',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
} as const;

function envOverride(): string | undefined {
  try {
    // Expo exposes EXPO_PUBLIC_ vars at runtime; guard for node test env
    const v = (globalThis as unknown as { process?: { env?: Record<string, string> } })?.process?.env?.EXPO_PUBLIC_ADMOB_REWARDED_UNDO;
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  } catch {
    // ignore
  }
  return undefined;
}

export const REWARDED_AD_UNIT_ID_UNDO: string = envOverride() ?? TEST_IDS.ios.rewarded;

export function rewardedUndoUnitId(): string {
  return REWARDED_AD_UNIT_ID_UNDO;
}

function envOverrideContinue(): string | undefined {
  try {
    const v = (globalThis as unknown as { process?: { env?: Record<string, string> } })?.process?.env?.EXPO_PUBLIC_ADMOB_REWARDED_CONTINUE;
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  } catch {
    // ignore
  }
  return undefined;
}

export const REWARDED_AD_UNIT_ID_CONTINUE: string = envOverrideContinue() ?? REWARDED_AD_UNIT_ID_UNDO;

export function rewardedContinueUnitId(): string {
  return REWARDED_AD_UNIT_ID_CONTINUE;
}

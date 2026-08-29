export const ENTITLEMENT_HINT_5 = 'triade_hint_5' as const;
export const ENTITLEMENT_UNDO_3 = 'triade_undo_3' as const;
export const ENTITLEMENT_NO_ADS = 'triade_no_ads' as const;

function envOverrideHint(): string | undefined {
  try {
    const v = (globalThis as unknown as { process?: { env?: Record<string, string> } })?.process?.env?.EXPO_PUBLIC_PURCHASES_HINT_5;
    if (typeof v === 'string' && v.trim().length > 0) {
      const trimmed = v.trim();
      if (/^[a-zA-Z0-9_.\-]+$/.test(trimmed) && trimmed.length <= 100) return trimmed;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function envOverrideUndo3(): string | undefined {
  try {
    const v = (globalThis as unknown as { process?: { env?: Record<string, string> } })?.process?.env?.EXPO_PUBLIC_PURCHASES_UNDO_3;
    if (typeof v === 'string' && v.trim().length > 0) {
      const trimmed = v.trim();
      if (/^[a-zA-Z0-9_.\-]+$/.test(trimmed) && trimmed.length <= 100) return trimmed;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function envOverrideNoAds(): string | undefined {
  try {
    const v = (globalThis as unknown as { process?: { env?: Record<string, string> } })?.process?.env?.EXPO_PUBLIC_PURCHASES_NO_ADS;
    if (typeof v === 'string' && v.trim().length > 0) {
      const trimmed = v.trim();
      if (/^[a-zA-Z0-9_.\-]+$/.test(trimmed) && trimmed.length <= 100) return trimmed;
    }
  } catch {
    // ignore
  }
  return undefined;
}

export const HINT_5_PACK_PRODUCT_ID: string = envOverrideHint() ?? 'triade_hint_5_pack';
export const UNDO_3_PACK_PRODUCT_ID: string = envOverrideUndo3() ?? 'triade_undo_3_pack';
export const NO_ADS_UNLIMITED_PRODUCT_ID: string = envOverrideNoAds() ?? 'triade_no_ads_unlimited';

export function hintPackProductId(): string {
  return HINT_5_PACK_PRODUCT_ID;
}

export function undoPackProductId(): string {
  return UNDO_3_PACK_PRODUCT_ID;
}

export function noAdsProductId(): string {
  return NO_ADS_UNLIMITED_PRODUCT_ID;
}

export const TEST_PRODUCT_IDS = {
  hint5Pack: 'triade_hint_5_pack',
  undo3Pack: 'triade_undo_3_pack',
  noAds: 'triade_no_ads_unlimited',
} as const;

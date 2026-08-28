export const ENTITLEMENT_HINT_5 = 'triade_hint_5' as const;

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

export const HINT_5_PACK_PRODUCT_ID: string = envOverrideHint() ?? 'triade_hint_5_pack';

export function hintPackProductId(): string {
  return HINT_5_PACK_PRODUCT_ID;
}

export const TEST_PRODUCT_IDS = {
  hint5Pack: 'triade_hint_5_pack',
} as const;

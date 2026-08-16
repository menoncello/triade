export type Entitlements = Record<string, boolean>;

export const ENTITLEMENTS_KEY = '@triade/entitlements';

async function secureStore() {
  return (await import('expo-secure-store')) as typeof import('expo-secure-store');
}

export async function getEntitlements(): Promise<Entitlements> {
  try {
    const store = await secureStore();
    const raw = await store.getItemAsync(ENTITLEMENTS_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const result: Entitlements = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'boolean') result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export async function setEntitlements(entitlements: Entitlements): Promise<void> {
  try {
    const store = await secureStore();
    await store.setItemAsync(ENTITLEMENTS_KEY, JSON.stringify(entitlements));
  } catch (err) {
    console.error('[storage] setEntitlements failed:', err);
  }
}

export async function deleteAll(): Promise<void> {
  try {
    const store = await secureStore();
    await store.deleteItemAsync(ENTITLEMENTS_KEY);
  } catch (err) {
    console.error('[storage] deleteAll failed:', err);
  }
}

export function mergeEntitlements(offline: Entitlements, remote: Entitlements): Entitlements {
  const merged: Entitlements = {};
  for (const [key, value] of Object.entries(remote)) {
    if (typeof value === 'boolean') merged[key] = value;
  }
  for (const [key, held] of Object.entries(offline)) {
    if (held) merged[key] = true;
  }
  return merged;
}

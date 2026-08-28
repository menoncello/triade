import { HINT_5_PACK_PRODUCT_ID, ENTITLEMENT_HINT_5 } from './purchaseConfig.ts';
import { getEntitlements, setEntitlements, mergeEntitlements } from '../storage/entitlements.ts';
import type { Entitlements } from '../storage/entitlements.ts';

export type PurchasesResult = { granted: boolean; error?: string };

export type PurchasesGateway = {
  purchaseHintPack(): Promise<PurchasesResult>;
  restorePurchases(): Promise<{ entitlements: Entitlements }>;
};

let busy = false;

export function createPurchasesGateway(): PurchasesGateway {
  return {
    async purchaseHintPack(): Promise<PurchasesResult> {
      if (busy) return { granted: false, error: 'busy' };
      busy = true;
      try {
        let Purchases: unknown;
        try {
          // @ts-ignore — optional native module, not installed in CI host
          const mod = await import('react-native-purchases');
          Purchases = (mod as Record<string, unknown>).default ?? (mod as Record<string, unknown>).Purchases ?? mod;
        } catch (e) {
          console.warn('[purchases] purchaseHintPack import failed:', String((e as Error)?.message ?? e));
          return { granted: false, error: String((e as Error)?.message ?? e) };
        }
        const purchasesObj = Purchases as Record<string, unknown>;
        // Check if SDK has purchase method
        const hasPurchaseStoreProduct = typeof purchasesObj.purchaseStoreProduct === 'function';
        const hasPurchasePackage = typeof purchasesObj.purchasePackage === 'function';
        const hasGetOfferings = typeof purchasesObj.getOfferings === 'function';
        if (!hasPurchaseStoreProduct && !hasPurchasePackage) {
          console.warn('[purchases] purchaseHintPack unavailable: no purchase method');
          return { granted: false, error: 'Purchases API unavailable' };
        }
        try {
          if (hasPurchaseStoreProduct) {
            await (purchasesObj.purchaseStoreProduct as (id: string) => Promise<unknown>)(HINT_5_PACK_PRODUCT_ID);
          } else if (hasGetOfferings && hasPurchasePackage) {
            // Fallback via offerings if store product not available
            const offerings = await (purchasesObj.getOfferings as () => Promise<{ current?: { availablePackages?: Array<{ product: { identifier: string } }> } }> )();
            const pkg = offerings?.current?.availablePackages?.find((p) => p.product.identifier === HINT_5_PACK_PRODUCT_ID);
            if (pkg) {
              await (purchasesObj.purchasePackage as (pkg: unknown) => Promise<unknown>)(pkg);
            } else {
              console.warn('[purchases] purchaseHintPack package not found for', HINT_5_PACK_PRODUCT_ID);
              return { granted: false, error: 'package not found' };
            }
          } else {
            return { granted: false, error: 'Purchases API unavailable' };
          }
        } catch (e) {
          console.warn('[purchases] purchaseHintPack failed:', String((e as Error)?.message ?? e));
          return { granted: false, error: String((e as Error)?.message ?? e) };
        }
        // On success, mirror entitlement in SecureStore (authoritative offline)
        try {
          const offline = await getEntitlements();
          const remote: Entitlements = { [ENTITLEMENT_HINT_5]: true };
          const merged = mergeEntitlements(offline, remote);
          // Ensure hint_5 is true
          merged[ENTITLEMENT_HINT_5] = true;
          await setEntitlements(merged);
          // Verify persistence — if merge lost the entitlement, treat as not granted
          const verify = await getEntitlements();
          if (!verify[ENTITLEMENT_HINT_5]) {
            console.warn('[purchases] entitlement verify failed after set');
            return { granted: false, error: 'persist_failed' };
          }
        } catch (e) {
          console.warn('[purchases] setEntitlements failed:', String((e as Error)?.message ?? e));
          return { granted: false, error: 'persist_failed' };
        }
        return { granted: true };
      } catch (e) {
        console.warn('[purchases] purchaseHintPack unexpected error:', String((e as Error)?.message ?? e));
        return { granted: false, error: String((e as Error)?.message ?? e) };
      } finally {
        busy = false;
      }
    },

    async restorePurchases(): Promise<{ entitlements: Entitlements }> {
      try {
        let Purchases: unknown;
        try {
          // @ts-ignore — optional native module
          const mod = await import('react-native-purchases');
          Purchases = (mod as Record<string, unknown>).default ?? (mod as Record<string, unknown>).Purchases ?? mod;
        } catch (e) {
          console.warn('[purchases] restore import failed:', String((e as Error)?.message ?? e));
          const offline = await getEntitlements();
          return { entitlements: offline };
        }
        const purchasesObj = Purchases as Record<string, unknown>;
        if (typeof purchasesObj.restorePurchases !== 'function' && typeof purchasesObj.restoreTransactions !== 'function') {
          const offline = await getEntitlements();
          return { entitlements: offline };
        }
        try {
          let customerInfo: unknown = null;
          if (typeof purchasesObj.restorePurchases === 'function') {
            customerInfo = await (purchasesObj.restorePurchases as () => Promise<unknown>)();
          } else if (typeof purchasesObj.restoreTransactions === 'function') {
            customerInfo = await (purchasesObj.restoreTransactions as () => Promise<unknown>)();
          }
          const active = (customerInfo as { entitlements?: { active?: Record<string, unknown> } } | null)?.entitlements?.active ?? {};
          const remote: Entitlements = {};
          for (const key of Object.keys(active)) {
            remote[key] = true;
          }
          const offline = await getEntitlements();
          const merged = mergeEntitlements(offline, remote);
          await setEntitlements(merged);
          return { entitlements: merged };
        } catch (e) {
          console.warn('[purchases] restore failed:', String((e as Error)?.message ?? e));
          const offline = await getEntitlements();
          return { entitlements: offline };
        }
      } catch (e) {
        console.warn('[purchases] restore unexpected error:', String((e as Error)?.message ?? e));
        const offline = await getEntitlements();
        return { entitlements: offline };
      }
    },
  };
}

export function __resetPurchasesForTests(): void {
  busy = false;
}

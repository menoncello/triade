import { rewardedUndoUnitId } from './adsConfig.ts';

export type RewardedAdResult = { granted: boolean; error?: string };

export type RewardedAdGateway = {
  loadAndShow(): Promise<RewardedAdResult>;
};

let busy = false;

export function createRewardedAdGateway(adUnitId?: string): RewardedAdGateway {
  const unitId = adUnitId ?? rewardedUndoUnitId();
  return {
    async loadAndShow(): Promise<RewardedAdResult> {
      if (busy) return { granted: false, error: 'busy' };
      busy = true;
      try {
        let RewardedAd: unknown;
        let RewardedAdEventType: unknown;
        // Dynamic import so tests / environments without native module do not crash at import time
        try {
          // @ts-ignore — optional native module, not installed in CI host
          const mod = await import('react-native-google-mobile-ads');
          RewardedAd = (mod as Record<string, unknown>).RewardedAd;
          RewardedAdEventType = (mod as Record<string, unknown>).RewardedAdEventType;
        } catch (e) {
          return { granted: false, error: String((e as Error)?.message ?? e) };
        }
        if (typeof RewardedAd !== 'function' && typeof RewardedAd !== 'object') {
          return { granted: false, error: 'RewardedAd unavailable' };
        }
        const rewardedAdClass = RewardedAd as {
          createForAdRequest: (id: string) => {
            load: () => void;
            show: () => Promise<void>;
            addAdEventListener: (type: unknown, cb: (payload?: unknown) => void) => () => void;
          };
        };
        const eventType = RewardedAdEventType as { LOADED: unknown; EARNED_REWARD: unknown; CLOSED: unknown; ERROR: unknown };
        // Guard if API shape unexpected
        if (!rewardedAdClass?.createForAdRequest || eventType?.LOADED === undefined) {
          return { granted: false, error: 'RewardedAd API unexpected' };
        }

        return await new Promise<RewardedAdResult>((resolve) => {
          let settled = false;
          const finish = (r: RewardedAdResult) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(r);
          };
          const timeout = setTimeout(() => finish({ granted: false, error: 'timeout' }), 8000);
          const subs: Array<() => void> = [];
          const cleanup = () => {
            clearTimeout(timeout);
            subs.forEach((unsub) => {
              try {
                unsub();
              } catch {
                // ignore
              }
            });
          };
          let ad: ReturnType<typeof rewardedAdClass.createForAdRequest>;
          try {
            ad = rewardedAdClass.createForAdRequest(unitId);
          } catch (e) {
            finish({ granted: false, error: String((e as Error)?.message ?? e) });
            return;
          }
          let rewardEarned = false;

          subs.push(ad.addAdEventListener(eventType.EARNED_REWARD, () => { rewardEarned = true; }));
          subs.push(
            ad.addAdEventListener(eventType.CLOSED, () => {
              finish({ granted: rewardEarned });
            }),
          );
          subs.push(
            ad.addAdEventListener(eventType.ERROR, (err?: unknown) => {
              const msg = (err as { message?: string })?.message ?? String(err ?? 'ad error');
              finish({ granted: false, error: msg });
            }),
          );
          subs.push(
            ad.addAdEventListener(eventType.LOADED, () => {
              try {
                void ad.show().catch((e: unknown) => finish({ granted: false, error: String((e as Error)?.message ?? e) }));
              } catch (e) {
                finish({ granted: false, error: String((e as Error)?.message ?? e) });
              }
            }),
          );

          try {
            ad.load();
          } catch (e) {
            finish({ granted: false, error: String((e as Error)?.message ?? e) });
          }
        });
      } catch (e) {
        return { granted: false, error: String((e as Error)?.message ?? e) };
      } finally {
        busy = false;
      }
    },
  };
}

// Test helper — reset busy gate between tests
export function __resetRewardedAdsBusy(): void {
  busy = false;
}

// Also export a singleton convenience for App.tsx default usage
export function showRewardedUndoAd(adUnitId?: string): Promise<RewardedAdResult> {
  return createRewardedAdGateway(adUnitId).loadAndShow();
}

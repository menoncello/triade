export const assetManifest = {
  icon: (): number => require('../../../assets/icon.png'),
  splash: (): number => require('../../../assets/splash-icon.png'),
  favicon: (): number => require('../../../assets/favicon.png'),
  // S8.6 SFX placeholders — cálido thock (merge/spawn/game-over), no music.
  // Files under assets/sfx/ are optional in MVP; preload degrades gracefully when absent.
  'sfx-merge': (): number | null => {
    try {
      return require('../../../assets/sfx/merge.wav');
    } catch {
      return null;
    }
  },
  'sfx-spawn': (): number | null => {
    try {
      return require('../../../assets/sfx/spawn.wav');
    } catch {
      return null;
    }
  },
  'sfx-gameover': (): number | null => {
    try {
      return require('../../../assets/sfx/gameover.wav');
    } catch {
      return null;
    }
  },
} as const;

export type AssetName = keyof typeof assetManifest;

export async function preloadAssets(): Promise<void> {
  try {
    const { Asset } = await import('expo-asset');
    const resources = Object.values(assetManifest)
      .map((resolve) => {
        try {
          return resolve() as unknown as number | null;
        } catch {
          return null;
        }
      })
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (resources.length === 0) return;
    await Asset.loadAsync(resources);
  } catch {
    // preload failure degrades to defaults — never blocks or crashes (NFR-3)
  }
}

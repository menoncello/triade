export const assetManifest = {
  icon: (): number => require('../../../assets/icon.png'),
  splash: (): number => require('../../../assets/splash-icon.png'),
  favicon: (): number => require('../../../assets/favicon.png')
} as const;

export type AssetName = keyof typeof assetManifest;

export async function preloadAssets(): Promise<void> {
  try {
    const { Asset } = await import('expo-asset');
    const resources = Object.values(assetManifest).map((resolve) => resolve());
    await Asset.loadAsync(resources);
  } catch {
    // preload failure degrades to defaults — never blocks or crashes (NFR-3)
  }
}

export type StatusBarStyle = 'auto' | 'dark';

export function statusBarStyle(isLandscape: boolean): StatusBarStyle {
  return isLandscape ? 'dark' : 'auto';
}

import { AccessibilityInfo } from 'react-native';
import { i18n } from '../i18n/index.ts';

const SCORE_THROTTLE_MS = 500;
let lastScoreAnnounceAt = 0;

function safeAnnounce(message: string): void {
  if (!message) return;
  try {
    const ai: any = AccessibilityInfo as any;
    if (ai.announceForAccessibilityWithOptions) {
      ai.announceForAccessibilityWithOptions(message, { queue: true });
    } else if (ai.announceForAccessibility) {
      ai.announceForAccessibility(message);
    }
  } catch {}
}

export function announce(message: string): void {
  safeAnnounce(message);
}

export function announceMove(dir: string): void {
  if (!dir) return;
  const msg = i18n.t('a11y.moved', { dir });
  safeAnnounce(msg);
}

export function announceMerge(a: number, b: number, c: number): void {
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return;
  const msg = i18n.t('a11y.merged', { a: String(a), b: String(b), c: String(c) });
  safeAnnounce(msg);
}

export function announceSpawn(value: number): void {
  if (!Number.isFinite(value)) return;
  const msg = i18n.t('a11y.spawn', { value: String(value) });
  safeAnnounce(msg);
}

export function announceScoreThrottled(score: number): void {
  if (!Number.isFinite(score)) return;
  const now = Date.now();
  if (now - lastScoreAnnounceAt < SCORE_THROTTLE_MS) return;
  lastScoreAnnounceAt = now;
  const msg = i18n.t('a11y.score', { score: String(score) });
  safeAnnounce(msg);
}

export function announceGameOver(score: number, best: number): void {
  const s = Number.isFinite(score) && score >= 0 ? score : 0;
  const b = Number.isFinite(best) && best >= 0 ? best : 0;
  const msg = i18n.t('a11y.gameOver', { score: String(s), best: String(b) });
  safeAnnounce(msg);
}

export function announceNewRecord(): void {
  const msg = i18n.t('a11y.newRecord');
  safeAnnounce(msg);
}

export function announcePreview(display: string): void {
  if (!display) return;
  const msg = i18n.t('a11y.preview', { display });
  safeAnnounce(msg);
}

export function announceBanner(text: string): void {
  if (!text) return;
  safeAnnounce(text);
}

export function resetScoreThrottleForTests(): void {
  lastScoreAnnounceAt = 0;
}

// Test hook: expose throttle window
export const __SCORE_THROTTLE_MS = SCORE_THROTTLE_MS;

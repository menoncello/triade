import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../i18n/index.ts';
import { HIT_TARGET } from './PauseButton';
import { SAFE_MARGIN } from './layout';

type LaneId = 'clean' | 'accelerated';

export interface GameOverOverlayProps {
  stats: { score: number; best: number; maxTile: number; merges: number; longestStreak: number };
  isNewRecord: boolean;
  onRestart: () => void;
  reducedMotion?: boolean;
  // T2 fix: insets is required (like Hud.tsx:15 `insets: EdgeInsets`) — App.tsx sempre passa `insets={insets}`.
  // Mantido fallback defensivo `insets?.top ?? 0` para chamadas `as any` / testes bare sem insets (gameOverOverlay.test.ts:252).
  insets: { top: number; bottom: number; left: number; right: number };
  // 3.2 Clean lane: no continue/ad/hint — activeLaneId gates any future continue slot.
  activeLaneId?: LaneId;
  // 3.3 Accelerated death-continue (discreet offer, once per game-over)
  canContinue?: boolean;
  onContinueAd?: () => void;
  onContinueIap?: () => void;
  onContinueCancel?: () => void;
}

export function GameOverOverlay({
  stats,
  isNewRecord,
  onRestart,
  reducedMotion,
  insets,
  activeLaneId,
  canContinue,
  onContinueAd,
  onContinueIap,
  onContinueCancel,
}: GameOverOverlayProps) {
  const { t } = useTranslation();
  const clampInset = (v: unknown): number => (Number.isFinite(v as number) && (v as number) >= 0 ? (v as number) : 0);
  const padTop = clampInset(insets?.top) + SAFE_MARGIN;
  const padBottom = clampInset(insets?.bottom) + SAFE_MARGIN;
  const padLeft = clampInset(insets?.left) + SAFE_MARGIN;
  const padRight = clampInset(insets?.right) + SAFE_MARGIN;
  // 3.2 Clean lane: no continue/ad/hint — see LaneProfile. Invalid → clean fallback.
  // activeLaneId is reserved for the future Accelerated continue slot (profile.canContinue); Clean stays single CTA.

  const a11yLabel =
    `Game over. Score ${stats.score}, best ${stats.best}, max tile ${stats.maxTile}, merges ${stats.merges}, longest streak ${stats.longestStreak}` +
    (isNewRecord ? ` ${t('gameOver.newRecord')}` : '');

  const scrimOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const contentOpacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const contentY = useRef(new Animated.Value(reducedMotion ? 0 : 12)).current;

  useEffect(() => {
    scrimOpacity.stopAnimation();
    contentOpacity.stopAnimation();
    contentY.stopAnimation();
    if (reducedMotion) {
      scrimOpacity.setValue(1);
      contentOpacity.setValue(1);
      contentY.setValue(0);
      return;
    }
    scrimOpacity.setValue(0);
    contentOpacity.setValue(0);
    contentY.setValue(12);
    const FADE_MS = 280;
    const anim = Animated.parallel([
      Animated.timing(scrimOpacity, { toValue: 1, duration: FADE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: FADE_MS, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(contentY, { toValue: 0, duration: FADE_MS, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    anim.start();
    return () => {
      anim.stop();
      scrimOpacity.stopAnimation();
      contentOpacity.stopAnimation();
      contentY.stopAnimation();
    };
  }, [reducedMotion, scrimOpacity, contentOpacity, contentY]);

  // D1 fix (a11y aninhada): outer overlay NÃO é `accessible` — bloqueia gestos via `pointerEvents="auto"`
  // e centra o card. Inner `View accessible alert` agrupa só as stats para anúncio; CTA `Pressable`
  // é irmão do alert, ficando alcançável no VoiceOver/TalkBack (antes pai accessible ocultava o botão).
  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity: scrimOpacity },
        { paddingTop: padTop, paddingBottom: padBottom, paddingLeft: padLeft, paddingRight: padRight },
      ]}
      pointerEvents="auto"
      accessibilityViewIsModal
    >
      <Animated.View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', opacity: contentOpacity, transform: [{ translateY: contentY }] }}>
        <View style={styles.content}>
          <View accessible accessibilityRole="alert" accessibilityLabel={a11yLabel}>
            <View style={styles.row}>
              <Text style={styles.label}>{t('gameOver.score')}</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={isNewRecord ? styles.valueRecord : styles.value}>{String(stats.score)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('gameOver.best')}</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={isNewRecord ? styles.valueRecord : styles.value}>{String(stats.best)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('gameOver.maxTile')}</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.value}>{String(stats.maxTile)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('gameOver.merges')}</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.value}>{String(stats.merges)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('gameOver.longestStreak')}</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.value}>{String(stats.longestStreak)}</Text>
            </View>
          </View>
          {/* AC5: Continue offer is Epic 3/4 — Clean shows only primary CTA here */}
          {/* 3.2 Clean lane: no continue/ad/hint — see LaneProfile */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('gameOver.restart')}
            onPress={onRestart}
            style={styles.cta}
          >
            <Text style={styles.ctaLabel}>{t('gameOver.restart')}</Text>
          </Pressable>
          {/* 3.3 Accelerated death-continue — discreet, once per game-over, ad first + IAP alternative + Cancel */}
          {activeLaneId === 'accelerated' && canContinue ? (
            <View style={styles.continueWrap} accessibilityLabel={t('gameOver.continueTitle')}>
              <Text style={styles.continueTitle}>{t('gameOver.continueTitle')}</Text>
              <View style={styles.continueRow}>
                <Pressable
                  onPress={onContinueAd}
                  style={styles.continueAd}
                  accessibilityRole="button"
                  accessibilityLabel={t('gameOver.continueAd')}
                >
                  <Text style={styles.continueAdLabel}>{t('gameOver.continueAd')}</Text>
                </Pressable>
                <Pressable
                  onPress={onContinueIap}
                  style={styles.continueIap}
                  accessibilityRole="button"
                  accessibilityLabel={t('gameOver.continueIap')}
                >
                  <Text style={styles.continueIapLabel}>{t('gameOver.continueIap')}</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={onContinueCancel}
                style={styles.continueCancel}
                accessibilityRole="button"
                accessibilityLabel={t('gameOver.cancel')}
              >
                <Text style={styles.continueCancelLabel}>{t('gameOver.cancel')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    elevation: 2,
    backgroundColor: 'rgba(12,14,17,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  label: {
    color: '#8a8578',
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 0,
  },
  value: {
    color: '#1a1d23',
    fontSize: 17,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  valueRecord: {
    color: '#E8A33D',
    fontSize: 17,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  cta: {
    width: HIT_TARGET,
    height: HIT_TARGET,
    backgroundColor: '#E8A33D',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
  },
  ctaLabel: {
    color: '#1C1206',
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  continueWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e7e4de',
    paddingTop: 12,
    gap: 8,
  },
  continueTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1d23',
    textAlign: 'center',
  },
  continueRow: {
    flexDirection: 'row',
    gap: 8,
  },
  continueAd: {
    flex: 1,
    minHeight: HIT_TARGET,
    backgroundColor: '#E8A33D',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueAdLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1206',
  },
  continueIap: {
    flex: 1,
    minHeight: HIT_TARGET,
    backgroundColor: '#1a1d23',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueIapLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  continueCancel: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderColor: '#e7e4de',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  continueCancelLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1d23',
  },
});

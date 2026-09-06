import { useEffect, useRef } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../i18n/index.ts';
import { HIT_TARGET } from './PauseButton';
import { SAFE_MARGIN } from './layout';
import type { EdgeInsets } from './layout';
import type { ThemeId } from '../theme/index.ts';

export interface PauseChrome {
  surfaceRaised: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentInk: string;
}

export interface PauseOverlayProps {
  insets: EdgeInsets;
  reducedMotion?: boolean;
  // Theme chrome resolved by the caller (App.tsx owns THEMES; the overlay
  // stays a thin view like Hud — no theme imports).
  chrome: PauseChrome;
  theme: ThemeId;
  onThemeChange: (id: ThemeId) => void;
  language: 'pt' | 'en';
  motionReduced: boolean;
  onReducedMotionChange: (value: boolean) => void;
  onResume: () => void;
  onRestart: () => void;
  onLanes: () => void;
}

const THEME_OPTIONS: ReadonlyArray<{ id: ThemeId; pt: string; en: string }> = [
  { id: 'dark', pt: 'Escuro', en: 'Dark' },
  { id: 'light', pt: 'Claro', en: 'Light' },
  { id: 'colorBlind', pt: 'Daltônico', en: 'Color-blind' },
];

export function PauseOverlay({
  insets,
  reducedMotion,
  chrome,
  theme,
  onThemeChange,
  language,
  motionReduced,
  onReducedMotionChange,
  onResume,
  onRestart,
  onLanes,
}: PauseOverlayProps) {
  const { t } = useTranslation();
  const clampInset = (v: unknown): number => (Number.isFinite(v as number) && (v as number) >= 0 ? (v as number) : 0);
  const padTop = clampInset(insets?.top) + SAFE_MARGIN;
  const padBottom = clampInset(insets?.bottom) + SAFE_MARGIN;
  const padLeft = clampInset(insets?.left) + SAFE_MARGIN;
  const padRight = clampInset(insets?.right) + SAFE_MARGIN;

  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    opacity.stopAnimation();
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0);
    const anim = Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true });
    anim.start();
    return () => {
      anim.stop();
      opacity.stopAnimation();
    };
  }, [reducedMotion, opacity]);

  // Hardware back dismisses the pause sheet (unlike game-over, which consumes it).
  const resumeRef = useRef(onResume);
  resumeRef.current = onResume;
  useEffect(() => {
    const handler = () => {
      try {
        resumeRef.current();
      } catch {}
      return true;
    };
    const sub: any = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => {
      if (sub && typeof sub.remove === 'function') sub.remove();
      else (BackHandler as any).removeEventListener?.('hardwareBackPress', handler);
    };
  }, []);

  return (
    <Animated.View
      style={[styles.overlay, { opacity }, { paddingTop: padTop, paddingBottom: padBottom, paddingLeft: padLeft, paddingRight: padRight }]}
      pointerEvents="auto"
      accessibilityViewIsModal
    >
      <View style={[styles.card, { backgroundColor: chrome.surfaceRaised, borderColor: chrome.border }]}>
        <View accessible accessibilityRole="header" accessibilityLabel={t('pause.title')}>
          <Text style={[styles.title, { color: chrome.text }]} allowFontScaling>{t('pause.title')}</Text>
        </View>
        <Pressable
          onPress={onResume}
          style={[styles.cta, { backgroundColor: chrome.accent }]}
          accessibilityRole="button"
          accessibilityLabel={t('pause.resume')}
        >
          <Text style={[styles.ctaLabel, { color: chrome.accentInk }]} allowFontScaling>{t('pause.resume')}</Text>
        </Pressable>
        <View style={styles.secondaryRow}>
          <Pressable
            onPress={onRestart}
            style={[styles.secondaryBtn, { borderColor: chrome.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('gameOver.restart')}
          >
            <Text style={[styles.secondaryLabel, { color: chrome.text }]} allowFontScaling>{t('gameOver.restart')}</Text>
          </Pressable>
          <Pressable
            onPress={onLanes}
            style={[styles.secondaryBtn, { borderColor: chrome.border }]}
            accessibilityRole="button"
            accessibilityLabel={t('laneSelect.pistas')}
          >
            <Text style={[styles.secondaryLabel, { color: chrome.text }]} allowFontScaling>{t('laneSelect.pistas')}</Text>
          </Pressable>
        </View>
        <View style={[styles.divider, { backgroundColor: chrome.border }]} />
        <View style={styles.themeRow} accessibilityLabel="theme selector">
          {THEME_OPTIONS.map((opt) => {
            const isSelected = theme === opt.id;
            const label = language === 'pt' ? opt.pt : opt.en;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onThemeChange(opt.id)}
                style={[
                  styles.themeBtn,
                  { borderColor: isSelected ? chrome.accent : chrome.border },
                  isSelected ? { backgroundColor: chrome.accent } : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[styles.themeLabel, { color: isSelected ? chrome.accentInk : chrome.text }]}
                  allowFontScaling
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => onReducedMotionChange(!motionReduced)}
          style={styles.motionRow}
          accessibilityRole="switch"
          accessibilityLabel={t('pause.reducedMotion')}
          accessibilityState={{ checked: motionReduced }}
        >
          <Text style={[styles.motionLabel, { color: chrome.text }]} allowFontScaling>{t('pause.reducedMotion')}</Text>
          <View
            style={[
              styles.switchTrack,
              { borderColor: chrome.border },
              motionReduced ? { backgroundColor: chrome.accent, borderColor: chrome.accent } : null,
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                { backgroundColor: motionReduced ? chrome.accentInk : chrome.muted },
                motionReduced ? styles.switchThumbOn : styles.switchThumbOff,
              ]}
            />
          </View>
        </Pressable>
      </View>
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
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  cta: {
    marginTop: 8,
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  ctaLabel: {
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexWrap: 'wrap',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    flexWrap: 'wrap',
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    flexWrap: 'wrap',
  },
  divider: {
    height: 1,
    marginVertical: 4,
    opacity: 0.6,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  themeBtn: {
    flex: 1,
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '600',
    flexWrap: 'wrap',
  },
  motionRow: {
    minHeight: HIT_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  motionLabel: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  switchTrack: {
    width: 52,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
});

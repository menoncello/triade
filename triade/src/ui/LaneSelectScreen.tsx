import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../i18n/index.ts';
import { HIT_TARGET } from './PauseButton';
import { SAFE_MARGIN } from './layout';
import type { EdgeInsets } from './layout';
import { LANES } from '../game/lanes';

import type { ThemeId } from '../theme/index.ts';
import { THEMES, isThemeId } from '../theme/index.ts';

export interface LaneSelectScreenProps {
  selectedIndex: number;
  hasActiveMatch: boolean;
  insets: EdgeInsets;
  onSelectLane: (index: number) => void;
  onJogar: () => void;
  onRestorePurchases?: () => void | Promise<void>;
  restoreBusy?: boolean;
  language?: 'pt' | 'en';
  onLanguageChange?: (lng: 'pt' | 'en') => void;
  theme?: ThemeId;
  onThemeChange?: (id: ThemeId) => void;
}

export function LaneSelectScreen({
  selectedIndex,
  hasActiveMatch,
  insets,
  onSelectLane,
  onJogar,
  onRestorePurchases,
  restoreBusy,
  language,
  onLanguageChange,
  theme = 'dark',
  onThemeChange,
}: LaneSelectScreenProps) {
  const { t } = useTranslation();
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const handleCardPress = (index: number) => {
    if (index === selectedIndex) return;
    if (hasActiveMatch) {
      // Show inline confirm banner first; Alert is secondary system fallback.
      setPendingIndex(index);
    } else {
      onSelectLane(index);
    }
  };

  const handleConfirm = () => {
    if (pendingIndex !== null) {
      const idx = pendingIndex;
      setPendingIndex(null);
      onSelectLane(idx);
    }
  };

  const handleCancel = () => setPendingIndex(null);

  const topPad = (insets?.top ?? 0) + SAFE_MARGIN;
  const bottomPad = (insets?.bottom ?? 0) + SAFE_MARGIN;
  const leftPad = (insets?.left ?? 0) + SAFE_MARGIN;
  const rightPad = (insets?.right ?? 0) + SAFE_MARGIN;

  const laneLabel = (id: string) => (id === 'clean' ? t('lane.clean.label') : t('lane.accelerated.label'));
  const laneSubtitle = (id: string) => (id === 'clean' ? '' : t('lane.accelerated.subtitle'));
  const laneTone = (id: string) => (id === 'clean' ? t('lane.clean.tone') : t('lane.accelerated.tone'));

  // Theme wiring: the screen previously ignored `theme` (hardcoded light).
  // Colors resolve from THEMES pure data; layout stays in static `styles`.
  const tokens = THEMES[isThemeId(theme) ? theme : 'dark'];
  const chrome = tokens.chrome;

  return (
    <View
      style={[styles.container, { backgroundColor: chrome.surface, paddingTop: topPad, paddingBottom: bottomPad, paddingLeft: leftPad, paddingRight: rightPad }]}
      accessibilityLabel="Lane Select"
    >
      <View style={styles.inner}>
        <Text style={[styles.title, { color: chrome.text }]} allowFontScaling>{t('laneSelect.title')}</Text>
        <Text style={[styles.subtitle, { color: chrome.muted }]} allowFontScaling>{t('laneSelect.subtitle')}</Text>

        <View style={styles.cardsRow}>
          {LANES.map((lane) => {
            const isSelected = lane.index === selectedIndex;
            const label = laneLabel(lane.id);
            const subtitle = laneSubtitle(lane.id);
            const tone = laneTone(lane.id);
            return (
              <Pressable
                key={lane.id}
                onPress={() => handleCardPress(lane.index)}
                style={[styles.card, styles.cardIdle, { backgroundColor: chrome.surfaceRaised, borderColor: isSelected ? chrome.accent : chrome.border }]}
                accessibilityRole="button"
                accessibilityLabel={`${label}${subtitle ? ` ${subtitle}` : ''}`}
                accessibilityState={{ selected: isSelected }}
              >
                {isSelected ? <View style={[styles.accentBar, { backgroundColor: chrome.accent }]} /> : null}
                <Text style={[styles.cardLabel, { color: chrome.text }]} allowFontScaling>{label}</Text>
                {subtitle ? <Text style={[styles.cardSubtitle, { color: chrome.muted }]} allowFontScaling>{subtitle}</Text> : null}
                <Text style={[styles.cardTone, { color: chrome.muted }]} allowFontScaling>{tone}</Text>
              </Pressable>
            );
          })}
        </View>

        {pendingIndex !== null ? (
          <View style={[styles.warningBanner, { backgroundColor: chrome.surfaceRaised, borderColor: chrome.accent, borderLeftColor: chrome.accent }]} accessibilityLabel={t('laneSelect.switchWarning')}>
            <Text style={[styles.warningText, { color: chrome.text }]} allowFontScaling>{t('laneSelect.switchWarning')}</Text>
            <View style={styles.warningActions}>
              <Pressable
                onPress={handleConfirm}
                style={[styles.warningConfirm, { backgroundColor: chrome.accent }]}
                accessibilityRole="button"
                accessibilityLabel={t('laneSelect.confirm')}
              >
                <Text style={[styles.warningConfirmLabel, { color: chrome.accentInk }]} allowFontScaling>{t('laneSelect.confirm')}</Text>
              </Pressable>
              <Pressable
                onPress={handleCancel}
                style={[styles.warningCancel, { backgroundColor: chrome.surfaceRaised, borderColor: chrome.border }]}
                accessibilityRole="button"
                accessibilityLabel={t('laneSelect.cancel')}
              >
                <Text style={[styles.warningCancelLabel, { color: chrome.text }]} allowFontScaling>{t('laneSelect.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={onJogar}
          style={[styles.cta, { backgroundColor: chrome.accent }]}
          accessibilityRole="button"
          accessibilityLabel={t('laneSelect.play')}
        >
          <Text style={[styles.ctaLabel, { color: chrome.accentInk }]} allowFontScaling>{t('laneSelect.play')}</Text>
        </Pressable>
        {onRestorePurchases ? (
          <Pressable
            onPress={onRestorePurchases}
            disabled={!!restoreBusy}
            style={[styles.restoreBtn, { borderColor: chrome.border, backgroundColor: chrome.surfaceRaised }, restoreBusy ? styles.restoreBtnBusy : null]}
            accessibilityRole="button"
            accessibilityLabel={t('laneSelect.restore')}
            accessibilityState={{ busy: !!restoreBusy, disabled: !!restoreBusy }}
          >
            <Text style={[styles.restoreLabel, { color: chrome.text }]} allowFontScaling>{restoreBusy ? t('laneSelect.restoring') : t('laneSelect.restore')}</Text>
          </Pressable>
        ) : null}
        {hasActiveMatch && pendingIndex === null ? (
          <Text style={[styles.footerNote, { color: chrome.muted }]} allowFontScaling>{t('laneSelect.footerNote')}</Text>
        ) : null}
        {onLanguageChange ? (
          <View style={styles.langRow} accessibilityLabel="language selector">
              <Pressable
                onPress={() => onLanguageChange('pt')}
                style={[styles.langBtn, styles.langBtnIdle, { borderColor: language === 'pt' ? chrome.accent : chrome.border, backgroundColor: chrome.surfaceRaised }]}
                accessibilityRole="button"
                accessibilityLabel="Português"
                accessibilityState={{ selected: language === 'pt' }}
              >
                <Text style={[styles.langLabel, styles.langLabelSelected, { color: language === 'pt' ? chrome.accent : chrome.text }]} allowFontScaling>PT</Text>
              </Pressable>
              <Pressable
                onPress={() => onLanguageChange('en')}
                style={[styles.langBtn, styles.langBtnIdle, { borderColor: language === 'en' ? chrome.accent : chrome.border, backgroundColor: chrome.surfaceRaised }]}
                accessibilityRole="button"
                accessibilityLabel="English"
                accessibilityState={{ selected: language === 'en' }}
              >
                <Text style={[styles.langLabel, styles.langLabelSelected, { color: language === 'en' ? chrome.accent : chrome.text }]} allowFontScaling>EN</Text>
              </Pressable>
          </View>
        ) : null}
        {onThemeChange ? (
          <View style={styles.themeRow} accessibilityLabel="theme selector">
            {([
              ['dark', 'Escuro', 'Dark'],
              ['light', 'Claro', 'Light'],
              ['colorBlind', 'Daltônico', 'Color-blind'],
            ] as const).map(([id, ptLabel, enLabel]) => {
              const isSelected = theme === id;
              const label = language === 'pt' ? ptLabel : enLabel;
              return (
                <Pressable
                  key={id}
                  onPress={() => onThemeChange(id as ThemeId)}
                  style={[styles.themeBtn, styles.themeBtnIdle, { borderColor: isSelected ? chrome.accent : chrome.border, backgroundColor: isSelected ? chrome.accent : chrome.surfaceRaised }]}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.themeLabel, styles.themeLabelSelected, { color: isSelected ? chrome.accentInk : chrome.text }]} allowFontScaling>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    alignItems: 'stretch',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1a1d23',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: '#8a8578',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  cardsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  card: {
    flex: 1,
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  cardIdle: {
    borderColor: '#e7e4de',
  },
  cardSelected: {
    borderColor: '#E8A33D',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#E8A33D',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1d23',
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: '#8a8578',
  },
  cardTone: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#8a8578',
  },
  warningBanner: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E8A33D',
    borderLeftWidth: 3,
    borderLeftColor: '#E8A33D',
    backgroundColor: '#fff7ec',
    borderRadius: 8,
    padding: 12,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1d23',
  },
  warningActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  warningConfirm: {
    flex: 1,
    minHeight: HIT_TARGET,
    backgroundColor: '#E8A33D',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningConfirmLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1206',
  },
  warningCancel: {
    flex: 1,
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderColor: '#e7e4de',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  warningCancelLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1d23',
  },
  cta: {
    marginTop: 16,
    minHeight: HIT_TARGET,
    backgroundColor: '#E8A33D',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  ctaLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1206',
    fontVariant: ['tabular-nums'],
  },
  footerNote: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '500',
    color: '#8a8578',
    textAlign: 'center',
  },
  restoreBtn: {
    marginTop: 10,
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderColor: '#e7e4de',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  restoreBtnBusy: {
    opacity: 0.6,
  },
  restoreLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a1d23',
  },
  langRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
  },
  langBtn: {
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtnIdle: {
    borderColor: '#e7e4de',
    backgroundColor: '#fff',
  },
  langBtnSelected: {
    borderColor: '#E8A33D',
    backgroundColor: '#fff7ec',
  },
  langLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1d23',
  },
  langLabelSelected: {
    color: '#1C1206',
  },
  themeRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
    flexWrap: 'wrap',
  },
  themeBtn: {
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeBtnIdle: {
    borderColor: '#e7e4de',
    backgroundColor: '#fff',
  },
  themeBtnSelected: {
    borderColor: '#E8A33D',
    backgroundColor: '#E8A33D',
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1d23',
  },
  themeLabelSelected: {
    color: '#1C1206',
  },
});

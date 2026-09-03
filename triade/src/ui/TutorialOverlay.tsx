import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../i18n/index.ts';
import { SAFE_MARGIN } from './layout';
import type { EdgeInsets } from './layout';
import type { TutorialPhase } from '../game/tutorial.ts';
import { HIT_TARGET } from './PauseButton';

interface Props {
  phase: TutorialPhase;
  insets: EdgeInsets;
  onSkip: () => void;
}

function textForPhase(phase: TutorialPhase, t: (key: string) => string): string {
  if (phase === 'merge12') return t('tutorial.merge12');
  if (phase === 'merge12_followup') return t('tutorial.merge12_followup');
  if (phase === 'oneCell') return t('tutorial.oneCell');
  return '';
}

export function TutorialOverlay({ phase, insets, onSkip }: Props) {
  const { t } = useTranslation();
  if (phase === 'completed' || phase === 'skipped') return null;
  const text = textForPhase(phase, t);
  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View
        pointerEvents="box-none"
        style={[
          styles.cueBox,
          {
            marginTop: insets.top + SAFE_MARGIN + 56,
            marginLeft: insets.left + SAFE_MARGIN,
            marginRight: insets.right + SAFE_MARGIN,
          },
        ]}
      >
        <Text style={styles.cueText} accessibilityRole="text" allowFontScaling>
          {text}
        </Text>
      </View>
      <View style={[styles.skipWrap, { top: insets.top + SAFE_MARGIN, right: insets.right + SAFE_MARGIN }]}>
        <Pressable
          onPress={onSkip}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel={t('tutorial.skipA11y')}
        >
          <Text style={styles.skipLabel} allowFontScaling>{t('tutorial.skip')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    elevation: 3,
  },
  cueBox: {
    alignSelf: 'center',
    maxWidth: 420,
    width: '100%',
    backgroundColor: '#2B2F38',
    borderWidth: 1,
    borderColor: '#3A3F49',
    borderRadius: 12,
    padding: 16,
  },
  cueText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#F2EEE3',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  skipWrap: {
    position: 'absolute',
  },
  skipBtn: {
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e7e4de',
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1d23',
  },
});

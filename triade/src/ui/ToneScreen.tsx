import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../i18n/index.ts';
import { SAFE_MARGIN } from './layout';
import type { EdgeInsets } from './layout';

export interface ToneScreenProps {
  insets: EdgeInsets;
  onDismiss: () => void;
}

export function ToneScreen({ insets, onDismiss }: ToneScreenProps) {
  const { t } = useTranslation();
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const [voiceOverActive, setVoiceOverActive] = useState(false);
  const [announcementPending, setAnnouncementPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    // Initial VoiceOver check
    try {
      void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
        if (mounted) setVoiceOverActive(enabled);
      });
    } catch {}
    const sub1 = AccessibilityInfo.addEventListener('change', (enabled: boolean) => {
      setVoiceOverActive(enabled);
    });
    // iOS only: announcementFinished pauses timer
    let sub2: { remove: () => void } | null = null;
    try {
      // @ts-ignore announcementFinished is iOS-only but types allow it
      sub2 = AccessibilityInfo.addEventListener('announcementFinished', () => {
        if (mounted) setAnnouncementPending(false);
      });
      // Also listen to announceForAccessibility pending via generic announcementFinished?
      // We consider announcementPending true briefly after mount if VoiceOver enabled,
      // the pause is driven by voiceOverActive already. For explicit announcements,
      // future callers would set pending; keep listener for completeness.
    } catch {}
    return () => {
      mounted = false;
      try {
        sub1.remove();
      } catch {}
      try {
        sub2?.remove();
      } catch {}
    };
  }, []);

  // Track if an announcement is in flight — best-effort: when screen reader is
  // active we treat announcement as pending until first announcementFinished.
  // No explicit announce is fired from ToneScreen, so pending mainly covers
  // VoiceOver reading the copy.
  useEffect(() => {
    if (voiceOverActive) {
      setAnnouncementPending(true);
      // Fallback: if announcementFinished never fires, unblock after 5s
      fallbackRef.current = setTimeout(() => setAnnouncementPending(false), 5000);
      return () => {
        if (fallbackRef.current) clearTimeout(fallbackRef.current);
      };
    } else {
      setAnnouncementPending(false);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    }
  }, [voiceOverActive]);

  const paused = voiceOverActive || announcementPending;

  useEffect(() => {
    if (paused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setTimeout(() => {
      onDismissRef.current();
    }, 2000);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [paused]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, []);

  const topPad = (insets?.top ?? 0) + SAFE_MARGIN;
  const bottomPad = (insets?.bottom ?? 0) + SAFE_MARGIN;
  const leftPad = (insets?.left ?? 0) + SAFE_MARGIN;
  const rightPad = (insets?.right ?? 0) + SAFE_MARGIN;

  return (
    <Pressable
      onPress={() => onDismissRef.current()}
      style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad, paddingLeft: leftPad, paddingRight: rightPad }]}
      accessibilityRole="button"
      accessibilityLabel={t('tone.skipA11y')}
      accessibilityHint={t('tone.skipHint')}
      testID="tone-screen-pressable"
    >
      <View style={styles.center} pointerEvents="none">
        <View style={styles.tileWrap} testID="tone-tile">
          <View style={styles.tile} />
        </View>
        <Text style={styles.copy} accessibilityRole="text">
          {t('tone.line')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1d23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 420,
  },
  tileWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    // subtle glow
    shadowColor: '#E8A33D',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  tile: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#E8A33D',
    borderTopWidth: 2,
    borderTopColor: '#F5C97A',
    borderLeftWidth: 2,
    borderLeftColor: '#F5C97A',
    borderRightWidth: 2,
    borderRightColor: '#8A5A12',
    borderBottomWidth: 2,
    borderBottomColor: '#8A5A12',
    // faceted octagon vibe via radius + bevel already
  },
  copy: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#F2EEE3',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

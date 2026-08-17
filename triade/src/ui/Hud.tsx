import { StyleSheet, Text, View } from 'react-native';
import { HIT_TARGET, PauseButton } from './PauseButton';
import { SAFE_MARGIN } from './layout';
import type { EdgeInsets } from './layout';

export interface HudProps {
  score: number;
  best: number;
  isLandscape: boolean;
  insets: EdgeInsets;
  bandHeight: number;
}

export function Hud({ score, best, isLandscape, insets, bandHeight }: HudProps) {
  const topPad = insets.top + SAFE_MARGIN;
  const leftPad = insets.left + SAFE_MARGIN;
  const rightPad = insets.right + SAFE_MARGIN;
  const bottomPad = insets.bottom + SAFE_MARGIN;

  if (isLandscape) {
    return (
      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={[styles.landscapeBand, { height: topPad + bandHeight, paddingTop: topPad, paddingLeft: leftPad, paddingRight: rightPad }]}>
          <View style={styles.landscapeLeft}>
            <Text style={styles.scoreLandscape} numberOfLines={1}>
              {score}
            </Text>
            <Text style={styles.bestLandscape} numberOfLines={1}>
              Recorde {best}
            </Text>
          </View>
          <View style={styles.landscapeRight}>
            <View pointerEvents="none" style={styles.previewLandscape} />
            <PauseButton />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.portraitBand, { height: topPad + bandHeight, paddingTop: topPad, paddingLeft: leftPad, paddingRight: rightPad }]}>
        <View style={styles.pauseSlot} />
        <View style={styles.scoreWrap}>
          <Text style={styles.scorePortrait} numberOfLines={1}>
            {score}
          </Text>
          <Text style={styles.bestPortrait} numberOfLines={1}>
            Recorde {best}
          </Text>
        </View>
        <View style={styles.pauseSlot}>
          <PauseButton />
        </View>
      </View>
      <View pointerEvents="none" style={[styles.previewPortrait, { right: rightPad, bottom: bottomPad }]} />
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
    zIndex: 1,
    elevation: 1,
  },
  portraitBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pauseSlot: {
    width: HIT_TARGET,
  },
  scoreWrap: {
    flex: 1,
    alignItems: 'center',
  },
  scorePortrait: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1a1d23',
    fontVariant: ['tabular-nums'],
  },
  bestPortrait: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
    color: '#8a8578',
  },
  previewPortrait: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c9c4b8',
    backgroundColor: '#f1eee6',
  },
  landscapeBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  landscapeLeft: {
    flexShrink: 1,
  },
  scoreLandscape: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1d23',
    fontVariant: ['tabular-nums'],
  },
  bestLandscape: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '500',
    color: '#8a8578',
  },
  landscapeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewLandscape: {
    height: 44,
    minWidth: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c9c4b8',
    backgroundColor: '#f1eee6',
  },
});
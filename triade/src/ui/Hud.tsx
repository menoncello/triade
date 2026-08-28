import { StyleSheet, Text, View } from 'react-native';
import { HIT_TARGET, PauseButton } from './PauseButton';
import { SAFE_MARGIN } from './layout';
import type { EdgeInsets } from './layout';
import { PreviewCard, type Preview } from './PreviewCard.tsx';

type LaneId = 'clean' | 'accelerated';

export interface HudProps {
  score: number;
  best: number;
  isLandscape: boolean;
  insets: EdgeInsets;
  bandHeight: number;
  // FR-45: the lane-agnostic preview is fanned out to both lanes (Clean /
  // Accelerated). The engine owns a single `pendingSpawn`; each lane shows the
  // same pre-resolved preview today — Epic 3 differentiates per-lane boards later.
  previews: { clean: Preview; accelerated: Preview };
  // 3.2 Clean lane purity: only the active lane preview is DISPLAYED; the fan-out shape is kept
  // so 7.2 previewWiring tests migrate via `activeLaneId` gate rather than a breaking prop change.
  activeLaneId?: LaneId;
}

// FR-45 — one labeled preview chip per lane. `label` drives the a11y note and
// the small lane caption; the chrome + value rendering stays in PreviewCard.
// `isLandscape` selects the per-orientation box size (pinned AC4 markers).
function LanePreview({ label, preview, isLandscape }: { label: string; preview: Preview; isLandscape: boolean }) {
  return (
    <View style={isLandscape ? styles.laneBoxLandscape : styles.laneBoxPortrait}>
      <PreviewCard preview={preview} label={label} />
    </View>
  );
}

export function Hud({ score, best, isLandscape, insets, bandHeight, previews, activeLaneId }: HudProps) {
  const topPad = insets.top + SAFE_MARGIN;
  const leftPad = insets.left + SAFE_MARGIN;
  const rightPad = insets.right + SAFE_MARGIN;
  const bottomPad = insets.bottom + SAFE_MARGIN;
  // 3.2: Clean lane purity — display exactly one preview for the active lane
  const activeId: LaneId = activeLaneId === 'accelerated' ? 'accelerated' : 'clean';
  const activePreview = activeId === 'accelerated' ? previews.accelerated : previews.clean;
  const activeLabel = activeId === 'accelerated' ? 'Accelerated' : 'Clean';

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
            <View pointerEvents="none" style={styles.landscapePreviews}>
              <LanePreview label={activeLabel} preview={activePreview} isLandscape />
            </View>
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
      <View pointerEvents="none" style={[styles.previewPortrait, { right: rightPad, bottom: bottomPad }]}>
        <LanePreview label={activeLabel} preview={activePreview} isLandscape={false} />
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
  },
  // FR-45 — per-lane preview box (chrome lives on PreviewCard). Pinned AC4
  // markers: square 76×76 portrait, compact 60×44 landscape band.
  laneBoxPortrait: {
    width: 76,
    height: 76,
  },
  laneBoxLandscape: {
    minWidth: 60,
    height: 44,
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
  landscapePreviews: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HIT_TARGET, PauseButton } from './PauseButton';
import { SAFE_MARGIN, getBandTop } from './layout';
import type { EdgeInsets } from './layout';
import { PreviewCard, type Preview } from './PreviewCard.tsx';

type LaneId = 'clean' | 'accelerated';

const FALLBACK_PREVIEW: Preview = { kind: 'range', values: [] };

export interface HudProps {
  score: number;
  best: number;
  isLandscape: boolean;
  insets: EdgeInsets;
  bandHeight: number;
  // FR-45: the lane-agnostic preview is fanned out to both lanes (Clean /
  // Accelerated). The engine owns a single `pendingSpawn`; each lane shows the
  // same pre-resolved preview today — Epic 3 differentiates per-lane boards later.
  // DW-69 hardening: previews is optional — omitted or partial previews fall back
  // to an empty preview so Hud never throws (backward compatible; callers always
  // provide it today).
  previews?: { clean?: Preview; accelerated?: Preview };
  // 3.2 Clean lane purity: only the active lane preview is DISPLAYED; the fan-out shape is kept
  // so 7.2 previewWiring tests migrate via `activeLaneId` gate rather than a breaking prop change.
  activeLaneId?: LaneId;
  // 3.3 Accelerated assistance affordances (Accelerated only, gated by parent)
  canUndo?: boolean;
  canHint?: boolean;
  onUndo?: () => void;
  onHint?: () => void;
  hintHighlight?: [[number, number], [number, number]] | null;
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

export function Hud({
  score,
  best,
  isLandscape,
  insets,
  bandHeight,
  previews,
  activeLaneId,
  canUndo,
  canHint,
  onUndo,
  onHint,
}: HudProps) {
  const topPad = insets.top + SAFE_MARGIN;
  const leftPad = insets.left + SAFE_MARGIN;
  const rightPad = insets.right + SAFE_MARGIN;
  const bottomPad = insets.bottom + SAFE_MARGIN;
  // 3.2: Clean lane purity — display exactly one preview for the active lane
  // DW-69: defensive guard — previews may be omitted or partial; fall back to empty preview
  const activeId: LaneId = activeLaneId === 'accelerated' ? 'accelerated' : 'clean';
  const activePreview: Preview =
    (activeId === 'accelerated' ? previews?.accelerated : previews?.clean) ?? FALLBACK_PREVIEW;
  const activeLabel = activeId === 'accelerated' ? 'Accelerated' : 'Clean';
  const showAssistance = activeId === 'accelerated';

  if (isLandscape) {
    return (
      <View pointerEvents="box-none" style={styles.overlay}>
        <View style={[styles.landscapeBand, { height: getBandTop(insets, bandHeight), paddingTop: topPad, paddingLeft: leftPad, paddingRight: rightPad }]}>
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
            {showAssistance && onUndo ? (
              <Pressable
                onPress={onUndo}
                disabled={!canUndo}
                style={[styles.assistBtn, !canUndo ? styles.assistBtnDisabled : null]}
                accessibilityRole="button"
                accessibilityLabel="Desfazer"
                accessibilityState={{ disabled: !canUndo }}
              >
                <Text style={styles.assistLabel}>↩</Text>
              </Pressable>
            ) : null}
            {showAssistance && onHint ? (
              <Pressable
                onPress={onHint}
                disabled={!canHint}
                style={[styles.assistBtn, !canHint ? styles.assistBtnDisabled : null]}
                accessibilityRole="button"
                accessibilityLabel="Dica"
                accessibilityState={{ disabled: !canHint }}
              >
                <Text style={styles.assistLabel}>?</Text>
              </Pressable>
            ) : null}
            <PauseButton />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.portraitBand, { height: getBandTop(insets, bandHeight), paddingTop: topPad, paddingLeft: leftPad, paddingRight: rightPad }]}>
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
      <View pointerEvents="box-none" style={[styles.previewPortrait, { right: rightPad, bottom: bottomPad }]}>
        <LanePreview label={activeLabel} preview={activePreview} isLandscape={false} />
      </View>
      {showAssistance && (onUndo || onHint) ? (
        <View pointerEvents="auto" style={[styles.assistRowPortrait, { right: rightPad, bottom: bottomPad + 76 + 8 }]}>
          {onUndo ? (
            <Pressable
              onPress={onUndo}
              disabled={!canUndo}
              style={[styles.assistBtn, !canUndo ? styles.assistBtnDisabled : null]}
              accessibilityRole="button"
              accessibilityLabel="Desfazer"
              accessibilityState={{ disabled: !canUndo }}
            >
              <Text style={styles.assistLabel}>↩</Text>
            </Pressable>
          ) : null}
          {onHint ? (
            <Pressable
              onPress={onHint}
              disabled={!canHint}
              style={[styles.assistBtn, !canHint ? styles.assistBtnDisabled : null]}
              accessibilityRole="button"
              accessibilityLabel="Dica"
              accessibilityState={{ disabled: !canHint }}
            >
              <Text style={styles.assistLabel}>?</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
  assistRowPortrait: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 8,
  },
  assistBtn: {
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e7e4de',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  assistBtnDisabled: {
    opacity: 0.4,
  },
  assistLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1d23',
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

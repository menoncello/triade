import { StyleSheet, Text, View } from 'react-native';
import type { Preview } from '../game/preview.ts';

export type { Preview } from '../game/preview.ts';

// AC6 (UX-DR-8): the preview card is HUD chrome, not the board. No feel/animation
// layer exists yet (Epic 8); the enforceable part today is structural — this
// component carries NO animation/transform/Animated props so Epic 8 agents
// inherit the constraint by construction.
// `label` (FR-45) marks which lane the card belongs to ("Clean"/"Accelerated")
// so the two-lane HUD can fan the lane-agnostic preview out per lane.
// Defensive render of the Preview union so a malformed preview can never throw
// or render the literal "undefined" (review P2). Falls back to an empty string.
function displayOf(preview: Preview): string {
  if (preview.kind === 'exact') {
    return Number.isFinite(preview.value) ? String(preview.value) : '';
  }
  const values = Array.isArray(preview.values)
    ? preview.values.filter((v) => Number.isFinite(v))
    : [];
  return values.length > 0 ? values.join('/') : '';
}

export function PreviewCard({ preview, label }: { preview: Preview; label?: string }) {
  const display = displayOf(preview);
  const laneNote = label ? ` (${label})` : '';
  const announcement = `Próxima${laneNote}: ${display}`;
  return (
    <View style={styles.card} accessibilityLabel={announcement} pointerEvents="none" accessible accessibilityRole="text">
      {label ? <Text style={styles.label} allowFontScaling>{label}</Text> : null}
      <Text style={styles.value} allowFontScaling adjustsFontSizeToFit={false}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#f1eee6',
    borderColor: '#c9c4b8',
    borderWidth: 1,
    borderRadius: 12,
  },
  value: {
    color: '#E8A33D',
    fontSize: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexWrap: 'wrap',
  },
  label: {
    color: '#8a8578',
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
    flexWrap: 'wrap',
  },
});

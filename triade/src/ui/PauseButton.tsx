import { Pressable, StyleSheet, Text } from 'react-native';

export const HIT_TARGET = 48;

export interface PauseButtonProps {
  onPress?: () => void;
}

export function PauseButton({ onPress }: PauseButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Pausar"
      onPress={onPress}
      style={styles.button}
      hitSlop={4}
    >
      <Text style={styles.glyph} allowFontScaling>II</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: HIT_TARGET,
    height: HIT_TARGET,
    borderRadius: 12,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    letterSpacing: 1,
  },
});
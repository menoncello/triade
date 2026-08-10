import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GameBoard } from './src/render/GameBoard';
import { useFrameRateBaseline } from './src/render/useFrameRateBaseline';
import { newGame } from './src/engine/core/index.ts';
import type { Board } from './src/engine/core/index.ts';
import { mulberry32 } from './src/utils/mulberry32.ts';

const snapshot: Board = newGame(mulberry32(20260808));

export default function App() {
  const { width } = useWindowDimensions();
  const boardSize = Math.max(40, Math.min(width - 32, 360));
  const stats = useFrameRateBaseline();

  return (
    <View style={styles.container}>
      <GameBoard board={snapshot} width={boardSize} />
      <Text style={styles.stats}>
        {stats
          ? `baseline: ${stats.fps.toFixed(1)} fps · p99 ${stats.p99Ms.toFixed(2)}ms · ${stats.frames} frames`
          : 'recording frame rate baseline…'}
      </Text>
      <StatusBar style="auto" />
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
  stats: {
    marginTop: 24,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});

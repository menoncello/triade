import { useCallback, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GameBoard } from './src/render/GameBoard';
import { useFrameRateBaseline } from './src/render/useFrameRateBaseline';
import { newGame, move } from './src/engine/core/index.ts';
import type { Board, Direction, MoveResult } from './src/engine/core/index.ts';
import { mulberry32 } from './src/utils/mulberry32.ts';

const DIRECTIONS: Direction[] = ['left', 'right', 'up', 'down'];

export default function App() {
  const { width } = useWindowDimensions();
  const boardSize = Math.max(40, Math.min(width - 32, 360));
  const stats = useFrameRateBaseline();
  const rngRef = useRef(mulberry32(20260808));
  const [board, setBoard] = useState<Board>(() => newGame(rngRef.current));
  const [moveResult, setMoveResult] = useState<MoveResult | null>(null);

  const doMove = useCallback(
    (dir: Direction) => {
      const result = move(board, dir, rngRef.current);
      setBoard(result.board);
      setMoveResult(result);
    },
    [board]
  );

  return (
    <View style={styles.container}>
      <GameBoard board={board} moveResult={moveResult} width={boardSize} />
      <Text style={styles.stats}>
        {stats
          ? `baseline: ${stats.fps.toFixed(1)} fps · p99 ${stats.p99Ms.toFixed(2)}ms · ${stats.frames} frames`
          : 'recording frame rate baseline…'}
      </Text>
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <DirButton label="⇧" onPress={() => doMove('up')} />
        </View>
        <View style={styles.controlRow}>
          <DirButton label="⇦" onPress={() => doMove('left')} />
          <DirButton label="⇨" onPress={() => doMove('right')} />
        </View>
        <View style={styles.controlRow}>
          <DirButton label="⇩" onPress={() => doMove('down')} />
        </View>
      </View>
      <Text style={styles.hint}>TEMP move harness — real swipe input ships in story 1.6</Text>
      <StatusBar style="auto" />
    </View>
  );
}

function DirButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
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
  controls: {
    marginTop: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  buttonLabel: {
    fontSize: 24,
  },
  hint: {
    marginTop: 16,
    fontSize: 11,
    color: '#999',
  },
});

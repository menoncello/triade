import { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameBoard } from './src/render/GameBoard';
import { useFrameRateBaseline } from './src/render/useFrameRateBaseline';
import { newGame, move } from './src/engine/core/index.ts';
import type { Board, Direction, MoveResult } from './src/engine/core/index.ts';
import { applyMove, initialScore, isNewRecord } from './src/game/matchScore.ts';
import type { MatchScore } from './src/game/matchScore.ts';
import { loadBest, saveBest } from './src/services/storage/settingsStore.ts';
import { preloadAssets } from './src/services/assets/assetManifest.ts';
import { mulberry32 } from './src/utils/mulberry32.ts';
import { layoutFor, SAFE_MARGIN } from './src/ui/layout.ts';
import { Hud } from './src/ui/Hud';

const DIRECTIONS: Direction[] = ['left', 'right', 'up', 'down'];

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { boardSize, bandHeight, isLandscape } = layoutFor({ width, height, insets });
  const bandTop = insets.top + SAFE_MARGIN + bandHeight;
  const stats = useFrameRateBaseline();
  const rngRef = useRef(mulberry32(20260808));
  const sessionStartBestRef = useRef(0);
  const hydrationOkRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [persistedBest, setPersistedBest] = useState(0);
  const [board, setBoard] = useState<Board>(() => newGame(rngRef.current));
  const [moveResult, setMoveResult] = useState<MoveResult | null>(null);
  const [match, setMatch] = useState<MatchScore>({ score: 0, best: 0 });

  useEffect(() => {
    // NFR-3: preload is fire-and-forget — a stalled preload degrades to defaults
    // instead of blocking launch; `ready` only gates on hydration (never hangs).
    void preloadAssets();
    let cancelled = false;
    (async () => {
      const result = await loadBest();
      if (cancelled) return;
      hydrationOkRef.current = result.ok;
      sessionStartBestRef.current = result.best;
      setPersistedBest(result.best);
      setMatch(initialScore(result.best));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist only when the live session best actually passes the persisted value —
  // gated on the session-start best (isNewRecord contract), never `current.best`.
  // Runs in an effect (committed state), not inside the setMatch updater (purity).
  // When hydration degraded (ok=false) persistence is blocked for the session so
  // a new score can never overwrite a record the app failed to read.
  useEffect(() => {
    if (!hydrationOkRef.current) return;
    if (isNewRecord(sessionStartBestRef.current, match.best) && match.best > persistedBest) {
      void saveBest(match.best).then((ok) => {
        if (ok) setPersistedBest(match.best);
      });
    }
  }, [match.best, persistedBest]);

  const doMove = useCallback(
    (dir: Direction) => {
      const result = move(board, dir, rngRef.current);
      setBoard(result.board);
      setMoveResult(result);
      setMatch((current) => applyMove(current, result));
    },
    [board]
  );

  if (!ready) {
    return (
      <View style={styles.container}>
        <Text style={styles.stats}>preloading bundled assets…</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Hud
        score={match.score}
        best={match.best}
        isLandscape={isLandscape}
        insets={insets}
        bandHeight={bandHeight}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: bandTop, paddingBottom: 24 + insets.bottom }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.boardWrap}>
          <GameBoard board={board} moveResult={moveResult} width={boardSize} />
        </View>
        <Text style={styles.stats}>
          {stats
            ? `baseline: ${stats.fps.toFixed(1)} fps · p99 ${stats.p99Ms.toFixed(2)}ms · ${stats.frames} frames`
            : 'recording frame rate baseline…'}
        </Text>
        <Text style={styles.stats}>
          score: {match.score} · live best: {match.best} · persisted best: {persistedBest}
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
      </ScrollView>
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
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  boardWrap: {
    marginTop: 0,
  },
  stats: {
    marginTop: 12,
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
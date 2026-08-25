import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameBoard } from './src/render/GameBoard';
import { useFrameRateBaseline } from './src/render/useFrameRateBaseline';
import { newGame, move } from './src/engine/core/index.ts';
import type { Direction, GameState, MoveResult } from './src/engine/core/index.ts';
import { applyMove, initialScore, isNewRecord } from './src/game/matchScore.ts';
import type { MatchScore } from './src/game/matchScore.ts';
import { previewFor } from './src/game/preview.ts';
import { loadBest, saveBest } from './src/services/storage/settingsStore.ts';
import { preloadAssets } from './src/services/assets/assetManifest.ts';
import { mulberry32 } from './src/utils/mulberry32.ts';
import { layoutFor, SAFE_MARGIN } from './src/ui/layout.ts';
import { SWIPE_THRESHOLD, resolveSwipeDirection } from './src/ui/swipe.ts';
import { Hud } from './src/ui/Hud';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { boardSize, bandHeight, isLandscape } = layoutFor({ width, height, insets });
  const bandTop = insets.top + SAFE_MARGIN + bandHeight;
  const stats = useFrameRateBaseline();
  const rngRef = useRef(mulberry32(20260808));
  const busyRef = useRef(false);
  const sessionStartBestRef = useRef(0);
  const hydrationOkRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [persistedBest, setPersistedBest] = useState(0);
  const [game, setGame] = useState<GameState>(() => newGame(rngRef.current));
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
      const result = move(game, dir, rngRef.current);
      setGame({ board: result.board, pendingSpawn: result.pendingSpawn });
      setMoveResult(result);
      setMatch((current) => applyMove(current, result));
      if (result.moved) {
        // T3.4 in-flight gate: an effective move animates; block further swipes
        // until the input gate re-opens (~30% of the animation, via GameBoard's
        // onMoveSettled timer). A noop (moved:false) produces an empty
        // transitionPlan — no animation runs, onMoveSettled never fires, so the
        // gate must only engage on real moves (noop deadlock guard).
        busyRef.current = true;
      }
    },
    [game]
  );

  // Stable gesture (created once) reads the latest doMove through a ref so a
  // move dispatched during an in-flight animation never uses a stale board
  // closure (the deferred "rapid same-frame moves" debt, replaced here by the
  // gesture + in-flight gate).
  // Updated during render (not a passive effect) so the gesture can never read a
  // stale board closure if the gate timer fires before the effect would flush.
  const doMoveRef = useRef(doMove);
  doMoveRef.current = doMove;

  const onMoveSettled = useCallback(() => {
    busyRef.current = false;
  }, []);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-SWIPE_THRESHOLD, SWIPE_THRESHOLD])
        .activeOffsetY([-SWIPE_THRESHOLD, SWIPE_THRESHOLD])
        .runOnJS(true)
        .onEnd((event, success) => {
          if (busyRef.current) return;
          if (!success) return;
          const dir = resolveSwipeDirection({ dx: event.translationX, dy: event.translationY });
          if (dir) doMoveRef.current(dir);
        }),
    []
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
        previews={{
          clean: previewFor(game.pendingSpawn),
          accelerated: previewFor(game.pendingSpawn),
        }}
      />
      <View style={[styles.content, { paddingTop: bandTop, paddingBottom: 24 + insets.bottom }]}>
        <View style={[styles.boardWrap, { width: boardSize, height: boardSize }]}>
          <GestureDetector gesture={panGesture}>
            <GameBoard board={game.board} moveResult={moveResult} width={boardSize} onMoveSettled={onMoveSettled} />
          </GestureDetector>
        </View>
        <Text style={styles.stats}>
          {stats
            ? `baseline: ${stats.fps.toFixed(1)} fps · p99 ${stats.p99Ms.toFixed(2)}ms · ${stats.frames} frames`
            : 'recording frame rate baseline…'}
        </Text>
        <Text style={styles.stats}>
          score: {match.score} · live best: {match.best} · persisted best: {persistedBest}
        </Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  boardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stats: {
    marginTop: 12,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});
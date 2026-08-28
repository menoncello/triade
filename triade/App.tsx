import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameBoard } from './src/render/GameBoard';
import { useFrameRateBaseline } from './src/render/useFrameRateBaseline';
import { newGame, move, isGameOver, ceilingDetector, tierForCeiling } from './src/engine/core/index.ts';
import type { Direction, GameState, MoveResult } from './src/engine/core/index.ts';
import { potForTier } from './src/engine/core/pot.ts';
import { applyMove, initialScore, isNewRecord } from './src/game/matchScore.ts';
import type { MatchScore } from './src/game/matchScore.ts';
import { initialStats, applyMoveStats } from './src/game/matchStats.ts';
import type { MatchStats } from './src/game/matchStats.ts';
import { previewFor } from './src/game/preview.ts';
import { GameOverOverlay } from './src/ui/GameOverOverlay.tsx';
import { LaneSelectScreen } from './src/ui/LaneSelectScreen.tsx';
import { HIT_TARGET } from './src/ui/PauseButton';
import { loadBest, saveBest, loadSettingsFromStorage, saveSettings } from './src/services/storage/settingsStore.ts';
import type { Settings } from './src/services/storage/schema.ts';
import { DEFAULT_SETTINGS } from './src/services/storage/schema.ts';
import { preloadAssets } from './src/services/assets/assetManifest.ts';
import { mulberry32 } from './src/utils/mulberry32.ts';
import { layoutFor, SAFE_MARGIN } from './src/ui/layout.ts';
import { SWIPE_THRESHOLD, resolveSwipeDirection } from './src/ui/swipe.ts';
import { Hud } from './src/ui/Hud';
import { laneFromIndex } from './src/game/lanes.ts';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

type Screen = 'laneSelect' | 'playing';

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
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [selectedLaneIndex, setSelectedLaneIndex] = useState<number>(DEFAULT_SETTINGS.laneDefault);
  const [screen, setScreen] = useState<Screen>('laneSelect');
  const [game, setGame] = useState<GameState>(() => newGame(rngRef.current));
  const [moveResult, setMoveResult] = useState<MoveResult | null>(null);
  const [match, setMatch] = useState<MatchScore>({ score: 0, best: 0 });
  const [matchStats, setMatchStats] = useState<MatchStats>(() => initialStats(game.board));

  useEffect(() => {
    // NFR-3: preload is fire-and-forget — a stalled preload degrades to defaults
    // instead of blocking launch; `ready` only gates on hydration (never hangs).
    void preloadAssets();
    let cancelled = false;
    (async () => {
      const [result, loadedSettings] = await Promise.all([loadBest(), loadSettingsFromStorage()]);
      if (cancelled) return;
      hydrationOkRef.current = result.ok;
      sessionStartBestRef.current = result.best;
      setPersistedBest(result.best);
      setMatch(initialScore(result.best));
      setSettings(loadedSettings);
      setSelectedLaneIndex(loadedSettings.laneDefault);
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

  const hasActiveMatch = match.score > 0 || matchStats.merges > 0;

  const applyLaneSelection = useCallback(
    (index: number) => {
      const needsReset = hasActiveMatch;
      if (index === selectedLaneIndex && !needsReset) return;
      // Changing lane always starts a new game (FR-11, D-008)
      if (needsReset) {
        const s = newGame(rngRef.current);
        setGame(s);
        setMoveResult(null);
        setMatch(initialScore(persistedBest));
        setMatchStats(initialStats(s.board));
        busyRef.current = false;
      }
      setSelectedLaneIndex(index);
      const nextSettings: Settings = { ...settings, laneDefault: index };
      setSettings(nextSettings);
      void saveSettings(nextSettings);
    },
    [hasActiveMatch, selectedLaneIndex, settings, persistedBest],
  );

  const handleJogar = useCallback(() => {
    // Jogar is one-tap shortcut into a game on the selected lane.
    // If already playing on same lane with active match, just show the game.
    // If no active match, ensure a fresh board (first game after install).
    if (!hasActiveMatch && match.score === 0) {
      // Fresh launch or after lane change that already reset — ensure board is fresh
      // (newGame already called by applyLaneSelection when needed).
    }
    setScreen('playing');
  }, [hasActiveMatch, match.score]);

  const handleBackToLaneSelect = useCallback(() => {
    setScreen('laneSelect');
  }, []);

  const doMove = useCallback(
    (dir: Direction) => {
      const result = move(game, dir, rngRef.current);
      setGame({ board: result.board, pendingSpawn: result.pendingSpawn });
      setMoveResult(result);
      setMatch((current) => applyMove(current, result));
      setMatchStats((prev) => applyMoveStats(prev, result.board, result));
      if (result.moved) {
        // T3.4 in-flight gate: an effective move animates; block further swipes
        // until the input gate re-opens (~30% of the animation, via GameBoard's
        // onMoveSettled timer). A noop (moved:false) produces an empty
        // transitionPlan — no animation runs, onMoveSettled never fires, so the
        // gate must only engage on real moves (noop deadlock guard).
        busyRef.current = true;
      }
    },
    [game],
  );

  const handleRestart = useCallback(() => {
    // AC6/7: forfeited continue dies with game-over — any per-match continue budget is discarded here (ADR-02)
    const s = newGame(rngRef.current);
    setGame(s);
    setMoveResult(null);
    setMatch(initialScore(persistedBest));
    setMatchStats(initialStats(s.board));
    busyRef.current = false;
  }, [persistedBest]);

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
    [],
  );

  if (!ready) {
    return (
      <View style={styles.container}>
        <Text style={styles.stats}>preloading bundled assets…</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Lane Select is the functional home surface (UX-DR-9)
  if (screen === 'laneSelect') {
    return (
      <View style={styles.container}>
        <LaneSelectScreen
          selectedIndex={selectedLaneIndex}
          hasActiveMatch={hasActiveMatch}
          insets={insets}
          onSelectLane={applyLaneSelection}
          onJogar={handleJogar}
        />
        <StatusBar style="auto" />
      </View>
    );
  }

  // FR-43 "only 3 available" semantics: the spawnable pot set is driven by the
  // live board ceiling, computed once per render and shared by both lane previews.
  const availablePot = potForTier(tierForCeiling(ceilingDetector(game.board)));

  const gameOver = isGameOver(game.board);
  const activeLaneId = laneFromIndex(selectedLaneIndex).id;

  return (
    <View style={styles.container}>
      <Hud
        score={match.score}
        best={match.best}
        isLandscape={isLandscape}
        insets={insets}
        bandHeight={bandHeight}
        activeLaneId={activeLaneId}
        previews={{
          clean: previewFor(game.pendingSpawn, availablePot),
          accelerated: previewFor(game.pendingSpawn, availablePot),
        }}
      />
      <View style={[styles.content, { paddingTop: bandTop, paddingBottom: 24 + insets.bottom }]}>
        <View style={[styles.boardWrap, { width: boardSize, height: boardSize }]}>
          <GestureDetector gesture={panGesture}>
            <GameBoard board={game.board} moveResult={moveResult} width={boardSize} onMoveSettled={onMoveSettled} />
          </GestureDetector>
        </View>
        <Pressable onPress={handleBackToLaneSelect} style={styles.menuBtn} accessibilityRole="button" accessibilityLabel="Pistas">
          <Text style={styles.menuLabel}>Pistas</Text>
        </Pressable>
        <Text style={styles.stats}>
          {stats
            ? `baseline: ${stats.fps.toFixed(1)} fps · p99 ${stats.p99Ms.toFixed(2)}ms · ${stats.frames} frames`
            : 'recording frame rate baseline…'}
        </Text>
        <Text style={styles.stats}>
          score: {match.score} · live best: {match.best} · persisted best: {persistedBest}
        </Text>
      </View>
      {gameOver ? (
        <GameOverOverlay
          stats={{
            score: match.score,
            best: match.best,
            maxTile: matchStats.maxTile,
            merges: matchStats.merges,
            longestStreak: matchStats.longestStreak,
          }}
          isNewRecord={isNewRecord(sessionStartBestRef.current, match.score)}
          onRestart={handleRestart}
          reducedMotion={false}
          insets={insets}
          activeLaneId={activeLaneId}
        />
      ) : null}
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
  menuBtn: {
    marginTop: 8,
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e7e4de',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1d23',
  },
  stats: {
    marginTop: 12,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
});

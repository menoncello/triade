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
import {
  loadAllBests,
  saveBestForLane,
  migrateLegacyBest,
  loadSettingsFromStorage,
  saveSettings,
} from './src/services/storage/settingsStore.ts';
import type { LaneId } from './src/services/storage/settingsStore.ts';
import type { Settings } from './src/services/storage/schema.ts';
import { DEFAULT_SETTINGS } from './src/services/storage/schema.ts';
import { preloadAssets } from './src/services/assets/assetManifest.ts';
import { mulberry32 } from './src/utils/mulberry32.ts';
import { layoutFor, SAFE_MARGIN } from './src/ui/layout.ts';
import { SWIPE_THRESHOLD, resolveSwipeDirection } from './src/ui/swipe.ts';
import { Hud } from './src/ui/Hud';
import { laneFromIndex, profileForLaneId } from './src/game/lanes.ts';
import {
  initialUndoBudget,
  initialHintBudget,
  initialContinueBudget,
  canUndo,
  consumeUndo,
  canHint,
  consumeHint,
  canContinue,
  consumeContinue,
  findMergeablePair,
} from './src/game/assistance.ts';
import type { UndoBudget, HintBudget, ContinueBudget } from './src/game/assistance.ts';
import { CeilingBanner, StuckBanner, RewardPrompt } from './src/ui/AcceleratedAids.tsx';

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

type Snapshot = { game: GameState; match: MatchScore; matchStats: MatchStats };

function AppContent() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { boardSize, bandHeight, isLandscape } = layoutFor({ width, height, insets });
  const bandTop = insets.top + SAFE_MARGIN + bandHeight;
  const stats = useFrameRateBaseline();
  const rngRef = useRef(mulberry32(20260808));
  const busyRef = useRef(false);
  const sessionStartBestByLaneRef = useRef<Record<LaneId, number>>({ clean: 0, accelerated: 0 });
  const hydrationOkByLaneRef = useRef<Record<LaneId, boolean>>({ clean: true, accelerated: true });
  const [ready, setReady] = useState(false);
  const [persistedBestByLane, setPersistedBestByLane] = useState<Record<LaneId, number>>({ clean: 0, accelerated: 0 });
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [selectedLaneIndex, setSelectedLaneIndex] = useState<number>(DEFAULT_SETTINGS.laneDefault);
  const [screen, setScreen] = useState<Screen>('laneSelect');
  const [game, setGame] = useState<GameState>(() => newGame(rngRef.current));
  const [moveResult, setMoveResult] = useState<MoveResult | null>(null);
  const [match, setMatch] = useState<MatchScore>({ score: 0, best: 0 });
  const [matchStats, setMatchStats] = useState<MatchStats>(() => initialStats(game.board));
  // 3.3 Accelerated per-match budgets (memory, die with match per ADR-02)
  const [undoHistory, setUndoHistory] = useState<Snapshot[]>([]);
  const [undoBudget, setUndoBudget] = useState<UndoBudget>(() => initialUndoBudget());
  const [hintBudget, setHintBudget] = useState<HintBudget>(() => initialHintBudget(5));
  const [continueBudget, setContinueBudget] = useState<ContinueBudget>(() => initialContinueBudget());
  const [hintHighlight, setHintHighlight] = useState<[[number, number], [number, number]] | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState({ ceiling: false, stuck: false });
  const [showUndoPrompt, setShowUndoPrompt] = useState(false);

  useEffect(() => {
    // NFR-3: preload is fire-and-forget — a stalled preload degrades to defaults
    // instead of blocking launch; `ready` only gates on hydration (never hangs).
    void preloadAssets();
    let cancelled = false;
    (async () => {
      const loadedSettings = await loadSettingsFromStorage();
      if (cancelled) return;
      // Migrate legacy single-key best to per-lane storage (once, non-destructive).
      await migrateLegacyBest(loadedSettings.laneDefault);
      const byLane = await loadAllBests();
      if (cancelled) return;
      hydrationOkByLaneRef.current = { clean: byLane.clean.ok, accelerated: byLane.accelerated.ok };
      sessionStartBestByLaneRef.current = { clean: byLane.clean.best, accelerated: byLane.accelerated.best };
      setPersistedBestByLane({ clean: byLane.clean.best, accelerated: byLane.accelerated.best });
      const activeLane: LaneId = loadedSettings.laneDefault === 1 ? 'accelerated' : 'clean';
      setMatch(initialScore(byLane[activeLane].best));
      setSettings(loadedSettings);
      setSelectedLaneIndex(loadedSettings.laneDefault);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist per-lane: only the active lane's best is ever written, gated on that
  // lane's session-start best (isNewRecord) and hydrationOk for that lane.
  useEffect(() => {
    const activeLaneId: LaneId = laneFromIndex(selectedLaneIndex).id as LaneId;
    if (!hydrationOkByLaneRef.current[activeLaneId]) return;
    if (
      isNewRecord(sessionStartBestByLaneRef.current[activeLaneId], match.best) &&
      match.best > persistedBestByLane[activeLaneId]
    ) {
      void saveBestForLane(activeLaneId, match.best).then((ok) => {
        if (ok) setPersistedBestByLane((prev) => ({ ...prev, [activeLaneId]: match.best }));
      });
    }
  }, [match.best, persistedBestByLane, selectedLaneIndex]);

  const hasActiveMatch = match.score > 0 || matchStats.merges > 0;

  const resetAssistance = useCallback(() => {
    setUndoHistory([]);
    setUndoBudget(initialUndoBudget());
    setHintBudget(initialHintBudget(5));
    setContinueBudget(initialContinueBudget());
    setHintHighlight(null);
    setBannerDismissed({ ceiling: false, stuck: false });
    setShowUndoPrompt(false);
  }, []);

  const applyLaneSelection = useCallback(
    (index: number) => {
      const needsReset = hasActiveMatch;
      if (index === selectedLaneIndex && !needsReset) return;
      const nextLaneId: LaneId = laneFromIndex(index).id as LaneId;
      // Changing lane always starts a new game (FR-11, D-008) — best is lane-scoped
      if (needsReset) {
        const s = newGame(rngRef.current);
        setGame(s);
        setMoveResult(null);
        setMatch(initialScore(persistedBestByLane[nextLaneId]));
        setMatchStats(initialStats(s.board));
        busyRef.current = false;
        resetAssistance();
      } else {
        // No active match: sync HUD best to the newly selected lane's persisted best
        setMatch(initialScore(persistedBestByLane[nextLaneId]));
      }
      setSelectedLaneIndex(index);
      const nextSettings: Settings = { ...settings, laneDefault: index };
      setSettings(nextSettings);
      void saveSettings(nextSettings);
    },
    [hasActiveMatch, selectedLaneIndex, settings, persistedBestByLane, resetAssistance],
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
      // Capture snapshot before move for undo history (only if effective)
      const snapshot: Snapshot = { game, match, matchStats };
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
        setUndoHistory((prev) => [...prev, snapshot]);
        // Hint highlight is one-shot, clear on next move
        setHintHighlight(null);
        // Any move clears undo prompt (ad prompt only between turns)
        setShowUndoPrompt(false);
      }
    },
    [game, match, matchStats],
  );

  const handleRestart = useCallback(() => {
    // AC6/7: forfeited continue dies with game-over — any per-match continue budget is discarded here (ADR-02)
    const activeLaneId: LaneId = laneFromIndex(selectedLaneIndex).id as LaneId;
    const s = newGame(rngRef.current);
    setGame(s);
    setMoveResult(null);
    setMatch(initialScore(persistedBestByLane[activeLaneId]));
    setMatchStats(initialStats(s.board));
    busyRef.current = false;
    setUndoHistory([]);
    setUndoBudget(initialUndoBudget());
    setHintBudget(initialHintBudget(5));
    setContinueBudget(initialContinueBudget());
    setHintHighlight(null);
    setBannerDismissed({ ceiling: false, stuck: false });
    setShowUndoPrompt(false);
  }, [persistedBestByLane, selectedLaneIndex]);

  // 3.3 Accelerated assistance handlers — gated by LaneProfile
  const activeLaneIdForHandlers = laneFromIndex(selectedLaneIndex).id;
  const activeProfile = profileForLaneId(activeLaneIdForHandlers);

  const handleUndoRequest = useCallback(() => {
    if (!activeProfile.canUndo) return;
    if (showUndoPrompt) return;
    if (!canUndo(undoBudget, undoHistory.length, activeProfile)) return;
    // Reward prompt at moment of need (between-turn, not mid-animation)
    if (busyRef.current) return;
    setShowUndoPrompt(true);
  }, [activeProfile, undoBudget, undoHistory.length, showUndoPrompt]);

  const handleUndoAd = useCallback(() => {
    const res = consumeUndo(undoBudget, undoHistory.length, activeProfile);
    if (!res.ok) {
      setShowUndoPrompt(false);
      return;
    }
    const snap = undoHistory[undoHistory.length - 1];
    if (!snap) {
      setShowUndoPrompt(false);
      return;
    }
    setUndoHistory((prev) => prev.slice(0, -1));
    setUndoBudget(res.budget);
    setGame(snap.game);
    setMatch(snap.match);
    setMatchStats(snap.matchStats);
    setMoveResult(null);
    setHintHighlight(null);
    busyRef.current = false;
    setShowUndoPrompt(false);
  }, [undoBudget, undoHistory, activeProfile]);

  const handleUndoIap = useCallback(() => {
    // Stub IAP path: same consume logic (Epic 4 will wire entitlements to iapRemaining/unlimited)
    // For 3.3 demo, treat IAP as granting 1 use if remaining else unlimited mock
    // If budget already has iapRemaining>0 or unlimited, consumeVia same path
    // Otherwise simulate IAP purchase of 1 by injecting remaining=1 then consuming
    let budgetForCheck = undoBudget;
    if (undoBudget.freeUsed && !undoBudget.unlimited && undoBudget.iapRemaining === 0) {
      // Simulate buying 1 undo pack for the prompt demo
      budgetForCheck = { ...undoBudget, iapRemaining: 1 };
    }
    const res = consumeUndo(budgetForCheck, undoHistory.length, activeProfile);
    if (!res.ok) {
      setShowUndoPrompt(false);
      return;
    }
    const snap = undoHistory[undoHistory.length - 1];
    if (!snap) {
      setShowUndoPrompt(false);
      return;
    }
    setUndoHistory((prev) => prev.slice(0, -1));
    setUndoBudget(res.budget);
    setGame(snap.game);
    setMatch(snap.match);
    setMatchStats(snap.matchStats);
    setMoveResult(null);
    setHintHighlight(null);
    busyRef.current = false;
    setShowUndoPrompt(false);
  }, [undoBudget, undoHistory, activeProfile]);

  const handleUndoCancel = useCallback(() => setShowUndoPrompt(false), []);

  const handleHint = useCallback(() => {
    if (busyRef.current) return;
    if (!canHint(hintBudget, game.board, activeProfile)) return;
    const pair = findMergeablePair(game.board);
    if (!pair) return;
    const res = consumeHint(hintBudget, game.board, activeProfile);
    if (!res.ok) return;
    setHintBudget(res.budget);
    setHintHighlight(pair);
  }, [hintBudget, game.board, activeProfile]);

  const handleContinueAd = useCallback(() => {
    const res = consumeContinue(continueBudget, activeProfile);
    if (!res.ok) return;
    const snap = undoHistory[undoHistory.length - 1];
    if (snap) {
      setUndoHistory((prev) => prev.slice(0, -1));
      setGame(snap.game);
      setMatch(snap.match);
      setMatchStats(snap.matchStats);
      setMoveResult(null);
    }
    setContinueBudget(res.budget);
    setHintHighlight(null);
    busyRef.current = false;
  }, [continueBudget, undoHistory, activeProfile]);

  const handleContinueIap = useCallback(() => {
    // Stub IAP for continue: same as ad path in 3.3 (Epic 4 owns entitlements)
    const res = consumeContinue(continueBudget, activeProfile);
    if (!res.ok) return;
    const snap = undoHistory[undoHistory.length - 1];
    if (snap) {
      setUndoHistory((prev) => prev.slice(0, -1));
      setGame(snap.game);
      setMatch(snap.match);
      setMatchStats(snap.matchStats);
      setMoveResult(null);
    }
    setContinueBudget(res.budget);
    setHintHighlight(null);
    busyRef.current = false;
  }, [continueBudget, undoHistory, activeProfile]);

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
  const profile = profileForLaneId(activeLaneId);
  // 3.3 banner relevance (contextual, dismissible, Accelerated only)
  const ceiling = ceilingDetector(game.board);
  const emptyCount = game.board.flat().filter((v) => v === null).length;
  const showCeilingBanner = profile.showLearningAids && !gameOver && !bannerDismissed.ceiling && ceiling >= 48;
  const showStuckBanner = profile.showLearningAids && !gameOver && !bannerDismissed.stuck && emptyCount <= 2;
  const canUndoDerived = profile.canUndo && canUndo(undoBudget, undoHistory.length, profile);
  const canHintDerived = profile.canHint && canHint(hintBudget, game.board, profile);
  const canContinueDerived = profile.canContinue && canContinue(continueBudget, profile);

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
        canUndo={canUndoDerived}
        canHint={canHintDerived}
        onUndo={handleUndoRequest}
        onHint={handleHint}
        hintHighlight={hintHighlight}
      />
      <View style={[styles.content, { paddingTop: bandTop, paddingBottom: 24 + insets.bottom }]}>
        <View style={[styles.boardWrap, { width: boardSize, height: boardSize }]}>
          <GestureDetector gesture={panGesture}>
            <GameBoard board={game.board} moveResult={moveResult} width={boardSize} onMoveSettled={onMoveSettled} hintHighlight={hintHighlight} />
          </GestureDetector>
        </View>
        {/* 3.3 Accelerated learning aids — contextual dismissible prompt-banners, never in Clean */}
        {showCeilingBanner ? <CeilingBanner onDismiss={() => setBannerDismissed((p) => ({ ...p, ceiling: true }))} /> : null}
        {showStuckBanner ? <StuckBanner onDismiss={() => setBannerDismissed((p) => ({ ...p, stuck: true }))} /> : null}
        {/* 3.3 Reward prompt for undo (between-turn, never during animation or gameOver) */}
        {activeLaneId === 'accelerated' && showUndoPrompt && !gameOver ? (
          <RewardPrompt title="Desfazer último movimento?" onAd={handleUndoAd} onIap={handleUndoIap} onCancel={handleUndoCancel} />
        ) : null}
        <Pressable onPress={handleBackToLaneSelect} style={styles.menuBtn} accessibilityRole="button" accessibilityLabel="Pistas">
          <Text style={styles.menuLabel}>Pistas</Text>
        </Pressable>
        <Text style={styles.stats}>
          {stats
            ? `baseline: ${stats.fps.toFixed(1)} fps · p99 ${stats.p99Ms.toFixed(2)}ms · ${stats.frames} frames`
            : 'recording frame rate baseline…'}
        </Text>
        <Text style={styles.stats}>
          score: {match.score} · live best: {match.best} · persisted best: {persistedBestByLane[activeLaneId as LaneId]}
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
          isNewRecord={isNewRecord(sessionStartBestByLaneRef.current[activeLaneId as LaneId], match.score)}
          onRestart={handleRestart}
          reducedMotion={false}
          insets={insets}
          activeLaneId={activeLaneId}
          canContinue={canContinueDerived}
          onContinueAd={handleContinueAd}
          onContinueIap={handleContinueIap}
          onContinueCancel={() => {}}
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

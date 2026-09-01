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
import {
  requestUndo as orchestratorRequestUndo,
  confirmUndoAd as orchestratorConfirmUndoAd,
  confirmUndoIap as orchestratorConfirmUndoIap,
  cancelUndo as orchestratorCancelUndo,
  requestHint as orchestratorRequestHint,
  purchaseHintPack as orchestratorPurchaseHintPack,
  purchaseUndoPack as orchestratorPurchaseUndoPack,
  applyNoAds as orchestratorApplyNoAds,
  consumeContinueAd as orchestratorConsumeContinueAd,
  consumeContinueIap as orchestratorConsumeContinueIap,
  canUndoForState as orchestratorCanUndoForState,
  canHintForState as orchestratorCanHintForState,
  canContinueForState as orchestratorCanContinueForState,
} from './src/game/matchOrchestrator.ts';
import type { OrchestratorState } from './src/game/matchOrchestrator.ts';
import { CeilingBanner, StuckBanner, RewardPrompt } from './src/ui/AcceleratedAids.tsx';
import { createRewardedAdGateway } from './src/services/monetization/rewardedAds.ts';
import { rewardedContinueUnitId } from './src/services/monetization/adsConfig.ts';
import { createPurchasesGateway } from './src/services/monetization/purchases.ts';
import { ENTITLEMENT_NO_ADS } from './src/services/monetization/purchaseConfig.ts';
import { getEntitlements } from './src/services/storage/entitlements.ts';
import type { Entitlements } from './src/services/storage/entitlements.ts';
import { TutorialOverlay } from './src/ui/TutorialOverlay.tsx';
import { createTutorialState, nextPhase, skipTutorial, isTutorialActive, has12MergeInResult } from './src/game/tutorial.ts';
import type { TutorialState } from './src/game/tutorial.ts';
import { ToneScreen } from './src/ui/ToneScreen.tsx';
import { triggerHapticsForTrace } from './src/feel/haptics.ts';
import { nextSessionBest } from './src/feel/bulletTime.ts';
import './src/i18n/index.ts';
import { i18n, getDeviceLanguage } from './src/i18n/index.ts';
import { useTranslation } from 'react-i18next';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

type Screen = 'tone' | 'laneSelect' | 'playing';

type Snapshot = { game: GameState; match: MatchScore; matchStats: MatchStats; sessionBestMerge?: number };

function AppContent() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { boardSize, bandHeight, isLandscape } = layoutFor({ width, height, insets });
  const bandTop = insets.top + SAFE_MARGIN + bandHeight;
  const stats = useFrameRateBaseline();
  const rngRef = useRef(mulberry32(20260808));
  const busyRef = useRef(false);
  const lastDirectionRef = useRef<Direction | null>(null);
  const adBusyRef = useRef(false);
  const purchaseBusyRef = useRef(false);
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
  const [sessionBestMerge, setSessionBestMerge] = useState<number>(0);
  // 3.3 Accelerated per-match budgets (memory, die with match per ADR-02)
  const [undoHistory, setUndoHistory] = useState<Snapshot[]>([]);
  const [undoBudget, setUndoBudget] = useState<UndoBudget>(() => initialUndoBudget());
  const [hintBudget, setHintBudget] = useState<HintBudget>(() => initialHintBudget(5));
  const [continueBudget, setContinueBudget] = useState<ContinueBudget>(() => initialContinueBudget());
  const [hintHighlight, setHintHighlight] = useState<[[number, number], [number, number]] | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState({ ceiling: false, stuck: false });
  const [showUndoPrompt, setShowUndoPrompt] = useState(false);
  const [entitlements, setEntitlements] = useState<Entitlements>({});
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [tutorialState, setTutorialState] = useState<TutorialState | null>(null);

  // Sync i18n language with Settings.language — immediate apply per UX-DR-30
  // Normalizes pt-BR/en-US etc to pt/en for i18next (supportedLngs)
  function normalizeLng(raw: string | undefined): 'pt' | 'en' {
    if (typeof raw === 'string' && raw.startsWith('pt')) return 'pt';
    if (typeof raw === 'string' && raw.startsWith('en')) return 'en';
    return 'en';
  }
  useEffect(() => {
    const lng = normalizeLng(settings.language);
    if (i18n.language !== lng) void i18n.changeLanguage(lng);
  }, [settings.language]);

  useEffect(() => {
    // NFR-3: preload is fire-and-forget — a stalled preload degrades to defaults
    // instead of blocking launch; `ready` only gates on hydration (never hangs).
    void preloadAssets();
    let cancelled = false;
    (async () => {
      let loadedSettings = await loadSettingsFromStorage();
      if (cancelled) return;
      // If no persisted language, pick up device locale via expo-localization (spec 5.4)
      try {
        const { hasPersistedLanguage } = await import('./src/services/storage/settingsStore.ts');
        const hasLang = await hasPersistedLanguage();
        if (!hasLang) {
          const deviceLng = getDeviceLanguage();
          if (deviceLng !== loadedSettings.language) {
            loadedSettings = { ...loadedSettings, language: deviceLng };
          }
        }
      } catch {}
      // Ensure i18n matches the hydrated (or device-derived) language before first render
      const lng2 = typeof loadedSettings.language === 'string' && loadedSettings.language.startsWith('pt') ? 'pt' : typeof loadedSettings.language === 'string' && loadedSettings.language.startsWith('en') ? 'en' : 'en';
      if (i18n.language !== lng2) {
        try {
          await i18n.changeLanguage(lng2);
        } catch {}
      }
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
      // Tone screen: first launch only — if not yet seen, show tone before laneSelect
      if (!loadedSettings.hasSeenToneScreen) {
        setScreen('tone');
      } else {
        setScreen('laneSelect');
      }
      // Hydrate entitlements (SecureStore authoritative offline, ADR-02) — No Ads unlimited re-derived
      try {
        const ent = await getEntitlements();
        if (!cancelled) {
          setEntitlements(ent);
          if (ent[ENTITLEMENT_NO_ADS]) {
            setUndoBudget((prev) => (prev.unlimited ? prev : { ...prev, unlimited: true }));
          }
        }
      } catch {
        // ignore
      }
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
    // Per-match udno budget dies with match (ADR-02) — re-derive unlimited from entitlements
    const base = initialUndoBudget();
    if (entitlements[ENTITLEMENT_NO_ADS]) base.unlimited = true;
    setUndoBudget(base);
    setHintBudget(initialHintBudget(5));
    setContinueBudget(initialContinueBudget());
    setHintHighlight(null);
    setBannerDismissed({ ceiling: false, stuck: false });
    setShowUndoPrompt(false);
  }, [entitlements]);

  const applyLaneSelection = useCallback(
    (index: number) => {
      const needsReset = hasActiveMatch;
      if (index === selectedLaneIndex && !needsReset) return;
      const nextLaneId: LaneId = laneFromIndex(index).id as LaneId;
      // S8.4 lane switch resets sessionBestMerge (new session) and clears direction
      lastDirectionRef.current = null;
      setSessionBestMerge(0);
      // Changing lane always starts a new game (FR-11, D-008) — best is lane-scoped
      if (needsReset) {
        const s = newGame(rngRef.current);
        setGame(s);
        setMoveResult(null);
        setMatch(initialScore(persistedBestByLane[nextLaneId]));
        setMatchStats(initialStats(s.board));
        busyRef.current = false;
        resetAssistance();
        // Tutorial: new lane may need its own 3-move sequence
        if (!settings.tutorialCompleted[nextLaneId]) {
          setTutorialState(createTutorialState(nextLaneId));
        } else {
          setTutorialState(null);
        }
      } else {
        // No active match: sync HUD best to the newly selected lane's persisted best
        setMatch(initialScore(persistedBestByLane[nextLaneId]));
        // 5.3 per-match banners die with match — reset even without active match so new lane's contextual help can appear
        setBannerDismissed({ ceiling: false, stuck: false });
        // Prepare tutorial for the newly selected lane if not yet completed
        if (!settings.tutorialCompleted[nextLaneId]) {
          setTutorialState(createTutorialState(nextLaneId));
        } else {
          setTutorialState(null);
        }
      }
      setSelectedLaneIndex(index);
      const nextSettings: Settings = { ...settings, laneDefault: index };
      setSettings(nextSettings);
      void saveSettings(nextSettings);
    },
    [hasActiveMatch, selectedLaneIndex, settings, persistedBestByLane, resetAssistance],
  );

  const handleJogar = useCallback(() => {
    const activeLaneIdForTutorial: LaneId = laneFromIndex(selectedLaneIndex).id as LaneId;
    const completed = settings.tutorialCompleted[activeLaneIdForTutorial];
    if (!completed && !tutorialState) {
      setTutorialState(createTutorialState(activeLaneIdForTutorial));
    } else if (completed && tutorialState && isTutorialActive(tutorialState)) {
      // Edge: flag was set elsewhere, clear stale active tutorial
      setTutorialState(null);
    }
    setScreen('playing');
  }, [hasActiveMatch, match.score, selectedLaneIndex, settings.tutorialCompleted, tutorialState]);

  const handleBackToLaneSelect = useCallback(() => {
    setScreen('laneSelect');
  }, []);

  const handleSkipTutorial = useCallback(() => {
    if (!tutorialState || !isTutorialActive(tutorialState)) return;
    const laneId = tutorialState.laneId;
    setTutorialState(null);
    busyRef.current = false;
    const nextSettings: Settings = {
      ...settings,
      tutorialCompleted: { ...settings.tutorialCompleted, [laneId]: true },
    };
    setSettings(nextSettings);
    void saveSettings(nextSettings);
  }, [tutorialState, settings]);

  const handleToneDismiss = useCallback(() => {
    setScreen('laneSelect');
    const nextSettings: Settings = { ...settings, hasSeenToneScreen: true };
    setSettings(nextSettings);
    void saveSettings(nextSettings);
  }, [settings]);

  const handleLanguageChange = useCallback(
    (lng: 'pt' | 'en') => {
      if (lng !== 'pt' && lng !== 'en') return;
      if (lng === settings.language) return;
      const nextSettings: Settings = { ...settings, language: lng };
      setSettings(nextSettings);
      void saveSettings(nextSettings);
      void i18n.changeLanguage(lng);
    },
    [settings],
  );

  const doMove = useCallback(
    (dir: Direction) => {
      // S8.3 capture swipe direction synchronously before move() for directional shake
      lastDirectionRef.current = dir;
      // Capture snapshot before move for undo history (only if effective)
      const snapshot: Snapshot = { game, match, matchStats, sessionBestMerge };
      const result = move(game, dir, rngRef.current);
      setGame({ board: result.board, pendingSpawn: result.pendingSpawn });
      setMoveResult(result);
      setMatch((current) => applyMove(current, result));
      setMatchStats((prev) => applyMoveStats(prev, result.board, result));
      // S8.4 sessionBestMerge — use functional update to avoid stale closure on rapid moves
      setSessionBestMerge((prev) => nextSessionBest(result.trace, prev));
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
        // Tutorial progression — only on effective moves (NOOP stays on same phase)
        if (tutorialState && isTutorialActive(tutorialState)) {
          const did12Before = tutorialState.phase === 'merge12';
          const next = nextPhase(tutorialState, result);
          // Light haptic on the 1+2→3 climax (best-effort, never blocks)
          if (did12Before && next.phase !== 'merge12' && has12MergeInResult(result)) {
            try {
              // @ts-ignore expo-haptics optional — SDK 57 pinned, may not be installed in test env
              void import('expo-haptics')
                .then((mod: any) => mod.impactAsync(mod.ImpactFeedbackStyle.Light))
                .catch(() => {});
            } catch {}
          }
          if (next.phase === 'completed') {
            const laneId = next.laneId;
            setTutorialState(null);
            const nextSettings: Settings = {
              ...settings,
              tutorialCompleted: { ...settings.tutorialCompleted, [laneId]: true },
            };
            setSettings(nextSettings);
            void saveSettings(nextSettings);
          } else {
            setTutorialState(next);
          }
        }
        // 8-1 Haptics — scaled by merge value (FR-30: stays under Reduced Motion)
        // Observes trace merge entries (from.length===2, spawned===false) and fires via feel gateway.
        // Best-effort, never throws, never blocks move dispatch.
        try {
          triggerHapticsForTrace(result.trace);
        } catch {}
      }
    },
    [game, match, matchStats, sessionBestMerge, tutorialState, settings],
  );

  const handleRestart = useCallback(() => {
    // S8.3 clear last swipe direction on new game — board shake resets
    lastDirectionRef.current = null;
    setSessionBestMerge(0);
    // AC6/7: forfeited continue dies with game-over — any per-match continue budget is discarded here (ADR-02)
    const activeLaneId: LaneId = laneFromIndex(selectedLaneIndex).id as LaneId;
    const s = newGame(rngRef.current);
    setGame(s);
    setMoveResult(null);
    setMatch(initialScore(persistedBestByLane[activeLaneId]));
    setMatchStats(initialStats(s.board));
    busyRef.current = false;
    setUndoHistory([]);
    const base = initialUndoBudget();
    if (entitlements[ENTITLEMENT_NO_ADS]) base.unlimited = true;
    setUndoBudget(base);
    setHintBudget(initialHintBudget(5));
    setContinueBudget(initialContinueBudget());
    setHintHighlight(null);
    setBannerDismissed({ ceiling: false, stuck: false });
    setShowUndoPrompt(false);
  }, [persistedBestByLane, selectedLaneIndex, entitlements]);

  // 3.3 Accelerated assistance handlers — gated by LaneProfile
  const activeLaneIdForHandlers = laneFromIndex(selectedLaneIndex).id;
  const activeProfile = profileForLaneId(activeLaneIdForHandlers);
  const hasNoAds = entitlements[ENTITLEMENT_NO_ADS] === true;

  const handleUndoRequest = useCallback(() => {
    // No Ads + Unlimited suppresses prompt — direct rewind without ad
    if (hasNoAds && activeProfile.canUndo) {
      if (busyRef.current) return;
      if (undoHistory.length <= 0) return;
      const tmp: OrchestratorState = {
        undoHistory,
        undoBudget,
        hintBudget,
        continueBudget,
        hintHighlight,
        bannerDismissed,
        showUndoPrompt,
      };
      const res = orchestratorConfirmUndoAd(tmp, activeProfile);
      if (!res.ok || !res.snapshot) return;
      const snap = res.snapshot;
      setUndoHistory(res.state.undoHistory);
      setUndoBudget(res.state.undoBudget);
      setHintHighlight(res.state.hintHighlight);
      setShowUndoPrompt(res.state.showUndoPrompt);
      setGame(snap.game);
      setMatch(snap.match);
      setMatchStats(snap.matchStats);
      setSessionBestMerge(Number.isFinite(snap.sessionBestMerge) ? snap.sessionBestMerge as number : 0);
      setMoveResult(null);
      busyRef.current = false;
      return;
    }
    const tmp: OrchestratorState = {
      undoHistory,
      undoBudget,
      hintBudget,
      continueBudget,
      hintHighlight,
      bannerDismissed,
      showUndoPrompt,
    };
    const res = orchestratorRequestUndo(tmp, activeProfile, busyRef.current);
    if (!res.ok) return;
    setShowUndoPrompt(true);
  }, [activeProfile, undoBudget, undoHistory, hintBudget, continueBudget, hintHighlight, bannerDismissed, showUndoPrompt, hasNoAds]);

  const handleUndoAd = useCallback(async () => {
    if (adBusyRef.current) return;
    adBusyRef.current = true;
    try {
      const maybeMock = (globalThis as unknown as { __triadeRewardedAdMock?: { loadAndShow: () => Promise<{ granted: boolean }> } })
        .__triadeRewardedAdMock;
      const gateway = maybeMock ?? createRewardedAdGateway();
      const adRes = await gateway.loadAndShow();
      if (!adRes.granted) {
        setShowUndoPrompt(false);
        return;
      }
      const tmp: OrchestratorState = {
        undoHistory,
        undoBudget,
        hintBudget,
        continueBudget,
        hintHighlight,
        bannerDismissed,
        showUndoPrompt,
      };
      const res = orchestratorConfirmUndoAd(tmp, activeProfile);
      if (!res.ok || !res.snapshot) {
        setShowUndoPrompt(false);
        return;
      }
      const snap = res.snapshot;
      setUndoHistory(res.state.undoHistory);
      setUndoBudget(res.state.undoBudget);
      setHintHighlight(res.state.hintHighlight);
      setShowUndoPrompt(res.state.showUndoPrompt);
      setGame(snap.game);
      setMatch(snap.match);
      setMatchStats(snap.matchStats);
      setSessionBestMerge(Number.isFinite(snap.sessionBestMerge) ? snap.sessionBestMerge as number : 0);
      setMoveResult(null);
      busyRef.current = false;
    } finally {
      adBusyRef.current = false;
    }
  }, [undoBudget, undoHistory, activeProfile, hintBudget, continueBudget, hintHighlight, bannerDismissed, showUndoPrompt]);

  const handleUndoIap = useCallback(() => {
    const tmp: OrchestratorState = {
      undoHistory,
      undoBudget,
      hintBudget,
      continueBudget,
      hintHighlight,
      bannerDismissed,
      showUndoPrompt,
    };
    const res = orchestratorConfirmUndoIap(tmp, activeProfile);
    if (!res.ok || !res.snapshot) {
      setShowUndoPrompt(false);
      return;
    }
    const snap = res.snapshot;
    setUndoHistory(res.state.undoHistory);
    setUndoBudget(res.state.undoBudget);
    setHintHighlight(res.state.hintHighlight);
    setShowUndoPrompt(res.state.showUndoPrompt);
    setGame(snap.game);
    setMatch(snap.match);
    setMatchStats(snap.matchStats);
    setSessionBestMerge(Number.isFinite(snap.sessionBestMerge) ? snap.sessionBestMerge as number : 0);
    setMoveResult(null);
    busyRef.current = false;
  }, [undoBudget, undoHistory, activeProfile, hintBudget, continueBudget, hintHighlight, bannerDismissed, showUndoPrompt]);

  const handleUndoCancel = useCallback(() => {
    const tmp: OrchestratorState = {
      undoHistory,
      undoBudget,
      hintBudget,
      continueBudget,
      hintHighlight,
      bannerDismissed,
      showUndoPrompt,
    };
    const next = orchestratorCancelUndo(tmp);
    setShowUndoPrompt(next.showUndoPrompt);
  }, [undoHistory, undoBudget, hintBudget, continueBudget, hintHighlight, bannerDismissed, showUndoPrompt]);

  const handleHint = useCallback(() => {
    const tmp: OrchestratorState = {
      undoHistory,
      undoBudget,
      hintBudget,
      continueBudget,
      hintHighlight,
      bannerDismissed,
      showUndoPrompt,
    };
    const res = orchestratorRequestHint(tmp, game.board, activeProfile, busyRef.current);
    if (!res.ok) return;
    setHintBudget(res.state.hintBudget);
    setHintHighlight(res.state.hintHighlight);
  }, [hintBudget, game.board, activeProfile, undoHistory, undoBudget, continueBudget, hintHighlight, bannerDismissed, showUndoPrompt]);

  const handleHintPurchase = useCallback(async () => {
    if (purchaseBusyRef.current || adBusyRef.current) return;
    if (!activeProfile.canHint) return;
    purchaseBusyRef.current = true;
    try {
      const maybeMock = (globalThis as unknown as { __triadePurchasesMock?: { purchaseHintPack: () => Promise<{ granted: boolean }> } })
        .__triadePurchasesMock;
      const gateway = maybeMock ?? createPurchasesGateway();
      const res = await gateway.purchaseHintPack();
      if (!res.granted) return;
      // Use functional update to avoid stale closure after await
      setHintBudget((prev) => {
        if (!activeProfile.canHint) return prev;
        const next = prev.remaining + 5;
        if (!Number.isSafeInteger(next) || next > 999) return { remaining: 999 };
        return { remaining: next };
      });
      try {
        const ent = await getEntitlements();
        setEntitlements(ent);
      } catch {
        // ignore
      }
    } finally {
      purchaseBusyRef.current = false;
    }
  }, [activeProfile]);

  const handleUndoPurchase = useCallback(async () => {
    if (purchaseBusyRef.current || adBusyRef.current) return;
    if (!activeProfile.canUndo) return;
    purchaseBusyRef.current = true;
    try {
      const maybeMock = (globalThis as unknown as { __triadePurchasesMock?: { purchaseUndoPack: () => Promise<{ granted: boolean }>; purchaseNoAds?: () => Promise<{ granted: boolean }> } })
        .__triadePurchasesMock;
      let granted = false;
      if (maybeMock?.purchaseUndoPack) {
        const res = await maybeMock.purchaseUndoPack();
        granted = res.granted;
      } else {
        const gateway = createPurchasesGateway();
        const res = await gateway.purchaseUndoPack();
        granted = res.granted;
      }
      if (!granted) return;
      const tmp: OrchestratorState = {
        undoHistory,
        undoBudget,
        hintBudget,
        continueBudget,
        hintHighlight,
        bannerDismissed,
        showUndoPrompt,
      };
      const nextState = orchestratorPurchaseUndoPack(tmp, activeProfile);
      setUndoBudget(nextState.undoBudget);
      try {
        const ent = await getEntitlements();
        setEntitlements(ent);
      } catch {
        // ignore
      }
    } finally {
      purchaseBusyRef.current = false;
    }
  }, [activeProfile, undoBudget, undoHistory, hintBudget, continueBudget, hintHighlight, bannerDismissed, showUndoPrompt]);

  const handleNoAdsPurchase = useCallback(async () => {
    if (purchaseBusyRef.current || adBusyRef.current) return;
    if (!activeProfile.canUndo) return;
    purchaseBusyRef.current = true;
    try {
      const maybeMock = (globalThis as unknown as { __triadePurchasesMock?: { purchaseNoAds: () => Promise<{ granted: boolean }>; purchaseUndoPack?: () => Promise<{ granted: boolean }> } })
        .__triadePurchasesMock;
      let granted = false;
      if (maybeMock?.purchaseNoAds) {
        const res = await maybeMock.purchaseNoAds();
        granted = res.granted;
      } else {
        const gateway = createPurchasesGateway();
        const res = await gateway.purchaseNoAds();
        granted = res.granted;
      }
      if (!granted) return;
      const tmp: OrchestratorState = {
        undoHistory,
        undoBudget,
        hintBudget,
        continueBudget,
        hintHighlight,
        bannerDismissed,
        showUndoPrompt,
      };
      const nextState = orchestratorApplyNoAds(tmp, activeProfile);
      setUndoBudget(nextState.undoBudget);
      try {
        const ent = await getEntitlements();
        setEntitlements(ent);
      } catch {
        // ignore
      }
      setShowUndoPrompt(false);
    } finally {
      purchaseBusyRef.current = false;
    }
  }, [activeProfile, undoBudget, undoHistory, hintBudget, continueBudget, hintHighlight, bannerDismissed, showUndoPrompt]);

  const handleContinueAd = useCallback(async () => {
    if (hasNoAds && activeProfile.canContinue) { const tmp: OrchestratorState = { undoHistory, undoBudget, hintBudget, continueBudget, hintHighlight, bannerDismissed, showUndoPrompt }; const res = orchestratorConsumeContinueAd(tmp, activeProfile); if (!res.ok) return; if (res.snapshot) { setUndoHistory(res.state.undoHistory); setGame(res.snapshot.game); setMatch(res.snapshot.match); setMatchStats(res.snapshot.matchStats); setSessionBestMerge(Number.isFinite(res.snapshot.sessionBestMerge) ? res.snapshot.sessionBestMerge as number : 0); setMoveResult(null); } setContinueBudget(res.state.continueBudget); setHintHighlight(res.state.hintHighlight); setShowUndoPrompt(res.state.showUndoPrompt); busyRef.current = false; return; }
    if (adBusyRef.current) return;
    // Lane wall: allowAds/canContinue gated via canContinueDerived but also guard here if profile blocks
    if (!activeProfile.allowAds || !activeProfile.canContinue) return;
    // Only meaningful when gameOver; App already only mounts Continue slot when gameOver, but guard for programmatic calls
    // Do not block if game not over? The orchestrator will reject if budget not available anyway.
    adBusyRef.current = true;
    try {
      const maybeMock = (globalThis as unknown as { __triadeRewardedAdMock?: { loadAndShow: () => Promise<{ granted: boolean }> } })
        .__triadeRewardedAdMock;
      const gateway = maybeMock ?? createRewardedAdGateway(rewardedContinueUnitId());
      const adRes = await gateway.loadAndShow();
      if (!adRes.granted) {
        return;
      }
      const tmp: OrchestratorState = {
        undoHistory,
        undoBudget,
        hintBudget,
        continueBudget,
        hintHighlight,
        bannerDismissed,
        showUndoPrompt,
      };
      const res = orchestratorConsumeContinueAd(tmp, activeProfile);
      if (!res.ok) return;
      if (res.snapshot) {
        setUndoHistory(res.state.undoHistory);
        setGame(res.snapshot.game);
        setMatch(res.snapshot.match);
        setMatchStats(res.snapshot.matchStats);
        setSessionBestMerge(Number.isFinite(res.snapshot.sessionBestMerge) ? res.snapshot.sessionBestMerge as number : 0);
        setMoveResult(null);
      }
      setContinueBudget(res.state.continueBudget);
      setHintHighlight(res.state.hintHighlight);
      setShowUndoPrompt(res.state.showUndoPrompt);
      busyRef.current = false;
    } finally {
      adBusyRef.current = false;
    }
  }, [continueBudget, undoHistory, activeProfile, undoBudget, hintBudget, hintHighlight, bannerDismissed, showUndoPrompt, hasNoAds]);

  const handleContinueIap = useCallback(() => {
    const tmp: OrchestratorState = {
      undoHistory,
      undoBudget,
      hintBudget,
      continueBudget,
      hintHighlight,
      bannerDismissed,
      showUndoPrompt,
    };
    const res = orchestratorConsumeContinueIap(tmp, activeProfile);
    if (!res.ok) return;
    if (res.snapshot) {
      setUndoHistory(res.state.undoHistory);
      setGame(res.snapshot.game);
      setMatch(res.snapshot.match);
      setMatchStats(res.snapshot.matchStats);
      setSessionBestMerge(Number.isFinite(res.snapshot.sessionBestMerge) ? res.snapshot.sessionBestMerge as number : 0);
      setMoveResult(null);
    }
    setContinueBudget(res.state.continueBudget);
    setHintHighlight(res.state.hintHighlight);
    setShowUndoPrompt(res.state.showUndoPrompt);
    busyRef.current = false;
  }, [continueBudget, undoHistory, activeProfile, undoBudget, hintBudget, hintHighlight, bannerDismissed, showUndoPrompt]);

  const handleContinueCancel = useCallback(() => {
    // Cancel leaves budget and board untouched; primary CTA remains usable.
    // No state mutation needed — continue slot stays gated by canContinueDerived if still true (retry allowed).
  }, []);

  const handleRestorePurchases = useCallback(async () => {
    if (purchaseBusyRef.current || adBusyRef.current || restoreBusy) return;
    // Single-monetization guard — also respects global gateway busy
    purchaseBusyRef.current = true;
    setRestoreBusy(true);
    try {
      const gateway = createPurchasesGateway();
      const result = await gateway.restorePurchases();
      setEntitlements(result.entitlements);
      // Re-derive unlimited from entitlements; per-match budgets never restored
      if (result.entitlements[ENTITLEMENT_NO_ADS] === true) {
        setUndoBudget((prev) => (prev.unlimited ? prev : { ...prev, unlimited: true }));
      }
    } catch {
      // never throw to UI, leave board/budgets untouched
    } finally {
      purchaseBusyRef.current = false;
      setRestoreBusy(false);
    }
  }, [restoreBusy]);

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

  if (screen === 'tone') {
    return (
      <View style={styles.container}>
        <ToneScreen insets={insets} onDismiss={handleToneDismiss} />
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
          onRestorePurchases={handleRestorePurchases}
          restoreBusy={restoreBusy}
          language={(typeof settings.language === 'string' && settings.language.startsWith('pt') ? 'pt' : 'en') as 'pt' | 'en'}
          onLanguageChange={handleLanguageChange}
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
  const tmpForGates: OrchestratorState = {
    undoHistory,
    undoBudget,
    hintBudget,
    continueBudget,
    hintHighlight,
    bannerDismissed,
    showUndoPrompt,
  };
  const canUndoDerived = orchestratorCanUndoForState(tmpForGates, profile);
  const canHintDerived = orchestratorCanHintForState(tmpForGates, game.board, profile);
  const canContinueDerived = orchestratorCanContinueForState(tmpForGates, profile);

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
            <GameBoard
              board={game.board}
              moveResult={moveResult}
              width={boardSize}
              reducedMotion={settings.reducedMotion}
              sessionBestMerge={sessionBestMerge}
              onMoveSettled={onMoveSettled}
              hintHighlight={hintHighlight}
              direction={lastDirectionRef.current ?? undefined}
            />
          </GestureDetector>
        </View>
        {/* 3.3 Accelerated learning aids — contextual dismissible prompt-banners, never in Clean */}
        {showCeilingBanner ? <CeilingBanner onDismiss={() => setBannerDismissed((p) => ({ ...p, ceiling: true }))} /> : null}
        {showStuckBanner ? <StuckBanner onDismiss={() => setBannerDismissed((p) => ({ ...p, stuck: true }))} /> : null}
        {/* 3.3 Reward prompt for undo (between-turn, never during animation or gameOver) — suppressed when hasNoAds (unlimited owners rewind immediately) */}
        {activeLaneId === 'accelerated' && showUndoPrompt && !gameOver && !hasNoAds ? (
          <RewardPrompt title={t('reward.undo')} onAd={handleUndoAd} onIap={handleUndoPurchase} onCancel={handleUndoCancel} />
        ) : null}
        {/* 4.4 Undo 3-pack purchase prompt — only Accelerated when undo exhausted but history exists, not hasNoAds */}
        {activeLaneId === 'accelerated' && !canUndoDerived && undoHistory.length > 0 && !hasNoAds && !showUndoPrompt && !gameOver ? (
          <RewardPrompt title={t('reward.noUndo')} onAd={() => {}} onIap={handleUndoPurchase} onCancel={() => {}} />
        ) : null}
        {/* 4.3 Hint 5-pack purchase prompt — only Accelerated when hints exhausted (no canHint) AND board has pair, Clean never mounts */}
        {activeLaneId === 'accelerated' && !canHintDerived && hintBudget.remaining === 0 && hintHighlight === null && !gameOver && findMergeablePair(game.board) !== null ? (
          <RewardPrompt title={t('reward.noHint')} onAd={() => {}} onIap={handleHintPurchase} onCancel={() => {}} />
        ) : null}
        {tutorialState && isTutorialActive(tutorialState) ? (
          <TutorialOverlay phase={tutorialState.phase} insets={insets} onSkip={handleSkipTutorial} />
        ) : null}
        <Pressable onPress={handleBackToLaneSelect} style={styles.menuBtn} accessibilityRole="button" accessibilityLabel={t('laneSelect.pistas')}>
          <Text style={styles.menuLabel}>{t('laneSelect.pistas')}</Text>
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
          onContinueCancel={handleContinueCancel}
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

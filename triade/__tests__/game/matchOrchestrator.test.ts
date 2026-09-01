import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialOrchestratorState,
  canUndoForState,
  canHintForState,
  canContinueForState,
  requestUndo,
  confirmUndoAd,
  confirmUndoIap,
  cancelUndo,
  requestHint,
  consumeContinueAd,
  consumeContinueIap,
  resetForNewMatch,
  pushHistory,
} from '../../src/game/matchOrchestrator.ts';
import { LANE_PROFILES } from '../../src/game/lanes.ts';
import { initialUndoBudget } from '../../src/game/assistance.ts';

const clean = LANE_PROFILES.clean;
const acc = LANE_PROFILES.accelerated;

function snap(n = 1): any {
  return {
    game: { board: [[n, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], pendingSpawn: { value: 1, displayRoll: 0.1 } },
    match: { score: n, best: n },
    matchStats: { maxTile: n, merges: 1, longestStreak: 1, currentStreak: 1 },
  };
}

describe('matchOrchestrator — Lane Wall contract (N2)', () => {
  it('initial state is clean budgets and empty history', () => {
    const s = initialOrchestratorState();
    assert.equal(s.undoHistory.length, 0);
    assert.deepEqual(s.undoBudget, { freeUsed: false, iapRemaining: 0, unlimited: false });
    assert.deepEqual(s.hintBudget, { remaining: 5 });
    assert.deepEqual(s.continueBudget, { used: false });
    assert.equal(s.hintHighlight, null);
    assert.deepEqual(s.bannerDismissed, { ceiling: false, stuck: false });
    assert.equal(s.showUndoPrompt, false);
  });

  it('Clean: canUndo/canHint/canContinue always false', () => {
    const withHistory = { ...initialOrchestratorState(), undoHistory: [snap()] };
    assert.equal(canUndoForState(withHistory, clean), false);
    const boardWithPair: any = [[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
    assert.equal(canHintForState({ ...initialOrchestratorState(), hintBudget: { remaining: 5 } } as any, boardWithPair, clean), false);
    assert.equal(canContinueForState(initialOrchestratorState(), clean), false);
  });

  it('Clean: requestUndo/confirmUndoAd/confirmUndoIap/hint/continue all rejected with no mutation', () => {
    const base = { ...initialOrchestratorState(), undoHistory: [snap()], hintBudget: { remaining: 5 }, continueBudget: { used: false } };
    const copy = JSON.parse(JSON.stringify(base));
    assert.equal(requestUndo(base, clean, false).ok, false);
    assert.equal(confirmUndoAd(base, clean).ok, false);
    assert.equal(confirmUndoIap(base, clean).ok, false);
    const boardWithPair: any = [[3, 3, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
    assert.equal(requestHint(base, boardWithPair, clean, false).ok, false);
    assert.equal(consumeContinueAd(base, clean).ok, false);
    assert.equal(consumeContinueIap(base, clean).ok, false);
    assert.deepEqual(base, copy);
  });

  it('Accelerated: canUndo true with history and free, requestUndo shows prompt', () => {
    const s = { ...initialOrchestratorState(), undoHistory: [snap()] };
    assert.equal(canUndoForState(s, acc), true);
    const r = requestUndo(s, acc, false);
    assert.equal(r.ok, true);
    assert.equal(r.state.showUndoPrompt, true);
    assert.equal(s.showUndoPrompt, false);
  });

  it('Accelerated: requestUndo blocked when busy or already showing', () => {
    const s = { ...initialOrchestratorState(), undoHistory: [snap()] };
    assert.equal(requestUndo(s, acc, true).ok, false);
    const showing = { ...s, showUndoPrompt: true };
    assert.equal(requestUndo(showing, acc, false).ok, false);
  });

  it('Accelerated: confirmUndoAd consumes freeUsed and pops exactly one, rewinds snapshot', () => {
    const s1 = snap(10);
    const s2 = snap(20);
    let state = { ...initialOrchestratorState(), undoHistory: [s1, s2] };
    const r1 = confirmUndoAd(state, acc);
    assert.equal(r1.ok, true);
    assert.equal(r1.state.undoBudget.freeUsed, true);
    assert.equal(r1.state.undoHistory.length, 1);
    assert.equal(r1.snapshot, s2);
    assert.equal(r1.state.showUndoPrompt, false);
    assert.equal(r1.state.hintHighlight, null);
    state = r1.state;
    const r2 = confirmUndoAd(state, acc);
    assert.equal(r2.ok, false);
  });

  it('Accelerated: second free undo blocked, IAP and unlimited override', () => {
    const s = snap();
    let state = { ...initialOrchestratorState(), undoHistory: [s, snap()], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    assert.equal(canUndoForState(state, acc), false);
    assert.equal(confirmUndoAd(state, acc).ok, false);
    state = { ...state, undoBudget: { freeUsed: true, iapRemaining: 2, unlimited: false } };
    assert.equal(canUndoForState(state, acc), true);
    const r = confirmUndoAd(state, acc);
    assert.equal(r.ok, true);
    assert.equal(r.state.undoBudget.iapRemaining, 1);
    state = { ...initialOrchestratorState(), undoHistory: [s], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: true } };
    assert.equal(canUndoForState(state, acc), true);
    assert.equal(confirmUndoAd(state, acc).ok, true);
  });

  it('confirmUndoAd does not mutate caller', () => {
    const state = { ...initialOrchestratorState(), undoHistory: [snap()] };
    const copy = { ...state, undoHistory: [...state.undoHistory], undoBudget: { ...state.undoBudget } };
    confirmUndoAd(state, acc);
    assert.deepEqual(state.undoHistory.length, copy.undoHistory.length);
    assert.deepEqual(state.undoBudget, copy.undoBudget);
  });

  it('confirmUndoIap injects one when freeUsed and no remaining', () => {
    const state = { ...initialOrchestratorState(), undoHistory: [snap()], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    const r = confirmUndoIap(state, acc);
    assert.equal(r.ok, true);
    assert.equal(r.state.undoBudget.freeUsed, true);
    assert.equal(r.state.undoBudget.iapRemaining, 0);
  });

  it('cancelUndo clears prompt', () => {
    const state = { ...initialOrchestratorState(), showUndoPrompt: true };
    const next = cancelUndo(state);
    assert.equal(next.showUndoPrompt, false);
    assert.equal(cancelUndo(next).showUndoPrompt, false);
  });

  it('requestHint gates by profile, budget, pair and busy, consumes and highlights', () => {
    const boardWithPair: any = [[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
    const boardNoPair: any = [[1, 1, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
    const base = initialOrchestratorState();
    assert.equal(requestHint(base, boardWithPair, clean, false).ok, false);
    assert.equal(requestHint(base, boardWithPair, acc, true).ok, false);
    assert.equal(requestHint(base, boardNoPair, acc, false).ok, false);
    assert.equal(requestHint({ ...base, hintBudget: { remaining: 0 } }, boardWithPair, acc, false).ok, false);
    const ok = requestHint(base, boardWithPair, acc, false);
    assert.equal(ok.ok, true);
    assert.ok(ok.state.hintHighlight !== null);
    assert.equal(ok.state.hintBudget.remaining, 4);
    assert.ok(ok.pair);
  });

  it('requestHint does not expose pendingSpawn or direction', () => {
    const board: any = [[3, 3, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]];
    const r = requestHint(initialOrchestratorState(), board, acc, false);
    assert.equal(r.ok, true);
    const [[r1, c1], [r2, c2]] = r.pair!;
    assert.ok(Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1);
  });

  it('consumeContinue once per game-over, then blocked', () => {
    let state = { ...initialOrchestratorState(), undoHistory: [snap()] };
    const r1 = consumeContinueAd(state, acc);
    assert.equal(r1.ok, true);
    assert.equal(r1.state.continueBudget.used, true);
    assert.equal(r1.snapshot, state.undoHistory[0]);
    const r2 = consumeContinueAd(r1.state, acc);
    assert.equal(r2.ok, false);
    const r3 = consumeContinueIap(r1.state, acc);
    assert.equal(r3.ok, false);
  });

  it('consumeContinue Clean always rejected', () => {
    const state = initialOrchestratorState();
    assert.equal(consumeContinueAd(state, clean).ok, false);
    assert.equal(consumeContinueIap(state, clean).ok, false);
  });

  it('resetForNewMatch dies with match — clears history budgets highlight banners prompt', () => {
    let state = {
      ...initialOrchestratorState(),
      undoHistory: [snap(), snap()],
      undoBudget: { freeUsed: true, iapRemaining: 5, unlimited: true },
      hintBudget: { remaining: 1 },
      continueBudget: { used: true },
      hintHighlight: [[0, 0], [0, 1]] as [[number, number], [number, number]],
      bannerDismissed: { ceiling: true, stuck: true },
      showUndoPrompt: true,
    };
    const next = resetForNewMatch(state);
    assert.equal(next.undoHistory.length, 0);
    assert.deepEqual(next.undoBudget, initialUndoBudget());
    assert.deepEqual(next.hintBudget, { remaining: 5 });
    assert.deepEqual(next.continueBudget, { used: false });
    assert.equal(next.hintHighlight, null);
    assert.deepEqual(next.bannerDismissed, { ceiling: false, stuck: false });
    assert.equal(next.showUndoPrompt, false);
  });

  it('pushHistory appends snapshot', () => {
    const state = initialOrchestratorState();
    const s = snap();
    const next = pushHistory(state, s);
    assert.equal(next.undoHistory.length, 1);
    assert.equal(next.undoHistory[0], s);
    assert.equal(state.undoHistory.length, 0);
  });

  it('matchOrchestrator is pure — no RN/Expo/Skia/MMKV imports', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../src/game/matchOrchestrator.ts'), 'utf8');
    const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(stripped, /from\s+['"]react-native['"]/);
    assert.doesNotMatch(stripped, /from\s+['"]expo-/);
    assert.doesNotMatch(stripped, /from\s+['"]react-native-mmkv['"]/);
    assert.doesNotMatch(stripped, /from\s+['"]@shopify\/react-native-skia['"]/);
    assert.doesNotMatch(stripped, /Math\.random/);
  });

  it('lanes and assistance remain pure — no RN imports', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    for (const rel of ['../../src/game/lanes.ts', '../../src/game/assistance.ts']) {
      const src = readFileSync(join(here, rel), 'utf8');
      const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      assert.doesNotMatch(stripped, /from\s+['"]react-native['"]/);
      assert.doesNotMatch(stripped, /from\s+['"]expo-/);
      assert.doesNotMatch(stripped, /Math\.random/);
    }
  });

  it('engine never imports RN/Expo/storage/monetization', async () => {
    const { readFileSync } = await import('node:fs');
    const { globSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = dirname(fileURLToPath(import.meta.url));
    const engineFiles = globSync(join(here, '../../src/engine/**/*.ts'));
    for (const f of engineFiles) {
      const src = readFileSync(f, 'utf8');
      const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      assert.doesNotMatch(stripped, /from\s+['"]react-native['"]/);
      assert.doesNotMatch(stripped, /from\s+['"]expo-/);
      assert.doesNotMatch(stripped, /from\s+['"]react-native-mmkv['"]/);
      assert.doesNotMatch(stripped, /react-native-purchases/);
      assert.doesNotMatch(stripped, /react-native-google-mobile-ads/);
    }
  });

  it('STORAGE_KEYS never contains budget tokens', async () => {
    const { STORAGE_KEYS } = await import('../../src/services/storage/settingsStore.ts');
    const keys = Object.keys(STORAGE_KEYS).join(' ').toLowerCase();
    const values = Object.values(STORAGE_KEYS).join(' ').toLowerCase();
    const forbidden = ['freeundo', 'budget'];
    for (const tok of forbidden) {
      assert.ok(!keys.includes(tok), `STORAGE_KEYS keys must not contain budget token '${tok}'`);
      assert.ok(!values.includes(tok), `STORAGE_KEYS values must not contain budget token '${tok}'`);
    }
    assert.ok(!('undoBudget' in STORAGE_KEYS));
    assert.ok(!('hintBudget' in STORAGE_KEYS));
    assert.ok(!('continueBudget' in STORAGE_KEYS));
  });
});

import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ATDD RED PHASE SCAFFOLD — DW bundle dw-undo-iap-stub-cleanup (DW-105)
// Generated: 2026-09-04 | TEA (Murat) | working-tree delta vs HEAD 8ac9a21
// All inner tests are `test.skip()` — they assert EXPECTED post-cleanup behavior
// and are INTENTIONALLY skipped until a developer activates the current task.
// Activation: remove inner `test.skip` → `test` for the current task, run
// `TSX_TSCONFIG_PATH=triade/tsconfig.test.json node --import tsx --test <file>`,
// confirm RED (against stub) then GREEN (against cleaned code).
//
// Working-tree delta covered:
// - triade/src/game/matchOrchestrator.ts:99-103 — REMOVED 4-line `budgetForCheck` stub in
//   `confirmUndoIap` that fabricated `iapRemaining: 1` when
//   `freeUsed && !unlimited && iapRemaining === 0`; now strictly
//   `consumeUndo(state.undoBudget, ...)`, symmetric with `confirmUndoAd`.
// - triade/__tests__/game/matchOrchestrator.test.ts:120-128 — pinning test renamed to
//   `confirmUndoIap respects budget — fails when freeUsed and no remaining without purchase`;
//   asserts `ok:false`, budget unchanged, history retained (length 1), `showUndoPrompt:false`.
// - _bmad-output/implementation-artifacts/deferred-work.md — DW-105 `open → done 2026-09-03`
//   + `resolution: resolved by sweep bundle dw-undo-iap-stub-cleanup` + `resolution-undo` hash.
// - sprint-status.yaml is ORCHESTRATOR-OWNED — never written, never reverted (not pinned beyond empty-diff gate).

const ORCH = fileURLToPath(new URL('../../../triade/src/game/matchOrchestrator.ts', import.meta.url));
const ASSIST = fileURLToPath(new URL('../../../triade/src/game/assistance.ts', import.meta.url));
const APP = fileURLToPath(new URL('../../../triade/App.tsx', import.meta.url));
const PIN_TEST = fileURLToPath(new URL('../../../triade/__tests__/game/matchOrchestrator.test.ts', import.meta.url));
const DEFERRED = fileURLToPath(new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url));

// ── P0: deny-without-budget + purchase chain + gate parity ───────────────────

test('[P0] deny-without-budget — no phantom undo', async () => {
  test.skip('[P0-01] confirmUndoIap denies when freeUsed && iapRemaining:0 && !unlimited', async () => {
    // Given OrchestratorState { undoHistory: [snap], undoBudget: { freeUsed:true, iapRemaining:0, unlimited:false } } + accelerated profile
    // When confirmUndoIap(state, acc) is called
    // Then ok:false, undoBudget deep-equal input ({freeUsed:true, iapRemaining:0}), undoHistory.length still 1, showUndoPrompt:false, snapshot undefined
    // Harness: import { confirmUndoIap, initialOrchestratorState } from matchOrchestrator.ts + LANE_PROFILES.accelerated; hand-build state; assert all four
    const { confirmUndoIap, initialOrchestratorState } = await import('../../../triade/src/game/matchOrchestrator.ts');
    const { LANE_PROFILES } = await import('../../../triade/src/game/lanes.ts');
    const snap: any = { game: { board: [[1, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: 1, best: 1 }, matchStats: { maxTile: 1, merges: 1, longestStreak: 1, currentStreak: 1 } };
    const state: any = { ...initialOrchestratorState(), undoHistory: [snap], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    const r: any = confirmUndoIap(state, LANE_PROFILES.accelerated);
    assert.equal(r.ok, false, 'must deny without purchase');
    assert.deepEqual(r.state.undoBudget, { freeUsed: true, iapRemaining: 0, unlimited: false });
    assert.equal(r.state.undoHistory.length, 1, 'history retained on deny');
    assert.equal(r.state.showUndoPrompt, false);
    assert.equal(r.snapshot, undefined);
    // Expected failure BEFORE fix (stub present): r.ok === true (phantom grant via budgetForCheck iapRemaining:1) → first assertion fails
    // After fix: all assertions pass
  });

  test.skip('[P0-02] no phantom persistence — iapRemaining stays exactly 0 after deny', async () => {
    // Given same denied input as P0-01
    // When confirmUndoIap denies
    // Then r.state.undoBudget.iapRemaining === 0 (never 1, never -1) and input state object is not mutated
    // Harness: deep-freeze copy of input; call; assert r.state budget + assert input deep-equal copy
    const { confirmUndoIap, initialOrchestratorState } = await import('../../../triade/src/game/matchOrchestrator.ts');
    const { LANE_PROFILES } = await import('../../../triade/src/game/lanes.ts');
    const snap: any = { game: { board: [[2, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: 2, best: 2 }, matchStats: { maxTile: 2, merges: 1, longestStreak: 1, currentStreak: 1 } };
    const state: any = { ...initialOrchestratorState(), undoHistory: [snap], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    const copy = JSON.parse(JSON.stringify(state));
    const r: any = confirmUndoIap(state, LANE_PROFILES.accelerated);
    assert.equal(r.state.undoBudget.iapRemaining, 0);
    assert.deepEqual(state, copy, 'input must not be mutated');
    // Expected failure BEFORE fix: r.ok true (stub) — iapRemaining in RESULT state would be 0 (stub used local copy) but ok:true trips the contract; this pin pairs with P0-01
    // After fix: deny + zero + non-mutation
  });

  test.skip('[P0-03] purchase→consume chain still works — 0→3 grant then 3→2→1→0 decrements', async () => {
    // Given fresh state + accelerated profile
    // When purchaseUndoPack(state) then confirmUndoIap three times (pushing history each time)
    // Then grant is 0→3; each confirm decrements by exactly 1 with history rewind; 4th confirm denies
    // Harness: existing undoPack.test.ts:90-104,135-150 pattern — purchaseUndoPack import + pushHistory per undo
    const { confirmUndoIap, purchaseUndoPack, pushHistory, initialOrchestratorState } = await import('../../../triade/src/game/matchOrchestrator.ts');
    const { LANE_PROFILES } = await import('../../../triade/src/game/lanes.ts');
    const mk = (n: number): any => ({ game: { board: [[n, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: n, best: n }, matchStats: { maxTile: n, merges: 1, longestStreak: 1, currentStreak: 1 } });
    let s: any = { ...initialOrchestratorState(), undoHistory: [mk(1)], undoBudget: { freeUsed: true, iapRemaining: 0, unlimited: false } };
    s = purchaseUndoPack(s, LANE_PROFILES.accelerated);
    assert.equal(s.undoBudget.iapRemaining, 3, 'grant 0→3');
    s = pushHistory(s, mk(2));
    const r1: any = confirmUndoIap(s, LANE_PROFILES.accelerated);
    assert.equal(r1.ok, true);
    assert.equal(r1.state.undoBudget.iapRemaining, 2);
    // Expected failure BEFORE fix: r1.ok also true (stub not reached when balance exists) — this test stays green pre/post; its value is proving the legitimate path survived the cleanup
    // After fix: identical green; 4th deny covered by existing undoPack 135-150
  });

  test.skip('[P0-04] canUndo gate parity — confirm obeys the same gate it advertises', async () => {
    // Given budgets {freeUsed,iapRemaining:0,!unlimited} + history vs {iapRemaining:3} vs {unlimited} + clean profile
    // When canUndoForState vs confirmUndoIap called on each
    // Then deny-budget: canUndo false AND confirm ok:false; iap:3 → both true; unlimited → both true; clean → both false
    // Harness: canUndoForState + confirmUndoIap over 4-row table
    const { confirmUndoIap, canUndoForState, initialOrchestratorState } = await import('../../../triade/src/game/matchOrchestrator.ts');
    const { LANE_PROFILES } = await import('../../../triade/src/game/lanes.ts');
    const snap: any = { game: { board: [[1, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: 1, best: 1 }, matchStats: { maxTile: 1, merges: 1, longestStreak: 1, currentStreak: 1 } };
    const rows: any[] = [
      [{ freeUsed: true, iapRemaining: 0, unlimited: false }, false],
      [{ freeUsed: true, iapRemaining: 3, unlimited: false }, true],
      [{ freeUsed: true, iapRemaining: 0, unlimited: true }, true],
    ];
    for (const [budget, expected] of rows) {
      const st: any = { ...initialOrchestratorState(), undoHistory: [snap], undoBudget: budget };
      assert.equal(canUndoForState(st, LANE_PROFILES.accelerated), expected, JSON.stringify(budget));
      assert.equal(confirmUndoIap(st, LANE_PROFILES.accelerated).ok, expected, JSON.stringify(budget));
    }
    const cleanSt: any = { ...initialOrchestratorState(), undoHistory: [snap] };
    assert.equal(canUndoForState(cleanSt, LANE_PROFILES.clean), false);
    assert.equal(confirmUndoIap(cleanSt, LANE_PROFILES.clean).ok, false);
    // Expected failure BEFORE fix: first row confirm ok:true vs canUndo false → parity broken (gate says no, confirm says yes)
    // After fix: parity holds on all rows
  });
});

// ── P1: symmetry + unlimited + clean + App fail-closed + stub-absent ─────────

test('[P1] symmetry + entitlement paths + source pins', async () => {
  test.skip('[P1-01] Ad/Iap symmetry — identical inputs give identical ok on both paths', async () => {
    // Given 4 budget states (fresh free, freeUsed+0, freeUsed+2, unlimited) × accelerated, each with 1 history
    // When confirmUndoAd and confirmUndoIap are called on the same input
    // Then rAd.ok === rIap.ok on every row (both delegate to consumeUndo; bodies now identical)
    // Harness: table-driven over 4 budgets
    const { confirmUndoAd, confirmUndoIap, initialOrchestratorState } = await import('../../../triade/src/game/matchOrchestrator.ts');
    const { LANE_PROFILES } = await import('../../../triade/src/game/lanes.ts');
    const snap: any = { game: { board: [[1, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: 1, best: 1 }, matchStats: { maxTile: 1, merges: 1, longestStreak: 1, currentStreak: 1 } };
    const budgets: any[] = [
      { freeUsed: false, iapRemaining: 0, unlimited: false },
      { freeUsed: true, iapRemaining: 0, unlimited: false },
      { freeUsed: true, iapRemaining: 2, unlimited: false },
      { freeUsed: true, iapRemaining: 0, unlimited: true },
    ];
    for (const b of budgets) {
      const st: any = { ...initialOrchestratorState(), undoHistory: [snap], undoBudget: b };
      assert.equal(confirmUndoAd(st, LANE_PROFILES.accelerated).ok, confirmUndoIap(st, LANE_PROFILES.accelerated).ok, JSON.stringify(b));
    }
    // Expected failure BEFORE fix: row 2 (freeUsed+0) diverges — Ad denies (false) but Iap grants (true) via stub
    // After fix: all rows agree
  });

  test.skip('[P1-02] unlimited path — applyNoAds then repeated confirmUndoIap stays ok:true', async () => {
    // Given fresh accelerated state → applyNoAds → push 3 histories
    // When confirmUndoIap called 3×
    // Then every call ok:true and iapRemaining stays 0 (unlimited never decrements)
    const { confirmUndoIap, applyNoAds, pushHistory, initialOrchestratorState } = await import('../../../triade/src/game/matchOrchestrator.ts');
    const { LANE_PROFILES } = await import('../../../triade/src/game/lanes.ts');
    const mk = (n: number): any => ({ game: { board: [[n, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: n, best: n }, matchStats: { maxTile: n, merges: 1, longestStreak: 1, currentStreak: 1 } });
    let s: any = applyNoAds({ ...initialOrchestratorState(), undoHistory: [mk(1)] }, LANE_PROFILES.accelerated);
    s = pushHistory(pushHistory(s, mk(2)), mk(3));
    let cur = s;
    for (let i = 0; i < 3; i++) {
      const r: any = confirmUndoIap(cur, LANE_PROFILES.accelerated);
      assert.equal(r.ok, true, `unlimited undo ${i} must succeed`);
      assert.equal(r.state.undoBudget.iapRemaining, 0);
      cur = r.state;
    }
    // Expected failure BEFORE fix: none (stub short-circuits only when iapRemaining===0 && !unlimited; unlimited path bypasses it) — green pre/post; pins no regression
    // After fix: green
  });

  test.skip('[P1-03] clean lane no-op — purchase/confirm all deny without mutation', async () => {
    // Given clean profile state with history + budgets
    // When purchaseUndoPack / applyNoAds / requestUndo / confirmUndoIap called
    // Then confirms deny; purchase/apply return state unchanged in budget dimension
    // Harness: mirrors existing undoPack 162-167 + matchOrchestrator clean row
    const { confirmUndoIap, purchaseUndoPack, applyNoAds, initialOrchestratorState } = await import('../../../triade/src/game/matchOrchestrator.ts');
    const { LANE_PROFILES } = await import('../../../triade/src/game/lanes.ts');
    const snap: any = { game: { board: [[1, null, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], pendingSpawn: { value: 1, displayRoll: 0.1 } }, match: { score: 1, best: 1 }, matchStats: { maxTile: 1, merges: 1, longestStreak: 1, currentStreak: 1 } };
    const st: any = { ...initialOrchestratorState(), undoHistory: [snap] };
    assert.equal(confirmUndoIap(st, LANE_PROFILES.clean).ok, false);
    assert.deepEqual(purchaseUndoPack(st, LANE_PROFILES.clean).undoBudget, st.undoBudget);
    assert.deepEqual(applyNoAds(st, LANE_PROFILES.clean).undoBudget, st.undoBudget);
    // Expected failure BEFORE fix: none (stub checks freeUsed which clean never sets via consumeUndo gate — profile gate fires first) — green pre/post
    // After fix: green
  });

  test.skip('[P1-04] SCAN App.handleUndoIap fail-closed — !ok touches only showUndoPrompt', async () => {
    // Given triade/App.tsx handleUndoIap
    // When the `if (!res.ok || !res.snapshot)` branch is scanned
    // Then branch body contains only `setShowUndoPrompt(false); return;` — never setUndoHistory/setUndoBudget/setGame/setMatch
    const src = readFileSync(APP, 'utf8');
    const m = src.match(/const handleUndoIap[\s\S]*?if\s*\(!res\.ok\s*\|\|\s*!res\.snapshot\)\s*\{([\s\S]*?)\}/);
    assert.ok(m, 'handleUndoIap fail-closed branch must exist');
    const body = m![1];
    assert.match(body, /setShowUndoPrompt\(false\)/, 'must close prompt on deny');
    assert.ok(!/setUndoHistory|setUndoBudget|setGame\(|setMatch\(/.test(body), 'fail-closed branch must not touch history/budget/game/match');
    // Expected failure BEFORE fix: none (App.tsx byte-identical pre/post — stub lived in orchestrator, not App) — green pre/post; pins the intended UX (silent close, no toast)
    // After fix: green; product decision for explicit "no undos" affordance stays out of scope (flag to PM)
  });

  test.skip('[P1-05] SCAN stub absent — no budgetForCheck / no fabricated iapRemaining:1', async () => {
    // Given triade/src/game/matchOrchestrator.ts
    // When scanned
    // Then `budgetForCheck` appears 0 times and `iapRemaining: 1` appears 0 times in this file
    const src = readFileSync(ORCH, 'utf8');
    assert.ok(!src.includes('budgetForCheck'), 'budgetForCheck stub variable must be gone');
    assert.ok(!/iapRemaining:\s*1/.test(src), 'fabricated iapRemaining: 1 must be gone from orchestrator');
    assert.match(src, /const res = consumeUndo\(state\.undoBudget, state\.undoHistory\.length, profile\)/, 'confirmUndoIap must call consumeUndo(state.undoBudget, …) directly');
    // Expected failure BEFORE fix: both includes hit (stub block present) → first two assertions fail
    // After fix: all pass; complementary host gate: `rg -n "budgetForCheck" triade/src/game/matchOrchestrator.ts` → 0 hits
  });
});

// ── P2: edge + ledger + hygiene ──────────────────────────────────────────────

test('[P2] edge + ledger + hygiene', async () => {
  test.skip('[P2-01] empty-history guard — deny even with iapRemaining>0', async () => {
    // Given accelerated state with undoHistory:[] and budget {freeUsed:true, iapRemaining:2, unlimited:false}
    // When confirmUndoIap called
    // Then ok:false (canUndo historyLen gate + snap guard), showUndoPrompt:false
    const { confirmUndoIap, initialOrchestratorState } = await import('../../../triade/src/game/matchOrchestrator.ts');
    const { LANE_PROFILES } = await import('../../../triade/src/game/lanes.ts');
    const st: any = { ...initialOrchestratorState(), undoHistory: [], undoBudget: { freeUsed: true, iapRemaining: 2, unlimited: false } };
    const r: any = confirmUndoIap(st, LANE_PROFILES.accelerated);
    assert.equal(r.ok, false);
    assert.equal(r.state.showUndoPrompt, false);
    // Expected failure BEFORE fix: none (stub needs historyLen only via consumeUndo gate — empty history denies pre/post) — green pre/post
    // After fix: green
  });

  test.skip('[P2-02] SCAN pinning test flipped — repo test asserts deny not grant', async () => {
    // Given triade/__tests__/game/matchOrchestrator.test.ts
    // When scanned
    // Then it contains `confirmUndoIap respects budget` with `assert.equal(r.ok, false)` and history/prompt pins, and does NOT contain `confirmUndoIap injects one when freeUsed`
    const src = readFileSync(PIN_TEST, 'utf8');
    assert.match(src, /confirmUndoIap respects budget/, 'pinning test must be renamed to respects-budget');
    assert.match(src, /assert\.equal\(r\.ok, false\)/, 'must assert ok:false');
    assert.match(src, /undoHistory\.length, 1/, 'must pin history retained');
    assert.ok(!src.includes('confirmUndoIap injects one when freeUsed'), 'old stub-celebrating name must be gone');
    // Expected failure BEFORE fix: old name present + ok:true assertion → rename + false assertions fail
    // After fix: all pass
  });

  test.skip('[P2-03] SCAN ledger DW-105 done with resolution-undo', async () => {
    // Given _bmad-output/implementation-artifacts/deferred-work.md
    // When scanned for DW-105
    // Then status `done 2026-09-03` + `resolution: resolved by sweep bundle dw-undo-iap-stub-cleanup` + `resolution-undo:` hash + hex `7374617475733a206f70656e`
    const md = readFileSync(DEFERRED, 'utf8');
    assert.match(md, /DW-105[\s\S]*?status:\s*done 2026-09-03/, 'DW-105 must be done 2026-09-03');
    assert.match(md, /resolved by sweep bundle dw-undo-iap-stub-cleanup/, 'must carry sweep resolution');
    assert.match(md, /resolution-undo:/, 'must carry resolution-undo hash');
    assert.match(md, /7374617475733a206f70656e/, 'must contain hex open marker');
    // Expected failure BEFORE fix: status open + no hash → first assertions fail
    // After fix: all pass; ledger change is exactly 1 hunk (CI: git diff HEAD -- deferred-work.md shows 1 hunk)
  });

  test.skip('[P2-04] SCAN orchestrator purity + assistance untouched', async () => {
    // Given matchOrchestrator.ts + assistance.ts
    // When scanned
    // Then orchestrator still has no RN/Expo/Skia/MMKV imports and no Math.random; assistance.ts still owns canUndo/consumeUndo with free→unlimited→iap order
    const orchSrc = readFileSync(ORCH, 'utf8');
    const stripped = orchSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/from\s+['"]react-native['"]/.test(stripped), 'no RN imports');
    assert.ok(!/from\s+['"]expo-/.test(stripped), 'no Expo imports');
    assert.ok(!/Math\.random/.test(stripped), 'no Math.random');
    const assistSrc = readFileSync(ASSIST, 'utf8');
    assert.match(assistSrc, /export function consumeUndo/, 'consumeUndo must live in assistance.ts');
    assert.match(assistSrc, /if\s*\(!budget\.freeUsed\)/, 'free-first order preserved');
    // Expected failure BEFORE fix: none (purity/assistance byte-identical pre/post) — green pre/post; guards the cleanup did not relocate logic
    // After fix: green
  });
});

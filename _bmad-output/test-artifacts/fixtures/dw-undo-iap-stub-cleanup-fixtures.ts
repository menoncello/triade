/**
 * Fixtures — dw-undo-iap-stub-cleanup (DW-105)
 * Remove confirmUndoIap budget injection — deterministic host-only builders.
 * No faker — pure triade/src/game/matchOrchestrator.ts + assistance.ts + lanes.ts.
 * Covers: triade/src/game/matchOrchestrator.ts:99-118 (confirmUndoIap strict
 *         consumeUndo delegation, symmetric with confirmUndoAd:78-97)
 *         triade/src/game/assistance.ts:38-59 (canUndo / consumeUndo authority)
 *         triade/App.tsx:678-692 (handleUndoIap fail-closed branch)
 * Design: _bmad-output/test-artifacts/test-design/test-design-dw-undo-iap-stub-cleanup.md
 * ATDD (RED scaffolds, skip): _bmad-output/test-artifacts/atdd-tests/dw-undo-iap-stub-cleanup.red.spec.ts
 * Automate (GREEN executable): _bmad-output/test-artifacts/tests/unit|api|e2e/undo-iap-stub-cleanup.*
 * Run (from triade/): TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx --test <file>
 * TEA-required fixture surface under test_artifacts/fixtures; no Playwright test.extend
 * (RN Expo 57, no page.goto — pure node:test + tsx helpers).
 */

import { readFileSync } from 'node:fs';
import { initialOrchestratorState } from '../../../triade/src/game/matchOrchestrator.ts';
import type { OrchestratorState } from '../../../triade/src/game/matchOrchestrator.ts';
import type { UndoBudget } from '../../../triade/src/game/assistance.ts';
import { UNDO_PACK_SIZE } from '../../../triade/src/game/assistance.ts';
import { LANE_PROFILES } from '../../../triade/src/game/lanes.ts';
import type { LaneProfile } from '../../../triade/src/game/lanes.ts';

export { initialOrchestratorState, UNDO_PACK_SIZE, LANE_PROFILES };
export type { OrchestratorState, UndoBudget, LaneProfile };

export const acc: LaneProfile = LANE_PROFILES.accelerated;
export const clean: LaneProfile = LANE_PROFILES.clean;

// ── Deterministic snapshot factory (mirrors undoPack.test.ts snap()) ─────────
export function snap(): any {
  return {
    game: { board: [[1, 2, null, null], [null, null, null, null], [null, null, null, null], [null, null, null, null]], pendingSpawn: { value: 1, displayRoll: 0.1 } },
    match: { score: 10, best: 10 },
    matchStats: { maxTile: 3, merges: 1, longestStreak: 1, currentStreak: 1 },
  };
}

// ── Budget literals ──────────────────────────────────────────────────────────
export const BUDGETS = {
  fresh: { freeUsed: false, iapRemaining: 0, unlimited: false },
  denied: { freeUsed: true, iapRemaining: 0, unlimited: false },
  withPack: { freeUsed: true, iapRemaining: 3, unlimited: false },
  unlimited: { freeUsed: true, iapRemaining: 0, unlimited: true },
} as const satisfies Record<string, UndoBudget>;

// ── State builders (fresh object per call — no shared state) ─────────────────
export function stateWith(budget: UndoBudget, historyLen = 1): OrchestratorState {
  const history = Array.from({ length: historyLen }, () => snap());
  return { ...initialOrchestratorState(), undoHistory: history, undoBudget: { ...budget } };
}

export function deniedState(): OrchestratorState {
  return stateWith({ ...BUDGETS.denied }, 1);
}

export function purchasedState(): OrchestratorState {
  return stateWith({ ...BUDGETS.withPack }, 3);
}

// ── Source-scan helpers (static pins) ────────────────────────────────────────
const ORCH_PATH = new URL('../../../triade/src/game/matchOrchestrator.ts', import.meta.url).pathname;
const APP_PATH = new URL('../../../triade/App.tsx', import.meta.url).pathname;
const LEDGER_PATH = new URL('../../../_bmad-output/implementation-artifacts/deferred-work.md', import.meta.url).pathname;
const PIN_TEST_PATH = new URL('../../../triade/__tests__/game/matchOrchestrator.test.ts', import.meta.url).pathname;

export function readOrchestrator(): string {
  return readFileSync(ORCH_PATH, 'utf8');
}

export function readApp(): string {
  return readFileSync(APP_PATH, 'utf8');
}

export function readLedger(): string {
  return readFileSync(LEDGER_PATH, 'utf8');
}

export function readPinTest(): string {
  return readFileSync(PIN_TEST_PATH, 'utf8');
}

export function countMatches(src: string, re: RegExp): number {
  return (src.match(re) || []).length;
}

export { ORCH_PATH, APP_PATH, LEDGER_PATH, PIN_TEST_PATH };

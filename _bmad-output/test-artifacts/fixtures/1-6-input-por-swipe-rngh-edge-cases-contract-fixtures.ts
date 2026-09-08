// TEA fixture surface — 1-6-input-por-swipe-rngh-edge-cases-contract (automate).
// Reusable gate-protocol + swipe-vector builders for the 1-6 in-flight gate.
// Self-contained (zero cross-artifact imports): the CI-executed suite
// `triade/__tests__/ui/swipe-gate-automate.test.ts` keeps its own inline copy
// (repo convention — single source of truth, no rot). This file is the
// TEA-catalogued reusable surface for future suites (e.g. 1.6-PROP-001 pure
// `swipeGate.ts` migration). Semantics mirror `triade/App.tsx` doMove (busyRef
// set ONLY when result.moved === true) and onMoveSettled (release).

export interface Gate {
  current: boolean;
}

export function createGate(): Gate {
  return { current: false };
}

export function reportMoveResult(gate: Gate, result: { moved: boolean }): void {
  if (result.moved) gate.current = true;
}

export function reportSettled(gate: Gate): void {
  gate.current = false;
}

export function isBusy(gate: Gate): boolean {
  return gate.current;
}

// Decisive swipe vectors (all above SWIPE_THRESHOLD = 10, off-axis dominant).
export const SWIPE_VECTORS = {
  right: { dx: 30, dy: 0 },
  left: { dx: -30, dy: 0 },
  up: { dx: 0, dy: -30 },
  down: { dx: 0, dy: 30 },
} as const;

// Hostile vectors for the non-finite guard (handleSwipe Number.isFinite).
export const HOSTILE_VECTORS: ReadonlyArray<readonly [number, number]> = [
  [NaN, 0],
  [0, NaN],
  [Infinity, 0],
  [30, -Infinity],
] as const;

// Malformed gesture-end payloads (handleGestureEnd validation).
export const MALFORMED_EVENTS: ReadonlyArray<unknown> = [
  null,
  undefined,
  {},
  { translationX: '30', translationY: 0 },
  { translationX: 30 },
] as const;

// No-op cleanup helper for contract parity (gate protocol holds no external
// resources; nothing to delete after a test).
export function deleteGate(_gate: Gate): void {}

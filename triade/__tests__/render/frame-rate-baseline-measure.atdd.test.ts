import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// ATDD RED-phase scaffolds — dw-frame-rate-baseline-measure
// Spec: _bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md
// Bundle: commit 12e432d vs baseline 6b16593 (hook probe-wiring fix, WINDOW=120
// and fps/p99 math frozen by Never constraint).
//
// RED PHASE: every inner test is `it.skip` (dormant). Activation guidance:
//   1. Change ONE `it.skip` → `it` for the task at hand.
//   2. Run: cd triade && npm test -- __tests__/render/frame-rate-baseline-measure.atdd.test.ts
//   3. Confirm RED (fail) on pre-fix code, then implement, then confirm GREEN.
// Against the working tree (fix already in HEAD) activated tests PASS —
// this is the correct TDD inversion: the scaffolds document the contract and
// would have FAILED before 12e432d (no useCallback, no exported
// computeFrameRateStats, done latched before the empty check).
//
// RN boundary: the hook file imports react-native-reanimated, so it cannot be
// imported under the tsx host runner. Wiring is asserted via source-shape
// guards; math via a local re-implementation of the normative formula that
// must stay byte-identical to `computeFrameRateStats` (repo ATDD style, same
// as useFrameRateBaseline.math.test.ts).
// ---------------------------------------------------------------------------

const hookSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/render/useFrameRateBaseline.ts', import.meta.url)),
  'utf8',
);

const appSrc = fs.readFileSync(
  fileURLToPath(new URL('../../App.tsx', import.meta.url)),
  'utf8',
);

const evidenceSrc = fs.readFileSync(
  fileURLToPath(
    new URL(
      '../../../_bmad-output/implementation-artifacts/dw-16-frame-rate-baseline-evidence.md',
      import.meta.url,
    ),
  ),
  'utf8',
);

interface FrameRateStats {
  fps: number;
  frames: number;
  p99Ms: number;
}

// Local re-implementation of the normative formula (byte-identical to the
// exported computeFrameRateStats: sorted / floor(n*0.99) / clamped avg).
function computeLocal(samples: number[]): FrameRateStats | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.99);
  const p99 = sorted[Math.min(idx, sorted.length - 1)];
  const avgMs = Math.max(samples.reduce((s, v) => s + v, 0) / samples.length, 0.001);
  return { fps: 1000 / avgMs, frames: samples.length, p99Ms: p99 };
}

describe('ATDD dw-frame-rate-baseline-measure — P0 AC contracts (RED scaffolds)', () => {
  it.skip('[P0-01] AC1 steady window: 119x16.667ms → fps≈60, p99≈16.67, frames=119', () => {
    // Given: a full shipped window (first callback never pushes, so 119 samples)
    // When: computeFrameRateStats runs
    // Then: fps ≈ 60, p99Ms ≈ 16.67, frames = 119
    const samples = Array.from({ length: 119 }, () => 16.667);
    const result = computeLocal(samples);
    assert.ok(result !== null, 'expected non-null stats');
    assert.equal(result.frames, 119);
    assert.ok(result.fps > 59.9 && result.fps < 60.1, `fps ${result.fps} not in 59.9..60.1`);
    assert.ok(result.p99Ms > 16.66 && result.p99Ms < 16.68, `p99 ${result.p99Ms} not in 16.66..16.68`);
  });

  it.skip('[P0-02] AC2 empty window: null + reset-and-retry, never latch done with null stats', () => {
    // Given: 120 callbacks yield zero samples (degenerate time base)
    // When: the completion path runs
    // Then: stats are null AND the window resets (durations/last/count) and
    // retries instead of latching done=true forever.
    assert.equal(computeLocal([]), null);
    assert.ok(
      hookSrc.includes('export function computeFrameRateStats'),
      'completion must call the exported computeFrameRateStats',
    );
    assert.ok(hookSrc.includes('=== null'), 'completion must null-check before publishing');
    assert.ok(hookSrc.includes('count: 0'), 'empty path must reset count to 0');
    assert.ok(
      hookSrc.includes('samples: []'),
      'empty path must reset samples to []',
    );
    assert.ok(hookSrc.includes('last: 0'), 'empty path must reset last to 0');
  });

  it.skip('[P0-03] AC3 rerender churn: frame callback identity stable (memoized)', () => {
    // Given: auto-drive re-renders (~500ms) mid-window
    // When: callback identity is compared across renders
    // Then: stable reference — time base never resets mid-window.
    assert.ok(hookSrc.includes('useCallback('), 'frame callback must be wrapped in useCallback');
    assert.ok(
      hookSrc.includes('const onFrame = useCallback('),
      'memoized callback must be named onFrame',
    );
    assert.ok(
      hookSrc.includes('useFrameCallback(onFrame)'),
      'useFrameCallback must consume the memoized onFrame (not an inline arrow)',
    );
  });

  it.skip('[P0-04] WINDOW frozen at 120 (Never constraint pin)', () => {
    // Given: the Never constraint (window size immutable)
    // When: the hook source is scanned
    // Then: exactly `const WINDOW = 120`, unchanged.
    assert.ok(hookSrc.includes('const WINDOW = 120'), 'missing const WINDOW = 120');
  });

  it.skip('[P0-05] 119-shape lone-spike skip documents p99 leniency (deferred to DW-32)', () => {
    // Given: shipped 119-sample shape with one 50ms spike
    // When: formula floor(119*0.99)=117 selects the 2nd-largest
    // Then: p99 excludes the lone spike (lenient verdict) — locked, not fixed.
    const samples = [...Array.from({ length: 118 }, () => 16.667), 50];
    const result = computeLocal(samples);
    assert.ok(result !== null, 'expected non-null stats');
    assert.equal(result.frames, 119);
    assert.equal(result.p99Ms, 16.667);
  });

  it.skip('[P0-06] 100-sample spike path: p99 selects the max (formula exercised truthfully)', () => {
    // Given: 99x16.667 + one 50ms spike (floor(100*0.99)=99)
    // When: computeLocal runs
    // Then: p99 = 50 (spike-selection path covered without changing math).
    const samples = [...Array.from({ length: 99 }, () => 16.667), 50];
    const result = computeLocal(samples);
    assert.ok(result !== null, 'expected non-null stats');
    assert.equal(result.p99Ms, 50);
  });
});

describe('ATDD dw-frame-rate-baseline-measure — P1 boundaries (RED scaffolds)', () => {
  it.skip('[P1-01] App.tsx untouched: hook consumer boundary pinned', () => {
    // Given: bundle forbids harness changes
    // When: App.tsx is scanned
    // Then: still consumes useFrameRateBaseline, no math duplicated there.
    const refs = appSrc.match(/useFrameRateBaseline/g) ?? [];
    assert.ok(refs.length >= 2, `expected ≥2 useFrameRateBaseline refs, got ${refs.length}`);
    assert.ok(
      !appSrc.includes('computeFrameRateStats'),
      'math must live in the hook module, not App.tsx',
    );
    assert.ok(
      appSrc.includes('useFrameRateBaseline(baselineGeneration, devAutoDrive)'),
      'probe must be wired to the explicit opt-in flag (off by default)',
    );
    assert.ok(
      appSrc.includes('devAutoDrive ? ('),
      'baseline readout must render only when the probe is enabled',
    );
  });

  it.skip('[P1-02] Release hard rule: zero logging in frame math path', () => {
    // Given: REGRA DURA (worklets/frame math never log in release)
    // When: the hook file is scanned
    // Then: no console.* calls.
    assert.ok(!hookSrc.includes('console.'), 'frame-math path must not log');
  });

  it.skip('[P1-03] Generation-reset effect unchanged (DW-32 AC-5 boundary)', () => {
    // Given: generation restart must still clear samples/count/done
    // When: the hook source is scanned
    // Then: seenGeneration effect intact.
    assert.ok(hookSrc.includes('seenGeneration'), 'generation effect must remain');
    assert.ok(hookSrc.includes('done: false'), 'reset must clear done');
    assert.ok(hookSrc.includes('setStats(null)'), 'reset must clear stats');
  });

  it.skip('[P1-04] MANUAL: one-screenshot re-measurement publishes baseline: line', () => {
    // Given: dev build + EXPO_PUBLIC_TRIADE_AUTO_DRIVE=1, seed 20260808, ~10s board play
    // When: one screenshot is taken
    // Then: `baseline: <fps> fps · p99 <p99>ms · <n> frames` visible; if
    // `recording…` persists past 30s → device-log investigation (NOT a blind rerun).
    // MANUAL — no host assertion; protocol lives in the evidence file:
    assert.ok(
      evidenceSrc.includes('Re-measurement protocol for the orchestrator'),
      'evidence must carry the one-screenshot protocol',
    );
  });
});

describe('ATDD dw-frame-rate-baseline-measure — P2 evidence hygiene (RED scaffolds)', () => {
  it.skip('[P2-01] Evidence stays shared with DW-32 and verdict stays open', () => {
    // Given: DW-16/DW-32 share one readout; budget has no verdict by design
    // When: the evidence file is scanned
    // Then: shared flag + STILL NO VERDICT present, no invented numbers.
    assert.ok(
      evidenceSrc.toLowerCase().includes('shared with dw-32'),
      'evidence must keep the shared-with-DW-32 flag',
    );
    assert.ok(
      evidenceSrc.includes('STILL NO VERDICT') || evidenceSrc.includes('NO VERDICT'),
      'evidence must keep the verdict-open wording',
    );
  });

  it.skip('[P2-02] AC4 evidence: diagnosis section present with F1/F2 + fix + protocol', () => {
    // Given: the run finishes
    // When: the evidence file is read
    // Then: diagnosis section (F1 re-registration, F2 empty latch, fix, verification,
    // one-screenshot protocol) present with the shared flag.
    assert.ok(evidenceSrc.includes('F1'), 'diagnosis must record F1 (callback re-registration)');
    assert.ok(evidenceSrc.includes('F2'), 'diagnosis must record F2 (empty-window latch)');
    assert.ok(
      evidenceSrc.includes('useCallback'),
      'diagnosis must record the memoization fix',
    );
  });
});

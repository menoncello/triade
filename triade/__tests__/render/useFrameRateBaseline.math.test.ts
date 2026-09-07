import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Frame-rate baseline measure — math + wiring guards
// Spec: _bmad-output/implementation-artifacts/spec-frame-rate-baseline-measure.md
// The hook file imports react-native-reanimated (RN runtime), so it cannot be
// imported under the tsx runner. Assert on file SOURCE for wiring, and verify
// the MATH via a local re-implementation of the documented formula.
// ---------------------------------------------------------------------------

const hookSrc = fs.readFileSync(
  fileURLToPath(new URL('../../src/render/useFrameRateBaseline.ts', import.meta.url)),
  'utf8',
);

interface FrameRateStats {
  fps: number;
  frames: number;
  p99Ms: number;
}

// Local re-implementation of the documented formula (must stay byte-identical
// to computeFrameRateStats in the hook file).
function computeLocal(samples: number[]): FrameRateStats | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.99);
  const p99 = sorted[Math.min(idx, sorted.length - 1)];
  const avgMs = Math.max(samples.reduce((s, v) => s + v, 0) / samples.length, 0.001);
  return { fps: 1000 / avgMs, frames: samples.length, p99Ms: p99 };
}

describe('useFrameRateBaseline — source wiring guards', () => {
  it('WINDOW stays 120', () => {
    assert.ok(hookSrc.includes('const WINDOW = 120'), 'missing const WINDOW = 120');
  });

  it('frame callback is memoized with useCallback', () => {
    assert.ok(hookSrc.includes('useCallback('), 'missing useCallback( around the frame callback');
  });

  it('empty window resets instead of latching done with null stats', () => {
    assert.ok(
      hookSrc.includes('computeFrameRateStats(samples)'),
      'completion path must call computeFrameRateStats(samples)',
    );
    assert.ok(
      hookSrc.includes('=== null'),
      'completion path must null-check the stats result before publishing',
    );
    assert.ok(
      hookSrc.includes('count.current = 0'),
      'empty-window path must reset count.current = 0',
    );
    assert.ok(
      hookSrc.includes('export function computeFrameRateStats'),
      'computeFrameRateStats must be exported',
    );
  });
});

describe('useFrameRateBaseline — pure math (documented formula)', () => {
  it('steady 16.667ms deltas → fps ≈ 60, p99 ≈ 16.67, frames = 119', () => {
    const samples = Array.from({ length: 119 }, () => 16.667);
    const result = computeLocal(samples);
    assert.ok(result !== null, 'expected non-null stats');
    assert.equal(result.frames, 119);
    assert.ok(result.fps > 59.9 && result.fps < 60.1, `fps ${result.fps} expected in 59.9..60.1`);
    assert.ok(
      result.p99Ms > 16.66 && result.p99Ms < 16.68,
      `p99 ${result.p99Ms} expected in 16.66..16.68`,
    );
  });

  it('single spike selects p99 = 50', () => {
    // NOTE: 100 samples so floor(100*0.99)=99 selects the lone max.
    // (With 120 samples the same formula yields idx 118, which skips a
    // single max at index 119 — the formula itself is normative and
    // byte-identical to the hook, so the data is sized to exercise the
    // spike-selection path truthfully.)
    const samples = [...Array.from({ length: 99 }, () => 16.667), 50];
    const result = computeLocal(samples);
    assert.ok(result !== null, 'expected non-null stats');
    assert.equal(result.p99Ms, 50);
  });

  it('shipped 119-sample shape skips a lone spike (formula idx 117)', () => {
    // Truthful lock of the shipped window shape: the first callback never
    // pushes (last.current starts 0), so a full window holds 119 samples and
    // floor(119*0.99)=117 selects the 2nd-largest — a single slowest frame is
    // excluded from p99Ms by the normative formula (see B4/E11 defer note).
    const samples = [...Array.from({ length: 118 }, () => 16.667), 50];
    const result = computeLocal(samples);
    assert.ok(result !== null, 'expected non-null stats');
    assert.equal(result.frames, 119);
    assert.equal(result.p99Ms, 16.667);
  });

  it('empty array → null (hook resets the window, never NaN)', () => {
    assert.equal(computeLocal([]), null);
  });
});

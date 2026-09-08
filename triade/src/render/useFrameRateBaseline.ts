import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrameCallback, useSharedValue, runOnJS } from 'react-native-reanimated';
import type { FrameInfo } from 'react-native-reanimated';

export interface FrameRateStats {
  fps: number;
  frames: number;
  p99Ms: number;
}

const WINDOW = 120;

export function computeFrameRateStats(samples: number[]): FrameRateStats | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.99);
  const p99 = sorted[Math.min(idx, sorted.length - 1)];
  const avgMs = Math.max(samples.reduce((s, v) => s + v, 0) / samples.length, 0.001);
  return {
    fps: 1000 / avgMs,
    frames: samples.length,
    p99Ms: p99
  };
}

interface WindowState {
  samples: number[];
  last: number;
  count: number;
  done: boolean;
  gen: number;
  epoch: number;
}

function freshWindow(gen = 0, epoch = 0): WindowState {
  return { samples: [], last: 0, count: 0, done: false, gen, epoch };
}

export function useFrameRateBaseline(generation = 0, enabled = false): FrameRateStats | null {
  const [stats, setStats] = useState<FrameRateStats | null>(null);
  // UI-owned accumulation: lives on the UI runtime inside a SharedValue, so
  // the frame callback never captures JS closures (useRef/useState/helpers).
  // A plain JS callback registered via useFrameCallback is a Remote Function
  // on UI and crashes on the first frame — hence worklet + shared state.
  const win = useSharedValue<WindowState>(freshWindow(generation));
  const seenGeneration = useRef(generation);
  // Epoch invalidates in-flight runOnJS finishes across enable/disable
  // transitions: a finish carrying a stale epoch is dropped on arrival.
  const epochRef = useRef(0);

  // DW-32 AC-5: restart the 120-frame window (e.g. when the playing screen
  // mounts) so board frames — not launch-screen frames — are measured.
  // Clears samples/count/done only; WINDOW and fps/p99 math below untouched.
  // Opt-in gate: when disabled the probe is fully inert — no frame callback
  // runs, no stats are ever published. Re-enabling starts a fresh window.
  useEffect(() => {
    epochRef.current += 1;
    if (!enabled) {
      win.value = freshWindow(win.value.gen, epochRef.current);
      setStats(null);
      return;
    }
    win.value = freshWindow(win.value.gen, epochRef.current);
  }, [enabled, win]);

  useEffect(() => {
    if (!enabled) return;
    if (seenGeneration.current !== generation) {
      seenGeneration.current = generation;
      win.value = freshWindow(generation);
      setStats(null);
    }
  }, [generation, win, enabled]);

  // JS-side finish: invoked from UI via runOnJS once per window. Reuses the
  // exported pure math so the formula stays single-sourced and testable.
  // The gen tag drops a stale finish whose window was superseded by a
  // generation reset while runOnJS was in flight.
  const finish = useCallback((samples: number[], gen: number, epoch: number) => {
    if (epoch !== epochRef.current || gen !== seenGeneration.current) return;
    const result = computeFrameRateStats(samples);
    if (result === null) {
      win.value = freshWindow(gen, epoch);
      return;
    }
    setStats(result);
  }, [win]);

  const onFrame = useCallback((info: FrameInfo) => {
    'worklet';
    const w = win.value;
    if (w.done) return;
    const now = info.timeSinceFirstFrame;
    if (w.last > 0) {
      w.samples.push(now - w.last);
    }
    w.last = now;
    w.count += 1;

    if (w.count >= WINDOW) {
      // Stop-gap until the JS finish answers: prevents double-dispatch while
      // runOnJS is in flight. A null result resets done=false (retry); a
      // generation reset supersedes via the gen tag.
      w.done = true;
      runOnJS(finish)([...w.samples], w.gen, w.epoch);
    }
  }, [win, finish]);

  // autostart=false keeps the callback registered but inactive: zero UI
  // work while disabled, and enabling starts a new window via the effect.
  useFrameCallback(onFrame, enabled);

  return stats;
}

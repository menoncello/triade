import { useEffect, useRef, useState } from 'react';
import { useFrameCallback, runOnJS } from 'react-native-reanimated';
import type { FrameInfo } from 'react-native-reanimated';

export interface FrameRateStats {
  fps: number;
  frames: number;
  p99Ms: number;
}

const WINDOW = 120;

export function useFrameRateBaseline(generation = 0): FrameRateStats | null {
  const [stats, setStats] = useState<FrameRateStats | null>(null);
  const durations = useRef<number[]>([]);
  const last = useRef(0);
  const count = useRef(0);
  const done = useRef(false);
  const seenGeneration = useRef(generation);

  // DW-32 AC-5: restart the 120-frame window (e.g. when the playing screen
  // mounts) so board frames — not launch-screen frames — are measured.
  // Clears samples/count/done only; WINDOW and fps/p99 math below untouched.
  useEffect(() => {
    if (seenGeneration.current !== generation) {
      seenGeneration.current = generation;
      durations.current = [];
      last.current = 0;
      count.current = 0;
      done.current = false;
      setStats(null);
    }
  }, [generation]);

  useFrameCallback((info: FrameInfo) => {
    if (done.current) return;
    const now = info.timeSinceFirstFrame;
    if (last.current > 0) {
      durations.current.push(now - last.current);
    }
    last.current = now;
    count.current++;

    if (count.current >= WINDOW) {
      done.current = true;
      const samples = durations.current;
      if (samples.length === 0) return;
      const sorted = [...samples].sort((a, b) => a - b);
      const idx = Math.floor(sorted.length * 0.99);
      const p99 = sorted[Math.min(idx, sorted.length - 1)];
      const avgMs = Math.max(samples.reduce((s, v) => s + v, 0) / samples.length, 0.001);
      runOnJS(setStats)({
        fps: 1000 / avgMs,
        frames: samples.length,
        p99Ms: p99
      });
    }
  });

  return stats;
}

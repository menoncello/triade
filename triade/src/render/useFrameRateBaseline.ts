import { useRef, useState } from 'react';
import { useFrameCallback, runOnJS } from 'react-native-reanimated';
import type { FrameInfo } from 'react-native-reanimated';

export interface FrameRateStats {
  fps: number;
  frames: number;
  p99Ms: number;
}

const WINDOW = 120;

export function useFrameRateBaseline(): FrameRateStats | null {
  const [stats, setStats] = useState<FrameRateStats | null>(null);
  const durations = useRef<number[]>([]);
  const last = useRef(0);
  const count = useRef(0);
  const done = useRef(false);

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

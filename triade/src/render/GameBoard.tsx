import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Canvas, Group, RoundedRect, Text, matchFont } from '@shopify/react-native-skia';
import type { SkFont } from '@shopify/react-native-skia';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withSequence, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import type { Board, Direction, MoveResult } from '../engine/core/index.ts';
import { planTileTransitions, type TileTransition } from './transitionPlan.ts';
import { numeralSizeFor, tileInkFor, tileFillFor, tileShapeFor } from '../ui/tileNumerals.ts';
import { presetFor } from '../feel/feel.ts';
import { maxShakeForTrace, directionVector, SHAKE_CAP } from '../feel/shake.ts';
import { BULLET_TIME_MS, shouldTriggerBulletTime } from '../feel/bulletTime.ts';
import type { ThemeId } from '../theme/index.ts';
import { THEMES } from '../theme/index.ts';

const TILE_FONT_FAMILY = Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: 'sans-serif' });

function tileTextColor(value: number, theme: ThemeId = 'dark'): string {
  return tileInkFor(value, theme);
}

function centerX(font: SkFont, value: number, cell: number): number {
  return (cell - font.measureText(String(value)).width) / 2;
}

function centerY(font: SkFont, cell: number): number {
  const m = font.getMetrics();
  return cell / 2 - (m.ascent + m.descent) / 2;
}

const GRID = 4;
const BOARD_PADDING = 8;
const CELL_GAP = 8;
const CELL_RADIUS = 10;

// T3.4 early-input release: the input gate opens at ~30% of the max fixed-duration
// animation path so the next swipe is accepted while the previous move is still
// animating (GameBoard re-plans; tiles retarget forward to their committed
// targets). Product decision 2026-08-18 — matches the responsive feel of the
// web PWA, which accepts rapid swipes mid-animation.
const EARLY_INPUT_FRACTION = 0.3;
const SLIDE_MS = 160;
const TILE_FADE_MS = 120; // longest fixed animation tail: appear fade-in duration
// Longest fixed-duration path: a merge's appear tile (SLIDE_MS delay + fade) —
// 280ms; vanish tiles are SLIDE_MS + 100ms. Spring tails (slide/scale) have no
// fixed duration and are excluded.
const MAX_MOVE_ANIM_MS = SLIDE_MS + TILE_FADE_MS;
const EARLY_INPUT_MS = Math.round(MAX_MOVE_ANIM_MS * EARLY_INPUT_FRACTION);

type TileKind = 'rest' | 'move' | 'appear' | 'vanish';

interface TileDescriptor {
  id: string;
  value: number;
  from: [number, number];
  to: [number, number];
  kind: TileKind;
  delay?: number;
  isMerge?: boolean;
}

interface Burst {
  id: string;
  x: number;
  y: number;
  value: number;
  count: number;
}

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function cellColor(value: number | null, theme: ThemeId = 'dark'): string {
  if (value === null) {
    return THEMES[theme]?.chrome.cell ?? '#262A31';
  }
  return tileFillFor(value, theme);
}

function pixel(cell: [number, number], cellSize: number): { x: number; y: number } {
  return {
    x: BOARD_PADDING + cell[1] * (cellSize + CELL_GAP),
    y: BOARD_PADDING + cell[0] * (cellSize + CELL_GAP)
  };
}

interface AnimatedTileProps {
  id: string;
  value: number;
  from: [number, number];
  to: [number, number];
  kind: TileKind;
  cell: number;
  delay?: number;
  isMerge?: boolean;
  reducedMotion?: boolean;
  onVanish: (id: string) => void;
  theme?: ThemeId;
}

function AnimatedTile({
  id,
  value,
  from,
  to,
  kind,
  cell,
  delay = 0,
  isMerge = false,
  reducedMotion = false,
  onVanish,
  theme = 'dark'
}: AnimatedTileProps) {
  const fromPos = pixel(from, cell);
  const toPos = pixel(to, cell);
  const x = useSharedValue(fromPos.x);
  const y = useSharedValue(fromPos.y);
  const scale = useSharedValue(kind === 'appear' ? 0.5 : 1);
  const opacity = useSharedValue(kind === 'appear' ? 0 : 1);
  const flashOpacity = useSharedValue(0);

  const spring = { damping: 14, stiffness: 260, mass: 0.8 };
  const isPunch = Boolean(isMerge && !reducedMotion);
  const punchPreset = isPunch ? presetFor(value) : null;
  const hasFlash = Boolean(isPunch && punchPreset?.flash);
  const hasGlow = Boolean(isPunch && value >= 1536);

  useEffect(() => {
    if (kind === 'move' || kind === 'vanish') {
      x.value = withSpring(toPos.x, spring);
      y.value = withSpring(toPos.y, spring);
      // Retarget snap: a tile promoted from 'appear' to 'move' (early-input
      // re-plan, T3.4) may still hold a pending withDelay fade-in/scale-up.
      // Assigning the settled values cancels those pending animations so the
      // tile slides fully visible instead of sliding invisibly then fading in
      // mid-motion.
      if (kind === 'move') {
        opacity.value = 1;
        scale.value = 1;
      }
    }
  }, [toPos.x, toPos.y, kind]);

  useEffect(() => {
    if (kind === 'appear') {
      if (isPunch && punchPreset) {
        // Declarative overshoot-and-snap from trace (S8.2) — data-driven scale/duration
        opacity.value = withDelay(delay, withTiming(1, { duration: 120 }));
        scale.value = withDelay(
          delay,
          withSequence(
            withTiming(punchPreset.overshootScale, { duration: punchPreset.overshootMs }),
            withSpring(1, spring)
          )
        );
        if (hasFlash) {
          flashOpacity.value = withDelay(
            delay,
            withSequence(withTiming(0.55, { duration: 60 }), withTiming(0, { duration: 140 }))
          );
        }
      } else {
        opacity.value = withDelay(delay, withTiming(1, { duration: 120 }));
        scale.value = withDelay(delay, withSpring(1, spring));
      }
    }
  }, [delay, kind, isPunch, hasFlash, punchPreset]);

  useEffect(() => {
    if (kind === 'vanish') {
      opacity.value = withDelay(
        delay + SLIDE_MS,
        withTiming(0, { duration: 100 }, (finished) => {
          if (finished) runOnJS(onVanish)(id);
        })
      );
    }
  }, [delay, kind, onVanish, id]);

  // DW-37 cell-change retarget: re-project x/y onto new pixel grid so
  // orientation/resize mid-animation does not leave stale coordinates.
  // Retarget all kinds per human decision 2026-09-02 — rest/appear snap
  // immediately; move/vanish spring to new target so in-flight motion
  // continues smoothly. Next swipe's re-plan then starts from consistent
  // logical `to` in new pixel space (no visible jump).
  useEffect(() => {
    const next = pixel(to, cell);
    if (kind === 'rest' || kind === 'appear') {
      x.value = next.x;
      y.value = next.y;
    } else if (kind === 'move' || kind === 'vanish') {
      x.value = withSpring(next.x, spring);
      y.value = withSpring(next.y, spring);
    }
  }, [cell]);

  const translate = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const scaleTransform = useDerivedValue(() => [{ scale: scale.value }]);

  const font = useMemo(() => {
    const size = numeralSizeFor(value, cell);
    return matchFont({ fontFamily: TILE_FONT_FAMILY, fontSize: size, fontWeight: 'bold' });
  }, [cell, value]);

  const shape = tileShapeFor(value);

  return (
    <Group transform={translate}>
      {/* Glow behind tile for 1536+ only — soft outer rect (only glow in system) */}
      {hasGlow ? (
        <RoundedRect
          x={-4}
          y={-4}
          width={cell + 8}
          height={cell + 8}
          r={CELL_RADIUS + 2}
          color="#ff8c2f"
          opacity={0.28}
        />
      ) : null}
      <Group transform={scaleTransform} origin={{ x: cell / 2, y: cell / 2 }}>
        <RoundedRect
          x={0}
          y={0}
          width={cell}
          height={cell}
          r={CELL_RADIUS}
          color={cellColor(value, theme)}
          opacity={opacity}
        />
        {/* Facet grain beyond color — varying by tier band (FR-31, UX-DR-19) */}
        {shape.grain > 0 ? (
          <RoundedRect
            x={3}
            y={3}
            width={cell - 6}
            height={cell - 6}
            r={CELL_RADIUS - 2}
            color="#000000"
            // @ts-ignore Skia stroke
            style="stroke"
            strokeWidth={shape.bevel}
            opacity={shape.grain === 1 ? 0.14 : 0.22}
          />
        ) : null}
        {shape.grain === 2 ? (
          <RoundedRect
            x={6}
            y={6}
            width={cell - 12}
            height={cell - 12}
            r={CELL_RADIUS - 4}
            color="#000000"
            // @ts-ignore Skia stroke
            style="stroke"
            strokeWidth={0.9}
            opacity={0.12}
          />
        ) : null}
        {/* Flash overlay — imperative worklet via shared value, heavy tier only */}
        {hasFlash ? (
          <RoundedRect x={0} y={0} width={cell} height={cell} r={CELL_RADIUS} color="#fff7e0" opacity={flashOpacity} />
        ) : null}
        {font ? (
          <Text
            x={centerX(font, value, cell)}
            y={centerY(font, cell)}
            text={String(value)}
            font={font}
            color={tileTextColor(value, theme)}
            opacity={opacity}
          />
        ) : null}
      </Group>
    </Group>
  );
}

function ParticleDot({ angle, distance, delay }: { angle: number; distance: number; delay: number }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const op = useSharedValue(1);
  const sc = useSharedValue(1);
  useEffect(() => {
    tx.value = withDelay(delay, withTiming(Math.cos(angle) * distance, { duration: 300 }));
    ty.value = withDelay(delay, withTiming(Math.sin(angle) * distance, { duration: 300 }));
    op.value = withDelay(delay, withTiming(0, { duration: 340 }));
    sc.value = withDelay(delay, withTiming(0.2, { duration: 340 }));
  }, [angle, distance, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: sc.value }],
    opacity: op.value,
  }));
  return (
    <Animated.View
      // @ts-ignore reanimated style
      style={[
        {
          position: 'absolute',
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: '#fff0c2',
          borderWidth: 1,
          borderColor: '#e8a33d',
          left: -3,
          top: -3,
        },
        style,
      ]}
    />
  );
}

function BurstView({ x, y, count }: { x: number; y: number; count: number }) {
  const dots = useMemo(() => {
    const arr: Array<{ angle: number; distance: number; delay: number }> = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12);
      const distance = 14 + (i % 3) * 8 + (count > 8 ? 6 : 0);
      const delay = (i % 4) * 16;
      arr.push({ angle, distance, delay });
    }
    return arr;
  }, [count]);
  return (
    <View style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }} pointerEvents="none">
      {dots.map((d, i) => (
        <ParticleDot key={i} angle={d.angle} distance={d.distance} delay={d.delay} />
      ))}
    </View>
  );
}

export interface GameBoardProps {
  board: Board;
  moveResult: MoveResult | null;
  width: number;
  reducedMotion?: boolean;
  sessionBestMerge?: number;
  onMoveSettled?: () => void;
  hintHighlight?: [[number, number], [number, number]] | null;
  direction?: Direction;
  onShakeActiveChange?: (active: boolean) => void;
  theme?: ThemeId;
}

export function GameBoard({ board, moveResult, width, reducedMotion = false, sessionBestMerge, onMoveSettled, hintHighlight, direction, onShakeActiveChange, theme = 'dark' }: GameBoardProps) {
  const finiteWidth = Number.isFinite(width) ? (width as number) : 1;
  const safeWidth = Math.max(1, finiteWidth);
  const cell = Math.max((safeWidth - BOARD_PADDING * 2 - CELL_GAP * (GRID - 1)) / GRID, 1);
  // S8.3 screen shake — imperative worklet on board container only (never chrome)
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }],
  }));
  // S8.4 bullet-time flash — imperative worklet on board only (never chrome), ~200ms datum
  const bulletFlash = useSharedValue(0);
  const bulletFlashStyle = useAnimatedStyle(() => ({
    opacity: bulletFlash.value,
  }));
  // DW-107: board shake 5-8px must not be clipped by parent overflow hidden — notify parent to toggle overflow visible during 130ms shake
  const shakeNotifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifyShakeActive = useCallback(
    (active: boolean) => {
      try {
        onShakeActiveChange?.(active);
      } catch {}
    },
    [onShakeActiveChange],
  );
  useEffect(() => {
    return () => {
      if (shakeNotifyTimerRef.current) {
        clearTimeout(shakeNotifyTimerRef.current);
        shakeNotifyTimerRef.current = null;
      }
    };
  }, []);
  // Schedule overflow visible for 130ms shake sequence; compensating padding (BOARD_PADDING + SHAKE_CAP) documented as alternative
  const scheduleShakeVisible = useCallback(() => {
    notifyShakeActive(true);
    if (shakeNotifyTimerRef.current) clearTimeout(shakeNotifyTimerRef.current);
    shakeNotifyTimerRef.current = setTimeout(() => {
      shakeNotifyTimerRef.current = null;
      notifyShakeActive(false);
    }, 130);
  }, [notifyShakeActive]);
  const cancelShakeNotify = useCallback(() => {
    if (shakeNotifyTimerRef.current) {
      clearTimeout(shakeNotifyTimerRef.current);
      shakeNotifyTimerRef.current = null;
    }
    notifyShakeActive(false);
  }, [notifyShakeActive]);
  // Cancel shake immediately if Reduced Motion is enabled mid-animation (FR-30, UX-DR-16)
  useEffect(() => {
    if (reducedMotion) {
      shakeX.value = withTiming(0, { duration: 20 });
      shakeY.value = withTiming(0, { duration: 20 });
      bulletFlash.value = withTiming(0, { duration: 20 });
      cancelShakeNotify();
    }
  }, [reducedMotion, shakeX, shakeY, bulletFlash, cancelShakeNotify]);
  const prevBoardRef = useRef(board);
  const idRef = useRef(0);
  const nextId = useCallback(() => `t${idRef.current++}`, []);

  const [tiles, setTilesState] = useState<TileDescriptor[]>(() => {
    const initial: TileDescriptor[] = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const v = board[r][c];
        if (v !== null) {
          initial.push({ id: nextId(), value: v, from: [r, c], to: [r, c], kind: 'rest' });
        }
      }
    }
    return initial;
  });
  const tilesRef = useRef(tiles);
  const prevMoveResultRef = useRef<MoveResult | null>(moveResult);

  // Single disciplined writer for tiles state + ref (DW-36/DW-38): every
  // mutation must route via this helper so tilesRef never desyncs from
  // React state. No direct setTilesState+separate ref assignment elsewhere.
  const syncTiles = useCallback((next: TileDescriptor[]) => {
    tilesRef.current = next;
    setTilesState(next);
  }, []);

  const rebuildTilesFromBoard = useCallback(
    (boardToRender: Board): TileDescriptor[] => {
      const next: TileDescriptor[] = [];
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const v = boardToRender[r][c];
          if (v !== null) {
            next.push({ id: nextId(), value: v, from: [r, c], to: [r, c], kind: 'rest' });
          }
        }
      }
      return next;
    },
    [nextId]
  );

  // T3.4 early-input release: onMoveSettled opens the App input gate ~30% into
  // the animation (EARLY_INPUT_MS), not after every tile finishes settling, so
  // rapid swipes are accepted while the previous move is still animating.
  const onMoveSettledRef = useRef(onMoveSettled);
  useEffect(() => {
    onMoveSettledRef.current = onMoveSettled;
  });
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
        // DW-39: unmount mid-animation must release App gate, not just leak timer
        onMoveSettledRef.current?.();
      }
    };
  }, []);

  const [bursts, setBursts] = useState<Burst[]>([]);

  const applyPlan = useCallback(
    (plan: TileTransition[]) => {
      if (plan.length === 0) return;
      const idPool = plan.map(() => nextId());
      const prev = tilesRef.current;
      const byCell = new Map<string, TileDescriptor>();
      for (const t of prev) byCell.set(cellKey(t.to[0], t.to[1]), t);
      const next: TileDescriptor[] = [];
      for (const t of prev) {
        if (t.kind === 'vanish') next.push(t);
      }
      const newBursts: Burst[] = [];
      for (let i = 0; i < plan.length; i++) {
        const tr = plan[i];
        if (tr.type === 'spawn') {
          next.push({ id: idPool[i], value: tr.value, from: tr.to, to: tr.to, kind: 'appear' });
        } else if (tr.type === 'merge') {
          const a = byCell.get(cellKey(tr.from[0][0], tr.from[0][1]));
          const b = byCell.get(cellKey(tr.from[1][0], tr.from[1][1]));
          // Retarget: a source tile that was itself an in-flight 'appear' (early
          // input) carries a stale fade-in `delay` — dropping it here keeps the
          // vanish on its own SLIDE_MS schedule instead of lingering extra ms.
          if (a) next.push({ ...a, from: a.to, to: tr.to, kind: 'vanish', delay: 0 });
          if (b) next.push({ ...b, from: b.to, to: tr.to, kind: 'vanish', delay: 0 });
          next.push({ id: idPool[i], value: tr.value, from: tr.to, to: tr.to, kind: 'appear', delay: SLIDE_MS, isMerge: true });
          // Imperative particle burst — only when not reducedMotion; scaled by preset (4/8/16)
          if (!reducedMotion) {
            const preset = presetFor(tr.value);
            if (preset.particleBurst > 0) {
              const p = pixel(tr.to, cell);
              newBursts.push({
                id: `b${idPool[i]}`,
                x: p.x + cell / 2,
                y: p.y + cell / 2,
                value: tr.value,
                count: preset.particleBurst,
              });
            }
          }
        } else {
          const src = byCell.get(cellKey(tr.from[0][0], tr.from[0][1]));
          if (src) {
            next.push({
              ...src,
              value: tr.value,
              from: src.to,
              to: tr.to,
              kind: tr.type === 'slide' ? 'move' : 'rest'
            });
          } else {
            next.push({ id: idPool[i], value: tr.value, from: tr.to, to: tr.to, kind: 'appear' });
          }
        }
      }
      syncTiles(next);
      if (newBursts.length > 0) {
        setBursts((prev) => [...prev, ...newBursts]);
        // Auto-clear bursts after animation window so they don't accumulate
        setTimeout(() => {
          setBursts((prev) => prev.filter((b) => !newBursts.some((nb) => nb.id === b.id)));
        }, 500);
      }
    },
    [nextId, cell, reducedMotion, syncTiles]
  );

  useEffect(() => {
    if (!moveResult) {
      // DW-88/DW-89: rebuild tiles when moveResult nulls after non-null (restart/undo)
      // and clear any pending settle timer so it doesn't fire stale post-restart.
      if (prevMoveResultRef.current !== null) {
        if (settleTimerRef.current) {
          clearTimeout(settleTimerRef.current);
          settleTimerRef.current = null;
        }
        const rebuilt = rebuildTilesFromBoard(board);
        syncTiles(rebuilt);
        // Clear bursts that belong to previous game
        setBursts([]);
      }
      prevBoardRef.current = board;
      prevMoveResultRef.current = moveResult;
      return;
    }
    const plan = planTileTransitions(prevBoardRef.current, moveResult);
    applyPlan(plan);
    prevBoardRef.current = board;
    prevMoveResultRef.current = moveResult;
    // S8.3 directional screen shake — data-driven from FeelPreset.shakeMs, capped ≤SHAKE_CAP,
    // disabled under Reduced Motion, silent on NOOP/no-merge, board only.
    // DW-107: toggle parent overflow visible during 130ms shake or add compensating padding (BOARD_PADDING + SHAKE_CAP spare)
    if (moveResult.moved && !reducedMotion && direction) {
      const maxShake = maxShakeForTrace(moveResult.trace, reducedMotion);
      const amplitude = Math.min(maxShake, SHAKE_CAP);
      if (amplitude > 0) {
        scheduleShakeVisible();
        const vec = directionVector(direction);
        // Only drive the axis matching swipe direction; invalid dir -> zero vector -> no shake
        if (vec.x !== 0) {
          shakeX.value = withSequence(
            withTiming(amplitude * vec.x, { duration: 30 }),
            withTiming(-amplitude * 0.6 * vec.x, { duration: 40 }),
            withTiming(amplitude * 0.3 * vec.x, { duration: 30 }),
            withTiming(0, { duration: 30 }),
          );
          shakeY.value = withTiming(0, { duration: 130 });
        } else if (vec.y !== 0) {
          shakeY.value = withSequence(
            withTiming(amplitude * vec.y, { duration: 30 }),
            withTiming(-amplitude * 0.6 * vec.y, { duration: 40 }),
            withTiming(amplitude * 0.3 * vec.y, { duration: 30 }),
            withTiming(0, { duration: 30 }),
          );
          shakeX.value = withTiming(0, { duration: 130 });
        } else {
          // Invalid direction — suppress shake
          shakeX.value = withTiming(0, { duration: 20 });
          shakeY.value = withTiming(0, { duration: 20 });
          cancelShakeNotify();
        }
      } else {
        // Effective move but no merge (slide-only) — cancel any prior shake so it doesn't bleed
        shakeX.value = withTiming(0, { duration: 20 });
        shakeY.value = withTiming(0, { duration: 20 });
        cancelShakeNotify();
      }
    } else {
      // NOOP, Reduced Motion, or missing direction — cancel any residual shake
      // (covers slide-only after merge, NOOP moves, and mid-shake Reduced Motion toggle)
      if (shakeX.value !== 0 || shakeY.value !== 0) {
        shakeX.value = withTiming(0, { duration: 20 });
        shakeY.value = withTiming(0, { duration: 20 });
      }
      cancelShakeNotify();
    }
    // S8.4 bullet time — rarity-gated flash on new session-best, ~200ms, board only
    // Never throws on invalid trace; Reduced Motion suppresses; NOOP never triggers
    try {
      const safeBest = Number.isFinite(sessionBestMerge) ? (sessionBestMerge as number) : 0;
      if (moveResult.moved && !reducedMotion && shouldTriggerBulletTime(moveResult.trace, safeBest, !!reducedMotion)) {
        bulletFlash.value = withSequence(
          withTiming(0.45, { duration: 60 }),
          withTiming(0, { duration: BULLET_TIME_MS - 60 }),
        );
      }
    } catch {
      // never throw
    }
    // Re-arm the input-release timer for this move: a noop (empty plan)
    // animates nothing, so it must not touch the gate. An effective move opens
    // the gate after ~30% of the animation; a new swipe then re-plans and tiles
    // retarget forward to their committed targets.
    // DW-35/DW-90: if engine reports moved:true with empty plan, fallback still releases gate.
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    if (plan.length > 0) {
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        onMoveSettledRef.current?.();
      }, EARLY_INPUT_MS);
    } else if (moveResult.moved) {
      // moved:true but empty plan -> deadlock without fallback; release quickly
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        onMoveSettledRef.current?.();
      }, EARLY_INPUT_MS);
    }
  }, [moveResult, board, applyPlan, direction, reducedMotion, sessionBestMerge, shakeX, shakeY, bulletFlash, syncTiles, rebuildTilesFromBoard, scheduleShakeVisible, cancelShakeNotify]);

  const onVanish = useCallback((id: string) => {
    const next = tilesRef.current.filter((t) => t.id !== id);
    syncTiles(next);
  }, [syncTiles]);

  const renderOrder = (kind: TileKind): number => {
    if (kind === 'appear') return 0;
    if (kind === 'rest') return 1;
    return 2;
  };

  const ordered = [...tiles].sort((a, b) => renderOrder(a.kind) - renderOrder(b.kind));

  // board container is width, height: width (safeWidth alias keeps 1:1 square; DW-110 guard via safeWidth)
  return (
    <View style={{ width: safeWidth, height: safeWidth }}>
      <Animated.View style={shakeStyle}>
        <View importantForAccessibility="no-hide-descendants" accessible={false} style={{ width: safeWidth, height: safeWidth }}>
          <Canvas style={{ width: safeWidth, height: safeWidth }}>
          <RoundedRect x={0} y={0} width={safeWidth} height={safeWidth} r={14} color={THEMES[theme]?.chrome.board ?? '#1A1D23'} />
          {ordered.map((t) => (
            <AnimatedTile
              key={t.id}
              id={t.id}
              value={t.value}
              from={t.from}
              to={t.to}
              kind={t.kind}
              cell={cell}
              delay={t.delay}
              isMerge={t.isMerge}
              reducedMotion={reducedMotion}
              onVanish={onVanish}
              theme={theme}
            />
          ))}
        </Canvas>
        </View>
      </Animated.View>
      {/* S8.4 bullet-time flash overlay — board only, ~200ms, suppressed under Reduced Motion */}
      {/* DW-110: width guard — Math.max(1, finiteWidth) validated via safeWidth so NaN never propagates to overlay style */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            width: safeWidth,
            height: safeWidth,
            borderRadius: 14,
            backgroundColor: '#fff7e0',
          },
          bulletFlashStyle,
        ]}
      />
      {/* Imperative particle bursts — worklets in src/feel layer mounted from board (S8.2) */}
      {bursts.map((b) => (
        <BurstView key={b.id} x={b.x} y={b.y} count={b.count} />
      ))}
      {hintHighlight
        ? hintHighlight.map(([r, c]) => {
            const pos = pixel([r, c], cell);
            return (
              <View
                key={`hint-${r}-${c}`}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  width: cell,
                  height: cell,
                  borderWidth: 3,
                  borderColor: THEMES[theme]?.chrome.accent ?? '#E8A33D',
                  borderRadius: CELL_RADIUS,
                }}
                pointerEvents="none"
                accessibilityLabel="dica"
              />
            );
          })
        : null}
    </View>
  );
}

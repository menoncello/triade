import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Canvas, Group, RoundedRect, Text, matchFont } from '@shopify/react-native-skia';
import type { SkFont } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withDelay, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import type { Board, MoveResult } from '../engine/core/index.ts';
import { planTileTransitions, type TileTransition } from './transitionPlan.ts';
import { numeralSizeFor, tileInkFor } from '../ui/tileNumerals.ts';

const TILE_FONT_FAMILY = Platform.select({ ios: 'Helvetica', android: 'sans-serif', default: 'sans-serif' });

function tileTextColor(value: number): string {
  return tileInkFor(value);
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
}

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function cellColor(value: number | null): string {
  if (value === null) return '#d8d3cc';
  if (value === 1) return '#f9e3ae';
  if (value === 2) return '#f7d488';
  if (value === 3) return '#eec06e';
  if (value <= 6) return '#e0a84f';
  if (value <= 12) return '#cf8a2e';
  if (value <= 24) return '#b46a1e';
  return '#8f4d12';
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
  onVanish: (id: string) => void;
}

function AnimatedTile({
  id,
  value,
  from,
  to,
  kind,
  cell,
  delay = 0,
  onVanish
}: AnimatedTileProps) {
  const fromPos = pixel(from, cell);
  const toPos = pixel(to, cell);
  const x = useSharedValue(fromPos.x);
  const y = useSharedValue(fromPos.y);
  const scale = useSharedValue(kind === 'appear' ? 0.5 : 1);
  const opacity = useSharedValue(kind === 'appear' ? 0 : 1);

  const spring = { damping: 14, stiffness: 260, mass: 0.8 };

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
      opacity.value = withDelay(delay, withTiming(1, { duration: 120 }));
      scale.value = withDelay(delay, withSpring(1, spring));
    }
  }, [delay, kind]);

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

  const translate = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const scaleTransform = useDerivedValue(() => [{ scale: scale.value }]);

  const font = useMemo(() => {
    const size = numeralSizeFor(value, cell);
    return matchFont({ fontFamily: TILE_FONT_FAMILY, fontSize: size, fontWeight: 'bold' });
  }, [cell, value]);

  return (
    <Group transform={translate}>
      <Group transform={scaleTransform} origin={{ x: cell / 2, y: cell / 2 }}>
        <RoundedRect
          x={0}
          y={0}
          width={cell}
          height={cell}
          r={CELL_RADIUS}
          color={cellColor(value)}
          opacity={opacity}
        />
        {font ? (
          <Text
            x={centerX(font, value, cell)}
            y={centerY(font, cell)}
            text={String(value)}
            font={font}
            color={tileTextColor(value)}
            opacity={opacity}
          />
        ) : null}
      </Group>
    </Group>
  );
}

export interface GameBoardProps {
  board: Board;
  moveResult: MoveResult | null;
  width: number;
  onMoveSettled?: () => void;
}

export function GameBoard({ board, moveResult, width, onMoveSettled }: GameBoardProps) {
  const cell = Math.max((width - BOARD_PADDING * 2 - CELL_GAP * (GRID - 1)) / GRID, 1);
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
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, []);

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
          next.push({ id: idPool[i], value: tr.value, from: tr.to, to: tr.to, kind: 'appear', delay: SLIDE_MS });
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
      tilesRef.current = next;
      setTilesState(next);
    },
    [nextId]
  );

  useEffect(() => {
    if (!moveResult) {
      prevBoardRef.current = board;
      return;
    }
    const plan = planTileTransitions(prevBoardRef.current, moveResult);
    applyPlan(plan);
    prevBoardRef.current = board;
    // Re-arm the input-release timer for this move: a noop (empty plan)
    // animates nothing, so it must not touch the gate. An effective move opens
    // the gate after ~30% of the animation; a new swipe then re-plans and tiles
    // retarget forward to their committed targets.
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    if (plan.length > 0) {
      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        onMoveSettledRef.current?.();
      }, EARLY_INPUT_MS);
    }
  }, [moveResult, board, applyPlan]);

  const onVanish = useCallback((id: string) => {
    const next = tilesRef.current.filter((t) => t.id !== id);
    tilesRef.current = next;
    setTilesState(next);
  }, []);

  const renderOrder = (kind: TileKind): number => {
    if (kind === 'appear') return 0;
    if (kind === 'rest') return 1;
    return 2;
  };

  const ordered = [...tiles].sort((a, b) => renderOrder(a.kind) - renderOrder(b.kind));

  return (
    <Canvas style={{ width, height: width }}>
      <RoundedRect x={0} y={0} width={width} height={width} r={14} color="#bdb6ab" />
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
          onVanish={onVanish}
        />
      ))}
    </Canvas>
  );
}

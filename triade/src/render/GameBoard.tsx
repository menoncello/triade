import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, Group, RoundedRect } from '@shopify/react-native-skia';
import { useDerivedValue, useSharedValue, withDelay, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import type { Board, MoveResult } from '../engine/core/index.ts';
import { planTileTransitions, type TileTransition } from './transitionPlan.ts';

const GRID = 4;
const BOARD_PADDING = 8;
const CELL_GAP = 8;
const CELL_RADIUS = 10;
const SLIDE_MS = 160;

type TileKind = 'rest' | 'move' | 'appear' | 'vanish';

interface TileDescriptor {
  id: string;
  value: number;
  from: [number, number];
  to: [number, number];
  kind: TileKind;
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
  onVanish: (id: string) => void;
}

function AnimatedTile({ id, value, from, to, kind, cell, onVanish }: AnimatedTileProps) {
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
    }
  }, [toPos.x, toPos.y]);

  useEffect(() => {
    if (kind === 'appear') {
      opacity.value = withTiming(1, { duration: 120 });
      scale.value = withSpring(1, spring);
    }
  }, []);

  useEffect(() => {
    if (kind === 'vanish') {
      opacity.value = withDelay(
        SLIDE_MS,
        withTiming(0, { duration: 100 }, (finished) => {
          if (finished) runOnJS(onVanish)(id);
        })
      );
    }
  }, []);

  const translate = useDerivedValue(() => [{ translateX: x.value }, { translateY: y.value }]);
  const scaleTransform = useDerivedValue(() => [{ scale: scale.value }]);

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
      </Group>
    </Group>
  );
}

export interface GameBoardProps {
  board: Board;
  moveResult: MoveResult | null;
  width: number;
}

export function GameBoard({ board, moveResult, width }: GameBoardProps) {
  const cell = (width - BOARD_PADDING * 2 - CELL_GAP * (GRID - 1)) / GRID;
  const prevBoardRef = useRef(board);
  const idRef = useRef(0);
  const nextId = useCallback(() => `t${idRef.current++}`, []);

  const [tiles, setTiles] = useState<TileDescriptor[]>(() => {
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

  const applyPlan = useCallback(
    (plan: TileTransition[]) => {
      setTiles((prev) => {
        const byCell = new Map<string, TileDescriptor>();
        for (const t of prev) byCell.set(cellKey(t.to[0], t.to[1]), t);
        const next: TileDescriptor[] = [];
        for (const tr of plan) {
          if (tr.type === 'spawn') {
            next.push({ id: nextId(), value: tr.value, from: tr.to, to: tr.to, kind: 'appear' });
          } else if (tr.type === 'merge') {
            const a = byCell.get(cellKey(tr.from[0][0], tr.from[0][1]));
            const b = byCell.get(cellKey(tr.from[1][0], tr.from[1][1]));
            if (a) next.push({ ...a, from: a.to, to: tr.to, kind: 'vanish' });
            if (b) next.push({ ...b, from: b.to, to: tr.to, kind: 'vanish' });
            next.push({ id: nextId(), value: tr.value, from: tr.to, to: tr.to, kind: 'appear' });
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
              next.push({ id: nextId(), value: tr.value, from: tr.to, to: tr.to, kind: 'appear' });
            }
          }
        }
        return next;
      });
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
  }, [moveResult, board, applyPlan]);

  const onVanish = useCallback((id: string) => {
    setTiles((prev) => prev.filter((t) => t.id !== id));
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
          onVanish={onVanish}
        />
      ))}
    </Canvas>
  );
}

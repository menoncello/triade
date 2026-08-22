import { resolveSwipeDirection } from '../../src/ui/swipe.ts';
import type { Direction } from '../../src/engine/core/index.ts';

export interface SwipeGesture {
  dx: number;
  dy: number;
}

export const DIRECTION_GESTURES: Record<Direction, SwipeGesture> = {
  left: { dx: -60, dy: 0 },
  right: { dx: 60, dy: 0 },
  up: { dx: 0, dy: -60 },
  down: { dx: 0, dy: 60 }
};

export function gestureFor(direction: Direction): SwipeGesture {
  return { ...DIRECTION_GESTURES[direction] };
}

export class InputSimulator {
  constructor(
    private readonly dispatch: (dir: Direction) => void,
    private readonly isBusy: () => boolean
  ) {}

  swipe(gesture: SwipeGesture): boolean {
    const dir = resolveSwipeDirection(gesture);
    if (dir === null || this.isBusy()) return false;
    this.dispatch(dir);
    return true;
  }

  swipeDirection(direction: Direction): boolean {
    return this.swipe(gestureFor(direction));
  }
}

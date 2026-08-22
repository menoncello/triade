import { GameE2ETestFixture } from './GameE2ETestFixture.ts';
import type { LaunchOptions } from './GameE2ETestFixture.ts';
import type { Direction } from '../../src/engine/core/index.ts';

export class ScenarioBuilder {
  private options: LaunchOptions = {};
  private queued: Direction[] = [];

  withSeed(seed: number): this {
    this.options.seed = seed;
    return this;
  }

  withPersistedBest(best: number | string): this {
    this.options.persistedBest = best;
    return this;
  }

  queueSwipe(direction: Direction): this {
    this.queued.push(direction);
    return this;
  }

  queueSwipes(directions: Direction[]): this {
    this.queued.push(...directions);
    return this;
  }

  async launch(): Promise<GameE2ETestFixture> {
    const fixture = await GameE2ETestFixture.launch(this.options);
    for (const dir of this.queued) {
      fixture.input.swipeDirection(dir);
      fixture.settle();
    }
    return fixture;
  }
}

export function scenario(): ScenarioBuilder {
  return new ScenarioBuilder();
}

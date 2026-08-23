import { newGame, move, isGameOver } from '../../src/engine/core/index.ts';
import type { Board, Direction, GameState, MoveResult, PendingSpawn } from '../../src/engine/core/index.ts';
import { applyMove, initialScore, isNewRecord } from '../../src/game/matchScore.ts';
import type { MatchScore } from '../../src/game/matchScore.ts';
import {
  loadBest,
  saveBest,
  setStorageBackendForTests,
  STORAGE_KEYS
} from '../../src/services/storage/settingsStore.ts';
import { mulberry32 } from '../../src/utils/mulberry32.ts';
import { createMemoryStorage } from './memoryStorage.ts';
import type { MemoryStorage } from './memoryStorage.ts';
import { InputSimulator } from './inputSimulator.ts';

export interface LaunchOptions {
  seed?: number;
  persistedBest?: number | string;
}

export interface SessionSnapshot {
  board: Board;
  match: MatchScore;
  persistedBest: number;
  hydrationOk: boolean;
  busy: boolean;
  ready: boolean;
}

export class GameE2ETestFixture {
  storage!: MemoryStorage;
  input!: InputSimulator;

  private rng: () => number = Math.random;
  private sessionStartBestRef = 0;
  private hydrationOkRef = true;
  private busyRef = false;
  private readyState = false;
  private state: GameState = { board: [], pendingSpawn: { value: 1, displayRoll: 0 } };
  private matchState: MatchScore = { score: 0, best: 0 };
  private persistedBestState = 0;
  private lastResult: MoveResult | null = null;

  static async launch(options: LaunchOptions = {}): Promise<GameE2ETestFixture> {
    const fixture = new GameE2ETestFixture();
    const initial: Record<string, string> = {};
    if (options.persistedBest !== undefined) {
      initial[STORAGE_KEYS.best] = String(options.persistedBest);
    }
    fixture.storage = createMemoryStorage(initial);
    setStorageBackendForTests(fixture.storage);

    if (options.seed !== undefined) fixture.rng = mulberry32(options.seed);

    const result = await loadBest();
    fixture.hydrationOkRef = result.ok;
    fixture.sessionStartBestRef = result.best;
    fixture.persistedBestState = result.best;
    fixture.matchState = initialScore(result.best);
    fixture.state = newGame(fixture.rng);
    fixture.readyState = true;

    fixture.input = new InputSimulator(
      (dir) => fixture.doMove(dir),
      () => fixture.busyRef
    );
    return fixture;
  }

  doMove(dir: Direction): MoveResult {
    if (!this.readyState) throw new Error('fixture not launched');
    if (this.busyRef) return this.lastMoveGuard();
    const result = move(this.state, dir, this.rng);
    this.state = { board: result.board, pendingSpawn: result.pendingSpawn };
    this.lastResult = result;
    this.matchState = applyMove(this.matchState, result);
    if (result.moved) this.busyRef = true;
    return result;
  }

  onMoveSettled(): void {
    this.busyRef = false;
  }

  settle(): void {
    this.busyRef = false;
  }

  async syncPersistence(): Promise<boolean> {
    if (!this.hydrationOkRef) return false;
    if (
      isNewRecord(this.sessionStartBestRef, this.matchState.best) &&
      this.matchState.best > this.persistedBestState
    ) {
      const ok = await saveBest(this.matchState.best);
      if (ok) this.persistedBestState = this.matchState.best;
      return ok;
    }
    return false;
  }

  snapshot(): SessionSnapshot {
    return {
      board: this.board.map((row) => row.slice()),
      match: { ...this.matchState },
      persistedBest: this.persistedBestState,
      hydrationOk: this.hydrationOkRef,
      busy: this.busyRef,
      ready: this.readyState
    };
  }

  get board(): Board {
    return this.state.board;
  }

  get pendingSpawn(): PendingSpawn {
    return { ...this.state.pendingSpawn };
  }

  get score(): number {
    return this.matchState.score;
  }

  get best(): number {
    return this.matchState.best;
  }

  get isBusy(): boolean {
    return this.busyRef;
  }

  get gameOver(): boolean {
    return isGameOver(this.state.board);
  }

  get occupiedCount(): number {
    let n = 0;
    for (const row of this.state.board) {
      for (const cell of row) {
        if (cell !== null) n++;
      }
    }
    return n;
  }

  async teardown(): Promise<void> {
    setStorageBackendForTests(null);
  }

  private lastMoveGuard(): MoveResult {
    // ADR-06 copying discipline: the fallback must not hand out live fixture
    // state — board rows and pendingSpawn are both copied so a mutating caller
    // cannot corrupt the snapshot.
    return this.lastResult ?? {
      board: this.state.board.map((row) => row.slice()),
      score: 0,
      moved: false,
      trace: [],
      pendingSpawn: { ...this.state.pendingSpawn }
    };
  }
}

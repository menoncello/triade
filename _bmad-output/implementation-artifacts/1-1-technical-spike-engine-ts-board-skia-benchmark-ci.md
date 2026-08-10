---
baseline_commit: d3a215870a933b51504552fc3e44b0c5a47d96b5
---

# Story 1.1: Technical spike — engine TS + board Skia + benchmark CI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a game developer,
I want to de-risk the RN + Skia migration before committing to the full UI rewrite,
so that I know the engine ports cleanly, one board renders at 60fps, and the CI benchmark gate exists.

## Acceptance Criteria

1. **Given** a new Expo SDK 57 (blank-typescript) development build project with the Pinned Version Matrix installed,
   **When** I port `js/game.js` to TypeScript in `src/engine/core` and render one 4×4 board in Skia,
   **Then** the 26 existing unit tests pass unchanged against the ported engine (`node --test`).
2. **And** the ported engine is a pure TS module with no RN/React/Skia imports (ADR-01 boundary).
3. **And** the CI benchmark ships in the same PR: engine cost per turn < 2ms and frame-logic worst case < 8ms, deterministic on Node.
4. **And** one Skia board renders on a physical iOS device with a real frame rate recorded (baseline for the device-level p99 < 16.7ms job).
5. **And** the spike result is recorded in the architecture document before the full UI rewrite is greenlit (FR-5).

## Tasks / Subtasks

- [x] T1 — Initialize the Expo SDK 57 project (AC: 1)
  - [x] T1.1 Scaffold `triade/` from `create-expo-app@latest --template blank-typescript` (dev build; Expo Go is NOT a target)
  - [x] T1.2 Install only the spike-scoped deps via `npx expo install`: `@shopify/react-native-skia`, `react-native-reanimated`, `react-native-worklets` (versions per Pinned Version Matrix). Do NOT install the monetization/telemetry/audio stack (purchases, google-mobile-ads, firebase, audio, secure-store, i18next, haptics, localization, tracking-transparency) — those are pinned for later stories, not the spike
  - [x] T1.3 Verify versions against the Pinned Version Matrix (`package.json`); configure `app.json` config plugins — verified; **no `app.json` config plugin required** (2026-08-10): worklets is a babel plugin and `babel-preset-expo` (SDK 57) auto-adds `react-native-worklets/plugin` when the package is installed (confirmed in installed source, `babel-preset-expo/build/configs/expo.js:107-111`). No `app.json` plugins entry is valid or needed for this dependency set.
  - [ ] T1.4 Verify a dev build boots on a physical iOS device (Metro + Xcode via Expo prebuild) — DEVICE GATE (requires connected device + CocoaPods) — **DEFERRED 2026-08-10** (no physical iPhone / Apple account); simulator boot validated instead
- [x] T2 — Port the rules engine to TypeScript (AC: 1, 2)
  - [x] T2.1 Port `js/game.js` → `src/engine/core/` with identical behavior: `canMerge`, `mergeValue`, `shiftLine` (front-to-back, merge-once, one-cell), `movementLines`, `boardFromLines` + trace, `boardsEqual` (required by effective-move-only spawn), `spawnTile`, `newGame`, `move` (effective-move-only spawn), `isGameOver`
  - [x] T2.2 Keep `move()` returning `{ board, score, moved, trace }` with the exact per-tile trace contract
  - [x] T2.3 Keep `rng` injectable on `newGame`/`move`/`spawnTile` (no `Math.random` in engine internals where rng is passed)
  - [x] T2.4 Type the engine: `Board`, `Cell`, `Direction`, `MoveResult`, `TraceEntry`, `Rng`; no `any` leaks
  - [x] T2.5 Verify `src/engine` imports NOTHING from RN/React/Skia/Expo (ADR-01)
- [x] T3 — Port the 26 unit tests (AC: 1)
  - [x] T3.1 Port `test/game.test.js` → `__tests__/engine/` keeping every assertion identical in logic (rngOf, staticBoard, boardWith, emptyBoard helpers)
  - [x] T3.2 Run with `node --test` and confirm 26/26 pass against the TS engine
  - [x] T3.3 Wire the test command into `package.json` scripts (e.g. `"test": "node --test"`)
- [x] T4 — Deterministic CI benchmark (AC: 3)
  - [x] T4.1 Create `benchmarks/` as pure TS running on Node (independent of `__DEV__` and the RN runtime)
  - [x] T4.2 Engine cost per turn: measure spawn + merge-once + game-over detection; budget < 2ms
  - [x] T4.3 Frame-logic worst case: slide merging 4 locked pairs simultaneously; budget < 8ms
  - [x] T4.4 Ensure determinism (fixed seed, no wall-clock flakes); CI gate fails the PR over budget
  - [x] T4.6 Wire the CI gate into the repo: add `.github/workflows/ci.yml` (Node 26, `npm ci` / `npm install`, `node --test`, benchmark with assert-fail over budget); benchmark and tests must run on every PR and the gate must fail the PR over budget
  - [ ] T4.5 (Optional spike question) Micro-benchmark AsyncStorage vs MMKV read/write — S1.4 persistence decision depends on it — DEFERRED (out of spike scope: requires storage deps excluded by T1.2; recorded in architecture doc)
- [x] T5 — Skia board on device + frame-rate baseline (AC: 4)
  - [x] T5.1 Render one static 4×4 board in Skia (`Canvas` + tile `RoundedRect`s/`Rect`s) fed by the ported engine
  - [ ] T5.2 Record a real frame rate on the physical iOS device (perf hook / `useDrawLoop` or Reanimated `useFrameCallback`) — DEVICE GATE (hook shipped; needs device run) — the baseline for the device p99 < 16.7ms job — **DEFERRED 2026-08-10** (no physical iPhone); simulator reading recorded: 60 fps · p99 16.67ms · 120 frames (informative only, Mac GPU)
  - [x] T5.3 Confirm no RN-UI duplicate of rules (board renders from the engine snapshot/trace only)
- [x] T6 — Record spike result in the architecture doc (AC: 5)
  - [x] T6.1 Append spike findings to `game-architecture.md` (actual benchmark numbers, dev-build viability, storage decision if measured, device frame-rate baseline) before greenlighting the full UI rewrite

### Review Findings (2026-08-10)

1. `decision_needed`:

- [x] [Review][Decision] AC4 is unmet yet the architecture doc greenlights the rewrite — RESOLVED 2026-08-10 (user decision): **simulator baseline accepted** as spike evidence; greenlight stands; AC4 device gate (p99 < 16.7 ms) formally deferred to the device job and already tracked in `deferred-work.md`. Story may proceed with the device gate tracked separately.

2. `patch`:

- [x] [Review][Patch] Purity test prefix matching misses dash-separated RN/Expo packages [triade/__tests__/engine/engine.purity.test.ts:9,42-43] — `lower === p || lower.startsWith(p + '/')` fails to flag `react-native-reanimated`, `react-native-worklets`, `expo-status-bar` (only `@shopify/react-native-skia`, `react`, `expo` are caught). Currently masked by test 2's relative-only rule; the ADR-01 enforcement is accidental.
- [x] [Review][Patch] CI `web-pwa-engine-test` job runs the entire triade engine TS suite + benchmark budget gate [.github/workflows/ci.yml:33-44] — bare `node --test` at repo root discovers 65 tests (26 web + 39 triade). The "frozen" web job is coupled to mutable engine code and runs it without `npm ci`.
- [x] [Review][Patch] Architecture doc omits the actual benchmark medians T6.1 requires [game-architecture.md:228-230] — records only "well under the < 2 ms / < 8 ms budgets"; the real gate thresholds (0.1ms/0.2ms) and measured medians (~0.001ms/~0.0006ms) live only in a code comment.
- [x] [Review][Patch] Architecture doc "52/52 tests" count is stale [game-architecture.md:223-224] — actual `node --test` at repo root runs 65 tests (26 web + 39 triade), not 52.
- [x] [Review][Patch] Story Pinned Version Matrix left stale [story §Pinned Version Matrix] — still lists Skia 2.11.0 / reanimated 4.3.x / worklets 0.8.x while `triade/package.json` pins 2.6.2 / 4.5.1 / 0.10.1 (recorded as matrix correction in the arch doc, but the story's own table was never updated).
- [x] [Review][Patch] Smoke test returns early on game-over at move 73 — the "500 deterministic moves never crash" claim is never exercised [triade/__tests__/engine/engine.smoke.test.ts:48-53]
- [x] [Review][Patch] Benchmark "engine cost per turn" under-measures ~1% of sampled turns (noop moves skip spawn) [triade/benchmarks/engine.bench.test.ts:35-42]
- [x] [Review][Patch] "Worst case" benchmark computes the median, not the worst case [triade/benchmarks/engine.bench.test.ts:94] — latent while the workload is constant, but the metric is mislabeled vs the spec.

3. `defer`:

- [x] [Review][Defer] pickIndex lets NaN slip through both clamps and crashes spawnTile [triade/src/engine/core/spawn.ts:3-8] — deferred, pre-existing: `js/game.js` has identical behavior and the port must preserve it; default `Math.random` never returns NaN. Fixed-seed rng in tests/clamp guards are the mitigation today.

### Review Findings — Pass 2 (2026-08-10, fresh adversarial review: blind / edge-case / acceptance)

1. `decision_needed`:

- [x] [Review][Decision] Worst-case benchmark metric — RESOLVED 2026-08-10 (user decision): **keep the p99 tail measurement, rename the metric honestly** to "tail p99" (not "worst case"); budget stays 0.2ms. Applied as patch.
- [x] [Review][Decision] app.json `plugins` / T1.3 — RESOLVED 2026-08-10 (user decision + installed-source evidence): the worklets "plugin" is a **babel plugin**, not an app.json config plugin; `babel-preset-expo` (SDK 57, `expo/node_modules/babel-preset-expo/build/configs/expo.js:107-111`) **auto-adds `react-native-worklets/plugin` when the package is installed**. `triade` has worklets 0.10.1, so auto-config is already active. No app.json entry is valid or needed; T1.3 record + runbook updated to reflect "verified: no config plugin required". Applied as patch.

2. `patch`:

- [x] [Review][Patch] Worst-case benchmark is a constant single-direction workload — FIXED 2026-08-10: workload now rotates across all 4 directions and 4 board shapes (locked pairs, merge-every-line, 1-2 pairs, full noop) [triade/benchmarks/engine.bench.test.ts]
- [x] [Review][Patch] Benchmark "engine cost per turn" times game-over detection on the pre-move board — FIXED 2026-08-10: now `isGameOver(res.board)` post-spawn [triade/benchmarks/engine.bench.test.ts]
- [x] [Review][Patch] Benchmark generates unreachable tile values (4,5) — FIXED 2026-08-10: `REACHABLE_VALUES = [1,2,3,6,12]` [triade/benchmarks/engine.bench.test.ts]
- [x] [Review][Patch] Story test-count claims stale — FIXED 2026-08-10: completion note now states 26 ported unchanged + 5 new (31 in game.test.ts, 39 triade, 65 root) [story §Completion Notes]
- [x] [Review][Patch] mulberry32 PRNG duplicated in App.tsx — FIXED 2026-08-10: extracted to `triade/src/utils/mulberry32.ts`, shared by App.tsx and test-utils/helpers.ts [triade/App.tsx]
- [x] [Review][Patch] Purity test regex is brittle — FIXED 2026-08-10: now strips comments and also extracts dynamic `import(...)` specifiers [triade/__tests__/engine/engine.purity.test.ts]
- [x] [Review][Patch] GameBoard renders negative/zero cell size — FIXED 2026-08-10: `boardSize = Math.max(40, Math.min(width - 32, 360))` [triade/App.tsx]
- [x] [Review][Patch] useFrameRateBaseline fps can be Infinity/NaN — FIXED 2026-08-10: guards empty samples and clamps avgMs to ≥0.001 [triade/src/render/useFrameRateBaseline.ts]
- [x] [Review][Patch] useFrameRateBaseline reports frames:120 but computes over 119 deltas — FIXED 2026-08-10: `frames` now reports `samples.length` (recorded deltas) [triade/src/render/useFrameRateBaseline.ts]

3. `defer`:

- [x] [Review][Defer] pickIndex returns -1 when len===0 [triade/src/engine/core/spawn.ts:6] — deferred, pre-existing: `js/game.js` identical; internal callers guard len>0.
- [x] [Review][Defer] shiftLine/move/boardFromLines assume 4x4 and crash on shorter input [triade/src/engine/core/line.ts:46] — deferred, pre-existing: `js/game.js` identical; the Board contract is fixed 4x4.
- [x] [Review][Defer] Noop moves return a full trace of stationary tiles [triade/src/engine/core/game.ts:29-44] — deferred: faithful port; trace contract is the game's identity (ui.js renders from trace).
- [x] [Review][Defer] mergeValue ignores its second operand outside the canMerge guard [triade/src/engine/core/rules.ts:7-8] — deferred, pre-existing: `js/game.js` identical; only called under canMerge.
- [x] [Review][Defer] spawnTile mutates its input board and returns the same reference [triade/src/engine/core/spawn.ts:17-28] — deferred, pre-existing: `js/game.js` identical; move() passes a fresh board.

## Dev Notes

### Critical Context

- **This is a brownfield port.** `js/game.js` (233 lines, UMD dual-env) is the proven rules engine; the 26 tests in `test/game.test.js` pass today (verified 26/26 on Node 26). The port must preserve **identical behavior**, not "cleaner" behavior. The test suite is the gate.
- **The zero-build / zero-dependency rule applies to the web PWA only.** The RN app (product of record) lives in `triade/` and is a normal Expo TypeScript project with npm dependencies pinned by the Pinned Version Matrix. Do NOT re-impose the web constraints (no bundler, ES5, UMD) on the RN app.
- **ADR-01 Engine purity is a hard boundary:** `src/engine` is pure TS — it never imports RN/React/Skia/Expo. Render/feel/ui/services only consume events/trace. This is enforced physically by the directory structure.

### Source Tree Components to Touch

- `js/game.js` — read-only source of truth for the port (do not modify; it remains the working web PWA).
- `test/game.test.js` — read-only source for the 26 ported tests.
- `triade/` — NEW Expo project (scaffolded from `triade/` root; sibling of the web PWA files).
- `triade/src/engine/core/*.ts` — NEW ported engine (pure TS).
- `triade/__tests__/engine/*.test.ts` — NEW ported tests.
- `triade/benchmarks/*.ts` — NEW deterministic CI benchmark.
- `triade/src/render/*` — NEW minimal Skia board component for the spike.
- `.github/workflows/ci.yml` — NEW CI gate (Node 26): `node --test` + benchmark, fails the PR over budget (AC 3, T4.6).
- `triade/.nvmrc` + `triade/package.json` `engines` — NEW Node 26 pin for CI/dev parity.
- `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` — must receive the spike result (AC 5).
- `package.json`, `app.json`, `tsconfig.json` (inside `triade/`) — Expo config.

### Pinned Version Matrix (single source of truth — verify against it, update only via spike/CI evidence)

| Package | Version | Notes |
|---|---|---|
| expo | 57.0.11 | SDK lockstep; `--template blank-typescript@sdk-57` |
| react-native | 0.86.2 | Pinned by Expo 57 |
| @shopify/react-native-skia | 2.6.2 | SDK-57 lockstep per spike evidence (2026-08-08); requires RN ≥0.79, react ≥19, reanimated ≥4.0, worklets ≥0.7 |
| react-native-reanimated | 4.5.1 | SDK-57 lockstep per spike evidence |
| react-native-worklets | 0.10.1 | SDK-57 lockstep per spike evidence |
| expo-haptics | (SDK 57) | not needed for S1.1 — install per spike scope |
| react-native-purchases | 10.7.0 | not needed for S1.1 |
| react-native-google-mobile-ads | 16.4.0 | not needed for S1.1 |
| @react-native-firebase/* | 26.1.0 | not needed for S1.1 |
| expo-audio | 57.0.3 | not needed for S1.1 |
| expo-secure-store | (SDK 57) | not needed for S1.1 |
| i18next / react-i18next | 26.3.6 | not needed for S1.1 |
| expo-localization | (SDK 57) | not needed for S1.1 |
| expo-tracking-transparency | 57.0.1 | not needed for S1.1 |

Rules: `npx expo install` respects this matrix; no ad/IAP/telemetry lib may lag the SDK. **S1.1 only needs the skeleton + Skia + Reanimated + worklets** — do not pull the full monetization/telemetry/audio stack into the spike. Expo Go is not a target — development build only.

### Engine Port Requirements (from js/game.js)

- Merge predicate: `(a===1 && b===2) || (b===1 && a===2) || (a>=3 && a===b)`. Merge value: `a <= 2 ? 3 : a*2`. `1+1` and `2+2` NEVER merge.
- Merge-once / one-cell identity: each tile moves at most 1 cell per swipe; a freshly merged tile is locked (never re-merges in the same swipe). `[3,3,3,3] → [6,3,3,_]`; `[1,2,3,_] → [3,3,_,_]`.
- DO NOT rewrite `shiftLine` with 2048-style compaction (`filter`+`concat`) — it is front-to-back with simultaneous semantics; compaction breaks merge-once and the trace tests.
- Spawn only after an effective move (`boardsEqual` noop spawns nothing, scores nothing, consumes no turn). Weights 40/40/20 for 1/2/3.
- `move()` returns `{ board, score, moved, trace }`; trace entries are `{ value, to:[r,c], from:[[r,c]...], spawned }`. Preserve the exact trace, not just the final board.
- Randomness ONLY via injectable `rng` param (fallback `Math.random`) in `newGame`, `move`, `spawnTile`, `weightedValue` — breaking this breaks the deterministic tests.
- `isGameOver` must reuse the SAME merge predicate (never "optimize" to equality-only — loses 1-2 adjacencies).
- Score increments by the merged tile's value. Board is a 2D array `board[r][c]` of `null | value`. Directions `'left'|'right'|'up'|'down'`.

### Benchmark Specification (from game-architecture.md §S1.1 Spike Benchmark)

- **Level 1 — deterministic (CI, every PR):** pure TypeScript, no device. Frame math isolated in pure functions; worklet is a thin binding over the same math.
  - Engine cost per turn (spawn + merge-once + game-over detection): budget **< 2 ms**.
  - Frame-logic worst case (slide merging 4 locked pairs simultaneously): budget **< 8 ms**.
- **Level 2 — device job (scheduled, physical iOS):** real GPU, p99. Budget **p99 < 16.7 ms/frame** with feel preset "full". S1.1 only records the **baseline** (AC 4); the full scheduled device job is a later story.
- The benchmark ships **in the same PR as the spike**, not as a follow-up. Budgets are starting hypotheses to be tuned by spike evidence.
- Deterministic on Node: fixed seed; assert budgets; fail CI over budget.

### Testing Standards

- Runner: `node:test` built-in — command **`node --test`** (no directory arg; `node --test test/` fails on Node 26+). Node 26 type-strips TS natively.
- Pin Node in `triade/` via `engines` in `package.json` (`"node": ">=26"`) and a `{project-root}/triade/.nvmrc` (`26`) so the CI workflow and local dev run the same runtime that type-strips TS.
- Ported tests keep the same helpers and assertions: `rngOf(...values)`, `staticBoard(row)`, `boardWith(matrix)`, `emptyBoard()`. No `Math.random` in tests.
- Coverage must include the full I/O matrix (26 cases): 9-start-tile count, 40/40/20 weighting, 1+2 both orders, 1+1/2+2 non-merge, equal ≥3, one-cell movement, noop without spawn, game-over (empty, 1-2 row/column, equal ≥3), spawn-once, trace assertions (merge sources, spawn flags, noop has no spawned entry).
- UI/Skia rendering is validated manually on the physical device (frame rate), NOT automated.

### Architecture Compliance

- `src/engine` imports nothing from RN/React/Skia/Expo (ADR-01). The engine is pure TS; render/feel/ui/services are observers.
- Renders derived from the trace/snapshot only — no heuristic matching in the UI, no rules outside the engine.
- Immutability: engine produces new board objects (feeds `boardsEqual`, trace, testability).
- Frame math pure and host-testable (feeds the CI benchmark).
- Directory layout follows `game-architecture.md` Project Structure (`triade/src/{engine,render,feel,ui,services,state,theme,i18n,dev,utils}`, `triade/benchmarks`, `triade/__tests__`).

### Project Context Rules

- Naming: TS modules camelCase (`move.ts`, `spawn.ts`); RN/Skia components PascalCase (`GameBoard.tsx`); tests `.test.ts`; true constants UPPER_SNAKE (`GRID_SIZE = 4`); events PascalCase with discriminated `type`.
- No comments unless they clarify a non-obvious rule; no emojis in code.
- Do NOT modify `js/game.js`, `js/ui.js`, `js/debug.js`, or `test/game.test.js` — the web PWA stays frozen as the legacy secondary surface.
- The RN app never uses the web debug panel pattern for production; debug tools are `__DEV__`-only (later stories).
- Reference `docs/` and `_bmad-output/planning-artifacts/architectures/.../game-architecture.md` before guessing conventions.

### Previous Story Intelligence

- No prior stories in this project — S1.1 is the first implementation story. Brownfield source of truth is the tested PWA engine (`js/game.js` + `test/game.test.js`, 26/26 green on Node 26).
- Recent git history is all planning/docs (PRD, GDD, UX, architecture, readiness) — no engine code changes since the PWA MVP.

### Git Intelligence

- Branch: `feature/1-1-technical-spike-engine-ts-board-skia-benchmark-ci` (created for this story).
- Recent commits are documentation/planning only. The PWA MVP (`cdc0e99`) is the working baseline the port derives from.

### Latest Tech Information

- Expo SDK 57 template flag: `npx create-expo-app@latest --template blank-typescript@sdk-57` (or `--template default@sdk-57`); SDK 57 is the current release line with Expo Router pre-installed in the default template.
- Dev builds: `eas build --profile development` (native iOS). Expo Go is not a target (required for 60 FPS, Skia, native modules).
- @shopify/react-native-skia 2.11: install with `npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets`; Reanimated 4 requires `react-native-worklets@>=0.7`.
- Skia rendering: `Canvas` + `Group`/`Rect`/`RoundedRect` components; pass Reanimated shared values directly as props for animation; `useDrawLoop`/`useFrameCallback` drives per-frame clock.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1] — Story ACs (lines 247-261)
- [Source: _bmad-output/planning-artifacts/epics.md#Additional Requirements] — Starter template + Pinned Version Matrix (lines 89-111)
- [Source: _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md#S1.1 Spike Benchmark] — benchmark budgets (lines 183-204)
- [Source: _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md#Directory Structure] — project layout (lines 451-484)
- [Source: _bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md#ADR-01] — engine purity boundary
- [Source: js/game.js] — engine to port (behavior + trace contract)
- [Source: test/game.test.js] — the 26 tests to port unchanged
- [Source: _bmad-output/project-context.md] — project-wide engine/testing rules (browser context; RN app supersedes the zero-build rule)

## Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash

### Debug Log References

- Node 26 native TS type-stripping requires `"type": "module"` + explicit `.ts` extensions in relative imports (added `allowImportingTsExtensions`).
- `@types/node` required for `tsc` to resolve `node:test` / `node:perf_hooks` in test + benchmark files.
- `node --test benchmarks/` fails on Node 26 (directory arg unsupported) — benchmark shipped as `*.test.ts` so the no-arg `node --test` discovers it.
- `expo install` resolved SDK-57 lockstep versions differing from the Pinned Version Matrix (Skia 2.6.2, reanimated 4.5.1, worklets 0.10.1) — recorded as spike evidence in the architecture doc.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created
- S1.1 spike implemented: Expo SDK 57 scaffold (`triade/`), engine ported to pure TS (`src/engine/core/`), the 26 web tests ported unchanged (26/26 pass) plus 5 new engine tests (31 tests in `game.test.ts`; 39 total in the triade suite incl. purity/smoke/benchmark; 65 total at repo root with the web suite), deterministic CI benchmark + CI workflow shipped, Skia board renders from engine snapshot, spike findings recorded in `game-architecture.md`.
- ADR-01 verified: `src/engine` imports nothing from RN/React/Skia/Expo.
- Version matrix correction: Skia 2.6.2 / reanimated 4.5.1 / worklets 0.10.1 are the SDK-57 pinned versions.
- Deferred/device gates: T1.4 (physical-device boot) and T5.2 (on-device frame-rate baseline) require a physical iOS device + CocoaPods; T4.5 (AsyncStorage vs MMKV) is out of spike scope.

### File List

- Created: `_bmad-output/implementation-artifacts/1-1-technical-spike-engine-ts-board-skia-benchmark-ci.md`
- Created: `triade/` (Expo SDK 57 app: App.tsx, app.json, package.json, tsconfig.json, index.ts, assets/, ios/, android/, .nvmrc, AGENTS.md, CLAUDE.md)
- Created: `triade/src/engine/core/types.ts`
- Created: `triade/src/engine/core/board.ts`
- Created: `triade/src/engine/core/rules.ts`
- Created: `triade/src/engine/core/line.ts`
- Created: `triade/src/engine/core/spawn.ts`
- Created: `triade/src/engine/core/game.ts`
- Created: `triade/src/engine/core/index.ts`
- Created: `triade/__tests__/engine/game.test.ts`
- Created: `triade/benchmarks/engine.bench.test.ts`
- Created: `triade/src/render/GameBoard.tsx`
- Created: `triade/src/render/useFrameRateBaseline.ts`
- Created: `.github/workflows/ci.yml`
- Modified: `_bmad-output/implementation-artifacts/sprint-status.yaml` (story 1-1 → in-progress)
- Modified: `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` (S1.1 Spike Results)

### Change Log

- Story 1.1 implemented: TS engine port + 26 ported tests + deterministic CI benchmark + Skia board spike + architecture findings (2026-08-08)
- Device gates deferred to developer bench: T1.4, T5.2 (physical iOS device required)
